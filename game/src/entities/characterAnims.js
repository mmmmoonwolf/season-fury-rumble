import { BASIC_COMBO } from "../config/combat.config.js";

/**
 * ลงทะเบียน animation ให้ตัวละครหนึ่งตัว
 *
 * แยกออกมาจาก Dear.js เพราะตอนมีตัวละครหลายตัว โครง animation เหมือนกันหมด
 * (idle / run / jump / fall / land / attack 1-3 / finisher / hurt) ต่างกันแค่ atlas กับชื่อเฟรม
 * ตัวละครใหม่จึงเหลืองานแค่ "บอกว่าเฟรมชื่ออะไรอยู่ใน atlas ไหน" ไม่ต้องก๊อปโค้ด 100 บรรทัดมาแก้
 *
 * ⚠️ ทุก animation key มี prefix ของตัวละครนำหน้าเสมอ (เช่น "dear/idle", "bomb/idle")
 * เพราะ Phaser เก็บ animation ไว้ระดับ global — ถ้าไม่ prefix ตัวละครตัวที่สองจะทับของตัวแรก
 * Player.play() เติม prefix ให้อัตโนมัติ โค้ด state จึงยังเรียก play("idle") สั้น ๆ ได้เหมือนเดิม
 */
export function registerCharacterAnimations(scene, { prefix, atlasKey: key, frames: FRAME, timing = {} }) {
  if (scene.anims.exists(`${prefix}idle`)) return; // กันลงทะเบียนซ้ำตอน scene.restart()

  const runFps = timing.runFps ?? 10;
  const a = (name) => `${prefix}${name}`;

  /**
   * ทุกช่องรับได้ทั้งชื่อเฟรมเดียวและอาเรย์ — ตัวละครที่วาดมาหลายเฟรมใส่ได้เลยโดยไม่ต้องแก้โค้ด
   * สมาชิกในอาเรย์เป็นได้ทั้ง "ชื่อเฟรม" และ { frame, hold } เมื่ออยากค้างบางเฟรมนานกว่าเพื่อน
   * (ใช้กับตัวละครที่จังหวะไม่สม่ำเสมอ เช่นท่ายืนกวน ๆ ที่หยุดค้างเป็นจังหวะ)
   */
  const list = (v) => (Array.isArray(v) ? v : [v]);
  const toFrame = (f) =>
    typeof f === "string" ? { key, frame: f } : { key, frame: f.frame, duration: f.hold ?? 0 };
  const anim = (name, frames, { fps = 12, repeat = 0, totalMs = null } = {}) => {
    const arr = list(frames);
    // ถ้ากำหนดเวลารวมมา (ท่าโจมตี) ให้กระจายเฟรมให้พอดีช่วงนั้น ภาพจะจบพร้อม hitbox เสมอ
    const frameRate = totalMs ? (arr.length / totalMs) * 1000 : fps;
    scene.anims.create({
      key: a(name),
      frames: arr.map(toFrame),
      frameRate,
      repeat,
    });
  };
  const still = (name, frames) => anim(name, frames, { fps: 1, repeat: 0 });

  // idle รับหลายเฟรมได้ (ตัวละครสายไฟเตอร์ตั้งการ์ดเขย่งไปมา) — เฟรมเดียวก็ยังใช้ได้เหมือนเดิม
  anim("idle", FRAME.idle, { fps: timing.idleFps ?? 8, repeat: -1 });
  anim("run", FRAME.run, { fps: runFps, repeat: -1 });
  anim("jump", FRAME.jump, { fps: timing.jumpFps ?? 12 });
  anim("fall", FRAME.fall, { fps: timing.jumpFps ?? 12 });
  still("land", FRAME.land ?? FRAME.idle); // ไม่มีท่า land ก็ใช้ idle แทนได้ ผู้เล่นแทบไม่ทัน
  still("hurt", FRAME.hurt);
  // ท่ายั่ว — มีเฉพาะตัวละครที่วาดเฟรมนี้มา ตัวที่ไม่มีจะไม่ลงทะเบียน (Player เช็คก่อนเรียก)
  if (FRAME.taunt) still("taunt", FRAME.taunt);
  // ท่ากัน — เล่นครั้งเดียวแล้วค้างเฟรมสุดท้ายไว้ตลอดที่กดค้าง (repeat 0)
  if (FRAME.block) anim("block", FRAME.block, { fps: timing.blockFps ?? 14, repeat: 0 });

  // ---------- ท่าต่อสู้ ----------
  // ท่าโจมตีที่มีหลายเฟรม: กระจายให้จบพอดีกับเวลาของหมัดนั้นใน combat.config
  // (startup + active + recovery) ภาพจึงตรงกับ hitbox เสมอ ไม่ว่าจะวาดมากี่เฟรม
  // timing.attackTimeMul: ตัว/ร่างที่ตีช้ากว่าค่ากลาง (เช่น ไททัน 1.25) — ท่าต้องยาวตามจังหวะหมัดจริง
  const comboMs = (i) => {
    const spec = BASIC_COMBO[i];
    if (!spec) return null;
    const mul = timing.attackTimeMul ?? 1;
    return (spec.startup + spec.recovery) * mul + spec.active;
  };
  const attackAnim = (name, frames, index) => {
    const arr = list(frames);
    if (arr.length > 1) anim(name, arr, { totalMs: comboMs(index) });
    else still(name, arr);
  };

  attackAnim("attack_1", FRAME.attack1, 0);

  // ตบซ้าย — 2 เฟรม: บิดตัว → ตบเต็ม
  // เฟรมบิดตัวโชว์ ~60ms ให้ตรงช่วง startup (เงื้อมือ) ใน combat.config
  // duration ต่อเฟรมของ Phaser = เวลา "เพิ่ม" จากฐาน frameRate ไม่ใช่เวลารวมของเฟรมนั้น
  if (list(FRAME.attack2).length > 1) {
    attackAnim("attack_2", FRAME.attack2, 1);
  } else {
    scene.anims.create({
      key: a("attack_2"),
      frames: FRAME.attack2Transition
        ? [{ key, frame: FRAME.attack2Transition }, { key, frame: FRAME.attack2, duration: 165 }]
        : [{ key, frame: FRAME.attack2 }],
      frameRate: 16.7,
      repeat: 0,
    });
  }

  attackAnim("attack_3", FRAME.attack3, 2);

  // ไม้ตาย — วนเฟรมที่มีอยู่แล้วสลับกัน ไม่ต้องวาดท่าใหม่
  // 55ms ต่อเฟรม = จังหวะเดียวกับ FINISHER.hitInterval ภาพจึงขยับพร้อมหมัดที่ออกจริง
  const finisherFrames = FRAME.finisherLoop ?? [
    ...list(FRAME.attack2Transition ?? FRAME.attack2),
    ...list(FRAME.attack1),
    ...list(FRAME.attack3),
  ];
  // ท่าเพิ่มเติมเฉพาะตัว (เช่น ท่าแปลงร่าง / สกิล) — { ชื่อ: { frames, fps, repeat, atlas } }
  // atlas = เฟรมอยู่คนละไฟล์กับ atlas หลัก (ท่าที่มีควัน/เอฟเฟกต์ใหญ่ แยกไฟล์ไว้ไม่ให้ texture สูงเกินลิมิต)
  // frames ใส่ { frame, atlas } รายเฟรมได้ เมื่อท่าเดียวกระจายหลายไฟล์
  // ⚠️ ทุก atlas ต้องใช้ผืนภาพขนาดเดียวกับ atlas หลัก ไม่งั้นตัวกระโดดตอนเปลี่ยนเฟรม
  for (const [name, def] of Object.entries(FRAME.extra ?? {})) {
    scene.anims.create({
      key: a(name),
      frames: list(def.frames).map((f) =>
        typeof f === "string" ? { key: def.atlas ?? key, frame: f } : { key: f.atlas ?? def.atlas ?? key, frame: f.frame }
      ),
      frameRate: def.fps ?? 12,
      repeat: def.repeat ?? 0,
    });
  }

  scene.anims.create({
    key: a("finisher"),
    frames: finisherFrames.map(toFrame),
    frameRate: timing.finisherFps ?? 18,
    repeat: -1, // วนจนกว่า state จะเปลี่ยน (Player คุมเวลาจบเอง)
  });
}
