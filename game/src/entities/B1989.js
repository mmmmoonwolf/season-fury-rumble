import { Player } from "./Player.js";

/**
 * B1989 (ชื่อในเกม: Nyx) — นักฆ่ามีดคู่ ธาตุความมืด/วิญญาณความตาย
 * คอนเซปต์: ความเร็ว/คอมโบเป็นจุดขาย (แนวเดียวกับ Murad RoV / Benedetta Mobile Legends)
 * ลุค: ผมดำมัดหาง ชุดคลุมสีเข้มขาดวิ่น พันขาด้วยผ้าพันแผล มีดสองเล่ม
 *
 * ✅ อาร์ต 165 เฟรม ตัดจากคลิปชุดที่ 2 ที่ gen ใหม่หมด (ไม่มีเงาติดพื้นแล้ว — ดู tools/build_b1989.py):
 *   EB79F06C (240f)  -> ยืนตั้งการ์ด (idle)  ลูป f45 คาบ 21 เฟรม
 *   51F232CC (240f)  -> วิ่ง                  ลูป f147 คาบ 20 เฟรม
 *   053D2512 (240f)  -> กระโดดหน้า/หมุนกลับหลัง/ย่อตัว
 *   D63CC847 (240f)  -> ท่าตั้งการ์ด/โดนโจมตี
 *   F133C380 (408f)  -> ปีนบันได (หันหลัง — ตัวแรกในเกมที่มีท่าปีนเฉพาะ ไม่ต้องยืมท่าวิ่ง) ลูป f74 คาบ 36
 *   EDE25E85 (240f)  -> คอมโบพื้นฐาน 5 จังหวะ (สแตบมีด เลือก 5 จังหวะ "สุดแขน" ที่ต่างมุมกัน)
 *   9CCA9616 (164f)  -> คอมโบ 2: ดาชพุ่งตี (ปลดล็อกถ้าตีติดครบ 5 แล้วกดตีต่อภายใน 2 วิ)
 *   AD5802D7 (196f)  -> ท่าเสกอาวุธ (พิษเขียว/ไฟแดง) — ยังไม่ได้ใช้ ไม่มี state ไหนเรียก
 *
 * เวอร์ชันแรกมี 93 เฟรมและมีเงาติดพื้นทุกเฟรม (ทำให้ระดับเท้าเพี้ยน ท่ากระโดดดูไม่ลอย)
 * รอบนี้ gen คลิปใหม่หมดจนเงาหาย แล้วเพิ่มเฟรมเกือบเท่าตัวให้ขยับลื่นขึ้น
 *
 * ── กลไกเฉพาะตัว: คอมโบพื้นฐาน 5 จังหวะ + ดาชพุ่งตี ──
 * ใช้ระบบ hitsLanded/finisherReady/finisherTimer ที่มีอยู่แล้วในเอนจิ้น (เดิมออกแบบไว้ให้ปุ่มสกิล
 * ใช้งาน แต่ตอนนี้ตัวละครอื่นเลิกผูกกับมันแล้ว — ดูคอมเมนต์ใน Player._startAttack) นำกลับมาใช้ใหม่:
 * ตีติดครบ 5 (static BASIC_COMBO 5 ท่า) ภายในเวลา -> finisherReady=true, timer 2000ms (FINISHER_WINDOW
 * override) -> กดตี (ปุ่มเดิม ไม่ใช่ปุ่มสกิล) ภายในเวลานั้น = ดาชพุ่งตี (_forcedAttackSpec/_forcedAttackAnim
 * ที่เพิ่มใน Player._registerCombatStates ให้เล่นท่า/ดาเมจนอกลำดับคอมโบปกติได้) ดาเมจแรงกว่า ~2.5 เท่า
 * knockback/hitstun นานกว่าปกติ ~40-90% (ตัวเลขเริ่มต้น ยังไม่ผ่านเทสเล่นจริง ปรับได้ที่ NYX_DASH_FINISHER)
 *
 * ปุ่ม W/A/S/D เหมือนตัวละครอื่นทุกตัว — ไม่มีท่าพิเศษผูกกับปุ่มทิศ (v35 เอาออกแล้วตามที่ขอ เดิม
 * เคยให้ถือ A/S ค้าง+กระโดด = jumpForward/jumpSpinBack และกด D = ท่าก้มหลบ) กระโดดใช้ animation
 * "jump" เดียว (ยืมท่า jumpForward มาเป็นท่ากระโดดปกติ) เดิน/กระโดดเหมือนตัวละครอื่นทุกจุด
 * เฟรม jumpSpinBack/dodge ที่ตัดมาแล้วยังอยู่ในอาร์ต แต่ไม่มี state ไหนเรียกใช้แล้ว (เผื่ออนาคตอยากเอากลับมาใช้)
 */

const seq = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}.png`);

export const B1989_ATLAS = {
  key: "b1989",
  texturePath: "assets/characters/b1989_atlas.png",
  dataPath: "assets/characters/b1989_atlas.json",
  // ผืนภาพ 342x335 ระดับเท้า y=307 ตัวยืนสูง 280
  // ตัวละครอื่นเก็บที่ 480x470 / ยืน 393 แต่ Nyx เก็บเล็กกว่า 0.7125 เท่า — ขนาดในเกมเท่ากันเป๊ะ
  // เพราะ applySpriteScale() ย่อ/ขยายจาก standingHeightInFrame ไปเป็น WORLD_HEIGHT อยู่แล้ว
  // เหตุผล: ที่จอ 720p ตัวละครถูกวาดจริงสูงสุดราว 204 px เก็บไว้ 393 จึงเกินจำเป็นเกือบ 2 เท่า
  // ลดลงแล้วได้พื้นที่ atlas คืนมาเกือบครึ่ง เอาไปใส่เฟรมเพิ่มให้ขยับลื่นขึ้นแทน (93 -> 165 เฟรม)
  // ตัวเลขทั้งสองต้องตรงกับ CANVAS/FEET_Y/STANDING ใน tools/build_b1989.py เสมอ
  standingHeightInFrame: 280,
  bottomMargin: 28, // 335 - 307
};

const FRAME = {
  idle: seq("idle", 21),
  run: seq("run", 20),
  jumpForward: seq("jumpForward", 10),
  jumpSpinBack: seq("jumpSpinBack", 12),
  dodge: seq("dodge", 8),
  block: seq("guard", 8), // ท่าตั้งการ์ด — ชื่อ anim ต้อง "block" (state ปุ่มกันของเอนจิ้นเรียกชื่อนี้ตรงๆ)
  hurt: seq("hurt", 10),
  climb: seq("climb", 18),
  attack1: seq("attack1", 8),
  attack2: seq("attack2", 8),
  attack3: seq("attack3", 8),
  attack4: seq("attack4", 8),
  attack5: seq("attack5", 8),
  dashFinisher: seq("dashFinisher", 18),
};

/**
 * ความยาวของแต่ละท่า (มิลลิวินาที) — ไม่ใช่ frameRate
 *
 * ตั้งเป็นเวลาแทน fps เพราะจำนวนเฟรมของ Nyx เปลี่ยนได้ตลอดเวลาที่ปรับความลื่น (ดู span() ใน
 * tools/build_b1989.py) ถ้าตั้งเป็น fps ตายตัว พอเพิ่มเฟรมท่าจะยืดช้าลงตามจำนวนเฟรมทันที
 * ทั้งที่ตั้งใจให้ "ลื่นขึ้น" ไม่ใช่ "ช้าลง" — ผูกกับเวลาแล้วเพิ่มเฟรมได้อิสระ จังหวะเกมไม่ขยับ
 *
 * ท่าโจมตีไม่ต้องอยู่ในนี้ เพราะดึงเวลาจาก startup+active+recovery ของสเปคท่านั้น ๆ อยู่แล้ว
 */
const DURATION_MS = {
  idle: 1125,
  run: 800, // = จังหวะก้าวจริงของคลิป (รอบก้าว 20 เฟรมที่ 24fps)
  jump: 500,
  jumpForward: 500,
  jumpSpinBack: 375,
  dodge: 600,
  block: 430,
  hurt: 600,
  climb: 900,
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
    /** เล่นชุดเฟรมนี้ให้จบพอดีใน ms ที่กำหนด — fps คิดจากจำนวนเฟรมให้อัตโนมัติ (ดู DURATION_MS) */
    const makeTimed = (name, frames, repeat = 0) =>
      make(name, frames, (frames.length / DURATION_MS[name]) * 1000, repeat);

    makeTimed("idle", FRAME.idle, -1);
    makeTimed("run", FRAME.run, -1);
    makeTimed("jump", FRAME.jumpForward); // กระโดดเฉย ๆ (ไม่ถือ A/S) ยืมท่า jumpForward ไปก่อน
    makeTimed("jumpForward", FRAME.jumpForward);
    makeTimed("jumpSpinBack", FRAME.jumpSpinBack);
    make("fall", [FRAME.jumpSpinBack[FRAME.jumpSpinBack.length - 1]], 1);
    make("land", [FRAME.dodge[0]], 1); // ลงพื้น = ย่อรับแรงกระแทกสั้น ๆ ยืมท่าก้มหลบเฟรมแรก
    makeTimed("dodge", FRAME.dodge, -1);
    makeTimed("block", FRAME.block);
    makeTimed("hurt", FRAME.hurt);
    makeTimed("climb", FRAME.climb, -1);

    make("attack_1", FRAME.attack1, (FRAME.attack1.length / (NYX_COMBO[0].startup + NYX_COMBO[0].active + NYX_COMBO[0].recovery)) * 1000);
    make("attack_2", FRAME.attack2, (FRAME.attack2.length / (NYX_COMBO[1].startup + NYX_COMBO[1].active + NYX_COMBO[1].recovery)) * 1000);
    make("attack_3", FRAME.attack3, (FRAME.attack3.length / (NYX_COMBO[2].startup + NYX_COMBO[2].active + NYX_COMBO[2].recovery)) * 1000);
    make("attack_4", FRAME.attack4, (FRAME.attack4.length / (NYX_COMBO[3].startup + NYX_COMBO[3].active + NYX_COMBO[3].recovery)) * 1000);
    make("attack_5", FRAME.attack5, (FRAME.attack5.length / (NYX_COMBO[4].startup + NYX_COMBO[4].active + NYX_COMBO[4].recovery)) * 1000);
    make("dash_finisher", FRAME.dashFinisher, (FRAME.dashFinisher.length / (NYX_DASH_FINISHER.startup + NYX_DASH_FINISHER.active + NYX_DASH_FINISHER.recovery)) * 1000);
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
