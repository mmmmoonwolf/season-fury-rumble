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
const { ScrambleScene, CAM } = await import(G + "/ScrambleScene.js");
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
          halfH - c.cy, c.cy - (CAM.viewBot - halfH));
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
    g.shots.length, g.fires.length, g.match]);
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
          halfH - c.cy, c.cy - (CAM.viewBot - halfH));
      }
    }
  }
  ok(worst < 1e-9, `กระตุกระหว่างเล่นก็ยังอยู่ในขอบ (หลุดมากสุด ${worst.toFixed(6)} px)`);
}

// ══ กรอบแนวตั้ง: คนต้องอยู่กลางเฟรม ไม่ใช่ติดก้นจอ ════════════════════════════
//
// ที่ซูม 1 กล้องสูงเท่าเวทีพอดี ถ้าบีบก้นกล้องไว้ที่ STAGE.h จุดกลางกล้องจะถูกตรึงที่ 360
// ตลอดกาล คนยืนพื้น (y=620) จึงอยู่ที่ 86% ของความสูงจอเสมอ — หัวติดกลางจอ เท้าเกือบชนขอบล่าง
// **แก้จากสูตรเล็งไม่ได้เลย** เพราะขอบเป็นตัวบีบ ไม่ใช่เป้า ต้องเปิดที่ให้กล้องเลื่อนลงก่อน (CAM.viewBot)
{
  const { PHYS } = await import(G + "/core.js");
  /** ตำแหน่งบนจอ (0 = ขอบบน, 1 = ขอบล่าง) ของพิกัดโลกหนึ่งจุด */
  const frac = (c, worldY) => ((worldY - c.cy) * c.zoom + STAGE.h / 2) / STAGE.h;

  ok(CAM.viewBot > STAGE.h, `กล้องมองต่ำกว่าเส้นพื้นได้ (ก้นที่ ${CAM.viewBot} > ${STAGE.h})`);

  // ยืนพื้นกันทั้งคู่ = เคสที่เจอบ่อยที่สุดในเกม ต้องได้กรอบที่ดีที่สุด
  const sc = mk(); place(sc, [[600, GROUND], [700, GROUND]]);
  for (let i = 0; i < 120; i++) sc._stepCamera(sc.sim);
  const c = sc.cameras.main;
  const mid = frac(c, GROUND - PHYS.standH / 2);   // กลางลำตัว ไม่ใช่เท้า
  ok(mid > 0.38 && mid < 0.62, `ยืนพื้นแล้วลำตัวอยู่กลางเฟรม (${(mid * 100).toFixed(0)}% ของความสูงจอ)`);
  ok(frac(c, GROUND) < 0.78, `เท้าไม่ได้ติดขอบล่าง (${(frac(c, GROUND) * 100).toFixed(0)}%)`);

  // ขอบบนห้ามหลุด — เหนือ y=0 ไม่มีอาร์ตอยู่แล้ว
  ok(frac(c, 0) <= 0 + 1e-9, "ขอบบนของจอยังไม่เลยขอบบนของอาร์ต");

  // เทียบกับของเดิมตรง ๆ: ปิดปุ่ม Zoom = ก้นกลับไปเป็น STAGE.h = กรอบเดิมเป๊ะ
  // ข้อนี้คือตัวพิสูจน์ว่าเลขข้างบนมาจาก viewBot จริง ไม่ใช่บังเอิญ
  const old = mk({ follow: false }); place(old, [[600, GROUND], [700, GROUND]]);
  for (let i = 0; i < 120; i++) old._stepCamera(old.sim);
  const oldMid = frac(old.cameras.main, GROUND - PHYS.standH / 2);
  ok(oldMid > 0.75, `ของเดิม (ปิดซูม) ลำตัวอยู่ที่ ${(oldMid * 100).toFixed(0)}% — ต่ำกว่าของใหม่ชัดเจน`);
  ok(mid < oldMid - 0.15, `ของใหม่ยกขึ้นมาจริง (${(mid * 100).toFixed(0)}% เทียบ ${(oldMid * 100).toFixed(0)}%)`);

  // ขึ้นชั้นบนแล้วกล้องต้องตามขึ้นไป ไม่ใช่ค้างอยู่ก้นเวที
  const hi = mk(); place(hi, [[600, 352], [700, 352]]);
  for (let i = 0; i < 120; i++) hi._stepCamera(hi.sim);
  ok(hi.cameras.main.cy < c.cy, `ขึ้นชั้นบนกล้องเลื่อนตามขึ้น (${hi.cameras.main.cy.toFixed(0)} < ${c.cy.toFixed(0)})`);
}

// ══ ใต้เส้นพื้นต้องมีอะไรวาดไว้จริง จนถึงก้นที่กล้องมองได้ ═════════════════════
//
// เปิดที่ให้กล้องเลื่อนลงแล้วไม่วาดอะไรรองไว้ = แถบสีพื้นหลัง canvas พาดขวางก้นจอตลอดเกม
// ซึ่งเป็นการแลกบั๊กหนึ่งกับอีกบั๊กหนึ่ง ไม่ใช่การแก้
{
  const VIEW = 1560, SEAM = 812;      // รูปพื้นบนจอ 1560 จบที่ราว ๆ นี้
  const layers = [];
  const mkG = () => {
    const g = { rects: [], ells: [],
      setDepth(d) { this.depth = d; return this; }, fillStyle(c, a) { this.a = a; return this; },
      fillRect(x, y, w, h) { this.rects.push([x, y, w, h]); return this; },
      fillEllipse(x, y, w, h) { this.ells.push({ x, y, w, h, a: this.a }); return this; } };
    layers.push(g);
    return g;
  };
  const sc = { viewW: VIEW, add: { graphics: mkG } };
  sc._drawAbyss = ScrambleScene.prototype._drawAbyss;
  sc._drawAbyss(SEAM);

  const fill = layers.find((g) => g.rects.length);
  ok(!!fill, "วาดจริง ไม่ได้เป็นเมธอดเปล่า");
  ok(fill.depth < -28 && fill.depth > -40, `พื้นฟ้าใต้เกาะอยู่หลังหน้าผาแต่หน้าฟ้า (depth ${fill.depth})`);
  const top = Math.min(...fill.rects.map((r) => r[1]));
  const bot = Math.max(...fill.rects.map((r) => r[1] + r[3]));
  ok(top <= STAGE.groundY, `เริ่มถมตั้งแต่เส้นพื้นขึ้นไป (${top} <= ${STAGE.groundY})`);
  ok(bot >= CAM.viewBot, `ถมลงไปถึงก้นที่กล้องมองได้ (${bot} >= ${CAM.viewBot})`);

  // ต้องคลุมเต็มความกว้างจอ ไม่ใช่แค่ความกว้างเวที — กล้องเลื่อนซ้ายขวาได้ด้วย
  const fx0 = Math.min(...fill.rects.map((r) => r[0]));
  const fx1 = Math.max(...fill.rects.map((r) => r[0] + r[2]));
  ok(fx1 - fx0 >= VIEW - 1e-9 && fx0 <= (STAGE.w - VIEW) / 2 + 1e-9,
    `คลุมเต็มความกว้างจอ (${fx0} ถึง ${fx1})`);

  // ไม่มีช่องโหว่ระหว่างแถบ — ไล่เฉดทีละ 4 px ถ้าเว้นช่องจะเห็นเป็นเส้นริ้ว
  const rows = fill.rects.filter((r) => r[1] + r[3] > STAGE.groundY).sort((a, b) => a[1] - b[1]);
  let hole = 0;
  for (let i = 1; i < rows.length; i++) hole = Math.max(hole, rows[i][1] - (rows[i - 1][1] + rows[i - 1][3]));
  ok(hole <= 0, `ไม่มีช่องโหว่ระหว่างแถบไล่เฉด (ช่องกว้างสุด ${hole} px)`);

  // ── แนวเมฆต้องอยู่ "หน้า" รูปพื้น ไม่งั้นบังรอยตัดไม่ได้เลย ──
  //
  // รูปพื้นจบด้วยเส้นตรงแนวนอน (ตอนออกแบบมันอยู่ใต้ขอบจอ) กล้องที่เลื่อนลงได้ทำให้เห็นเส้นนั้น
  // เมฆที่วาดไว้หลังเกาะไม่ได้แก้อะไรเลย — ข้อนี้คือข้อที่แยกสองอย่างนั้นออกจากกัน
  const bank = layers.find((g) => g.ells.length && g.depth > -10);
  ok(!!bank, `มีแนวเมฆที่อยู่หน้ารูปพื้น (depth ของแต่ละชั้น: ${layers.map((g) => g.depth).join(', ')})`);

  // และต้องทับเส้นรอยตัดต่อเนื่องตลอดความกว้างจอ อย่างน้อยจุดละสองวง
  // วงเดียวไม่พอ: ขอบวงจาง ถ้ามีจุดที่วงเดียวคลุม เส้นตรงจะโผล่เป็นช่วง ๆ ซึ่งดูแย่กว่าเส้นเต็ม
  const covers = (e, x, y) => ((x - e.x) / (e.w / 2)) ** 2 + ((y - e.y) / (e.h / 2)) ** 2 <= 1;
  let thin = 0, worstX = null;
  for (let x = (STAGE.w - VIEW) / 2; x <= (STAGE.w + VIEW) / 2; x += 5) {
    const n = bank.ells.filter((e) => covers(e, x, SEAM)).length;
    if (n < 2 && (worstX === null || n < thin)) { thin = n; worstX = x; }
  }
  ok(worstX === null, worstX === null
    ? "แนวเมฆทับรอยตัดต่อเนื่องทั้งจอ อย่างน้อยจุดละสองวง"
    : `มีช่องที่เมฆบางเกิน — x=${worstX} ถูกทับแค่ ${thin} วง`);
}
