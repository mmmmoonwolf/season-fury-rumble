// ทดสอบโครงสร้าง "ลิสต์ผู้เล่น + ทีม" ที่จะรองรับ 2v2
// รัน: node tools/tests/teams.test.mjs   (จากโฟลเดอร์ game)
//
// ก้อนนี้ยังไม่เปลี่ยนพฤติกรรมอะไรเลย เป็นการเปลี่ยนโครงให้รองรับ 4 คนได้
// เทสต์เดิมทั้งหมดจึงต้องยังผ่านครบ และเทสต์ในไฟล์นี้ล็อกว่าโครงใหม่ถูกต้อง
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, Fighter, STAGE } = await import(G + "/core.js");

// ── p1/p2 ยังใช้ได้เหมือนเดิม แต่ข้างในเป็นลิสต์แล้ว ──
//
// สำคัญเพราะโค้ดเดิมเรียก p1/p2 อยู่กว่าร้อยจุด การรื้อทีเดียวทั้งหมดจะตรวจไม่ได้เลย
// ว่าพังตรงไหน วิธีนี้ทำให้เทสต์ 1060 ข้อเดิมยังเป็นตาข่ายรองรับอยู่
{
  const g = new Game();
  ok(Array.isArray(g.fighters), "เก็บผู้เล่นเป็นลิสต์");
  ok(g.fighters.length === 2, `เริ่มมาสองคนเหมือนเดิม (${g.fighters.length})`);
  ok(g.p1 === g.fighters[0] && g.p2 === g.fighters[1], "p1/p2 ชี้เข้าลิสต์ ไม่ได้เก็บแยก");
}

// ── ทีมตั้งมาแล้ว คนละทีมกัน ──
{
  const g = new Game();
  ok(g.p1.team === 0 && g.p2.team === 1, `1v1 คือทีมละคน (${g.p1.team} vs ${g.p2.team})`);
  ok(!g.sameTeam(g.p1, g.p2), "คนละทีม");
  ok(g.sameTeam(g.p1, g.p1), "ตัวเองอยู่ทีมเดียวกับตัวเองเสมอ");
}

/** จัดวง 2v2 สำหรับเทสต์ — ทีม 0 คือ a,c ทีม 1 คือ b,d */
function make2v2(xs = [200, 400, 600, 800]) {
  const g = new Game();
  g.fighters = [
    new Fighter('p1', 'A', xs[0], 1, 'nyx', 0),
    new Fighter('p2', 'B', xs[1], -1, 'helios', 1),
    new Fighter('p3', 'C', xs[2], 1, 'atlas', 0),
    new Fighter('p4', 'D', xs[3], -1, 'orpheus', 1),
  ];
  for (const f of g.fighters) { f.x = f.spawnX; f.y = STAGE.groundY; }
  return g;
}

// ── foes(): คืนเฉพาะคนที่คนละทีม ──
{
  const g = make2v2();
  const [a, b, c, d] = g.fighters;
  ok(g.foes(a).length === 2, `ทีม 0 มีศัตรูสองคน (${g.foes(a).length})`);
  ok(g.foes(a).every((o) => o.team === 1), "และทุกคนอยู่ทีม 1 จริง");
  ok(!g.foes(a).includes(c), "เพื่อนร่วมทีมไม่ถูกนับเป็นศัตรู");
  ok(!g.foes(a).includes(a), "ตัวเองก็ไม่ถูกนับ");
  ok(g.sameTeam(a, c) && g.sameTeam(b, d), "จับคู่ทีมถูก");
}

// ── foe(): ศัตรูที่ "ใกล้ที่สุด" ไม่ใช่คนแรกที่เจอ ──
//
// นิยามนี้สำคัญกับ netplay: ต้องคิดจากระยะล้วน ไม่มีสุ่ม สองเครื่องจะได้เลือกเป้าเดียวกัน
// และสำคัญกับการเล่นด้วย — ท่าวาร์ปของ Nyx ต้องไปหาคนที่อยู่ใกล้ ไม่ใช่คนที่บังเอิญอยู่ต้นลิสต์
{
  const g = make2v2([200, 900, 600, 250]);   // A ที่ 200 · ศัตรูคือ B(900) กับ D(250)
  const [a, b, , d] = g.fighters;
  ok(g.foe(a) === d, `เลือก D ที่อยู่ใกล้กว่า (ห่าง 50) ไม่ใช่ B (ห่าง 700)`);

  g.fighters[3].x = 1100;                     // ย้าย D ไปไกล คราวนี้ B ใกล้กว่า
  ok(g.foe(a) === b, "ย้ายแล้วเป้าเปลี่ยนตามระยะจริง");
}

// ── ระยะเท่ากันเป๊ะ ต้องเลือกตัวเดิมเสมอ ──
//
// เคสนี้เกิดจริงได้ เช่นตอนเริ่มยกที่จุดเกิดสมมาตร ถ้าสองเครื่องตัดสินไม่เหมือนกัน
// ท่าวาร์ปจะพาคนละทางแล้วภาพหลุดกันทันที โดยไม่มีอะไรฟ้อง
{
  for (let i = 0; i < 20; i++) {
    const g = make2v2([500, 300, 900, 700]);  // A ที่ 500 ห่าง B(300) และ D(700) เท่ากัน = 200
    ok(g.foe(g.fighters[0]) === g.fighters[1] || i > 0, "ระยะเท่ากันเลือกคนที่มาก่อนในลิสต์");
    if (g.foe(g.fighters[0]) !== g.fighters[1]) { ok(false, "ตัดสินไม่คงที่"); break; }
  }
  ok(true, "เรียก 20 รอบได้เป้าเดิมทุกครั้ง — ตัดสินเสมอแบบคงที่");
}

// ── 1v1 ต้องได้ผลเหมือนเดิมเป๊ะ ──
// ถ้าข้อนี้พัง แปลว่าการเปลี่ยน foe() ไปกระทบเกมที่เล่นอยู่ทุกวัน
{
  const g = new Game();
  ok(g.foe(g.p1) === g.p2 && g.foe(g.p2) === g.p1, "สองคนยังหากันเจอเหมือนเดิม");
  g.p2.x = g.p1.x + 900;
  ok(g.foe(g.p1) === g.p2, "ต่อให้อยู่ไกลแค่ไหนก็ยังเป็นเป้า เพราะไม่มีใครอื่นแล้ว");
}

// ── fighterById ค้นจากลิสต์จริง ──
{
  const g = make2v2();
  ok(g.fighterById('p3') === g.fighters[2], "หาคนที่สามเจอ");
  ok(g.fighterById('p9') === null, "ไม่มีก็คืน null ไม่ใช่ undefined หรือคนผิด");
}

// ── ของบนเวทีวนครบทุกคน ไม่ใช่แค่สองคนแรก ──
//
// blast() เคยเขียนเป็น [this.p1, this.p2] ตายตัว ถ้าลืมแก้ คนที่สามกับสี่จะยืนกลางระเบิด
// แล้วไม่เป็นอะไรเลย ซึ่งเป็นบั๊กที่มองไม่เห็นจนกว่าจะมีคนเล่นสี่คนจริง
{
  const g = make2v2([500, 520, 540, 560]);    // ยืนกองกันหมด
  for (const f of g.fighters) f.hp = f.maxHp;
  g.blast(530, 200, 10, 20, [5, -5], 'p1');
  const hurt = g.fighters.filter((f) => f.hp < f.maxHp);
  ok(hurt.length === 2, `ระเบิดหักเลือดเฉพาะศัตรูสองคน (โดน ${hurt.length})`);
  ok(hurt.every((f) => f.team === 1), "และเป็นทีมตรงข้ามทั้งคู่");
  // ทั้งทีมของเจ้าของไม่เสียเลือด แต่ยังโดนแรงกระแทก — เขายังเขี่ยเพื่อนตกเวทีได้ แค่ไม่ได้ฆ่าเขา
  ok(g.fighters[0].hp === g.fighters[0].maxHp, "เจ้าของไม่เสียเลือด");
  ok(g.fighters[2].hp === g.fighters[2].maxHp, "เพื่อนร่วมทีมก็ไม่เสียเลือด");
  ok(g.fighters[2].state === 'hitstun', "แต่เพื่อนโดนแรงกระแทกจริง ไม่ได้ยืนเฉย");
}

// ══ C2 · ยกจบเมื่อ "ทั้งทีม" ล้ม ไม่ใช่คนเดียวล้ม ══════════════════════════════
//
// นี่คือสิ่งที่ทำให้ "เหลือคนเดียวสู้สองคน" เป็นสถานการณ์จริงที่พลิกได้
// ซึ่งมักเป็นช่วงที่สนุกที่สุดของเกมทีม ถ้าล้มคนเดียวแล้วจบยก ช่วงนั้นจะไม่มีวันเกิด
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
{
  const g = make2v2();
  g.startMatch();
  const barsBefore = g.match.bars.slice();

  g.fighters[1].hp = 0;                       // ทีม 1 ล้มไปคนเดียว
  g.step(); g.step();
  ok(g.match.freeze === 0, "ล้มคนเดียวยังไม่จบยก");
  ok(g.match.bars[1] === barsBefore[1], `ทีม 1 ยังไม่เสียหลอด (${g.match.bars[1]})`);

  g.fighters[3].hp = 0;                       // ล้มครบทีม
  g.step();
  ok(g.match.freeze > 0, "ล้มครบทีมแล้วจบยก");
  ok(g.match.loser.includes(1), `ทีม 1 เป็นฝ่ายเสียหลอด (${JSON.stringify(g.match.loser)})`);
  for (let i = 0; i < 200; i++) g.step();
  ok(g.match.bars[1] === barsBefore[1] - 1, `เสียหนึ่งหลอดพอดี (${g.match.bars[1]})`);
  ok(g.match.bars[0] === barsBefore[0], "ทีมที่ชนะไม่เสียหลอด");
}

// ── 1v1 ต้องเหมือนเดิมเป๊ะ: ล้มคนเดียว = จบยกทันที เพราะทีมละคน ──
{
  const g = new Game();
  g.startMatch();
  g.p2.hp = 0;
  g.step();
  ok(g.match.freeze > 0 && g.match.loser.includes(1), "1v1 ล้มคนเดียวก็คือล้มทั้งทีม จบยกทันทีเหมือนเดิม");
}

// ══ C4 · ท่าที่เล็งใส่คน ทะลุเพื่อนร่วมทีม ══════════════════════════════════════
{
  const g = make2v2([500, 1100, 560, 1160]);  // A กับ C (ทีม 0) ยืนประชิดกัน
  const [a, , c] = g.fighters;
  const hp = c.hp;
  for (let i = 0; i < 40; i++) g.step(inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  ok(c.hp === hp, `ต่อยเพื่อนร่วมทีมแล้วเขาไม่เจ็บ (${c.hp}/${c.maxHp})`);
  ok(c.state !== 'hitstun', "และไม่โดนขัดจังหวะด้วย — คอมโบเพื่อนไม่ขาด");
  ok(a.hitConfirmed === false, "นับเป็นตีพลาด ไม่ใช่ตีโดน");
}

// ── แต่ศัตรูที่ยืนตรงนั้นยังโดนตามปกติ ──
{
  const g = make2v2([500, 560, 1100, 1160]);  // A (ทีม 0) ประชิด B (ทีม 1)
  const b = g.fighters[1];
  const hp = b.hp;
  for (let i = 0; i < 40; i++) g.step(inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  ok(b.hp < hp, `ศัตรูยังโดนเหมือนเดิม (${hp} -> ${b.hp})`);
}

// ══ C4 · กองไฟไม่ไหม้พวกเดียวกัน ══════════════════════════════════════════════
{
  const g = make2v2([500, 520, 540, 560]);    // ยืนกองกันหมดในกองไฟเดียว
  for (const f of g.fighters) f.hp = f.maxHp;
  g.fires.push({ x: 530, owner: 'p1', life: 300, t: 0, burns: false });
  for (let i = 0; i < 60; i++) g.step();
  const burned = g.fighters.filter((f) => f.hp < f.maxHp);
  ok(burned.length === 2, `ไฟตอดเฉพาะศัตรูสองคน (ตอด ${burned.length})`);
  ok(burned.every((f) => f.team === 1), "และเป็นทีมตรงข้ามทั้งคู่");
}

// ══ กระสุนเล็งศัตรู ไม่ใช่ "อีกคนนึง" ══════════════════════════════════════════
//
// เดิมเขียนว่า `sh.owner === 'p1' ? this.p2 : this.p1` ซึ่งพอมีสี่คนจะเล็งผิดตัวทั้งหมด
// เคสที่จับได้ยากที่สุดคือกระสุนของคนที่สาม ซึ่งเดิมจะไปเล็ง p1 เสมอ แม้ p1 จะเป็นพวกเดียวกัน
{
  const g = make2v2([200, 400, 600, 800]);
  const c = g.fighters[2];                    // คนที่สาม อยู่ทีม 0
  const a = g.fighters[0];                    // เพื่อนร่วมทีมของเขา
  const hpA = a.hp;
  g.shots.push({ x: a.x, y: a.y - 70, vx: 0, vy: 0, owner: c.id, travelled: 0, range: 900,
    dmg: 5, kb: [3, 0], stun: 10, volley: { hit: new Set() } });
  for (let i = 0; i < 10; i++) g.step();
  ok(a.hp === hpA, `กระสุนของคนที่สามไม่โดนเพื่อนร่วมทีม (${a.hp}/${a.maxHp})`);
}

// ══ ตีกันทุกคู่จริง ไม่ใช่แค่สองคนแรก ══════════════════════════════════════════
//
// step() เคยตัดสินแค่ resolveHit(p, d) กับ resolveHit(d, p) ถ้าลืมแก้
// คนที่สามกับสี่จะตีใครไม่โดนเลยและไม่มีใครตีเขาโดน ซึ่งดูเหมือนเกมค้างมากกว่าบั๊ก
{
  const g = make2v2([200, 1100, 600, 660]);   // C (ทีม 0) ประชิด D (ทีม 1)
  const d = g.fighters[3];
  const hp = d.hp;
  for (let i = 0; i < 40; i++) g.step(null, null, inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  ok(d.hp < hp, `คนที่สามตีคนที่สี่โดนจริง (${hp} -> ${d.hp})`);
}

// ══ C5 · ระบบยกนับเป็น "ทีม" ไม่ใช่ "คน" ══════════════════════════════════════
//
// นี่คือหัวใจของ 2v2: ทีมจะเสียหลอดก็ต่อเมื่อล้มครบทุกคน
// ถ้าเผลอนับทีละคน เกมจะจบตั้งแต่คนแรกล้ม ซึ่งฆ่าช่วงที่สนุกที่สุด (เหลือคนเดียวสู้สอง) ทิ้งไปเลย
{
  const g = make2v2();
  g.startMatch();
  const bars = g.match.bars.slice();
  g.fighters[1].hp = 0;                       // ล้มคนเดียวของทีม 1
  g.updateMatch();
  ok(g.match.freeze === 0, "ล้มคนเดียว ยังไม่จบยก");
  ok(g.match.bars.join() === bars.join(), "และยังไม่เสียหลอด");

  g.fighters[3].hp = 0;                       // ล้มครบทั้งทีม
  g.updateMatch();
  ok(g.match.freeze > 0, "ล้มครบทีมถึงจบยก");
  ok(g.match.loser.join() === '1', `ทีมที่แพ้คือทีม 1 (${g.match.loser.join()})`);
}

// ── เดินจนจบ freeze แล้วหลอดของทีมที่แพ้ต้องลด ทีมที่ชนะต้องไม่ลด ──
{
  const g = make2v2();
  g.startMatch();
  const before = g.match.bars.slice();
  g.fighters[1].hp = 0; g.fighters[3].hp = 0;
  for (let i = 0; i < 200 && g.match.round === 1; i++) g.step();
  ok(g.match.bars[1] === before[1] - 1, `ทีมที่ล้มเสียหนึ่งหลอด (${before[1]} -> ${g.match.bars[1]})`);
  ok(g.match.bars[0] === before[0], "ทีมที่ยืนอยู่ไม่เสียหลอด");
  ok(g.match.round === 2, "ขึ้นยกใหม่");
  ok(g.fighters.every((f) => f.hp === f.maxHp), "ทุกคนเลือดเต็มตอนเริ่มยกใหม่ รวมคนที่ไม่ได้ล้ม");
}

// ── เสียหลอดจนหมด = ทีมตรงข้ามชนะทั้งแมตช์ ──
{
  const g = make2v2();
  g.startMatch();
  g.match.bars = [2, 1];
  g.fighters[1].hp = 0; g.fighters[3].hp = 0;
  for (let i = 0; i < 200 && g.match.winner === null; i++) g.step();
  ok(g.match.winner === 0, `ทีม 0 ชนะแมตช์ (winner=${g.match.winner})`);
}

// ── ล้มพร้อมกันทั้งสองทีมในหลอดสุดท้าย = เสมอ ──
{
  const g = make2v2();
  g.startMatch();
  g.match.bars = [1, 1];
  for (const f of g.fighters) f.hp = 0;
  for (let i = 0; i < 200 && g.match.winner === null; i++) g.step();
  ok(g.match.winner === -1, `ล้มพร้อมกันหมดในหลอดสุดท้าย = เสมอ (winner=${g.match.winner})`);
}

// ══ setRoster: สลับ 2 ↔ 4 คนได้ และไม่ทำตัวละครที่เลือกไว้หาย ═══════════════════
//
// ผู้เล่นเลือกตัวเสร็จแล้วค่อยกดเปลี่ยนโหมด เป็นลำดับที่เกิดขึ้นจริงทุกครั้ง
// ถ้า setRoster ล้างตัวละครทิ้ง คนเล่นจะต้องเลือกใหม่ทุกรอบโดยไม่รู้ว่าทำไม
{
  const g = new Game();
  g.p1.char = 'atlas'; g.p2.char = 'orpheus';
  const four = g.setRoster(4);
  ok(four.length === 4 && g.fighters.length === 4, `สั่ง 4 ได้สี่คน (${g.fighters.length})`);
  ok(g.fighters.map((f) => f.team).join() === '0,1,0,1', `ทีมสลับกันข้างละสอง (${g.fighters.map((f) => f.team).join()})`);
  ok(g.fighters[0].char === 'atlas' && g.fighters[1].char === 'orpheus', "ตัวละครที่เลือกไว้ยังอยู่");
  ok(g.match.bars.length === 2, `หลอดนับตามจำนวนทีม ไม่ใช่จำนวนคน (${g.match.bars.length})`);
  ok(g.fighters.map((f) => f.id).join() === 'p1,p2,p3,p4', "id เรียงต่อกันไม่ซ้ำ");

  const two = g.setRoster(2);
  ok(two.length === 2 && g.fighters.length === 2, "สลับกลับเป็นสองคนได้");
  ok(g.fighters[0].char === 'atlas' && g.fighters[1].char === 'orpheus', "และตัวละครยังอยู่เหมือนเดิม");
  ok(g.p1 === g.fighters[0] && g.p2 === g.fighters[1], "p1/p2 ชี้เข้าลิสต์ชุดใหม่ ไม่ใช่ค้างที่ชุดเก่า");
}

// ── สลับ roster แล้วเดินต่อได้ ไม่ค้างเพราะของเก่าอ้างถึงคนที่ไม่มีแล้ว ──
{
  const g = new Game();
  g.setRoster(4);
  g.startMatch();
  for (let i = 0; i < 90; i++) g.step(null, null, null, null);
  ok(g.fighters.every((f) => Number.isFinite(f.x) && Number.isFinite(f.y)), "เดิน 90 เฟรมแล้วทุกคนยังอยู่ในโลกจริง");
  ok(g.fighters.every((f) => f.y <= STAGE.groundY + 1), "ไม่มีใครตกทะลุพื้น");
}

// ══ AI หันเข้าหาศัตรูที่ใกล้ที่สุด ไม่ใช่ p1 ตายตัว ═══════════════════════════
//
// เพื่อน AI ในทีม 2v2 ใช้ทางเดินเดียวกับหุ่นซ้อม ถ้ายังล็อกไว้ที่ p1
// เพื่อน AI ของทีม 0 จะยืนหันหลังให้ศัตรูตลอดเกม
{
  const g = make2v2([200, 1000, 400, 300]);   // D (ทีม 1) อยู่ซ้ายของ C (ทีม 0)
  const c = g.fighters[2];
  for (let i = 0; i < 30; i++) g.step(null, null, null, null);
  ok(c.facing === -1, `C หันไปทางศัตรูที่ใกล้ที่สุด (facing=${c.facing})`);
  ok(g.fighters[0].facing === 1, "และ A ยังหันไปทางศัตรูฝั่งขวาของตัวเอง");
}

// ── โหมดซ้อม 1v1 ต้องได้พฤติกรรมเดิมเป๊ะ ──
{
  const g = new Game();
  g.p1.x = g.p2.x + 200;                      // ผู้เล่นย้ายไปยืนขวาของหุ่น
  for (let i = 0; i < 20; i++) g.step(null);
  ok(g.p2.facing === 1, "หุ่นยังหันตามผู้เล่นเหมือนเดิม");
}
