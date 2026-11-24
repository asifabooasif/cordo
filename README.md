# Gem ERP 2.0

Stock, purchases, sales, memo, cutting jobs, cash book, reports and now cloud sync for a gem business.
Runs in the browser, works offline, installs on a phone. No build step.

## Version 3.0

New files: `css/fonts.css`, `css/nova.css`, `css/screens.css`, `css/print.css`, the `fonts/` folder, `js/core/icons.js`, `illus.js`, `viz.js`, `guard.js`, and `js/modules/guardian.js`, `command.js`, `menu.js`.
Changed files: `index.html`, `sw.js`, `package.json`, `README.md`, `css/base.css`, `js/core/router.js`, `boot.js`, `access.js`, `js/modules/looks.js`, `stock.js`, `system.js`, `tools/test.js`.
`firestore.rules` did not change.

- **Nova and Aurora looks**, fonts stored inside the app, animated charts and illustrations.
- **Grouped menu** with dropdown sections, breadcrumb dropdowns, overview pages, pinned pages, a New menu, Ctrl+K command palette and keyboard shortcuts (press `?`).
- **Command Center** dashboard.
- **Guardian** (System → Guardian): 25 automatic checks, a 0-100 score, daily tamper-evident seals, and a restore point before bulk price changes.
- **Printing fix**: labels and documents no longer print on a grey page; label paper can be an A4 sheet or a one-label-per-page roll.

## What is new in 2.0
- **Safe storage**: data lives in IndexedDB (no 5 MB limit), photos in their own store, a restore point every day (System Health).
- **Google sign-in + Firebase sync** across phone and computer, offline-first, with merge of records added at the same time.
- **Roles**: Owner, Manager, Sales staff, Accountant (view only); discount approval limit for sales staff.
- **Gem features**: up to 6 photos per stone with zoom, certificate PDF/picture, Certificates register, customer Catalogue
  (HTML/print/WhatsApp), multi-currency (USD, EUR, GBP, THB, AED) for catalogue and export documents, optional tax line.
- **Reports**: Analytics (date filters, profit by customer/supplier/gem/stone), Excel downloads, Cutting Yield, shareable summary.
- **Other**: camera barcode scanning in Stock Take (Chrome), first-run setup, new looks (Linen, Mocha, Midnight),
  money rounding, duplicate invoice number check with one-click fixes, problem log, automatic tests.

## New in 2.4
- **Payment receipts**: numbered receipts (RC-0001…) with the amount in words, print or WhatsApp; payments are listed on each invoice.
- **Recurring expenses**: rent, salaries and subscriptions with a "due" alert and one-tap posting (never posted twice in a month).
- **Birthdays and VIP**: birthday and VIP fields on each party, a 14-day birthday list with WhatsApp greetings.
- **Commission** per salesperson on the Sales Team page (on profit or sales).
- **Data Quality**: completeness score with the exact stones and customers to fix, and duplicate-party detection.
- Search (Ctrl+K) also finds documents and tasks; every new quotation creates a follow-up task (switch on the Tasks page).

## New in 2.3
- **Documents**: cabinet for bills, customer ID scans, cheque copies and agreements, linked to a customer, stone or invoice (files sync like photos).
- **Customer Profile**: totals, profit, average days to pay, open memo/requests/tasks, notes and history on one page. Opens from the Parties and Analytics pages.
- **WhatsApp** buttons on invoices and quotations.
- **Bank Reconciliation**: Excel or CSV bank statement matched against the cash book; add missing lines; check the adjusted balance.
- **Sales Team**: sales, profit and discounts per person, monthly targets, discount watch (new invoices record who made them).
- **Valuation Schedule**: printable stock list with certificates, places and values for insurers, banks and auditors.

## New in 2.2
- **Custody**: stone locations (safe, showroom, bank locker, with cutter, at lab, with customer), movement log, warnings when stones stay out of the safe too long.
- **Stock list**: tick-boxes with bulk Move, Print labels, Add to catalogue, Excel and Change price %; location filter.
- **Price Advisor**: market price per carat from your last 18 months of sales, with a list of stones priced far from the market.
- **Tasks**: team follow-ups with due dates, people and customers; due tasks appear in Alerts.
- **Cash Count**: daily count against the cash book, reason required for any difference, optional posting of the difference.
- **Accountant Pack**: one Excel file (Analytics page) with sales, purchases, expenses, cash book, receivables and payables ageing, stock at cost and tax summary.

## New in 2.1
- **Audit Trail**: every add, change and delete with person, time, old and new value. Kept on each device and in the cloud
  (`audit` collection: can be created, never changed or deleted). Owner, Manager and Accountant can read it. Download to Excel.
- **Approvals**: sales staff request an invoice cancellation or customer return; owner/manager approves or rejects.
- **Import Data**: stones and parties from Excel or CSV, with column matching, checks, preview and an automatic restore point.
- **Reminders**: overdue customers, cheques and memo returns with ready WhatsApp / email messages.
- **Screen lock**: PIN on this device, locks when idle or when the app opens.
- **Speed**: stock list shows 150 rows and loads more on request (tested with 5,000+ stones).
- **Re-publish `firestore.rules`** after updating (it now includes the audit collection).

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
