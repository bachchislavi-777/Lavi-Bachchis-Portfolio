// In-browser stand-in for the Google Apps Script services, so the real backend code can run inside the demo.
// Same behaviour as agreements/local/gas-shim.mjs, kept in memory (and in this browser's storage when allowed).
import { sha256 } from './sha256.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const toU8 = (v) => (v instanceof Uint8Array ? v : Array.isArray(v) ? Uint8Array.from(v.map((b) => (b + 256) % 256)) : enc.encode(String(v)));
const toSigned = (u8) => Array.from(u8, (b) => (b > 127 ? b - 256 : b));
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(String(s)), (c) => c.charCodeAt(0));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

class Blob2 {
  constructor(data, type = 'application/octet-stream', name = '') { this.u8 = toU8(data); this.type = type; this.name = name; }
  getBytes() { return toSigned(this.u8); }
  getDataAsString(charset) { return charset === 'ISO-8859-1' ? Array.from(this.u8, (b) => String.fromCharCode(b)).join('') : dec.decode(this.u8); }
  getContentType() { return this.type; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  copyBlob() { return new Blob2(this.u8.slice(), this.type, this.name); }
  getAs(type) { const head = enc.encode('%PDF-1.4 converted from HTML\n'); const u = new Uint8Array(head.length + this.u8.length); u.set(head); u.set(this.u8, head.length); return new Blob2(u, type, this.name.replace(/\.html$/, '.pdf')); }
}

export function createBrowserGas({ storageKey = 'lb-demo-state', owner = 'bachchis.lavi@gmail.com', onMail = () => {} } = {}) {
  let S = null;
  try { S = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { S = null; }
  if (!S) S = { props: {}, sheets: {}, folders: {}, files: {}, triggers: [], seq: 0, mail: 0, outbox: [] };
  const attachments = new Map(); // big PDF bytes stay in memory only
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(S)); } catch { /* storage full or blocked: memory only */ } };
  const id = (p) => `${p}${(++S.seq).toString(36)}${uuid().slice(0, 6)}`;

  const cellIn = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? { $date: v } : v);
  const cellOut = (v) => (v && typeof v === 'object' && v.$date ? new Date(`${v.$date}T00:00:00`) : v);
  function sheetApi(ssId, name) {
    const rows = () => S.sheets[ssId].tabs[name];
    const range = (r, c, nr = 1, nc = 1) => {
      const api = {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cellOut((rows()[r - 1 + i] || [])[c - 1 + j] ?? ''))),
        setValues: (vals) => { vals.forEach((row, i) => { const R = (rows()[r - 1 + i] ||= []); row.forEach((v, j) => { R[c - 1 + j] = cellIn(v); }); }); return api; },
        setFontWeight: () => api, setBackground: () => api, setFontColor: () => api,
      };
      return api;
    };
    return { getName: () => name, getLastRow: () => rows().length, getLastColumn: () => Math.max(0, ...rows().map((r) => r.length)), getRange: range, appendRow: (vals) => { rows().push(vals.map(cellIn)); }, setFrozenRows: () => {} };
  }
  const spreadsheetApi = (ssId) => ({
    getId: () => ssId,
    setSpreadsheetTimeZone: () => {},
    getSheetByName: (n) => (S.sheets[ssId].tabs[n] ? sheetApi(ssId, n) : null),
    insertSheet: (n) => { S.sheets[ssId].tabs[n] = []; return sheetApi(ssId, n); },
    deleteSheet: (sh) => { delete S.sheets[ssId].tabs[sh.getName()]; },
  });
  const fileApi = (fid) => ({
    getId: () => fid, getName: () => S.files[fid].name,
    getBlob: () => new Blob2(attachments.get(fid) || unb64(S.files[fid].b64 || ''), S.files[fid].mime, S.files[fid].name),
    setContent: (s) => { S.files[fid].b64 = b64(enc.encode(String(s))); return fileApi(fid); },
    moveTo: (folder) => { S.files[fid].folder = folder.getId(); },
  });
  const iter = (list) => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
  const folderApi = (fo) => ({
    getId: () => fo,
    createFolder: (name) => { const i = id('fo'); S.folders[i] = { name, parent: fo }; return folderApi(i); },
    createFile: (a, content, mime) => {
      const i = id('fi');
      if (a instanceof Blob2) { S.files[i] = { name: a.name, mime: a.type, folder: fo }; attachments.set(i, a.u8); } else S.files[i] = { name: a, mime: mime || 'text/plain', b64: b64(enc.encode(String(content))), folder: fo };
      return fileApi(i);
    },
    getFilesByName: (name) => iter(Object.keys(S.files).filter((k) => S.files[k].folder === fo && S.files[k].name === name).map(fileApi)),
  });

  const ctx = {
    SpreadsheetApp: {
      flush: () => {},
      create: (name) => { const i = id('ss'); S.sheets[i] = { name, tabs: { Sheet1: [] } }; S.files[i] = { name, folder: null }; return spreadsheetApi(i); },
      openById: (i) => spreadsheetApi(i),
    },
    DriveApp: {
      createFolder: (name) => { const i = id('fo'); S.folders[i] = { name, parent: null }; return folderApi(i); },
      getFolderById: (i) => folderApi(i),
      getFileById: (i) => fileApi(i),
    },
    MailApp: {
      sendEmail: (o) => {
        const n = ++S.mail;
        const atts = (o.attachments || []).map((bl) => { const key = `mail-${n}-${bl.name}`; attachments.set(key, bl.u8); return { name: bl.name, type: bl.type, size: bl.u8.length, key }; });
        const rec = { n, at: (globalThis.__lbNow ? globalThis.__lbNow() : new Date()).toISOString(), to: o.to, cc: o.cc || '', subject: o.subject, html: o.htmlBody || '', attachments: atts };
        S.outbox.push(rec);
        onMail(rec);
      },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, value) => toSigned(sha256(toU8(value))),
      base64Encode: (v) => b64(toU8(v)),
      base64EncodeWebSafe: (v) => b64(toU8(v)).replace(/\+/g, '-').replace(/\//g, '_'),
      base64Decode: (s) => toSigned(unb64(s)),
      newBlob: (data, type, name) => new Blob2(data, type, name),
      getUuid: uuid,
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in S.props ? S.props[k] : null),
      setProperty: (k, v) => { S.props[k] = String(v); },
      deleteProperty: (k) => { delete S.props[k]; },
      getProperties: () => ({ ...S.props }),
    }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => { const o = { getContent: () => s, setMimeType: () => o }; return o; } },
    ScriptApp: {
      getProjectTriggers: () => [], deleteTrigger: () => {},
      newTrigger: () => { const b = { timeBased: () => b, everyHours: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, create: () => ({}) }; return b; },
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }) },
    Logger: { log: () => {} },
  };
  return {
    install() { Object.assign(globalThis, ctx); },
    state: () => S,
    save,
    attachment: (key) => attachments.get(key),
    reset() { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } },
  };
}
