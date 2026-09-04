/* Menus, settings, results screen and the wiring that starts a match. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U;

  function el(id) { return document.getElementById(id); }

  var STORE = 'ff_settings_v1';

  var UI = {
    settings: {
      name: 'YOU',
      quality: 'medium',
      bots: 24,
      sensitivity: 100,
      volume: 55,
      invertY: false,
      aimAssist: true
    },

    init: function (game) {
      this.game = game;
      this.load();

      var self = this;
      el('btn-play').addEventListener('click', function () { self.startMatch(); });
      el('btn-settings').addEventListener('click', function () { self.show('settings-screen'); });
      el('btn-howto').addEventListener('click', function () { self.show('howto-screen'); });
      el('btn-settings-back').addEventListener('click', function () { self.show('menu-screen'); });
      el('btn-howto-back').addEventListener('click', function () { self.show('menu-screen'); });
      el('btn-again').addEventListener('click', function () { self.startMatch(); });
      el('btn-menu').addEventListener('click', function () {
        el('results-screen').classList.remove('show');
        self.show('menu-screen');
      });
      el('btn-resume').addEventListener('click', function () { self.game.togglePause(); });
      el('btn-quit').addEventListener('click', function () {
        self.game.paused = false;
        self.game.running = false;
        el('pause').classList.remove('show');
        self.show('menu-screen');
      });

      this.bindSetting('set-name', 'name', 'value');
      this.bindSetting('set-quality', 'quality', 'value');
      this.bindSetting('set-bots', 'bots', 'number');
      this.bindSetting('set-sens', 'sensitivity', 'number');
      this.bindSetting('set-volume', 'volume', 'number');
      this.bindSetting('set-invert', 'invertY', 'checked');
      this.bindSetting('set-assist', 'aimAssist', 'checked');

      this.apply();
      this.show('menu-screen');
    },

    bindSetting: function (id, key, kind) {
      var node = el(id), self = this;
      if (!node) return;
      var evt = (kind === 'checked' || node.tagName === 'SELECT') ? 'change' : 'input';
      node.addEventListener(evt, function () {
        self.settings[key] = kind === 'checked' ? node.checked
          : (kind === 'number' ? Number(node.value) : node.value);
        self.apply();
        self.save();
      });
    },

    apply: function () {
      var s = this.settings;
      if (el('set-name')) el('set-name').value = s.name;
      if (el('set-quality')) el('set-quality').value = s.quality;
      if (el('set-bots')) el('set-bots').value = s.bots;
      if (el('set-sens')) el('set-sens').value = s.sensitivity;
      if (el('set-volume')) el('set-volume').value = s.volume;
      if (el('set-invert')) el('set-invert').checked = s.invertY;
      if (el('set-assist')) el('set-assist').checked = s.aimAssist;

      if (el('lbl-bots')) el('lbl-bots').textContent = s.bots + ' bots';
      if (el('lbl-sens')) el('lbl-sens').textContent = s.sensitivity + '%';
      if (el('lbl-volume')) el('lbl-volume').textContent = s.volume + '%';

      FF.audio.setVolume(s.volume / 100 * 0.9);
      if (this.game && this.game.controller) {
        var c = this.game.controller;
        c.sensitivity = 0.0022 * (s.sensitivity / 100);
        c.touchSensitivity = 0.0042 * (s.sensitivity / 100);
        c.invertY = s.invertY;
        c.aimAssist = s.aimAssist;
      }
    },

    load: function () {
      try {
        var raw = global.localStorage.getItem(STORE);
        if (raw) {
          var saved = JSON.parse(raw);
          for (var k in saved) {
            if (Object.prototype.hasOwnProperty.call(this.settings, k)) this.settings[k] = saved[k];
          }
        }
      } catch (e) { /* storage may be unavailable; defaults are fine */ }
    },

    save: function () {
      try { global.localStorage.setItem(STORE, JSON.stringify(this.settings)); } catch (e) {}
    },

    show: function (id) {
      var screens = document.querySelectorAll('.screen');
      for (var i = 0; i < screens.length; i++) screens[i].classList.remove('show');
      if (id) el(id).classList.add('show');
      el('hud').classList.toggle('hidden', !!id);
    },

    startMatch: function () {
      var s = this.settings;
      el('results-screen').classList.remove('show');
      this.show(null);
      FF.audio.init();
      FF.audio.resume();
      FF.audio.setVolume(s.volume / 100 * 0.9);

      this.game.start({
        playerName: (s.name || 'YOU').slice(0, 12),
        quality: s.quality,
        bots: s.bots
      });
      this.apply();

      var canvas = this.game.renderer.domElement;
      if (!('ontouchstart' in global)) canvas.requestPointerLock();
    },

    showResults: function (r) {
      el('res-title').textContent = r.won ? 'BOOYAH!' : '#' + r.placement;
      el('res-title').className = r.won ? 'booyah' : 'placed';
      el('res-sub').textContent = r.won
        ? 'Last one standing'
        : 'You placed #' + r.placement + ' of ' + (this.game.botCount + 1);
      el('res-kills').textContent = r.kills;
      el('res-damage').textContent = r.damage;
      el('res-time').textContent = U.formatTime(r.survived);
      el('results-screen').classList.add('show');
      el('hud').classList.add('hidden');
    }
  };

  FF.ui = UI;

  global.addEventListener('load', function () {
    var game = new FF.Game();
    game.initRenderer();
    FF.ui.init(game);
    global.FFGAME = game;
  });
})(window);
