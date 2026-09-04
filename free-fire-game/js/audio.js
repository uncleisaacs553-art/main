/* Procedural sound effects. No asset files: everything is synthesised. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};

  function Audio() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.noiseBuf = null;
  }

  Audio.prototype.init = function () {
    if (this.ctx) return;
    var Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) { this.enabled = false; return; }
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    var len = this.ctx.sampleRate * 1.0;
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  };

  Audio.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Audio.prototype.setVolume = function (v) {
    if (this.master) this.master.gain.value = v;
  };

  Audio.prototype._noise = function (dur, gain, filterType, freqFrom, freqTo) {
    var ctx = this.ctx, now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freqFrom, now);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), now + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(now); src.stop(now + dur + 0.02);
  };

  Audio.prototype._tone = function (freqFrom, freqTo, dur, gain, type) {
    var ctx = this.ctx, now = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freqFrom, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), now + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + dur + 0.02);
  };

  /* dist = metres from the listener; 0 for the local player's own gun. */
  Audio.prototype.shot = function (weaponId, dist) {
    if (!this.enabled || !this.ctx) return;
    var atten = 1 / (1 + (dist || 0) * 0.055);
    if (atten < 0.03) return;
    var profile = {
      hg8:   [0.13, 0.55, 2600, 320],
      smg40: [0.10, 0.45, 2200, 300],
      arx:   [0.17, 0.70, 3000, 220],
      sg12:  [0.28, 0.85, 1500, 110],
      m1887: [0.30, 0.90, 1400, 100],
      dmr7:  [0.24, 0.80, 2600, 160],
      awms:  [0.42, 1.00, 2000, 80],
      fist:  [0.08, 0.30, 900, 200]
    }[weaponId] || [0.15, 0.6, 2400, 260];

    this._noise(profile[0], profile[1] * atten, 'lowpass', profile[2], profile[3]);
    this._tone(180, 55, profile[0] * 1.4, 0.35 * atten, 'square');
    if (dist > 45) this._noise(0.5, 0.14 * atten, 'lowpass', 500, 90); // distant crack tail
  };

  Audio.prototype.reload = function () {
    if (!this.enabled || !this.ctx) return;
    var self = this;
    this._noise(0.05, 0.25, 'highpass', 1800, 900);
    setTimeout(function () { if (self.ctx) self._noise(0.06, 0.22, 'highpass', 1200, 600); }, 260);
    setTimeout(function () { if (self.ctx) self._noise(0.05, 0.3, 'highpass', 2400, 1200); }, 620);
  };

  Audio.prototype.hitmark = function (head) {
    if (!this.enabled || !this.ctx) return;
    this._tone(head ? 1500 : 950, head ? 900 : 620, 0.08, 0.3, 'triangle');
  };

  Audio.prototype.hurt = function () {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.18, 0.5, 'lowpass', 700, 160);
    this._tone(140, 70, 0.2, 0.25, 'sawtooth');
  };

  Audio.prototype.pickup = function () {
    if (!this.enabled || !this.ctx) return;
    this._tone(620, 1180, 0.11, 0.24, 'triangle');
  };

  Audio.prototype.kill = function () {
    if (!this.enabled || !this.ctx) return;
    var self = this;
    this._tone(700, 1000, 0.1, 0.3, 'square');
    setTimeout(function () { if (self.ctx) self._tone(1000, 1500, 0.16, 0.28, 'square'); }, 90);
  };

  Audio.prototype.alarm = function () {
    if (!this.enabled || !this.ctx) return;
    this._tone(880, 440, 0.5, 0.18, 'sine');
  };

  Audio.prototype.gloo = function () {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.35, 0.4, 'lowpass', 900, 200);
    this._tone(300, 120, 0.35, 0.2, 'sine');
  };

  Audio.prototype.heal = function () {
    if (!this.enabled || !this.ctx) return;
    this._tone(400, 800, 0.35, 0.2, 'sine');
  };

  Audio.prototype.step = function () {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.06, 0.10, 'lowpass', 500, 180);
  };

  Audio.prototype.plane = function () {
    if (!this.enabled || !this.ctx) return;
    this._noise(1.6, 0.22, 'lowpass', 380, 150);
  };

  Audio.prototype.booyah = function () {
    if (!this.enabled || !this.ctx) return;
    var self = this, notes = [523, 659, 784, 1047];
    notes.forEach(function (n, i) {
      setTimeout(function () {
        if (self.ctx) self._tone(n, n * 1.02, 0.28, 0.26, 'triangle');
      }, i * 130);
    });
  };

  FF.audio = new Audio();
})(window);
