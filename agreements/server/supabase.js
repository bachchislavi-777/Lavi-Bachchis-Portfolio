// Talks to Lavi's Supabase project (database + file storage) from Apps Script.
// The address and the secret key are kept in the Apps Script project's private settings (Script Properties:
// SUPABASE_URL and SUPABASE_SECRET_KEY), never in the website repository, which is public.
/* global UrlFetchApp, Utilities */
import { prop } from './env.js';

const base = () => String(prop('SUPABASE_URL')).trim().replace(/\/+$/, '');
const secret = () => String(prop('SUPABASE_SECRET_KEY')).trim();

export const connected = () => !!(base() && secret());

function authHeaders() {
  const k = secret();
  // New-style secret keys (sb_secret_...) go in the apikey header only; legacy service_role keys are JWTs
  // and also need the Authorization header.
  return /^eyJ/.test(k) ? { apikey: k, Authorization: `Bearer ${k}` } : { apikey: k };
}

/**
 * One HTTP request to Supabase. Retries twice on a busy or temporarily failing server.
 * `body`: an object (sent as JSON), or raw bytes/Blob with `contentType`.
 */
export function request(method, path, { body, contentType, headers = {} } = {}) {
  if (!connected()) throw new Error('Supabase is not connected yet: add SUPABASE_URL and SUPABASE_SECRET_KEY under Project Settings → Script properties.');
  const opts = { method: method.toLowerCase(), headers: { ...authHeaders(), ...headers }, muteHttpExceptions: true, followRedirects: true };
  if (body !== undefined) {
    if (contentType) { opts.payload = body; opts.contentType = contentType; }
    else { opts.payload = JSON.stringify(body); opts.contentType = 'application/json'; }
  }
  let res;
  for (let attempt = 0; ; attempt++) {
    res = UrlFetchApp.fetch(base() + path, opts);
    const code = res.getResponseCode();
    if ((code === 429 || code >= 500) && attempt < 2) { Utilities.sleep(700 * (attempt + 1)); continue; }
    break;
  }
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Supabase ${method.toUpperCase()} ${path.split('?')[0]} failed (${code}): ${String(res.getContentText()).slice(0, 300)}`);
  }
  return res;
}

/** Same as request(), returning the parsed JSON reply (or null for an empty reply). */
export function json(method, path, opts) {
  const text = request(method, path, opts).getContentText();
  return text ? JSON.parse(text) : null;
}

/**
 * Several GET requests sent to Supabase at the same time (UrlFetchApp.fetchAll), returning the parsed JSON
 * replies in the same order. Much faster than one after another: the studio overview needs three reads.
 * Any request that comes back busy or failing is retried on its own with request().
 */
export function jsonGetAll(paths) {
  if (!connected()) throw new Error('Supabase is not connected yet: add SUPABASE_URL and SUPABASE_SECRET_KEY under Project Settings → Script properties.');
  const headers = authHeaders();
  const reqs = paths.map((p) => ({ url: base() + p, method: 'get', headers, muteHttpExceptions: true, followRedirects: true }));
  const res = UrlFetchApp.fetchAll ? UrlFetchApp.fetchAll(reqs) : reqs.map((r) => UrlFetchApp.fetch(r.url, r));
  return res.map((r, i) => {
    const ok = r.getResponseCode() >= 200 && r.getResponseCode() < 300;
    const text = ok ? r.getContentText() : request('get', paths[i]).getContentText();
    return text ? JSON.parse(text) : null;
  });
}

export const enc = encodeURIComponent;
