# Agreements & invoices

Online agreements your clients sign with a private link, and invoices that are created automatically. It all runs on
your own Google account: no monthly fees and no outside e-signature service.

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
- **Settings**: your business address, bank and PayPal details, and invoice options. Stored privately in Google,
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

**Records, in your Google account**
- Google Sheet **LB Agreements & Invoices**: one row per agreement and per invoice, plus a Log tab. You can sort,
  filter and add columns; please don't delete or rename the existing headings or edit the ID columns.
- Google Drive folder **LB Agreements**: the full record of each agreement and invoice (`data (do not edit)`) and
  every signed PDF (`Signed agreements`).
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

Claude does these steps with you; you only sign in and approve.
1. Signed in as **hello@lavibachchis.com**, create an Apps Script project called *LB Agreements* and paste in
   `agreements/dist/gas/Code.js` and `appsscript.json` (made by `npm run agreements:build`).
2. Run `setup` once and approve Google's permission screen. It creates the Drive folder, the Sheet and the
   daily and hourly checks, and sends studio codes to the account that ran it.
3. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone*. Copy the web app address.
4. Paste that address into `AGREEMENTS_API_URL` in `src/data/settings.js`.
5. Preview, then (with your OK) merge to `main` so the pages go live.
6. In the studio, fill in **Settings** (business address, bank details, PayPal), then run one **Test agreement**
   end to end with your own email.

Emails are sent from the Google account that runs the script (hello@lavibachchis.com).

## Moving to hello@lavibachchis.com later

1. Change `site.email` in `src/data/copy.json` to hello@lavibachchis.com (this also updates the website's contact email),
   and change **Settings → Business email** in the studio.
2. Run the same setup from the hello@ account so emails come from the business address, and point
   `AGREEMENTS_API_URL` at the new web app. Claude moves your existing agreements and invoices across first
   (share the "LB Agreements" folder and Sheet with hello@, or copy them), so nothing is lost and numbering continues.

## For Claude: building and testing

```
npm run agreements:build   # backend -> agreements/dist/gas/Code.js
npm run agreements:test    # unit tests + every backend flow, on the real Code.js run locally
npm run agreements:e2e     # full browser journeys (studio, client on desktop and phone, PDFs, invoices)
npm run agreements:local   # local backend on :8787; build the site with PUBLIC_AGREEMENTS_API=http://localhost:8787/exec
npm run agreements:demo    # the clickable demo (everything in one page) -> agreements/dist/demo
```

- `core/`: shared logic (wording, dates, money, invoice schedule, fingerprint). Used by the pages, the backend and the tests.
- `server/`: the Google Apps Script backend (`api.js` actions, `store.js` Sheets/Drive, `mail.js` emails, `setup.js`).
- `local/`: a stand-in for Google's services so the exact `Code.js` runs in tests.
- `demo/`: the same code running in the browser, for previews.
- Site pages: `src/pages/{agreement,invoice,studio}`, code in `src/lib/agreements/`, styles in `src/styles/app.css`.

**Limits to know:** Google lets a Workspace account send about 1,500 emails a day (plenty). The studio session lasts
30 days from last use. Billing cycles that start on the 29th to 31st follow shorter months (e.g. 31 Jan to 27 Feb,
then 28 Feb to 30 Mar). If you backdate an end date into a month that's already invoiced, issue a credit by hand.
The client's browser makes the branded PDF; the master record is the fingerprinted record in your studio, and the
backend only files a PDF that carries that fingerprint. If a client closes the page before their PDF is saved, an
hourly check emails both of you a copy made by Google instead.
