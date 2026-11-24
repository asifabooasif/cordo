/* Gem ERP :: core/calc.js
   Pure calculations (also tested by tools/test.js): median and the price advisor, which compares a stone with similar stones
   (same gem type, weight within about a third) that were sold in the last 18 months or are listed now. */
(function(g){
const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const BANDS=[['Under 1 ct',0,1],['1 to 2 ct',1,2],['2 to 3 ct',2,3],['3 to 5 ct',3,5],['5 ct and more',5,1e9]];
const inBand=(c,t)=>t.carats>0&&c>=t.carats*0.65&&c<=t.carats*1.35;
function advise(t,sold,listed,now){
  const d=new Date(now||Date.now());d.setMonth(d.getMonth()-18);const cs=d.toISOString().slice(0,10);
  const S=sold.filter(x=>x.type===t.type&&x.perCt>0&&(x.date||'')>=cs&&inBand(x.carats,t)).map(x=>x.perCt),
        L=listed.filter(x=>x.type===t.type&&x.perCt>0&&inBand(x.carats,t)).map(x=>x.perCt),o={nSold:S.length,nListed:L.length,medSold:median(S),minSold:S.length?Math.min(...S):0,maxSold:S.length?Math.max(...S):0,medListed:median(L)};
  o.basis=S.length>=3?'sold':L.length>=3?'listed':'';o.perCt=o.basis==='sold'?o.medSold:o.basis==='listed'?o.medListed:0;o.price=o.perCt*(t.carats||0);
  o.diffPct=o.perCt&&t.price&&t.carats?Math.round((t.price/t.carats/o.perCt-1)*100):null;return o}
/* Bank statement matching: pairs a statement line with a cash-book entry of the same signed amount within a few days. */
function matchBank(stmt,book,maxDays){
  maxDays=maxDays==null?5:maxDays;const used=new Set(),pairs=[],sUn=[],dd=(a,b)=>Math.abs(Date.parse(a)-Date.parse(b))/864e5;
  stmt.slice().sort((a,b)=>a.date<b.date?-1:1).forEach(s=>{let best=-1,bd=1e9;book.forEach((b,j)=>{if(used.has(j))return;if(Math.abs(b.amt-s.amt)>0.005)return;const d=dd(s.date,b.date);if(d<=maxDays&&d<bd){bd=d;best=j}});if(best>=0){used.add(best);pairs.push([s.i,book[best].i])}else sUn.push(s.i)});
  return{pairs,sUn,bUn:book.filter((b,j)=>!used.has(j)).map(b=>b.i)}}
const ON=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],TN=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const w3=n=>{let s='';if(n>=100){s+=ON[Math.floor(n/100)]+' hundred';n%=100;if(n)s+=' and '}if(n>=20){s+=TN[Math.floor(n/10)]+(n%10?'-'+ON[n%10]:'')}else if(n)s+=ON[n];return s};
function words(n){n=Math.floor(Math.abs(+n||0));if(n===0)return'zero';const u=[[1e9,'billion'],[1e6,'million'],[1e3,'thousand']];let s='';u.forEach(([v,l])=>{if(n>=v){s+=w3(Math.floor(n/v))+' '+l+' ';n%=v}});if(n)s+=(s&&n<100?'and ':'')+w3(n);return s.trim()}
function nextBirthday(b,today){const m=+b.slice(5,7),d=+b.slice(8,10),y=+today.slice(0,4),t=Date.parse(today);let dt=Date.UTC(y,m-1,d);if(dt<t)dt=Date.UTC(y+1,m-1,d);const x=new Date(dt);return{date:x.toISOString().slice(0,10),days:Math.round((dt-t)/864e5),age:x.getUTCFullYear()-(+b.slice(0,4))}}
const recurDue=(it,today)=>it.active!==false&&it.last!==today.slice(0,7)&&+today.slice(8,10)>=(+it.day||1);
g.GemCalc={median,advise,BANDS,inBand,matchBank,words,nextBirthday,recurDue};
if(typeof module!=='undefined')module.exports=g.GemCalc;
})(typeof window!=='undefined'?window:globalThis);
