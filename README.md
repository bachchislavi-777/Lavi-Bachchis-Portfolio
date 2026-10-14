# Lavi Bachchis: portfolio website

This is the code and content for Lavi's portfolio website: freelance content & creative, London, for clients across the UK & US. It has a home page, six sample case studies, services and packages, about, 2026 trend notes, contact and privacy pages.

**Live site (once GitHub Pages is switched on):** https://bachchislavi-777.github.io/lavi-bachchis-portfolio/

To switch it on the first time, go to the repo on github.com, then **Settings → Pages → Build and deployment → Source: GitHub Actions**. You only do this once.

---

## How it works, in plain words

- **`main` = the live site.** Whatever is on the `main` branch is what visitors see. Each time something changes on `main`, GitHub rebuilds the site and publishes it in about 1–2 minutes.
- **`work` = drafts.** Make changes on the `work` branch first. Nothing there is live. When you're happy, open a **pull request** from `work` into `main` and click **Merge**. That publishes it.
- **Did it work?** Open the **Actions** tab on github.com. A green tick means it's live. A red cross means something went wrong. The old version stays up, so nothing breaks for visitors. Ask Claude to look at the error.
- **Undo:** every change is saved in the history, so any earlier version can be brought back.
- **The repo is public.** Anyone can read it, so never put private client details, contracts or prices you don't want shared in it.

---

## Changing text

Nearly all the words on the site live in one file: **`src/data/copy.json`**. That covers headlines, page text, case-study briefs, services, packages, FAQ, about, insights and contact details.

1. On github.com, switch the branch menu (top left) to **`work`**.
2. Open `src`, then `data`, then `copy.json`.
3. Click the **pencil icon** (Edit this file).
4. Change the words. **Only change text inside the "quotes"**, and leave the commas, colons and brackets as they are.
5. Click **Commit changes**, then **Commit changes** again.
6. When you're ready to publish, open a pull request from `work` to `main` and merge it.

If you make a typo that breaks the file (a missing quote or comma), the build fails safely. The live site doesn't change, and you'll see a red cross in Actions.

The six sample brands' posts, palettes and captions (the designed tiles) live in `src/data/brands.js`. For those, it's easiest to ask Claude.

## Swapping a photo

Photos are in **`public/images/`**. Each photo has **three files** with the same name:

- `name.jpg` (1080×1350, the fallback)
- `name-1080.webp` (1080×1350)
- `name-540.webp` (540×675)

To replace a photo, upload new versions of **all three** with exactly the same names (*Add file → Upload files* in that folder). Photos should be portrait 4:5. If you only have a JPG, ask Claude to make the WebP sizes for you.

### Adding your own photo to the About page

The About page shows a placeholder card ("Photo coming soon") until you add a photo.

1. Upload your photo to `public/images/`, for example `lavi.jpg` (portrait, about 1080×1350).
2. Open **`src/data/settings.js`**, find `ABOUT_PHOTO = ''` and change it to `ABOUT_PHOTO = 'images/lavi.jpg'`.
3. Optionally update `ABOUT_PHOTO_ALT` with a short description of the photo.
4. Commit. The placeholder is replaced automatically.

## Switching on the contact form

Until it's switched on, the contact page shows your email and phone with the note "Online form coming soon". It never pretends to send anything.

1. Go to **https://web3forms.com**, enter `bachchis.lavi@gmail.com` and create a free access key (250 messages a month). The key arrives by email.
2. Open **`src/data/settings.js`** and paste the key between the quotes: `export const PUBLIC_WEB3FORMS_KEY = 'your-key-here';`
3. Commit and publish. The form appears on the Contact page. Messages go to your Gmail.
4. Send yourself a test message once it's live.

The key is designed to be public, so it's fine in this repo.

## Adding a custom domain later

1. **Buy the domain** (for example from Cloudflare, Namecheap or Google Domains).
2. On github.com: **Settings → Pages → Custom domain**, type the domain and click **Save**.
3. At your domain provider, add the DNS records GitHub shows you. For a root domain like `lavibachchis.com`, that's four **A** records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, plus a **CNAME** record for `www` pointing to `bachchislavi-777.github.io`.
4. Open **`.github/workflows/deploy.yml`** and change the two lines near the top:
   ```
   SITE_URL: https://lavibachchis.com
   BASE_PATH: /
   ```
5. Create a file **`public/CNAME`** containing just the domain, e.g. `lavibachchis.com`.
6. Update the `Sitemap:` line in **`public/robots.txt`** to `https://lavibachchis.com/sitemap-index.xml`.
7. Once it's working, tick **Enforce HTTPS** in Settings → Pages.

Every link on the site adjusts automatically.

## Things you can ask Claude

Copy and paste any of these:

- "In my portfolio repo, on the `work` branch, change the hero headline to: …"
- "Replace the photo `gsol_hero` in my portfolio with this new image, and make all three sizes."
- "Add my headshot to the About page. Here's the photo."
- "Add a new FAQ question to the Services page: … Answer: …"
- "My GitHub Actions deploy failed with a red cross. Can you find out why and fix it?"
- "Switch on the contact form. My Web3Forms key is …"
- "I've bought the domain lavibachchis.com. Update the site to use it and tell me which DNS records to add."
- "Add cookieless analytics (GoatCounter or Cloudflare Web Analytics) and update the privacy page."
- "Add a real testimonial from [client], who has given permission: …"
- "Merge the `work` branch into `main` so my changes go live."

See **`docs/CHECKLIST.md`** for what to review before launch.

---

## For developers

Static site built with [Astro](https://astro.build) 5, plain CSS and `@astrojs/sitemap`. No client-side rendering of content. Small scripts handle the mobile menu, the brand tabs, copy buttons and the contact form.

```bash
npm install
npm run dev       # http://localhost:4321/lavi-bachchis-portfolio/
npm run build     # outputs to dist/
npm run preview   # serves dist/ locally
```

- **Base path:** `astro.config.mjs` reads `SITE_URL` and `BASE_PATH` from the environment (defaults: `https://bachchislavi-777.github.io`, `/lavi-bachchis-portfolio`). All internal links and assets go through `url()` in `src/lib/url.js`. For a custom domain, build with `BASE_PATH=/`.
- **Content:** `src/data/copy.json` (all page copy and SEO), `src/data/brands.js` (the six sample brands, ported from the approved design `docs/reference/portfolio-v3-forest.html`), `src/data/images.js` (alt text and lead photos), `src/data/settings.js` (form key, about photo).
- **Design:** `src/styles/base.css` is the reference CSS. `src/styles/site.css` holds the multi-page additions. Tile renderers (`T` in the reference) live in `src/lib/tiles.js` and return HTML strings rendered at build time with `set:html`.
- **Pages:** `src/pages/` has index, work/index, work/[id] (6 case studies), services, about, insights, contact, privacy and 404.
- **SEO:** per-page title, description, canonical, OG/Twitter, JSON-LD (`src/lib/schema.js`) and a generated sitemap.
- **Deploy:** `.github/workflows/deploy.yml` builds on push to `main` and deploys to GitHub Pages.
- **Privacy page** (`src/pages/privacy.astro`) is a **starting template**. Lavi should review it before launch.
