// Thin wrappers around Google Apps Script services. The local test harness (agreements/local) provides the
// same globals, so every line of the backend runs in tests exactly as it will in Google.
/* global Utilities, PropertiesService, LockService, SpreadsheetApp */
import { dates } from '../core/index.js';

export const now = () => (globalThis.__lbNow ? globalThis.__lbNow() : new Date());
export const today = () => dates.londonDate(now());
export const stamp = () => now().toISOString();

const hex = (bytes) => bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
export const sha256 = (text) => hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8));
export const sha256Bytes = (bytes) => hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));

/** Unguessable random string (letters, digits, - and _). UUIDs are cryptographically random in Apps Script. */
export function randomToken(length = 24) {
  let s = '';
  while (s.length < length) {
    const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${Utilities.getUuid()}${Utilities.getUuid()}${Math.random()}`, Utilities.Charset.UTF_8);
    s += Utilities.base64EncodeWebSafe(d).replace(/=+$/, '');
  }
  return s.slice(0, length);
}
/** Eight-character studio sign-in code (no look-alike characters such as O/0 or I/1): about 40 bits. */
export function randomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${Utilities.getUuid()}${Utilities.getUuid()}`, Utilities.Charset.UTF_8);
  let out = '';
  for (let i = 0; i < 8; i++) out += A[((d[i] + 256) % 256) % 32];
  return out;
}

const P = () => PropertiesService.getScriptProperties();
export const prop = (k, fallback = '') => P().getProperty(k) ?? fallback;
export const setProp = (k, v) => P().setProperty(k, String(v));
export const delProp = (k) => P().deleteProperty(k);
export const allProps = () => P().getProperties();
export const propJson = (k, fallback) => { try { const v = P().getProperty(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
export const setPropJson = (k, v) => P().setProperty(k, JSON.stringify(v));

/** Run `fn` while holding the script lock, so two requests never write the same record at once. */
export function locked(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(30000);
  try { return fn(); } finally {
    try { if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.flush) SpreadsheetApp.flush(); } catch (e) { /* nothing pending */ }
    l.releaseLock();
  }
}

export class UserError extends Error {
  constructor(message, code = 'bad_request') { super(message); this.code = code; }
}
