import data from './practical.json';
import notes from '../sources/practical-notes.json';

export function practicalQuestion(q){
 // New IDs remain usable until an editor supplies a tailored practical variant.
 return data[q.id]||{kind:'short',prompt:q.originalQuestion||q.question,basisAnswer:q.options[q.correct],fields:[{label:'답안',answer:q.options[q.correct]}]};
}
export function sessionFormat(s){return s?.format==='practical'||s?.id?.startsWith('practical_')?'practical':'mcq'}
export function practicalReference(q){return practicalQuestion(q).fields.map(f=>`${f.label}: ${f.answer}`).join('\n')}
export function practicalSource(q){const p=practicalQuestion(q);return notes.sections.find(s=>s.id===p.source?.id)?.excerpt||''}
export function questionYear(q,format='mcq'){return format==='practical'?practicalQuestion(q).source?.exam||q.year:q.year}
