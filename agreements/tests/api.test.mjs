// Backend tests: run the built Apps Script code locally and walk through every flow over HTTP.
// Run: npm run agreements:test  (starts its own local backend on port 8790)
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8790;
const BASE = `http://localhost:${PORT}`;
let srv;

const call = async (action, body = {}) => (await fetch(`${BASE}/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...body }) })).json();
const outbox = async () => (await fetch(`${BASE}/__test/outbox`)).json();
const setNow = (iso) => fetch(`${BASE}/__test/clock`, { method: 'POST', body: JSON.stringify({ now: iso }) });
const job = async () => (await fetch(`${BASE}/__test/job`, { method: 'POST' })).json();
let session;
async function signIn() {
  await call('admin.code');
  const code = /code: ([A-Z2-9]{8})/.exec((await outbox()).at(-1).subject)[1];
  session = (await call('admin.login', { code })).session;
}
// Sessions last 30 days; the tests jump months ahead, so sign in again when needed (as Lavi would).
async function admin(action, body = {}) {
  let r = await call(action, { session, ...body });
  if (r.code === 'auth') { await signIn(); r = await call(action, { session, ...body }); }
  return r;
}

before(async () => {
  srv = spawn(process.execPath, [join(here, '..', 'local', 'server.mjs'), '--fresh'], { env: { ...process.env, PORT: String(PORT), LB_DATA_DIR: mkdtempSync(join(tmpdir(), 'lb-')) }, stdio: 'pipe' });
  await new Promise((ok) => srv.stdout.on('data', (d) => String(d).includes('LB Agreements') && ok()));
  await setNow('2026-10-16T12:30:00Z');
});
after(() => srv.kill());

test('studio sign-in needs the emailed code', async () => {
  assert.equal((await call('admin.overview', { session: 'nope' })).code, 'auth');
  assert.equal((await call('admin.login', { code: '000000' })).code, 'expired');
  await call('admin.code');
  const mail = (await outbox()).at(-1);
  const code = /code: ([A-Z2-9]{8})/.exec(mail.subject)[1];
  assert.equal((await call('admin.login', { code: code === 'AAAAAAAA' ? 'BBBBBBBB' : 'AAAAAAAA' })).code, 'wrong_code');
  // a second request doesn't cancel the first code
  await call('admin.code');
  const code2 = /code: ([A-Z2-9]{8})/.exec((await outbox()).at(-1).subject)[1];
  assert.notEqual(code, code2);
  const r = await call('admin.login', { code: code.toLowerCase() });
  assert.ok(r.ok && r.session.length === 40, r.error);
  session = r.session;
  assert.equal((await call('admin.login', { code })).code, 'wrong_code'); // single use
  assert.ok((await call('admin.login', { code: code2 })).ok); // the other code still works
  const ov = await admin('admin.overview');
  assert.ok(ov.ok);
  assert.equal(ov.packages.length, 3);
});

test('settings are saved and unknown keys ignored', async () => {
  const blocked = await admin('admin.agreement.save', { terms: { fee: 1000, items: [{ label: 'x', value: '1' }] }, offer: true });
  assert.match(blocked.error, /business address/);
  const r = await admin('admin.settings.save', { settings: { business: { address: '1 Example Road\nLondon N1 1AA', hacker: 'x' }, payment: { accountName: 'Lavi Bachchis', sortCode: '00-00-00', accountNumber: '12345678', paypal: 'paypal.me/example' } } });
  assert.equal(r.settings.business.address, '1 Example Road\nLondon N1 1AA');
  assert.equal(r.settings.business.hacker, undefined);
});

let rec;
test('monthly agreement: create, edit while sent, sign, emails and PDF', async () => {
  const ov = await admin('admin.overview');
  const pkg = ov.packages[1];
  const terms = { region: 'uk', type: 'recurring', packageName: pkg.name, items: pkg.items, fee: 72000, currency: 'GBP', client: { name: 'Sam Example', company: 'Example Studio Ltd', email: 'sam@example.com' } };
  let r = await admin('admin.agreement.save', { terms, offer: true });
  assert.ok(r.ok, r.error);
  assert.match(r.agreement.ref, /^LB-A-2026-001$/);
  assert.equal(r.agreement.status, 'sent');
  const [id, token] = r.link.split('#')[1].split('.');
  rec = { id, token };

  // Client opens
  let g = await call('agreement.get', { id, token });
  assert.ok(g.ok);
  assert.equal(g.agreement.pending.v, 1);
  assert.equal(g.agreement.pending.prefill.company, 'Example Studio Ltd');
  assert.equal((await call('agreement.get', { id, token: 'x'.repeat(32) })).code, 'not_found');

  // Lavi edits after a call; the client's open page is now stale
  r = await admin('admin.agreement.save', { id, v: 1, terms: { ...terms, fee: 75000 }, offer: true });
  const sign = (extra = {}) => call('agreement.sign', {
    id, token, v: 1, rev: g.agreement.pending.rev, clientType: 'business',
    client: { name: 'Sam Example', role: 'Director', company: 'Example Studio Ltd', email: 'sam@example.com', address: '1 Sample Street, Exampletown, EX1 2MP' },
    consents: { agree: true, esign: true, authority: true }, signature: { method: 'type', name: 'Sam Example' }, ua: 'test', ...extra,
  });
  assert.equal((await sign()).code, 'stale');
  g = await call('agreement.get', { id, token });
  assert.match(JSON.stringify(g.agreement.pending.doc), /£750\.00/);
  assert.equal((await sign({ signature: { method: 'type', name: 'Someone Else' } })).code, 'bad_request');
  assert.equal((await sign({ consents: { agree: true, esign: true } })).code, 'bad_request');
  const s = await sign();
  assert.ok(s.ok, s.error);
  assert.equal(s.agreement.signed.v, 1);
  assert.equal(s.agreement.startDate, '2026-10-16');
  assert.match(s.agreement.signed.fingerprint, /^[0-9a-f]{64}$/);
  const text = s.agreement.signed.doc.sections.flatMap((x) => x.items.map((i) => i.text)).join(' ');
  assert.match(text, /starting on the date this agreement is signed \(16 October 2026\)\. I invoice £750\.00/);
  assert.equal((await sign()).code, 'not_open');

  // PDF upload -> stored and emailed to client and Lavi
  const before = (await outbox()).length;
  const pdf = Buffer.from(`%PDF-1.4\n% test\n<< /Keywords (LB-A-2026-001 v1 ${s.agreement.signed.fingerprint}) >>\n`).toString('base64');
  assert.equal((await call('agreement.pdf', { id, token, v: 1, pdf: Buffer.from('%PDF-1.4 other').toString('base64') })).code, 'bad_request');
  assert.equal((await call('agreement.pdf', { id, token, v: 1, pdf: Buffer.from('hello').toString('base64') })).code, 'bad_request');
  const p = await call('agreement.pdf', { id, token, v: 1, pdf });
  assert.ok(p.emailed);
  const mails = (await outbox()).slice(before);
  assert.deepEqual(mails.map((m) => m.to).sort(), ['hello@lavibachchis.com', 'sam@example.com']);
  assert.ok(mails.every((m) => m.attachments.length === 1 && m.attachments[0].name.startsWith('LB-A-2026-001 v1')));
  assert.ok((await call('agreement.pdf', { id, token, v: 1, pdf })).already);

  // Fingerprint verifies
  const v = await admin('admin.agreement.verify', { id, v: 1 });
  assert.ok(v.ok && v.fingerprint === s.agreement.signed.fingerprint);
});

test('monthly invoices: issued at the end of each cycle, emailed, idempotent', async () => {
  await setNow('2026-11-14T09:00:00Z');
  assert.deepEqual((await job()).issued, []);
  await setNow('2026-11-15T08:00:00Z');
  const s = await job();
  assert.deepEqual(s.issued, ['LB-INV-2026-0001']);
  assert.deepEqual((await job()).issued, []);
  const ov = await admin('admin.overview');
  const inv = ov.invoices.find((i) => i.number === 'LB-INV-2026-0001');
  assert.equal(inv.amount, 75000);
  assert.equal(inv.dueDate, '2026-11-22');
  assert.equal(inv.issueDate, '2026-11-15');
  const m = (await outbox()).at(-1);
  assert.equal(m.to, 'sam@example.com');
  assert.equal(m.cc, 'hello@lavibachchis.com');
  assert.match(m.subject, /Invoice LB-INV-2026-0001 from Lavi Bachchis, £750\.00 due 22 November 2026/);
  // client view of the invoice
  const full = await admin('admin.invoice.get', { id: inv.id });
  const [iid, itok] = full.link.split('#')[1].split('.');
  const cv = await call('invoice.get', { id: iid, token: itok });
  assert.equal(cv.invoice.billTo.company, 'Example Studio Ltd');
  assert.equal(cv.invoice.token, undefined);
  assert.equal(cv.invoice.payment.sortCode, '00-00-00');
  const paid = await admin('admin.invoice.update', { id: inv.id, op: 'paid', date: '2026-11-20' });
  assert.equal(paid.invoice.status, 'paid');
});

test('amendment: client sees changes, signs, new fee from next cycle', async () => {
  await setNow('2026-11-20T10:00:00Z');
  let r = await admin('admin.agreement.amend', { id: rec.id });
  assert.ok(r.ok, r.error);
  assert.equal(r.agreement.versions.length, 2);
  const v2 = r.agreement.versions[1];
  assert.equal(v2.effectiveFrom, '2026-12-16');
  // not visible to client while draft
  assert.equal((await call('agreement.get', rec)).agreement.pending, undefined);
  r = await admin('admin.agreement.save', { id: rec.id, v: 2, terms: { ...v2.terms, fee: 98900, specialTerms: 'Two extra Reels in December.' }, offer: true });
  assert.ok(r.ok, r.error);
  const sent = await admin('admin.agreement.sendLink', { id: rec.id, message: 'As discussed on our call.' });
  assert.equal(sent.sentTo, 'sam@example.com');
  const g = await call('agreement.get', rec);
  assert.deepEqual(g.agreement.pending.amendment.changes, ['Monthly fee: £750.00 → £989.00', 'Wording changed in “Fees and payment”', 'Wording changed in “Special terms we agreed”']);
  assert.equal(g.agreement.clientType, 'business');
  const s = await call('agreement.sign', { ...rec, v: 2, rev: g.agreement.pending.rev, client: g.agreement.pending.prefill, consents: { agree: true, esign: true, authority: true }, signature: { method: 'type', name: 'Sam Example' } });
  assert.ok(s.ok, s.error);
  assert.equal(s.agreement.signed.v, 2);
  assert.equal(s.agreement.signed.doc.amendment.effectiveFrom, '2026-12-16');
  assert.equal(s.agreement.startDate, '2026-10-16');
  await setNow('2026-12-15T08:00:00Z');
  await job();
  await setNow('2027-01-15T08:00:00Z');
  await job();
  const ov = await admin('admin.overview');
  const mine = ov.invoices.filter((i) => i.agreementRef === 'LB-A-2026-001').map((i) => [i.number, i.amount]);
  assert.deepEqual(mine, [['LB-INV-2026-0001', 75000], ['LB-INV-2026-0002', 75000], ['LB-INV-2027-0001', 98900]]);
});

test('ending: notice, final part-month invoice, then ended', async () => {
  await setNow('2027-01-20T10:00:00Z');
  const r = await admin('admin.agreement.end', { id: rec.id, noticeDate: '2027-01-20', by: 'client', notify: true });
  assert.equal(r.agreement.ending.endDate, '2027-02-19');
  assert.deepEqual(r.upcoming.map((u) => [u.kind, u.periodStart, u.periodEnd]), [['cycle', '2027-01-16', '2027-02-15'], ['final', '2027-02-16', '2027-02-19']]);
  await setNow('2027-02-19T08:00:00Z');
  const s = await job(); // catches up: the 15 Feb cycle invoice (job didn't run that day) and the final one
  assert.equal(s.issued.length, 2);
  const ov = await admin('admin.overview');
  const last = ov.invoices.at(-1);
  assert.equal(last.amount, Math.round(98900 * 4 / 28)); // 16 to 19 Feb of a 28-day cycle
  await setNow('2027-02-20T08:00:00Z');
  assert.deepEqual((await job()).ended, ['LB-A-2026-001']);
  await setNow('2027-04-20T08:00:00Z');
  assert.deepEqual((await job()).issued, []);
});

test('one-off project: 50% deposit on signing, balance at the end, consumer rights', async () => {
  await setNow('2027-03-01T10:00:00Z');
  const terms = { region: 'uk', type: 'project', packageName: 'Custom', items: [{ label: 'Launch campaign', value: '10 posts, 2 emails' }], fee: 150000, client: { email: 'pat@example.org' } };
  const r = await admin('admin.agreement.save', { terms, offer: true });
  const [id, token] = r.link.split('#')[1].split('.');
  const g = await call('agreement.get', { id, token });
  assert.equal(g.agreement.pending.datePreview.consumer.startDate, '2027-03-16');
  const s = await call('agreement.sign', { id, token, v: 1, rev: g.agreement.pending.rev, clientType: 'consumer',
    client: { name: 'Pat Person', email: 'pat@example.org', address: '2 Home Lane, Leeds' }, consents: { agree: true, esign: true, earlyStart: true },
    signature: { method: 'type', name: 'pat person' } });
  assert.ok(s.ok, s.error);
  assert.equal(s.agreement.startDate, '2027-03-01');
  const t = s.agreement.signed.doc.sections.flatMap((x) => x.items.map((i) => i.text)).join(' ');
  assert.match(t, /cancel within 14 days of signing \(until 15 March 2027\)/);
  assert.equal(s.agreement.signed.doc.annex.length, 1);
  let ov = await admin('admin.overview');
  const dep = ov.invoices.filter((i) => i.agreementId === id);
  assert.deepEqual(dep.map((i) => [i.key, i.amount, i.dueDate]), [['deposit', 75000, '2027-03-08']]);
  await setNow('2027-03-31T08:00:00Z');
  await job();
  ov = await admin('admin.overview');
  assert.deepEqual(ov.invoices.filter((i) => i.agreementId === id).map((i) => [i.key, i.amount]), [['deposit', 75000], ['balance', 75000]]);
  // Signed-copy email fallback (no PDF was uploaded for this one): a copy made on the server is attached
  const fb = (await outbox()).find((m) => m.subject.includes('Signed: your agreement') && m.to === 'pat@example.org');
  assert.ok(fb && fb.attachments.length === 1 && fb.attachments[0].name.endsWith('signed.pdf'));
});

test('test agreements use T numbers; manual invoice; void', async () => {
  const r = await admin('admin.agreement.save', { terms: { type: 'recurring', fee: 1000, items: [{ label: 'Test', value: '1' }] }, test: true });
  assert.equal(r.agreement.ref, 'LB-A-2027-T01');
  assert.equal(r.agreement.status, 'draft');
  const [id, token] = r.link.split('#')[1].split('.');
  assert.equal((await call('agreement.sign', { id, token, v: 1, rev: 1 })).code, 'not_open');
  const ov = await admin('admin.overview');
  const ag = ov.agreements.find((a) => a.ref === 'LB-A-2026-001');
  const m = await admin('admin.invoice.manual', { agreementId: ag.id, lines: [{ text: 'Extra photoshoot day', amount: '250' }], dueDays: 14, send: false });
  assert.ok(m.ok, m.error);
  assert.equal(m.invoice.amount, 25000);
  const v = await admin('admin.invoice.update', { id: m.invoice.id, op: 'void', reason: 'Raised in error' });
  assert.equal(v.invoice.status, 'void');
  assert.equal((await admin('admin.invoice.update', { id: m.invoice.id, op: 'paid' })).code, 'bad_request');
});

test('edge cases: formula-safe Sheet, 100% deposit, cancelled deposit, US consumer', async () => {
  await setNow('2027-05-03T10:00:00Z');
  const mk = async (terms) => { const r = await admin('admin.agreement.save', { terms, offer: true }); assert.ok(r.ok, r.error); const [id, token] = r.link.split('#')[1].split('.'); return { id, token, g: await call('agreement.get', { id, token }) }; };
  const sign = (x, clientType, client, extra = {}) => call('agreement.sign', { id: x.id, token: x.token, v: 1, rev: x.g.agreement.pending.rev, clientType, client, consents: { agree: true, esign: true, authority: clientType === 'business', ...extra }, signature: { method: 'type', name: client.name } });

  // A name that looks like a formula is stored as text in the Sheet
  const f = await mk({ type: 'project', fee: 100000, depositPercent: 100, items: [{ label: 'Logo', value: '1' }] });
  const s1 = await sign(f, 'business', { name: '=HYPERLINK("http://x")', role: 'Owner', company: '+Evil Co', email: 'x@example.com', address: '1 Road, Town' });
  assert.ok(s1.ok, s1.error);
  const state = await (await fetch(`${BASE}/__test/state`)).json();
  const tab = Object.values(state.sheets)[0].tabs.Agreements;
  const row = tab.find((r) => r.includes(f.id));
  assert.ok(row.includes("'=HYPERLINK(\"http://x\")") && row.includes("'+Evil Co"));
  // 100% deposit: one invoice for the full fee, no £0 balance at the end
  await setNow('2027-06-03T08:00:00Z');
  await job();
  let ov = await admin('admin.overview');
  assert.deepEqual(ov.invoices.filter((i) => i.agreementId === f.id).map((i) => [i.key, i.amount]), [['deposit', 100000]]);

  // Cancelled deposit isn't deducted from the balance
  await setNow('2027-06-04T10:00:00Z');
  const d = await mk({ type: 'project', fee: 50000, items: [{ label: 'Campaign', value: '1' }] });
  assert.ok((await sign(d, 'business', { name: 'Dee Client', role: 'Owner', company: 'Dee Ltd', email: 'dee@example.com', address: '2 Road, Town' })).ok);
  ov = await admin('admin.overview');
  const dep = ov.invoices.find((i) => i.agreementId === d.id && i.key === 'deposit');
  await admin('admin.invoice.update', { id: dep.id, op: 'void', reason: 'Paid in cash upfront, billing in full later' });
  await setNow('2027-07-04T08:00:00Z');
  await job();
  ov = await admin('admin.overview');
  assert.equal(ov.invoices.find((i) => i.agreementId === d.id && i.key === 'balance').amount, 50000);

  // US individual: cancellation rights, early start allowed
  const u = await mk({ region: 'us', type: 'recurring', currency: 'USD', fee: 90000, clientTypes: 'either', items: [{ label: 'Posts', value: '12' }] });
  const su = await sign(u, 'consumer', { name: 'Uma User', email: 'uma@example.com', address: '5 Main St, Austin TX 78701' }, { earlyStart: true });
  assert.ok(su.ok, su.error);
  assert.equal(su.agreement.startDate, '2027-07-04');
  const t = su.agreement.signed.doc.sections.flatMap((x) => x.items.map((i) => i.text)).join(' ');
  assert.match(t, /You asked me to start work within the 14-day cancellation period/);
  assert.match(t, /certified alternative dispute resolution/);
  assert.doesNotMatch(t, /sharing the cost equally/);
  assert.equal(su.agreement.signed.doc.annex.length, 1);
});
