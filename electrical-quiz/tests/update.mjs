import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium,expect} from '@playwright/test';
const BANK_SIZE=JSON.parse(await fs.readFile(new URL('../src/questions.json',import.meta.url),'utf8')).length;
const root=path.resolve('test-results/update-site');await fs.mkdir(root,{recursive:true});await fs.cp('public',root,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{let name=new URL(req.url,'http://localhost').pathname;name=name==='/'?'/index.html':name;const file=path.join(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const body=await fs.readFile(file);res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':name.endsWith('.png')?'image/png':'application/json');res.setHeader('Cache-Control','no-store');res.end(body);}catch{res.writeHead(404).end();}
});await new Promise(r=>server.listen(4175,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:4175/');await expect(page.locator('#totalCount')).toHaveText(String(BANK_SIZE));await page.locator('#start10').click();await page.locator('#qOptions button').first().click();await expect(page.locator('#qExplanation')).not.toBeEmpty();await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('1');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 const file=path.join(root,'index.html'),html=await fs.readFile(file,'utf8'),bank=JSON.parse(html.match(/id="questionData">([\s\S]*?)<\/script>/)[1]);bank.push({...bank[0],id:'test-new-2021-01',year:'2021-1회',examYear:2021,round:1});await fs.writeFile(file,html.replace(/(id="questionData">)[\s\S]*?(<\/script>)/,(_,a,b)=>a+JSON.stringify(bank)+b));
 const sw=await fs.readFile(path.join(root,'sw.js'),'utf8');await fs.writeFile(path.join(root,'sw.js'),sw.replace(/electrical-study-[a-f0-9]+/,'electrical-study-update-test'));
 await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await expect(page.locator('#updateApp')).toBeVisible({timeout:15000});await page.locator('#updateApp').click();await expect(page.locator('#totalCount')).toHaveText(String(BANK_SIZE+1),{timeout:15000});await expect(page.locator('#overallAttempts')).toHaveText('1');await expect(page.locator('#unseenCount')).toHaveText(String(BANK_SIZE));
 await fs.writeFile('test-results/update.json',JSON.stringify({environment:'Chromium + service worker + local HTTP fixture',result:'PASS',checks:[`${BANK_SIZE}→${BANK_SIZE+1}문항 추가`,'새 버전 준비 알림·사용자 적용','기존 ID 풀이 횟수·미응시 보존']},null,2));console.log(`PASS F: PWA 새 버전 ${BANK_SIZE+1}문항 적용 후 기존 기록 보존`);
}finally{await browser.close();server.close();}
