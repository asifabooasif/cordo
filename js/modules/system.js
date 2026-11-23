/* Gem ERP :: modules/system.js
   System Health page (storage, restore points, cloud status, problem log, what's new), error capture and the first-run setup. */
const APP_VERSION='2.0.0';
const CHANGES=[
 ['2.0.0','Safer storage: the company record now lives in a proper database on the device (no 5 MB limit), photos are stored separately, and a restore point is made every day.'],
 ['2.0.0','Google sign-in and cloud sync through Firebase, so phone and computer share the same data. Works offline and catches up later.'],
 ['2.0.0','Team roles: Owner, Manager, Sales staff, Accountant (view only), with a discount approval limit for sales staff.'],
 ['2.0.0','Stones: several photos with zoom, certificate PDF or picture, a certificate register with re-check dates.'],
 ['2.0.0','Customer catalogue (download, print or WhatsApp) with prices in USD, EUR, GBP, THB or AED; export documents in any currency; optional tax line on invoices.'],
 ['2.0.0','Analytics with date filters, Excel downloads, cutting yield analysis, camera barcode scanning for stock take, and a shareable daily summary.'],
 ['2.0.0','New looks (Linen, Mocha, Midnight), smoother animation, and fixes for money rounding and duplicate invoice numbers.']];
/* ---- problem log ---- */
function logErr(m){try{GemDB.get('kv','errors').then(a=>{a=a||[];a.push({t:new Date().toISOString(),m:String(m).slice(0,400)});return GemDB.set('kv','errors',a.slice(-50))}).catch(()=>{})}catch(x){}}
addEventListener('error',ev=>logErr((ev.message||'Error')+' ('+String(ev.filename||'').split('/').pop()+':'+ev.lineno+')'));
addEventListener('unhandledrejection',ev=>logErr('Promise: '+((ev.reason&&ev.reason.message)||ev.reason)));
/* ---- page ---- */
pages.system=function(){setTimeout(sysFill,0);
  const q=window.__quota||0,u=window.__usage||0,c=(()=>{try{checkHtml();return window._chk||{bad:0,wn:0}}catch(x){return{bad:'?',wn:'?'}}})();
  return`<h1>System Health</h1><div class="kp"><div class="k"><small>Version</small><b>${APP_VERSION}</b></div><div class="k"><small>Storage on this device</small><b>${(u/1e6).toFixed(1)} MB</b></div><div class="k"><small>Cloud</small><b>${Cloud.enabled?e(Cloud.status):'off'}</b></div><div class="k"><small>Data check</small><b class="${c.bad?'bad':'ok'}">${c.bad||c.wn?c.bad+' errors, '+c.wn+' warnings':'All clear'}</b></div></div>
<div class="card"><h3>Restore points</h3><p class="m" style="margin-bottom:8px">A copy of all your data is kept automatically once a day (last 30). Restoring never deletes the current data: it makes a restore point first.</p><div class="bar"><button class="b1" onclick="snapNow()">Create restore point now</button></div><div id="snl"><p class="m">Loading…</p></div></div>
<div class="card"><h3>Problems recorded</h3><div id="erl"><p class="m">Loading…</p></div></div>
<div class="card"><h3>What's new</h3>${CHANGES.map(x=>`<p style="margin:6px 0"><b>${x[0]}</b> &nbsp;${e(x[1])}</p>`).join('')}</div>
<div class="card"><h3>About this system</h3><p class="m">Gem ERP runs in your browser and works offline. Everything is saved on the device first and then copied to your private cloud database. Open the Data Check page after big changes, and download a backup file now and then as a second safety net.</p>${window.__idbOK===false?'<p class="bad">This browser is not allowing the safe database (private window?). The app is using the old small storage.</p>':''}</div>`};
async function sysFill(){
  const s=document.getElementById('snl'),r=document.getElementById('erl');
  if(s){const L=(await GemStore.Snap.index()).slice().reverse();s.innerHTML=tbl(['When','What','#Stones','#Invoices','#Size',''],L.map(x=>`<tr><td>${new Date(x.at).toLocaleString('en-GB')}</td><td>${e(x.label)}</td><td class="r">${x.stones}</td><td class="r">${x.sales}</td><td class="r">${x.kb} KB</td><td><button class="sm" onclick="snapRestore('${x.id}')">Restore</button> <button class="sm" onclick="snapDel('${x.id}')">Delete</button></td></tr>`))}
  if(r){const L=((await GemDB.get('kv','errors').catch(()=>null))||[]).slice().reverse();r.innerHTML=L.length?tbl(['When','What'],L.slice(0,25).map(x=>`<tr><td>${new Date(x.t).toLocaleString('en-GB')}</td><td>${e(x.m)}</td></tr>`))+`<button class="sm" onclick="GemDB.set('kv','errors',[]).then(go)">Clear</button>`:'<p class="ok">No problems recorded.</p>'}}
function snapNow(){const l=prompt('Name for this restore point (optional)','Manual');if(l===null)return;GemStore.Snap.take(l||'Manual').then(()=>{toast('Restore point saved');go()})}
function snapRestore(id){if(!(window.can?can('restore'):true))return deny();if(!confirm('Replace ALL current data with this restore point?\n\nA restore point of the current data is made first.'))return;GemStore.Snap.restore(id).then(()=>{toast('Restored');go()}).catch(x=>alert('Could not restore: '+x.message))}
function snapDel(id){if(confirm('Delete this restore point?'))GemStore.Snap.remove(id).then(()=>go())}
/* ---- first-run setup (only when the company holds the demo data and nothing has been chosen yet) ---- */
function maybeOnboard(){
  if(!D._seed||!(window.Me&&(Me.role==='owner')))return;
  const d=$('#dlg');d.innerHTML=`<h3>Welcome to Gem ERP</h3><p class="m" style="margin-bottom:10px">How would you like to start?</p><label class="m">Company name<input id="ob" placeholder="Your company name" style="width:100%"></label><div class="pick" style="margin-top:12px"><div><span><b>Start with an empty company</b><br><small class="m">Recommended for real use.</small></span><button class="b1" id="ob1">Start empty</button></div><div><span><b>Explore with demo data</b><br><small class="m">A few sample stones and parties.</small></span><button id="ob2">Use demo</button></div><div><span><b>Restore a backup file</b><br><small class="m">Bring data from the old version.</small></span><button id="ob3">Choose file</button></div></div><div class="dlgbar"><button onclick="dlg.close()">Decide later</button></div>`;
  $('#ob1').onclick=()=>{const n=($('#ob').value||'').trim();GemStore.adopt({parties:[],stones:[],purchases:[],sales:[],v2:1,co:n?{name:n}:{}}).then(()=>{d.close();go()})};
  $('#ob2').onclick=()=>{const n=($('#ob').value||'').trim();GemStore.adopt(seed()).then(()=>{if(n){D.co={name:n};save()}d.close();go()})};
  $('#ob3').onclick=()=>{d.close();location.hash='backup';toast('Press Restore backup on this page')};
  d.showModal()}
