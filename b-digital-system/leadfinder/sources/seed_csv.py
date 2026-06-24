"""Seed CSV source — the reliable way to feed the lead finder.

Drop CSV files into data/seeds/ with this header:
    business,category,area,phone,email,website
Anything missing can be left blank. The website-check step ranks each lead afterwards.
"""
from __future__ import annotations

import csv

from common.config import ROOT

SEEDS_DIR = ROOT / "data" / "seeds"
FIELDS = ("business", "category", "area", "phone", "email", "website")


def fetch() -> list[dict]:
    leads: list[dict] = []
    if not SEEDS_DIR.exists():
        return leads
    for path in sorted(SEEDS_DIR.glob("*.csv")):
        try:
            with path.open(newline="", encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    lead = {k: (row.get(k) or "").strip() for k in FIELDS}
                    if not lead["business"]:
                        continue
                    lead["source"] = "Lead Finder"
                    leads.append(lead)
        except OSError as exc:
            print(f"  [seed_csv] could not read {path.name}: {exc}")
    print(f"  [seed_csv] {len(leads)} leads from {SEEDS_DIR}")
    return leads
