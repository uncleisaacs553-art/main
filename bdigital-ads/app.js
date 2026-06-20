/*
 * B Digital — Ads Explainer
 * A vertical 1080×1920, 15-second animated explainer ad.
 *
 * Recreated from a Claude Design handoff (ads-video.jsx, a self-contained React
 * prototype) as a dependency-free vanilla build: no React, no Babel, no bundler.
 * Every dimension, colour, font, timing and easing is transcribed from the
 * source so the visual output matches frame-for-frame.
 *
 * Configurable like the original component props, via URL query:
 *   ?accent=<css-color>   (default oklch(0.70 0.17 52) — the B Digital orange)
 *   ?cta=<text>           (default bdigital-na.lovable.app)
 *
 * Controls: space = play/pause · ←/→ seek (shift = 1s) · 0/Home = restart ·
 * click/drag the scrubber to seek.
 */
(function () {
  'use strict';

  // ───────────────────────── Easing ─────────────────────────
  var easeOutCubic = function (t) { return (--t) * t * t + 1; };
  var easeInCubic = function (t) { return t * t * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // ───────────────────────── Design tokens ─────────────────────────
  var PAPER = '#ffffff';
  var INK = '#1a1613';
  var MUTE = '#8c847b';
  var ORANGE = 'oklch(0.70 0.17 52)';
  var ORANGE_SOFT = 'oklch(0.96 0.03 60)';
  var DISP = "'Space Grotesk', system-ui, sans-serif";
  var MONO = "'JetBrains Mono', ui-monospace, monospace";
  var SIDE = 96;

  // ───────────────────────── DOM helpers ─────────────────────────
  // Properties React leaves unitless; everything else numeric becomes px.
  var UNITLESS = { opacity: 1, zIndex: 1, fontWeight: 1, lineHeight: 1, flex: 1, flexGrow: 1, flexShrink: 1, order: 1, zoom: 1 };
  function setStyle(el, s) {
    for (var k in s) {
      var v = s[k];
      el.style[k] = (typeof v === 'number' && !UNITLESS[k]) ? v + 'px' : v;
    }
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) append(el, c[i]); return; }
    if (typeof c === 'string' || typeof c === 'number') { el.appendChild(document.createTextNode(String(c))); return; }
    el.appendChild(c);
  }
  // h(tag, opts, ...children). opts: { style, html, title, onClick, on<Event>, <attr> }
  function h(tag, opts) {
    var el = document.createElement(tag);
    opts = opts || {};
    for (var k in opts) {
      if (k === 'style') { setStyle(el, opts[k]); }
      else if (k === 'html') { el.innerHTML = opts[k]; }
      else if (k === 'title') { el.title = opts[k]; }
      else if (k.indexOf('on') === 0 && typeof opts[k] === 'function') { el.addEventListener(k.slice(2).toLowerCase(), opts[k]); }
      else { el.setAttribute(k, opts[k]); }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  // ───────────────────────── Animation helpers ─────────────────────────
  // Reveal: fade + slide-up keyed off a delay within the scene's local time.
  function reveal(lt, delay, dur, y) {
    var e = easeOutCubic(clamp((lt - delay) / dur, 0, 1));
    return { opacity: e, transform: 'translateY(' + ((1 - e) * y) + 'px)' };
  }
  function applyReveal(el, r) { el.style.opacity = r.opacity; el.style.transform = r.transform; }
  // Scene fade: ease in over the first inDur, ease out over the last outDur.
  function sceneFade(lt, dur, inDur, outDur) {
    inDur = inDur || 0.3; outDur = outDur || 0.3;
    var inT = easeOutCubic(clamp(lt / inDur, 0, 1));
    var outStart = dur - outDur;
    var outT = lt > outStart ? easeInCubic(clamp((lt - outStart) / outDur, 0, 1)) : 0;
    return inT * (1 - outT);
  }

  // ───────────────────────── Shared pieces ─────────────────────────
  function Logo(accent, size, dark) {
    size = size || 64;
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 18 } },
      h('div', { style: { width: size, height: size, borderRadius: 16, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: DISP, fontWeight: 700, fontSize: size * 0.56, lineHeight: 1 } }, 'B'),
      h('span', { style: { fontFamily: DISP, fontWeight: 600, fontSize: size * 0.5, color: dark ? PAPER : INK, letterSpacing: '-0.01em' } }, 'B Digital')
    );
  }

  function glyph(kind, accent) {
    var inner;
    if (kind === 'web') {
      inner = '<rect x="3" y="4" width="18" height="14" rx="2" stroke="' + accent + '" stroke-width="1.8"/>' +
        '<path d="M3 8h18" stroke="' + accent + '" stroke-width="1.8"/>' +
        '<circle cx="5.5" cy="6" r="0.6" fill="' + accent + '"/><circle cx="7.6" cy="6" r="0.6" fill="' + accent + '"/>';
    } else if (kind === 'social') {
      inner = '<circle cx="8" cy="8" r="3" stroke="' + accent + '" stroke-width="1.8"/>' +
        '<path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" stroke="' + accent + '" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M16 6.5a3 3 0 010 5M15.5 14c2.5.3 4.5 2.3 4.5 5" stroke="' + accent + '" stroke-width="1.8" stroke-linecap="round"/>';
    } else {
      inner = '<path d="M4 16V9M9 16V5M14 16v-4M19 16V7" stroke="' + accent + '" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path d="M3 20h18" stroke="' + accent + '" stroke-width="1.9" stroke-linecap="round"/>';
    }
    return h('span', { style: { display: 'flex' }, html: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none">' + inner + '</svg>' });
  }

  // SceneShell: full-bleed, vertically-centred column with side padding.
  function sceneShell(bg) {
    return h('div', { style: { position: 'absolute', inset: 0, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 ' + SIDE + 'px', boxSizing: 'border-box' } });
  }

  // ───────────────────────── Scenes ─────────────────────────
  function HookScene(accent) {
    var root = sceneShell(PAPER);
    var logoWrap = h('div', { style: { position: 'absolute', top: 120, left: SIDE } }, Logo(accent, 62, false));
    var eyebrow = h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 38 } },
      h('span', { style: { width: 40, height: 4, borderRadius: 2, background: accent } }),
      h('span', { style: { fontFamily: MONO, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTE, fontWeight: 500 } }, 'Digital services · Windhoek')
    );
    var l1 = h('div', {}, 'Get your');
    var l2 = h('div', {}, 'business ', h('span', { style: { color: accent } }, 'online.'));
    var head = h('div', { style: { fontFamily: DISP, fontWeight: 700, fontSize: 112, lineHeight: 1.0, color: INK, letterSpacing: '-0.03em' } }, l1, l2);
    var sub = h('div', { style: { marginTop: 44, fontFamily: DISP, fontWeight: 400, fontSize: 40, lineHeight: 1.38, color: MUTE, maxWidth: 740 } }, 'Websites, social media & Facebook ads — built and managed for you.');
    append(root, [logoWrap, eyebrow, head, sub]);
    return {
      root: root,
      update: function (lt, dur) {
        root.style.opacity = sceneFade(lt, dur);
        applyReveal(logoWrap, reveal(lt, 0.0, 0.4, -8));
        applyReveal(eyebrow, reveal(lt, 0.25, 0.4, 12));
        applyReveal(l1, reveal(lt, 0.5, 0.5, 30));
        applyReveal(l2, reveal(lt, 0.65, 0.5, 30));
        applyReveal(sub, reveal(lt, 1.0, 0.5, 22));
      }
    };
  }

  function ServicesScene(accent) {
    var root = sceneShell(PAPER);
    var eyebrow = h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 34 } },
      h('span', { style: { width: 40, height: 4, borderRadius: 2, background: accent, display: 'block' } }),
      h('span', { style: { fontFamily: MONO, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTE, fontWeight: 500 } }, 'What we do for you')
    );
    var data = [
      ['web', 'Websites that win customers', 'A clean, fast site that turns visitors into messages.'],
      ['social', 'Social media that gets seen', 'Pages set up right, posts that reach real local people.'],
      ['ads', 'Facebook ads, managed', 'We set the goal, audience & creative — and report monthly.']
    ];
    var list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 26 } });
    var cards = data.map(function (s) {
      var card = h('div', { style: { display: 'flex', alignItems: 'center', gap: 30, background: ORANGE_SOFT, border: '1px solid rgba(26,22,19,0.06)', borderRadius: 24, padding: '38px 40px' } },
        h('span', { style: { flexShrink: 0, width: 96, height: 96, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(26,22,19,0.07)' } }, glyph(s[0], accent)),
        h('div', {},
          h('div', { style: { fontFamily: DISP, fontWeight: 600, fontSize: 46, color: INK, letterSpacing: '-0.02em', marginBottom: 10 } }, s[1]),
          h('div', { style: { fontFamily: DISP, fontWeight: 400, fontSize: 32, lineHeight: 1.34, color: MUTE } }, s[2])
        )
      );
      list.appendChild(card);
      return card;
    });
    append(root, [eyebrow, list]);
    return {
      root: root,
      update: function (lt, dur) {
        root.style.opacity = sceneFade(lt, dur);
        applyReveal(eyebrow, reveal(lt, 0.05, 0.4, 14));
        cards.forEach(function (c, i) { applyReveal(c, reveal(lt, 0.35 + i * 0.28, 0.5, 34)); });
      }
    };
  }

  function ValueScene(accent) {
    var root = sceneShell(accent);
    var eyebrow = h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 } },
      h('span', { style: { width: 40, height: 4, borderRadius: 2, background: '#fff' } }),
      h('span', { style: { fontFamily: MONO, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontWeight: 500 } }, 'Simple, honest pricing')
    );
    var big = h('div', {}, h('span', { style: { display: 'block', fontFamily: DISP, fontWeight: 700, fontSize: 110, lineHeight: 1.0, color: '#fff', letterSpacing: '-0.03em', whiteSpace: 'nowrap' } }, 'From N$1,500'));
    var sub = h('div', { style: { marginTop: 24, fontFamily: MONO, fontSize: 34, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' } }, '/ month — ads management');
    var line = h('div', { style: { marginTop: 56, fontFamily: DISP, fontWeight: 500, fontSize: 44, lineHeight: 1.3, color: '#fff', maxWidth: 760 } },
      'You set the budget. ', h('span', { style: { opacity: 0.78 } }, 'We do the work and send a monthly report.'));
    append(root, [eyebrow, big, sub, line]);
    return {
      root: root,
      update: function (lt, dur) {
        root.style.opacity = sceneFade(lt, dur);
        applyReveal(eyebrow, reveal(lt, 0.1, 0.4, 12));
        applyReveal(big, reveal(lt, 0.32, 0.55, 34));
        applyReveal(sub, reveal(lt, 0.55, 0.5, 22));
        applyReveal(line, reveal(lt, 0.85, 0.5, 22));
      }
    };
  }

  function CTAScene(accent, ctaUrl) {
    var root = sceneShell(PAPER);
    var logoWrap = h('div', {}, Logo(accent, 94, false));
    var head = h('div', { style: { marginTop: 56, fontFamily: DISP, fontWeight: 700, fontSize: 88, lineHeight: 1.04, color: INK, letterSpacing: '-0.03em' } }, "Let's grow it", h('br'), 'together.');
    var globe = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.8"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="#fff" stroke-width="1.8"/></svg>';
    var pill = h('div', { style: { marginTop: 52, display: 'inline-flex', alignItems: 'center', gap: 18, background: accent, color: '#fff', padding: '28px 44px', borderRadius: 999 } },
      h('span', { style: { display: 'flex' }, html: globe }),
      h('span', { style: { fontFamily: MONO, fontWeight: 600, fontSize: 40, letterSpacing: '-0.01em' } }, ctaUrl)
    );
    root.appendChild(h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' } }, logoWrap, head, pill));
    return {
      root: root,
      update: function (lt, dur) {
        root.style.opacity = sceneFade(lt, dur);
        var lr = reveal(lt, 0.1, 0.5, 24);
        var pulse = 1 + Math.sin(lt * 2.4) * 0.014;
        logoWrap.style.opacity = lr.opacity;
        logoWrap.style.transform = lr.transform + ' scale(' + pulse + ')';
        applyReveal(head, reveal(lt, 0.32, 0.5, 26));
        applyReveal(pill, reveal(lt, 0.6, 0.5, 22));
      }
    };
  }

  // ───────────────────────── Playback chrome ─────────────────────────
  var ICON_RESET = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  var ICON_PLAY = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2l9 5-9 5V2z" fill="currentColor"/></svg>';
  var ICON_PAUSE = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>';

  function iconButton(svg, onClick, title) {
    var btn = h('button', { title: title, html: svg, style: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f6f4ef', cursor: 'pointer', padding: 0, transition: 'background 120ms' } });
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(255,255,255,0.12)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(255,255,255,0.04)'; });
    return btn;
  }

  // ───────────────────────── Stage ─────────────────────────
  // Holds the fixed-size canvas, auto-scales it to the viewport, drives the
  // timeline (rAF), mounts/unmounts scenes by their time window, and renders
  // the top progress bar + the scrubber bar.
  function createStage(mount, opts) {
    var width = opts.width, height = opts.height, duration = opts.duration;
    var loop = opts.loop !== false, accent = opts.accent;
    var sprites = opts.sprites, persistKey = opts.persistKey || 'stage', videoRoot = opts.videoRoot;

    var time = (function () { try { var v = parseFloat(localStorage.getItem(persistKey + ':t') || '0'); return isFinite(v) ? clamp(v, 0, duration) : 0; } catch (e) { return 0; } })();
    var playing = opts.autoplay !== false;
    var hoverTime = null, scale = 1, dragging = false, lastTs = null, lastSec = -1, lastPlaying = null;

    function persist() { try { localStorage.setItem(persistKey + ':t', String(time)); } catch (e) {} }
    function setTime(t) { time = clamp(t, 0, duration); persist(); }

    // Canvas + top progress bar
    var canvas = h('div', { style: { width: width, height: height, background: opts.background, position: 'relative', transformOrigin: 'center', flexShrink: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden' } });
    var topFill = h('div', { style: { height: '100%', width: '0%', background: accent } });
    canvas.appendChild(h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'rgba(26,22,19,0.06)', zIndex: 50 } }, topFill));
    var canvasArea = h('div', { style: { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 } }, canvas);

    // Scrubber bar
    function fmt(t) { var tot = Math.max(0, t); var m = Math.floor(tot / 60); var s = Math.floor(tot % 60); var cs = Math.floor((tot * 100) % 100); return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0'); }
    var playBtn = iconButton(ICON_PLAY, function () { playing = !playing; }, 'Play/pause (space)');
    var curTime = h('div', { style: { fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums', width: 64, textAlign: 'right' } }, fmt(time));
    var fill = h('div', { style: { position: 'absolute', left: 0, width: '0%', height: 4, background: accent, borderRadius: 2 } });
    var handle = h('div', { style: { position: 'absolute', left: '0%', top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6, background: '#fff', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.4)' } });
    var track = h('div', { style: { flex: 1, height: 22, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' } },
      h('div', { style: { position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2 } }), fill, handle);
    var bar = h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(20,20,20,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 680, alignSelf: 'center', borderRadius: 8, color: '#f6f4ef', fontFamily: DISP, userSelect: 'none', flexShrink: 0 } },
      iconButton(ICON_RESET, function () { setTime(0); }, 'Return to start (0)'),
      playBtn, curTime, track,
      h('div', { style: { fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums', width: 64, color: 'rgba(246,244,239,0.55)' } }, fmt(duration)));

    function timeFromEvent(e) { var r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * duration; }
    track.addEventListener('mousemove', function (e) { if (!dragging) hoverTime = timeFromEvent(e); });
    track.addEventListener('mouseleave', function () { if (!dragging) hoverTime = null; });
    track.addEventListener('mousedown', function (e) { dragging = true; setTime(timeFromEvent(e)); hoverTime = null; });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('mousemove', function (e) { if (dragging) setTime(timeFromEvent(e)); });

    var outer = h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a' } }, canvasArea, bar);
    mount.appendChild(outer);

    // Auto-scale the fixed canvas into the available space (52px reserved for the bar)
    function measure() { var s = Math.min(outer.clientWidth / width, (outer.clientHeight - 52) / height); scale = Math.max(0.05, s); canvas.style.transform = 'scale(' + scale + ')'; }
    measure();
    if (window.ResizeObserver) { new ResizeObserver(measure).observe(outer); }
    window.addEventListener('resize', measure);

    // Keyboard transport
    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); playing = !playing; }
      else if (e.code === 'ArrowLeft') setTime(time - (e.shiftKey ? 1 : 0.1));
      else if (e.code === 'ArrowRight') setTime(time + (e.shiftKey ? 1 : 0.1));
      else if (e.key === '0' || e.code === 'Home') setTime(0);
    });
    window.__bdSeek = function (t) { playing = false; setTime(t); };

    function frame(ts) {
      if (lastTs == null) lastTs = ts;
      var dt = (ts - lastTs) / 1000; lastTs = ts;
      if (playing) { var n = time + dt; if (n >= duration) { if (loop) n = n % duration; else { n = duration; playing = false; } } time = n; persist(); }

      var displayTime = hoverTime != null ? hoverTime : time;

      // Mount/animate the active scene(s); unmount the rest.
      for (var i = 0; i < sprites.length; i++) {
        var sp = sprites[i];
        var active = displayTime >= sp.start && displayTime <= sp.end;
        if (active) {
          if (!sp.mounted) { canvas.appendChild(sp.obj.root); sp.mounted = true; }
          sp.obj.update(Math.max(0, displayTime - sp.start), sp.end - sp.start);
        } else if (sp.mounted) { canvas.removeChild(sp.obj.root); sp.mounted = false; }
      }

      var pct = clamp(displayTime / duration, 0, 1) * 100;
      topFill.style.width = pct + '%';
      fill.style.width = pct + '%';
      handle.style.left = pct + '%';
      curTime.textContent = fmt(displayTime);
      if (playing !== lastPlaying) { playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; lastPlaying = playing; }

      var sec = Math.floor(displayTime);
      if (sec !== lastSec) { lastSec = sec; if (videoRoot) videoRoot.setAttribute('data-screen-label', 't=' + sec + 's'); }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ───────────────────────── Boot ─────────────────────────
  function init() {
    var params = new URLSearchParams(location.search);
    var accent = params.get('accent') || ORANGE;
    var ctaUrl = params.get('cta') || 'bdigital-na.lovable.app';

    var videoRoot = h('div', { 'data-video-root': '', 'data-screen-label': 't=0s', style: { position: 'absolute', inset: 0 } });
    document.getElementById('app').appendChild(videoRoot);

    var sprites = [
      { start: 0, end: 4, obj: HookScene(accent), mounted: false },
      { start: 4, end: 9.5, obj: ServicesScene(accent), mounted: false },
      { start: 9.5, end: 12.3, obj: ValueScene(accent), mounted: false },
      { start: 12.3, end: 15, obj: CTAScene(accent, ctaUrl), mounted: false }
    ];

    createStage(videoRoot, { width: 1080, height: 1920, duration: 15, background: PAPER, persistKey: 'bdigital-ads-v2', accent: accent, sprites: sprites, videoRoot: videoRoot });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
