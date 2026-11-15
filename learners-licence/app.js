/* Learner's Licence Trainer. Vanilla JS, no build step. Data comes from data/bank.js and data/img.js. */
(function () {
  'use strict';
  var D = window.LL_DATA, IMG = window.LL_IMG || {};
  var app = document.getElementById('app');
  if (!D) { app.innerHTML = '<div class="card"><p>The question bank did not load. Reload the page.</p></div>'; return; }

  // ---------------------------------------------------------------- helpers
  var SIGN = {}, QBY = {};
  D.signs.forEach(function (s) { SIGN[s.n] = s; });
  D.q.forEach(function (q) { QBY[q.id] = q; });
  var CORE = D.signs.filter(function (s) { return s.core; }).map(function (s) { return s.n; });
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function key(n) { return 's' + ('00' + n).slice(-3); }
  function src(k) { return IMG[k] || ''; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  var LET = ['A', 'B', 'C', 'D'];

  // ---------------------------------------------------------------- state (this device + optional account sync)
  var LS = 'll-trainer-v1';
  var S = { v: 1, u: 0, code: 2, examDate: '', items: {}, exams: [], hideNames: false };
  function loadLocal() { try { var t = localStorage.getItem(LS); if (t) { var o = JSON.parse(t); for (var k in o) S[k] = o[k]; } } catch (e) { } }
  function saveLocal() { S.u = Date.now(); try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { } cloud.push(); }
  function rec(id) { return S.items[id] || [0, 0, 0, 0]; }
  function mark(id, ok) { var r = rec(id).slice(); r[2]++; if (ok) r[0]++; else { r[0] = 0; r[1]++; } r[3] = Math.floor(Date.now() / 60000); S.items[id] = r; }
  function mastered(id) { return rec(id)[0] >= 2; }
  function weak(id) { var r = rec(id); return r[1] > 0 && r[0] < 2; }
  function seen(id) { return rec(id)[2] > 0; }

  var cloud = (function () {
    var ref = null, busy = false, dirty = false, timer = null, node = document.getElementById('sync');
    function say(t) { if (node) node.textContent = t; }
    function merge(remote) {
      // returns 1 if this device learned something, 2 if it also holds newer data than the account copy
      var changed = false, ahead = false;
      if (!remote || typeof remote !== 'object') return 2;
      var ri = remote.items || {}, id;
      for (id in ri) { var a = ri[id], b = S.items[id]; if (!b || (a[3] || 0) > (b[3] || 0)) { S.items[id] = a; changed = true; } }
      for (id in S.items) { var c = ri[id], d = S.items[id]; if (!c || (d[3] || 0) > (c[3] || 0) || d[2] > c[2]) { ahead = true; break; } }
      if ((remote.u || 0) > (S.u || 0)) {
        if (remote.code && remote.code !== S.code) { S.code = remote.code; changed = true; }
        if ((remote.examDate || '') !== S.examDate) { S.examDate = remote.examDate || ''; changed = true; }
      } else if (remote.code !== S.code || (remote.examDate || '') !== S.examDate) ahead = true;
      var have = {}, theirs = {};
      S.exams.forEach(function (e) { have[e.ts] = 1; });
      (remote.exams || []).forEach(function (e) { theirs[e.ts] = 1; if (!have[e.ts]) { S.exams.push(e); changed = true; } });
      S.exams.forEach(function (e) { if (!theirs[e.ts]) ahead = true; });
      S.exams.sort(function (a, b) { return a.ts - b.ts; }); if (S.exams.length > 30) S.exams = S.exams.slice(-30);
      if (changed) { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { } }
      return (changed ? 1 : 0) + (ahead ? 2 : 0);
    }
    function pull() {
      return ref.get().then(function (snap) {
        var m = snap.exists ? merge(snap.data()) : (Object.keys(S.items).length || S.exams.length ? 2 : 0);
        if ((m & 1) && !quiz) route();
        return m;
      });
    }
    function write() {
      if (!ref) return;
      if (busy) { dirty = true; return; }
      busy = true; dirty = false;
      pull().then(function () {
        return ref.set({ v: 1, u: S.u, code: S.code, examDate: S.examDate, items: S.items, exams: S.exams });
      }).then(function () { say('Synced to your account'); }, function () { say('Saved on this device'); })
        .then(function () { busy = false; if (dirty) write(); });
    }
    function init() {
      if (!window.claude || !window.claude.use) return;
      Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
        var db = r[0], user = r[1]; if (!db || !user) return;
        return user.id().then(function (uid) {
          if (!uid) return;
          ref = db.doc('data/users/' + uid + '/progress');
          return pull().then(function (m) { say('Synced to your account'); if (m & 2) write(); });
        });
      }).catch(function () { });
      var lastPull = Date.now();
      document.addEventListener('visibilitychange', function () {
        if (!ref || busy || document.visibilityState !== 'visible' || Date.now() - lastPull < 60000) return;
        lastPull = Date.now(); pull().catch(function () { });
      });
    }
    return { init: init, push: function () { if (!ref) return; clearTimeout(timer); timer = setTimeout(write, 4000); } };
  })();

  // ---------------------------------------------------------------- pools
  function vehSec() { return S.code === 1 ? 'moto' : 'controls'; }
  function secsForCode() { return ['signs', 'rules', vehSec()]; }
  function inCode(q) { return secsForCode().indexOf(q.sec) >= 0; }
  function bankQs(filter) { return D.q.filter(function (q) { return inCode(q) && (!filter || filter(q)); }); }
  function paperQs(t) { return D.q.filter(function (q) { return (q.src === t || (t === 'T3' && /^t1-[123]$/.test(q.id))) && inCode(q); }).sort(function (a, b) { return a.n - b.n; }); }
  function syllabus() { return bankQs().map(function (q) { return q.id; }).concat(CORE.map(function (n) { return 's-' + n; })); }
  var SECNAME = { signs: 'Road signs', rules: 'Rules of the road', controls: 'Vehicle controls', moto: 'Motorcycles' };

  // sign questions generated on the fly
  var GROUP = {};
  D.confuse.forEach(function (g) { g.forEach(function (n) { (GROUP[n] = GROUP[n] || []).push.apply(GROUP[n], g.filter(function (m) { return m !== n; })); }); });
  function distractors(n) {
    var s = SIGN[n], out = [], used = {}; used[s.name] = 1;
    function add(m) { var t = SIGN[m]; if (t && m !== n && !used[t.name]) { used[t.name] = 1; out.push(m); } }
    shuffle(GROUP[n] || []).forEach(add);
    if (out.length < 2) { var near = []; for (var d = 1; d <= 9; d++) { near.push(n - d, n + d); } near.filter(function (m) { return SIGN[m] && SIGN[m].cat === s.cat; }).forEach(add); }
    if (out.length < 2) { shuffle(D.signs.filter(function (t) { return t.cat === s.cat; }).map(function (t) { return t.n; })).forEach(add); }
    return out.slice(0, 2);
  }
  function signQ(n, kind) {
    var s = SIGN[n], all = shuffle([n].concat(distractors(n))), a = all.indexOf(n);
    var why = s.name + (s.mean ? ': ' + s.mean : '.');
    kind = kind || (Math.random() < 0.5 ? 'name' : 'pick');
    if (kind === 'pick') return { id: 's-' + n, sec: 'signs', gen: 1, q: 'Which sign is this: ' + s.name + '?', o: all.map(function (m) { return { img: key(m), sign: m }; }), a: a, why: why, ref: 'Sign ' + n, conf: 'high' };
    return { id: 's-' + n, sec: 'signs', gen: 1, q: 'What is this sign?', img: [key(n)], o: all.map(function (m) { return { t: SIGN[m].name, sign: m }; }), a: a, why: why, ref: 'Sign ' + n, conf: 'high' };
  }
  function byId(id) { return id.slice(0, 2) === 's-' ? signQ(+id.slice(2)) : QBY[id]; }

  function smartBatch(n, ids) {
    ids = ids || syllabus();
    var scored = ids.map(function (id) {
      var r = rec(id), p = weak(id) ? 0 : r[2] === 0 ? 1 : r[0] < 2 ? 0.5 : 3;
      return { id: id, p: p + Math.random() * 0.9 + (p === 3 ? r[3] / 1e9 : 0) };
    }).sort(function (a, b) { return a.p - b.p; });
    return scored.slice(0, n).map(function (x) { return byId(x.id); });
  }

  // ---------------------------------------------------------------- stats
  function stats() {
    var out = { total: 0, done: 0, weak: 0, sec: {} };
    function add(sec, id) { var o = out.sec[sec] = out.sec[sec] || { t: 0, d: 0 }; o.t++; out.total++; if (mastered(id)) { o.d++; out.done++; } if (weak(id)) out.weak++; }
    bankQs().forEach(function (q) { add(q.sec, q.id); });
    CORE.forEach(function (n) { add('signs', 's-' + n); });
    return out;
  }
  function setProgress(ids) { var d = 0; ids.forEach(function (id) { if (mastered(id)) d++; }); return { d: d, t: ids.length }; }

  // ---------------------------------------------------------------- quiz engine
  var quiz = null;
  function prep(q, mix) {
    var order = q.o.map(function (_, i) { return i; });
    if (mix && !q.gen) order = shuffle(order);
    return { q: q, order: order, pick: null, flag: false };
  }
  function startQuiz(o) {
    quiz = { title: o.title, mode: o.mode || 'practice', items: o.qs.map(function (q) { return prep(q, o.mix); }), i: 0, minutes: o.minutes || 0, fmt: o.fmt || null,
      t0: Date.now(), right: 0, asked: 0, back: o.back || 'practice', confirmExit: false, done: false, review: false, firstTry: {} };
    if (quiz.timer) clearInterval(quiz.timer);
    if (quiz.minutes) quiz.timer = setInterval(tick, 1000);
    document.body.classList.add('inquiz');
    renderQuiz(); window.scrollTo(0, 0);
  }
  function endQuiz() { if (quiz && quiz.timer) clearInterval(quiz.timer); quiz = null; document.body.classList.remove('inquiz'); }
  function left() { return Math.max(0, quiz.minutes * 60 - Math.floor((Date.now() - quiz.t0) / 1000)); }
  function clock(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function tick() {
    if (!quiz || quiz.done) return;
    var s = left(), c = document.getElementById('clock');
    if (c) { c.textContent = clock(s); c.classList.toggle('low', s < 300); }
    if (s <= 0) finishExam();
  }
  function optHtml(it, pos, state, reveal) {
    var o = it.q.o[it.order[pos]], cls = 'opt' + (state ? ' ' + state : ''), inner;
    if (o.img) {
      inner = '<span class="k">' + LET[pos] + '</span><span class="plate"><img alt="Option ' + LET[pos] + '" src="' + src(o.img) + '"></span>' +
        (reveal && o.sign ? '<span class="cap">' + esc(SIGN[o.sign].name) + '</span>' : '');
    } else {
      inner = '<span class="k">' + LET[pos] + '</span><span class="x">' + esc(o.t) + '</span>' + (reveal && o.sign ? '<img class="mini" alt="" src="' + src(key(o.sign)) + '">' : '');
    }
    return '<button type="button" class="' + cls + '" data-pick="' + pos + '"' + (reveal ? ' disabled' : '') + '>' + inner + '</button>';
  }
  // {A} {B} {C} in an explanation mean the options as lettered on the paper; show the letter they have on screen now
  function tr(text, it) { return esc(text).replace(/\{([ABC])\}/g, function (_, x) { var o = 'ABC'.indexOf(x); return it ? LET[it.order.indexOf(o)] : x; }); }
  function feedback(it) {
    var q = it.q, ok = it.order[it.pick] === q.a, h = '';
    h += '<div class="fb ' + (ok ? 'ok' : 'no') + '"><h3>' + (ok ? 'Correct' : 'Not quite. The answer is ' + LET[it.order.indexOf(q.a)]) + '</h3><p>' + tr(q.why, it) + '</p>';
    if (q.ref) h += '<p class="ref">Manual: ' + esc(q.ref) + '</p>';
    h += '</div>';
    if (q.pen != null && q.pen !== q.a) h += '<div class="note"><b>Answer-key trap.</b> The pen mark on your paper is on ' + LET[it.order.indexOf(q.pen)] + (q.o[q.pen].t ? ' (' + esc(q.o[q.pen].t) + ')' : '') + (q.conf === 'high' ? '. That mark is wrong.' : '. The manual supports the answer shown here instead.') + '</div>';
    if (q.conf === 'med') h += '<div class="note"><b>Check this one.</b> The manual does not settle this question word for word. This is the best-supported answer.</div>';
    if (q.conf === 'low') h += '<div class="note"><b>Disputed question.</b> More than one option can be defended. Read the explanation and ask your instructor which one the examiner accepts.</div>';
    return h;
  }
  function renderQuiz() {
    var z = quiz, it = z.items[z.i], q = it.q, exam = z.mode === 'exam' && !z.review, answered = it.pick != null;
    var reveal = (z.mode === 'practice' && answered) || z.review;
    var pics = !!q.o[0].img, h = '';
    h += '<div class="qhead"><button type="button" class="btn sm ghost" data-act="exit">Exit</button><span class="t">' + esc(z.title) + '</span>' +
      (z.minutes && !z.review ? '<span class="clock num" id="clock">' + clock(left()) + '</span>' : '<span class="clock num">' + (z.i + 1) + '/' + z.items.length + '</span>') + '</div>';
    if (z.confirmExit) h += '<div class="note">Leave this session? ' + (exam ? 'Your answers will not be marked. ' : '') + '<span class="rowx" style="margin-top:8px"><button type="button" class="btn sm" data-act="exit-yes">Leave</button><button type="button" class="btn sm primary" data-act="exit-no">Keep going</button></span></div>';
    h += '<div class="meter"><span style="width:' + pct(z.i + (answered && !exam ? 1 : 0), z.items.length) + '%"></span></div>';
    h += '<div class="card">';
    h += '<div class="rowx"><span class="eyebrow">' + esc(SECNAME[q.sec] || '') + (q.src && q.src !== 'DRILL' ? ' · ' + (q.src === 'T1' ? 'Test 1' : 'Test 3') + ' question ' + q.n : '') + '</span>' +
      (exam || z.review ? '<span class="tag" style="margin-left:auto">Question ' + (z.i + 1) + ' of ' + z.items.length + '</span>' : '') + '</div>';
    h += '<p class="qtext">' + esc(q.q) + '</p>';
    if (q.img) h += '<div class="qimgs">' + q.img.map(function (k) { return '<span class="plate"><img alt="Sign for this question" src="' + src(k) + '"></span>'; }).join('') + '</div>';
    h += '<div class="opts' + (pics ? ' pics' : '') + '">';
    for (var p = 0; p < it.order.length; p++) {
      var st = '';
      if (reveal) { if (it.order[p] === q.a) st = 'ok'; else if (it.pick === p) st = 'no'; }
      else if (it.pick === p) st = 'sel';
      h += optHtml(it, p, st, reveal);
    }
    h += '</div>';
    if (reveal) {
      if (answered) h += feedback(it);
      else h += '<div class="fb no"><h3>Not answered. The answer is ' + LET[it.order.indexOf(q.a)] + '</h3><p>' + tr(q.why, it) + '</p></div>';
    }
    h += '</div>';
    if (exam || z.review) {
      h += '<div class="rowx"><button type="button" class="btn" data-act="prev"' + (z.i === 0 ? ' disabled' : '') + '>Back</button>' +
        (exam ? '<button type="button" class="btn" data-act="flag">' + (it.flag ? 'Unflag' : 'Flag for review') + '</button>' : '') +
        '<button type="button" class="btn primary grow" data-act="next"' + (z.i === z.items.length - 1 ? ' disabled' : '') + '>Next</button></div>';
      h += '<div class="card flat"><span class="eyebrow">' + (z.review ? 'Your answers' : 'Jump to a question') + '</span><div class="pal">';
      z.items.forEach(function (x, i) {
        var c = i === z.i ? 'cur ' : '';
        if (z.review) c += x.pick != null && x.order[x.pick] === x.q.a ? 'ok' : 'no'; else c += (x.pick != null ? 'done ' : '') + (x.flag ? 'flag' : '');
        h += '<button type="button" class="' + c + '" data-go="' + i + '">' + (i + 1) + '</button>';
      });
      h += '</div>';
      if (exam) {
        var un = z.items.filter(function (x) { return x.pick == null; }).length;
        h += '<button type="button" class="btn primary block" data-act="finish">Finish and mark' + (un ? ' (' + un + ' unanswered)' : '') + '</button>';
      } else h += '<button type="button" class="btn primary block" data-act="results">Back to results</button>';
      h += '</div>';
    } else if (answered) {
      h += '<button type="button" class="btn primary block" data-act="next" id="nextbtn">' + (z.i === z.items.length - 1 ? 'See results' : 'Next question') + '</button>';
    }
    app.innerHTML = h;
    if (answered && !exam && !z.review) { var nb = document.getElementById('nextbtn'); if (nb) nb.scrollIntoView({ block: 'nearest' }); }
  }
  function pickOpt(pos) {
    var z = quiz, it = z.items[z.i];
    if (z.review) return;
    if (z.mode === 'exam') { it.pick = pos; renderQuiz(); return; }
    if (it.pick != null) return;
    it.pick = pos;
    var ok = it.order[pos] === it.q.a, id = it.q.id;
    if (z.firstTry[id] == null) { z.firstTry[id] = ok; z.asked++; if (ok) z.right++; }
    mark(id, ok); saveLocal();
    if (!ok) { // ask again a few questions later, until it is answered correctly
      var again = it.q.gen ? signQ(+id.slice(2)) : it.q;
      z.items.splice(Math.min(z.items.length, z.i + 4), 0, prep(again, true));
    }
    renderQuiz();
  }
  function nextQ() {
    var z = quiz;
    if (z.i < z.items.length - 1) { z.i++; renderQuiz(); window.scrollTo(0, 0); }
    else if (z.mode === 'practice') practiceDone();
  }
  function practiceDone() {
    var z = quiz, missed = Object.keys(z.firstTry).filter(function (id) { return !z.firstTry[id]; });
    endQuiz();
    var st = stats(), h = '<div class="card"><span class="eyebrow">Session complete</span><h1>' + z.right + ' of ' + z.asked + ' right first time</h1>' +
      '<p class="muted">' + (missed.length ? 'The ' + missed.length + ' you missed came back until you got them right. They stay on your weak list until you answer each one correctly twice in a row.' : 'Nothing missed. Each question counts as mastered once you answer it correctly twice in a row.') + '</p>' +
      '<div class="meter road"><span style="width:' + pct(st.done, st.total) + '%"></span></div><p class="small muted">Overall readiness: ' + pct(st.done, st.total) + '% (' + st.done + ' of ' + st.total + ' items mastered)</p>' +
      '<div class="rowx"><a class="btn primary" href="#go-smart">Another 15 questions</a>' + (st.weak ? '<a class="btn" href="#go-weak">Fix ' + st.weak + ' weak spots</a>' : '') + '<a class="btn" href="#home">Home</a></div></div>';
    app.innerHTML = h; window.scrollTo(0, 0);
  }
  function finishExam() {
    var z = quiz; if (!z || z.done) return;
    z.done = true; if (z.timer) clearInterval(z.timer);
    var secs = {}, right = 0;
    z.items.forEach(function (it) {
      var ok = it.pick != null && it.order[it.pick] === it.q.a, part = it.q.sec === 'signs' ? 'signs' : it.q.sec === 'rules' ? 'rules' : 'veh';
      var o = secs[part] = secs[part] || { r: 0, t: 0 }; o.t++; if (ok) { o.r++; right++; }
      mark(it.q.id, ok);
    });
    z.result = { ts: Date.now(), title: z.title, fmt: z.fmt, right: right, total: z.items.length, secs: secs, used: Math.floor((Date.now() - z.t0) / 1000) };
    S.exams.push(z.result); if (S.exams.length > 30) S.exams = S.exams.slice(-30);
    saveLocal(); z.review = false; renderResults(); window.scrollTo(0, 0);
  }
  function passInfo(r) {
    if (r.fmt === 'computer') {
      var need = { rules: 22, signs: 23, veh: 6 }, ok = true, lines = [];
      ['rules', 'signs', 'veh'].forEach(function (k) { var s = r.secs[k] || { r: 0, t: 0 }; var p = s.r >= need[k]; if (!p) ok = false; lines.push({ k: k, r: s.r, t: s.t, need: need[k], p: p }); });
      return { pass: ok, lines: lines, text: 'Reported pass marks: 22 of 28 rules, 23 of 28 signs, 6 of 8 controls. Every section must be passed.' };
    }
    var need2 = Math.ceil(r.total * 0.8);
    return { pass: r.right >= need2, lines: ['signs', 'rules', 'veh'].filter(function (k) { return r.secs[k]; }).map(function (k) { return { k: k, r: r.secs[k].r, t: r.secs[k].t }; }), text: 'Pass mark 80% (the manual gives 72 out of 90). You need ' + need2 + ' of ' + r.total + ' here.' };
  }
  function renderResults() {
    var z = quiz, r = z.result, p = passInfo(r), names = { signs: 'Road signs', rules: 'Rules', veh: S.code === 1 ? 'Motorcycle' : 'Vehicle' };
    document.body.classList.remove('inquiz'); lastView = 'exam'; setTabs();
    var wrong = z.items.filter(function (it) { return !(it.pick != null && it.order[it.pick] === it.q.a); }).length;
    var h = '<div class="card"><span class="eyebrow">' + esc(r.title) + '</span><h1 class="num">' + r.right + ' / ' + r.total + ' · ' + pct(r.right, r.total) + '%</h1>' +
      '<div class="rowx"><span class="tag ' + (p.pass ? 'good' : 'bad') + '">' + (p.pass ? 'Pass' : 'Not yet a pass') + '</span>' + (r.right === r.total ? '<span class="tag good">Full marks</span>' : '') + '<span class="muted small">Time used ' + clock(r.used) + '</span></div>' +
      '<div class="bars">' + p.lines.map(function (l) { return '<div class="b"><span>' + names[l.k] + '</span><div class="meter"><span style="width:' + pct(l.r, l.t) + '%"></span></div><span class="num">' + l.r + '/' + l.t + '</span></div>'; }).join('') + '</div>' +
      '<p class="small muted">' + p.text + '</p>' +
      '<div class="rowx">' + (wrong ? '<button type="button" class="btn primary" data-act="review">Review all ' + z.items.length + ' answers</button>' : '') + '<a class="btn" href="#exam" data-act="leave">Done</a></div></div>';
    if (wrong) {
      h += '<div class="card"><h2>What you missed (' + wrong + ')</h2><div class="list">';
      z.items.forEach(function (it, i) {
        if (it.pick != null && it.order[it.pick] === it.q.a) return;
        var q = it.q, right = q.o[q.a];
        h += '<div class="li"><span class="k num">' + (i + 1) + '</span><div class="grow stack" style="gap:4px"><span><b>' + esc(q.q) + '</b></span>' +
          (q.img ? '<span class="rowx">' + q.img.map(function (k) { return '<img class="mini" style="width:54px;height:46px;object-fit:contain;background:var(--plate);border-radius:4px" alt="" src="' + src(k) + '">'; }).join('') + '</span>' : '') +
          '<span>Answer: ' + (right.img ? '<img alt="" style="width:54px;height:46px;object-fit:contain;background:var(--plate);border-radius:4px;vertical-align:middle" src="' + src(right.img) + '"> ' + (right.sign ? esc(SIGN[right.sign].name) : '') : '<b>' + esc(right.t) + '</b>') + '</span>' +
          '<span class="muted small">' + tr(q.why, it) + '</span></div></div>';
      });
      h += '</div><p class="small muted">Letters refer to the options as you saw them. These questions are now on your weak list.</p><a class="btn" href="#go-weak" data-act="leave">Drill the weak list</a></div>';
    }
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- views
  function bar(label, o) { return '<div class="b"><span>' + label + '</span><div class="meter"><span style="width:' + pct(o.d, o.t) + '%"></span></div><span class="num">' + o.d + '/' + o.t + '</span></div>'; }
  function daysLeft() { if (!S.examDate) return null; var d = new Date(S.examDate + 'T00:00:00'); if (isNaN(d)) return null; var n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((d - n) / 864e5); }

  function vHome() {
    var st = stats(), p = pct(st.done, st.total), dl = daysLeft(), traps = D.q.filter(function (q) { return q.pen != null && q.pen !== q.a; }).length;
    var t1 = setProgress(paperQs('T1').map(function (q) { return q.id; })), t3 = setProgress(paperQs('T3').map(function (q) { return q.id; }));
    var best = S.exams.reduce(function (m, e) { return Math.max(m, pct(e.right, e.total)); }, 0), fulls = S.exams.filter(function (e) { return e.right === e.total; }).length;
    var remain = st.total - st.done, perDay = dl != null && dl > 0 ? Math.ceil(remain / dl) : null;
    var h = '<div class="card"><span class="eyebrow">Readiness for Code ' + S.code + '</span><div class="ready"><div class="big num">' + p + '<small>%</small></div><div class="stack">' +
      '<div class="meter road"><span style="width:' + p + '%"></span></div><p class="small muted"><span class="num">' + st.done + ' of ' + st.total + '</span> items mastered. An item is mastered when you answer it correctly twice in a row.</p></div></div>' +
      '<div class="bars">' + bar('Signs', st.sec.signs) + bar('Rules', st.sec.rules) + bar(S.code === 1 ? 'Motorcycle' : 'Controls', st.sec[vehSec()] || { d: 0, t: 0 }) + '</div>' +
      '<a class="btn primary block" href="#go-smart">' + (st.done === 0 && st.weak === 0 ? 'Start: 15 questions' : 'Continue: next 15 questions') + '</a>' +
      (st.weak ? '<a class="btn block" href="#go-weak">Fix ' + st.weak + ' weak spot' + (st.weak > 1 ? 's' : '') + '</a>' : '') +
      (dl != null ? '<p class="small muted">' + (dl > 0 ? dl + ' day' + (dl > 1 ? 's' : '') + ' to your test. ' + (perDay ? 'Master about ' + perDay + ' items a day to finish in time.' : '') : dl === 0 ? 'Your test is today. Do one mock exam and re-read the traps.' : 'Your test date has passed.') + '</p>' : '') + '</div>';
    h += '<div class="card"><h2>Ready for test day when all four are ticked</h2><div class="list">' +
      chk(t1.d === t1.t, 'Test 1 paper', t1.d + ' of ' + t1.t + ' questions mastered') + chk(t3.d === t3.t, 'Test 3 paper', t3.d + ' of ' + t3.t + ' questions mastered') +
      chk(st.done === st.total, 'Whole syllabus', st.done + ' of ' + st.total + ' signs, rules and vehicle items mastered') +
      chk(fulls >= 2, 'Two mock exams at 100%', S.exams.length ? fulls + ' so far. Best score ' + best + '%' : 'None taken yet') + '</div></div>';
    h += '<div class="tiles">' +
      tile('#traps', 'Answer-key traps', traps + ' pen marks on your papers do not match the manual. Learn these first.', 'warn', 'Read first') +
      tile('#go-t1', 'Test 1 as printed', 'All questions in paper order, with instant feedback.') +
      tile('#go-t3', 'Test 3 as printed', 'All questions in paper order, with instant feedback.') +
      tile('#exam', 'Mock exam', 'Timed 60 minutes, new questions every time.') +
      tile('#go-looks', 'Look-alike signs', 'The pairs and triples that examiners use to catch you.') +
      (S.code === 1 ? '' : tile('#controls', 'Find the control', 'Tap the clutch, the ignition, the parking brake.')) +
      tile('#testday', 'Test day facts', 'Format, timing, what to bring, how to answer.') + '</div>';
    h += '<div class="card"><h2>Your test</h2><div class="rowx"><span class="grow">Licence code</span><div class="seg" role="group" aria-label="Licence code">' +
      [1, 2, 3].map(function (c) { return '<button type="button" data-code="' + c + '" aria-pressed="' + (S.code === c) + '">Code ' + c + '</button>'; }).join('') + '</div></div>' +
      '<p class="small muted">Code 1 is motorcycles. Code 2 is light vehicles (tare under 3 500 kg). Code 3 is heavy vehicles. Codes 2 and 3 answer the same vehicle section.</p>' +
      '<div class="rowx"><label class="grow" for="examdate">Test date (optional)</label><input class="field" style="width:auto" type="date" id="examdate" value="' + esc(S.examDate) + '"></div>' +
      '<div class="rowx"><span class="grow small muted">Start again from zero</span><button type="button" class="btn sm" data-act="reset">Reset progress</button></div><div id="resetbox"></div></div>';
    app.innerHTML = h;
  }
  function chk(ok, a, b) { return '<div class="li"><span class="k">' + (ok ? '<span class="tag good">Done</span>' : '<span class="tag">To do</span>') + '</span><div class="grow"><b>' + a + '</b><br><span class="small muted">' + b + '</span></div></div>'; }
  function tile(href, a, b, tagc, tagt) { return '<a class="tile" href="' + href + '">' + (tagt ? '<span class="tag ' + tagc + '">' + tagt + '</span>' : '') + '<b>' + a + '</b><span>' + b + '</span></a>'; }

  var TOPICS = [
    ['speed', 'Speed limits', /speed limit/i], ['park', 'Stopping and parking', /park|stop within|may not stop|stop alongside|stop on a freeway/i],
    ['size', 'Vehicle sizes and loads', /length|width|height|project|load/i], ['hand', 'Hand signals', /hand signal/i],
    ['tow', 'Towing', /tow/i], ['acc', 'Accidents', /accident/i], ['fwy', 'Freeways', /freeway/i], ['lic', 'Licence facts', /licence|learner/i]
  ];
  function vPractice() {
    var st = stats(), rules = bankQs(function (q) { return q.sec === 'rules'; }), veh = bankQs(function (q) { return q.sec === vehSec(); });
    var t1 = paperQs('T1'), t3 = paperQs('T3'), p1 = setProgress(t1.map(function (q) { return q.id; })), p3 = setProgress(t3.map(function (q) { return q.id; }));
    var pr = setProgress(rules.map(function (q) { return q.id; })), pv = setProgress(veh.map(function (q) { return q.id; }));
    var h = '<h1>Practice</h1><p class="muted">Every answer is explained. A wrong answer comes back a few questions later until you get it right.</p>';
    h += '<div class="tiles">' + tile('#go-smart', 'Smart session', 'Picks 15 from what you have missed and what you have not seen.') +
      tile('#go-weak', 'Weak spots', st.weak ? st.weak + ' items you got wrong and have not yet mastered.' : 'Nothing on the list right now.') + '</div>';
    h += '<div class="card"><h2>Your two papers</h2><div class="list">' +
      setRow('Test 1', p1, 'go-t1', 'go-t1x') + setRow('Test 3', p3, 'go-t3', 'go-t3x') + '</div><p class="small muted">Practise shows the answer after each question. Exam is timed at 60 minutes and marked at the end, in the printed order.</p></div>';
    h += '<div class="card"><h2>By subject</h2><div class="list">' +
      setRow('Rules of the road', pr, 'go-rules') + setRow(S.code === 1 ? 'Motorcycle questions' : 'Vehicle controls', pv, 'go-veh') +
      setRow('Look-alike signs', setProgress(lookIds()), 'go-looks') + '</div>' +
      '<span class="eyebrow">Rules by topic</span><div class="rowx">' + TOPICS.map(function (t) { return '<a class="chip" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center" href="#go-topic-' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div></div>';
    h += '<div class="tiles">' + tile('#traps', 'Answer-key traps', 'Questions where the pen mark on your paper does not match the manual.', 'warn', 'Read first') + tile('#signs', 'Road signs', 'Browse and quiz all 495 numbered signs by category.') + '</div>';
    app.innerHTML = h;
  }
  function setRow(name, p, go, goExam) {
    return '<div class="li"><div class="grow stack" style="gap:6px"><b>' + name + '</b><div class="meter"><span style="width:' + pct(p.d, p.t) + '%"></span></div><span class="small muted num">' + p.d + ' of ' + p.t + ' mastered</span></div>' +
      '<div class="stack" style="gap:6px"><a class="btn sm primary" href="#' + go + '">Practise</a>' + (goExam ? '<a class="btn sm" href="#' + goExam + '">Exam</a>' : '') + '</div></div>';
  }
  function lookIds() { var s = {}; D.confuse.forEach(function (g) { g.forEach(function (n) { if (SIGN[n].core) s[n] = 1; }); }); return Object.keys(s).map(function (n) { return 's-' + n; }); }

  var sv = { cat: 'core', q: '' };
  function signList() {
    var q = sv.q.trim().toLowerCase();
    return D.signs.filter(function (s) {
      if (q) return s.name.toLowerCase().indexOf(q) >= 0 || String(s.n) === q || (s.mean || '').toLowerCase().indexOf(q) >= 0;
      return sv.cat === 'core' ? s.core : sv.cat === 'all' ? true : s.cat === sv.cat;
    });
  }
  function vSigns() {
    var chips = [['core', 'Most tested']].concat(D.cats.map(function (c) { return [c.id, c.title]; })).concat([['all', 'All 495']]);
    var h = '<h1>Road signs</h1><p class="muted">The manual numbers every sign from 1 to 495. The oral test asks for a sign by number, name and purpose. The written test shows the picture.</p>' +
      '<div class="chips" role="group" aria-label="Sign category">' + chips.map(function (c) { return '<button type="button" class="chip" data-cat="' + c[0] + '" aria-pressed="' + (sv.cat === c[0] && !sv.q) + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<input class="field" id="signsearch" type="search" placeholder="Search by name or number, e.g. chevron or 211" value="' + esc(sv.q) + '" aria-label="Search signs">' +
      '<div id="signbody"></div>';
    app.innerHTML = h; drawSigns();
  }
  function drawSigns() {
    var list = signList(), ids = list.map(function (s) { return 's-' + s.n; }), p = setProgress(ids), body = document.getElementById('signbody');
    var h = '<div class="card"><div class="rowx"><div class="grow stack" style="gap:6px"><div class="meter"><span style="width:' + pct(p.d, p.t) + '%"></span></div><span class="small muted num">' + p.d + ' of ' + p.t + ' mastered in this set</span></div>' +
      '<button type="button" class="btn primary" data-act="quizsigns"' + (list.length < 3 ? ' disabled' : '') + '>Quiz 15</button></div>' +
      '<label class="check"><input type="checkbox" id="hidenames"' + (S.hideNames ? ' checked' : '') + '> Hide the names so I can test myself (tap a sign to check)</label></div>';
    h += '<div class="sgrid' + (S.hideNames ? ' hide-names' : '') + '">' + list.map(function (s) {
      var id = 's-' + s.n;
      return '<button type="button" class="sgn" data-sign="' + s.n + '"><span class="no num">' + s.n + '</span><span class="dot' + (mastered(id) ? ' m' : weak(id) ? ' w' : '') + '"></span><span class="plate"><img loading="lazy" alt="Sign ' + s.n + '" src="' + src(key(s.n)) + '"></span><span class="nm">' + esc(s.name) + '</span></button>';
    }).join('') + '</div>';
    if (!list.length) h += '<p class="muted">No sign matches that search.</p>';
    body.innerHTML = h;
  }
  function showSign(n) {
    var s = SIGN[n], c = D.cats.filter(function (x) { return x.id === s.cat; })[0], g = (GROUP[n] || []).filter(function (m, i, a) { return a.indexOf(m) === i; }).slice(0, 5);
    var h = '<div class="overlay" data-act="close"><div class="sheet" role="dialog" aria-label="' + esc(s.name) + '"><div class="rowx"><span class="eyebrow grow">Sign ' + n + ' · ' + esc(c.group) + ' · ' + esc(c.title) + '</span><button type="button" class="btn sm" data-act="close">Close</button></div>' +
      '<div class="plate"><img alt="Sign ' + n + '" src="' + src(key(n)) + '"></div><h2>' + esc(s.name) + '</h2>' + (s.mean ? '<p>' + esc(s.mean) + '</p>' : '') +
      (g.length ? '<span class="eyebrow">Do not confuse with</span><div class="pairs">' + g.map(function (m) { return '<div class="pair"><img alt="" src="' + src(key(m)) + '"><span>' + esc(SIGN[m].name) + '</span></div>'; }).join('') + '</div>' : '') + '</div></div>';
    document.body.appendChild(el(h));
  }

  function tbl(head, rows) { return '<div class="tblw"><table><thead><tr>' + head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return '<td' + (i && /^[\d,.]+ ?(km\/h|m|mm|kg)?$/.test(x) ? ' class="n"' : '') + '>' + x + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
  function sheet(title, inner, open) { return '<details class="sheetx"' + (open ? ' open' : '') + '><summary>' + title + '</summary><div class="in">' + inner + '</div></details>'; }
  function pair(n, t) { return '<div class="pair"><img alt="" src="' + src(key(n)) + '"><span>' + t + '</span></div>'; }
  function vRules() {
    var h = '<h1>Rules at a glance</h1><p class="muted">Short summaries of the numbers and rules the papers ask about. Paragraph numbers refer to chapter 2 of your manual.</p>' +
      '<a class="btn primary block" href="#go-rules">Drill the rules</a>';
    h += sheet('Speed limits (rule 27)', tbl(['Vehicle', 'Urban', 'Gravel', 'Tar', 'Freeway'], [
      ['Car or goods vehicle up to 9 000 kg GVM', '60', '100', '120', '120'], ['Bus or minibus carrying passengers', '60', '100', '100', '100'],
      ['Goods, articulated or combination vehicle over 9 000 kg GVM', '60', '80', '80', '80'], ['Towing WITH a tow-bar or drawbar', '60', '100', '120', '120'],
      ['Towing WITHOUT a tow-bar (rope or chain)', '30', '30', '30', '30'], ['Tractor', '35', '35', '35', 'not allowed']]) +
      '<p class="small muted">All in km/h. Urban is 60 for almost everything. Buses top out at 100. Heavy goods at 80.</p>', true);
    h += sheet('Distances for stopping and parking (rules 11 and 13)', tbl(['Distance', 'What it applies to'], [
      ['450 mm', 'Furthest your wheels may be from the kerb when parked'], ['1 m', 'From the edge of the road when parking outside an urban area'], ['1,5 m', 'From a fire hydrant'],
      ['5 m', 'From an intersection (parking, urban area)'], ['5,5 m', 'No parking on a road narrower than this (urban area)'], ['6 m', 'From a tunnel, subway or bridge, and from a narrowed section of road (stopping)'],
      ['9 m', 'From a pedestrian crossing (stopping and parking)'], ['9 m', 'No stopping alongside another vehicle on a road narrower than this']]) +
      '<ul class="tight"><li>Never stop on the right-hand side facing oncoming traffic, in a railway reserve, or against a sign.</li><li>Never park on a sidewalk, across a private or public entrance, where you hide a road sign, or on a traffic island.</li></ul>');
    h += sheet('Vehicle sizes and loads (rules 33 to 37)', tbl(['Limit', 'Figure'], [
      ['Length, single vehicle', '12,5 m'], ['Length, articulated vehicle or vehicle with semi-trailer', '18,5 m'], ['Length, bus-train', '20 m'], ['Length, any other combination', '22 m'],
      ['Width, ordinary vehicle', '2,5 m'], ['Width, bus or goods vehicle of 12 000 kg GVM and over', '2,6 m'], ['Height, vehicle and load', '4,3 m'], ['Height, double-decker bus', '4,65 m'],
      ['Load beyond the front', '300 mm'], ['Load beyond the rear', '1,8 m'], ['Load to either side, ordinary vehicle', '1,25 m'], ['Load to either side, bus or goods vehicle', '1,3 m']]) +
      '<ul class="tight"><li>Side projection over 150 mm: by day red flags of 300 mm by 300 mm. At night white at the front edge and red at the rear edge.</li><li>Rear projection over 300 mm: by day a red flag. At night red reflectors or lamps on the end (width) and yellow on the sides (length).</li><li>Motorcycle loads: 600 mm front, 900 mm rear, 450 mm each side.</li></ul>');
    h += sheet('Hand signals (rule 8)', '<p>All of a driver\'s hand signals are given with the RIGHT arm, out of the driver\'s window. Use them only when the indicators are out of order. Not on a freeway.</p>' + tbl(['Signal', 'What the right arm does'], [
      ['Stop', 'Out sideways, forearm straight up, palm to the front'], ['Slow down', 'Out sideways, palm turned down, moved slowly up and down'], ['Right turn', 'Straight out and level, palm to the front'],
      ['Left turn', 'Out sideways, forearm pointing down, moved in an anti-clockwise circle'], ['Overtake on the right', 'Below shoulder level, palm forward, moved backward and forward']]) +
      '<p class="small muted">Tractors, two-wheelers and animal-drawn vehicles signal a left turn with the LEFT arm straight out.</p>');
    h += sheet('Overtaking and keeping left (rules 4 to 6)', '<ul class="tight"><li>Drive on the left. Pass on the right, after signalling, and return only when safely clear.</li><li>No overtaking when approaching the summit of a rise, a curve, any place where your view is restricted, or where a sign or marking forbids it.</li>' +
      '<li>Being overtaken: keep as far left as is safe and do not accelerate.</li><li>You may pass on the LEFT when the vehicle ahead is turning right or has signalled right, on a one-way urban road wide enough for two lines, on a wide urban road with two lines each way, on a laned one-way road, or when an officer directs you.</li>' +
      '<li>Change only one lane at a time.</li><li>Never overtake a State motorcade. Pull over, stop and stay stationary.</li></ul>');
    h += sheet('When you must stop (rule 14)', '<ul class="tight"><li>For a road traffic sign.</li><li>For a police or traffic officer or road transport inspector in uniform.</li><li>For a person leading or driving cattle, horses, donkeys, mules, sheep, goats, pigs or ostriches.</li><li>When involved in an accident.</li><li>When a State motorcade approaches.</li><li>When an emergency vehicle approaches.</li><li>At a road traffic checkpoint.</li></ul>');
    h += sheet('Freeways (rule 22)', '<p>Not allowed on a freeway:</p><ul class="tight"><li>Animal-drawn vehicles and pedal cycles.</li><li>Motorcycles of 50 cm3 or less, and electric ones.</li><li>Motor tricycles and quad bikes.</li><li>Tractors, unless working on the freeway.</li><li>Vehicles of 230 kg or less built for a disabled person.</li><li>People on foot, and animals outside a vehicle.</li></ul><p>No stopping except for a sign or officer, in a reserved area, or for a cause beyond your control. No hand signals.</p>');
    h += sheet('Towing (rule 26)', '<ul class="tight"><li>Rope, chain or tow-bar no longer than 3,5 m.</li><li>30 km/h without a tow-bar or drawbar.</li><li>Defective brakes on the towed vehicle: it must be on a drawbar or tow-bar.</li><li>No passengers in the towed vehicle above 30 km/h, unless it is a semi-trailer.</li><li>A licensed driver steers the towed vehicle unless its steering wheels are lifted or controlled by the bar.</li></ul>');
    h += sheet('After an accident (rule 28)', '<ul class="tight"><li>Stop immediately.</li><li>Find out who is hurt and how badly, and help as far as you can.</li><li>Check the damage.</li><li>Give your name and address, the owner\'s name and address and the registration number if asked.</li><li>Report to the police or a traffic officer within 24 hours, with your licence.</li><li>No alcohol or narcotic drugs, unless a doctor orders it.</li><li>Do not move a vehicle where someone was killed or injured unless an officer allows it, or it blocks the road completely and you first mark its position on the road.</li></ul>');
    h += sheet('Lights, belts, phones and general duties (rules 15, 25, 29, 32)', '<ul class="tight"><li>Headlamps, rear lamps and number-plate lamps on from sunset to sunrise and in poor visibility. Motorcycle headlamp on at all times.</li><li>Dip when your main beam could dazzle oncoming traffic.</li><li>Seatbelts for driver and passengers on every trip. A child uses a child restraint, or the belt if there is none.</li>' +
      '<li>No phone in your hand. A phone fixed to the vehicle or a hands-free headset is allowed.</li><li>Hooter for safety only.</li><li>No engine running while refuelling, or while stationary and unattended.</li><li>No wheel-spin or dragging wheels except in an emergency.</li><li>Never drive, pull or push a vehicle on a sidewalk.</li>' +
      '<li>Emergency vehicles get immediate and absolute right of way.</li><li>No convoys from 18h00 Friday to 06h00 Monday.</li></ul>');
    h += sheet('Sign colours and shapes', '<div class="pairs">' + pair(1, 'Red octagon: stop') + pair(5, 'Red inverted triangle: yield') + pair(14, 'Solid blue circle: command, you must') + pair(44, 'Red ring: prohibition, you may not') +
      pair(81, 'Blue rectangle with R: reserved') + pair(170, 'Red triangle: warning') + pair(221, 'Yellow background: temporary') + pair(310, 'Green: direction and information') +
      pair(321, 'Blue rectangle: freeway direction') + pair(286, 'Brown: tourism') + pair(52, 'Hooked arrow: at the junction AHEAD') + pair(53, 'Straight arrow: right here') + '</div>');
    h += sheet('Traffic lights and signals (signs 479 to 495)', tbl(['Signal', 'What to do'], [
      ['Steady red', 'Stop behind the line until green'], ['Flashing red', 'Act as for a 4-way stop'], ['Steady yellow', 'Stop, unless too close to stop safely'], ['Flashing yellow', 'Proceed with caution'],
      ['Steady green', 'Go, yielding to those lawfully in the junction'], ['Steady red arrow', 'Stop if going that way, until green'], ['Flashing green arrow', 'Go only in the direction of the arrow'],
      ['Bus signal, steady yellow', 'Bus stops behind the line until green'], ['Red man', 'Pedestrians may not cross'], ['Flashing red man', 'Do not start to cross'],
      ['Red cross over a lane', 'Do not use that lane'], ['Green arrow over a lane', 'You may use that lane'], ['Railway red flashing', 'Stop until it stops flashing and it is safe']]) +
      '<div class="pairs">' + pair(493, 'Flag out to the side: stop') + pair(494, 'Flag lowered, arm waving: proceed') + pair(495, 'Flag moved up and down: slow down') + pair(488, 'Hand raised: traffic from the front stops') + '</div>');
    h += sheet('Learner\'s licence facts', '<ul class="tight"><li>Valid for 18 months. A driving licence is valid for 5 years.</li><li>Code 1 motorcycle up to 125 cm3 from age 16, over 125 cm3 from 17. Code 2 from 17. Code 3 from 18.</li><li>Always accompanied by a driver licensed for that vehicle.</li><li>Red L, at least 300 mm by 200 mm, in the rear window on the right-hand side.</li><li>No passengers for reward. A learner on a motorcycle without a side-car carries no passengers.</li><li>Carry the learner\'s licence whenever you drive.</li></ul>');
    app.innerHTML = h;
  }

  function vExam() {
    var h = '<h1>Mock exam</h1><p class="muted">Sixty minutes, no feedback until the end. Questions are drawn fresh from your papers, the rule drills and the sign catalogue each time.</p>';
    h += '<div class="tiles"><a class="tile" href="#go-exam-paper"><span class="tag">Paper format</span><b>79 questions</b><span>' + (S.code === 1 ? '43 signs, 24 rules, 12 motorcycle. ' : '43 signs, 24 rules, 12 vehicle. ') + 'The same sections as Test 1 and Test 3. Pass mark 80%.</span></a>' +
      '<a class="tile" href="#go-exam-computer"><span class="tag">Computer format</span><b>64 questions</b><span>28 rules, 28 signs, 8 controls, each section passed separately. Figures reported by study sites, not confirmed by NaTIS.</span></a></div>';
    h += '<div class="card"><h2>Your results</h2>';
    if (!S.exams.length) h += '<p class="muted">No exams taken yet. Your scores will be listed here.</p>';
    else h += '<div class="list">' + S.exams.slice().reverse().map(function (e) { var d = new Date(e.ts); return '<div class="li"><span class="k num">' + pct(e.right, e.total) + '%</span><div class="grow"><b>' + esc(e.title) + '</b><br><span class="small muted num">' + e.right + ' of ' + e.total + ' · ' + d.toLocaleDateString() + ' · ' + clock(e.used) + '</span></div>' + (e.right === e.total ? '<span class="tag good">Full marks</span>' : '') + '</div>'; }).join('') + '</div>';
    h += '</div>';
    app.innerHTML = h;
  }
  function buildExam(fmt) {
    var parts = fmt === 'computer' ? [['rules', 28], ['signs', 28], ['veh', 8]] : [['signs', 43], ['rules', 24], ['veh', 12]], qs = [];
    parts.forEach(function (p) {
      var sec = p[0] === 'veh' ? vehSec() : p[0], pool = shuffle(bankQs(function (q) { return q.sec === sec; })), n = p[1], take;
      if (sec === 'signs') { var fromBank = Math.round(n * 0.55); take = pool.slice(0, fromBank).concat(shuffle(CORE).slice(0, n - fromBank).map(function (m) { return signQ(m); })); take = shuffle(take); }
      else take = pool.slice(0, n);
      qs = qs.concat(take);
    });
    return qs;
  }

  function vTraps() {
    var wrong = D.q.filter(function (q) { return q.pen != null && q.pen !== q.a; }), unsure = D.q.filter(function (q) { return q.conf !== 'high' && !(q.pen != null && q.pen !== q.a) && inCode(q); });
    function item(q) {
      var right = q.o[q.a];
      return '<div class="li"><div class="grow stack" style="gap:6px"><span class="eyebrow">' + (q.src === 'T1' ? 'Test 1' : 'Test 3') + ' question ' + q.n + '</span><b>' + esc(q.q) + '</b>' +
        (q.img ? '<span class="rowx">' + q.img.map(function (k) { return '<span class="plate" style="padding:4px"><img alt="" style="max-height:70px;width:auto" src="' + src(k) + '"></span>'; }).join('') + '</span>' : '') +
        (q.pen != null && q.pen !== q.a ? '<span><span class="tag bad">Pen mark</span> ' + LET[q.pen] + '. ' + (q.o[q.pen].t ? esc(q.o[q.pen].t) : esc(SIGN[q.o[q.pen].sign].name)) + '</span>' : '') +
        (q.conf !== 'high' ? '<span><span class="tag warn">Check this one</span> The manual does not settle it word for word.</span>' : '') +
        '<span><span class="tag good">Answer</span> ' + LET[q.a] + '. ' + (right.t ? esc(right.t) : esc(right.sign ? SIGN[right.sign].name : '')) + '</span><span class="muted small">' + tr(q.why, null) + '</span></div></div>';
    }
    var h = '<h1>Answer-key traps</h1><p class="muted">Every answer on both papers was checked against your manual. The pen marks on Test 1 match except for one. On Test 3 eleven do not match. Eight of the twelve are clear errors and four are judgement calls, marked below. If you memorised the pen marks, unlearn these.</p>' +
      '<a class="btn primary block" href="#go-traps">Drill these ' + (wrong.length + unsure.length) + ' questions</a>' +
      '<div class="card"><h2>Pen mark does not match the manual (' + wrong.length + ')</h2><div class="list">' + wrong.map(item).join('') + '</div></div>' +
      '<div class="card"><h2>Answers the manual does not settle word for word (' + unsure.length + ')</h2><p class="small muted">These carry the best-supported answer. Ask your instructor about them if you can.</p><div class="list">' + unsure.map(item).join('') + '</div></div>';
    app.innerHTML = h;
  }

  var CTRL = [
    ['wheel', 'Steering wheel', 'Steers the vehicle. Hold it with both hands at ten-to-two.'], ['ignition', 'Ignition switch', 'Starts the engine with the ignition key.'],
    ['speedo', 'Speedometer', 'Shows your speed in kilometres per hour.'], ['mirror', 'Rear-view mirror', 'Shows vehicles and objects behind you.'],
    ['clutch', 'Clutch pedal', 'Disengages the engine when you change gear or stop. Left pedal.'], ['brake', 'Service brake (foot brake)', 'Slows and stops the vehicle. Middle pedal.'],
    ['accel', 'Accelerator', 'Raises engine speed to go faster. Right pedal.'], ['hand', 'Parking brake (hand brake)', 'Holds the vehicle when parked or stopped. Release it before moving off.'],
    ['gear', 'Gear lever', 'Selects the gears.'], ['lights', 'Light switch', 'Switches the lights on at night or in poor visibility.'], ['ind', 'Direction indicators', 'Warns others that you intend to turn or change lanes.']
  ];
  var cz = null;
  function dashSvg() {
    function hot(id, inner) { return '<g class="hot" data-ctl="' + id + '" tabindex="0" role="button" aria-label="Control">' + inner + '</g>'; }
    var st = 'fill="#fff" stroke="#17212c" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    return '<svg viewBox="0 0 400 300" role="img" aria-label="Line drawing of a right-hand-drive dashboard">' +
      '<rect x="0" y="0" width="400" height="300" fill="#fff"/>' +
      '<path d="M14 62 L60 8 H340 L386 62" fill="#eef3f8" stroke="#8a97a5" stroke-width="2"/>' +
      '<path d="M8 62 H392 V150 Q392 164 378 164 H22 Q8 164 8 150Z" fill="#f4f6f8" stroke="#8a97a5" stroke-width="2"/>' +
      '<rect x="30" y="92" width="98" height="44" rx="6" fill="#fff" stroke="#8a97a5" stroke-width="2"/><rect x="150" y="82" width="74" height="30" rx="4" fill="#fff" stroke="#8a97a5" stroke-width="2"/>' +
      '<path d="M150 164 H224 V292 H150Z" fill="#f4f6f8" stroke="#8a97a5" stroke-width="2"/>' +
      hot('mirror', '<rect x="164" y="14" width="72" height="22" rx="8" ' + st + '/><path d="M200 8 V14" ' + st + '/>') +
      hot('speedo', '<circle cx="292" cy="96" r="21" ' + st + '/><path d="M292 96 L304 84 M276 100 h4 M292 80 v4 M304 100 h4" ' + st + '/>') +
      hot('lights', '<circle cx="368" cy="96" r="13" ' + st + '/><path d="M368 87 v9 M361 104 h14" ' + st + '/>') +
      hot('ind', '<path d="M334 146 L378 128" ' + st + ' stroke-width="7"/><circle cx="380" cy="127" r="6" ' + st + '/>') +
      hot('wheel', '<circle cx="292" cy="150" r="56" fill="none" stroke="#17212c" stroke-width="13"/><circle cx="292" cy="150" r="56" fill="none" stroke="#fff" stroke-width="7"/><path d="M240 156 H272 M312 156 H344 M292 170 V204" fill="none" stroke="#17212c" stroke-width="9" stroke-linecap="round"/><circle cx="292" cy="154" r="19" ' + st + '/>') +
      hot('ignition', '<circle cx="362" cy="188" r="11" ' + st + '/><path d="M362 181 v14" ' + st + '/>') +
      hot('gear', '<rect x="168" y="176" width="38" height="46" rx="8" ' + st + '/><path d="M187 212 V192" ' + st + ' stroke-width="5"/><circle cx="187" cy="188" r="10" ' + st + '/>') +
      hot('hand', '<rect x="174" y="236" width="26" height="50" rx="9" ' + st + '/><path d="M187 244 v10" ' + st + '/>') +
      hot('clutch', '<rect x="238" y="246" width="26" height="40" rx="5" ' + st + '/><path d="M243 256 h16 M243 266 h16 M243 276 h16" ' + st + ' stroke-width="1.6"/>') +
      hot('brake', '<rect x="276" y="246" width="30" height="40" rx="5" ' + st + '/><path d="M281 256 h20 M281 266 h20 M281 276 h20" ' + st + ' stroke-width="1.6"/>') +
      hot('accel', '<rect x="320" y="238" width="17" height="50" rx="5" ' + st + '/><path d="M324 250 h9 M324 262 h9 M324 274 h9" ' + st + ' stroke-width="1.6"/>') +
      '</svg>';
  }
  function vControls() {
    if (!cz) cz = { order: shuffle(CTRL.map(function (c) { return c[0]; })), i: 0, right: 0, tapped: null };
    var done = cz.i >= cz.order.length, cur = done ? null : CTRL.filter(function (c) { return c[0] === cz.order[cz.i]; })[0];
    var h = '<h1>Find the control</h1><p class="muted">The papers show a line drawing of a dashboard with lettered arrows and ask which letter is the steering wheel, the clutch and so on. The letters in your scans cannot be read, so practise on this drawing. It is a right-hand-drive car, seen from the driver\'s seat.</p>';
    h += '<div class="card">' + (done ? '<h2>' + cz.right + ' of ' + cz.order.length + ' found first time</h2>' : '<span class="eyebrow">Control ' + (cz.i + 1) + ' of ' + cz.order.length + '</span><p class="qtext">Tap the ' + cur[1].toLowerCase() + '.</p>') +
      '<div class="dash">' + dashSvg() + '</div>';
    if (cur && cz.tapped) {
      var ok = cz.tapped === cur[0], got = CTRL.filter(function (x) { return x[0] === cz.tapped; })[0];
      h += '<div class="fb ' + (ok ? 'ok' : 'no') + '"><h3>' + (ok ? 'Correct' : 'That is the ' + got[1].toLowerCase()) + '</h3><p><b>' + cur[1] + '</b>' + (ok ? '. ' : ' is outlined in green. ') + cur[2] + '</p></div>' +
        '<button type="button" class="btn primary block" data-act="ctl-next">' + (cz.i === cz.order.length - 1 ? 'See score' : 'Next control') + '</button>';
    }
    if (done) h += '<button type="button" class="btn primary" data-act="ctl-again">Go again</button>';
    h += '</div>';
    h += '<div class="card"><h2>What each control does</h2><div class="list">' + CTRL.map(function (c) { return '<div class="li"><div class="grow"><b>' + c[1] + '</b><br><span class="small muted">' + c[2] + '</span></div></div>'; }).join('') + '</div><a class="btn" href="#go-veh">Practise the vehicle questions</a></div>';
    app.innerHTML = h;
    if (cur && cz.tapped) {
      var w = app.querySelector('[data-ctl="' + cur[0] + '"]'); if (w) w.classList.add('hit');
      if (cz.tapped !== cur[0]) { var g = app.querySelector('[data-ctl="' + cz.tapped + '"]'); if (g) g.classList.add('miss'); }
    }
  }
  function tapCtl(id) {
    if (!cz || cz.i >= cz.order.length || cz.tapped) return;
    cz.tapped = id; if (id === cz.order[cz.i]) cz.right++;
    vControls();
  }

  function vTestday() {
    var h = '<h1>Test day facts</h1>';
    h += '<div class="card"><h2>The written paper</h2><ul class="tight"><li>You get 60 minutes.</li><li>Every question has three options, A, B or C. Choose one only.</li><li>You shade a circle on a separate answer sheet in pencil. Do not write on the question booklet.</li>' +
      '<li>The examiner works through questions 1 to 3 with everyone as examples.</li><li>Code 1 answers sections B, C and D. Codes 2 and 3 answer sections B, C and E.</li><li>Section B is road signs (questions 4 to 46). Section C is rules (47 to 70). Section E is light and heavy vehicles (79 to 90).</li>' +
      '<li>No talking or whispering. Raise your hand if you have a problem.</li><li>Your manual gives the pass mark as 80%, which is 72 out of 90.</li></ul></div>';
    h += '<div class="card"><h2>The computerised test</h2><p>News reports from 2026 say a computer-based learner\'s test was introduced at the Okahandja NaTIS office on 13 May and is also run from a mobile unit. Reported pass rates were very low, and in August the Ministry of Works and Transport said the question bank was under review.</p>' +
      '<ul class="tight"><li>Ask your NaTIS office which format you will write.</li><li>The Ministry has not published the number of questions or the pass marks. Study sites report 64 to 68 questions in 60 minutes with a separate pass mark for rules, signs and controls.</li><li>On a screen test you can normally go back, review and change answers before you end the test. Once ended, nothing can be changed.</li></ul>' +
      '<p class="small muted">Because the question bank can change, do not rely on memorised answers. Master the signs and the rules themselves, which is what the readiness score measures.</p></div>';
    h += '<div class="card"><h2>How to answer</h2><ul class="tight"><li>Read every question twice. Look for words like NOT, ONLY, AHEAD and ALWAYS.</li><li>With sign pictures, look at the detail that separates look-alikes: thick or thin lines, stripes under the feet, the vehicle shape, a hooked or a straight arrow.</li>' +
      '<li>Answer the ones you know first, then come back to the rest. Never leave a question blank.</li><li>If two options both seem true, pick the one that matches the full rule most closely.</li><li>Use all the time. Check that every answer is on the right line of the answer sheet.</li></ul></div>';
    h += '<div class="card"><h2>What to do the day before</h2><ul class="tight"><li>Read the answer-key traps once more.</li><li>Do one full mock exam.</li><li>Clear your weak list.</li><li>Take your ID and your booking receipt. Arrive early.</li></ul><div class="rowx"><a class="btn" href="#traps">Traps</a><a class="btn" href="#exam">Mock exam</a></div></div>';
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- router and actions
  var VIEWS = { home: vHome, practice: vPractice, signs: vSigns, rules: vRules, exam: vExam, traps: vTraps, controls: vControls, testday: vTestday };
  var GO = {
    'go-smart': function () { startQuiz({ title: 'Smart session', qs: smartBatch(15), mix: true, back: 'home' }); },
    'go-weak': function () {
      var ids = syllabus().filter(weak);
      if (!ids.length) { location.hash = '#practice'; return; }
      startQuiz({ title: 'Weak spots', qs: shuffle(ids).slice(0, 20).map(byId), mix: true, back: 'home' });
    },
    'go-t1': function () { startQuiz({ title: 'Test 1', qs: paperQs('T1') }); },
    'go-t3': function () { startQuiz({ title: 'Test 3', qs: paperQs('T3') }); },
    'go-t1x': function () { startQuiz({ title: 'Test 1 exam', qs: paperQs('T1'), mode: 'exam', minutes: 60, fmt: 'paper', back: 'exam' }); },
    'go-t3x': function () { startQuiz({ title: 'Test 3 exam', qs: paperQs('T3'), mode: 'exam', minutes: 60, fmt: 'paper', back: 'exam' }); },
    'go-rules': function () { startQuiz({ title: 'Rules', qs: smartBatch(20, bankQs(function (q) { return q.sec === 'rules'; }).map(function (q) { return q.id; })), mix: true }); },
    'go-veh': function () { startQuiz({ title: S.code === 1 ? 'Motorcycles' : 'Vehicle controls', qs: smartBatch(20, bankQs(function (q) { return q.sec === vehSec(); }).map(function (q) { return q.id; })), mix: true }); },
    'go-looks': function () { startQuiz({ title: 'Look-alike signs', qs: smartBatch(15, lookIds()), mix: true }); },
    'go-traps': function () { startQuiz({ title: 'Traps', qs: shuffle(D.q.filter(function (q) { return inCode(q) && ((q.pen != null && q.pen !== q.a) || q.conf !== 'high'); })), mix: true, back: 'traps' }); },
    'go-exam-paper': function () { startQuiz({ title: 'Mock exam, paper format', qs: buildExam('paper'), mode: 'exam', minutes: 60, fmt: 'paper', mix: true, back: 'exam' }); },
    'go-exam-computer': function () { startQuiz({ title: 'Mock exam, computer format', qs: buildExam('computer'), mode: 'exam', minutes: 60, fmt: 'computer', mix: true, back: 'exam' }); }
  };
  TOPICS.forEach(function (t) {
    GO['go-topic-' + t[0]] = function () {
      var ids = bankQs(function (q) { return (q.sec === 'rules' || q.sec === 'controls') && t[2].test(q.q); }).map(function (q) { return q.id; });
      startQuiz({ title: t[1], qs: smartBatch(Math.min(20, ids.length), ids), mix: true });
    };
  });
  var lastView = 'home';
  function route(force) {
    var name = typeof force === 'string' ? force : (location.hash || '#home').slice(1);
    var o = document.querySelector('.overlay'); if (o) o.remove();
    if (GO[name]) { if (quiz) endQuiz(); GO[name](); history.replaceState(null, '', '#' + lastView); setTabs(); return; }
    if (quiz) endQuiz();
    if (!VIEWS[name]) name = 'home';
    lastView = name; VIEWS[name](); setTabs(); window.scrollTo(0, 0);
  }
  function setTabs() {
    var cur = lastView === 'traps' || lastView === 'controls' ? 'practice' : lastView === 'testday' ? 'home' : lastView;
    [].forEach.call(document.querySelectorAll('nav.tabs a'), function (a) { if (a.getAttribute('data-tab') === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('hashchange', route);

  document.addEventListener('click', function (e) {
    // a link to the screen that is already in the address bar fires no hashchange, so route it by hand
    var link = e.target.closest('a[href^="#"]');
    if (link && (link.getAttribute('href') === location.hash || (link.getAttribute('href') === '#home' && !location.hash))) {
      e.preventDefault(); if (quiz) endQuiz(); route(link.getAttribute('href').slice(1)); return;
    }
    var t = e.target.closest('[data-pick],[data-act],[data-go],[data-code],[data-cat],[data-sign],[data-ctl]');
    if (!t) return;
    if (t.hasAttribute('data-pick') && quiz) { pickOpt(+t.getAttribute('data-pick')); return; }
    if (t.hasAttribute('data-go') && quiz) { quiz.i = +t.getAttribute('data-go'); renderQuiz(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-code')) { S.code = +t.getAttribute('data-code'); saveLocal(); vHome(); return; }
    if (t.hasAttribute('data-cat')) { sv.cat = t.getAttribute('data-cat'); sv.q = ''; vSigns(); return; }
    if (t.hasAttribute('data-sign')) { showSign(+t.getAttribute('data-sign')); return; }
    if (t.hasAttribute('data-ctl')) { tapCtl(t.getAttribute('data-ctl')); return; }
    var a = t.getAttribute('data-act');
    if (a === 'close') { if (e.target === t || t.tagName === 'BUTTON') { var o = document.querySelector('.overlay'); if (o) o.remove(); } return; }
    if (a === 'leave') { endQuiz(); return; }
    if (a === 'reset') { document.getElementById('resetbox').innerHTML = '<div class="note">Delete all progress and exam results? <span class="rowx" style="margin-top:8px"><button type="button" class="btn sm" data-act="reset-yes">Delete</button><button type="button" class="btn sm primary" data-act="reset-no">Keep</button></span></div>'; return; }
    if (a === 'reset-no') { document.getElementById('resetbox').innerHTML = ''; return; }
    if (a === 'reset-yes') { S.items = {}; S.exams = []; saveLocal(); vHome(); return; }
    if (a === 'quizsigns') { startQuiz({ title: 'Road signs', qs: smartBatch(15, signList().map(function (s) { return 's-' + s.n; })), back: 'signs' }); return; }
    if (a === 'ctl-again') { cz = null; vControls(); return; }
    if (a === 'ctl-next') { cz.i++; cz.tapped = null; vControls(); return; }
    if (!quiz) return;
    if (a === 'exit') { if (quiz.done) { var b0 = quiz.back; endQuiz(); if (location.hash === '#' + b0) route(); else location.hash = '#' + b0; return; } quiz.confirmExit = true; renderQuiz(); return; }
    if (a === 'exit-no') { quiz.confirmExit = false; renderQuiz(); return; }
    if (a === 'exit-yes') { var b = quiz.back; endQuiz(); if (location.hash === '#' + b) route(); else location.hash = '#' + b; return; }
    if (a === 'next') { nextQ(); return; }
    if (a === 'prev') { if (quiz.i > 0) { quiz.i--; renderQuiz(); window.scrollTo(0, 0); } return; }
    if (a === 'flag') { quiz.items[quiz.i].flag = !quiz.items[quiz.i].flag; renderQuiz(); return; }
    if (a === 'finish') { finishExam(); return; }
    if (a === 'review') { quiz.review = true; quiz.i = 0; document.body.classList.add('inquiz'); renderQuiz(); window.scrollTo(0, 0); return; }
    if (a === 'results') { renderResults(); window.scrollTo(0, 0); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { var g = e.target.closest && e.target.closest('[data-ctl]'); if (g) { e.preventDefault(); tapCtl(g.getAttribute('data-ctl')); } }
    if (e.key === 'Escape') { var o = document.querySelector('.overlay'); if (o) o.remove(); }
    if (!quiz || e.target.tagName === 'INPUT') return;
    var k = e.key.toLowerCase(), i = 'abc'.indexOf(k);
    if (k.length === 1 && i >= 0) pickOpt(i);
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && document.getElementById('nextbtn')) nextQ();
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'signsearch') { sv.q = e.target.value; drawSigns(); }
    if (e.target.id === 'examdate') { S.examDate = e.target.value; saveLocal(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'hidenames') { S.hideNames = e.target.checked; saveLocal(); drawSigns(); }
    if (e.target.id === 'examdate') { vHome(); }
  });

  loadLocal();
  route();
  cloud.init();
})();
