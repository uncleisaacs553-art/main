"""AI lead scoring (Gemini, batched). Adapted from the data-scraper-agent skill
(ai/pipeline.py). Falls back to the rule-based website prospect score when AI is off.
"""
from __future__ import annotations

from common import gemini
from common.config import load_config, read_text


def score_batch(leads: list[dict], preference: str = "") -> list[dict]:
    """Add 'ai_score' (0-100) and 'ai_notes' to each lead."""
    if not leads:
        return leads

    if not gemini.is_enabled():
        for lead in leads:
            lead["ai_score"] = lead.get("prospect_score", 50)
            lead["ai_notes"] = lead.get("website_quality", "")
        return leads

    batch_size = int(load_config().get("ai", {}).get("batch_size", 5))
    profile = read_text("profile/b-digital.md")

    scored: list[dict] = []
    for i in range(0, len(leads), batch_size):
        batch = leads[i:i + batch_size]
        data = gemini.generate_json(_prompt(batch, profile, preference))
        analyses = data.get("analyses", []) if isinstance(data, dict) else []
        for j, lead in enumerate(batch):
            ai = analyses[j] if j < len(analyses) else {}
            raw = ai.get("score")
            lead["ai_score"] = int(raw) if isinstance(raw, (int, float)) else lead.get("prospect_score", 50)
            lead["ai_notes"] = (ai.get("notes") or lead.get("website_quality", "")).strip()
            scored.append(lead)
    return scored


def _prompt(batch: list[dict], profile: str, preference: str) -> str:
    items = "\n".join(
        f"{i + 1}. {l.get('business')} | category: {l.get('category')} | "
        f"area: {l.get('area')} | website finding: {l.get('website_quality')}"
        for i, l in enumerate(batch)
    )
    pref_block = f"\n# What we've learned so far\n{preference}\n" if preference else ""
    return (
        f"You are scoring sales leads for B Digital.\n\n"
        f"# About B Digital\n{profile[:1200]}\n"
        f"{pref_block}\n"
        f"# Leads\n{items}\n\n"
        f"Score each lead 0-100 for how good a prospect they are for B Digital — higher = "
        f"more likely to need and buy a website/ads/branding. Businesses with no site or a "
        f"weak site score higher. Return ONLY JSON: "
        f'{{"analyses":[{{"score":<0-100>,"notes":"<one short reason>"}}]}} in the same order.'
    )
