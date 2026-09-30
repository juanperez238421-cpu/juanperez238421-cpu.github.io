const cfg=window.IJR_SEMINAR_T3_CONFIG||{};
const API=(cfg.supabaseUrl||'https://rlfxnjbqxbozjdzkbwlz.supabase.co')+'/functions/v1/seminar-project-access';
const KEY=cfg.supabasePublishableKey||'sb_publishable_rmVOQ3Orx49KpW_4uMqYew_c2HpcA87';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TRACK_NAMES={web:'Web Development','data-science':'Python / Data Analyst',cybersecurity:'Defensive Cybersecurity','3d-programming':'3D + Printing',robotics:'Robotics'};
const TRACK_GUIDANCE={
  web:{
    title:'Web engineering focus',
    theory:[
      'Separate structure, presentation, behavior and data responsibilities.',
      'Define the data model and user flow before adding interface details.',
      'Validate empty, invalid and persisted states—not only the happy path.',
      'A release is complete only when the deployed flow can be reproduced.'
    ],
    workshop:'Implement the current increment in the real web project, verify it in the browser, test at least one failure/empty state and preserve the deployed or repository evidence.'
  },
  'data-science':{
    title:'Data / Python engineering focus',
    theory:[
      'Every transformation must be reproducible from the original dataset or input.',
      'Keep data loading, cleaning, analysis and presentation responsibilities explicit.',
      'A graph is evidence only when labels, units and interpretation are correct.',
      'Restart the environment and run the workflow from zero before claiming completion.'
    ],
    workshop:'Implement the current analysis or Python increment, rerun it from a clean state, verify the expected result with data/tests and preserve notebook, output or commit evidence.'
  },
  cybersecurity:{
    title:'Defensive security focus',
    theory:[
      'Work only on the authorized local/sandbox target defined by the project.',
      'Connect each threat to one control and one measurable piece of evidence.',
      'Compare the same condition before and after the defense whenever possible.',
      'Logs must support diagnosis without exposing passwords, tokens or secrets.'
    ],
    workshop:'Run the authorized local scenario, implement or verify the defensive control, compare evidence, and record the exact safe test condition so the teacher can reproduce it.'
  },
  '3d-programming':{
    title:'Parametric CAD / fabrication focus',
    theory:[
      'Model from dimensions, constraints and function—not decorative geometry first.',
      'Keep critical dimensions and tolerances explicit and editable.',
      'Validate fit, wall thickness, orientation and export before fabrication.',
      'A model is not complete until a changed parameter regenerates correctly.'
    ],
    workshop:'Build the current CAD increment, verify dimensions/constraints, export or inspect the artifact when required, and preserve screenshots, model/STL reference or measurement evidence.'
  },
  robotics:{
    title:'Control-system focus',
    theory:[
      'Make Sensor → Controller → Actuator responsibilities explicit.',
      'Represent state transitions and fail-safe behavior before hardware integration.',
      'Test deterministic input sequences and compare them with expected outputs.',
      'Invalid readings, timeout and startup/shutdown behavior are part of the design.'
    ],
    workshop:'Implement or simulate the current control increment, run a defined scenario, verify expected state/output behavior and preserve code, serial/log, video or test-matrix evidence.'
  }
};
let state={email:'',student:null,project:null,progress:null};

function setBoot(message){if($('bootStatus'))$('bootStatus').textContent=message}
function friendlyError(code){
  const map={
    project_access_denied:'Tu correo institucional no está vinculado a un estudiante activo de Seminario 11.',
    institutional_email_required:'No se encontró una identidad institucional válida.',
    project_not_defined:'Primero debes confirmar un proyecto en Project Decision Center.',
    project_not_confirmed:'Tu ruta todavía está en modo de definición. Confirma primero el tema, alcance, objetivo y herramientas en Project Decision Center.',
    invalid_project_unit:'La unidad solicitada no existe en este proyecto.',
    previous_project_unit_incomplete:'Debes aprobar la unidad anterior antes de cerrar esta.',
    project_gate_requirements_missing:'Para aprobar el gate debes revisar Theory, iniciar Workshop, completar los cuatro checks y registrar evidencia verificable.',
    backend_unavailable:'El backend del proyecto no está disponible en este momento.',
    invalid_client:'La configuración del cliente no coincide con producción.'
  };
  return map[code]||'No fue posible sincronizar el proyecto. Intenta nuevamente.';
}
async function api(payload){
  const response=await fetch(API,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':KEY},
    body:JSON.stringify(payload)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.error||`HTTP ${response.status}`);
    error.code=data.error||'request_failed';
    throw error;
  }
  return data;
}
async function identityEmail(){
  if(window.IJRSeminarAccess?.ready){
    const result=await window.IJRSeminarAccess.ready;
    if(result?.email)return String(result.email).trim().toLowerCase();
  }
  try{
    const saved=JSON.parse(localStorage.getItem('ijr-seminar-email-access-v2')||'null');
    if(saved?.email)return String(saved.email).trim().toLowerCase();
  }catch{}
  return '';
}
async function load(){
  const email=await identityEmail();
  if(!email){location.replace('../../index.html');return null}
  state.email=email;
  setBoot('Loading your assigned project and tracked progress…');
  const data=await api({action:'load',email});
  state.student=data.student;
  state.project=data.project;
  state.progress=data.progress||{unit_count:0,completed_units:0,started_units:0,current_unit:null,progress_percent:0,units:[]};
  return data;
}
function unitMeta(n){
  const list=Array.isArray(state.project?.sprints)?state.project.sprints:[];
  return list[n-1]||null;
}
function progressRow(n){
  return (state.progress?.units||[]).find(x=>Number(x.unit_no)===Number(n))||{
    unit_no:n,status:'not_started',theory_viewed:false,workshop_started:false,gate_passed:false,
    checklist:{defined:false,built:false,tested:false,evidence:false},evidence_note:'',evidence_url:'',repo_ref:''
  };
}
function projectReady(){
  const p=state.project;
  return Boolean(p?.is_defined && (p.project_mode==='fixed' || p.decision_status==='confirmed'));
}
function projectUnitLabel(){
  return state.project?.project_slug==='rico-portable-python-visual-show'?'Class':'Unit';
}
function renderPlaybook(targetId){
  const target=$(targetId);if(!target)return;
  const sections=Array.isArray(state.project?.content_sections)?state.project.content_sections:[];
  target.innerHTML=sections.length?sections.map(section=>`
    <article class="playbook-item">
      <div class="eyebrow">${esc(section.kicker||'PROJECT')}</div>
      <h4>${esc(section.title||'Project guidance')}</h4>
      ${section.body?`<p>${esc(section.body)}</p>`:''}
      ${Array.isArray(section.items)&&section.items.length?`<ul>${section.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
      ${Array.isArray(section.theory)&&section.theory.length?`<ul>${section.theory.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    </article>
  `).join(''):'<p>No additional playbook sections were defined for this project.</p>';
}
function renderResources(){
  const box=$('specialResources'),links=$('resourceLinks');
  if(!box||!links)return;
  const resources=[];
  const slug=state.project?.project_slug||'';
  const track=state.project?.track_slug||'';
  if(slug==='rico-portable-python-visual-show'){
    resources.push(['Detailed 4-class reference build','../student-workshops/rico-paramo/index.html']);
    resources.push(['Reference implementation','https://github.com/juanperez238421-cpu/IJR---Seminario/tree/main/t3/projects/student-workshops/rico-paramo/reference_project']);
  }
  if(track==='cybersecurity')resources.push(['Defensive cyber case library','../cyber-cases/']);
  if(slug.includes('visual')||slug.includes('animation'))resources.push(['Python animation project reference','../python-message-animation/']);
  box.classList.toggle('hidden',resources.length===0);
  links.innerHTML=resources.map(([label,href])=>`<a href="${esc(href)}" ${String(href).startsWith('http')?'target="_blank" rel="noopener noreferrer"':''}>${esc(label)} →</a>`).join('');
}
function renderHub(){
  const p=state.project,s=state.student,progress=state.progress;
  $('bootPanel').classList.add('hidden');
  if(!projectReady()){
    $('noProjectPanel').classList.remove('hidden');
    if(p?.is_defined&&p?.project_mode==='guided_definition'){
      $('noProjectPanel').querySelector('h2').textContent='Tu proyecto aún está por definir.';
      $('noProjectPanel').querySelector('p').textContent='Tu ruta técnica existe, pero todavía debes confirmar un tema, producto, objetivo y herramientas concretas en Project Decision Center antes de registrar progreso de construcción.';
    }
    return;
  }
  $('workspacePanel').classList.remove('hidden');
  $('groupBadge').textContent=s.group_code;
  $('trackBadge').textContent=TRACK_NAMES[p.track_slug]||p.track_slug;
  $('modeBadge').textContent=p.project_mode==='fixed'?'Fixed individual project':'Guided individual project';
  $('projectTitle').textContent=p.project_title;
  $('projectSummary').textContent=p.project_summary;
  $('objective').textContent=p.objective;
  $('stackList').innerHTML=(p.stack||[]).map(x=>`<span>${esc(x)}</span>`).join('');
  $('safetyScope').textContent=p.safety_scope||'Use only the intended project scope and preserve auditable evidence.';
  $('safetyCard').classList.toggle('hidden',!p.safety_scope);
  $('progressPercent').textContent=`${progress.progress_percent||0}%`;
  $('progressBar').style.width=`${progress.progress_percent||0}%`;
  $('progressCopy').textContent=`${progress.completed_units||0} / ${progress.unit_count||0} ${projectUnitLabel().toLowerCase()}s completed`;
  $('identityLine').textContent=`${s.name} · ${s.group_code} · Supabase synchronized`;
  $('routeTitle').textContent=`${progress.unit_count} tracked ${projectUnitLabel().toLowerCase()}s · ${p.project_title}`;
  $('currentUnitBadge').textContent=progress.current_unit?`Current: ${projectUnitLabel()} ${progress.current_unit}`:'No units';

  const units=Array.isArray(p.sprints)?p.sprints:[];
  $('unitGrid').innerHTML=units.map((unit,index)=>{
    const n=index+1,row=progressRow(n),done=row.gate_passed,current=n===Number(progress.current_unit);
    const label=projectUnitLabel();
    return `<article class="unit-card ${done?'done':''} ${current?'current':''}">
      <div class="unit-top"><span class="unit-no">${esc(label.toUpperCase())} ${String(n).padStart(2,'0')}</span><span class="unit-state">${done?'GATE PASSED':row.status==='in_progress'?'IN PROGRESS':'NOT STARTED'}</span></div>
      <h4>${esc(unit.title||`${label} ${n}`)}</h4>
      <p>${esc(unit.goal||'Build and verify the next project increment.')}</p>
      <div class="deliverable"><strong>Evidence:</strong> ${esc(unit.deliverable||'Reproducible project evidence')}</div>
      <div class="unit-actions">
        <a href="unit.html?unit=${n}&mode=theory">Theory ${row.theory_viewed?'✓':''}</a>
        <a class="primary" href="unit.html?unit=${n}&mode=workshop">Workshop ${done?'✓':''}</a>
      </div>
    </article>`;
  }).join('');
  renderPlaybook('playbookGrid');
  renderResources();
}
function query(){
  const p=new URLSearchParams(location.search);
  const unit=Math.max(1,Number(p.get('unit')||1));
  const mode=p.get('mode')==='workshop'?'workshop':'theory';
  return {unit,mode};
}
function setUnitStatus(row){
  const text=row.gate_passed?'Completed · gate passed':row.status==='in_progress'?'In progress':'Not started';
  $('unitStatus').textContent=text;
}
function renderUnit(){
  const p=state.project,s=state.student,{unit,mode}=query();
  $('bootPanel').classList.add('hidden');
  if(!projectReady()){
    $('noProjectPanel').classList.remove('hidden');
    if(p?.is_defined&&p?.project_mode==='guided_definition'){
      $('noProjectPanel').querySelector('h2').textContent='Project definition required.';
      $('noProjectPanel').querySelector('p').textContent='Confirm the concrete project in Project Decision Center before opening tracked units.';
    }
    return;
  }
  const meta=unitMeta(unit);
  if(!meta){$('noProjectPanel').classList.remove('hidden');$('noProjectPanel').querySelector('h2').textContent='This project unit does not exist.';return}
  const row=progressRow(unit),guide=TRACK_GUIDANCE[p.track_slug]||TRACK_GUIDANCE.web,label=projectUnitLabel();
  $('unitPanel').classList.remove('hidden');
  $('groupBadge').textContent=s.group_code;
  $('trackBadge').textContent=TRACK_NAMES[p.track_slug]||p.track_slug;
  $('unitLabel').textContent=`${label} ${unit} / ${state.progress.unit_count}`;
  $('unitTitle').textContent=meta.title||`${label} ${unit}`;
  $('unitGoal').textContent=meta.goal||'Build and verify the next project increment.';
  $('projectNameMini').textContent=p.project_title;
  setUnitStatus(row);
  $('pageTitleTop').textContent=`${label} ${unit} · ${mode==='theory'?'Theory':'Workshop'}`;
  $('modeKicker').textContent=`${label.toUpperCase()} ${String(unit).padStart(2,'0')} · ${mode.toUpperCase()}`;

  if(mode==='theory'){
    $('theoryPanel').classList.remove('hidden');
    $('theoryObjective').textContent=meta.theory||meta.goal||p.objective;
    $('theoryDeliverable').textContent=meta.deliverable||'Reproducible project evidence';
    $('trackTheoryTitle').textContent=guide.title;
    $('trackTheoryList').innerHTML=guide.theory.map(x=>`<li>${esc(x)}</li>`).join('');
    renderPlaybook('theoryPlaybook');
    $('toWorkshop').href=`unit.html?unit=${unit}&mode=workshop`;
    const btn=$('markTheory');
    if(row.theory_viewed){btn.textContent='Theory reviewed ✓';btn.disabled=true;$('theoryStatus').textContent='Saved in Supabase.'}
    btn.addEventListener('click',async()=>{
      btn.disabled=true;$('theoryStatus').textContent='Saving…';
      try{
        const data=await saveUnit(unit,{theory_viewed:true});
        state.progress=data.progress;btn.textContent='Theory reviewed ✓';$('theoryStatus').textContent='Saved in Supabase.';
        setUnitStatus(progressRow(unit));
      }catch(error){btn.disabled=false;$('theoryStatus').textContent=friendlyError(error.code||error.message)}
    });
  }else{
    $('workshopPanel').classList.remove('hidden');
    $('workshopInstruction').textContent=meta.workshop||guide.workshop;
    $('workshopDeliverable').textContent=meta.deliverable||'Reproducible project evidence';
    $('toTheory').href=`unit.html?unit=${unit}&mode=theory`;
    document.querySelectorAll('[data-check]').forEach(input=>{
      input.checked=row.checklist?.[input.dataset.check]===true;
    });
    $('evidenceNote').value=row.evidence_note||'';
    $('evidenceUrl').value=row.evidence_url||'';
    $('repoRef').value=row.repo_ref||'';

    const previousLocked=unit>1&&!progressRow(unit-1).gate_passed;
    $('gateLock').classList.toggle('hidden',!previousLocked);
    if(row.gate_passed){
      $('passGate').disabled=true;$('passGate').textContent='Unit gate passed ✓';
    }else if(previousLocked){
      $('passGate').disabled=true;
    }

    $('saveProgress').addEventListener('click',()=>saveWorkshop(unit,false));
    $('passGate').addEventListener('click',()=>saveWorkshop(unit,true));
  }
}
function workshopPayload(){
  const checklist={};
  document.querySelectorAll('[data-check]').forEach(input=>{checklist[input.dataset.check]=input.checked});
  return {
    workshop_started:true,
    checklist,
    evidence_note:$('evidenceNote').value.trim(),
    evidence_url:$('evidenceUrl').value.trim(),
    repo_ref:$('repoRef').value.trim()
  };
}
async function saveUnit(unit,patch){
  const row=progressRow(unit);
  return api({
    action:'save_progress',
    email:state.email,
    unit_no:unit,
    theory_viewed:patch.theory_viewed??row.theory_viewed,
    workshop_started:patch.workshop_started??row.workshop_started,
    gate_passed:patch.gate_passed===true,
    checklist:patch.checklist??row.checklist,
    evidence_note:patch.evidence_note??row.evidence_note,
    evidence_url:patch.evidence_url??row.evidence_url,
    repo_ref:patch.repo_ref??row.repo_ref
  });
}
async function saveWorkshop(unit,pass){
  const status=$('workshopStatus'),save=$('saveProgress'),gate=$('passGate');
  save.disabled=true;if(pass)gate.disabled=true;status.textContent=pass?'Validating gate…':'Saving progress…';
  try{
    const data=await saveUnit(unit,{...workshopPayload(),gate_passed:pass});
    state.progress=data.progress;
    const row=progressRow(unit);
    setUnitStatus(row);
    status.textContent=pass?'Gate passed. Progress is visible in the teacher Master panel.':'Partial progress saved in Supabase.';
    if(row.gate_passed){gate.disabled=true;gate.textContent='Unit gate passed ✓'}else{gate.disabled=false}
  }catch(error){
    status.textContent=friendlyError(error.code||error.message);
    if(!progressRow(unit).gate_passed)gate.disabled=false;
  }finally{save.disabled=false}
}
async function boot(){
  try{
    await load();
    const page=document.body.dataset.projectWorkspacePage;
    if(page==='hub')renderHub();else renderUnit();
  }catch(error){
    setBoot(friendlyError(error.code||error.message));
    $('bootPanel')?.classList.add('error');
  }
}
boot();