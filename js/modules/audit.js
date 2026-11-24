/* Gem ERP :: modules/audit.js
   Audit Trail page: who changed what and when, with old and new values. Entries made on this device are listed at once;
   when signed in, the team's entries are loaded from the cloud too. */
const AU={q:'',k:'',u:'',op:'',all:[],n:300};
const OPN={add:'Added',edit:'Changed',delete:'Deleted',note:'Note'};
pages.audit=function(){setTimeout(auFill,0);
  return`<h1>Audit Trail</h1><p class="m" style="margin-bottom:10px">Every add, change and delete is recorded with the person, the time and the old and new values. Entries cannot be edited or removed.</p><div class="bar"><input id="auq" placeholder="Search record, person or value…" value="${e(AU.q)}" oninput="AU.q=this.value;auRows()"><select id="auk" onchange="AU.k=this.value;auRows()"><option value="">All areas</option></select><select id="auu" onchange="AU.u=this.value;auRows()"><option value="">All people</option></select><select onchange="AU.op=this.value;auRows()">${[['','All actions'],['add','Added'],['edit','Changed'],['delete','Deleted']].map(o=>`<option value="${o[0]}" ${AU.op==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><button onclick="auExport()">Download Excel</button></div><div class="card" id="aul"><p class="m">Loading…</p></div>`};
async function auFill(){
  const local=(await GemDB.get('kv','audit').catch(()=>null))||[],cloud=await Cloud.auditLoad(800),m=new Map();
  local.concat(cloud).forEach(x=>m.set(x.id,x));
  AU.all=[...m.values()].sort((a,b)=>a.t<b.t?1:-1);
  const ks=[...new Set(AU.all.map(x=>x.k))].sort(),us=[...new Set(AU.all.map(x=>x.u))].sort(),K=document.getElementById('auk'),U=document.getElementById('auu');
  if(K)K.innerHTML='<option value="">All areas</option>'+ks.map(k=>`<option value="${e(k)}" ${AU.k==k?'selected':''}>${e(GemAudit.area(k))}</option>`).join('');
  if(U)U.innerHTML='<option value="">All people</option>'+us.map(u=>`<option value="${e(u)}" ${AU.u==u?'selected':''}>${e(u)}</option>`).join('');
  auRows()}
const auList=()=>{const q=AU.q.toLowerCase();return AU.all.filter(x=>(!AU.k||x.k===AU.k)&&(!AU.u||x.u===AU.u)&&(!AU.op||x.op===AU.op)&&(!q||(x.l+' '+x.u+' '+x.ch.map(c=>c.f+' '+c.from+' '+c.to).join(' ')).toLowerCase().includes(q)))};
function auRows(){
  const L=auList(),box=document.getElementById('aul');if(!box)return;
  box.innerHTML=(L.length?tbl(['When','Who','Area','Record','Action','What changed'],L.slice(0,AU.n).map(x=>`<tr><td style="white-space:nowrap">${new Date(x.t).toLocaleString('en-GB')}</td><td>${e(x.u)}</td><td>${e(GemAudit.area(x.k))}</td><td><b>${e(x.l)}</b></td><td class="${x.op=='delete'?'bad':x.op=='add'?'ok':''}">${OPN[x.op]||x.op}</td><td>${x.ch.map(c=>`<div><span class="m">${e(c.f)}</span> ${c.from?`<s>${e(c.from)}</s> → `:''}${e(c.to)}</div>`).join('')}</td></tr>`)):'<p class="m">Nothing recorded yet.</p>')+(L.length>AU.n?`<p><button onclick="AU.n+=300;auRows()">Show more (${L.length-AU.n} left)</button></p>`:'')}
function auExport(){const L=auList();xlsSave('audit-trail-'+today()+'.xlsx',[{name:'Audit trail',rows:[['When','Who','Area','Record','Action','Field','Old value','New value'],...L.flatMap(x=>(x.ch.length?x.ch:[{f:'',from:'',to:''}]).map(c=>[x.t.replace('T',' ').slice(0,19),x.u,GemAudit.area(x.k),x.l,OPN[x.op]||x.op,c.f,c.from,c.to]))]}])}
