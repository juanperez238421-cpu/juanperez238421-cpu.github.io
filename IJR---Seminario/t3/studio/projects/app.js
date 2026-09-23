const PROJECT_API='https://rlfxnjbqxbozjdzkbwlz.supabase.co/functions/v1/seminar-student-project';
const KEY='sb_publishable_rmVOQ3Orx49KpW_4uMqYew_c2HpcA87';
const TOKEN_KEY='ijr-seminario-studio-edit-token-v1';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trackNames={web:'Web Development','data-science':'Python & Data Science',cybersecurity:'Defensive Cybersecurity','3d-programming':'3D Design + Programming',robotics:'Robotics & Automation'};
const decisionNames={proposed:'Propuesta para definir hoy',confirmed:'Proyecto confirmado',revise:'Requiere ajuste',rejected:'Descartado'};
function show(id){['loadingPanel','noProfilePanel','noProjectPanel','projectPanel'].forEach(x=>$(x).classList.toggle('hidden',x!==id))}
async function load(){
  const edit_token=localStorage.getItem(TOKEN_KEY);
  if(!edit_token){show('noProfilePanel');return}
  try{
    const r=await fetch(PROJECT_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({edit_token})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      if(data.error==='profile_not_found'){show('noProfilePanel');return}
      throw new Error(data.error||('HTTP '+r.status))
    }
    const a=data.assignment;
    if(!a){show('noProjectPanel');return}
    $('groupBadge').textContent=a.group_code||'';
    $('trackBadge').textContent=trackNames[a.track_slug]||a.track_slug||'';
    $('decisionBadge').textContent=decisionNames[a.decision_status]||a.decision_status||'Propuesta';
    $('decisionBadge').dataset.state=a.decision_status||'proposed';
    $('projectTitle').textContent=a.project_title||'Proyecto específico';
    $('studentName').textContent=a.student_name||'';
    $('projectSummary').textContent=a.project_summary||'';
    $('objective').textContent=a.objective||'';
    $('source').textContent=a.source_ref||a.source_kind||'Definido por el docente';
    $('stack').innerHTML=(a.stack||[]).map(x=>'<span>'+esc(x)+'</span>').join('');
    if(a.safety_scope){$('safety').textContent=a.safety_scope;$('safety').classList.remove('hidden')}
    if(a.decision_note){$('decisionNote').textContent=a.decision_note;$('decisionNote').classList.remove('hidden')}
    $('sprints').innerHTML=(a.sprints||[]).map(s=>'<article class="assigned-step"><div class="step-no">S'+esc(s.n)+'</div><div><strong>'+esc(s.title)+'</strong><p>'+esc(s.goal)+'</p></div><div><span class="kicker">EVIDENCIA</span><p>'+esc(s.deliverable)+'</p></div></article>').join('');
    show('projectPanel');
  }catch(err){
    $('loadingPanel').innerHTML='<div class="kicker">LOAD ERROR</div><h2>No fue posible cargar el proyecto.</h2><p class="muted">'+esc(err.message)+'</p>';
  }
}
load();