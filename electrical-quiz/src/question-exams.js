// Repeated exam appearances share a permanent question ID and study history.
export function examAppearances(q,primary=q.year){
 return [...new Set([primary,...(q.appearances||[]).map(a=>a.exam)])];
}
// An appearance can have a different numbered figure while sharing the same
// canonical correct choice/ID. These are presentation overrides only.
export function questionForExam(q,exam){
 const a=q?.appearances?.find(a=>a.exam===exam);if(!a)return q;
 const view={...q};for(const k of ['question','diagram','explain'])if(a[k]!==undefined)view[k]=a[k];
 if(a.verification)view.verification={...q.verification,...a.verification};
 return view;
}
export function practicalForExam(q,base,exam){
 const a=q.appearances?.find(a=>a.exam===exam);if(!a)return base;
 return {...base,...a.practical,basisAnswer:base.basisAnswer,source:{...base.source,id:a.sourceId,exam:a.exam}};
}
