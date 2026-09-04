/* The shrinking safe zone: phase timing, contraction and out-of-zone damage. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function Zone(game) {
    this.game = game;
    this.phase = 0;
    this.timer = CFG.zone[0].hold;
    this.shrinking = false;

    this.cx = U.rand(-40, 40);
    this.cz = U.rand(-40, 40);
    this.radius = CFG.zoneStartRadius;

    this.fromX = this.cx; this.fromZ = this.cz; this.fromR = this.radius;
    this.toX = this.cx; this.toZ = this.cz; this.toR = this.radius;

    this._pickNext();
    this._build();
    this._tickAcc = 0;
    this._warned = -1;
  }

  Zone.prototype._build = function () {
    var geo = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x38b6ff, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false
    }));
    this.game.scene.add(this.mesh);

    // A second, brighter ring marks where the zone is heading.
    this.next = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.01, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    this.next.rotation.x = -Math.PI / 2;
    this.game.scene.add(this.next);
    this._sync();
  };

  /* Next circle is always fully inside the current one. */
  Zone.prototype._pickNext = function () {
    var cfg = CFG.zone[this.phase];
    if (!cfg) return;
    var slack = Math.max(0, this.radius - cfg.radius);
    var a = Math.random() * Math.PI * 2;
    var d = Math.random() * slack * 0.62;
    this.toX = this.cx + Math.cos(a) * d;
    this.toZ = this.cz + Math.sin(a) * d;
    this.toR = cfg.radius;
    this.fromX = this.cx; this.fromZ = this.cz; this.fromR = this.radius;
  };

  Zone.prototype._sync = function () {
    var h = 90;
    this.mesh.scale.set(Math.max(0.01, this.radius), h, Math.max(0.01, this.radius));
    this.mesh.position.set(this.cx, h / 2 - 20, this.cz);
    var r = Math.max(0.01, this.toR);
    this.next.scale.set(r, r, 1);
    this.next.position.set(this.toX, 0.4, this.toZ);
    this.next.visible = !this.shrinking && this.toR > 0.5;
  };

  Zone.prototype.currentPhase = function () { return CFG.zone[this.phase]; };

  Zone.prototype.dps = function () {
    var cfg = CFG.zone[Math.min(this.phase, CFG.zone.length - 1)];
    return cfg ? cfg.dps : CFG.zone[CFG.zone.length - 1].dps;
  };

  Zone.prototype.contains = function (x, z) {
    return U.dist2D(x, z, this.cx, this.cz) <= this.radius;
  };

  Zone.prototype.update = function (dt) {
    var cfg = CFG.zone[this.phase];

    if (cfg) {
      this.timer -= dt;
      if (!this.shrinking) {
        if (this.timer <= 0) {
          this.shrinking = true;
          this.timer = cfg.shrink;
          this._shrinkTotal = cfg.shrink;
          this.game.hud.announce('The safe zone is shrinking!');
          this.game.audio.alarm();
        } else if (this.timer < 10 && this._warned !== this.phase) {
          this._warned = this.phase;
          this.game.hud.announce('Zone closes in 10s');
        }
      } else {
        var t = 1 - U.clamp(this.timer / this._shrinkTotal, 0, 1);
        var e = t * t * (3 - 2 * t); // smoothstep, so the edge eases in and out
        this.cx = U.lerp(this.fromX, this.toX, e);
        this.cz = U.lerp(this.fromZ, this.toZ, e);
        this.radius = U.lerp(this.fromR, this.toR, e);
        if (this.timer <= 0) {
          this.cx = this.toX; this.cz = this.toZ; this.radius = this.toR;
          this.shrinking = false;
          this.phase++;
          var nxt = CFG.zone[this.phase];
          if (nxt) { this.timer = nxt.hold; this._pickNext(); }
        }
      }
    }

    this._sync();

    // Zone damage ticks once a second so the numbers stay readable.
    this._tickAcc += dt;
    if (this._tickAcc >= 1) {
      this._tickAcc -= 1;
      var dmg = this.dps();
      var actors = this.game.actors;
      for (var i = 0; i < actors.length; i++) {
        var a = actors[i];
        if (!a.alive || a.state !== 'ground') continue;
        if (!this.contains(a.pos.x, a.pos.z)) {
          a.applyDamage(dmg, null, 'zone');
          if (a === this.game.player) {
            this.game.hud.flashZone();
            this.game.audio.hurt();
          }
        }
      }
    }
  };

  /* Seconds until the next state change, for the HUD timer. */
  Zone.prototype.timeLeft = function () { return Math.max(0, this.timer); };
  Zone.prototype.statusLabel = function () {
    if (!CFG.zone[this.phase]) return 'FINAL ZONE';
    return this.shrinking ? 'ZONE CLOSING' : 'NEXT ZONE';
  };

  FF.Zone = Zone;
})(window);
