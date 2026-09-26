// ทดสอบกลไกเฉพาะตัวของ Momus — กล่องระเบิดที่ไม่เลือกข้าง ดีดนิ้วสลับที่ และอัลติโปรยกล่อง
const fs = await import("fs");
// รัน: node tools/tests/momus.test.mjs   (จากโฟลเดอร์ game)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, KI_MAX, STAGE } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 200, foe = "helios") => {
  const g = new Game(); g.p1.char = "momus"; g.p2.char = foe;
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};
const run = (g, n, a = () => inp(), b = () => inp()) => {
  const ev = [];
  for (let i = 0; i < n; i++) { g.step(a(i), b(i)); ev.push(...g.events); }
  return ev;
};

// ── กฎเหล็ก: ระเบิดของเขาโดนตัวเขาเอง แต่ "ไม่หักเลือด" ──
//
// เขายังต้องโดนแรงกระแทก ไม่งั้นระเบิดกลายเป็นของฟรีที่วางทิ้งไว้โดยไม่ต้องคิดว่าตัวเองอยู่ไหน
// และที่แย่กว่านั้นคือเอาระเบิดตัวเองดีดหนีได้ ซึ่งกลับหัวความหมายของท่าทั้งท่า
{
  const g = mk(600);                       // คู่ต่อสู้อยู่ไกลจนไม่เกี่ยวข้อง
  run(g, 1, () => inp({ skill1: 1, p: { skill1: 1 } }));
  const before = g.p1.hp;
  let launched = false;
  for (let i = 0; i < 240; i++) {
    g.step(inp({ right: 1 }), inp());      // ขว้างแล้วเดินตามไปเหยียบเอง
    if (g.events.some((e) => e.type === 'hit' && e.self)) launched = true;
  }
  ok(launched, "เหยียบไหตัวเองแล้วโดนแรงกระแทกจริง");
  ok(g.p1.hp === before, `แต่ไม่เสียเลือดสักหน่วย (${g.p1.hp}/${g.p1.maxHp})`);
}

// ── แต่ยังโดนคู่ต่อสู้ด้วย ไม่ใช่ท่าทำร้ายตัวเองเปล่า ๆ ──
{
  const g = mk(150);
  run(g, 240, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}));
  ok(g.p2.hp < 100, `คู่ต่อสู้ที่ยืนใกล้กล่องก็โดน (${g.p2.hp}/100)`);
}

// ── กล่องต้องไม่ติดชนวนทันทีที่ขว้าง ──
// ไม่งั้นมันระเบิดใส่หน้าตัวเองทุกครั้งที่กด = กดไม่ได้เลย
{
  const M = CHARACTERS.momus.moves;
  const g = mk(600);
  run(g, 1, () => inp({ skill1:1, p:{ skill1:1 } }));
  run(g, M.box1.boxDrop.at + 2, () => inp());
  const b = g.boxes[0];
  ok(b && b.arm > 0, `เพิ่งขว้างออกไปยังไม่ติดชนวน (เหลืออีก ${b?.arm} เฟรม)`);
  ok(b.x > g.p1.x, "กล่องไปตกข้างหน้า ไม่ใช่ที่เท้าตัวเอง");
}

// ── ครบเวลาแล้วระเบิดเอง แม้ไม่มีใครแตะ ──
{
  const g = mk(900);
  const ev = run(g, 260, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}));
  ok(ev.some((e) => e.type === "blast"), "ไม่มีใครแตะก็ระเบิดเองเมื่อครบเวลา");
  ok(g.boxes.length === 0, "ระเบิดแล้วกล่องหายไปจริง");
}

// ── วางเกินโควต้าแล้วใบเก่าสุดหายไป ไม่ใช่กดไม่ติด ──
// "กดแล้วไม่เกิดอะไร" เป็นความรู้สึกที่แย่ที่สุดในเกมต่อสู้ คนเล่นจะไม่รู้ว่าติดโควต้าอยู่
{
  const g = mk(900);
  for (let k = 0; k < 4; k++) {
    g.p1.cd[0] = 0;
    run(g, 40, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}));
  }
  ok(g.boxes.length <= 2, `วางพร้อมกันได้ไม่เกินสองใบ (ตอนนี้ ${g.boxes.length})`);
  ok(g.boxes.length > 0, "และยังมีกล่องอยู่จริง ไม่ใช่กดไม่ติดทั้งหมด");
}

// ══ สกิล 2 Understudy: ทิ้งตัวแสดงแทนไว้ แล้วหลุดออกไป ═══════════════════════
//
// ท่านี้มาแทน "ดีดนิ้วสลับที่" ของเดิม เหตุผลคือการสลับที่ถูกย้ายไปรวมกับอัลติแล้ว
// (อัลติวาร์ปขึ้นชั้นบนสุด) ถ้าไม่มีอะไรมาแทน เขาจะไม่มีปุ่มหนีตอนโดนต้อนติดมุมเลย
// เพราะอัลติใช้หลอดเต็ม ซึ่งตอนโดนไล่มักจะไม่มี

// ── ต้องขยับตัวเขาด้วย ไม่ใช่แค่วางหุ่น ──
// นี่คือเหตุผลทั้งหมดที่มีท่านี้ ถ้าไม่ขยับก็ไม่ใช่ปุ่มหนี
{
  const g = mk(220);
  const x1 = g.p1.x;
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  ok(g.decoy != null, "มีตัวแสดงแทนยืนอยู่");
  ok(Math.abs(g.decoy.x - x1) < 1, `หุ่นยืนอยู่ตรงที่เขาเคยยืน (${Math.round(g.decoy.x)})`);
  ok(Math.abs(g.p1.x - x1) > 100, `ตัวจริงหลุดออกไปไกลพอ (${Math.round(x1)} -> ${Math.round(g.p1.x)})`);
  ok(g.p1.onGround, "ยังยืนพื้นอยู่ ไม่ได้ลอยค้าง");
}

// ── ออกไวที่สุดในเกมเท่าเดิม ──
// ปุ่มหนีที่ออกช้าคือปุ่มหนีที่ใช้ไม่ทัน
{
  const M = CHARACTERS.momus.moves;
  ok(M.snap1.startup <= 3, `ออกภายใน 3 เฟรม (${M.snap1.startup})`);
}

// ── มีได้ทีละตัวเดียว ──
{
  const g = mk(220);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  const first = g.decoy.x;
  run(g, 30, () => inp());          // รอให้ท่าเดินจบก่อน (snap1 -> snap2 รวม ~27 เฟรม)
  g.p1.cd[1] = 0;
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  ok(g.decoy != null && Math.abs(g.decoy.x - first) > 50,
    `กดซ้ำแล้วได้หุ่นตัวใหม่ ตัวเก่าหายไป (${Math.round(first)} -> ${Math.round(g.decoy.x)})`);
}

// ── หมดเวลาแล้วหายเฉย ๆ ไม่ระเบิด ──
//
// ถ้าระเบิดเองด้วย มันจะกลายเป็นระเบิดใบที่สองที่วางแล้วเดินหนีได้
// รางวัลของท่านี้ต้องอยู่ที่ "หลอกเขาสำเร็จ" ไม่ใช่ที่ "วางไว้เฉย ๆ"
{
  const g = mk(600);
  const ev = [];
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  for (let i = 0; i < 200; i++) { g.step(inp(), inp()); ev.push(...g.events); }
  ok(g.decoy === null, "หมดเวลาแล้วหุ่นหายไป");
  ok(ev.some((e) => e.type === 'decoyGone'), "หายแบบหมดอายุ");
  ok(!ev.some((e) => e.type === 'decoyPop'), "ไม่ระเบิดตอนหมดอายุ");
  ok(g.p2.hp === g.p2.maxHp, `คู่ต่อสู้ที่ยืนเฉย ๆ ไม่เสียเลือดเลย (${g.p2.hp}/${g.p2.maxHp})`);
}

// ── ตีโดนหุ่นแล้วมันระเบิดใส่คนตี ──
{
  const g = mk(220);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  const dx = g.decoy.x;
  g.p2.x = dx + 60; g.p2.facing = -1;          // ยืนประชิดหุ่นแล้วต่อย
  const before = g.p2.hp;
  const ev = [];
  for (let i = 0; i < 30; i++) {
    g.step(inp(), inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
    ev.push(...g.events);
  }
  ok(ev.some((e) => e.type === 'decoyPop'), "ต่อยหุ่นแล้วหุ่นแตก");
  ok(g.decoy === null, "หุ่นหายหลังแตก");
  ok(g.p2.hp < before, `คนที่ต่อยเสียเลือดจากระเบิด (${before} -> ${g.p2.hp})`);
}

// ── เจ้าของตีหุ่นตัวเองไม่ได้ ──
// ไม่งั้นเขาเอาหุ่นของตัวเองเป็นระเบิดกดใส่เมื่อไหร่ก็ได้ ซึ่งไม่ใช่ท่าหลอก แต่เป็นท่าตี
{
  const g = mk(600);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  const dx = g.decoy.x;
  g.p1.x = dx - 50; g.p1.facing = 1;
  for (let i = 0; i < 30; i++) g.step(inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}), inp());
  ok(g.decoy != null, "ตีหุ่นของตัวเองแล้วไม่แตก");
}

// ── ระเบิดของหุ่นไม่หักเลือดเจ้าของ ตามกติกาเดียวกับไห ──
{
  const g = mk(220);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  const dx = g.decoy.x;
  g.p1.x = dx + 20;                            // ยืนติดหุ่นตัวเอง
  g.p2.x = dx + 60; g.p2.facing = -1;
  const before = g.p1.hp;
  for (let i = 0; i < 30; i++) g.step(inp(), inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  ok(g.p1.hp === before, `เจ้าของยืนติดหุ่นตอนมันแตกก็ไม่เสียเลือด (${g.p1.hp}/${g.p1.maxHp})`);
}

// ── ระเบิดหุ่นไม่ให้ชั้น House ──
// ชั้นมาจากไหอย่างเดียว ไม่งั้นเก็บง่ายเกินไปและเสียความหมายของ "ต้องต้อนเขาเข้าไห"
{
  const g = mk(220);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  g.p2.x = g.decoy.x + 60; g.p2.facing = -1;
  for (let i = 0; i < 30; i++) g.step(inp(), inp(i === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  ok(g.p1.house === 0, `ระเบิดหุ่นไม่ให้ชั้น (${g.p1.house})`);
}

// ── รีเซ็ตทุกยก ──
{
  const g = mk(220);
  run(g, 6, (i) => inp(i === 0 ? { skill2: 1, p: { skill2: 1 } } : {}));
  g.resetPositions();
  ok(g.decoy === null, "ขึ้นยกใหม่แล้วหุ่นหายไปด้วย");
}

// ── อัลติ: โปรยกล่องทั่วเวที ──
{
  const g = mk(300); g.p1.ki = KI_MAX;
  run(g, 40, (i) => inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}));
  ok(g.boxes.length === 4, `โรงว่าง (0 ชั้น) ได้ 4 ไห — ใช้อัลติได้เสมอ แค่ได้เล็ก (${g.boxes.length})`);
  const xs = g.boxes.map((b) => b.x);
  const span = Math.max(...xs) - Math.min(...xs);
  ok(span > (STAGE.wallR - STAGE.wallL) * 0.7, `กระจายทั่วเวทีจริง (กว้าง ${Math.round(span)} px)`);
  const fuses = g.boxes.map((b) => b.fuse);
  ok(new Set(fuses).size === fuses.length, "ชนวนเหลื่อมกันทุกใบ = ระเบิดไล่กันเป็นทอด ๆ ไม่ใช่ตูมเดียว");
}

// ── อัลติก็ไม่เลือกข้าง เจ้าของโดนแรงกระแทก แต่ไม่เสียเลือด ──
{
  // ต้องใช้โรงเต็ม เพราะโรงว่าง (4 ไห) ยังมีช่องว่างให้ยืนได้จริง — ดูข้อ "ความครอบคลุม" ข้างล่าง
  const g = mk(300); g.p1.ki = KI_MAX; g.p1.house = 5;
  const before = g.p1.hp;
  let launched = false;
  for (let i = 0; i < 300; i++) {
    g.step(inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}), inp());
    if (g.events.some((e) => e.type === 'hit' && e.self)) launched = true;
  }
  ok(launched, "ยืนอยู่กลางฝนไหตัวเองแล้วโดนดีดจริง");
  ok(g.p1.hp === before, `อัลติไม่หักเลือดตัวเอง (${g.p1.hp}/${g.p1.maxHp})`);
  ok(g.p2.hp < g.p1.hp, `แต่คู่ต่อสู้ที่ยืนนิ่งเจ็บกว่า (${g.p2.hp} เทียบ ${g.p1.hp})`);
}

// ── กันได้ ระเบิดไม่ใช่ของที่กันไม่ได้ ──
{
  const hit = (block) => {
    const g = mk(150);
    run(g, 240, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}), () => inp(block ? { block: 1 } : {}));
    return 100 - g.p2.hp;
  };
  const open = hit(false), guard = hit(true);
  ok(open > 0 && guard < open, `กันแล้วเจ็บน้อยลงชัดเจน (${guard} เทียบ ${open})`);
}

// ── ท่าตีปกติต้องเบาแต่รัว ไม่ใช่หนักและช้า ──
// เกมนี้เร็วและคนใส่กันรัว ท่าที่เงื้อนานคือท่าที่ไม่มีวันได้ใช้
{
  const M = CHARACTERS.momus.moves;
  const span = (m) => m.startup + m.active + m.recovery;
  const others = ["nyx", "helios", "alecto", "atlas", "orpheus"].map((c) => span(CHARACTERS[c].moves.jab1));
  ok(span(M.jab1) <= Math.min(...others), `จิ้มของเขาสั้นที่สุดในโรสเตอร์ (${span(M.jab1)} เฟรม · รองลงมา ${Math.min(...others)})`);
  ok(M.jab1.dmg <= 3 && M.jab2.dmg <= 3, `แลกกับดาเมจที่เบา (${M.jab1.dmg}/${M.jab2.dmg})`);
}

// ── กับดักที่กัดมาแล้วห้ารอบ: ท่ากลางคอมโบห้ามถีบขึ้น ──
{
  const M = CHARACTERS.momus.moves;
  const mid = ["jab1", "jab2", "jab3", "side"];
  const bad = mid.filter((k) => M[k].kb[1] !== 0);
  ok(bad.length === 0, `ท่ากลางคอมโบไม่มีท่าไหนถีบขึ้น${bad.length ? " (เจอ " + bad.join(",") + ")" : ""}`);
}

// ── ห้ามตั้ง active: 0 — phase() จะข้ามช่วง active ทั้งช่วง เฟรมอาร์ตกลางไม่ถูกวาด ──
{
  const M = CHARACTERS.momus.moves;
  const zero = Object.keys(M).filter((k) => M[k].active === 0);
  ok(zero.length === 0, `ไม่มีท่าไหนตั้ง active เป็น 0${zero.length ? " (เจอ " + zero.join(",") + ")" : ""}`);
}

// ── กล่องต้องอยู่ในกำแพงเวทีเสมอ ──
// ขว้างตอนยืนติดขอบแล้วกล่องหลุดออกไปนอกจอ = กดสกิลทิ้งไปเปล่า ๆ โดยไม่รู้ตัว
{
  const g = mk(300);
  g.p1.x = STAGE.wallR - 10; g.p1.facing = 1;
  run(g, 20, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}));
  ok(g.boxes.length === 1 && g.boxes[0].x <= STAGE.wallR && g.boxes[0].x >= STAGE.wallL,
    `ขว้างติดขอบแล้วกล่องยังอยู่ในเวที (x=${Math.round(g.boxes[0]?.x)} · ขอบ ${STAGE.wallR})`);
}

// ── รีเซ็ตยกแล้วกล่องต้องหายหมด ──
// ไม่งั้นยกใหม่เริ่มมาพร้อมระเบิดค้างจากยกที่แล้ว ซึ่งไม่มีใครรู้ว่ามันอยู่ตรงไหน
{
  const g = mk(300);
  run(g, 20, (i) => inp(i === 0 ? { skill1:1, p:{ skill1:1 } } : {}));
  ok(g.boxes.length > 0, "มีกล่องอยู่ก่อนรีเซ็ต");
  g.resetPositions();
  ok(g.boxes.length === 0, "รีเซ็ตยกแล้วกล่องหายหมด");
}

// ── ไม้จบ "ยัดหีบ" — ภาพจำของตัวละคร ──
//
// jab4 คือ "คว้า" · jab5/jab6 ต่อเฉพาะตอนคว้าติด ไม่ใช่ autoChain
// ท่าจับที่พลาดแล้วยังเล่นท่ายัดต่อ จะดูเหมือนจับติดทั้งที่ไม่โดน
// คนเล่นทั้งสองฝั่งอ่านผิดพร้อมกัน — คนจับนึกว่าได้ คนโดนนึกว่าโดน แล้วตัดสินใจผิดทั้งคู่
{
  const chainOf = (gap) => {
    const g = mk(gap);
    const seen = [];
    for (let i = 0; i < 180; i++) {
      g.step(inp(i % 7 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp());
      if (g.p1.moveId && seen.at(-1) !== g.p1.moveId) seen.push(g.p1.moveId);
    }
    return seen;
  };
  const hit = chainOf(90), miss = chainOf(600);
  ok(hit.slice(0, 6).join(",") === "jab1,jab2,jab3,jab4,jab5,jab6",
    `คว้าติดแล้วต่อครบหกจังหวะ (${hit.slice(0, 6).join(" -> ")})`);
  ok(!miss.includes("jab5") && !miss.includes("jab6"),
    `คว้าไม่โดนก็จบแค่ท่าคว้า ไม่ยัดหีบให้อากาศ (${miss.slice(0, 4).join(" -> ")})`);
  ok(miss.includes("jab4"), "แต่ท่าคว้ายังออกได้ตามปกติ — ไม่ใช่กดแล้วไม่มีอะไรเกิด");
}

// ── ท่าจับต้องลากเข้าหาตัว ไม่ใช่ผลักออก ──
//
// ตั้ง kb เป็นบวกตอนแรกแล้ววัดได้ว่าระยะห่างไต่ขึ้นทุกหมัด (90 -> 114 -> 125)
// จน jab6 เอื้อมไม่ถึง คอมโบขาดที่จังหวะห้าทุกครั้งทั้งที่คว้าติดแล้ว
{
  const M = CHARACTERS.momus.moves;
  ok(M.jab4.kb[0] < 0 && M.jab5.kb[0] < 0,
    `สองจังหวะแรกของไม้จบลากเข้า (${M.jab4.kb[0]} / ${M.jab5.kb[0]})`);

  const g = mk(90);
  let hits = 0, last = 0;
  for (let i = 0; i < 180; i++) {
    g.step(inp(i % 7 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp());
    for (const e of g.events) if (e.type === "comboEnd" && e.hits > last) { hits = e.hits; last = e.hits; }
  }
  ok(hits >= 6, `ต่อครบหกจังหวะได้จริงตอนวัดทั้งคอมโบ (ยาวสุด ${hits} hit)`);
}

// ── ไม้จบถีบขึ้นได้ แต่จังหวะก่อนหน้าห้าม ──
// jab6 จบคอมโบตรงนั้นพอดี จึงลอยได้ · jab4/jab5 อยู่กลางชุด ลอยเมื่อไหร่คอมโบขาด
{
  const M = CHARACTERS.momus.moves;
  ok(M.jab4.kb[1] === 0 && M.jab5.kb[1] === 0, "ท่าคว้ากับท่ายัดไม่ถีบขึ้น");
  ok(M.jab6.kb[1] < 0, `ไม้จบถีบขึ้นได้ (${M.jab6.kb[1]})`);
}

// ── ท่าจับต้องกันได้ ไม่ใช่ของที่กันไม่ได้ ──
// ตัวนี้ไม่มีอะไรการันตีดาเมจเลย ถ้าไม้จบกันไม่ได้ก็ผิดคอนเซปต์ทั้งตัว
{
  const dmgOf = (block) => {
    const g = mk(90);
    for (let i = 0; i < 180; i++)
      g.step(inp(i % 7 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp(block ? { block: 1 } : {}));
    return 100 - g.p2.hp;
  };
  const open = dmgOf(false), guard = dmgOf(true);
  ok(guard < open, `กันไว้แล้วเจ็บน้อยกว่ามาก (${guard} เทียบ ${open})`);
}

// ══ ชั้น "โรงเต็ม" — ki บอกว่าใช้อัลติได้ไหม ชั้นบอกว่าอัลติใหญ่แค่ไหน ══════════════
//
// แยกสองอย่างนี้ออกจากกันโดยตั้งใจ ถ้าชั้นเป็นตัว "ปลดล็อก" อัลติ แล้วชั้นเก็บยาก
// คนที่โดนไล่ตีทั้งยกจะไม่มีวันได้ใช้อัลติเลย ซึ่งแย่ที่สุดสำหรับตัวละครที่อัลติคือช่วงเวลาของเขา
{
  // ── ได้ชั้นเฉพาะตอนไหระเบิด "โดนคู่ต่อสู้" ──
  // ไหคือกับดัก คนมีสายตาจะไม่เดินเข้าไปเอง ต้องต้อนเขาเข้าไป นั่นคือที่มาของความยาก
  {
    const g = mk(600);
    run(g, 1, () => inp({ skill1: 1, p: { skill1: 1 } }));
    run(g, 240, () => inp({ right: 1 }));        // เหยียบเอง คู่ต่อสู้อยู่ไกล
    ok(g.p1.house === 0, `ระเบิดโดนตัวเองไม่ได้ชั้น (${g.p1.house})`);
  }
  {
    const g = mk(150);                            // คู่ต่อสู้อยู่ในระยะที่ไหจะไปถึง
    run(g, 1, () => inp({ skill1: 1, p: { skill1: 1 } }));
    run(g, 240, () => inp());
    ok(g.p1.house >= 1, `ไหระเบิดโดนคู่ต่อสู้แล้วได้ชั้น (${g.p1.house})`);
  }

  // ── ชั้นขยายอัลติจริง และมีเพดาน ──
  const rain = (house) => {
    const g = mk(300); g.p1.ki = KI_MAX; g.p1.house = house;
    run(g, 40, (i) => inp(i === 0 ? { skill3: 1, p: { skill3: 1 } } : {}));
    return g;
  };
  ok(rain(0).boxes.length === 4, "โรงว่าง = 4 ไห");
  ok(rain(5).boxes.length === 9, "โรงเต็ม = 9 ไห");
  ok(rain(99).boxes.length === 9, "เกินเพดานแล้วไม่โตต่อ — กันกรณีที่ชั้นหลุดไปมากกว่าเพดาน");
  for (let h = 0; h <= 5; h++)
    ok(rain(h).boxes.length === 4 + h, `${h} ชั้น -> ${4 + h} ไห`);

  // ── ใช้อัลติแล้วโรงว่าง เริ่มเก็บใหม่ ──
  {
    const g = rain(5);
    ok(g.p1.house === 0, `ใช้อัลติแล้วชั้นกลับเป็นศูนย์ (${g.p1.house})`);
  }

  // ── รีเซ็ตทุกยก ──
  // เป็นของที่สะสมเพื่อจังหวะเดียว ไม่ใช่สถานะถาวร ข้ามยกไปได้คือกดอัลติเต็มทันทีที่ยกใหม่เริ่ม
  {
    const g = mk(300); g.p1.house = 4;
    g.resetPositions();
    ok(g.p1.house === 0, "ขึ้นยกใหม่แล้วโรงว่าง");
  }

  // ── เพดานเท่าตราแส้ของ Alecto ──
  // ตัวเลขเดียวกันทั้งเกมทำให้คนเล่นเดาถูกโดยไม่ต้องจำแยก
  {
    const src = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");
    const houseMax = +(src.match(/const HOUSE_MAX = (\d+)/)?.[1] ?? 0);
    const lashMax = +(src.match(/const LASH_MAX = (\d+)/)?.[1] ?? 0);
    ok(houseMax === lashMax, `เพดานชั้นเท่าตราแส้ (${houseMax} = ${lashMax})`);
  }
}

// ══ อัลติ: วาร์ปขึ้นชั้นบนสุดก่อนโปรย ══════════════════════════════════════════
//
// ที่ต้องวาร์ปก่อน เพราะท่านี้เงื้อ 10 เฟรมแล้วต่ออีก 8 = 18 เฟรมยืนนิ่ง
// ในเกมที่เร็วขนาดนี้คือโดนสวนฟรี อัลติที่กดแล้วโดนตีหลุดคืออัลติที่ไม่มีใครกด
{
  const top = STAGE.platforms.reduce((a, p) => (p.y < a.y ? p : a));

  {
    const g = mk(300); g.p1.ki = KI_MAX;
    const y0 = g.p1.y;
    run(g, 1, () => inp({ skill3: 1, p: { skill3: 1 } }));
    ok(g.p1.y === top.y, `วาร์ปขึ้นชั้นบนสุดทันทีที่กด (${y0} -> ${g.p1.y} · ชั้นบนสุด ${top.y})`);
    ok(g.p1.x === (top.x1 + top.x2) / 2, `ยืนกลางแท่นเป๊ะ (${g.p1.x}) — ไม่มีสุ่ม สองเครื่องจึงตรงกัน`);
    ok(g.p1.onGround && g.p1.vx === 0 && g.p1.vy === 0, "ยืนนิ่งบนแท่น ไม่ได้ค้างความเร็วเดิมไว้");
  }

  // ── อมตะระหว่างขึ้น ไม่งั้นวาร์ปแล้วโดนตีหลุดกลางทางก็เท่าเดิม ──
  {
    const g = mk(300); g.p1.ki = KI_MAX;
    run(g, 1, () => inp({ skill3: 1, p: { skill3: 1 } }));
    ok(g.p1.invuln > 0, `อมตะตอนเพิ่งขึ้นไป (invuln ${g.p1.invuln})`);
  }

  // ── แต่ไม่ได้แปลว่าปลอดภัย: ไหจุดชนวนจากคนที่ยืนบน "พื้นชั้นไหนก็ได้" ──
  //
  // กลไกนี้มีอยู่แล้วในโค้ดและไม่ได้เช็คความสูงเลย ข้อนี้ล็อกไว้ว่าต้องเป็นแบบนั้นต่อไป
  // เพราะมันคือสิ่งที่ทำให้ "หนีขึ้นที่สูง" ไม่ใช่คำตอบสำเร็จรูปของทั้งเกม
  {
    const g = mk(300);
    const cx = (top.x1 + top.x2) / 2;
    g.boxes.push({ x: cx, owner: 'p2', fuse: 200, arm: 0 });
    g.p1.x = cx; g.p1.y = top.y; g.p1.onGround = true;
    const before = g.p1.hp;
    run(g, 6, () => inp());
    ok(g.p1.hp < before, `ยืนบนชั้นบนสุดก็ยังโดนไหที่อยู่แนวเดียวกัน (${before} -> ${g.p1.hp})`);
  }

  // ── ทางหนีคือ "ลอยอยู่กลางอากาศ" ไม่ใช่ "ขึ้นที่สูง" ──
  {
    const g = mk(300);
    g.boxes.push({ x: g.p1.x, owner: 'p2', fuse: 200, arm: 0 });
    g.p1.onGround = false; g.p1.y = STAGE.groundY - 120;
    const before = g.p1.hp;
    run(g, 6, () => inp());
    ok(g.p1.hp === before, "ลอยอยู่ไม่โดน — จังหวะกระโดดคือทางหนีจริงของท่านี้");
  }
}

// ══ ความครอบคลุมของฝน — เส้นแบ่งอยู่ที่ 2 ชั้น ══════════════════════════════════
//
// ไม่ได้ออกแบบมา แต่โผล่ออกมาจากตัวเลขเอง แล้วกลายเป็นของดี:
//   โรงว่าง (4 ไห)  ห่างกัน 300px วงระเบิดกว้าง 216px -> เหลือช่องยืนได้ 84px
//   2 ชั้น (6 ไห)   ห่างกัน 200px -> วงทับกันหมด ไม่มีที่ยืน กระโดดอย่างเดียว
//
// แปลว่า **2 ชั้นคือจุดที่อัลติเปลี่ยนจาก "หลบได้ด้วยการยืนถูกที่" เป็น "ต้องกระโดด"**
// ล็อกไว้เพราะถ้าวันหลังมีคนจูน BOX_HALF หรือ RAIN_BASE เส้นนี้จะเลื่อนแบบเงียบ ๆ
{
  const span = STAGE.wallR - STAGE.wallL;
  const gapFor = (n) => span / n;                  // ระยะห่างระหว่างไหสองใบที่ติดกัน
  const src = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");
  const half = +(src.match(/const BOX_HALF = (\d+)/)?.[1] ?? 0);
  const base = +(src.match(/const RAIN_BASE = (\d+)/)?.[1] ?? 0);

  ok(gapFor(base) > half * 2,
    `โรงว่าง (${base} ไห) ยังมีช่องให้ยืน — อัลติที่ไม่ได้เตรียมมาไม่ควรปิดทางหนีทั้งหมด`);
  ok(gapFor(base + 2) <= half * 2,
    `2 ชั้น (${base + 2} ไห) ปิดพื้นสนิท — ต้องกระโดดอย่างเดียว`);
  for (let h = 2; h <= 5; h++)
    ok(gapFor(base + h) <= half * 2, `${h} ชั้น (${base + h} ไห) ยังปิดสนิทอยู่`);
}
