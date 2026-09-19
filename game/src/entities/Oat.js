import { Player } from "./Player.js";
import { registerCharacterAnimations } from "./characterAnims.js";
import { TRANSFORM } from "../config/transform.config.js";
import { TITAN_SKILL1, TITAN_SKILL2, TITAN_SKILL3 } from "../config/combat.config.js";

/**
 * OAT — ตัวละครที่ 7 (ตัวที่ 4 ในโรสเตอร์ปัจจุบัน)
 * ลุค: หนุ่มผมดำมัดจุก เสื้อโค้ทยาวสีดำปลิว เสื้อยืดเทา กางเกงดำ บูทสูง
 *
 * ✅ อาร์ต 94 เฟรม ตัดจาก 2 คลิปด้วย tools/build_oat.py
 *    A: USE_THIS_IN__ONE.MOV (628f)            -> idle / run / jump / กัน / โดนตี / ยั่ว / ล้ม / ไม้ตาย
 *    B: Same_character_same_outfit_s.mp4 (432f) -> หมัด 1-2-3
 *
 * ── หมายเหตุท่า ──
 * - หมัด 1/2/3 = ซ้าย (jab) -> ขวา (cross) -> ซ้าย (jab) จากคลิป B ทุกหมัดยึดจุดเดียวกัน ตัวไม่กระโดดระหว่างหมัด
 * - ไม้ตาย   = รัว jab แขนเดียวจากคลิป A (rush_*) — ผู้ใช้ยืนยันแบบนี้แล้ว ไม่ผูกกับเฟรม hit
 * - กัน      = ย่อตัวลงพื้น (f343-f361) เล่นครั้งเดียวค้างเฟรมสุดท้าย
 * - ยั่ว     = ยืนชิลล์ไม่ตั้งการ์ด (f612)
 * - โดนตี   = f380-f389 หมุนตั้งตัวขึ้นให้เอียงเหลือ ~15° (ต้นฉบับเอียง 30-35°) มีประกายด้านหลัง
 *
 * ── เฟรมที่เก็บไว้เฉย ๆ (ยังไม่มี state ล้ม/ลุก) ──
 * knockdown_1-9 = ปลิวถอยหลังแล้วนอนราบ, getup_1-3 = ยันตัวลุก, leap_1-7 = กระโจนยกเข่า
 * อยู่ใน atlas แล้ว ผูก state ได้ทันทีที่ทำระบบล้ม
 */
export const OAT_ATLAS = {
  key: "oat",
  texturePath: "assets/characters/oat_atlas.png",
  dataPath: "assets/characters/oat_atlas.json",
  // ผืนภาพ 640x470 (กว้างกว่าตัวอื่นเผื่อชายโค้ท) ระดับเท้า y=431 ตัวยืนสูง 393
  standingHeightInFrame: 393,
  bottomMargin: 39, // 470 - 431
};

/**
 * ร่างไททัน — แปลงร่างด้วย numpad 8 (ดู transform.config.js)
 * atlas ทั้งหมดสร้างด้วย tools/build_oat_titan.py จากคลิป gemini_generated_video_*
 * ผืนภาพ/ระดับเท้าเหมือนร่างปกติ ต่างแค่ตั้งความสูงในโลกเกมเป็น 1.5 เท่า
 * ท่าที่มีควัน/หนามใหญ่อยู่คนละไฟล์ (รวมกันแล้ว texture สูงเกินลิมิต):
 *   oat_tf           ร่าง OAT แปลงร่าง (เรืองแสง + ปะทุเป็นควัน)
 *   oattitan_roar    ไททันยืนคำราม ไฟวาบ ไอพวยพุ่ง (ท่าปรากฏตัว)
 *   oattitan_skill2a/b  สกิล 2
 *   oattitan_roar2   สกิล 3 ท่าคำราม (คลิป H)
 *   crazytitans      สกิล 3 ไททันบ้า 3 ตัว (tools/build_crazy_titans.py) — sprite แยก ไม่ใช่ร่างของผู้เล่น
 */
const EXTRA_ATLASES = ["oat_tf", "oattitan_roar", "oattitan_roar2", "oattitan_skill2a", "oattitan_skill2b", "oattitan_kick", "crazytitans"];
export const OAT_TITAN_ATLAS = {
  key: "oattitan",
  texturePath: "assets/characters/oattitan_atlas.png",
  dataPath: "assets/characters/oattitan_atlas.json",
  standingHeightInFrame: 393,
  bottomMargin: 39,
};

const seq = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}.png`);

const FRAME = {
  idle: seq("idle", 10),
  run: seq("run", 10),     // 1 รอบก้าวเต็ม (f520-f538)
  jump: seq("jump", 5),
  fall: seq("fall", 4),
  land: seq("land", 2),
  attack1: seq("hit1", 7),  // jab ซ้าย
  attack2: seq("hit2", 8),  // cross ขวา
  attack3: seq("hit3", 9),  // jab ซ้าย + คืนการ์ด
  finisherLoop: seq("rush", 8),
  hurt: seq("hurt", 4),
  block: seq("block", 7),
  taunt: "taunt_1.png",
  // เฟรมสำรองที่ยังไม่ผูกเข้าระบบ (characterAnims ไม่อ่าน key เหล่านี้)
  knockdown: seq("knockdown", 9),
  getup: seq("getup", 3),
  leap: seq("leap", 7),     // โน้มตัวพุ่ง + กระโจนยกเข่า (เคยเป็นหมัด 3) เก็บไว้ทำสกิล
  extra: {
    // แปลงร่าง — fps ต้องตรงกับ TRANSFORM.anim (timeline คำนวณจากตรงนั้น)
    tf_glow: { atlas: "oat_tf", frames: seq("tfglow", TRANSFORM.anim.glow.frames), fps: TRANSFORM.anim.glow.fps },
    tf_erupt: { atlas: "oat_tf", frames: seq("tferupt", TRANSFORM.anim.erupt.frames), fps: TRANSFORM.anim.erupt.fps },
  },
};

/**
 * v33 สกิล 1 ร่างไททัน — ง้างเตะ (แทนหมัดรัว) · ค่าใน TITAN_SKILL1 · atlas oattitan_kick (tools/build_oat_titan_kick.py)
 * เสียง: ง้าง (ตอนกด) -> เตะ (ตอนเริ่มเหวี่ยงขา) — ตัดจากคลิปเดียวกัน
 */
const kickAt = (i) => Math.round((i / TITAN_SKILL1.fps) * 1000);
const SKILL1_DEF = {
  anim: "skill1",
  durationMs: kickAt(TITAN_SKILL1.frames),
  cooldownMs: TITAN_SKILL1.cooldownMs,
  armor: TITAN_SKILL1.armor,
  startSound: false,
  hits: [{ atMs: kickAt(TITAN_SKILL1.contactIndex), spec: TITAN_SKILL1.kick, shake: [320, 0.016] }],
  events: [
    { atMs: 0, fn: (p) => p.scene.audio?.playSample?.("oat_titan_windup") },
    { atMs: kickAt(TITAN_SKILL1.swingIndex), fn: (p) => p.scene.audio?.playSample?.("oat_titan_kick") },
  ],
};

/**
 * สกิล 2 ร่างไททัน (คลิป E) — แขนคริสตัล 25 เฟรม · ทุบพื้น+ระลอก 1 21 เฟรม · ระลอก 2 20 เฟรม · ค้าง 11 เฟรม
 * เล่นเป็นท่าเดียวที่ SKILL2_FPS · จังหวะ hitbox คำนวณจากลำดับเฟรมในคลิป
 */
const SKILL2_FPS = 26;
const SKILL2_FRAMES = [
  ...seq("s2harden", 25).map((f) => ({ frame: f, atlas: "oattitan_skill2a" })),
  ...seq("s2slam", 21).map((f) => ({ frame: f, atlas: "oattitan_skill2a" })),
  ...seq("s2wave", 20).map((f) => ({ frame: f, atlas: "oattitan_skill2b" })),
  ...seq("s2hold", 11).map((f) => ({ frame: f, atlas: "oattitan_skill2b" })),
];
const atFrame = (i) => Math.round((i / SKILL2_FPS) * 1000);
const SKILL2_DEF = {
  anim: "skill2",
  durationMs: atFrame(SKILL2_FRAMES.length),
  cooldownMs: TITAN_SKILL2.cooldownMs,
  armor: TITAN_SKILL2.armor,
  hits: [
    // ระลอก 1: หมัดกระแทกพื้น หนามแรกโผล่ (คลิป E f187 = s2slam_9)
    { atMs: atFrame(25 + 8), spec: TITAN_SKILL2.wave1, shake: [250, 0.012], sound: { pitch: 0.5, volume: 1.3 } },
    // ระลอก 2: หนามสูงพุ่งขึ้น (คลิป E f226 = s2wave_14)
    { atMs: atFrame(25 + 21 + 13), spec: TITAN_SKILL2.wave2, shake: [400, 0.018], sound: { pitch: 0.4, volume: 1.5 } },
  ],
  onEndFx: "shatterCrystals", // หนามหายพร้อมเฟรมสุดท้าย -> ปิดรอยต่อด้วยเศษคริสตัลแตก
};

/**
 * สกิล 3 ร่างไททัน — ยืนคำราม (คลิป H) แล้วเรียกไททันบ้า (CrazyTitanSystem) · ค่าทั้งหมดใน TITAN_SKILL3
 * ท่าคำรามล็อกตัวแค่ ~1.25 วิ หลังจากนั้นต่อยได้ปกติระหว่างที่ไททันบ้ายังวิ่งอยู่
 */
const SKILL3_DEF = {
  anim: "skill3",
  durationMs: Math.round((TITAN_SKILL3.roar.frames / TITAN_SKILL3.roar.fps) * 1000),
  cooldownMs: TITAN_SKILL3.cooldownMs,
  armor: TITAN_SKILL3.armor,
  hits: [],
  events: [
    { atMs: 0, fn: (p) => p.scene.cameras?.main.shake(400, 0.005) },
    // v33 เสียงคำรามจริง (ครั้งที่ 2 ที่ใช้เสียงนี้ — อีกครั้งคือตอนแปลงร่าง)
    { atMs: 0, fn: (p) => p.scene.audio?.playSample?.("oat_titan_roar") },
    { atMs: TITAN_SKILL3.spawnAtMs, fn: (p) => p.scene.crazyTitans?.spawn(p) },
  ],
};

/**
 * เฟรมร่างไททัน
 * หมัด 1-2-3 = ขวา -> ซ้าย -> ขวาหนัก (ลำดับจริงในคลิป F) · สกิล 1 = สลับขวา-ซ้ายตอนยืดสุด
 * ⚠️ hurt เป็นเฟรมชั่วคราว (ย่อเข่า) — ยังไม่มีคลิปโดนตี
 */
const FRAME_TITAN = {
  idle: seq("idle", 10),
  run: seq("run", 10),
  jump: seq("jump", 3),
  fall: seq("fall", 3),
  land: seq("land", 2),
  attack1: seq("hit1", 8),
  attack2: seq("hit2", 8),
  attack3: seq("hit3", 12),
  finisherLoop: seq("rush", 8),
  hurt: seq("hurt", 1),
  block: seq("block", 5),
  taunt: "taunt_1.png",
  extra: {
    roar: { atlas: "oattitan_roar", frames: seq("roar", TRANSFORM.anim.roar.frames), fps: TRANSFORM.anim.roar.fps },
    skill2: { frames: SKILL2_FRAMES, fps: SKILL2_FPS },
    skill3: { atlas: "oattitan_roar2", frames: seq("s3roar", TITAN_SKILL3.roar.frames), fps: TITAN_SKILL3.roar.fps },
    skill1: { atlas: "oattitan_kick", frames: seq("kick", TITAN_SKILL1.frames), fps: TITAN_SKILL1.fps },
  },
};

export class Oat extends Player {
  static DISPLAY_NAME = "OAT";
  static ANIM_PREFIX = "oat/";

  static WORLD_HEIGHT = 195;

  /** ร่างที่แปลงได้ — Player อ่านค่านี้ (มีค่า = ตัวละครนี้แปลงร่างได้) */
  static FORM_ALT = {
    textureKey: OAT_TITAN_ATLAS.key,
    firstFrame: "idle_1.png",
    prefix: "oattitan/",
    characterKey: "oattitan", // ค่าต่อสู้ใน CHARACTER_COMBAT.oattitan
    standingHeightInFrame: OAT_TITAN_ATLAS.standingHeightInFrame,
    bottomMargin: OAT_TITAN_ATLAS.bottomMargin,
    worldHeight: Math.round(this.WORLD_HEIGHT * TRANSFORM.sizeMul), // static initializer: this = คลาส Oat
    displayName: "OAT TITAN",
    maxHp: TRANSFORM.titanHp, // หลอดเลือดแยกของร่างนี้
    skills: { 1: SKILL1_DEF, 2: SKILL2_DEF, 3: SKILL3_DEF }, // v33 สกิล 1 = ง้างเตะ (เดิมหมัดรัวมาตรฐาน)
  };

  /** มีอาร์ต idle 10 เฟรมจริง ปิดการเขย่งด้วยโค้ด */
  static IDLE_BOB_PX = 0;

  constructor(scene, x, y, playerIndex = 0, targetWorldHeight = Oat.WORLD_HEIGHT) {
    super(scene, x, y, OAT_ATLAS.key, playerIndex, Oat.ANIM_PREFIX);
    // setFrame() รับอาเรย์ไม่ได้ — หยิบเฟรมแรก
    this.setFrame(FRAME.idle[0]);
    this.applySpriteScale(OAT_ATLAS.standingHeightInFrame, targetWorldHeight, OAT_ATLAS.bottomMargin);
    this.stateMachine.setState("idle", true);
  }

  static preload(scene) {
    scene.load.atlas(OAT_ATLAS.key, OAT_ATLAS.texturePath, OAT_ATLAS.dataPath);
    scene.load.atlas(OAT_TITAN_ATLAS.key, OAT_TITAN_ATLAS.texturePath, OAT_TITAN_ATLAS.dataPath);
    for (const k of EXTRA_ATLASES) {
      scene.load.atlas(k, `assets/characters/${k}_atlas.png`, `assets/characters/${k}_atlas.json`);
    }
  }

  static registerAnimations(scene) {
    registerCharacterAnimations(scene, {
      prefix: Oat.ANIM_PREFIX,
      atlasKey: OAT_ATLAS.key,
      frames: FRAME,
      // idle หยิบทุก 12 เฟรมของคลิป (เวลาจริง 2fps) -> 6fps = หายใจเร็วขึ้น 3 เท่า ยังดูสบาย ๆ
      // run หยิบทุก 2 เฟรม (เวลาจริง 12fps) -> 14 ใกล้ของจริง
      timing: { idleFps: 6, runFps: 14, jumpFps: 12, finisherFps: 20, blockFps: 16 },
    });
    registerCharacterAnimations(scene, {
      prefix: Oat.FORM_ALT.prefix,
      atlasKey: OAT_TITAN_ATLAS.key,
      frames: FRAME_TITAN,
      // run หยิบทุก 3 เฟรม (เวลาจริง 8fps) -> 11 ก้าวหนักกว่าร่างปกติ
      // finisher 8 เฟรม สลับขวา-ซ้าย · 16fps = หมัดละ ~0.25 วิ ดูหนักแต่ยังเป็น "รัว"
      timing: { idleFps: 7, runFps: 11, jumpFps: 8, finisherFps: 16, blockFps: 14, attackTimeMul: 1.25 },
    });
    // ไททันบ้า (สกิล 3) — ท่าวิ่งวนของแต่ละตัว ใช้กับ sprite ใน CrazyTitanSystem
    for (const r of TITAN_SKILL3.runners) {
      if (scene.anims.exists(`crazy/${r.kind}`)) continue;
      scene.anims.create({
        key: `crazy/${r.kind}`,
        frames: seq(r.kind, r.frames).map((f) => ({ key: "crazytitans", frame: f })),
        frameRate: r.fps,
        repeat: -1,
      });
    }
  }
}
