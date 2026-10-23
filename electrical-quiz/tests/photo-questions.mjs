import fs from 'node:fs/promises';
import {chromium,devices,expect} from '@playwright/test';
const prior=JSON.parse(await fs.readFile(new URL('../sources/six-photos-import-report.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({...devices['Pixel 7']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4194/');
 const bank=JSON.parse(await page.locator('#questionData').textContent()),newIds=new Set(prior.newIds),old=bank.filter(q=>!newIds.has(q.id));expect(prior.beforeCount).toBe(219);expect(old.length).toBeGreaterThanOrEqual(219);expect(newIds.size).toBe(10);
 await page.locator('#importFile').setInputFiles({name:'previous-219.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,history:Object.fromEntries(old.map(q=>[q.id,{attempts:1,correct:1,wrong:0}]))}))});await page.locator('#confirmImport').click();
 await expect(page.locator('#overallAttempts')).toHaveText(String(old.length));await expect(page.locator('#unseenCount')).toHaveText('10');await page.locator('#randomOrder').uncheck();await page.locator('#unseenOnly').check();await page.locator('#startAll').click();await expect(page.locator('#qGrid button')).toHaveCount(10);
 for(let i=0;i<10;i++){
  await expect(page.locator('#qDiagram .source-figure svg')).toHaveCount(1);await page.locator('#qOptions button[data-index="0"]').click();await expect(page.locator('#qAttempts')).toContainText('1회');await page.locator('#qNext').click();
 }
 await expect(page.locator('#resultCorrect')).toHaveText('10');await page.locator('#finishHome').click();await page.reload();await expect(page.locator('#overallAttempts')).toHaveText(String(bank.length));await expect(page.locator('#unseenCount')).toHaveText('0');
 async function open(id,format='practical',exam){
  await page.locator('#unseenOnly').uncheck();await page.locator('#studyFormat').selectOption(format);await page.locator('#randomOrder').uncheck();const q=bank.find(q=>q.id===id),year=exam||q.year;
  await page.locator('#yearSelect').selectOption(year);await page.locator('#startAll').click();await expect(page.locator('#qYear')).toHaveText(year);
  const scope=bank.filter(q=>q.year===year||q.appearances?.some(a=>a.exam===year));await expect(page.locator('#qGrid button')).toHaveCount(scope.length);await page.locator(`#qGrid button[data-pos="${scope.findIndex(q=>q.id===id)}"]`).click();
 }
 const cases=[['ec-2025-1-symbol-001','symbolAlarmG','누전경보기'],['ec-2025-1-symbol-002','symbolPanelX','배전반'],['ec-2025-1-symbol-003','symbolAlarmCheck','경보수신반'],['ec-2025-1-symbol-004','symbolPushDot','누름버튼'],['ec-2025-1-symbol-005','symbolSmokeS','연기감지기'],['ec-2024-1-symbol-002','symbolPanelHalf','분전반'],['ec-2024-1-symbol-003','symbolPanelControl','제어반'],['ec-2024-1-symbol-004','symbolSwitchS','개폐기'],['ec-2024-1-symbol-005','symbolBreakerB','배선용차단기'],['ec-2024-1-symbol-006','symbolEarthBreakerE','누전차단기']];
 for(const [id,figure,answer] of cases){await open(id);await expect(page.locator(`#qDiagram [data-figure="${figure}"] svg`)).toHaveCount(1);await expect(page.locator('.written-reference')).toHaveCount(0);expect(await page.locator('#qDiagram').textContent()).not.toContain(answer);await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText(answer);await page.locator('#topHome').click();}
 // One panel glyph is shared by two exam appearances, without creating a second record.
 await open('ec-2025-1-symbol-002','mcq','2024-1회');await expect(page.locator('#qAttempts')).toContainText('1회');await expect(page.locator('#qDiagram [data-figure="symbolPanelX"]')).toHaveCount(1);await page.locator('#topHome').click();
 for(const id of ['q008','q174']){
  await open(id);await expect(page.locator('#qDiagram [data-figure="insulatorNumbered"]')).toHaveCount(1);await expect(page.locator('#qText')).toContainText('①~⑤');await expect(page.locator('textarea')).toHaveCount(1);await expect(page.locator('.written-reference')).toHaveCount(0);
  await page.locator('textarea').fill('① 앵커쇄클 ② 소켓아이 ③ 현수애자 ④ 볼크레비스 ⑤ 점퍼터미널');await page.locator('#revealWritten').click();for(const text of ['① 앵커쇄클','② 소켓아이','③ 현수애자','④ 볼크레비스','⑤ 점퍼터미널'])await expect(page.locator('.written-reference')).toContainText(text);
  if(id==='q008'){await page.screenshot({path:'test-results/photos-insulator-mobile.png',fullPage:true});await page.locator('#writtenCorrect').click();await expect(page.locator('#qAttempts')).toContainText('1회');await page.reload();await page.locator('#resume').click();await expect(page.locator('#qAttempts')).toContainText('1회');await expect(page.locator('#writtenCorrect')).toHaveCount(0);}
  await page.locator('#topHome').click();
 }
 await open('q058');await expect(page.locator('#qDiagram [data-figure="spdQuestion"]')).toHaveCount(1);await expect(page.locator('#qText')).toContainText('a+b');expect(await page.locator('#practicalAnswer').textContent()).not.toContain('0.5');await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('0.5m');await page.locator('#topHome').click();
 await open('q059');await expect(page.locator('#qText')).toContainText('보호선 바');await expect(page.locator('#qDiagram svg')).toHaveCount(1);await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('16mm²');await expect(page.locator('.written-reference')).toContainText('6mm²');await page.locator('#topHome').click();
 await open('q055');await expect(page.locator('#qText')).toContainText('50[kVA] 미만');await expect(page.locator('#qDiagram [data-figure="capacitorBankQuestion"]')).toHaveCount(1);await page.locator('#revealWritten').click();await expect(page.locator('.written-reference')).toContainText('COS');await page.locator('#topHome').click();
 await open('q129');await expect(page.locator('#qText')).toContainText('여섯');await page.locator('#revealWritten').click();for(const word of ['아크릴 루버','상하30°','6. 건축화'])await expect(page.locator('.written-reference')).toContainText(word);expect(await page.locator('.written-reference > p').first().textContent()).not.toContain('아크릴루비');await page.locator('#topHome').click();
 // Question figures are embedded in the cached app bundle and remain usable offline.
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await open('ec-2024-1-symbol-002');await expect(page.locator('#qDiagram [data-figure="symbolPanelHalf"] svg')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/photos-symbol-offline-mobile.png',fullPage:true});await context.setOffline(false);
 expect(errors).toEqual([]);console.log('PASS:all non-target records retained;10 visual MCQs; shared panel ID; symbols and numbered diagrams visible before reveal; corrected numbered answers/50kVA/a+b/SPD sections/glare6; written reload idempotent; offline diagrams; no runtime errors or mobile overflow');
}finally{await browser.close()}
