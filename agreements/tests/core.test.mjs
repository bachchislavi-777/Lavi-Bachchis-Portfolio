// Unit tests for the shared rules: dates, money, wording and the invoice schedule.
// Run: npm run agreements:test
import test from 'node:test';
import assert from 'node:assert/strict';
import { dates, money, terms as T, schedule as S, PACKAGES } from '../core/index.js';

test('dates: month arithmetic clamps to month end', () => {
  assert.equal(dates.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(dates.addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(dates.addMonths('2026-10-16', 3), '2027-01-16');
  assert.equal(dates.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dates.format('2026-10-16', 'uk'), '16 October 2026');
  assert.equal(dates.format('2026-10-16', 'us'), 'October 16, 2026');
});

test('dates: London calendar day across BST', () => {
  assert.equal(dates.londonDate(new Date('2026-10-16T23:30:00Z')), '2026-10-17'); // BST
  assert.equal(dates.londonDate(new Date('2026-12-16T23:30:00Z')), '2026-12-16'); // GMT
  assert.equal(dates.londonDateTime(new Date('2026-10-25T00:30:00Z')), '2026-10-25 01:30');
  assert.equal(dates.londonDateTime(new Date('2026-10-25T01:30:00Z')), '2026-10-25 01:30');
});

test('money', () => {
  assert.equal(money.format(72000, 'GBP'), '£720.00');
  assert.equal(money.format(123456789, 'USD'), '$1,234,567.89');
  assert.equal(money.parse('£1,234.5'), 123450);
  assert.ok(Number.isNaN(money.parse('12.345')));
  assert.equal(money.percent(98900, 50), 49450);
  assert.equal(money.percent(1001, 50), 501);
});

test('packages come from the website', () => {
  assert.deepEqual(PACKAGES.map((p) => [p.name, p.gbp]), [['Social', 389], ['Content', 720], ['Full content desk', 989]]);
});

const content = PACKAGES[1];
const signed = (terms, signDate, extra = {}) => {
  const kd = T.keyDates(terms, signDate, extra);
  return {
    id: 'a1', status: 'signed', startDate: kd.startDate, endDate: kd.endDate,
    versions: [{ v: 1, terms, effectiveFrom: kd.startDate, signed: { date: signDate, at: `${signDate}T12:00:00Z` } }],
  };
};

test('wording: recurring business agreement matches the agreed sample', () => {
  const t = T.defaultTerms({ pkg: content });
  const doc = T.resolveDoc(T.buildDoc(t, { ref: 'LB-A-2026-001' }), { clientType: 'business', ...T.keyDates(t, '2026-10-16') });
  const text = doc.sections.flatMap((s) => s.items.map((i) => i.text)).join('\n');
  assert.match(text, /starting on the date this agreement is signed \(16 October 2026\)\. I invoice £720\.00 at the end of each billing cycle, and payment is due within 7 days/);
  assert.match(text, /Late Payment of Commercial Debts/);
  assert.doesNotMatch(text, /Consumer Rights Act/);
  assert.doesNotMatch(text, /\{\{/);
  assert.equal(doc.annex.length, 0);
  assert.equal(doc.pkg.fee, '£720.00');
});

test('wording: UK consumer gets cancellation rights, form and a later start', () => {
  const t = T.defaultTerms({ pkg: content });
  const kd = T.keyDates(t, '2026-10-16', { clientType: 'consumer' });
  assert.equal(kd.startDate, '2026-10-31');
  const early = T.keyDates(t, '2026-10-16', { clientType: 'consumer', earlyStart: true });
  assert.equal(early.startDate, '2026-10-16');
  const doc = T.resolveDoc(T.buildDoc(t, { ref: 'X' }), { clientType: 'consumer', ...kd });
  const text = doc.sections.flatMap((s) => s.items.map((i) => i.text)).join('\n');
  assert.match(text, /Consumer Rights Act 2015/);
  assert.match(text, /until 30 October 2026/);
  assert.doesNotMatch(text, /Late Payment/);
  assert.doesNotMatch(text, /limited to the fees/);
  assert.equal(doc.annex.length, 1);
});

test('wording: project with deposit, US spelling, edits, removals and special terms', () => {
  const t = { ...T.defaultTerms({ region: 'us', type: 'project', currency: 'USD' }), fee: 150000,
    overrides: { 'you.rights': '', 'data.tools': 'I use no AI tools for this project.' },
    extra: { you: ['Access to your Shopify admin.'] }, specialTerms: '- Three rounds of changes on the launch video.\n- Weekly call on Mondays.' };
  const kd = T.keyDates(t, '2026-10-16');
  assert.equal(kd.endDate, '2026-11-15');
  const doc = T.resolveDoc(T.buildDoc(t, { ref: 'X' }), { clientType: 'business', ...kd });
  const all = doc.sections.flatMap((s) => s.items);
  const text = all.map((i) => i.text).join('\n');
  assert.match(text, /The project fee is \$1,500\.00\. I invoice 50% \(\$750\.00\) when you sign/);
  assert.match(text, /end of the project on November 15, 2026/);
  assert.match(text, /license/);
  assert.ok(!all.some((i) => i.id === 'you.rights'));
  assert.ok(all.find((i) => i.id === 'data.tools').edited);
  assert.ok(all.some((i) => i.text === 'Access to your Shopify admin.'));
  assert.deepEqual(doc.sections.at(-1).items.map((i) => i.text), ['Three rounds of changes on the launch video.', 'Weekly call on Mondays.']);
});

test('schedule: recurring invoices at the end of each cycle, idempotent', () => {
  const t = T.defaultTerms({ pkg: content });
  const a = signed(t, '2026-10-16');
  assert.equal(S.expectedInvoices(a, { today: '2026-11-14' }).length, 0);
  const due = S.expectedInvoices(a, { today: '2026-11-15' });
  assert.equal(due.length, 1);
  assert.deepEqual([due[0].key, due[0].periodStart, due[0].periodEnd, due[0].dueDate, due[0].amount], ['cycle-1', '2026-10-16', '2026-11-15', '2026-11-22', 72000]);
  const issued = due.map((d) => ({ ...d, agreementId: 'a1', status: 'issued' }));
  assert.equal(S.missingInvoices(a, issued, '2026-11-20').length, 0);
  assert.equal(S.missingInvoices(a, issued, '2026-12-15')[0].key, 'cycle-2');
});

test('schedule: ending a recurring agreement bills the last part-month pro rata', () => {
  const t = T.defaultTerms({ pkg: content });
  const a = { ...signed(t, '2026-10-16'), ending: { noticeDate: '2026-11-01', endDate: S.noticeEndDate(t, '2026-11-01') } };
  assert.equal(a.ending.endDate, '2026-12-01');
  const all = S.expectedInvoices(a, { today: '2027-06-01' });
  assert.deepEqual(all.map((i) => [i.key, i.kind, i.periodEnd, i.amount]), [
    ['cycle-1', 'cycle', '2026-11-15', 72000],
    ['cycle-2', 'final', '2026-12-01', Math.round(72000 * 16 / 30)],
  ]);
});

test('schedule: amendment fee applies from its effective date', () => {
  const t = T.defaultTerms({ pkg: content });
  const a = signed(t, '2026-10-16');
  a.versions.push({ v: 2, terms: { ...t, fee: 98900 }, effectiveFrom: '2026-11-16', signed: { date: '2026-11-05' } });
  const all = S.expectedInvoices(a, { today: '2026-12-15' });
  assert.deepEqual(all.map((i) => i.amount), [72000, 98900]);
});

test('schedule: project deposit on signing, balance at the end net of deposit', () => {
  const t = { ...T.defaultTerms({ type: 'project' }), fee: 100001 };
  const a = signed(t, '2026-10-16');
  const now = S.expectedInvoices(a, { today: '2026-10-16' });
  assert.deepEqual(now.map((i) => [i.key, i.amount, i.dueDate]), [['deposit', 50001, '2026-10-23']]);
  const issued = now.map((d) => ({ ...d, agreementId: 'a1', status: 'issued' }));
  a.versions.push({ v: 2, terms: { ...t, fee: 120000 }, effectiveFrom: '2026-10-20', signed: { date: '2026-10-20' } });
  const later = S.missingInvoices(a, issued, '2026-11-15');
  assert.deepEqual(later.map((i) => [i.key, i.amount]), [['balance', 120000 - 50001]]);
  a.balanceIssueDate = '2026-11-01';
  assert.equal(S.missingInvoices(a, issued, '2026-11-01')[0].issueDate, '2026-11-01');
  a.ending = { endDate: '2026-10-25' };
  assert.equal(S.missingInvoices(a, issued, '2026-12-01').length, 0);
});

test('amendment diff in plain words', () => {
  const t = T.defaultTerms({ pkg: content });
  const kd = T.keyDates(t, '2026-10-16');
  const r = (x) => T.resolveDoc(T.buildDoc(x, { ref: 'X' }), { clientType: 'business', ...kd });
  const d = T.diffDocs(r(t), r({ ...t, fee: 80000, items: [...t.items, { label: 'Reels', value: '2' }], overrides: { 'data.tools': 'No AI.' } }));
  assert.deepEqual(d, ['Monthly fee: £720.00 → £800.00', 'Added to the package: Reels, 2', 'Wording changed in “Fees and payment”', 'Wording changed in “Results, confidentiality and data”']);
});
