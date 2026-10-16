// Money is always whole minor units (pence or cents) so totals never drift.

export const CURRENCIES = {
  GBP: { symbol: '£', name: 'pounds sterling', code: 'GBP' },
  USD: { symbol: '$', name: 'US dollars', code: 'USD' },
};

export function format(minor, currency = 'GBP') {
  const c = CURRENCIES[currency] || CURRENCIES.GBP;
  const neg = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const units = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '−' : ''}${c.symbol}${units}.${String(abs % 100).padStart(2, '0')}`;
}

/** '720', '720.5', '£1,234.50' -> 72000 / 72050 / 123450. Returns NaN if not a valid amount. */
export function parse(text) {
  const s = String(text ?? '').replace(/[£$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [u, f = ''] = s.split('.');
  return Number(u) * 100 + Number((f + '00').slice(0, 2));
}

/** Percentage of an amount, rounded half up to the nearest minor unit. */
export const percent = (minor, pct) => Math.round((minor * pct) / 100);

/** fee × part / whole, rounded to the nearest minor unit (used for a final part-month). */
export const proRata = (minor, part, whole) => Math.round((minor * part) / whole);
