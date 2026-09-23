const config=window.IJR_SEMINAR_T3_CONFIG||{};
const API=(config.supabaseUrl||'https://rlfxnjbqxbozjdzkbwlz.supabase.co')+'/functions/v1/seminar-project-access';
const KEY=config.supabasePublishableKey||'sb_publishable_rmVOQ3Orx49KpW_4uMqYew_c2HpcA87';
const STUDIO_TOKEN_KEY='ijr-seminario-studio-edit-token-v1';
const $=id=>document.getElementById(id);
const trackNames={web:'Web Development','data-science':'Python / Data Analyst',cybersecurity:'Defensive Cybersecurity','3d-programming':'3D + Printing',robotics:'Robotics'};
const decisionNames={proposed:'Por confirmar',confirmed:'Confirmado',revise:'Requiere ajuste',rejected:'Descartado'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let state={email:'',student:null,project:null,options:[]};
let selectedKey='';

function setStatus(id,message,type=''){
  const el=$(id);
  if(!el)return;
  el.textContent=message;
  el.className=(id==='accessStatus'?'access-status ':'decision-status ')+type;
}
function friendlyError(code){
  const map={
    write_authorization_required:'No pude validar el permiso para guardar. Usa tu código ST… o abre primero Project Studio en este mismo equipo.',
    project_fields_required:'Completa título, descripción y objetivo antes de confirmar.',
    invalid_choice:'Selecciona una de las opciones de proyecto antes de guardar.',
    track_required:'Selecciona la ruta técnica del proyecto antes de guardar.',
    invalid_track_choice:'La ruta seleccionada no corresponde a la opción de proyecto elegida.',
    track_change_not_allowed:'Tu proyecto ya tiene una ruta definida. Puedes modificar el proyecto dentro de esa ruta, pero no cambiarla desde esta pantalla.',
    project_access_denied:'El correo no coincide con un correo institucional registrado para un estudiante activo de 11°.',
    institutional_email_required:'Debes usar el correo institucional @ijr.edu.co asociado a tu registro.',
    invalid_client:'La configuración de acceso no es válida. Informa al docente.',
    invalid_request:'No fue posible completar la solicitud. Revisa los campos e intenta nuevamente.'
  };
  return map[code]||'No fue posible completar la solicitud. Intenta nuevamente.';
}
function showAccess(){
  $('projectPanel').classList.add('hidden');
  $('accessPanel').classList.remove('hidden');
  $('institutionalEmail').focus();
}
function formatDate(value){
  if(!value)return'';
  try{
    return new Date(value).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }catch{return''}
}
function hasDeviceToken(){
  const token=localStorage.getItem(STUDIO_TOKEN_KEY)||'';
  return /^[a-f0-9]{48,128}$/i.test(token);
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
function updateSelectionUI(){
  document.querySelectorAll('.option-card').forEach(card=>{
    const active=card.dataset.option===selectedKey;
    card.classList.toggle('selected',active);
    card.setAttribute('aria-checked',active?'true':'false');
  });
  const option=state.options.find(x=>x.key===selectedKey);
  $('selectionBadge').textContent=option?option.label:'Sin seleccionar';
  $('selectionBadge').classList.toggle('active',Boolean(option));
  $('choiceKey').value=selectedKey;
}
function fillEditor(values,{clearNote=false}={}){
  $('projectTitleInput').value=values?.title??values?.project_title??'';
  $('projectSummaryInput').value=values?.summary??values?.project_summary??'';
  $('objectiveInput').value=values?.objective??'';
  const stack=values?.stack||[];
  $('stackInput').value=Array.isArray(stack)?stack.join(', '):'';
  if(clearNote)$('studentNote').value='';
}
function chooseOption(key,{silent=false}={}){
  const option=state.options.find(x=>x.key===key);
  if(!option)return;
  selectedKey=key;
  updateSelectionUI();
  fillEditor(option,{clearNote:false});

  const route=$('trackSlugInput');
  if(option.track_slug)route.value=option.track_slug;
  else if(!route.value&&state.project?.track_slug)route.value=state.project.track_slug;
  route.disabled=Boolean(state.project?.is_defined)||option.kind!=='custom';

  if(key==='custom'){
    $('projectTitleInput').focus();
    if(!silent)setStatus('decisionStatus','Escribe tu idea desde cero, selecciona la ruta técnica y concreta todos los campos antes de confirmar.','info');
  }else if(!silent){
    setStatus('decisionStatus','Base cargada. La ruta técnica queda definida por esta opción; ahora modifícala para que el proyecto sea realmente tuyo.','info');
  }
}
function restoreCurrent(){
  const p=state.project;
  if(!p)return;
  selectedKey=p.student_choice_key&&state.options.some(x=>x.key===p.student_choice_key)
    ?p.student_choice_key
    :(p.is_defined&&state.options.some(x=>x.key==='teacher-proposal')?'teacher-proposal':'');
  updateSelectionUI();

  if(p.is_defined){
    fillEditor(p);
  }else{
    fillEditor({title:'',summary:'',objective:'',stack:[]});
  }

  const route=$('trackSlugInput');
  route.value=p.track_slug||'';
  route.disabled=Boolean(p.is_defined);

  $('studentNote').value=p.student_decision_note||'';
  setStatus('decisionStatus',p.is_defined?'Se recuperó la última versión guardada.':'Aún no hay proyecto guardado. Selecciona una opción para comenzar.','info');
}
function renderOptions(){
  const kindLabel={teacher:'Propuesta inicial',curated:'Opción sugerida',custom:'Proyecto libre'};
  $('optionGrid').innerHTML=state.options.map(option=>`
    <button type="button" class="option-card" role="radio" aria-checked="false" data-option="${esc(option.key)}">
      <div class="option-top">
        <span class="option-label">${esc(option.label)}</span>
        <span class="option-kind ${esc(option.kind)}">${esc(kindLabel[option.kind]||'Opción')}</span>
      </div>
      ${option.track_slug?`<div class='option-track'>${esc(trackNames[option.track_slug]||option.track_slug)}</div>`:''}
      <h4>${esc(option.title||'Escribir mi propio proyecto')}</h4>
      <p>${esc(option.summary||'Define libremente qué quieres construir dentro de tu ruta actual.')}</p>
      <div class="option-stack">${(option.stack||[]).slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
      <div class="choose-hint">Seleccionar y editar →</div>
    </button>
  `).join('');
  document.querySelectorAll('.option-card').forEach(card=>{
    card.addEventListener('click',()=>chooseOption(card.dataset.option));
  });
}
function render(data){
  state.student=data.student;
  state.project=data.project;
  state.options=Array.isArray(data.options)?data.options:[];
  const s=state.student,p=state.project;

  $('studentName').textContent=s.name;
  $('groupBadge').textContent=s.group_code;
  $('registeredEmailBadge').textContent=s.institutional_email||state.email;
  $('trackBadge').textContent=p.track_slug?(trackNames[p.track_slug]||p.track_slug):'Ruta por elegir';
  $('modeBadge').textContent=!p.is_defined?'Proyecto por definir':(p.project_mode==='fixed'?'Proyecto específico':'Ruta flexible');
  $('modeBadge').dataset.mode=p.project_mode||'guided_definition';
  $('currentProjectLabel').textContent=p.is_defined?'CURRENT PROJECT':'PROJECT STATUS';
  $('projectTitle').textContent=p.project_title;
  $('projectSummary').textContent=p.project_summary;
  $('decisionLead').textContent=p.is_defined
    ?'Selecciona una opción de tu ruta. La tarjeta carga una base y en el paso 2 puedes modificarla antes de guardar.'
    :'Aún no tienes un proyecto definido. Revisa las opciones de las cinco rutas, selecciona una base o usa “Mi propia idea” y después concreta el alcance.';

  const decisionText=decisionNames[p.decision_status]||p.decision_status||'Por confirmar';
  $('decisionBadgeTop').textContent=decisionText;
  $('decisionBadgeTop').dataset.state=p.decision_status||'proposed';
  $('decisionBadge').textContent=decisionText;
  $('decisionBadge').dataset.state=p.decision_status||'proposed';

  if(p.student_decided_at){
    $('revisionMeta').textContent=`Última confirmación: ${formatDate(p.student_decided_at)} · Revisiones guardadas: ${Number(p.student_revision_count||0)}`;
  }else{
    $('revisionMeta').textContent='Aún no has confirmado una decisión final.';
  }

  $('decisionNote').textContent=p.decision_note||'Usa estas preguntas para cerrar el alcance antes de confirmar.';
  $('defineTitle').textContent=p.project_mode==='fixed'?'Revisa el alcance técnico':'Cierra el alcance de tu idea';
  const questions=Array.isArray(p.definition_questions)?p.definition_questions:[];
  $('definitionQuestions').innerHTML=questions.map(q=>'<li>'+esc(q)+'</li>').join('');
  $('defineToday').classList.toggle('hidden',questions.length===0&&!p.decision_note);

  $('objective').textContent=p.objective||'Aún por definir.';
  $('stack').innerHTML=(p.stack||[]).length
    ?(p.stack||[]).map(x=>'<span>'+esc(x)+'</span>').join('')
    :'<span class="empty-chip">Aún por definir</span>';
  if(p.safety_scope){
    $('safetyScope').textContent=p.safety_scope;
    $('safetyPanel').classList.remove('hidden');
  }else{
    $('safetyPanel').classList.add('hidden');
  }

  const contentSections=Array.isArray(p.content_sections)?p.content_sections:[];
  $('contentGrid').innerHTML=contentSections.map((section,index)=>`
    <article class="content-card">
      <div class="content-step">${String(index+1).padStart(2,'0')}</div>
      <div class="content-body">
        <div class="content-kicker">${esc(section?.kicker||'PROJECT')}</div>
        <h4>${esc(section?.title||'Contenido del proyecto')}</h4>
        ${section?.body?`<p>${esc(section.body)}</p>`:''}
        ${Array.isArray(section?.items)&&section.items.length
          ?`<ul>${section.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`
          :''}
      </div>
    </article>
  `).join('');
  $('contentPanel').classList.toggle('hidden',contentSections.length===0);

  const sprints=Array.isArray(p.sprints)?p.sprints:[];
  $('sprintGrid').innerHTML=sprints.map(step=>`
    <article class="sprint-card">
      <div class="sprint-number">S${esc(step.n)}</div>
      <div>
        <h4>${esc(step.title)}</h4>
        <p>${esc(step.goal)}</p>
        <div class="deliverable"><strong>Evidencia</strong><span>${esc(step.deliverable)}</span></div>
      </div>
    </article>
  `).join('');
  $('roadmapPanel').classList.toggle('hidden',sprints.length===0);

  renderOptions();
  selectedKey=p.student_choice_key&&state.options.some(x=>x.key===p.student_choice_key)
    ?p.student_choice_key
    :(p.is_defined&&state.options.some(x=>x.key==='teacher-proposal')?'teacher-proposal':'');
  updateSelectionUI();

  const route=$('trackSlugInput');
  route.value=p.track_slug||'';
  route.disabled=Boolean(p.is_defined);

  if(p.is_defined){
    fillEditor(p);
  }else{
    fillEditor({title:'',summary:'',objective:'',stack:[]});
    setStatus('decisionStatus','No hay proyecto guardado todavía. Selecciona una opción y concreta tu propuesta.','info');
  }
  $('studentNote').value=p.student_decision_note||'';
  $('studentCode').value='';
  $('finalConfirm').checked=false;

  if(hasDeviceToken()){
    $('authHelp').textContent='Este equipo tiene una sesión de Project Studio disponible. Intentaremos validarla automáticamente; el código ST… queda como respaldo.';
    $('studentCode').required=false;
  }else{
    $('authHelp').textContent='Para guardar desde este equipo, escribe tu código personal ST… de estudiante.';
    $('studentCode').required=true;
  }

  $('accessPanel').classList.add('hidden');
  $('projectPanel').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

$('accessForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('institutionalEmail').value.trim().toLowerCase();
  if(!email.endsWith('@ijr.edu.co')){
    setStatus('accessStatus','Usa tu correo institucional @ijr.edu.co.','error');
    return;
  }
  state.email=email;
  setStatus('accessStatus','Buscando tu ruta y tus opciones…','');
  const submit=e.submitter;
  if(submit)submit.disabled=true;
  try{
    const data=await api({action:'load',email});
    setStatus('accessStatus','');
    render(data);
  }catch(error){
    setStatus('accessStatus',friendlyError(error.code||error.message),'error');
  }finally{
    if(submit)submit.disabled=false;
  }
});

$('decisionForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!selectedKey){
    setStatus('decisionStatus','Selecciona primero una opción de proyecto.','error');
    return;
  }
  if(!$('finalConfirm').checked){
    setStatus('decisionStatus','Marca la confirmación antes de guardar.','error');
    return;
  }

  const trackSlug=$('trackSlugInput').value.trim();
  const title=$('projectTitleInput').value.trim();
  const summary=$('projectSummaryInput').value.trim();
  const objective=$('objectiveInput').value.trim();
  const stack=$('stackInput').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);
  const editToken=localStorage.getItem(STUDIO_TOKEN_KEY)||'';
  const studentCode=$('studentCode').value.trim();

  if(!trackSlug){
    setStatus('decisionStatus','Selecciona la ruta técnica del proyecto.','error');
    $('trackSlugInput').focus();
    return;
  }
  if(title.length<3||summary.length<10||objective.length<10){
    setStatus('decisionStatus','Completa título, descripción y objetivo con suficiente detalle.','error');
    return;
  }
  if(!hasDeviceToken()&&!studentCode){
    setStatus('decisionStatus','Escribe tu código ST… para autorizar el guardado.','error');
    $('studentCode').focus();
    return;
  }

  const button=$('saveDecision');
  button.disabled=true;
  setStatus('decisionStatus','Guardando tu decisión final…','');
  try{
    const data=await api({
      action:'save_decision',
      email:state.email,
      choice_key:selectedKey,
      track_slug:trackSlug,
      project_title:title,
      project_summary:summary,
      objective,
      stack,
      student_note:$('studentNote').value.trim(),
      edit_token:editToken||null,
      student_code:studentCode||null
    });
    render(data);
    setStatus('decisionStatus','Proyecto confirmado. La ruta, la opción elegida y esta versión quedaron registradas.','ok');
  }catch(error){
    setStatus('decisionStatus',friendlyError(error.code||error.message),'error');
  }finally{
    button.disabled=false;
  }
});

$('restoreCurrent').addEventListener('click',restoreCurrent);
$('changeEmail').addEventListener('click',()=>{
  $('institutionalEmail').value='';
  setStatus('accessStatus','');
  setStatus('decisionStatus','');
  state={email:'',student:null,project:null,options:[]};
  selectedKey='';
  showAccess();
});


/* Reuse the global Seminar institutional-email gate.
   Students should not be asked for a second identity field on this page. */
window.IJRSeminarAccess?.ready?.then(({email})=>{
  if(!email)return;
  const input=$('institutionalEmail');
  if(input)input.value=email;
  if(!$('projectPanel').classList.contains('hidden'))return;
  $('accessForm').requestSubmit();
}).catch(()=>{});

$('changeEmail').addEventListener('click',()=>{
  window.IJRSeminarAccess?.logout?.();
});
