import fs from 'node:fs';
import assert from 'node:assert/strict';
import {assertBankPreserved} from './bank-preservation.mjs';
import {questionFigures} from '../src/question-figures.js';
import {availableQuestions} from '../src/study-rounds.js';
const bank=JSON.parse(fs.readFileSync(new URL('../src/questions.json',import.meta.url)));
const practical=JSON.parse(fs.readFileSync(new URL('../src/practical.json',import.meta.url)));
const sources=JSON.parse(fs.readFileSync(new URL('../sources/practical-notes.json',import.meta.url)));
const retired=JSON.parse(fs.readFileSync(new URL('../src/retired-questions.json',import.meta.url)));
const ids=new Set();
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const diagramKeys=new Set([...Object.keys(questionFigures),...[...app.matchAll(/^\s*(\w+):\s*`<svg/gm)].map(m=>m[1])]);
for(const q of bank){assert.match(q.id,/^[a-zA-Z0-9_-]+$/);assert(!ids.has(q.id),`중복 ID ${q.id}`);ids.add(q.id);assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4,q.id);for(const k of ['question','explain','year','category'])assert.equal(typeof q[k],'string');assert(q.question&&q.explain);assert(q.source&&q.verification);assert(Number.isInteger(q.examYear)&&Number.isInteger(q.round),`${q.id} 연도/회차 오류`);assert(q.originalQuestion===null||typeof q.originalQuestion==='string');assert(q.diagram===null||diagramKeys.has(q.diagram),`${q.id} 없는 도면 키 ${q.diagram}`);}
const original=assertBankPreserved(bank);
for(const q of bank){assert.equal(q.year,`${q.examYear}-${q.round}회`,`${q.id} 회차 필드 불일치`);assert.equal(q.source.exam,q.year,`${q.id} 출처 회차 불일치`);}
for(const q of bank){
 const refs=new Set();for(const a of q.appearances||[]){
  assert(/^\d{4}-\d+회$/.test(a.exam),`${q.id} 출처 회차 오류`);
  assert(!refs.has(a.exam),`${q.id} 중복 출처 회차`);refs.add(a.exam);
  assert(sources.sections.some(s=>s.id===a.sourceId&&s.exam===a.exam&&s.questionIds.includes(q.id)),`${q.id} 추가 회차 출처 누락`);
  if(a.diagram!==undefined)assert(a.diagram===null||diagramKeys.has(a.diagram),`${q.id} 회차별 도면 오류`);
  for(const key of ['question','explain'])if(a[key]!==undefined)assert(typeof a[key]==='string'&&a[key],`${q.id} 회차별 문구 오류`);
  if(a.practical){
   assert(Object.keys(a.practical).every(k=>['kind','prompt','fields','notes'].includes(k)),`${q.id} 회차별 실기에 정답 인덱스/ID 변경은 불가`);
   assert(a.practical.kind===undefined||a.practical.kind===practical[q.id].kind,`${q.id} 회차별 실기 유형은 기본 유형과 같아야 합니다`);
   if(a.practical.fields)assert(a.practical.fields.length>0&&a.practical.fields.length<=10&&a.practical.fields.every(f=>f.label&&f.answer),`${q.id} 회차별 실기 필드 오류`);
  }
  if(a.verification)assert(Array.isArray(a.verification.notes)&&a.verification.notes.every(s=>typeof s==='string'),`${q.id} 회차별 검증 메모 오류`);
 }
}
for(const [id,p] of Object.entries(practical)){
 const q=bank.find(q=>q.id===id);assert(q,`실기 연결 ID 없음 ${id}`);
 assert(['short','blank'].includes(p.kind)&&p.prompt,`${id} 실기 유형/질문 오류`);
 assert(p.fields.length>0&&p.fields.length<=10&&p.fields.every(f=>f.label&&f.answer),`${id} 실기 답안 오류`);
 assert.equal(p.basisAnswer,q.options[q.correct],`${id} 객관식 정정 이후 실기 대조 필요`);
 assert(sources.sections.some(s=>s.id===p.source.id&&s.exam===p.source.exam&&s.questionIds.includes(id)),`${id} 실기 출처 연결 오류`);
}
for(const old of original)assert(practical[old.id],`기존 문항 실기 매핑 누락 ${old.id}`);
const oldIds=new Set(original.map(q=>q.id));
for(const q of bank.filter(q=>!oldIds.has(q.id)))assert(!bank.some(other=>other.id!==q.id&&other.question.normalize('NFKC').trim()===q.question.normalize('NFKC').trim()),`${q.id} 동일 문구의 신규 중복 문제`);
assert.equal(new Set(retired.map(q=>q.id)).size,retired.length,'출제 제외 ID 중복');
for(const r of retired)assert(ids.has(r.id)&&r.reason&&/^\d{4}-\d{2}-\d{2}$/.test(r.retiredAt),'출제 제외 근거/ID 오류');
const available=availableQuestions(bank,retired);assert(available.length>0);
console.log(`출제 ${available.length}문항 · 제외 ${retired.length}문항 기록 보관 · 고유 ID ${ids.size}개 · 명시적 정정 외 기존 ${original.length}문항 보존 확인`);
