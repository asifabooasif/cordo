# Gem ERP 2.0

Stock, purchases, sales, memo, cutting jobs, cash book, reports and now cloud sync for a gem business.
Runs in the browser, works offline, installs on a phone. No build step.

## What is new in 2.0
- **Safe storage**: data lives in IndexedDB (no 5 MB limit), photos in their own store, a restore point every day (System Health).
- **Google sign-in + Firebase sync** across phone and computer, offline-first, with merge of records added at the same time.
- **Roles**: Owner, Manager, Sales staff, Accountant (view only); discount approval limit for sales staff.
- **Gem features**: up to 6 photos per stone with zoom, certificate PDF/picture, Certificates register, customer Catalogue
  (HTML/print/WhatsApp), multi-currency (USD, EUR, GBP, THB, AED) for catalogue and export documents, optional tax line.
- **Reports**: Analytics (date filters, profit by customer/supplier/gem/stone), Excel downloads, Cutting Yield, shareable summary.
- **Other**: camera barcode scanning in Stock Take (Chrome), first-run setup, new looks (Linen, Mocha, Midnight),
  money rounding, duplicate invoice number check with one-click fixes, problem log, automatic tests.

## One-time Firebase setup (project `cordo-gem`)
1. **Authentication** > Get started > Sign-in method > enable **Google**.
2. Authentication > Settings > **Authorised domains** > add your GitHub Pages domain (for example `yourname.github.io`).
3. **Firestore Database** > Create database (production mode, region near you).
4. Open `firestore.rules`, replace `OWNER_EMAIL_HERE` with the owner's Google email (lower case), then copy the whole file into
   Firestore > Rules > **Publish**.
5. Deploy the site (push to `main`; the workflow publishes it). Open it, sign in with the owner's Google account.
   The first sign-in creates the company and makes that person the Owner.
6. Owner: open **Team & Access** and add colleagues (their Google email + role).
7. When everyone can sign in, set `allowLocal:false` in `js/core/firebase-config.js` to remove the "work on this device only" button.

Existing data: open the new version in the same browser you used before. It is moved automatically into the new database
(a copy is kept as a restore point), and uploaded to the cloud after the owner signs in.

## How sync works
Each collection (stones, sales, cash ...) is stored in Firestore as one or more documents under `companies/main/data`;
photos and files are stored once each under `media`. Every change is saved on the device first, then uploaded within seconds.
If two people change the same list at the same time, records added or removed by each person are merged; if both edit the
same record, the last device to sync wins that record. Use Data Check after busy days.

## Honest limits
- Role hiding (cost, profit pages) is done by the app. The cloud rules only separate read-only from can-edit; a Sales staff
  member with technical skill could read cost data from the browser. Do not give staff access you would not trust with the numbers.
- Scheduled messages (daily WhatsApp/email) need a server; this version creates the summary with one tap instead.
- Catalogues are files you send, not a public web link.
- Firestore usage is billed by reads/writes; a small team stays inside the free tier.

## Development
```
node tools/check-syntax.js   # syntax of every file
node tools/test.js           # money, sync merge, photo references, Excel file
node tools/stamp-sw.js       # refresh the offline file list before committing (CI does it too)
npx serve .                  # run locally
```
Scripts are loaded in the order listed in `index.html` (as `type="text/gem-script"`) by `js/core/loader.js`, after the local
database has been opened. New files: `core/{loader,syncutil,access,xlsx,firebase-config}.js`,
`modules/{cloud,gems,analytics,system}.js`, `css/themes.css`, `firestore.rules`.
