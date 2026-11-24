/* Automatic checks for the parts that must never break:  node tools/test.js */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');let pass=0;
const t=(n,f)=>{try{f();pass++;console.log('  ok  '+n)}catch(x){console.error('FAIL  '+n+'\n      '+x.message);process.exitCode=1}};
const S=require(path.join(root,'js/core/syncutil.js')),{makeXlsx}=require(path.join(root,'js/core/xlsx.js'));
/* money and balances: run the real data.js in a sandbox */
const sb={console,Math,Date,JSON,Object,Array,String,Number,document:{querySelector(){return null}},localStorage:{getItem(){return null}}};sb.window=sb;const ctx=vm.createContext(sb);
['js/core/utils.js','js/core/constants.js','js/core/data.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
vm.runInContext("let D={stones:[{id:'a',cost:100.1},{id:'b',cost:200.2}],sales:[],cash:[],parties:[],void:[],log:[],accts:['Cash']};",ctx);
const run=c=>vm.runInContext(c,ctx);
t('invoice total is rounded to cents',()=>assert.strictEqual(run("saleTotal({items:[{price:0.1},{price:0.2}],disc:0})"),0.3));
t('cost of stones sold adds exactly',()=>assert.strictEqual(run("saleCost({items:[{stone:'a'},{stone:'b'}]})"),300.3));
t('invoice numbers continue after cancelled ones',()=>{run("D.sales=[{no:'INV-0003'}];D.void=[{no:'INV-0007'}]");assert.strictEqual(run('invNo()'),'INV-0008')});
t('log entries carry id and user',()=>{run("window.Me={email:'x@y.z'};log('hello')");assert.strictEqual(run('D.log[0].u'),'x@y.z');assert.ok(run('D.log[0].id'))});
/* sync helpers */
t('photos become short references and come back',()=>{const st={},m=S.Media(st,()=>{}),big='data:image/png;base64,'+'A'.repeat(4000),j=m.ser({x:[{photo:big}]});assert.ok(j.length<100);const o=JSON.parse(j);m.hydrate(o);assert.strictEqual(o.x[0].photo,big)});
t('same photo stored once',()=>{const st={},m=S.Media(st,()=>{}),big='data:image/png;base64,'+'B'.repeat(4000);m.ser([{p:big},{p:big}]);assert.strictEqual(Object.keys(st).length,1)});
t('chunks rejoin and never split an emoji',()=>{const s='😀é'.repeat(100000),c=S.chunk(s,200000);assert.strictEqual(c.join(''),s);c.forEach(x=>assert.ok(!/[\uD800-\uDBFF]$/.test(x)));assert.ok(c.length>1)});
t('merge keeps both new records',()=>{const r=S.mergeArr(['1'],[{id:'1'},{id:'L'}],[{id:'1'},{id:'R'}],true).map(x=>x.id).sort();assert.deepStrictEqual(r,['1','L','R'])});
t('merge respects a delete made on this device',()=>{const r=S.mergeArr(['1','2'],[{id:'1'}],[{id:'1'},{id:'2'}],true).map(x=>x.id);assert.deepStrictEqual(r,['1'])});
t('merge respects a delete made on the other device',()=>{const r=S.mergeArr(['1','2'],[{id:'1'},{id:'2'}],[{id:'1'}],true).map(x=>x.id);assert.deepStrictEqual(r,['1'])});
t('local wins when both edited the same record',()=>{const r=S.mergeArr(['1'],[{id:'1',v:'mine'}],[{id:'1',v:'theirs'}],true);assert.strictEqual(r[0].v,'mine')});
/* audit trail */
const A=require(path.join(root,'js/core/audit.js'));
t('audit: edit shows old and new value',()=>{const r=A.diff('stones',JSON.stringify([{id:'1',code:'G1',price:100}]),JSON.stringify([{id:'1',code:'G1',price:150}]),'a@x',1);assert.strictEqual(r.length,1);assert.strictEqual(r[0].op,'edit');assert.deepStrictEqual([r[0].ch[0].f,r[0].ch[0].from,r[0].ch[0].to],['price','100','150']);assert.strictEqual(r[0].u,'a@x')});
t('audit: add and delete are recorded, delete keeps the old record',()=>{const r=A.diff('sales',JSON.stringify([{id:'1',no:'INV-1'}]),JSON.stringify([{id:'2',no:'INV-2'}]),'a@x',1);assert.deepStrictEqual(r.map(x=>x.op).sort(),['add','delete']);assert.ok(r.find(x=>x.op==='delete').ch[0].from.includes('INV-1'))});
t('audit: no change means no entry; photos are not dumped',()=>{assert.strictEqual(A.diff('stones','[{"id":"1"}]','[{"id":"1"}]','u',1).length,0);const r=A.diff('stones','[{"id":"1","photo":"@f:a"}]','[{"id":"1","photo":"@f:b"}]','u',1);assert.strictEqual(r[0].ch[0].to,'(file)')});
t('audit: a bulk import is one summary line',()=>{const n=Array.from({length:50},(_,i)=>({id:'x'+i}));const r=A.diff('stones','[]',JSON.stringify(n),'u',1);assert.strictEqual(r.length,1);assert.ok(r[0].l.includes('50'))});
t('audit: company details object shows field changes',()=>{const r=A.diff('co','{"name":"A","phone":"1"}','{"name":"B","phone":"1"}','u',1);assert.strictEqual(r[0].ch.length,1);assert.strictEqual(r[0].ch[0].f,'name')});
/* price advisor */
const C=require(path.join(root,'js/core/calc.js'));
t('median works for odd, even and empty lists',()=>{assert.strictEqual(C.median([3,1,2]),2);assert.strictEqual(C.median([1,2,3,10]),2.5);assert.strictEqual(C.median([]),0)});
t('advisor uses similar sold stones and ignores other gems and sizes',()=>{const now=Date.parse('2026-11-24'),sold=[{type:'Ruby',carats:2,perCt:1000,date:'2026-06-01'},{type:'Ruby',carats:2.2,perCt:1200,date:'2026-07-01'},{type:'Ruby',carats:1.9,perCt:1100,date:'2026-08-01'},{type:'Ruby',carats:9,perCt:9999,date:'2026-08-01'},{type:'Spinel',carats:2,perCt:1,date:'2026-08-01'},{type:'Ruby',carats:2,perCt:5000,date:'2020-01-01'}],a=C.advise({type:'Ruby',carats:2,price:4400},sold,[],now);assert.strictEqual(a.basis,'sold');assert.strictEqual(a.nSold,3);assert.strictEqual(a.medSold,1100);assert.strictEqual(a.price,2200);assert.strictEqual(a.diffPct,100)});
t('advisor says nothing when there are too few comparisons',()=>{const a=C.advise({type:'Ruby',carats:2,price:1},[{type:'Ruby',carats:2,perCt:1,date:'2026-06-01'}],[],Date.parse('2026-11-24'));assert.strictEqual(a.basis,'');assert.strictEqual(a.diffPct,null)});
t('bank matching pairs same amount within days and leaves the rest',()=>{const r=C.matchBank([{i:0,date:'2026-11-03',amt:5000},{i:1,date:'2026-11-04',amt:-200},{i:2,date:'2026-11-10',amt:5000}],[{i:'a',date:'2026-11-01',amt:5000},{i:'b',date:'2026-11-20',amt:5000},{i:'c',date:'2026-11-04',amt:-200},{i:'d',date:'2026-11-05',amt:777}],5);assert.deepStrictEqual(r.pairs.map(p=>p.join('>')).sort(),['0>a','1>c']);assert.deepStrictEqual(r.sUn,[2]);assert.deepStrictEqual(r.bUn.sort(),['b','d'])});
t('bank matching never uses one book entry twice',()=>{const r=C.matchBank([{i:0,date:'2026-11-03',amt:100},{i:1,date:'2026-11-03',amt:100}],[{i:'a',date:'2026-11-03',amt:100}],5);assert.strictEqual(r.pairs.length,1);assert.strictEqual(r.sUn.length,1)});
t('amount in words',()=>{assert.strictEqual(C.words(0),'zero');assert.strictEqual(C.words(21),'twenty-one');assert.strictEqual(C.words(105),'one hundred and five');assert.strictEqual(C.words(50000),'fifty thousand');assert.strictEqual(C.words(1250300),'one million two hundred and fifty thousand three hundred');assert.strictEqual(C.words(1000001),'one million and one')});
t('next birthday this year or next, with age',()=>{let r=C.nextBirthday('1980-12-25','2026-11-24');assert.deepStrictEqual([r.date,r.days,r.age],['2026-12-25',31,46]);r=C.nextBirthday('1990-03-01','2026-11-24');assert.deepStrictEqual([r.date,r.age],['2027-03-01',37]);r=C.nextBirthday('1990-11-24','2026-11-24');assert.strictEqual(r.days,0)});
t('recurring expense is due once a month from its day',()=>{assert.ok(C.recurDue({day:5,last:'2026-10'},'2026-11-05'));assert.ok(!C.recurDue({day:5,last:'2026-10'},'2026-11-04'));assert.ok(!C.recurDue({day:5,last:'2026-11'},'2026-11-20'));assert.ok(!C.recurDue({day:5,active:false},'2026-11-20'))});

/* Guardian */
const GG=require(path.join(root,'js/core/guard.js')),nodeSha=async t=>require('crypto').createHash('sha256').update(t).digest('hex');
const gbase=()=>({stones:[{id:'a',code:'G1',status:'Sold',cost:100,price:200},{id:'b',code:'G2',status:'In stock',cost:100,price:200}],sales:[{id:'s1',no:'INV-1',date:'2026-11-20',items:[{stone:'a',price:200}],disc:0,paid:200}],cash:[{acct:'Cash',type:'In',amt:200}],void:[],parties:[],purchases:[]});
const gscan=(D,x)=>GG.scan(Object.assign({D,now:Date.parse('2026-11-24T10:00:00Z'),audit:[],errors:[],snaps:[{at:'2026-11-24T08:00:00Z'}],env:{bkAge:1,usageP:5,pinSet:true}},x||{}));
t('guardian: clean books score 100',()=>{const r=gscan(gbase());assert.strictEqual(r.score,100);assert.strictEqual(r.level,'ok')});
t('guardian: finds a stone sold twice, duplicate invoice number and overpayment',()=>{const D=gbase();D.sales.push({id:'s2',no:'INV-1',date:'2026-11-21',items:[{stone:'a',price:200}],disc:0,paid:900});const ids=gscan(D).findings.map(f=>f.id);['double-sold','dup-invoice','overpaid'].forEach(i=>assert.ok(ids.includes(i),i))});
t('guardian: invoice pointing at a deleted stone is urgent',()=>{const D=gbase();D.sales[0].items[0].stone='gone';const f=gscan(D).findings.find(f=>f.id==='missing-stone');assert.strictEqual(f.sev,'bad')});
t('guardian: mass delete within an hour is urgent, spread-out deletes are not',()=>{const mk=(i,m)=>({op:'delete',u:'x@y',k:'stones',t:new Date(Date.parse('2026-11-23T10:00:00Z')+m*6e4).toISOString(),l:'s'+i});const A=Array.from({length:12},(_,i)=>mk(i,i));assert.ok(gscan(gbase(),{audit:A}).findings.some(f=>f.id==='mass-delete'));const B=Array.from({length:12},(_,i)=>mk(i,i*120));assert.ok(!gscan(gbase(),{audit:B}).findings.some(f=>f.id==='mass-delete'))});
t('guardian: old backup and missing restore points are flagged',()=>{const r=gscan(gbase(),{snaps:[],env:{bkAge:45,usageP:5,pinSet:true}});const ids=r.findings.map(f=>f.id);assert.ok(ids.includes('backup')&&ids.includes('restore-point'));assert.strictEqual(r.findings.find(f=>f.id==='backup').sev,'bad')});
t('guardian: score drops with urgent items and never goes below 0',()=>{const D=gbase();D.sales[0].items[0].stone='gone';D.sales[0].paid=9e9;const r=gscan(D,{snaps:[],env:{bkAge:60,usageP:95,pinSet:false}});assert.ok(r.score<70&&r.score>=0)});
(async()=>{
 const s1=await GG.seal(null,gbase(),Date.parse('2026-11-20'),nodeSha),s2=await GG.seal(s1,gbase(),Date.parse('2026-11-21'),nodeSha),s3=await GG.seal(s2,gbase(),Date.parse('2026-11-22'),nodeSha);
 t('seals: an intact chain verifies',()=>{});assert.deepStrictEqual((await GG.verifyChain([s1,s2,s3],nodeSha)).ok,true);
 const bad=JSON.parse(JSON.stringify([s1,s2,s3]));bad[1].m.salesTotal=1;const v=await GG.verifyChain(bad,nodeSha);
 t('seals: an edited seal breaks the chain',()=>{assert.strictEqual(v.ok,false);assert.strictEqual(v.at,1)});
 const rm=await GG.verifyChain([s1,s3],nodeSha);t('seals: a removed seal breaks the chain',()=>assert.strictEqual(rm.ok,false));
 const D=gbase();D.sales=[];t('seals: invoices that vanish since the last seal are reported, cancelled ones are not',()=>{assert.strictEqual(GG.drift(s1,D)[0].sev,'bad');const D2=gbase();D2.void=[D2.sales.pop()];assert.strictEqual(GG.drift(s1,D2).filter(x=>/invoice/.test(x.t)).length,0)});
 console.log(pass+' checks passed');
})();

/* Excel file */
(async()=>{const b=makeXlsx([{name:'A',rows:[['h'],[1]]}]),u=new Uint8Array(await b.arrayBuffer());
  t('Excel file starts with PK and ends with the directory record',()=>{assert.strictEqual(u[0],0x50);assert.strictEqual(u[1],0x4b);const end=u.length-22;assert.strictEqual(u[end],0x50);assert.strictEqual(u[end+2],5);assert.strictEqual(u[end+3],6)});
  console.log(process.exitCode?'\nSome checks FAILED':'\nAll '+pass+' checks passed');})();
