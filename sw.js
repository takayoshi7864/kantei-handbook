const C='kantei-v2';
const ASSETS=['./','index.html','app.js','toc.js','search.js','kyusei.js','style.css','manifest.webmanifest','icon.svg','vendor/pdf.min.mjs','vendor/pdf.worker.min.mjs'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// 同一オリジンは「キャッシュ優先＋取得できたら保存」（OCR部品は初回使用時に保存される）
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp))}return res})))});
