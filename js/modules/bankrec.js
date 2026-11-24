/* Gem ERP :: modules/bankrec.js
   Bank Reconciliation: load the bank statement (Excel or CSV), the system matches each line with the cash book, you add what is
   missing, and the difference is explained. */
const BR={acct:'',head:[],rows:[],name:'',map:{date:-1,desc:-1,debit:-1,credit:-1,amount:-1},bal:''};
const brAccts=()=>Object.keys(bals()).filter(k=>k!=='Cash');
async function brLoad(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  try{let rows;if(/\.xlsx$/i.test(f.name))rows=await imXlsx(f);else rows=parseCSV(await f.text());rows=rows.filter(r=>r.some(c=>String(c).trim()!==''));if(rows.length<2)return alert('The statement has no lines.');
    let hi=rows.findIndex(r=>r.filter(c=>String(c).trim()).length>=3);if(hi<0)hi=0;BR.head=rows[hi].map(x=>String(x).trim());BR.rows=rows.slice(hi+1);BR.name=f.name;
    const fx=re=>BR.head.findIndex(h=>re.test(h.trim()));
    BR.map={date:fx(/date/i),desc:fx(/description|details|narration|particulars|remarks|reference/i),debit:fx(/debit|withdraw|paid out|money out|^dr\.?$/i),credit:fx(/credit|deposit|paid in|money in|^cr\.?$/i),amount:fx(/^amount$/i)};go()}
  catch(x){alert('Could not read the statement: '+(x.message||x))}}
function brLines(){return BR.rows.map((r,i)=>{const g=k=>BR.map[k]>=0?r[BR.map[k]]:'';let a=0;if(BR.map.amount>=0)a=imNum(g('amount'));else a=(imNum(g('credit'))||0)-(imNum(g('debit'))||0);return{i,date:imDate(g('date')),desc:imClean(g('desc')),amt:isNaN(a)?0:r2(a)}}).filter(l=>l.date&&Math.abs(l.amt)>0.004)}
function brMatch(){const L=brLines(),book=D.cash.filter(c=>c.acct===BR.acct&&!c.rec).map((c,i)=>({i:c.id,date:c.date,amt:c.type==='In'?c.amt:-c.amt,c})),r=GemCalc.matchBank(L.map(l=>({i:l.i,date:l.date,amt:l.amt})),book.map(b=>({i:b.i,date:b.date,amt:b.amt})),5);
  return{L,book,r,sUn:r.sUn.map(i=>L.find(l=>l.i===i)),bUn:r.bUn.map(id=>book.find(b=>b.i===id)),pairs:r.pairs}}
pages.bankrec=function(){
  const ac=brAccts();if(!BR.acct||!ac.includes(BR.acct))BR.acct=ac[0]||'';
  let body='';
  if(BR.rows.length&&BR.acct){const m=brMatch(),bal=bals()[BR.acct]||0,uIn=m.bUn.filter(b=>b.amt>0).reduce((a,b)=>a+b.amt,0),uOut=m.bUn.filter(b=>b.amt<0).reduce((a,b)=>a-b.amt,0),adj=r2(bal-uIn+uOut),sb=BR.bal===''?null:imNum(BR.bal);
    body=`<div class="card"><h3>Columns in ${e(BR.name)}</h3><div class="g">${[['date','Date'],['desc','Description'],['debit','Money out (debit)'],['credit','Money in (credit)'],['amount','Single amount column (+/-)']].map(([k,l])=>`<label class="m">${l}<select onchange="BR.map['${k}']=+this.value;go()"><option value="-1">(not used)</option>${BR.head.map((h,i)=>`<option value="${i}" ${BR.map[k]===i?'selected':''}>${e(h||'Column '+(i+1))}</option>`).join('')}</select></label>`).join('')}</div></div>
<div class="kp"><div class="k"><small>Statement lines</small><b>${m.L.length}</b></div><div class="k"><small>Matched with the book</small><b class="ok">${m.pairs.length}</b></div><div class="k"><small>On statement, not in book</small><b class="${m.sUn.length?'bad':''}">${m.sUn.length}</b></div><div class="k"><small>In book, not on statement</small><b>${m.bUn.length}</b></div></div>
<div class="card"><h3>1. On the statement but missing in the cash book (${m.sUn.length})</h3>${m.sUn.length?tbl(['Date','Description','#Amount',''],m.sUn.map(l=>`<tr><td>${e(l.date)}</td><td>${e(l.desc)}</td><td class="r ${l.amt<0?'bad':'ok'}">${rs(l.amt)}</td><td><button class="sm" onclick="brAdd(${l.i})">Add to cash book</button></td></tr>`))+`<div class="bar"><button class="b1" onclick="brAdd(-1)">Add all ${m.sUn.length} to the cash book</button></div><p class="m">Bank charges, interest and direct deposits usually appear here.</p>`:'<p class="ok">Nothing missing.</p>'}</div>
<div class="card"><h3>2. In the cash book but not yet on the statement (${m.bUn.length})</h3>${m.bUn.length?tbl(['Date','Details','#Amount'],m.bUn.map(b=>`<tr><td>${e(b.date)}</td><td>${e(b.c.desc||'')}</td><td class="r">${rs(b.amt)}</td></tr>`))+'<p class="m">Cheques not yet cashed or deposits in transit are normal here.</p>':'<p class="ok">Everything in the book is on the statement.</p>'}</div>
<div class="card"><h3>3. Does it agree?</h3><label class="m">Closing balance on the bank statement <input type="number" step="any" style="width:160px" value="${e(BR.bal)}" onchange="BR.bal=this.value;go()"></label><p style="margin-top:8px">Cash book balance: <b>${rs(bal)}</b><br>Add cheques written but not cashed: <b>${rs(uOut)}</b><br>Less deposits not yet in the bank: <b>${rs(uIn)}</b><br>Adjusted book balance: <b>${rs(adj)}</b>${sb==null||isNaN(sb)?'':`<br>Statement balance: <b>${rs(sb)}</b><br>Difference: <b class="${Math.abs(adj-sb)<0.5?'ok':'bad'}">${Math.abs(adj-sb)<0.5?'Agrees':rs(r2(sb-adj))}</b>`}</p><div class="bar"><button class="b1" onclick="brDone()">Mark ${m.pairs.length} matched entries as reconciled</button></div></div>`}
  return`<h1>Bank Reconciliation</h1><p class="m" style="margin-bottom:10px">Check the bank statement against the cash book once a month, or whenever you receive it.</p><div class="card"><div class="bar"><label class="m">Bank account <select onchange="BR.acct=this.value;go()">${ac.map(a=>`<option ${BR.acct==a?'selected':''}>${e(a)}</option>`).join('')||'<option>(no bank account yet: add one on the Cash page)</option>'}</select></label><label class="up b1" style="padding:6px 14px">Choose statement (Excel or CSV)<input type="file" accept=".xlsx,.csv,.txt" hidden onchange="brLoad(this)"></label>${BR.rows.length?'<button onclick="BR.rows=[];BR.head=[];go()">Clear</button>':''}</div></div>${body}`};
function brAdd(i){
  if(window.__ro)return toast('View-only access.');const m=brMatch(),L=i<0?m.sUn:m.sUn.filter(l=>l.i===i);if(!L.length)return;
  if(i<0&&!confirm('Add '+L.length+' line(s) to the cash book?'))return;
  L.forEach(l=>cb(l.amt>0?'In':'Out',BR.acct,'Bank: '+l.desc,Math.abs(l.amt),l.date));log('Bank reconciliation: added '+L.length+' line(s) to '+BR.acct);save();go()}
function brDone(){
  if(window.__ro)return toast('View-only access.');const m=brMatch();if(!m.pairs.length)return;if(!confirm('Mark '+m.pairs.length+' matched cash book entries as reconciled?'))return;
  const ids=new Set(m.pairs.map(p=>p[1]));D.cash.forEach(c=>{if(ids.has(c.id))c.rec=today()});log('Bank reconciliation: '+m.pairs.length+' entries reconciled on '+BR.acct);save();toast('Reconciled');go()}
