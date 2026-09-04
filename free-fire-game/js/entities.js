/* Actors (the player and every bot share this body), ground loot and gloo walls. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  var SKINS = [
    { shirt: 0x2e6fb7, pants: 0x2c3038, skin: 0xd9a066 },
    { shirt: 0xb03a2e, pants: 0x373b42, skin: 0xa9714b },
    { shirt: 0x1e8449, pants: 0x2a2d33, skin: 0xf0c39b },
    { shirt: 0xd4ac0d, pants: 0x35383f, skin: 0x8d5524 },
    { shirt: 0x7d3c98, pants: 0x2b2e34, skin: 0xc68642 },
    { shirt: 0xe67e22, pants: 0x31343a, skin: 0xffdbac }
  ];

  /* ------------------------------------------------------------------ Actor */

  function Actor(game, opts) {
    opts = opts || {};
    var P = CFG.player;

    this.game = game;
    this.world = game.world;
    this.isBot = !!opts.isBot;
    this.name = opts.name || 'Player';
    this.id = opts.id || 0;

    this.pos = new THREE.Vector3(opts.x || 0, opts.y || 0, opts.z || 0);
    this.vel = new THREE.Vector3();
    this.yaw = opts.yaw || 0;
    this.pitch = 0;

    this.height = P.height;
    this.radius = P.radius;
    this.eyeHeight = P.eye;

    this.health = P.maxHealth;
    this.armor = 0;
    this.alive = true;
    this.grounded = false;
    this.crouching = false;
    this.sprinting = false;
    this.state = 'ground';       // 'freefall' | 'chute' | 'ground'

    this.kills = 0;
    this.damageDealt = 0;
    this.placement = 0;

    /* Inventory */
    this.slots = { primary: null, sidearm: null };
    this.current = 'melee';
    this.ammo = { light: 0, heavy: 0, shell: 0, sniper: 0 };
    this.items = { medkit: 0, armor: 0, gloo: 0 };
    this.mags = {};              // weaponId -> rounds in magazine

    /* Weapon runtime */
    this.fireCooldown = 0;
    this.reloading = 0;
    this.reloadTarget = null;
    this.ads = false;
    this.recoil = 0;
    this.channel = null;         // { kind, time, total }
    this.glooCooldown = 0;

    this.lastAttacker = null;
    this.stepPhase = 0;

    this.skin = SKINS[(opts.id || 0) % SKINS.length];
    this._build();
  }

  Actor.prototype._build = function () {
    var s = this.skin;
    var g = new THREE.Group();

    function box(w, h, d, color, y, x, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: color }));
      m.position.set(x || 0, y, z || 0);
      return m;
    }

    this.legL = box(0.22, 0.85, 0.26, s.pants, 0.42, -0.13);
    this.legR = box(0.22, 0.85, 0.26, s.pants, 0.42, 0.13);
    this.torso = box(0.52, 0.62, 0.30, s.shirt, 1.16);
    this.armL = box(0.16, 0.58, 0.18, s.shirt, 1.16, -0.34);
    this.armR = box(0.16, 0.58, 0.18, s.shirt, 1.16, 0.34);
    this.head = box(0.28, 0.28, 0.28, s.skin, 1.62);
    this.pack = box(0.34, 0.40, 0.16, 0x4b3f30, 1.18, 0, -0.22);
    this.gun = box(0.10, 0.12, 0.72, 0x6f7a86, 1.20, 0.30, 0.34);

    g.add(this.legL, this.legR, this.torso, this.armL, this.armR,
          this.head, this.pack, this.gun);
    this.chute = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xf05a28, side: THREE.DoubleSide })
    );
    this.chute.position.y = 2.9;
    this.chute.visible = false;
    g.add(this.chute);

    this.mesh = g;
    this.mesh.position.copy(this.pos);
    this.game.scene.add(g);

    if (this.isBot) this._buildNameplate();
  };

  Actor.prototype._buildNameplate = function () {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    this._plate = c;
    this._plateCtx = c.getContext('2d');
    var tex = new THREE.CanvasTexture(c);
    this._plateTex = tex;
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, depthTest: false, transparent: true
    }));
    spr.scale.set(2.6, 0.65, 1);
    spr.position.y = 2.25;
    spr.visible = false;
    this.mesh.add(spr);
    this.plate = spr;
    this._drawPlate();
  };

  Actor.prototype._drawPlate = function () {
    var ctx = this._plateCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 26px Rajdhani, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a4a';
    ctx.fillText(this.name, 128, 26);
    // health bar
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(48, 36, 160, 12);
    var frac = U.clamp(this.health / CFG.player.maxHealth, 0, 1);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(50, 38, 156 * frac, 8);
    if (this.armor > 0) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(50, 38, 156 * U.clamp(this.armor / CFG.player.maxArmor, 0, 1), 3);
    }
    this._plateTex.needsUpdate = true;
  };

  /* --------------------------------------------------------------- movement */

  Actor.prototype.eyePos = function (out) {
    out = out || new THREE.Vector3();
    return out.set(this.pos.x, this.pos.y + (this.crouching ? this.eyeHeight - 0.45 : this.eyeHeight), this.pos.z);
  };

  Actor.prototype.speed = function () {
    var P = CFG.player;
    var s = this.crouching ? P.crouch : (this.sprinting ? P.sprint : P.walk);
    if (this.ads) s *= P.adsMul;
    if (this.channel) s *= 0.45;
    return s;
  };

  /* wishX/wishZ are a world-space unit-ish direction; dt in seconds. */
  Actor.prototype.move = function (wishX, wishZ, dt) {
    var P = CFG.player;
    var world = this.world;

    if (this.state !== 'ground') { this._air(wishX, wishZ, dt); return; }

    var want = this.speed();
    var accel = this.grounded ? P.accel : P.airAccel;
    var tx = wishX * want, tz = wishZ * want;
    this.vel.x = U.damp(this.vel.x, tx, accel / Math.max(1, want) * 4, dt);
    this.vel.z = U.damp(this.vel.z, tz, accel / Math.max(1, want) * 4, dt);

    this.vel.y -= P.gravity * dt;

    var nx = this.pos.x + this.vel.x * dt;
    var nz = this.pos.z + this.vel.z * dt;
    var ny = this.pos.y + this.vel.y * dt;

    var resolved = this._resolveXZ(nx, nz, this.pos.y);
    this.pos.x = resolved.x;
    this.pos.z = resolved.z;

    var support = world.groundAt(this.pos.x, this.pos.z, this.pos.y + P.stepHeight, this.radius);
    if (ny <= support + 0.001) {
      if (!this.grounded && this.vel.y < -12) this.game.audio.step();
      this.pos.y = support;
      this.vel.y = 0;
      this.grounded = true;
    } else {
      // Block upward motion into a ceiling.
      var headY = ny + this.height;
      var list = world.near(this.pos.x, this.pos.z, this.radius + 0.3, this._near || (this._near = []));
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!U.circleBoxOverlap(this.pos.x, this.pos.z, this.radius, b)) continue;
        if (b.minY < headY && b.minY > this.pos.y + this.height * 0.5 && this.vel.y > 0) {
          ny = b.minY - this.height - 0.01;
          this.vel.y = 0;
        }
      }
      this.pos.y = ny;
      this.grounded = false;
    }

    // Footstep audio cadence.
    var planar = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    if (this.grounded && planar > 1.2) {
      this.stepPhase += planar * dt;
      if (this.stepPhase > 2.2) {
        this.stepPhase = 0;
        if (!this.isBot) this.game.audio.step();
      }
    }
  };

  Actor.prototype._air = function (wishX, wishZ, dt) {
    var M = CFG.match;
    var chute = this.state === 'chute';
    var steer = chute ? M.steerChute : M.steerFree;
    var fall = chute ? M.chuteSpeed : M.freefallSpeed;

    this.vel.x = U.damp(this.vel.x, wishX * steer, 3, dt);
    this.vel.z = U.damp(this.vel.z, wishZ * steer, 3, dt);
    this.vel.y = U.damp(this.vel.y, -fall, 3, dt);

    this.pos.x = U.clamp(this.pos.x + this.vel.x * dt, -this.world.half + 6, this.world.half - 6);
    this.pos.z = U.clamp(this.pos.z + this.vel.z * dt, -this.world.half + 6, this.world.half - 6);
    this.pos.y += this.vel.y * dt;

    if (!chute && this.pos.y <= CFG.match.chuteHeight) {
      this.state = 'chute';
      this.chute.visible = true;
    }
    var ground = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 2, this.radius);
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vel.set(0, 0, 0);
      this.state = 'ground';
      this.grounded = true;
      this.chute.visible = false;
      if (!this.isBot) this.game.onPlayerLanded();
    }
  };

  /* Push the capsule out of any wall it overlaps, cheapest axis first. */
  Actor.prototype._resolveXZ = function (x, z, feetY) {
    var world = this.world, r = this.radius;
    var stepTop = feetY + CFG.player.stepHeight;
    var headY = feetY + this.height;
    var list = world.near(x, z, r + 1.0, this._near || (this._near = []));

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (b.maxY <= stepTop) continue;      // low enough to step onto
        if (b.minY >= headY) continue;        // overhead
        if (!U.circleBoxOverlap(x, z, r, b)) continue;

        var cx = U.clamp(x, b.minX, b.maxX);
        var cz = U.clamp(z, b.minZ, b.maxZ);
        var dx = x - cx, dz = z - cz;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.0001) {
          var push = r - d;
          x += (dx / d) * push;
          z += (dz / d) * push;
        } else {
          // Centre is inside the box: eject along the shallowest face.
          var toL = Math.abs(x - b.minX), toR = Math.abs(b.maxX - x);
          var toB = Math.abs(z - b.minZ), toF = Math.abs(b.maxZ - z);
          var m = Math.min(toL, toR, toB, toF);
          if (m === toL) x = b.minX - r;
          else if (m === toR) x = b.maxX + r;
          else if (m === toB) z = b.minZ - r;
          else z = b.maxZ + r;
        }
      }
    }
    var lim = world.half - 5;
    return { x: U.clamp(x, -lim, lim), z: U.clamp(z, -lim, lim) };
  };

  Actor.prototype.jump = function () {
    if (this.state !== 'ground' || !this.grounded || this.crouching) return;
    this.vel.y = CFG.player.jump;
    this.grounded = false;
  };

  /* ------------------------------------------------------------- inventory */

  Actor.prototype.weapon = function () {
    if (this.current === 'melee') return CFG.weapons.fist;
    var id = this.slots[this.current];
    return id ? CFG.weapons[id] : CFG.weapons.fist;
  };

  Actor.prototype.magOf = function (weaponId) {
    if (this.mags[weaponId] === undefined) this.mags[weaponId] = 0;
    return this.mags[weaponId];
  };

  Actor.prototype.giveWeapon = function (id, slotHint) {
    var w = CFG.weapons[id];
    if (!w) return null;
    var slot = slotHint || w.slot;
    var dropped = this.slots[slot];
    this.slots[slot] = id;
    if (this.mags[id] === undefined) {
      this.mags[id] = Math.min(w.mag, this.ammo[w.ammo] || w.mag);
    }
    // Only swap to the new gun if it replaces what was already in hand,
    // so grabbing a pistol never disarms you mid-fight.
    if (this.current === 'melee' || this.current === slot) {
      this.current = slot;
      this.reloading = 0;
      this.reloadTarget = null;
    }
    return dropped;
  };

  Actor.prototype.giveAmmo = function (type, amount) {
    var cap = CFG.ammoCaps[type] || 999;
    var before = this.ammo[type];
    this.ammo[type] = Math.min(cap, this.ammo[type] + amount);
    return this.ammo[type] - before;
  };

  Actor.prototype.switchTo = function (slot) {
    if (slot !== 'melee' && !this.slots[slot]) return false;
    if (this.current === slot) return false;
    this.current = slot;
    this.reloading = 0;
    this.reloadTarget = null;
    this.fireCooldown = Math.max(this.fireCooldown, 0.28);
    return true;
  };

  Actor.prototype.bestSlot = function () {
    var p = this.slots.primary ? CFG.weapons[this.slots.primary].tier : -1;
    var s = this.slots.sidearm ? CFG.weapons[this.slots.sidearm].tier : -1;
    if (p < 0 && s < 0) return 'melee';
    return p >= s ? 'primary' : 'sidearm';
  };

  Actor.prototype.startReload = function () {
    var w = this.weapon();
    if (!w.ammo || this.reloading > 0) return false;
    if (this.magOf(w.id) >= w.mag) return false;
    if ((this.ammo[w.ammo] || 0) <= 0) return false;
    this.reloading = w.reload;
    this.reloadTarget = w.id;
    if (!this.isBot) this.game.audio.reload();
    return true;
  };

  Actor.prototype._finishReload = function () {
    var id = this.reloadTarget;
    this.reloading = 0;
    this.reloadTarget = null;
    if (!id) return;
    var w = CFG.weapons[id];
    var need = w.mag - this.magOf(id);
    var have = this.ammo[w.ammo] || 0;
    var take = Math.min(need, have);
    this.mags[id] += take;
    this.ammo[w.ammo] -= take;
  };

  /* --------------------------------------------------------------- damage */

  Actor.prototype.applyDamage = function (amount, attacker, part) {
    if (!this.alive) return 0;
    var absorbed = 0;
    if (this.armor > 0) {
      absorbed = Math.min(this.armor, amount * CFG.player.armorAbsorb);
      this.armor -= absorbed;
    }
    var net = amount - absorbed;
    this.health -= net;
    this.lastAttacker = attacker || null;
    if (this._plate) this._drawPlate();
    if (this.health <= 0) {
      this.health = 0;
      this.game.killActor(this, attacker, part);
    }
    return amount;
  };

  Actor.prototype.heal = function (amount) {
    this.health = Math.min(CFG.player.maxHealth, this.health + amount);
    if (this._plate) this._drawPlate();
  };

  Actor.prototype.addArmor = function (amount) {
    this.armor = Math.min(CFG.player.maxArmor, this.armor + amount);
    if (this._plate) this._drawPlate();
  };

  /* Three spheres approximate the body for bullet tests: head, chest, legs. */
  Actor.prototype.hitSpheres = function () {
    var crouch = this.crouching ? 0.42 : 0;
    var y = this.pos.y;
    return [
      { y: y + 1.62 - crouch, r: 0.23, part: 'head', mul: 'head' },
      { y: y + 1.15 - crouch * 0.6, r: 0.36, part: 'body', mul: 'body' },
      { y: y + 0.55 - crouch * 0.3, r: 0.32, part: 'legs', mul: 'limb' }
    ];
  };

  Actor.prototype.updateVisual = function (dt, camera) {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;

    var planar = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    this._walkPhase = (this._walkPhase || 0) + planar * dt * 2.4;
    var swing = this.grounded ? Math.sin(this._walkPhase) * Math.min(0.7, planar * 0.11) : 0.2;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.6;

    var crouch = this.crouching ? 0.72 : 1;
    this.mesh.scale.y = U.damp(this.mesh.scale.y, crouch, 14, dt);

    // Point the held gun where the actor is aiming.
    this.armR.rotation.x = -this.pitch * 0.8;
    this.gun.rotation.x = -this.pitch;
    this.gun.visible = this.current !== 'melee';
    if (this.gun.visible) {
      var w = this.weapon();
      this.gun.material.color.setHex(w.color);
      this.gun.scale.set(1, 1, U.clamp(w.range / 90, 0.6, 1.5));
    }

    if (this.plate && camera) {
      var d = this.pos.distanceTo(camera.position);
      var vis = this.alive && d < 70 &&
        this.world.losClear(camera.position.x, camera.position.y, camera.position.z,
                            this.pos.x, this.pos.y + 1.6, this.pos.z);
      this.plate.visible = vis;
      if (vis) this._drawPlate();
    }
  };

  Actor.prototype.dispose = function () {
    this.game.scene.remove(this.mesh);
  };

  /* ------------------------------------------------------------------ Loot */

  var LOOT_COLOR = {
    weapon: 0xf0a30a, ammo: 0xbfc7d0, medkit: 0xe74c3c,
    armor: 0x4fc3f7, gloo: 0x8bd4c9
  };

  function Loot(game, x, z, kind, weaponId, y) {
    this.game = game;
    this.kind = kind;                 // weapon | ammo | medkit | armor | gloo
    this.weaponId = weaponId || null;
    this.taken = false;

    var ground = y !== undefined ? y : U.terrainHeight(x, z);
    this.pos = new THREE.Vector3(x, ground + 0.45, z);

    var geo = kind === 'weapon'
      ? new THREE.BoxGeometry(0.9, 0.18, 0.22)
      : new THREE.BoxGeometry(0.42, 0.42, 0.42);
    var color = kind === 'weapon' ? CFG.weapons[weaponId].color : LOOT_COLOR[kind];
    this.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: color }));
    this.mesh.position.copy(this.pos);

    var halo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.05, 12),
      new THREE.MeshBasicMaterial({
        color: kind === 'weapon' && CFG.weapons[weaponId].tier >= 4 ? 0xffd54f : LOOT_COLOR[kind],
        transparent: true, opacity: 0.35
      })
    );
    halo.position.y = -0.42;
    this.mesh.add(halo);
    game.scene.add(this.mesh);
  }

  Loot.prototype.label = function () {
    if (this.kind === 'weapon') return CFG.weapons[this.weaponId].name;
    if (this.kind === 'ammo') return 'Ammo';
    if (this.kind === 'medkit') return 'Med Kit';
    if (this.kind === 'armor') return 'Armor Plate';
    return 'Gloo Wall';
  };

  Loot.prototype.update = function (dt, t) {
    this.mesh.rotation.y += dt * 1.6;
    this.mesh.position.y = this.pos.y + Math.sin(t * 2 + this.pos.x) * 0.08;
  };

  Loot.prototype.dispose = function () {
    this.game.scene.remove(this.mesh);
  };

  /* -------------------------------------------------------------- GlooWall */

  function GlooWall(game, x, y, z, yaw, owner) {
    var G = CFG.items.gloo;
    this.game = game;
    this.owner = owner;
    this.hp = G.hp;
    this.life = G.life;

    // Snap to the nearer axis so the collider box stays axis-aligned.
    var alongX = Math.abs(Math.cos(yaw)) < Math.abs(Math.sin(yaw));
    var sx = alongX ? G.width : G.depth;
    var sz = alongX ? G.depth : G.width;

    this.box = U.makeBox(x, y, z, sx, G.height, sz);
    this.box._gloo = this;                 // lets bullets damage the wall they hit
    game.world.addCollider(this.box);

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, G.height, sz),
      new THREE.MeshLambertMaterial({ color: 0x9fe0d4, transparent: true, opacity: 0.95 })
    );
    this.mesh.position.set(x, y + G.height / 2, z);
    this.mesh.scale.y = 0.05;
    game.scene.add(this.mesh);
  }

  GlooWall.prototype.update = function (dt) {
    this.life -= dt;
    this.mesh.scale.y = U.damp(this.mesh.scale.y, 1, 9, dt);
    var frac = U.clamp(this.hp / CFG.items.gloo.hp, 0, 1);
    this.mesh.material.opacity = 0.35 + frac * 0.6;
    return this.life > 0 && this.hp > 0;
  };

  GlooWall.prototype.dispose = function () {
    this.game.world.removeCollider(this.box);
    this.game.scene.remove(this.mesh);
  };

  FF.Actor = Actor;
  FF.Loot = Loot;
  FF.GlooWall = GlooWall;
})(window);
