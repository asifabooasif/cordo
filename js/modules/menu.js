/* Gem ERP :: modules/menu.js
   Structured navigation: grouped sidebar with icons and animated dropdown sections, a top bar with breadcrumb dropdowns,
   a New menu, the account/appearance menu, the Ctrl+K command palette, hub (overview) pages for every group,
   pinned and recent pages, and keyboard shortcuts. Replaces the flat sidebar list from earlier versions. */
const Menu=(function(){
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(x){return d}},SV=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(x){}};
NAV.push(['guardian','Guardian']);
const GROUPS=[
 {id:'home',n:'Home',d:'Your day at a glance',ic:'home',p:['dashboard','alerts','tasks','approvals']},
 {id:'inventory',n:'Inventory',d:'Stones, places, prices and certificates',ic:'gem',p:['stock','custody','pricing','certs','catalogue','stocktake','ageing','jobs','yield','memo']},
 {id:'trade',n:'Trade',d:'Buying, selling and customer requests',ic:'receipt',p:['purchases','sales','quotes','wants','reminders']},
 {id:'money',n:'Money',d:'Cash, banks, cheques and payments',ic:'wallet',p:['cash','cashcount','bankrec','recurring','cheques','collections','paycal','expenses']},
 {id:'insights',n:'Insights',d:'Reports, analytics and closing the books',ic:'bars',p:['analytics','salesteam','insights','trends','finrep','proof','daily','period','reports','suppliers','customers','insurance','closing']},
 {id:'people',n:'People',d:'Customers, suppliers, partners and files',ic:'users',p:['profile','parties','partners','docs']},
 {id:'system',n:'System',d:'Safety, backup, team and settings',ic:'shield',p:['guardian','check','quality','backup','import','team','system','audit','log','guide']}
];
const PD={dashboard:'Command Center with live numbers',alerts:'Everything that needs attention today',tasks:'Follow-ups for you and the team',approvals:'Requests waiting for a manager',
 stock:'Every stone with photos, prices and status',custody:'Where each stone is right now',pricing:'Market price check from your own sales',certs:'Lab reports and missing certificates',catalogue:'Customer catalogue to print or share',stocktake:'Count stock and scan barcodes',ageing:'Stones that have waited longest',jobs:'Rough stones out with cutters',yield:'Weight kept after cutting',memo:'Stones out on approval and memo in',
 purchases:'Buy stones and pay suppliers',sales:'Invoices, payments and returns',quotes:'Quotations and automatic follow-ups',wants:'What customers are looking for',reminders:'Overdue payments and WhatsApp reminders',
 cash:'Every rupee in and out',cashcount:'Count the till and match the book',bankrec:'Match the bank statement',recurring:'Rent, salaries and subscriptions',cheques:'Cheques received and issued',collections:'Money customers owe you',paycal:'What you owe and when',expenses:'Business spending by type',
 analytics:'Profit by customer, supplier and stone',salesteam:'Sales, targets and commission by person',insights:'Buying and pricing ideas',trends:'Sales and profit over time',finrep:'Profit and loss, balance sheet',proof:'Proves the books add up',daily:'Today in one page',period:'Any date range summarised',reports:'Printable business reports',suppliers:'Supplier balances and history',customers:'Who buys, who pays on time',insurance:'Stock valuation for insurers and banks',closing:'Lock a finished month',
 profile:'Everything about one customer',parties:'Customers and suppliers',partners:'Partner shares and statements',docs:'Bills, IDs, agreements and scans',
 guardian:'Live safety score and tamper checks',check:'Finds and fixes broken records',quality:'Missing photos, prices and phone numbers',backup:'Download and restore your data',import:'Bring stones and parties from Excel',team:'Who can sign in and what they see',system:'Restore points, storage and errors',audit:'Who changed what, and when',log:'Recent activity',guide:'How to use each page'};
const LAB=()=>Object.fromEntries(NAV);
const ok=k=>typeof pages[k]=='function'&&(typeof pageOK!='function'||pageOK(k));
const gOf=k=>GROUPS.find(g=>g.p.includes(k)||('hub-'+g.id)===k);
let open=LS('gem_menu3',{}),fav=LS('gem_fav',[]),rec=LS('gem_recent',[]),q='',cur='dashboard';
const root=document.documentElement;
/* ---- appearance settings ---- */
const dens=()=>LS('gem_density','comfortable'),mot=()=>LS('gem_motion','on');
function applyPrefs(){root.setAttribute('data-density',dens());root.setAttribute('data-motion',mot());document.body.classList.toggle('rail',!!LS('gem_rail',false))}
/* ---- dropdown panel (used by top bar, rail flyouts and menus) ---- */
const DD={el:null,show(a,html,o){o=o||{};DD.close();const d=document.createElement('div');d.className='dd '+(o.cls||'');d.innerHTML=html;document.body.appendChild(d);const r=a.getBoundingClientRect(),w=d.offsetWidth,h=d.offsetHeight;let x=o.side==='right'?r.right+8:o.align==='right'?r.right-w:r.left,y=o.side==='right'?r.top:r.bottom+8;x=Math.max(8,Math.min(x,innerWidth-w-8));y=Math.max(8,Math.min(y,innerHeight-h-8));d.style.left=x+'px';d.style.top=y+'px';DD.el=d;a.setAttribute('aria-expanded','true');DD.a=a;requestAnimationFrame(()=>d.classList.add('on'))},
 close(){if(DD.el){DD.el.remove();DD.el=null}if(DD.a){DD.a.removeAttribute('aria-expanded');DD.a=null}}};
document.addEventListener('mousedown',ev=>{if(DD.el&&!DD.el.contains(ev.target)&&!(DD.a&&DD.a.contains(ev.target)))DD.close()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')DD.close()});addEventListener('hashchange',()=>DD.close());addEventListener('resize',()=>DD.close());
const item=(k,o)=>`<button class="ddi ${k===cur?'on':''}" onclick="DD.close();location.hash='${k}'">${ic(k,18)}<span><b>${LAB()[k]||k}</b><small>${PD[k]||''}</small></span>${o||''}</button>`;
/* ---- sidebar ---- */
function badges(){const o={};try{o.alerts=alerts().length}catch(x){}try{o.approvals=typeof apprPend=='function'?apprPend().length:0}catch(x){}return o}
function navHtml3(k){
  const B=badges(),L=LAB(),ql=q.trim().toLowerCase(),match=x=>!ql||(L[x]+' '+(PD[x]||'')).toLowerCase().includes(ql);
  const bd=x=>B[x]?`<em class="bdg3 ${x==='alerts'?'r':''}">${B[x]}</em>`:'',
    it=x=>`<button class="mi ${x==k?'on':''}" onclick="location.hash='${x}'" title="${e(PD[x]||'')}">${ic(x,17)}<span>${L[x]}</span>${bd(x)}<i class="pn ${fav.includes(x)?'on':''}" onclick="event.stopPropagation();Menu.pin('${x}')" title="Pin to top">${ic('pin',13)}</i></button>`;
  let h='';
  const pins=fav.filter(x=>ok(x)&&match(x));if(pins.length)h+=`<div class="mg open pinned"><div class="mgl"><div><div class="mt">Pinned</div>${pins.map(it).join('')}</div></div></div>`;
  GROUPS.forEach(g=>{const ps=g.p.filter(x=>ok(x)&&match(x));if(!ps.length)return;const o=ql?true:open[g.id]===true||(open[g.id]===undefined&&(g.p.includes(k)||('hub-'+g.id)===k)),tot=g.p.reduce((a,x)=>a+(B[x]||0),0);
    h+=`<div class="mg ${o?'open':''}" data-g="${g.id}"><button class="mgh" onclick="Menu.tog('${g.id}',event)" title="${g.n}" aria-expanded="${o}">${ic(g.ic,19)}<span>${g.n}</span>${tot&&!o?`<em class="bdg3">${tot}</em>`:''}<i class="cv">${ic('down2',14)}</i></button><div class="mgl"><div><button class="mi ${'hub-'+g.id==k?'on':''}" onclick="location.hash='hub-${g.id}'">${ic('grid',17)}<span>Overview</span></button>${ps.map(it).join('')}</div></div></div>`});
  return h||'<p class="m" style="padding:12px">No menu item matches.</p>'}
/* ---- top bar ---- */
function crumb(k){const g=gOf(k),L=LAB(),hub=/^hub-/.test(k),name=hub?'Overview':k==='dashboard'?'Command Center':(L[k]||k);
  return`${g?`<button class="cr g" onclick="Menu.ddGroups(this)" aria-haspopup="true">${ic(g.ic,16)}<span>${g.n}</span>${ic('down2',13,'cv')}</button><span class="sl">/</span>`:''}<button class="cr p" onclick="Menu.ddPages(this)" aria-haspopup="true"><span>${e(name)}</span>${ic('down2',13,'cv')}</button>${!hub&&k!=='dashboard'?`<button class="pinb ${fav.includes(k)?'on':''}" onclick="Menu.pin('${k}')" title="${fav.includes(k)?'Unpin':'Pin to the top of the menu'}">${ic('pin',16)}</button>`:''}`}
function renderTop(k){const t=document.getElementById('top');if(!t)return;const c=document.getElementById('crumb');if(c)c.innerHTML=crumb(k);const u=document.getElementById('tuser');if(u){const em=(window.Me&&Me.email)||'',ini=(em||(D.co&&D.co.name)||'G').trim()[0].toUpperCase();u.innerHTML=`<button class="tuser" onclick="Menu.ddUser(this)" aria-label="Account and appearance" aria-haspopup="true">${e(ini)}</button>`}
  const gw=document.getElementById('gshw');if(gw&&typeof Guardian!='undefined')gw.innerHTML=Guardian.badgeHtml()}
/* ---- dropdowns ---- */
const QUICK=[['New sale','receipt','N',()=>saleForm()],['Buy a stone','cart','B',()=>buyForm()],['Add stone','gem','',()=>stoneForm()],['New quotation','quote','',()=>quoteForm()],['Add expense','down','E',()=>expForm()],['Record cheque','card','',()=>chqForm()],['Add party','users','P',()=>partyForm()],['Add task','tasks','',()=>taskForm()]];
function run(i){DD.close();try{QUICK[i][3]()}catch(x){toast('Could not open that form.')}}
const pageAllowed=g=>g.p.filter(ok);
const api={
 tog(id,ev){if(document.body.classList.contains('rail')&&innerWidth>800){const g=GROUPS.find(x=>x.id===id),a=ev.currentTarget;DD.show(a,`<div class="ddh">${ic(g.ic,18)}<b>${g.n}</b></div><button class="ddi" onclick="DD.close();location.hash='hub-${id}'">${ic('grid',18)}<span><b>Overview</b><small>${g.d}</small></span></button>${pageAllowed(g).map(x=>item(x)).join('')}`,{side:'right',cls:'fly'});return}
  const o=open[id]===true||(open[id]===undefined&&(()=>{const g=GROUPS.find(x=>x.id===id);return g.p.includes(cur)||('hub-'+id)===cur})());open[id]=!o;SV('gem_menu3',open);const el=document.querySelector('.mg[data-g="'+id+'"]');if(el){el.classList.toggle('open',!o);const b=el.querySelector('.mgh');if(b)b.setAttribute('aria-expanded',String(!o))}},
 pin(k){fav=fav.includes(k)?fav.filter(x=>x!==k):[k].concat(fav).slice(0,8);SV('gem_fav',fav);paintNav();renderTop(cur)},
 filter(v){q=v||'';paintNav()},
 rail(){const on=!document.body.classList.contains('rail');SV('gem_rail',on);document.body.classList.toggle('rail',on);DD.close()},
 ddGroups(a){DD.show(a,GROUPS.map(g=>`<button class="ddi ${gOf(cur)===g?'on':''}" onclick="DD.close();location.hash='hub-${g.id}'">${ic(g.ic,18)}<span><b>${g.n}</b><small>${g.d}</small></span></button>`).join(''),{cls:'wide'})},
 ddPages(a){const g=gOf(cur);if(!g)return;DD.show(a,`<button class="ddi ${cur==='hub-'+g.id?'on':''}" onclick="DD.close();location.hash='hub-${g.id}'">${ic('grid',18)}<span><b>${g.n} overview</b><small>${g.d}</small></span></button><div class="dds"></div>${pageAllowed(g).map(x=>item(x)).join('')}`,{cls:'wide'})},
 ddQuick(a){DD.show(a,`<div class="ddh"><b>Create new</b></div>${QUICK.map((x,i)=>`<button class="ddi" onclick="Menu.run(${i})">${ic(x[1],18)}<span><b>${x[0]}</b></span>${x[2]?`<kbd>${x[2]}</kbd>`:''}</button>`).join('')}`,{align:'right'})},
 run,
 ddUser(a){const em=(window.Me&&Me.email)||'',lk=[...document.querySelectorAll('.looks button')],ck=root.getAttribute('data-look');
  DD.show(a,`<div class="ddh"><b>${e(em||(D.co&&D.co.name)||'This device')}</b><small>${e((typeof ROLES!='undefined'&&ROLES[(window.Me&&Me.role)||'owner'])||'Owner')}</small></div><div class="dds"></div><div class="ddl">Look</div><div class="swr">${lk.map(b=>`<button class="sw ${b.dataset.k===ck?'on':''}" title="${e(b.title)}" style="--sw:${b.style.background||'#888'}" onclick="Menu.look('${b.dataset.k}')"></button>`).join('')}</div>
   <div class="ddl">Density</div><div class="seg"><button class="${dens()==='comfortable'?'on':''}" onclick="Menu.pref('gem_density','comfortable')">Comfortable</button><button class="${dens()==='compact'?'on':''}" onclick="Menu.pref('gem_density','compact')">Compact</button></div>
   <div class="ddl">Motion</div><div class="seg"><button class="${mot()==='on'?'on':''}" onclick="Menu.pref('gem_motion','on')">Animated</button><button class="${mot()==='off'?'on':''}" onclick="Menu.pref('gem_motion','off')">Reduced</button></div>
   <div class="dds"></div><button class="ddi" onclick="DD.close();Menu.rail()">${ic('menu',18)}<span><b>Collapse menu</b></span><kbd>[</kbd></button><button class="ddi" onclick="DD.close();lockNow()">${ic('lock',18)}<span><b>Lock screen</b></span></button><button class="ddi" onclick="DD.close();Menu.keys()">${ic('cmd',18)}<span><b>Keyboard shortcuts</b></span><kbd>?</kbd></button><button class="ddi" onclick="DD.close();Menu.welcome(true)">${ic('sparkle',18)}<span><b>What's new in v3</b></span></button><button class="ddi" onclick="DD.close();location.hash='guide'">${ic('help',18)}<span><b>User guide</b></span></button>${window.Me&&Me.local?'':`<button class="ddi" onclick="DD.close();Cloud.signOut()">${ic('power',18)}<span><b>Sign out</b></span></button>`}`,{align:'right',cls:'user'})},
 look(k){const b=document.querySelector('.looks button[data-k="'+k+'"]');if(b)b.click();document.querySelectorAll('.dd .sw').forEach(s=>s.classList.toggle('on',s.getAttribute('onclick').includes("'"+k+"'")))},
 pref(key,v){SV(key,v);applyPrefs();DD.close()},
 welcome,keys,hub};
function paintNav(){const n=document.getElementById('nav');if(n)n.innerHTML=navHtml3(cur)}
/* ---- hub (overview) pages ---- */
function hubStats(id){const A=x=>x||[],ins=A(D.stones).filter(s=>['In stock','Memo'].includes(s.status)),m=today().slice(0,7),ms=A(D.sales).filter(s=>s.date.startsWith(m)),
  rec=A(D.sales).reduce((a,s)=>a+saleTotal(s)-s.paid,0),pay=[...A(D.purchases),...A(D.jobs)].reduce((a,p)=>a+p.cost-p.paid,0),G=window.Guardian&&Guardian.last,
  F=(l,v,pre,dec)=>({l,v,pre:pre||'',dec:dec||0});
  switch(id){
   case'home':return[F('Alerts',(()=>{try{return alerts().length}catch(x){return 0}})()),F('Open tasks',A(D.tasks).filter(t=>t.st==='open').length),F('Waiting approval',typeof apprPend=='function'?apprPend().length:0),F('Guardian score',G?G.score:0)];
   case'inventory':return[F('Stones in stock',ins.length),F('Carats',ins.reduce((a,s)=>a+s.carats,0),'',2),F('Stock cost',ins.reduce((a,s)=>a+s.cost,0),'Rs '),F('On memo',A(D.stones).filter(s=>s.status==='Memo').length)];
   case'trade':return[F('Sales this month',ms.reduce((a,s)=>a+saleTotal(s),0),'Rs '),F('Invoices',ms.length),F('Open requests',A(D.wants).filter(w=>w.status==='Open').length),F('Customers owe',rec,'Rs ')];
   case'money':return[F('Cash + bank',Object.values(bals()).reduce((a,v)=>a+v,0),'Rs '),F('Cheques pending',A(D.chq).filter(c=>c.status==='Pending').length),F('To receive',rec,'Rs '),F('To pay',pay,'Rs ')];
   case'insights':return[F('Sales this month',ms.reduce((a,s)=>a+saleTotal(s),0),'Rs '),F('Gross profit',ms.reduce((a,s)=>a+saleTotal(s)-saleCost(s),0),'Rs '),F('Invoices all time',A(D.sales).length),F('Books locked to',0)];
   case'people':return[F('Customers',A(D.parties).filter(p=>p.type==='Customer').length),F('Suppliers',A(D.parties).filter(p=>p.type==='Supplier').length),F('Documents',A(D.docs).length),F('Partners',A(D.partners).length)];
   default:return[F('Guardian score',G?G.score:0),F('Restore points',0),F('Backup age (days)',typeof bkAge=='function'&&D.lastBackup?bkAge():0),F('Audit entries',A(D.log).length)]}}
function hub(id){const g=GROUPS.find(x=>x.id===id),L=LAB(),st=hubStats(id).filter(s=>!(s.l==='Books locked to')),B=badges();
  return`<div class="hubp"><div class="hub-hero" style="--gm:${({home:'#4f8cff',inventory:'#2bb6c9',trade:'#e9a23b',money:'#2fd6a0',insights:'#b779ff',people:'#ff6fae',system:'#7aa2ff'})[id]}">${Illus.banner(id,900,170)}<div class="hh-t"><span class="kick">${g.n}</span><h1>${g.d}</h1></div><div class="hh-g">${ic(g.ic,92)}</div></div>
  <div class="kp hubk">${st.map(s=>`<div class="k"><small>${s.l}</small><b data-count="${Math.round(s.v*100)/100}" data-pre="${s.pre}" data-dec="${s.dec}">${s.pre}${s.dec?(+s.v).toFixed(s.dec):Math.round(s.v).toLocaleString('en-LK')}</b></div>`).join('')}</div>
  <div class="tiles">${g.p.filter(ok).map(x=>`<button class="tile" onclick="location.hash='${x}'"><span class="ti">${ic(x,22)}</span><b>${L[x]}</b><small>${PD[x]||''}</small>${B[x]?`<em class="bdg3 ${x==='alerts'?'r':''}">${B[x]}</em>`:''}</button>`).join('')}</div></div>`}
GROUPS.forEach(g=>{pages['hub-'+g.id]=()=>hub(g.id)});
/* ---- command palette (Ctrl+K) ---- */
const ACT=[['New sale','receipt',()=>saleForm()],['Buy a stone','cart',()=>buyForm()],['Add stone','gem',()=>stoneForm()],['New quotation','quote',()=>quoteForm()],['Add expense','down',()=>expForm()],['Record cheque','card',()=>chqForm()],['Add party','users',()=>partyForm()],['Add task','tasks',()=>taskForm()],['Scan with Guardian','shield',()=>{location.hash='guardian';if(window.Guardian)Guardian.run()}],['Make restore point','db',()=>Guardian.snapNow()],['Lock screen','lock',()=>lockNow()],['Collapse or expand menu','menu',()=>Menu.rail()],['Keyboard shortcuts','cmd',()=>Menu.keys()]];
let pal=[];
function palRender(){const v=(document.getElementById('gq')||{}).value||'',ql=v.trim().toLowerCase(),L=LAB(),all=GROUPS.flatMap(g=>g.p.filter(ok).map(x=>({t:'page',k:x,n:L[x],d:PD[x]||'',g:g.n}))).concat(GROUPS.map(g=>({t:'page',k:'hub-'+g.id,n:g.n+' overview',d:g.d,g:g.n,ic:g.ic})));
  const sc=x=>{const s=(x.n+' '+(x.d||'')+' '+(x.g||'')).toLowerCase();if(!ql)return 1;const w=ql.split(/\s+/);if(!w.every(z=>s.includes(z)))return 0;return x.n.toLowerCase().startsWith(ql)?3:x.n.toLowerCase().includes(ql)?2:1};
  let P=[],A=[];
  if(!ql){const pins=fav.filter(ok).map(k=>all.find(x=>x.k===k)).filter(Boolean),rc=rec.filter(ok).map(k=>all.find(x=>x.k===k)).filter(Boolean).filter(x=>!fav.includes(x.k));P=[...pins.map(x=>Object.assign({tag:'Pinned'},x)),...rc.map(x=>Object.assign({tag:'Recent'},x))].slice(0,8);A=ACT.slice(0,8).map(a=>({t:'act',n:a[0],ic:a[1],f:a[2]}))}
  else{P=all.map(x=>[sc(x),x]).filter(z=>z[0]).sort((a,b)=>b[0]-a[0]).map(z=>z[1]).slice(0,9);A=ACT.filter(a=>a[0].toLowerCase().includes(ql)||ql.split(/\s+/).every(z=>a[0].toLowerCase().includes(z))).map(a=>({t:'act',n:a[0],ic:a[1],f:a[2]})).slice(0,5)}
  pal=[...P,...A];let i=0;const row=x=>`<button class="pi" data-i="${i++}" onclick="Menu.pick(${i-1})">${ic(x.t==='act'?x.ic:(x.ic||x.k),18)}<span><b>${e(x.n)}</b>${x.d?`<small>${e(x.d)}</small>`:''}</span>${x.tag?`<em>${x.tag}</em>`:x.t==='act'?'<em>Action</em>':`<em>${e(x.g||'')}</em>`}</button>`;
  const el=document.getElementById('pal');if(el)el.innerHTML=(P.length?`<div class="pl">${ql?'Pages':'Jump to'}</div>${P.map(row).join('')}`:'')+(A.length?`<div class="pl">Actions</div>${A.map(row).join('')}`:'')+(!P.length&&!A.length&&ql.length<2?'<p class="m" style="padding:10px 14px">Type to search pages, actions, stones, customers and invoices.</p>':'');
  const first=document.querySelector('#pal .pi');if(first)first.classList.add('sel');
  const gr=document.getElementById('gr');if(gr){if(ql.length>=2&&typeof gres=='function'){gres();if(pal.length&&/^\s*(Nothing found|Type at least)/i.test(gr.textContent))gr.innerHTML=''}else gr.innerHTML=''}}
function palOpen(){const d=$('#dlg');d.className='pal';d.innerHTML=`<div class="pbox"><div class="pin">${ic('search',20)}<input id="gq" autocomplete="off" placeholder="Search pages, actions, stones, customers, invoices…" aria-label="Search"><kbd>Esc</kbd></div><div id="pal"></div><div id="gr"></div></div>`;
  const inp=d.querySelector('#gq');inp.oninput=palRender;inp.onkeydown=ev=>{const L=[...d.querySelectorAll('#pal .pi')];if(!L.length)return;let s=L.findIndex(x=>x.classList.contains('sel'));if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();L[s]&&L[s].classList.remove('sel');s=(s+(ev.key==='ArrowDown'?1:-1)+L.length)%L.length;L[s].classList.add('sel');L[s].scrollIntoView({block:'nearest'})}else if(ev.key==='Enter'){ev.preventDefault();const t=L[s>=0?s:0];if(t)t.click()}};
  d.showModal();palRender();inp.focus()}
function pick(i){const x=pal[i];if(!x)return;const d=$('#dlg');d.close();if(x.t==='act'){try{x.f()}catch(z){toast('Could not do that.')}}else location.hash=x.k}
function keys(){const d=$('#dlg');d.innerHTML=`<h3>Keyboard shortcuts</h3><div class="kbl">${[['Ctrl K  or  /','Search and jump anywhere'],['N','New sale'],['B','Buy a stone'],['E','Add expense'],['P','Add party'],['G then D','Go to Command Center'],['G then S','Go to Stock'],['G then I','Go to Sales (invoices)'],['G then C','Go to Cash Book'],['G then G','Go to Guardian'],['[','Collapse or expand the menu'],['?','Show this list']].map(r=>`<div><kbd>${r[0]}</kbd><span>${r[1]}</span></div>`).join('')}</div><div class="dlgbar"><button onclick="dlg.close()">Close</button></div>`;d.showModal()}
/* ---- welcome ---- */
function welcome(force){if(!force&&(LS('gem_v3_seen',0)||D._seed||document.querySelector('dialog[open]')))return;SV('gem_v3_seen',1);const d=$('#dlg');d.className='';d.innerHTML=`<div class="wel"><div class="wl-art">${Illus.heroGem()}</div><h3>Welcome to version 3</h3><p class="m">A new look, a new menu and an internal Guardian watching your books.</p><div class="wl-g"><div>${ic('grid',22)}<b>Grouped menu</b><span>Seven groups, each with an overview page. Use the breadcrumb dropdowns at the top.</span></div><div>${ic('shield',22)}<b>Guardian</b><span>Scans for broken records, risky changes and gaps in your safety net, all day.</span></div><div>${ic('search',22)}<b>Ctrl K</b><span>Jump to any page, start any task, or find any stone or invoice.</span></div><div>${ic('sliders',22)}<b>Your look</b><span>Pick Nova or Aurora, compact rows, or reduced motion from the round button at the top right.</span></div></div><div class="dlgbar"><button onclick="dlg.close()">Close</button><button class="b1" onclick="dlg.close();location.hash='guardian'">See the Guardian</button></div></div>`;d.showModal()}
/* ---- keyboard ---- */
let gp=0;
document.addEventListener('keydown',ev=>{
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();ev.stopImmediatePropagation();palOpen();return}
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;const t=ev.target,tag=(t&&t.tagName)||'';
  if(/INPUT|TEXTAREA|SELECT/.test(tag)||(t&&t.isContentEditable)||document.querySelector('dialog[open]'))return;
  const k=ev.key;
  if(gp){gp=0;const m={d:'dashboard',s:'stock',i:'sales',c:'cash',g:'guardian',p:'purchases',q:'quotes',a:'alerts',t:'tasks'}[k.toLowerCase()];if(m){ev.preventDefault();location.hash=m}return}
  if(k==='g'){gp=1;setTimeout(()=>gp=0,900);return}
  if(k==='/'){ev.preventDefault();palOpen();return}if(k==='?'){ev.preventDefault();keys();return}if(k==='['){api.rail();return}
},true);
/* ---- after every page draw ---- */
function after(){
  cur=location.hash.slice(1)||'dashboard';if(!pages[cur]||!ok(cur))cur='dashboard';
  if(!/^hub-/.test(cur)&&cur!=='dashboard'){rec=[cur].concat(rec.filter(x=>x!==cur)).slice(0,6);SV('gem_recent',rec)}
  const br=document.querySelector('.brand');if(br)br.innerHTML=Illus.brandMark(26)+`<span class="bnm"><b>${e((D.co&&D.co.name)||'Gem ERP')}</b><small>Version ${typeof APP_VERSION!='undefined'?APP_VERSION:'3'}</small></span>`;
  paintNav();renderTop(cur);
  const lv=document.getElementById('live'),top=document.getElementById('top');if(lv&&top&&lv.parentNode!==top){const sl=document.getElementById('tuser');top.insertBefore(lv,sl)}
  document.title=(cur==='dashboard'?'Command Center':/^hub-/.test(cur)?(gOf(cur)||{}).n:(LAB()[cur]||'Gem ERP'))+' · '+((D.co&&D.co.name)||'Gem ERP');
  Viz.play(document.getElementById('pg'));
}
const _go=window.go;window.go=function(){const r=_go.apply(this,arguments);try{after()}catch(x){if(typeof logErr=='function')logErr('Menu: '+x.message)}return r};
window.gsearch=palOpen;window.Menu=api;
window.DD=DD;
document.getElementById('dlg').addEventListener('close',()=>{document.getElementById('dlg').className=''});
new MutationObserver(()=>{const g=document.querySelector('#gate .glogo');if(g&&!g.querySelector('.bm'))g.innerHTML=Illus.brandMark(60)}).observe(document.body,{childList:true,subtree:true});
applyPrefs();
Object.assign(api,{pick,palOpen,after});
return api;
})();
