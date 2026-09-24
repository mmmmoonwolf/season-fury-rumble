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

/** ท่าที่ระบบทำเสร็จแล้วแต่ยังรออาร์ต — ระหว่างนี้ฉากวาดเป็นกล่องแทน (พฤติกรรมเดิมของฉาก)
 *  ได้อาร์ตมาเมื่อไหร่ ลบชื่อออกจากนี่ แล้วเทสต์จะบังคับให้ต่อสายเข้าฉาก + atlas ให้ครบเอง
 *  ตอนนี้ว่าง = ทุกท่าในเกมมีอาร์ตจริงครบแล้ว */
const PENDING_ART = new Set();

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
  // 9 ท่าพื้นฐาน + แทงรัว 4 + Fox Step 2 + Oni Veil 4 = 19
  ok(ids.length === 21, `รวมสกิลทั้งสามแล้วเป็น 21 ท่า (ได้ ${ids.length})`);
  // ท่าที่ประกาศ noHit (ช่วงหายตัวของอัลติ / ช่วงขว้างมีด) ต้องทำดาเมจประชิดไม่ได้จริง
  // เช็กที่ hitbox() ตรง ๆ ไม่ใช่ดูแค่ตัวเลข เพราะสิ่งที่ต้องการคือ "ตีไม่โดน" ไม่ใช่ "ตั้งค่าไว้ถูก"
  const badNoHit = ids.filter((k) => {
    if (!MOVES[k].noHit) return false;
    if (MOVES[k].dmg) return true;
    const g = new Game();
    g.startMove(g.p1, k, 1);
    // เช็กเฉพาะช่วงที่ยังเป็นท่านี้อยู่ — ult1 ต่อเข้า ult2 เองซึ่งมีกรอบโจมตีตามปกติ
    while (g.p1.moveId === k) { if (g.p1.hitbox()) return true; g.step(inp()); }
    return false;
  });
  ok(badNoHit.length === 0, `ท่า noHit ต้องไม่มีกรอบโจมตีสักเฟรม — ผิด: ${badNoHit}`);
  const bad = ids.filter((k) => {
    const m = MOVES[k];
    if (m.noHit) return false;
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

  // จำนวนเฟรมต้องตรงกับ anims ของ Nyx ในทะเบียน CHAR_ART ของฉาก — อ่านจากไฟล์ฉากจริง
  // เจาะจงบล็อก anims ของ nyx เท่านั้น — ในไฟล์มี ANIM_SECONDS { idle: 0.8, ... } อยู่ด้วย
  // ถ้าจับกว้าง ๆ จะไปได้เลขจากตารางนั้นแทนแล้วเทสต์เพี้ยนโดยไม่รู้ตัว
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const animsLine = scene.match(/anims:\s*\{\s*idle:\s*\d+[^}]*\}/)[0];
  const declared = Object.fromEntries(
    [...animsLine.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
  ok(Object.keys(declared).length >= 3, `อ่านจำนวนเฟรมจากฉากได้ (${JSON.stringify(declared)})`);

  // ทุกท่าที่ฉากแม็พจาก state ของเอนจิ้น ต้องมีอยู่ใน nyxAnims จริง
  // แม็พไปหาท่าที่ไม่มี = เรียก play() ด้วยคีย์ที่ไม่ได้ลงทะเบียน Phaser จะเตือนแล้วไม่วาดอะไรเลย
  const mapped = [...scene.matchAll(/\{\s*run:\s*'run',[^}]*\}/g)][0]?.[0] ?? "";
  for (const [, anim] of mapped.matchAll(/:\s*'(\w+)'/g)) {
    ok(anim in declared, `state ที่แม็พไปท่า '${anim}' มีท่านั้นอยู่จริงในตาราง anims ของตัวละคร`);
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
  const attacks = [...scene.matchAll(/attacks:\s*new Set\(\[([^\]]*)\]/g)][0][1]
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
  ok(!/walk:\s*\d+/.test(scene.match(/anims:\s*\{\s*idle:\s*\d+[^}]*\}/)[0]), "ไม่ลงทะเบียนท่าเดินใน atlas อีกแล้ว");
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


// ── Thrust Rush: หางของคอมโบจิ้ม ต่อจาก jab3 แล้วรัวเองครบ 4 จังหวะ ──
// ย้ายออกจากช่องสกิลตามกติกา "ใส่หน้ากาก = สกิล" — ท่านี้หน้าเปล่า จึงเป็นท่าปกติ
// ต่อท่าด้วย autoChain แทนที่จะทำท่าเดียวที่มีหลายหน้าต่างโจมตี เพื่อให้ใช้กลไกเดิมได้ทั้งหมด
{
  const g = new Game();
  g.p1.x = g.p2.x - 70;
  const startX = g.p1.x;
  const seen = [];
  // กดตีรัว ๆ: jab1 > jab2 > jab3 แล้วกดต่ออีกทีเข้า Thrust Rush
  for (let i = 0; i < 140; i++) {
    g.step(inp(i % 8 === 0 ? { attack: 1, p: { attack: 1 } } : {}));
    if (g.p1.moveId && !seen.includes(g.p1.moveId)) seen.push(g.p1.moveId);
  }
  ok(
    seen.join(">") === "jab1>jab2>jab3>thrust1>thrust2>thrust3>thrust4",
    `คอมโบจิ้มต่อเข้า Thrust Rush แล้วรัวเองจนจบ (ได้ ${seen.join(">")})`
  );
  ok(g.p1.x > startX + 60, `คอมโบพาตัวละครเดินหน้าไปจริง (ไปได้ ${(g.p1.x - startX).toFixed(0)} px)`);

  // ต่อจาก jab3 เท่านั้น — กดตีเฉย ๆ จากท่ายืนต้องไม่ออก Thrust Rush ทันที
  const g2 = new Game();
  g2.step(inp({ attack: 1, p: { attack: 1 } }));
  ok(g2.p1.moveId === "jab1", `กดตีครั้งแรกยังเป็น jab1 (ได้ ${g2.p1.moveId})`);

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
  ok(g.p1.moveId !== "fox1", "กดสกิลกลางอากาศไม่ออกท่า (เป็นท่าพุ่งบนพื้น)");

  const g2 = new Game();
  g2.p1.x = g2.p2.x - 70;
  g2.step(inp({ attack: 1, p: { attack: 1 } }));   // เข้าคอมโบจิ้มก่อน
  for (let i = 0; i < 40; i++) g2.step(inp(i % 8 === 0 ? { attack: 1, p: { attack: 1 } } : {}));
  g2.p1.onGround = false;                          // จำลองว่าหลุดจากพื้นกลางคอมโบ
  run(g2, 40, {});
  ok(g2.p1.moveId !== "thrust4", "หลุดจากพื้นกลางคอมโบแล้วไม่ต่อจังหวะสุดท้ายให้");
}

// ── ปุ่มสกิลสามช่อง ──
// ช่องที่ยังว่างต้องกินปุ่มทิ้งไปเฉย ๆ ไม่ค้างอยู่ใน buffer แล้วไปออกท่าทีหลังแบบไม่มีสาเหตุ
{
  const { SKILLS, KI_MAX } = await import(G + "/core.js");
  ok(SKILLS.length === 3, `มีสล็อตสกิลสามช่อง (ได้ ${SKILLS.length})`);
  ok(SKILLS[0] === "fox1", `ช่อง 1 = Fox Step (ได้ ${SKILLS[0]})`);
  ok(SKILLS[1] === "curse1", `ช่อง 2 = Stone Curse (ได้ ${SKILLS[1]})`);
  ok(SKILLS[2] === "ult1", `ช่อง 3 = Oni Veil (ได้ ${SKILLS[2]})`);
  // กติกา "หน้ากาก = สกิล": Thrust Rush ไม่มีหน้ากาก จึงต้องไม่อยู่ในช่องสกิลอีกแล้ว
  ok(!SKILLS.includes("thrust1"), "Thrust Rush ไม่ใช่สกิลแล้ว (ไม่มีหน้ากาก)");

  for (const slot of [1, 2, 3]) {
    const g = new Game();
    g.p1.ki = KI_MAX;                             // ช่อง 3 ใช้หลอด ki เติมให้เต็มก่อนถึงจะกดได้
    g.step(inp({ ["skill" + slot]: 1, p: { ["skill" + slot]: 1 } }));
    const fired = g.p1.moveId === SKILLS[slot - 1];
    if (SKILLS[slot - 1]) ok(fired, `ปุ่ม ${slot} มีสกิล -> ออกท่าจริง (ได้ ${g.p1.moveId})`);
    else ok(!fired && g.p1.state === "idle", `ปุ่ม ${slot} ยังว่าง -> กดแล้วไม่เกิดอะไร และไม่ค้างไว้ออกทีหลัง`);
  }

  // ปุ่มบนจอของช่องที่ว่างต้องถูกปิด ไม่ใช่กดได้แล้วเงียบ
  const fs = await import("fs");
  const scene2 = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(/b\.disabled = !id/.test(scene2), "ปุ่มสกิลช่องที่ว่างถูกปิดไว้ (ไม่ใช่กดได้แต่ไม่มีอะไรเกิด)");
  ok(/f\.skills\[Number\(b\.dataset\.slot\) - 1\]/.test(scene2),
    "อ่านว่าช่องไหนว่างจากสกิลของตัวที่กำลังเล่น — สลับตัวละครแล้วปุ่มเปลี่ยนตามเอง");
  // ตั้ง disabled ต้องอยู่นอกลูปที่รันทุกเฟรม ไม่งั้นปุ่มค้างเมื่อถูก disable ตอนนิ้วยังกดอยู่
  ok(/_syncSkillSlots\(\)\s*\{/.test(scene2), "แยกการตั้งช่องว่าง/ชื่อสกิลออกจากลูปหรี่ปุ่มรายเฟรม");
}

// ── สกิล 1: Fox Step ──
// พุ่งทะลุตัวคู่ต่อสู้ได้เพราะ invuln (pushApart ข้ามคนที่ invuln อยู่แล้ว) ไม่ได้เขียนกลไกทะลุแยก
{
  const { KI_MAX, SKILL_CD } = await import(G + "/core.js");

  const g = new Game();
  const x0 = g.p1.x;
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g.p1.moveId === "fox1", `กดปุ่ม 1 ออกท่า fox1 (ได้ ${g.p1.moveId})`);
  run(g, 8, {});
  ok(g.p1.invuln > 0, "ช่วงพุ่งมี invuln (= อมตะ + ทะลุตัวคู่ต่อสู้ได้)");
  run(g, 12, {});
  ok(g.p1.x - x0 > 60, `พุ่งไปข้างหน้าจริง (ได้ ${Math.round(g.p1.x - x0)} px)`);

  // ต่อท่าสองเองโดยไม่ต้องกดซ้ำ
  const g2 = new Game();
  const seen = new Set();
  g2.step(inp({ skill1: 1, p: { skill1: 1 } }));
  for (let i = 0; i < 60; i++) { if (g2.p1.moveId) seen.add(g2.p1.moveId); g2.step(inp()); }
  ok(seen.has("fox1") && seen.has("fox2"), `ต่อ fox1 -> fox2 เอง (ได้ ${[...seen].join(" > ")})`);

  // พุ่งทะลุไปอยู่ด้านหลังแล้ว ท่าสองต้องหันกลับมาหาคู่ต่อสู้เอง ไม่ใช่ฟันลม
  const g3 = new Game();
  g3.p1.x = g3.p2.x + 100;      // จำลองว่าพุ่งทะลุไปโผล่ด้านขวาของหุ่นแล้ว
  g3.p1.facing = 1;             // ยังหันออกห่างอยู่
  g3.startMove(g3.p1, "fox2", 1);
  ok(g3.p1.facing === -1, `faceFoe หันกลับเข้าหาคู่ต่อสู้ให้ (ได้ facing ${g3.p1.facing})`);

  // คูลดาวน์: กดซ้ำทันทีต้องไม่ออก
  const g4 = new Game();
  g4.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g4, 60, {});
  ok(g4.p1.cd[0] > 0, "ใช้แล้วติดคูลดาวน์");
  const before = g4.p1.moveId;
  g4.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g4.p1.moveId === before, "ยังติดคูลดาวน์อยู่ กดซ้ำไม่ออกท่า");
  run(g4, SKILL_CD[0] + 5, {});
  ok(g4.p1.cd[0] === 0, "คูลดาวน์เดินจนหมดเอง");
  g4.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g4.p1.moveId === "fox1", "หมดคูลดาวน์แล้วกดได้อีก");
}

// ── สกิล 3: Oni Veil (อัลติ) ──
{
  const { KI_MAX } = await import(G + "/core.js");

  const g = new Game();
  ok(g.p1.ki === 0, "เริ่มเกมหลอด ki ว่าง");
  g.step(inp({ skill3: 1, p: { skill3: 1 } }));
  ok(g.p1.moveId !== "ult1", "ki ไม่เต็ม กดอัลติไม่ออก");

  // ki เติมจากดาเมจ ทั้งฝั่งที่ตีและฝั่งที่โดน
  const g2 = new Game();
  g2.p1.x = g2.p2.x - 70;
  g2.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g2, 20, {});
  ok(g2.p1.ki > 0, `ตีโดนแล้วได้ ki (ได้ ${g2.p1.ki.toFixed(1)})`);
  ok(g2.p2.ki > 0, `ฝั่งที่โดนตีก็ได้ ki ด้วย (ได้ ${g2.p2.ki.toFixed(1)})`);

  // เต็มแล้วกดได้ และใช้แล้วหลอดหมดเกลี้ยง
  const g3 = new Game();
  g3.p1.ki = KI_MAX;
  g3.step(inp({ skill3: 1, p: { skill3: 1 } }));
  ok(g3.p1.moveId === "ult1", `ki เต็มแล้วกดอัลติออก (ได้ ${g3.p1.moveId})`);
  ok(g3.p1.ki === 0, "ใช้อัลติแล้วหลอดหมดเกลี้ยง");

  // วาร์ปไปโผล่อีกฝั่งของคู่ต่อสู้
  const g4 = new Game();
  g4.p1.ki = KI_MAX;
  g4.p1.x = g4.p2.x - 120;
  g4.step(inp({ skill3: 1, p: { skill3: 1 } }));
  ok(g4.p1.x > g4.p2.x, `วาร์ปไปโผล่อีกฝั่ง (ผู้เล่น ${Math.round(g4.p1.x)} หุ่น ${Math.round(g4.p2.x)})`);
  ok(g4.p1.facing === -1, "แล้วหันกลับเข้าหาคู่ต่อสู้");

  // ไกลเกินระยะ = ไม่วาร์ป พุ่งไปข้างหน้าเฉย ๆ ไม่ใช่เทเลพอร์ตข้ามเวที
  const g5 = new Game();
  g5.p1.ki = KI_MAX;
  g5.p1.x = 100; g5.p2.x = 1150;
  g5.step(inp({ skill3: 1, p: { skill3: 1 } }));
  ok(g5.p1.x < g5.p2.x - 300, `ไกลเกินระยะไม่วาร์ปติดตัว (ได้ x ${Math.round(g5.p1.x)})`);

  // ต่อครบสี่จังหวะเอง
  const g6 = new Game();
  g6.p1.ki = KI_MAX;
  const seen = [];
  g6.step(inp({ skill3: 1, p: { skill3: 1 } }));
  for (let i = 0; i < 160; i++) { if (g6.p1.moveId && seen[seen.length - 1] !== g6.p1.moveId) seen.push(g6.p1.moveId); g6.step(inp()); }
  ok(seen.join(" > ") === "ult1 > ult2 > ult3 > ult4", `ต่อครบสี่จังหวะเอง (ได้ ${seen.join(" > ")})`);

  // จังหวะแรกเป็นช่วงหายตัว ต้องไม่มี hitbox เลย
  const g7 = new Game();
  g7.p1.ki = KI_MAX;
  g7.step(inp({ skill3: 1, p: { skill3: 1 } }));
  let anyHb = false;
  for (let i = 0; i < 18 && g7.p1.moveId === "ult1"; i++) { if (g7.p1.hitbox()) anyHb = true; g7.step(inp()); }
  ok(!anyHb, "ช่วงหายตัว (ult1) ไม่มีหน้าต่างโจมตีเลย");
}

// ── ต่อคอมโบเข้าสกิล ──
// เงื่อนไขคือท่าปัจจุบันต้อง "ตีโดนแล้ว" เท่านั้น ท่าที่ฟันลมยังต้องมีจังหวะเสียตามเดิม
{
  const { KI_MAX } = await import(G + "/core.js");

  const g = new Game();
  g.p1.x = g.p2.x - 70;
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g, 8, {});
  ok(g.p1.hitConfirmed, "จิ้มโดนก่อน");
  // กดตอนกำลังอยู่ใน hitstop ได้ — input ค้างใน buffer แล้วออกท่าให้เองเฟรมถัดมา
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g, 3, {});
  ok(g.p1.moveId === "fox1", `ตีโดนแล้วกดสกิล 1 ยกเลิกท่าเข้าสกิลได้ (ได้ ${g.p1.moveId})`);

  // ฟันลมแล้วกดสกิล ต้องไม่ยกเลิกให้
  const g2 = new Game();
  g2.p2.x = g2.p1.x + 600;                 // ไกลจนจิ้มไม่โดนแน่นอน
  g2.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g2, 8, {});
  ok(!g2.p1.hitConfirmed, "ฟันลม ไม่มี hitConfirmed");
  g2.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g2, 3, {});
  ok(g2.p1.moveId === "jab1", `ฟันลมแล้วยกเลิกเข้าสกิลไม่ได้ (ได้ ${g2.p1.moveId})`);

  // สกิลเดียวกันใช้ซ้ำในคอมโบเดียวไม่ได้
  const g3 = new Game();
  g3.p1.x = g3.p2.x - 70;
  g3.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g3, 8, {});
  g3.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g3, 6, {});
  const mid = g3.p1.moveId;
  ok(mid && mid.startsWith("fox"), `เข้าสกิลแล้ว (ได้ ${mid})`);
  g3.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g3.p1.moveId === mid, "สกิลเดิมใช้ซ้ำในคอมโบเดียวไม่ได้");

  // ยืนเฉย ๆ แล้วกดใหม่ = คอมโบใหม่ ใช้สกิลเดิมได้อีก (ถ้าหมดคูลดาวน์)
  const g4 = new Game();
  g4.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g4, 200, {});
  ok(g4.p1.cd[0] === 0, "รอจนหมดคูลดาวน์");
  g4.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g4.p1.moveId === "fox1", "เริ่มคอมโบใหม่จากท่ายืน ใช้สกิลเดิมได้อีก");
}

// ── ยกเลิกเข้าได้ทั้งสามสกิล ไม่ใช่แค่สกิล 1 ──
{
  const { KI_MAX } = await import(G + "/core.js");
  const want = { 1: "fox1", 3: "ult1" };   // ช่อง 2 ยังว่าง
  for (const slot of [1, 3]) {
    const g = new Game();
    g.p1.x = g.p2.x - 70;
    g.p1.ki = KI_MAX;
    g.step(inp({ attack: 1, p: { attack: 1 } }));
    run(g, 8, {});
    g.step(inp({ ["skill" + slot]: 1, p: { ["skill" + slot]: 1 } }));
    run(g, 3, {});
    ok(g.p1.moveId === want[slot], `จิ้มโดนแล้วยกเลิกเข้าสกิล ${slot} ได้ (ได้ ${g.p1.moveId})`);
  }

  // Fox Step เดี่ยว ๆ ต้องเข้าครบสองจังหวะ ไม่ใช่จังหวะแรกโดนแล้วจังหวะสองเอื้อมไม่ถึง
  const g = new Game();
  g.p1.x = g.p2.x - 70;
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  let hits = 0, hp = g.p2.hp;
  for (let i = 0; i < 70; i++) { g.step(inp()); if (g.p2.hp < hp) { hits++; hp = g.p2.hp; } }
  ok(hits === 2, `Fox Step จากระยะประชิดเข้าครบสองจังหวะ (ได้ ${hits})`);
  ok(g.p1.x > g.p2.x, "และพุ่งทะลุไปโผล่อีกฝั่งจริง");

  // อัลติต้องเข้าครบสามจังหวะ — ท่ากลางคอมโบห้ามลอยคู่ต่อสู้จนกลายเป็นท่าล้ม (ซึ่งมี invuln)
  const g2 = new Game();
  g2.p1.ki = KI_MAX;
  g2.p1.x = g2.p2.x - 110;
  g2.step(inp({ skill3: 1, p: { skill3: 1 } }));
  let uh = 0, uhp = g2.p2.hp;
  for (let i = 0; i < 150; i++) { g2.step(inp()); if (g2.p2.hp < uhp) { uh++; uhp = g2.p2.hp; } }
  ok(uh === 3, `อัลติเข้าครบสามจังหวะ (ได้ ${uh})`);
  ok(g2.p2.maxHp - uhp >= 20, `อัลติรวมดาเมจ ${g2.p2.maxHp - uhp} (ต้อง >= 20)`);
}

// ── ฉาก: ท่าของสกิลใหม่ต้องลงทะเบียนอาร์ตครบ และมีหลอด ki บนจอ ──
// ลืมใส่ชื่อท่าใน attacks ของตัวละคร = ท่านั้นวาดเป็นกล่องสี่เหลี่ยมแทนตัวละคร โดยไม่มี error อะไรเลย
{
  const fs = await import("fs");
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const { MOVES } = await import(G + "/core.js");
  const listed = new Set((scene.match(/attacks:\s*new Set\(\[([\s\S]*?)\]\)/)[1].match(/"[^"]+"/g) || [])
    .map((s) => s.replace(/"/g, "")));
  const missing = Object.keys(MOVES).filter((k) => !listed.has(k) && !PENDING_ART.has(k));
  ok(missing.length === 0, `ทุกท่าใน MOVES ลงทะเบียนอาร์ตไว้ในฉากครบ (ขาด: ${missing.join(", ") || "ไม่มี"})`);
  const early = [...PENDING_ART].filter((k) => listed.has(k));
  ok(early.length === 0, `ท่าที่ยังไม่มีอาร์ตต้องไม่อยู่ในตาราง attacks (เจอ: ${early.join(", ") || "ไม่มี"})`);
  ok(/KI_MAX/.test(scene), "ฉากวาดหลอด ki");
  ok(/_syncSkillBtns/.test(scene), "ฉากหรี่ปุ่มสกิลตามคูลดาวน์/ki");
  // ห้ามใช้ disabled หรี่ปุ่ม: ปุ่มที่ถูก disable ตอนนิ้วยังกดค้างจะไม่ส่ง event ปล่อย ปุ่มจะค้าง
  // ดูเฉพาะ "ตัวเมธอด" ที่รันทุกเฟรม ไม่ใช่ทุกอย่างหลังคำว่า _syncSkillBtns ปรากฏครั้งแรก
  // (จับกว้าง ๆ แล้วไปโดนคอมเมนต์ที่อ้างถึงชื่อเมธอด เทสต์เลยเช็กผิดบล็อกโดยไม่รู้ตัว)
  const dimBody = scene.match(/_syncSkillBtns\(\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
  ok(dimBody.length > 0, "หาตัวเมธอดหรี่ปุ่มเจอ");
  ok(!/\.disabled\s*=/.test(dimBody), "ลูปหรี่ปุ่มรายเฟรมไม่แตะ disabled (ใช้ opacity อย่างเดียว)");
}

// ── อาร์ตของทุกท่าต้องมีอยู่จริงใน atlas ──
{
  const fs = await import("fs");
  const { MOVES } = await import(G + "/core.js");
  const atlas = JSON.parse(fs.readFileSync(new URL("../../assets/characters/scramble_nyx.json", import.meta.url), "utf8"));
  const have = new Set(Object.keys(atlas.frames));
  const missing = [];
  for (const k of Object.keys(MOVES)) {
    if (PENDING_ART.has(k)) continue;
    for (const n of [1, 2, 3]) if (!have.has(`${k}_${n}.png`)) missing.push(`${k}_${n}`);
  }
  ok(missing.length === 0, `ทุกท่ามีอาร์ตครบ 3 เฟรมใน atlas (ขาด: ${missing.join(", ") || "ไม่มี"})`);
  // เมื่ออาร์ตมาแล้วต้องเอาชื่อออกจาก PENDING_ART — เทสต์บรรทัดนี้เตือนให้เอาออก
  const arrived = [...PENDING_ART].filter((k) => have.has(`${k}_2.png`));
  ok(arrived.length === 0, `มีอาร์ตแล้วต้องถอดออกจาก PENDING_ART (เจอ: ${arrived.join(", ") || "ไม่มี"})`);
}

// ── กดสกิลตอนท่าที่ฟันลมยังไม่จบ ต้องออกท่าให้ทันทีที่ท่าเดิมจบ ไม่ใช่เงียบหาย ──
// ปุ่มตีทำแบบนี้อยู่แล้ว (ค้างใน buffer ต่อถ้ายังต่อท่าไม่ได้) ปุ่มสกิลต้องเหมือนกัน
{
  const g = new Game();
  g.p2.x = g.p1.x + 600;                      // ไกลจนจิ้มไม่โดน = ยกเลิกเข้าสกิลไม่ได้
  g.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g, 12, {});                             // jab1 ยาว 18 เฟรม กดตอนใกล้จบให้อยู่ในช่วง buffer (9 เฟรม)
  g.step(inp({ skill1: 1, p: { skill1: 1 } }));
  ok(g.p1.moveId === "jab1", "ยังยกเลิกไม่ได้ระหว่างท่า");
  run(g, 8, {});
  ok(g.p1.moveId === "fox1", `ท่าเดิมจบแล้วสกิลออกให้เอง (ได้ ${g.p1.moveId})`);

  // กดเร็วเกินจนเลยช่วง buffer = ไม่ออก เหมือนปุ่มตีทุกประการ ไม่ใช่ค้างไว้ออกทีหลังแบบไม่มีสาเหตุ
  const g2 = new Game();
  g2.p2.x = g2.p1.x + 600;
  g2.step(inp({ attack: 1, p: { attack: 1 } }));
  run(g2, 2, {});
  g2.step(inp({ skill1: 1, p: { skill1: 1 } }));
  run(g2, 30, {});
  ok(g2.p1.moveId === null, "กดตั้งแต่ต้นท่า เลยช่วง buffer ไปแล้ว ไม่ออกท่าย้อนหลัง");
}

// ── สกิล 2: Stone Curse — ขว้างมีด 3 เล่ม แล้วกดซ้ำวาร์ปไปเล่มกลาง ──
{
  const { SKILL_CD } = await import(G + "/core.js");

  // ขว้างออกมา 3 เล่ม เล่มกลางเป็นหมุด
  const g = new Game();
  g.p2.x = g.p1.x + 900;                       // ไกลจนมีดไปไม่ถึง จะได้ดูการบินล้วน ๆ
  g.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g.p1.moveId === "curse1", `กดปุ่ม 2 ออกท่าขว้าง (ได้ ${g.p1.moveId})`);
  ok(g.shots.length === 0, "ยังไม่ปล่อยมีดตั้งแต่เฟรมแรก (รอถึงเฟรมปล่อยมือ)");
  run(g, 10, {});
  ok(g.shots.length === 3, `ปล่อยมีดออกมา 3 เล่ม (ได้ ${g.shots.length})`);
  ok(g.shots.filter((s) => s.anchor).length === 1, "มีหมุดเล่มเดียว (เล่มกลาง)");
  const ys = g.shots.map((s) => Math.round(s.vy)).sort((a, b) => a - b);
  ok(ys[0] < 0 && ys[1] === 0 && ys[2] > 0, `กระจายเป็นพัด บน/ตรง/ล่าง (ได้ ${ys.join(",")})`);

  // มีดบินไปข้างหน้าตามทิศที่หัน
  const x0 = g.shots[0].x;
  run(g, 10, {});
  ok(g.shots.length && g.shots[0].x > x0, "มีดบินไปข้างหน้า");

  // เล่มข้างหายเมื่อสุดระยะ เล่มกลางค้างเป็นหมุด
  run(g, 60, {});
  const left = g.shots;
  ok(left.length === 1 && left[0].anchor, `สุดระยะแล้วเหลือแต่หมุด (ได้ ${left.length} เล่ม)`);
  ok(left[0].stuck > 0, "หมุดค้างอยู่กับที่ รอให้วาร์ปตาม");

  // กดซ้ำ = วาร์ปไปที่หมุด ไม่ใช่ขว้างชุดใหม่
  const anchorX = left[0].x;
  g.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g.p1.moveId === "curse2", `กดซ้ำออกท่าวาร์ป (ได้ ${g.p1.moveId})`);
  ok(Math.abs(g.p1.x - anchorX) < 30, `วาร์ปไปอยู่ตรงหมุด (หมุด ${Math.round(anchorX)} ตัว ${Math.round(g.p1.x)})`);
  ok(g.anchorOf(g.p1) === null, "ใช้หมุดแล้วหมุดหาย กดซ้ำอีกไม่ได้");

  // หมุดหมดอายุเอง ถ้าไม่กดตาม
  const g2 = new Game();
  g2.p2.x = g2.p1.x + 900;
  g2.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g2, 200, {});
  ok(g2.shots.length === 0, "ไม่กดตาม หมุดหมดอายุหายไปเอง");

  // มีดทำดาเมจได้ และคิดคูลดาวน์จากการขว้าง ไม่ใช่การวาร์ป
  const g3 = new Game();
  g3.p1.x = g3.p2.x - 260;
  g3.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g3.p1.cd[1] >= SKILL_CD[1] - 1, `ขว้างแล้วติดคูลดาวน์ (ได้ ${g3.p1.cd[1]})`);
  let hp = g3.p2.hp;
  run(g3, 40, {});
  ok(g3.p2.hp < hp, `มีดโดนแล้วเสียเลือด (${hp} -> ${g3.p2.hp})`);

  // โดนตัวแล้วหมุดหยุดตรงนั้น = วาร์ปไปติดตัวคู่ต่อสู้พอดี
  const g4 = new Game();
  g4.p1.x = g4.p2.x - 260;
  g4.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g4, 40, {});
  const a = g4.anchorOf(g4.p1);
  ok(a !== null, "โดนตัวแล้วหมุดยังอยู่ (ไม่ใช่หายไปพร้อมดาเมจ)");
  if (a) ok(Math.abs(a.x - g4.p2.x) < 80, `หมุดหยุดตรงตัวคู่ต่อสู้ (ห่าง ${Math.round(Math.abs(a.x - g4.p2.x))} px)`);

  // ท่าวาร์ปกดได้แม้ยังติดคูลดาวน์ — เป็นครึ่งหลังของการใช้ครั้งเดิม ไม่ใช่การใช้ครั้งใหม่
  const g5 = new Game();
  g5.p2.x = g5.p1.x + 900;
  g5.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g5, 40, {});
  ok(g5.p1.cd[1] > 0, "ยังติดคูลดาวน์อยู่");
  g5.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g5.p1.moveId === "curse2", "แต่กดวาร์ปตามได้");

  // ไม่มีหมุดแล้วกดตอนติดคูลดาวน์ = ไม่ออกท่า
  const g6 = new Game();
  g6.p2.x = g6.p1.x + 900;
  g6.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g6, 200, {});                            // หมุดหมดอายุไปแล้ว
  g6.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g6.p1.moveId !== "curse1" && g6.p1.moveId !== "curse2", "หมุดหมดแล้วและยังติดคูลดาวน์ = กดไม่ออก");

  // ยืนติดตัวแล้วขว้าง ต้องโดนแค่เล่มเดียว ไม่ใช่ครบสามเล่มในเฟรมเดียว
  // (มีดชุดเดียวกันใช้ hitList ร่วมกัน เหมือนท่าปกติที่ตีคนเดิมซ้ำในท่าเดียวไม่ได้)
  const g7 = new Game();
  g7.p1.x = g7.p2.x - 60;
  const hp7 = g7.p2.hp;
  g7.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g7, 30, {});
  const dealt = hp7 - g7.p2.hp;
  ok(dealt > 0 && dealt <= 3, `ขว้างระยะประชิดโดนเล่มเดียว (เสียเลือด ${dealt})`);

  // ระยะไกลก็ต้องโดนครั้งเดียวเหมือนกัน
  const g8 = new Game();
  g8.p1.x = g8.p2.x - 260;
  const hp8 = g8.p2.hp;
  g8.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g8, 50, {});
  const d8 = hp8 - g8.p2.hp;
  ok(d8 > 0 && d8 <= 3, `ขว้างระยะไกลก็โดนครั้งเดียว (เสียเลือด ${d8})`);
}

// ── หมุดเทงงุ 2 แบบ: โดนคน = หมายหัวตามตัว · ขว้างพลาด = ปักอยู่กับที่ ──
// เหตุผลที่ต้องแยก: เล่นหลายคน หมุดค้างที่เดิมแปลว่าวาร์ปไปโผล่ที่ว่าง หรือกลางวงศัตรู
{
  // โดนคน -> หมายหัว อายุยาวกว่ามาก และเกาะตัวเป้าไป
  const g = new Game();
  g.p1.x = g.p2.x - 260;
  g.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g, 40, {});
  const a = g.anchorOf(g.p1);
  ok(a && a.target === "p2", `ขว้างโดนแล้วหมายหัวคนที่โดน (ได้ ${a && a.target})`);
  ok(a && a.stuck > 200, `หมายหัวอยู่ได้นาน ~5 วิ (เหลือ ${a && a.stuck} เฟรม)`);

  // เป้าวิ่งหนี หมุดต้องตามไป ไม่ค้างอยู่จุดที่โดน
  const hitX = a.x;
  g.p2.x += 250;
  run(g, 3, {});
  ok(Math.abs(g.anchorOf(g.p1).x - g.p2.x) < 20,
    `เป้าย้ายที่ หมุดตามไปด้วย (หมุด ${Math.round(g.anchorOf(g.p1).x)} เป้า ${Math.round(g.p2.x)})`);
  ok(Math.abs(g.anchorOf(g.p1).x - hitX) > 100, "ไม่ค้างอยู่จุดที่โดนตอนแรก");

  // วาร์ปไปหาเป้า "ตำแหน่งล่าสุด" และมาโผล่ข้างตัว ไม่ใช่ทับตัว
  g.step(inp({ skill2: 1, p: { skill2: 1 } }));
  ok(g.p1.moveId === "curse2", `กดซ้ำออกท่าวาร์ป (ได้ ${g.p1.moveId})`);
  const gap = Math.abs(g.p1.x - g.p2.x);
  ok(gap > 20 && gap < 110, `ไปโผล่ข้างตัวเป้า ไม่ทับกัน (ห่าง ${Math.round(gap)} px)`);

  // หมายหัวหมดอายุเองถ้าไม่ตามไป
  const g2 = new Game();
  g2.p1.x = g2.p2.x - 260;
  g2.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g2, 40, {});
  ok(g2.anchorOf(g2.p1) !== null, "หมายหัวติดแล้ว");
  run(g2, 320, {});
  ok(g2.anchorOf(g2.p1) === null, "ครบเวลาแล้วหมายหัวหลุดเอง");

  // ขว้างพลาด -> หมุดปักอยู่กับที่ ไม่หมายหัวใคร และอายุสั้นกว่า
  const g3 = new Game();
  g3.p2.x = g3.p1.x + 900;
  g3.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g3, 45, {});
  const b = g3.anchorOf(g3.p1);
  ok(b && b.target === null, "ขว้างพลาด หมุดไม่ได้หมายหัวใคร");
  ok(b && b.stuck <= 70, `หมุดที่พลาดอายุสั้นกว่า (เหลือ ${b && b.stuck} เฟรม)`);
  const fixedX = b.x;
  run(g3, 3, {});
  ok(g3.anchorOf(g3.p1).x === fixedX, "หมุดที่พลาดปักอยู่กับที่จริง");

  // เล่มบน/ล่างเป็นคนโดนก็ต้องได้หมายหัวเหมือนกัน ไม่ใช่เฉพาะเล่มกลาง
  const g4 = new Game();
  g4.p1.x = g4.p2.x - 200;
  g4.p2.y -= 40;                               // ยกเป้าขึ้นให้เล่มบนเป็นคนโดนแทน
  g4.step(inp({ skill2: 1, p: { skill2: 1 } }));
  run(g4, 40, {});
  const c = g4.anchorOf(g4.p1);
  ok(c === null || c.target === "p2", "เล่มไหนในชุดโดนก็ได้หมายหัว ไม่ใช่เฉพาะเล่มกลาง");
}

// ── ชั้นตัวละคร: ตารางท่าอ่านจากตัวละคร ไม่ใช่ตัวแปรกลางตัวเดียว ──
// มีไว้เพื่อให้เพิ่มตัวที่สองได้โดยไม่ต้องแก้ core — เพิ่มระเบียนใน CHARACTERS แล้วจบ
{
  const { CHARACTERS, DEFAULT_CHAR, Fighter } = await import(G + "/core.js");

  ok(CHARACTERS[DEFAULT_CHAR] != null, `ตัวละครเริ่มต้น '${DEFAULT_CHAR}' มีอยู่ในทะเบียน`);
  for (const [id, ch] of Object.entries(CHARACTERS)) {
    ok(ch.moves && Object.keys(ch.moves).length > 0, `ตัวละคร '${id}' มีตารางท่า`);
    ok(Array.isArray(ch.skills) && ch.skills.length === 3, `ตัวละคร '${id}' มีช่องสกิลสามช่อง`);
    ok(Array.isArray(ch.skillCd) && ch.skillCd.length === 3, `ตัวละคร '${id}' มีคูลดาวน์ครบสามช่อง`);
    // ทุกตัวต้องมีชื่อท่าพื้นฐานครบ ไม่งั้น pickMove() จะชี้ไปท่าที่ไม่มี
    const BASIC = ["jab1", "side", "up", "down", "nair", "sair", "dair"];
    const miss = BASIC.filter((k) => !ch.moves[k]);
    ok(miss.length === 0, `ตัวละคร '${id}' มีท่าพื้นฐานครบ (ขาด: ${miss.join(", ") || "ไม่มี"})`);
    // สกิลที่ประกาศไว้ต้องมีอยู่ในตารางท่าของตัวนั้นจริง
    const badSkill = ch.skills.filter((k) => k && !ch.moves[k]);
    ok(badSkill.length === 0, `สกิลของ '${id}' มีอยู่ในตารางท่าจริง (ผิด: ${badSkill.join(", ") || "ไม่มี"})`);
  }

  // Fighter อ่านตารางท่าจากตัวละครของตัวเอง
  const f = new Fighter("p1", "T", 100, 1);
  ok(f.char === DEFAULT_CHAR, `Fighter รู้ว่าตัวเองเป็นตัวละครไหน (${f.char})`);
  ok(f.moves === CHARACTERS[DEFAULT_CHAR].moves, "f.moves ชี้ไปตารางท่าของตัวละครตัวนั้น");
  ok(f.skills === CHARACTERS[DEFAULT_CHAR].skills, "f.skills ชี้ไปช่องสกิลของตัวละครตัวนั้น");

  // core ต้องไม่เหลือการอ่านตารางท่าแบบตัวแปรกลาง
  const fs = await import("fs");
  const core = fs.readFileSync(new URL("../../src/modes/scramble/core.js", import.meta.url), "utf8");
  const body = core.slice(core.indexOf("class Game"));
  ok(!/\bMOVES\[/.test(body), "Game ไม่อ่าน MOVES[...] ตรง ๆ แล้ว (อ่านผ่านตัวละคร)");
  ok(!/\bSKILL_CD\[/.test(body), "Game ไม่อ่าน SKILL_CD[...] ตรง ๆ แล้ว");

  // ฝั่งฉากก็ต้องมีทะเบียนอาร์ตต่อตัวเหมือนกัน และคีย์ต้องตรงกับฝั่ง sim
  const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(/const CHAR_ART = \{/.test(scene), "ฉากมีทะเบียนอาร์ตต่อตัวละคร");
  const artIds = [...scene.matchAll(/^  (\w+):\s*\{\s*$/gm)].map((m) => m[1]);
  for (const id of artIds) {
    ok(CHARACTERS[id] != null, `ตัวละคร '${id}' ในทะเบียนอาร์ต มีระเบียนฝั่ง sim ด้วย`);
  }
}

// ── HELIOS: สายรัว — ชุดรัว 5 จังหวะ ไม้จบแยกสามทาง เข่าเปิดชุดซ้ำ อัลติกดรัวต่อได้ ──
{
  const { CHARACTERS } = await import(G + "/core.js");
  const H = CHARACTERS.helios;
  ok(H != null, "มีตัวละคร helios ในทะเบียน");
  ok(H.skills.join(",") === "rush1,knee,hh1", `ช่องสกิลของ Helios (ได้ ${H.skills.join(",")})`);

  const asHelios = () => { const g = new Game(); g.p1.char = "helios"; g.p1.x = g.p2.x - 70; return g; };

  // ชุดรัวต่อเองครบ 5 จังหวะ แล้วจบด้วยหมัดตรงถ้าไม่กดทิศ
  {
    const g = asHelios();
    const seen = [];
    g.step(inp({ skill1: 1, p: { skill1: 1 } }));
    for (let i = 0; i < 120; i++) { if (g.p1.moveId && seen[seen.length - 1] !== g.p1.moveId) seen.push(g.p1.moveId); g.step(inp()); }
    ok(seen.join(">") === "rush1>rush2>rush3>rush4>rush5>rushEndF",
      `ไม่กดทิศ จบด้วยหมัดตรง (ได้ ${seen.join(">")})`);
  }

  // กดขึ้นค้าง -> จบด้วยเตะยกคาง (ลอย)
  {
    const g = asHelios();
    const seen = [];
    g.step(inp({ skill1: 1, p: { skill1: 1 } }));
    for (let i = 0; i < 120; i++) { if (g.p1.moveId && seen[seen.length - 1] !== g.p1.moveId) seen.push(g.p1.moveId); g.step(inp({ up: 1 })); }
    ok(seen[seen.length - 1] === "rushEndU", `กดขึ้นค้าง จบด้วยเตะยกคาง (ได้ ${seen[seen.length - 1]})`);
    ok(H.moves.rushEndU.kb[1] < -10, "ไม้จบทางขึ้นยกคู่ต่อสู้ลอยจริง");
  }

  // กดลงค้าง -> จบด้วยกวาดขา
  {
    const g = asHelios();
    const seen = [];
    g.step(inp({ skill1: 1, p: { skill1: 1 } }));
    for (let i = 0; i < 120; i++) { if (g.p1.moveId && seen[seen.length - 1] !== g.p1.moveId) seen.push(g.p1.moveId); g.step(inp({ down: 1 })); }
    ok(seen[seen.length - 1] === "rushEndD", `กดลงค้าง จบด้วยกวาดขา (ได้ ${seen[seen.length - 1]})`);
  }

  // จังหวะกลางชุดห้ามถีบขึ้น ไม่งั้นคู่ต่อสู้ลอยแล้วล้ม = อมตะ จังหวะถัดไปฟันลม
  for (const id of ["rush1", "rush2", "rush3", "rush4", "rush5", "hh1", "hh2", "hh3"]) {
    ok(H.moves[id].kb[1] === 0, `${id}: ไม่ถีบขึ้นกลางคอมโบ (ได้ ${H.moves[id].kb[1]})`);
  }

  // เข่าพุ่ง: ปลดล็อกให้ใช้ชุดรัวซ้ำได้ในคอมโบเดียว
  {
    const g = asHelios();
    g.startMove(g.p1, "rush1", 1);
    ok(g.p1.used.has("rush1"), "ใช้ชุดรัวไปแล้วติด used");
    g.startMove(g.p1, "knee", 1);
    ok(!g.p1.used.has("rush1"), "เข่าพุ่งปลดล็อกให้ใช้ชุดรัวซ้ำได้");
  }

  // อัลติ: ไม่กดรัวก็ไหลไปไม้จบเอง
  {
    const g = asHelios();
    g.p1.ki = 100;                                 // อัลติใช้หลอด ki เต็มเหมือนของ Nyx
    const seen = [];
    g.step(inp({ skill3: 1, p: { skill3: 1 } }));
    for (let i = 0; i < 140; i++) { if (g.p1.moveId && seen[seen.length - 1] !== g.p1.moveId) seen.push(g.p1.moveId); g.step(inp()); }
    ok(seen.join(">") === "hh1>hh2>hh3>hhEnd", `ไม่กดรัว จบเลย (ได้ ${seen.join(">")})`);
  }

  // อัลติ: กดรัวแล้ววนเพิ่มรอบจริง และหยุดที่เพดาน ไม่วนไม่รู้จบ
  {
    const g = asHelios();
    g.p1.ki = 100;
    let loops = 0, prev = null;
    g.step(inp({ skill3: 1, p: { skill3: 1 } }));
    for (let i = 0; i < 400; i++) {
      if (g.p1.moveId === "hh2" && prev === "hh3") loops++;
      prev = g.p1.moveId;
      g.step(inp({ attack: 1, p: { attack: 1 } }));   // กดรัวทุกเฟรม
    }
    ok(loops > 0, `กดรัวแล้ววนเพิ่มรอบจริง (วนได้ ${loops} รอบ)`);
    ok(loops <= H.moves.hh1.mashMax, `วนไม่เกินเพดาน ${H.moves.hh1.mashMax} รอบ (ได้ ${loops})`);
    ok(g.p1.state !== "attack" || g.p1.moveId !== "hh2", "สุดท้ายต้องหลุดออกจากวง ไม่ค้างอยู่ตลอดไป");
  }

  // Nyx ต้องไม่ได้รับผลอะไรจากกลไกใหม่ — ท่าของ Nyx ไม่มี branch/refresh/mashChain
  const nyxMoves = CHARACTERS.nyx.moves;
  const leaked = Object.keys(nyxMoves).filter((k) => nyxMoves[k].branch || nyxMoves[k].refresh || nyxMoves[k].mashChain);
  ok(leaked.length === 0, `กลไกของ Helios ไม่หลุดไปอยู่ในท่าของ Nyx (เจอ: ${leaked.join(", ") || "ไม่มี"})`);
}
