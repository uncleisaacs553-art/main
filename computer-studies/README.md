# Computer Studies Paper 1 (6134/1) study tool

Open `index.html` in any browser. It needs no internet and no server. Progress is saved in the browser (Dashboard → Export/Import).

Tabs: Dashboard · Notes · Quiz · Past papers (Mock mode).

## Checks
- `node tests/test-core.js`: generators (1000 random cases each), truth tables, trace tables, question bank, past-paper rule.
- `node tests/browser-smoke3.js` and `node tests/browser-smoke4.js`: Playwright, 375 px and 1280 px (every topic, notes, full mock).

## Adding the real past papers
Fill `PAPERS[i].q` in the `<script id="data">` block with `{n:'1(a)', m:2, t:'net', cmd:'Describe', q:'…', p:['mark point', …]}`.
2023–2025 questions are used only in Mock mode (`Core.quizPool`); 2020–2022 questions also appear in topic quizzes.
