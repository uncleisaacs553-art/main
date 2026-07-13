# Etosha & Co. — Fine Dining, Windhoek

Single-file immersive restaurant site (`index.html`, zero dependencies, no build step).
Open it in any browser or drop it on any static host.

## Why it stays smooth on low-end machines

- **Adaptive performance tiers** — a tiny inline script grades the device
  (`deviceMemory`, cores, reduced-motion, Save-Data) before first paint and sets
  `data-tier="high|mid|low"` on `<html>`. Atmosphere (film grain, dust motes,
  parallax, custom cursor, backdrop blur) exists only at `high`; `low` renders an
  instant, motion-free page. A frame-time watchdog demotes the tier live if real
  frames come in slow, and remembers the verdict for the session.
- **Compositor-only motion** — every animation and transition touches `transform`
  or `opacity` only. No animated layout properties, shadows or filters.
- **Scroll work off the main thread** — the progress bar and hero parallax use CSS
  scroll-driven animations (`animation-timeline: scroll()/view()`) where supported;
  the JS fallback is one passive, rAF-throttled listener that reads `scrollY` only
  (all offsets cached — zero layout reads in the scroll path).
- **Rendering firewall** — below-fold sections use `content-visibility: auto` with
  intrinsic-size placeholders, so offscreen content costs ~nothing to lay out/paint.
- **IntersectionObserver everywhere** — reveals (one-shot, then unobserved), nav
  active-link highlighting, stat counters, and pausing the marquee/motes/testimonial
  rotator whenever they're offscreen or the tab is backgrounded.
- **Image discipline** — hero preloaded with responsive `imagesrcset`; everything
  else `loading="lazy" decoding="async"` with explicit dimensions/aspect-ratios
  (no CLS) and Unsplash `auto=format` (AVIF/WebP).
- **Lean DOM** (~700 nodes) and delegated event handlers; the cursor's rAF loop
  stops entirely when the pointer is idle.

## Accessibility

Skip link, semantic landmarks, keyboard-flippable menu cards, focus-managed
lightbox (arrows/ESC, focus restore), `aria-live` form errors and toasts,
`prefers-reduced-motion` respected, no-JS fallback (content never hidden).

Fonts: Playfair Display · Cormorant Garamond · Inter (Google Fonts).
Imagery: Unsplash.
