// ทดสอบเพื่อน AI ในโหมด 2v2
// รัน: node tools/tests/ai.test.mjs   (จากโฟลเดอร์ game)
//
// AI อยู่ **ในซิม** ไม่ใช่ในฉาก จึงต้องคิดออกมาตรงกันเป๊ะทุกเครื่อง
// ถ้าเผลอใช้ Math.random หรืออ่านเวลาจริง เพื่อน AI ของแต่ละเครื่องจะเดินคนละทาง
// = desync ที่ไม่มีอะไรฟ้อง และหาสาเหตุยากมากเพราะผู้เล่นทั้งคู่ไม่ได้ทำอะไรผิด
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, STAGE, KI_MAX } = await import(G + "/core.js");
const core = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");

const four = () => { const g = new Game(); g.setRoster(4); return g; };
const allAI = () => { const g = four(); for (const f of g.fighters) f.ai = true; return g; };
const run = (g, n) => { for (let i = 0; i < n; i++) g.step(); return g; };

// ══ ห้ามสุ่ม ห้ามอ่านเวลาจริง ═══════════════════════════════════════════════════
{
  const body = core.slice(core.indexOf('  aiInput(f) {'), core.indexOf('  controlDummy(f) {'));
  ok(!/Math\.random/.test(body), "สมอง AI ไม่มี Math.random");
  ok(!/Date\.|performance\./.test(body), "และไม่อ่านเวลาจริง");
  const roll = core.slice(core.indexOf('function aiRoll'), core.indexOf('function blankInput'));
  ok(!/Math\.random/.test(roll), "ตัวสุ่มของ AI เป็นแฮชคงที่ ไม่ใช่ตัวสุ่มจริง");
}

// ── สองเครื่องคิดตรงกันเป๊ะ ──
//
// ข้อนี้คือเหตุผลที่ AI ต้องเขียนแบบนี้ ถ้าข้อนี้แดงคือ 2v2 ข้ามเน็ตเล่นไม่ได้
{
  const snap = (g) => g.fighters.map((f) =>
    [Math.round(f.x * 1000), Math.round(f.y * 1000), f.state, f.moveId ?? '-', f.hp, f.facing, f.aiNext,
      JSON.stringify(f.aiPlan)].join(',')).join('|');
  const a = allAI(), b = allAI();
  let split = 0;
  for (let i = 0; i < 900; i++) {
    a.step(); b.step();
    if (!split && snap(a) !== snap(b)) split = i + 1;
  }
  ok(!split, split ? `สองเครื่องหลุดกันที่เฟรม ${split}` : "สองเครื่องคิดตรงกันครบ 900 เฟรม");
}

// ── เริ่มคนละเฟรมกัน แผนก็ต้องเป็นของเฟรมนั้น ไม่ใช่ของ "ครั้งที่เท่าไหร่ที่คิด" ──
{
  const a = allAI(), b = allAI();
  run(a, 300);
  b.frame = 0; run(b, 300);
  ok(a.frame === b.frame, "เดินเท่ากันได้เลขเฟรมเท่ากัน");
}

// ══ AI สู้จริง ไม่ใช่ยืนเฉย ═════════════════════════════════════════════════════
{
  const g = allAI();
  g.startMatch();
  const x0 = g.fighters.map((f) => f.x);
  let attacks = 0, hits = 0;
  for (let i = 0; i < 900; i++) {
    g.step();
    for (const e of g.events) if (e.type === 'hit') hits++;
    for (const f of g.fighters) if (f.state === 'attack' && f.moveF === 1) attacks++;
  }
  const moved = g.fighters.map((f, i) => Math.abs(f.x - x0[i]));
  ok(moved.filter((d) => d > 60).length >= 3, `อย่างน้อยสามคนเดินจริง (${moved.map(Math.round).join('/')})`);
  ok(attacks > 10, `ออกท่าจริง ${attacks} ครั้งใน 15 วินาที`);
  ok(hits > 5, `ตีโดนจริง ${hits} ครั้ง`);
  ok(g.fighters.some((f) => f.hp < f.maxHp), "มีคนเสียเลือดจริง");
}

// ── แต่ไม่โหดเกินจนจบใน 15 วินาที ──
//
// AI ที่เก่งเกินไม่สนุกพอ ๆ กับ AI ที่ยืนเฉย — ข้อนี้กันไม่ให้จูนเลยไปอีกทาง
{
  const g = allAI();
  g.startMatch();
  run(g, 900);
  ok(g.match.winner === null, "สู้กัน 15 วินาทีแล้วยังไม่จบแมตช์");
  ok(g.fighters.every((f) => f.hp > 0), `ยังไม่มีใครล้ม (${g.fighters.map((f) => f.hp).join('/')})`);
}

// ── วิ่งเข้าหาศัตรู ไม่ใช่เดินมั่ว ──
{
  const g = four();
  for (const f of g.fighters) f.ai = true;
  // วางให้ทีม 0 อยู่ซ้ายสุด ทีม 1 ขวาสุด แล้วดูว่าระยะห่างลดลงไหม
  g.fighters[0].x = STAGE.wallL + 30; g.fighters[2].x = STAGE.wallL + 80;
  g.fighters[1].x = STAGE.wallR - 30; g.fighters[3].x = STAGE.wallR - 80;
  const gap0 = Math.abs(g.fighters[0].x - g.fighters[1].x);
  run(g, 120);
  const gap1 = Math.abs(g.fighters[0].x - g.fighters[1].x);
  ok(gap1 < gap0 - 100, `เข้าหากันจริง (ห่าง ${Math.round(gap0)} -> ${Math.round(gap1)})`);
}

// ── ศัตรูอยู่บนชั้นสูง AI ต้องกระโดดขึ้นไป ไม่ใช่ยืนต๊องข้างล่าง ──
{
  const g = four();
  const a = g.fighters[0], e = g.fighters[1];
  a.ai = true;
  a.x = 640; a.y = STAGE.groundY;
  e.x = 650; e.y = 352;                 // ชั้น 3
  let leftGround = false;
  for (let i = 0; i < 180 && !leftGround; i++) { g.step(null, null); if (!a.onGround) leftGround = true; }
  ok(leftGround, "กระโดดขึ้นไปหาศัตรูที่อยู่ชั้นบน");
}

// ══ AI ทำอะไรที่คนทำไม่ได้ ไม่ได้ ═══════════════════════════════════════════════
//
// เพราะอินพุตของมันเดินผ่านทางเดียวกับผู้เล่นจริงทุกขั้น
// ถ้าวันหนึ่งมีใครลัดไปยัดสถานะตรง ๆ ข้อพวกนี้จะแดง
{
  const body = core.slice(core.indexOf('  aiInput(f) {'), core.indexOf('  aiPlan(f, e, seed)'));
  ok(/return inp;/.test(body) && /blankInput\(\)/.test(body), "สมองคืนอินพุตหนึ่งเฟรม ไม่ได้แก้สถานะเอง");
  ok(/inputs\[i\] \?\? \(f\.ai \? this\.aiInput\(f\) : null\)/.test(core),
    "step() เอาอินพุตของ AI เสียบแทนที่เดียวกับของคน");
}

// ── คูลดาวน์ยังกั้น AI อยู่ ──
{
  const g = four();
  const a = g.fighters[0];
  a.ai = true;
  a.x = g.fighters[1].x - 70;
  a.cd = [999, 999, 999];
  let used = 0;
  for (let i = 0; i < 300; i++) {
    g.step(null, null);
    if (a.state === 'attack' && a.moveF === 1 && a.skills.includes(a.moveId)) used++;
  }
  ok(used === 0, `คูลดาวน์เต็มแล้ว AI ออกสกิลไม่ได้เลย (ออกไป ${used} ครั้ง)`);
}

// ── ช่องที่ต้องใช้ ki ต้องรอ ki เต็มจริง ──
{
  const g = four();
  const a = g.fighters[0];
  a.ai = true; a.ki = 0;
  a.x = g.fighters[1].x - 70;
  const kiMoves = a.skills.map((k) => k && a.moves[k]?.ki ? k : null).filter(Boolean);
  let fired = 0;
  for (let i = 0; i < 300; i++) {
    g.step(null, null);
    a.ki = 0;                          // กดไว้ที่ศูนย์ตลอด
    if (kiMoves.includes(a.moveId) && a.moveF === 1) fired++;
  }
  ok(kiMoves.length === 0 || fired === 0, `ki ว่างเปล่า AI ไม่ปล่อยท่าที่ต้องใช้ ki (ปล่อย ${fired} ครั้ง)`);
}

// ══ โหมดซ้อม 1v1 ต้องไม่เปลี่ยนเลย ═════════════════════════════════════════════
//
// หุ่นซ้อมยังต้องเป็นหุ่นซ้อม ไม่ใช่จู่ ๆ กลายเป็น AI ที่ตีกลับ
{
  const g = new Game();
  ok(g.fighters.every((f) => !f.ai), "1v1 ไม่มีใครติดธง AI");
  const hp = g.p1.hp;
  run(g, 600);
  ok(g.p1.hp === hp, `หุ่นซ้อมไม่ตีกลับ (เลือดผู้เล่น ${g.p1.hp}/${hp})`);
  ok(g.p2.state !== 'attack', "และไม่ออกท่าเอง");
}

// ── สลับกลับจาก 4 เป็น 2 ต้องไม่มีธง AI ค้าง ──
{
  const g = four();
  ok(g.fighters.filter((f) => f.ai).length === 2, "2v2 มีเพื่อน AI สองคน");
  ok(!g.fighters[0].ai && !g.fighters[1].ai, "สองช่องแรกเป็นคนจริง");
  g.setRoster(2);
  ok(g.fighters.every((f) => !f.ai), "กลับมา 1v1 แล้วธง AI ถูกล้าง");
}

// ── AI ไม่ตีเพื่อนร่วมทีม (เล็งจาก foe() ซึ่งข้ามทีมเดียวกัน) ──
{
  const g = four();
  for (const f of g.fighters) f.ai = true;
  // จับเพื่อนร่วมทีมมายืนชิดกัน ส่วนศัตรูอยู่ไกลสุด
  g.fighters[0].x = 600; g.fighters[2].x = 640;
  g.fighters[1].x = STAGE.wallR - 20; g.fighters[3].x = STAGE.wallR - 60;
  const hp = [g.fighters[0].hp, g.fighters[2].hp];
  run(g, 120);
  ok(g.fighters[0].hp === hp[0] && g.fighters[2].hp === hp[1],
    "ยืนชิดเพื่อนร่วมทีม 2 วินาทีแล้วไม่มีใครเจ็บ");
}

ok(KI_MAX > 0, `ค่า ki เต็มอ่านได้จากแกน (${KI_MAX})`);
