"""Website quality check — turns a business into a ranked prospect.

The biggest opportunities are businesses with NO website or a weak one, so those score
highest. This uses simple, robust HTTP checks (no fragile scraping).
"""
from __future__ import annotations

import re

import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; bdigital-prospect-check/1.0)"}


def check(website: str) -> dict:
    """Return {'prospect_score': int 0-100, 'website_quality': str, 'website': str}."""
    if not website or not website.strip():
        return {
            "prospect_score": 90,
            "website_quality": "No website found — strong candidate for a Starter site.",
            "website": "",
        }

    url = website.strip()
    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    try:
        resp = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
    except requests.RequestException:
        return {
            "prospect_score": 85,
            "website_quality": "Website did not load — likely broken or down. Good candidate.",
            "website": website,
        }

    html = resp.text or ""
    issues: list[str] = []
    score = 30  # a working site → lower prospect value to start

    if not resp.url.startswith("https://"):
        issues.append("no HTTPS (not secure)")
        score += 20
    if 'name="viewport"' not in html and "name='viewport'" not in html:
        issues.append("not mobile-friendly (no viewport tag)")
        score += 25
    if len(html) < 1500:
        issues.append("very little content")
        score += 15
    if re.search(r"<table[^>]*>.*<table", html, re.IGNORECASE | re.DOTALL):
        issues.append("table-based layout (dated)")
        score += 10

    score = max(0, min(100, score))
    if issues:
        note = "Has a site but: " + "; ".join(issues) + "."
    else:
        note = "Has a decent modern site — lower priority (possible ads/branding upsell)."
    return {"prospect_score": score, "website_quality": note, "website": resp.url}
