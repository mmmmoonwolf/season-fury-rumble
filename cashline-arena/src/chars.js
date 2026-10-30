/* ================= CASHLINE CHARACTERS & CHAOS =================
   Chibi voxel characters (one per office member), 2D portraits, goofy death ragdolls, comic popups.
   Loaded after three.js and core.js, before client.js. Exposes window.CLX. */
var CLX = (function () {
  'use strict';
  // ---- look of each character (ids must match CL.CHARS). Colours are 0xRRGGBB. ----
  // hair styles: bob | long | messy | slick | short | wavy | mop
  var CHAR_VIS = {
    bob:   { tag: 'เด็กเงียบ สายซุ่ม', skin: 0xf1c9a5, hair: 'bob', hairC: 0x1b1612, shirt: 0x17171d, pants: 0x8fb2d6, shoes: 0xc3c6cf, emote: '...', conf: [0x8fb2d6, 0x17171d, 0xffffff] },
    rock:  { tag: 'มินิฮาร์ตให้ก่อนยิง', skin: 0xd6a07a, hair: 'long', hairC: 0x16120f, shades: true, shirt: 0x1b1b23, pants: 0x8e8a70, shoes: 0xe9e6dc, emote: 'มินิฮาร์ต ♥', conf: [0xff5a8a, 0xffffff, 0x8e8a70] },
    sock:  { tag: 'ถุงเท้าคือชีวิต', skin: 0xf3cfb0, hair: 'long', hairC: 0x120e0c, shirt: 0x1f2438, pants: 0x16161c, shoes: 0x0f0f13, socks: true, emote: 'ถุงเท้าฉันล่ะ!?', conf: [0x111111, 0x1f2438, 0xffffff] },
    specs: { tag: 'พี่ใหญ่ หัวเอียง', skin: 0xeec4a0, hair: 'messy', hairC: 0x1e1915, glasses: 0xb4692a, shirt: 0x2d3653, collar: true, pants: 0x2a2a30, shoes: 0x1a1a1f, emote: 'หืม?', tilt: 0.18, conf: [0xb4692a, 0x2d3653, 0xffffff] },
    smile: { tag: 'ยิ้มหวาน ยิงโหด', skin: 0xc98f6a, hair: 'slick', hairC: 0x15100d, shirt: 0x8a6a4a, pat: 'print', sleeveless: true, pants: 0x3b2f25, shoes: 0x1a1a1f, emote: 'ฮิฮิ~', conf: [0xffb3c7, 0x8a6a4a, 0xffe08a] },
    polo:  { tag: 'สตาฟประจำร้าน', skin: 0xd9a47e, hair: 'short', hairC: 0x15110e, shirt: 0x14161f, pat: 'logo', collar: true, pants: 0x3a3b40, shoes: 0x111114, watch: true, emote: 'รับอะไรดีครับ', conf: [0xd8b25a, 0x14161f, 0xffffff] },
    grey:  { tag: 'เท่แบบเงียบๆ', skin: 0xd7a27c, hair: 'wavy', hairC: 0x17120f, shirt: 0x6c6f67, pants: 0x232a3d, shoes: 0x15151a, emote: 'ชิลๆ', conf: [0x6c6f67, 0x232a3d, 0xffffff] },
    pine:  { tag: 'สับปะรดสายป่วน', skin: 0xf0c8a4, hair: 'mop', hairC: 0x1a1512, glasses: 0xdfe6ee, shirt: 0xf6efd9, pat: 'pine', pants: 0xd8c4a1, shoes: 0x15151a, emote: 'ปั่นนน!', conf: [0xf2c230, 0x5fa83a, 0xf6efd9] }
  };
  function vis(id) { return CHAR_VIS[id] || CHAR_VIS.bob; }
  function hex(c) { return '#' + ('00000' + c.toString(16)).slice(-6); }

  // ---- shirt patterns (canvas textures) ----
  function drawPattern(c, kind, base, w, h) {
    c.fillStyle = hex(base); c.fillRect(0, 0, w, h);
    if (kind === 'pine') {
      for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) {
        var px = (x + (y % 2) * 0.5) * w / 3 + w / 6 - w / 12, py = y * h / 3 + h / 6;
        c.fillStyle = '#5fa83a'; c.fillRect(px - w * 0.03, py - h * 0.13, w * 0.06, h * 0.07);
        c.fillStyle = '#f2c230'; c.fillRect(px - w * 0.06, py - h * 0.07, w * 0.12, h * 0.15);
        c.fillStyle = '#c99a1c'; c.fillRect(px - w * 0.02, py - h * 0.03, w * 0.04, h * 0.04);
      }
    } else if (kind === 'print') {
      c.strokeStyle = '#d9b48a'; c.lineWidth = Math.max(1, w / 32);
      for (var i = 0; i < 6; i++) { c.beginPath(); c.arc((i * 37) % w, (i * 53) % h, w * 0.18, 0, Math.PI * 1.3); c.stroke(); }
      c.fillStyle = '#3d2a1a'; for (var j = 0; j < 10; j++) c.fillRect((j * 23) % w, (j * 41) % h, w * 0.05, h * 0.05);
    } else if (kind === 'logo') {
      c.fillStyle = '#d8b25a'; c.fillRect(w * 0.56, h * 0.18, w * 0.3, h * 0.12);
      c.fillStyle = hex(base); c.fillRect(w * 0.6, h * 0.21, w * 0.22, h * 0.06);
    }
  }
  var texCache = {};
  function patTex(kind, base) {
    var k = kind + base; if (texCache[k]) return texCache[k];
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    drawPattern(cv.getContext('2d'), kind, base, 64, 64);
    var t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; texCache[k] = t; return t;
  }

  // ---- 3D chibi. Origin at the feet, faces -z. Total height ~1.95. ----
  var geoCache = {};
  function bgeo(w, h, d) { var k = w + ',' + h + ',' + d; return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d)); }
  function makeChibi(chId, teamHex, cls) {
    var V = vis(chId), s = { light: 0.9, medium: 1, heavy: 1.14 }[cls] || 1;
    var mats = [];
    var lam = function (c) { var m = new THREE.MeshLambertMaterial({ color: c }); mats.push(m); return m; };
    var skin = lam(V.skin), hairM = lam(V.hairC), pantsM = lam(V.pants), shoeM = lam(V.shoes), team = lam(teamHex), dark = lam(0x1a1a24);
    var shirtM = V.pat ? (function () { var m = new THREE.MeshLambertMaterial({ map: patTex(V.pat, V.shirt) }); mats.push(m); return m; })() : lam(V.shirt);
    var g = new THREE.Group(), meshes = [];
    function box(w, h, d, mat, x, y, z, parent) { var m = new THREE.Mesh(bgeo(w, h, d), mat); m.position.set(x, y, z); (parent || g).add(m); meshes.push(m); return m; }
    function pivot(x, y, z) { var p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; }
    // legs (pivot at hip)
    var legs = [-1, 1].map(function (sd) {
      var L = pivot(sd * 0.13 * s, 0.62, 0);
      box(0.22 * s, 0.5, 0.26, pantsM, 0, -0.27, 0, L);
      if (V.socks) box(0.23 * s, 0.1, 0.27, lam(0x101012), 0, -0.47, 0, L);
      box(0.25 * s, 0.12, 0.33, shoeM, 0, -0.56, -0.03, L);
      return L;
    });
    // torso
    var torso = box(0.56 * s, 0.7, 0.36 * s, shirtM, 0, 0.97, 0);
    if (V.collar) box(0.34 * s, 0.07, 0.38 * s, shirtM, 0, 1.33, 0);
    box(0.58 * s, 0.06, 0.38 * s, team, 0, 0.66, 0); // team-colour belt
    // arms (pivot at shoulder), held forward to carry the gun
    var arms = [-1, 1].map(function (sd) {
      var A = pivot(sd * (0.28 * s + 0.09), 1.26, 0);
      box(0.17, 0.3, 0.2, V.sleeveless ? skin : shirtM, 0, -0.15, 0, A);
      box(0.18, 0.07, 0.21, team, 0, -0.06, 0, A); // armband = team colour
      box(0.15, 0.14, 0.17, skin, 0, -0.37, 0, A);
      if (V.watch && sd < 0) box(0.17, 0.05, 0.19, lam(0xd8c08a), 0, -0.29, 0, A);
      A.rotation.x = -1.25; A.rotation.z = sd * -0.12;
      return A;
    });
    var gun = box(0.1, 0.13, 0.6, dark, 0.12 * s, 1.08, -0.5);
    // head
    var head = pivot(0, 1.62, 0); head.rotation.z = V.tilt || 0;
    box(0.56, 0.52, 0.52, skin, 0, 0, 0, head);
    var black = lam(0x141418), blush = lam(0xff9fae);
    [-1, 1].forEach(function (sd) { box(0.07, 0.1, 0.02, black, sd * 0.12, 0, -0.265, head); box(0.09, 0.04, 0.02, blush, sd * 0.18, -0.09, -0.262, head); });
    box(0.08, 0.03, 0.02, lam(0x8a3b3b), 0, -0.13, -0.262, head);
    hairOn(V.hair, function (w, h, d, x, y, z) { box(w, h, d, hairM, x, y, z, head); });
    if (V.glasses != null) {
      var gm = lam(V.glasses);
      [-1, 1].forEach(function (sd) {
        var cx = sd * 0.12;
        box(0.17, 0.025, 0.02, gm, cx, 0.075, -0.285, head); box(0.17, 0.025, 0.02, gm, cx, -0.07, -0.285, head);
        box(0.025, 0.15, 0.02, gm, cx - 0.085, 0, -0.285, head); box(0.025, 0.15, 0.02, gm, cx + 0.085, 0, -0.285, head);
        box(0.02, 0.025, 0.28, gm, sd * 0.285, 0.05, -0.14, head);
      });
      box(0.07, 0.02, 0.02, gm, 0, 0.03, -0.285, head);
    }
    if (V.shades) { box(0.46, 0.07, 0.07, black, 0, 0.3, -0.16, head); [-1, 1].forEach(function (sd) { box(0.17, 0.1, 0.04, black, sd * 0.12, 0.3, -0.2, head); }); }
    return { g: g, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head: head, torso: torso, gun: gun, meshes: meshes, mats: mats, V: V };
  }
  // hair pieces relative to the head centre (head is 0.56 x 0.52 x 0.52; front is -z)
  function hairOn(style, put) {
    var cap = function (t) { put(0.6, t, 0.58, 0, 0.26 + t / 2 - 0.05, 0.01); };
    var back = function (h, y) { put(0.6, h, 0.08, 0, y, 0.29); };
    var sides = function (h, y) { put(0.07, h, 0.5, -0.31, y, 0.02); put(0.07, h, 0.5, 0.31, y, 0.02); };
    var bangs = function (h, y, d) { put(0.58, h, d || 0.06, 0, y, -0.28); };
    if (style === 'bob') { cap(0.14); back(0.5, 0); sides(0.46, 0.02); bangs(0.14, 0.18); }
    else if (style === 'long') { cap(0.14); put(0.62, 1.0, 0.09, 0, -0.28, 0.3); sides(0.72, -0.12); bangs(0.09, 0.21); }
    else if (style === 'messy') { cap(0.18); [[-0.18, -0.1], [0.05, 0.12], [0.2, -0.15], [-0.05, -0.2], [0.15, 0.18]].forEach(function (p) { put(0.13, 0.12, 0.13, p[0], 0.4, p[1]); }); back(0.26, 0.12); sides(0.22, 0.14); bangs(0.08, 0.22); }
    else if (style === 'slick') { cap(0.08); back(0.34, 0.1); sides(0.18, 0.16); put(0.2, 0.2, 0.18, 0, 0.12, 0.38); }
    else if (style === 'short') { cap(0.11); back(0.26, 0.13); sides(0.2, 0.16); bangs(0.06, 0.22); }
    else if (style === 'wavy') { cap(0.13); [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14], [0, 0]].forEach(function (p) { put(0.17, 0.1, 0.17, p[0], 0.37, p[1]); }); back(0.3, 0.1); sides(0.24, 0.13); bangs(0.07, 0.22); }
    else { /* mop */ put(0.64, 0.18, 0.62, 0, 0.3, 0.01); put(0.08, 0.38, 0.52, -0.32, 0.08, 0.02); put(0.08, 0.38, 0.52, 0.32, 0.08, 0.02); back(0.42, 0.05); bangs(0.16, 0.16, 0.08); }
  }
  function disposeChibi(C) { C.mats.forEach(function (m) { m.dispose(); }); }

  // ---- 2D portrait (front view) for menus. Returns a data: URL, cached. ----
  var portraitCache = {};
  function portrait(chId) {
    if (portraitCache[chId]) return portraitCache[chId];
    // head-and-shoulders crop: world y 0.5 .. 2.3
    var V = vis(chId), W = 160, H = 180, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var u = 100; // px per world unit
    var X = function (x) { return W / 2 + x * u; }, Y = function (y) { return H - (y - 0.5) * u; };
    var rect = function (col, x, y, w, h) { c.fillStyle = typeof col === 'number' ? hex(col) : col; c.fillRect(X(x - w / 2), Y(y + h / 2), w * u, h * u); };
    // long hair behind
    if (V.hair === 'long') rect(V.hairC, 0, 1.34, 0.62, 1.0);
    rect(V.shoes, -0.13, 0.06, 0.25, 0.12); rect(V.shoes, 0.13, 0.06, 0.25, 0.12);
    if (V.socks) { rect(0x101012, -0.13, 0.15, 0.23, 0.1); rect(0x101012, 0.13, 0.15, 0.23, 0.1); }
    rect(V.pants, -0.13, 0.4, 0.22, 0.48); rect(V.pants, 0.13, 0.4, 0.22, 0.48);
    // torso with pattern
    var tw = 0.56, th = 0.7, tx = X(-tw / 2), ty = Y(0.97 + th / 2);
    c.save(); c.translate(tx, ty); drawPattern(c, V.pat || 'none', V.shirt, tw * u, th * u); c.restore();
    if (V.collar) rect(V.shirt, 0, 1.33, 0.34, 0.07);
    [-1, 1].forEach(function (sd) {
      rect(V.sleeveless ? V.skin : V.shirt, sd * 0.37, 1.1, 0.17, 0.32);
      rect(V.skin, sd * 0.37, 0.88, 0.15, 0.14);
      if (V.watch && sd < 0) rect(0xd8c08a, -0.37, 0.96, 0.17, 0.05);
    });
    rect(0xffc94a, 0, 0.66, 0.58, 0.06);
    c.save(); c.translate(X(0), Y(1.62)); c.rotate(-(V.tilt || 0)); c.translate(-X(0), -Y(1.62));
    rect(V.skin, 0, 1.62, 0.56, 0.52);
    hairOn(V.hair, function (w, h, d, x, y, z) { if (z > 0.25) return; rect(V.hairC, x, 1.62 + y, w, h); }); // skip back pieces
    [-1, 1].forEach(function (sd) { rect(0x141418, sd * 0.12, 1.62, 0.07, 0.1); rect(0xff9fae, sd * 0.18, 1.53, 0.09, 0.04); });
    rect(0x8a3b3b, 0, 1.49, 0.08, 0.03);
    if (V.glasses != null) {
      c.strokeStyle = hex(V.glasses); c.lineWidth = 3;
      [-1, 1].forEach(function (sd) { c.strokeRect(X(sd * 0.12 - 0.085), Y(1.62 + 0.075), 0.17 * u, 0.15 * u); });
      rect(V.glasses, 0, 1.65, 0.07, 0.02);
    }
    if (V.shades) { rect(0x141418, 0, 1.92, 0.46, 0.07); rect(0x141418, -0.12, 1.92, 0.17, 0.1); rect(0x141418, 0.12, 1.92, 0.17, 0.1); }
    c.restore();
    return (portraitCache[chId] = cv.toDataURL());
  }

  return { CHAR_VIS: CHAR_VIS, vis: vis, makeChibi: makeChibi, disposeChibi: disposeChibi, portrait: portrait, hex: hex };
})();
