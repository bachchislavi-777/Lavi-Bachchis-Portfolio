// Base-aware links. Every internal link and asset URL goes through url(),
// so moving from GitHub Pages (/Lavi-Bachchis-Portfolio/) to a custom domain (/) only
// needs BASE_PATH changed in the build settings.
//
// Page links also get the regional prefix (/uk/ or /us/, see src/lib/region.js): url('/work/') on a
// UK page is /uk/work/. Files (anything whose last part has a dot, like images/x.jpg or favicon.ico)
// are shared by both regions and are never prefixed.
import { getRegion } from './region.js';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
const isFile = (p) => /\.[a-z0-9]+$/i.test(p.split(/[?#]/)[0]);

/** @param {string} path @param {{ region?: string | null }} [opts] region: null = no regional prefix */
export function url(path = '/', opts = {}) {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = String(path).replace(/^\/+/, '');
  const region = opts.region === undefined ? getRegion() : opts.region;
  if (!region || isFile(clean) || /^(uk|us)(\/|$)/.test(clean)) return `${BASE}/${clean}`;
  return `${BASE}/${region}/${clean}`;
}

/** Absolute URL (for canonical, Open Graph and JSON-LD). */
export function absUrl(path, site, opts = {}) {
  return new URL(url(path, opts), site).href;
}

/** A page path with any /uk or /us prefix removed, e.g. /us/work/ -> /work/. */
export const stripRegion = (pathname) => pathname.replace(/^\/(uk|us)(?=\/|$)/, '') || '/';
