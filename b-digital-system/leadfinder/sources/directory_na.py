"""Optional public-directory scraper (OFF by default).

The reliable source is seed CSVs. This module lets you ALSO pull listings from a public
business directory you're permitted to scrape. It is config-driven and fails safe
(returns [] on any problem), so it can never break the daily run.

Enable + configure under `leadfinder.directory` in config.yaml. Verify the CSS selectors
against the real page first, and respect the site's robots.txt / terms.
"""
from __future__ import annotations

import time

import requests
from bs4 import BeautifulSoup

from common.config import load_config

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; bdigital-research/1.0)"}


def fetch() -> list[dict]:
    cfg = load_config().get("leadfinder", {}).get("directory", {})
    if not cfg.get("enabled"):
        return []
    base_url = cfg.get("base_url", "")
    list_sel = cfg.get("list_selector", "")
    if not base_url or not list_sel:
        print("  [directory_na] enabled but base_url/list_selector missing — skipping")
        return []

    categories = load_config().get("leadfinder", {}).get("target_categories", [""])
    areas = load_config().get("leadfinder", {}).get("target_areas", [""])
    max_pages = int(cfg.get("max_pages", 2))
    delay = float(cfg.get("request_delay_seconds", 2))

    leads: list[dict] = []
    for category in categories:
        for area in areas:
            for page in range(1, max_pages + 1):
                url = base_url.format(category=category, area=area, page=page)
                try:
                    resp = requests.get(url, headers=HEADERS, timeout=15)
                    if resp.status_code != 200:
                        break
                    leads += _parse(resp.text, cfg, category, area)
                except requests.RequestException as exc:
                    print(f"  [directory_na] request failed ({url}): {exc}")
                    break
                time.sleep(delay)  # be polite
    print(f"  [directory_na] {len(leads)} leads scraped")
    return leads


def _parse(html: str, cfg: dict, category: str, area: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    out = []
    for card in soup.select(cfg.get("list_selector", "")):
        name = _text(card, cfg.get("name_selector", ""))
        if not name:
            continue
        out.append({
            "business": name,
            "category": category,
            "area": area,
            "phone": _text(card, cfg.get("phone_selector", "")),
            "email": "",
            "website": _href(card, cfg.get("website_selector", "")),
            "source": "Lead Finder",
        })
    return out


def _text(card, selector: str) -> str:
    if not selector:
        return ""
    el = card.select_one(selector)
    return el.get_text(strip=True) if el else ""


def _href(card, selector: str) -> str:
    if not selector:
        return ""
    el = card.select_one(selector)
    return (el.get("href") or "").strip() if el else ""
