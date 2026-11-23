/* Gem ERP :: js/core/boot.js
   Last script to load. Starts sign-in and sync, then the router and the service worker. */
addEventListener('hashchange',()=>{if(window.__entered)go()});
registerSW();
Cloud.start().then(()=>{
  go();
  if(typeof maybeOnboard=='function')maybeOnboard();
  GemStore.Snap.auto().catch(()=>{});
  Cloud.pill();
});
