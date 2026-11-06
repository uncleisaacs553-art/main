# NSSCO Economics Study Dashboard

Open `index.html` in any browser (double-click it). It works offline. Progress is saved in the browser's localStorage.

## Adding content
All content is in the first `<script>` block of `index.html`:

- `THEMES[n].notes`: HTML notes. Use `[[dia:NAME]]` to insert a diagram from `DIAGRAMS`.
- `FLASHCARDS[themeId]`: add `["Term","Definition"],`
- `QUIZZES[themeId]`: add `{q:"Question?", o:["A","B","C","D"], a:1, e:"Why B is right."},` (`a` counts from 0)
- `EXAMS`: copy a whole mock paper object, give it a new `id` (e.g. `"p1c"`), and edit the questions.
  Each part is `{l:"(a)", q:"...", m:2, cw:"Define", scheme:["point (1)","point (1)"], model:"..."}`.

Keep the commas between items. If the page goes blank after an edit, a comma or quote is missing.
