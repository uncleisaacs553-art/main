"""Configuration + environment loading for the B Digital system.

All tunables live in config.yaml; all secrets come from environment variables
(.env locally, GitHub Secrets in CI). Nothing secret is ever hard-coded.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Load .env for local runs. In GitHub Actions the vars are already in the env,
# so this is a harmless no-op there.
load_dotenv()

# b-digital-system/ — the project root for this Python app.
ROOT = Path(__file__).resolve().parent.parent


@lru_cache(maxsize=1)
def load_config() -> dict:
    """Read config.yaml once. Fails fast if it's missing or malformed."""
    path = ROOT / "config.yaml"
    if not path.exists():
        raise FileNotFoundError(f"config.yaml not found at {path}")
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise ValueError("config.yaml must define a mapping at the top level")
    return data


def get_env(name: str, default: str | None = None, required: bool = False) -> str | None:
    """Read an environment variable. Raises if required and absent/empty."""
    val = os.environ.get(name, default)
    if required and not val:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Set it in .env (local) or GitHub Secrets (CI)."
        )
    return val


def read_text(rel_path: str) -> str:
    """Read a project-relative text file (e.g. 'profile/b-digital.md'). '' if missing."""
    path = ROOT / rel_path
    return path.read_text(encoding="utf-8") if path.exists() else ""
