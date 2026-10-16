// The agreement wording. One source for the signing page, the PDF and the studio editor.
//
// How it fits together
// - `terms` are the settings Lavi chooses per client (package, fee, notice period, special terms, edits).
// - `buildDoc(terms)` turns them into a document: sections of numbered clauses. Each clause has a stable id
//   (e.g. 'fees.cycle') so Lavi can edit or remove one clause for one client without touching the rest.
// - Words in {{double braces}} are filled in automatically: amounts when the document is built, and dates
//   (signing, start and end) only when the client signs, because they depend on that day.
// - Some clauses only apply to a business or to a consumer (`when`). The client says which they are when
//   they sign, and `resolveDoc` keeps the clauses that apply.
// - Once signed, the fully resolved text is frozen in the record and never re-rendered from this file, so
//   later wording changes here can't alter an agreement someone has already signed.
//
// This wording is a careful plain-English draft based on UK law, not legal advice. Have a solicitor review it
// once before relying on it for large contracts.

import * as money from './money.js';
import * as dates from './dates.js';

export const WORDING_VERSION = '2.0';
export const WORDING_DATE = 'October 2026';

export const BUSINESS_DEFAULTS = {
  name: 'Lavi Bachchis',
  trading: 'Lavi Bachchis Content & Creative',
  email: 'hello@lavibachchis.com',
  website: 'lavibachchis.com',
  address: '',
  privacyUrl: { uk: 'https://lavibachchis.com/uk/privacy/', us: 'https://lavibachchis.com/us/privacy/' },
  vatRegistered: false,
  vatNumber: '',
};

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Default settings for a new agreement. `pkg` is one of the website's packages (from copy.json). */
export function defaultTerms({ region = 'uk', type = 'recurring', pkg = null, currency } = {}) {
  return {
    region,                       // 'uk' | 'us' : spelling, date style, consumer-law wording
    type,                         // 'recurring' (monthly, rolling) | 'project' (one-off)
    clientTypes: 'either',        // 'either' | 'business' | 'consumer' : who may sign
    client: { name: '', role: '', company: '', companyNumber: '', email: '', billingEmail: '', phone: '', address: '', type: '' },
    packageName: pkg ? pkg.name : 'Custom',
    items: pkg ? pkg.items.map((i) => ({ label: i.label, value: i.value })) : [{ label: 'Scope', value: '' }],
    scopeNote: '',
    currency: currency || (region === 'us' ? 'USD' : 'GBP'),
    fee: pkg && pkg.gbp && (currency || 'GBP') === 'GBP' ? pkg.gbp * 100 : 0,
    start: 'signing',             // 'signing' or a fixed 'YYYY-MM-DD' (never earlier than the signing date)
    durationMonths: 1,            // project only: length of the project
    endDate: '',                  // project only: fixed end date instead of durationMonths
    depositPercent: 50,           // project only
    paymentDays: 7,
    noticeDays: 30,
    feeChangeNoticeDays: 30,
    revisionRounds: 2,
    feedbackDays: 3,
    pauseAfterDays: 14,
    remedyDays: 14,
    liabilityMonths: 3,
    portfolio: true,
    specialTerms: '',             // free text: anything agreed on a call. Overrides the standard clauses.
    overrides: {},                // { clauseId: 'edited text' }  ('' removes the clause)
    extra: {},                    // { sectionId: ['added clause', ...] }
  };
}

/** Fee arithmetic shared by the document and the invoices. */
export function amounts(terms) {
  const fee = Math.round(Number(terms.fee) || 0);
  if (terms.type === 'project') {
    const pct = Math.min(100, Math.max(0, Number(terms.depositPercent) || 0));
    const deposit = money.percent(fee, pct);
    return { fee, depositPct: pct, deposit, balancePct: 100 - pct, balance: fee - deposit };
  }
  return { fee, depositPct: 0, deposit: 0, balancePct: 100, balance: fee };
}

/**
 * Dates that depend on the signing day.
 * - The start is the signing date, or a later fixed date.
 * - A UK consumer has 14 days to cancel. Unless they ask me to start sooner, work starts after that.
 * - A project ends after `durationMonths` (or on a fixed end date).
 */
export function keyDates(terms, signDate, { clientType = '', earlyStart = false } = {}) {
  let start = terms.start && terms.start !== 'signing' && dates.isDate(terms.start) ? dates.max(terms.start, signDate) : signDate;
  let coolingOffEnds = '';
  if (clientType === 'consumer') {
    coolingOffEnds = dates.addDays(signDate, 14);
    if (!earlyStart) start = dates.max(start, dates.addDays(signDate, 15));
  }
  let end = '';
  if (terms.type === 'project') {
    end = terms.endDate && dates.isDate(terms.endDate) && terms.endDate >= start
      ? terms.endDate
      : dates.addDays(dates.addMonths(start, Math.max(1, Number(terms.durationMonths) || 1)), -1);
  }
  return { signDate, startDate: start, endDate: end, coolingOffEnds };
}

// ---------------------------------------------------------------------------------------------------------
// The standard clauses. `when` limits a clause to a client type; `only` to an agreement type.
// ---------------------------------------------------------------------------------------------------------
function standardSections(t) {
  const us = t.region === 'us';
  const licence = us ? 'license' : 'licence';
  const recurring = t.type !== 'project';
  const rounds = cap(word(Number(t.revisionRounds)));
  const c = (id, text, extra = {}) => ({ id, text, ...extra });

  return [
    {
      id: 'scope', title: 'What I’ll do', numbered: false, table: true,
      items: [
        recurring
          ? c('scope.plan', `I plan each month’s content with you in advance, and nothing is published without your approval. ${rounds} rounds of changes on each piece are included. If the brief changes after you have approved it, I’ll tell you about any extra cost before doing the work.`)
          : c('scope.plan', `I agree the plan with you before I start, and nothing is published without your approval. ${rounds} rounds of changes on each piece are included. If the brief changes after you have approved it, I’ll tell you about any extra cost before doing the work.`),
      ],
    },
    {
      id: 'you', title: 'What I need from you', numbered: true,
      items: [
        c('you.assets', 'Your logo, brand guidelines, photos and account access, shared promptly. Delays on your side may move delivery dates.'),
        c('you.approver', 'One named person who approves content, with feedback within {{feedbackDays}} working days.'),
        c('you.regulated', 'For legal, tax, financial, health or other regulated topics, a qualified person on your side checks the facts before anything goes live. You are responsible for the accuracy and compliance of content you approve.'),
        c('you.rights', 'You confirm you have the right to use anything you send me, such as photos, logos and text.'),
      ],
    },
    {
      id: 'fees', title: 'Fees and payment', numbered: true,
      items: [
        recurring
          ? c('fees.cycle', 'The billing cycle is one month, starting on {{startDate}}. I invoice {{fee}} at the end of each billing cycle, and payment is due within {{paymentDays}} days of the invoice.')
          : c('fees.project', 'The project fee is {{fee}}. I invoice {{depositPct}}% ({{deposit}}) when you sign, due within {{paymentDays}} days, and I start work once it is paid. I invoice the remaining {{balancePct}}% ({{balance}}) at the end of the project on {{endDate}}, or sooner if I deliver everything earlier, due within {{paymentDays}} days.'),
        recurring
          ? c('fees.methods', 'You can pay by bank transfer or PayPal, using the details on each invoice. The fee is fixed for this agreement. If I want to change it, I will give you at least {{feeChangeNoticeDays}} days’ written notice, and you can then end the agreement straight away by telling me in writing before the change takes effect, paying the current fee up to then.')
          : c('fees.methods', 'You can pay by bank transfer or PayPal, using the details on each invoice. The project fee is fixed unless we agree a change in writing.'),
        c('fees.vat', t.vatRegistered ? 'My fees include VAT where shown on the invoice.' : 'I am not VAT-registered, so no VAT is charged. If that changes, I will tell you in writing at least 30 days before VAT is added.'),
        c('fees.charges', 'Each of us pays our own bank or payment charges, so the full invoice amount reaches me.'),
        c('fees.late.business', 'As you are a business, I may claim interest and compensation on late payments under the Late Payment of Commercial Debts (Interest) Act 1998 (currently interest at 8% a year above the Bank of England base rate, plus a fixed sum of £40 to £100 per invoice). If an invoice is more than {{pauseAfterDays}} days overdue, I may pause work after telling you in writing.', { when: 'business' }),
        c('fees.late.consumer', 'If an invoice is more than {{pauseAfterDays}} days overdue, I may pause work after telling you in writing.', { when: 'consumer' }),
      ],
    },
    {
      id: 'term', title: 'Starting and ending', numbered: true,
      items: [
        recurring
          ? c('term.rolling', 'This agreement starts on {{startDate}} and rolls on monthly. Either of us can end it by giving {{noticeDays}} days’ written notice (email is fine). You pay for work up to the end of the notice period, and the last part-month is invoiced pro rata.')
          : c('term.project', 'The project runs from {{startDate}} to {{endDate}}, unless we agree different dates in writing.'),
        recurring ? null : c('term.cancel', 'You can cancel the project at any time by written notice (email is fine). You pay for the work done up to then; if that is less than the deposit you have paid, I refund the difference.'),
        c('term.breach', 'Either of us may end this agreement straight away by written notice if the other seriously breaks it and does not put it right within {{remedyDays}} days of being asked to.'),
        c('term.handover', 'When this agreement ends, I hand over the final files you have paid for and stop using your accounts. Please change any passwords you shared with me.'),
      ].filter(Boolean),
    },
    {
      id: 'ip', title: 'Who owns the work', numbered: true,
      items: [
        c('ip.own', 'Once you have paid in full, you own the final deliverables. Templates are built in your own accounts where possible, so they stay with you.'),
        c('ip.mine', `I keep my own know-how, methods and any materials I created before this agreement; you get a permanent ${licence} to use any of them that form part of your deliverables. Stock photos, fonts and music follow their own ${licence}s, and I’ll tell you if any need a paid ${licence}.`),
        ...(t.portfolio
          ? [
            c('ip.portfolio', 'Portfolio: you agree that I may show the published work in my portfolio. If you would rather I didn’t, tell me in writing and I will stop.', { when: 'business' }),
            c('ip.portfolio.consumer', 'Portfolio: I will only show the work in my portfolio if you agree in writing.', { when: 'consumer' }),
          ]
          : [c('ip.portfolio', 'Portfolio: I will not show the work in my portfolio unless you agree in writing.')]),
      ],
    },
    {
      id: 'data', title: 'Results, confidentiality and data', numbered: true,
      items: [
        c('data.results', 'I deliver finished, on-brand content on time. I don’t guarantee follower, lead or sales numbers, because those depend on your offer, budget and market, and on platforms outside my control.'),
        c('data.confidential', 'We each keep the other’s confidential information private, during and after this agreement.'),
        c('data.gdpr', us
          ? 'I comply with UK data protection law (UK GDPR) and you comply with the data protection laws that apply to you. I use your details only to deliver the service and invoice you, as explained in my privacy notice at {{privacyUrl}}.'
          : 'We each comply with data protection law (UK GDPR and the Data Protection Act 2018). I use your details only to deliver the service and invoice you, as explained in my privacy notice at {{privacyUrl}}.'),
        c('data.processor', 'Where I handle personal data on your behalf, I do so as your processor under UK GDPR. The data is usually the names, contact details and messages of your customers, subscribers or followers (for example your mailing list), handled only to deliver the content work in this agreement and only for as long as it lasts. I act only on your documented instructions (this agreement counts as those instructions), make sure anyone helping me is bound by confidentiality, and keep the data secure.'),
        c('data.processor.more', 'I only use the tools (sub-processors) you have approved or chosen, such as your email or social media platforms, and only on terms that protect the data in the same way. Where a tool keeps data outside the UK, I rely on the safeguards the law requires. I help you answer requests from the people concerned and meet your security, breach-reporting and impact-assessment duties, tell you without undue delay about any data breach, delete or return the data when this agreement ends, and give you the information you reasonably need, including for audits, to show we both comply.'),
        c('data.access', 'I keep any logins you share secure, use them only for this work, and do not change account ownership or settings beyond what the work needs.'),
        c('data.tools', 'I may use software, including AI tools, to help with research, drafts and images. I check and edit everything myself before you see it, and I don’t put your confidential information into tools that use it to train their models.'),
      ],
    },
    {
      id: 'liability', title: 'Liability', numbered: true,
      items: [
        c('liability.cap', 'My total liability under this agreement is limited to the fees you paid me in the {{liabilityMonths}} months before the claim (for a one-off project, the project fee).', { when: 'business' }),
        c('liability.indirect', 'I am not liable for indirect losses, loss of profit, or problems caused by social platforms, account restrictions or third-party tools.', { when: 'business' }),
        c('liability.consumer', 'I am responsible for loss or damage you suffer that is a foreseeable result of my breaking this agreement or failing to use reasonable care and skill. I am not responsible for loss that was not foreseeable, for business losses, or for problems caused by social platforms, account restrictions or third-party tools.', { when: 'consumer' }),
        c('liability.law', 'Nothing in this agreement limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited by law.'),
      ],
    },
    {
      id: 'complaints', title: 'Complaints', numbered: true,
      items: [
        c('complaints.tell', 'If you are unhappy with any part of my service, please tell me first so I can put it right. Email {{email}} with “Complaint” in the subject line, saying what went wrong and what you would like to happen.'),
        c('complaints.timing', 'I will acknowledge your complaint within 2 working days and send you a full written response within 14 days.'),
        c('complaints.fix', 'If a deliverable does not match the agreed brief, I will correct it free of charge. If I cannot, I will refund or credit the fee for that deliverable.'),
        c('complaints.mediation', 'If we cannot resolve it between us, we will both try in good faith to settle it through mediation (for example with CEDR), sharing the cost equally, before either of us goes to court. Either of us may still ask a court for urgent relief.', { when: 'business' }),
        c('complaints.adr', 'If we cannot resolve it between us, I will tell you in writing about a certified alternative dispute resolution (ADR) provider and whether I agree to use it. Using ADR is your choice, and you can go to court at any time.', { when: 'consumer' }),
        c('complaints.consumer', `As you are a consumer (buying outside your trade, business or profession), nothing in this agreement affects your legal rights, including under the Consumer Rights Act 2015${us ? ' and any mandatory consumer protection laws where you live' : ''}. You have the right to cancel within 14 days of signing (until {{coolingOffEnds}}) under the Consumer Contracts Regulations 2013, without giving a reason, by telling me clearly, for example by email; you can use the cancellation form at the end of this agreement. I refund any money due within 14 days of your telling me. If you asked me to start within those 14 days and then cancel, you pay for the work done up to that point, and once the service has been fully provided you can no longer cancel. ${us ? 'Free, independent advice on UK consumer rights is available from Citizens Advice.' : 'Citizens Advice can give free, independent advice on your rights.'}`, { when: 'consumer' }),
      ],
    },
    {
      id: 'general', title: 'General', numbered: true,
      items: [
        c('general.whole', 'This agreement, with any brief or quote it refers to, is the whole agreement between us. Changes must be agreed in writing; email is fine. If the special terms conflict with the rest of this agreement, the special terms apply.', { when: 'business' }),
        c('general.changes', 'Changes to this agreement must be agreed in writing; email is fine. If the special terms conflict with the rest of this agreement, the special terms apply.', { when: 'consumer' }),
        c('general.contractor', 'I work as an independent contractor, not as your employee. Neither of us may transfer this agreement without the other’s written consent.'),
        c('general.esign', 'We agree to sign electronically and to receive this agreement and invoices by email. An electronic signature is as valid as a handwritten one. You need a device that can open PDF files to keep your copies. You can ask me for a paper copy at any time, free of charge, and you can withdraw your agreement to receive documents electronically by emailing me.'),
        c('general.severance', 'If a court decides that part of this agreement is invalid, the rest still applies.'),
        us
          ? c('general.law', 'This agreement is governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you are a consumer living elsewhere, you also keep any mandatory protections of the law where you live.')
          : c('general.law', 'This agreement is governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you are a consumer living in Scotland or Northern Ireland, you can also bring proceedings in your local courts.'),
      ],
    },
  ];
}

const CANCEL_FORM = {
  id: 'annex.cancel', title: 'Cancellation form', when: 'consumer',
  intro: 'Only fill in and return this form if you want to cancel within 14 days of signing. An email saying you want to cancel works just as well.',
  lines: [
    'To: {{name}}, {{email}}{{addressLine}}',
    'I hereby give notice that I cancel my contract for the supply of the following service: content services under agreement {{ref}}.',
    'Signed on: {{signDate}}',
    'Name: ____________________________',
    'Address: ____________________________',
    'Signature (only if this form is sent on paper): ____________________________',
    'Date: ____________________________',
  ],
};

/** All clause ids with their standard text, for the studio editor. */
export function standardClauses(terms) {
  return standardSections(terms).flatMap((s) => s.items.map((i) => ({ section: s.id, sectionTitle: s.title, ...i })));
}

/**
 * Build the document for a version of an agreement. Dates stay as {{tokens}} until `resolveDoc`.
 * ctx: { ref, version, offeredDate, business, previous }  (business = Lavi's details from settings)
 */
export function buildDoc(terms, ctx = {}) {
  const t = { ...defaultTerms(), ...terms };
  const b = { ...BUSINESS_DEFAULTS, ...(ctx.business || {}) };
  t.vatRegistered = !!b.vatRegistered;
  const a = amounts(t);
  const cur = t.currency;
  const fill = {
    fee: money.format(a.fee, cur), deposit: money.format(a.deposit, cur), balance: money.format(a.balance, cur),
    depositPct: String(a.depositPct), balancePct: String(a.balancePct),
    paymentDays: String(t.paymentDays), noticeDays: String(t.noticeDays), feedbackDays: String(t.feedbackDays),
    pauseAfterDays: String(t.pauseAfterDays), remedyDays: String(t.remedyDays), liabilityMonths: String(t.liabilityMonths),
    feeChangeNoticeDays: String(t.feeChangeNoticeDays),
    privacyUrl: (b.privacyUrl && (b.privacyUrl[t.region] || b.privacyUrl.uk)) || BUSINESS_DEFAULTS.privacyUrl.uk,
    email: b.email, name: b.name, ref: ctx.ref || '{{ref}}',
    addressLine: b.address ? `, ${b.address.replace(/\s*\n\s*/g, ', ')}` : '',
  };
  const sub = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in fill ? fill[k] : m));

  const sections = standardSections(t).map((s) => {
    const items = [];
    for (const i of s.items) {
      const edited = Object.prototype.hasOwnProperty.call(t.overrides || {}, i.id);
      const text = edited ? String(t.overrides[i.id] || '').trim() : i.text;
      if (!text) continue; // removed for this client
      items.push({ id: i.id, text: sub(text), ...(i.when ? { when: i.when } : {}), ...(edited ? { edited: true } : {}) });
    }
    for (const [n, text] of ((t.extra || {})[s.id] || []).entries()) {
      if (String(text || '').trim()) items.push({ id: `${s.id}.extra${n + 1}`, text: sub(String(text).trim()), added: true });
    }
    return { id: s.id, title: s.title, numbered: s.numbered, items };
  });

  const special = String(t.specialTerms || '').split(/\n\s*\n|\n(?=\s*[-•*]\s)/).map((p) => p.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
  if (special.length) sections.push({ id: 'special', title: 'Special terms we agreed', numbered: true, items: special.map((text, n) => ({ id: `special.${n + 1}`, text: sub(text), added: true })) });

  const recurring = t.type !== 'project';
  const table = (t.items || []).filter((r) => r && (r.label || r.value)).map((r) => [String(r.label || ''), String(r.value || '')]);
  if (recurring && !table.some(([l]) => /platform/i.test(l))) { /* keep as given */ }

  const annex = t.clientTypes !== 'business'
    ? [{ id: CANCEL_FORM.id, title: CANCEL_FORM.title, when: 'consumer', intro: CANCEL_FORM.intro, lines: CANCEL_FORM.lines.map(sub) }]
    : [];

  return {
    kind: 'agreement',
    ref: ctx.ref || '',
    version: ctx.version || 1,
    wording: `${WORDING_VERSION} (${WORDING_DATE})`,
    region: t.region,
    type: t.type,
    clientTypes: t.clientTypes,
    title: 'Service agreement',
    subtitle: `A plain-English agreement between you and me. Wording version ${WORDING_VERSION} (${WORDING_DATE}).`,
    offeredDate: ctx.offeredDate || '',
    me: { name: b.name, trading: b.trading, email: b.email, website: b.website, address: b.address || '' },
    client: { ...t.client },
    pkg: {
      name: t.packageName || '',
      heading: recurring ? 'Monthly package' : 'Project',
      rows: table,
      note: t.scopeNote ? sub(t.scopeNote) : '',
      feeLabel: recurring ? 'Monthly fee' : 'Project fee',
      fee: fill.fee,
      feeNote: b.vatRegistered ? 'VAT as shown on invoices' : 'No VAT charged',
      paymentLine: recurring ? 'Invoiced at the end of each monthly billing cycle' : `${a.depositPct}% (${fill.deposit}) on signing, ${a.balancePct}% (${fill.balance}) at the end`,
      currency: cur,
      amounts: a,
    },
    sections,
    annex,
  };
}

/**
 * Fill in the signing-day details and keep only the clauses that apply to this client.
 * Pass `vals` = { clientType, signDate, startDate, endDate, coolingOffEnds, client, signedAt }.
 * Without a clientType (before the client has chosen), clauses for both types are kept, labelled.
 */
export function resolveDoc(doc, vals = {}) {
  const region = doc.region;
  const fmt = (iso) => (iso ? dates.format(iso, region) : '');
  const fill = {
    signDate: vals.signDate ? fmt(vals.signDate) : 'the date you sign',
    // "the date this agreement is signed (16 October 2026)" when it starts on the (first) signing day.
    // Amendments pass firstSignDate so the wording stays identical to the original.
    startDate: vals.startDate ? (vals.startDate === (vals.firstSignDate || vals.signDate) ? `the date this agreement is signed (${fmt(vals.startDate)})` : fmt(vals.startDate)) : 'the date this agreement is signed',
    endDate: vals.endDate ? fmt(vals.endDate) : 'the end date shown when you sign',
    coolingOffEnds: vals.coolingOffEnds ? fmt(vals.coolingOffEnds) : '14 days after signing',
    ref: doc.ref,
  };
  const sub = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in fill ? fill[k] : m));
  const keep = (x) => !x.when || !vals.clientType || x.when === vals.clientType;
  const out = JSON.parse(JSON.stringify(doc));
  out.sections = out.sections.map((s) => ({ ...s, items: s.items.filter(keep).map((i) => ({ ...i, text: sub(i.text) })) })).filter((s) => s.items.length || s.id === 'scope');
  // A consumer's choice about the 14-day cancellation period is part of the signed record.
  if (vals.clientType === 'consumer' && vals.signDate) {
    const term = out.sections.find((s) => s.id === 'term');
    const text = vals.earlyStart
      ? `You asked me to start work within the 14-day cancellation period. If you cancel during that period, you pay for the work done up to then, and once the service has been fully provided you can no longer cancel.`
      : `You did not ask me to start work within the 14-day cancellation period, so work starts on ${fmt(vals.startDate)}.`;
    if (term) term.items.push({ id: 'term.cooling', text });
  }
  out.annex = (out.annex || []).filter(keep).map((x) => ({ ...x, lines: x.lines.map(sub) }));
  if (vals.client) out.client = { ...out.client, ...vals.client };
  out.dates = { signDate: vals.signDate || '', startDate: vals.startDate || '', endDate: vals.endDate || '', coolingOffEnds: vals.coolingOffEnds || '' };
  if (vals.clientType) out.clientType = vals.clientType;
  return out;
}

/** Plain-language list of what changed between two versions (shown to the client on an amendment). */
export function diffDocs(prev, next) {
  if (!prev) return [];
  const changes = [];
  if (prev.pkg.fee !== next.pkg.fee) changes.push(`${next.pkg.feeLabel}: ${prev.pkg.fee} → ${next.pkg.fee}`);
  const rows = (d) => Object.fromEntries(d.pkg.rows.map(([l, v]) => [l, v]));
  const pr = rows(prev), nr = rows(next);
  for (const [l, v] of Object.entries(nr)) if (pr[l] !== v) changes.push(pr[l] === undefined ? `Added to the package: ${l}, ${v}` : `${l}: ${pr[l]} → ${v}`);
  for (const l of Object.keys(pr)) if (!(l in nr)) changes.push(`Removed from the package: ${l}`);
  if ((prev.pkg.note || '') !== (next.pkg.note || '')) changes.push('Package description updated');
  const byId = (d) => Object.fromEntries(d.sections.flatMap((s) => s.items.map((i) => [i.id, { text: i.text, section: s.title }])));
  const pi = byId(prev), ni = byId(next);
  const touched = new Set();
  for (const [id, v] of Object.entries(ni)) if (!pi[id] || pi[id].text !== v.text) touched.add(v.section);
  for (const [id, v] of Object.entries(pi)) if (!ni[id]) touched.add(v.section);
  for (const s of touched) changes.push(`Wording changed in “${s}”`);
  return changes;
}
