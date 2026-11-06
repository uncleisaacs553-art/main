const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, hgt] of [[375, 740], [1280, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt } });
    p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '');
    const ov = async (tag) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(w + ' overflow ' + o + 'px on ' + tag); };
    // notes: open all topics
    await p.click('[data-tab=notes]');
    await p.evaluate(() => document.querySelectorAll('#notesOut details').forEach(d => d.open = true));
    await ov('notes-all');
    // find any element wider than viewport that is not inside a scroll wrapper
    const wide = await p.evaluate(() => [...document.querySelectorAll('#notesOut *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && !e.closest('.tw,.svgwrap,pre'); }).map(e => e.tagName + ':' + e.textContent.slice(0, 40)).slice(0, 5));
    if (wide.length) errs.push(w + ' wide: ' + wide.join(' | '));
    await p.screenshot({ path: require('os').tmpdir() + '/notesall-' + w + '.png', fullPage: true });
    const topics = await p.evaluate(() => TOPICS.map(t => t.id));
    for (const t of topics) {
      await p.evaluate(s => window.__startQuiz(s, 6), { topic: t });
      for (let i = 0; i < 6; i++) {
        await ov(t + i);
        if (await p.$('#quizRun button.cell')) { for (const c of await p.$$('#quizRun button.cell:not(.wk)')) await c.click(); await p.click('#quizRun button:has-text("Check")'); }
        else if (await p.$('#quizRun table.trace')) { await p.click('#quizRun button:has-text("Check")'); }
        else if (await p.$('#quizRun textarea')) { await p.fill('#quizRun textarea', 'x'); await p.click('text=Mark my answer'); await p.click('text=Save my mark'); }
        else if (await p.$('#quizRun .choices button:not([disabled])')) await p.click('#quizRun .choices button');
        else { const inp = await p.$('#quizRun .card input[type=text]'); await inp.fill('A'); await p.click('#quizRun button:has-text("Check")'); if (await p.$('text=Try once more')) await p.click('#quizRun button:has-text("Check")'); if (await p.$('#quizRun .fb.part')) { await inp.fill('A AND B'); await p.click('#quizRun button:has-text("Check")'); } }
        const nb = await p.$('button:has-text("Next question"), button:has-text("See my score")');
        if (!nb) { errs.push(w + ' stuck ' + t + i + ' ' + (await p.$eval('#quizRun', e => e.innerText.slice(0, 200)))); break; }
        await nb.click();
      }
    }
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
