// Entry point bundled into the Apps Script project (see agreements/build.mjs).
/* global ContentService */
import { handle, dailyJob, sendPendingCopies } from './api.js';
import { setup } from './setup.js';
import { flushLog, resetCache } from './store.js';

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Every run starts with fresh settings and ends by writing its log entries to Supabase.
function run(fn) {
  resetCache();
  try { return fn(); } finally { flushLog(); }
}

export function httpPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out({ ok: false, error: 'Bad request.', code: 'bad_json' }); }
  return out(run(() => handle(req)));
}
export function httpGet() {
  return out({ ok: true, service: 'lb-agreements' });
}
export function hourlyJob() { return run(() => sendPendingCopies()); }
export function daily() { return run(() => dailyJob()); }
export function runSetup() { return run(() => setup()); }
export { handle };
