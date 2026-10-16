// Builds the clickable demo into agreements/dist/demo/ (one page + its files).
// Run: npm run agreements:demo
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const out = join(here, '..', 'dist', 'demo');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts', 'pdf'), { recursive: true });
mkdirSync(join(out, 'brand'), { recursive: true });

await build({
  entryPoints: [join(here, 'main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  outfile: join(out, 'demo.js'),
  loader: { '.woff2': 'file', '.woff': 'empty' },
  assetNames: 'fonts/[name]-[hash]',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});
copyFileSync(join(here, 'index.html'), join(out, 'index.html'));
for (const f of readdirSync(join(repo, 'public', 'fonts', 'pdf'))) copyFileSync(join(repo, 'public', 'fonts', 'pdf', f), join(out, 'fonts', 'pdf', f));
for (const f of ['logo-horizontal.svg', 'logo-h-168.png']) copyFileSync(join(repo, 'public', 'brand', f), join(out, 'brand', f));
console.log('Built agreements/dist/demo/');
