export const uuid = () => crypto.randomUUID();
const finite = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
export function normalizeHistory(history, bank) {
  if (!history || typeof history !== 'object' || Array.isArray(history)) throw Error('history 객체가 필요합니다.');
  const records = {}, unknown = [];
  const known = new Set(bank.map(q => q.id));
  for (const [id, h] of Object.entries(history)) {
    if (!known.has(id)) { unknown.push(id); continue; }
    if (!h || typeof h !== 'object') throw Error(`${id}: 기록 형식 오류`);
    const a = Number(h.attempts ?? 0), c = Number(h.correct ?? 0), w = Number(h.wrong ?? 0);
    if (![a,c,w].every(finite) || c+w > 1000000000) throw Error(`${id}: 풀이 횟수는 0 이상의 안전한 정수여야 합니다.`);
    const at = h.lastAt == null ? null : new Date(h.lastAt).toISOString();
    records[id] = {attempts:Math.max(a,c+w),correct:c,wrong:w,unknown:Math.max(0,a-c-w),lastAt:at,lastCorrect:typeof h.lastCorrect === 'boolean' ? h.lastCorrect : null};
  }
  return {records,unknown};
}
export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value === 'object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function validateEvent(e, known) {
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(e.id) || !['attempt','star','legacy','session'].includes(e.kind) || typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at))) throw Error('잘못된 학습 이벤트입니다.');
  if (e.kind !== 'session' && (typeof e.qid !== 'string' || e.qid.length>100 || (known && !known.has(e.qid)))) throw Error('등록되지 않은 문제 ID입니다.');
  if (e.kind === 'attempt' && (typeof e.correct !== 'boolean' || !Number.isInteger(e.choice) || e.choice<0 || e.choice>3 || typeof e.sessionId !== 'string')) throw Error('채점 이벤트 오류');
  if (e.kind === 'star' && typeof e.value !== 'boolean') throw Error('관심 문제 이벤트 오류');
  if (e.kind === 'legacy' && (![e.correct,e.wrong,e.unknown].every(finite) || e.correct+e.wrong+e.unknown>1000000000 || !(e.lastAt===null || typeof e.lastAt==='string'&&Number.isFinite(Date.parse(e.lastAt))) || ![true,false,null].includes(e.lastCorrect) || typeof e.star!=='boolean')) throw Error('이전 기록 이벤트 오류');
  if (e.kind === 'session') validateSession(e.session,known);
  return e;
}
export function validateSession(s,known) {
  if (!s || typeof s.id!=='string' || !/^[\w-]{1,100}$/.test(s.id) || !Array.isArray(s.ids) || !s.ids.length || s.ids.length>3000 || new Set(s.ids).size!==s.ids.length || !s.answers || !s.orders || !Number.isInteger(s.pos) || s.pos<0 || s.pos>=s.ids.length) throw Error('시험 데이터 오류');
  for (const id of s.ids) {
    if (typeof id!=='string' || known && !known.has(id) || !Array.isArray(s.orders[id]) || [...s.orders[id]].sort().join(',')!=='0,1,2,3') throw Error('시험 문항/선택지 오류');
  }
  for (const [id,a] of Object.entries(s.answers)) if(!s.ids.includes(id) || !Number.isInteger(a)||a<0||a>3) throw Error('시험 답안 오류');
  return s;
}
export function reduceEvents(events, bank) {
  const history={}, stars=new Map(), baseline={}, seen=new Set(), known=new Set(bank.map(q=>q.id));
  const sorted=[...events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
  let latestSession=null;
  for(const e of sorted) {
    if(seen.has(e.id))continue; seen.add(e.id);
    if(e.kind==='session'){latestSession=e.session;continue;}
    if(!known.has(e.qid))continue;
    const h=history[e.qid]??={attempts:0,correct:0,wrong:0,unknown:0,recent:[],lastAt:null,lastCorrect:null};
    if(e.kind==='legacy') {
      const b=baseline[e.qid]??={correct:0,wrong:0,unknown:0};
      for(const key of ['correct','wrong','unknown']) b[key]=Math.max(b[key],e[key]);
      if(e.lastAt && (!h.lastAt||e.lastAt>=h.lastAt)){h.lastAt=e.lastAt;h.lastCorrect=e.lastCorrect;}
      if(e.star && !stars.has(e.qid))stars.set(e.qid,true);
    } else if(e.kind==='attempt') {
      h.correct+=Number(e.correct);h.wrong+=Number(!e.correct);
      h.recent.push({id:e.id,at:e.at,correct:e.correct,choice:e.choice});
      if(!h.lastAt || e.at>=h.lastAt){h.lastAt=e.at;h.lastCorrect=e.correct;}
    } else if(e.kind==='star') stars.set(e.qid,e.value);
  }
  for(const [id,h] of Object.entries(history)){
    const b=baseline[id];if(b)for(const k of ['correct','wrong','unknown'])h[k]+=b[k];
    h.attempts=h.correct+h.wrong+h.unknown;h.accuracy=h.attempts?h.correct/h.attempts*100:0;
    h.recent=h.recent.slice(-20);h.status=h.attempts?'attempted':'unseen';
    h.needsReview=h.lastCorrect===false;
    h.repeatWrong=h.recent.filter(x=>!x.correct).length>=2;
    h.reviewPriority=(h.needsReview?100:0)+(100-h.accuracy)+h.recent.filter(x=>!x.correct).length*10;
  }
  return {history,stars:[...stars].filter(([,v])=>v).map(([k])=>k),latestSession};
}
export async function planImport(raw,bank,existing=[]) {
  const known=new Set(bank.map(q=>q.id));let events=[], unknown=[];
  if(raw?.format==='electrical-construction-quiz-events' && raw.version===3) {
    if(!Array.isArray(raw.events)||raw.events.length>100000)throw Error('이벤트 백업 크기/형식 오류');
    const ids=new Map();
    for(const e of raw.events){validateEvent(e);if(e.kind!=='session'&&!known.has(e.qid)){unknown.push(e.qid);continue;}if(e.kind==='session'){try{validateSession(e.session,known)}catch{continue}}
      if(ids.has(e.id)&&canonical(ids.get(e.id))!==canonical(e))throw Error('동일 ID에 서로 다른 이벤트가 있습니다.');ids.set(e.id,e);}
    events=[...ids.values()];
  }else{
    const normalized=normalizeHistory(raw?.history,bank);unknown=normalized.unknown;
    const stars=new Set(Array.isArray(raw.stars)?raw.stars.filter(x=>known.has(x)):[]);
    const ids=new Set([...Object.keys(normalized.records),...stars]);
    for(const qid of ids){
      const h=normalized.records[qid]??{correct:0,wrong:0,unknown:0,lastAt:null,lastCorrect:null};
      const payload={kind:'legacy',qid,correct:h.correct,wrong:h.wrong,unknown:h.unknown,lastAt:h.lastAt,lastCorrect:h.lastCorrect,star:stars.has(qid)};
      events.push({...payload,id:'legacy_'+await digest(payload),at:h.lastAt??'1970-01-01T00:00:00.000Z'});
    }
  }
  const old=new Map(existing.map(e=>[e.id,e]));
  for(const e of events)if(old.has(e.id)&&canonical(old.get(e.id))!==canonical(e))throw Error('기존 이벤트와 ID 충돌이 발생했습니다.');
  const added=events.filter(e=>!old.has(e.id));
  const before=reduceEvents(existing,bank),after=reduceEvents([...existing,...added],bank);
  const total=s=>Object.values(s.history).reduce((n,h)=>n+h.attempts,0);
  return {events:added,unknown:[...new Set(unknown)],duplicates:events.length-added.length,before:total(before),after:total(after),questions:new Set(added.filter(e=>e.qid).map(e=>e.qid)).size,legacy:raw?.version!==3};
}
export function attemptEvent(session,q,choice,at=new Date().toISOString()) {
  if(session.answers[q.id]!==undefined)return null;
  if(!Number.isInteger(choice)||choice<0||choice>3)throw Error('선택지 오류');
  return {id:'attempt_'+uuid(),kind:'attempt',qid:q.id,sessionId:session.id,choice,correct:choice===q.correct,at};
}
