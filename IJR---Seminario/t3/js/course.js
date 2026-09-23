import {CourseStore} from './course-store.js';

const cfg=window.IJR_SEMINAR_T3_CONFIG,$=id=>document.getElementById(id);
const store=new CourseStore(cfg);
let course=null,selectedLanguage='python',attempt=null;

const levelMeta={
  basic:{label:'Básico',copy:'Entorno, datos, decisiones, repetición, colecciones, funciones y primeros objetos.'},
  medium:{label:'Medio',copy:'Estado, encapsulamiento, excepciones, depuración y organización de proyectos.'},
  advanced:{label:'Avanzado',copy:'Herencia, polimorfismo, abstracción, composición y proyectos integradores.'}
};
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusOf(id){
  const r=attempt?.records?.[id];
  if(!r)return {label:'Pendiente',cls:''};
  if(r.mode==='solved')return {label:'Resuelto',cls:'done'};
  if(r.mode==='revealed')return {label:'Solución estudiada',cls:'revealed'};
  if(r.mode==='skipped')return {label:'Omitido',cls:'skipped'};
  return {label:'En progreso',cls:''};
}
function firstPending(){
  return [...course.modules].sort((a,b)=>a.routeOrder-b.routeOrder).find(m=>!['solved','revealed','skipped'].includes(attempt?.records?.[m.id]?.mode))||course.modules.at(-1);
}
function renderSummary(){
  const box=$('sessionSummary');
  if(!attempt){
    box.innerHTML='<span><strong>Sin sesión activa.</strong> El registro de 1–3 estudiantes se realiza al abrir el primer laboratorio.</span>';
    $('continueButton').href=`lab.html?language=${selectedLanguage}&module=m01`;
    $('continueButton').textContent='Comenzar ruta';
    $('backendLabel').textContent='Modo local listo · Supabase se usa cuando el backend está disponible';
    return;
  }
  const label=attempt.final_grade!=null?'Nota final':'Proyección';
  box.innerHTML=`<span><strong>${esc(attempt.group)} · ${esc(attempt.label)}</strong></span><span>${attempt.completed_count}/16 módulos</span><span>${label}: <strong>${Number(attempt.final_grade??attempt.projected_grade).toFixed(2)}</strong></span><span>Registro: ${attempt.backend==='supabase'?'en vivo':'local'}</span>`;
  const next=firstPending();
  $('continueButton').href=`lab.html?language=${attempt.language}&module=${next.id}`;
  $('continueButton').textContent=attempt.completed_count>=16?'Revisar curso':'Continuar curso';
  $('backendLabel').textContent=attempt.backend==='supabase'?'Supabase · sesión sincronizada':'Modo local · progreso guardado en este navegador';
}
function renderRoadmap(){
  $('roadmap').innerHTML=['basic','medium','advanced'].map(level=>{
    const meta=levelMeta[level],mods=course.modules.filter(m=>m.level===level).sort((a,b)=>a.routeOrder-b.routeOrder);
    return `<section class="level-block">
      <div class="level-head"><div><span class="level-chip ${level}">${meta.label}</span><h3>${meta.label}</h3><p>${meta.copy}</p></div><strong>${mods.length} módulos</strong></div>
      <div class="module-grid">${mods.map(m=>{
        const v={title:m[selectedLanguage+'Title'],subtitle:m[selectedLanguage+'Subtitle']},st=statusOf(m.id),record=attempt?.records?.[m.id],locked=attempt&&attempt.language!==selectedLanguage;
        return `<article class="module-card">
          <div class="module-meta"><span class="module-number">${String(m.routeOrder).padStart(2,'0')} · guía ${m.guide}</span><span class="module-status ${st.cls}">${st.label}</span></div>
          <h4>${esc(v.title.replace(/^.*?·\s*/,''))}</h4><p>${esc(v.subtitle)}</p>
          <div class="module-meta"><span>${m.time} min aprox.</span><span>${record?`A ${record.helps||0}/3 · E ${record.wrongs||0}`:'3 ayudas'}</span></div>
          ${locked?'<button class="module-open" disabled>Ruta activa diferente</button>':`<button class="module-open" data-open="${m.id}">${st.label==='Pendiente'?'Abrir laboratorio':'Revisar módulo'}</button>`}
        </article>`;
      }).join('')}</div>
    </section>`;
  }).join('');
  document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>location.href=`lab.html?language=${selectedLanguage}&module=${btn.dataset.open}`));
}
function setLanguage(lang){
  selectedLanguage=lang;
  document.querySelectorAll('[data-language]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.language===lang);btn.setAttribute('aria-pressed',btn.dataset.language===lang?'true':'false');});
  $('routeRuntimeCopy').innerHTML=lang==='python'
    ? '<strong>Python:</strong> ejecución real dentro del navegador con Pyodide, consola compartida y stdout/stderr.'
    : '<strong>Java:</strong> editor guiado, análisis estructural, descarga de <code>Main.java</code> y validación del stdout producido con JDK.';
  renderSummary();renderRoadmap();
}
async function init(){
  const r=await fetch('data/course-index.json',{cache:'no-store'});if(!r.ok)throw new Error(`course-index.json HTTP ${r.status}`);
  course=await r.json();attempt=await store.restore();if(attempt?.language)selectedLanguage=attempt.language;
  $('qualityRule').textContent=course.course.qa;
  $('practiceTotal').textContent=`${course.modules.reduce((s,m)=>s+m.time,0)} min`;
  setLanguage(selectedLanguage);
}
document.querySelectorAll('[data-language]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.language)));
$('resetProgress').addEventListener('click',()=>{if(confirm('¿Eliminar el progreso guardado en este navegador? Los registros ya enviados a Supabase no se borran.')){store.reset();attempt=null;setLanguage(selectedLanguage);}});
init().catch(err=>$('roadmap').innerHTML=`<div class="level-block"><strong>No fue posible cargar el curso.</strong><p>${esc(err.message)}</p></div>`);
