/**
 * Neon Underline Bangkok — แมพ 3 ชั้น (สูง/กลาง/ล่าง) ซ้าย-ขวาสมมาตร มีเหวกลาง
 * v2: มีอาร์ตจริงแล้ว (ผู้ใช้เจนภาพ) — ขนาดต้นฉบับ 1168x784 ใช้ตรงๆ 1:1 ไม่สเกล
 * (v1 เป็น blockout กล่องสี worldWidth 2200x760 — เลขทั้งหมดด้านล่างวัดใหม่จากภาพจริง)
 *
 * floorY/ตำแหน่งวัดด้วยตา + เช็คแถวพิกเซล (หาขอบเรืองแดงของเหว, ดูจุดที่วัตถุ/คนในภาพแตะพื้น)
 * ยังไม่ได้ยืนตัวละครจริงในเกมเทียบ — ถ้าเล่นแล้วลอย/จมให้ขยับทีละ 10-20 เหมือนแมพอื่น
 *
 * โครงสร้าง (x กว้าง 1168, y ลึก 784):
 *   สูง (high)   ซ้าย [0-430]   y=295 ──────────────  ขวา [740-1168] y=295
 *   กลาง (main)  ซ้าย [0-550]   y=425 ── เหว [550-740] (ขอบแดงเรืองแสง) ──  ขวา [740-1168] y=425
 *   ล่าง (low)   ซ้าย [0-550]   y=660 ──────────────  ขวา [740-1168] y=660
 *
 * บันไดในภาพจริง: ขอบนอกซ้าย/ขวา (fire escape) = สูง<->กลาง · ข้างเหวทั้งสองฝั่ง = กลาง<->ล่าง
 * ต่างระดับ สูง->กลาง 130px (กระโดดเดียวไหว) · กลาง->ล่าง 235px (เกินระยะกระโดดคู่ 249 นิดเดียว —
 * ตั้งใจให้ต้องปีนบันไดจริง ไม่ใช่กระโดดลัด เพราะดีไซน์นี้ขึ้น-ลงผ่านบันไดเท่านั้น ไม่ใช่ one-way platform)
 *
 * worldHeight 784 ใกล้ 720 มาก — กล้องซูม = 720/784 ≈ 0.92 ตัวละครแทบไม่เล็กลง
 * (ดู _setupCamera: กล้องโชว์ความสูง world ทั้งหมดเสมอ ไม่มี scroll แนวตั้ง)
 */
const WORLD_W = 1168;
const WORLD_H = 784;
const T = 24; // ความหนาพื้นเดินได้ (roof thickness)

const Y = { high: 295, main: 425, low: 660 };

/** เสาทึบใต้พื้นแต่ละชั้น ลงไปจนถึงชั้นถัดไป (หรือถึงพื้น world สำหรับชั้นล่างสุด) — แค่ภาพประกอบ ไม่มี collision */
const FILL = { high: Y.main - Y.high, main: Y.low - Y.main, low: WORLD_H - Y.low };

export const NEON_UNDERLINE_BANGKOK = {
  id: "neon-underline-bangkok",
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,

  // มีอาร์ตจริงแล้ว — วางเต็มภาพที่ (0,0) ตรงๆ ไม่ต้องสเกล/เลื่อน (world = ขนาดภาพเป๊ะ)
  backgroundImage: "neon_underline_bangkok",
  backgroundExt: "jpg",
  characterTint: 0x625a85, // กลางคืนนีออนเข้มมาก (โทนมืดกว่า city_night) กดสว่างลงแรง อมม่วง-น้ำเงิน

  // แผ่นพื้นเดินได้ — ไม่มีสีทับแล้ว (ใช้ของจริงจากภาพ) platforms[0] ใช้เป็น groundY อ้างอิงของ shadow/boss
  platforms: [
    { x: 0, width: 550, y: Y.main, height: T, kind: "arena", fillDepth: FILL.main },
    { x: 740, width: 428, y: Y.main, height: T, kind: "arena", fillDepth: FILL.main },
    { x: 0, width: 430, y: Y.high, height: T, kind: "high", fillDepth: FILL.high },
    { x: 740, width: 428, y: Y.high, height: T, kind: "high", fillDepth: FILL.high },
    { x: 0, width: 550, y: Y.low, height: T, kind: "low", fillDepth: FILL.low },
    { x: 740, width: 428, y: Y.low, height: T, kind: "low", fillDepth: FILL.low },
  ],

  // บันไดปีน (climb zone) — x ตรงกับบันไดที่วาดไว้ในภาพจริง (ขอบนอก = สูง<->กลาง, ข้างเหว = กลาง<->ล่าง)
  ladders: [
    { x: 60, width: 70, topY: Y.high, bottomY: Y.main }, // สูงซ้าย <-> กลางซ้าย (บันไดหนีไฟขอบซ้าย)
    { x: 1108, width: 70, topY: Y.high, bottomY: Y.main }, // สูงขวา <-> กลางขวา (บันไดหนีไฟขอบขวา)
    { x: 370, width: 70, topY: Y.main, bottomY: Y.low }, // กลางซ้าย <-> ล่างซ้าย (บันไดข้างเหวฝั่งซ้าย)
    { x: 798, width: 70, topY: Y.main, bottomY: Y.low }, // กลางขวา <-> ล่างขวา (บันไดข้างเหวฝั่งขวา)
  ],

  // เหวกลาง — ขอบแดงเรืองแสงในภาพ x≈550-740 · ตกแล้วเสีย HP + เด้งกลับขึ้นตรงจุดที่ตก (ดู MainGameScene._checkPitHazard)
  pits: [{ x: 550, width: 190, y: Y.main, damagePercent: 0.2 }],

  // [0]=P1 เริ่ม, [3]=P2 เริ่ม (MainGameScene._spawnPlayer ฮาร์ดโค้ด index นี้) — floorY ระบุตรงเพราะ
  // x เดียวกันมีได้หลายชั้น (สูง/กลาง/ล่าง ซ้อนคอลัมน์เดียวกัน) เดาจาก platform ใต้ x อย่างเดียวแยกไม่ออก
  spawnPoints: [
    { x: 150, floorY: Y.main }, // [0] P1 — กลางซ้าย ริมซ้าย (สปอว์น A)
    { x: 250, floorY: Y.high }, // [1] สูงซ้าย
    { x: 200, floorY: Y.low }, // [2] ล่างซ้าย
    { x: 1018, floorY: Y.main }, // [3] P2 — กลางขวา ริมขวา (สปอว์น B)
    { x: 918, floorY: Y.high }, // [4] สูงขวา
    { x: 968, floorY: Y.low }, // [5] ล่างขวา
  ],

  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  backgrounds: {}, // ไม่ใช้ (ดู backgroundImage) — ภาพเดียวทุกฤดู
};
