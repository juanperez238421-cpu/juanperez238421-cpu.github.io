(() => {
  const data = window.IJR_RICO_PROJECT_DATA;
  if (!data || !Array.isArray(data.classes)) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('class') || 1);
  const classN = Number.isFinite(requested) ? Math.max(1, Math.min(4, requested)) : 1;
  const item = data.classes.find(x => x.n === classN) || data.classes[0];
  const page = document.body.dataset.ricoPage;

  function diagramHtml(diagram) {
    if (!diagram) return '';
    return `
      <div class="rico-diagram-head"><span>TECHNICAL DIAGRAM</span><strong>${esc(diagram.title)}</strong></div>
      <div class="rico-diagram-flow">
        ${diagram.nodes.map((node, i) => `
          <div class="rico-diagram-node">${esc(node)}</div>
          ${i < diagram.nodes.length - 1 ? '<div class="rico-diagram-arrow">→</div>' : ''}
        `).join('')}
      </div>
      <p class="rico-diagram-note">${esc(diagram.note)}</p>`;
  }

  if (page === 'theory') {
    document.title = `Rico · Class ${item.n} Theory · ${item.title}`;
    document.getElementById('sessionLabel').textContent = `CLASS ${item.n} · THEORY`;
    document.getElementById('title').textContent = item.title;
    document.getElementById('lead').textContent = item.lead;
    document.getElementById('crumbTopic').textContent = `Class ${item.n} Theory`;

    document.getElementById('classSwitch').innerHTML = data.classes.map(c => `
      <a class="${c.n === item.n ? 'active' : ''}" href="theory.html?class=${c.n}">
        C${c.n} · ${esc(c.title)}
      </a>
    `).join('');

    document.getElementById('concepts').innerHTML = item.concepts.map((concept, i) => `
      <div class="concept-item">
        <strong>${String(i + 1).padStart(2, '0')} · Core idea</strong>
        <span>${esc(concept)}</span>
      </div>
    `).join('');

    document.getElementById('umlName').textContent = item.uml.name;
    document.getElementById('umlAttrs').innerHTML = item.uml.attrs.map(x => `<div>${esc(x)}</div>`).join('');
    document.getElementById('umlOps').innerHTML = item.uml.ops.map(x => `<div>${esc(x)}</div>`).join('');
    document.getElementById('codeExample').textContent = item.code;
    document.getElementById('mistakes').innerHTML = item.mistakes.map(x => `<li>${esc(x)}</li>`).join('');
    document.getElementById('evidence').innerHTML = item.evidence.map(x => `<li>${esc(x)}</li>`).join('');
    document.getElementById('diagramSection').innerHTML = diagramHtml(item.diagram);

    const workshopHref = `workshop.html?class=${item.n}`;
    document.getElementById('workshopTop').href = workshopHref;
    document.getElementById('workshopBottom').href = workshopHref;
  }

  if (page === 'workshop') {
    document.title = `Rico · Class ${item.n} Workshop · ${item.title}`;
    document.getElementById('notebookFile').textContent =
      `Rico_Class_${String(item.n).padStart(2, '0')}_Project_Build.ipynb`;
    document.getElementById('workshopLabel').textContent = `CLASS ${item.n} · WORKSHOP`;
    document.getElementById('workshopTitle').textContent = item.title;
    document.getElementById('workshopLead').textContent = item.lead;
    document.getElementById('heroLabel').textContent = `CLASS ${item.n} · REAL PROJECT CONSTRUCTION`;
    document.getElementById('heroTitle').textContent = item.title;
    document.getElementById('heroLead').textContent =
      "Apply the theory directly to Rico's final product. Run every command, verify the expected result and preserve the evidence before the class gate.";

    const theoryHref = `theory.html?class=${item.n}`;
    document.getElementById('theoryTop').href = theoryHref;
    document.getElementById('theoryBottom').href = theoryHref;

    document.getElementById('stageList').innerHTML = item.stages.map(stage => `
      <a href="#stage-${esc(stage.key)}">
        <span>${esc(stage.label)}</span>
        <strong>${esc(stage.title)}</strong>
        <small>${esc(stage.subtitle)}</small>
      </a>
    `).join('');

    document.getElementById('workshopStages').innerHTML = item.stages.map(stage => `
      <article id="stage-${esc(stage.key)}" class="notebook-stage text-cell">
        <div class="stage-heading">
          <div>
            <span class="stage-number">${esc(stage.label)}</span>
            <div>
              <p class="eyebrow">${esc(stage.title.toUpperCase())} · ${esc(stage.subtitle.toUpperCase())}</p>
              <h2>${esc(stage.prompt)}</h2>
            </div>
          </div>
          <span class="stage-status">Evidence required</span>
        </div>
        <ol class="rico-stage-tasks">
          ${stage.tasks.map(task => `<li>${esc(task)}</li>`).join('')}
        </ol>
        <div class="rico-stage-command">
          <strong>Terminal / implementation command</strong>
          <pre><code>${esc(stage.command)}</code></pre>
        </div>
        <div class="rico-stage-expected">
          <strong>Expected verification:</strong> ${esc(stage.expected)}
        </div>
      </article>
    `).join('');
  }
})();