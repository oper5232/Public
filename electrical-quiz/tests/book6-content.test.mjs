import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {examAppearances,questionForExam,practicalForExam} from '../src/question-exams.js';
import {book6Figures} from '../src/book6-figures.js';
import {book4Figures} from '../src/book4-figures.js';
import {availableQuestions} from '../src/study-rounds.js';
import {reduceEvents,validateSession} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=read('../src/questions.json'),p=read('../src/practical.json'),report=read('../sources/book6-import-report.json'),retired=read('../src/retired-questions.json');
const q=id=>bank.find(q=>q.id===id);
test('Book6:25 new/6 shared;270 active/294 known; incomplete main questions omitted',()=>{
 assert.equal(report.newIds.length,25);assert.equal(report.reusedIds.length,6);assert.equal(bank.length,294);assert.equal(availableQuestions(bank,retired).length,270);assert.equal(retired.length,24);
 for(const id of report.newIds){assert.match(id,/^ec-2020-[1-4]-book6-\d{3}$/);assert(!retired.some(r=>r.id===id));}
 assert(!bank.some(q=>q.year==='2020-3회'&&q.source?.questionNumber===4));
 assert(!examAppearances(q('q129')).includes('2020-1회'));
 assert(!examAppearances(q('q010')).includes('2020-2회'));
 for(const item of bank.filter(q=>report.newIds.includes(q.id)))assert(!/이도|굴착량|축전지 용량/.test(item.question));
});
test('The existing269 questions/answers and24 excluded IDs remain unchanged except appended appearances',()=>{
 const dir='/tmp/electrical-before-book6/';
 if(!fs.existsSync(dir+'src/questions.json'))return;
 const old=JSON.parse(fs.readFileSync(dir+'src/questions.json'));
 for(const item of old){const now=structuredClone(q(item.id)),expected=structuredClone(item);
  if(report.reusedIds.includes(item.id)){assert.deepEqual((now.appearances||[]).filter(a=>!a.sourceId.startsWith('book6-')),expected.appearances||[]);delete now.appearances;delete expected.appearances;}
  assert.deepEqual(now,expected,item.id);
 }
 const oldp=JSON.parse(fs.readFileSync(dir+'src/practical.json'));for(const [id,entry] of Object.entries(oldp))assert.deepEqual(p[id],entry,id);
 assert.deepEqual(retired,JSON.parse(fs.readFileSync(dir+'src/retired-questions.json')));
});
test('Tower numbering and six answers follow the selected2020 exam;2024 five-answer base is preserved',()=>{
 const tower=q('ec-2024-1-book4-001'),before=JSON.stringify(tower),base=p[tower.id],primary=questionForExam(tower,'2024-1회'),view=questionForExam(tower,'2020-3회');
 assert.match(primary.question,/③/);assert.match(view.question,/④/);assert.equal(primary.diagram,'book4Towers');assert.equal(view.diagram,'book6Towers');assert.equal(view.id,tower.id);assert.equal(view.correct,tower.correct);assert.deepEqual(view.options,tower.options);
 assert.equal(base.fields.length,5);assert.equal(base.fields[2].answer,'문형 철탑');
 const written=practicalForExam(view,base,'2020-3회');assert.equal(written.fields.length,6);assert.equal(written.fields[2].answer,'우두형 철탑');assert.equal(written.fields[3].answer,'문형 철탑');assert.equal(written.fields[5].answer,'MC 철탑');assert.equal(written.source.exam,'2020-3회');assert.equal(written.basisAnswer,base.basisAnswer);assert(!written.notes.join('').includes('MC'));
 assert.equal(JSON.stringify(tower),before);assert.equal(practicalForExam(tower,base,'2024-1회'),base);
});
test('Emergency socket2020 has two2-hole circles;2024 original keeps2/3 holes',()=>{
 const socket=q('ec-2024-1-book4-006');assert.equal(questionForExam(socket,'2020-4회').diagram,'book6Emergency');assert.equal(questionForExam(socket,'2024-1회').diagram,'book4Emergency');
 assert.equal((book6Figures.book6Emergency.svg.match(/<circle /g)||[]).length,6);assert.equal((book4Figures.book4Emergency.svg.match(/<circle /g)||[]).length,7);
 assert.match(book6Figures.book6Floor50.svg,/50A/);assert.match(book6Figures.book6Medical.svg,/>H</);assert.match(book6Figures.book6EarthSocket.svg,/>ET</);
 assert.match(book6Figures.book6WiringLines.svg,/40 9 3 9 3 9/);
});
test('Demand/diversity/load factors retain numerator, denominator and percent distinctions',()=>{
 assert.equal(q('ec-2020-4-book6-002').options[0],'최대수용전력 / 총 부하설비용량 ×100%');
 assert.equal(q('ec-2020-4-book6-003').options[0],'개별 최대수용전력의 합 / 합성최대수용전력');
 assert(!p['ec-2020-4-book6-003'].fields[0].answer.includes('100'));
 assert.equal(q('ec-2020-4-book6-004').options[0],'평균수용전력 / 합성최대수용전력 ×100%');
 assert.equal(q('ec-2020-4-book6-007').options[0],'코너 조명');
 assert.deepEqual(p['ec-2020-2-book6-002'].fields.map(f=>f.answer),['1.2','0.8']);
 assert.deepEqual(p['ec-2020-2-book6-003'].fields.map(f=>f.answer),['22','36','54']);
 assert.match(q('ec-2020-1-book6-001').options[0],/전력퓨즈와 사용 시 결상방지/);
 assert.equal(q('q188').options[0],'할증 5% / 철거손실 2.5%');assert.equal(q('q189').options[0],'할증 3% / 철거손실 1.5%');
});
test('Variants preserve canonical choice, immutable history, and six-part saved-session compatibility',()=>{
 const tower=q('ec-2024-1-book4-001'),old=bank.filter(q=>!report.newIds.includes(q.id)),event={id:'past_tower',kind:'attempt',qid:tower.id,correct:true,choice:0,sessionId:'old_exam',at:'2026-10-24T00:00:00Z'};
 assert.deepEqual(reduceEvents([event],old).history[tower.id],reduceEvents([event],bank).history[tower.id]);
 const session={id:'practical_six',format:'practical',studyRound:2,ids:[tower.id],pos:0,answers:{},orders:{[tower.id]:[0,1,2,3]},drafts:{[tower.id]:Array(6).fill('saved')},examFilter:'2020-3회'};
 validateSession(session,new Set(bank.map(q=>q.id)));
 const injected={...tower,appearances:[{exam:'x',correct:3,options:['unsafe'],sourceId:'x',practical:{basisAnswer:'unsafe'}}]};
 assert.equal(questionForExam(injected,'x').correct,tower.correct);assert.deepEqual(questionForExam(injected,'x').options,tower.options);assert.equal(practicalForExam(injected,p[tower.id],'x').basisAnswer,p[tower.id].basisAnswer);
});
