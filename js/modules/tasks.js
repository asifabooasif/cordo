/* Gem ERP :: modules/tasks.js
   Tasks and follow-ups for the team: call a customer, chase a payment, collect a certificate. Each has a due date, can be given to
   a person and linked to a customer or supplier. Due tasks appear in Alerts. */
const TK={f:'mine'};
const tkMe=()=>(window.Me&&Me.email)||'local';
function taskForm(){
  if(window.__ro)return toast('View-only access.');
  form('New task or follow-up',[{k:'title',l:'What needs doing'},{k:'due',l:'Due date',t:'date'},{k:'to',l:'For (their email; blank = anyone)'},{k:'party',l:'About',o:[{v:'',t:'(nobody in particular)'},...D.parties.map(p=>({v:p.id,t:p.name}))]},{k:'note',l:'Note'}],{due:today()},r=>{
    if(!r.title.trim())return alert('Describe the task.'),false;
    D.tasks.push({id:uid(),title:r.title.trim(),due:r.due||today(),to:(r.to||'').trim().toLowerCase(),party:r.party||'',note:r.note||'',by:tkMe(),st:'open',t:today()});log('Task added: '+r.title.trim())})}
function taskDone(id,on){const t=D.tasks.find(x=>x.id===id);if(!t||window.__ro)return;t.st=on?'done':'open';t.doneBy=on?tkMe():'';t.doneAt=on?today():'';log('Task '+(on?'done':'reopened')+': '+t.title);save();go()}
function taskDel(id){const t=D.tasks.find(x=>x.id===id);if(!t)return;if(!(['owner','manager'].includes(myRole())||t.by===tkMe()))return deny();if(!confirm('Delete this task?'))return;D.tasks=D.tasks.filter(x=>x.id!==id);log('Task deleted: '+t.title);save();go()}
const tkMine=t=>!t.to||t.to===tkMe().toLowerCase();
pages.tasks=function(){
  const t=today(),open=D.tasks.filter(x=>x.st==='open'),L=(TK.f==='mine'?open.filter(tkMine):TK.f==='all'?open:D.tasks.filter(x=>x.st==='done').slice(-100)).slice().sort((a,b)=>TK.f==='done'?(a.doneAt<b.doneAt?1:-1):(a.due<b.due?-1:1)),od=open.filter(x=>x.due<t&&tkMine(x)).length;
  return`<h1>Tasks</h1><div class="kp"><div class="k"><small>Open for me</small><b>${open.filter(tkMine).length}</b></div><div class="k"><small>Overdue for me</small><b class="${od?'bad':''}">${od}</b></div><div class="k"><small>Open for everyone</small><b>${open.length}</b></div></div>
<div class="bar"><button class="b1" onclick="taskForm()">+ New task</button><select onchange="TK.f=this.value;go()">${[['mine','My open tasks'],['all','All open tasks'],['done','Done']].map(o=>`<option value="${o[0]}" ${TK.f==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
<label class="m" style="display:block;margin-bottom:8px"><input type="checkbox" ${D.noQuoteTask?'':'checked'} onchange="D.noQuoteTask=!this.checked;save()"> Create a follow-up task for every new quotation</label><div class="card">${L.length?tbl(['','Task','About','For','Due','Added by',''],L.map(x=>`<tr><td><input type="checkbox" ${x.st==='done'?'checked':''} onchange="taskDone('${x.id}',this.checked)"></td><td><b>${e(x.title)}</b>${x.note?'<br><span class="m">'+e(x.note)+'</span>':''}</td><td>${x.party?e(P(x.party)):'-'}</td><td>${e(x.to||'anyone')}</td><td class="${x.st==='open'&&x.due<t?'bad':x.due===t?'':'m'}">${e(x.due)}${x.st==='open'&&x.due<t?' (overdue)':''}</td><td>${e(x.by)}</td><td><button class="sm" onclick="taskDel('${x.id}')">Delete</button></td></tr>`)):'<p class="m">Nothing here. Add a task to remember a follow-up.</p>'}</div>`};
(window.__alertHooks=window.__alertHooks||[]).push(()=>{const t=today(),n=D.tasks.filter(x=>x.st==='open'&&x.due<=t&&tkMine(x)).length;return n?[['warn',n+' task(s) due today or overdue','tasks']]:[]});
