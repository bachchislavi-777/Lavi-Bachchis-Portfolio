// The client's signing page: lavibachchis.com/agreement/#<id>.<token>
import { call, linkParts, configured, BASE, esc, ApiError } from './api.js';
import { terms as T, money, dates } from '../../../agreements/core/index.js';
import { agreementHtml, signedWhen } from './render.js';

let root;
let S;
const logo = `${BASE}/brand/logo-horizontal.svg`;

function message(title, text, extra = '') {
  root.innerHTML = `<div class="center-msg"><h1>${esc(title)}</h1><p class="muted">${text}</p>${extra}</div>`;
  document.title = `${title} | Lavi Bachchis`;
}

async function start() {
  S = { data: null, clientType: '', earlyStart: false, sigMode: 'type', strokes: 0, pdf: null };
  if (!configured()) return message('Not switched on yet', 'Online signing isn’t available just yet. Please email <a href="mailto:hello@lavibachchis.com">hello@lavibachchis.com</a> and I’ll send your agreement another way.');
  const parts = linkParts();
  if (!parts) return message('This link isn’t complete', 'Please open the full link from your email or message. If it still doesn’t work, email <a href="mailto:hello@lavibachchis.com">hello@lavibachchis.com</a>.');
  root.innerHTML = '<div class="skeleton" aria-label="Loading your agreement"></div>';
  try {
    S.data = await call('agreement.get', parts);
  } catch (err) {
    return message(err.code === 'not_found' ? 'This link isn’t valid' : 'Couldn’t load the agreement', esc(err.message));
  }
  route();
}

function route() {
  const a = S.data.agreement;
  if (a.pending) return renderSign();
  if (a.signed) return renderSigned();
  if (a.status === 'cancelled') return message('This agreement was withdrawn', 'Lavi has withdrawn this agreement. If you think that’s a mistake, email <a href="mailto:hello@lavibachchis.com">hello@lavibachchis.com</a>.');
  return message('Not ready yet', 'This agreement isn’t ready to sign yet. Lavi will send you the link when it is.');
}

// ---------------------------------------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------------------------------------
const field = (id, label, { type = 'text', hint = '', auto = '', req = true, value = '', area = false } = {}) => `
  <label class="f" for="${id}">${esc(label)}${req ? '' : ' <span class="hint">(optional)</span>'}
    ${area ? `<textarea id="${id}" name="${id}" rows="3" autocomplete="${auto}" ${req ? 'required' : ''}>${esc(value)}</textarea>`
      : `<input id="${id}" name="${id}" type="${type}" autocomplete="${auto}" value="${esc(value)}" ${req ? 'required' : ''}>`}
    ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
  </label>`;

function previewDoc() {
  const p = S.data.agreement.pending;
  const ct = S.clientType;
  const dp = ct === 'consumer' ? (S.earlyStart ? p.datePreview.consumerEarly : p.datePreview.consumer) : ct === 'business' ? p.datePreview.business : null;
  const client = readClient();
  const doc = T.resolveDoc(p.doc, { clientType: ct, ...(dp || {}), client, earlyStart: S.earlyStart });
  if (p.amendment) doc.amendment = p.amendment;
  return doc;
}

function readClient() {
  const v = (id) => (document.getElementById(id)?.value || '').trim();
  if (!document.getElementById('c-name')) return S.data.agreement.pending.prefill;
  return { name: v('c-name'), role: v('c-role'), company: v('c-company'), companyNumber: v('c-number'), email: v('c-email'), billingEmail: v('c-billing'), phone: v('c-phone'), address: v('c-address') };
}

function renderSign() {
  const a = S.data.agreement;
  const p = a.pending;
  const doc0 = p.doc;
  const allowed = p.clientTypes;
  if (allowed !== 'either') S.clientType = allowed;
  const pre = p.prefill;
  const isAmend = !!p.amendment;
  const recurring = p.type !== 'project';
  const dp = p.datePreview.business;
  document.title = `Agreement ${a.ref} | Lavi Bachchis`;

  root.innerHTML = `
    ${a.test ? '<p class="warn"><b>Test agreement.</b> This is a practice run; nothing here is binding.</p><br>' : ''}
    <section class="summary noprint" aria-labelledby="sum-h">
      <p class="lbl">Agreement ${esc(a.ref)}${p.v > 1 ? ` · version ${p.v}` : ''} · from ${esc(S.data.business.name)}</p>
      <h1 id="sum-h">${isAmend ? 'Your updated agreement is ready to sign' : 'Your agreement is ready to sign'}</h1>
      <div class="kv">
        <span>${esc(recurring ? 'Package' : 'Project')}: <b>${esc(doc0.pkg.name && doc0.pkg.name !== 'Custom' ? doc0.pkg.name : (doc0.pkg.rows[0] ? doc0.pkg.rows[0][0] : 'Custom'))}</b></span>
        <span>${esc(doc0.pkg.feeLabel)}: <b>${esc(doc0.pkg.fee)}</b></span>
        ${recurring ? `<span>Rolling monthly, ${esc(p.noticeDays)} days’ notice</span>` : `<span>Deposit: <b>${esc(money.format(doc0.pkg.amounts.deposit, doc0.pkg.currency))}</b> on signing</span>`}
        ${!isAmend ? `<span>Starts: <b>${esc(dates.format(dp.startDate, p.region))}</b></span>` : ''}
      </div>
      <p style="margin:0;color:#DCE5DE">Read it below, then add your details and sign at the end. It takes about five minutes, and you can download a signed copy straight away.</p>
      <button class="btn" type="button" id="jump">Go to signing</button>
    </section>
    <div id="doc"></div>
    <section class="panel noprint" id="sign" aria-labelledby="sign-h" tabindex="-1">
      <h2 id="sign-h">${isAmend ? 'Sign the updated agreement' : 'Sign the agreement'}</h2>
      <p class="muted">Your details appear in the agreement above as you type.</p>
      <form id="form" class="steps" novalidate>
        ${allowed === 'either' ? `
        <fieldset class="bare" style="border:0;padding:0;background:none;margin:0">
          <legend style="padding:0;margin-bottom:10px">Who is signing?</legend>
          <div class="choice">
            <label><input type="radio" name="ctype" value="business" ${S.clientType === 'business' ? 'checked' : ''}><span><b>For a business</b><span>A company, partnership, charity or sole trader buying for work.</span></span></label>
            <label><input type="radio" name="ctype" value="consumer" ${S.clientType === 'consumer' ? 'checked' : ''}><span><b>As an individual</b><span>Buying for yourself, not for a business (a consumer).</span></span></label>
          </div>
        </fieldset>` : ''}
        <div id="details" ${S.clientType ? '' : 'hidden'}>
          <div class="grid2 biz">
            ${field('c-company', 'Business name', { auto: 'organization', value: pre.company })}
            ${field('c-number', 'Company number', { req: false, value: pre.companyNumber, hint: 'If it’s a registered company.' })}
          </div><br class="biz">
          <div class="grid2">
            ${field('c-name', 'Your full name', { auto: 'name', value: pre.name })}
            <div class="biz">${field('c-role', 'Your role', { auto: 'organization-title', value: pre.role, hint: 'For example Director or Owner.' })}</div>
          </div><br>
          ${field('c-address', 'Address', { area: true, auto: 'street-address', value: pre.address, hint: 'Full postal address, including postcode or ZIP.' })}<br>
          <div class="grid2">
            ${field('c-email', 'Email', { type: 'email', auto: 'email', value: pre.email, hint: 'Your signed copy is sent here.' })}
            ${field('c-billing', 'Email for invoices', { type: 'email', req: false, value: pre.billingEmail, hint: 'If invoices should go somewhere else, like accounts@.' })}
          </div><br>
          ${field('c-phone', 'Phone', { type: 'tel', auto: 'tel', req: false, value: pre.phone })}
        </div>
        <div id="consumer-start" hidden>
          <div class="note">
            <p><b>Your 14-day right to cancel.</b> As a consumer you can cancel within 14 days of signing, for any reason. Work normally starts after those 14 days (on <b id="cs-date"></b>).</p>
            <label class="check"><input type="checkbox" id="early"><span>Please start work during the 14 days. I understand that if I cancel during that time I pay for the work done up to then, and that once the service has been fully provided I can no longer cancel.</span></label>
          </div>
        </div>
        <div id="sigarea" ${S.clientType ? '' : 'hidden'}>
          <h3 style="margin-top:0">Your signature</h3>
          <div class="tabs-mini" role="group" aria-label="How to sign">
            <button type="button" data-sig="type" aria-pressed="true">Type</button>
            <button type="button" data-sig="draw" aria-pressed="false">Draw</button>
          </div>
          <div id="sig-type" style="margin-top:12px">
            ${field('sig-name', 'Type your full name to sign', { auto: 'off', hint: 'Exactly as above.' })}
            <div class="sig-preview" id="sig-prev" aria-hidden="true"></div>
          </div>
          <div id="sig-draw" hidden style="margin-top:12px">
            <p class="muted small">Sign with your finger, mouse or stylus.</p>
            <div class="sigpad"><canvas id="pad" aria-label="Signature drawing area"></canvas><span class="base"></span><button type="button" class="btn ghost small clear" id="pad-clear">Clear</button></div>
          </div>
          <div style="margin-top:16px;display:grid;gap:4px">
            <label class="check"><input type="checkbox" id="ok-agree"><span>I have read this agreement${isAmend ? ', including the changes,' : ''} and agree to its terms.</span></label>
            <label class="check"><input type="checkbox" id="ok-esign"><span>I agree to sign electronically and to receive this agreement and invoices by email.</span></label>
            <label class="check biz"><input type="checkbox" id="ok-auth"><span>I am authorised to sign for the business named above.</span></label>
          </div>
          <div id="form-err" class="err" role="alert" hidden style="margin-top:12px"></div>
          <div class="row" style="margin-top:16px">
            <button class="btn dark" type="submit" id="go">Sign agreement</button>
            <span class="muted small">The date and time are recorded when you click.</span>
          </div>
        </div>
      </form>
    </section>`;

  document.getElementById('jump').addEventListener('click', () => { const el = document.getElementById('sign'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true }); });
  const form = document.getElementById('form');
  const draw = () => { if (S.data.agreement.pending && document.getElementById('form')) document.getElementById('doc').innerHTML = agreementHtml(previewDoc(), { logo }); };
  const applyType = () => {
    const biz = S.clientType === 'business';
    form.querySelectorAll('.biz').forEach((el) => { el.hidden = !biz; });
    ['c-company', 'c-role'].forEach((id) => { document.getElementById(id).required = biz; });
    document.getElementById('details').hidden = !S.clientType;
    document.getElementById('sigarea').hidden = !S.clientType;
    const cs = document.getElementById('consumer-start');
    const showCs = S.clientType === 'consumer' && !S.data.agreement.startDate;
    cs.hidden = !showCs;
    if (showCs) document.getElementById('cs-date').textContent = dates.format(p.datePreview.consumer.startDate, p.region);
    draw();
  };
  form.querySelectorAll('input[name=ctype]').forEach((r) => r.addEventListener('change', () => { S.clientType = r.value; applyType(); }));
  document.getElementById('early').addEventListener('change', (ev) => { S.earlyStart = ev.target.checked; draw(); });
  let t;
  form.addEventListener('input', (ev) => {
    if (ev.target.id === 'sig-name') document.getElementById('sig-prev').textContent = ev.target.value;
    if (ev.target.id && ev.target.id.startsWith('c-')) { clearTimeout(t); t = setTimeout(draw, 250); }
  });
  form.querySelectorAll('[data-sig]').forEach((b) => b.addEventListener('click', () => {
    S.sigMode = b.dataset.sig;
    form.querySelectorAll('[data-sig]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.getElementById('sig-type').hidden = S.sigMode !== 'type';
    document.getElementById('sig-draw').hidden = S.sigMode !== 'draw';
    if (S.sigMode === 'draw') setupPad();
  }));
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
  applyType();
}

// Signature pad
function setupPad() {
  const c = document.getElementById('pad');
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  c.width = Math.round(r.width * ratio); c.height = Math.round(r.height * ratio);
  const ctx = c.getContext('2d');
  ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#163A2E';
  S.strokes = 0;
  if (c.dataset.wired) return;
  c.dataset.wired = '1';
  let down = false, last = null;
  const pos = (e) => { const b = c.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  c.addEventListener('pointerdown', (e) => { down = true; last = pos(e); c.setPointerCapture(e.pointerId); e.preventDefault(); });
  c.addEventListener('pointermove', (e) => {
    if (!down) return;
    const p = pos(e); const g = c.getContext('2d');
    g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; S.strokes += 1;
  });
  const up = () => { down = false; };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  document.getElementById('pad-clear').addEventListener('click', () => { const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore(); S.strokes = 0; });
}

function showErr(msg, focusId) {
  const el = document.getElementById('form-err');
  el.textContent = msg; el.hidden = false;
  if (focusId) document.getElementById(focusId)?.focus(); else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function submit() {
  const a = S.data.agreement;
  const p = a.pending;
  const c = readClient();
  const biz = S.clientType === 'business';
  const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  if (!S.clientType) return showErr('Please choose who is signing.');
  if (biz && c.company.length < 2) return showErr('Please enter the business name.', 'c-company');
  if (c.name.length < 2) return showErr('Please enter your full name.', 'c-name');
  if (biz && c.role.length < 2) return showErr('Please enter your role at the business.', 'c-role');
  if (c.address.length < 6) return showErr('Please enter your address.', 'c-address');
  if (!emailOk(c.email)) return showErr('Please enter a valid email address.', 'c-email');
  if (c.billingEmail && !emailOk(c.billingEmail)) return showErr('Please check the email for invoices.', 'c-billing');
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  let signature;
  if (S.sigMode === 'type') {
    const typed = document.getElementById('sig-name').value.trim();
    if (norm(typed) !== norm(c.name)) return showErr('Please type your name exactly as you entered it above.', 'sig-name');
    signature = { method: 'type', name: typed };
  } else {
    if (S.strokes < 8) return showErr('Please draw your signature in the box.');
    signature = { method: 'draw', name: c.name, image: document.getElementById('pad').toDataURL('image/png') };
  }
  const consents = { agree: document.getElementById('ok-agree').checked, esign: document.getElementById('ok-esign').checked, authority: biz && document.getElementById('ok-auth').checked, earlyStart: S.earlyStart };
  if (!consents.agree) return showErr('Please tick the box to confirm you have read and agree to the agreement.', 'ok-agree');
  if (!consents.esign) return showErr('Please tick the box to agree to sign electronically.', 'ok-esign');
  if (biz && !consents.authority) return showErr('Please confirm you are authorised to sign for the business.', 'ok-auth');

  const btn = document.getElementById('go');
  btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Signing…';
  document.getElementById('form-err').hidden = true;
  try {
    const res = await call('agreement.sign', { id: a.id, token: linkParts().token, v: p.v, rev: p.rev, clientType: S.clientType, client: c, consents, signature, ua: navigator.userAgent });
    S.data = { ...S.data, agreement: res.agreement };
    renderSigned({ justSigned: true });
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Sign agreement';
    if (err instanceof ApiError && err.code === 'stale') return showErr(`${err.message}`);
    showErr(err.message || 'Something went wrong. Please try again.');
  }
}

// ---------------------------------------------------------------------------------------------------------
// Signed
// ---------------------------------------------------------------------------------------------------------
function renderSigned({ justSigned = false } = {}) {
  const a = S.data.agreement;
  const s = a.signed;
  const doc = s.doc;
  const first = (doc.client.name || '').split(' ')[0];
  document.title = `Signed agreement ${a.ref} | Lavi Bachchis`;
  const ended = a.status === 'ended' ? `<p class="note">This agreement ended on ${esc(dates.format(a.ending.endDate, doc.region))}.</p><br>` : a.ending ? `<p class="note">This agreement is ending on ${esc(dates.format(a.ending.endDate, doc.region))}.</p><br>` : '';
  root.innerHTML = `
    ${a.test ? '<p class="warn"><b>Test agreement.</b> This was a practice run; nothing here is binding.</p><br>' : ''}
    <section class="panel done noprint" style="margin-top:0">
      ${justSigned ? '<div class="tick" aria-hidden="true">✓</div>' : ''}
      <h2>${justSigned ? `Signed. Thank you${first ? `, ${esc(first)}` : ''}.` : 'Your signed agreement'}</h2>
      <p>Agreement ${esc(a.ref)}${s.v > 1 ? `, version ${s.v},` : ''} was signed on ${esc(signedWhen(s.at, doc.region))}.</p>
      <p class="muted" id="mail-status" role="status">${justSigned ? 'Preparing your signed copy…' : 'A signed copy was emailed to you when you signed.'}</p>
      <div class="row"><button class="btn dark" id="dl" type="button">Download signed copy (PDF)</button><button class="btn ghost" type="button" id="print">Print</button></div>
    </section>
    <br>${ended}
    <div id="doc">${agreementHtml(doc, { signed: s, logo })}</div>`;
  document.getElementById('print').addEventListener('click', () => window.print());
  const dl = document.getElementById('dl');
  dl.addEventListener('click', async () => {
    dl.disabled = true; const label = dl.textContent; dl.innerHTML = '<span class="spin" aria-hidden="true"></span> Preparing PDF…';
    try { (await getPdf()).download(); } catch (e) { alert('Sorry, the PDF could not be made on this device. Please use Print instead, or email hello@lavibachchis.com.'); }
    dl.disabled = false; dl.textContent = label;
  });
  if (justSigned) { window.scrollTo({ top: 0 }); uploadCopy(); }
}

async function getPdf() {
  if (!S.pdf) {
    const { agreementPdf } = await import('./pdf.js');
    const s = S.data.agreement.signed;
    S.pdf = await agreementPdf(s.doc, s, { base: BASE });
  }
  return S.pdf;
}

async function uploadCopy() {
  const status = document.getElementById('mail-status');
  const a = S.data.agreement;
  try {
    const pdf = await getPdf();
    const b64 = await pdf.base64();
    const r = await call('agreement.pdf', { id: a.id, token: linkParts().token, v: a.signed.v, pdf: b64 });
    status.textContent = r.emailed || r.already ? `A signed copy has been emailed to you (${a.signed.doc.client.email}) and to ${S.data.business.email}.` : 'Your signed copy is saved.';
  } catch (e) {
    status.textContent = `Your agreement is signed and saved. A copy will be emailed to you (${a.signed.doc.client.email}) within the hour; you can also download it now.`;
  }
}

/** Show the page in `root` (the live page, or a tab of the demo). `signal` removes listeners on unmount. */
let shown = '';
export function mount({ root: r, signal } = {}) {
  root = r || document.getElementById('root');
  shown = location.hash;
  start();
  // Only a different agreement link reloads the page (not in-page jumps).
  window.addEventListener('hashchange', () => { if (linkParts() && location.hash !== shown) { shown = location.hash; start(); } }, { signal });
}
