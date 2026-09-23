export const MODULE_COUNT = 16;

export function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }

export function modulePotential(record={}){
  const mode=record.mode||'pending';
  if(mode==='solved') return Number(record.awarded ?? solvedCredit(record.helps||0,record.wrongs||0));
  if(mode==='revealed') return 0.25;
  if(mode==='skipped') return 0;
  return solvedCredit(record.helps||0,record.wrongs||0);
}

export function solvedCredit(helps=0,wrongs=0){
  return Math.max(0.25, 1 - 0.20*clamp(Number(helps)||0,0,3) - 0.10*clamp(Number(wrongs)||0,0,3));
}

export function awardedPoints(records={}){
  return Object.values(records).reduce((sum,r)=>{
    if(!r || !r.mode || r.mode==='pending') return sum;
    return sum + modulePotential(r);
  },0);
}

export function projectedPoints(records={}){
  let sum=0;
  const keys=['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m13','m14','m11','m12','m15','m16'];
  for(const key of keys) sum += modulePotential(records[key]||{});
  return sum;
}

export function gradeFromPoints(points){
  return Math.round((1 + 4*(clamp(Number(points)||0,0,MODULE_COUNT)/MODULE_COUNT))*100)/100;
}

export function finalGrade(records={}){
  return gradeFromPoints(awardedPoints(records));
}

export function projectedGrade(records={}){
  return gradeFromPoints(projectedPoints(records));
}

export function completedCount(records={}){
  return Object.values(records).filter(r=>r && ['solved','revealed','skipped'].includes(r.mode)).length;
}

export function telemetry(records={}){
  return Object.values(records).reduce((acc,r)=>{
    if(!r)return acc;
    acc.helps += Number(r.helps)||0;
    acc.wrongs += Number(r.wrongs)||0;
    if(r.mode==='revealed')acc.revealed++;
    if(r.mode==='skipped')acc.skipped++;
    return acc;
  },{helps:0,wrongs:0,revealed:0,skipped:0});
}

export function normalizeOutput(text=''){
  return String(text).replace(/\r/g,'').trim().replace(/[ \t]+$/gm,'');
}

export function validateExpected(output, variant){
  const normalized=normalizeOutput(output);
  if(variant.expectedPattern) return normalized.includes(String(variant.expectedPattern));
  if(variant.expected==null) return normalized.length>0;
  return normalized===normalizeOutput(variant.expected);
}

export function analyzeJava(code='',variant={}){
  const issues=[];
  if(code.includes('WRITE_HERE')) issues.push('Aún hay marcadores WRITE_HERE.');
  const pairs=[['{','}'],['(',')'],['[',']']];
  for(const [a,b] of pairs){
    const ca=[...code].filter(c=>c===a).length, cb=[...code].filter(c=>c===b).length;
    if(ca!==cb)issues.push(`Desbalance de ${a}${b}: ${ca} / ${cb}.`);
  }
  for(const token of variant.checks||[]){
    if(token==='WRITE_HERE') continue;
    if(!code.includes(token)) issues.push(`Falta una estructura esperada: ${token}`);
  }
  if(!/\bclass\b/.test(code))issues.push('No se encontró una declaración class.');
  if(/\bpublic class Main\b/.test(code) && !/public\s+static\s+void\s+main\s*\(/.test(code)){
    issues.push('Main existe, pero falta el punto de entrada public static void main(...).');
  }
  return {ok:issues.length===0,issues};
}
