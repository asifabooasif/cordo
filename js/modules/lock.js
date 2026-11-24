/* Gem ERP :: modules/lock.js
   Screen lock with a PIN. Locks after a period without use, when the app is opened again, or on request. The PIN is kept only on
   this device (as a salted hash). It stops a casual person using an unattended phone or computer. */
(function(){
const KEY='gem_lock',get=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(x){return null}},put=v=>v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async(s,pin)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+':'+pin)));
let idleT=0,locked=false,fails=0,until=0,lastSeen=Date.now();
function arm(){clearTimeout(idleT);const c=get();if(!c||!c.m||locked)return;idleT=setTimeout(lock,c.m*60000)}
function lock(){
  const c=get();if(!c||locked)return;locked=true;clearTimeout(idleT);try{document.getElementById('dlg').close()}catch(x){}
  let o=document.getElementById('lockscr');if(!o){o=document.createElement('div');o.id='lockscr';o.className='noprint';document.body.appendChild(o)}
  o.innerHTML=`<div class="gcard"><div class="glogo">🔒</div><h2>Locked</h2><p class="m">Enter your PIN to continue.</p><input id="lkp" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN" style="text-align:center;font-size:22px;letter-spacing:.3em;width:100%"><p class="bad" id="lkm"></p><button id="lkb" class="b1 big">Unlock</button><button id="lkf" class="link">Forgot PIN</button></div>`;o.className='on noprint';
  const inp=o.querySelector('#lkp'),msg=o.querySelector('#lkm');setTimeout(()=>inp.focus(),50);
  const go_=async()=>{if(Date.now()<until){msg.textContent='Wait '+Math.ceil((until-Date.now())/1000)+' seconds.';return}
    const ok=(await hash(c.s,inp.value))===c.h;if(ok){fails=0;locked=false;o.className='noprint';o.innerHTML='';arm()}else{fails++;inp.value='';msg.textContent='Wrong PIN.';if(fails>=5){until=Date.now()+30000;fails=0;msg.textContent='Too many tries. Wait 30 seconds.'}}};
  o.querySelector('#lkb').onclick=go_;inp.onkeydown=ev=>{if(ev.key==='Enter')go_()};
  o.querySelector('#lkf').onclick=()=>{if(typeof Cloud!=='undefined'&&Cloud.enabled&&window.Me&&!Me.local){if(confirm('Sign out and sign in with Google again? The PIN is removed.'))Cloud.signOut()}else if((prompt('Type RESET to remove the PIN on this device.')||'').trim()==='RESET'){put(null);locked=false;o.className='noprint';o.innerHTML=''}}}
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>addEventListener(ev,()=>{lastSeen=Date.now();if(!locked)arm()},{passive:true}));
document.addEventListener('visibilitychange',()=>{const c=get();if(!c)return;if(document.hidden)lastSeen=Date.now();else if(c.m&&Date.now()-lastSeen>c.m*60000)lock()});
window.lockNow=()=>{if(!get()){toast('Set a PIN first: System Health → Screen lock');location.hash='system';return}lock()};
window.lockInit=()=>{const c=get();if(c&&c.open)lock();else arm()};
window.lockCard=()=>{const c=get();return`<div class="card"><h3>Screen lock</h3><p class="m" style="margin-bottom:8px">${c?'A PIN is set on this device.':'Protect this device with a PIN.'} The lock is for this device only.</p><div class="bar"><input id="lkn" type="password" inputmode="numeric" maxlength="8" placeholder="New PIN (4 to 8 digits)" style="width:190px"><label class="m">Lock after <select id="lkm2">${[1,2,5,10,30,0].map(m=>`<option value="${m}" ${(c?c.m:5)==m?'selected':''}>${m?m+' min':'never (only on open)'}</option>`).join('')}</select> of no use</label><label class="m"><input type="checkbox" id="lko" ${!c||c.open?'checked':''}> ask for the PIN every time the app opens</label><button class="b1" onclick="lockSave()">${c?'Change PIN':'Set PIN'}</button>${c?'<button onclick="lockOff()">Remove PIN</button><button onclick="lockNow()">Lock now</button>':''}</div></div>`};
window.lockSave=async()=>{const pin=document.getElementById('lkn').value.trim();const c=get();if(!/^\d{4,8}$/.test(pin)){if(c&&!pin){put({...c,m:+document.getElementById('lkm2').value,open:document.getElementById('lko').checked});arm();toast('Saved');return go()}return alert('The PIN must be 4 to 8 digits.')}
  const s=Math.random().toString(36).slice(2)+Date.now().toString(36);put({s,h:await hash(s,pin),m:+document.getElementById('lkm2').value,open:document.getElementById('lko').checked});arm();toast('PIN saved');go()};
window.lockOff=()=>{if(confirm('Remove the PIN from this device?')){put(null);clearTimeout(idleT);toast('PIN removed');go()}};
})();
