import {chromium,devices,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const url=process.env.TEST_SYNC_URL||'http://127.0.0.1:4174/';const results=[];const errors=[];
const a=await browser.newContext({...devices['Pixel 7']}),b=await browser.newContext({viewport:{width:1440,height:1000}}),c=await browser.newContext();
let pa=await a.newPage();const pb=await b.newPage(),pc=await c.newPage();for(const p of [pa,pb,pc])p.on('pageerror',e=>errors.push(e.message));
async function signIn(p,name){await p.goto(url);await p.waitForFunction(()=>!!window.__testSignIn);await p.evaluate(n=>window.__testSignIn(n),name);await expect(p.locator('#accountName')).not.toContainText('게스트');await expect(p.locator('#syncStatus')).toContainText('동기화 완료',{timeout:20000});}
async function answer(p,index=0){await p.locator('#randomOrder').uncheck();await p.locator('#startUnseen10').click();await p.locator(`#qOptions button[data-index="${index}"]`).click();await expect(p.locator('#qExplanation')).not.toBeEmpty();await p.locator('#topHome').click();}
try{
 await signIn(pa,'sync-alice');await answer(pa);await expect(pa.locator('#overallAttempts')).toHaveText('1');await expect(pa.locator('#syncStatus')).toContainText('동기화 완료',{timeout:20000});
 await signIn(pb,'sync-alice');await expect(pb.locator('#overallAttempts')).toHaveText('1');results.push('B: 다른 기기 동일 계정 기록 수신');
 await answer(pb,1);await expect(pa.locator('#overallAttempts')).toHaveText('2',{timeout:20000});results.push('B: PC 풀이를 휴대전화 화면에 실시간 반영');
 await pa.locator('#resumeRemote').click();await expect(pa.locator('#qOptions button:disabled')).toHaveCount(4);await pa.locator('#topHome').click();results.push('최근 시험과 채점 상태 이어풀기');
 await a.setOffline(true);await answer(pa);await expect(pa.locator('#overallAttempts')).toHaveText('3');await expect(pb.locator('#overallAttempts')).toHaveText('2');
 await a.setOffline(false);await expect(pb.locator('#overallAttempts')).toHaveText('3',{timeout:30000});await expect(pa.locator('#syncStatus')).toContainText('동기화 완료',{timeout:20000});results.push('E: 오프라인 IndexedDB 큐를 재접속 시 자동 전송');
 await pa.reload();await expect(pa.locator('#accountName')).not.toContainText('게스트');await expect(pa.locator('#overallAttempts')).toHaveText('3');await pa.locator('#retrySync').click();await expect(pb.locator('#overallAttempts')).toHaveText('3');results.push('A·C: 인증 유지·재접속·재전송 중복 집계 없음');
 await signIn(pc,'sync-bob');await expect(pc.locator('#overallAttempts')).toHaveText('0');await answer(pc);await expect(pa.locator('#overallAttempts')).toHaveText('3');results.push('계정별 학습 기록 분리');
 await pa.locator('#logoutGoogle').click();await expect(pa.locator('#accountName')).toContainText('게스트');await expect(pa.locator('#overallAttempts')).toHaveText('0');results.push('로그아웃 후 게스트 기록 분리');
 await pa.evaluate(()=>window.__testSignIn('sync-alice'));await expect(pa.locator('#accountName')).not.toContainText('게스트');await expect(pa.locator('#overallAttempts')).toHaveText('3');results.push('재로그인 시 본인 기록 복구');
 // Practical sessions use the deployed event schema and carry draft text in checkpoints.
 await pa.locator('#studyFormat').selectOption('practical');await pa.locator('#randomOrder').uncheck();await expect(pa.locator('#overallAttempts')).toHaveText('0');await pa.locator('#start10').click();
 await pa.locator('textarea[data-part="0"]').fill('절연변압기 · 기기 간 이어쓰기');await pa.locator('#topHome').click();await expect(pa.locator('#syncStatus')).toContainText('동기화 완료',{timeout:20000});
 await expect(pb.locator('#resumeRemote')).toContainText('실기',{timeout:20000});await pb.locator('#resumeRemote').click();await expect(pb.locator('textarea')).toHaveValue('절연변압기 · 기기 간 이어쓰기');
 await pb.locator('#revealWritten').click();await pb.locator('#writtenCorrect').click();await pb.locator('#topHome').click();await expect(pa.locator('#overallAttempts')).toHaveText('1',{timeout:20000});results.push('실기: 다른 기기의 작성 답안 이어쓰기·수동 판정 실시간 동기화');
 await a.setOffline(true);await pa.locator('#startUnseen10').click();await expect(pa.locator('input[data-part]')).toHaveCount(2);await pa.locator('input[data-part="0"]').fill('500V');await pa.locator('input[data-part="1"]').fill('150V');await pa.locator('#revealWritten').click();await pa.locator('#writtenWrong').click();await pa.locator('#topHome').click();await expect(pa.locator('#overallAttempts')).toHaveText('2');await expect(pb.locator('#overallAttempts')).toHaveText('1');
 await a.setOffline(false);await expect(pb.locator('#overallAttempts')).toHaveText('2',{timeout:30000});await expect(pa.locator('#syncStatus')).toContainText('동기화 완료',{timeout:20000});await pa.reload();await expect(pa.locator('#overallAttempts')).toHaveText('2');await pa.locator('#resume').click();await expect(pa.locator('input[data-part="0"]')).toHaveValue('500V');await expect(pa.locator('#writtenWrong')).toHaveCount(0);await pa.locator('#topHome').click();results.push('실기: 오프라인 작성·판정 후 재접속 동기화 및 새로고침 중복 방지');
 await pa.locator('#studyFormat').selectOption('mcq');await expect(pa.locator('#overallAttempts')).toHaveText('3');await pc.locator('#studyFormat').selectOption('practical');await expect(pc.locator('#overallAttempts')).toHaveText('0');results.push('실기: 객관식 통계와 별도 집계, 다른 계정과 기록 분리');
 expect(errors).toEqual([]);for(const s of results)console.log('PASS',s);await fs.writeFile('test-results/sync.json',JSON.stringify({environment:'Firebase Auth/Firestore Emulators + Chromium independent browser contexts; 실제 Google OAuth/실서비스 아님',results,errors},null,2));
}finally{await a.close();await b.close();await c.close();await browser.close();}
