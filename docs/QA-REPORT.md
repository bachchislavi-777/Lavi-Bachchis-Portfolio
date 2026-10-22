# QA report

Independent review, 14 October 2026. Done by a separate reviewer who did not build the site.

## What was checked

**Build.** `npm run build` passes and builds 14 pages, plus the sitemap.

**Automated browser checks.** These ran with Playwright against `astro preview` at widths of 1440, 1024, 390 and 360 px. Pages covered: home, /work/, all six case pages, /services/, /about/, /insights/, /contact/, /privacy/ and a missing URL (to test the 404 page). Each check below passes on every page at every width:

- No console errors or JavaScript errors.
- No failed requests and no local request returning 400 or above. Each page was scrolled to the bottom so lazy-loaded images also loaded.
- No broken images.
- No sideways scrolling of the page.
- Exactly one main heading (h1) per page.
- Every image has alt text.
- All 14 internal link targets found on the pages respond with 200. Every in-page `#` anchor has a matching target.
- Titles are 60 characters or fewer, and every page has a meta description.
- The canonical link and `og:image` are full https URLs.
- All JSON-LD structured data parses.

The 404 page correctly returns 404 and is marked `noindex`.

**Extra automated checks:**

- **Text contrast.** Measured against WCAG AA on 9 pages at 1440 px. The mock-up tiles inside case studies were left out, because they show each sample brand's own colours.
- **Carousels and clipped text.** Every sideways-scrolling carousel can be reached with the keyboard and has an accessible label. No visible text is cut off.

**Visual review.** Full-page screenshots, checked as contact sheets:

- At 1440 px: home, /work/, /work/lowtide/, /work/ashbygrant/, /services/, /contact/, /about/, /insights/ and the 404 page.
- At 390 px: home, /work/lowtide/ and /contact/.

The site matches the forest/ivory/terracotta reference design. I found no overlaps, misaligned cards or awkward gaps. Carousels show part of the next slide on purpose, as a cue to swipe.

**Content review.** I read all of copy.json, the rendered case pages and the contact, privacy, services and 404 pages as a prospective client would. Things confirmed:

- Every case page has a visible "Sample brand" disclaimer in its header and a "Sample client brief" credit.
- The footer disclaimer appears on every page.
- The legal (Ashby Grant), tax (Northfield) and Gas Safe (Halden) notes are all present.
- The contact page never pretends a form sends. Unless a Web3Forms key is set, it shows "Online form coming soon".
- The services page makes no promises about results.
- The phone number is shown in international format (+44).

## Issues found and fixed (6)

| # | Category | Issue | Fix |
|---|----------|-------|-----|
| 1 | Accessibility / CSS | On every case page, the "View case study" button in the "Next case study" card had text contrast of 2.82:1. A general `.next-txt span` style was turning the button text sage instead of ivory. | That style now skips the button (`src/styles/site.css`). |
| 2 | Accessibility / CSS | The "Online form coming soon" text on /contact/ had contrast of 4.40:1 (AA needs 4.5:1). | It now uses the full text colour (`site.css`). |
| 3 | Content / trust | Ashby Grant feed tile: a quote from the firm's own Private Client team carried five stars. That reads like a firm reviewing itself, which a legal brand shouldn't be shown doing. | Removed the stars from this tile and relabelled it "Sample post · Private Client team". Quote tiles can now turn stars off with `stars:false` (`src/lib/tiles.js`, `src/data/brands.js`). |
| 4 | Content / repetition | /contact/ said "I reply within one working day… quote within two working days" twice: once in the terracotta band and again, word for word, in the "Online form coming soon" box. | The box now gives a US dialling hint instead ("from the US dial 011 44 0000 000000"). |
| 5 | Content / US clarity | Nothing on /contact/ said which time zone Lavi works in. | Added a line under the reply promise: "Based in London, on UK time (GMT/BST). UK afternoons overlap with US mornings…" (`copy.json` → `contact.hours`). |
| 6 | Content / repetition | /about/ introduced Lavi three times ("Hi, I'm Lavi", "I'm a marketing and brand lead", then the home intro reused word for word in "Why work with me"). The third highlight also said "read my notes on the Insights page" and then added another "Read the notes" link. | "Why work with me" now has its own sentence (`copy.json` → `about.whyText`). The highlight ends with one clear link, "Read my trend notes". |

After these fixes I rebuilt the site and re-ran every automated check. All clean.

## For the owner to decide

- **Contact form.** It stays off until you add a Web3Forms key (see README). Until then, visitors email or phone you.
- **About photo.** The About page still shows the "LB / Photo coming soon" placeholder. A real headshot would add a lot of trust.
- **Low-contrast logo marks.** Two small logo marks fall below the contrast checker's target. Logos are exempt from the contrast rule, so no change is needed:
  - the italic "LB" monogram on the terracotta circle (3.4:1)
  - the coral full stop in the Northfield sample logo
- **Phone number.** It is published on every page. Keep it there only if you are happy to take calls from US time zones.
- **Insights sources.** These are third-party articles. Re-check the links each year so the "2026 trend notes" don't go stale.
- **Northfield tax notes.** The Making Tax Digital thresholds and dates match HMRC guidance as of October 2026. Review them if HMRC changes the rules.
