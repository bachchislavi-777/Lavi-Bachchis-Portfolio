// Where records live in Lavi's Google account:
// - Google Sheet "LB Agreements & Invoices": one readable row per agreement and per invoice (her register),
//   plus a Log tab. Lavi can open, sort and filter it, but should not edit the ID columns.
// - Google Drive folder "LB Agreements": the full record of each agreement and invoice as a JSON file
//   (in "data"), and the signed PDFs (in "Signed agreements").
/* global SpreadsheetApp, DriveApp */
import { prop, setProp, stamp } from './env.js';

const COLS = {
  Agreements: ['Ref', 'Status', 'Client', 'Company', 'Email', 'Type', 'Fee', 'Currency', 'Version', 'Created', 'Signed', 'Starts', 'Ends', 'Test', 'ID'],
  Invoices: ['Number', 'Agreement', 'Client', 'Description', 'Amount', 'Currency', 'Issued', 'Due', 'Status', 'Paid on', 'Test', 'ID', 'Agreement ID', 'Key'],
  Log: ['Time', 'Ref', 'Event', 'Detail'],
};

let _ss = null;
const ss = () => (_ss ||= SpreadsheetApp.openById(prop('SHEET_ID')));
function sheet(name) {
  const s = ss().getSheetByName(name);
  if (!s) throw new Error(`Missing tab ${name}. Run setup again.`);
  return s;
}
const folder = (key) => DriveApp.getFolderById(prop(key));

// ---- JSON records in Drive -------------------------------------------------------------------------------
function findFile(name) {
  const it = folder('DATA_FOLDER_ID').getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function readJson(name) {
  const f = findFile(name);
  return f ? JSON.parse(f.getBlob().getDataAsString()) : null;
}
function writeJson(name, obj) {
  const body = JSON.stringify(obj);
  const f = findFile(name);
  if (f) f.setContent(body); else folder('DATA_FOLDER_ID').createFile(name, body, 'application/json');
}

// ---- Sheet rows ------------------------------------------------------------------------------------------
// Columns are found by their heading, so Lavi can reorder or add columns in the Sheet without breaking anything.
// Text that starts with = + - or @ is stored as plain text, so nothing a client types can become a formula.
const safe = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
function headers(s) {
  const width = Math.max(s.getLastColumn ? s.getLastColumn() : 0, 1);
  return s.getRange(1, 1, 1, width).getValues()[0].map((h) => String(h).trim());
}
function upsertRow(tab, idCol, id, values) {
  const s = sheet(tab);
  const head = headers(s);
  const named = Object.fromEntries(COLS[tab].map((h, i) => [h, safe(values[i])]));
  const missing = COLS[tab].filter((h) => !head.includes(h));
  if (missing.length) throw new Error(`The ${tab} tab is missing the column(s) ${missing.join(', ')}. Put the heading back, then try again.`);
  const col = head.indexOf(idCol) + 1;
  const last = s.getLastRow();
  if (last >= 2) {
    const ids = s.getRange(2, col, last - 1, 1).getValues().map((r) => String(r[0]));
    const i = ids.indexOf(id);
    if (i >= 0) {
      const row = s.getRange(i + 2, 1, 1, head.length).getValues()[0];
      head.forEach((h, j) => { if (h in named) row[j] = named[h]; });
      s.getRange(i + 2, 1, 1, head.length).setValues([row]);
      return;
    }
  }
  s.appendRow(head.map((h) => (h in named ? named[h] : '')));
}
function rows(tab) {
  const s = sheet(tab);
  const last = s.getLastRow();
  if (last < 2) return [];
  const head = headers(s);
  return s.getRange(2, 1, last - 1, head.length).getValues().map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const dec = (minor) => Math.round(minor) / 100;

// ---- Agreements ------------------------------------------------------------------------------------------
export const getAgreement = (id) => (/^[\w-]{6,40}$/.test(String(id)) ? readJson(`agreement-${id}.json`) : null);

export function saveAgreement(a) {
  a.updatedAt = stamp();
  writeJson(`agreement-${a.id}.json`, a);
  const latest = a.versions[a.versions.length - 1];
  const lastSigned = [...a.versions].reverse().find((v) => v.signed);
  const shown = lastSigned || latest;
  const t = shown.terms;
  const c = (lastSigned && lastSigned.signed.client) || t.client || {};
  upsertRow('Agreements', 'ID', a.id, [
    a.ref, a.status, c.name || '', c.company || '', c.email || '',
    t.type === 'project' ? 'One-off project' : 'Monthly',
    dec(Number(t.fee) || 0), t.currency, latest.v, a.createdAt.slice(0, 10),
    lastSigned ? lastSigned.signed.date : '', a.startDate || '', (a.ending && a.ending.endDate) || a.endDate || '',
    a.test ? 'TEST' : '', a.id,
  ]);
  return a;
}

export function listAgreements() {
  return rows('Agreements').map((r) => ({
    id: String(r.ID), ref: r.Ref, status: r.Status, client: r.Client, company: r.Company, email: r.Email, type: r.Type,
    fee: Math.round(Number(r.Fee) * 100), currency: r.Currency, version: Number(r.Version), created: fmtCell(r.Created),
    signed: fmtCell(r.Signed), starts: fmtCell(r.Starts), ends: fmtCell(r.Ends), test: r.Test === 'TEST',
  }));
}

// ---- Invoices --------------------------------------------------------------------------------------------
export const getInvoice = (id) => (/^[\w-]{6,40}$/.test(String(id)) ? readJson(`invoice-${id}.json`) : null);

export function saveInvoice(inv) {
  inv.updatedAt = stamp();
  writeJson(`invoice-${inv.id}.json`, inv);
  upsertRow('Invoices', 'ID', inv.id, [
    inv.number, inv.agreementRef || '', inv.billTo.company || inv.billTo.name || '',
    inv.lines.map((l) => l.text).join('; '), dec(inv.amount), inv.currency, inv.issueDate, inv.dueDate,
    inv.status, inv.paidOn || '', inv.test ? 'TEST' : '', inv.id, inv.agreementId || '', inv.key || '',
  ]);
  return inv;
}

export function listInvoices() {
  return rows('Invoices').map((r) => ({
    id: String(r.ID), number: r.Number, agreementRef: r.Agreement, client: r.Client, description: r.Description,
    amount: Math.round(Number(r.Amount) * 100), currency: r.Currency, issueDate: fmtCell(r.Issued), dueDate: fmtCell(r.Due),
    status: r.Status, paidOn: fmtCell(r['Paid on']), test: r.Test === 'TEST', agreementId: String(r['Agreement ID'] || ''), key: String(r.Key || ''),
  }));
}

// Sheets turns '2026-10-16' into a Date; turn it back.
function fmtCell(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return v === null || v === undefined ? '' : String(v);
}

// ---- Numbers ---------------------------------------------------------------------------------------------
/** Next reference: LB-A-2026-001 / LB-A-2026-T01 / LB-INV-2026-0001 / LB-INV-2026-T001. Never reused.
 *  Callers must hold the script lock (see env.locked). */
export function nextNumber(kind, year, test) {
  {
    const key = `SEQ_${kind}_${year}${test ? '_T' : ''}`;
    const n = Number(prop(key, '0')) + 1;
    setProp(key, n);
    if (kind === 'A') return `LB-A-${year}-${test ? `T${String(n).padStart(2, '0')}` : String(n).padStart(3, '0')}`;
    return `LB-INV-${year}-${test ? `T${String(n).padStart(3, '0')}` : String(n).padStart(4, '0')}`;
  }
}

// ---- Files and log ---------------------------------------------------------------------------------------
export function saveSignedPdf(name, blob) {
  blob.setName(name);
  return folder('SIGNED_FOLDER_ID').createFile(blob).getId();
}
export const getFileBlob = (id) => DriveApp.getFileById(id).getBlob();

export function log(ref, event, detail = '') {
  try { sheet('Log').appendRow([stamp(), safe(ref || ''), safe(event), safe(String(detail).slice(0, 500))]); } catch (e) { /* logging must never break a request */ }
}

export const COLUMNS = COLS;
