"""B Digital copywriter — writes WhatsApp messages, emails, and social captions
in B Digital's voice.

This is the unattended (Gemini) copywriter used by the pipeline. The on-demand Claude
agent at .claude/agents/b-digital-copywriter.md uses the SAME voice spec
(profile/b-digital.md + copy/templates.md) so the two never drift apart.

If GEMINI_API_KEY is absent, every function falls back to solid template copy, so the
pipeline never breaks.
"""
from __future__ import annotations

from functools import lru_cache

from . import gemini
from .config import read_text


@lru_cache(maxsize=1)
def _voice() -> str:
    """The shared voice spec: business facts + channel rules/examples."""
    profile = read_text("profile/b-digital.md")
    templates = read_text("copy/templates.md")
    return f"{profile}\n\n---\n\n{templates}"


def _biz(lead: dict) -> str:
    return lead.get("business") or lead.get("name") or "there"


def _lead_brief(lead: dict) -> str:
    return "\n".join(
        [
            f"Business name: {_biz(lead)}",
            f"Category: {lead.get('category', 'unknown')}",
            f"Town/area: {lead.get('area', 'unknown')}",
            f"Has website: {'no' if not lead.get('website') else lead.get('website')}",
            f"Website problem: {lead.get('website_quality', 'none noted')}",
        ]
    )


# --- public API ----------------------------------------------------------------

def draft_whatsapp(lead: dict) -> str:
    """Short WhatsApp opener (DRAFT ONLY — never auto-sent)."""
    prompt = (
        f"{_voice()}\n\n---\nTASK: Write ONE WhatsApp first message (40-70 words) to the "
        f"prospect below, following the WhatsApp rules above. Return ONLY the message text, "
        f"no preamble.\n\nPROSPECT:\n{_lead_brief(lead)}"
    )
    out = gemini.generate_text(prompt).strip()
    return out or _fallback_whatsapp(lead)


def draft_first_email(lead: dict) -> dict:
    """Gentle first email. Returns {'subject': str, 'text': str}."""
    prompt = (
        f"{_voice()}\n\n---\nTASK: Write a gentle first cold email to the prospect below, "
        f"following the email rules above (one ask, ~80-130 words, include the signature and "
        f"the required opt-out line). Return ONLY JSON of the form "
        f'{{"subject": "...", "body": "..."}}.\n\nPROSPECT:\n{_lead_brief(lead)}'
    )
    data = gemini.generate_json(prompt)
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    if subject and body:
        return {"subject": subject, "text": body}
    return _fallback_email(lead)


def draft_captions(theme: str, n: int = 1) -> list[dict]:
    """Social captions for a theme. Returns [{'caption': str, 'theme': str}, ...]."""
    prompt = (
        f"{_voice()}\n\n---\nTASK: Write {n} different social media captions for "
        f"Facebook/Instagram on the theme '{theme}', following the caption rules above. "
        f'Return ONLY JSON of the form {{"captions": ["...", "..."]}}.'
    )
    data = gemini.generate_json(prompt)
    caps = data.get("captions") if isinstance(data, dict) else None
    if caps:
        cleaned = [c.strip() for c in caps if isinstance(c, str) and c.strip()]
        if cleaned:
            return [{"caption": c, "theme": theme} for c in cleaned[:n]]
    return [{"caption": _fallback_caption(theme), "theme": theme} for _ in range(n)]


# --- template fallbacks (used when AI is unavailable) --------------------------

def _fallback_whatsapp(lead: dict) -> str:
    return (
        f"Hi {_biz(lead)}, this is Brian from B Digital here in Windhoek. I help small "
        f"Namibian businesses get a simple website so customers can find them on Google and "
        f"WhatsApp you directly. Would you like a free mock-up of what one could look like? "
        f"No pressure either way."
    )


def _fallback_email(lead: dict) -> dict:
    biz = _biz(lead)
    body = (
        f"Hi {biz},\n\n"
        f"I'm Brian — I run B Digital, a small studio in Windhoek that builds websites for "
        f"Namibian businesses. I was looking for {biz} online and thought I'd reach out.\n\n"
        f"Most people Google a business before they visit or buy. A simple, fast site — from "
        f"N$1,500 — means more of them find you and can WhatsApp you in one tap. I can have a "
        f"starter site live in about a week.\n\n"
        f"If it's useful, I'm happy to send a free mock-up — just reply and I'll put one "
        f"together. No pressure at all.\n\n"
        f"Brian — B Digital\nWebsites · Ads · Branding · Windhoek\n"
        f"WhatsApp +264 81 479 4693 · brianisaacs533@gmail.com\n\n"
        f'Not interested? No problem — just reply "no thanks" and I won\'t message again.'
    )
    return {"subject": f"A quick idea for {biz}'s website", "text": body}


def _fallback_caption(theme: str) -> str:
    return (
        "Your customers are Googling you right now. If they can't find a website, they call "
        "the next business instead. A simple, fast site (from N$1,500) makes sure they find "
        "you — and can WhatsApp you in one tap. Let's get you online. "
        "#Windhoek #Namibia #SmallBusinessNamibia #WebDesign #BDigital"
    )
