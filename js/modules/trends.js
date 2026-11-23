/* Gem ERP :: modules/trends.js
   Trends charts. */
pages.trends=function(){const N=+(window.TN||12),ms=Array.from({length:N},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(N-1-i));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}),mon=m=>new Date(m+'-01T00:00:00').toLocaleString('en',{month:'short'}),lab=ms.map(mon),first=ms[0]+'-01',inM=(d,m)=>d&&d.slice(0,7)==m,realCash=D.cash.filter(c=>!String(c.desc||'').startsWith('Transfer')),
sl=ms.map(m=>D.sales.filter(s=>inM(s.date,m))),sales=sl.map(a=>a.reduce((x,s)=>x+saleTotal(s),0)),gp=sl.map(a=>a.reduce((x,s)=>x+saleTotal(s)-saleCost(s),0)),exp=ms.map(m=>D.exp.filter(x=>inM(x.date,m)).reduce((a,x)=>a+x.amt,0)),np=ms.map((m,i)=>gp[i]-exp[i]-partnerPS(sl[i])),cin=ms.map(m=>realCash.filter(c=>inM(c.date,m)&&c.type=='In').reduce((a,c)=>a+c.amt,0)),cout=ms.map(m=>realCash.filter(c=>inM(c.date,m)&&c.type=='Out').reduce((a,c)=>a+c.amt,0)),
ends=ms.map(m=>{const[y,mo]=m.split('-').map(Number);return m+'-'+String(new Date(y,mo,0).getDate()).padStart(2,'0')}),acs=AC(),bl=acs.map(a=>ends.map(en=>(+(D.open||{})[a]||0)+D.cash.filter(c=>c.acct==a&&c.date<=en).reduce((s,c)=>s+(c.type=='In'?c.amt:-c.amt),0))),
cat={};D.exp.filter(x=>x.date>=first).forEach(x=>cat[x.cat]=(cat[x.cat]||0)+x.amt);const ty={};D.sales.filter(s=>s.date>=first).forEach(s=>{const t=s.items.reduce((a,i)=>a+i.price,0);s.items.forEach(i=>{const z=S(i.stone);if(!z)return;const net=i.price-(t?(s.disc||0)*i.price/t:0);ty[z.type]=(ty[z.type]||0)+net-(z.cost||0)})});
return`<h1>Trends</h1><div class=\"bar\"><select onchange=\"window.TN=this.value;go()\"><option value=\"6\" ${N==6?'selected':''}>Last 6 months</option><option value=\"12\" ${N==12?'selected':''}>Last 12 months</option><option value=\"24\" ${N==24?'selected':''}>Last 24 months</option></select></div>
<div class=\"card\"><h3>Sales, profit and expenses</h3>${barSvg(lab,[{n:'Sales',v:sales,c:'#2a5bd7'},{n:'Gross profit',v:gp,c:'#10b981'},{n:'Expenses',v:exp,c:'#f59e0b'}])}</div>
<div class=\"card\"><h3>Net profit (after expenses and partners’ share)</h3>${barSvg(lab,[{n:'Net profit',v:np,c:'#3b82f6'}])}</div>
<div class=\"card\"><h3>Money in and out (all accounts, transfers left out)</h3>${barSvg(lab,[{n:'Money in',v:cin,c:'#10b981'},{n:'Money out',v:cout,c:'#ef4444'}])}</div>
<div class=\"card\"><h3>Account balances at month end</h3>${lineSvg(lab,acs.map((a,i)=>({n:a,v:bl[i]})))}</div>
<div class=\"card\"><h3>Profit by gem type (period)</h3>${hbars(ty)}</div>
<div class=\"card\"><h3>Expenses by category (period)</h3>${hbars(cat)}</div>`};
