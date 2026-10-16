// When invoices fall due. Pure functions: given a signed agreement and today's date, list the invoices that
// should exist by now. The daily job compares this with the invoices already issued (by `key`) and issues
// any that are missing, so running it twice never double-bills.
//
// Monthly (recurring) agreements
//   Billing cycles start on the start date: cycle 1 runs 16 Oct to 15 Nov, cycle 2 16 Nov to 15 Dec, and so on
//   (a 31st start date uses the last day of shorter months). Each cycle is invoiced on its last day, due
//   `paymentDays` later. If the agreement is ending, the cycle containing the end date is invoiced pro rata on
//   the end date and nothing after it. An amendment's fee applies to cycles that start on or after its
//   "takes effect" date.
// One-off projects
//   Deposit (default 50%) on the signing date. Balance on the project end date (or earlier if Lavi issues it
//   early), equal to the latest signed fee minus the deposit already invoiced. If a project is cancelled early,
//   no automatic balance: Lavi issues a manual invoice for the work done.

import * as dates from './dates.js';
import * as money from './money.js';
import { amounts } from './terms.js';

const signedVersions = (a) => (a.versions || []).filter((v) => v.signed && !v.superseded).sort((x, y) => x.v - y.v);

/** The signed version in force on a given date. */
export function versionOn(agreement, iso) {
  const list = signedVersions(agreement);
  let pick = list[0] || null;
  for (const v of list) if ((v.effectiveFrom || agreement.startDate) <= iso) pick = v;
  return pick;
}
export const latestSigned = (a) => { const l = signedVersions(a); return l[l.length - 1] || null; };

function cycle(agreement, k) {
  const start = agreement.startDate;
  return { k, start: dates.addMonths(start, k - 1), end: dates.addDays(dates.addMonths(start, k), -1) };
}

/**
 * Every invoice the agreement should produce up to and including `today` (or up to `horizon` for a preview).
 * `issued` = existing invoices for this agreement (used for the project balance).
 */
export function expectedInvoices(agreement, { today, horizon, issued = [] } = {}) {
  const until = horizon || today;
  const out = [];
  if (!agreement || !agreement.startDate || !signedVersions(agreement).length) return out;
  if (agreement.status === 'cancelled') return out;
  const first = signedVersions(agreement)[0];
  const type = first.terms.type;
  const name = (v) => v.terms.packageName && v.terms.packageName !== 'Custom' ? `${v.terms.packageName} package` : 'Content services';
  const region = first.terms.region;
  const span = (a, b) => `${dates.formatShort(a, region)} to ${dates.formatShort(b, region)}`;

  if (type !== 'project') {
    const endAt = agreement.ending && agreement.ending.endDate;
    for (let k = 1; k < 1000; k++) {
      const c = cycle(agreement, k);
      if (endAt && c.start > endAt) break;
      const partial = endAt && endAt < c.end;
      const periodEnd = partial ? endAt : c.end;
      const issueDate = periodEnd;
      if (issueDate > until) break;
      const v = versionOn(agreement, c.start);
      const fee = amounts(v.terms).fee;
      const full = dates.diffDays(c.start, c.end) + 1;
      const used = dates.diffDays(c.start, periodEnd) + 1;
      const amount = partial ? money.proRata(fee, used, full) : fee;
      out.push({
        key: `cycle-${k}`, kind: partial ? 'final' : 'cycle', version: v.v,
        periodStart: c.start, periodEnd, issueDate,
        dueDate: dates.addDays(issueDate, Number(v.terms.paymentDays) || 7),
        currency: v.terms.currency, amount,
        lines: [{
          text: `${name(v)}: billing cycle ${k}, ${span(c.start, periodEnd)}${partial ? ` (final part-month, ${used} of ${full} days)` : ''}`,
          amount,
        }],
      });
    }
    return out;
  }

  // Project
  const a1 = amounts(first.terms);
  const signDate = first.signed.date;
  if (a1.deposit > 0 && signDate <= until) {
    out.push({
      key: 'deposit', kind: 'deposit', version: first.v, issueDate: signDate,
      dueDate: dates.addDays(signDate, Number(first.terms.paymentDays) || 7),
      currency: first.terms.currency, amount: a1.deposit,
      lines: [{ text: `Project deposit: ${a1.depositPct}% of the ${money.format(a1.fee, first.terms.currency)} project fee`, amount: a1.deposit }],
    });
  }
  if (agreement.ending) return out; // cancelled early: Lavi bills the work done by hand
  const last = latestSigned(agreement);
  const endDate = agreement.endDate;
  const issueDate = agreement.balanceIssueDate && agreement.balanceIssueDate < endDate ? agreement.balanceIssueDate : endDate;
  if (issueDate && issueDate <= until) {
    const fee = amounts(last.terms).fee;
    // The deposit actually invoiced (a cancelled one counts as nothing); if it hasn't been issued yet,
    // it is being issued in this same run, so count it.
    const dep = issued.find((i) => i.key === 'deposit');
    const depositsBilled = dep ? (dep.status === 'void' ? 0 : dep.amount) : (a1.deposit > 0 && signDate <= until ? a1.deposit : 0);
    const amount = Math.max(0, fee - depositsBilled);
    const cur = last.terms.currency;
    out.push({
      key: 'balance', kind: 'balance', version: last.v, issueDate,
      dueDate: dates.addDays(issueDate, Number(last.terms.paymentDays) || 7),
      currency: cur, amount,
      periodStart: agreement.startDate, periodEnd: endDate,
      lines: [
        { text: `Project fee (${span(agreement.startDate, endDate)})`, amount: fee },
        ...(depositsBilled ? [{ text: 'Less deposit already invoiced', amount: -depositsBilled }] : []),
      ],
    });
  }
  return out;
}

/** Invoices that should exist by `today` but don't yet (by key). */
export function missingInvoices(agreement, issued, today) {
  const have = new Set(issued.filter((i) => i.agreementId === agreement.id && i.key).map((i) => i.key));
  return expectedInvoices(agreement, { today, issued }).filter((x) => !have.has(x.key));
}

/** The next few invoices, for the studio ("next invoice: £720 on 15 Nov"). */
export function upcomingInvoices(agreement, issued, today, count = 3) {
  const horizon = dates.addMonths(today, count + 1);
  const have = new Set(issued.map((i) => i.key));
  return expectedInvoices(agreement, { horizon, issued }).filter((x) => !have.has(x.key) && x.issueDate > today).slice(0, count);
}

/** Last day of service if notice is given on `noticeDate` (recurring). */
export const noticeEndDate = (terms, noticeDate) => dates.addDays(noticeDate, Number(terms.noticeDays) || 30);
