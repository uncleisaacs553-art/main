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

## The music

The page plays **an original piece written in Web Audio** — a music-box piano arpeggio over a soft
pad, ~70 BPM, four chords on a loop, with a little timing jitter so it never sounds like a machine.
No audio file, nothing copyrighted, about 60 lines of JavaScript.

*She's Mine, Pt. 1* itself is J. Cole's to distribute, not ours, so it isn't baked into the page.
Two ways to hear the real thing instead:

- The **Spotify / YouTube / Apple Music** buttons open it directly.
- **Play my own copy** loads an audio file off the device and plays it in the page instead of the
  loop. It's remembered (IndexedDB), so on that device it starts by itself next time.

Want your own copy baked in permanently? Drop it at `assets/song.mp3` (`.m4a`, `.ogg` and `.wav`
work too) and run `python3 build.py` — it gets inlined and becomes the background track. That file
is yours and is deliberately not committed here.

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
