// Run: node tests/test-core.js
// Loads the <script id="core"> block from index.html and checks every generator
// against an independent calculation, 1000 random cases each.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(id) {
  const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error('script ' + id + ' not found');
  return m[1];
}
const ctx = { module: { exports: {} }, console };
vm.createContext(ctx);
vm.runInContext(block('core'), ctx);
vm.runInContext(block('data') + ';this.LOGIC_STATEMENTS=LOGIC_STATEMENTS;this.BANK=BANK;this.TOPICS=TOPICS;this.FOCUS=FOCUS;this.PAPERS=typeof PAPERS!=="undefined"?PAPERS:[];this.JUDGE=JUDGE;this.PLAN=PLAN;this.REMINDERS=REMINDERS;', ctx);
const Core = ctx.module.exports;
let fails = 0, checks = 0;
function eq(a, b, msg) { checks++; if (a !== b) { fails++; if (fails < 30) console.log('FAIL', msg, 'got', a, 'expected', b); } }
const N = 1000;
const strip = s => s.replace(/\s/g, '');
const bad = s => s.toUpperCase().replace(/^0+/, '') || '0';

// ---- independent helpers ----
const indParity = (bits, type) => { const k = [...bits].filter(c => c === '1').length; return type === 'EVEN' ? k % 2 : (k + 1) % 2; };
const indIsbnValid = d13 => d13.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0) % 10 === 0;
const indMod11 = d => { // brute force: find c in 0..10 so that weighted total incl c is divisible by 11
  const n = d.length; let s = 0; d.forEach((x, i) => s += x * (n + 1 - i));
  for (let c = 0; c <= 10; c++) if ((s + c) % 11 === 0) return c === 10 ? 'X' : String(c);
};

for (let i = 0; i < N; i++) {
  let g;
  g = Core.G.den2bin(); eq(g.answer, g.data.n.toString(2).padStart(g.data.bits, '0'), 'den2bin ' + g.data.n);
  eq(g.answer.length, g.data.bits, 'den2bin length'); eq(g.check(g.answer).ok, true, 'den2bin self');
  eq(g.check(g.data.n.toString(2)).ok, g.data.n.toString(2).length === g.data.bits, 'den2bin needs full bits');
  g = Core.G.bin2den(); eq(+g.answer, parseInt(g.data.b, 2), 'bin2den ' + g.data.b); eq(g.check(g.answer).ok, true, 'bin2den self');
  g = Core.G.den2hex(); eq(g.answer, g.data.n.toString(16).toUpperCase(), 'den2hex ' + g.data.n); eq(g.check(g.answer.toLowerCase()).ok, true, 'den2hex lower');
  g = Core.G.hex2den(); eq(+g.answer, parseInt(g.data.h, 16), 'hex2den ' + g.data.h);
  g = Core.G.bin2hex(); eq(bad(g.answer), parseInt(g.data.b, 2).toString(16).toUpperCase(), 'bin2hex ' + g.data.b);
  { // a right-padded answer must be rejected when padding was needed
    const b = g.data.b; if (b.length % 4) { let p = b; while (p.length % 4) p += '0'; const wrong = parseInt(p, 2).toString(16).toUpperCase(); if (wrong !== g.answer) eq(g.check(wrong).ok, false, 'bin2hex rejects right padding ' + b); }
  }
  g = Core.G.hex2bin(); eq(g.answer, [...g.data.h].map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join(''), 'hex2bin ' + g.data.h);
  eq(parseInt(g.answer, 2), parseInt(g.data.h, 16), 'hex2bin value');
  g = Core.G.parity();
  if (g.data.v === 'bit') eq(+g.answer, indParity(g.data.data, g.data.type), 'parity bit');
  else if (g.data.v === 'byte') { eq(g.answer.slice(1), g.data.data, 'parity byte data'); eq(+g.answer[0], indParity(g.data.data, g.data.type), 'parity byte bit'); const k = [...g.answer].filter(c => c === '1').length; eq(k % 2, g.data.type === 'EVEN' ? 0 : 1, 'parity byte total'); }
  else { const k = [...g.data.recv].filter(c => c === '1').length; const okP = g.data.type === 'EVEN' ? k % 2 === 0 : k % 2 === 1; eq(g.answer, okP ? 'NO' : 'YES', 'parity err ' + g.data.recv); if (g.data.flips === 2) eq(g.answer, 'NO', 'two-bit error undetected'); if (g.data.flips === 1) eq(g.answer, 'YES', 'one-bit error detected'); }
  g = Core.G.checksum();
  if (g.data.v === 'calc') eq(+g.answer, g.data.bytes.reduce((a, b) => a + b, 0) % 256, 'checksum');
  else eq(g.answer, (g.data.recv.reduce((a, b) => a + b, 0) % 256) === g.data.cs ? 'NO' : 'YES', 'checksum verify');
  g = Core.G.isbn();
  if (g.data.v === 'calc') { const c = +g.answer; eq(indIsbnValid(g.data.d.concat([c])), true, 'isbn valid with check'); eq(c, (10 - (g.data.d.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0) % 10)) % 10, 'isbn formula'); }
  else eq(g.answer, indIsbnValid(g.data.full) ? 'YES' : 'NO', 'isbn verify');
  g = Core.G.mod11();
  if (g.data.v === 'calc') eq(g.answer, indMod11(g.data.d), 'mod11 ' + g.data.d.join(''));
  else eq(g.answer, indMod11(g.data.full) === g.data.cd ? 'YES' : 'NO', 'mod11 verify');
}
// worked examples used in the notes
eq(Core.isbnCheck([9,7,8,1,8,5,9,7,4,9,7,9]).sum, 159, 'notes ISBN sum 159');
eq(Core.isbnCheck([9,7,8,1,8,5,9,7,4,9,7,9]).check, 1, 'notes ISBN check 1');
eq(Core.mod11Check([4,1,5,2]).check, '1', 'notes mod11 4152');
eq(Core.denToBin(255, 8).bin, '11111111', '255 is 8 ones'); eq(Core.denToBin(75, 8).bin, '01001011', '75');
eq(Core.binToHexGrid('1101011').hex, '6B', 'grid 6B'); eq(Core.denToHex(200).hex, 'C8', '200=C8'); eq(Core.hexToDen('2A7').den, 679, '2A7');
eq((200 + 150 + 99) % 256, 193, 'notes checksum');


// ---- truth tables: every fixed statement vs a hand-written JS formula ----
const NOT = x => x ? 0 : 1, AND = (x, y) => x & y, OR = (x, y) => x | y, XOR = (x, y) => x ^ y, NAND = (x, y) => NOT(x & y), NOR = (x, y) => NOT(x | y);
const HAND = {
  'NOT A OR (A AND NOT B)': (A, B) => OR(NOT(A), AND(A, NOT(B))),
  '(A AND B) OR C': (A, B, C) => OR(AND(A, B), C),
  '(A OR B) AND NOT C': (A, B, C) => AND(OR(A, B), NOT(C)),
  'NOT (A AND B) OR C': (A, B, C) => OR(NAND(A, B), C),
  '(A XOR B) AND C': (A, B, C) => AND(XOR(A, B), C),
  '(A AND NOT B) OR (NOT A AND B)': (A, B) => XOR(A, B),
  'NOT (A OR B) AND C': (A, B, C) => AND(NOR(A, B), C),
  '(A NAND B) OR (B AND C)': (A, B, C) => OR(NAND(A, B), AND(B, C)),
  '(A OR NOT B) AND (B OR C)': (A, B, C) => AND(OR(A, NOT(B)), OR(B, C)),
  'NOT A AND NOT B': (A, B) => NOR(A, B),
  '(A NOR B) OR (A AND C)': (A, B, C) => OR(NOR(A, B), AND(A, C)),
  '(A AND B) XOR C': (A, B, C) => XOR(AND(A, B), C),
  'NOT (A XOR B)': (A, B) => NOT(XOR(A, B)),
  '(A OR B) AND (NOT A OR C)': (A, B, C) => AND(OR(A, B), OR(NOT(A), C))
};
ctx.LOGIC_STATEMENTS.forEach(s => {
  const f = HAND[s]; eq(typeof f, 'function', 'hand formula for ' + s); if (!f) return;
  const ast = Core.parseLogic('X = ' + s), vars = Core.varsOf(ast);
  Core.truthTable(ast, vars).forEach(r => eq(r.out, f(r.env.A, r.env.B, r.env.C), s + ' ' + JSON.stringify(r.env)));
  eq(Core.sameTable(Core.parseLogic(Core.logicStr(ast, true)), ast), true, 'round-trip ' + s);
});
// basic gates
[['AND', AND], ['OR', OR], ['NAND', NAND], ['NOR', NOR], ['XOR', XOR]].forEach(([op, f]) => {
  for (let A = 0; A < 2; A++) for (let B = 0; B < 2; B++) eq(Core.evalLogic(Core.parseLogic('A ' + op + ' B'), { A, B }), f(A, B), op);
});
for (let A = 0; A < 2; A++) eq(Core.evalLogic(Core.parseLogic('NOT A'), { A }), NOT(A), 'NOT');
// random expressions: independent evaluator over the AST + string round trip + SVG draws
function indEval(n, e) { if (n.v) return e[n.v]; const a = indEval(n.a[0], e), b = n.a[1] && indEval(n.a[1], e); return { NOT: () => NOT(a), AND: () => AND(a, b), OR: () => OR(a, b), NAND: () => NAND(a, b), NOR: () => NOR(a, b), XOR: () => XOR(a, b) }[n.op](); }
for (let i = 0; i < N; i++) {
  const ast = Core.randExpr(i % 2 ? 2 : 3), str = Core.logicStr(ast, true), re = Core.parseLogic(str);
  Core.rowsFor(['A', 'B', 'C']).forEach(env => { eq(Core.evalLogic(ast, env), indEval(ast, env), 'rand eval ' + str); eq(Core.evalLogic(re, env), indEval(ast, env), 'rand reparse ' + str); });
  const svg = Core.circuitSVG(ast); eq(/NaN|undefined/.test(svg), false, 'svg ok ' + str);
}
// ---- trace tables: each program re-run by a separate simulation of the pseudocode ----
for (let i = 0; i < 200; i++) Core.TRACE.forEach(p => {
  const t = Core.traceQ(p.id), d = t.data, last = t.rows[t.rows.length - 1], outCol = t.cols.indexOf('OUTPUT');
  const lastOut = [...t.rows].reverse().find(r => r[outCol] !== '')[outCol];
  let want;
  if (p.id === 'tot') want = d.nums.reduce((a, b) => a + b) + ', ' + d.nums.filter(x => x > d.lim).length;
  if (p.id === 'pass') want = (d.m[3] >= 50 ? 'PASS' : 'FAIL') + ', ' + d.m.filter(x => x >= 50).length;
  if (p.id === 'digits') want = String([...String(d.n)].reduce((a, b) => a + +b, 0));
  if (p.id === 'double') { let c = 0, x = d.x; while (x <= d.lim) { x *= 2; c++; } want = String(c); }
  if (p.id === 'high') want = Math.max(...d.a) + ', ' + Math.min(...d.a);
  if (p.id === 'rogue') { const v = d.a.slice(0, -1); want = String(Math.round(v.reduce((a, b) => a + b) / v.length * 100) / 100); }
  if (p.id === 'evenodd') want = d.a.filter(x => x % 2 === 0).length + ', ' + d.a.filter(x => x % 2).reduce((a, b) => a + b, 0);
  if (p.id === 'case') { const m = d.a[3]; want = m >= 80 ? 'A' : m >= 60 ? 'B' : m >= 40 ? 'C' : 'U'; eq(last[3], String(d.a.filter(x => x >= 80).length), 'case ACount'); }
  if (p.id === 'bin') want = d.n.toString(2);
  eq(lastOut, want, 'trace ' + p.id + ' ' + JSON.stringify(d));
  t.rows.forEach(r => eq(r.length, t.cols.length, 'trace row width ' + p.id));
});

// ---- question bank integrity ----
{
  const ids = new Set(), topics = new Set(ctx.TOPICS.map(x => x.id)), focus = new Set(ctx.FOCUS.map(x => x.id));
  ctx.BANK.forEach(b => {
    eq(ids.has(b.id), false, 'unique id ' + b.id); ids.add(b.id);
    eq(topics.has(b.t), true, 'topic ' + b.id + ' ' + b.t);
    (b.f || []).forEach(f => eq(focus.has(f), true, 'focus ' + b.id));
    if (b.type === 'mc') { eq(Array.isArray(b.o) && b.a >= 0 && b.a < b.o.length, true, 'mc answer ' + b.id); }
    else { eq(b.m > 0 && Array.isArray(b.p) && b.p.length >= b.m, true, 'enough points ' + b.id); }
    eq(!b.y || b.y <= 2022, true, 'no 2023-25 questions in quiz bank ' + b.id);
  });
  // every topic has questions
  ctx.TOPICS.forEach(tp => { const n = ctx.BANK.filter(b => b.t === tp.id).length + (['num', 'err', 'chk', 'logic', 'trace'].includes(tp.id) ? 5 : 0); eq(n >= 3, true, 'topic has questions ' + tp.id); });
  console.log('Bank:', ctx.BANK.length, 'questions');
}

// ---- rule: 2023–2025 past-paper questions never reach topic quizzes ----
{
  const fake = [2020, 2021, 2022, 2023, 2024, 2025].map(y => ({ id: 'p' + y, year: y, name: String(y), q: [{ n: '1', m: 2, t: 'net', q: 'Q' + y, p: ['a', 'b'] }] }));
  const pool = Core.quizPool(ctx.BANK, fake);
  [2023, 2024, 2025].forEach(y => eq(pool.some(b => b.y === y || b.q === 'Q' + y), false, 'year ' + y + ' excluded from quizzes'));
  [2020, 2021, 2022].forEach(y => eq(pool.some(b => b.q === 'Q' + y), true, 'year ' + y + ' allowed in quizzes'));
  eq(Core.quizPool(ctx.BANK, ctx.PAPERS).filter(b => b.y >= 2023).length, 0, 'real PAPERS: no 2023+ in pool');
}

// ---- "Mark this answer" items and study plan ----
{
  const topics = new Set(ctx.TOPICS.map(x => x.id)), focus = new Set(ctx.FOCUS.map(x => x.id)), ids = new Set();
  ctx.JUDGE.forEach(j => {
    eq(ids.has(j.id), false, 'judge unique ' + j.id); ids.add(j.id);
    eq(topics.has(j.t), true, 'judge topic ' + j.id);
    eq(Number.isInteger(j.right) && j.right >= 0 && j.right <= j.m, true, 'judge mark range ' + j.id);
    (j.f || []).forEach(f => eq(focus.has(f), true, 'judge focus ' + j.id));
    eq(typeof j.ans === 'string' && typeof j.why === 'string', true, 'judge text ' + j.id);
  });
  const tids = new Set();
  ctx.PLAN.forEach(d => {
    eq(/^2026-11-(0[6-9]|10)$/.test(d.d), true, 'plan date ' + d.d);
    d.tasks.forEach(tk => {
      eq(tids.has(tk.id), false, 'plan task unique ' + tk.id); tids.add(tk.id);
      const g = tk.go; if (!g) return;
      if (g.topic) eq(topics.has(g.topic), true, 'plan topic ' + g.topic);
      if (g.focus) eq(focus.has(g.focus), true, 'plan focus ' + g.focus);
      if (g.mock) eq(/^x[1-6]$/.test(g.mock), true, 'plan mock ' + g.mock);
    });
  });
  console.log('Mark-this-answer items:', ctx.JUDGE.length);
}

// ---- dashboard maths: checked against a separate calculation, 1000 random cases ----
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  for (let i = 0; i < N; i++) {
    const recs = {}; let sw = 0, s = 0, tried = 0, green = 0, amber = 0, red = 0;
    ctx.TOPICS.forEach(tp => {
      if (Math.random() < 0.25) return;                         // not tried
      const r = Array.from({ length: rnd(1, 20) }, () => { const m = rnd(1, 5); return [rnd(0, m * 2) / 2, m]; });
      recs[tp.id] = { r };
      const e = r.reduce((a, x) => a + x[0], 0), m = r.reduce((a, x) => a + x[1], 0), p = Math.round(100 * e / m);
      tried++; if (p >= 80) green++; else if (p >= 50) amber++; else red++;
      sw += tp.w; s += tp.w * p;
    });
    const o = Core.overallScore(ctx.TOPICS, recs);
    eq(o.score, sw ? Math.round(s / sw) : null, 'overall score'); eq(o.tried, tried, 'tried'); eq(o.green, green, 'green');
    eq(o.amber, amber, 'amber'); eq(o.red, red, 'red'); eq(o.none, ctx.TOPICS.length - tried, 'none'); eq(o.green + o.amber + o.red + o.none, o.total, 'sums to total');
    // trend: split the list in two halves by hand
    const r = Array.from({ length: rnd(0, 20) }, () => [rnd(0, 1), 1]);
    let want = 0;
    if (r.length >= 8) { const h = Math.floor(r.length / 2), pc = a => Math.round(100 * a.filter(x => x[0]).length / a.length), a = pc(r.slice(0, h)), b = pc(r.slice(h)); want = b - a >= 20 ? 1 : a - b >= 20 ? -1 : 0; }
    eq(Core.trendOf(r), want, 'trend ' + JSON.stringify(r));
    // streak: walk back day by day
    const keys = Array.from({ length: 10 }, (_, k) => 'd' + k), days = {}; keys.forEach(k => { if (Math.random() < 0.7) days[k] = { n: rnd(0, 3) }; });
    let st = 0; for (let k = 0; k < keys.length; k++) { const has = days[keys[k]] && days[keys[k]].n > 0; if (has) st++; else if (k === 0) continue; else break; }
    eq(Core.streakOf(days, keys), st, 'streak');
  }
  eq(Core.overallScore(ctx.TOPICS, {}).score, null, 'no score when nothing is tried');
  eq(Core.trendOf([[0, 1], [0, 1], [0, 1], [0, 1], [1, 1], [1, 1], [1, 1], [1, 1]]), 1, 'trend up'); eq(Core.trendOf([[1, 1], [1, 1], [1, 1], [1, 1], [0, 1], [0, 1], [0, 1], [0, 1]]), -1, 'trend down');
  eq(Core.trendOf([[1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [1, 1], [1, 1]]), 0, 'same in both halves (60% and 60%) = no arrow'); eq(Core.trendOf([[1, 1], [1, 1], [1, 1], [0, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [0, 1]]), 0, 'same in both halves (80% and 80%) = no arrow'); eq(Core.trendOf([[0, 1], [1, 1], [1, 1]]), 0, 'too few answers = no arrow');
  eq(Core.streakOf({ a: { n: 0 }, b: { n: 2 }, c: { n: 1 } }, ['a', 'b', 'c', 'd']), 2, 'streak: empty today does not break it');
  eq(Core.streakOf({ a: { n: 1 }, c: { n: 1 } }, ['a', 'b', 'c']), 1, 'streak: a gap breaks it');
}
// ---- reminder cards ----
{
  const ids = new Set(), topics = new Set(ctx.TOPICS.map(x => x.id).concat(['howto']));
  ctx.REMINDERS.forEach(r => {
    eq(ids.has(r.id), false, 'reminder unique ' + r.id); ids.add(r.id);
    eq(['book', 'weak', 'rule', 'fact'].includes(r.k), true, 'reminder kind ' + r.id);
    eq(r.note === null || topics.has(r.note), true, 'reminder note ' + r.id);
    eq(typeof r.q === 'string' && r.q.length > 5 && typeof r.a === 'string' && r.a.length > 5, true, 'reminder text ' + r.id);
    if (r.note) eq(html.includes('data-topic="' + r.note + '"'), true, 'note exists for ' + r.id);
  });
  ctx.FOCUS.forEach(f => eq(typeof f.short === 'string' && f.short.length > 3, true, 'focus short name ' + f.id));
  // facts used on the cards
  eq(17 % 5, 2, 'card: 17 MOD 5'); eq(Math.floor(17 / 5), 3, 'card: 17 DIV 5'); eq(Core.binToHexGrid('1101011').hex, '6B', 'card: 6B');
  eq(Core.parityBit('1011001', 'EVEN'), 0, 'card: parity bit 0'); eq(Core.denToBin(255, 8).bin, '11111111', 'card: 255');
  console.log('Reminder cards:', ctx.REMINDERS.length);
}

// ---- estimated exam mark ("Road to 60"): checked against a separate calculation ----
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), W = ctx.TOPICS.reduce((a, x) => a + x.w, 0);
  for (let i = 0; i < N; i++) {
    const recs = {}, pcs = {};
    ctx.TOPICS.forEach(tp => { if (Math.random() < 0.3) return; const m = rnd(1, 20), e = rnd(0, m); recs[tp.id] = { r: [[e, m]] }; pcs[tp.id] = Math.round(100 * e / m); });
    const tried = ctx.TOPICS.filter(tp => tp.id in pcs), sw = tried.reduce((a, x) => a + x.w, 0);
    const avg = sw ? tried.reduce((a, x) => a + x.w * pcs[x.id], 0) / sw : null, guess = avg === null ? null : Math.min(50, Math.round(avg * 0.75));
    let est = 0; ctx.TOPICS.forEach(tp => { const cur = tp.id in pcs ? pcs[tp.id] : guess; if (cur !== null) est += (100 * tp.w / W) * cur / 100; });
    const R = Core.examEstimate(ctx.TOPICS, recs);
    eq(R.est, avg === null ? null : Math.round(est), 'estimate'); eq(R.guess, guess, 'guess for topics not tried');
    eq(Math.abs(R.cover - sw / W) < 1e-9, true, 'cover'); eq(R.rows.length, ctx.TOPICS.length, 'one row per topic');
    eq(Math.abs(R.rows.reduce((a, r) => a + r.marks, 0) - 100) < 1e-9, true, 'topic marks add up to 100');
    for (let k = 1; k < R.rows.length; k++) eq(R.rows[k - 1].gain >= R.rows[k].gain, true, 'biggest gain first');
    R.rows.forEach(r => { const cur = r.id in pcs ? pcs[r.id] : guess; eq(Math.abs(r.gain - (cur === null ? 0 : r.marks * Math.max(0, 80 - cur) / 100)) < 1e-9, true, 'gain of ' + r.id); });
    if (R.est !== null) eq(R.est >= 0 && R.est <= 100, true, 'estimate is 0..100');
  }
  const all = {}; ctx.TOPICS.forEach(tp => { all[tp.id] = { r: [[1, 1]] }; });
  eq(Core.examEstimate(ctx.TOPICS, all).est, 100, 'all topics 100% = 100 marks'); eq(Core.examEstimate(ctx.TOPICS, {}).est, null, 'no answers = no estimate');
  eq(html.includes('data-topic="sheet10"'), true, 'the 10-minute sheet is in the notes');
}
/*@@TEST-MORE@@*/

console.log(fails ? `\n${fails} FAILED of ${checks} checks` : `All ${checks} checks passed.`);
process.exit(fails ? 1 : 0);
