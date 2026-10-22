import fs from 'node:fs';
import assert from 'node:assert/strict';
const bank=JSON.parse(fs.readFileSync(new URL('../src/questions.json',import.meta.url)));
const ids=new Set();
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const diagramKeys=new Set([...app.matchAll(/^\s*(\w+):\s*`<svg/gm)].map(m=>m[1]));
for(const q of bank){assert.match(q.id,/^[a-zA-Z0-9_-]+$/);assert(!ids.has(q.id),`중복 ID ${q.id}`);ids.add(q.id);assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4,q.id);for(const k of ['question','explain','year','category'])assert.equal(typeof q[k],'string');assert(q.question&&q.explain);assert(q.source&&q.verification);assert(Number.isInteger(q.examYear)&&Number.isInteger(q.round),`${q.id} 연도/회차 오류`);assert(q.originalQuestion===null||typeof q.originalQuestion==='string');assert(q.diagram===null||diagramKeys.has(q.diagram),`${q.id} 없는 도면 키 ${q.diagram}`);}
const html=fs.readFileSync(new URL('../backups/original.html',import.meta.url),'utf8');
const original=JSON.parse(html.match(/id="questionData">([\s\S]*?)<\/script>/)[1]);
for(const old of original){const q=bank.find(q=>q.id===old.id);assert(q,`기존 문항 삭제 ${old.id}`);for(const key of Object.keys(old))assert.deepEqual(q[key],old[key],`${old.id} 원본 변경 ${key}`);}
const oldIds=new Set(original.map(q=>q.id));
for(const q of bank.filter(q=>!oldIds.has(q.id)))assert(!bank.some(other=>other.id!==q.id&&other.question.normalize('NFKC').trim()===q.question.normalize('NFKC').trim()),`${q.id} 동일 문구의 신규 중복 문제`);
console.log(`${bank.length}문항 · 고유 ID ${ids.size}개 · 기존 ${original.length}문항의 문제/정답/해설/도면 보존 확인`);
