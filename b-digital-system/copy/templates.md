# B Digital — copy voice spec & templates (single source of truth)

Both copywriters read this file so the voice never drifts:
- the **Gemini module** (`common/copywriter.py`) — writes automatically in the pipeline
- the **Claude agent** (`.claude/agents/b-digital-copywriter.md`) — writes/polishes on demand

Always combine this with `profile/b-digital.md` (the business facts).

---

## Golden rules (every message, every channel)
1. **One ask.** One clear, low-friction next step — never several.
2. **Open from something specific and real** about *their* business (their name, what they do,
   the fact they have no site / a slow site). No generic "Hope you're well!".
3. **Plain English, short.** Written for a busy owner reading on a phone. Short sentences.
4. **Lead with their benefit**, not our features. (More customers/calls — not "responsive design".)
5. **Honest.** No fake clients, fake results, fake urgency, or invented testimonials.
6. **Namibian and warm.** Friendly, respectful, local. Use N$ for any price.
7. **No slop.** No emoji walls, no "I hope this email finds you well", no buzzwords,
   no merge-field look ("Dear [NAME]"). If a detail is missing, write around it naturally.
8. **Cold email must include the opt-out line** (see below). WhatsApp drafts must NOT be
   auto-sent — they are for Brian to review and tap-send.

## Opt-out line (required at the end of every cold email)
> Not interested? No problem — just reply "no thanks" and I won't message again.

## Signature (email)
> Brian — B Digital
> Websites · Ads · Branding · Windhoek
> WhatsApp +264 81 479 4693 · brianisaacs533@gmail.com

---

## Channel: WhatsApp first message (OUTBOUND — draft only, ~40–70 words)
Goal: a friendly opener that earns a reply. No link dump. End with one soft question.

**Example (business has NO website):**
> Hi {business}, this is Brian from B Digital here in Windhoek 👋 I help small Namibian
> businesses get a simple website so customers can find them on Google and WhatsApp you
> directly. I had a quick look and couldn't find a site for {business} — would you like me
> to send a free mock-up of what one could look like? No pressure either way.

**Example (website is slow / outdated):**
> Hi {business}, Brian from B Digital (Windhoek). I came across your website — it looks
> like it's a bit slow on phones, which can cost you customers. I'd be happy to show you a
> faster, cleaner version for free, no obligation. Want me to put one together?

## Channel: Gentle first email (OUTBOUND — auto-sent, capped)
Subject: plain and specific, not clever. Body ~80–130 words. Friendly, one ask, opt-out line.

**Example:**
> **Subject:** A quick idea for {business}'s website
>
> Hi {business},
>
> I'm Brian — I run B Digital, a small studio here in Windhoek that builds websites for
> Namibian businesses. I was looking for {business} online and couldn't find a website
> (just a Facebook page), so I thought I'd reach out.
>
> These days most people Google a business before they visit or buy. A simple, fast site —
> from N$1,500 — means more of them find you, see your hours and prices, and message you on
> WhatsApp. I can have a starter site live in about a week.
>
> If it's useful, I'm happy to send a free mock-up for {business} — just reply and I'll put
> one together. No pressure at all.
>
> Brian — B Digital
> Websites · Ads · Branding · Windhoek
> WhatsApp +264 81 479 4693 · brianisaacs533@gmail.com
>
> Not interested? No problem — just reply "no thanks" and I won't message again.

## Channel: Follow-up (OUTBOUND — only if no reply, gentle, ~40 words)
> Hi {business}, just following up on my note about a website. Totally fine if now isn't the
> time — if you'd ever like a free mock-up to see what it could look like, I'm one message
> away. — Brian, B Digital

## Channel: Inbound auto-reply (sent automatically when someone enquires on the site)
Warm, fast, sets expectations, gives a WhatsApp option. ~70 words.
> Hi {name}, thanks for reaching out to B Digital! 🙌 I've got your message and I'll get back
> to you personally within a few hours (usually much sooner). If it's urgent, you can WhatsApp
> me directly on +264 81 479 4693 and we'll chat right away. Talk soon — Brian, B Digital
> (Websites · Ads · Branding, Windhoek).

## Channel: Social caption (MARKETING — Facebook/Instagram, ~25–60 words + 3–6 hashtags)
Plain, helpful, one idea, ends with a soft CTA. Hashtags local + relevant.
**Example (theme = "why your business needs a website"):**
> Your customers are Googling you right now. If they can't find a website, they call the
> next business instead. A simple, fast site (from N$1,500) makes sure they find *you* — and
> can WhatsApp you in one tap. Let's get you online. 📱
> #Windhoek #Namibia #SmallBusinessNamibia #WebDesign #BDigital
