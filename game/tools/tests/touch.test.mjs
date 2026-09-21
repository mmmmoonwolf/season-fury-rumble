// ทดสอบปุ่มสัมผัสบนจอ (TouchControls) — สถานะกดค้าง, หลายนิ้วพร้อมกัน, การเปิด-ปิดตามอุปกรณ์
// รัน: node tools/tests/touch.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
//
// ทำไมต้องมี: บั๊กของปุ่มกดค้างคือ "ค้างติด" (ตัวละครวิ่งไปเรื่องไม่หยุด) ซึ่งเกิดจากนิ้วหลุด
// ออกนอกปุ่มแล้วปล่อย — เทสได้ยากมากด้วยมือ เพราะต้องจับจังหวะนิ้วให้ตรง
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;

// TouchControls อ่าน window.matchMedia/location ตอน import ไม่ได้ ต้องมีของปลอมไว้ก่อน
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
const { TouchControls } = await import(G + "/systems/TouchControls.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

function setup() {
  const scene = makeScene();
  const tc = new TouchControls(scene, 90);
  const touch = (...pts) => {
    scene.input.manager.pointers = pts.map(([x, y]) => ({ x, y, isDown: true }));
    tc.update();
  };
  const at = (key) => tc.buttons.find((b) => b.key === key);
  return { scene, tc, touch, at };
}

// ── เปิด-ปิดตามชนิดอุปกรณ์ชี้ตำแหน่ง ──
{
  globalThis.location = { search: "" };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  ok(TouchControls.shouldEnable() === false, "คอมที่ใช้เมาส์ (pointer: fine) ไม่ขึ้นปุ่มสัมผัสมาบังจอ");
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  ok(TouchControls.shouldEnable() === true, "มือถือ/แท็บเล็ต (pointer: coarse) ขึ้นปุ่มให้");

  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.location = { search: "?touch=1" };
  ok(TouchControls.shouldEnable() === true, "?touch=1 บังคับเปิดได้ (เอาไว้เทสบนคอม)");
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.location = { search: "?touch=0" };
  ok(TouchControls.shouldEnable() === false, "?touch=0 บังคับปิดได้");

  globalThis.window = {}; // เบราว์เซอร์เก่าที่ไม่มี matchMedia เลย
  globalThis.location = { search: "" };
  ok(TouchControls.shouldEnable() === false, "เบราว์เซอร์ที่ไม่มี matchMedia ไม่พัง (ถือว่าไม่ใช่มือถือ)");
  globalThis.window = { matchMedia: () => ({ matches: false }) };
}

// ── ขอ pointer เพิ่มสำหรับหลายนิ้ว และไม่ขอซ้ำจนชนเพดานตอน scene.restart() ──
{
  const scene = makeScene();
  new TouchControls(scene, 90);
  ok(scene.input._added === 2, `ขอ pointer เพิ่มให้ครบ 4 นิ้ว (มีมาแล้ว 2 ขอเพิ่ม 2 ได้ ${scene.input._added})`);
  new TouchControls(scene, 90); // จำลอง scene.restart()
  new TouchControls(scene, 90);
  ok(scene.input._added === 2, "รีสตาร์ทฉากซ้ำ ๆ ไม่ขอ pointer เพิ่มอีก (input manager อยู่ระดับเกม ไม่ถูกรีเซ็ต)");
}

// ── กดค้างแล้วปล่อย ──
{
  const { tc, touch, at } = setup();
  const r = at("right");
  ok(tc.held.right === false, "ยังไม่แตะ = ไม่มีปุ่มไหนถูกกด");
  touch([r.x, r.y]);
  ok(tc.held.right === true, "แตะกลางปุ่มขวา = เดินขวา");
  touch(); // ยกนิ้ว
  ok(tc.held.right === false, "ยกนิ้วแล้วหยุดเดินทันที");
}

// ── นิ้วเลื่อนออกนอกปุ่มแล้วค่อยปล่อย = ต้องไม่ค้างติด ──
// เคสนี้คือเหตุผลหลักที่ไม่ใช้ event pointerup: pointerup จะไปตกนอกปุ่ม ปุ่มเลยไม่รู้ว่าถูกปล่อย
{
  const { tc, touch, at } = setup();
  const r = at("right");
  touch([r.x, r.y]);
  ok(tc.held.right === true, "เริ่มกดปุ่มขวาไว้ก่อน");
  touch([r.x + r.r + 40, r.y]); // นิ้วยังแตะจออยู่ แต่เลื่อนออกนอกปุ่มแล้ว
  ok(tc.held.right === false, "เลื่อนนิ้วออกนอกปุ่มแล้วหยุดเดินทันที ไม่ค้างติด");
}

// ── เลื่อนนิ้วจากปุ่มหนึ่งไปอีกปุ่มได้เลย ไม่ต้องยกนิ้ว ──
{
  const { tc, touch, at } = setup();
  touch([at("left").x, at("left").y]);
  ok(tc.held.left && !tc.held.right, "กดซ้ายอยู่");
  touch([at("right").x, at("right").y]);
  ok(tc.held.right && !tc.held.left, "เลื่อนไปปุ่มขวาแล้วสลับทิศทันที ไม่ต้องยกนิ้ว");
}

// ── หลายนิ้วพร้อมกัน = เดินไปตีไป (หัวใจของเกมต่อสู้) ──
{
  const { tc, touch, at } = setup();
  touch([at("right").x, at("right").y], [at("attack").x, at("attack").y]);
  ok(tc.held.right && tc.held.attack, "กดเดินขวา + ตี พร้อมกันได้");
  touch([at("right").x, at("right").y], [at("attack").x, at("attack").y], [at("up").x, at("up").y]);
  ok(tc.held.right && tc.held.attack && tc.held.up, "สามนิ้วพร้อมกันได้ (เดิน + ตี + กระโดด)");
}

// ── นิ้วเดียวคร่อมสองปุ่มทิศทาง = ไม่เดิน ดีกว่าตัวสั่นไปมา ──
{
  const { tc, touch, at } = setup();
  const l = at("left"), r = at("right");
  // ปุ่มซ้าย/ขวาต้องไม่ซ้อนกันตั้งแต่แรก นิ้วเดียวจะได้ไม่โดนสองปุ่มพร้อมกันโดยไม่ตั้งใจ
  ok(Math.abs(r.x - l.x) > l.r + r.r, `ปุ่มซ้ายกับขวาไม่ซ้อนกัน (ห่าง ${Math.abs(r.x - l.x)} รวมรัศมี ${l.r + r.r})`);
  touch([(l.x + r.x) / 2, l.y]); // จุดกึ่งกลาง = ช่องว่างระหว่างปุ่ม
  ok(!tc.held.left && !tc.held.right, "แตะช่องว่างระหว่างปุ่มแล้วไม่เดินไปทางไหน");
  touch([l.x, l.y], [r.x, r.y]);
  ok(!tc.held.left && !tc.held.right, "สองนิ้วกดซ้ายกับขวาพร้อมกันก็ไม่เดิน");
}

// ── นิ้วที่ยกแล้ว (isDown=false) ต้องไม่นับ ──
{
  const { scene, tc, at } = setup();
  const r = at("right");
  scene.input.manager.pointers = [{ x: r.x, y: r.y, isDown: false }];
  tc.update();
  ok(tc.held.right === false, "pointer ที่ค้างอยู่ในลิสต์แต่ isDown=false ไม่นับเป็นการกด");
}

// ── ปุ่มครบทุกอย่างที่เกมต้องใช้ และไม่ทับแถวปุ่มเดิม ──
{
  const { tc } = setup();
  const keys = tc.buttons.map((b) => b.key).sort();
  ok(
    JSON.stringify(keys) === JSON.stringify(["attack", "block", "down", "left", "right", "up"]),
    `มีปุ่มครบ เดินซ้าย/ขวา/ขึ้น/ลง/ตี/กัน (ได้ ${keys})`
  );
  // แถวปุ่มเดิม (ยั่ว x16-76, สกิล+แปลงร่าง x540-826) อยู่ที่ y = 720-46 = 674
  const clash = tc.buttons.filter((b) => {
    const nearRow = Math.abs(b.y - 674) < b.r + 30;
    const overOld = (b.x - b.r < 76 + 8) || (b.x + b.r > 540 - 8 && b.x - b.r < 826 + 8);
    return nearRow && overOld;
  });
  ok(clash.length === 0, `ไม่ทับปุ่มยั่ว/สกิล/แปลงร่างที่มีอยู่แล้ว (ทับ ${clash.map((b) => b.key)})`);
  const out = tc.buttons.filter((b) => b.x - b.r < 0 || b.x + b.r > 1280 || b.y - b.r < 0 || b.y + b.r > 720);
  ok(out.length === 0, `ทุกปุ่มอยู่ในจอ 1280x720 ไม่หลุดขอบ (หลุด ${out.map((b) => b.key)})`);
}

// ── ปุ่มไม่เลื่อนหายไปกับฉากตอนกล้องแพน ──
{
  const { tc } = setup();
  ok(tc.buttons.every((b) => b.shape.scrollFactor === 0), "ทุกปุ่มตั้ง scrollFactor 0 (ติดจอ ไม่เลื่อนตามกล้อง)");
  ok(tc.buttons.every((b) => b.shape.depth === 90), "ทุกปุ่มอยู่ชั้น HUD (depth 90) ไม่โดนฉาก/ตัวละครบัง");
}

// ── เก็บกวาดตอนเลิกใช้ ──
{
  const { tc } = setup();
  const shapes = tc.buttons.map((b) => b.shape);
  tc.destroy();
  ok(shapes.every((s) => s.dead), "destroy() ลบ game object ของปุ่มครบทุกอัน");
}

// ── ต่อเข้า _readP1Input() จริง: นิ้วบนจอต้องกลายเป็น input ของตัวละคร ──
// เทสต์ที่ผ่านมาพิสูจน์แค่ว่า TouchControls รู้ว่านิ้วอยู่ไหน ยังไม่ได้พิสูจน์ว่าเกมเอาไปใช้
{
  const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");
  const { tc, touch, at } = setup();
  const key = () => ({ isDown: false });
  const ctx = {
    touch: tc,
    jumpKey: key(), attackKeyP1: key(), blockKeyP1: key(), summonKeyP1: key(),
    transformKeyP1: key(), tauntKeyP1: key(), moveLeftKey: key(), moveRightKey: key(),
    cursors: { up: key(), down: key(), left: key(), right: key() },
    skillKeys: { 1: key(), 2: key(), 3: key() },
    _skillClick: { 1: false, 2: false, 3: false },
    _transformClick: false, _tauntClickP1: false,
  };
  const read = () => MainGameScene.prototype._readP1Input.call(ctx);

  read(); // เฟรมแรก ตั้งค่า _prev* ให้ครบก่อน
  touch([at("right").x, at("right").y]);
  let i = read();
  ok(i.right === true && i.left === false, "แตะปุ่มขวา -> input.right เป็น true ถึงตัวละครจริง");

  touch([at("block").x, at("block").y]);
  i = read();
  ok(i.blockHeld === true && i.right === false, "แตะปุ่มกัน -> input.blockHeld เป็น true");

  // กระโดดเป็น edge (เพิ่งกด) ไม่ใช่กดค้าง — ต้องติดแค่เฟรมแรกเฟรมเดียว
  touch();
  read();
  touch([at("up").x, at("up").y]);
  i = read();
  ok(i.jumpPressed === true, "แตะปุ่มขึ้น -> jumpPressed ติดในเฟรมแรก");
  ok(i.upHeld === true, "ปุ่มเดียวกันให้ upHeld ด้วย = ใช้ปีนบันไดขึ้นได้");
  i = read(); // นิ้วยังค้างอยู่ที่เดิม
  ok(i.jumpPressed === false, "นิ้วค้างไว้เฟรมถัดไป jumpPressed ไม่ติดซ้ำ (ไม่กระโดดรัว)");
  ok(i.upHeld === true, "แต่ upHeld ยังค้างอยู่ตราบที่ยังแตะ (ปีนบันไดต่อเนื่องได้)");

  // ตีก็เป็น edge เหมือนกัน — กดค้างต้องไม่ตีรัว
  touch();
  read();
  touch([at("attack").x, at("attack").y]);
  ok(read().attackPressed === true, "แตะปุ่มตี -> attackPressed ติดในเฟรมแรก");
  ok(read().attackPressed === false, "กดค้างไว้ไม่ตีรัวทุกเฟรม (เหมือนกดคีย์บอร์ดค้าง)");
  touch();
  read();
  touch([at("attack").x, at("attack").y]);
  ok(read().attackPressed === true, "ยกนิ้วแล้วแตะใหม่ ตีได้อีกครั้ง");
}

// ── ไม่มีปุ่มสัมผัส (เล่นด้วยคีย์บอร์ด) ต้องไม่พัง ──
{
  const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");
  const key = () => ({ isDown: false });
  const ctx = {
    jumpKey: key(), attackKeyP1: key(), blockKeyP1: key(), summonKeyP1: key(),
    transformKeyP1: key(), tauntKeyP1: key(), moveLeftKey: key(), moveRightKey: key(),
    cursors: { up: key(), down: key(), left: key(), right: key() },
    skillKeys: { 1: key(), 2: key(), 3: key() },
    _skillClick: { 1: false, 2: false, 3: false }, _transformClick: false, _tauntClickP1: false,
  }; // ไม่มี this.touch เลย
  let threw = false, i = null;
  try { i = MainGameScene.prototype._readP1Input.call(ctx); } catch { threw = true; }
  ok(!threw, "เครื่องที่ไม่มีปุ่มสัมผัส _readP1Input ไม่ throw (this.touch เป็น undefined)");
  ok(i && i.left === false && i.blockHeld === false && i.jumpPressed === false, "และคืนค่าปกติครบทุกช่อง");
}

console.log("\nTouchControls: held-state only (edges reuse keyboard _prev* logic), multi-touch, no stuck buttons");
