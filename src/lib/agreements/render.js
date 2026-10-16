// Turns an agreement or invoice record into HTML for the signing page, the invoice page and the studio.
// The PDF (pdf.js) follows the same structure, so what clients read on screen is what they download.
import { util, money, dates } from '../../../agreements/core/index.js';

const e = util.esc;
const lines = (s) => e(s).replace(/\n/g, '<br>');
/** '16 October 2026 at 13:37 UK time (12:37 UTC)' for a signing timestamp. */
export function signedWhen(at, region = 'uk') {
  const local = dates.londonDateTime(new Date(at));
  return `${dates.format(local.slice(0, 10), region)} at ${local.slice(11)} UK time (${at.slice(11, 16)} UTC)`;
}
const tag = (when) => (when === 'business' ? 'If you sign as a business' : when === 'consumer' ? 'If you sign as an individual (consumer)' : '');

export function partyBlocks(doc, { clientPlaceholder = true } = {}) {
  const me = doc.me;
  const c = doc.client || {};
  const consumer = doc.clientType === 'consumer';
  const cName = consumer ? c.name : (c.company || c.name);
  const clientHtml = cName
    ? `<b>${e(cName)}</b>${!consumer && c.company && c.name ? `<br>Represented by ${e(c.name)}${c.role ? `, ${e(c.role)}` : ''}` : ''}${c.companyNumber ? `<br>Company number ${e(c.companyNumber)}` : ''}${c.address ? `<br>${lines(c.address)}` : ''}${c.email ? `<br>${e(c.email)}` : ''}`
    : (clientPlaceholder ? '<span class="muted">Your details are added when you sign.</span>' : '');
  return `<div class="parties">
    <div class="party"><p class="lbl">Between me</p><p><b>${e(me.name)}</b>, trading as ${e(me.trading)}${me.address ? `<br>${lines(me.address)}` : ''}<br>${e(me.email)}</p><p class="muted">(“I”, “me”)</p></div>
    <div class="party"><p class="lbl">And you</p><p>${clientHtml}</p><p class="muted">(“you”)</p></div>
  </div>`;
}

/**
 * opts: { signed: {at, date, signature, fingerprint}, showConditions: bool, highlight: Set of clause ids, draftNote }
 */
export function agreementHtml(doc, opts = {}) {
  const { signed, showConditions = true } = opts;
  let n = 0;
  const sections = doc.sections.map((s) => {
    n += 1;
    const body = [];
    if (s.id === 'scope') {
      const rows = [[ 'Package', doc.pkg.name || 'Custom' ], ...doc.pkg.rows];
      body.push(`<table class="pkg"><tbody>${rows.map(([l, v], i) => `<tr${i === 0 ? ' class="first"' : ''}><th scope="row">${e(l)}</th><td>${e(v)}</td></tr>`).join('')}
        <tr class="fee"><th scope="row">${e(doc.pkg.feeLabel)}</th><td><b>${e(doc.pkg.fee)}</b> <span class="muted">${e(doc.pkg.feeNote)}</span></td></tr>
        ${doc.type === 'project' ? `<tr><th scope="row">Payments</th><td>${e(doc.pkg.paymentLine)}</td></tr>` : ''}</tbody></table>`);
      if (doc.pkg.note) body.push(`<p>${lines(doc.pkg.note)}</p>`);
    }
    const items = s.items.map((i) => {
      const t = showConditions && i.when && !doc.clientType ? `<span class="cond">${tag(i.when)}</span> ` : '';
      const mark = i.edited || i.added ? ' data-custom="1"' : '';
      return `<li id="c-${e(i.id)}"${mark}>${t}${lines(i.text)}</li>`;
    }).join('');
    if (s.numbered) body.push(`<ol class="clauses">${items}</ol>`);
    else body.push(s.items.map((i) => `<p id="c-${e(i.id)}">${lines(i.text)}</p>`).join(''));
    return `<section class="sec"><h2><span class="num">${n}.</span> ${e(s.title)}</h2>${body.join('')}</section>`;
  }).join('');

  const amend = doc.amendment
    ? `<div class="amend"><p class="lbl">Version ${doc.version}: updated agreement</p><p>This version replaces version ${doc.amendment.replaces}, signed on ${e(dates.format(doc.amendment.replacesDate, doc.region))}.${doc.amendment.effectiveFrom ? ` The changes apply from <b>${e(dates.format(doc.amendment.effectiveFrom, doc.region))}</b>; anything before then stays under the earlier version.` : ''}</p>${doc.amendment.changes && doc.amendment.changes.length ? `<ul>${doc.amendment.changes.map((c) => `<li>${e(c)}</li>`).join('')}</ul>` : ''}</div>`
    : '';

  const annex = (doc.annex || []).map((a) => `<section class="sec annex">${showConditions && a.when && !doc.clientType ? `<span class="cond">${tag(a.when)}</span>` : ''}<h2>${e(a.title)}</h2><p class="muted">${e(a.intro)}</p>${a.lines.map((l) => `<p>${e(l)}</p>`).join('')}</section>`).join('');

  return `<article class="doc">
    <div class="doc-head"><img src="${opts.logo || '/brand/logo-horizontal.svg'}" alt="Lavi Bachchis" width="180" height="42"><div class="doc-ref"><span class="lbl">Agreement ${e(doc.ref)}${doc.version > 1 ? ` · v${doc.version}` : ''}</span><span class="muted">${e(doc.me.email)} · ${e(doc.me.website)}</span></div></div>
    ${opts.banner || ''}
    <h1>${e(doc.title)}</h1>
    <p class="sub">${e(doc.subtitle)}</p>
    ${amend}
    ${partyBlocks(doc)}
    ${sections}
    ${signatureBlock(doc, signed)}
    ${annex}
    ${signed ? `<p class="fp">Agreement ${e(doc.ref)}${doc.version > 1 ? ` version ${doc.version}` : ''} · document fingerprint (SHA-256) <code>${e(signed.fingerprint)}</code> · signed copy emailed to both parties.</p>` : ''}
  </article>`;
}

export function signatureBlock(doc, signed) {
  const me = doc.me;
  const c = doc.client || {};
  const who = doc.clientType === 'consumer' || !c.company ? e(c.name || '') : `${e(c.name)} <span class="muted">for ${e(c.company)}</span>`;
  const sig = signed
    ? (signed.signature.method === 'draw' && signed.signature.image
      ? `<img class="sig-img" src="${e(signed.signature.image)}" alt="Signature of ${e(signed.signature.name)}">`
      : `<p class="sig-typed">${e(signed.signature.name)}</p>`)
    : '<p class="sig-wait">Your signature goes here</p>';
  return `<section class="sec signed"><p class="lbl rule">Signed</p><div class="parties sigs">
    <div class="party"><p><b>${e(me.name)}</b></p><p class="sig-me">${e(me.name)}</p><p class="muted">Offered on ${e(dates.format(doc.offeredDate, doc.region))}</p></div>
    <div class="party"><p><b>${who || 'You'}</b></p>${sig}<p class="muted">${signed ? `Signed electronically on ${e(signedWhen(signed.at, doc.region))}` : 'Signed electronically when you click Sign'}</p></div>
  </div></section>`;
}

// ---------------------------------------------------------------------------------------------------------
export function invoiceStatus(inv, today) {
  if (inv.status === 'paid') return { key: 'paid', label: `Paid${inv.paidOn ? ` on ${dates.formatShort(inv.paidOn, inv.region)}` : ''}` };
  if (inv.status === 'void') return { key: 'void', label: 'Cancelled' };
  if (today && inv.dueDate < today) return { key: 'overdue', label: `Overdue since ${dates.formatShort(inv.dueDate, inv.region)}` };
  return { key: 'due', label: `Due ${dates.formatShort(inv.dueDate, inv.region)}` };
}

export function invoiceHtml(inv, { today, logo } = {}) {
  const f = (m) => money.format(m, inv.currency);
  const st = invoiceStatus(inv, today);
  const b = inv.billTo;
  const p = inv.payment || {};
  const pay = [
    ['Account name', p.accountName], ['Bank', p.bankName], ['Sort code', p.sortCode], ['Account number', p.accountNumber],
    ['IBAN', p.iban], ['BIC / SWIFT', p.bic], ['PayPal', p.paypal],
  ].filter(([, v]) => v);
  return `<article class="doc invoice">
    <div class="doc-head"><img src="${logo || '/brand/logo-horizontal.svg'}" alt="Lavi Bachchis" width="180" height="42"><div class="doc-ref"><span class="lbl">Invoice ${e(inv.number)}</span><span class="muted">${e(inv.from.email)} · ${e(inv.from.website)}</span></div></div>
    <div class="inv-title"><h1>Invoice</h1><span class="badge ${st.key}">${e(st.label)}</span></div>
    <div class="parties">
      <div class="party"><p class="lbl">From</p><p><b>${e(inv.from.name)}</b><br>${e(inv.from.trading)}${inv.from.address ? `<br>${lines(inv.from.address)}` : ''}<br>${e(inv.from.email)}${inv.from.vatNumber ? `<br>VAT ${e(inv.from.vatNumber)}` : ''}</p></div>
      <div class="party"><p class="lbl">To</p><p><b>${e(b.company || b.name)}</b>${b.company ? `<br>${e(b.name)}` : ''}${b.address ? `<br>${lines(b.address)}` : ''}<br>${e(b.billingEmail || b.email)}</p></div>
    </div>
    <dl class="facts">
      <div><dt>Invoice number</dt><dd>${e(inv.number)}</dd></div>
      <div><dt>Issue date</dt><dd>${e(dates.format(inv.issueDate, inv.region))}</dd></div>
      <div><dt>Due date</dt><dd>${e(dates.format(inv.dueDate, inv.region))}</dd></div>
      ${inv.agreementRef ? `<div><dt>Agreement</dt><dd>${e(inv.agreementRef)}</dd></div>` : ''}
    </dl>
    <table class="lines"><thead><tr><th scope="col">Description</th><th scope="col" class="amt">Amount</th></tr></thead>
      <tbody>${inv.lines.map((l) => `<tr><td>${e(l.text)}</td><td class="amt">${e(f(l.amount))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">Total due (${e(inv.currency)})</th><td class="amt"><b>${e(f(inv.amount))}</b></td></tr></tfoot></table>
    ${inv.vatNote ? `<p class="muted small">${e(inv.vatNote)}</p>` : ''}
    <section class="sec pay"><h2>How to pay</h2>
      ${pay.length ? `<table class="pkg"><tbody>${pay.map(([k, v]) => `<tr><th scope="row">${e(k)}</th><td>${e(v)}</td></tr>`).join('')}<tr><th scope="row">Payment reference</th><td><b>${e(inv.number)}</b></td></tr></tbody></table>` : '<p>Payment details to follow by email.</p>'}
      ${p.note ? `<p class="muted small">${e(p.note)}</p>` : ''}
      <p class="muted small">Payment is due within the terms of our agreement${inv.agreementRef ? ` (${e(inv.agreementRef)})` : ''}. Questions? Email ${e(inv.from.email)}.</p>
    </section>
  </article>`;
}
