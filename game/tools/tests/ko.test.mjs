// ระบบแพ้ชนะ: เลือดหมดหนึ่งครั้ง = เสียหลอดหนึ่งหลอด ไม่ใช่จบเกม
//
// ทำไมถึงต้องมีหลายหลอด: เกมนี้ต่อสู้กันไวมาก คอมโบเดียวกินเลือดไปเกือบครึ่ง
// ยกเดียวจบภายในไม่กี่วินาที ผู้เล่นรายงานว่า "เกมมันจบไวมาก"
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, ROUND_BARS } = await import(G + "/core.js");
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

const NONE = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0, skill1: 0, skill2: 0, skill3: 0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });

/** เดินเกมจนเกิดเหตุการณ์ที่รอ หรือหมดเวลา — คืนอีเวนต์ที่เก็บได้ */
function run(g, frames, a = () => inp(), b = () => inp()) {
  const log = [];
  for (let f = 1; f <= frames; f++) {
    g.step(a(f), b ? b(f) : null);
    for (const e of g.events) if (["ko", "roundStart", "matchEnd"].includes(e.type)) log.push(e);
  }
  return log;
}

// ── ซ้อมกับหุ่นต้องไม่นับแพ้ชนะ ──
{
  const g = new Game();
  ok(!g.match.on, "เกมที่เพิ่งสร้างยังไม่เปิดระบบยก (โหมดซ้อม)");
  g.p2.hp = 0;
  const log = run(g, 200, () => inp(), null);
  ok(log.length === 0, "หุ่นเลือดหมดในโหมดซ้อมไม่นับเป็นน็อก");
}

// ── เลือดหมด = เสียหนึ่งหลอด แล้วขึ้นยกใหม่เลือดเต็ม ──
{
  const g = new Game(); g.startMatch();
  ok(g.match.bars[0] === ROUND_BARS && g.match.bars[1] === ROUND_BARS,
    `เริ่มแมตช์ได้คนละ ${ROUND_BARS} หลอด`);
  g.p2.hp = 0;
  const log = run(g, 300);
  const ko = log.find((e) => e.type === "ko");
  const rs = log.find((e) => e.type === "roundStart");
  ok(ko && ko.loser.join() === "1", "เลือดฝั่งขวาหมด = น็อกฝั่งขวา");
  ok(rs && rs.round === 2, "น็อกแล้วขึ้นยกที่ 2");
  ok(g.match.bars[1] === ROUND_BARS - 1, `ฝั่งที่แพ้เสียหลอด (เหลือ ${g.match.bars[1]})`);
  ok(g.match.bars[0] === ROUND_BARS, "ฝั่งที่ชนะไม่เสียหลอด");
  ok(g.p1.hp === g.p1.maxHp && g.p2.hp === g.p2.maxHp, "ยกใหม่เลือดเต็มทั้งคู่");
  ok(g.match.winner === null, "เสียหลอดเดียวยังไม่จบแมตช์");
}

// ── มีช่วงแช่ก่อนขึ้นยกใหม่ ไม่ใช่ตัดภาพทันที ──
{
  const g = new Game(); g.startMatch();
  g.p2.hp = 0; g.step(inp(), inp());
  ok(g.match.freeze > 0, `น็อกแล้วแช่ ${g.match.freeze} เฟรมให้เห็นท่าล้มก่อน`);
  const before = g.match.bars[1];
  g.step(inp(), inp());
  ok(g.match.bars[1] === before, "ระหว่างแช่ยังไม่หักหลอด (หักตอนแช่จบ)");
}

// ── เสียครบทุกหลอดถึงจะจบแมตช์ ──
{
  const g = new Game(); g.startMatch();
  for (let i = 0; i < ROUND_BARS; i++) {
    g.p2.hp = 0;
    run(g, 200);
  }
  ok(g.match.winner === 0, `เสียครบ ${ROUND_BARS} หลอดแล้วฝั่งซ้ายชนะ (winner ${g.match.winner})`);
  ok(g.match.bars[1] === 0, "ฝั่งที่แพ้หลอดหมดเกลี้ยง");
}

// ── ล้มพร้อมกันในยกสุดท้าย = เสมอ ──
{
  const g = new Game(); g.startMatch();
  g.match.bars = [1, 1];
  g.p1.hp = 0; g.p2.hp = 0;
  run(g, 200);
  ok(g.match.winner === -1, `ล้มพร้อมกันตอนเหลือหลอดสุดท้าย = เสมอ (winner ${g.match.winner})`);
}

// ── จบแมตช์แล้วกดตีเริ่มใหม่ได้ และต้องเริ่มจากยกแรกหลอดเต็ม ──
{
  const g = new Game(); g.startMatch();
  g.match.bars = [1, 1]; g.p2.hp = 0;
  run(g, 200);
  ok(g.match.winner === 0, "จบแมตช์ก่อน");
  g.step(inp({ p: { attack: 1 } }), inp());
  ok(g.match.winner === null && g.match.round === 1,
    "กดปุ่มตีแล้วเริ่มแมตช์ใหม่ตั้งแต่ยกแรก");
  ok(g.match.bars.join() === [ROUND_BARS, ROUND_BARS].join(), "หลอดกลับมาเต็มทั้งคู่");
}

// ── ปุ่มเริ่มใหม่ต้องมาจากอินพุต ไม่ใช่เวลาจริง (เพื่อให้ netplay ตรงกัน) ──
{
  const g = new Game(); g.startMatch();
  g.match.bars = [1, 1]; g.p2.hp = 0;
  run(g, 200);
  run(g, 600);   // ปล่อยเวลาผ่านไปเฉย ๆ โดยไม่กดอะไร
  ok(g.match.winner === 0, "ไม่กดอะไรเลย แมตช์ต้องค้างที่หน้าจบ ไม่เริ่มเองตามเวลา");
}
