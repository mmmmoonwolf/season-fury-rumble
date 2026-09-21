/**
 * Sakura Heights — แมพโหมด Platform (ไอเดียต้นฉบับ: "Map ใหม่ตัวละครสูงไปจนชน platform สูง...")
 * ธีมศาลาญี่ปุ่น/ซากุระ ให้เข้ากับภาพอ้างอิงที่ผู้ใช้ส่งมา (ศาลาไม้กลางแจ้ง มีบันไดขึ้นศาลา)
 *
 * blockout ก่อน — ยังไม่มีอาร์ตจริง (ภาพอ้างอิงที่ส่งมาความละเอียดแค่ 512x220 เล็กเกินจะใช้เป็น
 * background จริง กำลังรอเวอร์ชันความละเอียดสูงกว่า — ดู prompt ที่ให้ไปเจนใหม่ที่ 2200x950)
 * เลขทุกตัวด้านล่าง "ล็อกไว้แล้ว" ตรงกับ diagram/prompt ที่ส่งให้ผู้ใช้ก่อนหน้านี้ (2200x950,
 * top/mid/bot ที่ 27%/56%/83% ของความสูง) พอมีภาพจริงมาแค่เปลี่ยน useSolidBackground -> backgroundImage
 * แล้ววัด y ใหม่จากภาพ (แบบเดียวกับ neon-underline-bangkok.js v1 -> v2) ไม่ต้องแก้โครงสร้างอื่น
 *
 * ออกแบบ "fall-free" ตามไอเดียผู้ใช้เป๊ะ: ไม่มี pit/ช่องว่างให้ตกเลย — ตายทางเดียวคือ HP หมด
 * ชั้นล่าง+กลาง เต็มความกว้างจอทั้งคู่ (เดินสุดขอบไม่มีตก) ชั้นบนลอยกลางจอ แต่ซ้าย-ขวาเปิดโล่ง
 * (ยืนขอบแล้วมองเห็นชั้นกลางด้านล่างตรงๆ — หล่นกลับไปชั้นกลางได้เฉย ๆ ไม่ใช่ตกหลุม)
 * ขึ้น-ลงทุกชั้นด้วยบันไดเท่านั้น (climb zone) ไม่ใช่กระโดดลัด — ล่าง<->กลาง 2 บันไดริมซ้าย-ขวา
 * กลาง<->บน 1 บันไดกลางจอ
 */
const WORLD_W = 2200;
const WORLD_H = 950;
const T = 24; // ความหนาพื้นเดินได้

const Y = { top: 260, mid: 530, bot: 790 };
const TOP_W = 700;
const TOP_X = (WORLD_W - TOP_W) / 2; // 750 — ศาลาลอยกลางจอ

/** เสาทึบใต้พื้นแต่ละชั้น (ภาพประกอบ blockout เท่านั้น ไม่มี collision) */
const FILL = { top: Y.mid - Y.top, mid: Y.bot - Y.mid, bot: WORLD_H - Y.bot };

export const SAKURA_HEIGHTS = {
  id: "sakura-heights",
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,

  // blockout — ยังไม่มีอาร์ตจริง (รอภาพความละเอียดสูงจากผู้ใช้) วาดท้องฟ้าสีซากุระอ่อนแทน
  useSolidBackground: true,
  skyTopColor: 0xfbe4ec,
  characterTint: 0xfff5f7, // โทนสว่างนวล กลางวัน (ต่างจากแมพกลางคืนอื่น ๆ)

  platforms: [
    // ชั้นล่าง (ground) เต็มความกว้าง — platforms[0] ใช้เป็น groundY อ้างอิงของเงา/บอส
    { x: 0, width: WORLD_W, y: Y.bot, height: T, kind: "low", color: 0x92400e, fillDepth: FILL.bot },
    // ชั้นกลาง เต็มความกว้าง
    { x: 0, width: WORLD_W, y: Y.mid, height: T, kind: "arena", color: 0xb45309, fillDepth: FILL.mid },
    // ชั้นบน ลอยกลางจอเท่านั้น (ซ้าย-ขวาโล่ง มองเห็นชั้นกลางด้านล่างตรง ๆ ไม่ใช่หลุมตก)
    { x: TOP_X, width: TOP_W, y: Y.top, height: T, kind: "high", color: 0xd97706, fillDepth: FILL.top },
  ],

  // บันไดปีน — ล่าง<->กลาง ริมซ้าย/ขวา, กลาง<->บน กลางจอ (ตรงกับ diagram ที่ให้ผู้ใช้ไปแล้ว)
  ladders: [
    { x: 140, width: 70, topY: Y.mid, bottomY: Y.bot }, // L1 ล่างซ้าย <-> กลางซ้าย
    { x: WORLD_W - 140, width: 70, topY: Y.mid, bottomY: Y.bot }, // L2 ล่างขวา <-> กลางขวา
    { x: WORLD_W / 2, width: 70, topY: Y.top, bottomY: Y.mid }, // L3 กลางกลาง <-> บนกลาง
  ],

  // ไม่มีเหว/ช่องตกเลยตามไอเดียต้นฉบับ ("ไม่มีจุดตก fall อีกต่อไป")
  pits: [],

  // [0]=P1 เริ่ม, [3]=P2 เริ่ม (MainGameScene._spawnPlayer ฮาร์ดโค้ด index นี้)
  spawnPoints: [
    { x: 300, floorY: Y.bot }, // [0] P1 — ล่างซ้าย
    { x: 300, floorY: Y.mid }, // [1] กลางซ้าย
    { x: 1000, floorY: Y.top }, // [2] บน (ฝั่งซ้ายของศาลา)
    { x: WORLD_W - 300, floorY: Y.bot }, // [3] P2 — ล่างขวา
    { x: WORLD_W - 300, floorY: Y.mid }, // [4] กลางขวา
    { x: 1200, floorY: Y.top }, // [5] บน (ฝั่งขวาของศาลา)
  ],

  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  backgrounds: {}, // ไม่ใช้ (useSolidBackground) — สีเดียวทุกฤดู
};
