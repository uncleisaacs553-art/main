"""One-time Notion schema setup.

Creates every required column on your two BLANK databases so you don't have to add them
by hand. Run it from the "Setup Notion schema" GitHub Action (phone-friendly), or locally:

    NOTION_TOKEN=... NOTION_LEADS_DB=... NOTION_CONTENT_DB=... python setup.py

Idempotent — safe to run as many times as you like. Column names/types are kept in sync
with common/notion_sync.py. The default "Name" (title) column already exists, so we leave
it alone.
"""
from __future__ import annotations

import sys

from notion_client import Client
from notion_client.errors import APIResponseError

from common.config import get_env

LEADS_PROPS = {
    "Business": {"rich_text": {}},
    "Phone": {"phone_number": {}},
    "Email": {"email": {}},
    "WhatsApp": {"url": {}},
    "Website": {"url": {}},
    "Website Quality": {"rich_text": {}},
    "Source": {"select": {"options": [{"name": "Website"}, {"name": "Lead Finder"}]}},
    "Status": {"select": {"options": [
        {"name": "New"}, {"name": "Emailed"}, {"name": "Replied"},
        {"name": "Won"}, {"name": "Lost"}, {"name": "Not relevant"},
    ]}},
    "AI Score": {"number": {}},
    "AI Notes": {"rich_text": {}},
    "Outreach Draft": {"rich_text": {}},
    "Date": {"date": {}},
}

CONTENT_PROPS = {
    "Date": {"date": {}},
    "Platform": {"select": {"options": [{"name": "Facebook"}, {"name": "Instagram"}]}},
    "Theme": {"rich_text": {}},
    "Caption": {"rich_text": {}},
    "Image": {"url": {}},
    "Status": {"select": {"options": [{"name": "Idea"}, {"name": "Ready"}, {"name": "Posted"}]}},
}


def _setup_one(client: Client, db_id: str, label: str, desired: dict) -> bool:
    try:
        db = client.databases.retrieve(database_id=db_id)
    except APIResponseError as exc:
        print(f"  x Could not open {label} ({db_id}).")
        print(f"    Check the ID and that you shared the database with the integration.")
        print(f"    {exc}")
        return False

    existing = set(db.get("properties", {}).keys())
    to_add = [name for name in desired if name not in existing]
    title = db.get("title", [])
    title_text = title[0]["plain_text"] if title else "(untitled)"
    print(f"\n{label}: '{title_text}'")

    if not to_add:
        print("  ok - already has all columns, nothing to add")
        return True

    try:
        client.databases.update(database_id=db_id, properties={n: desired[n] for n in to_add})
    except APIResponseError as exc:
        print(f"  x failed to add columns: {exc}")
        return False

    print(f"  ok - added {len(to_add)} columns: {', '.join(to_add)}")
    return True


def main() -> None:
    token = get_env("NOTION_TOKEN", required=True)
    leads_db = get_env("NOTION_LEADS_DB", required=True)
    content_db = get_env("NOTION_CONTENT_DB", required=True)

    client = Client(auth=token)
    print("Setting up Notion databases...")
    ok_leads = _setup_one(client, leads_db, "Leads DB", LEADS_PROPS)
    ok_content = _setup_one(client, content_db, "Content Calendar DB", CONTENT_PROPS)

    if ok_leads and ok_content:
        print("\nDONE - Notion is ready. You can run the Lead Finder now.")
    else:
        print("\nSome databases were not set up - see the messages above.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:  # missing env var → friendly message
        print(f"Setup needs configuration: {exc}")
        sys.exit(1)
