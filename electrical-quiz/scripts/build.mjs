import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import './validate-bank.mjs';
await fs.mkdir('public',{recursive:true});
const bank=JSON.parse(await fs.readFile('src/questions.json','utf8'));
const html=(await fs.readFile('src/index.html','utf8')).replace('__QUESTION_DATA__',JSON.stringify(bank).replace(/</g,'\\u003c'));
await fs.writeFile('public/index.html',html);
await fs.copyFile('src/styles.css','public/styles.css');
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:['safari15','chrome100'],outfile:'public/app.js',minify:true,legalComments:'eof'});
const names=['index.html','styles.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const hashes=await Promise.all(names.map(async f=>createHash('sha256').update(await fs.readFile('public/'+f)).digest('hex')));
const version=createHash('sha256').update(hashes.join('')).digest('hex').slice(0,16);
const sw=(await fs.readFile('src/sw.js','utf8')).replace('__CACHE_VERSION__',version);
await fs.writeFile('public/sw.js',sw);await fs.writeFile('public/.nojekyll','');
console.log('Build complete:',version, configStatus());
function configStatus(){return 'Firebase 설정은 src/firebase-config.json에서 관리합니다.';}
