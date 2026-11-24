/* Gem ERP :: modules/guardian.js
   Internal Guardian. Watches the books and the people using them: scans for broken records, risky behaviour and a weak
   safety net, keeps a daily tamper-evident seal chain, makes a restore point before risky bulk changes, and shows a
   live shield in the top bar. The detection rules are in core/guard.js. */
const Guardian=(function(){
const sha=async t=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')};
let last=null,seals=[],chain={ok:true},snaps=[],busy=false,tm=0,seq=0;
const role=()=>(window.Me&&Me.role)||'owner',pinSet=()=>{try{return!!localStorage.getItem('gem_lock')}catch(x){return null}};
async function load(){seals=(await GemDB.get('kv','guardSeals').catch(()=>null))||[];try{snaps=await GemStore.Snap.index()}catch(x){snaps=[]}}
async function ensureSeal(force){
  if(!D||D._seed||window.__idbOK===false)return;
  const t=today(),l=seals[seals.length-1];
  if(!force&&l&&l.d.slice(0,10)===t)return;
  const s=await GemGuard.seal(l||null,D,Date.now(),sha,(window.Me&&Me.email)||'');
  seals.push(s);seals=seals.slice(-400);await GemDB.set('kv','guardSeals',seals).catch(()=>{});
}
async function scan(){
  if(busy||!D)return last;busy=true;
  try{
    await load();
    chain=await GemGuard.verifyChain(seals,sha);
    const lastSeal=seals[seals.length-1];
    const A=(await GemDB.get('kv','audit').catch(()=>null))||[],E=(await GemDB.get('kv','errors').catch(()=>null))||[];
    const env={bkAge:typeof bkAge=='function'?(D.lastBackup?bkAge():999):999,usageP:typeof useP=='function'?useP():0,cloud:window.Cloud&&Cloud.status,pinSet:pinSet(),role:role(),chain,drift:chain.ok?GemGuard.drift(lastSeal,D):[]};
    last=GemGuard.scan({D,now:Date.now(),audit:A,errors:E,snaps,env});
    await ensureSeal();
    seq++;paint();
  }catch(x){if(typeof logErr=='function')logErr('Guardian scan failed: '+(x&&x.message))}
  busy=false;return last;
}
const LV={ok:['Protected','All checks passed'],warn:['Needs a look','Some things to check'],bad:['At risk','Urgent items found']};
function badgeHtml(){if(role()==='staff')return'';const l=last,lv=l?l.level:'ok';return`<button id="gsh" class="gsh ${lv}" onclick="location.hash='guardian'" title="Guardian: ${l?l.score+' / 100 · '+LV[lv][0]:'scanning'}">${ic('shield',18)}<span>${l?l.score:'…'}</span></button>`}
function paint(){if(seq===1&&/^(#?dashboard)?$/.test(location.hash.slice(1))&&window.__entered&&typeof go=='function'&&!document.querySelector('dialog[open]'))setTimeout(go,0);const b=document.getElementById('gsh');if(b)b.outerHTML=badgeHtml();if(document.querySelector('#pg .gd')&&(location.hash.slice(1)==='guardian')&&!window.__gdBusy){const p=document.getElementById('pg');if(p&&!document.activeElement.closest?.('#pg input,#pg select'))p.innerHTML=pages.guardian();Viz.play(p)}}
function schedule(ms){clearTimeout(tm);tm=setTimeout(scan,ms||4000)}
/* make a restore point before something that changes many records at once */
function preflight(name,label){const f=window[name];if(typeof f!=='function')return;window[name]=function(){const a=arguments,self=this;try{GemStore.Snap.take('Guardian: before '+label).then(()=>f.apply(self,a)).catch(()=>f.apply(self,a))}catch(x){return f.apply(self,a)}}}
function start(){
  const _save=window.save;if(typeof _save=='function')window.save=function(){const r=_save.apply(this,arguments);schedule(6000);return r};
  preflight('bulkPrice','changing prices in bulk');
  (window.__alertHooks=window.__alertHooks||[]).push(()=>{if(!last||role()==='staff')return[];const o=[];last.findings.filter(f=>f.sev==='bad').slice(0,4).forEach(f=>o.push(['bad','Guardian: '+f.title,'guardian']));const w=last.findings.filter(f=>f.sev==='warn').length;if(w)o.push(['warn','Guardian: '+w+' thing(s) to check',  'guardian']);return o});
  setTimeout(scan,2500);setInterval(()=>{if(!document.hidden)scan()},120000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(800)});
}
const ago=t=>{const m=Math.round((Date.now()-Date.parse(t))/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
function layers(){
  const sn=snaps.length?snaps[snaps.length-1]:null,ls=seals[seals.length-1],pin=pinSet(),cloud=window.Cloud&&Cloud.status;
  const row=(ok,title,txt,go)=>`<div class="gl ${ok===true?'on':ok===false?'off':'mid'}"><i>${ok===true?ic('checkc',20):ok===false?ic('x',20):ic('clock',20)}</i><div><b>${title}</b><span>${txt}</span></div>${go?`<button class="sm" onclick="${go[1]}">${go[0]}</button>`:''}</div>`;
  const bk=typeof bkAge=='function'&&D.lastBackup?bkAge():null;
  return`<div class="gd-layers">${row(true,'Audit trail','Every add, change and delete is recorded with who and when.',['Open','location.hash=\'audit\''])}${row(!!sn&&(Date.now()-Date.parse(sn.at))<36e5*36,'Restore points',sn?snaps.length+' kept, newest '+ago(sn.at):'None yet',['Manage','location.hash=\'system\''])}${row(chain.ok&&seals.length>0?true:chain.ok?null:false,'Daily seals',seals.length?seals.length+' sealed, chain '+(chain.ok?'intact':'BROKEN'):'First seal is made on the next scan',['View','document.getElementById(\'gdseal\').scrollIntoView({behavior:\'smooth\'})'])}${row(bk!=null&&bk<14?true:bk==null?false:null,'Backup file',bk==null?'Never downloaded':bk+' day(s) old',['Backup','location.hash=\'backup\''])}${row(pin?true:false,'Screen lock',pin?'PIN is set on this device':'No PIN on this device',['Set','location.hash=\'system\''])}${row(true,'Role access',(typeof ROLES!='undefined'&&ROLES[role()])||role()+' on this device',role()==='owner'?['Team','location.hash=\'team\'']:null)}${row(cloud==='synced'||cloud==='local'?(cloud==='synced'):null,'Cloud sync',cloud==='synced'?'Connected and up to date':cloud==='local'?'This device only (no cloud)':'Status: '+(cloud||'unknown'),['Details','location.hash=\'system\''])}</div>`}
function finding(f){const act=f.act&&f.act.k;return`<div class="gf ${f.sev}"><span class="gp">${f.sev==='bad'?'Urgent':f.sev==='warn'?'Check':'Tip'}</span><div class="gb"><b>${e(f.title)}</b><p>${e(f.detail)}</p>${f.items.length?`<small>${f.items.map(e).join(' · ')}${f.n>f.items.length?' · +'+(f.n-f.items.length)+' more':''}</small>`:''}</div><div class="ga">${act==='snap'?'<button class="sm" onclick="Guardian.snapNow()">Make restore point</button>':''}${f.page?`<button class="sm" onclick="location.hash='${f.page}'">${act==='backup'?'Backup':'Open'}</button>`:''}</div></div>`}
function page(){
  if(!last){setTimeout(scan,50);return`<div class="gd"><h1>Guardian</h1><div class="card">${Illus.empty('shield','Scanning your books…','This takes a second.')}</div></div>`}
  const l=last,lv=l.level,areas=['Books','Activity','Seals','Safety net'];
  return`<div class="gd"><div class="gd-hero ${lv}">${Illus.banner('guardian',900,200)}<div class="gd-art">${Illus.shieldArt()}</div><div class="gd-tx"><span class="kick">${LV[lv][1]}</span><h1>${LV[lv][0]}</h1><div class="gd-score"><b data-count="${l.score}">${l.score}</b><span>/ 100 guardian score</span></div><p class="m">${l.passed} of ${l.checks} checks passed · scanned ${ago(new Date(l.at).toISOString())}</p><div class="bar"><button class="b1" onclick="Guardian.run(this)">Scan now</button><button onclick="Guardian.snapNow()">Make restore point</button><button onclick="Guardian.sealNow()">Seal today's books</button></div></div></div>
<div class="gd-chips"><div class="k bad"><small>Urgent</small><b>${l.bad}</b></div><div class="k warn"><small>To check</small><b>${l.warn}</b></div><div class="k"><small>Tips</small><b>${l.info}</b></div><div class="k ok"><small>Checks passed</small><b>${l.passed}</b></div></div>
<div class="card"><h3>What the Guardian found</h3>${l.findings.length?areas.map(a=>{const L=l.findings.filter(f=>f.area===a);return L.length?`<div class="gfa"><h4>${a}</h4>${L.map(finding).join('')}</div>`:''}).join(''):Illus.empty('shield','Everything checks out','No broken records, risky changes or safety-net gaps were found.')}</div>
<div class="card"><h3>Protection layers</h3>${layers()}</div>
<div class="card" id="gdseal"><h3>Daily seals <span class="m">tamper-evident fingerprints of your books</span></h3><p class="m" style="margin-bottom:10px">Each day the Guardian records a fingerprint of the books (counts and totals) linked to the day before. If someone edits a seal, the chain breaks. If records disappear without being cancelled, the Guardian warns you.</p>${tbl(['#','Date','Invoices','Stones','#Sales total','Chain'],seals.slice(-10).reverse().map(s=>`<tr><td>${s.n}</td><td>${s.d.slice(0,10)}</td><td>${s.m.sales}${s.m.void?' (+'+s.m.void+' cancelled)':''}</td><td>${s.m.stones}</td><td class="r">${rs(s.m.salesTotal)}</td><td class="m"><code>${s.h.slice(0,10)}…</code></td></tr>`))}<div class="bar" style="margin-top:10px"><button onclick="Guardian.exportSeals()">Download seals</button></div><p class="m">Seals are kept on this device. They show that the books were not quietly changed after the fact; they do not replace backups.</p></div></div>`}
return{start,scan,badgeHtml,page,paint,
  run:async b=>{if(b){b.disabled=true;b.textContent='Scanning…'}window.__gdBusy=false;await scan();toast('Scan finished')},
  snapNow:async()=>{try{await GemStore.Snap.take('Guardian: manual restore point');toast('Restore point saved');scan()}catch(x){alert('Could not save a restore point: '+(x&&x.message))}},
  sealNow:async()=>{await load();await ensureSeal(true);await scan();toast('Books sealed')},
  exportSeals:()=>{const b=new Blob([JSON.stringify(seals,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='guardian-seals-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},
  get last(){return last}};
})();
pages.guardian=()=>Guardian.page();
window.Guardian=Guardian;
