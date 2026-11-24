/* Gem ERP :: core/access.js
   Roles and permissions. Owner and Manager see everything (only the Owner manages the team); Sales staff cannot open
   money, cost and profit pages and do not see cost columns; Accountant can look at everything but cannot change anything.
   Note: this controls what the app shows. The real lock on the cloud data is firestore.rules. */
const ROLES={owner:'Owner',manager:'Manager',staff:'Sales staff',accountant:'Accountant (view only)'};
(function(){
const BLOCK={
  staff:['finrep','proof','check','purchases','expenses','cheques','collections','paycal','cash','daily','period','reports','trends','closing','suppliers','customers','insights','partners','backup','log','team','analytics','yield','jobs','system','audit','import','cashcount','bankrec','salesteam','insurance','recurring'],
  manager:['team'],
  accountant:['import','team']
};
const role=()=>(window.Me&&Me.role)||'owner';
window.myRole=role;
window.pageOK=k=>!(BLOCK[role()]||[]).includes(k);
window.deny=()=>{alert('Your role ('+(ROLES[role()]||role())+') does not allow this.');return false};
window.applyRole=()=>{window.__ro=role()==='accountant';const c=document.body.classList;c.toggle('ro',window.__ro);['owner','manager','staff','accountant'].forEach(r=>c.toggle('role-'+r,role()===r))};
const SENS=/cost|profit|expense|cash|bank|net\b|margin|fee/i,SENS_CARD=/profit|expense|cash|payable|margin|target|cost/i;
function mask(root){
  if(!root||role()!=='staff')return;
  root.querySelectorAll('.k').forEach(c=>{if(SENS.test((c.querySelector('small')||c).textContent))c.remove()});
  root.querySelectorAll('.card').forEach(c=>{const h=c.querySelector('h3');if(h&&SENS_CARD.test(h.textContent))c.remove()});
  root.querySelectorAll('table').forEach(t=>{const r0=t.rows&&t.rows[0];if(!r0)return;[...r0.cells].forEach((th,i)=>{if(/^(cost|profit|margin|fee)\b/i.test(th.textContent.trim()))[...t.rows].forEach(r=>{if(r.cells[i])r.cells[i].style.display='none'})})});
}
window.afterRender=()=>{applyRole();mask(document.getElementById('pg'))};
const pgEl=document.getElementById('pg');if(pgEl)new MutationObserver(()=>mask(pgEl)).observe(pgEl,{childList:true,subtree:true});
const dlg=document.getElementById('dlg');if(dlg)new MutationObserver(()=>mask(dlg)).observe(dlg,{childList:true});
/* Functions that only some roles may run. */
function guard(name,roles){const f=window[name];if(typeof f!=='function')return;window[name]=function(...a){if(!roles.includes(role()))return deny();return f.apply(this,a)}}
['buyForm','expForm','jobForm','jobDone','minForm','minBuy','partnerForm','minRet'].forEach(n=>guard(n,['owner','manager']));
/* Cancel invoice and customer return: owner and manager act directly; sales staff send a request for approval. */
function guardAppr(name){const f=window[name];if(typeof f!=='function')return;window.__approvalActions=window.__approvalActions||{};window.__approvalActions[name]=f;
  window[name]=function(id){const r=role();if(r==='owner'||r==='manager')return f.apply(this,arguments);if(r==='staff')return window.apprAsk(name,id);return deny()}}
['cancelSale','returnForm'].forEach(guardAppr);
const _al=window.alerts;if(typeof _al==='function')window.alerts=function(){const a=_al.apply(this,arguments);const pend=(typeof apprPend==='function'?apprPend().length:0);if(pend&&(role()==='owner'||role()==='manager'))a.unshift(['warn',pend+' request(s) waiting for your approval','approvals']);(window.__alertHooks||[]).forEach(f=>{try{f().forEach(x=>a.push(x))}catch(x){}});return role()==='staff'?a.filter(x=>['stock','memo','wants','tasks','custody'].includes(x[2])):a};
/* View-only: forms and actions that change data are refused. */
const _form=window.form;
if(typeof _form==='function')window.form=function(...a){if(window.__ro){toast('View-only access.');return}return _form.apply(this,a)};
/* Approval rule: Sales staff can give a discount only up to the limit set by the owner (Backup → Settings). Managers and owners can give any. */
window.discOK=(items,disc)=>{
  if(role()!=='staff'||!(disc>0))return true;
  const sub=items.reduce((a,i)=>a+i.price,0),pct=sub?disc/sub*100:0,lim=D.discLimit==null?5:+D.discLimit;
  if(pct>lim+1e-9){alert('A discount of '+pct.toFixed(1)+'% needs a manager. Sales staff can give up to '+lim+'%.');return false}return true};
})();
