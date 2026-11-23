/* Gem ERP :: core/xlsx.js
   Builds a real Excel (.xlsx) file in the browser with no library.  makeXlsx([{name, rows:[[...],...]}]) returns a Blob.
   The first row of each sheet is the heading (bold, shaded). */
(function(g){
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const enc=s=>new TextEncoder().encode(s);
function zip(files){
  const parts=[],cen=[];let off=0;
  const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  files.forEach(f=>{
    const nm=enc(f.name),d=f.data,crc=crc32(d);
    const lh=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)]);
    parts.push(lh,nm,d);
    cen.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=lh.length+nm.length+d.length});
  const cs=cen.reduce((a,b)=>a+b.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cs),...u32(off),...u16(0)]);
  return new Blob([...parts,...cen,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
const X=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const col=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
function sheetXml(rows){
  const w=[];rows.forEach(r=>r.forEach((v,i)=>{const l=String(v==null?'':v).length;w[i]=Math.max(w[i]||8,Math.min(60,l+2))}));
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+w.map((n,i)=>`<col min="${i+1}" max="${i+1}" width="${n}" customWidth="1"/>`).join('')+'</cols><sheetData>';
  rows.forEach((r,ri)=>{x+=`<row r="${ri+1}">`+r.map((v,ci)=>{const ref=col(ci)+(ri+1),s=ri===0?' s="1"':'';
    if(typeof v==='number'&&isFinite(v))return`<c r="${ref}"${s}><v>${v}</v></c>`;
    if(v==null||v==='')return`<c r="${ref}"${s}/>`;
    return`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`}).join('')+'</row>'});
  return x+'</sheetData></worksheet>'}
function makeXlsx(sheets){
  const names=sheets.map((s,i)=>String(s.name||'Sheet'+(i+1)).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31)||'Sheet'+(i+1));
  const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files=[
    {name:'[Content_Types].xml',data:enc(H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>')},
    {name:'_rels/.rels',data:enc(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:'xl/workbook.xml',data:enc(H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((n,i)=>`<sheet name="${X(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>')},
    {name:'xl/_rels/workbook.xml.rels',data:enc(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:'xl/styles.xml',data:enc(H+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFE6D2"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')}
  ].concat(sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:enc(sheetXml(s.rows))})));
  return zip(files)}
g.makeXlsx=makeXlsx;g.__xlsxZip=zip;
if(typeof module!=='undefined')module.exports={makeXlsx};
})(typeof window!=='undefined'?window:globalThis);
