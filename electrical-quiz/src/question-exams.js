// Repeated exam appearances share a permanent question ID and study history.
export function examAppearances(q,primary=q.year){
 return [...new Set([primary,...(q.appearances||[]).map(a=>a.exam)])];
}
