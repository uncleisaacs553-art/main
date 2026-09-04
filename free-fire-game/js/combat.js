/* Hitscan gunplay: spread, recoil, damage falloff, hit resolution and VFX. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function Combat(game) {
    this.game = game;
    this.tracers = [];
    this.impacts = [];
    this._tmpDir = new THREE.Vector3();
    this._eye = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._worldUp = new THREE.Vector3(0, 1, 0);
    this._altUp = new THREE.Vector3(1, 0, 0);
    this._buildPools();
  }

  Combat.prototype._buildPools = function () {
    var i, scene = this.game.scene;

    for (i = 0; i < 48; i++) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffe066, transparent: true, opacity: 0.9
      }));
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      this.tracers.push({ mesh: line, life: 0 });
    }

    var impactGeo = new THREE.SphereGeometry(0.12, 5, 4);
    for (i = 0; i < 32; i++) {
      var m = new THREE.Mesh(impactGeo, new THREE.MeshBasicMaterial({
        color: 0xcccccc, transparent: true, opacity: 0.9
      }));
      m.visible = false;
      scene.add(m);
      this.impacts.push({ mesh: m, life: 0 });
    }

    this.flash = new THREE.PointLight(0xffcc66, 0, 12);
    scene.add(this.flash);
  };

  Combat.prototype._tracer = function (ax, ay, az, bx, by, bz) {
    for (var i = 0; i < this.tracers.length; i++) {
      var t = this.tracers[i];
      if (t.life > 0) continue;
      var p = t.mesh.geometry.attributes.position;
      p.array[0] = ax; p.array[1] = ay; p.array[2] = az;
      p.array[3] = bx; p.array[4] = by; p.array[5] = bz;
      p.needsUpdate = true;
      t.mesh.visible = true;
      t.life = 0.06;
      return;
    }
  };

  Combat.prototype._impact = function (x, y, z, color) {
    for (var i = 0; i < this.impacts.length; i++) {
      var m = this.impacts[i];
      if (m.life > 0) continue;
      m.mesh.position.set(x, y, z);
      m.mesh.material.color.setHex(color);
      m.mesh.scale.setScalar(1);
      m.mesh.visible = true;
      m.life = 0.28;
      return;
    }
  };

  Combat.prototype.update = function (dt) {
    var i, t;
    for (i = 0; i < this.tracers.length; i++) {
      t = this.tracers[i];
      if (t.life <= 0) continue;
      t.life -= dt;
      t.mesh.material.opacity = U.clamp(t.life / 0.06, 0, 1) * 0.9;
      if (t.life <= 0) t.mesh.visible = false;
    }
    for (i = 0; i < this.impacts.length; i++) {
      t = this.impacts[i];
      if (t.life <= 0) continue;
      t.life -= dt;
      t.mesh.scale.setScalar(1 + (0.28 - t.life) * 4);
      t.mesh.material.opacity = U.clamp(t.life / 0.28, 0, 1) * 0.9;
      if (t.life <= 0) t.mesh.visible = false;
    }
    if (this.flash.intensity > 0) {
      this.flash.intensity = Math.max(0, this.flash.intensity - dt * 40);
    }
  };

  /* Effective cone half-angle for this actor's current stance. */
  Combat.prototype.spreadFor = function (actor, weapon) {
    var C = CFG.combat;
    var s = weapon.spread;
    var planar = Math.sqrt(actor.vel.x * actor.vel.x + actor.vel.z * actor.vel.z);
    if (!actor.grounded) s *= C.airSpreadMul;
    else if (planar > 1.5) s *= 1 + (C.moveSpreadMul - 1) * U.clamp(planar / CFG.player.sprint, 0, 1);
    if (actor.crouching) s *= C.crouchSpreadMul;
    if (actor.ads) s *= C.adsSpreadMul;
    s *= 1 + actor.recoil * 0.10;
    return s;
  };

  Combat.prototype.damageAt = function (weapon, dist, part) {
    var C = CFG.combat;
    var d = weapon.damage;
    var falloff = 1;
    if (dist > weapon.range * C.falloffStart) {
      var t = U.clamp((dist - weapon.range * C.falloffStart) /
                      (weapon.range * (C.falloffEnd - C.falloffStart)), 0, 1);
      falloff = U.lerp(1, C.falloffMin, t);
    }
    var mul = part === 'head' ? weapon.headMul : (part === 'legs' ? C.limbMul : 1);
    return d * falloff * mul;
  };

  /* Can this actor pull the trigger right now? */
  Combat.prototype.canFire = function (actor) {
    if (!actor.alive || actor.state !== 'ground') return false;
    if (actor.fireCooldown > 0 || actor.reloading > 0 || actor.channel) return false;
    var w = actor.weapon();
    if (!w.ammo) return true;
    return actor.magOf(w.id) > 0;
  };

  /* Fire one shot. `dir` is a normalised THREE.Vector3 aim direction.
     `accuracy` (0..1, bots only) widens the cone for weaker opponents. */
  Combat.prototype.fire = function (actor, dir, accuracy) {
    if (!this.canFire(actor)) {
      if (actor.weapon().ammo && actor.magOf(actor.weapon().id) <= 0) actor.startReload();
      return false;
    }
    var w = actor.weapon();
    actor.fireCooldown = 60 / w.rpm;
    if (w.ammo) actor.mags[w.id]--;

    var origin = actor.eyePos(this._eye);
    if (actor === this.game.player) {
      origin.copy(this.game.camera.position);
    }

    var spread = this.spreadFor(actor, w);
    if (accuracy !== undefined) spread *= U.lerp(5.0, 1.15, U.clamp(accuracy, 0, 1));

    var muzzle = {
      x: actor.pos.x + Math.sin(actor.yaw) * 0.5,
      y: actor.pos.y + (actor.crouching ? 1.05 : 1.35),
      z: actor.pos.z + Math.cos(actor.yaw) * 0.5
    };

    for (var p = 0; p < w.pellets; p++) {
      this._shootRay(actor, w, origin, dir, spread, muzzle);
    }

    actor.recoil = Math.min(12, actor.recoil + w.recoil);
    if (!actor.isBot) {
      actor.pendingKick = (actor.pendingKick || 0) + w.recoil * 0.0028;
      this.flash.position.set(muzzle.x, muzzle.y, muzzle.z);
      this.flash.intensity = 2.2;
    }
    var d = actor === this.game.player ? 0 : actor.pos.distanceTo(this.game.camera.position);
    this.game.audio.shot(w.id, d);
    this.game.noise(actor, 55);
    return true;
  };

  Combat.prototype._shootRay = function (actor, w, origin, dir, spread, muzzle) {
    var d = this._tmpDir.copy(dir);
    if (spread > 0) {
      // Sample uniformly inside a cone around the aim direction. (Perturbing
      // x/y/z independently would give a square pattern with fat corners.)
      var up = Math.abs(d.y) > 0.95 ? this._altUp : this._worldUp;
      this._right.crossVectors(d, up).normalize();
      this._up.crossVectors(this._right, d).normalize();
      var ang = Math.random() * Math.PI * 2;
      var rad = spread * Math.sqrt(Math.random());
      d.addScaledVector(this._right, Math.cos(ang) * rad)
       .addScaledVector(this._up, Math.sin(ang) * rad)
       .normalize();
    }

    var maxDist = w.range * 2.2;
    var world = this.game.world;
    var wallDist = world.rayHit(origin.x, origin.y, origin.z, d.x, d.y, d.z, maxDist);
    var wallBox = world.lastHitBox;
    var limit = wallDist < 0 ? maxDist : wallDist;

    var actors = this.game.actors;
    var bestT = Infinity, bestActor = null, bestPart = null;

    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      if (a === actor || !a.alive) continue;
      var dx = a.pos.x - origin.x, dz = a.pos.z - origin.z;
      if (dx * dx + dz * dz > maxDist * maxDist) continue;

      var spheres = a.hitSpheres();
      for (var s = 0; s < spheres.length; s++) {
        var sp = spheres[s];
        var t = U.raySphere(origin.x, origin.y, origin.z, d.x, d.y, d.z,
                            a.pos.x, sp.y, a.pos.z, sp.r);
        if (t >= 0 && t < bestT && t <= limit) {
          bestT = t; bestActor = a; bestPart = sp.part;
        }
      }
    }

    if (bestActor) {
      var dmg = this.damageAt(w, bestT, bestPart);
      bestActor.applyDamage(dmg, actor, bestPart);
      actor.damageDealt += dmg;
      this._tracer(muzzle.x, muzzle.y, muzzle.z,
                   origin.x + d.x * bestT, origin.y + d.y * bestT, origin.z + d.z * bestT);
      this._impact(origin.x + d.x * bestT, origin.y + d.y * bestT, origin.z + d.z * bestT, 0xd63031);
      if (actor === this.game.player) {
        this.game.hud.hitmarker(bestPart === 'head');
        this.game.hud.damageNumber(Math.round(dmg), bestPart === 'head');
        this.game.audio.hitmark(bestPart === 'head');
      }
      if (bestActor === this.game.player) {
        this.game.hud.damageFrom(actor.pos, this.game.player);
        this.game.audio.hurt();
      }
      return;
    }

    var endT = wallDist < 0 ? maxDist : wallDist;
    this._tracer(muzzle.x, muzzle.y, muzzle.z,
                 origin.x + d.x * endT, origin.y + d.y * endT, origin.z + d.z * endT);
    if (wallDist >= 0) {
      this._impact(origin.x + d.x * endT, origin.y + d.y * endT, origin.z + d.z * endT, 0xdddddd);
      if (wallBox && wallBox._gloo) {
        wallBox._gloo.hp -= w.damage;
      }
    }
  };

  FF.Combat = Combat;
})(window);
