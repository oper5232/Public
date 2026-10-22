import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertBankPreserved} from '../scripts/bank-preservation.mjs';
import {planImport,reduceEvents,attemptEvent,validateSession,validateEvent} from '../src/core.js';
const bank=JSON.parse(fs.readFileSync(new URL('../src/questions.json',import.meta.url)));
const session=()=>({id:'test-session',ids:['q001'],orders:{q001:[2,0,3,1]},answers:{},pos:0});
test('원본 189문항의 ID와 명시적 정정 외 모든 원본 필드 보존',()=>{
 assert.equal(assertBankPreserved(bank).length,189);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
});
test('중복 이벤트 전송은 한 번 집계, 새로운 풀이는 추가 집계',()=>{
 const s=session(),first=attemptEvent(s,bank[0],0);assert(first.correct);const next=attemptEvent(s,bank[0],1);const h=reduceEvents([first,first,next],bank).history.q001;
 assert.equal(h.attempts,2);assert.equal(h.correct,1);assert.equal(h.wrong,1);s.answers.q001=0;assert.equal(attemptEvent(s,bank[0],1),null);
});
test('서로 다른 기기의 이벤트를 순서에 관계없이 합산',()=>{
 const a=attemptEvent(session(),bank[0],0,'2026-10-01T12:00:00.000Z'),b=attemptEvent({...session(),id:'other'},bank[0],2,'2026-10-02T12:00:00.000Z');
 assert.deepEqual(reduceEvents([a,b],bank),reduceEvents([b,a,b],bank));assert.equal(reduceEvents([a,b],bank).history.q001.lastCorrect,false);
});
test('미응시는 한 번도 채점하지 않은 문항만',()=>{
 const events=bank.slice(0,10).map(q=>attemptEvent({id:'s',answers:{}},q,0));const view=reduceEvents(events,bank);assert.equal(bank.filter(q=>!view.history[q.id]?.attempts).length,179);
});
test('구버전 누적 기록과 미분류 풀이·별표 유지, 재가져오기 멱등성',async()=>{
 const raw={version:2,history:{q001:{attempts:10,correct:6,wrong:3,lastAt:'2026-09-01T00:00:00.000Z',lastCorrect:false},old:{attempts:1}},stars:['q001']};
 const p=await planImport(raw,bank);assert.equal(p.after,10);assert.deepEqual(p.unknown,['old']);assert.equal(reduceEvents(p.events,bank).history.q001.unknown,1);assert.deepEqual(reduceEvents(p.events,bank).stars,['q001']);
 const again=await planImport({...raw,exportedAt:'different'},bank,p.events);assert.equal(again.events.length,0);assert.equal(again.after,10);
 const fresh=attemptEvent(session(),bank[0],0);const v=reduceEvents([...p.events,fresh],bank);assert.equal(v.history.q001.attempts,11);
});
test('서로 겹치는 구버전 백업은 문항별 최대 누적치를 유지',async()=>{
 const a=await planImport({history:{q001:{attempts:4,correct:3,wrong:1}}},bank);
 const b=await planImport({history:{q001:{attempts:7,correct:5,wrong:2}}},bank,a.events);
 assert.equal(b.after,7);
});
test('v3 JSON 백업·복원은 클라우드 이벤트와 중복 집계되지 않음',async()=>{
 const a=attemptEvent(session(),bank[0],0),b=attemptEvent(session(),bank[0],2);
 const p=await planImport({format:'electrical-construction-quiz-events',version:3,events:[a,b,a]},bank,[a]);assert.equal(p.events.length,1);assert.equal(p.after,2);
});
test('오염된 기록과 ID 충돌은 적용 전에 거부',async()=>{
 await assert.rejects(planImport({history:{q001:{attempts:-1}}},bank));
 const a=attemptEvent(session(),bank[0],0);await assert.rejects(planImport({format:'electrical-construction-quiz-events',version:3,events:[a,{...a,correct:false}]},bank));
 assert.throws(()=>validateSession({...session(),orders:{q001:[0,0,2,3]}},new Set(['q001'])));
 assert.throws(()=>validateEvent({...a,choice:7}));
});
test('관심 문제 해제는 이전 백업의 별표로 부활하지 않음',async()=>{
 const p=await planImport({history:{},stars:['q001']},bank);
 const off={id:'star-off',kind:'star',qid:'q001',at:'2026-10-01T00:00:00.000Z',value:false};
 assert.deepEqual(reduceEvents([...p.events,off],bank).stars,[]);
});
test('새 문제 추가 후 기존 ID 기록과 최근 이력 보존',()=>{
 const e=attemptEvent(session(),bank[0],0),extended=[...bank,{...bank[0],id:'new-2021-1-01'}];
 assert.deepEqual(reduceEvents([e],bank).history,reduceEvents([e],extended).history);
 assert.equal(extended.filter(q=>!reduceEvents([e],extended).history[q.id]?.attempts).length,189);
});
test('추가한 문제의 정답 인덱스가 0이 아니어도 채점',()=>{const q={...bank[0],id:'extra',correct:2};assert.equal(attemptEvent({id:'s',answers:{}},q,2).correct,true);assert.equal(attemptEvent({id:'s',answers:{}},q,0).correct,false);});
