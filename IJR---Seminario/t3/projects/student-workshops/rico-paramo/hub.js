(() => {
  const KEY = 'ijr-rico-four-class-progress-v2';
  const classes = [...document.querySelectorAll('.build-stage[data-class]')];
  const inputs = [...document.querySelectorAll('input[data-check]')];
  const progressText = document.getElementById('progressText');
  const progressBar = document.getElementById('progressBar');
  const nextStageText = document.getElementById('nextStageText');
  const reset = document.getElementById('resetProgress');

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function writeState(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function classComplete(card) {
    const boxes = [...card.querySelectorAll('input[data-check]')];
    return boxes.length > 0 && boxes.every(box => box.checked);
  }

  function update() {
    const complete = classes.filter(classComplete);
    classes.forEach(card => {
      const done = classComplete(card);
      card.classList.toggle('is-complete', done);
      const status = card.querySelector('.build-status');
      if (status) status.textContent = done ? 'COMPLETE' : 'NOT COMPLETE';
    });

    const count = complete.length;
    const total = classes.length || 4;
    progressText.textContent = `${count} / ${total} classes`;
    progressBar.style.width = `${(count / total) * 100}%`;

    const next = classes.find(card => !classComplete(card));
    nextStageText.textContent = next
      ? `Next: Class ${String(next.dataset.class).padStart(2,'0')} · ${next.querySelector('h2')?.textContent || 'continue building'}.`
      : 'All four construction classes are complete. Prepare the final live defense.';
  }

  const state = readState();
  inputs.forEach(input => {
    input.checked = Boolean(state[input.dataset.check]);
    input.addEventListener('change', () => {
      const current = readState();
      current[input.dataset.check] = input.checked;
      writeState(current);
      update();
    });
  });

  reset?.addEventListener('click', () => {
    if (!window.confirm('Reset only the four-class progress marks stored in this browser?')) return;
    try { localStorage.removeItem(KEY); } catch {}
    inputs.forEach(input => { input.checked = false; });
    update();
  });

  update();
})();
