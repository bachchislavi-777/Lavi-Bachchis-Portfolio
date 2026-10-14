// Base-aware links. Every internal link and asset URL goes through url(),
// so moving from GitHub Pages (/Lavi-Bachchis-Portfolio/) to a custom domain (/) only
// needs BASE_PATH changed in the build settings.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

export function url(path = '/') {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = String(path).replace(/^\/+/, '');
  return `${BASE}/${clean}`;
}

/** Absolute URL (for canonical, Open Graph and JSON-LD). */
export function absUrl(path, site) {
  return new URL(url(path), site).href;
}
