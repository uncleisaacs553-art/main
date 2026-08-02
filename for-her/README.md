# She's Mine, Pt. 1

A one-page love letter — our photos, our song, and the things I don't say out loud enough.

## Files

| File | What it is |
| --- | --- |
| `template.html` | The page source. **Edit this** — all the words, captions and the letter live here. |
| `build.py` | Inlines the fonts and photos as base64 and writes the two outputs below. |
| `index.html` | Complete standalone page. Open it in any browser, email it, or host it anywhere. |
| `artifact.html` | Same page as a fragment, for publishing as a Claude Artifact. |
| `assets/photos/` | The five photos, resized to WebP. |
| `assets/fonts/` | Instrument Serif / Instrument Sans / Nothing You Could Do / Red Hat Mono, subset to Latin (OFL licences included). |

## Changing anything

1. Edit `template.html` — captions are in the `<figcaption>` blocks, the letter is in the `.letter` section.
2. Run `python3 build.py`.
3. Open `index.html`.

To swap a photo, drop a new one into `assets/photos/` under the same filename and rebuild.

## About the song

The page can't ship the actual recording of "She's Mine, Pt. 1" — it's J. Cole's, not mine to
redistribute. Instead the player links straight out to Spotify, YouTube and Apple Music, and
**Play your own copy** will play an audio file from your own device right in the page, with the
visualiser reacting to it.
