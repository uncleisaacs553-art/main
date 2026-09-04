/* Bot AI: a small state machine per bot (loot / rotate / engage / heal / roam)
   with staggered perception so 24 of them stay cheap. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function Bot(game, actor, skill) {
    this.game = game;
    this.a = actor;
    this.skill = skill;                       // 0 = fodder, 1 = deadly
    this.state = 'loot';
    this.target = null;
    this.dest = null;
    this.destTimer = 0;

    this.visionTimer = Math.random() * 0.2;
    this.reaction = 0;
    this.burst = 0;
    this.burstPause = 0;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = U.rand(CFG.bot.strafeSwap[0], CFG.bot.strafeSwap[1]);
    this.avoidSide = Math.random() < 0.5 ? 1 : -1;
    this.lastSeenPos = new THREE.Vector3();
    this.aimPoint = new THREE.Vector3();
    this.aimWander = new THREE.Vector3();
    this.wanderTimer = 0;
    this.alertTimer = 0;
    this.landing = null;

    this._dir = new THREE.Vector3();
    this._eye = new THREE.Vector3();
  }

  /* Bots land nearly empty, same as the player, and loot their way up.
     Stronger bots get a slightly better start so the lobby has real threats. */
  Bot.prototype.equipStart = function () {
    var a = this.a;
    a.giveAmmo('light', 60);
    a.giveAmmo('heavy', 30);
    a.giveWeapon('hg8', 'sidearm');
    if (this.skill > 0.65 && Math.random() < 0.5) a.giveWeapon(U.pick(['smg40', 'sg12']));
    a.items.medkit = U.randInt(0, 2);
    a.items.gloo = U.randInt(0, 1);
  };

  Bot.prototype.update = function (dt) {
    var a = this.a;
    if (!a.alive) return;

    if (a.state !== 'ground') { this._skydive(dt); return; }

    a.fireCooldown = Math.max(0, a.fireCooldown - dt);
    if (a.reloading > 0) {
      a.reloading -= dt;
      if (a.reloading <= 0) a._finishReload();
    }
    a.recoil = Math.max(0, a.recoil - dt * 6);
    this.alertTimer = Math.max(0, this.alertTimer - dt);

    this.visionTimer -= dt;
    if (this.visionTimer <= 0) {
      this.visionTimer = 0.18 + Math.random() * 0.12;
      this._perceive();
      this._decide();
    }

    this._act(dt);
    this._channel(dt);
  };

  Bot.prototype._skydive = function (dt) {
    var a = this.a;
    if (!this.landing) {
      var z = this.game.zone;
      var ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * z.radius * 0.8;
      var poi = Math.random() < 0.65 ? U.pick(this.game.world.pois) : null;
      this.landing = poi
        ? { x: poi.x + U.rand(-18, 18), z: poi.z + U.rand(-18, 18) }
        : { x: z.cx + Math.cos(ang) * r, z: z.cz + Math.sin(ang) * r };
    }
    var dx = this.landing.x - a.pos.x, dz = this.landing.z - a.pos.z;
    var d = Math.sqrt(dx * dx + dz * dz) || 1;
    a.yaw = Math.atan2(dx, dz);
    a.move(dx / d, dz / d, dt);
  };

  /* ------------------------------------------------------------ perception */

  Bot.prototype._perceive = function () {
    var a = this.a, world = this.game.world;
    var eye = a.eyePos(this._eye);
    var best = null, bestScore = -Infinity;

    // Being shot makes a bot alert regardless of facing.
    if (a.lastAttacker && a.lastAttacker.alive) {
      this.alertTimer = 4;
      if (!this.target) this.target = a.lastAttacker;
      a.lastAttacker = null;
    }

    var range = a.weapon().zoom > 2 ? CFG.bot.viewRangeScoped : CFG.bot.viewRange;
    range *= U.lerp(0.8, 1.15, this.skill);

    var actors = this.game.actors;
    for (var i = 0; i < actors.length; i++) {
      var o = actors[i];
      if (o === a || !o.alive || o.state !== 'ground') continue;
      var d = U.dist2D(a.pos.x, a.pos.z, o.pos.x, o.pos.z);
      if (d > range) continue;

      if (this.alertTimer <= 0 && o !== this.target) {
        // Early on, only react to someone right on top of you — the opening
        // minute should be looting, not cross-map duels.
        if (this.game.time < CFG.bot.passiveUntil && d > CFG.bot.passiveEngageRange) continue;
        var toAng = Math.atan2(o.pos.x - a.pos.x, o.pos.z - a.pos.z);
        if (Math.abs(U.angleDelta(a.yaw, toAng)) > CFG.bot.fov / 2) continue;
      }
      if (!world.losClear(eye.x, eye.y, eye.z, o.pos.x, o.pos.y + 1.15, o.pos.z)) continue;

      // Prefer close and already-wounded opponents.
      var score = -d + (o.health < 50 ? 25 : 0) + (o === this.target ? 18 : 0);
      if (score > bestScore) { bestScore = score; best = o; }
    }

    if (best) {
      if (this.target !== best) {
        this.reaction = U.lerp(CFG.bot.reactionMax, CFG.bot.reactionMin, this.skill);
        this.aimPoint.set(best.pos.x, best.pos.y + 1.15, best.pos.z);
      }
      this.target = best;
      this.lastSeenPos.copy(best.pos);
      this.targetVisible = true;
    } else {
      this.targetVisible = false;
      if (this.target && !this.target.alive) this.target = null;
    }
  };

  Bot.prototype.hearNoise = function (pos, loudness) {
    var d = U.dist2D(this.a.pos.x, this.a.pos.z, pos.x, pos.z);
    if (d > loudness) return;
    this.alertTimer = Math.max(this.alertTimer, 3);
    if (!this.target) {
      this.lastSeenPos.copy(pos);
      if (!this.dest) this.dest = { x: pos.x, z: pos.z };
    }
  };

  /* -------------------------------------------------------------- decisions */

  Bot.prototype._decide = function () {
    var a = this.a, zone = this.game.zone;
    var outside = !zone.contains(a.pos.x, a.pos.z);
    var edgeDist = zone.radius - U.dist2D(a.pos.x, a.pos.z, zone.cx, zone.cz);

    if (a.health < CFG.bot.healBelow && a.items.medkit > 0 &&
        (!this.targetVisible || !this.target) && !a.channel) {
      this.state = 'heal';
      a.channel = { kind: 'medkit', time: CFG.items.medkit.time, total: CFG.items.medkit.time };
      return;
    }
    if (a.channel) { this.state = 'heal'; return; }

    if (outside || (zone.shrinking && edgeDist < 25)) { this.state = 'rotate'; this.dest = null; return; }
    if (this.target && this.targetVisible) { this.state = 'engage'; return; }
    if (this.target && this.alertTimer > 0) { this.state = 'push'; return; }

    var loot = this._findLoot();
    if (loot) { this.state = 'loot'; this.lootTarget = loot; return; }

    this.state = 'roam';
  };

  Bot.prototype._findLoot = function () {
    var a = this.a, best = null, bestD = CFG.bot.lootRadius;
    var list = this.game.loot;
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      if (l.taken) continue;
      if (!this._wants(l)) continue;
      var d = U.dist2D(a.pos.x, a.pos.z, l.pos.x, l.pos.z);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  };

  Bot.prototype._wants = function (loot) {
    var a = this.a;
    if (loot.kind === 'weapon') {
      var w = CFG.weapons[loot.weaponId];
      var cur = a.slots[w.slot] ? CFG.weapons[a.slots[w.slot]].tier : -1;
      return w.tier > cur;
    }
    if (loot.kind === 'medkit') return a.items.medkit < CFG.items.medkit.max;
    if (loot.kind === 'armor') return a.armor < 60;
    if (loot.kind === 'gloo') return a.items.gloo < CFG.items.gloo.max;
    return true; // ammo
  };

  /* ------------------------------------------------------------------ act */

  Bot.prototype._act = function (dt) {
    var a = this.a;
    var wish = { x: 0, z: 0 };
    a.sprinting = false;
    a.crouching = false;
    a.ads = false;

    switch (this.state) {
      case 'heal':
        break;

      case 'rotate': {
        var z = this.game.zone;
        var tx = U.lerp(z.cx, z.toX, 0.5), tz = U.lerp(z.cz, z.toZ, 0.5);
        this._seek(tx, tz, wish);
        a.sprinting = true;
        a.yaw = Math.atan2(wish.x, wish.z);
        break;
      }

      case 'loot': {
        var l = this.lootTarget;
        if (!l || l.taken) { this.state = 'roam'; break; }
        this._seek(l.pos.x, l.pos.z, wish);
        a.sprinting = true;
        a.yaw = Math.atan2(wish.x, wish.z);
        if (U.dist2D(a.pos.x, a.pos.z, l.pos.x, l.pos.z) < 1.7) {
          this.game.tryPickup(a, l, true);
          this.lootTarget = null;
        }
        break;
      }

      case 'push': {
        this._seek(this.lastSeenPos.x, this.lastSeenPos.z, wish);
        a.sprinting = true;
        a.yaw = Math.atan2(wish.x, wish.z);
        if (U.dist2D(a.pos.x, a.pos.z, this.lastSeenPos.x, this.lastSeenPos.z) < 4) {
          this.alertTimer = 0;
          this.target = null;
        }
        break;
      }

      case 'engage':
        this._engage(dt, wish);
        break;

      default: { // roam
        if (!this.dest || this.destTimer <= 0 ||
            U.dist2D(a.pos.x, a.pos.z, this.dest.x, this.dest.z) < 3) {
          var zone = this.game.zone;
          var ang = Math.random() * Math.PI * 2;
          var r = Math.sqrt(Math.random()) * zone.radius * 0.85;
          this.dest = { x: zone.cx + Math.cos(ang) * r, z: zone.cz + Math.sin(ang) * r };
          this.destTimer = 12;
        }
        this.destTimer -= dt;
        this._seek(this.dest.x, this.dest.z, wish);
        a.sprinting = true;
        a.yaw = Math.atan2(wish.x, wish.z);
      }
    }

    a.move(wish.x, wish.z, dt);

    // Reload during downtime rather than mid-fight.
    var w = a.weapon();
    if (w.ammo && a.magOf(w.id) === 0 && a.reloading <= 0) a.startReload();
    else if (this.state !== 'engage' && w.ammo && a.magOf(w.id) < w.mag * 0.4) a.startReload();

    // Keep the best gun out.
    var best = a.bestSlot();
    if (best !== a.current && a.reloading <= 0) a.switchTo(best);
  };

  Bot.prototype._engage = function (dt, wish) {
    var a = this.a, t = this.target;
    if (!t || !t.alive) { this.state = 'roam'; return; }

    var dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z;
    var dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    a.yaw = Math.atan2(dx, dz);

    var w = a.weapon();
    var ideal = U.clamp(w.range * 0.45, 6, 45);

    // Close the gap, back off if too close for the weapon, and strafe meanwhile.
    var forward = 0;
    if (dist > ideal * 1.25) forward = 1;
    else if (dist < ideal * 0.5) forward = -0.7;

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafe = -this.strafe;
      this.strafeTimer = U.rand(CFG.bot.strafeSwap[0], CFG.bot.strafeSwap[1]);
    }
    var sx = Math.cos(a.yaw) * this.strafe, sz = -Math.sin(a.yaw) * this.strafe;
    var fx = Math.sin(a.yaw) * forward, fz = Math.cos(a.yaw) * forward;
    var mx = fx + sx * 0.85, mz = fz + sz * 0.85;
    var ml = Math.sqrt(mx * mx + mz * mz) || 1;
    wish.x = mx / ml; wish.z = mz / ml;
    this._avoid(wish);

    a.ads = w.zoom > 1.5 && dist > 25;
    a.crouching = this.skill > 0.55 && dist > 30 && Math.random() < 0.02;

    // Deploy a gloo wall when hurt and caught in the open.
    if (a.items.gloo > 0 && a.health < 55 && a.glooCooldown <= 0 && Math.random() < 0.03) {
      this.game.deployGloo(a);
    }

    // Drop a medkit mid-fight only when badly hurt and at range.
    if (a.health < 30 && a.items.medkit > 0 && dist > 35 && !a.channel && Math.random() < 0.02) {
      a.channel = { kind: 'medkit', time: CFG.items.medkit.time, total: CFG.items.medkit.time };
      return;
    }

    if (this.reaction > 0) { this.reaction -= dt; return; }
    if (dist > w.range * 1.35) return;

    if (this.burstPause > 0) { this.burstPause -= dt; return; }
    if (this.burst <= 0) this.burst = U.randInt(CFG.bot.burstMin, CFG.bot.burstMax);

    // Aim lags behind a moving target and wanders, so strafing actually works.
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = U.rand(0.35, 0.9);
      var err = U.lerp(CFG.bot.aimErrorMin, CFG.bot.aimErrorMax, this.skill);
      this.aimWander.set(U.rand(-err, err), U.rand(-err * 0.6, err * 0.6), U.rand(-err, err));
    }
    var aimY = t.pos.y + 1.15 + (Math.random() < this.skill * 0.3 ? 0.42 : 0); // occasional headshot try
    var track = U.lerp(CFG.bot.aimTrackMin, CFG.bot.aimTrackMax, this.skill);
    this.aimPoint.x = U.damp(this.aimPoint.x, t.pos.x + this.aimWander.x, track, dt);
    this.aimPoint.y = U.damp(this.aimPoint.y, aimY + this.aimWander.y, track, dt);
    this.aimPoint.z = U.damp(this.aimPoint.z, t.pos.z + this.aimWander.z, track, dt);

    var eye = a.eyePos(this._eye);
    var d = this._dir.set(this.aimPoint.x - eye.x, this.aimPoint.y - eye.y,
                          this.aimPoint.z - eye.z).normalize();

    if (this.game.combat.fire(a, d, this.skill)) {
      a.pitch = Math.asin(U.clamp(d.y, -1, 1));
      this.burst--;
      if (this.burst <= 0) this.burstPause = U.lerp(0.9, 0.28, this.skill) * U.rand(0.8, 1.3);
    }
  };

  /* Head toward (x,z), sliding around whatever wall is in the way. */
  Bot.prototype._seek = function (x, z, wish) {
    var a = this.a;
    var dx = x - a.pos.x, dz = z - a.pos.z;
    var d = Math.sqrt(dx * dx + dz * dz) || 1;
    wish.x = dx / d; wish.z = dz / d;
    this._avoid(wish);
  };

  Bot.prototype._avoid = function (wish) {
    var a = this.a;
    var probe = 2.6;
    var hit = this.game.world.rayHit(a.pos.x, a.pos.y + 0.9, a.pos.z, wish.x, 0, wish.z, probe);
    if (hit < 0) return;
    // Rotate the wish direction sideways until it is clear (or give up and slide).
    for (var s = 0; s < 2; s++) {
      var ang = this.avoidSide * (s === 0 ? Math.PI / 3 : Math.PI / 1.6);
      var cx = Math.cos(ang), sn = Math.sin(ang);
      var nx = wish.x * cx - wish.z * sn;
      var nz = wish.x * sn + wish.z * cx;
      if (this.game.world.rayHit(a.pos.x, a.pos.y + 0.9, a.pos.z, nx, 0, nz, probe) < 0) {
        wish.x = nx; wish.z = nz;
        return;
      }
    }
    this.avoidSide = -this.avoidSide;
  };

  Bot.prototype._channel = function (dt) {
    var a = this.a;
    if (!a.channel) return;
    a.channel.time -= dt;
    if (a.channel.time <= 0) {
      if (a.channel.kind === 'medkit' && a.items.medkit > 0) {
        a.items.medkit--;
        a.heal(CFG.items.medkit.heal);
      } else if (a.channel.kind === 'armor' && a.items.armor > 0) {
        a.items.armor--;
        a.addArmor(CFG.items.armor.value);
      }
      a.channel = null;
      this.state = 'roam';
    }
  };

  FF.Bot = Bot;
})(window);
