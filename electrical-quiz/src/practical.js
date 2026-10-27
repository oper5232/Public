import data from './practical.json';
import notes from '../sources/practical-notes.json';
import {examAppearances,practicalForExam} from './question-exams.js';

export function practicalQuestion(q,exam){
 // New IDs remain usable until an editor supplies a tailored practical variant.
 // Practical-bank questions carry their own written-answer form.
 const base=q.practical||data[q.id]||{kind:'short',prompt:q.originalQuestion||q.question,basisAnswer:q.options[q.correct],fields:[{label:'답안',answer:q.options[q.correct]}]};
 return practicalForExam(q,base,exam);
}
export function sessionFormat(s){return s?.format==='practical'||s?.id?.startsWith('practical_')?'practical':'mcq'}
export function practicalReference(q,exam){return practicalQuestion(q,exam).fields.map(f=>`${f.label}: ${f.answer}`).join('\n')}
export function practicalSource(q,exam){const p=practicalQuestion(q,exam);const ids=exam?[p.source?.id]:[p.source?.id,...(q.appearances||[]).map(a=>a.sourceId)];return [...new Set(ids)].map(id=>notes.sections.find(s=>s.id===id)).filter(Boolean).map(s=>`${s.exam}\n${s.excerpt}${s.editorialNote?'\n편집 주석: '+s.editorialNote:''}`).join('\n\n')}
export function questionYear(q,format='mcq'){return format==='practical'?practicalQuestion(q).source?.exam||q.year:q.year}
export function questionExams(q,format='mcq'){return examAppearances(q,questionYear(q,format))}
