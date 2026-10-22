import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';

// Model GitHub Pages' ten-minute HTTP cache while replacing an installed PWA.
const publicRoot=path.resolve('public');let version=1;
const server=http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.join(publicRoot,name==='/'?'index.html':name);
  if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403).end();return;}
  let data=await fs.readFile(file);
  if(name==='/'||name==='/index.html')data=Buffer.from(data.toString().replace('<body>',`<body data-test-release="${version}">`));
  if(name==='/app.js')data=Buffer.from(`window.__testRelease=${version};\n`+data.toString());
  if(name==='/sw.js')data=Buffer.from(data.toString().replace(/electrical-study-[a-f0-9]+/,`electrical-study-cache-test-${version}`));
  const etag='"'+createHash('sha256').update(data).digest('hex')+'"';
  res.setHeader('Cache-Control',name==='/sw.js'?'no-cache':'public, max-age=600');res.setHeader('ETag',etag);
  if(req.headers['if-none-match']===etag){res.writeHead(304).end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.webmanifest')?'application/manifest+json':'text/html');res.end(data);
 }catch{res.writeHead(404).end();}
});await new Promise(r=>server.listen(4182,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4182/');await expect(page.locator('#totalCount')).toHaveText('189');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await page.locator('#start10').click();await page.locator('#qOptions button').first().click();await expect(page.locator('#qExplanation')).not.toBeEmpty();await page.locator('#topHome').click();await expect(page.locator('#overallAttempts')).toHaveText('1');
 version=2;await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await expect(page.locator('#updateApp')).toBeVisible({timeout:15000});
 const reload=page.waitForEvent('load');await page.locator('#updateApp').click();await reload;
 const seen=await page.evaluate(()=>({html:document.body.dataset.testRelease,script:window.__testRelease}));console.log('Versions after applying update:',JSON.stringify(seen));
 await expect(page.locator('body')).toHaveAttribute('data-test-release','2');expect(seen.script).toBe(2);await expect(page.locator('#overallAttempts')).toHaveText('1');
 await page.locator('#start10').click();await expect(page.locator('#homeTools')).toBeHidden();await expect(page.locator('#quiz')).toBeVisible();
 await page.locator('#topHome').click();await page.evaluate(()=>{const wrapper=document.getElementById('homeTools');wrapper.replaceWith(...wrapper.childNodes);});
 await page.locator('#start10').click();await expect(page.locator('#quiz')).toBeVisible();await expect(page.locator('.account-panel')).toBeHidden();
 await page.locator('#topHome').click();await expect(page.locator('.account-panel')).toBeVisible();
 version=3;await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await expect(page.locator('#updateApp')).toBeVisible({timeout:15000});
 // Another tab may activate the waiting worker before this tab's button is used.
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();const changed=new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',()=>r(),{once:true}));reg.waiting.postMessage('ACTIVATE_UPDATE');await changed;});
 await expect(page.locator('body')).toHaveAttribute('data-test-release','2');const reloadAgain=page.waitForEvent('load');await page.locator('#updateApp').click();await reloadAgain;
 await expect(page.locator('body')).toHaveAttribute('data-test-release','3');await expect(page.locator('#overallAttempts')).toHaveText('1');
 version=4;await page.goto('http://127.0.0.1:4182/update.html');await expect(page).toHaveURL('http://127.0.0.1:4182/',{timeout:30000});
 await expect(page.locator('body')).toHaveAttribute('data-test-release','4');await expect(page.locator('#overallAttempts')).toHaveText('1');expect(errors).toEqual([]);
 console.log('PASS: cached PWA updates both HTML and JavaScript, preserves records, and quiz buttons remain usable');
}finally{await context.close();await browser.close();server.close();}
