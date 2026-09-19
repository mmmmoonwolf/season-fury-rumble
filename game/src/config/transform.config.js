/**
 * การแปลงร่าง (ตอนนี้มีแค่ OAT -> ไททัน) — ปุ่ม numpad 8 หรือปุ่มบนจอ
 *
 * - คูลดาวน์นับตั้งแต่กดแปลง (ไม่ใช่ตั้งแต่กลับร่าง)
 * - ระหว่างแปลงร่าง: ยืนนิ่ง ทำอะไรไม่ได้ และ "ไม่โดนตี" (ไม่งั้นแปลงทีไรโดนสวนทุกที)
 * - ร่างใหม่มีหลอดเลือดแยก (titanHp) โดนตีหักหลอดนี้ก่อน หลอด OAT ไม่ลด
 *   หลอดไททันหมด = กลับร่างเดิม ไม่เสียชีวิต (ดาเมจส่วนเกินทิ้ง) + อมตะสั้น ๆ (formBreak)
 *
 * ภาพทั้งหมดมาจากคลิป (ไม่ได้วาดด้วยโค้ด):
 *   tf_glow  = OAT เรืองแสง ลำแสงพุ่งออกจากตัว (คลิป A f21-f76)
 *   tf_erupt = ปะทุเป็นควันท่วมตัว (คลิป A f77-f117)
 *   roar     = ไททันยืนคำราม ไฟวาบที่หัว ไอพวยพุ่ง (คลิป D)
 * ⚠️ fps ในไฟล์นี้ต้องตรงกับที่ Oat.js ลงทะเบียน animation (timeline คำนวณจากจำนวนเฟรม)
 */
const GLOW_FRAMES = 28, GLOW_FPS = 20;
const ERUPT_FRAMES = 21, ERUPT_FPS = 18;
/** สลับร่างตอนควันท่วมมิด = เฟรมที่ 14 ของ tf_erupt (คลิป A f103) */
const SWAP_FRAME = 14;
const ROAR_FRAMES = 31, ROAR_FPS = 16;

const eruptAt = Math.round((GLOW_FRAMES / GLOW_FPS) * 1000);
const swapAt = eruptAt + Math.round((SWAP_FRAME / ERUPT_FPS) * 1000);

export const TRANSFORM = {
  /** v33: 30 -> 45 วิ นับตั้งแต่กด (ร่างอยู่ได้ titanDurationMs -> พักจริง ~16 วิ) */
  cooldownMs: 45000,
  /**
   * v33 ร่างไททันอยู่ได้นานเท่านี้ (นับจากสลับร่างเสร็จ) แล้วกลับร่างเอง — 0 = ไม่จำกัด (แบบเดิม)
   * เดิมอยู่ถาวรจนหลอด 150 แตก = ได้เลือดเพิ่ม 75% + ดาเมจ x2 ฟรี ๆ ถ้าคู่ต่อสู้ไม่ไล่ตีหลอด
   */
  titanDurationMs: 25000,
  /** ตัวคูณความสูงของร่างใหม่เทียบร่างเดิม */
  sizeMul: 1.2, // v26: 1.5 -> 1.35 -> 1.2 ผู้ใช้ขอให้เล็กลง (ถ้าเปลี่ยน ปรับ reachMul/sizeMul/aoe ใน combat.config ด้วย)
  /** หลอดเลือดแยกของร่างไททัน (หลอดร่างปกติ = MAX_HP ใน MainGameScene) */
  titanHp: 150,
  /** หลอดไททันหมด -> ควันปะทุ กลับร่างเดิม · อมตะ invulnMs (กระพริบ) กันโดนรุมต่อทันที */
  formBreak: { invulnMs: 1000, hitstopMs: 150, smokeFadeMs: 650 },
  anim: {
    glow: { frames: GLOW_FRAMES, fps: GLOW_FPS },
    erupt: { frames: ERUPT_FRAMES, fps: ERUPT_FPS },
    roar: { frames: ROAR_FRAMES, fps: ROAR_FPS },
    swapFrame: SWAP_FRAME,
  },
  /** จังหวะภายในท่าแปลงร่าง (ms นับจากกดปุ่ม) — รวม ~4 วิ */
  timeline: {
    eruptAt,                                   // 1400: ควันปะทุ + จอแฟลช
    swapAt,                                    // ~2180: ควันท่วมมิด -> เป็นไททัน เริ่มคำราม
    roarShakeAt: swapAt + 700,                 // ไฟวาบที่หัว -> กล้องสั่น + เสียงคำราม
    endAt: swapAt + Math.round((ROAR_FRAMES / ROAR_FPS) * 1000), // ~4120: คุมตัวได้
  },
  /**
   * ควันปะทุเล่นเป็นภาพซ้อน (sprite แยก) ตั้งแต่จังหวะปะทุ — ตัวละครจริงซ่อนไว้ข้างใต้
   * ค่อย ๆ ขยายจนคลุมไททัน (สูงกว่า sizeMul เท่า) พอดีตอนสลับร่าง แล้วจางออกเผยไททัน
   */
  overlay: {
    growTo: 1.6,                    // เท่าของขนาดตอนเป็น OAT (ต้องใหญ่กว่า sizeMul พอให้คลุมไททัน)
    growMs: swapAt - eruptAt,       // ขยายเสร็จพอดีจังหวะสลับร่าง
    fadeStartMs: swapAt - eruptAt + 250,
    fadeMs: 500,
  },
};
