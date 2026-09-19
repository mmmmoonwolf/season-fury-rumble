/**
 * ค่าบาลานซ์ของระบบต่อสู้ทั้งหมดอยู่ที่นี่ที่เดียว
 * แยกจากโค้ดเพื่อให้จูนตอนเล่นจริงได้เร็ว โดยไม่ต้องแตะ logic
 *
 * หน่วยเวลา = มิลลิวินาที, ระยะ = พิกเซลในโลกเกม
 *
 * โครงจังหวะของหมัดหนึ่งครั้ง (แบบเกมต่อสู้มาตรฐาน):
 *   startup  — เงื้อมือ ยังไม่โดน (ยิ่งสั้นยิ่งออกไว)
 *   active   — ช่วงที่ hitbox เปิด โดนได้จริง
 *   recovery — ชักมือกลับ ขยับไม่ได้ (ยิ่งยาวยิ่งเสี่ยงโดนสวน)
 */

/** ระยะเวลาที่ยังต่อคอมโบได้หลังหมัดก่อนหน้าจบ — เลยจากนี้คอมโบรีเซ็ต */
export const COMBO_WINDOW = 520;

/**
 * ลูกโซ่หมัดพื้นฐาน 3 จังหวะ — ตบสลับมือ ขวา → ซ้าย → ขวา
 * ตบ (slap) ไม่ใช่ต่อย เพราะคาแรกเตอร์แนวกวนๆ ล้อเลียนคู่ต่อสู้มากกว่าจะสู้จริงจัง
 */
export const BASIC_COMBO = [
  {
    name: "slap_right",
    hand: "right",
    startup: 60,
    active: 90,
    recovery: 130,
    damage: 6,
    reach: 62, // ระยะจากขอบตัวไปข้างหน้า
    hitboxHeight: 90,
    hitboxYOffset: -30, // ลบ = สูงกว่ากลางตัว (ตบระดับหน้า)
    knockbackX: 130,
    knockbackY: -60,
    hitstun: 180,
    lungeX: 60, // พุ่งไปข้างหน้าเล็กน้อยตอนออกหมัด ให้รู้สึกมีน้ำหนัก
  },
  {
    name: "slap_left",
    hand: "left",
    startup: 55,
    active: 90,
    recovery: 140,
    damage: 6,
    reach: 62,
    hitboxHeight: 90,
    hitboxYOffset: -30,
    knockbackX: 140,
    knockbackY: -60,
    hitstun: 190,
    lungeX: 65,
  },
  {
    name: "slap_right_2",
    hand: "right",
    startup: 70,
    active: 100,
    recovery: 200, // จังหวะสุดท้ายชักกลับช้ากว่า — เป็นราคาที่จ่ายถ้าตบไม่โดน
    damage: 9,
    reach: 70,
    hitboxHeight: 95,
    hitboxYOffset: -30,
    knockbackX: 220,
    knockbackY: -140,
    hitstun: 240,
    lungeX: 80,
  },
];

/**
 * คอมโบประจำตัว — ปลดล็อกเมื่อตบเข้าครบ 3 ครั้งติดกัน (ต้องโดนจริงทั้ง 3 ไม่ใช่แค่กดครบ)
 * "ตบรัวๆ จนมองไม่ทัน" — ตบถี่ๆ หลายครั้ง ดาเมจต่อครั้งน้อย แต่รวมแล้วคุ้ม
 * จบด้วยการดีดคู่ต่อสู้ออกไปแรงๆ (ตัวชี้ขาดว่าจะตกแมพไหม)
 */
export const FINISHER = {
  name: "slap_flurry",
  startup: 110,
  hits: 9,
  hitInterval: 55, // ตบทุก 55ms — เร็วกว่าที่ตาจับทัน
  damagePerHit: 3,
  recovery: 260,
  reach: 74,
  hitboxHeight: 105,
  hitboxYOffset: -30,
  /** ระหว่างรัว ดันคู่ต่อสู้เบาๆ ให้ค้างอยู่ในระยะ ไม่หลุดออกไปกลางคัน */
  holdKnockbackX: 40,
  holdKnockbackY: -25,
  /** หมัดสุดท้ายของชุด — ดีดแรง */
  finalKnockbackX: 430,
  finalKnockbackY: -330,
  finalDamage: 8,
  hitstun: 90,
  finalHitstun: 420,
  /**
   * v33 คูลดาวน์ของสกิล 1 แบบรัว (Dear V.2 / March V.2 / OAT / ปืนสั้น KunJae)
   * เดิมไม่มีคูลดาวน์เลย: 35 ดาเมจต่อ ~0.87 วิ กดซ้ำได้ทันที = ~40 ดาเมจ/วิ (ตีปกติ ~21) — แรงสุดในเกมแบบไม่มีราคา
   */
  cooldownMs: 6000,
};

/** ระยะเวลาที่ปลดล็อกคอมโบค้างไว้หลังตบครบ 3 — ไม่กดต่อภายในเวลานี้ถือว่าเสียโอกาส */
export const FINISHER_WINDOW = 700;

/** ตอนโดนตี ตัวจะกระพริบแดงกี่มิลลิวินาที */
export const HIT_FLASH_DURATION = 120;

/**
 * Hitstop — หยุดภาพทั้งจอชั่วครู่ตอนหมัดเข้า ให้หมัดรู้สึก "หนัก"
 * 1 เฟรมที่ 60fps ≈ 16.7ms → 50ms ≈ 3 เฟรม, 83ms ≈ 5 เฟรม
 * ระหว่างหยุด: physics / animation / tween / ตัวจับเวลาของ scene หยุดหมด (กล้องสั่นยังเล่นต่อ)
 * ตั้งค่าเป็น 0 = ปิดเฉพาะกรณีนั้น
 */
export const HITSTOP = {
  /** หมัดปกติ (หมัด 1-2-3) — 3 เฟรม */
  normal: 50,
  /** หมัดปิดชุดของไม้ตาย — 5-6 เฟรม ให้จังหวะดีดออกเด่นที่สุด */
  heavy: 150, // v26: 100 -> 150 ผู้ใช้อยากให้หมัดแรงหนักขึ้น
  /** หมัดย่อยในชุดรัว (ไม้ตาย 9 ฮิต ห่างกันแค่ 55ms) — สั้นมาก ไม่งั้นท่ายืดจนเสียจังหวะ */
  multiHit: 16,
  /** หมัดที่โดนกัน — สั้นกว่าหมัดเข้า ให้รู้สึกต่างกันว่า "ไม่เข้า" */
  blocked: 33,
  /** การ์ดแตก — นานสุด ให้ทุกคนเห็นว่าเกิดอะไรขึ้น */
  guardBreak: 180,
  /** v29 KunJae แส้ S1 sonic boom — หยุดภาพรุนแรงที่สุดในเกม */
  sonic: 320,
};

/**
 * Guard — มาตรวัดการกัน แก้ปัญหา "ยืนกันอย่างเดียวแทบไม่มีทางแพ้"
 * - กันค้างไว้ = มาตรลดเรื่อย ๆ (กันนานเกินไปแตกเอง)
 * - โดนตีตอนกัน = มาตรลดตามแรงหมัด (โดนรัวแตกไว)
 * - มาตรหมด = การ์ดแตก ยืนแข็งเปิดให้ตีฟรีช่วงหนึ่ง
 * - ไม่ได้กัน = ค่อย ๆ ฟื้น (หลังปล่อยปุ่มได้สักพัก)
 * ตัวอย่างค่าปัจจุบัน: หมัดปกติ (6 dmg) กินมาตร 14 + 6x1 = 20 → โดน 5 หมัดติดแตก, กันเฉย ๆ แตกใน ~8 วิ
 */
export const GUARD = {
  max: 100,
  /** กันค้างไว้เสียกี่หน่วย/วินาที */
  holdDrainPerSec: 12,
  /** โดนตีตอนกัน เสียคงที่ต่อหมัด */
  hitCost: 14,
  /** + เสียเพิ่มตามดาเมจดิบของหมัด (ก่อนหักจากการกัน) */
  damageCostMul: 1.0,
  /** ปล่อยปุ่มกันแล้วรอกี่ ms ก่อนเริ่มฟื้น — กันการกดกันสลับปล่อยถี่ ๆ เพื่อเลี่ยงการเสียมาตร */
  regenDelayMs: 700,
  /** ฟื้นกี่หน่วย/วินาที (หลอดหมดฟื้นเต็มใน ~4 วิ) */
  regenPerSec: 25,
  /** การ์ดแตกแล้วยืนแข็งกี่ ms — ตีฟรีได้ราว 3 หมัด */
  breakStunMs: 1100,
  /** หลังหายแข็ง มาตรกลับมากี่ส่วน (ไม่เต็ม กันไม่ให้กันต่อได้ยาวทันที) */
  refillAfterBreak: 0.5,
};

/**
 * ค่าปรับเฉพาะตัวละคร — คูณทับค่ากลางด้านบน (ไม่ใส่ = ใช้ค่ากลางเป๊ะ)
 *
 * ใช้เพื่อให้ตัวละครที่มี "ข้อได้เปรียบเชิงระยะ" ต้องจ่ายราคาด้วยดาเมจที่ต่ำลง
 * คีย์ต้องตรงกับคีย์ใน roster.js
 */
export const CHARACTER_COMBAT = {
  kunjae: {
    // v27 ตีพื้นฐาน = แส้ ยืดไกลพอ ๆ กับปืนเดิม (แส้ในภาพยาว ~195px จากขอบตัว) -> reach 62 -> 198
    // ค่าเดียวกันใช้กับสกิลปืน (รัวปืน / ลูกซอง) ด้วย
    reachMul: 3.2,
    // ระยะไกลขนาดนี้ต้องแลกด้วยดาเมจที่ต่ำลงอีก ไม่งั้นยืนเก็บฟรี
    damageMul: 0.6,
    // แส้ต้องเงื้อ — ช้ากว่าหมัดกลาง 40% (เฉพาะหมัด 1-2-3) · ⚠️ KunJae.js ใช้ค่านี้ยืดท่าให้ตรงด้วย
    timeMul: 1.4,
  },
  // v28 KunJae ถือปืนสั้นคู่ — ตีพื้นฐาน = ยิงปืน (ท่าปืนเดิม) ระยะไกลเท่าแส้ แต่ออกไวกว่า
  kunjae_pistol: {
    reachMul: 3.2,
    damageMul: 0.6,
    timeMul: 1,
  },
  // v28 KunJae ถือลูกซองคู่ — ตีพื้นฐาน = ยิงลูกซองไปข้างหน้า ระยะสั้นกว่า แรงกว่า ช้ากว่า กระเด็นไกล
  kunjae_shotgun: {
    reachMul: 2.4,     // 62 -> 149
    damageMul: 1.3,    // 6 -> 8
    timeMul: 1.6,
    knockbackMul: 1.8,
    heavyShake: false,
  },
  /**
   * OAT ร่างไททัน (แปลงร่างด้วย numpad 8) — ตัวใหญ่ 1.2 เท่า ตีแรงแต่ช้า
   * หมัด 1-2-3: ดาเมจ x2 · ช้าลง 25% (startup/recovery) · เหยื่อแข็งอย่างน้อย 0.5 วิ · hitstop x2 + กล้องสั่น
   * สกิล 1 (ง้างเตะ v33) / สกิล 2: ดาเมจคูณตามนี้ด้วย
   * v33 สมดุล: damageMul 2 -> 1.6 (หมัด 12/12/18 -> 10/10/14) · minHitstun 500 -> 400
   *   เดิมตี 1 หมัดทุก ~0.35 วิ แต่เหยื่อแข็ง 0.5 วิ = ขังได้ไม่รู้จบ ร่วมกับหลอดเสริม 150 ที่ไม่มีหมดเวลา
   */
  oattitan: {
    damageMul: 1.6,
    reachMul: 1.2, // ตัวใหญ่ 1.2 เท่า (TRANSFORM.sizeMul) แขนยาวตาม
    sizeMul: 1.2,  // hitbox สูงตามตัว
    timeMul: 1.25,  // เฉพาะหมัด 1-2-3
    minHitstun: 400, // เฉพาะหมัด 1-2-3
    hitstopMul: 2.6, // เฉพาะหมัด 1-2-3 (ไม่คูณฮิตย่อยของสกิล) · 50 x 2.6 = 130ms
    heavyShake: true,
  },
};

/**
 * v33 สกิล 1 ร่างไททัน — ง้างเตะแบบเตะบอล (แทนหมัดรัวเดิม) · คลิป F1A409B6 · atlas oattitan_kick (29 เฟรม @24fps)
 * ง้างขานาน ~0.54 วิ (เห็นชัด หลบ/กันทัน) แล้วเหวี่ยง โดนที่เฟรมขายืดสุด ~0.75 วิ · super armor ทั้งท่า
 * hitstop = sonic (320ms) เท่าแส้ S1 ของ KunJae ตามที่ผู้ใช้ขอ
 * ค่าเป็นค่าก่อนคูณ CHARACTER_COMBAT.oattitan: ดาเมจ 14 x1.6 = 22 · ระยะ 80 x1.2 = 96 จากขอบตัว (ปลายเท้าในภาพ ~126px จากกลางตัว)
 */
export const TITAN_SKILL1 = {
  cooldownMs: 8000,
  fps: 24,
  armor: true,
  /** เฟรม (0-based) ใน oattitan_kick — ต้องตรงกับ meta.kick ของ atlas (frames.test เช็ค) */
  frames: 29,
  swingIndex: 13,   // เริ่มเหวี่ยงขา -> เสียงเตะ (คลิป f178 = จุดเริ่มเสียงเตะในคลิป)
  contactIndex: 18, // ขายืดสุด -> ปล่อย hitbox
  kick: {
    name: "titan_kick",
    damage: 14,
    reach: 80,
    hitboxHeight: 110,
    hitboxYOffset: 10,
    knockbackX: 720,
    knockbackY: -480,
    hitstun: 800,
    active: 100,
    hitstopKind: "sonic",
  },
};

/**
 * สกิล 2 ร่างไททัน — แขนคริสตัล ทุบพื้น หนามคริสตัลปะทุ 2 ระลอก (ภาพจากคลิป E ทั้งหมด)
 * ค่าดาเมจด้านล่างเป็นค่าก่อนคูณ — ร่างไททันคูณ x2 ตาม CHARACTER_COMBAT.oattitan
 * aoe = กรอบรอบตัว (หน่วยพิกเซลในโลกเกม) ครอบทั้งซ้ายและขวา · กระเด็นออกจากตัวไททันเสมอ (radial)
 * ขนาดวัดจากหนามในคลิป: ระลอก 2 กว้าง ~352px สูง ~184px เมื่อไททันสูง 234 (เปลี่ยนขนาดไททันต้องคูณตาม)
 *   (v26e: ย่อจากค่าตอนไททัน 1.35 เท่า ด้วยอัตรา 1.2/1.35)
 */
export const TITAN_SKILL2 = {
  cooldownMs: 10000, // v33: 8 -> 10 วิ (AOE 2 ระลอก 13+22 = 35 + super armor)
  /** ระหว่างท่า: โดนตีได้เลือดลดปกติ แต่ไม่สะดุด (super armor) — ท่ายาว ~3 วิ ไม่งั้นใช้ไม่ออก */
  armor: true,
  wave1: {
    name: "titan_crystal_1",
    damage: 8,
    knockbackX: 160,
    knockbackY: -360,
    hitstun: 450,
    active: 160,
    aoe: { halfWidth: 160, height: 104 },
    radial: true,
  },
  wave2: {
    name: "titan_crystal_2",
    damage: 14,
    knockbackX: 380,
    knockbackY: -620,
    hitstun: 700,
    active: 220,
    aoe: { halfWidth: 176, height: 184 },
    radial: true,
    hitstopKind: "heavy",
  },
};

/**
 * สกิล 3 ร่างไททัน — ยืนคำราม แล้วไททันบ้า 3 ตัวเกิดจากแสงกลางอากาศที่ขอบซ้ายของจอ วิ่งไปขอบขวา
 * - ไททันบ้าวิ่งชนใคร (ที่ไม่ใช่เจ้าของ) = ลากคนนั้นไปจนสุดทาง แล้วเหวี่ยงทิ้ง
 * - กันทันตอนชน = ไม่โดนลาก (เสียมาตรการ์ด + ดาเมจเศษเดียวแบบหมัดที่กันได้)
 * - เจ้าของคุมตัวได้ทันทีหลังคำรามจบ ต่อยซ้ำคนที่โดนลากได้ (คนโดนลากไม่หลุดเพราะโดนตี)
 * - ไม่คูณ damageMul ของไททัน (ค่าในนี้คือค่าจริง)
 * ขนาด/จุดยึดภาพมาจาก tools/build_crazy_titans.py (meta.titans ใน crazytitans_atlas.json)
 *   build ใหม่แล้วตัวเลข canvas/anchor/feet เปลี่ยน ต้องแก้ตรงนี้ด้วย (frames.test ตรวจให้)
 */
export const TITAN_SKILL3 = {
  cooldownMs: 20000, // v33: 15 -> 20 วิ (ultimate: ลากได้หลายตัว/หลายรอบ 20+ ต่อครั้งที่ชน)
  roar: { frames: 25, fps: 20 },      // ท่าคำราม (คลิป H ทุก 2 เฟรม) = 1.25 วิ
  spawnAtMs: 450,                     // ไอเริ่มพวยพุ่ง -> เรียกไททันบ้า
  armor: true,                        // ระหว่างคำราม โดนตีเลือดลดแต่ท่าไม่หลุด
  storeMul: 1.5,                      // ภาพเก็บใหญ่กว่าขนาดในเกม 1.5 เท่า
  appearMs: 380,                      // ปรากฏจากแสง (จาง+ร่วงลงมา) ก่อนเริ่มวิ่ง
  startInset: 70,                     // เกิดห่างขอบซ้ายของจอเท่านี้ (px ในโลกเกม)
  endInset: 40,                       // วิ่งไปจนห่างขอบขวาของจอเท่านี้
  runners: [
    // canvas/anchorX/feetY = ผืนภาพจาก build · reach = ระยะด้านหน้าที่ชนได้ (px ในเกม)
    { kind: "tall", delayMs: 0, speed: 520, fps: 12, frames: 8, canvas: [495, 432], anchorX: 223, feetY: 420, height: 273, reach: 70 },
    { kind: "fat", delayMs: 350, speed: 430, fps: 24, frames: 20, canvas: [310, 429], anchorX: 169, feetY: 417, height: 270, reach: 60 },
    { kind: "small", delayMs: 700, speed: 620, fps: 20, frames: 13, canvas: [258, 319], anchorX: 137, feetY: 307, height: 197, reach: 45 },
  ],
  grabDamage: 8,                      // ตอนชน
  releaseDamage: 12,                  // ตอนเหวี่ยงทิ้งที่ปลายทาง
  release: { knockbackX: 460, knockbackY: -460, hitstun: 550 },
  blockKnockbackX: 120,               // กันได้ = ถอยนิดเดียว
  grabHitstop: 60,
  releaseHitstop: 110,
};

/**
 * รวมค่ากลางกับค่าปรับของตัวละคร -> spec ที่ใช้จริง
 * damageMul คูณทุกชนิดดาเมจ (หมัดปกติ + ฮิตย่อย + ฮิตปิดของสกิล)
 */
export function resolveAttack(spec, characterKey) {
  const o = CHARACTER_COMBAT[characterKey];
  if (!o) return spec;
  const r = (v, m = 1) => (v == null ? v : Math.round(v * m));
  const isMulti = spec.damagePerHit != null; // สกิลรัว — ไม่ยืดเวลา/ไม่เพิ่มแข็ง/ไม่คูณ hitstop
  const dmg = o.damageMul ?? 1;
  const time = isMulti ? 1 : (o.timeMul ?? 1);
  const size = o.sizeMul ?? 1;
  return {
    ...spec,
    damage: r(spec.damage, dmg),
    damagePerHit: r(spec.damagePerHit, dmg),
    finalDamage: r(spec.finalDamage, dmg),
    reach: r(spec.reach, o.reachMul ?? 1),
    hitboxHeight: r(spec.hitboxHeight, size),
    hitboxYOffset: r(spec.hitboxYOffset, size),
    startup: r(spec.startup, time),
    recovery: r(spec.recovery, time),
    hitstun: !isMulti && o.minHitstun != null ? Math.max(spec.hitstun, o.minHitstun) : spec.hitstun,
    knockbackX: isMulti ? spec.knockbackX : r(spec.knockbackX, o.knockbackMul ?? 1),
    knockbackY: isMulti ? spec.knockbackY : r(spec.knockbackY, o.knockbackMul ?? 1),
    // สกิลที่ระบุ hitstopKind เอง (sonic / heavy) ใช้ค่านั้นตรง ๆ — ตัวคูณมีไว้ให้หมัด 1-2-3 ของไททันหนักขึ้นเท่านั้น
    // (v33 แก้: เดิมคูณทับด้วย -> ง้างเตะ 320 กลายเป็น 832ms · หนามระลอก 2 ของสกิล 2 150 กลายเป็น 390ms)
    hitstopMul: isMulti || spec.hitstopKind ? 1 : (o.hitstopMul ?? 1),
    heavyShake: !isMulti && !!o.heavyShake,
  };
}
