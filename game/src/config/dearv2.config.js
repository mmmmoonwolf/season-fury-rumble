/**
 * สกิลของ Dear V.2 (v30) — ค่าดาเมจเป็นค่าก่อนคูณ (Dear V.2 ไม่มีรายการใน CHARACTER_COMBAT = คูณ 1)
 *
 * S1 มีดของเล่น: ควักมีดออกมาจ้วงรัว 5 ที (ระยะใกล้ ดาเมจย่อย ๆ + เสียงหัวเราะ)
 * S2 เสกตัวตลก: ตัวตลกเล็ก 3 ตัววิ่งไปหาเป้าที่ใกล้ที่สุดแล้วรุมแทง — กดได้ 2 ครั้งก่อนคูลดาวน์
 */
export const DEARV2_SKILL1 = {
  fps: 24,
  cooldownMs: 6000,
  /** จ้วงแต่ละที: ลำดับเฟรม (นับจาก 0) ที่มีดพุ่งออก */
  stabFrames: [3, 5, 7, 9, 13],
  stab: {
    name: "dv2_knife",
    damage: 7,
    reach: 60,
    hitboxHeight: 110,
    hitboxYOffset: -20,
    knockbackX: 90,
    knockbackY: -60,
    hitstun: 180,
    active: 70,
    hitstopKind: "light",
  },
  /** จ้วงทีสุดท้ายผลักออกแรงขึ้น จบชุด */
  lastStab: { knockbackX: 320, knockbackY: -220, hitstun: 380, hitstopKind: "heavy" },
};

/** เรขาคณิตของ atlas ตัวตลกเล็ก (ต้องตรงกับ tools/build_dearv2_skills.py) */
export const CLOWN_ATLAS = {
  key: "dearv2clown",
  canvasW: 260,
  canvasH: 240,
  feetY: 225,
  standingHeightInFrame: 190,
};

export const DEARV2_SKILL2 = {
  fps: 24,
  cooldownMs: 14000,
  /** กดได้ 2 ครั้งก่อนเข้าคูลดาวน์ (คูลดาวน์เริ่มนับเมื่อใช้ครบ) */
  charges: 2,
  /** ตัวตลกโผล่ที่เฟรมนี้ของท่าเสก */
  summonFrame: 4,
  clown: {
    count: 3,
    /** ระยะห่างระหว่างตัวตอนโผล่ (px โลก) และดีเลย์การโผล่ทีละตัว */
    spawnGap: 40,
    delayMs: 140,
    worldHeight: 128,     // ~0.69 เท่าของ Dear (185)
    speed: 230,           // px/วิ
    lifeMs: 6000,
    /** แทงได้กี่ทีต่อตัวแล้วหายไป (กันดาเมจรวมบานปลาย: 3 ตัว x 4 ที x 4 = 48) */
    maxStabs: 4,
    fadeMs: 400,
    /** เข้าใกล้เป้าเท่านี้แล้วหยุดแทง */
    stabRange: 60,
    stabIntervalMs: 650,
    damage: 4,            // ก่อนคูณ damageMul ของ Dear
    knockbackX: 70,
    knockbackY: -80,
    hitstun: 160,
    /** เสียงหัวเราะเด็กตอนแทง (สุ่มระดับเสียงเล็กน้อย) */
    laughEvery: 2,
  },
};

/**
 * สกิล 3 (ultimate) "ย่อง" — v32 เป็นสกิล 2 · v33 ย้ายเป็นสกิล 3 + ลดเวลา 10 -> 6 วิ, คูลดาวน์ 20 -> 30 วิ
 *   (เดิมอมตะเกือบเต็มครึ่งหนึ่งของเวลาทั้งเกม = แรงเกินแม้เป็น ultimate)
 * กดครั้งเดียว เข้าโหมดย่อง
 *  - ดาเมจที่ได้รับลด 90% (ยกเว้นโดน True Damage)
 *  - ไม่ติดสถานะใด ๆ: ไม่สะดุด (hitstun) ไม่กระเด็น (knockback) ไม่โดนลาก (grab) ไม่ติดภาพหยุด (hitstop)
 *    ภาพหยุดทั้งจอ แต่ตัวที่ย่องยังเดิน/แทง/เล่นท่าต่อได้ (ดู MainGameScene._updateHitstopExempt)
 *  - เดินทะลุศัตรูได้ (ปิดการชนตัว) · กันไม่ได้ (กันแล้วการ์ดแตกได้ = ติดสถานะ)
 *  - ปุ่มตีกลายเป็น "ย่องแทง" True Damage — กดซ้ำระหว่างท่าตัดช่วงชักมีดกลับทันที ยิ่งรัวยิ่งไว
 * อาร์ต: dearv2_sneak_atlas (tools/build_dearv2_sneak.py) · เสียง: dv2_sneak_* (ตัดจากคลิปเดียวกัน)
 */
export const SNEAK_ATLAS = {
  key: "dearv2sneak",
  texturePath: "assets/characters/dearv2_sneak_atlas.png",
  dataPath: "assets/characters/dearv2_sneak_atlas.json",
};

export const DEARV2_SNEAK = {
  durationMs: 6000,
  /** นับตั้งแต่กด (รวมช่วงย่อง 6 วิ) = พักจริง 24 วิ */
  cooldownMs: 30000,
  /** ท่าย่อตัวเข้าโหมด (sneak_in 10 เฟรม @24fps) — อมตะสถานะตั้งแต่เฟรมแรก */
  introMs: 420,
  introFps: 24,
  /** ตัวคูณดาเมจที่ได้รับ (0.1 = ลด 90%) */
  damageTakenMul: 0.1,
  /** ความเร็วเดินเทียบปกติ */
  speedMul: 0.8,
  walkFps: 20,
  idleFps: 6,
  /** ตัวโปร่งเล็กน้อยให้รู้ว่าอยู่ในโหมด */
  alpha: 0.8,
  /** เฟรมใน sneak_walk (นับจาก 0) ที่เท้าแตะพื้น -> เสียงย่อง */
  stepFrames: [2, 10],
  stepVolume: 0.35,
  stab: {
    name: "dv2_sneak_stab",
    startup: 55,
    active: 60,
    recovery: 110,
    /** กดซ้ำได้เร็วสุดหลังเริ่มแทงกี่ ms (= หลังช่วง active) -> รัวสุด ~8.7 ที/วิ */
    cancelAfterMs: 115,
    damage: 3,
    trueDamage: true,
    reach: 80,           // จากขอบตัว — ปลายมีดในอาร์ตยื่น ~99-114px จากกลางตัว
    hitboxHeight: 80,
    hitboxYOffset: 0,    // มีดอยู่ระดับกลางตัวพอดี (ท่าย่อต่ำ)
    knockbackX: 110,     // ดันออกเล็กน้อย กันขังคู่ต่อสู้ไว้จนตาย (ไล่ตามต้องเดินเข้าไปเอง)
    knockbackY: -40,
    hitstun: 150,
    lungeX: 70,          // ขยับตามไปเล็กน้อยทุกที
    hitstopKind: "multiHit", // 16ms — รัวแล้วไม่ทำให้ทั้งจอกระตุก
  },
  stabFps: 27,          // 6 เฟรม ≈ 225ms = startup+active+recovery
  stabSamples: ["dv2_sneak_stab1", "dv2_sneak_stab2", "dv2_sneak_stab3"],
  stabSoundGapMs: 80,
};

/**
 * v34 สกิล 1-2 ลูกโป่ง — อาร์ต/เสียงจาก 6 คลิป (tools/build_dearv2_balloon.py)
 *   ท่า Dear + ตัวตลกหัวล้าน = BALLOON_ATLAS (ผืน 640 เท่า Dear) · เอฟเฟกต์ = DV2FX_ATLAS (meta.fx: จุดยึด/worldPerPx ต่อกลุ่ม)
 * บทบาท: ตัวเปิดทางให้ S3 ย่อง — S1 ทำให้เป้า "ยืนนิ่งทำอะไรไม่ได้" · S2 คุมพื้นที่/ป่วน/วาร์ป
 */
export const BALLOON_ATLAS = {
  key: "dearv2bal",
  texturePath: "assets/characters/dearv2_balloon_atlas.png",
  dataPath: "assets/characters/dearv2_balloon_atlas.json",
};
export const DV2FX_ATLAS = {
  key: "dv2fx",
  texturePath: "assets/characters/dv2fx_atlas.png",
  dataPath: "assets/characters/dv2fx_atlas.json",
};
/**
 * จุดยึด/จำนวนเฟรมต่อกลุ่มเอฟเฟกต์ — สำเนาจาก meta.fx ของ dv2fx_atlas.json (build ใหม่แล้วต้องอัปเดต · frames.test เช็คให้)
 * ตอนรันจริงอ่านจาก texture.customData.meta ก่อน ตารางนี้เป็นค่าสำรอง
 */
export const DV2FX_META = {
  balloon_fly: { originX: 0.499, originY: 0.499, frames: 12 },
  balloon_floor: { originX: 0.592, originY: 0.9702, frames: 6 },
  poison: { originX: 0.5197, originY: 0.971, frames: 19 },
  confetti: { originX: 0.6585, originY: 0.3825, frames: 20 },
  jackbox: { originX: 0.515, originY: 0.9924, frames: 23 },
};
/** ขนาดผืนเอฟเฟกต์: 1px ผืน = กี่ px โลก (bake ที่สเกลเดียวกับผืน Dear 393 -> 185) */
export const DV2FX_WORLD_PER_PX = 185 / 393;

export const DEARV2_BALLOON = {
  /** S1 เขวี้ยงลูกโป่ง — ลอยช้า ๆ ตรงไปข้างหน้า ชนคนแรก -> confetti + สถานะ "มึนงง" (ยืนนิ่ง + ใช้สกิลไม่ได้ + ตีวืด) */
  throw: {
    cooldownMs: 7000,
    fps: 24,
    frames: 18,
    releaseIndex: 14, // เฟรมปล่อยมือ (meta.releaseIndex ของ atlas) -> สร้างลูกโป่ง
    speed: 300,       // px/วิ แนวนอน
    rise: -14,        // px/วิ ลอยขึ้นช้า ๆ
    bobAmp: 9,
    bobHz: 1.6,
    lifeMs: 2600,     // ~780px แล้วแตกเปล่า
    radius: 34,       // รัศมีชน (โลก)
    scale: 0.55,      // ขนาดพวงลูกโป่ง (คูณกับ worldPerPx)
    damage: 6,
    /** root + silence + blind พร้อมกัน — นานพอให้เปิด S3 (ท่าเข้า 0.42 วิ) แล้วเดินไปถึง */
    statusMs: 2000,
    confettiScale: 0.9,
    confettiFps: 16,
  },
  /** S2 วางลูกโป่งกับดัก — ระเบิดเมื่อศัตรูแตะ หรือครบ 2 วิ · numpad 8 เลือกผลก่อนวาง */
  trap: {
    cooldownMs: 10000,
    fps: 24,
    frames: 19,
    placeIndex: 16,   // เฟรมลูกโป่งถึงพื้น (meta.placeIndex)
    offsetX: 55,      // วางหน้าตัวเท่านี้
    fuseMs: 2000,
    armMs: 250,       // เพิ่งวาง ยังไม่ทำงาน (กันระเบิดใส่คนที่ยืนติดตอนวาง)
    triggerRadius: 45,
    scale: 0.55,
    modes: [
      { key: "poison", label: "POISON", icon: "☠", color: "#4ade80" },
      { key: "jackbox", label: "JACK-BOX", icon: "🎁", color: "#fbbf24" },
      { key: "bald", label: "BALD CLOWN", icon: "🤡", color: "#f472b6" },
    ],
    poison: { burstDamage: 6, tickDamage: 4, tickMs: 500, durationMs: 2500, radius: 130, scale: 1.0, fps: 18 },
    jackbox: { damage: 14, radius: 115, knockbackX: 140, knockbackY: -820, hitstun: 750, popAtMs: 170, holdMs: 1300, scale: 0.7, fps: 24 },
    bald: {
      hp: 30, lifeMs: 8000, speed: 70, turnMinMs: 900, turnMaxMs: 1900,
      auraRadius: 95, slowMul: 0.5, scale: 0.8, fps: 14,
      /** กด S2 อีกครั้งระหว่างตัวตลกยังอยู่ = วาร์ปไปหา (ครั้งเดียวต่อตัว) ไม่ติดคูลดาวน์ */
      warpOnce: true,
    },
  },
};
