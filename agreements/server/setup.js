// One-time setup in Lavi's Google account. Safe to run again: it only does what is missing.
// Before running it, add two Script Properties (Project Settings → Script properties):
//   SUPABASE_URL         e.g. https://xysgfgkgndpgcctrnrla.supabase.co
//   SUPABASE_SECRET_KEY  the project's secret key (Supabase → Project Settings → API Keys)
/* global ScriptApp, Session */
import { prop, setProp, propJson } from './env.js';
import { connected } from './supabase.js';
import { checkConnection, getSettingsRaw, saveSettingsRaw, flushLog, log } from './store.js';

export function setup() {
  const done = [];
  if (!connected()) throw new Error('First add SUPABASE_URL and SUPABASE_SECRET_KEY under Project Settings → Script properties, then run setup again.');
  checkConnection();
  done.push('Connected to Supabase: records are stored there (tables agreements, invoices, activity_log, settings; bucket signed-agreements)');

  // Settings saved in the earlier Google-only setup move across once.
  if (!getSettingsRaw()) {
    const old = propJson('SETTINGS', null);
    saveSettingsRaw(old || {});
    done.push(old ? 'Copied your studio Settings to Supabase' : 'Created your studio Settings in Supabase (fill them in from the studio)');
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
  log('system', 'setup', done.join(' | '));
  flushLog();
  return done;
}
