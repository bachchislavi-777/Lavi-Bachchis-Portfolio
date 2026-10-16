// The client's invoice page: lavibachchis.com/invoice/#<id>.<token>
import { call, linkParts, configured, BASE, esc } from './api.js';
import { dates } from '../../../agreements/core/index.js';
import { invoiceHtml, invoiceStatus } from './render.js';

let root;
const msg = (t, x) => { root.innerHTML = `<div class="center-msg"><h1>${esc(t)}</h1><p class="muted">${x}</p></div>`; };

async function start() {
  if (!configured()) return msg('Not switched on yet', 'Please email <a href="mailto:hello@lavibachchis.com">hello@lavibachchis.com</a> for a copy of your invoice.');
  const parts = linkParts();
  if (!parts) return msg('This link isn’t complete', 'Please open the full link from your email.');
  let inv;
  try { inv = (await call('invoice.get', parts)).invoice; } catch (e) { return msg('Couldn’t load the invoice', esc(e.message)); }
  const today = dates.londonDate(new Date());
  const st = invoiceStatus(inv, today);
  document.title = `Invoice ${inv.number} | Lavi Bachchis`;
  root.innerHTML = `
    ${inv.test ? '<p class="warn"><b>Test invoice.</b> Nothing to pay.</p><br>' : ''}
    <div class="lead noprint"><div><p class="lbl">Invoice ${esc(inv.number)}</p><h1>${st.key === 'paid' ? 'Paid, thank you' : st.key === 'void' ? 'This invoice was cancelled' : 'Your invoice'}</h1></div>
      <div class="row"><button class="btn dark" id="dl" type="button">Download PDF</button><button class="btn ghost" id="pr" type="button">Print</button></div></div>
    ${invoiceHtml(inv, { today, logo: `${BASE}/brand/logo-horizontal.svg` })}`;
  document.getElementById('pr').addEventListener('click', () => window.print());
  const dl = document.getElementById('dl');
  dl.addEventListener('click', async () => {
    dl.disabled = true; dl.innerHTML = '<span class="spin" aria-hidden="true"></span> Preparing…';
    try { const { invoicePdf } = await import('./pdf.js'); (await invoicePdf(inv, { base: BASE, today })).download(); } catch (e) { alert('Sorry, the PDF could not be made on this device. Please use Print instead.'); }
    dl.disabled = false; dl.textContent = 'Download PDF';
  });
}
let shown = '';
export function mount({ root: r, signal } = {}) {
  root = r || document.getElementById('root');
  shown = location.hash;
  start();
  window.addEventListener('hashchange', () => { if (linkParts() && location.hash !== shown) { shown = location.hash; start(); } }, { signal });
}
