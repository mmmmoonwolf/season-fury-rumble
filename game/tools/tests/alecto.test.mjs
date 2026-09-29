// ทดสอบกลไกเฉพาะตัวของ KUNJAE — เส้นแบ่งระยะ · ตราล็อกเป้า · ตอกหมุด · อัลติยิงทะลุ
// รัน: node tools/tests/alecto.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์ยังเป็น alecto เพราะ **`id` ของตัวละครยังเป็น 'alecto'** ซึ่งห้ามเปลี่ยน —
// มันคือคีย์ของอัตลาส (`scalecto`) ชื่อไฟล์ชีตใน tools/ และค่าที่ส่งข้ามเน็ตตอนเลือกตัว
// (เวอร์ชันแส้/ไรเฟิลเดิมอยู่ที่ docs/archive/ALECTO_KIT_whipgun.md — ถอดออกหมดแล้ว)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, KI_MAX, STAGE } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 100, foe = "helios") => {
  const g = new Game(); g.p1.char = "alecto"; g.p2.char = foe;
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};
const run = (g, n, a = () => inp(), b = () => inp()) => {
  const ev = [];
  for (let i = 0; i < n; i++) { g.step(a(i), b(i)); ev.push(...g.events); }
  return ev;
};

// ══ ชุดสกิลใหม่ต้องเข้ามาแทนของเก่าจริง ไม่ใช่เหลือค้างทั้งสองชุด ═══════════════
{
  const c = CHARACTERS.alecto;
  ok(c.label === 'KUNJAE', `ชื่อที่โชว์คือ KUNJAE (${c.label})`);
  ok(c.id === 'alecto', "id ยังเป็น alecto — เปลี่ยนแล้วอาร์ตหายทั้งตัวและเล่นกับแท็บเก่าไม่ได้");
  ok(c.skills.join() === 'pin1,shot1,line1', `สกิลสามช่องเป็นชุดใหม่ (${c.skills.join()})`);
  ok(c.rangeSwap === true, "ติดธงว่าสลับอาวุธตามระยะ");
  const gone = ['swap1', 'fire1', 'fire2', 'dust1', 'dust2'].filter((k) => c.moves[k]);
  ok(gone.length === 0, `ท่าของชุดเดิมถูกถอดออกหมด (${gone.join(',') || 'ครบ'})`);
}

// ══ เส้นแบ่งระยะ ═══════════════════════════════════════════════════════════
{
  // ใกล้ = หาง
  const near = mk(120);
  run(near, 3);
  ok(near.p1.alt === false, `ยืนใกล้แล้วถืออาวุธชุดหาง (alt=${near.p1.alt})`);

  // ไกล = ปืน
  const far = mk(400);
  run(far, 3);
  ok(far.p1.alt === true, `ยืนไกลแล้วสลับเป็นปืนเอง (alt=${far.p1.alt})`);

  // ปุ่มสลับด้วยมือต้องไม่เหลืออยู่แล้ว — กดสกิล 1 ต้องออกท่าตอกหมุด ไม่ใช่สลับอาวุธ
  const g = mk(120);
  run(g, 4, (i) => (i < 2 ? inp({ skill1: 1, p: { skill1: 1 } }) : inp()));
  ok(g.p1.moveId === 'pin1', `กดสกิล 1 ได้ท่าตอกหมุด ไม่ใช่ปุ่มสลับอาวุธ (${g.p1.moveId})`);
}

// ── ช่วงคาบเกี่ยว: อยู่ระหว่างสองเส้นแล้วต้องค้างชุดเดิมไว้ ──
//
// **ข้อนี้คือจุดที่ดีไซน์นี้พังได้จริง** ถ้าใช้เส้นเดียว คนยืน 205 ขยับนิดเดียวเป็น 195
// ท่าจะเปลี่ยนใต้มือทุกครั้งที่เดินไปมา = ความรู้สึก "คุมไม่ได้" ไม่ใช่ "วัดระยะ"
{
  const g = mk(400);
  run(g, 3);
  ok(g.p1.alt === true, "เริ่มที่ระยะปืน");
  g.p1.x = g.p2.x - 200;           // เดินเข้ามาอยู่กลางช่วงคาบเกี่ยว
  run(g, 5);
  ok(g.p1.alt === true, "เดินเข้ามาในช่วงคาบเกี่ยวแล้วยังถือปืนอยู่ ไม่สลับ");
  g.p1.x = g.p2.x - 170;           // พ้นเส้นในแล้ว
  run(g, 3);
  ok(g.p1.alt === false, "พ้นเส้นในถึงจะสลับเป็นหาง");
  g.p1.x = g.p2.x - 200;           // ถอยกลับมาในช่วงคาบเกี่ยว
  run(g, 5);
  ok(g.p1.alt === false, "ถอยกลับเข้าช่วงคาบเกี่ยวแล้วยังถือหางอยู่ ไม่สลับกลับ");
}

// ── ลอยอยู่ต้องใช้หางเสมอไม่ว่าระยะเท่าไหร่ ──
// ปืนเป็นอาวุธของคนที่ยืนกับพื้น ท่าอากาศจึงไม่อยู่ในตารางแปลงชื่อตั้งแต่แรก
{
  const g = mk(400);
  run(g, 3);
  ok(g.p1.alt === true, "อยู่ระยะปืน");
  ok(!CHARACTERS.alecto.altMoves.nair && !CHARACTERS.alecto.altMoves.sair,
    "ท่าอากาศไม่มีชุดปืน ลอยอยู่จึงใช้หางเสมอ");
}

// ══ ตราล็อกเป้า — หางติด ปืนเก็บ ═══════════════════════════════════════════
{
  // หางติดตรา
  const w = mk(110);
  run(w, 80, (i) => (i % 12 === 0 ? inp({ attack: 1, p: { attack: 1 } }) : inp()));
  ok(w.p2.lash > 0, `ฟาดหางโดนแล้วได้ตรา (${w.p2.lash} ชั้น)`);
  ok(w.p1.lash === 0, "ตราอยู่ที่คนโดน ไม่ใช่คนฟาด");

  // ปืนไม่ติดตรา
  const gun = mk(400);
  run(gun, 60, (i) => (i % 12 === 0 ? inp({ attack: 1, p: { attack: 1 } }) : inp()));
  ok(gun.p2.lash === 0, `ปืนไม่ติดตรา (${gun.p2.lash})`);
}

// ── ยิงโดนคนมีตรา = เจ็บกว่า และตราหายไปหนึ่งดวง ──
{
  const shoot = (marks) => {
    const g = mk(400);
    run(g, 3);
    g.p2.lash = marks;
    const hp0 = g.p2.hp;
    // ต้องเผื่อเวลาให้กระสุนบินถึงด้วย ไม่ใช่แค่เวลาที่ท่าออก (400 px ใช้ราว 25 เฟรม)
    const ev = run(g, 55, (i) => (i < 2 ? inp({ attack: 1, p: { attack: 1 } }) : inp()));
    return { dmg: hp0 - g.p2.hp, left: g.p2.lash, cashed: ev.filter((e) => e.type === 'cash').length };
  };
  const bare = shoot(0), marked = shoot(3);
  ok(bare.dmg > 0 && marked.dmg > bare.dmg,
    `ยิงโดนคนมีตราเจ็บกว่า (${bare.dmg} -> ${marked.dmg})`);
  ok(marked.left < 3, `กินตราไปตามจำนวนนัดที่โดน (เหลือ ${marked.left} จาก 3)`);
  ok(marked.cashed > 0 && bare.cashed === 0, "มีอีเวนต์กินตราเฉพาะตอนเป้ามีตรา");
}

// ══ สกิล 1 ตอกหมุด ═════════════════════════════════════════════════════════
{
  // โดนตอนลอยอยู่ = ติดสถานะ
  const air = mk(110);
  air.p2.onGround = false; air.p2.y = STAGE.groundY - 150; air.p2.vy = 0;
  const ev = run(air, 24, (i) => (i < 2 ? inp({ skill1: 1, p: { skill1: 1 } }) : inp()),
    () => { air.p2.vy = Math.min(air.p2.vy, 0); return inp(); });
  ok(ev.some((e) => e.type === 'pin'), "ฟาดโดนคนที่ลอยอยู่แล้วติดตอกหมุด");
  ok(air.p2.pinned > 0, `ติดสถานะจริง (เหลือ ${air.p2.pinned} เฟรม)`);

  // โดนตอนยืนพื้น = ท่าหางธรรมดา ไม่ติด
  const gnd = mk(110);
  const ev2 = run(gnd, 24, (i) => (i < 2 ? inp({ skill1: 1, p: { skill1: 1 } }) : inp()));
  ok(!ev2.some((e) => e.type === 'pin'), "โดนตอนยืนพื้นไม่ติดตอกหมุด — ท่านี้ลงโทษการอยู่บนฟ้า");
  ok(gnd.p2.lash > 0, "แต่ยังติดตราตามปกติ ไม่ใช่ท่าตายเวลาเจอคนยืนพื้น");
}

// ── ติดตอกหมุดแล้วกระโดดไม่ได้ แต่ต้องเดินได้ ──
//
// กันแค่กระโดด ไม่กันการเคลื่อนที่แนวนอน — กันหมดคือปิดตัวละครทั้งดุ้น 45 เฟรม
// ซึ่งขัดกฎที่ใช้มาทั้งโปรเจกต์ว่า **ต้องมีทางดิ้นเสมอ**
{
  const g = mk(300);
  g.p2.pinned = 45;
  const y0 = g.p2.y, x0 = g.p2.x;
  run(g, 20, () => inp(), () => inp({ jump: 1, right: 1, p: { jump: 1 } }));
  ok(g.p2.y >= y0 - 2, `ติดตอกหมุดแล้วกระโดดไม่ขึ้น (y ${Math.round(y0)} -> ${Math.round(g.p2.y)})`);
  ok(Math.abs(g.p2.x - x0) > 20, `แต่ยังเดินหนีออกข้างได้ (x เปลี่ยน ${Math.round(Math.abs(g.p2.x - x0))})`);

  // หมดเวลาแล้วต้องกระโดดได้อีก
  g.p2.pinned = 0;
  const y1 = g.p2.y;
  run(g, 10, () => inp(), () => inp({ jump: 1, p: { jump: 1 } }));
  ok(g.p2.y < y1 - 10, "หมดเวลาแล้วกระโดดได้เหมือนเดิม");
}

// ══ สกิล 3 (อัลติ) DEAD MAN'S LINE — ยิงทะลุ ═══════════════════════════════
{
  const g = new Game(); g.setRoster(4);
  for (const f of g.fighters) f.ai = false;
  g.fighters[0].char = 'alecto';
  g.resetPositions();
  g.fighters[0].ki = KI_MAX;
  // วางศัตรูสองคนเรียงกันในแนวเดียวกัน คนหลังอยู่ไกลกว่าคนหน้า
  const near = g.fighters[1], far = g.fighters[3];
  near.x = g.fighters[0].x + 260; far.x = g.fighters[0].x + 480;
  const hpN = near.hp, hpF = far.hp;
  run(g, 60, (i) => (i < 2 ? inp({ skill3: 1, p: { skill3: 1 } }) : inp()));
  ok(near.hp < hpN, `คนหน้าโดน (${hpN} -> ${near.hp})`);
  ok(far.hp < hpF, `คนหลังโดนด้วย — กระสุนทะลุจริง (${hpF} -> ${far.hp})`);
}

// ── อัลติกินตราทั้งหมดที่เขามี ไม่ใช่ดวงเดียวแบบปืนธรรมดา ──
{
  const g = mk(300);
  run(g, 3);
  g.p1.ki = KI_MAX;
  g.p2.lash = 4;
  const hp0 = g.p2.hp;
  run(g, 60, (i) => (i < 2 ? inp({ skill3: 1, p: { skill3: 1 } }) : inp()));
  ok(g.p2.lash === 0, `อัลติกินตราหมดทุกดวง (เหลือ ${g.p2.lash})`);
  ok(hp0 - g.p2.hp >= 25, `ตราเต็มแล้วอัลติเจ็บหนัก (${hp0} -> ${g.p2.hp})`);
}

// ── ยิงคนไม่มีตราก็ยังได้ดาเมจฐาน ไม่ใช่กดแล้วเสียหลอดฟรี ──
{
  const g = mk(300);
  run(g, 3);
  g.p1.ki = KI_MAX;
  const hp0 = g.p2.hp;
  run(g, 60, (i) => (i < 2 ? inp({ skill3: 1, p: { skill3: 1 } }) : inp()));
  ok(hp0 - g.p2.hp >= 8, `จับไม่ติดตราก็ยังคุ้ม (${hp0} -> ${g.p2.hp})`);
}

// ── ท่าถอยยังผูกกับชื่อสกิลใหม่ ──
{
  const g = mk(120);
  const seen = [];
  run(g, 20, (i) => (i < 2 ? inp({ skill1: 1, left: 1, p: { skill1: 1 } }) : inp({ left: 1 })));
  ok(CHARACTERS.alecto.backstep.pin1 === 'hop', "ตอกหมุดมีท่าถอยผูกไว้");
  ok(CHARACTERS.alecto.backstep.shot1 === 'roll', "สับไกมีท่าถอยผูกไว้");
  void seen; void g;
}
