"""Build wa.me click-to-chat links with a pre-filled message.

Used to create one-tap WhatsApp links: outbound (target = the lead's number, message =
the drafted opener) and the lead-page thank-you button (target = B Digital's number).
"""
from __future__ import annotations

from urllib.parse import quote

from .config import get_env, load_config


def _digits(number: str) -> str:
    return "".join(ch for ch in (number or "") if ch.isdigit())


def b_digital_number() -> str:
    return get_env("WHATSAPP_NUMBER") or load_config().get("business", {}).get(
        "whatsapp_number", ""
    )


def wa_link(message: str, number: str = "") -> str:
    """wa.me link to `number` (defaults to B Digital) with `message` pre-filled.

    Returns '' if no usable number is available.
    """
    digits = _digits(number or b_digital_number())
    if not digits:
        return ""
    return f"https://wa.me/{digits}?text={quote(message)}"
