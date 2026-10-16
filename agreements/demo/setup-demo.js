// Runs the real backend code inside the browser for the clickable demo. Must be imported before the pages.
import { createBrowserGas } from './browser-gas.js';
import { handle, dailyJob, sendPendingCopies } from '../server/api.js';
import { setup } from '../server/setup.js';
import { saveSettings } from '../server/settings.js';
import { dates } from '../core/index.js';

const listeners = new Set();
const gas = createBrowserGas({ onMail: (m) => listeners.forEach((f) => f(m)) });
gas.install();
const S = gas.state();
const DAY = 86400000;
const offset = () => Number(S.props.DEMO_OFFSET_DAYS || 0);
globalThis.__lbNow = () => new Date(Date.now() + offset() * DAY);

if (!S.props.SHEET_ID) {
  setup();
  S.props.SITE_URL = 'https://lavibachchis.com';
  saveSettings({
    business: { address: 'Your business address\nLondon' },
    payment: { accountName: 'Lavi Bachchis', bankName: 'Example Bank', sortCode: '00-00-00', accountNumber: '00000000', paypal: 'paypal.me/example' },
  });
  gas.save();
}

const clone = (x) => JSON.parse(JSON.stringify(x));
globalThis.LB_DEMO = {
  base: '.',
  async call(req) {
    await new Promise((r) => setTimeout(r, 150));
    const out = clone(handle(clone(req)));
    gas.save();
    return out;
  },
  onMail: (f) => listeners.add(f),
  outbox: () => S.outbox,
  attachment: (key) => gas.attachment(key),
  today: () => dates.londonDate(globalThis.__lbNow()),
  /** Move the demo clock forward a month (to 8am) and run the morning invoice check, as Google would. */
  skipMonth() {
    const t = dates.londonDate(globalThis.__lbNow());
    const target = dates.addMonths(t, 1);
    S.props.DEMO_OFFSET_DAYS = String(offset() + dates.diffDays(t, target));
    const summary = dailyJob();
    sendPendingCopies();
    gas.save();
    return summary;
  },
  reset() { gas.reset(); location.hash = ''; location.reload(); },
  /** Downloads inside a claude.ai page go through its "save file" prompt; elsewhere, a normal download. */
  async save(filename, blob) {
    const downloads = globalThis.claude && globalThis.claude.use ? await globalThis.claude.use('downloads') : null;
    if (downloads) {
      try { await downloads.save({ filename, data: blob }); } catch (e) { if (e && e.code !== 'declined') throw new Error('Downloads aren’t available in this view.'); }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
};
