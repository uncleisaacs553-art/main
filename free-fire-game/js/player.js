/* Local player: input (keyboard/mouse + touch), third-person camera, actions. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function PlayerController(game, actor) {
    this.game = game;
    this.a = actor;
    this.camera = game.camera;

    this.keys = {};
    this.mouseDown = false;
    this.rightDown = false;
    this.sensitivity = 0.0022;
    this.touchSensitivity = 0.0042;
    this.invertY = false;
    this.aimAssist = true;

    this.camDist = 4.2;
    this.camDistTarget = 4.2;
    this.camShake = 0;
    this.fovBase = 72;

    this.move = { x: 0, y: 0 };      // virtual stick, -1..1
    this.lookDelta = { x: 0, y: 0 };
    this.touchFire = false;
    this.wantJump = false;

    this._dir = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._headPos = new THREE.Vector3();
    this._tmp = new THREE.Vector3();

    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  /* ---------------------------------------------------------------- input */

  PlayerController.prototype._bindKeyboard = function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      var k = e.code;
      self.keys[k] = true;
      if (!self.game.running) return;

      if (k === 'KeyR') self.a.startReload();
      else if (k === 'Digit1') self.a.switchTo('primary');
      else if (k === 'Digit2') self.a.switchTo('sidearm');
      else if (k === 'Digit3') self.a.switchTo('melee');
      else if (k === 'KeyE') self.pickup();
      else if (k === 'KeyF') self.game.deployGloo(self.a);
      else if (k === 'KeyH') self.useItem('medkit');
      else if (k === 'KeyJ') self.useItem('armor');
      else if (k === 'KeyM') self.game.hud.toggleMap();
      else if (k === 'Space') self.wantJump = true;
      else if (k === 'Escape') self.game.togglePause();
    });
    window.addEventListener('keyup', function (e) { self.keys[e.code] = false; });
    window.addEventListener('blur', function () { self.keys = {}; self.mouseDown = false; });
  };

  PlayerController.prototype._bindMouse = function () {
    var self = this;
    var canvas = this.game.renderer.domElement;

    canvas.addEventListener('mousedown', function (e) {
      if (!self.game.running) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); return; }
      if (e.button === 0) self.mouseDown = true;
      if (e.button === 2) self.rightDown = true;
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) self.mouseDown = false;
      if (e.button === 2) self.rightDown = false;
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== canvas) return;
      self.lookDelta.x += e.movementX * self.sensitivity;
      self.lookDelta.y += e.movementY * self.sensitivity * (self.invertY ? -1 : 1);
    });

    window.addEventListener('wheel', function (e) {
      if (!self.game.running) return;
      self.a.switchTo(self.a.current === 'primary' ? 'sidearm' : 'primary');
      e.preventDefault();
    }, { passive: false });
  };

  PlayerController.prototype._bindTouch = function () {
    var self = this;
    var stick = document.getElementById('stick');
    var knob = document.getElementById('stick-knob');
    var look = document.getElementById('look-area');
    var stickId = null, lookId = null, origin = { x: 0, y: 0 };

    function stickStart(e) {
      var t = e.changedTouches[0];
      stickId = t.identifier;
      origin.x = t.clientX; origin.y = t.clientY;
      e.preventDefault();
    }
    function stickMove(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== stickId) continue;
        var dx = t.clientX - origin.x, dy = t.clientY - origin.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        var max = 52;
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        self.move.x = dx / max;
        self.move.y = -dy / max;
      }
      e.preventDefault();
    }
    function stickEnd(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier !== stickId) continue;
        stickId = null;
        knob.style.transform = 'translate(0,0)';
        self.move.x = 0; self.move.y = 0;
      }
    }

    if (stick) {
      stick.addEventListener('touchstart', stickStart, { passive: false });
      stick.addEventListener('touchmove', stickMove, { passive: false });
      stick.addEventListener('touchend', stickEnd);
      stick.addEventListener('touchcancel', stickEnd);
    }

    if (look) {
      look.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        lookId = t.identifier;
        origin.lx = t.clientX; origin.ly = t.clientY;
        e.preventDefault();
      }, { passive: false });
      look.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier !== lookId) continue;
          self.lookDelta.x += (t.clientX - origin.lx) * self.touchSensitivity;
          self.lookDelta.y += (t.clientY - origin.ly) * self.touchSensitivity * (self.invertY ? -1 : 1);
          origin.lx = t.clientX; origin.ly = t.clientY;
        }
        e.preventDefault();
      }, { passive: false });
      look.addEventListener('touchend', function () { lookId = null; });
    }

    function hold(id, down, up) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', function (e) { down(); e.preventDefault(); }, { passive: false });
      el.addEventListener('touchend', function (e) { if (up) up(); e.preventDefault(); }, { passive: false });
      el.addEventListener('mousedown', function (e) { down(); e.preventDefault(); });
      el.addEventListener('mouseup', function (e) { if (up) up(); e.preventDefault(); });
    }

    hold('btn-fire', function () { self.touchFire = true; }, function () { self.touchFire = false; });
    hold('btn-ads', function () { self.rightDown = !self.rightDown; });
    hold('btn-jump', function () { self.wantJump = true; });
    hold('btn-crouch', function () { self.touchCrouch = !self.touchCrouch; });
    hold('btn-reload', function () { self.a.startReload(); });
    hold('btn-med', function () { self.useItem('medkit'); });
    hold('btn-gloo', function () { self.game.deployGloo(self.a); });
    hold('btn-pick', function () { self.pickup(); });
    hold('btn-swap', function () {
      self.a.switchTo(self.a.current === 'primary' ? 'sidearm' : 'primary');
    });
  };

  /* -------------------------------------------------------------- actions */

  PlayerController.prototype.pickup = function () {
    var l = this.game.nearestLoot(this.a, 2.6);
    if (l) this.game.tryPickup(this.a, l, false);
  };

  PlayerController.prototype.useItem = function (kind) {
    var a = this.a;
    if (a.channel || !a.alive) return;
    if (kind === 'medkit') {
      if (a.items.medkit <= 0) { this.game.hud.announce('No med kits'); return; }
      if (a.health >= CFG.player.maxHealth) { this.game.hud.announce('Health is full'); return; }
      a.channel = { kind: 'medkit', time: CFG.items.medkit.time, total: CFG.items.medkit.time };
    } else if (kind === 'armor') {
      if (a.items.armor <= 0) { this.game.hud.announce('No armor plates'); return; }
      if (a.armor >= CFG.player.maxArmor) { this.game.hud.announce('Armor is full'); return; }
      a.channel = { kind: 'armor', time: CFG.items.armor.time, total: CFG.items.armor.time };
    }
  };

  /* ---------------------------------------------------------------- update */

  PlayerController.prototype.update = function (dt) {
    var a = this.a;
    if (!a.alive) { this._updateCamera(dt, true); return; }

    /* Look */
    a.yaw -= this.lookDelta.x;
    a.pitch -= this.lookDelta.y;
    a.pitch = U.clamp(a.pitch, -1.35, 1.25);
    this.lookDelta.x = 0; this.lookDelta.y = 0;

    if (a.pendingKick) {
      a.pitch = U.clamp(a.pitch + a.pendingKick, -1.35, 1.25);
      a.pendingKick = 0;
    }
    a.recoil = Math.max(0, a.recoil - dt * 7);

    /* Stance */
    var k = this.keys;
    var kx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    var kz = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    var mx = kx + this.move.x;
    var mz = kz + this.move.y;
    var len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) { mx /= len; mz /= len; }

    a.crouching = !!(k.ControlLeft || k.KeyC || this.touchCrouch);
    a.ads = this.rightDown && a.state === 'ground';
    a.sprinting = !!(k.ShiftLeft || k.ShiftRight) && !a.ads && !a.crouching && mz > 0.2;

    if (this.wantJump) { a.jump(); this.wantJump = false; }

    /* Convert stick input into world directions relative to facing. */
    var sinY = Math.sin(a.yaw), cosY = Math.cos(a.yaw);
    var wx = mx * cosY + mz * sinY;
    var wz = -mx * sinY + mz * cosY;

    if (a.state === 'ground') {
      a.fireCooldown = Math.max(0, a.fireCooldown - dt);
      if (a.reloading > 0) {
        a.reloading -= dt;
        if (a.reloading <= 0) a._finishReload();
      }
      this._updateChannel(dt);
      this._tryFire(dt);
    }

    a.move(wx, wz, dt);
    this._updateCamera(dt, false);
  };

  PlayerController.prototype._updateChannel = function (dt) {
    var a = this.a;
    if (!a.channel) return;
    var planar = Math.sqrt(a.vel.x * a.vel.x + a.vel.z * a.vel.z);
    if (planar > 4.5) { a.channel = null; this.game.hud.announce('Interrupted'); return; }
    a.channel.time -= dt;
    if (a.channel.time <= 0) {
      if (a.channel.kind === 'medkit') { a.items.medkit--; a.heal(CFG.items.medkit.heal); }
      else { a.items.armor--; a.addArmor(CFG.items.armor.value); }
      this.game.audio.heal();
      a.channel = null;
    }
  };

  PlayerController.prototype._tryFire = function () {
    var a = this.a;
    var w = a.weapon();
    var wantFire = this.mouseDown || this.touchFire;
    if (!wantFire) { this._semiLatch = false; return; }
    if (w.fire !== 'auto') {
      if (this._semiLatch) return;
      this._semiLatch = true;
    }

    var dir = this._dir;
    this.camera.getWorldDirection(dir);
    if (this.aimAssist) this._applyAimAssist(dir);
    if (this.game.combat.fire(a, dir)) {
      this.camShake = Math.min(0.5, this.camShake + w.recoil * 0.02);
    }
  };

  /* Nudge the shot toward a visible enemy inside a small cone — the same
     forgiveness mobile shooters give touch players. */
  PlayerController.prototype._applyAimAssist = function (dir) {
    var a = this.a, cam = this.camera;
    var best = null, bestDot = Math.cos(a.ads ? 0.035 : 0.065);
    var actors = this.game.actors;
    for (var i = 0; i < actors.length; i++) {
      var o = actors[i];
      if (o === a || !o.alive || o.state !== 'ground') continue;
      var d = this._tmp.set(o.pos.x - cam.position.x, o.pos.y + 1.15 - cam.position.y,
                            o.pos.z - cam.position.z);
      var dist = d.length();
      if (dist > a.weapon().range) continue;
      d.divideScalar(dist);
      var dot = d.dot(dir);
      if (dot > bestDot &&
          this.game.world.losClear(cam.position.x, cam.position.y, cam.position.z,
                                   o.pos.x, o.pos.y + 1.15, o.pos.z)) {
        bestDot = dot; best = d.clone();
      }
    }
    if (best) dir.lerp(best, 0.55).normalize();
  };

  PlayerController.prototype._updateCamera = function (dt, dead) {
    var a = this.a, cam = this.camera;
    var head = this._headPos.set(a.pos.x, a.pos.y + (a.crouching ? 1.25 : 1.62), a.pos.z);

    if (dead) {
      this.camDistTarget = 7;
      a.pitch = U.damp(a.pitch, -0.5, 2, dt);
    } else {
      this.camDistTarget = a.ads ? 2.2 : (a.state === 'ground' ? 4.2 : 7.5);
    }
    this.camDist = U.damp(this.camDist, this.camDistTarget, 10, dt);

    // Over-the-shoulder: the camera and its aim point share the same lateral
    // offset, so the avatar sits off to the left and never covers the reticle.
    var side = a.ads ? 0.62 : 1.15;
    var lift = a.ads ? 0.22 : 0.50;
    var cp = Math.cos(a.pitch), sp = Math.sin(a.pitch);
    var back = this._camPos.set(
      head.x - Math.sin(a.yaw) * cp * this.camDist + Math.cos(a.yaw) * side,
      head.y + sp * this.camDist + lift,
      head.z - Math.cos(a.yaw) * cp * this.camDist - Math.sin(a.yaw) * side
    );

    // Pull the camera in if a wall is between it and the head.
    var dx = back.x - head.x, dy = back.y - head.y, dz = back.z - head.z;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
    var hit = this.game.world.rayHit(head.x, head.y, head.z, dx / len, dy / len, dz / len, len);
    if (hit >= 0) {
      var t = Math.max(0.6, hit - 0.35) / len;
      back.set(head.x + dx * t, head.y + dy * t, head.z + dz * t);
    }

    if (this.camShake > 0.001) {
      back.x += U.rand(-1, 1) * this.camShake * 0.05;
      back.y += U.rand(-1, 1) * this.camShake * 0.05;
      this.camShake = U.damp(this.camShake, 0, 9, dt);
    }

    cam.position.copy(back);
    cam.lookAt(
      head.x + Math.sin(a.yaw) * cp * 20 + Math.cos(a.yaw) * side * 0.9,
      head.y + sp * 20 + lift * 0.5,
      head.z + Math.cos(a.yaw) * cp * 20 - Math.sin(a.yaw) * side * 0.9
    );

    var zoom = a.ads ? a.weapon().zoom : 1;
    var wantFov = this.fovBase / zoom;
    if (Math.abs(cam.fov - wantFov) > 0.05) {
      cam.fov = U.damp(cam.fov, wantFov, 12, dt);
      cam.updateProjectionMatrix();
    }
  };

  FF.PlayerController = PlayerController;
})(window);
