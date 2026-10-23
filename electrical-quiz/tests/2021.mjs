import {chromium,devices,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const report=JSON.parse(await fs.readFile(new URL('../sources/2021-import-report.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4190/');
 const bank=JSON.parse(await page.locator('#questionData').textContent());
 const old=bank.filter(q=>/^q\d{3}$/.test(q.id));expect(old.length).toBe(189);expect(report.newIds.length).toBe(29);
 await expect(page.locator('#totalCount')).toHaveText(String(bank.length));
 // A complete backup from the prior 189-question release leaves exactly the new IDs unseen.
 const history=Object.fromEntries(old.map(q=>[q.id,{attempts:1,correct:1,wrong:0}]));
 await page.locator('#importFile').setInputFiles({name:'previous-189.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,history}))});await page.locator('#confirmImport').click();
 await expect(page.locator('#overallAttempts')).toHaveText('189');await expect(page.locator('#unseenCount')).toHaveText('29');
 await page.locator('#randomOrder').uncheck();await page.locator('#unseenOnly').check();await page.locator('#startAll').click();await expect(page.locator('#qGrid button')).toHaveCount(29);
 for(let i=0;i<29;i++){await expect(page.locator('#qAttempts')).toContainText('0회');await page.locator('#qOptions button[data-index="0"]').click();await expect(page.locator('#qExplanation')).toContainText('✓ 정답');await page.locator('#qNext').click();}
 await expect(page.locator('#resultCorrect')).toHaveText('29');await page.locator('#finishHome').click();await expect(page.locator('#overallAttempts')).toHaveText(String(bank.length));await expect(page.locator('#unseenCount')).toHaveText('0');
 await page.reload();await expect(page.locator('#overallAttempts')).toHaveText(String(bank.length));
 await page.locator('#unseenOnly').uncheck();
 for(const mode of ['mcq','practical']){
  await page.locator('#studyFormat').selectOption(mode);await page.locator('#randomOrder').uncheck();
  for(const [year,count] of [['2021-4회',22],['2021-2회',11],['2021-1회',11]]){
   await page.locator('#yearSelect').selectOption(year);await expect(page.locator('#available')).toContainText(`${count}문항`);await page.locator('#startAll').click();await expect(page.locator('#qGrid button')).toHaveCount(count);await expect(page.locator('#qYear')).toHaveText(year);await page.locator('#topHome').click();
  }
 }
 await expect(page.locator('#overallAttempts')).toHaveText('0');
 async function open(id){const q=bank.find(q=>q.id===id),year=q.year;await page.locator('#yearSelect').selectOption(year);await page.locator('#startAll').click();const qs=bank.filter(q=>q.year===year||q.appearances?.some(a=>a.exam===year));await page.locator(`#qGrid button[data-pos="${qs.findIndex(q=>q.id===id)}"]`).click();}
 await open('ec-2021-4-006');await expect(page.locator('input[data-part]')).toHaveCount(4);for(const [i,value] of ['60V 이상','1000V 미만','60V 이상','1500V 미만'].entries())await page.locator(`input[data-part="${i}"]`).fill(value);await page.locator('#revealWritten').click();await page.locator('#writtenCorrect').click();await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('1');
 await open('ec-2021-2-001');await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('60분');await expect(page.locator('.written-reference')).toContainText('120분');await page.locator('#topHome').click();
 await open('ec-2021-4-011');await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('제2피크');await expect(page.locator('.written-reference')).toContainText('산화물');await page.locator('#topHome').click();
 await page.locator('#studyFormat').selectOption('mcq');await page.locator('#yearSelect').selectOption('2021-4회');await page.locator('#startAll').click();await expect(page.locator('#qAttempts')).toContainText('1회');await page.locator('#qGrid button[data-pos="2"]').click();await expect(page.locator('#qVerification')).toContainText('170kV 이하');await expect(page.locator('#qVerification')).toContainText('170kV 미만');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/2021-mobile.png',fullPage:true});
 console.log('PASS: prior 189 records retained; 29 new MCQs graded; reload stable; three year filters in both modes; shared IDs; new practical blanks and source warning; no runtime errors');
}finally{await browser.close()}
