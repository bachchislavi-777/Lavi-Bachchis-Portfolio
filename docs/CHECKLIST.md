# Launch checklist

Tick these off before you share the site widely.

## 1. Confirm the business terms in the FAQ (Services page)

These are **proposed defaults**. Change them in `src/data/copy.json` (under `services` → `faq`) if they're not right for you.

- [ ] **Revisions:** two rounds of changes per piece.
- [ ] **Notice period:** rolling monthly after the first month, 30 days' notice.
- [ ] **Quote timing:** a fixed monthly quote within **two working days** of the call (also on the Contact page under `contact` → `promise`).
- [ ] **Reply time:** within one working day.
- [ ] **Start time:** usually within about two weeks of the first call.
- [ ] **File ownership:** the client owns files once each month's invoice is paid, and templates are built in the client's own Canva.
- [ ] **Package contents:** check the quantities in the three packages.

## 2. Privacy page

- [ ] Read `/privacy/`. It's a plain-English **starting template**. Check it describes what you actually do: how long you keep emails, which tools you use and who processes data.
- [ ] If you add analytics, name the tool on the privacy page.

## 3. Your photo

- [ ] Add a headshot to the About page. See "Adding your own photo" in the README. Until then, a tasteful "Photo coming soon" card shows.

## 4. Contact form

- [ ] Get a free Web3Forms key and paste it into `src/data/settings.js`.
- [ ] Send yourself a test message from the live site and check it arrives in Gmail (and not in spam).
- [ ] Until then, the page shows your email and phone. That's fine for launch.

## 5. Content checks

- [ ] Re-read the case studies. The brands and people are samples, and the site says so on every case page and in the footer.
- [ ] Re-check the tax and legal tiles (Northfield, Ashby Grant) against HMRC and current law, ideally every April.
- [ ] Don't add testimonials unless they're real and you have permission. Never attribute quotes to the sample brands.
- [ ] Check the photo credits line in the footer is still accurate if you swap photos.

## 6. Optional

- [ ] **Analytics:** a cookieless tool (GoatCounter or Cloudflare Web Analytics) means no cookie banner is needed. Ask Claude to add it.
- [ ] **Custom domain:** buy it, then follow "Adding a custom domain later" in the README. Remember `public/CNAME` and the `robots.txt` sitemap line.
- [ ] **Search engines:** once the final address is live, submit `sitemap-index.xml` in Google Search Console and Bing Webmaster Tools.
- [ ] **Google Business Profile:** set it up as a service-area business (London plus UK-wide) with your home address hidden, and link it to the site.
- [ ] **Instagram:** if you have a business Instagram, add it to the footer, the contact page and the `sameAs` list in `src/lib/schema.js`.
