/* Gem ERP :: modules/command.js
   Command Center: the new dashboard. Live numbers with trend lines, a 12-month chart, receivables ageing,
   stock mix, the Guardian status, things that need attention and quick actions. */
(function(){
const A=x=>x||[],mk=n=>{const t=new Date(new Date().getFullYear(),new Date().getMonth()-n,1);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')},
  MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],role=()=>(window.Me&&Me.role)||'owner';
const pct=(a,b)=>b>0?Math.round((a-b)/b*100):null;
function delta(a,b){const p=pct(a,b);if(p===null)return'<span class="dl flat">new</span>';return`<span class="dl ${p>=0?'up':'dn'}">${p>=0?'▲':'▼'} ${Math.abs(p)}%</span>`}
function greet(){const h=new Date().getHours(),g=h<12?'Good morning':h<18?'Good afternoon':'Good evening',em=(window.Me&&Me.email)||'',nm=em?em.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).split(' ')[0]:'';return g+(nm?', '+e(nm):'')}
function ageing(){const b=[0,0,0,0],t=Date.now();A(D.sales).forEach(s=>{const o=saleTotal(s)-(s.paid||0);if(o<=0)return;const d=(t-new Date(s.date))/864e5;b[d<=30?0:d<=60?1:d<=90?2:3]+=o});return b}
pages.dashboard=function(){
  const staff=role()==='staff',L=A(D.stones).filter(s=>['In stock','Memo'].includes(s.status)),val=L.reduce((a,s)=>a+(s.price||s.cost||0),0),cts=L.reduce((a,s)=>a+(s.carats||0),0),by={};
  L.forEach(s=>by[s.type]=(by[s.type]||0)+(s.price||s.cost||0));const en=Object.entries(by).sort((a,b)=>b[1]-a[1]),top=en[0],gc=window.GC||{};
  const ms=[];for(let i=11;i>=0;i--)ms.push(mk(i));
  const M=ms.map(m=>{const ss=A(D.sales).filter(s=>s.date.startsWith(m));return{m,r:ss.reduce((a,s)=>a+saleTotal(s),0),p:ss.reduce((a,s)=>a+saleTotal(s)-saleCost(s),0),n:ss.length}});
  const cur=M[11],prev=M[10],cash=Object.values(bals()).reduce((a,v)=>a+v,0),rec=A(D.sales).reduce((a,s)=>a+saleTotal(s)-s.paid,0),pay=[...A(D.purchases),...A(D.jobs)].reduce((a,p)=>a+p.cost-p.paid,0);
  const al=(()=>{try{return alerts()}catch(x){return[]}})(),G=window.Guardian&&Guardian.last,T=+D.target||0,pc=T?Math.min(100,cur.r/T*100):0;
  const kp=[['Sales this month',cur.r,delta(cur.r,prev.r),M.slice(-6).map(x=>x.r),'var(--ac)']];
  if(!staff){kp.push(['Gross profit',cur.p,delta(cur.p,prev.p),M.slice(-6).map(x=>x.p),'var(--g)'],['Cash + bank',cash,'<span class="dl flat">all accounts</span>',null,'var(--ac2,#b779ff)'])}
  kp.push(['Customers owe',rec,`<span class="dl flat">${A(D.sales).filter(s=>saleTotal(s)-s.paid>0).length} invoices</span>`,null,'var(--am,#e9a23b)']);
  if(!staff)kp.push(['You owe suppliers',pay,'<span class="dl flat">purchases + jobs</span>',null,'var(--r)']);
  kp.push(['Invoices this month',cur.n,delta(cur.n,prev.n),M.slice(-6).map(x=>x.n),'#2bb6c9']);
  const ag=ageing(),agm=Math.max(1,...ag),AG=['0–30 days','31–60','61–90','Over 90'];
  const accts=Object.entries(bals()),acm=Math.max(1,...accts.map(x=>Math.abs(x[1])));
  const ev=[...A(D.sales).map(s=>({d:s.date,i:'receipt',t:'Sale '+s.no,s:P(s.party),a:saleTotal(s),k:'in'})),...A(D.purchases).map(p=>({d:p.date,i:'cart',t:'Bought '+(S(p.stone).code||''),s:P(p.party),a:p.cost,k:'out'})),...A(D.exp).map(x=>({d:x.date,i:'down',t:'Expense',s:x.desc||x.cat||'',a:x.amt,k:'out'}))].filter(x=>x.d).sort((a,b)=>a.d<b.d?1:-1).slice(0,7);
  const cut=new Date(Date.now()-90*864e5).toISOString().slice(0,10),cu={};A(D.sales).filter(s=>s.date>=cut).forEach(s=>{cu[s.party]=(cu[s.party]||0)+saleTotal(s)});const tc=Object.entries(cu).sort((a,b)=>b[1]-a[1]).slice(0,5),tcm=Math.max(1,...tc.map(x=>x[1]));
  const QA=[['New sale','receipt','saleForm()'],['Buy a stone','cart','buyForm()'],['Add stone','gem','stoneForm()'],['Add expense','down','expForm()'],['Add party','users','partyForm()'],['Reminders','horn',"location.hash='reminders'"],['Cash count','calc',"location.hash='cashcount'"],['Catalogue','book',"location.hash='catalogue'"]].filter(q=>!staff||!['Add expense','Cash count'].includes(q[0]));
  const lvl=G?G.level:'ok';
  return`<h1 class="sr">Command Center</h1><div class="cc">
<section class="cc-hero" style="--gm:${(top&&gc[top[0]])||'#4f8cff'}">${Illus.banner('hero',1000,240)}
 <div class="ch-l"><span class="kick">${greet()} · ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
 <h2>${al.length?`${al.length} thing${al.length>1?'s':''} need${al.length>1?'':'s'} your attention`:'Everything is in order today'}</h2>
 <div class="ch-v"><small>Stock value at selling price</small><b data-count="${val}" data-pre="Rs ">Rs ${Math.round(val).toLocaleString('en-LK')}</b><span class="m">about ${usd(val)}</span></div>
 <div class="ch-s"><div><strong>${L.length}</strong>stones in stock</div><div><strong>${ct(cts)}</strong>carats</div><div><strong>${e(top?top[0]:'–')}</strong>${top&&val?Math.round(top[1]/val*100)+'% of value':'no stock yet'}</div></div>
 <div class="bar"><button class="b1" onclick="saleForm()">New sale</button><button onclick="location.hash='stock'">Open stock</button>${!staff&&window.Guardian?`<button class="gsl ${lvl}" onclick="location.hash='guardian'">${ic('shield',16)} Guardian ${G?G.score+'/100':'…'}</button>`:''}</div></div>
 <div class="ch-r">${Illus.heroGem()}</div></section>
<div class="cck">${kp.map(k=>`<div class="k3"><div class="k3t"><small>${k[0]}</small>${k[2]}</div><b data-count="${k[1]}" data-pre="${/owe|Cash|Sales this|Gross/.test(k[0])?'Rs ':''}">${/owe|Cash|Sales this|Gross/.test(k[0])?rs(k[1]):k[1]}</b>${k[3]?Viz.spark(k[3],{c:k[4]}):`<div class="k3bar"><i style="background:${k[4]}"></i></div>`}</div>`).join('')}</div>
<div class="cc2"><div class="card"><div class="ch"><h3>${staff?'Sales':'Sales and profit'}, last 12 months</h3><span class="m">${MN[new Date().getMonth()]} ${new Date().getFullYear()}</span></div>${Viz.area(M.map(x=>MN[+x.m.slice(5)-1]),[{n:'Sales',v:M.map(x=>x.r),c:'var(--ac)'}].concat(staff?[]:[{n:'Gross profit',v:M.map(x=>Math.max(0,x.p)),c:'var(--g)'}]))}</div>
<div class="card gcard2 ${lvl}"><div class="ch"><h3>Guardian</h3><button class="sm" onclick="location.hash='guardian'">Open</button></div>${staff||!window.Guardian?'<p class="m">Visible to owners and managers.</p>':G?`<div class="gmini">${Viz.gauge(G.score,LV3[lvl],lvl==='ok'?'var(--g)':lvl==='warn'?'var(--am,#e9a23b)':'var(--r)')}</div><div class="gmf">${G.findings.slice(0,3).map(f=>`<div class="${f.sev}" onclick="location.hash='${f.page||'guardian'}'"><i></i><span>${e(f.title)}</span></div>`).join('')||'<div class="ok"><i></i><span>No problems found in the last scan.</span></div>'}</div>`:'<p class="m">Scanning…</p>'}</div></div>
<div class="cc3"><div class="card"><div class="ch"><h3>Monthly sales target</h3><button class="sm" onclick="const v=prompt('Monthly sales target (Rs)',D.target||'');if(v!==null){D.target=+v.replace(/,/g,'')||0;save();go()}">${T?'Change':'Set target'}</button></div>${T?`<div class="tg"><b>${Math.round(pc)}%</b><span class="m">${rs(cur.r)} of ${rs(T)}</span></div><div class="prog"><i style="width:${pc}%"></i></div>`:'<p class="m">Set a target to see progress here every day.</p>'}</div>
<div class="card"><div class="ch"><h3>Stock value by gem</h3></div>${Viz.donut(en.slice(0,7).map(([k,v],i)=>({k,v,c:gc[k]})),String(L.length),'stones')}</div>
<div class="card"><div class="ch"><h3>Money customers owe</h3></div>${ag.map((v,i)=>`<div class="hb2"><span>${AG[i]}</span><i><b style="width:${v/agm*100}%;background:${i>2?'var(--r)':i>1?'var(--am,#e9a23b)':'var(--ac)'}"></b></i><em>${v?rs(v):'–'}</em></div>`).join('')}</div></div>
<div class="cc3"><div class="card"><div class="ch"><h3>Needs attention</h3><button class="sm" onclick="location.hash='alerts'">All ${al.length}</button></div>${al.length?al.slice(0,6).map(x=>`<div class="li ${x[0]}" onclick="location.hash='${x[2]}'"><i></i><span>${e(x[1])}</span>${ic('right',14)}</div>`).join(''):Illus.empty('checkc','All clear','Nothing needs attention right now.')}</div>
<div class="card"><div class="ch"><h3>Recent activity</h3></div>${ev.length?ev.map(x=>`<div class="ev"><span class="ei ${x.k}">${ic(x.i,16)}</span><div><b>${e(x.t)}</b><small>${e(x.s)} · ${x.d}</small></div><em class="${x.k}">${x.k==='in'?'+':'−'}${rs(x.a)}</em></div>`).join(''):Illus.empty('receipt','No activity yet','Sales, purchases and expenses show up here.')}</div>
<div class="card"><div class="ch"><h3>Top customers <span class="m">90 days</span></h3></div>${tc.length?tc.map(([id,v],i)=>`<div class="hb2"><span>${e(P(id))}</span><i><b style="width:${v/tcm*100}%"></b></i><em>${rs(v)}</em></div>`).join(''):'<p class="m">No sales in the last 90 days.</p>'}${!staff?`<div class="ch" style="margin-top:14px"><h3>Cash by account</h3></div>${accts.map(([k,v])=>`<div class="hb2"><span>${e(k)}</span><i><b style="width:${Math.abs(v)/acm*100}%;background:${v<0?'var(--r)':'var(--g)'}"></b></i><em>${rs(v)}</em></div>`).join('')}`:''}</div></div>
<div class="qgrid">${QA.map(q=>`<button class="qt" onclick="${q[2]}">${ic(q[1],22)}<span>${q[0]}</span></button>`).join('')}</div></div>`};
const LV3={ok:'Protected',warn:'Needs a look',bad:'At risk'};
})();
