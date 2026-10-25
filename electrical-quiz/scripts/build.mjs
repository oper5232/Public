import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import './validate-bank.mjs';
await fs.mkdir('public',{recursive:true});
const bank=JSON.parse(await fs.readFile('src/questions.json','utf8'));
// Stamp the installed build, never the visitor's current clock. Git's commit
// date keeps CI rebuilds reproducible; SOURCE_DATE_EPOCH supports local previews.
let updatedAt;
if(process.env.SOURCE_DATE_EPOCH!==undefined){
 const epoch=Number(process.env.SOURCE_DATE_EPOCH);
 if(!Number.isFinite(epoch)||epoch<0)throw new Error('Invalid SOURCE_DATE_EPOCH');
 updatedAt=new Date(epoch*1000);
}else{
 try{updatedAt=new Date(execFileSync('git',['log','-1','--format=%cI'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());}
 catch{updatedAt=new Date();}
}
if(!Number.isFinite(updatedAt.getTime()))throw new Error('Invalid build update date');
const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(updatedAt).map(p=>[p.type,p.value]));
const updatedLabel=`${dateParts.year}.${dateParts.month}.${dateParts.day} ${dateParts.hour}:${dateParts.minute} (한국 시간)`;
const html=(await fs.readFile('src/index.html','utf8'))
 .replace('__APP_UPDATED_AT__',updatedAt.toISOString())
 .replace('__APP_UPDATED_LABEL__',updatedLabel)
 .replace('__QUESTION_DATA__',JSON.stringify(bank).replace(/</g,'\\u003c'));
await fs.writeFile('public/index.html',html);
await fs.copyFile('src/styles.css','public/styles.css');
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['safari15','chrome100'],outfile:'public/app.js',minify:true,legalComments:'eof'});
const names=['index.html','styles.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const hashes=await Promise.all(names.map(async f=>createHash('sha256').update(await fs.readFile('public/'+f)).digest('hex')));
const swTemplate=await fs.readFile('src/sw.js','utf8');
const version=createHash('sha256').update(hashes.join('')+swTemplate).digest('hex').slice(0,16);
const sw=swTemplate.replace('__CACHE_VERSION__',version);
await fs.writeFile('public/sw.js',sw);await fs.writeFile('public/.nojekyll','');
console.log('Build complete:',version, configStatus());
function configStatus(){return 'Firebase 설정은 src/firebase-config.json에서 관리합니다.';}
