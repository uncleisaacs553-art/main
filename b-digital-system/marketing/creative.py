"""Branded social-image cards (Pillow) in B Digital colours/fonts.

Uses the brand TTFs if you drop them in marketing/fonts/ (SpaceGrotesk-Bold.ttf,
Inter-Regular.ttf); otherwise falls back to DejaVu/Liberation system fonts, and finally
to Pillow's built-in font, so it always renders.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from common.config import ROOT

SIZE = 1080
CHARCOAL = (22, 19, 15)
CREAM = (255, 253, 249)
AMBER = (245, 158, 11)
ORANGE = (234, 88, 12)
MUTED = (150, 138, 120)

FONTS_DIR = ROOT / "marketing" / "fonts"
GEN_DIR = ROOT / "marketing" / "generated"

_BOLD = [
    FONTS_DIR / "SpaceGrotesk-Bold.ttf",
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
]
_REG = [
    FONTS_DIR / "Inter-Regular.ttf",
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
]


def _font(paths, size):
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def _gradient(img, box, c1, c2):
    """Fill a box with a horizontal amber→orange gradient."""
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    width = max(1, x1 - x0)
    for i in range(width):
        t = i / max(1, width - 1)
        col = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
        draw.line([(x0 + i, y0), (x0 + i, y1)], fill=col)


def _wrap(draw, text, font, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def make_card(headline: str, out_name: str) -> Path:
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (SIZE, SIZE), CHARCOAL)
    draw = ImageDraw.Draw(img)
    margin = 90

    # --- logo lockup (gradient tile + wordmark) ---
    tile = 96
    _gradient(img, (margin, margin, margin + tile, margin + tile), AMBER, ORANGE)
    draw.text((margin + tile / 2, margin + tile / 2), "B",
              font=_font(_BOLD, 64), fill=CREAM, anchor="mm")
    draw.ellipse((margin + tile - 22, margin + 12, margin + tile - 8, margin + 26), fill=CREAM)
    draw.text((margin + tile + 24, margin + 16), "B Digital", font=_font(_BOLD, 46), fill=CREAM)
    draw.text((margin + tile + 26, margin + 72), "WEB · ADS · BRANDING",
              font=_font(_REG, 22), fill=MUTED)

    # --- headline (centred) ---
    head_font = _font(_BOLD, 84)
    lines = _wrap(draw, headline, head_font, SIZE - 2 * margin)
    line_h = head_font.getbbox("Ag")[3] + 20
    y = (SIZE - line_h * len(lines)) // 2 + 30
    for line in lines:
        draw.text((margin, y), line, font=head_font, fill=CREAM)
        y += line_h

    _gradient(img, (margin, y + 12, margin + 260, y + 26), AMBER, ORANGE)

    # --- footer CTA ---
    draw.text((margin, SIZE - margin - 74), "Websites from N$1,500",
              font=_font(_BOLD, 34), fill=AMBER)
    draw.text((margin, SIZE - margin - 30), "WhatsApp +264 81 479 4693 · Windhoek",
              font=_font(_REG, 28), fill=MUTED)

    out = GEN_DIR / out_name
    img.save(out, "PNG")
    return out
