// ทดสอบแกนระบบต่อสู้ของโหมด SCRAMBLE (src/modes/scramble/core.js)
// รัน: node tools/tests/scramble.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
//
// แกนนี้ยกมาจาก prototype ทั้งดุ้นตามที่ SCRAMBLE_HANDOFF.md สั่ง ("port it as-is") เพราะค่าทุกตัว
// ผ่าน playtest มาแล้ว เทสต์ชุดนี้จึงมีหน้าที่ "ล็อกพฤติกรรมที่อนุมัติแล้ว" ไม่ใช่ออกแบบใหม่
// ถ้าเทสต์ไหนแดงหลังแก้โค้ด แปลว่า game feel เปลี่ยนไปจากที่เคย playtest ผ่าน ไม่ใช่แค่เทสต์พัง
//
// แกนไม่แตะ Phaser/DOM เลย เดินด้วย step(input) ทีละเฟรม จึงรันตรง ๆ ใน node ได้ ไม่ต้องมี stub
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, PHYS, MOVES, STAGE, ACTIONABLE } = await import(G + "/core.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

const NONE = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0, skill1: 0, skill2: 0, skill3: 0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });
/** เดิน n เฟรมด้วย input เดิม (เฟรมแรกเท่านั้นที่นับเป็น "เพิ่งกด") */
const run = (g, n, o = {}) => { for (let i = 0; i < n; i++) g.step(inp(i === 0 ? o : { ...o, p: {} })); };

// ── เริ่มเกม ──
{
  const g = new Game();
  ok(g.p1.hp === 100 && g.p2.hp === 100, "เริ่มมา HP เต็มทั้งคู่");
  ok(g.p1.onGround && g.p2.onGround, "ทั้งคู่ยืนบนพื้น");
  ok(g.p1.facing === 1 && g.p2.facing === -1, "หันหน้าเข้าหากัน");
  ok(g.p1.x < g.p2.x, "ผู้เล่นอยู่ซ้าย หุ่นอยู่ขวา");
}

// ── เคลื่อนที่บนพื้น: วิ่งอย่างเดียว ไม่มีท่าเดินแล้ว ──
// เปลี่ยนตามที่ผู้เล่นสั่ง ("ไม่ต้องมีปุ่มเดินละ เอาเป็นวิ่งอย่างเดียว") — เดิมต้องกด Shift หรือ
// ดับเบิลแท็ปถึงจะวิ่ง ซึ่งบนมือถือแปลว่าต้องกดสองปุ่มพร้อมกันตลอดเวลาที่อยากขยับเร็ว
{
  const g = new Game();
  run(g, 40, { right: 1 });
  ok(Math.abs(g.p1.vx - PHYS.run) < 0.01, `กดขวาเฉย ๆ ก็วิ่งเต็มความเร็ว run = ${PHYS.run} (ได้ ${g.p1.vx.toFixed(2)})`);
  ok(g.p1.state === "run" && g.p1.facing === 1, "อยู่ในสถานะ run และหันขวา (ไม่มีสถานะ walk อีกแล้ว)");

  // กด/ไม่กดปุ่มวิ่ง ต้องได้เท่ากัน — ปุ่มวิ่งถูกถอดออกจากหน้าจอแล้ว ต้องไม่มีผลอะไรหลงเหลือ
  const g2 = new Game();
  run(g2, 40, { right: 1, run: 1 });
  ok(Math.abs(g2.p1.vx - g.p1.vx) < 0.01, "กดปุ่มวิ่งค้างไว้ด้วยก็ไม่เร็วขึ้น (ปุ่มวิ่งไม่มีผลแล้ว)");
  ok(Math.abs(g2.p1.x - g.p1.x) < 0.01, "ระยะที่ไปได้เท่ากันเป๊ะ");

  run(g, 30, {}); // ปล่อยปุ่ม
  ok(g.p1.vx === 0 && g.p1.state === "idle", "ปล่อยปุ่มแล้วหยุดสนิทและกลับไป idle");
}

// ── ความเร็วต้องช้าลงกว่าของเดิม แต่ยังเร็วกว่าท่าเดินเก่า ──
// ผู้เล่นขอ "ปรับสปีดให้ช้าลง ไว้ค่อยทำปุ่ม dash ทีหลัง" — ค่านี้จึงต้องอยู่ระหว่างเดินเก่า (4.3)
// กับวิ่งเก่า (6.8) เพื่อเหลือช่วงให้ dash เป็นตัวเร่งในอนาคต
{
  ok(PHYS.run < 6.8, `ความเร็วเคลื่อนที่ช้าลงกว่าวิ่งเดิม 6.8 (ตอนนี้ ${PHYS.run})`);
  ok(PHYS.run > PHYS.walk, `ยังเร็วกว่าท่าเดินเดิม ${PHYS.walk} (ตอนนี้ ${PHYS.run})`);
}

// ── ดับเบิลแท็ป: กลไกยังอยู่เผื่อ dash ในอนาคต แต่ตอนนี้ต้องไม่ทำให้เร็วขึ้น ──
{
  const g = new Game();
  g.step(inp({ right: 1, p: { right: 1 } }));
  g.step(inp({}));
  g.step(inp({ right: 1, p: { right: 1 } })); // แท็ปที่สองภายใน dashWindow
  run(g, 40, { right: 1 });
  ok(Math.abs(g.p1.vx - PHYS.run) < 0.01, "ดับเบิลแท็ปแล้วความเร็วเท่าเดิม (ยังไม่มี dash)");

  const g2 = new Game();
  run(g2, 40, { right: 1 });
  ok(Math.abs(g2.p1.vx - g.p1.vx) < 0.01, "แท็ปรัว ๆ กับกดค้างเฉย ๆ ได้ความเร็วเท่ากัน");
}

// ── กระโดด: ความสูง, ดับเบิลจัมพ์, ปล่อยปุ่มแล้วเตี้ยลง ──
{
  const g = new Game();
  g.step(inp({ jump: 1, p: { jump: 1 } }));
  let apex = g.p1.y;
  for (let i = 0; i < 90; i++) { g.step(inp({ jump: 1 })); apex = Math.min(apex, g.p1.y); }
  const full = STAGE.groundY - apex;
  ok(full > 150 && full < 260, `กดกระโดดค้างได้ความสูงราว ${full.toFixed(0)}px`);
  ok(g.p1.onGround, "ตกกลับลงพื้นเองเมื่อจบ");

  // ปล่อยปุ่มทันที = กระโดดเตี้ยลง (variable jump height)
  const g2 = new Game();
  g2.step(inp({ jump: 1, p: { jump: 1 } }));
  let apex2 = g2.p2.y;
  apex2 = g2.p1.y;
  for (let i = 0; i < 90; i++) { g2.step(inp({})); apex2 = Math.min(apex2, g2.p1.y); }
  const short = STAGE.groundY - apex2;
  ok(short < full - 20, `ปล่อยปุ่มทันทีแล้วเตี้ยกว่าชัดเจน (${short.toFixed(0)}px เทียบ ${full.toFixed(0)}px)`);

  // ดับเบิลจัมพ์
  const g3 = new Game();
  g3.step(inp({ jump: 1, p: { jump: 1 } }));
  run(g3, 20, { jump: 1 });
  const before = g3.p1.y;
  g3.step(inp({ jump: 1, p: { jump: 1 } }));
  // vy เทียบตรง ๆ กับ dJumpV ไม่ได้ เพราะใน step เดียวกัน physics() บวกแรงโน้มถ่วงต่อทันที
  ok(g3.p1.jumpsLeft === 0, "ใช้สิทธิ์กระโดดกลางอากาศไปแล้ว (เหลือ 0)");
  ok(Math.abs(g3.p1.vy - (PHYS.dJumpV + PHYS.gravity)) < 0.01, `ได้แรงดีดขึ้นของดับเบิลจัมพ์ (vy=${g3.p1.vy.toFixed(2)})`);
  const vyAfterD = g3.p1.vy;
  g3.step(inp({ jump: 1, p: { jump: 1 } }));
  ok(g3.p1.vy > vyAfterD, "กดกระโดดครั้งที่สามกลางอากาศไม่ได้อีก (ตกต่อตามแรงโน้มถ่วง)");
  let apex3 = before;
  for (let i = 0; i < 90; i++) { g3.step(inp({ jump: 1 })); apex3 = Math.min(apex3, g3.p1.y); }
  ok(apex3 < before, "ดับเบิลจัมพ์แล้วขึ้นสูงกว่าจุดที่กด");
}

// ── คอมโบ 3 จังหวะ (jab -> cross -> finisher) ──
{
  const g = new Game();
  g.p1.x = g.p2.x - 70; // ยืนประชิดหุ่น
  run(g, 3);
  const seen = [];
  for (let i = 0; i < 100; i++) {
    g.step(inp(i % 14 === 0 ? { attack: 1, p: { attack: 1 } } : {}));
    if (g.p1.moveId && !seen.includes(g.p1.moveId)) seen.push(g.p1.moveId);
  }
  ok(
    seen[0] === "jab1" && seen.includes("jab2") && seen.includes("jab3"),
    `กดตีรัวได้คอมโบ 3 จังหวะตามลำดับ (ได้ ${seen.join(" -> ")})`
  );
  ok(g.p2.hp < 100, `หุ่นโดนจริง เหลือ HP ${g.p2.hp}`);
}

// ── ทิศที่กดตอนตี เลือกท่าคนละท่า ──
{
  const cases = [
    [{}, "jab1", "ตีเปล่า"],
    [{ right: 1 }, "side", "กดทิศ + ตี = Lunge Stab"],
    [{ up: 1 }, "up", "กดขึ้น + ตี = Rising Slash"],
    [{ down: 1 }, "down", "กดลง + ตี = Low Sweep"],
  ];
  for (const [dir, want, label] of cases) {
    const g = new Game();
    run(g, 2);
    g.step(inp({ ...dir, attack: 1, p: { attack: 1 } }));
    ok(g.p1.moveId === want, `${label} -> ${MOVES[want].label} (ได้ ${g.p1.moveId})`);
  }
  // กลางอากาศเป็นอีกชุดหนึ่ง
  const g = new Game();
  g.step(inp({ jump: 1, p: { jump: 1 } }));
  run(g, 5, { jump: 1 });
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  ok(g.p1.moveId === "nair", `ตีกลางอากาศ -> ${MOVES.nair.label} (ได้ ${g.p1.moveId})`);
}

// ── เฟรมเดต้า: startup / active / recovery ต้องตรงตามตาราง ──
// วัดจาก moveF ของท่าโดยตรง ไม่ใช่นับเฟรมที่ผ่านไปตั้งแต่กด เพราะใน step เดียวกันที่กดตี
// ลำดับคือ controlPlayer (เริ่มท่า moveF=0) -> physics -> advanceMove (moveF++) ทำให้พอจบ step
// แรก moveF เป็น 1 แล้ว นับเฟรมข้างนอกจึงเพี้ยนไปหนึ่งเสมอ
{
  const g = new Game();
  run(g, 2);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  const m = MOVES.jab1;
  const byFrame = new Map();
  for (let i = 0; i < m.startup + m.active + m.recovery + 2; i++) {
    if (g.p1.state === "attack") byFrame.set(g.p1.moveF, g.p1.phase());
    g.step(inp({}));
  }
  const at = (f) => byFrame.get(f);
  ok(at(m.startup - 1) === "startup", `moveF ${m.startup - 1} ยังเป็น startup (ได้ ${at(m.startup - 1)})`);
  ok(at(m.startup) === "active", `moveF ${m.startup} เปลี่ยนเป็น active พอดี (ได้ ${at(m.startup)})`);
  ok(at(m.startup + m.active - 1) === "active", "เฟรมสุดท้ายของ active ยังเป็น active");
  ok(at(m.startup + m.active) === "recovery", `หมด active แล้วเข้า recovery (ได้ ${at(m.startup + m.active)})`);
  ok(
    [...byFrame.values()].filter((v) => v === "active").length === m.active,
    `ช่วง active ยาว ${m.active} เฟรมตามตาราง`
  );
}

// ── hitbox โผล่เฉพาะช่วง active ──
{
  const g = new Game();
  run(g, 2);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  const m = MOVES.jab1;
  const framesWithHb = [];
  for (let i = 0; i < 40; i++) {
    if (g.p1.hitbox()) framesWithHb.push(g.p1.moveF);
    g.step(inp({}));
  }
  ok(framesWithHb[0] === m.startup, `hitbox โผล่ที่ moveF ${m.startup} พอดี (ได้ ${framesWithHb[0]})`);
  ok(framesWithHb.length === m.active, `hitbox อยู่ ${m.active} เฟรม (ได้ ${framesWithHb.length})`);
  ok(
    framesWithHb[framesWithHb.length - 1] === m.startup + m.active - 1,
    "hitbox หายไปทันทีที่หมดช่วง active ไม่ค้างเข้า recovery"
  );
}

// ── กันได้เฉพาะด้านหน้า และไม่เสีย HP ──
{
  const g = new Game();
  g.dummyMode = "block";
  g.p1.x = g.p2.x - 70;
  run(g, 60);           // ให้หุ่นเข้าท่ากันก่อน
  const hp = g.p2.hp;
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g, 25);
  ok(g.p2.hp === hp, "กันไว้แล้วไม่เสีย HP เลย (ไม่มี chip damage)");
}

// ── ป้องกันคอมโบไม่รู้จบ: ดาเมจลดลงเมื่อโดนต่อเนื่อง ──
{
  const g = new Game();
  g.p1.x = g.p2.x - 70;
  run(g, 3);
  const dmgs = [];
  let prev = g.p2.hp;
  for (let i = 0; i < 220; i++) {
    g.step(inp(i % 14 === 0 ? { attack: 1, p: { attack: 1 } } : {}));
    if (g.p2.hp < prev) { dmgs.push(prev - g.p2.hp); prev = g.p2.hp; }
  }
  ok(dmgs.length >= 3, `ตีติดหลายครั้งในคอมโบเดียว (${dmgs.length} ครั้ง)`);
  const scaled = g.p2.comboHits > 3 || dmgs.some((d, i) => i > 0 && d <= dmgs[0]);
  ok(scaled, `ดาเมจต่อครั้งไม่เพิ่มขึ้นเรื่อย ๆ มีการหารลด (${dmgs.join(", ")})`);
}

// ── กำแพงกั้นทั้งสองข้าง ออกนอกเวทีไม่ได้ (enclosed stage, no ring-out) ──
{
  const g = new Game();
  run(g, 400, { left: 1, run: 1 });
  ok(g.p1.x - PHYS.width / 2 >= STAGE.wallL - 0.01, `วิ่งชนกำแพงซ้ายแล้วหยุด ไม่หลุดเวที (x=${g.p1.x.toFixed(0)})`);
  const g2 = new Game();
  run(g2, 400, { right: 1, run: 1 });
  ok(g2.p1.x + PHYS.width / 2 <= STAGE.wallR + 0.01, `วิ่งชนกำแพงขวาแล้วหยุด (x=${g2.p1.x.toFixed(0)})`);
  ok(g2.p1.hp === 100, "ชนกำแพงไม่เสีย HP (ไม่มีตกเวที)");
}

// ── แพลตฟอร์มทะลุขึ้นได้ ยืนได้ และกดลง+กระโดดเพื่อทะลุลง ──
{
  const pl = STAGE.platforms[0];
  const g = new Game();
  g.p1.x = (pl.x1 + pl.x2) / 2;
  g.p1.y = pl.y - 120;   // เริ่มเหนือแพลตฟอร์ม
  g.p1.onGround = false;
  run(g, 60);
  ok(g.p1.onGround && Math.abs(g.p1.y - pl.y) < 1, `ตกลงมายืนบนแพลตฟอร์มได้ (y=${g.p1.y})`);

  g.step(inp({ down: 1, jump: 1, p: { jump: 1 } }));
  run(g, 40, { down: 1 });
  ok(g.p1.y > pl.y, "กดลง + กระโดด = ทะลุแพลตฟอร์มลงไปได้");
}

// ── tech: กด Block ก่อนแตะพื้นในหน้าต่างที่กำหนด = ไม่ล้ม ──
{
  // ไม่กด -> ล้ม
  const a = new Game();
  a.p1.x = a.p2.x - 70;
  run(a, 3);
  a.step(inp({ up: 1, attack: 1, p: { attack: 1 } })); // Rising Slash ดีดหุ่นลอย
  let landedState = null;
  for (let i = 0; i < 200 && !landedState; i++) {
    a.step(inp({}));
    if (a.p2.state === "knockdown" || a.p2.state === "tech" || a.p2.state === "techroll") landedState = a.p2.state;
  }
  ok(landedState === "knockdown", `ไม่กด tech แล้วล้มลงพื้น (ได้ ${landedState})`);

  // หุ่นตั้งเป็น tech in place -> ไม่ล้ม
  const b = new Game();
  b.dummyTech = "place";
  b.p1.x = b.p2.x - 70;
  run(b, 3);
  b.step(inp({ up: 1, attack: 1, p: { attack: 1 } }));
  let st = null;
  for (let i = 0; i < 200 && !st; i++) {
    b.step(inp({}));
    if (["knockdown", "tech", "techroll"].includes(b.p2.state)) st = b.p2.state;
  }
  ok(st === "tech", `ตั้งหุ่นให้ tech แล้วลงพื้นแบบไม่ล้ม (ได้ ${st})`);
}

// ── hitstop: ตอนภาพหยุด เฟรมของท่าต้องไม่เดินต่อ ──
// เช็คจาก hitstop "ก่อน" step ไม่ใช่หลัง เพราะเฟรมที่ตีโดน resolveHit ตั้ง hitstop ตอนท้าย step
// หลังจากตัวละครขยับไปแล้ว — ดูค่าหลัง step จะเข้าใจผิดว่าเฟรมนั้นควรนิ่งทั้งที่ยังไม่เริ่มหยุด
{
  const g = new Game();
  g.p1.x = g.p2.x - 70;
  run(g, 3);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  let frozenFrames = 0, movedWhileFrozen = 0;
  for (let i = 0; i < 40; i++) {
    const wasFrozen = g.p1.hitstop > 0;
    const before = { f: g.p1.moveF, x: g.p1.x, y: g.p1.y };
    g.step(inp({}));
    if (wasFrozen) {
      frozenFrames++;
      if (g.p1.moveF !== before.f || g.p1.x !== before.x || g.p1.y !== before.y) movedWhileFrozen++;
    }
  }
  ok(frozenFrames > 0, `ตีโดนแล้วเกิด hitstop จริง (${frozenFrames} เฟรม)`);
  ok(movedWhileFrozen === 0, "ทุกเฟรมที่อยู่ใน hitstop ตัวละครหยุดนิ่งสนิท ไม่ขยับและเฟรมท่าไม่เดิน");
}

// ── input buffer: กดตีก่อนพร้อมนิดหน่อย ต้องยังออกท่าให้ ──
{
  const g = new Game();
  run(g, 2);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  const m = MOVES.jab1;
  const total = m.startup + m.active + m.recovery;
  // กดตีอีกครั้งตอนท่าแรกยังไม่จบ (ก่อนจบ 3 เฟรม) — อยู่ในช่วง buffer
  run(g, total - 3);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g, 6);
  ok(g.p1.state === "attack", `กดตีก่อนท่าเดิมจบ ${PHYS.buffer} เฟรม ยังออกท่าต่อให้ (buffer)`);
}

// ── หุ่นฟื้น HP เองเมื่อปล่อยไว้ ──
{
  const g = new Game();
  g.p1.x = g.p2.x - 70;
  run(g, 3);
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g, 30);
  ok(g.p2.hp < 100, "ตีหุ่นจน HP ลด");
  run(g, 200);
  ok(g.p2.hp === 100, "ปล่อยไว้แล้วหุ่นฟื้น HP เต็มเอง (ห้องซ้อมไม่ต้องรีเซ็ตมือ)");
}

// ── reset กลับจุดเริ่ม ──
{
  const g = new Game();
  run(g, 60, { right: 1, run: 1 });
  g.p2.hp = 30;
  g.resetPositions();
  ok(g.p1.x === 420 && g.p2.x === 860, "กด reset แล้วกลับจุดเริ่มทั้งคู่");
  ok(g.p1.hp === 100 && g.p2.hp === 100, "และ HP กลับมาเต็ม");
}

// ── ตารางท่าครบและสมเหตุสมผล ──
{
  const ids = Object.keys(MOVES);
  // 9 ท่าตาม handoff + 4 จังหวะของสกิลแทงรัว (thrust1-4) ที่เพิ่มทีหลัง
  const HANDOFF = ["jab1","jab2","jab3","side","up","down","nair","sair","dair"];
  const missing = HANDOFF.filter((k) => !ids.includes(k));
  ok(missing.length === 0, `มีท่าตาม handoff ครบ 9 ท่า (ขาด ${missing.join(", ") || "ไม่มี"})`);
  ok(ids.length === 13, `รวมสกิลแทงรัว 4 จังหวะแล้วเป็น 13 ท่า (ได้ ${ids.length})`);
  const bad = ids.filter((k) => {
    const m = MOVES[k];
    return !(m.startup > 0 && m.active > 0 && m.recovery >= 0 && m.dmg > 0 && m.stun > 0 && m.hb && m.kb);
  });
  ok(bad.length === 0, `ทุกท่ามีเฟรมเดต้าครบ (startup/active/recovery/dmg/stun/hitbox/knockback) — ขาด: ${bad}`);
  ok(ACTIONABLE.has("idle") && !ACTIONABLE.has("hitstun"), "ตอนโดนตีอยู่สั่งงานไม่ได้ (hitstun ไม่อยู่ใน ACTIONABLE)");
}

// ── อาร์ต: atlas ต้องตรงกับที่ฉากคาดหวัง ──
// ฉากอ่าน meta (anchorX/feetY/standing/canvasW/H) ไปวางสไปรท์ให้ตรงกับ hurtbox
// ถ้าค่าหายหรือจำนวนเฟรมไม่ตรง สไปรท์จะไปโผล่ผิดที่/ขาดเฟรมโดยไม่มี error ให้เห็น
{
  const fs = await import("fs");
  const A = new URL("../../assets/characters/", import.meta.url);
  const atlas = JSON.parse(fs.readFileSync(new URL("scramble_nyx.json", A)));
  const meta = atlas.meta;

  for (const k of ["anchorX", "feetY", "standing", "canvasW", "canvasH"]) {
    ok(typeof meta[k] === "number", `meta.${k} มีอยู่และเป็นตัวเลข (${meta[k]})`);
  }
  ok(meta.feetY <= meta.canvasH, "ระดับเท้าอยู่ในแคนวาส ไม่ล้นออกไป");
  ok(meta.anchorX > 0 && meta.anchorX < meta.canvasW, "จุดยึดแนวนอนอยู่ในแคนวาส");

  // จำนวนเฟรมต้องตรงกับ nyxAnims ในฉาก — อ่านจากไฟล์ฉากจริง ไม่ hard-code ซ้ำ
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  // เจาะจงบรรทัด nyxAnims เท่านั้น — ในไฟล์มีตารางเวลาต่อรอบ { idle: 0.8, hurt: 0.5, ... }
  // อยู่ด้วย ถ้าจับกว้าง ๆ จะไปได้เลขจากตารางนั้นแทนแล้วเทสต์เพี้ยนโดยไม่รู้ตัว
  const animsLine = scene.match(/nyxAnims\s*=\s*\{([^}]*)\}/)[1];
  const declared = Object.fromEntries(
    [...animsLine.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
  ok(Object.keys(declared).length >= 3, `อ่านจำนวนเฟรมจากฉากได้ (${JSON.stringify(declared)})`);

  // ทุกท่าที่ฉากแม็พจาก state ของเอนจิ้น ต้องมีอยู่ใน nyxAnims จริง
  // แม็พไปหาท่าที่ไม่มี = เรียก play() ด้วยคีย์ที่ไม่ได้ลงทะเบียน Phaser จะเตือนแล้วไม่วาดอะไรเลย
  const mapped = [...scene.matchAll(/\{\s*run:\s*'run',[^}]*\}/g)][0]?.[0] ?? "";
  for (const [, anim] of mapped.matchAll(/:\s*'(\w+)'/g)) {
    ok(anim in declared, `state ที่แม็พไปท่า '${anim}' มีท่านั้นอยู่จริงใน nyxAnims`);
  }
  for (const [name, n] of Object.entries(declared)) {
    const have = Object.keys(atlas.frames).filter((f) => f.startsWith(name + "_")).length;
    ok(have === n, `ท่า ${name}: ฉากประกาศ ${n} เฟรม และ atlas มี ${have} เฟรม`);
    const missing = Array.from({ length: n }, (_, i) => `${name}_${i + 1}.png`).filter((f) => !atlas.frames[f]);
    ok(missing.length === 0, `ท่า ${name}: เฟรมเรียงครบ 1..${n} ไม่มีเลขขาด (ขาด ${missing})`);
  }

  ok(meta.size.w <= 4096 && meta.size.h <= 4096, `atlas ไม่เกินลิมิต GPU (${meta.size.w}x${meta.size.h})`);

  // ── ท่าโจมตี: ฉากเลือกเฟรมจาก phase() ของเอนจิ้น จึงต้องมีครบ 3 เฟรมต่อท่า ──
  // เฟรมหาย = setFrame() ด้วยชื่อที่ไม่มี Phaser จะเตือนแล้วค้างเฟรมเดิม ดูเหมือนท่าไม่ขยับ
  const attacks = [...scene.matchAll(/nyxAttacks = new Set\(\[([^\]]*)\]/g)][0][1]
    .split(",").map((x) => x.trim().replace(/["']/g, "")).filter(Boolean);
  ok(attacks.length > 0, `ฉากประกาศท่าโจมตีที่มีอาร์ต (${attacks})`);
  for (const id of attacks) {
    ok(MOVES[id] != null, `ท่าโจมตี '${id}' มีอยู่จริงใน MOVES ของเอนจิ้น`);
    const missing = [1, 2, 3].map((i) => `${id}_${i}.png`).filter((f) => !atlas.frames[f]);
    ok(missing.length === 0, `ท่า '${id}' มีครบ 3 เฟรม เงื้อ/ฟัน/ชัก (ขาด ${missing})`);
  }
  // phase() คืนได้แค่สามค่านี้ — ถ้าเอนจิ้นเพิ่มเฟสใหม่ ต้องมีเฟรมรองรับด้วย
  ok(
    /startup: 1, active: 2, recovery: 3/.test(scene),
    "ฉากแม็พ startup/active/recovery ไปเฟรม 1/2/3 ครบทุกเฟส"
  );
  const png = fs.statSync(new URL("scramble_nyx.png", A)).size;
  ok(png < 8e6, `ไฟล์ไม่ใหญ่เกินไปสำหรับโหลดผ่านเว็บ (${(png / 1e6).toFixed(1)} MB)`);

  // ขนาดที่วาดจริงต้องสมส่วนกับ hurtbox — ใหญ่เกินแล้วโดนตีจะงงว่าทำไมไม่โดน
  const SPRITE_H = Number(scene.match(/const SPRITE_H = (\d+)/)[1]);
  const ratio = SPRITE_H / PHYS.standH;
  ok(ratio > 1 && ratio < 1.25, `สไปรท์สูงกว่า hurtbox ${Math.round((ratio - 1) * 100)}% (ควรอยู่ราว 5-25%)`);
}

console.log("\nSCRAMBLE core: ported as-is from the prototype — this suite locks the playtested feel");

// ── เวทีกว้างเท่าผืนเกม (กันอาการ "เล่นแล้วไม่เต็มจอ") ──
// เดิมเวทีกว้างตายตัว 1280 ส่วนผืนเกมกว้างตามสัดส่วนจอ (1280-1920) ส่วนเกินถูกทาเป็นแถบมืด
// สองข้าง บนมือถือแนวนอนกว้างข้างละ ~180 px ซึ่งผู้เล่นเห็นเป็น "เกมไม่เต็มจอ"
{
  const { setStageWidth, STAGE_BASE_W } = await import(G + "/core.js");

  for (const w of [1280, 1558, 1920]) {
    const st = setStageWidth(w);
    ok(st.w === w, `ผืนเกมกว้าง ${w} -> เวทีกว้างตาม (ได้ ${st.w})`);
    ok(st.wallL === 40 && st.wallR === w - 40, `กำแพงอยู่ขอบจอทั้งสองข้าง (${st.wallL} / ${st.wallR})`);
    const dead = st.w - (st.wallR - st.wallL) - st.wallL * 2;
    ok(dead === 0, `ไม่เหลือแถบมืดนอกเวที (${dead}px)`);
  }

  // แพลตฟอร์มต้องเลื่อนตามให้อยู่กลางเวที ระยะระหว่างกันและความสูงห้ามเปลี่ยน
  // ไม่งั้นระยะกระโดด/คอมโบที่ playtest ไว้แล้วจะเพี้ยนไปเงียบ ๆ
  const base = setStageWidth(STAGE_BASE_W).platforms.map((p) => ({ ...p }));
  const wide = setStageWidth(1920).platforms.map((p) => ({ ...p }));
  const shift = (1920 - STAGE_BASE_W) / 2;
  let sameShape = true;
  for (let i = 0; i < base.length; i++) {
    if (wide[i].y !== base[i].y) sameShape = false;
    if (wide[i].x2 - wide[i].x1 !== base[i].x2 - base[i].x1) sameShape = false;
    if (wide[i].x1 - base[i].x1 !== shift) sameShape = false;
  }
  ok(sameShape, "แพลตฟอร์มเลื่อนไปกลางเวทีทั้งชุด ขนาด/ความสูง/ระยะห่างเท่าเดิมทุกอัน");

  const mid = setStageWidth(1920);
  const centre = (mid.platforms[0].x1 + mid.platforms[0].x2) / 2;
  ok(Math.abs(centre - mid.w / 2) < 1, `แพลตฟอร์มกลางยังอยู่กึ่งกลางเวที (${centre} เทียบ ${mid.w / 2})`);

  ok(setStageWidth(900).w === STAGE_BASE_W, "ผืนเกมแคบกว่าเวทีพื้นฐานก็ไม่ย่อเวทีลง (กำแพงจะทับตัวละคร)");
  setStageWidth(STAGE_BASE_W); // คืนค่าให้เทสต์อื่นที่รันต่อจากนี้
}

// ── ฉากต้องไม่เหลือโค้ดชดเชยขอบเวทีแบบเดิม ──
{
  const fs = await import("fs");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(!/\bpadX\b/.test(scene), "ฉากไม่ต้องเลื่อนกล้องชดเชยขอบเวทีอีกแล้ว (ไม่มี padX)");
  ok(/setStageWidth\(this\.sys\.game\.config\.width\)/.test(scene), "ฉากตั้งความกว้างเวทีจากผืนเกมจริง");
  ok(!/>Run</.test(scene), 'ไม่มีปุ่ม "Run" บนจอแล้ว (วิ่งเสมอ ไม่ต้องกด)');
  ok(/data-code="Digit1" data-slot="1"/.test(scene), 'มีปุ่มสกิล 1 บนจอ');
  ok(/data-code="Digit2" data-slot="2"/.test(scene), 'มีปุ่มสกิล 2 บนจอ');
  ok(/data-code="Digit3" data-slot="3"/.test(scene), 'มีปุ่มสกิล 3 บนจอ');
  ok(!/walk:\s*\d+/.test(scene.match(/nyxAnims\s*=\s*\{([^}]*)\}/)[1]), "ไม่ลงทะเบียนท่าเดินใน atlas อีกแล้ว");
}

// ── ของที่ฉากใช้จาก core.js ต้อง import มาครบ ──
// เทสต์ที่อ่านไฟล์เป็นข้อความอย่างเดียวจับไม่ได้: โค้ดที่เรียก setStageWidth() มีอยู่จริงในไฟล์
// แต่ถ้าลืมใส่ในบรรทัด import จะเป็น ReferenceError ตอนรัน ซึ่งในเบราว์เซอร์แปลว่าฉากพังทั้งฉาก
// (เจอมาแล้วรอบนี้ — ไฟล์ผ่านเทสต์ข้อความหมดแต่เปิดจริงขึ้น "setStageWidth is not defined")
{
  const fs = await import("fs");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const core = await import(G + "/core.js");
  const imported = new Set(
    (scene.match(/import \{([^}]*)\} from ["']\.\/core\.js["']/)?.[1] ?? "")
      .split(",").map((x) => x.trim()).filter(Boolean)
  );
  const body = scene.replace(/import \{[^}]*\} from ["'][^"']*["'];?/g, "");
  const missing = Object.keys(core).filter(
    (name) => !imported.has(name) && new RegExp(`\\b${name}\\s*\\(`).test(body)
  );
  ok(missing.length === 0, `ฉากเรียกใช้ของจาก core.js ครบทุกตัวที่ import ไว้ (ขาด: ${missing.join(", ") || "ไม่มี"})`);
  for (const name of imported) {
    ok(name in core, `core.js ส่งออก ${name} จริงตามที่ฉาก import`);
  }
}


// ── สกิลแทงรัว: กดครั้งเดียวได้ครบ 4 จังหวะ และเดินหน้าไปเรื่อย ๆ ──
// ต่อท่าด้วย autoChain แทนที่จะทำท่าเดียวที่มีหลายหน้าต่างโจมตี เพื่อให้ใช้กลไกเดิมได้ทั้งหมด
// (hitbox/hitList/แรงดัน/การแม็พเฟรมจาก phase()) ไม่ต้องแตะ advanceMove ที่เป็นหัวใจของระบบ
{
  const g = new Game();
  const startX = g.p1.x;
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g.p1.moveId === "thrust1", `กดสกิลแล้วออกท่าแรก (ได้ ${g.p1.moveId})`);

  const seen = [];
  for (let i = 0; i < 80; i++) {
    run(g, 1, {});
    if (g.p1.moveId && !seen.includes(g.p1.moveId)) seen.push(g.p1.moveId);
  }
  ok(
    seen.join(">") === "thrust1>thrust2>thrust3>thrust4",
    `กดครั้งเดียวต่อครบสี่จังหวะเอง ไม่ต้องกดซ้ำ (ได้ ${seen.join(">")})`
  );
  ok(g.p1.state === "idle", "จบคอมโบแล้วกลับมาคุมตัวได้ตามปกติ");
  ok(g.p1.x > startX + 60, `คอมโบพาตัวละครเดินหน้าไปจริง (ไปได้ ${(g.p1.x - startX).toFixed(0)} px)`);

  // ทุกจังหวะต้องมีอาร์ตครบ 3 เฟรมเหมือนท่าโจมตีอื่น ไม่งั้น Phaser ค้างเฟรมเดิมแบบเงียบ ๆ
  const fs = await import("fs");
  const atlas = JSON.parse(fs.readFileSync(new URL("../../assets/characters/scramble_nyx.json", import.meta.url)));
  for (const id of ["thrust1", "thrust2", "thrust3", "thrust4"]) {
    const have = [1, 2, 3].filter((i) => atlas.frames[`${id}_${i}.png`]);
    ok(have.length === 3, `${id}: มีอาร์ตครบ 3 เฟรม (ได้ ${have.length})`);
  }
}

// ── สกิลเริ่มได้เฉพาะบนพื้น และคอมโบขาดเองถ้าหลุดจากพื้น ──
{
  const g = new Game();
  g.p1.onGround = false; g.p1.y -= 50; g.p1.setState("air");
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g.p1.moveId !== "thrust1", "กดสกิลกลางอากาศไม่ออกท่า (เป็นคอมโบเดินหน้าบนพื้น)");

  const g2 = new Game();
  g2.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g2, 12, {});
  g2.p1.onGround = false;                       // จำลองว่าหลุดจากพื้นกลางคอมโบ
  run(g2, 40, {});
  ok(g2.p1.moveId !== "thrust4", "หลุดจากพื้นกลางคอมโบแล้วไม่ต่อจังหวะสุดท้ายให้");
}


// ── ปุ่มสกิลสามช่อง ──
// ช่องที่ยังว่างต้องกินปุ่มทิ้งไปเฉย ๆ ไม่ค้างอยู่ใน buffer แล้วไปออกท่าทีหลังแบบไม่มีสาเหตุ
{
  const { SKILLS } = await import(G + "/core.js");
  ok(SKILLS.length === 3, `มีสล็อตสกิลสามช่อง (ได้ ${SKILLS.length})`);
  ok(SKILLS[0] === "thrust1", `ช่อง 1 = สกิลแทงรัว (ได้ ${SKILLS[0]})`);

  for (const slot of [1, 2, 3]) {
    const g = new Game();
    g.step(inp({ ["skill" + slot]: 1, p: { ["skill" + slot]: 1 } }));
    run(g, 80, {});
    const fired = g.p1.x !== new Game().p1.x || g.p1.state === "attack";
    if (SKILLS[slot - 1]) ok(fired, `ปุ่ม ${slot} มีสกิล -> ออกท่าจริง`);
    else ok(!fired && g.p1.state === "idle", `ปุ่ม ${slot} ยังว่าง -> กดแล้วไม่เกิดอะไร และไม่ค้างไว้ออกทีหลัง`);
  }

  // ปุ่มบนจอของช่องที่ว่างต้องถูกปิด ไม่ใช่กดได้แล้วเงียบ
  const fs = await import("fs");
  const scene2 = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(/b\.disabled = true/.test(scene2), "ปุ่มสกิลช่องที่ว่างถูกปิดไว้ (ไม่ใช่กดได้แต่ไม่มีอะไรเกิด)");
  ok(/SKILLS\[Number\(b\.dataset\.slot\) - 1\]/.test(scene2), "อ่านว่าช่องไหนว่างจาก SKILLS ตรง ๆ เพิ่มสกิลแล้วปุ่มเปิดเอง");
}
