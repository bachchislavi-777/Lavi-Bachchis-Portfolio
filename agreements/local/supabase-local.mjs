// A small local stand-in for a Supabase project, for tests: a real PostgreSQL database with the real
// migrations from supabase/migrations, PostgREST (the same REST layer Supabase uses), and a tiny gateway that
// checks the API key and keeps Storage files in a folder. Needs PostgreSQL 16 and PostgREST on this computer
// (set PG_BIN and POSTGREST_BIN if they are not on the PATH).
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(here, '..', '..', 'supabase', 'migrations');
const bin = (name) => (process.env.PG_BIN ? join(process.env.PG_BIN, name) : name);
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const freePort = () => new Promise((ok) => { const s = http.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });

// What Supabase provides before any migration runs: the API roles and the storage schema.
const PLATFORM = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
`;

async function run({ dir, key = `sb_secret_test_${randomUUID()}` }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'storage'), { recursive: true });
  // PostgreSQL refuses to run as root: when this runs as root (e.g. in a container), run it as "postgres".
  const asUser = {};
  if (process.getuid && process.getuid() === 0) {
    asUser.uid = Number(execFileSync('id', ['-u', 'postgres'], { encoding: 'utf8' }));
    asUser.gid = Number(execFileSync('id', ['-g', 'postgres'], { encoding: 'utf8' }));
    execFileSync('chown', ['-R', `${asUser.uid}:${asUser.gid}`, dir]);
    execFileSync('chmod', ['o+rx', dir, dirname(dir)]);
  }
  const pgData = join(dir, 'pg');
  const pgPort = await freePort();
  const user = 'postgres';
  execFileSync(bin('initdb'), ['-D', pgData, '-U', user, '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore', ...asUser });
  const pg = spawn(bin('postgres'), ['-D', pgData, '-p', String(pgPort), '-k', dir, '-c', 'listen_addresses=127.0.0.1', '-c', 'fsync=off'], { stdio: 'ignore', ...asUser });
  const psql = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-p', String(pgPort), '-U', user, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql], { encoding: 'utf8', env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; ; i++) { try { psql('select 1'); break; } catch (e) { if (i > 60) throw e; await wait(250); } }
  psql(PLATFORM);
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) { const sql = readFileSync(join(MIGRATIONS, f), 'utf8'); psql(sql); psql(sql); } // twice: migrations must be re-runnable

  const restPort = await freePort();
  const rest = spawn(process.env.POSTGREST_BIN || 'postgrest', [], {
    stdio: process.env.LB_DEBUG ? 'inherit' : 'ignore',
    env: { ...process.env, PGRST_DB_URI: `postgres://${user}@127.0.0.1:${pgPort}/postgres`, PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'service_role', PGRST_SERVER_PORT: String(restPort), PGRST_SERVER_HOST: '127.0.0.1' },
  });

  // Gateway: Supabase checks the key in the apikey header. Storage objects are kept as files.
  const store = join(dir, 'storage');
  const gwPort = await freePort();
  const gw = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (req.headers.apikey !== key) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"message":"Invalid API key"}'); }
      const url = new URL(req.url, 'http://x');
      if (url.pathname.startsWith('/rest/v1/')) {
        const fwd = http.request({ host: '127.0.0.1', port: restPort, path: url.pathname.slice(8) + url.search, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${restPort}` } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
        fwd.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
        return fwd.end(body);
      }
      let m = /^\/storage\/v1\/bucket\/([\w-]+)$/.exec(url.pathname);
      if (m) {
        const found = psql(`select count(*) from storage.buckets where id = '${m[1].replace(/'/g, '')}'`).includes('1');
        res.writeHead(found ? 200 : 404, { 'Content-Type': 'application/json' }); return res.end(found ? `{"id":"${m[1]}"}` : '{"message":"Bucket not found"}');
      }
      m = /^\/storage\/v1\/object\/([\w-]+)\/(.+)$/.exec(url.pathname);
      if (m) {
        const file = join(store, m[1], ...m[2].split('/').map(decodeURIComponent));
        if (req.method === 'POST' || req.method === 'PUT') {
          if (req.headers['content-type'] !== 'application/pdf') { res.writeHead(415); return res.end('{"message":"mime type not supported"}'); }
          if (existsSync(file) && req.headers['x-upsert'] !== 'true') { res.writeHead(409); return res.end('{"message":"The resource already exists"}'); }
          mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body);
          res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ Key: `${m[1]}/${m[2]}` }));
        }
        if (req.method === 'GET') {
          if (!existsSync(file)) { res.writeHead(404); return res.end('{"message":"Object not found"}'); }
          res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end(readFileSync(file));
        }
      }
      res.writeHead(404); res.end('{"message":"not found"}');
    });
  }).listen(gwPort, '127.0.0.1');

  const url = `http://127.0.0.1:${gwPort}`;
  for (let i = 0; ; i++) {
    try { const r = await fetch(`${url}/rest/v1/settings?select=key`, { headers: { apikey: key } }); if (r.ok) break; } catch (e) { /* starting */ }
    if (i > 80) throw new Error('PostgREST did not start');
    await wait(250);
  }
  return { url, key, pgPort, stop: () => { gw.close(); rest.kill(); pg.kill('SIGINT'); } };
}

// The stand-in runs in its own process: Apps Script's UrlFetchApp is synchronous, so the backend under test
// blocks its own process while it waits for a reply.
export function startLocalSupabase({ dir }) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), dir], { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((ok, fail) => {
    let buf = '';
    child.on('exit', (c) => fail(new Error(`Local Supabase stopped (${c})`)));
    child.stdout.on('data', (d) => {
      buf += d;
      const line = buf.split('\n').find((l) => l.startsWith('{'));
      if (!line) return;
      const info = JSON.parse(line);
      const psql = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-p', String(info.pgPort), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-c', sql], { encoding: 'utf8' });
      ok({ ...info, psql, storageDir: join(dir, 'storage'), stop: () => child.kill('SIGTERM') });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sb = await run({ dir: process.argv[2] });
  const stop = () => { sb.stop(); setTimeout(() => process.exit(0), 300); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  process.stdout.write(`${JSON.stringify({ url: sb.url, key: sb.key, pgPort: sb.pgPort })}\n`);
}
