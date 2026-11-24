/* Gem ERP :: core/audit.js
   Audit trail. Works out exactly what changed between two saves of a collection (which record, which field, old value,
   new value) so every add, edit and delete can be traced to a person and time. Pure code, also tested by tools/test.js. */
(function(g){
const SKIP=['log','take','remind','msgTpl','cc','appr','audit'];
const NAMES={stones:'Stock',recur:'Recurring expenses',docs:'Documents',moves:'Stone movements',tasks:'Tasks',counts:'Cash counts',parties:'Parties',purchases:'Purchases',sales:'Sales',jobs:'Cutting jobs',exp:'Expenses',chq:'Cheques',memo:'Memo',cn:'Credit notes',quotes:'Quotations',dn:'Debit notes',minn:'Memo in',prom:'Promises',wants:'Requests',cash:'Cash book',co:'Company details',tiers:'Price tiers',void:'Cancelled invoices',takes:'Stock takes',partners:'Partners',open:'Opening balances'};
const area=k=>NAMES[k]||k;
const lab=r=>String(r.code||r.no||r.name||r.desc||r.title||r.id||'').slice(0,60);
const short=v=>{if(v==null||v==='')return'(empty)';if(typeof v==='string'){if(v.startsWith('@f:')||v.startsWith('data:'))return'(file)';return v.length>80?v.slice(0,77)+'…':v}if(typeof v==='object')return JSON.stringify(v).slice(0,80);return String(v)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const canIds=a=>Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&x.id!=null);
let seq=0;
const mk=(now,user,k,rid,l,op,ch,extra)=>Object.assign({id:now.toString(36)+'-'+(++seq).toString(36)+Math.random().toString(36).slice(2,6),t:new Date(now).toISOString(),u:user||'local',k,rid:String(rid==null?'':rid),l,op,ch:ch||[]},extra||{});
function fields(a,b){const f=[];new Set([...Object.keys(a||{}),...Object.keys(b||{})]).forEach(k=>{if(!same((a||{})[k],(b||{})[k]))f.push({f:k,from:short((a||{})[k]),to:short((b||{})[k])})});return f.slice(0,14)}
function diff(key,oldJ,newJ,user,now){
  if(SKIP.includes(key)||oldJ===undefined||newJ===undefined)return[];
  let a,b;try{a=JSON.parse(oldJ);b=JSON.parse(newJ)}catch(x){return[]}
  if(same(a,b))return[];
  now=now||Date.now();const out=[];
  if(canIds(a)&&canIds(b)){
    const am=new Map(a.map(r=>[r.id,r])),bm=new Map(b.map(r=>[r.id,r])),adds=[],dels=[];
    b.forEach(r=>{if(!am.has(r.id))adds.push(r);else if(!same(am.get(r.id),r)){const ch=fields(am.get(r.id),r);if(ch.length)out.push(mk(now,user,key,r.id,lab(r),'edit',ch))}});
    a.forEach(r=>{if(!bm.has(r.id))dels.push(r)});
    if(adds.length>20)out.push(mk(now,user,key,'',adds.length+' records','add',[{f:'(bulk)',from:'',to:adds.length+' added'}]));
    else adds.forEach(r=>out.push(mk(now,user,key,r.id,lab(r),'add',[{f:'(new)',from:'',to:short(JSON.stringify(r)).slice(0,80)}])));
    if(dels.length>20)out.push(mk(now,user,key,'',dels.length+' records','delete',[{f:'(bulk)',from:dels.length+' removed',to:''}]));
    else dels.forEach(r=>out.push(mk(now,user,key,r.id,lab(r),'delete',[{f:'(was)',from:JSON.stringify(r).replace(/"@f:[^"]*"/g,'"(file)"').slice(0,400),to:''}])));
  }else if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
    const ch=fields(a,b);if(ch.length)out.push(mk(now,user,key,key,area(key),'edit',ch));
  }else out.push(mk(now,user,key,key,area(key),'edit',[{f:'(value)',from:short(a),to:short(b)}]));
  return out.slice(0,300)}
const note=(text,user,now)=>mk(now||Date.now(),user,'system','', text,'note',[]);
g.GemAudit={diff,note,area,NAMES};
if(typeof module!=='undefined')module.exports=g.GemAudit;
})(typeof window!=='undefined'?window:globalThis);
