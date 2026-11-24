/* Gem ERP :: js/core/pwa.js
   Registers the service worker (offline use) and shows a banner when a new version is ready. */
function registerSW(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const ready=w=>{
      if(!w||document.getElementById('upd'))return;
      const b=document.createElement('div');b.id='upd';b.className='noprint';
      b.style.cssText='position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:60;background:#1a1533;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 8px 30px #0006;display:flex;gap:12px;align-items:center;font-size:13px';
      b.innerHTML='A new version is ready <button style="background:#2a5bd7;color:#fff;border:0;border-radius:8px;padding:6px 12px;cursor:pointer">Reload</button>';
      b.querySelector('button').onclick=()=>w.postMessage('SKIP_WAITING');
      document.body.appendChild(b);
    };
    if(reg.waiting&&navigator.serviceWorker.controller)ready(reg.waiting);
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing;
      if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ready(w)});
    });
  }).catch(()=>{});
  let reloaded=false;const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||!had)return;reloaded=true;location.reload()});
}
