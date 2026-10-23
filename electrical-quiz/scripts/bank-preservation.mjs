import fs from 'node:fs';
import assert from 'node:assert/strict';

// Explicit corrections are auditable; every other original field stays protected.
export function assertBankPreserved(bank){
 const html=fs.readFileSync(new URL('../backups/original.html',import.meta.url),'utf8');
 const original=JSON.parse(html.match(/id="questionData">([\s\S]*?)<\/script>/)[1]);
 const corrections=JSON.parse(fs.readFileSync(new URL('../src/question-corrections.json',import.meta.url),'utf8'));
 for(const [id,entry] of Object.entries(corrections)){
  const old=original.find(q=>q.id===id);
  assert(old,`정정 대상 원본 없음 ${id}`);
  assert(entry.date&&entry.authority&&entry.reason,`정정 근거 없음 ${id}`);
  for(const [key,change] of Object.entries(entry.changes)){
   assert(['year','question','options','explain'].includes(key),`허용되지 않은 정정 필드 ${id}.${key}`);
   if(key==='year')assert.match(change.after,/^\d{4}-\d+회$/,`회차 정정 형식 오류 ${id}`);
   assert.deepEqual(change.before,old[key],`정정 전 원본 불일치 ${id}.${key}`);
  }
 }
 for(const old of original){
  const now=bank.find(q=>q.id===old.id);assert(now,`기존 문항 삭제 ${old.id}`);
  for(const key of Object.keys(old)){
   const change=corrections[old.id]?.changes[key];
   assert.deepEqual(now[key],change?change.after:old[key],`${old.id} 승인되지 않은 변경 ${key}`);
  }
 }
 return original;
}
