// Small shared helpers.

/** JSON with sorted keys, so the same record always gives the same fingerprint. */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

/** What the fingerprint covers: the exact wording, both parties, the signature and the time. */
export function fingerprintPayload(record) {
  const { doc, signed } = record;
  return canonical({
    ref: doc.ref, version: doc.version, wording: doc.wording,
    me: doc.me, client: doc.client, clientType: doc.clientType || '',
    pkg: { rows: doc.pkg.rows, fee: doc.pkg.fee, feeLabel: doc.pkg.feeLabel, note: doc.pkg.note, paymentLine: doc.pkg.paymentLine },
    sections: doc.sections.map((s) => ({ t: s.title, i: s.items.map((i) => i.text) })),
    annex: (doc.annex || []).map((a) => ({ t: a.title, l: a.lines })),
    dates: doc.dates, amendment: doc.amendment || null,
    signature: { name: signed.signature.name, method: signed.signature.method, imageSha256: signed.signature.imageSha256 || '' },
    consents: signed.consents, signedAt: signed.at, offeredDate: doc.offeredDate,
  });
}

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
export const clean = (s, max = 500) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
