/**
 * ตำแหน่งตึกทั้ง 3 หลังคำนวณจาก "พิกเซลจริงของภาพ background" (ART_REFERENCE) โดยตรง
 * แล้ว scale ขึ้นตามอัตราส่วน worldWidth/artWidth — เพื่อให้ collision ตรงกับขอบตึกในภาพ
 * เป๊ะ 100% (ตามที่เทสแล้วพบว่าตำแหน่งเดิมที่ขยายช่องว่างเพื่อ gameplay ไม่ตรงกับภาพจริง)
 *
 * ผลข้างเคียงที่ต้องรู้ไว้: ช่องว่างที่ได้ (~80-87px) แคบกว่าที่เคยตั้งใจไว้เพื่อบังคับให้ต้อง
 * กระโดดจริง (เคยตั้งไว้ที่ 140px เทียบระยะกระโดดจริง 161px) — ตอนนี้ช่องว่างแคบพอที่จะ
 * เดิน/วิ่งข้ามได้เกือบไม่ต้องกระโดดเลย ถ้าเล่นแล้วรู้สึกว่า hazard เบาไป ค่อยกลับมาคุยปรับทีหลัง
 * (เช่น เพิ่ม knockback แทน หรือลด GAP เฉพาะจุดที่อยากให้ยากขึ้น)
 */
const scale = 2000 / 1374; // worldWidth / ART_REFERENCE.width

// พิกเซลที่วัดจากภาพจริง (rooftop_spring.jpg ฯลฯ, 1374x768)
const ART_LEFT_END = 405;
const ART_MID_START = 460;
const ART_MID_END = 970;
const ART_RIGHT_START = 1030;
const ART_RIGHT_END = 1374;

const LEFT_END = Math.round(ART_LEFT_END * scale); // 590
const MID_START = Math.round(ART_MID_START * scale); // 670
const MID_END = Math.round(ART_MID_END * scale); // 1412
const RIGHT_START = Math.round(ART_RIGHT_START * scale); // 1499
const RIGHT_END = 2000; // = ART_RIGHT_END * scale พอดี (ปัดให้ตรง worldWidth เป๊ะ)

const ROOF_Y = 480;
const ROOF_THICKNESS = 24;

/**
 * ART_REFERENCE — ขนาด/ตำแหน่งจริงของภาพ background ต้นฉบับ (rooftop_spring/summer/...)
 * วัดจาก background art จริง (1374x768px, ขอบบนพื้นดาดฟ้าอยู่ที่ y≈490)
 * MainGameScene ใช้ค่านี้คำนวณ scale+offset ให้พื้นในภาพชนกับ ROOF_Y ของ world พอดี
 * ตอนนี้ตำแหน่งตึกใน platforms ด้านล่างคำนวณจากพิกัดชุดเดียวกันนี้แล้ว จึงตรงกับภาพเป๊ะ
 */
export const ART_REFERENCE = {
  width: 1374,
  height: 768,
  roofY: 490,
};

export const ROOFTOP_ARENA = {
  id: "rooftop-arena",
  worldWidth: 2000,
  worldHeight: 700,

  // พื้นดาดฟ้าแต่ละตึก — ตำแหน่ง/ความกว้างตรงกับขอบตึกในภาพจริงเป๊ะ (ดูคอมเมนต์บนสุด)
  // ตัดบันไดหนีไฟที่เดินได้ออกไปก่อน (จุดยืนลอยไม่ตรงกับภาพ) — ช่องว่างกลับเป็น pure fall hazard
  platforms: [
    { x: 0, y: ROOF_Y, width: LEFT_END, height: ROOF_THICKNESS }, // ตึกซ้าย
    { x: MID_START, y: ROOF_Y, width: MID_END - MID_START, height: ROOF_THICKNESS }, // ตึกกลาง
    { x: RIGHT_START, y: ROOF_Y, width: RIGHT_END - RIGHT_START, height: ROOF_THICKNESS }, // ตึกขวา
  ],

  // ช่องว่าง = fall hazard ล้วน (ตัดบันไดหนีไฟที่เดินได้ออกแล้ว)
  gaps: [
    { x: LEFT_END, width: MID_START - LEFT_END },
    { x: MID_END, width: RIGHT_START - MID_END },
  ],

  // จุดเกิด กระจายให้ครบทั้ง 3 ตึก เว้นระยะจากขอบ/หลุมพอสมควร
  spawnPoints: [
    { x: 250, y: ROOF_Y - 100 }, // ตึกซ้าย
    { x: 820, y: ROOF_Y - 100 }, // ตึกกลาง (ฝั่งซ้าย)
    { x: 1260, y: ROOF_Y - 100 }, // ตึกกลาง (ฝั่งขวา)
    { x: 1780, y: ROOF_Y - 100 }, // ตึกขวา
  ],

  // ฤดูที่เล่นได้บนแมพนี้ — key ต้องตรงกับ SEASON_MODIFIERS ใน physics.config.js
  // bgKey คือชื่อไฟล์จริงใน assets/backgrounds/ (โหลดใน MainGameScene.preload)
  seasons: ["spring", "summer", "autumn", "winter", "rain"],
  backgrounds: {
    spring: "rooftop_spring",
    summer: "rooftop_summer",
    autumn: "rooftop_autumn",
    winter: "rooftop_winter",
    rain: "rooftop_rain",
  },
};
