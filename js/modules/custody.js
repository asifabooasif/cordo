/* Gem ERP :: modules/custody.js
   Stone locations and custody: where every stone is (safe, showroom, with a cutter, at a lab, with a customer), who moved it and
   when, plus tick-boxes and bulk actions on the stock list. */
const LOCDEF=['Safe','Showroom','Bank locker','With cutter','At lab','With customer (memo)','Other'],HOME=['Safe','Bank locker','Showroom'];
SF.push({k:'loc',l:'Location (where it is now)',o:['',...LOCDEF]});
const BULK=new Set(),CU={days:3};
const nowStamp=()=>today()+' '+new Date().toTimeString().slice(0,5),meMail=()=>(window.Me&&Me.email)||'local';
function moveForm(ids){
  ids=ids.filter(id=>D.stones.some(s=>s.id===id));if(!ids.length)return alert('Select at least one stone.');if(window.__ro)return toast('View-only access.');
  form('Move '+ids.length+' stone(s)',[{k:'to',l:'Move to',o:LOCDEF},{k:'note',l:'Note (who took it, why)'}],{},r=>{
    const codes=[];ids.forEach(id=>{const s=D.stones.find(x=>x.id===id);D.moves.push({id:uid(),t:nowStamp(),u:meMail(),stone:id,code:s.code,from:s.loc||'',to:r.to,note:r.note||''});s.loc=r.to;codes.push(s.code)});
    log('Moved '+codes.slice(0,12).join(', ')+(codes.length>12?' and '+(codes.length-12)+' more':'')+' to '+r.to+(r.note?' ('+r.note+')':''));BULK.clear()})}
const lastMove=id=>{for(let i=D.moves.length-1;i>=0;i--)if(D.moves[i].stone===id)return D.moves[i];return null};
const daysSince=t=>Math.floor((new Date(today()+'T00:00:00')-new Date(String(t).slice(0,10)+'T00:00:00'))/864e5);
function custodyOut(){return D.stones.filter(s=>['In stock','Memo'].includes(s.status)&&s.loc&&!HOME.includes(s.loc)).map(s=>{const m=lastMove(s.id);return{s,since:m?m.t:'',days:m?daysSince(m.t):null,who:m?m.u:''}}).filter(x=>x.days!=null&&x.days>=CU.days).sort((a,b)=>b.days-a.days)}
pages.custody=function(){
  const live=D.stones.filter(s=>['In stock','Memo'].includes(s.status)),G={};live.forEach(s=>{const k=s.loc||'Not set',g=G[k]=G[k]||{n:0,c:0,p:0,v:0};g.n++;g.c+=s.carats||0;g.p+=s.price||0;g.v+=s.cost||0});
  const out=custodyOut(),mv=D.moves.slice(-60).reverse(),locs=[...LOCDEF,'Not set'].filter(k=>G[k]);
  return`<h1>Custody</h1><p class="m" style="margin-bottom:10px">Where every stone is right now. Move stones from the stock list (tick them, then Move) or here.</p><div class="kp">${locs.map(k=>`<div class="k"><small>${e(k)}</small><b>${G[k].n} stones</b><small>${ct(G[k].c)} ct · ${rs(G[k].p)}</small></div>`).join('')||'<div class="k"><small>No locations recorded yet</small><b>-</b></div>'}</div>
<div class="card"><h3>Out of the safe for ${CU.days}+ days</h3><div class="bar"><label class="m">Show stones away for at least <input type="number" style="width:60px" value="${CU.days}" onchange="CU.days=+this.value||0;go()"> days</label></div>${out.length?tbl(['Stone','Gem','#Carats','Where','Since','#Days','Last moved by',''],out.map(x=>`<tr><td><b>${e(x.s.code)}</b></td><td>${e(x.s.type)}</td><td class="r">${ct(x.s.carats)}</td><td>${e(x.s.loc)}</td><td>${e(x.since)}</td><td class="r bad">${x.days}</td><td>${e(x.who)}</td><td><button class="sm" onclick="moveForm(['${x.s.id}'])">Move</button></td></tr>`)):'<p class="ok">Nothing is out for that long.</p>'}</div>
<div class="card"><h3>Stones by place</h3>${tbl(['Place','#Stones','#Carats','#Cost','#Selling value'],locs.map(k=>`<tr><td><b>${e(k)}</b></td><td class="r">${G[k].n}</td><td class="r">${ct(G[k].c)}</td><td class="r">${rs(G[k].v)}</td><td class="r">${rs(G[k].p)}</td></tr>`))}</div>
<div class="card"><h3>Recent movements</h3>${mv.length?tbl(['When','Who','Stone','From','To','Note'],mv.map(m=>`<tr><td>${e(m.t)}</td><td>${e(m.u)}</td><td><b>${e(m.code)}</b></td><td>${e(m.from||'-')}</td><td>${e(m.to)}</td><td>${e(m.note)}</td></tr>`)):'<p class="m">No movements yet.</p>'}</div>`};
(window.__alertHooks=window.__alertHooks||[]).push(()=>{const n=custodyOut().length;return n?[['warn',n+' stone(s) have been out of the safe for '+CU.days+'+ days','custody']]:[]});
/* ---- stock list: location filter, tick-boxes, bulk actions ---- */
const locOK=s=>{const f=document.getElementById('flc');return!f||!f.value||(f.value==='Not set'?!s.loc:s.loc===f.value)};
const bkIds=()=>[...BULK].filter(id=>D.stones.some(s=>s.id===id));
function bulkBar(){
  const tb=document.getElementById('tb');if(!tb)return;let b=document.getElementById('bkbar');if(!b){b=document.createElement('div');b.id='bkbar';b.className='bar';tb.before(b)}
  const n=bkIds().length,boss=['owner','manager'].includes(window.myRole?myRole():'owner');
  b.style.display=n?'':'none';b.innerHTML=n?`<b>${n} selected</b><button onclick="moveForm(bkIds())">Move</button><button onclick="printLabels(bkIds(),true)">Print labels</button><button onclick="bulkCat()">Add to catalogue</button><button onclick="bulkXls()">Excel</button>${boss?'<button onclick="bulkPrice()">Change price %</button>':''}<button onclick="BULK.clear();rows()">Clear</button>`:''}
let bkBusy=false;
function bulkInject(){
  if(bkBusy)return;const h=document.querySelector('#pg h1');if(!h||h.textContent!=='Gem Stock')return;
  const tb=document.getElementById('tb');if(!tb)return;
  if(!document.getElementById('flc')){const fs=document.getElementById('fs');if(fs){const s=document.createElement('select');s.id='flc';s.onchange=()=>rows();s.innerHTML='<option value="">All places</option>'+[...LOCDEF,'Not set'].map(k=>`<option>${k}</option>`).join('');fs.after(s)}}
  const t=tb.querySelector('table');if(!t||t.dataset.bk)return;bkBusy=true;t.dataset.bk='1';
  const hr=t.rows[0];if(hr){const th=document.createElement('th');th.innerHTML='<input type="checkbox" title="Select all shown" onchange="bulkAll(this.checked)">';hr.insertBefore(th,hr.cells[0])}
  [...t.rows].slice(1).forEach(r=>{const m=/stoneView\('([^']+)'\)/.exec(r.innerHTML),td=document.createElement('td');if(m)td.innerHTML=`<input type="checkbox" data-id="${m[1]}" ${BULK.has(m[1])?'checked':''} onchange="bulkTog('${m[1]}',this.checked)">`;r.insertBefore(td,r.cells[0])});
  bulkBar();bkBusy=false}
const pgEl2=document.getElementById('pg');if(pgEl2)new MutationObserver(bulkInject).observe(pgEl2,{childList:true,subtree:true});
function bulkTog(id,on){on?BULK.add(id):BULK.delete(id);bulkBar()}
function bulkAll(on){document.querySelectorAll('#tb input[data-id]').forEach(c=>{c.checked=on;on?BULK.add(c.dataset.id):BULK.delete(c.dataset.id)});bulkBar()}
function bulkCat(){bkIds().forEach(id=>CAT.sel.add(id));toast(bkIds().length+' stone(s) added to the catalogue list');BULK.clear();location.hash='catalogue'}
function bulkXls(){const L=bkIds().map(S),st=window.myRole&&myRole()==='staff';xlsSave('stones-'+today()+'.xlsx',[{name:'Stones',rows:[['Code','Gem','Shape','Carats','Color','Origin','Treatment','Lab','Certificate','Location','Price','Status'].concat(st?[]:['Cost']),...L.map(s=>[s.code,s.type,s.shape,+ct(s.carats),s.color||'',s.origin||'',s.treatment||'',s.lab||'',s.cert||'',s.loc||'',s.price||0,s.status].concat(st?[]:[s.cost||0]))]}])}
function bulkPrice(){
  if(!['owner','manager'].includes(myRole()))return deny();if(window.__ro)return toast('View-only access.');
  const L=bkIds().map(S).filter(s=>s.status!=='Sold');if(!L.length)return alert('Select stones that are not sold.');
  const v=prompt('Change the selling price of '+L.length+' stone(s) by what percent?\nExample: 5 raises prices 5%, -10 lowers them 10%.');if(v===null)return;const x=parseFloat(v);if(!isFinite(x)||Math.abs(x)>90)return alert('Enter a number between -90 and 90.');
  const ex=L[0],np=Math.round(ex.price*(1+x/100)/100)*100;if(!confirm('Change '+L.length+' price(s) by '+x+'%?\nExample: '+ex.code+' goes from '+rs(ex.price)+' to '+rs(np)+'.\n(Prices are rounded to the nearest Rs 100.)'))return;
  L.forEach(s=>{s.price=Math.round(s.price*(1+x/100)/100)*100});log('Bulk price change '+x+'% on '+L.length+' stone(s): '+L.slice(0,10).map(s=>s.code).join(', ')+(L.length>10?' …':''));BULK.clear();save();go()}
