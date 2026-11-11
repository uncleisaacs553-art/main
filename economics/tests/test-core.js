// Run: node tests/test-core.js
// Loads the <script id="data"> and <script id="core"> blocks from nssco-economics.html and checks the content and the logic.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'nssco-economics.html'), 'utf8');
function block(id) {
  const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error('script ' + id + ' not found');
  return m[1];
}
const win = {};
const ctx = { window: win, module: { exports: {} }, console };
vm.createContext(ctx);
vm.runInContext(block('data'), ctx);
vm.runInContext(block('core'), ctx);
const D = win.EconData, C = win.EconCore;

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails < 40) console.log('FAIL', msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' | got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }

// ---------- the file itself ----------
ok(!/<script[^>]+src=/i.test(html), 'no external scripts');
ok(!/<link[^>]+href=/i.test(html), 'no external stylesheets or fonts');
ok(!/@import|url\(\s*["']?https?:/i.test(html), 'no remote CSS');
ok(/background:var\(--bg\)/.test(html) && /--bg:#0d1117/.test(html), 'dark theme background #0d1117');
ok(/font:16px/.test(html), '16px base font');

// ---------- themes and definitions ----------
const themeIds = D.THEMES.map(t => t.id);
eq(D.THEMES.length, 9, 'nine themes');
const predIds = D.PRED.map(p => p.id);
D.THEMES.forEach(t => ok(D.DEFS.filter(d => d.t === t.id).length >= 8, 'theme ' + t.id + ' has at least 8 definitions'));
const terms = {};
D.DEFS.forEach(d => {
  ok(themeIds.includes(d.t), 'definition theme ' + d.k);
  ok(d.k && d.d, 'definition text ' + d.k);
  ok(!terms[d.k], 'duplicate term ' + d.k); terms[d.k] = 1;
  if (!d.nq) eq(C.marksIn(d.d), d.m || 2, 'marks shown in definition ' + d.k);
  if (d.p) ok(predIds.includes(d.p), 'definition ' + d.k + ' points to predicted topic ' + d.p);
});

// ---------- question bank ----------
const bank = C.bank(D, []);
ok(bank.length >= 140, 'at least 140 questions, got ' + bank.length);
const ids = {};
bank.forEach(q => {
  ok(!ids[q.id], 'duplicate id ' + q.id); ids[q.id] = 1;
  ok(themeIds.includes(q.t), 'question theme ' + q.id);
  ok(q.q && q.q.length > 8, 'question text ' + q.id);
  ok(q.a && q.a.length > 3, 'answer text ' + q.id);
  ok(Number.isInteger(q.m) && q.m >= 1 && q.m <= 9, 'marks ' + q.id);
  ok(C.marksIn(q.a) >= q.m, 'answer shows where every mark falls ' + q.id + ' (' + C.marksIn(q.a) + ' < ' + q.m + ')');
  eq(q.src, 'Exam-style', 'built-in questions are labelled exam-style ' + q.id);
  if (q.p) ok(predIds.includes(q.p), 'question ' + q.id + ' points to predicted topic ' + q.p);
});
ok(D.QS.length >= 140, 'at least 140 written questions before definitions, got ' + D.QS.length);
themeIds.forEach(t => ok(bank.filter(q => q.t === t).length >= 15, 'theme ' + t + ' has 15+ questions'));
// one-sided cap is flagged on every Discuss question
D.QS.filter(q => /^Discuss/.test(q.q)).forEach(q => ok(/Maximum four if one-sided/.test(q.r || ''), 'Discuss question flags the one-sided cap ' + q.id));
ok(D.QS.filter(q => /^Discuss/.test(q.q)).length >= 6, 'six or more Discuss questions');
// restrictions from the brief are present
const allText = JSON.stringify(D);
['Do not award a mark for modern technology', 'Maximum four if one-sided', 'NO need to explain the qualities of money', 'table caps you at 4 marks',
 'scarce resources (1) used to make goods and services (1)', 'Scarce resources (1) used to make goods and services (1)'].forEach(s => ok(allText.includes(s), 'brief wording present: ' + s));
['NamPower', 'Bank of Namibia', 'NamWater', 'NBC', 'FNB Namibia', 'Erongo RED', 'Walvis Bay', 'SACU', 'fishing', 'mining'].forEach(s => ok(allText.includes(s), 'Namibian example present: ' + s));

// own past-paper questions join the bank and come first in a round
const own = [{ id: 'own1', t: 'dse', yr: 2023, p: 1, m: 2, q: 'Define demand.', a: 'x (1) y (1)' }, { id: 'own2', t: 'zzz', yr: 2021, p: 2, m: 4, q: 'q', a: 'a' }];
const bank2 = C.bank(D, own);
eq(bank2.length, bank.length + 2, 'own questions added');
eq(bank2.find(q => q.id === 'own1').src, '2023 Paper 1', 'own question shows year and paper');
eq(bank2.find(q => q.id === 'own2').t, 'bep', 'unknown theme falls back');
for (let i = 0; i < 50; i++) {
  const r = C.buildRound(bank2, 10);
  eq(r.length, 10, 'round length');
  eq(new Set(r.map(q => q.id)).size, 10, 'no repeats in a round');
  ok(r.some(q => q.id === 'own1') && r.some(q => q.id === 'own2'), 'own questions are always in the round');
  const defs = r.filter(q => q.kind === 'def').length;
  ok(defs >= 2 && defs <= 5, 'round mixes definitions and written questions, defs=' + defs);
}
eq(C.buildRound(bank, 0).length, bank.length, 'round of All');
eq(C.buildRound(bank.slice(0, 4), 10).length, 4, 'small pool');

// ---------- predicted topics ----------
ok(D.PRED.filter(p => p.est === 'near').length >= 8 && D.PRED.filter(p => p.est === 'due').length >= 8, 'both predicted lists are filled');
D.PRED.forEach(p => {
  ok(bank.filter(q => q.p === p.id).length >= 2, 'predicted topic ' + p.id + ' has model answers');
  ok(['Very high', 'High', 'Medium'].includes(p.lk), 'likelihood tag ' + p.id);
});
let ps = C.predState('near', 'Very high', []);
eq(ps.bucket, 'near', 'estimate near'); eq(ps.counted, false, 'estimate is not counted');
eq(C.predState('due', 'Medium', undefined).bucket, 'due', 'estimate due');
ps = C.predState('due', 'Medium', [2020, 2021, 2022, 2023]);
eq(ps.bucket, 'near', '4 of 6 = near-certain'); eq(ps.n, 4, 'count'); eq(ps.counted, true, 'counted');
eq(C.predState('due', 'Medium', [2020, 2021, 2022, 2023, 2024, 2025]).lk, 'Very high', '6 of 6');
eq(C.predState('near', 'Very high', [2020, 2021]).bucket, 'due', 'not asked recently = due for return');
eq(C.predState('near', 'Very high', [2021, 2022, 2023]).bucket, 'due', '3 years, none recent = due');
eq(C.predState('near', 'Very high', [2024]).bucket, 'recent', 'asked recently');
eq(C.predState('near', 'Very high', [2020, 2025, 2025, 1999]).n, 2, 'duplicates and bad years ignored');

// ---------- traps ----------
eq(D.TRAPS.length, 9, 'nine personal traps');
eq(D.TRAPS.map(t => t.times).join(','), '3,2,2,2,0,0,0,0,0', 'wrong counts from the brief');
eq(D.TRAPS[7].pairs.length, 10, 'ten mixed-up definitions');
D.TRAPS.forEach(t => {
  const qs = D.TRAPQ.filter(q => q.t === t.id);
  ok(qs.length >= 5, 'trap ' + t.id + ' has 5+ statements');
  ok(qs.some(q => q.ok) && qs.some(q => !q.ok), 'trap ' + t.id + ' has true and false statements');
  ok(t.pairs.length >= 1 && t.rule, 'trap ' + t.id + ' has wrong / right / rule');
});
D.TRAPQ.forEach(q => ok(D.TRAPS.some(t => t.id === q.t) && typeof q.ok === 'boolean' && q.s && q.y, 'trap statement ' + q.s.slice(0, 30)));
eq(D.CMD.length, 8, 'command words');

// ---------- diagrams ----------
eq(JSON.stringify(C.shiftResult('D', 'R')), '{"p":"up","q":"up"}', 'D right');
eq(JSON.stringify(C.shiftResult('D', 'L')), '{"p":"down","q":"down"}', 'D left');
eq(JSON.stringify(C.shiftResult('S', 'R')), '{"p":"down","q":"up"}', 'S right');
eq(JSON.stringify(C.shiftResult('S', 'L')), '{"p":"up","q":"down"}', 'S left');
// the drawn equilibrium must agree with the four rules
[['D', 'R', 22, 0], ['D', 'L', -22, 0], ['S', 'R', 0, 22], ['S', 'L', 0, -22]].forEach(([c, d, kd, ks]) => {
  const e0 = C.eqm(0, 0), e = C.eqm(kd, ks), r = C.shiftResult(c, d);
  eq(e.p > e0.p ? 'up' : 'down', r.p, 'drawn price ' + c + d);
  eq(e.q > e0.q ? 'up' : 'down', r.q, 'drawn quantity ' + c + d);
  // intersection really lies on both lines
  ok(Math.abs((90 - 0.8 * (e.q - kd)) - e.p) < 1e-9 && Math.abs((10 + 0.8 * (e.q - ks)) - e.p) < 1e-9, 'equilibrium on both curves ' + c + d);
});
[{}, { kd: 22 }, { kd: -22 }, { ks: 22 }, { ks: -22 }, { ceil: 32 }, { floor: 68 }, { kd: 22, t: 0.3 }].forEach(o => {
  const svg = C.sdSVG(o);
  ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !/NaN|undefined/.test(svg), 'diagram draws ' + JSON.stringify(o));
  ok(svg.includes('>Price<') && svg.includes('>Quantity<'), 'axes labelled ' + JSON.stringify(o));
});
ok(C.sdSVG({ kd: 22 }).includes('>D2<') && C.sdSVG({ kd: 22 }).includes('>P2<'), 'shifted diagram labels D2 and P2');
ok(!C.sdSVG({ kd: 22, t: 0.3 }).includes('>D2<'), 'label waits for the end of the animation');
ok(C.sdSVG({ ceil: 32 }).includes('shortage') && C.sdSVG({ floor: 68 }).includes('surplus'), 'price controls show shortage and surplus');
D.SCEN.forEach(s => ok(['D', 'S', 'M'].includes(s.c) && (s.c === 'M' ? s.d === '' : ['R', 'L'].includes(s.d)) && s.s && s.m && s.y, 'scenario ' + s.s));
ok(D.SCEN.filter(s => s.c === 'M').length >= 2, 'movement-along scenarios included');
eq(D.CHECK.length, 7, '7-point checklist');
eq(D.CLASSIC.map(c => c.id).join(','), 'sub,tax,adv,tech,max,min', 'six classic scenarios');
eq(D.SHIFTERS.d.length, D.SHIFTERS.s.length, 'shift table columns match');

// ---------- long answers ----------
D.WORKED.forEach(w => eq(w.parts.reduce((a, p) => a + p.m, 0), 20, 'worked question ' + w.id + ' adds up to 20'));
D.WORKED.forEach(w => w.parts.forEach(p => ok(C.marksIn(p.a) >= p.m, 'worked ' + w.id + p.n + ' shows every mark')));
ok(D.WORKED.filter(w => /Paper 1/.test(w.paper)).length >= 2 && D.WORKED.filter(w => /Paper 2/.test(w.paper)).length >= 2, 'both papers worked');
D.EXAM.forEach(e => ok(e.opts.includes(e.right) && e.right <= e.m && e.why, 'examiner case ' + e.id));

// ---------- grades, levels, streak ----------
eq(C.grade(100), 'A*', 'grade'); eq(C.grade(90), 'A*', 'grade'); eq(C.grade(89), 'A', 'grade'); eq(C.grade(70), 'B', 'grade');
eq(C.grade(69), 'C', 'grade'); eq(C.grade(50), 'D', 'grade'); eq(C.grade(20), 'G', 'grade'); eq(C.grade(19), 'U', 'grade'); eq(C.grade(0), 'U', 'grade');
eq(C.pct(41, 58), 71, 'percent'); eq(C.pct(0, 0), 0, 'percent of nothing');
eq(C.level(0).lv, 1, 'level 1'); eq(C.level(119).lv, 1, 'level 1 end'); eq(C.level(120).lv, 2, 'level 2'); eq(C.level(360).lv, 3, 'level 3');
let prev = 0;
for (let xp = 0; xp < 20000; xp += 37) { const L = C.level(xp); ok(L.lv >= prev && L.pct >= 0 && L.pct <= 100 && L.title, 'level steady at ' + xp); prev = L.lv; }
const now = new Date(2026, 10, 11, 9, 0, 0);
eq(C.dayKey(now), '2026-11-11', 'day key');
eq(C.streak({}, now), 0, 'no streak');
eq(C.streak({ '2026-11-11': 1 }, now), 1, 'today');
eq(C.streak({ '2026-11-10': 1, '2026-11-09': 1 }, now), 2, 'yesterday still counts');
eq(C.streak({ '2026-11-11': 1, '2026-11-10': 1, '2026-11-08': 1 }, now), 2, 'gap breaks the streak');
eq(C.streak({ '2026-11-01': 1, '2026-10-31': 1, '2026-10-30': 1 }, new Date(2026, 10, 1)), 3, 'streak across a month end');

// ---------- text ----------
eq(C.fmt('<b>x</b> & "y"'), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;', 'html is escaped');
ok(C.fmt('a (1) b (2)').split('class="mk"').length === 3, 'mark pills');
ok(!C.fmt('(a) (i) (10)').includes('class="mk"'), 'only single digits become marks');
eq(C.marksIn('x (1) y (1) z (2)'), 4, 'marks counted');
eq(C.txt('N$10 000 and 1 000 000 in 2 020 or 5 x'), 'N$10\u00a0000 and 1\u00a0000\u00a0000 in 2\u00a0020 or 5 x', 'thousands stay on one line');
eq(C.defQuestion({ k: 'Opportunity cost' }), 'Define opportunity cost.', 'definition question');
eq(C.defQuestion({ k: 'GDP per capita' }), 'Define GDP per capita.', 'acronym kept');

// ---------- saved state survives anything ----------
[null, undefined, 0, 'x', [], {}, { xp: 'a', th: 5, days: [], pred: { oc: 7 }, custom: [1, null, {}], myTraps: 'no', diag: null, best: [] },
 { th: { bep: { n: -3, ok: 'x', got: NaN, max: Infinity } }, days: { nope: {}, '2026-11-11': { xp: 5 } }, pred: { oc: { y: [2020, 1999, 'a'], ok: 1 } } }].forEach((x, i) => {
  let s; try { s = C.sanitize(x); } catch (e) { s = null; }
  ok(!!s, 'sanitize does not throw on case ' + i);
  if (!s) return;
  ok(s.xp >= 0 && typeof s.th === 'object' && Array.isArray(s.custom) && Array.isArray(s.myTraps) && Array.isArray(s.diag.chk) && typeof s.days === 'object', 'safe shape ' + i);
  Object.values(s.th).forEach(t => ok([t.n, t.ok, t.got, t.max].every(v => Number.isFinite(v) && v >= 0), 'theme numbers are clean ' + i));
});
let s = C.sanitize({ xp: 250.7, tab: 'quiz', th: { dse: { n: 4, ok: 3, got: 9, max: 12 } }, miss: { d1: 1 }, pred: { oc: { y: [2020, 2024], ok: true } },
  custom: [{ id: 'own9', t: 'dse', yr: 2022, p: 2, m: 4, q: 'Q', a: 'A (1)' }], myTraps: [{ id: 'm1', title: 'T', wrong: 'w', right: 'r', rule: 'x' }],
  traps: { t1: { streak: 3, n: 5, ok: 4, again: 1 } }, days: { '2026-11-10': { xp: 40, q: 3, m: { q: 1 } } }, badges: { first: 1 }, selftest: true });
eq(s.xp, 250, 'xp kept'); eq(s.tab, 'quiz', 'tab kept'); eq(s.th.dse.got, 9, 'theme stats kept'); eq(s.miss.d1, 1, 'missed kept');
eq(s.pred.oc.y.join(','), '2020,2024', 'ticks kept'); eq(s.custom[0].p, 2, 'own question kept'); eq(s.myTraps[0].title, 'T', 'own trap kept');
eq(s.traps.t1.streak, 3, 'trap progress kept'); eq(s.days['2026-11-10'].m.q, 1, 'mission kept'); eq(s.selftest, true, 'self-test kept');
eq(JSON.stringify(C.sanitize(JSON.parse(JSON.stringify(s)))), JSON.stringify(s), 'save and load gives the same state');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' checks passed  (' + bank.length + ' questions, ' + D.DEFS.length + ' definitions, ' + D.TRAPQ.length + ' trap statements)');
process.exit(fails ? 1 : 0);
