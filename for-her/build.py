#!/usr/bin/env python3
"""Inline every asset into a single self-contained page.

Reads template.html, swaps the __TOKEN__ placeholders for base64 data URIs, and
writes two outputs:

  index.html     a complete standalone page (open it in any browser, host it anywhere)
  artifact.html  the same page as a fragment, for publishing as a Claude Artifact

Edit template.html (the captions, the reasons and the letter live there), then run:

  python3 build.py

Put the song at assets/song.mp3 (or .m4a / .ogg / .wav) and it gets baked in as the
background track. Without it the page falls back to the little piano loop, which is
written in code and always works.
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

SONG_EXTS = (".mp3", ".m4a", ".ogg", ".wav")


def data_uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


html = (HERE / "template.html").read_text(encoding="utf-8")

for token, (rel, mime) in TOKENS.items():
    html = html.replace(token, data_uri(ASSETS / rel, mime))

# The song, if one is sitting in assets/. Inlined as raw base64 in a trailing
# <script> tag rather than a data: URI up top, so the page is on screen and
# interactive while these few megabytes are still coming down the wire.
song = next((ASSETS / f"song{ext}" for ext in SONG_EXTS if (ASSETS / f"song{ext}").exists()), None)
if song:
    b64 = base64.b64encode(song.read_bytes()).decode("ascii")
    html = html.replace("__SONG_B64__", b64)
    print(f"baked in {song.name} ({song.stat().st_size / 1024 / 1024:.1f} MB)")
else:
    html = html.replace("__SONG_B64__", "")
    print("no assets/song.* — the page will play the piano loop")

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
