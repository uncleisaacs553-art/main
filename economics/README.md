# NSSCO Economics 6145 study game

Open `nssco-economics.html` in any browser. It is one file with inline CSS and JavaScript: no internet, no server, no build step. Progress is saved in the browser (tap the bar at the top → Backup and reset).

## The six tabs
1. **Predicted**: 26 topics in two lists, "Near-certain" and "Due for return", each with a likelihood tag, model answers and a drill button. Tick the years (2020–2025) a topic appears in your own papers: 4 or more ticks moves it to Near-certain, no tick in 2024 or 2025 moves it to Due for return.
2. **Quiz**: question → Show answer → mark yourself (Correct / Half / Missed) → next. Theme chips, rounds of 10, 20 or All, Survival (3 lives), Retry missed. Ends with score, % and letter grade. Per-theme stats are saved.
3. **My Traps**: the nine personal traps, wrong vs correct side by side, plus the rule. "Trap or Truth" game: three right in a row defuses a trap. New traps can be logged.
4. **Diagrams**: Curve lab (the four shift rules, animated), Shift challenge game, the demand vs supply table, the 7-point drawing checklist, six classic scenarios.
5. **Notes**: 184 definitions in mark-scheme wording, in 9 themes, as collapsible `<details>`. Search and a self-test mode.
6. **Section B + Paper 2**: paper structures, time plan, the Discuss / Evaluate template, marker's rules, "Be the examiner" game, five worked questions.

Game layer: XP and levels, combos, a daily streak, three daily missions and eight badges.

## Where the content comes from
The official 2020–2025 papers and mark schemes were not available when this was built. So:
- The 328 built-in questions are **exam-style**: written to the 6145 format with mark-scheme answers. They are labelled "Exam-style" and carry no year.
- The Predicted tags start as **estimates** from the syllabus and the paper format, and say so. Ticked years replace the estimate with a real count.
- Real past-paper questions are added in the app: Quiz → "Add a real past-paper question" (theme, year, paper, marks, question, mark scheme). They are saved in the browser and come up first in every round.

To build real questions into the file itself, add them to `QS` in the `<script id="data">` block: `{id:"p23-1", t:"dse", m:2, q:"…", a:"… (1) … (1)", r:"marker's restriction"}`.

## Checks
- `node tests/test-core.js`: content (140+ questions, every answer shows where each mark falls, every Discuss question flags the one-sided cap) and logic (grades, levels, streak, predicted sorting, diagram geometry against the four shift rules, saved state surviving broken data).
- `node tests/browser-smoke.js [folder]`: Playwright, offline, at 375 px and 1280 px. Plays every tab, checks no sideways scroll and tap-target sizes, and reloads to confirm saving. Also runs with storage throwing, with saving failing, and with broken saves.
