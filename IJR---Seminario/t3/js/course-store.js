import {completedCount, projectedGrade, finalGrade, telemetry, modulePotential} from './scoring-core.js';

function uuid(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);
  });
}
function now(){return new Date().toISOString();}
function normalizeName(v){return String(v||'').trim().replace(/\s+/g,' ');}
function teamLabel(names){return names.map(normalizeName).filter(Boolean).join(' · ');}

export class CourseStore{
  constructor(config){
    this.cfg=config;
    this.sb=null;
    this.backend='local';
    this.attempt=null;
    if(globalThis.supabase && config.backendMode!=='local'){
      try{
        this.sb=globalThis.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{
          auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
        });
      }catch(err){ console.warn('Supabase init failed; local fallback active.',err); }
    }
  }

  async rpc(name,args={}){
    if(!this.sb)throw new Error('Supabase client unavailable');
    const {data,error}=await this.sb.rpc(name,args);
    if(error)throw new Error(error.message||'Backend RPC error');
    return data;
  }

  _loadLocal(){
    try{
      const raw=localStorage.getItem(this.cfg.localKey);
      return raw?JSON.parse(raw):null;
    }catch{return null;}
  }
  _saveLocal(attempt){
    localStorage.setItem(this.cfg.localKey,JSON.stringify(attempt));
    this.attempt=attempt;
    return attempt;
  }
  _decorate(attempt){
    const records=attempt.records||{};
    return {
      ...attempt,
      completed_count:completedCount(records),
      projected_grade:projectedGrade(records),
      final_grade:completedCount(records)>=16?finalGrade(records):null,
      telemetry:telemetry(records)
    };
  }

  current(){ return this.attempt?this._decorate(this.attempt):null; }

  async restore(){
    const sessionRaw=sessionStorage.getItem(this.cfg.sessionKey);
    if(sessionRaw && this.sb){
      try{
        const s=JSON.parse(sessionRaw);
        const data=await this.rpc(this.cfg.rpc.resume,{p_attempt_id:s.attemptId,p_attempt_token:s.token});
        const attempt=this._fromBackend(data.snapshot||data,s.token);
        this.backend='supabase';
        this._saveLocal(attempt);
        return this.current();
      }catch(err){
        console.warn('Backend resume unavailable; local copy used.',err);
      }
    }
    const local=this._loadLocal();
    if(local){
      this.backend=local.backend||'local';
      this.attempt=local;
      return this.current();
    }
    return null;
  }

  _fromBackend(snapshot,token){
    const records={};
    for(const m of snapshot.modules||[]){
      records[m.module_key]={
        mode:m.completion_mode||'pending',
        helps:Number(m.help_count||0),
        wrongs:Number(m.wrong_count||0),
        awarded:Number(m.awarded_points||0),
        code:m.code_snapshot||'',
        completedAt:m.completed_at||null
      };
    }
    return {
      id:snapshot.attempt_id,
      token,
      backend:'supabase',
      courseSlug:snapshot.course_slug||this.cfg.courseSlug,
      language:snapshot.language,
      group:snapshot.group_code,
      names:(snapshot.participants||[]).map(p=>p.display_name),
      label:snapshot.team_label||snapshot.student_label||teamLabel((snapshot.participants||[]).map(p=>p.display_name)),
      startedAt:snapshot.started_at||now(),
      lastActivityAt:snapshot.last_activity_at||now(),
      restrictionEvents:Number(snapshot.restriction_events||0),
      records
    };
  }

  async start({language,group,names}){
    names=names.map(normalizeName).filter(Boolean);
    if(!['python','java'].includes(language))throw new Error('Selecciona Python o Java.');
    if(!/^11-[ABC]$/.test(group))throw new Error('Selecciona un grupo válido.');
    if(names.length<1 || names.length>3)throw new Error('Registra entre 1 y 3 estudiantes.');
    const norm=names.map(n=>n.toLocaleLowerCase('es'));
    if(new Set(norm).size!==norm.length)throw new Error('No repitas el mismo nombre dentro del equipo.');

    if(this.sb && this.cfg.backendMode!=='local'){
      try{
        const data=await this.rpc(this.cfg.rpc.start,{
          p_course_slug:this.cfg.courseSlug,
          p_language:language,
          p_student_names:names,
          p_group_code:group,
          p_session_id:uuid(),
          p_user_agent:navigator.userAgent
        });
        sessionStorage.setItem(this.cfg.sessionKey,JSON.stringify({attemptId:data.attempt_id,token:data.attempt_token}));
        const attempt=this._fromBackend(data.snapshot,data.attempt_token);
        this.backend='supabase';
        this._saveLocal(attempt);
        return this.current();
      }catch(err){
        console.warn('Supabase start unavailable; switching to local classroom mode.',err);
      }
    }

    const previous=this._loadLocal();
    const attempt={
      id:uuid(),token:null,backend:'local',courseSlug:this.cfg.courseSlug,
      language,group,names,label:teamLabel(names),startedAt:now(),lastActivityAt:now(),
      restrictionEvents:0,records:(previous?.language===language&&previous?.group===group&&previous?.label===teamLabel(names))?(previous.records||{}):{}
    };
    this.backend='local';
    this._saveLocal(attempt);
    return this.current();
  }

  async recordModule(moduleKey,{mode,helps=0,wrongs=0,code='',language}){
    if(!this.attempt)throw new Error('No active attempt');
    const local=this.attempt;
    const temp={mode,helps,wrongs,code,completedAt:now()};
    temp.awarded=modulePotential(temp);
    local.records=local.records||{};
    local.records[moduleKey]=temp;
    local.lastActivityAt=now();
    this._saveLocal(local);

    if(local.backend==='supabase' && local.token){
      try{
        const data=await this.rpc(this.cfg.rpc.recordModule,{
          p_attempt_id:local.id,
          p_attempt_token:local.token,
          p_module_key:moduleKey,
          p_completion_mode:mode,
          p_help_count:Number(helps)||0,
          p_wrong_count:Number(wrongs)||0,
          p_code_snapshot:String(code||'')
        });
        const updated=this._fromBackend(data.snapshot,local.token);
        this._saveLocal(updated);
      }catch(err){
        console.warn('Module saved locally; backend sync failed.',err);
        local.backend='local';
        this._saveLocal(local);
      }
    }
    return this.current();
  }

  async updatePending(moduleKey,{helps,wrongs,code}){
    if(!this.attempt)throw new Error('No active attempt');
    const local=this.attempt;
    const prev=local.records?.[moduleKey]||{};
    if(['solved','revealed','skipped'].includes(prev.mode))return this.current();
    local.records=local.records||{};
    local.records[moduleKey]={...prev,mode:'pending',helps:Number(helps)||0,wrongs:Number(wrongs)||0,code:String(code||''),updatedAt:now()};
    local.lastActivityAt=now();
    this._saveLocal(local);
    if(local.backend==='supabase' && local.token){
      try{
        await this.rpc(this.cfg.rpc.recordModule,{
          p_attempt_id:local.id,p_attempt_token:local.token,p_module_key:moduleKey,
          p_completion_mode:'pending',p_help_count:Number(helps)||0,p_wrong_count:Number(wrongs)||0,p_code_snapshot:String(code||'')
        });
      }catch(err){console.warn('Pending telemetry remains local.',err);}
    }
    return this.current();
  }

  async event(type,metadata={}){
    if(!this.attempt)return;
    if(type==='FULLSCREEN_EXIT'||type==='VISIBILITY_HIDDEN'){
      this.attempt.restrictionEvents=(Number(this.attempt.restrictionEvents)||0)+1;
      this._saveLocal(this.attempt);
    }
    if(this.attempt.backend==='supabase' && this.attempt.token){
      try{
        await this.rpc(this.cfg.rpc.event,{
          p_attempt_id:this.attempt.id,p_attempt_token:this.attempt.token,
          p_event_type:type,p_metadata:metadata
        });
      }catch(err){console.warn('Event stored only in browser.',err);}
    }
  }

  reset(){
    sessionStorage.removeItem(this.cfg.sessionKey);
    localStorage.removeItem(this.cfg.localKey);
    this.attempt=null;
    this.backend='local';
  }
}
