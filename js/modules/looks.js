/* Gem ERP :: modules/looks.js
   Colour looks and the sidebar look switcher. */
(function(){
const root=document.documentElement,LK=[['pearl','Pearl','#2a5bd7'],['sand','Sand','#c9a56a'],['jade','Jade','#0f8a68'],['linen','Linen','#b0763a'],['mocha','Mocha','#3a2f21'],['midnight','Midnight','#6ea0ff']];
let cur='pearl';try{cur=localStorage.getItem('gem_look')||'pearl'}catch(x){}
const setLook=k=>{cur=k;root.setAttribute('data-look',k);try{localStorage.setItem('gem_look',k)}catch(x){}document.querySelectorAll('.looks button').forEach(b=>b.classList.toggle('on',b.dataset.k==k))};
root.setAttribute('data-look',cur);
const sb=document.querySelector('.sb');if(sb){const d=document.createElement('div');d.className='looks';d.innerHTML='<span>Look</span>'+LK.map(l=>`<button title="${l[1]}" data-k="${l[0]}" style="background:${l[2]}" class="${l[0]==cur?'on':''}"></button>`).join('');d.onclick=ev=>{const b=ev.target.closest('button');if(b)setLook(b.dataset.k)};sb.appendChild(d)}
let GV=false;try{GV=localStorage.getItem('gem_gal')=='1'}catch(x){}
window.gallery=function(){const q=((document.querySelector('#q')||{}).value||'').toLowerCase(),f=(document.querySelector('#fs')||{}).value,t=today(),L=D.stones.filter(s=>(!f||s.status==f)&&(!q||[s.code,s.type,s.color,s.origin,s.cert,s.treatment].join(' ').toLowerCase().includes(q)));const o=document.querySelector('#tb');if(o)o.innerHTML=L.length?`<div class="gal">${L.map(s=>`<div class="gc" onclick="stoneView('${s.id}')"><div class="gp" style="--gm:${GC[s.type]||'#2a5bd7'}">${s.photo?`<img src="${s.photo}" alt="">`:`<svg viewBox="0 0 200 200">${gemSvg()}</svg>`}${st(s.status)}</div><b>${e(s.code)}</b><span>${e(s.type)} · ${ct(s.carats)} ct · ${e(s.shape||'')}</span><span>${e(s.color||'')}${s.cert?' · '+e(s.cert):''}</span><span class="gpr">${s.price?rs(s.price):'No price yet'}</span></div>`).join('')}</div>`:'<p class="m">No stones match.</p>'};
const _r=window.rows;if(typeof _r=='function')window.rows=function(){_r();if(GV)window.gallery()};
window.gvToggle=function(){GV=!GV;try{localStorage.setItem('gem_gal',GV?'1':'0')}catch(x){}const b=document.querySelector('.gvbtn');if(b)b.textContent=GV?'Table view':'Gallery view';window.rows&&window.rows()};
const pg=document.querySelector('#pg');
function addBtn(){if(!pg)return;const h=pg.querySelector('h1');if(!h||!/^Gem Stock/.test(h.textContent)||pg.querySelector('.gvbtn'))return;const bar=pg.querySelector('.bar');if(!bar)return;const b=document.createElement('button');b.className='gvbtn';b.textContent=GV?'Table view':'Gallery view';b.onclick=window.gvToggle;bar.appendChild(b);if(GV)window.rows()}
if(pg){new MutationObserver(addBtn).observe(pg,{childList:true});addBtn()}
})();
