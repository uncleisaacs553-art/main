# B Digital — Automated Client-Acquisition System

A free, self-running system that helps B Digital **get clients**, **capture leads**, and
**stay visible** — all feeding one **Notion** CRM you open on your phone. No Lovable, no
servers, ~N$0/month.

## The three engines + the copywriter

```
            COPYWRITER (one shared voice: profile/b-digital.md + copy/templates.md)
            • Gemini module (common/copywriter.py)  → writes automatically in the pipeline
            • Claude agent (.claude/agents/...)      → on-demand, top quality + polishing
                          │
                NOTION CRM (Leads + Content Calendar)
                          │
  1) LEAD FINDER        2) INBOUND PAGE            3) MARKETING
  (daily GH Action)     (GitHub Pages + Tally)     (weekly GH Action)
  find SMEs → check     "Get a quote" form →       captions + branded
  their website →       Notion + email alert +     image cards → Content
  AI score → copy →     auto-reply + WhatsApp      Calendar for review
  Notion + gentle       button
  first email (capped);
  WhatsApp draft to
  approve
```

## How it runs
- **GitHub Actions** run the lead finder (daily) and marketing (weekly) — see `.github/workflows/`.
- **Gemini Flash** (free) scores leads and writes copy automatically.
- **Brevo** (free) sends email: alerts to you, auto-replies to enquirers, gentle outreach.
- **Notion** is the CRM/dashboard. **Tally** powers the inbound form. **GitHub Pages** hosts the lead page (`../b-digital-lead/`).

## First time? → read [SETUP.md](./SETUP.md)
~20–30 minutes: create a few free accounts, paste keys into GitHub Secrets, done.

## Run locally (for testing)
```bash
cd b-digital-system
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your keys

python -m leadfinder.main      # outbound (uses data/seeds/*.csv)
python -m marketing.main       # weekly content
```
Everything is tunable in **`config.yaml`** (target categories, towns, daily email cap,
post themes) — no code changes needed.

## Safety & ethics (built in)
Only public business contacts; every cold email has a one-line opt-out; a daily send cap
protects your sender reputation; **cold WhatsApp is never auto-sent** — you approve and tap.
