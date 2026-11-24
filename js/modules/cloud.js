/* Gem ERP :: modules/cloud.js
   Google sign-in, company-wide sync through Firestore, and the Team & Access page.
   The app always works from the copy on this device first; Firestore keeps every device in step.
   Each collection of the company record (stones, sales, cash ...) is one unit of sync: newer wins, except lists of records,
   which are merged so two people adding invoices at the same time keep both. */
const Cloud=(function(){
const CFG=window.GEM_FIREBASE||{enabled:false},CID=CFG.companyId||'main',SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-';
let fb=null,auth=null,db=null,user=null,unsubData=null,unsubIdx=null,entered=false,status=CFG.enabled?'connecting':'local',lastSync=0,errMsg='',ready,pushT=0,pushing=false,fetching=false;
const RD=new Map(),HAVE=new Set(),pend=new Set(),readyP=new Promise(r=>{ready=r}),dlgEl=()=>document.getElementById('dlg');
const FR={'permission-denied':'The cloud database refused access. Check that firestore.rules is published and that your email is allowed.','unavailable':'You seem to be offline. Your work is saved on this device and will sync later.','auth/unauthorized-domain':'This website address is not authorised in Firebase (Authentication → Settings → Authorised domains).','auth/operation-not-allowed':'Google sign-in is not switched on in Firebase (Authentication → Sign-in method).','auth/network-request-failed':'No internet connection.'};
const friendly=err=>FR[err&&err.code]||FR[(err&&err.code||'').replace('firestore/','')]||String(err&&err.message||err);
const canPush=()=>CFG.enabled&&db&&user&&window.Me&&!Me.cached&&['owner','manager','staff'].includes(Me.role)&&!D._seed;
/* ---------- sign-in screen ---------- */
function gate(kind,msg){
  let g=document.getElementById('gate');if(!g){g=document.createElement('div');g.id='gate';document.body.appendChild(g)}
  const loc=CFG.allowLocal?'<button id="gl" class="link">Work on this device only (no sign-in)</button>':'';
  const body={
    loading:`<p class="m">${e(msg||'Loading…')}</p><div class="spin"></div>`,
    login:`<p class="m">Sign in to open your company.</p>${msg?`<p class="bad">${e(msg)}</p>`:''}<button id="gs" class="b1 big">Sign in with Google</button>${loc}`,
    denied:`<p><b>${e(user&&user.email||'')}</b> is not on the team list.</p><p class="m">Ask the owner to add this email under Team &amp; Access, then sign in again.</p><button id="go" class="b1">Sign out</button>`,
    error:`<p class="bad">${e(msg||'Something went wrong.')}</p><div class="bar"><button id="gr" class="b1">Try again</button>${user?'<button id="go">Sign out</button>':''}</div>${loc}`
  }[kind];
  g.innerHTML=`<div class="gcard"><div class="glogo">&#9670;</div><h2>Gem ERP</h2>${body}</div>`;
  const on=(id,f)=>{const b=g.querySelector('#'+id);if(b)b.onclick=f};
  on('gs',signIn);on('go',signOut);on('gr',()=>location.reload());
  on('gl',()=>{window.Me={email:'',role:'owner',local:true};status='local';enter();pill()});
}
function enter(){if(entered)return;entered=true;window.__entered=true;const g=document.getElementById('gate');if(g)g.remove();window.applyRole&&applyRole();ready()}
/* ---------- start ---------- */
async function start(){
  if(!CFG.enabled){window.Me={email:'',role:'owner',local:true};enter();return readyP}
  const cached=await GemDB.get('kv','session').catch(()=>null);
  gate('loading','Starting…');
  try{await loadSDK()}catch(x){if(cached){useCached(cached);return readyP}gate('error','Could not reach Google services. Check your internet connection.');return readyP}
  fb=window.firebase;if(!fb.apps.length)fb.initializeApp(CFG.config);
  auth=fb.auth();db=fb.firestore();try{db.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(x){}
  auth.onAuthStateChanged(u=>onAuth(u,cached));
  return readyP}
function useCached(c){window.Me={...c,cached:true};status='offline';enter();pill()}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(s);setTimeout(()=>rej(new Error('Timed out loading Google services')),15000)})}
async function loadSDK(){if(window.firebase&&firebase.firestore)return;for(const f of['app','auth','firestore'])await loadScript(SDK+f+'-compat.js')}
async function onAuth(u,cached){
  if(!u){user=null;stopSync();if(entered){location.reload();return}gate('login');return}
  user=u;if(!entered)gate('loading','Checking your access…');
  try{
    const acc=await resolveAccess(u);
    if(!acc.ok){if(!entered)gate('denied');else{status='error';errMsg='Your account is no longer on the team list.';pill()}return}
    window.Me={email:u.email.toLowerCase(),name:u.displayName||u.email,role:acc.role,photo:u.photoURL};
    GemDB.set('kv','session',{email:Me.email,name:Me.name,role:Me.role}).catch(()=>{});
    window.applyRole&&applyRole();
    await startSync();enter();pill();
    if(entered&&typeof go==='function'&&!(dlgEl()&&dlgEl().open))go();
  }catch(err){
    if(cached&&cached.email===(u.email||'').toLowerCase()){if(!entered)useCached(cached);else{status='offline';pill()}return}
    if(entered){status='error';errMsg=friendly(err);pill();return}
    gate('error',friendly(err))}
}
async function resolveAccess(u){
  if(!u.email||u.emailVerified===false)return{ok:false};
  const em=u.email.toLowerCase(),mem=await db.doc(`companies/${CID}/members/${em}`).get();
  if(mem.exists)return{ok:true,role:mem.data().role||'staff'};
  const co=await db.doc(`companies/${CID}`).get();
  if(!co.exists){
    await db.doc(`companies/${CID}`).set({ownerEmail:em,created:Date.now()});
    await db.doc(`companies/${CID}/members/${em}`).set({email:em,name:u.displayName||'',role:'owner',addedBy:em,t:Date.now()});
    return{ok:true,role:'owner',first:true}}
  return{ok:false}}
async function signIn(){
  const p=new fb.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  try{await auth.signInWithPopup(p)}
  catch(err){if(err.code==='auth/popup-blocked'||err.code==='auth/operation-not-supported-in-this-environment')return auth.signInWithRedirect(p);
    if(!/popup-closed|cancelled/.test(err.code||''))gate('login',friendly(err))}}
async function signOut(wipe){
  try{await GemStore.flush()}catch(x){}
  try{if(auth)await auth.signOut()}catch(x){}
  try{await GemDB.del('kv','session')}catch(x){}
  try{localStorage.removeItem('gem_lock')}catch(x){}
  if(wipe){try{indexedDB.deleteDatabase('gem_erp');localStorage.clear()}catch(x){}}
  location.reload()}
/* ---------- sync ---------- */
function assemble(k){
  const parts=[...RD.values()].filter(x=>x.k===k);if(!parts.length)return null;
  const n=parts[0].n,m=parts[0].m;if(parts.length<n||parts.some(x=>x.m!==m))return null;
  parts.sort((a,b)=>a.i-b.i);for(let i=0;i<n;i++)if(!parts[i]||parts[i].i!==i)return null;
  return{m,n,json:parts.map(x=>x.d).join('')}}
const remoteN=k=>{const a=assemble(k);return a?a.n:[...RD.values()].filter(x=>x.k===k).length};
function startSync(){
  stopSync();
  return new Promise(resolve=>{
    let first=true;const timer=setTimeout(()=>{if(first){first=false;status='offline';resolve()}},9000);
    unsubData=db.collection(`companies/${CID}/data`).onSnapshot(snap=>{
      const touched=new Set();
      snap.docChanges().forEach(ch=>{const x=ch.doc.data();if(ch.type==='removed')RD.delete(ch.doc.id);else RD.set(ch.doc.id,x);if(!ch.doc.metadata.hasPendingWrites)touched.add(x.k||ch.doc.id.split('__')[0])});
      lastSync=Date.now();status=navigator.onLine?(pend.size?'syncing':'synced'):'offline';errMsg='';
      if(first){first=false;clearTimeout(timer);reconcile(allKeys());resolve()}else if(touched.size)reconcile([...touched]);
      pill()},err=>{status='error';errMsg=friendly(err);pill();if(first){first=false;clearTimeout(timer);resolve()}});
    unsubIdx=db.collection(`companies/${CID}/mediaidx`).onSnapshot(s=>{s.docChanges().forEach(c=>{if(c.type==='removed')HAVE.delete(c.doc.id);else HAVE.add(c.doc.id)});fetchMissing();if(pend.size)schedulePush()},()=>{});
  })}
function stopSync(){if(unsubData)unsubData();if(unsubIdx)unsubIdx();unsubData=unsubIdx=null;RD.clear();HAVE.clear()}
const allKeys=()=>[...new Set([...GemStore.keys(),...[...RD.values()].map(x=>x.k)])];
function reconcile(keys){
  const dl=dlgEl();
  if(dl&&dl.open){dl.addEventListener('close',()=>reconcile(keys),{once:true});return}
  let changed=false;
  keys.forEach(k=>{
    const r=assemble(k),lm=D._m[k]||0,sy=D._sy[k]||0;
    if(r){
      if(r.m===lm){if(sy!==r.m)GemStore.markSynced(k,r.m,r.json);return}
      const localChanged=lm>sy,remoteChanged=r.m!==sy;
      if(!localChanged){GemStore.applyKey(k,r.json,r.m);changed=true}
      else if(!remoteChanged)pend.add(k);
      else if(GemStore.mergeKey(k,r.json,r.m)){pend.add(k);changed=true}
      else if(r.m>lm){GemStore.applyKey(k,r.json,r.m);changed=true}
      else pend.add(k);
    }else if(!RD.size||![...RD.values()].some(x=>x.k===k)){if(D[k]!==undefined&&!D._seed)pend.add(k)}
  });
  if(pend.size)schedulePush();
  if(changed&&entered&&typeof go==='function')go();
  pill()}
function changed(keys){keys.forEach(k=>pend.add(k));schedulePush();pill()}
function schedulePush(){if(!canPush())return;clearTimeout(pushT);pushT=setTimeout(doPush,1500)}
async function uploadMedia(json){
  for(const h of GemSync.refsIn(json)){
    if(HAVE.has(h))continue;const v=GemStore.media[h];if(!v)continue;
    const parts=GemSync.chunk(v,200000),col=db.collection(`companies/${CID}/media`);
    for(let s=0;s<parts.length;s+=400){const b=db.batch();parts.slice(s,s+400).forEach((d,j)=>b.set(col.doc(h+'__'+(s+j)),{h,i:s+j,d}));await b.commit()}
    await db.doc(`companies/${CID}/mediaidx/${h}`).set({n:parts.length,by:Me.email,t:Date.now()});HAVE.add(h)}}
async function doPush(){
  if(pushing){pushT=setTimeout(doPush,1500);return}
  if(!canPush()||!navigator.onLine){status=navigator.onLine?status:'offline';pill();return}
  pushing=true;status='syncing';pill();
  try{
    for(const k of[...pend]){
      const json=GemStore.json(k);if(json===undefined){pend.delete(k);continue}
      const m=D._m[k]||Date.now();await uploadMedia(json);
      const parts=GemSync.chunk(json),old=remoteN(k),b=db.batch(),col=db.collection(`companies/${CID}/data`);
      parts.forEach((d,i)=>b.set(col.doc(k+'__'+i),{k,i,n:parts.length,m,d,by:Me.email}));
      for(let i=parts.length;i<old;i++)b.delete(col.doc(k+'__'+i));
      await b.commit();if(D._m[k]===m)pend.delete(k);await GemStore.markSynced(k,m,json)}
    status='synced';lastSync=Date.now();errMsg='';
  }catch(err){status='error';errMsg=friendly(err);setTimeout(schedulePush,15000)}
  pushing=false;pill();if(pend.size&&status!=='error')schedulePush()}
async function fetchMissing(){
  if(fetching||!db)return;const miss=GemStore.missingMedia().filter(h=>HAVE.has(h));if(!miss.length)return;fetching=true;
  try{for(const h of miss){const ix=await db.doc(`companies/${CID}/mediaidx/${h}`).get();if(!ix.exists)continue;const n=ix.data().n,
      ds=await Promise.all(Array.from({length:n},(_,i)=>db.doc(`companies/${CID}/media/${h}__${i}`).get()));GemStore.putMedia(h,ds.map(d=>d.exists?d.data().d:'').join(''))}
    const dl=dlgEl();if(typeof go==='function'&&!(dl&&dl.open))go()}catch(x){}
  fetching=false}
/* ---------- audit trail upload (append-only collection; entries can be created but never changed) ---------- */
let audQ=[],audT=0,audBusy=false;
GemDB.get('kv','audq').then(a=>{if(a&&a.length){audQ=a.concat(audQ)}}).catch(()=>{});
function audit(entries){audQ.push(...entries);GemDB.set('kv','audq',audQ.slice(-3000)).catch(()=>{});clearTimeout(audT);audT=setTimeout(audFlush,2500)}
async function audFlush(){
  if(audBusy)return;if(!canPush()||!navigator.onLine||!audQ.length){if(audQ.length)audT=setTimeout(audFlush,20000);return}
  audBusy=true;
  try{while(audQ.length){const part=audQ.slice(0,400),b=db.batch();part.forEach(x=>b.set(db.doc(`companies/${CID}/audit/${x.id}`),x));await b.commit();audQ=audQ.slice(part.length);GemDB.set('kv','audq',audQ).catch(()=>{})}}
  catch(err){audT=setTimeout(audFlush,30000)}
  audBusy=false}
async function auditLoad(n){
  if(!db||!user||!window.Me||Me.cached||Me.local||!navigator.onLine||!['owner','manager','accountant'].includes(Me.role))return[];
  try{const q=await db.collection(`companies/${CID}/audit`).orderBy('t','desc').limit(n||500).get();return q.docs.map(d=>d.data())}catch(x){return[]}}
function retry(){if(!user||!auth)return;Object.keys(D._m||{}).forEach(k=>{if((D._m[k]||0)>(D._sy[k]||0))pend.add(k)});onAuth(user,null)}
addEventListener('online',()=>{status='connecting';pill();retry();audFlush()});addEventListener('offline',()=>{status='offline';pill()});
/* ---------- status pill and menu ---------- */
function pill(){
  const sb=document.querySelector('.sb');let p=document.getElementById('cpill');
  if(!p&&sb){p=document.createElement('button');p.id='cpill';p.onclick=menu;sb.appendChild(p)}if(!p)return;
  const M={local:['💾','This device only'],connecting:['⏳','Connecting…'],syncing:['🔄','Syncing…'],synced:['☁️','Synced'],offline:['📴','Offline: saved on this device'],error:['⚠️','Sync problem']},s=M[status]||M.local;
  p.className=status;p.innerHTML=`<span>${s[0]}</span><b>${s[1]}</b><small>${window.Me&&Me.email?e(Me.email)+' · '+e(ROLES[Me.role]||Me.role):'Local mode'}</small>`}
function menu(){
  const unsynced=Object.keys(D._m||{}).filter(k=>(D._m[k]||0)>(D._sy[k]||0)).length;
  $('#dlg').innerHTML=`<h3>Account &amp; sync</h3><p><b>${e((window.Me&&Me.name)||'Local mode')}</b><br><span class="m">${e((window.Me&&Me.email)||'No sign-in on this device')}${window.Me&&Me.role?' · '+e(ROLES[Me.role]||Me.role):''}</span></p><p class="m" style="margin:10px 0">Status: <b>${e(status)}</b>${lastSync?' · last contact '+new Date(lastSync).toLocaleTimeString():''}<br>${unsynced?unsynced+' collection(s) waiting to upload':'Everything on this device is in the cloud'}${errMsg?'<br><span class="bad">'+e(errMsg)+'</span>':''}</p><div class="dlgbar"><button onclick="dlg.close();lockNow()">🔒 Lock now</button>${CFG.enabled&&auth&&user?'<button onclick="Cloud.retry();dlg.close()">Sync now</button><button onclick="Cloud.signOut()">Sign out</button><button onclick="if(confirm(\'Sign out and remove ALL data stored on this device? Data already in the cloud is kept.\'))Cloud.signOut(true)">Sign out &amp; clear device</button>':''}<button class="b1" onclick="dlg.close()">Close</button></div>`;$('#dlg').showModal()}
/* ---------- Team & Access page ---------- */
const OPTS=Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${e(v)}</option>`).join('');
pages.team=function(){setTimeout(renderTeam,0);return`<h1>Team &amp; Access</h1><div class="card" id="tm"><p class="m">Loading…</p></div><div class="card"><h3>Approval rule</h3><label class="m">Sales staff can give a discount up to <input type="number" style="width:80px" value="${D.discLimit==null?5:D.discLimit}" onchange="D.discLimit=Math.max(0,+this.value||0);save()"> % of the invoice. Above that a manager or owner must create the invoice.</label></div><div class="card"><h3>What each role can do</h3>${tbl(['Role','Can do'],[['Owner','Everything, including managing this team and restoring backups'],['Manager','Everything except managing the team'],['Sales staff','Stock, sales, quotations, memo, requests, parties and the catalogue. No cost, profit, cash or supplier pages. Discount limit above.'],['Accountant (view only)','Can open every page and export reports but cannot change anything']].map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`))}<p class="m" style="margin-top:8px">The app hides what a role should not see. The cloud rules (firestore.rules) enforce who may read and write.</p></div>`};
async function members(){const s=await db.collection(`companies/${CID}/members`).get();return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.email<b.email?-1:1)}
async function renderTeam(){
  const box=document.getElementById('tm');if(!box)return;
  if(!CFG.enabled||!db||!user||!window.Me||Me.local||Me.cached){box.innerHTML='<p class="m">Sign-in is not active on this device. Open the app online and sign in with Google to manage the team.</p>';return}
  if(Me.role!=='owner'){box.innerHTML='<p class="m">Only the owner can manage the team.</p>';return}
  try{const L=await members();
    box.innerHTML=`<h3>Team</h3>${tbl(['Name','Email','Role',''],L.map(m=>`<tr><td>${e(m.name||'-')}</td><td>${e(m.email)}</td><td>${m.email===Me.email?'<b>Owner (you)</b>':`<select onchange="Cloud.setRole('${e(m.id)}',this.value)">${OPTS.replace('value="'+m.role+'"','value="'+m.role+'" selected')}</select>`}</td><td>${m.email===Me.email?'':`<button class="sm" onclick="Cloud.removeMember('${e(m.id)}')">Remove</button>`}</td></tr>`))}<h3 style="margin-top:16px">Add a person</h3><div class="bar"><input id="tn" placeholder="Name"><input id="te" type="email" placeholder="Their Google email"><select id="tr">${OPTS.replace('value="staff"','value="staff" selected')}</select><button class="b1" onclick="Cloud.addMember()">Add</button></div><p class="m">They must sign in with a Google account that uses exactly this email.</p>`
  }catch(err){box.innerHTML='<p class="bad">'+e(friendly(err))+'</p>'}}
async function addMember(){
  const em=($('#te').value||'').trim().toLowerCase(),nm=($('#tn').value||'').trim(),rl=$('#tr').value;
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return alert('Enter a valid email address.');
  try{await db.doc(`companies/${CID}/members/${em}`).set({email:em,name:nm,role:rl,addedBy:Me.email,t:Date.now()});log('Team: added '+em+' as '+rl);save();renderTeam()}catch(err){alert(friendly(err))}}
async function setRole(id,rl){try{await db.doc(`companies/${CID}/members/${id}`).update({role:rl});log('Team: '+id+' is now '+rl);save();renderTeam()}catch(err){alert(friendly(err))}}
async function removeMember(id){if(!confirm('Remove '+id+'? They will no longer be able to open the company.'))return;try{await db.doc(`companies/${CID}/members/${id}`).delete();log('Team: removed '+id);save();renderTeam()}catch(err){alert(friendly(err))}}
return{start,changed,audit,auditLoad,signOut,retry,addMember,setRole,removeMember,pill,get status(){return status},get enabled(){return CFG.enabled},get pending(){return pend.size}};
})();
