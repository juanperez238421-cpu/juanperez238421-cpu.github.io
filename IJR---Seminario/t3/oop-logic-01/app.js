(() => {
  'use strict';

  const cfg=window.IJR_OOP_COLAB_CONFIG;
  const $=id=>document.getElementById(id);
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const PYODIDE_INDEX='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
  const PLACEHOLDER='WRITE_HERE';

  const state={attemptId:null,token:null,snapshot:null,current:null,pyodide:null,runtimePromise:null,executionCount:0,lastScalar:'',selectedChoice:'',starter:'',startedAt:null,timer:null,pendingSnapshot:null};

  const LESSONS={
    P01:{minutes:3,tag:'01 · OBJECT MODEL',title:'Class vs object',concept:'<p>A <strong>class</strong> is a reusable blueprint. An <strong>object</strong> is one concrete instance created from that blueprint.</p>',goal:'<p>Separate the definition of a type from one object that exists at runtime.</p>',steps:['Ask whether the statement describes a reusable definition or one concrete value in memory.','Remember: a class can define attributes and methods.','Choose the option that describes the blueprint, not the instance.'],explore:'<p>Think of one class you could use in a school project and name two different objects created from it.</p>',hints:['Blueprint versus concrete instance.','A class defines what objects can store and do.','Choose the statement that describes a reusable blueprint.']},
    P02:{minutes:3,tag:'01 · OBJECT MODEL',title:'Create an object',concept:'<p>Calling a class such as <code>Robot()</code> constructs an <strong>instance</strong>. The variable stores a reference to that object.</p>',goal:'<p>Create one Robot instance and verify its runtime class.</p>',steps:['Read the class definition.','Replace <code>WRITE_HERE</code> with the constructor call.','Run the cell.','Explain why the output is the class name.'],explore:'<p>Create a second variable with another <code>Robot()</code>. Those are two different objects.</p>',hints:['Call the class using parentheses.','The expression is <code>Robot()</code>.','Complete <code>r = Robot()</code>.']},
    P03:{minutes:4,tag:'01 · OBJECT MODEL',title:'Constructor and self',concept:'<p><code>__init__</code> initializes a new object. <code>self</code> refers to the object currently being initialized or executing the method.</p>',goal:'<p>Store the constructor parameter in the object attribute <code>self.value</code>.</p>',steps:['Identify the parameter named <code>start</code>.','Identify the object attribute <code>self.value</code>.','Assign the parameter to that attribute.','Run and verify the stored state.'],explore:'<p>Create another Counter with a different start value and compare the two states.</p>',hints:['Use the constructor parameter, not a fixed number.','The right side should be <code>start</code>.','Complete <code>self.value = start</code>.']},
    P04:{minutes:3,tag:'01 · OBJECT MODEL',title:'What self means',concept:'<p>Every instance method receives the object it is acting on. Python conventionally names that first parameter <code>self</code>.</p>',goal:'<p>Identify which concrete object <code>self</code> refers to during a method call.</p>',steps:['Imagine two objects of the same class.','Call the same method on each object.','Notice that each call must access a different object state.'],explore:'<p>Translate the idea to Java: Python <code>self</code> plays a role similar to Java <code>this</code>.</p>',hints:['It is not a global variable.','It is the receiver of the method call.','self is the current object executing the method.']},
    P05:{minutes:4,tag:'02 · STATE & METHODS',title:'Methods change object state',concept:'<p>Attributes represent <strong>state</strong>. Instance methods can read or mutate that state through <code>self</code>.</p>',goal:'<p>Update <code>self.value</code> using its previous value plus <code>amount</code>.</p>',steps:['Read the current value stored in the object.','Use the method parameter <code>amount</code>.','Write the new state back to <code>self.value</code>.','Run and explain the final value.'],explore:'<p>Call <code>add()</code> twice and predict the state before running.</p>',hints:['The old value must remain part of the calculation.','Use <code>self.value + amount</code>.','Either <code>self.value = self.value + amount</code> or <code>self.value += amount</code> works.']},
    P06:{minutes:3,tag:'02 · STATE & METHODS',title:'State vs behavior',concept:'<p>Object <strong>state</strong> is stored in attributes. Object <strong>behavior</strong> is expressed through methods.</p>',goal:'<p>Distinguish data from actions in a class design.</p>',steps:['Look for nouns or stored values: those are usually attributes.','Look for verbs or callable operations: those are usually methods.','Choose the member that performs an action.'],explore:'<p>For a BankAccount, list two possible attributes and two possible methods.</p>',hints:['Attribute = state.','Method = action.','Choose the method.']},
    P07:{minutes:4,tag:'02 · STATE & METHODS',title:'Independent object state',concept:'<p>Two constructor calls create two independent objects. Mutating one does not automatically change the other.</p>',goal:'<p>Run a trace with two Counter instances and explain why their final values differ.</p>',steps:['Count constructor calls: there are two.','Track <code>a</code> and <code>b</code> separately.','Apply <code>add()</code> only to <code>a</code>.','Run and compare the two final states.'],explore:'<p>Now call <code>b.add(...)</code> and predict the new pair.</p>',hints:['Two constructor calls mean two objects.','Only a receives the method call.','b keeps its original value.']},
    P08:{minutes:3,tag:'02 · STATE & METHODS',title:'References and aliasing',concept:'<p>An assignment such as <code>second = first</code> does not create a new object. Both names can reference the <strong>same</strong> object.</p>',goal:'<p>Trace one shared object through two references.</p>',steps:['Draw one Counter object.','Draw two arrows, first and second, pointing to it.','Apply the mutation through second.','Read the same object again through first.'],explore:'<p>Compare this with two separate constructor calls. The number of variable names is not the number of objects.</p>',hints:['Count objects, not variable names.','second = first creates another reference.','A mutation through either reference changes the same object.']},
    P09:{minutes:3,tag:'03 · OOP DESIGN',title:'Encapsulation',concept:'<p><strong>Encapsulation</strong> keeps state changes behind controlled operations so the object can preserve valid rules and invariants.</p>',goal:'<p>Recognize why validated methods are safer than unrestricted field mutation.</p>',steps:['Identify the state that could become invalid.','Ask which class should own the validation rule.','Choose the design that centralizes valid state changes.'],explore:'<p>Imagine an account balance: what invalid change should a method prevent?</p>',hints:['The goal is not secrecy by itself.','Protect valid state changes.','Encapsulation helps preserve invariants.']},
    P10:{minutes:3,tag:'03 · OOP DESIGN',title:'Inheritance and overriding',concept:'<p>A subclass can inherit from a base class and <strong>override</strong> a method with more specific behavior.</p>',goal:'<p>Override <code>speak()</code> in Dog and verify that the subclass method runs.</p>',steps:['Read the base method.','Find the method with the same name in Dog.','Return the workstation-specific text.','Run and identify which implementation produced the output.'],explore:'<p>Remove Dog.speak() temporarily and predict which method will run.</p>',hints:['The subclass method has the same name.','Return the exact string requested by the task.','The Dog implementation overrides Animal.speak().']},
    P11:{minutes:3,tag:'03 · OOP DESIGN',title:'Polymorphism',concept:'<p>With polymorphism, code can work through a common base type while the <strong>real object</strong> supplies its overridden behavior.</p>',goal:'<p>Predict which method implementation runs for a subclass object referenced through a base concept.</p>',steps:['Identify the base type.','Identify the actual object created.','Check whether the method is overridden.','Choose the implementation belonging to the real object.'],explore:'<p>Imagine Cat and Dog both inheriting from Animal and each implementing speak().</p>',hints:['Declared/base type and real object can differ.','Overriding is resolved using the real object.','The subclass implementation runs.']},
    P12:{minutes:3,tag:'03 · OOP DESIGN',title:'Composition · has-a',concept:'<p><strong>Composition</strong> models a has-a relationship. One object stores another object and delegates part of its state or behavior to it.</p>',goal:'<p>Make Robot own a Battery object and trace the final battery state.</p>',steps:['Identify the contained type: Battery.','Construct a Battery using the Robot constructor parameter.','Store it in <code>self.battery</code>.','Run the charge trace and explain the final level.'],explore:'<p>Compare: Robot <em>has a</em> Battery, but Robot is not a Battery. That is composition, not inheritance.</p>',hints:['Use the Battery constructor.','Pass energy into Battery(...).','Complete <code>self.battery = Battery(energy)</code>.']}
  };

  async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw new Error(error.message||'Backend error');return data}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function normalizeCode(v){return String(v??'').replace(/\\n/g,'\n')}
  function fmtGrade(v){return Number(v??1).toFixed(2)}
  function saveSession(){if(state.attemptId&&state.token)sessionStorage.setItem(cfg.sessionStorageKey,JSON.stringify({attemptId:state.attemptId,token:state.token}))}
  function clearSession(){sessionStorage.removeItem(cfg.sessionStorageKey)}
  function setStatus(msg,kind=''){const el=$('activityStatus');el.textContent=msg||'';el.className=`validation-status ${kind}`.trim()}
  function setSetup(msg,bad=false){$('setupStatus').textContent=msg||'';$('setupStatus').style.color=bad?'#b3261e':''}
  function currentCheckpoint(s=state.snapshot){return Array.from(s?.checkpoints||[]).find(cp=>!cp.completed)||null}
  function lastScalar(output){const rows=String(output||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);return rows.length?rows.at(-1):''}
  function formatElapsed(ms){const t=Math.max(0,Math.floor(ms/1000)),m=Math.floor(t/60),s=t%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
  function elapsedMs(){return state.startedAt?Date.now()-state.startedAt.getTime():0}
  function startTimer(value){const d=value?new Date(value):new Date();state.startedAt=Number.isNaN(d.getTime())?new Date():d;clearInterval(state.timer);const tick=()=>{$('timeLabel').textContent=`${formatElapsed(elapsedMs())} / ${String(cfg.targetMinutes).padStart(2,'0')}:00`};tick();state.timer=setInterval(tick,1000)}

  function setNetwork(){const ok=navigator.onLine!==false,b=$('networkBadge');b.textContent=ok?'Online':'Offline';b.classList.toggle('attention',!ok)}
  window.addEventListener('online',setNetwork);window.addEventListener('offline',setNetwork);setNetwork();

  function setRuntimeBadge(mode,label){const badge=$('runtimeBadge');badge.className=`runtime-badge ${mode}`;badge.innerHTML='<span class="status-dot"></span>'+esc(label);$('kernelLabel').textContent=mode==='ready'?'Python 3 · browser runtime':label}
  async function ensureRuntime(){
    if(state.pyodide)return state.pyodide;
    if(state.runtimePromise)return state.runtimePromise;
    state.runtimePromise=(async()=>{
      try{
        setRuntimeBadge('loading','Loading Python…');
        if(typeof window.loadPyodide!=='function')throw new Error('Pyodide did not load');
        state.pyodide=await window.loadPyodide({indexURL:PYODIDE_INDEX});
        setRuntimeBadge('ready','Python ready');clearTerminal('Python 3 runtime ready.');return state.pyodide;
      }catch(err){state.runtimePromise=null;setRuntimeBadge('error','Python unavailable');clearTerminal(`Runtime error: ${err.message}`);throw err}
    })();
    return state.runtimePromise;
  }

  function clearTerminal(message='Python console ready.'){const el=$('terminalOutput');el.textContent=message+'\n'}
  function appendTerminal(text){const el=$('terminalOutput');el.textContent+=(el.textContent&&!el.textContent.endsWith('\n')?'\n':'')+String(text??'')+'\n';el.scrollTop=el.scrollHeight}
  async function executePython(source){
    const py=await ensureRuntime(),stdout=[],stderr=[];
    py.setStdout({batched:m=>stdout.push(m)});py.setStderr({batched:m=>stderr.push(m)});
    try{let result=await py.runPythonAsync(source);if(result!==undefined&&result!==null){const text=String(result);if(text!=='None')stdout.push(text);if(typeof result.destroy==='function')result.destroy()}}catch(err){stderr.push(String(err?.message||err))}
    state.executionCount+=1;$('executionCount').textContent=`[${state.executionCount}]`;appendTerminal(`In [${state.executionCount}]:`);
    const output=stdout.join('\n').trim(),errors=stderr.join('\n').trim();if(output)appendTerminal(output);if(errors)appendTerminal(`ERROR\n${errors}`);
    state.lastScalar=errors?'':lastScalar(output);
    if(errors){$('validateButton').disabled=true;setStatus('Python found an error. Fix it and run again. Syntax/runtime errors do not lower the grade.','bad')}
    else if(state.lastScalar){$('validateButton').disabled=false;setStatus('Output ready. Validate when the team can explain the object state.','ok')}
    else{$('validateButton').disabled=true;setStatus('The cell did not print a final value to validate.','bad')}
  }

  function structureCheck(key,source){
    if(source.includes(PLACEHOLDER))return 'Replace every WRITE_HERE before validating.';
    const checks={
      P02:/\br\s*=\s*Robot\s*\(\s*\)/,
      P03:/self\.value\s*=\s*start/,
      P05:/self\.value\s*(?:=\s*self\.value\s*\+\s*amount|\+=\s*amount)/,
      P10:/return\s+["']dog-\d+["']/,
      P12:/self\.battery\s*=\s*Battery\s*\(\s*energy\s*\)/
    };
    const rule=checks[key];return rule&&!rule.test(source)?'Keep the requested OOP structure; do not replace the task with a direct print of the final answer.':'';
  }

  async function logEvent(type,metadata={}){if(!state.attemptId||!state.token||!cfg.rpc.event)return;try{await rpc(cfg.rpc.event,{p_attempt_id:state.attemptId,p_attempt_token:state.token,p_event_type:type,p_metadata:metadata})}catch{}}

  function syncTeamSize(){const size=Number($('teamSize').value||3);$('student3Wrap').classList.toggle('hidden',size===2);$('studentEmail3').required=size===3;if(size===2)$('studentEmail3').value=''}
  $('teamSize').addEventListener('change',syncTeamSize);syncTeamSize();
  function readEmails(){const size=Number($('teamSize').value||3),emails=[$('studentEmail1').value.trim(),$('studentEmail2').value.trim()];if(size===3)emails.push($('studentEmail3').value.trim());return emails}

  function updateMetrics(s){
    state.snapshot=s;const cps=Array.from(s?.checkpoints||[]),done=Number(s?.completed_count??cps.filter(c=>c.completed).length),total=Number(s?.checkpoint_count||cfg.questionCount),remaining=Number(s?.help_tokens_remaining??Math.max(0,cfg.helpTokenLimit-Number(s?.help_tokens_used||0)));
    $('progressText').textContent=`${done} / ${total} completed`;$('progressBar').style.width=`${Math.min(100,done/Math.max(1,total)*100)}%`;$('gradeLabel').textContent=`Projected ${fmtGrade(s?.projected_grade??s?.grade)} / 5.00`;$('helpBadge').textContent=`${remaining} help${remaining===1?'':'s'}`;$('helpRemainingText').textContent=`${remaining} of ${cfg.helpTokenLimit} remaining`;$('helpButton').disabled=remaining<=0;$('studentLabel').textContent=`${s?.group_code||''} · ${s?.student_label||'Team'}`;$('packLabel').textContent=`Pack ${String(s?.variant_pack??'?').padStart(2,'0')}`;$('finishHelps').textContent=`${Number(s?.help_tokens_used||0)} / ${cfg.helpTokenLimit}`;
  }

  function renderRail(cps,currentKey){$('stepRail').innerHTML=cps.map(cp=>`<span class="rail-step ${cp.completed?'done':cp.key===currentKey?'active':''}" title="${esc(cp.title)}"><b>${cp.sequence}</b></span>`).join('')}

  function renderChoice(cp){
    state.selectedChoice='';$('choicePanel').classList.remove('hidden');$('codeInstruction').classList.add('hidden');$('codeCell').classList.add('hidden');$('outputInstruction').classList.add('hidden');$('terminalCard').classList.add('hidden');$('runCodeButton').classList.add('hidden');$('resetCodeButton').classList.add('hidden');
    $('choiceQuestion').textContent=cp.prompt||cp.title;const snippet=normalizeCode(cp.code);$('choiceCode').classList.toggle('hidden',!snippet);$('choiceCode').textContent=snippet;
    $('choiceOptions').innerHTML=(cp.choices||[]).map((choice,i)=>`<button type="button" class="choice-option" data-choice="${encodeURIComponent(choice)}"><span>${String.fromCharCode(65+i)}</span><strong>${esc(choice)}</strong></button>`).join('');
    $('choiceOptions').querySelectorAll('.choice-option').forEach(btn=>btn.addEventListener('click',()=>{$('choiceOptions').querySelectorAll('.choice-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.selectedChoice=decodeURIComponent(btn.dataset.choice);$('validateButton').disabled=false;setStatus('Option selected. Validate only when the team can justify it.')}));
  }

  function renderCode(cp){
    $('choicePanel').classList.add('hidden');$('codeInstruction').classList.remove('hidden');$('codeCell').classList.remove('hidden');$('outputInstruction').classList.remove('hidden');$('terminalCard').classList.remove('hidden');$('runCodeButton').classList.remove('hidden');$('resetCodeButton').classList.remove('hidden');
    state.starter=normalizeCode(cp.code);$('codeEditor').value=state.starter;state.lastScalar='';$('validateButton').disabled=true;
  }

  function renderStage(cp,cps){
    state.current=cp;state.pendingSnapshot=null;state.executionCount=0;state.lastScalar='';$('executionCount').textContent='[ ]';$('solutionPanel').classList.add('hidden');$('revealButton').disabled=false;$('skipButton').disabled=false;$('helpPanel').classList.add('hidden');
    const lesson=LESSONS[cp.key]||LESSONS.P01;$('lessonTag').textContent=lesson.tag;$('lessonTiming').textContent=`Target: ${lesson.minutes} min`;$('lessonTitle').textContent=lesson.title;$('lessonConcept').innerHTML=lesson.concept;$('lessonGoal').innerHTML=lesson.goal;$('lessonSteps').innerHTML=lesson.steps.map(x=>`<li>${x}</li>`).join('');$('lessonTask').innerHTML=`<p>${esc(cp.prompt||'Complete the assigned stage.')}</p>`;$('lessonExplore').innerHTML=lesson.explore;$('stepLabel').textContent=`Stage ${cp.sequence} of ${cps.length}`;renderRail(cps,cp.key);
    if((cp.mode||'code')==='choice')renderChoice(cp);else renderCode(cp);setStatus((cp.mode||'code')==='choice'?'Read, discuss, select one option, then validate.':'Complete or run the cell, read the output, and explain it before validating.');
  }

  function render(s){
    updateMetrics(s);$('setupPanel').classList.add('hidden');startTimer(s?.started_at);const cps=Array.from(s?.checkpoints||[]),done=Number(s?.completed_count||0),total=Number(s?.checkpoint_count||cps.length||cfg.questionCount);
    if(s?.completed){clearInterval(state.timer);$('workspacePanel').classList.add('hidden');$('finishPanel').classList.remove('hidden');$('finishPoints').textContent=`${done} / ${total}`;$('finishGrade').textContent=fmtGrade(s?.grade);$('finishTime').textContent=formatElapsed(elapsedMs());clearSession();return}
    const cp=currentCheckpoint(s);if(!cp){setStatus('No pending stage was returned. Refresh the page.','bad');return}$('finishPanel').classList.add('hidden');$('workspacePanel').classList.remove('hidden');renderStage(cp,cps);if((cp.mode||'code')==='code')ensureRuntime().catch(()=>{});
  }

  $('registrationForm').addEventListener('submit',async e=>{
    e.preventDefault();const group=$('groupCode').value,emails=readEmails(),domain='@'+cfg.institutionalEmailDomain;
    if(!group||emails.some(v=>!v.toLowerCase().endsWith(domain))||new Set(emails.map(v=>v.toLowerCase())).size!==emails.length){setSetup(`Use distinct institutional emails ending in ${domain}.`,true);return}
    $('startButton').disabled=true;setSetup('Registering team and assigning one of 36 OOP packs…');
    try{const data=await rpc(cfg.rpc.start,{p_student_emails:emails,p_group_code:group,p_session_id:crypto.randomUUID(),p_user_agent:navigator.userAgent});state.attemptId=data.attempt_id;state.token=data.attempt_token;saveSession();setSetup('');render(data.snapshot);await logEvent('OOP_COLAB_CLIENT_READY',{pack:data.snapshot?.variant_pack,team_size:emails.length,client_version:'oop-colab-v1'})}
    catch(err){$('startButton').disabled=false;setSetup(`Could not start: ${err.message}`,true)}
  });

  async function validateCurrent(){
    const cp=state.current;if(!cp)return;let answer='',codeSnapshot=null;
    if((cp.mode||'code')==='choice'){answer=state.selectedChoice;if(!answer)return}
    else{codeSnapshot=$('codeEditor').value;const issue=structureCheck(cp.key,codeSnapshot);if(issue){setStatus(issue,'bad');return}answer=state.lastScalar;if(!answer){setStatus('Run the Python cell first so there is an output to validate.','bad');return}}
    $('validateButton').disabled=true;setStatus('Validating with Supabase…');
    try{const data=await rpc(cfg.rpc.submit,{p_attempt_id:state.attemptId,p_attempt_token:state.token,p_checkpoint_key:cp.key,p_answer:answer,p_code_snapshot:codeSnapshot});if(data.correct){setStatus(`Correct · ${Number(data.awarded_points||0).toFixed(2)} point(s).`,'ok');await logEvent('OOP_COLAB_STAGE_CORRECT',{checkpoint_key:cp.key,variant_key:cp.variant_key});setTimeout(()=>render(data.snapshot),550)}else{updateMetrics(data.snapshot);state.current=(data.snapshot.checkpoints||[]).find(x=>x.key===cp.key)||cp;setStatus(`Incorrect validated answer · attempt ${Number(data.wrong_attempts||1)}. Re-read the object model and try again.`,'bad');$('validateButton').disabled=false}}
    catch(err){setStatus(`Validation failed: ${err.message}`,'bad');$('validateButton').disabled=false}
  }
  $('validateButton').addEventListener('click',validateCurrent);

  async function runEditor(){const cp=state.current;if(!cp||(cp.mode||'code')==='choice')return;const source=$('codeEditor').value,issue=structureCheck(cp.key,source);if(source.includes(PLACEHOLDER)){setStatus('Replace WRITE_HERE before running the completed solution.','bad')}else if(issue){setStatus(issue,'bad')}await executePython(source)}
  $('runCodeButton').addEventListener('click',runEditor);$('runCellButton').addEventListener('click',runEditor);
  $('resetCodeButton').addEventListener('click',()=>{$('codeEditor').value=state.starter;state.lastScalar='';$('validateButton').disabled=true;setStatus('Cell restored to the workstation starter code.')});
  $('clearTerminalButton').addEventListener('click',()=>clearTerminal());
  $('terminalForm').addEventListener('submit',async e=>{e.preventDefault();const source=$('terminalCommand').value.trim();if(!source)return;$('terminalCommand').value='';await executePython(source)});

  $('helpButton').addEventListener('click',async()=>{
    const cp=state.current;if(!cp)return;const remaining=Number(state.snapshot?.help_tokens_remaining||0);if(remaining<=0)return;if(!confirm(`Use one help token? ${remaining} remaining.`))return;
    try{const data=await rpc(cfg.rpc.help,{p_attempt_id:state.attemptId,p_attempt_token:state.token,p_checkpoint_key:cp.key});updateMetrics(data.snapshot);state.current=(data.snapshot.checkpoints||[]).find(x=>x.key===cp.key)||cp;const lesson=LESSONS[cp.key]||LESSONS.P01,level=Math.max(1,Math.min(3,Number(data.help_level||state.current.help_count||1))),text=level===1?lesson.hints[0]:level===2?(data.variant_hint||lesson.hints[1]):lesson.hints[2];$('helpPanel').innerHTML=`<strong>Help ${level}</strong><br>${esc(text)}`;$('helpPanel').classList.remove('hidden');setStatus('Help recorded. Explain the idea before validating again.')}
    catch(err){setStatus(`Help unavailable: ${err.message}`,'bad')}
  });

  $('revealButton').addEventListener('click',async()=>{
    const cp=state.current;if(!cp||!confirm('Reveal the correct solution? This stage will close for 25% credit.'))return;$('revealButton').disabled=true;
    try{const data=await rpc(cfg.rpc.reveal,{p_attempt_id:state.attemptId,p_attempt_token:state.token,p_checkpoint_key:cp.key});updateMetrics(data.snapshot);state.pendingSnapshot=data.snapshot;$('solutionCode').textContent=normalizeCode(data.solution_code||'(concept question)');$('solutionOutput').textContent=data.expected_answer??'—';$('solutionCredit').textContent=`${Math.round(Number(data.awarded_points||0)*100)}% equivalent stage credit`;$('solutionPanel').classList.remove('hidden');setStatus('Solution revealed. Study it, then continue.','ok')}
    catch(err){$('revealButton').disabled=false;setStatus(`Could not reveal: ${err.message}`,'bad')}
  });
  $('continueAfterRevealButton').addEventListener('click',()=>{if(state.pendingSnapshot)render(state.pendingSnapshot)});

  $('skipButton').addEventListener('click',async()=>{
    const cp=state.current;if(!cp||!confirm('Skip this stage for 0% credit?'))return;$('skipButton').disabled=true;
    try{const data=await rpc(cfg.rpc.skip,{p_attempt_id:state.attemptId,p_attempt_token:state.token,p_checkpoint_key:cp.key});render(data.snapshot)}catch(err){$('skipButton').disabled=false;setStatus(`Could not skip: ${err.message}`,'bad')}
  });

  async function resume(){
    let saved=null;try{saved=JSON.parse(sessionStorage.getItem(cfg.sessionStorageKey)||'null')}catch{}
    if(!saved?.attemptId||!saved?.token)return;
    state.attemptId=saved.attemptId;state.token=saved.token;setSetup('Restoring previous OOP session…');
    try{const snapshot=await rpc(cfg.rpc.resume,{p_attempt_id:state.attemptId,p_attempt_token:state.token});render(snapshot);setSetup('')}
    catch{clearSession();state.attemptId=null;state.token=null;setSetup('Previous session could not be restored. Start a new registration.',true)}
  }

  ensureRuntime().catch(()=>{});resume();
})();
