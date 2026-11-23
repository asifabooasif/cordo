/* Gem ERP :: core/utils.js
   Tiny helpers used everywhere: DOM lookup, today, HTML escaping, ids, money and carat formatting. */
const $=s=>document.querySelector(s),K='gem_erp_v1',today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9),rs=n=>'Rs '+Math.round(n||0).toLocaleString('en-LK'),ct=n=>(+n||0).toFixed(2);
const usd=n=>'$ '+Math.round(n/(D.rate||300)).toLocaleString('en-US');
const usd2=n=>'$ '+(n/(D.rate||300)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
