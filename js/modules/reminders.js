/* Gem ERP :: modules/reminders.js
   Reminders: customers who owe money, cheques due soon and memo stones due back, each with a ready message that opens straight in
   WhatsApp (or email). Remembers when each person was last reminded. */
const RM={days:7};
const remTpl=()=>D.msgTpl||'Dear {name},\n\nA friendly reminder from {company}: {items}.\nTotal balance: {amount}.{promise}\n\nPlease arrange the payment at your earliest convenience. Thank you.';
const waDigits=ph=>{let d=String(ph||'').replace(/\D/g,'');if(!d)return'';const cc=String(D.cc||'94').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d=cc+d.slice(1);else if(d.length<=9)d=cc+d;return d};
const waUrl=(ph,txt)=>'https://wa.me/'+waDigits(ph)+'?text='+encodeURIComponent(txt);
function remDebtors(){
  const t=today(),m={};colItems().filter(r=>r.k==='sales'&&r.age>=RM.days).forEach(r=>{const g=m[r.party]=m[r.party]||{party:r.party,due:0,age:0,inv:[],pr:[]};g.due+=r.due;g.age=Math.max(g.age,r.age);g.inv.push(r);r.pr.forEach(p=>g.pr.push(p))});
  return Object.values(m).sort((a,b)=>b.due-a.due)}
function remText(g){
  const p=D.parties.find(x=>x.id===g.party)||{},items=g.inv.map(r=>r.no+' ('+r.date+', '+rs(r.due)+')').join(', '),pr=g.pr.length?'\nYou kindly promised to pay by '+g.pr.map(x=>x.date).sort()[0]+'.':'';
  return remTpl().replace('{name}',p.name||'customer').replace('{company}',(D.co&&D.co.name)||'us').replace('{items}',items).replace('{amount}',rs(g.due)).replace('{promise}',pr)}
function remSend(id,how){
  const g=remDebtors().find(x=>x.party===id);if(!g)return;const p=D.parties.find(x=>x.id===id)||{},txt=remText(g);
  if(how==='wa'){if(!p.phone&&!confirm('No phone number saved for '+p.name+'. WhatsApp will ask you to choose the contact. Continue?'))return;open(waUrl(p.phone,txt),'_blank')}
  else if(how==='mail')open('mailto:'+(p.email||'')+'?subject='+encodeURIComponent('Payment reminder from '+((D.co&&D.co.name)||''))+'&body='+encodeURIComponent(txt));
  else shareTxt(txt);
  D.remind=D.remind||{};D.remind[id]=today();log('Reminder sent to '+p.name+' ('+how+')');save();setTimeout(go,300)}
pages.reminders=function(){
  const t=today(),L=remDebtors(),soon=addDays(t,7),chq=D.chq.filter(c=>c.status=='Pending'&&c.date<=soon).sort((a,b)=>a.date<b.date?-1:1),mem=D.memo.filter(m=>!m.closed&&m.due&&m.due<=soon).sort((a,b)=>a.due<b.due?-1:1),rd=D.remind||{};
  return`<h1>Reminders</h1><div class="kp"><div class="k"><small>Customers to remind</small><b class="${L.length?'bad':''}">${L.length}</b></div><div class="k"><small>Total they owe</small><b>${rs(L.reduce((a,g)=>a+g.due,0))}</b></div><div class="k"><small>Cheques due in 7 days</small><b>${chq.length}</b></div><div class="k"><small>Memo stones due back</small><b>${mem.length}</b></div></div>
<div class="card"><h3>Customers who owe money</h3><div class="bar"><label class="m">Invoices older than <input type="number" style="width:60px" value="${RM.days}" onchange="RM.days=+this.value||0;go()"> days</label><label class="m">Country code <input style="width:60px" value="${e(D.cc||'94')}" onchange="D.cc=this.value.replace(/\\D/g,'')||'94';save()"></label></div>
${L.length?tbl(['Customer','#Owes','#Oldest (days)','Invoices','Last reminded',''],L.map(g=>`<tr><td><b>${e(P(g.party))}</b><br><span class="m">${e((D.parties.find(x=>x.id===g.party)||{}).phone||'no phone')}</span></td><td class="r"><b>${rs(g.due)}</b></td><td class="r ${g.age>30?'bad':''}">${g.age}</td><td>${g.inv.map(r=>e(r.no)).join(', ')}</td><td>${rd[g.party]?e(rd[g.party]):'-'}</td><td><button class="sm b1" onclick="remSend('${g.party}','wa')">WhatsApp</button> <button class="sm" onclick="remSend('${g.party}','mail')">Email</button> <button class="sm" onclick="remSend('${g.party}','copy')">Copy</button></td></tr>`)):'<p class="ok">Nobody is overdue by that many days.</p>'}
<details style="margin-top:10px"><summary class="m">Edit the message</summary><textarea style="width:100%;min-height:120px" onchange="D.msgTpl=this.value;save()">${e(remTpl())}</textarea><p class="m">Use {name} {company} {items} {amount} {promise}. <a href="javascript:D.msgTpl='';save();go()">Reset message</a></p></details></div>
${bdCard()}<div class="card"><h3>Cheques due in the next 7 days</h3>${chq.length?tbl(['Date','Type','Party','#Amount'],chq.map(c=>`<tr><td class="${c.date<t?'bad':''}">${e(c.date)}</td><td>${e(c.type)}</td><td>${e(P(c.party))}</td><td class="r">${rs(c.amt)}</td></tr>`)):'<p class="m">None.</p>'}</div>
<div class="card"><h3>Memo stones due back</h3>${mem.length?tbl(['Memo','Customer','Due',''],mem.map(m=>{const p=D.parties.find(x=>x.id===m.party)||{},txt='Dear '+(p.name||'customer')+', the memo '+m.no+' from '+((D.co&&D.co.name)||'us')+' is due back by '+m.due+'. Please return the stones or let us know if you would like to buy them. Thank you.';return`<tr><td>${e(m.no)}</td><td>${e(p.name||'')}</td><td class="${m.due<t?'bad':''}">${e(m.due)}</td><td><button class="sm b1" onclick="open(waUrl('${e(p.phone||'')}',${e(JSON.stringify(txt)).replace(/'/g,'&#39;')}),'_blank')">WhatsApp</button></td></tr>`})):'<p class="m">None.</p>'}</div>`};

/* ---- birthdays ---- */
const bdTpl=()=>D.bdTpl||'Happy birthday {name}! Wishing you good health and a wonderful year ahead. With warm wishes from everyone at {company}.';
function bdList(days){return D.parties.filter(p=>p.bday&&p.type!=='Partner').map(p=>({p,...GemCalc.nextBirthday(p.bday,today())})).filter(x=>x.days<=days).sort((a,b)=>a.days-b.days)}
function bdCard(){const L=bdList(14);return`<div class="card"><h3>Birthdays in the next 14 days (${L.length})</h3>${L.length?tbl(['Date','Name','Turning',''],L.map(x=>`<tr><td class="${x.days===0?'ok':''}">${e(x.date)}${x.days===0?' (today)':' (in '+x.days+' days)'}</td><td><b>${e(x.p.name)}</b>${x.p.vip==='Yes'?' ⭐':''}</td><td>${x.age}</td><td><button class="sm b1" onclick="bdSend('${x.p.id}')">WhatsApp greeting</button></td></tr>`))+`<details style="margin-top:8px"><summary class="m">Edit the greeting</summary><textarea style="width:100%;min-height:70px" onchange="D.bdTpl=this.value;save()">${e(bdTpl())}</textarea><p class="m">Use {name} and {company}.</p></details>`:'<p class="m">No birthdays soon. Add birthdays in each customer (Parties → Edit).</p>'}</div>`}
function bdSend(id){const p=D.parties.find(x=>x.id===id);if(!p)return;open(waUrl(p.phone,bdTpl().replace('{name}',p.name).replace('{company}',(D.co&&D.co.name)||'us')),'_blank');log('Birthday greeting sent to '+p.name)}
(window.__alertHooks=window.__alertHooks||[]).push(()=>{const n=bdList(0).length;return n?[['info',n+' customer birthday(s) today','reminders']]:[]});
