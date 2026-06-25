"""New-lead alerts — a short digest email so new outbound leads reach Brian's phone.

The inbound path already alerts Brian (Tally emails him on each enquiry). Outbound leads
found by the daily Lead Finder used to land in Notion silently; this fills that gap by
emailing a one-glance summary (reusing the existing Brevo sender). Runs once per daily
Lead Finder run, so it's a single "here are today's new leads" message.
"""
from __future__ import annotations

from . import brevo


def _notion_db_url(db_id: str) -> str:
    """A tap-straight-to-the-database Notion link, built from the DB id."""
    clean = (db_id or "").replace("-", "").strip()
    return f"https://www.notion.so/{clean}" if clean else "https://www.notion.so"


def _digest_text(leads: list[dict], notion_url: str, top_n: int = 5) -> str:
    n = len(leads)
    shown = leads[:top_n]
    lines = [
        f"• {l.get('business') or l.get('name') or '(unnamed)'} "
        f"— {l.get('area') or 'Namibia'} · score {l.get('ai_score', '?')}"
        for l in shown
    ]
    more = f"\n…and {n - len(shown)} more." if n > len(shown) else ""
    plural = "s" if n != 1 else ""
    return (
        f"B Digital found {n} new lead{plural} today.\n\n"
        + "\n".join(lines)
        + more
        + f"\n\nOpen your Leads in Notion:\n{notion_url}\n\n"
        "Each lead already has a ready-to-send WhatsApp message — open it in Notion, "
        "check it, and tap to send.\n\n— Your B Digital Lead Finder"
    )


def new_leads_digest(leads: list[dict], leads_db: str, cfg: dict) -> bool:
    """Email Brian a summary of today's new leads. Returns True if an email was sent.

    Quietly does nothing (returning False) when disabled, when there are no leads, when
    Brevo isn't configured, or when no recipient is known.
    """
    notif = (cfg or {}).get("notifications", {}) or {}
    if not notif.get("new_lead_digest", True):
        return False
    if not leads or not brevo.is_enabled():
        return False

    recipient = notif.get("recipient") or (cfg.get("business", {}) or {}).get("contact_email")
    if not recipient:
        print("  [notify] no recipient configured — skipping digest")
        return False

    n = len(leads)
    top = leads[0]
    plural = "s" if n != 1 else ""
    subject = (
        f"B Digital: {n} new lead{plural} today "
        f"(top: {top.get('business') or top.get('name') or '?'} · {top.get('ai_score', '?')})"
    )
    text = _digest_text(leads, _notion_db_url(leads_db))
    ok = brevo.send_email(recipient, subject, text, sender_name="B Digital — Lead Finder")
    print(f"  [notify] new-lead digest {'sent' if ok else 'failed'} -> {recipient}")
    return ok


if __name__ == "__main__":
    # Quick visual check (no network): run `python -m common.notify` from b-digital-system/
    sample = [
        {"business": "Cork & Fork", "area": "Windhoek", "ai_score": 92},
        {"business": "Klein Windhoek Guest House", "area": "Windhoek", "ai_score": 81},
        {"business": "Namib Auto Care", "area": "Swakopmund", "ai_score": 67},
        {"business": "Coastal Cuts Barbershop", "area": "Walvis Bay", "ai_score": 58},
        {"business": "Oshakati Hardware", "area": "Oshakati", "ai_score": 51},
        {"business": "Desert Bloom Salon", "area": "Windhoek", "ai_score": 44},
    ]
    url = _notion_db_url("11112222-3333-4444-5555-666677778888")
    print("SUBJECT: B Digital: 6 new leads today (top: Cork & Fork · 92)\n")
    print(_digest_text(sample, url))
