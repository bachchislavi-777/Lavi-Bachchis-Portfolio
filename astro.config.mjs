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
  // One page at a time: src/lib/region.js tracks the region of the page being built (UK or US).
  build: { format: 'directory', concurrency: 1 },
  integrations: [
    sitemap({
      // Only the regional pages. The root and old addresses are region choosers, not content.
      filter: (page) => /\/(uk|us)\//.test(new URL(page).pathname) && !/\/404\/?$/.test(page),
      // Adds UK/US alternate links (hreflang) for each page that exists in both regions.
      i18n: { defaultLocale: 'uk', locales: { uk: 'en-GB', us: 'en-US' } },
    }),
  ],
});
