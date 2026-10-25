import {chromium,devices,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const BANK_SIZE=JSON.parse(await fs.readFile(new URL('../src/questions.json',import.meta.url),'utf8')).length;
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const c=await b.newContext({...devices['Pixel 7']}),page=await c.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4186/');
 await expect(page.locator('#totalCount')).toHaveText(String(BANK_SIZE));
 await page.locator('#studyFormat').selectOption('practical');await page.locator('#randomOrder').uncheck();await page.locator('#start10').click();
 await expect(page.locator('#qOptions button')).toHaveCount(0);await expect(page.locator('#homeTools')).toBeHidden();
 await page.locator('textarea[data-part="0"]').fill('絶縁変圧器 · 절연변압기 1234 <b>');
 await page.waitForTimeout(2800);await expect(page.locator('textarea')).toBeFocused();
 await page.reload();await page.locator('#resume').click();await expect(page.locator('textarea')).toHaveValue('絶縁変圧器 · 절연변압기 1234 <b>');
 await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('절연변압기');
 await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('0');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE));
 await page.locator('#resume').click();await page.locator('#writtenCorrect').click();await expect(page.locator('#qAttempts .counter')).toHaveText('1회');
 await page.locator('#qNext').click();await expect(page.locator('input[data-part]')).toHaveCount(2);
 await page.locator('input[data-part="0"]').fill('400 V 이하');await page.locator('input[data-part="1"]').fill('150 V 이하');
 await page.locator('#qPrev').click();await page.locator('#qNext').click();await expect(page.locator('input[data-part="1"]')).toHaveValue('150 V 이하');
 await page.locator('#revealWritten').click();await page.locator('#writtenWrong').click();await expect(page.locator('#qAttempts')).toContainText('오답 1회');
 await page.reload();await page.locator('#resume').click();await expect(page.locator('#writtenWrong')).toHaveCount(0);await expect(page.locator('#qAttempts .counter')).toHaveText('1회');
 await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('2');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE-2));
 await page.locator('#studyFormat').selectOption('mcq');await expect(page.locator('#overallAttempts')).toHaveText('0');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE));
 await page.locator('#studyFormat').selectOption('practical');await page.locator('#startMissed').click();await expect(page.locator('input[data-part]')).toHaveCount(2);
 await page.locator('#topHome').click();await page.locator('#practicalType').selectOption('blank');await page.locator('#start10').click();await expect(page.locator('#qMode')).toContainText('빈칸');
 await page.locator('#topHome').click();await page.locator('#practicalType').selectOption('all');await page.locator('#yearSelect').selectOption('2022-1회');await page.locator('#randomOrder').uncheck();await page.locator('#startAll').click();await expect(page.locator('#qYear')).toHaveText('2022-1회');await expect(page.locator('#qText')).toContainText('1련 내장애자');
 for(const [pos,first,second] of [[14,'5%','2.5%'],[15,'3%','1.5%']]){
  await page.locator(`#qGrid button[data-pos="${pos}"]`).click();await expect(page.locator('.written-reference')).toHaveCount(0);await expect(page.locator('#qDiagram svg')).toHaveCount(0);await page.locator('#revealWritten').click();const answers=page.locator('.written-reference > p');await expect(answers.nth(0)).toContainText(first);await expect(answers.nth(1)).toContainText(second);
 }
 await page.locator('#topHome').click();await page.locator('#studyFormat').selectOption('mcq');expect(await page.locator('#yearSelect option').allTextContents()).toContain('2022-1회');await expect(page.locator('#overallAttempts')).toHaveText('0');
 await page.locator('#studyFormat').selectOption('practical');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/practical-draft.png',fullPage:true});
 console.log('PASS: short/multi-blank input; drafts persisted; reveal does not score; manual score once; refresh stable; MCQ statistics isolated; wrong review; type filter; no runtime errors');
}finally{await b.close()}
