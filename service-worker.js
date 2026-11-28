const CACHE='lift-growth-v29';
const ASSETS=['./','./index.html','./vendor/xlsx-0.20.3.full.min.js','./styles.css?v=29','./app.js?v=29','./exercise-library.js?v=29','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  try{
   const fresh=await fetch(event.request,{cache:'no-store'});
   if(fresh&&fresh.ok){const cache=await caches.open(CACHE);cache.put(event.request,fresh.clone());}
   return fresh;
  }catch(err){
   return (await caches.match(event.request))||(event.request.mode==='navigate'?await caches.match('./index.html'):Response.error());
  }
 })());
});
