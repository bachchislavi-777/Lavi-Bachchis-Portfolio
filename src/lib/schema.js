// JSON-LD helpers (schema.org). Kept honest: no Review/AggregateRating, case studies described as concept work.
import copy from '../data/copy.json';
import { absUrl } from './url.js';

const s = copy.site;

export function personSchema(site, extra = {}) {
  return {
    '@type': 'Person',
    '@id': `${absUrl('/', site)}#person`,
    name: s.name,
    jobTitle: 'Freelance content & creative; marketing and brand lead',
    email: `mailto:${s.email}`,
    telephone: s.phoneHref,
    url: absUrl('/about/', site),
    image: absUrl('og-image.jpg', site),
    address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
    sameAs: [s.linkedin, s.instagram],
    knowsAbout: ['Social media content', 'Instagram carousels', 'Reel covers', 'LinkedIn PDF carousels', 'Mailchimp newsletters', 'WordPress blogs', 'Brand kits', 'Content strategy', 'Mental health and wellbeing content'],
    ...extra,
  };
}

export function businessSchema(site) {
  return {
    '@type': 'ProfessionalService',
    '@id': `${absUrl('/', site)}#business`,
    name: `${s.name}, ${s.role}`,
    description: copy.seo.home.description,
    url: absUrl('/', site),
    image: absUrl('og-image.jpg', site),
    logo: absUrl('icon-512.png', site),
    email: s.email,
    telephone: s.phoneHref,
    address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
    areaServed: [{ '@type': 'Country', name: 'United Kingdom' }, { '@type': 'Country', name: 'United States' }],
    founder: { '@id': `${absUrl('/', site)}#person` },
    sameAs: [s.linkedin],
    priceRange: 'Fixed monthly fee, quoted after a short call',
  };
}

export function servicesSchema(site) {
  return copy.services.list.map((x) => ({
    '@type': 'Service',
    name: x.title,
    serviceType: x.eyebrow,
    description: x.text,
    provider: { '@id': `${absUrl('/', site)}#person` },
    areaServed: ['United Kingdom', 'United States'],
    url: absUrl('/services/', site),
  })).concat(copy.services.packages.map((p) => ({
    '@type': 'Service',
    name: `${p.name} package`,
    description: `${p.for} ${p.items.map((i) => `${i.label}: ${i.value}`).join('; ')}. ${p.note}.`,
    provider: { '@id': `${absUrl('/', site)}#person` },
    areaServed: ['United Kingdom', 'United States'],
    url: absUrl('/services/', site),
  })));
}

export function caseSchema(site, id) {
  const c = copy.cases[id];
  if (c.type === 'own') {
    return {
      '@type': 'CreativeWork',
      name: `${c.name}: own project`,
      headline: copy.seo[id].title,
      description: c.summary,
      genre: 'Mental health and wellbeing education',
      about: c.sector,
      creator: { '@id': `${absUrl('/', site)}#person` },
      url: absUrl(`/work/${id}/`, site),
      sameAs: (c.links || []).map((l) => l.url),
      inLanguage: 'en-GB',
    };
  }
  return {
    '@type': 'CreativeWork',
    name: `${c.name}: sample case study`,
    headline: copy.seo[id].title,
    description: `Concept project (sample brand). ${c.summary}`,
    genre: 'Concept work / sample brand',
    about: c.sector,
    creator: { '@id': `${absUrl('/', site)}#person` },
    url: absUrl(`/work/${id}/`, site),
    image: absUrl(`images/${({ solenne: 'gsol_hero', lowtide: 'glow_bag', loomhouse: 'gloom_stack', ashbygrant: 'ash1', northfield: 'nor2', halden: 'ghal_boiler' })[id]}.jpg`, site),
    dateCreated: '2026',
    inLanguage: 'en-GB',
  };
}
