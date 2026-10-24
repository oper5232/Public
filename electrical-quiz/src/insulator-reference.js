import data from './insulator-reference.json';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function insulatorReferenceHtml(qid){
 const selected=data.relatedQuestions[qid];if(!selected)return '';
 const ordered=[...data.types].sort((a,b)=>(b.id===selected)-(a.id===selected));
 return `<details class="insulator-reference"><summary>현수애자 장치별 구성 비교 · 제공 이론 자료</summary><p>${escape(data.warning)}</p>${ordered.map(t=>`<details data-insulator-type="${escape(t.id)}" ${t.id===selected?'open':''}><summary>${escape(t.title)}</summary><ol>${t.items.map(item=>`<li>${escape(item)}</li>`).join('')}</ol>${t.note?`<p class="note">${escape(t.note)}</p>`:''}</details>`).join('')}<p class="tiny">${escape(data.scope)}</p></details>`;
}
