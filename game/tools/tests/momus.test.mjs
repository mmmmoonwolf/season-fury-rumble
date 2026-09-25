// ทดสอบกลไกเฉพาะตัวของ Momus — กล่องระเบิดที่ไม่เลือกข้าง ดีดนิ้วสลับที่ และอัลติโปรยกล่อง
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

// ── กฎเหล็ก: ระเบิดของเขาโดนตัวเขาเองด้วย ──
//
// นี่คือตัวละครทั้งตัว ถ้าข้อนี้พัง เขากลายเป็นคนวางระเบิดที่ปลอดภัยเสมอ ซึ่งพลาดทั้งคอนเซปต์
// กองไฟของ Alecto เขียนว่า `fire.owner === 'p1' ? this.p2 : this.p1` ซึ่งข้ามเจ้าของไป
// ถ้าลอกมาตรง ๆ จะพลาดตรงนี้พอดี
{
  const g = mk(600);                       // คู่ต่อสู้อยู่ไกลจนไม่เกี่ยวข้อง
  run(g, 1, () => inp({ skill1: 1, p: { skill1: 1 } }));
  run(g, 240, () => inp({ right: 1 }));    // ขว้างแล้วเดินตามไปเหยียบเอง
  ok(g.p1.hp < g.p1.maxHp, `เดินไปเหยียบกล่องตัวเองแล้วเจ็บจริง (${g.p1.hp}/${g.p1.maxHp})`);
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

// ── สกิล 2: ดีดนิ้วสลับที่ ──
{
  const g = mk(220);
  const x1 = g.p1.x, x2 = g.p2.x;
  run(g, 10, (i) => inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}));
  ok(g.p1.x > x1 && g.p2.x < x2, `สลับข้างกันจริง (${Math.round(x1)}/${Math.round(x2)} -> ${Math.round(g.p1.x)}/${Math.round(g.p2.x)})`);
}

// ── สลับที่ต้องแตะแค่ x ห้ามแตะ y/vx/vy ──
// สลับความเร็วด้วยจะเกิดอาการกระตุกและคาดเดาไม่ได้
// วัดว่า "ไม่ได้สลับ y/vy กัน" ไม่ใช่ว่า "y ไม่ขยับเลย" — ฟิสิกส์ยังเดินตามปกติระหว่างนั้น
// สิ่งที่ต้องไม่เกิดคือคนที่ลอยอยู่ไปได้ค่าของคนที่ยืนพื้น (แล้วร่วงทันที) และกลับกัน
{
  const g = mk(220);
  g.p2.y = STAGE.groundY - 160; g.p2.vy = -4; g.p2.onGround = false;
  // ให้เขาอมตะไว้เพื่อกันระเบิดของตัวเองมาดีดเขาลอย — ที่จะวัดคือการสลับ ไม่ใช่แรงระเบิด
  // (ระเบิดดีดเจ้าของด้วยจริง ๆ ซึ่งถูกแล้ว มีเทสต์แยกวัดข้อนั้นอยู่ด้านบน)
  g.p1.invuln = 60;
  const x1 = g.p1.x;
  run(g, 6, (i) => inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}));
  ok(g.p1.x !== x1, "สลับที่เกิดขึ้นจริง");
  ok(!g.p2.onGround && g.p2.y < STAGE.groundY - 100,
    `คนที่ลอยอยู่ยังลอยอยู่ ไม่ได้ถูกยัดลงพื้นแทนอีกฝ่าย (y=${Math.round(g.p2.y)})`);
  ok(g.p1.onGround && g.p1.y === STAGE.groundY,
    `และคนที่ยืนพื้นก็ยังยืนพื้น ไม่ได้ถูกยกขึ้นไปลอยแทน (y=${Math.round(g.p1.y)})`);
}

// ── ห้ามลากคนที่กำลังล้ม/กลิ้งอยู่ ──
// ลากคนที่มี invuln ได้เมื่อไหร่ = จังหวะที่เขาควบคุมตัวเองไม่ได้ถูกใช้ทำร้ายเขา
{
  const g = mk(220);
  g.p2.setState("knockdown"); g.p2.invuln = 40;
  const x2 = g.p2.x;
  run(g, 10, (i) => inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}));
  ok(Math.abs(g.p2.x - x2) < 5, `คนที่กำลังล้มอยู่ไม่ถูกลาก (${Math.round(x2)} -> ${Math.round(g.p2.x)})`);
}

// ── แต่ระเบิดต้องขึ้นทั้งสองจุดเสมอ ต่อให้สลับไม่ได้ ──
// ไม่งั้นกดสกิลใส่คนที่กำลังล้มแล้วไม่เกิดอะไรเลย ซึ่งคนเล่นอ่านไม่ออกว่าทำไม
{
  const g = mk(220);
  g.p2.setState("knockdown"); g.p2.invuln = 40;
  const ev = run(g, 10, (i) => inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}));
  const blasts = ev.filter((e) => e.type === "blast");
  ok(blasts.length === 2, `ระเบิดขึ้นสองจุดถึงแม้สลับไม่ได้ (${blasts.length} จุด)`);
}

// ── สกิล 2 ต้องออกไวที่สุดในเกม — เป็นปุ่มหนีฉุกเฉิน ──
{
  const M = CHARACTERS.momus.moves;
  const starts = Object.values(CHARACTERS)
    .flatMap((c) => c.skills.filter(Boolean).map((k) => c.moves[k].startup));
  ok(M.snap1.startup <= Math.min(...starts),
    `ดีดนิ้วออกไวที่สุดในบรรดาสกิลทั้งเกม (${M.snap1.startup} เฟรม · ต่ำสุดของเกม ${Math.min(...starts)})`);
}

// ── อัลติ: โปรยกล่องทั่วเวที ──
{
  const g = mk(300); g.p1.ki = KI_MAX;
  run(g, 40, (i) => inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}));
  ok(g.boxes.length >= 6, `โปรยกล่องทีเดียวหลายใบ (${g.boxes.length} ใบ)`);
  const xs = g.boxes.map((b) => b.x);
  const span = Math.max(...xs) - Math.min(...xs);
  ok(span > (STAGE.wallR - STAGE.wallL) * 0.7, `กระจายทั่วเวทีจริง (กว้าง ${Math.round(span)} px)`);
  const fuses = g.boxes.map((b) => b.fuse);
  ok(new Set(fuses).size === fuses.length, "ชนวนเหลื่อมกันทุกใบ = ระเบิดไล่กันเป็นทอด ๆ ไม่ใช่ตูมเดียว");
}

// ── อัลติก็ไม่เลือกข้าง เจ้าของโดนด้วย ──
{
  const g = mk(300); g.p1.ki = KI_MAX;
  run(g, 300, (i) => inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}));
  ok(g.p1.hp < g.p1.maxHp, `อัลติของตัวเองก็เจ็บ (${g.p1.hp}/${g.p1.maxHp})`);
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
