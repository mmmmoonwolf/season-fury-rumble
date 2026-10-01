// ทดสอบกลไกเฉพาะตัวของ KUNJAE — บันไดสามขั้น: ตะขอ -> ทุบลง -> ปักหางให้หนามผุด
// รัน: node tools/tests/alecto.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์ยังเป็น alecto เพราะ **`id` ของตัวละครยังเป็น 'alecto'** ซึ่งห้ามเปลี่ยน —
// มันคือคีย์ของอัตลาส (`scalecto`) ชื่อไฟล์ชีตใน tools/ และค่าที่ส่งข้ามเน็ตตอนเลือกตัว
//
// **รีเวิร์ครอบสาม** สองรอบก่อน (แส้/ไรเฟิลสลับด้วยมือ · เส้นแบ่งระยะ + หมุดระเบิด)
// ถูกถอดออกหมดแล้ว เวอร์ชันแส้/ไรเฟิลอยู่ที่ docs/archive/ALECTO_KIT_whipgun.md
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
const press = (k) => (i) => (i < 2 ? inp({ [k]: 1, p: { [k]: 1 } }) : inp());

// ══ ชุดใหม่ต้องเข้ามาแทนของเก่าจริง ไม่ใช่เหลือค้างทั้งสองชุด ═══════════════════
{
  const c = CHARACTERS.alecto;
  ok(c.label === 'KUNJAE', `ชื่อที่โชว์คือ KUNJAE (${c.label})`);
  ok(c.id === 'alecto', "id ยังเป็น alecto — เปลี่ยนแล้วอาร์ตหายทั้งตัวและเล่นกับแท็บเก่าไม่ได้");
  ok(c.skills.join() === 'hook1,slam1,quill1', `สกิลสามช่องเป็นบันไดสามขั้น (${c.skills.join()})`);

  // ของสองรอบก่อนต้องไม่เหลือค้าง — ทั้งชุดท่าและธงที่ฉากอ่าน
  const gone = ['swap1', 'fire1', 'fire2', 'dust1', 'dust2', 'pin1', 'shot1', 'shot2', 'shot3',
    'line1', 'gjab1', 'gjab2', 'gjab3', 'gside', 'gup', 'gdown'].filter((k) => c.moves[k]);
  ok(gone.length === 0, `ท่าของชุดเดิมถูกถอดออกหมด (${gone.join(',') || 'ครบ'})`);
  ok(!c.rangeSwap && !c.altMoves, "ไม่มีเส้นแบ่งระยะกับชุดท่าที่สองแล้ว");
}

// ══ ปืนเป็นท่าตีปกติทั้งชุด ═══════════════════════════════════════════════════
{
  const c = CHARACTERS.alecto;
  const normals = ['jab1', 'jab2', 'jab3', 'side', 'up', 'down', 'nair', 'sair', 'dair'];
  const noShot = normals.filter((k) => !c.moves[k]?.shots);
  ok(noShot.length === 0, `ท่าปกติทั้งเก้าท่าเป็นกระสุนจริง (${noShot.join(',') || 'ครบ'})`);

  // ยิงได้จากระยะที่ท่าประชิดของใครก็เอื้อมไม่ถึง — นี่คือเหตุผลที่ปืนเป็นท่าปกติ
  const g = mk(420);
  const hp0 = g.p2.hp;
  run(g, 60, (i) => (i < 2 ? inp({ attack: 1, p: { attack: 1 } }) : inp()));
  ok(hp0 - g.p2.hp > 0, `ยิงโดนจากระยะ 420 px (${hp0 - g.p2.hp} ดาเมจ)`);

  // ชุดแย็บต้องไม่ต่ำจนยิงแล้วไม่รู้สึกว่ายิง — ของเดิมรวมกันได้ 5 ซึ่งต่ำสุดในเกม
  const chain = ['jab1', 'jab2', 'jab3'].reduce((t, k) => t + c.moves[k].shotDmg, 0);
  ok(chain >= 10, `ชุดแย็บรวมกัน ${chain} ดาเมจ (เดิม 5 ซึ่งต่ำสุดในโรสเตอร์)`);

  // ยิงกลางอากาศได้แล้ว — เดิม "ลอยอยู่ต้องใช้แส้เสมอ" เพราะปืนเป็นอาวุธของคนยืนพื้น
  //
  // **`nair` ยิงตรง จึงเป็นไม้อากาศต่ออากาศ ไม่ใช่ไม้ลงใส่คนยืนพื้น** —
  // ลอยอยู่ 120 px แล้วยิงตรงจะผ่านหัวคนที่ยืนพื้นไปเฉย ๆ ซึ่งถูกแล้วตามฟิสิกส์
  // ไม้ที่ใช้ลงใส่คนยืนพื้นคือ `dair` ที่กระสุนพุ่งลงชัน
  const a2a = mk(300);
  a2a.p1.onGround = false; a2a.p1.y = STAGE.groundY - 120; a2a.p1.vy = 0;
  a2a.p2.onGround = false; a2a.p2.y = STAGE.groundY - 120; a2a.p2.vy = 0;
  const hpA = a2a.p2.hp;
  run(a2a, 50, (i) => (i < 2 ? inp({ attack: 1, p: { attack: 1 } }) : inp()),
    () => { a2a.p1.vy = Math.min(a2a.p1.vy, 0); a2a.p2.vy = Math.min(a2a.p2.vy, 0); return inp(); });
  ok(hpA - a2a.p2.hp > 0, `nair ยิงอากาศต่ออากาศได้ (${hpA - a2a.p2.hp} ดาเมจ)`);

  // ยืนเกือบตรงหัวเขา — กระสุนลงชัน 69 องศา จึงตกใกล้ตัวเธอ ไม่ใช่ไกลออกไป
  const a2g = mk(70);
  a2g.p1.onGround = false; a2g.p1.y = STAGE.groundY - 150; a2g.p1.vy = 0;
  const hpG = a2g.p2.hp;
  run(a2g, 50, (i) => (i < 2 ? inp({ down: 1, attack: 1, p: { attack: 1 } }) : inp({ down: 1 })),
    () => { a2g.p1.vy = Math.min(a2g.p1.vy, 0); return inp(); });
  ok(hpG - a2g.p2.hp > 0, `dair ยิงลงใส่คนยืนพื้นได้ (${hpG - a2g.p2.hp} ดาเมจ)`);
}

// ══ ขั้น 1 ตะขอ — ลากเข้ามาหาเรา ═══════════════════════════════════════════════
{
  const g = mk(220);
  const gap0 = g.p2.x - g.p1.x;
  run(g, 30, press('skill1'));
  const gap1 = g.p2.x - g.p1.x;
  ok(gap1 < gap0, `ตะขอลากเขาเข้ามาใกล้ขึ้น (${Math.round(gap0)} -> ${Math.round(gap1)} px)`);
  ok(g.p2.hp < g.p2.maxHp, "และเจ็บด้วย ไม่ใช่ท่าลากเปล่า ๆ");

  // เอื้อมไกลกว่าท่าประชิดของทุกตัว แต่สั้นกว่ากระสุนของเธอเองมาก — ต้องเดินเข้าไปก่อน
  const far = mk(420);
  const x0 = far.p2.x;
  run(far, 30, press('skill1'));
  ok(far.p2.x === x0, "ยืนไกลเกินระยะตะขอแล้วลากไม่ติด — ไม่ใช่ปุ่มกดข้ามเวที");
}

// ══ ขั้น 2 ทุบลง — ตรึงเขาไว้กับพื้น ════════════════════════════════════════════
{
  // **ข้อสำคัญที่สุดของขั้นนี้: ต้องติดตอนเขายืนพื้นด้วย**
  // ถ้าติดเฉพาะคนที่ลอยอยู่ (เงื่อนไขเดิมของท่าตอกหมุดเก่า) บันไดจะขาดตรงกลางพอดี
  // เพราะตะขอลากเขาเข้ามาแล้วเขายืนพื้น -> ทุบไม่ติดสถานะ -> กระโดดพ้นหนามของอัลติ
  const gnd = mk(110);
  const ev = run(gnd, 26, press('skill2'));
  ok(ev.some((e) => e.type === 'pin'), "ทุบโดนคนที่ยืนพื้นแล้วติดสถานะกระโดดไม่ได้");
  ok(gnd.p2.pinned > 0, `ตัวนับเดินจริง (เหลือ ${gnd.p2.pinned} เฟรม)`);

  const air = mk(110);
  air.p2.onGround = false; air.p2.y = STAGE.groundY - 150; air.p2.vy = 0;
  const ev2 = run(air, 26, press('skill2'), () => { air.p2.vy = Math.min(air.p2.vy, 0); return inp(); });
  ok(ev2.some((e) => e.type === 'pin'), "ทุบโดนคนที่ลอยอยู่ก็ติดเหมือนกัน");

  // ติดแล้วกระโดดไม่ขึ้นจริง
  const g = mk(110);
  run(g, 26, press('skill2'));
  const y0 = g.p2.y;
  run(g, 20, () => inp(), () => inp({ jump: 1, p: { jump: 1 } }));
  ok(g.p2.y >= y0 - 2, `ติดแล้วกระโดดไม่ขึ้น (y ${Math.round(y0)} -> ${Math.round(g.p2.y)})`);
  // แต่ต้องมีทางดิ้นเสมอ — กันแค่การกระโดด ไม่ได้ปิดตัวละครเขาทั้งดุ้น
  ok(g.p2.pinned > 0 && ['idle','walk','run','crouch'].includes(g.p2.state) || g.p2.stun > 0,
    "ยังเดิน/ยืน/ย่อได้ ไม่ได้ถูกล็อกทั้งตัว");
}

// ══ ขั้น 3 อัลติ — หนามผุดวิ่งออกสองข้าง ═══════════════════════════════════════
{
  const g = mk(300);
  g.p1.ki = KI_MAX;
  const ev = run(g, 80, press('skill3'));
  const q = ev.filter((e) => e.type === 'quill');
  ok(q.length > 0, `หนามผุดขึ้นจริง (${q.length} ต้น)`);

  // ออกสองข้างพร้อมกัน — ท่านี้จึงไม่ต้องหันหน้าถูกทาง ซึ่งสำคัญตอนโดนขนาบใน 4 คน
  const L = q.filter((e) => e.x < g.p1.x), R = q.filter((e) => e.x > g.p1.x);
  ok(L.length > 0 && R.length > 0, `ออกทั้งซ้ายและขวา (ซ้าย ${L.length} · ขวา ${R.length})`);

  // **ไล่ออกไปเป็นคลื่น ไม่ใช่โผล่พรึบเดียว** — คนที่ยืนไกลต้องเห็นมันวิ่งมาแล้วหนีทัน
  const far = Math.max(...q.map((e) => Math.abs(e.x - g.p1.x)));
  ok(far > 300 && far <= 420, `ต้นไกลสุดอยู่ที่ ${Math.round(far)} px (ตั้งไว้ 400 ต่อข้าง)`);
  const order = q.map((e) => e.i);
  ok(order[0] === 0 && Math.max(...order) === 4, `ลำดับต้นไล่จาก 0 ถึง ${Math.max(...order)}`);
}
{
  // โดนหนามแล้วเจ็บจริง และเจ็บหลายต้นถ้ายืนอยู่ในแนว
  const g = mk(160);
  g.p1.ki = KI_MAX;
  const hp0 = g.p2.hp;
  const ev = run(g, 90, press('skill3'));
  ok(hp0 - g.p2.hp > 0, `ยืนในแนวหนามแล้วเจ็บ (${hp0 - g.p2.hp} ดาเมจ)`);
  // **คนหนึ่งคนกินหนามต้นเดียว ไม่ใช่ลูกโซ่** — เคยออกแบบไว้ว่าโดนแล้วเด้งไปเจอต้นถัดไป
  // แต่วัดจริงแล้วแรงกระแทก 6 พาไปได้ราว 20 px ใน 4 เฟรม ขณะที่ต้นถัดไปอยู่ห่าง 80 px
  // จะทำให้ต่อกันได้ต้องดันแรงจนท่ากลายเป็นท่าเขี่ยคนออกนอกเวที ซึ่งไม่ใช่สิ่งที่ต้องการ
  // ค่าของอัลติจึงอยู่ที่ **กว้าง 800 px สองข้าง โดนทุกคนที่ยืนพื้น** ไม่ใช่ดาเมจต่อคน
  const hits = ev.filter((e) => e.type === 'hit' && !e.self);
  ok(hits.length === 1 && hits[0].dmg >= 14, `คนเดียวกินหนามต้นเดียว แต่เต็ม ๆ (${hits[0]?.dmg} ดาเมจ)`);
}
{
  // **ทางรอดคือลอยอยู่** ข้อนี้คือกติกาที่ทำให้ขั้น 2 มีเหตุผลอยู่
  const g = mk(160);
  g.p1.ki = KI_MAX;
  g.p2.onGround = false; g.p2.y = STAGE.groundY - 260; g.p2.vy = 0;
  const hp0 = g.p2.hp;
  run(g, 60, press('skill3'), () => { g.p2.vy = Math.min(g.p2.vy, 0); return inp(); });
  ok(g.p2.hp === hp0, "ลอยอยู่เหนือหนามแล้วไม่โดน — ทางรอดมีจริง");
}
{
  // กดเปล่า ๆ ไม่มีใครอยู่ในแนวก็ยังออกท่า ไม่ใช่ปุ่มที่ตายถ้าคอมโบไม่ติด
  const g = mk(900);
  g.p1.ki = KI_MAX;
  const ev = run(g, 80, press('skill3'));
  ok(ev.filter((e) => e.type === 'quill').length > 0, "กดตอนไม่มีใครใกล้ก็ยังปล่อยหนามออกมา");
}

// ══ บันไดต่อกันจริง: ตะขอ -> ทุบลง -> อัลติ ══════════════════════════════════════
//
// **ข้อนี้สำคัญที่สุดในไฟล์** ข้ออื่นทดสอบทีละขั้น ข้อนี้กดสามปุ่มเรียงกันแล้วดูว่า
// ขั้นที่ 2 ปิดทางรอดของขั้นที่ 3 ได้จริงไหม ซึ่งคือเหตุผลทั้งหมดที่บันไดนี้เป็นบันได
{
  const g = mk(240);
  g.p1.ki = KI_MAX;
  run(g, 30, press('skill1'));                 // ตะขอ: ลากเข้ามา
  const gap = Math.round(g.p2.x - g.p1.x);
  run(g, 28, press('skill2'));                 // ทุบลง: ตรึงกับพื้น
  ok(g.p2.pinned > 0, `ลากเข้ามาเหลือ ${gap} px แล้วทุบติดสถานะ (เหลือ ${g.p2.pinned} เฟรม)`);
  const hp0 = g.p2.hp;
  // กดกระโดดรัวตลอดช่วงอัลติ — ถ้าสถานะทำงาน เขาจะขึ้นไม่ได้และต้องกินหนาม
  const ev = run(g, 70, press('skill3'), () => inp({ jump: 1, p: { jump: 1 } }));
  ok(ev.some((e) => e.type === 'quill'), "อัลติออกต่อได้");
  ok(hp0 - g.p2.hp > 0, `เขากดกระโดดหนีแต่ขึ้นไม่ได้ จึงกินหนามเต็ม ๆ (${hp0 - g.p2.hp} ดาเมจ)`);
}

// ══ ท่าถอยยังผูกกับสกิลชุดใหม่ ═════════════════════════════════════════════════
{
  const c = CHARACTERS.alecto;
  ok(c.moves.hop.autoChain === 'hook1' && c.moves.roll.autoChain === 'slam1',
    "กดทิศถอยค้างแล้วได้ท่าถอยก่อน แล้วต่อเข้าสกิลเอง");
  ok(c.moves.roll.iframes != null, "กลิ้งถอยมีช่วงอมตะ — ท่าป้องกันตัวท่าเดียวของเธอ");
  ok(c.moves.quill1.iframes != null, "อัลติมีอมตะช่วงปักหาง — กดสวนตอนโดนต้อนได้");
}

// ── เฟรมสะบัดคืนต้องไม่ค้างครึ่งท่า ────────────────────────────────────────
//
// ชุดปืนทุกท่าเฟรมที่ 3 เป็นท่า "เอนหลังตามแรงถีบ ปืนสะบัดขึ้น" ซึ่งถูกตามหลักอนิเมชัน
// แต่ตัวเลือกเฟรมอ่านจาก `phase()` ตรง ๆ เฟรมนั้นจึงค้างตลอดช่วง recovery ที่ยาว 8-14 เฟรม
// = กินครึ่งท่า เล่นจริงเห็นเธอเอนถอยหลังค้างทุกนัด ทั้งที่ควรสะบัดแล้วตั้งลำกลับ
// แก้ที่ฝั่งวาดด้วย `snapBack` ไม่ต้องเจนอาร์ตใหม่ — เฟรมถูกอยู่แล้ว ผิดแค่ระยะเวลาที่ค้าง
{
  const fs = await import("fs");
  const GUNS = ['jab1', 'jab2', 'jab3', 'side', 'up', 'down', 'nair', 'sair', 'dair'];
  const mv = CHARACTERS.alecto.moves;
  const bad = GUNS.filter((k) => !(mv[k].snapBack > 0));
  ok(bad.length === 0, `ชุดปืนทุกท่าตั้ง snapBack ไว้${bad.length ? " — ขาด " + bad.join(",") : ""}`);
  // ตั้งเกินความยาว recovery = ไม่มีผลอะไรเลย ซึ่งเป็นความพังแบบเงียบที่สุด
  const dud = GUNS.filter((k) => mv[k].snapBack >= mv[k].recovery);
  ok(dud.length === 0,
    `snapBack สั้นกว่า recovery ทุกท่า จึงมีผลจริง${dud.length ? " — ไม่มีผล: " + dud.join(",") : ""}`);
  // เฟรมสะบัดต้องกินไม่เกินหนึ่งในสามของท่า ไม่งั้นก็กลับไปเป็นปัญหาเดิม
  const hog = GUNS.filter((k) => {
    const m = mv[k];
    return m.snapBack / (m.startup + m.active + m.recovery) > 0.34;
  });
  ok(hog.length === 0, `เฟรมสะบัดกินไม่เกิน 1/3 ของท่า${hog.length ? " — เกิน: " + hog.join(",") : ""}`);

  const scene = fs.readFileSync(
    new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(/f\.move\.snapBack/.test(scene) && /i === 3 && f\.move\.snapBack/.test(scene),
    "ตัวเลือกเฟรมของฝั่งวาดอ่าน snapBack จริง (ไม่ใช่ตั้งไว้เฉย ๆ)");
}

// ── วิ่งย่อ: กรอบเตี้ยลงตอนวิ่งเต็มสปีด ───────────────────────────────────
//
// คลิปวิ่งของเธอโน้มตัวต่ำกว่าคนอื่นชัด (วัดจากอัตลาส: ยืน 238 วิ่ง 180 = 76%
// ขณะที่ MARCH 99% · DEAR 95%) แต่กรอบยังสูงเต็มเหมือนยืน
//
// **ข้อสำคัญ: ใช้ `crouchH` (88) ไม่ได้ ถึงมันจะตรงกับอาร์ตเป๊ะ** เพราะขอบล่าง
// ของกรอบโจมตีที่สูงที่สุดทั้งเกมอยู่ที่ 76 px เหนือเท้า กรอบ 88 จึงไม่หลบอะไรเลย
// เทสต์ข้อแรกล็อกข้อเท็จจริงนี้ไว้ ถ้าวันหลังมีใครตั้ง runLow กลับไปที่ 88 จะแดงทันที
{
  const hi = Math.max(...Object.values(CHARACTERS)
    .flatMap((c) => Object.values(c.moves))
    .filter((m) => !m.noHit && m.hb?.h)
    .map((m) => -(m.hb.y + m.hb.h)));
  const rl = CHARACTERS.alecto.runLow;
  ok(rl > 0 && rl < hi, `กรอบตอนวิ่ง (${rl}) ต่ำกว่าขอบล่างของท่าที่ตีสูงสุด (${hi}) จึงหลบได้จริง`);
  ok(rl >= 60, `แต่ไม่ต่ำเกินไป (${rl}) — ที่ 60 จะหลบได้ 29 จาก 88 ท่า ซึ่งมากเกินไป`);
}

// ── วิ่งลอดใต้ไม้กดดันของ MARCH ได้จริง แต่ยืนเฉย ๆ กินเต็ม ─────────────────
//
// **เธอต้องวิ่ง *เข้าหา* เขา ไม่ใช่วิ่งหนี** — ถ้าให้วิ่งหนี เทสต์จะเขียวเพราะเธอ
// ออกนอกระยะ ไม่ใช่เพราะกรอบเตี้ยลง ซึ่งเป็นการพิสูจน์ผิดตัวทั้งที่ตัวเลขดูดี
// วิ่งเข้าหาแปลว่าเธออยู่ในระยะแน่นอน เหลือเหตุผลเดียวที่จะไม่โดนคือกรอบลอดใต้กรอบตี
{
  const hitsWhile = (running) => {
    const g = new Game(); g.p1.char = 'helios'; g.p2.char = 'alecto';
    g.resetPositions(); g.p1.x = g.p2.x - 70;
    const hp0 = g.p2.hp;
    let nearest = 999;
    for (let i = 0; i < 40; i++) {
      const her = running ? inp({ left: 1, run: 1 }) : inp();   // left = เข้าหาเขา
      g.step(i < 2 ? inp({ attack: 1, p: { attack: 1 } }) : inp(), her);
      nearest = Math.min(nearest, Math.abs(g.p2.x - g.p1.x));
    }
    return { dmg: hp0 - g.p2.hp, nearest: Math.round(nearest) };
  };
  const still = hitsWhile(false), low = hitsWhile(true);
  ok(still.dmg > 0, `ยืนเฉย ๆ โดน jab ของ MARCH เต็ม (${still.dmg})`);
  ok(low.nearest <= still.nearest,
    `ตอนวิ่งเธอเข้าใกล้กว่าตอนยืน (${low.nearest} vs ${still.nearest}) — อยู่ในระยะแน่นอน`);
  ok(low.dmg === 0, `แต่กรอบลอดใต้ jab ไปได้ ไม่โดนเลย (${low.dmg})`);
}

// ── แต่พอหยุดตี/หยุดกัน กรอบต้องกลับมาเต็มทันที — ไม่ใช่ท่ายืนกินฟรี ──
{
  const g = new Game(); g.p1.char = 'helios'; g.p2.char = 'alecto'; g.resetPositions();
  run(g, 6, () => inp(), () => inp({ right: 1, run: 1 }));
  const low = g.p2.h;
  run(g, 6, () => inp(), () => inp({ right: 1, run: 1, attack: 1, p: { attack: 1 } }));
  ok(low === CHARACTERS.alecto.runLow, `กำลังวิ่ง กรอบเตี้ย (${low})`);
  ok(g.p2.h > low, `พอออกท่าตี กรอบกลับมาเต็มทันที (${g.p2.h})`);
}
