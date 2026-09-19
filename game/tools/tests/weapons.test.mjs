// ทดสอบระบบสลับอาวุธของ KunJae + แส้ + ลูกซองคู่ แบบไม่เปิดเบราว์เซอร์
// รัน: node tools/tests/weapons.test.mjs   (จากโฟลเดอร์ game)
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { KunJae } = await import(G + "/entities/KunJae.js");
const { Oat } = await import(G + "/entities/Oat.js");
const { CombatSystem } = await import(G + "/systems/CombatSystem.js");
const { BASIC_COMBO, FINISHER, CHARACTER_COMBAT, HITSTOP, resolveAttack } = await import(G + "/config/combat.config.js");
const { SHOTGUN_SKILL1, WEAPON_LIST, WEAPON_SWITCH_COOLDOWN_MS, WHIP_SKILL1, WHIP_SKILL2 } = await import(G + "/config/weapons.config.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");
const { registerCharacterAnimations } = await import(G + "/entities/characterAnims.js");

const scene = makeScene();
scene._hitstopMs = 0;
scene.hitstop = MainGameScene.prototype.hitstop;
scene._tickHitstop = MainGameScene.prototype._tickHitstop;
scene.showFloatLabel = (p, t) => scene.log.push("label:" + t);
scene.gunFx = {
  muzzleBlast: (p, m, sides, opts) => scene.log.push("gun.blast:" + sides.join("+") + (opts?.small ? ":small" : "")),
  sonicBoom: (x, y, dir) => scene.log.push("fx.sonic:" + dir),
  lassoSnap: () => scene.log.push("fx.lasso"),
};
scene.audio.playSample = (k) => scene.log.push("sample:" + k);
scene.hitstopLog = [];
{ const h = scene.hitstop; scene.hitstop = function (ms) { scene.hitstopLog.push(ms); return h.call(this, ms); }; }
const hits = [];
const combat = new CombatSystem(scene, (v, a, dmg, blocked) => hits.push({ v, dmg, blocked }));
const K = new KunJae(scene, 0, 0); K.combat = combat; K.facing = 1;
const L = new Oat(scene, -150, 0, 1); L.combat = combat;
const R = new Oat(scene, 150, 0, 1); R.combat = combat;
// ชีวิต/ดาเมจแบบย่อของ scene (บ่วงบาศเรียกผ่าน scene)
scene.players = [K, L, R];
scene.playerAlive = new Map(scene.players.map((p) => [p, true]));
const hpLog = [];
scene._applyDamage = (v, dmg, blocked) => hpLog.push({ v, dmg, blocked });
const idle = { left: false, right: false, jumpPressed: false, attackPressed: false, summonPressed: false, tauntPressed: false, blockHeld: false, skillPressed: 0, transformPressed: false };
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const run = (p, ms, input = idle) => { for (let t = 0; t < ms; t += 16) p.handleMovement(input, 16); };
const tick = (ms) => { for (let t = 0; t < ms; t += 16) { K.handleMovement(idle, 16); combat.update(16, [K, L, R], () => true); while (scene._tickHitstop(16)); } };
const press8 = () => K.handleMovement({ ...idle, transformPressed: true }, 16);
// stub ไม่มีแรงเสียดทาน — ท่าพุ่งตอนตีทิ้งความเร็วค้างไว้ ต้องหยุดเองก่อนเช็คท่ายืน
const settle = () => { K.body.velocity.x = 0; K.stateMachine.setState("idle", true); };

// ── เริ่มต้น ──
ok(K.hasWeapons() && !K.hasTransform() && !L.hasWeapons(), "KunJae มีอาวุธ / OAT ไม่มี");
ok(K.weapon.key === "whip" && K.characterKey === "kunjae" && K.lastAnim === "kunjae/idle", "เริ่มที่แส้ (ท่ายืนถือแส้ ชุด kunjae/)");
ok(K.isSkillEnabled(1) && K.isSkillEnabled(2) && !K.isSkillEnabled(3), "แส้: S1 (sonic) + S2 (บ่วงบาศ) ใช้ได้ · S3 เทา");
ok(!K.trySkill(3) && !K.isAttacking(), "แส้: กด S3 ไม่ติด");
ok([1, 2, 3].every((n) => L.isSkillEnabled(n) === (n === 1)), "ตัวที่ไม่มีอาวุธ: สกิล 1 (รัว) ใช้ได้เหมือนเดิม");

// ── ตีพื้นฐาน = แส้ ──
K.handleMovement({ ...idle, attackPressed: true }, 16);
ok(K.stateMachine.is("attack") && K.lastAnim === "kunjae/attack_1", "Space = ฟาดแส้ (attack_1)");
const w = resolveAttack(BASIC_COMBO[0], "kunjae");
ok(w.reach === Math.round(62 * 3.2) && w.startup === Math.round(BASIC_COMBO[0].startup * 1.4), `แส้ระยะ ${w.reach} · เงื้อ ${w.startup}ms (ช้ากว่าหมัดกลาง)`);
run(K, 800);

// จังหวะภาพ: เฟรม "โดน" ของตีพื้นฐานทุกอาวุธต้องอยู่ช่วง hitbox
{
  const { SHARED, WEAPON_FRAMES, HIT_FRAME } = KunJae._TEST;
  for (const w of KunJae.WEAPONS.filter((x) => WEAPON_FRAMES[x.key])) {
    const created = {};
    const sc = { anims: { exists: (k) => !!created[k], create: (d) => (created[d.key] = d) } };
    registerCharacterAnimations(sc, { prefix: "t/", atlasKey: "kunjae", frames: { ...SHARED, ...WEAPON_FRAMES[w.key] }, timing: { attackTimeMul: CHARACTER_COMBAT[w.combatKey].timeMul } });
    [0, 1, 2].forEach((i) => {
      const a = created[`t/attack_${i + 1}`];
      const sp = resolveAttack(BASIC_COMBO[i], w.combatKey);
      const per = 1000 / a.frameRate;
      const idx = a.frames.findIndex((f) => f.frame === HIT_FRAME[w.key][i]);
      const t0 = idx * per, t1 = t0 + per;
      ok(idx >= 0 && t0 < sp.startup + sp.active && t1 > sp.startup, `${w.key} attack_${i + 1}: เฟรมโดน ${Math.round(t0)}-${Math.round(t1)}ms ทับช่วงโดน ${sp.startup}-${sp.startup + sp.active}ms`);
    });
  }
}

// ── สลับอาวุธ ──
scene.log.length = 0;
press8();
ok(K.weapon.key === "pistol" && scene.log.includes("label:PISTOLS"), "numpad 8 -> ปืนสั้นคู่ (+ป้ายชื่อ)");

ok(K.isSkillEnabled(1) && !K.isSkillEnabled(2) && !K.isSkillEnabled(3), "ปืนสั้นคู่: S1 ใช้ได้ · S2/S3 เทา");
press8();
ok(K.weapon.key === "pistol", `กดรัวภายใน ${WEAPON_SWITCH_COOLDOWN_MS}ms ไม่สลับ`);
ok(K.lastAnim === "kunjae/pistol/run" && K.characterKey === "kunjae_pistol", "ถือปืนสั้น: ท่าที่เล่นอยู่สลับเป็นชุดปืนทันที + ค่าต่อสู้ของปืน");
run(K, 300); settle();
ok(K.lastAnim === "kunjae/pistol/idle", "ถือปืนสั้น: ท่ายืนถือปืน");
scene.log.length = 0;
K.handleMovement({ ...idle, attackPressed: true }, 16);
ok(/^kunjae\/pistol\/attack_[123]$/.test(K.lastAnim), `ถือปืนสั้น: Space = ยิงปืน (${K.lastAnim})`);
{
  const sp = resolveAttack(BASIC_COMBO[0], "kunjae_pistol");
  ok(sp.reach === Math.round(62 * 3.2) && sp.startup === BASIC_COMBO[0].startup, `ยิงปืนระยะ ${sp.reach} ออกไวเท่าหมัดกลาง (${sp.startup}ms)`);
}
run(K, 600); settle();
ok(!scene.log.some((l) => l.startsWith("gun.blast")), "ปืนสั้นไม่วาดไฟเพิ่ม (มีในภาพแล้ว)");
run(K, WEAPON_SWITCH_COOLDOWN_MS + 20);
press8();
ok(K.weapon.key === "shotgun" && K.lastAnim === "kunjae/shotgun/idle" && K.characterKey === "kunjae_shotgun", `-> ลูกซองคู่ (ท่ายืนถือลูกซอง)`);
run(K, 300);
{
  combat.clearAll(); hits.length = 0; scene.log.length = 0;
  K.facing = 1; R.x = 140; L.x = -400;
  [L, R].forEach((p) => { p.stateMachine.setState("idle", true); p.body.velocity.x = 0; });
  K.handleMovement({ ...idle, attackPressed: true }, 16);
  ok(/^kunjae\/shotgun\/attack_[123]$/.test(K.lastAnim), `ถือลูกซอง: Space = ยิงลูกซองไปข้างหน้า (${K.lastAnim})`);
  const sp = resolveAttack(BASIC_COMBO[K.comboStep], "kunjae_shotgun");
  tick(700); settle();
  ok(hits.length === 1 && hits[0].v === R && hits[0].dmg === sp.damage, `ยิงโดนข้างหน้า ดาเมจ ${hits[0]?.dmg} (ระยะ ${sp.reach})`);
  ok(scene.log.includes("gun.blast:front:small"), "ไฟปากกระบอกเล็ก ออกด้านหน้า");
  ok(sp.knockbackX > BASIC_COMBO[0].knockbackX, `กระเด็นไกลกว่าหมัดกลาง (${sp.knockbackX})`);
  hits.length = 0; R.x = 140 + sp.reach + 60; R.stateMachine.setState("idle", true);
  K.handleMovement({ ...idle, attackPressed: true }, 16); tick(700); settle();
  ok(hits.length === 0, "ลูกซองตีพื้นฐาน ไกลเกินระยะไม่โดน");
}
ok(K.isSkillEnabled(1) && !K.isSkillEnabled(2) && !K.isSkillEnabled(3), "ลูกซองคู่: S1 ใช้ได้ · S2/S3 เทา");
run(K, WEAPON_SWITCH_COOLDOWN_MS + 20);
press8();
const disabled = WEAPON_LIST.filter((x) => x.enabled === false).map((x) => x.key);
ok(K.weapon.key === "whip" && disabled.includes("rifle") && disabled.includes("grenade"), "ข้ามไรเฟิล/ระเบิด (ยังไม่ทำ) วนกลับแส้");
settle();
ok(K.lastAnim === "kunjae/idle" && K.characterKey === "kunjae", "กลับมาถือแส้ ท่ายืน/ค่าต่อสู้กลับชุดแส้");
run(K, WEAPON_SWITCH_COOLDOWN_MS + 20);
K.handleMovement({ ...idle, attackPressed: true }, 16);
const before = K.weaponIndex;
K.handleMovement({ ...idle, transformPressed: true }, 16);
ok(K.weaponIndex === before, "ระหว่างฟาดแส้ สลับอาวุธไม่ได้");
run(K, 800);
// เปิดไรเฟิลชั่วคราว -> อยู่ในวงสลับ สกิลเทาหมด
{
  const rifle = KunJae.WEAPONS.find((x) => x.key === "rifle");
  rifle.enabled = true;
  press8(); run(K, 300); press8(); run(K, 300); press8();
  ok(K.weapon.key === "rifle" && ![1, 2, 3].some((n) => K.isSkillEnabled(n)), "เปิด enabled ไรเฟิล -> สลับถึงได้ สกิลเทาหมด");
  rifle.enabled = false;
  run(K, 300); press8(); run(K, 300);
  ok(K.weapon.key === "whip", "ไรเฟิล -> ข้ามระเบิด -> แส้");
}

// ── ปืนสั้นคู่ S1 = รัวปืนเดิม ──
press8(); run(K, 300);
K.handleMovement({ ...idle, skillPressed: 1 }, 16);
ok(K.stateMachine.is("finisher") && K.lastAnim === "kunjae/pistol/finisher", "ปืนสั้นคู่ S1 -> รัวปืน (state finisher)");
ok(resolveAttack(FINISHER, "kunjae").reach === Math.round(FINISHER.reach * 3.2), "รัวปืนระยะเท่าเดิม");
run(K, 1500);

// ── ลูกซองคู่ S1 = ยิงซ้าย-ขวา AOE ──
press8(); run(K, 300);
const S1 = KunJae.WEAPONS.find((x) => x.key === "shotgun").skills[1];
combat.clearAll(); // hitbox แส้/รัวปืนข้างบนไม่ได้ผ่าน combat.update — ล้างทิ้ง
hits.length = 0; scene.log.length = 0;
K.facing = 1; L.x = -150; R.x = 150;
[L, R].forEach((p) => p.stateMachine.setState("idle", true));
K.handleMovement({ ...idle, skillPressed: 1 }, 16);
ok(K.isUsingSkill() && K.lastAnim === "kunjae/shotgun/skill1", "ลูกซองคู่ S1 -> ท่ากางแขนยิง");
ok(K.skillCooldownLeft(1) === SHOTGUN_SKILL1.cooldownMs, `คูลดาวน์ ${SHOTGUN_SKILL1.cooldownMs / 1000} วิ`);
tick(S1.hits[0].atMs - 40);
ok(hits.length === 0, "ช่วงชักปืน ยังไม่โดน");
tick(80);
const dmg = resolveAttack(SHOTGUN_SKILL1.blast, "kunjae_shotgun").damage;
ok(dmg === 16, `ลูกซอง S1 ดาเมจจริง ${dmg}`);
ok(hits.length === 2 && hits.every((h) => h.dmg === dmg), `ยิงโดนทั้งซ้ายและขวา ดาเมจ ${hits.map((h) => h.dmg)}`);
ok(L.body.velocity.x < 0 && R.body.velocity.x > 0, "กระเด็นออกจากตัวทั้งสองฝั่ง");
ok(scene.log.includes("gun.blast:left+right"), "ไฟปากกระบอกซ้าย+ขวา (GunEffects)");
tick(S1.durationMs);
ok(!K.isUsingSkill(), "จบท่า คุมตัวได้");
ok(!K.isSkillEnabled(1) || K.skillCooldownLeft(1) > 0, "ยังติดคูลดาวน์");
ok(!K.trySkill(1), "ติดคูลดาวน์ กดซ้ำไม่ได้");
// ไกลเกิน AOE ไม่โดน
{
  run(K, SHOTGUN_SKILL1.cooldownMs);
  hits.length = 0; L.x = -(SHOTGUN_SKILL1.blast.aoe.halfWidth + 60); R.x = 400;
  [L, R].forEach((p) => { p.stateMachine.setState("idle", true); p.body.velocity.x = 0; });
  K.handleMovement({ ...idle, skillPressed: 1 }, 16);
  tick(S1.durationMs + 50);
  ok(hits.length === 0, "อยู่นอกระยะ AOE ไม่โดน");
}
// คูลดาวน์แยกตามอาวุธ
{
  K.handleMovement({ ...idle, skillPressed: 1 }, 16); // ใช้ลูกซองอีกรอบ
  run(K, S1.durationMs + 50);
  press8(); run(K, 300); press8(); run(K, 300); // -> แส้ -> ปืนสั้น
  ok(K.weapon.key === "pistol" && K.skillCooldownLeft(1) === 0, "สลับไปปืนสั้น: คูลดาวน์ลูกซองไม่ติดมา");
  press8();
  ok(K.weapon.key === "shotgun" && K.skillCooldownLeft(1) > 0, "กลับมาลูกซอง: คูลดาวน์ยังนับต่อ");
}

// ══════════ v29 แส้ S1 / S2 ══════════
const toWhip = () => { for (let i = 0; i < 6 && K.weapon.key !== "whip"; i++) { run(K, 300); press8(); } settle(); };
const reset = () => {
  combat.clearAll(); hits.length = 0; hpLog.length = 0; scene.log.length = 0; scene.hitstopLog.length = 0;
  for (const p of [K, L, R]) { p.stateMachine.setState("idle", true); p.body.velocity.x = 0; p.body.velocity.y = 0; p._skillCd = {}; }
  K.x = 0; K.facing = 1; K.flipX = false;
};
const tickAll = (ms) => { for (let t = 0; t < ms; t += 16) { K.handleMovement(idle, 16); L.handleMovement(idle, 16); R.handleMovement(idle, 16); combat.update(16, [K, L, R], () => true); while (scene._tickHitstop(16)); } };
toWhip();
ok(K.weapon.key === "whip", "กลับมาถือแส้");

// ── S1 sonic boom ──
{
  reset();
  const S1 = KunJae.WEAPONS.find((w) => w.key === "whip").skills[1];
  const sp = resolveAttack(WHIP_SKILL1.hit, "kunjae");
  R.x = 200; L.x = -200;
  K.handleMovement({ ...idle, skillPressed: 1 }, 16);
  ok(K.isUsingSkill() && K.lastAnim === "kunjae/skill1", "แส้ S1 -> ท่าฟาด sonic");
  ok(scene.log.includes("sample:kj_whip_whoosh") && !scene.log.some((l) => l.startsWith("sfx:swing")), "เสียงเหวี่ยงจากคลิป (ไม่ใช่เสียงสังเคราะห์)");
  tickAll(S1.hits[0].atMs - 30);
  ok(hits.length === 0, `ง้างแส้ ${S1.hits[0].atMs}ms ยังไม่โดน`);
  tickAll(60);
  ok(hits.length === 1 && hits[0].v === R && hits[0].dmg === sp.damage, `ฟาดโดนข้างหน้า ระยะ ${sp.reach} ดาเมจ ${hits[0]?.dmg}`);
  ok(scene.log.includes("fx.sonic:1") && scene.log.includes("sample:kj_sonic_boom"), "sonic boom (ภาพ + เสียงจากคลิป)");
  ok(scene.hitstopLog.includes(HITSTOP.sonic) && HITSTOP.sonic > HITSTOP.heavy, `hitstop รุนแรง ${HITSTOP.sonic}ms (หนักกว่า heavy ${HITSTOP.heavy})`);
  ok(R.body.velocity.x > 400, `กระเด็นไกล (${R.body.velocity.x})`);
  tickAll(S1.durationMs);
  ok(!K.isUsingSkill() && K.skillCooldownLeft(1) > 0, `จบท่า · คูลดาวน์ ${WHIP_SKILL1.cooldownMs / 1000} วิ`);
  // ไกลเกินไม่โดน / หันซ้าย บูมกลับด้าน
  reset(); R.x = 400; L.x = -sp.reach; // R ไกลเกิน · L ขอบระยะ
  K.facing = -1; K.flipX = true;
  K.handleMovement({ ...idle, skillPressed: 1 }, 16);
  tickAll(S1.durationMs + 50);
  ok(hits.length === 1 && hits[0].v === L && scene.log.includes("fx.sonic:-1"), "หันซ้าย: โดนคนซ้าย (คนขวาไกลเกินไม่โดน) บูมออกทางซ้าย");
}

// ── S2 บ่วงบาศ ──
{
  const S2 = KunJae.WEAPONS.find((w) => w.key === "whip").skills[2];
  const M = KunJae._TEST.LASSO_MARKS;
  const ms = (i) => Math.round((i / WHIP_SKILL2.fps) * 1000);
  const s = Math.abs(K.scaleX);
  const range = Math.round(640 * s);
  // 1) คล้องโดน -> ดึง -> เตะ
  reset(); R.x = 240; L.x = -300;
  K.handleMovement({ ...idle, skillPressed: 2 }, 16);
  ok(K.isUsingSkill() && K.lastAnim === "kunjae/skill2", `แส้ S2 -> ท่าบ่วงบาศ (ระยะคล้อง ~${range}px)`);
  tickAll(ms(M.THROW) + 20);
  ok(scene.log.includes("sample:kj_lasso_throw"), "เสียงเหวี่ยงเชือกจากคลิป");
  tickAll(ms(M.CATCH) - ms(M.THROW));
  ok(R.isGrabbed() && !L.isGrabbed(), "คล้องคนข้างหน้าติด (คนข้างหลังไม่โดน)");
  ok(scene.log.includes("sample:kj_lasso_catch") && scene.log.includes("fx.lasso") && hpLog.some((h) => h.v === R), "บ่วงรัด: เสียง + ภาพ + ดาเมจเล็กน้อย");
  const x0 = R.x;
  tickAll(ms(M.COIL + 2) - ms(M.CATCH));
  ok(R.isGrabbed() && R.x < x0 - 60, `ดึงเข้ามา ${Math.round(x0)} -> ${Math.round(R.x)}`);
  const kickAt = Math.round(220 * s + 12);
  ok(Math.abs(R.x - (K.x + kickAt)) < 15, `เป้าอยู่หน้าเท้า (~${kickAt}px)`);
  hpLog.length = 0; scene.hitstopLog.length = 0;
  tickAll(ms(M.KICK) - ms(M.COIL + 2) + 20);
  const kick = resolveAttack(WHIP_SKILL2.kick, "kunjae");
  ok(!R.isGrabbed() && R.stateMachine.is("hitstun") && R.body.velocity.x > 300, `เตะหลุดกระเด็น (${R.body.velocity.x})`);
  ok(hpLog.length === 1 && hpLog[0].v === R && hpLog[0].dmg === kick.damage, `ดาเมจเตะ ${hpLog[0]?.dmg}`);
  ok(scene.log.includes("sample:kj_kick_impact") && scene.hitstopLog.includes(WHIP_SKILL2.kickHitstop), "เสียงเตะจากคลิป + hitstop");
  tickAll(S2.durationMs);
  ok(!K.isUsingSkill() && K.skillCooldownLeft(2) > 0 && K.skillCooldownLeft(1) >= 0, "จบท่า · S2 ติดคูลดาวน์");

  // 2) พลาด -> จบเร็ว ไม่เตะ
  reset(); R.x = range + 120; L.x = -300;
  K.handleMovement({ ...idle, skillPressed: 2 }, 16);
  tickAll(ms(M.COIL) + 40);
  ok(!K.isUsingSkill() && !R.isGrabbed() && !scene.log.includes("sample:kj_kick_impact"), `อยู่ไกลเกิน -> ม้วนเชือกกลับ จบที่ ${ms(M.COIL)}ms ไม่เตะ`);

  // 3) เป้ากันอยู่ -> ไม่ติดบ่วง
  reset(); R.x = 200;
  R.guard = 100;
  K.handleMovement({ ...idle, skillPressed: 2 }, 16);
  for (let t = 0; t < ms(M.CATCH) + 40; t += 16) { K.handleMovement(idle, 16); R.handleMovement({ ...idle, blockHeld: true }, 16); }
  ok(!R.isGrabbed() && hpLog.some((h) => h.v === R && h.blocked), "เป้ากันอยู่ -> ไม่ติดบ่วง (เสียมาตรการ์ด)");
  tickAll(S2.durationMs);

  // 4) KunJae โดนตีระหว่างดึง -> เป้าหลุด
  reset(); R.x = 240;
  K.handleMovement({ ...idle, skillPressed: 2 }, 16);
  tickAll(ms(M.CATCH) + 60);
  ok(R.isGrabbed(), "คล้องติดแล้ว");
  K.applyHit({ damage: 5, knockbackX: 100, knockbackY: 0, hitstun: 200 }, L);
  ok(!K.isUsingSkill() && !R.isGrabbed(), "KunJae โดนตีกลางคัน -> เป้าหลุดทันที");
  tickAll(400);
}
