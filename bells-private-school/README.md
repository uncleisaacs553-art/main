# Bells Private School — "We Ring the Best Results"

An immersive, interactive redesign of the marketing site for **Bells Private
School**, an accredited NSSCO Grade 11 tutorial centre in Khomasdal, Windhoek,
Namibia. Built as a **self-contained static site** — no build step, no runtime
CDN dependency.

![three.js](https://img.shields.io/badge/three.js-r160-e7b24c) ![No build step](https://img.shields.io/badge/build-none-0b0f17)

## Highlights

- **Live 3D hero** — a polished brass bell, hung from a timber yoke and lit like
  a studio object, that gently *rings* (a pendulum swing with a lagging clapper)
  while concentric "sound" rings pulse outward. The camera orbits the bell as
  you scroll and drifts with your cursor. Built entirely from Three.js
  primitives (a lathed bell silhouette, tori, cylinders).
- **Scholarly-immersive design** — a midnight-navy + gold-bell palette, a warm
  Fraunces / Inter type pairing, and generous space.
- **Deliberate motion** — Lenis smooth scroll, GSAP scroll-reveals, animated
  stat counters (75% pass rate, 14+ subjects…), a subjects marquee, magnetic
  buttons, card 3D-tilt, and a custom cursor (desktop only).
- **Real content** — the school's actual programmes, subjects, accreditation
  (DNEA / NSSCO), and contact details (phone, email, Dodge Street campus,
  office hours).
- **Resilient & accessible** — graceful fallbacks if any library or image fails
  to load, full `prefers-reduced-motion` support (the bell holds still), and a
  responsive layout with a mobile menu.

## Run it locally

ES modules need to be served over HTTP (not opened as a `file://` path):

```bash
cd bells-private-school
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `live-server`, etc.).

## Deploy

Drop the `bells-private-school/` folder on any static host — Netlify, Vercel,
Cloudflare Pages, GitHub Pages, S3. There is nothing to build.

## Structure

```
bells-private-school/
├── index.html              # markup + import map
├── css/styles.css          # design system + all styling
├── js/
│   ├── main.js             # interactions (loader, scroll, reveals, cursor…)
│   ├── scene.js            # Three.js brass-bell scene + scroll-driven camera
│   └── data.js             # programme listings + card rendering
└── vendor/                 # vendored libraries (three, gsap, lenis) — no CDN
```

## Customize

- **Programmes** — edit the `programmes` array in `js/data.js`.
- **Palette / type** — change the CSS variables at the top of `css/styles.css`
  (`--gold`, `--bg`, `--font-display`, …).
- **The 3D bell** — the bell is assembled in `js/scene.js`; adjust the `profile`
  points (the lathed silhouette), the swing in the render loop, and the
  lighting.
- **Copy & contact details** — all text lives in `index.html`.

## Notes

- Fonts load from Google Fonts (with system-serif/sans fallbacks if blocked).
- Imagery is loaded from Unsplash and degrades to a tasteful gradient if an
  image is unavailable.
- Built as a design showcase from the school's public information; replace the
  placeholder testimonials and social links with the school's own before going
  live.
