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
  // สามชั้นตามอาร์ตของเวที — ไล่จากล่างขึ้นบน
  //
  // **เคยมีห้าชั้น** ชั้น 4 (y=248) กับชั้น 5 (y=160) ถูกถอดออกหลังลองเล่นจริง:
  // เวทีสูงห้าชั้นทำให้การไล่เป็นการไต่บันได คนนำวิ่งขึ้นบนแล้วคนตามต้องกระโดดสี่ทีถึงจะถึง
  // ระหว่างนั้นไม่มีอะไรเกิดขึ้นเลย = เวลาตายกลางเกม สามชั้นบีบให้ปะทะกันเร็วกว่ามาก
  //
  // ช่องว่างระหว่างชั้นต้องกระโดดถึงด้วยการกระโดดครั้งเดียว
  // แรงกระโดด 20 กับแรงโน้มถ่วง 0.95 ขึ้นได้ 20^2/(2*0.95) = 210 px
  // ช่องจริง: 158 / 110 — ผ่านทั้งสองช่วง ไม่ต้องพึ่งดับเบิลจัมพ์
  //
  // ชั้นบนแคบกว่าชั้นล่างต่อแท่น (240 เทียบ 300) — ที่เสี่ยง ไม่ใช่ที่ปลอดภัย
  // เคยกว้าง 320 ตอนที่ยังมีชั้น 4-5 อยู่เหนือมัน พอกลายเป็นชั้นบนสุดก็ต้องแคบลงตามกติกาเดิม
  platforms: [
    { x1: 490, x2: 790, y: 462 },     // ชั้น 2 กลาง (กว้างสุด — ทางขึ้นหลัก)
    { x1: 150, x2: 390, y: 352 },     // ชั้น 3 ซ้าย
    { x1: 890, x2: 1130, y: 352 },    // ชั้น 3 ขวา
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

  // ---- สกิล 2 Sky Drive: ยกคาง -> ตีสี่ทีกลางอากาศ -> ตบลงพื้น -> เด้ง -> ต่อบนพื้นได้ ----
  //
  // แทน Knee Drive เดิม (พุ่งเข่าดันออก) ทั้งหมด คุณสมบัติเดียวที่ยกมาคือ refresh: ['rush1']
  // ซึ่งย้ายไปอยู่ที่ท่าตบ — จบชุดลอยแล้วรัว Chain Rush ต่อได้ทันที
  //
  // **เขาลอยตามขึ้นไปเองด้วย imp.vy ไม่ใช่ jumpCancel ให้คนเล่นกดกระโดดตาม**
  // ท่ายกคางที่มีอยู่แล้ว (up, rushEndU) ใช้ jumpCancel ซึ่งถูกแล้วสำหรับท่าตีปกติ
  // แต่สกิลต้องเป็น "กดทีเดียวได้ทั้งชุด" ไม่งั้นมันคือท่า up ที่ยาวกว่าเดิม ไม่ใช่สกิลใหม่
  //
  // ต่อด้วย onHit ไม่ใช่ autoChain — ฟันลมแล้วต้องจบแค่ท่ายกคาง ไม่ใช่เล่นชุดลอยต่อกลางอากาศ
  // เปล่า ๆ ซึ่งจะดูเหมือนตีติดทั้งที่ไม่โดน (บทเรียนเดียวกับท่าจับที่แยก onHit ออกจาก autoChain)
  //
  // **ระยะเอื้อมของท่ายกคางเคยสั้นกว่าท่าตีปกติเกือบครึ่ง** (กล่องกว้าง 78 -> เอื้อมถึง 95 px
  // ขณะที่ชุด Chain Rush เอื้อมถึง 180) ซึ่งแปลว่าต่อคอมโบเข้าสกิลนี้แทบไม่ได้เลย:
  // วัดระยะหลังจบท่าอื่นแล้วกดสกิล 2 ทันที — ต่อจากเตะหน้าได้ระยะ 94 (ฟันลม)
  // ต่อจาก Chain Rush ได้ระยะ 114 (ฟันลม) ต่อจากแย็บได้ 81-86 (ติด) ตรงกับที่ผู้เล่นรายงาน
  //
  // **แก้ด้วยกล่องชน ไม่ใช่ด้วยแรงพุ่ง** — กวาดค่า vx 2-6 x กว้าง 78-130 แล้ววัดทุกระยะ
  // vx ตั้งแต่ 4 ขึ้นไป **พังระยะประชิด** (เขาพุ่งเลยตัวเป้าไป ทีที่เหลือฟันลม เหลือ 1-2 ที)
  // vx 3 + กว้าง 110 ตีครบห้าทีตั้งแต่ระยะ 40 ถึง 130 ต่อเนื่อง ไม่มีช่องโหว่ตรงกลาง
  // ลองเปลี่ยน kb แนวนอนเป็น 0 (ดูดเข้ามา) ด้วย — **พังระยะประชิดเหมือนกัน** จึงคงไว้ที่ 1
  sky1: { label: 'Sky Drive', kind: 'ground', startup: 7, active: 4, recovery: 10, dmg: 5,
    hb: { x: -6, y: -150, w: 110, h: 100 }, kb: [1, -17], stun: 34,
    imp: { f: 7, vx: 3, vy: -15 }, onHit: 'sky2', airChain: true },
  // สามทีกลางอากาศ: ศอก -> หมัดเหวี่ยง -> หลังมือ · คนละทรงกันทั้งสามที ตาจึงอ่านออกว่าคนละที
  //
  // **ทุกทียกทั้งคู่ขึ้นนิดหนึ่ง (imp.vy -7 กับ kb -9)** ไม่ใช่แค่ค้างไว้เฉย ๆ
  // ชุดนี้กินเวลา ~50 เฟรมกลางอากาศ แต่กระโดดครั้งเดียวตกถึงพื้นใน ~38 เฟรม
  // ถ้าไม่ยกซ้ำ เขาจะแตะพื้นกลางชุด ซึ่ง onLand ล้าง f.move ทิ้ง = ชุดขาดตรงนั้นเงียบ ๆ
  //
  // **แรงส่งของเขา (-15) ต้องน้อยกว่าของคนโดน (-17)** ข้อนี้กลับหัวกับที่คิดตอนแรก
  // เพราะคนโดนถูกแรงโน้มถ่วงคูณเพิ่มตามความยาวคอมโบ (g *= 1 + 0.04 * comboHits)
  // ถ้าเขาลอยแรงกว่า เขาจะลอยสูงกว่าเป้าแล้วทีที่สี่ฟันลม — กวาดค่าทั้งตาราง 128 ชุด
  // แล้ววัดว่าชุดไหนตีติดครบห้าทีและเด้งจริง (57 ชุดผ่าน ทุกชุดที่ผ่านมี launch <= -15)
  // (ชุดยังจบเองอยู่ดีเพราะเป็นสี่ทีตายตัว กดรัวยืดไม่ได้ — ดูข้อ "เส้นแบ่งกับ DEAR" ในกิต)
  sky2: { label: 'Sky Drive', kind: 'air', startup: 3, active: 3, recovery: 3, dmg: 3,
    hb: { x: 6, y: -110, w: 72, h: 34 }, kb: [1, -9], stun: 20,
    imp: { f: 3, vx: 2, vy: -7 }, floaty: true, autoChain: 'sky3', airChain: true },
  sky3: { label: 'Sky Drive', kind: 'air', startup: 3, active: 3, recovery: 3, dmg: 3,
    hb: { x: 8, y: -104, w: 76, h: 34 }, kb: [1.5, -9], stun: 20,
    imp: { f: 3, vx: 2, vy: -7 }, floaty: true, autoChain: 'sky4', airChain: true },
  sky4: { label: 'Sky Drive', kind: 'air', startup: 3, active: 3, recovery: 4, dmg: 3,
    hb: { x: 8, y: -100, w: 78, h: 36 }, kb: [2, -9], stun: 20,
    imp: { f: 3, vx: 2, vy: -7 }, floaty: true, autoChain: 'sky5', airChain: true },
  // ตบลง: kb แนวตั้งเป็นบวก = ปักลงพื้น · ธง bounce ทำให้เขาเด้งแทนที่จะล้มแล้วได้อมตะ
  // landLag สั้นกว่าปกติเพื่อให้เขาฟื้นก่อนคนที่เด้ง — นั่นคือสิ่งที่ทำให้ต่อติดจริง
  sky5: { label: 'Sky Drive', kind: 'air', startup: 5, active: 5, recovery: 6, dmg: 6,
    hb: { x: 4, y: -70, w: 80, h: 60 }, kb: [2, 14], stun: 30,
    imp: { f: 5, vx: 1, vy: 14 },
    bounce: true, untilLand: true, landLag: 10, refresh: ['rush1'] },

  // ---- สกิล 3 Hundred Hands (อัลติ): รัวหมัดเตะ กดรัวเพิ่มจำนวนทีได้ ----
  // `flurry` = ปล่อยอีเวนต์หมัดทุกสองเฟรมให้ฝั่งวาดทำกำแพงหมัด (ดู advanceMove)
  // ไม้จบ `hhEnd` **ไม่ติดธงนี้** เพื่อให้ตัดกัน: รัวจนเป็นกำแพง แล้วหยุด แล้วหมัดหนักหมัดเดียว
  hh1: { label: 'Hundred Hands', kind: 'ground', startup: 6, active: 3, recovery: 2, dmg: 2, flurry: 2,
    hb: { x: 6, y: -100, w: 76, h: 34 }, kb: [0.8, 0], stun: 20, autoChain: 'hh2', imp: { f: 4, vx: 2 },
    // กดรัวต่อรอบได้สูงสุดกี่รอบ — นับต่อการกดสกิลหนึ่งครั้ง
    // 9 รอบวัดได้ 51 ดาเมจ ซึ่งแรงกว่าอัลติของ Nyx (22) เท่าตัว ลดเหลือ 5
    mashMax: 5 },
  hh2: { label: 'Hundred Hands', kind: 'ground', startup: 2, active: 3, recovery: 2, dmg: 2, flurry: 2,
    hb: { x: 6, y: -100, w: 76, h: 34 }, kb: [0.8, 0], stun: 20, autoChain: 'hh3', imp: { f: 2, vx: 2 } },
  // hh3 วนกลับมา hh2 ได้เรื่อย ๆ ถ้าผู้เล่นกดปุ่มรัว — mashChain จำกัดจำนวนรอบไว้ที่ mashMax
  hh3: { label: 'Hundred Hands', kind: 'ground', startup: 2, active: 3, recovery: 2, dmg: 2, flurry: 2,
    hb: { x: 6, y: -76, w: 82, h: 36 }, kb: [0.8, 0], stun: 20, imp: { f: 2, vx: 2 },
    mashChain: 'hh2', autoChain: 'hhEnd' },
  hhEnd: { label: 'Hundred Hands', kind: 'ground', startup: 6, active: 5, recovery: 26, dmg: 8,
    hb: { x: 10, y: -100, w: 104, h: 40 }, kb: [17, -6], stun: 40, imp: { f: 5, vx: 9 } },
};

const HELIOS_SKILLS = ['rush1', 'sky1', 'hh1'];
const HELIOS_SKILL_CD = [120, 210, 0];   // Sky Drive เป็นตัวเปิดคอมโบทั้งชุด คูลดาวน์ยาวกว่า Knee Drive เดิมนิดหน่อย

/* ================== ALECTO — สายคุมพื้นที่ ==================
 *
 * ท่าตีปกติเป็นแส้: ระยะไกลที่สุดในเกม แลกกับออกช้าที่สุดและดาเมจต่อครั้งต่ำสุด
 * ฟาดโดนสะสม "ตรารอยแส้" ที่ตัวคนโดน ยิ่งมีตรายิ่งเจ็บและยิ่งเดินช้า (ดู docs/ALECTO_KIT.md)
 */

// ตรารอยแส้ — อยู่ที่ตัวคนโดน ไม่ใช่ตัวเธอ (เล่นหลายคนทีหลังจะได้แยกรายเป้าหมายเอง)
/* ── KUNJAE: บันไดสามขั้น ──
 *
 * **รีเวิร์ครอบสาม** สองรอบก่อนถูกถอดออกหมดแล้ว สิ่งที่ถอด:
 *   - เส้นแบ่งระยะ (RANGE_IN/RANGE_OUT) ที่สลับชุดท่าให้เองตามระยะยืน
 *   - หมุดระเบิด (MARK_POP) ที่หางปักแล้วปืนจุด
 *
 * ทั้งสองอันเป็นโครงเดียวกัน คือ **"ทำอย่างหนึ่งที่ไม่ใช่ดาเมจ แล้วค่อยแปลงทีหลัง"**
 * ซึ่งเป็นโครงที่ต้องอดทนและรอ ผู้เล่นรายงานว่าไม่สนุกทั้งสองรอบ
 * และเส้นแบ่งระยะยังเป็นสิ่งเดียวในเกมที่ **กดปุ่มตีแล้วเกมเลือกท่าให้**
 *
 * รอบนี้เหลือกลไกเดียว: ปืนเป็นท่าปกติทั้งชุด · หางอยู่ที่สกิลสามช่อง
 * ตะขอลากเข้ามา -> ทุบลงพื้นแล้วกระโดดไม่ได้ -> ปักหางลงดินให้หนามวิ่งออกสองข้าง
 * ขั้น 2 ปิดทางรอดเดียวของขั้น 3 พอดี จึงเป็นคอมโบที่ค้นพบเองได้จากการเล่น
 */
const PIN_FRAMES = 50;       // ทุบลงพื้นแล้วกระโดดไม่ได้กี่เฟรม
// หนามผุดจากพื้น: ข้างละ 5 ต้น ห่างกัน 80 px = เอื้อม 400 px ต่อข้าง
// เวทีกว้างราว 1400 จึงกินราวครึ่งเวที **ไม่ใช่ทั้งเวที** — การยืนยังต้องมีความหมาย
// โผล่ห่างกันต้นละ 4 เฟรม รวม 20 เฟรมกว่าคลื่นจะถึงปลายสุด คนที่ยืนไกลจึงเห็นแล้วหนีทัน
const QUILL_N = 5;
const QUILL_GAP = 80;
// เพดานความสูงของหนาม — สูงกว่านี้เหนือพื้นแล้วรอด
// 200 px มาจากความสูงจริงของเฟรม `tailRise3` ตอนวาด (320 px ในอัตลาส x สเกล 0.62)
// กติกาต้องตรงกับภาพที่เห็น ไม่งั้นมันคือกับดัก ไม่ใช่กติกา
const QUILL_UP = 200;
// เพดานเพิ่ม x1.40 ต้องเล็กกว่าเพดานลดดาเมจตามความยาวคอมโบ x0.50 เสมอ
// ไม่งั้นคอมโบยิ่งยาวยิ่งแรง = เปิดช่องคอมโบวนไม่รู้จบที่ระบบลดดาเมจกันไว้ตั้งแต่ต้น

// ท่าตั้งป้อมยืนยิง — กดสกิลครั้งเดียวแล้วปักหลักยิงยาวเท่านี้เฟรม
// สกิล 1 สั้นกว่าเพราะเล่นจริงแล้ว 5 วินาทีขาตาย โดนบุกเข้ามาแล้วทำอะไรไม่ได้เลย
// อัลติยาวกว่าได้ เพราะจ่ายหลอด ki เต็มไปแล้วและตั้งใจให้เป็นการทุ่มหมดหน้าตัก
// ---------- อัลติ Dust Devil ของ Alecto ----------
// ไม่ใช่ท่าทำดาเมจ แต่เป็นท่าเอาตัวรอดตอนโดนรุม — ผู้เล่นรายงานว่าคนเล่นเธอโดนรุมประจำ
const DUST_HALF = 200;       // ครึ่งความกว้างของวง — กว้างกว่ากองไฟ (62) สามเท่า
const DUST_LIFE = 300;       // วงฝุ่นอยู่กี่เฟรม (5 วินาที)

/* ── DEAR: ไอพ่น · การลาก · โอเวอร์คล็อก (ดู docs/MOMUS_KIT.md) ── */
const BOOST_MAX = 3;         // กี่ขีด — พุ่งหรือกระโดดเพิ่มกินขีดละหนึ่ง
const BOOST_PER_AIR = 2;     // คืนได้มากสุดกี่ขีดต่อหนึ่งช่วงลอย
                             // **ชั้นกันคอมโบอากาศไม่รู้จบ** — ต่อยโดนคืนขีด + dair เด้งขึ้น
                             // + เด้งแล้วได้ดับเบิลจัมพ์คืน = วนได้ตลอดกาลถ้าไม่มีเพดานนี้
                             // (ชั้นแรกคือแรงโน้มถ่วงที่เพิ่มตามจำนวนฮิต ซึ่งมีอยู่แล้วในเอนจิ้น)
const BOOST_DASH_VX = 15;    // พุ่งแรงแค่ไหนทางแกนนอน
const BOOST_DASH_VY = 12;    // และทางแกนตั้ง (กดทิศขึ้น/ลงตอนพุ่ง)
const BOOST_IFRAMES = 5;     // อมตะกี่เฟรมตอนออกตัว — สั้นพอที่จะไม่ใช่ปุ่มหนีฟรี
const BOOST_LOCK = 12;       // พุ่งติดกันได้เร็วสุดกี่เฟรม (กันพุ่งรัวจนกลายเป็นการบิน)
const OVERCLOCK_TIME = 180;  // 3 วินาที
const OVERCLOCK_DMG = 1.4;   // ท่าปกติแรงขึ้นกี่เท่าระหว่างติดบัฟ
const OVERCLOCK_ARMOR = 3;   // เกราะรับได้กี่ทีต่อหนึ่งท่า (เท่าท่าหนักของ Atlas)
const CARRY_GAP = 52;        // ลากไว้ห่างจากตัวเท่าไหร่ — ทับกันแล้วสไปรท์ซ้อนจนดูไม่ออกว่าใครเป็นใคร
const SLAM_WAVE = 0.45;
// เด้งพื้น — ตั้งให้เด้งพอให้ตีต่อติด แต่ไม่สูงจนกลายเป็นชุดลอยรอบสอง
// ค่าพวกนี้ใช้กับท่าเดียวในเกม — ท่าตบปิดชุดลอยของ MARCH (`sky5` เป็นท่าเดียวที่ติดธง bounce)
// ตั้งไว้ตอนแรกโดย**วัดจริงไม่ได้** เพราะการเด้งถูก `f.vy = 0` ล้างทิ้งทุกครั้ง (ดู onLand)
// พอแก้ให้เด้งจริงแล้วกวาดค่าใหม่ทั้งช่วง -11 ถึง -20: **ค่าเดิมดีที่สุดอยู่แล้ว**
// ตั้งแต่ -14 ลงไปเป้าลอยสูงจนหลุดกล่องชนของชุด Chain Rush กลางคัน (ดาเมจตกจาก 42 เหลือ 23)
const BOUNCE_VY = -11;
const BOUNCE_VX_KEEP = 0.5;   // เก็บแรงแนวนอนไว้ครึ่งเดียว ไม่งั้นเด้งแล้วลอยหลุดออกไปไกล
const BOUNCE_STUN = 10;
// รัศมีดูดของอัลติ METEOR — แนวนอนกว้างกว่าแนวตั้งเพราะเวทีกว้างกว่าสูง
// และคนที่อยู่คนละชั้นควรต้องโดนดูดด้วย ไม่งั้นแค่ยืนบนชานก็ปลอดภัยฟรี
const METEOR_PULL = 260;
const METEOR_LIFT = 200;      // คลื่นตามพื้นแรงกี่ส่วนของหมัดที่อัดคนที่จับไว้
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
  /* ── ท่าตีปกติ: ปืนคู่ ทั้งชุด ──
   *
   * **รีเวิร์ครอบสาม** สองรอบก่อนเธอมีท่าตีสองชุด (แส้ตอนใกล้ ปืนตอนไกล)
   * แล้วเกมสลับให้เองตามระยะ ผู้เล่นรายงานว่าไม่สนุกทั้งสองรอบ
   * สาเหตุที่วัดได้: **ชุดปืนรวมกันได้ 5 ดาเมจ ต่ำสุดในเกม** และเพราะระยะสลับให้เอง
   * เธอจึงถูกบังคับไปเล่นชุดที่อ่อนที่สุดเกินครึ่งเวลาโดยไม่ได้เลือก
   *
   * รอบนี้ **ปืนเป็นท่าปกติทั้งหมด ไม่มีชุดที่สอง ไม่มีเส้นแบ่งระยะ**
   * หางไปอยู่ที่สกิลทั้งสามช่อง = เห็นหางเมื่อไหร่แปลว่ามีเรื่องใหญ่
   * ซึ่งดีกว่าให้มันเป็นหมัดยาว ๆ ที่เห็นตลอดเวลาจนไม่มีน้ำหนัก
   *
   * ทุกท่าเป็นกระสุนจริง ยิงข้ามเวทีได้ กันได้ โดนวงฝุ่นลดดาเมจได้
   * ท่าบนพื้นติดธง `mobile` = เดินยิงได้ (ฝั่งวาดสลับไปเล่นวงจรเดินถือปืนให้เอง)
   */
  jab1: { label: 'Hip Fire', kind: 'ground', startup: 5, active: 3, recovery: 8, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4, mobile: 0.5,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 3, shotStun: 12, shotKb: 2, shotRange: 520, chain: 'jab2' },
  jab2: { label: 'Hip Fire', kind: 'ground', startup: 4, active: 3, recovery: 9, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4, mobile: 0.5,
    shots: [{ vy: 0 }], shotAt: 4, shotDmg: 3, shotStun: 12, shotKb: 3, shotRange: 520, chain: 'jab3' },
  // ไม้จบ: ปักเท้ายิงสองนัดพร้อมกัน (ไม่มี mobile) ดันออกแรง แลกกับค้างนาน
  jab3: { label: 'Kick Back', kind: 'ground', startup: 5, active: 4, recovery: 18, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: 0 }, { vy: -1.6 }], shotAt: 5, shotDmg: 4, shotStun: 20, shotKb: 9, shotRange: 520 },
  // กดทิศ = เดินยิง ขยับได้มากที่สุดในชุด ใช้ถอยพลางยิงพลางตอนโดนไล่
  side: { label: 'Walking Fire', kind: 'ground', startup: 4, active: 3, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4, mobile: 0.6,
    shots: [{ vy: 0 }], shotAt: 4, shotDmg: 3, shotStun: 12, shotKb: 2, shotRange: 520 },
  // สวนคนกระโดด: กระสุนพุ่งเฉียงขึ้น ระยะสั้นกว่าเพราะลอยพ้นหัวไปเร็ว
  up: { label: 'Skyward Shot', kind: 'ground', startup: 6, active: 4, recovery: 14, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: -7 }], shotAt: 6, shotDmg: 4, shotStun: 18, shotKb: 4, shotRange: 320 },
  // ยิงต่ำ: ตัวเตี้ยลงด้วย (crouch) จึงลอดท่าที่ตีสูงได้ไปในตัว
  down: { label: 'Knee Shot', kind: 'ground', crouch: true, startup: 5, active: 3, recovery: 13, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 3, shotStun: 14, shotKb: 2, shotLow: true, shotRange: 520 },

  /* ท่าอากาศ — เดิม "ลอยอยู่ต้องใช้แส้เสมอ" เพราะปืนเป็นอาวุธของคนยืนพื้น
   * พอปืนเป็นท่าปกติทั้งหมด กติกานั้นก็หมดเหตุผล เธอยิงกลางอากาศได้แล้ว
   * แต่ยิงลงล่างแรงกว่ายิงตรง เพื่อให้การขึ้นอากาศยังเป็นการเลือก ไม่ใช่ของฟรี */
  nair: { label: 'Air Fire', kind: 'air', startup: 5, active: 4, recovery: 10, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: 0 }], shotAt: 5, shotDmg: 3, shotStun: 14, shotKb: 3, shotRange: 460 },
  sair: { label: 'Dive Fire', kind: 'air', startup: 6, active: 4, recovery: 12, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: 2.5 }], shotAt: 6, shotDmg: 4, shotStun: 16, shotKb: 4, shotRange: 460,
    imp: { f: 5, vx: 7 }, floaty: true },
  // ยิงลงชัน: ช้าลงในแนวนอน (5 เทียบปกติ 13) บวก vy 13 = ราว 69 องศา
  // ลอยอยู่ 150 px แล้วยิง กระสุนถึงพื้นภายใน 58 px แนวนอน = ลงใส่คนที่อยู่ใต้ตัวได้จริง
  // ถ้าใช้ความเร็วแนวนอนปกติจะได้แค่ 32 องศา ซึ่งต้องมีที่วิ่ง 244 px ถึงจะลงถึงพื้น
  // แล้วมันก็ไม่ใช่ไม้ลงอีกต่อไป — เป็นไม้ยิงเฉียงที่ต้องยืนห่างพอดีเป๊ะ
  dair: { label: 'Dive Shot', kind: 'air', startup: 7, active: 5, recovery: 14, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, snapBack: 4,
    shots: [{ vy: 13, speed: 5 }], shotAt: 7, shotDmg: 5, shotStun: 18, shotKb: 3, shotRange: 400 },

  /* ══ บันไดสามขั้น — หางทำงานเฉพาะสามปุ่มนี้ ══════════════════════════════
   *
   * อ่านเป็นประโยคเดียว: **เอาเขามาหาเรา -> ตรึงเขาไว้กับพื้น -> แล้วทำให้พื้นฆ่าเขา**
   *
   * สามขั้นนี้ต่อกันเป็นคอมโบที่คนเล่นค้นพบเองได้จากการเล่น ไม่ต้องอ่านคู่มือ
   * และแต่ละขั้นกดเดี่ยว ๆ ก็ยังใช้ได้ ไม่ใช่ปุ่มที่ตายถ้าคอมโบไม่ติด
   */

  // ---- ขั้น 1 ตะขอ: หางพุ่งตรงไปเกี่ยวแล้วลากเข้ามา ----
  //
  // `kb` แกน x ติดลบ = ดึงเข้าหาตัวเธอ (กติกาเดียวกับ Rope Pull เดิมที่ใช้ได้ผล)
  // เอื้อม 260 px ยาวกว่าท่าประชิดของทุกตัวในเกม แต่สั้นกว่ากระสุนของเธอเองมาก
  // จึงไม่ใช่ปุ่มกดข้ามเวที — ต้องเดินเข้าไปในระยะก่อน
  hook1: { label: 'Hook', kind: 'ground', startup: 8, active: 5, recovery: 16, dmg: 5,
    hb: { x: 30, y: -100, w: 260, h: 44 }, kb: [-13, 0], stun: 30 },

  // ---- ขั้น 2 ทุบลง: เหวี่ยงอัดพื้น แล้วกระโดดไม่ได้ ----
  //
  // **นี่คือปุ่มที่ปิดทางรอดเดียวของอัลติตัวเอง** ทางรอดของหนามคือลอยอยู่
  // ท่านี้เอาเขาลงมาติดพื้นแล้วล็อกไว้ 50 เฟรม ซึ่งยาวพอจะปักหางแล้วหนามวิ่งถึง
  // (อัลติใช้เงื้อ 16 + คลื่นหนาม 20 = 36 เฟรม ยังเหลือขอบ 14 เฟรม)
  slam1: { label: 'Slam Down', kind: 'ground', startup: 7, active: 6, recovery: 18, dmg: 9,
    hb: { x: 16, y: -150, w: 130, h: 170 }, kb: [3, 11], stun: 30, pin: PIN_FRAMES },

  // ---- ขั้น 3 (อัลติ) SPINE FIELD: ปักหางลงดิน หนามผุดวิ่งออกสองข้าง ----
  //
  // ของเดิม (Dead Man's Line) เป็นกระสุนทะลุแนวนอน ซึ่งซ้ำกับท่าปกติของเธอเอง
  // ตอนนี้ท่าปกติเป็นปืนทั้งชุดแล้ว อัลติที่เป็นกระสุนอีกนัดจึงไม่มีอะไรใหม่เลย
  //
  // หนามไม่ได้โผล่พรึบเดียว แต่ **วิ่งออกจากตัวเธอเป็นคลื่นทั้งสองข้าง**
  // คนที่ยืนไกลจึงเห็นมันวิ่งมาแล้วตัดสินใจทัน = กติกาที่มองเห็น ไม่ใช่กับดัก
  //
  // **ทางรอดคือลอยอยู่** อ่านออกจากภาพโดยไม่ต้องบอก และนั่นคือเหตุผลที่ขั้น 2 มีอยู่
  quill1: { label: 'Spine Field', kind: 'ground', startup: 16, active: 30, recovery: 26, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true, iframes: [0, 16],
    quills: { at: 16, each: 4, n: QUILL_N, gap: QUILL_GAP, dmg: 16, stun: 24, kb: [6, -9] } },

  hop: { label: 'Backstep', kind: 'ground', startup: 3, active: 5, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    imp: { f: 2, vx: -13 }, glide: true, autoChain: 'hook1' },
  // กลิ้งถอยต้องมีช่วงอมตะ ไม่งั้นมันไม่ใช่ "ท่าหนี" — กลิ้งไปก็โดนตีอยู่ดี
  // นี่คือท่าป้องกันตัวท่าเดียวของเธอ · กระโดดถอย (hop) ไม่ให้ เพื่อให้มีทางเลือก:
  // hop ไวแต่ไม่อมตะ · roll ช้ากว่าแต่รอด
  roll: { label: 'Roll Back', kind: 'ground', startup: 3, active: 6, recovery: 5, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    iframes: [0, 9], imp: { f: 2, vx: -15 }, glide: true, autoChain: 'slam1' },
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

const ALECTO_SKILLS = ['hook1', 'slam1', 'quill1'];
// ตะขอคูลดาวน์สั้นสุดในเกม (2 วิ) เพราะมันคือปุ่มเปิดของทุกอย่าง ถ้ารอนานลูปจะขาด
// ทุบลง 2.5 วิ · อัลติกินหลอด ไม่มีคูลดาวน์
const ALECTO_SKILL_CD = [120, 150, 0];
// กดทิศถอยค้าง -> เริ่มด้วยท่าถอยแทน แล้ว autoChain เข้าสกิลเอง
const ALECTO_BACKSTEP = { hook1: 'hop', slam1: 'roll' };

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
const SELF_STUN = 0.5;       // ระเบิดตัวเองทำให้ชะงักครึ่งเดียวของที่คนอื่นโดน
// ── Understudy: ตัวแสดงแทน ──
// เขาทิ้งหุ่นที่หน้าตาเหมือนตัวเองไว้ตรงที่ยืนอยู่ แล้วหลุดออกไปข้าง ๆ

const ORPHEUS_SKILLS = ['slide1', 'burn1', 'solo1'];
const ORPHEUS_SKILL_CD = [120, 240, 0];   // สไลด์กดถี่ได้ · ถอยลากไฟ 4 วินาที กันกดหนีรัว

/**
 * DEAR (ฉายา Hephaestus) — เด็กแบกโครงแขนกลไซเบอร์แวร์ · สายบุกทางอากาศ
 *
 * **เขาเป็นคนเดียวในเกมที่ไม่ลงพื้น — และเขาอยู่บนฟ้าได้ก็ต่อเมื่อเขาต่อยโดน**
 *
 * โรสเตอร์ที่เหลือสู้กันบนดินหมด พื้นที่แนวตั้งของเวทีจึงยังว่างอยู่ ตัวนี้เกิดมาเพื่อใช้มัน
 * ดูเหตุผลของทุกตัวเลขได้ที่ `docs/MOMUS_KIT.md`
 *
 * ── ทำไมแขนใหญ่แต่ไม่ช้า ──
 * มันเป็นไซเบอร์แวร์ เซอร์โวเป็นคนออกแรง ไม่ใช่เด็ก แขนจึงเร็วกว่าแขนคน ไม่ใช่ช้ากว่า
 * ราคาที่เขาจ่ายคือ **"ห้ามพลาด"** ไม่ใช่ "อืดอาด" — พลาดแล้วไอพ่นหมด ร่วงลงพื้น
 * ซึ่งเป็นที่ที่เขาสู้ใครไม่ได้เลย ความดุดันจึงเป็นสิ่งที่ถูกบังคับ ไม่ใช่ตัวเลือก
 *
 * ── เวอร์ชันก่อนหน้า (ตัวตลกวางกับดัก) ถูกถอดทั้งตัว ──
 * มันมีสามระบบวางของบนเวทีพร้อมกัน (กล่อง + หุ่นแสดงแทน + ชั้นโรง) ผู้เล่นสรุปว่า "วุ่นวาย"
 * และอัลติผูกกับเลย์เอาต์เวที ซึ่งพังทันทีที่เวทีเปลี่ยนจากห้าชั้นเหลือสามชั้น
 * ของเก่าเก็บไว้ที่ `docs/archive/MOMUS_KIT_jester.md`
 */
const MOMUS_MOVES = {
  // ---- ท่าตีปกติ: หมัดลูกสูบ เร็วและเอื้อมไกลกว่าค่ากลางโรสเตอร์ ----
  //
  // kb[1] ต้องเป็น 0 ทุกจังหวะที่อยู่กลางคอมโบ ถีบขึ้นแม้นิดเดียวคู่ต่อสู้จะลอย
  // พอตกถึงพื้นกลายเป็นท่าล้มซึ่งมี invuln ติดมา จังหวะที่เหลือจะฟาดลม
  // (บทเรียนจากตัวเดิม กัดมาแล้วห้ารอบ — ข้อนี้ไม่เกี่ยวกับตัวละคร มันเป็นกฎของเอนจิ้น)
  jab1: { label: 'Piston Jab', kind: 'ground', startup: 4, active: 3, recovery: 7, dmg: 3,
    hb: { x: 10, y: -96, w: 96, h: 28 }, kb: [1.5, 0], stun: 14, chain: 'jab2' },
  jab2: { label: 'Piston Jab', kind: 'ground', startup: 4, active: 3, recovery: 8, dmg: 3,
    hb: { x: 10, y: -92, w: 100, h: 30 }, kb: [1.5, 0], stun: 14, chain: 'jab3' },
  jab3: { label: 'Double Ram', kind: 'ground', startup: 5, active: 4, recovery: 12, dmg: 5,
    hb: { x: 12, y: -94, w: 108, h: 36 }, kb: [3, 0], stun: 26, chain: 'jab4' },

  // ---- ไม้จบ: ส่งขึ้นฟ้า — นี่คือทางขึ้นหลักของตัวละครทั้งตัว ----
  //
  // `jumpCancel` ทำให้ต่อยโดนแล้วกดกระโดดตามขึ้นไปต่อคอมโบอากาศได้ทันที
  // เอนจิ้นรองรับอยู่แล้ว (ดู advanceMove) — ธงนี้คือสิ่งเดียวที่ต้องติด
  jab4: { label: 'Skyward', kind: 'ground', startup: 6, active: 5, recovery: 16, dmg: 6,
    hb: { x: 8, y: -120, w: 96, h: 72 }, kb: [2, -16], stun: 32, jumpCancel: true },

  side: { label: 'Shoulder Charge', kind: 'ground', startup: 7, active: 5, recovery: 16, dmg: 6,
    hb: { x: 16, y: -94, w: 104, h: 36 }, kb: [7, 0], stun: 24,
    imp: { f: 5, vx: 12 }, glide: true },
  up: { label: 'Rocket Upper', kind: 'ground', startup: 6, active: 5, recovery: 15, dmg: 6,
    hb: { x: -4, y: -172, w: 88, h: 120 }, kb: [2, -15], stun: 30, jumpCancel: true },
  down: { label: 'Low Piston', kind: 'ground', crouch: true, startup: 6, active: 4, recovery: 15, dmg: 5,
    hb: { x: 12, y: -32, w: 110, h: 28 }, kb: [3, -8], stun: 24 },

  // ---- ท่าอากาศ: บ้านของเขา ----
  nair: { label: 'Spin Fists', kind: 'air', startup: 5, active: 9, recovery: 10, dmg: 5,
    hb: { x: -50, y: -122, w: 112, h: 108 }, kb: [3, -6], stun: 22, jumpCancel: true },
  sair: { label: 'Rocket Punch', kind: 'air', startup: 6, active: 8, recovery: 12, dmg: 6,
    hb: { x: 14, y: -96, w: 116, h: 34 }, kb: [9, -4], stun: 26,
    imp: { f: 6, vx: 9, vy: -1 }, floaty: true },
  // pogo = ทุบโดนแล้วเด้งกลับขึ้น **พร้อมคืนดับเบิลจัมพ์** (ดู resolveHit)
  // ทุบโดน -> เด้งขึ้น -> ได้ดับเบิลจัมพ์คืน -> ได้ไอพ่นคืน -> ทุบอีก
  // นี่คือความรู้สึกของตัวละครทั้งตัวในบรรทัดเดียว
  dair: { label: 'Piston Slam', kind: 'air', startup: 7, active: 8, recovery: 13, dmg: 6,
    hb: { x: -16, y: -40, w: 96, h: 80 }, kb: [4, -4], stun: 24, pogo: -12 },

  // ---- สกิล 1 Drag & Slam: ไถลากแล้วทุบพื้น (ปุ่ม 1) ----
  //
  // คว้าติดแล้ว **ลากไปด้วย** จนสุดทาง แล้วทุบลงพื้น
  // ชื่อคีย์เป็นชื่อจริงของท่าใหม่ ส่วนอาร์ตยืมเฟรมเก่าไปพลาง (ดู artAs ใน ScrambleScene)
  drag1: { label: 'Drag & Slam', kind: 'ground', startup: 8, active: 6, recovery: 10, dmg: 4,
    hb: { x: 16, y: -100, w: 112, h: 90 }, kb: [0, 0], stun: 16,
    carry: { frames: 36, mash: 5 }, imp: { f: 8, vx: 13 }, glide: true, autoChain: 'drag2' },
  // ทุบ — คนที่ยังถูกลากอยู่กินเต็ม · ดิ้นหลุดไปแล้วรอดไป
  // ทุบเปล่า ๆ ก็ยังมีคลื่นเล็ก ๆ กดพลาดไม่ได้แปลว่าเสียเปล่า แต่ค้างท่า 22 เฟรมคือของจริง
  drag2: { label: 'Drag & Slam', kind: 'ground', startup: 6, active: 5, recovery: 22, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    slam: { at: 6, dmg: 12, half: 150, stun: 34, kb: [6, -13] } },

  // ---- สกิล 2 OVERCLOCK: เกราะติดทุกท่า + หมัดแรงขึ้น แต่บล็อกไม่ได้ (ปุ่ม 2) ----
  //
  // **ไม่ใช่ "กันสถานะ"** — วงฝุ่นของ Alecto (dustGuard) ทำอยู่แล้ว ให้ตัวนี้แบบติดตัว
  // เคลื่อนที่ได้ ไม่ต้องยืนในวง = ของเธอเวอร์ชันดีกว่า และปิดสวิตช์กิตเธอกับ Orpheus ไปเลย
  // ตัวนี้ได้ "ล้างสถานะทีเดียวตอนกด" แทน ซึ่งให้ความรู้สึกเดียวกันแต่เป็นการกดถูกจังหวะ
  //
  // "บล็อกไม่ได้" คือหัวใจ — เกราะที่ไม่มีราคาคือบัฟฟรี และเกราะเป็นของ Atlas อยู่แล้ว
  // ความต่างคือ Atlas มีเกราะติดท่าหนักตลอดเวลา · ตัวนี้ติดทุกท่าแต่แค่ 3 วิ และถอยไม่ได้เลย
  over1: { label: 'Overclock', kind: 'ground', startup: 5, active: 3, recovery: 12, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    overclock: { at: 5, frames: OVERCLOCK_TIME } },

  // ---- สกิล 3 METEOR (อัลติ): จับขึ้นฟ้า แล้วพากลับลงมา (ปุ่ม 3 ใช้หลอด ki เต็ม) ----
  //
  // สกิล 1 เป็นแนวนอน อัลติจึงต้องเป็นแนวตั้ง ไม่งั้นมันคือท่าเดิมที่ยาวขึ้น
  //
  // **อมตะตลอดขาขึ้น** สำคัญที่สุดในท่า: อัลติที่กดได้เฉพาะตอนกำลังชนะคืออัลติที่ไม่มีใครกด
  // อันนี้กดสวนตอนโดนต้อนติดมุมได้ จึงเป็นปุ่มที่มีค่าตลอดทั้งยก
  meteor1: { label: 'Meteor', kind: 'ground', startup: 4, active: 8, recovery: 6, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    // ดูดด้วยระยะรอบตัว ไม่ใช่กรอบชนข้างหน้า — อัลติที่ "เล็งไม่เข้า" แล้วหายทั้งหลอดคือราคาที่ไม่สมกัน
    // ระยะกว้างพอที่คนยืนห่างครึ่งจอจะโดนดูด แต่ไม่กว้างจนทั้งเวทีหนีไม่ได้ (เวทีกว้าง 1280)
    carry: { frames: 999, mash: 0, range: METEOR_PULL, vert: METEOR_LIFT, dmg: 5 },
    iframes: [0, 24], imp: { f: 4, vx: 0, vy: -30 }, autoChain: 'meteor2', airChain: true, ghost: true },
  // จุดสูงสุด: ลอยนิ่งเงื้อสองหมัด (จอมืดลงรอบตัวเป็นเรื่องฝั่งวาด ซิมไม่รู้เรื่อง)
  meteor2: { label: 'Meteor', kind: 'air', startup: 8, active: 4, recovery: 4, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    iframes: [0, 16], imp: { f: 1, vx: 0, vy: -1 }, floaty: true, autoChain: 'meteor3', airChain: true, ghost: true },
  // ลง: ดิ่งจนแตะพื้นแล้วอัด — คลื่นวิ่งตามพื้นสองข้าง โดนเฉพาะคนที่ยืนอยู่
  // จับไม่ติดก็ยังได้คลื่น ไม่ใช่กดแล้วเสียหลอดฟรี (บทเรียนจากอัลติเดิมที่โปรยของทิ้งไว้เฉย ๆ)
  meteor3: { label: 'Meteor', kind: 'air', startup: 3, active: 60, recovery: 0, dmg: 0,
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
    imp: { f: 3, vx: 0, vy: 26 }, untilLand: true, landLag: 26, ghost: true,
    // คลื่นกว้างกว่ารัศมีดูด (260) อยู่หนึ่งช่วง — วงในโดนดูดขึ้นฟ้า วงนอกโดนคลื่นตอนลง
    // ถ้าสองค่าเท่ากัน คลื่นจะไม่มีงานทำเลย เพราะทุกคนในระยะถูกดูดไปหมดแล้วตั้งแต่ขาขึ้น
    slam: { onLand: true, dmg: 22, half: 380, stun: 40, kb: [8, -14] } },
};

const MOMUS_SKILLS = ['drag1', 'over1', 'meteor1'];
// สกิล 1 เป็นทั้งทางเข้าและดาเมจก้อนใหญ่ — ถี่กว่านี้แล้วไม่ต้องเล่นเกมระยะเลย
// สกิล 2 คูลดาวน์ยาวกว่าตัวบัฟเอง (300 > 180) จะได้ไม่มีช่วงที่ติดบัฟค้างตลอดเวลา
const MOMUS_SKILL_CD = [150, 300, 0];

/* ชื่อที่โชว์ (`label`) คือ **ชื่อเล่นของคนที่เล่นตัวนั้น** ไม่ใช่ชื่อในตำนาน
 *
 * เกมนี้ทำให้กลุ่มเพื่อนเล่นกันเอง ชื่อที่ควรขึ้นบนหัวจอตอนชนะจึงเป็นชื่อเพื่อน ไม่ใช่ชื่อเทพ
 * ชื่อในตำนาน (Nyx / Helios / ...) ย้ายไปเป็น**ฉายา** ใต้ชื่อ (ดู CHAR_ART.title ใน ScrambleScene)
 *
 * **`id` ไม่เปลี่ยนเด็ดขาด** — มันคือคีย์ของอัตลาส (`scnyx`) ชื่อไฟล์ชีต และค่าที่ส่งข้ามเน็ต
 * เปลี่ยนเมื่อไหร่ = อาร์ตหาย + แท็บที่เปิดค้างเล่นกับแท็บใหม่ไม่ได้
 */
const CHARACTERS = {
  nyx: { id: 'nyx', label: 'BOMB', moves: MOVES, skills: SKILLS, skillCd: SKILL_CD },
  helios: { id: 'helios', label: 'MARCH', moves: HELIOS_MOVES, skills: HELIOS_SKILLS, skillCd: HELIOS_SKILL_CD },
  alecto: { id: 'alecto', label: 'KUNJAE', moves: ALECTO_MOVES, skills: ALECTO_SKILLS,
    skillCd: ALECTO_SKILL_CD, backstep: ALECTO_BACKSTEP, runLow: 72 },
  // artPending = ยังไม่มีอาร์ต วาดเป็นกล่องไปก่อน · เทสที่ตรวจอาร์ตจะข้ามตัวที่ติดธงนี้
  // ใส่เข้าเกมก่อนเพื่อให้ลองเล่นกลไกเกราะได้จริง ก่อนจะลงทุนเจนอาร์ต ~59 ท่า
  atlas: { id: 'atlas', label: 'TEEMEE', moves: ATLAS_MOVES, skills: ATLAS_SKILLS,
    skillCd: ATLAS_SKILL_CD, hp: 130, resist: 0.5 },
  orpheus: { id: 'orpheus', label: 'OAT', moves: ORPHEUS_MOVES, skills: ORPHEUS_SKILLS,
    skillCd: ORPHEUS_SKILL_CD },
  momus: { id: 'momus', label: 'DEAR', moves: MOMUS_MOVES, skills: MOMUS_SKILLS,
    skillCd: MOMUS_SKILL_CD, boost: true },
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

/** ภาพหยุดกี่เฟรมตอนหมัดเข้า — "น้ำหนัก" ของหมัดคนเล่นอ่านจากตรงนี้ มากกว่าจากประกายไฟ
 *
 *  ของเดิมเป็น `4 + dmg*0.6` ซึ่งให้ช่วงแค่ 5-9 เฟรม = จิ้มเบากับไม้จบต่างกัน 1.8 เท่า
 *  ผลคือสองด้าน: จิ้มเบาหนืดจนรัวไม่ลื่น และไม้จบไม่หนักพอจะรู้สึกว่าจบ
 *  ตอนนี้ 3-16 เฟรม = ต่างกัน 5 เท่า ซึ่งคือช่วงที่เกมต่อสู้ทั่วไปใช้
 *
 *  ท่าที่จับลอย (kb ขึ้นแรง) ได้เพิ่มอีก เพราะจังหวะที่คนลอยขึ้นคือจังหวะที่ต้องกระแทกที่สุด
 *
 *  hitstop แช่ทั้งสองฝ่ายเท่ากัน และ `stun` ไม่เดินระหว่างนั้น จังหวะคอมโบจึงไม่เปลี่ยน
 *  ยาวขึ้นแล้วคอมโบไม่ขาด — ทั้งคนตีและคนโดนถูกหยุดพร้อมกันเป๊ะ
 */
const HITSTOP_PER_DMG = 1.43, HITSTOP_LAUNCH = 3;
const hitstopFor = (m) => Math.round(m.dmg * HITSTOP_PER_DMG) + (m.kb[1] < -10 ? HITSTOP_LAUNCH : 0);

const ACTIONABLE = new Set(['idle', 'walk', 'run', 'crouch', 'air', 'block', 'blockcrouch']);

/** เพื่อน AI — ตัวเลขทั้งหมดของสมอง อยู่ที่เดียวจะได้จูนง่าย */
const AI = {
  think: 7,        // คิดใหม่ทุกกี่เฟรม — ระหว่างนั้นถือแผนเดิมไว้ นี่คือ "เวลาตอบสนอง" ของ AI
                   // คิดใหม่ทุกเฟรม = อ่านเกมได้สมบูรณ์แบบ ซึ่งเล่นด้วยแล้วไม่สนุก
  reach: 95,       // ระยะที่ถือว่าประชิดพอจะตี
  chase: 260,      // ไกลกว่านี้คือวิ่งเข้าหาอย่างเดียว ไม่คิดอย่างอื่น
  backoff: 52,     // ใกล้เกินไป ถอยออกนิดให้มีระยะออกท่า
  climb: 90,       // ศัตรูอยู่สูงกว่าเท่านี้ถึงคิดจะกระโดดขึ้นไป
  attack: 0.55,    // โอกาสกดตีในรอบคิดที่อยู่ในระยะ
  block: 0.45,     // โอกาสยกการ์ดตอนศัตรูกำลังออกท่าใส่
  jump: 0.12,      // โอกาสกระโดดมั่ว ๆ ให้ดูมีชีวิต
  skill: 0.30,     // โอกาสปล่อยสกิลเมื่อพร้อม
  ultKi: 1,        // ต้องมี ki เต็มถึงจะปล่อยช่องอัลติ
};

/** สุ่มแบบคงที่ — เลขเดิมเข้า เลขเดิมออก ทุกเครื่อง ทุกครั้ง
 *
 *  **ห้ามใช้ Math.random ใน AI เด็ดขาด** เพราะ AI อยู่ในซิม
 *  สองเครื่องต้องคิดออกมาตรงกันเป๊ะ ไม่งั้นเพื่อน AI ของแต่ละเครื่องเดินคนละทาง
 *  = desync ที่ไม่มีอะไรฟ้อง และหาสาเหตุยากมากเพราะผู้เล่นทั้งคู่ไม่ได้ทำอะไรผิด
 */
function aiRoll(frame, seed) {
  let x = (frame * 2654435761 + seed * 40503) | 0;
  x ^= x << 13; x |= 0;
  x ^= x >>> 17;
  x ^= x << 5; x |= 0;
  return (x >>> 0) / 4294967296;
}

/** อินพุตเปล่าหนึ่งเฟรม — รูปร่างเดียวกับที่ฉากอ่านจากคีย์บอร์ดเป๊ะ */
function blankInput() {
  return { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0,
    skill1: 0, skill2: 0, skill3: 0, p: {} };
}

class Fighter {
  constructor(id, name, x, facing, char = DEFAULT_CHAR, team = (id === 'p1' ? 0 : 1)) {
    this.id = id; this.name = name; this.spawnX = x; this.spawnFacing = facing;
    // ทีม: 0 กับ 1 — 1v1 คือทีมละคน ส่วน 2v2 คือทีมละสองคน กติกาทุกข้อคิดจากทีม ไม่ใช่จากไอดี
    // ตั้งค่าเริ่มต้นจากไอดีเพื่อให้โหมดเดิม (p1 vs p2) ได้ทีมคนละทีมเองโดยไม่ต้องแก้ที่เรียก
    this.team = team;
    this.char = char;
    // ช่องนี้เดินด้วยสมองไหม — ตั้งจาก setRoster() ไม่ใช่จากไอดี
    // หุ่นซ้อมของโหมด 1v1 ไม่ติดธงนี้ พฤติกรรมเดิมจึงไม่เปลี่ยนเลย
    this.ai = false;
    this.reset();
  }
  /** ตารางท่าของตัวละครตัวนี้ — ชื่อท่าเหมือนกันทุกตัว ค่าเฟรมเดต้าเป็นของใครของมัน */
  get moves() { return CHARACTERS[this.char].moves; }
  get skills() { return CHARACTERS[this.char].skills; }
  get skillCd() { return CHARACTERS[this.char].skillCd; }
  get backstep() { return CHARACTERS[this.char].backstep ?? null; }
  /** ตัวนี้ใช้ระบบไอพ่นไหม — ตั้งที่ตารางตัวละคร ไม่ใช่เช็กชื่อตัวละครกระจายทั่วซิม */
  get boostJump() { return !!CHARACTERS[this.char].boost; }
  /** ตารางท่าตีปกติชุดที่สอง (ถ้าตัวนี้มี) — ว่างเปล่าแปลว่าไม่มีให้สลับ */
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
      dashTap: 0, dashTapF: 0,      // เคาะทิศสองทีติดกัน = พุ่ง (ดู takeInput)
      dashLock: 0,                  // พุ่งติดกันได้เร็วสุดกี่เฟรม
      carryLeft: 0, slammed: 0,
      fxN: 0,                       // ตัวนับอีเวนต์ภาพของท่ารัว — เดินทีละหนึ่งต่อหนึ่งอีเวนต์
                                    // ใช้แทน `this.frame` เพราะฝั่งวาดเลือกชั้นด้วย `% n`
                                    // ถ้าใช้เลขเฟรม เงื่อนไขอย่าง `% 4 === 2` อาจไม่ตรงกับ
                                    // จังหวะที่อีเวนต์ถูกปล่อย (ทุกสองเฟรม) เลยสักครั้ง
      boost: BOOST_MAX,             // ไอพ่นของ DEAR — พุ่ง/กระโดดใช้ขีด ต่อยโดนคืนขีด (ดู BOOST_MAX)
      boostGain: 0,                 // คืนไปแล้วกี่ขีดในช่วงลอยนี้ — แตะพื้นแล้วล้าง (กันคอมโบไม่รู้จบ)
      carriedBy: null,              // ถูกใครลากอยู่ (id) — ตำแหน่งถูกผูกกับคนนั้นชั่วคราว
      carrying: [],                 // กำลังลากใครอยู่บ้าง (id)
      mashOut: 0,                   // กดดิ้นไปแล้วกี่ที — ครบแล้วหลุดจากการถูกลาก
      overclock: 0,                 // เหลือกี่เฟรม — เกราะติดทุกท่า หมัดแรงขึ้น แต่บล็อกไม่ได้
      armorLeft: 0,                 // เกราะของ Atlas เหลือกินได้อีกกี่ที (ตั้งตอนเริ่มท่า)
      stanceUntil: -9999,           // ท่าตั้งป้อมยืนยิงหมดเวลาที่เฟรมไหน
      alt: false,                   // สลับไปใช้ท่าตีปกติชุดที่สองอยู่ไหม (KUNJAE: ถือปืนแทนหาง)
                                    // รีเซ็ตทุกยก = เริ่มยกใหม่ถือแส้เสมอ ทั้งสองเครื่องตรงกันแน่นอน
      veil: 0, dustGuard: 0,        // อยู่ในวงฝุ่นของ Alecto / จางต่อหลังออกจากวง
      caged: 0,                     // ถูกขังอยู่ในวงฝุ่นของอีกฝ่าย (เดินออกไม่ได้ ต้องกระโดด)
      burn: 0, burnF: -9999,        // ไฟที่ติดตัวอยู่ — อยู่ที่ "คนโดน" ติดจากการแตะกองไฟของ Orpheus
      // บัฟเฟอร์อินพุตเป็นของแต่ละฝั่ง — เล่นสองคนต้องกดพร้อมกันได้โดยไม่กินคิวของกันและกัน
      buf: { attack: 0, jump: 0, skill1: 0, skill2: 0, skill3: 0 },
      lastTap: { dir: 0, f: -99 }, dashLatch: false, inp: null,
      aiPlan: null, aiNext: 0,      // แผนที่เพื่อน AI ถืออยู่ และเฟรมที่จะคิดใหม่
      comboHits: 0, comboDmg: 0, wallBounced: false, bounced: false, bouncePend: 0, pinned: 0,
      jumpHeldSinceTakeoff: false, techBuf: 0, techLock: 0,
    });
  }
  // กันแบบก้ม (blockcrouch) ตัวเตี้ยเท่าท่าย่อ — ไม่งั้นก้มกันแล้วกรอบยังสูงเท่าเดิม ก็ไม่ต่างจากกันยืน
  // lowStun = จำไว้ว่า blockstun นี้มาจากท่าก้ม เพื่อให้กรอบยังเตี้ยตลอดช่วงเซ ไม่เด้งสูงกลางคัน
  // (เด้งสูงกลางคันแปลว่าท่าที่ตีสูงจะจิ้มโดนหัวได้ ทั้งที่ผู้เล่นก้มกันอยู่ตลอด)
  get h() {
    const low = this.state === 'crouch' || this.state === 'blockcrouch' || (this.state === 'blockstun' && this.lowStun)
      || (this.move && this.move.crouch) || this.state === 'knockdown' || this.state === 'techroll';
    if (low) return PHYS.crouchH;
    /* `runLow` = ตัวที่ "วิ่งย่อ" จริง ๆ ตามอาร์ต กรอบเตี้ยลงเฉพาะตอนวิ่งเต็มสปีด
     *
     * ใส่ให้ KUNJAE เพราะคลิปวิ่งของเธอโน้มตัวต่ำกว่าคนอื่นชัด ๆ — วัดจากอัตลาสจริง
     * ยืน 238 px · วิ่ง 180 px (76%) · เทียบ MARCH 99% และ DEAR 95%
     * เธอวิ่งเตี้ยกว่า "ท่าย่อ" ของตัวเอง (206) เสียอีก กรอบยืนเต็มจึงไม่ตรงกับสิ่งที่เห็น
     *
     * **ทำไมไม่ใช่ `crouchH` (88) ซึ่งตรงกับอาร์ตเป๊ะ** — วัดแล้วมัน**ไม่หลบอะไรเลยสักท่า**
     * ขอบล่างของกรอบโจมตีที่สูงที่สุดในเกมอยู่ที่ 76 px เหนือเท้า (`sky2` ของ MARCH)
     * กรอบสูง 88 จึงกินทุกท่าเหมือนเดิมทั้ง 88 ท่า = เปลี่ยนตัวเลขไปก็ไม่มีผลต่อการเล่น
     * (ข้อนี้แปลว่า **ท่าย่อในเกมนี้ก็หลบอะไรไม่ได้เลยเหมือนกัน** — คนละเรื่อง ยังไม่แตะ)
     *
     * 72 คือค่าที่ "มีผลจริงแต่ไม่ล้นมือ": หลบได้ 7 จาก 88 ท่า ซึ่งเป็นไม้กดดันเร็ว ๆ พอดี
     * (jab1/jab2/rush1/rush2 ของ MARCH · jab1 ของ OAT · sky2/rush4) ลงไปถึง 60 จะหลบ 29 ท่า
     * ซึ่งมากเกินไป แลกกับการโกงสายตาราว 17 px (อาร์ตตรงกับ 89) ซึ่งรับได้
     *
     * ต้องกดวิ่งค้างและเคลื่อนที่อยู่เท่านั้น — ตีหรือกันเมื่อไหร่ state เปลี่ยน กรอบกลับมาเต็ม
     * จึงเป็น "ทางหนี" ไม่ใช่ "ท่ายืนกินฟรี"
     */
    const rl = CHARACTERS[this.char]?.runLow;
    if (rl && this.state === 'run') return rl;
    return PHYS.standH;
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
    // ── เก็บเป็นลิสต์ ไม่ใช่ p1/p2 สองตัวแปร ──
    //
    // ขั้นแรกของการรองรับ 4 คน (2v2) ตอนนี้ยังมีสองคนเหมือนเดิมทุกอย่าง
    // `p1`/`p2` ยังเรียกได้ผ่าน getter ข้างล่าง โค้ดเดิมกว่าร้อยจุดจึงไม่ต้องแก้พร้อมกันทีเดียว
    // ซึ่งเป็นวิธีเดียวที่รีแฟคเตอร์ขนาดนี้จะตรวจสอบได้ว่าไม่ได้เปลี่ยนพฤติกรรมอะไรเลย
    this.fighters = [
      new Fighter('p1', 'NYX', 420 + shift, 1, 'nyx', 0),
      // หุ่นซ้อมเป็นตัวละครจริงตัวหนึ่ง ไม่ใช่กล่องอีกแล้ว — ตั้งเป็นคนละตัวกับผู้เล่นจะได้เห็นทั้งสองตัวพร้อมกัน
      new Fighter('p2', 'DUMMY', 860 + shift, -1, 'helios', 1),
    ];
    this.dummyMode = 'stand';
    this.dummyTech = 'off';

    this.events = [];
    this.meter = []; this.meterIdle = 0;
    this.lastMoveInfo = null;
    this.shots = [];
    this.fires = [];
    this.dust = null;               // วงฝุ่นของ Alecto — มีได้ทีละวงเดียว
    // on = ปิดอยู่ตอนซ้อมกับหุ่น เปิดเมื่อเล่นกับคนจริง · ทุกค่าเดินด้วยเลขเฟรมล้วน
    this.match = { on: false, bars: [ROUND_BARS, ROUND_BARS], round: 1, freeze: 0, loser: [], winner: null };
  }

  /** สองตัวแรกของลิสต์ — โค้ดเดิมทั้งหมดยังเรียก p1/p2 ได้เหมือนเดิม
   *  จะเลิกใช้ทีละจุดตอนแก้ HUD กับระบบยกให้รองรับ 4 คน ไม่ใช่รื้อทีเดียวทั้งหมด */
  get p1() { return this.fighters[0]; }
  get p2() { return this.fighters[1]; }

  /** ทุกคนที่ไม่ได้อยู่ทีมเดียวกัน — 1v1 ก็คืออีกคนเดียวเหมือนเดิม */
  foes(f) { return this.fighters.filter((o) => o.team !== f.team); }

  /** อยู่ทีมเดียวกันไหม (รวมตัวเอง) — ใช้ตัดสินว่าท่าของใครทำร้ายใครได้ */
  sameTeam(a, b) { return a.team === b.team; }

  /** จัดวงใหม่เป็น 2 หรือ 4 คน — เรียกจากฉากตอนเลือกโหมด
   *
   *  ตัวละครที่เคยเลือกไว้ของสองคนแรกถูกเก็บไว้ ไม่ให้สลับโหมดแล้วตัวละครหาย
   *  จุดเกิดคิดจากกึ่งกลางเวทีเสมอ เวทีกว้างขึ้นก็ยังอยู่กลางเหมือนเดิม
   */
  setRoster(count) {
    const shift = (STAGE.w - STAGE_BASE_W) / 2;
    // สองช่องหลังเป็นเพื่อน AI ที่สู้จริง ไม่ใช่หุ่นซ้อมที่ยืนเฉย ๆ
    // ช่องแรกสองช่องไม่ติดธง โหมดซ้อม 1v1 จึงยังได้หุ่นซ้อมเหมือนเดิมเป๊ะ
    const keep = this.fighters.map((f) => f.char);
    // 2 คน: ห่างกัน 440 เหมือนเดิมเป๊ะ · 4 คน: ทีมละสองคนยืนซ้อนกันข้างละฝั่ง
    const spec = count === 4
      ? [[340, 1, 0], [780, -1, 1], [500, 1, 0], [940, -1, 1]]
      : [[420, 1, 0], [860, -1, 1]];
    this.fighters = spec.map(([x, facing, team], i) => {
      const f = new Fighter('p' + (i + 1), i === 1 ? 'DUMMY' : 'P' + (i + 1), x + shift, facing,
        keep[i] ?? (i === 1 ? 'helios' : 'nyx'), team);
      f.ai = i >= 2;
      return f;
    });
    this.match.bars = this.teams().map(() => ROUND_BARS);
    this.resetPositions();
    return this.fighters;
  }

  /** เลขทีมทั้งหมดที่มีอยู่จริง เรียงจากน้อยไปมาก — ไม่ฮาร์ดโค้ด [0, 1] */
  teams() { return [...new Set(this.fighters.map((f) => f.team))].sort((x, y) => x - y); }
  /** เริ่มแมตช์ใหม่ตั้งแต่ยกแรก — ล้างทั้งหลอดเลือดและจำนวนหลอดที่เหลือ */
  startMatch() {
    this.match = { on: true, bars: this.teams().map(() => ROUND_BARS), round: 1, freeze: 0, loser: [], winner: null };
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

    // จบแมตช์แล้ว **ซิมไม่เริ่มใหม่เอง ไม่ว่าจะกดปุ่มอะไร**
    //
    // เดิมกดตีแล้วเริ่มใหม่ด้วยตัวละครเดิมทันที ถอดออกเพราะมันกลายเป็นปลายทางที่สอง:
    // มาสห์ปุ่มตีตอนป้ายผู้ชนะขึ้นแล้วได้แมตช์ใหม่ ปล่อยไว้เฉย ๆ แล้วได้หน้าเลือกตัว
    // คนเล่นจึงได้คนละอย่างจากการ "ไม่ทำอะไรเลย" กับ "เผลอกดปุ่ม" ซึ่งเดาไม่ได้
    //
    // ตอนนี้ปลายทางมีทางเดียว: ฝั่งวาดพากลับไปหน้าเลือกตัว (ดู MATCH_END_HOLD)
    // ปุ่ม "พร้อม/เริ่ม" บนหน้านั้นคือปุ่มเริ่มใหม่ — เห็นอยู่ มีป้ายกำกับ และไม่ต้องเดา
    if (m.winner !== null) return;

    if (m.freeze > 0) {
      if (--m.freeze > 0) return;
      for (const i of m.loser) m.bars[i]--;
      const dead = this.teams().filter((t) => m.bars[t] <= 0);
      if (dead.length) {
        // ล้มพร้อมกันทั้งคู่ในยกสุดท้าย = เสมอ (-1)
        const alive = this.teams().filter((t) => !dead.includes(t));
        m.winner = alive.length === 1 ? alive[0] : -1;
        this.events.push({ type: 'matchEnd', winner: m.winner });
        return;
      }
      m.round++;
      this.resetPositions();
      this.events.push({ type: 'roundStart', round: m.round });
      return;
    }

    // ทีมจะเสียหลอดเมื่อ **ล้มครบทุกคนในทีม** ไม่ใช่ล้มคนเดียว
    // 1v1 คือทีมละคน จึงได้ผลเหมือนเดิมเป๊ะ
    // และทำให้ "เหลือคนเดียวสู้สองคน" เป็นสถานการณ์จริงที่พลิกได้ ซึ่งคือช่วงที่สนุกที่สุดของเกมทีม
    const out = [];
    for (const t of this.teams()) {
      const mates = this.fighters.filter((f) => f.team === t);
      if (mates.length && mates.every((f) => f.hp <= 0)) out.push(t);
    }
    if (!out.length) return;
    m.loser = out;
    m.freeze = KO_FREEZE;
    this.events.push({ type: 'ko', loser: out.slice() });
  }

  resetPositions() {
    for (const f of this.fighters) f.reset();
    this.meter = []; this.shots = []; this.fires = []; this.dust = null;
  }

  /**
   * เดินหนึ่งเฟรม — รับอินพุตสองฝั่ง
   * inp2 = null คือโหมดซ้อม: ฝั่งขวาเดินด้วย controlDummy เหมือนเดิม
   * ใส่ inp2 มาคือเล่นสองคน (เครื่องเดียวกันหรือคนละเครื่องผ่านเน็ตก็ได้ — sim ไม่รู้และไม่ต้องรู้)
   */
  step(...inputs) {
    this.frame++; this.events = [];
    const p = this.p1, d = this.p2;
    // อินพุตเรียงตามลำดับเดียวกับ `fighters` · ตัวไหนได้ null เดินด้วย AI (โหมดซ้อม/ช่องที่ยังไม่มีคน)
    // ช่องที่ติดธง ai ได้อินพุตจากสมองตั้งแต่ตรงนี้ ทุกอย่างใต้บรรทัดนี้จึงไม่รู้เลยว่าใครเป็นคนใครเป็น AI
    // (คิดก่อนใครขยับ ทุกตัวจึงเห็นสถานะต้นเฟรมชุดเดียวกัน = ผลเหมือนกันทุกเครื่อง)
    const inps = this.fighters.map((f, i) => inputs[i] ?? (f.ai ? this.aiInput(f) : null));
    this.fighters.forEach((f, i) => { if (inps[i]) this.takeInput(f, inps[i]); });

    for (const [f, inp] of this.fighters.map((f, i) => [f, inps[i]])) {
      if (f.hitstop > 0) { f.hitstop--; continue; }
      if (!inp) { this.controlDummy(f); this.physics(f, null); this.advanceMove(f, null); continue; }
      if (f.techBuf > 0) f.techBuf--;
      if (f.techLock > 0) f.techLock--;
      this.controlPlayer(f, inp); this.physics(f, inp); this.advanceMove(f, inp);
      // อินพุตที่ค้างในคิวเดินถอยหลังเฉพาะตอนไม่ได้ถูกแช่อยู่ใน hitstop
      for (const k of Object.keys(f.buf)) if (f.buf[k] > 0) f.buf[k]--;
    }

    // ของบนเวทีหยุดเดินตอนมีใครถูกแช่อยู่ ไม่งั้นระเบิดเดินต่อขณะภาพนิ่ง = จังหวะเพี้ยน
    if (this.fighters.every((f) => f.hitstop <= 0)) {
      this.updateShots(); this.updateFires();
    }
    for (const f of this.fighters) this.tickFlame(f);
    this.updateDust();
    this.updateCarry();
    for (const f of this.fighters) {
      if (f.overclock > 0 && --f.overclock === 0) this.events.push({ type: 'overclockEnd', x: f.x, y: f.y - 70 });
      if (f.dashLock > 0) f.dashLock--;
      if (f.pinned > 0) f.pinned--;
    }
    // ทุกคู่ที่เป็นไปได้ ทั้งสองทิศ — 2 คนได้ 2 คู่เหมือนเดิม 4 คนได้ 12 คู่
    // เรียงตามลำดับในลิสต์เสมอ ไม่ใช่ตามใครตีก่อน สองเครื่องจึงตัดสินลำดับเดียวกัน
    for (const a of this.fighters) for (const b of this.fighters) if (a !== b) this.resolveHit(a, b);
    for (let i = 0; i < this.fighters.length; i++)
      for (let j = i + 1; j < this.fighters.length; j++) this.pushApart(this.fighters[i], this.fighters[j]);
    for (const f of this.fighters) this.updateCombo(f);
    this.updateMatch();
    this.recordMeter(p);
    // ฟื้นเลือดให้หุ่นเฉพาะโหมดซ้อม — เล่นสองคนต้องมีใครสักคนแพ้
    if (!this.match.on && !inps[1] && this.frame - d.lastHitF > 120 && d.hp < d.maxHp && ACTIONABLE.has(d.state)) d.hp = d.maxHp;
  }

  /** รับอินพุตของเฟรมนี้เข้าคิวของฝั่งนั้น ๆ */
  takeInput(f, inp) {
    f.inp = inp;
    for (const k of Object.keys(f.buf)) if (inp.p[k]) f.buf[k] = PHYS.buffer + 1;
    // ── DEAR: เคาะทิศสองทีติดกัน = พุ่งด้วยไอพ่น ──
    //
    // ใช้ปุ่มเดิมทั้งหมด ไม่เพิ่มปุ่มใหม่ — โปรโตคอลเน็ตส่งแค่บิตที่มีอยู่แล้ว
    // (เพิ่มปุ่มแปลว่าต้องแก้ packInput/unpackInput ซึ่งทำให้แท็บเก่าเล่นกับแท็บใหม่ไม่ได้)
    // PHYS.dashWindow ถูกเว้นไว้ให้เรื่องนี้มาตั้งแต่แรก ดูคอมเมนต์ใน PHYS
    if (f.boostJump) {
      const tap = (inp.p.right ? 1 : 0) - (inp.p.left ? 1 : 0);
      if (tap) {
        if (f.dashTap === tap && f.dashTapF > 0) { this.boostDash(f); f.dashTap = 0; f.dashTapF = 0; }
        else { f.dashTap = tap; f.dashTapF = PHYS.dashWindow; }
      }
      if (f.dashTapF > 0) f.dashTapF--;
    }
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
    return id;   // เคยแปลชื่อท่าตามอาวุธที่ถือ — KUNJAE ถอดชุดที่สองทิ้งแล้ว ไม่มีใครใช้
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
    // โอเวอร์คล็อกให้เกราะกับ **ทุกท่า** ไม่ใช่เฉพาะท่าที่ประกาศไว้เอง — นั่นคือทั้งหมดของบัฟตัวนี้
    // ท่าที่มีเกราะของตัวเองอยู่แล้ว (Atlas) เอาค่าที่มากกว่า ไม่ใช่ทับทิ้ง
    f.armorLeft = Math.max(mv.armor ?? 0, f.overclock > 0 ? OVERCLOCK_ARMOR : 0);
    f.slammed = 0;
    f.carrying = [];
    f.hitList = new Set(); f.hitConfirmed = false; f.used.add(id);
    f.setState('attack');
    this.lastMoveInfo = { id, ...f.moves[id] };
    this.events.push({ type: 'move', id });
  }

  /* ══ DEAR: ไอพ่น · การลาก · โอเวอร์คล็อก ══════════════════════════════════
   *
   * ทั้งสามอย่างเดินด้วยเลขเฟรมล้วน ไม่มีสุ่ม ไม่อ่านเวลาจริง — สองเครื่องจึงตรงกันเอง
   * ดูเหตุผลของทุกตัวเลขที่ docs/MOMUS_KIT.md
   */

  /** ใช้ไอพ่นหนึ่งขีด — คืน true ถ้าใช้ได้จริง */
  spendBoost(f) {
    if (f.boost <= 0) return false;
    f.boost--;
    this.events.push({ type: 'boost', x: f.x, y: f.y - 60, n: f.boost });
    return true;
  }

  /** ต่อยโดนแล้วคืนไอพ่น — มีเพดานต่อหนึ่งช่วงลอย ดู BOOST_PER_AIR
   *
   *  เรียกเฉพาะตอน "โดนตัวจริง" ไม่ใช่ตอนโดนบล็อก — ไม่งั้นตีใส่คนที่กันอยู่เฉย ๆ
   *  ก็เติมน้ำมันได้ไม่จำกัด ซึ่งลบเงื่อนไข "ห้ามพลาด" ที่เป็นราคาทั้งหมดของตัวละครทิ้ง
   */
  gainBoost(f) {
    if (!f || f.boost >= BOOST_MAX) return;
    if (!f.onGround && f.boostGain >= BOOST_PER_AIR) return;
    f.boost++;
    if (!f.onGround) f.boostGain++;
    this.events.push({ type: 'boostGain', x: f.x, y: f.y - 90, n: f.boost });
  }

  /** พุ่งด้วยไอพ่น 8 ทิศ — เรียกจาก step() ตอนกดปุ่มพุ่ง
   *
   *  ไม่มีทิศที่กดค้าง = พุ่งไปข้างหน้า (ทิศที่หันอยู่) ไม่ใช่กดแล้วไม่เกิดอะไร
   *  "กดแล้วไม่เกิดอะไร" เป็นความรู้สึกที่แย่ที่สุดในเกมต่อสู้ และคนเล่นจะโทษว่าปุ่มเสีย
   */
  boostDash(f) {
    if (f.dashLock > 0 || f.stun > 0 || f.hitstop > 0 || f.carriedBy) return false;
    if (!ACTIONABLE.has(f.state) && f.state !== 'attack') return false;
    if (!this.spendBoost(f)) return false;
    const i = f.inp ?? {};
    let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    const dy = (i.down ? 1 : 0) - (i.up ? 1 : 0);
    if (!dx && !dy) dx = f.facing;
    f.vx = dx * BOOST_DASH_VX;
    f.vy = dy * BOOST_DASH_VY;
    if (dx) f.facing = dx;
    if (dy < 0 || !f.onGround) f.onGround = false;
    f.move = null; f.moveId = null;
    f.setState(f.onGround ? 'idle' : 'air');
    f.invuln = Math.max(f.invuln, BOOST_IFRAMES);
    f.dashLock = BOOST_LOCK;
    this.events.push({ type: 'dash', x: f.x, y: f.y - 60, dx, dy });
    return true;
  }

  /** เริ่มโอเวอร์คล็อก — ล้างสถานะที่ติดอยู่ทีเดียวตอนกด
   *
   *  **ล้างทีเดียว ไม่ใช่กันตลอดช่วง** — "กันสถานะทุกอย่าง" เป็นของวงฝุ่นของ Alecto อยู่แล้ว
   *  (ดู dustGuard) ให้ตัวนี้แบบติดตัวเคลื่อนที่ได้ = ของเธอเวอร์ชันดีกว่า
   *  และ 3 วินาทีคือการปิดสวิตช์กิตของเธอกับ Orpheus ไปทั้งดุ้น
   *  ล้างทีเดียวให้ความรู้สึกเดียวกัน (ไฟดับ รอยแส้หาย) แต่เป็นการกดถูกจังหวะ
   */
  startOverclock(f, frames) {
    f.overclock = frames;
    f.burn = 0;
    f.armorLeft = Math.max(f.armorLeft, OVERCLOCK_ARMOR);
    this.events.push({ type: 'overclock', x: f.x, y: f.y - 70, frames });
  }

  /** เริ่มลากคนที่อยู่ในระยะของท่านี้ไปด้วย
   *
   *  มีสองแบบ เลือกจากว่าท่าประกาศ `range` ไว้หรือเปล่า:
   *
   *  - **ไม่มี `range` = ใช้กรอบชนของท่า** (สกิล 1) ต้องไถผ่านตัวเขาจริง ๆ ถึงจะติด
   *    ซึ่งถูกแล้วสำหรับสกิลที่กดได้ทุก 2.5 วินาที — พลาดแล้วไม่เสียอะไรมาก
   *
   *  - **มี `range` = ดูดทุกคนรอบตัวในระยะนั้น** (อัลติ) ไม่สนว่าหันทางไหน
   *    อัลติกิน ki เต็มหลอดและกดได้ครั้งเดียวต่อเกม การพลาดเพราะ "เล็งไม่เข้า"
   *    จึงไม่ใช่ความผิดที่สมกับราคา — ที่ควรตัดสินคือ **กดตอนไหน** ไม่ใช่ยืนห่างกี่พิกเซล
   *    (คนที่อมตะอยู่ยังรอดเหมือนเดิม ระยะไม่ได้แปลว่าหนีไม่ได้)
   */
  startCarry(a, spec) {
    const hb = spec.range ? null : a.hitbox();
    if (!spec.range && !hb) return;
    // บอกขนาดวงให้ฝั่งวาดรู้ **ทุกครั้งที่ดูด ไม่ใช่เฉพาะตอนดูดติด**
    // วงที่โผล่เฉพาะตอนโดนคือกับดักที่มองไม่เห็น — อีกฝั่งไม่มีวันเรียนรู้ว่าต้องยืนห่างแค่ไหน
    if (spec.range) this.events.push({ type: 'pull', x: a.x, y: a.y, r: spec.range, v: spec.vert });
    for (const d of this.foes(a)) {
      if (d.hp <= 0 || d.invuln > 0 || d.carriedBy) continue;
      if (spec.range) {
        if (Math.abs(d.x - a.x) > spec.range) continue;
        if (Math.abs(d.y - a.y) > spec.vert) continue;
      } else if (!overlap(hb, d.hurtbox())) continue;
      d.carriedBy = a.id;
      d.carryLeft = spec.frames;
      d.mashOut = spec.mash;
      d.move = null; d.moveId = null; d.setState('hitstun');
      d.stun = spec.frames;
      a.carrying.push(d.id);
      // ท่าที่ดูดด้วยระยะไม่มีกรอบชน ดาเมจตอนคว้าจึงต้องจ่ายตรงนี้ ไม่ใช่ผ่าน resolveHit
      if (spec.dmg) {
        const real = Math.max(1, Math.round(spec.dmg * d.resist * (d.dustGuard ? DUST_DR : 1)));
        d.hp = Math.max(0, d.hp - real);
        d.lastHitF = this.frame;
        this.events.push({ type: 'hit', x: d.x, y: d.y - 70, dmg: real });
      }
      // บอกจำนวนครั้งที่ต้องดิ้นไปด้วย — ท่าที่ดิ้นไม่หลุด (mash 0) ต้องไม่ขึ้นป้ายชวนให้รัวปุ่ม
      this.events.push({ type: 'grab', x: d.x, y: d.y - 70, mash: spec.mash });
    }
  }

  /** เดินการลากหนึ่งเฟรม — ผูกตำแหน่งคนที่ถูกลากไว้กับคนลาก
   *
   *  **ต้องมีทางดิ้นเสมอ** ลากไกลแปลว่าคนโดนนั่งมือเปล่าอยู่หลายสิบเฟรม
   *  ซึ่งเป็นความรู้สึกที่แย่ที่สุดในเกมต่อสู้ · กดปุ่มไหนก็ได้นับเป็นการดิ้นหนึ่งที
   *  (อัลติตั้ง mash: 0 = ดิ้นไม่หลุด แลกกับที่มันกิน ki เต็มหลอด)
   */
  updateCarry() {
    for (const d of this.fighters) {
      if (!d.carriedBy) continue;
      const a = this.fighterById(d.carriedBy);
      // คนลากหลุดท่าไปแล้ว (โดนสวน/ท่าจบ) = ปล่อยทันที ไม่ใช่ลากต่อด้วยผี
      if (!a || a.state !== 'attack' || a.hp <= 0) { this.dropCarry(d); continue; }
      if (d.mashOut > 0 && this.mashPressed(d)) {
        d.mashOut--;
        if (d.mashOut <= 0) { this.events.push({ type: 'breakOut', x: d.x, y: d.y - 70 }); this.dropCarry(d); continue; }
      }
      if (--d.carryLeft <= 0) { this.dropCarry(d); continue; }
      // ผูกตำแหน่งไว้ข้างหน้าคนลาก ไม่ใช่ทับกันพอดี — ทับกันแล้วสไปรท์ซ้อนจนดูไม่ออกว่าใครเป็นใคร
      const half = PHYS.width / 2;
      d.x = Math.max(STAGE.wallL + half, Math.min(STAGE.wallR - half, a.x + a.facing * CARRY_GAP));
      d.y = a.y;
      d.vx = 0; d.vy = 0; d.onGround = a.onGround;
      d.facing = -a.facing;
      d.stun = Math.max(d.stun, 2);
    }
  }

  dropCarry(d) {
    const a = this.fighterById(d.carriedBy);
    if (a) a.carrying = a.carrying.filter((id) => id !== d.id);
    d.carriedBy = null; d.carryLeft = 0; d.mashOut = 0;
  }

  /** ทุบพื้น — คนที่ยังถูกลากอยู่กินเต็ม ที่เหลือกินคลื่นตามพื้น
   *
   *  คลื่นโดน **เฉพาะคนที่ยืนอยู่บนพื้น** — นั่นคือสิ่งที่ทำให้อีกฝั่งต้องกระโดดหนี
   *  ซึ่งพาทุกคนขึ้นฟ้ามาอยู่ในสนามของเขาพอดี อัลติของเขาสร้างสถานการณ์ที่เขาเก่งที่สุด
   */
  slam(a, spec) {
    this.events.push({ type: 'slam', x: a.x, y: STAGE.groundY, r: spec.half });
    const held = this.fighters.filter((d) => d.carriedBy === a.id);
    // จับได้หลายคนก็หารกัน ไม่งั้นสกิล 1 จะแรงกว่าอัลติ ซึ่งกลับหัวกลับหาง
    const each = held.length ? Math.max(1, Math.round(spec.dmg / held.length)) : 0;
    for (const d of held) {
      this.dropCarry(d);
      this.hurt(a, d, each, spec.stun, spec.kb);
    }
    // คลื่นตามพื้น — ไม่โดนคนที่เพิ่งกินหมัดไปแล้ว และไม่โดนคนที่ลอยอยู่
    for (const d of this.foes(a)) {
      if (d.hp <= 0 || d.invuln > 0 || !d.onGround || held.includes(d)) continue;
      if (Math.abs(d.x - a.x) > spec.half) continue;
      this.hurt(a, d, Math.round(spec.dmg * SLAM_WAVE), spec.stun, spec.kb);
    }
  }

  /** ทำดาเมจตรง ๆ โดยไม่ผ่านกรอบชน — ใช้กับของที่คิดระยะเอง (ทุบพื้น) */
  hurt(a, d, dmg, stun, kb) {
    const dir = d.x >= a.x ? 1 : -1;
    const real = Math.max(1, Math.round(dmg * d.resist * (d.dustGuard ? DUST_DR : 1)));
    d.hp = Math.max(0, d.hp - real);
    d.lastHitF = this.frame;
    d.stun = Math.max(d.stun, stun);
    d.move = null; d.moveId = null; d.setState('hitstun');
    d.vx = dir * kb[0]; d.vy = kb[1];
    if (kb[1] < 0) d.onGround = false;
    d.hitstop = 4;
    this.events.push({ type: 'hit', x: d.x, y: d.y - 70, dmg: real, heavy: true, launch: kb[1] < 0 });
  }

  /** ศัตรูที่ใกล้ที่สุด — นิยามนี้ใช้ได้ทั้ง 1v1 และ 2v2 โดยไม่ต้องแยกเคส
   *
   *  **คิดจากระยะล้วน ไม่มีสุ่ม** สองเครื่องจึงเลือกเป้าเดียวกันเสมอ ซึ่งจำเป็นสำหรับ netplay
   *  ตัดสินเสมอด้วยลำดับในลิสต์ (คนที่มาก่อนชนะ) ไม่ใช่ปล่อยให้ sort ตัดสินเอง
   *  เพราะ `Array.prototype.sort` ไม่รับประกันความเสถียรเท่ากันทุกเอนจิ้น
   */
  foe(f) {
    let best = null, bestD = Infinity;
    for (const o of this.fighters) {
      if (o.team === f.team) continue;
      const d = Math.abs(o.x - f.x);
      if (d < bestD) { best = o; bestD = d; }
    }
    return best;
  }

  /** หาตัวละครจากไอดี — แยกเป็นเมธอดเพื่อให้รองรับเกินสองคนได้ตอนทำโหมดหลายคน */
  fighterById(id) { return this.fighters.find((f) => f.id === id) ?? null; }

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
        // `spec.speed` = ความเร็วแนวนอนเฉพาะกระสุนนัดนี้ (ไม่ใส่ = SHOT_SPEED ปกติ)
        // มีไว้ทำมุมดิ่ง: ถ้าความเร็วแนวนอนคงที่เสมอ กระสุนที่ตั้ง vy สูงแค่ไหนก็ยัง
        // เฉียงอยู่ดี — `dair` ที่ตั้ง vy 8 ทำมุมได้แค่ 32 องศา ซึ่งลงไม่ถึงคนที่อยู่ใต้ตัว
        vx: dir * (spec.speed ?? SHOT_SPEED), vy: spec.vy, facing: dir,
        dmg: m.shotDmg, stun: m.shotStun, kb: m.shotKb ?? 2, volley, range: m.shotRange ?? SHOT_RANGE,
      pierce: !!m.pierce,
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

      // เดิมเขียนว่า "อีกคนนึง" ซึ่งพอมีสี่คนจะเล็งผิดตัวทั้งหมด
      // หาศัตรูคนแรกในลิสต์ที่กระสุนทะลุตัวอยู่จริง — เรียงตามลิสต์ สองเครื่องจึงได้คนเดียวกัน
      const owner = this.fighterById(sh.owner);
      const inside = (t) => {
        const h = t.hurtbox();
        return sh.x > h.x && sh.x < h.x + h.w && sh.y > h.y && sh.y < h.y + h.h;
      };
      const foe = this.fighters.find((t) => (!owner || t.team !== owner.team) && inside(t))
        ?? this.fighters.find((t) => !owner || t.team !== owner.team);
      const hit = !!foe && inside(foe);
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
      // กระสุนทะลุ: ไม่ตายตอนโดน วิ่งต่อไปจนสุดระยะหรือชนกำแพง
      // sh.volley.hit กันโดนซ้ำคนเดิมอยู่แล้ว จึงไม่ต้องเขียนอะไรเพิ่มเพื่อกันดาเมจซ้อน
      } else if (!sh.pierce || wall || spent) sh.dead = true;
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

  /** อัลติของ KUNJAE — ปักหางลงดิน หนามผุดวิ่งออกจากตัวเธอทั้งสองข้าง
   *
   *  **ไม่โผล่พรึบเดียว** แต่ไล่ออกไปต้นละ `each` เฟรม คนที่ยืนไกลจึงเห็นคลื่นวิ่งมา
   *  แล้วตัดสินใจทัน = กติกาที่มองเห็น ไม่ใช่กับดัก (กฎเดียวกับวงดูดของ METEOR)
   *
   *  ทั้งสองข้างออกพร้อมกัน ท่านี้จึงไม่ต้องหันหน้าถูกทาง — ต่างจากท่าอื่นทั้งหมดของเธอ
   *  ซึ่งสำคัญตอนเล่น 4 คนที่มีคนขนาบสองข้าง
   *
   *  หนามแต่ละต้นเป็น `blast()` วงแคบ ๆ ที่ตำแหน่งของมัน จึงได้เรื่องทีม/การ์ด/เกราะ/
   *  วงฝุ่นมาครบโดยไม่ต้องเขียนใหม่ และ `kb` ยกขึ้นเบา ๆ ให้ต้นถัดไปรับต่อเป็นลูกโซ่
   *  แต่ไม่สูงพอจะลอยพ้นต้นถัดไป — ตั้งใจให้เป็นอย่างนั้น
   */
  tickQuills(f, q) {
    const step = f.moveF - q.at;
    if (step < 0 || step % q.each !== 0) return;
    const i = step / q.each;
    if (i >= q.n) return;
    const dist = (i + 1) * q.gap;
    for (const dir of [1, -1]) {
      const x = f.x + dir * dist;
      if (x < STAGE.wallL || x > STAGE.wallR) continue;
      this.events.push({ type: 'quill', x, y: STAGE.groundY, i, n: q.n });
      // **ครึ่งความกว้างต้องมากกว่าครึ่งระยะห่าง** ไม่งั้นแนวหนามมีช่องโหว่ระหว่างต้น
      // ตอนแรกตั้งไว้ 0.45 ของระยะห่าง (36 px จากระยะ 80) ซึ่งเหลือช่องว่าง 8 px ทุกช่วง
      // วัดจริงแล้วคนที่ยืนกลางช่องโดนแค่ต้นเดียวตลอด แนวหนามที่มีรูคือแนวที่อ่านไม่ออก
      this.blast(x, Math.round(q.gap * 0.53), q.dmg, q.stun, q.kb, f.id, f.id, QUILL_UP, true);
    }
  }

  /** ระเบิดวงกลม — คืนจำนวน "คู่ต่อสู้" ที่โดนจริง (ไม่นับเจ้าของ)
   *
   *  เจ้าของระเบิด **โดนแรงกระแทกแต่ไม่เสียเลือด**
   *  เดิมไม่มีการเช็คเจ้าของเลย ระเบิดจึงหักเลือดใครก็ได้ที่ยืนอยู่ในวง รวมคนวางเอง
   *
   *  ที่ยังให้โดนแรงกระแทกอยู่ เพราะถ้าเอาออกหมดจะกลายเป็นของฟรี — ระเบิดวางทิ้งไว้ได้
   *  โดยไม่ต้องคิดว่าตัวเองยืนตรงไหน และที่แย่กว่านั้นคือ **เอาระเบิดตัวเองดีดหนี**ได้
   *  โดนดีดลอยกลางวงคือเสียตำแหน่งและโดนสวนได้ ซึ่งเป็นราคาที่จ่ายจริง แค่ไม่ใช่เลือด
   *
   *  ชะงักครึ่งเดียว (`SELF_STUN`) ไม่ใช่เต็ม — อัลติโปรยได้ถึง 9 ไห ถ้าชะงักเต็มทุกใบ
   *  เขาจะถูกล็อกด้วยท่าตัวเองจนคู่ต่อสู้เดินเล่นได้สบาย
   */
  blast(x, half, dmg, stun, kb, owner = null, skip = null, maxUp = null, quiet = false) {
    const skipIds = skip === null ? null : (Array.isArray(skip) ? skip : [skip]);
    // `quiet` = ไม่ต้องส่งอีเวนต์ภาพ ผู้เรียกวาดเอง
    //
    // **หนามของ KUNJAE ยิง blast() สิบครั้งในยี่สิบเฟรม** ถ้าทุกครั้งส่งอีเวนต์ `blast`
    // ฉากจะวาดระเบิดลูกโต + จอสั่น + ควันห้าก้อน สิบชุดซ้อนกัน = จอขาวโพลนทั้งจอ
    // มองไม่เห็นทั้งตัวละครและหนามเลย (วัดจริงในเบราว์เซอร์ก่อนแก้)
    if (!quiet) this.events.push({ type: 'blast', x, y: STAGE.groundY, r: half });
    // ทั้งทีมของเจ้าของโดนแรงกระแทกแต่ไม่เสียเลือด ไม่ใช่แค่ตัวเจ้าของ
    // เขายังเขี่ยเพื่อนตกเวทีด้วยระเบิดตัวเองได้ แค่ไม่ได้ฆ่าเขา
    const ownerTeam = owner === null ? null : (this.fighterById(owner)?.team ?? null);
    let hitFoes = 0;
    for (const f of this.fighters) {
      // skip = คนที่ไม่ต้องคิดในวงนี้เลย (หนามข้ามเจ้าของ)
      if (f.invuln > 0 || skipIds?.includes(f.id) || Math.abs(f.x - x) > half) continue;
      // `maxUp` = สูงเกินนี้เหนือพื้นแล้วรอด · ไม่ส่งมา = ไม่จำกัดความสูง (พฤติกรรมเดิมของหม้อ)
      //
      // **หนามของ KUNJAE ต้องมีเพดาน ไม่งั้นทั้งดีไซน์พัง** ทางรอดจากอัลติคือการลอยอยู่
      // และขั้นที่ 2 ของบันได (ทุบลงพื้นแล้วกระโดดไม่ได้) มีอยู่เพื่อปิดทางรอดนั้นพอดี
      // ถ้าหนามโดนคนที่ลอยอยู่ด้วย ขั้น 2 ก็ไม่มีเหตุผล และอัลติก็กลายเป็นปุ่มกดโดนฟรี
      if (maxUp !== null && f.y < STAGE.groundY - maxUp) continue;
      const dir = f.x >= x ? 1 : -1;
      if (owner !== null && ownerTeam !== null && f.team === ownerTeam) {
        f.stun = Math.max(f.stun, Math.round(stun * SELF_STUN));
        f.move = null; f.moveId = null; f.setState('hitstun');
        f.stanceUntil = -9999;
        f.vx = dir * kb[0]; f.vy = kb[1];
        if (kb[1] < 0) f.onGround = false;
        f.hitstop = 3;
        this.events.push({ type: 'hit', x: f.x, y: f.y - 70, dmg: 0, self: true, launch: kb[1] < 0 });
        continue;
      }
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
      // ระเบิดแช่เฉพาะคนที่โดน ไม่แช่ทั้งจอ — ระเบิดลูกเดียวอาจโดนสองคนคนละจังหวะ
      f.hitstop = Math.round(dmg * 0.8) + 3;
      this.gainKi(f, real * 0.9);
      hitFoes++;
      this.events.push({ type: 'hit', x: f.x, y: f.y - 70, dmg: real, heavy: true, launch: kb[1] < 0 });
    }
    return hitFoes;
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
      // กองไฟตอดทุกศัตรูที่ยืนอยู่ในนั้น ไม่ใช่แค่คนเดียว — เดิมเขียนว่า "อีกคนนึง"
      const fo = this.fighterById(fire.owner);
      for (const d of this.fighters) {
      if (fo && d.team === fo.team) continue;          // ไฟของเราไม่ไหม้พวกเรา
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
    }
    this.fires = this.fires.filter((fi) => fi.life > 0);
  }

  hitByShot(sh, d) {
    // เดิมเขียนเป็น `sh.owner === 'p1' ? this.p1 : this.p2` ซึ่งถูกเฉพาะตอนเล่นสองคน
    // เล่นสี่คนแล้วกระสุนของ p3/p4 จะถูกเครดิตให้ p2 ทั้งคี (ได้ ki ฟรี · เกราะคิดผิดตัว)
    const a = this.fighterById(sh.owner) ?? this.p2;
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
    // กระสุนเดิมไม่มี hitstop เลย ยิงโดนแล้วไม่รู้สึกว่าโดน — สั้นกว่าท่าประชิดเพราะยิงรัวได้
    a.hitstop = d.hitstop = Math.max(2, Math.round(sh.dmg * 0.9));
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
    // ตอกหมุด: กันแค่ "กระโดด" ไม่กันการพุ่งแนวนอน — กันหมดคือปิดตัวละครทั้งดุ้น
    // ซึ่งขัดกฎที่ใช้มาทั้งโปรเจกต์ว่าต้องมีทางดิ้นเสมอ (ดู docs/ALECTO_KIT.md)
    if (f.pinned > 0) return false;
    if (f.onGround || f.coyote > 0) {
      f.vy = PHYS.jumpV; f.onGround = false; f.coyote = 0;
    } else if (f.jumpsLeft > 0 || (f.boostJump && f.boost > 0)) {
      // DEAR: ดับเบิลจัมพ์หมดแล้วยังกระโดดต่อได้ ถ้ายังมีไอพ่นเหลือ — กินขีดละครั้ง
      // ไม่ใช่ปุ่มใหม่ ใช้ปุ่มกระโดดเดิม ต่อเมื่อไม่มีอย่างอื่นให้ใช้แล้วเท่านั้น
      if (f.jumpsLeft > 0) f.jumpsLeft--;
      else if (!this.spendBoost(f)) return false;
      f.vy = PHYS.dJumpV;
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
      // โอเวอร์คล็อก = แขนล็อกอยู่โหมดโจมตี **กันไม่ได้เลย** ซึ่งเป็นราคาของเกราะที่ได้มา
      // เกราะที่ไม่มีราคาคือบัฟฟรี และกดแล้วไม่มีทางถอยคือสิ่งที่ทำให้สกิลนี้บู๊
      if (inp.block && f.overclock <= 0) { f.setState(inp.down ? 'blockcrouch' : 'block'); f.vx *= PHYS.stopFric; return; }
      if (inp.down) { f.setState('crouch'); f.vx *= PHYS.stopFric; return; }
      if (dir !== 0) {
        f.facing = dir;
        const target = dir * (running ? PHYS.run : PHYS.walk);
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

  /** สมองของเพื่อน AI — คืน **อินพุตหนึ่งเฟรม** เหมือนที่คนกด ไม่ใช่ไปยัดสถานะตรง ๆ
   *
   *  เดินผ่านทางเดียวกับผู้เล่นจริงทุกขั้น (takeInput → controlPlayer → physics → advanceMove)
   *  ข้อดีคือ **AI ทำอะไรที่คนทำไม่ได้ไม่ได้เลย** — ไม่มีท่าพิเศษ ไม่ข้ามคูลดาวน์ ไม่เดินเร็วกว่า
   *  และไม่ต้องก๊อปตรรกะการเคลื่อนที่มาไว้อีกที่ให้แก้สองที่ทุกครั้ง
   *
   *  **ห้ามสุ่มและห้ามอ่านเวลาจริง** AI อยู่ในซิม สองเครื่องต้องคิดตรงกันเป๊ะ
   *  ความหลากหลายมาจาก aiRoll(เลขเฟรม, ไอดี) ซึ่งคงที่และต่างกันต่อคน
   *
   *  คิดใหม่ทุก AI.think เฟรม ระหว่างนั้นถือแผนเดิม = เวลาตอบสนองของ AI
   *  คิดใหม่ทุกเฟรมจะอ่านเกมได้สมบูรณ์แบบ ซึ่งเล่นด้วยแล้วไม่สนุก
   */
  aiInput(f) {
    const inp = blankInput();
    const e = this.foe(f);
    if (!e) return inp;

    const seed = this.fighters.indexOf(f) + 1;
    if (this.frame >= f.aiNext) {
      f.aiNext = this.frame + AI.think;
      f.aiPlan = this.aiPlan(f, e, seed);
    }
    const plan = f.aiPlan;
    if (!plan) return inp;

    const dx = e.x - f.x, adx = Math.abs(dx);
    // ทิศเดินคิดสดทุกเฟรม ไม่ใช่ตอนคิดแผน — ไม่งั้นวิ่งเลยตัวไปแล้วยังวิ่งต่ออีกหลายเฟรม
    if (plan.move === 'in' && adx > AI.backoff) { if (dx > 0) inp.right = 1; else inp.left = 1; }
    if (plan.move === 'out' && adx < AI.chase) { if (dx > 0) inp.left = 1; else inp.right = 1; }

    // ปุ่มที่ "กดค้าง" ถือไว้ตลอดแผน ส่วนปุ่มที่ "กดติ๊ง" กดเฟรมเดียวตอนเริ่มแผน
    if (plan.block) inp.block = 1;
    const fresh = this.frame === f.aiNext - AI.think;
    if (fresh) {
      if (plan.jump) inp.p.jump = 1;
      if (plan.attack) { inp.attack = 1; inp.p.attack = 1; }
      if (plan.skill) { inp[plan.skill] = 1; inp.p[plan.skill] = 1; }
      if (plan.aim === 'up') inp.up = 1;
      if (plan.aim === 'down') inp.down = 1;
    }
    if (plan.jump && !fresh && !f.onGround) inp.jump = 1;   // ถือปุ่มต่อ = กระโดดสูงเต็ม
    return inp;
  }

  /** ตัดสินใจหนึ่งครั้ง — เรียกทุก AI.think เฟรม ไม่ใช่ทุกเฟรม */
  aiPlan(f, e, seed) {
    const r = (n) => aiRoll(this.frame + n * 131, seed);
    const dx = e.x - f.x, adx = Math.abs(dx);
    const above = f.y - e.y;            // ศัตรูสูงกว่าเราเท่าไหร่
    const plan = { move: 'in', block: false, jump: false, attack: false, skill: null, aim: null };

    // ล้มอยู่/ติดสตันอยู่ ไม่ต้องคิดอะไร รอฟื้นก่อน
    if (!ACTIONABLE.has(f.state)) return plan;

    // ศัตรูอยู่สูงกว่ามากและเราอยู่พื้น — กระโดดขึ้นไปหา ไม่ใช่ยืนต๊อง ๆ ข้างล่าง
    if (above > AI.climb && f.onGround && adx < AI.chase) { plan.jump = true; plan.aim = 'up'; return plan; }

    // ไกลมาก: วิ่งเข้าหาอย่างเดียว ไม่ต้องคิดเรื่องตีหรือกัน
    if (adx > AI.chase) { plan.move = 'in'; return plan; }

    // ศัตรูกำลังออกท่าและเราอยู่ในระยะที่โดนได้ — ยกการ์ด
    if (e.state === 'attack' && adx < AI.reach + 40 && r(1) < AI.block) {
      plan.block = true; plan.move = 'none';
      return plan;
    }

    // ใกล้เกินจนออกท่าไม่ถนัด ถอยนิดหนึ่ง
    if (adx < AI.backoff) { plan.move = 'out'; return plan; }

    if (adx <= AI.reach) {
      // สกิลก่อน ถ้าพร้อมและถึงคิว — ช่องอัลติต้อง ki เต็ม
      const pick = this.aiSkill(f, r(2));
      if (pick && r(3) < AI.skill) { plan.skill = pick; plan.move = 'none'; return plan; }
      if (r(4) < AI.attack) {
        plan.attack = true; plan.move = 'none';
        // เล็งขึ้นถ้าศัตรูลอยอยู่ เล็งลงถ้าเราลอยอยู่เหนือเขา
        if (above > 40) plan.aim = 'up';
        else if (!f.onGround && above < -20) plan.aim = 'down';
        return plan;
      }
      plan.move = r(5) < 0.5 ? 'none' : 'out';   // ไม่ตีก็อย่ายืนนิ่ง เดินยั่วไปมา
      return plan;
    }

    plan.move = 'in';
    if (r(6) < AI.jump) plan.jump = true;
    return plan;
  }

  /** ช่องสกิลที่พร้อมใช้ — คืนชื่อปุ่มหรือ null · ไล่จากช่องท้ายไปหน้า ท่าใหญ่ได้ออกก่อน */
  aiSkill(f, roll) {
    const ready = [];
    for (let i = f.skills.length - 1; i >= 0; i--) {
      if (!f.skills[i] || f.cd[i] > 0) continue;
      const m = f.moves[f.skills[i]];
      if (m?.ki && f.ki < KI_MAX * AI.ultKi) continue;
      ready.push('skill' + (i + 1));
    }
    if (!ready.length) return null;
    return ready[Math.floor(roll * ready.length) % ready.length];
  }

  controlDummy(f) {
    const p = this.foe(f) ?? this.p1;
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
      if (m.imp.vy !== undefined) {
        f.vy = m.imp.vy;
        // แรงส่งขึ้นต้องพาตัวหลุดพื้นด้วย ไม่งั้นบรรทัดจัดการพื้นข้างล่างจะล้าง vy ทิ้งทันที
        // แล้วท่าที่ "พุ่งขึ้น" จะยืนอยู่กับที่เฉย ๆ (เจอตอนทำอัลติของ DEAR)
        if (m.imp.vy < 0) { f.onGround = false; f.coyote = 0; }
      }
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
    // ghost = ท่าที่ "ทะลุชานได้" — อัลติ METEOR ที่พุ่งขึ้นแล้วดิ่งลง ต้องจบที่พื้นจริงเสมอ
    // ถ้าปล่อยให้ชานรับไว้ ท่าจะถูกยกเลิกกลางอากาศแล้วอัลติหายไปทั้งดุ้น (แพ้ตรงที่ยืนกดพอดี)
    // อีกอย่าง คลื่นตามพื้นวัดจาก STAGE.groundY อยู่แล้ว ลงกลางอากาศจึงเป็นภาพที่ไม่ตรงกับผล
    else if (f.vy >= 0 && f.dropT === 0 && !f.move?.ghost) {
      for (const pl of STAGE.platforms) {
        if (f.x >= pl.x1 && f.x <= pl.x2 && prevY <= pl.y && f.y >= pl.y) { f.y = pl.y; f.onGround = true; break; }
      }
    }
    if (f.onGround) {
      if (!wasGround) this.onLand(f, prevY);
      /* **ต้องถาม onGround ซ้ำ** — `onLand` เด้งคนที่โดนตบกลับขึ้นไปได้ (ดู f.bouncePend)
       * ซึ่งมันตั้ง vy ติดลบแล้วปลด onGround ทิ้ง แต่บล็อกนี้เข้ามาแล้วและไม่ได้หยุด
       * บรรทัด `f.vy = 0` ข้างล่างจึงล้างแรงเด้งทิ้งทุกครั้ง **การเด้งจึงไม่เคยเกิดขึ้นจริง**
       * คนโดนค้างอยู่ที่พื้นแล้วตกกลับเข้า knockdown + อมตะในเฟรมถัดไป
       * ซึ่งแปลว่าคำโฆษณาในคอมเมนต์ของ sky5 ("ตบลงพื้นแล้วคอมโบต่อได้") ตายมาตลอด */
      if (f.onGround) {
        f.vy = 0; f.jumpsLeft = 1;
        // แตะพื้น = เติมไอพ่นเต็มและล้างเพดานต่อช่วงลอย
        // ไม่มีทางตันแน่นอน: ต่อให้พลาดทุกหมัด ลงพื้นแล้วก็ได้ของครบกลับมา
        if (f.boostJump) { f.boost = BOOST_MAX; f.boostGain = 0; }
      }
    } else if (wasGround && f.vy >= 0) {
      f.coyote = PHYS.coyote; // walked off a ledge
      if (ACTIONABLE.has(f.state)) f.setState('air');
    }
  }

  onLand(f) {
    this.events.push({ type: 'land', x: f.x, y: f.y, hard: f.vy > 12 });
    if (f.state === 'hitstun') {
      /* เด้งพื้น — กระจกเงาของการเด้งกำแพงข้างบน (ดู f.wallBounced)
       *
       * **ข้อนี้คือสิ่งเดียวที่ทำให้ "ตบลงพื้นแล้วคอมโบต่อ" เป็นไปได้**
       * ปกติคนที่ตกถึงพื้นตอนติด hitstun จะเข้า knockdown แล้วได้อมตะ 30 เฟรมทันที
       * ซึ่งแปลว่าท่าตบลงพื้นทุกท่าในเกม **จบคอมโบเสมอ** ไม่ว่าจะออกแบบท่ายังไง
       *
       * เด้งได้ครั้งเดียวต่อหนึ่งคอมโบ (ล้างธงพร้อม wallBounced ตอน comboEnd)
       * ไม่งั้นจะวนตบ-เด้ง-ตบ-เด้งไม่รู้จบ ซึ่งสเกลลดดาเมจตามคอมโบกันไว้ชั้นเดียวไม่พอ
       */
      if (f.bouncePend && !f.bounced) {
        f.bouncePend = 0; f.bounced = true;
        f.vy = BOUNCE_VY; f.vx *= BOUNCE_VX_KEEP; f.onGround = false;
        f.stun += BOUNCE_STUN;
        f.techBuf = 0; f.techLock = 0;
        this.events.push({ type: 'bounce', x: f.x, y: f.y });
        return;
      }
      f.bouncePend = 0;
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
      // ท่าที่ "ทุบตอนแตะพื้น" ต้องทุบตรงนี้ ไม่ใช่รอให้ advanceMove เห็น onGround ในเฟรมถัดไป —
      // เพราะบรรทัดล่างล้าง f.move ทิ้งในเฟรมเดียวกัน ท่าจึงจบก่อนที่คลื่นจะได้ออก
      if (f.move.slam?.onLand && !f.slammed) { f.slammed = 1; this.slam(f, f.move.slam); }
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
      if (m.quills) this.tickQuills(f, m.quills);
      /* หมัดรัว — ปล่อยอีเวนต์ทุก m.flurry เฟรม **ตลอดท่า ไม่ใช่เฉพาะช่วง active**
       * ช่วง active ของไม้รัวยาวแค่ 3 เฟรมจาก 7 ถ้าปล่อยเฉพาะตอนนั้นจะเห็นเป็นหมัดเป็นชุด ๆ
       * ห่างกันเป็นจังหวะ ซึ่งตรงข้ามกับสิ่งที่ท่านี้ควรให้ความรู้สึก (กำแพงหมัดไม่มีช่องว่าง)
       * ตัวเลขที่ส่งไปคือ `f.fxN` ซึ่งเดินทีละหนึ่ง**ต่อหนึ่งอีเวนต์** ไม่ใช่ `f.moveF`
       * (รีเซ็ตทุกไม้ 7 เฟรม จึงวนแค่สามค่า ซ้ำรอยเดิมทุกไม้) และไม่ใช่ `this.frame` ด้วย
       * — อีเวนต์ถูกปล่อยเฟรมเว้นเฟรม ถ้าฝั่งวาดคัดด้วย `% 4 === 2` บนเลขเฟรม
       * มันอาจไม่ตรงกับจังหวะที่ปล่อยเลยสักครั้ง (คู่/คี่ไม่ตรงกันค้างทั้งชุด) */
      if (m.flurry && f.moveF % m.flurry === 0)
        this.events.push({ type: 'flurry', x: f.x, y: f.y, dir: f.facing, id: f.id, i: f.fxN++ });
      // trail = ทิ้งกองไฟไว้ตรงที่ยืนเป็นระยะ ๆ ยิ่งเดินยิ่งเขียนกำแพงไฟทิ้งไว้
      if (m.trail && f.moveF % m.trail === 0) this.spawnFire(f, { dx: 0, burns: true });
      if (m.dustPool && f.moveF === m.dustPool.at) {
        this.dust = { x: f.x, owner: f.id, life: DUST_LIFE };
        this.events.push({ type: 'dust', x: f.x, y: STAGE.groundY });
      }
      if (m.overclock && f.moveF === m.overclock.at) this.startOverclock(f, m.overclock.frames);
      // คว้าได้ตลอดช่วง active ไม่ใช่เฟรมเดียว — ไถผ่านใครก็ติดคนนั้น ซึ่งคือความหมายของท่า
      // ท่าไถ (สกิล 1) คว้าได้ตลอดช่วง active — ไถผ่านใครก็ติดคนนั้น ซึ่งคือความหมายของท่า
      // ท่าดูดด้วยระยะ (อัลติ) ดูดครั้งเดียวที่เฟรมแรกของ active ตอนยังยืนอยู่ที่เดิม
      // ถ้าปล่อยให้ดูดตลอดช่วง วงจะไต่ขึ้นไปพร้อมตัวจนคนบนชั้น 3 โดนด้วย = ไม่มีทางหนีจริง
      // และ "ระยะที่กำหนด" จะกลายเป็นค่าที่อ่านจากจอไม่ได้ เพราะมันขยับทุกเฟรม
      if (m.carry && (m.carry.range ? f.moveF === m.startup : f.phase() === 'active'))
        this.startCarry(f, m.carry);
      // ทุบพื้น: ท่าที่ระบุเฟรม (drag2) ทุบตอนนั้น · ท่าที่ระบุ onLand (meteor3) รอแตะพื้นก่อน
      if (m.slam && !f.slammed && (m.slam.onLand ? f.onGround : f.moveF === m.slam.at)) {
        f.slammed = 1;
        this.slam(f, m.slam);
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
        // airChain ปลดเงื่อนไข onGround ให้ทั้ง onHit และ autoChain — ชุดที่ตั้งใจเล่นกลางอากาศ
        // ต้องต่อได้ทั้งสองทาง ไม่งั้นชุดที่ "ต่อเฉพาะตอนตีโดน" จะขาดกลางคันแบบเงียบ ๆ
        if (m.onHit && (f.onGround || m.airChain) && f.hitConfirmed) { this.startMove(f, m.onHit, f.facing); return; }
        // ท่าที่มี autoChain ต่อท่าถัดไปเองโดยไม่ต้องกดซ้ำ — ใช้ทำคอมโบสกิลกดครั้งเดียวจบชุด
        // ต่อเฉพาะตอนยังยืนอยู่บนพื้น ถ้าโดนตีจนหลุด state หรือตกลงมา คอมโบก็ขาดตามธรรมชาติ
        //
        // ยกเว้นท่าที่ติดธง airChain ไว้ — ชุดที่ "ตั้งใจให้เล่นกลางอากาศ" อย่างอัลติ METEOR
        // ที่พาตัวเองลอยขึ้นไปแล้วต่อท่าบนฟ้า ถ้าใช้กติกาพื้นมันจะขาดทันทีที่เท้าลอย
        if (m.autoChain && (f.onGround || m.airChain)) { this.startMove(f, m.autoChain, f.facing); return; }
        f.move = null; f.moveId = null; f.used.clear();
        f.setState(f.onGround ? 'idle' : 'air');
      }
    } else if (f.state === 'hitstun' || f.state === 'blockstun' || f.state === 'knockdown' || f.state === 'landing' || f.state === 'tech' || f.state === 'techroll') {
      f.stun--;
      if (f.stun <= 0) { if (f.state === 'techroll') f.vx = 0; f.setState(f.onGround ? 'idle' : 'air'); }
    }
  }

  resolveHit(a, d) {
    // ท่าที่เล็งใส่คนทะลุเพื่อนร่วมทีมไปเลย — แย็บพลาดแล้วไปขัดคอมโบเพื่อน
    // คือความทรมานที่ไม่ได้เพิ่มอะไรให้เกม ต่างจากของที่วางไว้ในโลกซึ่งผลักทุกคน
    if (this.sameTeam(a, d)) return;
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
    // โอเวอร์คล็อกแรงขึ้นทุกหมัดที่โดนตรง ๆ **แต่ไม่รวมการทุบพื้น** ซึ่งเดินผ่าน hurt() คนละทาง
    // ตั้งใจแยกแบบนี้: กดบัฟแล้วกดอัลติทันทีต้องไม่ใช่สูตรตายตัวที่คิดเลขครั้งเดียวจบ
    const over = a.overclock > 0 ? OVERCLOCK_DMG : 1;
    const dmg = Math.max(1, Math.round(m.dmg * scale * over * (d.dustGuard ? DUST_DR : 1)));
    // เกราะกินไว้: เจ็บลดลง ไม่เข้า hitstun ท่าของเขาเดินต่อ
    if (this.armorHolds(d)) { this.takeArmored(a, d, dmg, fx, fy); return; }
    d.hp = Math.max(0, d.hp - dmg);
    if (a.boostJump) this.gainBoost(a);            // ต่อยโดน = เติมน้ำมัน (ดู gainBoost)
    d.comboHits++; d.comboDmg += dmg; d.lastHitF = this.frame;
    d.stun = Math.round(m.stun * Math.max(0.55, 1 - 0.05 * (d.comboHits - 1)));
    d.move = null; d.moveId = null; d.setState('hitstun');
    d.stanceUntil = -9999;          // ยืนยิงอยู่แล้วโดนสวน = ป้อมแตก นี่คือทางแก้ของอีกฝ่าย
    d.vx = a.facing * m.kb[0];
    if (m.kb[1] < 0 || !d.onGround) { d.vy = m.kb[1] || -2; d.onGround = false; }
    // ท่าที่ตบลงพื้น: จำไว้ว่าคนนี้ "จะเด้ง" ตอนแตะพื้น (ดู onLand)
    // เก็บเป็นธงที่ตัวคนโดน ไม่ใช่ที่ตัวคนตี เพราะกว่าจะถึงพื้นคนตีอาจเปลี่ยนท่าไปแล้ว
    if (m.bounce) d.bouncePend = 1;
    // ตอกหมุด: ติดสถานะเฉพาะคนที่ลอยอยู่ตอนโดน — โดนตอนยืนพื้นก็เป็นท่าหางธรรมดา
    // เพราะประเด็นของท่าคือ "ลงโทษการอยู่บนฟ้า" ไม่ใช่ "ล็อกเท้าใครก็ได้"
    // **ติดไม่ว่าเขาจะอยู่บนพื้นหรือลอยอยู่** เดิมเงื่อนไขเป็น `&& !d.onGround` ซึ่งถูก
    // สำหรับท่าตอกหมุดเก่าที่เป็นไม้สวนคนกระโดดโดยเฉพาะ แต่ผิดสำหรับ `slam1` ของชุดใหม่
    // ที่มีหน้าที่ "ตรึงเขาไว้กับพื้นก่อนปักหาง" — ถ้าติดเฉพาะคนที่ลอยอยู่ บันไดสามขั้น
    // จะขาดตรงกลางพอดี (ตะขอลากเข้ามาแล้วเขายืนพื้น -> ทุบไม่ติดสถานะ -> กระโดดพ้นหนาม)
    if (m.pin) {
      d.pinned = m.pin;
      this.events.push({ type: 'pin', x: d.x, y: d.y, frames: m.pin });
    }
    d.facing = -a.facing;
    const hs = hitstopFor(m);
    a.hitstop = d.hitstop = hs;
    if (m.pogo) { a.vy = m.pogo; a.move = null; a.moveId = null; a.setState('air'); a.jumpsLeft = 1; }
    // หลอดอัลติเติมจากทั้งฝั่งที่ตีและฝั่งที่โดน — ฝั่งที่โดนรัวจึงมีทางสวนกลับ ไม่ใช่แพ้ทางอย่างเดียว
    this.gainKi(a, dmg * 1.4); this.gainKi(d, dmg * 0.9);
    this.events.push({ type: 'hit', x: fx, y: fy, dmg, heavy: m.dmg >= 6, launch: m.kb[1] < -10, hs });
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
      d.comboHits = 0; d.comboDmg = 0; d.wallBounced = false; d.bounced = false; d.bouncePend = 0;
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
