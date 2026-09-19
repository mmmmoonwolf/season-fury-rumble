import { Player } from "./Player.js";
import { registerCharacterAnimations } from "./characterAnims.js";

/**
 * March V.2 — ตัวละครคนละตัวกับ March เดิม (ไม่ใช่การอัปเกรด อยู่ในโรสเตอร์พร้อมกันได้)
 * ลุค: หนุ่มกล้ามผมดำ แว่นกรอบบาง เสื้อยืดดำ กางเกงเทาหลวม ผ้าคาดเอวดำ
 *
 * ✅ อาร์ต 89 เฟรม = เยอะที่สุดในเกม ตัดจาก 5 คลิปแยกท่า:
 *    7C49CEEE (217f)    -> idle ตั้งการ์ด
 *    1037ED94_2_ (65f)  -> วิ่ง (ขาสลับซ้าย-ขวาจริง)
 *    1037ED94 (64f)     -> กระโดด/ตก/ลงพื้น
 *    7C49CEEE_1_ (134f) -> หมัด 1/2/3 + ช่วงรัวหมัด
 *    1037ED94_1_ (85f)  -> โดนตี + ท่ากัน
 *
 * ── จุดเด่น: ไม้ตายรัวหมัด 21 เฟรม ──
 * ช่วง f93-f133 ของคลิปหมัดมี "เส้นแรงกระแทก" วาดมาให้ในภาพอยู่แล้ว
 * เอามาวนเป็นไม้ตายได้เลยโดยไม่ต้องวาดเพิ่ม (เทคนิคเดียวกับไม้ตายหมุนตบของ Dear)
 *
 * ── ตัวที่ 2 ที่มีท่า block ──
 * ท่ากอดอกจากคลิปโดนตี ผูกกับปุ่มกัน (P1 = B, P2 = N) กดค้างไว้ถึงจะกัน
 */
export const MARCHV2_ATLAS = {
  key: "marchv2",
  texturePath: "assets/characters/marchv2_atlas.png",
  dataPath: "assets/characters/marchv2_atlas.json",
  // ผืนภาพ 480x470 ระดับเท้า y=431 ตัวยืนสูง 393 (ธรรมเนียมเดียวกับตัวละครอื่น)
  standingHeightInFrame: 393,
  bottomMargin: 39, // 470 - 431
};

const seq = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}.png`);

const FRAME = {
  // ยืนตั้งการ์ด 9 เฟรมจากคลิปจริง -> ปิด IDLE_BOB ได้
  idle: seq("idle", 9),
  // วิ่ง 10 เฟรม = "รอบก้าวจริง" อย่างเดียว (f10-f29 ของคลิป)
  // ตัดช่วงออกตัวจากยืน (f1-f9) ทิ้ง เพราะเอามาลูปแล้วดูหนืดเหมือนวิ่งไม่ออก
  run: seq("run", 10),
  jump: seq("jump", 5),   // f5-f13 ช่วงลอยขึ้นจริง (bottom 681 -> 486)
  fall: seq("fall", 4),
  land: seq("land", 3),
  attack1: seq("hit1", 7),
  attack2: seq("hit2", 7),
  attack3: seq("hit3", 7),
  // ไม้ตาย: รัวหมัด 21 เฟรม (เฟรมมีเส้นแรงกระแทกมาในภาพแล้ว)
  finisherLoop: seq("rush", 21),
  hurt: seq("hurt", 8),
  block: seq("block", 8),
  // ยังไม่มีท่ายั่วในคลิป — ไม่ใส่ key taunt ระบบจะข้ามให้เอง
};

export class MarchV2 extends Player {
  static DISPLAY_NAME = "March V2";
  static ANIM_PREFIX = "marchv2/";

  static WORLD_HEIGHT = 195;

  /** มีอาร์ต idle 9 เฟรมจริงแล้ว ปิดการเขย่งด้วยโค้ด */
  static IDLE_BOB_PX = 0;

  constructor(scene, x, y, playerIndex = 0, targetWorldHeight = MarchV2.WORLD_HEIGHT) {
    super(scene, x, y, MARCHV2_ATLAS.key, playerIndex, MarchV2.ANIM_PREFIX);
    this.setFrame(Array.isArray(FRAME.idle) ? FRAME.idle[0] : FRAME.idle);
    this.applySpriteScale(MARCHV2_ATLAS.standingHeightInFrame, targetWorldHeight, MARCHV2_ATLAS.bottomMargin);
    this.stateMachine.setState("idle", true);
  }

  static preload(scene) {
    scene.load.atlas(MARCHV2_ATLAS.key, MARCHV2_ATLAS.texturePath, MARCHV2_ATLAS.dataPath);
  }

  static registerAnimations(scene) {
    registerCharacterAnimations(scene, {
      prefix: MarchV2.ANIM_PREFIX,
      atlasKey: MARCHV2_ATLAS.key,
      frames: FRAME,
      // เฟรมเยอะกว่าตัวอื่นมาก จึงเล่นไวขึ้นเพื่อให้จบท่าในเวลาเท่าเดิม
      // finisherFps สูงเป็นพิเศษ เพราะ 21 เฟรมต้องวนให้ทันจังหวะหมัดที่ออกจริง
      timing: { idleFps: 9, runFps: 14, jumpFps: 14, finisherFps: 26, blockFps: 16 },
    });
  }
}
