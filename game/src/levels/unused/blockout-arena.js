/**
 * Blockout arena — แมพทดสอบ layout ด้วยกล่องสี่เหลี่ยมล้วน ยังไม่มีอาร์ต
 *
 * จุดประสงค์: จูน "ระยะกระโดด/ความสูงตึก" ให้สนุกก่อน แล้วค่อยสั่ง gen อาร์ตตามตัวเลขที่ลงตัวแล้ว
 * (แมพเดิม rooftop-arena ผูก collision กับพิกเซลของภาพ background ทำให้ขยายไม่ได้
 *  แมพนี้แยกตึกออกจากภาพโดยสิ้นเชิง — เพิ่ม/ย้าย/ปรับความสูงได้อิสระในไฟล์นี้ไฟล์เดียว)
 *
 * ตัวเลขอ้างอิงจาก physics ปัจจุบัน (GRAVITY 1400, JUMP -620, DOUBLE -560, RUN 260):
 *   กระโดดครั้งเดียวสูง   ~137px   (ตัวละครสูง 148px → ไม่ถึงตัวเอง)
 *   double jump สูงรวม    ~249px
 *   ระยะกระโดดไกลสุด      ~230px  (วิ่งเต็มสปีดแล้วกระโดด)
 *
 * เกณฑ์ที่ใช้วาง:
 *   ต่างระดับ  <=120px  = กระโดดเดียวขึ้นได้สบาย
 *   ต่างระดับ 130-240px = ต้อง double jump
 *   ช่องว่าง   <=150px  = ข้ามได้ไม่ยาก
 *   ช่องว่าง  160-215px = ต้องวิ่งแล้วกระโดด (เฉียดฉิว = สนุก)
 *   ช่องว่าง   >230px   = ข้ามไม่ได้ ต้องมีตึกกลางคั่น
 */

const WORLD_W = 6000; // 3 เท่าของแมพเดิม (2000)
const WORLD_H = 900; // สูงขึ้นจาก 700 เพื่อมีที่ให้ตึกสูงต่ำสลับกัน

const T = 24; // ความหนาพื้นตึก (ROOF_THICKNESS)

/** ระดับความสูงของหลังคา — ยิ่งเลขน้อย ยิ่งสูง */
const LV = {
  ground: 700, // พื้นล่างสุด
  low: 590,
  mid: 470,
  high: 360,
  top: 250,
};

/**
 * ตึกทั้งหมด: x = ขอบซ้าย, width = ความกว้าง, y = ระดับหลังคา
 * เรียงจากซ้ายไปขวา ออกแบบให้มีจังหวะ พื้นยาว → ไต่ขึ้น → กระโดดถี่ → ลงมา → พื้นยาว
 */
const BUILDINGS = [
  // --- โซนเริ่ม: พื้นยาว ให้วิ่งเก็บสปีดได้ ---
  { x: 0, width: 720, y: LV.ground },

  // --- โซนไต่ขึ้น: ต่างระดับทีละ ~110px กระโดดเดียวขึ้นได้ ---
  { x: 880, width: 300, y: LV.low }, // ช่องว่าง 160 → ต้องวิ่งกระโดด
  { x: 1290, width: 260, y: LV.mid }, // ช่องว่าง 110, สูงขึ้น 120
  { x: 1660, width: 240, y: LV.high }, // ช่องว่าง 110, สูงขึ้น 110

  // --- โซนยอด: ตึกเล็กเรียงถี่ ต้องกระโดดต่อเนื่อง แคบ พลาดง่าย ---
  { x: 2010, width: 150, y: LV.top },
  { x: 2300, width: 150, y: LV.top }, // ช่องว่าง 140
  { x: 2590, width: 150, y: LV.top }, // ช่องว่าง 140

  // --- โซนลงมา: ตกลงได้เลยไม่ต้องกระโดด แต่ห่างพอให้ต้องเล็ง ---
  { x: 2850, width: 280, y: LV.high },
  { x: 3230, width: 320, y: LV.mid },

  // --- โซนกลาง: หลุมกว้างสุดของแมพ ต้องใช้ double jump ข้าม ---
  { x: 3760, width: 340, y: LV.mid }, // ช่องว่าง 210 = เฉียดระยะกระโดดสุด

  // --- โซนขวา: สลับสูงต่ำถี่ๆ ไล่ตีกันสนุก ---
  { x: 4250, width: 220, y: LV.low }, // ช่องว่าง 150
  { x: 4600, width: 200, y: LV.high }, // ช่องว่าง 130, สูงขึ้น 230 → ต้อง double jump
  { x: 4940, width: 220, y: LV.mid }, // ช่องว่าง 140

  // --- โซนจบ: พื้นยาวอีกฝั่ง สมมาตรกับโซนเริ่ม ---
  { x: 5280, width: 720, y: LV.ground },
];

/** แพลตฟอร์มลอยเล็กๆ คั่นกลางหลุม — ทางเลือกสำหรับคนที่กระโดดไม่ถึง */
const FLOATING = [
  { x: 780, width: 90, y: LV.low - 60 },
  { x: 3600, width: 110, y: LV.high },
  { x: 5180, width: 90, y: LV.low },
];

const platforms = [
  ...BUILDINGS.map((b) => ({ ...b, height: T, kind: "building" })),
  ...FLOATING.map((b) => ({ ...b, height: 16, kind: "floating" })),
];

/** ช่องว่างระหว่างตึก = fall hazard (คำนวณอัตโนมัติจากตำแหน่งตึก ไม่ต้องมาแก้มือ) */
const gaps = [];
for (let i = 0; i < BUILDINGS.length - 1; i++) {
  const a = BUILDINGS[i];
  const b = BUILDINGS[i + 1];
  const gapStart = a.x + a.width;
  const gapWidth = b.x - gapStart;
  if (gapWidth > 0) gaps.push({ x: gapStart, width: gapWidth });
}

export const BLOCKOUT_ARENA = {
  id: "blockout-arena",
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,

  /** แมพนี้ไม่ใช้ภาพ background — วาดท้องฟ้าไล่สีแทน (ดู MainGameScene._buildBackground) */
  useSolidBackground: true,
  skyTopColor: 0x1e293b,
  skyBottomColor: 0x475569,

  platforms,
  gaps,

  // จุดเกิด: กระจายให้ห่างกัน เริ่มบนพื้นยาวสองฝั่งและตึกกลาง
  spawnPoints: [
    { x: 300, y: LV.ground - 100 },
    { x: 1400, y: LV.mid - 100 },
    { x: 3900, y: LV.mid - 100 },
    { x: 5600, y: LV.ground - 100 },
  ],

  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  backgrounds: {}, // ไม่มีภาพ — ใช้ท้องฟ้าไล่สี
};

/** สรุประยะไว้เช็คตอนจูน — import ไปใช้ใน debug overlay ได้ */
export const BLOCKOUT_METRICS = { LV, BUILDINGS, FLOATING, gaps };
