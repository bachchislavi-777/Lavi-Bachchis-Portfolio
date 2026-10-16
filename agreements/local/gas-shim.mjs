// A small stand-in for the Google Apps Script services the backend uses (Sheets, Drive, Gmail sending,
// properties, locks, triggers). It lets the exact Code.js that goes to Google run on this computer, so the
// whole system can be tested before Google Workspace is ready. Data is kept in a folder as JSON.
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const toSigned = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const toBuf = (v) => (Buffer.isBuffer(v) ? v : Array.isArray(v) ? Buffer.from(v.map((b) => (b + 256) % 256)) : Buffer.from(String(v), 'utf8'));

class Blob {
  constructor(data, type = 'application/octet-stream', name = '') { this.buf = toBuf(data); this.type = type; this.name = name; }
  getBytes() { return toSigned(this.buf); }
  getContentType() { return this.type; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  copyBlob() { return new Blob(Buffer.from(this.buf), this.type, this.name); }
  getAs(type) { return new Blob(Buffer.concat([Buffer.from('%PDF-1.4 converted from HTML\n'), this.buf]), type, this.name.replace(/\.html$/, '.pdf')); }
  getDataAsString(charset) { return charset === 'ISO-8859-1' ? this.buf.toString('latin1') : this.buf.toString('utf8'); }
}

export function createGasContext({ dir, owner = 'bachchis.lavi@gmail.com' }) {
  mkdirSync(join(dir, 'outbox'), { recursive: true });
  const stateFile = join(dir, 'state.json');
  const S = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, 'utf8'))
    : { props: {}, sheets: {}, folders: {}, files: {}, triggers: [], seq: 0, mail: 0 };
  const id = (p) => `${p}${(++S.seq).toString(36)}${randomUUID().slice(0, 6)}`;
  const flush = () => writeFileSync(stateFile, JSON.stringify(S));

  // Sheets turns ISO date strings into dates, like the real thing.
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
    return {
      getName: () => name,
      getLastRow: () => rows().length,
      getLastColumn: () => Math.max(0, ...rows().map((r) => r.length)),
      getRange: range,
      appendRow: (vals) => { rows().push(vals.map(cellIn)); },
      setFrozenRows: () => {},
    };
  }
  function spreadsheetApi(ssId) {
    return {
      getId: () => ssId,
      setSpreadsheetTimeZone: () => {},
      getSheetByName: (n) => (S.sheets[ssId].tabs[n] ? sheetApi(ssId, n) : null),
      insertSheet: (n) => { S.sheets[ssId].tabs[n] = []; return sheetApi(ssId, n); },
      deleteSheet: (sh) => { delete S.sheets[ssId].tabs[sh.getName()]; },
    };
  }
  const SpreadsheetApp = {
    flush: () => {},
    create: (name) => { const i = id('ss'); S.sheets[i] = { name, tabs: { Sheet1: [] } }; S.files[i] = { name, folder: null, kind: 'sheet' }; return spreadsheetApi(i); },
    openById: (i) => { if (!S.sheets[i]) throw new Error(`No spreadsheet ${i}`); return spreadsheetApi(i); },
  };

  function fileApi(fid) {
    const f = () => S.files[fid];
    return {
      getId: () => fid, getName: () => f().name,
      getBlob: () => new Blob(Buffer.from(f().b64 || '', 'base64'), f().mime, f().name),
      setContent: (s) => { f().b64 = Buffer.from(String(s), 'utf8').toString('base64'); return fileApi(fid); },
      moveTo: (folder) => { f().folder = folder.getId(); },
      getUrl: () => `local://file/${fid}`,
    };
  }
  const iter = (list) => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
  function folderApi(fo) {
    return {
      getId: () => fo,
      getName: () => S.folders[fo].name,
      createFolder: (name) => { const i = id('fo'); S.folders[i] = { name, parent: fo }; return folderApi(i); },
      createFile: (a, content, mime) => {
        const i = id('fi');
        if (a instanceof Blob) S.files[i] = { name: a.name, mime: a.type, b64: a.buf.toString('base64'), folder: fo };
        else S.files[i] = { name: a, mime: mime || 'text/plain', b64: Buffer.from(String(content), 'utf8').toString('base64'), folder: fo };
        return fileApi(i);
      },
      getFilesByName: (name) => iter(Object.keys(S.files).filter((k) => S.files[k].folder === fo && S.files[k].name === name).map(fileApi)),
    };
  }
  const DriveApp = {
    createFolder: (name) => { const i = id('fo'); S.folders[i] = { name, parent: null }; return folderApi(i); },
    getFolderById: (i) => { if (!S.folders[i]) throw new Error(`No folder ${i}`); return folderApi(i); },
    getFileById: (i) => { if (!S.files[i]) throw new Error(`No file ${i}`); return fileApi(i); },
  };

  const MailApp = {
    sendEmail: (o) => {
      const n = String(++S.mail).padStart(4, '0');
      const atts = (o.attachments || []).map((b, k) => {
        const fname = `${n}-${k + 1}-${b.name}`.replace(/[^\w. -]/g, '_');
        writeFileSync(join(dir, 'outbox', fname), b.buf);
        return { name: b.name, type: b.type, size: b.buf.length, file: fname, sha256: createHash('sha256').update(b.buf).digest('hex') };
      });
      const rec = { n: Number(n), at: new Date().toISOString(), to: o.to, cc: o.cc || '', replyTo: o.replyTo, name: o.name, subject: o.subject, attachments: atts, html: `${n}.html` };
      writeFileSync(join(dir, 'outbox', `${n}.html`), o.htmlBody || '');
      writeFileSync(join(dir, 'outbox', `${n}.json`), JSON.stringify(rec, null, 2));
      (S.outbox ||= []).push(rec);
    },
  };

  const Utilities = {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, value) => toSigned(createHash(alg).update(toBuf(value)).digest()),
    base64Encode: (v) => toBuf(v).toString('base64'),
    base64EncodeWebSafe: (v) => toBuf(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64Decode: (s) => toSigned(Buffer.from(String(s), 'base64')),
    newBlob: (data, type, name) => new Blob(data, type, name),
    getUuid: () => randomUUID(),
  };

  const props = {
    getProperty: (k) => (k in S.props ? S.props[k] : null),
    setProperty: (k, v) => { if (String(v).length > 9000) throw new Error(`Property ${k} too large`); S.props[k] = String(v); return props; },
    deleteProperty: (k) => { delete S.props[k]; return props; },
    getProperties: () => ({ ...S.props }),
  };

  const triggerBuilder = (fn) => {
    const t = { fn };
    const b = { timeBased: () => b, everyHours: (n) => { t.everyHours = n; return b; }, everyDays: (n) => { t.everyDays = n; return b; }, atHour: (h) => { t.atHour = h; return b; }, inTimezone: (z) => { t.tz = z; return b; }, create: () => { S.triggers.push(t); return t; } };
    return b;
  };

  const ctx = {
    SpreadsheetApp, DriveApp, MailApp, Utilities,
    PropertiesService: { getScriptProperties: () => props },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => { const o = { content: s, setMimeType: () => o, getContent: () => s }; return o; } },
    ScriptApp: {
      getProjectTriggers: () => S.triggers.map((t, i) => ({ getHandlerFunction: () => t.fn, _i: i })),
      deleteTrigger: (t) => { S.triggers.splice(t._i, 1); },
      newTrigger: triggerBuilder,
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }) },
    Logger: { log: () => {} },
    console,
  };
  return { ctx, state: S, flush };
}
