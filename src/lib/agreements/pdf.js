// Branded PDFs for signed agreements and invoices, made in the browser with pdfmake and the site's own fonts
// (Playfair Display, Hanken Grotesk, DM Mono, Caveat; full Latin + Latin Extended so names like Łukasz or
// Zoë print correctly). Loaded only when someone downloads, so the pages stay light.
import { money, dates } from '../../../agreements/core/index.js';
import { signedWhen } from './render.js';

const C = { forest: '#163A2E', text: '#173A2E', muted: '#566A5F', terra: '#B4532F', line: '#DDD0BA', card: '#FAF5E9', cardLine: '#E7DCC8' };
const FONT_FILES = {
  'hanken-400.ttf': 0, 'hanken-600.ttf': 0, 'hanken-400i.ttf': 0, 'playfair-400.ttf': 0, 'playfair-600.ttf': 0,
  'playfair-500i.ttf': 0, 'dmmono-400.ttf': 0, 'caveat-600.ttf': 0,
};

let loading = null;
async function engine(base) {
  if (!loading) loading = (async () => {
    const [mod, logo, ...fonts] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      fetch(`${base}/brand/logo-horizontal.svg`).then((r) => r.text()),
      ...Object.keys(FONT_FILES).map((f) => fetch(`${base}/fonts/pdf/${f}`).then((r) => { if (!r.ok) throw new Error(`font ${f}`); return r.arrayBuffer(); })),
    ]);
    const pdfMake = mod.default || mod;
    const vfs = {};
    Object.keys(FONT_FILES).forEach((f, i) => { vfs[f] = b64(fonts[i]); });
    const fontDefs = {
      Hanken: { normal: 'hanken-400.ttf', bold: 'hanken-600.ttf', italics: 'hanken-400i.ttf', bolditalics: 'hanken-600.ttf' },
      Playfair: { normal: 'playfair-400.ttf', bold: 'playfair-600.ttf', italics: 'playfair-500i.ttf', bolditalics: 'playfair-500i.ttf' },
      Mono: { normal: 'dmmono-400.ttf', bold: 'dmmono-400.ttf', italics: 'dmmono-400.ttf', bolditalics: 'dmmono-400.ttf' },
      Caveat: { normal: 'caveat-600.ttf', bold: 'caveat-600.ttf', italics: 'caveat-600.ttf', bolditalics: 'caveat-600.ttf' },
    };
    return { pdfMake, vfs, fontDefs, logo: logo.replace(/<title>.*?<\/title>/s, '') };
  })().catch((err) => { loading = null; throw err; });
  return loading;
}
function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const lbl = (text, extra = {}) => ({ text: String(text).toUpperCase(), font: 'Mono', fontSize: 7.5, color: C.terra, characterSpacing: 1.5, margin: [0, 0, 0, 5], ...extra });
const card = (stack) => ({ table: { widths: ['*'], body: [[{ stack, fillColor: C.card, margin: [10, 9, 10, 9] }]] }, layout: { hLineColor: () => C.cardLine, vLineColor: () => C.cardLine, hLineWidth: () => 0.6, vLineWidth: () => 0.6 } });
const twoCards = (a, b) => ({ columns: [card(a), card(b)], columnGap: 12, margin: [0, 0, 0, 16] });
const header = (logo, right1, right2) => ({
  columns: [
    { svg: logo, width: 150 },
    { stack: [lbl(right1, { alignment: 'right', margin: [0, 6, 0, 3] }), { text: right2, fontSize: 8, color: C.terra, alignment: 'right' }], width: '*' },
  ],
  margin: [0, 0, 0, 22],
});
const footer = (left) => (page, pages) => ({
  columns: [{ text: left, alignment: 'left' }, { text: `Page ${page} of ${pages}`, alignment: 'right' }],
  font: 'Mono', fontSize: 7, color: C.muted, margin: [48, 18, 48, 0],
});
const baseDoc = (content, footerText, info) => ({
  pageSize: 'A4', pageMargins: [48, 44, 48, 56], content, footer: footer(footerText), info,
  defaultStyle: { font: 'Hanken', fontSize: 9.5, lineHeight: 1.3, color: C.text },
  styles: {
    h1: { font: 'Playfair', bold: true, fontSize: 26, color: C.forest, margin: [0, 0, 0, 4] },
    h2: { font: 'Playfair', bold: true, fontSize: 13.5, color: C.forest, margin: [0, 14, 0, 6] },
    muted: { color: C.muted },
  },
});
const rowsTable = (rows, widths = [150, '*']) => ({
  table: { widths, body: rows },
  layout: { hLineColor: () => C.line, hLineWidth: (i) => (i === 0 ? 0 : 0.6), vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
  margin: [0, 0, 0, 8],
});

function linesOf(s) { return String(s || '').split('\n'); }

function partiesCards(doc) {
  const me = doc.me;
  const c = doc.client || {};
  const consumer = doc.clientType === 'consumer';
  const cName = consumer ? c.name : (c.company || c.name);
  const you = [lbl('And you')];
  if (cName) {
    you.push({ text: cName, bold: true });
    if (!consumer && c.company && c.name) you.push({ text: `Represented by ${c.name}${c.role ? `, ${c.role}` : ''}` });
    if (c.companyNumber) you.push({ text: `Company number ${c.companyNumber}` });
    linesOf(c.address).forEach((l) => l && you.push({ text: l }));
    if (c.email) you.push({ text: c.email });
  } else you.push({ text: 'Your details are added when you sign.', style: 'muted' });
  you.push({ text: '(“you”)', style: 'muted', margin: [0, 6, 0, 0] });
  const mine = [lbl('Between me'), { text: [{ text: me.name, bold: true }, `, trading as ${me.trading}`] }];
  linesOf(me.address).forEach((l) => l && mine.push({ text: l }));
  mine.push({ text: me.email }, { text: '(“I”, “me”)', style: 'muted', margin: [0, 6, 0, 0] });
  return twoCards(mine, you);
}

function agreementDef(doc, signed, logo) {
  const content = [header(logo, `Agreement ${doc.ref}${doc.version > 1 ? ` · v${doc.version}` : ''}`, `${doc.me.email} · ${doc.me.website}`)];
  content.push({ text: doc.title, style: 'h1' }, { text: doc.subtitle, style: 'muted', margin: [0, 0, 0, 14] });
  if (doc.amendment) {
    const a = doc.amendment;
    content.push(card([
      lbl(`Version ${doc.version}: updated agreement`),
      { text: `This version replaces version ${a.replaces}, signed on ${dates.format(a.replacesDate, doc.region)}.${a.effectiveFrom ? ` The changes apply from ${dates.format(a.effectiveFrom, doc.region)}; anything before then stays under the earlier version.` : ''}` },
      ...(a.changes && a.changes.length ? [{ ul: a.changes, margin: [0, 4, 0, 0] }] : []),
    ]), { text: '', margin: [0, 0, 0, 12] });
  }
  content.push(partiesCards(doc));
  doc.sections.forEach((s, idx) => {
    const head = { text: [{ text: `${idx + 1}.  `, color: C.terra }, s.title], style: 'h2' };
    const block = [head];
    if (s.id === 'scope') {
      const rows = [[{ text: 'Package', style: 'muted' }, { text: doc.pkg.name || 'Custom', bold: true }], ...doc.pkg.rows.map(([l, v]) => [{ text: l, style: 'muted' }, v])];
      rows.push([{ text: doc.pkg.feeLabel, style: 'muted' }, { text: [{ text: doc.pkg.fee, bold: true }, { text: `  ${doc.pkg.feeNote}`, style: 'muted' }] }]);
      if (doc.type === 'project') rows.push([{ text: 'Payments', style: 'muted' }, doc.pkg.paymentLine]);
      block.push(rowsTable(rows));
      if (doc.pkg.note) block.push({ text: doc.pkg.note, margin: [0, 0, 0, 6] });
    }
    const cond = (i) => (i.when && !doc.clientType ? [{ text: i.when === 'business' ? '[If you sign as a business] ' : '[If you sign as an individual] ', color: C.terra }, i.text] : i.text);
    if (s.numbered) block.push({ ol: s.items.map((i) => ({ text: cond(i), margin: [0, 0, 0, 3] })), markerColor: C.muted, margin: [0, 0, 0, 2] });
    else s.items.forEach((i) => block.push({ text: cond(i), margin: [0, 0, 0, 4] }));
    // keep a heading with its first lines
    content.push({ stack: block.slice(0, 2), unbreakable: s.id !== 'scope' && JSON.stringify(block).length < 1400 }, ...block.slice(2));
  });

  const c = doc.client || {};
  const who = doc.clientType === 'consumer' || !c.company ? [{ text: c.name || 'You', bold: true }] : [{ text: c.name, bold: true }, { text: ` for ${c.company}`, style: 'muted' }];
  const theirSig = signed
    ? (signed.signature.method === 'draw' && signed.signature.image ? { image: signed.signature.image, fit: [190, 52], margin: [0, 4, 0, 4] } : { text: signed.signature.name, font: 'Caveat', fontSize: 26, color: C.forest, margin: [0, 2, 0, 2] })
    : { text: 'Not signed yet', style: 'muted', margin: [0, 14, 0, 14] };
  content.push({
    unbreakable: true, margin: [0, 18, 0, 0],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1.2, lineColor: C.terra }], margin: [0, 0, 0, 8] },
      lbl('Signed'),
      twoCards(
        [{ text: doc.me.name, bold: true }, { text: doc.me.name, font: 'Playfair', italics: true, fontSize: 21, color: C.forest, margin: [0, 4, 0, 4] }, { text: `Offered on ${dates.format(doc.offeredDate, doc.region)}`, style: 'muted' }],
        [{ text: who }, theirSig, { text: signed ? `Signed electronically on ${signedWhen(signed.at, doc.region)}` : 'Signature pending', style: 'muted' }],
      ),
      ...(signed ? [{ text: `Agreement ${doc.ref}${doc.version > 1 ? ` version ${doc.version}` : ''} · document fingerprint (SHA-256) ${signed.fingerprint} · signed copy emailed to both parties.`, fontSize: 7.5, color: C.muted }] : []),
    ],
  });
  (doc.annex || []).forEach((a) => {
    content.push({ text: a.title, style: 'h2', pageBreak: 'before' }, { text: a.intro, style: 'muted', margin: [0, 0, 0, 10] }, ...a.lines.map((l) => ({ text: l, margin: [0, 0, 0, 9] })));
  });
  return baseDoc(content, `Agreement ${doc.ref}${doc.version > 1 ? ` v${doc.version}` : ''} · ${doc.me.name}`, {
    title: `Service agreement ${doc.ref}`, author: doc.me.name, subject: 'Service agreement', creator: 'lavibachchis.com',
    // The backend checks for this before filing the PDF, so only this agreement's copy is accepted.
    keywords: signed ? `${doc.ref} v${doc.version} ${signed.fingerprint}` : doc.ref,
  });
}

function invoiceDef(inv, logo, today) {
  const f = (m) => money.format(m, inv.currency);
  const b = inv.billTo;
  const content = [header(logo, `Invoice ${inv.number}`, `${inv.from.email} · ${inv.from.website}`)];
  const status = inv.status === 'paid' ? `PAID${inv.paidOn ? ` ${dates.formatShort(inv.paidOn, inv.region).toUpperCase()}` : ''}` : inv.status === 'void' ? 'CANCELLED' : '';
  content.push({ columns: [{ text: 'Invoice', style: 'h1' }, status ? { text: status, font: 'Mono', fontSize: 11, color: inv.status === 'paid' ? '#2E6B4F' : C.terra, alignment: 'right', margin: [0, 10, 0, 0], characterSpacing: 1.5 } : { text: '' }], margin: [0, 0, 0, 12] });
  const from = [lbl('From'), { text: inv.from.name, bold: true }, inv.from.trading, ...linesOf(inv.from.address).filter(Boolean), inv.from.email, ...(inv.from.vatNumber ? [`VAT ${inv.from.vatNumber}`] : [])];
  const to = [lbl('To'), { text: b.company || b.name, bold: true }, ...(b.company ? [b.name] : []), ...linesOf(b.address).filter(Boolean), b.billingEmail || b.email];
  content.push(twoCards(from, to));
  const facts = [['Invoice number', inv.number], ['Issue date', dates.format(inv.issueDate, inv.region)], ['Due date', dates.format(inv.dueDate, inv.region)]];
  if (inv.agreementRef) facts.push(['Agreement', inv.agreementRef]);
  content.push({ columns: facts.map(([k, v]) => ({ stack: [lbl(k), { text: v, bold: true }] })), margin: [0, 0, 0, 16] });
  content.push({
    table: {
      widths: ['*', 110], headerRows: 1,
      body: [
        [{ text: 'Description', style: 'muted' }, { text: 'Amount', style: 'muted', alignment: 'right' }],
        ...inv.lines.map((l) => [l.text, { text: f(l.amount), alignment: 'right' }]),
        [{ text: `Total due (${inv.currency})`, bold: true }, { text: f(inv.amount), bold: true, alignment: 'right', fontSize: 12 }],
      ],
    },
    layout: { hLineColor: (i, node) => (i === node.table.body.length - 1 ? C.forest : C.line), hLineWidth: (i, node) => (i === 0 ? 0 : i === node.table.body.length - 1 ? 1 : 0.6), vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 6, paddingBottom: () => 6 },
    margin: [0, 0, 0, 6],
  });
  if (inv.vatNote) content.push({ text: inv.vatNote, style: 'muted', fontSize: 8.5 });
  const p = inv.payment || {};
  const pay = [['Account name', p.accountName], ['Bank', p.bankName], ['Sort code', p.sortCode], ['Account number', p.accountNumber], ['IBAN', p.iban], ['BIC / SWIFT', p.bic], ['PayPal', p.paypal]].filter(([, v]) => v);
  content.push({ text: 'How to pay', style: 'h2', margin: [0, 20, 0, 6] });
  if (pay.length) content.push(rowsTable([...pay.map(([k, v]) => [{ text: k, style: 'muted' }, v]), [{ text: 'Payment reference', style: 'muted' }, { text: inv.number, bold: true }]]));
  else content.push({ text: 'Payment details to follow by email.' });
  if (p.note) content.push({ text: p.note, style: 'muted', fontSize: 8.5 });
  content.push({ text: `Payment is due within the terms of our agreement${inv.agreementRef ? ` (${inv.agreementRef})` : ''}. Questions? Email ${inv.from.email}.`, style: 'muted', fontSize: 8.5, margin: [0, 4, 0, 0] });
  return baseDoc(content, `Invoice ${inv.number} · ${inv.from.name}`, { title: `Invoice ${inv.number}`, author: inv.from.name, subject: 'Invoice', creator: 'lavibachchis.com' });
}

async function make(def, base) {
  const { pdfMake, vfs, fontDefs } = await engine(base);
  return pdfMake.createPdf(def, null, fontDefs, vfs);
}

/** { blob, base64, fileName } for a signed agreement (or a draft, for the studio). */
export async function agreementPdf(doc, signed, { base = '' } = {}) {
  const { logo } = await engine(base);
  const pdf = await make(agreementDef(doc, signed, logo), base);
  const c = doc.client || {};
  const who = (c.company || c.name || 'client').replace(/[\\/:*?"<>|]/g, '');
  const fileName = `${doc.ref}${doc.version > 1 ? ` v${doc.version}` : ''} - ${who} - ${signed ? 'signed' : 'draft'}.pdf`;
  return { pdf, fileName, base64: () => new Promise((ok) => pdf.getBase64(ok)), download: () => pdf.download(fileName) };
}

export async function invoicePdf(inv, { base = '', today } = {}) {
  const { logo } = await engine(base);
  const pdf = await make(invoiceDef(inv, logo, today), base);
  const fileName = `${inv.number} - ${(inv.billTo.company || inv.billTo.name || '').replace(/[\\/:*?"<>|]/g, '')}.pdf`;
  return { pdf, fileName, download: () => pdf.download(fileName) };
}
