import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const BANK_SIZE=JSON.parse(await fs.readFile(new URL('../src/questions.json',import.meta.url),'utf8')).length;
const url=process.env.TEST_URL||'http://127.0.0.1:4173/';const opts={executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']};
await fs.mkdir('test-results',{recursive:true});
const profile='test-results/restart-profile';await fs.rm(profile,{recursive:true,force:true});
let context=await chromium.launchPersistentContext(profile,opts);let page=await context.newPage();const results=[];
try{
 await page.goto(url);await page.locator('#start10').click();
 for(let i=0;i<10;i++){await page.locator('#qOptions button').first().click();await expect(page.locator('#qExplanation')).not.toBeEmpty();await page.locator('#qNext').click();}
 await page.locator('#finishHome').click();await expect(page.locator('#overallAttempts')).toHaveText('10');await context.close();
 context=await chromium.launchPersistentContext(profile,opts);page=await context.newPage();await page.goto(url);await expect(page.locator('#overallAttempts')).toHaveText('10');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE-10));results.push('A: Chromium 프로세스 종료·동일 프로필 재시작 후 10문항 기록 유지');
}finally{await context.close();}
const browser=await chromium.launch(opts);const c=await browser.newContext();
try{
 await c.addInitScript(()=>{if(location.protocol==='http:'&&!localStorage.getItem('electrical_construction_mcq_v1'))localStorage.setItem('electrical_construction_mcq_v1',JSON.stringify({history:{q001:{attempts:5,correct:3,wrong:2}},stars:['q001']}));});
 const p=await c.newPage();await p.goto(url);await expect(p.locator('#overallAttempts')).toHaveText('5');await expect(p.locator('#attemptedCount')).toHaveText('1');
 p.on('dialog',d=>d.accept());await p.locator('#clearHistory').click();await expect(p.locator('#overallAttempts')).toHaveText('0');await p.reload();await expect(p.locator('#overallAttempts')).toHaveText('0');expect(await p.evaluate(()=>JSON.parse(localStorage.getItem('electrical_construction_mcq_v1')).history.q001.attempts)).toBe(5);results.push('기존 localStorage 최초 복사·원본 유지·초기화 후 자동 재복사 방지');
 await p.locator('#start10').click();const p2=await c.newPage();await p2.goto(url);await p2.locator('#resume').click();
 await Promise.all([p.evaluate(()=>document.querySelector('#qOptions button[data-index="0"]').click()),p2.evaluate(()=>document.querySelector('#qOptions button[data-index="1"]').click())]);
 await expect(p.locator('#qExplanation')).not.toBeEmpty();await expect(p2.locator('#qExplanation')).not.toBeEmpty();await p.locator('#topHome').click();await p2.locator('#topHome').click();await expect(p.locator('#overallAttempts')).toHaveText('1');await expect(p2.locator('#overallAttempts')).toHaveText('1');results.push('C: 같은 기기 두 탭의 동시 채점을 한 번만 원자적으로 저장');
 await p.locator('#importFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({history:{q001:{attempts:-3}}}))});await expect(p.locator('#toast')).toContainText('실패');await expect(p.locator('#overallAttempts')).toHaveText('1');results.push('가져오기 검증 실패 시 기존 기록 유지');
 for(const s of results)console.log('PASS',s);await fs.writeFile('test-results/persistence.json',JSON.stringify({environment:'Linux Chromium persistent profile / independent tabs, 실제 스마트폰 아님',results},null,2));
}finally{await c.close();await browser.close();}
