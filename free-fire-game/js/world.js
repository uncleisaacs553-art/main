/* Procedural island map: terrain, named POIs, buildings, cover and loot spawns.
   All static geometry is packed into a handful of InstancedMeshes so the whole
   map costs only a few draw calls. */
(function (global) {
  'use strict';

  var FF = global.FF = global.FF || {};
  var U = FF.U;

  var CELL = 25; // broadphase grid cell size, in metres

  function World(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.size = FF.CFG.world.size;
    this.half = this.size / 2;

    this.boxes = [];       // render descriptors {cx,cy,cz,sx,sy,sz,color}
    this.colliders = [];   // AABBs used by movement + bullets
    this.dynamic = [];     // gloo walls etc, appended at runtime
    this.pois = [];
    this.lootSpawns = [];
    this.stairs = [];      // {x, z, dirX, dirZ, top} — every route to a roof
    this.group = new THREE.Group();

    this._grid = {};
    this._stamp = 0;
    this._visited = {};

    this._buildTerrain();
    this._buildPOIs();
    this._buildBounds();
    this._commit();
    scene.add(this.group);
  }

  /* ---------------------------------------------------------------- terrain */

  World.prototype._buildTerrain = function () {
    var seg = 96, size = this.size + 120;
    var geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);

    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var grass = new THREE.Color(0x4e7a45);
    var sand = new THREE.Color(0xc2b280);
    var dirt = new THREE.Color(0x6d6a4a);

    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var h = U.terrainHeight(x, z);
      var edge = Math.max(Math.abs(x), Math.abs(z));
      if (edge > this.half - 6) h -= (edge - (this.half - 6)) * 0.35; // beach falls to water
      pos.setY(i, h);

      // Blend a few octaves of grass/dirt so the ground reads as terrain
      // rather than a flat green sheet, then sand it toward the shoreline.
      var n = Math.sin(x * 0.055) * Math.cos(z * 0.048)
            + 0.6 * Math.sin((x + z * 0.7) * 0.13)
            + 0.35 * Math.cos((x * 1.3 - z) * 0.21);
      var c = grass.clone();
      c.offsetHSL(0, 0, n * 0.035);
      c.lerp(dirt, U.clamp((n + 1.4) * 0.22, 0, 0.55));
      if (h > 3.2) c.lerp(dirt, U.clamp((h - 3.2) * 0.25, 0, 0.4));
      if (edge > this.half - 16) c.lerp(sand, U.clamp((edge - (this.half - 16)) / 18, 0, 1));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    var ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = this.quality.shadows;
    this.group.add(ground);

    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2.2, size * 2.2),
      new THREE.MeshLambertMaterial({ color: 0x2f6f93, transparent: true, opacity: 0.92 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -4.2;
    this.group.add(water);
  };

  /* --------------------------------------------------------------- builders */

  World.prototype._box = function (cx, cy, cz, sx, sy, sz, color, noCollide) {
    this.boxes.push({ cx: cx, cy: cy, cz: cz, sx: sx, sy: sy, sz: sz, color: color });
    if (!noCollide) this.colliders.push(U.makeBox(cx, cy, cz, sx, sy, sz));
  };

  /* A wall with an optional doorway gap centred on `gap` (fraction along len). */
  World.prototype._wall = function (cx, cy, cz, len, height, thick, alongX, color, door) {
    var t = thick, h = height;
    if (!door) {
      if (alongX) this._box(cx, cy, cz, len, h, t, color);
      else this._box(cx, cy, cz, t, h, len, color);
      return;
    }
    var doorW = 2.2, side = (len - doorW) / 2;
    var lintel = h - 2.3;
    if (alongX) {
      this._box(cx - (len - side) / 2, cy, cz, side, h, t, color);
      this._box(cx + (len - side) / 2, cy, cz, side, h, t, color);
      if (lintel > 0.1) this._box(cx, cy + 2.3, cz, doorW, lintel, t, color);
    } else {
      this._box(cx, cy, cz - (len - side) / 2, t, h, side, color);
      this._box(cx, cy, cz + (len - side) / 2, t, h, side, color);
      if (lintel > 0.1) this._box(cx, cy + 2.3, cz + 0, t, lintel, doorW, color);
    }
  };

  /* A flight of stairs topping out at (landX, landZ), climbed in (dirX, dirZ).
     Treads are separate boxes just under the actors' step height, so roofs are
     reachable with no slope colliders, and the landing overlaps the roof edge. */
  World.prototype._stairs = function (landX, landZ, top, dirX, dirZ, color) {
    var rise = 0.55, run = 0.78;
    var steps = Math.max(1, Math.ceil(top / rise));
    var startX = landX - dirX * steps * run;
    var startZ = landZ - dirZ * steps * run;
    var base = U.terrainHeight(startX, startZ);

    for (var i = 0; i < steps; i++) {
      var tx = startX + dirX * i * run, tz = startZ + dirZ * i * run;
      this._box(tx, base + i * rise, tz,
                dirX ? run + 0.05 : 1.6, rise * 1.05, dirZ ? run + 0.05 : 1.6, color);
    }
    this._box(landX, base + steps * rise - 0.3, landZ, 2.2, 0.35, 2.2, color);

    this.stairs.push({ x: startX, z: startZ, dirX: dirX, dirZ: dirZ, steps: steps,
                       base: base, top: base + steps * rise });
  };

  /* --------------------------------------------------------------- geometry */

  /* Eight ways to run a flight alongside a footprint: one per wall, per end. */
  World.prototype._stairCandidates = function (x, z, w, d) {
    return U.shuffle([
      { x: x + w / 2 + 1.0, z: z + d / 2, dx: 0, dz: 1 },
      { x: x - w / 2 - 1.0, z: z + d / 2, dx: 0, dz: 1 },
      { x: x + w / 2 + 1.0, z: z - d / 2, dx: 0, dz: -1 },
      { x: x - w / 2 - 1.0, z: z - d / 2, dx: 0, dz: -1 },
      { x: x + w / 2, z: z + d / 2 + 1.0, dx: 1, dz: 0 },
      { x: x - w / 2, z: z + d / 2 + 1.0, dx: -1, dz: 0 },
      { x: x + w / 2, z: z - d / 2 - 1.0, dx: 1, dz: 0 },
      { x: x - w / 2, z: z - d / 2 - 1.0, dx: -1, dz: 0 }
    ]);
  };

  /* A flight only works if nothing already stands along its whole run. */
  World.prototype._flightClear = function (landX, landZ, top, dirX, dirZ) {
    var rise = 0.55, run = 0.78;
    var steps = Math.max(1, Math.ceil(top / rise));
    var sx = landX - dirX * steps * run, sz = landZ - dirZ * steps * run;
    if (Math.max(Math.abs(sx), Math.abs(sz)) > this.half - 10) return false;
    // The approach to the bottom step has to be walkable too, or the flight
    // is decorative.
    if (this._blocked(sx - dirX * 1.6, sz - dirZ * 1.6, 0.6)) return false;
    for (var i = 0; i <= steps; i++) {
      if (this._blocked(sx + dirX * i * run, sz + dirZ * i * run, 0.55)) return false;
    }
    return true;
  };

  /* Build the first flight that fits; buildings hemmed in on all sides
     simply keep their roof out of reach. */
  World.prototype._addStairs = function (candidates, top, color) {
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!this._flightClear(c.x, c.z, top, c.dx, c.dz)) continue;
      this._stairs(c.x, c.z, top, c.dx, c.dz, color);
      return true;
    }
    return false;
  };

  World.prototype._house = function (x, z, w, d, h, wallColor, roofColor) {
    var base = U.terrainHeight(x, z);
    var t = 0.35;
    this._box(x, base - 1.6, z, w + 0.6, 1.8, d + 0.6, 0x9a948a);            // slab
    this._wall(x, base, z - d / 2, w, h, t, true, wallColor, true);          // front (door)
    this._wall(x, base, z + d / 2, w, h, t, true, wallColor, false);         // back
    this._wall(x - w / 2, base, z, d, h, t, false, wallColor, false);
    this._wall(x + w / 2, base, z, d, h, t, false, wallColor, true);
    this._box(x, base + h, z, w + 0.8, 0.35, d + 0.8, roofColor);            // roof
    this._addStairs(this._stairCandidates(x, z, w, d), h + 0.35, 0xa8a096);
    this.lootSpawns.push({ x: x + w * 0.25, z: z + d * 0.2 });
    this.lootSpawns.push({ x: x - w * 0.28, z: z - d * 0.22 });
  };

  World.prototype._hall = function (x, z, w, d, h, wallColor, roofColor) {
    var base = U.terrainHeight(x, z), t = 0.4;
    this._box(x, base - 1.6, z, w + 1, 1.8, d + 1, 0x8f8a80);
    this._wall(x, base, z - d / 2, w, h, t, true, wallColor, true);
    this._wall(x, base, z + d / 2, w, h, t, true, wallColor, true);
    this._wall(x - w / 2, base, z, d, h, t, false, wallColor, false);
    this._wall(x + w / 2, base, z, d, h, t, false, wallColor, false);
    for (var i = -1; i <= 1; i += 2) {
      this._box(x + i * w * 0.25, base, z, 0.6, h, 0.6, 0xa39c90);           // pillars
    }
    this._box(x, base + h, z, w + 1.2, 0.4, d + 1.2, roofColor);
    this._addStairs(this._stairCandidates(x, z, w, d), h + 0.4, 0xa8a096);
    this.lootSpawns.push({ x: x, z: z });
    this.lootSpawns.push({ x: x + w * 0.3, z: z - d * 0.3 });
    this.lootSpawns.push({ x: x - w * 0.3, z: z + d * 0.3 });
  };

  World.prototype._tower = function (x, z, s, h) {
    var base = U.terrainHeight(x, z), t = 0.4;
    this._wall(x, base, z - s / 2, s, h, t, true, 0xb9ab92, true);
    this._wall(x, base, z + s / 2, s, h, t, true, 0xb9ab92, false);
    this._wall(x - s / 2, base, z, s, h, t, false, 0xb9ab92, false);
    this._wall(x + s / 2, base, z, s, h, t, false, 0xb9ab92, false);
    this._box(x, base + h, z, s + 1.4, 0.4, s + 1.4, 0x8b5a3c);
    // Parapet so the roof plays as a sniper nest.
    this._box(x, base + h + 0.4, z - s / 2 - 0.5, s + 1.4, 0.9, 0.3, 0xb9ab92);
    this._box(x, base + h + 0.4, z + s / 2 + 0.5, s + 1.4, 0.9, 0.3, 0xb9ab92);
    this._box(x - s / 2 - 0.5, base + h + 0.4, z, 0.3, 0.9, s + 1.4, 0xb9ab92);
    this.lootSpawns.push({ x: x, z: z });
    this.lootSpawns.push({ x: x + 0.5, z: z + 0.5 });
  };

  World.prototype._containers = function (x, z, count) {
    var palette = [0xb03a2e, 0x2874a6, 0x1e8449, 0xd4ac0d, 0x7d3c98];
    for (var i = 0; i < count; i++) {
      var cx = x + U.rand(-9, 9), cz = z + U.rand(-9, 9);
      var base = U.terrainHeight(cx, cz);
      var rot = Math.random() < 0.5;
      var w = rot ? 2.6 : 7.2, d = rot ? 7.2 : 2.6;
      var stack = Math.random() < 0.35 ? 2 : 1;
      for (var s = 0; s < stack; s++) {
        this._box(cx, base + s * 2.7, cz, w, 2.6, d, U.pick(palette));
      }
      if (stack > 1) {
        // Climb from the open side so the landing sits on the container roof.
        this._addStairs([
          { x: cx + (rot ? 1.3 : 0), z: cz + (rot ? 0 : 1.3), dx: rot ? -1 : 0, dz: rot ? 0 : -1 },
          { x: cx - (rot ? 1.3 : 0), z: cz - (rot ? 0 : 1.3), dx: rot ? 1 : 0, dz: rot ? 0 : 1 }
        ], 2.7, 0xa8a096);
      }
      this.lootSpawns.push({ x: cx + 3.2, z: cz + 3.2 });
    }
  };

  World.prototype._cover = function (x, z, n) {
    for (var i = 0; i < n; i++) {
      var cx = x + U.rand(-14, 14), cz = z + U.rand(-14, 14);
      var base = U.terrainHeight(cx, cz);
      var r = Math.random();
      if (r < 0.45) {
        this._box(cx, base, cz, 1.5, 1.5, 1.5, 0x9c7042);                    // crate
      } else if (r < 0.75) {
        this._box(cx, base, cz, U.rand(3, 6), U.rand(1.0, 1.4), 0.5, 0x8d8880); // low wall
      } else {
        this._box(cx, base, cz, 1.0, 1.2, 1.0, 0x5d6d7e);                    // barrel-ish
      }
      if (Math.random() < 0.5) this.lootSpawns.push({ x: cx + 1.6, z: cz + 1.6 });
    }
  };

  /* ------------------------------------------------------------------ POIs */

  World.prototype._buildPOIs = function () {
    var names = ['Clock Tower', 'Peak', 'Factory', 'Cape Town', 'Mill Stone',
                 'Shipyard', 'Hangar', 'Riverside', 'Observatory'];
    var spots = [
      { x: 0, z: 0 }, { x: -105, z: -95 }, { x: 100, z: -105 }, { x: -115, z: 90 },
      { x: 110, z: 100 }, { x: 0, z: -140 }, { x: -150, z: 0 }, { x: 150, z: 20 },
      { x: 20, z: 145 }
    ];
    var trees = [];

    for (var i = 0; i < spots.length; i++) {
      var p = spots[i];
      var name = names[i];
      this.pois.push({ name: name, x: p.x, z: p.z });

      if (i === 0) {
        this._tower(p.x, p.z, 9, 11);
        this._hall(p.x + 22, p.z + 8, 18, 12, 4.6, 0xcfc2a8, 0x8b5a3c);
        this._house(p.x - 20, p.z - 14, 11, 9, 3.3, 0xd9cdb6, 0xa9563c);
        this._house(p.x - 6, p.z + 22, 10, 8, 3.2, 0xc6b9a1, 0x5f6b74);
        this._cover(p.x, p.z, 14);
      } else if (i === 5 || i === 7) {
        this._containers(p.x, p.z, 7);
        this._hall(p.x + 16, p.z - 12, 20, 13, 5.0, 0xb6ada0, 0x5f6b74);
        this._cover(p.x, p.z, 10);
      } else {
        var houses = U.randInt(3, 5);
        for (var h = 0; h < houses; h++) {
          var a = (h / houses) * Math.PI * 2 + U.rand(-0.4, 0.4);
          var r = U.rand(12, 26);
          this._house(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r,
                      U.rand(9, 13), U.rand(7, 10), U.rand(3.0, 3.6),
                      U.pick([0xd9cdb6, 0xc6b9a1, 0xb0a48c]),
                      U.pick([0xa9563c, 0x5f6b74, 0x7d6a55]));
        }
        if (Math.random() < 0.6) this._tower(p.x + U.rand(-24, 24), p.z + U.rand(-24, 24), 8, U.rand(7, 10));
        this._cover(p.x, p.z, 10);
      }
    }

    // Scattered wilderness: lone huts, rock clusters and loot in the open.
    var extras = Math.round(26 * this.quality.props);
    for (var e = 0; e < extras; e++) {
      var ex = U.rand(-this.half + 25, this.half - 25);
      var ez = U.rand(-this.half + 25, this.half - 25);
      if (this._nearPOI(ex, ez, 34)) continue;
      if (Math.random() < 0.45) {
        this._house(ex, ez, U.rand(7, 10), U.rand(6, 8), 3.1,
                    U.pick([0xc6b9a1, 0xb0a48c]), U.pick([0xa9563c, 0x5f6b74]));
      } else {
        this._cover(ex, ez, U.randInt(2, 5));
      }
    }

    // Trees are decoration only (no colliders) so firefights stay readable.
    var treeCount = Math.round(320 * this.quality.props);
    for (var t = 0; t < treeCount; t++) {
      var tx = U.rand(-this.half + 8, this.half - 8);
      var tz = U.rand(-this.half + 8, this.half - 8);
      if (this._nearPOI(tx, tz, 30)) continue;
      if (this._blocked(tx, tz, 3.2)) continue;
      trees.push({ x: tx, z: tz, y: U.terrainHeight(tx, tz), s: U.rand(0.8, 1.5) });
    }
    this._commitTrees(trees);
  };

  /* True if any structure sits within `r` of this spot (pre-grid, so linear). */
  World.prototype._blocked = function (x, z, r) {
    for (var i = 0; i < this.colliders.length; i++) {
      if (U.circleBoxOverlap(x, z, r, this.colliders[i])) return true;
    }
    return false;
  };

  World.prototype._nearPOI = function (x, z, r) {
    for (var i = 0; i < this.pois.length; i++) {
      if (U.dist2D(x, z, this.pois[i].x, this.pois[i].z) < r) return true;
    }
    return false;
  };

  World.prototype._buildBounds = function () {
    var h = this.half - 4, wallH = 22;
    // Invisible playfield walls (colliders only) keep everyone on the island.
    var sides = [
      [0, -h - 1, this.size, 2], [0, h + 1, this.size, 2],
      [-h - 1, 0, 2, this.size], [h + 1, 0, 2, this.size]
    ];
    for (var i = 0; i < sides.length; i++) {
      var s = sides[i];
      this.colliders.push(U.makeBox(s[0], -6, s[1], s[2], wallH + 6, s[3]));
    }
  };

  /* ------------------------------------------------------------- committing */

  World.prototype._commitTrees = function (trees) {
    if (!trees.length) return;
    var trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 3.2, 5);
    trunkGeo.translate(0, 1.6, 0);
    var leafGeo = new THREE.ConeGeometry(1.9, 4.2, 6);
    leafGeo.translate(0, 4.6, 0);

    var trunk = new THREE.InstancedMesh(trunkGeo,
      new THREE.MeshLambertMaterial({ color: 0x6b4c31 }), trees.length);
    var leaf = new THREE.InstancedMesh(leafGeo,
      new THREE.MeshLambertMaterial({ color: 0x2f6b34 }), trees.length);

    var m = new THREE.Matrix4(), q = new THREE.Quaternion();
    var pos = new THREE.Vector3(), scl = new THREE.Vector3();
    var col = new THREE.Color();
    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      pos.set(t.x, t.y, t.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      scl.set(t.s, t.s * U.rand(0.9, 1.3), t.s);
      m.compose(pos, q, scl);
      trunk.setMatrixAt(i, m);
      leaf.setMatrixAt(i, m);
      col.setHSL(0.30 + U.rand(-0.04, 0.04), 0.42, 0.24 + U.rand(-0.05, 0.06));
      leaf.setColorAt(i, col);
    }
    trunk.instanceMatrix.needsUpdate = true;
    leaf.instanceMatrix.needsUpdate = true;
    if (leaf.instanceColor) leaf.instanceColor.needsUpdate = true;
    this.group.add(trunk);
    this.group.add(leaf);
  };

  World.prototype._commit = function () {
    var n = this.boxes.length;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0); // pivot at the base, matching collider convention
    var mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), n);
    mesh.castShadow = this.quality.shadows;
    mesh.receiveShadow = this.quality.shadows;

    var m = new THREE.Matrix4(), col = new THREE.Color();
    for (var i = 0; i < n; i++) {
      var b = this.boxes[i];
      m.makeScale(b.sx, b.sy, b.sz);
      m.setPosition(b.cx, b.cy, b.cz);
      mesh.setMatrixAt(i, m);
      col.setHex(b.color);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
    this.staticMesh = mesh;

    this._rebuildGrid();
  };

  /* ------------------------------------------------------------- broadphase */

  World.prototype._rebuildGrid = function () {
    this._grid = {};
    for (var i = 0; i < this.colliders.length; i++) this._index(this.colliders[i]);
  };

  World.prototype._index = function (box) {
    var x0 = Math.floor(box.minX / CELL), x1 = Math.floor(box.maxX / CELL);
    var z0 = Math.floor(box.minZ / CELL), z1 = Math.floor(box.maxZ / CELL);
    for (var x = x0; x <= x1; x++) {
      for (var z = z0; z <= z1; z++) {
        var k = x + ':' + z;
        (this._grid[k] || (this._grid[k] = [])).push(box);
      }
    }
  };

  World.prototype.addCollider = function (box) {
    this.colliders.push(box);
    this._index(box);
    return box;
  };

  World.prototype.removeCollider = function (box) {
    var i = this.colliders.indexOf(box);
    if (i >= 0) this.colliders.splice(i, 1);
    this._rebuildGrid();
  };

  /* Colliders whose cell overlaps the circle. */
  World.prototype.near = function (x, z, r, out) {
    out.length = 0;
    var x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    var z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    this._stamp++;
    for (var cx = x0; cx <= x1; cx++) {
      for (var cz = z0; cz <= z1; cz++) {
        var bucket = this._grid[cx + ':' + cz];
        if (!bucket) continue;
        for (var i = 0; i < bucket.length; i++) {
          var b = bucket[i];
          if (b._s === this._stamp) continue;
          b._s = this._stamp;
          out.push(b);
        }
      }
    }
    return out;
  };

  /* Nearest static hit along a ray. Returns distance or -1. */
  World.prototype.rayHit = function (ox, oy, oz, dx, dy, dz, maxDist) {
    var best = -1;
    this.lastHitBox = null;
    var steps = Math.ceil(maxDist / CELL) + 1;
    this._stamp++;
    for (var s = 0; s <= steps; s++) {
      var t = Math.min(maxDist, s * CELL);
      var px = ox + dx * t, pz = oz + dz * t;
      var cx0 = Math.floor((px - CELL) / CELL), cx1 = Math.floor((px + CELL) / CELL);
      var cz0 = Math.floor((pz - CELL) / CELL), cz1 = Math.floor((pz + CELL) / CELL);
      for (var cx = cx0; cx <= cx1; cx++) {
        for (var cz = cz0; cz <= cz1; cz++) {
          var bucket = this._grid[cx + ':' + cz];
          if (!bucket) continue;
          for (var i = 0; i < bucket.length; i++) {
            var b = bucket[i];
            if (b._r === this._stamp) continue;
            b._r = this._stamp;
            var d = U.rayBox(ox, oy, oz, dx, dy, dz, b);
            if (d >= 0 && d <= maxDist && (best < 0 || d < best)) { best = d; this.lastHitBox = b; }
          }
        }
      }
      if (best >= 0 && best <= (s + 1) * CELL) break; // nothing closer can appear later
    }
    return best;
  };

  World.prototype.losClear = function (ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.001) return true;
    var hit = this.rayHit(ax, ay, az, dx / len, dy / len, dz / len, len - 0.4);
    return hit < 0;
  };

  /* Highest walkable surface under a capsule at (x,z) that is not above feetY. */
  World.prototype.groundAt = function (x, z, feetY, radius) {
    var g = U.terrainHeight(x, z);
    if (feetY === undefined) return g;
    var r = radius || 0.42;
    var list = this.near(x, z, r + 0.5, this._tmpNear || (this._tmpNear = []));
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!U.circleBoxOverlap(x, z, r, b)) continue;
      if (b.maxY <= feetY + 0.35 && b.maxY > g) g = b.maxY;
    }
    return g;
  };

  World.prototype.poiAt = function (x, z) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < this.pois.length; i++) {
      var d = U.dist2D(x, z, this.pois[i].x, this.pois[i].z);
      if (d < bestD) { bestD = d; best = this.pois[i]; }
    }
    return bestD < 45 ? best.name : null;
  };

  FF.World = World;
})(window);
