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
  setContentType(t) { this.type = t; return this; }
  copyBlob() { return new Blob2(this.u8.slice(), this.type, this.name); }
  getAs(type) { const head = enc.encode('%PDF-1.4 converted from HTML\n'); const u = new Uint8Array(head.length + this.u8.length); u.set(head); u.set(this.u8, head.length); return new Blob2(u, type, this.name.replace(/\.html$/, '.pdf')); }
}

export function createBrowserGas({ storageKey = 'lb-demo-state', owner = 'hello@lavibachchis.com', onMail = () => {} } = {}) {
  let S = null;
  try { S = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { S = null; }
  if (!S) S = { props: {}, triggers: [], seq: 0, mail: 0, outbox: [] };
  const attachments = new Map(); // big PDF bytes stay in memory only
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(S)); } catch { /* storage full or blocked: memory only */ } };
  const id = (p) => `${p}${(++S.seq).toString(36)}${uuid().slice(0, 6)}`;

  // A tiny in-memory Supabase (the parts the backend uses: table rows, next_number, PDF storage).
  S.db ||= { agreements: {}, invoices: {}, activity_log: [], settings: {}, counters: {} };
  const PK = { agreements: 'id', invoices: 'id', settings: 'key', counters: 'key' };
  const reply = (code, body, u8) => ({ getResponseCode: () => code, getContentText: () => (body === undefined ? '' : JSON.stringify(body)), getBlob: () => new Blob2(u8 || new Uint8Array(0), 'application/pdf', '') });
  function supabase(url, o) {
    const u = new URL(url);
    const method = String(o.method || 'get').toUpperCase();
    const body = o.payload === undefined ? undefined : o.contentType === 'application/json' ? JSON.parse(o.payload) : toU8(o.payload);
    let m = /^\/rest\/v1\/rpc\/next_number$/.exec(u.pathname);
    if (m) { const k = body.counter_key; const n = Math.max(S.db.counters[k] || 0, body.floor_value || 0) + 1; S.db.counters[k] = n; return reply(200, n); }
    m = /^\/rest\/v1\/(\w+)$/.exec(u.pathname);
    if (m) {
      const t = m[1];
      if (method === 'POST') {
        const list = Array.isArray(body) ? body : [body];
        if (t === 'activity_log') S.db.activity_log.push(...list.slice(0));
        else for (const r of list) S.db[t][r[PK[t]]] = { ...(S.db[t][r[PK[t]]] || {}), ...r };
        return reply(201);
      }
      let rows = t === 'activity_log' ? S.db.activity_log.slice() : Object.values(S.db[t]);
      for (const [k, v] of u.searchParams) if (/^eq\./.test(v)) rows = rows.filter((r) => String(r[k]) === v.slice(3));
      const order = (u.searchParams.get('order') || '').split(',').filter(Boolean).map((x) => x.split('.')[0]);
      rows.sort((a, b) => { for (const c of order) { const x = String(a[c] ?? ''); const y = String(b[c] ?? ''); if (x !== y) return x < y ? -1 : 1; } return 0; });
      const sel = (u.searchParams.get('select') || '*').split(',');
      rows = rows.map((r) => (sel[0] === '*' ? r : Object.fromEntries(sel.map((c) => [c, r[c] ?? null]))));
      if (u.searchParams.get('limit')) rows = rows.slice(0, Number(u.searchParams.get('limit')));
      return reply(200, JSON.parse(JSON.stringify(rows)));
    }
    if (/^\/storage\/v1\/bucket\//.test(u.pathname)) return reply(200, {});
    m = /^\/storage\/v1\/object\/([\w-]+)\/(.+)$/.exec(u.pathname);
    if (m) {
      const key = `file:${decodeURIComponent(m[2])}`;
      if (method === 'POST') { attachments.set(key, body); return reply(200, { Key: key }); }
      return attachments.has(key) ? reply(200, undefined, attachments.get(key)) : reply(404, { message: 'Object not found' });
    }
    return reply(404, { message: 'not found' });
  }

  const ctx = {
    UrlFetchApp: { fetch: (url, o = {}) => supabase(url, o) },
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
      sleep: () => {},
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
