import {CourseStore} from '../js/course-store.js';

const PYODIDE_INDEX='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
const DRAFT_KEY='ijr-oop-uml-state-behavior-colab-v1';
const STAGES=['predict','model','implement','test','modify','explain'];
const NEXT_STAGE={predict:'model',model:'implement',implement:'test',test:'modify',modify:'explain',explain:null};

const IMPLEMENT_STARTER=`class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = float(balance)

    def deposit(self, amount):
        # State change: add amount to the current balance.
        WRITE_HERE

    def withdraw(self, amount):
        # First version: subtract a valid amount.
        WRITE_HERE

account = BankAccount("Ana", 100)
print("before", account.balance)
account.deposit(50)
print("after_deposit", account.balance)
account.withdraw(40)
print("after_withdraw", account.balance)
`;

const TEST_STARTER=`# The BankAccount class from the previous cell remains in the runtime.
first = BankAccount("Ana", 100)
second = BankAccount("Luis", 25)

first.deposit(50)
first.withdraw(40)

print("first", first.balance)
print("second", second.balance)
print("independent", first is not second)
`;

const MODIFY_STARTER=`class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = float(balance)

    def deposit(self, amount):
        if amount <= 0:
            return False
        self.balance += amount
        return True

    def withdraw(self, amount):
        if amount <= 0:
            return False

        # Business rule: reject an amount greater than the current balance.
        WRITE_HERE

        self.balance -= amount
        return True

account = BankAccount("Ana", 100)
account.deposit(50)
account.withdraw(40)
accepted = account.withdraw(200)

print("accepted", accepted)
print("balance", account.balance)
`;

const state={
  pyodide:null,
  runtimePromise:null,
  executionCount:0,
  runCount:0,
  successfulRunCount:0,
  completed:Object.fromEntries(STAGES.map(k=>[k,false])),
  lastOutput:{implement:'',test:'',modify:''},
  lastError:{implement:'',test:'',modify:''},
  lastSource:{implement:'',test:'',modify:''},
  attempt:null,
  store:null,
  recorded:false
};

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setFeedback(stage,message,kind=''){
  const el=$(stage+'Feedback');
  if(!el)return;
  el.textContent=message;
  el.className='stage-feedback'+(kind?' '+kind:'');
}

function setRuntime(mode,label){
  const button=$('connectRuntimeButton');
  if(!button)return;
  button.className='runtime-button '+mode;
  $('runtimeLabel').textContent=label;
}

function syncBadge(mode,text){
  const el=$('syncBadge');
  if(!el)return;
  el.className='sync-badge '+mode;
  el.textContent=text;
}

function markStage(stage,done,message=''){
  state.completed[stage]=done;
  const badge=document.querySelector('[data-stage-status="'+stage+'"]');
  if(badge){
    badge.textContent=done?'Validated':'Not validated';
    badge.classList.toggle('done',done);
  }
  if(message)setFeedback(stage,message,done?'ok':'bad');
  updateProgress();
}

function updateProgress(){
  const done=STAGES.filter(k=>state.completed[k]).length;
  const pct=Math.round(done/STAGES.length*100);
  $('masteryPercent').textContent=pct+'%';
  $('masteryBar').style.width=pct+'%';
  $('masteryCount').textContent=done+' / '+STAGES.length+' validated';
  $('heroStage').textContent=done+' / '+STAGES.length;
  document.querySelectorAll('#stageList [data-stage]').forEach(btn=>{
    const key=btn.dataset.stage;
    btn.classList.toggle('done',!!state.completed[key]);
  });
  const ready=done===STAGES.length && !!state.attempt?.id && !!state.attempt?.token && !state.recorded;
  $('recordEvidenceButton').disabled=!ready;
  if(done===STAGES.length && !state.attempt?.token){
    $('completionCopy').textContent='All six stages are locally validated. Reopen this workshop from an official Seminar registration to synchronize evidence with Supabase.';
  }
}

function scrollStage(stage){
  const target=$('stage-'+stage);
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('#stageList [data-stage]').forEach(btn=>btn.classList.toggle('active',btn.dataset.stage===stage));
}

function proceed(stage){
  const next=NEXT_STAGE[stage];
  if(next)setTimeout(()=>scrollStage(next),250);
}

async function ensureRuntime(){
  if(state.pyodide)return state.pyodide;
  if(state.runtimePromise)return state.runtimePromise;
  state.runtimePromise=(async()=>{
    try{
      setRuntime('loading','Loading Python…');
      if(typeof globalThis.loadPyodide!=='function')throw new Error('Pyodide did not load from the CDN.');
      state.pyodide=await globalThis.loadPyodide({indexURL:PYODIDE_INDEX});
      setRuntime('ready','Python ready');
      return state.pyodide;
    }catch(err){
      state.runtimePromise=null;
      setRuntime('error','Runtime error');
      throw err;
    }
  })();
  return state.runtimePromise;
}

function normalizeOutput(v){
  return String(v||'').replace(/\r/g,'').trim();
}

async function runPython(stage,source){
  const py=await ensureRuntime();
  const stdout=[],stderr=[];
  py.setStdout({batched:text=>stdout.push(text)});
  py.setStderr({batched:text=>stderr.push(text)});
  let result;
  try{
    result=await py.runPythonAsync(source);
    if(result!==undefined&&result!==null){
      const asText=String(result);
      if(asText!=='None')stdout.push(asText);
    }
  }catch(err){
    stderr.push(String(err?.message||err));
  }finally{
    if(result&&typeof result.destroy==='function')result.destroy();
  }

  state.executionCount+=1;
  state.runCount+=1;
  const executionId=stage+'Execution';
  if($(executionId))$(executionId).textContent='['+state.executionCount+']';

  const output=normalizeOutput(stdout.join('\n'));
  const error=normalizeOutput(stderr.join('\n'));
  state.lastOutput[stage]=output;
  state.lastError[stage]=error;
  state.lastSource[stage]=source;

  const panel=$(stage+'OutputPanel');
  const pre=$(stage+'Output');
  panel.classList.remove('hidden','error');
  if(error){
    pre.textContent='ERROR\n'+error;
    panel.classList.add('error');
    setFeedback(stage,'Python found an error. Fix the cell and run it again. Runtime errors do not count as evidence.','bad');
  }else{
    state.successfulRunCount+=1;
    pre.textContent=output||'(Cell completed without printed output.)';
    setFeedback(stage,'Python executed successfully. Inspect the output, then validate the stage.','ok');
  }
  return {output,error};
}

function currentSourceMatches(stage,editorId){
  return state.lastSource[stage] && state.lastSource[stage]===$(editorId).value;
}

function hasTrace(output,label,value){
  const pattern=new RegExp('(?:^|\\n)'+label+'\\s+'+String(value).replace('.','\\.')+'(?:\\.0)?(?:\\s|$)','i');
  return pattern.test(output);
}

function validatePrediction(){
  const deposit=Number($('predictDeposit').value);
  const withdraw=Number($('predictWithdraw').value);
  const rejected=Number($('predictRejected').value);
  if(deposit===150&&withdraw===110&&rejected===110){
    markStage('predict',true,'Correct. The final rejected operation must not mutate the balance.');
    proceed('predict');
  }else{
    markStage('predict',false,'Recalculate the trace: start at 100, then +50, then −40. A rejected withdrawal leaves state unchanged.');
  }
}

function validateModel(){
  const answers={
    classifyOwner:'attribute',
    classifyBalance:'attribute',
    classifyDeposit:'method',
    classifyWithdraw:'method',
    classifyPrivate:'private',
    classifyPublic:'public'
  };
  const classificationOk=Object.entries(answers).every(([id,value])=>$(id).value===value);
  const responsibility=$('modelResponsibility').value.trim();
  if(!classificationOk){
    markStage('model',false,'At least one UML classification is incorrect. Attributes store state; operations are methods; − is private and + is public.');
    return;
  }
  if(responsibility.length<25){
    markStage('model',false,'Write a complete responsibility statement of at least 25 characters.');
    return;
  }
  markStage('model',true,'UML model validated: 4/4 member classifications and 2/2 visibility checks.');
  proceed('model');
}

function implementationStructure(source){
  if(source.includes('WRITE_HERE'))return 'Replace both WRITE_HERE markers.';
  if(!/class\s+BankAccount\s*:/.test(source))return 'Keep the BankAccount class.';
  if(!/self\.owner\s*=\s*owner/.test(source)||!/self\.balance\s*=/.test(source))return 'Store owner and balance on self.';
  if(!/def\s+deposit\s*\(\s*self\s*,\s*amount\s*\)/.test(source))return 'Keep deposit(self, amount).';
  if(!/def\s+withdraw\s*\(\s*self\s*,\s*amount\s*\)/.test(source))return 'Keep withdraw(self, amount).';
  if(!/self\.balance\s*(?:\+=\s*amount|=\s*self\.balance\s*\+\s*amount)/.test(source))return 'deposit() must update self.balance using amount.';
  if(!/self\.balance\s*(?:-=\s*amount|=\s*self\.balance\s*-\s*amount)/.test(source))return 'withdraw() must update self.balance using amount.';
  return '';
}

function validateImplementation(){
  const source=$('implementEditor').value;
  const issue=implementationStructure(source);
  if(issue){markStage('implement',false,issue);return;}
  if(!currentSourceMatches('implement','implementEditor')||state.lastError.implement){
    markStage('implement',false,'Run the current implementation cell successfully before validating.');
    return;
  }
  const out=state.lastOutput.implement;
  if(!(hasTrace(out,'before',100)&&hasTrace(out,'after_deposit',150)&&hasTrace(out,'after_withdraw',110))){
    markStage('implement',false,'The output must show before 100, after_deposit 150, and after_withdraw 110.');
    return;
  }
  markStage('implement',true,'Implementation validated. The methods mutate the object state through self.balance.');
  proceed('implement');
}

function validateTest(){
  if(!state.completed.implement){
    markStage('test',false,'Validate the implementation first.');
    return;
  }
  if(!currentSourceMatches('test','testEditor')||state.lastError.test){
    markStage('test',false,'Run the current test cell successfully before validating.');
    return;
  }
  const out=state.lastOutput.test;
  const ok=hasTrace(out,'first',110)&&hasTrace(out,'second',25)&&/(?:^|\n)independent\s+True(?:\s|$)/.test(out);
  if(!ok){
    markStage('test',false,'Expected evidence: first 110, second 25, independent True. The two objects must keep independent state.');
    return;
  }
  markStage('test',true,'Test validated. Two BankAccount instances hold independent state.');
  proceed('test');
}

function modifyStructure(source){
  if(source.includes('WRITE_HERE'))return 'Replace the WRITE_HERE marker with the overdraft rule.';
  if(!/def\s+withdraw\s*\(\s*self\s*,\s*amount\s*\)/.test(source))return 'Keep withdraw(self, amount).';
  if(!/(?:amount\s*>\s*self\.balance|self\.balance\s*<\s*amount)/.test(source))return 'Compare the requested amount with self.balance.';
  if(!/return\s+False/.test(source))return 'Reject the invalid withdrawal by returning False.';
  if(!/self\.balance\s*(?:-=\s*amount|=\s*self\.balance\s*-\s*amount)/.test(source))return 'A valid withdrawal still needs to update self.balance.';
  return '';
}

function validateModify(){
  const source=$('modifyEditor').value;
  const issue=modifyStructure(source);
  if(issue){markStage('modify',false,issue);return;}
  if(!currentSourceMatches('modify','modifyEditor')||state.lastError.modify){
    markStage('modify',false,'Run the current modified class successfully before validating.');
    return;
  }
  const out=state.lastOutput.modify;
  const accepted=/(?:^|\n)accepted\s+False(?:\s|$)/.test(out);
  const balance=hasTrace(out,'balance',110);
  if(!(accepted&&balance)){
    markStage('modify',false,'The invalid withdrawal must print accepted False and leave balance at 110.');
    return;
  }
  markStage('modify',true,'Business rule validated. withdraw() rejects an overdraft without corrupting state.');
  proceed('modify');
}

function validateExplanation(){
  const answers=[$('explainState').value.trim(),$('explainBehavior').value.trim(),$('explainRule').value.trim()];
  if(answers.some(x=>x.length<40)){
    markStage('explain',false,'Each design explanation must contain at least 40 characters of your own reasoning.');
    return;
  }
  markStage('explain',true,'Design defense captured. UML, code, tests and the invariant are now connected.');
}

function invalidate(stage,message){
  if(!state.completed[stage])return;
  markStage(stage,false,message||'Changed after validation. Validate this stage again.');
}

function wireInvalidation(){
  ['predictDeposit','predictWithdraw','predictRejected'].forEach(id=>$(id).addEventListener('input',()=>invalidate('predict')));
  ['classifyOwner','classifyBalance','classifyDeposit','classifyWithdraw','classifyPrivate','classifyPublic','modelResponsibility'].forEach(id=>$(id).addEventListener('input',()=>invalidate('model')));
  $('implementEditor').addEventListener('input',()=>{
    invalidate('implement','Implementation changed. Run and validate the new code.');
    if(state.completed.test)markStage('test',false,'Implementation changed. Re-run the test against the current class.');
    $('validateImplement').disabled=true;
  });
  $('testEditor').addEventListener('input',()=>{invalidate('test','Test changed. Run and validate the current test.');$('validateTest').disabled=true;});
  $('modifyEditor').addEventListener('input',()=>{invalidate('modify','Business rule code changed. Run and validate it again.');$('validateModify').disabled=true;});
  ['explainState','explainBehavior','explainRule'].forEach(id=>$(id).addEventListener('input',()=>invalidate('explain')));
}

async function runImplement(){
  const source=$('implementEditor').value;
  const result=await runPython('implement',source);
  $('validateImplement').disabled=!!result.error;
}

async function runTest(){
  if(!state.completed.implement){
    setFeedback('test','Validate the implementation before running the formal test.','bad');
    return;
  }
  const source=$('testEditor').value;
  const result=await runPython('test',source);
  $('validateTest').disabled=!!result.error;
}

async function runModify(){
  const source=$('modifyEditor').value;
  const result=await runPython('modify',source);
  $('validateModify').disabled=!!result.error;
}

function resetCode(stage,editorId,starter){
  $(editorId).value=starter;
  state.lastOutput[stage]='';
  state.lastError[stage]='';
  state.lastSource[stage]='';
  $(stage+'OutputPanel').classList.add('hidden');
  $('validate'+stage.charAt(0).toUpperCase()+stage.slice(1)).disabled=true;
  invalidate(stage,'Cell reset. Run and validate it again.');
}

function modelEvidence(){
  return {
    uml_classification_score:4,
    uml_classification_total:4,
    uml_mastery:state.completed.model,
    uml_visual_score:2,
    uml_visual_total:2,
    uml_visual_mastery:state.completed.model,
    uml_draft_class:'BankAccount',
    uml_draft_responsibility:$('modelResponsibility').value.trim(),
    uml_draft_attributes:'- owner: String\n- balance: float',
    uml_draft_methods:'+ deposit(amount): void\n+ withdraw(amount): bool',
    uml_visual_version:'state-behavior-colab-v1',
    uml_visual_case:'bank-account',
    uml_visual_examples_seen:'BankAccount class box; private attributes; public operations'
  };
}

async function recordEvidence(){
  if(STAGES.some(k=>!state.completed[k]))return;
  if(!state.attempt?.id||!state.attempt?.token){
    $('sessionGate').classList.remove('hidden');
    syncBadge('warn','Supabase: registration required');
    return;
  }

  const button=$('recordEvidenceButton');
  button.disabled=true;
  button.textContent='Recording…';
  syncBadge('warn','Supabase: syncing');

  const explanation=[
    'STATE: '+$('explainState').value.trim(),
    'BEHAVIOR: '+$('explainBehavior').value.trim(),
    'INVARIANT: '+$('explainRule').value.trim()
  ].join('\n\n');

  const evidence={
    model:true,
    code:true,
    test:true,
    explain:true,
    notes:explanation,
    source:'oop-uml-state-behavior-colab',
    pedagogy_version:'oop-uml-v6-colab-state-behavior',
    learning_focus:'state-behavior',
    runtime:'Pyodide 0.27.7',
    run_count:state.runCount,
    successful_run_count:state.successfulRunCount,
    run_success:state.successfulRunCount>0,
    implement_success:state.completed.implement,
    test_success:state.completed.test&&state.completed.modify,
    code_snapshot:$('modifyEditor').value,
    last_output:state.lastOutput.modify,
    ...modelEvidence()
  };

  try{
    const snapshot=await state.store.rpc('seminar_oop_uml_record_session',{
      p_attempt_id:state.attempt.id,
      p_attempt_token:state.attempt.token,
      p_session_key:'s02',
      p_evidence:evidence
    });
    state.recorded=true;
    syncBadge('ok','Supabase: recorded');
    $('receiptCell').classList.remove('hidden');
    const session=(snapshot?.sessions||[]).find(x=>x.session_key==='s02');
    $('receiptText').textContent=session?.completed_at
      ?'Recorded at '+new Date(session.completed_at).toLocaleString('en-GB')+'. Teacher evidence now shows Session 02, UML verification and successful runtime evidence.'
      :'Session 02 is stored in the Seminar evidence backend.';
    button.textContent='Recorded ✓';
    button.disabled=true;
    sessionStorage.removeItem(DRAFT_KEY);
    $('receiptCell').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){
    button.disabled=false;
    button.textContent='Record Session 02 evidence';
    syncBadge('warn','Supabase: sync failed');
    $('completionCopy').textContent='Supabase rejected the evidence: '+String(err?.message||err)+'. Your notebook stays open; correct the issue and try again.';
  }
}

async function loadExistingRecord(){
  if(!state.attempt?.id||!state.attempt?.token)return;
  try{
    const snapshot=await state.store.rpc('seminar_oop_uml_snapshot',{
      p_attempt_id:state.attempt.id,
      p_attempt_token:state.attempt.token
    });
    const record=(snapshot?.sessions||[]).find(x=>x.session_key==='s02'&&x.status==='completed');
    if(!record)return;
    state.recorded=true;
    STAGES.forEach(k=>markStage(k,true));
    $('recordEvidenceButton').textContent='Already recorded ✓';
    $('recordEvidenceButton').disabled=true;
    $('receiptCell').classList.remove('hidden');
    $('receiptText').textContent='A completed Session 02 record already exists for this Seminar attempt. You may rerun the notebook for practice without creating duplicate evidence.';
  }catch(err){
    console.warn('Existing State & Behavior evidence could not be loaded.',err);
  }
}

async function initOfficialSession(){
  state.store=new CourseStore(window.IJR_SEMINAR_T3_CONFIG);
  try{
    state.attempt=await state.store.restore();
  }catch(err){
    console.warn('Seminar session restore failed.',err);
  }

  if(state.attempt?.id&&state.attempt?.token){
    $('identityBadge').textContent=(state.attempt.group||'11')+' · '+(state.attempt.label||'registered team');
    syncBadge('ok',state.attempt.backend==='supabase'?'Supabase: connected':'Supabase: cached session');
    $('sessionGate').classList.add('hidden');
    await loadExistingRecord();
  }else{
    $('identityBadge').textContent='No active registration';
    syncBadge('warn','Supabase: registration required');
    $('sessionGate').classList.remove('hidden');
  }
  updateProgress();
}

function wireStateWorkshop(){
  $('implementEditor').value=IMPLEMENT_STARTER;
  $('testEditor').value=TEST_STARTER;
  $('modifyEditor').value=MODIFY_STARTER;

  document.querySelectorAll('#stageList [data-stage]').forEach(btn=>btn.addEventListener('click',()=>scrollStage(btn.dataset.stage)));
  $('validatePredict').addEventListener('click',validatePrediction);
  $('validateModel').addEventListener('click',validateModel);
  $('validateImplement').addEventListener('click',validateImplementation);
  $('validateTest').addEventListener('click',validateTest);
  $('validateModify').addEventListener('click',validateModify);
  $('validateExplain').addEventListener('click',validateExplanation);

  $('runImplement').addEventListener('click',()=>runImplement().catch(err=>setFeedback('implement',String(err?.message||err),'bad')));
  $('runTest').addEventListener('click',()=>runTest().catch(err=>setFeedback('test',String(err?.message||err),'bad')));
  $('runModify').addEventListener('click',()=>runModify().catch(err=>setFeedback('modify',String(err?.message||err),'bad')));

  $('resetImplement').addEventListener('click',()=>resetCode('implement','implementEditor',IMPLEMENT_STARTER));
  $('resetTest').addEventListener('click',()=>resetCode('test','testEditor',TEST_STARTER));
  $('resetModify').addEventListener('click',()=>resetCode('modify','modifyEditor',MODIFY_STARTER));
  $('connectRuntimeButton').addEventListener('click',()=>ensureRuntime().catch(err=>setFeedback('implement',String(err?.message||err),'bad')));
  $('recordEvidenceButton').addEventListener('click',recordEvidence);

  wireInvalidation();
  scrollStage('predict');
  updateProgress();
  initOfficialSession();
}

function renderGeneric(topic,lang){
  $('genericWorkshop').classList.remove('hidden');
  $('genericSessionLabel').textContent='SESSION '+String(topic.n).padStart(2,'0')+' · WORKSHOP · '+lang.toUpperCase();
  $('genericTitle').textContent=topic.title;
  $('genericLead').textContent=topic.lead;
  $('genericCrumbTopic').textContent=topic.title;
  $('genericUmlName').textContent=topic.uml.name;
  $('genericUmlAttrs').innerHTML=topic.uml.attrs.length?topic.uml.attrs.map(x=>'<div>'+esc(x)+'</div>').join(''):'<div><em>No attributes required in this abstraction.</em></div>';
  $('genericUmlOps').innerHTML=topic.uml.ops.map(x=>'<div>'+esc(x)+'</div>').join('');
  $('genericChecklist').innerHTML=topic.evidence.map((x,i)=>'<label><input type="checkbox"><span><strong>Evidence '+(i+1)+'</strong><br>'+esc(x)+'</span></label>').join('');
  $('genericModuleLauncher').innerHTML=topic.modules.map(m=>'<div class="module-row"><div><strong>'+esc(m.toUpperCase())+' · '+esc(topic.title)+'</strong><p>Tracked '+(lang==='python'?'Python':'Java')+' laboratory module. Open it, complete the guided evidence, then return to the Hub.</p></div><a class="button button-dark" href="../lab.html?language='+encodeURIComponent(lang)+'&module='+encodeURIComponent(m)+'">Open '+esc(m.toUpperCase())+'</a></div>').join('');
  if(topic.n<=3)$('genericModuleLauncher').insertAdjacentHTML('beforeend','<div class="module-row"><div><strong>Python OOP Colab Lab 01</strong><p>12-stage browser Python lab focused on class/object reasoning, state, methods and OOP design.</p></div><a class="button button-light" href="../oop-logic-01/">Open Colab-style lab</a></div>');
  const theory='theory.html?topic='+encodeURIComponent(topic.slug)+'&lang='+encodeURIComponent(lang);
  $('genericTheoryTop').href=theory;
  $('genericTheoryBottom').href=theory;
}

function boot(){
  if(!window.IJR_OOP_UML_DATA||!window.IJR_SEMINAR_T3_CONFIG){
    setTimeout(boot,25);
    return;
  }
  const params=new URLSearchParams(location.search);
  const slug=params.get('topic')||'object-model';
  const lang=params.get('lang')==='java'?'java':'python';
  const topics=window.IJR_OOP_UML_DATA.topics||[];
  const topic=topics.find(x=>x.slug===slug)||topics[0];

  if(topic?.slug==='state-behavior'){
    $('stateBehaviorWorkshop').classList.remove('hidden');
    wireStateWorkshop();
  }else{
    renderGeneric(topic,lang);
  }
}

boot();
