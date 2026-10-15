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
  const link = (name: string, path: string, note: string) => `- [${name}](${absUrl(path, site)}): ${note}`;
  const cases = Object.entries(copy.cases).map(([id, c]: [string, any]) =>
    link(`${c.name} (${c.type === 'own' ? "Lavi's own project" : 'sample case study'})`, `/work/${id}/`, c.summary));

  const body = `# ${s.name}, ${s.role}

> ${s.name} is a London-based freelance content creator and marketing and brand lead. Lavi designs and writes social media content, Mailchimp newsletters and WordPress blog articles for small product and service businesses in the UK and the US, on a fixed monthly fee.

- Location: ${s.location}. Works with clients across the UK and US.
- Services: social media feed posts, Instagram and LinkedIn carousels, Reel covers, captions and scheduling; Mailchimp newsletters; WordPress blog articles; brand kit and Canva template set-up.
- Sectors: skincare and beauty, food and drink, homeware, law firms, accountants and local trades, among others.
- How it works: a short intro call, a brand kit, a monthly content calendar the client approves, then design, writing and scheduling. Nothing is published without the client's sign-off.
- Pricing: fixed monthly fee, quoted after a short call. No hourly billing.
- Contact: ${s.email} · ${absUrl('/contact/', site)}
- The portfolio has six sample case studies created to show the work (not real clients) and one real project of Lavi's own.
- Own project: Paws, Peace & Poems (https://www.instagram.com/pawspeacenpoems/), a mental-health education page that explains psychology in plain, kind words, with a LinkedIn community group. It shares general wellbeing information, not therapy or medical advice; Lavi is not a qualified therapist.

## Main pages
${link('Home', '/', copy.seo.home.description)}
${link('Services and packages', '/services/', copy.seo.services.description)}
${link('About Lavi', '/about/', copy.seo.about.description)}
${link('Portfolio', '/work/', copy.seo.work.description)}
${link('Contact', '/contact/', copy.seo.contact.description)}

## Blog
${posts.map((p) => link(p.data.title, `/insights/${p.id}/`, p.data.description)).join('\n')}

## Case studies
${cases.join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
