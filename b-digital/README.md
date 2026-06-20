# B Digital — Web · Ads · Branding

The marketing site for **B Digital**, a Windhoek-based studio that builds
affordable, mobile-friendly websites and runs ads for Namibian businesses.

Built as a **self-contained static site** — no build step, no runtime CDN
dependency. It doubles as a portfolio: the site itself shows the kind of work
B Digital can deliver.

![three.js r160](https://img.shields.io/badge/three.js-r160-b06cff) ![No build step](https://img.shields.io/badge/build-none-14141c)

## Highlights

- **Live 3D hero** — a floating constellation of devices (a phone, two browser
  windows, a logo chip and a stat card), each with a gradient "screen" drawn on
  a canvas texture. The camera orbits the cluster as you scroll and drifts with
  your cursor (Three.js, built from primitives).
- **Modern studio design** — a deep-ink canvas with a warm-to-cool
  coral → violet → azure gradient ("Namibian sunset meets digital"), a bold
  Space Grotesk display, and generous space.
- **WhatsApp-first** — a persistent WhatsApp button, WhatsApp call-to-actions
  throughout, and a contact form that composes a tidy WhatsApp message (no
  backend needed). Number: **+264 81 479 4693**.
- **Conversion-focused content** — services, honest pricing from **N$1,500**,
  a process walkthrough, an FAQ that answers real objections, and a portfolio of
  website concepts rendered entirely in CSS (no external images).
- **Built to be found** — semantic HTML, meta/Open Graph tags, and
  `ProfessionalService` structured data (JSON-LD) so B Digital itself ranks.
- **Resilient & accessible** — graceful fallbacks if any library, font or image
  fails to load; full `prefers-reduced-motion` support; responsive layout with a
  mobile menu and a native, keyboard-friendly FAQ accordion.

## Run it locally

ES modules need to be served over HTTP (not opened as a `file://` path):

```bash
cd b-digital
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `live-server`, etc.).

## Deploy

Drop the `b-digital/` folder on any static host — Netlify, Vercel, Cloudflare
Pages, GitHub Pages, S3. There is nothing to build. A GitHub Pages workflow is
included at `.github/workflows/deploy-b-digital.yml`.

## Structure

```
b-digital/
├── index.html              # all content (static — good for SEO + resilience)
├── css/styles.css          # design system + every component
├── js/
│   ├── main.js             # interactions (loader, scroll, reveals, cursor, form → WhatsApp)
│   └── scene.js            # Three.js floating-devices scene + scroll-driven camera
└── vendor/                 # vendored libraries (three, gsap, lenis) — no CDN
```

## Make it yours

Everything is plain HTML/CSS — easy to edit:

- **Prices** — edit the numbers in `.plan__price` inside `index.html`
  (look for the `EDIT PRICES HERE` comment). The Starter is fixed at N$1,500;
  the One-Page and Business prices are sensible starting points — change them to
  suit your costs.
- **Work / portfolio** — the `.mock` cards in `index.html` are CSS website
  previews. Swap the business name, tagline and `.mock--*` colour theme, or
  replace a card with a real screenshot when you launch a client site.
- **WhatsApp number** — it appears in the links in `index.html` (as
  `wa.me/264814794693`) and once in `js/main.js` (the `WHATSAPP` constant).
- **Copy** — all text lives in `index.html`.
- **Palette / type** — change the CSS variables at the top of `css/styles.css`
  (`--coral`, `--violet`, `--azure`, `--grad`, `--font-display`, …).

## Notes

- Fonts load from Google Fonts, with system-font fallbacks if blocked.
- Two photos in the "difference" section load from Unsplash and degrade to a
  tasteful gradient if unavailable; everything else is self-contained.
- The contact form opens WhatsApp with the visitor's details pre-filled — your
  main channel in Namibia — so there's no server or database to run.
