(() => {
  'use strict';

  const cfg=window.IJR_OOP_COLAB_CONFIG;
  const $=id=>document.getElementById(id);
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const SNAPSHOT_KEY=`${cfg.teacherSessionKey}-snapshot-v1`;
  const POLL_VISIBLE_MS=3000,POLL_HIDDEN_MS=12000,MAX_BACKOFF_MS=30000;
  let token='',snapshot=null,timer=null,loading=false,failures=0,lastSuccessAt=0,selectedAttemptId=null,pendingFactorId='',pendingChallengeId='';

  const RPC_OPERATION={
    teacher_seminar_oop_colab_dashboard_v1:'seminar_oop_colab_dashboard',
    teacher_seminar_oop_colab_detail_v1:'seminar_oop_colab_detail',
    teacher_seminar_oop_colab_delete_v1:'seminar_oop_colab_delete'
  };
  async function rpc(name,args={}){
    const operation=RPC_OPERATION[name];if(!operation)throw new Error('Teacher operation not allowed');
    const {data,error}=await sb.functions.invoke('teacher-auth-gateway',{body:{operation,args}});
    if(error)throw new Error(error.message||'Backend error');if(data?.error)throw new Error(data.error);return data?.data;
  }
  async function beginMfa(){
    const {data:aal,error:aalError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError)throw aalError;
    if(aal?.currentLevel==='aal2'){const {data:{session}}=await sb.auth.getSession();token=session?.access_token||'';if(!token)throw new Error('Session unavailable');$('mfaPanel').classList.add('hidden');$('loginStatus').textContent='';restoreCached();await load(true);return}
    const {data:factors,error:factorsError}=await sb.auth.mfa.listFactors();if(factorsError)throw factorsError;
    let factor=(factors?.totp||[]).find(item=>item.status==='verified');
    if(!factor){const {data:enrolled,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'IJR teacher panel'});if(error)throw error;factor=enrolled;$('mfaQr').src=enrolled.totp.qr_code;$('mfaQr').classList.remove('hidden');$('mfaHelp').textContent='Scan the QR code, then enter the six-digit code.'}
    else{$('mfaQr').classList.add('hidden');$('mfaHelp').textContent='Enter the six-digit code from your authenticator app.'}
    pendingFactorId=factor.id;const {data:challenge,error}=await sb.auth.mfa.challenge({factorId:pendingFactorId});if(error)throw error;pendingChallengeId=challenge.id;$('mfaPanel').classList.remove('hidden');$('mfaCode').focus();
  }
  async function bootstrapAuth(){const {data:{session}}=await sb.auth.getSession();if(!session)return;try{await beginMfa()}catch(err){$('loginStatus').textContent=`Access pending: ${err.message}`}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function fmtGrade(v){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(2)}
  function fmtTime(v,full=false){if(!v)return'—';try{return new Date(v).toLocaleString('es-CO',full?{dateStyle:'short',timeStyle:'medium'}:{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch{return'—'}}
  function participants(s){return Array.isArray(s?.participants)?s.participants:[]}
  function visibleGrade(s){return s?.status==='submitted'?s.grade:(s?.projected_grade??s?.grade)}
  function isAuthError(err){return /invalid|expired|teacher session/i.test(String(err?.message||err))}
  function setLive(mode,text){const el=$('liveStatus');el.className=`live-status ${mode}`;el.textContent=text}
  function schedule(ms){clearTimeout(timer);if(token)timer=setTimeout(()=>load(),ms)}
  function cacheSnapshot(){try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snapshot))}catch{}}
  function restoreCached(){try{const raw=sessionStorage.getItem(SNAPSHOT_KEY);if(!raw)return false;snapshot=JSON.parse(raw);if(!snapshot)return false;render();setLive('stale','Saved view');return true}catch{return false}}

  function searchText(s){return [s.group_code,s.variant_pack,...participants(s).flatMap(p=>[p.display_name,p.institutional_email,p.email_normalized])].filter(Boolean).join(' ').toLowerCase()}
  function filteredSessions(){const group=$('groupFilter').value,q=$('searchInput').value.trim().toLowerCase(),activeOnly=$('activeOnly').checked;return Array.from(snapshot?.sessions||[]).filter(s=>(!group||s.group_code===group)&&(!activeOnly||s.status==='active')&&(!q||searchText(s).includes(q)))}

  function studentCell(s){const ps=participants(s);if(!ps.length)return'<span class="muted">No participant data</span>';return `<div class="students">${ps.map(p=>{const email=p.institutional_email||p.email_normalized||'',name=p.display_name||email||'Student';return `<div><strong>${esc(name)}</strong>${email&&String(name).toLowerCase()!==String(email).toLowerCase()?`<span>${esc(email)}</span>`:''}</div>`}).join('')}</div>`}
  function latestCell(s){const key=s.latest_checkpoint_key||'—',answer=s.latest_answer??'—',correct=s.latest_answer_correct,cls=correct===true?'answer-ok':correct===false?'answer-bad':'',mark=correct===true?'✓':correct===false?'✗':'·';return `<div class="latest ${cls}"><strong>${esc(key)}</strong><code title="${esc(answer)}">${esc(answer)}</code><span>${mark}</span></div>`}
  function supportText(s){return `H ${Number(s.help_tokens_used||0)} · E ${Number(s.wrong_attempts||0)} · R ${Number(s.revealed_count||0)} · S ${Number(s.skipped_count||0)}`}

  function render(){
    if(!snapshot)return;
    const rows=filteredSessions(),active=rows.filter(s=>s.status==='active').length,students=rows.reduce((n,s)=>n+Math.max(1,Number(s.team_size||participants(s).length||1)),0),grades=rows.map(visibleGrade).filter(v=>Number.isFinite(Number(v))).map(Number),avg=grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null,helps=rows.reduce((n,s)=>n+Number(s.help_tokens_used||0),0),errors=rows.reduce((n,s)=>n+Number(s.wrong_attempts||0),0);
    $('metrics').innerHTML=[['Registrations',rows.length],['Active',active],['Students',students],['Avg. grade',avg==null?'—':avg.toFixed(2)],['Helps',helps],['Validated errors',errors]].map(([label,value])=>`<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
    $('rowCount').textContent=`${rows.length} shown · 36-pack bank`;
    $('sessionBody').innerHTML=rows.map(s=>{const completed=Number(s.completed_count||0),total=Number(s.checkpoint_count||12),pct=Math.max(0,Math.min(100,completed/Math.max(1,total)*100)),status=s.status==='submitted'?'submitted':'active';return `<tr>
      <td><strong>${esc(s.group_code||'—')}</strong></td>
      <td>${studentCell(s)}</td>
      <td><span class="pack">${String(s.variant_pack??'—').padStart(2,'0')}</span></td>
      <td><span class="badge ${status}">${status==='submitted'?'Completed':'Active'}</span></td>
      <td><div class="progress"><span>${completed}/${total}</span><i><b style="width:${pct}%"></b></i></div></td>
      <td class="grade">${fmtGrade(visibleGrade(s))}</td>
      <td>${latestCell(s)}</td>
      <td><strong>${esc(supportText(s))}</strong><div class="sub">exit ${Number(s.restriction_events||0)}</div></td>
      <td>${fmtTime(s.last_activity_at)}</td>
      <td><div class="row-actions"><button class="inspect" data-action="inspect" data-id="${esc(s.attempt_id)}">Inspect</button><button class="delete" data-action="delete" data-id="${esc(s.attempt_id)}">Delete</button></div></td>
    </tr>`}).join('')||'<tr><td colspan="10" class="empty">No OOP registrations match this filter.</td></tr>';
    $('updatedAt').textContent=`Updated ${new Date(snapshot.generated_at||Date.now()).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
    bindActions();
  }

  function bindActions(){document.querySelectorAll('[data-action][data-id]').forEach(btn=>btn.addEventListener('click',()=>btn.dataset.action==='delete'?deleteAttempt(btn.dataset.id):openDetail(btn.dataset.id)))}

  function renderDetail(data){
    const a=data?.attempt||{},ps=Array.isArray(data?.participants)?data.participants:[],rs=Array.isArray(data?.responses)?data.responses:[],events=Array.isArray(data?.events)?data.events:[];
    $('dialogTitle').textContent=`${a.group_code||'—'} · Pack ${String(data?.variant_pack??'—').padStart(2,'0')}`;
    $('detailSummary').innerHTML=[['Students',ps.map(p=>p.institutional_email||p.display_name).filter(Boolean).join(' · ')||'—'],['Status',a.status||'—'],['Grade',fmtGrade(a.grade)],['Started',fmtTime(a.started_at,true)],['Last activity',fmtTime(a.last_activity_at,true)]].map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('detailResponses').innerHTML=rs.map(r=>{const mode=r.mode||'code',cls=r.correct?'ok':r.completion_mode==='revealed'?'revealed':r.completion_mode==='skipped'?'skipped':'';return `<article class="response ${cls}">
      <div class="response-head"><div><span class="stage-mode">${esc(mode.toUpperCase())}</span><h4>${esc(r.sequence)} · ${esc(r.title)}</h4></div><span class="badge">${esc(r.completion_mode||'pending')}</span></div>
      <p>${esc(r.prompt||'')}</p>
      <div class="pair"><span>Student answer</span><code>${esc(r.latest_answer??'—')}</code><span>Expected</span><code>${esc(r.expected_answer??'—')}</code><span>Variant</span><code>${esc(r.variant_key??'—')}</code></div>
      ${mode==='code'?`<details class="code-details"><summary>Starter / solution code</summary><div class="code-pair"><div><span>Starter</span><pre>${esc(String(r.starter_code||'').replace(/\\n/g,'\n'))}</pre></div><div><span>Solution</span><pre>${esc(String(r.solution_code||'').replace(/\\n/g,'\n'))}</pre></div></div></details>`:''}
      <small>tries ${Number(r.try_count||0)} · validated errors ${Number(r.wrong_attempts||0)} · helps ${Number(r.help_count||0)} · awarded ${Number(r.awarded_points||0).toFixed(2)}</small>
    </article>`}).join('')||'<div class="empty">No stage responses yet.</div>';
    $('detailEvents').innerHTML=events.slice(0,120).map(e=>`<div class="event"><strong>${esc(e.event_type)}</strong><span>${esc(fmtTime(e.created_at,true))}</span><code>${esc(JSON.stringify(e.metadata||{}))}</code></div>`).join('')||'<span class="muted">No events.</span>';
  }

  async function openDetail(id){selectedAttemptId=id;$('dialogStatus').textContent='Loading session evidence…';$('detailDialog').showModal();try{const data=await rpc(cfg.rpc.teacherDetail,{p_teacher_token:token,p_attempt_id:id});renderDetail(data);$('dialogStatus').textContent='Read-only evidence from the OOP backend.'}catch(err){$('dialogStatus').textContent=`Could not load: ${err.message}`}}
  async function deleteAttempt(id=selectedAttemptId){if(!id)return;const row=(snapshot?.sessions||[]).find(s=>s.attempt_id===id),label=row?participants(row).map(p=>p.institutional_email||p.display_name).filter(Boolean).join(' · '):id;if(!confirm(`Delete this OOP registration and all stage evidence?\n\n${label}\n\nUse this only for invalid or QA registrations.`))return;try{await rpc(cfg.rpc.teacherDelete,{p_teacher_token:token,p_attempt_id:id});if($('detailDialog').open)$('detailDialog').close();selectedAttemptId=null;await load(true)}catch(err){alert(`Could not delete: ${err.message}`)}}

  function csvCell(v){const text=String(v??'');return `"${text.replaceAll('"','""')}"`}
  function exportCsv(){const rows=filteredSessions(),head=['group','students','pack','status','progress','grade','helps','validated_errors','reveals','skips','last_activity'];const lines=[head.map(csvCell).join(',')];for(const s of rows){lines.push([s.group_code,participants(s).map(p=>p.institutional_email||p.display_name).join(' | '),s.variant_pack,s.status,`${s.completed_count||0}/${s.checkpoint_count||12}`,fmtGrade(visibleGrade(s)),s.help_tokens_used||0,s.wrong_attempts||0,s.revealed_count||0,s.skipped_count||0,s.last_activity_at||''].map(csvCell).join(','))}const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`seminar11_oop_colab_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}

  async function load(force=false){
    if(!token||loading)return;if(navigator.onLine===false&&!force){setLive('offline','Offline · last data');schedule(5000);return}
    loading=true;if(!snapshot)setLive('syncing','Syncing…');
    try{snapshot=await rpc(cfg.rpc.teacherDashboard,{p_teacher_token:token});lastSuccessAt=Date.now();failures=0;cacheSnapshot();$('loginPanel').classList.add('hidden');$('dashboardPanel').classList.remove('hidden');render();setLive('live','LIVE · 3 s');schedule(document.hidden?POLL_HIDDEN_MS:POLL_VISIBLE_MS)}
    catch(err){if(isAuthError(err)){token='';snapshot=null;clearTimeout(timer);sessionStorage.removeItem(cfg.teacherSessionKey);sessionStorage.removeItem(SNAPSHOT_KEY);$('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');$('loginStatus').textContent=`Teacher session unavailable: ${err.message}`}else{failures+=1;const age=lastSuccessAt?Math.round((Date.now()-lastSuccessAt)/1000):null;setLive(navigator.onLine===false?'offline':'stale',age==null?'Retrying…':`Stale · ${age}s`);schedule(Math.min(MAX_BACKOFF_MS,POLL_VISIBLE_MS*Math.pow(2,Math.min(failures-1,4))))}}
    finally{loading=false}
  }

  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const email=$('teacherEmail').value.trim().toLowerCase();if(!email.endsWith('@ijr.edu.co')){$('loginStatus').textContent='Use the institutional teacher @ijr.edu.co account.';return}$('loginStatus').textContent='Checking institutional account…';try{const {error}=await sb.auth.signInWithPassword({email,password:$('teacherPassword').value});if(error)throw error;$('teacherPassword').value='';await beginMfa()}catch(err){$('loginStatus').textContent=`Could not sign in: ${err.message}`}});
  $('mfaButton').addEventListener('click',async()=>{const code=$('mfaCode').value.trim();if(!pendingFactorId||!pendingChallengeId||!/^[0-9]{6}$/.test(code)){$('loginStatus').textContent='Enter a valid six-digit MFA code.';return}try{const {error}=await sb.auth.mfa.verify({factorId:pendingFactorId,challengeId:pendingChallengeId,code});if(error)throw error;$('mfaCode').value='';await beginMfa()}catch(err){$('loginStatus').textContent=`MFA not verified: ${err.message}`}});
  $('groupFilter').addEventListener('change',render);$('activeOnly').addEventListener('change',render);$('searchInput').addEventListener('input',render);$('refreshButton').addEventListener('click',()=>load(true));$('exportButton').addEventListener('click',exportCsv);$('closeDialogButton').addEventListener('click',()=>$('detailDialog').close());
  $('logoutButton').addEventListener('click',async()=>{await sb.auth.signOut({scope:'local'});token='';snapshot=null;clearTimeout(timer);sessionStorage.removeItem(SNAPSHOT_KEY);$('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden')});
  document.addEventListener('visibilitychange',()=>{if(!token)return;document.hidden?schedule(POLL_HIDDEN_MS):load(true)});window.addEventListener('online',()=>{if(token)load(true)});window.addEventListener('offline',()=>{if(token)setLive('offline','Offline · last data')});
  bootstrapAuth();
})();
