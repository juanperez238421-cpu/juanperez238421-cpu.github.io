import {CourseStore} from '../js/course-store.js';

const cfg=window.IJR_SEMINAR_T3_CONFIG;
const data=window.IJR_OOP_UML_DATA;
const store=new CourseStore(cfg);
const $=id=>document.getElementById(id);
const ACCESS_KEY='ijr-seminario-email-access-v2';
let attempt=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function completeMode(mode){return ['solved','revealed','skipped'].includes(mode);}
function topicDone(topic){return !!attempt&&topic.modules.every(m=>completeMode(attempt.records?.[m]?.mode));}
function topicStarted(topic){return !!attempt&&topic.modules.some(m=>attempt.records?.[m]);}
function language(){return attempt?.language||'python';}
function status(topic){if(topicDone(topic))return {label:'Completed',cls:'done'};if(topicStarted(topic))return {label:'In progress',cls:''};return {label:'Available',cls:''};}
function normalizeEmail(v){return String(v||'').trim().toLowerCase();}
function institutionalEmail(v){return /^[^\s@]+@ijr\.edu\.co$/i.test(normalizeEmail(v));}

function ensureEmailOnlyRegistration(){
  const panel=$('registrationPanel');
  if(!panel)return;
  const legacy=!!($('registrationMode')||$('groupCode')||$('memberName1')||$('language'));
  if(!legacy&&$('institutionalEmail')&&$('registrationForm'))return;

  panel.innerHTML=`
    <div class="registration-card">
      <p class="eyebrow">SOFTWARE ENGINEERING STUDIO · COMMON CORE</p>
      <h1>Sign in with your institutional email.</h1>
      <p class="registration-lead">Enter only your <strong>@ijr.edu.co institutional email</strong>. Supabase resolves your official name and Grade 11 group automatically. No password, student name, group, language, registration mode or team field is requested.</p>
      <div class="sequence-rule">
        <strong>10-session progression</strong>
        <span>Objects → State → Constructors → Encapsulation → Relationships → Inheritance → Polymorphism → Architecture → Refactoring → Defense</span>
        <small>Python opens automatically for this Common Core route.</small>
      </div>
      <form id="registrationForm" class="hub-registration-form" novalidate>
        <div class="registration-grid">
          <label>Institutional email <small>· Correo institucional</small>
            <input id="institutionalEmail" name="institutionalEmail" type="email" inputmode="email" autocomplete="email"
                   placeholder="nombre.apellido@ijr.edu.co" required>
          </label>
        </div>
        <div class="sequence-rule">
          <strong>Automatic identity resolution</strong>
          <span>Your email is matched server-side against the official Grade 11 Seminar roster.</span>
          <small>No password, manual name, group or team selection is used.</small>
        </div>
        <div class="registration-actions">
          <div><strong>Common Core rule</strong><span>predict → model → implement → test → explain.</span></div>
          <button id="registerButton" class="button button-dark" type="submit">Enter OOP + UML Hub</button>
        </div>
        <p id="registrationStatus" class="inline-status" role="status" aria-live="polite"></p>
      </form>
    </div>`;
}

function registrationMessage(message,type=''){
  const el=$('registrationStatus');
  if(!el)return;
  el.textContent=message;
  el.className=type?('inline-status '+type):'inline-status';
}
function friendlyError(err){
  const raw=String(err?.message||'');
  if(raw.includes('institutional_email_not_registered'))return 'This institutional email is not linked to the official Grade 11 Seminar roster.';
  if(raw.includes('institutional_email_required'))return 'Use only your institutional @ijr.edu.co email.';
  if(raw.includes('invalid_student_group'))return 'Your institutional email was found, but the Grade 11 group could not be resolved.';
  return raw||'The institutional session could not be opened.';
}
function saveAccessEmail(email){
  localStorage.setItem(ACCESS_KEY,JSON.stringify({email:normalizeEmail(email),validatedAt:Date.now()}));
}
function savedAccessEmail(){
  try{
    const saved=JSON.parse(localStorage.getItem(ACCESS_KEY)||'null');
    return saved&&institutionalEmail(saved.email)?normalizeEmail(saved.email):'';
  }catch{return '';}
}

function render(){
  const registered=!!attempt;
  $('registrationPanel').classList.toggle('hidden',registered);
  $('hubPanel').classList.toggle('hidden',!registered);
  $('sessionBadge').classList.toggle('hidden',!registered);
  $('switchButton').classList.toggle('hidden',!registered);
  if(!registered)return;

  const lang=language();
  const done=data.topics.filter(topicDone).length;
  const pct=Math.round(done/data.topics.length*100);
  $('sessionBadge').textContent=attempt.group+' · '+attempt.label;
  $('identitySummary').textContent=attempt.group+' · '+attempt.label+' · '+(lang==='python'?'Python':'Java')+' · '+(attempt.backend==='supabase'?'Supabase synchronized':'local recovery mode');
  $('languageLabel').textContent=lang==='python'?'Python':'Java';
  $('globalPercent').textContent=pct+'%';
  $('globalProgressBar').style.width=pct+'%';
  $('globalProgressCopy').textContent=done+' of '+data.topics.length+' sessions evidenced';
  $('topicGrid').innerHTML=data.topics.map(t=>{
    const st=status(t);
    const moduleText=t.modules.map(x=>x.toUpperCase()).join(' + ');
    return '<article class="topic-card">'+
      '<div class="topic-top"><span class="topic-index">SESSION '+String(t.n).padStart(2,'0')+'</span><span class="topic-status '+st.cls+'">'+st.label+'</span></div>'+
      '<div><h3>'+esc(t.title)+'</h3><p>'+esc(t.lead)+'</p></div>'+
      '<div class="topic-meta"><span>UML + OOP</span><span>'+moduleText+'</span><span>'+(lang==='python'?'Python':'Java')+'</span></div>'+
      '<div class="topic-actions"><a class="button button-light" href="theory.html?topic='+encodeURIComponent(t.slug)+'&lang='+lang+'">Theory</a><a class="button button-dark" href="workshop.html?topic='+encodeURIComponent(t.slug)+'&lang='+lang+'">Workshop</a></div>'+
      '</article>';
  }).join('');
}

async function submitRegistration(ev){
  ev.preventDefault();
  const email=normalizeEmail($('institutionalEmail')?.value);
  registrationMessage('');

  if(!institutionalEmail(email)){
    registrationMessage('Use only your institutional @ijr.edu.co email.','error');
    $('institutionalEmail')?.focus();
    return;
  }

  const button=$('registerButton');
  if(button)button.disabled=true;
  registrationMessage('Validating your institutional email…');

  try{
    attempt=await store.startWithEmail({email,language:'python'});
    attempt={...attempt,email};
    saveAccessEmail(email);
    render();
  }catch(err){
    attempt=null;
    render();
    registrationMessage(friendlyError(err),'error');
    $('institutionalEmail')?.focus();
  }finally{
    if(button)button.disabled=false;
  }
}

function bindRegistration(){
  ensureEmailOnlyRegistration();
  const form=$('registrationForm');
  if(!form)return;
  form.addEventListener('submit',submitRegistration);
  const remembered=savedAccessEmail();
  if(remembered&&$('institutionalEmail'))$('institutionalEmail').value=remembered;
}

function changeEmail(){
  store.reset();
  localStorage.removeItem(ACCESS_KEY);
  attempt=null;
  ensureEmailOnlyRegistration();
  if($('institutionalEmail'))$('institutionalEmail').value='';
  render();
  $('institutionalEmail')?.focus();
}

$('switchButton').addEventListener('click',()=>{
  if(confirm('Switch institutional email on this computer? Saved Supabase records are not deleted.'))changeEmail();
});

bindRegistration();
store.restore().then(a=>{
  if(a?.email&&institutionalEmail(a.email)){
    attempt=a;
    saveAccessEmail(a.email);
  }else{
    if(a)store.reset();
    attempt=null;
  }
  render();
}).catch(()=>{
  attempt=null;
  render();
});
