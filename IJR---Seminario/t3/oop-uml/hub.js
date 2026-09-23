import {CourseStore} from '../js/course-store.js';

const cfg=window.IJR_SEMINAR_T3_CONFIG;
const data=window.IJR_OOP_UML_DATA;
const store=new CourseStore(cfg);
const $=id=>document.getElementById(id);
let attempt=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function completeMode(mode){return ['solved','revealed','skipped'].includes(mode);}
function topicDone(topic){return !!attempt&&topic.modules.every(m=>completeMode(attempt.records?.[m]?.mode));}
function topicStarted(topic){return !!attempt&&topic.modules.some(m=>attempt.records?.[m]);}
function language(){return attempt?.language||$('language')?.value||'python';}
function status(topic){if(topicDone(topic))return {label:'Completed',cls:'done'};if(topicStarted(topic))return {label:'In progress',cls:''};return {label:'Available',cls:''};}
function updateRegistrationFields(){
  const team=$('registrationMode').value==='team';
  $('teamSizeWrap').classList.toggle('hidden',!team);
  const size=team?Number($('teamSize').value):1;
  $('member2Wrap').classList.toggle('hidden',size<2);$('member3Wrap').classList.toggle('hidden',size<3);
  $('memberName2').required=size>=2;$('memberName3').required=size>=3;
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
  $('sessionBadge').textContent=`${attempt.group} · ${attempt.label}`;
  $('identitySummary').textContent=`${attempt.group} · ${attempt.label} · ${lang==='python'?'Python':'Java'} · ${attempt.backend==='supabase'?'Supabase synchronized':'local recovery mode'}`;
  $('languageLabel').textContent=lang==='python'?'Python':'Java';
  $('globalPercent').textContent=`${pct}%`;$('globalProgressBar').style.width=`${pct}%`;$('globalProgressCopy').textContent=`${done} of ${data.topics.length} sessions evidenced`;
  $('topicGrid').innerHTML=data.topics.map(t=>{
    const st=status(t);
    const moduleText=t.modules.map(x=>x.toUpperCase()).join(' + ');
    return `<article class="topic-card">
      <div class="topic-top"><span class="topic-index">SESSION ${String(t.n).padStart(2,'0')}</span><span class="topic-status ${st.cls}">${st.label}</span></div>
      <div><h3>${esc(t.title)}</h3><p>${esc(t.lead)}</p></div>
      <div class="topic-meta"><span>UML + OOP</span><span>${moduleText}</span><span>${lang==='python'?'Python':'Java'}</span></div>
      <div class="topic-actions"><a class="button button-light" href="theory.html?topic=${encodeURIComponent(t.slug)}&lang=${lang}">Theory</a><a class="button button-dark" href="workshop.html?topic=${encodeURIComponent(t.slug)}&lang=${lang}">Workshop</a></div>
    </article>`;
  }).join('');
}
async function submitRegistration(ev){
  ev.preventDefault();
  const mode=$('registrationMode').value;
  const size=mode==='team'?Number($('teamSize').value):1;
  const names=[$('memberName1').value,$('memberName2').value,$('memberName3').value].slice(0,size).map(v=>v.trim()).filter(Boolean);
  $('registrationStatus').className='inline-status';$('registrationStatus').textContent='Registering classroom session…';$('registerButton').disabled=true;
  try{
    attempt=await store.start({language:$('language').value,group:$('groupCode').value,names});
    $('registrationStatus').classList.add('ok');$('registrationStatus').textContent='Registration ready.';render();
  }catch(err){$('registrationStatus').classList.add('error');$('registrationStatus').textContent=err.message||'Registration failed.';}
  finally{$('registerButton').disabled=false;}
}

$('registrationMode').addEventListener('change',updateRegistrationFields);$('teamSize').addEventListener('change',updateRegistrationFields);$('registrationForm').addEventListener('submit',submitRegistration);
$('switchButton').addEventListener('click',()=>{if(confirm('Switch registration on this computer? Local active-session data will be cleared; Supabase records already saved are not deleted.')){store.reset();attempt=null;render();}});

updateRegistrationFields();
store.restore().then(a=>{attempt=a;render();}).catch(()=>render());
