/**
 * SCRAMBLE — แกนระบบต่อสู้ (engine-agnostic)
 *
 * ยกมาจาก prototype ไฟล์เดียว scramble-training.html ตามที่ SCRAMBLE_HANDOFF.md สั่งไว้ว่า
 * "port it as-is rather than rewriting it" — ค่าทั้งหมดผ่านการ playtest มาแล้ว การเขียนใหม่
 * เสี่ยงทำ game feel เพี้ยนโดยไม่รู้ตัว แก้เฉพาะเท่าที่จำเป็นต่อการเป็น ES module เท่านั้น
 *
 * ไม่มีอะไรผูกกับ Phaser หรือ DOM ในไฟล์นี้เลย — เดินด้วย step(input) ทีละเฟรมที่ 60 เฟรม/วินาทีคงที่
 * ตัว renderer (ScrambleScene.js) แค่วาดสถานะที่อ่านจากตรงนี้ จึงเทสต์ได้โดยไม่ต้องมีเบราว์เซอร์
 *
 * รูปแบบ input ที่ step() รับ:
 *   { left, right, up, down, jump, attack, block, run,   // กดค้างอยู่
 *     p: { left, right, jump, attack, block } }          // เพิ่งกดเฟรมนี้
 */

const STAGE = {
  w: 1280, h: 720, groundY: 620, wallL: 40, wallR: 1240,
  platforms: [
    { x1: 490, x2: 790, y: 430 },
    { x1: 110, x2: 430, y: 290 },
    { x1: 850, x2: 1170, y: 290 },
  ],
};

const STAGE_BASE_W = STAGE.w;   // ความกว้างที่เลย์เอาต์แพลตฟอร์มด้านบนถูกออกแบบไว้

/**
 * ขยายเวทีให้กว้างเท่าผืนเกมจริง
 *
 * เดิมเวทีกว้างตายตัว 1280 ส่วนผืนเกมกว้างตามสัดส่วนจอ (1280-1920) ฉากจึงต้องเลื่อนกล้อง
 * ให้เวทีอยู่กลางแล้วเหลือขอบสองข้างที่ไม่ใช่พื้นที่เล่น ซึ่ง drawBackground ทาสีคลุมเป็นแถบมืด
 * บนมือถือแนวนอน (21.6:9) แถบนั้นกว้างข้างละ ~180 px = เห็นเป็น "เกมไม่เต็มจอ" ชัดเจน
 *
 * กำแพงเลื่อนออกไปอยู่ขอบจอแทน ระยะจากกำแพงถึงขอบ (wallL) คงเดิม
 * แพลตฟอร์มเลื่อนตามให้อยู่กลางเวทีเหมือนเดิม — ระยะห่างระหว่างแพลตฟอร์มกับความสูงไม่เปลี่ยน
 * จึงไม่กระทบระยะกระโดด/คอมโบที่ playtest ไว้แล้ว ได้แค่พื้นราบสองข้างยาวขึ้น
 */
function setStageWidth(w) {
  const width = Math.max(STAGE_BASE_W, Math.round(w));
  const shift = (width - STAGE_BASE_W) / 2;
  STAGE.w = width;
  STAGE.wallR = width - STAGE.wallL;
  for (let i = 0; i < STAGE.platforms.length; i++) {
    const base = BASE_PLATFORMS[i];
    STAGE.platforms[i].x1 = base.x1 + shift;
    STAGE.platforms[i].x2 = base.x2 + shift;
  }
  return STAGE;
}
const BASE_PLATFORMS = STAGE.platforms.map((p) => ({ x1: p.x1, x2: p.x2 }));

const PHYS = {
  gravity: 0.95, fallMax: 15, fastFall: 22,
  // ไม่มีท่าเดินแล้ว — เคลื่อนที่บนพื้นคือวิ่งอย่างเดียว (ดู running ใน step())
  // run ลดจาก 6.8 เพราะตอนนี้มันคือความเร็วปกติ ไม่ใช่ความเร็วตอนกดเร่ง
  // เว้นช่วงไว้ให้ปุ่ม dash ที่จะทำทีหลังเป็นตัวเร่งแทน
  // walk ไม่ได้ใช้แล้วแต่คงไว้ให้ MOVES/เทสต์เดิมอ้างถึงได้ และเผื่อกลับมาใช้ตอนทำ dash
  walk: 4.3, run: 5.2, groundAccel: 1.1, runAccelMul: 1.3, stopFric: 0.72,
  airAccel: 0.65, airMax: 6.2, airFric: 0.97,
  jumpV: -20, dJumpV: -18, jumpCut: -7,
  coyote: 6, buffer: 8, dashWindow: 14,
  // crouchH ขยับจาก 74 เป็น 88 ให้ตรงกับอาร์ตท่าย่อที่ใช้จริง — คลิปต้นฉบับย่อลึกแบบนั่งยอง (34%)
  // ซึ่งบนจอดูเหมือน "ตัวหดเล็กลง" มากกว่า "ย่อตัว" ฝั่งอาร์ตจึงคูณขึ้น 1.13 (ดู SEQ_SCALE ใน build)
  // กรอบต้องขยับตามไม่งั้นสไปรท์โผล่พ้นกรอบ 38% ซึ่งเห็นชัดมากในห้องซ้อมที่เปิดโชว์ hitbox อยู่
  // ผลต่อการเล่น: ย่อหลบท่าที่ตีสูงได้น้อยลงนิดหน่อย (jab1 ตีช่วง 66-96 เหนือเท้า)
  width: 44, standH: 118, crouchH: 88,
  techWindow: 10, techLockout: 40, techFrames: 10, techRollFrames: 20, techRollSpeed: 7,
  knockdownFrames: 28,
};

// Frame data. hb = hitbox relative to feet (x = near edge in facing dir, y = top, negative is up)
// kb = knockback [x in facing dir, y], stun = hitstun frames
const MOVES = {
  jab1: { label: 'Jab', kind: 'ground', startup: 4, active: 3, recovery: 11, dmg: 3,
    hb: { x: 8, y: -96, w: 70, h: 30 }, kb: [2.5, 0], stun: 17, chain: 'jab2', imp: { f: 3, vx: 2.5 } },
  jab2: { label: 'Cross Slash', kind: 'ground', startup: 5, active: 3, recovery: 12, dmg: 3,
    hb: { x: 8, y: -104, w: 76, h: 46 }, kb: [3, 0], stun: 18, chain: 'jab3', imp: { f: 4, vx: 3 } },
  // ไม้จบของคอมโบจิ้ม — ถีบขึ้นไม่ได้ ไม่งั้นต่อ Thrust Rush ไม่ติด (คู่ต่อสู้ลอยแล้วล้ม = อมตะ)
  jab3: { label: 'Finisher Thrust', kind: 'ground', startup: 7, active: 4, recovery: 20, dmg: 6,
    hb: { x: 10, y: -88, w: 98, h: 26 }, kb: [4, 0], stun: 28, chain: 'thrust1', imp: { f: 6, vx: 7 } },
  side: { label: 'Lunge Stab', kind: 'ground', startup: 9, active: 6, recovery: 20, dmg: 7,
    hb: { x: 12, y: -86, w: 92, h: 28 }, kb: [11, -4], stun: 28, imp: { f: 8, vx: 14 } },
  up: { label: 'Rising Slash', kind: 'ground', startup: 7, active: 6, recovery: 18, dmg: 6,
    hb: { x: -12, y: -172, w: 84, h: 124 }, kb: [1.5, -17.5], stun: 38, jumpCancel: true },
  down: { label: 'Low Sweep', kind: 'ground', crouch: true, startup: 6, active: 4, recovery: 16, dmg: 5,
    hb: { x: 4, y: -34, w: 94, h: 30 }, kb: [3, -11], stun: 30 },
  nair: { label: 'Spin Slash', kind: 'air', startup: 5, active: 9, recovery: 10, dmg: 5,
    hb: { x: -56, y: -132, w: 112, h: 132 }, kb: [3.5, -8], stun: 26, jumpCancel: true },
  sair: { label: 'Dive Thrust', kind: 'air', startup: 7, active: 10, recovery: 14, dmg: 7,
    hb: { x: 6, y: -82, w: 98, h: 30 }, kb: [11, -6], stun: 30, imp: { f: 6, vx: 13, vy: -1.5 }, floaty: true },
  // ---- Thrust Rush: หางคอมโบจิ้ม แทงรัวเดินหน้า 4 จังหวะ (ต่อจาก jab3 ด้วยการกดตีซ้ำ) ----
  // ทำเป็นท่าสั้น 4 ท่าต่อกันด้วย autoChain แทนที่จะเป็นท่าเดียวที่มีหลายหน้าต่างโจมตี
  // เพราะแบบนี้ใช้กลไกเดิมได้ทั้งหมด (hitbox/hitList/แรงดัน/การแม็พเฟรมจาก phase())
  // ไม่ต้องแตะ advanceMove/hitbox ที่เป็นหัวใจของระบบและ playtest มาแล้ว
  // แต่ละจังหวะมีแรงดันไปข้างหน้า = ตัวละครเดินหน้าไปเรื่อย ๆ ตรงกับอาร์ตที่ก้าวเท้าทุกครั้งที่แทง
  // stun ของสามจังหวะแรกตั้งให้ยาวพอให้จังหวะถัดไปตามทัน คู่ต่อสู้จึงโดนครบชุดถ้าโดนจังหวะแรก
  thrust1: { label: 'Thrust Rush', kind: 'ground', startup: 5, active: 3, recovery: 4, dmg: 3,
    hb: { x: 8, y: -92, w: 78, h: 26 }, kb: [1.5, 0], stun: 20, autoChain: 'thrust2', imp: { f: 4, vx: 5 } },
  thrust2: { label: 'Thrust Rush', kind: 'ground', startup: 4, active: 3, recovery: 4, dmg: 3,
    hb: { x: 8, y: -92, w: 82, h: 26 }, kb: [1.5, 0], stun: 20, autoChain: 'thrust3', imp: { f: 3, vx: 5 } },
  thrust3: { label: 'Thrust Rush', kind: 'ground', startup: 4, active: 3, recovery: 4, dmg: 3,
    hb: { x: 8, y: -92, w: 86, h: 26 }, kb: [1.5, 0], stun: 20, autoChain: 'thrust4', imp: { f: 3, vx: 5 } },
  // ไม้จบ: แทงสองมือ แรงกว่า ดันคู่ต่อสู้ออกไปจริง ๆ แล้วจบคอมโบ (ไม่มี autoChain)
  thrust4: { label: 'Thrust Rush', kind: 'ground', startup: 6, active: 4, recovery: 20, dmg: 7,
    hb: { x: 10, y: -90, w: 100, h: 30 }, kb: [12, -5], stun: 30, imp: { f: 5, vx: 9 } },

  // ---- สกิล 2 Fox Step: พุ่งทะลุตัวคู่ต่อสู้ แล้วหันกลับมาเฉือน (ปุ่ม 2) ----
  // iframes ครอบช่วงพุ่งทั้งหมด ซึ่งทำให้ "ทะลุตัว" ได้ฟรีด้วย เพราะ pushApart ข้ามคนที่ invuln อยู่แล้ว
  // hitbox ตั้ง x ติดลบ = กรอบลากอยู่ "รอบตัว" ไม่ใช่ยื่นไปข้างหน้า จึงโดนตอนวิ่งผ่านสวนกัน
  fox1: { label: 'Fox Step', kind: 'ground', startup: 5, active: 8, recovery: 6, dmg: 4,
    hb: { x: -44, y: -104, w: 92, h: 62 }, kb: [2, 0], stun: 24,
    iframes: [3, 15], imp: { f: 5, vx: 17 }, glide: true, autoChain: 'fox2' },
  // ท่าสอง: faceFoe = หันเข้าหาคู่ต่อสู้ก่อนออกท่า ถ้าเมื่อกี้พุ่งทะลุไปด้านหลังก็หันกลับมาเองพอดี
  // ต้องมีแรงพุ่งกลับเข้าหา (vx 9) ด้วย ไม่ใช่แค่หันหน้า — ยิ่งเริ่มพุ่งจากระยะประชิด
  // ยิ่งทะลุเลยไปไกล ถ้ายืนฟันอยู่กับที่จะเอื้อมไม่ถึงแบบเฉียดฉิว (วัดได้ พลาดไป 2 px)
  fox2: { label: 'Fox Step', kind: 'ground', startup: 5, active: 4, recovery: 12, dmg: 5,
    hb: { x: 2, y: -108, w: 96, h: 66 }, kb: [7, -6], stun: 26, faceFoe: true, imp: { f: 4, vx: 9 } },

  // ---- สกิล 2 Stone Curse (คำสาปศิลา): ขว้างมีด 3 เล่ม แล้วกดซ้ำเพื่อวาร์ปไปที่เล่มกลาง (ปุ่ม 2) ----
  // เล่มบน/ล่างเป็นแค่ดาเมจ เล่มกลางคือ "หมุด" — หยุดตรงจุดที่ปะทะแล้วค้างไว้ให้วาร์ปตาม
  // โดนตัว = วาร์ปไปติดตัวเขาเลย · พลาด = ได้ระยะเข้าหาแทน ใช้ได้ทั้งสองทาง
  curse1: { label: 'Stone Curse', kind: 'ground', startup: 7, active: 1, recovery: 16, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, warpFollow: 'curse2',
    shots: [{ vy: -3.4 }, { vy: 0, anchor: true }, { vy: 3.4 }], shotAt: 7, shotDmg: 3, shotStun: 18 },
  // กดซ้ำ: หายตัวไปโผล่ที่หมุดพร้อมฟันสวน — ไม่มีแรงถีบขึ้น จะได้ต่อคอมโบจิ้มได้ทันที
  curse2: { label: 'Stone Curse', kind: 'ground', startup: 5, active: 4, recovery: 14, dmg: 6,
    hb: { x: -30, y: -112, w: 92, h: 72 }, kb: [4, 0], stun: 28,
    iframes: [0, 9], warpAnchor: true, faceFoe: true },

  // ---- สกิล 3 Oni Veil (อัลติ): หายตัวสลับโผล่ฟัน 4 จังหวะ (ปุ่ม 3 ใช้หลอด ki เต็ม) ----
  // จังหวะแรกไม่มีดาเมจ เป็นช่วงสวมหน้ากาก + วาร์ปไปอีกฝั่งของคู่ต่อสู้
  ult1: { label: 'Oni Veil', kind: 'ground', startup: 8, active: 0, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    iframes: [0, 18], warp: true, autoChain: 'ult2' },
  // สองจังหวะกลางต้องถีบขึ้นเป็น 0 เท่านั้น: ถีบขึ้นแม้นิดเดียวจะทำให้คู่ต่อสู้ลอย
  // พอตกลงพื้นระหว่างคอมโบก็กลายเป็นท่าล้ม ซึ่งมี invuln ติดมาด้วย จังหวะถัดไปจึงฟันลมทั้งดุ้น
  // (วัดได้จริง: อัลติทำได้ 18 แทนที่จะเป็น 24 เพราะจังหวะที่สามหายไปทั้งจังหวะ) ไม้จบค่อยถีบออก
  ult2: { label: 'Oni Veil', kind: 'ground', startup: 6, active: 4, recovery: 8, dmg: 6,
    hb: { x: -50, y: -120, w: 104, h: 76 }, kb: [1.5, 0], stun: 34,
    iframes: [0, 18], faceFoe: true, autoChain: 'ult3' },
  ult3: { label: 'Oni Veil', kind: 'ground', startup: 6, active: 4, recovery: 10, dmg: 6,
    hb: { x: -50, y: -120, w: 104, h: 76 }, kb: [1.5, 0], stun: 34,
    iframes: [0, 20], warp: true, autoChain: 'ult4' },
  // ไม้จบ: ปักมีดลงพื้น ถีบออกแรง + น็อคลง · recovery ยาวและไม่มี iframes = จุดเสี่ยงของท่านี้
  ult4: { label: 'Oni Veil', kind: 'ground', startup: 8, active: 5, recovery: 24, dmg: 12,
    hb: { x: -30, y: -108, w: 92, h: 108 }, kb: [14, -12], stun: 40,
    iframes: [0, 13], faceFoe: true },

  dair: { label: 'Plunge', kind: 'air', startup: 8, active: 90, recovery: 0, dmg: 6,
    hb: { x: -26, y: -32, w: 52, h: 48 }, kb: [2, -12], stun: 30, imp: { f: 7, vxMul: 0.3, vy: 17 },
    untilLand: true, landLag: 14, pogo: -12 },
};

/**
 * สล็อตสกิล — ลำดับในนี้ตรงกับปุ่มสกิล 1/2/3 บนจอและคีย์ 1/2/3
 * ค่าคือ "ท่าแรก" ของสกิลนั้น ที่เหลือต่อกันเองด้วย autoChain
 * null = สล็อตที่เตรียมไว้แต่ยังไม่มีสกิล — กดแล้วไม่เกิดอะไร และปุ่มบนจอจะขึ้นเป็นสีจาง
 * เพิ่มสกิลใหม่ = ใส่ท่าใน MOVES แล้วใส่ชื่อท่าแรกตรงนี้ ไม่ต้องแตะที่อื่นอีก
 */
// กติกาของชุดนี้: **ใส่หน้ากาก = สกิล · หน้าเปล่า = ท่าปกติ** อ่านออกจากภาพได้ทันทีว่าอะไรเป็นอะไร
// Thrust Rush จึงย้ายออกจากช่องสกิลไปเป็นหางของคอมโบจิ้ม (jab3 -> thrust1) เพราะไม่มีหน้ากาก
const SKILLS = ['fox1', 'curse1', 'ult1'];
// คูลดาวน์ต่อสล็อต (เฟรม) — สล็อต 3 ไม่ใช้เวลา แต่ใช้หลอด ki ที่เติมจากดาเมจ
const SKILL_CD = [150, 240, 0];
const KI_MAX = 100;
/**
 * ===================== HELIOS =====================
 * สายไฟต์เตอร์มือเปล่า — คู่ตรงข้าม Nyx: Nyx ย้ายตำแหน่ง Helios เกาะติดแล้วรัวยาว
 *
 * ทุกท่าตั้งใจ "ไม่ถีบคู่ต่อสู้ออก" (kb แนวนอนต่ำ แนวตั้ง 0) และตัวเองเดินหน้าตามไปด้วย
 * ถ้าถีบออกเหมือนท่าปกติทั่วไป คอมโบจะขาดตั้งแต่ไม้ที่สอง ซึ่งขัดกับทั้งคอนเซปต์ของตัวนี้
 */
const HELIOS_MOVES = {
  // ---- ท่าพื้นฐาน ----
  jab1: { label: 'Jab', kind: 'ground', startup: 3, active: 3, recovery: 9, dmg: 3,
    hb: { x: 8, y: -100, w: 62, h: 28 }, kb: [2, 0], stun: 16, chain: 'jab2', imp: { f: 3, vx: 2 } },
  jab2: { label: 'Cross', kind: 'ground', startup: 4, active: 3, recovery: 11, dmg: 3,
    hb: { x: 8, y: -100, w: 68, h: 28 }, kb: [2.5, 0], stun: 17, chain: 'jab3', imp: { f: 3, vx: 2.5 } },
  jab3: { label: 'Overhand', kind: 'ground', startup: 6, active: 4, recovery: 18, dmg: 6,
    hb: { x: 10, y: -96, w: 84, h: 34 }, kb: [4, 0], stun: 26, imp: { f: 5, vx: 5 } },
  side: { label: 'Lunge Straight', kind: 'ground', startup: 8, active: 5, recovery: 19, dmg: 7,
    hb: { x: 12, y: -94, w: 88, h: 30 }, kb: [9, -3], stun: 27, imp: { f: 7, vx: 13 } },
  up: { label: 'Uppercut', kind: 'ground', startup: 6, active: 5, recovery: 18, dmg: 6,
    hb: { x: -10, y: -168, w: 76, h: 116 }, kb: [1.5, -16], stun: 36, jumpCancel: true },
  down: { label: 'Low Sweep', kind: 'ground', crouch: true, startup: 5, active: 4, recovery: 15, dmg: 5,
    hb: { x: 4, y: -34, w: 88, h: 30 }, kb: [3, -9], stun: 28 },
  nair: { label: 'Spin Kick', kind: 'air', startup: 5, active: 8, recovery: 10, dmg: 5,
    hb: { x: -50, y: -128, w: 104, h: 120 }, kb: [3, -7], stun: 24, jumpCancel: true },
  sair: { label: 'Flying Kick', kind: 'air', startup: 6, active: 9, recovery: 13, dmg: 7,
    hb: { x: 6, y: -86, w: 94, h: 34 }, kb: [10, -5], stun: 28, imp: { f: 5, vx: 12, vy: -1.5 }, floaty: true },
  dair: { label: 'Axe Kick', kind: 'air', startup: 7, active: 90, recovery: 0, dmg: 6,
    hb: { x: -24, y: -34, w: 48, h: 50 }, kb: [2, -11], stun: 28, imp: { f: 6, vxMul: 0.3, vy: 16 },
    untilLand: true, landLag: 13, pogo: -11 },

  // ---- สกิล 1 Chain Rush: หมัด-หมัด-เตะ-หมัด-เตะ แล้วไม้จบแยกสามทางตามปุ่มทิศ ----
  rush1: { label: 'Chain Rush', kind: 'ground', startup: 4, active: 3, recovery: 3, dmg: 3,
    hb: { x: 6, y: -100, w: 66, h: 28 }, kb: [1.2, 0], stun: 18, autoChain: 'rush2', imp: { f: 3, vx: 4 } },
  rush2: { label: 'Chain Rush', kind: 'ground', startup: 3, active: 3, recovery: 3, dmg: 3,
    hb: { x: 6, y: -100, w: 70, h: 28 }, kb: [1.2, 0], stun: 18, autoChain: 'rush3', imp: { f: 3, vx: 4 } },
  rush3: { label: 'Chain Rush', kind: 'ground', startup: 3, active: 3, recovery: 3, dmg: 3,
    hb: { x: 6, y: -74, w: 78, h: 30 }, kb: [1.2, 0], stun: 18, autoChain: 'rush4', imp: { f: 3, vx: 4 } },
  rush4: { label: 'Chain Rush', kind: 'ground', startup: 3, active: 3, recovery: 3, dmg: 3,
    hb: { x: 6, y: -104, w: 74, h: 30 }, kb: [1.2, 0], stun: 18, autoChain: 'rush5', imp: { f: 3, vx: 4 } },
  // จังหวะที่ 5 แยกทางตามปุ่มทิศที่กดค้าง: ไม่กด = หมัดตรง · ขึ้น = เตะยกคาง · ลง = กวาดขา
  rush5: { label: 'Chain Rush', kind: 'ground', startup: 3, active: 3, recovery: 4, dmg: 3,
    hb: { x: 6, y: -96, w: 80, h: 34 }, kb: [1.2, 0], stun: 18, imp: { f: 3, vx: 4 },
    branch: { neutral: 'rushEndF', up: 'rushEndU', down: 'rushEndD' } },
  rushEndF: { label: 'Chain Rush', kind: 'ground', startup: 5, active: 4, recovery: 20, dmg: 7,
    hb: { x: 10, y: -98, w: 96, h: 34 }, kb: [13, -4], stun: 30, imp: { f: 4, vx: 7 } },
  rushEndU: { label: 'Chain Rush', kind: 'ground', startup: 5, active: 5, recovery: 22, dmg: 6,
    hb: { x: -8, y: -170, w: 80, h: 120 }, kb: [1.5, -17], stun: 38, jumpCancel: true },
  rushEndD: { label: 'Chain Rush', kind: 'ground', crouch: true, startup: 5, active: 4, recovery: 20, dmg: 6,
    hb: { x: 4, y: -34, w: 96, h: 30 }, kb: [3, -12], stun: 32 },

  // ---- สกิล 2 Knee Drive: พุ่งเข่า ดันคู่ต่อสู้ไปข้างหน้า และเปิดให้ใช้ชุดรัวซ้ำได้ ----
  knee: { label: 'Knee Drive', kind: 'ground', startup: 6, active: 5, recovery: 16, dmg: 5,
    hb: { x: 8, y: -102, w: 76, h: 46 }, kb: [6, 0], stun: 26,
    glide: true, imp: { f: 5, vx: 13 }, refresh: ['rush1'] },

  // ---- สกิล 3 Hundred Hands (อัลติ): รัวหมัดเตะ กดรัวเพิ่มจำนวนทีได้ ----
  hh1: { label: 'Hundred Hands', kind: 'ground', startup: 6, active: 3, recovery: 2, dmg: 2,
    hb: { x: 6, y: -100, w: 76, h: 34 }, kb: [0.8, 0], stun: 20, autoChain: 'hh2', imp: { f: 4, vx: 2 },
    // กดรัวต่อรอบได้สูงสุดกี่รอบ — นับต่อการกดสกิลหนึ่งครั้ง
    // 9 รอบวัดได้ 51 ดาเมจ ซึ่งแรงกว่าอัลติของ Nyx (22) เท่าตัว ลดเหลือ 5
    mashMax: 5 },
  hh2: { label: 'Hundred Hands', kind: 'ground', startup: 2, active: 3, recovery: 2, dmg: 2,
    hb: { x: 6, y: -100, w: 76, h: 34 }, kb: [0.8, 0], stun: 20, autoChain: 'hh3', imp: { f: 2, vx: 2 } },
  // hh3 วนกลับมา hh2 ได้เรื่อย ๆ ถ้าผู้เล่นกดปุ่มรัว — mashChain จำกัดจำนวนรอบไว้ที่ mashMax
  hh3: { label: 'Hundred Hands', kind: 'ground', startup: 2, active: 3, recovery: 2, dmg: 2,
    hb: { x: 6, y: -76, w: 82, h: 36 }, kb: [0.8, 0], stun: 20, imp: { f: 2, vx: 2 },
    mashChain: 'hh2', autoChain: 'hhEnd' },
  hhEnd: { label: 'Hundred Hands', kind: 'ground', startup: 6, active: 5, recovery: 26, dmg: 8,
    hb: { x: 10, y: -100, w: 104, h: 40 }, kb: [17, -6], stun: 40, imp: { f: 5, vx: 9 } },
};

const HELIOS_SKILLS = ['rush1', 'knee', 'hh1'];
const HELIOS_SKILL_CD = [120, 200, 0];

/* ================== ALECTO — สายคุมพื้นที่ ==================
 *
 * ท่าตีปกติเป็นแส้: ระยะไกลที่สุดในเกม แลกกับออกช้าที่สุดและดาเมจต่อครั้งต่ำสุด
 * ฟาดโดนสะสม "ตรารอยแส้" ที่ตัวคนโดน ยิ่งมีตรายิ่งเจ็บและยิ่งเดินช้า (ดู docs/ALECTO_KIT.md)
 */

// ตรารอยแส้ — อยู่ที่ตัวคนโดน ไม่ใช่ตัวเธอ (เล่นหลายคนทีหลังจะได้แยกรายเป้าหมายเอง)
const LASH_MAX = 5;          // เพดานชั้น
const LASH_DELAY = 90;       // ไม่โดนแส้ครบกี่เฟรมถึงเริ่มสลาย (1.5 วินาที)
const LASH_EVERY = 30;       // สลายชั้นละกี่เฟรมหลังจากนั้น
const LASH_DMG = 0.08;       // ดาเมจแส้ +8% ต่อชั้น
const LASH_SLOW = 0.06;      // คนโดนเดินช้าลง 6% ต่อชั้น
// เพดานเพิ่ม x1.40 ต้องเล็กกว่าเพดานลดดาเมจตามความยาวคอมโบ x0.50 เสมอ
// ไม่งั้นคอมโบยิ่งยาวยิ่งแรง = เปิดช่องคอมโบวนไม่รู้จบที่ระบบลดดาเมจกันไว้ตั้งแต่ต้น

// ท่าตั้งป้อมยืนยิง — กดสกิลครั้งเดียวแล้วปักหลักยิงยาวเท่านี้เฟรม
// สกิล 1 สั้นกว่าเพราะเล่นจริงแล้ว 5 วินาทีขาตาย โดนบุกเข้ามาแล้วทำอะไรไม่ได้เลย
// อัลติยาวกว่าได้ เพราะจ่ายหลอด ki เต็มไปแล้วและตั้งใจให้เป็นการทุ่มหมดหน้าตัก
// ---------- อัลติ Dust Devil ของ Alecto ----------
// ไม่ใช่ท่าทำดาเมจ แต่เป็นท่าเอาตัวรอดตอนโดนรุม — ผู้เล่นรายงานว่าคนเล่นเธอโดนรุมประจำ
const DUST_HALF = 200;       // ครึ่งความกว้างของวง — กว้างกว่ากองไฟ (62) สามเท่า
const DUST_LIFE = 300;       // วงฝุ่นอยู่กี่เฟรม (5 วินาที)
const DUST_DR = 0.45;        // อยู่ในวงแล้วดาเมจที่รับเหลือเท่าไหร่
const VEIL_TIME = 45;        // ออกจากวงแล้วยังจาง ๆ ต่ออีกกี่เฟรม — ช่วงนี้คือเวลาหนี

const STANCE_FRAMES = 180;        // 3 วินาที (สกิล 1)
// ---------- ระบบแพ้ชนะ ----------
// เลือดหมดหนึ่งครั้ง = เสียหลอดหนึ่งหลอด ไม่ใช่จบเกม
// เกมนี้ต่อสู้กันไวมาก ยกเดียวจบภายในไม่กี่วินาที จึงให้คนละสามหลอด
const ROUND_BARS = 3;
const KO_FREEZE = 110;       // แช่กี่เฟรมหลังน็อก ให้ได้เห็นท่าล้มก่อนขึ้นยกใหม่

const SOLO_FRAMES = 240;     // อัลติของ Orpheus โซโล่กี่เฟรม (4 วินาที)
const ULT_STANCE_FRAMES = 300;    // 5 วินาที (อัลติ)

// กองไฟจากมอลอตอฟ
const FIRE_LIFE = 240;       // อยู่บนพื้นกี่เฟรม (4 วินาที)
const FIRE_HALF = 62;        // ครึ่งความกว้างของกอง
const FIRE_TICK = 24;        // กินเลือดทุกกี่เฟรม
const FIRE_DMG = 2;

// เฟรมเดต้าชุดนี้ปรับลงเมื่อวัดแล้วพบว่าเธอจ่ายค่า "ช้าและเอื้อมไกล" สองต่อ
// ทั้งออกช้าและค้างนาน แต่ไม่ได้อะไรกลับมาเลย ไม่มีเกราะ ไม่มีเลือดพิเศษ ไม่มีต้านสถานะ
// ขณะที่ Atlas ที่ช้ากว่าได้เลือด 130 + เกราะ + resist 0.5 มาจ่ายค่านั้น
// และ Orpheus เอื้อมเกือบเท่ากัน (124 เทียบ 128) แต่ท่าครบชุดเร็วกว่า 6 เฟรม
const ALECTO_MOVES = {
  // ---- ท่าตีปกติ: แส้ ----
  // ระยะ (hb.w) ยาวกว่าของ Nyx/Helios ราวเท่าตัว แลกกับ startup ที่ช้ากว่าทุกตัวในเกม
  jab1: { label: 'Lash', kind: 'ground', startup: 6, active: 3, recovery: 11, dmg: 3,
    hb: { x: 10, y: -104, w: 118, h: 30 }, kb: [2, 0], stun: 17, chain: 'jab2', lash: true },
  jab2: { label: 'Cross Lash', kind: 'ground', startup: 7, active: 3, recovery: 14, dmg: 3,
    hb: { x: 10, y: -98, w: 126, h: 40 }, kb: [2.5, 0], stun: 18, chain: 'jab3', lash: true },
  // ไม้จบผลักออกไกล = คืนระยะให้ตัวเอง เป็นท่าไล่คนที่เข้ามาแนบด้วย
  // kb แนวตั้งต้องเป็น 0 ไม่งั้นคนโดนลอยแล้วล้ม ซึ่งมีอมตะติดมา คอมโบขาดทันที
  jab3: { label: 'Whip Crack', kind: 'ground', startup: 9, active: 4, recovery: 22, dmg: 7,
    hb: { x: 12, y: -100, w: 140, h: 36 }, kb: [14, 0], stun: 26, lash: true },
  // ลากเข้ามา: kb แกน x ติดลบ = ดึงเข้าหาตัวเธอ ตัวเปิดคอมโบจากระยะที่คนอื่นเอื้อมไม่ถึง
  side: { label: 'Rope Pull', kind: 'ground', startup: 10, active: 5, recovery: 20, dmg: 4,
    hb: { x: 20, y: -96, w: 172, h: 30 }, kb: [-9, 0], stun: 30, lash: true },
  up: { label: 'Sky Crack', kind: 'ground', startup: 9, active: 6, recovery: 17, dmg: 5,
    hb: { x: -10, y: -182, w: 100, h: 132 }, kb: [1.5, -16], stun: 36, jumpCancel: true, lash: true },
  down: { label: 'Ground Lash', kind: 'ground', crouch: true, startup: 8, active: 4, recovery: 18, dmg: 4,
    hb: { x: 6, y: -34, w: 132, h: 30 }, kb: [3, -10], stun: 28, lash: true },
  nair: { label: 'Air Coil', kind: 'air', startup: 6, active: 9, recovery: 12, dmg: 4,
    hb: { x: -60, y: -138, w: 132, h: 132 }, kb: [3, -7], stun: 24, jumpCancel: true, lash: true },
  sair: { label: 'Dive Lash', kind: 'air', startup: 8, active: 9, recovery: 15, dmg: 5,
    hb: { x: 10, y: -88, w: 142, h: 32 }, kb: [9, -5], stun: 28,
    imp: { f: 7, vx: 10, vy: -1 }, floaty: true, lash: true },
  dair: { label: 'Down Lash', kind: 'air', startup: 9, active: 8, recovery: 16, dmg: 5,
    hb: { x: -20, y: -44, w: 112, h: 84 }, kb: [4, -4], stun: 26, lash: true },

  // ---- สกิล 1 Gunslinger: สลับระหว่างแส้กับไรเฟิล (ปุ่ม 1) ----
  //
  // ของเดิมเป็นชุดรีวอลเวอร์สามนัดที่ย้ายไปอยู่ครึ่งหลังของสกิล 2 แทน
  // ปุ่มนี้กลายเป็นสวิตช์อาวุธถาวร: กดทีสลับที กดอีกทีสลับกลับ ไม่มีตัวนับเวลา
  //
  // สองอาวุธนี้แก้ปัญหาคนละแบบ ไม่ใช่อันหนึ่งดีกว่าอีกอัน
  //   แส้   = ดาเมจสูง กรอบใหญ่ ติดตรารอยแส้ (ทำให้ช้า) แต่ต้องเข้าระยะกลาง
  //   ไรเฟิล = ดาเมจต่อนัดน้อย ไม่ติดตรา แต่ยิงข้ามเวทีได้และ **เดินยิงได้**
  // คนเล่นที่โดนรุมกดเลือกถอยออกมายิงได้ แทนที่จะต้องยืนแลกในระยะที่เธอเสียเปรียบ
  //
  // คูลดาวน์สั้น (1 วินาที) เพราะนี่ไม่ใช่ท่าโจมตี แต่ต้องมีเพื่อไม่ให้กดรัวสลับหนีท่าที่กำลังจะโดน
  swap1: { label: 'Gunslinger', kind: 'ground', startup: 5, active: 3, recovery: 8, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, toggle: true },

  // ---- ท่าตีปกติชุดที่สอง: ไรเฟิล (ใช้เมื่อสลับด้วยสกิล 1 แล้ว) ----
  //
  // ทุกท่าเป็นกระสุนจริง ไม่ใช่กรอบโจมตียาว ๆ — ยิงข้ามเวทีได้ กันได้ และโดนวงฝุ่นลดดาเมจด้วย
  // ทุกท่าบนพื้นติดธง mobile = ย่องไปมาระหว่างยิงได้ นี่คือ "เดินยิง" ที่คนเล่นขอ
  // (ฝั่งวาดสลับไปเล่นวงจรเดินถือปืนให้เองเมื่อเคลื่อนที่จริง — ดู ScrambleScene)
  //
  // วัดแล้วรอบแรกตั้งไว้สูงไป: ประชิดแล้วปืนเจ็บกว่าแส้ (14 เทียบ 13) ทั้งที่ควรตรงข้าม
  // เพราะท่าปืนสั้นกว่าและกระสุนถึงตัวทันทีในระยะประชิด — ปืนเลยชนะทุกระยะ สวิตช์ก็ไม่ใช่การเลือก
  // ดาเมจรวมทั้งชุดจึงเหลือ 5 เทียบกับแส้ 13 และไม่ติดตรารอยแส้เลย
  // ราคาของ "ปลอดภัย + ยิงได้ทั้งเวที" คือดาเมจ ไม่ใช่ความเร็ว — คนที่โดนรุมต้องได้ของที่ใช้ได้จริง
  gjab1: { label: 'Hip Fire', kind: 'ground', startup: 5, active: 3, recovery: 8, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, mobile: 0.5,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 1, shotStun: 12, shotKb: 2, shotRange: 520, chain: 'gjab2' },
  gjab2: { label: 'Hip Fire', kind: 'ground', startup: 4, active: 3, recovery: 9, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, mobile: 0.5,
    shots: [{ vy: 0 }], shotAt: 4, shotDmg: 1, shotStun: 12, shotKb: 3, shotRange: 520, chain: 'gjab3' },
  // ไม้จบ: ปักเท้ายิง (ไม่มี mobile) ดันออกแรงพอเปิดระยะได้จริง แลกกับค้างนาน
  gjab3: { label: 'Kick Back', kind: 'ground', startup: 5, active: 4, recovery: 18, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 3, shotStun: 20, shotKb: 9, shotRange: 520 },
  // กดทิศ = เดินยิง ขยับได้มากที่สุดในชุด เป็นท่าที่ใช้ถอยพลางยิงพลางตอนโดนไล่
  gside: { label: 'Walking Fire', kind: 'ground', startup: 4, active: 3, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, mobile: 0.6,
    shots: [{ vy: 0 }], shotAt: 4, shotDmg: 1, shotStun: 12, shotKb: 2, shotRange: 520 },
  // สวนคนกระโดด: กระสุนพุ่งเฉียงขึ้น ระยะสั้นกว่าเพราะลอยพ้นหัวไปเร็ว
  gup: { label: 'Skyward Shot', kind: 'ground', startup: 6, active: 4, recovery: 14, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: -7 }], shotAt: 6, shotDmg: 2, shotStun: 18, shotKb: 4, shotRange: 320 },
  // ยิงต่ำ: ตัวเตี้ยลงด้วย (crouch) จึงลอดท่าที่ตีสูงได้ไปในตัว
  gdown: { label: 'Knee Shot', kind: 'ground', crouch: true, startup: 5, active: 3, recovery: 13, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 1, shotStun: 14, shotKb: 2, shotLow: true, shotRange: 520 },

  // ---- สกิล 2 ครึ่งหลัง Fan the Hammer: สับไกรีวอลเวอร์เป็นชุด ดันคนออกจากหน้า ----
  //
  // ของเดิมเป็นท่าตั้งป้อมยืนยิง 3 วินาที ซึ่งไม่ได้แก้ปัญหาของเธอเลย
  // ยิงไปก็ยังโดนยืนกดอยู่ที่เดิม ผู้เล่นรายงานว่า "โดนรุมประจำ"
  // เปลี่ยนเป็นชุดสั้นสามจังหวะที่ **ดันออก** แล้วกลับมาถืออาวุธเดิมเอง
  // สามจังหวะแรงขึ้นเรื่อย ๆ จังหวะสุดท้ายดันแรงพอเปิดระยะได้จริง
  shot1: { label: 'Fan the Hammer', kind: 'ground', startup: 5, active: 4, recovery: 5, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 2, shotStun: 12, shotKb: 4, autoChain: 'shot2' },
  shot2: { label: 'Fan the Hammer', kind: 'ground', startup: 3, active: 4, recovery: 5, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: 0 }], shotAt: 3, shotDmg: 2, shotStun: 12, shotKb: 6, autoChain: 'shot3' },
  // จังหวะจบ: กระสุนแรงสุดและดันไกลสุด · ค้างนานกว่าเพื่อนเพื่อจ่ายค่าที่เปิดระยะได้ฟรี
  shot3: { label: 'Fan the Hammer', kind: 'ground', startup: 3, active: 5, recovery: 16, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    shots: [{ vy: 0 }], shotAt: 3, shotDmg: 3, shotStun: 20, shotKb: 13 },

  // ---- สกิล 2 Firewater: ขว้างมอลอตอฟ แล้วรัวรีวอลเวอร์ต่อ (ปุ่ม 2) ----
  //
  // ขว้างระเบิดคือ "ตัวเปิด" ไม่ใช่ทั้งหมดของสกิล — ขว้างจบแล้วสับไกลูกโม่ต่อทันที
  // กองไฟกันทางไว้ข้างหน้า ชุดกระสุนดันคนออก = กดครั้งเดียวได้ทั้งกำแพงและระยะ
  // (โหมดไรเฟิลชั่วคราวย้ายไปเป็นท่าตีปกติถาวรของสกิล 1 แล้ว ไม่ต้องมีตัวนับเวลาอีก)
  fire1: { label: 'Firewater', kind: 'ground', startup: 7, active: 5, recovery: 6, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, autoChain: 'fire2' },
  // ขว้างแล้วเกิดกองไฟข้างหน้า — วิถีขวดเป็นแค่เอฟเฟค ตำแหน่งกองไฟคงที่เพื่อให้สองเครื่องตรงกัน
  fire2: { label: 'Firewater', kind: 'ground', startup: 6, active: 6, recovery: 6, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    firePool: { at: 7, dx: 200 }, autoChain: 'shot1' },

  // ---- สกิล 3 Dust Devil (อัลติ): ปาถุงฝุ่นลงพื้น หายเข้าไปในวง (ปุ่ม 3 ใช้หลอด ki เต็ม) ----
  //
  // อัลติที่ไม่ได้ทำดาเมจ แต่ซื้อเวลาให้รอด — ตัวเธอเปราะและไม่มีทางออกเวลาโดนไล่ต้อน
  // อยู่ในวง: ดาเมจที่รับเหลือ 45% · กันสถานะทุกชนิด · คนอื่นแทบมองไม่เห็น
  // ออกจากวง: ยังจางต่ออีก 45 เฟรม = มีเวลาหนีจริง ไม่ใช่โผล่มาให้ตีต่อทันที
  dust1: { label: 'Dust Devil', kind: 'ground', startup: 6, active: 4, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, autoChain: 'dust2' },
  // ปาลงที่เท้าตัวเอง ไม่ใช่ขว้างไปไกลแบบมอลอตอฟ — วงต้องเกิดตรงที่เธอยืนถึงจะหนีทัน
  dust2: { label: 'Dust Devil', kind: 'ground', startup: 5, active: 5, recovery: 14, dmg: 3,
    hb: { x: -40, y: -70, w: 150, h: 80 }, kb: [5, 0], stun: 18, dustPool: { at: 6 } },

  // ---- ท่าถอย: กดทิศถอยค้างไว้ตอนกดสกิล 1/2 จะถอยก่อนแล้วค่อยใช้อาวุธ ----
  // ตั้งใจไม่ใส่ iframes — ต้องสวนได้ ไม่งั้นกลายเป็นวาร์ปของ Nyx ที่ไม่มีคูลดาวน์
  hop: { label: 'Backstep', kind: 'ground', startup: 3, active: 5, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    imp: { f: 2, vx: -13 }, glide: true, autoChain: 'swap1' },
  // กลิ้งถอยต้องมีช่วงอมตะ ไม่งั้นมันไม่ใช่ "ท่าหนี" — กลิ้งไปก็โดนตีอยู่ดี
  // นี่คือท่าป้องกันตัวท่าเดียวของเธอ และเดิมไม่มี iframes เลยสักเฟรม
  // เทียบ: วาร์ปของ Nyx มี iframes [0,9] และ [0,18]
  // กระโดดถอย (hop) ไม่ให้ เพื่อให้มีทางเลือก: hop ไวแต่ไม่อมตะ · roll ช้ากว่าแต่รอด
  roll: { label: 'Roll Back', kind: 'ground', startup: 3, active: 6, recovery: 5, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    iframes: [0, 9], imp: { f: 2, vx: -15 }, glide: true, autoChain: 'fire2' },
};

/* ================== ATLAS — สายแท้งค์ ==================
 *
 * เสือขาวถือดาบไฟ · เลือด 130 · ช้าที่สุด ตัวใหญ่ที่สุด ค้างท่านานที่สุด
 * กลไกหลักคือ "เกราะทน" — โดนตีแล้วเจ็บ แต่ไม่ถูกดีดออกจากท่า (ดู docs/ATLAS_KIT.md)
 * ไม่ได้ใส่ทุกท่า มีเฉพาะไม้จบกับสกิล ไม่งั้นกดไม่ขึ้นเลย
 */
const ARMOR_DMG = 0.6;      // ดาเมจที่กินตอนเกราะรับไว้
const SKYFALL_RANGE = 900;  // คลื่นอัลติวิ่งได้ไกลแค่ไหน (เกือบสุดจอ)

const ATLAS_MOVES = {
  // ---- ท่าตีปกติ: ดาบใหญ่ ----
  // ระยะอยู่ระหว่าง Helios (62) กับแส้ Alecto (118) · ออกช้ากว่าทั้งคู่ แต่ดาเมจต่อทีสูงสุด
  jab1: { label: 'Cleave', kind: 'ground', startup: 8, active: 4, recovery: 16, dmg: 5,
    hb: { x: 10, y: -106, w: 92, h: 46 }, kb: [3, 0], stun: 18, chain: 'jab2' },
  jab2: { label: 'Backcleave', kind: 'ground', startup: 8, active: 4, recovery: 17, dmg: 5,
    hb: { x: 10, y: -100, w: 98, h: 54 }, kb: [3, 0], stun: 19, chain: 'jab3' },
  // ไม้จบมีเกราะ — จุดที่เขา "แลกหมัด" แล้วได้เปรียบ
  jab3: { label: 'Overhead', kind: 'ground', startup: 11, active: 5, recovery: 24, dmg: 9,
    hb: { x: 12, y: -112, w: 110, h: 62 }, kb: [12, 0], stun: 30, armor: 1 },
  side: { label: 'Heavy Thrust', kind: 'ground', startup: 12, active: 6, recovery: 26, dmg: 9,
    hb: { x: 14, y: -94, w: 130, h: 32 }, kb: [13, 0], stun: 30,
    imp: { f: 10, vx: 11 }, glide: true, armor: 1 },
  up: { label: 'Rising Cut', kind: 'ground', startup: 10, active: 6, recovery: 22, dmg: 8,
    hb: { x: -14, y: -188, w: 102, h: 138 }, kb: [2, -16], stun: 36, jumpCancel: true },
  down: { label: 'Low Sweep', kind: 'ground', crouch: true, startup: 9, active: 5, recovery: 20, dmg: 7,
    hb: { x: 6, y: -36, w: 118, h: 32 }, kb: [4, -10], stun: 28 },
  nair: { label: 'Air Spin', kind: 'air', startup: 7, active: 9, recovery: 14, dmg: 7,
    hb: { x: -56, y: -142, w: 126, h: 138 }, kb: [3, -7], stun: 26, jumpCancel: true },
  sair: { label: 'Air Thrust', kind: 'air', startup: 9, active: 9, recovery: 16, dmg: 8,
    hb: { x: 10, y: -92, w: 122, h: 36 }, kb: [10, -5], stun: 30,
    imp: { f: 8, vx: 9, vy: -1 }, floaty: true },
  dair: { label: 'Air Chop', kind: 'air', startup: 10, active: 8, recovery: 18, dmg: 8,
    hb: { x: -24, y: -46, w: 112, h: 90 }, kb: [5, -4], stun: 28 },

  // ---- สกิล 1 Ironbreak: ถลาไปข้างหน้าพร้อมเกราะหนา ทะลุกระสุนได้ (ปุ่ม 1) ----
  // เกราะ 3 ชั้นครอบทั้งช่วงพุ่ง = เดินฝ่าการจิ้มสกัดเข้ามาได้จริง ซึ่งคือทางเข้าของตัวช้า
  ram1: { label: 'Ironbreak', kind: 'ground', startup: 8, active: 10, recovery: 8, dmg: 6,
    hb: { x: -10, y: -112, w: 104, h: 74 }, kb: [4, 0], stun: 22,
    armor: 3, glide: true, imp: { f: 7, vx: 15 }, autoChain: 'ram2' },
  ram2: { label: 'Ironbreak', kind: 'ground', startup: 6, active: 5, recovery: 22, dmg: 9,
    hb: { x: 12, y: -108, w: 114, h: 58 }, kb: [13, 0], stun: 30, imp: { f: 5, vx: 6 } },

  // ---- สกิล 2 Pounce: กระโจนเป็นเส้นโค้ง ข้ามกระสุนกับท่าต่ำ ลงมาฟันจากบนหัว (ปุ่ม 2) ----
  // ท่าเดียวจบด้วย untilLand — กรอบโจมตีเปิดค้างตลอดช่วงตก แล้วจบเองตอนแตะพื้น
  // ตัวช้าที่มีทางเข้าทางเดียวคือตัวที่ตายแล้ว อันนี้คือทางที่สองที่แพ้คนละอย่างกับ ram
  leap: { label: 'Pounce', kind: 'ground', startup: 7, active: 90, recovery: 0, dmg: 10,
    hb: { x: -20, y: -110, w: 116, h: 104 }, kb: [6, -6], stun: 32,
    imp: { f: 6, vx: 13, vy: -15 }, armor: 2, untilLand: true, landLag: 16 },

  // ---- สกิล 3 Skyfall (อัลติ): ปักดาบลงพื้น แรงกระแทกแผ่ออกสองข้าง (ปุ่ม 3 ใช้หลอด ki เต็ม) ----
  // เงื้อนาน แต่ติดเกราะเต็มตลอดช่วงเงื้อ — สัญชาตญาณคือจิ้มสกัด ซึ่งใช้ไม่ได้ ต้องวิ่งหนีอย่างเดียว
  sky1: { label: 'Skyfall', kind: 'ground', startup: 14, active: 6, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    armor: 6, autoChain: 'sky2' },
  // แกนกลาง: hb.x ติดลบและกว้าง = กรอบคร่อมตัวเขา กินทั้งสองข้าง และสูงพอสอยคนกระโดด
  // คลื่นวิ่ง: ใช้ระบบกระสุนเดิม ยิงออกสองทิศพร้อมกัน วิ่งไปจนสุดจอ กระโดดหลบได้
  sky2: { label: 'Skyfall', kind: 'ground', startup: 8, active: 6, recovery: 30, dmg: 14,
    hb: { x: -190, y: -200, w: 380, h: 210 }, kb: [9, -13], stun: 38, armor: 2,
    shots: [{ vy: 0 }, { vy: 0, back: true }], shotAt: 8, shotDmg: 5, shotStun: 22,
    shotRange: SKYFALL_RANGE, shotLow: true },
};

const ATLAS_SKILLS = ['ram1', 'leap', 'sky1'];
const ATLAS_SKILL_CD = [150, 180, 0];

const ALECTO_SKILLS = ['swap1', 'fire1', 'dust1'];
// สลับอาวุธไม่ใช่ท่าโจมตี คูลดาวน์จึงสั้น · สกิล 2 ได้ทั้งกำแพงไฟและชุดกระสุน คูลดาวน์จึงยาว
const ALECTO_SKILL_CD = [60, 330, 0];
// กดทิศถอยค้าง -> เริ่มด้วยท่าถอยแทน แล้ว autoChain เข้าสกิลเอง
const ALECTO_BACKSTEP = { swap1: 'hop', fire1: 'roll' };

/** ท่าตีปกติชุดที่สองของ Alecto — สลับเข้า/ออกด้วยสกิล 1 (swap1)
 *
 * ชื่อทางซ้ายคือสิ่งที่ pickMove() เลือกตามปุ่มที่กด ทางขวาคือท่าที่ได้จริงตอนถือปืน
 * ทำเป็นตารางของตัวละครเอง pickMove() จึงยังไม่รู้ว่ากำลังเล่นตัวไหน เหมือนเดิม
 *
 * ท่าอากาศ (nair/sair/dair) **ตั้งใจไม่ใส่** — ลอยอยู่ก็ต้องใช้แส้เสมอ
 * ปืนจึงเป็นอาวุธของคนที่ยืนอยู่กับพื้น ส่วนการขึ้นอากาศยังเป็นเกมของแส้
 */
const ALECTO_ALT = {
  jab1: 'gjab1', jab2: 'gjab2', jab3: 'gjab3',
  side: 'gside', up: 'gup', down: 'gdown',
};

/**
 * ทะเบียนตัวละคร (ฝั่ง sim) — ตารางท่า/สกิล/คูลดาวน์ แยกต่อตัว
 *
 * ทุกตัวใช้ "ชื่อท่า" ชุดเดียวกัน (jab1 / side / up / down / nair / sair / dair)
 * แต่ค่าเฟรมเดต้าเป็นของใครของมัน — pickMove() จึงไม่ต้องรู้ว่ากำลังเล่นตัวไหน
 * ส่วนอาร์ต (atlas / animation / รายชื่อท่าที่มีอาร์ตแล้ว) อยู่ฝั่งฉากใน ScrambleScene.js
 * เพราะ core.js ตั้งใจไม่แตะ Phaser เลย จะได้เดินเทสต์ใน node ตรง ๆ ได้
 */
// ---------- ORPHEUS ----------
// สายไล่หวดติดไฟ · แก่นคือ "ที่ที่เขาเดินผ่าน ยังไหม้อยู่"
//
// ไฟของเขาต่างจาก Alecto ตรงที่ **ติดไปกับคนที่โดน** ไม่ใช่กองนิ่งอยู่กับพื้น
// Alecto เผาที่ (ปฏิเสธพื้นที่ ยืนห่าง) · Orpheus เผาคน (ประชิด ตามไปกัด)
// ไฟของเขาไม่ได้มาจากบัฟล่องหนที่ต้องกดก่อน — **ใครแตะไฟของเขา คนนั้นติดไฟ**
// ของเดิมเป็นบัฟ 8 วินาทีที่กดแล้วไม่มีอะไรให้เห็น ในเกมที่คนใส่กันรัวคือปุ่มที่ไม่มีใครอยากเสียจังหวะไปกด
// ย้ายกลไกมาไว้บนเวทีที่มองเห็นได้แทน
const BURN_TIME = 120;       // ไฟติดตัวคนโดนกี่เฟรม (2 วินาที) — โดนซ้ำนับใหม่ ไม่ซ้อน
const BURN_TICK = 20;        // ตอดเลือดทุกกี่เฟรม
const BURN_DMG = 1;

const ORPHEUS_MOVES = {
  // ---- Riff: ไล่หวดกีตาร์ห้าจังหวะ กดรัวแล้วหวดรัว ----
  // สี่จังหวะแรกถีบขึ้นเป็น 0 ทั้งหมด ถีบขึ้นแม้นิดเดียวคู่ต่อสู้จะลอย
  // พอตกถึงพื้นกลายเป็นท่าล้มซึ่งมี invuln ติดมา จังหวะที่เหลือจะฟาดลม
  // (กับดักนี้กัดมาแล้วสี่รอบ) ไม้จบค่อยถีบออก
  jab1: { label: 'Riff', kind: 'ground', startup: 5, active: 3, recovery: 9, dmg: 3,
    hb: { x: 8, y: -106, w: 116, h: 34 }, kb: [2, 0], stun: 15, chain: 'jab2' },
  jab2: { label: 'Riff', kind: 'ground', startup: 4, active: 3, recovery: 9, dmg: 3,
    hb: { x: 8, y: -96, w: 122, h: 40 }, kb: [2, 0], stun: 15, chain: 'jab3' },
  jab3: { label: 'Riff', kind: 'ground', startup: 5, active: 3, recovery: 10, dmg: 4,
    hb: { x: 10, y: -112, w: 128, h: 46 }, kb: [2.5, 0], stun: 17, chain: 'jab4' },
  jab4: { label: 'Riff', kind: 'ground', startup: 5, active: 4, recovery: 10, dmg: 4,
    hb: { x: 10, y: -100, w: 132, h: 44 }, kb: [3, 0], stun: 18, chain: 'jab5' },
  // ไม้จบ: เหวี่ยงเต็มวง ดีดออกไกล
  jab5: { label: 'Riff', kind: 'ground', startup: 8, active: 5, recovery: 22, dmg: 7,
    hb: { x: 12, y: -108, w: 148, h: 58 }, kb: [14, -4], stun: 30 },

  side: { label: 'Neck Jab', kind: 'ground', startup: 10, active: 5, recovery: 22, dmg: 8,
    hb: { x: 16, y: -98, w: 150, h: 30 }, kb: [12, 0], stun: 28,
    imp: { f: 8, vx: 10 }, glide: true },
  up: { label: 'Upstroke', kind: 'ground', startup: 8, active: 6, recovery: 20, dmg: 7,
    hb: { x: -12, y: -186, w: 104, h: 134 }, kb: [2, -15], stun: 34, jumpCancel: true },
  down: { label: 'Low Chord', kind: 'ground', crouch: true, startup: 7, active: 5, recovery: 18, dmg: 6,
    hb: { x: 8, y: -36, w: 124, h: 32 }, kb: [4, -9], stun: 26 },
  nair: { label: 'Air Riff', kind: 'air', startup: 6, active: 8, recovery: 12, dmg: 6,
    hb: { x: -52, y: -140, w: 122, h: 132 }, kb: [3, -6], stun: 24, jumpCancel: true },
  sair: { label: 'Air Jab', kind: 'air', startup: 7, active: 8, recovery: 14, dmg: 7,
    hb: { x: 12, y: -94, w: 130, h: 36 }, kb: [9, -4], stun: 28,
    imp: { f: 6, vx: 8, vy: -1 }, floaty: true },
  dair: { label: 'Air Chord', kind: 'air', startup: 8, active: 8, recovery: 16, dmg: 7,
    hb: { x: -22, y: -46, w: 116, h: 88 }, kb: [5, -4], stun: 26 },

  // ---- สกิล 1 Power Slide: มุดต่ำลอดกระสุน แล้วเด้งขึ้นฟาดสวน (ปุ่ม 1) ----
  // crouch: true = กรอบตัวเตี้ยลงตลอดช่วงสไลด์ ซึ่งคือทั้งหมดของท่านี้
  // ตัวไล่หวดไม่มีเกราะไม่มีวาร์ป ทางเข้าของเขาคือมุดลอด
  slide1: { label: 'Power Slide', kind: 'ground', crouch: true, startup: 6, active: 12, recovery: 6, dmg: 5,
    hb: { x: 6, y: -40, w: 126, h: 34 }, kb: [4, 0], stun: 20,
    imp: { f: 5, vx: 16 }, glide: true, autoChain: 'slide2' },
  slide2: { label: 'Power Slide', kind: 'ground', startup: 6, active: 6, recovery: 20, dmg: 8,
    hb: { x: -10, y: -178, w: 106, h: 128 }, kb: [3, -14], stun: 32, jumpCancel: true },

  // ---- สกิล 2 Burnout: ฟาดกีตาร์ลงพื้น แล้วถีบตัวถอยหลัง ทิ้งกองไฟไว้ตรงที่เพิ่งยืน (ปุ่ม 2) ----
  //
  // ลำดับสำคัญ: ฟาดก่อน (เฟรม 8 เกิดกองไฟตรงเท้า) แล้วค่อยถีบถอย (เฟรม 13)
  // สลับลำดับแล้วกองไฟจะไปเกิดที่ใหม่ ซึ่งพลาดทั้งประเด็น —
  // ไฟต้องอยู่ตรงที่เขาเพิ่งยืน ระหว่างตัวเขากับคนที่กำลังไล่
  //
  // เป็นท่าป้องกันตัวท่าเดียวของเขา: ไม่มีเกราะ ไม่มีวาร์ป ไม่มีสวนกลับ เลือด 100
  // และท่าไล่หวดมัดเขาไว้กับที่ ถ้าไม่มีปุ่มนี้คือโดนต้อนติดมุมแล้วจบ
  burn1: { label: 'Burnout', kind: 'ground', startup: 7, active: 5, recovery: 20, dmg: 7,
    hb: { x: 0, y: -62, w: 134, h: 72 }, kb: [6, 0], stun: 24,
    firePool: { at: 8, dx: 0, burns: true }, imp: { f: 13, vx: -13 } },

  // ---- สกิล 3 Burn the House Down (อัลติ): โซโล่ เดินได้ ไฟติดตามรอยที่เดิน ----
  // เดินได้ตั้งแต่แรกเพราะบทเรียน "ขาตาย" ของ Alecto — ยืนตายอยู่กับที่ไม่สนุก
  solo1: { label: 'Burn the House Down', kind: 'ground', startup: 10, active: 5, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    stance: SOLO_FRAMES, autoChain: 'solo2', mobile: 0.4 },
  // trail = ทิ้งกองไฟไว้ตรงที่ยืนทุกกี่เฟรม · ยิ่งเดินยิ่งเขียนกำแพงไฟทิ้งไว้ทั้งเวที
  solo2: { label: 'Burn the House Down', kind: 'ground', startup: 5, active: 5, recovery: 8, dmg: 5,
    hb: { x: -30, y: -140, w: 150, h: 130 }, kb: [2, 0], stun: 20,
    holdChain: 'solo3', autoChain: 'soloEnd', mobile: 0.4, trail: 18 },
  solo3: { label: 'Burn the House Down', kind: 'ground', startup: 5, active: 5, recovery: 8, dmg: 5,
    hb: { x: -30, y: -140, w: 150, h: 130 }, kb: [2, 0], stun: 20,
    holdChain: 'solo2', autoChain: 'soloEnd', mobile: 0.4, trail: 18 },
  // ไม้จบ: ฟาดคอร์ดสุดท้าย ไฟระเบิดออกสองข้าง
  soloEnd: { label: 'Burn the House Down', kind: 'ground', startup: 8, active: 6, recovery: 26, dmg: 12,
    hb: { x: -170, y: -190, w: 340, h: 200 }, kb: [10, -12], stun: 36 },
};

// ---------- MOMUS: กล่องระเบิดที่ไม่เลือกข้าง ----------
//
// กลไกประจำตัวเขาทั้งหมดอยู่ที่กล่องนี้ และกฎเหล็กคือ **มันโดนเจ้าของด้วย**
// เขาเป็นตัวเดียวในเกมที่สกิลตัวเองฆ่าตัวเองได้ — ไม่ได้ชนะเพราะแรงกว่า
// แต่ชนะเพราะรู้ว่าระเบิดจะลงตรงไหน ส่วนคนอื่นไม่รู้
const BOX_FUSE = 180;        // 3 วินาที ไม่ใช่ 5 — เกมเร็วขนาดนี้ 5 วิคือลืมไปแล้วว่าวางไว้
const BOX_HALF = 108;        // รัศมีระเบิด
const BOX_TRIGGER = 52;      // เดินเข้าใกล้กว่านี้ = จุดชนวนทันที ไม่ต้องรอครบเวลา
const BOX_ARM = 24;          // เพิ่งขว้างออกไปยังไม่ติดชนวน ไม่งั้นระเบิดใส่หน้าตัวเองทุกครั้ง
const BOX_DMG = 9;
const BOX_STUN = 30;
const BOX_KB = [7, -11];     // ดีดลอย — ระเบิดไม่ใช่ท่ากลางคอมโบ การจับลอยคือจุดประสงค์
const BOX_MAX = 2;           // วางพร้อมกันได้สองกล่อง
const RAIN_N = 7;            // อัลติโปรยกี่กล่อง
const RAIN_STEP = 16;        // ชนวนเหลื่อมกันกี่เฟรม = ระเบิดไล่กันเป็นทอด ๆ ไม่ใช่พร้อมกันทีเดียว
const SNAP_DMG = 5;          // ระเบิดตอนสลับที่ เบากว่ากล่อง แต่ขึ้นสองจุดพร้อมกัน
const SNAP_HALF = 92;
const SNAP_STUN = 22;
const SNAP_KB = [6, -8];

const ORPHEUS_SKILLS = ['slide1', 'burn1', 'solo1'];
const ORPHEUS_SKILL_CD = [120, 240, 0];   // สไลด์กดถี่ได้ · ถอยลากไฟ 4 วินาที กันกดหนีรัว

/**
 * MOMUS — ตัวป่วนสนาม (ตัวสุดท้ายของโรสเตอร์)
 *
 * สี่ตัวแรกทุกตัวมีสกิลที่เล็งใส่คู่ต่อสู้ ตัวนี้ไม่เล็งใคร — มันโดนทุกคนที่ยืนผิดที่
 * ดาเมจของเขาไม่มีอะไรรับประกันเลย ระเบิดทุกลูกหลบได้ถ้าเห็นทัน
 * ตัวอื่นกดปุ่มแล้วดาเมจออกแน่ ๆ ของเขาต้องหลอกให้คนเดินไปยืนผิดที่ก่อน
 *
 * ท่าตีปกติเบาแต่รัว เหมือนตัวตลกตบตี ไม่ใช่ต่อยหนักเงื้อนาน
 * เดิมออกแบบให้ต่อยช้าหนัก ทิ้งไปแล้ว — เกมนี้เร็วและคนใส่กันรัว
 * ท่าที่ใช้เวลาเตรียมตัวคือท่าที่ตายก่อนได้ใช้
 */
const MOMUS_MOVES = {
  // ---- ท่าตีปกติ: หมัดพันผ้าเร็ว ๆ สามจังหวะ ----
  // kb[1] ต้องเป็น 0 ทุกจังหวะที่อยู่กลางคอมโบ ถีบขึ้นแม้นิดเดียวคู่ต่อสู้จะลอย
  // พอตกถึงพื้นกลายเป็นท่าล้มซึ่งมี invuln ติดมา จังหวะที่เหลือจะฟาดลม (กัดมาแล้วห้ารอบ)
  jab1: { label: 'Slap', kind: 'ground', startup: 4, active: 3, recovery: 7, dmg: 2,
    hb: { x: 8, y: -96, w: 76, h: 28 }, kb: [1.5, 0], stun: 14, chain: 'jab2' },
  jab2: { label: 'Slap', kind: 'ground', startup: 4, active: 3, recovery: 8, dmg: 2,
    hb: { x: 8, y: -92, w: 80, h: 30 }, kb: [1.5, 0], stun: 14, chain: 'jab3' },
  jab3: { label: 'Shove', kind: 'ground', startup: 5, active: 4, recovery: 15, dmg: 5,
    hb: { x: 10, y: -94, w: 92, h: 34 }, kb: [4, 0], stun: 30, chain: 'jab4' },

  // ---- ไม้จบ: ยัดหีบ — ภาพจำของตัวละคร ----
  //
  // เดิมวางไว้เป็นอัลติ ย้ายมาเป็นไม้จบคอมโบเพราะสองเหตุผล:
  // อัลติที่โดนคนเดียวอ่อนเกินไปตอนเล่นหลายคน และมุกนี้ดีเกินกว่าจะได้เห็นแค่ยกละครั้ง
  // ต่อครบสี่จังหวะไม่ง่ายตอนคนรุมกัน จึงยังเป็นรางวัล ไม่ใช่ของแจกฟรี
  //
  // jab4 คือ "คว้า" · jab5/jab6 ต่อเฉพาะตอนคว้าติด (onHit ไม่ใช่ autoChain)
  // คว้าไม่โดนก็จบแค่ลุงจ์ค้างไว้ — ไม่งั้นจะดูเหมือนจับติดทั้งที่ไม่โดน
  //
  // kb ของสองจังหวะแรกติดลบ = **ลากเข้าหาตัว** ไม่ใช่ผลักออก
  // วัดแล้วตอนตั้งเป็นบวก ระยะห่างไต่ขึ้นทุกหมัด (90 -> 114 -> 125) จน jab6 เอื้อมไม่ถึง
  // คอมโบเลยขาดที่จังหวะห้าทุกครั้ง ทั้งที่คว้าติดแล้ว — ท่าจับต้องดึงเข้า ไม่งั้นมันไม่ใช่ท่าจับ
  jab4: { label: 'Toy Chest', kind: 'ground', startup: 7, active: 4, recovery: 16, dmg: 3,
    hb: { x: 14, y: -92, w: 96, h: 40 }, kb: [-5, 0], stun: 58, onHit: 'jab5' },
  jab5: { label: 'Toy Chest', kind: 'ground', startup: 6, active: 4, recovery: 12, dmg: 7,
    hb: { x: 8, y: -70, w: 112, h: 64 }, kb: [-2, 0], stun: 40, autoChain: 'jab6' },
  // จบคอมโบตรงนี้ ถีบขึ้นได้แล้ว — ไม่มีจังหวะต่อให้ขาด
  jab6: { label: 'Encore', kind: 'ground', startup: 5, active: 4, recovery: 18, dmg: 5,
    hb: { x: 6, y: -84, w: 124, h: 76 }, kb: [12, -10], stun: 34 },

  // ทางเข้าหลัก: พุ่งสะบัดแขนเสื้อไปข้างหน้า มีแรงส่งตัวตาม
  side: { label: 'Jester Rush', kind: 'ground', startup: 7, active: 5, recovery: 16, dmg: 5,
    hb: { x: 16, y: -94, w: 104, h: 32 }, kb: [6, 0], stun: 22,
    imp: { f: 5, vx: 11 }, glide: true },
  up: { label: 'Pop-up', kind: 'ground', startup: 6, active: 5, recovery: 16, dmg: 5,
    hb: { x: -4, y: -168, w: 82, h: 116 }, kb: [2, -15], stun: 30, jumpCancel: true },
  down: { label: 'Low Sweep', kind: 'ground', crouch: true, startup: 6, active: 4, recovery: 15, dmg: 4,
    hb: { x: 10, y: -32, w: 102, h: 28 }, kb: [3, -8], stun: 24 },
  nair: { label: 'Spin', kind: 'air', startup: 5, active: 8, recovery: 11, dmg: 4,
    hb: { x: -46, y: -120, w: 104, h: 104 }, kb: [3, -6], stun: 22, jumpCancel: true },
  sair: { label: 'Air Slap', kind: 'air', startup: 6, active: 8, recovery: 13, dmg: 5,
    hb: { x: 12, y: -96, w: 104, h: 32 }, kb: [8, -4], stun: 26,
    imp: { f: 6, vx: 8, vy: -1 }, floaty: true },
  dair: { label: 'Stomp', kind: 'air', startup: 7, active: 8, recovery: 14, dmg: 5,
    hb: { x: -14, y: -40, w: 88, h: 76 }, kb: [4, -4], stun: 24 },

  // ---- สกิล 1 Jack-in-the-Box: ขว้างกล่องระเบิด (ปุ่ม 1) ----
  //
  // ขว้างแบบสะบัดมือ ไม่ใช่ย่อลงไปวาง — ต้องกดได้กลางวงที่กำลังตีกัน
  // กล่องระเบิดเมื่อใครแตะ หรือครบ 3 วินาที อย่างใดถึงก่อน และ **โดนเจ้าของด้วย**
  box1: { label: 'Jack-in-the-Box', kind: 'ground', startup: 5, active: 4, recovery: 6, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    boxDrop: { at: 6, dx: 150 }, autoChain: 'box2' },
  box2: { label: 'Jack-in-the-Box', kind: 'ground', startup: 4, active: 4, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true },

  // ---- สกิล 2 Ta-da!: ดีดนิ้วสลับที่ แล้วระเบิดขึ้นทั้งสองจุด (ปุ่ม 2) ----
  //
  // ออกไวที่สุดในเกม เป็นปุ่มหนีฉุกเฉินได้จริง
  // โดนต้อนติดมุม -> ดีดนิ้วออกมาได้ทันที พร้อมทิ้งระเบิดไว้ให้คนที่ไล่
  snap1: { label: 'Ta-da!', kind: 'ground', startup: 3, active: 3, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    swapBlast: { at: 3 }, autoChain: 'snap2' },
  snap2: { label: 'Ta-da!', kind: 'ground', startup: 3, active: 4, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true },

  // ---- สกิล 3 Full House (อัลติ): โปรยกล่องทั้งเวที (ปุ่ม 3 ใช้หลอด ki เต็ม) ----
  //
  // ของใหญ่ควรอยู่ที่อัลติ ไม่ใช่สกิลที่ต้องกดกลางวงตีกัน เงื้อนานได้ไม่เป็นไร
  // ชนวนเหลื่อมกันทีละ RAIN_STEP เฟรม = ระเบิดไล่กันเป็นทอด ๆ ไม่ใช่ตูมเดียวจบ
  full1: { label: 'Full House', kind: 'ground', startup: 10, active: 6, recovery: 8, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, autoChain: 'full2' },
  full2: { label: 'Full House', kind: 'ground', startup: 8, active: 6, recovery: 20, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    boxRain: { at: 8, n: RAIN_N } },
};

const MOMUS_SKILLS = ['box1', 'snap1', 'full1'];
// สกิล 1 กับ 2 ต้องกดได้บ่อย — ทั้งคู่คือ "จัดสนาม" ไม่ใช่ดาเมจที่การันตี
// สกิล 2 ถูกที่สุดเพราะเป็นปุ่มหนีด้วย แต่ก็ทิ้งระเบิดไว้สองจุดทุกครั้งที่กด
const MOMUS_SKILL_CD = [150, 120, 0];

const CHARACTERS = {
  nyx: { id: 'nyx', label: 'NYX', moves: MOVES, skills: SKILLS, skillCd: SKILL_CD },
  helios: { id: 'helios', label: 'HELIOS', moves: HELIOS_MOVES, skills: HELIOS_SKILLS, skillCd: HELIOS_SKILL_CD },
  alecto: { id: 'alecto', label: 'ALECTO', moves: ALECTO_MOVES, skills: ALECTO_SKILLS,
    skillCd: ALECTO_SKILL_CD, backstep: ALECTO_BACKSTEP, altMoves: ALECTO_ALT },
  // artPending = ยังไม่มีอาร์ต วาดเป็นกล่องไปก่อน · เทสที่ตรวจอาร์ตจะข้ามตัวที่ติดธงนี้
  // ใส่เข้าเกมก่อนเพื่อให้ลองเล่นกลไกเกราะได้จริง ก่อนจะลงทุนเจนอาร์ต ~59 ท่า
  atlas: { id: 'atlas', label: 'ATLAS', moves: ATLAS_MOVES, skills: ATLAS_SKILLS,
    skillCd: ATLAS_SKILL_CD, hp: 130, resist: 0.5 },
  orpheus: { id: 'orpheus', label: 'ORPHEUS', moves: ORPHEUS_MOVES, skills: ORPHEUS_SKILLS,
    skillCd: ORPHEUS_SKILL_CD },
  momus: { id: 'momus', label: 'MOMUS', moves: MOMUS_MOVES, skills: MOMUS_SKILLS,
    skillCd: MOMUS_SKILL_CD },
};
const DEFAULT_CHAR = 'nyx';

// อัลติวาร์ปได้เฉพาะเมื่อคู่ต่อสู้อยู่ในระยะนี้ ไกลกว่านั้นพุ่งไปข้างหน้าแทน ไม่ใช่วาร์ปข้ามจอ
const ULT_REACH = 340, ULT_GAP = 56, ULT_DASH = 190;
// มีดที่ขว้างออกไป: บินไกลสุดเท่านี้แล้วหยุด · มีดกลางค้างเป็น "หมุดวาร์ป" ต่ออีกเท่านี้
//
// หมุดมีสองแบบ ตามว่าขว้างโดนหรือพลาด:
//   โดนใคร -> หมายหัวคนนั้น MARK_HOLD เฟรม หมุด "เกาะตัวเขา" ไปด้วย วาร์ปตามไปเจอเสมอแม้เขาวิ่งหนี
//   พลาด   -> หมุดปักอยู่กับที่ ANCHOR_HOLD เฟรม ใช้เป็นระยะเข้าหา/ถอยหนีแทน
// ที่ต้องแยกเพราะเวลาเล่นหลายคน หมุดค้างที่เดิมแปลว่าวาร์ปไปโผล่ที่ว่าง หรือแย่กว่านั้นคือกลางวง
const SHOT_RANGE = 430, SHOT_SPEED = 13, ANCHOR_HOLD = 70, MARK_HOLD = 300;

const ACTIONABLE = new Set(['idle', 'walk', 'run', 'crouch', 'air', 'block', 'blockcrouch']);

class Fighter {
  constructor(id, name, x, facing, char = DEFAULT_CHAR) {
    this.id = id; this.name = name; this.spawnX = x; this.spawnFacing = facing;
    this.char = char;
    this.reset();
  }
  /** ตารางท่าของตัวละครตัวนี้ — ชื่อท่าเหมือนกันทุกตัว ค่าเฟรมเดต้าเป็นของใครของมัน */
  get moves() { return CHARACTERS[this.char].moves; }
  get skills() { return CHARACTERS[this.char].skills; }
  get skillCd() { return CHARACTERS[this.char].skillCd; }
  get backstep() { return CHARACTERS[this.char].backstep ?? null; }
  /** ตารางท่าตีปกติชุดที่สอง (ถ้าตัวนี้มี) — ว่างเปล่าแปลว่าไม่มีให้สลับ */
  get altMoves() { return CHARACTERS[this.char].altMoves ?? null; }
  // เลือดเป็นค่าของตัวละคร ไม่ใช่ค่ากลาง — Atlas 130 ที่เหลือ 100
  get maxHp() { return CHARACTERS[this.char].hp ?? 100; }
  // ทนสถานะ: 1 = โดนเต็ม · 0.5 = โดนครึ่งเดียวและสลายเร็วเป็นสองเท่า
  get resist() { return CHARACTERS[this.char].resist ?? 1; }
  reset() {
    Object.assign(this, {
      x: this.spawnX, y: STAGE.groundY, vx: 0, vy: 0, facing: this.spawnFacing,
      onGround: true, state: 'idle', stateF: 0, jumpsLeft: 1, coyote: 0, dropT: 0,
      move: null, moveId: null, moveF: 0, hitList: new Set(), hitConfirmed: false, used: new Set(),
      hp: this.maxHp, stun: 0, hitstop: 0, invuln: 0, lastHitF: -9999, cd: [0, 0, 0], ki: 0, mashLeft: 0,
      lash: 0, lashF: -9999,        // ตรารอยแส้ของ Alecto — อยู่ที่ "คนโดน" ไม่ใช่คนฟาด
      armorLeft: 0,                 // เกราะของ Atlas เหลือกินได้อีกกี่ที (ตั้งตอนเริ่มท่า)
      stanceUntil: -9999,           // ท่าตั้งป้อมยืนยิงหมดเวลาที่เฟรมไหน
      alt: 0,                       // สลับไปใช้ท่าตีปกติชุดที่สองอยู่ไหม (Alecto: ถือไรเฟิลแทนแส้)
                                    // รีเซ็ตทุกยก = เริ่มยกใหม่ถือแส้เสมอ ทั้งสองเครื่องตรงกันแน่นอน
      veil: 0, dustGuard: 0,        // อยู่ในวงฝุ่นของ Alecto / จางต่อหลังออกจากวง
      caged: 0,                     // ถูกขังอยู่ในวงฝุ่นของอีกฝ่าย (เดินออกไม่ได้ ต้องกระโดด)
      burn: 0, burnF: -9999,        // ไฟที่ติดตัวอยู่ — อยู่ที่ "คนโดน" ติดจากการแตะกองไฟของ Orpheus
      // บัฟเฟอร์อินพุตเป็นของแต่ละฝั่ง — เล่นสองคนต้องกดพร้อมกันได้โดยไม่กินคิวของกันและกัน
      buf: { attack: 0, jump: 0, skill1: 0, skill2: 0, skill3: 0 },
      lastTap: { dir: 0, f: -99 }, dashLatch: false, inp: null,
      comboHits: 0, comboDmg: 0, wallBounced: false, jumpHeldSinceTakeoff: false, techBuf: 0, techLock: 0,
    });
  }
  // กันแบบก้ม (blockcrouch) ตัวเตี้ยเท่าท่าย่อ — ไม่งั้นก้มกันแล้วกรอบยังสูงเท่าเดิม ก็ไม่ต่างจากกันยืน
  // lowStun = จำไว้ว่า blockstun นี้มาจากท่าก้ม เพื่อให้กรอบยังเตี้ยตลอดช่วงเซ ไม่เด้งสูงกลางคัน
  // (เด้งสูงกลางคันแปลว่าท่าที่ตีสูงจะจิ้มโดนหัวได้ ทั้งที่ผู้เล่นก้มกันอยู่ตลอด)
  get h() {
    const low = this.state === 'crouch' || this.state === 'blockcrouch' || (this.state === 'blockstun' && this.lowStun)
      || (this.move && this.move.crouch) || this.state === 'knockdown' || this.state === 'techroll';
    return low ? PHYS.crouchH : PHYS.standH;
  }
  hurtbox() { const w = PHYS.width; return { x: this.x - w / 2, y: this.y - this.h, w, h: this.h }; }
  hitbox() {
    const m = this.move; if (!m || this.state !== 'attack') return null;
    if (m.noHit) return null;   // ท่าที่ประกาศว่าไม่มีดาเมจ (ช่วงหายตัว / ช่วงขว้าง) ห้ามมีกรอบโจมตีเด็ดขาด
    if (this.moveF < m.startup || this.moveF >= m.startup + m.active) return null;
    const hb = m.hb;
    const left = this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { x: left, y: this.y + hb.y, w: hb.w, h: hb.h };
  }
  phase() {
    if (this.state !== 'attack') return null;
    const m = this.move;
    if (this.moveF < m.startup) return 'startup';
    if (this.moveF < m.startup + m.active) return 'active';
    return 'recovery';
  }
  setState(s) { if (this.state !== s) { this.state = s; this.stateF = 0; } }
}

function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// Input snapshot: { left,right,up,down,jump,attack,block,run } held + p = pressed this frame, r = released
class Game {
  constructor() {
    this.frame = 0;
    // จุดเกิดเลื่อนตามเวทีที่กว้างขึ้นเหมือนแพลตฟอร์ม ไม่งั้นทั้งคู่ไปกองอยู่ค่อนซ้ายของจอ
    // ระยะห่างระหว่างสองฝั่ง (440) คงเดิม = ระยะเข้าปะทะที่ playtest ไว้ไม่เปลี่ยน
    const shift = (STAGE.w - STAGE_BASE_W) / 2;
    this.p1 = new Fighter('p1', 'NYX', 420 + shift, 1, 'nyx');
    // หุ่นซ้อมเป็นตัวละครจริงตัวหนึ่ง ไม่ใช่กล่องอีกแล้ว — ตั้งเป็นคนละตัวกับผู้เล่นจะได้เห็นทั้งสองตัวพร้อมกัน
    this.p2 = new Fighter('p2', 'DUMMY', 860 + shift, -1, 'helios');
    this.dummyMode = 'stand';
    this.dummyTech = 'off';

    this.events = [];
    this.meter = []; this.meterIdle = 0;
    this.lastMoveInfo = null;
    this.shots = [];
    this.fires = [];
    this.boxes = [];                // กล่องระเบิดของ Momus — ระเบิดใส่ทุกคนรวมเจ้าของ
    this.dust = null;               // วงฝุ่นของ Alecto — มีได้ทีละวงเดียว
    // on = ปิดอยู่ตอนซ้อมกับหุ่น เปิดเมื่อเล่นกับคนจริง · ทุกค่าเดินด้วยเลขเฟรมล้วน
    this.match = { on: false, bars: [ROUND_BARS, ROUND_BARS], round: 1, freeze: 0, loser: [], winner: null };
  }
  /** เริ่มแมตช์ใหม่ตั้งแต่ยกแรก — ล้างทั้งหลอดเลือดและจำนวนหลอดที่เหลือ */
  startMatch() {
    this.match = { on: true, bars: [ROUND_BARS, ROUND_BARS], round: 1, freeze: 0, loser: [], winner: null };
    this.resetPositions();
    this.events.push({ type: 'roundStart', round: 1 });
  }

  /** เดินระบบแพ้ชนะ — อยู่ใน core ทั้งหมดเพราะสองเครื่องต้องคิดออกมาตรงกัน
   *
   * ทุกอย่างขับด้วยเลขเฟรมและอินพุตที่วิ่งผ่าน lockstep อยู่แล้ว
   * ห้ามผูกกับเวลาจริงหรือปุ่มที่ฝ่ายเดียวกด ไม่งั้นสองเครื่องจะคนละยกกัน
   */
  updateMatch() {
    const m = this.match;
    if (!m.on) return;

    if (m.winner !== null) {
      // จบแมตช์แล้ว ใครกดตีก็เริ่มใหม่ — ปุ่มตีเดินผ่าน lockstep เหมือนปุ่มอื่น สองเครื่องจึงพร้อมกัน
      if (this.p1.inp?.p?.attack || this.p2.inp?.p?.attack) this.startMatch();
      return;
    }

    if (m.freeze > 0) {
      if (--m.freeze > 0) return;
      for (const i of m.loser) m.bars[i]--;
      const dead = [0, 1].filter((i) => m.bars[i] <= 0);
      if (dead.length) {
        // ล้มพร้อมกันทั้งคู่ในยกสุดท้าย = เสมอ (-1)
        m.winner = dead.length === 2 ? -1 : (dead[0] === 0 ? 1 : 0);
        this.events.push({ type: 'matchEnd', winner: m.winner });
        return;
      }
      m.round++;
      this.resetPositions();
      this.events.push({ type: 'roundStart', round: m.round });
      return;
    }

    const out = [];
    if (this.p1.hp <= 0) out.push(0);
    if (this.p2.hp <= 0) out.push(1);
    if (!out.length) return;
    m.loser = out;
    m.freeze = KO_FREEZE;
    this.events.push({ type: 'ko', loser: out.slice() });
  }

  resetPositions() {
    this.p1.reset(); this.p2.reset();
    this.meter = []; this.shots = []; this.fires = []; this.boxes = []; this.dust = null;
  }

  /**
   * เดินหนึ่งเฟรม — รับอินพุตสองฝั่ง
   * inp2 = null คือโหมดซ้อม: ฝั่งขวาเดินด้วย controlDummy เหมือนเดิม
   * ใส่ inp2 มาคือเล่นสองคน (เครื่องเดียวกันหรือคนละเครื่องผ่านเน็ตก็ได้ — sim ไม่รู้และไม่ต้องรู้)
   */
  step(inp1, inp2 = null) {
    this.frame++; this.events = [];
    const p = this.p1, d = this.p2;
    this.takeInput(p, inp1);
    if (inp2) this.takeInput(d, inp2);

    for (const [f, inp] of [[p, inp1], [d, inp2]]) {
      if (f.hitstop > 0) { f.hitstop--; continue; }
      if (!inp) { this.controlDummy(f); this.physics(f, null); this.advanceMove(f, null); continue; }
      if (f.techBuf > 0) f.techBuf--;
      if (f.techLock > 0) f.techLock--;
      this.controlPlayer(f, inp); this.physics(f, inp); this.advanceMove(f, inp);
      // อินพุตที่ค้างในคิวเดินถอยหลังเฉพาะตอนไม่ได้ถูกแช่อยู่ใน hitstop
      for (const k of Object.keys(f.buf)) if (f.buf[k] > 0) f.buf[k]--;
    }

    if (p.hitstop <= 0 && d.hitstop <= 0) { this.updateShots(); this.updateFires(); this.updateBoxes(); }
    this.decayLash(p); this.decayLash(d);
    this.tickFlame(p); this.tickFlame(d);
    this.updateDust();
    this.resolveHit(p, d);
    this.resolveHit(d, p);
    this.pushApart(p, d);
    this.updateCombo(d);
    this.updateCombo(p);
    this.updateMatch();
    this.recordMeter(p);
    // ฟื้นเลือดให้หุ่นเฉพาะโหมดซ้อม — เล่นสองคนต้องมีใครสักคนแพ้
    if (!this.match.on && !inp2 && this.frame - d.lastHitF > 120 && d.hp < d.maxHp && ACTIONABLE.has(d.state)) d.hp = d.maxHp;
  }

  /** รับอินพุตของเฟรมนี้เข้าคิวของฝั่งนั้น ๆ */
  takeInput(f, inp) {
    f.inp = inp;
    for (const k of Object.keys(f.buf)) if (inp.p[k]) f.buf[k] = PHYS.buffer + 1;
    // กดปุ่มกันตอนลอยอยู่ = ขอ tech · กดพลาดช่วงแล้วโดนล็อกไว้ชั่วครู่ (กันการรัวปุ่ม)
    if (inp.p.block && !f.onGround && f.techLock === 0) { f.techBuf = PHYS.techWindow; f.techLock = PHYS.techLockout; }
  }

  buffered(f, key) { return f.buf[key] > 0; }
  consume(f, key) { f.buf[key] = 0; }

  pickMove(f, inp) {
    const id = this.pickNormal(f, inp);
    // สลับอาวุธแล้วก็ยังเลือกท่าด้วยปุ่มชุดเดิมทุกอย่าง แค่แปลชื่อท่าผ่านตารางของตัวละครอีกที
    // ตารางเป็นของตัวละคร ไม่ใช่ของเมธอดนี้ — pickMove() จึงยังไม่รู้ว่ากำลังเล่นตัวไหน
    // ชื่อที่ไม่อยู่ในตาราง (ท่าอากาศ) ตกลงมาใช้ชุดเดิมเอง ไม่ต้องเขียนเงื่อนไขแยก
    return (f.alt && f.altMoves?.[id]) || id;
  }

  /** ปุ่มที่กด -> ชื่อท่าตีปกติ (ก่อนแปลตามอาวุธที่ถืออยู่) */
  pickNormal(f, inp) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (f.onGround) {
      if (inp.down) return 'down';
      if (inp.up) return 'up';
      if (dir !== 0) return 'side';
      return 'jab1';
    }
    if (inp.down) return 'dair';
    if (dir !== 0) return 'sair';
    return 'nair';
  }

  startMove(f, id, dir) {
    if (dir) f.facing = dir;
    const mv = f.moves[id];
    // สลับอาวุธตั้งแต่เฟรมแรกของท่า ไม่ใช่ตอนจบ — คนเล่นกดแล้วเห็นผลทันที
    // ทั้งสองเครื่องเดินถึงบรรทัดนี้ที่เฟรมเดียวกันเสมอ เพราะมาจากปุ่มที่ส่งข้ามเน็ตเหมือนกัน
    if (mv.toggle) { f.alt = f.alt ? 0 : 1; this.events.push({ type: 'swap', alt: f.alt, x: f.x, y: f.y - 90 }); }
    if (mv.warp) this.warp(f);
    if (mv.warpAnchor) this.warpToAnchor(f);
    if (mv.faceFoe) this.faceFoe(f);
    // ท่าที่ประกาศ refresh: ปลดชื่อท่าที่ระบุออกจาก used = ใช้ชุดนั้นซ้ำได้อีกรอบในคอมโบเดียว
    // นี่คือสิ่งที่ทำให้ "รัวยาว" เกิดขึ้นจริง แทนที่จะจบที่ชุดเดียวเพราะติด used
    if (mv.refresh) for (const k of mv.refresh) f.used.delete(k);
    f.move = mv; f.moveId = id; f.moveF = 0;
    f.armorLeft = mv.armor ?? 0;
    f.hitList = new Set(); f.hitConfirmed = false; f.used.add(id);
    f.setState('attack');
    this.lastMoveInfo = { id, ...f.moves[id] };
    this.events.push({ type: 'move', id });
  }

  foe(f) { return f === this.p1 ? this.p2 : this.p1; }

  /** หาตัวละครจากไอดี — แยกเป็นเมธอดเพื่อให้รองรับเกินสองคนได้ตอนทำโหมดหลายคน */
  fighterById(id) { return id === 'p1' ? this.p1 : id === 'p2' ? this.p2 : null; }

  /** ขว้างโดนใคร = หมายหัวคนนั้น หมุดย้ายไปเกาะตัวเขาแล้วนับถอยหลัง MARK_HOLD
   *  เล่มไหนในชุดโดนก็ได้ ไม่จำเป็นต้องเป็นเล่มกลาง — คนเล่นเห็นว่า "มีดโดน" ก็ควรได้หมุด */
  markTarget(volley, d) {
    const a = volley.anchor;
    if (!a || a.dead) return;
    a.target = d.id;
    a.stuck = MARK_HOLD;
    a.x = d.x; a.y = d.y - 70;
    this.events.push({ type: 'mark', x: a.x, y: a.y });
  }

  faceFoe(f) {
    const o = this.foe(f);
    if (o.x !== f.x) f.facing = Math.sign(o.x - f.x);
  }

  // วาร์ปไปโผล่ "อีกฝั่ง" ของคู่ต่อสู้ — เรียกสองจังหวะติดกันจึงสลับข้างไปมาเอง
  // ไกลเกินระยะก็ไม่วาร์ป พุ่งไปข้างหน้าเฉย ๆ กันไม่ให้เป็นการเทเลพอร์ตข้ามเวที
  warp(f) {
    const o = this.foe(f);
    this.events.push({ type: 'vanish', x: f.x, y: f.y });
    if (Math.abs(o.x - f.x) <= ULT_REACH) {
      const side = f.x <= o.x ? 1 : -1;
      f.x = o.x + side * ULT_GAP;
      f.facing = -side;
    } else {
      f.x += f.facing * ULT_DASH;
    }
    const half = PHYS.width / 2;
    f.x = Math.max(STAGE.wallL + half, Math.min(STAGE.wallR - half, f.x));
    f.y = STAGE.groundY; f.vx = 0; f.vy = 0; f.onGround = true;
    this.events.push({ type: 'appear', x: f.x, y: f.y });
  }

  gainKi(f, amount) { f.ki = Math.min(KI_MAX, f.ki + amount); }

  /** กดปุ่มอะไรก็ได้ที่ใช้โจมตีอยู่ไหม — ใช้กับท่าที่ "กดรัวเพื่อต่อรอบ"
   *  รับทั้งปุ่มตีและปุ่มสกิลทั้งสามช่อง คนเล่นจะรัวปุ่มไหนก็ได้ ไม่ต้องจำว่าปุ่มไหนถูก */
  mashPressed(f) {
    if (!f.inp) return false;
    if (this.buffered(f, 'attack')) { this.consume(f, 'attack'); return true; }
    for (let i = 1; i <= 3; i++) {
      if (this.buffered(f, 'skill' + i)) { this.consume(f, 'skill' + i); return true; }
    }
    return false;
  }

  /** ปล่อยมีดตามที่ท่ากำหนด — เรียกจาก advance ตอนถึงเฟรม shotAt
   *
   * มีดชุดเดียวกันใช้ hitList ร่วมกัน (volley) = ขว้างหนึ่งครั้งโดนคนหนึ่งได้ครั้งเดียว
   * ถ้าไม่ทำ ยืนติดตัวแล้วขว้างจะโดนครบสามเล่มในเฟรมเดียว (9 ดาเมจทันทีไม่มีเวลาบิน)
   * ท่าที่ออกแบบมากวนระยะไกลกลายเป็นท่าประชิดที่แรงที่สุดไปเลย — วัดได้จริงก่อนแก้
   * การกระจายเป็นพัดมีไว้ครอบมุมสูง/ต่ำ ไม่ได้มีไว้ให้โดนซ้อนกันสามเล่ม
   */
  fireShots(f) {
    const m = f.move;
    const volley = { hit: new Set(), anchor: null };
    for (const spec of m.shots) {
      // back = ยิงสวนทางที่หันอยู่ ใช้ทำคลื่นที่แผ่ออกสองข้างพร้อมกัน (อัลติของ Atlas)
      const dir = spec.back ? -f.facing : f.facing;
      const sh = {
        owner: f.id, x: f.x + dir * 30, y: f.y - (m.shotLow ? 26 : 96),
        vx: dir * SHOT_SPEED, vy: spec.vy, facing: dir,
        dmg: m.shotDmg, stun: m.shotStun, kb: m.shotKb ?? 2, volley, range: m.shotRange ?? SHOT_RANGE,
        anchor: !!spec.anchor, target: null, stuck: 0, travelled: 0, dead: false,
      };
      if (sh.anchor) volley.anchor = sh;
      this.shots.push(sh);
    }
    this.events.push({ type: 'throw', x: f.x, y: f.y - 96 });
  }

  /** หมุดที่ยังวาร์ปไปได้ของฝั่งนี้ (มีดกลางที่ยังไม่หมดอายุ) */
  anchorOf(f) {
    return this.shots.find((s) => s.anchor && s.owner === f.id && !s.dead) ?? null;
  }

  updateShots() {
    for (const sh of this.shots) {
      if (sh.dead) continue;
      // มีดที่ปะทะแล้วหยุดนิ่ง นับถอยหลังรอหมดอายุ ไม่บินต่อ
      // ถ้าเป็นหมุดที่หมายหัวคนไว้ ให้เกาะตัวเขาไปเรื่อย ๆ เขาวิ่งไปไหนหมุดก็ตามไป
      if (sh.stuck > 0) {
        if (sh.target) {
          const t = this.fighterById(sh.target);
          if (t) { sh.x = t.x; sh.y = t.y - 70; }
        }
        if (--sh.stuck <= 0) sh.dead = true;
        continue;
      }
      sh.x += sh.vx; sh.y += sh.vy; sh.travelled += Math.abs(sh.vx);

      const foe = sh.owner === 'p1' ? this.p2 : this.p1;
      const hurt = foe.hurtbox();
      const hit = sh.x > hurt.x && sh.x < hurt.x + hurt.w && sh.y > hurt.y && sh.y < hurt.y + hurt.h;
      const wall = sh.x < STAGE.wallL || sh.x > STAGE.wallR;
      const spent = sh.travelled >= (sh.range ?? SHOT_RANGE);
      if (!hit && !wall && !spent) continue;

      if (hit && foe.invuln <= 0 && !sh.volley.hit.has(foe.id)) {
        sh.volley.hit.add(foe.id);
        this.hitByShot(sh, foe);
        this.markTarget(sh.volley, foe);
      }
      // มีดกลางค้างไว้เป็นหมุดตรงจุดที่หยุด เล่มอื่นหายไปเลย
      // ถ้าเพิ่งหมายหัวไปเมื่อกี้ (markTarget ตั้ง target + เวลาไว้แล้ว) ห้ามทับเวลาด้วยค่าหมุดธรรมดา
      // ไม่งั้นกรณีที่ "เล่มกลางเองเป็นคนโดน" จะได้เวลาสั้นแบบขว้างพลาด ทั้งที่ควรได้ 5 วิ
      if (sh.anchor) {
        if (!sh.target) { sh.stuck = ANCHOR_HOLD; this.events.push({ type: 'anchor', x: sh.x, y: sh.y }); }
      } else sh.dead = true;
      if (wall) sh.x = Math.max(STAGE.wallL, Math.min(STAGE.wallR, sh.x));
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  /** เกราะกินหมัดนี้ไว้ไหม — ต้องอยู่ในท่าที่ประกาศเกราะ และโควต้ายังไม่หมด
   *
   *  เกราะไม่ใช่การกันดาเมจ แต่คือการ "ไม่ถูกดีดออกจากท่า" — เจ็บเท่าเดิมโดยประมาณ
   *  แต่ท่าเดินต่อ ซึ่งเป็นสิ่งเดียวที่ทำให้ตัวช้าเดินฝ่าการจิ้มสกัดเข้ามาได้จริง
   */
  armorHolds(d) {
    return !!(d.move && d.move.armor && d.armorLeft > 0 && d.state === 'attack');
  }

  /** กินหมัดด้วยเกราะ: เสียเลือดลดลง ไม่เข้า hitstun ท่าไม่ขาด
   *  ไม่นับ comboHits ด้วย — คนตีไม่ได้กำลังต่อคอมโบอยู่ เขาแค่ยิงใส่กำแพง */
  takeArmored(a, d, dmg, x, y) {
    d.armorLeft--;
    const real = Math.max(1, Math.round(dmg * ARMOR_DMG));
    d.hp = Math.max(0, d.hp - real);
    d.lastHitF = this.frame;
    a.hitstop = d.hitstop = 5;
    this.gainKi(a, real * 0.8); this.gainKi(d, real * 1.2);
    this.events.push({ type: 'armor', x, y, dmg: real, left: d.armorLeft });
  }

  /** ตราสลายเองเมื่อไม่โดนแส้ซ้ำนานพอ — เป็นเหตุผลที่ถอยออกไปตั้งหลักได้ผล */
  /** บัฟกีตาร์ติดไฟ + ไฟที่ติดอยู่กับตัว — เดินด้วยเลขเฟรมล้วน ห้ามผูกกับเวลาจริง
   *
   * ไฟของ Orpheus ต่างจากกองไฟของ Alecto ตรงที่ **ติดไปกับคนที่โดน**
   * หนีออกจากจุดที่โดนแล้วก็ยังไหม้ต่อ ซึ่งเป็นคนละปัญหากับ "อย่าเดินเข้าไปตรงนั้น"
   */
  tickFlame(f) {
    if (f.burn <= 0) return;
    f.burn--;
    if (f.burn % BURN_TICK) return;
    // ไม่คูณกับตัวลดดาเมจคอมโบ เพราะตอดห่างกันเกินกว่าตัวนับคอมโบจะต่อติด
    // ตั้งเลขดิบให้ต่ำตั้งแต่แรกแทน (บทเรียนจากท่ายืนยิงของ Alecto ที่คำนวณไว้ 19 แต่ออกจริง 46)
    const dmg = BURN_DMG;
    f.hp = Math.max(0, f.hp - dmg);
    f.lastHitF = this.frame;
    this.gainKi(f, dmg * 0.6);
    this.events.push({ type: 'burn', x: f.x, y: f.y - 70, dmg });
  }

  decayLash(f) {
    if (f.lash <= 0) return;
    const idle = this.frame - f.lashF;
    // ตัวที่ทนสถานะ (resist < 1) สลายเร็วขึ้นตามส่วน — Atlas 0.5 = เร็วเป็นสองเท่า
    const every = Math.max(1, Math.round(LASH_EVERY * f.resist));
    const delay = Math.round(LASH_DELAY * f.resist);
    if (idle >= delay && (idle - delay) % every === 0) f.lash--;
  }

  /** ตัวคูณดาเมจจากตราที่เป้ามีอยู่ — เพดาน x1.40 เล็กกว่าเพดานลดคอมโบ x0.50 เสมอ */
  lashMul(d) { return 1 + LASH_DMG * d.lash; }

  addLash(d) {
    d.lash = Math.min(LASH_MAX, d.lash + 1);
    d.lashF = this.frame;
    this.events.push({ type: 'lash', x: d.x, y: d.y - 110, n: d.lash });
  }

  /** วางกล่องระเบิดหนึ่งใบ — วางเกินโควต้าแล้วใบเก่าสุดหายไป ไม่ใช่วางไม่ได้
   *
   *  เลือกให้ใบเก่าหายเพราะ "กดแล้วไม่เกิดอะไร" เป็นความรู้สึกที่แย่ที่สุดในเกมต่อสู้
   *  คนเล่นจะไม่รู้ว่าติดโควต้าอยู่ เห็นแค่ว่ากดสกิลแล้วเสียจังหวะไปเปล่า ๆ
   */
  dropBox(x, owner, fuse = BOX_FUSE) {
    this.boxes.push({
      x: Math.max(STAGE.wallL + 20, Math.min(STAGE.wallR - 20, x)),
      owner, fuse, arm: BOX_ARM,
    });
    if (this.boxes.length > BOX_MAX) this.boxes.shift();
    this.events.push({ type: 'box', x: this.boxes[this.boxes.length - 1].x, y: STAGE.groundY });
  }

  /** ระเบิดหนึ่งครั้งที่จุด x — **ไล่เช็กทุกคน ไม่ใช่แค่ฝ่ายตรงข้าม**
   *
   *  ตรงนี้คือกฎเหล็กของตัวละครทั้งตัว: เจ้าของโดนระเบิดตัวเองด้วย
   *  กองไฟของ Alecto เขียนว่า `fire.owner === 'p1' ? this.p2 : this.p1` ซึ่งข้ามเจ้าของไป
   *  ถ้าลอกมาตรง ๆ ตัวนี้จะกลายเป็นตัววางระเบิดที่ปลอดภัยเสมอ ซึ่งพลาดทั้งคอนเซปต์
   */
  blast(x, half, dmg, stun, kb) {
    this.events.push({ type: 'blast', x, y: STAGE.groundY, r: half });
    for (const f of [this.p1, this.p2]) {
      if (f.invuln > 0 || Math.abs(f.x - x) > half) continue;
      const dir = f.x >= x ? 1 : -1;
      const facingBlast = Math.sign(x - f.x) === f.facing || f.x === x;
      if ((f.state === 'block' || f.state === 'blockcrouch') && f.onGround && facingBlast) {
        f.lowStun = f.state === 'blockcrouch';
        f.setState('blockstun'); f.stun = Math.ceil(stun * 0.45);
        this.gainKi(f, dmg * 0.6);
        this.events.push({ type: 'block', x: f.x, y: f.y - 70 });
        continue;
      }
      const scale = Math.max(0.5, 1 - 0.08 * f.comboHits);
      const real = Math.max(1, Math.round(dmg * scale * f.resist * (f.dustGuard ? DUST_DR : 1)));
      if (this.armorHolds(f)) { this.takeArmored(f, f, real, x, f.y - 70); continue; }
      f.hp = Math.max(0, f.hp - real);
      f.comboHits++; f.comboDmg += real; f.lastHitF = this.frame;
      f.stun = stun;
      f.move = null; f.moveId = null; f.setState('hitstun');
      f.stanceUntil = -9999;
      f.vx = dir * kb[0]; f.vy = kb[1];
      if (kb[1] < 0) f.onGround = false;
      this.gainKi(f, real * 0.9);
      this.events.push({ type: 'hit', x: f.x, y: f.y - 70, dmg: real, heavy: true, launch: kb[1] < 0 });
    }
  }

  /** เดินกล่องทุกใบหนึ่งเฟรม — นับถอยหลังด้วยเลขเฟรมล้วน ห้ามผูกกับเวลาจริง */
  updateBoxes() {
    if (!this.boxes.length) return;
    const live = [];
    for (const b of this.boxes) {
      if (b.arm > 0) b.arm--;
      b.fuse--;
      // ติดชนวนแล้วใครเดินเข้ามาใกล้ก็ระเบิดทันที ไม่ต้องรอครบเวลา — รวมเจ้าของ
      const touched = b.arm === 0 && [this.p1, this.p2].some(
        (f) => f.onGround && f.invuln <= 0 && Math.abs(f.x - b.x) <= BOX_TRIGGER);
      if (b.fuse > 0 && !touched) { live.push(b); continue; }
      this.blast(b.x, BOX_HALF, BOX_DMG, BOX_STUN, BOX_KB);
    }
    this.boxes = live;
  }

  /** ดีดนิ้วสลับที่ แล้วระเบิดขึ้นทั้งจุดที่ไปและจุดที่มา
   *
   *  สลับ x อย่างเดียว ห้ามแตะ y/vx/vy — สลับความเร็วด้วยจะกระตุกและคาดเดาไม่ได้
   *  ไม่สลับถ้าอีกฝ่ายมี invuln (กำลังล้ม/กลิ้งอยู่) ไม่งั้นลากคนที่ล้มอยู่ได้ = พัง
   *  แต่ **ระเบิดยังขึ้นทั้งสองจุดเสมอ** ต่อให้สลับไม่ได้ ไม่งั้นกดแล้วไม่เกิดอะไรเลย
   */
  swapBlast(f) {
    const o = this.foe(f);
    const mine = f.x, theirs = o.x;
    if (o.invuln <= 0 && o.state !== 'knockdown' && o.state !== 'techroll') {
      f.x = Math.max(STAGE.wallL, Math.min(STAGE.wallR, theirs));
      o.x = Math.max(STAGE.wallL, Math.min(STAGE.wallR, mine));
      this.events.push({ type: 'vanish', x: mine, y: f.y });
      this.events.push({ type: 'appear', x: f.x, y: f.y });
    }
    this.blast(mine, SNAP_HALF, SNAP_DMG, SNAP_STUN, SNAP_KB);
    this.blast(theirs, SNAP_HALF, SNAP_DMG, SNAP_STUN, SNAP_KB);
  }

  /** โปรยกล่องทั่วเวที ชนวนเหลื่อมกันทีละใบ = ระเบิดไล่กันเป็นทอด ๆ
   *  ตำแหน่งคิดจากความกว้างเวทีล้วน ไม่มีสุ่ม สองเครื่องจึงได้กล่องตรงกันเป๊ะ */
  rainBoxes(f, n) {
    const span = STAGE.wallR - STAGE.wallL;
    for (let i = 0; i < n; i++) {
      const x = STAGE.wallL + span * (i + 0.5) / n;
      // ใบที่อยู่ใกล้เขาที่สุดติดชนวนช้าที่สุด = เขาได้เปรียบเรื่องจังหวะ ไม่ใช่เรื่องความปลอดภัย
      this.boxes.push({ x, owner: f.id, fuse: 40 + i * RAIN_STEP, arm: BOX_ARM });
    }
    this.events.push({ type: 'rain', x: f.x, y: f.y - 120, n });
  }

  /** กองไฟบนพื้น — เดินด้วยเลขเฟรมล้วน ห้ามผูกกับเวลาจริง ไม่งั้นสองเครื่องหลุดกัน */
  spawnFire(f, spec) {
    const x = Math.max(STAGE.wallL + FIRE_HALF, Math.min(STAGE.wallR - FIRE_HALF, f.x + f.facing * spec.dx));
    this.fires.push({ x, owner: f.id, life: FIRE_LIFE, t: 0, burns: !!spec.burns });
    this.events.push({ type: 'firepool', x, y: STAGE.groundY });
  }

  /** วงฝุ่น — เดินด้วยเลขเฟรมล้วน ห้ามผูกกับเวลาจริง ไม่งั้นสองเครื่องหลุดกัน
   *
   * dustGuard = อยู่ในวงอยู่ตอนนี้ (ลดดาเมจ + กันสถานะ)
   * veil      = ยังจางอยู่ รวมช่วงที่ออกจากวงมาแล้ว (ใช้แค่ตอนวาด ไม่กระทบการคำนวณ)
   * แยกสองค่าเพราะ "ป้องกัน" ต้องหมดทันทีที่ออกจากวง แต่ "มองไม่เห็น" ต้องค้างต่อให้มีเวลาหนี
   */
  /** วงฝุ่น: ที่กำบังของเจ้าของ และ "กรง" ของอีกฝ่าย
   *
   *  กรงเป็นประตูทางเดียว — เดินเข้าได้เสมอ แต่เดินออกทางข้างไม่ได้
   *  ทำแบบนี้เพราะถ้ากันทั้งสองทาง มันจะกลายเป็นกำแพงกันตัวเธอเอง ซึ่งไม่ใช่ท่านี้
   *  คนที่ยืนอยู่นอกวงตั้งแต่แรกจึงไม่ติดอะไรเลย จนกว่าจะเดินเข้ามาเอง
   *
   *  ทางออกคือ **กระโดดข้ามขอบ** — กรงจับเฉพาะตอนเท้าติดพื้น
   *  จึงไม่ใช่ท่าที่ "เสียเทิร์นไปเฉย ๆ" แต่ต้องจ่ายด้วยการกระโดด ซึ่งอ่านออกและสวนได้
   *  และนั่นคือช่วงเวลาที่เธอใช้หนี: เธอเดินทะลุออกไปได้ อีกฝ่ายต้องกระโดดตาม
   */
  updateDust() {
    if (this.dust && --this.dust.life <= 0) this.dust = null;
    const d = this.dust;
    const L = d ? d.x - DUST_HALF : 0, R = d ? d.x + DUST_HALF : 0;
    for (const f of [this.p1, this.p2]) {
      const caught = !!d && f.id !== d.owner;
      // ดันกลับเข้าขอบก่อนวัดว่าอยู่ในวงไหม — ฟิสิกส์ของเฟรมนี้พาเขาออกไปแล้ว
      if (caught && f.caged && f.onGround && (f.x < L || f.x > R)) {
        f.x = f.x < L ? L : R; f.vx = 0;
        this.events.push({ type: 'caged', x: f.x, y: STAGE.groundY });
      }
      const inside = !!d && f.x >= L && f.x <= R;
      // ติดกรงตอนอยู่ในวง · ลอยอยู่ = หลุดกรงชั่วคราว ลงพื้นนอกวงเมื่อไหร่ก็เป็นอิสระ
      f.caged = caught && f.onGround && (inside || f.caged) ? 1 : 0;
      f.dustGuard = inside ? 1 : 0;
      f.veil = inside ? VEIL_TIME : Math.max(0, f.veil - 1);
    }
  }

  updateFires() {
    for (const fire of this.fires) {
      fire.life--; fire.t++;
      if (fire.t % FIRE_TICK) continue;
      const d = fire.owner === 'p1' ? this.p2 : this.p1;
      if (d.invuln > 0 || !d.onGround) continue;
      if (Math.abs(d.x - fire.x) > FIRE_HALF) continue;
      const dmg = Math.max(1, Math.round(FIRE_DMG * d.resist * Math.max(0.5, 1 - 0.08 * d.comboHits)));
      d.hp = Math.max(0, d.hp - dmg);
      d.lastHitF = this.frame;
      this.gainKi(d, dmg * 0.6);
      this.events.push({ type: 'burn', x: d.x, y: d.y - 60, dmg });
      // กองไฟของ Orpheus ทำให้ติดไฟตามตัวไปด้วย ของ Alecto ไม่ทำ (เธอเผาที่ เขาเผาคน)
      if (fire.burns && d.burn <= 0) this.events.push({ type: 'ignite', x: d.x, y: d.y - 90 });
      // ต้านไฟลดที่ "ไหม้นานแค่ไหน" ไม่ใช่ "ตอดทีละเท่าไหร่"
      // เพราะตอดทีละ 1 อยู่แล้ว ครึ่งหนึ่งยังปัดเป็น 1 เหมือนเดิม resist เลยหายไปเฉย ๆ
      // (วิธีเดียวกับที่ตรารอยแส้ของ Alecto สลายเร็วขึ้นตาม resist)
      if (fire.burns && !d.dustGuard) d.burn = Math.round(BURN_TIME * d.resist);
    }
    this.fires = this.fires.filter((fi) => fi.life > 0);
  }

  hitByShot(sh, d) {
    const a = sh.owner === 'p1' ? this.p1 : this.p2;
    const facingAttacker = Math.sign(a.x - d.x) === d.facing || a.x === d.x;
    if ((d.state === 'block' || d.state === 'blockcrouch') && d.onGround && facingAttacker) {
      d.lowStun = d.state === 'blockcrouch';
      d.setState('blockstun'); d.stun = Math.ceil(sh.stun * 0.45);
      this.gainKi(a, sh.dmg * 0.4); this.gainKi(d, sh.dmg * 0.6);
      this.events.push({ type: 'block', x: sh.x, y: sh.y });
      return;
    }
    const scale = Math.max(0.5, 1 - 0.08 * d.comboHits);
    const dmg = Math.max(1, Math.round(sh.dmg * scale * (d.dustGuard ? DUST_DR : 1)));
    // เกราะกินกระสุนด้วย ไม่งั้น "ทะลุกระสุนได้" ที่ออกแบบไว้ไม่เป็นจริง
    if (this.armorHolds(d)) { this.takeArmored(a, d, dmg, sh.x, sh.y); return; }
    d.hp = Math.max(0, d.hp - dmg);
    d.comboHits++; d.comboDmg += dmg; d.lastHitF = this.frame;
    d.stun = Math.round(sh.stun * Math.max(0.55, 1 - 0.05 * (d.comboHits - 1)));
    d.move = null; d.moveId = null; d.setState('hitstun');
    // แรงดันมาจากท่า ไม่ใช่ค่าคงที่ — ชุดสับรีวอลเวอร์ของ Alecto ต้องดันคนออกจากหน้าได้จริง
    // ถีบขึ้นยังเป็น 0 เสมอ กระสุนไม่ควรจับลอย (กับดักเดิมที่กัดมาสี่รอบ)
    d.vx = sh.facing * (sh.kb ?? 2);
    d.facing = -sh.facing;
    this.gainKi(a, dmg * 1.4); this.gainKi(d, dmg * 0.9);
    this.events.push({ type: 'hit', x: sh.x, y: sh.y, dmg, heavy: false, launch: false });
  }

  /** วาร์ปไปที่หมุด — ใช้กับ curse2 ตอนกดปุ่มซ้ำ */
  warpToAnchor(f) {
    const a = this.anchorOf(f);
    if (!a) return false;
    this.events.push({ type: 'vanish', x: f.x, y: f.y });
    let dest = a.x;
    if (a.target) {
      const t = this.fighterById(a.target);
      // โผล่ข้างตัวเป้าฝั่งที่วิ่งมา ไม่ใช่ทับตัวเขา (ทับแล้วโดนดันออกทันทีที่หมด invuln)
      if (t) dest = t.x - (Math.sign(t.x - f.x) || f.facing) * ULT_GAP;
    }
    const half = PHYS.width / 2;
    f.x = Math.max(STAGE.wallL + half, Math.min(STAGE.wallR - half, dest));
    f.y = STAGE.groundY; f.vx = 0; f.vy = 0; f.onGround = true;
    a.dead = true;
    this.events.push({ type: 'appear', x: f.x, y: f.y });
    return true;
  }

  // สกิลพร้อมใช้ไหม — สล็อต 3 ดูหลอด ki ที่เหลือใช้คูลดาวน์เวลา
  // f.used กันไม่ให้สกิลเดียวกันออกซ้ำในคอมโบเดียว (เคลียร์เมื่อเริ่มท่าจากท่ายืน)
  skillReady(f, i) {
    const id = f.skills[i];
    if (!id) return false;
    // มีหมุดค้างอยู่ = ครึ่งหลังของการใช้ครั้งเดิม กดได้เสมอ ไม่ติดคูลดาวน์และไม่ติด used
    if (f.moves[id].shots && this.anchorOf(f)) return true;
    if (f.used.has(id)) return false;
    return i === 2 ? f.ki >= KI_MAX : f.cd[i] <= 0;
  }

  startSkill(f, i, dir) {
    // เทงงุกดซ้ำตอนมีดกลางยังค้างอยู่ = วาร์ปตามไป ไม่ใช่ขว้างชุดใหม่ (ไม่กินคูลดาวน์เพิ่ม)
    // ท่าที่ตามหมุดไปเป็นของตัวละครนั้น ไม่ใช่ชื่อตายตัว — Alecto ก็ใช้ระบบกระสุนแต่ไม่มีหมุด
    const sk = f.skills[i] && f.moves[f.skills[i]];
    const follow = sk && sk.shots && sk.warpFollow && this.anchorOf(f) ? sk.warpFollow : null;
    if (follow) { this.startMove(f, follow, dir || f.facing); return; }
    if (i === 2) { f.ki = 0; this.events.push({ type: 'ult', x: f.x, y: f.y - 60 }); }
    else f.cd[i] = f.skillCd[i];
    // โควต้า "กดรัวเพื่อต่อรอบ" เป็นของการกดสกิลหนึ่งครั้ง ตั้งตอนเริ่มชุด ไม่ใช่ตอนถึงท่าที่วน
    f.mashLeft = f.moves[f.skills[i]].mashMax ?? 0;
    const st = f.moves[f.skills[i]].stance;
    f.stanceUntil = st ? this.frame + st : -9999;
    // กดทิศตรงข้ามกับที่หันอยู่ค้างไว้ = ถอยก่อนแล้วค่อยใช้อาวุธ (ท่าถอย autoChain เข้าสกิลเอง)
    // อ่านจาก f.inp ของเฟรมนั้น ไม่ใช่ปุ่มที่ค้างตอนวาด — สองเครื่องต้องอ่านค่าเดียวกัน
    const back = f.backstep && f.backstep[f.skills[i]];
    const held = f.inp ? (f.inp.right ? 1 : 0) - (f.inp.left ? 1 : 0) : 0;
    if (back && held === -f.facing) { this.startMove(f, back, f.facing); return; }
    this.startMove(f, f.skills[i], dir || f.facing);
  }

  doJump(f, inp) {
    if (f.onGround || f.coyote > 0) {
      f.vy = PHYS.jumpV; f.onGround = false; f.coyote = 0;
    } else if (f.jumpsLeft > 0) {
      f.jumpsLeft--; f.vy = PHYS.dJumpV;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (dir) { f.vx = dir * PHYS.airMax; f.facing = dir; }
      this.events.push({ type: 'djump', x: f.x, y: f.y });
    } else return false;
    f.jumpHeldSinceTakeoff = true;
    f.move = null; f.moveId = null; f.setState('air');
    return true;
  }

  controlPlayer(f, inp) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    // dash detection: double tap
    if (inp.p.left || inp.p.right) {
      const tapDir = inp.p.right ? 1 : -1;
      f.dashLatch = f.lastTap.dir === tapDir && this.frame - f.lastTap.f <= PHYS.dashWindow;
      f.lastTap = { dir: tapDir, f: this.frame };
    }
    if (dir === 0) f.dashLatch = false;
    // วิ่งเสมอ — ไม่มีปุ่มเดิน/ปุ่มวิ่งแยกแล้ว ตามที่ผู้เล่นขอ ("เกมนี้ไม่จำเป็นต้องเดิน")
    // ยังคำนวณ dashLatch ไว้ข้างบนเพราะปุ่ม dash ที่จะทำทีหลังจะมาใช้ต่อ
    const running = true;

    if (!inp.jump) f.jumpHeldSinceTakeoff = false;

    // cancels during attack
    if (f.state === 'attack') {
      const m = f.move;
      const afterActive = f.moveF >= m.startup + m.active;
      // ท่าที่ติดธง mobile: ย่องไปมาได้ระหว่างอยู่ในท่า (ช้ากว่าวิ่งปกติมาก)
      // ท่าตั้งป้อมยืนยิงของ Alecto ใช้อันนี้ — ปักหลักนิ่งสนิท 3-5 วินาทีแล้วขาตาย
      // หันเข้าหาคู่ต่อสู้ให้เองด้วย ถอยหลังจึงยังยิงใส่เขาอยู่ ไม่ใช่หันหลังยิงทิ้ง
      if (m.mobile && f.onGround) {
        this.faceFoe(f);
        if (dir !== 0) {
          const target = dir * PHYS.run * m.mobile;
          f.vx += Math.sign(target - f.vx) * Math.min(PHYS.groundAccel, Math.abs(target - f.vx));
        }
      }
      if (f.hitConfirmed && m.jumpCancel && this.buffered(f, 'jump') && (f.onGround || f.jumpsLeft > 0)) {
        this.consume(f, 'jump'); f.used.clear(); this.doJump(f, inp); return;
      }
      // ต่อคอมโบเข้าสกิล: กดปุ่มสกิลตอนท่าปัจจุบัน "ตีโดนแล้ว" ยกเลิกท่าเข้าสกิลได้เลย
      // เงื่อนไข hitConfirmed ทำให้ยกเลิกท่าที่ตีพลาดไม่ได้ ท่าที่พลาดจึงยังมีจังหวะเสียตามเดิม
      // กินปุ่มเฉพาะตอนยกเลิกได้จริง ที่เหลือปล่อยค้างใน buffer ต่อ (เหมือนปุ่มตี)
      // ถ้ากินทิ้งตรงนี้ กดสกิลท้ายท่าที่ฟันลมจะเงียบสนิท ทั้งที่ควรออกท่าทันทีที่ท่าเดิมจบ
      for (let i = 0; i < f.skills.length; i++) {
        if (!this.buffered(f, 'skill' + (i + 1))) continue;
        if (!f.hitConfirmed || !f.onGround || f.moveF < m.startup) continue;
        if (!this.skillReady(f, i)) continue;
        this.consume(f, 'skill' + (i + 1));
        this.startSkill(f, i, f.facing); return;
      }
      // ชุดท่าที่ต่อกันเองอยู่แล้ว (autoChain/mashChain) ห้ามโดนปุ่มตียกเลิกกลางคัน
      // ไม่งั้นการ "กดรัวเพื่อต่อรอบ" กลายเป็นการยกเลิกอัลติทิ้งไปออกหมัดธรรมดาแทน
      // (วัดได้จริง: กดรัวตอนอัลติแล้วหลุดไป jab1 ตั้งแต่จังหวะแรก)
      if (m.autoChain || m.mashChain) return;
      if (this.buffered(f, 'attack')) {
        const neutral = dir === 0 && !inp.up && !inp.down;
        let next = null;
        if (m.chain && neutral && (afterActive || f.hitConfirmed)) next = m.chain;
        else if (f.hitConfirmed && f.moveF >= m.startup) {
          const cand = this.pickMove(f, inp);
          if (!f.used.has(cand) && f.moves[cand].kind === m.kind) next = cand;
        }
        if (next) { this.consume(f, 'attack'); this.startMove(f, next, dir); return; }
      }
      return;
    }
    if (!ACTIONABLE.has(f.state)) return;

    // jump / drop-through
    if (this.buffered(f, 'jump')) {
      if (f.onGround && inp.down && f.y < STAGE.groundY) {
        this.consume(f, 'jump'); f.dropT = 14; f.onGround = false; f.y += 2; f.setState('air'); return;
      }
      if (this.doJump(f, inp)) { this.consume(f, 'jump'); return; }
    }
    // สกิล 1/2/3 — เริ่มได้เฉพาะตอนยืนอยู่บนพื้น (เป็นคอมโบเดินหน้า ไม่มีเวอร์ชันกลางอากาศ)
    // สล็อตที่ยังว่าง (SKILLS[i] === null) กินปุ่มทิ้งไปเฉย ๆ ไม่ค้างอยู่ใน buffer ให้ไปออกท่าทีหลัง
    for (let i = 0; i < f.skills.length; i++) {
      if (!this.buffered(f, 'skill' + (i + 1))) continue;
      this.consume(f, 'skill' + (i + 1));
      if (!f.onGround) continue;
      f.used.clear();                       // เริ่มคอมโบใหม่จากท่ายืน สกิลที่เคยใช้ไปแล้วกลับมาใช้ได้
      if (!this.skillReady(f, i)) continue; // ติดคูลดาวน์/ki ไม่พอ = กินปุ่มทิ้ง ไม่ค้างไว้ออกทีหลัง
      this.startSkill(f, i, dir || f.facing); return;
    }
    // attack
    if (this.buffered(f, 'attack')) {
      this.consume(f, 'attack'); f.used.clear();
      this.startMove(f, this.pickMove(f, inp), dir); return;
    }
    if (f.onGround) {
      // กัน + กดลง = ก้มกัน (กรอบเตี้ยลงเท่าท่าย่อ) · กันเฉย ๆ = กันยืนเหมือนเดิม
      // เช็ค block ก่อน down เหมือนเดิม ท่าย่อธรรมดาจึงไม่เปลี่ยนพฤติกรรม
      if (inp.block) { f.setState(inp.down ? 'blockcrouch' : 'block'); f.vx *= PHYS.stopFric; return; }
      if (inp.down) { f.setState('crouch'); f.vx *= PHYS.stopFric; return; }
      if (dir !== 0) {
        f.facing = dir;
        // ตรารอยแส้ทำให้คนโดนเดินช้าลง — เป็นตัวที่ทำให้ "หนีจากเธอไม่ออก" เป็นจริงเชิงกลไก
        const slow = Math.max(0.4, 1 - LASH_SLOW * f.lash * f.resist);
        const target = dir * (running ? PHYS.run : PHYS.walk) * slow;
        f.vx += Math.sign(target - f.vx) * Math.min(PHYS.groundAccel * (running ? PHYS.runAccelMul : 1), Math.abs(target - f.vx));
        f.setState(running ? 'run' : 'walk');
      } else { f.vx *= PHYS.stopFric; if (Math.abs(f.vx) < 0.2) f.vx = 0; f.setState('idle'); }
    } else {
      if (dir !== 0) {
        const lim = Math.max(PHYS.airMax, Math.abs(f.vx) * (Math.sign(f.vx) === dir ? 1 : 0));
        f.vx = Math.max(-lim, Math.min(lim, f.vx + dir * PHYS.airAccel));
        f.facing = dir;
      } else f.vx *= PHYS.airFric;
      if (f.vy < PHYS.jumpCut && !f.jumpHeldSinceTakeoff) f.vy = PHYS.jumpCut; // variable jump height
      if (inp.down && f.vy > -2) f.vy = Math.max(f.vy, PHYS.fastFall);   // fast fall
    }
  }

  controlDummy(f) {
    const p = this.p1;
    if (!ACTIONABLE.has(f.state)) return;
    if (f.onGround) f.facing = p.x >= f.x ? 1 : -1;
    if (!f.onGround) { f.vx *= PHYS.airFric; return; }
    f.vx *= PHYS.stopFric;
    if (this.dummyMode === 'block') f.setState('block');
    else if (this.dummyMode === 'jump' && f.stateF > 45) { f.vy = PHYS.jumpV; f.onGround = false; f.setState('air'); }
    else f.setState('idle');
  }

  physics(f) {
    f.stateF++;
    if (f.invuln > 0) f.invuln--;
    if (f.dropT > 0) f.dropT--;
    if (f.coyote > 0) f.coyote--;
    for (let i = 0; i < f.cd.length; i++) if (f.cd[i] > 0) f.cd[i]--;
    const m = f.state === 'attack' ? f.move : null;
    // ท่าที่มี iframes: อัดค่า invuln ใหม่ทุกเฟรมที่อยู่ในช่วง แทนที่จะตั้งครั้งเดียวตอนเริ่มท่า
    // (ตั้งครั้งเดียวจะโดนบรรทัด f.invuln-- ข้างบนกินไปเรื่อย ๆ จนหมดก่อนช่วงจริงจะจบ)
    if (m && m.iframes && f.moveF >= m.iframes[0] && f.moveF < m.iframes[1]) f.invuln = Math.max(f.invuln, 2);
    // attack impulses
    if (m && m.imp && f.moveF === m.imp.f) {
      if (m.imp.vx !== undefined) f.vx = f.facing * m.imp.vx;
      if (m.imp.vxMul !== undefined) f.vx *= m.imp.vxMul;
      if (m.imp.vy !== undefined) f.vy = m.imp.vy;
    }
    if (!f.onGround) {
      let g = PHYS.gravity;
      if (f.state === 'hitstun') g *= Math.min(1.6, 1 + 0.04 * f.comboHits); // juggle gravity scaling
      if (m && m.floaty && f.phase() === 'active') g *= 0.15;
      f.vy = Math.min(f.vy + g, (m && m.untilLand) ? 22 : Math.max(PHYS.fallMax, f.vy));
    } else if (m) {
      // ท่าที่มี glide: คงความเร็วไว้ตลอดหน้าต่างโจมตี = พุ่งด้วยความเร็วคงที่จนจบช่วงพุ่ง
      // ถ้าปล่อยให้แรงเสียดทานกิน แรงถีบครั้งเดียวจะพุ่งได้แค่ ~1/2 ของระยะที่ออกแบบไว้
      const gliding = m.glide && f.moveF >= m.startup && f.moveF < m.startup + m.active;
      // ท่าที่ขยับได้ใช้แรงเสียดทานแบบเดินปกติ ไม่ใช่ 0.82 ที่ตั้งไว้ให้ท่าโจมตีหยุดนิ่ง
      if (m.mobile) f.vx *= (f.inp && (f.inp.left || f.inp.right)) ? 0.98 : PHYS.stopFric;
      else if (!gliding) f.vx *= 0.82;
    }
    else if (f.state === 'hitstun' || f.state === 'knockdown' || f.state === 'blockstun') f.vx *= 0.85;

    const prevY = f.y;
    f.x += f.vx; f.y += f.vy;

    // walls
    const half = PHYS.width / 2;
    if (f.x - half < STAGE.wallL || f.x + half > STAGE.wallR) {
      f.x = Math.max(STAGE.wallL + half, Math.min(STAGE.wallR - half, f.x));
      if (f.state === 'hitstun' && Math.abs(f.vx) > 7 && !f.wallBounced) {
        f.vx = -f.vx * 0.55; f.vy = Math.min(f.vy, -7); f.wallBounced = true; f.stun += 12;
        f.hitstop = 6;
        this.events.push({ type: 'wall', x: f.x, y: f.y - 60 });
      } else f.vx = 0;
    }

    // ground / platforms
    const wasGround = f.onGround;
    f.onGround = false;
    if (f.y >= STAGE.groundY) { f.y = STAGE.groundY; f.onGround = true; }
    else if (f.vy >= 0 && f.dropT === 0) {
      for (const pl of STAGE.platforms) {
        if (f.x >= pl.x1 && f.x <= pl.x2 && prevY <= pl.y && f.y >= pl.y) { f.y = pl.y; f.onGround = true; break; }
      }
    }
    if (f.onGround) {
      if (!wasGround) this.onLand(f, prevY);
      f.vy = 0; f.jumpsLeft = 1;
    } else if (wasGround && f.vy >= 0) {
      f.coyote = PHYS.coyote; // walked off a ledge
      if (ACTIONABLE.has(f.state)) f.setState('air');
    }
  }

  onLand(f) {
    this.events.push({ type: 'land', x: f.x, y: f.y, hard: f.vy > 12 });
    if (f.state === 'hitstun') {
      const tech = this.techChoice(f);
      if (tech === null) {
        f.setState('knockdown'); f.stun = PHYS.knockdownFrames; f.invuln = PHYS.knockdownFrames + 2; f.vx *= 0.4;
      } else if (tech === 0) {
        f.setState('tech'); f.stun = PHYS.techFrames; f.invuln = PHYS.techFrames; f.vx = 0;
        this.events.push({ type: 'tech', x: f.x, y: f.y - 40, label: 'Tech' });
      } else {
        f.setState('techroll'); f.stun = PHYS.techRollFrames; f.invuln = PHYS.techRollFrames - 4;
        f.vx = tech * PHYS.techRollSpeed; f.facing = -tech;
        this.events.push({ type: 'tech', x: f.x, y: f.y - 40, label: 'Tech roll' });
      }
      f.techBuf = 0; f.techLock = 0; return;
    }
    if (f.state === 'attack') {
      const lag = f.move.untilLand ? f.move.landLag : 5;
      f.move = null; f.moveId = null; f.setState('landing'); f.stun = lag; f.used.clear(); return;
    }
    if (f.state === 'air') f.setState('idle');
    f.used.clear();
  }

  // returns null = no tech (knockdown), 0 = tech in place, -1 / 1 = tech roll direction
  /** ฝั่งที่มีคนเล่นอยู่ตัดสินจากปุ่มที่กด · ฝั่งที่เป็นหุ่นซ้อมตัดสินจากโหมดที่ตั้งไว้
   *  แยกด้วย "มีอินพุตไหม" ไม่ใช่ด้วยไอดี p1/p2 — เล่นสองคนแล้วทั้งสองฝั่งต้อง tech ได้เหมือนกัน
   *  โหมดสุ่มของหุ่นใช้ Math.random ซึ่งใช้ไม่ได้ตอนเล่นข้ามเครื่อง (สองเครื่องจะสุ่มไม่ตรงกัน)
   *  จึงถูกกันไว้ด้วยเงื่อนไข f.inp อยู่แล้ว — ฝั่งที่มีคนเล่นไม่มีทางเข้าไปถึงบรรทัดนั้น */
  techChoice(f) {
    if (f.inp) {
      if (f.techBuf <= 0) return null;
      const i = f.inp;
      return (i.right ? 1 : 0) - (i.left ? 1 : 0);
    }
    if (this.dummyTech === 'place') return 0;
    if (this.dummyTech === 'random') return [null, 0, -1, 1][Math.floor(Math.random() * 4)];
    return null;
  }

  advanceMove(f) {
    if (f.state === 'attack') {
      f.moveF++;
      const m = f.move;
      if (m.shots && f.moveF === m.shotAt) this.fireShots(f);
      if (m.firePool && f.moveF === m.firePool.at) this.spawnFire(f, m.firePool);
      if (m.boxDrop && f.moveF === m.boxDrop.at) this.dropBox(f.x + f.facing * m.boxDrop.dx, f.id);
      if (m.swapBlast && f.moveF === m.swapBlast.at) this.swapBlast(f);
      if (m.boxRain && f.moveF === m.boxRain.at) this.rainBoxes(f, m.boxRain.n);
      // trail = ทิ้งกองไฟไว้ตรงที่ยืนเป็นระยะ ๆ ยิ่งเดินยิ่งเขียนกำแพงไฟทิ้งไว้
      if (m.trail && f.moveF % m.trail === 0) this.spawnFire(f, { dx: 0, burns: true });
      if (m.dustPool && f.moveF === m.dustPool.at) {
        this.dust = { x: f.x, owner: f.id, life: DUST_LIFE };
        this.events.push({ type: 'dust', x: f.x, y: STAGE.groundY });
      }
      if (f.moveF >= m.startup + m.active + m.recovery) {
        // ท่าที่มี branch: ไม้จบแยกทางตามปุ่มทิศที่ "กดค้างอยู่ตอนท่าจบ"
        // อ่านตอนท่าจบ ไม่ใช่ตอนเริ่มกดสกิล คนเล่นจึงมีเวลาทั้งชุดในการตัดสินใจว่าจะจบทางไหน
        if (m.branch && f.onGround) {
          const i = f.inp ?? {};
          const pick = i.up ? 'up' : i.down ? 'down' : 'neutral';
          this.startMove(f, m.branch[pick] ?? m.branch.neutral, f.facing); return;
        }
        // ท่าที่มี mashChain: กดปุ่มรัวเพื่อวนต่ออีกรอบ จำกัดจำนวนรอบด้วย mashMax
        // ไม่กด (หรือครบโควต้าแล้ว) ก็ไหลไป autoChain ซึ่งเป็นไม้จบตามปกติ
        if (m.mashChain && f.onGround && f.mashLeft > 0 && this.mashPressed(f)) {
          f.mashLeft--;
          this.startMove(f, m.mashChain, f.facing); return;
        }
        // ท่าตั้งป้อม (holdChain): ปักหลักยิงเองจนหมดเวลา ไม่ต้องกดรัว
        // ต่างจาก mashChain ตรงที่นับเป็น "เวลา" ไม่ใช่จำนวนครั้ง — กดทีเดียวแล้วยืนยิงยาว
        // แลกกับการขยับไม่ได้ตลอดช่วงนั้น โดนตีเมื่อไหร่หลุดทันที (resolveHit ล้าง stanceUntil)
        if (m.holdChain && f.onGround && this.frame < f.stanceUntil) {
          this.startMove(f, m.holdChain, f.facing); return;
        }
        // ท่าจับ: ต่อท่าถัดไป **เฉพาะตอนคว้าติด** ถ้าคว้าไม่โดนก็จบแค่นั้น
        //
        // ต้องแยกจาก autoChain เพราะท่าจับที่พลาดแล้วยังเล่นท่ายัดต่อ จะดูเหมือนจับติดทั้งที่ไม่โดน
        // คนเล่นทั้งสองฝั่งอ่านผิดพร้อมกัน — คนจับนึกว่าได้ คนโดนนึกว่าโดน แล้วทั้งคู่ตัดสินใจผิด
        if (m.onHit && f.onGround && f.hitConfirmed) { this.startMove(f, m.onHit, f.facing); return; }
        // ท่าที่มี autoChain ต่อท่าถัดไปเองโดยไม่ต้องกดซ้ำ — ใช้ทำคอมโบสกิลกดครั้งเดียวจบชุด
        // ต่อเฉพาะตอนยังยืนอยู่บนพื้น ถ้าโดนตีจนหลุด state หรือตกลงมา คอมโบก็ขาดตามธรรมชาติ
        if (m.autoChain && f.onGround) { this.startMove(f, m.autoChain, f.facing); return; }
        f.move = null; f.moveId = null; f.used.clear();
        f.setState(f.onGround ? 'idle' : 'air');
      }
    } else if (f.state === 'hitstun' || f.state === 'blockstun' || f.state === 'knockdown' || f.state === 'landing' || f.state === 'tech' || f.state === 'techroll') {
      f.stun--;
      if (f.stun <= 0) { if (f.state === 'techroll') f.vx = 0; f.setState(f.onGround ? 'idle' : 'air'); }
    }
  }

  resolveHit(a, d) {
    const hb = a.hitbox(); if (!hb || a.hitList.has(d.id) || d.invuln > 0) return;
    const hurt = d.hurtbox(); if (!overlap(hb, hurt)) return;
    const m = a.move; a.hitList.add(d.id); a.hitConfirmed = true;
    const fx = hb.x + hb.w / 2, fy = hb.y + hb.h / 2;
    const facingAttacker = Math.sign(a.x - d.x) === d.facing || a.x === d.x;
    if ((d.state === 'block' || d.state === 'blockcrouch') && d.onGround && facingAttacker) {
      d.lowStun = d.state === 'blockcrouch';
      d.setState('blockstun'); d.stun = Math.ceil(m.stun * 0.45);
      d.vx = a.facing * 5; a.vx = -a.facing * 3;
      a.hitstop = d.hitstop = 4;
      this.gainKi(a, m.dmg * 0.4); this.gainKi(d, m.dmg * 0.6);
      this.events.push({ type: 'block', x: fx, y: fy });
      return;
    }
    const scale = Math.max(0.5, 1 - 0.08 * d.comboHits);
    // ท่าที่ติดธง lashDmg แรงขึ้นตามตราที่เป้ามีอยู่ (ท่าแส้ทุกท่า)
    const lash = (m.lash || m.lashDmg) ? this.lashMul(d) : 1;
    const dmg = Math.max(1, Math.round(m.dmg * scale * lash * (d.dustGuard ? DUST_DR : 1)));
    // เกราะกินไว้: เจ็บลดลง ไม่เข้า hitstun ท่าของเขาเดินต่อ
    if (this.armorHolds(d)) { this.takeArmored(a, d, dmg, fx, fy); return; }
    d.hp = Math.max(0, d.hp - dmg);
    if (m.lash && !d.dustGuard) this.addLash(d);   // ในวงฝุ่นกันสถานะทุกชนิด
    d.comboHits++; d.comboDmg += dmg; d.lastHitF = this.frame;
    d.stun = Math.round(m.stun * Math.max(0.55, 1 - 0.05 * (d.comboHits - 1)));
    d.move = null; d.moveId = null; d.setState('hitstun');
    d.stanceUntil = -9999;          // ยืนยิงอยู่แล้วโดนสวน = ป้อมแตก นี่คือทางแก้ของอีกฝ่าย
    d.vx = a.facing * m.kb[0];
    if (m.kb[1] < 0 || !d.onGround) { d.vy = m.kb[1] || -2; d.onGround = false; }
    d.facing = -a.facing;
    const hs = Math.round(4 + m.dmg * 0.6);
    a.hitstop = d.hitstop = hs;
    if (m.pogo) { a.vy = m.pogo; a.move = null; a.moveId = null; a.setState('air'); a.jumpsLeft = 1; }
    // หลอดอัลติเติมจากทั้งฝั่งที่ตีและฝั่งที่โดน — ฝั่งที่โดนรัวจึงมีทางสวนกลับ ไม่ใช่แพ้ทางอย่างเดียว
    this.gainKi(a, dmg * 1.4); this.gainKi(d, dmg * 0.9);
    this.events.push({ type: 'hit', x: fx, y: fy, dmg, heavy: m.dmg >= 6, launch: m.kb[1] < -10 });
  }

  /** ดันตัวไม่ให้ซ้อนกัน — ยกเว้นตอนที่ฝ่ายใดฝ่ายหนึ่ง "มองไม่เห็นตัว"
   *
   *  อมตะอยู่ก็ทะลุได้อยู่แล้ว (ท่าพุ่งของ Nyx อาศัยข้อนี้)
   *  วงฝุ่นเพิ่มอีกกรณี: ตอนจางอยู่เธอเดินผ่านคนอื่นไปได้เลย
   *  ถ้าไม่มีข้อนี้ เธอจะเดินชนคู่ต่อสู้ออกจากวงไปด้วย = ลากคนที่ไล่ตามอยู่ออกมาพร้อมกัน
   *  ซึ่งพังทั้งประเด็นของท่า (ต้องโดดข้ามหนีอย่างเดียว ทั้งที่ท่านี้มีไว้ให้ "หายตัว")
   *  veil ครอบทั้งตอนอยู่ในวงและช่วงจางต่อหลังออกจากวง = จังหวะหนีก็ทะลุได้เหมือนกัน */
  pushApart(a, b) {
    if (a.veil || b.veil) return;
    if (a.invuln || b.invuln || !a.onGround || !b.onGround) return;
    const minD = PHYS.width * 0.9, dx = b.x - a.x;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 40) {
      const push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
    }
  }

  updateCombo(d) {
    if (d.comboHits > 0 && (ACTIONABLE.has(d.state) || ['knockdown', 'landing', 'tech', 'techroll'].includes(d.state))) {
      this.events.push({ type: 'comboEnd', hits: d.comboHits, dmg: d.comboDmg });
      d.comboHits = 0; d.comboDmg = 0; d.wallBounced = false;
    }
  }

  recordMeter(p) {
    const ph = p.phase();
    if (ph) {
      if (this.meterIdle > 30) this.meter = [];
      this.meterIdle = 0;
      this.meter.push(ph);
      if (this.meter.length > 150) this.meter.shift();
    } else {
      this.meterIdle++;
      if (this.meter.length && this.meterIdle <= 30 && p.state !== 'idle') this.meter.push(p.state === 'landing' ? 'recovery' : 'free');
    }
  }
}


// ===================== Input =====================
const held = new Set(); let pressed = new Set();

export { STAGE, STAGE_BASE_W, setStageWidth, PHYS, MOVES, SKILLS, SKILL_CD, KI_MAX, ROUND_BARS, CHARACTERS, DEFAULT_CHAR, ACTIONABLE, Fighter, Game, overlap };
