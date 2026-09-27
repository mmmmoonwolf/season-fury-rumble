// ทดสอบว่าเปิดเกมมาได้ "หน้าคนเล่น" ไม่ใช่ "หน้านักพัฒนา"
// รัน: node tools/tests/player_view.test.mjs   (จากโฟลเดอร์ game)
//
// ก่อนหน้านี้เปิดเกมมาเห็นพร้อมกันหมด: กรอบชนสีเขียว/แดงรอบตัวละคร ข้อมูลเฟรม
// และปุ่มเครื่องมือเก้าปุ่ม = คนที่ได้ลิงก์ไปกดเล่นคิดว่าเกมยังไม่เสร็จ ทั้งที่มันเสร็จแล้ว
// ของพวกนั้นไม่ได้ผิด แค่ไม่ใช่ของที่คนเล่นต้องเห็น
import "./phaser_stub.mjs";
import fs from "fs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const scene = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

// ══ กรอบชนต้องปิดตอนเปิดเกม ════════════════════════════════════════════════════
//
// อันนี้คือข้อที่สำคัญที่สุดในไฟล์ — มันคือสิ่งแรกที่คนเห็นและตัดสินเกมจากมัน
{
  ok(/this\.showBoxes = false;/.test(scene), "กรอบชนเริ่มที่ปิด");
  ok(!/this\.showBoxes = true;/.test(scene), "ไม่มีที่ไหนตั้งเป็นเปิดตอนเริ่ม");
}

// ══ ปุ่มของคนเล่น vs ปุ่มของนักพัฒนา ═══════════════════════════════════════════
{
  const row = scene.slice(scene.indexOf('<div id="sc-tools">'), scene.indexOf('<div id="sc-select">'));
  const btns = [...row.matchAll(/data-tool="(\w+)"([^>]*)>([^<]*)</g)]
    .map(([, key, attrs, label]) => ({ key, dev: /data-dev/.test(attrs), label: label.trim() }));
  const player = btns.filter((b) => !b.dev).map((b) => b.key);
  const dev = btns.filter((b) => b.dev).map((b) => b.key);

  // คนเล่นต้องเปลี่ยนตัวละครได้ — ไม่ใช่ของนักพัฒนา
  ok(player.includes('KeyB'), "ปุ่มเลือกตัวละครเป็นของคนเล่น");
  ok(player.includes('KeyZ'), "ปุ่มซูมเป็นของคนเล่น (เป็นความชอบส่วนตัว)");
  ok(player.includes('KeyG'), "ปุ่มเฟืองเปิดโหมดนักพัฒนาต้องเห็นได้เสมอ ไม่งั้นเปิดไม่ได้");
  for (const k of ['KeyH', 'Digit0', 'Digit4', 'KeyO', 'KeyT', 'KeyF'])
    ok(dev.includes(k), `${k} เป็นของนักพัฒนา`);
  ok(player.length <= 4, `ปุ่มที่คนเล่นเห็นเหลือ ${player.length} ปุ่ม (เดิมเก้าปุ่ม)`);

  // ซ่อนด้วย CSS ไม่ใช่ลบออกจาก DOM — syncTools() อ่าน textContent ของปุ่มพวกนี้อยู่
  ok(/body:not\(\.sc-dev\) #sc-tools button\[data-dev\] \{ display:none/.test(scene),
    "ซ่อนปุ่มนักพัฒนาด้วย CSS (ลบออกจาก DOM แล้ว syncTools จะพัง)");
}

// ══ ข้อความที่มีความหมายกับนักพัฒนาเท่านั้น ════════════════════════════════════
{
  ok(/this\.tTitle\?\.setText\(this\.dev \? 'SCRAMBLE' : ''\)/.test(scene),
    "\"SCRAMBLE\" เป็นชื่อโหมดภายใน โชว์เฉพาะโหมดนักพัฒนา");
  ok(/const m = this\.dev \? s\.lastMoveInfo : null;/.test(scene), "ข้อมูลเฟรมโชว์เฉพาะโหมดนักพัฒนา");
  ok(/this\.tHelp2\?\.setText\(this\.dev && !isTouch/.test(scene), "รายการคีย์ลัดของเครื่องมือก็เหมือนกัน");

  // แต่บรรทัดบอกปุ่มพื้นฐานต้องอยู่ — คนเล่นบนคอมต้องรู้ว่ากดอะไร
  const dev = scene.slice(scene.indexOf('_syncDevText() {'), scene.indexOf('syncTools() {'));
  ok(!/\btHelp\b(?!2)/.test(dev), "บรรทัดบอกปุ่มพื้นฐาน (tHelp) ไม่ถูกซ่อน — ไม่งั้นคนเล่นไม่รู้ว่าเริ่มยังไง");
  ok(/Move A D/.test(scene), "ยืนยันว่าบรรทัดบอกปุ่มยังมีอยู่จริง");
}

// ══ พฤติกรรมตอนเปิด/ปิดโหมด ════════════════════════════════════════════════════
{
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const cls = new Set();
  globalThis.document = {
    body: { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), add: (c) => cls.add(c), remove: (c) => cls.delete(c) } },
    getElementById: () => ({ classList: { remove() {}, contains: () => false, toggle() {} } }),
    querySelector: () => null,
    createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }),
  };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.location = { search: "" };
  const G = new URL("../../src/modes/scramble", import.meta.url).href;
  const { ScrambleScene } = await import(G + "/ScrambleScene.js");

  const mk = () => {
    const sc = { showBoxes: false, showPace: false, timeScale: 1, dev: false,
      tTitle: { setText() {} }, tHelp2: { setText() {} }, tMove: { setText() {} }, syncTools() {} };
    for (const m of ['_setDev', '_devSaved', '_syncDevText']) sc[m] = ScrambleScene.prototype[m];
    return sc;
  };

  const a = mk();
  ok(a._devSaved() === false, "ยังไม่เคยเปิด = ปิดอยู่");
  a._setDev(true);
  ok(a.dev === true && cls.has('sc-dev'), "เปิดแล้วติดคลาสบน body");
  ok(store['sfr.dev'] === '1', "และจำไว้ข้ามรอบเล่น");
  ok(mk()._devSaved() === true, "รอบหน้าอ่านค่าที่จำไว้ได้");

  // ปิดแล้วต้องเก็บของนักพัฒนาไปทั้งชุด ไม่ใช่แค่ซ่อนปุ่ม
  // กดปิดแล้วยังเห็นกรอบสี่เหลี่ยมอยู่ = ดูเหมือนปุ่มเสีย
  a.showBoxes = true; a.showPace = true; a.timeScale = 0.25;
  a._setDev(false);
  ok(!a.showBoxes, "ปิดโหมดแล้วกรอบชนปิดตาม");
  ok(!a.showPace, "ตัววัดความเร็วปิดตาม");
  ok(a.timeScale === 1, "สโลว์โมกลับเป็นปกติ");
  ok(!cls.has('sc-dev'), "และคลาสบน body หลุดออก");

  // localStorage พังได้จริง (โหมดส่วนตัวของ Safari throw ตอนอ่าน)
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const b = mk();
  let threw = false;
  try { b._devSaved(); b._setDev(true); } catch (e) { threw = true; }
  globalThis.localStorage = real;
  ok(!threw, "อ่าน/เขียน localStorage ไม่ได้ก็ไม่ throw");
}

// ── ปุ่มเฟืองกดได้ตอนต่อเน็ตด้วย (เป็นการวาดล้วน) ──
{
  const G = new URL("../../src/modes/scramble", import.meta.url).href;
  const { ScrambleScene } = await import(G + "/ScrambleScene.js");
  ok(ScrambleScene.VIEW_ONLY.has('KeyG'), "ปุ่มเฟืองกดได้ตอนต่อเน็ต");
  ok(/'KeyG'/.test(scene.slice(scene.indexOf('const TOOL_KEYS'), scene.indexOf('const TOOL_KEYS') + 300)),
    "และลงทะเบียนเป็นคีย์เครื่องมือแล้ว");
}
