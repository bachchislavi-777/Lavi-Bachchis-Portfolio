# Research notes: Lavi Bachchis portfolio site

Researched 14 Oct 2026. Pricing and terms change, so re-check the linked pages before launch.

---

## 1. Free hosting: GitHub Pages vs Cloudflare Pages vs Netlify

| | GitHub Pages | Cloudflare Pages | Netlify Free |
|---|---|---|---|
| Bandwidth | Soft limit of 100 GB/month | Unlimited, with unlimited static requests | Credits-based: 300 credits/month, hard cap. 1 GB costs 20 credits, so about 15 GB if nothing else is used |
| Builds | Soft limit of 10/hour, which **does not apply** when you deploy with a custom GitHub Actions workflow | 500/month, one at a time, 20-minute timeout | Each production deploy costs 15 credits, so about 20 deploys/month (fewer once bandwidth is counted) |
| Site size | 1 GB published | 20,000 files, 25 MiB per file | Not a practical concern |
| Custom domain + free HTTPS | Yes, with a free certificate and an "Enforce HTTPS" switch | Yes (up to 100 per project), and SSL works with no setup | Yes |
| Private repo | **No** on the Free plan. The repo must be public | Yes | Yes |
| Branch previews | No (only one live version) | Yes, unlimited preview deploys per branch | Yes, and they aren't metered |
| Commercial use | Not meant for an online business or e-commerce site whose main job is commercial transactions or SaaS. A portfolio with no checkout is generally fine | Allowed | Allowed |
| Built-in forms | None | None | Netlify Forms. Submissions became free and unlimited in April 2026 |

**Recommendation: go ahead with GitHub Pages via GitHub Actions.** There are no blockers, but the team should keep three points in mind:
- **Commercial terms:** a portfolio or marketing site that sells services through a contact form is fine, because it has no checkout or payment handling. **Don't take payments on the site** (no Stripe checkout, no shop). Send clients to invoices or a hosted payment link instead.
- **The repo must be public** on the Free plan, so anyone can read draft text on the work branch, the git history, and her email address in the config. Keep private notes, pricing experiments and client details out of the repo.
- **Base path:** until the custom domain is bought, a project repo is served at `username.github.io/repo-name/`. Astro needs `site` and `base` set for that, and `base` is removed once the domain is live. Follow the [Astro GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/).

**Fallback:** Cloudflare Pages is the best alternative if a private repo or branch preview links (to review drafts before they go live) become important. It is also a smooth move later, because the domain would likely be bought or managed through Cloudflare anyway. **Avoid Netlify Free:** its hard credit cap of about 20 deploys a month is easy to hit while making frequent small text edits.

Sources: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https) · [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits) · [Cloudflare Pages plans](https://pages.cloudflare.com/) · [Netlify credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) · [Netlify April 2026 pricing update](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)

---

## 2. Free contact-form options

| Service | Free tier | Notes |
|---|---|---|
| **Web3Forms** | 250 submissions/month, unlimited forms and domains | No backend needed: an access key goes in a hidden field. Includes spam filtering and hCaptcha. Sends to one recipient email. When the limit is reached, submissions stop until the next month (with warnings at 90% and 100%). No file uploads |
| Formspree | 50 submissions/month | Basic spam filter plus reCAPTCHA. 30-day archive. No file uploads, autoresponder or custom thank-you redirect. Formspree itself calls the free tier "for testing" |
| Netlify Forms | Unlimited (since April 2026) | Only works if the site is hosted on Netlify, so it doesn't apply here |

**Recommendation: Web3Forms.** It gives five times Formspree's free volume, works on GitHub Pages, and needs nothing more than a plain HTML form. It can be added later without changing anything else: until then, the contact section can use a `mailto:` link plus a short "what to include in your message" checklist. Add a honeypot field and a clear "Thanks, I reply within 1 working day" message.

Sources: [Web3Forms pricing](https://web3forms.com/pricing) · [Formspree plans](https://formspree.io/plans)

---

## 3. Recommended sitemap and page contents

**Examples reviewed:**
- [K.J. Brett](https://kjbrett.com/): a tight one-pager with three samples, three testimonials and three awards. Good proof that less is more.
- [Bigmouth Copy](https://bigmouthcopy.com/): the visual style itself signals the niche and tone.
- [Alex George](https://www.itsalexgeorge.com/): case studies list client, dates and duties, with post screenshots.
- [Monique Bonds](https://www.moniquebonds.com/): a client-logo page and full-width galleries with each sample tagged by skill.
- [Michelle M. Gossett](https://www.michellemariam.com/): results-led case studies plus certifications.
- [Summer Zhou](https://summerzhoupr.wixsite.com/my-site-1): the complete basic set of bio, services, samples and contact form.

**Common patterns:** a one-line positioning statement, proof straight after it, case studies rather than bare screenshots, services explained in plain language, and contact reachable from every screen ([Wix roundup](https://www.wix.com/blog/social-media-portfolio), [Authory copywriter examples](https://authory.com/blog/10-copywriting-portfolio-examples-to-inspire-you-attract-more-clients)).

**Proposed sitemap:**
1. **Home (`/`)**
   - Headline: who she helps and with what (content for product brands and service businesses in the UK and US).
   - Two audience paths: product brands and service businesses.
   - 3 featured case study cards, a short summary of services and packages, a "how it works" strip, and the main CTA ("Book a free 20-minute call" or "Get a quote").
2. **Work (`/work/`)**
   - A filterable grid of the 6 sample brands, tagged *Product* or *Service* and by format (posts, carousels, Reel covers, newsletter, blog, brand kit).
3. **Case study pages (`/work/solenne-skincare/`, etc.)**, all with the same structure:
   - Brand and sector, with a clear **"Sample brand / concept project"** label.
   - The brief, or the problem a real client would have.
   - Deliverables and platforms.
   - Approach, covering tone, grid and type choices.
   - A gallery: carousel frames, newsletter screenshot, blog layout.
   - What the client would receive (formats, sizes, turnaround).
   - A CTA: "Want this for your brand?"
   - **No invented metrics:** the brands are fictional, so the page should state the deliverables, not results.
4. **Services (`/services/`)**
   - One block per service: social posts, carousels and Reel covers, Mailchimp newsletters, WordPress blogs, brand kits.
   - Each block covers what's included, who it suits, and typical turnaround.
5. **Packages and pricing (`/packages/`)**
   - The 3 packages with "from" prices in £ and $.
   - What's included, revision rounds, and delivery timeline.
   - A "not included" list.
   - **A plain guarantee statement:** "I guarantee quality and on-time delivery, not follower, lead or sales numbers." This builds trust and sets expectations.
   - Can be merged into Services if there's little content.
6. **Process (`/process/`)** or a section on Services
   - Discovery call, brief, first draft, revisions, delivery and scheduling.
   - What she needs from the client, and the time zones she covers for UK and US clients.
7. **About (`/about/`)**
   - Headshot, her marketing and brand background, London base, the tools she uses (Canva, Mailchimp, WordPress, etc.), and a personal note.
8. **Trends and insights (`/insights/`)**, optional and later
   - Her current trends section can grow into a blog, which helps with SEO.
9. **FAQ** (a page or a section on Packages)
   - Turnaround, revisions, who writes the captions, posting/scheduling, US clients and time zones, payment terms, file ownership, what happens if results don't come.
10. **Contact (`/contact/`)**
    - Form or email, the reply-time promise, and a "what to tell me" checklist.
    - Links to LinkedIn and Instagram.
11. **Utility pages:** Privacy (`/privacy/`), a custom 404 page, and Thank you (`/thanks/`) for the form redirect.

**Testimonials policy:** **don't publish any testimonials** until real clients provide them, and **never attribute quotes to the sample brands.** Until then, use honest trust signals:
- "Sample brands created to show range" on Work.
- Her credentials and experience on About.
- A clear process and guarantee.
- Optionally, a LinkedIn recommendation from a real colleague, quoted with their permission.

The site also needs a "Testimonials" slot in the data files that is hidden while empty.

---

## 4. SEO

**Target keywords by page** (a mix of UK and US phrasing; check volumes in Google Keyword Planner or Search Console once the site is live):

| Page | Phrases |
|---|---|
| Home | freelance social media content creator London · freelance content creator for small businesses UK · social media content designer for small businesses (US) · freelance brand content specialist |
| Services | Instagram carousel design service · Reel cover design · social media post design packages · WordPress blog writing service for small businesses · brand kit design for small businesses |
| Services / newsletter section | Mailchimp newsletter design freelancer · email newsletter design for small business |
| Work, product case studies | social media content for skincare brands · Instagram content for coffee shops · content for e-commerce and homeware brands |
| Work, service case studies | LinkedIn carousel design for law firms · social media content for accountants · social media for plumbers / trades UK |
| Packages | monthly social media content package UK · social media content packages pricing |
| About / Contact | freelance content creator London · hire a freelance social media designer |

**Titles and meta descriptions:**
- Titles should be about 50 to 60 characters, with the keyword first and her name last. For example: *"Mailchimp Newsletter Design for Small Brands | Lavi Bachchis"*.
- Every page needs a unique title.
- Meta descriptions should be about 140 to 155 characters, state a benefit, include a call to action, and mention UK and US clients. Avoid promising results.
- Use one H1 per page that matches the title's intent.
- URLs should be short, lowercase and hyphenated.

**Schema.org (JSON-LD):**
- **Home:** `ProfessionalService` (or `Organization`), with `founder` set to a `Person`, `areaServed` set to United Kingdom and United States, `address` set to London (locality only), and `sameAs` listing LinkedIn and Instagram.
- **About:** `Person`, with `jobTitle`, `knowsAbout` and `sameAs`.
- **Services and Packages:** `Service` with `provider` and `offers` (price ranges).
- **Case studies:** `CreativeWork` with `creator` set to her `Person`. Describe them honestly as concept work.
- **FAQ:** `FAQPage` is still valid markup but no longer gives rich results for most sites, so it's optional.
- **All pages:** `WebSite` and `BreadcrumbList`.
- Don't add `Review` or `AggregateRating` markup without real reviews.

**Local SEO (London):**
- Put "London" in the home title or H1 and in the About copy.
- Create a **Google Business Profile as a service-area business** with the home address hidden and service areas set (London plus "UK-wide"). Link it to the site.
- Keep her name, location and contact details identical across the site, LinkedIn and directories.
- For US reach, rely on the service-page content and "working with US clients" copy (time zones, USD pricing), not on location pages.

Sources: [schema.org ProfessionalService](https://schema.org/ProfessionalService) · [Google structured data gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) · [Google Business Profile service-area guidelines](https://support.google.com/business/answer/9157481)

---

## 5. Technical must-haves

- **Performance**
  - Use Astro's `<Image>`/`<Picture>` to output **AVIF and WebP with a JPEG fallback**, plus `srcset` widths of about 400, 800, 1200 and 1600 px.
  - Lazy-load images below the fold and always set `width`/`height` so the layout doesn't shift.
  - Aim for hero images under about 200 KB and gallery thumbnails under about 80 KB.
  - Self-host one or two font families as WOFF2, with `font-display: swap`.
  - Add no JavaScript unless needed. Target a Lighthouse score of 90+ on mobile.
- **Accessibility (WCAG 2.2 AA)**
  - Colour contrast of at least 4.5:1, especially on the forest-green palette.
  - Meaningful alt text on every sample image (describe the design, not "image1").
  - Visible focus styles, keyboard-usable filters and menus, and a skip link.
  - Form fields need labels. Respect `prefers-reduced-motion`. Use semantic headings.
- **Social sharing**
  - `og:title`, `og:description`, `og:image` (1200×630), `og:url` and `twitter:card=summary_large_image` on every page.
  - Each case study gets its own OG image. Add a canonical URL to every page.
- **sitemap.xml:** generate it with `@astrojs/sitemap` (it needs `site` set). After the domain is bought, submit it in Google Search Console and Bing Webmaster Tools.
- **robots.txt:** allow everything and point to the sitemap. Add `noindex` to the thanks and 404 pages.
- **Favicon set:** `favicon.svg`, `favicon.ico` (32 px), `apple-touch-icon.png` (180 px), and `site.webmanifest` with 192 and 512 px icons.
- **404 page:** an on-brand `404.html` with links to Work and Contact. GitHub Pages serves it automatically.
- **Analytics** (free and privacy-friendly):
  - **Cloudflare Web Analytics** is free, uses no cookies or localStorage, and doesn't fingerprint visitors. It works as a script beacon even if the site isn't on Cloudflare.
  - **GoatCounter** is free for reasonable use, including small businesses, and has no cookies.
  - Either is fine. Pick Cloudflare if the domain will live there.
  - Avoid GA4 unless it's needed, because it brings a consent banner.
- **UK cookie banner:** if the only non-essential tech is cookieless analytics and the Web3Forms form, **no consent banner is needed.**
  - The Data (Use and Access) Act 2025 and the ICO guidance updated in May 2026 add an exception for analytics used only for statistics. It still requires clear information and a simple way to object.
  - So: add a short **Privacy page** that names the analytics tool and the form processor, explains what is collected, and gives an opt-out route.
  - Adding Google Analytics, a Meta Pixel or embedded YouTube/Instagram feeds later would bring the banner question back.

Sources: [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) · [GoatCounter](https://goatcounter.com/) · [ICO updated storage and access guidance (Brodies summary)](https://brodies.com/insights/ip-technology-and-data/storage-and-access-technologies-ico-publishes-updated-guidance-on-the-use-of-cookies-and-other-tracking-technologies/) · [Astro images](https://docs.astro.build/en/guides/images/) · [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)

---

## 6. How updates work (plain English)

- **The `main` branch is the live site.** Whenever something changes on `main`, GitHub automatically rebuilds the site and publishes it within about one to two minutes. You can watch it in the repo's **Actions** tab: a green tick means it's live, and a red cross means something broke, so the old version stays up.
- **The work branch holds drafts.** Changes saved there are **not** live. When a draft is ready, open a **pull request** (a "please publish these changes" request) from the work branch into `main` and merge it. That publishes it.
- **Editing text yourself, no coding needed:**
  1. All wording, prices, package details and case study text live in simple content files, such as `src/content/site.json` or one Markdown (`.md`) file per case study.
  2. On github.com, open the file, click the **pencil icon**, edit the words, and click **Commit changes**.
  3. Choose the work branch for drafts, or `main` to publish straight away.
  4. In JSON files, only change the text **inside quotes**, and keep the commas and brackets as they are. The build will fail safely if something is mistyped, and the live site won't change.
- **Images:** go to the right `images` folder and choose *Add file → Upload files*. Keep the same file name to replace an image, or use a new name and update it in the content file.
- **Undo:** every change is saved in history, so any earlier version can be restored.
- **Important:** the repo is public, so never put private client information in it.

Source: [Editing files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files)
