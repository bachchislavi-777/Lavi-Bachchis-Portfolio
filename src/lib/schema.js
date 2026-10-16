// JSON-LD helpers (schema.org). Kept honest: no Review/AggregateRating, case studies described as concept work.
import { getCopy, getRegion, REGION_META } from './region.js';
import { absUrl } from './url.js';

// Copy and language follow the region of the page being built (see region.js).
const lang = () => REGION_META[getRegion()].lang;

export function personSchema(site, extra = {}) {
  const copy = getCopy(), s = copy.site;
  return {
    '@type': 'Person',
    '@id': `${absUrl('/', site, { region: null })}#person`,
    name: s.name,
    jobTitle: 'Freelance content & creative; marketing and brand lead',
    email: `mailto:${s.email}`,
    telephone: s.phoneHref,
    url: absUrl('/about/', site),
    image: absUrl('og-image.jpg', site),
    address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
    sameAs: [s.linkedin, s.instagram, s.youtube],
    knowsAbout: ['Social media content', 'Instagram carousels', 'Reel covers', 'LinkedIn PDF carousels', 'Mailchimp newsletters', 'WordPress blogs', 'Brand kits', 'Content strategy', 'Mental health and wellbeing content'],
    ...extra,
  };
}

export function businessSchema(site) {
  const copy = getCopy(), s = copy.site;
  return {
    '@type': 'ProfessionalService',
    '@id': `${absUrl('/', site, { region: null })}#business`,
    name: `${s.name}, ${s.role}`,
    description: copy.seo.home.description,
    url: absUrl('/', site),
    image: absUrl('og-image.jpg', site),
    logo: absUrl('icon-512.png', site),
    email: s.email,
    telephone: s.phoneHref,
    address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
    areaServed: { '@type': 'Country', name: REGION_META[getRegion()].name },
    founder: { '@id': `${absUrl('/', site, { region: null })}#person` },
    sameAs: [s.linkedin, s.instagram, s.youtube],
  };
}

// packages: copy.services.packages with a price ({ amount, currency }) for the region being built.
export function servicesSchema(site, packages = getCopy().services.packages) {
  const copy = getCopy();
  const area = REGION_META[getRegion()].name; // each regional site serves its own country
  return copy.services.list.map((x) => ({
    '@type': 'Service',
    name: x.title,
    serviceType: x.eyebrow,
    description: x.text,
    provider: { '@id': `${absUrl('/', site, { region: null })}#person` },
    areaServed: area,
    url: absUrl('/services/', site),
  })).concat(packages.map((p) => ({
    '@type': 'Service',
    name: p.custom ? p.name : `${p.name} package`,
    description: `${p.for} ${p.items.map((i) => `${i.label}: ${i.value}`).join('; ')}. ${p.note}.`,
    provider: { '@id': `${absUrl('/', site, { region: null })}#person` },
    areaServed: area,
    url: absUrl('/services/', site),
    ...(p.price && {
      offers: {
        '@type': 'Offer',
        price: p.price.amount,
        priceCurrency: p.price.currency,
        priceSpecification: { '@type': 'UnitPriceSpecification', price: p.price.amount, priceCurrency: p.price.currency, unitText: 'MONTH' },
      },
    }),
  })));
}

export function caseSchema(site, id) {
  const copy = getCopy(), s = copy.site;
  const c = copy.cases[id];
  if (c.type === 'own') {
    return {
      '@type': 'CreativeWork',
      name: `${c.name}: own project`,
      headline: copy.seo[id].title.replace(/ \| Lavi Bachchis$/, ''),
      description: c.summary,
      genre: 'Mental health and wellbeing education',
      about: c.sector,
      creator: { '@id': `${absUrl('/', site, { region: null })}#person` },
      url: absUrl(`/work/${id}/`, site),
      sameAs: (c.links || []).map((l) => l.url),
      inLanguage: lang(),
    };
  }
  return {
    '@type': 'CreativeWork',
    name: `${c.name}: sample case study`,
    headline: copy.seo[id].title.replace(/ \| Lavi Bachchis$/, ''),
    description: `Concept project (sample brand). ${c.summary}`,
    genre: 'Concept work / sample brand',
    about: c.sector,
    creator: { '@id': `${absUrl('/', site, { region: null })}#person` },
    url: absUrl(`/work/${id}/`, site),
    image: absUrl(`images/${({ solenne: 'gsol_hero', lowtide: 'glow_bag', loomhouse: 'gloom_stack', ashbygrant: 'ash1', northfield: 'nor2', halden: 'ghal_boiler' })[id]}.jpg`, site),
    dateCreated: '2026',
    inLanguage: lang(),
  };
}
