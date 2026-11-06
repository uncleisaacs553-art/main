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

/*@@TEST-MORE@@*/

console.log(fails ? `\n${fails} FAILED of ${checks} checks` : `All ${checks} checks passed.`);
process.exit(fails ? 1 : 0);
