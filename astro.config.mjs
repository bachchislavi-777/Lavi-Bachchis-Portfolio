// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Where the site lives.
// - Today (GitHub Pages project site): https://bachchislavi-777.github.io/Lavi-Bachchis-Portfolio/
// - Later (custom domain): set SITE_URL=https://yourdomain.com and BASE_PATH=/
//   (in .github/workflows/deploy.yml), and add public/CNAME. Nothing else changes.
const SITE_URL = process.env.SITE_URL || 'https://lavibachchis.com';
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
    }),
  ],
});
