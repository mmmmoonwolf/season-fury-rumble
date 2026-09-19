/**
 * Neon Underline Bangkok — แมพ 3 ชั้น (สูง/กลาง/ล่าง) ซ้าย-ขวาสมมาตร มีเหวกลาง
 * มาจาก mockup ที่ผู้ใช้ทำไว้ (MAP 01) — ยังไม่มีอาร์ตจริง ใช้กล่องสีแทนไปก่อน (blockout)
 * ดูต้นแบบวิธีทำ blockout ที่ src/levels/unused/blockout-arena.js
 *
 * โครงสร้าง (x กว้าง 2200, y ลึก 760):
 *   สูง (high)   ซ้าย [60-520] y=400 ────────────── ขวา [1680-2140] y=400
 *   กลาง (main)  ซ้าย [0-990]   y=530 ── เหว [990-1210] ──  ขวา [1210-2200] y=530
 *   ล่าง (low)   ซ้าย [0-990]   y=660 ────────────── ขวา [1210-2200] y=660
 *
 * ต่างระดับต่อชั้น = 130px (เกณฑ์กระโดดเดียวสบาย ≤120 ของ blockout-arena — ขึ้น-ลงผ่าน "บันได" ปีน
 * ไม่ใช่กระโดดทะลุพื้น เพราะ platform ทุกก้อนยังทึบทุกด้านเหมือนเดิม ไม่ใช่ one-way)
 *
 * worldHeight 760 ใกล้เคียงแมพเดิม (700-793) — กล้องซูม = 720/760 ≈ 0.95 ตัวละครแทบไม่เล็กลง
 * (ดู _setupCamera: กล้องโชว์ความสูง world ทั้งหมดเสมอ ไม่มี scroll แนวตั้ง)
 */
const WORLD_W = 2200;
const WORLD_H = 760;
const T = 24; // ความหนาพื้นเดินได้ (roof thickness)

const Y = { high: 400, main: 530, low: 660 };

/** เสาทึบใต้พื้นแต่ละชั้น ลงไปจนถึงชั้นถัดไป (หรือถึงพื้น world สำหรับชั้นล่างสุด) — แค่ภาพ ไม่มี collision */
const FILL = { high: Y.main - Y.high, main: Y.low - Y.main, low: WORLD_H - Y.low };

// สีตามผังต้นฉบับ: กลาง=ชมพู, สูง=ม่วง(ซ้าย)/ฟ้า(ขวา), ล่าง=เขียว(ซ้าย)/เหลือง(ขวา)
const COLOR = { main: 0xdb2777, highL: 0x8b5cf6, highR: 0x3b82f6, lowL: 0x16a34a, lowR: 0xca8a04 };

export const NEON_UNDERLINE_BANGKOK = {
  id: "neon-underline-bangkok",
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,

  // ยังไม่มีอาร์ตพื้นหลัง — วาดท้องฟ้าสีเรียบแทน (ดู MainGameScene._buildBackground)
  useSolidBackground: true,
  skyTopColor: 0x0b1220,
  characterTint: 0xb8c6f0, // กลางคืนนีออน: กดสว่างลง อมฟ้า

  platforms: [
    // กลาง (main arena) — พื้นต่อสู้หลัก มาก่อนในลิสต์ตั้งใจ (platforms[0] ใช้เป็น groundY อ้างอิงของ shadow/boss)
    { x: 0, width: 990, y: Y.main, height: T, kind: "arena", color: COLOR.main, fillDepth: FILL.main },
    { x: 1210, width: 990, y: Y.main, height: T, kind: "arena", color: COLOR.main, fillDepth: FILL.main },
    // สูง (high platform)
    { x: 60, width: 460, y: Y.high, height: T, kind: "high", color: COLOR.highL, fillDepth: FILL.high },
    { x: 1680, width: 460, y: Y.high, height: T, kind: "high", color: COLOR.highR, fillDepth: FILL.high },
    // ล่าง (lower level)
    { x: 0, width: 990, y: Y.low, height: T, kind: "low", color: COLOR.lowL, fillDepth: FILL.low },
    { x: 1210, width: 990, y: Y.low, height: T, kind: "low", color: COLOR.lowR, fillDepth: FILL.low },
  ],

  // บันไดปีน (climb zone) เชื่อมแต่ละชั้น — width = ระยะห่างแนวนอนที่ยังจับบันไดติด
  ladders: [
    { x: 290, width: 70, topY: Y.high, bottomY: Y.main }, // สูงซ้าย <-> กลางซ้าย
    { x: 1910, width: 70, topY: Y.high, bottomY: Y.main }, // สูงขวา <-> กลางขวา
    { x: 745, width: 70, topY: Y.main, bottomY: Y.low }, // กลางซ้าย <-> ล่างซ้าย
    { x: 1455, width: 70, topY: Y.main, bottomY: Y.low }, // กลางขวา <-> ล่างขวา
  ],

  // เหวกลาง — ตกแล้วเสีย HP (damagePercent × MAX_HP) + เด้งกลับขึ้นตรงจุดที่ตก (ดู MainGameScene._checkPitHazard)
  pits: [{ x: 990, width: 220, y: Y.main, damagePercent: 0.2 }],

  // [0]=P1 เริ่ม, [3]=P2 เริ่ม (MainGameScene._spawnPlayer ฮาร์ดโค้ด index นี้) — floorY ระบุตรงเพราะ
  // x เดียวกันมีได้หลายชั้น (สูง/กลาง/ล่าง ซ้อนคอลัมน์เดียวกัน) เดาจาก platform ใต้ x อย่างเดียวแยกไม่ออก
  spawnPoints: [
    { x: 150, floorY: Y.main }, // [0] P1 — กลางซ้าย ริมซ้าย (สปอว์น A)
    { x: 290, floorY: Y.high }, // [1] สูงซ้าย
    { x: 745, floorY: Y.low }, // [2] ล่างซ้าย
    { x: 2050, floorY: Y.main }, // [3] P2 — กลางขวา ริมขวา (สปอว์น B)
    { x: 1910, floorY: Y.high }, // [4] สูงขวา
    { x: 1455, floorY: Y.low }, // [5] ล่างขวา
  ],

  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  backgrounds: {}, // ไม่มีภาพ — useSolidBackground
};
