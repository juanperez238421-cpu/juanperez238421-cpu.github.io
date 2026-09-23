import {CourseStore} from './course-store.js';

const cfg=window.IJR_SEMINAR_T3_CONFIG,$=id=>document.getElementById(id);
const store=new CourseStore(cfg);
const sb=globalThis.supabase?globalThis.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let token='',snapshot=null,timer=null,pendingFactorId='',pendingChallengeId='';

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(v){return v==null?'—':Number(v).toFixed(2)}
function fmtTime(v){if(!v)return'—';try{return new Date(v).toLocaleString('es-CO',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}catch{return'—'}}
async function rpc(name,args={}){
  if(!sb||name!==cfg.rpc.teacherDashboard)throw new Error('Operación docente no permitida');
  const {data,error}=await sb.functions.invoke('teacher-auth-gateway',{body:{operation:'seminar_course_dashboard',args}});
  if(error)throw new Error(error.message||'Backend gateway error');
  if(data?.error)throw new Error(data.error);
  return data?.data;
}
async function beginMfa(){
  const {data:aal,error:aalError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError)throw aalError;
  if(aal?.currentLevel==='aal2'){
    const {data:{session}}=await sb.auth.getSession();token=session?.access_token||'';if(!token)throw new Error('Sesión no disponible');
    $('mfaPanel').classList.add('hidden');$('loginStatus').textContent='';await load();clearInterval(timer);timer=setInterval(load,5000);return;
  }
  const {data:factors,error:factorsError}=await sb.auth.mfa.listFactors();if(factorsError)throw factorsError;
  let factor=(factors?.totp||[]).find(item=>item.status==='verified');
  if(!factor){const {data:enrolled,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Panel docente IJR'});if(error)throw error;factor=enrolled;$('mfaQr').src=enrolled.totp.qr_code;$('mfaQr').classList.remove('hidden');$('mfaHelp').textContent='Escanea el QR y escribe el código de seis dígitos.'}
  else{$('mfaQr').classList.add('hidden');$('mfaHelp').textContent='Escribe el código de seis dígitos de tu aplicación autenticadora.'}
  pendingFactorId=factor.id;const {data:challenge,error}=await sb.auth.mfa.challenge({factorId:pendingFactorId});if(error)throw error;pendingChallengeId=challenge.id;$('mfaPanel').classList.remove('hidden');$('mfaCode').focus();
}
async function bootstrapAuth(){const {data:{session}}=await sb.auth.getSession();if(!session)return;try{await beginMfa()}catch(err){$('loginStatus').textContent=`Acceso pendiente: ${err.message}`}}
function renderLocal(){
  let local=null;try{local=JSON.parse(localStorage.getItem(cfg.localKey)||'null')}catch{}
  if(!local){$('localAttempt').textContent='Sin sesión local en este navegador.';return;}
  const records=local.records||{},completed=Object.values(records).filter(r=>['solved','revealed','skipped'].includes(r.mode)).length;
  const helps=Object.values(records).reduce((s,r)=>s+Number(r.helps||0),0),wrongs=Object.values(records).reduce((s,r)=>s+Number(r.wrongs||0),0);
  $('localAttempt').innerHTML=`<strong>${esc(local.group||'')} · ${esc(local.label||'Equipo')}</strong><br>${esc((local.language||'').toUpperCase())} · ${completed}/16 módulos · ayudas ${helps} · errores ${wrongs}<br><span class="sub">Backend guardado en la sesión: ${esc(local.backend||'local')}</span>`;
}
function render(){
  const attempts=snapshot?.attempts||[];
  const group=$('groupFilter').value,lang=$('languageFilter').value,q=$('searchInput').value.trim().toLowerCase();
  const filtered=attempts.filter(a=>(!group||a.group_code===group)&&(!lang||a.language===lang)&&(!q||String(a.team_label||'').toLowerCase().includes(q)));
  const submitted=attempts.filter(a=>a.status==='submitted').length,active=attempts.filter(a=>a.status==='active').length;
  const avg=attempts.length?attempts.reduce((s,a)=>s+Number(a.display_grade||a.projected_grade||a.final_grade||1),0)/attempts.length:null;
  const totals=attempts.reduce((x,a)=>{x.h+=Number(a.helps||0);x.w+=Number(a.wrongs||0);x.r+=Number(a.revealed||0);x.s+=Number(a.skipped||0);return x},{h:0,w:0,r:0,s:0});
  $('metrics').innerHTML=[
    ['Equipos',attempts.length],['Activos',active],['Finalizados',submitted],['Promedio',avg==null?'—':avg.toFixed(2)],
    ['Ayudas',totals.h],['Errores validados',totals.w],['Soluciones reveladas',totals.r],['Módulos omitidos',totals.s]
  ].map(([k,v])=>`<div class="metric"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  $('courseBody').innerHTML=filtered.map(a=>`<tr>
    <td>${esc(a.group_code)}</td>
    <td><div class="team-names">${esc(a.team_label)}</div><div class="sub">${esc(a.team_size)} integrante(s)</div></td>
    <td><span class="route-pill ${esc(a.language)}">${esc(a.language==='python'?'Python':'Java')}</span></td>
    <td><span class="status-pill ${esc(a.status)}">${esc(a.status==='submitted'?'Finalizado':'Activo')}</span></td>
    <td><strong>${esc(a.completed_count)}/16</strong><div class="sub">${esc(a.solved_count||0)} resueltos</div></td>
    <td class="grade">${fmt(a.display_grade??a.projected_grade??a.final_grade)}</td>
    <td>${esc(a.helps||0)}</td><td>${esc(a.wrongs||0)}</td><td>${esc(a.revealed||0)}</td><td>${esc(a.skipped||0)}</td>
    <td>${esc(a.restriction_events||0)}</td><td>${fmtTime(a.last_activity_at)}</td>
  </tr>`).join('')||'<tr><td colspan="12">Sin resultados para este filtro.</td></tr>';
  $('updatedAt').textContent=`Actualizado ${new Date(snapshot?.generated_at||Date.now()).toLocaleString('es-CO')}`;
}
async function load(){
  if(!token)return;
  try{
    snapshot=await rpc(cfg.rpc.teacherDashboard,{p_teacher_token:token});
    $('loginPanel').classList.add('hidden');$('dashboardPanel').classList.remove('hidden');
    $('backendState').textContent='Supabase · en vivo';render();
  }catch(err){
    clearInterval(timer);token='';sessionStorage.removeItem(cfg.teacherSessionKey);
    $('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');
    $('loginStatus').textContent=`Backend docente no disponible: ${err.message}`;
  }
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const email=$('teacherEmail').value.trim().toLowerCase();
  if(!email.endsWith('@ijr.edu.co')){$('loginStatus').textContent='Usa la cuenta institucional docente @ijr.edu.co.';return}
  $('loginStatus').textContent='Verificando cuenta institucional…';
  try{const {error}=await sb.auth.signInWithPassword({email,password:$('teacherPassword').value});if(error)throw error;$('teacherPassword').value='';await beginMfa()}catch(err){$('loginStatus').textContent=`No fue posible ingresar: ${err.message}`}
});
$('mfaButton').addEventListener('click',async()=>{
  const code=$('mfaCode').value.trim();if(!pendingFactorId||!pendingChallengeId||!/^[0-9]{6}$/.test(code)){$('loginStatus').textContent='Escribe un código MFA válido.';return}
  try{const {error}=await sb.auth.mfa.verify({factorId:pendingFactorId,challengeId:pendingChallengeId,code});if(error)throw error;$('mfaCode').value='';await beginMfa()}catch(err){$('loginStatus').textContent=`MFA no verificado: ${err.message}`}
});
$('logoutButton').addEventListener('click',async()=>{await sb.auth.signOut({scope:'local'});token='';clearInterval(timer);$('dashboardPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');});
$('refreshButton').addEventListener('click',load);$('groupFilter').addEventListener('change',render);$('languageFilter').addEventListener('change',render);$('searchInput').addEventListener('input',render);
renderLocal();bootstrapAuth();
