// Builds the Google Apps Script project into agreements/dist/gas/ (Code.js + appsscript.json),
// ready to paste into script.google.com or push with clasp.
// Run: npm run agreements:build
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist', 'gas');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(here, 'server', 'gas-entry.js')],
  bundle: true,
  format: 'iife',
  globalName: 'LB',
  target: 'es2019',
  outfile: join(out, 'Code.js'),
  legalComments: 'none',
  banner: { js: `// LB Agreements backend for lavibachchis.com. Built ${new Date().toISOString().slice(0, 10)} from agreements/server in the website repo.\n// Do not edit here: change the source and rebuild.` },
  footer: { js: `
// Apps Script calls these by name.
function doGet(e) { return LB.httpGet(e); }
function doPost(e) { return LB.httpPost(e); }
function runDailyJob() { return LB.dailyJob(); }
function runHourlyJob() { return LB.hourlyJob(); }
function setup() { var done = LB.setup(); Logger.log(done.join('\\n')); return done; }
` },
});
copyFileSync(join(here, 'server', 'appsscript.json'), join(out, 'appsscript.json'));
const size = readFileSync(join(out, 'Code.js')).length;
writeFileSync(join(out, '.clasp.json.example'), JSON.stringify({ scriptId: 'PASTE-SCRIPT-ID', rootDir: '.' }, null, 2));
console.log(`Built agreements/dist/gas/Code.js (${Math.round(size / 1024)} KB)`);
