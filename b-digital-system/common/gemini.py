"""Gemini Flash REST client with automatic model fallback (free-tier friendly).

Adapted from the data-scraper-agent skill (ai/client.py). Two entry points:
  - generate_text() -> plain text  (for copywriting)
  - generate_json() -> dict        (for lead scoring)

Both return an empty value on failure so callers can fall back gracefully.
"""
from __future__ import annotations

import json
import time

import requests

from .config import get_env, load_config

# Try cheapest/highest-quota models first, fall back on 429/404/503.
MODEL_FALLBACK = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
]

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

_last_call = 0.0


def is_enabled() -> bool:
    return bool(get_env("GEMINI_API_KEY"))


def _rate_limit() -> None:
    """Stay within free-tier RPM by spacing calls (configurable)."""
    global _last_call
    gap = float(load_config().get("ai", {}).get("rate_limit_seconds", 7))
    elapsed = time.time() - _last_call
    if elapsed < gap:
        time.sleep(gap - elapsed)
    _last_call = time.time()


def _models(preferred: str = "") -> list[str]:
    chosen = preferred or load_config().get("ai", {}).get("model", "")
    if chosen:
        return [chosen] + [m for m in MODEL_FALLBACK if m != chosen]
    return list(MODEL_FALLBACK)


def _call(prompt: str, json_mode: bool, preferred: str) -> str:
    api_key = get_env("GEMINI_API_KEY")
    if not api_key:
        return ""

    max_tokens = int(load_config().get("ai", {}).get("max_output_tokens", 2048))
    gen_cfg: dict = {"temperature": 0.4, "maxOutputTokens": max_tokens}
    if json_mode:
        gen_cfg["responseMimeType"] = "application/json"
        gen_cfg["temperature"] = 0.3
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gen_cfg}

    _rate_limit()
    for model in _models(preferred):
        url = f"{API_BASE}/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=30)
        except requests.RequestException as exc:
            print(f"  [gemini] request error on {model}: {exc}")
            continue
        if resp.status_code == 200:
            return _extract_text(resp)
        if resp.status_code in (429, 404, 503):
            print(f"  [gemini] {resp.status_code} on {model} — trying next model")
            time.sleep(1)
            continue
        print(f"  [gemini] {resp.status_code} on {model}: {resp.text[:200]}")
        return ""
    return ""


def _extract_text(resp: requests.Response) -> str:
    try:
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, ValueError):
        return ""


def generate_text(prompt: str, preferred: str = "") -> str:
    """Plain-text generation (copywriting). Returns '' on failure."""
    return _call(prompt, json_mode=False, preferred=preferred)


def generate_json(prompt: str, preferred: str = "") -> dict:
    """Structured generation (scoring). Returns {} on failure."""
    text = _call(prompt, json_mode=True, preferred=preferred)
    if not text:
        return {}
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}
