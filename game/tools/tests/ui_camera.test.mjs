// ทดสอบการแยกกล้อง UI ออกจากกล้องโลก
// รัน: node tools/tests/ui_camera.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: HUD เป็นอ็อบเจกต์ในโลกเหมือนตัวละคร ใช้กล้องเดียวแล้วซูมทีหลอดเลือดโตตาม
// การแยกเป็นงานที่พลาดแบบเงียบ ๆ ได้ — ลืมลงทะเบียนของชิ้นไหน ชิ้นนั้นถูกวาดสองรอบ
// รอบที่สองใช้พิกัดของกล้อง UI เห็นเป็นภาพซ้อนเลื่อนไปอีกที่ ซึ่งดูเหมือนบั๊กกราฟิกไม่ใช่บั๊กกล้อง
import "./phaser_stub.mjs";
import fs from "fs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { STAGE } = await import(G + "/core.js");
const { ScrambleScene } = await import(G + "/ScrambleScene.js");
const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");

/** ฉากปลอมที่มีแค่สิ่งที่ _splitCameras แตะ */
function mk(uiCount = 3, worldCount = 5) {
  const cam = (name) => ({ name, ignored: [], ignore(o) { this.ignored.push(...(Array.isArray(o) ? o : [o])); return this; }, setName(n) { this.name = n; return this; } });
  const ui = Array.from({ length: uiCount }, (_, i) => ({ tag: 'ui' + i }));
  const world = Array.from({ length: worldCount }, (_, i) => ({ tag: 'w' + i }));
  const added = [];
  const sc = {
    viewW: 1560, uiObjects: ui,
    children: { list: [...world.slice(0, 3), ...ui, ...world.slice(3)] },   // ปนกัน ไม่ได้เรียงเป็นก้อน
    cameras: { main: cam('main'), add(x, y, w, h) { const c = cam('new'); c.rect = [x, y, w, h]; added.push(c); return c; } },
  };
  sc._splitCameras = ScrambleScene.prototype._splitCameras;
  sc._world = ScrambleScene.prototype._world;
  return { sc, ui, world, added };
}

// ── แบ่งครบ ไม่มีชิ้นไหนตกหล่นและไม่มีชิ้นไหนถูกนับสองที่ ──
{
  const { sc, ui, world } = mk();
  sc._splitCameras();
  const mainIgn = sc.cameras.main.ignored, uiIgn = sc.uiCam.ignored;
  ok(ui.every((o) => mainIgn.includes(o)), "กล้องโลกไม่วาด UI ทุกชิ้น");
  ok(world.every((o) => uiIgn.includes(o)), "กล้อง UI ไม่วาดของในโลกทุกชิ้น");
  ok(!world.some((o) => mainIgn.includes(o)), "ของในโลกยังถูกกล้องโลกวาดอยู่");
  ok(!ui.some((o) => uiIgn.includes(o)), "UI ยังถูกกล้อง UI วาดอยู่");
  // ชิ้นที่ไม่ถูกกล้องไหนมองข้าม = ถูกวาดสองรอบ ซึ่งคืออาการภาพซ้อน
  const both = [...ui, ...world].filter((o) => !mainIgn.includes(o) && !uiIgn.includes(o));
  ok(both.length === 0, `ไม่มีชิ้นไหนถูกวาดสองรอบ (เจอ ${both.length})`);
}

// ── กล้อง UI กว้างเท่าจอจริง ไม่ใช่เท่าพื้นที่เล่น ──
{
  const { sc } = mk();
  sc._splitCameras();
  ok(sc.uiCam.rect.join() === `0,0,1560,${STAGE.h}`, `กล้อง UI คลุมเต็มจอ (${sc.uiCam.rect.join()})`);
  ok(sc.uiCam.name === 'ui', "ตั้งชื่อกล้องไว้ให้ดีบั๊กได้");
}

// ── เรียกซ้ำไม่สร้างกล้องเพิ่ม ──
//
// เรียกซ้ำเกิดได้จริงตอนกลับเข้าฉากเดิม ถ้าสร้างเพิ่มทุกครั้ง HUD จะทับกันหลายชั้นแล้วจางผิด
{
  const { sc, added } = mk();
  sc._splitCameras();
  sc._splitCameras();
  ok(added.length === 1, `สร้างกล้อง UI ครั้งเดียว (สร้าง ${added.length} ตัว)`);
}

// ── _world() ลงทะเบียนของที่สร้างทีหลัง และคืนอ็อบเจกต์เดิมกลับไป ──
//
// ต้องคืนตัวเดิมเพราะที่เรียกใช้เอาไปต่อ .setDepth()/.setVisible() ทันที
{
  const { sc } = mk();
  sc._splitCameras();
  const late = { tag: 'late' };
  ok(sc._world(late) === late, "คืนอ็อบเจกต์เดิมกลับไป ใช้ต่อในบรรทัดเดียวได้");
  ok(sc.uiCam.ignored.includes(late), "และกล้อง UI ไม่วาดมัน");
}

// ── เรียกก่อนแยกกล้องต้องไม่พัง ──
{
  const { sc } = mk();
  const early = { tag: 'early' };
  ok(sc._world(early) === early, "ยังไม่มีกล้อง UI ก็เรียกได้ ไม่ throw");
}

// ══ ทุกจุดที่สร้างของในโลกหลังแยกกล้องต้องเรียก _world ════════════════════════
//
// นี่คือข้อที่กันการพลาดในอนาคต: เพิ่ม this.add.sprite ที่ไหนก็ได้แล้วลืมลงทะเบียน
// เทสต์ข้างบนจับไม่ได้เพราะมันเทสต์ตัวแบ่ง ไม่ได้เทสต์ว่ามีใครลืมเรียก
//
// สามเมธอดนี้ทำงาน "ก่อน" _splitCameras จึงไม่ต้องเรียก — ที่เหลือต้องเรียกทุกจุด
{
  const BEFORE_SPLIT = new Set(['create', '_buildStage', '_drawAbyss', '_stageScrim']);
  const lines = scene.split('\n');
  let fn = '<top>';
  const missing = [];
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].match(/^  (?:static )?(?:get |set )?([A-Za-z_$][\w$]*)\s*\(/);
    if (head) fn = head[1];
    if (!/this\.add\.(sprite|image|text|graphics)\(/.test(lines[i])) continue;
    if (BEFORE_SPLIT.has(fn) || fn === '<top>') continue;
    if (!/this\._world\(/.test(lines[i])) missing.push(`${fn}() บรรทัด ${i + 1}`);
  }
  ok(missing.length === 0, missing.length
    ? `ลืมเรียก _world ที่: ${missing.join(' · ')}`
    : "ทุกจุดที่สร้างของในโลกหลังแยกกล้องเรียก _world ครบ");
}

// ══ HUD แถวบนต้องจางตอนมีคนยืนสูงจนถูกมันบัง ═══════════════════════════════════
//
// ชั้น 5 (เท้า y=160) สูงพอที่หัวจะเข้ามาในแถบ HUD ซึ่งตั้งใจให้เป็นที่เสี่ยง
// แต่พอแยกกล้อง UI กล้องนั้นวาดทับทุกอย่างเสมอ **HUD จึงบังตัวละครแทน**
// มองไม่เห็นตัวเองเป็นคนละเรื่องกับอ่านหลอดไม่ออก — อันแรกคือเกมพัง อันหลังคือกติกา
{
  const { Game, STAGE, PHYS } = await import(G + "/core.js");
  const obj = () => ({ alpha: 1, setAlpha(a) { this.alpha = a; return this; } });
  const mkFade = () => {
    const sc = { hudTop: [obj(), obj(), obj()] };
    sc._fadeHudFor = ScrambleScene.prototype._fadeHudFor;
    return sc;
  };
  const settle = (sc, g) => { for (let i = 0; i < 200; i++) sc._fadeHudFor(g); };

  const low = mkFade(), g1 = new Game();
  for (const f of g1.fighters) f.y = STAGE.groundY;
  settle(low, g1);
  ok(low.hudTop.every((o) => o.alpha > 0.99), `ยืนพื้นกันหมด HUD ชัดเต็ม (${low.hudTop[0].alpha.toFixed(3)})`);

  const high = mkFade(), g2 = new Game();
  g2.p2.y = 160;                       // ชั้น 5
  settle(high, g2);
  ok(high.hudTop.every((o) => o.alpha < 0.4), `มีคนยืนชั้นบนสุด HUD จางลง (${high.hudTop[0].alpha.toFixed(3)})`);
  ok(high.hudTop.every((o) => o.alpha > 0), "แต่ไม่หายไปเลย — ยังอ่านคร่าว ๆ ได้");

  // ลงมาแล้วต้องกลับมาชัด ไม่ใช่จางค้าง
  g2.p2.y = STAGE.groundY;
  settle(high, g2);
  ok(high.hudTop.every((o) => o.alpha > 0.99), "ลงมาแล้วกลับมาชัดเหมือนเดิม");

  // ชั้นที่ต่ำกว่านั้นต้องไม่ทำให้จาง ไม่งั้น HUD กะพริบทั้งเกม
  const mid = mkFade(), g3 = new Game();
  g3.p2.y = 352;                       // ชั้น 3
  settle(mid, g3);
  ok(mid.hudTop.every((o) => o.alpha > 0.99), "ยืนชั้นกลาง HUD ยังชัดเต็ม ไม่กะพริบ");

  ok(PHYS.standH > 0 && 160 - PHYS.standH < 140, "ชั้น 5 อยู่ในแถบ HUD จริงตามที่คิดเลขไว้");
}

// ── ป้ายน็อกกับตัวนับคอมโบต้องไม่จางไปด้วย ──
//
// อยู่กลางจอ/ท้ายจอ ไม่ได้อยู่ในแถบที่ถูกบัง จางไปด้วยมีแต่เสีย
{
  const list = scene.slice(scene.indexOf('this.hudTop = ['), scene.indexOf('this._splitCameras()'));
  for (const keep of ['tKo', 'tKoSub', 'tCombo', 'tComboSub', 'tMove', 'tHelp'])
    ok(!new RegExp('\\bthis\\.' + keep + '\\b').test(list), `${keep} ไม่อยู่ในกลุ่มที่จาง`);
  for (const dim of ['tP1', 'tP2', 'tTitle'])
    ok(new RegExp('\\bthis\\.' + dim + '\\b').test(list), `${dim} อยู่ในกลุ่มที่จาง`);
}
