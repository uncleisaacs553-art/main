"""Learning signal: turn Notion lead outcomes (Won/Lost/Replied) into a bias for
future AI scoring. Stored in data/feedback.json (committed by the workflow).

Adapted from the data-scraper-agent skill's memory/feedback pattern.
"""
from __future__ import annotations

import json

from common import notion_sync
from common.config import ROOT, get_env, load_config

PATH = ROOT / "data" / "feedback.json"


def load() -> dict:
    if PATH.exists():
        try:
            return json.loads(PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"positive": [], "negative": []}


def preference_prompt(fb: dict, n: int = 12) -> str:
    lines: list[str] = []
    if fb.get("positive"):
        lines.append("Businesses that became GOOD leads (bias similar ones UP):")
        lines += [f"- {x}" for x in fb["positive"][-n:]]
    if fb.get("negative"):
        lines.append("Businesses that went NOWHERE (bias similar ones DOWN):")
        lines += [f"- {x}" for x in fb["negative"][-n:]]
    return "\n".join(lines)


def sync_from_notion() -> dict:
    """Refresh feedback.json from current Notion lead statuses."""
    leads_db = get_env("NOTION_LEADS_DB")
    if not (get_env("NOTION_TOKEN") and leads_db):
        return load()

    cfg = load_config().get("feedback", {})
    positive = set(cfg.get("positive_statuses", []))
    negative = set(cfg.get("negative_statuses", []))

    fb = {"positive": [], "negative": []}
    try:
        for page in notion_sync.iter_pages(leads_db):
            props = page.get("properties", {})
            status = notion_sync.read_select(props.get("Status", {}))
            name = notion_sync.read_plain(props.get("Name", {}))
            detail = notion_sync.read_plain(props.get("Business", {}))
            label = f"{name} ({detail})" if detail else name
            if not label:
                continue
            if status in positive:
                fb["positive"].append(label)
            elif status in negative:
                fb["negative"].append(label)
    except Exception as exc:  # never break the run over learning
        print(f"  [feedback] sync skipped: {exc}")
        return load()

    try:
        PATH.write_text(json.dumps(fb, indent=2), encoding="utf-8")
    except OSError as exc:
        print(f"  [feedback] could not write {PATH}: {exc}")
    return fb
