// Clickable demo shell: your studio, the client's view and an inbox, all running in one page.
import './setup-demo.js';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/caveat/600.css';
import '../../src/styles/app.css';
import './demo.css';
import { mount as mountStudio } from '../../src/lib/agreements/studio.js';
import { mount as mountSign } from '../../src/lib/agreements/sign-page.js';
import { mount as mountInvoice } from '../../src/lib/agreements/invoice-page.js';
import { dates } from '../core/index.js';

const D = globalThis.LB_DEMO;
const stage = document.getElementById('stage');
const tabsEl = document.getElementById('tabs');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LINK = /^https:\/\/lavibachchis\.com\/(agreement|invoice)\/(#[\w.-]+)$/;

const state = { tab: 'studio', studio: '#/agreements', client: { kind: '', hash: '' }, seen: 0, mail: null };
let ctl = null;

function header(withNav) {
  return `<header class="app-top"><div class="app-wrap wide"><span class="app-logo"><img src="./brand/logo-horizontal.svg" alt="Lavi Bachchis, Content & Creative" width="206" height="48"></span>${withNav ? '<nav id="studio-nav" class="studio-nav" aria-label="Studio"></nav>' : ''}</div></header>`;
}
function setHash(h) { history.replaceState(null, '', `${location.pathname}${location.search}${h || ''}`); }

function show(tab) {
  if (state.tab === 'studio') state.studio = location.hash || '#/agreements';
  if (state.tab === 'client' && state.client.kind) state.client.hash = location.hash;
  if (ctl) ctl.abort();
  ctl = new AbortController();
  state.tab = tab;
  tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  window.scrollTo({ top: 0 });
  if (tab === 'studio') {
    setHash(state.studio);
    stage.innerHTML = `${header(true)}<main class="app-wrap wide" id="root"></main>`;
    mountStudio({ root: document.getElementById('root'), nav: document.getElementById('studio-nav'), signal: ctl.signal });
  } else if (tab === 'client') {
    setHash(state.client.hash);
    stage.innerHTML = `${header(false)}<main class="app-wrap" id="root"></main>`;
    const root = document.getElementById('root');
    if (!state.client.kind) {
      root.innerHTML = `<div class="center-msg"><h1>What your client sees</h1><p class="muted">Create an agreement in <b>Your studio</b> and click <b>Save and get link</b>. Then click <b>Open link</b> next to it, or open the email in the <b>Inbox</b>. You’ll see exactly what your client sees on their phone or computer.</p></div>`;
      return;
    }
    (state.client.kind === 'invoice' ? mountInvoice : mountSign)({ root, signal: ctl.signal });
  } else {
    setHash('');
    renderInbox();
  }
}

function openClient(kind, hash) {
  if (state.tab === 'studio') state.studio = location.hash || '#/agreements';
  state.client = { kind, hash };
  state.tab = 'none';
  show('client');
}

// Any link to an agreement or invoice (studio, emails) opens the client's view here instead of the live site.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const m = LINK.exec(a.getAttribute('href'));
  if (m) { e.preventDefault(); openClient(m[1], m[2]); }
}, true);

// ---------------------------------------------------------------------------------------------------------
function renderInbox() {
  const mails = D.outbox().slice().reverse();
  state.seen = D.outbox().length;
  updateCount();
  const cur = state.mail && mails.find((m) => m.n === state.mail) ? state.mail : (mails[0] && mails[0].n);
  stage.innerHTML = `<main class="app-wrap wide demo-inbox">
    <div class="lead"><div><p class="lbl">Demo inbox</p><h1>Emails the system sent</h1></div></div>
    <p class="muted">In real life these go to your clients and to you. Here they all land in one place, including your studio sign-in codes.</p>
    ${mails.length ? `<div class="inbox"><ul class="mails">${mails.map((m) => `<li><button type="button" data-n="${m.n}" aria-current="${m.n === cur}"><b>${esc(m.subject)}</b><span>To ${esc(m.to)}${m.cc ? `, copy to ${esc(m.cc)}` : ''}</span><span>${esc(dates.londonDateTime(new Date(m.at)))}${m.attachments.length ? ' · PDF attached' : ''}</span></button></li>`).join('')}</ul>
      <div class="viewer" id="viewer"></div></div>` : '<p class="note">No emails yet. Start in <b>Your studio</b>: click <b>Email me a sign-in code</b>.</p>'}
  </main>`;
  stage.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => { state.mail = Number(b.dataset.n); renderInbox(); }));
  if (cur) viewMail(mails.find((m) => m.n === cur));
}

function viewMail(m) {
  const v = document.getElementById('viewer');
  const html = m.html.replace(/https:\/\/lavibachchis\.com\/brand\//g, './brand/');
  v.innerHTML = `<div class="mailhead"><b>${esc(m.subject)}</b><span>To ${esc(m.to)}${m.cc ? ` · cc ${esc(m.cc)}` : ''}</span>
    ${m.attachments.map((a, i) => `<button type="button" class="btn ghost small" data-att="${i}">Open ${esc(a.name)}</button>`).join('')}</div><iframe title="Email" id="mailframe"></iframe>`;
  const f = document.getElementById('mailframe');
  f.srcdoc = html;
  f.addEventListener('load', () => {
    const doc = f.contentDocument;
    if (!doc) return;
    f.style.height = `${Math.max(420, doc.documentElement.scrollHeight + 10)}px`;
    doc.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      e.preventDefault();
      const mm = LINK.exec(a.getAttribute('href'));
      if (mm) openClient(mm[1], mm[2]);
    });
  });
  v.querySelectorAll('[data-att]').forEach((b) => b.addEventListener('click', () => {
    const a = m.attachments[Number(b.dataset.att)];
    const bytes = D.attachment(a.key);
    if (!bytes) { alert('Attachments are only kept until the page is reloaded in this demo.'); return; }
    const url = URL.createObjectURL(new Blob([bytes], { type: a.type }));
    const link = document.createElement('a'); link.href = url; link.download = a.name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }));
}

function updateCount() {
  const n = D.outbox().length - state.seen;
  const el = document.getElementById('inbox-count');
  el.textContent = n > 0 ? String(n) : '';
  el.hidden = n <= 0;
}
D.onMail(() => setTimeout(updateCount, 0));

// ---------------------------------------------------------------------------------------------------------
function updateDate() { document.getElementById('demo-date').textContent = dates.format(D.today(), 'uk'); }
tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
document.getElementById('skip').addEventListener('click', () => {
  const s = D.skipMonth();
  updateDate();
  const msg = s.issued.length ? `Now ${dates.format(D.today(), 'uk')}. The morning check issued and emailed ${s.issued.join(', ')}.` : `Now ${dates.format(D.today(), 'uk')}. No invoices were due.`;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 4500);
  show(state.tab);
});
document.getElementById('reset').addEventListener('click', () => { if (confirm('Start the demo again from scratch?')) D.reset(); });
updateDate();
state.seen = 0;
setHash(state.studio);
show('studio');
