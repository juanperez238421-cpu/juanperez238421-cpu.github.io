const cfg=window.IJR_SEMINAR_T3_CONFIG,$=id=>document.getElementById(id);
const sb=globalThis.supabase?globalThis.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
let token=sessionStorage.getItem(cfg.teacherSessionKey)||'',snapshot=null,timer=null,loading=false,lastSuccessAt=0,activeView='oop';
const VISIBLE_MS=12000,HIDDEN_MS=45000;
function esc(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(v,d=2){const n=Number(v);return Number.isFinite(n)?n.toFixed(d):'—';}
function fmtTime(v){if(!v)return'—';try{return new Date(v).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'})}catch{return'—'}}
function bogotaDay(v){if(!v)return'';try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v))}catch{return''}}
function isToday(v){return !!v&&bogotaDay(v)===bogotaDay(new Date().toISOString())}
function lastActivity(s){const values=[s.course?.last_activity_at,s.studio?.last_student_activity_at,s.diagnostic?.completed_at,s.diagnostic?.updated_at,...(s.oop_uml||[]).map(x=>x.updated_at),...(s.oop_labs||[]).map(x=>x.last_activity_at)].filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite);return values.length?new Date(Math.max(...values)).toISOString():null}
function hasDigital(s){return !!(s.course||s.studio||s.diagnostic||(s.oop_uml||[]).length||(s.oop_labs||[]).length)}
function setLive(mode,text){const el=$('liveStatus');if(!el)return;el.className='live-status '+mode;el.textContent=text}
function schedule(){clearTimeout(timer);if(token)timer=setTimeout(load,document.hidden?HIDDEN_MS:VISIBLE_MS)}
function isAuthError(err){return /sesión docente|session|invalid|expired|expirada/i.test(String(err?.message||err))}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw new Error(error.message||'Backend error');return data}
function sessionRecord(s,key){return (s.oop_uml||[]).find(x=>x.session_key===key)||null}
function oopEvidence(record){
  const e=record?.evidence||{};
  return {
    has:!!record,
    uml:e.uml_mastery===true&&e.uml_visual_mastery===true,
    code:e.run_success===true&&e.implement_success===true&&e.test_success===true&&Number(e.successful_run_count||0)>0,
    umlScore:Number(e.uml_classification_score||0),
    umlTotal:Number(e.uml_classification_total||0),
    visualScore:Number(e.uml_visual_score||0),
    visualTotal:Number(e.uml_visual_total||0),
    runs:Number(e.run_count||0),
    successfulRuns:Number(e.successful_run_count||0)
  }
}
function latestOopSession(s){
  return [...(s.oop_uml||[])].sort((a,b)=>Number(String(b.session_key||'').replace(/\D/g,''))-Number(String(a.session_key||'').replace(/\D/g,'')))[0]||null
}
function projectHasEvidence(s){
  const x=s.studio;if(!x)return false;
  return !!(x.project_title||x.repo_full_name||x.uml_url||x.next_goal||Number(x.progress_percent||0)>0||Number(x.sprint_current||1)>1)
}
function viewLastActivity(s){
  let vals=[];
  if(activeView==='oop') vals=[...(s.oop_uml||[]).map(x=>x.updated_at||x.completed_at),...(s.oop_labs||[]).map(x=>x.last_activity_at)];
  else if(activeView==='topics') vals=[s.studio?.last_student_activity_at,s.diagnostic?.completed_at,s.diagnostic?.updated_at];
  else vals=[s.studio?.last_student_activity_at,s.studio?.updated_at];
  const ts=vals.filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite);
  return ts.length?new Date(Math.max(...ts)).toISOString():null
}
function viewHasRecord(s){
  if(activeView==='oop')return (s.oop_uml||[]).length>0||(s.oop_labs||[]).length>0;
  if(activeView==='topics')return !!(s.studio||s.diagnostic);
  return !!s.studio;
}
function filteredStudents(){
  const group=$('groupFilter').value,q=$('searchInput').value.trim().toLowerCase(),state=$('stateFilter').value;
  return (snapshot?.students||[]).filter(s=>{
    const last=viewLastActivity(s),digital=viewHasRecord(s);
    if(group&&s.group_code!==group)return false;
    if(q&&![s.display_name,s.internal_key,s.institutional_email].some(x=>String(x||'').toLowerCase().includes(q)))return false;
    if(state&& !((state==='today'&&isToday(last))||(state==='registered'&&digital)||(state==='missing'&&!digital)))return false;
    if(activeView==='oop'){
      const f=$('oopStageFilter').value,r=sessionRecord(s,'s01'),ev=oopEvidence(r);
      if(f==='s01'&&!r)return false;
      if(f==='uml'&&!ev.uml)return false;
      if(f==='code'&&!ev.code)return false;
      if(f==='missing'&&(s.oop_uml||[]).length)return false;
    }else if(activeView==='topics'){
      const track=$('trackFilter').value,diag=$('diagnosticFilter').value;
      if(track&&s.studio?.track_slug!==track&&s.diagnostic?.track_slug!==track)return false;
      if(diag==='started'&&!s.diagnostic)return false;
      if(diag==='completed'&&s.diagnostic?.status!=='completed')return false;
      if(diag==='missing'&&s.diagnostic)return false;
    }else{
      const ps=$('projectStateFilter').value,sprint=$('sprintFilter').value;
      if(ps==='profile'&&!s.studio)return false;
      if(ps==='evidence'&&!projectHasEvidence(s))return false;
      if(ps==='repo'&&!s.studio?.repo_full_name)return false;
      if(ps==='missing'&&s.studio)return false;
      if(sprint&&String(s.studio?.sprint_current||'')!==sprint)return false;
    }
    return true;
  });
}
function courseCell(s){const c=s.course;if(!c)return'<span class="pill none">No course record</span>';const grade=c.final_grade??c.projected_grade;const pct=Math.min(100,Number(c.completed_count||0)/16*100);return '<span class="cell-main">'+esc((c.language||'').toUpperCase())+' · '+esc(c.completed_count||0)+'/16</span><span class="cell-sub">'+esc(c.team_label||'')+' · grade '+esc(fmt(grade))+'</span><div class="progress-mini"><i style="width:'+pct+'%"></i></div>'}
function oopCell(s){
  const list=s.oop_uml||[];if(!list.length)return'<span class="pill none">0 sessions</span>';
  const latest=list[0]||{},e=latest.evidence||{};
  const umlOk=e.uml_mastery===true&&e.uml_visual_mastery===true;
  const codeOk=e.run_success===true&&e.implement_success===true&&e.test_success===true&&Number(e.successful_run_count||0)>0;
  return '<span class="pill '+(codeOk?'done':'partial')+'">'+esc((latest.session_key||'session').toUpperCase())+' evidence</span>'+
    '<span class="cell-sub">'+(umlOk?'UML verified':'UML pending')+' · '+(codeOk?'code validated':'code runtime pending')+'</span>';
}
function studioCell(s){const x=s.studio;if(!x)return'<span class="pill none">No profile</span>';return'<span class="cell-main">'+esc(x.track_slug||x.first_choice||'Track')+'</span><span class="cell-sub">Sprint '+esc(x.sprint_current||1)+' · '+esc(x.progress_percent||0)+'% · '+esc(x.role||'primary')+'</span>'}
function diagCell(s){const d=s.diagnostic;if(!d)return'<span class="pill none">Not taken</span>';return'<span class="pill '+(d.status==='completed'?'done':'active')+'">'+esc(d.status)+'</span><span class="cell-sub">'+esc(fmt(d.knowledge_percent,0))+'% · '+esc(d.level||'—')+'</span>'}
function labsCell(s){const a=s.oop_labs||[];if(!a.length)return'<span class="pill none">0</span>';const done=a.filter(x=>x.status==='submitted').length;return'<span class="pill blue">'+a.length+' lab'+(a.length===1?'':'s')+'</span><span class="cell-sub">'+done+' submitted</span>'}
function renderMetrics(){
  const all=snapshot?.students||[];
  let vals=[];
  if(activeView==='oop'){
    const s01=all.filter(s=>sessionRecord(s,'s01'));
    vals=[
      ['Official roster',snapshot?.roster_count||all.length],
      ['Stage 1 evidence',s01.length],
      ['UML verified',s01.filter(s=>oopEvidence(sessionRecord(s,'s01')).uml).length],
      ['Code validated',s01.filter(s=>oopEvidence(sessionRecord(s,'s01')).code).length],
      ['Runtime pending',s01.filter(s=>!oopEvidence(sessionRecord(s,'s01')).code).length],
      ['No POO evidence',all.filter(s=>!(s.oop_uml||[]).length).length]
    ];
  }else if(activeView==='topics'){
    vals=[
      ['Official roster',snapshot?.roster_count||all.length],
      ['Track selected',all.filter(s=>s.studio?.track_slug).length],
      ['Diagnostic started',all.filter(s=>s.diagnostic).length],
      ['Diagnostic completed',all.filter(s=>s.diagnostic?.status==='completed').length],
      ['Web',all.filter(s=>s.studio?.track_slug==='web').length],
      ['No topic record',all.filter(s=>!s.studio&&!s.diagnostic).length]
    ];
  }else{
    vals=[
      ['Official roster',snapshot?.roster_count||all.length],
      ['Project profiles',all.filter(s=>s.studio).length],
      ['Project evidence',all.filter(projectHasEvidence).length],
      ['GitHub repos',all.filter(s=>s.studio?.repo_full_name).length],
      ['UML links',all.filter(s=>s.studio?.uml_url).length],
      ['Progress > 0%',all.filter(s=>Number(s.studio?.progress_percent||0)>0).length]
    ];
  }
  $('metrics').innerHTML=vals.map(([k,v])=>'<div class="metric"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('');
}
function renderQuality(){
  const q=snapshot?.data_quality||{},items=[
    ['course members unmatched',q.unmatched_course_members||0],
    ['studio primary unmatched',q.unmatched_studio_primary||0],
    ['studio partners unmatched',q.unmatched_studio_partner||0],
    ['diagnostics unmatched',q.unmatched_diagnostics||0],
    ['duplicate active course links',q.duplicate_active_course_students||0]
  ],total=items.reduce((n,x)=>n+Number(x[1]||0),0);
  $('qualityPanel').innerHTML=total
    ?'<div class="quality-warn"><strong>Data-quality review required · '+total+' issue(s)</strong><div class="quality-grid">'+items.map(([k,v])=>'<span>'+esc(k)+': <strong>'+esc(v)+'</strong></span>').join('')+'</div></div>'
    :'<div class="quality-ok"><strong>Identity QA PASS.</strong> Current Seminar records are linked to the official roster with no unmatched or duplicate-active identity flags.</div>';
  renderLegacy();
}
function renderLegacy(){
  const data=snapshot?.legacy_unmatched||{},course=data.course||[],studio=data.studio||[],diag=data.diagnostics||[];
  const total=course.length+studio.length+diag.length;
  $('legacyPanel').classList.toggle('hidden',!total);
  if(!total){$('legacyContent').innerHTML='';return}
  const block=(title,rows,render)=>rows.length?'<div class="legacy-block"><h3>'+esc(title)+' <span>'+rows.length+'</span></h3><div class="legacy-list">'+rows.map(render).join('')+'</div></div>':'';
  $('legacyContent').innerHTML=
    block('T3 Course',course,x=>'<div class="legacy-row"><div><strong>'+esc(x.display_name||'—')+'</strong><span>'+esc(x.group_code||'')+' · '+esc((x.language||'').toUpperCase())+' · '+esc(x.team_label||'')+'</span></div><time>'+esc(fmtTime(x.last_activity_at))+'</time></div>')+
    block('Project Studio',studio,x=>'<div class="legacy-row"><div><strong>'+esc(x.full_name||'—')+'</strong><span>'+esc(x.group_code||'')+' · '+esc(x.track_slug||'')+(x.partner_name?' · partner '+esc(x.partner_name):'')+'</span></div><time>'+esc(fmtTime(x.updated_at))+'</time></div>')+
    block('Diagnostics',diag,x=>'<div class="legacy-row"><div><strong>'+esc(x.full_name||'—')+'</strong><span>'+esc(x.group_code||'')+' · '+esc(x.track_slug||'')+'</span></div><time>'+esc(fmtTime(x.updated_at))+'</time></div>');
}
function setViewUi(){
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===activeView));
  $('oopPageFilters').classList.toggle('hidden',activeView!=='oop');
  $('topicsPageFilters').classList.toggle('hidden',activeView!=='topics');
  $('projectPageFilters').classList.toggle('hidden',activeView!=='project');
  const meta={
    oop:['POO + UML · Registro maestro','Common Core por workshop stage. Se conserva la evidencia real y se separa UML verificado de ejecución de código validada.'],
    topics:['Specific Topics · Registro maestro','Selección de track y diagnóstico especializado. Un registro iniciado no se muestra como diagnóstico completado.'],
    project:['Project · Registro maestro','Evidencia real del proyecto: título, sprint, progreso, repositorio, UML y siguiente meta. Perfil creado no equivale a proyecto avanzado.']
  }[activeView];
  $('registerTitle').textContent=meta[0];$('registerDescription').textContent=meta[1];
}
function baseCells(s){return '<td><strong>'+esc(s.group_code)+'</strong></td>'+
  '<td>'+esc(s.source_position)+'</td>'+
  '<td><span class="student-name">'+esc(s.display_name)+'</span><span class="student-key">'+esc(s.internal_key)+(s.institutional_email?' · '+esc(s.institutional_email):'')+'</span></td>'+
  '<td><span class="pill verified">✓ Roster verified</span></td>'}
function oopRow(s){
  const r=sessionRecord(s,'s01'),ev=oopEvidence(r),latest=latestOopSession(s),last=viewLastActivity(s);
  const stage=r?'<span class="pill partial">S01 evidence</span><span class="cell-sub">'+esc(fmtTime(r.completed_at||r.updated_at))+'</span>':'<span class="pill none">No S01 evidence</span>';
  const uml=r?'<span class="pill '+(ev.uml?'done':'partial')+'">'+(ev.uml?'Verified':'Pending')+'</span><span class="cell-sub">'+ev.umlScore+'/'+ev.umlTotal+' classification · '+ev.visualScore+'/'+ev.visualTotal+' visual</span>':'<span class="pill none">—</span>';
  const code=r?'<span class="pill '+(ev.code?'done':'active')+'">'+(ev.code?'Validated':'Runtime pending')+'</span><span class="cell-sub">'+ev.successfulRuns+'/'+ev.runs+' successful runs</span>':'<span class="pill none">—</span>';
  const labs=s.oop_labs||[];
  return '<tr>'+baseCells(s)+
    '<td>'+stage+'</td>'+
    '<td>'+(latest?'<span class="cell-main">'+esc((latest.session_key||'').toUpperCase())+'</span><span class="cell-sub">'+esc(latest.status||'evidence')+'</span>':'<span class="pill none">None</span>')+'</td>'+
    '<td>'+uml+'</td><td>'+code+'</td>'+
    '<td>'+(labs.length?'<span class="pill blue">'+labs.length+' lab(s)</span>':'<span class="pill none">0</span>')+'</td>'+
    '<td class="time">'+esc(fmtTime(last))+'</td>'+
    '<td><span class="pill '+(r?'partial':'none')+'">'+(r?'Evidence recorded':'No activity')+'</span></td>'+
    '<td><button class="inspect" data-student="'+esc(s.student_registry_id)+'">Inspect</button></td></tr>';
}
function topicsRow(s){
  const st=s.studio,d=s.diagnostic,last=viewLastActivity(s);
  const track=st?.track_slug||d?.track_slug;
  const diag=d?'<span class="pill '+(d.status==='completed'?'done':'active')+'">'+esc(d.status)+'</span><span class="cell-sub">'+(d.status==='completed'?esc(fmt(d.knowledge_percent,1))+'% · '+esc(d.level||'—'):'Started · no result yet')+'</span>':'<span class="pill none">Not started</span>';
  return '<tr>'+baseCells(s)+
    '<td>'+(track?'<span class="pill blue">'+esc(track)+'</span>':'<span class="pill none">No track</span>')+'</td>'+
    '<td>'+(st?'<span class="cell-main">'+esc(st.first_choice||st.track_slug||'Selected')+'</span><span class="cell-sub">'+esc(st.work_mode||'')+'</span>':'<span class="pill none">No profile</span>')+'</td>'+
    '<td>'+diag+'</td>'+
    '<td>'+(d&&d.status==='completed'?'<span class="cell-main">Stage '+esc(d.highest_mastered_stage??0)+'</span><span class="cell-sub">recommended '+esc(d.recommended_stage??'—')+'</span>':'<span class="pill none">No completed score</span>')+'</td>'+
    '<td class="time">'+esc(fmtTime(last))+'</td>'+
    '<td><span class="pill '+(st||d?'partial':'none')+'">'+(st||d?'Recorded':'No activity')+'</span></td>'+
    '<td><button class="inspect" data-student="'+esc(s.student_registry_id)+'">Inspect</button></td></tr>';
}
function projectRow(s){
  const st=s.studio,last=viewLastActivity(s),evidence=projectHasEvidence(s);
  return '<tr>'+baseCells(s)+
    '<td>'+(st?'<span class="cell-main">'+esc(st.project_title||'Not defined')+'</span><span class="cell-sub">'+esc(st.track_slug||st.first_choice||'')+'</span>':'<span class="pill none">No profile</span>')+'</td>'+
    '<td>'+(st?'<span class="pill '+(Number(st.sprint_current||1)>1?'partial':'none')+'">Sprint '+esc(st.sprint_current||1)+'/8</span>':'<span class="pill none">—</span>')+'</td>'+
    '<td>'+(st?'<span class="cell-main">'+esc(st.progress_percent||0)+'%</span><div class="progress-mini"><i style="width:'+Math.max(0,Math.min(100,Number(st.progress_percent||0)))+'%"></i></div>':'<span class="pill none">—</span>')+'</td>'+
    '<td>'+(st?.repo_full_name?'<span class="pill done">GitHub linked</span>':'<span class="pill none">No repo</span>')+'</td>'+
    '<td>'+(st?.uml_url?'<span class="pill done">UML linked</span>':'<span class="pill none">No UML</span>')+'</td>'+
    '<td>'+(st?.next_goal?'<span class="cell-sub">'+esc(st.next_goal)+'</span>':'<span class="pill none">No next goal</span>')+'</td>'+
    '<td class="time">'+esc(fmtTime(last))+'</td>'+
    '<td><span class="pill '+(evidence?'partial':st?'active':'none')+'">'+(evidence?'Evidence started':st?'Profile only':'No activity')+'</span></td>'+
    '<td><button class="inspect" data-student="'+esc(s.student_registry_id)+'">Inspect</button></td></tr>';
}
function render(){
  if(!snapshot)return;
  setViewUi();renderMetrics();renderQuality();
  const rows=filteredStudents();$('shownCount').textContent=rows.length;
  const heads={
    oop:['Grupo','#','Estudiante','Identidad','Workshop Stage 1','Último stage','UML evidence','Code runtime','OOP labs','Última actividad','Estado',''],
    topics:['Grupo','#','Estudiante','Identidad','Track','Selección','Diagnóstico','Resultado','Última actividad','Estado',''],
    project:['Grupo','#','Estudiante','Identidad','Proyecto','Sprint','Avance','Repositorio','UML','Siguiente meta','Última actividad','Estado','']
  }[activeView];
  $('studentHead').innerHTML=heads.map(x=>'<th>'+esc(x)+'</th>').join('');
  $('studentBody').innerHTML=rows.map(s=>activeView==='oop'?oopRow(s):activeView==='topics'?topicsRow(s):projectRow(s)).join('')
    ||'<tr><td colspan="'+heads.length+'">No students match this filter.</td></tr>';
  document.querySelectorAll('[data-student]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.student)));
  $('updatedAt').textContent='Updated '+fmtTime(snapshot.generated_at);
}
function detailEmpty(text){return'<div class="detail-empty">'+esc(text)+'</div>'}
function openDetail(id){
  const s=(snapshot?.students||[]).find(x=>x.student_registry_id===id);if(!s)return;
  $('dialogTitle').textContent=s.display_name;$('dialogSubtitle').textContent=s.group_code+' · '+s.internal_key+' · roster position '+s.source_position;
  $('detailIdentity').innerHTML=[
    ['Group',s.group_code],['Roster #',s.source_position],['Internal key',s.internal_key],['Identity','Roster verified']
  ].map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('');
  const c=s.course;
  if(!c)$('detailCourse').innerHTML=detailEmpty('No T3 Course registration yet.');
  else{
    const modules=c.modules||[];
    $('detailCourse').innerHTML='<div class="detail-card"><span class="label">Latest team session</span><strong>'+esc((c.language||'').toUpperCase())+' · '+esc(c.completed_count||0)+'/16 · '+esc(c.team_label||'')+'</strong><div class="cell-sub">Projected/final grade: '+esc(fmt(c.final_grade??c.projected_grade))+' · Last activity '+esc(fmtTime(c.last_activity_at))+'</div></div><div class="module-grid">'+
      Array.from({length:16},(_,i)=>{const key='m'+String(i+1).padStart(2,'0'),m=modules.find(x=>x.module_key===key),mode=m?.completion_mode||'pending';return'<div class="module-item '+(mode==='solved'?'done':mode==='revealed'?'revealed':'')+'"><strong>'+key+' · '+esc(mode)+'</strong><span>help '+esc(m?.help_count||0)+' · wrong '+esc(m?.wrong_count||0)+'</span></div>'}).join('')+'</div>';
  }
  const oop=s.oop_uml||[];$('detailOop').innerHTML=oop.length?'<div class="detail-list">'+oop.map(x=>{
    const e=x.evidence||{},uml=e.uml_mastery===true&&e.uml_visual_mastery===true;
    const code=e.run_success===true&&e.implement_success===true&&e.test_success===true&&Number(e.successful_run_count||0)>0;
    const umlScore=Number(e.uml_classification_score||0)+'/'+Number(e.uml_classification_total||0);
    const visualScore=Number(e.uml_visual_score||0)+'/'+Number(e.uml_visual_total||0);
    const runtime=Number(e.successful_run_count||0)+'/'+Number(e.run_count||0)+' successful runs';
    return '<div class="detail-row"><div><strong>'+esc((x.session_key||'').toUpperCase())+' · evidence recorded</strong><span class="cell-sub">UML '+esc(umlScore)+' · visual '+esc(visualScore)+' · '+esc(runtime)+'</span></div><span>'+(uml?'UML ✓':'UML pending')+' · '+(code?'code ✓':'code pending')+' · '+esc(fmtTime(x.completed_at||x.updated_at))+'</span></div>';
  }).join('')+'</div>':detailEmpty('No Common Core OOP/UML session recorded.');
  const st=s.studio;if(!st)$('detailStudio').innerHTML=detailEmpty('No Software Engineering Studio profile.');
  else{let links='';if(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(st.repo_full_name||''))links+='<a target="_blank" rel="noopener" href="https://github.com/'+esc(st.repo_full_name)+'">GitHub repository</a>';if(/^https:\/\//i.test(st.uml_url||''))links+='<a target="_blank" rel="noopener" href="'+esc(st.uml_url)+'">UML evidence</a>';$('detailStudio').innerHTML='<div class="detail-card"><span class="label">Track</span><strong>'+esc(st.track_slug||st.first_choice)+'</strong><div class="cell-sub">'+esc(st.role)+' · '+esc(st.work_mode)+' · Sprint '+esc(st.sprint_current)+' · '+esc(st.progress_percent)+'%</div><div class="cell-sub">Project: '+esc(st.project_title||'—')+' · Next goal: '+esc(st.next_goal||'—')+'</div><div class="detail-links">'+links+'</div></div>'}
  const d=s.diagnostic;$('detailDiagnostic').innerHTML=d?'<div class="detail-card"><span class="label">'+esc(d.track_slug)+' · '+esc(d.bank_version)+'</span><strong>'+esc(d.status)+' · '+esc(fmt(d.knowledge_percent,0))+'% knowledge · '+esc(fmt(d.confidence_percent,0))+'% confidence</strong><div class="cell-sub">Level '+esc(d.level||'—')+' · mastered stage '+esc(d.highest_mastered_stage??'—')+' · recommended '+esc(d.recommended_stage??'—')+'</div></div>':detailEmpty('No track diagnostic linked to this roster student.');
  const labs=s.oop_labs||[];$('detailLabs').innerHTML=labs.length?'<div class="detail-list">'+labs.map(x=>'<div class="detail-row"><div><strong>'+esc(x.title||x.slug)+'</strong><span class="cell-sub">'+esc(x.status)+'</span></div><span>grade '+esc(fmt(x.grade))+' · '+esc(fmtTime(x.last_activity_at))+'</span></div>').join('')+'</div>':detailEmpty('No OOP lab record linked to this student.');
  $('studentDialog').showModal();
}
async function load(force=false){
  if(!token||loading)return;
  loading=true;if(force)setLive('syncing','Refreshing…');
  try{
    snapshot=await rpc(cfg.rpc.masterCodeDashboard||'seminar_master_code_v1',{p_teacher_token:token});
    lastSuccessAt=Date.now();
    $('loginPanel').classList.add('hidden');
    $('dashboardPanel').classList.remove('hidden');
    $('loginStatus').textContent='';
    setLive('live','LIVE · code session · official roster');
    render();
  }catch(err){
    if(isAuthError(err)){
      token='';snapshot=null;clearTimeout(timer);sessionStorage.removeItem(cfg.teacherSessionKey);
      $('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');
      $('loginStatus').textContent='Sesión finalizada. Ingresa nuevamente el código maestro.';
    }else{
      const age=lastSuccessAt?Math.round((Date.now()-lastSuccessAt)/1000):null;
      setLive(snapshot?'stale':'error',snapshot?'Saved view · '+age+'s':'Could not load master data');
      $('loginStatus').textContent='Master backend: '+err.message;
    }
  }finally{loading=false;schedule()}
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!sb){$('loginStatus').textContent='Supabase client unavailable.';return}
  const code=$('teacherCode').value;
  if(!code.trim()){$('loginStatus').textContent='Ingresa el código maestro.';return}
  $('loginStatus').textContent='Verificando código…';
  try{
    const data=await rpc(cfg.rpc.teacherLogin||'teacher_code_login',{p_code:code,p_user_agent:navigator.userAgent});
    token=data?.teacher_token||'';
    if(!token)throw new Error('No se recibió una sesión docente.');
    sessionStorage.setItem(cfg.teacherSessionKey,token);
    $('teacherCode').value='';
    $('loginStatus').textContent='';
    await load(true);
  }catch(err){
    token='';sessionStorage.removeItem(cfg.teacherSessionKey);
    $('loginStatus').textContent='No fue posible ingresar: '+err.message;
  }
});
$('logoutButton').addEventListener('click',async()=>{
  clearTimeout(timer);
  try{if(token)await rpc(cfg.rpc.teacherLogout||'teacher_code_logout',{p_teacher_token:token})}catch{}
  token='';snapshot=null;sessionStorage.removeItem(cfg.teacherSessionKey);
  $('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');
  $('loginStatus').textContent='';setLive('syncing','Disconnected');
});
$('refreshButton').addEventListener('click',()=>load(true));
['groupFilter','stateFilter','oopStageFilter','trackFilter','diagnosticFilter','projectStateFilter','sprintFilter'].forEach(id=>$(id).addEventListener('change',render));
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{activeView=btn.dataset.view;render()}));
$('searchInput').addEventListener('input',render);
$('closeDialog').addEventListener('click',()=>$('studentDialog').close());
$('toggleLegacy').addEventListener('click',()=>{const box=$('legacyContent'),hidden=box.classList.toggle('hidden');$('toggleLegacy').textContent=hidden?'Mostrar detalle':'Ocultar detalle'});
document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden&&token)load(true);else schedule()});
window.addEventListener('online',()=>{if(token)load(true)});
(async()=>{
  if(!sb){$('loginStatus').textContent='Supabase client unavailable.';return}
  if(token){$('loginPanel').classList.add('hidden');$('dashboardPanel').classList.remove('hidden');await load(true)}
})();
