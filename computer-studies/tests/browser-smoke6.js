// Dashboard: every card, at 375 px and 1280 px, light and dark, and at different times before the exam.
// Run: node tests/browser-smoke6.js [folder for screenshots]
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
const OUT = process.argv[2] || os.tmpdir();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const T = s => Date.parse(s + '+02:00'); // Namibia time

const mk = arr => ({ r: arr.map(x => [x, 1]), e: arr.reduce((a, b) => a + b, 0), m: arr.length, n: arr.length });
const rep = (ok, n) => Array.from({ length: n }, (_, i) => (Math.floor((i + 1) * ok / n) > Math.floor(i * ok / n) ? 1 : 0)); // spread evenly
const SEED = {
  v: 1, created: T('2026-11-06T08:00:00'), done: 212, seen: {}, plan: {}, goal: 30,
  t: {
    num: mk([0, 1, 0, 1, 1, 1, 1, 1, 1, 1]),            // 80%, getting better
    hexuse: mk(rep(3, 5)), err: mk(rep(9, 20)), chk: mk(rep(8, 10)),
    logic: mk([0, 0, 1, 0, 1, 1, 1, 1, 1, 1]),          // 70%, getting better
    cpu: mk([1, 1, 1, 0, 1, 0, 0, 0, 0, 0]),            // 40%, getting worse
    algo: mk(rep(17, 20)), trace: mk(rep(11, 20)), test: mk(rep(6, 6)),
    sheet: mk(rep(15, 20)), db: mk(rep(13, 20)), valid: mk(rep(5, 10)),
    io: mk(rep(8, 10)), stor: mk(rep(3, 10)), net: mk(rep(5, 8)),
    sdlc: mk(rep(9, 20)), sec: mk(rep(7, 8))
  },
  f: { hexgrid: mk(rep(3, 5)), parity: mk(rep(7, 8)), describe: mk(rep(4, 10)) },
  miss: { nt1: 1, sc3: 1, va1: 1 }, missGen: { bin2hex: 2 },
  mocks: [
    { pid: 'x1', name: 'Practice paper 1', score: 58, max: 100, date: T('2026-11-07T12:00:00'), th: { '4A': [9, 12], '4B': [10, 22], '4C': [9, 17], '3': [11, 18], '5': [12, 20], '12': [7, 11] } },
    { pid: 'x2', name: 'Practice paper 2', score: 66, max: 100, date: T('2026-11-08T12:00:00'), th: { '4A': [10, 12], '4B': [13, 22], '4C': [11, 17], '3': [12, 18], '5': [13, 20], '12': [7, 11] } }
  ],
  days: {
    '2026-11-06': { n: 42, e: 30, m: 48, s: 2400 }, '2026-11-07': { n: 71, e: 88, m: 150, s: 11000 },
    '2026-11-08': { n: 64, e: 97, m: 140, s: 10400 }, '2026-11-09': { n: 22, e: 17, m: 24, s: 1500 }
  }
};
const W = { num: 3, hexuse: 1, err: 2, chk: 1, comp: 1, logic: 4, cpu: 3, intr: 1, algo: 3, trace: 3, test: 2, sheet: 3, db: 3, valid: 2, io: 4, stor: 4, net: 4, os: 2, sdlc: 2, apps: 2, sec: 4 };
function expectedScore() { let sw = 0, s = 0; for (const k in SEED.t) { const p = Math.round(100 * SEED.t[k].e / SEED.t[k].m); sw += W[k]; s += W[k] * p; } return Math.round(s / sw); }

(async () => {
  const b = await chromium.launch(); const errs = [];
  const fail = m => errs.push(m);
  async function open(w, hgt, scheme, now, seed) {
    const ctx = await b.newContext({ viewport: { width: w, height: hgt }, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', e => fail(`${w} ${scheme} pageerror: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') fail(`${w} console: ${m.text()}`); });
    await p.addInitScript(([fake, sd]) => {
      const real = Date.now.bind(Date), off = fake - real(); Date.now = () => real() + off;
      if (sd !== null && !sessionStorage.getItem('seeded')) { localStorage.setItem('cs6134-progress-v1', sd); sessionStorage.setItem('seeded', '1'); }
    }, [now, seed === undefined ? JSON.stringify(SEED) : seed]);
    await p.goto(URL);
    return p;
  }
  const ov = async (p, tag) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) fail(`overflow ${o}px on ${tag}`); };
  const txt = (p, sel) => p.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim());

  // ---------- 1. every phase of the countdown ----------
  const PH = [
    ['early', '2026-11-07T10:00:00', /3 days to go/, /Weak spot: Validation vs verification/],
    ['eve', '2026-11-09T15:00:00', /tomorrow morning\. Fix your weak spots/, /Fix your mistakes/],
    ['night', '2026-11-09T23:20:00', /The exam is tomorrow at 09:00/, /Time to sleep/],
    ['night2', '2026-11-10T01:00:00', /The exam is today at 09:00/, /Time to sleep/],
    ['morning', '2026-11-10T06:30:00', /this morning\. Read your reminder cards/, /Read your reminder cards/],
    ['soon', '2026-11-10T08:30:00', /Almost time/, /Read your reminder cards/],
    ['exam', '2026-11-10T09:30:00', /The exam has started/, /Good luck!/],
    ['after', '2026-11-10T12:00:00', /The exam is over/, null]
  ];
  for (const [name, when, heroRe, nextRe] of PH) {
    const p = await open(375, 740, 'light', T(when));
    const hero = await txt(p, '.hero'); if (!heroRe.test(hero)) fail(`${name}: hero says "${hero}"`);
    const hidden = await p.$eval('#nextCard', e => e.hidden);
    if (nextRe === null) { if (!hidden) fail(name + ': next card should be hidden'); }
    else { const nx = await txt(p, '#nextCard'); if (!nextRe.test(nx)) fail(`${name}: next card says "${nx}"`); }
    if (name === 'eve') { const cd = await txt(p, '#cd'); if (!/^18 hours 00 min 00 sec$|^17 hours 59 min 5\d sec$/i.test(cd)) fail('eve countdown: ' + cd); }
    if (name === 'early') { const cd = await txt(p, '#cd'); if (!/^2 days 2[23] hours/i.test(cd)) fail('early countdown: ' + cd); }
    await ov(p, 'phase ' + name);
    await p.context().close();
  }

  // ---------- 2. full dashboard with data: sizes and themes ----------
  for (const [w, hgt, scheme] of [[375, 740, 'light'], [375, 740, 'dark'], [1280, 900, 'light'], [1280, 900, 'dark']]) {
    const p = await open(w, hgt, scheme, T('2026-11-09T15:00:00'));
    await ov(p, `dash ${w} ${scheme}`);
    const wide = await p.evaluate(() => [...document.querySelectorAll('#tab-dash *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1); }).map(e => e.tagName + '.' + e.className).slice(0, 5));
    if (wide.length) fail(`${w} ${scheme} elements outside the screen: ${wide.join(', ')}`);
    await p.screenshot({ path: path.join(OUT, `dash6-${w}-${scheme}.png`), fullPage: true });
    if (w === 375 && scheme === 'light') {
      // numbers
      if (await txt(p, '#stDone') !== '212') fail('questions done: ' + await txt(p, '#stDone'));
      const ring = await txt(p, '.ring-c b'); if (ring !== expectedScore() + '%') fail(`ring ${ring}, expected ${expectedScore()}%`);
      const facts = await txt(p, '.facts');
      if (!/17 of 21 topics tried/.test(facts)) fail('facts: ' + facts);
      if (!/5 mistakes to fix/.test(facts)) fail('mistakes: ' + facts);
      const legend = await txt(p, '#scoreOut .legend'); if (!/4 not tried/.test(legend)) fail('legend: ' + legend);
      const today = await txt(p, '#goalOut'); if (!/22 of 30 questions/.test(today) || !/71% correct today/.test(today) || !/4 days in a row/.test(today)) fail('today: ' + today);
      if (await txt(p, '#todayDate') !== 'Mon 9 Nov') fail('today date: ' + await txt(p, '#todayDate'));
      const week = await p.$eval('.week', e => e.getAttribute('aria-label')); if (!/Fri 42, Sat 71, Sun 64, today 22/.test(week)) fail('week: ' + week);
      // weak list: seeded weak spots first, parity is fixed
      const weak = await txt(p, '#weakList');
      if (!/^Known weak spot Binary → hex grouping/.test(weak)) fail('weak list does not start with the seeded spots: ' + weak.slice(0, 80));
      if (!/✓ Fixed: The parity bit/.test(weak)) fail('parity should be fixed');
      const firstTopic = await p.$$eval('#weakList .wrow', rows => rows.filter(r => !r.querySelector('.tag')).map(r => r.querySelector('.wname').textContent)[0]);
      if (firstTopic !== 'Storage & memory') fail('weak topics should start with the biggest loss (Storage): ' + firstTopic);
      // bars: one row per topic, trend arrows, sort
      if ((await p.$$('#bars .trow')).length !== 21) fail('21 topic rows expected');
      const cpu = await txt(p, '#bars [data-t=cpu] .trow-pc'); if (cpu !== '▼ 40%') fail('cpu row: ' + cpu);
      const logic = await txt(p, '#bars [data-t=logic] .trow-pc'); if (logic !== '▲ 70%') fail('logic row: ' + logic);
      const fillW = await p.$eval('#bars [data-t=stor] .fill', e => e.getBoundingClientRect().width / e.parentNode.getBoundingClientRect().width);
      if (Math.abs(fillW - 0.30) > 0.01) fail('stor bar width ' + fillW);
      await p.click('#barSort [data-s=weak]');
      const order = await p.$$eval('#bars .trow', r => r.map(x => x.dataset.t));
      if (order[0] !== 'stor' || order[1] !== 'cpu' || order[20] !== 'comp' && !['comp', 'intr'].includes(order[20])) fail('weakest-first order: ' + order.join());
      if (order.slice(17).sort().join() !== 'apps,comp,intr,os') fail('not-tried topics should be last: ' + order.slice(17).join());
      await p.click('#bars [data-t=stor] .trow-btn');
      const more = await txt(p, '#bars [data-t=stor] .trow-more'); if (!/3 full marks · 0 part marks · 7 no marks/.test(more)) fail('row detail: ' + more);
      await ov(p, 'row open'); await p.screenshot({ path: path.join(OUT, 'dash6-rowopen.png') });
      await p.click('#bars [data-t=stor] .trow-more button.ghost');   // Read the notes
      if (!(await p.$eval('#notesOut .topic[data-topic=stor]', e => e.open))) fail('notes did not open at Storage');
      await p.click('[data-tab=dash]');
      // mock card
      const mock = await txt(p, '#mockScores'); if (!/Practice paper 2 8 Nov best 66\/100/.test(mock) || !/Theme 4B/.test(mock) || !/Start Practice paper 3/.test(mock)) fail('mock card: ' + mock);
      // reminder cards
      const N = await p.evaluate(() => REMINDERS.length);
      if (await txt(p, '#remPos') !== '0 of ' + N + ' known') fail('cards start: ' + await txt(p, '#remPos'));
      if (await p.$('#remBody .rem-a')) fail('answer should be hidden first');
      const q1 = await txt(p, '#remBody .rem-q');
      await p.click('#remBtns [data-main]'); if (!(await p.$('#remBody .rem-a'))) fail('answer not shown');
      await p.click('text=✗ I forgot');                                   // card 1 stays unknown
      if (await txt(p, '#remPos') !== '0 of ' + N + ' known') fail('forgot should not count');
      if (await txt(p, '#remBody .rem-q') === q1) fail('did not move to the next card');
      for (let i = 0; i < N - 1; i++) { await p.click('#remBtns [data-main]'); await ov(p, 'card ' + i); await p.click('#remBtns [data-main]'); }   // know cards 2..N
      if (await txt(p, '#remPos') !== (N - 1) + ' of ' + N + ' known') fail('known count: ' + await txt(p, '#remPos'));
      if (await txt(p, '#remBody .rem-q') !== q1) fail('the forgotten card should come back');
      await p.reload();                                                    // saved
      if (await txt(p, '#remPos') !== (N - 1) + ' of ' + N + ' known') fail('known cards not saved');
      if (await txt(p, '#remBody .rem-q') !== q1) fail('after reload the first unknown card should show');
      await p.click('#remBtns [data-main]'); await p.click('#remBtns [data-main]');
      if (!/You know all/.test(await txt(p, '#remBody'))) fail('all-known state missing');
      await p.screenshot({ path: path.join(OUT, 'dash6-cards-done.png') });
      await p.click('#remBtns [data-main]'); if (await txt(p, '#remPos') !== '0 of ' + N + ' known') fail('start again');
      await p.click('#remBtns [data-main]'); await p.click('text=Read the note');
      if (!(await p.$eval('#notesOut .topic[data-topic=cpu]', e => e.open))) fail('card note did not open');
      await p.click('[data-tab=dash]');
      // goal
      await p.click('#goalOut .seg button >> nth=0');
      if (!/22 of 20 questions ✓ goal done/.test(await txt(p, '#goalOut'))) fail('goal 20: ' + await txt(p, '#goalOut'));
      if ((await p.evaluate(() => JSON.parse(localStorage.getItem('cs6134-progress-v1')).goal)) !== 20) fail('goal not saved');
      // next step → quiz → day log + plan tick
      const nx = await txt(p, '#nextCard'); if (!/Fix your mistakes/.test(nx) || !/5 questions/.test(nx)) fail('next: ' + nx);
      await p.click('#planOut button.small:not(.ghost) >> nth=1');             // "Weak spot: life cycle stages" (plan task d2)
      for (let i = 0; i < 8; i++) {
        if (await p.$('#quizRun textarea')) { await p.fill('#quizRun textarea', 'x'); await p.click('text=Mark my answer'); await p.click('text=Save my mark'); }
        else await p.click('#quizRun .choices button');
        await p.click('button:has-text("Next question"), button:has-text("See my score")');
      }
      const st = await p.evaluate(() => JSON.parse(localStorage.getItem('cs6134-progress-v1')));
      if (st.days['2026-11-09'].n !== 30) fail('day log should be 30, is ' + st.days['2026-11-09'].n);
      if (st.done !== 220) fail('done should be 220, is ' + st.done);
      if (!st.plan.d2) fail('plan task d2 should be ticked by itself');
      await p.click('[data-tab=dash]');
      if (!(await p.$eval('#planOut input[type=checkbox] >> nth=1', e => e.checked))) fail('plan checkbox not ticked');
      if (!/30 of 20 questions/.test(await txt(p, '#goalOut'))) fail('today after quiz: ' + await txt(p, '#goalOut'));
      await ov(p, 'after quiz');
    }
    await p.context().close();
  }

  // ---------- 3. empty state (new learner) ----------
  for (const [w, hgt] of [[375, 740], [1280, 900]]) {
    const p = await open(w, hgt, 'light', T('2026-11-09T15:00:00'), null);
    await ov(p, 'empty ' + w);
    if (await txt(p, '.ring-c b') !== '–') fail('empty ring');
    if (await txt(p, '#stDone') !== '0') fail('empty done');
    if (!/Weak spot: Binary → hex grouping/.test(await txt(p, '#nextCard'))) fail('empty next: ' + await txt(p, '#nextCard'));
    if (!/Start Practice paper 1/.test(await txt(p, '#mockScores'))) fail('empty mock');
    await p.screenshot({ path: path.join(OUT, `dash6-empty-${w}.png`), fullPage: true });
    await p.click('#nextGo'); if (!(await p.$('#quizRun .card'))) fail('next button did not start a quiz');
    await p.context().close();
  }

  // ---------- 4. an older save (before this update) still loads ----------
  {
    const old = JSON.stringify({ v: 1, created: 1, done: 3, t: { num: { r: [[0, 1], [1, 1], [0, 1]], e: 1, m: 3, n: 3 } }, f: {}, seen: {}, mocks: [{ pid: 'x1', name: 'Practice paper 1', score: 40, max: 100, date: T('2026-11-06T12:00:00') }] });
    const p = await open(375, 740, 'light', T('2026-11-09T23:20:00'), old);
    if (await txt(p, '#stDone') !== '3') fail('old save not loaded');
    if (!/Practice paper 1 6 Nov 40\/100/.test(await txt(p, "#mockScores"))) fail("old mock not shown: " + await txt(p, "#mockScores"));
    await ov(p, 'old save'); await p.screenshot({ path: path.join(OUT, 'dash6-night.png'), fullPage: true });
    await p.context().close();
  }

  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
