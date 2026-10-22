import {planImport, reduceEvents, canonical, uuid, validateSession} from './core.js';
const DB='electrical-study-v3';
export class StudyStore {
  constructor(bank,onchange=()=>{}){this.bank=bank;this.owner='guest';this.events=[];this.session=null;this.onchange=onchange;this.listeners=new Set();this.channel=typeof BroadcastChannel==='function'?new BroadcastChannel(DB):null;if(this.channel)this.channel.onmessage=()=>this.reload();}
  async init(){
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('events',{keyPath:['owner','id']});d.createObjectStore('sessions',{keyPath:'owner'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await this.reload();
    let raw=null;try{raw=localStorage.getItem('electrical_construction_mcq_v1');}catch{this.legacyError='이전 localStorage에 접근할 수 없습니다. 기존 HTML의 JSON 백업을 가져오세요.';}
    const migrated=(await this.readAll('sessions')).some(s=>s.owner==='legacy-import-v1');
    if(raw&&!migrated){try{const old=JSON.parse(raw);const p=await planImport(old,this.bank,this.events);await this.add(p.events);
      if(old.session&&!this.session){const s={...old.session,id:old.session.id||uuid()};try{validateSession(s,new Set(this.bank.map(q=>q.id)));await this.saveSession(s);}catch{}}
      await new Promise((resolve,reject)=>{const tx=this.db.transaction('sessions','readwrite');tx.objectStore('sessions').put({owner:'legacy-import-v1',value:true});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    }catch(e){this.legacyError='기존 기록 자동 이전 실패: '+e.message;}}
    return this;
  }
  async readAll(store){return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async reload(){const owner=this.owner;const [rows,sessions]=await Promise.all([this.readAll('events'),this.readAll('sessions')]);if(owner!==this.owner)return;this.rows=rows.filter(e=>e.owner===owner);this.events=this.rows.map(({owner,synced,...e})=>e);this.session=sessions.find(s=>s.owner===owner)?.value??null;this.view=reduceEvents(this.events,this.bank);this.onchange();}
  async switchOwner(owner){this.owner=owner;await this.reload();}
  async add(events,{owner=this.owner,synced=false}={}){
    if(!events.length)return;
    await new Promise((resolve,reject)=>{
      const tx=this.db.transaction('events','readwrite'),s=tx.objectStore('events');
      for(const event of events){const r=s.get([owner,event.id]);r.onsuccess=()=>{
        const old=r.result;
        if(old){const {owner:ignored,synced:status,...payload}=old;if(canonical(payload)!==canonical(event)){tx.abort();return;}if(synced&&!old.synced)s.put({...old,synced:true});}
        else s.add({...event,owner,synced});
      };}
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('저장 실패'));tx.onabort=()=>reject(tx.error||Error('동일 이벤트 ID 충돌: 기존 기록은 유지됩니다.'));
    });
    if(owner===this.owner)await this.reload();this.channel?.postMessage({owner});for(const fn of this.listeners)fn();
  }
  async markSynced(id,owner){const rows=await this.readAll('events');const e=rows.find(x=>x.owner===owner&&x.id===id);if(!e)return;const {owner:o,synced:s,...event}=e;await this.add([event],{owner,synced:true});}
  async saveSession(value){const owner=this.owner;await new Promise((resolve,reject)=>{const tx=this.db.transaction('sessions','readwrite');tx.objectStore('sessions').put({owner,value});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});if(owner===this.owner)this.session=value;}
  async checkpoint(session){await this.saveSession(session);await this.add([{id:'session_'+uuid(),kind:'session',at:new Date().toISOString(),session:JSON.parse(JSON.stringify(session))}]);}
  async commitAnswer(session,event){
    const owner=this.owner;let result;
    await new Promise((resolve,reject)=>{const tx=this.db.transaction(['events','sessions'],'readwrite'),ss=tx.objectStore('sessions'),es=tx.objectStore('events');
      const read=ss.get(owner);read.onsuccess=()=>{const stored=read.result?.value;
        if(stored?.id===session.id&&stored.answers[event.qid]!==undefined){result=stored;return;}
        result=JSON.parse(JSON.stringify(stored?.id===session.id?stored:session));result.answers[event.qid]=event.choice;
        es.add({...event,owner,synced:false});ss.put({owner,value:result});
        es.add({id:'session_'+uuid(),kind:'session',at:event.at,session:result,owner,synced:false});
      };tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('채점 저장 실패'));
    });await this.reload();this.channel?.postMessage({owner});for(const fn of this.listeners)fn();return result;
  }
  pending(){return (this.rows||[]).filter(e=>!e.synced).length;}
  async guestEvents(){return (await this.readAll('events')).filter(e=>e.owner==='guest').map(({owner,synced,...e})=>e);}
  export(){return {format:'electrical-construction-quiz-events',version:3,exportedAt:new Date().toISOString(),events:this.events};}
  async resetGuest(){if(this.owner!=='guest')throw Error('로그인 기록은 초기화할 수 없습니다. JSON 백업을 보관하세요.');await new Promise((resolve,reject)=>{const tx=this.db.transaction(['events','sessions'],'readwrite');for(const row of this.rows)tx.objectStore('events').delete(['guest',row.id]);tx.objectStore('sessions').delete('guest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await this.reload();}
}
