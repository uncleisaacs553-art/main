/* Match orchestration: scene, spawning, loot, airdrops, deaths and results. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function Game() {
    this.running = false;
    this.paused = false;
    this.actors = [];
    this.bots = [];
    this.loot = [];
    this.gloos = [];
    this.gunfirePings = [];
    this.audio = FF.audio;
    this.time = 0;
    this.quality = CFG.quality.medium;
    this._clock = null;
    this._nearBuf = [];
  }

  /* ------------------------------------------------------------------ boot */

  Game.prototype.initRenderer = function () {
    var canvas = document.getElementById('view');
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: this.quality.pixelRatio > 1
    });
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, this.quality.pixelRatio));
    this.renderer.setSize(global.innerWidth, global.innerHeight);
    this.renderer.shadowMap.enabled = this.quality.shadows;

    this.camera = new THREE.PerspectiveCamera(72, global.innerWidth / global.innerHeight, 0.1, 800);

    var self = this;
    global.addEventListener('resize', function () {
      self.camera.aspect = global.innerWidth / global.innerHeight;
      self.camera.updateProjectionMatrix();
      self.renderer.setSize(global.innerWidth, global.innerHeight);
    });
  };

  Game.prototype._buildScene = function () {
    var W = CFG.world;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(W.skyBottom, W.fogNear, this.quality.drawDistance);

    // Gradient sky dome, painted into a canvas texture.
    var c = document.createElement('canvas');
    c.width = 8; c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#' + new THREE.Color(W.skyTop).getHexString());
    grad.addColorStop(1, '#' + new THREE.Color(W.skyBottom).getHexString());
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 128);
    var tex = new THREE.CanvasTexture(c);
    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(700, 16, 12),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);

    var hemi = new THREE.HemisphereLight(0xcfe6ff, 0x3d4a35, 0.85);
    this.scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff2d5, 0.85);
    sun.position.set(120, 200, 80);
    if (this.quality.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
      sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
      sun.shadow.camera.far = 420;
    }
    this.scene.add(sun);
  };

  /* ----------------------------------------------------------- match setup */

  Game.prototype.start = function (opts) {
    opts = opts || {};
    this.quality = CFG.quality[opts.quality || 'medium'] || CFG.quality.medium;
    this.botCount = opts.bots || CFG.match.bots;

    if (this.renderer) this.dispose();
    if (!this.renderer) this.initRenderer();
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, this.quality.pixelRatio));
    this.renderer.shadowMap.enabled = this.quality.shadows;

    this._buildScene();
    this.world = new FF.World(this.scene, this.quality);
    this.combat = new FF.Combat(this);
    this.zone = new FF.Zone(this);
    this.hud = new FF.HUD(this);

    this.actors = [];
    this.bots = [];
    this.loot = [];
    this.gloos = [];
    this.gunfirePings = [];
    this.time = 0;
    this.airdropDone = false;
    this.result = null;

    this._spawnLoot();
    this._spawnActors(opts.playerName || 'YOU');

    this.audio.init();
    this.audio.resume();
    this.audio.plane();

    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this.hud.announce('Drop in! Land near loot.');

    if (!this._loopBound) {
      this._loopBound = this._loop.bind(this);
      requestAnimationFrame(this._loopBound);
    }
  };

  Game.prototype._spawnLoot = function () {
    var spawns = U.shuffle(this.world.lootSpawns.slice());
    for (var i = 0; i < spawns.length; i++) {
      var s = spawns[i];
      var count = Math.random() < 0.35 ? 2 : 1;
      for (var n = 0; n < count; n++) {
        var id = U.weighted(CFG.lootTable);
        var x = s.x + U.rand(-1.4, 1.4), z = s.z + U.rand(-1.4, 1.4);
        this.spawnLoot(x, z, id);
      }
    }
  };

  Game.prototype.spawnLoot = function (x, z, id, y) {
    var kind = CFG.weapons[id] ? 'weapon' : id;
    var item = new FF.Loot(this, x, z, kind, CFG.weapons[id] ? id : null, y);
    this.loot.push(item);
    return item;
  };

  /* Everyone leaves the same plane, but each drop is aimed at its own landing
     zone so the lobby scatters across the island instead of one hot pile. */
  Game.prototype._spawnActors = function (playerName) {
    var half = this.world.half;
    var ang = Math.random() * Math.PI * 2;          // plane heading
    var dirX = Math.cos(ang), dirZ = Math.sin(ang);

    var total = this.botCount + 1;
    var targets = this._landingTargets(total);
    var order = U.shuffle(CFG.names.slice()).slice(0, this.botCount);

    for (var i = 0; i < total; i++) {
      var isPlayer = i === 0;
      var target = targets[i];

      // Spawn up-track from the landing spot so the glide in looks deliberate.
      var back = U.rand(45, 80);
      var x = U.clamp(target.x - dirX * back, -half + 15, half - 15);
      var z = U.clamp(target.z - dirZ * back, -half + 15, half - 15);

      var actor = new FF.Actor(this, {
        id: i,
        isBot: !isPlayer,
        name: isPlayer ? playerName : order[i - 1],
        x: x,
        y: CFG.match.skydiveHeight + U.rand(-6, 6),
        z: z,
        yaw: Math.atan2(target.x - x, target.z - z)
      });
      actor.state = 'freefall';
      actor.vel.y = -CFG.match.freefallSpeed * 0.4;
      actor.pitch = -0.55;              // look down at the island on the way in
      this.actors.push(actor);

      if (isPlayer) {
        this.player = actor;
        this.controller = new FF.PlayerController(this, actor);
        actor.giveAmmo('light', 30);
      } else {
        var skill = U.clamp(U.rand(0.3, 0.85) + (Math.random() < 0.15 ? 0.15 : 0), 0, 1);
        var bot = new FF.Bot(this, actor, skill);
        bot.equipStart();
        bot.landing = target;
        this.bots.push(bot);
      }
    }
  };

  /* Spread landing spots over the POIs first, then fill in open ground,
     keeping a minimum separation so nobody lands in someone's lap. */
  Game.prototype._landingTargets = function (count) {
    var half = this.world.half, out = [];
    var pois = U.shuffle(this.world.pois.slice());
    var poiDrops = Math.min(pois.length, Math.ceil(count * 0.45));

    for (var i = 0; i < poiDrops; i++) {
      out.push({ x: pois[i].x + U.rand(-22, 22), z: pois[i].z + U.rand(-22, 22) });
    }
    var guard = 0;
    while (out.length < count && guard++ < count * 60) {
      var p = {
        x: U.rand(-half + 30, half - 30),
        z: U.rand(-half + 30, half - 30)
      };
      var ok = true;
      for (var j = 0; j < out.length; j++) {
        if (U.dist2D(p.x, p.z, out[j].x, out[j].z) < 66) { ok = false; break; }
      }
      if (ok) out.push(p);
    }
    // If the island ran out of room, top up with looser spots.
    while (out.length < count) {
      out.push({ x: U.rand(-half + 30, half - 30), z: U.rand(-half + 30, half - 30) });
    }
    return U.shuffle(out);
  };

  /* ---------------------------------------------------------------- events */

  Game.prototype.onPlayerLanded = function () {
    this.hud.announce('Landed — find a weapon');
  };

  /* Gunfire is heard by nearby bots and pinged on the minimap. */
  Game.prototype.noise = function (actor, radius) {
    for (var i = 0; i < this.bots.length; i++) {
      if (this.bots[i].a === actor) continue;
      this.bots[i].hearNoise(actor.pos, radius);
    }
    if (actor !== this.player &&
        U.dist2D(actor.pos.x, actor.pos.z, this.player.pos.x, this.player.pos.z) < 110) {
      this.gunfirePings.push({ x: actor.pos.x, z: actor.pos.z, life: 3 });
      if (this.gunfirePings.length > 24) this.gunfirePings.shift();
    }
  };

  Game.prototype.aliveCount = function () {
    var n = 0;
    for (var i = 0; i < this.actors.length; i++) if (this.actors[i].alive) n++;
    return n;
  };

  Game.prototype.killActor = function (victim, attacker, part) {
    if (!victim.alive) return;
    victim.alive = false;
    victim.placement = this.aliveCount() + 1;

    var weaponName = attacker ? attacker.weapon().name : 'Safe Zone';
    this.hud.kill(attacker, victim, weaponName, part === 'head');

    if (attacker && attacker !== victim) {
      attacker.kills++;
      if (attacker === this.player) {
        this.audio.kill();
        this.hud.announce('Eliminated ' + victim.name + '!');
      }
    }

    this._dropInventory(victim);

    // Flatten the body, then clear it a few seconds later.
    victim.mesh.rotation.x = -Math.PI / 2;
    victim.mesh.position.y = this.world.groundAt(victim.pos.x, victim.pos.z) + 0.2;
    if (victim.plate) victim.plate.visible = false;
    var self = this;
    setTimeout(function () { victim.dispose(); }, 6000);

    if (victim === this.player) {
      this.finish(false, victim.placement);
    } else if (this.aliveCount() === 1 && this.player.alive) {
      this.player.placement = 1;
      this.finish(true, 1);
    }
  };

  Game.prototype._dropInventory = function (actor) {
    var x = actor.pos.x, z = actor.pos.z;
    var slots = ['primary', 'sidearm'];
    for (var i = 0; i < slots.length; i++) {
      var id = actor.slots[slots[i]];
      if (!id) continue;
      this.spawnLoot(x + U.rand(-1.2, 1.2), z + U.rand(-1.2, 1.2), id);
    }
    if (actor.items.medkit > 0) this.spawnLoot(x + U.rand(-1.5, 1.5), z + U.rand(-1.5, 1.5), 'medkit');
    if (actor.items.gloo > 0) this.spawnLoot(x + U.rand(-1.5, 1.5), z + U.rand(-1.5, 1.5), 'gloo');
    if (actor.armor > 25) this.spawnLoot(x + U.rand(-1.5, 1.5), z + U.rand(-1.5, 1.5), 'armor');
    this.spawnLoot(x + U.rand(-1.5, 1.5), z + U.rand(-1.5, 1.5), 'ammo');
  };

  /* ----------------------------------------------------------------- loot */

  Game.prototype.nearestLoot = function (actor, radius) {
    var best = null, bestD = radius;
    for (var i = 0; i < this.loot.length; i++) {
      var l = this.loot[i];
      if (l.taken) continue;
      var d = U.dist2D(actor.pos.x, actor.pos.z, l.pos.x, l.pos.z);
      if (d < bestD && Math.abs(l.pos.y - actor.pos.y) < 3) { bestD = d; best = l; }
    }
    return best;
  };

  Game.prototype.tryPickup = function (actor, loot, silent) {
    if (loot.taken) return false;
    var took = false;

    if (loot.kind === 'weapon') {
      var w = CFG.weapons[loot.weaponId];
      var dropped = actor.giveWeapon(loot.weaponId);
      if (dropped) this.spawnLoot(actor.pos.x + U.rand(-1, 1), actor.pos.z + U.rand(-1, 1), dropped);
      actor.giveAmmo(w.ammo, CFG.ammoPickup[w.ammo]);
      took = true;
    } else if (loot.kind === 'ammo') {
      var types = ['light', 'heavy', 'shell', 'sniper'];
      for (var i = 0; i < types.length; i++) {
        actor.giveAmmo(types[i], Math.round(CFG.ammoPickup[types[i]] * 0.6));
      }
      took = true;
    } else if (loot.kind === 'medkit' && actor.items.medkit < CFG.items.medkit.max) {
      actor.items.medkit++; took = true;
    } else if (loot.kind === 'armor' && actor.items.armor < CFG.items.armor.max) {
      actor.items.armor++; took = true;
    } else if (loot.kind === 'gloo' && actor.items.gloo < CFG.items.gloo.max) {
      actor.items.gloo++; took = true;
    }

    if (!took) {
      if (actor === this.player) this.hud.announce('Cannot carry more');
      return false;
    }

    loot.taken = true;
    loot.dispose();
    var idx = this.loot.indexOf(loot);
    if (idx >= 0) this.loot.splice(idx, 1);

    if (actor === this.player) {
      this.audio.pickup();
      this.hud.announce('Picked up ' + loot.label());
    }
    return true;
  };

  /* Auto-pickup for consumables the player walks over, like the mobile game. */
  Game.prototype._autoPickup = function () {
    var p = this.player;
    if (!p.alive || p.state !== 'ground') return;
    for (var i = this.loot.length - 1; i >= 0; i--) {
      var l = this.loot[i];
      if (l.kind === 'weapon') continue;
      if (U.dist2D(p.pos.x, p.pos.z, l.pos.x, l.pos.z) < 1.5 &&
          Math.abs(l.pos.y - p.pos.y) < 2.5) {
        this.tryPickup(p, l, true);
      }
    }
    // First gun found is picked up automatically so a fresh landing isn't fatal.
    if (!p.slots.primary && !p.slots.sidearm) {
      var g = this.nearestLoot(p, 1.6);
      if (g && g.kind === 'weapon') this.tryPickup(p, g, true);
    }
  };

  /* ------------------------------------------------------------- gloo wall */

  Game.prototype.deployGloo = function (actor) {
    if (!actor.alive || actor.items.gloo <= 0 || actor.glooCooldown > 0) {
      if (actor === this.player && actor.items.gloo <= 0) this.hud.announce('No gloo walls');
      return false;
    }
    var d = 2.6;
    var x = actor.pos.x + Math.sin(actor.yaw) * d;
    var z = actor.pos.z + Math.cos(actor.yaw) * d;
    var y = this.world.groundAt(x, z, actor.pos.y + 1, 0.5);

    actor.items.gloo--;
    actor.glooCooldown = CFG.items.gloo.cooldown;
    this.gloos.push(new FF.GlooWall(this, x, y, z, actor.yaw, actor));
    this.audio.gloo();
    return true;
  };

  /* -------------------------------------------------------------- airdrop */

  Game.prototype._airdrop = function () {
    var z = this.zone;
    var ang = Math.random() * Math.PI * 2;
    var r = Math.sqrt(Math.random()) * z.radius * 0.7;
    var x = z.cx + Math.cos(ang) * r, cz = z.cz + Math.sin(ang) * r;

    var crate = new THREE.Group();
    var box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xd4ac0d }));
    var chute = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xf05a28, side: THREE.DoubleSide })
    );
    chute.position.y = 3.2;
    crate.add(box, chute);
    crate.position.set(x, 120, cz);
    this.scene.add(crate);

    this.airdrop = { mesh: crate, x: x, z: cz, landed: false };
    this.hud.announce('Airdrop incoming!');
    this.audio.alarm();
  };

  Game.prototype._updateAirdrop = function (dt) {
    var a = this.airdrop;
    if (!a || a.landed) return;
    a.mesh.position.y -= 14 * dt;
    var ground = this.world.groundAt(a.x, a.z);
    if (a.mesh.position.y <= ground + 0.7) {
      a.mesh.position.y = ground + 0.7;
      a.mesh.children[1].visible = false;
      a.landed = true;
      this.spawnLoot(a.x, a.z + 1.6, U.pick(CFG.airdropTable));
      this.spawnLoot(a.x + 1.4, a.z, 'armor');
      this.spawnLoot(a.x - 1.4, a.z, 'medkit');
      this.spawnLoot(a.x, a.z - 1.6, 'ammo');
      this.hud.announce('Airdrop landed');
    }
  };

  /* ------------------------------------------------------------------ loop */

  Game.prototype._loop = function (now) {
    requestAnimationFrame(this._loopBound);
    var dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (!this.running || this.paused) return;

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  Game.prototype.update = function (dt) {
    var i;
    this.time += dt;

    this.controller.update(dt);

    for (i = 0; i < this.bots.length; i++) this.bots[i].update(dt);

    for (i = 0; i < this.actors.length; i++) {
      var a = this.actors[i];
      a.glooCooldown = Math.max(0, a.glooCooldown - dt);
      if (a.alive) a.updateVisual(dt, this.camera);
    }

    for (i = this.gloos.length - 1; i >= 0; i--) {
      if (!this.gloos[i].update(dt)) {
        this.gloos[i].dispose();
        this.gloos.splice(i, 1);
      }
    }

    for (i = 0; i < this.loot.length; i++) this.loot[i].update(dt, this.time);

    for (i = this.gunfirePings.length - 1; i >= 0; i--) {
      this.gunfirePings[i].life -= dt;
      if (this.gunfirePings[i].life <= 0) this.gunfirePings.splice(i, 1);
    }

    this.zone.update(dt);
    this.combat.update(dt);
    this._autoPickup();

    if (!this.airdropDone && this.time > CFG.match.airdropAt) {
      this.airdropDone = true;
      this._airdrop();
    }
    this._updateAirdrop(dt);

    this.hud.update(dt);
  };

  /* --------------------------------------------------------------- results */

  Game.prototype.finish = function (won, placement) {
    if (this.result) return;
    var p = this.player;
    this.result = {
      won: won,
      placement: placement,
      kills: p.kills,
      damage: Math.round(p.damageDealt),
      survived: this.time
    };
    var self = this;
    setTimeout(function () {
      self.running = false;
      if (document.pointerLockElement) document.exitPointerLock();
      FF.ui.showResults(self.result);
      if (won) self.audio.booyah();
    }, won ? 900 : 1600);
  };

  Game.prototype.togglePause = function () {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('pause').classList.toggle('show', this.paused);
    if (this.paused && document.pointerLockElement) document.exitPointerLock();
  };

  Game.prototype.dispose = function () {
    this.running = false;
    if (this.scene) {
      this.scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
          else o.material.dispose();
        }
      });
    }
    this.actors = [];
    this.bots = [];
    this.loot = [];
    this.gloos = [];
  };

  FF.Game = Game;
})(window);
