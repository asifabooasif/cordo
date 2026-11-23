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
/* Excel file */
(async()=>{const b=makeXlsx([{name:'A',rows:[['h'],[1]]}]),u=new Uint8Array(await b.arrayBuffer());
  t('Excel file starts with PK and ends with the directory record',()=>{assert.strictEqual(u[0],0x50);assert.strictEqual(u[1],0x4b);const end=u.length-22;assert.strictEqual(u[end],0x50);assert.strictEqual(u[end+2],5);assert.strictEqual(u[end+3],6)});
  console.log(process.exitCode?'\nSome checks FAILED':'\nAll '+pass+' checks passed');})();
