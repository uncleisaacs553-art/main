# B Digital — Ads Explainer

A **vertical 1080×1920, 15-second animated explainer ad** for B Digital — a
digital-services company in Windhoek, Namibia (websites, social media &
Facebook ads). Built as a **self-contained static page** — no build step, no
framework, no runtime CDN for logic.

Recreated from a [Claude Design](https://claude.ai/design) handoff
(`B Digital Ads Explainer.dc.html` → `ads-video.jsx`, a React prototype) as a
dependency-free vanilla-JS build that reproduces the design frame-for-frame.

## What's in the ad

A self-running timeline of four scenes, with a top progress bar and a
preview scrubber underneath:

| Time        | Scene     | Content |
|-------------|-----------|---------|
| 0.0–4.0s    | Hook      | Logo, “Digital services · Windhoek”, **Get your business online.** |
| 4.0–9.5s    | Services  | Three cards — websites, social media, managed Facebook ads |
| 9.5–12.3s   | Pricing   | Orange panel — **From N$1,500** / month, ads management |
| 12.3–15.0s  | CTA       | Pulsing logo, “Let’s grow it together.”, the contact pill |

Type pairing is **Space Grotesk** + **JetBrains Mono** (Google Fonts); the
accent is the B Digital orange `oklch(0.70 0.17 52)`.

## Run it locally

It's a static page, but a server avoids any `file://` quirks:

```bash
cd bdigital-ads
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `live-server`, …). The page auto-scales
the 1080×1920 canvas to fit your viewport.

## Controls

- **Space** — play / pause
- **← / →** — seek 0.1s (hold **Shift** for 1s)
- **0** or **Home** — restart
- Click or drag the scrubber to seek; the playhead is remembered between reloads.

## Customize

These mirror the original component props and can be set via URL query, or
changed as the defaults in `app.js`:

- `?accent=<css-color>` — accent colour (default `oklch(0.70 0.17 52)`)
- `?cta=<text>` — the contact text in the final scene (default `bdigital-na.lovable.app`)

Example: `index.html?accent=%23e8612d&cta=bdigital.com.na`

Copy, durations, colours and layout all live at the top of `app.js` (design
tokens + the four `*Scene` functions and the `sprites` array in `init`).

## Structure

```
bdigital-ads/
├── index.html   # fonts + #app mount
├── app.js       # timeline engine + the four scenes + playback chrome
└── README.md
```

## Notes

- The page reproduces the design's **preview player** (progress bar + scrubber),
  which is what the source file renders. For embedding as a plain looping ad,
  the scrubber/controls can be hidden; to ship on ad platforms that require a
  video file, the canvas can be captured to MP4 — ask if you'd like either.
- Colours use `oklch()` and render in current evergreen browsers.
