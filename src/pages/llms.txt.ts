// /llms.txt: a plain-text summary of the site for AI assistants and answer engines (llmstxt.org).
// Built from copy.json and the blog collection, so it stays in step with the site.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import copy from '../data/copy.json';
import { absUrl } from '../lib/url.js';

export const GET: APIRoute = async ({ site }) => {
  const s = copy.site;
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
  // Main links point at the UK site; pages that also exist in US English say so.
  const link = (name: string, path: string, note: string, regions = ['uk', 'us']) =>
    `- [${name}](${absUrl(path, site, { region: regions[0] })}): ${note}${regions.includes('us') && regions[0] !== 'us' ? ` (US version: ${absUrl(path, site, { region: 'us' })})` : ''}`;
  const cases = Object.entries(copy.cases).map(([id, c]: [string, any]) =>
    link(`${c.name} (${c.type === 'own' ? "Lavi's own project" : 'sample case study'})`, `/work/${id}/`, c.summary));

  const body = `# ${s.name}, ${s.role}

> ${s.name} is a London-based creative branding and content marketing expert with 10 years' experience across industries. Lavi shapes brand identities and designs and writes the content that carries them: social media, Mailchimp newsletters and WordPress blog articles for product and service businesses in the UK and the US, on a fixed monthly fee.

- Location: ${s.location}. Works with clients across the UK and US.
- Services: brand identity, brand kits and tone of voice; social media feed posts, Instagram and LinkedIn carousels, Reel covers, captions and scheduling; Mailchimp newsletters; WordPress blog articles; reusable Canva templates.
- Sectors: skincare and beauty, food and drink, homeware, law firms, accountants and local trades, among others.
- How it works: a short intro call, a brand kit, a monthly content calendar the client approves, then design, writing and scheduling. Nothing is published without the client's sign-off.
- Pricing: fixed monthly fee, quoted after a short call. No hourly billing.
- Contact: ${s.email} · ${absUrl('/contact/', site, { region: 'uk' })}
- Regional versions: the site is published twice, for UK visitors at ${absUrl('/', site, { region: 'uk' })} (British English) and US visitors at ${absUrl('/', site, { region: 'us' })} (American English). Some articles are UK-only.
- The portfolio has six sample case studies created to show the work (not real clients) and one real project of Lavi's own.
- Own project: Paws, Peace & Poems (https://www.instagram.com/pawspeacenpoems/), a mental-health education page that explains psychology in plain, kind words, with a YouTube channel, Take a Paws with Lavi (https://www.youtube.com/@TakeaPawswithLavi), and a LinkedIn community group. It shares general wellbeing information, not therapy or medical advice; Lavi is not a qualified therapist.

## Main pages
${link('Home', '/', copy.seo.home.description)}
${link('Services and packages', '/services/', copy.seo.services.description)}
${link('About Lavi', '/about/', copy.seo.about.description)}
${link('Portfolio', '/work/', copy.seo.work.description)}
${link('Contact', '/contact/', copy.seo.contact.description)}

## Blog
${posts.map((p) => link(p.data.title, `/insights/${p.id}/`, p.data.description, p.data.regions)).join('\n')}

## Case studies
${cases.join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
