/* Gem ERP :: modules/quality.js
   Data Quality: how complete your records are (photos, certificates, prices, places, phone numbers) with the exact items to fix. */
function qData(){
  const live=D.stones.filter(s=>['In stock','Memo'].includes(s.status)&&s.shape!=='Rough'&&s.shape!=='Parcel'),cust=D.parties.filter(p=>p.type==='Customer'&&D.sales.some(s=>s.party===p.id)),
    sets=[['Stones without a photo',live.filter(s=>!s.photo),s=>`<button class="sm" onclick="stoneView('${s.id}')">Open</button>`,s=>s.code+' '+s.type],
          ['Stones without a certificate number',live.filter(s=>!s.cert&&s.lab!=='No report'),s=>`<button class="sm" onclick="stoneView('${s.id}')">Open</button>`,s=>s.code+' '+s.type],
          ['Stones without a selling price',live.filter(s=>!(s.price>0)),s=>`<button class="sm" onclick="stoneView('${s.id}')">Open</button>`,s=>s.code+' '+s.type],
          ['Stones with no location',live.filter(s=>!s.loc),s=>`<button class="sm" onclick="moveForm(['${s.id}'])">Set place</button>`,s=>s.code+' '+s.type],
          ['Customers (who bought) with no phone number',cust.filter(p=>!p.phone),p=>`<button class="sm" onclick="partyForm('${p.id}')">Edit</button>`,p=>p.name]];
  const dup={};D.parties.forEach(p=>{const k=(p.phone||'').replace(/\D/g,'').slice(-9);if(k.length>=7)(dup[k]=dup[k]||[]).push(p)});
  const dups=Object.values(dup).filter(a=>a.length>1);
  const pc=(n,t)=>t?Math.round((t-n)/t*100):100,tot=live.length,sc=[pc(sets[0][1].length,tot),pc(sets[1][1].length,tot),pc(sets[2][1].length,tot),pc(sets[3][1].length,tot),pc(sets[4][1].length,cust.length)],score=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
  return{sets,dups,sc,score,tot,nc:cust.length}}
pages.quality=function(){
  const q=qData(),col=q.score>=90?'ok':q.score>=70?'':'bad',names=['Photos','Certificates','Prices','Places','Phone numbers'];
  return`<h1>Data Quality</h1><p class="m" style="margin-bottom:10px">Complete records sell faster and make every report more reliable. Fix the items below and the score rises.</p><div class="kp"><div class="k"><small>Overall score</small><b class="${col}">${q.score}%</b></div>${q.sc.map((v,i)=>`<div class="k"><small>${names[i]}</small><b class="${v>=90?'ok':v>=70?'':'bad'}">${v}%</b></div>`).join('')}</div>
${q.sets.map(([t,L,btn,lab])=>`<div class="card"><h3>${t} (${L.length})</h3>${L.length?tbl(['Item',''],L.slice(0,15).map(x=>`<tr><td>${e(lab(x))}</td><td>${btn(x)}</td></tr>`))+(L.length>15?`<p class="m">…and ${L.length-15} more.</p>`:''):'<p class="ok">All complete.</p>'}</div>`).join('')}
<div class="card"><h3>Possible duplicate parties (${q.dups.length})</h3>${q.dups.length?tbl(['Same phone number','People'],q.dups.slice(0,15).map(a=>`<tr><td>${e(a[0].phone)}</td><td>${a.map(p=>e(p.name)+' ('+e(p.type)+')').join(' / ')}</td></tr>`)):'<p class="ok">No duplicates found.</p>'}</div>`};
