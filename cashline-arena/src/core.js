/* ================= CASHLINE CORE =================
   Pure logic: no DOM, no THREE. Shared by host and clients.
   Voxel world, physics, raycasts, weapons, host match sim, bots. */
var CL = (function () {
  'use strict';
  var W = 96, D = 96, H = 16, N = W * D * H;
  var CHX = W >> 4, CHZ = D >> 4; // 16x16 render chunks
  function idx(x, y, z) { return (y * D + z) * W + x; }
  function unidx(i) { var x = i % W, r = (i - x) / W, z = r % D, y = (r - z) / D; return [x, y, z]; }

  // ---------- materials ----------
  var MAT = [
    null,
    { n: 'floor', hp: 0, col: [0.15, 0.16, 0.25] },
    { n: 'concrete', hp: 90, col: [0.56, 0.58, 0.68] },
    { n: 'panelA', hp: 45, col: [0.96, 0.33, 0.42] },
    { n: 'panelB', hp: 45, col: [0.25, 0.70, 0.86] },
    { n: 'glass', hp: 6, col: [0.72, 0.9, 1.0], glass: true },
    { n: 'steel', hp: 0, col: [0.11, 0.12, 0.2] },
    { n: 'crate', hp: 28, col: [0.86, 0.64, 0.30] },
    { n: 'trim', hp: 0, col: [1.0, 0.78, 0.28] },
    { n: 'panelC', hp: 45, col: [0.55, 0.40, 0.90] }
  ];

  // ---------- seeded rng ----------
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // ---------- world ----------
  function World() {
    this.c = new Uint8Array(N);
    this.hp = new Uint8Array(N);
    this.dirty = {};      // chunk keys needing remesh
    this.navVer = 0;      // bumps when ground layer changes
    this.onDestroy = null; // (x,y,z,mat) -> FX hook
  }
  World.prototype.get = function (x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < 0) return 6;
    if (y >= H) return 0;
    if (x < 0 || z < 0 || x >= W || z >= D) return 6;
    return this.c[idx(x, y, z)];
  };
  World.prototype.solid = function (x, y, z) { return this.get(x, y, z) !== 0; };
  World.prototype.markDirty = function (x, y, z) {
    var cx = x >> 4, cy = y >> 4, cz = z >> 4;
    this.dirty[cx + ',' + cy + ',' + cz] = 1;
    if ((x & 15) === 0 && cx > 0) this.dirty[(cx - 1) + ',' + cy + ',' + cz] = 1;
    if ((x & 15) === 15 && cx < CHX - 1) this.dirty[(cx + 1) + ',' + cy + ',' + cz] = 1;
    if ((z & 15) === 0 && cz > 0) this.dirty[cx + ',' + cy + ',' + (cz - 1)] = 1;
    if ((z & 15) === 15 && cz < CHZ - 1) this.dirty[cx + ',' + cy + ',' + (cz + 1)] = 1;
  };
  World.prototype.set = function (x, y, z, m) {
    if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return;
    var i = idx(x, y, z);
    this.c[i] = m; this.hp[i] = m ? MAT[m].hp : 0;
  };
  World.prototype.box = function (x0, y0, z0, x1, y1, z1, m) {
    for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) for (var x = x0; x <= x1; x++) this.set(x, y, z, m);
  };
  // destroy one cell if destructible. returns material or 0
  World.prototype.destroyIdx = function (i) {
    var m = this.c[i];
    if (!m || !MAT[m].hp) return 0;
    this.c[i] = 0; this.hp[i] = 0;
    var p = unidx(i);
    this.markDirty(p[0], p[1], p[2]);
    if (p[1] <= 3) this.navVer++;
    if (this.onDestroy) this.onDestroy(p[0], p[1], p[2], m);
    return m;
  };
  // damage, returns true if destroyed
  World.prototype.damageIdx = function (i, d) {
    var m = this.c[i];
    if (!m || !MAT[m].hp) return false;
    var h = this.hp[i] - d;
    if (h <= 0) { this.destroyIdx(i); return true; }
    this.hp[i] = h; return false;
  };
  World.prototype.carve = function (cx, cy, cz, r) {
    var n = 0, r2 = r * r;
    for (var y = Math.max(1, Math.floor(cy - r)); y <= Math.min(H - 1, Math.floor(cy + r)); y++)
      for (var z = Math.max(0, Math.floor(cz - r)); z <= Math.min(D - 1, Math.floor(cz + r)); z++)
        for (var x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.floor(cx + r)); x++) {
          var dx = x + 0.5 - cx, dy = y + 0.5 - cy, dz = z + 0.5 - cz;
          if (dx * dx + dy * dy + dz * dz <= r2) { if (this.destroyIdx(idx(x, y, z))) n++; }
        }
    return n;
  };
  World.prototype.applyOp = function (op) {
    if (typeof op === 'number') { this.destroyIdx(op); return null; }
    // sphere op: [x*10, y*10, z*10, r*10, key, kind]
    this.carve(op[0] / 10, op[1] / 10, op[2] / 10, op[3] / 10);
    return op;
  };

  // ---------- map: "Studio Plaza" (96 x 96) ----------
  // Layout is point-symmetric around the centre, so both sides of a 2-team match get the same terrain.
  var CX = W / 2, CZ = D / 2;
  var MAP = {
    name: 'Studio Plaza', th: 'สตูดิโอพลาซ่า',
    vaults: [], stations: [], spawns: [], pspawns: []
  };
  function mirBox(b) { return [W - 1 - b[2], D - 1 - b[3], W - 1 - b[0], D - 1 - b[1]]; }
  // floors: 2 or 3 storeys (4 blocks each). doors: 'n','s','e','w'.
  function building(w, x0, z0, bw, bd, floors, palette, doorSides) {
    var x1 = x0 + bw - 1, z1 = z0 + bd - 1, top = floors * 4, x, z, y, k;
    for (y = 1; y <= top; y++) {
      for (x = x0; x <= x1; x++) { w.set(x, y, z0, 2); w.set(x, y, z1, 2); }
      for (z = z0; z <= z1; z++) { w.set(x0, y, z, 2); w.set(x1, y, z, 2); }
    }
    for (var f = 1; f <= floors; f++) {
      var yb = f * 4, band = f === floors ? 8 : palette;
      for (x = x0; x <= x1; x++) { w.set(x, yb, z0, band); w.set(x, yb, z1, band); }
      for (z = z0; z <= z1; z++) { w.set(x0, yb, z, band); w.set(x1, yb, z, band); }
      w.box(x0 + 1, yb, z0 + 1, x1 - 1, yb, z1 - 1, 2); // slab / roof
      var wy = yb - 2; // windows on every storey
      for (x = x0 + 2; x <= x1 - 2; x += 3) { w.set(x, wy, z0, 5); w.set(x, wy, z1, 5); if (f > 1) { w.set(x + 1, wy, z0, 5); w.set(x + 1, wy, z1, 5); } }
      for (z = z0 + 2; z <= z1 - 2; z += 3) { w.set(x0, wy, z, 5); w.set(x1, wy, z, 5); }
    }
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(function (p) { for (var yy = 1; yy <= top; yy++) w.set(p[0], yy, p[1], 6); });
    var mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    doorSides.forEach(function (sd) {
      for (var yy = 1; yy <= 3; yy++) for (var kk = 0; kk < 2; kk++) {
        if (sd === 'n') w.set(x1 - 3 + kk, yy, z0, 0);   // north door sits east of the stairs
        if (sd === 's') w.set(mx + kk, yy, z1, 0);
        if (sd === 'w') w.set(x0, yy, mz + kk, 0);
        if (sd === 'e') w.set(x1, yy, mz + kk, 0);
      }
    });
    // flight 1: ground -> floor 2, along the north wall, rising +x
    for (k = 1; k <= 4; k++) {
      var sx = x0 + 1 + k;
      for (y = 1; y <= k; y++) { w.set(sx, y, z0 + 1, 2); w.set(sx, y, z0 + 2, 2); }
      if (k <= 3) { w.set(sx, 4, z0 + 1, 0); w.set(sx, 4, z0 + 2, 0); if (k >= 2) { w.set(sx - 1, 4, z0 + 1, 0); w.set(sx - 1, 4, z0 + 2, 0); } }
    }
    // flight 2: floor 2 -> floor 3, along the south wall, rising -x
    if (floors >= 3) for (k = 1; k <= 4; k++) {
      var sx2 = x1 - 1 - k;
      for (y = 5; y <= 4 + k; y++) { w.set(sx2, y, z1 - 1, 2); w.set(sx2, y, z1 - 2, 2); }
      if (k <= 3) { w.set(sx2, 8, z1 - 1, 0); w.set(sx2, 8, z1 - 2, 0); if (k >= 2) { w.set(sx2 + 1, 8, z1 - 1, 0); w.set(sx2 + 1, 8, z1 - 2, 0); } }
    }
    w.box(x0 + 3, 1, z1 - 3, x0 + 4, 1, z1 - 3, 7);
    w.box(x1 - 4, 5, z0 + 4, x1 - 3, 5, z0 + 4, 7);
    if (floors >= 3) w.box(x0 + 3, 9, z0 + 4, x0 + 4, 9, z0 + 4, 7);
    return [mx + 0.5, 1, mz + 0.5];
  }
  // building given in the north/west half; its point-mirror is built too
  function buildingPair(w, x0, z0, bw, bd, floors, pal, palM, doors) {
    var flip = { n: 's', s: 'n', e: 'w', w: 'e' };
    var a = building(w, x0, z0, bw, bd, floors, pal, doors);
    var b = building(w, W - x0 - bw, D - z0 - bd, bw, bd, floors, palM, doors.map(function (d) { return flip[d]; }));
    return [a, b];
  }
  function genMap(w, mode) {
    w.c.fill(0); w.hp.fill(0);
    var y, i;
    w.box(0, 0, 0, W - 1, 0, D - 1, 1);
    for (y = 1; y <= 6; y++) for (i = 0; i < W; i++) { w.set(i, y, 0, 6); w.set(i, y, D - 1, 6); }
    for (y = 1; y <= 6; y++) for (i = 0; i < D; i++) { w.set(0, y, i, 6); w.set(W - 1, y, i, 6); }
    for (i = 0; i < W; i++) { w.set(i, 7, 0, 8); w.set(i, 7, D - 1, 8); }
    for (i = 0; i < D; i++) { w.set(0, 7, i, 8); w.set(W - 1, 7, i, 8); }
    MAP.vaults = [];
    var add = function (pair) { MAP.vaults.push(pair[0], pair[1]); };
    // corner blocks (2 storeys)
    add(buildingPair(w, 6, 6, 15, 12, 2, 3, 4, ['s', 'e']));      // NW <-> SE
    add(buildingPair(w, 75, 6, 15, 12, 2, 9, 3, ['s', 'w']));     // NE <-> SW
    // towers north/south (3 storeys)
    add(buildingPair(w, 41, 6, 14, 13, 3, 4, 9, ['s', 'e', 'w'])); // N <-> S
    // side halls west/east (2 storeys), kept clear of the centre lane
    add(buildingPair(w, 6, 28, 12, 10, 2, 9, 4, ['e', 's']));      // W1 <-> E2
    add(buildingPair(w, 6, 58, 12, 10, 2, 3, 9, ['e', 'n']));      // W2 <-> E1
    // sky bridges at floor-2 level: NW block -> N tower, mirrored S tower -> SE block
    [[21, 10, 40, 11]].forEach(function (b) {
      [b, mirBox(b)].forEach(function (bb) {
        w.box(bb[0], 4, bb[1], bb[2], 4, bb[3], 2);
        for (var x = bb[0]; x <= bb[2]; x++) { w.set(x, 5, bb[1] - 1, 5); w.set(x, 5, bb[3] + 1, 5); }
        w.box(bb[0] - 1, 5, bb[1], bb[0] - 1, 7, bb[3], 0); // doorway into the west building
        w.box(bb[2] + 1, 5, bb[1], bb[2] + 1, 7, bb[3], 0); // doorway into the east building
      });
    });
    // kiosks along the north/south strips (roofed, walk-through)
    [[26, 6, 33, 12], [60, 6, 67, 12]].forEach(function (b) {
      [b, mirBox(b)].forEach(function (k) {
        w.box(k[0], 1, k[1], k[2], 3, k[1], 2); w.box(k[0], 1, k[3], k[2], 3, k[3], 2);
        w.box(k[0], 4, k[1], k[2], 4, k[3], k[1] < CZ ? 4 : 3);
        w.box(k[0] + 3, 1, k[3], k[0] + 4, 3, k[3], 0); // opening
        w.box(k[0] + 3, 1, k[1], k[0] + 4, 3, k[1], 0);
      });
    });
    // centre stage
    var s0 = CX - 9, s1 = CX + 8;
    w.box(s0, 1, s0, s1, 1, s1, 2);
    w.box(s0, 1, s0, s1, 1, s0, 8); w.box(s0, 1, s1, s1, 1, s1, 8);
    [[s0 + 2, s0 + 2, s0 + 3, s0 + 3]].forEach(function (b) { [b, mirBox(b)].forEach(function (bb) { w.box(bb[0], 2, bb[1], bb[2], 3, bb[3], 7); }); });
    w.box(CX - 2, 2, CZ - 1, CX + 1, 2, CZ, 4);
    [[CX - 1, s0 + 1, CX, s0 + 1]].forEach(function (b) { [b, mirBox(b)].forEach(function (bb) { w.box(bb[0], 2, bb[1], bb[2], 4, bb[3], 3); }); });
    // low cover walls and crates in the plaza (each mirrored)
    [[22, 22, 26, 22], [22, 42, 22, 44], [34, 30, 37, 30], [60, 24, 63, 24], [26, 58, 26, 61], [30, 36, 30, 38], [64, 40, 64, 43]].forEach(function (b) {
      [b, mirBox(b)].forEach(function (bb) { w.box(bb[0], 1, bb[1], bb[2], 2, bb[3], 2); });
    });
    [[33, 22], [61, 30], [25, 36], [36, 62], [45, 30], [20, 50], [70, 44]].forEach(function (c) {
      [[c[0], c[1]], [W - 2 - c[0], D - 2 - c[1]]].forEach(function (cc) { w.box(cc[0], 1, cc[1], cc[0] + 1, 1, cc[1] + 1, 7); w.set(cc[0], 2, cc[1], 7); });
    });
    MAP.stations = [[48.5, 1, 26.5], [47.5, 1, 69.5], [28.5, 1, 47.5], [67.5, 1, 48.5], [30.5, 1, 22.5], [65.5, 1, 73.5], [66.5, 1, 22.5], [29.5, 1, 73.5]];
    if (mode !== 'push') MAP.stations.forEach(function (st) { w.box(Math.floor(st[0]) - 1, 1, Math.floor(st[2]) - 1, Math.floor(st[0]) + 1, 3, Math.floor(st[2]) + 1, 0); });
    var lz = Math.floor(PUSH.z);
    MAP.pspawns = [
      [[W - 3.5, 1, lz - 7.5], [W - 3.5, 1, lz + 8.5], [W - 3.5, 1, lz - 11.5], [W - 3.5, 1, lz + 12.5]],
      [[3.5, 1, lz + 8.5], [3.5, 1, lz - 7.5], [3.5, 1, lz + 12.5], [3.5, 1, lz - 11.5]]
    ];
    if (mode === 'push') {
      // rail lane straight through the plaza and stage
      w.box(2, 1, lz - 2, W - 3, 4, lz + 2, 0);
      for (var rx = 2; rx < W - 2; rx++) { w.set(rx, 0, lz - 2, 8); w.set(rx, 0, lz + 2, 8); w.set(rx, 0, lz, 6); }
      var g0 = Math.round(PUSH.cx - PUSH.half - 2.5), g1 = Math.round(PUSH.cx + PUSH.half + 1.5);
      [g0, g1].forEach(function (gx) { w.box(gx, 1, lz - 3, gx, 5, lz - 3, 6); w.box(gx, 1, lz + 3, gx, 5, lz + 3, 6); w.box(gx, 6, lz - 3, gx, 6, lz + 3, 8); });
      [[22, lz - 4, 24, lz - 4], [36, lz + 4, 38, lz + 4], [12, lz + 4, 14, lz + 4]].forEach(function (b) {
        [b, mirBox(b)].forEach(function (bb) { w.box(bb[0], 1, bb[1], bb[2], 2, bb[3], 2); });
      });
    }
    MAP.spawns = [
      [3.5, 1, 47.5], [30.5, 1, 3.5], [65.5, 1, 92.5], [92.5, 1, 48.5], [3.5, 1, 22.5], [24.5, 1, 24.5], [47.5, 1, 3.5], [92.5, 1, 73.5],
      [71.5, 1, 71.5], [48.5, 1, 92.5], [3.5, 1, 73.5], [92.5, 1, 22.5], [65.5, 1, 3.5], [30.5, 1, 92.5], [71.5, 1, 24.5], [24.5, 1, 71.5]
    ];
    w.dirty = {};
    for (var cx = 0; cx < (W >> 4); cx++) for (var cz = 0; cz < (D >> 4); cz++) w.dirty[cx + ',0,' + cz] = 1;
    w.navVer++;
  }

  // ---------- physics ----------
  var GRAV = 22;
  function collides(w, x, y, z, hw, h) {
    var x0 = Math.floor(x - hw), x1 = Math.floor(x + hw - 1e-4), y0 = Math.floor(y), y1 = Math.floor(y + h - 1e-4), z0 = Math.floor(z - hw), z1 = Math.floor(z + hw - 1e-4);
    for (var yy = y0; yy <= y1; yy++) for (var zz = z0; zz <= z1; zz++) for (var xx = x0; xx <= x1; xx++) if (w.solid(xx, yy, zz)) return true;
    return false;
  }
  // b: {x,y,z,vx,vy,vz,hw,h,onGround}
  function moveBody(w, b, dt) {
    var steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy), Math.abs(b.vz)) * dt / 0.35));
    var sdt = dt / steps, stepped = 0;
    for (var s = 0; s < steps; s++) {
      b.vy -= GRAV * sdt; if (b.vy < -40) b.vy = -40;
      var ny = b.y + b.vy * sdt;
      if (collides(w, b.x, ny, b.z, b.hw, b.h)) {
        if (b.vy < 0) { b.y = Math.floor(ny) + 1; b.onGround = true; }
        else { b.y = Math.floor(ny + b.h) - b.h - 0.001; }
        b.vy = 0;
      } else { b.y = ny; b.onGround = false; }
      // horizontal axes
      var axes = ['x', 'z'];
      for (var a = 0; a < 2; a++) {
        var ax = axes[a], v = ax === 'x' ? b.vx : b.vz;
        if (!v) continue;
        var nx = ax === 'x' ? b.x + v * sdt : b.x, nz = ax === 'z' ? b.z + v * sdt : b.z;
        if (!collides(w, nx, b.y, nz, b.hw, b.h)) { b.x = nx; b.z = nz; continue; }
        // step up one block
        var ly = Math.floor(b.y + 0.001) + 1;
        if ((b.onGround || b.vy <= 0 && b.wasGround) && ly - b.y <= 1.05 && !collides(w, b.x, ly, b.z, b.hw, b.h) && !collides(w, nx, ly, nz, b.hw, b.h)) {
          stepped += ly - b.y; b.y = ly; b.x = nx; b.z = nz; continue;
        }
        if (ax === 'x') { b.x = v > 0 ? Math.floor(nx + b.hw) - b.hw - 0.001 : Math.floor(nx - b.hw) + 1 + b.hw + 0.001; b.vx = 0; b.hitWall = true; }
        else { b.z = v > 0 ? Math.floor(nz + b.hw) - b.hw - 0.001 : Math.floor(nz - b.hw) + 1 + b.hw + 0.001; b.vz = 0; b.hitWall = true; }
      }
      if (!b.onGround && b.vy <= 0 && collides(w, b.x, b.y - 0.02, b.z, b.hw, b.h)) b.onGround = true;
      b.wasGround = b.onGround;
    }
    return stepped;
  }

  // ---------- rays ----------
  function rayVoxel(w, ox, oy, oz, dx, dy, dz, maxD) {
    var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    var tdx = dx ? Math.abs(1 / dx) : 1e9, tdy = dy ? Math.abs(1 / dy) : 1e9, tdz = dz ? Math.abs(1 / dz) : 1e9;
    var tmx = dx ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : 1e9;
    var tmy = dy ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : 1e9;
    var tmz = dz ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : 1e9;
    var t = 0, nx = 0, ny = 0, nz = 0;
    for (var i = 0; i < 400; i++) {
      if (y >= H && dy >= 0) return null;
      var m = w.get(x, y, z);
      if (m) return { t: t, x: x, y: y, z: z, nx: nx, ny: ny, nz: nz, m: m };
      if (tmx < tmy && tmx < tmz) { t = tmx; tmx += tdx; x += sx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { t = tmy; tmy += tdy; y += sy; nx = 0; ny = -sy; nz = 0; }
      else { t = tmz; tmz += tdz; z += sz; nx = 0; ny = 0; nz = -sz; }
      if (t > maxD) return null;
    }
    return null;
  }
  function rayAABB(ox, oy, oz, dx, dy, dz, minx, miny, minz, maxx, maxy, maxz) {
    var t0 = 0, t1 = 1e9, o = [ox, oy, oz], d = [dx, dy, dz], mn = [minx, miny, minz], mx = [maxx, maxy, maxz];
    for (var a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < mn[a] || o[a] > mx[a]) return -1; continue; }
      var inv = 1 / d[a], ta = (mn[a] - o[a]) * inv, tb = (mx[a] - o[a]) * inv;
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
      if (t0 > t1) return -1;
    }
    return t0;
  }
  function losClear(w, ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 0.01) return true;
    var h = rayVoxel(w, ax, ay, az, dx / L, dy / L, dz / L, L);
    return !h || h.t >= L - 0.05;
  }
  function dirFrom(yaw, pitch) { var cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; }

  // ---------- classes & weapons ----------
  var WEAPONS = [
    { id: 'smg', th: 'ปืนกลมือ VX-9', dmg: 12, iv: 0.068, mag: 32, rl: 1.7, sp: 0.03, ads: 0.012, rng: 40, fo: 15, blk: 4, auto: 1, pel: 1, kick: 0.012 },
    { id: 'dmr', th: 'ไรเฟิลซุ่ม LR-2', dmg: 42, iv: 0.3, mag: 12, rl: 2.2, sp: 0.02, ads: 0.0015, rng: 90, fo: 50, blk: 10, auto: 0, pel: 1, kick: 0.045, zoom: 2.2 },
    { id: 'ar', th: 'ไรเฟิล AK-R', dmg: 17, iv: 0.1, mag: 30, rl: 2.0, sp: 0.024, ads: 0.006, rng: 60, fo: 25, blk: 6, auto: 1, pel: 1, kick: 0.018 },
    { id: 'sg', th: 'ลูกซอง PUMP-8', dmg: 11, iv: 0.85, mag: 6, rl: 2.6, sp: 0.08, ads: 0.06, rng: 22, fo: 8, blk: 5, auto: 0, pel: 9, kick: 0.06 },
    { id: 'lmg', th: 'ปืนกล HVY-70', dmg: 15, iv: 0.085, mag: 70, rl: 3.2, sp: 0.035, ads: 0.012, rng: 55, fo: 22, blk: 7, auto: 1, pel: 1, kick: 0.016 },
    { id: 'hammer', th: 'ค้อนยักษ์', dmg: 95, iv: 0.85, mag: 0, rl: 0, sp: 0, rng: 2.8, fo: 99, blk: 120, auto: 1, pel: 0, melee: 1, kick: 0.1 },
    { id: 'frag', th: 'ระเบิดมือ', gadget: 1 }, { id: 'breach', th: 'ระเบิดเจาะ', gadget: 1 }, { id: 'rpg', th: 'จรวด RPG', gadget: 1 },
    { id: 'charge', th: 'ชาร์จพุ่งชน', gadget: 1 }, { id: 'fall', th: 'ตกฉาก', gadget: 1 }
  ];
  var WI = {}; WEAPONS.forEach(function (w, i) { WI[w.id] = i; });
  var CLASSES = {
    light: { th: 'ไลท์', en: 'LIGHT', hp: 150, spd: 7.3, wpns: ['smg', 'dmr'], gad: 'frag', gadN: 2, gadCd: 14, spec: 'dash', specCd: 4.5, hw: 0.28, desc: 'เร็ว ตัวเล็ก เลือดน้อย พุ่งหลบได้' },
    medium: { th: 'มีเดียม', en: 'MEDIUM', hp: 250, spd: 6.3, wpns: ['ar', 'sg'], gad: 'breach', gadN: 2, gadCd: 16, spec: 'heal', specCd: 12, hw: 0.32, desc: 'สมดุล ระเบิดเจาะกำแพง ฮีลทีม' },
    heavy: { th: 'เฮฟวี่', en: 'HEAVY', hp: 350, spd: 5.4, wpns: ['lmg', 'hammer'], gad: 'rpg', gadN: 1, gadCd: 18, spec: 'charge', specCd: 10, hw: 0.36, desc: 'ถึก พังกำแพงเก่ง ชาร์จทะลวง' }
  };
  var SPECS = { dash: { th: 'พุ่งหลบ (Dash)' }, heal: { th: 'คลื่นฮีล' }, charge: { th: 'ชาร์จพุ่งชน' } };
  var GADGETS = {
    frag: { r: 3.2, dmg: 110, carve: 1.6, fuse: 1.6, spd: 15, grav: 1, bounce: 1 },
    breach: { r: 3.4, dmg: 85, carve: 2.9, fuse: 1.6, spd: 12, grav: 1, stick: 1 },
    rpg: { r: 3.6, dmg: 125, carve: 2.4, fuse: 6, spd: 30, grav: 0, impact: 1 }
  };
  var TEAMS = [
    { n: 'VOLT', th: 'ทีมโวลต์', col: '#ffd23f', hex: 0xffd23f },
    { n: 'TIDE', th: 'ทีมไทด์', col: '#35d0f5', hex: 0x35d0f5 },
    { n: 'EMBER', th: 'ทีมแอมเบอร์', col: '#ff5a5f', hex: 0xff5a5f },
    { n: 'BLOOM', th: 'ทีมบลูม', col: '#c77dff', hex: 0xc77dff }
  ];
  var FORMATS = {
    '1v1v1': { teams: 3, size: 1, th: '1 vs 1 vs 1' },
    '1v1v1v1': { teams: 4, size: 1, th: '1 vs 1 vs 1 vs 1' },
    '2v2': { teams: 2, size: 2, th: '2 vs 2' },
    '1v1': { teams: 2, size: 1, th: '1 vs 1' }
  };
  function slotTeam(fmt, s) { return Math.floor(s / FORMATS[fmt].size); }
  function slotCount(fmt) { return FORMATS[fmt].teams * FORMATS[fmt].size; }
  var MODES = {
    cash: { fmts: ['1v1v1', '1v1v1v1', '2v2'], def: '1v1v1' },
    push: { fmts: ['2v2', '1v1'], def: '2v2' }
  };
  // Platform Push: p runs -1..1 along x; team 0 pushes toward p=-1 (west), team 1 toward p=+1 (east)
  var PUSH = { time: 420, speed: 0.65, extra: 0.18, half: W / 2 - 8.5, cx: W / 2, z: D / 2 + 0.5, rad: 1.9 };
  var RULES = { cashValue: 10000, winCash: 20000, matchTime: 480, cashTime: 40, vaultTime: 2.2, depositTime: 1.0, stealTime: 3.2, respawn: 8, regenDelay: 6, regenRate: 30, interTime: 8 };
  // Playable characters (visuals live in client.js CHAR_VIS, keyed by id). Rename here.
  var CHARS = [
    { id: 'bob', th: 'บ๊อบ' }, { id: 'rock', th: 'ร็อกเกอร์' }, { id: 'sock', th: 'ถุงเท้า' }, { id: 'specs', th: 'พี่แว่น' },
    { id: 'smile', th: 'ยิ้มหวาน' }, { id: 'polo', th: 'สตาฟ' }, { id: 'grey', th: 'หนุ่มเทา' }, { id: 'pine', th: 'สับปะรด' }
  ];
  var CHI = {}; CHARS.forEach(function (c, i) { CHI[c.id] = i; });
  // death styles: 0 launched + bouncing, 1 explodes into pieces, 2 home run, 3 rocket to the sky
  var DEATH = { FLY: 0, BOOM: 1, HOMERUN: 2, ROCKET: 3 };
  var BOTNAMES = ['บอท-ปลาทู', 'บอท-ตุ๊กตุ๊ก', 'บอท-ส้มตำ', 'บอท-มะม่วง', 'บอท-กะเพรา', 'บอท-ช้างศึก'];

  // ---------- hitboxes ----------
  function bodyBox(p) { var hw = p.hw || 0.32, h = p.cr ? 1.15 : 1.45; return [p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw]; }
  // chibi characters have big heads, so the head hitbox is generous
  function headBox(p) { var hy = p.y + (p.cr ? 1.32 : 1.62); return [p.x - 0.25, hy - 0.24, p.z - 0.25, p.x + 0.25, hy + 0.24, p.z + 0.25]; }

  // fire a hitscan weapon. targets: [{slot,x,y,z,cr,hw,alive,team}]
  // returns {tracers:[[x,y,z]], hits:[[slot,dmg,head]], blocks:[[idx,dmg,x,y,z,nx,ny,nz]]}
  function fireHitscan(w, wd, ox, oy, oz, yaw, pitch, spread, targets, myTeam, mySlot, R) {
    var out = { tracers: [], hits: [], blocks: [] };
    var pel = wd.pel || 1, bySlot = {};
    for (var p = 0; p < pel; p++) {
      var yy = yaw + (R() - 0.5) * 2 * spread, pp = pitch + (R() - 0.5) * 2 * spread;
      var d = dirFrom(yy, pp);
      var hv = rayVoxel(w, ox, oy, oz, d[0], d[1], d[2], wd.rng);
      var tw = hv ? hv.t : wd.rng, best = -1, bt = tw, head = false;
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t.alive || t.slot === mySlot || t.team === myTeam) continue;
        var hb = headBox(t), th = rayAABB(ox, oy, oz, d[0], d[1], d[2], hb[0], hb[1], hb[2], hb[3], hb[4], hb[5]);
        if (th >= 0 && th < bt) { bt = th; best = t.slot; head = true; }
        var bb = bodyBox(t), tb = rayAABB(ox, oy, oz, d[0], d[1], d[2], bb[0], bb[1], bb[2], bb[3], bb[4], bb[5]);
        if (tb >= 0 && tb < bt) { bt = tb; best = t.slot; head = false; }
      }
      out.tracers.push([ox + d[0] * bt, oy + d[1] * bt, oz + d[2] * bt]);
      if (best >= 0) {
        var dmg = wd.dmg;
        if (bt > wd.fo) dmg *= Math.max(0.55, 1 - 0.45 * (bt - wd.fo) / Math.max(1, wd.rng - wd.fo));
        if (head) dmg *= wd.pel > 1 ? 1.25 : 1.5;
        bySlot[best] = bySlot[best] || [0, false]; bySlot[best][0] += dmg; bySlot[best][1] = bySlot[best][1] || head;
      } else if (hv && MAT[hv.m].hp) {
        out.blocks.push([idx(hv.x, hv.y, hv.z), wd.blk, hv.x, hv.y, hv.z, hv.nx, hv.ny, hv.nz]);
      } else if (hv) {
        out.blocks.push([-1, 0, hv.x, hv.y, hv.z, hv.nx, hv.ny, hv.nz]);
      }
    }
    for (var k in bySlot) out.hits.push([+k, Math.round(bySlot[k][0]), bySlot[k][1]]);
    return out;
  }
  function fireMelee(w, wd, ox, oy, oz, yaw, pitch, targets, myTeam, mySlot) {
    var out = { tracers: [], hits: [], blocks: [] };
    var d = dirFrom(yaw, pitch);
    var best = -1, bd = 1e9;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t.alive || t.slot === mySlot || t.team === myTeam) continue;
      var cx = t.x - ox, cy = t.y + 0.9 - oy, cz = t.z - oz, L = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (L > wd.rng + 0.4) continue;
      var dot = (cx * d[0] + cy * d[1] + cz * d[2]) / Math.max(0.01, L);
      if (dot > 0.72 && L < bd && losClear(w, ox, oy, oz, t.x, t.y + 1, t.z)) { bd = L; best = t.slot; }
    }
    if (best >= 0) out.hits.push([best, wd.dmg, false]);
    var hv = rayVoxel(w, ox, oy, oz, d[0], d[1], d[2], wd.rng);
    if (hv) {
      // smash a 3x3 patch on the hit face
      var ax = hv.nx ? 0 : 1, ay = hv.ny ? 0 : 1, az = hv.nz ? 0 : 1;
      for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
        var x = hv.x, y = hv.y, z = hv.z;
        if (!ax) { y += a; z += b; } else if (!ay) { x += a; z += b; } else { x += a; y += b; }
        var m = w.get(x, y, z);
        if (m && MAT[m].hp && y > 0 && x >= 0 && z >= 0 && x < W && z < D && y < H) out.blocks.push([idx(x, y, z), (a || b) ? 70 : wd.blk, x, y, z, hv.nx, hv.ny, hv.nz]);
      }
      if (!out.blocks.length) out.blocks.push([-1, 0, hv.x, hv.y, hv.z, hv.nx, hv.ny, hv.nz]);
    }
    return out;
  }

  // ---------- projectiles (host-simulated) ----------
  function stepProjectile(w, pj, dt, targets) {
    var g = GADGETS[pj.k];
    pj.age += dt;
    if (pj.stuck) { return pj.age >= pj.fuse; }
    if (g.grav) pj.vy -= GRAV * 0.75 * dt;
    var nx = pj.x + pj.vx * dt, ny = pj.y + pj.vy * dt, nz = pj.z + pj.vz * dt;
    var dx = nx - pj.x, dy = ny - pj.y, dz = nz - pj.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L > 0) {
      var h = rayVoxel(w, pj.x, pj.y, pj.z, dx / L, dy / L, dz / L, L);
      if (h) {
        var hx = pj.x + dx / L * (h.t - 0.05), hy = pj.y + dy / L * (h.t - 0.05), hz = pj.z + dz / L * (h.t - 0.05);
        if (g.impact) { pj.x = hx; pj.y = hy; pj.z = hz; return true; }
        if (g.stick) { pj.x = hx; pj.y = hy; pj.z = hz; pj.stuck = true; pj.age = Math.min(pj.age, 0.2); return false; }
        // bounce
        pj.x = hx; pj.y = hy; pj.z = hz;
        if (h.nx) pj.vx = -pj.vx * 0.45; if (h.ny) pj.vy = -pj.vy * 0.4; if (h.nz) pj.vz = -pj.vz * 0.45;
        if (h.ny > 0) { pj.vx *= 0.7; pj.vz *= 0.7; }
      } else { pj.x = nx; pj.y = ny; pj.z = nz; }
    }
    if (g.impact && targets) {
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i]; if (!t.alive || t.slot === pj.o) continue;
        if (Math.abs(t.x - pj.x) < 0.5 && Math.abs(t.z - pj.z) < 0.5 && pj.y > t.y && pj.y < t.y + 1.8) return true;
      }
    }
    if (pj.y < -3) return true;
    return pj.age >= pj.fuse;
  }

  // ---------- navigation flow field (ground layer) ----------
  function Nav(w) { this.w = w; this.ver = -1; this.pass = new Uint8Array(W * D); this.fields = {}; }
  Nav.prototype.refresh = function () {
    if (this.ver === this.w.navVer) return;
    this.ver = this.w.navVer; this.fields = {};
    for (var z = 0; z < D; z++) for (var x = 0; x < W; x++) {
      var w = this.w, ok = 0;
      if (!w.solid(x, 1, z) && !w.solid(x, 2, z)) ok = 1;            // open ground
      else if (w.solid(x, 1, z) && !w.solid(x, 2, z) && !w.solid(x, 3, z)) ok = 2; // 1-high step (stage, debris)
      this.pass[z * W + x] = ok;
    }
  };
  Nav.prototype.field = function (gx, gz) {
    this.refresh();
    gx = Math.max(0, Math.min(W - 1, gx | 0)); gz = Math.max(0, Math.min(D - 1, gz | 0));
    var key = gx + ',' + gz;
    if (this.fields[key]) return this.fields[key];
    var dist = new Uint16Array(W * D); dist.fill(65535);
    var q = new Int32Array(W * D), qh = 0, qt = 0, s = gz * W + gx;
    dist[s] = 0; q[qt++] = s;
    var P = this.pass;
    while (qh < qt) {
      var c = q[qh++], cx = c % W, cz = (c - cx) / W, cd = dist[c];
      for (var k = 0; k < 4; k++) {
        var nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
        var n = nz * W + nx;
        if (!P[n] || dist[n] !== 65535) continue;
        // can't climb from step-level to a 2-high wall, but step tiles connect to anything passable
        dist[n] = cd + (P[n] === 2 ? 2 : 1); q[qt++] = n;
      }
    }
    var keys = Object.keys(this.fields); if (keys.length > 24) delete this.fields[keys[0]];
    this.fields[key] = dist; return dist;
  };
  // best direction from (x,z) toward goal using field; returns [dx,dz] normalized or null
  Nav.prototype.dir = function (x, z, gx, gz) {
    var f = this.field(gx, gz), cx = Math.floor(x), cz = Math.floor(z);
    var here = f[Math.max(0, Math.min(D - 1, cz)) * W + Math.max(0, Math.min(W - 1, cx))];
    var best = here, bx = 0, bz = 0;
    for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      var nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      if (dx && dz && (f[cz * W + nx] === 65535 || f[nz * W + cx] === 65535)) continue;
      var v = f[nz * W + nx] + (dx && dz ? 0.4 : 0);
      if (v < best) { best = v; bx = dx; bz = dz; }
    }
    if (here === 65535 || (!bx && !bz)) {
      var ddx = gx + 0.5 - x, ddz = gz + 0.5 - z, L = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
      return [ddx / L, ddz / L, here === 65535];
    }
    // steer toward the next cell centre for smoother motion
    var tx = cx + bx + 0.5 - x, tz = cz + bz + 0.5 - z, L2 = Math.sqrt(tx * tx + tz * tz) || 1;
    return [tx / L2, tz / L2, false];
  };

  // =================== HOST MATCH SIM ===================
  function Match(opts) {
    // opts: {fmt, seed, world, slots:[{human, name, cls, wpn}]}
    this.fmt = opts.fmt; this.mode = opts.mode === 'push' ? 'push' : 'cash'; this.world = opts.world; this.R = rng(opts.seed || 1);
    this.nav = new Nav(this.world);
    this.t = RULES.matchTime; this.over = false; this.winner = -1;
    var nt = FORMATS[this.fmt].teams;
    this.sc = []; for (var i = 0; i < nt; i++) this.sc.push(0);
    this.slots = [];
    var R = this.R, self = this;
    opts.slots.forEach(function (s, i) {
      var cls = s.cls || ['light', 'medium', 'heavy'][Math.floor(R() * 3)];
      var wpn = s.wpn != null ? s.wpn : CLASSES[cls].wpns[Math.floor(R() * 2)];
      var ch = CHI[s.ch] != null ? s.ch : CHARS[i % CHARS.length].id;
      self.slots.push({
        i: i, team: slotTeam(self.fmt, i), human: !!s.human, ch: ch, em: 0, name: s.name || ('บอท' + CHARS[CHI[ch]].th),
        cls: cls, wpn: wpn, hp: CLASSES[cls].hp, alive: true, rt: 0, x: 0, y: 1, z: 0, yw: 0, pt: 0, cr: 0, hw: CLASSES[cls].hw,
        k: 0, d: 0, cash: 0, lastHit: 1e9, lastBy: -1, spn: 0, use: 0, hold: 0, holdKind: '', ack: 0, sh: 0, bot: null
      });
    });
    this.ph = 'vault'; this.vi = Math.floor(R() * MAP.vaults.length); this.vp = 0;
    this.cb = null; // {x,y,z,vx,vy,vz,car}
    this.st = [];   // active stations [{i, o, p, dep}]
    this.inter = 0;
    this.pj = []; this.pjSeq = 1;
    this.ops = []; this.feed = []; this.feedSeq = 0; this.fx = []; this.fxSeq = 0;
    this.pp = 0; this.pst = -1; this.mile = {}; this.kb = []; this.kbSeq = 0;
    if (this.mode === 'push') { this.t = PUSH.time; this.ph = 'push'; }
    this.slots.forEach(function (s) { self.respawn(s, true); });
  }
  Match.prototype.targets = function () {
    return this.slots.map(function (s) { return { slot: s.i, x: s.x, y: s.y, z: s.z, cr: s.cr, hw: s.hw, alive: s.alive, team: s.team }; });
  };
  Match.prototype.respawn = function (s, first) {
    var self = this, best = null, bs = -1;
    if (this.mode === 'push') {
      var list = MAP.pspawns[s.team] || MAP.pspawns[0];
      list.forEach(function (sp, k) {
        var md = 1e9;
        self.slots.forEach(function (o) { if (o !== s && o.alive && o.team !== s.team) md = Math.min(md, Math.hypot(o.x - sp[0], o.z - sp[2])); });
        var score = first ? -Math.abs(k - (s.i % FORMATS[self.fmt].size)) : Math.min(md, 40) + self.R() * 10;
        if (score > bs) { bs = score; best = sp; }
      });
      s.x = best[0] + (this.R() - 0.5) * 0.6; s.y = best[1]; s.z = best[2] + (this.R() - 0.5) * 0.6;
      s.yw = Math.atan2(-(CX - s.x), -(PUSH.z - s.z));
      s.sp = [s.x, s.y, s.z, s.yw];
      s.hp = CLASSES[s.cls].hp; s.alive = true; s.rt = 0; s.spn++; s.lastHit = 1e9; s.lastBy = -1;
      if (s.bot) { s.bot.b.x = s.x; s.bot.b.y = s.y; s.bot.b.z = s.z; s.bot.b.vx = s.bot.b.vz = s.bot.b.vy = 0; }
      return;
    }
    // spawn far from living enemies, near teammates in 2v2
    MAP.spawns.forEach(function (sp, k) {
      var md = 1e9, tm = 0;
      self.slots.forEach(function (o) {
        if (o === s || !o.alive) return;
        var d = Math.hypot(o.x - sp[0], o.z - sp[2]);
        if (o.team !== s.team) md = Math.min(md, d); else tm = Math.max(tm, 30 - d);
      });
      var score = Math.min(md, 60) + tm * 0.3 + self.R() * 6;
      if (first) score = -Math.abs(k - (s.team * 3 + (s.i % 2) * 1)) * 10 + self.R(); // deterministic-ish first spawns spread
      if (score > bs) { bs = score; best = sp; }
    });
    if (first) best = MAP.spawns[(s.team * 3 + (s.i % FORMATS[this.fmt].size) * 4) % MAP.spawns.length];
    s.x = best[0] + (this.R() - 0.5) * 0.6; s.y = best[1]; s.z = best[2] + (this.R() - 0.5) * 0.6;
    s.yw = Math.atan2(-(CX - s.x), -(CZ - s.z));
    s.sp = [s.x, s.y, s.z, s.yw];
    s.hp = CLASSES[s.cls].hp; s.alive = true; s.rt = 0; s.spn++; s.lastHit = 1e9; s.lastBy = -1;
    if (s.bot) { s.bot.b.x = s.x; s.bot.b.y = s.y; s.bot.b.z = s.z; s.bot.b.vx = s.bot.b.vz = s.bot.b.vy = 0; s.bot.path = 0; }
  };
  Match.prototype.addOp = function (op) { this.ops.push(op); };
  Match.prototype.pushFeed = function (a, v, wpn, dk) { this.feedSeq++; this.feed.push([this.feedSeq, a, v, wpn, dk || 0]); if (this.feed.length > 6) this.feed.shift(); };
  // knock a player away from (fx, fz). Humans get it through the snapshot (they own their position).
  Match.prototype.knock = function (vi, fx, fz, h, up) {
    var v = this.slots[vi]; if (!v || !v.alive || this.over) return;
    var dx = v.x - fx, dz = v.z - fz, L = Math.sqrt(dx * dx + dz * dz);
    if (L < 0.05) { dx = Math.sin(v.yw); dz = Math.cos(v.yw); L = 1; }
    var vx = dx / L * h, vz = dz / L * h;
    if (v.human) { this.kbSeq++; this.kb.push([this.kbSeq, vi, Math.round(vx * 10), Math.round(up * 10), Math.round(vz * 10)]); if (this.kb.length > 8) this.kb.shift(); }
    else if (v.bot) { v.bot.b.vx += vx; v.bot.b.vz += vz; v.bot.b.vy = Math.max(v.bot.b.vy, up); v.bot.b.onGround = false; v.bot.stun = 0.7; }
  };
  Match.prototype.pushFx = function (k, x, y, z, s) { this.fxSeq++; this.fx.push([this.fxSeq, k, Math.round(x * 10), Math.round(y * 10), Math.round(z * 10), s]); if (this.fx.length > 6) this.fx.shift(); };
  Match.prototype.damage = function (vi, amt, by, wpn) {
    var v = this.slots[vi]; if (!v || !v.alive || this.over) return;
    var a = this.slots[by];
    if (a && a !== v && a.team === v.team) return; // no friendly fire
    if (amt <= 0) return;
    var prevHit = v.lastHit;
    v.hp -= amt; v.lastHit = this.t; if (a && a !== v) v.lastBy = by;
    if (v.hp <= 0) this.kill(v, (a && a !== v) ? by : (v.lastBy >= 0 && prevHit - this.t < 8 ? v.lastBy : -1), wpn);
  };
  Match.prototype.kill = function (v, by, wpn) {
    v.hp = 0; v.alive = false; v.rt = RULES.respawn; v.d++; v.use = 0; v.hold = 0;
    if (by >= 0 && this.slots[by] && by !== v.i) { this.slots[by].k++; }
    var gid = WEAPONS[wpn] ? WEAPONS[wpn].id : '', dk;
    if (gid === 'frag' || gid === 'breach' || gid === 'rpg') dk = DEATH.BOOM;
    else if (gid === 'hammer' || gid === 'charge') dk = DEATH.HOMERUN;
    else { var rr = this.R(); dk = rr < 0.18 ? DEATH.ROCKET : rr < 0.42 ? DEATH.BOOM : DEATH.FLY; }
    this.pushFeed(by, v.i, wpn, dk);
    if (by >= 0 && this.slots[by] && by !== v.i) this.slots[by].em++; // killers celebrate
    if (this.cb && this.cb.car === v.i) { this.cb.car = -1; this.cb.x = v.x; this.cb.y = v.y + 0.6; this.cb.z = v.z; this.cb.vx = this.cb.vz = 0; this.cb.vy = 2; }
  };
  // claims from a slot: [seq, type, a, b, c, ...]
  Match.prototype.applyClaims = function (si, claims) {
    var s = this.slots[si]; if (!s || !claims) return;
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i]; if (!c || c[0] <= s.ack) continue;
      s.ack = c[0];
      if (!s.alive && c[1] !== 1) continue;
      switch (c[1]) {
        case 0:                                                                       // player damage
          this.damage(c[2], Math.min(250, c[3]), si, c[4]);
          if (c[4] === WI.hammer) this.knock(c[2], s.x, s.z, 11, 7);
          else if (c[4] === WI.charge) this.knock(c[2], s.x, s.z, 13, 6);
          break;
        case 1: if (c[2] >= 0 && c[2] < N && this.world.damageIdx(c[2], Math.min(255, c[3]))) this.addOp(c[2]); break; // block damage
        case 2: this.healPulse(s); break;                                            // heal spec
        case 4: this.launch(s, c[2], c[3] / 100, c[4] / 100, c[5] / 100, c[6] / 1000, c[7] / 1000, c[8] / 1000); break; // gadget
        case 5: this.throwBox(s, c[2] / 1000, c[3] / 1000, c[4] / 1000); break;
      }
    }
  };
  Match.prototype.healPulse = function (s) {
    var self = this;
    this.slots.forEach(function (o) { if (o.alive && o.team === s.team && Math.hypot(o.x - s.x, o.z - s.z) < 8) o.hp = Math.min(CLASSES[o.cls].hp, o.hp + 70); });
    this.pushFx(1, s.x, s.y + 1, s.z, s.team);
  };
  Match.prototype.launch = function (s, kind, x, y, z, dx, dy, dz) {
    var k = ['frag', 'breach', 'rpg'][kind]; if (!k) return;
    var g = GADGETS[k];
    this.pj.push({ id: this.pjSeq++, k: k, x: x, y: y, z: z, vx: dx * g.spd, vy: dy * g.spd + (g.grav ? 3 : 0), vz: dz * g.spd, age: 0, fuse: g.fuse, o: s.i, t: s.team });
  };
  Match.prototype.throwBox = function (s, dx, dy, dz) {
    if (!this.cb || this.cb.car !== s.i) return;
    this.cb.car = -1; this.cb.x = s.x + dx * 0.6; this.cb.y = s.y + 1.4; this.cb.z = s.z + dz * 0.6;
    this.cb.vx = dx * 11; this.cb.vy = dy * 11 + 3; this.cb.vz = dz * 11; this.cb.nopick = 0.6;
  };
  Match.prototype.explode = function (pj) {
    var g = GADGETS[pj.k], self = this;
    var op = [Math.round(pj.x * 10), Math.round(pj.y * 10), Math.round(pj.z * 10), Math.round(g.carve * 10), pj.id, ['frag', 'breach', 'rpg'].indexOf(pj.k)];
    this.addOp(op);
    this.world.applyOp(op); // carve from the same rounded numbers every client receives
    this.slots.forEach(function (s) {
      if (!s.alive) return;
      var d = Math.hypot(s.x - pj.x, s.y + 0.9 - pj.y, s.z - pj.z);
      if (d > g.r) return;
      var dmg = g.dmg * (1 - 0.6 * d / g.r);
      if (s.i === pj.o) dmg *= 0.5; else if (s.team === pj.t) return;
      self.damage(s.i, Math.round(dmg), pj.o, WI[pj.k]);
      self.knock(s.i, pj.x, pj.z, 6 + 10 * (1 - d / g.r), 5 + 5 * (1 - d / g.r)); // rocket jumps included
    });
  };
  // human update: data from their presence
  Match.prototype.setHuman = function (si, d) {
    var s = this.slots[si]; if (!s || !d) return;
    // ignore positions sent before the client has seen its latest respawn
    if (s.alive && (d.sn == null || d.sn === s.spn)) { s.x = d.x; s.y = d.y; s.z = d.z; }
    s.yw = d.yw; s.pt = d.pt; s.cr = d.cr; s.use = d.u ? 1 : 0; s.sh = d.sh; s.wpn = d.w || s.wpn;
    if (d.cls && CLASSES[d.cls] && d.cls !== s.cls) { s.cls = d.cls; s.hw = CLASSES[d.cls].hw; }
  };
  Match.prototype.near = function (s, p, r) { return Math.hypot(s.x - p[0], s.z - p[2]) < r && Math.abs(s.y - p[1]) < 2.5; };
  Match.prototype.pickStations = function () {
    var v = MAP.vaults[this.vi], R = this.R;
    var order = MAP.stations.map(function (p, i) { return { i: i, d: Math.hypot(p[0] - v[0], p[2] - v[2]) + R() * 14 }; })
      .sort(function (a, b) { return b.d - a.d; });
    this.st = [{ i: order[0].i, o: -1, p: 0, dep: 0 }, { i: order[1].i, o: -1, p: 0, dep: 0 }];
  };
  Match.prototype.tick = function (dt) {
    if (this.over) return;
    var self = this, S = this.slots;
    this.t -= dt;
    // bots
    for (var i = 0; i < S.length; i++) if (!S[i].human) botTick(this, S[i], dt);
    // respawn & regen
    S.forEach(function (s) {
      if (!s.alive) { s.rt -= dt; if (s.rt <= 0) self.respawn(s); return; }
      if (s.y < -4) { self.kill(s, s.lastBy, WI.fall); return; }
      if (self.t < s.lastHit - RULES.regenDelay) s.hp = Math.min(CLASSES[s.cls].hp, s.hp + RULES.regenRate * dt);
    });
    // projectiles
    var tg = this.targets();
    this.pj = this.pj.filter(function (pj) { if (stepProjectile(self.world, pj, dt, tg)) { self.explode(pj); return false; } return true; });
    // objective
    if (this.mode === 'push') this.pushObjective(dt); else this.objective(dt);
    if (this.t <= 0) this.finish();
  };
  Match.prototype.holding = function (s, kind, need, dt) {
    if (s.holdKind !== kind) { s.holdKind = kind; s.hold = 0; }
    s.hold += dt;
    return s.hold >= need;
  };
  Match.prototype.platX = function () { return PUSH.cx + this.pp * PUSH.half; };
  Match.prototype.onPlatform = function (s) {
    return s.alive && Math.abs(s.x - this.platX()) < PUSH.rad && Math.abs(s.z - PUSH.z) < PUSH.rad && s.y < 3.6;
  };
  Match.prototype.pushObjective = function (dt) {
    var self = this, cnt = [0, 0];
    this.slots.forEach(function (s) { if (self.onPlatform(s)) cnt[s.team]++; });
    var prev = this.pst;
    if (cnt[0] && cnt[1]) this.pst = 9;
    else if (cnt[0] || cnt[1]) {
      var t = cnt[0] ? 0 : 1, n = cnt[t];
      this.pst = t;
      this.pp += (t === 0 ? -1 : 1) * (PUSH.speed + PUSH.extra * (n - 1)) * dt / PUSH.half;
      this.pp = Math.max(-1, Math.min(1, this.pp));
      this.slots.forEach(function (s) { if (s.team === t && self.onPlatform(s)) s.cash += dt; });
    } else this.pst = -1;
    if (prev !== this.pst && this.pst === 9) this.pushFx(7, this.platX(), 1.5, PUSH.z, -1);
    for (var t2 = 0; t2 < 2; t2++) {
      var prog = t2 === 0 ? -this.pp : this.pp;
      [0.5, 0.75, 0.9].forEach(function (m) {
        var key = t2 + ':' + m;
        if (prog >= m && !self.mile[key]) { self.mile[key] = 1; self.pushFx(6, self.platX(), 1.5, PUSH.z, t2 * 100 + Math.round(m * 100)); }
      });
    }
    this.sc = [Math.round(Math.max(0, -this.pp) * 100), Math.round(Math.max(0, this.pp) * 100)];
    if (Math.abs(this.pp) >= 1) this.finish();
  };
  Match.prototype.objective = function (dt) {
    var self = this, S = this.slots;
    var holdUsed = {};
    if (this.ph === 'inter') {
      this.inter -= dt;
      if (this.inter <= 0) {
        var prev = this.vi, nv = prev;
        while (nv === prev) nv = Math.floor(this.R() * MAP.vaults.length);
        this.vi = nv; this.vp = 0; this.ph = 'vault'; this.st = []; this.cb = null;
      }
    } else if (this.ph === 'vault') {
      var v = MAP.vaults[this.vi], anyone = false;
      S.forEach(function (s) {
        if (s.alive && s.use && self.near(s, v, 2.4)) { anyone = true; holdUsed[s.i] = 1; if (self.holding(s, 'v', 0, dt)) { } }
      });
      if (anyone) this.vp += dt / RULES.vaultTime; else this.vp = Math.max(0, this.vp - dt * 0.25);
      if (this.vp >= 1) {
        this.ph = 'box'; this.cb = { x: v[0], y: v[1] + 0.2, z: v[2], vx: 0, vy: 3, vz: 0, car: -1, nopick: 0.4 };
        this.pickStations(); this.pushFx(2, v[0], v[1] + 1, v[2], -1);
      }
    } else if (this.ph === 'box' || this.ph === 'cash') {
      var cb = this.cb;
      if (cb) {
        if (cb.car >= 0) {
          var c = S[cb.car]; cb.x = c.x; cb.y = c.y + 1.1; cb.z = c.z;
        } else {
          cb.nopick = Math.max(0, (cb.nopick || 0) - dt);
          var b = { x: cb.x, y: cb.y, z: cb.z, vx: cb.vx, vy: cb.vy, vz: cb.vz, hw: 0.3, h: 0.5 };
          moveBody(this.world, b, dt);
          cb.x = b.x; cb.y = b.y; cb.z = b.z; cb.vy = b.vy;
          if (b.onGround) { cb.vx *= 0.8; cb.vz *= 0.8; } else { cb.vx = b.vx; cb.vz = b.vz; }
          if (cb.y < -2) { var vv = MAP.vaults[this.vi]; cb.x = vv[0]; cb.y = 1.2; cb.z = vv[2]; cb.vx = cb.vz = 0; }
          if (!cb.nopick) S.forEach(function (s) {
            if (cb.car < 0 && s.alive && s.use && Math.hypot(s.x - cb.x, s.z - cb.z) < 1.8 && Math.abs(s.y - cb.y) < 2.2) { cb.car = s.i; holdUsed[s.i] = 1; s.hold = 0; s.holdKind = 'carry-wait'; }
          });
        }
      }
      // stations
      this.st.forEach(function (st) {
        var p = MAP.stations[st.i];
        if (self.ph === 'box' && cb && cb.car >= 0) {
          var car = S[cb.car];
          if (car.use && car.holdKind !== 'carry-wait' && self.near(car, p, 2.4)) {
            holdUsed[car.i] = 1;
            if (self.holding(car, 'd' + st.i, RULES.depositTime, dt)) {
              st.dep = 1; st.o = car.team; st.p = 0; self.ph = 'cash'; self.cb = null;
              self.st = [st]; car.hold = 0;
              self.pushFx(3, p[0], p[1] + 1, p[2], car.team);
            }
          }
        }
        if (self.ph === 'cash' && st.dep) {
          st.p += dt / RULES.cashTime;
          S.forEach(function (s) {
            if (s.alive && s.use && s.team !== st.o && self.near(s, p, 2.6)) {
              holdUsed[s.i] = 1;
              if (self.holding(s, 's' + st.i, RULES.stealTime, dt)) { st.o = s.team; s.hold = 0; self.pushFx(4, p[0], p[1] + 1, p[2], s.team); }
            }
          });
          if (st.p >= 1) {
            self.sc[st.o] += RULES.cashValue;
            S.forEach(function (s) { if (s.team === st.o) s.cash += RULES.cashValue / FORMATS[self.fmt].size; });
            self.pushFx(5, p[0], p[1] + 1, p[2], st.o);
            self.ph = 'inter'; self.inter = RULES.interTime; self.st = []; self.cb = null;
            if (self.sc[st.o] >= RULES.winCash) self.finish();
          }
        }
      });
      // carry-wait: carrier must release E before depositing
      if (cb && cb.car >= 0 && !S[cb.car].use && S[cb.car].holdKind === 'carry-wait') S[cb.car].holdKind = '';
    }
    S.forEach(function (s) { if (!holdUsed[s.i] && s.holdKind !== 'carry-wait') { s.hold = 0; s.holdKind = ''; } });
  };
  Match.prototype.finish = function () {
    if (this.over) return;
    this.over = true;
    var best = -1, bv = -1, tie = false;
    this.sc.forEach(function (v, i) { if (v > bv) { bv = v; best = i; tie = false; } else if (v === bv) tie = true; });
    this.winner = tie ? -1 : best;
    if (this.mode === 'push') this.winner = Math.abs(this.pp) < 0.005 ? -1 : (this.pp < 0 ? 0 : 1);
  };
  // compact snapshot for host presence
  Match.prototype.snap = function (opStart) {
    var q = function (v) { return Math.round(v * 100); };
    var S = this.slots;
    var g = {
      t: Math.max(0, Math.round(this.t)), ph: this.ph, sc: this.sc.slice(), vi: this.vi, vp: Math.round(this.vp * 100),
      cb: this.cb ? [q(this.cb.x), q(this.cb.y), q(this.cb.z), this.cb.car] : null,
      st: this.st.map(function (s) { return [s.i, s.o, Math.round(s.p * 1000), s.dep]; }),
      hp: S.map(function (s) { return Math.max(0, Math.round(s.hp)); }),
      rt: S.map(function (s) { return s.alive ? 0 : Math.ceil(s.rt); }),
      kd: S.map(function (s) { return [s.k, s.d, Math.round(s.cash)]; }),
      ak: S.map(function (s) { return s.ack; }),
      sp: S.map(function (s) { var p = s.sp || [s.x, s.y, s.z, s.yw]; return [s.spn, q(p[0]), q(p[1]), q(p[2]), Math.round(p[3] * 1000)]; }),
      hd: S.map(function (s) { return s.holdKind && s.holdKind !== 'carry-wait' ? Math.round(s.hold * 100) : 0; }),
      bt: S.filter(function (s) { return !s.human; }).map(function (s) { return [s.i, q(s.x), q(s.y), q(s.z), Math.round(s.yw * 1000), Math.round(s.pt * 1000), s.sh, s.cr, s.cls, s.wpn, s.ch, s.em]; }),
      kb: this.kb.slice(),
      pj: this.pj.map(function (p) { return [p.id, ['frag', 'breach', 'rpg'].indexOf(p.k), q(p.x), q(p.y), q(p.z)]; }),
      fd: this.feed.slice(), fx: this.fx.slice(),
      ov: this.over ? 1 : 0, wn: this.winner, md: this.mode, pp: Math.round(this.pp * 1000), ps: this.pst
    };
    return g;
  };
  // window of ops for presence, under a char budget
  function opWindow(ops, start, budget) {
    var out = [], size = 0;
    for (var i = start; i < ops.length; i++) {
      var s = JSON.stringify(ops[i]).length + 1;
      if (size + s > budget) break;
      out.push(ops[i]); size += s;
    }
    return out;
  }
  function tailStart(ops, budget) {
    var size = 0, i = ops.length;
    while (i > 0) { var s = JSON.stringify(ops[i - 1]).length + 1; if (size + s > budget) break; size += s; i--; }
    return i;
  }

  // =================== BOTS ===================
  function botTick(M, s, dt) {
    var w = M.world, R = M.R;
    if (!s.bot) s.bot = { b: { x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, hw: s.hw, h: 1.75, onGround: true }, cd: 0, ammo: WEAPONS[WI[s.wpn]].mag, rl: 0, tgt: -1, think: 0, strafe: 1, stuck: 0, lx: s.x, lz: s.z, aimErr: [0, 0], burst: 0, react: 0.5 };
    var B = s.bot, b = B.b;
    if (!s.alive) { s.use = 0; return; }
    var cls = CLASSES[s.cls], wd = WEAPONS[WI[s.wpn]];
    // --- pick target ---
    B.think -= dt;
    var eye = [b.x, b.y + 1.55, b.z];
    if (B.think <= 0) {
      B.think = 0.25 + R() * 0.2;
      var best = -1, bd = 1e9;
      M.slots.forEach(function (o) {
        if (!o.alive || o.team === s.team) return;
        var d = Math.hypot(o.x - b.x, o.y - b.y, o.z - b.z);
        if (d > 42) return;
        if (!losClear(w, eye[0], eye[1], eye[2], o.x, o.y + 1.3, o.z)) return;
        var sc = d - (M.cb && M.cb.car === o.i ? 12 : 0);
        if (sc < bd) { bd = sc; best = o.i; }
      });
      if (best !== B.tgt) { B.react = 0.35 + R() * 0.35; B.aimErr = [(R() - 0.5) * 0.25, (R() - 0.5) * 0.18]; }
      B.tgt = best;
      if (R() < 0.15) B.strafe = -B.strafe;
    }
    // --- goal ---
    var goal = null, wantUse = false, goalR = 1.2;
    var cb = M.cb;
    if (M.mode === 'push') {
      var px = M.platX(), off = (s.i % 2 ? 0.9 : -0.9);
      goal = [px + off * 0.6, 1, PUSH.z + off]; goalR = 0.7;
    } else if (M.ph === 'vault') { goal = MAP.vaults[M.vi]; goalR = 1.6; wantUse = true; }
    else if (M.ph === 'box' && cb) {
      if (cb.car === s.i) {
        var bs = null, bsd = 1e9;
        M.st.forEach(function (st) { var p = MAP.stations[st.i], d = Math.hypot(p[0] - b.x, p[2] - b.z); if (d < bsd) { bsd = d; bs = p; } });
        goal = bs; goalR = 1.2; wantUse = true;
      } else if (cb.car < 0) { goal = [cb.x, cb.y, cb.z]; goalR = 0.9; wantUse = true; }
      else {
        var car = M.slots[cb.car];
        if (car.team === s.team) goal = [car.x + Math.sin(s.i) * 3, 1, car.z + Math.cos(s.i) * 3]; else goal = [car.x, car.y, car.z];
        goalR = 2;
      }
    } else if (M.ph === 'cash' && M.st[0]) {
      var st = M.st[0], p = MAP.stations[st.i];
      if (st.o !== s.team) { goal = p; goalR = 1.2; wantUse = true; }
      else { var a = s.i * 2.1 + M.t * 0.15; goal = [p[0] + Math.cos(a) * 5, 1, p[2] + Math.sin(a) * 5]; goalR = 1.5; }
    } else { goal = [CX + Math.cos(s.i * 1.7) * 12, 1, CZ + Math.sin(s.i * 1.7) * 12]; goalR = 2; }
    // --- movement ---
    var mx = 0, mz = 0, dist = goal ? Math.hypot(goal[0] - b.x, goal[2] - b.z) : 0;
    if (goal && dist > goalR) {
      var d = M.nav.dir(b.x, b.z, Math.floor(goal[0]), Math.floor(goal[2]));
      mx = d[0]; mz = d[1];
    }
    var tgt = B.tgt >= 0 ? M.slots[B.tgt] : null;
    if (tgt && tgt.alive) {
      var td = Math.hypot(tgt.x - b.x, tgt.z - b.z);
      // strafe while fighting; heavies with hammer close in
      var px = -(tgt.z - b.z) / (td || 1), pz = (tgt.x - b.x) / (td || 1);
      var sw = wd.melee ? 0.3 : 0.7;
      if (wd.melee && td > 1.6) { mx = mx * 0.3 + (tgt.x - b.x) / td; mz = mz * 0.3 + (tgt.z - b.z) / td; }
      mx += px * B.strafe * sw; mz += pz * B.strafe * sw;
    }
    var L = Math.hypot(mx, mz);
    var carrying = cb && cb.car === s.i;
    var spd = cls.spd * (carrying ? 0.78 : 1) * (L > 0 && !tgt ? 1.15 : 1);
    if (L > 0) { mx /= L; mz /= L; }
    var acc = b.onGround ? 14 : 4;
    if (B.stun > 0) { B.stun -= dt; acc = 0.6; }
    b.vx += (mx * spd - b.vx) * Math.min(1, acc * dt);
    b.vz += (mz * spd - b.vz) * Math.min(1, acc * dt);
    b.hw = s.hw; b.h = 1.75; b.hitWall = false;
    moveBody(w, b, dt);
    // stuck → jump
    B.stuck += dt;
    if (B.stuck > 0.6) {
      if (L > 0 && Math.hypot(b.x - B.lx, b.z - B.lz) < 0.4 && b.onGround) { b.vy = 7.5; B.strafe = -B.strafe; }
      B.stuck = 0; B.lx = b.x; B.lz = b.z;
    }
    if (b.hitWall && b.onGround && L > 0 && R() < 0.05) b.vy = 7.5;
    s.x = b.x; s.y = b.y; s.z = b.z;
    s.use = wantUse && dist <= goalR + 0.9 ? 1 : 0;
    // --- aim & shoot ---
    var aimYaw = s.yw, aimPitch = 0;
    if (tgt && tgt.alive) {
      var ax = tgt.x - eye[0], ay = tgt.y + 1.2 - eye[1], az = tgt.z - eye[2];
      aimYaw = Math.atan2(-ax, -az) + B.aimErr[0] * (1 - Math.min(1, B.burst * 0.25));
      aimPitch = Math.atan2(ay, Math.hypot(ax, az)) + B.aimErr[1] * (1 - Math.min(1, B.burst * 0.25));
    } else if (L > 0) { aimYaw = Math.atan2(-mx, -mz); }
    var dy = aimYaw - s.yw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    s.yw += dy * Math.min(1, dt * 7); s.pt += (aimPitch - s.pt) * Math.min(1, dt * 7);
    B.cd -= dt; B.react -= dt;
    if (B.rl > 0) { B.rl -= dt; if (B.rl <= 0) B.ammo = wd.mag; }
    if (tgt && tgt.alive && !carrying && B.react <= 0 && B.cd <= 0 && B.rl <= 0 && Math.abs(dy) < 0.25) {
      var tdist = Math.hypot(tgt.x - b.x, tgt.z - b.z);
      if (tdist < wd.rng * 0.9) {
        B.cd = wd.iv * (wd.auto ? 1.15 : 1.6);
        s.sh++;
        var res = wd.melee ? fireMelee(w, wd, eye[0], eye[1], eye[2], s.yw, s.pt, M.targets(), s.team, s.i)
          : fireHitscan(w, wd, eye[0], eye[1], eye[2], s.yw, s.pt, wd.sp * 1.5, M.targets(), s.team, s.i, R);
        res.hits.forEach(function (h) { M.damage(h[0], h[1] * 0.85, s.i, WI[s.wpn]); if (wd.melee) M.knock(h[0], s.x, s.z, 11, 7); });
        res.blocks.forEach(function (bk) { if (bk[0] >= 0 && w.damageIdx(bk[0], bk[1])) M.addOp(bk[0]); });
        B.burst++;
        if (!wd.melee) { B.ammo--; if (B.ammo <= 0) { B.rl = wd.rl; B.burst = 0; } }
      }
    } else if (!tgt) B.burst = 0;
  }

  return {
    W: W, D: D, H: H, N: N, CX: CX, CZ: CZ, CHX: CHX, CHZ: CHZ, idx: idx, unidx: unidx, MAT: MAT, World: World, genMap: genMap, MAP: MAP,
    collides: collides, moveBody: moveBody, rayVoxel: rayVoxel, rayAABB: rayAABB, losClear: losClear, dirFrom: dirFrom,
    WEAPONS: WEAPONS, WI: WI, CLASSES: CLASSES, SPECS: SPECS, GADGETS: GADGETS, TEAMS: TEAMS, FORMATS: FORMATS, RULES: RULES,
    slotTeam: slotTeam, slotCount: slotCount, fireHitscan: fireHitscan, fireMelee: fireMelee, bodyBox: bodyBox, headBox: headBox,
    CHARS: CHARS, CHI: CHI, DEATH: DEATH, Match: Match, MODES: MODES, PUSH: PUSH, opWindow: opWindow, tailStart: tailStart, rng: rng, Nav: Nav, BOTNAMES: BOTNAMES
  };
})();
if (typeof module !== 'undefined') module.exports = CL;
