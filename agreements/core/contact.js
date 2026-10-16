// Lavi's contact email for agreements, invoices and client pages. It follows the website's own contact email
// (src/data/copy.json, site.email), so switching to hello@lavibachchis.com later is a one-line change there.
import copy from '../../src/data/copy.json' with { type: 'json' };

export const CONTACT_EMAIL = copy.site.email;
