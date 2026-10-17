// Where records live: Lavi's Supabase project (see supabase/migrations in the website repo).
// - Table "agreements" and table "invoices": one row per record. The readable columns are her register (she can
//   sort and filter them in Supabase's Table Editor); the "data" column holds the full record.
// - Table "activity_log": what happened and when. Table "settings": the studio's Settings page.
// - Table "counters" + function next_number(): reference numbers, never reused.
// - Storage bucket "signed-agreements": every signed PDF.
import { prop, stamp } from './env.js';
import { json, jsonGetAll, request, enc } from './supabase.js';

// Text that starts with = + - or @ is stored with a leading ' in the register columns, so a CSV export opened
// in Excel or Google Sheets can never turn what a client typed into a formula. (The full record is untouched.)
const safe = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const dateOrNull = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
const str = (v) => (v === null || v === undefined ? '' : String(v));
const dec = (minor) => Math.round(minor) / 100;
const validId = (id) => /^[\w-]{6,40}$/.test(String(id));
const UPSERT = { Prefer: 'resolution=merge-duplicates,return=minimal' };

// ---- Agreements ------------------------------------------------------------------------------------------
export function getAgreement(id) {
  if (!validId(id)) return null;
  const rows = json('get', `/rest/v1/agreements?id=eq.${enc(id)}&select=data`);
  return rows && rows.length ? rows[0].data : null;
}

export function saveAgreement(a) {
  a.updatedAt = stamp();
  const latest = a.versions[a.versions.length - 1];
  const lastSigned = [...a.versions].reverse().find((v) => v.signed);
  const shown = lastSigned || latest;
  const t = shown.terms;
  const c = (lastSigned && lastSigned.signed.client) || t.client || {};
  json('post', '/rest/v1/agreements?on_conflict=id', {
    headers: UPSERT,
    body: {
      id: a.id, ref: a.ref, status: a.status, client: safe(c.name || ''), company: safe(c.company || ''), email: safe(c.email || ''),
      type: t.type === 'project' ? 'One-off project' : 'Monthly', fee: dec(Number(t.fee) || 0), currency: t.currency,
      version: latest.v, created: dateOrNull(a.createdAt.slice(0, 10)), signed: dateOrNull(lastSigned && lastSigned.signed.date),
      starts: dateOrNull(a.startDate), ends: dateOrNull((a.ending && a.ending.endDate) || a.endDate), test: !!a.test, data: a,
    },
  });
  return a;
}

const AGREEMENT_COLS = 'id,ref,status,client,company,email,type,fee,currency,version,created,signed,starts,ends,test';
const AGREEMENTS_LIST = `/rest/v1/agreements?select=${AGREEMENT_COLS}&order=created.asc,ref.asc`;
const agreementRow = (r) => ({
  id: str(r.id), ref: str(r.ref), status: str(r.status), client: str(r.client), company: str(r.company), email: str(r.email), type: str(r.type),
  fee: Math.round(Number(r.fee) * 100), currency: str(r.currency), version: Number(r.version), created: str(r.created),
  signed: str(r.signed), starts: str(r.starts), ends: str(r.ends), test: r.test === true,
});
export function listAgreements() {
  return (json('get', AGREEMENTS_LIST) || []).map(agreementRow);
}
export function getInvoice(id) {
  if (!validId(id)) return null;
  const rows = json('get', `/rest/v1/invoices?id=eq.${enc(id)}&select=data`);
  return rows && rows.length ? rows[0].data : null;
}

export function saveInvoice(inv) {
  inv.updatedAt = stamp();
  json('post', '/rest/v1/invoices?on_conflict=id', {
    headers: UPSERT,
    body: {
      id: inv.id, number: inv.number, agreement_ref: inv.agreementRef || '', client: safe(inv.billTo.company || inv.billTo.name || ''),
      description: safe(inv.lines.map((l) => l.text).join('; ')), amount: dec(inv.amount), currency: inv.currency,
      issued: dateOrNull(inv.issueDate), due: dateOrNull(inv.dueDate), status: inv.status, paid_on: dateOrNull(inv.paidOn),
      test: !!inv.test, agreement_id: inv.agreementId || '', key: inv.key || '', data: inv,
    },
  });
  return inv;
}

const INVOICE_COLS = 'id,number,agreement_ref,client,description,amount,currency,issued,due,status,paid_on,test,agreement_id,key,kind:data-%3E%3Ekind'; // '>' must be URL-encoded: Apps Script rejects raw '>' in URLs
const INVOICES_LIST = `/rest/v1/invoices?select=${INVOICE_COLS}&order=issued.asc,number.asc`;
const invoiceRow = (r) => ({
  id: str(r.id), number: str(r.number), agreementRef: str(r.agreement_ref), client: str(r.client), description: str(r.description),
  amount: Math.round(Number(r.amount) * 100), currency: str(r.currency), issueDate: str(r.issued), dueDate: str(r.due),
  status: str(r.status), paidOn: str(r.paid_on), test: r.test === true, agreementId: str(r.agreement_id), key: str(r.key), kind: str(r.kind),
});
export function listInvoices() {
  return (json('get', INVOICES_LIST) || []).map(invoiceRow);
}
/** The invoices of one agreement (filtered by Supabase, not by reading every invoice). */
export function listInvoicesFor(agreementId) {
  if (!validId(agreementId)) return [];
  return (json('get', `/rest/v1/invoices?agreement_id=eq.${enc(agreementId)}&select=${INVOICE_COLS}&order=issued.asc,number.asc`) || []).map(invoiceRow);
}
const SETTINGS_ROW = '/rest/v1/settings?key=eq.studio&select=value';

/** Everything the studio's front page needs, read from Supabase in one go (three requests sent together). */
export function overviewData() {
  const [agreements, invoices, settings] = jsonGetAll([AGREEMENTS_LIST, INVOICES_LIST, SETTINGS_ROW]);
  _settings = settings && settings.length ? settings[0].value : null;
  return { agreements: (agreements || []).map(agreementRow), invoices: (invoices || []).map(invoiceRow) };
}

/** One agreement plus its invoices, read together. */
export function agreementWithInvoices(id) {
  if (!validId(id)) return { agreement: null, invoices: [] };
  const [rows, invoices] = jsonGetAll([
    `/rest/v1/agreements?id=eq.${enc(id)}&select=data`,
    `/rest/v1/invoices?agreement_id=eq.${enc(id)}&select=${INVOICE_COLS}&order=issued.asc,number.asc`,
  ]);
  return { agreement: rows && rows.length ? rows[0].data : null, invoices: (invoices || []).map(invoiceRow) };
}

export function nextNumber(kind, year, test) {
  const key = `SEQ_${kind}_${year}${test ? '_T' : ''}`;
  const floor = Number(prop(key, '0')) || 0;
  const n = Number(json('post', '/rest/v1/rpc/next_number', { body: { counter_key: key, floor_value: floor } }));
  if (!Number.isFinite(n) || n < 1) throw new Error(`Could not get the next number for ${key}`);
  if (kind === 'A') return `LB-A-${year}-${test ? `T${String(n).padStart(2, '0')}` : String(n).padStart(3, '0')}`;
  return `LB-INV-${year}-${test ? `T${String(n).padStart(3, '0')}` : String(n).padStart(4, '0')}`;
}

// ---- Settings --------------------------------------------------------------------------------------------
let _settings; // read once per request
export function resetCache() { _settings = undefined; }
export function getSettingsRaw() {
  if (_settings === undefined) {
    const rows = json('get', SETTINGS_ROW);
    _settings = rows && rows.length ? rows[0].value : null;
  }
  return _settings;
}
export function saveSettingsRaw(value) {
  json('post', '/rest/v1/settings?on_conflict=key', { headers: UPSERT, body: { key: 'studio', value } });
  _settings = value;
  return value;
}

// ---- Signed PDFs -----------------------------------------------------------------------------------------
const BUCKET = 'signed-agreements';
const objectPath = (path) => path.split('/').map(enc).join('/');

/** Stores a signed PDF; returns its id ("sb:<path in the bucket>"). */
export function saveSignedPdf(name, blob) {
  const clean = String(name).replace(/[^\w .()-]/g, '').replace(/\s+/g, ' ').trim() || 'signed.pdf';
  const path = `${stamp().slice(0, 4)}/${clean}`;
  request('post', `/storage/v1/object/${BUCKET}/${objectPath(path)}`, { body: blob.getBytes(), contentType: 'application/pdf', headers: { 'x-upsert': 'true' } });
  return `sb:${path}`;
}

export function getFileBlob(id) {
  const path = String(id).replace(/^sb:/, '');
  const blob = request('get', `/storage/v1/object/${BUCKET}/${objectPath(path)}`).getBlob();
  blob.setContentType && blob.setContentType('application/pdf');
  return blob.setName(path.split('/').pop());
}

// ---- Log -------------------------------------------------------------------------------------------------
// Entries are collected during a request and written together at the end (flushLog), so logging doesn't
// slow the studio down. Logging must never break a request.
let pending = [];
export function log(ref, event, detail = '') {
  pending.push({ at: stamp(), ref: safe(String(ref || '')), event: safe(String(event)), detail: safe(String(detail).slice(0, 500)) });
  if (pending.length >= 25) flushLog();
}
export function flushLog() {
  if (!pending.length) return;
  const batch = pending;
  pending = [];
  try { json('post', '/rest/v1/activity_log', { headers: { Prefer: 'return=minimal' }, body: batch }); } catch (e) { /* never break a request */ }
}

/** Quick check used by setup: can we reach the database with the key? */
export function checkConnection() {
  json('get', '/rest/v1/settings?select=key&limit=1');
  request('get', `/storage/v1/bucket/${BUCKET}`);
  return true;
}
