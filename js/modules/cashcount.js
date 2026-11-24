/* Gem ERP :: modules/cashcount.js
   Daily cash count: enter what is really in the till and each bank account, compare with the cash book, record the difference
   with a reason, and keep the history. */
function ccPage(){const b=bals();return Object.keys(b)}
pages.cashcount=function(){
  const b=bals(),ks=Object.keys(b),t=today(),H=D.counts.slice().reverse(),todayDone=D.counts.some(c=>c.date===t);
  return`<h1>Cash Count</h1><p class="m" style="margin-bottom:10px">Count the money, type the amounts, and the system shows any difference from the cash book. ${todayDone?'<b class="ok">Counted today.</b>':'<b class="bad">Not counted today.</b>'}</p>
<div class="card"><h3>Count now</h3>${tbl(['Account','#In the book','#Counted','#Difference'],ks.map((k,i)=>`<tr><td><b>${e(k)}</b></td><td class="r">${rs(b[k])}</td><td class="r"><input type="number" step="any" id="cc${i}" style="width:130px;text-align:right" oninput="ccDiff()"></td><td class="r" id="cd${i}">-</td></tr>`))}<label class="m" style="display:block;margin-top:10px">Reason for any difference<input id="ccn" style="width:100%" placeholder="Required if the count does not match"></label><div class="bar"><button class="b1" onclick="ccSave()">Save this count</button></div></div>
<div class="card"><h3>History</h3>${H.length?tbl(['Date','By','Result','Note'],H.slice(0,60).map(c=>{const bad=c.rows.filter(r=>Math.abs(r.diff)>0.005);return`<tr><td>${e(c.date)}<br><span class="m">${e(c.time||'')}</span></td><td>${e(c.u)}</td><td>${bad.length?bad.map(r=>`<div class="bad">${e(r.a)}: ${r.diff>0?'+':''}${rs(r.diff)} (book ${rs(r.book)}, counted ${rs(r.counted)})</div>`).join(''):'<span class="ok">Everything matched</span>'}</td><td>${e(c.note||'')}</td></tr>`})):'<p class="m">No counts yet.</p>'}</div>`};
function ccDiff(){const b=bals();Object.keys(b).forEach((k,i)=>{const el=document.getElementById('cc'+i),d=document.getElementById('cd'+i);if(!el||!d)return;if(el.value===''){d.textContent='-';d.className='r';return}const x=r2(+el.value-b[k]);d.textContent=Math.abs(x)<0.005?'Matches':(x>0?'+':'')+rs(x);d.className='r '+(Math.abs(x)<0.005?'ok':'bad')})}
function ccSave(){
  if(window.__ro)return toast('View-only access.');
  const b=bals(),rows=[];Object.keys(b).forEach((k,i)=>{const el=document.getElementById('cc'+i);if(el&&el.value!=='')rows.push({a:k,book:b[k],counted:+el.value,diff:r2(+el.value-b[k])})});
  if(!rows.length)return alert('Type the counted amount for at least one account.');
  const bad=rows.filter(r=>Math.abs(r.diff)>0.005),note=(document.getElementById('ccn').value||'').trim();
  if(bad.length&&!note)return alert('The count does not match the book. Please write the reason.');
  D.counts.push({id:uid(),date:today(),time:new Date().toTimeString().slice(0,5),u:(window.Me&&Me.email)||'local',rows,note});
  log('Cash count saved'+(bad.length?' with '+bad.length+' difference(s): '+note:': all matched'));
  if(bad.length&&confirm('Record the difference'+(bad.length>1?'s':'')+' in the cash book so the book matches the real money?\n\n'+bad.map(r=>r.a+': '+(r.diff>0?'+':'')+rs(r.diff)).join('\n')))bad.forEach(r=>cb(r.diff>0?'In':'Out',r.a,'Cash count difference: '+note,Math.abs(r.diff)));
  save();toast('Count saved');go()}
(window.__alertHooks=window.__alertHooks||[]).push(()=>{if(!['owner','manager'].includes(window.myRole?myRole():'owner'))return[];const t=today();return D.cash.some(c=>c.date===t)&&!D.counts.some(c=>c.date===t)?[['warn','Cash has not been counted today','cashcount']]:[]});
