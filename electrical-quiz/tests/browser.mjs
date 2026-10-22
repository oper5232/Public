import {chromium,devices,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const BANK_SIZE=JSON.parse(await fs.readFile(new URL('../src/questions.json',import.meta.url),'utf8')).length;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const results=[];
await fs.mkdir('test-results',{recursive:true});
const context=await browser.newContext({...devices['Pixel 7'],serviceWorkers:'allow'});
let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function record(name,fn){await fn();results.push({name,result:'PASS'});console.log('PASS',name);}
try{
 await page.goto(url);await expect(page.locator('#totalCount')).toHaveText(String(BANK_SIZE));
 await record('등록 문항 로딩·모바일 가로 넘침 없음',async()=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();});
 await page.locator('#randomOrder').uncheck();await page.locator('#start10').click();
 await record('문제 10개 채점·도면 표시·관심 문제',async()=>{
  for(let i=0;i<10;i++){
   await expect(page.locator('#qPosition')).toContainText(`${i+1} / 10`);
   if(i===6)await expect(page.locator('#qDiagram svg')).toHaveCount(1);
   if(i===0)await page.locator('#starButton').click();
   await page.locator(`#qOptions button[data-index="${i%2}"]`).click();await expect(page.locator('#qExplanation')).toContainText(i%2?'오답':'정답');
   await page.locator('#qNext').click();
  }
  await expect(page.locator('#resultCorrect')).toHaveText('5');await expect(page.locator('#resultWrong')).toHaveText('5');
  await page.locator('#resultFilter').selectOption('wrong');await expect(page.locator('#resultList article')).toHaveCount(5);
 });
 await page.locator('#finishHome').click();await expect(page.locator('#overallAttempts')).toHaveText('10');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE-10));
 await record('A·C: 탭 종료 후 재접속·새로고침·재열람 시 집계 유지',async()=>{
  await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await expect(page.locator('#overallAttempts')).toHaveText('10');
  await page.locator('#resume').click();await page.reload();await page.locator('#resume').click();await expect(page.locator('#qAttempts')).toContainText('1회');
  await expect(page.locator('#qOptions button:disabled')).toHaveCount(4);await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('10');
 });
 await record('D: 미응시 출제에서 채점한 10문항 제외',async()=>{
  await page.locator('#randomOrder').uncheck();await page.locator('#startUnseen10').click();await expect(page.locator('#qText')).toContainText('Δ-Δ');await expect(page.locator('#qAttempts')).toContainText('0회');await page.locator('#topHome').click();
 });
 await record('오답 우선순위·관심 문제 재시험',async()=>{
  await page.locator('#reviewOrder').selectOption('accuracy');await page.locator('#startMissed').click();await expect(page.locator('#qPosition')).toContainText('/ 5');await page.locator('#topHome').click();await page.locator('#startStars').click();await expect(page.locator('#qPosition')).toContainText('/ 1');await page.locator('#topHome').click();
 });
 await record('v2 가져오기 미리보기·취소·병합·중복 가져오기 방지',async()=>{
  const raw={version:2,history:{q020:{attempts:7,correct:4,wrong:3,lastCorrect:false,lastAt:'2026-01-01T00:00:00.000Z'}},stars:['q020']};
  const payload={name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))};
  await page.locator('#importFile').setInputFiles(payload);await expect(page.locator('#previewText')).toContainText('10 → 17');await page.locator('#cancelImport').click();await expect(page.locator('#overallAttempts')).toHaveText('10');
  await page.locator('#importFile').setInputFiles(payload);await page.locator('#confirmImport').click();await expect(page.locator('#overallAttempts')).toHaveText('17');
  await page.locator('#importFile').setInputFiles(payload);await expect(page.locator('#previewText')).toContainText('중복 제외 1개');await expect(page.locator('#confirmImport')).toBeDisabled();await page.locator('#cancelImport').click();
 });
 await record('E 로컬: PWA 오프라인 재로딩·채점·재연결',async()=>{
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();
  await context.setOffline(true);await page.reload();await expect(page.locator('#totalCount')).toHaveText(String(BANK_SIZE));await page.locator('#startUnseen10').click();await page.locator('#qOptions button').first().click();await expect(page.locator('#qExplanation')).not.toBeEmpty();await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('18');await context.setOffline(false);await page.reload();await expect(page.locator('#overallAttempts')).toHaveText('18');
 });
 await record('JSON 내보내기 및 밝은 테마·모바일 화면',async()=>{
  const download=page.waitForEvent('download');await page.locator('#exportJSON').click();const d=await download;await d.saveAs('test-results/export-v3.json');const raw=JSON.parse(await fs.readFile('test-results/export-v3.json'));expect(raw.version).toBe(3);expect(raw.events.length).toBeGreaterThan(10);
  await page.locator('#themeButton').click();await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 });
 await record('미응시 0개 처리',async()=>{
  const bank=await page.locator('#questionData').textContent();const history=Object.fromEntries(JSON.parse(bank).map(q=>[q.id,{attempts:1,correct:1,wrong:0}]));
  await page.locator('#importFile').setInputFiles({name:'complete.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({history}))});await page.locator('#confirmImport').click();await expect(page.locator('#unseenCount')).toHaveText('0');await expect(page.locator('#startUnseenAll')).toBeDisabled();
 });
 expect(errors).toEqual([]);
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),dp=await desktop.newPage();await dp.goto(url);await expect(dp.locator('#totalCount')).toHaveText(String(BANK_SIZE));await dp.screenshot({path:'test-results/desktop.png',fullPage:true});await desktop.close();
 await fs.writeFile('test-results/browser.json',JSON.stringify({environment:'Linux Chromium / Pixel 7 viewport; 실제 휴대전화 아님',results,errors},null,2));
}finally{await context.close();await browser.close();}
