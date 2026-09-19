// ทดสอบ Dear V.2 สกิล 1-2 ลูกโป่ง (v34) แบบไม่เปิดเบราว์เซอร์
// รัน: node tools/tests/balloon.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { DearV2 } = await import(G + "/entities/DearV2.js");
const { ROSTER } = await import(G + "/entities/roster.js");
const { CombatSystem } = await import(G + "/systems/CombatSystem.js");
const { BalloonSystem } = await import(G + "/systems/BalloonSystem.js");
const { DEARV2_BALLOON: BB, DEARV2_SNEAK } = await import(G + "/config/dearv2.config.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const idle = { left: false, right: false, jumpPressed: false, attackPressed: false, summonPressed: false, tauntPressed: false, blockHeld: false, skillPressed: 0, transformPressed: false };

function setup() {
  const scene = makeScene();
  for (const m of ["_applyDamage", "_setPlayerHp"]) scene[m] = MainGameScene.prototype[m];
  const labels = [];
  scene.showFloatLabel = (p, t) => labels.push(t);
  scene.audio.playSample = (k) => scene.log.push("sample:" + k);
  scene._hitstopMs = 0;
  scene.hitstop = () => {};
  const combat = new CombatSystem(scene, (v, a, d, b, spec) => scene._applyDamage(v, d, b, { trueDamage: !!spec?.trueDamage }));
  scene.combat = combat;
  scene.balloons = new BalloonSystem(scene);
  combat.extraTargets = () => scene.balloons.hurtTargets();
  const A = new DearV2(scene, 0, 0, 0); A.combat = combat; A.facing = 1;
  const B = new ROSTER.marchv2(scene, 200, 0, 1); B.combat = combat; B.facing = -1;
  scene.players = [A, B];
  scene.playerAlive = new Map([[A, true], [B, true]]);
  scene.hp = new Map([[A, 200], [B, 200]]);
  scene.gameOver = false;
  const alive = () => true;
  const step = (ms, inA = idle, inB = idle) => {
    for (let t = 0; t < ms; t += 16) {
      A.handleMovement(inA, 16); B.handleMovement(inB, 16);
      combat.update(16, scene.players, alive);
      scene.balloons.update(16, scene.players, alive);
    }
  };
  return { scene, A, B, step, labels };
}

// ── S1 เขวี้ยงลูกโป่ง ──
{
  const { scene, A, B, step, labels } = setup();
  A.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(A.isUsingSkill() && A.lastAnim === "dearv2/balloon_throw", "S1 = ท่าเขวี้ยงลูกโป่ง");
  ok(A.skillCooldownLeft(1) === BB.throw.cooldownMs, `คูลดาวน์ ${BB.throw.cooldownMs / 1000} วิ`);
  const relMs = Math.round((BB.throw.releaseIndex / BB.throw.fps) * 1000);
  step(relMs - 40);
  ok(scene.balloons.projectiles.length === 0, "ยังไม่ปล่อยก่อนเฟรมปล่อยมือ");
  step(40);
  ok(scene.balloons.projectiles.length === 1 && scene.log.includes("sample:dv2_balloon_throw"), "ปล่อยมือ -> ลูกโป่งลอย + เสียงเขวี้ยง");
  let t = 0;
  while (!B.isRooted() && t < 2000) { step(16); t += 16; }
  ok(B.isRooted() && B.isSilenced() && B.isBlinded(), `ชนเป้าห่าง 200px (~${t}ms) -> ยืนนิ่ง + ใบ้ + ตาบอด`);
  ok(scene.hp.get(B) === 200 - BB.throw.damage && labels.includes("DAZED"), `ดาเมจ ${BB.throw.damage} + ป้าย DAZED`);
  ok(scene.balloons.effects.some((e) => e.kind === "confetti") && scene.log.includes("sample:dv2_confetti"), "confetti บังตัว + เสียง");
  ok(scene.balloons.projectiles.length === 0, "ลูกโป่งแตกหายไป");

  const bx = B.x;
  step(300, idle, { ...idle, left: true, jumpPressed: true });
  ok(B.x === bx && B.body.velocity.x === 0, "ยืนนิ่ง (root): กดเดิน/กระโดดไม่ขยับ");
  B.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(!B.isUsingSkill() && !B.stateMachine.is("finisher"), "ใบ้ (silence): กดสกิลไม่ออก");
  const hpA = scene.hp.get(A);
  B.x = A.x + 60; B.facing = -1;
  B.handleMovement({ ...idle, attackPressed: true }, 16); step(300);
  ok(scene.hp.get(A) === hpA && labels.includes("MISS"), "ตาบอด (blind): ตีวืด + ป้าย MISS");
  step(BB.throw.statusMs);
  ok(!B.isRooted() && !B.isSilenced() && !B.isBlinded(), `ครบ ${BB.throw.statusMs / 1000} วิ สถานะหมด`);
}
// กันทัน = ไม่มึน · ย่องอยู่ = ไม่ติดสถานะ
{
  const { scene, A, B, step } = setup();
  B._blockHeld = true; B.stateMachine.setState("block", true);
  scene.balloons.throwBalloon(A);
  for (let t = 0; t < 1500 && scene.balloons.projectiles.length; t += 16) scene.balloons.update(16, scene.players, () => true);
  ok(!B.isRooted() && scene.hp.get(B) < 200, "เป้ากันอยู่: โดนดาเมจ (ลด) แต่ไม่มึน");
  const C = new DearV2(scene, 200, 0, 1); C.startSneak(DEARV2_SNEAK);
  ok(C.applyStatus("root", 1000) === false && !C.isRooted(), "คนที่ย่องอยู่ไม่ติดสถานะ");
}

// ── numpad 8 เลือกผลกับดัก ──
{
  const { A } = setup();
  const seen = [A.skillLabelSuffix(2)];
  for (let i = 0; i < 3; i++) { A.handleMovement({ ...idle, transformPressed: true }, 16); seen.push(A.skillLabelSuffix(2)); }
  ok(seen.join("") === "☠🎁🤡☠", `numpad 8 วนผล: ${seen.join(" → ")} (ปุ่ม S2 บน HUD โชว์ไอคอน)`);
  A.applyStatus("silence", 500);
  A.handleMovement({ ...idle, transformPressed: true }, 16);
  ok(A.trapMode === 0, "ติดใบ้อยู่เปลี่ยนผลไม่ได้");
}

// ── S2 ควันพิษ: ครบฟิวส์ระเบิดเอง ──
{
  const { scene, A, B, step } = setup();
  B.x = 400;
  A.handleMovement({ ...idle, skillPressed: 2 }, 16);
  ok(A.lastAnim === "dearv2/balloon_place" && A.skillCooldownLeft(2) === BB.trap.cooldownMs, "S2 = ท่าวางลูกโป่ง + คูลดาวน์");
  step(Math.round((BB.trap.placeIndex / BB.trap.fps) * 1000) + 20);
  const tr = scene.balloons.traps[0];
  ok(tr && tr.mode === "poison" && Math.abs(tr.x - (A.x + BB.trap.offsetX)) < 1, "วางกับดักหน้าตัว (ผลที่เลือก = ควันพิษ)");
  step(BB.trap.fuseMs - 100);
  ok(scene.balloons.traps.length === 1, "ก่อนครบ 2 วิ ยังไม่แตก");
  B.x = tr.x + 40; // เดินเข้ามาอยู่ในวงตอนระเบิดพอดี (หลังครบฟิวส์ — ไม่ใช่เพราะแตะ)
  step(140);
  ok(scene.balloons.traps.length === 0 && scene.log.includes("sample:dv2_pop_poison"), "ครบ 2 วิ แตกเป็นควันพิษ + เสียง");
  const afterBurst = scene.hp.get(B);
  ok(afterBurst <= 200 - BB.trap.poison.burstDamage, `ดาเมจระเบิด ${BB.trap.poison.burstDamage}`);
  step(BB.trap.poison.durationMs);
  const ticks = (afterBurst - scene.hp.get(B)) / BB.trap.poison.tickDamage;
  ok(ticks >= 4 && ticks <= 5, `ยืนในควันต่อ: ติ๊ก ${ticks} ครั้ง × ${BB.trap.poison.tickDamage}`);
  ok(!scene.balloons.effects.some((e) => e.kind === "poison"), "ควันหมดอายุหายไป");
}

// ── S2 กล่องไขลาน: ศัตรูเดินชนก่อนครบฟิวส์ ──
{
  const { scene, A, B, step } = setup();
  A.trapMode = 1; B.x = 500;
  scene.balloons.placeTrap(A);
  const tr = scene.balloons.traps[0];
  step(400);
  B.x = tr.x + 20;
  step(32);
  ok(scene.balloons.traps.length === 0 && scene.balloons.effects.some((e) => e.kind === "jackbox"), "เดินชนก่อนครบฟิวส์ -> แตกทันที เป็นกล่องไขลาน");
  step(BB.trap.jackbox.popAtMs);
  ok(B.body.velocity.y < -500 && B.isStunned(), `ตุ๊กตาเด้งตีลอย (vy ${Math.round(B.body.velocity.y)}) + สะดุด`);
  ok(scene.hp.get(B) === 200 - BB.trap.jackbox.damage && scene.log.includes("sample:dv2_jackbox"), `ดาเมจ ${BB.trap.jackbox.damage} + เสียงกล่อง`);
}

// ── S2 ตัวตลกตัวเล็ก 3 ตัว: ไล่เป้าใกล้สุด -> รุมแทง / ไม่เจอเป้า-เป้าหนีทันหายไป ──
{
  const { scene, A, B, step } = setup();
  A.trapMode = 2; B.x = 5000; // ไกลเกินไล่ทันใน chaseMs
  scene.balloons.placeTrap(A);
  step(BB.trap.fuseMs + 50);
  ok(
    scene.balloons.clowns.length === BB.trap.swarm.count && scene.log.includes("sample:dv2_bald_laugh"),
    `แตกเป็นตัวตลกตัวเล็ก ${BB.trap.swarm.count} ตัว + เสียงหัวเราะ`,
  );
  ok(scene.balloons.clowns.every((c) => !c.caught), "ยังไล่ไม่ทัน (เป้าไกลเกิน)");
  step(BB.trap.swarm.chaseMs + BB.trap.swarm.count * BB.trap.swarm.delayMs + BB.trap.swarm.fadeMs + 50);
  ok(scene.balloons.clowns.length === 0, `ไล่ไม่ทันภายใน ${BB.trap.swarm.chaseMs / 1000} วิ (เป้าหนีทัน) -> หายไปหมด`);
  const hpB = scene.hp.get(B);
  ok(hpB === 200, "ตัวตลกไล่ไม่ทัน ไม่ได้ทำดาเมจเลย");
}
{
  const { scene, A, B, step } = setup();
  A.trapMode = 2; B.x = A.x + BB.trap.offsetX + 10; // อยู่ใกล้ ให้ไล่ทัน
  scene.balloons.placeTrap(A);
  step(BB.trap.fuseMs + 50);
  const clowns = scene.balloons.clowns;
  ok(clowns.length === BB.trap.swarm.count, `แตกเป็นตัวตลกตัวเล็ก ${BB.trap.swarm.count} ตัว`);
  const hpB = scene.hp.get(B);
  let t = 0;
  while (!clowns.every((c) => c.caught) && t < BB.trap.swarm.chaseMs) { step(16); t += 16; }
  ok(clowns.every((c) => c.caught), `ไล่ทันทั้ง ${BB.trap.swarm.count} ตัว (~${t}ms)`);
  step(BB.trap.swarm.stabIntervalMs + 32);
  ok(scene.hp.get(B) < hpB, "จับได้แล้ว -> เริ่มรุมแทง มีดาเมจ");
  // ตัวตลกไม่โดนตี (ไม่ hittable) และไม่ทำร้ายเจ้าของ
  ok(!clowns[0].hurtRect, "ตัวตลกตัวเล็กโดนตีไม่ได้");
  const hpA = scene.hp.get(A);
  step(2000);
  ok(scene.hp.get(A) === hpA, "ตัวตลกไม่ทำร้ายเจ้าของ");
  // แทงครบโควตาแล้วจางหายเอง
  let guard = 0;
  while (clowns.length && guard < 400) { step(16); guard++; }
  ok(scene.balloons.clowns.length === 0, `แทงครบ ${BB.trap.swarm.maxStabs} ทีต่อตัวแล้วจางหายเอง`);
}

// ── วางลูกใหม่ = ลูกเก่าฝ่อ · ตาย = เก็บกวาด ──
{
  const { scene, A } = setup();
  scene.balloons.placeTrap(A); scene.balloons.placeTrap(A);
  scene.balloons.update(16, scene.players, () => true);
  ok(scene.balloons.traps.length === 1, "วางได้ทีละลูกต่อคน");
  scene.balloons.clear(A);
  ok(scene.balloons.traps.length === 0, "clear(เจ้าของ) เก็บกวาดหมด");
}
