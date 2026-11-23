/* Gem ERP :: modules/activity.js
   Activity log page. */
pages.log=function(){return`<h1>Activity Log</h1><div class="card">${tbl(['When','Who','What'],(D.log||[]).slice().reverse().slice(0,1000).map(x=>`<tr><td>${x.t}</td><td>${e(x.u||'')}</td><td>${e(x.m)}</td></tr>`))}</div><p class="m">Records cancelled invoices, stone changes and cheque actions. The Cash Book is the record of every money movement.</p>`};
