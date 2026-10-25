import fs from 'node:fs/promises';
import {chromium,devices,expect} from '@playwright/test';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const p=await b.newPage({...devices['Pixel 7']}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4193/');
 const bank=JSON.parse(await p.locator('#questionData').textContent()),id='ec-2025-2-001',q=bank.find(q=>q.id===id);
 expect(q.options[q.correct]).toBe('70℃ / 90℃ / 70℃');expect(q.year).toBe('2025-2회');
 const prior=bank.filter(q=>q.id!==id),n=bank.length;
 const history=Object.fromEntries(prior.map(q=>[q.id,{attempts:1,correct:1,wrong:0}]));
 await p.locator('#importFile').setInputFiles({name:'previous-218.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,history}))});await p.locator('#confirmImport').click();
 await expect(p.locator('#overallAttempts')).toHaveText(String(n-1));await expect(p.locator('#unseenCount')).toHaveText('1');
 await p.locator('#unseenOnly').check();await p.locator('#startAll').click();await expect(p.locator('#qGrid button')).toHaveCount(1);await expect(p.locator('#qText')).toContainText('PVC');
 await p.locator(`#qOptions button[data-index="${q.correct}"]`).click();await expect(p.locator('#qExplanation')).toContainText('70℃ / 90℃ / 70℃');await p.locator('#topHome').click();
 await p.reload();await expect(p.locator('#overallAttempts')).toHaveText(String(n));await expect(p.locator('#unseenCount')).toHaveText('0');
 await p.locator('#unseenOnly').uncheck();await p.locator('#studyFormat').selectOption('practical');await p.locator('#yearSelect').selectOption(q.year);await p.locator('#randomOrder').uncheck();await p.locator('#startAll').click();
 const pool=bank.filter(x=>x.year===q.year||x.appearances?.some(a=>a.exam===q.year));
 await expect(p.locator('#qGrid button')).toHaveCount(pool.length);await p.locator(`#qGrid button[data-pos="${pool.findIndex(x=>x.id===id)}"]`).click();
 await expect(p.locator('input[data-part]')).toHaveCount(3);await expect(p.locator('#qText')).toContainText('105℃ (시스)');await expect(p.locator('#qVerification')).toContainText('공개 KEC 기준 대조');await expect(p.locator('.written-reference')).toHaveCount(0);
 for(const [i,v] of ['70','90','70'].entries())await p.locator(`input[data-part="${i}"]`).fill(v);
 await p.locator('#topHome').click();await expect(p.locator('#overallAttempts')).toHaveText('0');await p.reload();await p.locator('#resume').click();
 for(const [i,v] of ['70','90','70'].entries())await expect(p.locator(`input[data-part="${i}"]`)).toHaveValue(v);
 await p.locator('#revealWritten').click();await expect(p.locator('.written-reference')).toContainText('90℃');await expect(p.locator('.written-reference')).toContainText('70℃');await p.locator('#writtenCorrect').click();await expect(p.locator('#qAttempts .counter')).toHaveText('1회');await expect(p.locator('#writtenCorrect')).toHaveCount(0);
 // Reload only after the UI confirms the IndexedDB grading transaction completed.
 await p.reload();await p.locator('#resume').click();await expect(p.locator('#qAttempts .counter')).toHaveText('1회');await expect(p.locator('#writtenCorrect')).toHaveCount(0);await p.locator('#topHome').click();await expect(p.locator('#overallAttempts')).toHaveText('1');
 await p.locator('#studyFormat').selectOption('mcq');await p.locator('#yearSelect').selectOption('2021-4회');await p.locator('#randomOrder').uncheck();await p.locator('#startAll').click();await expect(p.locator('#qYear')).toHaveText('2021-4회');await expect(p.locator('#qGrid button')).toHaveCount(22);await p.locator('#qGrid button[data-pos="2"]').click();await expect(p.locator('#qText')).toContainText('170kV 이하');await expect(p.locator('#qVerification')).toContainText('공개 KEC 기준 대조');
 expect(errors).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await fs.mkdir('test-results',{recursive:true});await p.screenshot({path:'test-results/insulation-mobile.png',fullPage:true});
 console.log(`PASS: ${n-1} prior records retained; one unseen insulation question; MCQ answer; 3 practical fields with given105; drafts resume; grading/reload idempotent; independent mode counts; corrected170kV scope; no errors/overflow`);
}finally{await b.close()}
