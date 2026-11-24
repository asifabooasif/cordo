/* Gem ERP :: modules/approvals.js
   Approval requests. Sales staff cannot cancel an invoice or record a customer return themselves: they send a request with a
   reason, and the owner or manager approves or rejects it. */
window.__approvalActions=window.__approvalActions||{};
const APPR_NAMES={cancelSale:'Cancel invoice',returnForm:'Customer return'};
function apprLabel(type,target){const s=D.sales.find(x=>x.id==target);return(APPR_NAMES[type]||type)+(s?' '+s.no+' ('+P(s.party)+', '+rs(saleTotal(s))+')':'')}
function apprAsk(type,target){
  if(D.appr.some(r=>r.type===type&&r.target===target&&r.st==='pending'))return alert('A request for this is already waiting for approval.');
  const why=prompt('Why is this needed? The manager will read this.\n\n'+apprLabel(type,target));if(why===null)return;
  if(!why.trim())return alert('Please give a reason.');
  D.appr.push({id:uid(),t:today()+' '+new Date().toTimeString().slice(0,5),by:(window.Me&&Me.email)||'local',type,target,label:apprLabel(type,target),why:why.trim(),st:'pending'});
  log('Approval requested: '+apprLabel(type,target));save();toast('Sent to the manager for approval.');if(location.hash==='#approvals')go()}
const apprMine=()=>(window.myRole&&myRole())==='staff'?D.appr.filter(r=>r.by===((window.Me&&Me.email)||'local')):D.appr;
const apprPend=()=>D.appr.filter(r=>r.st==='pending');
pages.approvals=function(){
  const boss=['owner','manager'].includes(myRole()),L=apprMine().slice().reverse(),P1=L.filter(r=>r.st==='pending'),H=L.filter(r=>r.st!=='pending');
  const tag=r=>`<span class="tag ${r.st=='approved'?'g':r.st=='rejected'?'r':'o'}">${r.st}</span>`;
  return`<h1>Approvals</h1><p class="m" style="margin-bottom:10px">${boss?'Requests from sales staff that need your decision.':'Your requests to the manager. You will see the answer here.'}</p>
<div class="card"><h3>Waiting (${P1.length})</h3>${P1.length?tbl(['Sent','From','Request','Reason',''],P1.map(r=>`<tr><td>${e(r.t)}</td><td>${e(r.by)}</td><td><b>${e(r.label)}</b></td><td>${e(r.why)}</td><td>${boss?`<button class="sm b1" onclick="apprDo('${r.id}')">Approve and do it</button> <button class="sm" onclick="apprNo('${r.id}')">Reject</button>`:'Waiting'}</td></tr>`)):'<p class="m">Nothing waiting.</p>'}</div>
<div class="card"><h3>Answered</h3>${H.length?tbl(['Sent','From','Request','Reason','Answer','By'],H.slice(0,100).map(r=>`<tr><td>${e(r.t)}</td><td>${e(r.by)}</td><td>${e(r.label)}</td><td>${e(r.why)}</td><td>${tag(r)}${r.note?' '+e(r.note):''}${boss&&r.st=='approved'?` <button class="sm" onclick="apprRun('${r.id}')">Open again</button>`:''}</td><td>${e(r.by2||'')}</td></tr>`)):'<p class="m">No answered requests yet.</p>'}</div>`};
function apprRun(id){const r=D.appr.find(x=>x.id==id),f=window.__approvalActions[r&&r.type];if(f)f(r.target)}
function apprDo(id){if(!['owner','manager'].includes(myRole()))return deny();const r=D.appr.find(x=>x.id==id);if(!r)return;
  r.st='approved';r.by2=(window.Me&&Me.email)||'local';r.t2=today();log('Approved: '+r.label+' (requested by '+r.by+')');save();go();setTimeout(()=>apprRun(id),50)}
function apprNo(id){if(!['owner','manager'].includes(myRole()))return deny();const r=D.appr.find(x=>x.id==id);if(!r)return;const n=prompt('Reason for rejecting (optional)');if(n===null)return;
  r.st='rejected';r.note=n;r.by2=(window.Me&&Me.email)||'local';r.t2=today();log('Rejected: '+r.label);save();go()}
