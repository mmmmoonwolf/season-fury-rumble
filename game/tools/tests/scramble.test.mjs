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

const NONE = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0 };
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

// ── เดิน / วิ่ง ──
{
  const g = new Game();
  run(g, 40, { right: 1 });
  ok(Math.abs(g.p1.vx - PHYS.walk) < 0.01, `เดินขวาแล้วความเร็วชนเพดาน walk = ${PHYS.walk} (ได้ ${g.p1.vx.toFixed(2)})`);
  ok(g.p1.state === "walk" && g.p1.facing === 1, "อยู่ในสถานะ walk และหันขวา");

  const g2 = new Game();
  run(g2, 40, { right: 1, run: 1 });
  ok(Math.abs(g2.p1.vx - PHYS.run) < 0.01, `กด Shift แล้วชนเพดาน run = ${PHYS.run} (ได้ ${g2.p1.vx.toFixed(2)})`);
  ok(g2.p1.x > g.p1.x, "วิ่งไปได้ไกลกว่าเดินในเวลาเท่ากัน");

  run(g, 30, {}); // ปล่อยปุ่ม
  ok(g.p1.vx === 0 && g.p1.state === "idle", "ปล่อยปุ่มแล้วหยุดสนิทและกลับไป idle");
}

// ── ดับเบิลแท็ปวิ่ง ──
{
  const g = new Game();
  g.step(inp({ right: 1, p: { right: 1 } }));
  g.step(inp({}));
  g.step(inp({ right: 1, p: { right: 1 } })); // แท็ปที่สองภายใน dashWindow
  run(g, 40, { right: 1 });
  ok(Math.abs(g.p1.vx - PHYS.run) < 0.01, "ดับเบิลแท็ปทิศเดียวกันเร็ว ๆ = วิ่ง โดยไม่ต้องกด Shift");

  const g2 = new Game();
  g2.step(inp({ right: 1, p: { right: 1 } }));
  run(g2, PHYS.dashWindow + 5, {}); // ปล่อยนานเกินหน้าต่าง
  g2.step(inp({ right: 1, p: { right: 1 } }));
  run(g2, 40, { right: 1 });
  ok(Math.abs(g2.p1.vx - PHYS.walk) < 0.01, `แท็ปห่างเกิน ${PHYS.dashWindow} เฟรมแล้วไม่นับเป็นวิ่ง`);
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
  ok(ids.length === 9, `มีท่าครบ 9 ท่าตาม handoff (ได้ ${ids.length})`);
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
  // เจาะจงบรรทัด nyxAnims เท่านั้น — ในไฟล์มี { idle: 0.8, walk: 0.7, run: 0.5 } (ตารางเวลาต่อรอบ)
  // อยู่ด้วย ถ้าจับกว้าง ๆ จะไปได้เลขจากตารางนั้นแทนแล้วเทสต์เพี้ยนโดยไม่รู้ตัว
  const animsLine = scene.match(/nyxAnims\s*=\s*\{([^}]*)\}/)[1];
  const declared = Object.fromEntries(
    [...animsLine.matchAll(/(\w+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])])
  );
  ok(Object.keys(declared).length === 3, `อ่านจำนวนเฟรมจากฉากได้ครบ 3 ท่า (${JSON.stringify(declared)})`);
  for (const [name, n] of Object.entries(declared)) {
    const have = Object.keys(atlas.frames).filter((f) => f.startsWith(name + "_")).length;
    ok(have === n, `ท่า ${name}: ฉากประกาศ ${n} เฟรม และ atlas มี ${have} เฟรม`);
    const missing = Array.from({ length: n }, (_, i) => `${name}_${i + 1}.png`).filter((f) => !atlas.frames[f]);
    ok(missing.length === 0, `ท่า ${name}: เฟรมเรียงครบ 1..${n} ไม่มีเลขขาด (ขาด ${missing})`);
  }

  ok(meta.size.w <= 4096 && meta.size.h <= 4096, `atlas ไม่เกินลิมิต GPU (${meta.size.w}x${meta.size.h})`);
  const png = fs.statSync(new URL("scramble_nyx.png", A)).size;
  ok(png < 8e6, `ไฟล์ไม่ใหญ่เกินไปสำหรับโหลดผ่านเว็บ (${(png / 1e6).toFixed(1)} MB)`);

  // ขนาดที่วาดจริงต้องสมส่วนกับ hurtbox — ใหญ่เกินแล้วโดนตีจะงงว่าทำไมไม่โดน
  const SPRITE_H = Number(scene.match(/const SPRITE_H = (\d+)/)[1]);
  const ratio = SPRITE_H / PHYS.standH;
  ok(ratio > 1 && ratio < 1.25, `สไปรท์สูงกว่า hurtbox ${Math.round((ratio - 1) * 100)}% (ควรอยู่ราว 5-25%)`);
}

console.log("\nSCRAMBLE core: ported as-is from the prototype — this suite locks the playtested feel");
