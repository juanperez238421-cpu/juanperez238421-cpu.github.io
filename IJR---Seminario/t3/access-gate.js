(() => {
  'use strict';

  const SUPABASE_URL = 'https://rlfxnjbqxbozjdzkbwlz.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rmVOQ3Orx49KpW_4uMqYew_c2HpcA87';
  const RPC_URL = SUPABASE_URL + '/rest/v1/rpc/seminar_email_access_v1';
  const STORAGE_KEY = 'ijr-seminario-email-access-v2';
  const BUILD_ID = '20260923-email-v12';
  const MAX_AGE_MS = 8 * 60 * 60 * 1000;

  let activeEmail = '';
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  window.IJRSeminarAccess = {
    ready,
    get email() { return activeEmail; },
    logout() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  document.documentElement.classList.add('ijr-seminar-access-pending');

  const style = document.createElement('style');
  style.id = 'ijrSeminarAccessStyles';
  style.textContent = `
    html.ijr-seminar-access-pending body > *:not(#ijrSeminarAccessGate) {
      visibility: hidden !important;
    }
    #ijrSeminarAccessGate {
      visibility: visible !important;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 16% 10%, rgba(34, 197, 94, .18), transparent 36%),
        linear-gradient(145deg, #07111f 0%, #0f172a 52%, #111827 100%);
      color: #e5eef9;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #ijrSeminarAccessGate * { box-sizing: border-box; }
    #ijrSeminarAccessGate .ijr-access-card {
      width: min(100%, 460px);
      padding: 34px;
      border: 1px solid rgba(148, 163, 184, .28);
      border-radius: 24px;
      background: rgba(15, 23, 42, .94);
      box-shadow: 0 28px 80px rgba(0, 0, 0, .42);
      backdrop-filter: blur(16px);
    }
    #ijrSeminarAccessGate .ijr-access-kicker {
      margin: 0 0 8px;
      color: #86efac;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    #ijrSeminarAccessGate h1 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(28px, 6vw, 40px);
      line-height: 1.05;
    }
    #ijrSeminarAccessGate p {
      margin: 14px 0 24px;
      color: #b9c6d8;
      line-height: 1.55;
    }
    #ijrSeminarAccessGate label {
      display: grid;
      gap: 8px;
      color: #dbe7f4;
      font-size: 14px;
      font-weight: 700;
    }
    #ijrSeminarAccessGate input {
      width: 100%;
      min-height: 50px;
      padding: 0 14px;
      border: 1px solid #334155;
      border-radius: 12px;
      outline: none;
      background: #0b1220;
      color: #f8fafc;
      font: inherit;
    }
    #ijrSeminarAccessGate input:focus {
      border-color: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, .14);
    }
    #ijrSeminarAccessGate button {
      width: 100%;
      min-height: 50px;
      margin-top: 14px;
      border: 0;
      border-radius: 12px;
      cursor: pointer;
      background: #22c55e;
      color: #052e16;
      font: inherit;
      font-weight: 900;
    }
    #ijrSeminarAccessGate button:disabled {
      cursor: wait;
      opacity: .68;
    }
    #ijrSeminarAccessGate .ijr-access-status {
      min-height: 22px;
      margin: 12px 0 0;
      color: #fca5a5;
      font-size: 13px;
    }
    #ijrSeminarAccessGate .ijr-access-note {
      margin: 18px 0 0;
      color: #7f91aa;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isInstitutionalEmail(email) {
    return /^[^\s@]+@ijr\.edu\.co$/i.test(email);
  }

  function loadSavedEmail() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || !isInstitutionalEmail(saved.email) || !Number.isFinite(saved.validatedAt)) return '';
      if (Date.now() - saved.validatedAt > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return '';
      }
      return normalizeEmail(saved.email);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return '';
    }
  }

  function saveEmail(email) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, validatedAt: Date.now() }));
  }

  async function validateEmail(email) {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ p_email: email })
    });

    const raw = await response.json().catch(() => null);
    const data = Array.isArray(raw) ? raw[0] : raw;
    if (!response.ok) throw new Error('No fue posible validar el acceso institucional.');
    if (data?.error === 'institutional_email_not_registered') {
      throw new Error('Este correo institucional no está registrado en Seminario 11.');
    }
    if (!data?.ok || !isInstitutionalEmail(data.email)) {
      throw new Error('Ingresa únicamente tu correo institucional @ijr.edu.co.');
    }
    return normalizeEmail(data.email);
  }

  function unlock(email) {
    activeEmail = email;
    document.getElementById('ijrSeminarAccessGate')?.remove();
    document.documentElement.classList.remove('ijr-seminar-access-pending');
    resolveReady({ email });
    window.dispatchEvent(new CustomEvent('seminar-access-ready', { detail: { email } }));
  }

  function mountGate(prefill = '') {
    if (document.getElementById('ijrSeminarAccessGate')) return;

    const gate = document.createElement('section');
    gate.id = 'ijrSeminarAccessGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'ijrSeminarAccessTitle');
    gate.innerHTML = `
      <div class="ijr-access-card">
        <div class="ijr-access-kicker">Instituto Jorge Robledo · Seminario 11</div>
        <h1 id="ijrSeminarAccessTitle">Tu correo institucional identifica tu progreso.</h1>
        <p>Ingresa <strong>únicamente</strong> tu correo institucional <strong>@ijr.edu.co</strong>. No se solicita contraseña, nombre, grupo, código ni existe acceso alternativo.</p>
        <form id="ijrSeminarAccessForm" novalidate>
          <label>
            Correo institucional
            <input id="ijrSeminarAccessEmail" type="email" inputmode="email" autocomplete="email"
                   placeholder="nombre.apellido@ijr.edu.co" value="${prefill.replace(/"/g, '&quot;')}" required>
          </label>
          <button id="ijrSeminarAccessButton" type="submit">Entrar a Seminario 11</button>
          <div id="ijrSeminarAccessStatus" class="ijr-access-status" role="status" aria-live="polite"></div>
        </form>
        <div class="ijr-access-note">Solo pueden entrar cuentas institucionales activas de grado 11 registradas en el listado oficial de Seminario.</div>
      </div>
    `;
    document.body.appendChild(gate);

    const form = gate.querySelector('#ijrSeminarAccessForm');
    const input = gate.querySelector('#ijrSeminarAccessEmail');
    const button = gate.querySelector('#ijrSeminarAccessButton');
    const status = gate.querySelector('#ijrSeminarAccessStatus');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const email = normalizeEmail(input.value);
      if (!isInstitutionalEmail(email)) {
        status.textContent = 'Usa únicamente tu correo institucional @ijr.edu.co.';
        input.focus();
        return;
      }

      button.disabled = true;
      status.textContent = 'Validando acceso…';
      try {
        const validated = await validateEmail(email);
        saveEmail(validated);
        unlock(validated);
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        status.textContent = error?.message || 'No fue posible validar el acceso.';
        button.disabled = false;
        input.focus();
      }
    });

    requestAnimationFrame(() => input.focus());
  }

  async function boot() {
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    const savedEmail = loadSavedEmail();
    if (savedEmail) {
      mountGate(savedEmail);
      const status = document.getElementById('ijrSeminarAccessStatus');
      const button = document.getElementById('ijrSeminarAccessButton');
      if (status) status.textContent = 'Validando sesión institucional…';
      if (button) button.disabled = true;
      try {
        const validated = await validateEmail(savedEmail);
        saveEmail(validated);
        unlock(validated);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (status) status.textContent = 'La sesión venció. Confirma de nuevo tu correo institucional.';
        if (button) button.disabled = false;
      }
      return;
    }

    mountGate();
  }

  document.documentElement.dataset.ijrSeminarAccessBuild = BUILD_ID;
  boot().catch(() => mountGate());
})();
