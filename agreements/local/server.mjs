// Runs the built Apps Script backend (agreements/dist/gas/Code.js) on this computer, for testing.
//   npm run agreements:local      -> http://localhost:8787/exec
// Test-only extras (never exist in Google): /__test/outbox, /__test/clock, /__test/job, /__test/reset.
import http from 'node:http';
import vm from 'node:vm';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createGasContext } from './gas-shim.mjs';

process.env.TZ = 'Europe/London';
const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DIR = process.env.LB_DATA_DIR || join(here, '.data');
const SITE = process.env.SITE_URL || 'http://localhost:4321';

let gas, sandbox, clockOffset = 0, fixedNow = null;
function boot({ fresh = false } = {}) {
  if (fresh) rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  gas = createGasContext({ dir: DIR });
  sandbox = vm.createContext({ ...gas.ctx, __lbNow: () => (fixedNow ? new Date(fixedNow) : new Date(Date.now() + clockOffset)) });
  vm.runInContext(readFileSync(join(here, '..', 'dist', 'gas', 'Code.js'), 'utf8'), sandbox, { filename: 'Code.js' });
  if (!gas.state.props.SHEET_ID) {
    sandbox.setup();
    gas.state.props.SITE_URL = SITE;
    gas.flush();
  }
}
boot({ fresh: process.argv.includes('--fresh') });

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b)); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (url.pathname === '/exec' && req.method === 'POST') {
      // Apps Script only accepts "simple" requests; insist on the same here so the site behaves identically.
      const ct = req.headers['content-type'] || '';
      if (!ct.startsWith('text/plain')) return send(res, 400, { ok: false, error: 'Use text/plain (Apps Script requirement)' });
      const body = await readBody(req);
      const out = sandbox.doPost({ postData: { contents: body } });
      gas.flush();
      return send(res, 200, out.getContent());
    }
    if (url.pathname === '/exec' && req.method === 'GET') return send(res, 200, sandbox.doGet({}).getContent());
    if (url.pathname === '/__test/outbox') {
      const list = gas.state.outbox || [];
      if (url.searchParams.get('n')) {
        const n = Number(url.searchParams.get('n'));
        const m = list.find((x) => x.n === n);
        return send(res, 200, readFileSync(join(DIR, 'outbox', m.html)), 'text/html; charset=utf-8');
      }
      return send(res, 200, list);
    }
    if (url.pathname === '/__test/file') return send(res, 200, readFileSync(join(DIR, 'outbox', url.searchParams.get('name'))), 'application/pdf');
    if (url.pathname === '/__test/clock' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req)) || '{}');
      fixedNow = b.now || null;
      return send(res, 200, { now: sandbox.__lbNow().toISOString() });
    }
    if (url.pathname === '/__test/job' && req.method === 'POST') { const s = sandbox.runDailyJob(); gas.flush(); return send(res, 200, s); }
    if (url.pathname === '/__test/hourly' && req.method === 'POST') { const s = sandbox.runHourlyJob(); gas.flush(); return send(res, 200, s); }
    if (url.pathname === '/__test/reset' && req.method === 'POST') { fixedNow = null; boot({ fresh: true }); return send(res, 200, { ok: true }); }
    if (url.pathname === '/__test/state') return send(res, 200, gas.state);
    if (url.pathname === '/__test/props' && req.method === 'POST') { Object.assign(gas.state.props, JSON.parse(await readBody(req))); gas.flush(); return send(res, 200, { ok: true }); }
    return send(res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { ok: false, error: String(e && e.stack || e) });
  }
}).listen(PORT, () => console.log(`LB Agreements (local) on http://localhost:${PORT}/exec, data in ${DIR}`));
