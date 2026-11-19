// Regional sites: every page is built twice, under /uk/ (British English) and /us/ (American English).
//
// Each page under src/pages/[region]/ calls setRegion(Astro.params.region) at the top of its frontmatter,
// before any component renders. Components and helpers then read the current region from here, so
// url() adds the right /uk or /us prefix and getCopy() returns the right wording.
// This relies on Astro building one page at a time (build.concurrency: 1 in astro.config.mjs).
import baseCopy from '../data/copy.json';

export const REGIONS = ['uk', 'us'];
export const REGION_META = {
  uk: { label: 'UK', name: 'United Kingdom', lang: 'en-GB', ogLocale: 'en_GB' },
  us: { label: 'US', name: 'United States', lang: 'en-US', ogLocale: 'en_US' },
};

let current = 'uk';
export const setRegion = (r) => { current = REGIONS.includes(r) ? r : 'uk'; };
export const getRegion = () => current;

// ---------- US English ----------

// Whole words only, matched case-insensitively; the replacement keeps the original's capitalisation.
const WORDS = {
  colour: 'color', colours: 'colors', coloured: 'colored', colourful: 'colorful', colourway: 'colorway', colourways: 'colorways',
  favourite: 'favorite', favourites: 'favorites', flavour: 'flavor', flavours: 'flavors',
  behaviour: 'behavior', behaviours: 'behaviors', neighbour: 'neighbor', neighbours: 'neighbors', neighbouring: 'neighboring',
  humour: 'humor', labour: 'labor', honour: 'honor',
  centre: 'center', centres: 'centers', metre: 'meter', metres: 'meters',
  catalogue: 'catalog', catalogues: 'catalogs', programme: 'program', programmes: 'programs',
  organise: 'organize', organised: 'organized', organises: 'organizes', organising: 'organizing',
  organisation: 'organization', organisations: 'organizations',
  realise: 'realize', realised: 'realized', recognise: 'recognize', recognised: 'recognized', recognises: 'recognizes',
  personalise: 'personalize', personalised: 'personalized', customise: 'customize', customised: 'customized',
  prioritise: 'prioritize', summarise: 'summarize', specialise: 'specialize', specialised: 'specialized', specialises: 'specializes',
  optimise: 'optimize', optimised: 'optimized', optimising: 'optimizing', minimise: 'minimize', maximise: 'maximize',
  emphasise: 'emphasize', apologise: 'apologize', analyse: 'analyze', analysed: 'analyzed',
  licence: 'license', licences: 'licenses', travelling: 'traveling', travelled: 'traveled', cancelled: 'canceled',
  labelled: 'labeled', labelling: 'labeling', modelling: 'modeling', fulfil: 'fulfill', judgement: 'judgment',
  grey: 'gray', greys: 'grays', cosy: 'cozy', sceptical: 'skeptical', jewellery: 'jewelry', mould: 'mold', ageing: 'aging',
};
const WORD_RE = new RegExp(`\\b(${Object.keys(WORDS).join('|')})\\b`, 'gi');
const keepCase = (from, to) => (from === from.toUpperCase() ? to.toUpperCase() : from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);

// Phrases: lead with the US, and use US business terms.
const PHRASES = [
  [/\bthe UK and the US\b/g, 'the US and the UK'],
  [/\bUK and US\b/g, 'US and UK'],
  [/\bUK & US\b/g, 'US & UK'],
  [/\bUK or US\b/g, 'US or UK'],
  [/\bworking day\b/g, 'business day'],
  [/\bfortnight\b/g, 'two weeks'],
  [/\byour GP\b/g, 'your doctor'],
  [/\bfor your UK business\b/g, 'for your US business'],
  [/\ba fortnightly\b/g, 'an every-other-week'],
  [/\bfortnightly\b/g, 'every other week'],
];

// Keys whose values are addresses, codes or data, never prose.
const SKIP = new Set(['quote', 'href', 'url', 'src', 'whatsapp', 'linkedin', 'instagram', 'youtube', 'email', 'id', 'hli', 'avatar']);

export function toUS(text) {
  if (typeof text !== 'string') return text;
  let t = text.replace(WORD_RE, (m) => keepCase(m, WORDS[m.toLowerCase()]));
  for (const [re, to] of PHRASES) t = t.replace(re, to);
  return t;
}

/** Deep copy of a value with every prose string converted to US English. */
export function localise(value, region = current) {
  if (region !== 'us') return value;
  const walk = (v, key) => {
    if (typeof v === 'string') return SKIP.has(key) ? v : toUS(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value);
}

// US-specific wording, applied on top of the converted copy.
// Site copy doesn't name a country or city (only the URL and the contact page do), so this is
// only for things that genuinely differ, such as crisis-line numbers.
//
// The US homepage and Work page also get their own wording: with spelling changes alone, Google treated
// /us/ and /us/work/ as copies of the UK pages and indexed only the UK versions ("Duplicate, Google chose
// different canonical than user", Search Console, Nov 2026).
const US_OVERRIDES = {
  seo: {
    home: {
      title: 'Creative Branding & Content for US Brands | Lavi Bachchis',
      description: 'Creative branding and content marketing for US small businesses: brand identity, social media, newsletters and blogs, planned a month ahead and approved by you.',
    },
    work: {
      title: 'US Social Media Case Studies & Portfolio | Lavi Bachchis',
      description: 'Social media case studies for US brands: six sample brands plus my own wellbeing page, with brand kits, Instagram grids, Reel covers and LinkedIn carousels.',
    },
  },
  home: {
    eyebrow: 'Creative branding & content for US brands',
    lede: "For 10 years I've worked in content marketing and branding across industries. I help US small businesses shape how their brand looks and sounds, then design and write the social media, Mailchimp newsletters and WordPress blogs that carry it, planned a month ahead and delivered on time.",
    intro: {
      text: "I'm Lavi, a creative branding and content marketing expert working with businesses across the US. For the last 10 years I've helped brands across industries find a clear identity and show up consistently on social, in the inbox and on their blog.",
    },
    servicesTeaser: {
      text: 'Brand kits, feed posts, carousels, Reel covers, newsletters and blog articles for a fixed monthly fee in US dollars, planned a month ahead.',
    },
  },
  work: {
    intro: "These case studies show how I build a brand's content from the ground up, the same way I would for a US small business. One is my own: Paws, Peace & Poems, a mental-wellbeing page I run. The other six are sample brands I created, each with a brand kit, content pillars, a planned 9-post Instagram grid and four creatives built on current formats. In the samples, names, people, reviews and figures are illustrative.",
    ownNote: "Paws, Peace & Poems is my own, real project. It shares general wellbeing information, not therapy or medical advice, and I'm not a qualified therapist. If you're struggling, please talk to your doctor, or call or text 988 (the 988 Suicide & Crisis Lifeline), any time. In an emergency, call 911.",
  },
};

const merge = (a, b) => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = merge(a?.[k], v);
  return out;
};

const cache = {};
/** Site copy for the current region (copy.json, converted and overridden for the US). */
export function getCopy(region = current) {
  if (!cache[region]) cache[region] = region === 'us' ? merge(localise(baseCopy, 'us'), US_OVERRIDES) : baseCopy;
  return cache[region];
}
