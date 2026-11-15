# Learner's Licence Trainer

A study app for the Namibian learner's licence test (Codes 1, 2 and 3), built from two
practice papers ("Test 1" and "Test 3") and the Namibian Learner's & Driving Licence Manual.

## What is in it

- **Both papers, checked.** Every answer on Test 1 and Test 3 was verified against the manual.
  Twelve pen marks on the scanned papers are wrong (one on Test 1, eleven on Test 3). The app
  shows the verified answer, explains it, and warns where the pen mark differs.
- **All 495 numbered signs** from the manual (signs, road markings and signals), with names,
  short meanings and "do not confuse with" groups.
- **126 extra drills** on the numbers and rules the papers ask about (speed limits, distances,
  vehicle sizes, hand signals, towing, accidents, freeways, licence facts).
- **Timed mock exams** in the paper format (79 questions, 60 minutes) and the reported
  computer format (64 questions, each section passed separately).
- **Mastery tracking.** An item counts as mastered after two correct answers in a row. Wrong
  answers come back in the same session and stay on a weak list.
- **Find the control.** A tap-the-part dashboard drawing for the vehicle controls section.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup and styles. Written as an artifact page body, so it has no doctype or head. |
| `app.js` | All app logic. No framework, no build step. |
| `build/signs_meta.py` | Sign categories, cleaned names, meanings and look-alike groups. |
| `build/build_data.py` | Builds `data/bank.js` and `data/img.js` from the question bank and the sign images. |
| `build/make_standalone.py` | Builds `dist/learners-licence-trainer.html`, one self-contained file that works offline. |

### Not in this repository

This repository is public, so the material taken from the manual and the practice papers is
kept out of it (see `.gitignore`):

- `assets/` sign images cropped from the manual and a few crops from the papers
- `build/questions.py` the question bank, which quotes the papers' questions
- `data/` and `dist/`, which are generated from the two items above

The published page holds the complete built app, including `data/bank.js` and `data/img.js`.

## Rebuilding

With `assets/` and `build/questions.py` in place:

```sh
cd learners-licence/build
python3 build_data.py ../assets/signs_raw.json ../assets/webp ../data
python3 make_standalone.py
```

## Answers that are not certain

Thirteen questions carry a "check this one" note in the app because the manual does not settle
them word for word (for example Test 3 questions 12, 19, 27, 29, 59, 60 and 83). They are listed
on the app's "Answer-key traps" screen. Ask a driving instructor about them if possible.

## Source material

The sign images and the facts come from the owner's own copy of the manual and practice papers.
This is a personal study aid and is not an official NaTIS or Roads Authority product.
