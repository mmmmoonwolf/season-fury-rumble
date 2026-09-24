// ทดสอบสิ่งที่ต้องเป็นจริง "ตอนต่อห้องกับเพื่อน" — ไม่ใช่ตัวท่อ แต่คือสองเครื่องต้องเดินสูตรเดียวกัน
// รัน: node tools/tests/net_session.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: สองเรื่องนี้ไม่มีทางเห็นตอนเทสคนเดียวเครื่องเดียว มันโผล่ตอนเจอเพื่อนจริงเท่านั้น
// และอาการที่เห็นคือ "ภาพสองเครื่องไม่ตรงกัน" ซึ่งไล่ที่มายากมาก
import "./phaser_stub.mjs";
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { PHYS } = await import(G + "/core.js");
const { ScrambleScene, tuneSnapshot, applyTune } = await import(G + "/ScrambleScene.js");

// ── ค่าปรับจูนของโฮสต์ต้องทับของแขก ──
//
// แผง Tune เซฟค่าลง localStorage ใครเคยลากสไลเดอร์เล่นไว้ เครื่องนั้นจะแรงโน้มถ่วง/ความเร็ววิ่ง
// ต่างจากเพื่อนไปตลอด แล้ว lockstep พังทันทีตั้งแต่เฟรมแรก (อินพุตเดียวกัน แต่ผลลัพธ์คนละอย่าง)
{
  const host = tuneSnapshot();
  ok(Object.keys(host).length > 0, "อ่านค่าปรับจูนออกมาเป็นก้อนเดียวได้");

  // แกล้งเป็นเครื่องแขกที่เคยลากสไลเดอร์ไว้
  const tampered = {};
  for (const k of Object.keys(host)) { PHYS[k] = host[k] + (host[k] > 0 ? 1.5 : -1.5); tampered[k] = PHYS[k]; }
  ok(Object.keys(host).every(k => PHYS[k] !== host[k]), "ก่อนต่อห้อง ค่าฝั่งแขกต่างจากโฮสต์ทุกตัว");

  applyTune(host);
  ok(Object.keys(host).every(k => PHYS[k] === host[k]), "ต่อห้องแล้วค่าทุกตัวถูกดึงกลับมาเท่าโฮสต์");

  // แพ็คเก็ตเสีย/ไม่มี tune มาด้วย ต้องไม่ทำให้ค่าพังเป็น NaN
  applyTune(undefined); applyTune({ gravity: "หนัก" });
  ok(Object.keys(host).every(k => PHYS[k] === host[k]), "แพ็คเก็ตไม่มีค่า/ค่าเพี้ยน ไม่ทำให้ฟิสิกส์พัง");
}

// ── เครื่องมือซ้อมต้องกดไม่ได้ตอนต่อเน็ต ──
//
// reset / pause / step / slow-mo / สลับตัวละคร / 2P ล้วนแก้ sim ของเครื่องเดียว อีกฝั่งไม่รู้ด้วย
// กดทีเดียวก็หลุดกันถาวร ไม่มีทางกลับมาตรงกันเอง
{
  const state = () => [scene.sim.p1.char, scene.sim.p2.char, scene.versus, scene.paused, scene.timeScale,
    scene.sim.dummyMode, scene.sim.dummyTech, scene.showBoxes].join("|");
  const scene = {
    versus: "net", paused: false, timeScale: 1, showBoxes: true, comboFade: 0,
    sim: { p1: { char: "nyx" }, p2: { char: "helios" }, dummyMode: "stand", dummyTech: "off", resetPositions() { this.reset = true; } },
    _syncSkillSlots() {}, _syncMatchHud() {}, syncTools() {},
    tool: ScrambleScene.prototype.tool,
  };
  const before = state();
  for (const code of ["KeyC", "KeyV", "KeyM", "KeyR", "KeyP", "KeyN", "KeyO", "Digit0", "Digit4"]) scene.tool(code);
  ok(state() === before, "ต่อเน็ตอยู่ กดเครื่องมือซ้อมทุกปุ่มแล้ว sim ไม่ขยับเลย");
  ok(!scene.sim.reset, "โดยเฉพาะ reset ที่จะดีดตำแหน่งข้างเดียว");

  scene.tool("KeyH");
  ok(scene.showBoxes === false, "ปุ่มที่เปลี่ยนแค่สิ่งที่เห็นบนจอ (hitboxes) ยังกดได้ตามเดิม");

  // พอออกจากโหมดเน็ตแล้วต้องกลับมากดได้ ไม่งั้นโหมดซ้อมพังตามไปด้วย
  scene.versus = "solo";
  scene.tool("KeyP");
  ok(scene.paused === true, "ออกจากโหมดเน็ตแล้วเครื่องมือซ้อมกลับมาใช้ได้");
}
