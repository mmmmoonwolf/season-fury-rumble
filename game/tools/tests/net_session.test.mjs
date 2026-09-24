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
    sim: { p1: { char: "nyx" }, p2: { char: "helios" }, dummyMode: "stand", dummyTech: "off", match: { on: false }, resetPositions() { this.reset = true; }, startMatch() { this.reset = true; this.match.on = true; } },
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

// ── แพ็คเก็ตที่มาถึงก่อนฉากจะพร้อม ต้องไม่หาย ──
//
// บั๊กจริงที่ผู้เล่นเจอ: ต่อห้องติดแล้ว เข้าเกมได้ แต่ขยับไม่ได้ทั้งสองเครื่อง
// สองเครื่องต่อห้องพร้อมกันก็จริง แต่ Phaser โหลดภาพเสร็จไม่พร้อมกัน
// เครื่องที่เสร็จก่อนยิงอินพุตเฟรม 0,1,2 ไปเลย อีกฝั่งยังไม่มี onData รับ แพ็คเก็ตหายเกลี้ยง
// แล้ว lockstep รอเฟรมที่ไม่มีวันมาถึงตลอดกาล — ไม่มี error ไม่มีอะไรฟ้อง มีแต่ภาพค้าง
{
  const { hostRoom, getSession, cancelSession } = await import(new URL("../../src/net/session.js", import.meta.url).href);

  // Peer ปลอมที่ขยับตามคำสั่งเรา จะได้จำลองจังหวะ "อีกฝั่งส่งมาก่อนฉากพร้อม" ได้เป๊ะ
  const ev = (o) => { o.h = {}; o.on = (k, f) => { o.h[k] = f; return o; }; o.fire = (k, ...a) => o.h[k]?.(...a); return o; };
  const conn = ev({ open: true, close() {}, send() {} });
  globalThis.window = { ...globalThis.window, Peer: class { constructor() { ev(this); this.destroy = () => {}; setTimeout(() => {}, 0); } } };

  let connected = false;
  hostRoom({ onConnected: () => { connected = true; } });
  const ses = getSession();
  ses.peer.fire("connection", conn);
  conn.fire("open");
  ok(connected, "ต่อห้องติดแล้ว (ฉากยังโหลดไม่เสร็จ ยังไม่มีใครมารับข้อมูล)");

  // อีกฝั่งเริ่มยิงตั้งแต่ตอนนี้ — ของเดิมตรงนี้คือจุดที่แพ็คเก็ตหายหมด
  conn.fire("data", { t: "start", p1: "nyx", p2: "helios", tune: {} });
  for (let f = 0; f < 3; f++) conn.fire("data", { t: "i", f, v: 0 });

  // ฉากโหลดเสร็จช้ากว่า ค่อยมาเสียบตัวรับ
  const got = [];
  ses.onData = (pk) => got.push(pk);
  ok(got.length === 4, `แพ็คเก็ตที่มาก่อนฉากพร้อม ถูกส่งต่อครบ (ได้ ${got.length} จาก 4)`);
  ok(got[0].t === "start", "แพ็คเก็ตตั้งต้นมาก่อนอินพุตเสมอ ไม่งั้นแขกเดินด้วยตัวละคร/ฟิสิกส์ผิดชุด");
  ok(got.map(p => p.f).join(",") === ",0,1,2", "อินพุตเรียงตามลำดับเฟรมเดิม");

  // ของที่มาทีหลังต้องวิ่งตรงเข้าตัวรับ ไม่ใช่ไปกองรออีก
  conn.fire("data", { t: "i", f: 3, v: 0 });
  ok(got.length === 5 && got[4].f === 3, "หลังฉากพร้อมแล้ว แพ็คเก็ตถัดไปส่งตรงทันที");

  cancelSession();
  ok(getSession().onData === null, "ยกเลิกห้องแล้วล้างตัวรับทิ้ง");
}

// ── หน้าเลือกตัวละคร ตอนเล่นข้ามเครื่อง ──
//
// จุดที่พังแล้วเงียบ: ถ้าสองเครื่องเริ่มนับเฟรมไม่พร้อมกัน หรือแพ็คเก็ตอินพุตที่มาถึง
// ตอนยังเลือกตัวอยู่ถูกทิ้ง เกมจะค้างโดยไม่มีอะไรฟ้อง เหมือนบั๊กที่ผู้เล่นเจอมาแล้วรอบหนึ่ง
{
  const { Lockstep } = await import(G + "/netplay.js");
  globalThis.document = { body: { classList: { add() {}, remove() {}, toggle() {} } },
    getElementById: () => null, querySelector: () => null };

  const mk = (isHost) => {
    const sc = {
      isHost, versus: "net", phase: null, selSide: null, myReady: false, foeReady: false, foePick: null,
      sim: { frame: 999, p1: { char: "nyx" }, p2: { char: "helios" }, match: { on: false }, resetPositions() { this.reset = (this.reset ?? 0) + 1; }, startMatch() { this.reset = (this.reset ?? 0) + 1; this.match.on = true; } },
      out: [],
      _drawSelect() {}, _syncSkillSlots() {}, _syncMatchHud() {}, syncTools() {},
    };
    sc.net = new Lockstep((pk) => sc.out.push(pk));
    sc.netSend = (pk) => sc.out.push(pk);
    for (const m of ["openSelect", "_pickChar", "_selectGo", "_maybeStartNetMatch", "beginMatch", "netReceive"])
      sc[m] = ScrambleScene.prototype[m];
    sc.openSelect();
    return sc;
  };
  const host = mk(true), guest = mk(false);
  // ท่อสองทาง: หยิบของที่ฝั่งหนึ่งส่ง ไปหย่อนใส่อีกฝั่ง
  const flush = (from, to) => { const q = from.out.splice(0); for (const pk of q) to.netReceive(pk); return q; };

  ok(host.phase === "select" && guest.phase === "select", "ต่อห้องแล้วทั้งคู่เข้าหน้าเลือกตัวก่อน ยังไม่เริ่มเดิน");
  ok(host.selSide === 0 && guest.selSide === 1, "โฮสต์เลือกให้ฝั่งซ้าย แขกเลือกให้ฝั่งขวา");

  // แขกเปลี่ยนตัว โฮสต์ต้องเห็น
  guest._pickChar("nyx");
  flush(guest, host);
  ok(host.sim.p2.char === "nyx" && host.foePick === "nyx", "เปลี่ยนตัวแล้วอีกฝั่งเห็นทันที");

  // โฮสต์กดพร้อมฝ่ายเดียว ต้องยังไม่เริ่ม และต้องไม่มี go หลุดออกไป
  host._selectGo();
  const sent = flush(host, guest);
  ok(host.phase === "select", "พร้อมฝ่ายเดียวยังไม่เริ่ม");
  ok(!sent.some(p => p.t === "go"), "ยังไม่ส่งสัญญาณเริ่มออกไป");
  ok(guest.phase === "select" && guest.foeReady === true, "แขกรู้ว่าอีกฝั่งพร้อมแล้ว แต่ยังไม่เริ่มเอง");

  // แขกกดพร้อม -> โฮสต์ส่ง go แล้วเริ่มทันที
  guest._selectGo();
  flush(guest, host);
  ok(host.phase === "fight", "พร้อมครบสองฝั่ง โฮสต์เริ่มแมตช์");
  ok(host.sim.frame === 0, "โฮสต์รีเซ็ตนาฬิกาเป็นเฟรม 0");
  const go = flush(host, guest).find(p => p.t === "go");
  ok(!!go && go.tune, "สัญญาณเริ่มพ่วงตัวละครและค่าปรับจูนมาด้วย");
  ok(guest.phase === "fight" && guest.sim.frame === 0, "แขกเริ่มพร้อมกันที่เฟรม 0");
  ok(guest.sim.p1.char === go.p1 && guest.sim.p2.char === go.p2, "สองเครื่องใช้ตารางท่าชุดเดียวกัน");

  // แขกต้องไม่เริ่มเองเด็ดขาด ต่อให้กดพร้อมค้างไว้ก่อน
  const g2 = mk(false);
  g2._selectGo(); g2.foeReady = true; g2._maybeStartNetMatch();
  ok(g2.phase === "select", "แขกไม่เริ่มเองแม้พร้อมครบ — ต้องรอสัญญาณจากโฮสต์เท่านั้น");

  // อินพุตที่มาถึงตอนยังเลือกตัวอยู่ ต้องเก็บไว้ ไม่ใช่ทิ้ง (ไม่งั้นค้างรอเฟรมต้น ๆ ตลอดกาล)
  const g3 = mk(false);
  for (let f = 0; f < 3; f++) g3.netReceive({ t: "i", f, v: 0 });
  ok(g3.net.remote.size === 3, `อินพุตที่มาก่อนเริ่มแมตช์ถูกเก็บไว้ครบ (${g3.net.remote.size}/3)`);
  g3.netReceive({ t: "go", p1: "nyx", p2: "nyx", tune: {} });
  ok(g3.phase === "fight" && g3.net.ready(), "พอเริ่มแมตช์ก็เดินได้ทันที ไม่ต้องรออะไรอีก");
}
