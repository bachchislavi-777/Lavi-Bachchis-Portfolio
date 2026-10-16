// GBP -> USD exchange rate for the US prices, fetched once per build from official sources:
//   1. Bank of England daily spot rate, series XUDLUSS (US$ into sterling)
//   2. European Central Bank euro reference rates (USD / GBP cross), if the Bank of England is unavailable
//   3. The last rate saved in src/data/fx-fallback.json, if both are unavailable (the build never fails on this)
// The deploy workflow rebuilds the site every weekday, so US prices follow the latest published rate.
import fallback from '../data/fx-fallback.json';

const UA = { 'User-Agent': 'Mozilla/5.0 (lavibachchis.com build; rate lookup)' };
const timeout = () => AbortSignal.timeout(15000);

async function bankOfEngland() {
  const from = new Date(Date.now() - 14 * 864e5);
  const d = `${String(from.getUTCDate()).padStart(2, '0')}/${from.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}/${from.getUTCFullYear()}`;
  const res = await fetch(`https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=${d}&Dateto=now&SeriesCodes=XUDLUSS&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, { headers: UA, signal: timeout() });
  const rows = (await res.text()).trim().split(/\r?\n/).filter((l) => /^\d{2} \w{3} \d{4},\d/.test(l));
  const [date, rate] = rows.at(-1).split(',');
  return { rate: Number(rate), date: new Date(`${date} UTC`).toISOString().slice(0, 10), source: 'Bank of England (XUDLUSS)' };
}

async function ecb() {
  const xml = await (await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { headers: UA, signal: timeout() })).text();
  const get = (c) => Number(xml.match(new RegExp(`currency='${c}' rate='([\\d.]+)'`))[1]);
  return { rate: get('USD') / get('GBP'), date: xml.match(/time='([\d-]+)'/)[1], source: 'European Central Bank (USD/GBP cross)' };
}

const sane = (r) => r && r.rate > 0.8 && r.rate < 2.5;
let pending;
export function gbpToUsd() {
  pending ??= (async () => {
    for (const get of [bankOfEngland, ecb]) {
      try {
        const r = await get();
        if (sane(r)) { console.log(`[fx] GBP->USD ${r.rate.toFixed(4)} on ${r.date} from ${r.source}`); return r; }
      } catch {}
    }
    console.warn(`[fx] Live rate unavailable; using saved rate ${fallback.rate} from ${fallback.date}`);
    return { ...fallback, source: `${fallback.source} (saved)` };
  })();
  return pending;
}

// A price for the region being built: '£389' on /uk/, '$516' on /us/ (whole dollars).
export async function price(gbp, region) {
  if (region !== 'us') return { amount: gbp, currency: 'GBP', text: `£${gbp.toLocaleString('en-GB')}` };
  const usd = Math.round(gbp * (await gbpToUsd()).rate);
  return { amount: usd, currency: 'USD', text: `$${usd.toLocaleString('en-US')}` };
}
