// End-to-end browser tests: the real pages (built with the local backend address) and the real backend code
// running locally. Run: npm run agreements:e2e
import { defineConfig } from '@playwright/test';

const API = 'http://localhost:8791/exec';
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4391', acceptDownloads: true },
  webServer: [
    { command: 'node agreements/local/server.mjs --fresh', cwd: '..', env: { PORT: '8791', LB_DATA_DIR: 'agreements/local/.data/e2e', SITE_URL: 'http://localhost:4391' }, url: `${API}`, reuseExistingServer: false, timeout: 30_000 },
    { command: 'npx astro build && npx astro preview --port 4391', cwd: '..', env: { PUBLIC_AGREEMENTS_API: API }, url: 'http://localhost:4391/agreement/', reuseExistingServer: false, timeout: 240_000 },
  ],
});
