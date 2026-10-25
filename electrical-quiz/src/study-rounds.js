// Rounds are a view over immutable cumulative records, not a reset operation.
export function attemptCount(history,id){const n=Number(history[id]?.attempts);return Number.isFinite(n)&&n>0?Math.floor(n):0}
export function recommendedRound(questions,history){
 if(!questions.length)return 1;
 let minimum=1000000000;
 for(const q of questions)minimum=Math.min(minimum,attemptCount(history,q.id));
 return Math.min(1000000000,minimum+1);
}
export function validRound(value){const n=Number(value);return Number.isSafeInteger(n)&&n>=1&&n<=1000000000?n:null}
export function pendingInRound(q,history,target){return attemptCount(history,q.id)<(validRound(target)||1)}
export function availableQuestions(bank,retired){const excluded=new Set(retired.map(r=>r.id));return bank.filter(q=>!excluded.has(q.id))}
export function availableSession(session,available){
 if(!session?.ids?.length)return null;
 const allowed=new Set(available.map(q=>q.id)),ids=session.ids.filter(id=>allowed.has(id));
 if(!ids.length)return null;
 if(ids.length===session.ids.length)return session;
 const currentId=session.ids[session.pos],pos=ids.includes(currentId)?ids.indexOf(currentId):Math.min(ids.filter(id=>session.ids.indexOf(id)<session.pos).length,ids.length-1);
 const keep=map=>Object.fromEntries(Object.entries(map||{}).filter(([id])=>allowed.has(id)));
 return {...session,ids,pos,orders:keep(session.orders),answers:keep(session.answers),drafts:keep(session.drafts),revealed:keep(session.revealed)};
}
