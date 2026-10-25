import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recommendedRound,pendingInRound,validRound,availableQuestions,availableSession} from '../src/study-rounds.js';
import {reduceEvents,planImport,validateSession} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=read('../src/questions.json'),retired=read('../src/retired-questions.json'),active=availableQuestions(bank,retired),report=read('../sources/retirement-report.json');
const pair=[{id:'a'},{id:'b'}];
test('2회독:1회는 미응시,2회 이상은 완료; 누적 기록을 수정하지 않음',()=>{
 const history={a:{attempts:1,correct:0,wrong:1},b:{attempts:3,correct:2,wrong:1}},before=JSON.stringify(history);
 assert.equal(recommendedRound(pair,history),2);assert(pendingInRound(pair[0],history,2));assert(!pendingInRound(pair[1],history,2));assert.equal(JSON.stringify(history),before);
 assert.equal(recommendedRound(pair,{}),1);assert.equal(recommendedRound(pair,{a:{attempts:2},b:{attempts:2}}),3);
 assert.equal(recommendedRound([],{}),1);assert.equal(validRound(1.2),null);assert.equal(validRound(0),null);assert.equal(validRound('3'),3);
});
test('회차/분야 범위의 최소 풀이 횟수로 자동 회독을 제안',()=>{
 const history={a:{attempts:2},b:{attempts:0}};
 assert.equal(recommendedRound(pair,history),1);assert.equal(recommendedRound([pair[0]],history),3);
});
test('두 기기의 고유 이벤트 합산·재전송 중복 제외 후 회독 판정',()=>{
 const event=(id,qid,correct)=>({id,kind:'attempt',qid,correct,choice:0,sessionId:id,at:'2026-10-25T00:00:00Z'});
 const a=event('phone','a',false),b=event('pc','a',true),c=event('other','b',true);
 const view=reduceEvents([a,b,a,c],pair);assert.equal(view.history.a.attempts,2);assert.equal(view.history.a.wrong,1);assert.equal(view.history.a.correct,1);assert(!pendingInRound(pair[0],view.history,2));assert(pendingInRound(pair[1],view.history,2));
 assert.deepEqual(reduceEvents([c,a,b],pair).history,view.history);
 assert.equal(Object.keys(reduceEvents([a,b,c],pair,{format:'practical'}).history).length,0);
});
test('사용자가 지정한9개 원문 문제 그룹만 유지:신규12개+공유MD, 출제245',()=>{
 assert.equal(retired.length,24);assert.equal(active.length,245);assert.equal(bank.length,269);
 const activeIds=new Set(active.map(q=>q.id));
 for(const id of Object.keys(report.keptNew))assert(activeIds.has(id),id);
 for(const id of report.retiredIds)assert(!activeIds.has(id),id);
 assert(activeIds.has('ec-2022-2-symbol-002'));assert(active.some(q=>q.id==='ec-2024-1-book4-001'&&q.year==='2024-1회'));
 assert(active.some(q=>q.id==='ec-2023-2-book4-004'&&q.year==='2023-2회'));
});
test('제외 문항도 기존JSON 가져오기·중복 제외·누적 통계에서 보존',async()=>{
 const qid=retired[0].id;const raw={version:2,history:{[qid]:{attempts:5,correct:3,wrong:2},q001:{attempts:1,correct:1,wrong:0}},stars:[qid]};
 const first=await planImport(raw,bank,[]);assert.equal(first.unknown.length,0);const view=reduceEvents(first.events,bank);assert.equal(view.history[qid].attempts,5);assert(view.stars.includes(qid));
 const second=await planImport(raw,bank,first.events);assert.equal(second.events.length,0);assert.equal(Object.values(view.history).reduce((n,h)=>n+h.attempts,0),6);
});
test('진행 중/원격 시험의 제외 문항만 걸러도 답안·위치·회독·기록은 유지',()=>{
 const removed=retired[0].id,kept=['q001','q002'];
 const s={id:'practical_old',format:'practical',studyRound:2,ids:[removed,...kept],pos:1,answers:{[removed]:0,q001:0},orders:Object.fromEntries([removed,...kept].map(id=>[id,[0,1,2,3]])),drafts:{[removed]:['old'],'q001':['saved']},revealed:{[removed]:true,q001:true}};
 const before=JSON.stringify(s),usable=availableSession(s,active);assert.deepEqual(usable.ids,kept);assert.equal(usable.pos,0);assert.deepEqual(usable.drafts,{q001:['saved']});assert.equal(usable.studyRound,2);validateSession(usable,new Set(bank.map(q=>q.id)));assert.equal(JSON.stringify(s),before);
 assert.equal(availableSession({...s,ids:[removed],pos:0},active),null);
 assert.throws(()=>validateSession({...usable,studyRound:0},new Set(bank.map(q=>q.id))),/회독/);
});
