#!/usr/bin/env python3
"""Inline every asset into a single self-contained page.

Reads template.html, swaps the __TOKEN__ placeholders for base64 data URIs, and
writes two outputs:

  index.html     a complete standalone page (open it in any browser, host it anywhere)
  artifact.html  the same page as a fragment, for publishing as a Claude Artifact

Edit template.html (the captions and the letter live there), then run:  python3 build.py
"""

import base64
import pathlib

HERE = pathlib.Path(__file__).parent
ASSETS = HERE / "assets"

TOKENS = {
    "__FONT_SERIF__":   ("fonts/InstrumentSerif-Regular.woff2",     "font/woff2"),
    "__FONT_SERIF_I__": ("fonts/InstrumentSerif-Italic.woff2",      "font/woff2"),
    "__FONT_SANS__":    ("fonts/InstrumentSans-Regular.woff2",      "font/woff2"),
    "__FONT_SANS_B__":  ("fonts/InstrumentSans-Bold.woff2",         "font/woff2"),
    "__FONT_HAND__":    ("fonts/NothingYouCouldDo-Regular.woff2",   "font/woff2"),
    "__FONT_MONO__":    ("fonts/RedHatMono-Regular.woff2",          "font/woff2"),
    "__IMG_COUCH__":    ("photos/couch.webp",                       "image/webp"),
    "__IMG_MIRROR__":   ("photos/mirror.webp",                      "image/webp"),
    "__IMG_PEACE__":    ("photos/peace.webp",                       "image/webp"),
    "__IMG_BURGER__":   ("photos/burger.webp",                      "image/webp"),
    "__IMG_MENU__":     ("photos/menu.webp",                        "image/webp"),
}

html = (HERE / "template.html").read_text(encoding="utf-8")

for token, (rel, mime) in TOKENS.items():
    blob = base64.b64encode((ASSETS / rel).read_bytes()).decode("ascii")
    html = html.replace(token, f"data:{mime};base64,{blob}")

leftover = [t for t in TOKENS if t in html]
if leftover:
    raise SystemExit(f"unreplaced tokens: {leftover}")

(HERE / "artifact.html").write_text(html, encoding="utf-8")

standalone = (
    "<!doctype html>\n"
    '<html lang="en">\n<head>\n'
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    '<meta name="color-scheme" content="dark">\n'
    "</head>\n<body>\n" + html + "\n</body>\n</html>\n"
)
(HERE / "index.html").write_text(standalone, encoding="utf-8")

for name in ("index.html", "artifact.html"):
    kb = (HERE / name).stat().st_size / 1024
    print(f"{name:16} {kb:8.1f} KB")
