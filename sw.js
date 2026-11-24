/* Gem ERP service worker.
   Makes the app open offline. VERSION and ASSETS are rewritten by tools/stamp-sw.js,
   so every change to a file gives a new cache and users get the update banner. */
const VERSION = 'gem-erp-0e496e9f63';
/* ASSETS:BEGIN */
const ASSETS = [
  './',
  'css/base.css',
  'css/documents.css',
  'css/overrides.css',
  'css/people.css',
  'css/quickadd.css',
  'css/themes.css',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'icons/maskable-512.png',
  'index.html',
  'js/core/access.js',
  'js/core/audit.js',
  'js/core/boot.js',
  'js/core/calc.js',
  'js/core/charts.js',
  'js/core/constants.js',
  'js/core/data.js',
  'js/core/firebase-config.js',
  'js/core/loader.js',
  'js/core/pwa.js',
  'js/core/router.js',
  'js/core/store.js',
  'js/core/syncutil.js',
  'js/core/ui.js',
  'js/core/utils.js',
  'js/core/xlsx.js',
  'js/modules/activity.js',
  'js/modules/ageing.js',
  'js/modules/alerts.js',
  'js/modules/analytics.js',
  'js/modules/approvals.js',
  'js/modules/audit.js',
  'js/modules/backup.js',
  'js/modules/bankrec.js',
  'js/modules/cash.js',
  'js/modules/cashcount.js',
  'js/modules/cheques.js',
  'js/modules/closing.js',
  'js/modules/cloud.js',
  'js/modules/collections.js',
  'js/modules/company.js',
  'js/modules/custody.js',
  'js/modules/customers.js',
  'js/modules/daily.js',
  'js/modules/dashboard.js',
  'js/modules/datacheck.js',
  'js/modules/docs.js',
  'js/modules/expenses.js',
  'js/modules/exportdocs.js',
  'js/modules/financial.js',
  'js/modules/gems.js',
  'js/modules/guide.js',
  'js/modules/importer.js',
  'js/modules/insights.js',
  'js/modules/insurance.js',
  'js/modules/jobs.js',
  'js/modules/live.js',
  'js/modules/lock.js',
  'js/modules/looks.js',
  'js/modules/memo.js',
  'js/modules/parties.js',
  'js/modules/partners.js',
  'js/modules/paycal.js',
  'js/modules/people.js',
  'js/modules/period.js',
  'js/modules/pricing.js',
  'js/modules/profile.js',
  'js/modules/proof.js',
  'js/modules/purchases.js',
  'js/modules/quality.js',
  'js/modules/quickadd.js',
  'js/modules/quotes.js',
  'js/modules/receipts.js',
  'js/modules/recurring.js',
  'js/modules/reminders.js',
  'js/modules/reports.js',
  'js/modules/requests.js',
  'js/modules/sales.js',
  'js/modules/salesteam.js',
  'js/modules/search.js',
  'js/modules/stock.js',
  'js/modules/stocktake.js',
  'js/modules/suppliers.js',
  'js/modules/system.js',
  'js/modules/tasks.js',
  'js/modules/trends.js',
  'manifest.webmanifest'
];
/* ASSETS:END */
const RUNTIME = 'gem-erp-runtime';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: try the network first, fall back to the saved copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Our own files: saved copy first, refreshed quietly in the background.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Fonts and other outside files: saved copy first, then network.
  e.respondWith(
    caches.open(RUNTIME).then(c =>
      c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      }).catch(() => hit))
    )
  );
});
