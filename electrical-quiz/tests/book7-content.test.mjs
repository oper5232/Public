import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {examAppearances,questionForExam,practicalForExam} from '../src/question-exams.js';
import {book7Figures} from '../src/book7-figures.js';
import {availableQuestions,recommendedRound,pendingInRound} from '../src/study-rounds.js';
import {reduceEvents} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=read('../src/questions.json'),written=read('../src/practical.json'),report=read('../sources/book7-import-report.json'),retired=read('../src/retired-questions.json');
const q=id=>bank.find(x=>x.id===id),id=(exam,n)=>`ec-2019-${exam}-book7-${String(n).padStart(3,'0')}`;
test('Book7 has21 new IDs/9 shared IDs;17 photographs;no retired question reactivated',()=>{
 assert.equal(report.newCount,21);assert.equal(report.sharedCount,9);assert.equal(report.images.length,17);assert(bank.length>=315);assert.equal(availableQuestions(bank,retired).length,bank.length-24);assert.equal(retired.length,24);
 assert.deepEqual(report.newByExam,{'2019-1회':11,'2019-2회':6,'2019-4회':4});
 for(const key of report.newIds){assert.match(key,/^ec-2019-[124]-book7-\d{3}$/);assert(!retired.some(x=>x.id===key));}
 for(const [exam,n] of [['2019-1회',15],['2019-2회',6],['2019-4회',9]])assert.equal(bank.filter(q=>examAppearances(q).includes(exam)).length,n);
 assert(!examAppearances(q('q053')).includes('2019-4회'));assert(!examAppearances(q('q006')).includes('2019-2회'));assert(report.excluded.some(x=>x.part.includes('接続')||x.part.includes('접속뱅크')));
 assert.equal(q(id(1,11)).source.questionNumber,null); // complete prompt/answer but no printed number
});
test('All294 existing questions/answers and practical base data remain unchanged except9 source appearances',()=>{
 const dir='/tmp/electrical-before-book7/';if(!fs.existsSync(dir+'src/questions.json'))return;
 const old=JSON.parse(fs.readFileSync(dir+'src/questions.json'));assert.equal(old.length,294);
 for(const item of old){const now=structuredClone(q(item.id)),expected=structuredClone(item);
  if(report.reusedIds.includes(item.id)){assert.deepEqual((now.appearances||[]).filter(a=>!a.sourceId.startsWith('book7-')),expected.appearances||[]);delete now.appearances;delete expected.appearances;}
  assert.deepEqual(now,expected,item.id);
 }
 const oldWritten=JSON.parse(fs.readFileSync(dir+'src/practical.json'));for(const [key,p] of Object.entries(oldWritten))assert.deepEqual(written[key],p,key);
 assert.deepEqual(retired,JSON.parse(fs.readFileSync(dir+'src/retired-questions.json')));
});
test('Bypass maintenance and restoration retain opposite safe-order dependencies for the pictured exam topology',()=>{
 const maintenance=q(id(2,2)).options[0].split(' → '),restore=q(id(2,3)).options[0].split(' → ');
 assert.deepEqual(maintenance,['DS₃ ON','CB OFF','DS₂ OFF','DS₁ OFF']);assert.deepEqual(restore,['DS₂ ON','DS₁ ON','CB ON','DS₃ OFF']);
 assert(maintenance.indexOf('CB OFF')<maintenance.indexOf('DS₂ OFF'));assert(maintenance.indexOf('DS₂ OFF')<maintenance.indexOf('DS₁ OFF'));assert(restore.indexOf('DS₁ ON')<restore.indexOf('CB ON'));
 assert.match(book7Figures.book7BreakerBypass.svg,/M225 75H445V228/);assert.match(book7Figures.book7BreakerBypass.svg,/M445 272V455H225/);assert(!book7Figures.book7BreakerBypass.svg.includes('ON →'));
});
test('Source values distinguish18kV distribution from21kV substation and preserve units/conditions',()=>{
 assert.equal(q(id(2,1)).options[0],'18kV');assert.match(q(id(2,1)).question,/배전선로/);assert.match(q(id(2,1)).explain,/변전소용21kV/);
 assert.deepEqual(written[id(1,6)].fields.map(f=>f.answer),['2.5','4.31']);assert.equal(written[id(1,5)].fields[0].answer,'2.6mm 이상');assert.equal(written[id(1,8)].fields[0].answer,'1m 이상');
 assert.deepEqual(written[id(1,11)].fields.map(f=>f.answer),['1.5','0.75']);assert.equal(q(id(1,3)).options[0],'동심중성선 수밀형 전력케이블');assert.match(q(id(1,4)).question,/CV1/);
 assert.deepEqual(written[id(4,4)].fields.map(f=>f.answer),['높을 것','낮을 것','낮을 것']);assert.equal(q('q188').options[0],'할증 5% / 철거손실 2.5%');assert.equal(q('q189').options[0],'할증 3% / 철거손실 1.5%');
});
test('2019 appearances show original labels/prompts while retaining canonical answers and history IDs',()=>{
 const acsr=q('q036'),base=written.q036,view=practicalForExam(acsr,base,'2019-4회');assert.equal(base.fields.length,1);assert.equal(view.fields.length,3);assert.match(view.fields[1].answer,/비중/);assert.equal(view.basisAnswer,base.basisAnswer);assert.equal(view.source.exam,'2019-4회');
 const meter=q('q182');assert.match(questionForExam(meter,'2019-1회').question,/저압전로/);assert.match(meter.question,/변압기/);assert.equal(questionForExam(meter,'2019-1회').correct,meter.correct);
 const button=q('ec-2025-1-symbol-004');assert.match(questionForExam(button,'2019-4회').question,/\(2\)/);assert.match(button.question,/\(4\)/);assert.equal(questionForExam(button,'2019-4회').diagram,button.diagram);
 for(const f of [book7Figures.book7TimeSwitch,book7Figures.book7Speaker,book7Figures.book7Dimmer])assert(!/타임스위치|스피커|조광기/.test(f.svg));
});
test('Updating294 known IDs to315 preserves prior events and leaves just21 new questions pending',()=>{
 const newIds=new Set(report.newIds),old=bank.filter(q=>!newIds.has(q.id)),active=availableQuestions(bank,retired),events=old.map(q=>({id:'prior_'+q.id,kind:'attempt',qid:q.id,correct:true,choice:q.correct,sessionId:'old_'+q.id,at:'2026-10-25T12:00:00Z'}));
 const before=reduceEvents(events,old),after=reduceEvents(events,bank);assert.deepEqual(before.history,after.history);assert.equal(active.filter(q=>pendingInRound(q,after.history,1)).length,21);assert.equal(recommendedRound(active,after.history),1);
 const added=report.newIds.map(key=>({id:'new_'+key,kind:'attempt',qid:key,correct:false,choice:1,sessionId:'new_exam',at:'2026-10-26T12:00:00Z'}));const complete=reduceEvents([...events,...added,...added],bank);assert.equal(Object.values(complete.history).reduce((n,h)=>n+h.attempts,0),bank.length);assert.equal(recommendedRound(active,complete.history),2);assert.equal(active.filter(q=>pendingInRound(q,complete.history,2)).length,active.length);
});
