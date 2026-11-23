/* Gem ERP :: core/syncutil.js
   Pure helpers (no browser needed, also used by tools/test.js): photo references, chunking for Firestore and the
   3-way merge that stops two people adding records at the same time from overwriting each other. */
(function(g){
const cyrb53=s=>{let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0,c;i<s.length;i++){c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return 4294967296*(2097151&h2)+(h1>>>0)};
const mediaHash=s=>cyrb53(s).toString(36)+'-'+s.length.toString(36);
const isMedia=v=>typeof v==='string'&&v.length>2000&&v.startsWith('data:');
const isRef=v=>typeof v==='string'&&v.startsWith('@f:');
/* Media(store,onNew): big data: strings (photos, certificates, logo) are written as short "@f:hash" references. */
function Media(store,onNew){
  const cache=new Map();
  const ser=val=>JSON.stringify(val,(k,v)=>{
    if(isMedia(v)){let r=cache.get(v);if(!r){const h=mediaHash(v);r='@f:'+h;cache.set(v,r);if(!(h in store)){store[h]=v;onNew&&onNew(h,v)}}return r}
    return v});
  const hydrate=o=>{const w=x=>{
    if(Array.isArray(x)){for(let i=0;i<x.length;i++){const v=x[i];if(isRef(v)){const d=store[v.slice(3)];if(d)x[i]=d}else if(v&&typeof v==='object')w(v)}}
    else if(x&&typeof x==='object'){for(const k in x){const v=x[k];if(isRef(v)){const d=store[v.slice(3)];if(d)x[k]=d}else if(v&&typeof v==='object')w(v)}}
    return x};return w(o)};
  return{ser,hydrate};
}
const refsIn=s=>{const r=new Set();String(s||'').replace(/@f:([a-z0-9-]+)/g,(m,h)=>{r.add(h)});return[...r]};
/* Firestore documents are limited to 1 MB, so long text is cut into pieces of 200,000 characters. */
function chunk(s,n){n=n||200000;const a=[];let i=0;while(i<s.length){let j=Math.min(s.length,i+n);if(j<s.length){const c=s.charCodeAt(j-1);if(c>=0xD800&&c<=0xDBFF)j--}a.push(s.slice(i,j));i=j}return a.length?a:['']}
const canMerge=a=>Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&x.id!=null);
/* 3-way merge of two lists of records: base = ids at the last sync, L = local, R = remote. Local wins for a record both sides changed. */
function mergeArr(base,L,R,preferLocal){
  const bs=new Set(base||[]),lm=new Map(L.map(x=>[x.id,x])),rm=new Map(R.map(x=>[x.id,x])),out=[];
  R.forEach(r=>{if(lm.has(r.id))out.push(preferLocal?lm.get(r.id):r);else if(!bs.has(r.id))out.push(r)});
  L.forEach(l=>{if(!rm.has(l.id)&&!bs.has(l.id))out.push(l)});
  return out}
g.GemSync={cyrb53,mediaHash,isMedia,isRef,Media,refsIn,chunk,canMerge,mergeArr};
if(typeof module!=='undefined')module.exports=g.GemSync;
})(typeof window!=='undefined'?window:globalThis);
