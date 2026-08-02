#!/usr/bin/env python3
"""Inline every asset into a single self-contained page.

Reads template.html, swaps the __TOKEN__ placeholders for base64 data URIs, and
writes two outputs:

  index.html     a complete standalone page (open it in any browser, host it anywhere)
  artifact.html  the same page as a fragment, for publishing as a Claude Artifact

Edit template.html (the captions, the reasons and the letter live there), then run:

  python3 build.py

Optional: drop your own copy of the song at assets/song.mp3 (or .m4a / .ogg) and it
gets baked in as the background track instead of the little piano loop. Nothing is
shipped in this repo — that file is yours to add, on your own machine.
"""

import base64
import pathlib

HERE = pathlib.Path(__file__).parent
ASSETS = HERE / "assets"

TOKENS = {
    "__FONT_DISPLAY__": ("fonts/Gloock-Regular.woff2",            "font/woff2"),
    "__FONT_BODY__":    ("fonts/Lora-Regular.woff2",              "font/woff2"),
    "__FONT_BODY_I__":  ("fonts/Lora-Italic.woff2",               "font/woff2"),
    "__FONT_HAND__":    ("fonts/NothingYouCouldDo-Regular.woff2", "font/woff2"),
    "__FONT_LABEL__":   ("fonts/ArsenalSC-Regular.woff2",         "font/woff2"),
    "__IMG_COUCH__":    ("photos/couch.webp",                     "image/webp"),
    "__IMG_MIRROR__":   ("photos/mirror.webp",                    "image/webp"),
    "__IMG_PEACE__":    ("photos/peace.webp",                     "image/webp"),
    "__IMG_BURGER__":   ("photos/burger.webp",                    "image/webp"),
    "__IMG_MENU__":     ("photos/menu.webp",                      "image/webp"),
}

SONG_TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav"}


def data_uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


html = (HERE / "template.html").read_text(encoding="utf-8")

for token, (rel, mime) in TOKENS.items():
    html = html.replace(token, data_uri(ASSETS / rel, mime))

# Your own copy of the song, if you dropped one in. Never shipped by default.
song = next((ASSETS / f"song{ext}" for ext in SONG_TYPES if (ASSETS / f"song{ext}").exists()), None)
if song:
    html = html.replace("__SONG__", data_uri(song, SONG_TYPES[song.suffix]))
    print(f"baked in {song.name} ({song.stat().st_size / 1024 / 1024:.1f} MB)")
else:
    html = html.replace("__SONG__", "")

leftover = [t for t in TOKENS if t in html]
if leftover:
    raise SystemExit(f"unreplaced tokens: {leftover}")

(HERE / "artifact.html").write_text(html, encoding="utf-8")

standalone = (
    "<!doctype html>\n"
    '<html lang="en">\n<head>\n'
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "</head>\n<body>\n" + html + "\n</body>\n</html>\n"
)
(HERE / "index.html").write_text(standalone, encoding="utf-8")

for name in ("index.html", "artifact.html"):
    print(f"{name:16} {(HERE / name).stat().st_size / 1024:8.1f} KB")
