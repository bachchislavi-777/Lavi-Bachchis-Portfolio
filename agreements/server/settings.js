// Lavi's business and payment details. Stored privately in her Supabase project (table "settings"), never in
// the website repository, which is public.
import { terms as T } from '../core/index.js';
import { prop } from './env.js';
import { getSettingsRaw, saveSettingsRaw } from './store.js';

export const SETTINGS_DEFAULTS = {
  business: {
    name: T.BUSINESS_DEFAULTS.name,
    trading: T.BUSINESS_DEFAULTS.trading,
    email: T.BUSINESS_DEFAULTS.email,
    website: T.BUSINESS_DEFAULTS.website,
    address: '',            // needed on invoices, and for consumers (the law requires a postal address)
    phone: '',
    vatRegistered: false,
    vatNumber: '',
  },
  payment: {
    accountName: '',
    bankName: '',
    sortCode: '',
    accountNumber: '',
    iban: '',
    bic: '',
    paypal: '',             // PayPal.Me link or PayPal email
    note: 'Please use the invoice number as the payment reference.',
  },
  invoices: {
    autoSend: true,         // email invoices to clients as soon as they are issued
    copyMe: true,           // copy Lavi on every invoice email
    autoReminders: true,    // chase unpaid invoices automatically: 1, 7 and 14 days after the due date
  },
};

const merge = (a, b) => {
  const out = { ...a };
  for (const k of Object.keys(b || {})) out[k] = a && typeof a[k] === 'object' && !Array.isArray(a[k]) && a[k] !== null ? merge(a[k], b[k]) : b[k];
  return out;
};

export function getSettings() {
  return merge(SETTINGS_DEFAULTS, getSettingsRaw() || {});
}
export function saveSettings(next) {
  const cur = getSettings();
  const out = merge(cur, next);
  // keep only known keys
  for (const g of Object.keys(out)) if (!(g in SETTINGS_DEFAULTS)) delete out[g];
  for (const g of Object.keys(SETTINGS_DEFAULTS)) for (const k of Object.keys(out[g])) if (!(k in SETTINGS_DEFAULTS[g])) delete out[g][k];
  out.business.vatRegistered = !!out.business.vatRegistered;
  out.invoices.autoSend = !!out.invoices.autoSend;
  out.invoices.copyMe = !!out.invoices.copyMe;
  out.invoices.autoReminders = !!out.invoices.autoReminders;
  saveSettingsRaw(out);
  return out;
}

/** Where studio sign-in codes go: the Google account that runs the system (set once at setup). */
export const ownerEmail = () => prop('OWNER_EMAIL') || getSettings().business.email;
/** Lavi's official address for copies, replies and alerts (Settings → Business email). */
export const notifyEmail = () => getSettings().business.email || ownerEmail();
export const siteUrl = () => (prop('SITE_URL') || 'https://lavibachchis.com').replace(/\/$/, '');
export const agreementLink = (a) => `${siteUrl()}/agreement/#${a.id}.${a.token}`;
export const invoiceLink = (i) => `${siteUrl()}/invoice/#${i.id}.${i.token}`;
export const studioLink = () => `${siteUrl()}/studio/`;

/** The business block used in documents (with the privacy notice links). */
export function businessForDocs() {
  const b = getSettings().business;
  return { ...b, privacyUrl: { uk: `${siteUrl()}/uk/privacy/`, us: `${siteUrl()}/us/privacy/` } };
}
