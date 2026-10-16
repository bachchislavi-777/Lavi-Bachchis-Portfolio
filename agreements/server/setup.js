// One-time setup in Lavi's Google account. Safe to run again: it only creates what is missing.
/* global DriveApp, SpreadsheetApp, ScriptApp, Session */
import { prop, setProp } from './env.js';
import { COLUMNS } from './store.js';

export function setup() {
  const done = [];
  let root;
  if (!prop('FOLDER_ID')) {
    root = DriveApp.createFolder('LB Agreements');
    setProp('FOLDER_ID', root.getId());
    setProp('DATA_FOLDER_ID', root.createFolder('data (do not edit)').getId());
    setProp('SIGNED_FOLDER_ID', root.createFolder('Signed agreements').getId());
    done.push('Created the "LB Agreements" folder in Google Drive');
  } else root = DriveApp.getFolderById(prop('FOLDER_ID'));

  if (!prop('SHEET_ID')) {
    const ss = SpreadsheetApp.create('LB Agreements & Invoices');
    setProp('SHEET_ID', ss.getId());
    try { ss.setSpreadsheetTimeZone('Europe/London'); } catch (e) { /* uses the account default */ }
    try { DriveApp.getFileById(ss.getId()).moveTo(root); } catch (e) { /* stays in My Drive */ }
    for (const [name, head] of Object.entries(COLUMNS)) {
      const sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#163A2E').setFontColor('#F4ECDF');
      sh.setFrozenRows(1);
    }
    const first = ss.getSheetByName('Sheet1');
    if (first) ss.deleteSheet(first);
    done.push('Created the "LB Agreements & Invoices" register (Google Sheet)');
  }

  if (!prop('OWNER_EMAIL')) {
    setProp('OWNER_EMAIL', Session.getEffectiveUser().getEmail());
    done.push(`Studio sign-in codes go to ${prop('OWNER_EMAIL')}`);
  }
  if (!prop('SITE_URL')) setProp('SITE_URL', 'https://lavibachchis.com');

  for (const t of ScriptApp.getProjectTriggers()) if (['runDailyJob', 'runHourlyJob'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('runDailyJob').timeBased().everyDays(1).atHour(8).inTimezone('Europe/London').create();
  ScriptApp.newTrigger('runHourlyJob').timeBased().everyHours(1).create();
  done.push('Daily invoice check scheduled for 8 to 9am London time, plus an hourly check for unsent signed copies');
  return done;
}
