/* Gem ERP :: core/store.js
   Local data store. The company record lives in IndexedDB (no 5 MB limit) with photos kept in their own store; saves are
   batched, restore points are kept, and Cloud (modules/cloud.js) is told which collections changed so it can sync them. */
function seed(){const p=[{id:'p1',name:'Ratnapura Gem Miners',type:'Supplier',phone:'077 123 4567'},{id:'p2',name:'Bangkok Gems Ltd',type:'Customer',phone:'+66 2 555 0101'},{id:'p3',name:'Colombo Jewellers',type:'Customer',phone:'011 234 5678'}];
const s=[['Blue Sapphire','Oval',3.42,'Royal blue','Ratnapura','Heated','GIA-5551',180000,320000],['Padparadscha','Cushion',2.15,'Pinkish orange','Elahera','Natural unheated','SSEF-2210',420000,690000],['Ruby','Round',1.8,'Pigeon blood','Mogok','Heated','',150000,260000],['Cat’s Eye','Oval',5.6,'Honey','Matale','Natural unheated','GRS-7781',95000,160000]].map((x,i)=>({id:'s'+i,code:'GEM-'+String(i+1).padStart(4,'0'),type:x[0],shape:x[1],carats:x[2],color:x[3],origin:x[4],treatment:x[5],cert:x[6],cost:x[7],price:x[8],status:'In stock',supplier:'p1',date:today()}));
return{parties:p,stones:s,purchases:s.map(x=>({id:uid(),date:x.date,party:'p1',stone:x.id,cost:x.cost,paid:x.cost})),sales:[]}}
let D=null;
function toast(t,ms){let b=document.getElementById('toast');if(!b){b=document.createElement('div');b.id='toast';b.className='noprint';document.body.appendChild(b)}b.textContent=t;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),ms||3200)}
const GemStore=(function(){
  const {Media,mergeArr,canMerge}=GemSync;
  const MEDIA=window.__MEDIA||{};let PM=[];
  const GM=Media(MEDIA,(h,v)=>PM.push([h,v]));
  const LS={};let dirty=false,tm=0,fl=Promise.resolve(),warned=false,legacy=false,skipAud=false;
  const boot=window.__BOOT_DATA;
  if(typeof boot==='string'){try{D=JSON.parse(boot)}catch(x){D=null}}
  if(!D){try{const o=JSON.parse(localStorage.getItem(K));if(o&&o.stones){D=o;legacy=true}}catch(x){}}
  if(!D){D=seed();D._seed=1}
  D._m=D._m||{};D._sy=D._sy||{};D._bi=D._bi||{};
  GM.hydrate(D);
  const keys=()=>Object.keys(D).filter(k=>k[0]!=='_');
  if(legacy){const n=Date.now();keys().forEach(k=>{D._m[k]=n})}
  keys().forEach(k=>{const s=GM.ser(D[k]);if(s!==undefined)LS[k]=s});
  const pack=()=>'{'+keys().filter(k=>LS[k]!==undefined).map(k=>JSON.stringify(k)+':'+LS[k]).concat(['"_m":'+JSON.stringify(D._m),'"_sy":'+JSON.stringify(D._sy),'"_bi":'+JSON.stringify(D._bi),'"_seed":'+(D._seed?1:0)]).join(',')+'}';
  function storeFail(err){window.__storeErr=String(err&&err.message||err);if(!warned){warned=true;alert('Gem ERP could not save to this device ('+window.__storeErr+'). Download a backup now so nothing is lost.')}}
  function save(){if(window.__ro){roBlock();return}dirty=true;clearTimeout(tm);tm=setTimeout(flush,300)}
  function flush(){
    clearTimeout(tm);if(!dirty)return fl;dirty=false;
    const now=Date.now(),ch=[],ks=keys(),aud=[],who=(window.Me&&Me.email)||'local';
    ks.forEach(k=>{const s=GM.ser(D[k]);if(s!==LS[k]){const o=LS[k];if(s===undefined)delete LS[k];else{LS[k]=s;if(!skipAud)GemAudit.diff(k,o,s,who,now).forEach(x=>aud.push(x))}D._m[k]=now;ch.push(k)}});
    if(skipAud){aud.push(GemAudit.note('All data was replaced (restore, import or reset)',who,now));skipAud=false}
    Object.keys(LS).forEach(k=>{if(!ks.includes(k))delete LS[k]});
    const media=PM.splice(0);
    if(window.__idbOK===false){try{localStorage.setItem(K,JSON.stringify(D))}catch(x){storeFail(x)}}
    else{const snap=pack();fl=fl.then(()=>media.length?GemDB.setMany('files',media):0).then(()=>GemDB.set('kv','company',snap)).catch(storeFail)}
    if(aud.length){const A=aud.slice(0,500);if(window.__idbOK!==false)fl=fl.then(()=>GemDB.get('kv','audit')).then(a=>GemDB.set('kv','audit',((a||[]).concat(A)).slice(-5000))).catch(()=>{});if(typeof Cloud!=='undefined')Cloud.audit(A)}
    if(ch.length&&typeof Cloud!=='undefined')Cloud.changed(ch);
    return fl}
  function persistMeta(){if(window.__idbOK===false)return fl;const snap=pack();fl=fl.then(()=>GemDB.set('kv','company',snap)).catch(storeFail);return fl}
  function roBlock(){toast('View-only access: that change was not saved.');const n=JSON.parse(pack());GM.hydrate(n);D=n}
  addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
  /* Replace everything (restore a backup or restore point). Every collection counts as changed, so the cloud copy follows. */
  async function adopt(o,keepSeed){GM.hydrate(o);D=o;D._m={};D._sy={};D._bi={};if(!keepSeed)delete D._seed;Object.keys(LS).forEach(k=>delete LS[k]);skipAud=true;dirty=true;await flush();ensureData();return flush()}
  async function reset(){return adopt(seed())}
  /* Cloud calls these. */
  const ids=v=>canMerge(v)?v.map(x=>x.id):null;
  function applyKey(k,json,m){const v=JSON.parse(json);GM.hydrate(v);D[k]=v;LS[k]=GM.ser(v);D._m[k]=m;D._sy[k]=m;delete D._seed;const i=ids(v);if(i)D._bi[k]=i;return persistMeta()}
  function mergeKey(k,json,rm){const R=JSON.parse(json);GM.hydrate(R);const L=D[k];if(!(canMerge(L)&&canMerge(R)))return false;
    const out=mergeArr(D._bi[k]||[],L,R,true);if(k==='log')out.sort((a,b)=>String(a.t)<String(b.t)?-1:1);
    D[k]=out;LS[k]=GM.ser(out);D._sy[k]=rm;D._m[k]=Math.max(Date.now(),rm+1);D._bi[k]=R.map(x=>x.id);delete D._seed;persistMeta();return true}
  function markSynced(k,m,json){D._sy[k]=m;let i=null;try{i=json?ids(JSON.parse(json)):ids(D[k])}catch(x){}if(i)D._bi[k]=i;return persistMeta()}
  function putMedia(h,v){MEDIA[h]=v;GemDB.set('files',h,v).catch(()=>{});GM.hydrate(D)}
  const missingMedia=()=>{const s=new Set();Object.values(LS).forEach(j=>GemSync.refsIn(j).forEach(h=>{if(!(h in MEDIA))s.add(h)}));return[...s]};
  async function usage(){try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();window.__usage=e.usage||0;window.__quota=e.quota||0;window.__usageP=e.quota?Math.round(e.usage/e.quota*100):0}}catch(x){}}
  usage();setInterval(usage,60000);
  /* Restore points (kept inside this browser's database). */
  const Snap={
    index:async()=>(await GemDB.get('kv','snapIndex').catch(()=>null))||[],
    async take(label){await flush();const at=new Date().toISOString(),json=pack(),idx=await Snap.index();
      await GemDB.set('snaps',at,{id:at,label,json});
      idx.push({id:at,at,label,kb:Math.round(json.length/1024),stones:(D.stones||[]).length,sales:(D.sales||[]).length});
      while(idx.length>30){const o=idx.shift();await GemDB.del('snaps',o.id)}
      await GemDB.set('kv','snapIndex',idx);return at},
    async auto(){if(window.__idbOK===false||D._seed)return;const idx=await Snap.index(),d=new Date().toISOString().slice(0,10);if(idx.some(x=>x.label==='Daily automatic'&&x.at.slice(0,10)===d))return;await Snap.take('Daily automatic')},
    async restore(id){const r=await GemDB.get('snaps',id);if(!r)throw new Error('Restore point not found');await Snap.take('Before restoring: '+(r.label||''));await adopt(JSON.parse(r.json))},
    async remove(id){const idx=(await Snap.index()).filter(x=>x.id!==id);await GemDB.del('snaps',id);await GemDB.set('kv','snapIndex',idx)}
  };
  if(legacy&&window.__idbOK!==false){dirty=true;flush().then(()=>Snap.take('Copy of your data before the upgrade')).then(()=>{try{localStorage.removeItem(K)}catch(x){}}).catch(()=>{})}
  window.save=save;
  return{save,flush,adopt,reset,applyKey,mergeKey,markSynced,persistMeta,putMedia,missingMedia,json:k=>LS[k],keys,Snap,media:MEDIA,usage,wasLegacy:legacy};
})();
/* Makes sure every collection exists and adds the one-time starter records. Safe to run on every render. */
function ensureData(){D.jobs=D.jobs||[];D.exp=D.exp||[];D.chq=D.chq||[];D.memo=D.memo||[];D.cn=D.cn||[];D.quotes=D.quotes||[];D.dn=D.dn||[];D.minn=D.minn||[];D.prom=D.prom||[];D.wants=D.wants||[];D.tiers=D.tiers||[{n:'Retail',p:0},{n:'Wholesale',p:-10},{n:'Dealer',p:-15}];D.cash=D.cash||[];D.appr=D.appr||[];D.tasks=D.tasks||[];D.moves=D.moves||[];D.counts=D.counts||[];D.docs=D.docs||[];D.recur=D.recur||[];if(!D.v2){D.v2=1;D.parties.push({id:'p9',name:'Beruwala Cutting Works',type:'Cutter',phone:'077 555 0199'});const s={id:'s9',code:'GEM-'+String(D.stones.length+1).padStart(4,'0'),type:'Blue Sapphire',shape:'Rough',carats:8.5,color:'Blue',origin:'Ratnapura',treatment:'Natural unheated',cert:'',cost:120000,price:0,status:'In stock',supplier:'p1',date:today()};D.stones.push(s);D.purchases.push({id:uid(),date:s.date,party:'p1',stone:s.id,cost:s.cost,paid:60000});save()}}
