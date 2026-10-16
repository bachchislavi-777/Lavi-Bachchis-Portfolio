// Branded emails. Simple tables and inline styles so they look right in Gmail, Outlook and Apple Mail.
/* global MailApp, Utilities */
import { util, money, dates } from '../core/index.js';
import { getSettings, ownerEmail, notifyEmail, siteUrl, studioLink } from './settings.js';
import { agreementHtml } from '../../src/lib/agreements/render.js';
import { log } from './store.js';

const C = { forest: '#163A2E', forestD: '#0F2A21', ivory: '#F4ECDF', paper: '#FBF6EE', line: '#DDD0BA', terra: '#B4532F', muted: '#566A5F', ochre: '#DCA94C' };
const e = util.esc;

function layout({ preheader = '', title, body, button, footnote = '' }) {
  const logo = `${siteUrl()}/brand/logo-h-168.png`;
  const b = getSettings().business;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head>
<body style="margin:0;padding:0;background:${C.ivory};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ivory};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
<tr><td style="padding:22px 28px;border-bottom:1px solid ${C.line};background:#FAF5E9;"><img src="${logo}" alt="Lavi Bachchis, Content &amp; Creative" width="180" height="42" style="display:block;border:0;height:42px;width:auto;"></td></tr>
<tr><td style="padding:30px 28px 8px 28px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${C.forest};">${e(title)}</td></tr>
<tr><td style="padding:8px 28px 8px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#173A2E;">${body}</td></tr>
${button ? `<tr><td style="padding:16px 28px 8px 28px;"><a href="${e(button.href)}" style="display:inline-block;background:${C.terra};color:#FFF6EC;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-weight:bold;font-size:15px;padding:13px 24px;border-radius:99px;">${e(button.label)}</a></td></tr>` : ''}
<tr><td style="padding:22px 28px 26px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${C.muted};">${footnote ? `${footnote}<br><br>` : ''}${e(b.name)} · ${e(b.trading)}<br><a href="mailto:${e(b.email)}" style="color:${C.muted};">${e(b.email)}</a> · <a href="${e(siteUrl())}" style="color:${C.muted};">${e(b.website)}</a></td></tr>
</table></td></tr></table></body></html>`;
}

const p = (text) => `<p style="margin:0 0 14px 0;">${text}</p>`;
const table = (rows) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 16px 0;border-top:1px solid ${C.line};">${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:14px;">${e(k)}</td><td style="padding:9px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:bold;font-size:14px;">${e(v)}</td></tr>`).join('')}</table>`;

function send({ to, cc, subject, html, text, attachments, ref }) {
  const b = getSettings().business;
  const opts = { to, subject, htmlBody: html, body: text || subject, name: `${b.name} · ${b.trading.replace(`${b.name} `, '')}`, replyTo: notifyEmail() };
  if (cc && cc !== to) opts.cc = cc;
  if (attachments && attachments.length) opts.attachments = attachments;
  MailApp.sendEmail(opts);
  log(ref, 'email', `${subject} → ${to}${opts.cc ? ` (cc ${opts.cc})` : ''}`);
}

const testTag = (test) => (test ? '[TEST] ' : '');

export function sendLoginCode(code) {
  send({
    to: ownerEmail(), subject: `Your studio sign-in code: ${code}`, ref: 'studio',
    html: layout({ preheader: `Code ${code}, valid for 10 minutes`, title: 'Your sign-in code', body: p(`Use this code to sign in to your agreements studio. It works once, for 10 minutes.`) + `<p style="margin:6px 0 18px 0;font-family:Menlo,Consolas,monospace;font-size:34px;letter-spacing:8px;color:${C.forest};">${code}</p>` + p('If you didn’t ask for this, you can ignore this email. Nobody can sign in without the code.') }),
  });
}

export function sendAgreementLink(a, link, message) {
  const c = a.versions[a.versions.length - 1].terms.client;
  const b = getSettings().business;
  const amend = a.versions.some((v) => v.signed);
  send({
    to: c.email, cc: notifyEmail(), ref: a.ref,
    subject: `${testTag(a.test)}${amend ? 'Updated agreement' : 'Your agreement'} with ${b.name} is ready to sign (${a.ref})`,
    html: layout({
      preheader: 'Read it, add your details and sign online in a few minutes.',
      title: amend ? 'Your updated agreement is ready' : 'Your agreement is ready to sign',
      body: p(`Hi ${e((c.name || '').split(' ')[0] || 'there')},`) + (message ? p(e(message).replace(/\n/g, '<br>')) : '')
        + p(amend ? 'I’ve updated our agreement as we discussed. The page shows exactly what has changed. Please read it and sign the new version.' : 'Here is our service agreement. Please read it, fill in your details and sign online. It takes a few minutes, and you can download a signed copy straight away.')
        + p('This link is just for you, so please don’t share it.'),
      button: { href: link, label: amend ? 'Review and sign' : 'Read and sign' },
    }),
  });
}

export function sendSigned(a, ver, pdfBlob, link) {
  const s = ver.signed;
  const c = s.client;
  const b = getSettings().business;
  const name = c.company ? `${c.name} (${c.company})` : c.name;
  const facts = table([['Agreement', `${a.ref} · version ${ver.v}`], ['Signed', `${dates.format(s.date, ver.terms.region)} · ${s.at.slice(11, 16)} UTC`], [ver.terms.type === 'project' ? 'Project fee' : 'Monthly fee', money.format(Number(ver.terms.fee), ver.terms.currency)], ['Starts', dates.format(a.startDate, ver.terms.region)]]);
  const attachments = pdfBlob ? [pdfBlob] : [];
  const where = pdfBlob ? 'Your signed copy is attached.' : 'You can view and download your signed copy at any time from the link below.';
  send({
    to: c.email, ref: a.ref, attachments,
    subject: `${testTag(a.test)}Signed: your agreement with ${b.name} (${a.ref})`,
    html: layout({ preheader: 'Your signed copy of our agreement.', title: 'Thank you, it’s signed', body: p(`Hi ${e(c.name.split(' ')[0])},`) + p(`Thank you for signing. ${where} Keep it for your records.`) + facts + p('I’ll be in touch about next steps. Any questions, just reply to this email.'), button: { href: link, label: 'View signed agreement' } }),
  });
  send({
    to: notifyEmail(), ref: a.ref, attachments: pdfBlob ? [pdfBlob.copyBlob ? pdfBlob.copyBlob() : pdfBlob] : [],
    subject: `${testTag(a.test)}Signed: ${a.ref} v${ver.v} by ${name}`,
    html: layout({ preheader: `${name} signed ${a.ref}.`, title: `${a.ref} is signed`, body: p(`${e(name)} signed version ${ver.v}.`) + facts + table([['Email', c.email], ['Signs as', s.clientType === 'consumer' ? 'Consumer' : 'Business'], ['Fingerprint', `${s.fingerprint.slice(0, 16)}…`]]) + (s.clientType === 'consumer' && !s.earlyStart ? p('They did not ask you to start within the 14-day cancellation period, so work starts on the start date above.') : ''), button: { href: studioLink(), label: 'Open studio' } }),
  });
}

export function sendInvoice(inv, link, { reminder = false } = {}) {
  const st = getSettings();
  const total = money.format(inv.amount, inv.currency);
  const due = dates.format(inv.dueDate, inv.region);
  const pay = paymentRows(inv.payment, inv.number);
  const overdue = reminder && inv.dueDate < dates.londonDate(new Date());
  send({
    to: inv.billTo.billingEmail || inv.billTo.email,
    cc: st.invoices.copyMe ? notifyEmail() : '',
    ref: inv.agreementRef || inv.number,
    subject: `${testTag(inv.test)}${reminder ? 'Reminder: ' : ''}Invoice ${inv.number} from ${st.business.name}, ${total} due ${due}`,
    html: layout({
      preheader: `${total} due ${due}.`,
      title: reminder ? (overdue ? `Invoice ${inv.number} is overdue` : `Reminder: invoice ${inv.number}`) : `Invoice ${inv.number}`,
      body: p(`Hi ${e((inv.billTo.name || '').split(' ')[0] || 'there')},`)
        + p(reminder ? `A friendly reminder that invoice ${e(inv.number)} for ${e(total)} ${overdue ? `was due on ${e(due)}` : `is due on ${e(due)}`}. If you’ve already paid, thank you, and please ignore this.` : `Here is your invoice for ${e(inv.lines[0].text.replace(/\.$/, ''))}${inv.lines.length > 1 ? ' and more' : ''}.`)
        + table([['Invoice', inv.number], ['Amount due', total], ['Due by', due]])
        + (pay ? `<p style="margin:0 0 6px 0;font-weight:bold;">How to pay</p>${pay}` : ''),
      button: { href: link, label: 'View or download invoice' },
      footnote: 'Payment terms are set out in our agreement.',
    }),
  });
}

function paymentRows(pay, number) {
  if (!pay) return '';
  const r = [];
  if (pay.accountName) r.push(['Account name', pay.accountName]);
  if (pay.bankName) r.push(['Bank', pay.bankName]);
  if (pay.sortCode) r.push(['Sort code', pay.sortCode]);
  if (pay.accountNumber) r.push(['Account number', pay.accountNumber]);
  if (pay.iban) r.push(['IBAN', pay.iban]);
  if (pay.bic) r.push(['BIC / SWIFT', pay.bic]);
  if (pay.paypal) r.push(['PayPal', pay.paypal]);
  if (!r.length) return '';
  r.push(['Reference', number]);
  return table(r);
}

export function sendEnding(a, ver, ending) {
  const c = (ver.signed && ver.signed.client) || ver.terms.client;
  send({
    to: c.email, cc: notifyEmail(), ref: a.ref,
    subject: `${testTag(a.test)}Confirming the end date of our agreement (${a.ref})`,
    html: layout({ preheader: `Last day: ${dates.format(ending.endDate, ver.terms.region)}`, title: 'Confirming our end date', body: p(`Hi ${e((c.name || '').split(' ')[0])},`) + p(`This confirms that our agreement ${e(a.ref)} ends on <b>${e(dates.format(ending.endDate, ver.terms.region))}</b>${ending.noticeDate ? `, following notice given on ${e(dates.format(ending.noticeDate, ver.terms.region))}` : ''}.`) + (ending.note ? p(e(ending.note)) : '') + p('Any final invoice will follow as set out in the agreement. Thank you for working with me.') }),
  });
}

export function sendOwnerAlert(subject, text) {
  send({ to: notifyEmail(), subject, ref: 'system', html: layout({ title: subject, body: p(e(text).replace(/\n/g, '<br>')), button: { href: studioLink(), label: 'Open studio' } }) });
}

// A copy made on the server, for when the client's browser didn't send its PDF (so the email still carries
// the signed agreement itself, not just a link). Google converts the HTML to PDF; if that fails, the HTML is attached.
const PRINT_CSS = `body{font-family:Helvetica,Arial,sans-serif;color:#173A2E;font-size:11pt;line-height:1.45;margin:0}
.doc-head{overflow:hidden;margin-bottom:18px}.doc-head img{height:36px;float:left}.doc-ref{float:right;text-align:right;font-size:9pt;color:#B4532F}
.lbl{font-family:Courier,monospace;font-size:8pt;letter-spacing:2px;text-transform:uppercase;color:#B4532F;margin:0 0 4px}
h1{font-family:Georgia,serif;font-size:24pt;margin:0 0 4px}.sub,.muted{color:#566A5F}.parties{margin:12px 0}
.party{border:1px solid #E7DCC8;background:#FAF5E9;padding:8px 10px;margin:0 0 8px}.party p{margin:0 0 3px}
h2{font-family:Georgia,serif;font-size:14pt;margin:16px 0 6px}.num{color:#B4532F}table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:4px 6px 4px 0;border-top:1px solid #DDD0BA;font-weight:normal;vertical-align:top}
ol{padding-left:20px}li{margin:0 0 4px}.sig-me{font-family:Georgia,serif;font-style:italic;font-size:18pt}
.sig-typed{font-family:Georgia,serif;font-style:italic;font-size:18pt}.sig-img{height:50px}.fp{font-size:8pt;color:#566A5F}
.cond{color:#B4532F}.amend{border:1px solid #EBCB85;background:#FFF6E0;padding:8px 10px}`;

export function serverCopy(a, ver) {
  const s = ver.signed;
  const c = s.client;
  const base = `${a.ref} v${ver.v} - ${(c.company || c.name).replace(/[\\/:*?"<>|]/g, '')} - signed`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${util.esc(base)}</title><style>${PRINT_CSS}</style></head><body>${agreementHtml(s.doc, { signed: s, logo: `${siteUrl()}/brand/logo-h-168.png` })}</body></html>`;
  const blob = Utilities.newBlob(html, 'text/html', `${base}.html`);
  try { return blob.getAs('application/pdf').setName(`${base}.pdf`); } catch (e) { return blob; }
}
