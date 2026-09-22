/**
 * ค่าคงที่ physics/movement ทั้งหมด — ปรับบาลานซ์ที่นี่ที่เดียว
 * หน่วยอิงตาม Phaser Arcade Physics (pixels/sec, pixels/sec^2)
 */
/**
 * SCALE — วัดจาก background art จริง (rooftop scene, 1376x768px):
 * ขอบบนรั้ว (chain-link fence) ถึงพื้น = ~170px ในภาพขนาดนั้น
 * ต้องการให้หัวตัวละครสูงพอดีขอบรั้ว → ตัวละครสูง ~170px ที่ scale เดียวกับ background
 *
 * ถ้า background ถูก scale ลงมาแสดงในเกม (เช่นจาก 1376px กว้าง → 900px viewport)
 * ให้คูณ FENCE_HEIGHT_PX ด้วย (viewportWidth / 1376) ก่อนใช้เป็น CHAR_HEIGHT จริง
 */
export const SCALE_REFERENCE = {
  BG_ART_WIDTH: 1376,
  BG_ART_HEIGHT: 768,
  FENCE_HEIGHT_PX: 170, // ที่ scale ของภาพต้นฉบับ — ใช้เป็นเป้าหมายความสูงตัวละคร
};

export const BASE_PHYSICS = {
  GRAVITY_Y: 1400,

  // ความเร็วแนวนอน
  RUN_SPEED: 260,
  WALK_SPEED: 120, // เดิน = ใช้ animation วิ่งตัวเดียวกัน แค่สปีดช้าลง (ดู Player.js)

  // ความเร็ว animation ของท่าวิ่ง 4 เฟรม (fps)
  // ตอนเดินใช้ animation เดียวกันแต่เล่นช้าลง ให้ดูเป็นก้าวเดินแทนการวิ่ง
  RUN_ANIM_FPS: 10,
  WALK_ANIM_FPS: 4,

  // กระโดด
  JUMP_VELOCITY: -620,
  DOUBLE_JUMP_VELOCITY: -560, // จั๊มพ์ที่ 2 แผ่วกว่านิดหน่อยให้รู้สึกเป็นธรรมชาติ
  MAX_JUMPS: 2, // jump + double jump

  // การควบคุมกลางอากาศ (คุมทิศทางได้ไม่เต็มร้อยเหมือนติดพื้น)
  AIR_CONTROL_FACTOR: 0.7,

  // แรงเสียดทานตอนอยู่บนพื้น ปล่อยปุ่มแล้วไม่หยุดกึก
  GROUND_DRAG: 1200,

  // ความเร็วแนวตกที่เริ่มนับว่าเป็น state "fall" (แยกจาก jump ขาขึ้น)
  FALL_VELOCITY_THRESHOLD: 40,

};

/**
 * PHYSICS คือค่าที่ "ใช้งานจริง" ตอนรันเกม — Player.js อ่านจาก object นี้ทุก frame
 * เริ่มต้นเป็นสำเนาของ BASE_PHYSICS แล้วถูกปรับด้วย applySeasonModifiers() ตอนโหลดฤดู
 * ห้ามแก้ BASE_PHYSICS ตรงๆ ที่อื่น — แก้ที่นี่ที่เดียวถ้าจะปรับบาลานซ์พื้นฐาน
 */
export const PHYSICS = { ...BASE_PHYSICS };

/**
 * SEASON MODIFIERS — แนวทาง A: ปรับ physics เดียวกันทุกตัวละคร ไม่ผูกกับตัวละครเฉพาะ
 * ทุกค่าเป็น "ตัวคูณ" (multiplier) เทียบกับ BASE_PHYSICS ไม่ใช่ค่าตรงๆ
 * ฤดู/ค่าที่ไม่ระบุ = ไม่ปรับ (multiplier 1.0)
 */
export const SEASON_MODIFIERS = {
  spring: {}, // baseline — ไม่ปรับอะไรเลย
  summer: {
    AIR_CONTROL_FACTOR: 1.1, // อากาศเบา คุมทิศทางกลางอากาศง่ายขึ้นนิดหน่อย
  },
  autumn: {
    GROUND_DRAG: 0.8, // ใบไม้ลื่น หยุดกะทันหันไม่ได้
  },
  winter: {
    GROUND_DRAG: 0.5, // พื้นน้ำแข็งลื่นกว่าใบไม้ร่วง
    JUMP_VELOCITY: 0.95, // กระโดดหนักขึ้นเล็กน้อย (เสื้อผ้าหนา/พื้นเกาะยาก)
  },
  rain: {
    AIR_CONTROL_FACTOR: 0.85, // ลม/ฝนรบกวนการคุมทิศทางกลางอากาศ
  },
};

/**
 * รีเซ็ต PHYSICS กลับไปที่ BASE_PHYSICS แล้วคูณด้วย modifier ของฤดูที่เลือก
 * และตัวคูณของ "โหมดเกม" (modeModifiers — มาจาก GAME_MODES[x].physics ใน mode.config.js เช่น
 * โหมด platform ลดสปีดวิ่ง/ระยะดับเบิ้ลจั๊มพ์) — สองชุดคูณร่วมกันอิสระต่อกัน ไม่ต้องรู้จักกัน
 * เรียกตอนโหลด scene หรือตอนสลับฤดู — Player.js ไม่ต้องรู้เรื่องฤดู/โหมดเลย
 * เพราะมันอ่านค่าจาก PHYSICS object เดิมเสมอ
 */
export function applySeasonModifiers(seasonKey, modeModifiers = {}) {
  const modifiers = SEASON_MODIFIERS[seasonKey] ?? {};
  for (const key of Object.keys(BASE_PHYSICS)) {
    const seasonMul = modifiers[key] ?? 1;
    const modeMul = modeModifiers[key] ?? 1;
    PHYSICS[key] = BASE_PHYSICS[key] * seasonMul * modeMul;
  }
  return PHYSICS;
}

/**
 * WORLD — ขนาดโลกจริงของแมพ แยกอิสระจาก viewport (900x600 ใน index.html)
 * ทำให้กว้างกว่าจอเพื่อรองรับผู้เล่น 4-5 คน + กล้อง dynamic zoom
 * ตัวเลขช่องว่างระหว่างตึกตั้งใจให้ต้องกระโดดจริง (ไม่ใช่แค่เดินข้าม)
 * ดูรายละเอียดที่มาของค่าใน /levels/rooftop-arena.js
 */
export const WORLD = {
  WIDTH: 2000,
  HEIGHT: 700,
};
