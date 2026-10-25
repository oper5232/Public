import fs from 'node:fs/promises';
import {chromium,devices,expect} from '@playwright/test';
const read=async p=>JSON.parse(await fs.readFile(new URL(p,import.meta.url),'utf8'));
const report=await read('../sources/book4-import-report.json'),practical=await read('../src/practical.json'),extra=await read('../src/book4-data.json');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.TEST_URL||'http://127.0.0.1:4200/';
const retired=new Set((await read('../src/retired-questions.json')).map(q=>q.id)),keptIds=report.newIds.filter(id=>!retired.has(id));
try{
 await page.goto(url);const bank=JSON.parse(await page.locator('#questionData').textContent());expect(bank.length).toBe((await read('../src/questions.json')).length);
 async function open(id,mode='practical',year){
  await page.locator('#studyFormat').selectOption(mode);await page.locator('#randomOrder').uncheck();await page.locator('#topicSelect').selectOption('all');await page.locator('#unseenOnly').uncheck();
  const q=bank.find(q=>q.id===id);const exam=year||q.year;await page.locator('#yearSelect').selectOption(exam);await page.locator('#startAll').click();
  const pool=bank.filter(q=>!retired.has(q.id)&&(q.year===exam||q.appearances?.some(a=>a.exam===exam)));await expect(page.locator('#qGrid button')).toHaveCount(pool.length);
  await page.locator(`#qGrid button[data-pos="${pool.findIndex(q=>q.id===id)}"]`).click();await expect(page.locator('#qText')).toHaveText(mode==='practical'?practical[id].prompt:q.question);
 }
 for(const id of keptIds){
  await open(id);const q=bank.find(q=>q.id===id),d=extra[id];
  await expect(page.locator('.written-reference:visible')).toHaveCount(0);await expect(page.locator('.book4-answer:visible')).toHaveCount(0);
  await expect(page.locator('#practicalAnswer textarea')).toHaveCount(practical[id].fields.length);
  await expect(page.locator('#qDiagram table')).toHaveCount(d?.tables?.length||0);
  if(q.diagram){await expect(page.locator('#qDiagram svg')).toHaveCount(1);await page.locator('#qDiagram [data-open-figure]').click();await expect(page.locator('#figureViewer')).toBeVisible();await expect(page.locator('#figureViewer svg')).toHaveCount(1);
   expect(await page.locator('#figureViewer svg').getAttribute('aria-label')).toBe(await page.locator('#qDiagram svg').getAttribute('aria-label'));
   await page.locator('[data-zoom-step="1"]').click();await expect(page.locator('#figureZoomValue')).toHaveText('150%');
   if(id===keptIds[0]){
    for(let n=0;n<8;n++)await page.locator('[data-zoom-step="1"]').click();await expect(page.locator('#figureZoomValue')).toHaveText('400%');
    for(let n=0;n<8;n++)await page.locator('[data-zoom-step="-1"]').click();await expect(page.locator('#figureZoomValue')).toHaveText('100%');
   }
   await page.locator('[data-figure-close]').click();await expect(page.locator('#figureViewer')).not.toBeVisible();await expect(page.locator('#figureViewer svg')).toHaveCount(0);
  }
  await page.locator('#practicalAnswer textarea').first().fill('검토용 작성 답안');await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText(practical[id].fields[0].answer);
  if(d?.answerFigure){await expect(page.locator(`.written-reference [data-figure="${d.answerFigure}"]`)).toBeVisible();await page.locator('.written-reference [data-open-figure]').click();await expect(page.locator('#figureViewer')).toBeVisible();await page.locator('[data-figure-close]').click();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' mobile overflow').toBe(true);
  if(id==='ec-2025-1-book4-001')await page.screenshot({path:'test-results/book4-truth-mobile.png',fullPage:true});
  await page.locator('#writtenCorrect').click();await expect(page.locator('#qAttempts .counter')).toHaveText('1회');await page.locator('#topHome').click();
 }
 await page.reload();await expect(page.locator('#overallAttempts')).toHaveText('12');await expect(page.locator('#unseenCount')).toHaveText(String(bank.filter(q=>!retired.has(q.id)).length-keptIds.length));
 // Already graded screens keep drafts and never count a second attempt.
 await page.locator('#resume').click();await expect(page.locator('#qText')).toHaveText(practical[keptIds.at(-1)].prompt);await expect(page.locator('#qAttempts .counter')).toHaveText('1회');await expect(page.locator('#practicalAnswer textarea').first()).toHaveValue('검토용 작성 답안');await expect(page.locator('#writtenCorrect')).toHaveCount(0);
 await page.reload();await page.locator('#resume').click();await expect(page.locator('#qAttempts .counter')).toHaveText('1회');await page.locator('#topHome').click();
 // Retained diagram questions keep MCQ records separate and support zoom.
 await open('ec-2024-3-book4-001','mcq');await expect(page.locator('.book4-answer:visible')).toHaveCount(0);await page.locator('#qOptions [data-index="0"]').click();await expect(page.locator('#qAttempts .counter')).toHaveText('1회');await page.locator('#qDiagram [data-open-figure]').click();await page.screenshot({path:'test-results/book4-kept-zoom-mobile.png'});await page.keyboard.press('Escape');await expect(page.locator('#figureViewer')).not.toBeVisible();await page.locator('#topHome').click();
 // An existing MD question is reused in the newly linked exam.
 await open('ec-2022-2-symbol-002','mcq','2024-1회');await expect(page.locator('#qYear')).toHaveText('2024-1회');await expect(page.locator('#qDiagram [data-figure="symbolMetalDuct"]')).toHaveCount(1);await page.locator('#topHome').click();
 if(await page.locator('html').getAttribute('data-theme')!=='light')await page.locator('#themeButton').click();await open('ec-2024-3-book4-006');await page.screenshot({path:'test-results/book4-cost-light-mobile.png',fullPage:true});await page.locator('#topHome').click();
 // Offline: local assets include both prompt/answer diagrams and data tables.
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await open('ec-2024-3-book4-006');await expect(page.locator('#qDiagram svg')).toHaveCount(1);await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('ㄱ형 완금');await page.locator('#qDiagram [data-open-figure]').click();await expect(page.locator('#figureViewer svg')).toHaveCount(1);await page.locator('[data-figure-close]').click();await page.locator('#topHome').click();await context.setOffline(false);
 // Exercise the pre-dialog fallback separately; this is API emulation, not a
 // claim that a physical older iPhone was tested.
 const legacy=await browser.newContext({...devices['Pixel 7']});
 await legacy.addInitScript(()=>{HTMLDialogElement.prototype.showModal=undefined;HTMLDialogElement.prototype.close=undefined;});
 const lp=await legacy.newPage();await lp.goto(url);await lp.locator('#studyFormat').selectOption('practical');await lp.locator('#yearSelect').selectOption('2024-3회');await lp.locator('#randomOrder').uncheck();await lp.locator('#startAll').click();
 const yearPool=bank.filter(q=>!retired.has(q.id)&&(q.year==='2024-3회'||q.appearances?.some(a=>a.exam==='2024-3회')));await lp.locator(`#qGrid button[data-pos="${yearPool.findIndex(q=>q.id===keptIds[0])}"]`).click();await expect(lp.locator('#qText')).toHaveText(practical[keptIds[0]].prompt);
 await lp.locator('#qDiagram [data-open-figure]').click();await expect(lp.locator('#figureViewer.figure-fallback')).toBeVisible();await lp.keyboard.press('Escape');await expect(lp.locator('#figureViewer')).toBeHidden();await expect(lp.locator('#qDiagram [data-open-figure]')).toBeFocused();await legacy.close();
 expect(errors).toEqual([]);console.log('PASS:12 retained workbook questions (24 retired); prompt/answer separation; tables; 100–400% mobile zoom and close; drafts and grades reload; MCQ/practical split; MD shared year; light theme; no overflow/errors; offline retained diagrams; dialog fallback.');
}finally{await browser.close()}
