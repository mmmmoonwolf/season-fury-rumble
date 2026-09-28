// ทดสอบกลไกเฉพาะตัวของ DEAR — ไอพ่น · การลาก(+ปุ่มดิ้น) · โอเวอร์คล็อก · อัลติ METEOR
// รัน: node tools/tests/momus.test.mjs   (จากโฟลเดอร์ game)
//
// ชื่อไฟล์ยังเป็น momus เพราะ **`id` ของตัวละครยังเป็น 'momus'** ซึ่งห้ามเปลี่ยน —
// มันคือคีย์ของอัตลาส (`scmomus`) ชื่อไฟล์ชีตใน tools/ และค่าที่ส่งข้ามเน็ตตอนเลือกตัว
// (เวอร์ชันตัวตลกเดิมอยู่ที่ docs/archive/MOMUS_KIT_jester.md — ถอดออกหมดแล้ว)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS, KI_MAX, STAGE, PHYS } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const NONE = { left:0,right:0,up:0,down:0,jump:0,attack:0,block:0,run:0,skill1:0,skill2:0,skill3:0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
const mk = (gap = 160, foe = "helios") => {
  const g = new Game(); g.p1.char = "momus"; g.p2.char = foe;
  g.resetPositions(); g.p1.x = g.p2.x - gap; return g;
};
const run = (g, n, a = () => inp(), b = () => inp()) => {
  const ev = [];
  for (let i = 0; i < n; i++) { g.step(a(i), b(i)); ev.push(...g.events); }
  return ev;
};
const MAX = CHARACTERS.momus ? 3 : 3;   // BOOST_MAX — core ไม่ export ค่าภายใน

// ══ ชุดท่าใหม่ต้องเข้ามาแทนของเก่าจริง ไม่ใช่เหลือค้างทั้งสองชุด ═══════════════
{
  const m = CHARACTERS.momus;
  ok(m.label === 'DEAR', `ชื่อที่โชว์คือ DEAR (${m.label})`);
  ok(m.id === 'momus', "id ยังเป็น momus — เปลี่ยนแล้วอาร์ตหายทั้งตัวและเล่นกับแท็บเก่าไม่ได้");
  ok(m.boost === true, "ติดธงว่าใช้ระบบไอพ่น");
  ok(m.skills.join() === 'drag1,over1,meteor1', `สกิลสามช่องเป็นชุดใหม่ (${m.skills.join()})`);
  const gone = ['box1', 'box2', 'snap1', 'snap2', 'full1', 'full2', 'jab5', 'jab6']
    .filter((k) => m.moves[k]);
  ok(gone.length === 0, `ท่าของตัวตลกถูกถอดออกหมด (เหลือ: ${gone.join() || 'ไม่มี'})`);
  const g = new Game();
  ok(g.boxes === undefined && g.decoy === undefined,
    "กล่องระเบิดกับหุ่นแสดงแทนไม่มีอยู่ในซิมแล้ว");
  ok(g.p1.house === undefined, "ชั้น House ถูกถอดออกจากตัวละครแล้ว");
}

// ══ ไอพ่น: ต่อยโดนเพื่อเติม · แตะพื้นเติมเต็ม · มีเพดานต่อหนึ่งช่วงลอย ═══════════
{
  const g = mk();
  ok(g.p1.boost === MAX, `เริ่มมาไอพ่นเต็ม (${g.p1.boost}/${MAX})`);

  // ใช้ไปแล้วต้องลด
  g.p1.onGround = false; g.p1.y = STAGE.groundY - 200; g.p1.jumpsLeft = 0;
  const before = g.p1.boost;
  g.doJump(g.p1, inp());
  ok(g.p1.boost === before - 1, `ดับเบิลจัมพ์หมดแล้วกระโดดต่อได้ กินไอพ่นหนึ่งขีด (${before} -> ${g.p1.boost})`);

  // ไอพ่นหมดแล้วกระโดดต่อไม่ได้ — ต้องร่วงลงพื้น ซึ่งคือราคาของตัวละครทั้งตัว
  g.p1.boost = 0; g.p1.jumpsLeft = 0; g.p1.onGround = false;
  ok(g.doJump(g.p1, inp()) === false, "ไอพ่นหมดแล้วกระโดดต่อไม่ได้");

  // แตะพื้น = เติมเต็ม ไม่มีทางตัน
  g.p1.onGround = false; g.p1.y = STAGE.groundY - 30; g.p1.vy = 8;
  run(g, 20);
  ok(g.p1.onGround && g.p1.boost === MAX, `แตะพื้นแล้วเติมเต็มทันที (${g.p1.boost}/${MAX})`);
}

// ── ต่อยโดนคืนขีด แต่โดนบล็อกไม่คืน ──
//
// ถ้าโดนบล็อกก็คืน = ตีใส่คนที่กันอยู่เฉย ๆ ก็เติมน้ำมันได้ไม่จำกัด
// ซึ่งลบเงื่อนไข "ห้ามพลาด" ที่เป็นราคาทั้งหมดของตัวละครทิ้ง
{
  const g = mk(70);
  g.p1.boost = 1; g.p1.onGround = false; g.p1.y = STAGE.groundY - 120;
  g.p2.onGround = false; g.p2.y = STAGE.groundY - 120;
  run(g, 30, () => inp({ attack: 1, p: { attack: 1 } }));
  ok(g.p1.boost > 1, `ต่อยโดนแล้วได้ไอพ่นคืน (${g.p1.boost})`);

  // ต้องตรึงให้ลอยอยู่ตลอด ไม่งั้นแตะพื้นแล้วเติมเต็มเอง แล้วด่านนี้จะวัดคนละเรื่อง
  const b = mk(70);
  b.p1.boost = 1;
  for (let i = 0; i < 30; i++) {
    b.p1.onGround = false; b.p1.y = STAGE.groundY - 120; b.p1.vy = 0;
    b.step(inp({ attack: 1, p: { attack: 1 } }), inp({ block: 1 }));
  }
  ok(b.p1.boost === 1, `ตีใส่คนที่กันอยู่ไม่ได้ไอพ่นคืน (${b.p1.boost})`);
}

// ── เพดานต่อหนึ่งช่วงลอย — ชั้นกันคอมโบอากาศไม่รู้จบ ──
{
  const g = mk(70);
  g.p1.boost = 0; g.p1.boostGain = 0;
  g.p1.onGround = false; g.p1.y = STAGE.groundY - 200;
  for (let i = 0; i < 10; i++) g.gainBoost(g.p1);
  ok(g.p1.boost <= 2, `ลอยอยู่คืนได้มากสุดสองขีด (${g.p1.boost})`);
  g.p1.onGround = true;
  for (let i = 0; i < 10; i++) g.gainBoost(g.p1);
  ok(g.p1.boost === MAX, `อยู่บนพื้นไม่ติดเพดาน (${g.p1.boost}/${MAX})`);
}

// ══ สกิล 1: ไถลาก แล้วทุบ — และ **ต้องดิ้นหลุดได้** ═══════════════════════════
//
// ลากไกลแปลว่าคนโดนนั่งมือเปล่าอยู่หลายสิบเฟรม ซึ่งเป็นความรู้สึกที่แย่ที่สุดในเกมต่อสู้
{
  const g = mk(80);
  const ev = run(g, 14, () => inp({ skill1: 1, p: { skill1: 1 } }));
  ok(ev.some((e) => e.type === 'grab'), "ไถผ่านแล้วคว้าติด");
  ok(g.p2.carriedBy === g.p1.id, `คนโดนถูกผูกไว้กับคนลาก (${g.p2.carriedBy})`);
  ok(g.p1.carrying.includes(g.p2.id), "และคนลากรู้ว่ากำลังลากใครอยู่");

  // ตำแหน่งต้องตามไปด้วยจริง ไม่ใช่แค่ติดธง
  const dx0 = Math.abs(g.p2.x - g.p1.x);
  run(g, 8);
  ok(Math.abs(Math.abs(g.p2.x - g.p1.x) - dx0) < 8, "ถูกลากไปด้วย ระยะห่างคงที่");

  // สุดทางแล้วทุบ — คนที่ยังถูกลากอยู่กินเต็ม
  const hp0 = g.p2.hp;
  const slam = run(g, 60);
  ok(slam.some((e) => e.type === 'slam'), "สุดทางแล้วทุบพื้นจริง");
  ok(g.p2.hp < hp0 - 10, `คนที่ถูกลางอยู่กินหมัดทุบเต็ม (${hp0} -> ${g.p2.hp})`);
  ok(!g.p2.carriedBy, "ทุบแล้วปล่อย ไม่ลากค้าง");
}

// ── ปุ่มดิ้น: รัวปุ่มแล้วหลุดก่อนถึงปลายทาง กินแค่ดาเมจตอนคว้า ──
{
  const g = mk(80);
  run(g, 12, () => inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g.p2.carriedBy === g.p1.id, "คว้าติดก่อน");
  const hp0 = g.p2.hp;
  // รัวปุ่มตีทุกเฟรม — mashPressed อ่านจากบิต "เพิ่งกด" เหมือนท่ารัวของ Helios
  const ev = run(g, 40, () => inp(), () => inp({ p: { attack: 1 } }));
  ok(ev.some((e) => e.type === 'breakOut'), "รัวปุ่มแล้วหลุดจริง");
  ok(!g.p2.carriedBy, "หลุดแล้วไม่ถูกลากต่อ");
  const escaped = hp0 - g.p2.hp;

  // ไม่ดิ้นเลย = กินเต็ม — พิสูจน์ว่าข้อบนไม่ได้ผ่านเพราะหมัดทุบไม่ทำงาน
  const q = mk(80);
  run(q, 12, () => inp({ skill1: 1, p: { skill1: 1 } }));
  const qhp = q.p2.hp;
  run(q, 60);
  const full = qhp - q.p2.hp;
  ok(full > 10, `ไม่ดิ้นเลยกินเต็ม (${full} ดาเมจ)`);
  // หลุดแล้วยังกินคลื่นตามพื้นได้ถ้ายืนอยู่ข้าง ๆ — หนีหมัดทุบพ้น ไม่ได้หนีคลื่นพ้น
  ok(escaped < full / 2, `ดิ้นหลุดแล้วเจ็บน้อยกว่าครึ่ง (${escaped} เทียบ ${full})`);
}

// ── 2v2: ไถผ่านสองคนแล้วหารดาเมจ ไม่งั้นสกิล 1 แรงกว่าอัลติ ──
{
  const g = new Game(); g.setRoster(4);
  for (const f of g.fighters) f.ai = false;
  g.fighters[0].char = 'momus';
  g.resetPositions();
  // เอาคู่ต่อสู้สองคนมายืนซ้อนกันข้างหน้า
  g.fighters[1].x = g.fighters[0].x + 80;
  g.fighters[3].x = g.fighters[0].x + 90;
  const hp = g.fighters.map((f) => f.hp);
  run(g, 90, () => inp({ skill1: 1, p: { skill1: 1 } }));
  const took = g.fighters.map((f, i) => hp[i] - f.hp);
  ok(took[1] > 0 && took[3] > 0, `จับได้ทั้งสองคน (${took[1]} · ${took[3]})`);

  const solo = mk(80);
  run(solo, 90, () => inp({ skill1: 1, p: { skill1: 1 } }));
  const one = 100 - solo.p2.hp;
  ok(took[1] < one, `จับสองคนแล้วคนละน้อยกว่าจับคนเดียว (${took[1]} < ${one})`);
}

// ══ สกิล 2 OVERCLOCK: เกราะทุกท่า · หมัดแรงขึ้น · ล้างสถานะ · **บล็อกไม่ได้** ═══
{
  const g = mk();
  g.p1.burn = 60; g.p1.lash = 3;
  run(g, 10, () => inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g.p1.overclock > 0, `บัฟติดแล้ว (เหลือ ${g.p1.overclock} เฟรม)`);
  ok(g.p1.burn === 0 && g.p1.lash === 0, "ล้างไฟกับรอยแส้ที่ติดอยู่ทิ้งตอนกด");

  // เกราะติด **ทุกท่า** ไม่ใช่เฉพาะท่าที่ประกาศเกราะไว้เอง
  g.p1.move = null; g.p1.moveId = null; g.p1.setState('idle');
  g.startMove(g.p1, 'jab1', 1);
  ok(g.p1.armorLeft > 0, `ท่าจิ้มธรรมดาก็มีเกราะระหว่างติดบัฟ (${g.p1.armorLeft})`);

  // บล็อกไม่ได้ — นี่คือราคาของเกราะ
  const b = mk();
  run(b, 10, () => inp({ skill2: 1, p: { skill2: 1 } }));
  run(b, 20, () => inp({ block: 1 }));
  ok(b.p1.state !== 'block' && b.p1.state !== 'blockcrouch',
    `ติดบัฟแล้วกันไม่ได้เลย (state=${b.p1.state})`);

  // หมดเวลาแล้วต้องกลับมากันได้ และเกราะต้องหาย
  b.p1.overclock = 1;
  run(b, 3);
  ok(b.p1.overclock === 0, "หมดเวลาแล้วบัฟหลุด");
  run(b, 10, () => inp({ block: 1 }));
  ok(b.p1.state === 'block', `หมดบัฟแล้วกลับมากันได้ (state=${b.p1.state})`);
}

// ── หมัดแรงขึ้นจริง วัดจากเลือดที่หายไป ไม่ใช่จากตัวเลขในตาราง ──
{
  const plain = mk(70);
  const hp0 = plain.p2.hp;
  run(plain, 20, () => inp({ attack: 1, p: { attack: 1 } }), () => inp());
  const base = hp0 - plain.p2.hp;

  const buff = mk(70);
  buff.p1.overclock = 300;
  const hp1 = buff.p2.hp;
  run(buff, 20, () => inp({ attack: 1, p: { attack: 1 } }), () => inp());
  const boosted = hp1 - buff.p2.hp;
  ok(base > 0 && boosted > base, `ติดบัฟแล้วหมัดแรงขึ้นจริง (${base} -> ${boosted})`);
}

// ══ อัลติ METEOR: อมตะขาขึ้น · จับขึ้นฟ้า · อัดพื้นแล้วมีคลื่น ═════════════════
{
  const g = mk(80);
  g.p1.ki = KI_MAX;
  run(g, 2, () => inp({ skill3: 1, p: { skill3: 1 } }));
  ok(g.p1.invuln > 0, `อมตะตั้งแต่เฟรมแรกของขาขึ้น (invuln ${g.p1.invuln})`);
  // หมัดที่คว้าติดทำให้เกิด hitstop ซึ่งแช่ moveF ไว้หลายเฟรม แรงส่งขึ้นจึงมาทีหลัง
  run(g, 20);
  ok(g.p2.carriedBy === g.p1.id, "คว้าคนข้างหน้าติดขึ้นไปด้วย");
  ok(!g.p1.onGround && g.p1.y < STAGE.groundY - 40,
    `พุ่งขึ้นจริง (y ${Math.round(g.p1.y)} · vy ${g.p1.vy.toFixed(1)})`);

  const hp0 = g.p2.hp;
  const ev = run(g, 200);
  ok(ev.some((e) => e.type === 'slam'), "ลงมาอัดพื้นจริง");
  ok(g.p2.hp < hp0 - 15, `คนที่ถูกจับกินเต็ม (${hp0} -> ${g.p2.hp})`);
}

// ── คลื่นโดน **เฉพาะคนที่ยืนอยู่บนพื้น** — นั่นคือเหตุผลที่อีกฝั่งต้องกระโดดหนี ──
//
// ทั้งสองเคสวางเป้าไว้ที่ระยะเดียวกัน (+200) ซึ่งอยู่ **นอกกรอบคว้าของขาขึ้น** แต่ **ในรัศมีคลื่น**
// ถ้าวางใกล้กว่านี้ เป้าจะโดนหมัดคว้าติดขึ้นฟ้าไปด้วย แล้วเลือดที่หายจะไม่ได้มาจากคลื่นอีกต่อไป
const waveTest = (airborne) => {
  const g = new Game(); g.setRoster(4);
  for (const f of g.fighters) f.ai = false;
  g.fighters[0].char = 'momus';
  g.resetPositions();
  g.fighters[0].ki = KI_MAX;
  const t = g.fighters[3];
  const tx = g.fighters[0].x + 200;
  t.x = tx;
  const hp0 = t.hp;
  for (let i = 0; i < 200; i++) {
    if (airborne) { t.x = tx; t.onGround = false; t.y = STAGE.groundY - 260; t.vy = 0; }
    g.step(inp({ skill3: 1, p: { skill3: 1 } }), inp());
  }
  return [hp0, t.hp];
};
{
  const [hp0, hp1] = waveTest(false);
  ok(hp1 < hp0, `คนที่ยืนพื้นข้าง ๆ กินคลื่น (${hp0} -> ${hp1})`);
  const [hp2, hp3] = waveTest(true);
  ok(hp3 === hp2, `คนที่ลอยอยู่ไม่โดนคลื่น (${hp2} -> ${hp3})`);
}

// ── อัลติกดสวนได้ตอนโดนต้อน — อมตะขาขึ้นคือสิ่งที่ทำให้มันมีค่าทั้งยก ──
//
// อัลติที่กดได้เฉพาะตอนกำลังชนะคืออัลติที่ไม่มีใครกด
{
  const g = mk(60);
  g.p1.ki = KI_MAX;
  const hp0 = g.p1.hp;
  // อีกฝั่งรัวตีใส่ตลอด — ขาขึ้นต้องไม่โดนสักที
  run(g, 20, (i) => inp(i === 0 ? { skill3: 1, p: { skill3: 1 } } : {}),
    () => inp({ attack: 1, p: { attack: 1 } }));
  ok(g.p1.hp === hp0, `โดนรัวใส่ตลอดขาขึ้นแล้วไม่เสียเลือดเลย (${hp0} -> ${g.p1.hp})`);
}

// ── ไม่มีท่าไหนแตะเลย์เอาต์เวทีอีกแล้ว ──
//
// อัลติเดิมวาร์ปขึ้น "ชั้นบนสุด" ซึ่งพังทันทีที่เวทีเปลี่ยนจากห้าชั้นเหลือสามชั้น
// (ชั้นบนสุดกลายเป็นสองแท่น ต้องมากำหนดกติกาตัดสินใหม่) ชุดใหม่ต้องไม่ผูกกับ STAGE เลย
{
  const fs = await import("fs");
  const src = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");
  ok(!/warpStage/.test(src), "ไม่มี warpStage หลงเหลือในซิมแล้ว");
  const blk = src.slice(src.indexOf('const MOMUS_MOVES'), src.indexOf('const MOMUS_SKILLS'));
  ok(!/STAGE\./.test(blk), "ตารางท่าของ DEAR ไม่อ้าง STAGE เลยสักท่า");
}
