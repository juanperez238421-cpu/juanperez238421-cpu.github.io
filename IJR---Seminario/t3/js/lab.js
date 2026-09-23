import {CourseStore} from './course-store.js';
import {analyzeJava, solvedCredit} from './scoring-core.js';

const cfg=window.IJR_SEMINAR_T3_CONFIG;
const $=id=>document.getElementById(id);
const store=new CourseStore(cfg);
const params=new URLSearchParams(location.search);
const requestedModule=params.get('module')||'m01';
const requestedLanguage=params.get('language')||'python';
const PYODIDE_INDEX='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';

let course,module,variant,language=requestedLanguage;
let attempt=null;
let helps=0,wrongs=0,currentCode='',lastOutput='',lastError='';
let executionCount=0,pyodide=null,runtimePromise=null,solutionVisible=false;
let moduleOpenedAt=Date.now(),timerHandle=null,saveTimer=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setStatus(text,type=''){const el=$('validationStatus');el.textContent=text;el.className=`validation-status ${type}`;}
function setSetup(text,bad=false){$('setupStatus').textContent=text;$('setupStatus').className=`status-line ${bad?'bad':''}`;}
function appendTerminal(text){const el=$('terminalOutput');el.textContent+=(el.textContent?'\n':'')+text;el.scrollTop=el.scrollHeight;}
function clearTerminal(text=''){$('terminalOutput').textContent=text;}
function levelLabel(level){return level==='basic'?'BÁSICO':level==='medium'?'MEDIO':'AVANZADO';}
function orderedModules(){return [...course.modules].sort((a,b)=>a.routeOrder-b.routeOrder);}
function nextModule(){const list=orderedModules(),i=list.findIndex(x=>x.id===module.id);return i>=0&&i<list.length-1?list[i+1]:null;}
function moduleRecord(){return attempt?.records?.[module.id]||{};}
function completedMode(){return ['solved','revealed','skipped'].includes(moduleRecord().mode)?moduleRecord().mode:null;}
function fmt(n){return Number(n??0).toFixed(2);}
function updateBackendBadge(){
  const b=$('backendBadge'),isBackend=attempt?.backend==='supabase';
  b.textContent=isBackend?'Registro en vivo':'Modo local';
  b.className=`badge ${isBackend?'ready':'neutral'}`;
}
function updateGrade(){
  if(!attempt)return;
  $('moduleProgress').textContent=`${attempt.completed_count} / 16 módulos`;
  $('gradeLabel').textContent=attempt.final_grade!=null?`Nota final ${fmt(attempt.final_grade)} / 5.00`:`Proyección ${fmt(attempt.projected_grade)} / 5.00`;
  $('routeProgress').style.width=`${Math.min(100,attempt.completed_count/16*100)}%`;
  const currentPotential=solvedCredit(helps,wrongs);
  $('penaltySummary').textContent=`Módulo: ${helps}/3 ayudas · ${wrongs} salida(s) incorrecta(s) validada(s) · potencial actual ${Math.round(currentPotential*100)}%.`;
  updateBackendBadge();
}
function updateHelpUI(){
  $('helpCounter').textContent=`${helps} / 3 usadas en este módulo`;
  const hints=Array.isArray(variant.hints)?variant.hints:[];
  $('helpList').innerHTML=hints.slice(0,helps).map((h,i)=>`<li><strong>Ayuda ${i+1}.</strong> ${esc(h)}</li>`).join('');
  const btn=$('helpButton');
  if(!hints.length){btn.disabled=true;btn.textContent='Ayudas retiradas del cliente público';}
  else if(helps>=Math.min(3,hints.length)){btn.disabled=true;btn.textContent='Ayudas utilizadas';}
  else{btn.disabled=false;btn.textContent=`Usar ayuda ${helps+1}`;}
}
function updateTeamSize(){
  const size=Number($('teamSize').value);
  $('student2Wrap').classList.toggle('hidden',size<2);$('student3Wrap').classList.toggle('hidden',size<3);
  $('studentName2').required=size>=2;$('studentName3').required=size>=3;
  if(size<2)$('studentName2').value='';if(size<3)$('studentName3').value='';
}
function namesFromForm(){const size=Number($('teamSize').value);return [$('studentName1').value.trim(),$('studentName2').value.trim(),$('studentName3').value.trim()].slice(0,size);}
function fullscreenSupported(){return !!document.documentElement.requestFullscreen;}
function isFullscreen(){return !!document.fullscreenElement;}
async function enterFullscreen(){
  if(!cfg.requireFullscreen)return true;
  try{if(!isFullscreen())await document.documentElement.requestFullscreen();$('fullscreenGate').classList.add('hidden');return true;}
  catch{setSetup('No fue posible activar pantalla completa. Usa Chrome o Edge en computador.',true);return false;}
}
function enforceFullscreen(){if(!cfg.requireFullscreen||!attempt)return true;if(isFullscreen())return true;$('fullscreenGate').classList.remove('hidden');return false;}
function renderGuide(){
  $('moduleTopTitle').textContent=variant.title;
  $('setupKicker').textContent=`${levelLabel(module.level)} · MÓDULO ${module.routeOrder} DE 16`;
  $('setupTitle').textContent=variant.title;
  $('setupLead').innerHTML=`${esc(variant.subtitle)}. <strong>${module.time} minutos</strong> de práctica guiada aproximadamente.`;
  $('levelBadge').textContent=levelLabel(module.level);$('levelBadge').className=`level-badge ${module.level}`;
  $('timeTarget').textContent=`Objetivo: ${module.time} min`;$('lessonTitle').textContent=variant.title;$('lessonSubtitle').textContent=variant.subtitle;
  $('objectives').innerHTML=variant.objectives.map(x=>`<li>${esc(x)}</li>`).join('');
  $('conceptText').innerHTML=variant.concept.map(x=>`<p>${esc(x)}</p>`).join('');
  $('steps').innerHTML=variant.steps.map(x=>`<li>${esc(x)}</li>`).join('');
  $('questions').innerHTML=variant.questions.map(x=>`<li>${esc(x)}</li>`).join('');
  $('criteria').innerHTML=variant.criteria.map(x=>`<li>${esc(x)}</li>`).join('');
  $('languageBadge').textContent=language==='python'?'Python':'Java';$('languageBadge').className=`language-badge ${language}`;
  if(language==='python'){
    $('engineLabel').textContent='Pyodide · Python real en navegador';$('runtimeBadge').textContent='Python sin cargar';$('terminalTitle').textContent='Python console';$('runButton').textContent='▶ Ejecutar Python';
    $('javaEvidence').classList.add('hidden');$('downloadJavaButton').classList.add('hidden');document.querySelector('.lab-pane').classList.remove('java-mode');
  }else{
    $('engineLabel').textContent='JDK workflow · análisis estructural + stdout real';$('runtimeBadge').textContent='Java · JDK externo';$('runtimeBadge').className='badge ready';$('terminalTitle').textContent='Java structure inspector';$('runButton').textContent='⌁ Analizar Java';
    $('javaEvidence').classList.remove('hidden');$('downloadJavaButton').classList.remove('hidden');document.querySelector('.lab-pane').classList.add('java-mode');
  }
}
function loadPendingState(){
  const r=moduleRecord();helps=Number(r.helps||0);wrongs=Number(r.wrongs||0);currentCode=r.code||variant.starter;
  $('codeEditor').value=currentCode;$('javaOutput').value='';executionCount=0;$('executionCount').textContent='[ ]';lastOutput='';lastError='';solutionVisible=false;
  $('solutionPanel').classList.add('hidden');$('skipButton').classList.toggle('hidden',wrongs<1);updateHelpUI();updateGrade();
}
function javaCommands(){return module?.id==='m14'?'javac -d . Main.java\njava ijr.Main':'javac Main.java\njava Main';}
function renderWorkspace(){
  $('setupPanel').classList.add('hidden');$('completionPanel').classList.add('hidden');$('workspacePanel').classList.remove('hidden');
  $('teamLabel').textContent=`${attempt.group} · ${attempt.label}`;$('routeLabel').textContent=`${language==='python'?'Python':'Java'} · ${levelLabel(module.level)} · ${module.routeOrder}/16`;
  renderGuide();loadPendingState();
  setStatus(language==='python'?'Completa WRITE_HERE, ejecuta Python y luego valida la salida.':'Completa WRITE_HERE, analiza la estructura, compila con tu JDK y pega stdout antes de validar.');
  clearTerminal(language==='python'?'Python todavía no se ha cargado. Se iniciará al ejecutar la primera celda.':`Java lab listo.\n1) Completa el código.\n2) Analiza la estructura.\n3) Descarga Main.java.\n4) Ejecuta en una terminal con JDK:\n${javaCommands()}\n5) Pega stdout y valida.`);
  moduleOpenedAt=Date.now();startTimer();enforceFullscreen();
}
function showCompletion(mode){
  clearInterval(timerHandle);$('workspacePanel').classList.add('hidden');$('setupPanel').classList.add('hidden');$('completionPanel').classList.remove('hidden');
  const r=moduleRecord(),next=nextModule(),modeLabel=mode==='solved'?'Resuelto por el equipo':mode==='revealed'?'Solución estudiada':'Continuado sin resolver';
  $('completionKicker').textContent=`${levelLabel(module.level)} · ${language.toUpperCase()} · ${modeLabel}`;$('completionTitle').textContent=`Módulo ${module.routeOrder} completado`;
  $('completionCopy').textContent=mode==='solved'?'El equipo produjo y validó la salida esperada. Antes de continuar, una persona del equipo debe ser capaz de explicar el flujo y modificar una parte en vivo.':mode==='revealed'?'La solución fue revelada para estudio. Compárenla con su intento y expliquen qué faltaba antes de continuar.':'El módulo quedó registrado sin resolver. Pueden volver después desde el mapa del curso para repasar el contenido.';
  $('completionMetrics').innerHTML=`<div><span>Crédito del módulo</span><strong>${Math.round(Number(r.awarded||0)*100)}%</strong></div><div><span>${attempt.final_grade!=null?'Nota final':'Proyección'}</span><strong>${fmt(attempt.final_grade??attempt.projected_grade)}</strong></div><div><span>Ruta</span><strong>${attempt.completed_count}/16</strong></div>`;
  const btn=$('nextModuleButton');if(next){btn.href=`lab.html?language=${language}&module=${next.id}`;btn.textContent=`Siguiente · ${next[language+'Title'].replace(/^.*?·\s*/,'')}`;}else{btn.href='./';btn.textContent='Curso completo · ver mapa';}
  if(cfg.requireFullscreen&&isFullscreen())document.exitFullscreen().catch(()=>{});
}
function showAlreadyCompleted(){const mode=completedMode();if(mode)showCompletion(mode);}
function startTimer(){
  clearInterval(timerHandle);
  const render=()=>{const sec=Math.floor((Date.now()-moduleOpenedAt)/1000),m=Math.floor(sec/60),s=sec%60;$('moduleTimer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} / ${module.time}:00`;$('moduleTimer').style.color=m>=module.time?'var(--red)':m>=Math.max(1,module.time-5)?'var(--amber)':'';};
  render();timerHandle=setInterval(render,1000);
}
async function ensurePython(){
  if(language!=='python')return null;if(pyodide)return pyodide;if(runtimePromise)return runtimePromise;
  runtimePromise=(async()=>{ $('runtimeBadge').textContent='Cargando Python…';$('runtimeBadge').className='badge loading';if(typeof window.loadPyodide!=='function')throw new Error('Pyodide no cargó. Revisa la conexión.');const py=await window.loadPyodide({indexURL:PYODIDE_INDEX});py.setStdin({stdin:()=>window.prompt('Python input:')??null});pyodide=py;$('runtimeBadge').textContent='Python listo';$('runtimeBadge').className='badge ready';appendTerminal('[system] Python 3 listo.');return py;})().catch(err=>{runtimePromise=null;$('runtimeBadge').textContent='Python no disponible';$('runtimeBadge').className='badge error';throw err;});
  return runtimePromise;
}
function unresolvedMarkers(code){return (code.match(/WRITE_HERE/g)||[]).length;}
async function runPython(){
  if(!enforceFullscreen())return;const code=$('codeEditor').value;if(!code.trim()){setStatus('La celda está vacía. Restablécela antes de continuar.','bad');return;}const markers=unresolvedMarkers(code);if(markers){setStatus(`Aún quedan ${markers} marcador(es) WRITE_HERE. Completa la celda antes de ejecutar.`,'bad');return;}
  $('runButton').disabled=$('runCellButton').disabled=true;
  try{const py=await ensurePython(),stdout=[],stderr=[];py.setStdout({batched:x=>stdout.push(x)});py.setStderr({batched:x=>stderr.push(x)});try{const result=await py.runPythonAsync(code);if(result!==undefined&&result!==null&&String(result)!=='None')stdout.push(String(result));if(result&&typeof result.destroy==='function')result.destroy();}catch(err){stderr.push(String(err?.message||err));}executionCount++;$('executionCount').textContent=`[${executionCount}]`;appendTerminal(`\nIn [${executionCount}]:`);if(stdout.length)appendTerminal(stdout.join('\n'));if(stderr.length)appendTerminal(`ERROR\n${stderr.join('\n')}`);lastOutput=stdout.join('\n').trim();lastError=stderr.join('\n').trim();if(lastError)setStatus('Python encontró un error. Léelo y corrige; los errores de sintaxis/ejecución no bajan la nota.','bad');else if(lastOutput)setStatus('Código ejecutado. Lee stdout, explica qué ocurrió y valida cuando estés listo.');else setStatus('El código corrió, pero no produjo salida. Revisa print(...).','bad');}catch(err){setStatus(`No se pudo iniciar Python: ${err.message}`,'bad');}finally{$('runButton').disabled=$('runCellButton').disabled=false;}
}
async function analyzeCurrentJava(){
  if(!enforceFullscreen())return;const code=$('codeEditor').value;executionCount++;$('executionCount').textContent=`[${executionCount}]`;const result=analyzeJava(code,variant);appendTerminal(`\nCheck [${executionCount}]:`);if(result.ok){appendTerminal(`✓ Estructura esperada encontrada.\nEl navegador no sustituye javac. Descarga Main.java y ejecuta:\n${javaCommands()}`);setStatus('Estructura Java lista. Ahora compila/ejecuta con el JDK, pega la salida real y valida.','ok');}else{appendTerminal('Estructura todavía incompleta:\n- '+result.issues.join('\n- '));setStatus('Hay problemas estructurales. Corrígelos; este análisis no penaliza la nota.','bad');}
}
async function runCurrent(){return language==='python'?runPython():analyzeCurrentJava();}
async function persistPending(){if(!attempt||completedMode())return;attempt=await store.updatePending(module.id,{helps,wrongs,code:$('codeEditor').value});updateGrade();}
async function useHelp(){if(!enforceFullscreen()||helps>=3||completedMode())return;helps++;updateHelpUI();await persistPending();setStatus(`Ayuda ${helps} registrada. La proyección máxima del módulo se ajustó. Lee la ayuda y vuelve al código.`);await store.event('HELP_USED',{module_key:module.id,help_level:helps,language});}
async function validateModule(){
  if(!enforceFullscreen()||completedMode())return;
  setStatus('La clave de validación fue retirada del repositorio público. Conserva la ejecución y solicita validación docente en el panel protegido.','bad');
  await store.event('SERVER_VALIDATION_REQUIRED',{module_key:module.id,language});
}
async function revealSolution(){
  if(!enforceFullscreen()||completedMode())return;
  setStatus('Las soluciones ya no se entregan desde el cliente público. Solicita revisión docente autenticada.','bad');
  await store.event('SOLUTION_ACCESS_BLOCKED',{module_key:module.id,language});
}
async function skipModule(){if(!enforceFullscreen()||completedMode()||wrongs<1)return;if(!confirm('Continuar sin resolver otorga 0% en este módulo. ¿Deseas avanzar?'))return;attempt=await store.recordModule(module.id,{mode:'skipped',helps,wrongs,code:$('codeEditor').value,language});await store.event('MODULE_SKIPPED',{module_key:module.id,language,helps,wrongs});updateGrade();showCompletion('skipped');}
function downloadJava(){const blob=new Blob([$('codeEditor').value],{type:'text/x-java-source;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Main.java';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);appendTerminal(`[system] Main.java descargado. Ejecuta con JDK:\n${javaCommands()}`);}
async function runConsole(e){
  e.preventDefault();if(language!=='python'||!enforceFullscreen())return;const input=$('consoleInput'),cmd=input.value.trim();if(!cmd)return;input.value='';appendTerminal(`>>> ${cmd}`);
  try{const py=await ensurePython(),out=[],err=[];py.setStdout({batched:x=>out.push(x)});py.setStderr({batched:x=>err.push(x)});try{const res=await py.runPythonAsync(cmd);if(res!==undefined&&res!==null&&String(res)!=='None')out.push(String(res));if(res&&typeof res.destroy==='function')res.destroy();}catch(ex){err.push(String(ex?.message||ex));}if(out.length)appendTerminal(out.join('\n'));if(err.length)appendTerminal('ERROR\n'+err.join('\n'));}catch(err){appendTerminal('ERROR\n'+err.message);}
}
async function beginSession(e){
  e.preventDefault();const names=namesFromForm(),group=$('groupCode').value;if(!group||names.some(n=>n.length<2)){setSetup('Completa el grupo y todos los nombres del equipo.',true);return;}const normalized=names.map(n=>n.toLocaleLowerCase('es').replace(/\s+/g,' ').trim());if(new Set(normalized).size!==normalized.length){setSetup('No repitas el mismo nombre dentro del equipo.',true);return;}
  if(cfg.requireFullscreen){if(!fullscreenSupported()){setSetup('Este navegador no permite el modo de pantalla completa requerido.',true);return;}if(!await enterFullscreen())return;}
  $('startButton').disabled=true;setSetup('Registrando equipo y preparando el módulo…');
  try{attempt=await store.start({language,group,names});setSetup('');renderWorkspace();await store.event('COURSE_SESSION_STARTED',{module_key:module.id,language,team_size:names.length});}
  catch(err){$('startButton').disabled=false;setSetup(`No fue posible iniciar: ${err.message}`,true);if(isFullscreen())document.exitFullscreen().catch(()=>{});}
}
function bind(){
  $('teamSize').addEventListener('change',updateTeamSize);updateTeamSize();$('registrationForm').addEventListener('submit',beginSession);$('runButton').addEventListener('click',runCurrent);$('runCellButton').addEventListener('click',runCurrent);$('validateButton').addEventListener('click',validateModule);$('helpButton').addEventListener('click',useHelp);$('revealButton').addEventListener('click',revealSolution);$('skipButton').addEventListener('click',skipModule);$('understoodButton').addEventListener('click',()=>showCompletion('revealed'));$('downloadJavaButton').addEventListener('click',downloadJava);$('clearTerminal').addEventListener('click',()=>clearTerminal(language==='python'?'Python console cleared.':'Java inspector cleared.'));$('consoleForm').addEventListener('submit',runConsole);
  $('resetCodeButton').addEventListener('click',()=>{if(!enforceFullscreen()||completedMode())return;$('codeEditor').value=variant.starter;lastOutput='';lastError='';executionCount=0;$('executionCount').textContent='[ ]';$('javaOutput').value='';setStatus('Código inicial restablecido. Las ayudas y errores ya registrados se conservan.');persistPending();});
  $('codeEditor').addEventListener('input',()=>{lastOutput='';lastError='';clearTimeout(saveTimer);saveTimer=setTimeout(persistPending,650);});
  $('codeEditor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const el=e.currentTarget,s=el.selectionStart,en=el.selectionEnd;el.setRangeText('    ',s,en,'end');}if((e.shiftKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();runCurrent();}});
  $('fullscreenButton').addEventListener('click',enterFullscreen);
  document.addEventListener('fullscreenchange',async()=>{if(!attempt||!cfg.requireFullscreen)return;if(isFullscreen()){$('fullscreenGate').classList.add('hidden');await store.event('FULLSCREEN_ENTER',{module_key:module.id});}else if(!$('workspacePanel').classList.contains('hidden')){$('fullscreenGate').classList.remove('hidden');await store.event('FULLSCREEN_EXIT',{module_key:module.id,visibility:document.visibilityState});}});
  document.addEventListener('visibilitychange',async()=>{if(!attempt)return;if(document.visibilityState==='hidden')await store.event('VISIBILITY_HIDDEN',{module_key:module.id});else enforceFullscreen();});
  window.addEventListener('beforeunload',e=>{if(attempt&&!completedMode()){e.preventDefault();e.returnValue='';}});
}
async function init(){
  bind();const response=await fetch('data/course-index.json',{cache:'no-store'});if(!response.ok)throw new Error(`No se pudo cargar course-index.json (${response.status})`);course=await response.json();
  const moduleMeta=course.modules.find(m=>m.id===requestedModule)||orderedModules()[0];const moduleResponse=await fetch(`data/${moduleMeta.path}`,{cache:'no-store'});if(!moduleResponse.ok)throw new Error(`No se pudo cargar ${moduleMeta.path} (${moduleResponse.status})`);module=await moduleResponse.json();
  attempt=await store.restore();if(attempt?.language)language=attempt.language;if(!['python','java'].includes(language))language='python';variant=module[language];renderGuide();updateBackendBadge();
  if(attempt){if(attempt.language!==language)language=attempt.language;variant=module[language];renderGuide();if(completedMode())showAlreadyCompleted();else renderWorkspace();}
  else{$('setupPanel').classList.remove('hidden');$('workspacePanel').classList.add('hidden');$('completionPanel').classList.add('hidden');}
}
init().catch(err=>{console.error(err);setSetup(`Error de carga: ${err.message}`,true);$('runtimeBadge').textContent='Error de curso';$('runtimeBadge').className='badge error';});
