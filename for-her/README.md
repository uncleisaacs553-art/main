# for babe ♡

A soft pink paper love letter — one page, five photos, a little piano loop, and a lot of
handwriting. Opens as a sealed envelope; everything after that is hers to poke at.

## What's in it

| Section | What it does |
| --- | --- |
| The envelope | Sealed, waxed, addressed to her. Tapping it anywhere opens the flap and starts the music. |
| Hero | Her name, big, with a hand-drawn heart. |
| Our song | *She's Mine, Pt. 1* linked out to Spotify / YouTube / Apple Music, plus a player for the little loop that's already playing. Docks into a mini-player once you scroll past, so pause is always one tap away. |
| The pinboard | The five photos as taped polaroids. Tap one to flip it over and read the note on the back. |
| A jar of reasons | 24 folded notes. Pull one out at a time; the jar empties as she reads, and there's a message when she's read them all. |
| The love-o-meter | A slider that refuses to stop at 100%. |
| The letter | The real one, revealed line by line. |
| Tap the heart | Bursts, counts, and remembers how many times she's tapped (saved on her device). |

Petals drift up the whole page and little hearts follow the cursor on desktop. All of it stops
dead if the device asks for reduced motion.

Built to run on an entry-level Android phone: particle count and pixel ratio drop on small or
low-core devices, the full-screen grain layer and the big shadows are dropped under 760 px, tilts
use `transform` rather than the newer `rotate`/`translate` properties, and reveals run off a
throttled scroll pass instead of an IntersectionObserver so a fast flick can never leave a section
stuck invisible. Measured at ~56 fps scrolling under 6x CPU throttling.

## The music

**Put the song at `assets/song.mp3`** and run `python3 build.py` — it gets inlined and plays in the
background from the moment the envelope opens. The mp3 itself is **not committed** (see
`.gitignore`), but the built `index.html` is, song and all, because that file is what gets served
as the live site.

It rides at the very end of the document rather than in a `data:` URI at the top, so the letter
paints and becomes tappable while those megabytes are still arriving. If she taps the envelope
before the song is down, the piano below starts and the song takes over the moment it lands.

**With no song file, the page plays an original piece written in Web Audio** — a music-box piano
arpeggio over a soft pad, ~70 BPM, four chords on a loop, with a little timing jitter so it never
sounds like a machine. No audio file, nothing copyrighted, about 60 lines of JavaScript. It is also
the automatic fallback if the browser refuses to play the mp3.

Two more ways to reach the real track: the **Spotify / YouTube / Apple Music** buttons, and
**play my own copy**, which loads an audio file off her device and remembers it (IndexedDB) so it
starts by itself next time.

## Files

| File | What it is |
| --- | --- |
| `template.html` | The source. **Edit this** — captions, the 24 reasons, and the letter all live here. |
| `build.py` | Inlines the fonts, photos and optional song as base64 and writes the two outputs. |
| `index.html` | Complete standalone page. Open in any browser, host it anywhere, works offline. |
| `artifact.html` | The same page as a fragment, for publishing as a Claude Artifact. |
| `assets/photos/` | The five photos as WebP. |
| `assets/fonts/` | Gloock, Lora, Nothing You Could Do, Arsenal SC — subset to Latin, OFL licences included. |

## Changing anything

1. Edit `template.html`
   - photo captions and the notes on the back: the `.board` section
   - the 24 reasons: the `REASONS` array in the script
   - the letter: the `.letter-paper` section
2. `python3 build.py`
3. Open `index.html`

To swap a photo, put a new one at `assets/photos/<same-name>.webp` and rebuild.
