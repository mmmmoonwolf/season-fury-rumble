import { Player } from "./Player.js";
import { registerCharacterAnimations } from "./characterAnims.js";
import { DEARV2_SNEAK, SNEAK_ATLAS, DEARV2_BALLOON, BALLOON_ATLAS, DV2FX_ATLAS } from "../config/dearv2.config.js";
import { registerBalloonAnims } from "../systems/BalloonSystem.js";

/**
 * Dear V.2 — ตัวละครคนละตัวกับ Dear เดิม (ไม่ใช่การอัปเกรด อยู่ในโรสเตอร์พร้อมกันได้)
 * ลุค: ตัวตลกชุดขาวครีม ผมส้มฟู ปอมปอมแดง รองเท้าบูทเขียวเข้ม
 *
 * ✅ อาร์ตครบ 61 เฟรม — ตัดจากคลิปเดียวยาว 30 วิ (720 เฟรม @24fps)
 *    เป็นตัวที่มีเฟรมเยอะที่สุดในเกม โดยเฉพาะ run 12 เฟรมซึ่งขาสลับซ้าย-ขวาจริง
 *    (ต่างจาก March ที่เจนภาพนิ่งทีละท่าแล้วขาไม่สลับ)
 *
 * ── ตัวแรกที่มีท่า block ──
 * `block_*` คือท่าย่อตัวจากคลิป ผูกกับปุ่มกันแยก (P1 = B, P2 = N)
 * ระบบ block อยู่ใน Player.js (`tryBlock()` / state "block")
 *
 * ⚠️ คุณภาพอาร์ตที่รู้อยู่แล้ว:
 *    คลิปต้นทางพื้นหลังเป็น "เทาอ่อน" ไม่ใช่ขาวล้วน (RGB ~200-237) ซึ่งชุดตัวละครก็ขาวครีม
 *    สีใกล้กันมาก การตัดพื้นหลังจึงเหลือรูโหว่บ้างในท่าที่ตัวติดพื้น — เห็นชัดสุดที่ `block_*`
 *    ท่าอื่นที่ขนาดจริงในเกม (~190px) แทบมองไม่เห็น
 *    ถ้าจะแก้: เจนคลิปใหม่โดยระบุ pure white background, no floor, no shadow แล้วรัน tools/build_dearv2.py ซ้ำ
 */
/**
 * v30 เคยเพิ่มสกิล 1-2 (มีดจ้วง / เสกตัวตลกเล็ก) จากคลิป skill1.MP4 + skill2.MP4 — **v31 ถอดออก**
 * เหตุผล: ขอบตัวละครที่ตัดจากคลิปพื้นเทาไล่เฉดไม่เนียน ผู้ใช้จะเจนคลิปใหม่
 * โค้ดที่ยังอยู่ พร้อมต่อกลับทันทีเมื่อมีอาร์ตใหม่:
 *   - `src/config/dearv2.config.js` (ค่าสกิลทั้งหมด)
 *   - `src/systems/MiniClownSystem.js` (ตัวตลกเล็ก วิ่งหาเป้า/รุมแทง) + scene สร้างไว้ที่ `this.miniClowns`
 *   - `Player` รองรับ `charges` (สกิลกดได้หลายครั้งก่อนคูลดาวน์) + HUD โชว์ `S2·2`
 *   - ไฟล์เสียงจากคลิปเดิมยังอยู่ (`dv2_laugh`, `dv2_knife_hit`, `dv2_clown_call`, `dv2_clown_laugh`)
 *   - `tools/build_dearv2_skills.py` (สร้าง atlas ท่าสกิล + atlas ตัวตลก)
 * ต่อกลับ: build atlas ใหม่ -> ใส่ `extra.skill1/skill2` ใน FRAME · `static SKILLS` · preload atlas · ลงทะเบียน anim ตัวตลก
 *
 * v32: สกิล 2 ใหม่ = "ย่อง" (แทนเสกตัวตลกเดิม) — ดู DEARV2_SNEAK ใน dearv2.config.js
 *   ตัดจากคลิปพื้นขาวล้วน ขอบเนียนแล้ว (tools/build_dearv2_sneak.py) · สกิล 1 ยังเป็นคอมโบรัวมาตรฐาน
 */
export const DEARV2_ATLAS = {
  key: "dearv2",
  texturePath: "assets/characters/dearv2_atlas.png",
  dataPath: "assets/characters/dearv2_atlas.json",
  // ผืนภาพ 640x470 ระดับเท้า y=431 ตัวยืนสูง 393 — v32 ขยายจาก 420 (มีดท่าย่องแทงยื่นเกินกรอบเดิม)
  // ขยายด้วยการแก้ json อย่างเดียว (spriteSourceSize.x +110) พิกเซลเดิมไม่เปลี่ยน · ทุก atlas ของ Dear V.2 ต้อง 640
  standingHeightInFrame: 393,
  bottomMargin: 39, // 470 - 431
};

const FRAME = {
  // ยืนหายใจ 7 เฟรมจากคลิปจริง — ไม่ต้องพึ่ง IDLE_BOB
  idle: ["idle_1.png", "idle_2.png", "idle_3.png", "idle_4.png", "idle_5.png", "idle_6.png", "idle_7.png"],
  // วิ่ง 12 เฟรม = เยอะที่สุดในเกม ขาสลับซ้าย-ขวาจริงจากคลิป
  run: ["run_1.png", "run_2.png", "run_3.png", "run_4.png", "run_5.png", "run_6.png",
        "run_7.png", "run_8.png", "run_9.png", "run_10.png", "run_11.png", "run_12.png"],
  jump: ["jump_1.png", "jump_2.png", "jump_3.png"],
  fall: ["fall_1.png", "fall_2.png", "fall_3.png"],
  land: ["land_1.png", "land_2.png"],
  attack1: ["hit1_1.png", "hit1_2.png", "hit1_3.png", "hit1_4.png", "hit1_5.png", "hit1_6.png", "hit1_7.png"],
  attack2: ["hit2_1.png", "hit2_2.png", "hit2_3.png", "hit2_4.png", "hit2_5.png", "hit2_6.png", "hit2_7.png"],
  attack3: ["hit3_1.png", "hit3_2.png", "hit3_3.png", "hit3_4.png", "hit3_5.png", "hit3_6.png", "hit3_7.png"],
  // ไม้ตาย: วนเฟรมเตะหมุน (hit3) สลับกับหมัด ให้ดูรัวต่อเนื่อง
  finisherLoop: ["hit3_3.png", "hit3_4.png", "hit3_5.png", "hit2_4.png", "hit2_5.png", "hit1_4.png"],
  // ⚠️ คลิปไม่มีจังหวะโดนตี — ยืมเฟรมแรกของท่าเตะ (ตัวเอนไปหลัง) ไปก่อน
  hurt: "hit3_1.png",
  // ท่ากัน — ผูกกับปุ่ม block
  block: ["block_1.png", "block_2.png", "block_3.png", "block_4.png", "block_5.png", "block_6.png"],
  taunt: ["taunt_1.png", "taunt_2.png", "taunt_3.png", "taunt_4.png", "taunt_5.png", "taunt_6.png", "taunt_7.png"],
  // v32 สกิล 2 ย่อง — อยู่ใน atlas แยก (dearv2_sneak_atlas ผืนภาพ 640 เท่ากัน)
  extra: {
    sneak_in: { atlas: SNEAK_ATLAS.key, fps: DEARV2_SNEAK.introFps, frames: seq("sneak_in", 10) },
    // ยืนย่องนิ่ง: 5 เฟรมไป-กลับ ให้ดูหายใจ ไม่กระตุกตอนวน
    sneak_idle: { atlas: SNEAK_ATLAS.key, fps: DEARV2_SNEAK.idleFps, repeat: -1, frames: [1, 2, 3, 4, 5, 4, 3, 2].map((i) => `sneak_idle_${i}.png`) },
    sneak_walk: { atlas: SNEAK_ATLAS.key, fps: DEARV2_SNEAK.walkFps, repeat: -1, frames: seq("sneak_walk", 16) },
    // แทง 2 แบบสลับกันตอนรัว (เฟรมที่ 3 = มีดยืดสุด)
    sneak_stabA: { atlas: SNEAK_ATLAS.key, fps: DEARV2_SNEAK.stabFps, frames: seq("stabA", 6) },
    sneak_stabB: { atlas: SNEAK_ATLAS.key, fps: DEARV2_SNEAK.stabFps, frames: seq("stabB", 6) },
    // v34 ลูกโป่ง (dearv2_balloon_atlas ผืน 640 เท่ากัน)
    balloon_throw: { atlas: BALLOON_ATLAS.key, fps: DEARV2_BALLOON.throw.fps, frames: seq("throw", DEARV2_BALLOON.throw.frames) },
    balloon_place: { atlas: BALLOON_ATLAS.key, fps: DEARV2_BALLOON.trap.fps, frames: seq("place", DEARV2_BALLOON.trap.frames) },
  },
};

function frameMs(i, fps) {
  return Math.round((i / fps) * 1000);
}

function seq(name, n) {
  return Array.from({ length: n }, (_, i) => `${name}_${i + 1}.png`);
}

export class DearV2 extends Player {
  static DISPLAY_NAME = "Dear V2";
  static ANIM_PREFIX = "dearv2/";

  static WORLD_HEIGHT = 185;

  /**
   * สกิล 3 (ultimate) ย่อง — v32 อยู่ช่อง 2 · v33 ย้ายมาช่อง 3 (numpad 6) · ช่อง 2 ว่าง (ปุ่มเทา)
   * ท่าเข้าโหมดเป็นสกิลแบบมีจังหวะธรรมดา (state "skill") แล้วเปิดโหมดย่องตั้งแต่เฟรมแรก
   * กลไกโหมดย่องอยู่ใน Player (startSneak / isSneaking / sneak stab) เพราะแตะ hitstun, hitstop, ดาเมจ, collider
   * สกิล 1 ไม่ประกาศ = ใช้คอมโบรัวมาตรฐาน (finisher) ตามเดิม
   */
  static SKILLS = {
    // v34 S1 เขวี้ยงลูกโป่ง: ปล่อยมือที่เฟรม releaseIndex -> BalloonSystem ทำต่อ
    1: {
      anim: "balloon_throw",
      durationMs: frameMs(DEARV2_BALLOON.throw.frames, DEARV2_BALLOON.throw.fps),
      cooldownMs: DEARV2_BALLOON.throw.cooldownMs,
      startSound: false,
      events: [{ atMs: frameMs(DEARV2_BALLOON.throw.releaseIndex, DEARV2_BALLOON.throw.fps), fn: (p) => p.scene.balloons?.throwBalloon(p) }],
    },
    // v34 S2 วางลูกโป่งกับดัก (ผลตาม trapMode ที่เลือกด้วย numpad 8)
    // แก้ไข: super armor ทั้งท่า — โดนตีเลือดลดตามปกติ แต่ไม่สะดุด/หลุดท่า (ก้มวางของอยู่ ไม่ควรโดนขัดง่าย)
    2: {
      anim: "balloon_place",
      durationMs: frameMs(DEARV2_BALLOON.trap.frames, DEARV2_BALLOON.trap.fps),
      cooldownMs: DEARV2_BALLOON.trap.cooldownMs,
      startSound: false,
      armor: true,
      events: [{ atMs: frameMs(DEARV2_BALLOON.trap.placeIndex, DEARV2_BALLOON.trap.fps), fn: (p) => p.scene.balloons?.placeTrap(p) }],
    },
    3: {
      anim: "sneak_in",
      durationMs: DEARV2_SNEAK.introMs,
      cooldownMs: DEARV2_SNEAK.cooldownMs,
      startSound: false,
      onStart: (p) => p.startSneak(DEARV2_SNEAK),
    },
  };

  /** ท่าปกติ -> ท่าย่อง (Player.play สลับให้เองระหว่างย่อง) */
  static SNEAK_ANIMS = { idle: "sneak_idle", run: "sneak_walk", land: "sneak_idle" };

  /** มีอาร์ต idle 7 เฟรมจริงแล้ว ปิดการเขย่งด้วยโค้ด (กันขยับซ้อนกันจนดูสั่น) */
  static IDLE_BOB_PX = 0;

  constructor(scene, x, y, playerIndex = 0, targetWorldHeight = DearV2.WORLD_HEIGHT) {
    super(scene, x, y, DEARV2_ATLAS.key, playerIndex, DearV2.ANIM_PREFIX);
    this.setFrame(Array.isArray(FRAME.idle) ? FRAME.idle[0] : FRAME.idle);
    this.applySpriteScale(DEARV2_ATLAS.standingHeightInFrame, targetWorldHeight, DEARV2_ATLAS.bottomMargin);
    this.stateMachine.setState("idle", true);
  }

  static preload(scene) {
    scene.load.atlas(DEARV2_ATLAS.key, DEARV2_ATLAS.texturePath, DEARV2_ATLAS.dataPath);
    scene.load.atlas(SNEAK_ATLAS.key, SNEAK_ATLAS.texturePath, SNEAK_ATLAS.dataPath);
    scene.load.atlas(BALLOON_ATLAS.key, BALLOON_ATLAS.texturePath, BALLOON_ATLAS.dataPath);
    scene.load.atlas(DV2FX_ATLAS.key, DV2FX_ATLAS.texturePath, DV2FX_ATLAS.dataPath);
  }

  // ---------- v34 ลูกโป่ง ----------

  /** ผลของกับดักที่จะวางครั้งถัดไป (index ใน DEARV2_BALLOON.trap.modes) */
  trapMode = 0;

  /** numpad 8 ของ Dear = วนเลือกผลกับดัก (Dear ไม่มีแปลงร่าง/อาวุธ) · ติดใบ้ (silence) อยู่เปลี่ยนไม่ได้ */
  trySwitchWeapon() {
    const modes = DEARV2_BALLOON.trap.modes;
    this.trapMode = (this.trapMode + 1) % modes.length;
    const m = modes[this.trapMode];
    this.scene.showFloatLabel?.(this, `${m.icon} ${m.label}`, m.color);
    this.scene.audio?.playSample?.("dv2_balloon_squeak", { rate: 1.3, volume: 0.5 });
    return true;
  }

  /** ต่อท้ายชื่อปุ่มสกิลบน HUD — S2 บอกผลกับดักที่เลือกไว้ */
  skillLabelSuffix(n) {
    if (n !== 2) return "";
    return DEARV2_BALLOON.trap.modes[this.trapMode].icon;
  }

  static registerAnimations(scene) {
    registerBalloonAnims(scene);
    registerCharacterAnimations(scene, {
      prefix: DearV2.ANIM_PREFIX,
      atlasKey: DEARV2_ATLAS.key,
      frames: FRAME,
      // เฟรมเยอะกว่าตัวอื่นมาก จึงเล่นไวขึ้นเพื่อให้จบท่าในเวลาเท่ากัน
      timing: { idleFps: 8, runFps: 16, jumpFps: 12, finisherFps: 20 },
    });
  }
}
