// ทดสอบกลไกเฉพาะตัวของ Atlas — เกราะทน เลือดต่อตัวละคร และการทนสถานะ
// รัน: node tools/tests/atlas.test.mjs   (จากโฟลเดอร์ game)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (mine = "atlas", foe = "helios", gap = 120) => {
  const g = new Game(); g.p1.char = mine; g.p2.char = foe;
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};

// ── เลือดเป็นค่าของตัวละคร ไม่ใช่ค่ากลาง ──
{
  const g = mk();
  ok(g.p1.maxHp === 130, `Atlas เลือด ${g.p1.maxHp}`);
  ok(g.p2.maxHp === 100, `Helios เลือด ${g.p2.maxHp}`);
  ok(g.p1.hp === 130, "เริ่มแมตช์ด้วยเลือดเต็มของตัวเอง");
  g.p1.hp = 10; g.resetPositions();
  ok(g.p1.hp === 130, "รีเซ็ตแล้วกลับไปเต็มของตัวเอง ไม่ใช่ 100");
}

// ── เกราะทน: โดนตีแล้วไม่ถูกดีดออกจากท่า ──
//
// นี่คือแกนของตัวละครทั้งตัว ถ้าอันนี้พังเขาก็เป็นแค่ตัวช้าที่เลือดเยอะ
const trial = (mine, move) => {
  const g = mk(mine); g.p1.x = g.p2.x - 46; g.p2.facing = -1;
  g.startMove(g.p1, move, 1);
  for (let i = 0; i < 3; i++) g.step(inp(), inp());
  const hp0 = g.p1.hp, armor0 = g.p1.armorLeft;
  g.startMove(g.p2, "jab1", -1);
  for (let i = 0; i < 14; i++) g.step(inp(), inp());
  return { hp0, armor0, hp: g.p1.hp, armor: g.p1.armorLeft, kept: g.p1.state === "attack" };
};
{
  const plain = trial("helios", "jab1");
  ok(!plain.kept, "ตัวที่ไม่มีเกราะ โดนจิ้มสวนแล้วหลุดท่า (ของเดิมยังเป็นแบบนี้)");

  const soft = trial("atlas", "jab1");
  ok(!soft.kept, "ท่าจิ้มของ Atlas ก็ไม่มีเกราะ หลุดท่าเหมือนกัน");

  for (const mv of ["jab3", "side", "ram1", "leap", "sky1"]) {
    const r = trial("atlas", mv);
    ok(r.kept, `ท่า ${mv} มีเกราะ โดนจิ้มสวนแล้วท่าไม่ขาด`);
    ok(r.armor === r.armor0 - 1, `  และเกราะลดลงหนึ่งชั้น (${r.armor0} -> ${r.armor})`);
    ok(r.hp < r.hp0, "  ยังเจ็บอยู่ ไม่ใช่กันดาเมจ");
  }

  // เจ็บน้อยกว่าตอนไม่มีเกราะ แต่ต้องไม่ใช่ศูนย์
  const bare = trial("atlas", "jab1"), armored = trial("atlas", "jab3");
  ok((armored.hp0 - armored.hp) < (bare.hp0 - bare.hp), "มีเกราะแล้วเจ็บน้อยกว่าไม่มี");
}

// ── เกราะมีเพดาน: รัวใส่เยอะ ๆ ต้องแตก ──
// ถ้าไม่มีเพดาน ตัวนี้จะกดไม่ขึ้นเลย
{
  const g = mk(); g.p1.x = g.p2.x - 46; g.p2.facing = -1;
  g.startMove(g.p1, "ram1", 1);
  const cap = g.p1.armorLeft;
  let broke = false;
  for (let i = 0; i < 80; i++) {
    if (g.p2.state !== "attack" && i % 5 === 0) g.startMove(g.p2, "jab1", -1);
    g.step(inp(), inp());
    if (g.p1.state !== "attack") { broke = true; break; }
  }
  ok(cap > 0 && broke, `เกราะ ${cap} ชั้น รัวใส่เรื่อย ๆ แล้วแตกจริง`);
}

// ── เกราะกินกระสุนด้วย ไม่ใช่แค่ท่าประชิด ──
// "พุ่งทะลุกระสุนได้" เป็นเหตุผลที่ตัวช้ามีทางเข้า ถ้ากระสุนหยุดเขาได้ก็จบ
{
  const g = mk("atlas", "alecto", 320);
  g.step(inp({ skill1:1, p:{ skill1:1 } }), inp({ skill1:1, p:{ skill1:1 } }));
  let broke = false;
  for (let i = 0; i < 40; i++) { g.step(inp(), inp()); if (g.p1.state !== "attack") broke = true; }
  ok(!broke, "โดนลูกโม่ระหว่างพุ่งชนแล้วยังพุ่งต่อ");
  ok(g.p1.hp < 130, `แต่ยังเสียเลือด (${g.p1.hp}/130)`);
}

// ── ทนสถานะ: ตราของ Alecto สลายเร็วกว่าและสโลว์น้อยกว่า ──
{
  const gone = (who) => {
    const g = mk("alecto", who); g.p2.lash = 5; g.p2.lashF = g.frame;
    for (let i = 0; i < 500; i++) { g.step(inp(), inp()); if (g.p2.lash === 0) return i; }
    return 999;
  };
  const h = gone("helios"), a = gone("atlas");
  ok(a < h * 0.7, `ตรา 5 ชั้นหมดเร็วกว่า (Atlas ${a} เฟรม · Helios ${h} เฟรม)`);

  const dist = (who) => {
    const g = mk("alecto", who, 400); g.p2.lash = 5; g.p2.lashF = 1e9;
    const x0 = g.p2.x;
    for (let i = 0; i < 60; i++) g.step(inp(), inp({ left: 1 }));
    return Math.round(x0 - g.p2.x);
  };
  ok(dist("atlas") > dist("helios"), `โดนสโลว์น้อยกว่า (Atlas เดินได้ ${dist("atlas")} · Helios ${dist("helios")} px)`);
}

// ── อัลติ: แกนกลางต้องกินสองข้าง และคลื่นต้องวิ่งออกสองทิศ ──
{
  const M = CHARACTERS.atlas.moves;
  const hb = M.sky2.hb;
  ok(hb.x < 0 && hb.x + hb.w > 0, `แกนกลางคร่อมตัวเขา กินทั้งสองข้าง (x ${hb.x} ถึง ${hb.x + hb.w})`);
  ok(hb.h > 150, `สูงพอสอยคนกระโดด (สูง ${hb.h})`);
  ok(M.sky2.shots.length === 2 && M.sky2.shots.some((s) => s.back),
    "คลื่นยิงออกสองทิศ (มีตัวที่ติดธง back)");

  const g = mk("atlas", "helios", 150); g.p1.ki = 100;
  for (let i = 0; i < 40; i++) g.step(inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}), inp());
  const dirs = new Set(g.shots.map((s) => Math.sign(s.vx)));
  ok(dirs.size === 2, `คลื่นวิ่งไปคนละทางจริง (${[...dirs].join(" กับ ")})`);
}

// ── ท่ากลางคอมโบต้องไม่ถีบขึ้น (กับดักเดิมที่พลาดมาแล้วสี่รอบ) ──
{
  const M = CHARACTERS.atlas.moves;
  const mid = ["jab1", "jab2", "jab3", "side", "ram1"];
  const bad = mid.filter((k) => M[k].kb[1] !== 0);
  ok(bad.length === 0, `ท่ากลางคอมโบไม่มีท่าไหนถีบขึ้น${bad.length ? " (เจอ " + bad.join(",") + ")" : ""}`);
}

// ── ช้าและหนักจริงไหม เทียบกับสองตัวที่เร็วกว่า ──
{
  const A = CHARACTERS.atlas.moves, H = CHARACTERS.helios.moves;
  ok(A.jab1.startup > H.jab1.startup, `จิ้มออกช้ากว่า Helios (${A.jab1.startup} vs ${H.jab1.startup} เฟรม)`);
  ok(A.jab1.dmg > H.jab1.dmg, `แต่ดาเมจต่อทีสูงกว่า (${A.jab1.dmg} vs ${H.jab1.dmg})`);
  ok(A.jab1.recovery > H.jab1.recovery, `และค้างนานกว่า (${A.jab1.recovery} vs ${H.jab1.recovery} เฟรม)`);
}
