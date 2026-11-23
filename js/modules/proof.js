/* Gem ERP :: modules/proof.js
   Accounts proof: checks that stock, cash, receivables and payables agree. */
pages.proof=function(){return proofHtml()};
function proofData(){const tol=.5,R=[],xf=c=>/^Transfer (to|from) /.test(c.desc||''),cash=D.cash||[],sum=(l,f)=>l.reduce((a,x)=>a+f(x),0),rs0=n=>rs(Math.round(n)),
chk=(name,exp,act,items,o)=>{o=o||{};const d=act-exp,bad=Math.abs(d)>tol||(items&&items.length&&!o.infoOnly);R.push({name,exp,act,d,items:items||[],st:Math.abs(d)>tol?(o.warn?'warn':'bad'):(items&&items.length?(o.warn===false?'bad':'warn'):'ok'),hint:o.hint||'',money:o.money!==false})};
const sales=D.sales||[],pur=D.purchases||[],jobs=D.jobs||[],exps=D.exp||[],chqs=D.chq||[],stones=D.stones||[],accts=AC();
/* 1 cash book */
const badCash=cash.filter(c=>!(c.amt>0)||!['In','Out'].includes(c.type)||!c.date||!c.acct).map(c=>(c.date||'no date')+' '+(c.desc||'')+' '+(c.acct||'no account')+' '+c.amt);
const unk=[...new Set(cash.map(c=>c.acct).filter(a=>a&&!accts.includes(a)))].map(a=>'Account not in your account list: '+a);
const op=sum(accts,a=>+(D.open||{})[a]||0),cin=sum(cash.filter(c=>c.type=='In'),c=>c.amt),cout=sum(cash.filter(c=>c.type=='Out'),c=>c.amt),bl=Object.values(bals()).reduce((a,v)=>a+v,0);
chk('Cash Book: all account balances = opening balances + money in - money out',op+cin-cout,bl,[],{hint:'Each account balance is rebuilt from opening balance and every Cash Book line.'});
chk('Cash Book: every line has a date, an account, a positive amount and In or Out',0,badCash.length,badCash.concat(unk),{money:false});
/* 2 transfers */
const tOut=sum(cash.filter(c=>xf(c)&&c.type=='Out'),c=>c.amt),tIn=sum(cash.filter(c=>xf(c)&&c.type=='In'),c=>c.amt);
chk('Transfers between your accounts net to zero (money out = money in)',tOut,tIn,[],{hint:'A transfer must leave one account and arrive in another for the same amount.'});
/* 3 customers */
const sid=new Set(sales.map(x=>x.id)),netS=sum(cash.filter(c=>sid.has(c.ref)),c=>c.type=='In'?c.amt:-c.amt),chR=sum(chqs.filter(c=>c.type=='Received'&&c.status=='Cleared'),c=>c.amt),paidS=sum(sales,x=>x.paid||0);
const unexp=paidS-netS-chR,custItems=[];sales.forEach(x=>{const n=sum(cash.filter(c=>c.ref==x.id),c=>c.type=='In'?c.amt:-c.amt);if((x.paid||0)-n>tol)custItems.push(x.no+' '+P(x.party)+': recorded paid '+rs0(x.paid)+', Cash Book receipts '+rs0(n)+' (difference '+rs0((x.paid||0)-n)+', normally cheques)')});
chk('Customers: total paid on invoices = receipts in the Cash Book + cleared received cheques',paidS,netS+chR,[],{hint:'Receipts are net of refunds. A difference means an invoice shows money received that is not in the Cash Book, or the other way round.'});
if(Math.abs(unexp)>tol)R[R.length-1].items=custItems;
/* 4 suppliers and cutters */
const pRefs=new Map();pur.forEach(x=>{pRefs.set(x.id,1);if(x.stone)pRefs.set(x.stone,1)});jobs.forEach(x=>pRefs.set(x.id,1));
const netP=sum(cash.filter(c=>pRefs.has(c.ref)),c=>c.type=='Out'?c.amt:-c.amt),chI=sum(chqs.filter(c=>c.type=='Issued'&&c.status=='Cleared'),c=>c.amt),paidP=sum(pur,x=>x.paid||0)+sum(jobs,x=>x.paid||0);
chk('Suppliers and cutters: total paid = payments in the Cash Book + cleared issued cheques',paidP,netP+chI,[],{hint:'Payments are net of supplier refunds.'});
/* 5 expenses */
const expBad=[];exps.forEach(x=>{const n=sum(cash.filter(c=>c.ref==x.id&&c.type=='Out'),c=>c.amt);if(Math.abs(n-x.amt)>tol)expBad.push(x.date+' '+(x.cat||'')+' '+(x.desc||'')+': expense '+rs0(x.amt)+', Cash Book '+rs0(n))});
chk('Expenses: every expense has a Cash Book payment for the same amount',sum(exps,x=>x.amt),sum(exps,x=>sum(cash.filter(c=>c.ref==x.id&&c.type=='Out'),c=>c.amt)),expBad);
/* 6 stock and invoices */
const onSale={},dup=[];sales.forEach(x=>x.items.forEach(i=>{if(onSale[i.stone])dup.push((S(i.stone).code||i.stone)+' is on '+onSale[i.stone]+' and '+x.no);onSale[i.stone]=x.no}));
const sb=[];stones.forEach(z=>{if(z.status=='Sold'&&!onSale[z.id])sb.push(z.code+' is marked Sold but is on no invoice');if(z.status!='Sold'&&onSale[z.id])sb.push(z.code+' is on '+onSale[z.id]+' but its status is '+z.status)});
sales.forEach(x=>x.items.forEach(i=>{if(!stones.find(z=>z.id==i.stone))sb.push(x.no+' lists a stone that does not exist')}));
chk('Stock and invoices agree (sold stones are on exactly one invoice, invoice stones are marked Sold)',0,sb.length+dup.length,sb.concat(dup),{money:false});
/* 7 stock cost vs purchase */
const cb2=[];pur.forEach(x=>{const z=S(x.stone);if(!z.id||z.shape=='Parcel'||z.lot||jobs.some(j=>j.stone==z.id||j.rough==z.id))return;const pc=x.orig??x.cost;if(['In stock','Memo','Sold'].includes(z.status)&&Math.abs((z.cost||0)-pc)>tol)cb2.push(z.code+': stone cost '+rs0(z.cost)+', purchase cost '+rs0(pc))});
chk('Stock cost = purchase cost for bought stones (cut stones and parcels excluded)',0,cb2.length,cb2,{money:false,warn:true,hint:'If you edit a stone\'s cost after buying, stock value and what you owe the supplier no longer agree.'});
/* 8 invoice arithmetic */
const ab=[];sales.forEach(x=>{const g=sum(x.items,i=>i.price),t=saleTotal(x);if(t<-tol)ab.push(x.no+' total is negative');if((x.paid||0)<-tol)ab.push(x.no+' has negative paid');if((x.paid||0)>t+tol)ab.push(x.no+' received '+rs0(x.paid)+' of '+rs0(t));if((x.disc||0)>g+tol)ab.push(x.no+' discount above the stones total');x.items.forEach(i=>{if(!(i.price>0))ab.push(x.no+' has a stone with no price')})});
pur.forEach(x=>{if((x.paid||0)>(x.cost||0)+tol&&!x.orig)ab.push('Purchase '+(S(x.stone).code||'')+' paid '+rs0(x.paid)+' of '+rs0(x.cost))});
chk('Invoices and purchases: no overpayment, negative amount or missing price',0,ab.length,ab,{money:false});
/* 9 numbering */
const nb=[],dupNo=(l,f,lab)=>{const m={};l.forEach(x=>{const k=f(x);if(k)m[k]=(m[k]||0)+1});Object.keys(m).filter(k=>m[k]>1).forEach(k=>nb.push(lab+' '+k+' used '+m[k]+' times'))};
dupNo(sales,x=>x.no,'Invoice');dupNo(D.cn||[],x=>x.no,'Credit note');dupNo(D.dn||[],x=>x.no,'Debit note');dupNo(stones,x=>x.code,'Stone code');
chk('Document numbers are unique (invoices, credit notes, debit notes, stone codes)',0,nb.length,nb,{money:false});
/* 10 orphan cash lines */
const ok=new Set([...sales,...(D.void||[]),...pur,...jobs,...exps,...stones,...(D.parties||[]),...chqs].map(x=>x.id)),orph=cash.filter(c=>!c.manual&&!xf(c)&&c.ref&&!ok.has(c.ref)).map(c=>c.date+' '+c.desc+' '+rs0(c.amt)+' ('+c.acct+')');
chk('Cash Book: every system line points to an existing document',0,orph.length,orph,{money:false,warn:true,hint:'Usually a document that was deleted after its payment was posted.'});
/* 11 decimals */
const dec=[];const fr=v=>Math.abs(v-Math.round(v))>.005;cash.forEach(c=>{if(fr(c.amt))dec.push('Cash Book '+c.date+' '+c.desc+' '+c.amt)});sales.forEach(x=>{if(fr(saleTotal(x))||fr(x.paid||0))dec.push(x.no+' has fractions of a rupee')});
chk('Amounts are whole rupees (no hidden fractions that cause 1-rupee differences)',0,dec.length,dec,{money:false,warn:true});
return R}
function proofHtml(){const R=proofData(),bad=R.filter(r=>r.st=='bad').length,wn=R.filter(r=>r.st=='warn').length,ok=R.filter(r=>r.st=='ok').length,tag={ok:'<span class="tag s">Agrees</span>',warn:'<span class="tag o">Review</span>',bad:'<span class="tag" style="background:#fde2e2;color:#b42318">Error</span>'},f=(r,v)=>r.money?rs(Math.round(v)):v;
return`<h1>Accounts Proof</h1><div class="bar noprint"><button class="b1" onclick="proofPrint()">Print proof</button></div><div class="card"><p>${bad?`<b style="color:var(--r)">${bad} check(s) do not agree.</b>`:wn?'<b>No errors, but some items need review.</b>':'<b style="color:var(--g)">Every check agrees to the rupee.</b>'} ${ok} of ${R.length} agree${wn?', '+wn+' to review':''}${bad?', '+bad+' with errors':''}. As of ${today()}. Nothing has been changed.</p><p class="m">Each check adds your records up in a second, independent way and compares the two answers.</p></div><div class="card">${R.map(r=>`<div style="padding:12px 0;border-bottom:1px solid var(--bd)"><div style="display:flex;justify-content:space-between;gap:12px"><b>${e(r.name)}</b>${tag[r.st]}</div>${r.money?`<div class="m" style="margin-top:4px">Expected ${f(r,r.exp)} &middot; Actual ${f(r,r.act)} &middot; Difference <b class="${Math.abs(r.d)>.5?'bad':''}">${f(r,r.d)}</b></div>`:`<div class="m" style="margin-top:4px">${r.act?r.act+' item(s) found':'Nothing found'}</div>`}${r.hint?`<div class="m" style="margin-top:2px;font-size:12px">${e(r.hint)}</div>`:''}${r.items.slice(0,25).map(i=>`<div class="m" style="margin-top:5px">• ${e(i)}</div>`).join('')}${r.items.length>25?`<div class="m">…and ${r.items.length-25} more</div>`:''}</div>`).join('')}</div>`}
function proofPrint(){const x=$('#dlg');x.innerHTML=lh()+'<h3>Accounts Proof</h3>'+document.querySelector('#pg').innerHTML.replace(/<h1>.*?<\/h1>/,'').replace(/<div class="bar noprint">.*?<\/div>/,'')+lf()+'<div class="dlgbar noprint"><button onclick="dlg.close()">Close</button><button class="b1" onclick="window.print()">Print</button></div>';x.showModal()}
