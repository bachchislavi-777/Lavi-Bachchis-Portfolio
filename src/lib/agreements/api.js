// Talks to the agreements backend (Google Apps Script). The address comes from src/data/settings.js
// (AGREEMENTS_API_URL), placed in the page by AppLayout.astro.

// In the clickable demo (agreements/demo), globalThis.LB_DEMO stands in for the Google backend.
const DEMO = globalThis.LB_DEMO || null;
export const API = DEMO ? 'demo' : (document.querySelector('meta[name="lb-api"]')?.getAttribute('content') || '').trim();
export const BASE = DEMO ? DEMO.base : document.querySelector('meta[name="lb-base"]')?.getAttribute('content') || '';
export const configured = () => !!DEMO || /^https?:\/\//.test(API);

export class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

/** POST as text/plain: Apps Script only accepts simple requests (no CORS pre-flight). */
export async function call(action, body = {}) {
  if (!configured()) throw new ApiError('The agreements system isn’t switched on yet.', 'not_configured');
  if (DEMO) {
    const data = await DEMO.call({ action, ...body });
    if (!data.ok) throw new ApiError(data.error || 'Something went wrong.', data.code);
    return data;
  }
  let res;
  try {
    res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...body }), redirect: 'follow', cache: 'no-store' });
  } catch {
    throw new ApiError('Can’t reach the server. Check your internet connection and try again.', 'network');
  }
  let data;
  try { data = await res.json(); } catch { throw new ApiError('The server sent an unexpected reply. Please try again in a minute.', 'bad_reply'); }
  if (!data.ok) throw new ApiError(data.error || 'Something went wrong.', data.code);
  return data;
}

/** '#id.token' from the address bar. The token sits after # so it is never sent to any server's logs. */
export function linkParts() {
  const m = /^#([\w-]{6,40})\.([\w-]{16,80})$/.exec(location.hash.trim());
  return m ? { id: m[1], token: m[2] } : null;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
