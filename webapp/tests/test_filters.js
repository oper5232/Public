'use strict';
const assert = require('node:assert/strict');
const F = require('../static/filters.js');
const job = (id, extra={}) => ({id, title:'전기설비 유지보수', company:'제조사', family:'전기보전',
  company_size:'대기업', snapshot:{employment:'정규직', duties:'변압기 점검과 수변전 운영',
    requirements:'전기기사', location:'울산', deadline:'2026-10-15'}, ...extra});
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS:',name); }
test('default settings preserve existing results', () => assert.equal(F.filter([job('1'),job('2')],F.defaults()).length,2));
test('company size is explicit; missing data inclusion is configurable', () => {
  const c=job('1',{company:'대기업 계열사',company_size:null});
  assert.equal(F.metadata(c).size,'미확인');
  assert(F.matches(c,{sizes:['대기업'],includeUnknown:true}));
  assert(!F.matches(c,{sizes:['대기업'],includeUnknown:false}));
  assert(!F.matches(job('2',{company_size:'중소기업'}),{sizes:['대기업']}));
});
test('employment and recruitment field combine with AND', () => {
  assert(F.matches(job('1'),{employment:['정규직'],roles:'영업, 전기보전'}));
  assert(!F.matches(job('1'),{employment:['계약직'],roles:'전기보전'}));
  const temporary = job('2',{snapshot:{employment:'계약직 (정규직 전환 가능)'}});
  assert(!F.matches(temporary,{employment:['정규직']}));
  assert(F.matches(temporary,{employment:['계약직']}));
  assert(!F.matches(job('3',{snapshot:{employment:'비정규직'}}),{employment:['정규직']}));
});
test('include any/all and quick search cover duties and requirements', () => {
  assert(F.matches(job('1'),{include:'변압기, PLC',keywordMode:'any'}));
  assert(!F.matches(job('1'),{include:'변압기, PLC',keywordMode:'all'}));
  assert(F.matches(job('1'),{keywordMode:'all'},'전기기사, 변압기'));
});
test('excluded keyword wins over included keyword', () => assert(!F.matches(job('1'),{include:'전기',exclude:'변압기'})));
test('selected search scope prevents matches in other fields', () => {
  assert(!F.matches(job('1'),{scopes:['company']},'변압기'));
  assert(F.matches(job('1'),{scopes:['duties']},'변압기'));
});
test('region filter treats missing location separately', () => {
  assert(F.matches(job('1'),{regions:'서울,울산'}));
  const c=job('2',{snapshot:{location:'미확인'}});
  assert(F.matches(c,{regions:'울산',includeUnknown:true}));
  assert(!F.matches(c,{regions:'울산',includeUnknown:false}));
});
test('closing date is inclusive, unknown dates stay visible', () => {
  const f={hideClosed:true};
  assert(F.matches(job('1'),f,'','2026-10-15'));
  assert(!F.matches(job('1'),f,'','2026-10-16'));
  assert(F.matches(job('2',{snapshot:{deadline:'상시채용'}}),f,'','2026-10-16'));
  assert(F.matches(job('3',{snapshot:{deadline:'2026-02-30'}}),f,'','2026-10-16'));
});
test('deadline sorting puts unknowns last without mutating source', () => {
  const items=[job('a',{snapshot:{}}),job('b'),job('c',{snapshot:{deadline:'2026-10-12'}})];
  assert.deepEqual(F.filter(items,{sort:'deadline'}).map(c=>c.id),['c','b','a']);
  assert.deepEqual(items.map(c=>c.id),['a','b','c']);
});
test('corrupt persisted settings normalize safely', () => {
  const f=F.normalize({sizes:['대기업','invented'],scopes:[],include:123,includeUnknown:'false'});
  assert.deepEqual(f.sizes,['대기업']);assert.equal(f.scopes.length,4);assert.equal(f.include,'');assert.equal(f.includeUnknown,true);
});
test('filters never change approval status', () => {
  const c=job('1',{status:'승인'});F.filter([c],{sizes:['중소기업']});assert.equal(c.status,'승인');
});
console.log(`${passed} filter tests passed.`);
