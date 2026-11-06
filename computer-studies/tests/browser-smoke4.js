const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, hgt] of [[375, 740], [1280, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt } });
    p.on('pageerror', e => errs.push(w + ' ' + e.message));
    p.on('dialog', d => d.accept());
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#papers');
    const ov = async (tag) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(w + ' overflow ' + o + 'px on ' + tag); };
    // all practice papers total exactly 100 and are deterministic
    const tot = await p.evaluate(() => { const r = []; for (let k = 1; k <= 6; k++) { const a = window.__buildPractice(k), b2 = window.__buildPractice(k); r.push([a.max, a.qs.length, a.qs.map(q => q.kind + (q.b ? q.b.id : '')).join() === b2.qs.map(q => q.kind + (q.b ? q.b.id : '')).join(), a.qs.some(q => q.b && q.b.y >= 2023)]); } return r; });
    tot.forEach((t, i) => { if (t[0] !== 100) errs.push('practice ' + (i + 1) + ' total ' + t[0]); if (!t[2]) errs.push('practice ' + (i + 1) + ' not deterministic'); if (t[3]) errs.push('2023+ in practice'); });
    console.log(w, 'practice papers', JSON.stringify(tot.map(t => t.slice(0, 2))));
    await ov('papers'); await p.screenshot({ path: require('os').tmpdir() + '/papers-' + w + '.png', fullPage: true });
    await p.click('text=Practice paper 1 >> xpath=../.. >> button');
    await ov('mock'); await p.screenshot({ path: require('os').tmpdir() + '/mock-' + w + '.png' });
    for (const t of await p.$$('#papersOut textarea')) await t.fill('An area of memory');
    for (const t of await p.$$('#papersOut input[type=text]')) await t.fill('1');
    for (const c of await p.$$('#papersOut button.cell')) await c.click();
    for (const ch of await p.$$('#papersOut .choices')) { const bt = await ch.$('button'); await bt.click(); }
    await p.waitForTimeout(600);
    // reload keeps answers + timer
    await p.reload(); await p.click('[data-tab=papers]');
    const kept = await p.$eval('#papersOut textarea', e => e.value); if (kept !== 'An area of memory') errs.push(w + ' answers not kept after reload');
    await p.click('text=Submit paper');
    await ov('results');
    const boxes = await p.$$('#papersOut .check input'); for (let i = 0; i < boxes.length; i += 3) await boxes[i].click();
    await p.screenshot({ path: require('os').tmpdir() + '/results-' + w + '.png' });
    const total = await p.$eval('#papersOut .card p', e => e.textContent); console.log(w, total);
    await p.click('text=Save my total');
    await p.click('[data-tab=dash]'); const ms = await p.$eval('#mockScores', e => e.innerText); console.log(w, ms.replace(/\s+/g, ' '));
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
