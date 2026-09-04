/* All DOM/2D overlay: vitals, ammo, kill feed, minimap, map, damage feedback. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U, CFG = FF.CFG;

  function el(id) { return document.getElementById(id); }

  function HUD(game) {
    this.game = game;
    this.hitTimer = 0;
    this.zoneFlash = 0;
    this.announceTimer = 0;
    this.dirIndicators = [];
    this.damageNumbers = [];
    this.mapOpen = false;

    this.root = el('hud');
    this.hpFill = el('hp-fill');
    this.hpText = el('hp-text');
    this.arFill = el('ar-fill');
    this.arText = el('ar-text');
    this.aliveCount = el('alive-count');
    this.killCount = el('kill-count');
    this.zoneLabel = el('zone-label');
    this.zoneTimer = el('zone-timer');
    this.weaponName = el('weapon-name');
    this.ammoMag = el('ammo-mag');
    this.ammoReserve = el('ammo-reserve');
    this.slotPrimary = el('slot-primary');
    this.slotSidearm = el('slot-sidearm');
    this.itemMed = el('item-med-count');
    this.itemArmor = el('item-armor-count');
    this.itemGloo = el('item-gloo-count');
    this.crosshair = el('crosshair');
    this.hitmarkEl = el('hitmarker');
    this.killfeed = el('killfeed');
    this.announceEl = el('announce');
    this.promptEl = el('prompt');
    this.channelEl = el('channel');
    this.channelFill = el('channel-fill');
    this.channelLabel = el('channel-label');
    this.vignette = el('vignette');
    this.dirLayer = el('dir-layer');
    this.dmgLayer = el('damage-layer');
    this.reloadEl = el('reload-indicator');
    this.scopeEl = el('scope');
    this.locationEl = el('location');

    this.mini = el('minimap');
    this.miniCtx = this.mini.getContext('2d');
    this.big = el('bigmap');
    this.bigCtx = this.big.getContext('2d');
    this.bigWrap = el('bigmap-wrap');

    for (var i = 0; i < 6; i++) {
      var d = document.createElement('div');
      d.className = 'dir-ind';
      this.dirLayer.appendChild(d);
      this.dirIndicators.push({ node: d, life: 0, angle: 0 });
    }
  }

  /* ------------------------------------------------------------- messaging */

  HUD.prototype.announce = function (text) {
    this.announceEl.textContent = text;
    this.announceEl.classList.add('show');
    this.announceTimer = 2.2;
  };

  HUD.prototype.kill = function (killer, victim, weaponName, headshot) {
    var row = document.createElement('div');
    row.className = 'feed-row';
    var isMe = killer === this.game.player || victim === this.game.player;
    if (isMe) row.classList.add('mine');
    var kname = killer ? killer.name : 'The zone';
    row.innerHTML =
      '<span class="k">' + kname + '</span>' +
      '<span class="w">' + (headshot ? '&#9737; ' : '') + weaponName + '</span>' +
      '<span class="v">' + victim.name + '</span>';
    this.killfeed.appendChild(row);
    while (this.killfeed.children.length > 5) this.killfeed.removeChild(this.killfeed.firstChild);
    setTimeout(function () {
      if (row.parentNode) row.parentNode.removeChild(row);
    }, 6000);
  };

  HUD.prototype.hitmarker = function (head) {
    this.hitTimer = CFG.combat.hitmarkTime;
    this.hitmarkEl.classList.toggle('head', !!head);
    this.hitmarkEl.style.opacity = '1';
  };

  HUD.prototype.damageNumber = function (amount, head) {
    var n = document.createElement('div');
    n.className = 'dmg-num' + (head ? ' head' : '');
    n.textContent = amount;
    n.style.left = (48 + U.rand(-6, 6)) + '%';
    n.style.top = (44 + U.rand(-5, 5)) + '%';
    this.dmgLayer.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 750);
  };

  HUD.prototype.damageFrom = function (attackerPos, player) {
    var ang = Math.atan2(attackerPos.x - player.pos.x, attackerPos.z - player.pos.z);
    var rel = U.angleDelta(player.yaw, ang);
    for (var i = 0; i < this.dirIndicators.length; i++) {
      var d = this.dirIndicators[i];
      if (d.life > 0) continue;
      d.life = 1.4;
      d.angle = rel;
      d.node.style.transform = 'rotate(' + (-rel * 180 / Math.PI) + 'deg)';
      d.node.style.opacity = '1';
      break;
    }
    this.zoneFlash = Math.max(this.zoneFlash, 0.45);
  };

  HUD.prototype.flashZone = function () { this.zoneFlash = 0.6; };

  HUD.prototype.toggleMap = function () {
    this.mapOpen = !this.mapOpen;
    this.bigWrap.classList.toggle('show', this.mapOpen);
  };

  /* ---------------------------------------------------------------- update */

  HUD.prototype.update = function (dt) {
    var game = this.game, p = game.player;
    if (!p) return;

    var maxHp = CFG.player.maxHealth;
    this.hpFill.style.width = U.clamp(p.health / maxHp, 0, 1) * 100 + '%';
    this.hpText.textContent = Math.ceil(p.health);
    this.arFill.style.width = U.clamp(p.armor / CFG.player.maxArmor, 0, 1) * 100 + '%';
    this.arText.textContent = Math.ceil(p.armor);

    this.aliveCount.textContent = game.aliveCount();
    this.killCount.textContent = p.kills;

    var w = p.weapon();
    this.weaponName.textContent = w.name;
    this.ammoMag.textContent = w.ammo ? p.magOf(w.id) : '∞';
    this.ammoReserve.textContent = w.ammo ? (p.ammo[w.ammo] || 0) : '';
    this.slotPrimary.textContent = p.slots.primary ? CFG.weapons[p.slots.primary].name : '—';
    this.slotSidearm.textContent = p.slots.sidearm ? CFG.weapons[p.slots.sidearm].name : '—';
    this.slotPrimary.classList.toggle('active', p.current === 'primary');
    this.slotSidearm.classList.toggle('active', p.current === 'sidearm');

    this.itemMed.textContent = p.items.medkit;
    this.itemArmor.textContent = p.items.armor;
    this.itemGloo.textContent = p.items.gloo;

    var zone = game.zone;
    this.zoneLabel.textContent = zone.statusLabel();
    this.zoneTimer.textContent = U.formatTime(zone.timeLeft());

    /* Crosshair opens up with spread. */
    var spread = game.combat.spreadFor(p, w);
    var gap = U.clamp(6 + spread * 900, 5, 42);
    this.crosshair.style.setProperty('--gap', gap + 'px');
    this.crosshair.style.opacity = p.ads && w.zoom > 2 ? '0' : '1';
    this.scopeEl.classList.toggle('show', p.ads && w.zoom > 2);

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      this.hitmarkEl.style.opacity = String(U.clamp(this.hitTimer / CFG.combat.hitmarkTime, 0, 1));
    }

    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      if (this.announceTimer <= 0) this.announceEl.classList.remove('show');
    }

    if (this.zoneFlash > 0) {
      this.zoneFlash -= dt * 1.6;
      this.vignette.style.opacity = String(U.clamp(this.zoneFlash, 0, 1) * 0.75);
    } else {
      var low = 1 - U.clamp(p.health / 45, 0, 1);
      this.vignette.style.opacity = String(low * 0.55);
    }

    for (var i = 0; i < this.dirIndicators.length; i++) {
      var d = this.dirIndicators[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      d.node.style.opacity = String(U.clamp(d.life / 1.4, 0, 1));
    }

    /* Reload / channel bars */
    if (p.reloading > 0) {
      var wr = CFG.weapons[p.reloadTarget] || w;
      this.reloadEl.classList.add('show');
      this.reloadEl.style.setProperty('--p', (1 - p.reloading / wr.reload) * 100 + '%');
    } else {
      this.reloadEl.classList.remove('show');
    }

    if (p.channel) {
      this.channelEl.classList.add('show');
      this.channelLabel.textContent = p.channel.kind === 'medkit' ? 'Using Med Kit' : 'Applying Armor';
      this.channelFill.style.width = (1 - p.channel.time / p.channel.total) * 100 + '%';
    } else {
      this.channelEl.classList.remove('show');
    }

    /* Pickup prompt */
    var loot = game.nearestLoot(p, 2.6);
    if (loot) {
      this.promptEl.classList.add('show');
      this.promptEl.innerHTML = '<b>E</b> Pick up <span>' + loot.label() + '</span>';
    } else {
      this.promptEl.classList.remove('show');
    }

    var poi = game.world.poiAt(p.pos.x, p.pos.z);
    this.locationEl.textContent = poi || '';

    this._drawMini();
    if (this.mapOpen) this._drawBig();
  };

  /* ------------------------------------------------------------------ maps */

  HUD.prototype._drawMini = function () {
    var ctx = this.miniCtx, game = this.game, p = game.player;
    var W = this.mini.width, H = this.mini.height;
    var range = 90;                       // metres shown across the minimap
    var scale = W / (range * 2);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#20301f';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);

    function px(x) { return (x - p.pos.x) * scale; }
    function pz(z) { return (z - p.pos.z) * scale; }

    // Buildings near the player.
    ctx.fillStyle = 'rgba(210,200,180,0.55)';
    var boxes = game.world.boxes;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (Math.abs(b.cx - p.pos.x) > range || Math.abs(b.cz - p.pos.z) > range) continue;
      if (b.sy < 1.2) continue;
      ctx.fillRect(px(b.cx) - b.sx * scale / 2, pz(b.cz) - b.sz * scale / 2,
                   Math.max(1.5, b.sx * scale), Math.max(1.5, b.sz * scale));
    }

    // Loot pings.
    ctx.fillStyle = '#ffd54f';
    for (var l = 0; l < game.loot.length; l++) {
      var it = game.loot[l];
      if (it.taken) continue;
      if (Math.abs(it.pos.x - p.pos.x) > range || Math.abs(it.pos.z - p.pos.z) > range) continue;
      ctx.fillRect(px(it.pos.x) - 1.5, pz(it.pos.z) - 1.5, 3, 3);
    }

    // Recent gunfire.
    for (var g = 0; g < game.gunfirePings.length; g++) {
      var ping = game.gunfirePings[g];
      ctx.globalAlpha = U.clamp(ping.life / 3, 0, 1);
      ctx.fillStyle = '#ff5a4a';
      ctx.beginPath();
      ctx.arc(px(ping.x), pz(ping.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    this._zoneOn(ctx, px, pz, scale);

    // Player arrow.
    ctx.save();
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  };

  HUD.prototype._zoneOn = function (ctx, px, pz, scale) {
    var z = this.game.zone;
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(z.cx), pz(z.cz), z.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
    if (!z.shrinking && z.toR > 0.5) {
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px(z.toX), pz(z.toZ), z.toR * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  HUD.prototype._drawBig = function () {
    var ctx = this.bigCtx, game = this.game, p = game.player;
    var W = this.big.width, H = this.big.height;
    var world = game.world;
    var scale = W / (world.size + 40);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1d2b1c';
    ctx.fillRect(0, 0, W, H);

    function px(x) { return W / 2 + x * scale; }
    function pz(z) { return H / 2 + z * scale; }

    ctx.fillStyle = 'rgba(210,200,180,0.6)';
    for (var i = 0; i < world.boxes.length; i++) {
      var b = world.boxes[i];
      if (b.sy < 1.2) continue;
      ctx.fillRect(px(b.cx) - b.sx * scale / 2, pz(b.cz) - b.sz * scale / 2,
                   Math.max(1, b.sx * scale), Math.max(1, b.sz * scale));
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '12px Rajdhani, Arial, sans-serif';
    ctx.textAlign = 'center';
    for (var q = 0; q < world.pois.length; q++) {
      ctx.fillText(world.pois[q].name, px(world.pois[q].x), pz(world.pois[q].z));
    }

    this._zoneOn(ctx, px, pz, scale);

    ctx.save();
    ctx.translate(px(p.pos.x), pz(p.pos.z));
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#f0a30a';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  FF.HUD = HUD;
})(window);
