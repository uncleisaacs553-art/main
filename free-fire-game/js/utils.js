/* Small math / geometry helpers shared by every system. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(a, b, rate, dt) { return lerp(a, b, 1 - Math.exp(-rate * dt)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* Weighted pick over [{id, w}] entries. */
  function weighted(table) {
    var total = 0, i;
    for (i = 0; i < table.length; i++) total += table[i].w;
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++) {
      r -= table[i].w;
      if (r <= 0) return table[i].id;
    }
    return table[table.length - 1].id;
  }

  /* Shortest signed delta between two angles, in (-PI, PI]. */
  function angleDelta(from, to) {
    var d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* Gentle rolling terrain. Deterministic so colliders and mesh agree. */
  function terrainHeight(x, z) {
    var a = FF.CFG.world.terrainAmp;
    return a * (
      0.55 * Math.sin(x * 0.013) * Math.cos(z * 0.011) +
      0.30 * Math.sin((x + z) * 0.021) +
      0.15 * Math.cos((x - z * 1.7) * 0.033)
    );
  }

  /* Ray vs axis-aligned box. Returns entry distance or -1. */
  function rayBox(ox, oy, oz, dx, dy, dz, box) {
    var tmin = 0, tmax = Infinity, t1, t2, tmp;

    // X slab
    if (Math.abs(dx) < 1e-8) { if (ox < box.minX || ox > box.maxX) return -1; }
    else {
      t1 = (box.minX - ox) / dx; t2 = (box.maxX - ox) / dx;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    // Y slab
    if (Math.abs(dy) < 1e-8) { if (oy < box.minY || oy > box.maxY) return -1; }
    else {
      t1 = (box.minY - oy) / dy; t2 = (box.maxY - oy) / dy;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    // Z slab
    if (Math.abs(dz) < 1e-8) { if (oz < box.minZ || oz > box.maxZ) return -1; }
    else {
      t1 = (box.minZ - oz) / dz; t2 = (box.maxZ - oz) / dz;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    return tmin;
  }

  /* Ray vs sphere. Returns nearest positive hit distance or -1. */
  function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
    var mx = ox - cx, my = oy - cy, mz = oz - cz;
    var b = mx * dx + my * dy + mz * dz;
    var c = mx * mx + my * my + mz * mz - r * r;
    if (c > 0 && b > 0) return -1;
    var disc = b * b - c;
    if (disc < 0) return -1;
    var t = -b - Math.sqrt(disc);
    return t < 0 ? 0 : t;
  }

  /* Circle (XZ) vs AABB overlap test. */
  function circleBoxOverlap(x, z, r, box) {
    var cx = clamp(x, box.minX, box.maxX);
    var cz = clamp(z, box.minZ, box.maxZ);
    var dx = x - cx, dz = z - cz;
    return dx * dx + dz * dz < r * r;
  }

  function makeBox(cx, cy, cz, sx, sy, sz) {
    return {
      minX: cx - sx / 2, maxX: cx + sx / 2,
      minY: cy, maxY: cy + sy,
      minZ: cz - sz / 2, maxZ: cz + sz / 2
    };
  }

  function boxCenterX(b) { return (b.minX + b.maxX) / 2; }
  function boxCenterZ(b) { return (b.minZ + b.maxZ) / 2; }

  function dist2D(ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  FF.U = {
    clamp: clamp, lerp: lerp, damp: damp, rand: rand, randInt: randInt,
    pick: pick, shuffle: shuffle, weighted: weighted, angleDelta: angleDelta,
    terrainHeight: terrainHeight, rayBox: rayBox, raySphere: raySphere,
    circleBoxOverlap: circleBoxOverlap, makeBox: makeBox,
    boxCenterX: boxCenterX, boxCenterZ: boxCenterZ,
    dist2D: dist2D, formatTime: formatTime
  };
})(window);
