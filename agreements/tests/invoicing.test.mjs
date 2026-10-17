// Invoicing audit: for every kind of agreement, the invoice amounts and dates worked out from the terms
// must match what the agreement wording promises. Pure tests (no backend).
// Run: node --test agreements/tests/core.test.mjs agreements/tests/invoicing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { dates, money, terms as T, schedule as S, PACKAGES } from '../core/index.js';

const content = PACKAGES[1]; // £720 a month

/** A signed agreement, as the backend stores it after the first signature. */
function signed(terms, signDate, extra = {}) {
  const kd = T.keyDates(terms, signDate, extra);
  return {
    id: 'a1', status: 'signed', startDate: kd.startDate, endDate: kd.endDate,
    versions: [{ v: 1, terms, effectiveFrom: kd.startDate, signed: { date: signDate, at: `${signDate}T12:00:00Z` } }],
  };
}
const amend = (a, terms, effectiveFrom, signDate) => {
  a.versions.push({ v: a.versions.length + 1, terms, effectiveFrom, signed: { date: signDate } });
  return a;
};
const issue = (list, extra = {}) => list.map((x) => ({ ...x, agreementId: 'a1', status: 'issued', ...extra }));
const row = (i) => [i.key, i.kind, i.periodStart, i.periodEnd, i.issueDate, i.dueDate, i.amount];
const monthly = (over = {}) => ({ ...T.defaultTerms({ pkg: content }), ...over });
const project = (over = {}) => ({ ...T.defaultTerms({ type: 'project' }), fee: 100000, ...over });

// ---------------------------------------------------------------------------------------------------------
// Monthly rolling agreements
// ---------------------------------------------------------------------------------------------------------

test('monthly: issued on the last day of each cycle, due 7 days later, fee every cycle', () => {
  const a = signed(monthly(), '2026-10-16');
  const all = S.expectedInvoices(a, { today: '2027-01-15' });
  assert.deepEqual(all.map(row), [
    ['cycle-1', 'cycle', '2026-10-16', '2026-11-15', '2026-11-15', '2026-11-22', 72000],
    ['cycle-2', 'cycle', '2026-11-16', '2026-12-15', '2026-12-15', '2026-12-22', 72000],
    ['cycle-3', 'cycle', '2026-12-16', '2027-01-15', '2027-01-15', '2027-01-22', 72000],
  ]);
  assert.equal(all[0].currency, 'GBP');
  assert.equal(all[0].lines[0].text, 'Content package: billing cycle 1, 16 Oct 2026 to 15 Nov 2026');
  assert.equal(all[0].lines[0].amount, 72000);
  // Nothing is invoiced before the cycle has ended.
  assert.equal(S.expectedInvoices(a, { today: '2027-01-14' }).length, 2);
});

test('monthly: due date = issue date + paymentDays (default 7, custom 14)', () => {
  const a = signed(monthly(), '2026-10-16');
  const [i] = S.expectedInvoices(a, { today: '2026-11-15' });
  assert.equal(dates.diffDays(i.issueDate, i.dueDate), 7);
  const b = signed(monthly({ paymentDays: 14 }), '2026-10-16');
  assert.equal(S.expectedInvoices(b, { today: '2026-11-15' })[0].dueDate, '2026-11-29');
});

test('monthly: starts on the 29th/30th/31st use the last day of shorter months', () => {
  const cyc = (start, n) => S.expectedInvoices(signed(monthly(), start), { today: dates.addMonths(start, n + 1) })
    .slice(0, n).map((i) => [i.periodStart, i.periodEnd]);
  assert.deepEqual(cyc('2027-01-31', 5), [
    ['2027-01-31', '2027-02-27'], ['2027-02-28', '2027-03-30'], ['2027-03-31', '2027-04-29'],
    ['2027-04-30', '2027-05-30'], ['2027-05-31', '2027-06-29'],
  ]);
  assert.deepEqual(cyc('2027-01-30', 2), [['2027-01-30', '2027-02-27'], ['2027-02-28', '2027-03-29']]);
  assert.deepEqual(cyc('2027-01-29', 2), [['2027-01-29', '2027-02-27'], ['2027-02-28', '2027-03-28']]);
  // Leap years
  assert.deepEqual(cyc('2028-01-31', 2), [['2028-01-31', '2028-02-28'], ['2028-02-29', '2028-03-30']]);
  assert.deepEqual(cyc('2028-01-29', 2), [['2028-01-29', '2028-02-28'], ['2028-02-29', '2028-03-28']]);
  const leap = cyc('2028-02-29', 13);
  assert.deepEqual(leap[0], ['2028-02-29', '2028-03-28']);
  assert.deepEqual(leap[11], ['2029-01-29', '2029-02-27']);
  assert.deepEqual(leap[12], ['2029-02-28', '2029-03-28']);
});

test('monthly: cycles are contiguous, never overlap or skip a day, over 3 years for every start day', () => {
  for (let d = 1; d <= 31; d++) {
    const start = `2027-01-${String(d).padStart(2, '0')}`;
    const all = S.expectedInvoices(signed(monthly(), start), { today: '2030-01-31' });
    assert.ok(all.length >= 36, start);
    assert.equal(all[0].periodStart, start);
    for (let k = 0; k < all.length; k++) {
      const i = all[k];
      assert.equal(i.key, `cycle-${k + 1}`);
      assert.equal(i.issueDate, i.periodEnd);
      assert.equal(i.dueDate, dates.addDays(i.issueDate, 7));
      assert.equal(i.amount, 72000);
      const len = dates.diffDays(i.periodStart, i.periodEnd) + 1;
      assert.ok(len >= 28 && len <= 31, `${start} cycle ${k + 1}: ${len} days`);
      if (k) assert.equal(i.periodStart, dates.addDays(all[k - 1].periodEnd, 1), `${start} cycle ${k + 1}`);
      // No drift: cycle k always starts on the start day (or the month's last day).
      assert.equal(i.periodStart, dates.addMonths(start, k));
    }
  }
});

// ---------------------------------------------------------------------------------------------------------
// Amendments
// ---------------------------------------------------------------------------------------------------------

test('amendment: new fee only from the cycle it takes effect, no double billing', () => {
  const t = monthly();
  const a = signed(t, '2026-10-16');
  const before = S.expectedInvoices(a, { today: '2026-12-15' });
  const issued = issue(before);
  amend(a, { ...t, fee: 98900, paymentDays: 10 }, '2026-12-16', '2026-12-01');
  const all = S.expectedInvoices(a, { today: '2027-02-15' });
  assert.deepEqual(all.map((i) => [i.key, i.version, i.amount, i.dueDate]), [
    ['cycle-1', 1, 72000, '2026-11-22'], ['cycle-2', 1, 72000, '2026-12-22'],
    ['cycle-3', 2, 98900, '2027-01-25'], ['cycle-4', 2, 98900, '2027-02-25'],
  ]);
  assert.deepEqual(S.missingInvoices(a, issued, '2027-01-15').map((i) => [i.key, i.amount]), [['cycle-3', 98900]]);
});

test('amendment: a "takes effect" date mid-cycle applies from the next cycle start', () => {
  const t = monthly();
  const a = amend(signed(t, '2026-10-16'), { ...t, fee: 98900 }, '2026-11-20', '2026-11-20');
  assert.deepEqual(S.expectedInvoices(a, { today: '2027-01-15' }).map((i) => i.amount), [72000, 72000, 98900]);
});

test('amendment: an already-issued cycle is never re-billed, even if an amendment reaches back', () => {
  const t = monthly();
  const a = signed(t, '2026-10-16');
  const issued = issue(S.expectedInvoices(a, { today: '2026-11-15' }));
  amend(a, { ...t, fee: 98900 }, '2026-10-16', '2026-11-16');
  assert.deepEqual(S.missingInvoices(a, issued, '2026-12-15').map((i) => [i.key, i.amount]), [['cycle-2', 98900]]);
});

test('amendment: several amendments, each from its own cycle', () => {
  const t = monthly();
  const a = signed(t, '2026-10-16');
  amend(a, { ...t, fee: 80000 }, '2026-11-16', '2026-11-01');
  amend(a, { ...t, fee: 38900 }, '2027-01-16', '2027-01-02');
  assert.deepEqual(S.expectedInvoices(a, { today: '2027-02-15' }).map((i) => [i.version, i.amount]),
    [[1, 72000], [2, 80000], [2, 80000], [3, 38900]]);
});

// ---------------------------------------------------------------------------------------------------------
// Ending with notice
// ---------------------------------------------------------------------------------------------------------

test('ending: 30 days notice, final part-month pro rata by days, nothing after the end date', () => {
  const t = monthly();
  const a = { ...signed(t, '2026-10-16'), ending: { noticeDate: '2026-11-01', endDate: S.noticeEndDate(t, '2026-11-01') } };
  assert.equal(a.ending.endDate, '2026-12-01');
  const all = S.expectedInvoices(a, { today: '2028-01-01' });
  assert.deepEqual(all.map(row), [
    ['cycle-1', 'cycle', '2026-10-16', '2026-11-15', '2026-11-15', '2026-11-22', 72000],
    ['cycle-2', 'final', '2026-11-16', '2026-12-01', '2026-12-01', '2026-12-08', 38400], // 720 × 16/30
  ]);
  assert.equal(all[1].lines[0].text, 'Content package: billing cycle 2, 16 Nov 2026 to 1 Dec 2026 (final part-month, 16 of 30 days)');
  // The final invoice goes out on the end date, not before.
  assert.equal(S.expectedInvoices(a, { today: '2026-11-30' }).length, 1);
});

test('ending: end date exactly on a cycle end is a full cycle and the last invoice', () => {
  const a = { ...signed(monthly(), '2026-10-16'), ending: { endDate: '2026-12-15' } };
  assert.deepEqual(S.expectedInvoices(a, { today: '2028-01-01' }).map((i) => [i.key, i.kind, i.periodEnd, i.amount]),
    [['cycle-1', 'cycle', '2026-11-15', 72000], ['cycle-2', 'cycle', '2026-12-15', 72000]]);
});

test('ending: end date before the first cycle ends, and on the start day itself', () => {
  const t = monthly();
  const a = { ...signed(t, '2026-10-16'), ending: { endDate: '2026-10-31' } };
  assert.deepEqual(S.expectedInvoices(a, { today: '2028-01-01' }).map(row),
    [['cycle-1', 'final', '2026-10-16', '2026-10-31', '2026-10-31', '2026-11-07', 37161]]); // 72000 × 16/31 = 37161.29
  const b = { ...signed(t, '2026-10-16'), ending: { endDate: '2026-10-16' } };
  assert.deepEqual(S.expectedInvoices(b, { today: '2028-01-01' }).map((i) => [i.periodEnd, i.amount]), [['2026-10-16', 2323]]); // 72000/31
});

test('ending: pro rata uses the fee in force at the start of the final cycle, rounded to the penny', () => {
  const t = monthly();
  const a = amend(signed(t, '2026-10-16'), { ...t, fee: 98900 }, '2026-11-16', '2026-11-01');
  a.ending = { endDate: '2026-11-22' };
  const all = S.expectedInvoices(a, { today: '2027-06-01' });
  assert.deepEqual(all.map((i) => [i.key, i.kind, i.version, i.amount]), [['cycle-1', 'cycle', 1, 72000], ['cycle-2', 'final', 2, 23077]]); // 98900 × 7/30 = 23076.67
});

test('ending: never bills a day after the end date, for every end date across a year', () => {
  const t = monthly();
  for (let n = 0; n < 400; n++) {
    const endDate = dates.addDays('2027-01-31', n);
    const a = { ...signed(t, '2027-01-31'), ending: { endDate } };
    const all = S.expectedInvoices(a, { today: '2029-01-01' });
    const last = all.at(-1);
    assert.equal(last.periodEnd, endDate);
    assert.ok(all.every((i) => i.issueDate <= endDate));
    const full = dates.diffDays(last.periodStart, dates.addDays(dates.addMonths('2027-01-31', all.length), -1)) + 1;
    const used = dates.diffDays(last.periodStart, endDate) + 1;
    assert.equal(last.amount, Math.round(72000 * used / full), endDate);
    assert.equal(last.kind, used === full ? 'cycle' : 'final', endDate);
  }
});

// ---------------------------------------------------------------------------------------------------------
// One-off projects
// ---------------------------------------------------------------------------------------------------------

test('project: deposit on signing, balance = fee − deposit on the end date, each due 7 days later', () => {
  const a = signed(project({ fee: 100001 }), '2026-10-16');
  assert.equal(a.endDate, '2026-11-15');
  const all = S.expectedInvoices(a, { today: '2026-11-15' });
  assert.deepEqual(all.map((i) => [i.key, i.kind, i.issueDate, i.dueDate, i.amount]), [
    ['deposit', 'deposit', '2026-10-16', '2026-10-23', 50001],
    ['balance', 'balance', '2026-11-15', '2026-11-22', 50000],
  ]);
  assert.equal(all[0].amount + all[1].amount, 100001);
  assert.deepEqual(all[1].lines, [
    { text: 'Project fee (16 Oct 2026 to 15 Nov 2026)', amount: 100001 },
    { text: 'Less deposit already invoiced', amount: -50001 },
  ]);
  assert.equal(S.expectedInvoices(a, { today: '2026-11-14' }).length, 1);
});

test('project: amounts match the signed wording (deposit and remaining balance)', () => {
  for (const pct of [0, 25, 33, 50, 100]) {
    const t = project({ fee: 99999, depositPercent: pct });
    const doc = T.buildDoc(t, { ref: 'X' });
    const a = signed(t, '2026-10-16');
    const all = S.expectedInvoices(a, { today: '2026-11-15' });
    const dep = all.find((i) => i.key === 'deposit');
    const bal = all.find((i) => i.key === 'balance');
    assert.equal(dep ? dep.amount : 0, doc.pkg.amounts.deposit, `${pct}%`);
    assert.equal(bal.amount, doc.pkg.amounts.balance, `${pct}%`);
    assert.equal((dep ? dep.amount : 0) + bal.amount, 99999, `${pct}%`);
  }
});

test('project: 0% deposit = no deposit invoice, whole fee at the end; 100% = balance of 0 (skipped by the backend)', () => {
  const zero = signed(project({ depositPercent: 0 }), '2026-10-16');
  assert.deepEqual(S.expectedInvoices(zero, { today: '2026-11-15' }).map((i) => [i.key, i.amount]), [['balance', 100000]]);
  assert.deepEqual(S.expectedInvoices(zero, { today: '2026-11-15' })[0].lines, [{ text: 'Project fee (16 Oct 2026 to 15 Nov 2026)', amount: 100000 }]);
  const full = signed(project({ depositPercent: 100 }), '2026-10-16');
  assert.deepEqual(S.expectedInvoices(full, { today: '2026-11-15' }).map((i) => [i.key, i.amount]), [['deposit', 100000], ['balance', 0]]);
});

test('rounding: deposit + balance always equals the fee (never a penny lost or gained)', () => {
  for (const fee of [1, 3, 99, 101, 1001, 33333, 98900, 100001, 123457, 9999999]) {
    for (let pct = 0; pct <= 100; pct++) {
      const a = T.amounts(project({ fee, depositPercent: pct }));
      assert.equal(a.deposit + a.balance, fee, `${fee} @ ${pct}%`);
      assert.ok(Number.isInteger(a.deposit) && a.deposit >= 0 && a.deposit <= fee);
      const s = S.expectedInvoices(signed(project({ fee, depositPercent: pct }), '2026-10-16'), { today: '2026-11-15' });
      assert.equal(s.reduce((n, i) => n + i.amount, 0), fee, `${fee} @ ${pct}% schedule`);
    }
  }
  assert.equal(T.amounts(project({ fee: 99999, depositPercent: 33 })).deposit, 33000); // 32999.67 rounds up
});

test('project: balance issued early (balanceIssueDate), never later than the end date', () => {
  const a = signed(project(), '2026-10-16');
  a.balanceIssueDate = '2026-11-01';
  const bal = S.expectedInvoices(a, { today: '2026-11-01' }).find((i) => i.key === 'balance');
  assert.deepEqual([bal.issueDate, bal.dueDate, bal.amount], ['2026-11-01', '2026-11-08', 50000]);
  a.balanceIssueDate = '2026-12-01'; // after the end date: the end date wins
  assert.equal(S.expectedInvoices(a, { today: '2026-12-31' }).find((i) => i.key === 'balance').issueDate, '2026-11-15');
});

test('project: amended fee is billed in the balance, deposit stays as invoiced', () => {
  const t = project({ fee: 100001 });
  const a = signed(t, '2026-10-16');
  const issued = issue(S.expectedInvoices(a, { today: '2026-10-16' }));
  amend(a, { ...t, fee: 150000 }, '', '2026-10-25');
  const bal = S.missingInvoices(a, issued, '2026-11-15');
  assert.deepEqual(bal.map((i) => [i.key, i.version, i.amount]), [['balance', 2, 150000 - 50001]]);
  // Fee cut below the deposit: nothing more to bill (refund is handled by hand).
  const b = signed(t, '2026-10-16');
  amend(b, { ...t, fee: 30000 }, '', '2026-10-25');
  assert.equal(S.missingInvoices(b, issue(S.expectedInvoices(signed(t, '2026-10-16'), { today: '2026-10-16' })), '2026-11-15')[0].amount, 0);
});

test('project: cancelled early = deposit only, no automatic balance', () => {
  const a = signed(project(), '2026-10-16');
  const issued = issue(S.expectedInvoices(a, { today: '2026-10-16' }));
  a.ending = { noticeDate: '2026-10-25', endDate: '2026-10-25' };
  assert.deepEqual(S.expectedInvoices(a, { today: '2027-01-01' }).map((i) => i.key), ['deposit']);
  assert.equal(S.missingInvoices(a, issued, '2027-01-01').length, 0);
});

test('project: a voided deposit counts as nothing, so the balance is the whole fee', () => {
  const a = signed(project(), '2026-10-16');
  const issued = issue(S.expectedInvoices(a, { today: '2026-10-16' }), { status: 'void' });
  const miss = S.missingInvoices(a, issued, '2026-11-15');
  assert.deepEqual(miss.map((i) => [i.key, i.amount]), [['balance', 100000]]); // the voided deposit is not re-issued
});

test('project: a deposit known only by its key (invoice row missing) is not billed again in the balance', () => {
  // The backend passes { key, status: 'issued', amount: 0 } for keys it remembers but whose invoice row is gone.
  const a = signed(project(), '2026-10-16');
  const known = [{ key: 'deposit', agreementId: 'a1', status: 'issued', amount: 0 }];
  assert.deepEqual(S.missingInvoices(a, known, '2026-11-15').map((i) => [i.key, i.amount]), [['balance', 50000]]);
});

test('project: deposit not issued yet (job catching up) is still netted off the balance', () => {
  const a = signed(project(), '2026-10-16');
  assert.deepEqual(S.missingInvoices(a, [], '2026-11-20').map((i) => [i.key, i.amount]), [['deposit', 50000], ['balance', 50000]]);
});

// ---------------------------------------------------------------------------------------------------------
// Consumers, currencies, start dates
// ---------------------------------------------------------------------------------------------------------

test('consumer: billing starts 15 days after signing unless they asked to start early', () => {
  const t = monthly();
  const a = signed(t, '2026-10-16', { clientType: 'consumer' });
  assert.equal(a.startDate, '2026-10-31');
  assert.deepEqual(S.expectedInvoices(a, { today: '2026-12-31' }).map((i) => [i.periodStart, i.periodEnd, i.dueDate]), [
    ['2026-10-31', '2026-11-29', '2026-12-06'], ['2026-11-30', '2026-12-30', '2027-01-06'],
  ]);
  const early = signed(t, '2026-10-16', { clientType: 'consumer', earlyStart: true });
  assert.equal(S.expectedInvoices(early, { today: '2026-11-15' })[0].periodStart, '2026-10-16');
  // A fixed later start date wins over the cooling-off start; one before signing is moved to the signing day.
  assert.equal(T.keyDates({ ...t, start: '2026-11-10' }, '2026-10-16', { clientType: 'consumer' }).startDate, '2026-11-10');
  assert.equal(T.keyDates({ ...t, start: '2026-10-01' }, '2026-10-16').startDate, '2026-10-16');
});

test('consumer project: deposit on the signing day, project runs a month from the later start', () => {
  const a = signed(project(), '2026-10-16', { clientType: 'consumer' });
  assert.deepEqual([a.startDate, a.endDate], ['2026-10-31', '2026-11-29']); // 31 Oct + 1 month (30 Nov) − 1 day
  assert.deepEqual(S.expectedInvoices(a, { today: '2026-11-29' }).map((i) => [i.key, i.issueDate, i.amount]),
    [['deposit', '2026-10-16', 50000], ['balance', '2026-11-29', 50000]]);
});

test('USD: amounts in cents, US date style on invoice lines', () => {
  const t = { ...T.defaultTerms({ region: 'us', currency: 'USD' }), fee: 95000 };
  const a = signed(t, '2026-10-16');
  const [i] = S.expectedInvoices(a, { today: '2026-11-15' });
  assert.deepEqual([i.currency, i.amount, i.lines[0].text], ['USD', 95000, 'Content services: billing cycle 1, Oct 16, 2026 to Nov 15, 2026']);
  const p = signed({ ...T.defaultTerms({ region: 'us', type: 'project', currency: 'USD' }), fee: 150000 }, '2026-10-16');
  const all = S.expectedInvoices(p, { today: '2026-11-15' });
  assert.deepEqual(all.map((x) => [x.currency, x.amount]), [['USD', 75000], ['USD', 75000]]);
  assert.equal(all[0].lines[0].text, `Project deposit: 50% of the ${money.format(150000, 'USD')} project fee`);
});

// ---------------------------------------------------------------------------------------------------------
// Idempotency and the daily job's view
// ---------------------------------------------------------------------------------------------------------

test('idempotency: running every day for 18 months issues each invoice exactly once', () => {
  const t = monthly();
  const a = signed(t, '2027-01-31');
  amend(a, { ...t, fee: 98900 }, '2027-05-31', '2027-05-10');
  a.ending = { endDate: '2028-03-10' };
  const issued = [];
  for (let n = 0; n < 550; n++) {
    const day = dates.addDays('2027-01-31', n);
    for (const x of S.missingInvoices(a, issued, day)) {
      assert.ok(!issued.some((i) => i.key === x.key), `${x.key} twice`);
      assert.equal(x.issueDate, day, `${x.key} issued on its issue date`);
      issued.push({ ...x, agreementId: 'a1', status: 'issued' });
    }
  }
  assert.equal(issued.length, 14);
  assert.deepEqual(issued.at(-1).periodEnd, '2028-03-10');
  assert.equal(issued.at(-1).amount, 35094); // 98900 × 11/31: 29 Feb–10 Mar 2028 of the 29 Feb–30 Mar cycle
  assert.deepEqual(issued.slice(0, 5).map((i) => i.amount), [72000, 72000, 72000, 72000, 98900]); // amendment from cycle 5 (31 May)
});

test('idempotency: voided invoices are not re-issued; invoices of other agreements do not count', () => {
  const a = signed(monthly(), '2026-10-16');
  const v = issue(S.expectedInvoices(a, { today: '2026-11-15' }), { status: 'void' });
  assert.equal(S.missingInvoices(a, v, '2026-11-20').length, 0);
  const other = issue(S.expectedInvoices(a, { today: '2026-11-15' }), { agreementId: 'a2' });
  assert.deepEqual(S.missingInvoices(a, other, '2026-11-20').map((i) => i.key), ['cycle-1']);
});

test('upcoming: the next invoices after today, skipping ones already issued', () => {
  const a = signed(monthly(), '2026-10-16');
  const issued = issue(S.expectedInvoices(a, { today: '2026-11-15' }));
  assert.deepEqual(S.upcomingInvoices(a, issued, '2026-11-20').map((i) => [i.key, i.issueDate]),
    [['cycle-2', '2026-12-15'], ['cycle-3', '2027-01-15'], ['cycle-4', '2027-02-15']]);
  const p = signed(project(), '2026-10-16');
  assert.deepEqual(S.upcomingInvoices(p, issue(S.expectedInvoices(p, { today: '2026-10-16' })), '2026-10-16').map((i) => [i.key, i.amount]), [['balance', 50000]]);
});

test('no invoices for unsigned or cancelled agreements', () => {
  const a = signed(monthly(), '2026-10-16');
  assert.equal(S.expectedInvoices({ ...a, status: 'cancelled' }, { today: '2027-01-01' }).length, 0);
  assert.equal(S.expectedInvoices({ ...a, versions: [{ ...a.versions[0], signed: null }] }, { today: '2027-01-01' }).length, 0);
});
