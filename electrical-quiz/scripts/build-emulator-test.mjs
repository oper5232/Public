// Test-only build. Never deploy test-results/emulator-site.
import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('test-results/emulator-site',{recursive:true});
await fs.cp('public','test-results/emulator-site',{recursive:true});
await fs.rm('test-results/emulator-site/sw.js');
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',target:'chrome120',outfile:'test-results/emulator-site/app.js',plugins:[{
 name:'emulator-only',setup(b){
  b.onLoad({filter:/src\/firebase-config\.json$/},()=>({loader:'json',contents:JSON.stringify({apiKey:'demo-key',authDomain:'localhost',projectId:'demo-electrical-study',appId:'demo-app'})}));
  b.onLoad({filter:/src\/cloud\.js$/},async(args)=>{
   const s=await fs.readFile(args.path,'utf8');return {loader:'js',contents:"import {connectAuthEmulator,signInWithCredential} from 'firebase/auth';import {connectFirestoreEmulator} from 'firebase/firestore';\n"+s.replace("auth.languageCode='ko';",`auth.languageCode='ko';connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);
   window.__testSignIn=async(sub='alice')=>{const token=JSON.stringify({sub,email:sub+'@example.test',email_verified:true,aud:'demo-key',iss:'https://accounts.google.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return signInWithCredential(auth,GoogleAuthProvider.credential(token));};
   `)};
  });
  b.onLoad({filter:/src\/app\.js$/},async(args)=>({loader:'js',contents:(await fs.readFile(args.path,'utf8')).replace("if('serviceWorker' in navigator)","if(false)")}));
 }
}]});
