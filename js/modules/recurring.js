/* Gem ERP :: modules/recurring.js
   Recurring expenses: rent, salaries, subscriptions. Nothing is posted by itself: when one falls due you get an alert and post it with one tap. */
const RCATS=['Rent','Transport','Certification','Commission','Utilities','Other'];
function recurForm(id){
  if(window.__ro)return toast('View-only access.');const it=D.recur.find(x=>x.id===id)||{day:1,cat:'Rent',acct:'Cash'};
  form(id?'Edit recurring expense':'New recurring expense',[{k:'desc',l:'What (e.g. Shop rent)'},{k:'cat',l:'Category',o:RCATS},{k:'amt',l:'Amount (Rs)',t:'number'},{k:'acct',l:'Paid from',o:AC()},{k:'day',l:'Due on day of the month (1 to 28)',t:'number'}],it,r=>{
    if(!r.desc||!(r.amt>0))return alert('Give a description and an amount.'),false;r.day=Math.min(28,Math.max(1,Math.round(+r.day||1)));
    if(id)Object.assign(it,r);else D.recur.push({id:uid(),active:true,last:'',...r})})}
const recurDueList=()=>D.recur.filter(x=>GemCalc.recurDue(x,today()));
function recurPost(id){
  if(window.__ro)return toast('View-only access.');const it=D.recur.find(x=>x.id===id);if(!it)return;if(!chk(it.acct,it.amt))return;
  const eid=uid();D.exp.push({id:eid,date:today(),cat:it.cat,desc:it.desc,amt:it.amt,acct:it.acct});cb('Out',it.acct,'Expense: '+it.cat+' '+it.desc,it.amt,today(),eid);it.last=today().slice(0,7);log('Recurring expense posted: '+it.desc+' '+rs(it.amt));save();go()}
function recurSkip(id){const it=D.recur.find(x=>x.id===id);if(!it||window.__ro)return;it.last=today().slice(0,7);log('Recurring expense skipped this month: '+it.desc);save();go()}
function recurToggle(id){const it=D.recur.find(x=>x.id===id);if(!it||window.__ro)return;it.active=it.active===false;save();go()}
function recurDel(id){const it=D.recur.find(x=>x.id===id);if(!it||window.__ro)return;if(!confirm('Delete "'+it.desc+'"? Expenses already posted stay.'))return;D.recur=D.recur.filter(x=>x.id!==id);save();go()}
pages.recurring=function(){
  const due=recurDueList(),ym=today().slice(0,7);
  return`<h1>Recurring Expenses</h1><p class="m" style="margin-bottom:10px">Set up rent, salaries and other regular costs once. When one is due you post it with a tap, so it is never forgotten or posted twice in a month.</p><div class="bar"><button class="b1" onclick="recurForm()">+ New recurring expense</button></div>
<div class="card"><h3>Due now (${due.length})</h3>${due.length?tbl(['What','Category','Paid from','#Amount','Due day',''],due.map(x=>`<tr><td><b>${e(x.desc)}</b></td><td>${e(x.cat)}</td><td>${e(x.acct)}</td><td class="r">${rs(x.amt)}</td><td>${x.day}</td><td><button class="sm b1" onclick="recurPost('${x.id}')">Post now</button> <button class="sm" onclick="recurSkip('${x.id}')">Skip this month</button></td></tr>`)):'<p class="ok">Nothing is due.</p>'}</div>
<div class="card"><h3>All recurring expenses</h3>${D.recur.length?tbl(['What','Category','Paid from','#Amount','Day','Last posted','Status',''],D.recur.map(x=>`<tr><td><b>${e(x.desc)}</b></td><td>${e(x.cat)}</td><td>${e(x.acct)}</td><td class="r">${rs(x.amt)}</td><td>${x.day}</td><td>${e(x.last||'never')}</td><td>${x.active===false?'Paused':x.last===ym?'<span class="ok">Done this month</span>':'Active'}</td><td><button class="sm" onclick="recurForm('${x.id}')">Edit</button> <button class="sm" onclick="recurToggle('${x.id}')">${x.active===false?'Resume':'Pause'}</button> <button class="sm" onclick="recurDel('${x.id}')">Delete</button></td></tr>`)):'<p class="m">None yet.</p>'}<p class="m" style="margin-top:8px">Monthly total: <b>${rs(D.recur.filter(x=>x.active!==false).reduce((a,x)=>a+x.amt,0))}</b></p></div>`};
(window.__alertHooks=window.__alertHooks||[]).push(()=>{if(!['owner','manager'].includes(window.myRole?myRole():'owner'))return[];const n=recurDueList().length;return n?[['warn',n+' recurring expense(s) due to post','recurring']]:[]});
