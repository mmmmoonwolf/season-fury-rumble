// ทดสอบ EYE (chronos) — "หมัดมาช้ากว่าเสียง" · ควันค้างที่ระเบิดทีหลัง
// รัน: node tools/tests/eye.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์เป็น eye เพราะเป็นชื่อที่โชว์ ส่วน `id` ในซิมเป็น 'chronos' ซึ่งห้ามเปลี่ยน
import fs from "fs";
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, STAGE } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 70, foe = "nyx") => {
  const g = new Game();
  g.p1.char = "chronos"; g.p2.char = foe;
  g.p1.ai = g.p2.ai = false;
  g.p2.x = g.p1.x + gap;
  return g;
};
/** เดินไปข้างหน้า n เฟรม คืนเลือดต่ำสุดที่อีกฝั่งเคยลงไปถึง
 *  (โหมดซ้อมฟื้นเลือดให้หุ่นเองหลัง 120 เฟรมที่ไม่โดนตี — อ่าน hp ตอนจบจะได้ 0 เสมอ) */
const run = (g, n, press = () => ({})) => {
  let lo = g.p2.hp;
  for (let i = 0; i < n; i++) { g.step(inp(press(i)), null); lo = Math.min(lo, g.p2.hp); }
  return lo;
};

// ── อยู่ในโรสเตอร์จริง และ id ห้ามเปลี่ยน ──
{
  ok(!!CHARACTERS.chronos, "EYE อยู่ในรายชื่อตัวละคร");
  ok(CHARACTERS.chronos.id === "chronos" && CHARACTERS.chronos.label === "EYE",
    `id=${CHARACTERS.chronos.id} label=${CHARACTERS.chronos.label}`);
  ok(CHARACTERS.chronos.artPending === true, "ติดธงว่ายังไม่มีอาร์ต วาดเป็นกล่องไปก่อน");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url).pathname, "utf8");
  ok(/chronos:\s*\{[\s\S]{0,400}?artPending:\s*true/.test(scene), "ฝั่งวาดก็รู้ว่ายังไม่มีอาร์ต");
  const sk = CHARACTERS.chronos.skills;
  ok(sk.length === 3 && sk.every((id) => CHARACTERS.chronos.moves[id]),
    `สกิลสามช่องชี้ไปท่าที่มีจริงครบ (${sk.join(", ")})`);
}

// ══ ควันค้าง: ทิ้งตอนไม้ออก ระเบิดทีหลัง ไม่ใช่ตอนตีโดน ═══════════════════════
//
// **นี่คือทั้งหมดของตัวนี้** ถ้าควันลงพร้อมหมัด เธอก็เป็นแค่ตัวที่ดาเมจสูงกว่าชาวบ้าน
// สิ่งที่ทำให้เธอต่างคือ "เธอหยุดรัวแล้วแรงกดดันยังไม่หยุด"
{
  const g = mk();
  g.step(inp({ skill1: 1, p: { skill1: 1 } }), null);
  let dropped = -1, popped = -1;
  for (let f = 1; f < 90; f++) {
    g.step(inp(), null);
    for (const e of g.events) {
      if (e.type === "puffDrop" && dropped < 0) dropped = f;
      if (e.type === "puffPop" && popped < 0) popped = f;
    }
  }
  ok(dropped > 0, `ทิ้งควันจริงตอนรัว (เฟรม ${dropped})`);
  ok(popped > dropped, `แล้วระเบิดทีหลัง ไม่ใช่พร้อมกัน (ทิ้ง ${dropped} -> ระเบิด ${popped})`);
  ok(popped - dropped >= 18 && popped - dropped <= 22,
    `หน่วงราว 20 เฟรม (ได้ ${popped - dropped})`);
}

// ── ทิ้งควันแม้อีกฝั่งกันไว้ได้ — แรงกดดันต้องเดินต่อ ──
//
// ถ้าผูกกับการตีโดน มันจะกลายเป็นแค่ดาเมจเพิ่มของคอมโบที่ติดอยู่แล้ว ซึ่งไม่ได้เพิ่มอะไรให้เกม
{
  const g = mk();
  g.p2.setState("block");
  g.step(inp({ skill1: 1, p: { skill1: 1 } }), null);
  let n = 0;
  for (let f = 0; f < 60; f++) {
    g.step(inp(), inp({ block: 1 }));
    for (const e of g.events) if (e.type === "puffDrop") n++;
  }
  ok(n > 0, `อีกฝั่งกันไว้ตลอดก็ยังทิ้งควัน (${n} ก้อน)`);
}

// ── ควันไม่โดนพวกเดียวกัน (กติกาเดียวกับกองไฟ) ──
{
  const g = new Game();
  g.setRoster(4);
  g.fighters.forEach((f) => { f.ai = false; });
  const [a, b, c] = g.fighters;              // ทีม 0 = a,c · ทีม 1 = b,d
  a.char = "chronos";
  // วางควันไว้ตรงกลางแล้วให้ทุกคนมายืนตรงนั้น วัดเฉพาะเรื่อง "โดนหรือไม่โดน"
  g.puffs.push({ x: a.x, y: a.y - 90, owner: a.id, team: a.team, life: 1, n: 0 });
  for (const f of g.fighters) { f.x = a.x; f.y = a.y; }
  const hp = g.fighters.map((f) => f.hp);
  g.updatePuffs();
  ok(g.fighters[1].hp < hp[1] && g.fighters[3].hp < hp[3], "ฝั่งตรงข้ามโดนทั้งสองคน");
  ok(g.fighters[0].hp === hp[0], "คนวางไม่โดนของตัวเอง");
  ok(c.hp === hp[2], "และเพื่อนร่วมทีมก็ไม่โดน");
}

// ══ ต่อยแล้วย้อน: ไปข้างหน้าจริง แล้วกลับมาที่เดิมเป๊ะ ═══════════════════════
//
// นี่คือไม้ที่ทำให้คอมโบของเธอเป็นวง ไม่ใช่เส้นตรง — มันคืนระยะให้เธอ
{
  const g = mk(120);
  const x0 = g.p1.x;
  g.step(inp({ skill2: 1, p: { skill2: 1 } }), null);
  let far = x0, back = null;
  for (let f = 0; f < 80; f++) {
    g.step(inp(), null);
    far = Math.max(far, g.p1.x);
    for (const e of g.events) if (e.type === "rewind") back = g.p1.x;
  }
  ok(far > x0 + 80, `พุ่งไปข้างหน้าจริง (${(far - x0).toFixed(0)} px)`);
  ok(back !== null, "ปล่อยอีเวนต์ย้อนกลับให้ฝั่งวาดด้วย");
  ok(Math.abs(g.p1.x - x0) < 1, `แล้วกลับมาที่เดิมเป๊ะ (คลาดไป ${Math.abs(g.p1.x - x0).toFixed(2)} px)`);
  ok(g.p1.vx === 0, "หยุดนิ่งตรงที่เดิม ไม่ใช่ถูกเหวี่ยงกลับจนคุมต่อไม่ได้");

  // ── ย้อนแล้วต้องไม่ทะลุกำแพง ──
  const w = mk(120);
  w.p1.x = STAGE.wallR - 30;
  w.step(inp({ skill2: 1, p: { skill2: 1 } }), null);
  for (let f = 0; f < 80; f++) w.step(inp(), null);
  ok(w.p1.x <= STAGE.wallR && w.p1.x >= STAGE.wallL,
    `ย้อนกลับแล้วยังอยู่ในเวที (x=${w.p1.x.toFixed(0)} กำแพง ${STAGE.wallL}-${STAGE.wallR})`);

  // ── และปลดชุดรัวออกจาก used ให้เริ่มใหม่ได้ — ที่มาของคำว่า "คอมโบเป็นวง" ──
  ok((CHARACTERS.chronos.moves.snap1.refresh ?? []).includes("haze1"),
    "ปลดชุดรัวออกจาก used ให้กดซ้ำได้ในคอมโบเดียว");
}

// ══ ม่านควัน: หมัดของ **ทุกคน** ทิ้งควัน ไม่ใช่แค่ของเธอ ═══════════════════════
//
// อัลติไม่ได้บัฟเธอ มันเปลี่ยนกติกาของทั้งเวที — นี่คือมุกทั้งหมดของสกิลนี้
// ถ้าทำเป็นบัฟของเธออย่างเดียว มันก็เป็นแค่ "ดาเมจเพิ่ม 5 วินาที" เหมือนอัลติทั่วไป
{
  const g = mk(70);
  g.p1.ki = 100;
  ok(g.haze === 0, "ปกติไม่มีม่านควัน");
  g.step(inp({ skill3: 1, p: { skill3: 1 } }), null);
  ok(g.haze > 0, `กดอัลติแล้วม่านควันเปิด (${g.haze} เฟรม)`);
  ok(g.events.some((e) => e.type === "hazeOn"), "และบอกฝั่งวาดให้เปิดม่าน");

  // หมัดของ **คู่ต่อสู้** ก็ต้องทิ้งควัน และควันก้อนนั้นเป็นของเขา (ไว้โดนเธอ)
  for (let f = 0; f < 60; f++) g.step(inp(), null);
  g.p1.setState("idle"); g.p1.move = null; g.p1.stun = 0;
  g.p2.setState("idle"); g.p2.move = null; g.p2.stun = 0;
  g.p2.x = g.p1.x + 55; g.p2.facing = -1;
  const before = g.puffs.length;
  g.step(null, inp({ attack: 1, p: { attack: 1 } }));
  for (let f = 0; f < 8; f++) g.step(null, inp());
  const added = g.puffs.length - before;
  ok(added > 0, `คู่ต่อสู้ตีตอนม่านควันแล้วทิ้งควันด้วย (${added} ก้อน)`);
  ok(g.puffs.at(-1)?.owner === "p2",
    `และควันก้อนนั้นเป็นของเขา ไม่ใช่ของเธอ (owner=${g.puffs.at(-1)?.owner})`);

  // หมดเวลาแล้วต้องหยุด ไม่ใช่ติดไปตลอดแมตช์
  const h = mk(70); h.p1.ki = 100;
  h.step(inp({ skill3: 1, p: { skill3: 1 } }), null);
  for (let f = 0; f < 400; f++) h.step(inp(), null);
  ok(h.haze === 0, `ครบเวลาแล้วม่านควันปิดเอง (เหลือ ${h.haze})`);
}

// ── ควันไม่หลุดไปอยู่กับตัวอื่น ──
//
// puffs/haze เป็นของเวที ไม่ใช่ของเธอ — แมตช์ที่ไม่มี EYE เลยต้องไม่มีควันโผล่มาสักก้อน
{
  const g = new Game();
  g.p1.char = "helios"; g.p2.char = "nyx"; g.p1.ai = g.p2.ai = false;
  let n = 0;
  for (let f = 0; f < 200; f++) {
    g.step(inp(f % 7 === 0 ? { attack: 1, p: { attack: 1 } } : {}), null);
    for (const e of g.events) if (e.type === "puffDrop" || e.type === "puffPop") n++;
  }
  ok(n === 0 && g.puffs.length === 0 && g.haze === 0,
    `แมตช์ที่ไม่มี EYE ไม่มีควันเลย (อีเวนต์ ${n} · ค้าง ${g.puffs.length})`);
}

// ── สองเครื่องต้องได้ควันชุดเดียวกันเป๊ะ (ควันอยู่ในซิม ไม่ใช่เอฟเฟค) ──
{
  const a = mk(70), b = mk(70);
  a.p1.ki = b.p1.ki = 100;
  const script = (f) => f === 0 ? { skill3: 1, p: { skill3: 1 } }
    : f % 11 === 0 ? { attack: 1, p: { attack: 1 } }
    : f % 5 === 0 ? { right: 1, run: 1 } : {};
  for (let f = 0; f < 240; f++) { a.step(inp(script(f)), null); b.step(inp(script(f)), null); }
  const snap = (g) => g.puffs.map((p) => `${Math.round(p.x)},${Math.round(p.y)},${p.life},${p.owner}`).join("|")
    + `#${g.haze}#${g.p2.hp}`;
  ok(snap(a) === snap(b), "เดินสคริปต์เดียวกันสองครั้งได้ควันเหมือนกันเป๊ะ (ไม่มีอะไรสุ่มในเส้นทางนี้)");
}

// ── ฝั่งวาด: ควันต้องมีตัววาดครบทุกอีเวนต์ และหน่วงต้องตรงกับซิม ──
{
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url).pathname, "utf8");
  const core = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url).pathname, "utf8");
  for (const ev of ["puffDrop", "puffPop", "hazeOn", "rewind"])
    ok(new RegExp(`e\\.type === '${ev}'`).test(scene), `มีตัววาดของ ${ev}`);
  // ควันตั้งต้นต้องอยู่บนจอพอดีกับที่ซิมหน่วงไว้ — ไม่งั้นมันหายไปก่อนระเบิด (หรือค้างหลังระเบิด)
  const simDelay = Number(core.match(/const PUFF_DELAY = (\d+)/)?.[1]);
  const fxLife = Number(scene.match(/const PUFF_FX_LIFE = (\d+)/)?.[1]);
  ok(simDelay > 0 && simDelay === fxLife, `อายุควันบนจอ (${fxLife}) เท่ากับหน่วงในซิม (${simDelay})`);
}
