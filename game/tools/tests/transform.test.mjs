// หมายเหตุ: คูลดาวน์ถูกตั้งหลังตัวนับของเฟรมนั้น จึงเป็นค่าเต็มพอดีในเฟรมที่กด
// ทดสอบการแปลงร่าง (OAT -> ไททัน) แบบไม่เปิดเบราว์เซอร์
// รัน: node tools/tests/transform.test.mjs   (จากโฟลเดอร์ game)
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { Oat } = await import(G + "/entities/Oat.js");
const { KunJae } = await import(G + "/entities/KunJae.js");
const { CombatSystem } = await import(G + "/systems/CombatSystem.js");
const { BASIC_COMBO, FINISHER, HITSTOP, TITAN_SKILL1, TITAN_SKILL2, CHARACTER_COMBAT, resolveAttack } = await import(G + "/config/combat.config.js");
const { TRANSFORM } = await import(G + "/config/transform.config.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");

const scene = makeScene();
scene._hitstopMs = 0;
scene.hitstop = MainGameScene.prototype.hitstop;
scene._tickHitstop = MainGameScene.prototype._tickHitstop;
const hits = [];
const combat = new CombatSystem(scene, (v, a, dmg, blocked) => hits.push({ v, dmg, blocked }));
const A = new Oat(scene, 0, 0); A.combat = combat; A.facing = 1;
const B = new KunJae(scene, 30, 0, 1); B.combat = combat;
const idle = { left: false, right: false, jumpPressed: false, attackPressed: false, summonPressed: false, tauntPressed: false, blockHeld: false, skillPressed: 0, transformPressed: false };
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const run = (p, ms, input = idle) => { for (let t = 0; t < ms; t += 16) p.handleMovement(input, 16); };
const T = TRANSFORM.timeline;

ok(A.hasTransform() && !B.hasTransform(), "OAT แปลงได้ / KunJae แปลงไม่ได้");
const baseH = A._scaleArgs.targetWorldHeight;

// เริ่มแปลง
A.handleMovement({ ...idle, transformPressed: true }, 16);
ok(A.isTransforming() && A.isInvulnerable(), "กด numpad 8 -> เข้าท่าแปลงร่าง + โดนตีไม่ได้");
ok(A.lastAnim === "oat/tf_glow", "เล่นท่าเรืองแสงจากคลิป");
ok(A.transformCooldown === TRANSFORM.cooldownMs, "คูลดาวน์ 30 วิ เริ่มนับตั้งแต่กด");

// โดนตีระหว่างแปลง -> ไม่โดน
hits.length = 0;
combat.spawnHitbox({ attacker: B, duration: 30, spec: BASIC_COMBO[0] });
B.facing = -1; combat.update(16, [A, B], () => true);
ok(hits.length === 0, "หมัดทะลุไม่โดนระหว่างแปลงร่าง");
combat.clearFor(B); // hitbox ยังไม่หมดอายุ — ไม่ให้ไปโดนในข้อถัดไป

// ระหว่างแปลง กดอย่างอื่นไม่ติด
run(A, 200, { ...idle, attackPressed: true, left: true });
ok(A.isTransforming() && A.body.velocity.x === 0, "ระหว่างแปลงขยับ/ตีไม่ได้");

run(A, T.eruptAt - 200);
ok(scene.log.includes("fx.erupt") && A.lastAnim === "oat/tf_erupt", "ปะทุเป็นควัน (ท่าจากคลิป) + แฟลช");
ok(!A.isTransformed() && A.alpha === 0, "ยังไม่สลับร่าง · ตัวจริงซ่อน (ควันเป็นภาพซ้อน)");
run(A, T.swapAt - T.eruptAt + 32);
ok(A.alpha === 1, "สลับร่างแล้วโชว์ตัว (ใต้ควันที่กำลังจาง)");
ok(A.isTransformed() && A.animPrefix === "oattitan/" && A.texture.key === "oattitan" && A.characterKey === "oattitan", "สลับเป็นร่างไททัน (atlas / anim / ค่าต่อสู้)");
ok(A.formTimeLeft === TRANSFORM.titanDurationMs && A.formTimeLeft > 0, `v33 ร่างไททันมีเวลา ${TRANSFORM.titanDurationMs / 1000} วิ`);
A.formTimeLeft = 1e9; // ข้อทดสอบช่วงกลางใช้เวลาในร่างไททันรวมเกิน 25 วิ — ทดสอบหมดเวลาแยกไว้ท้ายไฟล์
ok(A._scaleArgs.targetWorldHeight === Math.round(baseH * TRANSFORM.sizeMul), `สูง ${A._scaleArgs.targetWorldHeight} = ${TRANSFORM.sizeMul} เท่าของ ${baseH}`);
ok(A.lastAnim === "oattitan/roar", "ไททันยืนคำราม (ไฟวาบ + ไอ จากคลิป)");
scene.log.length = 0;
run(A, T.roarShakeAt - T.swapAt);
ok(scene.log.includes("shake"), "กล้องสั่นตอนคำราม");
run(A, T.endAt - T.roarShakeAt + 32);
ok(!A.isTransforming() && !A.isInvulnerable() && A.isTransformed(), "จบท่า คุมตัวได้ในร่างไททัน");
ok(A.displayName === "OAT TITAN", "HUD ชื่อ OAT TITAN");

// ร่างไททันแปลงซ้ำไม่ได้
ok(!A.canTransform(), "อยู่ร่างไททันแล้วกดแปลงซ้ำไม่ได้");

// ค่าต่อสู้ร่างไททัน
const base = BASIC_COMBO[0], ti = resolveAttack(base, "oattitan");
const TM = CHARACTER_COMBAT.oattitan;
ok(ti.damage === Math.round(base.damage * TM.damageMul), `หมัดดาเมจ x${TM.damageMul} (${base.damage} -> ${ti.damage})`);
ok(ti.startup > base.startup && ti.recovery > base.recovery, `ช้าลง (startup ${base.startup}->${ti.startup}, recovery ${base.recovery}->${ti.recovery})`);
ok(ti.hitstun >= TM.minHitstun, `เหยื่อแข็ง ${ti.hitstun}ms`);
const tf = resolveAttack(FINISHER, "oattitan");
const tk = resolveAttack(TITAN_SKILL1.kick, "oattitan");
ok(tk.damage === Math.round(TITAN_SKILL1.kick.damage * TM.damageMul) && tk.hitstopKind === "sonic", `v33 ง้างเตะ: ดาเมจ ${tk.damage} · hitstop sonic เท่าแส้ S1`);

// ต่อยจริง -> hitstop x2 + กล้องสั่น + แข็ง 0.5 วิ
B.stateMachine.setState("idle", true); hits.length = 0; scene._hitstopMs = 0; scene.log.length = 0;
A.facing = 1; B.x = 60;
A.handleMovement({ ...idle, attackPressed: true }, 16);
for (let t = 0; t < 400 && !hits.length; t += 16) { A.handleMovement(idle, 16); combat.update(16, [A, B], () => true); }
ok(hits.length === 1 && hits[0].dmg === ti.damage, `หมัดไททันเข้า ดาเมจ ${hits[0]?.dmg}`);
ok(scene._hitstopMs === HITSTOP.normal * ti.hitstopMul && ti.hitstopMul > 2, `hitstop ${scene._hitstopMs}ms (ปกติ ${HITSTOP.normal})`);
ok(scene.log.includes("shake"), "กล้องสั่นตอนหมัดไททันเข้า");
ok(B.stateMachine.is("hitstun") && B._stunTimer >= TM.minHitstun, `เหยื่อแข็ง ${B._stunTimer}ms`);
while (scene._tickHitstop(16));

// สกิล 1 ร่างไททัน -> ใช้ท่ารัวของไททัน และจบคอมโบถูก (เดิมเช็ค === FINISHER พังกับค่าที่ resolve แล้ว)
run(A, 600);
A.handleMovement({ ...idle, skillPressed: 1 }, 16);
ok(A.isUsingSkill() && A.lastAnim === "oattitan/skill1", "v33 สกิล 1 = ง้างเตะ (ไม่ใช่หมัดรัวแล้ว)");
ok(A.skillCooldownLeft(1) === TITAN_SKILL1.cooldownMs, `คูลดาวน์ง้างเตะ ${TITAN_SKILL1.cooldownMs / 1000} วิ`);
{
  const S1 = Oat.FORM_ALT.skills[1];
  const contactMs = S1.hits[0].atMs;
  // super armor ช่วงง้าง: โดนตีไม่หลุดท่า
  A.applyHit({ damage: 5, knockbackX: 200, knockbackY: -100, hitstun: 300 });
  ok(A.isUsingSkill(), "ระหว่างง้าง โดนตีไม่หลุดท่า (super armor)");
  B.stateMachine.setState("idle", true); B.x = A.x + 110; B.body.velocity.x = 0; hits.length = 0; scene._hitstopMs = 0;
  for (let t = 16; t < contactMs - 16; t += 16) { A.handleMovement(idle, 16); combat.update(16, [A, B], () => true); }
  ok(hits.length === 0, `ยังไม่โดนระหว่างง้าง (โดนที่ ${contactMs}ms)`);
  for (let t = 0; t < 120 && !hits.length; t += 16) { A.handleMovement(idle, 16); combat.update(16, [A, B], () => true); }
  ok(hits.length === 1 && hits[0].dmg === tk.damage, `เตะโดนเป้าห่าง 110px ดาเมจ ${hits[0]?.dmg}`);
  ok(scene._hitstopMs === HITSTOP.sonic, `hitstop ${scene._hitstopMs}ms = แส้ S1 (${HITSTOP.sonic})`);
  ok(B.body.velocity.x >= tk.knockbackX * 0.9, `เป้ากระเด็นไกล (vx ${Math.round(B.body.velocity.x)})`);
  while (scene._tickHitstop(16));
}
run(A, 1500);
ok(!A.isAttacking() && A.comboStep === 0, "สกิลจบ กลับท่าปกติ คอมโบรีเซ็ต");

// ── สกิล 2 ไททัน ──
const S2 = Oat.FORM_ALT.skills[2];
ok(A.isSkillEnabled(2) && A.isSkillEnabled(3), "ร่างไททันมีสกิล 2 และ 3");
run(A, 600);
B.stateMachine.setState("idle", true); B.x = A.x - 150; hits.length = 0; scene._hitstopMs = 0; scene.log.length = 0;
A.facing = 1; // หันขวา แต่ B อยู่ซ้าย -> หนามต้องโดนทั้งสองฝั่ง
A.handleMovement({ ...idle, skillPressed: 2 }, 16);
ok(A.isUsingSkill() && A.lastAnim === "oattitan/skill2", "กด numpad 5 -> สกิล 2 (ท่าจากคลิป)");
ok(A.skillCooldownLeft(2) === TITAN_SKILL2.cooldownMs, `คูลดาวน์ ${TITAN_SKILL2.cooldownMs / 1000} วิ`);
// super armor: โดนตีระหว่างท่าไม่สะดุด
const bx = B.x; B.x = A.x - 40; // เข้าระยะหมัดชั่วคราว
combat.spawnHitbox({ attacker: B, duration: 30, spec: BASIC_COMBO[0] });
B.facing = 1; combat.update(16, [A, B], () => true);
B.x = bx; combat.clearFor(B);
ok(A.isUsingSkill() && hits.some((h) => h.v === A), "โดนตีระหว่างท่า: เลือดลดแต่ท่าไม่หลุด (super armor)");
hits.length = 0;
const tick = (ms) => { for (let t = 0; t < ms; t += 16) { A.handleMovement(idle, 16); combat.update(16, [A, B], () => true); while (scene._tickHitstop(16)); if (B.isStunned()) B.body.velocity.x = B.body.velocity.x; } };
tick(S2.hits[0].atMs + 40);
const w1 = resolveAttack(TITAN_SKILL2.wave1, "oattitan");
ok(hits.length === 1 && hits[0].dmg === w1.damage, `ระลอก 1 โดนคนด้านหลัง ดาเมจ ${hits[0]?.dmg}`);
ok(B.body.velocity.x < 0, "กระเด็นออกจากตัวไททัน (ไปทางซ้าย ทั้งที่ไททันหันขวา)");
ok(scene.log.includes("shake"), "กล้องสั่นตอนทุบพื้น");
B.stateMachine.setState("idle", true); B.x = A.x + Math.round(TITAN_SKILL2.wave2.aoe.halfWidth * 0.95); // ขอบนอกระลอก 2 (ระลอก 1 ไม่ถึง)
tick(S2.hits[1].atMs - S2.hits[0].atMs);
const w2 = resolveAttack(TITAN_SKILL2.wave2, "oattitan");
ok(hits.length === 2 && hits[1].dmg === w2.damage, `ระลอก 2 ดาเมจ ${hits[1]?.dmg}`);
ok(B.body.velocity.x > 0 && B.body.velocity.y < -500, "ระลอก 2 ดีดขึ้นสูง ออกจากตัวไททัน");
ok(A.hitsLanded === 0, "หมัดสกิล 2 ไม่นับเข้าคอมโบ");
tick(S2.durationMs - S2.hits[1].atMs + 50);
ok(!A.isUsingSkill() && scene.log.includes("fx.shatter"), "จบท่า + เศษคริสตัลแตก");
A.handleMovement({ ...idle, skillPressed: 2 }, 16);
ok(!A.isUsingSkill(), "ติดคูลดาวน์ กดซ้ำไม่ได้");

// ── สกิล 3 ไททัน: คำราม + ไททันบ้า ──
{
  const { CrazyTitanSystem } = await import(G + "/systems/CrazyTitanSystem.js");
  const { TITAN_SKILL3, GUARD } = await import(G + "/config/combat.config.js");
  const crazy = new CrazyTitanSystem(scene);
  scene.crazyTitans = crazy;
  scene.cameras.main.worldView = { x: -400, y: 0, width: 1400, height: 720 };
  const hp = new Map([[A, 200], [B, 200]]);
  scene.stocks = new Map([[A, 3], [B, 3]]);
  scene._applyDamage = (v, d, blocked) => hp.set(v, hp.get(v) - (blocked ? Math.round(d * 0.25) : d));
  const alive = () => true;
  const step = (ms, inputA = idle, inputB = idle) => {
    for (let t = 0; t < ms; t += 16) {
      A.handleMovement(inputA, 16); B.handleMovement(inputB, 16);
      combat.update(16, [A, B], alive); crazy.update(16, [A, B], alive);
      while (scene._tickHitstop(16));
    }
  };
  B.stateMachine.setState("idle", true); A.stateMachine.setState("idle", true);
  A.x = 300; B.x = 100; A._skillCd = {};
  const hpStart = hp.get(B);
  A.handleMovement({ ...idle, skillPressed: 3 }, 16);
  ok(A.isUsingSkill() && A.lastAnim === "oattitan/skill3", "กด numpad 6 -> สกิล 3 ยืนคำราม (คลิป H)");
  step(TITAN_SKILL3.spawnAtMs + 40);
  ok(crazy.pending.length + crazy.runners.length === 3 && crazy.pending.length > 0, "เรียกไททันบ้า 3 ตัว (ทยอยเกิด)");
  step(1300 - TITAN_SKILL3.spawnAtMs);
  ok(!A.isUsingSkill(), `คำรามจบใน ~${S3def().durationMs}ms -> คุมตัวได้`);
  ok(crazy.runners.length === 3, "ไททันบ้าออกมาครบ");
  ok(crazy.runners.every((r) => r.x >= -400 + TITAN_SKILL3.startInset), "เกิดที่ขอบซ้ายของจอ");
  // ระหว่างไททันบ้าวิ่ง เจ้าของต่อยได้
  A.handleMovement({ ...idle, attackPressed: true }, 16);
  ok(A.isAttacking(), "ระหว่างไททันบ้าวิ่ง ต่อยปกติได้");
  step(400);
  // B ยืนเฉย -> โดนลาก
  const hpB = hpStart;
  let grabbed = B.isGrabbed(), maxX = B.x;
  for (let t = 0; t < 4000 && !grabbed; t += 16) { step(16); grabbed = B.isGrabbed(); }
  ok(grabbed && hp.get(B) === hpB - TITAN_SKILL3.grabDamage, `ไททันบ้าชน B -> โดนลาก ดาเมจ ${hpB - hp.get(B)}`);
  // ระหว่างโดนลาก: คุมไม่ได้ + โดนตีไม่หลุด + ถูกพาไปทางขวา
  B.handleMovement({ ...idle, left: true, attackPressed: true }, 16);
  ok(B.isGrabbed() && !B.isAttacking(), "โดนลากอยู่ ทำอะไรไม่ได้");
  const x0 = B.x;
  combat.spawnHitbox({ attacker: A, duration: 10, spec: BASIC_COMBO[0] });
  const bx = A.x; A.x = B.x - 40; A.facing = 1; combat.update(16, [A, B], alive); A.x = bx; combat.clearFor(A);
  ok(B.isGrabbed(), "โดนต่อยระหว่างลาก ไม่หลุด");
  for (let t = 0; t < 400; t += 16) { crazy.update(16, [A, B], alive); maxX = Math.max(maxX, B.x); }
  ok(maxX > x0 + 100, `ถูกลากไปทางขวา ${Math.round(maxX - x0)}px`);
  // จนสุดจอ -> เหวี่ยงทิ้ง
  const hpBefore = hp.get(B);
  for (let t = 0; t < 6000 && B.isGrabbed(); t += 16) crazy.update(16, [A, B], alive);
  ok(!B.isGrabbed() && B.stateMachine.is("hitstun"), "สุดทาง -> ปล่อย + กระเด็น (hitstun)");
  ok(hp.get(B) === hpBefore - TITAN_SKILL3.releaseDamage, `ดาเมจตอนเหวี่ยง ${hpBefore - hp.get(B)}`);
  ok(B.x <= 1000 + 60 && B.x > 800, `ไปหยุดใกล้ขอบขวาของจอ (x=${Math.round(B.x)}, ขอบจอ 1000)`);
  for (let t = 0; t < 3000; t += 16) crazy.update(16, [A, B], alive);
  ok(crazy.runners.length === 0 && crazy.pending.length === 0, "ไททันบ้าหายไปหมดเมื่อถึงปลายทาง");

  // กันทัน -> ไม่โดนลาก
  run(A, TITAN_SKILL3.cooldownMs + 500); // รอคูลดาวน์สกิล 3
  B.stateMachine.setState("idle", true); B.guard = GUARD.max; B.x = 100; B.body.velocity.x = 0;
  A.handleMovement({ ...idle, skillPressed: 3 }, 16);
  const hpB2 = hp.get(B); let touched = false;
  for (let t = 0; t < 5000; t += 16) {
    step(16, idle, { ...idle, blockHeld: true });
    if (crazy.runners.some((r) => r.ignored.has(B))) touched = true;
    ok.silent = true;
    if (B.isGrabbed()) break;
    B.x = 100; // ยืนกันอยู่ที่เดิม
  }
  ok(touched && !B.isGrabbed(), "กดกันทัน -> ไม่โดนลาก");
  ok(hp.get(B) < hpB2 && hpB2 - hp.get(B) <= TITAN_SKILL3.grabDamage, `กันได้ โดนดาเมจเศษ ${hpB2 - hp.get(B)}`);
  ok(B.guard < GUARD.max, "กันได้ แต่มาตรการ์ดลด");
  for (let t = 0; t < 5000; t += 16) crazy.update(16, [A, B], alive);
  // ตายระหว่างโดนลาก -> ปล่อย
  B.stateMachine.setState("idle", true);
  const fake = { x: 0, def: { reach: 40 }, holdPosition() {} };
  B.grabBy(fake);
  crazy.runners.push({ victim: B, update() {}, done: false, destroy() {} });
  crazy.dropVictim(B);
  ok(!B.isGrabbed() && crazy.runners[0].victim === null, "ตายระหว่างโดนลาก -> ปล่อยทิ้ง");
  crazy.runners.length = 0;
}
function S3def() { return Oat.FORM_ALT.skills[3]; }

// เลือดหมด -> กลับร่าง (ตั้งคูลดาวน์แปลงร่างคงเหลือไว้ — ข้อทดสอบสกิล 3 รอจนหมดไปแล้ว)
A.transformCooldown = 10000;
A.revertForm();
ok(!A.isTransformed() && A.animPrefix === "oat/" && A.texture.key === "oat" && A._scaleArgs.targetWorldHeight === baseH, "กลับร่างเดิมครบ");
ok(A.displayName === "OAT", "HUD ชื่อกลับเป็น OAT");
ok(!A.isSkillEnabled(2), "ร่างปกติไม่มีสกิล 2");
ok(!A.canTransform() && A.transformCooldown > 0, `ยังติดคูลดาวน์ (${Math.ceil(A.transformCooldown / 1000)} วิ)`);
run(A, A.transformCooldown + 50);
ok(A.canTransform(), "ครบ 30 วิ แปลงได้อีก");

// ตายระหว่างแปลง (กันไว้) -> revert ต้องไม่ค้าง state
A.handleMovement({ ...idle, transformPressed: true }, 16);
run(A, T.swapAt + 100);
A.revertForm();
ok(!A.isTransforming() && !A.isTransformed() && A.animPrefix === "oat/", "กลับร่างกลางท่าแปลง ไม่ค้าง");

// ── หลอดเลือดแยกของไททัน (v26e) ──
{
  A.transformCooldown = 0; A._formBreakInvuln = 0; A.stateMachine.setState("idle", true);
  A.handleMovement({ ...idle, transformPressed: true }, 16);
  run(A, T.endAt + 50);
  const H = TRANSFORM.titanHp;
  ok(A.isTransformed() && A.formHp === H && A.formMaxHp === H, `แปลงร่างแล้วหลอดไททันเต็ม ${A.formHp}/${A.formMaxHp}`);
  ok(A._scaleArgs.targetWorldHeight === Math.round(baseH * 1.2), `ไททันสูง 1.2 เท่า (${A._scaleArgs.targetWorldHeight})`);
  const mini = {
    playerAlive: new Map([[A, true]]), gameOver: false, hp: new Map([[A, 200]]), deaths: 0,
    _setPlayerHp(p, v) { this.hp.set(p, v); }, _handlePlayerDeath() { this.deaths++; },
  };
  const dmg = (d, blocked = false) => MainGameScene.prototype._applyDamage.call(mini, A, d, blocked);
  dmg(40);
  ok(A.formHp === H - 40 && mini.hp.get(A) === 200, "โดนตีตอนเป็นไททัน -> หักหลอดไททัน หลอด OAT ไม่ลด");
  dmg(20, true);
  ok(A.formHp === H - 45, "กันได้ -> หักหลอดไททันแค่ 25%");
  scene.log.length = 0; scene._hitstopMs = 0;
  dmg(A.formHp + 50);
  ok(!A.isTransformed() && A.animPrefix === "oat/" && A._scaleArgs.targetWorldHeight === baseH, "หลอดไททันหมด -> กลับร่าง OAT");
  ok(mini.hp.get(A) === 200 && mini.deaths === 0, "ไม่เสียชีวิต · ดาเมจส่วนเกินทิ้ง (หลอด OAT เต็มเท่าเดิม)");
  ok(A.formHp === 0 && A.displayName === "OAT", "หลอดไททันรีเซ็ต · HUD ชื่อกลับเป็น OAT");
  ok(A.isInvulnerable() && scene.log.includes("fx.revertPuff") && scene.log.includes("shake") && scene._hitstopMs >= TRANSFORM.formBreak.hitstopMs, "อมตะ + ควัน + กล้องสั่น + hitstop");
  dmg(30);
  ok(mini.hp.get(A) === 200, "ระหว่างอมตะ ดาเมจไม่เข้า");
  hits.length = 0;
  combat.spawnHitbox({ attacker: B, duration: 30, spec: BASIC_COMBO[0] });
  B.x = A.x + 40; B.facing = -1; combat.update(16, [A, B], () => true); combat.clearFor(B);
  ok(hits.length === 0, "ระหว่างอมตะ หมัดทะลุ");
  run(A, TRANSFORM.formBreak.invulnMs + 32);
  ok(!A.isInvulnerable() && A.alpha === 1, "หมดอมตะ ตัวไม่โปร่งค้าง");
  dmg(30);
  ok(mini.hp.get(A) === 170, "หลังจากนั้นหักหลอด OAT ตามปกติ");
  ok(!A.canTransform() && A.transformCooldown > 0, "คูลดาวน์แปลงร่างนับต่อ ไม่รีเซ็ต");
}

// ── v33 ร่างไททันหมดเวลา ──
{
  const C = new Oat(scene, 0, 0, 0); C.combat = combat; C.facing = 1;
  C.handleMovement({ ...idle, transformPressed: true }, 16);
  ok(C.transformCooldown === TRANSFORM.cooldownMs, `คูลดาวน์แปลงร่าง ${TRANSFORM.cooldownMs / 1000} วิ`);
  run(C, TRANSFORM.timeline.endAt + 50);
  ok(C.isTransformed() && !C.isTransforming(), "แปลงเสร็จ คุมตัวได้");
  run(C, TRANSFORM.titanDurationMs - 1000);
  ok(C.isTransformed() && C.formTimeLeft > 0 && C.formTimeLeft <= 1000, `ใกล้หมดเวลายังเป็นไททัน (เหลือ ${Math.round(C.formTimeLeft)}ms)`);
  C.handleMovement({ ...idle, skillPressed: 2 }, 16); // กดสกิลยาวค้างไว้ข้ามเวลาหมด
  run(C, 1200);
  ok(C.isTransformed() && C.isUsingSkill(), "หมดเวลาระหว่างสกิล -> รอให้ท่าจบก่อน ไม่ตัดกลางท่า");
  run(C, 4000);
  ok(!C.isTransformed() && C.animPrefix === "oat/" && C.formTimeLeft === 0, "สกิลจบ -> กลับร่าง OAT เอง");
  ok(!C.isInvulnerable(), "หมดเวลา ≠ หลอดแตก: ไม่มีอมตะ");
  ok(C.transformCooldown > 0, "คูลดาวน์แปลงร่างยังนับต่อ");
}

