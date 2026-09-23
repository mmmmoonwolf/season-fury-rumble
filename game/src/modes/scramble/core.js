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
    hb: { x: 0, y: 0, w: 0, h: 0 }, kb: [0, 0], stun: 0, noHit: true,
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
 * ทะเบียนตัวละคร (ฝั่ง sim) — ตารางท่า/สกิล/คูลดาวน์ แยกต่อตัว
 *
 * ทุกตัวใช้ "ชื่อท่า" ชุดเดียวกัน (jab1 / side / up / down / nair / sair / dair)
 * แต่ค่าเฟรมเดต้าเป็นของใครของมัน — pickMove() จึงไม่ต้องรู้ว่ากำลังเล่นตัวไหน
 * ส่วนอาร์ต (atlas / animation / รายชื่อท่าที่มีอาร์ตแล้ว) อยู่ฝั่งฉากใน ScrambleScene.js
 * เพราะ core.js ตั้งใจไม่แตะ Phaser เลย จะได้เดินเทสต์ใน node ตรง ๆ ได้
 */
const CHARACTERS = {
  nyx: { id: 'nyx', label: 'NYX', moves: MOVES, skills: SKILLS, skillCd: SKILL_CD },
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
    this.maxHp = 100; this.reset();
  }
  /** ตารางท่าของตัวละครตัวนี้ — ชื่อท่าเหมือนกันทุกตัว ค่าเฟรมเดต้าเป็นของใครของมัน */
  get moves() { return CHARACTERS[this.char].moves; }
  get skills() { return CHARACTERS[this.char].skills; }
  get skillCd() { return CHARACTERS[this.char].skillCd; }
  reset() {
    Object.assign(this, {
      x: this.spawnX, y: STAGE.groundY, vx: 0, vy: 0, facing: this.spawnFacing,
      onGround: true, state: 'idle', stateF: 0, jumpsLeft: 1, coyote: 0, dropT: 0,
      move: null, moveId: null, moveF: 0, hitList: new Set(), hitConfirmed: false, used: new Set(),
      hp: this.maxHp, stun: 0, hitstop: 0, invuln: 0, lastHitF: -9999, cd: [0, 0, 0], ki: 0,
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
    this.p1 = new Fighter('p1', 'NYX', 420 + shift, 1);
    this.p2 = new Fighter('p2', 'DUMMY', 860 + shift, -1);
    this.dummyMode = 'stand';
    this.dummyTech = 'off';
    this.lastInp = null;
    this.events = [];
    this.buf = { attack: 0, jump: 0, skill1: 0, skill2: 0, skill3: 0 };
    this.lastTap = { dir: 0, f: -99 };
    this.dashLatch = false;
    this.meter = []; this.meterIdle = 0;
    this.lastMoveInfo = null;
    this.shots = [];
  }
  resetPositions() { this.p1.reset(); this.p2.reset(); this.meter = []; this.shots = []; }

  step(inp) {
    this.frame++; this.events = [];
    const p = this.p1, d = this.p2;
    if (inp.p.attack) this.buf.attack = PHYS.buffer + 1;
    if (inp.p.jump) this.buf.jump = PHYS.buffer + 1;
    for (let i = 1; i <= 3; i++) if (inp.p['skill' + i]) this.buf['skill' + i] = PHYS.buffer + 1;

    this.lastInp = inp;
    // tech input: press Block while airborne; missing the window locks you out briefly (anti-mash)
    if (inp.p.block && !p.onGround && p.techLock === 0) { p.techBuf = PHYS.techWindow; p.techLock = PHYS.techLockout; }
    if (p.hitstop > 0) p.hitstop--; else {
      if (p.techBuf > 0) p.techBuf--;
      if (p.techLock > 0) p.techLock--;
      this.controlPlayer(p, inp); this.physics(p, inp); this.advanceMove(p, inp);
      // input buffer only ages while the player is not frozen in hitstop
      if (this.buf.attack > 0) this.buf.attack--;
      if (this.buf.jump > 0) this.buf.jump--;
      for (let i = 1; i <= 3; i++) if (this.buf['skill' + i] > 0) this.buf['skill' + i]--;
    }
    if (d.hitstop > 0) d.hitstop--; else { this.controlDummy(d); this.physics(d, null); this.advanceMove(d, null); }

    if (p.hitstop <= 0 && d.hitstop <= 0) this.updateShots();
    this.resolveHit(p, d);
    this.resolveHit(d, p);
    this.pushApart(p, d);
    this.updateCombo(d);
    this.recordMeter(p);
    if (this.frame - d.lastHitF > 120 && d.hp < d.maxHp && ACTIONABLE.has(d.state)) d.hp = d.maxHp;
  }

  buffered(key) { return this.buf[key] > 0; }
  consume(key) { this.buf[key] = 0; }

  pickMove(f, inp) {
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
    if (mv.warp) this.warp(f);
    if (mv.warpAnchor) this.warpToAnchor(f);
    if (mv.faceFoe) this.faceFoe(f);
    f.move = mv; f.moveId = id; f.moveF = 0;
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
      const sh = {
        owner: f.id, x: f.x + f.facing * 30, y: f.y - 96,
        vx: f.facing * SHOT_SPEED, vy: spec.vy, facing: f.facing,
        dmg: m.shotDmg, stun: m.shotStun, volley,
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
      const spent = sh.travelled >= SHOT_RANGE;
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
    const dmg = Math.max(1, Math.round(sh.dmg * scale));
    d.hp = Math.max(0, d.hp - dmg);
    d.comboHits++; d.comboDmg += dmg; d.lastHitF = this.frame;
    d.stun = Math.round(sh.stun * Math.max(0.55, 1 - 0.05 * (d.comboHits - 1)));
    d.move = null; d.moveId = null; d.setState('hitstun');
    d.vx = sh.facing * 2;                 // ถีบเบา ๆ ไม่ลอย จะได้ตามไปต่อคอมโบได้
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
    const follow = f.skills[i] && f.moves[f.skills[i]].shots && this.anchorOf(f) ? 'curse2' : null;
    if (follow) { this.startMove(f, follow, dir || f.facing); return; }
    if (i === 2) { f.ki = 0; this.events.push({ type: 'ult', x: f.x, y: f.y - 60 }); }
    else f.cd[i] = f.skillCd[i];
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
      this.dashLatch = this.lastTap.dir === tapDir && this.frame - this.lastTap.f <= PHYS.dashWindow;
      this.lastTap = { dir: tapDir, f: this.frame };
    }
    if (dir === 0) this.dashLatch = false;
    // วิ่งเสมอ — ไม่มีปุ่มเดิน/ปุ่มวิ่งแยกแล้ว ตามที่ผู้เล่นขอ ("เกมนี้ไม่จำเป็นต้องเดิน")
    // ยังคำนวณ dashLatch ไว้ข้างบนเพราะปุ่ม dash ที่จะทำทีหลังจะมาใช้ต่อ
    const running = true;

    if (!inp.jump) f.jumpHeldSinceTakeoff = false;

    // cancels during attack
    if (f.state === 'attack') {
      const m = f.move;
      const afterActive = f.moveF >= m.startup + m.active;
      if (f.hitConfirmed && m.jumpCancel && this.buffered('jump') && (f.onGround || f.jumpsLeft > 0)) {
        this.consume('jump'); f.used.clear(); this.doJump(f, inp); return;
      }
      // ต่อคอมโบเข้าสกิล: กดปุ่มสกิลตอนท่าปัจจุบัน "ตีโดนแล้ว" ยกเลิกท่าเข้าสกิลได้เลย
      // เงื่อนไข hitConfirmed ทำให้ยกเลิกท่าที่ตีพลาดไม่ได้ ท่าที่พลาดจึงยังมีจังหวะเสียตามเดิม
      // กินปุ่มเฉพาะตอนยกเลิกได้จริง ที่เหลือปล่อยค้างใน buffer ต่อ (เหมือนปุ่มตี)
      // ถ้ากินทิ้งตรงนี้ กดสกิลท้ายท่าที่ฟันลมจะเงียบสนิท ทั้งที่ควรออกท่าทันทีที่ท่าเดิมจบ
      for (let i = 0; i < f.skills.length; i++) {
        if (!this.buffered('skill' + (i + 1))) continue;
        if (!f.hitConfirmed || !f.onGround || f.moveF < m.startup) continue;
        if (!this.skillReady(f, i)) continue;
        this.consume('skill' + (i + 1));
        this.startSkill(f, i, f.facing); return;
      }
      if (this.buffered('attack')) {
        const neutral = dir === 0 && !inp.up && !inp.down;
        let next = null;
        if (m.chain && neutral && (afterActive || f.hitConfirmed)) next = m.chain;
        else if (f.hitConfirmed && f.moveF >= m.startup) {
          const cand = this.pickMove(f, inp);
          if (!f.used.has(cand) && f.moves[cand].kind === m.kind) next = cand;
        }
        if (next) { this.consume('attack'); this.startMove(f, next, dir); return; }
      }
      return;
    }
    if (!ACTIONABLE.has(f.state)) return;

    // jump / drop-through
    if (this.buffered('jump')) {
      if (f.onGround && inp.down && f.y < STAGE.groundY) {
        this.consume('jump'); f.dropT = 14; f.onGround = false; f.y += 2; f.setState('air'); return;
      }
      if (this.doJump(f, inp)) { this.consume('jump'); return; }
    }
    // สกิล 1/2/3 — เริ่มได้เฉพาะตอนยืนอยู่บนพื้น (เป็นคอมโบเดินหน้า ไม่มีเวอร์ชันกลางอากาศ)
    // สล็อตที่ยังว่าง (SKILLS[i] === null) กินปุ่มทิ้งไปเฉย ๆ ไม่ค้างอยู่ใน buffer ให้ไปออกท่าทีหลัง
    for (let i = 0; i < f.skills.length; i++) {
      if (!this.buffered('skill' + (i + 1))) continue;
      this.consume('skill' + (i + 1));
      if (!f.onGround) continue;
      f.used.clear();                       // เริ่มคอมโบใหม่จากท่ายืน สกิลที่เคยใช้ไปแล้วกลับมาใช้ได้
      if (!this.skillReady(f, i)) continue; // ติดคูลดาวน์/ki ไม่พอ = กินปุ่มทิ้ง ไม่ค้างไว้ออกทีหลัง
      this.startSkill(f, i, dir || f.facing); return;
    }
    // attack
    if (this.buffered('attack')) {
      this.consume('attack'); f.used.clear();
      this.startMove(f, this.pickMove(f, inp), dir); return;
    }
    if (f.onGround) {
      // กัน + กดลง = ก้มกัน (กรอบเตี้ยลงเท่าท่าย่อ) · กันเฉย ๆ = กันยืนเหมือนเดิม
      // เช็ค block ก่อน down เหมือนเดิม ท่าย่อธรรมดาจึงไม่เปลี่ยนพฤติกรรม
      if (inp.block) { f.setState(inp.down ? 'blockcrouch' : 'block'); f.vx *= PHYS.stopFric; return; }
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
      if (!gliding) f.vx *= 0.82;
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
  techChoice(f) {
    if (f.id === 'p1') {
      if (f.techBuf <= 0) return null;
      const i = this.lastInp || {};
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
      if (f.moveF >= m.startup + m.active + m.recovery) {
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
    const dmg = Math.max(1, Math.round(m.dmg * scale));
    d.hp = Math.max(0, d.hp - dmg);
    d.comboHits++; d.comboDmg += dmg; d.lastHitF = this.frame;
    d.stun = Math.round(m.stun * Math.max(0.55, 1 - 0.05 * (d.comboHits - 1)));
    d.move = null; d.moveId = null; d.setState('hitstun');
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

  pushApart(a, b) {
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

export { STAGE, STAGE_BASE_W, setStageWidth, PHYS, MOVES, SKILLS, SKILL_CD, KI_MAX, CHARACTERS, DEFAULT_CHAR, ACTIONABLE, Fighter, Game, overlap };
