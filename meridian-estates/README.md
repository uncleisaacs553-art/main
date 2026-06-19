# Meridian — Architectural Residences

An immersive, interactive marketing site for a (fictional) luxury real-estate
agency. Built as a **self-contained static site** — no build step, no runtime
CDN dependency.

![Meridian](https://img.shields.io/badge/three.js-r160-c9a86a) ![No build step](https://img.shields.io/badge/build-none-1a1a1d)

## Highlights

- **Live 3D hero** — a modernist villa rendered as an architectural scale-model
  under studio lighting (Three.js), built entirely from primitives. The camera
  orbits the model as you scroll and drifts gently with your cursor.
- **Editorial-luxury design** — warm-neutral + champagne-brass palette, a
  high-contrast Cormorant Garamond / Inter type pairing, and generous space.
- **Deliberate motion** — Lenis smooth scroll, GSAP scroll-reveals, animated
  stat counters, a locations marquee, magnetic buttons, card 3D-tilt, and a
  custom cursor (desktop only).
- **Resilient & accessible** — graceful fallbacks if any library or image fails
  to load, full `prefers-reduced-motion` support, and a responsive layout with a
  mobile menu.

## Run it locally

ES modules need to be served over HTTP (not opened as a `file://` path):

```bash
cd meridian-estates
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `live-server`, etc.).

## Deploy

Drop the `meridian-estates/` folder on any static host — Netlify, Vercel,
Cloudflare Pages, GitHub Pages, S3. There is nothing to build.

## Structure

```
meridian-estates/
├── index.html              # markup + import map
├── css/styles.css          # design system + all styling
├── js/
│   ├── main.js             # interactions (loader, scroll, reveals, cursor…)
│   ├── scene.js            # Three.js villa scene + scroll-driven camera
│   └── data.js             # residence listings + card rendering
└── vendor/                 # vendored libraries (three, gsap, lenis) — no CDN
```

## Customize

- **Listings** — edit the `residences` array in `js/data.js`.
- **Palette / type** — change the CSS variables at the top of `css/styles.css`
  (`--brass`, `--bg`, `--font-display`, …).
- **The 3D model** — the villa is assembled in `js/scene.js`; adjust the `box()`
  calls, materials, and the camera keyframes in the render loop.
- **Copy** — all text lives in `index.html`.

## Notes

- Fonts load from Google Fonts (with system-serif/sans fallbacks if blocked).
- Property imagery is loaded from Unsplash and degrades to a tasteful gradient
  if an image is unavailable.
- "Meridian Estates" is a fictional brand for demonstration only.
