const cfg=window.IJR_SEMINAR_T3_CONFIG,$=id=>document.getElementById(id);
const sb=globalThis.supabase?globalThis.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
let token=sessionStorage.getItem(cfg.teacherSessionKey)||'',snapshot=null,timer=null,loading=false,lastSuccessAt=0;
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
function filteredStudents(){
  const group=$('groupFilter').value,q=$('searchInput').value.trim().toLowerCase(),state=$('stateFilter').value,track=$('trackFilter').value;
  return (snapshot?.students||[]).filter(s=>{
    const last=lastActivity(s),digital=hasDigital(s);
    return (!group||s.group_code===group)
      &&(!q||[s.display_name,s.internal_key].some(x=>String(x||'').toLowerCase().includes(q)))
      &&(!track||s.studio?.track_slug===track||s.diagnostic?.track_slug===track)
      &&(!state||(state==='today'&&isToday(last))||(state==='registered'&&digital)||(state==='missing'&&!digital));
  });
}
function courseCell(s){const c=s.course;if(!c)return'<span class="pill none">No course record</span>';const grade=c.final_grade??c.projected_grade;const pct=Math.min(100,Number(c.completed_count||0)/16*100);return '<span class="cell-main">'+esc((c.language||'').toUpperCase())+' · '+esc(c.completed_count||0)+'/16</span><span class="cell-sub">'+esc(c.team_label||'')+' · grade '+esc(fmt(grade))+'</span><div class="progress-mini"><i style="width:'+pct+'%"></i></div>'}
function oopCell(s){const n=(s.oop_uml||[]).length;if(!n)return'<span class="pill none">0 sessions</span>';return'<span class="pill done">'+n+' recorded</span><span class="cell-sub">Common Core evidence</span>'}
function studioCell(s){const x=s.studio;if(!x)return'<span class="pill none">No profile</span>';return'<span class="cell-main">'+esc(x.track_slug||x.first_choice||'Track')+'</span><span class="cell-sub">Sprint '+esc(x.sprint_current||1)+' · '+esc(x.progress_percent||0)+'% · '+esc(x.role||'primary')+'</span>'}
function diagCell(s){const d=s.diagnostic;if(!d)return'<span class="pill none">Not taken</span>';return'<span class="pill '+(d.status==='completed'?'done':'active')+'">'+esc(d.status)+'</span><span class="cell-sub">'+esc(fmt(d.knowledge_percent,0))+'% · '+esc(d.level||'—')+'</span>'}
function labsCell(s){const a=s.oop_labs||[];if(!a.length)return'<span class="pill none">0</span>';const done=a.filter(x=>x.status==='submitted').length;return'<span class="pill blue">'+a.length+' lab'+(a.length===1?'':'s')+'</span><span class="cell-sub">'+done+' submitted</span>'}
function renderMetrics(){
  const all=snapshot?.students||[],digital=all.filter(hasDigital).length,today=all.filter(s=>isToday(lastActivity(s))).length;
  const vals=[
    ['Official roster',snapshot?.roster_count||all.length],
    ['Digital record',digital],
    ['Activity today',today],
    ['T3 course',all.filter(s=>s.course).length],
    ['OOP + UML',all.filter(s=>(s.oop_uml||[]).length).length],
    ['Studio',all.filter(s=>s.studio).length],
    ['Diagnostic',all.filter(s=>s.diagnostic).length],
    ['No digital record',all.length-digital]
  ];
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
function render(){
  if(!snapshot)return;
  renderMetrics();renderQuality();
  const rows=filteredStudents();$('shownCount').textContent=rows.length;
  $('studentBody').innerHTML=rows.map(s=>{
    const last=lastActivity(s),digital=hasDigital(s),today=isToday(last);
    return '<tr>'+
      '<td><strong>'+esc(s.group_code)+'</strong></td>'+
      '<td>'+esc(s.source_position)+'</td>'+
      '<td><span class="student-name">'+esc(s.display_name)+'</span><span class="student-key">'+esc(s.internal_key)+(s.institutional_email?' · '+esc(s.institutional_email):'')+'</span></td>'+
      '<td><span class="pill verified">✓ Roster verified</span>'+(s.institutional_email?'<span class="cell-sub">Institutional email linked</span>':'<span class="cell-sub">No email link yet</span>')+'</td>'+
      '<td>'+courseCell(s)+'</td>'+
      '<td>'+oopCell(s)+'</td>'+
      '<td>'+studioCell(s)+'</td>'+
      '<td>'+diagCell(s)+'</td>'+
      '<td>'+labsCell(s)+'</td>'+
      '<td class="time">'+esc(fmtTime(last))+'</td>'+
      '<td><span class="pill '+(today?'today':digital?'partial':'none')+'">'+(today?'Today':digital?'Recorded':'No activity')+'</span></td>'+
      '<td><button class="inspect" data-student="'+esc(s.student_registry_id)+'">Inspect</button></td>'+
    '</tr>';
  }).join('')||'<tr><td colspan="12">No students match this filter.</td></tr>';
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
  const oop=s.oop_uml||[];$('detailOop').innerHTML=oop.length?'<div class="detail-list">'+oop.map(x=>'<div class="detail-row"><strong>'+esc(x.session_key)+'</strong><span>'+esc(x.status)+' · '+esc(fmtTime(x.completed_at||x.updated_at))+'</span></div>').join('')+'</div>':detailEmpty('No Common Core OOP/UML session recorded.');
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
['groupFilter','stateFilter','trackFilter'].forEach(id=>$(id).addEventListener('change',render));
$('searchInput').addEventListener('input',render);
$('closeDialog').addEventListener('click',()=>$('studentDialog').close());
$('toggleLegacy').addEventListener('click',()=>{const box=$('legacyContent'),hidden=box.classList.toggle('hidden');$('toggleLegacy').textContent=hidden?'Mostrar detalle':'Ocultar detalle'});
document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden&&token)load(true);else schedule()});
window.addEventListener('online',()=>{if(token)load(true)});
(async()=>{
  if(!sb){$('loginStatus').textContent='Supabase client unavailable.';return}
  if(token){$('loginPanel').classList.add('hidden');$('dashboardPanel').classList.remove('hidden');await load(true)}
})();
