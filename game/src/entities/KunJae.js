import { Player } from "./Player.js";
import { registerCharacterAnimations } from "./characterAnims.js";
import { CHARACTER_COMBAT, HITSTOP, resolveAttack } from "../config/combat.config.js";
import { WEAPON_LIST, SHOTGUN_SKILL1, SHOTGUN_BASIC_FX, WHIP_SKILL1, WHIP_SKILL2 } from "../config/weapons.config.js";
import { CombatSystem } from "../systems/CombatSystem.js";

/**
 * KunJae — คาวเกิร์ล แส้ + ปืน
 * v27: ปุ่ม numpad 8 สลับอาวุธ (แส้ / ปืนสั้นคู่ / ลูกซองคู่ / ไรเฟิล* / ระเบิด*) — *ยังไม่ทำ
 * v28: อาวุธที่ถือเปลี่ยน "ท่ายืน (ถืออาวุธนั้น) + ตีพื้นฐาน + สกิล 1-3" ทั้งชุด
 *      แต่ละอาวุธลงทะเบียน animation คนละ prefix (kunjae/ · kunjae/pistol/ · kunjae/shotgun/)
 *      ท่าวิ่ง/กระโดด/ลงพื้น/โดนตี ใช้ชุดเดียวกันทุกอาวุธ (ยังไม่มีคลิปวิ่งถืออาวุธ)
 *
 * ที่มา: ตัดจากวิดีโอพื้นขาว 1280x720 @24fps
 *   คลิปเดิม 3 คลิป (idle / วิ่ง+กระโดด / ปืนลูกโม่) -> tools/build_kunjae.py
 *   คลิปแส้ AC8D3681 + คลิปปืนคู่ 30FEA331 -> tools/build_kunjae_weapons.py (ต่อเข้า atlas เดิม)
 * ลุค: ผมแดงยาว หมวกคาวบอยแดง เสื้อเชิ้ตขาวปักลาย ถุงมือหนังไม่มีปลายนิ้ว
 *      กางเกงยีนส์ + chaps หนังสีน้ำตาลมีครุยห้อย เข็มขัดหัวเข็มขัดใหญ่ เชือกบาศห้อยสะโพก บูทหนัง
 */
export const KUNJAE_ATLAS = {
  key: "kunjae",
  texturePath: "assets/characters/kunjae_atlas.png",
  dataPath: "assets/characters/kunjae_atlas.json",
  // ผืนภาพ 1400x470 (v27 560->944 เผื่อแส้ · v29 ->1400 เผื่อเชือกบ่วงบาศ) ระดับเท้า y=431 ตัวยืนสูง 393
  standingHeightInFrame: 393,
  bottomMargin: 39, // 470 - 431
  /**
   * ปากกระบอกลูกซอง — px ผืนภาพ นับจากกลางเท้า · มาจาก meta.muzzle ของ atlas (frames.test ตรวจ)
   * left/right = ท่ากางแขน (sg_11, สกิล 1) · front = ท่าเล็งไปข้างหน้า (sgshot_4, ตีพื้นฐาน)
   */
  muzzle: { left: [-227, -266], right: [216, -262], front: [172, -305] },
};

/** v29 ท่าสกิลแส้ (sonic / บ่วงบาศ) อยู่ atlas แยก — ผืนภาพขนาดเดียวกัน */
export const KUNJAE_WHIPSKILL_ATLAS = {
  key: "kunjae_whipskill",
  texturePath: "assets/characters/kunjae_whipskill_atlas.png",
  dataPath: "assets/characters/kunjae_whipskill_atlas.json",
  /** ปลายเชือกด้านหน้าต่อเฟรม lasso_1..29 (px ผืนภาพจากกลางตัว) · ตรงกับ meta.lassoTip (frames.test ตรวจ) */
  lassoTip: [240, 91, 340, 231, 565, 546, 532, 482, 523, 640, 573, 505, 406, 392, 344, 260, 111, 114, 125, 110, 104, 84, 61, 179, 220, 222, 226, 226, 110],
  /** ปลายเท้าตอนเตะเหยียดสุด (lasso_25) · ตรงกับ meta.kickX */
  kickX: 220,
};

const seq = (name, n) => Array.from({ length: n }, (_, i) => `${name}_${i + 1}.png`);
/** เล่นไป-กลับ (ไม่ซ้ำเฟรมหัว/ท้าย) — ท่ายืนจากคลิปที่ไม่ได้วนเป็นลูปเอง */
const pingPong = (arr) => [...arr, ...arr.slice(1, -1).reverse()];

/** ท่าที่ทุกอาวุธใช้ร่วมกัน */
const SHARED = {
  // วิ่ง 1 รอบก้าวเต็ม 8 เฟรม (ขาสลับซ้าย-ขวาจริง)
  run: seq("run", 8),
  jump: "jump.png",
  fall: "fall.png",
  land: "land.png",
  // ⚠️ ยังไม่มีท่าโดนตีในคลิป — ยืมท่าควันปืนไปก่อน
  hurt: "recover.png",
};

/**
 * ชุดท่าต่ออาวุธ — idle = ยืนถืออาวุธนั้น · attack1-3 = ตีพื้นฐาน
 * ⚠️ เฟรม "โดน" ของตีพื้นฐานต้องตกช่วง active ของหมัด (เวลาท่ากระจายเท่ากันทุกเฟรม ยืดตาม timeMul) — weapons.test ตรวจ
 */
const WEAPON_FRAMES = {
  whip: {
    // ยืนถือแส้ แส้ห้อยลากพื้นด้านหลัง (คลิปแส้ f259-f280)
    idle: pingPong(seq("whipidle", 8)),
    // ฟาดแส้ 3 แบบ — แส้ยืดสุด = whip1_3 / whip2_3 / whip3_2
    attack1: seq("whip1", 7),
    attack2: seq("whip2", 7),
    attack3: seq("whip3", 5),
    finisherLoop: seq("whip1", 7), // แส้ไม่มีสกิลรัว (ไม่ถูกเรียก) — ใส่ไว้ให้ลงทะเบียนครบ
    extra: {
      // v29 S1 sonic boom: ง้างแส้ไปด้านหลัง 4 เฟรม -> สะบัดไปหน้า (ยืมเฟรมฟาดแส้ whip1) -> ค้าง -> ดึงแส้กลับ
      skill1: {
        atlas: KUNJAE_WHIPSKILL_ATLAS.key,
        frames: [
          ...seq("sonic", 4),
          { frame: "whip1_3.png", atlas: KUNJAE_ATLAS.key },
          { frame: "whip1_4.png", atlas: KUNJAE_ATLAS.key },
          { frame: "whip1_4.png", atlas: KUNJAE_ATLAS.key },
          { frame: "whip1_4.png", atlas: KUNJAE_ATLAS.key },
          "sonic_5.png", "sonic_6.png", "sonic_7.png", "sonic_8.png",
        ],
        fps: WHIP_SKILL1.fps,
      },
      // v29 S2 บ่วงบาศ: หมุน 4 -> เขวี้ยง 5 -> ตึง 2 -> ดึง 5 -> ม้วนเชือก+ยกเข่า 7 -> เตะ 4 -> คืนท่า 2 (29 เฟรม)
      skill2: { atlas: KUNJAE_WHIPSKILL_ATLAS.key, frames: seq("lasso", 29), fps: WHIP_SKILL2.fps },
    },
  },
  pistol: {
    // ยืนเล็งปืนลูกโม่ (ท่าปืนเดิม)
    idle: ["aim.png"],
    // ยิงปืนเดิม: เล็ง -> ยิง (มีไฟในภาพแล้ว) -> กลับมาเล็ง · เฟรมยิง = ลำดับที่ 2
    attack1: ["aim.png", "shoot_1.png", "aim.png"],
    attack2: ["aim.png", "shoot_2.png", "aim.png"],
    attack3: ["aim.png", "shoot_3.png", "shoot_4.png", "aim.png"],
    // S1 รัวปืนพัดลม
    finisherLoop: seq("shoot", 4),
  },
  shotgun: {
    // ยืนถือลูกซองคู่ ยกปืนระดับอก (คลิปปืน f239-f242)
    idle: pingPong(seq("sgidle", 4)),
    // เล็งไปข้างหน้า -> ยิง (ไฟวาดด้วยโค้ดตอน hitbox เปิด) -> ค้าง -> ลดปืน · เฟรมยิง sgshot_4 = ลำดับที่ 3-4
    attack1: ["sgshot_2.png", "sgshot_3.png", "sgshot_4.png", "sgshot_4.png", "sgshot_3.png", "sgshot_2.png", "sgshot_1.png"],
    attack2: ["sgshot_2.png", "sgshot_3.png", "sgshot_4.png", "sgshot_4.png", "sgshot_3.png", "sgshot_2.png", "sgshot_1.png"],
    attack3: ["sgshot_2.png", "sgshot_3.png", "sgshot_4.png", "sgshot_4.png", "sgshot_3.png", "sgshot_2.png", "sgshot_1.png"],
    finisherLoop: seq("sgshot", 4), // ลูกซองไม่มีสกิลรัว (ไม่ถูกเรียก)
    extra: {
      // S1: จากท่าถือปืนชี้ฟ้า (sg_6) กางแขนซ้าย-ขวา -> ยิง (ค้าง) -> ปืนเด้งขึ้น
      skill1: {
        frames: [
          "sg_6.png", "sg_7.png", "sg_8.png", "sg_9.png", "sg_10.png", "sg_11.png",
          "sg_11.png", "sg_11.png", "sg_11.png", "sg_11.png",
          "sg_9.png", "sg_7.png", "sg_6.png", "sg_6.png", "sg_6.png",
        ],
        fps: SHOTGUN_SKILL1.fps,
      },
    },
  },
};
/** เฟรมที่หมัด "โดน" ของแต่ละอาวุธ (ใช้ตรวจจังหวะในชุดทดสอบ) */
const HIT_FRAME = {
  whip: ["whip1_3.png", "whip2_3.png", "whip3_2.png"],
  pistol: ["shoot_1.png", "shoot_2.png", "shoot_3.png"],
  shotgun: ["sgshot_4.png", "sgshot_4.png", "sgshot_4.png"],
};

// ────────── v29 แส้ S1: sonic boom ──────────
const WS1_STRIKE = 4; // ลำดับเฟรมสะบัด (whip1_3)
const ws1Ms = (i) => Math.round((i / WHIP_SKILL1.fps) * 1000);
const WHIP_SKILL1_DEF = {
  anim: "skill1",
  durationMs: ws1Ms(WEAPON_FRAMES.whip.extra.skill1.frames.length),
  cooldownMs: WHIP_SKILL1.cooldownMs,
  startSound: false,
  onStart: (p) => p.scene.audio?.playSample("kj_whip_whoosh"),
  hits: [{ atMs: ws1Ms(WS1_STRIKE), spec: WHIP_SKILL1.hit }],
  events: [{
    atMs: ws1Ms(WS1_STRIKE),
    fn: (p) => {
      const reach = resolveAttack(WHIP_SKILL1.hit, p.characterKey).reach;
      const x = p.x + p.facing * (p.body.width / 2 + reach * WHIP_SKILL1.boomAtReach);
      p.scene.gunFx?.sonicBoom(x, p.body.bottom - WHIP_SKILL1.boomHeight, p.facing);
      p.scene.audio?.playSample("kj_sonic_boom");
    },
  }],
};

// ────────── v29 แส้ S2: บ่วงบาศ ดึง เตะ ──────────
const L = {
  THROW: 4,   // lasso_5 เริ่มเขวี้ยง -> เสียงเหวี่ยงเชือก
  CATCH: 9,   // lasso_10 เชือกตึงสุด -> ตัดสินว่าคล้องโดนไหม
  PULL: 11,   // lasso_12..16 ดึงเข้ามา
  COIL: 16,   // lasso_17.. ม้วนเชือก ยกเข่า (เป้าอยู่หน้าเท้า)
  KICK: 23,   // lasso_24 เตะโดน (เสียงกระแทกในคลิปอยู่เฟรมนี้)
};
const ws2Ms = (i) => Math.round((i / WHIP_SKILL2.fps) * 1000);
const frameAt = (sk) => Math.floor(sk.t / (1000 / WHIP_SKILL2.fps));

/** เป้าที่คล้องได้: อยู่ด้านหน้า ในระยะเชือก ยืนระดับเดียวกัน · เลือกคนใกล้สุด */
function lassoTarget(p) {
  const s = Math.abs(p.scaleX);
  const range = KUNJAE_WHIPSKILL_ATLAS.lassoTip[L.CATCH] * s;
  let best = null;
  for (const v of p.scene.players ?? []) {
    if (v === p || !v.stateMachine || !p.scene.playerAlive?.get(v)) continue;
    if (v.isInvulnerable?.() || v.isGrabbed?.()) continue;
    const dx = (v.x - p.x) * p.facing;
    if (dx <= 0 || dx - v.body.width / 2 > range) continue;
    if (v.body.bottom < p.body.y || v.body.y > p.body.bottom) continue; // คนละชั้น (ลอยสูง/อยู่ต่ำกว่า)
    if (!best || dx < best.dx) best = { v, dx };
  }
  return best;
}

/** ระยะที่เป้าต้องอยู่ (จากกลางตัว KunJae) ตามเฟรมปัจจุบัน */
function lassoHoldDist(p, sk, idx) {
  const s = Math.abs(p.scaleX);
  const A = KUNJAE_WHIPSKILL_ATLAS;
  if (idx < L.PULL) return sk.d0;
  if (idx < L.COIL) return Math.min(sk.d0, (A.lassoTip[idx] - WHIP_SKILL2.loopRadius) * s);
  return A.kickX * s + 12;
}

const WHIP_SKILL2_DEF = {
  anim: "skill2",
  durationMs: ws2Ms(WEAPON_FRAMES.whip.extra.skill2.frames.length),
  cooldownMs: WHIP_SKILL2.cooldownMs,
  startSound: false,
  // ใช้กับชุดทดสอบ/HUD — ลำดับเฟรมสำคัญ
  _marks: L,
  onUpdate: (p, sk, dt) => {
    const idx = frameAt(sk);
    const sc = p.scene;
    if (!sk.thrown && idx >= L.THROW) {
      sk.thrown = true;
      sc.audio?.playSample("kj_lasso_throw");
    }
    if (!sk.checked && idx >= L.CATCH) {
      sk.checked = true;
      const hit = lassoTarget(p);
      if (!hit) {
        sk.endAt = ws2Ms(L.COIL); // พลาด: ดึงเชือกเปล่ากลับแล้วจบ ไม่เตะ
      } else if (hit.v.isBlocking?.()) {
        // กันทัน: ไม่ติดบ่วง เสียมาตรการ์ด
        const dmg = resolveAttack({ damage: WHIP_SKILL2.catchDamage }, p.characterKey).damage;
        hit.v.applyHit({ damage: dmg, knockbackX: p.facing * 60, knockbackY: 0, hitstun: 0 }, p);
        sc._applyDamage?.(hit.v, dmg, true);
        sc.hitstop?.(HITSTOP.blocked);
        sk.endAt = ws2Ms(L.COIL);
      } else {
        const v = hit.v;
        const dmg = resolveAttack({ damage: WHIP_SKILL2.catchDamage }, p.characterKey).damage;
        const stocksBefore = sc.stocks?.get(v);
        sc._applyDamage?.(v, dmg, false);
        // บ่วงรัดจนตาย (scene ให้เกิดใหม่ไปแล้ว) -> ไม่ลาก
        const respawned = sc.playerAlive?.get(v) === false || sc.stocks?.get(v) !== stocksBefore;
        // v32 เป้าที่ไม่ติดสถานะ (ย่องอยู่) โดนดาเมจบ่วงแต่ลากไม่ได้ -> ดึงเชือกเปล่ากลับ
        if (!respawned && !v.isInvulnerable?.() && v.canBeGrabbed?.() !== false) {
          v.grabBy(p);
          sk.victim = v;
          sk.d0 = hit.dx;
          CombatSystem.flashVictim(sc, v);
          sc.gunFx?.lassoSnap(v.x, v.body.center.y);
          sc.hitstop?.(60);
          sc.audio?.playSample("kj_lasso_catch");
        } else {
          sk.endAt = ws2Ms(L.COIL);
        }
      }
    }
    const v = sk.victim;
    if (!v) return;
    if (!v.isGrabbed?.() || sc.playerAlive?.get(v) === false) {
      sk.victim = null; // หลุดไปแล้ว (ตาย/เกิดใหม่) -> เตะลม
      return;
    }
    if (!sk.kicked && idx >= L.KICK) {
      sk.kicked = true;
      sk.victim = null;
      const K = resolveAttack(WHIP_SKILL2.kick, p.characterKey);
      v.releaseGrab({ knockbackX: p.facing * K.knockbackX, knockbackY: K.knockbackY, hitstun: K.hitstun });
      sc._applyDamage?.(v, K.damage, false);
      sc.hitstop?.(WHIP_SKILL2.kickHitstop);
      sc.cameras?.main.shake(260, 0.014);
      sc.audio?.playSample("kj_kick_impact");
      p.combat?._spawnHitSpark?.(v.x - p.facing * 10, v.body.center.y - 10, true, false);
      return;
    }
    // ลากเป้าตามเชือก (ค่อย ๆ เข้าหาตำแหน่ง ไม่วาร์ป)
    const target = p.x + p.facing * lassoHoldDist(p, sk, idx);
    const nx = v.x + (target - v.x) * Math.min(1, dt / 50);
    if (v.body?.reset) v.body.reset(nx, v.y);
    else v.x = nx;
  },
  onEnd: (p, sk) => {
    const v = sk.victim;
    sk.victim = null;
    if (v?.isGrabbed?.()) v.releaseGrab(); // KunJae โดนตีกลางคัน -> เป้าหลุด ไม่มีดาเมจเพิ่ม
  },
};

const SG_FIRE_FRAME = 5; // ลำดับ (นับจาก 0) ของเฟรมยิงใน skill1 = sg_11 ตัวแรก
const sgMs = (i) => Math.round((i / SHOTGUN_SKILL1.fps) * 1000);
/** ลูกซองคู่ สกิล 1 — กางแขนยิงซ้าย-ขวา */
const SHOTGUN_SKILL1_DEF = {
  anim: "skill1",
  durationMs: sgMs(WEAPON_FRAMES.shotgun.extra.skill1.frames.length),
  cooldownMs: SHOTGUN_SKILL1.cooldownMs,
  hits: [{ atMs: sgMs(SG_FIRE_FRAME), spec: SHOTGUN_SKILL1.blast }],
  events: [{ atMs: sgMs(SG_FIRE_FRAME), fn: (p) => p.scene.gunFx?.muzzleBlast(p, KUNJAE_ATLAS.muzzle, ["left", "right"]) }],
};

/**
 * ชุดสกิลต่ออาวุธ { เลขสกิล: def } — ไม่มีเลขไหน = ปุ่มเทา
 * "rush" = สกิล 1 แบบรัว (state finisher)
 */
const WEAPON_SKILLS = {
  whip: { 1: WHIP_SKILL1_DEF, 2: WHIP_SKILL2_DEF },
  pistol: { 1: "rush" },
  shotgun: { 1: SHOTGUN_SKILL1_DEF },
  rifle: {},
  grenade: {},
};

export class KunJae extends Player {
  static DISPLAY_NAME = "KunJae";
  static ANIM_PREFIX = "kunjae/";

  /** ตัวเรียวกว่าตัวละครชายในโรสเตอร์ */
  static WORLD_HEIGHT = 185;

  /** ให้ชุดทดสอบตรวจจังหวะภาพ */
  static _TEST = { SHARED, WEAPON_FRAMES, HIT_FRAME, LASSO_MARKS: L, WS1_STRIKE };

  /** สลับอาวุธด้วยปุ่มแปลงร่าง (ดู weapons.config.js) · prefix null = ชุดหลัก */
  static WEAPONS = WEAPON_LIST.map((w) => ({
    ...w,
    prefix: w.prefix ?? this.ANIM_PREFIX, // static initializer: this = คลาส KunJae
    skills: WEAPON_SKILLS[w.key] ?? {},
  }));

  /** มีอาร์ต idle หลายเฟรมจริงแล้ว จึงปิดการเขย่งด้วยโค้ด */
  static IDLE_BOB_PX = 0;

  constructor(scene, x, y, playerIndex = 0, targetWorldHeight = KunJae.WORLD_HEIGHT) {
    super(scene, x, y, KUNJAE_ATLAS.key, playerIndex, KunJae.ANIM_PREFIX);
    this.setFrame(WEAPON_FRAMES.whip.idle[0]); // setFrame รับอาเรย์ไม่ได้
    this.applySpriteScale(KUNJAE_ATLAS.standingHeightInFrame, targetWorldHeight, KUNJAE_ATLAS.bottomMargin);
    this._applyWeapon();
    this.stateMachine.setState("idle", true);
  }

  /** ถือลูกซอง: ไฟปากกระบอก (ภาพยิงไม่มีไฟในตัว) · ปืนสั้นมีไฟในภาพแล้ว · แส้ไม่มีเอฟเฟกต์ */
  onAttackActive() {
    if (this.weapon?.key === "shotgun") this.scene.gunFx?.muzzleBlast(this, KUNJAE_ATLAS.muzzle, ["front"], SHOTGUN_BASIC_FX);
  }

  static preload(scene) {
    scene.load.atlas(KUNJAE_ATLAS.key, KUNJAE_ATLAS.texturePath, KUNJAE_ATLAS.dataPath);
    scene.load.atlas(KUNJAE_WHIPSKILL_ATLAS.key, KUNJAE_WHIPSKILL_ATLAS.texturePath, KUNJAE_WHIPSKILL_ATLAS.dataPath);
  }

  static registerAnimations(scene) {
    for (const w of KunJae.WEAPONS) {
      const frames = WEAPON_FRAMES[w.key];
      if (!frames) continue; // ไรเฟิล/ระเบิด ยังไม่มีท่า -> prefix ชี้ชุดแส้
      registerCharacterAnimations(scene, {
        prefix: w.prefix,
        atlasKey: KUNJAE_ATLAS.key,
        frames: { ...SHARED, ...frames },
        timing: { runFps: 10, finisherFps: 18, attackTimeMul: CHARACTER_COMBAT[w.combatKey]?.timeMul ?? 1 },
      });
    }
  }
}
