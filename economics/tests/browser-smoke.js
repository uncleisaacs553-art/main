// Run: node tests/browser-smoke.js [folder for screenshots]
// Opens nssco-economics.html from the file system (offline) at phone and desktop width and plays through every tab.
'use strict';
const { chromium } = require('playwright');
const path = require('path'), os = require('os'), fs = require('fs');
const OUT = process.argv[2] || os.tmpdir();
const URL = 'file://' + path.resolve(__dirname, '..', 'nssco-economics.html');
const KEY = 'nssco-econ-6145-v1';

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('FAIL', msg); } }

async function open(browser, width, height, init) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, offline: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.goto(URL);
  return { ctx, page, errors, requests };
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const tab = (page, id) => page.click('#tb-' + id);
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);

async function run(browser, width, height) {
  const tag = width + 'px';
  const { ctx, page, errors, requests } = await open(browser, width, height);

  // ----- shell -----
  ok(requests.every(u => u.startsWith('file://')), tag + ' no network requests: ' + requests.filter(u => !u.startsWith('file://')).join(' '));
  ok(await page.locator('#tabs button').count() === 6, tag + ' six tabs');
  ok((await page.locator('#tabs button').allTextContents()).join('|') === 'Predicted|Quiz|My Traps|Diagrams|Notes|Section B + Paper 2', tag + ' tab names');
  ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(13, 17, 23)', tag + ' dark background');
  ok(await page.evaluate(() => getComputedStyle(document.body).fontSize) === '16px', tag + ' 16px base');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.top')).position) === 'sticky', tag + ' sticky top bar');
  ok(await page.evaluate(() => { const n = document.getElementById('tabs'); return getComputedStyle(n).overflowX === 'auto'; }), tag + ' tab bar scrolls');
  if (width < 500) ok(await page.evaluate(() => { const n = document.getElementById('tabs'); return n.scrollWidth > n.clientWidth; }), tag + ' tab bar is wider than the phone and scrolls sideways');
  ok(await page.evaluate(() => [...document.querySelectorAll('#tabs button')].every(b => b.getBoundingClientRect().height >= 44)), tag + ' tab tap targets');

  // ----- every tab renders and fits -----
  for (const id of ['pred', 'quiz', 'traps', 'diag', 'notes', 'long']) {
    await tab(page, id);
    ok(await page.locator('#tab-' + id).isVisible(), tag + ' tab ' + id + ' visible');
    ok((await page.locator('#tab-' + id).innerText()).length > 200, tag + ' tab ' + id + ' has content');
    ok(await noOverflow(page), tag + ' no sideways scroll on ' + id);
    // open every collapsible and check again
    await page.evaluate(i => document.querySelectorAll('#tab-' + i + ' details').forEach(d => { d.open = true; }), id);
    ok(await noOverflow(page), tag + ' no sideways scroll on ' + id + ' with everything open');
    const small = await page.evaluate(i => [...document.querySelectorAll('#tab-' + i + ' button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim().slice(0, 30)), id);
    ok(small.length === 0, tag + ' tap targets on ' + id + ': ' + small.join(' | '));
    await page.evaluate(i => document.querySelectorAll('#tab-' + i + ' details').forEach(d => { d.open = false; }), id);
  }

  // ----- 1. predicted -----
  await tab(page, 'pred');
  ok(await page.locator('#tab-pred h2', { hasText: 'Near-certain' }).count() === 1 && await page.locator('#tab-pred h2', { hasText: 'Due for return' }).count() === 1, tag + ' predicted lists');
  ok(/estimate/.test(await page.locator('#tab-pred').innerText()), tag + ' estimates are labelled');
  const ppc = page.locator('details[data-k="p-ppc"]');
  await ppc.locator('summary').click();
  ok(/Medium · estimate/.test(await ppc.locator('summary').innerText()), tag + ' ppc starts as an estimate');
  for (const y of [2020, 2021, 2022, 2023]) await page.click('details[data-k="p-ppc"] .yr[data-y="' + y + '"]');
  ok(/4 of 6 years/.test(await ppc.locator('summary').innerText()), tag + ' tick count shown');
  ok(await page.evaluate(() => { const hs = [...document.querySelectorAll('#tab-pred .sech, #tab-pred details')]; const i = hs.findIndex(e => e.matches('details[data-k="p-ppc"]')); const j = hs.findIndex(e => e.textContent.includes('Due for return') && e.matches('.sech')); return i < j; }), tag + ' ppc moved into Near-certain');
  ok(await ppc.evaluate(d => d.open), tag + ' card stays open after the move');
  ok(await ppc.locator('.qa').count() >= 2, tag + ' model answers shown');
  await page.click('details[data-k="p-ppc"] [data-act="pred-ok"]');
  ok((await saved(page)).pred.ppc.ok === true, tag + ' "I can do this" saved');
  await page.click('details[data-k="p-ppc"] [data-act="pred-drill"]');
  ok(/Topic drill/.test(await page.locator('#tab-quiz .qhud').innerText()), tag + ' drill opens the quiz');
  await page.click('[data-act="qz-quit"]');

  // ----- 2. quiz: full round, flow = question -> show answer -> self-mark -> next -----
  await tab(page, 'quiz');
  ok(/3\d\d questions/.test(await page.locator('#tab-quiz .hero').innerText()), tag + ' question count');
  await page.click('[data-act="qz-theme"][data-id="dse"]');
  await page.click('[data-act="qz-start"][data-mode="practice"]');
  for (let i = 0; i < 10; i++) {
    ok(await page.locator('[data-act="qz-mark"]').count() === 0, tag + ' no marking before the answer is shown q' + i);
    ok(/Demand & supply/.test(await page.locator('#tab-quiz .card .tags').innerText()) && /Exam-style/.test(await page.locator('#tab-quiz .card .tags').innerText()), tag + ' theme + source tags q' + i);
    await page.click('[data-act="qz-show"]');
    ok(await page.locator('#tab-quiz .ans .mk').count() >= 1, tag + ' mark pills in the answer q' + i);
    await page.click('[data-act="qz-mark"][data-r="' + (i < 8 ? 'ok' : 'miss') + '"]');
  }
  const end = await page.locator('#tab-quiz').innerText();
  ok(/Round complete/.test(end) && /8 of 10/.test(end) && /\d+%/.test(end), tag + ' end screen with score and percent');
  ok(/^(A\*|A|B|C|D|E|F|G|U)$/.test((await page.locator('.ring b').innerText()).trim()), tag + ' letter grade');
  ok(/Missed this round/.test(end), tag + ' missed list');
  let st = await saved(page);
  ok(st.th.dse && st.th.dse.n === 10 && st.th.dse.ok === 8 && st.th.dse.max > 0, tag + ' per-theme stats saved');
  ok(Object.keys(st.miss).length === 2, tag + ' missed questions saved');
  ok(st.xp > 0 && st.badges.first === 1, tag + ' xp and badge saved');
  await page.screenshot({ path: path.join(OUT, 'quiz-end-' + width + '.png'), fullPage: false });
  await page.click('[data-act="qz-new"]');
  ok(/%/.test(await page.locator('[data-act="qz-theme"][data-id="dse"]').innerText()), tag + ' theme chip shows the saved percent');
  // survival: three misses end the run
  await page.click('[data-act="qz-start"][data-mode="survival"]');
  for (let i = 0; i < 3; i++) { await page.click('[data-act="qz-show"]'); await page.click('[data-act="qz-mark"][data-r="miss"]'); }
  ok(/Survival over/.test(await page.locator('#tab-quiz').innerText()), tag + ' survival ends after 3 lives');
  await page.click('[data-act="qz-new"]');
  // add a real past-paper question
  await page.locator('details[data-k="q-add"] summary').click();
  await page.selectOption('#cq-t', 'mon'); await page.selectOption('#cq-y', '2023'); await page.selectOption('#cq-p', '2'); await page.fill('#cq-m', '2');
  await page.fill('#cq-q', 'Define barter. <b>x</b>'); await page.fill('#cq-a', 'exchange of goods for goods (1) without money (1)');
  await page.click('[data-act="cq-save"]');
  st = await saved(page);
  ok(st.custom.length === 1 && st.custom[0].yr === 2023 && st.custom[0].p === 2, tag + ' own question saved');
  ok(await page.locator('#tab-quiz b', { hasText: 'x' }).count() === 0, tag + ' typed html is not executed');
  await page.click('[data-act="qz-theme"][data-id="mon"]');
  await page.click('[data-act="qz-start"][data-mode="practice"]');
  let foundOwn = false;
  for (let i = 0; i < 10; i++) {
    if (/2023 Paper 2/.test(await page.locator('#tab-quiz .card .tags').innerText())) foundOwn = true;
    await page.click('[data-act="qz-show"]'); await page.click('[data-act="qz-mark"][data-r="ok"]');
  }
  ok(foundOwn, tag + ' own question appears with its year and paper');
  await page.click('[data-act="qz-new"]');

  // ----- 3. traps -----
  await tab(page, 'traps');
  ok(await page.locator('#tab-traps .card[id^="trap-"]').count() === 9, tag + ' nine traps');
  ok(await page.locator('#trap-t1 .vs .w').count() === 1 && await page.locator('#trap-t1 .vs .c').count() === 1, tag + ' wrong and right side by side');
  ok(await page.evaluate(() => { const w = document.querySelector('#trap-t1 .vs .w').getBoundingClientRect(), c = document.querySelector('#trap-t1 .vs .c').getBoundingClientRect(); return Math.abs(w.top - c.top) < 2 && c.left > w.right - 1; }), tag + ' the two boxes sit next to each other');
  ok(/wrong ×3/.test(await page.locator('#trap-t1').innerText()) && /Rule:/.test(await page.locator('#trap-t1').innerText()), tag + ' wrong count and rule');
  ok(await page.locator('#trap-t8 .vs').count() === 10, tag + ' ten mixed-up definitions');
  ok(await page.locator('#trap-t9 table tr').count() === 9, tag + ' command word table');
  await page.click('#trap-t1 [data-act="tg-start"]');
  for (let i = 0; i < 7; i++) {
    const truth = await page.evaluate(() => { const s = document.querySelector('#tab-traps .stmt').textContent.replace(/\u00a0/g, ' '); return window.EconData.TRAPQ.find(q => q.s === s).ok; });
    await page.click('[data-act="tg-pick"][data-v="' + (truth ? 1 : 0) + '"]');
    ok(/Correct\./.test(await page.locator('#tab-traps .fb').innerText()), tag + ' trap feedback ' + i);
    await page.click('[data-act="tg-next"]');
  }
  ok(/7 of 7 right/.test(await page.locator('#tab-traps .hero').innerText()), tag + ' trap game result');
  ok(/Defused/.test(await page.locator('#trap-t1 .tags').innerText()), tag + ' trap 1 defused');
  await page.click('[data-act="tg-quit"]');
  await page.click('#trap-t1 [data-act="trap-again"]');
  ok(/wrong ×4/.test(await page.locator('#trap-t1').innerText()) && /Armed/.test(await page.locator('#trap-t1 .tags').innerText()), tag + ' "fell for it again" re-arms and counts');
  await page.click('[data-act="tg-start"][data-id=""]');
  await page.click('[data-act="tg-pick"][data-v="1"]');
  ok(await page.locator('#tab-traps .fb').count() === 1, tag + ' mixed trap round answers');
  await page.click('[data-act="tg-quit"]');
  await page.locator('details[data-k="mt-add"] summary').click();
  await page.fill('#mt-title', 'Fixed vs variable'); await page.fill('#mt-wrong', 'rent is variable'); await page.fill('#mt-right', 'rent is fixed'); await page.fill('#mt-rule', 'Fixed does not change with output');
  await page.click('[data-act="mt-save"]');
  ok(/Fixed vs variable/.test(await page.locator('#tab-traps').innerText()) && (await saved(page)).myTraps.length === 1, tag + ' own trap logged');

  // ----- 4. diagrams -----
  await tab(page, 'diag');
  ok(await page.locator('.rule4 button').count() === 4, tag + ' four shift rules');
  ok((await page.locator('.rule4').innerText()).replace(/\s+/g, ' ').includes('Demand right → P ▲ up Q ▲ up'), tag + ' rule grid text');
  await page.click('.rule4 button[data-c="S"][data-d="L"]');
  await page.waitForFunction(() => document.querySelector('#lab-svg').textContent.includes('S2'));
  ok(/Supply shifts LEFT: price RISES, quantity FALLS/.test(await page.locator('#lab-cap').innerText()), tag + ' lab caption');
  await page.screenshot({ path: path.join(OUT, 'lab-shift-' + width + '.png'), fullPage: false });
  await page.click('[data-act="lab-reset"]');
  ok(!(await page.locator('#lab-svg').innerText()).includes('S2'), tag + ' lab reset');
  ok(await page.locator('#tab-diag table tr').count() === 8, tag + ' demand vs supply table');
  ok(await page.locator('#tab-diag .check').count() === 7, tag + ' seven checklist points');
  await page.locator('#tab-diag .check input').first().check();
  ok((await saved(page)).diag.chk.length === 1, tag + ' checklist saved');
  ok(await page.locator('#tab-diag details').count() === 6, tag + ' six classic scenarios');
  await page.locator('details[data-k="c-max"] summary').click();
  ok(/shortage/.test(await page.locator('details[data-k="c-max"] svg').textContent()), tag + ' max price diagram');
  await page.click('[data-act="dg-start"]');
  for (let i = 0; i < 8; i++) {
    const sc = await page.evaluate(() => { const s = document.querySelector('#dg .stmt').textContent; const x = window.EconData.SCEN.find(q => q.s === s); return { c: x.c, d: x.d, r: x.c === 'M' ? null : window.EconCore.shiftResult(x.c, x.d) }; });
    await page.click('#dg [data-act="dg-p1"][data-k="' + sc.c + sc.d + '"]');
    if (sc.c !== 'M') await page.click('#dg [data-act="dg-p2"][data-k="' + sc.r.p + sc.r.q + '"]');
    ok(/Fully right/.test(await page.locator('#dg .fb').innerText()), tag + ' shift challenge ' + i);
    await page.click('[data-act="dg-next"]');
  }
  ok(/of \d+ points?/.test(await page.locator('#dg').innerText()) && (await saved(page)).diag.best >= 8, tag + ' shift challenge result saved');

  // ----- 5. notes -----
  await tab(page, 'notes');
  ok(await page.locator('#nt-list > details').count() === 9, tag + ' nine themes as <details>');
  await page.fill('#nt-q', 'tariff');
  ok(await page.locator('#nt-list .def:visible').count() >= 2 && await page.locator('#nt-list .def:visible').count() < 12, tag + ' search filters');
  await page.fill('#nt-q', 'zzzz');
  ok(await page.locator('#nt-none').isVisible(), tag + ' empty search message');
  await page.fill('#nt-q', '');
  await page.locator('.toggle input').check();
  ok((await saved(page)).selftest === true && await page.locator('#nt-list.selftest').count() === 1, tag + ' self-test mode');
  await page.locator('.toggle input').uncheck();
  await page.locator('details[data-k="n-frm"] summary').click();
  await page.click('details[data-k="n-frm"] [data-act="nt-quiz"]');
  ok(await page.locator('[data-act="qz-theme"][data-id="frm"][aria-pressed="true"]').count() === 1, tag + ' notes -> quiz on that theme');

  // ----- 6. section B + paper 2 -----
  await tab(page, 'long');
  const lt = await page.locator('#tab-long').innerText();
  ok(/Maximum four if one-sided/.test(lt) && /Overall/.test(lt) && /\(a\)\(i\) Define/.test(lt) && /Section B/.test(lt), tag + ' structures and template');
  ok(await page.locator('#tab-long details').count() === 5, tag + ' five worked questions');
  await page.click('[data-act="ex-start"]');
  for (let i = 0; i < 9; i++) {
    const right = await page.evaluate(() => { const q = document.querySelector('#ex p b').textContent.replace(/\u00a0/g, ' '); const a = document.querySelector('#ex .student').textContent.replace(/\u00a0/g, ' '); return window.EconData.EXAM.find(e => e.q === q && e.ans === a).right; });
    await page.click('#ex [data-act="ex-pick"][data-v="' + right + '"]');
    await page.click('[data-act="ex-next"]');
  }
  ok(/9 of 9 marked correctly/.test(await page.locator('#ex').innerText()), tag + ' examiner game');

  // ----- progress sheet -----
  await page.click('#hud');
  ok(await page.locator('#sheet').isVisible(), tag + ' progress sheet opens');
  const sh = await page.locator('#sheet').innerText();
  ok(/Road to a B/i.test(sh) && /missions/i.test(sh) && /Badges/i.test(sh), tag + ' sheet content');
  ok(await page.locator('.badge.on').count() >= 3, tag + ' badges earned');
  await page.screenshot({ path: path.join(OUT, 'sheet-' + width + '.png'), fullPage: false });
  await page.keyboard.press('Escape');
  ok(await page.locator('#sheet').isHidden(), tag + ' sheet closes');

  // ----- reload: everything is still there -----
  const before = await saved(page);
  await page.reload();
  ok(await page.locator('#tab-long').isVisible(), tag + ' last tab remembered');
  ok(await page.locator('#hud-sub').innerText() === (await page.evaluate(x => window.EconCore.level(x).title + ' · ' + x + ' XP', before.xp)), tag + ' xp restored after reload');
  await tab(page, 'traps');
  ok(/Fixed vs variable/.test(await page.locator('#tab-traps').innerText()), tag + ' own trap restored');

  // ----- screenshots of each tab -----
  for (const id of ['pred', 'quiz', 'traps', 'diag', 'notes', 'long']) {
    await tab(page, id);
    await page.screenshot({ path: path.join(OUT, id + '-' + width + '.png'), fullPage: false });
  }
  ok(errors.length === 0, tag + ' no page errors: ' + errors.join(' | '));
  await ctx.close();
}

async function storageCases(browser) {
  // 1. storage throws on every call
  let o = await open(browser, 375, 740, () => {
    const boom = () => { throw new Error('blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
  });
  ok(await o.page.locator('#tab-pred').isVisible() && (await o.page.locator('#tab-pred').innerText()).length > 200, 'renders when storage throws');
  await o.page.click('#tb-quiz'); await o.page.click('[data-act="qz-start"][data-mode="practice"]');
  await o.page.click('[data-act="qz-show"]'); await o.page.click('[data-act="qz-mark"][data-r="ok"]');
  ok(/Question 2 of 10/.test(await o.page.locator('#tab-quiz .qhud').innerText()), 'quiz works without storage');
  await o.page.click('#hud');
  ok(/Not saving/.test(await o.page.locator('#sheet').innerText()), 'tells the learner that progress is not saved');
  ok(o.errors.length === 0, 'no errors when storage throws: ' + o.errors.join(' | '));
  await o.ctx.close();

  // 2. setItem throws (storage full / private mode), getItem works
  o = await open(browser, 375, 740, () => { Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); }; });
  await o.page.click('#tb-traps'); await o.page.click('[data-act="tg-start"][data-id=""]'); await o.page.click('[data-act="tg-pick"][data-v="1"]');
  ok(await o.page.locator('#tab-traps .fb').count() === 1 && o.errors.length === 0, 'works when saving fails: ' + o.errors.join(' | '));
  await o.ctx.close();

  // 3. broken and old saves
  for (const junk of ['{not json', '[]', '"hello"', 'null', '{"xp":"many","th":7,"days":[1,2],"pred":{"oc":3},"custom":[null,5],"diag":"x","tab":"nope"}']) {
    o = await open(browser, 375, 740, 'try{localStorage.setItem(' + JSON.stringify(KEY) + ',' + JSON.stringify(junk) + ')}catch(e){}');
    ok(await o.page.locator('#tab-pred').isVisible() && (await o.page.locator('#tab-pred').innerText()).length > 200, 'renders with broken save ' + junk.slice(0, 12));
    for (const id of ['quiz', 'traps', 'diag', 'notes', 'long']) { await o.page.click('#tb-' + id); ok(await o.page.locator('#tab-' + id).isVisible(), 'tab ' + id + ' with broken save'); }
    ok(o.errors.length === 0, 'no errors with broken save ' + junk.slice(0, 12) + ': ' + o.errors.join(' | '));
    await o.ctx.close();
  }

  // 4. empty storage, first visit
  o = await open(browser, 360, 640);
  ok(await o.page.locator('#hud-grade').innerText() === '–' && await o.page.locator('#hud-lv').innerText() === '1', 'first visit state');
  ok(await noOverflow(o.page), 'fits a 360px phone');
  await o.ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  await run(browser, 375, 740);
  await run(browser, 1280, 800);
  await storageCases(browser);
  await browser.close();
  console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' browser checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
