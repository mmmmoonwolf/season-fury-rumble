import { Player } from "./Player.js";

/**
 * B1989 (ชื่อในเกม: Nyx) — นักฆ่ามีดคู่ ธาตุความมืด/วิญญาณความตาย
 * คอนเซปต์: ความเร็ว/คอมโบเป็นจุดขาย (แนวเดียวกับ Murad RoV / Benedetta Mobile Legends)
 * ลุค: ผมดำมัดหาง ชุดคลุมสีเข้มขาดวิ่น พันขาด้วยผ้าพันแผล มีดสองเล่ม
 *
 * ✅ อาร์ต 93 เฟรม ตัดจาก 8 คลิป (ดู tools/build_b1989.py):
 *   058B74CA (49f)        -> ยืนตั้งการ์ด (idle)
 *   A5FC4CE4 (264f)       -> วิ่ง
 *   5866B821 (264f)       -> กระโดดหน้า/หมุนกลับหลัง/ก้มหลบ
 *   308C9A96 (264f)       -> ท่าตั้งการ์ด/โดนโจมตี
 *   8A71DFAB (264f)       -> ปีนบันได (หันหลัง — ตัวแรกในเกมที่มีท่าปีนเฉพาะ ไม่ต้องยืมท่าวิ่ง)
 *   82DB8E79 + 6A23CC64   -> คอมโบพื้นฐาน 5 จังหวะ (สแตบมีด สลับ 2 คลิป)
 *   D684E3F6 (164f)       -> คอมโบ 2: ดาชพุ่งตี (ปลดล็อกถ้าตีติดครบ 5 แล้วกดตีต่อภายใน 2 วิ)
 *
 * ── กลไกเฉพาะตัว: คอมโบพื้นฐาน 5 จังหวะ + ดาชพุ่งตี ──
 * ใช้ระบบ hitsLanded/finisherReady/finisherTimer ที่มีอยู่แล้วในเอนจิ้น (เดิมออกแบบไว้ให้ปุ่มสกิล
 * ใช้งาน แต่ตอนนี้ตัวละครอื่นเลิกผูกกับมันแล้ว — ดูคอมเมนต์ใน Player._startAttack) นำกลับมาใช้ใหม่:
 * ตีติดครบ 5 (static BASIC_COMBO 5 ท่า) ภายในเวลา -> finisherReady=true, timer 2000ms (FINISHER_WINDOW
 * override) -> กดตี (ปุ่มเดิม ไม่ใช่ปุ่มสกิล) ภายในเวลานั้น = ดาชพุ่งตี (_forcedAttackSpec/_forcedAttackAnim
 * ที่เพิ่มใน Player._registerCombatStates ให้เล่นท่า/ดาเมจนอกลำดับคอมโบปกติได้) ดาเมจแรงกว่า ~2.5 เท่า
 * knockback/hitstun นานกว่าปกติ ~40-90% (ตัวเลขเริ่มต้น ยังไม่ผ่านเทสเล่นจริง ปรับได้ที่ NYX_DASH_FINISHER)
 *
 * ── กลไกเฉพาะตัว: ปุ่มพิเศษ (ดู Player._pickSpecialJumpState / _tryGroundSpecial) ──
 *  - ถือ A ค้าง + กระโดด = jumpForward (ลอยพุ่งไปข้างหน้า)
 *  - ถือ S ค้าง + กระโดด = jumpSpinBack (หมุนตัวกลับหลังกลางอากาศ — S ว่างเพราะกันย้ายไป B แล้ว)
 *  - กด D = ท่าก้มหลบ (dodge, ท่าจับเวลา ~400ms แล้วคืนกลับเอง) แทนการเดินขวา — ใช้ลูกศรขวาแทนถ้าจะเดินขวา
 */

const seq = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}.png`);

export const B1989_ATLAS = {
  key: "b1989",
  texturePath: "assets/characters/b1989_atlas.png",
  dataPath: "assets/characters/b1989_atlas.json",
  // ผืนภาพ 480x470 ระดับเท้า y=431 ตัวยืนสูง 393 (ธรรมเนียมเดียวกับตัวละครอื่น)
  standingHeightInFrame: 393,
  bottomMargin: 39, // 470 - 431
};

const FRAME = {
  idle: seq("idle", 9),
  run: seq("run", 11),
  jumpForward: seq("jumpForward", 6),
  jumpSpinBack: seq("jumpSpinBack", 6),
  dodge: seq("dodge", 6),
  block: seq("guard", 6), // ท่าตั้งการ์ด — ชื่อ anim ต้อง "block" (state ปุ่มกันของเอนจิ้นเรียกชื่อนี้ตรงๆ)
  hurt: seq("hurt", 6),
  climb: seq("climb", 9),
  attack1: seq("attack1", 4),
  attack2: seq("attack2", 4),
  attack3: seq("attack3", 4),
  attack4: seq("attack4", 4),
  attack5: seq("attack5", 4),
  dashFinisher: seq("dashFinisher", 14),
};

/**
 * คอมโบพื้นฐาน 5 จังหวะเฉพาะตัว (แทน BASIC_COMBO ส่วนกลางที่มี 3 จังหวะ) — สแตบมีดสลับมือ
 * ดาเมจ/knockback ไล่ระดับขึ้นเล็กน้อยจังหวะท้าย ๆ ตามธรรมเนียมเดียวกับ BASIC_COMBO ส่วนกลาง
 */
const NYX_COMBO = [
  { name: "nyx_stab1", hand: "right", startup: 55, active: 80, recovery: 110, damage: 6, reach: 68, hitboxHeight: 90, hitboxYOffset: -20, knockbackX: 90, knockbackY: -40, hitstun: 150, lungeX: 55 },
  { name: "nyx_stab2", hand: "left", startup: 55, active: 80, recovery: 110, damage: 6, reach: 68, hitboxHeight: 90, hitboxYOffset: -20, knockbackX: 90, knockbackY: -40, hitstun: 150, lungeX: 55 },
  { name: "nyx_stab3", hand: "right", startup: 55, active: 85, recovery: 115, damage: 7, reach: 70, hitboxHeight: 92, hitboxYOffset: -20, knockbackX: 100, knockbackY: -45, hitstun: 160, lungeX: 58 },
  { name: "nyx_stab4", hand: "left", startup: 55, active: 85, recovery: 115, damage: 7, reach: 70, hitboxHeight: 92, hitboxYOffset: -20, knockbackX: 100, knockbackY: -45, hitstun: 160, lungeX: 58 },
  { name: "nyx_stab5", hand: "right", startup: 60, active: 90, recovery: 150, damage: 8, reach: 74, hitboxHeight: 95, hitboxYOffset: -20, knockbackX: 120, knockbackY: -55, hitstun: 180, lungeX: 62 },
];

/**
 * คอมโบ 2 — ดาชพุ่งตี ปลดล็อกจากการตีติดครบ 5 (ดู _startAttack ด้านล่าง)
 * ดาเมจ ~2.5x ของสแตบธรรมดา, knockbackX/Y และ hitstun สูงกว่าปกติ ~40-90% ตามที่ขอ
 * ("ดาเมจแรงขึ้น และ knock back นานขึ้นอีกนิดนึง") lungeX สูงมากเพราะเป็นท่าพุ่งตัวจริง ไม่ใช่ก้าวนำหมัด
 */
const NYX_DASH_FINISHER = {
  name: "nyx_dash_finisher",
  hand: "right",
  startup: 90,
  active: 120,
  recovery: 220,
  damage: 17,
  reach: 140,
  hitboxHeight: 100,
  hitboxYOffset: -20,
  knockbackX: 320,
  knockbackY: -200,
  hitstun: 340,
  lungeX: 220,
};

export class B1989 extends Player {
  static DISPLAY_NAME = "Nyx";
  static ANIM_PREFIX = "b1989/";

  static WORLD_HEIGHT = 190;

  /** มีอาร์ต idle 9 เฟรมจริงแล้ว ปิดการเขย่งด้วยโค้ด */
  static IDLE_BOB_PX = 0;

  /** คอมโบเฉพาะตัว 5 จังหวะ (ดู Player._registerCombatStates / _finishAttack) */
  static BASIC_COMBO = NYX_COMBO;
  /** หน้าต่างเวลาหลังตีครบคอมโบก่อนโอกาสดาชพุ่งตีหมดไป — 2 วิ ตามที่ขอ (ส่วนกลางคือ 700ms) */
  static FINISHER_WINDOW = 2000;

  /** มีท่าปีนบันไดของตัวเองจริง (หันหลัง) ไม่ต้องยืมท่าวิ่ง */
  static HAS_CLIMB_ANIM = true;

  /** ท่าก้มหลบ (state "dodge") ค้างกี่ ms ก่อนคืนกลับเดิน/วิ่ง/ยืนเอง */
  static DODGE_MS = 400;

  constructor(scene, x, y, playerIndex = 0, targetWorldHeight = B1989.WORLD_HEIGHT) {
    super(scene, x, y, B1989_ATLAS.key, playerIndex, B1989.ANIM_PREFIX);
    this.setFrame(FRAME.idle[0]);
    this.applySpriteScale(B1989_ATLAS.standingHeightInFrame, targetWorldHeight, B1989_ATLAS.bottomMargin);
    this.stateMachine.setState("idle", true);
  }

  static preload(scene) {
    scene.load.atlas(B1989_ATLAS.key, B1989_ATLAS.texturePath, B1989_ATLAS.dataPath);
  }

  static registerAnimations(scene) {
    if (scene.anims.exists(`${B1989.ANIM_PREFIX}idle`)) return; // กันลงทะเบียนซ้ำตอน scene.restart()
    const key = B1989_ATLAS.key;
    const a = (name) => `${B1989.ANIM_PREFIX}${name}`;
    const toFrame = (f) => ({ key, frame: f });
    const make = (name, frames, fps, repeat = 0) =>
      scene.anims.create({ key: a(name), frames: frames.map(toFrame), frameRate: fps, repeat });

    make("idle", FRAME.idle, 8, -1);
    // วิ่ง — สอดแทรกเฟรม "ยื่นหน้าพรวด" (run_7/run_8 ในลำดับ) เข้ากลางลูป เล่นไวเป็นพิเศษให้ดูกระตุก/หลอน
    make("run", FRAME.run, 16, -1);
    make("jump", FRAME.jumpForward, 12); // กระโดดเฉย ๆ (ไม่ถือ A/S) ยืมท่า jumpForward ไปก่อน
    make("jumpForward", FRAME.jumpForward, 12);
    make("jumpSpinBack", FRAME.jumpSpinBack, 16); // หมุนตัวต้องไวกว่าอ่านทัน
    make("fall", [FRAME.jumpSpinBack[FRAME.jumpSpinBack.length - 1]], 1);
    make("land", [FRAME.dodge[0]], 1); // ลงพื้น = ย่อรับแรงกระแทกสั้น ๆ ยืมท่าก้มหลบเฟรมแรก
    make("dodge", FRAME.dodge, 10, -1);
    make("block", FRAME.block, 14, 0);
    make("hurt", FRAME.hurt, 10, 0);
    make("climb", FRAME.climb, 10, -1);

    make("attack_1", FRAME.attack1, (FRAME.attack1.length / (NYX_COMBO[0].startup + NYX_COMBO[0].active + NYX_COMBO[0].recovery)) * 1000);
    make("attack_2", FRAME.attack2, (FRAME.attack2.length / (NYX_COMBO[1].startup + NYX_COMBO[1].active + NYX_COMBO[1].recovery)) * 1000);
    make("attack_3", FRAME.attack3, (FRAME.attack3.length / (NYX_COMBO[2].startup + NYX_COMBO[2].active + NYX_COMBO[2].recovery)) * 1000);
    make("attack_4", FRAME.attack4, (FRAME.attack4.length / (NYX_COMBO[3].startup + NYX_COMBO[3].active + NYX_COMBO[3].recovery)) * 1000);
    make("attack_5", FRAME.attack5, (FRAME.attack5.length / (NYX_COMBO[4].startup + NYX_COMBO[4].active + NYX_COMBO[4].recovery)) * 1000);
    make("dash_finisher", FRAME.dashFinisher, (FRAME.dashFinisher.length / (NYX_DASH_FINISHER.startup + NYX_DASH_FINISHER.active + NYX_DASH_FINISHER.recovery)) * 1000);
  }

  // ---------- ท่าพิเศษ (ดู Player._pickSpecialJumpState / _tryGroundSpecial) ----------
  _pickSpecialJumpState(input) {
    if (input.aKeyDown) return "jumpForward";
    if (input.sKeyDown) return "jumpSpinBack";
    return null;
  }

  _tryGroundSpecial(input) {
    if (input.dKeyPressed && !this.isAttacking() && !this.isBlocking() && !this.isDodging()) {
      this.stateMachine.setState("dodge", true);
      return true;
    }
    return false;
  }

  // ---------- คอมโบ 5 จังหวะ + ดาชพุ่งตี ----------
  /**
   * ตีติดครบ 5 ภายในเวลา (finisherReady, ดู Player._finishAttack ที่ generalize ไว้แล้ว) -> กดตีต่อ
   * ภายใน FINISHER_WINDOW (2 วิ) = ดาชพุ่งตี แทนการวนกลับไปสแตบที่ 1 ตามปกติ
   */
  _startAttack() {
    if (this.finisherReady) {
      this.finisherReady = false;
      this._forcedAttackSpec = NYX_DASH_FINISHER;
      this._forcedAttackAnim = "dash_finisher";
      this.stateMachine.setState("attack", true);
      return;
    }
    this.comboStep = (this._punchVariant ?? 0) % NYX_COMBO.length;
    this._punchVariant = ((this._punchVariant ?? 0) + 1) % NYX_COMBO.length;
    this.stateMachine.setState("attack", true);
  }

  /** ดาชพุ่งตีจบแล้ว = รีเซ็ตคอมโบทั้งชุด (เหมือนไม้ตายเดิม) ไม่ใช่ต่อจากจังหวะที่ค้างไว้ตอนตีครบ 5 */
  _finishAttack() {
    const wasDash = this.currentAttack?.name === NYX_DASH_FINISHER.name;
    if (wasDash) {
      this.currentAttack = null;
      this._atk = null;
      this._resetCombo();
      this._toNeutralState();
      return;
    }
    super._finishAttack();
  }
}
