// ทดสอบ EYE (chronos) — "หมัดมาช้ากว่าเสียง" · ควันค้างที่ระเบิดทีหลัง
// รัน: node tools/tests/eye.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์เป็น eye เพราะเป็นชื่อที่โชว์ ส่วน `id` ในซิมเป็น 'chronos' ซึ่งห้ามเปลี่ยน
import fs from "fs";
import "./phaser_stub.mjs";
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, Fighter, CHARACTERS, STAGE } = await import(G + "/core.js");
const { ScrambleScene } = await import(G + "/ScrambleScene.js");

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
  ok(!CHARACTERS.chronos.artPending, "อาร์ตมาแล้ว ไม่ได้วาดเป็นกล่องอีกต่อไป");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url).pathname, "utf8");
  ok(/chronos:\s*\{[\s\S]{0,200}?atlasKey: 'scchronos'/.test(scene), "ฝั่งวาดชี้ไปอัตลาสจริง");

  // ── ทุกเฟรมที่ฉากจะขอ ต้องมีอยู่ในอัตลาสจริง ──
  //
  // Phaser **ไม่ throw เมื่อหาเฟรมไม่เจอ** มันเตือนใน console แล้วคืนเฟรมแรกของอัตลาสมาแทน
  // ท่าที่ขาดจึงกลายเป็นท่ายืนเงียบ ๆ ซึ่งดูเหมือน "แอนิเมชันไม่เล่น" ไม่ใช่ "เฟรมหาย"
  const atlas = JSON.parse(fs.readFileSync(
    new URL("../../assets/characters/scramble_chronos.json", import.meta.url).pathname, "utf8"));
  const have = new Set(Object.keys(atlas.frames));
  const art = scene.slice(scene.indexOf("chronos: {"), scene.indexOf("chronos: {") + 1400);
  const anims = [...art.matchAll(/(\w+): (\d+)/g)].filter(([, k]) => !["runStride"].includes(k));
  const want = [];
  for (const [, k, n] of anims) for (let i = 1; i <= Number(n); i++) want.push(`${k}_${i}.png`);
  for (const id of Object.keys(CHARACTERS.chronos.moves)) for (let i = 1; i <= 3; i++) want.push(`${id}_${i}.png`);
  const missing = want.filter((f) => !have.has(f));
  ok(missing.length === 0, `อัตลาสมีครบทุกเฟรมที่ฉากขอ (ขาด ${missing.length}: ${missing.slice(0, 5).join(" ")})`);
  ok(have.size === want.length, `ไม่มีเฟรมเกินที่ไม่มีใครเรียก (มี ${have.size} ขอ ${want.length})`);

  // อัตลาสเกิน 4096 px แล้วการ์ดจอวาดเป็นสีดำ **โดยไม่มี error** — บทเรียนเดิมของทุกตัวในเกม
  ok(atlas.meta.size.w <= 4096 && atlas.meta.size.h <= 4096,
    `อัตลาสไม่เกินลิมิตการ์ดจอ (${atlas.meta.size.w}x${atlas.meta.size.h})`);
  const sk = CHARACTERS.chronos.skills;
  ok(sk.length === 3 && sk.every((id) => CHARACTERS.chronos.moves[id]),
    `สกิลสามช่องชี้ไปท่าที่มีจริงครบ (${sk.join(", ")})`);
}

// ══ ควันเป็นของสกิลเท่านั้น ไม้ปกติห้ามทิ้งควัน ═════════════════════════════
//
// เคยใส่ควันไว้ทุกไม้ เล่นจริงแล้ว**รำคาญ** ตีธรรมดาทีเดียวก็มีระเบิดตามมาทุกครั้ง
// จนอ่านไม่ออกว่าอันไหนสกิลอันไหนไม้ปกติ · ควันย้ายไปอยู่กับสกิลอย่างเดียว
{
  const NORMALS = ["jab1", "jab2", "jab3", "jab4", "side", "up", "down", "nair", "sair", "dair"];
  const mv = CHARACTERS.chronos.moves;
  const leak = NORMALS.filter((k) => mv[k]?.puff);
  ok(leak.length === 0, `ไม้ปกติไม่มี puff สักไม้ (เจอ ${leak.join(", ") || "ไม่เจอ"})`);
  const smokers = Object.keys(mv).filter((k) => mv[k].puff);
  ok(smokers.length > 0 && smokers.every((k) => CHARACTERS.chronos.skills.includes(k)
      || mv[k].label === "Hazeflurry"),
    `ไม้ที่ทิ้งควันเป็นสกิลล้วน (${smokers.join(", ")})`);

  // ไม่ใช่แค่ดูโครงสร้าง — รัวปุ่มตีจริงทั้งชุดแย็บแล้วต้องไม่มีควันหลุดมาสักก้อน
  const g = mk();
  let dropped = 0;
  for (let f = 1; f < 160; f++) {
    g.step(inp(f % 10 === 1 ? { attack: 1, p: { attack: 1 } } : {}), null);
    for (const e of g.events) if (e.type === "puffDrop") dropped++;
  }
  ok(dropped === 0, `รัวแย็บ 160 เฟรมแล้วไม่มีควันหลุดมาเลย (เจอ ${dropped} ก้อน)`);
}

// ══ ควันค้าง: ทิ้งตอนไม้ออก ระเบิดทีหลัง ไม่ใช่ตอนตีโดน ═══════════════════════
//
// **นี่คือทั้งหมดของตัวนี้** ถ้าควันลงพร้อมหมัด เธอก็เป็นแค่ตัวที่ดาเมจสูงกว่าชาวบ้าน
// สิ่งที่ทำให้เธอต่างคือ "เธอหยุดรัวแล้วแรงกดดันยังไม่หยุด"
{
  // วัดด้วยอัลติที่ยิงจากระยะไกล **ให้ตีไม่โดนอะไรเลย**
  // ถ้าวัดตอนไม้เข้าเป้า คนตีจะติด hitstop ด้วย แล้ว moveF ค้าง = ควันลงช้ากว่าจริง
  // (วัดแล้ว: snap1 ที่ตั้ง at 9 ไว้ในช่วงกรอบชนเปิด ตอนโดนเป้าควันเลื่อนไปลงเฟรม 20)
  const g = mk(600);
  g.p1.ki = 100;
  let dropped = -1, popped = -1;
  for (let f = 1; f < 90; f++) {
    g.step(inp(f === 1 ? { skill3: 1, p: { skill3: 1 } } : {}), null);
    for (const e of g.events) {
      if (e.type === "puffDrop" && dropped < 0) dropped = f;
      if (e.type === "puffPop" && popped < 0) popped = f;
    }
  }
  ok(dropped > 0, `สกิลทิ้งควันจริง (เฟรม ${dropped})`);
  ok(popped > dropped, `แล้วระเบิดทีหลัง ไม่ใช่พร้อมกัน (ทิ้ง ${dropped} -> ระเบิด ${popped})`);
  ok(popped - dropped >= 18 && popped - dropped <= 22,
    `หน่วงราว 20 เฟรม (ได้ ${popped - dropped})`);
}

// ══ gimmick สูบ joint: ไม้จบของชุดรัวเร่งควันที่ค้างอยู่ให้ลงพร้อมกัน ══════════
//
// **ยิ่งรัวนาน ยิ่งมีควันค้างเยอะ ยิ่งจบแล้วลงหนัก** คนเล่นจึงมีคำถามจริงให้ตอบทุกครั้ง
// ไม่ต้องใช้ปุ่มใหม่ — ปุ่มในเกมเต็มแล้ว และเพิ่มปุ่มแปลว่าต้องแก้รูปแบบสายข้อมูลของ netplay
{
  const run1 = (mash) => {
    const g = mk();
    let n = -1, drags = 0;
    g.step(inp({ skill1: 1, p: { skill1: 1 } }), null);
    for (let f = 1; f < 220; f++) {
      g.step(inp(mash && f % 3 === 0 ? { attack: 1, p: { attack: 1 } } : {}), null);
      for (const e of g.events) if (e.type === "drag") { drags++; n = e.n; }
    }
    return { n, drags };
  };
  const plain = run1(false), long = run1(true);
  ok(plain.drags === 1, `รัวจบหนึ่งชุด = สูบหนึ่งที (${plain.drags})`);
  ok(plain.n >= 1, `และมีควันค้างให้เร่งลงจริง (${plain.n} ก้อน)`);
  ok(long.n > plain.n, `รัวยาวกว่าได้เก็บเยอะกว่า (${plain.n} -> ${long.n} ก้อน)`);

  // ── เร่งเฉพาะควันของตัวเอง ไม่ใช่ของทุกคนบนเวที ──
  //
  // ตอนม่านควันเปิด หมัดของคู่ต่อสู้ก็ทิ้งควัน — เธอสูบของเธอ ไม่ได้สูบของคนอื่น
  const g = mk();
  g.puffs.push({ x: g.p1.x, y: g.p1.y - 90, owner: "p2", team: 1, life: 40, n: 99 });
  g.puffs.push({ x: g.p1.x, y: g.p1.y - 90, owner: "p1", team: 0, life: 40, n: 98 });
  g.takeDrag(g.p1);
  const mine = g.puffs.find((p) => p.owner === "p1"), theirs = g.puffs.find((p) => p.owner === "p2");
  ok(mine.life === 1, `ควันของเธอถูกเร่ง (life ${mine.life})`);
  ok(theirs.life === 40, `ควันของคู่ต่อสู้ไม่ขยับ (life ${theirs.life})`);

  // ── `at` ของการสูบต้องอยู่ในช่วงเงื้อ ไม่ใช่ช่วงที่กรอบชนเปิด ──
  //
  // 🔴 ข้อนี้คือบั๊กที่เพิ่งเจอ: ตอนไม้เข้าเป้า คนตีก็ติด hitstop ด้วย แล้ว advanceMove
  // ถูกข้ามทั้งบล็อก `moveF` จึงค้างอยู่ที่เลขเดิมหลายเฟรมแล้วท่าจบไปเลย
  // ตั้ง at ไว้หลังช่วงเงื้อ = โค้ดบรรทัดนั้น**ไม่เคยทำงานสักครั้ง**ตอนตีโดน
  // (วัดแล้ว: at 8 กับ startup 6 -> moveF ค้างที่ 6 อยู่ 12 เฟรม ไม่เคยถึง 8)
  const he = CHARACTERS.chronos.moves.hazeEnd;
  ok(he.drag.at < he.startup,
    `สูบตอนเงื้อ ไม่ใช่ตอนกรอบชนเปิด (at ${he.drag.at} < startup ${he.startup})`);
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
  // ควันของชุดรัวฟิวส์ยาวกว่าปกติ ฝั่งวาดจึงต้องอ่านอายุจากอีเวนต์ ไม่ใช่ใช้ค่าคงที่อย่างเดียว
  // ไม่งั้นควันฟิวส์ยาวจะหายไปจากจอตั้งแต่ยังไม่ระเบิด แล้วคนเล่นลืมว่ามันค้างอยู่
  ok(/const fuse = e\.life \?\? PUFF_FX_LIFE/.test(scene), "อายุควันบนจออ่านจากฟิวส์จริงของก้อนนั้น");
  ok(/n: this\.puffN, life \}/.test(core), "และซิมส่งฟิวส์ไปกับอีเวนต์");
  for (const ev of ["drag"]) ok(new RegExp(`e\\.type === '${ev}'`).test(scene), `มีตัววาดของ ${ev}`);
  ok(/_jointSmoke\(\)/.test(scene), "มีควันลอยจากมวนตอนเธออยู่เฉย ๆ");
}

// ══ ควันตามไม้: ทุกท่าโจมตี ไม่ใช่เฉพาะสกิล ═════════════════════════════════
//
// 🔴 ครั้งแรกแขวนไว้ในทางวาดสไปรท์ (ข้าง slashFor) แล้ว **ควันไม่เคยออกสักครั้ง**
// เพราะทางนั้นคืนค่าออกก่อนสำหรับตัวที่ยัง artPending (วาดเป็นกล่อง ไม่เดินไปถึงโค้ดรอยฟาด)
// เทสต์เขียวหมด เห็นก็ต่อเมื่อเปิดดูของจริงบนจอ — ข้อนี้คือตาข่ายกันไม่ให้ย้ายกลับไปที่นั่น
{
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url).pathname, "utf8");
  ok(/_attackSmoke\(\);/.test(scene) && /_ageFx\(\) \{[\s\S]{0,400}_attackSmoke\(\)/.test(scene),
    "ควันตามไม้ถูกเรียกจากรอบวาดทุกเฟรม");
  const rigBlock = scene.slice(scene.indexOf("rig.lastSlash = tag;"), scene.indexOf("rig.lastSlash = tag;") + 200);
  ok(!/_smokeFor/.test(rigBlock),
    "**ไม่ได้แขวนไว้ในทางวาดสไปรท์** ซึ่งตัวที่ยังไม่มีอาร์ตเดินไปไม่ถึง");

  // ขนาดควันต้องยึดกรอบชนจริง ไม่ใช่เลขตายตัว — ควันที่ใหญ่กว่าที่กินจริงคือการโกหกระยะ
  const sf = scene.slice(scene.indexOf("_smokeFor(f) {"), scene.indexOf("_smokeFor(f) {") + 2600);
  ok(/hb\.w \/ \d+/.test(sf), "ขนาดควันคิดจากความกว้าง hitbox จริง");
  ok(!/scale: 0\.[0-9]+,\s*life: 1[0-9] \+ \(i % 6\)/.test(sf), "ไม่ใช่สเกลตายตัวของก้อนหลัก");

  // ── พฤติกรรมจริง: ออกครั้งเดียวต่อไม้ · เฉพาะ EYE · เฉพาะช่วง active ──
  const mkStub = () => {
    const sc = { emitted: 0, sim: null };
    for (const k of Object.getOwnPropertyNames(ScrambleScene.prototype))
      if (typeof ScrambleScene.prototype[k] === "function" && k !== "constructor") sc[k] = ScrambleScene.prototype[k];
    sc.emit = function () { this.emitted++; };
    return sc;
  };
  const fighter = (char, phase) => ({
    id: "p1", char, x: 400, y: 500, facing: 1, onGround: true, state: "attack",
    moveId: "jab1", move: {}, used: new Set(),
    phase: () => phase, hitbox: () => ({ x: 420, y: 420, w: 100, h: 60 }),
  });

  const a = mkStub();
  a.sim = { fighters: [fighter("chronos", "active")] };
  a._attackSmoke();
  ok(a.emitted > 0, `EYE ออกท่าแล้วมีควัน (${a.emitted} อนุภาค)`);
  const once = a.emitted;
  a._attackSmoke(); a._attackSmoke();
  ok(a.emitted === once, `เรียกซ้ำในไม้เดิมไม่ปล่อยเพิ่ม (${a.emitted}/${once})`);

  const b = mkStub();
  b.sim = { fighters: [fighter("chronos", "startup")] };
  b._attackSmoke();
  ok(b.emitted === 0, "ช่วงเงื้อยังไม่มีควัน — ออกตอนกรอบชนเปิดเท่านั้น");

  const c = mkStub();
  c.sim = { fighters: [fighter("helios", "active")] };
  c._attackSmoke();
  ok(c.emitted === 0, "ตัวอื่นไม่ได้ควันติดมาด้วย");

  // กรอบใหญ่ขึ้น = ควันเยอะขึ้น (ไม้หนักต้องดูหนักกว่า)
  const big = mkStub();
  const bf = fighter("chronos", "active");
  bf.hitbox = () => ({ x: 400, y: 380, w: 240, h: 180 });
  big.sim = { fighters: [bf] };
  big._attackSmoke();
  ok(big.emitted > once, `ไม้ที่กรอบใหญ่กว่าได้ควันเยอะกว่า (${once} -> ${big.emitted})`);
}

// ══ สกิล 2: วาร์ปล็อกเป้า — ไปถึงคนที่ใกล้ที่สุดเสมอ แล้วถูกดึงกลับที่เดิม ═══════
//
// ที่ยอมให้วาร์ปไม่จำกัดระยะได้เพราะท่านี้ติด `rewind`: เข้าไปต่อยแล้วกลับที่เดิมเสมอ
// ได้ "จังหวะเข้า" อย่างเดียว ไม่ได้พื้นที่ฟรี
//
// 🔴 ลำดับใน startMove สำคัญ: ต้องจำที่ยืน **ก่อน** วาร์ป
// เดิมบรรทัด rewindX อยู่ล่างสุด = จำตำแหน่งหลังวาร์ป แล้ว "เด้งกลับ" ไปที่เดิมที่เพิ่งไปถึง
// ซึ่งอ่านเหมือนไม่มี rewind เลย และไม่มีอะไรฟ้อง
{
  for (const gap of [120, 400, 760]) {
    const g = mk(gap);
    const start = g.p1.x, foeX = g.p2.x;
    let warpX = null, landed = null;
    for (let f = 0; f < 120; f++) {
      g.step(inp(f === 0 ? { skill2: 1, p: { skill2: 1 } } : {}), null);
      if (f === 0) warpX = g.p1.x;
      if (f > 2 && g.p1.moveId !== "snap1" && landed === null) { landed = g.p1.x; break; }
    }
    ok(Math.abs(warpX - foeX) < 80, `ห่าง ${gap}: วาร์ปไปติดตัวเป้า (เหลือ ${Math.abs(warpX - foeX).toFixed(0)} px)`);
    ok(Math.abs(landed - start) < 2, `  แล้วเด้งกลับที่เดิม (${landed?.toFixed(0)} เทียบ ${start})`);
  }
  // เลือกคนที่ใกล้ที่สุด **ในทีมตรงข้าม** ไม่ใช่คนที่ใกล้ที่สุดเฉย ๆ
  const g = mk();
  g.fighters = [
    new Fighter("p1", "A", 500, 1, "chronos", 0),
    new Fighter("p2", "B", 1100, -1, "nyx", 1),     // ศัตรูไกล — อยู่ก่อนในลิสต์
    new Fighter("p3", "C", 300, 1, "atlas", 0),     // เพื่อนร่วมทีม — ใกล้ที่สุดจริง
    new Fighter("p4", "D", 700, -1, "helios", 1),   // ศัตรูที่ใกล้ที่สุด
  ];
  for (const f of g.fighters) { f.x = f.spawnX; f.y = STAGE.groundY; f.ai = false; }
  const [a, , c, d] = g.fighters;
  g.lockWarp(a);
  ok(Math.abs(a.x - d.x) < 80, `2v2: ไปหาศัตรูที่ใกล้ที่สุด (ห่าง ${Math.abs(a.x - d.x).toFixed(0)})`);
  ok(Math.abs(a.x - c.x) > 150, "ไม่ไปหาเพื่อนร่วมทีมที่ใกล้กว่า");
}

// ══ สกิล 3: ลำควันพาดทั้งจอ ทะลุคน ไม่โดนเพื่อน ═══════════════════════════════
//
// 🔴 shotAt ต้องอยู่ในช่วงเงื้อ กับดักเดียวกับ puff.at เป๊ะ
// `fireShots` อยู่ใน advanceMove ซึ่งถูกข้ามตอนติด hitstop — ตั้งไว้ในช่วงกรอบชนเปิด
// แล้วยืนติดตัวกดอัลติ ไม้ประชิดจะโดนก่อน moveF ค้าง **ลำไม่ออกเลยทั้งที่เสียหลอดเต็ม**
{
  const v = CHARACTERS.chronos.moves.veil1;
  ok(v.shotAt < v.startup, `shotAt (${v.shotAt}) อยู่ในช่วงเงื้อ (startup ${v.startup})`);
  ok(v.pierce === true, "ลำทะลุคน ไม่หยุดที่คนแรก");

  // ยืนติดตัวเลย = ไม้ประชิดโดนแน่ ๆ = ติด hitstop แน่ ๆ ลำยังต้องออก
  for (const [name, gap] of [["ยืนติดตัว", 60], ["ยืนห่าง", 600]]) {
    const g = mk(gap);
    g.p1.ki = 100;
    let n = 0, reach = 0;
    for (let f = 0; f < 200; f++) {
      g.step(inp(f === 0 ? { skill3: 1, p: { skill3: 1 } } : {}), null);
      n = Math.max(n, g.shots.length);
      for (const sh of g.shots) reach = Math.max(reach, Math.abs(sh.x - g.p1.spawnX));
    }
    ok(n === 6, `${name}: ลำออกครบหกนัด (ได้ ${n})`);
    ok(reach > 700, `${name}: ลำพาดไปไกล ${reach.toFixed(0)} px`);
  }

  // ทะลุคนแรกไปโดนคนที่สอง และผ่านเพื่อนร่วมทีมโดยไม่โดน
  const g = mk();
  g.fighters = [
    new Fighter("p1", "A", 300, 1, "chronos", 0),
    new Fighter("p2", "B", 700, -1, "nyx", 1),
    new Fighter("p3", "C", 500, 1, "atlas", 0),     // เพื่อนยืนขวางแนวลำ
    new Fighter("p4", "D", 1000, -1, "helios", 1),
  ];
  for (const f of g.fighters) { f.x = f.spawnX; f.y = STAGE.groundY; f.ai = false; }
  const [a, b, c, d] = g.fighters;
  a.ki = 100; a.facing = 1;
  const hp0 = g.fighters.map((f) => f.hp), lo = g.fighters.map((f) => f.hp);
  for (let f = 0; f < 200; f++) {
    g.step(f === 0 ? inp({ skill3: 1, p: { skill3: 1 } }) : inp(), inp(), inp(), inp());
    g.fighters.forEach((f2, j) => { lo[j] = Math.min(lo[j], f2.hp); });
  }
  ok(hp0[1] - lo[1] > 0, `ลำโดนศัตรูคนแรก (${hp0[1] - lo[1]})`);
  ok(hp0[3] - lo[3] > 0, `ทะลุไปโดนศัตรูคนที่สองด้วย (${hp0[3] - lo[3]})`);
  ok(hp0[2] - lo[2] === 0, "เพื่อนร่วมทีมที่ยืนขวางแนวลำไม่โดน");
  ok(hp0[0] - lo[0] === 0, "ตัวเองไม่โดนลำตัวเอง");
}

// ══ jab4: ไม้จบชุดแย็บ ต่อเองด้วยการกดตีซ้ำ ไม่ใช่ต่อให้อัตโนมัติ ═══════════════
{
  const mv = CHARACTERS.chronos.moves;
  ok(mv.jab3.chain === "jab4", "jab3 ต่อไป jab4 ได้");
  ok(!mv.jab4.chain && !mv.jab4.autoChain, "jab4 เป็นไม้สุดท้าย ไม่ต่อไปไหนอีก");
  ok(mv.jab4.dmg > mv.jab3.dmg, `jab4 แรงกว่า jab3 (${mv.jab4.dmg} > ${mv.jab3.dmg})`);
  ok(mv.jab4.startup > mv.jab3.startup, `แต่ช้ากว่า (เงื้อ ${mv.jab4.startup} > ${mv.jab3.startup})`);

  // กดตีรัวแล้วต้องเดินถึง jab4 จริง ไม่ใช่แค่ประกาศไว้ในตาราง
  const g = mk();
  const seen = new Set();
  for (let f = 1; f < 200; f++) {
    g.step(inp(f % 9 === 1 ? { attack: 1, p: { attack: 1 } } : {}), null);
    if (g.p1.moveId) seen.add(g.p1.moveId);
  }
  ok(seen.has("jab4"), `กดตีซ้ำแล้วต่อถึง jab4 จริง (เห็น ${[...seen].join(" ")})`);
}
