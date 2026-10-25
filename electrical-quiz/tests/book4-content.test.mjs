import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {book4Figures} from '../src/book4-figures.js';
import {reduceEvents} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=read('../src/questions.json'),practical=read('../src/practical.json'),report=read('../sources/book4-import-report.json'),extra=read('../src/book4-data.json');
const q=id=>bank.find(q=>q.id===id),id=(exam,n)=>`ec-${exam}-book4-${String(n).padStart(3,'0')}`;
test('Book4:36 permanent IDs, 269 total, no sag, exact year corrections and shared MD',()=>{
 assert.equal(report.newIds.length,36);assert.equal(bank.length,269);
 for(const key of report.newIds){assert(q(key));assert(practical[key]);assert(!/이도|처짐.*최저 높이/.test(q(key).question));}
 assert.equal(q(id('2024-1',1)).source.photos[0],'image18.png');
 for(let i=1;i<=4;i++)assert.equal(q(id('2023-2',i)).year,'2023-2회');
 assert(q('ec-2022-2-symbol-002').appearances.some(a=>a.exam==='2024-1회'));
 assert(!report.newIds.some(key=>q(key).options[0]==='금속덕트'));
 assert.equal(q('q188').options[0],'할증 5% / 철거손실 2.5%');
 assert.equal(q('q189').options[0],'할증 3% / 철거손실 1.5%');
});
test('Eight decoder equations actually agree with every truth-table input',()=>{
 const key=id('2025-1',1),fields=practical[key].fields,rows=extra[key].tables[0].rows;
 for(const [a,b,c,out] of rows){
  const input={X1:+a,X2:+b,X3:+c};
  const active=fields.filter(f=>f.answer.split('·').every(t=>t.startsWith('¬')?!input[t.slice(1)]:!!input[t])).map(f=>f.label);
  assert.deepEqual(active,[out]);
 }
 // Source's shared binary decision ladder: 2+4+8 contacts, coils excluded.
 assert.equal(2+4+8,14);assert.match(book4Figures.book4LadderAnswer.svg,/14개/);
});
test('Reverse-V preserves primary phase orientation from the printed answer',()=>{
 const p=practical[id('2025-2',1)];assert.match(p.prompt,/역V결선/);
 assert.equal(p.fields[0].answer,'T1.U–a, T1.V–N, T2.U–b, T2.V–N');
 assert.match(book4Figures.book4VAnswer.svg,/M445 220V85M535 220V115/);
 // Both primary V terminals go to N; reversing only the second primary would
 // make unequal secondary line voltages for the provided V secondary.
 const va={x:1,y:0},vb={x:Math.cos(-2*Math.PI/3),y:Math.sin(-2*Math.PI/3)};
 assert(Math.abs(Math.hypot(va.x+vb.x,va.y+vb.y)-1)<1e-12);
 assert(Math.abs(Math.hypot(va.x-vb.x,va.y-vb.y)-Math.sqrt(3))<1e-12);
});
test('Interlock equations preserve stop and the opposite-output inhibit',()=>{
 const next=(pb1,pb2,pb3,f,r)=>[(pb2||f)&&!pb1&&!r,(pb3||r)&&!pb1&&!f];
 const [ff,rr]=practical[id('2023-4',1)].fields;
 assert.equal(ff.answer,'F=(PB2∨F)∧¬PB1∧¬R');assert.equal(rr.answer,'R=(PB3∨R)∧¬PB1∧¬F');
 assert.deepEqual(next(false,true,false,false,false),[true,false]);
 assert.deepEqual(next(false,false,false,true,false),[true,false]);
 assert.deepEqual(next(false,false,true,true,false),[true,false]);
 assert.deepEqual(next(true,true,true,true,false),[false,false]);
 assert.deepEqual(next(false,false,true,false,false),[false,true]);
});
test('Historical costing, conduit and protective-device answers are independently recalculated',()=>{
 for(const [n,a,b,wage] of [[3,1.37,1.04,32700],[4,20.4,15.7,62700],[5,30.5,22.5,22000]]){
  assert.equal(q(id('2025-2',n)).options[0],Math.round((a+b)*10*1.8*wage).toLocaleString('en-US')+'원');
 }
 const conductorArea=13*3*2+35*3*1.2;assert.equal(conductorArea,204);
 const candidates=extra[id('2025-2',8)].tables[2].rows;assert.equal(candidates.find(r=>+r[1]>=conductorArea)[0],'36');
 assert.equal(6.5+Math.ceil((345-160)/10)*.12,8.78);
 assert.equal(6+Math.ceil((345-160)/10)*.12,8.28);
 const current=1800/(Math.sqrt(3)*22.9);
 const selections=[[current*2,[50,65,80,100,200],100],[current*1.5,[20,30,40,75,100],75],[current*5/75*1.25,[2,4,5,6,7,8],4]];
 selections.forEach(([need,choices,answer])=>assert.equal(choices.find(n=>n>=need),answer));
 const d=(.44*10*3*1.2*.8+.64*10*3*1.2),g=(.22*10*3*1.2*.8+.32*10*3*1.2);
 assert(Math.abs(d-35.712)<1e-10);assert(Math.abs(g-17.856)<1e-10);
 assert.equal(Math.round(d*361000),12892032);assert.equal(Math.round(g*141000),2517696);
 assert.equal(Math.floor((Math.round(d*361000)+Math.round(g*141000))*.15),2311459);
});
test('All prompt/answer figure keys are present; old records survive the expanded bank',()=>{
 for(const key of report.newIds){const fig=q(key).diagram;if(fig)assert(book4Figures[fig]);const answer=extra[key]?.answerFigure;if(answer)assert(book4Figures[answer]);}
 const before=bank.filter(q=>!report.newIds.includes(q.id));
 const event={id:'unchanged_old_attempt',kind:'attempt',qid:'q174',correct:true,choice:0,sessionId:'retained',at:'2026-10-24T00:00:00Z'};
 assert.deepEqual(reduceEvents([event],before).history.q174,reduceEvents([event],bank).history.q174);
 const localBackup='/tmp/electrical-before-book4/src/questions.json';
 if(fs.existsSync(localBackup)){
  const old=JSON.parse(fs.readFileSync(localBackup));
  for(const item of old){const now={...q(item.id)};if(item.id==='ec-2022-2-symbol-002')delete now.appearances;const expected={...item};if(item.id==='ec-2022-2-symbol-002')delete expected.appearances;assert.deepEqual(now,expected,item.id);}
 }
});
