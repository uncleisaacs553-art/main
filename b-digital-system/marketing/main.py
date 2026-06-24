"""Marketing autopilot — weekly content engine.

Generates captions (copywriter) + branded image cards (creative) into the Notion
Content Calendar, marked "Ready" for Brian to review and post. Runs unattended weekly;
runs as a DRY RUN locally (still generates images) when Notion isn't configured.
"""
from __future__ import annotations

import os
import sys
from datetime import date, timedelta

from common import copywriter, notion_sync
from common.config import get_env, load_config
from marketing import creative


def _image_url(filename: str) -> str:
    """Raw GitHub URL for a committed image (works once the workflow pushes it)."""
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    ref = os.environ.get("GITHUB_REF_NAME", "")
    if repo and ref:
        return (
            f"https://raw.githubusercontent.com/{repo}/{ref}"
            f"/b-digital-system/marketing/generated/{filename}"
        )
    return ""


def _headline(caption: str, theme: str) -> str:
    """A short, punchy card headline derived from the caption's first sentence."""
    first = caption.replace("\n", " ").split(". ")[0].strip()
    if 8 <= len(first) <= 70:
        return first
    return first[:70].rstrip() if first else theme


def main() -> None:
    cfg = load_config().get("marketing", {})
    count = int(cfg.get("posts_per_run", 5))
    platforms = cfg.get("platforms", ["Facebook"])
    themes = cfg.get("themes", ["why your business needs a website"])

    content_db = get_env("NOTION_CONTENT_DB")
    notion_on = bool(get_env("NOTION_TOKEN") and content_db)
    if not notion_on:
        print("NOTE: Notion not configured — DRY RUN (images generated, rows printed).\n")

    today = date.today()
    made = 0
    for i in range(count):
        theme = themes[i % len(themes)]
        platform = platforms[i % len(platforms)]
        caption = copywriter.draft_captions(theme, 1)[0]["caption"]
        headline = _headline(caption, theme)
        filename = f"{today.isoformat()}-{i + 1}.png"
        creative.make_card(headline, filename)

        item = {
            "title": f"{today.isoformat()} · {theme[:40]}",
            "date": (today + timedelta(days=i)).isoformat(),
            "platform": platform,
            "theme": theme,
            "caption": caption,
            "image_url": _image_url(filename),
            "status": "Ready",
        }
        if notion_on:
            notion_sync.create_content(content_db, item)
        else:
            print("-" * 60)
            print(f"[{item['date']}] {platform} — {theme}")
            print(f"  headline: {headline}")
            print(f"  caption : {caption[:120]}...")
            print(f"  image   : marketing/generated/{filename}")
        made += 1

    print(f"\nDone — {made} posts generated" + ("" if notion_on else "  (DRY RUN)"))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FATAL: {exc}")
        sys.exit(1)
