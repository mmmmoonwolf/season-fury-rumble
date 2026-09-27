// ทดสอบกล้องซูมตามตัวละคร — คำนวณล้วน ไม่ต้องมีเบราว์เซอร์
// รัน: node tools/tests/camera.test.mjs   (จากโฟลเดอร์ game)
//
// กล้องเป็นของที่ "ดูดีหรือไม่ดี" ต้องเล่นถึงรู้ แต่ของที่ "ถูกหรือผิด" เทสต์ได้หมด:
// ครอบทุกคนครบไหม · ออกนอกขอบอาร์ตไหม · ปิดแล้วได้ภาพเดิมไหม · แตะ sim ไหม
import "./phaser_stub.mjs";
import fs from "fs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, STAGE, setStageWidth, STAGE_BASE_W } = await import(G + "/core.js");
const { ScrambleScene } = await import(G + "/ScrambleScene.js");
const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");

setStageWidth(STAGE_BASE_W);

/** ฉากปลอมที่มีแค่สิ่งที่ _stepCamera แตะ */
function mk({ viewW = STAGE.w, follow = true } = {}) {
  const cam = { zoom: 1, cx: null, cy: null, shakes: [],
    setZoom(z) { this.zoom = z; return this; }, centerOn(x, y) { this.cx = x; this.cy = y; return this; },
    shake(ms, i) { this.shakes.push([ms, i]); return this; } };
  const sc = {
    viewW, stagePad: (viewW - STAGE.w) / 2, camFollow: follow,
    cameras: { main: cam },
    sim: new Game(),
  };
  sc._stepCamera = ScrambleScene.prototype._stepCamera;
  sc._shake = ScrambleScene.prototype._shake;
  return sc;
}
/** วางคนตามพิกัดที่ต้องการ — [x, y] ต่อคน */
const place = (sc, spots) => {
  sc.sim.fighters.forEach((f, i) => { const [x, y] = spots[i] ?? spots[spots.length - 1]; f.x = x; f.y = y; });
  return sc;
};
const GROUND = STAGE.groundY;

// ── ปิดปุ่ม Zoom แล้วต้องได้ภาพเดิมทุกพิกเซล ──
//
// ข้อนี้สำคัญที่สุดในไฟล์: ถ้าปิดแล้วไม่เหมือนเดิม แปลว่าฟีเจอร์นี้เปลี่ยนภาพของคนที่ไม่ได้ขอ
{
  for (const viewW of [STAGE.w, 1560, 1920]) {
    const sc = mk({ viewW, follow: false });
    place(sc, [[500, GROUND], [700, GROUND]]);   // ยืนชิดกัน ถ้า follow ทำงานจะซูมเข้า
    sc._stepCamera(sc.sim, true);
    const c = sc.cameras.main;
    ok(c.zoom === 1 && c.cx === STAGE.w / 2 && c.cy === STAGE.h / 2,
      `จอ ${viewW}: ปิดซูมแล้วกล้องอยู่กลางเวที ซูม 1 (zoom=${c.zoom} x=${c.cx} y=${c.cy})`);
  }
}

// ── เปิดแล้วยืนชิดกัน = ซูมเข้า · อยู่คนละมุม = ถอยมาเห็นเวทีเต็ม ──
{
  const near = mk(); place(near, [[600, GROUND], [700, GROUND]]);
  near._stepCamera(near.sim, true);
  ok(near.cameras.main.zoom > 1, `ยืนชิดกันซูมเข้า (${near.cameras.main.zoom.toFixed(3)})`);

  const far = mk(); place(far, [[STAGE.wallL + 20, GROUND], [STAGE.wallR - 20, GROUND]]);
  far._stepCamera(far.sim, true);
  ok(far.cameras.main.zoom === 1, `อยู่คนละมุมเวทีถอยสุด = ซูม 1 (${far.cameras.main.zoom})`);
}

// ── กระจายแนวตั้งก็ต้องถอย ไม่ใช่ดูแต่แกนนอน ──
//
// เคสจริง: Momus กดอัลติแล้วขึ้นไปยืนชั้นบนสุด (y=160) ขณะอีกคนอยู่พื้น (y=620)
// ถ้าคิดแต่แกนนอน กล้องจะซูมเข้าเพราะ x ใกล้กัน แล้วคนบนชั้นหลุดขอบบนหายไปเลย
{
  const sc = mk(); place(sc, [[640, GROUND], [660, 160]]);
  sc._stepCamera(sc.sim, true);
  ok(sc.cameras.main.zoom === 1, `x ใกล้กันแต่คนละชั้นความสูง = ไม่ซูมเข้า (${sc.cameras.main.zoom})`);
}

// ── 2v2: กรอบต้องครอบทั้งสี่คน ไม่ใช่แค่สองคนแรก ──
//
// เขียนเป็น s.p1/s.p2 แล้วเทสต์ 1v1 จะผ่านหมด แต่คนที่สามสี่หลุดจอตลอดเกม
{
  // สองคนแรกยืนชิดกันเหมือนกันทั้งสองเคส ต่างกันแค่มีคนที่สี่อยู่ไกลหรือไม่
  // ถ้ากรอบคิดจากสองคนแรกอย่างเดียว สองเคสนี้จะได้ซูมเท่ากันเป๊ะ
  const two = mk(); place(two, [[600, GROUND], [660, GROUND]]);
  two._stepCamera(two.sim, true);
  const zTwo = two.cameras.main.zoom;

  const sc = mk();
  sc.sim.setRoster(4);
  place(sc, [[600, GROUND], [660, GROUND], [620, GROUND], [STAGE.wallR - 20, GROUND]]);
  sc._stepCamera(sc.sim, true);
  ok(sc.cameras.main.zoom < zTwo,
    `คนที่สี่อยู่ไกลแล้วซูมน้อยกว่าตอนมีสองคน (${sc.cameras.main.zoom.toFixed(3)} < ${zTwo.toFixed(3)})`);

  const wide = mk();
  wide.sim.setRoster(4);
  place(wide, [[STAGE.wallL + 20, GROUND], [660, GROUND], [620, GROUND], [STAGE.wallR - 20, GROUND]]);
  wide._stepCamera(wide.sim, true);
  ok(wide.cameras.main.zoom === 1, `กระจายเต็มเวทีถอยสุด (${wide.cameras.main.zoom})`);

  const tight = mk();
  tight.sim.setRoster(4);
  place(tight, [[600, GROUND], [660, GROUND], [620, GROUND], [680, GROUND]]);
  tight._stepCamera(tight.sim, true);
  ok(tight.cameras.main.zoom > 1, `สี่คนกองกันหมดก็ซูมเข้าได้ (${tight.cameras.main.zoom.toFixed(3)})`);
}

// ── กล้องออกนอกขอบอาร์ตไม่ได้ ไม่ว่าคนจะไปยืนติดกำแพงแค่ไหน ──
//
// หลุดขอบ = เห็นพื้นที่ที่ไม่มีอะไรวาดไว้ ซึ่งบนจอคือแถบดำกลางเกม
{
  let worst = 0;
  for (const viewW of [STAGE.w, 1560, 1920]) {
    for (const [a, b] of [[STAGE.wallL, STAGE.wallL + 40], [STAGE.wallR - 40, STAGE.wallR],
                          [0, 30], [STAGE.w - 30, STAGE.w], [640, 680]]) {
      for (const y of [GROUND, 160, 352]) {
        const sc = mk({ viewW });
        place(sc, [[a, y], [b, y]]);
        for (let i = 0; i < 90; i++) sc._stepCamera(sc.sim);   // ปล่อยให้ไหลเข้าที่จนสุด
        const c = sc.cameras.main;
        const artL = -sc.stagePad, artR = artL + viewW;
        const halfW = viewW / (2 * c.zoom), halfH = STAGE.h / (2 * c.zoom);
        worst = Math.max(worst,
          (artL + halfW) - c.cx, c.cx - (artR - halfW),
          halfH - c.cy, c.cy - (STAGE.h - halfH));
      }
    }
  }
  ok(worst < 1e-9, `ทุกเคสกล้องอยู่ในขอบอาร์ต (หลุดมากสุด ${worst.toFixed(6)} px)`);
}

// ── ถอยต้องเร็วกว่าเข้า ──
//
// คนวาร์ปหนีแล้วกล้องถอยช้า = เขาอยู่นอกจอไปหลายเฟรม
// แปลว่าตายเพราะมองไม่เห็น ไม่ใช่เพราะเล่นแพ้ ซึ่งเป็นความรู้สึกที่แย่ที่สุดของเกมต่อสู้
{
  // หาค่าซูมสูงสุดที่ระยะประชิดให้ได้ก่อน เอามาเป็นระยะทางเดียวกันทั้งสองทิศ
  const probe = mk(); place(probe, [[600, GROUND], [660, GROUND]]);
  probe._stepCamera(probe.sim, true);
  const W = probe.cameras.main.zoom;
  ok(W > 1, "มีระยะให้วัดจริง");

  const zin = mk(); place(zin, [[600, GROUND], [660, GROUND]]);
  zin.camZoom = 1; zin.camX = 630; zin.camY = GROUND - 75;
  zin._stepCamera(zin.sim);
  const movedIn = zin.camZoom - 1;

  const zout = mk(); place(zout, [[STAGE.wallL + 20, GROUND], [STAGE.wallR - 20, GROUND]]);
  zout.camZoom = W; zout.camX = STAGE.w / 2; zout.camY = GROUND - 75;
  zout._stepCamera(zout.sim);
  const movedOut = W - zout.camZoom;

  ok(movedOut > movedIn, `ระยะเท่ากัน ถอยไปได้ไกลกว่าเข้า (ถอย ${movedOut.toFixed(4)} · เข้า ${movedIn.toFixed(4)})`);
  ok(/outLerp/.test(scene) && /inLerp/.test(scene), "ค่าความไวสองทิศแยกกันอยู่จริงในโค้ด");
}

// ── snap วางทันที ไม่ไหลเข้าหา ──
{
  const a = mk(); place(a, [[600, GROUND], [660, GROUND]]);
  a.camZoom = 1; a._stepCamera(a.sim, true);
  const b = mk(); place(b, [[600, GROUND], [660, GROUND]]);
  b.camZoom = 1; b._stepCamera(b.sim);
  ok(a.cameras.main.zoom > b.cameras.main.zoom,
    `snap ถึงเป้าเร็วกว่าไหลปกติ (${a.cameras.main.zoom.toFixed(3)} vs ${b.cameras.main.zoom.toFixed(3)})`);
  const c = mk(); place(c, [[600, GROUND], [660, GROUND]]);
  c.camZoom = 1; c._stepCamera(c.sim, true); const once = c.cameras.main.zoom;
  c._stepCamera(c.sim, true);
  ok(c.cameras.main.zoom === once, "snap แล้วอยู่ที่เป้าจริง เรียกอีกครั้งไม่ขยับ");
}

// ══ กล้องต้องไม่แตะ sim เลย — นี่คือเงื่อนไขที่ทำให้ netplay ไม่พัง ═════════════
//
// ถ้ากล้องเขียนอะไรกลับ sim สองเครื่องจะหลุดกันทันที เพราะรอบวาดของสองเครื่องไม่เท่ากัน
// (เครื่องหนึ่ง 60 Hz อีกเครื่อง 120 Hz = เรียกกล้องคนละจำนวนครั้งต่อเฟรม sim)
{
  const sc = mk(); place(sc, [[600, GROUND], [660, GROUND]]);
  const snapOf = (g) => JSON.stringify([g.frame, g.fighters.map((f) => [f.x, f.y, f.vx, f.vy, f.state, f.hp, f.facing, f.ki]),
    g.shots.length, g.boxes.length, g.fires.length, g.match]);
  const before = snapOf(sc.sim);
  for (let i = 0; i < 120; i++) sc._stepCamera(sc.sim);
  ok(snapOf(sc.sim) === before, "เรียกกล้อง 120 รอบแล้ว sim ไม่เปลี่ยนแม้แต่ค่าเดียว");
}

// ── ใช้ centerOn ไม่ใช่ setScroll (scrollX ของ Phaser ไม่คิดซูมให้) ──
{
  const body = scene.slice(scene.indexOf('_stepCamera(s, snap'), scene.indexOf('_world(obj)'));
  ok(/cam\.centerOn\(/.test(body), "วางกล้องด้วย centerOn");
  ok(!/setScroll/.test(body), "ไม่ใช้ setScroll ในกล้องตามตัว");
  ok(/cam\.setZoom\(z\)/.test(body), "ตั้งซูมที่กล้องโลก");
}

// ══ ซูมกระตุกตอนกระทบ ═════════════════════════════════════════════════════════
//
// คิดจากความแรงของการสั่นกล้องที่มีอยู่แล้ว จึงต้องมีจุดสั่งสั่นจุดเดียวในฉาก
// ถ้ามีใครเรียก cameras.main.shake ตรง ๆ จุดนั้นจะสั่นแต่ไม่กระตุก แล้วรู้สึกไม่เท่ากันโดยไม่มีใครรู้
{
  const body = scene.slice(scene.indexOf('  _shake(ms, intensity)'), scene.indexOf('  _world(obj)'));
  ok(/this\.cameras\.main\.shake\(ms, intensity\)/.test(body), "_shake เป็นคนสั่งสั่นกล้องจริง");
  const outside = scene.split('\n').filter((l, i) =>
    /this\.cameras\.main\.shake\(/.test(l) && !/shake\(ms, intensity\)/.test(l));
  ok(outside.length === 0, `ไม่มีใครเรียกสั่นกล้องตรง ๆ นอก _shake (เจอ ${outside.length} จุด)`);
}

// ── สั่นแล้วกระตุกตามความแรง และซูมที่ใช้จริงสูงกว่าค่าฐาน ──
{
  const sc = mk(); place(sc, [[STAGE.wallL + 20, GROUND], [STAGE.wallR - 20, GROUND]]);
  sc._stepCamera(sc.sim, true);
  ok(sc.cameras.main.zoom === 1 && !sc.camPunch, "เริ่มที่ซูม 1 ไม่มีกระตุกค้าง");

  sc._shake(120, 0.008);
  ok(sc.cameras.main.shakes.length === 1, "สั่นกล้องจริงด้วย");
  ok(sc.camPunch > 0, `ได้กระตุกมา (${sc.camPunch.toFixed(4)})`);
  sc._stepCamera(sc.sim);
  ok(sc.cameras.main.zoom > 1, `ซูมที่ใช้จริงสูงกว่าค่าฐาน (${sc.cameras.main.zoom.toFixed(4)})`);
  ok(sc.camZoom === 1, `แต่ค่าฐานยังเป็น 1 (${sc.camZoom})`);
}

// ── ตีรัวแล้วกระตุกไม่บวกกันจนซูมพุ่ง ──
{
  const sc = mk(); place(sc, [[STAGE.wallL + 20, GROUND], [STAGE.wallR - 20, GROUND]]);
  sc._stepCamera(sc.sim, true);
  for (let i = 0; i < 40; i++) sc._shake(120, 0.012);
  ok(sc.camPunch <= 0.2 + 1e-9, `กระตุกมีเพดาน (${sc.camPunch.toFixed(4)})`);
  sc._stepCamera(sc.sim);
  ok(sc.cameras.main.zoom < 1.3, `ตี 40 ทีติดกันซูมก็ยังไม่พุ่ง (${sc.cameras.main.zoom.toFixed(4)})`);
}

// ── กระตุกต้องยุบหมด ไม่ใช่ค้างสูงขึ้นเรื่อย ๆ ──
//
// บั๊กที่ข้อนี้กันไว้: บวกกระตุกลงค่าฐาน แล้วค่าฐานกลายเป็นจุดตั้งต้นของการไหลรอบหน้า
// ซูมจะไต่ขึ้นทุกครั้งที่ตี แล้วไม่กลับลงมาเลยจนจบยก ซึ่งค่อย ๆ เกิดจนไม่มีใครทันสังเกต
{
  const sc = mk(); place(sc, [[STAGE.wallL + 20, GROUND], [STAGE.wallR - 20, GROUND]]);
  sc._stepCamera(sc.sim, true);
  for (let r = 0; r < 5; r++) {
    sc._shake(120, 0.012);
    for (let i = 0; i < 60; i++) sc._stepCamera(sc.sim);
  }
  ok(sc.camZoom === 1, `ตีห้ารอบแล้วค่าฐานยังเป็น 1 เป๊ะ (${sc.camZoom})`);
  ok(sc.cameras.main.zoom === 1, `และซูมที่ใช้จริงกลับมาที่ 1 (${sc.cameras.main.zoom})`);
}

// ── ปิดปุ่ม Zoom = ไม่มีกระตุกด้วย ภาพจึงเดิมทุกพิกเซลจริง ──
{
  const sc = mk({ follow: false });
  place(sc, [[600, GROUND], [660, GROUND]]);
  sc._shake(180, 0.012);
  ok(!sc.camPunch, "ปิดแล้วสั่นกล้องได้แต่ไม่กระตุก");
  ok(sc.cameras.main.shakes.length === 1, "กล้องยังสั่นเหมือนเดิม — ปิดซูมไม่ได้ปิดการสั่น");
  sc.camPunch = 0.2;                       // สมมติมีกระตุกค้างจากก่อนกดปิด
  sc._stepCamera(sc.sim);
  ok(sc.cameras.main.zoom === 1 && sc.cameras.main.cx === STAGE.w / 2,
    `กดปิดแล้วกระตุกที่ค้างถูกล้างทิ้ง ภาพกลับเป็นเดิมทันที (zoom=${sc.cameras.main.zoom})`);
}

// ── กระตุกแล้วกล้องก็ยังออกนอกขอบอาร์ตไม่ได้ ──
{
  let worst = 0;
  for (const viewW of [STAGE.w, 1560, 1920]) {
    for (const [a, b] of [[STAGE.wallL, STAGE.wallL + 40], [STAGE.wallR - 40, STAGE.wallR], [640, 700]]) {
      const sc = mk({ viewW });
      place(sc, [[a, GROUND], [b, GROUND]]);
      for (let i = 0; i < 60; i++) {
        if (i % 7 === 0) sc._shake(120, 0.012);
        sc._stepCamera(sc.sim);
        const c = sc.cameras.main;
        const artL = -sc.stagePad, artR = artL + viewW;
        const halfW = viewW / (2 * c.zoom), halfH = STAGE.h / (2 * c.zoom);
        worst = Math.max(worst, (artL + halfW) - c.cx, c.cx - (artR - halfW),
          halfH - c.cy, c.cy - (STAGE.h - halfH));
      }
    }
  }
  ok(worst < 1e-9, `กระตุกระหว่างเล่นก็ยังอยู่ในขอบ (หลุดมากสุด ${worst.toFixed(6)} px)`);
}
