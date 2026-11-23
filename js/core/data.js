/* Gem ERP :: core/data.js
   Shared business rules: party and stone lookup, invoice totals and cost, account balances, period lock, cash-book posting and the activity log. */
const P=id=>(D.parties.find(x=>x.id===id)||{}).name||'-',S=id=>D.stones.find(x=>x.id===id)||{};
const r2=n=>Math.round((+n||0)*100)/100,saleTotal=s=>r2(s.items.reduce((a,i)=>a+i.price,0)-(s.disc||0)),saleCost=s=>r2(s.items.reduce((a,i)=>a+(S(i.stone).cost||0),0));
const INS=s=>s.status=='In stock'||s.status=='Memo In';
const invNo=()=>'INV-'+String(Math.max(0,...D.sales.concat(D.void||[]).map(x=>+String(x.no).replace(/\D/g,'')||0))+1).padStart(4,'0'),addDays=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')},qTotal=q=>r2(q.items.reduce((a,i)=>a+i.price,0)-(q.disc||0));
const AC=()=>D.accts&&D.accts.length?D.accts:['Cash','Bank'];
const bals=()=>{const b={};AC().forEach(a=>b[a]=+(D.open||{})[a]||0);D.cash.forEach(c=>b[c.acct]=(b[c.acct]||0)+(c.type=='In'?c.amt:-c.amt));Object.keys(b).forEach(k=>b[k]=r2(b[k]));return b};
const chk=(a,n)=>n<=0||(bals()[a]||0)>=n||confirm(a+' balance is only '+rs(bals()[a]||0)+'. Continue and go negative?');
const locked=d=>D.lock&&d&&d<=D.lock,lockMsg=()=>alert('Books are locked up to '+D.lock+'. This cannot be changed. Unlock in Backup → Settings first if you really must.');
const cb=(type,acct,desc,amt,date,ref)=>{if(amt>0)D.cash.push({id:uid(),date:date||today(),type,acct,desc,amt,ref})};
const log=t=>{D.log=(D.log||[]).concat({t:today()+' '+new Date().toTimeString().slice(0,5),m:t,id:uid(),u:(window.Me&&Me.email)||''}).slice(-5000)};
