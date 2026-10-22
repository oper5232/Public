import {test,before,after} from 'node:test';
import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,deleteDoc} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-electrical-study',firestore:{rules:fs.readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8080}});});
after(async()=>{await env?.cleanup();});
const attempt={id:'a',kind:'attempt',qid:'q001',sessionId:'s',choice:0,correct:true,at:'2026-10-22T00:00:00.000Z'};
test('본인만 읽고 쓰기, 다른 계정과 비로그인 차단',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),n=env.unauthenticatedContext().firestore();
 await assertSucceeds(setDoc(doc(a,'users/alice/events/a'),attempt));
 await assertSucceeds(getDoc(doc(a,'users/alice/events/a')));
 for(const db of [b,n]){
  await assertFails(getDoc(doc(db,'users/alice/events/a')));await assertFails(getDocs(collection(db,'users/alice/events')));await assertFails(setDoc(doc(db,'users/alice/events/a'),attempt));
 }
});
test('동일 이벤트 재전송 허용, 변경·삭제 금지',async()=>{
 const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/events/a');
 await assertSucceeds(setDoc(ref,attempt));await assertFails(setDoc(ref,{...attempt,choice:1}));await assertFails(deleteDoc(ref));
});
test('잘못된 이벤트 형식 및 다른 경로 차단',async()=>{
 const db=env.authenticatedContext('alice').firestore();
 await assertFails(setDoc(doc(db,'users/alice/events/b'),{...attempt,id:'b',choice:8}));
 await assertFails(setDoc(doc(db,'users/alice/events/c'),{...attempt,id:'c',secret:'bad'}));
 await assertFails(setDoc(doc(db,'arbitrary/doc'),{data:true}));
});
