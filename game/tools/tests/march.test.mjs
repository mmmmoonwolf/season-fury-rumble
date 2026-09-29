// ทดสอบสกิล 2 ใหม่ของ MARCH — Sky Drive (ยกคาง · ตีกลางอากาศ · ตบลงพื้น · เด้ง · ต่อบนพื้น)
// รัน: node tools/tests/march.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์เป็น march เพราะเป็นชื่อที่โชว์ ส่วน `id` ในซิมยังเป็น 'helios' ซึ่งห้ามเปลี่ยน
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, PHYS } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 90, foe = "atlas") => {
  const g = new Game(); g.p1.char = "helios"; g.p2.char = foe;
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};
const run = (g, n, a = () => inp(), b = () => inp()) => {
  const ev = [];
  for (let i = 0; i < n; i++) { g.step(a(i), b(i)); ev.push(...g.events); }
  return ev;
};
const SKY = () => inp({ skill2: 1, p: { skill2: 1 } });

// ── ชุดท่าใหม่ต้องเข้ามาแทนของเก่าจริง ────────────────────────────────────────
{
  const h = CHARACTERS.helios;
  ok(h.skills[1] === 'sky1', `สกิล 2 เป็น Sky Drive แล้ว (${h.skills[1]})`);
  ok(!h.moves.knee, "ท่าพุ่งเข่าเดิมถูกถอดออกแล้ว ไม่ได้เหลือค้างทั้งสองชุด");
  ok(['sky1','sky2','sky3','sky4','sky5'].every((k) => h.moves[k]), "ชุด Sky Drive ครบห้าท่า");
  // คุณสมบัติเดียวที่ยกมาจาก Knee Drive เดิม — ถ้าหลุด คอมโบต่อบนพื้นจะขาดทันที
  ok(h.moves.sky5.refresh?.includes('rush1'), "ท่าตบคืน Chain Rush ให้กดซ้ำได้");
}

// ── ตีโดนแล้วต่อครบทั้งห้าที ────────────────────────────────────────────────
{
  const g = mk();
  const hp0 = g.p2.hp;
  const ev = run(g, 140, (i) => (i < 2 ? SKY() : inp()));
  const hits = ev.filter((e) => e.type === 'hit' && !e.self).length;
  ok(hits >= 5, `ตีติดครบทั้งห้าที (${hits})`);
  ok(hp0 - g.p2.hp >= 15, `ดาเมจรวมทั้งชุดสมเหตุผล (${hp0} -> ${g.p2.hp})`);
}

// ── ฟันลมแล้วต้องจบแค่ท่ายกคาง ไม่ใช่เล่นชุดลอยต่อกลางอากาศเปล่า ๆ ──
//
// ถ้าต่อด้วย autoChain แทน onHit ข้อนี้จะแดง — และบนจอมันจะดูเหมือนตีติดทั้งที่ไม่โดน
// ซึ่งหลอกทั้งสองฝั่งพร้อมกัน (บทเรียนเดียวกับท่าจับที่ต้องแยก onHit ออกจาก autoChain)
{
  const g = mk(600);                       // ไกลเกินจะโดน
  const seen = new Set();
  for (let i = 0; i < 140; i++) { g.step(i < 2 ? SKY() : inp(), inp()); if (g.p1.moveId) seen.add(g.p1.moveId); }
  ok(seen.has('sky1'), "ท่ายกคางออกจริง");
  ok(!seen.has('sky2'), `ฟันลมแล้วไม่ต่อชุดลอย (เห็น ${[...seen].join(',') || 'ไม่มี'})`);
}

// ══ เด้งพื้น — ข้อนี้คือสิ่งเดียวที่ทำให้ "ตบลงพื้นแล้วต่อ" เป็นไปได้ ═══════════
{
  const g = mk();
  const ev = run(g, 160, (i) => (i < 2 ? SKY() : inp()));
  ok(ev.some((e) => e.type === 'bounce'), "ตบลงพื้นแล้วเป้าเด้งจริง");
  // ปกติคนที่ตกถึงพื้นตอนติด hitstun จะล้มแล้วได้อมตะ 30 เฟรม = คอมโบจบตรงนั้น
  const kd = ev.filter((e) => e.type === 'land').length;
  ok(kd > 0 && g.p2.state !== 'knockdown' || g.p2.invuln === 0,
    `เด้งแทนการล้ม ไม่ได้อมตะแถมมา (state=${g.p2.state} invuln=${g.p2.invuln})`);
}

// ── เด้งได้ครั้งเดียวต่อหนึ่งคอมโบ ──────────────────────────────────────────
//
// ไม่งั้นจะวนตบ-เด้ง-ตบ-เด้งไม่รู้จบ ซึ่งสเกลลดดาเมจตามคอมโบกันไว้ชั้นเดียวไม่พอ
{
  const g = mk();
  g.p2.bouncePend = 1; g.p2.setState('hitstun'); g.p2.stun = 200;
  g.p2.onGround = false; g.p2.y = 300; g.p2.vy = 10;
  const first = run(g, 60).filter((e) => e.type === 'bounce').length;
  ok(first === 1, `เด้งครั้งแรกติด (${first})`);
  // ยัดธงซ้ำทั้งที่ยังอยู่ในคอมโบเดิม — ต้องไม่เด้งอีก
  g.p2.bouncePend = 1; g.p2.setState('hitstun'); g.p2.stun = 200;
  g.p2.onGround = false; g.p2.y = 300; g.p2.vy = 10;
  const again = run(g, 60).filter((e) => e.type === 'bounce').length;
  ok(again === 0, `คอมโบเดียวกันเด้งซ้ำไม่ได้ (${again})`);
}

// ── คอมโบจบแล้วธงเด้งต้องถูกล้าง ไม่งั้นคอมโบหน้าเด้งไม่ได้ ──
{
  const g = mk();
  run(g, 200, (i) => (i < 2 ? SKY() : inp()));
  ok(g.p2.bounced === false && g.p2.bouncePend === 0,
    `คอมโบจบแล้วธงเด้งถูกล้าง (bounced=${g.p2.bounced} pend=${g.p2.bouncePend})`);
}

// ── ลงพื้นแล้วเขาต้องฟื้นก่อนคนที่เด้ง ไม่งั้น "ต่อบนพื้น" เป็นแค่คำพูด ──
{
  const g = mk();
  let gap = null;
  for (let i = 0; i < 200 && gap === null; i++) {
    g.step(i < 2 ? SKY() : inp(), inp());
    // เฟรมแรกที่เขาขยับได้แล้ว วัดว่าอีกฝ่ายยังขยับไม่ได้อยู่ไหม
    if (g.p1.onGround && !g.p1.moveId && g.p1.stun <= 0 && g.p1.state !== 'landing' && g.frame > 60)
      gap = { his: g.p1.state, theirs: g.p2.state, stun: g.p2.stun, inv: g.p2.invuln };
  }
  ok(gap !== null, "เขากลับมาขยับได้หลังจบชุด");
  ok(gap && (gap.stun > 0 || gap.theirs === 'hitstun' || gap.inv === 0),
    `ตอนเขาฟื้น อีกฝ่ายยังต่อได้อยู่ (เขา=${gap?.his} อีกฝ่าย=${gap?.theirs} stun=${gap?.stun} inv=${gap?.inv})`);
}

// ── ท่าอื่นที่ตบลงพื้นเหมือนกันต้องไม่เด้ง — เด้งเป็นของท่าที่ติดธงเท่านั้น ──
{
  const g = mk();
  const ev = run(g, 120, (i) => (i % 30 === 0 ? inp({ down: 1, attack: 1, p: { attack: 1 } }) : inp()));
  ok(!ev.some((e) => e.type === 'bounce'), "ท่ากวาดขาไม่ทำให้เด้ง");
}

// ── Sky Drive ต้องไม่กลายเป็น DEAR: ชุดลอยยืดออกไปไม่ได้ ──
//
// กดรัวทุกปุ่มตลอดชุด ถ้ามีทางยืด (mashChain/holdChain หลงมา) จะเห็นเป็นจำนวนท่าที่โตเกินห้า
{
  const g = mk();
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    // กดรัวเฉพาะปุ่มที่ไม่ยกเลิกท่า (ปุ่มตียกเลิกชุดได้อยู่แล้วซึ่งเป็นคนละเรื่อง)
    g.step(i < 2 ? SKY() : inp({ jump: 1, skill2: 1, p: { jump: 1, skill2: 1 } }), inp());
    if (g.p1.moveId?.startsWith('sky')) seen.add(g.p1.moveId);
  }
  ok(seen.size === 5, `ชุดลอยมีห้าท่าตายตัว กดรัวยืดไม่ได้ (${seen.size} ท่า)`);
}
