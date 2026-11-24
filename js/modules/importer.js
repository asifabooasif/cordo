/* Gem ERP :: modules/importer.js
   Import Data: bring stones or parties in from an Excel (.xlsx) or CSV file. Columns are matched by heading, every row is checked,
   you see what will happen before anything is saved, and a restore point is made first. */
const IM={kind:'stones',head:[],rows:[],map:{},name:''};
const IMF={
  stones:[['code','Code (optional)',['code','stone code','ref','id']],['type','Gem type',['type','gem','gem type','stone','variety']],['shape','Shape',['shape','cut']],['carats','Carats',['carats','carat','ct','weight','cts']],['color','Color',['color','colour']],['origin','Origin',['origin','source','mine']],['treatment','Treatment',['treatment','heat','enhancement']],['lab','Lab',['lab','laboratory']],['cert','Certificate no.',['cert','certificate','certificate no','report no','report']],['rdate','Report date',['report date','rdate','cert date']],['clarity','Clarity',['clarity']],['dims','Size (mm)',['dims','size','dimensions','measurements']],['cost','Cost (Rs)',['cost','cost price','buying price','purchase price']],['price','Selling price (Rs)',['price','selling price','sale price','sell']],['supplier','Supplier name',['supplier','vendor','bought from']],['date','Date bought',['date','bought','purchase date','date bought']],['status','Status',['status']]],
  parties:[['name','Name',['name','party','customer','supplier','company']],['type','Type',['type','role','category']],['phone','Phone',['phone','mobile','tel','telephone','whatsapp']],['email','Email',['email','e-mail']],['limit','Credit limit (Rs)',['limit','credit limit']],['terms','Terms (days)',['terms','credit days','payment terms']]]};
/* ---- reading files ---- */
async function imZip(buf){
  const dv=new DataView(buf),u=new Uint8Array(buf);let e=buf.byteLength-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('This is not an Excel (.xlsx) file.');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const F={};
  for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)break;const method=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true),name=new TextDecoder().decode(u.subarray(p+46,p+46+nl)),ds=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true);F[name]={method,data:u.subarray(ds,ds+cs)};p+=46+nl+el+cl}
  return async name=>{const f=F[name];if(!f)return null;if(f.method===0)return new TextDecoder().decode(f.data);const st=new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new TextDecoder().decode(await new Response(st).arrayBuffer())}}
const imCol=r=>{let n=0;for(const c of r.replace(/\d/g,''))n=n*26+c.charCodeAt(0)-64;return n-1};
async function imXlsx(file){
  const get=await imZip(await file.arrayBuffer()),dp=new DOMParser(),parse=t=>dp.parseFromString(t,'application/xml');
  let sheet=null;const wb=await get('xl/workbook.xml'),rels=await get('xl/_rels/workbook.xml.rels');
  if(wb&&rels){const rid=(parse(wb).getElementsByTagName('sheet')[0]||{getAttribute(){return null}}).getAttribute('r:id'),rl=[...parse(rels).getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid);if(rl){let t=rl.getAttribute('Target');t=t.startsWith('/')?t.slice(1):'xl/'+t;sheet=await get(t)}}
  if(!sheet)sheet=await get('xl/worksheets/sheet1.xml');if(!sheet)throw new Error('No sheet found in this file.');
  const ss=[],sst=await get('xl/sharedStrings.xml');if(sst)[...parse(sst).getElementsByTagName('si')].forEach(si=>ss.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join('')));
  const rows=[];[...parse(sheet).getElementsByTagName('row')].forEach(r=>{const a=[];[...r.getElementsByTagName('c')].forEach(c=>{const ref=c.getAttribute('r')||'',t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0],i=imCol(ref);let val='';
    if(t==='s')val=v?ss[+v.textContent]||'':'';else if(t==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');else if(v)val=v.textContent;
    a[i<0?a.length:i]=val});for(let i=0;i<a.length;i++)if(a[i]===undefined)a[i]='';rows.push(a)});
  return rows}
async function imLoad(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  try{let rows;if(/\.xlsx$/i.test(f.name))rows=await imXlsx(f);else if(/\.csv$|\.txt$/i.test(f.name))rows=parseCSV(await f.text());else return alert('Please choose an .xlsx or .csv file. (Old .xls files: open in Excel and Save As .xlsx.)');
    rows=rows.filter(r=>r.some(c=>String(c).trim()!==''));if(rows.length<2)return alert('The file has no data rows.');
    IM.head=rows[0].map(x=>String(x).trim());IM.rows=rows.slice(1);IM.name=f.name;IM.map={};
    IMF[IM.kind].forEach(([k,l,syn])=>{const i=IM.head.findIndex(h=>syn.includes(h.toLowerCase())||h.toLowerCase()===l.toLowerCase());IM.map[k]=i});go()}
  catch(x){alert('Could not read the file: '+(x.message||x))}}
const imNum=v=>{const n=parseFloat(String(v).replace(/[, ]/g,'').replace(/^rs\.?/i,''));return isFinite(n)?n:NaN};
const imDate=v=>{v=String(v).trim();if(!v)return'';if(/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);if(/^\d{5}(\.\d+)?$/.test(v)){const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5);return d.toISOString().slice(0,10)}
  const m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(v);if(m){const y=m[3].length==2?'20'+m[3]:m[3];return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')}return''};
const imClean=v=>String(v==null?'':v).trim().replace(/[<>]/g,'');
function imCheck(){
  const g=(r,k)=>IM.map[k]>=0?imClean(r[IM.map[k]]):'',out=[],seen=new Set();
  IM.rows.forEach((r,i)=>{const o={},err=[],warn=[];
    if(IM.kind==='stones'){
      IMF.stones.forEach(([k])=>o[k]=g(r,k));
      const ca=imNum(o.carats);if(!(ca>0))err.push('Carats must be a number above 0');o.carats=ca;
      if(!o.type)err.push('Gem type is missing');else if(!TYPES.includes(o.type)){const t=TYPES.find(x=>x.toLowerCase()===o.type.toLowerCase());if(t)o.type=t;else{warn.push('Gem type "'+o.type+'" kept as typed')}}
      ['cost','price'].forEach(k=>{if(o[k]===''){o[k]=0}else{const n=imNum(o[k]);if(isNaN(n))err.push(k+' is not a number');else o[k]=n}});
      o.date=imDate(o.date)||today();o.rdate=imDate(o.rdate);
      const sh=SHAPES.find(x=>x.toLowerCase()===(o.shape||'').toLowerCase());o.shape=sh||o.shape||'Oval';if(o.shape&&!sh&&imClean(g(r,'shape')))warn.push('Shape "'+o.shape+'" kept as typed');
      o.treatment=o.treatment||'Natural unheated';
      o.status=['In stock','Memo'].find(x=>x.toLowerCase()===(o.status||'').toLowerCase())||'In stock';
      let c=(o.code||'').toUpperCase();if(c){if(D.stones.some(s=>s.code==c)||seen.has(c)){warn.push('Code '+c+' already exists: a new code is given');c=''}}o.code=c;if(c)seen.add(c);
    }else{
      IMF.parties.forEach(([k])=>o[k]=g(r,k));
      if(!o.name)err.push('Name is missing');
      const t=['Supplier','Customer','Cutter','Partner'].find(x=>x.toLowerCase()===(o.type||'').toLowerCase());if(o.type&&!t)warn.push('Type "'+o.type+'" becomes Customer');o.type=t||'Customer';
      if(D.parties.some(p=>p.name.toLowerCase()===o.name.toLowerCase()&&(p.phone||'')===(o.phone||'')))warn.push('Already in your parties: skipped');
      if(seen.has(o.name.toLowerCase()+'|'+o.phone))warn.push('Repeated in this file: skipped');seen.add(o.name.toLowerCase()+'|'+o.phone);
      o.limit=imNum(o.limit)||0;o.terms=imNum(o.terms)||0}
    out.push({i:i+2,o,err,warn,skip:warn.some(w=>/skipped/.test(w))})});
  return out}
pages.import=function(){
  const F=IMF[IM.kind],has=IM.rows.length>0,res=has?imCheck():[],ok=res.filter(r=>!r.err.length&&!r.skip),bad=res.filter(r=>r.err.length),skp=res.filter(r=>r.skip&&!r.err.length);
  return`<h1>Import Data</h1><p class="m" style="margin-bottom:10px">Bring stones or parties from Excel or CSV. Nothing is saved until you press Import.</p>
<div class="card"><div class="bar"><select onchange="IM.kind=this.value;IM.rows=[];IM.head=[];go()"><option value="stones" ${IM.kind=='stones'?'selected':''}>Stones (opening stock)</option><option value="parties" ${IM.kind=='parties'?'selected':''}>Parties (customers, suppliers…)</option></select><button onclick="imTemplate()">Download Excel template</button><label class="up b1" style="padding:6px 14px">Choose Excel / CSV file<input type="file" id="imf" accept=".xlsx,.csv,.txt" hidden onchange="imLoad(this)"></label></div>
<p class="m">${IM.kind=='stones'?'Stones imported here are added as opening stock. Purchases and the cash book are not affected.':'Parties already in your list (same name and phone) are skipped.'}</p></div>
${has?`<div class="card"><h3>1. Check the columns (${e(IM.name)})</h3><div class="g">${F.map(([k,l])=>`<label class="m">${l}<select onchange="IM.map['${k}']=+this.value;go()"><option value="-1">(not in my file)</option>${IM.head.map((h,i)=>`<option value="${i}" ${IM.map[k]===i?'selected':''}>${e(h||'Column '+(i+1))}</option>`).join('')}</select></label>`).join('')}</div></div>
<div class="kp"><div class="k"><small>Rows in file</small><b>${res.length}</b></div><div class="k"><small>Ready to import</small><b class="ok">${ok.length}</b></div><div class="k"><small>Skipped (already there)</small><b>${skp.length}</b></div><div class="k"><small>Problems (will not import)</small><b class="${bad.length?'bad':''}">${bad.length}</b></div></div>
<div class="card"><h3>2. Preview and problems</h3>${tbl(['Row',...F.slice(0,6).map(x=>x[1]),'Result'],res.slice(0,60).map(r=>`<tr><td>${r.i}</td>${F.slice(0,6).map(([k])=>`<td>${e(r.o[k]==null||r.o[k]===''?'':r.o[k])}</td>`).join('')}<td class="${r.err.length?'bad':r.warn.length?'':'ok'}">${r.err.length?e(r.err.join('; ')):r.warn.length?e(r.warn.join('; ')):'OK'}</td></tr>`))}${res.length>60?`<p class="m">Showing the first 60 rows. All ${res.length} are checked.</p>`:''}</div>
<div class="bar"><button class="b1" ${ok.length?'':'disabled'} onclick="imDo()">Import ${ok.length} ${IM.kind=='stones'?'stone(s)':'part'+(ok.length==1?'y':'ies')}</button><button onclick="IM.rows=[];IM.head=[];go()">Cancel</button></div>`:''}`};
async function imDo(){
  if(window.__ro)return alert('View-only access.');
  const ok=imCheck().filter(r=>!r.err.length&&!r.skip);if(!ok.length)return;
  if(!confirm('Import '+ok.length+' row(s)? A restore point is saved first, so you can undo this from System Health.'))return;
  await GemStore.Snap.take('Before import: '+IM.name);
  if(IM.kind==='stones'){ok.forEach(r=>{const o=r.o;let sup='';if(o.supplier){let p=D.parties.find(x=>x.name.toLowerCase()===o.supplier.toLowerCase());if(!p){p={id:uid(),name:o.supplier,type:'Supplier'};D.parties.push(p)}sup=p.id}
    const s={id:uid(),code:o.code||nextCode(),type:o.type,shape:o.shape,carats:o.carats,color:o.color,origin:o.origin,treatment:o.treatment,cert:o.cert,cost:o.cost,price:o.price,status:o.status,date:o.date};
    if(o.lab)s.lab=o.lab;if(o.rdate)s.rdate=o.rdate;if(o.clarity)s.clarity=o.clarity;if(o.dims)s.dims=o.dims;if(sup)s.supplier=sup;D.stones.push(s)})}
  else ok.forEach(r=>{const o=r.o,p={id:uid(),name:o.name,type:o.type};if(o.phone)p.phone=o.phone;if(o.email)p.email=o.email;if(o.limit)p.limit=o.limit;if(o.terms)p.terms=o.terms;D.parties.push(p)});
  log('Imported '+ok.length+' '+IM.kind+' from '+IM.name);save();IM.rows=[];IM.head=[];alert(ok.length+' imported.');go()}
function imTemplate(){
  const F=IMF[IM.kind],s=IM.kind==='stones'?[['','Blue Sapphire','Oval',3.2,'Blue','Ratnapura','Natural unheated','GIA','GIA-1234567','2026-01-15','VS','9.1 x 7.0 x 4.8',450000,780000,'Sample Supplier','2026-01-10','In stock']]:[['Sample Customer','Customer','077 123 4567','name@example.com',500000,30]];
  xlsSave((IM.kind==='stones'?'stones':'parties')+'-import-template.xlsx',[{name:'Import',rows:[F.map(x=>x[1]),...s]}])}
