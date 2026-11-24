/* Gem ERP :: modules/analytics.js
   Analytics with date filters, profit by customer / supplier / gem type / stone, cutting-yield analysis,
   Excel exports and a shareable daily summary. */
const AN={p:'month',from:'',to:''};
function anRange(){
  const t=today(),y=t.slice(0,4),m=t.slice(0,7);
  if(AN.p==='custom')return[AN.from||'0000-00-00',AN.to||'9999-12-31'];
  if(AN.p==='month')return[m+'-01',m+'-31'];
  if(AN.p==='last'){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);const mm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return[mm+'-01',mm+'-31']}
  if(AN.p==='year')return[y+'-01-01',y+'-12-31'];
  if(AN.p==='12')return[addDays(t,-365),t];
  return['0000-00-00','9999-12-31']}
function anData(){
  const[f,t]=anRange(),inR=d=>d&&d>=f&&d<=t,ss=D.sales.filter(s=>inR(s.date)),lines=[];
  ss.forEach(s=>{const tot=s.items.reduce((a,i)=>a+i.price,0);s.items.forEach(i=>{const z=S(i.stone),net=i.price-(tot?(s.disc||0)*i.price/tot:0);lines.push({s,z,net,cost:z.cost||0,pf:net-(z.cost||0),days:Math.max(0,Math.round((new Date(s.date)-new Date(z.date||s.date))/864e5))})})});
  const rev=lines.reduce((a,l)=>a+l.net,0),cogs=lines.reduce((a,l)=>a+l.cost,0),exp=D.exp.filter(x=>inR(x.date)).reduce((a,x)=>a+x.amt,0),psh=partnerPS(ss),
    grp=(fn)=>{const o={};lines.forEach(l=>{const k=fn(l);const v=o[k]=o[k]||{n:0,c:0,r:0,p:0};v.n++;v.c+=l.z.carats||0;v.r+=l.net;v.p+=l.pf});return Object.entries(o).sort((a,b)=>b[1].p-a[1].p)};
  return{f,t,ss,lines,rev,cogs,gp:rev-cogs,exp,psh,net:rev-cogs-exp-psh,cust:grp(l=>l.s.party),supp:grp(l=>l.z.supplier||'-'),type:grp(l=>l.z.type||'-'),
    carats:lines.reduce((a,l)=>a+(l.z.carats||0),0),avgDays:lines.length?Math.round(lines.reduce((a,l)=>a+l.days,0)/lines.length):0,
    recv:D.sales.reduce((a,s)=>a+saleTotal(s)-s.paid,0)}}
const mgn=(p,r)=>r?(p/r*100).toFixed(1)+'%':'-';
pages.analytics=function(){
  const a=anData(),ms=[];
  if(a.ss.length||AN.p!=='all'){const f=a.f<'1900'?(a.ss.map(s=>s.date).sort()[0]||today()):a.f,t=a.t>'9000'?today():(a.t>today()?today():a.t);let d=new Date(f.slice(0,7)+'-01T00:00:00');const end=new Date(t.slice(0,7)+'-01T00:00:00');while(d<=end&&ms.length<36){ms.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));d.setMonth(d.getMonth()+1)}}
  const mv=ms.map(m=>{const s2=a.lines.filter(l=>l.s.date.startsWith(m));return{r:s2.reduce((x,l)=>x+l.net,0),p:s2.reduce((x,l)=>x+l.pf,0)}});
  const row=(k,v,lab)=>`<tr><td>${lab}</td><td class="r">${v.n}</td><td class="r">${ct(v.c)}</td><td class="r">${rs(v.r)}</td><td class="r ${v.p<0?'bad':'ok'}">${rs(v.p)}</td><td class="r">${mgn(v.p,v.r)}</td></tr>`;
  return`<h1>Analytics</h1><div class="bar"><select onchange="AN.p=this.value;go()">${[['month','This month'],['last','Last month'],['year','This year'],['12','Last 12 months'],['all','All time'],['custom','Custom dates']].map(o=>`<option value="${o[0]}" ${AN.p==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>${AN.p==='custom'?`<input type="date" value="${AN.from}" onchange="AN.from=this.value;go()"> <input type="date" value="${AN.to}" onchange="AN.to=this.value;go()">`:''}<button class="b1" onclick="anExport()">Download Excel</button><button onclick="packXlsx()">Accountant pack</button><button onclick="shareTxt(digestText())">Copy summary</button><button onclick="open('https://wa.me/?text='+encodeURIComponent(digestText()))">WhatsApp summary</button><button onclick="open('mailto:?subject='+encodeURIComponent('Business summary '+today())+'&body='+encodeURIComponent(digestText()))">Email summary</button></div>
<div class="kp">${[['Sales',rs(a.rev)],['Gross profit',rs(a.gp)],['Gross margin',mgn(a.gp,a.rev)],['Expenses',rs(a.exp)],['Net profit',rs(a.net)],['Stones sold',a.lines.length],['Carats sold',ct(a.carats)],['Avg days to sell',a.lines.length?a.avgDays:'-'],['To receive (all)',rs(a.recv)]].map(k=>`<div class="k"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>
${ms.length>1?`<div class="card"><h3>Sales and profit by month</h3>${barSvg(ms.map(m=>m.slice(2)),[{n:'Sales',v:mv.map(x=>x.r),c:'#2a5bd7'},{n:'Profit',v:mv.map(x=>x.p),c:'#10b981'}])}</div>`:''}
<div class="two"><div class="card"><h3>Profit by customer</h3>${tbl(['Customer','#Stones','#Carats','#Sales','#Profit','#Margin'],a.cust.map(([k,v])=>row(k,v,`<a href="javascript:openProfile('${k}')">${e(P(k))}</a>`)))}</div><div class="card"><h3>Profit by supplier (source of the stones sold)</h3>${tbl(['Supplier','#Stones','#Carats','#Sales','#Profit','#Margin'],a.supp.map(([k,v])=>row(k,v,e(P(k)))))}</div></div>
<div class="card"><h3>Profit by gem type</h3>${tbl(['Gem','#Stones','#Carats','#Sales','#Profit','#Margin'],a.type.map(([k,v])=>row(k,v,e(k))))}</div>
<div class="card"><h3>Best and weakest stones</h3>${tbl(['Stone','Gem','Customer','Date','#Cost','#Sold for','#Profit'],a.lines.slice().sort((x,y)=>y.pf-x.pf).filter((l,i,A)=>i<8||i>=A.length-4).map(l=>`<tr><td>${e(l.z.code)}</td><td>${e(l.z.type)}</td><td>${e(P(l.s.party))}</td><td>${l.s.date}</td><td class="r">${rs(l.cost)}</td><td class="r">${rs(l.net)}</td><td class="r ${l.pf<0?'bad':'ok'}">${rs(l.pf)}</td></tr>`))}</div>`};
function digestText(){
  const a=anData(),t=today(),ts=D.sales.filter(s=>s.date===t),inn=D.cash.filter(c=>c.date===t&&c.type==='In').reduce((x,c)=>x+c.amt,0),out=D.cash.filter(c=>c.date===t&&c.type==='Out').reduce((x,c)=>x+c.amt,0),ins=D.stones.filter(s=>['In stock','Memo'].includes(s.status)),b=bals();
  return[(D.co&&D.co.name)||'Business summary',t,'',
    'Today: '+ts.length+' invoice(s), sales '+rs(ts.reduce((x,s)=>x+saleTotal(s),0)),'Money in '+rs(inn)+' | out '+rs(out),'',
    'Selected period ('+(a.f<'1900'?'start':a.f)+' to '+(a.t>'9000'?'today':a.t)+')','Sales '+rs(a.rev)+' | Gross profit '+rs(a.gp)+' | Net '+rs(a.net),'',
    'To receive: '+rs(a.recv),'Stock: '+ins.length+' stones, '+ct(ins.reduce((x,s)=>x+s.carats,0))+' ct, selling value '+rs(ins.reduce((x,s)=>x+s.price,0)),
    'Cash & bank: '+Object.entries(b).map(([k,v])=>k+' '+rs(v)).join(', '),'Alerts: '+alerts().length].join('\n')}
/* ---- Excel ---- */
function xlsSave(name,sheets){const b=makeXlsx(sheets),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),20000)}
function anExport(){
  const a=anData(),g=(arr,fn)=>[['Name','Stones','Carats','Sales','Profit','Margin %'],...arr.map(([k,v])=>[fn(k),v.n,+ct(v.c),Math.round(v.r),Math.round(v.p),v.r?+(v.p/v.r*100).toFixed(1):0])];
  xlsSave('analytics-'+today()+'.xlsx',[
    {name:'Summary',rows:[['Item','Value'],['From',a.f<'1900'?'start':a.f],['To',a.t>'9000'?'today':a.t],['Sales',Math.round(a.rev)],['Cost of stones sold',Math.round(a.cogs)],['Gross profit',Math.round(a.gp)],['Expenses',Math.round(a.exp)],['Partners share',Math.round(a.psh)],['Net profit',Math.round(a.net)],['Stones sold',a.lines.length],['Carats sold',+ct(a.carats)]]},
    {name:'By customer',rows:g(a.cust,P)},{name:'By supplier',rows:g(a.supp,P)},{name:'By gem type',rows:g(a.type,k=>k)},
    {name:'Sales lines',rows:[['Invoice','Date','Customer','Stone','Gem','Carats','Cost','Sold for','Profit'],...a.lines.map(l=>[l.s.no,l.s.date,P(l.s.party),l.z.code,l.z.type,+ct(l.z.carats),Math.round(l.cost),Math.round(l.net),Math.round(l.pf)])]}])}
function exportXlsxAll(){
  const q=n=>n==null?'':n;
  xlsSave('gem-erp-all-'+today()+'.xlsx',[
    {name:'Stock',rows:[['Code','Gem','Shape','Carats','Color','Origin','Treatment','Lab','Certificate','Report date','Cost','Price','Status','Supplier','Added'],...D.stones.map(s=>[s.code,s.type,s.shape,+ct(s.carats),q(s.color),q(s.origin),q(s.treatment),q(s.lab),q(s.cert),q(s.rdate),s.cost||0,s.price||0,s.status,P(s.supplier),q(s.date)])]},
    {name:'Sales',rows:[['Invoice','Date','Customer','Stones','Discount','Total','Paid','Due','Cost','Profit'],...D.sales.map(s=>[s.no,s.date,P(s.party),s.items.map(i=>S(i.stone).code).join(' '),s.disc||0,saleTotal(s),s.paid,saleTotal(s)-s.paid,saleCost(s),saleTotal(s)-saleCost(s)])]},
    {name:'Purchases',rows:[['Date','Supplier','Stone','Cost','Paid','Due'],...D.purchases.map(x=>[x.date,P(x.party),S(x.stone).code||'',x.cost,x.paid,x.cost-x.paid])]},
    {name:'Cash book',rows:[['Date','Account','Type','Details','Amount'],...D.cash.slice().sort((a,b)=>a.date<b.date?-1:1).map(c=>[c.date,c.acct,c.type,c.desc,c.amt])]},
    {name:'Expenses',rows:[['Date','Category','Description','Amount','Paid from'],...D.exp.map(x=>[x.date,x.cat,x.desc,x.amt,x.acct||''])]},
    {name:'Cheques',rows:[['No','Type','Party','Date','Amount','Status'],...D.chq.map(c=>[c.no,c.type,P(c.party),c.date,c.amt,c.status])]},
    {name:'Parties',rows:[['Name','Type','Phone','Credit limit','Terms (days)'],...D.parties.map(p=>[p.name,p.type,q(p.phone),p.limit||0,p.terms||''])]}])}
/* ---- cutting yield ---- */
pages.yield=function(){
  const J=D.jobs,done=J.filter(j=>j.done),inC=done.reduce((a,j)=>a+j.inCt,0),outC=done.reduce((a,j)=>a+j.out,0),fees=J.reduce((a,j)=>a+j.cost,0),
    days=j=>j.rdate?Math.max(0,Math.round((new Date(j.rdate)-new Date(j.date))/864e5)):null,
    grp=fn=>{const o={};J.forEach(j=>{const k=fn(j),v=o[k]=o[k]||{n:0,d:0,i:0,o:0,f:0,dd:0,dn:0};v.n++;v.f+=j.cost;if(j.done){v.d++;v.i+=j.inCt;v.o+=j.out;const x=days(j);if(x!=null){v.dd+=x;v.dn++}}});return Object.entries(o)},
    bars=a=>a.filter(([k,v])=>v.i).map(([k,v])=>`<div class="hb"><span>${e(k)}</span><i style="width:${Math.min(100,v.o/v.i*100)*.55}%;background:${v.o/v.i>=.4?'var(--g)':'#f59e0b'}"></i><span>${(v.o/v.i*100).toFixed(1)}%</span></div>`).join('')||'<p class="m">No finished jobs yet.</p>',
    tb=(a,lab)=>tbl([lab,'#Jobs','#Done','#Rough ct','#Finished ct','#Loss ct','#Yield','#Fee / finished ct','#Avg days'],a.map(([k,v])=>`<tr><td>${e(k)}</td><td class="r">${v.n}</td><td class="r">${v.d}</td><td class="r">${ct(v.i)}</td><td class="r">${ct(v.o)}</td><td class="r">${ct(v.i-v.o)}</td><td class="r">${v.i?(v.o/v.i*100).toFixed(1)+'%':'-'}</td><td class="r">${v.o?rs(v.f/v.o):'-'}</td><td class="r">${v.dn?Math.round(v.dd/v.dn):'-'}</td></tr>`));
  const cu=grp(j=>P(j.party)),ty=grp(j=>(S(j.rough)||{}).type||'-');
  return`<h1>Cutting Yield</h1><div class="kp"><div class="k"><small>Overall yield</small><b>${inC?(outC/inC*100).toFixed(1)+'%':'-'}</b></div><div class="k"><small>Rough cut (carats)</small><b>${ct(inC)}</b></div><div class="k"><small>Finished (carats)</small><b>${ct(outC)}</b></div><div class="k"><small>Weight lost</small><b>${ct(inC-outC)} ct</b></div><div class="k"><small>Cutting fees</small><b>${rs(fees)}</b></div><div class="k"><small>Jobs with cutters now</small><b>${J.length-done.length}</b></div></div>
<div class="two"><div class="card"><h3>Yield by cutter</h3>${bars(cu)}</div><div class="card"><h3>Yield by gem type</h3>${bars(ty)}</div></div>
<div class="card"><h3>Cutter comparison</h3>${tb(cu,'Cutter')}</div><div class="card"><h3>By gem type</h3>${tb(ty,'Gem')}</div>
<div class="card"><h3>Every finished job (best yield first)</h3>${tbl(['Job','Cutter','Gem','#Rough ct','#Finished ct','#Loss ct','#Yield','#Fee','#Days'],done.slice().sort((a,b)=>b.out/b.inCt-a.out/a.inCt).map(j=>`<tr><td>${e(j.no)}</td><td>${e(P(j.party))}</td><td>${e((S(j.rough)||{}).type||'-')}</td><td class="r">${ct(j.inCt)}</td><td class="r">${ct(j.out)}</td><td class="r">${ct(j.inCt-j.out)}</td><td class="r">${(j.out/j.inCt*100).toFixed(1)}%</td><td class="r">${rs(j.cost)}</td><td class="r">${days(j)==null?'-':days(j)}</td></tr>`))}</div><p class="m">Yield = finished weight ÷ rough weight. Days are counted from issuing the rough to receiving the cut stone (jobs received before this version have no day count).</p>`};
/* ---- Accountant pack: one Excel file for the selected period ---- */
function packXlsx(){
  const a=anData(),f=a.f,t=a.t,inR=d=>d&&d>=f&&d<=t,rate=+((D.tax||{}).rate)||0,taxIn=v=>rate>0?r2(v-v/(1+rate/100)):0,items=colItems(),bk=GemCalc.BANDS?null:null;
  const bucket=d=>d<=30?'0-30':d<=60?'31-60':d<=90?'61-90':'90+',q=n=>n==null?'':n;
  const ar=items.filter(r=>r.k==='sales'),ap=items.filter(r=>r.k!=='sales');
  const pivot=arr=>{const m={};arr.forEach(r=>{const g=m[r.party]=m[r.party]||{'0-30':0,'31-60':0,'61-90':0,'90+':0};g[bucket(r.age)]+=r.due});return[['Party','0-30 days','31-60 days','61-90 days','Over 90 days','Total'],...Object.entries(m).map(([k,g])=>[P(k),Math.round(g['0-30']),Math.round(g['31-60']),Math.round(g['61-90']),Math.round(g['90+']),Math.round(g['0-30']+g['31-60']+g['61-90']+g['90+'])])]};
  const sales=D.sales.filter(s=>inR(s.date)),exps=D.exp.filter(x=>inR(x.date)),cash=D.cash.filter(c=>inR(c.date)).sort((x,y)=>x.date<y.date?-1:1),purch=D.purchases.filter(x=>inR(x.date)),cats={};exps.forEach(x=>{cats[x.cat]=(cats[x.cat]||0)+x.amt});
  const live=D.stones.filter(s=>['In stock','Memo'].includes(s.status));
  xlsSave('accountant-pack-'+(f<'1900'?'all':f)+'-to-'+(t>'9000'?today():t)+'.xlsx',[
    {name:'Summary',rows:[['Item','Amount (Rs)'],['Period from',f<'1900'?'start':f],['Period to',t>'9000'?today():t],['Sales (after discounts)',Math.round(a.rev)],['Cost of stones sold',Math.round(a.cogs)],['Gross profit',Math.round(a.gp)],['Expenses',Math.round(a.exp)],['Partners share',Math.round(a.psh)],['Net profit',Math.round(a.net)],[(D.tax&&D.tax.name||'Tax')+' included in sales ('+rate+'%)',Math.round(sales.reduce((x,s)=>x+taxIn(saleTotal(s)),0))],['Receivable (all time)',Math.round(ar.reduce((x,r)=>x+r.due,0))],['Payable (all time)',Math.round(ap.reduce((x,r)=>x+r.due,0))],['Stock at cost (now)',Math.round(live.reduce((x,s)=>x+(s.cost||0),0))],['Stock at selling price (now)',Math.round(live.reduce((x,s)=>x+(s.price||0),0))]]},
    {name:'Sales',rows:[['Invoice','Date','Customer','Stones','Discount','Total','Tax included','Paid','Due','Cost','Profit'],...sales.map(s=>[s.no,s.date,P(s.party),s.items.map(i=>S(i.stone).code).join(' '),s.disc||0,saleTotal(s),taxIn(saleTotal(s)),s.paid,r2(saleTotal(s)-s.paid),saleCost(s),r2(saleTotal(s)-saleCost(s))])]},
    {name:'Purchases',rows:[['Date','Supplier','Stone','Cost','Paid','Due'],...purch.map(x=>[x.date,P(x.party),S(x.stone).code||'',x.cost,x.paid,r2(x.cost-x.paid)])]},
    {name:'Expenses by type',rows:[['Category','Amount'],...Object.entries(cats).map(([k,v])=>[k,v]),['Total',exps.reduce((x,y)=>x+y.amt,0)]]},
    {name:'Expenses',rows:[['Date','Category','Description','Amount','Paid from'],...exps.map(x=>[x.date,x.cat,x.desc,x.amt,q(x.acct)])]},
    {name:'Cash book',rows:[['Date','Account','Type','Details','Amount'],...cash.map(c=>[c.date,c.acct,c.type,c.desc,c.amt])]},
    {name:'Receivables',rows:[['Invoice','Customer','Date','Due','Days old','Age band'],...ar.map(r=>[r.no,P(r.party),r.date,Math.round(r.due),r.age,bucket(r.age)])]},
    {name:'Receivables by customer',rows:pivot(ar)},{name:'Payables by supplier',rows:pivot(ap)},
    {name:'Stock at cost',rows:[['Code','Gem','Carats','Location','Status','Cost','Selling price'],...live.map(s=>[s.code,s.type,+ct(s.carats),q(s.loc),s.status,s.cost||0,s.price||0])]},
    {name:'Pending cheques',rows:[['No','Type','Party','Date','Amount'],...D.chq.filter(c=>c.status==='Pending').map(c=>[c.no,c.type,P(c.party),c.date,c.amt])]}])}
