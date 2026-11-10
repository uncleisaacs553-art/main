# Computer Studies Paper 1 (6134/1) study tool

Open `index.html` in any browser. It needs no internet and no server. Progress is saved in the browser (Dashboard → Export/Import).

Tabs: Dashboard · Notes · Quiz · Past papers (Mock mode).

## Dashboard
- Exam card with the countdown. The advice changes with the time (2+ days left, the day before, late at night, exam morning).
- **Do this next**: one step chosen from the learner's own results (mistakes, known weak spots, weak big topics, mock papers).
- **Road to 60**: an estimated mark from the quiz results (each topic's share of the paper = its weight; topics not tried are counted lower), with the topics where marks can be won fastest. It is an estimate, not a promise.
- **In the exam: how to win marks**, **Reminder cards** (28 cards: booklet corrections, weak spots, key facts; "I knew it / I forgot").
- My score (ring), Weak topics (Re-test now), Today (daily goal + plan), Score per topic (bar chart: 80% target line, trend, tap for detail), Last 7 days, Mock papers, Save your progress.
- Notes also has a **10-minute sheet** and a **Model answers to read** page (built from the question bank).

## Checks
- `node tests/test-core.js`: generators (1000 random cases each), truth tables, trace tables, question bank, past-paper rule, dashboard maths (score, trend, streak, estimated mark), reminder cards.
- `node tests/browser-smoke3.js`, `browser-smoke4.js`, `browser-smoke5.js`: Playwright at 375 px and 1280 px (every topic, notes, full mock, mistakes review, Mark this answer, study plan, old saves).
- `node tests/browser-smoke6.js [folder]`: the Dashboard at 375 px and 1280 px, light and dark, at every phase before the exam, with data, empty, and with an old save.

## Adding the real past papers
Fill `PAPERS[i].q` in the `<script id="data">` block with `{n:'1(a)', m:2, t:'net', cmd:'Describe', q:'…', p:['mark point', …]}`.
2023–2025 questions are used only in Mock mode (`Core.quizPool`); 2020–2022 questions also appear in topic quizzes.
