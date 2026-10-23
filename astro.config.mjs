// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// Where the site lives.
// - Today (GitHub Pages project site): https://bachchislavi-777.github.io/Lavi-Bachchis-Portfolio/
// - Later (custom domain): set SITE_URL=https://yourdomain.com and BASE_PATH=/
//   (in .github/workflows/deploy.yml), and add public/CNAME. Nothing else changes.
const SITE_URL = process.env.SITE_URL || 'https://lavibachchis.com';
const BASE_PATH = process.env.BASE_PATH || '/';

// Blog twins (a UK post and a US post on the same topic with different slugs, linked by `counterpart`).
// The config can't use getCollection, so read the frontmatter directly. The build itself checks that every
// pair is valid (src/lib/twins.js); here a pair is only added when both posts exist and neither is a draft.
const BLOG = './src/content/blog';
const posts = {};
for (const f of fs.readdirSync(BLOG).filter((f) => f.endsWith('.md'))) {
  const fm = fs.readFileSync(`${BLOG}/${f}`, 'utf8').split(/^---\s*$/m)[1] ?? '';
  posts[f.replace(/\.md$/, '')] = {
    counterpart: fm.match(/^counterpart:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1],
    region: fm.match(/^regions:\s*\[\s*["'](uk|us)["']\s*\]\s*$/m)?.[1],
    draft: /^draft:\s*true\s*$/m.test(fm),
  };
}
const twins = {}; // '/uk/insights/a/' -> { uk: '/uk/insights/a/', us: '/us/insights/b/' }
for (const [slug, p] of Object.entries(posts)) {
  const o = posts[p.counterpart];
  if (!p.counterpart || !p.region || p.draft || !o || o.draft || !o.region || o.region === p.region || o.counterpart !== slug) continue;
  const pair = { [p.region]: `/${p.region}/insights/${slug}/`, [o.region]: `/${o.region}/insights/${p.counterpart}/` };
  twins[pair[p.region]] = pair;
}
const BASE = BASE_PATH.replace(/\/$/, '');
const abs = (p) => new URL(BASE + p, SITE_URL).href;

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
      // Blog twins have different slugs, which i18n can't pair, so give them their alternates here.
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const pair = twins[BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname];
        if (pair) {
          item.links = [
            { lang: 'en-GB', url: abs(pair.uk) },
            { lang: 'en-US', url: abs(pair.us) },
            { lang: 'x-default', url: abs(pair.uk) },
          ];
        }
        return item;
      },
    }),
  ],
});
