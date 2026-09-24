// Orpheus: ไล่หวดติดไฟ · แก่นคือ "ที่ที่เขาเพิ่งอยู่ ยังไหม้อยู่"
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS } = await import(G + "/core.js");
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0, skill1: 0, skill2: 0, skill3: 0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (a, b, gap) => { const g = new Game(); g.p1.char = a; g.p2.char = b;
  g.p1.hp = g.p1.maxHp; g.p2.hp = g.p2.maxHp; g.p2.x = g.p1.x + gap; return g; };

// ── ไล่หวดห้าจังหวะ ต่อกันได้จริงและไม่แรงเกิน ──
{
  const M = CHARACTERS.orpheus.moves;
  const chain = [];
  for (let id = "jab1"; id; id = M[id].chain) { chain.push(id); if (chain.length > 8) break; }
  ok(chain.length === 5, `ไล่หวดต่อกันห้าจังหวะ (${chain.join(" -> ")})`);
  const mid = chain.slice(0, 4).filter((k) => M[k].kb[1] !== 0);
  ok(mid.length === 0, `สี่จังหวะแรกไม่มีท่าไหนถีบขึ้น${mid.length ? " (เจอ " + mid.join(",") + ")" : ""}`);
  ok(M.jab5.kb[1] < 0, "ไม้จบถีบออกได้ เพราะจบคอมโบตรงนั้นพอดี");

  const g = mk("orpheus", "helios", 110);
  let hits = 0;
  for (let f = 1; f <= 140; f++) { g.step(inp({ p: { attack: f % 7 === 1 ? 1 : 0 } }), inp());
    for (const e of g.events) if (e.type === "hit") hits++; }
  const dealt = 100 - g.p2.hp;
  ok(hits === 5, `กดรัวแล้วออกครบห้าที (${hits})`);
  ok(dealt >= 14 && dealt <= 22, `คอมโบเต็มอยู่ในระดับเดียวกับตัวอื่น (${dealt} หน่วย · ดาบ Atlas 18)`);
}

// ── สกิล 1 สไลด์ต้องตัวเตี้ยจริง ไม่งั้นไม่ได้ลอดอะไรเลย ──
{
  const M = CHARACTERS.orpheus.moves;
  ok(M.slide1.crouch === true, "ช่วงสไลด์กรอบตัวเตี้ยลง (crouch)");
  ok(M.slide1.autoChain === "slide2", "สไลด์จบแล้วเด้งขึ้นฟาดสวนเอง");
  const g = mk("orpheus", "helios", 400);
  const x0 = g.p1.x;
  for (let f = 1; f <= 60; f++) g.step(inp({ p: { skill1: f === 1 ? 1 : 0 } }), inp());
  ok(g.p1.x - x0 > 150, `สไลด์พาตัวไปข้างหน้าจริง (${Math.round(g.p1.x - x0)} px)`);
}

// ── สกิล 2 Burnout: ไฟต้องเกิดตรงที่เพิ่งยืน แล้วตัวถอยไปอยู่หลังไฟ ──
{
  const g = mk("orpheus", "helios", 100);
  const x0 = g.p1.x;
  let fireAt = null;
  for (let f = 1; f <= 60; f++) { g.step(inp({ p: { skill2: f === 1 ? 1 : 0 } }), inp());
    for (const e of g.events) if (e.type === "firepool") fireAt = e.x; }
  ok(fireAt !== null, "ฟาดลงพื้นแล้วเกิดกองไฟ");
  ok(Math.abs(fireAt - x0) < 20, `กองไฟอยู่ตรงที่เพิ่งยืน ไม่ใช่ที่ใหม่ (ห่าง ${Math.round(Math.abs(fireAt - x0))} px)`);
  ok(g.p1.x < x0, `ถอยไปอยู่หลังกองไฟ (${Math.round(g.p1.x - x0)} px)`);
  ok(g.p2.hp < 100, `ฟาดลงพื้นมีดาเมจด้วย (เหลือ ${g.p2.hp})`);
}

// ── ไฟของเขาทำให้ติดไฟ · ไฟของ Alecto ไม่ทำ (เขาเผาคน เธอเผาที่) ──
{
  const g = mk("orpheus", "helios", 100);
  for (let f = 1; f <= 60; f++) g.step(inp({ p: { skill2: f === 1 ? 1 : 0 } }), inp());
  let ign = 0;
  for (let f = 1; f <= 200; f++) { g.step(inp(), inp({ left: 1 }));
    for (const e of g.events) if (e.type === "ignite") ign++; }
  ok(ign > 0, `เดินเข้ามาเหยียบไฟของ Orpheus แล้วติดไฟ (${ign} ครั้ง)`);

  const h = mk("alecto", "helios", 100);
  let ign2 = 0;
  for (let f = 1; f <= 420; f++) { h.step(inp({ p: { skill2: f === 1 ? 1 : 0 } }), inp({ left: f > 60 ? 1 : 0 }));
    for (const e of h.events) if (e.type === "ignite") ign2++; }
  ok(ign2 === 0, "กองไฟของ Alecto ไม่ทำให้ติดไฟ — บทบาทเธอไม่ถูกแตะ");
}

// ── ไฟที่ติดตัวตอดต่อแม้เดินออกจากกองไฟแล้ว ──
{
  const burnt = (foe) => {
    // จุดไฟด้วยการเหยียบกองไฟจริง ไม่ใช่ตั้งค่าเอง จะได้ผ่านสูตร resist ด้วย
    const g = mk("orpheus", foe, 100);
    for (let f = 1; f <= 60; f++) g.step(inp({ p: { skill2: f === 1 ? 1 : 0 } }), inp());
    for (let f = 1; f <= 40; f++) g.step(inp(), inp({ left: 1 }));
    const set = g.p2.burn, hp = g.p2.hp;
    for (let f = 1; f <= 200; f++) g.step(inp({ left: 1 }), inp({ right: 1 }));  // แยกออกจากกองไฟ
    return { set, lost: hp - g.p2.hp, left: g.p2.burn };
  };
  const hel = burnt("helios"), atl = burnt("atlas");
  ok(hel.lost > 0, `ไฟติดตัวตอดเลือดต่อแม้ออกจากกองไฟแล้ว (${hel.lost} หน่วย)`);
  ok(hel.left === 0, "หมดเวลาแล้วไฟดับเอง");
  ok(atl.set < hel.set, `Atlas ไหม้สั้นกว่า (${atl.set} เฟรม เทียบ ${hel.set})`);
  ok(atl.lost < hel.lost, `Atlas ต้านไฟได้ เจ็บน้อยกว่า (${atl.lost} เทียบ ${hel.lost})`);
}

// ── อัลติเดินได้และทิ้งไฟตามรอยที่เดิน ──
{
  const M = CHARACTERS.orpheus.moves;
  ok(M.solo2.mobile > 0 && M.solo3.mobile > 0, "ท่าโซโล่เดินได้ ไม่ใช่ยืนตายอยู่กับที่");
  ok(M.solo2.trail > 0, "โซโล่ทิ้งกองไฟเป็นระยะ ๆ");
  const g = mk("orpheus", "helios", 300); g.p1.ki = 100;
  const xs = new Set();
  for (let f = 1; f <= 320; f++) { g.step(inp({ right: 1, p: { skill3: f === 1 ? 1 : 0 } }), inp());
    for (const e of g.events) if (e.type === "firepool") xs.add(Math.round(e.x / 40)); }
  ok(xs.size >= 3, `เดินโซโล่แล้วไฟกระจายหลายจุด ไม่ใช่กองเดียว (${xs.size} จุด)`);
}
