/* Gem ERP :: modules/quickadd.js
   Quick add button and keyboard shortcuts. */
/* ---- quick add and shortcuts ---- */
(function(){
const A=[['New sale','N',()=>saleForm()],['Buy stone','B',()=>buyForm()],['Add expense','E',()=>expForm()],['Add party','P',()=>partyForm()],['Search','Ctrl K',()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}))]];
const q=document.createElement('div');q.className='qa noprint';
q.innerHTML='<div class="qm">'+A.map((a,i)=>'<button data-i="'+i+'">'+a[0]+'<kbd>'+a[1]+'</kbd></button>').join('')+'</div><button class="qb" aria-label="Quick add" title="Quick add">+</button>';
document.body.appendChild(q);
const close=()=>q.classList.remove('o');
q.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.i!=null){close();try{A[b.dataset.i][2]()}catch(x){alert('Could not open that form.')}}else q.classList.toggle('o')};
document.addEventListener('click',ev=>{if(!q.contains(ev.target))close()});
document.addEventListener('keydown',ev=>{
if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
if(ev.key=='Escape'){close();return}
const t=ev.target,tag=(t&&t.tagName)||'';
if(/INPUT|TEXTAREA|SELECT/.test(tag)||(t&&t.isContentEditable)||document.querySelector('dialog[open]'))return;
const k=String(ev.key).toUpperCase(),a=A.find(x=>x[1]==k);
if(a){ev.preventDefault();try{a[2]()}catch(x){}}
});
})();
