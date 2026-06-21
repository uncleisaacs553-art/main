"""Transactional email via Brevo (free tier: 300 emails/day, no custom domain needed).

Sends from the verified sender (Brian's Gmail). Used for: notifying Brian of new leads,
auto-replying to website enquiries, and the gentle first outreach email.
"""
from __future__ import annotations

import requests

from .config import get_env

API_URL = "https://api.brevo.com/v3/smtp/email"


def is_enabled() -> bool:
    return bool(get_env("BREVO_API_KEY") and get_env("BREVO_SENDER"))


def send_email(
    to_email: str,
    subject: str,
    text: str,
    html: str = "",
    to_name: str = "",
    sender_name: str = "Brian — B Digital",
) -> bool:
    """Send one email. Returns True on success, False (with a log line) otherwise."""
    api_key = get_env("BREVO_API_KEY")
    sender = get_env("BREVO_SENDER")
    if not api_key or not sender:
        print("  [brevo] missing BREVO_API_KEY or BREVO_SENDER — skipping send")
        return False
    if not to_email or not subject:
        print("  [brevo] missing recipient or subject — skipping send")
        return False

    payload = {
        "sender": {"name": sender_name, "email": sender},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html or _text_to_html(text),
        "textContent": text or "",
    }
    try:
        resp = requests.post(
            API_URL,
            json=payload,
            headers={"api-key": api_key, "content-type": "application/json"},
            timeout=20,
        )
    except requests.RequestException as exc:
        print(f"  [brevo] request error: {exc}")
        return False

    if resp.status_code in (200, 201):
        return True
    print(f"  [brevo] send failed {resp.status_code}: {resp.text[:200]}")
    return False


def _text_to_html(text: str) -> str:
    """Minimal text → HTML so plain drafts render as paragraphs."""
    safe = (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    paragraphs = [p.strip().replace("\n", "<br>") for p in safe.split("\n\n") if p.strip()]
    return "".join(f"<p>{p}</p>" for p in paragraphs)
