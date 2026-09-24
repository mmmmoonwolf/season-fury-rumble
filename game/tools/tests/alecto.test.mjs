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
  ok(seen.includes("swap1"), "แล้วต่อเข้าสกิลเอง");

  const plain = [];
  const g2 = mk(140);
  for (let i = 0; i < 60; i++) {
    g2.step(i === 0 ? inp({ skill1:1, p:{ skill1:1 } }) : inp(), inp());
    if (g2.p1.moveId && plain[plain.length-1] !== g2.p1.moveId) plain.push(g2.p1.moveId);
  }
  ok(plain[0] === "swap1", "ไม่กดทิศ -> สลับอาวุธเลย ไม่ถอย");

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
  const mid = ["jab1", "jab2", "jab3", "side", "gjab1", "gjab2", "gjab3", "gside", "gdown"];
  const bad = mid.filter((k) => M[k].kb[1] !== 0 || (M[k].shots && M[k].shotKb === undefined));
  ok(bad.length === 0, `ท่ากลางคอมโบไม่มีท่าไหนถีบขึ้น${bad.length ? " (เจอ " + bad.join(",") + ")" : ""}`);
}

// ── แส้ต้องยาวกว่าของสองตัวแรกจริง ไม่งั้นไม่มีเหตุผลให้ยอมรับ startup ที่ช้ากว่า ──
{
  const g = mk(); const A = g.p1.moves;
  const g2 = new Game(); g2.p1.char = "helios"; const H = g2.p1.moves;
  ok(A.jab1.hb.w > H.jab1.hb.w * 1.4, `จิ้มของ Alecto ยาวกว่า Helios มาก (${A.jab1.hb.w} vs ${H.jab1.hb.w})`);
  ok(A.jab1.startup > H.jab1.startup, `แลกกับออกช้ากว่า (${A.jab1.startup} vs ${H.jab1.startup} เฟรม)`);
}

// ── สกิล 1 Gunslinger: สลับแส้ <-> ไรเฟิล ──
//
// นี่คือแกนของตัวละครหลังรื้อ: อาวุธสองชุดที่แก้ปัญหาคนละแบบ ไม่ใช่บัฟชั่วคราว
{
  const g = mk(150);
  ok(g.p1.alt === 0, "เริ่มยกมาถือแส้เสมอ");
  ok(g.pickMove(g.p1, inp()) === "jab1", "ถือแส้อยู่ -> ปุ่มตีได้ท่าแส้");

  g.step(inp({ skill1:1, p:{ skill1:1 } }), inp());
  ok(g.p1.moveId === "swap1", `กดสกิล 1 แล้วออกท่าสลับอาวุธ (ได้ ${g.p1.moveId})`);
  ok(g.p1.alt === 1, "สลับตั้งแต่เฟรมแรกของท่า ไม่ต้องรอท่าจบ");
  ok(g.pickMove(g.p1, inp()) === "gjab1", "ถือปืนแล้ว -> ปุ่มเดิมได้ท่าปืน");
  ok(g.pickMove(g.p1, inp({ right:1 })) === "gside", "กดทิศ -> ท่าเดินยิง");
  ok(g.pickMove(g.p1, inp({ up:1 })) === "gup", "กดขึ้น -> ยิงสวนคนกระโดด");
  ok(g.pickMove(g.p1, inp({ down:1 })) === "gdown", "กดลง -> ยิงต่ำ");

  // ท่าอากาศตั้งใจไม่มีชุดปืน — ลอยอยู่ต้องใช้แส้เสมอ ปืนเป็นอาวุธของคนที่ยืนกับพื้น
  g.p1.onGround = false;
  for (const [i, want] of [[inp(), "nair"], [inp({ right:1 }), "sair"], [inp({ down:1 }), "dair"]])
    ok(g.pickMove(g.p1, i) === want, `ลอยอยู่ยังได้ท่าแส้ (${want})`);
  g.p1.onGround = true;

  // กดอีกทีสลับกลับ — เป็นสวิตช์ ไม่ใช่ตัวนับเวลา
  for (let i = 0; i < 90; i++) g.step(inp(), inp());
  g.step(inp({ skill1:1, p:{ skill1:1 } }), inp());
  ok(g.p1.alt === 0, "กดอีกทีกลับมาถือแส้");

  // คูลดาวน์ต้องมี ไม่งั้นกดรัวสลับเป็นท่าหนีฟรีที่ไม่มีราคา
  const cd = CHARACTERS.alecto.skillCd[0];
  ok(cd >= 30 && cd <= 120, `คูลดาวน์สลับอาวุธสั้นแต่ไม่ฟรี (${cd} เฟรม)`);
}

// ── เริ่มยกใหม่ต้องกลับมาถือแส้ ──
// ถ้าไม่ล้าง สองเครื่องที่ต่อเน็ตกันจะเริ่มยกด้วยอาวุธคนละชุดทันทีที่มีใครแพ้หนึ่งยก
{
  const g = mk(150);
  g.step(inp({ skill1:1, p:{ skill1:1 } }), inp());
  ok(g.p1.alt === 1, "สลับเป็นปืนแล้ว");
  g.resetPositions();
  ok(g.p1.alt === 0 && g.p2.alt === 0, "รีเซ็ตยกแล้วกลับมาถือแส้ทั้งคู่");
}

// ── ปืนยิงได้ไกลกว่าที่แส้เอื้อมถึงมาก ──
//
// นี่คือเหตุผลทั้งหมดที่ต้องมีชุดที่สอง: ตอนโดนไล่ต้อน เธอถอยออกมายิงได้
// ถ้ากระสุนไปไม่ถึงตรงที่แส้ไปไม่ถึง ก็ไม่มีเหตุผลให้สลับ
{
  const reach = (alt) => {
    const g = mk(350); g.p1.alt = alt;
    for (let i = 0; i < 90; i++) g.step(inp(i % 30 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp());
    return 100 - g.p2.hp;
  };
  const whip = reach(0), gun = reach(1);
  ok(whip === 0, `ระยะ 350 px แส้เอื้อมไม่ถึงเลย (${whip} ดาเมจ)`);
  ok(gun > 0, `แต่กระสุนถึง (${gun} ดาเมจ)`);
}

// ── แต่แส้ต้องเจ็บกว่าชัดเจนในระยะที่ตัวเองถนัด ──
// ไม่งั้นปืนคือของที่ดีกว่าทุกทาง แล้วสวิตช์ก็ไม่ใช่การเลือก
{
  const chain = (alt) => {
    const g = mk(90); g.p1.alt = alt;
    for (let i = 0; i < 120; i++) g.step(inp(i % 14 === 0 ? { attack:1, p:{ attack:1 } } : {}), inp());
    return 100 - g.p2.hp;
  };
  const whip = chain(0), gun = chain(1);
  ok(whip > gun, `ประชิดแล้วแส้เจ็บกว่าปืนชัดเจน (${whip} เทียบ ${gun})`);

  const M = CHARACTERS.alecto.moves;
  const whipSum = M.jab1.dmg + M.jab2.dmg + M.jab3.dmg;
  const gunSum = M.gjab1.shotDmg + M.gjab2.shotDmg + M.gjab3.shotDmg;
  ok(whipSum > gunSum * 1.5, `ดาเมจทั้งชุด: แส้ ${whipSum} เทียบปืน ${gunSum}`);
  ok(["gjab1", "gjab2", "gjab3", "gside", "gup", "gdown"].every((k) => !M[k].lash),
    "ท่าปืนไม่ติดตรารอยแส้เลยสักท่า — ตราเป็นของแส้อย่างเดียว");
}

// ── ท่าปืนบนพื้นต้องเดินยิงได้จริง ──
{
  const M = CHARACTERS.alecto.moves;
  for (const k of ["gjab1", "gjab2", "gside"])
    ok(M[k].mobile > 0, `${k} ขยับได้ระหว่างยิง (${M[k].mobile})`);
  ok(!M.gjab3.mobile, "ไม้จบปักเท้ายิง ไม่ใช่เดินยิง — ดันแรงสุดต้องมีราคา");
  ok(M.gside.mobile > M.gjab1.mobile, "ท่ากดทิศขยับได้มากที่สุดในชุด");

  // วัดจริง: กดถอยพลางยิงพลางแล้วต้องถอยไปได้จริง
  const g = mk(200); g.p1.alt = 1; const x0 = g.p1.x;
  for (let i = 0; i < 120; i++) g.step(inp({ left:1, ...(i % 16 === 0 ? { attack:1, p:{ attack:1 } } : {}) }), inp());
  ok(x0 - g.p1.x > 120, `ถอยพลางยิงพลางไปได้ ${Math.round(x0 - g.p1.x)} px`);

  // แต่ต้องช้ากว่าวิ่งเปล่าชัดเจน ไม่งั้นเป็นวิ่งยิงฟรี
  const g2 = mk(200); const x1 = g2.p1.x;
  for (let i = 0; i < 120; i++) g2.step(inp({ left:1 }), inp());
  ok((x0 - g.p1.x) < (x1 - g2.p1.x) * 0.75,
    `ช้ากว่าวิ่งเปล่า (${Math.round(x0 - g.p1.x)} เทียบ ${Math.round(x1 - g2.p1.x)} px)`);
}

// ── สกิล 2: ขว้างมอลอตอฟแล้วรัวลูกโม่ต่อ ──
//
// กดครั้งเดียวได้ทั้งกำแพงไฟกันทางและชุดกระสุนดันคนออก
{
  const g = mk(150);
  const seen = [], kinds = new Set();
  for (let i = 0; i < 160; i++) {
    g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
    if (g.p1.moveId && seen[seen.length-1] !== g.p1.moveId) seen.push(g.p1.moveId);
    for (const e of g.events) kinds.add(e.type);
  }
  ok(seen[0] === "fire1", `เริ่มด้วยท่าขว้าง (ได้ ${seen[0]})`);
  ok(kinds.has("firepool"), "เกิดกองไฟจริง");
  ok(seen.includes("shot1") && seen.includes("shot3"), `แล้วรัวลูกโม่ต่อจนจบชุด (${seen.join(" -> ")})`);
  ok(!seen.some((k) => k.startsWith("rifle")), "ไม่มีโหมดไรเฟิลชั่วคราวเหลืออยู่แล้ว");

  // คูลดาวน์ต้องยาว เพราะกดทีเดียวได้ทั้งกำแพงและระยะ
  const cd = CHARACTERS.alecto.skillCd[1];
  ok(cd > 240, `คูลดาวน์สกิล 2 ยาว (${cd} เฟรม)`);
}

// ── กลิ้งถอยก่อนแล้วยังได้ทั้งกองไฟและชุดกระสุน ──
{
  const g = mk(150);
  const seen = [];
  for (let i = 0; i < 200; i++) {
    g.step(i === 0 ? inp({ left:1, skill2:1, p:{ skill2:1 } }) : inp({ left:1 }), inp());
    if (g.p1.moveId && seen[seen.length-1] !== g.p1.moveId) seen.push(g.p1.moveId);
  }
  ok(seen[0] === "roll", `ถอยก่อน (ได้ ${seen[0]})`);
  ok(seen.includes("fire2") && seen.includes("shot1"), "แล้วยังได้ทั้งกองไฟและชุดกระสุน");
}

// ── ชุดกระสุนต้องดันคนออกจากหน้าจริง ──
// นี่คือเหตุผลที่สกิล 2 มีอยู่ — ทางออกตอนโดนยืนกดติดตัว
{
  const g = mk(80);
  const gap0 = g.p2.x - g.p1.x;
  for (let i = 0; i < 120; i++) g.step(inp(i === 0 ? { skill2:1, p:{ skill2:1 } } : {}), inp());
  ok(g.p2.x - g.p1.x > gap0, `ดันออกไกลขึ้นจริง (${Math.round(gap0)} -> ${Math.round(g.p2.x - g.p1.x)} px)`);
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

  const gun = CHARACTERS.alecto.moves.gjab1;
  ok(gun.mobile > 0, `ท่ายิงติดธง mobile (${gun.mobile})`);
  ok(gun.shots && gun.shotDmg > 0, "และยังยิงกระสุนของตัวเองตามเดิม — ท่าเดินไม่ได้แทนที่เฟรมเดตา");
}

// ── อยู่ในหมอกแล้วเดินทะลุคนอื่นได้ ──
//
// ปัญหาที่เจอตอนเล่นจริง: เธอหายตัวอยู่ในวงก็จริง แต่ร่างยังชนอยู่
// เดินหนีทีไรก็ดันคู่ต่อสู้ติดออกมาจากวงด้วย = ลากคนที่กำลังไล่ตามออกมาพร้อมกัน
// เหลือทางหนีทางเดียวคือโดดข้าม ซึ่งพลาดประเด็นของท่าที่ชื่อว่า "หายตัว"
{
  const through = (withDust) => {
    const g = mk(60);
    if (withDust) g.dust = { x: g.p1.x, owner: "p1", life: 400 };
    g.step(inp(), inp());                       // ให้ updateDust ตั้ง veil ก่อน
    const foe0 = g.p2.x;
    for (let i = 0; i < 40; i++) g.step(inp({ right: 1 }), inp());
    return { moved: g.p2.x - foe0, passed: g.p1.x > g.p2.x };
  };
  const solid = through(false), ghost = through(true);
  ok(solid.moved > 20, `ไม่มีหมอก: เดินชนคู่ต่อสู้ออกไป ${Math.round(solid.moved)} px`);
  ok(Math.abs(ghost.moved) < 5, `อยู่ในหมอก: คู่ต่อสู้ไม่ขยับเลย (${Math.round(ghost.moved)} px)`);
  ok(ghost.passed, "และเธอเดินผ่านทะลุไปอีกฝั่งได้จริง");
}

// ── ทะลุได้เฉพาะตอนจางอยู่ ไม่ใช่ตลอดไป ──
// veil ครอบทั้งตอนอยู่ในวงและช่วงจางต่อหลังออกจากวง = จังหวะหนีก็ทะลุได้
// แต่พอจางหมดต้องกลับมาชนกันตามปกติ ไม่งั้นกลายเป็นทะลุถาวรตั้งแต่ใช้อัลติครั้งแรก
{
  const g = mk(150);
  g.dust = { x: g.p1.x, owner: "p1", life: 400 };
  g.step(inp(), inp());
  ok(g.p1.veil > 0, "ในวง: จางอยู่");
  g.p1.x += 600;
  g.step(inp(), inp());
  ok(g.p1.veil > 0, "เพิ่งออกจากวง: ยังจางอยู่ (ยังทะลุได้)");
  g.dust = null;                     // วงหมดอายุ — ไม่งั้นคู่ต่อสู้ที่ยืนอยู่ในวงก็จางไปด้วย
  for (let i = 0; i < 60; i++) g.step(inp(), inp());
  ok(g.p1.veil === 0 && g.p2.veil === 0, "จางหมดทั้งคู่แล้ว");

  const foe0 = g.p2.x;
  g.p1.x = g.p2.x - 60; g.p1.facing = 1;
  for (let i = 0; i < 40; i++) g.step(inp({ right: 1 }), inp());
  ok(g.p2.x - foe0 > 20, `กลับมาชนกันตามปกติ (ดันออกไป ${Math.round(g.p2.x - foe0)} px)`);
}
