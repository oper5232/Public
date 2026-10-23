import data from './practical.json';
import notes from '../sources/practical-notes.json';
import {examAppearances} from './question-exams.js';

export function practicalQuestion(q){
 // New IDs remain usable until an editor supplies a tailored practical variant.
 return data[q.id]||{kind:'short',prompt:q.originalQuestion||q.question,basisAnswer:q.options[q.correct],fields:[{label:'답안',answer:q.options[q.correct]}]};
}
export function sessionFormat(s){return s?.format==='practical'||s?.id?.startsWith('practical_')?'practical':'mcq'}
export function practicalReference(q){return practicalQuestion(q).fields.map(f=>`${f.label}: ${f.answer}`).join('\n')}
export function practicalSource(q){const p=practicalQuestion(q);const ids=[p.source?.id,...(q.appearances||[]).map(a=>a.sourceId)];return ids.map(id=>notes.sections.find(s=>s.id===id)).filter(Boolean).map(s=>`${s.exam}\n${s.excerpt}${s.editorialNote?'\n편집 주석: '+s.editorialNote:''}`).join('\n\n')}
export function questionYear(q,format='mcq'){return format==='practical'?practicalQuestion(q).source?.exam||q.year:q.year}
export function questionExams(q,format='mcq'){return examAppearances(q,questionYear(q,format))}
