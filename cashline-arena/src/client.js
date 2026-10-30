/* ================= CASHLINE CLIENT =================
   three.js rendering, input, room networking, host controller, screens. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('cl_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('cl_' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var prof = {
    name: store.get('name', ''), cls: store.get('cls', 'medium'), wpn: store.get('wpn', { light: 'smg', medium: 'ar', heavy: 'lmg' }),
    sens: store.get('sens', 1), fov: store.get('fov', 80), vol: store.get('vol', 0.6), q: store.get('q', isTouch ? 0 : 1)
  };
  if (!CL.CLASSES[prof.cls]) prof.cls = 'medium';
  prof.ch = store.get('ch', null);
  if (CL.CHI[prof.ch] == null) prof.ch = CL.CHARS[Math.floor(Math.random() * CL.CHARS.length)].id;
  function saveProf() { ['name', 'cls', 'wpn', 'sens', 'fov', 'vol', 'q', 'ch'].forEach(function (k) { store.set(k, prof[k]); }); }
  function myWpn() { var w = prof.wpn[prof.cls]; return CL.CLASSES[prof.cls].wpns.indexOf(w) >= 0 ? w : CL.CLASSES[prof.cls].wpns[0]; }
  function fmtCash(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cleanName(s) { s = String(s || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').trim().slice(0, 14); return s || 'ผู้เล่น'; }
  var R = Math.random;
  var CX = CL.CX, CZ = CL.CZ, MW = CL.W, MD = CL.D;
  var MODE_NAME = { cash: 'CASH RUSH', push: 'PLATFORM PUSH' };
  var selMode = store.get('mode', 'cash'); if (!CL.MODES[selMode]) selMode = 'cash';
  function modeFmt(md, f) { var M = CL.MODES[md] || CL.MODES.cash; return M.fmts.indexOf(f) >= 0 ? f : M.def; }
  var world = new CL.World();
  CL.genMap(world);

  // =================== AUDIO ===================
  var Snd = {
    ctx: null, out: null, noise: null,
    init: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        this.ctx = new C(); this.out = this.ctx.createGain(); this.out.gain.value = prof.vol; this.out.connect(this.ctx.destination);
        var len = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
      } catch (e) { this.ctx = null; }
    },
    setVol: function (v) { if (this.out) this.out.gain.value = v; },
    env: function (node, t, a, peak, dec) { var g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); node.connect(g); return g; },
    route: function (g, pos) {
      var c = this.ctx, last = g;
      if (pos && c.createStereoPanner) {
        var dx = pos[0] - camera.position.x, dz = pos[2] - camera.position.z, d = Math.hypot(dx, dz, pos[1] - camera.position.y);
        var vol = c.createGain(); vol.gain.value = 1 / (1 + d * 0.09);
        var p = c.createStereoPanner(), ang = Math.atan2(-dx, -dz) - player.yaw;
        p.pan.value = Math.max(-0.85, Math.min(0.85, -Math.sin(ang)));
        last.connect(vol); vol.connect(p); last = p;
      }
      last.connect(this.out);
    },
    play: function (kind, pos, opt) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      var c = this.ctx, t = c.currentTime, src, f, g;
      try {
        if (kind === 'boing' || kind === 'whistle' || kind === 'home' || kind === 'pop' || kind === 'ping') {
          var oc = c.createOscillator(), en, fq = oc.frequency;
          if (kind === 'boing') { oc.type = 'sine'; fq.setValueAtTime(170, t); fq.exponentialRampToValueAtTime(640, t + 0.08); fq.exponentialRampToValueAtTime(230, t + 0.24); en = this.env(oc, t, 0.005, 0.45, 0.26); }
          else if (kind === 'whistle') { oc.type = 'sine'; fq.setValueAtTime(480, t); fq.exponentialRampToValueAtTime(1900, t + 0.55); en = this.env(oc, t, 0.02, 0.3, 0.6); }
          else if (kind === 'home') { oc.type = 'triangle'; fq.setValueAtTime(260, t); fq.exponentialRampToValueAtTime(2600, t + 0.9); en = this.env(oc, t, 0.02, 0.38, 1.0); }
          else if (kind === 'pop') { oc.type = 'sine'; fq.setValueAtTime(950, t); fq.exponentialRampToValueAtTime(130, t + 0.13); en = this.env(oc, t, 0.002, 0.55, 0.15); }
          else { oc.type = 'sine'; fq.setValueAtTime(1760, t); fq.setValueAtTime(2640, t + 0.08); en = this.env(oc, t, 0.003, 0.3, 0.32); }
          this.route(en, pos); oc.start(t); oc.stop(t + 1.15); return;
        }
        if (kind === 'shot') {
          var id = opt || 'ar', cfg = { smg: [2600, 0.06, 0.5], dmr: [900, 0.22, 0.9], ar: [1700, 0.09, 0.65], sg: [700, 0.25, 0.95], lmg: [1300, 0.09, 0.65] }[id] || [1500, 0.1, 0.6];
          src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.3;
          f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = cfg[0]; f.Q.value = 0.8; src.connect(f);
          g = this.env(f, t, 0.002, cfg[2], cfg[1]); this.route(g, pos); src.start(t, Math.random() * 0.5, cfg[1] + 0.05);
          var o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(cfg[0] / 8, t); o.frequency.exponentialRampToValueAtTime(40, t + cfg[1]);
          var g2 = this.env(o, t, 0.001, cfg[2] * 0.35, cfg[1]); this.route(g2, pos); o.start(t); o.stop(t + cfg[1] + 0.05);
        } else if (kind === 'boom') {
          src = c.createBufferSource(); src.buffer = this.noise; f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(80, t + 0.9);
          src.connect(f); g = this.env(f, t, 0.005, 1.4, 1.0); this.route(g, pos); src.start(t, 0, 1.1);
        } else if (kind === 'swing') {
          src = c.createBufferSource(); src.buffer = this.noise; f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1600, t + 0.2);
          src.connect(f); g = this.env(f, t, 0.05, 0.5, 0.2); this.route(g, pos); src.start(t, 0, 0.35);
        } else if (kind === 'crack') {
          src = c.createBufferSource(); src.buffer = this.noise; f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
          src.connect(f); g = this.env(f, t, 0.001, 0.35, 0.12); this.route(g, pos); src.start(t, Math.random(), 0.2);
        } else {
          var tones = { hit: [[1800, 0.05, 0.25]], kill: [[1400, 0.07, 0.3], [2100, 0.12, 0.3]], cash: [[880, 0.12, 0.3], [1320, 0.12, 0.3], [1760, 0.3, 0.3]], ui: [[660, 0.06, 0.15]], hurt: [[220, 0.12, 0.35]], vault: [[440, 0.15, 0.3], [660, 0.25, 0.3]], alarm: [[520, 0.18, 0.25], [390, 0.18, 0.25]] }[kind];
          if (!tones) return;
          tones.forEach(function (tn, i) {
            var o2 = c.createOscillator(); o2.type = kind === 'hurt' ? 'sawtooth' : 'triangle'; o2.frequency.value = tn[0];
            var st = t + i * 0.09, gg = Snd.env(o2, st, 0.005, tn[2], tn[1]); Snd.route(gg, pos); o2.start(st); o2.stop(st + tn[1] + 0.05);
          });
        }
      } catch (e) { }
    }
  };

  // =================== GRAPHICS ===================
  var renderer, scene, camera, chunkMeshes = {}, matOpaque, matGlass, vmRoot, vm = null, vmKind = '';
  var particles, tracers, booms = [], beams = {}, objs = {}, avatars = {}, pjMeshes = {}, boardTex, boardCtx, boardMesh;
  var hasGL = true;
  function initGfx() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: prof.q >= 2, powerPreference: 'high-performance' });
    } catch (e) { hasGL = false; return; }
    applyQuality();
    scene = new THREE.Scene();
    var skyCol = new THREE.Color(0x15174a);
    scene.background = skyCol; scene.fog = new THREE.Fog(0x15174a, 55, 175);
    camera = new THREE.PerspectiveCamera(prof.fov, innerWidth / innerHeight, 0.05, 340);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xc8d6ff, 0x3a2850, 0.85));
    var sun = new THREE.DirectionalLight(0xfff1dd, 0.65); sun.position.set(30, 60, 18); scene.add(sun);
    var fill = new THREE.DirectionalLight(0xff6f9a, 0.25); fill.position.set(-40, 20, -30); scene.add(fill);
    matOpaque = new THREE.MeshLambertMaterial({ vertexColors: true });
    matGlass = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false });
    // sky dome gradient
    var sg = new THREE.SphereGeometry(260, 24, 12), sp = sg.attributes.position, sc = new Float32Array(sp.count * 3);
    for (var i = 0; i < sp.count; i++) {
      var y = sp.getY(i) / 260, a = Math.max(0, Math.min(1, y * 1.3 + 0.25));
      var top = [0.05, 0.05, 0.16], hor = [0.42, 0.16, 0.36];
      sc[i * 3] = hor[0] + (top[0] - hor[0]) * a; sc[i * 3 + 1] = hor[1] + (top[1] - hor[1]) * a; sc[i * 3 + 2] = hor[2] + (top[2] - hor[2]) * a;
    }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    var sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.position.set(CX, 0, CZ); scene.add(sky);
    buildStadium();
    vmRoot = new THREE.Group(); camera.add(vmRoot);
    initParticles(); initTracers(); initObjects();
    addEventListener('resize', onResize);
  }
  function applyQuality() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, [0.75, 1.25, 2][prof.q] || 1));
    renderer.setSize(innerWidth, innerHeight, false);
  }
  function onResize() { if (!renderer) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }
  function basic(col, extra) { var o = { color: col }; if (extra) for (var k in extra) o[k] = extra[k]; return new THREE.MeshBasicMaterial(o); }
  function buildStadium() {
    // light towers at corners
    [[-8, -8], [MW + 8, -8], [-8, MD + 8], [MW + 8, MD + 8]].forEach(function (p) {
      var pole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 32, 1.4), new THREE.MeshLambertMaterial({ color: 0x1b1d3e }));
      pole.position.set(p[0], 16, p[1]); scene.add(pole);
      var head = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 1), basic(0xfff3cf)); head.position.set(p[0], 32, p[1]); head.lookAt(CX, 0, CZ); scene.add(head);
    });
    // grandstands
    [[CX, -14, 0], [CX, MD + 14, 0], [-14, CZ, 1], [MW + 14, CZ, 1]].forEach(function (p, i) {
      for (var k = 0; k < 5; k++) {
        var g = new THREE.Mesh(new THREE.BoxGeometry(p[2] ? 4 : MW + 6, 2, p[2] ? MD + 6 : 4), new THREE.MeshLambertMaterial({ color: k % 2 ? 0x24275c : 0x1c1e48 }));
        var off = (k * 4 + 2) * (i % 2 ? 1 : -1);
        g.position.set(p[2] ? p[0] + off * 0.6 : p[0], 1 + k * 2.2, p[2] ? p[1] : p[1] + off * 0.6); scene.add(g);
      }
    });
    // crowd lights (instanced)
    var NDOT = 600, dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), basic(0xffffff), NDOT), m = new THREE.Matrix4(), cc = new THREE.Color();
    var pal = [0xffd23f, 0x35d0f5, 0xff5a5f, 0xc77dff, 0xffffff];
    for (var i = 0; i < NDOT; i++) {
      var side = i % 4, t = Math.random() * (MW + 6) - 3, h = 2 + Math.floor(Math.random() * 5) * 2.2 + 1.2, d = -10 - Math.random() * 12;
      var x = side === 0 ? t : side === 1 ? t : side === 2 ? d : MW - d, z = side === 0 ? d : side === 1 ? MD - d : t;
      m.makeTranslation(x, h, z); dots.setMatrixAt(i, m);
      if (dots.setColorAt) { cc.setHex(pal[i % pal.length]); dots.setColorAt(i, cc); }
    }
    scene.add(dots);
    // giant scoreboard above the stage
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; boardCtx = cv.getContext('2d');
    boardTex = new THREE.CanvasTexture(cv);
    boardMesh = new THREE.Group();
    for (var s = 0; s < 4; s++) {
      var pl = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), basic(0xffffff, { map: boardTex, side: THREE.DoubleSide, fog: false }));
      pl.rotation.y = s * Math.PI / 2; pl.position.set(Math.sin(s * Math.PI / 2) * 6, 0, Math.cos(s * Math.PI / 2) * 6); boardMesh.add(pl);
    }
    var frame = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.4, 12.4), basic(0xff3d6e)); frame.position.y = 2.45; boardMesh.add(frame);
    var frame2 = frame.clone(); frame2.position.y = -2.45; boardMesh.add(frame2);
    boardMesh.position.set(CX, 24, CZ); scene.add(boardMesh);
    drawBoard(null);
    // neon floor ring at center
    var ring = new THREE.Mesh(new THREE.RingGeometry(9.5, 10, 64), basic(0xff3d6e, { side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(CX, 1.02, CZ); scene.add(ring);
  }
  function drawBoard(Gs) {
    if (!boardCtx) return;
    var c = boardCtx; c.fillStyle = '#0b0c1d'; c.fillRect(0, 0, 512, 192);
    c.fillStyle = '#ff3d6e'; c.fillRect(0, 0, 512, 34);
    c.fillStyle = '#fff'; c.font = '700 22px sans-serif'; c.textAlign = 'center'; c.fillText('CASHLINE ARENA · LIVE', 256, 25);
    if (Gs && Gs.md === 'push') {
      [0, 1].forEach(function (i) { c.fillStyle = CL.TEAMS[i].col; c.font = '700 22px sans-serif'; c.fillText(CL.TEAMS[i].n, 128 + i * 256, 80); c.font = '700 40px sans-serif'; c.fillText(Gs.sc[i] + '%', 128 + i * 256, 128); });
      var tp = Gs.t | 0; c.fillStyle = '#ffc94a'; c.font = '700 26px sans-serif'; c.fillText(Math.floor(tp / 60) + ':' + ('0' + tp % 60).slice(-2), 256, 176);
    } else if (Gs && Gs.sc) {
      var n = Gs.sc.length, w = 512 / n;
      Gs.sc.forEach(function (v, i) {
        c.fillStyle = CL.TEAMS[i].col; c.font = '700 22px sans-serif'; c.fillText(CL.TEAMS[i].n, w * i + w / 2, 80);
        c.font = '700 ' + (n > 3 ? 30 : 38) + 'px sans-serif'; c.fillText(fmtCash(v), w * i + w / 2, 128);
      });
      var t = Gs.t | 0; c.fillStyle = '#ffc94a'; c.font = '700 26px sans-serif'; c.fillText(Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2), 256, 176);
    } else { c.fillStyle = '#ffc94a'; c.font = '700 44px sans-serif'; c.fillText('$20,000', 256, 120); c.fillStyle = '#9aa0d0'; c.font = '600 20px sans-serif'; c.fillText('FIRST TEAM TO CASH OUT TWICE', 256, 164); }
    boardTex.needsUpdate = true;
  }

  // ----- voxel chunk meshing -----
  function hash3(x, y, z) { var h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var FACES = [
    { d: [1, 0, 0], s: 0.82, v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { d: [-1, 0, 0], s: 0.74, v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { d: [0, 1, 0], s: 1.0, v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { d: [0, -1, 0], s: 0.55, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], s: 0.9, v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
    { d: [0, 0, -1], s: 0.68, v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
  ];
  function buildChunk(cx, cz) {
    var op = [], on = [], oc = [], gp = [], gn = [], gc = [];
    var x0 = cx * 16, z0 = cz * 16;
    for (var y = 0; y < CL.H; y++) for (var z = z0; z < z0 + 16; z++) for (var x = x0; x < x0 + 16; x++) {
      var m = world.c[CL.idx(x, y, z)]; if (!m) continue;
      var M = CL.MAT[m], glass = !!M.glass;
      var base = M.col, vr = 0.92 + hash3(x, y, z) * 0.16;
      if (m === 1) { vr *= (((x >> 2) + (z >> 2)) & 1) ? 1.0 : 0.8; var dc = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ); if (dc > 9 && dc < 10.5) vr *= 1.4; }
      if (m === 2 && y % 4 === 0) vr *= 0.85;
      var P = glass ? gp : op, Nn = glass ? gn : on, C = glass ? gc : oc;
      for (var f = 0; f < 6; f++) {
        var F = FACES[f], nb = world.get(x + F.d[0], y + F.d[1], z + F.d[2]);
        if (nb && !(CL.MAT[nb] && CL.MAT[nb].glass && !glass)) continue;
        if (y === 0 && f === 3) continue;
        var sh = F.s * vr, r = base[0] * sh, g = base[1] * sh, b = base[2] * sh;
        var q = F.v, order = [0, 1, 2, 0, 2, 3];
        for (var k = 0; k < 6; k++) {
          var v = q[order[k]];
          P.push(x + v[0], y + v[1], z + v[2]); Nn.push(F.d[0], F.d[1], F.d[2]);
          // slight vertical gradient for depth
          var ao = (F.d[1] === 0 && v[1] === 0) ? 0.82 : 1;
          C.push(r * ao, g * ao, b * ao);
        }
      }
    }
    var key = cx + ',' + cz, old = chunkMeshes[key];
    if (old) { old.forEach(function (m2) { scene.remove(m2); m2.geometry.dispose(); }); }
    var meshes = [];
    [[op, on, oc, matOpaque], [gp, gn, gc, matGlass]].forEach(function (a) {
      if (!a[0].length) return;
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a[0]), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(a[1]), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(a[2]), 3));
      geo.computeBoundingSphere();
      var mesh = new THREE.Mesh(geo, a[3]); if (a[3] === matGlass) mesh.renderOrder = 2;
      scene.add(mesh); meshes.push(mesh);
    });
    chunkMeshes[key] = meshes;
  }
  function remesh(all) {
    if (!hasGL) { world.dirty = {}; return; }
    var keys = Object.keys(world.dirty), n = 0;
    for (var i = 0; i < keys.length; i++) {
      if (!all && n >= 3) break;
      var p = keys[i].split(','); buildChunk(+p[0], +p[2]); delete world.dirty[keys[i]]; n++;
    }
  }

  // ----- particles (debris) -----
  var PMAX = 2400;
  function initParticles() {
    var geo = new THREE.BufferGeometry();
    particles = { pos: new Float32Array(PMAX * 3), col: new Float32Array(PMAX * 3), vel: new Float32Array(PMAX * 3), life: new Float32Array(PMAX), n: 0, geo: geo, head: 0 };
    geo.setAttribute('position', new THREE.BufferAttribute(particles.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(particles.col, 3));
    geo.setDrawRange(0, 0);
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, sizeAttenuation: true }));
    pts.frustumCulled = false; scene.add(pts);
  }
  function emit(x, y, z, col, n, spd, up) {
    if (!particles) return;
    for (var i = 0; i < n; i++) {
      var k = particles.head; particles.head = (particles.head + 1) % PMAX; particles.n = Math.max(particles.n, particles.head === 0 ? PMAX : particles.head);
      particles.pos[k * 3] = x + (R() - 0.5) * 0.6; particles.pos[k * 3 + 1] = y + (R() - 0.5) * 0.6; particles.pos[k * 3 + 2] = z + (R() - 0.5) * 0.6;
      particles.vel[k * 3] = (R() - 0.5) * spd; particles.vel[k * 3 + 1] = R() * spd * 0.6 + (up || 0); particles.vel[k * 3 + 2] = (R() - 0.5) * spd;
      var s = 0.8 + R() * 0.3; particles.col[k * 3] = col[0] * s; particles.col[k * 3 + 1] = col[1] * s; particles.col[k * 3 + 2] = col[2] * s;
      particles.life[k] = 0.8 + R() * 1.2;
    }
  }
  function updParticles(dt) {
    if (!particles) return;
    var P = particles, live = 0;
    for (var k = 0; k < P.n; k++) {
      if (P.life[k] <= 0) { P.pos[k * 3 + 1] = -100; continue; }
      P.life[k] -= dt; live++;
      P.vel[k * 3 + 1] -= 18 * dt;
      var nx = P.pos[k * 3] + P.vel[k * 3] * dt, ny = P.pos[k * 3 + 1] + P.vel[k * 3 + 1] * dt, nz = P.pos[k * 3 + 2] + P.vel[k * 3 + 2] * dt;
      if (world.solid(nx, ny, nz)) { P.vel[k * 3] *= 0.4; P.vel[k * 3 + 2] *= 0.4; P.vel[k * 3 + 1] = -P.vel[k * 3 + 1] * 0.2; if (world.solid(nx, P.pos[k * 3 + 1], nz)) { nx = P.pos[k * 3]; nz = P.pos[k * 3 + 2]; } ny = P.pos[k * 3 + 1]; }
      P.pos[k * 3] = nx; P.pos[k * 3 + 1] = ny; P.pos[k * 3 + 2] = nz;
    }
    P.geo.setDrawRange(0, P.n); P.geo.attributes.position.needsUpdate = true; P.geo.attributes.color.needsUpdate = true;
  }
  world.onDestroy = function (x, y, z, m) {
    var col = CL.MAT[m].col;
    emit(x + 0.5, y + 0.5, z + 0.5, col, CL.MAT[m].glass ? 6 : 10, 5, 2);
    if (camera && Math.hypot(x - camera.position.x, z - camera.position.z) < 30 && R() < 0.4) Snd.play('crack', [x, y, z]);
  };

  // ----- tracers -----
  var TMAX = 96;
  function initTracers() {
    var geo = new THREE.BufferGeometry();
    tracers = { pos: new Float32Array(TMAX * 6), col: new Float32Array(TMAX * 6), life: new Float32Array(TMAX), base: new Float32Array(TMAX * 3), head: 0, geo: geo };
    geo.setAttribute('position', new THREE.BufferAttribute(tracers.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(tracers.col, 3));
    var ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ls.frustumCulled = false; scene.add(ls);
  }
  function tracer(a, b, col) {
    if (!tracers) return;
    var k = tracers.head; tracers.head = (k + 1) % TMAX;
    tracers.pos.set([a[0], a[1], a[2], b[0], b[1], b[2]], k * 6);
    tracers.base.set(col, k * 3); tracers.life[k] = 0.09;
  }
  function updTracers(dt) {
    if (!tracers) return;
    var T = tracers;
    for (var k = 0; k < TMAX; k++) {
      if (T.life[k] > 0) T.life[k] -= dt;
      var f = Math.max(0, T.life[k] / 0.09);
      for (var e = 0; e < 2; e++) for (var c = 0; c < 3; c++) T.col[k * 6 + e * 3 + c] = T.base[k * 3 + c] * f * (e ? 1 : 0.35);
    }
    T.geo.attributes.position.needsUpdate = true; T.geo.attributes.color.needsUpdate = true;
  }
  function boomFx(x, y, z, r, col) {
    if (!scene) return;
    var m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), basic(col || 0xffb347, { transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, y, z); scene.add(m); booms.push({ m: m, t: 0, r: r });
    emit(x, y, z, [1, 0.75, 0.3], 50, 12, 3); emit(x, y, z, [0.3, 0.3, 0.35], 30, 6, 2);
    var d = Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z);
    player.shake = Math.max(player.shake, Math.max(0, 1 - d / 22) * 0.6);
    Snd.play('boom', [x, y, z]);
  }
  function ringFx(x, y, z, col) {
    if (!scene) return;
    var m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 40), basic(col, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); booms.push({ m: m, t: 0, r: 8, ring: 1 });
  }
  function updBooms(dt) {
    booms = booms.filter(function (b) {
      b.t += dt; var f = b.t / (b.ring ? 0.6 : 0.45);
      if (f >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); return false; }
      var s = b.ring ? 1 + f * b.r : b.r * (0.4 + f * 0.8); b.m.scale.set(s, s, s); b.m.material.opacity = (1 - f) * 0.85; return true;
    });
  }

  // ----- objective objects -----
  function initObjects() {
    var vault = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.1), new THREE.MeshLambertMaterial({ color: 0x2b2f5e }));
    body.position.y = 0.7; vault.add(body);
    var door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.08), new THREE.MeshLambertMaterial({ color: 0xffc94a, emissive: 0x553300 }));
    door.position.set(0, 0.7, -0.58); vault.add(door);
    var dial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), basic(0x0b0c1d)); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.7, -0.64); vault.add(dial);
    var dial2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), basic(0x0b0c1d)); dial2.rotation.x = Math.PI / 2; dial2.position.set(0, 0.7, 0.58); vault.add(dial2);
    vault.visible = false; scene.add(vault); objs.vault = vault; objs.vaultDoor = door;
    var box = new THREE.Group();
    var bb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0xffc94a, emissive: 0x664400 }));
    box.add(bb);
    var strap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.52), basic(0x0b0c1d)); box.add(strap);
    box.visible = false; scene.add(box); objs.box = box;
    objs.st = CL.MAP.stations.map(function (p) {
      var g = new THREE.Group();
      var pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 24), new THREE.MeshLambertMaterial({ color: 0x23265a }));
      pad.position.y = 0.06; g.add(pad);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 40), basic(0x6a70b0)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; g.add(ring);
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), new THREE.MeshLambertMaterial({ color: 0x15173a })); post.position.set(0, 0.8, 0); g.add(post);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.56), basic(0x6a70b0)); lamp.position.y = 1.7; g.add(lamp);
      g.position.set(p[0], p[1], p[2]); scene.add(g);
      return { g: g, ring: ring, lamp: lamp };
    });
    // push platform
    var plat = new THREE.Group();
    var deck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 3.8), new THREE.MeshLambertMaterial({ color: 0x23265a })); deck.position.y = 0.08; plat.add(deck);
    objs.platEdge = [];
    [[0, 1.9, 3.9, 0.12], [0, -1.9, 3.9, 0.12], [1.9, 0, 0.12, 3.9], [-1.9, 0, 0.12, 3.9]].forEach(function (e) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(e[2], 0.2, e[3]), basic(0xffffff)); m.position.set(e[0], 0.12, e[1]); plat.add(m); objs.platEdge.push(m);
    });
    [[1.8, 1.8], [1.8, -1.8], [-1.8, 1.8], [-1.8, -1.8]].forEach(function (c) { var post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), new THREE.MeshLambertMaterial({ color: 0x15173a })); post.position.set(c[0], 0.6, c[1]); plat.add(post); });
    var core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0x15173a })); core.position.y = 0.55; plat.add(core);
    objs.platLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), basic(0xffffff)); objs.platLamp.position.y = 1.05; plat.add(objs.platLamp);
    plat.visible = false; scene.add(plat); objs.plat = plat;
    // goal glows: team 0 pushes to the west gate, team 1 to the east gate
    objs.goals = [[CL.PUSH.cx - CL.PUSH.half - 1.6, 0], [CL.PUSH.cx + CL.PUSH.half + 1.6, 1]].map(function (g) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5), basic(CL.TEAMS[g[1]].hex, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.y = Math.PI / 2; m.position.set(g[0], 3.5, CL.PUSH.z); m.visible = false; scene.add(m); return m;
    });
    ['vault', 'box', 's0', 's1'].forEach(function (k) {
      var bm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 8, 1, true), basic(0xffc94a, { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      bm.visible = false; scene.add(bm); beams[k] = bm;
    });
  }
  function setBeam(k, on, x, y, z, col) {
    var b = beams[k]; if (!b) return;
    b.visible = on; if (!on) return;
    b.position.set(x, y + 30, z); b.material.color.setHex(col);
  }
  function teamHex(t) { return t >= 0 && CL.TEAMS[t] ? CL.TEAMS[t].hex : 0x6a70b0; }

  // ----- avatars -----
  function nameSprite(text, col) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; var c = cv.getContext('2d');
    c.font = '700 30px "Chakra Petch", sans-serif'; c.textAlign = 'center';
    c.fillStyle = 'rgba(11,12,29,.7)'; var w = Math.min(250, c.measureText(text).width + 24); c.fillRect(128 - w / 2, 10, w, 44);
    c.fillStyle = col; c.fillText(text, 128, 43);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.scale.set(1.6, 0.4, 1); sp.renderOrder = 5; return sp;
  }
  function bubbleSprite(text) {
    var cv = document.createElement('canvas'); cv.width = 320; cv.height = 96; var c = cv.getContext('2d');
    c.font = '700 34px "Chakra Petch", sans-serif'; c.textAlign = 'center';
    var w = Math.min(310, c.measureText(text).width + 40);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(160 - w / 2 + 14, 8); c.arcTo(160 + w / 2, 8, 160 + w / 2, 70, 14); c.arcTo(160 + w / 2, 70, 160 - w / 2, 70, 14);
    c.lineTo(172, 70); c.lineTo(160, 90); c.lineTo(150, 70); c.arcTo(160 - w / 2, 70, 160 - w / 2, 8, 14); c.arcTo(160 - w / 2, 8, 160 + w / 2, 8, 14); c.fill();
    c.fillStyle = '#0b0c1d'; c.fillText(text, 160, 52);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.scale.set(2.0, 0.6, 1); sp.renderOrder = 6; return sp;
  }
  function makeAvatar(team, cls, name, ch) {
    var C = CLX.makeChibi(ch, teamHex(team), cls);
    var tag = nameSprite(name || '', CL.TEAMS[team] ? CL.TEAMS[team].col : '#fff'); tag.position.y = 2.32; C.g.add(tag);
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 24), basic(teamHex(team), { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; C.g.add(ring);
    scene.add(C.g);
    return { g: C.g, C: C, legL: C.legL, legR: C.legR, armL: C.armL, armR: C.armR, head: C.head, gun: C.gun, tag: tag, ring: ring, ph: 0, sq: 0, spin: 0, emSeen: null, bubble: null, bubT: 0 };
  }
  function disposeSprite(sp) { if (!sp) return; if (sp.parent) sp.parent.remove(sp); sp.material.map.dispose(); sp.material.dispose(); }
  function disposeAvatar(a) { scene.remove(a.g); disposeSprite(a.tag); disposeSprite(a.bubble); a.ring.geometry.dispose(); a.ring.material.dispose(); CLX.disposeChibi(a.C); }

  // ----- chaos: ragdolls, confetti, comic popups -----
  var rags = [], pops = [];
  function hexRGB(c) { return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]; }
  function confetti(x, y, z, cols, n) { for (var k = 0; k < n; k++) emit(x, y, z, hexRGB(cols[k % cols.length]), 1, 9, 4); }
  function popup(x, y, z, text, col, life, big) { pops.push({ x: x, y: y, z: z, text: text, col: col || '#fff', t: 0, life: life || 0.9, big: !!big }); if (pops.length > 16) pops.shift(); }
  // kind: 0 launched & bouncing, 1 explodes into pieces, 2 home run, 3 rocket
  function spawnRagdoll(info, kind, dir, isMe) {
    if (!hasGL) return null;
    var C = CLX.makeChibi(info.ch, teamHex(info.team), info.cls), rnd = Math.random;
    var rd = { C: C, t: 0, kind: kind, life: kind === 2 ? 4.5 : kind === 3 ? 2.6 : 3.4, bodies: [], conf: C.V.conf.concat([teamHex(info.team)]), lastBoing: -1, focus: null };
    if (kind === 1) {
      C.g.position.set(info.x, info.y, info.z); C.g.rotation.y = info.yw || 0; scene.add(C.g); C.g.updateMatrixWorld(true);
      C.meshes.forEach(function (m) {
        var wp = new THREE.Vector3(), wq = new THREE.Quaternion(), headPart = m.parent === C.head;
        m.getWorldPosition(wp); m.getWorldQuaternion(wq);
        m.parent.remove(m); m.position.copy(wp); m.quaternion.copy(wq); scene.add(m);
        var b = { m: m, p: [wp.x, wp.y, wp.z], v: [(rnd() - 0.5) * 11 + dir[0] * 5, 5 + rnd() * 9, (rnd() - 0.5) * 11 + dir[1] * 5], av: [(rnd() - 0.5) * 18, (rnd() - 0.5) * 18, (rnd() - 0.5) * 18], r: 0.08, g: 20, own: true };
        rd.bodies.push(b); if (headPart && !rd.focus) rd.focus = b;
      });
      scene.remove(C.g);
      confetti(info.x, info.y + 1, info.z, rd.conf, 60);
      emit(info.x, info.y + 1, info.z, [1, 0.8, 0.4], 25, 10, 3);
    } else {
      var piv = new THREE.Group(); piv.position.set(info.x, info.y + 0.95, info.z); piv.rotation.y = info.yw || 0;
      C.g.position.set(0, -0.95, 0); piv.add(C.g); scene.add(piv); rd.piv = piv;
      var h = kind === 2 ? 24 : kind === 3 ? 1.5 : 8 + rnd() * 5, up = kind === 2 ? 15 : kind === 3 ? 5 : 7 + rnd() * 4;
      rd.bodies.push({ m: piv, p: [info.x, info.y + 0.95, info.z], v: [dir[0] * h, up, dir[1] * h], av: kind === 3 ? [0, 16, 0] : [(rnd() - 0.5) * 12, (rnd() - 0.5) * 12, (rnd() - 0.5) * 12], r: 0.45, g: kind === 2 ? 8 : kind === 3 ? -15 : 18 });
      confetti(info.x, info.y + 1, info.z, rd.conf, 18);
    }
    rd.focus = rd.focus || rd.bodies[0];
    rags.push(rd); return rd;
  }
  function updRagdolls(dt) {
    rags = rags.filter(function (rd) {
      rd.t += dt;
      rd.bodies.forEach(function (b) {
        if (rd.kind === 3) { b.v[1] = Math.min(b.v[1] - b.g * dt, 28); if (R() < 0.9) emit(b.p[0], b.p[1] - 0.7, b.p[2], [1, 0.55 + R() * 0.4, 0.2], 1, 2, -4); }
        else b.v[1] -= b.g * dt;
        for (var a = 0; a < 3; a++) {
          var np = b.p[a] + b.v[a] * dt, probe = b.p.slice(); probe[a] = np + (b.v[a] > 0 ? 1 : -1) * b.r;
          var inside = probe[0] >= 0 && probe[2] >= 0 && probe[0] < CL.W && probe[2] < CL.D;
          if ((inside || probe[1] < 0) && world.solid(probe[0], probe[1], probe[2])) {
            var spd = Math.abs(b.v[a]);
            b.v[a] = -b.v[a] * (rd.kind === 1 ? 0.45 : 0.7);
            if (a === 1) { b.v[0] *= 0.82; b.v[2] *= 0.82; b.av[0] *= 0.7; b.av[1] *= 0.7; b.av[2] *= 0.7; }
            if (spd > 4 && rd.kind !== 1 && rd.t - rd.lastBoing > 0.15) { rd.lastBoing = rd.t; Snd.play('boing', b.p); popup(b.p[0], b.p[1] + 0.9, b.p[2], 'ดึ๋ง!', '#ffffff', 0.7); }
          } else b.p[a] = np;
        }
        b.m.position.set(b.p[0], b.p[1], b.p[2]);
        b.m.rotation.x += b.av[0] * dt; b.m.rotation.y += b.av[1] * dt; b.m.rotation.z += b.av[2] * dt;
      });
      var f = rd.focus, p = f ? f.p : [0, 0, 0];
      if (rd.t < rd.life && p[1] < 80) return true;
      if (rd.kind === 2 || rd.kind === 3) {
        Snd.play('ping', p);
        for (var k = 0; k < 4; k++) emit(p[0], p[1], p[2], hexRGB(rd.conf[k % rd.conf.length]), 16, 10, 0);
        if (rd.kind === 2) popup(p[0], p[1] + 1, p[2], '✦', '#ffc94a', 1.2, true);
      } else Snd.play('pop', p);
      confetti(p[0], p[1], p[2], rd.conf, rd.kind === 1 ? 20 : 45);
      if (rd.piv) scene.remove(rd.piv);
      rd.bodies.forEach(function (b) { if (b.own) scene.remove(b.m); });
      CLX.disposeChibi(rd.C);
      if (GC.myRag === rd) GC.myRag = null;
      return false;
    });
  }
  var DK_TXT = ['ปลิว~', 'ตูม!', 'โฮมรัน!!', 'ฟิ้ววว~'];
  var HIT_TXT = ['ปั้ก!', 'โป๊ก!', 'ตุ้บ!', 'เปรี้ยง!', 'แป๊ะ!'];
  function spawnDeath(L, v, a, dk) {
    var info = GC.lastPos[v]; if (!info) return;
    dk = dk >= 0 && dk <= 3 ? dk : 0;
    var kp = a >= 0 && a !== v ? GC.lastPos[a] : null;
    var dx = kp ? info.x - kp.x : -Math.sin(info.yw || 0), dz = kp ? info.z - kp.z : -Math.cos(info.yw || 0), dl = Math.hypot(dx, dz) || 1;
    var rd = spawnRagdoll(info, dk, [dx / dl, dz / dl], v === GC.mySlot);
    if (v === GC.mySlot) GC.myRag = rd;
    popup(info.x, info.y + 2.4, info.z, DK_TXT[dk], dk === 2 ? '#ffc94a' : '#ffffff', 1.4, true);
    Snd.play(dk === 2 ? 'home' : dk === 1 ? 'pop' : 'whistle', [info.x, info.y, info.z]);
    if (a === GC.mySlot && v !== a) {
      var n = slotName(L, v);
      toast(DK_TXT[dk], [n + ' ปลิวไปไกลเลย', n + ' ระเบิดเป็นชิ้นๆ', 'ตี ' + n + ' ออกนอกสนาม', 'ส่ง ' + n + ' ขึ้นอวกาศ'][dk], '#ffc94a');
    }
  }
  function renderPops(dt) {
    var html = [];
    tmpV = tmpV || new THREE.Vector3();
    pops = pops.filter(function (p) {
      p.t += dt; if (p.t >= p.life) return false;
      if (!camera) return true;
      tmpV.set(p.x, p.y + p.t * 1.1, p.z); tmpV.project(camera);
      if (tmpV.z > 1 || Math.abs(tmpV.x) > 1.2 || Math.abs(tmpV.y) > 1.2) return true;
      var sx = (tmpV.x * 0.5 + 0.5) * innerWidth, sy = (-tmpV.y * 0.5 + 0.5) * innerHeight, k = p.t / p.life;
      var sc = (p.big ? 1.5 : 1) * (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - k * 0.1);
      html.push('<div class="pop" style="left:' + sx.toFixed(0) + 'px;top:' + sy.toFixed(0) + 'px;color:' + p.col + ';opacity:' + (1 - Math.max(0, k - 0.7) / 0.3).toFixed(2) + ';transform:translate(-50%,-50%) scale(' + sc.toFixed(2) + ') rotate(' + (((p.x * 7) % 1) * 16 - 8).toFixed(0) + 'deg)">' + esc(p.text) + '</div>');
      return true;
    });
    setHTML('pops', html.join(''));
  }

  // ----- first-person viewmodel -----
  function buildVM(id) {
    if (!hasGL) return;
    if (vm) { vmRoot.remove(vm.g); }
    var g = new THREE.Group(), dark = new THREE.MeshLambertMaterial({ color: 0x23254a }), acc = new THREE.MeshLambertMaterial({ color: CL.TEAMS[GC.myTeam >= 0 ? GC.myTeam : 0].hex });
    var muzzleZ = -0.6;
    if (id === 'hammer') {
      var handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a6a40 })); handle.position.set(0, 0, -0.3); g.add(handle);
      var hd = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.24), dark); hd.position.set(0, 0, -0.75); g.add(hd);
      var st = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.26), acc); st.position.set(0, 0, -0.75); g.add(st);
      g.rotation.set(0.5, 0.2, 0.4);
    } else {
      var L = { smg: 0.45, dmr: 0.85, ar: 0.7, sg: 0.75, lmg: 0.8 }[id] || 0.6, Hh = { lmg: 0.16, sg: 0.13 }[id] || 0.11;
      var bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.09, Hh, L), dark); bodyM.position.z = -L / 2; g.add(bodyM);
      var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), dark); barrel.position.set(0, 0.02, -L - 0.12); g.add(barrel);
      var grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), dark); grip.position.set(0, -0.12, -0.12); g.add(grip);
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.03, L * 0.6), acc); stripe.position.set(0, Hh / 2, -L / 2); g.add(stripe);
      if (id === 'dmr') { var sc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), dark); sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.1, -0.35); g.add(sc); }
      if (id === 'lmg') { var drum = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), acc); drum.position.set(0, -0.12, -0.35); g.add(drum); }
      muzzleZ = -L - 0.27;
    }
    var flash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), basic(0xffe9a8, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    flash.position.set(0, 0.02, muzzleZ); flash.visible = false; g.add(flash);
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.38), new THREE.MeshLambertMaterial({ color: 0xffc94a, emissive: 0x553300 }));
    box.position.set(-0.22, 0.05, -0.2); box.visible = false;
    var gr = new THREE.Group(); gr.add(g); gr.add(box);
    gr.traverse(function (o) { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
    vmRoot.add(gr);
    vm = { g: gr, gun: g, flash: flash, box: box, muzzleZ: muzzleZ, kick: 0, swing: 0 };
    vmKind = id;
  }

  // =================== INPUT ===================
  var keys = {}, mouse = { l: 0, r: 0, dx: 0, dy: 0, lPress: 0 }, locked = false, hadLock = false;
  var touch = { mx: 0, mz: 0, fire: 0, aim: 0, jump: 0, use: 0, crouch: 0, gad: 0, spec: 0, reload: 0, lookId: null, joyId: null, jx: 0, jy: 0, lx: 0, ly: 0 };
  var pressed = {}; // edge-triggered actions consumed by player update
  function press(a) { pressed[a] = 1; }
  addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (GC.active && ['Tab', 'Space', 'KeyQ', 'KeyF', 'KeyE', 'KeyR'].indexOf(e.code) >= 0) e.preventDefault();
    if (!keys[e.code]) {
      if (e.code === 'KeyT') press('emote');
      if (e.code === 'Space') press('jump'); if (e.code === 'KeyR') press('reload'); if (e.code === 'KeyQ') press('gad'); if (e.code === 'KeyF') press('spec');
      if (e.code === 'Escape' && GC.active && !locked) togglePause();
    }
    keys[e.code] = 1;
  });
  addEventListener('keyup', function (e) { keys[e.code] = 0; });
  addEventListener('blur', function () { keys = {}; mouse.l = mouse.r = 0; });
  var gl = $('gl');
  gl.addEventListener('mousedown', function (e) {
    if (!GC.active) return;
    if (!locked && !isTouch) { requestLock(); }
    if (e.button === 0) { mouse.l = 1; mouse.lPress = 1; } if (e.button === 2) mouse.r = 1;
  });
  addEventListener('mouseup', function (e) { if (e.button === 0) mouse.l = 0; if (e.button === 2) mouse.r = 0; });
  addEventListener('contextmenu', function (e) { if (GC.active) e.preventDefault(); });
  addEventListener('mousemove', function (e) { if (GC.active && (locked || mouse.l || mouse.r) && !isTouch) { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; } });
  function requestLock() {
    try { var p = gl.requestPointerLock && gl.requestPointerLock(); if (p && p.catch) p.catch(function () { }); } catch (e) { }
  }
  document.addEventListener('pointerlockchange', function () {
    locked = document.pointerLockElement === gl;
    if (locked) hadLock = true;
    else if (hadLock && GC.active && !$('pause').hidden === false) { showPause(true); }
  });
  // touch controls
  function setupTouch() {
    var joy = $('tjoy'), look = $('tlook'), knob = $('knob'), knobI = $('knobI');
    joy.addEventListener('pointerdown', function (e) { touch.joyId = e.pointerId; touch.jx = e.clientX; touch.jy = e.clientY; knob.hidden = false; knob.style.left = e.clientX + 'px'; knob.style.top = e.clientY + 'px'; knobI.style.transform = 'translate(-50%,-50%)'; try { joy.setPointerCapture(e.pointerId); } catch (er) { } });
    joy.addEventListener('pointermove', function (e) {
      if (e.pointerId !== touch.joyId) return;
      var dx = e.clientX - touch.jx, dy = e.clientY - touch.jy, L = Math.hypot(dx, dy), m = Math.min(1, L / 50);
      touch.mx = L ? dx / L * m : 0; touch.mz = L ? dy / L * m : 0;
      var cl = Math.min(L, 50); knobI.style.transform = 'translate(calc(-50% + ' + (L ? dx / L * cl : 0) + 'px), calc(-50% + ' + (L ? dy / L * cl : 0) + 'px))';
    });
    var endJoy = function (e) { if (e.pointerId !== touch.joyId) return; touch.joyId = null; touch.mx = touch.mz = 0; knob.hidden = true; };
    joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);
    var lookStart = function (e) { touch.lookId = e.pointerId; touch.lx = e.clientX; touch.ly = e.clientY; };
    var lookMove = function (e) { if (e.pointerId !== touch.lookId) return; mouse.dx += (e.clientX - touch.lx) * 1.6; mouse.dy += (e.clientY - touch.ly) * 1.6; touch.lx = e.clientX; touch.ly = e.clientY; };
    var lookEnd = function (e) { if (e.pointerId === touch.lookId) touch.lookId = null; };
    look.addEventListener('pointerdown', function (e) { lookStart(e); try { look.setPointerCapture(e.pointerId); } catch (er) { } });
    look.addEventListener('pointermove', lookMove); look.addEventListener('pointerup', lookEnd); look.addEventListener('pointercancel', lookEnd);
    var btn = function (id, k, onPress) {
      var b = $(id);
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); touch[k] = 1; b.classList.add('on'); if (onPress) onPress(); if (k === 'fire') { mouse.lPress = 1; lookStart(e); } try { b.setPointerCapture(e.pointerId); } catch (er) { } });
      b.addEventListener('pointermove', function (e) { if (k === 'fire') lookMove(e); });
      var up = function (e) { touch[k] = 0; b.classList.remove('on'); if (k === 'fire') lookEnd(e); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    };
    btn('tFire', 'fire'); btn('tAim', 'aim'); btn('tUse', 'use'); btn('tCrouch', 'crouch');
    btn('tJump', 'jump', function () { press('jump'); }); btn('tGad', 'gad', function () { press('gad'); }); btn('tSpec', 'spec', function () { press('spec'); }); btn('tReload', 'reload', function () { press('reload'); });
    $('tMenu').addEventListener('click', function () { showPause(true); });
  }

  // =================== NETWORK / SESSION ===================
  var ROOM = null, roomReady = false, roomState = 'wait'; // wait | on | off
  var sess = null, Host = { L: null, M: null, G: null }, lastL = null, lastG = null, lastHostPeer = null;
  var CODECH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function newCode() { var s = ''; for (var i = 0; i < 4; i++) s += CODECH[Math.floor(R() * CODECH.length)]; return s; }
  function initRoom() {
    if (!(window.claude && typeof window.claude.use === 'function')) { roomState = 'off'; updNet(); return; }
    Promise.resolve().then(function () { return window.claude.use('room'); }).then(function (r) {
      ROOM = r; roomState = r ? 'on' : 'off'; updNet();
      if (r) r.onPeers(function () { roomReady = true; }, function () { roomState = 'off'; ROOM = null; updNet(); });
    }).catch(function () { roomState = 'off'; updNet(); });
  }
  function updNet() {
    var d = $('netDot'), t = $('netTxt'), q = $('qcNet');
    d.className = 'dot' + (roomState === 'on' ? ' on' : roomState === 'off' ? ' off' : '');
    t.textContent = roomState === 'on' ? 'ระบบห้องออนไลน์พร้อม · เล่นกับเพื่อนได้' : roomState === 'off' ? 'ออนไลน์ไม่พร้อมใช้งานในหน้านี้ · เล่นกับบอทได้' : 'กำลังเชื่อมต่อระบบห้องออนไลน์…';
    q.textContent = roomState === 'on' ? 'ออนไลน์พร้อม' : roomState === 'off' ? 'ออนไลน์ไม่พร้อม · ใช้โหมดบอทได้' : 'กำลังเชื่อมต่อ…';
    ['bQuick', 'bCreate', 'bJoin'].forEach(function (id) { $(id).disabled = roomState !== 'on'; });
  }
  function Session(code, online, priv) {
    this.code = code; this.online = online; this.priv = priv; this.nr = null; this.local = {}; this.sent = {}; this.lastSendT = 0; this.lastSendS = '';
    this.t0 = performance.now(); this.myPeer = online ? null : 'local'; this.closed = false; this.adS = '';
  }
  Session.prototype.open = function () {
    var self = this;
    if (!this.online) return Promise.resolve(this);
    return ROOM.join('cl-' + this.code.toLowerCase()).then(function (nr) {
      if (self.closed) { nr.leave(); throw new Error('closed'); }
      self.nr = nr; self.t0 = performance.now(); return self;
    });
  };
  Session.prototype.peers = function () {
    if (!this.online) return [{ peer: 'local', isMe: true, sameTab: true, presence: this.local }];
    return this.nr ? this.nr.peers() : [];
  };
  Session.prototype.me = function () {
    if (!this.online) return 'local';
    if (this.myPeer) return this.myPeer;
    var ps = this.peers();
    for (var i = 0; i < ps.length; i++) if (ps[i].isMe && ps[i].sameTab) { this.myPeer = ps[i].peer; break; }
    return this.myPeer;
  };
  Session.prototype.age = function () { return (performance.now() - this.t0) / 1000; };
  Session.prototype.send = function (obj, force) {
    var s = JSON.stringify(obj), now = performance.now();
    if (!force && s === this.lastSendS && now - this.lastSendT < 1000) return;
    if (!this.online) { this.local = JSON.parse(s); this.lastSendS = s; this.lastSendT = now; return; }
    if (!this.nr) return;
    var patch = {}, k;
    for (k in obj) patch[k] = obj[k];
    for (k in this.sent) if (!(k in obj)) patch[k] = null;
    this.sent = {}; for (k in obj) this.sent[k] = 1;
    this.lastSendS = s; this.lastSendT = now;
    this.nr.presence(patch).catch(function () { });
  };
  Session.prototype.ad = function (a) {
    if (!this.online || !ROOM) return;
    var s = JSON.stringify(a);
    if (s === this.adS) return; this.adS = s;
    ROOM.presence({ ad: a }).catch(function () { });
  };
  Session.prototype.close = function () {
    this.closed = true;
    if (this.online) { if (this.nr) this.nr.leave().catch(function () { }); if (ROOM) ROOM.presence({ ad: null }).catch(function () { }); }
  };
  function minPeer(arr) { var b = null; arr.forEach(function (p) { if (!b || p.peer < b.peer) b = p; }); return b; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function freshLobby() {
    var md = (sess && sess.md) || selMode;
    var f = modeFmt(md, (sess && sess.fmt) || store.get('fmt_' + md, CL.MODES[md].def));
    return { md: md, f: f, s: new Array(CL.slotCount(f)).fill(null), nm: [], st: 'lobby', cd: 0, mid: '', seed: 0, r: null, code: sess ? sess.code : '', pv: sess && sess.priv ? 1 : 0 };
  }

  // ----- host controller -----
  function presenceOf(peers, peer) { for (var i = 0; i < peers.length; i++) if (peers[i].peer === peer) return peers[i].presence || {}; return null; }
  function hostAssign(L, humans) {
    var present = {}; humans.forEach(function (h) { present[h.peer] = h; });
    var cnt = CL.slotCount(L.f), size = CL.FORMATS[L.f].size, i;
    if (L.s.length !== cnt) {
      var kept = L.s.filter(function (p) { return p && present[p]; }), ns = new Array(cnt).fill(null);
      kept.slice(0, cnt).forEach(function (p, k) { ns[k * size % cnt + Math.floor(k * size / cnt)] = p; });
      L.s = ns;
    }
    var changed = [];
    for (i = 0; i < L.s.length; i++) if (L.s[i] && !present[L.s[i]]) { L.s[i] = null; changed.push(i); }
    humans.forEach(function (h) {
      if (L.s.indexOf(h.peer) >= 0) return;
      // choose free slot on the team with the fewest humans
      var best = -1, bc = 1e9;
      for (var j = 0; j < L.s.length; j++) {
        if (L.s[j]) continue;
        var t = CL.slotTeam(L.f, j), c = 0;
        for (var k = 0; k < L.s.length; k++) if (L.s[k] && CL.slotTeam(L.f, k) === t) c++;
        if (c < bc) { bc = c; best = j; }
      }
      if (best >= 0) { L.s[best] = h.peer; changed.push(best); }
    });
    if (L.st === 'lobby') humans.forEach(function (h) {
      var w = h.presence.want;
      if (typeof w === 'number' && w >= 0 && w < L.s.length && !L.s[w]) { var cur = L.s.indexOf(h.peer); if (cur >= 0) L.s[cur] = null; L.s[w] = h.peer; }
    });
    return changed;
  }
  function hostUpdate(dt, peers) {
    var L = Host.L;
    var humans = peers.filter(function (p) { return p.presence && p.presence.v === 1; });
    var changed = hostAssign(L, humans);
    // names per slot
    L.nm = L.s.map(function (p, i) {
      if (p) { var pr = presenceOf(peers, p); return cleanName(pr && pr.n); }
      return Host.M && Host.M.slots[i] && !Host.M.slots[i].human ? Host.M.slots[i].name : CL.BOTNAMES[i % CL.BOTNAMES.length];
    });
    if (L.st === 'load' || L.st === 'match') {
      var M = Host.M;
      if (!M) { startMatch(peers); M = Host.M; }
      // humans joining/leaving mid-match
      changed.forEach(function (i) {
        var s = M.slots[i]; if (!s) return;
        var p = L.s[i];
        if (p) { var pr = presenceOf(peers, p) || {}; s.human = true; s.name = cleanName(pr.n); if (CL.CHI[pr.ch] != null) s.ch = pr.ch; if (pr.c && CL.CLASSES[pr.c]) { s.cls = pr.c; s.hw = CL.CLASSES[pr.c].hw; } if (pr.w) s.wpn = pr.w; s.ack = 0; s.bot = null; M.respawn(s); }
        else { s.human = false; s.bot = null; s.name = CL.BOTNAMES[i % CL.BOTNAMES.length]; }
      });
      if (L.st === 'load') {
        L.cd -= dt;
        if (L.cd <= 0) { L.st = 'match'; L.cd = 0; }
      } else {
        for (var i = 0; i < L.s.length; i++) {
          if (!L.s[i]) continue;
          var pr = presenceOf(peers, L.s[i]); var pl = pr && pr.pl;
          if (!pl || pl.mid !== L.mid) continue;
          M.setHuman(i, { x: pl.x / 100, y: pl.y / 100, z: pl.z / 100, yw: pl.yw / 1000, pt: pl.pt / 1000, cr: pl.cr, u: pl.u, sh: pl.sh, sn: pl.sn });
          M.applyClaims(i, pl.cl);
        }
        M.tick(dt);
        if (M.over) {
          L.st = 'res';
          L.r = { md: M.mode, wn: M.winner, sc: M.sc.slice(), pl: M.slots.map(function (s) { return [s.name, s.team, s.k, s.d, Math.round(s.cash), s.human ? 1 : 0]; }) };
        }
      }
      // ops window
      var rq = null;
      humans.forEach(function (h) { var pl2 = h.presence.pl; if (pl2 && pl2.mid === L.mid && typeof pl2.rs === 'number') rq = rq == null ? pl2.rs : Math.min(rq, pl2.rs); });
      var G = M.snap();
      G.mid = L.mid;
      Host.G = G; Host.rq = rq;
    } else { Host.G = null; }
  }
  function startMatch(peers) {
    var L = Host.L;
    world.c.fill(0); CL.genMap(world, L.md);
    var slots = L.s.map(function (p, i) {
      if (!p) return { human: false };
      var pr = presenceOf(peers, p) || {};
      var c = CL.CLASSES[pr.c] ? pr.c : 'medium';
      return { human: true, name: cleanName(pr.n), cls: c, wpn: CL.CLASSES[c].wpns.indexOf(pr.w) >= 0 ? pr.w : CL.CLASSES[c].wpns[0], ch: CL.CHI[pr.ch] != null ? pr.ch : 'bob' };
    });
    // bots take characters nobody picked
    var used = {}; slots.forEach(function (s) { if (s.human) used[s.ch] = 1; });
    var pool = CL.CHARS.map(function (c) { return c.id; }).filter(function (id) { return !used[id]; });
    for (var pi = pool.length - 1; pi > 0; pi--) { var pj = Math.floor(R() * (pi + 1)), tmp = pool[pi]; pool[pi] = pool[pj]; pool[pj] = tmp; }
    slots.forEach(function (s) { if (!s.human) s.ch = pool.shift() || CL.CHARS[Math.floor(R() * CL.CHARS.length)].id; });
    Host.M = new CL.Match({ fmt: L.f, mode: L.md, seed: L.seed, world: world, slots: slots });
  }
  function hostStart() {
    var L = Host.L; if (!L || L.st !== 'lobby') return;
    L.st = 'load'; L.cd = 5; L.mid = Math.floor(R() * 1e9).toString(36); L.seed = Math.floor(R() * 1e9); L.r = null;
    Host.M = null;
    startMatch(sess.peers());
    Snd.play('ui');
  }
  function hostBackToLobby() { var L = Host.L; if (!L) return; L.st = 'lobby'; L.r = null; L.mid = ''; Host.M = null; Host.G = null; }
  // adopt the previous host's match after migration
  function adoptMatch(L, G, peers) {
    var slots = L.s.map(function (p, i) {
      var b = (G.bt || []).filter(function (x) { return x[0] === i; })[0];
      if (p) { var pr = presenceOf(peers, p); if (pr) return { human: true, name: cleanName(pr.n), cls: pr.c || 'medium', wpn: pr.w, ch: pr.ch }; }
      return { human: false, cls: b ? b[8] : (presenceOf(peers, p) || {}).c, wpn: b ? b[9] : null, name: L.nm[i], ch: b ? b[10] : null };
    });
    slots.forEach(function (s) { if (!CL.CLASSES[s.cls]) s.cls = 'medium'; if (CL.CLASSES[s.cls].wpns.indexOf(s.wpn) < 0) s.wpn = CL.CLASSES[s.cls].wpns[0]; });
    var M = new CL.Match({ fmt: L.f, mode: L.md, seed: L.seed, world: world, slots: slots });
    M.pp = (G.pp || 0) / 1000; M.pst = G.ps == null ? -1 : G.ps;
    M.t = G.t; M.ph = G.ph; M.sc = G.sc.slice(); M.vi = G.vi; M.vp = G.vp / 100; M.inter = CL.RULES.interTime * 0.5;
    M.cb = G.cb ? { x: G.cb[0] / 100, y: G.cb[1] / 100, z: G.cb[2] / 100, vx: 0, vy: 0, vz: 0, car: G.cb[3] } : null;
    M.st = (G.st || []).map(function (a) { return { i: a[0], o: a[1], p: a[2] / 1000, dep: a[3] }; });
    M.slots.forEach(function (s, i) {
      s.hp = G.hp[i]; s.rt = G.rt[i]; s.alive = G.rt[i] === 0 && G.hp[i] > 0;
      s.k = G.kd[i][0]; s.d = G.kd[i][1]; s.cash = G.kd[i][2]; s.ack = G.ak[i]; s.spn = G.sp[i][0];
      s.x = G.sp[i][1] / 100; s.y = G.sp[i][2] / 100; s.z = G.sp[i][3] / 100; s.sp = [s.x, s.y, s.z, G.sp[i][4] / 1000];
      var rp = L.s[i] && presenceOf(peers, L.s[i]); var rpl = rp && rp.pl;
      if (rpl && rpl.mid === L.mid) { s.x = rpl.x / 100; s.y = rpl.y / 100; s.z = rpl.z / 100; }
    });
    (G.bt || []).forEach(function (b) { var s = M.slots[b[0]]; if (s) { s.x = b[1] / 100; s.y = b[2] / 100; s.z = b[3] / 100; s.yw = b[4] / 1000; } });
    if (M.cb && M.cb.car >= 0 && !M.slots[M.cb.car].alive) M.cb.car = -1;
    M.kbSeq = GC.kbMax || 0;
    M.ops = GC.opLog.slice(); M.feedSeq = GC.lastFeed; M.fxSeq = GC.lastFx; M.feed = []; M.fx = [];
    M.pjSeq = 1 + Math.max.apply(null, [0].concat((G.pj || []).map(function (p) { return p[0]; })));
    Host.M = M;
  }

  // ----- session tick -----
  var hostPresenceSizeWarn = 0, enc = window.TextEncoder ? new TextEncoder() : null;
  function bytes(o) { var s = typeof o === 'string' ? o : JSON.stringify(o); return enc ? enc.encode(s).length : s.length * 3; }
  function sessionTick(dt) {
    var peers = sess.peers(), me = sess.me();
    if (sess.online && !me) { routeScreen(null); return; }
    var cand = peers.filter(function (p) { return p.presence && p.presence.v === 1 && p.presence.vis !== 0; });
    if (!cand.length) cand = peers.filter(function (p) { return p.presence && p.presence.v === 1; });
    var hosting = cand.filter(function (p) { return p.presence.H; });
    var host = null;
    if (hosting.length) host = minPeer(hosting);
    else if (cand.length) { var m = minPeer(cand); if (!sess.online || m.peer !== me || sess.age() > 1.6) host = m; }
    var amHost = !!(host && host.peer === me);
    if (amHost && !Host.L) {
      // becoming host: fresh lobby, or take over the last state we saw (migration)
      if (lastL && lastL.code === sess.code) {
        Host.L = clone(lastL);
        if ((Host.L.st === 'match' || Host.L.st === 'load') && lastG && lastG.mid === Host.L.mid) adoptMatch(Host.L, lastG, peers);
        else if (Host.L.st === 'match' || Host.L.st === 'load') { Host.L.st = 'lobby'; Host.L.mid = ''; }
      } else Host.L = freshLobby();
    }
    if (!amHost && Host.L) { Host.L = null; Host.M = null; Host.G = null; }
    if (amHost) hostUpdate(dt, peers);
    var L = amHost ? Host.L : (host && host.presence.L) || null;
    var Gs = amHost ? Host.G : (host && host.presence.G) || null;
    if (L) lastL = L; if (Gs) lastG = Gs;
    GC.amHost = amHost; GC.hostPeer = host ? host.peer : null; GC.peers = peers; GC.me = me;
    routeScreen(L);
    if (L && (L.st === 'load' || L.st === 'match' || L.st === 'res')) clientMatch(L, Gs, peers, dt);
    // presence out (20Hz)
    sess.acc = (sess.acc || 0) + dt;
    if (sess.acc >= 0.05) { sess.acc = 0; sendPresence(L, amHost); }
    if (amHost && sess.online && !sess.priv) {
      var humans = Host.L.s.filter(Boolean).length;
      sess.ad({ c: sess.code, n: humans, cap: Host.L.s.length, st: Host.L.st, f: Host.L.f, md: Host.L.md });
    } else if (sess.online && sess.adS && sess.adS !== 'null') sess.ad(null);
  }
  function sendPresence(L, amHost) {
    var o = { v: 1, n: cleanName(prof.name), c: prof.cls, w: myWpn(), ch: prof.ch, vis: document.hidden ? 0 : 1, rd: GC.ready ? 1 : 0 };
    if (GC.want != null) o.want = GC.want;
    if (L && (L.st === 'match') && GC.mid === L.mid && GC.mySlot >= 0) {
      var p = player, b = p.b;
      o.pl = { mid: GC.mid, sn: GC.lastSpn, x: Math.round(b.x * 100), y: Math.round(b.y * 100), z: Math.round(b.z * 100), yw: Math.round(p.yaw * 1000), pt: Math.round(p.pitch * 1000), cr: p.crouch ? 1 : 0, u: p.use ? 1 : 0, sh: p.shots, w: p.wpnId, c: p.cls, em: p.em || 0 };
      var cl = GC.claims; if (cl.length > 40) cl = cl.slice(cl.length - 40);
      if (cl.length) o.pl.cl = cl;
      if (GC.needRs != null) o.pl.rs = GC.needRs;
    }
    if (amHost && Host.L) {
      o.H = 1; o.L = Host.L;
      if (Host.G) {
        var base = bytes(o) + bytes(Host.G) + 40;
        var budget = Math.max(200, 3850 - base);
        var M = Host.M, start = Host.rq != null ? Math.min(Host.rq, M.ops.length) : CL.tailStart(M.ops, budget);
        Host.G.dq = [start, CL.opWindow(M.ops, start, budget)];
        o.G = Host.G;
        var size = bytes(o);
        if (size > 4000) { Host.G.dq = [M.ops.length, []]; if (++hostPresenceSizeWarn < 5) console.warn('presence near limit', size); }
      }
    }
    sess.send(o);
  }

  // =================== CLIENT GAME STATE ===================
  var GC = {
    active: false, mid: '', mySlot: -1, myTeam: -1, opCount: 0, opLog: [], needRs: null, claims: [], seq: 0, lastFeed: 0, lastFx: 0, lastSpn: -1,
    rb: {}, lastSh: {}, lastPos: {}, wasAliveS: {}, prevHp: {}, lastKb: 0, kbReady: false, kbMax: 0, myRag: null, ready: false, want: null, amHost: false, peers: [], me: null, killer: -1, lastHp: 0, wasAlive: false, fmt: '1v1v1', L: null, G: null, fed: {}
  };
  var player = {
    b: { x: CL.CX, y: 1, z: CL.CZ, vx: 0, vy: 0, vz: 0, hw: 0.32, h: 1.75, onGround: false }, yaw: 0, pitch: 0, crouch: false, use: false, shots: 0,
    cls: 'medium', wpnId: 'ar', ammo: 30, rl: 0, cd: 0, gad: 2, gadT: 0, specT: 0, dashT: 0, chargeT: 0, chargeHit: {}, eyeOff: 0, shake: 0, bob: 0, ads: false, alive: false, lastFireHeld: false
  };
  function claim(arr) {
    GC.seq++; var c = [GC.seq].concat(arr);
    if (GC.amHost && Host.M && GC.mySlot >= 0) Host.M.applyClaims(GC.mySlot, [c]);
    else GC.claims.push(c);
  }
  function newMatchLocal(L) {
    GC.mid = L.mid;
    if (!GC.amHost) { world.c.fill(0); CL.genMap(world, L.md); }
    GC.platX = CX; GC.lastPs = -2;
    remesh(true);
    GC.opCount = 0; GC.opLog = []; GC.needRs = null; GC.claims = []; GC.seq = 0; GC.lastFeed = 0; GC.lastFx = 0; GC.lastSpn = -1;
    GC.rb = {}; GC.lastSh = {}; GC.killer = -1; GC.wasAlive = false; GC.fed = {};
    GC.lastPos = {}; GC.wasAliveS = {}; GC.prevHp = {}; GC.lastKb = 0; GC.kbReady = false; GC.myRag = null;
    Object.keys(avatars).forEach(function (k) { disposeAvatar(avatars[k]); delete avatars[k]; });
    $('hFeed').innerHTML = '';
    player.cls = prof.cls; player.wpnId = myWpn();
  }
  function resetLoadout() {
    var c = CL.CLASSES[player.cls], wd = CL.WEAPONS[CL.WI[player.wpnId]];
    player.ammo = wd.mag; player.rl = 0; player.cd = 0; player.gad = c.gadN; player.gadT = 0; player.specT = 0; player.dashT = 0; player.chargeT = 0;
    player.b.hw = c.hw;
    buildVM(player.wpnId);
  }
  function slotAlive(G, i) { return G && G.hp && G.hp[i] > 0 && G.rt[i] === 0; }
  function slotData(L, G, peers, i) {
    // where a slot's avatar is, from its owner's presence or the host's bot list
    var p = L.s[i];
    if (p) {
      var pr = presenceOf(peers, p), pl = pr && pr.pl;
      var pch = pr && CL.CHI[pr.ch] != null ? pr.ch : 'bob';
      if (pl && pl.mid === L.mid) return { x: pl.x / 100, y: pl.y / 100, z: pl.z / 100, yw: pl.yw / 1000, pt: pl.pt / 1000, sh: pl.sh, cr: pl.cr, cls: pl.c, wpn: pl.w, ch: pch, em: pl.em || 0 };
      if (G && G.sp && G.sp[i]) return { x: G.sp[i][1] / 100, y: G.sp[i][2] / 100, z: G.sp[i][3] / 100, yw: G.sp[i][4] / 1000, pt: 0, sh: 0, cr: 0, cls: pr && pr.c, wpn: pr && pr.w, ch: pch, em: 0 };
      return null;
    }
    if (!G || !G.bt) return null;
    for (var k = 0; k < G.bt.length; k++) { var b = G.bt[k]; if (b[0] === i) return { x: b[1] / 100, y: b[2] / 100, z: b[3] / 100, yw: b[4] / 1000, pt: b[5] / 1000, sh: b[6], cr: b[7], cls: b[8], wpn: b[9], ch: CL.CHI[b[10]] != null ? b[10] : 'bob', em: b[11] || 0 }; }
    return null;
  }
  function interp(i, d) {
    var now = performance.now(), buf = GC.rb[i] || (GC.rb[i] = []);
    var last = buf[buf.length - 1];
    if (!last || last.x !== d.x || last.y !== d.y || last.z !== d.z || last.yw !== d.yw || last.pt !== d.pt) {
      buf.push({ t: now, x: d.x, y: d.y, z: d.z, yw: d.yw, pt: d.pt });
      if (buf.length > 20) buf.shift();
      if (last && Math.hypot(d.x - last.x, d.z - last.z) > 6) { buf.length = 0; buf.push({ t: now, x: d.x, y: d.y, z: d.z, yw: d.yw, pt: d.pt }); }
    }
    var rt = now - 110, a = buf[0], b = buf[buf.length - 1];
    for (var k = buf.length - 1; k >= 0; k--) if (buf[k].t <= rt) { a = buf[k]; b = buf[k + 1] || buf[k]; break; }
    var f = b.t > a.t ? Math.max(0, Math.min(1, (rt - a.t) / (b.t - a.t))) : 1;
    var dy = b.yw - a.yw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yw: a.yw + dy * f, pt: a.pt + (b.pt - a.pt) * f };
  }
  var renderState = []; // per slot: {x,y,z,yw,pt,alive,team,cr,hw,cls}
  function clientMatch(L, G, peers, dt) {
    if (L.mid !== GC.mid) newMatchLocal(L);
    GC.L = L; GC.G = G; GC.fmt = L.f;
    GC.mySlot = L.s.indexOf(GC.me);
    GC.myTeam = GC.mySlot >= 0 ? CL.slotTeam(L.f, GC.mySlot) : -1;
    if (L.st !== 'match' || !G || G.mid !== L.mid) return;
    // ---- destruction ops ----
    if (GC.amHost && Host.M) {
      // host: its own match already changed the world; replay new ops for effects and the log
      var HO = Host.M.ops;
      for (var h = GC.opCount; h < HO.length; h++) {
        var hop = HO[h]; world.applyOp(hop); GC.opLog.push(hop);
        if (typeof hop !== 'number') boomFx(hop[0] / 10, hop[1] / 10, hop[2] / 10, hop[3] / 10 + 1, hop[5] === 1 ? 0xff7ab0 : 0xffb347);
      }
      GC.opCount = HO.length; GC.needRs = null;
    } else if (G.dq) {
      var st = G.dq[0], ops = G.dq[1];
      if (st <= GC.opCount) {
        for (var j = GC.opCount - st; j < ops.length; j++) {
          var op = ops[j]; world.applyOp(op); GC.opLog.push(op);
          if (typeof op !== 'number') boomFx(op[0] / 10, op[1] / 10, op[2] / 10, op[3] / 10 + 1, op[5] === 1 ? 0xff7ab0 : 0xffb347);
        }
        GC.opCount = Math.max(GC.opCount, st + ops.length); GC.needRs = null;
      } else GC.needRs = GC.opCount;
    }
    // ---- claims acked ----
    if (GC.mySlot >= 0 && G.ak) { var ak = G.ak[GC.mySlot]; GC.claims = GC.claims.filter(function (c) { return c[0] > ak; }); }
    // ---- knockback (host tells us; we own our position) ----
    if (G.kb) {
      var kmax = GC.lastKb;
      G.kb.forEach(function (k) {
        if (k[0] > kmax) kmax = k[0];
        if (k[0] <= GC.lastKb || !GC.kbReady) return;
        if (k[1] === GC.mySlot && player.alive) {
          var kb = player.b; kb.vx += k[2] / 10; kb.vz += k[4] / 10; kb.vy = Math.max(kb.vy, k[3] / 10); kb.onGround = false;
          player.kbT = 0.6; Snd.play('boing'); player.shake = Math.max(player.shake, 0.3);
        }
      });
      GC.lastKb = kmax; GC.kbReady = true; GC.kbMax = Math.max(GC.kbMax || 0, kmax);
    }
    // ---- feed & fx ----
    (G.fd || []).forEach(function (f) {
      if (f[0] <= GC.lastFeed) return; GC.lastFeed = f[0];
      addFeed(L, f[1], f[2], f[3]);
      spawnDeath(L, f[2], f[1], f[4]);
      if (f[1] === GC.mySlot && f[2] !== GC.mySlot) { hitMark(true); Snd.play('kill'); }
      if (f[2] === GC.mySlot) GC.killer = f[1];
    });
    (G.fx || []).forEach(function (f) {
      if (f[0] <= GC.lastFx) return; GC.lastFx = f[0];
      var x = f[2] / 10, y = f[3] / 10, z = f[4] / 10, tm = f[5];
      if (f[1] === 1) ringFx(x, y - 0.9, z, 0x3ee69a);
      if (f[1] === 2) { toast('ตู้เซฟเปิดแล้ว!', 'กล่องเงินออกมาแล้ว รีบไปหยิบ', '#ffc94a'); Snd.play('vault'); }
      if (f[1] === 3) { toast(CL.TEAMS[tm].th + ' ฝากเงินแล้ว', 'จุด CASHOUT เริ่มนับถอยหลัง', CL.TEAMS[tm].col); Snd.play('alarm'); }
      if (f[1] === 4) { toast(CL.TEAMS[tm].th + ' ขโมยจุดได้!', 'ชิงกลับมาให้ได้', CL.TEAMS[tm].col); Snd.play('alarm'); }
      if (f[1] === 6) { var mt = Math.floor(tm / 100), pct = tm % 100; toast(CL.TEAMS[mt].th + ' ดันถึง ' + pct + '%', mt === GC.myTeam ? 'อีกนิดเดียว ดันต่อ!' : 'ขึ้นแท่นไปหยุดให้ได้', CL.TEAMS[mt].col); Snd.play('alarm'); }
      if (f[1] === 7) { Snd.play('ui', [x, y, z]); }
      if (f[1] === 5) { toast('+$10,000 ' + CL.TEAMS[tm].th, 'CASHOUT สำเร็จ', CL.TEAMS[tm].col); Snd.play('cash'); emit(x, y + 1, z, [1, 0.8, 0.3], 80, 8, 6); }
    });
    // ---- my spawn ----
    if (GC.mySlot >= 0) {
      var sp = G.sp[GC.mySlot];
      if (sp && sp[0] !== GC.lastSpn) {
        GC.lastSpn = sp[0];
        var b = player.b; b.x = sp[1] / 100; b.y = sp[2] / 100; b.z = sp[3] / 100; b.vx = b.vy = b.vz = 0; player.yaw = sp[4] / 1000; player.pitch = 0;
        player.cls = prof.cls; player.wpnId = myWpn();
        // class/weapon are locked once the match has the slot; follow the host's record for bots that became us
        resetLoadout();
        confetti(b.x, b.y + 1, b.z, CLX.vis(prof.ch).conf, 30);
      }
      var alive = slotAlive(G, GC.mySlot);
      var hp = G.hp[GC.mySlot];
      if (alive && GC.wasAlive && hp < GC.lastHp - 1) { hurtFlash(); Snd.play('hurt'); }
      GC.lastHp = hp; player.alive = alive;
      if (!alive && GC.wasAlive) { player.use = false; }
      GC.wasAlive = alive;
    } else player.alive = false;
    // ---- remote slots ----
    renderState = [];
    for (var i = 0; i < L.s.length; i++) {
      var team = CL.slotTeam(L.f, i);
      if (i === GC.mySlot) {
        renderState[i] = { slot: i, x: player.b.x, y: player.b.y, z: player.b.z, cr: player.crouch, hw: player.b.hw, alive: player.alive, team: team, me: 1 };
        if (player.alive) GC.lastPos[i] = { x: player.b.x, y: player.b.y, z: player.b.z, yw: player.yaw, ch: prof.ch, cls: player.cls, team: team };
        continue;
      }
      var d = slotData(L, G, peers, i);
      if (!d) { renderState[i] = { slot: i, alive: false, team: team }; continue; }
      var ip = interp(i, d);
      var al = slotAlive(G, i);
      renderState[i] = { slot: i, x: ip.x, y: ip.y, z: ip.z, yw: ip.yw, pt: ip.pt, cr: d.cr, hw: CL.CLASSES[d.cls] ? CL.CLASSES[d.cls].hw : 0.32, alive: al, team: team, cls: d.cls || 'medium', wpn: d.wpn, ch: d.ch, em: d.em };
      if (al) {
        if (GC.wasAliveS[i] === false) { confetti(ip.x, ip.y + 1, ip.z, CLX.vis(d.ch).conf, 30); Snd.play('pop', [ip.x, ip.y, ip.z]); }
        GC.lastPos[i] = { x: ip.x, y: ip.y, z: ip.z, yw: ip.yw, ch: d.ch, cls: d.cls || 'medium', team: team };
        if (GC.prevHp[i] != null && G.hp[i] < GC.prevHp[i] - 1 && avatars[i]) avatars[i].sq = 1;
      }
      GC.wasAliveS[i] = al; GC.prevHp[i] = G.hp[i];
      // shots from others
      if (GC.lastSh[i] == null) GC.lastSh[i] = d.sh;
      if (d.sh > GC.lastSh[i] && al) {
        GC.lastSh[i] = d.sh;
        var wd = CL.WEAPONS[CL.WI[d.wpn]] || CL.WEAPONS[2];
        var eye = [ip.x, ip.y + (d.cr ? 1.15 : 1.55), ip.z], dir = CL.dirFrom(ip.yw, ip.pt);
        if (!wd.melee) {
          var hv = CL.rayVoxel(world, eye[0], eye[1], eye[2], dir[0], dir[1], dir[2], wd.rng), tt = hv ? hv.t : wd.rng;
          tracer([eye[0] + dir[0] * 0.8, eye[1] - 0.2, eye[2] + dir[2] * 0.8], [eye[0] + dir[0] * tt, eye[1] + dir[1] * tt, eye[2] + dir[2] * tt], [1, 0.85, 0.5]);
          Snd.play('shot', eye, d.wpn);
        } else Snd.play('swing', eye);
      } else GC.lastSh[i] = d.sh;
    }
    drawAvatars(L, G);
  }
  function drawAvatars(L, G) {
    if (!hasGL) return;
    var seen = {};
    renderState.forEach(function (s, i) {
      if (!s || s.me || !s.alive || s.x == null) return;
      var key = s.team + (s.cls || 'medium') + (L.nm[i] || '') + s.ch;
      var a = avatars[i];
      if (a && a.key !== key) { disposeAvatar(a); a = null; }
      if (!a) { a = avatars[i] = makeAvatar(s.team, s.cls || 'medium', L.nm[i] || '', s.ch); a.key = key; }
      seen[i] = 1;
      a.g.visible = true;
      var mv = Math.hypot(s.x - (a.px || s.x), s.z - (a.pz || s.z));
      a.px = s.x; a.pz = s.z; a.ph += mv * 6;
      a.g.position.set(s.x, s.y, s.z); a.g.rotation.y = s.yw + a.spin * Math.PI * 2;
      if (a.spin > 0) a.spin = Math.max(0, a.spin - 0.025);
      // squash & stretch when hit
      var sq = a.sq; a.sq = Math.max(0, sq - 0.12);
      a.g.scale.set(1 + 0.22 * sq, 1 - 0.28 * sq, 1 + 0.22 * sq);
      // emote bubble
      if (s.em != null && a.emSeen !== s.em) {
        if (a.emSeen != null) { disposeSprite(a.bubble); a.bubble = bubbleSprite(CLX.vis(s.ch).emote); a.bubble.position.y = 2.8; a.g.add(a.bubble); a.bubT = 2.2; a.spin = 1; }
        a.emSeen = s.em;
      }
      if (a.bubble) { a.bubT -= 0.016; if (a.bubT <= 0) { disposeSprite(a.bubble); a.bubble = null; } }
      var sw = Math.sin(a.ph) * Math.min(0.6, mv * 8);
      a.legL.rotation.x = sw; a.legR.rotation.x = -sw;
      if (s.cr) a.g.scale.y *= 0.78;
      a.head.rotation.x = -(s.pt || 0) * 0.5;
      var carrying = G && G.cb && G.cb[3] === i;
      a.gun.visible = !carrying;
      a.armL.rotation.x = a.armR.rotation.x = carrying ? -2.6 : -1.25 - (s.pt || 0) * 0.6;
    });
    Object.keys(avatars).forEach(function (k) { if (!seen[k]) avatars[k].g.visible = false; });
  }

  // =================== LOCAL PLAYER ===================
  function playerTargets() {
    return renderState.filter(function (s) { return s && !s.me && s.x != null; });
  }
  function eyePos() { var b = player.b; return [b.x, b.y + (player.crouch ? 1.15 : 1.6) + player.eyeOff, b.z]; }
  function muzzleWorld() {
    if (!vm) return eyePos();
    camera.updateMatrixWorld();
    var v = new THREE.Vector3(0, 0.02, vm.muzzleZ); vm.gun.localToWorld(v); return [v.x, v.y, v.z];
  }
  function playerUpdate(dt) {
    var G = GC.G, L = GC.L, b = player.b;
    var inMatch = GC.active && L && L.st === 'match' && G && GC.mySlot >= 0;
    var lookScale = 0.0022 * prof.sens * (player.ads ? 0.6 : 1);
    if (inMatch && !$('pause').hidden) { mouse.dx = mouse.dy = 0; }
    if (inMatch) { player.yaw -= mouse.dx * lookScale; player.pitch -= mouse.dy * lookScale; }
    mouse.dx = mouse.dy = 0;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    if (!inMatch || !player.alive) { player.use = false; pressed = {}; mouse.lPress = 0; return; }
    var cls = CL.CLASSES[player.cls], wd = CL.WEAPONS[CL.WI[player.wpnId]];
    var carrying = G.cb && G.cb[3] === GC.mySlot;
    var paused = !$('pause').hidden;
    var k = function (c) { return !paused && keys[c]; };
    var fx = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0) + touch.mx, fz = (k('KeyS') ? 1 : 0) - (k('KeyW') ? 1 : 0) + touch.mz;
    var fl = Math.hypot(fx, fz); if (fl > 1) { fx /= fl; fz /= fl; }
    var sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    var wx = fx * cos + fz * sin, wz = -fx * sin + fz * cos;
    var wantCrouch = k('KeyC') || k('ControlLeft') || touch.crouch;
    if (!wantCrouch && player.crouch && CL.collides(world, b.x, b.y, b.z, b.hw, 1.75)) wantCrouch = true;
    player.crouch = !!wantCrouch; b.h = player.crouch ? 1.25 : 1.75;
    player.ads = !!(mouse.r || touch.aim) && !carrying && !wd.melee && player.rl <= 0;
    var sprint = (k('ShiftLeft') || (isTouch && fl > 0.92 && fz < -0.6)) && !player.crouch && !player.ads;
    var spd = cls.spd * (sprint ? 1.32 : 1) * (player.crouch ? 0.55 : 1) * (carrying ? 0.78 : 1) * (player.ads ? 0.72 : 1);
    var acc = b.onGround ? 13 : 2.6;
    if (player.kbT > 0) { player.kbT -= dt; acc = 0.8; }
    if (player.chargeT > 0) {
      player.chargeT -= dt;
      var dir = CL.dirFrom(player.yaw, 0); b.vx = dir[0] * 11.5; b.vz = dir[2] * 11.5;
      chargeBreak(dir);
    } else if (player.dashT > 0) { player.dashT -= dt; }
    else {
      b.vx += (wx * spd - b.vx) * Math.min(1, acc * dt);
      b.vz += (wz * spd - b.vz) * Math.min(1, acc * dt);
    }
    if (pressed.jump && b.onGround) { b.vy = 7.6; b.onGround = false; }
    b.hitWall = false;
    var stepped = CL.moveBody(world, b, dt);
    if (stepped) player.eyeOff -= stepped;
    player.eyeOff *= Math.pow(0.0005, dt); if (Math.abs(player.eyeOff) < 0.002) player.eyeOff = 0;
    player.bob += Math.hypot(b.vx, b.vz) * dt * (b.onGround ? 1.6 : 0);
    // interact
    player.use = !!(k('KeyE') || touch.use);
    // timers
    player.cd -= dt; player.specT = Math.max(0, player.specT - dt);
    if (player.gad < cls.gadN) { player.gadT += dt; if (player.gadT >= cls.gadCd) { player.gad++; player.gadT = 0; } }
    if (player.rl > 0) { player.rl -= dt; if (player.rl <= 0) player.ammo = wd.mag; }
    // fire
    var fireHeld = (mouse.l || touch.fire) && !paused;
    var firePress = mouse.lPress && !paused; mouse.lPress = 0;
    if (carrying) {
      if (firePress) { var d0 = CL.dirFrom(player.yaw, player.pitch); claim([5, Math.round(d0[0] * 1000), Math.round(d0[1] * 1000), Math.round(d0[2] * 1000)]); }
    } else if (player.chargeT <= 0) {
      var want = wd.auto ? fireHeld : firePress;
      if (want && player.cd <= 0 && player.rl <= 0) {
        if (wd.melee) fireMelee(wd);
        else if (player.ammo > 0) fireGun(wd);
        else startReload(wd);
      }
      if (pressed.reload && !wd.melee && player.ammo < wd.mag && player.rl <= 0) startReload(wd);
    }
    // gadget
    if (pressed.gad && player.gad > 0 && !carrying) {
      var kind = { frag: 0, breach: 1, rpg: 2 }[cls.gad], e = eyePos(), d = CL.dirFrom(player.yaw, player.pitch);
      claim([4, kind, Math.round((e[0] + d[0] * 0.6) * 100), Math.round((e[1] + d[1] * 0.6 - 0.1) * 100), Math.round((e[2] + d[2] * 0.6) * 100), Math.round(d[0] * 1000), Math.round(d[1] * 1000), Math.round(d[2] * 1000)]);
      player.gad--; if (vm) vm.kick = 0.3; Snd.play('swing');
    }
    // emote (T): bubble above your head for everyone else
    player.emT = Math.max(0, (player.emT || 0) - dt);
    if (pressed.emote && player.emT <= 0) {
      player.em = (player.em || 0) + 1; player.emT = 2;
      var ee = eyePos(), ed = CL.dirFrom(player.yaw, 0);
      popup(ee[0] + ed[0] * 3, ee[1] + 0.3, ee[2] + ed[2] * 3, CLX.vis(prof.ch).emote, '#ffffff', 1.6, true);
    }
    // specialization
    if (pressed.spec && player.specT <= 0) {
      if (cls.spec === 'dash') {
        var dl = Math.hypot(wx, wz), ddx = dl > 0.1 ? wx / dl : -sin, ddz = dl > 0.1 ? wz / dl : -cos;
        b.vx = ddx * 17; b.vz = ddz * 17; b.vy = Math.max(b.vy, 2.5); player.dashT = 0.2; player.specT = cls.specCd; Snd.play('swing');
      } else if (cls.spec === 'heal') { claim([2]); player.specT = cls.specCd; ringFx(b.x, b.y + 0.1, b.z, 0x3ee69a); }
      else if (cls.spec === 'charge' && !carrying) { player.chargeT = 1.2; player.chargeHit = {}; player.specT = cls.specCd; Snd.play('swing'); }
    }
    pressed = {};
  }
  function spreadNow(wd) {
    var b = player.b, base = player.ads ? (wd.ads != null ? wd.ads : wd.sp * 0.5) : wd.sp;
    var moving = Math.hypot(b.vx, b.vz) > 1.5;
    return base * (moving ? 1.5 : 1) * (b.onGround ? 1 : 2) * (player.crouch ? 0.8 : 1);
  }
  function applyShot(res, wd, fromMuzzle) {
    var mz = fromMuzzle || muzzleWorld();
    res.tracers.forEach(function (t) { tracer(mz, t, [1, 0.9, 0.55]); });
    var hit = false;
    res.hits.forEach(function (h) {
      claim([0, h[0], h[1], CL.WI[player.wpnId]]); hit = true;
      var rs = renderState[h[0]];
      if (rs && rs.x != null && (R() < 0.45 || wd.melee || wd.pel > 1)) popup(rs.x + (R() - 0.5) * 0.6, rs.y + 2.1, rs.z, h[2] ? 'โป๊ะ! หัว' : HIT_TXT[Math.floor(R() * HIT_TXT.length)], h[2] ? '#ffc94a' : '#ffffff', 0.7);
      if (avatars[h[0]]) avatars[h[0]].sq = 1;
    });
    res.blocks.forEach(function (bk) {
      var nx = bk[5], ny = bk[6], nz = bk[7], px = bk[2] + 0.5 + nx * 0.52, py = bk[3] + 0.5 + ny * 0.52, pz = bk[4] + 0.5 + nz * 0.52;
      var m = world.get(bk[2], bk[3], bk[4]);
      if (m) emit(px, py, pz, CL.MAT[m].col, 3, 3, 1);
      if (bk[0] >= 0) {
        claim([1, bk[0], bk[1]]);
        if (!GC.amHost) world.damageIdx(bk[0], bk[1]); // local prediction (host applies directly)
      }
    });
    if (hit) { hitMark(false); Snd.play('hit'); }
  }
  function fireGun(wd) {
    player.cd = wd.iv; player.ammo--; player.shots++;
    var e = eyePos();
    var res = CL.fireHitscan(world, wd, e[0], e[1], e[2], player.yaw, player.pitch, spreadNow(wd), playerTargets(), GC.myTeam, GC.mySlot, R);
    applyShot(res, wd);
    player.pitch += wd.kick * (0.7 + R() * 0.6) * (player.ads ? 0.6 : 1); player.yaw += (R() - 0.5) * wd.kick * 0.5;
    if (vm) { vm.kick = Math.min(1, vm.kick + 0.5); vm.flash.visible = true; vm.flashT = 0.04; }
    Snd.play('shot', null, player.wpnId);
    if (player.ammo <= 0) startReload(wd);
  }
  function fireMelee(wd) {
    player.cd = wd.iv; player.shots++;
    if (vm) vm.swing = 1;
    var e = eyePos();
    var res = CL.fireMelee(world, wd, e[0], e[1], e[2], player.yaw, player.pitch, playerTargets(), GC.myTeam, GC.mySlot);
    res.tracers = [];
    applyShot(res, wd, e);
    if (res.blocks.length || res.hits.length) player.shake = Math.max(player.shake, 0.25);
    Snd.play('swing');
  }
  function startReload(wd) { if (wd.melee || player.rl > 0) return; player.rl = wd.rl; Snd.play('ui'); }
  function chargeBreak(dir) {
    var b = player.b, fx = b.x + dir[0] * (b.hw + 0.5), fz = b.z + dir[2] * (b.hw + 0.5);
    var px = -dir[2], pz = dir[0];
    for (var y = Math.floor(b.y); y <= Math.floor(b.y + 1.7); y++) for (var o = -1; o <= 1; o++) {
      var cx = Math.floor(fx + px * o * 0.4), cz = Math.floor(fz + pz * o * 0.4);
      if (y <= 0 || cx < 0 || cz < 0 || cx >= CL.W || cz >= CL.D) continue;
      var m = world.get(cx, y, cz);
      if (m && CL.MAT[m].hp) { var i = CL.idx(cx, y, cz); claim([1, i, 255]); if (!GC.amHost) world.destroyIdx(i); player.shake = Math.max(player.shake, 0.2); }
    }
    playerTargets().forEach(function (t) {
      if (!t.alive || t.team === GC.myTeam || player.chargeHit[t.slot]) return;
      if (Math.hypot(t.x - fx, t.z - fz) < 1.2 && Math.abs(t.y - b.y) < 1.5) { player.chargeHit[t.slot] = 1; claim([0, t.slot, 60, CL.WI.charge]); hitMark(false); Snd.play('hit'); }
    });
  }

  // =================== CAMERA & RENDER ===================
  var menuT = 0;
  function updateCamera(dt) {
    if (!camera) return;
    var targetFov = prof.fov;
    var L = GC.L, inMatch = GC.active && L && L.st === 'match' && GC.G;
    if (inMatch && GC.mySlot >= 0) {
      var e = eyePos();
      if (player.alive) {
        var bob = Math.sin(player.bob * 2.2) * 0.035 * (player.b.onGround ? 1 : 0);
        camera.position.set(e[0], e[1] + bob, e[2]);
        camera.rotation.order = 'YXZ'; camera.rotation.set(player.pitch, player.yaw, 0);
        if (player.ads) targetFov = prof.fov / ((CL.WEAPONS[CL.WI[player.wpnId]].zoom) || 1.25);
      } else {
        var rf = GC.myRag && GC.myRag.focus;
        if (rf) {
          // ride along with your own flying body
          var fp = rf.p, hv = Math.hypot(rf.v[0], rf.v[2]) || 1;
          camera.position.lerp(new THREE.Vector3(fp[0] - rf.v[0] / hv * 4, fp[1] + 2.5, fp[2] - rf.v[2] / hv * 4), Math.min(1, dt * 5));
          camera.lookAt(fp[0], fp[1], fp[2]);
        } else {
          // then look at whoever got you
          var k = GC.killer >= 0 && renderState[GC.killer] && renderState[GC.killer].alive ? renderState[GC.killer] : null;
          camera.position.lerp(new THREE.Vector3(player.b.x + 3, player.b.y + 6, player.b.z + 3), Math.min(1, dt * 2));
          camera.lookAt(k ? k.x : player.b.x, k ? k.y + 1 : player.b.y, k ? k.z : player.b.z);
        }
      }
      if (player.shake > 0) { camera.position.x += (R() - 0.5) * player.shake * 0.3; camera.position.y += (R() - 0.5) * player.shake * 0.3; player.shake = Math.max(0, player.shake - dt * 2); }
    } else if (inMatch) {
      menuT += dt * 0.12; camera.position.set(CX + Math.cos(menuT) * 44, 30, CZ + Math.sin(menuT) * 44); camera.lookAt(CX, 2, CZ);
    } else {
      menuT += dt * 0.05;
      camera.position.set(CX + Math.cos(menuT) * 58, 24 + Math.sin(menuT * 0.7) * 4, CZ + Math.sin(menuT) * 58); camera.lookAt(CX, 3, CZ);
    }
    if (Math.abs(camera.fov - targetFov) > 0.1) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix(); }
    // viewmodel
    if (vm) {
      var show = inMatch && player.alive && GC.mySlot >= 0;
      vm.g.visible = show;
      var carrying = GC.G && GC.G.cb && GC.G.cb[3] === GC.mySlot;
      vm.gun.visible = !carrying; vm.box.visible = !!carrying;
      vm.kick = Math.max(0, vm.kick - dt * 8); vm.swing = Math.max(0, vm.swing - dt * 2.2);
      if (vm.flashT > 0) { vm.flashT -= dt; if (vm.flashT <= 0) vm.flash.visible = false; }
      var adsPos = player.ads ? [0, -0.12, -0.32] : [0.24, -0.22, -0.42];
      var bx = Math.sin(player.bob * 1.1) * 0.012, by = Math.abs(Math.cos(player.bob * 1.1)) * 0.012;
      var rl = player.rl > 0 ? Math.sin(Math.min(1, player.rl) * Math.PI) * 0.35 : 0;
      vm.g.position.set(adsPos[0] + bx, adsPos[1] + by - rl * 0.3 - (player.chargeT > 0 ? 0.1 : 0), adsPos[2] + vm.kick * 0.06);
      vm.g.rotation.set(vm.kick * 0.12 + rl + (vmKind === 'hammer' ? -vm.swing * 1.6 : 0), 0, 0);
    }
  }
  function updateWorldObjects(dt, nowT) {
    if (!hasGL) return;
    var G = GC.G, L = GC.L, inMatch = GC.active && L && L.st === 'match' && G && G.mid === L.mid;
    objs.vault.visible = false; objs.box.visible = false;
    ['vault', 'box', 's0', 's1'].forEach(function (k) { beams[k].visible = false; });
    var pushMode = inMatch && G.md === 'push';
    objs.st.forEach(function (s) { s.ring.material.color.setHex(0x3a3f7a); s.lamp.material.color.setHex(0x3a3f7a); s.g.scale.set(1, 1, 1); s.g.visible = !pushMode; });
    objs.plat.visible = pushMode;
    if (pushMode) {
      var tx = CL.PUSH.cx + G.pp / 1000 * CL.PUSH.half;
      GC.platX = GC.platX == null ? tx : GC.platX + (tx - GC.platX) * Math.min(1, dt * 6);
      objs.plat.position.set(GC.platX, 1, CL.PUSH.z);
      var pc = G.ps === 9 ? 0xff3d6e : G.ps >= 0 ? teamHex(G.ps) : 0xffffff;
      objs.platEdge.forEach(function (e) { e.material.color.setHex(pc); });
      objs.platLamp.material.color.setHex(pc);
      if (G.ps === 9) { var fl = (Math.sin(nowT * 12) > 0) ? 0xff3d6e : 0xffffff; objs.platLamp.material.color.setHex(fl); }
      setBeam('box', true, GC.platX, 1, CL.PUSH.z, pc);
      objs.goals.forEach(function (g) { g.visible = true; });
    } else objs.goals.forEach(function (g) { g.visible = false; });
    var seenPj = {};
    if (inMatch) {
      if (G.ph === 'vault') {
        var v = CL.MAP.vaults[G.vi]; objs.vault.visible = true; objs.vault.position.set(v[0], v[1], v[2]);
        objs.vaultDoor.material.emissive.setHex(G.vp > 0 ? 0xaa6600 : 0x553300);
        setBeam('vault', true, v[0], v[1], v[2], 0xffc94a);
      }
      if (G.cb && G.cb[3] !== GC.mySlot) {
        objs.box.visible = true; objs.box.position.set(G.cb[0] / 100, G.cb[1] / 100 + 0.25, G.cb[2] / 100);
        if (G.cb[3] >= 0) { var rs = renderState[G.cb[3]]; if (rs && rs.x != null) objs.box.position.set(rs.x, rs.y + 1.95, rs.z); }
        objs.box.rotation.y = nowT * 1.5;
        setBeam('box', G.cb[3] < 0, objs.box.position.x, 0, objs.box.position.z, 0xffc94a);
      }
      (G.st || []).forEach(function (a, k) {
        var s = objs.st[a[0]], col = a[1] >= 0 ? teamHex(a[1]) : 0xffffff;
        s.ring.material.color.setHex(col); s.lamp.material.color.setHex(col);
        if (a[3]) { var pul = 1 + Math.sin(nowT * 6) * 0.04; s.g.scale.set(pul, 1, pul); }
        var p = CL.MAP.stations[a[0]]; setBeam('s' + k, true, p[0], p[1], p[2], col);
      });
      (G.pj || []).forEach(function (p) {
        seenPj[p[0]] = 1;
        var m = pjMeshes[p[0]];
        if (!m) { m = pjMeshes[p[0]] = new THREE.Mesh(p[1] === 2 ? new THREE.BoxGeometry(0.15, 0.15, 0.5) : new THREE.BoxGeometry(0.22, 0.22, 0.22), basic(p[1] === 1 ? 0xff7ab0 : p[1] === 2 ? 0xffffff : 0x9cff7a)); scene.add(m); m.userData.prev = null; }
        var x = p[2] / 100, y = p[3] / 100, z = p[4] / 100;
        if (m.userData.prev) { var pv = m.userData.prev; m.position.set(pv[0] + (x - pv[0]) * 0.5, pv[1] + (y - pv[1]) * 0.5, pv[2] + (z - pv[2]) * 0.5); } else m.position.set(x, y, z);
        if (p[1] === 2) { m.lookAt(x, y, z); emit(m.position.x, m.position.y, m.position.z, [0.8, 0.8, 0.85], 1, 1, 0); }
        m.userData.prev = [x, y, z];
      });
    }
    Object.keys(pjMeshes).forEach(function (k) { if (!seenPj[k]) { scene.remove(pjMeshes[k]); pjMeshes[k].geometry.dispose(); delete pjMeshes[k]; } });
  }

  // =================== HUD ===================
  var toastT = 0, hudCache = {};
  function setText(id, t) { if (hudCache[id] !== t) { hudCache[id] = t; $(id).textContent = t; } }
  function setHTML(id, t) { if (hudCache['h' + id] !== t) { hudCache['h' + id] = t; $(id).innerHTML = t; } }
  function toast(t, sub, col) { var el = $('toast'); el.innerHTML = esc(t) + (sub ? '<small>' + esc(sub) + '</small>' : ''); el.style.color = col || '#fff'; el.style.opacity = 1; toastT = 2.6; }
  function hitMark(kill) { var h = $('hitm'); h.className = 'hitm' + (kill ? ' kill' : ''); h.style.opacity = 1; h.style.transition = 'none'; requestAnimationFrame(function () { h.style.transition = 'opacity .25s'; h.style.opacity = 0; }); }
  function hurtFlash() { var v = $('vign'); v.style.boxShadow = 'inset 0 0 140px rgba(255,40,70,.65)'; setTimeout(function () { v.style.boxShadow = 'inset 0 0 120px rgba(255,40,70,0)'; }, 160); }
  function slotName(L, i) { return i >= 0 && L.nm && L.nm[i] ? L.nm[i] : 'สนาม'; }
  function addFeed(L, a, v, w) {
    var el = document.createElement('div');
    var wn = CL.WEAPONS[w] ? CL.WEAPONS[w].th : '';
    var ac = a >= 0 ? CL.TEAMS[CL.slotTeam(L.f, a)].col : '#9aa0d0', vc = CL.TEAMS[CL.slotTeam(L.f, v)].col;
    el.innerHTML = (a >= 0 && a !== v ? '<span style="color:' + ac + '">' + esc(slotName(L, a)) + '</span><em>' + esc(wn) + '</em>' : '<em>' + esc(wn || 'ตกฉาก') + '</em>') + '<span style="color:' + vc + '">' + esc(slotName(L, v)) + '</span>';
    var f = $('hFeed'); f.insertBefore(el, f.firstChild);
    while (f.children.length > 5) f.removeChild(f.lastChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 7000);
  }
  var ICON = {
    vault: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="#ffc94a"/><circle cx="12" cy="12" r="4" fill="#0b0c1d"/><path d="M12 9v3l2 1" stroke="#ffc94a" stroke-width="1.6" fill="none"/></svg>',
    box: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="1.5" fill="#ffc94a"/><rect x="3" y="11" width="18" height="3" fill="#0b0c1d"/><path d="M9 7V5h6v2" stroke="#ffc94a" stroke-width="2" fill="none"/></svg>',
    st: function (col, p) { var a = Math.max(0, Math.min(1, p)) * 62.8; return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(11,12,29,.7)" stroke="rgba(255,255,255,.25)" stroke-width="2"/><circle cx="12" cy="12" r="10" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-dasharray="' + a.toFixed(1) + ' 62.8" transform="rotate(-90 12 12)"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="' + col + '">$</text></svg>'; }
  };
  var tmpV;
  function marker(list, x, y, z, html, label) {
    if (!camera) return;
    tmpV = tmpV || new THREE.Vector3();
    tmpV.set(x, y, z); tmpV.project(camera);
    var behind = tmpV.z > 1;
    var sx = (tmpV.x * 0.5 + 0.5) * innerWidth, sy = (-tmpV.y * 0.5 + 0.5) * innerHeight;
    if (behind) { sx = innerWidth - sx; sy = innerHeight - 40; }
    sx = Math.max(30, Math.min(innerWidth - 30, sx)); sy = Math.max(70, Math.min(innerHeight - 40, sy));
    list.push('<div class="mk" style="left:' + sx.toFixed(0) + 'px;top:' + sy.toFixed(0) + 'px">' + html + '<span>' + esc(label) + '</span></div>');
  }
  function updateHUD(dt) {
    var L = GC.L, G = GC.G;
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    if (!GC.active || !L || L.st !== 'match' || !G || G.mid !== L.mid) return;
    var t = G.t | 0; setText('hClock', Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2));
    var push = G.md === 'push';
    var sc = push ? pushBar(G) : G.sc.map(function (v, i) {
      var T = CL.TEAMS[i], mine = i === GC.myTeam;
      return '<div class="tchip' + (mine ? ' mine' : '') + '" style="border-color:' + T.col + '"><div class="tn"><span style="color:' + T.col + '">' + T.n + '</span><span>' + (mine ? 'คุณ' : '') + '</span></div><div class="cash">' + fmtCash(v) + '</div><div class="mb"><i style="width:' + Math.min(100, v / CL.RULES.winCash * 100) + '%;background:' + T.col + '"></i></div></div>';
    }).join('');
    setHTML('hScore', sc);
    // objective text + markers
    var obj = '', marks = [], me = player.b, myS = GC.mySlot, prompt = '', prog = -1;
    var pos = [me.x, me.y, me.z], dist = function (p) { return Math.hypot(p[0] - pos[0], p[2] - pos[2]); };
    var nearP = function (p, r) { return dist(p) < r && Math.abs(p[1] - pos[1]) < 2.5; };
    if (push) {
      var px = CL.PUSH.cx + G.pp / 1000 * CL.PUSH.half, ppos = [px, 1, CL.PUSH.z];
      var onP = player.alive && Math.abs(pos[0] - px) < CL.PUSH.rad && Math.abs(pos[2] - CL.PUSH.z) < CL.PUSH.rad && pos[1] < 3.6;
      if (G.ps === 9) obj = 'แท่นถูกแย่ง · มีทั้งสองทีมบนแท่น';
      else if (G.ps === GC.myTeam) obj = 'ทีมคุณกำลังดันแท่น!';
      else if (G.ps >= 0) obj = CL.TEAMS[G.ps].th + ' กำลังดัน · ขึ้นไปหยุดแท่น';
      else obj = 'ขึ้นไปยืนบนแท่นเพื่อดันเข้าฐานศัตรู';
      if (!onP) marker(marks, px, 3.2, CL.PUSH.z, ICON.st(G.ps === 9 ? '#ff3d6e' : G.ps >= 0 ? CL.TEAMS[G.ps].col : '#ffffff', 1), 'แท่น ' + Math.round(dist(ppos)) + ' ม.');
      if (onP) prompt = G.ps === 9 ? 'มีศัตรูบนแท่น · กำจัดก่อนแท่นถึงจะเดิน' : 'อยู่บนแท่น · กำลังดัน';
    } else if (G.ph === 'vault') {
      var v = CL.MAP.vaults[G.vi]; obj = 'เปิดตู้เซฟ ' + (G.vp > 0 ? '(' + G.vp + '%)' : '');
      marker(marks, v[0], v[1] + 2, v[2], ICON.vault, Math.round(dist(v)) + ' ม.');
      if (player.alive && nearP(v, 2.4)) { prompt = 'กด E ค้าง · เปิดตู้เซฟ'; prog = G.vp / 100; }
    } else if (G.ph === 'box') {
      var cb = G.cb;
      if (cb && cb[3] === myS) { obj = 'นำกล่องเงินไปฝากที่จุด CASHOUT'; }
      else if (cb && cb[3] >= 0) { var ct = CL.slotTeam(L.f, cb[3]); obj = ct === GC.myTeam ? 'คุ้มกันคนถือกล่อง' : CL.TEAMS[ct].th + ' ถือกล่องเงิน · ไล่ยิงให้หลุด'; }
      else obj = 'หยิบกล่องเงิน';
      if (cb && cb[3] !== myS) {
        var bp = [cb[0] / 100, cb[1] / 100, cb[2] / 100];
        if (cb[3] >= 0 && renderState[cb[3]] && renderState[cb[3]].x != null) bp = [renderState[cb[3]].x, renderState[cb[3]].y + 1.6, renderState[cb[3]].z];
        marker(marks, bp[0], bp[1] + 1.2, bp[2], ICON.box, Math.round(dist(bp)) + ' ม.');
        if (cb[3] < 0 && player.alive && Math.hypot(bp[0] - pos[0], bp[2] - pos[2]) < 1.8) prompt = 'กด E · หยิบกล่องเงิน';
      }
      (G.st || []).forEach(function (a) {
        var p = CL.MAP.stations[a[0]]; marker(marks, p[0], p[1] + 2.6, p[2], ICON.st('#ffffff', 0), 'CASHOUT ' + Math.round(dist(p)) + ' ม.');
        if (cb && cb[3] === myS && nearP(p, 2.4)) { prompt = 'กด E ค้าง · ฝากเงิน'; prog = (G.hd[myS] || 0) / 100 / CL.RULES.depositTime; }
      });
    } else if (G.ph === 'cash' && G.st && G.st[0]) {
      var a = G.st[0], p2 = CL.MAP.stations[a[0]], col = CL.TEAMS[a[1]] ? CL.TEAMS[a[1]].col : '#fff', left = Math.ceil((1 - a[2] / 1000) * CL.RULES.cashTime);
      obj = a[1] === GC.myTeam ? 'ป้องกันจุด CASHOUT · เหลือ ' + left + ' วิ' : 'ขโมยจุด CASHOUT ของ' + CL.TEAMS[a[1]].th + ' · เหลือ ' + left + ' วิ';
      marker(marks, p2[0], p2[1] + 2.6, p2[2], ICON.st(col, a[2] / 1000), left + ' วิ · ' + Math.round(dist(p2)) + ' ม.');
      if (player.alive && nearP(p2, 2.6)) {
        if (a[1] !== GC.myTeam) { prompt = 'กด E ค้าง · ขโมยจุด'; prog = (G.hd[myS] || 0) / 100 / CL.RULES.stealTime; }
        else prompt = 'ยืนป้องกันจุดนี้ไว้';
      }
    } else if (G.ph === 'inter') obj = 'รอบต่อไปกำลังจะเริ่ม · ตู้เซฟใหม่กำลังมา';
    setText('hObj', obj);
    setHTML('marks', marks.join(''));
    var pr = $('hPrompt');
    if (prompt && GC.mySlot >= 0) { pr.hidden = false; setText('hPromptT', prompt); $('hPromptB').style.width = (prog >= 0 ? Math.min(100, prog * 100) : 0) + '%'; $('hPromptB').parentNode.hidden = prog < 0; }
    else pr.hidden = true;
    // player panels
    if (GC.mySlot >= 0) {
      var cls = CL.CLASSES[player.cls], wd = CL.WEAPONS[CL.WI[player.wpnId]], hp = G.hp[GC.mySlot];
      setText('hCls', cls.en + ' · ' + cls.th); setText('hHpN', String(hp));
      $('hHp').style.width = Math.max(0, hp / cls.hp * 100) + '%';
      $('hHp').style.background = hp / cls.hp < 0.35 ? 'var(--accent)' : 'var(--fg)';
      setHTML('hAmmo', wd.melee ? '∞' : (player.rl > 0 ? '<small>รีโหลด…</small>' : player.ammo + '<small>/' + wd.mag + '</small>'));
      setText('hWpn', wd.th);
      setText('hGadT', CL.WEAPONS[CL.WI[cls.gad]].th + ' ×' + player.gad);
      $('hGad').classList.toggle('dim', player.gad <= 0);
      $('hGadCd').style.width = (player.gad < cls.gadN ? player.gadT / cls.gadCd * 100 : 0) + '%';
      setText('hSpecT', CL.SPECS[cls.spec].th + (player.specT > 0 ? ' ' + Math.ceil(player.specT) : ''));
      $('hSpec').classList.toggle('dim', player.specT > 0);
      $('hSpecCd').style.width = (player.specT > 0 ? (1 - player.specT / cls.specCd) * 100 : 0) + '%';
      var carrying = G.cb && G.cb[3] === GC.mySlot;
      $('hCarry').hidden = !carrying;
      var dead = !slotAlive(G, GC.mySlot);
      $('hDead').hidden = !dead;
      if (dead) {
        setText('hDeadT', String(G.rt[GC.mySlot]));
        setText('hDeadBy', GC.killer >= 0 && GC.killer !== GC.mySlot ? 'ถูกกำจัดโดย ' + slotName(L, GC.killer) : 'ตกรอบ');
      }
      $('xh').hidden = dead || carrying || wd.melee && false;
    } else {
      $('hDead').hidden = true; setText('hObj', 'กำลังชมการแข่งขัน · ห้องเต็ม');
    }
    // scoreboard
    var showBoard = keys.Tab && GC.active;
    $('hBoard').hidden = !showBoard;
    if (showBoard) setHTML('hBoard', boardHTML(L, G));
    if (hudCache.boardT !== (G.t | 0)) { hudCache.boardT = G.t | 0; drawBoard(G); }
  }
  function pushBar(G) {
    var p = G.pp / 1000, pos = (p + 1) / 2 * 100, pc = G.ps === 9 ? '#ff3d6e' : G.ps >= 0 ? CL.TEAMS[G.ps].col : '#ffffff';
    var chip = function (i) { var T = CL.TEAMS[i]; return '<div class="pt' + (i === GC.myTeam ? ' mine' : '') + '" style="border-color:' + T.col + '"><span style="color:' + T.col + '">' + T.n + (i === GC.myTeam ? ' · คุณ' : '') + '</span><b>' + G.sc[i] + '%</b></div>'; };
    var fill = p < 0 ? 'left:' + pos + '%;width:' + (50 - pos) + '%;background:' + CL.TEAMS[0].col : 'left:50%;width:' + (pos - 50) + '%;background:' + CL.TEAMS[1].col;
    return '<div class="pbar">' + chip(0) + '<div class="trk"><i class="fl" style="' + fill + '"></i><i class="mk2" style="left:' + pos.toFixed(1) + '%;background:' + pc + '"></i></div>' + chip(1) + '</div>';
  }
  function boardHTML(L, G) {
    var rows = L.s.map(function (p, i) { return { i: i, t: CL.slotTeam(L.f, i), k: G.kd[i][0], d: G.kd[i][1], c: G.kd[i][2], bot: !p }; });
    rows.sort(function (a, b) { return a.t - b.t || b.k - a.k; });
    return '<table><thead><tr><th>ผู้เล่น</th><th class="num">ฆ่า</th><th class="num">ตาย</th><th class="num">' + (G.md === 'push' ? 'บนแท่น' : 'เงิน') + '</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td><span class="tsw" style="background:' + CL.TEAMS[r.t].col + '"></span>' + esc(slotName(L, r.i)) + (r.i === GC.mySlot ? ' <span class="badge you">คุณ</span>' : r.bot ? ' <span class="badge">บอท</span>' : '') + '</td><td class="num">' + r.k + '</td><td class="num">' + r.d + '</td><td class="num">' + (G.md === 'push' ? r.c + ' วิ' : fmtCash(r.c)) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  // =================== SCREENS ===================
  var SCREENS = ['boot', 'main', 'modes', 'armory', 'chars', 'how', 'settings', 'mm', 'lobby', 'load', 'res'];
  var cur = 'boot', armoryReturn = 'main';
  function show(id) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    cur = id;
    var inGame = id === 'game';
    $('hud').hidden = !inGame; $('touch').hidden = !(inGame && isTouch);
    GC.active = inGame;
    if (!inGame) { $('pause').hidden = true; if (locked && document.exitPointerLock) document.exitPointerLock(); hadLock = false; }
    if (id === 'lobby') hudCache.lobby = '';
  }
  function showPause(on) {
    if (!GC.active) return;
    $('pause').hidden = !on;
    if (on) { $('sens2').value = prof.sens; if (locked && document.exitPointerLock) document.exitPointerLock(); hadLock = false; keys = {}; mouse.l = mouse.r = 0; }
  }
  function togglePause() { showPause($('pause').hidden); }
  function routeScreen(L) {
    if (!sess) return;
    var want;
    if (!L) want = 'lobby';
    else if (L.st === 'lobby') want = 'lobby';
    else if (L.st === 'load') want = 'load';
    else if (L.st === 'match') want = 'game';
    else if (L.st === 'res') want = 'res';
    if ((cur === 'armory' || cur === 'chars') && want === 'lobby') want = cur;
    if (want !== cur) {
      if (want === 'game' && !isTouch) { toast('คลิกเพื่อเริ่มควบคุม', 'WASD เดิน · เมาส์เล็ง · E กดค้างเพื่อทำภารกิจ', '#ffc94a'); }
      if (want === 'lobby' || want === 'res') GC.ready = false;
      show(want);
    }
    if (cur === 'lobby') renderLobby(L);
    if (cur === 'load') renderLoad(L);
    if (cur === 'res') renderRes(L);
  }
  // ----- lobby render -----
  function renderLobby(L) {
    var peers = GC.peers, me = GC.me;
    var key = JSON.stringify([L, peers.map(function (p) { return [p.peer, p.presence && p.presence.n, p.presence && p.presence.c, p.presence && p.presence.w, p.presence && p.presence.ch, p.presence && p.presence.rd, p.presence && p.presence.v]; }), GC.amHost, GC.hostPeer, prof.cls, myWpn(), GC.ready]);
    if (hudCache.lobby === key) return; hudCache.lobby = key;
    $('lbCode').textContent = sess.online ? sess.code : 'SOLO';
    $('bCopy').hidden = !sess.online; $('lbCodeL').textContent = sess.online ? (sess.priv ? 'ห้องส่วนตัว · ส่งรหัสให้เพื่อน' : 'ห้องสาธารณะ · เพื่อนเข้าด้วยรหัสได้') : 'โหมดฝึกออฟไลน์';
    if (!L) { $('lbTitle').textContent = 'กำลังเชื่อมต่อห้อง…'; $('lbTeams').innerHTML = ''; $('bStart').hidden = true; $('bReady').hidden = true; $('fmtSeg').innerHTML = ''; $('lbHint').textContent = ''; return; }
    $('lbTitle').textContent = 'ห้องรอแข่ง · ' + CL.FORMATS[L.f].th;
    $('lbMode').textContent = MODE_NAME[L.md] + ' · ล็อบบี้';
    $('mdSeg').innerHTML = Object.keys(CL.MODES).map(function (m) { return '<button data-m="' + m + '" class="' + (L.md === m ? 'on' : '') + '"' + (GC.amHost ? '' : ' disabled') + '>' + MODE_NAME[m] + '</button>'; }).join('');
    var segs = CL.MODES[L.md].fmts.map(function (f) { return '<button data-f="' + f + '" class="' + (L.f === f ? 'on' : '') + '"' + (GC.amHost ? '' : ' disabled') + '>' + CL.FORMATS[f].th + '</button>'; }).join('');
    $('fmtSeg').innerHTML = segs;
    $('lbHint').textContent = GC.amHost ? 'คุณเป็นเจ้าของห้อง · ช่องว่างจะเป็นบอท' : 'เจ้าของห้องเป็นคนเลือกรูปแบบและกดเริ่ม';
    var F = CL.FORMATS[L.f], html = '';
    for (var t = 0; t < F.teams; t++) {
      var T = CL.TEAMS[t];
      html += '<div class="team"><div class="th" style="background:' + T.col + '"><span>' + T.n + '</span><span style="font-family:var(--f-body);font-weight:700;font-size:13px">' + T.th + '</span></div>';
      for (var k = 0; k < F.size; k++) {
        var i = t * F.size + k, p = L.s[i];
        if (p) {
          var pr = presenceOf(peers, p) || {}, c = CL.CLASSES[pr.c] ? pr.c : 'medium', w = CL.WEAPONS[CL.WI[pr.w]];
          var pch = CL.CHI[pr.ch] != null ? pr.ch : 'bob';
          html += '<div class="slot"><img class="pt-mini" alt="" src="' + CLX.portrait(pch) + '"><div style="flex:1;min-width:0"><div class="nm">' + esc(cleanName(pr.n)) + '</div><div class="meta">' + esc(CL.CHARS[CL.CHI[pch]].th) + ' · ' + CL.CLASSES[c].en + ' · ' + esc(w ? w.th : '') + '</div></div>' +
            (p === me ? '<span class="badge you">คุณ</span>' : '') + (p === GC.hostPeer ? '<span class="badge host">HOST</span>' : '') + (pr.rd || p === GC.hostPeer ? '<span class="badge rd">พร้อม</span>' : '<span class="badge">รอ</span>') + '</div>';
        } else {
          html += '<div class="slot bot"><div style="flex:1;min-width:0"><div class="nm">บอทเติมช่อง</div><div class="meta">ว่าง · รอผู้เล่น</div></div>' + (L.s.indexOf(me) >= 0 ? '<button class="btn sm" data-want="' + i + '">ย้ายมาช่องนี้</button>' : '') + '</div>';
        }
      }
      html += '</div>';
    }
    var specs = GC.peers.filter(function (p) { return p.presence && p.presence.v === 1 && L.s.indexOf(p.peer) < 0; });
    if (specs.length) html += '<div class="team"><div class="th" style="background:var(--mut)"><span>ผู้ชม</span></div>' + specs.map(function (p) { return '<div class="slot"><div class="nm">' + esc(cleanName(p.presence.n)) + '</div>' + (p.peer === me ? '<span class="badge you">คุณ</span>' : '') + '</div>'; }).join('') + '</div>';
    $('lbTeams').innerHTML = html;
    $('lbCls').innerHTML = ['light', 'medium', 'heavy'].map(function (c) { return '<button data-c="' + c + '" class="' + (prof.cls === c ? 'on' : '') + '">' + CL.CLASSES[c].en + '</button>'; }).join('');
    $('lbWpn').innerHTML = CL.CLASSES[prof.cls].wpns.map(function (w) { return '<button data-w="' + w + '" class="' + (myWpn() === w ? 'on' : '') + '">' + CL.WEAPONS[CL.WI[w]].th + '</button>'; }).join('');
    var C = CL.CLASSES[prof.cls]; $('lbSpec').textContent = 'อุปกรณ์: ' + CL.WEAPONS[CL.WI[C.gad]].th + ' · พิเศษ: ' + CL.SPECS[C.spec].th;
    var humansIn = L.s.filter(Boolean), ready = humansIn.filter(function (p) { var pr = presenceOf(peers, p); return p === GC.hostPeer || (pr && pr.rd); }).length;
    $('lbReadyTxt').textContent = 'พร้อม ' + ready + '/' + humansIn.length + ' คน · บอท ' + (L.s.length - humansIn.length);
    $('bStart').hidden = !GC.amHost; $('bReady').hidden = GC.amHost;
    $('bReady').textContent = GC.ready ? 'ยกเลิกพร้อม' : 'พร้อม';
  }
  function renderLoad(L) {
    var key = JSON.stringify([L.mid, Math.ceil(L.cd), L.nm, L.s]);
    if (hudCache.load === key) return; hudCache.load = key;
    $('ldCount').textContent = Math.max(0, Math.ceil(L.cd));
    $('ldFmt').textContent = CL.FORMATS[L.f].th;
    $('ldMode').textContent = MODE_NAME[L.md];
    var rules = L.md === 'push' ? [['เป้าหมาย', 'ดันแท่นเข้าประตูฐานศัตรูสุดราง หรือดันได้ไกลกว่าเมื่อหมดเวลา 7 นาที'], ['แท่นเดิน', 'ต้องมีแค่ทีมคุณบนแท่น ยิ่งคนเยอะยิ่งเร็ว'], ['แย่งแท่น', 'มีทั้งสองทีมบนแท่น แท่นจะหยุดนิ่ง'], ['เกิดใหม่', 'ตายแล้วรอ 8 วินาที เกิดหลังฐานตัวเอง']]
      : [['เป้าหมาย', 'ทีมแรกที่ทำเงินถึง $20,000 หรือมีเงินมากสุดเมื่อหมดเวลา 8 นาที'], ['เงินแต่ละรอบ', 'CASHOUT สำเร็จ 1 ครั้ง = $10,000'], ['เกิดใหม่', 'ตายแล้วรอ 8 วินาที เลือดเต็ม'], ['สนามพังได้', 'ยิง ทุบ ระเบิดกำแพง เปิดทางลัดเอง']];
    $('ldRules').innerHTML = rules.map(function (r) { return '<div><b>' + r[0] + '</b>' + r[1] + '</div>'; }).join('');
    $('ldMap').textContent = CL.MAP.th;
    var F = CL.FORMATS[L.f], parts = [];
    for (var t = 0; t < F.teams; t++) {
      var names = [];
      for (var k = 0; k < F.size; k++) { var i = t * F.size + k; names.push(esc(L.nm[i] || '') + (L.s[i] ? '' : ' <span class="badge">บอท</span>') + (L.s[i] === GC.me ? ' <span class="badge you">คุณ</span>' : '')); }
      parts.push('<div class="tcard" style="border-color:' + CL.TEAMS[t].col + '"><b style="color:' + CL.TEAMS[t].col + ';font-family:var(--f-display);font-weight:400">' + CL.TEAMS[t].n + '</b>' + names.map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</div>');
    }
    $('ldVs').innerHTML = parts.join('<div class="vsx">VS</div>');
  }
  function renderRes(L) {
    var r = L.r; if (!r) return;
    var key = JSON.stringify([r, GC.amHost]);
    if (hudCache.res === key) return; hudCache.res = key;
    var w = r.wn;
    $('rsWin').innerHTML = w >= 0 ? '<span style="color:' + CL.TEAMS[w].col + '">' + CL.TEAMS[w].th + '</span> ชนะ!' : 'เสมอ!';
    var myT = GC.mySlot >= 0 ? CL.slotTeam(L.f, GC.mySlot) : -1;
    var pushR = r.md === 'push';
    var line = r.sc.map(function (v, i) { return CL.TEAMS[i].n + (pushR ? ' ดันได้ ' + v + '%' : ' ' + fmtCash(v)); }).join(' · ');
    $('rsSub').textContent = (w >= 0 && myT === w ? 'ยินดีด้วย คุณคือผู้ชนะ · ' : 'ผลการแข่งขัน · ') + line;
    $('rsCol').textContent = pushR ? 'เวลาบนแท่น' : 'เงินที่ทำได้';
    $('rsBody').innerHTML = r.pl.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return b.p[4] - a.p[4] || b.p[2] - a.p[2]; }).map(function (o) {
      var p = o.p; return '<tr><td>' + esc(p[0]) + (p[5] ? '' : ' <span class="badge">บอท</span>') + (o.i === GC.mySlot ? ' <span class="badge you">คุณ</span>' : '') + '</td><td><span class="tsw" style="background:' + CL.TEAMS[p[1]].col + '"></span>' + CL.TEAMS[p[1]].n + '</td><td class="num">' + p[2] + '</td><td class="num">' + p[3] + '</td><td class="num">' + (pushR ? p[4] + ' วิ' : fmtCash(p[4])) + '</td></tr>';
    }).join('');
    $('rsBack').hidden = !GC.amHost;
    $('rsWait').textContent = GC.amHost ? '' : 'รอเจ้าของห้องพากลับล็อบบี้';
  }

  // ----- menu screens -----
  var MODES = [
    { id: 'cash', n: 'CASH RUSH', sub: 'อิงโหมด QUICK CASH', d: 'เปิดตู้เซฟ ขนกล่องเงินไปจุด CASHOUT ป้องกันจนครบเวลา ทีมแรกถึง $20,000 ชนะ', open: 1 },
    { id: 'bank', n: 'COIN BANK', sub: 'อิงโหมด BANK IT', d: 'เก็บเหรียญจากตู้และจากคู่แข่ง แล้วไปฝากที่ธนาคารที่ย้ายจุดไปเรื่อยๆ' },
    { id: 'push', n: 'PLATFORM PUSH', sub: 'อิงโหมด POWER SHIFT', d: 'ยืนบนแท่นที่วิ่งบนราง ดันมันเข้าประตูฐานศัตรู มีศัตรูขึ้นมาด้วยแท่นจะหยุด', open: 1 },
    { id: 'term', n: 'TERMINAL SIEGE', sub: 'อิงโหมด TERMINAL ATTACK', d: 'ฝ่ายบุกวางตัวถอดรหัส ฝ่ายรับป้องกัน แข่งกันเป็นรอบ ไม่มีเกิดใหม่' },
    { id: 'tdm', n: 'HEAD TO HEAD', sub: 'อิงโหมด HEAD2HEAD', d: 'ทีมเดธแมตช์ ทีมแรกที่ทำแต้มฆ่าครบชนะ' },
    { id: 'cup', n: 'BRACKET CUP', sub: 'อิงโหมด TOURNAMENT', d: 'แข่งหลายรอบแบบสาย ทีมที่ตกรอบออกทีละทีมจนเหลือแชมป์' },
    { id: 'range', n: 'TRAINING RANGE', sub: 'อิงโหมด PRACTICE', d: 'สนามซ้อมยิงเป้า ลองอาวุธและระเบิดได้ไม่จำกัด' }
  ];
  function renderModes() {
    $('modeGrid').innerHTML = MODES.map(function (m) {
      return '<button class="mode ' + (m.open ? 'open' + (m.id === selMode ? ' sel' : '') : 'locked') + '" data-m="' + m.id + '" ' + (m.open ? 'aria-pressed="' + (m.id === selMode) + '"' : 'aria-disabled="true"') + '><span class="tag">' + (m.open ? (m.id === selMode ? 'เลือกอยู่' : 'เปิดแล้ว') : 'เฟสถัดไป') + '</span><h3>' + m.n + '</h3><span class="sub">' + m.sub + '</span><p>' + m.d + '</p></button>';
    }).join('');
    $('qcEye').textContent = MODE_NAME[selMode];
  }
  function renderArmory() {
    var mx = { hp: 350, spd: 7.3 };
    $('clsGrid').innerHTML = ['light', 'medium', 'heavy'].map(function (c) {
      var C = CL.CLASSES[c];
      return '<div class="cls' + (prof.cls === c ? ' sel' : '') + '" data-c="' + c + '" role="button" tabindex="0"><div class="row" style="justify-content:space-between"><h3>' + C.en + '</h3><span class="badge">' + C.th + '</span></div>' +
        '<div class="mut" style="font-size:13px">' + C.desc + '</div>' +
        '<div class="stat"><span>พลังชีวิต</span><div class="bar"><i style="width:' + (C.hp / mx.hp * 100) + '%"></i></div><span>' + C.hp + '</span></div>' +
        '<div class="stat"><span>ความเร็ว</span><div class="bar"><i style="width:' + (C.spd / mx.spd * 100) + '%"></i></div><span>' + C.spd + '</span></div>' +
        '<div class="wpns">' + C.wpns.map(function (w) { var W = CL.WEAPONS[CL.WI[w]]; return '<div class="wpn' + (prof.wpn[c] === w || (!prof.wpn[c] && w === C.wpns[0]) ? ' sel' : '') + '" data-c="' + c + '" data-w="' + w + '"><span>' + W.th + '</span><span class="mut">' + (W.melee ? 'ระยะประชิด · ' + W.dmg : W.dmg + (W.pel > 1 ? '×' + W.pel : '') + ' ดาเมจ · ' + W.mag + ' นัด') + '</span></div>'; }).join('') + '</div>' +
        '<div class="kit"><span>อุปกรณ์ <b>' + CL.WEAPONS[CL.WI[C.gad]].th + ' ×' + C.gadN + '</b></span><span>ความสามารถพิเศษ <b>' + CL.SPECS[C.spec].th + '</b></span></div></div>';
    }).join('');
  }
  function renderChars() {
    $('chGrid').innerHTML = CL.CHARS.map(function (c) {
      var V = CLX.vis(c.id);
      return '<button class="chr' + (prof.ch === c.id ? ' sel' : '') + '" data-ch="' + c.id + '" aria-pressed="' + (prof.ch === c.id) + '"><img alt="" src="' + CLX.portrait(c.id) + '"><b>' + esc(c.th) + '</b><span class="mut">' + esc(V.tag) + '</span><span class="emo">T · “' + esc(V.emote) + '”</span></button>';
    }).join('');
  }
  function updMe() {
    $('meAv').innerHTML = '<img alt="" src="' + CLX.portrait(prof.ch) + '">';
    $('meChName').textContent = CL.CHARS[CL.CHI[prof.ch]].th;
    $('meCls').textContent = CL.CLASSES[prof.cls].en;
  }

  // ----- session start/leave -----
  function startSession(code, online, priv, md) {
    leaveSession();
    var s = new Session(code, online, priv);
    s.md = md || selMode; s.fmt = modeFmt(s.md, store.get('fmt_' + s.md, CL.MODES[s.md].def));
    sess = s; lastL = null; lastG = null; GC.ready = false; GC.want = null; GC.mid = '';
    show('lobby'); hudCache.lobby = '';
    return s.open().then(function () { return s; }).catch(function (e) {
      if (sess === s) { sess = null; show('modes'); $('joinErr').textContent = 'เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง'; }
    });
  }
  function leaveSession() {
    if (sess) sess.close();
    sess = null; Host.L = null; Host.M = null; Host.G = null; lastL = null; lastG = null; GC.mid = ''; GC.L = null; GC.G = null; GC.mySlot = -1;
    Object.keys(avatars).forEach(function (k) { disposeAvatar(avatars[k]); delete avatars[k]; });
    world.c.fill(0); CL.genMap(world); remesh(true);
  }
  var mmCancel = false;
  function quickMatch() {
    if (!ROOM) return;
    mmCancel = false; show('mm'); $('mmT').textContent = 'กำลังหาห้อง…'; $('mmS').textContent = 'มองหาห้อง ' + MODE_NAME[selMode] + ' ที่ยังว่าง';
    var t0 = performance.now();
    var tryFind = function () {
      if (mmCancel) return;
      var waited = performance.now() - t0;
      if (!roomReady && waited < 4000) { setTimeout(tryFind, 250); return; }
      if (waited < 1500) { setTimeout(tryFind, 250); return; }
      var ads = ROOM.peers().filter(function (p) {
        var a = p.presence && p.presence.ad;
        return !p.isMe && a && typeof a.c === 'string' && /^[A-Z0-9]{4}$/.test(a.c) && a.st === 'lobby' && a.n < a.cap && (a.md || 'cash') === selMode;
      }).sort(function (a, b) { return b.presence.ad.n - a.presence.ad.n; });
      if (ads.length) { $('mmT').textContent = 'เจอห้องแล้ว'; startSession(ads[0].presence.ad.c, true, false); }
      else { $('mmT').textContent = 'ยังไม่มีห้องว่าง · สร้างห้องใหม่'; startSession(newCode(), true, false); }
    };
    tryFind();
  }

  // ----- wiring -----
  function wire() {
    $('boot').addEventListener('click', function () { Snd.init(); show('main'); if (!prof.name) $('nameIn').focus(); });
    $('boot').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { Snd.init(); show('main'); } });
    $('nameIn').value = prof.name;
    $('nameIn').addEventListener('input', function () { prof.name = $('nameIn').value; saveProf(); updMe(); });
    $('bPlay').addEventListener('click', function () { if (!prof.name.trim()) { prof.name = 'ผู้เล่น' + Math.floor(R() * 900 + 100); $('nameIn').value = prof.name; saveProf(); updMe(); } $('joinErr').textContent = ''; show('modes'); Snd.play('ui'); });
    $('bArmory').addEventListener('click', function () { armoryReturn = 'main'; renderArmory(); show('armory'); Snd.play('ui'); });
    var openChars = function () { renderChars(); show('chars'); Snd.play('ui'); };
    $('bChars').addEventListener('click', openChars); $('meAv').addEventListener('click', openChars); $('lbChar').addEventListener('click', openChars);
    $('chBack').addEventListener('click', function () { if (sess) { hudCache.lobby = ''; show('lobby'); } else show('main'); });
    $('chGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.chr'); if (!b) return;
      prof.ch = b.getAttribute('data-ch'); saveProf(); updMe(); renderChars(); Snd.play('boing');
    });
    $('armBack').addEventListener('click', function () { if (sess) { hudCache.lobby = ''; show('lobby'); } else show(armoryReturn); });
    $('bHow').addEventListener('click', function () { show('how'); });
    $('bSet').addEventListener('click', function () { show('settings'); });
    document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-back')); }); });
    $('bQuick').addEventListener('click', function () { Snd.play('ui'); quickMatch(); });
    $('bCreate').addEventListener('click', function () { Snd.play('ui'); startSession(newCode(), true, true); });
    var doJoin = function () {
      var c = ($('codeIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length !== 4) { $('joinErr').textContent = 'รหัสห้องมี 4 ตัวอักษร'; return; }
      $('joinErr').textContent = ''; startSession(c, true, true);
    };
    $('bJoin').addEventListener('click', doJoin);
    $('codeIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') doJoin(); });
    $('bBots').addEventListener('click', function () { Snd.play('ui'); startSession('SOLO', false, true); });
    $('mmCancel').addEventListener('click', function () { mmCancel = true; leaveSession(); show('modes'); });
    $('clsGrid').addEventListener('click', function (e) {
      var w = e.target.closest('.wpn'), c = e.target.closest('.cls');
      if (w) { prof.cls = w.getAttribute('data-c'); prof.wpn[prof.cls] = w.getAttribute('data-w'); }
      else if (c) prof.cls = c.getAttribute('data-c');
      else return;
      saveProf(); updMe(); renderArmory(); Snd.play('ui');
    });
    // lobby
    $('modeGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.mode.open'); if (!b) return;
      selMode = b.getAttribute('data-m'); store.set('mode', selMode); renderModes(); Snd.play('ui');
    });
    $('mdSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !GC.amHost || !Host.L || Host.L.st !== 'lobby') return;
      var m = b.getAttribute('data-m'); if (!CL.MODES[m]) return;
      Host.L.md = m; Host.L.f = modeFmt(m, store.get('fmt_' + m, CL.MODES[m].def));
      if (sess) { sess.md = m; sess.fmt = Host.L.f; }
      selMode = m; store.set('mode', m); Snd.play('ui');
    });
    $('fmtSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !GC.amHost || !Host.L || Host.L.st !== 'lobby') return;
      var f = b.getAttribute('data-f'); if (!CL.FORMATS[f]) return;
      if (CL.MODES[Host.L.md].fmts.indexOf(f) < 0) return;
      Host.L.f = f; store.set('fmt_' + Host.L.md, f); if (sess) sess.fmt = f; Snd.play('ui');
    });
    $('lbTeams').addEventListener('click', function (e) { var b = e.target.closest('[data-want]'); if (b) { GC.want = +b.getAttribute('data-want'); setTimeout(function () { GC.want = null; }, 1500); Snd.play('ui'); } });
    $('lbCls').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { prof.cls = b.getAttribute('data-c'); saveProf(); updMe(); Snd.play('ui'); } });
    $('lbWpn').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { prof.wpn[prof.cls] = b.getAttribute('data-w'); saveProf(); Snd.play('ui'); } });
    $('bReady').addEventListener('click', function () { GC.ready = !GC.ready; Snd.play('ui'); });
    $('bStart').addEventListener('click', function () { hostStart(); });
    $('bLeave').addEventListener('click', function () { leaveSession(); show('modes'); });
    $('bCopy').addEventListener('click', function () {
      var c = sess ? sess.code : '';
      try { navigator.clipboard.writeText(c).then(function () { $('bCopy').textContent = 'คัดลอกแล้ว'; }, function () { selectCode(); }); } catch (e) { selectCode(); }
    });
    function selectCode() { var r = document.createRange(); r.selectNodeContents($('lbCode')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); $('bCopy').textContent = 'เลือกรหัสแล้ว'; }
    // pause
    $('bResume').addEventListener('click', function () { showPause(false); if (!isTouch) requestLock(); });
    $('bQuit').addEventListener('click', function () { leaveSession(); show('modes'); });
    $('sens2').addEventListener('input', function () { prof.sens = +$('sens2').value; saveProf(); $('sens').value = prof.sens; });
    // results
    $('rsBack').addEventListener('click', function () { hostBackToLobby(); });
    $('rsLeave').addEventListener('click', function () { leaveSession(); show('modes'); });
    // settings
    var bindRange = function (id, key, fmt, after) {
      var el = $(id), out = $(id + 'V'); el.value = prof[key]; out.textContent = fmt(prof[key]);
      el.addEventListener('input', function () { prof[key] = +el.value; out.textContent = fmt(prof[key]); saveProf(); if (after) after(); });
    };
    bindRange('sens', 'sens', function (v) { return v.toFixed(2); });
    bindRange('fov', 'fov', function (v) { return v + '°'; });
    bindRange('vol', 'vol', function (v) { return Math.round(v * 100) + '%'; }, function () { Snd.setVol(prof.vol); });
    var qs = $('qual');
    var updQ = function () { qs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-q') === prof.q); }); };
    qs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; prof.q = +b.getAttribute('data-q'); saveProf(); updQ(); applyQuality(); });
    updQ();
    document.addEventListener('visibilitychange', function () { if (sess) sendPresence(GC.amHost ? Host.L : lastL, GC.amHost); });
    gl.addEventListener('click', function () { Snd.init(); });
    if (isTouch) setupTouch();
    $('tEmote').addEventListener('pointerdown', function (e) { e.preventDefault(); press('emote'); });
    renderModes(); updMe();
  }

  // =================== MAIN LOOP ===================
  var lastT = performance.now(), fpsAcc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
    try {
      if (sess) sessionTick(dt);
      playerUpdate(dt);
      updateCamera(dt);
      updateWorldObjects(dt, now / 1000);
      updateHUD(dt);
      if (GC.active) renderPops(dt); else if (pops.length) { pops = []; setHTML('pops', ''); }
      if (hasGL) {
        updParticles(dt); updTracers(dt); updBooms(dt); updRagdolls(dt);
        remesh(false);
        renderer.render(scene, camera);
      }
    } catch (e) { if (!frame.errs) frame.errs = 0; if (frame.errs++ < 5) console.error(e); }
  }
  // headless-safe step used when the tab is hidden: keep hosting the sim at a low rate
  setInterval(function () {
    if (!document.hidden || !sess) return;
    try { sessionTick(0.25); } catch (e) { }
  }, 250);

  function boot() {
    if (isTouch) document.body.classList.add('touch');
    initGfx();
    if (!hasGL) { $('boot').querySelector('.press').textContent = 'เบราว์เซอร์นี้เปิด WebGL ไม่ได้ จึงแสดงภาพ 3D ไม่ได้'; }
    remesh(true);
    wire();
    initRoom();
    updNet();
    requestAnimationFrame(frame);
    window.__cl = { GC: GC, Host: Host, player: player, world: world, get sess() { return sess; }, get rags() { return rags; }, get pops() { return pops; }, avatars: avatars, show: show, keys: keys, mouse: mouse, press: press, hostStart: hostStart, startSession: startSession };
  }
  boot();
})();
