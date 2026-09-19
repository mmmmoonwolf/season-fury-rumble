// ทดสอบ hitstop + guard break แบบไม่ต้องเปิดเบราว์เซอร์ (Phaser แบบ stub)
// รัน: node tools/tests/guard_hitstop.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { Player } = await import(G + "/entities/Player.js");
const { CombatSystem } = await import(G + "/systems/CombatSystem.js");
const { GUARD, HITSTOP, BASIC_COMBO, FINISHER } = await import(G + "/config/combat.config.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js").catch(e => ({ err: e }));

const scene = makeScene();
// ยืม hitstop/_tickHitstop ของ scene จริงมาแปะ
const proto = (await import(G + "/scenes/MainGameScene.js")).MainGameScene.prototype;
scene._hitstopMs = 0;
scene.hitstop = proto.hitstop; scene._tickHitstop = proto._tickHitstop;
scene.showGuardBreak = (p) => scene.log.push('GUARD BREAK label');
let hpLog = [];
const combat = new CombatSystem(scene, (v, a, dmg, blocked) => hpLog.push({ dmg, blocked }));
const A = new Player(scene, 0, 0, "x", 0, "oat/"); A.combat = combat; A.facing = 1;
const B = new Player(scene, 30, 0, "x", 1, "kunjae/"); B.combat = combat;
const idleIn = { left:false,right:false,jumpPressed:false,attackPressed:false,summonPressed:false,tauntPressed:false,blockHeld:false,skillPressed:0 };
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

// 1) หมัดเข้าปกติ -> hitstop 50
combat.spawnHitbox({ attacker: A, duration: 50, spec: BASIC_COMBO[0] });
combat.update(16, [A, B], () => true);
ok(B.stateMachine.is("hitstun"), "หมัดเข้า -> เหยื่อ hitstun");
ok(scene._hitstopMs === HITSTOP.normal && scene.physics.world.paused && scene.anims.paused && scene.tweens.paused && scene.time.paused, `hitstop เริ่ม ${scene._hitstopMs}ms + หยุด physics/anims/tweens/time`);
ok(scene._tickHitstop(16) === true, "เฟรมถัดไปยังหยุด");
scene._tickHitstop(16); scene._tickHitstop(16);
ok(scene._tickHitstop(16) === false && !scene.physics.world.paused && !scene.anims.paused && !scene.time.paused, "ครบ ~50ms แล้วปล่อยภาพ");
ok(B.body.velocity.x > 0, "knockback ยังอยู่หลังปล่อยภาพ");

// 2) hitstop ซ้อน ใช้ค่ายาวกว่า
scene.hitstop(50); scene.hitstop(150); scene.hitstop(30);
ok(scene._hitstopMs === 150, "hitstop ซ้อน = เลือกค่ามากสุด");
while (scene._tickHitstop(16)); 

// 3) กันแล้วมาตรลด ต่อหมัด 20 -> หมัดที่ 5 แตก
B.stateMachine.setState("idle", true); B.guard = GUARD.max;
B.handleMovement({ ...idleIn, blockHeld: true }, 16);
ok(B.isBlocking(), "B กันอยู่");
hpLog = [];
let brokeAt = -1;
for (let i = 1; i <= 6; i++) {
  combat.spawnHitbox({ attacker: A, duration: 10, spec: BASIC_COMBO[0] });
  combat.update(1, [A, B], () => true);
  while (scene._tickHitstop(16));
  if (B.isGuardBroken() && brokeAt < 0) brokeAt = i;
  if (!B.isGuardBroken()) B.handleMovement({ ...idleIn, blockHeld: true }, 1);
}
ok(brokeAt === 5, `การ์ดแตกที่หมัดที่ ${brokeAt} (คาด 5)`);
ok(hpLog.slice(0,5).every(h => h.blocked) , "5 หมัดแรกนับเป็นหมัดที่กัน (รวมหมัดที่ทำให้แตก)");
ok(hpLog[5] && hpLog[5].blocked === false, "หมัดที่ 6 (ตอนการ์ดแตก) เข้าเต็ม");
ok(scene.log.includes('GUARD BREAK label'), "มีป้าย GUARD BREAK");
ok(B.isStunned(), "หมัดระหว่างการ์ดแตก -> ยังคุมตัวไม่ได้");
ok(B._stunTimer >= GUARD.breakStunMs - 5, `โดนตีตอนแตกไม่ทำให้หลุดเร็วขึ้น (stun ${Math.round(B._stunTimer)})`);

// 4) หายแข็ง -> มาตร 50%, กดกันไม่ได้ระหว่างแข็ง
B.handleMovement({ ...idleIn, blockHeld: true }, 16);
ok(!B.isBlocking(), "กดกันระหว่างแข็งไม่ติด");
for (let t = 0; t < 1500; t += 16) B.handleMovement({ ...idleIn }, 16);
ok(!B.isStunned() && Math.round(B.guard) > GUARD.max * 0.5, `หายแข็งแล้ว มาตรเริ่ม 50% และฟื้นต่อ (${Math.round(B.guard)})`);
ok(B.alpha === 1, "กระพริบหยุด alpha กลับ 1");

// 5) กันค้างเฉย ๆ แตกในกี่วิ
B.guard = GUARD.max; let t = 0;
while (!B.isGuardBroken() && t < 20000) { B.handleMovement({ ...idleIn, blockHeld: true }, 16); t += 16; }
ok(t > 7000 && t < 9500, `กันค้างเฉย ๆ แตกเองใน ${(t/1000).toFixed(1)} วิ`);
for (let k = 0; k < 200; k++) B.handleMovement({ ...idleIn }, 16);

// 6) ฟื้น: ปล่อยปุ่มแล้วรอ regenDelay
B.stateMachine.setState("idle", true); B.guard = 40; B._guardRegenDelay = GUARD.regenDelayMs;
for (let k = 0; k < 40; k++) B.handleMovement({ ...idleIn }, 16); // 640ms
ok(Math.round(B.guard) === 40, "ยังไม่ฟื้นก่อนครบ regenDelay");
for (let k = 0; k < 190; k++) B.handleMovement({ ...idleIn }, 16);
ok(B.guard === GUARD.max, "ฟื้นเต็มในไม่กี่วิ");

// 7) ไม้ตายฮิตย่อย hitstop สั้น / ฮิตปิดยาว
scene._hitstopMs = 0; B.stateMachine.setState("idle", true);
combat.spawnHitbox({ attacker: A, duration: 10, spec: FINISHER });
combat.update(1, [A, B], () => true);
ok(scene._hitstopMs === HITSTOP.multiHit, `ฮิตย่อยไม้ตาย hitstop ${scene._hitstopMs}`);
while (scene._tickHitstop(16));
combat.spawnHitbox({ attacker: A, duration: 10, spec: FINISHER, isFinalHit: true });
combat.update(1, [A, B], () => true);
ok(scene._hitstopMs === HITSTOP.heavy, `ฮิตปิดไม้ตาย hitstop ${scene._hitstopMs}`);
while (scene._tickHitstop(16));



