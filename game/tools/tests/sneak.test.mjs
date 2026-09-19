// ทดสอบ Dear V.2 สกิล 2 "ย่อง" (v32) แบบไม่เปิดเบราว์เซอร์
// รัน: node tools/tests/sneak.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { DearV2 } = await import(G + "/entities/DearV2.js");
const { KunJae } = await import(G + "/entities/KunJae.js");
const { Player } = await import(G + "/entities/Player.js");
const { CombatSystem } = await import(G + "/systems/CombatSystem.js");
const { BASIC_COMBO } = await import(G + "/config/combat.config.js");
const { DEARV2_SNEAK: S } = await import(G + "/config/dearv2.config.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");

const scene = makeScene();
const proto = MainGameScene.prototype;
scene._hitstopMs = 0;
for (const m of ["hitstop", "_tickHitstop", "_applyDamage", "_setPlayerHp", "_updateHitstopExempt", "_drawGuardBars"]) scene[m] = proto[m];
const samples = [];
scene.audio.playSample = (k, o) => samples.push(k);
scene.showFloatLabel = () => {};
scene.shadows = { update() {} };
scene.guardBars = { clear() {}, fillStyle() { return this; }, fillRect() { return this; } };

const hits = [];
const combat = new CombatSystem(scene, (v, a, dmg, blocked, spec) => {
  hits.push({ v, dmg, blocked, spec });
  scene._applyDamage(v, dmg, blocked, { trueDamage: !!spec?.trueDamage });
});
const A = new DearV2(scene, 0, 0, 0); A.combat = combat; A.facing = 1;
const B = new KunJae(scene, 60, 0, 1); B.combat = combat;
scene.players = [A, B];
scene.p1 = A; scene.p2 = B;
scene.playerAlive = new Map([[A, true], [B, true]]);
scene.hp = new Map([[A, 200], [B, 200]]);
scene.gameOver = false;

const idle = { left: false, right: false, jumpPressed: false, attackPressed: false, summonPressed: false, tauntPressed: false, blockHeld: false, skillPressed: 0, transformPressed: false };
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const run = (p, ms, input = idle) => { for (let t = 0; t < ms; t += 16) p.handleMovement(input, 16); };
const tick = (ms) => { for (let t = 0; t < ms; t += 16) { A.handleMovement(idle, 16); combat.update(16, [A, B], () => true); } };

// ── เปิดสกิล ──
ok(A.isSkillEnabled(3) && !A.isSneaking(), "Dear V.2 ย่องอยู่สกิล 3 (ultimate) · ยังไม่ย่อง");
A.handleMovement({ ...idle, skillPressed: 3 }, 16);
ok(A.isUsingSkill() && A.lastAnim === "dearv2/sneak_in", "กดสกิล 3 -> ท่าย่อตัวเข้าโหมด (sneak_in)");
ok(A.isSneaking() && A.alpha === S.alpha, "ย่องตั้งแต่เฟรมแรกของท่าเข้าโหมด + ตัวโปร่ง");
ok(samples.includes("dv2_sneak_laugh"), "เสียงหัวเราะตอนเปิดสกิล");
ok(A.skillCooldownLeft(3) === S.cooldownMs, `คูลดาวน์ ${S.cooldownMs / 1000} วิ นับตั้งแต่กด`);
run(A, S.introMs + 50);
ok(A.stateMachine.is("idle") && A.lastAnim === "dearv2/sneak_idle", "จบท่าเข้า -> ยืนท่าย่อง (idle ถูกแทนด้วย sneak_idle)");
run(A, 32, { ...idle, right: true });
ok(A.lastAnim === "dearv2/sneak_walk", "เดิน -> ท่าย่องเดิน");
ok(Math.abs(A.body.velocity.x - 260 * S.speedMul) < 1, `เดินช้าลงเหลือ ${S.speedMul * 100}%`);
A.body.setVelocityX(0); run(A, 32);

// ── ไม่ติดสถานะ ──
A.applyHit({ damage: 9, knockbackX: 300, knockbackY: -200, hitstun: 400 });
ok(!A.isStunned() && A.body.velocity.x === 0 && A.body.velocity.y === 0, "โดนตี: ไม่สะดุด ไม่กระเด็น");
ok(!A.tryBlock() && !A.isBlocking(), "กันไม่ได้ระหว่างย่อง (กันแล้วการ์ดแตกได้)");
ok(A.canBeGrabbed() === false && A.grabBy({}) === false && !A.isGrabbed(), "ลากไม่ได้ (grabBy คืน false)");
ok(A.ignoresHitstop() && A.isStatusImmune(), "ไม่ติด hitstop / ไม่ติดสถานะ");

// ── ดาเมจที่ได้รับ ──
scene.hp.set(A, 200);
scene._applyDamage(A, 10, false);
ok(Math.abs(scene.hp.get(A) - 199) < 1e-9, "ดาเมจปกติ 10 -> เหลือ 1 (ลด 90%)");
scene._applyDamage(A, 10, false, { trueDamage: true });
ok(Math.abs(scene.hp.get(A) - 189) < 1e-9, "True Damage 10 -> เต็ม 10 (ไม่สนการลดของโหมดย่อง)");

// ── ย่องแทง ──
scene.hp.set(B, 200); B.stateMachine.setState("block", true); B._blockHeld = true;
B.x = A.x + 70; hits.length = 0;
A.handleMovement({ ...idle, attackPressed: true }, 16);
ok(A.stateMachine.is("sneakstab") && A.lastAnim === "dearv2/sneak_stabA", "ปุ่มตีระหว่างย่อง = ย่องแทง (ท่า A)");
ok(samples.some((k) => k.startsWith("dv2_sneak_stab")), "เสียงมีด (สุ่มจาก 3 ไฟล์)");
tick(S.stab.startup + 20);
ok(hits.length === 1 && hits[0].spec.trueDamage && hits[0].blocked, "มีดเข้าเป้าที่กันอยู่ (spec.trueDamage)");
ok(scene.hp.get(B) === 200 - S.stab.damage, `True Damage ทะลุการกัน: หัก ${S.stab.damage} เต็ม (ปกติกันเหลือ 25%)`);
ok(hits[0].spec.feedsCombo === undefined && A.hitsLanded === 0, "ย่องแทงไม่นับคอมโบ");

// กดรัวก่อนมีดพุ่งออก = จองไว้ · หลังพุ่งออก = แทงใหม่ทันที
B.stateMachine.setState("idle", true); B._blockHeld = false;
tick(S.stab.cancelAfterMs - (S.stab.startup + 20) + 16); // ให้เลยจุดที่มีดพุ่งออกแล้ว (ยังอยู่ในช่วงชักมีดกลับ)
ok(A.stateMachine.is("sneakstab") && A._atk.phase === "recovery", "ยังอยู่ช่วงชักมีดกลับ");
A.handleMovement({ ...idle, attackPressed: true }, 16); // elapsed > cancelAfterMs -> ตัดท่า
ok(A.lastAnim === "dearv2/sneak_stabB" && A._atk.elapsed < 20, "รัวหลังมีดพุ่งออก -> ตัดท่า แทงใหม่ทันที (สลับท่า B)");
A.handleMovement({ ...idle, attackPressed: true }, 16);
ok(A.attackQueued && A.lastAnim === "dearv2/sneak_stabB", "รัวเร็วเกิน (มีดยังไม่ออก) -> จองไว้ ไม่ตัดท่า");
tick(S.stab.startup + S.stab.active + S.stab.recovery + 20);
ok(A.stateMachine.is("sneakstab") && A.lastAnim === "dearv2/sneak_stabA" && !A.attackQueued, "จบท่าแล้วแทงต่อจากที่จองไว้");
// รัวเต็มที่ ~1 วิ -> นับจำนวนแทง
let stabs = 0;
const orig = A.stateMachine.setState.bind(A.stateMachine);
A.stateMachine.setState = (n, f) => { if (n === "sneakstab") stabs++; return orig(n, f); };
for (let t = 0; t < 1000; t += 16) A.handleMovement({ ...idle, attackPressed: (t / 16) % 2 === 0 }, 16);
A.stateMachine.setState = orig;
ok(stabs >= 7 && stabs <= 10, `รัวปุ่มสุดแรง 1 วิ = ${stabs} แทง (เพดาน ~${(1000 / S.stab.cancelAfterMs).toFixed(1)})`);
run(A, 400);

// ── hitstop: ทั้งจอหยุด ตัวที่ย่องเดินต่อ ──
scene._readP1Input = () => ({ ...idle, right: true });
scene._npcInput = () => idle;
A.stateMachine.setState("idle", true);
scene.hitstop(200);
const x0 = A.x, bx0 = B.x;
for (let t = 0; t < 160; t += 16) { if (scene._tickHitstop(16)) scene._updateHitstopExempt(16); }
ok(scene.physics.world.paused, "ระหว่าง hitstop physics ของทั้งเกมยังหยุด");
ok(A.x > x0 + 20 && B.x === bx0, `ตัวที่ย่องเดินได้ระหว่างภาพหยุด (+${Math.round(A.x - x0)}px) · อีกตัวนิ่ง`);
scene._hitstopMs = 0; scene._tickHitstop(0); scene.physics.world.resume();

// เลื่อนเฟรมเองระหว่างหยุด (จำลอง AnimationState ของ Phaser: index นับจาก 1)
{
  const mk = (repeat) => {
    const frames = [0, 1, 2, 3].map((i) => ({ i, textureFrame: `f${i}` }));
    return { currentAnim: { frames, repeat, frameRate: 10 }, msPerFrame: 100, currentFrame: { index: 1 },
      setCurrentFrame(f) { this.currentFrame = { index: frames.indexOf(f) + 1 }; } };
  };
  const saved = A.anims; const vx = A.body.velocity.x;
  A.body.setVelocityX(0);
  A.anims = mk(-1); A._frozenAnimAcc = 0;
  A.stepWhileFrozen(250);
  ok(A.anims.currentFrame.index === 3, "hitstop: ท่าวนเลื่อนเฟรมตามเวลา (250ms @100ms/เฟรม = +2)");
  A.stepWhileFrozen(200);
  ok(A.anims.currentFrame.index === 1, "hitstop: ท่าวนครบแล้ววนกลับเฟรมแรก");
  A.anims = mk(0); A._frozenAnimAcc = 0;
  A.stepWhileFrozen(1000);
  ok(A.anims.currentFrame.index === 4, "hitstop: ท่าเล่นครั้งเดียวค้างเฟรมสุดท้าย");
  A.anims = saved; A.body.setVelocityX(vx);
}

// ── ไททันบ้า / บ่วงบาศ ──
const { CrazyTitanSystem } = await import(G + "/systems/CrazyTitanSystem.js");
ok(typeof CrazyTitanSystem === "function", "CrazyTitanSystem โหลดได้ (เช็ค canBeGrabbed ก่อนลาก)");

// ── หมดเวลา ──
A.body.setVelocityX(0);
run(A, S.durationMs);
ok(!A.isSneaking() && A.alpha === 1, `ครบ ${S.durationMs / 1000} วิ -> เลิกย่อง ตัวทึบคืน`);
ok(A.lastAnim === "dearv2/idle", "กลับท่ายืนปกติทันที");
A.applyHit({ damage: 5, knockbackX: 200, knockbackY: -100, hitstun: 200 });
ok(A.isStunned(), "หลังหมดโหมด โดนตีสะดุดตามปกติ");
A.stateMachine.setState("idle", true);
scene.hp.set(A, 200); scene._applyDamage(A, 10, false);
ok(scene.hp.get(A) === 190, "ดาเมจกลับมาเต็ม");
A.handleMovement({ ...idle, attackPressed: true }, 16);
ok(A.stateMachine.is("attack"), "ปุ่มตีกลับเป็นหมัดปกติ");

// ── ตัวอื่นไม่ได้รับผล ──
ok(!B.isSneaking() && B.damageTakenMul() === 1 && B.canBeGrabbed(), "ตัวละครอื่นไม่มีโหมดย่อง");
ok(Player.prototype.startSneak && !B.constructor.SKILLS?.[3]?.onStart, "KunJae ไม่ได้สกิลย่องไปด้วย");

// ── v33 สกิล 1 แบบรัว มีคูลดาวน์ (เดิมกดซ้ำได้ทันที) ──
{
  const { FINISHER } = await import(G + "/config/combat.config.js");
  // v34 Dear มีสกิล 1 ลูกโป่งแล้ว -> ทดสอบสกิลรัวมาตรฐานกับ March V.2
  const { ROSTER } = await import(G + "/entities/roster.js");
  const D = new ROSTER.marchv2(scene, 0, 0, 0); D.combat = combat;
  D.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(D.stateMachine.is("finisher") && D.skillCooldownLeft(1) === FINISHER.cooldownMs, `สกิล 1 รัว: เริ่มคูลดาวน์ ${FINISHER.cooldownMs / 1000} วิ`);
  run(D, 1200);
  D.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(!D.stateMachine.is("finisher"), "ท่าจบแล้วกดซ้ำทันทีไม่ได้ (ติดคูลดาวน์)");
  run(D, FINISHER.cooldownMs);
  D.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(D.stateMachine.is("finisher"), "ครบคูลดาวน์ กดได้อีก");
}
