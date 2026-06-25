"""Lead finder — outbound engine.

Pipeline: collect (seed CSV + optional directory) -> website check -> AI score ->
copywriter drafts -> Notion + capped gentle first email.

Runs unattended on GitHub Actions (daily). Works locally as a DRY RUN if Notion isn't
configured — it prints the drafts instead of writing them.
"""
from __future__ import annotations

import sys
from datetime import date

from common import brevo, copywriter, notion_sync, notify
from common.config import get_env, load_config
from common.links import wa_link
from leadfinder import feedback, scoring, website_check
from leadfinder.sources import directory_na, seed_csv


def _collect() -> list[dict]:
    leads = list(seed_csv.fetch())
    try:
        leads += list(directory_na.fetch())
    except Exception as exc:  # a fragile scraper must never break the run
        print(f"  [directory_na] skipped: {exc}")
    return leads


def _dedupe(leads: list[dict], existing_keys: set[str]) -> list[dict]:
    seen = set(existing_keys)
    out = []
    for lead in leads:
        keys = notion_sync.lead_keys(lead) or {lead.get("business", "").lower()}
        if keys & seen:
            continue
        seen |= keys
        out.append(lead)
    return out


def main() -> None:
    full_cfg = load_config()
    cfg = full_cfg.get("leadfinder", {})
    min_score = int(cfg.get("min_prospect_score", 40))
    email_cap = int(cfg.get("daily_email_cap", 20))
    email_auto = bool(cfg.get("email_channel_auto", True))

    leads_db = get_env("NOTION_LEADS_DB")
    notion_on = bool(get_env("NOTION_TOKEN") and leads_db)
    if not notion_on:
        print("NOTE: Notion not configured — running as a DRY RUN (drafts printed, nothing saved).\n")

    # Refresh learning signal, then collect + dedupe.
    fb = feedback.sync_from_notion()
    preference = feedback.preference_prompt(fb)

    raw = _collect()
    print(f"Collected {len(raw)} candidate leads")
    existing = notion_sync.get_existing_keys(leads_db) if notion_on else set()
    leads = _dedupe(raw, existing)
    print(f"{len(leads)} after dedupe")
    if not leads:
        print("Nothing new to process. Done.")
        return

    # Website check (rule-based prospect score) then AI score.
    for lead in leads:
        lead.update(website_check.check(lead.get("website", "")))
    leads = scoring.score_batch(leads, preference=preference)

    leads = [l for l in leads if int(l.get("ai_score", 0)) >= min_score]
    leads.sort(key=lambda l: l.get("ai_score", 0), reverse=True)
    print(f"{len(leads)} leads at/above min score {min_score}\n")

    emails_sent = 0
    today = date.today().isoformat()
    for lead in leads:
        # WhatsApp draft (NEVER auto-sent) + tap-to-send link.
        wa_msg = copywriter.draft_whatsapp(lead)
        lead["outreach_draft"] = wa_msg
        if lead.get("phone"):
            lead["whatsapp_url"] = wa_link(wa_msg, lead["phone"])
        lead["date"] = today
        lead["status"] = "New"

        # Gentle first email (the agreed "mix") — auto-sent, capped, opt-out included.
        if email_auto and lead.get("email") and emails_sent < email_cap:
            mail = copywriter.draft_first_email(lead)
            if brevo.is_enabled() and notion_on:
                if brevo.send_email(lead["email"], mail["subject"], mail["text"],
                                    to_name=lead.get("business", "")):
                    emails_sent += 1
                    lead["status"] = "Emailed"
            else:
                lead["ai_notes"] = _append(lead.get("ai_notes", ""),
                                           "Email draft ready (sending not configured).")

        if notion_on:
            notion_sync.create_lead(leads_db, lead)
        else:
            _print_lead(lead)

    suffix = "" if notion_on else "  (DRY RUN — nothing saved to Notion)"
    print(f"\nDone — {len(leads)} leads processed, {emails_sent} gentle emails sent.{suffix}")

    # Phone alert: email Brian a one-glance summary of today's new leads.
    if notion_on:
        notify.new_leads_digest(leads, leads_db, full_cfg)


def _append(notes: str, extra: str) -> str:
    return f"{notes} | {extra}".strip(" |") if notes else extra


def _print_lead(lead: dict) -> None:
    print("-" * 64)
    print(f"{lead.get('business')}  [score {lead.get('ai_score')}]  ({lead.get('area')})")
    print(f"  website : {lead.get('website') or '(none)'} — {lead.get('website_quality')}")
    print(f"  WhatsApp: {lead.get('outreach_draft')}")
    if lead.get("whatsapp_url"):
        print(f"  wa.me   : {lead['whatsapp_url'][:80]}...")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FATAL: {exc}")
        sys.exit(1)
