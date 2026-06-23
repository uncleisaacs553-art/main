# Bells Private School — website

A clean, professional marketing site for **Bells Private School**, an accredited
NSSCO Grade 11 tutorial centre in Khomasdal, Windhoek, Namibia. Built as a
**self-contained static site** — no build step, no dependencies, no CDN
libraries.

## Highlights

- **Light, conventional design** — navy + gold on a warm white/cream palette, a
  Fraunces / Inter type pairing, and a standard school-website layout (utility
  bar, sticky header, banner hero, alternating sections).
- **Real content** — the school's actual mission and values, programmes,
  subjects, accreditation (DNEA / NSSCO), testimonials, an embedded campus map,
  and contact details (phone, email, Dodge Street address, office hours).
- **Minimal, tasteful motion** — subtle scroll fade-ins via `IntersectionObserver`
  only. No custom cursor, no heavy animation; a normal browser cursor throughout.
- **Accessible & responsive** — semantic markup, full `prefers-reduced-motion`
  support, a mobile menu, and graceful image fallbacks.

## Run it locally

```bash
cd bells-private-school
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works, or you can open `index.html` directly.

## Deploy

Drop the `bells-private-school/` folder on any static host — Netlify, Vercel,
Cloudflare Pages, GitHub Pages, S3. There is nothing to build. This repo
includes a GitHub Pages workflow (`.github/workflows/deploy-bells.yml`) that
publishes the folder automatically.

## Structure

```
bells-private-school/
├── index.html        # all markup
├── css/styles.css    # design system + all styling (light theme)
└── js/
    ├── main.js       # mobile nav, scroll reveals, contact form
    └── data.js       # programme listings + card rendering
```

## Customize

- **Programmes** — edit the `programmes` array in `js/data.js`.
- **Colours / type** — change the CSS variables at the top of `css/styles.css`
  (`--navy`, `--gold`, `--bg-alt`, `--font-display`, …).
- **Copy & contact details** — all text lives in `index.html`.

## Notes

- Fonts load from Google Fonts (with system fallbacks if blocked).
- Section imagery is loaded from Unsplash and degrades to a navy/gold gradient
  if an image is unavailable.
- Built as a design showcase from the school's public information; replace the
  placeholder testimonials and social links with the school's own before going
  live.
