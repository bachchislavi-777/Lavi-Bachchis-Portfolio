// Automatic payment reminders: when an unpaid invoice should be chased, and which reminder it is.
// Pure logic (no Google or Supabase calls) so it is shared by the backend and tested on its own.
import { addDays, diffDays, isDate, londonDate } from './dates.js';

/** Days after the due date on which a reminder goes out: a friendly one, a second one, and a final one. */
export const SCHEDULE = [1, 7, 14];

/** Never two reminders within this many days, even if a manual one was just sent from the studio. */
export const MIN_GAP_DAYS = 3;

/**
 * Invoices more than this many days overdue are never chased automatically (Lavi can still send a reminder
 * from the studio). This covers a missed week or two of the daily job, but stops a burst of "final reminder"
 * emails about old invoices when reminders are first switched on, or switched back on after a while.
 */
export const MAX_OVERDUE_DAYS = 28;

// London calendar day of a timestamp ('2026-10-16T23:30:00Z' is already 17 October in London).
const dayOf = (at) => {
  const s = String(at || '');
  if (!s) return '';
  if (isDate(s)) return s;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? '' : londonDate(t);
};

/** London dates on which the client was last emailed about this invoice: the invoice itself and every reminder. */
const contactDates = (inv) => [inv.sentAt, inv.reminderSentAt, ...(inv.reminders || []).map((r) => r && r.at)].map(dayOf).filter(Boolean);

/**
 * Which automatic reminder (1, 2 or 3) is due for this invoice today, or 0 for none.
 * Only unpaid ('issued') invoices are chased. If the system missed a day, it sends only the latest stage
 * reached, never a burst of catch-up emails. Nothing goes within MIN_GAP_DAYS of the last email about the
 * invoice (a manual reminder, or the invoice itself if it went out late).
 */
export function reminderDue(inv, today, schedule = SCHEDULE) {
  if (!inv || inv.status !== 'issued' || !inv.dueDate || !today) return 0;
  const overdue = diffDays(inv.dueDate, today);
  if (overdue > MAX_OVERDUE_DAYS) return 0;
  const reached = schedule.filter((d) => overdue >= d).length;
  const done = Number(inv.autoReminders) || 0;
  if (reached <= done) return 0;
  const last = contactDates(inv).sort().pop();
  if (last && diffDays(last, today) < MIN_GAP_DAYS) return 0;
  return reached;
}

/** The date each automatic reminder would go out (for showing in the studio). */
export const reminderDates = (inv, schedule = SCHEDULE) => (inv && inv.dueDate ? schedule.map((d) => addDays(inv.dueDate, d)) : []);
