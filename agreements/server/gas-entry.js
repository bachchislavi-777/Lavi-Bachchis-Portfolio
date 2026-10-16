// Entry point bundled into the Apps Script project (see agreements/build.mjs).
/* global ContentService */
import { handle, dailyJob, sendPendingCopies } from './api.js';
import { setup } from './setup.js';

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

export function httpPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out({ ok: false, error: 'Bad request.', code: 'bad_json' }); }
  return out(handle(req));
}
export function httpGet() {
  return out({ ok: true, service: 'lb-agreements' });
}
export function hourlyJob() { return sendPendingCopies(); }
export { handle, dailyJob, setup };
