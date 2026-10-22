// Site settings you may want to change. Keep the quotes and the semicolons.

// Contact form (Web3Forms, free). Get a key at https://web3forms.com (enter hello@lavibachchis.com),
// then paste it between the quotes, e.g. 'a1b2c3d4-....'. While this is empty, the contact page
// shows email and phone only, with the note "Online form coming soon".
export const PUBLIC_WEB3FORMS_KEY = 'af33ae85-65a1-4fc5-aadb-e3d8f8c3e227';

// Contact form records (Supabase). Every enquiry is also saved in Supabase → Table Editor → contact_enquiries.
// The publishable key is safe to be public: the database only lets it ADD enquiries, never read them.
// The form switches on when either the Web3Forms key or both Supabase values are filled in.
export const PUBLIC_SUPABASE_URL = 'https://xysgfgkgndpgcctrnrla.supabase.co';
export const PUBLIC_SUPABASE_KEY = 'sb_publishable_bX947SOMRliTEQJO5T4J6g_Q_3ALwFy';

// About-page photo. Upload your photo to public/images/ (e.g. lavi.jpg, ideally 1080×1350 portrait),
// then write its file name here, e.g. 'images/lavi.jpg'. While this is empty, a placeholder card is shown.
export const ABOUT_PHOTO = 'images/lavi.jpg';
export const ABOUT_PHOTO_ALT = 'Lavi Bachchis, smiling, in a navy blazer';

// Agreements & invoices (the /agreement/, /invoice/ and /studio/ pages). Paste the web app address of the
// "LB Agreements" Google Apps Script here once it is deployed, e.g. 'https://script.google.com/macros/s/AKfy.../exec'.
// While this is empty, those pages say the system is not switched on yet. See agreements/README.md.
export const AGREEMENTS_API_URL = 'https://script.google.com/macros/s/AKfycbyyDDx-oJ4y1l0s195SJpvD19crE4xBj1KV_xbO6aIpj0eHbo1TEJiUxMJmIGhbTfkubQ/exec';
