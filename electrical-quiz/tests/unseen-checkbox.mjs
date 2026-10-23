import {chromium,devices,expect} from '@playwright/test';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const p=await b.newPage({...devices['Pixel 7']}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4191/');const bank=JSON.parse(await p.locator('#questionData').textContent());
 await expect(p.locator('#startUnseen10,#startUnseenAll')).toHaveCount(0);await expect(p.getByRole('checkbox',{name:'미응시 문제만 출제'})).not.toBeChecked();
 const history=Object.fromEntries(bank.map((q,i)=>[q.id,{attempts:i<7?0:1,correct:i<7?0:1,wrong:0}]));
 await p.locator('#importFile').setInputFiles({name:'seven-unseen.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({history}))});await p.locator('#confirmImport').click();await expect(p.locator('#unseenCount')).toHaveText('7');await p.locator('#randomOrder').uncheck();await p.locator('#unseenOnly').check();
 for(const id of ['start10','start20','startAll']){await p.locator('#'+id).click();await expect(p.locator('#qGrid button')).toHaveCount(7);await p.locator('#topHome').click();}
 await p.locator('#startAll').click();for(let i=0;i<7;i++){await p.locator('#qOptions button[data-index="0"]').click();await p.locator('#qNext').click();}await p.locator('#finishHome').click();await expect(p.locator('#unseenCount')).toHaveText('0');
 for(const id of ['start10','start20','startAll'])await expect(p.locator('#'+id)).toBeDisabled();await expect(p.locator('#unseenOnly')).toBeEnabled();await p.locator('#unseenOnly').uncheck();await expect(p.locator('#startAll')).toBeEnabled();
 await p.locator('#studyFormat').selectOption('practical');await p.locator('#unseenOnly').check();await p.locator('#yearSelect').selectOption('2021-2회');await p.locator('#start20').click();await expect(p.locator('#qGrid button')).toHaveCount(11);await expect(p.locator('#qOptions button')).toHaveCount(0);
 await p.locator('#topHome').click();expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await p.locator('#unseenOnly').scrollIntoViewIfNeeded();await p.screenshot({path:'test-results/unseen-checkbox-mobile.png'});
 console.log('PASS: single checkbox; 10/20/all obey unseen scope; zero unseen disables starts; uncheck restores normal learning; practical/year filters; no runtime errors');
}finally{await b.close()}
