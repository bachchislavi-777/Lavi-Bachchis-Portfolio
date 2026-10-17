// Lavi's private studio: lavibachchis.com/studio/
// Sign in with a code emailed to her business address, then create, edit, amend and end agreements,
// and see, chase and mark invoices. Everything is stored in her Supabase project, not on the website.
import { call, configured, BASE, esc, ApiError } from './api.js';
import { terms as T, money, dates, util, schedule as S, reminders as R } from '../../../agreements/core/index.js';
import { agreementHtml, invoiceHtml, invoiceStatus } from './render.js';

let root;
let nav;
let signal;
const logo = `${BASE}/brand/logo-horizontal.svg`;
const KEY = 'lb-studio-session';
const DATA_KEY = 'lb-studio-data'; // last loaded studio data, so any new visit shows straight away (cleared on sign-out)
const MAX_CACHED = 40;            // agreements/invoices kept for instant opening
// ov: the front-page data (lists, settings). cache: one agreement or invoice per key ('ag:<id>', 'inv:<id>').
const st = { session: '', ov: null, ovStale: true, cache: {} };
try { st.session = localStorage.getItem(KEY) || ''; } catch { /* private mode: sign in each visit */ }

const STATUS = {
  draft: ['Draft', 'draft'], sent: ['Waiting for signature', 'sent'], signed: ['Active', 'signed'], amending: ['Amendment in progress', 'amending'],
  ending: ['Ending', 'ending'], ended: ['Ended', 'void'], cancelled: ['Withdrawn', 'void'],
};
const badge = (status) => { const [l, k] = STATUS[status] || [status, '']; return `<span class="badge ${k}">${esc(l)}</span>`; };
const fmt = (m, c) => money.format(m, c);
const d = (iso) => (iso ? dates.formatShort(iso, 'uk') : '');
const today = () => (st.ov && st.ov.today) || dates.londonDate(new Date());

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
async function api(action, body = {}) {
  try { return await call(action, { session: st.session, ...body }); } catch (e) {
    if (e instanceof ApiError && e.code === 'auth') { signOut(true); throw e; }
    throw e;
  }
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${esc(label || 'Working…')}`; } else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
}
async function act(btn, fn, okMsg) {
  busy(btn, true);
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { if (e.code !== 'auth') notice('That didn’t work', e.message); return null; } finally { busy(btn, false); }
}
// In-page dialogs (browser pop-ups are blocked in some places, and these match the brand).
const confirmBox = async (title, text, okLabel) => !!(await ask(title, `<p>${esc(text)}</p>`, okLabel));
const notice = (title, text) => ask(title, `<p style="overflow-wrap:anywhere">${esc(text)}</p>`, 'OK', { cancel: false });

function signOut(expired) {
  if (!expired && st.session) call('admin.signout', { session: st.session }).catch(() => {});
  st.session = ''; st.ov = null; st.cache = {}; st.ovStale = true;
  try { localStorage.removeItem(KEY); localStorage.removeItem(DATA_KEY); sessionStorage.removeItem('lb-studio-overview'); } catch { /* ignore */ }
  location.hash = '';
  renderLogin(expired ? 'Please sign in again.' : '');
}

// =========================================================================================================
// Sign in
// =========================================================================================================
let codeSent = null;
function renderLogin(note = '') {
  nav.innerHTML = '';
  // Wake the backend while Lavi reads the screen, so the code email and the first load are quicker.
  call('ping').catch(() => {});
  root.innerHTML = `<div class="panel" style="max-width:520px;margin:30px auto">
    <p class="lbl">Studio</p><h2>Agreements &amp; invoices</h2>
    <p class="muted">Your private area. A one-time sign-in code is emailed to your business address.</p>
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
    <div id="step1" class="row" style="margin-top:12px"><button class="btn dark" id="send">Email me a sign-in code</button></div>
    <form id="step2" hidden style="margin-top:12px;display:grid;gap:12px">
      <p id="sent" class="muted"></p>
      <label class="f" for="code">Sign-in code<input id="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="12" required style="font-family:var(--f-m);letter-spacing:.2em;text-transform:uppercase"></label>
      <div class="row"><button class="btn dark" id="login" type="submit">Sign in</button><button class="btn ghost" type="button" id="again">Send a new code</button></div>
    </form>
    <div id="lerr" class="err" role="alert" hidden style="margin-top:12px"></div>
  </div>`;
  const err = (m) => { const e = document.getElementById('lerr'); e.textContent = m; e.hidden = !m; };
  const showStep2 = (sentTo) => {
    document.getElementById('step1').hidden = true;
    document.getElementById('step2').hidden = false;
    document.getElementById('sent').textContent = `Code sent to ${sentTo}. It works once, for 10 minutes.`;
    document.getElementById('code').focus();
  };
  const send = async (b) => {
    err(''); busy(b, true, 'Sending…');
    try {
      const r = await call('admin.code');
      codeSent = { to: r.sentTo, at: Date.now() };
      showStep2(r.sentTo);
    } catch (e) { err(e.message); } finally { busy(b, false); }
  };
  document.getElementById('send').addEventListener('click', (e) => send(e.currentTarget));
  if (codeSent && Date.now() - codeSent.at < 10 * 60_000) showStep2(codeSent.to); // e.g. came back from reading the email
  document.getElementById('again').addEventListener('click', (e) => send(e.currentTarget));
  document.getElementById('step2').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err('');
    const b = document.getElementById('login'); busy(b, true, 'Signing in…');
    try {
      const r = await call('admin.login', { code: document.getElementById('code').value });
      st.session = r.session;
      st.cache = {}; st.ov = null;
      try { localStorage.setItem(KEY, r.session); localStorage.removeItem(DATA_KEY); } catch { /* ignore */ }
      route({ fresh: true });
    } catch (e) { err(e.message); busy(b, false); }
  });
}

// =========================================================================================================
// Router
// =========================================================================================================
function setNav(current) {
  const items = [['agreements', 'Agreements'], ['invoices', 'Invoices'], ['settings', 'Settings']];
  nav.innerHTML = `${items.map(([k, l]) => `<button type="button" data-go="#/${k}" ${current === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}<button type="button" id="signout">Sign out</button>`;
  nav.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.go; }));
  document.getElementById('signout').addEventListener('click', () => signOut(false));
}

// ---------------------------------------------------------------------------------------------------------
// Loading. Every page is drawn straight away from what the studio already has (instant tab switches), and
// fresh data is fetched in the background: if anything changed, the page is redrawn. Only the very first
// visit, or a page never opened before, waits for the server. Requests for a page run in parallel.
// ---------------------------------------------------------------------------------------------------------
// Saved on this computer for the signed-in session only (the same browser already keeps the sign-in), so the
// studio opens instantly next time, even in a new tab or the next day; it then refreshes in the background.
const sessionTag = () => (st.session || '').slice(-12);
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(st.cache);
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_CACHED))) delete st.cache[k]; // oldest first
      try { localStorage.setItem(DATA_KEY, JSON.stringify({ tag: sessionTag(), ov: st.ov, cache: st.cache })); }
      catch { localStorage.setItem(DATA_KEY, JSON.stringify({ tag: sessionTag(), ov: st.ov, cache: {} })); } // too big: keep the lists
    } catch { /* private mode or storage full: the studio still works, just loads from the server */ }
  }, 300);
}
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
    if (d && d.tag && d.tag === sessionTag()) { st.ov = d.ov || null; st.cache = d.cache || {}; st.ovStale = true; }
  } catch { /* ignore */ }
}
function cacheSet(key, value) { delete st.cache[key]; st.cache[key] = value; persist(); } // re-insert = most recent
function rememberOverview(ov) {
  st.ov = ov; st.ovStale = false;
  persist();
}
/** Keep what a save/action returned (it is the same shape as the page's own data), so the next page is current. */
function remember(r) {
  if (!r) return r;
  if (r.agreement && r.link && Array.isArray(r.invoices)) cacheSet(`ag:${r.agreement.id}`, r);
  if (r.invoice && r.link) cacheSet(`inv:${r.invoice.id}`, r);
  st.ovStale = true; // lists and totals may have changed
  persist();
  return r;
}
function parseHash() {
  const [, view = 'agreements', id = ''] = (location.hash.replace(/^#\/?/, '').match(/^([\w-]+)?\/?([\w-]*)/) || []);
  return { view, id };
}
const detailKey = (view, id) => (view === 'agreements' && id ? `ag:${id}` : view === 'invoices' && id && id !== 'new' ? `inv:${id}` : '');
const fetchDetail = (key) => (key.startsWith('ag:') ? api('admin.agreement.get', { id: key.slice(3) }) : api('admin.invoice.get', { id: key.slice(4) }));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

let loadingBar;
function loading(on) {
  if (!loadingBar) { loadingBar = document.createElement('div'); loadingBar.className = 'loadbar'; loadingBar.setAttribute('aria-hidden', 'true'); document.body.appendChild(loadingBar); }
  loadingBar.classList.toggle('on', !!on);
}

let routeSeq = 0;
/**
 * Show the page in the address bar.
 * fresh: wait for the server before drawing (after Lavi changes something), but keep the current page on
 * screen meanwhile instead of blanking it.
 */
async function route({ fresh = false } = {}) {
  if (!configured()) { root.innerHTML = '<div class="center-msg"><h1>Not switched on yet</h1><p class="muted">Add the Google Apps Script address to <code>AGREEMENTS_API_URL</code> in <code>src/data/settings.js</code>. See <code>agreements/README.md</code>.</p></div>'; return; }
  if (!st.session) return renderLogin();
  const seq = ++routeSeq;
  const { view, id } = parseHash();
  const current = () => seq === routeSeq;
  const fail = (e) => {
    if (e.code === 'auth' || !current()) return;
    root.innerHTML = `<div class="center-msg"><h1>Couldn’t load</h1><p class="err">${esc(e.message)}</p><p><button class="btn" onclick="location.reload()">Try again</button></p></div>`;
  };

  // The editor always works on the latest version (the server refuses to save over a newer one).
  // It opens straight away from what the studio has, then checks for a newer version in the background: if
  // there is one and nothing has been typed yet, the editor reloads with it; otherwise Lavi gets a clear note.
  if (view === 'edit') {
    const isNew = !id || id === 'new';
    const cached = isNew ? null : st.cache[`ag:${id}`];
    const instant = st.ov && (isNew || cached);
    st.editDirty = false;
    if (instant) { await renderEditor(id || 'new', cached ? cached.agreement : null); loading(true); } else root.innerHTML = '<div class="skeleton"></div>';
    try {
      const [, r] = await Promise.all([st.ov && !st.ovStale && instant ? null : api('admin.overview').then(rememberOverview), isNew ? null : api('admin.agreement.get', { id })]);
      if (!current()) return;
      if (r) cacheSet(`ag:${id}`, r);
      if (!instant) return await renderEditor(id || 'new', r ? r.agreement : null);
      const stamp = (x) => { const v = x && x.versions[x.versions.length - 1]; return v ? `${v.v}:${v.rev}:${v.status}` : ''; };
      if (r && stamp(r.agreement) !== stamp(cached.agreement)) {
        if (!st.editDirty) await renderEditor(id, r.agreement);
        else if (!root.querySelector('#stale-note')) root.querySelector('.lead')?.insertAdjacentHTML('afterend', '<p class="warn" id="stale-note">This agreement was changed somewhere else since this page opened. Copy anything you need, then reload the page before saving.</p>');
      }
    } catch (e) { if (!instant) return fail(e); if (e.code !== 'auth' && current()) toast(`Couldn’t refresh: ${e.message}`); } finally { if (current()) loading(false); }
    return;
  }

  const key = detailKey(view, id);
  const draw = () => {
    if (key.startsWith('ag:')) return renderAgreement(id, st.cache[key]);
    if (key.startsWith('inv:')) return renderInvoice(id, st.cache[key]);
    if (view === 'invoices') return id === 'new' ? (location.hash = '#/invoices') : renderInvoices();
    if (view === 'settings') return renderSettings();
    return renderAgreements();
  };
  const ready = !fresh && st.ov && (!key || st.cache[key]);
  if (ready) draw();
  else if (fresh && root.firstElementChild && !root.querySelector('.skeleton')) loading(true);
  else root.innerHTML = '<div class="skeleton"></div>';
  if (ready) loading(true);

  try {
    // Lists need fresh totals; a detail page refreshes the lists only when something was changed.
    const wantOv = !key || st.ovStale || !st.ov || fresh;
    const before = { ov: st.ov, d: key ? st.cache[key] : null };
    const [ov, detail] = await Promise.all([wantOv ? api('admin.overview') : null, key ? fetchDetail(key) : null]);
    if (ov) rememberOverview(ov);
    if (key) cacheSet(key, detail);
    if (!current()) return;
    const changed = !ready || (ov && !same(ov, before.ov)) || (key && !same(detail, before.d));
    // Don't redraw under an open dialog or while Lavi is typing; the next visit shows the update.
    if (changed && !document.querySelector('dialog[open]') && !(ready && root.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) draw();
    if (ov) prefetch();
  } catch (e) {
    if (ready && e.code !== 'auth') { if (current()) toast(`Couldn’t refresh: ${e.message}`); } else fail(e);
  } finally { if (current()) loading(false); }
}
/**
 * After a change. When the server's reply already holds the page's new state (most actions return it), show it
 * straight away and refresh the rest in the background; otherwise wait for fresh data, keeping the page on screen.
 */
const refresh = (r) => {
  remember(r);
  const { view, id } = parseHash();
  const key = detailKey(view, id);
  const hasPage = r && key && ((r.agreement && `ag:${r.agreement.id}` === key) || (r.invoice && `inv:${r.invoice.id}` === key));
  return route({ fresh: !hasPage });
};

/**
 * Quietly load the most likely next pages (recent agreements, unpaid invoices) while Lavi looks at a list, so
 * opening them is instant. Two at a time, only ones not loaded yet, and only while the studio tab is visible.
 */
let prefetching = false;
async function prefetch() {
  if (prefetching || !st.ov) return;
  prefetching = true;
  try {
    const wanted = [
      ...st.ov.agreements.filter((a) => a.status !== 'deleted').slice(-8).reverse().map((a) => `ag:${a.id}`),
      ...st.ov.invoices.filter((i) => i.status === 'issued').slice(-6).reverse().map((i) => `inv:${i.id}`),
    ].filter((k) => !st.cache[k]);
    const next = async () => {
      while (wanted.length && st.session && document.visibilityState === 'visible') {
        const k = wanted.shift();
        try { cacheSet(k, await fetchDetail(k)); } catch { /* not essential: the page loads normally when opened */ }
      }
    };
    await Promise.all([next(), next()]);
  } finally { prefetching = false; }
}

// =========================================================================================================
// Agreements list
// =========================================================================================================
let agFilter = '';
function renderAgreements() {
  setNav('agreements');
  const all = st.ov.agreements.slice().reverse();
  const groups = {
    active: (a) => !a.test && ['signed', 'amending', 'ending'].includes(a.status),
    waiting: (a) => !a.test && a.status === 'sent',
    drafts: (a) => !a.test && a.status === 'draft',
    ended: (a) => !a.test && ['ended', 'cancelled'].includes(a.status),
    tests: (a) => a.test,
    all: () => true,
  };
  const labels = { active: 'Active', waiting: 'Waiting for signature', drafts: 'Drafts', ended: 'Ended & withdrawn', tests: 'Tests', all: 'All' };
  if (!agFilter) agFilter = ['active', 'waiting', 'drafts', 'tests'].find((k) => all.some(groups[k])) || 'active';
  const list = all.filter(groups[agFilter]);
  const unpaid = st.ov.invoices.filter((i) => i.status === 'issued' && !i.test);
  const owed = Object.entries(unpaid.reduce((m, i) => { m[i.currency] = (m[i.currency] || 0) + i.amount; return m; }, {})).map(([c, v]) => fmt(v, c)).join(' + ') || '£0.00';
  const overdue = unpaid.filter((i) => i.dueDate < today()).length;
  root.innerHTML = `
    <div class="lead"><div><p class="lbl">Studio</p><h1>Agreements</h1></div>
      <div class="row"><button class="btn ghost" id="job">Check invoices now</button><a class="btn" href="#/edit/new">New agreement</a></div></div>
    <div class="stats">
      <div class="stat"><b>${all.filter(groups.active).length}</b><span>Active agreements</span></div>
      <div class="stat"><b>${all.filter(groups.waiting).length}</b><span>Waiting for signature</span></div>
      <div class="stat"><b>${esc(owed)}</b><span>Unpaid invoices${overdue ? `, <b style="display:inline;font:inherit;color:var(--bad)">${overdue} overdue</b>` : ''}</span></div>
    </div>
    <div class="toolbar"><div class="filters" role="group" aria-label="Show">${Object.keys(groups).map((k) => `<button type="button" data-f="${k}" aria-pressed="${k === agFilter}">${labels[k]} (${all.filter(groups[k]).length})</button>`).join('')}</div></div>
    <div class="list">${list.length ? list.map((a) => `
      <button class="item" type="button" data-id="${esc(a.id)}">
        <span><span class="t">${esc(a.company || a.client || 'Client not named yet')}</span><br><span class="s">${esc(a.ref)} · ${esc(a.type)} · ${esc(fmt(a.fee, a.currency))}${a.type === 'Monthly' ? '/month' : ''}</span></span>
        <span class="mid">${badge(a.status)} ${a.test ? '<span class="badge test">Test</span>' : ''}</span>
        <span class="r s">${a.signed ? `Signed ${esc(d(a.signed))}` : `Created ${esc(d(a.created))}`}${a.ends ? `<br>Ends ${esc(d(a.ends))}` : ''}</span>
      </button>`).join('') : `<p class="note">Nothing here yet. ${agFilter === 'active' ? 'Create an agreement, or tick <b>Test agreement</b> to try it out first.' : ''}</p>`}</div>`;
  root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { agFilter = b.dataset.f; renderAgreements(); }));
  root.querySelectorAll('.item[data-id]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/agreements/${b.dataset.id}`; }));
  document.getElementById('job').addEventListener('click', (e) => runJob(e.currentTarget));
}

async function runJob(btn) {
  const r = await act(btn, () => api('admin.job.run'));
  if (!r) return;
  const s = r.summary;
  const parts = [];
  if (s.issued.length) parts.push(`Issued ${s.issued.join(', ')}`);
  if (s.reminded.length) parts.push(`Reminded ${s.reminded.join(', ')}`);
  if (s.ended.length) parts.push(`Ended ${s.ended.join(', ')}`);
  if (s.errors.length) parts.push(`Problems: ${s.errors.join('; ')}`);
  toast(parts.length ? parts.join(' · ') : 'All up to date. Nothing was due.');
  st.cache = {}; persist(); // invoices may have been issued on any agreement
  refresh();
}

// =========================================================================================================
// One agreement
// =========================================================================================================
function renderAgreement(id, r) {
  setNav('agreements');
  const a = r.agreement;
  const latest = a.versions[a.versions.length - 1];
  const last = [...a.versions].reverse().find((v) => v.signed);
  const pending = latest.status === 'offered' ? latest : null;
  const draft = latest.status === 'draft' ? latest : null;
  const c = (last && last.signed.client) || latest.terms.client || {};
  const t = (last || latest).terms;
  const project = t.type === 'project';
  const showDoc = last && !pending && !draft ? T.resolveDoc(last.signed.doc, {}) : null;

  const actions = [];
  if (draft || pending) actions.push(`<a class="btn dark" href="#/edit/${esc(a.id)}">Edit ${draft ? 'draft' : 'agreement'}${latest.v > 1 ? ` (v${latest.v})` : ''}</a>`);
  if (draft) actions.push('<button class="btn" id="offer">Make ready to sign</button>');
  if (pending) actions.push('<button class="btn" id="email">Email link to client</button>');
  if (draft || pending) actions.push(`<button class="btn danger" id="withdraw">Withdraw ${latest.v > 1 ? 'amendment' : 'agreement'}</button>`);
  if (last && !draft && !pending && a.status !== 'ended') actions.push('<button class="btn dark" id="amend">Amend agreement</button>');
  if (last && !a.ending) actions.push(`<button class="btn ghost" id="end">${project ? 'Cancel project' : 'End agreement'}</button>`);
  if (a.ending && a.status !== 'ended') actions.push('<button class="btn ghost" id="unend">Undo ending</button>');
  if (last && project && !a.ending && !r.invoices.some((i) => i.key === 'balance')) actions.push('<button class="btn ghost" id="balance">Issue balance invoice now</button>');
  if (last) actions.push(`<a class="btn ghost" href="#/invoices?agreement=${esc(a.id)}">New invoice</a>`);

  root.innerHTML = `
    <p><a href="#/agreements">← All agreements</a></p>
    <div class="lead"><div><p class="lbl">${esc(a.ref)}${a.test ? ' · test' : ''}</p><h1>${esc(c.company || c.name || 'Unnamed client')}</h1></div><div class="row">${badge(a.status)}${a.test ? '<span class="badge test">Test</span>' : ''}</div></div>
    ${r.warnings.length ? `<div class="warn"><b>Before you send</b><ul>${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div><br>` : ''}
    <div class="panel" style="margin-top:0">
      <h3 style="margin-top:0">Client link</h3>
      <p class="muted small">${pending ? 'Send this to your client. They read, fill in their details and sign. It’s private to them.' : last ? 'Your client can use the same link any time to see and download their signed copy.' : 'The link starts working once you make the agreement ready to sign.'}</p>
      <div class="copybox"><input type="text" readonly value="${esc(r.link)}" id="link" aria-label="Client link"><button class="btn ghost small" id="copy" type="button">Copy</button>${pending || last ? `<a class="btn ghost small" href="${esc(r.link)}" target="_blank" rel="noopener">Open link</a>` : ''}</div>
      <div class="row" style="margin-top:16px">${actions.join('')}</div>
    </div>
    <div class="panel">
      <div class="grid3">
        <div><p class="lbl">Type</p><p>${project ? 'One-off project' : 'Monthly, rolling'}</p></div>
        <div><p class="lbl">${project ? 'Project fee' : 'Monthly fee'}</p><p>${esc(fmt(t.fee, t.currency))}</p></div>
        <div><p class="lbl">Package</p><p>${esc(t.packageName)}</p></div>
        <div><p class="lbl">Signed</p><p>${last ? esc(`${d(last.signed.date)} (v${last.v})`) : 'Not yet'}</p></div>
        <div><p class="lbl">Starts</p><p>${esc(d(a.startDate)) || 'On signing'}</p></div>
        <div><p class="lbl">${a.ending ? 'Ends' : project ? 'Ends' : 'Notice'}</p><p>${a.ending ? esc(d(a.ending.endDate)) : project ? esc(d(a.endDate)) || 'After signing' : `${t.noticeDays} days`}</p></div>
      </div>
      ${last ? `<h3>Client</h3><p>${esc(c.name)}${c.role ? `, ${esc(c.role)}` : ''}${c.company ? ` · ${esc(c.company)}` : ''}<br>${esc(c.email)}${c.billingEmail ? ` · invoices to ${esc(c.billingEmail)}` : ''}${c.phone ? ` · ${esc(c.phone)}` : ''}<br><span class="muted">${esc(c.address).replace(/\n/g, ', ')} · signs as ${a.clientType === 'consumer' ? 'an individual (consumer)' : 'a business'}${a.clientType === 'consumer' ? (a.earlyStart ? ', asked to start within 14 days' : ', start after the 14-day cancellation period') : ''}</span></p>` : ''}
      ${last ? `<div class="row" style="margin-top:6px"><button class="btn ghost small" id="pdf">Download signed PDF</button><button class="btn ghost small" id="resend">Email signed copy again</button><button class="btn ghost small" id="verify">Check fingerprint</button></div>` : ''}
    </div>
    <div class="panel">
      <h2>Invoices</h2>
      ${r.upcoming.length ? `<p class="muted small">Next: ${r.upcoming.map((u) => `${esc(fmt(u.amount, u.currency))} on ${esc(d(u.issueDate))} (${({ cycle: 'monthly', final: 'final part-month', deposit: 'deposit', balance: 'project balance' })[u.kind] || u.kind})`).join(' · ')}. Issued and emailed automatically that morning.</p>` : last ? '' : '<p class="muted small">Invoices start once the agreement is signed.</p>'}
      ${invoiceTable(r.invoices)}
    </div>
    <div class="panel"><h2>Versions &amp; history</h2>
      <ul class="timeline">${a.versions.map((v) => `<li><time>Version ${v.v}</time><span>${v.signed ? `Signed ${esc(d(v.signed.date))} by ${esc(v.signed.client.name)}${v.v > 1 && v.effectiveFrom ? `, applies from ${esc(d(v.effectiveFrom))}` : ''}` : v.status === 'withdrawn' ? 'Withdrawn' : v.status === 'offered' ? `Waiting for signature${v.viewedAt ? ` (opened ${esc(d(v.viewedAt.slice(0, 10)))})` : ' (not opened yet)'}` : 'Draft'}</span></li>`).join('')}</ul>
      <h3>Activity</h3>
      <ul class="timeline">${(a.events || []).slice().reverse().map((ev) => `<li><time>${esc(dates.londonDateTime(new Date(ev.at)))}</time><span>${esc(ev.text || ev.type)}</span></li>`).join('')}</ul>
    </div>
    <div class="panel"><h2>${showDoc ? `Signed agreement (v${last.v})` : `Version ${latest.v} as the client sees it`}</h2><br>
      ${showDoc ? agreementHtml(last.signed.doc, { signed: last.signed, logo }) : agreementHtml(T.resolveDoc(latest.doc, {}), { logo })}
    </div>`;

  const on = (sel, fn) => { const el = document.getElementById(sel); if (el) el.addEventListener('click', (e) => fn(e.currentTarget)); };
  on('copy', async (b) => { try { await navigator.clipboard.writeText(r.link); toast('Link copied'); } catch { const i = document.getElementById('link'); i.select(); toast('Selected: press Ctrl+C or Cmd+C'); } });
  on('offer', (b) => act(b, () => api('admin.agreement.save', { id: a.id, v: latest.v, terms: latest.terms, offer: true, effectiveFrom: latest.effectiveFrom }), 'Ready to sign. Copy the link or email it.').then((x) => x && refresh(x)));
  on('email', async (b) => {
    const m = await ask('Email the link', `<p class="muted">Sent to ${esc(c.email || latest.terms.client.email || 'the client')} from your Google Workspace account, with a copy to ${esc(st.ov.settings.business.email)}.</p><label class="f" for="msg">Add a personal note <span class="hint">(optional)</span><textarea id="msg" rows="4" placeholder="Lovely to speak today. As discussed…"></textarea></label>`, 'Send email');
    if (m) act(b, () => api('admin.agreement.sendLink', { id: a.id, message: m.querySelector('#msg').value }), 'Email sent').then((x) => x && refresh(x));
  });
  on('withdraw', async (b) => { if (await confirmBox(latest.v > 1 ? 'Withdraw this amendment?' : 'Withdraw this agreement?', latest.v > 1 ? 'The signed version stays in force.' : 'The link will stop working for signing.', 'Withdraw')) act(b, () => api('admin.agreement.withdraw', { id: a.id }), 'Withdrawn').then((x) => x && refresh(x)); });
  on('amend', (b) => act(b, () => api('admin.agreement.amend', { id: a.id })).then((x) => { if (x) { remember(x); location.hash = `#/edit/${a.id}`; } }));
  on('end', () => endDialog(a, last));
  on('unend', (b) => act(b, () => api('admin.agreement.undoEnd', { id: a.id }), 'Ending undone').then((x) => x && refresh(x)));
  on('balance', async (b) => { if (await confirmBox('Issue the balance invoice now?', 'It is dated today and emailed to the client.', 'Issue invoice')) act(b, () => api('admin.agreement.issueBalance', { id: a.id }), 'Balance invoice issued').then((x) => x && refresh(x)); });
  on('resend', (b) => act(b, () => api('admin.agreement.resendSigned', { id: a.id, v: last.v }), 'Signed copy emailed to the client and you'));
  on('verify', (b) => act(b, () => api('admin.agreement.verify', { id: a.id, v: last.v })).then((x) => x && notice(x.ok ? 'Fingerprint matches' : 'Fingerprint does NOT match', x.ok ? `The signed record hasn’t changed since signing. ${x.fingerprint}` : 'The record may have been altered. Ask Claude to look into it.')));
  on('pdf', async (b) => { busy(b, true, 'Preparing…'); try { const { agreementPdf } = await import('./pdf.js'); await (await agreementPdf(last.signed.doc, last.signed, { base: BASE })).download(); } catch (e) { notice('Couldn’t make the PDF', e.message); } busy(b, false); });
  bindInvoiceRows();
}

function invoiceTable(list, { showClient = false } = {}) {
  if (!list.length) return '<p class="muted small">No invoices yet.</p>';
  return `<div class="tblwrap"><table class="tbl"><thead><tr><th>Number</th>${showClient ? '<th>Client</th>' : ''}<th>Description</th><th class="amt">Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>
    ${list.map((i) => { const s = invoiceStatus(i, today()); return `<tr class="click" data-inv="${esc(i.id)}" tabindex="0"><td><b>${esc(i.number)}</b></td>${showClient ? `<td>${esc(i.client)}</td>` : ''}<td>${esc((i.description || (i.lines ? i.lines.map((l) => l.text).join('; ') : '')).slice(0, 90))}</td><td class="amt">${esc(fmt(i.amount, i.currency))}</td><td>${esc(d(i.dueDate))}</td><td><span class="badge ${s.key}">${esc(s.key === 'due' ? 'Unpaid' : s.label)}</span></td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function bindInvoiceRows() {
  root.querySelectorAll('tr[data-inv]').forEach((tr) => {
    const go = () => { location.hash = `#/invoices/${tr.dataset.inv}`; };
    tr.addEventListener('click', go);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
}

function ask(title, html, okLabel = 'Save', { cancel = true } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form method="dialog" style="display:grid;gap:14px"><h2>${esc(title)}</h2>${html}<div class="row"><button class="btn dark" value="ok">${esc(okLabel)}</button>${cancel ? '<button class="btn ghost" value="cancel" formnovalidate>Cancel</button>' : ''}</div></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'ok' ? dlg : null); setTimeout(() => dlg.remove(), 0); });
    dlg.showModal();
  });
}

async function endDialog(a, last) {
  const project = last.terms.type === 'project';
  const t0 = today();
  const end0 = project ? t0 : S.noticeEndDate(last.terms, t0);
  const dlg = await ask(project ? 'Cancel the project' : 'End the agreement', `
    ${project ? '<p class="muted">No automatic balance invoice will be sent. Issue an invoice for the work done (less the deposit) from the agreement page.</p>' : `<p class="muted">Either of you can end it with ${last.terms.noticeDays} days’ written notice. The last part-month is invoiced pro rata on the end date.</p>`}
    <div class="grid2">
      <label class="f" for="nd">Notice given on<input type="date" id="nd" value="${t0}" required></label>
      <label class="f" for="ed">Last day<input type="date" id="ed" value="${end0}" required><span class="hint">${project ? '' : `Usually ${last.terms.noticeDays} days after the notice.`}</span></label>
    </div>
    <label class="f" for="by">Who gave notice<select id="by"><option value="client">The client</option><option value="me">Me</option></select></label>
    <label class="f" for="nt">Note <span class="hint">(optional, included in the email)</span><textarea id="nt" rows="2"></textarea></label>
    <label class="check"><input type="checkbox" id="nf" checked><span>Email the client to confirm the end date</span></label>`, project ? 'Cancel project' : 'Confirm end date');
  if (!dlg) return;
  const v = (id) => dlg.querySelector(`#${id}`);
  const r = await act(null, () => api('admin.agreement.end', { id: a.id, noticeDate: v('nd').value, endDate: v('ed').value, by: v('by').value, note: v('nt').value, notify: v('nf').checked }), 'End date saved');
  refresh(r);
}
// keep the end date in step with the notice date while the dialog is open
function syncEndDate(e) {
  if (e.target.id === 'nd' && e.target.closest('dialog')) {
    const ed = e.target.closest('dialog').querySelector('#ed');
    const m = /Usually (\d+) days/.exec(ed.parentElement.textContent);
    if (m && dates.isDate(e.target.value)) ed.value = dates.addDays(e.target.value, Number(m[1]));
  }
}

// =========================================================================================================
// Editor (new agreement, draft, or amendment)
// =========================================================================================================
async function renderEditor(id, agreement) {
  setNav('agreements');
  const isNew = id === 'new';
  let a = null, ver = null;
  if (!isNew) {
    a = agreement;
    ver = a.versions[a.versions.length - 1];
    if (!['draft', 'offered'].includes(ver.status)) { location.hash = `#/agreements/${id}`; return; }
  }
  const pk = st.ov.packages;
  let terms = ver ? JSON.parse(JSON.stringify(ver.terms)) : T.defaultTerms({ pkg: pk[1] });
  let effectiveFrom = ver ? ver.effectiveFrom || '' : '';
  const isAmend = ver && ver.v > 1;
  const signedType = a && a.clientType;
  const business = { ...st.ov.settings.business, privacyUrl: { uk: `${location.origin}${BASE}/uk/privacy/`, us: `${location.origin}${BASE}/us/privacy/` } };

  root.innerHTML = `
    <p><a href="${isNew ? '#/agreements' : `#/agreements/${esc(id)}`}">← ${isNew ? 'All agreements' : 'Back to agreement'}</a></p>
    <div class="lead"><div><p class="lbl">${isNew ? 'New agreement' : `${esc(a.ref)} · version ${ver.v}${isAmend ? ' (amendment)' : ''}`}</p><h1>${isNew ? 'Create an agreement' : isAmend ? 'Amend the agreement' : 'Edit the agreement'}</h1></div></div>
    ${ver && ver.status === 'offered' ? '<p class="note">This version is already with the client. When you save, they see the new wording next time they open the link. If they have it open, they are asked to reload before signing.</p><br>' : ''}
    ${isAmend ? '<p class="note">The signed version stays in force until the client signs this one. They see a list of what changed.</p><br>' : ''}
    <div class="edit-layout">
      <form id="ed" novalidate>
        ${isNew ? `<fieldset><legend>Practice run</legend><label class="check"><input type="checkbox" id="test"><span><b>Test agreement.</b> Gets a T number (LB-A-2026-T01), is marked “Test” everywhere and isn’t binding. Use your own email as the client to try the whole journey.</span></label></fieldset>` : ''}
        <fieldset><legend>The basics</legend>
          <div class="grid2">
            <label class="f" for="type">Type<select id="type" ${isAmend ? 'disabled' : ''}><option value="recurring">Monthly, rolling</option><option value="project">One-off project</option></select></label>
            <label class="f" for="region">Client is in<select id="region" ${isAmend ? 'disabled' : ''}><option value="uk">The UK (British English)</option><option value="us">The US (American English)</option></select></label>
          </div>
          <label class="f" for="ctypes">Who can sign<select id="ctypes" ${signedType ? 'disabled' : ''}><option value="either">A business or an individual (they choose)</option><option value="business">Businesses only</option><option value="consumer">Individuals only</option></select><span class="hint">Individuals (consumers) automatically get the 14-day cancellation rights the law requires.</span></label>
        </fieldset>
        <fieldset><legend>Client details</legend>
          <p class="muted small" style="margin:0">Optional. The client can fill these in or correct them when they sign.</p>
          <div class="grid2">
            <label class="f" for="cn">Name<input id="cn" type="text"></label>
            <label class="f" for="cc">Business<input id="cc" type="text"></label>
            <label class="f" for="ce">Email<input id="ce" type="email"><span class="hint">Needed to email them the link.</span></label>
            <label class="f" for="cr">Role<input id="cr" type="text"></label>
          </div>
        </fieldset>
        <fieldset><legend>What I’ll do</legend>
          <label class="f" for="pkg">Start from<select id="pkg"><option value="">Keep what’s below</option>${pk.map((p, i) => `<option value="${i}">${esc(p.name)} package (£${p.gbp}/month)</option>`).join('')}<option value="custom">Blank (custom)</option></select></label>
          <label class="f" for="pname">Package name<input id="pname" type="text"></label>
          <div><p class="f" style="margin:0 0 6px">Package lines</p><div class="items-ed" id="items"></div><button type="button" class="linkbtn" id="add-item">+ Add a line</button></div>
          <label class="f" for="note">Extra description <span class="hint">(optional, shown under the table)</span><textarea id="note" rows="3"></textarea></label>
        </fieldset>
        <fieldset><legend>Fee and dates</legend>
          <div class="grid2">
            <label class="f" for="cur">Currency<select id="cur"><option value="GBP">£ GBP</option><option value="USD">$ USD</option></select></label>
            <label class="f" for="fee"><span id="fee-l">Monthly fee</span><input id="fee" type="text" inputmode="decimal" placeholder="720.00"></label>
          </div>
          <div class="grid2">
            <label class="f" for="start">Starts<select id="start"><option value="signing">On the day they sign</option><option value="date">On a set date</option></select></label>
            <label class="f" for="sdate" id="sdate-w">Start date<input id="sdate" type="date"></label>
          </div>
          <div class="grid3 proj">
            <label class="f" for="dur">Length (months)<input id="dur" type="number" min="1" max="24"></label>
            <label class="f" for="edate">Or a set end date<input id="edate" type="date"></label>
            <label class="f" for="dep">Deposit on signing (%)<input id="dep" type="number" min="0" max="100"></label>
          </div>
          ${isAmend ? '<label class="f rec" for="eff">Changes apply from<input id="eff" type="date"><span class="hint">Usually the start of the next billing cycle. Invoices already issued don’t change.</span></label>' : ''}
        </fieldset>
        <fieldset><legend>Terms</legend>
          <div class="grid3">
            <label class="f" for="pay">Payment due (days)<input id="pay" type="number" min="1" max="60"></label>
            <label class="f rec" for="notice">Notice period (days)<input id="notice" type="number" min="0" max="180"></label>
            <label class="f" for="rounds">Rounds of changes<input id="rounds" type="number" min="0" max="10"></label>
            <label class="f" for="fb">Client feedback within (working days)<input id="fb" type="number" min="1" max="30"></label>
            <label class="f" for="pause">Pause work if overdue (days)<input id="pause" type="number" min="1" max="90"></label>
            <label class="f" for="liab">Liability cap (months of fees)<input id="liab" type="number" min="1" max="24"></label>
          </div>
          <label class="check"><input type="checkbox" id="port"><span>I can show the published work in my portfolio</span></label>
        </fieldset>
        <fieldset><legend>Special terms you agreed</legend>
          <label class="f" for="special">Anything agreed on a call. One point per line. These take priority over the standard wording.<textarea id="special" rows="4" placeholder="- Three rounds of changes on the launch video&#10;- Weekly check-in call on Mondays"></textarea></label>
        </fieldset>
        <fieldset><legend>Edit the wording</legend>
          <p class="muted small" style="margin:0">For this client only. Change, remove or add clauses. Edited clauses are highlighted. Words in {{double braces}} fill in automatically, e.g. {{fee}}, {{startDate}}, {{paymentDays}}. The standard wording is a careful draft based on UK law; get a solicitor’s view before making big changes.</p>
          <div id="clauses"></div>
        </fieldset>
        <div id="warn"></div>
        <div id="eerr" class="err" role="alert" hidden></div>
        <div class="row" style="margin:6px 0 30px">
          ${ver && ver.status === 'offered' ? '<button class="btn dark" type="button" id="save-offer">Save changes</button>' : '<button class="btn dark" type="button" id="save-offer">Save and get link</button><button class="btn ghost" type="button" id="save-draft">Save as draft</button>'}
          <button class="btn ghost" type="button" id="pdf-prev">Preview PDF</button>
        </div>
      </form>
      <aside class="preview" aria-label="Live preview"><div id="prev"></div></aside>
    </div>`;

  const $ = (x) => document.getElementById(x);
  const setv = () => {
    $('type').value = terms.type; $('region').value = terms.region; $('ctypes').value = terms.clientTypes;
    $('cn').value = terms.client.name || ''; $('cc').value = terms.client.company || ''; $('ce').value = terms.client.email || ''; $('cr').value = terms.client.role || '';
    $('pname').value = terms.packageName || ''; $('note').value = terms.scopeNote || '';
    $('cur').value = terms.currency; $('fee').value = terms.fee ? (terms.fee / 100).toFixed(2) : '';
    $('start').value = terms.start === 'signing' ? 'signing' : 'date'; $('sdate').value = terms.start === 'signing' ? '' : terms.start;
    $('dur').value = terms.durationMonths; $('edate').value = terms.endDate || ''; $('dep').value = terms.depositPercent;
    $('pay').value = terms.paymentDays; $('notice').value = terms.noticeDays; $('rounds').value = terms.revisionRounds; $('fb').value = terms.feedbackDays;
    $('pause').value = terms.pauseAfterDays; $('liab').value = terms.liabilityMonths; $('port').checked = terms.portfolio !== false;
    $('special').value = terms.specialTerms || '';
    if ($('eff')) $('eff').value = effectiveFrom || '';
    drawItems(); drawClauses(); toggles();
  };
  const drawItems = () => {
    $('items').innerHTML = terms.items.map((r, i) => `<div class="r"><input type="text" data-il="${i}" value="${esc(r.label)}" aria-label="Line ${i + 1} label" placeholder="e.g. Designed posts"><input type="text" data-iv="${i}" value="${esc(r.value)}" aria-label="Line ${i + 1} amount" placeholder="e.g. 12 a month"><button type="button" class="iconbtn" data-ix="${i}" aria-label="Remove line ${i + 1}">×</button></div>`).join('');
  };
  const drawClauses = () => {
    const std = T.standardClauses(terms);
    const bySec = [];
    for (const c of std) { let s = bySec.find((x) => x.id === c.section); if (!s) { s = { id: c.section, title: c.sectionTitle, items: [] }; bySec.push(s); } s.items.push(c); }
    $('clauses').innerHTML = bySec.map((s) => {
      const extra = (terms.extra && terms.extra[s.id]) || [];
      const n = s.items.filter((c) => Object.prototype.hasOwnProperty.call(terms.overrides, c.id)).length + extra.length;
      return `<details class="clause-ed"${n ? ' open' : ''}><summary>${esc(s.title)}${n ? ` <span class="badge amending">${n} change${n > 1 ? 's' : ''}</span>` : ''}</summary>
      ${s.items.map((c) => {
        const has = Object.prototype.hasOwnProperty.call(terms.overrides, c.id);
        const removed = has && !terms.overrides[c.id];
        const text = has && !removed ? terms.overrides[c.id] : c.text;
        return `<div class="clause${has ? (removed ? ' removed' : ' custom') : ''}"><div class="meta">${c.when ? `<span class="cond">${c.when === 'business' ? 'Business only' : 'Consumer only'}</span>` : ''}<span>${has ? (removed ? 'Removed for this client' : 'Edited') : 'Standard'}</span>${has ? `<button type="button" class="linkbtn" data-reset="${esc(c.id)}">Reset to standard</button>` : `<button type="button" class="linkbtn" data-remove="${esc(c.id)}">Remove</button>`}</div>
          <textarea rows="3" data-cl="${esc(c.id)}" aria-label="${esc(s.title)} clause" ${removed ? 'disabled' : ''}>${esc(text)}</textarea></div>`;
      }).join('')}
      ${extra.map((x, i) => `<div class="clause custom"><div class="meta"><span>Added</span><button type="button" class="linkbtn" data-xdel="${s.id}:${i}">Delete</button></div><textarea rows="3" data-x="${s.id}:${i}" aria-label="Added clause">${esc(x)}</textarea></div>`).join('')}
      <button type="button" class="linkbtn" data-xadd="${s.id}">+ Add a clause to ${esc(s.title)}</button></details>`;
    }).join('');
  };
  const toggles = () => {
    const proj = terms.type === 'project';
    root.querySelectorAll('.proj').forEach((e) => { e.hidden = !proj; });
    root.querySelectorAll('.rec').forEach((e) => { e.hidden = proj; });
    $('fee-l').textContent = proj ? 'Project fee' : 'Monthly fee';
    $('sdate-w').hidden = $('start').value !== 'date';
  };
  const read = () => {
    const n = (x, dflt) => { const v = Number($(x).value); return Number.isFinite(v) && $(x).value !== '' ? v : dflt; };
    terms.type = $('type').value; terms.region = $('region').value; terms.clientTypes = $('ctypes').value;
    terms.client = { ...terms.client, name: $('cn').value.trim(), company: $('cc').value.trim(), email: $('ce').value.trim(), role: $('cr').value.trim() };
    terms.packageName = $('pname').value.trim() || 'Custom'; terms.scopeNote = $('note').value;
    terms.currency = $('cur').value;
    const fee = money.parse($('fee').value); terms.fee = Number.isFinite(fee) ? fee : 0;
    terms.start = $('start').value === 'date' && dates.isDate($('sdate').value) ? $('sdate').value : 'signing';
    terms.durationMonths = n('dur', 1); terms.endDate = $('edate').value; terms.depositPercent = n('dep', 50);
    terms.paymentDays = n('pay', 7); terms.noticeDays = n('notice', 30); terms.revisionRounds = n('rounds', 2); terms.feedbackDays = n('fb', 3);
    terms.pauseAfterDays = n('pause', 14); terms.liabilityMonths = n('liab', 3); terms.portfolio = $('port').checked;
    terms.specialTerms = $('special').value;
    if ($('eff')) effectiveFrom = $('eff').value;
    root.querySelectorAll('[data-il]').forEach((el) => { terms.items[+el.dataset.il].label = el.value; });
    root.querySelectorAll('[data-iv]').forEach((el) => { terms.items[+el.dataset.iv].value = el.value; });
    const std = Object.fromEntries(T.standardClauses(terms).map((c) => [c.id, c.text]));
    root.querySelectorAll('[data-cl]').forEach((el) => {
      if (el.disabled) return;
      const id2 = el.dataset.cl;
      if (el.value.trim() !== (std[id2] || '').trim()) terms.overrides[id2] = el.value; else delete terms.overrides[id2];
    });
    root.querySelectorAll('[data-x]').forEach((el) => { const [s, i] = el.dataset.x.split(':'); terms.extra[s][+i] = el.value; });
  };
  const preview = () => {
    const doc = T.buildDoc(terms, { ref: a ? a.ref : 'LB-A-…', version: ver ? ver.v : 1, offeredDate: today(), business });
    $('prev').innerHTML = agreementHtml(T.resolveDoc(doc, {}), { logo });
    const w = [];
    if (!terms.fee) w.push('Set the fee.');
    if (!terms.items.some((r) => r.label || r.value)) w.push('Add at least one package line.');
    if (!st.ov.settings.business.address) w.push('Add your business address in Settings. You can’t send an agreement until it’s there (it must appear on agreements and invoices).');
    if (terms.region === 'us' && terms.clientTypes !== 'business') w.push('For US clients, “Businesses only” is safer: some US states add their own rules for individuals on rolling contracts.');
    const p = st.ov.settings.payment; if (!p.accountNumber && !p.iban && !p.paypal) w.push('Add your payment details in Settings so invoices show how to pay.');
    if (terms.type === 'project' && terms.depositPercent !== 50) w.push(`Deposit is ${terms.depositPercent}%, not the usual 50%.`);
    $('warn').innerHTML = w.length ? `<div class="warn"><b>Check before sending</b><ul>${w.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><br>` : '';
  };

  let tm;
  const form = $('ed');
  form.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { if (form.isConnected) { read(); preview(); } }, 200); });
  form.addEventListener('change', (e) => {
    if (e.target.id === 'pkg' && e.target.value !== '') {
      read();
      if (e.target.value === 'custom') { terms.packageName = 'Custom'; terms.items = [{ label: 'Scope', value: '' }]; terms.fee = 0; }
      else { const p = pk[+e.target.value]; terms.packageName = p.name; terms.items = p.items.map((i) => ({ ...i })); if (terms.currency === 'GBP') terms.fee = p.gbp * 100; }
      e.target.value = ''; setv(); preview(); return;
    }
    if (['type', 'region', 'start'].includes(e.target.id)) {
      read();
      if (e.target.id === 'region' && isNew) {
        terms.currency = terms.region === 'us' ? 'USD' : 'GBP'; $('cur').value = terms.currency;
        // US individuals bring state consumer rules into play; default US agreements to businesses only.
        if (terms.region === 'us' && terms.clientTypes === 'either') { terms.clientTypes = 'business'; $('ctypes').value = 'business'; }
      }
      toggles(); drawClauses(); preview();
    }
  });
  form.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'add-item') { read(); terms.items.push({ label: '', value: '' }); drawItems(); preview(); }
    else if (t.dataset.ix !== undefined) { read(); terms.items.splice(+t.dataset.ix, 1); drawItems(); preview(); }
    else if (t.dataset.reset) { read(); delete terms.overrides[t.dataset.reset]; drawClauses(); preview(); }
    else if (t.dataset.remove) { read(); terms.overrides[t.dataset.remove] = ''; drawClauses(); preview(); }
    else if (t.dataset.xadd) { read(); (terms.extra[t.dataset.xadd] ||= []).push(''); drawClauses(); preview(); root.querySelector(`[data-x="${t.dataset.xadd}:${terms.extra[t.dataset.xadd].length - 1}"]`)?.focus(); }
    else if (t.dataset.xdel) { read(); const [s, i] = t.dataset.xdel.split(':'); terms.extra[s].splice(+i, 1); if (!terms.extra[s].length) delete terms.extra[s]; drawClauses(); preview(); }
  });
  const save = async (offer, btn) => {
    clearTimeout(tm);
    read();
    const err = $('eerr'); err.hidden = true;
    if (offer && !terms.fee) { err.textContent = 'Set the fee before making it ready to sign.'; err.hidden = false; return; }
    for (const k of Object.keys(terms.extra)) terms.extra[k] = terms.extra[k].filter((x) => String(x).trim());
    busy(btn, true, 'Saving…');
    try {
      const r = await api('admin.agreement.save', { id: a ? a.id : undefined, v: ver ? ver.v : undefined, terms, offer: offer || (ver && ver.status === 'offered'), test: isNew ? $('test').checked : undefined, effectiveFrom });
      remember(r);
      toast(offer ? 'Saved. The link is ready to send.' : 'Draft saved');
      location.hash = `#/agreements/${r.agreement.id}`;
    } catch (e2) { if (e2.code !== 'auth') { err.textContent = e2.message; err.hidden = false; } busy(btn, false); }
  };
  $('save-offer').addEventListener('click', (e) => save(true, e.currentTarget));
  if ($('save-draft')) $('save-draft').addEventListener('click', (e) => save(false, e.currentTarget));
  $('pdf-prev').addEventListener('click', async (e) => {
    read(); const b = e.currentTarget; busy(b, true, 'Preparing…');
    try { const { agreementPdf } = await import('./pdf.js'); const doc = T.resolveDoc(T.buildDoc(terms, { ref: a ? a.ref : 'LB-A-DRAFT', version: ver ? ver.v : 1, offeredDate: today(), business }), {}); await (await agreementPdf(doc, null, { base: BASE })).download(); } catch (x) { notice('Couldn’t make the PDF', x.message); }
    busy(b, false);
  });
  setv(); preview();
}

// =========================================================================================================
// Invoices
// =========================================================================================================
let invFilter = 'unpaid';
function renderInvoices() {
  setNav('invoices');
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const all = st.ov.invoices.slice().reverse();
  const real = all.filter((i) => !i.test);
  const groups = {
    unpaid: (i) => !i.test && i.status === 'issued', overdue: (i) => !i.test && i.status === 'issued' && i.dueDate < today(),
    paid: (i) => !i.test && i.status === 'paid', void: (i) => !i.test && i.status === 'void', tests: (i) => i.test, all: () => true,
  };
  const labels = { unpaid: 'Unpaid', overdue: 'Overdue', paid: 'Paid', void: 'Cancelled', tests: 'Tests', all: 'All' };
  const sum = (list) => Object.entries(list.reduce((m, i) => { m[i.currency] = (m[i.currency] || 0) + i.amount; return m; }, {})).map(([c, v]) => fmt(v, c)).join(' + ') || '£0.00';
  const year = today().slice(0, 4);
  root.innerHTML = `
    <div class="lead"><div><p class="lbl">Studio</p><h1>Invoices</h1></div><div class="row"><button class="btn ghost" id="job">Check invoices now</button><button class="btn" id="new">New invoice</button></div></div>
    <div class="stats">
      <div class="stat"><b>${esc(sum(real.filter(groups.unpaid)))}</b><span>Unpaid</span></div>
      <div class="stat"><b>${esc(sum(real.filter(groups.overdue)))}</b><span>Overdue</span></div>
      <div class="stat"><b>${esc(sum(real.filter((i) => i.status === 'paid' && (i.paidOn || '').startsWith(year))))}</b><span>Paid in ${year}</span></div>
    </div>
    <div class="toolbar"><div class="filters">${Object.keys(groups).map((k) => `<button type="button" data-f="${k}" aria-pressed="${k === invFilter}">${labels[k]} (${all.filter(groups[k]).length})</button>`).join('')}</div></div>
    ${invoiceTable(all.filter(groups[invFilter]), { showClient: true })}
    <p class="muted small" style="margin-top:14px">Monthly invoices are issued automatically on the last day of each billing cycle, and project deposits when the client signs. Each one is emailed to the client with you copied in.</p>`;
  root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { invFilter = b.dataset.f; renderInvoices(); }));
  document.getElementById('job').addEventListener('click', (e) => runJob(e.currentTarget));
  document.getElementById('new').addEventListener('click', () => newInvoice());
  bindInvoiceRows();
  if (q.get('agreement')) newInvoice(q.get('agreement'));
}

function newInvoice(agreementId = '') {
  const signed = st.ov.agreements.filter((a) => ['signed', 'amending', 'ending', 'ended'].includes(a.status));
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form method="dialog" style="display:grid;gap:14px"><h2>New invoice</h2>
    <label class="f" for="ag">For agreement<select id="ag"><option value="">No agreement (enter details)</option>${signed.map((a) => `<option value="${esc(a.id)}" ${a.id === agreementId ? 'selected' : ''}>${esc(a.ref)} · ${esc(a.company || a.client)}${a.test ? ' (test)' : ''}</option>`).join('')}</select></label>
    <div id="who" class="grid2"><label class="f" for="bn">Client name<input id="bn" type="text"></label><label class="f" for="be">Client email<input id="be" type="email"></label><label class="f" for="bc">Business<input id="bc" type="text"></label><label class="f" for="ba">Address<input id="ba" type="text"></label></div>
    <div><p class="f" style="margin:0 0 6px">Lines</p><div id="lines" style="display:grid;gap:8px"></div><button type="button" class="linkbtn" id="addl">+ Add a line</button></div>
    <div class="grid2"><label class="f" for="dd">Payment due in (days)<input id="dd" type="number" value="7" min="0" max="90"></label><label class="check" style="align-self:end"><input type="checkbox" id="sn" checked><span>Email it to the client now</span></label></div>
    <div id="nerr" class="err" role="alert" hidden></div>
    <div class="row"><button class="btn dark" value="ok" id="nok">Create invoice</button><button class="btn ghost" value="cancel" formnovalidate>Cancel</button></div></form>`;
  document.body.appendChild(dlg);
  const q = (x) => dlg.querySelector(x);
  const addLine = () => {
    const n = q('#lines').children.length + 1;
    const r = document.createElement('div');
    r.className = 'items-ed';
    r.innerHTML = `<div class="r"><input type="text" data-lt placeholder="Description" aria-label="Line ${n} description"><input type="text" data-la inputmode="decimal" placeholder="Amount, e.g. 250.00" aria-label="Line ${n} amount"><button type="button" class="iconbtn" aria-label="Remove line ${n}">×</button></div>`;
    r.querySelector('button').addEventListener('click', () => r.remove());
    q('#lines').appendChild(r);
  };
  addLine();
  q('#addl').addEventListener('click', addLine);
  const who = () => { q('#who').hidden = !!q('#ag').value; };
  q('#ag').addEventListener('change', who); who();
  q('form').addEventListener('submit', async (ev) => {
    if (ev.submitter && ev.submitter.value === 'cancel') return;
    ev.preventDefault();
    const lines = [...dlg.querySelectorAll('#lines .r')].map((r) => ({ text: r.querySelector('[data-lt]').value.trim(), amount: r.querySelector('[data-la]').value.trim() })).filter((l) => l.text || l.amount);
    const body = { agreementId: q('#ag').value, lines, dueDays: Number(q('#dd').value || 7), send: q('#sn').checked };
    if (!body.agreementId) body.billTo = { name: q('#bn').value, email: q('#be').value, company: q('#bc').value, address: q('#ba').value };
    const b = q('#nok'); busy(b, true, 'Creating…'); q('#nerr').hidden = true;
    try {
      const r = await api('admin.invoice.manual', body);
      remember(r);
      toast(body.send ? 'Invoice created and emailed' : 'Invoice created');
      dlg.close('done');
      location.hash = `#/invoices/${r.invoice.id}`;
    } catch (e) { busy(b, false); if (e.code !== 'auth') { q('#nerr').textContent = e.message; q('#nerr').hidden = false; } }
  });
  dlg.addEventListener('close', () => { setTimeout(() => dlg.remove(), 0); if (dlg.returnValue !== 'done' && location.hash.includes('?')) history.replaceState(null, '', '#/invoices'); });
  dlg.showModal();
}

function renderInvoice(id, r) {
  setNav('invoices');
  const inv = r.invoice;
  const s = invoiceStatus(inv, today());
  root.innerHTML = `
    <p><a href="#/invoices">← All invoices</a>${inv.agreementId ? ` · <a href="#/agreements/${esc(inv.agreementId)}">${esc(inv.agreementRef)}</a>` : ''}</p>
    <div class="lead"><div><p class="lbl">Invoice${inv.test ? ' · test' : ''}</p><h1>${esc(inv.number)} · ${esc(fmt(inv.amount, inv.currency))}</h1></div><span class="badge ${s.key}">${esc(s.label)}</span></div>
    <div class="panel" style="margin-top:0">
      <div class="row">
        ${inv.status === 'issued' ? '<button class="btn dark" id="paid">Mark as paid</button><button class="btn ghost" id="remind">Send reminder</button>' : ''}
        ${inv.status === 'paid' ? '<button class="btn ghost" id="unpaid">Mark as unpaid</button>' : ''}
        <button class="btn ghost" id="pdf">Download PDF</button>
        ${inv.status !== 'void' ? '<button class="btn ghost" id="resend">Email again</button>' : ''}
        <button class="btn ghost" id="copy">Copy client link</button>
        ${inv.status === 'issued' ? '<button class="btn danger" id="void">Cancel invoice</button>' : ''}
      </div>
      <p class="muted small" style="margin-top:12px">${inv.sentAt ? `Emailed ${esc(dates.londonDateTime(new Date(inv.sentAt)))}` : 'Not emailed yet'}${inv.viewedAt ? ` · opened by the client ${esc(d(inv.viewedAt.slice(0, 10)))}` : ''}${(inv.reminders || []).length ? ` · reminder${inv.reminders.length > 1 ? 's' : ''} sent ${inv.reminders.map((x) => esc(d(x.at.slice(0, 10)))).join(', ')}` : inv.reminderSentAt ? ` · reminder sent ${esc(d(inv.reminderSentAt.slice(0, 10)))}` : ''}${inv.status === 'issued' && st.ov.settings.invoices.autoReminders ? ` · automatic reminders ${R.reminderDates(inv).map((x) => esc(d(x))).join(', ')} if still unpaid` : ''}${inv.voidReason ? ` · cancelled: ${esc(inv.voidReason)}` : ''}</p>
    </div><br>
    ${invoiceHtml(inv, { today: today(), logo })}`;
  const on = (sel, fn) => { const el = document.getElementById(sel); if (el) el.addEventListener('click', (e) => fn(e.currentTarget)); };
  on('paid', async () => { const dlg = await ask('Mark as paid', `<label class="f" for="pd">Paid on<input type="date" id="pd" value="${today()}" required></label>`, 'Mark as paid'); if (dlg) refresh(await act(null, () => api('admin.invoice.update', { id, op: 'paid', date: dlg.querySelector('#pd').value }), 'Marked as paid')); });
  on('unpaid', (b) => act(b, () => api('admin.invoice.update', { id, op: 'unpaid' }), 'Marked as unpaid').then((x) => x && refresh(x)));
  on('remind', async (b) => { if (await confirmBox('Send a payment reminder?', `A polite reminder goes to ${inv.billTo.billingEmail || inv.billTo.email}.`, 'Send reminder')) act(b, () => api('admin.invoice.update', { id, op: 'remind' }), 'Reminder sent').then((x) => x && refresh(x)); });
  on('resend', (b) => act(b, () => api('admin.invoice.update', { id, op: 'resend' }), 'Invoice emailed again').then((x) => x && refresh(x)));
  on('void', async () => { const dlg = await ask('Cancel this invoice', '<p class="muted">The number is kept (invoice numbers are never reused) and it’s marked Cancelled. Nothing is emailed.</p><label class="f" for="vr">Reason<input id="vr" type="text" required placeholder="e.g. Raised in error"></label>', 'Cancel invoice'); if (dlg) refresh(await act(null, () => api('admin.invoice.update', { id, op: 'void', reason: dlg.querySelector('#vr').value }), 'Invoice cancelled')); });
  on('copy', async () => { try { await navigator.clipboard.writeText(r.link); toast('Link copied'); } catch { notice('Copy this link', r.link); } });
  on('pdf', async (b) => { busy(b, true, 'Preparing…'); try { const { invoicePdf } = await import('./pdf.js'); await (await invoicePdf(inv, { base: BASE, today: today() })).download(); } catch (e) { notice('Couldn’t make the PDF', e.message); } busy(b, false); });
}

// =========================================================================================================
// Settings
// =========================================================================================================
function renderSettings() {
  setNav('settings');
  const s = st.ov.settings;
  const f = (g, k, label, { type = 'text', hint = '', area = false } = {}) => `<label class="f" for="s-${g}-${k}">${esc(label)}${area ? `<textarea id="s-${g}-${k}" rows="3">${esc(s[g][k])}</textarea>` : `<input id="s-${g}-${k}" type="${type}" value="${esc(s[g][k])}">`}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`;
  root.innerHTML = `
    <div class="lead"><div><p class="lbl">Studio</p><h1>Settings</h1></div></div>
    <p class="note">These details are stored privately in your Supabase project, never on the public website. They appear on agreements and invoices. Changes apply to new agreements and invoices; ones already sent keep the details they had.</p><br>
    <form id="sf">
      <fieldset><legend>Your business</legend>
        <div class="grid2">${f('business', 'name', 'Your name')}${f('business', 'trading', 'Trading as')}${f('business', 'email', 'Business email', { type: 'email', hint: 'Shown on documents. Emails are sent from the Google account that runs the system.' })}${f('business', 'website', 'Website')}${f('business', 'phone', 'Phone')}</div>
        ${f('business', 'address', 'Business address', { area: true, hint: 'Needed on invoices, and by law when an individual (consumer) signs. A business address or virtual office is fine.' })}
        <label class="check"><input type="checkbox" id="s-business-vatRegistered" ${s.business.vatRegistered ? 'checked' : ''}><span>I’m VAT-registered</span></label>
        ${f('business', 'vatNumber', 'VAT number')}
      </fieldset>
      <fieldset><legend>How clients pay you</legend>
        <div class="grid2">${f('payment', 'accountName', 'Account name')}${f('payment', 'bankName', 'Bank')}${f('payment', 'sortCode', 'Sort code')}${f('payment', 'accountNumber', 'Account number')}${f('payment', 'iban', 'IBAN', { hint: 'For international (e.g. US) clients.' })}${f('payment', 'bic', 'BIC / SWIFT')}</div>
        ${f('payment', 'paypal', 'PayPal', { hint: 'Your PayPal.Me link or PayPal email.' })}
        ${f('payment', 'note', 'Note on invoices')}
      </fieldset>
      <fieldset><legend>Invoices</legend>
        <label class="check"><input type="checkbox" id="s-invoices-autoSend" ${s.invoices.autoSend ? 'checked' : ''}><span>Email invoices to clients automatically when they are issued</span></label>
        <label class="check"><input type="checkbox" id="s-invoices-copyMe" ${s.invoices.copyMe ? 'checked' : ''}><span>Copy me on every invoice email</span></label>
        <label class="check"><input type="checkbox" id="s-invoices-autoReminders" ${s.invoices.autoReminders ? 'checked' : ''}><span>Send payment reminders automatically if an invoice isn’t marked as paid: 1, 7 and 14 days after the due date</span></label>
        <p class="muted small">Mark invoices as paid when the money arrives, so paid clients are never chased.</p>
      </fieldset>
      <div class="row"><button class="btn dark" id="ssave" type="submit">Save settings</button></div>
      <p class="muted small" style="margin-top:14px">Studio sign-in codes go to ${esc(st.ov.owner)}. Agreement wording version ${esc(st.ov.wording)}.</p>
    </form>`;
  document.getElementById('sf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = { business: {}, payment: {}, invoices: {} };
    for (const g of Object.keys(out)) for (const k of Object.keys(s[g])) {
      const el = document.getElementById(`s-${g}-${k}`); if (!el) continue;
      out[g][k] = el.type === 'checkbox' ? el.checked : el.value.trim();
    }
    const r = await act(document.getElementById('ssave'), () => api('admin.settings.save', { settings: out }), 'Settings saved');
    if (r) { st.cache = {}; st.ov.settings = r.settings; rememberOverview(st.ov); /* warnings depend on settings */ }
  });
}

/** Show the studio in `root` (the live page, or a tab of the demo). `signal` removes listeners on unmount. */
export function mount({ root: r, nav: n, signal: sg } = {}) {
  root = r || document.getElementById('root');
  nav = n || document.getElementById('studio-nav');
  signal = sg;
  try { st.session = localStorage.getItem(KEY) || ''; } catch { /* private mode: sign in each visit */ }
  restore();
  window.addEventListener('hashchange', () => route(), { signal });
  root.addEventListener('input', () => { if (location.hash.startsWith('#/edit')) st.editDirty = true; }, { signal });
  document.addEventListener('change', syncEndDate, { signal });
  route();
}
void util;
