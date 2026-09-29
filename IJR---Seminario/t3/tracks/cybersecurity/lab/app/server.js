import http from 'node:http';
import { performance } from 'node:perf_hooks';

const PORT = Number(process.env.PORT || 3000);
const REPORT_COST_MS = Math.max(5, Math.min(100, Number(process.env.REPORT_COST_MS || 35)));
const MAX_BODY_BYTES = 256 * 1024;

const metrics = {
  startedAt: Date.now(),
  total: 0,
  byStatus: {},
  byPath: {},
  recentLatencyMs: []
};

const labRecords = [
  { id: 1, owner: 'ana', title: 'Ana · mock report', note: 'Synthetic record A' },
  { id: 2, owner: 'bruno', title: 'Bruno · mock report', note: 'Synthetic record B' },
  { id: 3, owner: 'camila', title: 'Camila · mock report', note: 'Synthetic record C' }
];

const boardComments = [
  { author: 'system', text: 'Bienvenido al tablero interno del laboratorio.' }
];

function record(path, status, durationMs) {
  metrics.total += 1;
  metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
  metrics.byPath[path] = (metrics.byPath[path] || 0) + 1;
  metrics.recentLatencyMs.push(durationMs);
  if (metrics.recentLatencyMs.length > 1000) metrics.recentLatencyMs.shift();
}

function percentile95(values) {
  if (!values.length) return 0;
  const copy = [...values].sort((a, b) => a - b);
  const index = Math.min(copy.length - 1, Math.ceil(copy.length * 0.95) - 1);
  return Number(copy[index].toFixed(2));
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function html(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function cpuBoundWork(ms) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) {
    x = (x + Math.sqrt((x % 1000) + 1)) % 100000;
  }
  return x;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return null;
  }
}

function renderBoard() {
  // INTENTIONAL LAB STARTING POINT:
  // comment.text is inserted as HTML so students can reproduce and then fix
  // stored HTML/script injection in this localhost-only environment.
  const cards = boardComments.map((comment, index) => `
    <article class="comment" data-comment-id="${index + 1}">
      <strong>${comment.author}</strong>
      <div class="comment-text">${comment.text}</div>
    </article>
  `).join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>IJR Lab Board</title>
  <style>
    body{font-family:system-ui;margin:40px;max-width:900px}
    textarea,input{width:100%;box-sizing:border-box;margin:.35rem 0 .8rem;padding:.6rem}
    button{padding:.6rem 1rem}
    .comment{border:1px solid #ccd4df;padding:12px;margin:10px 0;border-radius:8px}
    .note{background:#fff7d6;border:1px solid #e4cd74;padding:10px;border-radius:8px}
  </style>
</head>
<body>
  <h1>Internal Board · lab only</h1>
  <p class="note">Todos los datos son ficticios. Esta página existe para practicar inspección HTML, DOM y defensa de salida.</p>
  <form id="commentForm">
    <label>Author <input id="author" value="student"></label>
    <label>Comment <textarea id="text" rows="4"></textarea></label>
    <button>Publish</button>
  </form>
  <section id="comments">${cards}</section>
  <script>
    document.getElementById('commentForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await fetch('/api/comments', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          author: document.getElementById('author').value,
          text: document.getElementById('text').value
        })
      });
      location.reload();
    });
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const started = performance.now();
  const requestUrl = new URL(req.url, 'http://lab.local');
  const path = requestUrl.pathname;
  let status = 500;

  try {
    if (req.method === 'GET' && path === '/') {
      status = 200;
      html(res, status, `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>IJR Web Defense Lab</title></head>
<body>
  <main>
    <h1>IJR Web Defense Lab</h1>
    <p>Aplicación objetivo del laboratorio defensivo.</p>
    <ul>
      <li><code>/health</code> — availability check</li>
      <li><code>/metrics</code> — application metrics</li>
      <li><code>/api/report</code> — expensive route for controlled HTTP flood</li>
      <li><code>/login</code> — fictitious login endpoint</li>
      <li><code>/api/echo</code> — payload-validation endpoint</li>
      <li><code>/api/records/1</code> — broken-access-control case with fictitious records</li>
      <li><a href="/board"><code>/board</code></a> — local stored HTML/XSS defense case</li>
    </ul>
  </main>
</body>
</html>`);
      return;
    }

    if (req.method === 'GET' && path === '/health') {
      status = 200;
      json(res, status, { ok: true, uptimeSeconds: Math.round(process.uptime()) });
      return;
    }

    if (req.method === 'GET' && path === '/metrics') {
      status = 200;
      json(res, status, {
        uptimeSeconds: Math.round((Date.now() - metrics.startedAt) / 1000),
        requests: metrics.total,
        byStatus: metrics.byStatus,
        byPath: metrics.byPath,
        p95LatencyMs: percentile95(metrics.recentLatencyMs),
        recentSamples: metrics.recentLatencyMs.length
      });
      return;
    }

    if (req.method === 'GET' && path === '/api/report') {
      const checksum = cpuBoundWork(REPORT_COST_MS);
      status = 200;
      json(res, status, {
        report: 'synthetic-school-report',
        generatedAt: new Date().toISOString(),
        checksum: Number(checksum.toFixed(2)),
        costMs: REPORT_COST_MS
      });
      return;
    }

    if (req.method === 'POST' && path === '/login') {
      const raw = await readBody(req);
      const body = parseJson(raw);
      if (!body) {
        status = 400;
        json(res, status, { ok: false, error: 'invalid_json' });
        return;
      }

      const username = typeof body.username === 'string' ? body.username.slice(0, 80) : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const valid = username === 'blue-team' && password === 'lab-only-password';

      status = valid ? 200 : 401;
      json(res, status, valid ? { ok: true, role: 'student' } : { ok: false, error: 'invalid_credentials' });
      return;
    }

    if (req.method === 'POST' && path === '/api/echo') {
      const raw = await readBody(req);
      const parsed = parseJson(raw);
      if (parsed === null) {
        status = 400;
        json(res, status, { ok: false, error: 'invalid_json' });
        return;
      }

      status = 200;
      json(res, status, {
        ok: true,
        receivedType: Array.isArray(parsed) ? 'array' : typeof parsed,
        bytes: Buffer.byteLength(raw)
      });
      return;
    }

    const recordMatch = path.match(/^\/api\/records\/(\d+)$/);
    if (req.method === 'GET' && recordMatch) {
      const id = Number(recordMatch[1]);
      const user = String(req.headers['x-lab-user'] || 'ana').toLowerCase();
      const found = labRecords.find(item => item.id === id);

      if (!found) {
        status = 404;
        json(res, status, { ok: false, error: 'record_not_found' });
        return;
      }

      // INTENTIONAL LAB STARTING POINT:
      // The endpoint authenticates a fictitious user but does not verify ownership.
      // Students must reproduce this broken access control case and then enforce found.owner === user.
      status = 200;
      json(res, status, {
        ok: true,
        requestedBy: user,
        record: found
      });
      return;
    }

    if (req.method === 'GET' && path === '/board') {
      status = 200;
      html(res, status, renderBoard());
      return;
    }

    if (req.method === 'POST' && path === '/api/comments') {
      const raw = await readBody(req);
      const body = parseJson(raw);
      if (!body || typeof body.text !== 'string') {
        status = 400;
        json(res, status, { ok: false, error: 'invalid_comment' });
        return;
      }

      boardComments.push({
        author: typeof body.author === 'string' ? body.author.slice(0, 50) : 'student',
        text: body.text.slice(0, 500)
      });
      status = 201;
      json(res, status, { ok: true, commentCount: boardComments.length });
      return;
    }

    if (req.method === 'DELETE' && path === '/api/comments') {
      boardComments.splice(1);
      status = 200;
      json(res, status, { ok: true, commentCount: boardComments.length });
      return;
    }

    status = 404;
    json(res, status, { ok: false, error: 'not_found' });
  } catch (error) {
    status = Number(error?.status || 500);
    if (!res.headersSent) {
      json(res, status, { ok: false, error: status === 413 ? 'payload_too_large' : 'internal_error' });
    } else {
      res.end();
    }
  } finally {
    const durationMs = Number((performance.now() - started).toFixed(2));
    record(path, status, durationMs);
    process.stdout.write(JSON.stringify({
      ts: new Date().toISOString(),
      method: req.method,
      path,
      status,
      durationMs
    }) + '\n');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(),
    event: 'server_started',
    port: PORT,
    reportCostMs: REPORT_COST_MS
  }) + '\n');
});
