# Agreements & invoices

Online agreements your clients sign with a private link, and invoices that are created automatically. The studio
runs on your own Google account (Apps Script, which also sends the emails) and every record is stored in your own
Supabase project: no monthly fees and no outside e-signature service.

> **Status:** live at lavibachchis.com/studio/. Your business email is hello@lavibachchis.com (Google Workspace).
> The address comes from one place: `site.email` in `src/data/copy.json` (the same email the website shows).

---

## How it works, in plain words

**You (the studio, `lavibachchis.com/studio/`)**
- Sign in with a one-time code emailed to you. Nobody without your inbox can get in.
- **New agreement**: pick a package (Social, Content, Full content desk or custom), set the fee, and choose
  *monthly* (rolling) or *one-off project*. Optionally add the client's name and email, special terms from your
  call, or edit any clause for that client only. A live preview shows exactly what they'll see.
- **Save and get link**: you get a private link to send (or click *Email link to client*).
- **Changed your mind after a call?** If they haven't signed yet, edit it: they see the new wording next time they
  open the link (and a client who has the old version open is asked to reload before signing).
  If they *have* signed, click **Amend agreement**: the signed version stays in force until they sign the new
  one, which shows them exactly what changed and when it applies.
- **End agreement**: record the notice date; the end date and final part-month invoice follow automatically.
- **Invoices**: see unpaid, overdue and paid; mark paid, send a reminder, cancel one, or create a one-off invoice.
- **Settings**: your business address, bank and PayPal details, and invoice options. Stored privately in Supabase,
  never in this public repository.
- **Test agreement** tick box: gets a T number (LB-A-2026-T01), is marked Test everywhere and isn't binding.

**Your client (`lavibachchis.com/agreement/#…`)**
- Reads the agreement, says whether they're signing **for a business** or **as an individual**, fills in their
  details (which appear in the agreement as they type), ticks the consents, and types or draws their signature.
- Downloads the signed PDF straight away. A copy is emailed to them and to you (hello@lavibachchis.com).
- The same link later shows their signed copy.

**Billing (automatic, every morning at 8 to 9am London time)**
- **Monthly agreements**: the billing cycle starts on the start date (usually the signing day). Each cycle is
  invoiced on its last day, due 7 days later. Example: signed 16 October, invoice on 15 November, due 22 November.
- **One-off projects**: **50% deposit invoiced the moment they sign** (due in 7 days; work starts once paid), and
  the balance on the project end date (or earlier with *Issue balance invoice now*).
- **Amendments**: a new monthly fee applies from the next billing cycle; invoices already sent don't change.
- **Ending**: the last part-month is invoiced pro rata on the end date. Nothing is invoiced after that.
- Invoices are emailed to the client with you copied in, and each one has its own page with a PDF download.
- Running the check twice never double-bills: each invoice has a key, kept in the agreement record and the Sheet.

**Records, all in one place: your Supabase project** (supabase.com → *hello@lavibachchis.com's Project*)
- **Table Editor → `agreements`** and **`invoices`**: one row per agreement and per invoice, with readable columns
  (client, fee, status, dates…) you can sort, filter and export. The `data` column is the full record: please
  don't edit `id`, `key` or `data`. Change things through the studio instead.
- **`activity_log`**: everything that happened (sign-ins, emails sent, invoices issued, errors), newest first.
- **`settings`**: your studio Settings. **`counters`**: the last reference numbers used (never lower them).
- **Storage → `signed-agreements`**: every signed PDF, in a folder per year.
- Nothing is readable with the site's public key: only the studio's secret key can read or write.
- Supabase's free plan pauses a project after a week with no activity at all; the studio's hourly check keeps it
  awake. The free plan has no automatic backups you can download: export the tables now and then (Table Editor →
  Export to CSV), or upgrade if you'd like daily backups.
- Each signature gets a **document fingerprint** (SHA-256) covering the exact wording, both parties, the
  signature and the time. *Check fingerprint* in the studio proves the record hasn't changed since signing.

## The agreement wording

`agreements/core/terms.js`, wording version 2.0 (October 2026), based on your agreed sample (LB-A-2026-T01) and
improved after an independent review:
- Business clients: Late Payment Act interest, liability cap, mediation before court, whole-agreement clause.
- Individuals (consumers): the 14-day right to cancel with a cancellation form, an optional "start sooner" request,
  refunds within 14 days, ADR information, and the protections the Consumer Rights Act requires.
- UK GDPR processor terms for handling your clients' customer data (e.g. mailing lists), account access, and how
  you use software and AI tools.
- US clients: American spelling and dates, US dollars; English law still applies. New US agreements default to
  *Businesses only*, because some US states add their own rules for individuals on rolling contracts.

**This is a careful plain-English draft, not legal advice.** Before relying on it for large contracts, have a UK
solicitor review `terms.js` once (in particular the consumer, liability and data-processing clauses).

## Switching it on

Claude does these steps with you; you only sign in, paste the secret key and approve.
1. **Supabase** (SQL Editor): run `supabase/migrations/20261017120000_studio_records.sql`. It creates the tables,
   the numbering function and the private `signed-agreements` bucket, and locks them to the secret key. Safe to
   run again.
2. **Apps Script** (*LB Agreements*, signed in as hello@lavibachchis.com): replace `Code.js` and `appsscript.json`
   with `agreements/dist/gas/` (made by `npm run agreements:build`).
3. Project Settings → **Script properties**: add `SUPABASE_URL` (`https://xysgfgkgndpgcctrnrla.supabase.co`) and
   `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → secret key). Only you paste the key.
4. Run `setup` once and approve Google's permission screen (it now asks to *connect to an external service*, which
   is Supabase). It checks the connection, copies any Settings you had saved, and schedules the daily and hourly checks.
5. **Deploy → Manage deployments → edit → New version** (keeps the same web app address, so the website needs no change).
6. In the studio, check **Settings**, then run one **Test agreement** end to end with your own email.

Emails are sent from the Google account that runs the script (hello@lavibachchis.com).

## Moving to hello@lavibachchis.com later

1. Change `site.email` in `src/data/copy.json` to hello@lavibachchis.com (this also updates the website's contact email),
   and change **Settings → Business email** in the studio.
2. Run the same setup from the hello@ account so emails come from the business address, and point
   `AGREEMENTS_API_URL` at the new web app. The records stay in Supabase, so nothing needs moving.

## For Claude: building and testing

```
npm run agreements:build   # backend -> agreements/dist/gas/Code.js
npm run agreements:test    # unit tests + every backend flow, on the real Code.js run locally against a local Supabase
                           # (needs PostgreSQL 16 and PostgREST; set PG_BIN / POSTGREST_BIN if not on the PATH)
npm run agreements:e2e     # full browser journeys (studio, client on desktop and phone, PDFs, invoices)
npm run agreements:local   # local backend on :8787; build the site with PUBLIC_AGREEMENTS_API=http://localhost:8787/exec
npm run agreements:demo    # the clickable demo (everything in one page) -> agreements/dist/demo
```

- `core/`: shared logic (wording, dates, money, invoice schedule, fingerprint). Used by the pages, the backend and the tests.
- `server/`: the Google Apps Script backend (`api.js` actions, `store.js` + `supabase.js` records in Supabase,
  `mail.js` emails, `setup.js`).
- `local/`: a stand-in for Google's services, plus a local Supabase (real PostgreSQL with the real migrations,
  PostgREST and a small storage gateway), so the exact `Code.js` runs in tests.
- `../supabase/migrations/`: the database. Change it only with a new migration file, never by hand in the dashboard.
- `demo/`: the same code running in the browser, for previews.
- Site pages: `src/pages/{agreement,invoice,studio}`, code in `src/lib/agreements/`, styles in `src/styles/app.css`.

**Limits to know:** Google lets a Workspace account send about 1,500 emails a day (plenty). Supabase's free plan
holds 500 MB of data and 1 GB of files (thousands of agreements). The studio session lasts
30 days from last use. Billing cycles that start on the 29th to 31st follow shorter months (e.g. 31 Jan to 27 Feb,
then 28 Feb to 30 Mar). If you backdate an end date into a month that's already invoiced, issue a credit by hand.
The client's browser makes the branded PDF; the master record is the fingerprinted record in your studio, and the
backend only files a PDF that carries that fingerprint. If a client closes the page before their PDF is saved, an
hourly check emails both of you a copy made by Google instead.
