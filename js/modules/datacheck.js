/* Gem ERP :: modules/datacheck.js
   Data check: finds inconsistent records without changing anything. */
pages.check=function(){return checkHtml()};
/* ---- data check ---- */
function checkHtml(){
const R=[],add=(lvl,t,items,fix)=>R.push({lvl,t,items,fix}),st=D.stones||[],sa=D.sales||[],pu=D.purchases||[];
const sid=new Set(),mis=[];sa.forEach(x=>(x.items||[]).forEach(i=>{sid.add(i.stone);if(!st.find(z=>z.id==i.stone))mis.push(x.no)}));
add('bad','Invoices that list a stone which no longer exists',[...new Set(mis)].map(n=>({l:n})));
add('bad','Stones marked Sold but not on any invoice',st.filter(z=>z.status=='Sold'&&!sid.has(z.id)).map(z=>({l:z.code+' · '+z.type,id:z.id})),'dcFix(\'sold\')');
add('bad','Invoices with more received than the invoice total',sa.filter(x=>(x.paid||0)>saleTotal(x)+.5).map(x=>({l:x.no+' · '+P(x.party)+' · received '+rs(x.paid)+' of '+rs(saleTotal(x))})));
add('bad','Purchases with more paid than the cost',pu.filter(x=>(x.paid||0)>(x.cost||0)+.5).map(x=>({l:(S(x.stone).code||'Purchase')+' · '+P(x.party)+' · paid '+rs(x.paid)+' of '+rs(x.cost)})));
const b=bals();add('bad','Cash or bank accounts with a negative balance',Object.keys(b).filter(k=>b[k]<-.5).map(k=>({l:k+' · '+rs(b[k])})));
add('bad','Duplicate invoice numbers (two people created an invoice at the same time)',(()=>{const m={};sa.forEach(x=>{(m[x.no]=m[x.no]||[]).push(x)});return Object.keys(m).filter(k=>m[k].length>1).map(k=>({l:k+' used '+m[k].length+' times'}))})(),'dcFix(\'inv\')');
const cm={};st.forEach(z=>{(cm[z.code]=cm[z.code]||[]).push(z)});
add('bad','Duplicate stone codes',Object.keys(cm).filter(k=>cm[k].length>1).map(k=>({l:k+' used '+cm[k].length+' times'})),'dcFix(\'code\')');
const ce={};st.filter(z=>z.cert&&z.status!='Sold').forEach(z=>{const k=String(z.cert).trim().toLowerCase();(ce[k]=ce[k]||[]).push(z)});
add('warn','Certificate numbers used on more than one stone in stock',Object.keys(ce).filter(k=>ce[k].length>1).map(k=>({l:k+' · '+ce[k].map(z=>z.code).join(', ')})));
add('warn','Stones in stock with no cost',st.filter(z=>z.status=='In stock'&&!(z.cost>0)).map(z=>({l:z.code+' · '+z.type,id:z.id})));
add('warn','Stones in stock with no selling price',st.filter(z=>z.status=='In stock'&&!(z.price>0)).map(z=>({l:z.code+' · '+z.type,id:z.id})));
const owe=new Set();sa.forEach(x=>{if(saleTotal(x)-(x.paid||0)>.5)owe.add(x.party)});
add('warn','Customers who owe money but have no phone number',[...owe].map(id=>(D.parties||[]).find(y=>y.id==id)).filter(c=>c&&!c.phone).map(c=>({l:c.name})));
const bad=R.filter(r=>r.lvl=='bad').reduce((a,r)=>a+r.items.length,0),wn=R.filter(r=>r.lvl=='warn').reduce((a,r)=>a+r.items.length,0);
const sec=r=>`<div style="padding:12px 0;border-bottom:1px solid var(--bd)"><div style="display:flex;justify-content:space-between;gap:10px"><b>${r.t}</b>${r.fix&&r.items.length?`<button class="sm" onclick="${r.fix}">Fix automatically</button>`:''}<span class="tag ${r.items.length?(r.lvl=='bad'?'r':'o'):'g'}">${r.items.length?r.items.length+' found':'OK'}</span></div>${r.items.slice(0,15).map(i=>`<div class="m" style="margin-top:6px">${e(i.l)}${i.id?` <button class="sm" onclick="stoneView('${i.id}')">View</button>`:''}</div>`).join('')}${r.items.length>15?`<div class="m" style="margin-top:6px">…and ${r.items.length-15} more</div>`:''}</div>`;
window._chk={bad,wn};return`<h1>Data Check</h1><div class="card"><p class="m">${bad+wn?`<b style="color:${bad?'var(--r)':'inherit'}">${bad} error(s)</b> and ${wn} warning(s) found. Nothing has been changed.`:'<b style="color:var(--g)">All checks passed.</b> Your records look consistent.'}</p>${R.map(sec).join('')}</div>`}

function dcFix(w){
  if(w==='sold'){const sid=new Set();D.sales.forEach(x=>x.items.forEach(i=>sid.add(i.stone)));const L=D.stones.filter(z=>z.status=='Sold'&&!sid.has(z.id));if(!L.length||!confirm('Set '+L.length+' stone(s) back to In stock? They are marked Sold but are on no invoice.'))return;L.forEach(z=>{z.status='In stock'});log('Data check: '+L.length+' sold-without-invoice stone(s) set back to In stock')}
  if(w==='code'){const seen=new Set(),L=[];D.stones.forEach(z=>{if(seen.has(z.code))L.push(z);else seen.add(z.code)});if(!L.length||!confirm('Give new codes to '+L.length+' stone(s) that repeat an existing code? The first stone with each code keeps it.'))return;L.forEach(z=>{const o=z.code;z.code=nextCode();log('Data check: '+o+' renamed to '+z.code)})}
  if(w==='inv'){const seen=new Set(),L=D.sales.slice().sort((a,b)=>a.date<b.date?-1:1).filter(x=>{if(seen.has(x.no))return true;seen.add(x.no);return false});if(!L.length||!confirm('Give new numbers to '+L.length+' invoice(s) that repeat a number? The earliest invoice keeps it.'))return;L.forEach(x=>{const o=x.no;x.no=invNo();log('Data check: invoice '+o+' renumbered to '+x.no)})}
  save();go()}
