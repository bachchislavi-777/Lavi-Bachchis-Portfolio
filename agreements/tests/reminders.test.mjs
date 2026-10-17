// Automatic invoicing and payment reminders, end to end: signing, then the daily job day by day across months
// with the test clock. Also the pure rules in core/reminders.js.
// Run: npm run -s agreements:build && node --test --test-concurrency=1 agreements/tests/reminders.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as R from '../core/reminders.js';
import { addDays } from '../core/dates.js';

// ---------------------------------------------------------------------------------------------------------
// Unit: core/reminders.js
// ---------------------------------------------------------------------------------------------------------
const inv = (x = {}) => ({ status: 'issued', dueDate: '2026-11-22', sentAt: '2026-11-15T08:00:00.000Z', ...x });
const d = (n) => addDays('2026-11-22', n);

test('reminders: schedule 1, 7 and 14 days after the due date', () => {
  assert.deepEqual(R.SCHEDULE, [1, 7, 14]);
  assert.deepEqual(R.reminderDates(inv()), ['2026-11-23', '2026-11-29', '2026-12-06']);
  assert.deepEqual(R.reminderDates({}), []);
  assert.equal(R.reminderDue(inv(), d(0)), 0);
  assert.equal(R.reminderDue(inv(), d(1)), 1);
  assert.equal(R.reminderDue(inv({ autoReminders: 1, reminders: [{ at: `${d(1)}T08:00:00Z`, stage: 1, auto: true }] }), d(6)), 0);
  assert.equal(R.reminderDue(inv({ autoReminders: 1, reminders: [{ at: `${d(1)}T08:00:00Z`, stage: 1, auto: true }] }), d(7)), 2);
  assert.equal(R.reminderDue(inv({ autoReminders: 2, reminders: [{ at: `${d(7)}T08:00:00Z`, stage: 2, auto: true }] }), d(14)), 3);
  assert.equal(R.reminderDue(inv({ autoReminders: 3, reminders: [{ at: `${d(14)}T08:00:00Z`, stage: 3, auto: true }] }), d(20)), 0);
});

test('reminders: never for paid, void or undated invoices', () => {
  for (const status of ['paid', 'void', 'draft', '']) assert.equal(R.reminderDue(inv({ status }), d(1)), 0, status);
  assert.equal(R.reminderDue(inv({ dueDate: '' }), d(1)), 0);
  assert.equal(R.reminderDue(null, d(1)), 0);
  assert.equal(R.reminderDue(inv(), ''), 0);
});

test('reminders: same stage never twice (job runs twice)', () => {
  const after1 = inv({ autoReminders: 1, reminders: [{ at: `${d(1)}T07:00:00Z`, stage: 1, auto: true }] });
  assert.equal(R.reminderDue(after1, d(1)), 0);
  assert.equal(R.reminderDue(after1, d(5)), 0);
});

test('reminders: catch-up sends only the latest stage reached', () => {
  assert.equal(R.reminderDue(inv(), d(8)), 2);
  assert.equal(R.reminderDue(inv(), d(15)), 3);
  assert.equal(R.reminderDue(inv({ autoReminders: 1, reminders: [{ at: `${d(1)}T08:00:00Z`, stage: 1, auto: true }] }), d(15)), 3);
});

test('reminders: at least 3 days after a manual reminder, counted in London days', () => {
  const manual = inv({ reminders: [{ at: `${d(5)}T10:00:00Z`, auto: false }], reminderSentAt: `${d(5)}T10:00:00Z` });
  assert.equal(R.reminderDue(manual, d(7)), 0);
  assert.equal(R.reminderDue(manual, d(8)), 2);
  // 23:30 UTC on 21 Oct is already 22 Oct in London (BST): the gap runs from 22 Oct
  const late = { status: 'issued', dueDate: '2026-10-20', reminders: [{ at: '2026-10-21T23:30:00.000Z', auto: false }] };
  assert.equal(R.reminderDue(late, '2026-10-24'), 0);
  assert.equal(R.reminderDue(late, '2026-10-25'), 1);
  // legacy single field from before reminders were listed
  assert.equal(R.reminderDue(inv({ reminderSentAt: `${d(0)}T12:00:00Z` }), d(1)), 0);
  assert.equal(R.reminderDue(inv({ reminderSentAt: `${d(0)}T12:00:00Z` }), d(3)), 1);
});

test('reminders: not on the same morning as an invoice that went out late', () => {
  const lateInvoice = inv({ sentAt: `${d(2)}T08:00:00Z` }); // issued after the job was down: already overdue
  assert.equal(R.reminderDue(lateInvoice, d(2)), 0);
  assert.equal(R.reminderDue(lateInvoice, d(4)), 0);
  assert.equal(R.reminderDue(lateInvoice, d(5)), 1);
});

test('reminders: very old unpaid invoices are not chased automatically', () => {
  assert.equal(R.reminderDue(inv(), d(R.MAX_OVERDUE_DAYS)), 3);
  assert.equal(R.reminderDue(inv(), d(R.MAX_OVERDUE_DAYS + 1)), 0);
  assert.equal(R.reminderDue(inv(), d(400)), 0);
});

// ---------------------------------------------------------------------------------------------------------
// End to end against the local backend
// ---------------------------------------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8794;
const BASE = `http://localhost:${PORT}`;
const OWNER = 'hello@lavibachchis.com';
let srv;

const call = async (action, body = {}) => (await fetch(`${BASE}/exec`, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...body }) })).json();
const outbox = async () => (await fetch(`${BASE}/__test/outbox`)).json();
const html = async (n) => (await fetch(`${BASE}/__test/outbox?n=${n}`)).text();
const setNow = (iso) => fetch(`${BASE}/__test/clock`, { method: 'POST', body: JSON.stringify({ now: iso }) });
const job = async () => (await fetch(`${BASE}/__test/job`, { method: 'POST' })).json();
let session;
async function signIn() {
  await call('admin.code');
  const code = /code: ([A-Z2-9]{8})/.exec((await outbox()).at(-1).subject)[1];
  session = (await call('admin.login', { code })).session;
}
async function admin(action, body = {}) {
  let r = await call(action, { session, ...body });
  if (r.code === 'auth') { await signIn(); r = await call(action, { session, ...body }); }
  return r;
}

// Every email, tagged with the (test-clock) London day it went out.
const sent = [];
let seen = 0;
async function collect(day) { const all = await outbox(); for (const m of all.slice(seen)) sent.push({ ...m, day }); seen = all.length; }
async function at(day, fn = async () => {}) { await setNow(`${day}T08:00:00Z`); const r = await fn(); await collect(day); return r; }
const daysBetween = (from, to) => { const out = []; for (let x = from; x <= to; x = addDays(x, 1)) out.push(x); return out; };
async function runJobs(from, to) { const out = []; for (const day of daysBetween(from, to)) { const s = await at(day, job); assert.deepEqual(s.errors, [], `${day}: ${s.errors}`); out.push({ day, ...s }); } return out; }

// Client emails about invoice `number` (excluding Lavi's copies)
const toClient = (number) => sent.filter((m) => m.subject.includes(`Invoice ${number} `) && !m.subject.startsWith('Copy:'));
const reminders = (number) => toClient(number).filter((m) => /reminder: /i.test(m.subject));
const remindersOn = (day) => sent.filter((m) => m.day === day && /reminder: /i.test(m.subject) && !m.subject.startsWith('Copy:'));

async function mkSigned({ terms, client, test: isTest = false }) {
  const r = await admin('admin.agreement.save', { terms, offer: true, test: isTest });
  assert.ok(r.ok, r.error);
  const [id, token] = r.link.split('#')[1].split('.');
  const g = await call('agreement.get', { id, token });
  const s = await call('agreement.sign', { id, token, v: 1, rev: g.agreement.pending.rev, clientType: 'business', client, consents: { agree: true, esign: true, authority: true }, signature: { method: 'type', name: client.name }, ua: 'test' });
  assert.ok(s.ok, s.error);
  return { id, token, ref: r.agreement.ref };
}
const invoicesOf = async (id) => (await admin('admin.agreement.get', { id })).invoices;
const byKey = async (id, key) => (await invoicesOf(id)).find((i) => i.key === key);

before(async () => {
  srv = spawn(process.execPath, [join(here, '..', 'local', 'server.mjs'), '--fresh'], { env: { ...process.env, PORT: String(PORT), LB_DATA_DIR: mkdtempSync(join(tmpdir(), 'lb-rem-')) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok, fail) => { srv.stdout.on('data', (x) => String(x).includes('LB Agreements') && ok()); srv.on('exit', (c) => fail(new Error(`local backend stopped (${c})`))); });
  await setNow('2026-10-16T11:00:00Z');
  await signIn();
  const st = await admin('admin.settings.save', { settings: { business: { address: '1 Example Road\nLondon N1 1AA' }, payment: { accountName: 'Lavi Bachchis', sortCode: '00-00-00', accountNumber: '12345678' } } });
  assert.equal(st.settings.invoices.autoReminders, true, 'automatic reminders are on by default');
  assert.equal(st.settings.invoices.copyMe, true);
  seen = (await outbox()).length;
});
after(() => srv && srv.kill());

let monthly, project, testProject;

test('signing a one-off project issues the 50% deposit and emails it to the client alone, plus a Copy to Lavi', async () => {
  monthly = await at('2026-10-16', () => mkSigned({
    terms: { region: 'uk', type: 'recurring', packageName: 'Custom', items: [{ label: 'Social posts', value: '12 a month' }], fee: 72000, currency: 'GBP', client: { email: 'mo@example.com' } },
    client: { name: 'Mo Monthly', role: 'Director', company: 'Monthly Ltd', email: 'mo@example.com', address: '1 Cycle Street, London' },
  }));
  assert.deepEqual(await invoicesOf(monthly.id), [], 'monthly agreements are invoiced at the end of each cycle');

  project = await at('2026-10-20', () => mkSigned({
    terms: { region: 'uk', type: 'project', packageName: 'Custom', items: [{ label: 'Launch campaign', value: '10 posts' }], fee: 150000, currency: 'GBP', client: { email: 'pia@example.com' } },
    client: { name: 'Pia Project', role: 'Owner', company: 'Project Co', email: 'pia@example.com', billingEmail: 'accounts@project.example', address: '2 Launch Road, Leeds' },
  }));
  testProject = await at('2026-10-20', () => mkSigned({
    test: true,
    terms: { region: 'uk', type: 'project', packageName: 'Custom', items: [{ label: 'Trial', value: '1' }], fee: 20000, currency: 'GBP', client: { email: 'tess@example.com' } },
    client: { name: 'Tess Test', role: 'Owner', company: 'Test Co', email: 'tess@example.com', address: '3 Trial Lane, York' },
  }));

  const dep = await byKey(project.id, 'deposit');
  assert.equal(dep.amount, 75000);
  assert.equal(dep.issueDate, '2026-10-20');
  assert.equal(dep.dueDate, '2026-10-27');
  const mails = sent.filter((m) => m.subject.includes(`Invoice ${dep.number} `));
  assert.equal(mails.length, 2);
  assert.equal(mails[0].to, 'accounts@project.example', 'the invoice goes to the billing email');
  assert.equal(mails[0].cc, '');
  assert.equal(mails[0].subject, `Invoice ${dep.number} from Lavi Bachchis, £750.00 due 27 October 2026`);
  assert.equal(mails[1].to, OWNER);
  assert.equal(mails[1].cc, '');
  assert.equal(mails[1].subject, `Copy: ${mails[0].subject}`);

  const tdep = await byKey(testProject.id, 'deposit');
  assert.match(tdep.number, /^LB-INV-2026-T\d{3}$/);
  const tm = sent.filter((m) => m.subject.includes(`Invoice ${tdep.number} `));
  assert.deepEqual(tm.map((m) => [m.to, m.subject]), [
    ['tess@example.com', `[TEST] Invoice ${tdep.number} from Lavi Bachchis, £100.00 due 27 October 2026`],
    [OWNER, `Copy: [TEST] Invoice ${tdep.number} from Lavi Bachchis, £100.00 due 27 October 2026`],
  ]);
});

test('unpaid deposit: reminders on due+1, +7 and +14, escalating, never twice even if the job runs twice', async () => {
  await runJobs('2026-10-21', '2026-10-28');
  const again = await at('2026-10-28', job); // a second run the same day
  assert.deepEqual(again.reminded, []);
  await runJobs('2026-10-29', '2026-11-14');
  const dep = await byKey(project.id, 'deposit');
  const r = reminders(dep.number);
  assert.deepEqual(r.map((m) => [m.day, m.to, m.subject]), [
    ['2026-10-28', 'accounts@project.example', `Reminder: Invoice ${dep.number} from Lavi Bachchis, £750.00 was due 27 October 2026`],
    ['2026-11-03', 'accounts@project.example', `Second reminder: Invoice ${dep.number} from Lavi Bachchis, £750.00 was due 27 October 2026`],
    ['2026-11-10', 'accounts@project.example', `Final reminder: Invoice ${dep.number} from Lavi Bachchis, £750.00 was due 27 October 2026`],
  ]);
  for (const m of r) {
    assert.equal(m.cc, '');
    const copies = sent.filter((x) => x.subject === `Copy: ${m.subject}`);
    assert.deepEqual(copies.map((x) => [x.to, x.day]), [[OWNER, m.day]], 'Lavi gets one separate copy');
  }
  const [h1, h2, h3] = await Promise.all(r.map((m) => html(m.n)));
  assert.match(h1, /A friendly reminder that invoice/);
  assert.doesNotMatch(h1, /pause work/);
  assert.match(h2, /is now 7 days overdue/);
  assert.doesNotMatch(h2, /pause work/);
  assert.match(h3, /Final reminder: invoice/);
  assert.match(h3, /is now 14 days overdue/);
  assert.match(h3, /more than 14 days overdue, I may pause work after telling you in writing/);
  assert.match(h3, /Sort code/);

  // the test project's deposit is chased too, tagged [TEST]
  const tdep = await byKey(testProject.id, 'deposit');
  assert.deepEqual(reminders(tdep.number).map((m) => [m.day, m.subject.split(' Invoice ')[0]]), [['2026-10-28', '[TEST] Reminder:'], ['2026-11-03', '[TEST] Second reminder:'], ['2026-11-10', '[TEST] Final reminder:']]);
  assert.ok(sent.some((m) => m.to === OWNER && m.subject.startsWith('Copy: [TEST] Final reminder:')));
});

test('client view of an invoice shows no reminder history or tokens', async () => {
  const dep = await byKey(project.id, 'deposit');
  const full = await admin('admin.invoice.get', { id: dep.id });
  assert.equal(full.invoice.reminders.length, 3);
  assert.equal(full.invoice.autoReminders, 3);
  const [iid, itok] = full.link.split('#')[1].split('.');
  const cv = await call('invoice.get', { id: iid, token: itok });
  assert.ok(cv.ok, cv.error);
  for (const k of ['token', 'reminders', 'autoReminders', 'reminderSentAt', 'events', 'sentAt', 'viewedAt', 'voidReason']) assert.equal(k in cv.invoice, false, k);
  assert.doesNotMatch(JSON.stringify(cv), new RegExp(`${itok}|stage|"auto"`));
  assert.equal(cv.invoice.amount, 75000);
  assert.equal((await call('invoice.get', { id: iid, token: 'x'.repeat(32) })).code, 'not_found');
});

test('monthly cycle invoice: exact amount, 7-day gap, no reminder after it is marked paid; void balance never chased', async () => {
  await runJobs('2026-11-15', '2026-11-15');
  const c1 = await byKey(monthly.id, 'cycle-1');
  assert.deepEqual([c1.amount, c1.issueDate, c1.dueDate], [72000, '2026-11-15', '2026-11-22']);
  const m = toClient(c1.number);
  assert.deepEqual(m.map((x) => [x.day, x.to, x.cc, x.subject]), [['2026-11-15', 'mo@example.com', '', `Invoice ${c1.number} from Lavi Bachchis, £720.00 due 22 November 2026`]]);
  assert.ok(sent.some((x) => x.to === OWNER && x.subject === `Copy: ${m[0].subject}`));

  await runJobs('2026-11-16', '2026-11-19');
  const bal = await byKey(project.id, 'balance');
  assert.deepEqual([bal.amount, bal.issueDate, bal.dueDate], [75000, '2026-11-19', '2026-11-26']);
  await runJobs('2026-11-20', '2026-11-23');
  assert.deepEqual(reminders(c1.number).map((x) => x.day), ['2026-11-23']);
  await at('2026-11-24', () => admin('admin.invoice.update', { id: c1.id, op: 'paid', date: '2026-11-24' }));
  await at('2026-11-25', () => admin('admin.invoice.update', { id: bal.id, op: 'void', reason: 'Billed differently' }));
  await runJobs('2026-11-24', '2026-12-14');
  assert.deepEqual(reminders(c1.number).map((x) => x.day), ['2026-11-23'], 'paid: no more reminders');
  assert.deepEqual(reminders(bal.number), [], 'void: never chased');
});

test('manual reminder from the studio, then the automatic one waits 3 days', async () => {
  await runJobs('2026-12-15', '2026-12-26');
  const c2 = await byKey(monthly.id, 'cycle-2');
  assert.deepEqual([c2.amount, c2.issueDate, c2.dueDate], [72000, '2026-12-15', '2026-12-22']);
  assert.deepEqual(reminders(c2.number).map((x) => x.day), ['2026-12-23']);
  const man = await at('2026-12-27', () => admin('admin.invoice.update', { id: c2.id, op: 'remind' }));
  assert.ok(man.ok, man.error);
  const runs = await runJobs('2026-12-27', '2027-01-10');
  assert.deepEqual(reminders(c2.number).map((x) => [x.day, x.subject.split(':')[0]]), [
    ['2026-12-23', 'Reminder'],
    ['2026-12-27', 'Reminder'], // manual
    ['2026-12-30', 'Second reminder'], // due+7 was 29 Dec, only 2 days after the manual one
    ['2027-01-05', 'Final reminder'],
  ]);
  assert.deepEqual(runs.filter((x) => x.reminded.length).map((x) => x.day), ['2026-12-30', '2027-01-05']);
});

test('catch-up after a missed week sends only the latest reminder', async () => {
  await runJobs('2027-01-11', '2027-01-22');
  const c3 = await byKey(monthly.id, 'cycle-3');
  assert.deepEqual([c3.amount, c3.issueDate, c3.dueDate], [72000, '2027-01-15', '2027-01-22']);
  // the job doesn't run from 23 to 29 January
  await runJobs('2027-01-30', '2027-02-14');
  assert.deepEqual(reminders(c3.number).map((x) => [x.day, x.subject.split(':')[0]]), [['2027-01-30', 'Second reminder'], ['2027-02-05', 'Final reminder']]);
  assert.equal(remindersOn('2027-01-30').length, 1, 'one email, not a burst');
});

test('automatic reminders switched off: none; switched back on: old invoices are not suddenly chased', async () => {
  const off = await at('2027-02-15', () => admin('admin.settings.save', { settings: { invoices: { autoReminders: false } } }));
  assert.equal(off.settings.invoices.autoReminders, false);
  const before = sent.length;
  const runs = await runJobs('2027-02-15', '2027-03-29');
  assert.ok(runs.every((x) => x.reminded.length === 0));
  assert.deepEqual(sent.slice(before).filter((m) => /reminder: /i.test(m.subject)), []);
  const c4 = await byKey(monthly.id, 'cycle-4');
  const c5 = await byKey(monthly.id, 'cycle-5');
  assert.deepEqual([c4.amount, c4.dueDate, c5.amount, c5.dueDate], [72000, '2027-02-22', 72000, '2027-03-22']);
  // the invoices themselves still went out
  assert.equal(toClient(c4.number).length, 1);
  assert.equal(toClient(c5.number).length, 1);

  await at('2027-03-30', () => admin('admin.settings.save', { settings: { invoices: { autoReminders: true } } }));
  const [on] = await runJobs('2027-03-30', '2027-03-30');
  assert.deepEqual(on.reminded, [c5.number], 'only the recently overdue invoice, once');
  assert.deepEqual(reminders(c5.number).map((x) => x.subject.split(':')[0]), ['Second reminder']);
  assert.deepEqual(reminders(c4.number), [], '36 days overdue: left for Lavi to chase by hand');
  // nothing else was re-sent for invoices already fully chased
  assert.equal(remindersOn('2027-03-30').length, 1);
});

test('nothing double-billed across the whole run', async () => {
  const all = (await admin('admin.overview')).invoices;
  const keys = all.filter((i) => i.key).map((i) => `${i.agreementId}:${i.key}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual((await invoicesOf(monthly.id)).map((i) => [i.key, i.amount]), [1, 2, 3, 4, 5].map((k) => [`cycle-${k}`, 72000]));
  // every client invoice email was sent once, on its issue date
  for (const i of all.filter((x) => x.agreementId === monthly.id)) assert.deepEqual(toClient(i.number).filter((m) => !/reminder: /i.test(m.subject)).map((m) => m.day), [i.issueDate]);
  // no client ever got two reminders within 3 days
  const byInv = {};
  for (const m of sent.filter((x) => /reminder: /i.test(x.subject) && !x.subject.startsWith('Copy:'))) (byInv[/Invoice (\S+)/.exec(m.subject)[1]] ||= []).push(m.day);
  for (const [n, days] of Object.entries(byInv)) for (let k = 1; k < days.length; k++) assert.ok(days[k] >= addDays(days[k - 1], 3), `${n}: ${days}`);
  // no alerts were needed
  assert.deepEqual(sent.filter((m) => m.subject.startsWith('Agreements: something needs a look')), []);
});
