import config from './firebase-config.json';
import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,getRedirectResult,setPersistence,browserLocalPersistence,signOut} from 'firebase/auth';
import {getFirestore,collection,doc,setDoc,onSnapshot,query} from 'firebase/firestore';
import {validateEvent,canonical} from './core.js';
const messages={
  'auth/configuration-not-found':'Firebase Authentication이 아직 설정되지 않았습니다. Firebase 콘솔 → Authentication → 시작하기에서 Google 로그인을 활성화하세요.',
  'auth/unauthorized-domain':'이 사이트 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.',
  'auth/popup-blocked':'로그인 팝업이 차단되었습니다. 팝업을 허용하거나 아래의 전체 화면 로그인을 사용하세요.',
  'auth/popup-closed-by-user':'로그인 창이 닫혔습니다. 다시 로그인할 수 있습니다.',
  'auth/network-request-failed':'네트워크 연결을 확인한 뒤 다시 로그인하세요.',
  'auth/operation-not-allowed':'Firebase에서 Google 로그인 공급자를 활성화해야 합니다.',
  'auth/web-storage-unsupported':'브라우저가 로그인 저장소를 차단했습니다. 일반 브라우저 모드에서 다시 시도하세요.',
  'permission-denied':'클라우드 접근이 거부되었습니다. 로그인과 Firestore 보안 규칙을 확인하세요.',
  'resource-exhausted':'Firebase 무료 할당량에 도달했습니다. 기록은 기기에 보관되며 나중에 재시도합니다.'
};
export const errorMessage=e=>messages[e.code]||`연결 오류 (${e.code||'unknown'}): ${e.message}`;
export async function connectCloud(store,ui){
  if(!config){ui.status('클라우드 미설정 · 기기에 저장됩니다.');ui.configured(false);return null;}
  ui.configured(true);const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);auth.languageCode='ko';
  let stop=null,generation=0,ready=false,flushing=false;const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  const flush=async()=>{
    if(flushing||!ready||!auth.currentUser||store.owner!==auth.currentUser.uid)return;
    if(!navigator.onLine){ui.status(`오프라인 · 미전송 ${store.pending()}개`);return;}
    const uid=store.owner,gen=generation;flushing=true;let again=false;
    try{
      const pending=store.rows.filter(e=>!e.synced);if(!pending.length){ui.status('동기화 완료');return;}
      ui.status(`저장 중 · ${pending.length}개`);
      for(let i=0;i<pending.length;i+=20){
        if(gen!==generation)return;
        await Promise.all(pending.slice(i,i+20).map(async row=>{const {owner,synced,...e}=row;await setDoc(doc(db,'users',uid,'events',e.id),e);await store.markSynced(e.id,uid);}));
      }
      if(gen===generation){again=store.pending()>0;ui.status(again?'추가 기록 저장 중':'동기화 완료');}
    }catch(e){if(gen===generation)ui.status('동기화 실패 · '+errorMessage(e));}
    finally{flushing=false;if(again&&gen===generation)queueMicrotask(flush);}
  };
  store.listeners.add(flush);window.addEventListener('online',flush);window.addEventListener('offline',()=>ui.status('오프라인 · 기기에 저장됩니다.'));
  setInterval(()=>{if(store.pending()&&document.visibilityState==='visible')flush();},30000);
  // Authentication persistence is independent of the study ledger in IndexedDB.
  await setPersistence(auth,browserLocalPersistence);
  getRedirectResult(auth).catch(e=>ui.status(errorMessage(e)));
  let authReadyResolve;const authReady=new Promise(r=>authReadyResolve=r);
  onAuthStateChanged(auth,async user=>{
    const gen=++generation;ready=false;stop?.();ui.busy(true);
    try{await store.switchOwner(user?.uid||'guest');if(gen!==generation)return;ui.user(user);ui.status(user?'클라우드 기록 불러오는 중':'로그아웃 · 기기에 저장됩니다.');
      if(user){
        stop=onSnapshot(query(collection(db,'users',user.uid,'events')),{includeMetadataChanges:true},async snap=>{
          if(gen!==generation)return;
          try{const rows=snap.docs.map(d=>{const e=d.data();validateEvent(e);if(e.id!==d.id)throw Error('클라우드 이벤트 ID 불일치');return {e,synced:!d.metadata.hasPendingWrites};});
            // Check local conflicts before any merge; keep every local record on failure.
            const local=new Map(store.events.map(e=>[e.id,e]));for(const {e}of rows)if(local.has(e.id)&&canonical(local.get(e.id))!==canonical(e))throw Error('클라우드와 로컬 이벤트 ID 충돌');
            for(const synced of [true,false])await store.add(rows.filter(r=>r.synced===synced).map(r=>r.e),{owner:user.uid,synced});
            ready=true;await flush();
          }catch(e){ui.status('동기화 실패 · '+errorMessage(e));}
        },e=>ui.status('동기화 실패 · '+errorMessage(e)));
      }
    }finally{ui.busy(false);authReadyResolve();}
  },e=>{ui.status(errorMessage(e));ui.busy(false);authReadyResolve();});
  await authReady;
  return {
    async login(redirect=false){ui.busy(true);try{if(redirect)await signInWithRedirect(auth,provider);else await signInWithPopup(auth,provider);}catch(e){ui.status(errorMessage(e));}finally{ui.busy(false);}},
    async logout(){ui.busy(true);try{await signOut(auth);}catch(e){ui.status(errorMessage(e));}finally{ui.busy(false);}},
    retry:flush
  };
}
