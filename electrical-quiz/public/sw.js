const CACHE='electrical-study-88943f15f3ee3253';
const FILES=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('electrical-study-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url),scope=new URL(self.registration.scope);
  if(e.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.includes('/__/auth/'))return;
  const path=url.pathname.slice(scope.pathname.length);
  if(!['','index.html','app.js','styles.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'].includes(path))return;
  e.respondWith(caches.open(CACHE).then(async c=>await c.match(e.request,{ignoreSearch:true})||fetch(e.request)));
});
