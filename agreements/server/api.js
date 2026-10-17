// The backend's actions. Every request is JSON: { action: '...', ...fields }.
// Public actions (used by clients through their private link) are in PUBLIC. Studio actions are in ADMIN and
// need a session, which only someone who can read Lavi's inbox can get (a 6-digit code emailed to her).
/* global Utilities */
import { terms as T, schedule as S, reminders as R, dates, money, util, PACKAGES } from '../core/index.js';
import * as store from './store.js';
import * as mail from './mail.js';
import { getSettings, saveSettings, businessForDocs, agreementLink, invoiceLink, ownerEmail, notifyEmail } from './settings.js';
import { now, today, stamp, sha256, sha256Bytes, randomToken, randomCode, propJson, setPropJson, locked, UserError } from './env.js';

const { clean, isEmail } = util;

export function handle(req) {
  const action = String((req && req.action) || '');
  try {
    if (PUBLIC[action]) return { ok: true, ...PUBLIC[action](req) };
    if (ADMIN[action]) { requireAdmin(req); return { ok: true, ...ADMIN[action](req) }; }
    throw new UserError('Unknown action.', 'unknown');
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message, code: err.code };
    store.log('', 'error', `${action}: ${(err && err.stack) || err}`);
    return { ok: false, error: 'Something went wrong on my side. Please try again in a minute, or email me.', code: 'server' };
  }
}

// =========================================================================================================
// Helpers
// =========================================================================================================
const latest = (a) => a.versions[a.versions.length - 1];
const pendingVersion = (a) => { const v = latest(a); return v.status === 'offered' ? v : null; };
const event = (a, type, text = '') => { (a.events ||= []).push({ at: stamp(), type, text }); store.log(a.ref, type, text); };
const timingSafeEqual = (x, y) => { x = String(x); y = String(y); let d = x.length ^ y.length; for (let i = 0; i < Math.min(x.length, y.length); i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i); return d === 0; };

function loadByToken(id, token) {
  const a = store.getAgreement(clean(id, 40));
  if (!a || !token || !timingSafeEqual(a.token, clean(token, 80)) || a.status === 'deleted') throw new UserError('This link isn’t valid. Please check you copied the whole link, or ask me for a new one.', 'not_found');
  return a;
}

/** Signing-day dates. The first signature fixes the start date; amendments keep it. */
function datesFor(a, ver, signDate, clientType, earlyStart) {
  if (!a.startDate) return T.keyDates(ver.terms, signDate, { clientType, earlyStart });
  const end = ver.terms.type === 'project' ? T.keyDates({ ...ver.terms, start: a.startDate }, a.startDate).endDate : '';
  const first = a.versions.find((v) => v.signed);
  return { signDate, firstSignDate: first ? first.signed.date : signDate, startDate: a.startDate, endDate: end, coolingOffEnds: a.coolingOffEnds || '' };
}

/** First billing-cycle start on or after `iso` (amendments to monthly agreements apply from a cycle start). */
function cycleStartOnOrAfter(a, iso) {
  if (!a.startDate || iso <= a.startDate) return a.startDate || iso;
  for (let k = 1; k < 1000; k++) { const s2 = dates.addMonths(a.startDate, k); if (s2 >= iso) return s2; }
  return iso;
}

function resolvedFor(a, ver, signDate, clientType, earlyStart, client) {
  const kd = datesFor(a, ver, signDate, clientType, earlyStart);
  const doc = T.resolveDoc(ver.doc, { ...kd, clientType, client, earlyStart });
  const prev = S.latestSigned(a);
  if (prev && prev !== ver) {
    // Changes can't apply before they are signed, and monthly fees change from the start of a billing cycle.
    const eff = ver.terms.type === 'project' ? '' : cycleStartOnOrAfter(a, dates.max(ver.effectiveFrom || signDate, signDate));
    doc.amendment = { replaces: prev.v, replacesDate: prev.signed.date, effectiveFrom: eff, changes: T.diffDocs(prev.signed.doc, doc) };
  }
  return { kd, doc };
}

function clientView(a) {
  const pend = pendingVersion(a);
  const last = S.latestSigned(a);
  const t = today();
  const out = {
    id: a.id, ref: a.ref, test: !!a.test, status: a.status, today: t, startDate: a.startDate || '',
    clientType: a.clientType || '', ending: a.ending ? { noticeDate: a.ending.noticeDate, endDate: a.ending.endDate } : null,
    history: a.versions.filter((v) => v.signed).map((v) => ({ v: v.v, date: v.signed.date })),
  };
  if (pend) {
    const prefill = (last && last.signed.client) || pend.terms.client || {};
    const preview = last ? resolvedFor(a, pend, t, a.clientType, a.earlyStart, prefill).doc : null;
    out.pending = {
      v: pend.v, rev: pend.rev, doc: pend.doc, region: pend.terms.region, type: pend.terms.type, noticeDays: pend.terms.noticeDays,
      clientTypes: a.clientType || pend.terms.clientTypes, prefill: {
        name: prefill.name || '', role: prefill.role || '', company: prefill.company || '', companyNumber: prefill.companyNumber || '',
        email: prefill.email || '', billingEmail: prefill.billingEmail || '', phone: prefill.phone || '', address: prefill.address || '',
      },
      amendment: preview ? preview.amendment : null,
      datePreview: { business: datesFor(a, pend, t, 'business', false), consumer: datesFor(a, pend, t, 'consumer', false), consumerEarly: datesFor(a, pend, t, 'consumer', true) },
    };
  }
  if (last) {
    const s = last.signed;
    out.signed = { v: last.v, date: s.date, at: s.at, doc: s.doc, fingerprint: s.fingerprint, signature: s.signature, consents: s.consents, clientType: s.clientType };
  }
  return out;
}

// =========================================================================================================
// Public: clients
// =========================================================================================================
const PUBLIC = {
  ping: () => ({ service: 'lb-agreements', time: stamp() }),

  'agreement.get': (r) => {
    const a = loadByToken(r.id, r.token);
    const pend = pendingVersion(a);
    if (pend && !pend.viewedAt) locked(() => {
      const fresh = store.getAgreement(a.id);
      const p = pendingVersion(fresh);
      if (p && !p.viewedAt) { p.viewedAt = stamp(); event(fresh, 'viewed', `Client opened version ${p.v}`); store.saveAgreement(fresh); }
    });
    return { agreement: clientView(a), business: publicBusiness() };
  },

  'agreement.sign': (r) => {
    const a = locked(() => {
      const a = loadByToken(r.id, r.token);
      const ver = pendingVersion(a);
      if (!ver) throw new UserError(S.latestSigned(a) ? 'This agreement is already signed. Reload the page to download your copy.' : 'This agreement isn’t open for signing yet.', 'not_open');
      if (Number(r.v) !== ver.v || Number(r.rev) !== ver.rev) throw new UserError('I’ve just updated this agreement. Please reload the page, check the latest version and sign again.', 'stale');

      const allowed = a.clientType || ver.terms.clientTypes;
      const clientType = a.clientType || (allowed === 'either' ? clean(r.clientType, 10) : allowed);
      if (!['business', 'consumer'].includes(clientType)) throw new UserError('Please say whether you are signing for a business or as an individual.');
      if (allowed !== 'either' && clientType !== allowed) throw new UserError('This agreement can only be signed by a business.');
      const client = validateClient(r.client || {}, clientType);
      const consents = r.consents || {};
      if (consents.agree !== true) throw new UserError('Please tick the box to confirm you have read and agree to the agreement.');
      if (consents.esign !== true) throw new UserError('Please tick the box to agree to sign electronically.');
      if (clientType === 'business' && consents.authority !== true) throw new UserError('Please confirm you are authorised to sign for the business.');
      const earlyStart = clientType === 'consumer' && !a.startDate ? consents.earlyStart === true : !!a.earlyStart;
      const signature = validateSignature(r.signature || {}, client.name);

      const signDate = today();
      const { kd, doc } = resolvedFor(a, ver, signDate, clientType, earlyStart, client);
      const signed = {
        at: stamp(), date: signDate, client, clientType, earlyStart,
        consents: { agree: true, esign: true, authority: clientType === 'business', earlyStart },
        signature, ua: clean(r.ua, 300), doc,
      };
      signed.fingerprint = sha256(util.fingerprintPayload({ doc, signed }));
      const first = !S.latestSigned(a);
      ver.signed = signed;
      ver.status = 'signed';
      if (first) {
        a.startDate = kd.startDate; a.endDate = kd.endDate; a.clientType = clientType; a.earlyStart = earlyStart; a.coolingOffEnds = kd.coolingOffEnds;
        ver.effectiveFrom = kd.startDate;
      } else {
        if (ver.terms.type === 'project') a.endDate = kd.endDate;
        ver.effectiveFrom = doc.amendment.effectiveFrom || signDate;
      }
      a.status = a.ending ? 'ending' : 'signed';
      a.pendingEmail = { v: ver.v, since: stamp() };
      event(a, 'signed', `Version ${ver.v} signed by ${client.name}${client.company ? ` for ${client.company}` : ''} (${clientType})`);
      store.saveAgreement(a);
      return a;
    });
    try { issueDue(a); } catch (e) { store.log(a.ref, 'error', `issue after signing: ${e}`); }
    return { agreement: clientView(store.getAgreement(a.id)), business: publicBusiness() };
  },

  'agreement.pdf': (r) => {
    const a0 = loadByToken(r.id, r.token);
    const ver = a0.versions.find((v) => v.v === Number(r.v) && v.signed);
    if (!ver) throw new UserError('Nothing to attach.');
    if (ver.signed.pdfFileId) return { stored: true, already: true };
    const b64 = String(r.pdf || '').replace(/^data:application\/pdf;base64,/, '');
    if (b64.length > 8_000_000) throw new UserError('The PDF is too large.');
    const bytes = Utilities.base64Decode(b64);
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new UserError('That is not a PDF.');
    // The signing page writes the fingerprint into the PDF's keywords; reject anything else.
    if (Utilities.newBlob(bytes).getDataAsString('ISO-8859-1').indexOf(ver.signed.fingerprint) < 0) throw new UserError('That PDF doesn’t match this agreement.');
    const c = ver.signed.client;
    const fileName = `${a0.ref} v${ver.v} - ${(c.company || c.name).replace(/[\\/:*?"<>|]/g, '')} - signed.pdf`;
    const blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
    let sendNow = false;
    const a = locked(() => {
      const a = store.getAgreement(a0.id);
      const v = a.versions.find((x) => x.v === ver.v);
      if (v.signed.pdfFileId) return a;
      v.signed.pdfFileId = store.saveSignedPdf(fileName, blob);
      v.signed.pdfSha256 = sha256Bytes(bytes);
      if (a.pendingEmail && a.pendingEmail.v === v.v) { delete a.pendingEmail; v.signed.emailedAt = stamp(); sendNow = true; }
      store.saveAgreement(a);
      return a;
    });
    if (sendNow) mail.sendSigned(a, a.versions.find((x) => x.v === ver.v), Utilities.newBlob(bytes, 'application/pdf', fileName), agreementLink(a));
    return { stored: true, emailed: sendNow };
  },

  'invoice.get': (r) => {
    const inv = store.getInvoice(clean(r.id, 40));
    if (!inv || !timingSafeEqual(inv.token, clean(r.token, 80))) throw new UserError('This invoice link isn’t valid. Please check you copied the whole link.', 'not_found');
    if (!inv.viewedAt) locked(() => { const f = store.getInvoice(inv.id); f.viewedAt = stamp(); store.saveInvoice(f); });
    return { invoice: clientInvoice(inv) };
  },

  'admin.code': () => locked(() => {
    const t = now().getTime();
    const recent = propJson('LOGIN_REQUESTS', []).filter((x) => t - x < 3600_000);
    if (recent.length >= 6) {
      if (recent.length === 6) mail.sendOwnerAlert('Studio: many sign-in codes requested', 'Six studio sign-in codes were requested in the last hour. If that wasn’t you, nothing can be done without the codes in this inbox, but tell Claude so it can look into it.');
      setPropJson('LOGIN_REQUESTS', [...recent, t]);
      throw new UserError('Too many codes requested. Please wait an hour and try again.', 'rate');
    }
    const code = randomCode();
    // Up to three codes stay valid, so a stray request can't cancel the one you're about to type.
    const codes = propJson('LOGIN_CODES', []).filter((c) => c.exp > t).slice(-2);
    codes.push({ hash: sha256(`code:${code}`), exp: t + 10 * 60_000 });
    setPropJson('LOGIN_CODES', codes);
    setPropJson('LOGIN_REQUESTS', [...recent, t]);
    mail.sendLoginCode(code);
    return { sentTo: maskEmail(ownerEmail()) };
  }),

  'admin.login': (r) => locked(() => {
    const t = now().getTime();
    const fails = propJson('LOGIN_FAILS', []).filter((x) => t - x < 86400_000);
    if (fails.length >= 20) throw new UserError('Too many wrong codes today. Please try again tomorrow.', 'locked');
    const codes = propJson('LOGIN_CODES', []).filter((c) => c.exp > t);
    if (!codes.length) throw new UserError('That code has expired. Please ask for a new one.', 'expired');
    const h = sha256(`code:${clean(r.code, 20).replace(/[\s-]/g, '').toUpperCase()}`);
    const hit = codes.find((c) => timingSafeEqual(c.hash, h));
    if (!hit) {
      fails.push(t); setPropJson('LOGIN_FAILS', fails);
      if (fails.length === 20) mail.sendOwnerAlert('Studio: sign-in locked for today', '20 wrong sign-in codes were tried today, so studio sign-in is paused until tomorrow. If that wasn’t you, tell Claude.');
      throw new UserError('That code isn’t right. Please check it and try again.', 'wrong_code');
    }
    setPropJson('LOGIN_CODES', codes.filter((c) => c !== hit));
    const session = randomToken(40);
    const exp = now().getTime() + 30 * 86400_000;
    const sessions = Object.fromEntries(Object.entries(propJson('SESSIONS', {})).filter(([, e]) => e > now().getTime()).slice(-9));
    sessions[sha256(`session:${session}`)] = exp;
    setPropJson('SESSIONS', sessions);
    store.log('studio', 'sign-in', '');
    return { session, expires: new Date(exp).toISOString() };
  }),
};

// Sessions last 30 days from the last time the studio was used (renewed at most once a day).
function requireAdmin(r) {
  const s = clean(r.session, 100);
  const key = s && sha256(`session:${s}`);
  const sessions = key ? propJson('SESSIONS', {}) : {};
  const exp = sessions[key];
  const t = now().getTime();
  if (!exp || exp < t) throw new UserError('Please sign in again.', 'auth');
  // Sessions last 30 days and are topped up about once a week, not on every request (each top-up is a write).
  if (exp - t < 23 * 86400_000) { sessions[key] = t + 30 * 86400_000; setPropJson('SESSIONS', sessions); }
}
const maskEmail = (e) => String(e).replace(/^(.)(.*)(@.*)$/, (m, a, b, c) => `${a}${'•'.repeat(Math.min(6, b.length))}${c}`);

function publicBusiness() {
  const b = businessForDocs();
  return { name: b.name, trading: b.trading, email: b.email, website: b.website, address: b.address };
}

function validateClient(c, clientType) {
  const out = {
    name: clean(c.name, 100), role: clean(c.role, 100), company: clean(c.company, 150), companyNumber: clean(c.companyNumber, 40),
    email: clean(c.email, 150).toLowerCase(), billingEmail: clean(c.billingEmail, 150).toLowerCase(), phone: clean(c.phone, 40), address: clean(c.address, 400),
  };
  if (out.name.length < 2) throw new UserError('Please enter your full name.');
  if (!isEmail(out.email)) throw new UserError('Please enter a valid email address.');
  if (out.billingEmail && !isEmail(out.billingEmail)) throw new UserError('Please check the email address for invoices.');
  if (out.address.length < 6) throw new UserError('Please enter your address.');
  if (clientType === 'business') {
    if (out.company.length < 2) throw new UserError('Please enter the business name.');
    if (out.role.length < 2) throw new UserError('Please enter your role at the business.');
  } else { out.company = ''; out.role = ''; out.companyNumber = ''; }
  return out;
}

function validateSignature(s, name) {
  const method = s.method === 'draw' ? 'draw' : 'type';
  const typed = clean(s.name, 100);
  if (typed.length < 2) throw new UserError('Please type your name to sign.');
  if (typed.toLowerCase().replace(/\s+/g, ' ') !== name.toLowerCase().replace(/\s+/g, ' ')) throw new UserError('Please type your name exactly as you entered it above.');
  const out = { method, name: typed };
  if (method === 'draw') {
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(s.image || ''));
    if (!m || m[1].length > 400_000) throw new UserError('Please draw your signature again.');
    const bytes = Utilities.base64Decode(m[1]);
    if (bytes.length < 200) throw new UserError('Please draw your signature.');
    out.image = s.image;
    out.imageSha256 = sha256Bytes(bytes);
  }
  return out;
}

// =========================================================================================================
// Invoices
// =========================================================================================================
function clientInvoice(inv) {
  const { token, events, voidReason, reminderSentAt, reminders, autoReminders, sentAt, viewedAt, ...rest } = inv;
  return rest;
}

/**
 * Issue every invoice this agreement should have by today. Safe to run any number of times.
 * Email problems go into `errors` (the daily job sends Lavi one alert for all of them); called on its own
 * (signing, "issue balance now"), Lavi gets an alert straight away.
 */
export function issueDue(a0, errors) {
  const problems = errors || [];
  const numbers = locked(() => {
    const a = store.getAgreement(a0.id);
    // Keys are kept in the agreement record as well as the Sheet, so editing the Sheet can't cause double billing.
    const issued = store.listInvoicesFor(a.id);
    // Only scheduled invoices have a key (manual ones have none, and must not be counted here).
    const keys = new Set([...(a.issuedKeys || []), ...issued.map((i) => i.key)].filter(Boolean));
    const known = [...issued, ...[...keys].filter((k) => !issued.some((i) => i.key === k)).map((k) => ({ key: k, agreementId: a.id, status: 'issued', amount: 0 }))];
    const out = [];
    for (const x of S.missingInvoices(a, known, today())) {
      if (x.amount <= 0) { // e.g. a 100% deposit: nothing left to bill
        a.issuedKeys = [...keys, x.key]; keys.add(x.key);
        store.log(a.ref, 'invoice skipped', `${x.key}: nothing to bill`);
        continue;
      }
      out.push(createInvoice(a, x));
      keys.add(x.key);
    }
    if (out.length || (a.issuedKeys || []).length !== keys.size) { a.issuedKeys = [...keys]; store.saveAgreement(a); }
    return out;
  }).map((inv) => { maybeSend(inv, problems); return inv.number; });
  if (!errors) alertOwner(problems, 'An invoice was issued but its email didn’t go out');
  return numbers;
}

/** One alert email to Lavi for a list of problems (never throws: the alert must not break anything else). */
function alertOwner(problems, what) {
  if (!problems.length) return;
  try {
    mail.sendOwnerAlert('Agreements: something needs a look', `${what}:\n\n${problems.join('\n')}\n\nNothing was double-billed. Open the studio to check, or ask Claude.`);
  } catch (e) { store.log('system', 'error', `owner alert: ${e}`); }
}

function createInvoice(a, x) {
  const ver = a.versions.find((v) => v.v === x.version) || S.latestSigned(a);
  const last = S.latestSigned(a);
  const c = last.signed.client;
  const st = getSettings();
  const b = st.business;
  const inv = {
    id: randomToken(12), token: randomToken(32),
    number: store.nextNumber('INV', x.issueDate.slice(0, 4), a.test), test: !!a.test,
    agreementId: a.id, agreementRef: a.ref, key: x.key, kind: x.kind, version: ver.v,
    region: ver.terms.region, currency: x.currency, amount: x.amount, lines: x.lines,
    issueDate: x.issueDate, dueDate: x.dueDate, periodStart: x.periodStart || '', periodEnd: x.periodEnd || '',
    billTo: { name: c.name, company: c.company, address: c.address, email: c.email, billingEmail: c.billingEmail || '' },
    from: { name: b.name, trading: b.trading, email: b.email, website: b.website, address: b.address, phone: b.phone, vatNumber: b.vatRegistered ? b.vatNumber : '' },
    vatNote: b.vatRegistered ? '' : 'No VAT charged: not VAT-registered.',
    payment: { ...st.payment }, status: 'issued', createdAt: stamp(), events: [],
  };
  store.saveInvoice(inv);
  store.log(a.ref, 'invoice', `${inv.number} ${money.format(inv.amount, inv.currency)} (${x.key})`);
  return inv;
}

function maybeSend(inv, errors = []) {
  if (!getSettings().invoices.autoSend) return;
  try {
    mail.sendInvoice(inv, invoiceLink(inv));
    locked(() => { const f = store.getInvoice(inv.id); f.sentAt = stamp(); store.saveInvoice(f); });
  } catch (e) {
    store.log(inv.agreementRef, 'error', `sending ${inv.number}: ${e}`);
    errors.push(`${inv.number}: issued but the email to the client may not have gone (${(e && e.message) || e}). Use “Resend” in the studio.`);
  }
}

/**
 * Signed copies not emailed yet (the client closed the page before their browser saved the PDF):
 * after 10 minutes, email both sides with a link to the signed copy instead. Runs every hour.
 */
export function sendPendingCopies(errors) {
  const problems = errors || [];
  const sent = [];
  for (const row of store.listAgreements()) {
    if (!['signed', 'amending', 'ending'].includes(row.status)) continue;
    const claimed = locked(() => {
      const f = store.getAgreement(row.id);
      if (!f || !f.pendingEmail || now().getTime() - new Date(f.pendingEmail.since).getTime() < 10 * 60_000) return null;
      const v = f.versions.find((x) => x.v === f.pendingEmail.v);
      delete f.pendingEmail;
      v.signed.emailedAt = stamp();
      store.saveAgreement(f);
      return { a: f, v };
    });
    if (!claimed) continue;
    try { mail.sendSigned(claimed.a, claimed.v, mail.serverCopy(claimed.a, claimed.v), agreementLink(claimed.a)); sent.push(claimed.a.ref); } catch (e) {
      store.log(claimed.a.ref, 'error', `signed copy email: ${e}`);
      problems.push(`${claimed.a.ref}: signed copy not emailed (${(e && e.message) || e}). Use “Resend signed copy” in the studio.`);
    }
  }
  if (!errors) alertOwner(problems, 'The hourly check for signed copies hit a problem');
  return sent;
}

/** Runs every morning (time trigger), and from the studio's "Check now" button. */
export function dailyJob() {
  const summary = { issued: [], ended: [], reminded: [], emailed: [], errors: [] };
  const t = today();
  let rows = [];
  try { rows = store.listAgreements(); } catch (e) { summary.errors.push(`Couldn’t read the agreements: ${e.message || e}`); }
  for (const row of rows) {
    if (!['signed', 'amending', 'ending'].includes(row.status)) continue;
    try {
      summary.issued.push(...issueDue({ id: row.id }, summary.errors));
      locked(() => {
        const a = store.getAgreement(row.id);
        let changed = false;
        if (a.ending && a.ending.endDate < t && a.status !== 'ended') { a.status = 'ended'; event(a, 'ended', `Ended on ${a.ending.endDate}`); summary.ended.push(a.ref); changed = true; }
        if (changed) store.saveAgreement(a);
      });
    } catch (e) { summary.errors.push(`${row.ref}: ${e.message || e}`); }
  }
  try { summary.emailed = sendPendingCopies(summary.errors); } catch (e) { summary.errors.push(`Signed copies: ${e.message || e}`); }
  try { summary.reminded = sendDueReminders(t, summary.errors); } catch (e) { summary.errors.push(`Payment reminders: ${e.message || e}`); }
  alertOwner(summary.errors, 'The daily invoice check hit a problem');
  store.log('system', 'daily job', JSON.stringify(summary));
  return summary;
}

/**
 * Automatic payment reminders for unpaid invoices: 1, 7 and 14 days after the due date (see core/reminders.js).
 * Each invoice is claimed under the lock before its email goes, so two runs can never send the same reminder.
 */
function sendDueReminders(t, errors = []) {
  const sent = [];
  if (!getSettings().invoices.autoReminders) return sent;
  const terms = {}; // agreement id -> terms in force, for the wording of the final reminder
  for (const row of store.listInvoices()) {
    if (row.status !== 'issued' || !row.dueDate || dates.addDays(row.dueDate, R.SCHEDULE[0]) > t) continue;
    let claimed = null;
    try {
      claimed = locked(() => {
        const f = store.getInvoice(row.id);
        const stage = R.reminderDue(f, t);
        if (!stage) return null;
        f.autoReminders = stage;
        f.reminderSentAt = stamp();
        (f.reminders ||= []).push({ at: f.reminderSentAt, stage, auto: true });
        store.saveInvoice(f);
        return { inv: f, stage };
      });
      if (!claimed) continue;
      const { inv, stage } = claimed;
      if (inv.agreementId && !(inv.agreementId in terms)) { const a = store.getAgreement(inv.agreementId); const v = a && S.latestSigned(a); terms[inv.agreementId] = v ? v.terms : null; }
      mail.sendInvoice(inv, invoiceLink(inv), { reminder: true, stage, final: stage === R.SCHEDULE.length, terms: terms[inv.agreementId] || null });
      store.log(inv.agreementRef || inv.number, 'invoice reminder', `${inv.number}: reminder ${stage} of ${R.SCHEDULE.length}`);
      sent.push(inv.number);
    } catch (e) {
      errors.push(`${row.number}: payment reminder not sent (${e.message || e}). It will be tried again tomorrow.`);
      // The email didn't go (a failed copy to Lavi doesn't throw), so release the claim and try again tomorrow.
      if (claimed) {
        try {
          locked(() => {
            const f = store.getInvoice(row.id);
            const at = claimed.inv.reminderSentAt;
            f.reminders = (f.reminders || []).filter((x) => !(x.auto && x.at === at));
            f.autoReminders = f.reminders.filter((x) => x.auto).reduce((m, x) => Math.max(m, Number(x.stage) || 0), 0);
            const prev = f.reminders[f.reminders.length - 1];
            f.reminderSentAt = prev ? prev.at : '';
            store.saveInvoice(f);
          });
        } catch (e2) { store.log(row.agreementRef || row.number, 'error', `releasing reminder claim: ${e2}`); }
      }
    }
  }
  return sent;
}

// =========================================================================================================
// Studio (admin)
// =========================================================================================================
const NUM = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function cleanTerms(input = {}) {
  const d = T.defaultTerms({ region: input.region === 'us' ? 'us' : 'uk' });
  const t = { ...d };
  t.type = input.type === 'project' ? 'project' : 'recurring';
  t.clientTypes = ['either', 'business', 'consumer'].includes(input.clientTypes) ? input.clientTypes : 'either';
  const c = input.client || {};
  t.client = { name: clean(c.name, 100), role: clean(c.role, 100), company: clean(c.company, 150), companyNumber: clean(c.companyNumber, 40), email: clean(c.email, 150).toLowerCase(), billingEmail: clean(c.billingEmail, 150).toLowerCase(), phone: clean(c.phone, 40), address: clean(c.address, 400), type: '' };
  t.packageName = clean(input.packageName, 60) || 'Custom';
  t.items = (Array.isArray(input.items) ? input.items : []).slice(0, 20).map((r) => ({ label: clean(r && r.label, 120), value: clean(r && r.value, 160) })).filter((r) => r.label || r.value);
  t.scopeNote = clean(input.scopeNote, 2000);
  t.currency = input.currency === 'USD' ? 'USD' : 'GBP';
  t.fee = NUM(input.fee, 0, 100_000_00, 0);
  t.start = input.start && input.start !== 'signing' && dates.isDate(input.start) ? input.start : 'signing';
  t.durationMonths = NUM(input.durationMonths, 1, 24, 1);
  t.endDate = input.endDate && dates.isDate(input.endDate) ? input.endDate : '';
  t.depositPercent = NUM(input.depositPercent, 0, 100, 50);
  t.paymentDays = NUM(input.paymentDays, 1, 60, 7);
  t.noticeDays = NUM(input.noticeDays, 0, 180, 30);
  t.feeChangeNoticeDays = NUM(input.feeChangeNoticeDays, 0, 180, 30);
  t.revisionRounds = NUM(input.revisionRounds, 0, 10, 2);
  t.feedbackDays = NUM(input.feedbackDays, 1, 30, 3);
  t.pauseAfterDays = NUM(input.pauseAfterDays, 1, 90, 14);
  t.remedyDays = NUM(input.remedyDays, 1, 60, 14);
  t.liabilityMonths = NUM(input.liabilityMonths, 1, 24, 3);
  t.portfolio = input.portfolio !== false;
  t.specialTerms = clean(input.specialTerms, 6000);
  const ids = new Set(T.standardClauses(t).map((x) => x.id));
  t.overrides = {};
  for (const [k, v] of Object.entries(input.overrides || {})) if (ids.has(k)) t.overrides[k] = clean(v, 3000);
  const sections = new Set(T.standardClauses(t).map((x) => x.section));
  t.extra = {};
  for (const [k, list] of Object.entries(input.extra || {})) if (sections.has(k) && Array.isArray(list)) { const l = list.slice(0, 10).map((x) => clean(x, 3000)).filter(Boolean); if (l.length) t.extra[k] = l; }
  return t;
}

function warningsFor(terms) {
  const w = [];
  const b = getSettings().business;
  if (!terms.fee) w.push('The fee is £0. Set the fee before sending.');
  if (!terms.items.length) w.push('Add at least one line to “What I’ll do”.');
  if (!b.address) w.push('Add your business address in Settings before sending. It must appear on agreements and invoices.');
  if (terms.region === 'us' && terms.clientTypes !== 'business') w.push('For US clients, “Businesses only” is safer: some US states add their own rules for individuals on rolling contracts.');
  const p = getSettings().payment;
  if (!p.accountNumber && !p.iban && !p.paypal) w.push('Add your payment details in Settings so invoices show how to pay.');
  if (terms.type === 'project' && terms.depositPercent !== 50) w.push(`The deposit is ${terms.depositPercent}%, not the usual 50%.`);
  return w;
}

function adminAgreement(a, invoices) {
  const issued = invoices || store.listInvoicesFor(a.id);
  return {
    agreement: a, link: agreementLink(a), invoices: issued,
    upcoming: S.latestSigned(a) ? S.upcomingInvoices(a, issued, today(), 3) : [],
    warnings: pendingVersion(a) || latest(a).status === 'draft' ? warningsFor(latest(a).terms) : [],
  };
}

function nextCycleStart(a) {
  if (!a.startDate) return today();
  for (let k = 1; k < 1000; k++) { const s = dates.addMonths(a.startDate, k); if (s > today()) return s; }
  return today();
}

const ADMIN = {
  'admin.overview': () => {
    const { agreements, invoices } = store.overviewData(); // also loads the settings, in the same round trip
    return {
      agreements: agreements.filter((x) => x.status !== 'deleted'),
      invoices,
      settings: getSettings(), packages: PACKAGES, today: today(), owner: ownerEmail(),
      wording: `${T.WORDING_VERSION} (${T.WORDING_DATE})`,
    };
  },

  'admin.signout': (r) => {
    locked(() => { const s = propJson('SESSIONS', {}); delete s[sha256(`session:${clean(r.session, 100)}`)]; setPropJson('SESSIONS', s); });
    return {};
  },

  'admin.agreement.get': (r) => {
    const { agreement: a, invoices } = store.agreementWithInvoices(r.id);
    if (!a) throw new UserError('Not found.', 'not_found');
    return adminAgreement(a, invoices);
  },

  'admin.agreement.preview': (r) => {
    const terms = cleanTerms(r.terms);
    const doc = T.buildDoc(terms, { ref: r.ref || 'LB-A-PREVIEW', version: r.v || 1, offeredDate: today(), business: businessForDocs() });
    return { doc, terms, standard: T.standardClauses(terms), warnings: warningsFor(terms), datePreview: T.keyDates(terms, today(), {}) };
  },

  'admin.agreement.save': (r) => {
    const terms = cleanTerms(r.terms);
    const offer = r.offer === true;
    if (offer && !getSettings().business.address) throw new UserError('Add your business address in Settings first. It must appear on agreements and invoices.');
    if (offer && !terms.fee) throw new UserError('Set the fee before making the agreement ready to sign.');
    const a = locked(() => {
      if (!r.id) {
        const test = r.test === true;
        const id = randomToken(12);
        const ref = store.nextNumber('A', today().slice(0, 4), test);
        const ver = { v: 1, rev: 1, status: offer ? 'offered' : 'draft', terms, createdAt: stamp(), offeredAt: offer ? stamp() : '' };
        ver.doc = T.buildDoc(terms, { ref, version: 1, offeredDate: today(), business: businessForDocs() });
        const a = { id, token: randomToken(32), ref, test, status: offer ? 'sent' : 'draft', createdAt: stamp(), versions: [ver], events: [] };
        event(a, 'created', `${test ? 'Test agreement' : 'Agreement'} created${offer ? ' and ready to sign' : ' as a draft'}`);
        return store.saveAgreement(a);
      }
      const a = store.getAgreement(r.id);
      if (!a) throw new UserError('Not found.', 'not_found');
      const ver = latest(a);
      if (ver.v !== Number(r.v) || !['draft', 'offered'].includes(ver.status)) throw new UserError('This version can’t be edited any more (it may have just been signed). Reload to see the latest.', 'stale');
      if (a.clientType === 'consumer' || a.clientType === 'business') terms.clientTypes = a.clientType;
      const first = a.versions[0].terms;
      if (ver.v > 1) { terms.type = first.type; terms.currency = first.currency; terms.region = first.region; } // fixed for the life of an agreement
      const wasOffered = ver.status === 'offered';
      ver.terms = terms;
      ver.rev += 1;
      if (ver.v > 1) ver.effectiveFrom = terms.type === 'project' ? '' : cycleStartOnOrAfter(a, dates.max(r.effectiveFrom && dates.isDate(r.effectiveFrom) ? r.effectiveFrom : nextCycleStart(a), today()));
      ver.doc = T.buildDoc(terms, { ref: a.ref, version: ver.v, offeredDate: today(), business: businessForDocs() });
      if (offer && !wasOffered) { ver.status = 'offered'; ver.offeredAt = stamp(); }
      if (ver.v === 1) a.status = ver.status === 'offered' ? 'sent' : 'draft';
      event(a, 'edited', wasOffered ? `Version ${ver.v} updated while waiting for signature (the client sees the new wording)` : `Version ${ver.v} ${ver.status === 'offered' ? 'ready to sign' : 'saved as draft'}`);
      return store.saveAgreement(a);
    });
    return adminAgreement(a);
  },

  'admin.agreement.amend': (r) => {
    const a = locked(() => {
      const a = store.getAgreement(r.id);
      const last = a && S.latestSigned(a);
      if (!last) throw new UserError('Only a signed agreement can be amended. Edit the draft instead.');
      if (latest(a) !== last) throw new UserError('There is already an amendment in progress.');
      const terms = JSON.parse(JSON.stringify(last.terms));
      terms.client = { ...terms.client, ...last.signed.client };
      terms.clientTypes = a.clientType;
      const ver = { v: last.v + 1, rev: 1, status: 'draft', terms, createdAt: stamp(), effectiveFrom: terms.type === 'project' ? '' : nextCycleStart(a) };
      ver.doc = T.buildDoc(terms, { ref: a.ref, version: ver.v, offeredDate: today(), business: businessForDocs() });
      a.versions.push(ver);
      a.status = 'amending';
      event(a, 'amendment', `Version ${ver.v} started`);
      return store.saveAgreement(a);
    });
    return adminAgreement(a);
  },

  'admin.agreement.withdraw': (r) => {
    const a = locked(() => {
      const a = store.getAgreement(r.id);
      const ver = a && latest(a);
      if (!ver || !['draft', 'offered'].includes(ver.status)) throw new UserError('Nothing to withdraw.');
      ver.status = 'withdrawn';
      a.status = S.latestSigned(a) ? (a.ending ? 'ending' : 'signed') : 'cancelled';
      event(a, 'withdrawn', `Version ${ver.v} withdrawn`);
      return store.saveAgreement(a);
    });
    return adminAgreement(a);
  },

  'admin.agreement.sendLink': (r) => {
    const a = store.getAgreement(r.id);
    const ver = a && pendingVersion(a);
    if (!ver) throw new UserError('Make the agreement ready to sign first.');
    const email = ver.terms.client.email || (S.latestSigned(a) && S.latestSigned(a).signed.client.email);
    if (!isEmail(email)) throw new UserError('Add the client’s email address first.');
    mail.sendAgreementLink(a, agreementLink(a), clean(r.message, 2000));
    locked(() => { const f = store.getAgreement(a.id); event(f, 'link emailed', `Link emailed to ${email}`); store.saveAgreement(f); });
    return { sentTo: email };
  },

  'admin.agreement.end': (r) => {
    const a = locked(() => {
      const a = store.getAgreement(r.id);
      const last = a && S.latestSigned(a);
      if (!last) throw new UserError('Only a signed agreement can be ended. Withdraw a draft instead.');
      const noticeDate = dates.isDate(r.noticeDate) ? r.noticeDate : today();
      const recurring = last.terms.type !== 'project';
      let endDate = dates.isDate(r.endDate) ? r.endDate : (recurring ? S.noticeEndDate(last.terms, noticeDate) : today());
      if (endDate < a.startDate) endDate = a.startDate;
      a.ending = { noticeDate, endDate, by: r.by === 'me' ? 'me' : 'client', note: clean(r.note, 1000), at: stamp() };
      a.status = 'ending';
      event(a, 'ending', `${recurring ? 'Notice given' : 'Project cancelled'}: ends ${endDate}`);
      return store.saveAgreement(a);
    });
    if (r.notify) mail.sendEnding(a, S.latestSigned(a), a.ending);
    return adminAgreement(a);
  },

  'admin.agreement.undoEnd': (r) => {
    const a = locked(() => {
      const a = store.getAgreement(r.id);
      if (!a || !a.ending) throw new UserError('This agreement isn’t ending.');
      if (store.listInvoicesFor(a.id).some((i) => i.kind === 'final' && i.status !== 'void')) throw new UserError('The final invoice has already been issued. Void it first if you want to undo the ending.');
      delete a.ending;
      a.status = latest(a).status === 'signed' || latest(a).status === 'withdrawn' ? 'signed' : 'amending';
      event(a, 'ending undone');
      return store.saveAgreement(a);
    });
    return adminAgreement(a);
  },

  'admin.agreement.issueBalance': (r) => {
    const a = locked(() => {
      const a = store.getAgreement(r.id);
      if (!a || !S.latestSigned(a) || S.latestSigned(a).terms.type !== 'project') throw new UserError('Only for one-off projects.');
      a.balanceIssueDate = today();
      event(a, 'balance', 'Balance invoice issued early');
      return store.saveAgreement(a);
    });
    issueDue(a);
    return adminAgreement(store.getAgreement(a.id));
  },

  'admin.agreement.resendSigned': (r) => {
    const a = store.getAgreement(r.id);
    const ver = a && a.versions.find((v) => v.v === Number(r.v) && v.signed);
    if (!ver) throw new UserError('Not signed.');
    const blob = ver.signed.pdfFileId ? store.getFileBlob(ver.signed.pdfFileId) : null;
    mail.sendSigned(a, ver, blob, agreementLink(a));
    return { sent: true };
  },

  'admin.agreement.verify': (r) => {
    const a = store.getAgreement(r.id);
    const ver = a && a.versions.find((v) => v.v === Number(r.v) && v.signed);
    if (!ver) throw new UserError('Not signed.');
    const check = sha256(util.fingerprintPayload({ doc: ver.signed.doc, signed: ver.signed }));
    return { ok: check === ver.signed.fingerprint, fingerprint: ver.signed.fingerprint };
  },

  'admin.invoice.get': (r) => {
    const inv = store.getInvoice(r.id);
    if (!inv) throw new UserError('Not found.', 'not_found');
    return { invoice: inv, link: invoiceLink(inv) };
  },

  'admin.invoice.update': (r) => {
    const op = String(r.op);
    let inv = store.getInvoice(r.id);
    if (!inv) throw new UserError('Not found.', 'not_found');
    if (op === 'remind' || op === 'resend') {
      if (inv.status !== 'issued' && op === 'remind') throw new UserError('Only unpaid invoices can be chased.');
      mail.sendInvoice(inv, invoiceLink(inv), { reminder: op === 'remind' });
    }
    inv = locked(() => {
      const f = store.getInvoice(r.id);
      (f.events ||= []).push({ at: stamp(), type: op });
      if (op === 'paid') { if (f.status === 'void') throw new UserError('This invoice is void.'); f.status = 'paid'; f.paidOn = dates.isDate(r.date) ? r.date : today(); }
      else if (op === 'unpaid') { if (f.status !== 'paid') throw new UserError('Not marked as paid.'); f.status = 'issued'; f.paidOn = ''; }
      else if (op === 'void') { if (f.status === 'paid') throw new UserError('Mark it unpaid first.'); f.status = 'void'; f.voidReason = clean(r.reason, 300); }
      else if (op === 'remind') { f.reminderSentAt = stamp(); (f.reminders ||= []).push({ at: f.reminderSentAt, auto: false }); }
      else if (op === 'resend') f.sentAt = stamp();
      else throw new UserError('Unknown change.');
      store.log(f.agreementRef || f.number, `invoice ${op}`, f.number);
      return store.saveInvoice(f);
    });
    return { invoice: inv, link: invoiceLink(inv) };
  },

  'admin.invoice.manual': (r) => {
    const a = r.agreementId ? store.getAgreement(r.agreementId) : null;
    const last = a && S.latestSigned(a);
    const lines = (Array.isArray(r.lines) ? r.lines : []).slice(0, 20).map((l) => ({ text: clean(l.text, 300), amount: Number.isFinite(money.parse(l.amount)) ? money.parse(l.amount) : NUM(l.amountMinor, -100_000_00, 100_000_00, NaN) })).filter((l) => l.text && Number.isFinite(l.amount));
    if (!lines.length) throw new UserError('Add at least one line with an amount.');
    const total = lines.reduce((s, l) => s + l.amount, 0);
    if (total <= 0) throw new UserError('The total must be more than zero.');
    const billTo = last ? last.signed.client : r.billTo || {};
    if (!billTo.name || !isEmail(billTo.email)) throw new UserError('Choose an agreement, or enter the client’s name and email.');
    const st = getSettings();
    const b = st.business;
    const issueDate = today();
    const inv = locked(() => {
      const inv = {
        id: randomToken(12), token: randomToken(32), number: store.nextNumber('INV', issueDate.slice(0, 4), !!(a ? a.test : r.test)), test: !!(a ? a.test : r.test),
        agreementId: a ? a.id : '', agreementRef: a ? a.ref : '', key: '', kind: 'manual', version: last ? last.v : 0,
        region: last ? last.terms.region : (r.region === 'us' ? 'us' : 'uk'), currency: last ? last.terms.currency : (r.currency === 'USD' ? 'USD' : 'GBP'),
        amount: total, lines, issueDate, dueDate: dates.addDays(issueDate, NUM(r.dueDays, 0, 90, 7)), periodStart: '', periodEnd: '',
        billTo: { name: clean(billTo.name, 100), company: clean(billTo.company, 150), address: clean(billTo.address, 400), email: clean(billTo.email, 150), billingEmail: clean(billTo.billingEmail, 150) },
        from: { name: b.name, trading: b.trading, email: b.email, website: b.website, address: b.address, phone: b.phone, vatNumber: b.vatRegistered ? b.vatNumber : '' },
        vatNote: b.vatRegistered ? '' : 'No VAT charged: not VAT-registered.', payment: { ...st.payment }, status: 'issued', createdAt: stamp(), events: [],
      };
      store.log(inv.agreementRef || inv.number, 'invoice', `${inv.number} manual ${money.format(total, inv.currency)}`);
      return store.saveInvoice(inv);
    });
    if (r.send !== false) { mail.sendInvoice(inv, invoiceLink(inv)); locked(() => { const f = store.getInvoice(inv.id); f.sentAt = stamp(); store.saveInvoice(f); }); }
    return { invoice: store.getInvoice(inv.id), link: invoiceLink(inv) };
  },

  'admin.settings.save': (r) => ({ settings: saveSettings(r.settings || {}) }),

  'admin.job.run': () => ({ summary: dailyJob() }),
};
