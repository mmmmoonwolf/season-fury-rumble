// ทดสอบกลไกเฉพาะตัวของ Alecto — ตรารอยแส้ กองไฟ และท่าถอย
// รัน: node tools/tests/alecto.test.mjs   (จากโฟลเดอร์ game)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, PHYS, CHARACTERS } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 100) => {
  const g = new Game(); g.p1.char = "alecto"; g.p2.char = "helios";
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};
const jabs = (g, n) => { for (let i = 0; i < n; i++) g.step(inp(i % 10 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp()); };

// ── ตรารอยแส้สะสมแล้วสลายเอง ──
{
  const g = mk(); jabs(g, 110);
  ok(g.p2.lash > 0, `ฟาดแส้โดนแล้วได้ตรา (${g.p2.lash} ชั้น)`);
  ok(g.p1.lash === 0, "ตราอยู่ที่คนโดน ไม่ใช่คนฟาด");
  const peak = g.p2.lash;
  for (let i = 0; i < 400; i++) g.step(inp(), inp());
  ok(g.p2.lash === 0, `ปล่อยไว้แล้วตราสลายหมด (${peak} -> 0)`);
}

// ── เพดานตรา และเพดานดาเมจต้องไม่ชนะการลดดาเมจตามคอมโบ ──
//
// ถ้าฝั่งเพิ่มชนะฝั่งลดเมื่อไหร่ = คอมโบยิ่งยาวยิ่งแรง ซึ่งเปิดช่องคอมโบวนไม่รู้จบ
// ที่ระบบลดดาเมจมีไว้กันตั้งแต่ต้น เป็นเงื่อนไขที่ห้ามหลุดไม่ว่าจะปรับตัวเลขยังไง
{
  const g = mk();
  g.p2.lash = 99; g.p2.lashF = 1e9;
  ok(g.p2.lash === 99, "ตั้งค่าทดสอบได้");
  const mul = g.lashMul({ lash: 5 });
  const comboFloor = 0.5;
  ok(mul * comboFloor < 1, `เพดานเพิ่ม x${mul.toFixed(2)} คูณเพดานลด x${comboFloor} = ${(mul*comboFloor).toFixed(2)} ซึ่งยังต่ำกว่า 1`);
}

// ── ตราทำให้คนโดนเดินช้าลงจริง ──
{
  const dist = (l) => {
    const g = mk(300); g.p2.lash = l; g.p2.lashF = 1e9;
    const x0 = g.p2.x;
    for (let i = 0; i < 60; i++) g.step(inp(), inp({ left: 1 }));
    return Math.round(x0 - g.p2.x);
  };
  const d0 = dist(0), d5 = dist(5);
  ok(d5 < d0, `ตราเต็มแล้วเดินได้สั้นลง (${d0} -> ${d5} px)`);
  ok(d5 > d0 * 0.5, "แต่ไม่ถึงกับเดินไม่ได้ — ยังมีทางถอยหนีเพื่อให้ตราสลาย");
}

// ── กองไฟ: เกิดจริง กินเลือดจริง แล้วหมดอายุเอง ──
{
  const g = mk(); g.p2.x = g.p1.x + 200;
  for (let i = 0; i < 40; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
  ok(g.fires.length === 1, "ขว้างมอลอตอฟแล้วเกิดกองไฟหนึ่งกอง");
  const hp0 = g.p2.hp;
  for (let i = 0; i < 120; i++) g.step(inp(), inp());
  ok(g.p2.hp < hp0, `ยืนในกองไฟแล้วเสียเลือด (${hp0} -> ${g.p2.hp})`);
  for (let i = 0; i < 300; i++) g.step(inp(), inp());
  ok(g.fires.length === 0, "กองไฟหมดอายุเองแล้วหายไป");
}

// ── กองไฟต้องเดินด้วยเลขเฟรมล้วน ไม่งั้นเล่นข้ามเครื่องแล้วภาพหลุดกัน ──
{
  const play = () => {
    const g = mk(); g.p2.x = g.p1.x + 200;
    for (let i = 0; i < 200; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
    return [g.p2.hp, g.fires.length, g.fires[0]?.life ?? -1, Math.round(g.fires[0]?.x ?? -1)].join("|");
  };
  ok(play() === play(), "เดินสองรอบด้วยอินพุตเดียวกันได้ผลเท่ากันเป๊ะ");
}

// ── กองไฟต้องถูกล้างตอนรีเซ็ต ไม่งั้นค้างข้ามแมตช์แล้วสองเครื่องเริ่มไม่เหมือนกัน ──
{
  const g = mk();
  for (let i = 0; i < 40; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
  ok(g.fires.length > 0, "มีกองไฟอยู่ก่อนรีเซ็ต");
  g.resetPositions();
  ok(g.fires.length === 0, "รีเซ็ตแล้วกองไฟถูกล้าง");
  ok(g.p1.lash === 0 && g.p2.lash === 0, "รีเซ็ตแล้วตราถูกล้างด้วย");
}

// ── ท่าถอย: กดทิศถอยค้างตอนกดสกิลแล้วต้องถอยก่อน แล้วต่อเข้าสกิลเอง ──
{
  const seen = [];
  const g = mk(140);
  for (let i = 0; i < 60; i++) {
    g.step(i === 0 ? inp({ left:1, skill1:1, p:{ skill1:1 } }) : inp({ left:1 }), inp());
    if (g.p1.moveId && seen[seen.length-1] !== g.p1.moveId) seen.push(g.p1.moveId);
  }
  ok(seen[0] === "hop", `กดถอยค้าง -> ออกท่าถอยก่อน (ได้ ${seen[0]})`);
  ok(seen.includes("shot1"), "แล้วต่อเข้าสกิลเอง");

  const plain = [];
  const g2 = mk(140);
  for (let i = 0; i < 60; i++) {
    g2.step(i === 0 ? inp({ skill1:1, p:{ skill1:1 } }) : inp(), inp());
    if (g2.p1.moveId && plain[plain.length-1] !== g2.p1.moveId) plain.push(g2.p1.moveId);
  }
  ok(plain[0] === "shot1", "ไม่กดทิศ -> ยิงเลย ไม่ถอย (ต่อคอมโบจากแส้ได้)");

  // อัลติต้องปักหลักเสมอ ถอยไม่ได้ ไม่งั้นเธอไม่ต้องรับผิดชอบอะไรทั้งเกม
  const ult = [];
  const g3 = mk(140); g3.p1.ki = 100;
  for (let i = 0; i < 40; i++) {
    g3.step(i === 0 ? inp({ left:1, skill3:1, p:{ skill3:1 } }) : inp({ left:1 }), inp());
    if (g3.p1.moveId && ult[ult.length-1] !== g3.p1.moveId) ult.push(g3.p1.moveId);
  }
  ok(ult[0] === "dust1", `อัลติกดถอยค้างก็ยังออกท่าอัลติ ไม่กลายเป็นท่าถอย (ได้ ${ult[0]})`);
}

// ── ท่าลากต้องดึงคู่ต่อสู้เข้ามา ไม่ใช่ผลักออก ──
{
  const g = mk(170);
  const gap0 = g.p2.x - g.p1.x;
  for (let i = 0; i < 50; i++) g.step(i === 0 ? inp({ right:1, attack:1, p:{ attack:1, right:1 } }) : inp(), inp());
  ok(g.p2.x - g.p1.x < gap0, `Rope Pull ลากเข้ามาจริง (${Math.round(gap0)} -> ${Math.round(g.p2.x - g.p1.x)} px)`);
}

// ── ท่าแส้ทุกท่าที่อยู่กลางคอมโบต้องไม่ถีบขึ้น ──
// ถีบขึ้นเมื่อไหร่คนโดนกลายเป็นล้ม ซึ่งมีอมตะติดมา คอมโบขาดทันที (เคยพลาดมาแล้วสามรอบ)
{
  const g = mk();
  const M = g.p1.moves;
  const mid = ["jab1", "jab2", "jab3", "side", "rifle1", "rifle2"];
  const bad = mid.filter((k) => M[k].kb[1] !== 0);
  ok(bad.length === 0, `ท่ากลางคอมโบไม่มีท่าไหนถีบขึ้น${bad.length ? " (เจอ " + bad.join(",") + ")" : ""}`);
}

// ── แส้ต้องยาวกว่าของสองตัวแรกจริง ไม่งั้นไม่มีเหตุผลให้ยอมรับ startup ที่ช้ากว่า ──
{
  const g = mk(); const A = g.p1.moves;
  const g2 = new Game(); g2.p1.char = "helios"; const H = g2.p1.moves;
  ok(A.jab1.hb.w > H.jab1.hb.w * 1.4, `จิ้มของ Alecto ยาวกว่า Helios มาก (${A.jab1.hb.w} vs ${H.jab1.hb.w})`);
  ok(A.jab1.startup > H.jab1.startup, `แลกกับออกช้ากว่า (${A.jab1.startup} vs ${H.jab1.startup} เฟรม)`);
}

// ── ท่าตั้งป้อมยืนยิง (สกิล 1 และอัลติ) ──
//
// กดครั้งเดียวแล้วปักหลักยิงยาว 5 วินาที ไม่ต้องกดรัว แลกกับขยับไม่ได้เลยตลอดช่วงนั้น
{
  // hold = โหมดไรเฟิลต้องกดปุ่มตีค้างถึงจะยิงต่อ (holdChain) ต่างจากอัลติที่ยิงเอง
  const fire = (key, ki = 0, foe = () => inp(), hold = false) => {
    const g = mk(150); g.p1.ki = ki;
    let frames = 0; const start = g.frame;
    for (let i = 0; i < 480; i++) {
      g.step(inp(i === 0 ? { [key]: 1, p: { [key]: 1 } } : (hold ? { attack: 1 } : {})), foe(i));
      if (g.p1.state === "attack") frames = g.frame - start;
    }
    return { frames, dmg: 100 - g.p2.hp };
  };

  // สกิล 1 ไม่ใช่ท่าตั้งป้อมแล้ว — เป็นชุดสั้นสามจังหวะที่ดันคนออก (ดูบล็อกถัดไป)
  // ท่าตั้งป้อมตอนนี้คือครึ่งหลังของสกิล 2 (โหมดไรเฟิล) กับอัลติ
  const rifle = fire("skill2", 0, () => inp(), true);
  ok(rifle.frames > 260 && rifle.frames < 400, `โหมดไรเฟิลยืนยิงได้ราว 5 วินาที (${rifle.frames} เฟรม)`);
  ok(rifle.dmg > 10 && rifle.dmg < 40, `ยืนให้ยิงนิ่ง ๆ เสียเลือด ${rifle.dmg}`);


  // เดินหนีออกจากระยะต้องกินดาเมจน้อยลงมาก — ไม่งั้นเป็นดาเมจฟรีที่ไม่มีทางแก้
  const run = fire("skill2", 0, () => inp({ right: 1 }), true);
  ok(run.dmg < rifle.dmg, `เดินหนีแล้วกินน้อยลง (${run.dmg} เทียบยืนนิ่ง ${rifle.dmg})`);
}

// ── โดนสวนระหว่างยืนยิง = ป้อมแตกทันที ──
// เป็นทางแก้เดียวของอีกฝ่ายตอนเธอตั้งป้อม ถ้าอันนี้พังตัวละครจะกดไม่ขึ้น
{
  const g = mk(150);
  for (let i = 0; i < 60; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : { attack: 1 }), inp());
  ok(g.p1.state === "attack" && g.p1.stanceUntil > g.frame, "กำลังยืนยิงอยู่ (โหมดไรเฟิล)");
  g.p2.x = g.p1.x + 60; g.p2.facing = -1;
  g.startMove(g.p2, "jab1", -1);
  for (let i = 0; i < 20; i++) g.step(inp(), inp());
  ok(g.p1.stanceUntil <= g.frame, "โดนสวนแล้วเวลายืนยิงถูกล้างทิ้ง");
  ok(g.p1.state !== "attack", "และหลุดออกจากท่ายิงจริง");
}

// ── คูลดาวน์ต้องยาวกว่าเวลายืนยิง ไม่งั้นตั้งป้อมต่อได้ไม่หยุด ──
{
  const g = mk();
  g.step(inp({ skill2:1, p:{ skill2:1 } }), inp());
  const M = g.p1.moves;
  ok(g.p1.cd[1] > M.fire1.stance, `คูลดาวน์ ${g.p1.cd[1]} เฟรม ยาวกว่าเวลาถือไรเฟิล ${M.fire1.stance} เฟรม`);
}

// ── กลิ้ง/กระโดดถอยก่อนตั้งป้อม ต้องไม่ทำให้เวลายืนยิงหายไป ──
{
  const g = mk(150);
  const seen = [];
  for (let i = 0; i < 200; i++) {
    g.step(i === 0 ? inp({ left:1, skill2:1, p:{ skill2:1 } }) : inp({ left:1, attack:1 }), inp());
    if (g.p1.moveId && seen[seen.length-1] !== g.p1.moveId) seen.push(g.p1.moveId);
  }
  ok(seen[0] === "roll" && seen.includes("rifle1"), "ถอยก่อนแล้วยังสับเป็นไรเฟิลต่อได้");
}

// ── ขยับได้ระหว่างยืนยิง ──
//
// เวอร์ชันแรกปักหลักนิ่งสนิท เล่นจริงแล้วขาตายทั้งสกิล 1 และอัลติ
// ตอนนี้ย่องได้ช้า ๆ แลกกับดาเมจที่หายไปเพราะถอยออกจากระยะเอง
{
  const back = (key, ki, n, hold = false) => {
    const g = mk(200); g.p1.ki = ki; const x0 = g.p1.x;
    for (let i = 0; i < n; i++)
      g.step(inp(i === 0 ? { [key]:1, p:{ [key]:1 } } : { left:1, ...(hold ? { attack:1 } : {}) }), inp());
    return { moved: Math.round(x0 - g.p1.x), still: g.p1.state === "attack" };
  };
  const shot = back("skill2", 0, 220, true);
  ok(shot.moved > 150, `ถือไรเฟิลแล้วถอยไปได้ ${shot.moved} px`);
  ok(shot.still, "ถอยแล้วยังอยู่ในท่ายิง ไม่หลุด");

  // ช้ากว่าวิ่งปกติชัดเจน ไม่งั้นกลายเป็นวิ่งยิงฟรี
  const speed = (key, ki, n) => {
    const g = mk(400); g.p1.ki = ki; const x0 = g.p1.x;
    for (let i = 0; i < n; i++) g.step(inp(i === 0 && key ? { [key]:1, p:{ [key]:1 } } : { left:1 }), inp());
    return (x0 - g.p1.x) / n * 60;
  };
  const plain = speed(null, 0, 60), firing = speed("skill2", 0, 120);
  ok(firing < plain * 0.6, `ย่องตอนยิงช้ากว่าวิ่งปกติมาก (${firing.toFixed(0)} เทียบ ${plain.toFixed(0)} px/วินาที)`);

  // ถอยหนีแล้วต้องยังหันหน้าใส่คู่ต่อสู้ ไม่ใช่หันหลังยิงทิ้ง
  const g = mk(160);
  for (let i = 0; i < 60; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : { left:1, attack:1 }), inp());
  ok(g.p1.facing > 0, "ถอยซ้ายอยู่แต่ยังหันหน้าไปทางคู่ต่อสู้");
  g.p2.x = g.p1.x - 200;
  for (let i = 0; i < 20; i++) g.step(inp({ attack:1 }), inp());
  ok(g.p1.facing < 0, "คู่ต่อสู้ข้ามไปอีกฝั่งแล้วหันตามทัน");
}


// ── ท่ากลิ้งถอยต้องเป็นท่าหนีจริง ไม่ใช่แค่ขยับ ──
//
// ผู้เล่นรายงานว่าเธอ "แพ้ง่าย คนอื่นใส่เป็นชุดเละเลย" วัดแล้วเจอต้นเหตุ:
// ท่ากลิ้งของเธอไม่มี iframes เลยสักเฟรม กลิ้งหนีไปก็โดนตีอยู่ดี
// ทั้งที่นี่คือท่าป้องกันตัวท่าเดียวที่เธอมี (ไม่มีเกราะ ไม่มีวาร์ป ไม่มีสวนกลับ)
{
  const M = CHARACTERS.alecto.moves;
  ok(Array.isArray(M.roll.iframes), "ท่ากลิ้งมีช่วงอมตะ");
  ok(M.roll.iframes[1] >= M.roll.startup + M.roll.active,
    `ช่วงอมตะคลุมตลอดช่วงกลิ้ง (${M.roll.iframes.join("-")} · ท่ายาว ${M.roll.startup + M.roll.active})`);
  ok(!M.hop.iframes, "กระโดดถอยไม่มีช่วงอมตะ — ให้มีทางเลือก ไวแต่เสี่ยง กับ ช้ากว่าแต่รอด");

  // กลิ้งหนีจริงตอนโดนไล่ตี
  const run = (escape) => {
    const g = new Game(); g.p1.char = "helios"; g.p2.char = "alecto";
    g.p1.hp = 100; g.p2.hp = 100; g.p2.x = g.p1.x + 95;
    let dmg = 0;
    for (let f = 1; f <= 50; f++) {
      // เธอเป็นฝั่งขวาหันซ้าย ต้องกดขวาค้างถึงจะเป็นท่าถอย
      const her = escape ? inp({ right: 1, p: f === 1 ? { skill2: 1 } : {} }) : inp();
      g.step(inp({ p: { attack: f % 6 === 1 ? 1 : 0 } }), her);
      for (const e of g.events) if (e.type === "hit") dmg += e.dmg;
    }
    return dmg;
  };
  const stood = run(false), rolled = run(true);
  ok(rolled < stood, `กลิ้งหนีแล้วเจ็บน้อยกว่ายืนรับ (${rolled} เทียบ ${stood})`);
  // ไม่ใช่ 0 เสมอไป — ช่วงอมตะคุ้มแค่ตอนกลิ้ง ออกจากท่าแล้วก็โดนได้ตามปกติ
  // ที่ต้องเป็นจริงคือ "กลิ้งแล้วรอดช่วงที่โดนไล่" ไม่ใช่ "อมตะตลอดกาล"
  ok(rolled <= stood / 2, `กลิ้งแล้วเจ็บไม่ถึงครึ่งของยืนรับ (${rolled} เทียบ ${stood})`);
}

// ── ท่าพื้นของเธอไม่ควรค้างนานกว่าคนที่จ่ายค่าความช้าด้วยเกราะ ──
{
  const A = CHARACTERS.alecto.moves, T = CHARACTERS.atlas.moves;
  const span = (m) => m.startup + m.active + m.recovery;
  ok(span(A.jab1) < span(T.jab1),
    `ท่าจิ้มของเธอเร็วกว่าของ Atlas (${span(A.jab1)} เทียบ ${span(T.jab1)} เฟรม)`);
  ok(A.side.recovery < T.side.recovery,
    `ท่าพุ่งค้างน้อยกว่าของ Atlas (${A.side.recovery} เทียบ ${T.side.recovery})`);
  // Atlas ต้องไม่ถูกแตะ — เคยเผลอแก้ไปพร้อมกันเพราะเฟรมเดต้าเหมือนกันเป๊ะ
  ok(T.jab3.startup === 11 && T.jab3.recovery === 24,
    `ไม้จบคอมโบของ Atlas ยังเป็น 11/5/24 ตามเดิม (${T.jab3.startup}/${T.jab3.active}/${T.jab3.recovery})`);
}

// ── อัลติ Dust Devil: ท่าเอาตัวรอด ไม่ใช่ท่าทำดาเมจ ──
//
// ผู้เล่นรายงานว่าคนเล่นเธอโดนรุมประจำ อัลติเดิม (ยืนกราด) ไม่ได้ช่วยเรื่องนั้นเลย
{
  const M = CHARACTERS.alecto.moves;
  ok(M.dust1.autoChain === "dust2" && !!M.dust2.dustPool, "อัลติปาถุงฝุ่นลงพื้น");
  ok(M.dust2.dustPool.at <= M.dust2.startup + M.dust2.active,
    "ฝุ่นเกิดภายในช่วงที่ท่ากำลังออก ไม่ใช่หลังจบท่า");

  const g = mk(150); g.p1.ki = 100;
  for (let i = 0; i < 30; i++) g.step(inp(i === 0 ? { skill3:1, p:{ skill3:1 } } : {}), inp());
  ok(!!g.dust, "เกิดวงฝุ่นจริง");
  ok(Math.abs(g.dust.x - g.p1.x) < 60, "วงเกิดตรงที่เธอยืน ไม่ใช่ขว้างไปไกลแบบมอลอตอฟ");
  ok(g.p1.dustGuard > 0 && g.p1.veil > 0, "ยืนอยู่ในวงของตัวเอง");

  // อยู่ในวงแล้วเจ็บน้อยลงจริง
  const combo = (inDust) => {
    const h = new Game(); h.p1.char = "helios"; h.p2.char = "alecto";
    h.p1.hp = 100; h.p2.hp = 100; h.p2.x = h.p1.x + 95;
    if (inDust) h.dust = { x: h.p2.x, owner: "p2", life: 300 };
    let d = 0;
    for (let f = 1; f <= 60; f++) {
      h.step(inp({ p: { attack: f % 6 === 1 ? 1 : 0 } }), inp());
      for (const e of h.events) if (e.type === "hit") d += e.dmg;
    }
    return d;
  };
  const out = combo(false), inside = combo(true);
  ok(inside < out, `อยู่ในวงเจ็บน้อยกว่าอยู่นอกวง (${inside} เทียบ ${out})`);

  // กันสถานะ: ไฟของ Orpheus ต้องไม่ติด
  const f2 = new Game(); f2.p1.char = "orpheus"; f2.p2.char = "alecto";
  f2.p1.hp = 100; f2.p2.hp = 100; f2.p2.x = f2.p1.x + 100;
  f2.dust = { x: f2.p2.x, owner: "p2", life: 400 };
  for (let i = 0; i < 60; i++) f2.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
  for (let i = 0; i < 60; i++) f2.step(inp(), inp({ left: 1 }));
  ok(f2.p2.burn === 0, "อยู่ในวงฝุ่นแล้วไฟไม่ติดตัว");
}

// ── ออกจากวงแล้วยังจางต่อ = มีเวลาหนีจริง ──
//
// แยกสองค่าเพราะ "ป้องกัน" ต้องหมดทันทีที่ออกจากวง แต่ "มองไม่เห็น" ต้องค้างต่ออีกพัก
// ถ้าหมดพร้อมกัน ออกจากวงมาก็โผล่ให้ตีต่อทันที ซึ่งพลาดทั้งประเด็นของท่านี้
{
  const g = mk(150);
  g.dust = { x: g.p1.x, owner: "p1", life: 400 };
  g.step(inp(), inp());
  const inGuard = g.p1.dustGuard, inVeil = g.p1.veil;
  ok(inGuard > 0 && inVeil > 0, "ในวง: ทั้งกันดาเมจและจางอยู่");

  g.p1.x += 500;                       // เดินออกไปนอกวง
  g.step(inp(), inp());
  ok(g.p1.dustGuard === 0, "ออกจากวงแล้วการป้องกันหมดทันที");
  ok(g.p1.veil > 0, `แต่ยังจางต่ออีก ${g.p1.veil} เฟรม — นี่คือเวลาหนี`);

  for (let i = 0; i < 60; i++) g.step(inp(), inp());
  ok(g.p1.veil === 0, "จางหมดเวลาแล้วกลับมาเห็นตามปกติ");
}

// ── ท่าเดินถือปืนยาว (โหมดไรเฟิลของสกิล 2) ──
//
// ชีตท่าเดินวาดเป็นโปรไฟล์ด้านข้างล้วน ปีกหมวกจึงหุบจนไม้บรรทัด "พื้นที่หมวก" อ่านผิด
// รอบแรกที่ใส่เข้ามา เธอตัวใหญ่กว่าท่ายืนอยู่ 30% (สูง 305 px เทียบ 234) โดยไม่มีอะไรจับได้
// เทสต์นี้วัดจาก atlas ที่ build ออกมาจริง ๆ ไม่ใช่จากโค้ด — ถ้าไม้บรรทัดพังอีกจะรู้ทันที
{
  const fs = await import("fs");
  const atlas = JSON.parse(fs.readFileSync(
    new URL("../../assets/characters/scramble_alecto.json", import.meta.url), "utf8"));
  const box = (n) => atlas.frames[n + ".png"]?.spriteSourceSize;

  const idle = box("idle_1");
  const walk = [1, 2, 3, 4].map((i) => box(`runGun_${i}`));
  ok(walk.every(Boolean), `ท่าเดินถือปืนอยู่ใน atlas ครบ 4 เฟรม (เจอ ${walk.filter(Boolean).length})`);

  for (const [i, w] of walk.entries()) {
    const r = w.h / idle.h;
    ok(r > 0.90 && r < 1.06, `runGun_${i + 1} สูง ${(r * 100).toFixed(0)}% ของท่ายืน — สเกลตรงกับตัวเดียวกัน`);
    // เท้าต้องแตะเส้นพื้นเดียวกับท่าอื่น ไม่งั้นเธอจะลอยหรือจมตอนสลับเข้าโหมดไรเฟิล
    ok(Math.abs(w.y + w.h - atlas.meta.feetY) <= 2, `runGun_${i + 1} เท้าอยู่บนเส้นพื้นเดียวกับท่าอื่น`);
  }
}

// ── กฎการวาดท่าเดินถือปืนเป็นเรื่องของฉากล้วน ไม่แตะ sim ──
//
// ถ้าเผลอให้ sim รู้จักท่านี้ สองเครื่องที่ตัดสินใจ "เดินหรือยืน" คนละจังหวะจะ desync
// ฉากอ่านจาก vx กับธง mobile ของท่าที่กำลังเล่นอยู่เท่านั้น เฟรมเดต/hitbox ยังเป็นของท่ายิงเดิม
{
  const fs = await import("fs");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const core = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");

  ok(/anims\.runGun\s*&&\s*f\.moves\[f\.moveId\]\?\.mobile/.test(scene),
    "ฉากสลับไปท่าเดินเมื่อท่านั้นติดธง mobile เท่านั้น");
  ok(/Math\.abs\(f\.vx\)\s*>\s*GUN_WALK_VX/.test(scene), "และต้องเคลื่อนที่อยู่จริงถึงจะย่ำเท้า");
  ok(!/runGun/.test(core), "core.js ไม่รู้จักท่าเดินถือปืนเลย");

  const rifle = CHARACTERS.alecto.moves.rifle1;
  ok(rifle.mobile > 0, `ท่ายิงไรเฟิลยังติดธง mobile (${rifle.mobile})`);
  ok(rifle.hb && rifle.dmg > 0, "และยังมี hitbox ของตัวเองตามเดิม — ท่าเดินไม่ได้แทนที่เฟรมเดตา");
}
