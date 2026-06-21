# B Digital — site + Agent Command Center

An immersive marketing site for **B Digital** (software, web & AI automation
studio) plus a **live Agent Command Center** that visualises the studio's agents
and build pipeline straight from the GitHub API.

Built as a **self-contained static site** — no build step, no runtime CDN
dependency.

![three.js](https://img.shields.io/badge/three.js-r160-43e6ff) ![No build step](https://img.shields.io/badge/build-none-11141d) ![Live data](https://img.shields.io/badge/data-GitHub%20API-a78bfa)

## Two pages

| Page | File | What it is |
| --- | --- | --- |
| Marketing site | `index.html` | Hero, services, process, work, live ops teaser, contact. Immersive Three.js "agent network" backdrop, GSAP scroll motion, Lenis smooth scroll, custom cursor. |
| Agent Command Center | `command-center.html` | A live, mission-control dashboard of agents, workflow runs, activity, and repos — wired to the GitHub REST API. |

## Run it locally

ES modules must be served over HTTP (not opened as a `file://` path):

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000  and  http://localhost:8000/command-center.html
```

Any static server works (`npx serve`, `live-server`, etc.).

## The Command Center & GitHub data

The dashboard reads the **public** GitHub REST API directly from the browser for
the account in `js/cc/config.js` (`owner`). No backend, no secrets.

- **Tokenless (default):** works for **public** repos at ~**60 requests/hour per
  visitor**. To stretch that budget it uses **conditional requests (ETag /
  If-None-Match)** — unchanged responses come back `304` and **don't count**
  against the limit — plus caching and a gentle ~90s poll that backs off when the
  budget runs low.
- **Optional token:** click **⚙ → Save token** and paste a fine-grained,
  read-only GitHub token. It is stored **only in your browser** (`localStorage`)
  and is never uploaded or committed. This raises the limit to **5,000/hr** and
  unlocks **private** repos you can access. Read-only `Actions`, `Contents`, and
  `Metadata` scopes are plenty.
- **Demo mode:** if the API is unreachable or rate-limited, the dashboard shows
  realistic synthetic data so it's never blank. You can also force it from
  **⚙ → Show demo data** or by adding `?demo=1` to the URL.

### What counts as an "agent"
Agents are derived from **GitHub Actions workflows** (each workflow = a worker,
with live run status) and from **bot/automation accounts** seen in the activity
feed (logins matching the patterns in `js/cc/config.js`, e.g. `*[bot]`, `*agent*`,
`claude`). Tune `agentPatterns` to match your own bots.

## Structure

```
site/
├── index.html              # marketing site
├── command-center.html     # live agent dashboard
├── css/
│   ├── styles.css          # design system (shared tokens) + marketing styles
│   └── command-center.css  # dashboard styles
├── js/
│   ├── main.js             # marketing interactions + live teaser fetch
│   ├── scene.js            # Three.js "agent network" backdrop
│   ├── data.js             # selected-work cards
│   └── cc/                 # Command Center
│       ├── config.js       #   owner, refresh cadence, agent patterns
│       ├── api.js          #   GitHub client (ETag cache, token, rate limit)
│       ├── agents.js       #   transforms: agents, KPIs, throughput
│       ├── demo.js         #   synthetic fallback data
│       ├── render.js       #   DOM rendering for every panel
│       ├── backdrop.js     #   canvas constellation background
│       └── main.js         #   orchestration + settings + refresh loop
└── vendor/                 # vendored libraries (three, gsap, lenis) — no CDN
```

## Customize

- **Brand / copy** — text lives in `index.html`; `CONFIG.brand` in `js/cc/config.js`.
- **Monitored account** — change `owner` in `js/cc/config.js`.
- **Selected work** — edit the `projects` array in `js/data.js`.
- **Palette / type** — CSS variables at the top of `css/styles.css`
  (`--accent`, `--violet`, `--bg`, `--font-display`, …).
- **The 3D backdrop** — the agent-network construct is assembled in `js/scene.js`.

## Deploy

Pushes to `claude/optimistic-shannon-j18yvp` or `main` that touch `site/**` build
and publish via `.github/workflows/deploy-pages.yml` (GitHub Pages). The folder
name is internal — Pages serves the artifact root, so public URLs are unaffected.

## Notes

- Fonts load from Google Fonts (with system fallbacks if blocked).
- Marketing imagery loads from Unsplash and degrades to a tasteful gradient if an
  image is unavailable.
- Everything degrades gracefully: if Three.js / GSAP / Lenis or the GitHub API are
  unavailable, content stays visible and usable.
