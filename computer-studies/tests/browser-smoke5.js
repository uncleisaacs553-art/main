// Mistakes review, "Mark this answer", study plan, and loading an older progress save.
const { chromium } = require('playwright');
const path = require('path'), os = require('os');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, hgt] of [[375, 740], [1280, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt } });
    p.on('pageerror', e => errs.push(w + ' ' + e.message));
    p.on('dialog', d => d.accept());
    const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
    // an older save without the new fields must still load
    await p.goto(url);
    await p.evaluate(() => localStorage.setItem('cs6134-progress-v1', JSON.stringify({ v: 1, created: 1, done: 3, t: { num: { r: [[0, 1], [1, 1], [0, 1]], e: 1, m: 3, n: 3 } }, f: {}, seen: {}, mocks: [] })));
    await p.reload();
    const ov = async (tag) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(w + ' overflow ' + o + 'px on ' + tag); };
    if ((await p.$eval('#stDone', e => e.textContent)) !== '3') errs.push(w + ' old save not loaded');
    if (!(await p.$('#planOut input[type=checkbox]'))) errs.push(w + ' no plan');
    await ov('dash'); await p.screenshot({ path: path.join(os.tmpdir(), 'plan-' + w + '.png'), fullPage: true });
    // tick a plan task, check it persists
    await p.click('#planOut input[type=checkbox]'); await p.reload();
    if (!(await p.$eval('#planOut input[type=checkbox]', e => e.checked))) errs.push(w + ' plan tick not saved');
    // each Go button works
    const n = await p.$$eval('#planOut button.small:not(.ghost)', x => x.length);
    for (let i = 0; i < n; i++) {
      await p.click('[data-tab=dash]');
      if (await p.evaluate(() => window.__P().mockRun)) await p.evaluate(() => { window.__P().mockRun = null; window.__save(); });
      await p.click('[data-tab=dash]');
      const btns = await p.$$('#planOut button.small:not(.ghost)'); await btns[i].click(); await ov('plan go ' + i);
    }
    await p.evaluate(() => { window.__P().mockRun = null; window.__save(); });
    // Mark-this-answer: answer all with 0 marks
    await p.evaluate(() => window.__startQuiz({ judge: true }, 8));
    for (let i = 0; i < 8; i++) {
      await ov('judge' + i); if (i === 0) await p.screenshot({ path: path.join(os.tmpdir(), 'judge-' + w + '.png'), fullPage: true });
      await p.click('#quizRun .choices button'); await p.click('button:has-text("Next question"), button:has-text("See my score")');
    }
    // make mistakes in a topic quiz, then review them
    await p.evaluate(() => window.__startQuiz({ topic: 'net' }, 6));
    for (let i = 0; i < 6; i++) {
      if (await p.$('#quizRun textarea')) { await p.fill('#quizRun textarea', 'x'); await p.click('text=Mark my answer'); await p.click('text=Save my mark'); }
      else await p.click('#quizRun .choices button >> nth=-1');
      await p.click('button:has-text("Next question"), button:has-text("See my score")');
    }
    const mc = await p.evaluate(() => Object.keys(window.__P().miss).length);
    if (!mc) errs.push(w + ' no mistakes recorded');
    await p.evaluate(() => window.__startQuiz({ mistakes: true }, 5));
    for (let i = 0; i < 5; i++) {
      await ov('mist' + i);
      if (await p.$('#quizRun button.cell')) { for (const c of await p.$$('#quizRun button.cell:not(.wk)')) await c.click(); await p.click('#quizRun button:has-text("Check")'); }
      else if (await p.$('#quizRun table.trace')) await p.click('#quizRun button:has-text("Check")');
      else if (await p.$('#quizRun textarea')) { await p.fill('#quizRun textarea', 'x'); await p.click('text=Mark my answer'); for (const c of await p.$$('#quizRun .check input')) await c.click(); await p.click('text=Save my mark'); }
      else if (await p.$('#quizRun .choices button:not([disabled])')) await p.click('#quizRun .choices button');
      else { await p.fill('#quizRun .card input[type=text]', '1'); await p.click('#quizRun button:has-text("Check")'); if (await p.$('text=Try once more')) await p.click('#quizRun button:has-text("Check")'); }
      const nb = await p.$('button:has-text("Next question"), button:has-text("See my score")');
      if (!nb) { errs.push(w + ' stuck mistakes ' + i); break; } await nb.click();
    }
    console.log(w, 'mistakes before', mc, 'after', await p.evaluate(() => Object.keys(window.__P().miss).length));
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
