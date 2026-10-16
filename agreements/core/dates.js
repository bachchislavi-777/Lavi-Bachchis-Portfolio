// Calendar dates as plain 'YYYY-MM-DD' strings (London calendar days). No time zones involved,
// so the same code gives the same answer in Google Apps Script, the browser and Node.

const pad = (n, w = 2) => String(n).padStart(w, '0');

export function parse(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) throw new Error(`Not a date: ${iso}`);
  return { y: +m[1], m: +m[2], d: +m[3] };
}
export const isDate = (s) => { try { const p = parse(s); return toIso(p) === s; } catch { return false; } };
export const toIso = ({ y, m, d }) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const epochDay = (iso) => { const { y, m, d } = parse(iso); return Date.UTC(y, m - 1, d) / 86400000; };
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function addDays(iso, n) {
  const t = new Date((epochDay(iso) + n) * 86400000);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
/** Same day n months after `anchor`, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(anchor, n) {
  const { y, m, d } = parse(anchor);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${pad(ny, 4)}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}
export const diffDays = (a, b) => epochDay(b) - epochDay(a); // b - a
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const max = (a, b) => (a > b ? a : b);
export const min = (a, b) => (a < b ? a : b);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '16 October 2026' (UK) or 'October 16, 2026' (US). */
export function format(iso, region = 'uk') {
  if (!iso) return '';
  const { y, m, d } = parse(iso);
  return region === 'us' ? `${MONTHS[m - 1]} ${d}, ${y}` : `${d} ${MONTHS[m - 1]} ${y}`;
}
export function formatShort(iso, region = 'uk') {
  if (!iso) return '';
  const { y, m, d } = parse(iso);
  const mon = MONTHS[m - 1].slice(0, 3);
  return region === 'us' ? `${mon} ${d}, ${y}` : `${d} ${mon} ${y}`;
}

/** London calendar date for an instant. Works without Intl time-zone data (BST rules hard-coded). */
export function londonDate(when = new Date()) {
  const t = when instanceof Date ? when : new Date(when);
  return toIsoUtc(new Date(t.getTime() + londonOffsetMinutes(t) * 60000));
}
/** '2026-10-16 13:37' London time for an instant. */
export function londonDateTime(when = new Date()) {
  const t = when instanceof Date ? when : new Date(when);
  const l = new Date(t.getTime() + londonOffsetMinutes(t) * 60000);
  return `${toIsoUtc(l)} ${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`;
}
function toIsoUtc(t) { return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
// BST runs from 01:00 UTC on the last Sunday of March to 01:00 UTC on the last Sunday of October.
export function londonOffsetMinutes(t) {
  const y = t.getUTCFullYear();
  const lastSunday = (month) => { const d = new Date(Date.UTC(y, month + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d; };
  const start = lastSunday(2); start.setUTCHours(1);
  const end = lastSunday(9); end.setUTCHours(1);
  return t >= start && t < end ? 60 : 0;
}
