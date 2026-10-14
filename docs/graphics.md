# Graphics & image assets

Everything lives in `public/` and is served from the site root (prefix with the Astro `base` path on GitHub Pages).
The source photos are in `docs/reference/images/`. They are 1080×1350 (4:5), already colour-graded, and were not modified.

## Brand / meta assets

| File | Size | Dimensions | Purpose |
|---|---|---|---|
| `favicon.svg` | 0.4 KB | vector, 64 viewBox | Main favicon. "LB" monogram in Playfair Display italic 600 (falls back to Georgia italic), ivory `#F4ECDF` on a terracotta `#C8623B` circle. `<link rel="icon" href="favicon.svg" type="image/svg+xml">` |
| `favicon-32.png` | 2.1 KB | 32×32, transparent | PNG favicon fallback. `<link rel="icon" href="favicon-32.png" sizes="32x32">` |
| `apple-touch-icon.png` | 6.5 KB | 180×180, opaque square | iOS home-screen icon. It is a full-bleed terracotta square because iOS rounds the corners itself. `<link rel="apple-touch-icon" href="apple-touch-icon.png">` |
| `icon-512.png` | 43 KB | 512×512, transparent circle | PWA / manifest icon |
| `og-image.jpg` | 81 KB | 1200×630 | Social share card (`og:image`, `twitter:image` with `summary_large_image`). It has a forest background with a terracotta glow, the name, the "Content & creative" line and the services line, plus a collage of gsol_hero, glow_latte and gloom_stack. |
| `site.webmanifest` | 0.6 KB | JSON | Web app manifest. theme/background `#163A2E`. `<link rel="manifest" href="site.webmanifest">` |
| `robots.txt` | 0.2 KB | text | Allows all crawlers. The Sitemap line uses the placeholder GitHub Pages URL; **update it when the custom domain is added.** |

Suggested `<head>` extras: `<meta name="theme-color" content="#163A2E">`, `og:image:width` 1200, `og:image:height` 630, `og:image:alt` "Lavi Bachchis, content & creative: portfolio card with three product photos".

## Photos (`public/images/`)

There are three files per photo, and every base name is unchanged from the source:

| Variant | Dimensions | Format | Use |
|---|---|---|---|
| `<name>-1080.webp` | 1080×1350 | WebP q78 | `srcset` 1080w (large / retina) |
| `<name>-540.webp` | 540×675 | WebP q78 | `srcset` 540w (grids, mobile) |
| `<name>.jpg` | 1080×1350 | progressive JPEG q78 | `<img src>` fallback |

Totals: 1080 WebP 2.4 MB, 540 WebP 0.8 MB, JPEG fallback 3.9 MB. **`public/images` is 7.0 MB in all (69 files).**

Example:

```html
<picture>
  <source type="image/webp" srcset="images/glow_bag-540.webp 540w, images/glow_bag-1080.webp 1080w" sizes="(min-width: 900px) 33vw, 100vw">
  <img src="images/glow_bag.jpg" width="1080" height="1350" loading="lazy" decoding="async" alt="…">
</picture>
```

## Alt text

| Photo | Alt text |
|---|---|
| ash1 | A hand holding up a set of keys with a bright green key and a small house-shaped keyring, against a soft green background. |
| ash2 | Smiling young woman with long hair in a grey blazer, sitting by a window with city buildings behind her, in warm amber light. |
| ash3 | Portrait of a man in glasses, a dark blazer and an open-collared white shirt, standing in a bright modern office. |
| ash4 | Antique wooden bureau with shelves of leather-bound books above an open writing desk scattered with old papers and documents. |
| ghal_boiler | White combi boiler mounted on a kitchen wall with copper pipework, beside a window, with potted herbs on a wooden worktop. |
| gloom_mill | Close-up of a wooden handloom weaving striped fabric in navy, mustard and cream, with spools of yarn in the background. |
| gloom_sofa | Sunlit living room with a cream sofa, a mustard knitted throw, green cushions, a round wooden side table and an olive tree. |
| gloom_stack | Three folded woven throws in olive, mustard and navy stacked on a wooden bench beside a vase of olive branches. |
| glow_bag | Bright orange coffee pouch standing on a teal background with roasted coffee beans scattered around its base. |
| glow_latte | Latte with leaf latte art in a white cup on a wooden table by a window overlooking a rocky coastline and the sea. |
| glow_pour | Pour-over coffee being brewed: a gooseneck kettle pouring into a ceramic dripper above a glass carafe, with the sea in the background. |
| gsol_face | Woman with dewy skin and dark wavy hair gently touching her cheeks with her fingertips, smiling with her eyes closed, in soft warm light. |
| gsol_flat | Flat lay of an amber glass dropper bottle and an open jar of cream on blush linen, surrounded by sprigs of sage. |
| gsol_hero | Amber glass serum bottle with a dropper on a pink stone surface, with a stone bowl and olive leaves in soft sunlight. |
| hal1 | Plumber in a red shirt fitting pipework under a sink, lit by a vivid blue light inside the cabinet. |
| hal2 | Plain white panel radiator mounted on a raw grey concrete wall. |
| hal3 | Close-up of a dark green column radiator with ribbed fins against a dark background. |
| loom4 | A pile of yarn cones and spools in earthy browns, greys and cream, with one bright red-orange cone in front. |
| low4 | Close-up of espresso pouring from a chrome portafilter in a rich caramel stream. |
| nor1 | Woman with glasses working on a laptop at a desk in a minimal, bright white room, seen through a doorway. |
| nor2 | Overhead view of hands with silver bracelets typing on a laptop at a wooden table, next to an open notebook and pen. |
| nor3 | Smiling woman with short curly hair in a striped cardigan and black top, standing in a modern office with glass walls. |
| sol4 | Woman in a white bathrobe and headband, eyes closed, spraying a facial mist, reflected in a round gold-framed bathroom mirror. |

## Fonts used for rendering

The google/fonts GitHub raw URLs returned 403 (blocked). The same OFL fonts were therefore taken from the Fontsource npm packages (`@fontsource/playfair-display`, `@fontsource/hanken-grotesk`, `@fontsource/dm-mono` 5.3.0, latin subsets) and converted from WOFF to TTF for PIL. The PNG icons and the OG card use real Playfair Display 600 and 600 italic and DM Mono 500. The SVG favicon uses live text, so browsers without Playfair installed show Georgia italic. That is expected and still looks right.
