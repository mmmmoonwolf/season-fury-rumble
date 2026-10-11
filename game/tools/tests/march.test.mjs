// ทดสอบสกิล 2 ใหม่ของ MARCH — Sky Drive (ยกคาง · ตีกลางอากาศ · ตบลงพื้น · เด้ง · ต่อบนพื้น)
// รัน: node tools/tests/march.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์เป็น march เพราะเป็นชื่อที่โชว์ ส่วน `id` ในซิมยังเป็น 'helios' ซึ่งห้ามเปลี่ยน
import fs from "fs";
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, PHYS, STAGE } = await import(G + "/core.js");

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
//
// **ข้อนี้เคยเขียนไว้ว่า `ev.some(e => e.type === 'bounce')` แล้วผ่านเขียว ๆ มาตลอด
// ทั้งที่การเด้งไม่เคยเกิดขึ้นจริง** — `onLand` ยิงอีเวนต์แล้วตั้ง vy ติดลบ
// แต่บรรทัด `f.vy = 0` ที่อยู่ถัดจากการเรียก `onLand` ล้างมันทิ้งในเฟรมเดียวกัน
// เท่ากับเทสต์วัด "ประกาศว่าจะเด้ง" ไม่ได้วัด "เด้งจริงไหม"
// เปลี่ยนมาวัดผลทางกายภาพ: หลังอีเวนต์เด้ง ตัวเป้าต้องลอยพ้นพื้นขึ้นไปจริง
{
  const g = mk();
  let bounceAt = null, peak = 0;
  for (let i = 0; i < 160; i++) {
    g.step(i < 2 ? SKY() : inp(), inp());
    if (bounceAt === null && g.events.some((e) => e.type === 'bounce')) bounceAt = i;
    if (bounceAt !== null && i > bounceAt) peak = Math.max(peak, STAGE.groundY - g.p2.y);
  }
  ok(bounceAt !== null, "ตบลงพื้นแล้วมีอีเวนต์เด้ง");
  ok(peak > 40, `เด้งแล้วลอยพ้นพื้นจริง ไม่ใช่แค่ยิงอีเวนต์ (สูงสุด ${Math.round(peak)} px)`);
}

// ── ต่อคอมโบ "สกิล 2 -> สกิล 1" — เป้าต้องยังตีได้อยู่นานพอให้คนกดทัน ────────
//
// **ดาเมจรวมไม่ใช่ตัวชี้วัดของข้อนี้** — วัดก่อน/หลังแก้ได้ 40-45 เท่ากันทั้งคู่
// เพราะชุด Chain Rush ยาวพอที่ไม้ท้าย ๆ จะไปโดนตอนอมตะหมดพอดี
// สิ่งที่ผู้เล่นเห็นคือ **เป้านอนอยู่กับพื้นแล้วหมัดทะลุผ่าน** ซึ่งวัดด้วย
// "อีกฝั่งล้มเมื่อไหร่ นับจากเฟรมที่เขาฟื้น" — ก่อนแก้ได้ 5 เฟรมทุกกรณี
{
  for (const delay of [0, 4, 8, 12, 16, 20]) {
    const g = mk();
    let free = null, downAt = null;
    for (let i = 0; i < 260; i++) {
      let a = inp();
      if (i < 2) a = SKY();
      else if (free !== null && i >= free + delay) a = inp({ skill1: 1, p: { skill1: 1 } });
      g.step(a, inp());
      if (free === null && i > 60 && g.p1.onGround && !g.p1.moveId && g.p1.stun <= 0) free = i;
      if (free !== null && downAt === null && g.p2.state === 'knockdown') downAt = i - free;
    }
    ok(downAt === null || downAt >= 10,
      `หน่วง ${delay} เฟรม: เป้ายังตีได้ถึง +${downAt} เฟรมหลังเขาฟื้น (ก่อนแก้คือ 5)`);
  }
}

// ── ระยะเอื้อมของท่ายกคางต้องพอต่อจากท่าอื่นได้ ───────────────────────────
//
// ของเดิมเอื้อมถึงแค่ 95 px ขณะที่ชุด Chain Rush เอื้อมถึง 180 และผลักเป้าออกไป 114
// จึง "กดสกิล 2 ต่อท้ายอะไรก็ฟันลม" ตรงตามที่ผู้เล่นรายงาน
// วัดเป็นตารางเพราะค่าที่พังไม่ได้พังปลายเดียว — vx สูงไปพังระยะประชิดแทน
{
  const full = (gap) => {
    const g = mk(gap);
    const ev = run(g, 150, (i) => (i < 2 ? SKY() : inp()));
    return ev.filter((e) => e.type === 'hit' && !e.self).length;
  };
  for (const gap of [40, 60, 80, 100, 120, 130]) {
    ok(full(gap) >= 5, `ระยะ ${gap} px ตีครบทั้งห้าที (${full(gap)})`);
  }
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

// ══ MARCH วิ่งเร็วกว่าคนอื่นนิดหน่อย — เขาเป็นสายประชิด ════════════════════════
//
// **เท่ากันเป๊ะแปลว่าไล่ไม่ทันตลอดกาล** คนที่ถอยหนีอย่างเดียวไม่ต้องเสี่ยงอะไรเลย
// นอกจากรอชนกำแพง ซึ่งแปลว่าตัวที่ต้องเข้าประชิดถึงจะทำอะไรได้เลย เสียเปรียบโดยโครงสร้าง
{
  ok(CHARACTERS.helios.run > PHYS.run,
    `MARCH วิ่งเร็วกว่าค่ากลาง (${CHARACTERS.helios.run} > ${PHYS.run})`);
  ok(CHARACTERS.helios.run <= PHYS.run * 1.12,
    `แต่ไม่เกิน +12% ไม่งั้นกลายเป็นตัวความเร็ว (+${((CHARACTERS.helios.run / PHYS.run - 1) * 100).toFixed(0)}%)`);
  const others = Object.values(CHARACTERS).filter((c) => c.id !== "helios");
  ok(others.every((c) => (c.run ?? PHYS.run) === PHYS.run),
    `คนอื่นยังใช้ค่ากลางเหมือนเดิมทุกตัว (${others.length} ตัว)`);

  /** ปล่อยให้วิ่งจนเต็มสปีดแล้ววัดความเร็วจริงที่ได้ */
  const topSpeed = (char) => {
    const g = new Game();
    g.p1.char = char; g.p1.ai = g.p2.ai = false;
    for (let f = 0; f < 90; f++) g.step(inp({ right: 1, run: 1 }), null);
    return Math.abs(g.p1.vx);
  };
  const march = topSpeed("helios"), bomb = topSpeed("nyx");
  ok(march > bomb, `วิ่งจริงแล้วเร็วกว่าจริง (MARCH ${march.toFixed(2)} vs BOMB ${bomb.toFixed(2)})`);
  ok(Math.abs(march - CHARACTERS.helios.run) < 0.01,
    `และได้ความเร็วตามที่ประกาศไว้เป๊ะ (${march.toFixed(2)})`);

  // ── ของจริงที่เปลี่ยน: ไล่ทันในที่โล่ง ──
  //
  // ในเวทีมีกำแพง คนหนีชนกำแพงแล้วต้องวกกลับอยู่ดี ความต่างจึงดูน้อย
  // ตัวเลขที่มีความหมายคือ "ช่องว่างตีบลงกี่ px ต่อวินาที" ตอนวิ่งไล่กันตรง ๆ
  const closeRate = (char) => {
    const g = new Game();
    g.p1.char = char; g.p2.char = "nyx"; g.p1.ai = g.p2.ai = false;
    g.p1.x = 200; g.p2.x = 500;
    const gap0 = g.p2.x - g.p1.x;
    for (let f = 0; f < 60; f++) {
      g.step(inp({ right: 1, run: 1 }), inp({ right: 1, run: 1 }));
      g.p2.x = Math.min(g.p2.x, STAGE.w - 60);     // กันคนหนีทะลุกำแพงไป
    }
    return gap0 - (g.p2.x - g.p1.x);
  };
  const same = closeRate("nyx");
  ok(Math.abs(same) < 1, `ความเร็วเท่ากัน = ช่องว่างไม่ตีบเลย ไล่ไม่ทันตลอดกาล (${same.toFixed(0)} px/วิ)`);
  const faster = closeRate("helios");
  ok(faster > 15, `MARCH ไล่แล้วช่องว่างตีบจริง (${faster.toFixed(0)} px/วิ)`);
  ok(faster < 50, `แต่ไม่ถึงขั้นวิ่งไล่ทันทันที (${faster.toFixed(0)} px/วิ — เกิน 50 คือเร็วเกิน)`);
}

// ── ความเร็วของ "ท่าที่เคลื่อนที่" ต้องไม่ขยับตาม ──
//
// ท่าพวกนั้นถูกจูนระยะเอื้อมมาทีละท่าด้วยการวัดจริง (ดูหมวด sky1 ข้างบน)
// ถ้าให้มันเร็วตามความเร็ววิ่งไปด้วย ระยะของทุกไม้จะยืดพร้อมกันเงียบ ๆ
// แล้วตารางคอมโบที่วัดไว้ทั้งหมดใช้ไม่ได้อีกต่อไปโดยไม่มีอะไรฟ้อง
{
  const src = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url).pathname, "utf8");
  const mobile = src.slice(src.indexOf("m.mobile;") - 200, src.indexOf("m.mobile;") + 20);
  ok(/PHYS\.run \* m\.mobile/.test(mobile),
    "ท่าที่เคลื่อนที่ยังอ่านค่ากลาง ไม่ใช่ความเร็วของตัวละคร");
  ok(/f\.runSpeed/.test(src), "ส่วนการวิ่งเปล่าอ่านความเร็วของตัวละคร");

  // วัดผลจริง ไม่ใช่อ่านแต่โค้ด — ต้องเทียบ **ตัวเดียวกัน ท่าเดียวกัน** ที่ความเร็ววิ่งต่างกัน
  // (เทียบ MARCH กับ BOMB ไม่ได้: คนละท่า คนละค่า mobile คนละความยาวท่า ต่างกันอยู่แล้วตั้งแต่ต้น)
  // วัด **เฉพาะช่วงที่ยังอยู่ในท่า** ไม่งั้นจะติดระยะที่เขาวิ่งต่อหลังท่าจบมาด้วย
  // แล้วเทสต์จะแดงเพราะวัดผิด ไม่ใช่เพราะโค้ดรั่ว (เจอมาแล้วรอบหนึ่ง)
  const travel = () => {
    const g = new Game();
    g.p1.char = "helios"; g.p1.ai = g.p2.ai = false;
    g.p2.x = g.p1.x + 400;
    const x0 = g.p1.x;
    g.step(inp({ p: { attack: 1 }, attack: 1 }), null);
    let moved = 0;
    for (let f = 0; f < 40 && g.p1.move; f++) { g.step(inp({ right: 1 }), null); moved = g.p1.x - x0; }
    return moved;
  };
  const was = CHARACTERS.helios.run;
  const slow = travel();
  CHARACTERS.helios.run = PHYS.run * 3;          // เร่งให้สุดโต่งไปเลย จะได้เห็นชัดถ้ามันรั่ว
  const fast = travel();
  CHARACTERS.helios.run = was;
  ok(Math.abs(slow - fast) < 0.01,
    `เร่งความเร็ววิ่งสามเท่าแล้วระยะที่ไม้แรกพาไปไม่ขยับเลย (${slow.toFixed(1)} vs ${fast.toFixed(1)})`);
}

// ── ฝั่งวาด: วิ่งเร็วขึ้นแล้วต้องย่ำเท้าเร็วตาม ไม่งั้นเท้าไถไปกับพื้น ──
{
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url).pathname, "utf8");
  ok(/key === 'run'\) sp\.anims\.timeScale = f\.runSpeed \/ PHYS\.run/.test(scene),
    "ฉากหรี่/เร่งวงจรวิ่งตามความเร็วของตัวละคร");
  ok(/get runSpeed\(\)/.test(fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url).pathname, "utf8")),
    "และอ่านจากที่เดียวกับที่ซิมใช้ ไม่ใช่ค่าที่ก๊อปมาวางไว้อีกที");
}

// ══ สกิล 1 ต้องแตกทางได้จริงตอนกดรัว ไม่ใช่โดนปุ่มตีตัดทิ้ง ════════════════════
//
// 🔴 `rush5` ใช้ `branch` ไม่ใช่ `autoChain` — ด่านกันการยกเลิกใน controlPlayer
// เดิมเช็กแค่ `autoChain || mashChain` จึงไม่ครอบ branch
// ผล: กดรัวปุ่มตี แล้ว rush5 ถูกตัดเข้า jab1 ก่อนจะทันแตกทาง **ไม้จบไม่เคยออกเลย**
// คนที่กดรัวซึ่งเป็นคนส่วนใหญ่ จึงไม่เคยเห็นจุดที่ทำให้สกิล 1 ต่างจากสกิล 3
{
  const ACT = new Set(["idle", "run", "air", "crouch", "landing"]);
  /** กดสกิล1 แล้วรัวปุ่มตีตลอด — เลียนแบบคนเล่นจริงที่กดรัว */
  const mashRush = () => {
    const g = new Game();
    g.p1.char = "helios"; g.p2.char = "nyx"; g.p1.ai = g.p2.ai = false;
    g.p2.x = g.p1.x + 70; g.p1.facing = 1;
    const seen = [];
    for (let f = 1; f < 200; f++) {
      const o = { ...NONE, p: {} };
      if (f === 1) { o.skill1 = 1; o.p.skill1 = 1; }
      else if (f % 2 === 0) { o.attack = 1; o.p.attack = 1; }
      g.step(o, null);
      if (g.p1.moveId && seen[seen.length - 1] !== g.p1.moveId) seen.push(g.p1.moveId);
    }
    return seen;
  };
  const seen = mashRush();
  ok(seen.some((k) => /^rushEnd/.test(k)),
    `กดรัวแล้วไม้จบของชุดยังออก (${seen.slice(0, 7).join(" ")})`);
  const i5 = seen.indexOf("rush5"), ie = seen.findIndex((k) => /^rushEnd/.test(k));
  ok(i5 >= 0 && ie === i5 + 1, `ไม้จบมาต่อจาก rush5 ทันที ไม่มีแย็บแทรก (${seen[i5]} -> ${seen[i5 + 1]})`);
}

// ══ แตกสามทางต้องได้คนละอย่าง ไม่ใช่ภาพต่างแต่ผลเท่ากัน ═══════════════════════
//
// ของเดิมวัดได้ 17 ดาเมจ 6 ที 72 เฟรม **เท่ากันเป๊ะทั้งสามทาง** ต่างแค่ระยะเดินหน้า
//   หน้า = ผลักออกไกลสุด · บน = แรงสุดในไม้เดียว · ล่าง = เบาสุดแต่ต่อยาวสุด
{
  const ACT = new Set(["idle", "run", "air", "crouch", "landing"]);
  /** เส้นทางจริงของคนเล่น: แย็บสามที -> ตัดเข้าสกิล1 -> ค้างทิศ -> รัวต่อ
   *  ต้องมีแย็บนำหน้า ไม่งั้น refresh ของทางล่างไม่มีอะไรให้ปลด (used ยังว่าง) */
  const route = (dir) => {
    const g = new Game();
    g.p1.char = "helios"; g.p2.char = "nyx"; g.p1.ai = g.p2.ai = false;
    g.p2.x = g.p1.x + 70; g.p1.facing = 1;
    const seen = []; let dmg = 0, hits = 0, hp = g.p2.hp, started = false, endF = -1;
    for (let f = 1; f < 320; f++) {
      const o = { ...NONE, p: {} };
      if ([1, 9, 17].includes(f)) { o.attack = 1; o.p.attack = 1; }
      else if (f === 27) { o.skill1 = 1; o.p.skill1 = 1; }
      else if (f > 27 && endF < 0) { if (dir) o[dir] = 1; }
      else if (endF > 0 && f % 2 === 0) { o.attack = 1; o.p.attack = 1; }
      g.step(o, null);
      const id = g.p1.moveId;
      if (id && seen[seen.length - 1] !== id) seen.push(id);
      if (endF < 0 && /^rushEnd/.test(id ?? "")) endF = f;
      if (g.p2.hp < hp) { dmg += hp - g.p2.hp; hits++; hp = g.p2.hp; started = true; }
      if (started && ACT.has(g.p2.state) && g.p2.hitstop === 0) break;
    }
    const ender = seen.find((k) => /^rushEnd/.test(k));
    const after = seen.slice(seen.findIndex((k) => /^rushEnd/.test(k)) + 1).length;
    return { dmg, hits, ender, after };
  };
  const F = route(null), U = route("up"), D = route("down");
  ok(F.ender === "rushEndF" && U.ender === "rushEndU" && D.ender === "rushEndD",
    `ค้างทิศแล้วได้ไม้จบตามที่สั่ง (${F.ender} / ${U.ender} / ${D.ender})`);

  const mv = CHARACTERS.helios.moves;
  ok(mv.rushEndU.dmg > mv.rushEndF.dmg && mv.rushEndF.dmg > mv.rushEndD.dmg,
    `ดาเมจไม้จบไล่ระดับ บน ${mv.rushEndU.dmg} > หน้า ${mv.rushEndF.dmg} > ล่าง ${mv.rushEndD.dmg}`);
  ok(mv.rushEndF.kb[0] > mv.rushEndU.kb[0] && mv.rushEndF.kb[0] > mv.rushEndD.kb[0],
    `ทางหน้าผลักออกไกลสุด (kb ${mv.rushEndF.kb[0]})`);
  ok(Array.isArray(mv.rushEndD.refresh) && mv.rushEndD.refresh.includes("jab1"),
    "ทางล่างปลดชุดพื้นให้เริ่มใหม่ได้");
  // ทางล่างเบาสุดแต่ต้องต่อได้ยาวสุด ไม่งั้นมันคือทางที่แย่กว่าเขาทุกด้าน
  ok(D.after > F.after && D.after > U.after,
    `ทางล่างต่อได้อีกมากสุด (ล่าง ${D.after} · หน้า ${F.after} · บน ${U.after} ไม้)`);
  ok(D.dmg > F.dmg, `และรวมแล้วคุ้มกับที่ไม้จบเบากว่า (ล่าง ${D.dmg} · หน้า ${F.dmg})`);
  // ไม่มีทางไหนทิ้งห่างจนทางอื่นไร้ความหมาย
  const all = [F.dmg, U.dmg, D.dmg];
  ok(Math.max(...all) - Math.min(...all) <= 6,
    `สามทางยังสูสีกัน ไม่มีทางที่ดีกว่าชัดจนไม่ต้องเลือก (${all.join(" / ")})`);
}
