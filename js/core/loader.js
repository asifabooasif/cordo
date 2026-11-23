/* Gem ERP :: core/loader.js
   First script. Opens the local database (IndexedDB), reads the saved company data and the photo store,
   then loads every <script type="text/gem-script"> from index.html in order. */
window.GemDB=(function(){
  let dbp=null;
  const open=()=>dbp||(dbp=new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error('IndexedDB is not available'));
    const r=indexedDB.open('gem_erp',1);
    r.onupgradeneeded=()=>{const d=r.result;['kv','snaps','files'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s)})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('Database blocked by another tab'));
  }));
  const run=(s,m,f)=>open().then(db=>new Promise((res,rej)=>{
    const t=db.transaction(s,m),o=t.objectStore(s);let q;
    try{q=f(o)}catch(x){return rej(x)}
    t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('Database write aborted'));
  }));
  return{
    get:(s,k)=>run(s,'readonly',o=>o.get(k)),
    set:(s,k,v)=>run(s,'readwrite',o=>o.put(v,k)),
    del:(s,k)=>run(s,'readwrite',o=>o.delete(k)),
    keys:s=>run(s,'readonly',o=>o.getAllKeys()),
    all:s=>run(s,'readonly',o=>o.getAll()),
    setMany:(s,pairs)=>run(s,'readwrite',o=>{pairs.forEach(p=>o.put(p[1],p[0]))})
  };
})();
(async function(){
  window.__MEDIA={};window.__BOOT_DATA=null;window.__idbOK=true;
  try{
    window.__BOOT_DATA=(await GemDB.get('kv','company'))||null;
    const ks=await GemDB.keys('files'),vs=await GemDB.all('files');
    ks.forEach((k,i)=>{window.__MEDIA[k]=vs[i]});
  }catch(x){window.__idbOK=false;window.__idbErr=String(x&&x.message||x)}
  const tags=[...document.querySelectorAll('script[type="text/gem-script"]')];
  const fail=src=>{const d=document.createElement('div');d.style.cssText='padding:24px;font:15px system-ui;color:#b91c1c';d.textContent='Gem ERP could not load '+src+'. Check your connection and reload the page.';document.body.prepend(d)};
  tags.forEach(t=>{const s=document.createElement('script');s.src=t.getAttribute('src');s.async=false;s.onerror=()=>fail(s.src);document.body.appendChild(s)});
})();
