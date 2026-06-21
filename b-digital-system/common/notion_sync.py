"""Notion CRM storage. Adapted from the data-scraper-agent skill (storage/notion_sync.py).

Writes leads and content-calendar rows, and reads existing keys for deduplication.
Property types expected in the Notion databases (see SETUP.md):
  Leads:   Name(title) Business(text) Phone(phone) Email(email) WhatsApp(url)
           Website(url) "Website Quality"(text) Source(select) Status(select)
           "AI Score"(number) "AI Notes"(text) "Outreach Draft"(text) Date(date)
  Content: Name(title) Date(date) Platform(select) Theme(text) Caption(text)
           Image(url) Status(select)
"""
from __future__ import annotations

from .config import get_env

try:
    from notion_client import Client
    from notion_client.errors import APIResponseError
except ImportError:  # let the module import even before deps are installed
    Client = None  # type: ignore
    APIResponseError = Exception  # type: ignore

_client = None


def _get_client():
    global _client
    if Client is None:
        raise RuntimeError("notion-client not installed. Run: pip install -r requirements.txt")
    if _client is None:
        _client = Client(auth=get_env("NOTION_TOKEN", required=True))
    return _client


# --- property builders ---------------------------------------------------------

def _title(text):  return {"title": [{"text": {"content": (text or "")[:200]}}]}
def _rich(text):   return {"rich_text": [{"text": {"content": (text or "")[:2000]}}]}
def _select(name): return {"select": ({"name": name} if name else None)}
def _url(value):   return {"url": value or None}
def _number(value):return {"number": value}
def _date(value):  return {"date": ({"start": value} if value else None)}


def _read_plain(prop: dict) -> str:
    kind = prop.get("type")
    if kind == "url":
        return prop.get("url") or ""
    if kind == "phone_number":
        return prop.get("phone_number") or ""
    if kind == "email":
        return prop.get("email") or ""
    if kind in ("rich_text", "title"):
        arr = prop.get(kind, [])
        return arr[0].get("plain_text", "") if arr else ""
    return ""


def _norm(value: str) -> str:
    """Normalise a phone/website for dedupe (strip punctuation, lowercase)."""
    return "".join(ch for ch in (value or "").lower() if ch.isalnum())


def get_existing_keys(db_id: str, key_props=("Phone", "Website", "Email")) -> set[str]:
    """Return normalised dedupe keys already in the Leads DB."""
    client = _get_client()
    seen: set[str] = set()
    cursor = None
    while True:
        kwargs = {"database_id": db_id, "page_size": 100}
        if cursor:
            kwargs["start_cursor"] = cursor
        resp = client.databases.query(**kwargs)
        for page in resp.get("results", []):
            props = page.get("properties", {})
            for key in key_props:
                val = _read_plain(props.get(key, {}))
                if val:
                    seen.add(_norm(val))
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return seen


def lead_keys(lead: dict) -> set[str]:
    """The dedupe keys a lead would occupy."""
    return {_norm(lead.get(k, "")) for k in ("phone", "website", "email") if lead.get(k)}


def create_lead(db_id: str, lead: dict) -> bool:
    """Create one Leads row. Returns True on success."""
    props = {
        "Name": _title(lead.get("business") or lead.get("name")),
        "Business": _rich(lead.get("business")),
        "Phone": {"phone_number": lead.get("phone") or None},
        "Email": {"email": lead.get("email") or None},
        "WhatsApp": _url(lead.get("whatsapp_url")),
        "Website": _url(lead.get("website")),
        "Website Quality": _rich(lead.get("website_quality")),
        "Source": _select(lead.get("source", "Lead Finder")),
        "Status": _select(lead.get("status", "New")),
        "AI Score": _number(lead.get("ai_score")),
        "AI Notes": _rich(lead.get("ai_notes")),
        "Outreach Draft": _rich(lead.get("outreach_draft")),
        "Date": _date(lead.get("date")),
    }
    return _create(db_id, props, "create_lead")


def create_content(db_id: str, item: dict) -> bool:
    """Create one Content Calendar row. Returns True on success."""
    props = {
        "Name": _title(item.get("title") or (item.get("caption", "")[:60])),
        "Date": _date(item.get("date")),
        "Platform": _select(item.get("platform")),
        "Theme": _rich(item.get("theme")),
        "Caption": _rich(item.get("caption")),
        "Image": _url(item.get("image_url")),
        "Status": _select(item.get("status", "Ready")),
    }
    return _create(db_id, props, "create_content")


def _create(db_id: str, props: dict, label: str) -> bool:
    try:
        _get_client().pages.create(parent={"database_id": db_id}, properties=props)
        return True
    except APIResponseError as exc:
        print(f"  [notion] {label} failed: {exc}")
        return False
