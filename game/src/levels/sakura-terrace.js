/**
 * Sakura Terrace — แมพสั้นสำหรับเทสระบบต่อสู้
 *
 * ต่างจาก rooftop-arena ตรงที่พื้นเป็นแผ่นเดียวเรียบยาว ไม่มีช่องว่างให้ตก
 * ตั้งใจให้ตายได้ทางเดียวคือ HP หมด — จะได้เทสคอมโบ/knockback ได้โดยไม่มีการตกแมพมารบกวน
 *
 * ภาพต้นฉบับ: sakura_terrace.jpg ขนาด 512x286
 *   พื้นคอนกรีตกินพื้นที่ y = 232 (ฐานรั้ว) ถึง 286 (ขอบล่างภาพ)
 *   วางเส้นยืนไว้ที่ y = 259 = กึ่งกลางพื้นคอนกรีตพอดี เหลือคอนกรีตหน้าเท้าอีกราว 27px
 *   (ถ้าวางชิดฐานรั้ว ตัวละครจะดูเหมือนยืนติดรั้ว ไม่ใช่ยืนกลางระเบียง)
 */

const ART_W = 512;
const ART_H = 286;
const ART_FLOOR_Y = 259; // เส้นยืนในพิกัดของภาพต้นฉบับ = กึ่งกลางพื้นคอนกรีต

const WORLD_W = 1250; // แมพสั้น — กว้างประมาณ 60% ของ rooftop เดิม
const SCALE = WORLD_W / ART_W;
const WORLD_H = Math.round(ART_H * SCALE); // ~698

const FLOOR_Y = Math.round(ART_FLOOR_Y * SCALE); // ~566

/** ขนาด/จุดอ้างอิงของภาพ ใช้ให้ scene วางภาพให้ตรงกับ collision */
export const SAKURA_ART_REFERENCE = {
  width: ART_W,
  height: ART_H,
  roofY: ART_FLOOR_Y,
};

export const SAKURA_TERRACE = {
  id: "sakura-terrace",
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,

  artReference: SAKURA_ART_REFERENCE,

  platforms: [
    // พื้นแผ่นเดียวเต็มความกว้าง — ความหนาลากลงถึงขอบล่างของ world
    { x: 0, width: WORLD_W, y: FLOOR_Y, height: WORLD_H - FLOOR_Y, kind: "ground" },
  ],

  /** ไม่มีช่องว่าง = ไม่มี fall hazard (ตั้งใจ ดูหัวไฟล์) */
  gaps: [],

  spawnPoints: [
    { x: WORLD_W * 0.2, y: FLOOR_Y - 40 },
    { x: WORLD_W * 0.8, y: FLOOR_Y - 40 },
    { x: WORLD_W * 0.35, y: FLOOR_Y - 40 },
    { x: WORLD_W * 0.65, y: FLOOR_Y - 40 },
  ],

  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  // ภาพเดียวใช้ทุกฤดู — ยังสลับ particle/physics ตามฤดูได้ตามปกติ
  backgrounds: {
    spring: "sakura_terrace",
    summer: "sakura_terrace",
    autumn: "sakura_terrace",
    winter: "sakura_terrace",
    rain: "sakura_terrace",
  },
};
