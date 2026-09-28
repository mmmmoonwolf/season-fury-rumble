import { wireUiSfx } from "../../ui/uisfx.js";
import { quitToLobby } from "../../ui/shell.js";
import { STAGE, STAGE_BASE_W, setStageWidth, PHYS, MOVES, SKILLS, SKILL_CD, KI_MAX, ROUND_BARS, CHARACTERS, Game } from "./core.js";
import { Lockstep, packInput, HELD_MASK, PRESS_MASK } from "./netplay.js";
import { getSession, sendNetPacket } from "../../net/session.js";

/**
 * SCRAMBLE — ฉาก Phaser: renderer แบบกล่อง (greybox) + เครื่องมือดีบัก
 *
 * ยกมาจาก prototype scramble-training.html โดยคงโค้ดวาดกับเครื่องมือไว้ตามเดิม
 * (SCRAMBLE_HANDOFF.md: "The Phaser scene is only a greybox renderer + debug tools.
 *  Replace the drawing with sprites, keep the tools.")
 * ขั้นต่อไปคือเอา sprite ของ Nyx มาแทน drawFighter() ส่วนเครื่องมือทั้งหมดอยู่ต่อ
 *
 * สิ่งที่แก้จาก prototype (เท่าที่จำเป็นต่อการอยู่ร่วมกับเกมเดิมเท่านั้น):
 *  - prototype เป็นหน้าเว็บของตัวเองที่มี DOM (#tools #tune #touch) เขียนไว้ใน index.html
 *    ที่นี่ฉากสร้าง DOM พวกนั้นเองตอน create() และลบทิ้งตอน shutdown
 *    เกมเดิมจึงไม่ต้องแบก markup ของโหมดนี้ไว้ และสลับกลับไปโหมดอื่นแล้วไม่มีอะไรค้าง
 *  - ตัวดัก keydown/keyup ก็ถอดออกตอน shutdown ด้วย ไม่งั้นกดปุ่มในล็อบบี้แล้วจะไปโดนโหมดนี้กินไป
 */

// ---------- อินพุต ----------
// ปุ่มของสองฝั่งแยกกัน: ฝั่ง 1 = WASD + JKL + 123 · ฝั่ง 2 = ลูกศร + numpad
// เล่นสองคนบนคีย์บอร์ดเดียวจึงแยกมือกันได้จริง (ซ้ายมือคนหนึ่ง ขวามือคนหนึ่ง)
const BINDS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    jump: ['Space', 'KeyK'], attack: ['KeyJ'], block: ['KeyL'],
    skill1: ['Digit1', 'ShiftLeft'], skill2: ['Digit2'], skill3: ['Digit3'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    jump: ['Numpad0', 'Numpad2'], attack: ['Numpad1'], block: ['Numpad3'],
    skill1: ['Numpad4'], skill2: ['Numpad5'], skill3: ['Numpad6'] },
];

/** ปุ่มที่ฝั่ง 1 ได้เพิ่ม **เฉพาะตอนเป็นคนเดียวบนคีย์บอร์ดนี้** (ซ้อม · ต่อเน็ต)
 *
 *  ── ทำไมต้องมีเงื่อนไข ──
 *  numpad เป็นของฝั่ง 2 อยู่แล้วตอนเล่นสองคนคีย์บอร์ดเดียว ให้ฝั่ง 1 ใช้ด้วยไม่ได้
 *  จะกลายเป็นปุ่มเดียวสั่งสองคนพร้อมกัน ซึ่งพังแบบที่ไม่มีใครเดาสาเหตุถูก
 *  ตอนอยู่คนเดียวบนคีย์บอร์ดไม่มีใครแย่ง จึงยืมมาใช้ได้เต็ม ๆ
 *
 *  ── ทำไมถึงเป็น numpad ──
 *  WASD อยู่ซ้าย มืออีกข้างจึงว่างอยู่ที่ numpad พอดี แทนที่จะต้องหุบมาเกาะ JKL กลางคีย์บอร์ด
 *  ผังปุ่มคิดจากตำแหน่งนิ้ว ไม่ใช่จากเลข:
 *
 *      7  [8 กัน]  9        กันอยู่แถวบน = นิ้วกลางเอื้อมขึ้น ปลอดภัยจากการกดพลาดตอนรัวตี
 *      4  [5 อัลติ] 6       อัลติอยู่กลาง = ต้องเล็งกด ไม่ใช่ปุ่มที่ปัดโดนได้
 *   [1 ตี][2 สกิล1][3 สกิล2]  แถวล่างคือแถวที่รัวเร็วที่สุด ให้ท่าที่กดบ่อยที่สุด
 *
 *  ลูกศรยังอยู่ในชุดนี้เหมือนเดิม จะได้ไม่ต้องจำว่าต้องใช้ WASD เท่านั้น
 *
 *  JKL + 123 ของเดิม **ไม่ได้ถอดออก** — มันคือปุ่มที่ปุ่มบนจอ (มือถือ) ยิงเข้ามา
 *  และคือปุ่มของฝั่ง 1 ตอนเล่นสองคนคีย์บอร์ดเดียว ซึ่งใช้ numpad ไม่ได้
 */
const ALONE_EXTRA = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  attack: ['Numpad1'], skill1: ['Numpad2'], skill2: ['Numpad3'], skill3: ['Numpad5'],
  block: ['Numpad8'],
};

const GAME_KEYS = new Set(BINDS.flatMap((b) => Object.values(b).flat()).concat(Object.values(ALONE_EXTRA).flat()));
const TOOL_KEYS = new Set(['KeyT','KeyH','Digit0','Digit4','KeyR','KeyP','KeyN','KeyO','KeyC','KeyV','KeyM','KeyB','KeyF','KeyZ','KeyG','Escape']);
const held = new Set();
let pressed = new Set();
let activeScene = null;

const onKeyDown = (e) => {
  if (GAME_KEYS.has(e.code) || TOOL_KEYS.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (TOOL_KEYS.has(e.code)) { activeScene && activeScene.tool(e.code); return; }
  held.add(e.code); pressed.add(e.code);
};
const onKeyUp = (e) => held.delete(e.code);
const onBlur = () => held.clear();

/** อ่านอินพุตของฝั่งที่ระบุ
 *
 *  @param alone ฝั่ง 1 เป็นคนเดียวบนคีย์บอร์ดนี้หรือเปล่า — ถ้าใช่จะได้ปุ่มชุด ALONE_EXTRA เพิ่ม
 *  @param h,p  ชุดปุ่มที่กดค้าง/เพิ่งกด — รับเข้ามาได้เพื่อให้เทสต์ป้อนปุ่มเองได้โดยไม่ต้องมี DOM
 */
function readInput(side = 0, alone = false, h = held, p = pressed) {
  const b = BINDS[side];
  const keysOf = (k) => (alone && side === 0 && ALONE_EXTRA[k] ? b[k].concat(ALONE_EXTRA[k]) : b[k]);
  const any = (k) => keysOf(k).some((c) => h.has(c));
  const anyP = (k) => keysOf(k).some((c) => p.has(c));
  return {
    left: any('left'), right: any('right'), up: any('up'), down: any('down'),
    jump: any('jump'), attack: any('attack'), block: any('block'), run: 0,
    skill1: any('skill1'), skill2: any('skill2'), skill3: any('skill3'),
    p: { left: anyP('left'), right: anyP('right'), jump: anyP('jump'), attack: anyP('attack'),
         block: anyP('block'), skill1: anyP('skill1'), skill2: anyP('skill2'), skill3: anyP('skill3') },
  };
}

/**
 * ความสูงหัวจรดเท้าของสไปรท์ Nyx บนเวที (พิกเซลของเวที สูง 720)
 * hurtbox สูง PHYS.standH = 118 — ตั้งไว้ 130 = สูงกว่ากรอบ 11% ซึ่งเป็นสัดส่วนปกติของเกมต่อสู้
 * (ลองแล้ว 150 ตัวใหญ่เกินกรอบ 28% ดูเหมือนกรอบเล็กกว่าตัวจนโดนตีแล้วงง)
 * ปรับค่านี้ค่าเดียวถ้าเล่นแล้วรู้สึกตัวใหญ่/เล็กไป
 */
const SPRITE_H = 130;

// ระยะที่เท้าก้าวได้หนึ่งก้าวเมื่อสไปรท์สูง SPRITE_H — วัดจากคลิปต้นฉบับของแต่ละตัว
// (ระยะถ่างขาสูงสุด หารด้วยความสูงตัว คูณ SPRITE_H) ใช้กำหนดเวลาต่อรอบของท่าวิ่งให้เท้าไม่ไถ
//
// เป็นค่าต่อตัวละคร ไม่ใช่ค่ากลาง: Helios ก้าวสั้นกว่า Nyx ชัดเจน (85 เทียบ 102)
// ใช้ค่าเดียวกันทั้งคู่ = ตัวที่ก้าวสั้นกว่าจะเล่นท่าช้าไปเมื่อเทียบกับระยะที่เคลื่อนจริง เท้าไถไปกับพื้น
const RUN_STRIDE_DEFAULT = 102;

/** ท่าที่คิดเวลาต่อรอบจาก "ระยะที่เท้าเดินได้หนึ่งรอบ" ไม่ใช่เวลาตายตัว -> ชื่อฟิลด์ใน CHAR_ART
 *  ลงทะเบียนที่ความเร็ววิ่งเต็ม แล้วตอนวาดค่อยหรี่ด้วย anims.timeScale ตามความเร็วจริง */
const STRIDE_FIELD = { run: 'runStride', runGun: 'gunStride' };

/** ต่ำกว่านี้ถือว่ายืนอยู่กับที่ ให้ค้างท่ายิง — ไม่งั้นตอนเธอชะลอจะเห็นเท้าย่ำเชื่องช้าแปลก ๆ
 *  (ความเร็วโหมดไรเฟิลคือ PHYS.run x mobile = 2.08 px/เฟรม ค่านี้จึงราว 17% ของความเร็วเต็มโหมด) */
const GUN_WALK_VX = 0.35;

const isTouch = (window.matchMedia?.('(pointer: coarse)')?.matches ?? false) || 'ontouchstart' in window;

// จอยลอย: รัศมีที่ลากได้สุด · เขตตายแนวนอน · เขตตายแนวตั้ง (กว้างกว่าโดยตั้งใจ)
const STICK_R = 52, STICK_DEAD = 13, STICK_DEADY = 24;

// ---------- หน้าตา (ยกจาก prototype) ----------
/**
 * ทะเบียนอาร์ตต่อตัวละคร (ฝั่งฉาก) — คู่กับ CHARACTERS ใน core.js ที่เก็บฝั่งเฟรมเดต้า
 * แยกกันเพราะ core.js ตั้งใจไม่แตะ Phaser จะได้เดินเทสต์ใน node ตรง ๆ ได้
 *
 * `anims`   = ชื่อท่า -> จำนวนเฟรม (ลงทะเบียนเป็น animation ที่เล่นตามเวลา)
 * `attacks` = ท่าโจมตีที่มีอาร์ตแล้ว 3 เฟรมต่อท่า เลือกเฟรมจาก phase() ไม่ใช่ตามเวลา
 * ตัวที่ไม่อยู่ในทะเบียนนี้ (หุ่นซ้อม) วาดเป็นกล่องเหมือนเดิม
 */
/** เวลาต่อรอบของแต่ละท่า (วินาที) — ใช้ร่วมกันทุกตัวละคร ตั้งเป็นเวลาไม่ใช่ fps
 *  เพิ่ม/ลดเฟรมในท่าแล้วจังหวะไม่เปลี่ยน และตรงกับเวลาที่เอนจิ้นถือ state นั้นไว้ */
const ANIM_SECONDS = { idle: 0.8, hurt: 0.5, crouch: 1.2, jump: 0.6, knockdown: 0.25,
  techroll: 0.22, tech: 0.17, block: 1.0, blockstun: 0.2, blockcrouch: 1.0 };

const CHAR_ART = {
  nyx: {
    atlasKey: 'scnyx',
    texture: 'assets/characters/scramble_nyx.png',
    data: 'assets/characters/scramble_nyx.json',
    runStride: 102,
    title: 'Nyx',
    role: 'นักลอบสังหาร',
    tip: 'เข้าออกไว วาร์ปหาเป้า ดาเมจต่อคอมโบสูง แต่ตัวบาง',
    anims: { idle: 8, run: 10, hurt: 10, crouch: 3, jump: 5, knockdown: 2, techroll: 2, tech: 1,
      block: 3, blockstun: 2, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "thrust1", "thrust2", "thrust3", "thrust4",
      "fox1", "fox2", "curse1", "curse2", "ult1", "ult2", "ult3", "ult4"]),
    // เติมตอน _initCharSprite: meta / sprite / lastState / lastJumps
  },
  // Helios: มีอาร์ตครบทุกท่าแล้ว
  helios: {
    atlasKey: 'schelios',
    texture: 'assets/characters/scramble_helios.png',
    data: 'assets/characters/scramble_helios.json',
    runStride: 85,
    title: 'Helios',
    role: 'นักสู้ระยะประชิด',
    tip: 'ต่อยเตะรัว กดต่อเนื่องได้ยาว ถนัดกดดันติดตัว',
    anims: { idle: 1, run: 11, jump: 4, crouch: 1, hurt: 1, knockdown: 1, techroll: 1, tech: 1,
      block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "rush1", "rush2", "rush3", "rush4", "rush5", "rushEndF", "rushEndU", "rushEndD",
      "knee", "hh1", "hh2", "hh3", "hhEnd"]),
  },
  // Alecto: ท่าตีปกติเป็นแส้ จึงต้องมี runStride ของตัวเอง (ขายาวใกล้ Helios)
  alecto: {
    atlasKey: 'scalecto',
    texture: 'assets/characters/scramble_alecto.png',
    data: 'assets/characters/scramble_alecto.json',
    runStride: 86,
    title: 'Alecto',
    role: 'สายคุมพื้นที่',
    tip: 'สลับแส้กับไรเฟิลได้ — แส้เจ็บกว่าและทำให้ช้า ไรเฟิลเดินยิงข้ามเวที',
    // ท่าเดินถือปืนยาว: รอบเดียว = สองก้าว (ชีตเป็นวงจรเดิน 4 ท่า ย่ำสลับซ้าย-ขวา)
    // 104 = ถ่างเท้าตอนเท้าแตะพื้น 96 px บน canvas x (SPRITE_H/standing) x 2 ก้าว
    gunStride: 104,
    // แส้ยาวกว่าอาวุธอื่นทั้งโรสเตอร์ รอยฟาดจึงต้องเป็นเส้นสะบัดยาว ไม่ใช่รอยดาบโค้ง
    // ท่าปืนไม่ใส่รอยฟาดเลย — ปืนไม่ได้ฟาด มันยิง กระสุนเป็นตัวบอกอยู่แล้ว
    slash: { jab1: { f: 'slashLash' }, jab2: { f: 'slashLash', rot: -14 },
      jab3: { f: 'slashLash', rot: 10 }, side: { f: 'slashLash' },
      up: { f: 'slashRise' }, down: { f: 'slashLash', rot: 28 },
      nair: { f: 'slashSpin' }, sair: { f: 'slashLash', rot: 18 }, dair: { f: 'slashChop', rot: 48 },
      gjab1: null, gjab2: null, gjab3: null, gside: null, gup: null, gdown: null },
    anims: { idle: 1, run: 10, runGun: 4, idleGun: 1, jump: 4, crouch: 1, hurt: 1, knockdown: 1,
      techroll: 1, tech: 1, block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "swap1", "gjab1", "gjab2", "gjab3", "gside", "gup", "gdown",
      "shot1", "shot2", "shot3", "fire1", "fire2", "dust1", "dust2", "hop", "roll"]),
  },
  // Momus: ตัวป่วนสนาม — ขาสั้นเหมือน Alecto/Helios ก้าวจึงสั้นตาม (วัดจากคลิปได้ 86)
  momus: {
    atlasKey: 'scmomus',
    texture: 'assets/characters/scramble_momus.png',
    data: 'assets/characters/scramble_momus.json',
    runStride: 86,
    title: 'Momus',
    role: 'สายป่วนสนาม',
    tip: 'ระเบิดของเขาไม่เลือกข้าง โดนตัวเองด้วย — ชนะเพราะรู้ว่าระเบิดจะลงตรงไหน',
    anims: { idle: 1, run: 10, jump: 3, crouch: 1, hurt: 1, knockdown: 1, techroll: 1, tech: 1,
      block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "jab4", "jab5", "jab6",
      "side", "up", "down", "nair", "sair", "dair",
      "box1", "box2", "snap1", "snap2", "full1", "full2"]),
  },
  // Atlas: ยังไม่มีอาร์ต — ไม่มี atlasKey จึงตกไปวาดเป็นกล่องเหมือนหุ่นซ้อม
  // ใส่ไว้ตรงนี้เพื่อให้การ์ดหน้าเลือกตัวมีคำบรรยายครบ และมีสีกล่องเป็นของตัวเอง
  // ลบ artPending ใน core.js กับเติม atlasKey/texture/data/anims/attacks ตอนอาร์ตมาถึง
  // Atlas: ก้าวยาวที่สุดในโรสเตอร์ (ถ่างเท้า 186 px · Nyx 172 · Helios 156 · Alecto 127)
  atlas: {
    atlasKey: 'scatlas',
    texture: 'assets/characters/scramble_atlas.png',
    data: 'assets/characters/scramble_atlas.json',
    runStride: 110,
    box: 0xe6e9ee, boxAccent: 0x8a6a4a,   // ขนเสือขาว ลายน้ำตาล
    title: 'Atlas',
    role: 'สายแท้งค์',
    tip: 'เลือด 130 · ท่าหนักมีเกราะ โดนตีแล้วไม่หลุดท่า เดินฝ่าเข้ามาได้',
    anims: { idle: 1, run: 10, jump: 4, crouch: 1, hurt: 1, knockdown: 1, techroll: 1, tech: 1,
      block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "ram1", "ram2", "leap", "sky1", "sky2"]),
  },
  // Orpheus: ไล่หวดกีตาร์ + บัฟไฟ · ชีตเจนมาตารางไม่สม่ำเสมอ ดู tools/orpheus_sheets.py
  orpheus: {
    atlasKey: 'scorpheus',
    texture: 'assets/characters/scramble_orpheus.png',
    data: 'assets/characters/scramble_orpheus.json',
    runStride: 96,
    box: 0x8a8f9a, boxAccent: 0xc08a3e,
    title: 'Orpheus',
    role: 'สายไล่หวดติดไฟ',
    tip: 'กดรัวแล้วหวดรัวห้าจังหวะ · ถอยหลังฟาดกีตาร์ลงพื้นทิ้งไฟไว้ให้คนที่ไล่',
    anims: { idle: 1, run: 10, jump: 4, crouch: 1, hurt: 1, knockdown: 1, techroll: 1, tech: 1,
      block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "jab4", "jab5", "side", "up", "down",
      "nair", "sair", "dair", "slide1", "slide2", "burn1",
      "solo1", "solo2", "solo3", "soloEnd"]),
  },
};

const C = {
  skyTop: 0x1a2440, skyBot: 0x3b4a6a, far: 0x2b3656, near: 0x212a42, window: 0xe8c56d,
  asphalt: 0x262a33, stripe: 0xd6dae2, slab: 0x9aa0a8, slabTop: 0xcdd1d6, slabUnder: 0x565b64,
  nyx: 0xdcdfe6, nyxScarf: 0xc8323c, dummy: 0xc9a26b, dummyMark: 0x7a5530,
  startup: 0xf2b53c, active: 0xff4d5e, recovery: 0x5aa0ff, free: 0x59606e,
  hurt: 0x57e39a, hit: 0xff4d5e, ink: '#e9e3d6', dim: '#9aa3b5',
  // ใต้เกาะ — หมอกสว่างตรงขอบเกาะ ไล่ลงไปหาฟ้าลึกที่ก้นจอ (ดู _drawAbyss)
  abyssTop: 0x9fb8cf, abyssBot: 0x1d2a49, cloud: 0xdfeaf4,
};
const FONT = '"Chakra Petch", system-ui, sans-serif';
const MODES = ['stand', 'block', 'jump'];
const MODE_LABEL = { stand: 'Stand', block: 'Block', jump: 'Jump' };
const TECHS = ['off', 'place', 'random'];
const TECH_LABEL = { off: 'Off', place: 'In place', random: 'Random' };

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

/** ผสมสี hex สองค่าแบบเชิงเส้น — ใช้ไล่เฉดตอนวาดพื้นหลังด้วย graphics */
function mixHex(a, b, t) {
  const ch = (sh) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 *   เวที SCRAMBLE กว้างเท่าผืนเกม (setStageWidth) กำแพงจึงอยู่ขอบจอพอดี
 *   แต่ผืนเกมกว้างตามสัดส่วนจอ (ดู index.html) บนมือถือจึงกว้างกว่าเวที
 *   วาดพื้นหลังเลยออกไปให้เต็มจอ แล้วเลื่อนกล้องให้เวทีอยู่กลาง (ดู create())
 */
/** เวที Valhalla — อาร์ตวาดมือ ตัดเป็นเลเยอร์กับชิ้นแพลตฟอร์มไว้แล้ว (tools/build_stage_valhalla.py)
 *
 *  ตัดเป็นชิ้นแทนที่จะแปะภาพประกอบเสร็จทั้งใบ เพราะตำแหน่งแพลตฟอร์มในเกมผ่าน playtest มาแล้ว
 *  ถ้าใช้ภาพที่วาดแพลตฟอร์มติดมาด้วย กรอบชนกับรูปจะไม่ตรงกัน
 *  คนเล่นจะเห็นหินตรงหนึ่งแต่ยืนได้อีกตรงหนึ่ง ซึ่งเป็นความผิดพลาดที่ให้อภัยไม่ได้ในเกมแพลตฟอร์ม
 *
 *  `surface` = ระยะจากขอบบนของรูปถึง "เส้นที่ยืนได้" — ไม่ใช่ขอบบนของรูป
 *  เสาหินรูนสูงกว่าตัวแพลตฟอร์ม และพื้นล่างวาดเป็นมุมเฉียงจนสันหินหลังสูงกว่าทางเดินหน้า
 */
// มิดกราวด์ยื่นลงใต้เส้นพื้นเท่านี้ — หน้าผาสองข้างต้องจมใต้พื้นล่าง ไม่ใช่ลอยอยู่เหนือมัน
const MID_DROP = 120;

// ความสูงของแถบมืดบน-ล่าง (พิกัดเวที) — บนบังแค่แถว HUD · ล่างบังบรรทัดบอกปุ่ม
const SCRIM_TOP = 150, SCRIM_SOLID = 96, SCRIM_BOT = 96;

/** คีย์จำโหมดนักพัฒนา — แยกจากคีย์ปิดเสียง (sfr.muted) คนละเรื่องกัน */
const DEV_STORE = 'sfr.dev';

/** ตัวละครที่ยังไม่ปล่อย — โชว์เป็นเงาในแผงเลือกตัว กดไม่ได้
 *
 *  **ไม่ได้อยู่ใน CHARACTERS โดยตั้งใจ** ใส่เข้าไปแล้วมันจะไหลไปทุกที่ที่อ่านรายชื่อตัวละคร:
 *  ปุ่มสุ่ม · ปุ่มสลับตัว (C/V) · ตัวโหลดอัตลาส · เทสต์ที่ไล่ตรวจอาร์ตทุกตัว
 *  แล้วต้องไปใส่เงื่อนไขยกเว้นทีละที่ ซึ่งลืมง่ายกว่าการไม่ใส่ตั้งแต่แรก
 *
 *  โชว์เป็น**เงา** ไม่ใช่รูปเต็ม — เกมต่อสู้ทำแบบนี้กันเพราะมันบอกว่า "มีคนมาเพิ่ม"
 *  โดยไม่ผูกมัดกับอาร์ตชุดสุดท้าย ซึ่งยังเปลี่ยนได้ตลอดจนกว่าจะประกอบชีตเสร็จ
 */
const COMING_SOON = [
  { pic: 'assets/ui/soon_01.png', name: 'เร็ว ๆ นี้', tip: 'ตัวละครใหม่กำลังมา' },
  { pic: 'assets/ui/soon_02.png', name: 'เร็ว ๆ นี้', tip: 'ตัวละครใหม่กำลังมา' },
];

/** แถวบนของ HUD กินลงมาถึง y เท่าไหร่ และจางเหลือเท่าไหร่ตอนมีคนยืนอยู่ในนั้น
 *
 *  ชั้น 5 (เท้า y=160) สูงพอที่หัวตัวละครจะเข้ามาในแถบนี้ ซึ่ง**ตั้งใจให้เป็นที่เสี่ยง**
 *  ยืนบนนั้นแลกด้วยการอ่านหลอดเลือดตัวเองไม่ออก
 *
 *  แต่พอแยกกล้อง UI ออกมา กล้อง UI วาดทับทุกอย่างเสมอ **HUD จึงบังตัวละครแทน**
 *  (ก่อนแยกกล้อง สไปรท์ depth 5 อยู่เหนือข้อความ HUD depth 0 จึงไม่มีปัญหา)
 *  มองไม่เห็นตัวเองเป็นคนละเรื่องกับอ่านหลอดไม่ออก — อันแรกคือเกมพัง อันหลังคือกติกา
 *  จางลงจึงได้ทั้งสองอย่าง: เห็นตัวเองแน่นอน และยังอ่าน HUD ไม่ถนัดเหมือนที่ตั้งใจไว้ */
const HUD_BAND = 140, HUD_DIM = 0.26, HUD_FADE = 0.15;

/** ลูกศรเล็ก ๆ เหนือหัว — บอกว่า "ตัวไหนคือใคร" โดยไม่ต้องอ่าน HUD
 *
 *  ปัญหาที่แก้: เล่น 2v2 แล้วสี่ตัวเคลื่อนไหวพร้อมกัน **หาตัวเองไม่เจอ**
 *  ซึ่งไม่ใช่เรื่องที่ HUD ช่วยได้ เพราะตอนนั้นสายตาอยู่กลางจอ ไม่ได้อยู่ที่มุมจอ
 *
 *  สีตาม **ทีม** ไม่ใช่ตามคน — ข้อมูลที่ต้องการตอนวุ่นคือ "ฝั่งไหนพวกเรา" ไม่ใช่ "คนนี้ชื่ออะไร"
 *  ตัวที่เครื่องนี้คุมอยู่ได้ลูกศร **ทึบและใหญ่กว่า** ที่เหลือเป็นเส้นบาง ๆ
 *  1v1 จึงเหลือสามเหลี่ยมจิ๋วสองอันแทบไม่รบกวน · 2v2 ได้สี่อันซึ่งคือข้อมูลที่จำเป็นพอดี
 *
 *  วาดในพิกัดโลก ลูกศรจึงโตตามซูมกล้องเหมือนตัวละคร ไม่ได้ลอยอยู่คนละระนาบ
 */
/** แผงผู้เล่นมุมจอ — รูปวงกลม + วงเลือดรอบรูป แทนหลอดยาวแบบเดิม
 *
 *  ทำไมเปลี่ยน: หลอดยาว 380 px ต่อคน พอเป็น 2v2 กลายเป็นสี่หลอดซ้อนกันกินความกว้างครึ่งจอบน
 *  และยังอ่านไม่ออกอยู่ดีว่าหลอดไหนของใคร เพราะไม่มีรูปกำกับ มีแต่ชื่อตัวหนังสือ
 *
 *  รูปกลมอ่านได้ในเสี้ยววินาทีเพราะมันคือ**หน้าตัวละครที่กำลังวิ่งอยู่บนจอ** ไม่ใช่ชื่อที่ต้องอ่าน
 *  และกินที่เท่าเดิมไม่ว่าจะสองคนหรือสี่คน — วงเลือดขยายรอบรูปแทนที่จะยืดออกข้าง
 *
 *  ของเราได้วงทองรอบนอกเพิ่ม + วงพลัง (ki) อีกชั้นด้านใน — คนอื่นไม่มี เพราะเราใช้ ki ของเราคนเดียว
 */
const POD = {
  r: 27,           // รัศมีรูป
  ring: 5,         // ความหนาวงเลือด
  gap: 6,          // ระยะจากขอบรูปถึงวงเลือด
  step: 78,        // ระยะห่างระหว่างคนในทีมเดียวกัน
  top: 52,         // จุดกลางวงของแถวบน
  side: 66,        // ห่างจากขอบจอเท่าไหร่
  mine: 1.16,      // ของเราใหญ่กว่ากี่เท่า
  sweep: 250,      // วงเลือดกวาดกี่องศา (เว้นด้านล่างไว้ให้ขีดยก)
  pip: 4.5,        // รัศมีจุดบอกยกที่เหลือ
  full: 0xe9e3d6, low: 0xe05a57, dim: 0x0c111c,
  gold: 0xffd166, ki: 0x5aa0ff, kiFull: 0xe05a57,
};

const TAG = {
  rise: 30,        // สูงจากหัวเท่าไหร่ (หัวอยู่ที่ f.y - PHYS.standH)
  w: 15, h: 11,    // ขนาดสามเหลี่ยมของตัวที่เราคุม
  small: 0.72,     // ตัวอื่นเล็กลงเท่าไหร่
  bob: 3,          // ลอยขึ้นลงกี่พิกเซล — ขยับนิดเดียวก็จับตาได้ในจอที่มีของเคลื่อนไหวเต็มไปหมด
  team: [0xffd166, 0x5aa0ff],
};

/** จบแมตช์แล้วค้างป้ายผู้ชนะไว้กี่เฟรมของ **ซิม** ก่อนพากลับไปหน้าเลือกตัว
 *
 *  ต้องนับเป็นเฟรมของซิม ไม่ใช่มิลลิวินาที — เฟรมของซิมคือเส้นเวลาเดียวที่สองเครื่องใช้ร่วมกัน
 *  นับด้วยเวลาจริงเมื่อไหร่ เครื่อง 60 Hz กับ 120 Hz จะกลับหน้าเลือกตัวคนละจังหวะ
 *  แล้วฝั่งที่กลับก่อนหยุดส่งอินพุต ทำให้อีกฝั่งค้างรออยู่หน้าจอจบไปอีกพักหนึ่งโดยไม่มีเหตุผล
 *
 *  180 เฟรม = 3 วินาที นานพอจะอ่านว่าใครชนะ สั้นพอจะไม่ต้องนั่งรอ */
const MATCH_END_HOLD = 180;

/** รอยฟาดต่อ "ชื่อท่า" ไม่ใช่ต่อตัวละคร
 *
 *  ทุกตัวใช้ชื่อท่าเดียวกันหมด (jab1/side/up/…) ตารางนี้จึงใช้ร่วมกันได้ทั้งโรสเตอร์
 *  ตัวที่อาวุธต่างจริง ๆ ค่อยเขียนทับเป็นรายตัวใน CHAR_ART.slash (Alecto ใช้แส้ทุกท่า)
 *
 *  `rot` = องศาที่หมุนเพิ่มจากท่าเดิมของรูป · รูปทุกใบเจนมาฟาดซ้าย->ขวา
 *  เกมพลิกตามทิศที่ตัวละครหันให้เอง จึงไม่ต้องมีรูปชุดกลับด้าน
 */
const SLASH_DEFAULT = {
  jab1: { f: 'slashThin' }, jab2: { f: 'slashThin', rot: -18 }, jab3: { f: 'slashWide' },
  jab4: { f: 'slashWide' }, jab5: { f: 'slashWide', rot: 14 }, jab6: { f: 'slashCross' },
  side: { f: 'slashThrust' }, up: { f: 'slashRise' }, down: { f: 'slashChop', rot: 26 },
  nair: { f: 'slashSpin' }, sair: { f: 'slashThrust', rot: 16 }, dair: { f: 'slashChop', rot: 52 },
};

/** ลูกไฟ/ประกายที่โปรยตอนหมัดเข้า — ตัวเลขทั้งหมดคูณตามน้ำหนักหมัด (hitstop) */
const HIT_FX = { tint: 0xffe08a, spark: 0xffd166 };

/** พารัลแลกซ์ — เลเยอร์หลังเลื่อนตามการต่อสู้ ไม่ใช่ตามกล้อง
 *
 *  เกมนี้กล้องนิ่งสนิท ไม่มีการแพน พารัลแลกซ์แบบคลาสสิกจึงไม่มีอะไรมาขับ
 *  ตัวขับที่ใช้คือ **ตำแหน่งเฉลี่ยของสองคน** ทั้งแกนนอนและแกนตั้ง
 *
 *  สามชั้นคนละอัตรา ไม่ใช่สองชั้น — หน้าผาสองข้างอยู่ใกล้กว่าเกาะบ้านลอยมาก
 *  อยู่ชั้นเดียวกันแล้วเลื่อนเท่ากัน ซึ่งอ่านเป็นฉากแบนไถล
 *  **ความลึกเกิดจากความต่างของอัตรา ไม่ใช่จากการขยับ**
 *
 *  แกนตั้งสำคัญขึ้นมากตอนเวทีมีห้าชั้น — ไล่กันขึ้นไปชั้นบนสุดคือระยะ 460 px
 *  ถ้าฉากหลังไม่ตอบสนองเลย ความสูงทั้งหมดนั้นจะไม่รู้สึกว่าสูง
 *  เลื่อน "ลงเท่านั้น" เมื่อคนลอยสูงขึ้น (มองขึ้น = เห็นฟ้ามากขึ้น) ไม่เคยเลื่อนขึ้นเหนือเส้นฐาน
 *  ถ้าเลื่อนขึ้นได้ ใต้หน้าผาจะโหว่ให้เห็นฟ้า ซึ่งผิดทั้งภาพและผิดทั้งตรรกะ
 *
 *  รอบแรกตั้งไว้เบามาก (ฟ้า 0.018 · กลาง 0.055) วัดได้ว่าสู้ซ้ายสุดถึงขวาสุด
 *  เลเยอร์ขยับแค่ 10 กับ 31 px บนจอกว้าง 1280 — เล่นจริงแล้วมองไม่เห็นว่ามีพารัลแลกซ์อยู่
 *
 *  ทั้งหมดนี้เป็นการวาดล้วน ไม่แตะ sim — เลื่อนพลาดก็แค่ภาพเพี้ยน ไม่ทำให้สองเครื่องหลุดกัน
 */
/** เพลงประกอบเวที
 *
 *  **โหลดทีหลัง ไม่ใช่ใน preload()** — ไฟล์ 2.2 MB ถ้ารอให้โหลดเสร็จก่อนเข้าฉาก
 *  คนเล่นจะนั่งมองจอโหลดเพิ่มอีกหลายวินาทีเพื่ออะไรที่ไม่ใช่การเล่น
 *  เข้าเกมได้ก่อน แล้วเพลงค่อยเฟดเข้ามาเมื่อพร้อม
 *
 *  สองฟอร์แมตเพราะ Safari รุ่นเก่าไม่เล่น ogg ส่วน Firefox รุ่นเก่าไม่เล่น m4a
 *  Phaser เลือกอันที่เบราว์เซอร์นั้นเล่นได้ให้เอง
 *
 *  ดังไม่เท่าเสียงเอฟเฟค — เพลงประกอบที่กลบเสียงหมัดคือเพลงประกอบที่ตั้งดังเกินไป
 */
const BGM = { key: 'bgmStage', files: ['assets/audio/stage.ogg', 'assets/audio/stage.m4a'],
  vol: 0.32, fadeIn: 1200, store: 'sfr.muted' };

/** เสียงเอฟเฟค — ตรงข้ามกับเพลงทุกข้อ
 *
 *  เพลงโหลดทีหลังเพราะ 2.2 MB · ของพวกนี้รวมกันไม่ถึง 10 KB โหลดใน `preload()` ไปเลย
 *  ถ้าโหลดทีหลังเหมือนเพลง หมัดสิบวินาทีแรกของเกมจะเงียบ ซึ่งคือช่วงที่คนตัดสินว่าเกมรู้สึกดีไหม
 *
 *  `jitter` คือหัวใจ — สุ่มเสียงสูงต่ำ ±90 เซนต์ทุกครั้งที่เล่น
 *  หูจับความซ้ำจากระดับเสียงก่อนจับจากตัวเสียงเสมอ ไฟล์ 2 อันจึงฟังเหมือนมีสิบกว่าอัน
 *  ของฟรีล้วน ๆ ไม่ต้องเจนไฟล์เพิ่มสักไฟล์
 */
const SFX = {
  dir: 'assets/audio/sfx/',
  vol: 0.5,          // เพดานรวม ปรับที่นี่ที่เดียวถ้าเสียงเอฟเฟคดังกลบเพลง
  jitter: 90,        // เซนต์ (100 เซนต์ = ครึ่งเสียง) สุ่ม ± ค่านี้ทุกครั้งที่เล่น
  gap: 30,           // มิลลิวินาที — กันเสียงเดียวกันซ้อนกันเองจนเกิดเสียงหวีดแบบ comb filter
  bank: {
    hitLight: { files: ['hit_light_1', 'hit_light_2', 'hit_light_3', 'hit_light_4', 'hit_light_5'] },
    hitHeavy: { files: ['hit_heavy_1', 'hit_heavy_2', 'hit_heavy_3', 'hit_heavy_4'], vol: 1.15 },
    block:    { files: ['block_1', 'block_2', 'block_3'], vol: 0.85 },
    landSoft: { files: ['land_soft_1', 'land_soft_2', 'land_soft_3'], vol: 0.55 },
    landHard: { files: ['land_hard_1', 'land_hard_2', 'land_hard_3'], vol: 0.85 },
    // หวดลมต้องเบา — มันดังทุกครั้งที่กดปุ่ม ดังกว่านี้แล้วจะกลบเสียงหมัดที่เข้าจริง
    // ซึ่งกลับหัวกลับหางความหมาย: ตีโดนต้องดังกว่าตีพลาดเสมอ
    swing:    { files: ['swing_1', 'swing_2', 'swing_3'], vol: 0.42 },
    whip:     { files: ['whip_1', 'whip_2'], vol: 0.55 },
    // ── เสียงที่ทำจากต้นฉบับเดิมด้วยการยืดคลื่นตอน build (ดู resample ใน build_sfx.py) ──
    // เกมนี้ไม่มีต้นฉบับเสียงระเบิด/ชนกำแพง/โลหะหนักอยู่เลย
    // เสียงที่ทำจากตระกูลเดียวกันเข้ากันได้ดีกว่าเสียงที่ยืมมาจากไลบรารีอื่นที่อัดคนละห้อง
    blast:    { files: ['blast_1', 'blast_2'], vol: 0.95 },
    ko:       { files: ['ko_1'], vol: 1.1 },
    wall:     { files: ['wall_1'], vol: 0.8 },
    metal:    { files: ['metal_1', 'metal_2'], vol: 0.6 },
    thud:     { files: ['thud_1', 'thud_2'], vol: 0.7 },
    // เสียงจิ๊ดเล็ก ๆ บอกว่า "ติดแล้ว" — หมายหัว ปักหมุด ได้ชั้น ตรารอยแส้
    // ต้องเบามาก มันดังบ่อยและไม่ใช่จังหวะสำคัญ แค่ยืนยันว่าเกิดขึ้นจริง
    tick:     { files: ['tick_1'], vol: 0.4 },
    whoosh:   { files: ['whoosh_1', 'whoosh_2'], vol: 0.5 },
    // ยืมเสียงยืนยันของเมนูมาใช้เป็นเสียงเริ่มยก — เป็นเสียง "โทน" เดียวที่มีในคลังทั้งหมด
    // และความหมายตรงกันพอดี: บอกว่าเริ่มแล้ว ไม่ใช่เสียงกระทบ
    roundStart: { files: ['ui_start'], vol: 0.9 },
  },
};

const PARALLAX = {
  sky:  { x: 0.030, y: 0.025, pad: 1.22 },   // ไกลสุด ขยับน้อยสุด
  far:  { x: 0.100, y: 0.075, pad: 1.00 },   // เกาะบ้านลอย (ภาพโปร่งเกือบทั้งใบ ไม่ต้องเผื่อขอบ)
  near: { x: 0.185, y: 0.150, pad: 1.28 },   // หน้าผาสองข้าง ใกล้สุด ขยับเยอะสุด
  drift: 0.06,                                // เมฆไหลเอง ±26 px
  lerp: 0.07,
};

/** กล้องตามตัวละคร — ทุกค่าในนี้เป็นการวาดล้วน ไม่มีอะไรถึง sim
 *
 *  min = 1 เป๊ะ ไม่ใช่ต่ำกว่า: ที่ซูม 1 เวทีกว้างเท่าจอพอดีอยู่แล้ว
 *  ถอยต่ำกว่านั้นจะเห็นขอบอาร์ตฉากหลัง จึงซูม "เข้า" ได้อย่างเดียว
 *  ผลที่ได้คือพฤติกรรมที่อยากได้ตรง ๆ: ใกล้กันซูมเข้า ห่างกันถอยมาเห็นเวทีเต็ม
 *
 *  ถอยเร็วกว่าเข้าสามเท่าโดยตั้งใจ — คนวาร์ปหนี (Nyx) หรือขึ้นชั้นบนสุด (Momus)
 *  ต้องเห็นเขาทันที ถ้าถอยด้วยความเร็วเดียวกับที่เข้า เขาจะอยู่นอกจอไปหลายเฟรม
 *  ซึ่งแปลว่าตายเพราะมองไม่เห็น ไม่ใช่เพราะเล่นแพ้
 */
/** ไล่ตามหลังได้มากสุดกี่เฟรมต่อหนึ่ง tick — ดู tickNet() ว่าทำไมต้องมีเพดาน */
const NET_CATCHUP = 3;

const CAM = {
  min: 1, max: 1.35,
  // ซูมกระตุกตอนกระทบ — บวกทับค่าซูมปกติแล้วยุบเอง ไม่ใช่เป้าหมายใหม่ที่ต้องไหลกลับ
  // คิดจากความแรงของการสั่นกล้องที่มีอยู่แล้ว จุดเดียว ทุกจุดที่สั่นจึงได้กระตุกฟรี
  // และจุดที่เพิ่มทีหลังก็ได้เองโดยไม่ต้องมาจำว่าต้องเรียกสองอย่าง
  punchPerShake: 12,
  punchMax: 0.2,     // ตีรัวแล้วต้องไม่บวกกันจนซูมพุ่ง
  punchDecay: 0.86,
  marginX: 300,      // ที่ว่างซ้าย-ขวาของคนที่อยู่ริมสุด
  marginY: 170,
  headroom: 150,     // นับหัวด้วย ไม่ใช่แค่เท้า ไม่งั้นคนกระโดดสูงหัวหลุดขอบบน
  inLerp: 0.045,
  outLerp: 0.14,
  panLerp: 0.09,
  // ── ก้นจอลงไปได้ถึงพิกัดนี้ ไม่ใช่แค่ STAGE.h ──
  //
  // ที่ซูม 1 กล้องสูงเท่าเวทีพอดี (720) ถ้าบีบก้นกล้องไว้ที่ 720 จุดกลางกล้องจะถูกตรึงที่ 360
  // ตลอดกาล = คนยืนพื้น (y=620) อยู่ต่ำจากขอบบน 86% ของจอเสมอ ไม่ว่าจะเขียนสูตรเล็งดีแค่ไหน
  // **การเล็งให้คนอยู่กลางเฟรมจึงเป็นไปไม่ได้จากฝั่งกล้องเลย** ต้องมีที่ให้กล้องเลื่อนลงก่อน
  //
  // viewBot คือ "ก้นของโลกที่วาดไว้" ไม่ใช่ก้นของพื้นที่เล่น — ใต้เส้นพื้นเป็นหมอก/ฟ้า
  // (ดู _drawAbyss) เกาะจึงลอยอยู่จริง แทนที่จะจบห้วน ๆ ที่ขอบจอแบบเดิม
  viewBot: 900,
};

const STAGE_ART = {
  sky: 'assets/stage/sky.jpg',
  far: 'assets/stage/far.png',      // เกาะบ้านลอย + เกาะเล็ก ๆ (ไกล)
  near: 'assets/stage/near.png',    // หน้าผาสองข้าง (ใกล้)
  ground: 'assets/stage/ground.png',
  // เรียงตรงกับ STAGE.platforms ตามลำดับ — ชั้นกลาง · ซ้าย · ขวา
  // plat_top ยังอยู่ในไฟล์อาร์ตกับ stage.json แต่ไม่ได้ใช้แล้ว (ชั้น 4-5 ถูกถอดออก ดู core.js)
  plat: ['plat_c', 'plat_l', 'plat_r'],
  meta: 'assets/stage/stage.json',
};

/** @param viewW กว้างของจอจริง — เวทีแคบกว่าจอได้ตอนต่อเน็ต ส่วนเกินต้องไม่โล่ง */
function drawBackground(g, viewW = STAGE.w) {
  const vw = Math.max(viewW, STAGE.w), x0 = (STAGE.w - vw) / 2, x1 = x0 + vw;
  g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBot, C.skyBot, 1);
  g.fillRect(x0, 0, vw, STAGE.groundY);
  const r = rng(7);
  for (const [color, base, minH, maxH, winA] of [[C.far, 520, 160, 330, 0.18], [C.near, 600, 120, 260, 0.32]]) {
    let x = x0 - 20;
    while (x < x1 + 20) {
      const w = 60 + r() * 110, h = minH + r() * (maxH - minH);
      g.fillStyle(color, 1); g.fillRect(x, base - h, w, h + 40);
      g.fillStyle(C.window, winA);
      for (let wy = base - h + 14; wy < base - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (r() > 0.55) g.fillRect(wx, wy, 6, 8);
      x += w + 6 + r() * 20;
    }
  }
  // ground + scramble crossing stripes
  g.fillStyle(C.asphalt, 1); g.fillRect(x0, STAGE.groundY, vw, CAM.viewBot - STAGE.groundY);
  g.fillStyle(C.stripe, 0.22);
  for (let x = 60; x < 1240; x += 46) g.fillRect(x, STAGE.groundY + 18, 24, 70);
  g.fillStyle(C.stripe, 0.5); g.fillRect(x0, STAGE.groundY, vw, 3);
  // walls — แถบมืดนอกกำแพงลากถึงขอบจอ ไม่ใช่ขอบเวที
  g.fillStyle(0x0c111c, 0.55); g.fillRect(x0, 0, STAGE.wallL - x0, CAM.viewBot); g.fillRect(STAGE.wallR, 0, x1 - STAGE.wallR, CAM.viewBot);
  g.fillStyle(C.nyxScarf, 0.5); g.fillRect(STAGE.wallL - 2, 0, 2, STAGE.groundY); g.fillRect(STAGE.wallR, 0, 2, STAGE.groundY);
  // platforms (one-way)
  for (const p of STAGE.platforms) {
    g.fillStyle(C.slabUnder, 1); g.fillRect(p.x1 + 10, p.y + 14, p.x2 - p.x1 - 20, 12);
    g.fillStyle(C.slab, 1); g.fillRect(p.x1, p.y, p.x2 - p.x1, 16);
    g.fillStyle(C.slabTop, 1); g.fillRect(p.x1, p.y, p.x2 - p.x1, 4);
  }
}

// ---------- DOM ของโหมดนี้ (สร้างเอง/ลบเอง ไม่ฝากไว้ใน index.html) ----------
const OVERLAY_CSS = `
#sc-tools { position:absolute; top:calc(58px + env(safe-area-inset-top,0px)); left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:15; }
/* พื้นปุ่มเป็น "สีเข้มทึบ" ไม่ใช่ขาวโปร่ง — ฉากเปลี่ยนเป็นฟ้ากลางวันแล้วปุ่มขาวโปร่งกลืนหายไปเลย
   ขอบสว่าง + เงาตัวอักษร + เงารอบปุ่ม ทำให้อ่านออกทั้งบนฟ้าสว่างและบนหินเข้ม */
#sc-tools button, #sc-touch button, #sc-mute, #sc-pause-btn { font:600 13px "Chakra Petch", system-ui, sans-serif; color:#f2ede3; background:rgba(12,17,28,.62); border:1.5px solid rgba(242,237,227,.55); border-radius:12px; text-shadow:0 1px 3px rgba(0,0,0,.8); box-shadow:0 2px 10px rgba(0,0,0,.35); touch-action:none; user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent; }
#sc-tools button { padding:6px 10px; font-size:12px; }
#sc-tools button.on, #sc-touch button.on, #sc-mute.on, #sc-pause-btn.on { background:rgba(200,50,60,.82); border-color:rgba(255,200,200,.7); }
/* ปุ่มปิดเสียงอยู่นอกแถวเครื่องมือ เพราะแถวนั้นถูกซ่อนตอนต่อเน็ต
   คนที่ปิดเสียงเพราะอยู่ที่สาธารณะต้องปิดได้ทุกโหมด ไม่ใช่เฉพาะตอนซ้อม
   วางชิดซ้ายบนใต้แถบเลือด — มุมขวาบนมีปุ่มเต็มจอของเกมอยู่แล้ว */
/* z-index สูงกว่าแผงเลือกตัว (30) โดยตั้งใจ — เพลงเริ่มเล่นตั้งแต่อยู่หน้าเลือกตัว
   ถ้าปุ่มอยู่ใต้แผง คนเล่นจะปิดเสียงไม่ได้จนกว่าจะเลือกตัวเสร็จ ซึ่งสายไปแล้ว */
/* ต่ำกว่าแผงผู้เล่นทั้งก้อน (วง + จุดบอกยก + ชื่อ) ซึ่งจบที่ราว y=125 ของผืนเกมสูง 720 = 17.4%
   **คิดเป็นเปอร์เซ็นต์ของจอ ไม่ใช่ px** เพราะ px ของ DOM กับพิกัดที่ HUD วาดไม่ใช่หน่วยเดียวกัน:
   ผืนเกมสูง 720 เสมอแล้วถูกย่อลงมาเท่าความสูงจอจริง (มือถือ 414 px = ย่อ 0.575 เท่า)
   ตั้งเป็น px แล้วมันจะถูกบนคอมและต่ำเกินไปครึ่งหนึ่งบนมือถือ ซึ่งเคยเป็นแบบนั้นมาแล้ว */
#sc-mute { position:absolute; z-index:31; left:calc(10px + env(safe-area-inset-left,0px));
  top:calc(18dvh + env(safe-area-inset-top,0px)); width:38px; height:38px; border-radius:10px;
  display:grid; place-items:center; font-size:17px; line-height:1; padding:0; }
#sc-tune { display:none; position:absolute; right:calc(12px + env(safe-area-inset-right,0px)); top:calc(100px + env(safe-area-inset-top,0px)); width:250px; max-height:60%; overflow-y:auto; background:rgba(12,17,28,.9); border:1px solid rgba(233,227,214,.25); border-radius:12px; padding:10px 12px; font:13px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6; z-index:16; }
#sc-tune.open { display:block; }
#sc-tune label { display:flex; justify-content:space-between; margin-top:8px; }
#sc-tune input { width:100%; accent-color:#c8323c; }
#sc-tune .row { display:flex; gap:6px; margin-top:10px; }
#sc-tune .row button { flex:1; font:600 12px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6; background:rgba(233,227,214,.14); border:1px solid rgba(233,227,214,.28); border-radius:8px; padding:6px; }
/* จอยลอย (.stick) เป็น position:absolute จึงหลุดออกจาก flex flow ไปแล้ว
   เหลือ .acts เป็นลูกตัวเดียว ถ้ายังใช้ space-between มันจะไปกองอยู่ซ้ายทับจอยพอดี
   (เจอจริงตอนเทสต์บนมือถือ: ปุ่มทั้งแถบไปอยู่ซ้าย วงแหวนจอยทับปุ่มสกิล) */
#sc-touch { display:none; position:absolute; inset:auto 0 0 0; justify-content:flex-end; align-items:flex-end; padding:0 calc(10px + env(safe-area-inset-right,0px)) 14px calc(14px + env(safe-area-inset-left,0px)); pointer-events:none; z-index:15; }
/* ปุ่มล่างสุดต้องห่างขอบจอ ไม่งั้นแถบ gesture / ขีดโฮม ของมือถือกินการแตะไปก่อน = กดไม่ติด
   (เหตุผลเดียวกับ BOTTOM_SAFE ในโหมดปกติ ซึ่งพอร์ต SCRAMBLE เข้ามาทีหลังเลยยังไม่ได้ของนี้)
   โหมดปกติเว้นไว้ 94 หน่วยเกมจาก 720 = 13% ของความสูงจอ = พื้นล่างที่ห้ามต่ำกว่านี้

   แต่แค่พ้นแถบ gesture ยังไม่พอสำหรับเกมต่อสู้: ตัวละครยืนอยู่ "ชั้นล่าง" ของเวที
   ซึ่งคือแถบเดียวกับที่นิ้วโป้งทั้งสองข้างพาดอยู่พอดี เล่นจริงแล้วนิ้วบังตัวละครตลอด
   จึงยกปุ่มขึ้น ให้นิ้วโป้งชี้ขึ้นแทนที่จะนอนราบทับล่างจอ

   ยกได้แค่ไหนถูกกำหนดโดย "ฝั่งขวา" ซึ่งสูงกว่าฝั่งซ้ายเท่าตัว
   วัดบนมือถือแนวนอน 844x390: ฝั่งขวาสูง 256 px = 66% ของจอทั้งจอ
   ยก 24% แล้วปุ่ม Block ไปทับแถบเลือดกับแถวปุ่มเครื่องมือทันที (วัดได้ ขอบบนอยู่ที่ 40 px)
   จึงต้อง "ย่อฝั่งขวาก่อน" (ดู media query ข้างล่าง) แล้วค่อยยก เหลือ 20%
   ฝั่งซ้ายเป็นแป้นทิศสูงแค่ครึ่งเดียว ยกเพิ่มได้อีก จึงใส่ margin ให้ต่างหาก
   env() เป็นพื้นล่างเผื่อจอเตี้ยมาก ๆ · บรรทัด vh ไว้ให้เบราว์เซอร์เก่าที่ยังไม่รู้จัก dvh */
/* **เหตุผลที่ต้องยก 20% หมดอายุไปแล้ว** ตอนที่เขียนไว้ ตัวละครยืนอยู่ที่ 86% ของความสูงจอ
   ซึ่งคือแถบเดียวกับที่นิ้วโป้งพาดอยู่พอดี ตอนนี้กล้องเล็งให้ลำตัวอยู่ที่ราว 53% แล้ว (ดู CAM.viewBot)
   ใต้ตัวละครลงมาเป็นหมอกกับฟ้า ไม่ใช่พื้นที่เล่น นิ้วบังตรงนั้นไม่เสียอะไรเลย
   เหลือไว้แค่พ้นแถบ gesture / ขีดโฮม ของมือถือ ซึ่งยังกินการแตะอยู่ถ้าชิดขอบเกินไป */
#sc-touch { padding-bottom: max(7vh, calc(24px + env(safe-area-inset-bottom,0px))); }
#sc-touch { padding-bottom: max(7dvh, calc(24px + env(safe-area-inset-bottom,0px))); }
body.sc-touch #sc-touch { display:flex; }
/* กล่องที่ห่อปุ่มต้องปิด double-tap zoom ด้วย ไม่ใช่แค่ตัวปุ่ม — นิ้วที่พลาดลงช่องว่างระหว่างปุ่ม
   สองทีติดกันคือสาเหตุที่จอซูมเองตอนกดรัว ๆ (ดูคอมเมนต์ touch-action ใน index.html) */
#sc-tools, #sc-touch, #sc-touch .stick, #sc-touch .acts { touch-action:none; }
/* กันแว่นขยาย/เมนูคัดลอกของ iOS ทั้งแผงคุม ไม่ใช่เฉพาะตัวปุ่ม
   ที่ว่างระหว่างปุ่มกับพื้นหลังของแผงก็เป็น element ที่นิ้วแตะค้างได้เหมือนกัน
   ของเดิมใส่ไว้แค่ที่ <button> ซึ่งพอมีพื้นผิวที่ไม่ใช่ปุ่ม (จอยลอย) ก็หลุดทันที */
#sc-tools, #sc-tools *, #sc-touch, #sc-touch *, #sc-mute, #sc-pause-btn {
  -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent;
  user-select:none; -webkit-user-select:none; }
/* ต่อเน็ตแล้วเครื่องมือซ้อมใช้ไม่ได้ (แก้ sim ข้างเดียว = หลุดกัน) ซ่อนไปเลยดีกว่าให้กดแล้วเงียบ */
body.sc-net #sc-tools, body.sc-net #sc-tune { display:none; }
/* ── หน้าคนเล่น vs หน้านักพัฒนา ──
   เปิดเกมมาเห็นกรอบชนสีเขียว/แดง ข้อมูลเฟรม และปุ่มเครื่องมือเก้าปุ่มพร้อมกัน
   = คนที่ได้ลิงก์ไปกดเล่นคิดว่าเกมยังไม่เสร็จ ทั้งที่มันเสร็จแล้ว
   ของพวกนั้นไม่ได้ผิด แค่ไม่ใช่ของที่คนเล่นต้องเห็น จึงซ่อนไว้ใต้ปุ่มเฟืองปุ่มเดียว
   เลือกซ่อนด้วย CSS ไม่ใช่ลบปุ่มออกจาก DOM เพราะ syncTools() อ่าน textContent ของปุ่มพวกนี้อยู่ */
body:not(.sc-dev) #sc-tools button[data-dev] { display:none; }
#sc-tools .dev-toggle { opacity:.45; padding:6px 8px; }
body.sc-dev #sc-tools .dev-toggle { opacity:1; }
/* ---------- จอยลอย (floating joystick) ----------
   แตะตรงไหนในโซนซ้ายก็ได้ วงแหวนไปโผล่ตรงนั้น — ไม่ต้องเล็งปุ่มก่อนเริ่มเดิน
   d-pad แบบเดิมบังคับให้นิ้วต้องหาปุ่มให้เจอก่อน ซึ่งบนจอที่ไม่มีสัมผัสตอบกลับคือการเดาล้วน ๆ
   โซนกินครึ่งซ้ายทั้งแถบ แต่ pointer-events อยู่ที่โซน ไม่ใช่ที่วงแหวน วงแหวนจึงไม่ขวางนิ้ว */
/* จอยเป็น <div> ไม่ใช่ <button> — ซึ่งเป็นที่มาของอาการ "จอซูมเอง" บน iOS รอบนี้
   นิ้วโป้งแตะค้างบน div เปล่า ๆ นาน ๆ (ซึ่งคือท่าเล่นปกติของจอย) iOS จะเปิดแว่นขยายเลือกข้อความ
   ปุ่มเดิมไม่เคยเจอเพราะ <button> ไม่มีพฤติกรรมนี้ และกดแป๊บเดียวปล่อย
   touch-action กันได้แค่ double-tap กับ scroll ไม่ได้กันแว่นขยาย ต้องปิด callout/selection ตรง ๆ */
#sc-touch .stick { position:absolute; left:0; bottom:0; width:48%; height:78%; pointer-events:auto;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
  -webkit-tap-highlight-color:transparent; }
#sc-touch .stick .ring, #sc-touch .stick .knob { position:absolute; border-radius:50%; pointer-events:none;
  opacity:0; transition:opacity .12s; transform:translate(-50%,-50%); }
#sc-touch .stick .ring { width:132px; height:132px; border:2.5px solid rgba(242,237,227,.5);
  background:radial-gradient(circle, rgba(12,17,28,.42) 0%, rgba(12,17,28,.16) 70%, transparent 100%);
  box-shadow:0 0 18px rgba(0,0,0,.45), inset 0 0 18px rgba(0,0,0,.3); }
#sc-touch .stick .knob { width:56px; height:56px; border:2px solid rgba(242,237,227,.85);
  background:radial-gradient(circle at 35% 30%, rgba(242,237,227,.55), rgba(12,17,28,.75));
  box-shadow:0 0 14px rgba(0,0,0,.5); }
#sc-touch .stick.on .ring, #sc-touch .stick.on .knob { opacity:1; }
/* ---------- ปุ่มท่าฝั่งขวา: วางเป็นส่วนโค้งตามนิ้วโป้ง ไม่ใช่ตาราง ----------

   ของเดิมเป็นตาราง 2 คอลัมน์ ซึ่งคิดจาก "จัดของให้เป็นระเบียบ" ไม่ใช่จาก "นิ้วโป้งไปถึงตรงไหน"
   นิ้วโป้งหมุนรอบโคนนิ้วที่มุมขวาล่าง ปลายนิ้วจึงกวาดเป็น**ส่วนโค้ง** ไม่ใช่สี่เหลี่ยม
   ปุ่มที่อยู่มุมบนซ้ายของตารางคือปุ่มที่ต้องยืดนิ้วไปหา ซึ่งคือปุ่มที่กดพลาดบ่อยที่สุด

   วางใหม่เป็นสองชั้นโค้ง:
   - ชั้นใน (รัศมีสั้น) = ท่าที่กดตลอดเวลา — ตี · กระโดด · กัน
   - ชั้นนอก (รัศมียาว) = สกิลสามช่อง ซึ่งกดเป็นจังหวะ ไม่ใช่ทุกวินาที
   "ตี" อยู่ใกล้โคนนิ้วที่สุดและใหญ่ที่สุด เพราะเป็นปุ่มที่กดบ่อยที่สุดในเกม

   หกเหลี่ยมโปร่งกลาง ไม่ใช่ปุ่มทึบ — ปุ่มทึบขนาดนี้หกปุ่มบังพื้นที่เล่นไปมาก
   เห็นเกมผ่านปุ่มได้ทั้งที่ยังรู้ว่าปุ่มอยู่ตรงไหน

   แยกสีต่อท่า เพราะบนจอที่ไม่มีสัมผัสตอบกลับ คนเล่นจำ "ตำแหน่ง + สี" ไม่ใช่อ่านตัวหนังสือทุกครั้ง
   สีเอามาจากจานสีในเกมทั้งหมด ไม่ได้เลือกใหม่ลอย ๆ

   --u คือตัวคูณขนาดทั้งชุด มือถือจอเตี้ยย่อด้วยการเปลี่ยนเลขตัวเดียว ไม่ต้องไล่แก้ทุกปุ่ม */
/* กล่อง .acts กินพื้นที่ 252x252 แต่ปุ่มกินจริงแค่ส่วนโค้ง เหลือมุมบนซ้ายของกล่องว่างเยอะ
   ปล่อยให้กล่องรับการแตะทั้งใบ = แตะที่ว่างแล้วโดนกลืนไปเฉย ๆ จึงให้เฉพาะตัวปุ่มรับ */
#sc-touch .acts { --u:1; position:relative; pointer-events:none;
  width:calc(252px * var(--u)); height:calc(252px * var(--u)); }
/* ── ปุ่มกลมแบบ Kenney ──
   เคยเป็นหกเหลี่ยมโปร่งกลาง เปลี่ยนเป็นวงกลมทึบอ่อน ๆ ตามชุด Onscreen Controls ของ Kenney
   ซึ่งเป็นภาษาปุ่มที่เกมมือถือใช้กันจนคนเล่นรู้จักอยู่แล้ว — ไม่ต้องเรียนรู้ใหม่
   วาดด้วย CSS + SVG ในไฟล์ ไม่ได้โหลดรูปจากชุดของเขา (เลี่ยงไฟล์เพิ่มและเรื่องเครดิต)

   พื้นเข้มโปร่ง + ขอบสว่างบาง ๆ ให้ลอยอยู่ได้ทั้งบนฟ้ากลางวันและบนหินเข้ม
   **สียังแยกต่อท่าเหมือนเดิม** แต่ย้ายไปอยู่ที่ "ไอคอนกับขอบ" แทนที่จะถมทั้งปุ่ม
   บนจอที่ไม่มีสัมผัสตอบกลับ คนเล่นจำ "ตำแหน่ง + สี" ทิ้งสีไปคือทิ้งครึ่งหนึ่งของสิ่งที่เขาจำ
   แต่ถมทั้งปุ่มหกปุ่มก็บังพื้นที่เล่นมากเกิน — เอาสีไว้ที่ขอบได้ทั้งสองอย่าง */
#sc-touch .hex { position:absolute; pointer-events:auto; padding:0; box-shadow:none;
  display:grid; place-items:center; line-height:1; border-radius:50%;
  background:rgba(16,20,30,.55); border:calc(2.5px * var(--u)) solid currentColor;
  backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
  box-shadow:0 calc(2px * var(--u)) calc(10px * var(--u)) rgba(0,0,0,.45), inset 0 0 calc(12px * var(--u)) rgba(0,0,0,.35);
  transition:transform .06s ease, background .06s ease; }
#sc-touch .hex svg { width:52%; height:52%; display:block; fill:currentColor;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.8)); }
/* กดแล้วต้องเห็นว่ากด — จอสัมผัสไม่มีแรงสะท้อนกลับ ปุ่มที่ไม่ตอบสนองอ่านว่า "กดไม่ติด" */
#sc-touch .hex:active { background:rgba(242,237,227,.38); transform:scale(.93); }

/* ชั้นใน — ท่าที่กดตลอดเวลา
   ปุ่มกระโดดชิดขวาสุด (right:0) ส่วนปุ่มตีถอยเข้ามา 8 — นิ้วโป้งจึงโยกขึ้น-ลงระหว่างสองปุ่มนี้
   ได้โดยไม่ต้องขยับโคนนิ้ว แทนที่จะซ้อนกันตรง ๆ ซึ่งทำให้กดพลาดสลับกัน
   ไม่ใช้ค่าติดลบเพื่อดันออกนอกกล่อง — ขยับทั้งชุดด้วยระยะขอบของ #sc-touch แทน
   (ค่าติดลบทำให้ "ระยะห่างจากมุม" ที่เทสต์ใช้ตรวจลำดับชั้นอ่านไม่ออก) */
#sc-touch .atk { width:calc(92px * var(--u)); height:calc(92px * var(--u));
  right:calc(8px * var(--u)); bottom:calc(4px * var(--u)); color:#ff6b73; }
#sc-touch .jmp { width:calc(72px * var(--u)); height:calc(72px * var(--u));
  right:calc(0px * var(--u)); bottom:calc(104px * var(--u)); color:#7fe3a6; }
#sc-touch .blk { width:calc(72px * var(--u)); height:calc(72px * var(--u));
  right:calc(108px * var(--u)); bottom:calc(12px * var(--u)); color:#7fbaff; }

/* ชั้นนอก — สกิลสามช่อง กดเป็นจังหวะ ไม่ใช่ทุกวินาที จึงเล็กกว่าและอยู่ไกลกว่า
   สล็อตที่ยังไม่มีสกิลขึ้นจางและกดไม่ได้ จะได้รู้ว่าเตรียมที่ไว้ให้แล้วแต่ยังว่าง */
#sc-touch .skills { touch-action:none; }
/* 60 px ตอนเต็ม = 45.6 px ตอนย่อบนมือถือ ซึ่ง**เพิ่งพ้น**ระยะแตะขั้นต่ำ 44 px ของ iOS
   ของเดิม 52 ได้แค่ 39.5 ซึ่งต่ำกว่าเกณฑ์ และเป็นสิ่งที่ผู้เล่นบ่นว่ากดยาก */
#sc-touch .sk { width:calc(60px * var(--u)); height:calc(60px * var(--u));
  font:700 calc(22px * var(--u))/1 var(--font); color:#ffd166;
  text-shadow:0 1px 3px rgba(0,0,0,.9); }
#sc-touch .s1 { right:calc(192px * var(--u)); bottom:calc(96px * var(--u)); }
#sc-touch .s2 { right:calc(118px * var(--u)); bottom:calc(158px * var(--u)); }
#sc-touch .s3 { right:calc(38px * var(--u)); bottom:calc(192px * var(--u)); }
#sc-touch .skills button[disabled] { opacity:.32; }
/* ฝั่งซ้ายเตี้ยกว่าฝั่งขวาเท่าตัว จึงยกได้สูงกว่า — ผู้เล่นบ่นเรื่องนิ้วซ้ายบังก่อนเป็นอันดับแรก */

/* มือถือแนวนอนสูงราว 390 px เท่านั้น ปุ่มขนาดเดสก์ท็อปกินไปแล้ว 256 px = 66% ของจอ
   ยกขึ้นไม่ได้เลยถ้าไม่ย่อก่อน — ย่อแล้วเหลือ ~199 px ถึงจะมีที่ให้ยก
   ตัวเลขยังอยู่เหนือระยะแตะขั้นต่ำ 44 px ของ iOS ทุกปุ่ม ยกเว้นแถวสกิลที่กดไม่บ่อยเท่า */
@media (max-height: 500px) {
  /* ย่อทั้งชุดด้วยเลขตัวเดียว — ปุ่ม "ตี" ยังได้ 59 px ซึ่งเกินระยะแตะขั้นต่ำ 44 px ของ iOS
     ปุ่มสกิลได้ 39 px ซึ่งต่ำกว่าเกณฑ์นิดหน่อย แลกมาโดยตั้งใจเพราะกดไม่บ่อยเท่า
     และอยู่ห่างจากปุ่มอื่นพอที่นิ้วพลาดแล้วไม่ไปโดนปุ่มข้าง ๆ (เป็นของแถมจากการวางเป็นส่วนโค้ง) */
  #sc-touch .acts { --u:.76; }
  #sc-touch .stick .ring { width:112px; height:112px; }
  #sc-touch .stick .knob { width:48px; height:48px; }
}

/* ---------- หน้าเลือกตัวละคร ----------
   คุมความสูงเป็นหลัก ไม่ใช่ความกว้าง: มือถือแนวนอนสูงแค่ ~390 px ซึ่งเตี้ยกว่าจอคอมครึ่งหนึ่ง
   ทุกก้อนจึงวัดจาก dvh และการ์ดวางนอน (รูปซ้าย ข้อความขวา) เพื่อกินความสูงให้น้อยที่สุด */
/* ── เมนูหยุดพัก ──
   ยืมหน้าตาจากแผงเลือกตัวมาทั้งชุด (พื้นมืดโปร่ง + เบลอ + การ์ดกลางจอ)
   ไม่ได้ออกแบบใหม่โดยตั้งใจ — สองแผงนี้เป็นของชนิดเดียวกัน (แผงที่ทับเกมอยู่)
   ทำหน้าตาต่างกันแปลว่าคนเล่นต้องเรียนรู้สองแบบทั้งที่ความหมายเดียวกัน
   z-index สูงกว่าแผงเลือกตัว เพราะกดหยุดตอนอยู่หน้าเลือกตัวก็ต้องเห็นเมนูนี้ */
#sc-pause { position:absolute; inset:0; z-index:32; display:none; align-items:center; justify-content:center;
  background:rgba(8,12,20,.86); backdrop-filter:blur(4px); font:14px var(--font); color:var(--ink);
  touch-action:none; -webkit-tap-highlight-color:transparent; }
#sc-pause.open { display:flex; }
#sc-pause .wrap { width:min(88vw,340px); display:flex; flex-direction:column; gap:max(1.2dvh,7px);
  padding:max(2dvh,14px) 18px; background:var(--card); border:1px solid var(--line);
  border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); text-align:center; }
#sc-pause h2 { margin:0 0 2px; font-size:clamp(16px,3.4dvh,22px); font-weight:700; letter-spacing:.04em; }
#sc-pause .pbtn { font:600 clamp(14px,2.8dvh,16px) var(--font); padding:12px 14px; border-radius:10px;
  border:1px solid var(--line); background:rgba(233,227,214,.08); color:var(--ink); cursor:pointer; }
#sc-pause .pbtn:hover { background:rgba(233,227,214,.16); }
#sc-pause .pbtn:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
#sc-pause .pbtn.primary { background:var(--crimson); border-color:var(--crimson); color:#fff; }
#sc-pause .pbtn.primary:hover { background:var(--crimson-hi); border-color:var(--crimson-hi); }
#sc-pause .pbtn.danger { color:var(--dim); }
#sc-pause .pbtn.danger:hover { color:var(--ink); }
#sc-pause .pbtn[hidden] { display:none !important; }
#sc-pause .note { margin:2px 0 0; font-size:clamp(11px,2.2dvh,13px); color:var(--gold); min-height:1.2em; }
/* ปุ่มหยุดพักอยู่ข้างปุ่มปิดเสียง ไม่อยู่ในแถวเครื่องมือ — แถวนั้นถูกซ่อนทั้งแถวตอนต่อเน็ต
   แต่ "ออกจากห้อง" เป็นสิ่งที่ต้องทำได้ตอนต่อเน็ตมากกว่าตอนเล่นคนเดียวด้วยซ้ำ */
#sc-pause-btn { position:absolute; z-index:31; width:38px; height:38px; border-radius:10px;
  display:grid; place-items:center; font-size:15px; line-height:1; padding:0;
  left:calc(54px + env(safe-area-inset-left,0px)); top:calc(18dvh + env(safe-area-inset-top,0px)); }
/* ตอนแผงเลือกตัวเปิดอยู่ ปุ่มสองตัวนี้ลอยทับการ์ดใบซ้ายบนพอดี (z-index สูงกว่าแผงโดยตั้งใจ
   เพราะเพลงเล่นตั้งแต่หน้านี้ ต้องปิดเสียงได้) ย้ายไปมุมบนสุดซึ่งเป็นที่ว่างข้างหัวข้อแทนการซ่อน */
body.sc-picking #sc-mute,
body.sc-picking #sc-pause-btn { top:calc(6px + env(safe-area-inset-top,0px)); }

#sc-select { position:absolute; inset:0; z-index:30; display:none; align-items:center; justify-content:center;
  background:rgba(8,12,20,.82); backdrop-filter:blur(3px); font:14px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6;
  touch-action:none; -webkit-tap-highlight-color:transparent; }
#sc-select.open { display:flex; }
#sc-select .wrap { width:min(96vw,860px); max-height:94dvh; overflow-y:auto; display:flex; flex-direction:column;
  align-items:center; gap:max(1.4dvh,6px); padding:max(1.6dvh,8px) 14px; }
#sc-select h2 { margin:0; font-size:clamp(15px,3.4dvh,22px); font-weight:700; letter-spacing:.5px; }
#sc-select .hint { color:#9aa3b5; font-size:clamp(11px,2.2dvh,13px); margin:0; text-align:center; }

/* แถบสองฝั่ง: บอกว่าตอนนี้กำลังเลือกให้ใคร ฝั่งที่กำลังเลือกมีกรอบแดง */
#sc-select .slots { display:flex; align-items:center; gap:10px; }
#sc-select .side { display:flex; flex-direction:column; gap:5px; }
#sc-select .slot { min-width:clamp(104px,22vw,150px); padding:5px 10px; border-radius:10px; text-align:center;
  border:2px solid rgba(233,227,214,.22); background:rgba(233,227,214,.07); }
#sc-select .slot.pickable { cursor:pointer; }
#sc-select .slot.active { border-color:#c8323c; background:rgba(200,50,60,.18); }
#sc-select .slot .tag { display:block; font-size:clamp(9px,1.8dvh,11px); color:#9aa3b5; }
#sc-select .slot .who { font-weight:700; font-size:clamp(13px,2.6dvh,17px); }
#sc-select .slot.waiting .who { color:#9aa3b5; font-weight:600; }
#sc-select .vs { color:#9aa3b5; font-weight:700; font-size:clamp(11px,2.2dvh,14px); }
/* ปุ่มสุ่ม — เล็กกว่าปุ่มเริ่ม เพราะเป็นทางเลือก ไม่ใช่ทางหลัก
   วางใต้การ์ดไม่ใช่ข้างปุ่มเริ่ม กันนิ้วพลาดไปกดสุ่มตอนจะกดเริ่ม */
#sc-select .rand { font:600 clamp(12px,2.4dvh,14px) var(--font); padding:7px 16px; border-radius:9px;
  border:1px solid rgba(233,227,214,.28); background:rgba(233,227,214,.08); color:var(--dim); cursor:pointer; }
#sc-select .rand:hover { background:rgba(233,227,214,.16); color:var(--ink); }
#sc-select .rand:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

/* การ์ดตัวละคร — เรียงแนวนอน ล้นแล้วตัดบรรทัดเอง ใส่ตัวใหม่ใน CHARACTERS แล้วโผล่เองไม่ต้องแก้ CSS */
/* ── ตารางการ์ด ──
   แผนเดิมคือ "ให้ทุกใบอยู่แถวเดียว" ซึ่งใช้ได้ถึง 5 ใบ ตอนนี้มี 8 ใบแล้ว
   (ตัวละครจริง 6 + ตัวที่ยังไม่ปล่อย 2) ทางเดิมจึงหมดอายุไปแล้วจริง ๆ
   ปัญหาที่คอมเมนต์เดิมเตือนไว้เป็นของจริง: การ์ดขึ้นแถวสองแล้วดันปุ่ม "เริ่ม" ตกขอบจอมือถือ
   ซึ่งแปลว่าเลือกตัวเสร็จแล้วกดเริ่มไม่ได้ — เป็นทางตันที่ไม่มีอะไรบอก

   ทางแก้: ให้ **ตารางเลื่อนในกล่องของตัวเอง** แทนที่จะดันของข้างล่างออกไป
   ปุ่มเริ่มจึงอยู่ที่เดิมเสมอไม่ว่าจะมีการ์ดกี่ใบ เพิ่มตัวละครอีกสิบตัวก็ไม่กระทบ
   overscroll-behavior:contain กันการเลื่อนทะลุไปเลื่อนแผงข้างหลัง (พฤติกรรมของ iOS) */
#sc-select .grid { display:flex; flex-wrap:wrap; justify-content:center; align-items:stretch; gap:8px;
  max-height:min(46dvh,320px); overflow-y:auto; overscroll-behavior:contain;
  padding:2px; width:100%; }
#sc-select .card { display:flex; gap:7px; align-items:center; width:clamp(155px,23vw,230px); padding:6px 8px 6px 5px;
  border:2px solid rgba(233,227,214,.22); border-radius:12px; background:rgba(233,227,214,.07); text-align:left; }
#sc-select .card.on { border-color:#c8323c; background:rgba(200,50,60,.2); }
/* กรอบรูปต้อง overflow:hidden — เฟรมในอัตลาสวางติดกัน ตัวที่ผอมกว่ากรอบจะเห็นเฟรมข้าง ๆ โผล่มาด้วย
   (Helios ขึ้นเป็นสองคนอยู่พักหนึ่งเพราะเรื่องนี้) ตัวรูปจริงเป็นลูกข้างในที่ขนาดเท่าเฟรมเป๊ะ */
#sc-select .card .pic { position:relative; overflow:hidden; flex:0 0 auto; width:clamp(44px,9vw,60px);
  height:clamp(58px,13dvh,84px); border-radius:8px; background:rgba(8,12,20,.5); }
#sc-select .card .pic i { position:absolute; display:block; image-rendering:pixelated; background-repeat:no-repeat; }
#sc-select .card .info { display:flex; flex-direction:column; gap:1px; min-width:0; }
#sc-select .card .name { font-weight:700; font-size:clamp(13px,2.6dvh,17px); letter-spacing:.5px; }
/* ฉายาคือชื่อในตำนาน (Nyx / Helios / ...) ส่วนชื่อใหญ่คือชื่อเล่นของคนที่เล่นตัวนั้น — ดู CHARACTERS */
#sc-select .card .title { color:#ffd166; font-style:italic; font-size:clamp(10px,2dvh,12px); }
#sc-select .card .tip b { color:#e9e3d6; font-weight:600; }
#sc-select .card .tip,
#sc-select .card .skills { color:#9aa3b5; font-size:clamp(9px,1.8dvh,11px); line-height:1.35; }
#sc-select .card .skills { margin-top:2px; color:#b9c1d0; }
/* การ์ดตัวที่ยังไม่ปล่อย — ขอบประ + จางลง อ่านออกทันทีว่ายังกดไม่ได้ ไม่ต้องลองกดก่อน */
#sc-select .card.soon { opacity:.5; border-style:dashed; cursor:default; }
#sc-select .card.soon .name { color:#9aa3b5; letter-spacing:1px; }
/* ทับ image-rendering:pixelated ของการ์ดปกติ — นั่นมีไว้ให้เฟรมในอัตลาสคม
   แต่เงาเป็นภาพย่อธรรมดา เปิดพิกเซลไว้แล้วขอบหยักเป็นบันได */
#sc-select .card.soon .pic i { inset:0; width:100%; height:100%;
  background-size:contain; background-position:center bottom; image-rendering:auto; }

/* ── จอเตี้ย (มือถือแนวนอน สูงราว 390-420 px): การ์ดใหญ่ขึ้น เลื่อนน้อยลง ──
   ผู้เล่นรายงานว่า "เอานิ้วเลื่อนลำบาก" ซึ่งมีสองสาเหตุคนละเรื่อง แก้แยกกัน:
   1. **กล่องเลื่อนเตี้ยเกิน** (46dvh = 190 px) ต่ำกว่าความสูงการ์ดแถวเดียวนิดเดียว
      นิ้วจึงต้องลากในช่องแคบ ๆ ซ้ำหลายครั้ง — ขยายกล่องแล้วเห็นเกือบครบในหน้าเดียว
   2. **การ์ดสูงเพราะข้อความตัดบรรทัดเยอะ** การ์ดแคบ -> คำอธิบายไทยตัดเป็น 3-4 บรรทัด
      ขยายการ์ดให้กว้างขึ้นทำให้ "เตี้ยลง" ซึ่งฟังดูย้อนแย้งแต่เป็นแบบนั้นจริง

   ที่ว่างมาจากการซ่อนบรรทัดคำแนะนำ (แตะที่ช่องด้านบน...) ซึ่งอ่านครั้งเดียวก็พอ
   และตัดคำอธิบายเหลือสองบรรทัด — ความสูงการ์ดจึงคาดเดาได้ ไม่ขึ้นกับความยาวข้อความของแต่ละตัว */
@media (max-height: 520px) {
  #sc-select .wrap { gap:max(.8dvh,4px); padding:max(1dvh,5px) 10px; }
  #sc-select h2 { font-size:15px; }
  #sc-select .hint { display:none; }
  #sc-select .grid { max-height:66dvh; gap:7px; }
  #sc-select .card { width:clamp(200px,31%,300px); padding:7px 10px 7px 6px; gap:9px; }
  #sc-select .card .pic { width:58px; height:68px; }
  #sc-select .card .name { font-size:16px; }
  #sc-select .card .title { font-size:11px; }
  #sc-select .card .tip, #sc-select .card .skills { font-size:10px; }
  /* ตัดคำอธิบายที่สองบรรทัด ชื่อสกิลที่หนึ่งบรรทัด — การ์ดทุกใบจึงสูงเท่ากันเป๊ะ */
  #sc-select .card .tip { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
    overflow:hidden; }
  #sc-select .card .skills { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  /* บีบแถวอื่นให้เตี้ยลงทุกแถว เอาที่ว่างไปให้ตารางการ์ด — ตารางถูกบีบด้วยของรอบตัว
     ไม่ได้ถูกบีบด้วย max-height ของมันเอง เพิ่ม max-height อย่างเดียวจึงไม่มีผล */
  #sc-select .slot { padding:3px 8px; }
  #sc-select .rand { padding:5px 14px; }
  #sc-select .go { padding:7px 16px; }
}

#sc-select .modes { display:flex; gap:6px; }
#sc-select button { font:600 clamp(12px,2.4dvh,15px) "Chakra Petch", system-ui, sans-serif; color:#e9e3d6;
  background:rgba(233,227,214,.14); border:1px solid rgba(233,227,214,.28); border-radius:10px; padding:7px 14px;
  touch-action:none; -webkit-tap-highlight-color:transparent; }
#sc-select .modes button.on { background:rgba(200,50,60,.55); border-color:#c8323c; }
#sc-select .go { min-width:clamp(150px,32vw,220px); padding:9px 18px; background:#c8323c; border-color:#c8323c;
  font-size:clamp(14px,2.8dvh,18px); font-weight:700; }
#sc-select .go[disabled] { opacity:.45; }
#sc-select .note { color:#9aa3b5; font-size:clamp(10px,2dvh,12px); min-height:1em; text-align:center; }

/* กำลังเลือกตัวอยู่ ปุ่มเล่น/เครื่องมือต้องหลบไปก่อน ไม่งั้นนิ้วไปโดนปุ่มใต้แผง */
body.sc-picking #sc-touch, body.sc-picking #sc-tools, body.sc-picking #sc-tune { display:none; }
`;

const OVERLAY_HTML = `
<button id="sc-mute" title="เปิด/ปิดเสียง" aria-label="เปิด/ปิดเสียง">♫</button>
<button id="sc-pause-btn" title="หยุดพัก" aria-label="หยุดพัก" data-sfx="click">&#9208;</button>
<div id="sc-tools">
  <button data-tool="KeyB">เลือกตัว</button>
  <button data-tool="KeyZ">Zoom</button>
  <button data-tool="KeyR">Reset</button>
  <button data-tool="KeyH" data-dev="1">Hitboxes</button>
  <button data-tool="Digit0" data-dev="1">Dummy: Stand</button>
  <button data-tool="Digit4" data-dev="1">Tech: Off</button>
  <button data-tool="KeyO" data-dev="1">Slow-mo</button>
  <button data-tool="KeyT" data-dev="1">Tune</button>
  <button data-tool="KeyF" data-dev="1">Hz</button>
  <button data-tool="KeyG" class="dev-toggle" title="เครื่องมือนักพัฒนา">&#9881;</button>
</div>
<div id="sc-pause">
  <div class="wrap">
    <h2>หยุดพัก</h2>
    <button class="pbtn primary" data-act="resume" data-sfx="start">เล่นต่อ</button>
    <button class="pbtn" data-act="select">เลือกตัวละคร</button>
    <button class="pbtn danger" data-act="quit" data-sfx="back">ออกไปหน้าแรก</button>
    <p class="note"></p>
  </div>
</div>
<div id="sc-select">
  <div class="wrap">
    <h2>เลือกตัวละคร</h2>
    <div class="slots">
      <div class="side" data-team="0"></div>
      <span class="vs">VS</span>
      <div class="side" data-team="1"></div>
    </div>
    <p class="hint"></p>
    <div class="grid"></div>
    <button class="rand" data-sfx="pick">สุ่มตัวละคร</button>
    <div class="modes">
      <button data-mode="solo">ซ้อมกับหุ่น</button>
      <button data-mode="local">2 คน เครื่องเดียว</button>
      <button data-mode="team">2v2 (คนจริง 2 + AI 2)</button>
    </div>
    <button class="go">เริ่ม</button>
    <p class="note"></p>
  </div>
</div>
<div id="sc-tune"></div>
<div id="sc-touch">
  <div class="stick"><div class="ring"></div><div class="knob"></div></div>
  <div class="acts">
    <button class="hex atk" data-code="KeyJ" aria-label="ตี"><svg viewBox="0 0 24 24"><path d="M19.5 2.2 12 9.7l2.3 2.3 7.5-7.5-.2-2.3zM9.9 11.8 3.3 18.4l-.9 3.2 3.2-.9 6.6-6.6zM6.6 15.1l2.3 2.3-1.1 1.1-2.3-2.3z"/></svg></button>
    <button class="hex jmp" data-code="Space" aria-label="กระโดด"><svg viewBox="0 0 24 24"><path d="M12 2.6 4.4 10.2l2.1 2.1L12 6.9l5.5 5.4 2.1-2.1zM12 11.3 4.4 18.9l2.1 2.1L12 15.6l5.5 5.4 2.1-2.1z"/></svg></button>
    <button class="hex blk" data-code="KeyL" aria-label="กัน"><svg viewBox="0 0 24 24"><path d="M12 1.8 3.6 5v6.4c0 5.2 3.6 9.4 8.4 10.8 4.8-1.4 8.4-5.6 8.4-10.8V5zm0 2.4 6 2.3v4.9c0 4-2.6 7.2-6 8.4-3.4-1.2-6-4.4-6-8.4V6.5z"/></svg></button>
    <div class="skills">
      <button class="hex sk s1" data-code="Digit1" data-slot="1">1</button>
      <button class="hex sk s2" data-code="Digit2" data-slot="2">2</button>
      <button class="hex sk s3" data-code="Digit3" data-slot="3">3</button>
    </div>
  </div>
</div>`;

const TUNE = [
  ['run', 'Move speed', 2.5, 10, 0.1],   // ไม่มีท่าเดินแล้ว เหลือความเร็วเดียว
  ['runAccelMul', 'Run acceleration', 0.6, 3, 0.1],
  ['jumpV', 'Jump strength', -26, -14, 0.5],
  ['dJumpV', 'Double jump strength', -24, -12, 0.5],
  ['gravity', 'Gravity', 0.5, 1.6, 0.05],
];
const DEFAULTS = Object.fromEntries(TUNE.map(([k]) => [k, PHYS[k]]));
/** ค่าปรับจูนปัจจุบันเป็นก้อนเดียว — ต้องส่งข้ามเน็ต เพราะ sim สองฝั่งจะเดินตรงกันได้ก็ต่อเมื่อ PHYS เท่ากัน
 *  (แผง Tune เซฟค่าลง localStorage ใครเคยลากสไลเดอร์ไว้ เครื่องนั้นจะฟิสิกส์ต่างจากเพื่อนถาวร) */
export const tuneSnapshot = () => Object.fromEntries(TUNE.map(([k]) => [k, PHYS[k]]));
export const applyTune = (t) => { for (const k in DEFAULTS) if (typeof t?.[k] === 'number') PHYS[k] = t[k]; };
try { const saved = JSON.parse(localStorage.getItem('scramble-tune') || '{}'); for (const k in saved) if (k in DEFAULTS) PHYS[k] = saved[k]; } catch (e) {}
function buildTune() {
  const el = document.getElementById('sc-tune');
  el.innerHTML = '<b>Movement tuning</b>' + TUNE.map(([k, name, min, max, step]) =>
    `<label><span>${name}</span><span id="v-${k}">${Math.abs(PHYS[k])}</span></label><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${PHYS[k]}">`).join('')
    + '<div class="row"><button id="sc-tune-copy">Copy values</button><button id="sc-tune-reset">Defaults</button></div>';
  el.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
    PHYS[i.dataset.k] = parseFloat(i.value);
    document.getElementById('v-' + i.dataset.k).textContent = Math.abs(PHYS[i.dataset.k]);
    try { localStorage.setItem('scramble-tune', JSON.stringify(Object.fromEntries(TUNE.map(([k]) => [k, PHYS[k]])))); } catch (e) {}
  }));
  document.getElementById('sc-tune-reset').onclick = () => { Object.assign(PHYS, DEFAULTS); try { localStorage.removeItem('scramble-tune'); } catch (e) {} buildTune(); };
  document.getElementById('sc-tune-copy').onclick = () => {
    const txt = TUNE.map(([k, name]) => `${name}: ${Math.abs(PHYS[k])}`).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      () => { document.getElementById('sc-tune-copy').textContent = 'Copied'; },
      () => { prompt('Copy these values', txt); });
  };
}

// ---------- ฉาก (ยกจาก prototype) ----------
class ScrambleScene extends Phaser.Scene {
  // คีย์ต้องตรงกับที่ mode.config.js ระบุไว้ (scene: "ScrambleScene") และที่ index.html ลงทะเบียน
  // ไม่งั้น scene.start() จะหาไม่เจอแล้วจอค้างดำโดยไม่มี error ให้เห็น
  constructor() { super('ScrambleScene'); }

  preload() {
    for (const art of Object.values(CHAR_ART)) {
      if (art.artPending) continue;   // ยังไม่มีไฟล์ให้โหลด วาดเป็นกล่องไปก่อน
      this.load.atlas(art.atlasKey, art.texture, art.data);
    }
    for (const b of Object.values(SFX.bank))
      for (const f of b.files)
        if (!this.cache.audio.exists('sfx_' + f))
          this.load.audio('sfx_' + f, [SFX.dir + f + '.ogg', SFX.dir + f + '.m4a']);
    this.load.image('stageSky', STAGE_ART.sky);
    this.load.image('stageFar', STAGE_ART.far);
    this.load.image('stageNear', STAGE_ART.near);
    this.load.image('stageGround', STAGE_ART.ground);
    for (const n of new Set(STAGE_ART.plat)) this.load.image('stage_' + n, `assets/stage/${n}.png`);
    this.load.json('stageMeta', STAGE_ART.meta);
    this.load.atlas('vfx', 'assets/vfx/vfx.png', 'assets/vfx/vfx.json');
  }

  /** วางเลเยอร์เวทีตามพิกัดจริงของ sim — เรียกครั้งเดียวตอนสร้างฉาก
   *
   *  ถ้าไฟล์เวทีโหลดไม่ขึ้น (เน็ตหลุดกลางทาง / ยังไม่ได้ build) ให้ตกกลับไปวาดฉากเมืองแบบเดิม
   *  ดีกว่าปล่อยจอว่างเปล่าแล้วคนเล่นไม่รู้ว่าพื้นอยู่ตรงไหน
   */
  _buildStage() {
    const meta = this.cache.json.get('stageMeta');
    if (!meta || !this.textures.exists('stageGround')) { drawBackground(this.add.graphics(), this.viewW ?? STAGE.w); return false; }
    this.parallax = [];

    // pad = ขยายเผื่อระยะเลื่อน ไม่งั้นเลื่อนแล้วเห็นขอบภาพ
    // ชั้นที่เลื่อนเยอะต้องเผื่อเยอะตามส่วน (near 0.185 x 640 = 118 px ต้องมีที่ว่างเกินนั้น)
    // ภาพวาดเต็มจอ ไม่ใช่เต็มพื้นที่เล่น — ตอนต่อเน็ตเวทีแคบกว่าจอได้ ส่วนเกินต้องไม่โล่ง
    // จัดกลางที่ "กลางเวที" ไม่ใช่กลางจอ เพราะกล้องเลื่อนไปแล้วครึ่งหนึ่งของส่วนเกิน
    const vw = this.viewW ?? STAGE.w;
    const sky = this.add.image(STAGE.w / 2, STAGE.h / 2, 'stageSky').setDepth(-40);
    sky.setScale(Math.max(vw / sky.width, STAGE.h / sky.height) * PARALLAX.sky.pad);
    this.parallax.push({ img: sky, x0: sky.x, y0: sky.y, k: PARALLAX.sky, drift: PARALLAX.drift });

    // สองชั้นนี้เกาะเส้นพื้น ไม่ใช่กึ่งกลางจอ — หน้าผาสองข้างต้องต่อกับพื้นล่างเสมอ
    // ไม่ว่าจอจะสูงเท่าไหร่ (เวทีกว้าง 1280-1920 แต่สูง 720 คงที่)
    for (const [key, cfg] of [['stageFar', PARALLAX.far], ['stageNear', PARALLAX.near]]) {
      const im = this.add.image(STAGE.w / 2, STAGE.groundY + MID_DROP, key)
        .setDepth(key === 'stageFar' ? -32 : -28).setOrigin(0.5, 1);
      im.setScale(vw / im.width * cfg.pad);
      this.parallax.push({ img: im, x0: im.x, y0: im.y, k: cfg, drift: 0 });
    }

    // พื้นล่างยืดเต็มความกว้างเวที ส่วนสูงคงสัดส่วนเดิมไว้ ไม่ให้หินยืดจนดูผิดรูป
    const gm = meta.ground, gs = vw / gm.w;
    const groundTop = STAGE.groundY - gm.surface * gs;
    this.add.image((STAGE.w - vw) / 2, groundTop, 'stageGround')
      .setOrigin(0, 0).setScale(gs).setDepth(-10);
    // ขอบล่างของรูปพื้นคือรอยตัดตรง ๆ เพราะเดิมมันอยู่นอกจอ — ตอนนี้กล้องลงไปเห็นแล้ว
    this._drawAbyss(groundTop + gm.h * gs);

    // แพลตฟอร์ม: ย่อให้ "กว้างเท่ากรอบชนจริง" แล้ววางให้ผิวบนตรงกับ p.y เป๊ะ
    // เสาหินรูนสองข้างจึงกลายเป็นตัวบอกขอบแพลตฟอร์มพอดี — อ่านออกว่าสุดตรงไหนโดยไม่ต้องลอง
    STAGE.platforms.forEach((p, i) => {
      const name = STAGE_ART.plat[i], m = meta[name];
      if (!m || !this.textures.exists('stage_' + name)) return;
      const sc = (p.x2 - p.x1) / m.w;
      this.add.image(p.x1, p.y - m.surface * sc, 'stage_' + name).setOrigin(0, 0).setScale(sc).setDepth(-10);
    });

    return true;
  }

  /** ใต้เกาะ — ฟ้ากับเมฆ ลงไปจนถึงก้นที่กล้องมองได้ (CAM.viewBot)
   *
   *  ต้องมีเพราะกล้องเลื่อนลงต่ำกว่าเส้นพื้นได้แล้ว (ดู CAM.viewBot ว่าทำไมถึงต้องเลื่อน)
   *  ถ้าไม่วาด ใต้พื้นจะเป็นสีพื้นหลังของ canvas = แถบทึบพาดขวางก้นจอตลอดเกม
   *
   *  ลึกกว่าหน้าผา (-28) และเกาะไกล (-32) แต่ตื้นกว่าฟ้า (-40)
   *  รูปพื้นล่าง (-10) ทับมันอยู่แล้ว ส่วนที่โผล่จึงมีแค่ "ที่ที่รูปพื้นวาดไม่ถึง"
   *  ซึ่งลึกไม่เท่ากันในแต่ละจอ (รูปพื้นถูกย่อตามความกว้างจอ) วาดคลุมเกินจึงถูกกว่าคำนวณให้พอดี
   *
   *  เมฆสุ่มด้วย rng ที่มีเมล็ดคงที่ ไม่ใช่ Math.random — วาดกี่ครั้งก็ได้ภาพเดิม
   *  และเป็นการวาดล้วน ไม่ได้ผ่าน sim จึงไม่เกี่ยวกับ netplay
   */
  _drawAbyss(seamY = STAGE.groundY + 160) {
    const vw = Math.max(this.viewW ?? STAGE.w, STAGE.w), x0 = (STAGE.w - vw) / 2;
    const top = STAGE.groundY, bot = CAM.viewBot, span = bot - top;
    const g = this.add.graphics().setDepth(-34);
    for (let y = 0; y < span; y += 4) {
      g.fillStyle(mixHex(C.abyssTop, C.abyssBot, y / span), 1);
      g.fillRect(x0, top + y, vw, 4);
    }
    // เมฆบาง ๆ ไกล ๆ ให้รู้ว่าเป็นอากาศ ไม่ใช่เหวมืด — อยู่หลังเกาะ
    const r = rng(23);
    for (let i = 0; i < 16; i++) {
      const cx = x0 + r() * vw, cy = top + 60 + r() * (span - 70);
      const w = 150 + r() * 280, h = 14 + r() * 24;
      g.fillStyle(C.cloud, 0.10 + r() * 0.10);
      g.fillEllipse(cx, cy, w, h);
      g.fillStyle(C.cloud, 0.07);
      g.fillEllipse(cx + w * 0.18, cy + h * 0.35, w * 0.66, h * 0.8);
    }

    // ── แนวเมฆหน้าเกาะ: ปิดรอยตัดขอบล่างของรูปพื้น ──
    //
    // รูปพื้นจบด้วยเส้นตรงแนวนอน เพราะตอนออกแบบมันอยู่ใต้ขอบจอ ไม่มีใครเห็น
    // พอกล้องเลื่อนลงได้ เส้นนั้นกลายเป็น "เกาะถูกตัดด้วยไม้บรรทัด" กลางจอ
    // ต้องอยู่ **หน้า** รูปพื้น (-9 > -10) ไม่ใช่หลัง — เมฆที่อยู่หลังบังรอยตัดไม่ได้เลย
    // เดินเป็นช่วงคงที่แล้วสุ่มเยื้องเอา ไม่ใช่สุ่มตำแหน่งล้วน: ช่วง 110 กับวงกว้างอย่างน้อย 220
    // การันตีว่าทุกจุดถูกทับอย่างน้อยสองวง จึงไม่มีช่องให้เส้นตรงโผล่
    const r2 = rng(91);
    const cg = this.add.graphics().setDepth(-9);
    for (let x = x0 - 140; x < x0 + vw + 140; x += 110) {
      const w = 260 + r2() * 200, h = 66 + r2() * 44;
      cg.fillStyle(C.cloud, 0.5 + r2() * 0.28);
      cg.fillEllipse(x + (r2() - 0.5) * 24, seamY - 10 + (r2() - 0.5) * 22, w, h);
    }
    // ชายเมฆบาง ๆ ห้อยลงไปอีกชั้น ให้ขอบล่างของแนวเมฆไม่ใช่เส้นตรงอีกเส้นหนึ่ง
    for (let x = x0 - 140; x < x0 + vw + 140; x += 150) {
      cg.fillStyle(C.cloud, 0.16 + r2() * 0.14);
      cg.fillEllipse(x + (r2() - 0.5) * 60, seamY + 40 + r2() * 46, 200 + r2() * 200, 34 + r2() * 30);
    }
  }

  /** โหลดเพลงแบบเบื้องหลังแล้วเริ่มเล่นเมื่อพร้อม
   *
   *  ไม่ใช้ this.load ของฉาก เพราะนั่นคือคิวที่ฉากรอให้เสร็จก่อนเริ่ม
   *  ใช้ตัวโหลดแยกที่สั่งเริ่มเอง ฉากจึงเดินต่อได้ทันทีโดยไม่ต้องรอไฟล์ 2.2 MB
   *
   *  เบราว์เซอร์มือถือห้ามเล่นเสียงจนกว่าจะมีการแตะจากคนจริง ๆ
   *  ตรงนี้ผ่านแล้วเพราะเข้าฉากนี้ได้ต้องกดปุ่มจากเมนูมาก่อน แต่ยังเช็คซ้ำเผื่อ autoplay policy
   */
  _startMusic() {
    if (localStorage.getItem(BGM.store) === '1') { this.muted = true; return; }
    if (this.cache.audio.exists(BGM.key)) { this._playMusic(); return; }
    const ld = new Phaser.Loader.LoaderPlugin(this);
    ld.audio(BGM.key, BGM.files);
    ld.once('complete', () => this._playMusic());
    ld.start();
  }

  _playMusic() {
    if (this.music || this.muted) return;
    this.music = this.sound.add(BGM.key, { loop: true, volume: 0 });
    // ปลดล็อกเสียงตอนแตะครั้งแรก ถ้าเบราว์เซอร์ยังล็อกอยู่ (นโยบาย autoplay)
    if (this.sound.locked) this.sound.once('unlocked', () => this.music?.play());
    else this.music.play();
    this.tweens.add({ targets: this.music, volume: BGM.vol, duration: BGM.fadeIn });
    this.events.once('shutdown', () => { this.music?.stop(); this.music?.destroy(); this.music = null; });
  }

  /** เล่นเสียงเอฟเฟคหนึ่งครั้ง — สุ่มไฟล์ สุ่มเสียงสูงต่ำ
   *
   *  เรียกจากฝั่งวาดเท่านั้น ห้ามเรียกจาก `core.js` เด็ดขาด — ซิมต้องไม่รู้จักเสียง
   *  เหมือนที่มันไม่รู้จักภาพ ไม่งั้นเล่นข้ามเครื่องแล้วสองฝั่งเดินไม่ตรงกัน
   *
   *  `gap` กันสองเสียงเดียวกันที่ห่างกันไม่ถึงเฟรม (เช่นระเบิดโดนทั้งสองคนพร้อมกัน)
   *  ไฟล์เดียวกันเล่นซ้อนห่างกันไม่กี่มิลลิวินาทีจะหักล้างกันเป็นเสียงหวีด ไม่ใช่ดังขึ้น
   */
  _sfx(name, opts) {
    if (this.muted) return;
    const b = SFX.bank[name];
    if (!b) return;
    const now = this.time.now;
    this._sfxAt = this._sfxAt || {};
    if (now - (this._sfxAt[name] || -1e9) < SFX.gap) return;
    const key = 'sfx_' + b.files[(Math.random() * b.files.length) | 0];
    if (!this.cache.audio.exists(key)) return;   // ยังไม่มีไฟล์ = เงียบ ไม่ใช่พัง
    this._sfxAt[name] = now;
    this.sound.play(key, {
      volume: SFX.vol * (b.vol ?? 1) * (opts?.vol ?? 1),
      detune: (b.detune ?? 0) + (Math.random() * 2 - 1) * SFX.jitter,
    });
  }

  /** ปิด/เปิดเสียง — จำไว้ข้ามรอบเล่นด้วย localStorage
   *  คนที่ปิดเสียงเพราะอยู่บนรถเมล์ ไม่ควรต้องปิดใหม่ทุกครั้งที่เข้าเกม */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(BGM.store, this.muted ? '1' : '0');
    if (this.muted) { this.music?.stop(); this.music?.destroy(); this.music = null; }
    else this._startMusic();
    return this.muted;
  }

  /** แถบมืดบน-ล่าง ให้ตัวหนังสือ HUD อ่านออกบนฟ้าสว่าง
   *
   *  HUD ทั้งชุดออกแบบไว้ตอนฉากหลังเป็นเมืองกลางคืน พอเปลี่ยนเป็นฟ้ากลางวัน
   *  ชื่อตัวละคร หลอดเลือด ปุ่มเครื่องมือ และบรรทัดบอกปุ่มด้านล่าง จมหายไปกับพื้นหลังทันที
   *  ไล่ไล่ระดับให้จางหายตรงกลางจอ พื้นที่เล่นจริงจึงยังสว่างเต็มที่ ไม่ได้มืดลงทั้งจอ
   *
   *  **เป็นของกล้อง UI ไม่ใช่ของในโลก** — มันคือฉากหลังของ HUD ไม่ใช่ส่วนหนึ่งของเวที
   *  ตอนกล้องยังตรึงอยู่กลางเวทีสองอย่างนี้แยกกันไม่ออก แต่พอกล้องเลื่อนลงได้ (CAM.viewBot)
   *  แถบที่วาดในพิกัดโลกจะเลื่อนตามไปด้วย = HUD ลอยอยู่บนฟ้าสว่างโดยไม่มีแถบรองอีกต่อไป
   *  อยู่บนกล้อง UI แล้วพิกัดจึงเป็นพิกัดจอตรง ๆ (0..viewW) ไม่ต้องหักกลางเวทีอีก
   */
  _stageScrim() {
    const g = this.add.graphics().setDepth(-5);
    const dark = 0x0c111c;
    const vw = this.viewW ?? STAGE.w;
    // ทึบคงที่ตลอดแถว HUD ก่อน แล้วค่อยไล่จางลงด้านล่าง
    // ถ้าไล่จางตั้งแต่ขอบบน บรรทัดคำบรรยายตัวละคร (y=78) จะได้ความทึบแค่ 0.27 ซึ่งยังอ่านไม่ออก
    for (let i = 0; i < SCRIM_TOP; i += 4) {
      const t = Math.max(0, (i - SCRIM_SOLID) / (SCRIM_TOP - SCRIM_SOLID));
      g.fillStyle(dark, 0.62 * (1 - t));
      g.fillRect(0, i, vw, 4);
    }
    for (let i = 0; i < SCRIM_BOT; i += 4) {
      g.fillStyle(dark, 0.55 * (i / SCRIM_BOT));
      g.fillRect(0, STAGE.h - SCRIM_BOT + i, vw, 4);
    }
    return g;
  }
  create() {
    activeScene = this;
    this._mountOverlay();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    // ถอดทุกอย่างคืนตอนออกจากฉาก ไม่งั้น DOM ค้างทับจอ และปุ่มที่กดในฉากอื่นจะถูกโหมดนี้กินไปด้วย
    this.events.once('shutdown', () => this._unmountOverlay());
    this.events.once('destroy', () => this._unmountOverlay());
    // ล็อบบี้ต่อห้องไว้แล้ว = เข้าโหมดข้ามเครื่องทันที · PeerJS เป็นแค่ท่อหนึ่งแบบที่เสียบเข้ามา
    const ses = getSession();
    const online = ses.mode !== 'offline' && !!ses.conn;

    // ── ความกว้างเวที: เล่นคนเดียวเท่าจอ · เล่นข้ามเครื่องเท่ากันทั้งสองฝั่งเสมอ ──
    //
    // เวทีกว้างเท่าผืนเกม กำแพงจึงอยู่ขอบจอพอดี ไม่เหลือแถบมืดสองข้างให้ดูเหมือนเกมไม่เต็มจอ
    // **แต่ผืนเกมกว้างตามสัดส่วนจอ (1280-1920) ซึ่งคนละเครื่องไม่เท่ากัน**
    // จุดเกิด กำแพง และแพลตฟอร์ม คิดจากความกว้างเวทีทั้งหมด = สองเครื่องเกิดคนละที่ตั้งแต่เฟรมแรก
    // แล้วหลุดกันทันทีโดยไม่มีอะไรฟ้อง ซึ่งเป็น desync ที่หาสาเหตุยากที่สุดแบบหนึ่ง
    //
    // ตอนต่อเน็ตจึงล็อกไว้ที่ความกว้างพื้นฐาน (1280) ซึ่งทุกเครื่องรู้ค่าเหมือนกันโดยไม่ต้องคุยกันเลย
    // ไม่ต้องต่อรองผ่านแพ็คเก็ต = ไม่มีทางที่สองฝั่งจะตกลงกันไม่ได้ และแท็บเก่าก็ไม่เกี่ยว
    // ผืนเกมกว้างสุด 1280 อยู่แล้ว เวทีจึงไม่มีทางล้นจอ (ดู MIN_GAME_WIDTH)
    //
    // ต้องตั้งก่อน new Game() เพราะจุดเกิดของทุกคนอ่าน STAGE ตอนสร้าง
    // และก่อน _buildStage() เพราะภาพเวทีวางตามตำแหน่งแพลตฟอร์มจริง
    this.viewW = this.sys.game.config.width;
    setStageWidth(online ? STAGE_BASE_W : this.viewW);
    // จอกว้างกว่าเวทีเท่าไหร่ ก็เลื่อนกล้องไปครึ่งหนึ่งของส่วนเกิน เวทีจึงอยู่กลางจอเสมอ
    // ส่วนเกินไม่ใช่แถบดำ — ภาพฉากหลังกับพื้นถูกวาดเต็มจอ เห็นเป็นพื้นที่นอกกำแพง
    // ซึ่งมีอยู่แล้วตั้งแต่แรก (กำแพงเว้นจากขอบเวที wallL px)
    this.stagePad = (this.viewW - STAGE.w) / 2;

    this.versus = this.versus ?? 'solo';   // 'solo' = ซ้อมกับหุ่น · 'local' = สองคนคีย์บอร์ดเดียว
    this.sim = new Game();
    this._syncSkillSlots();   // ต้องหลัง new Game() — อ่านสกิลจากตัวละครของผู้เล่น
    if (online) {
      // ที่นั่งกับจำนวนคนมาจากชั้นท่อ ไม่ใช่เดาจาก isHost — ห้องสี่คนขึ้นกับว่าใครต่อเข้ามาก่อน
      const recv = this.startNet({
        isHost: ses.mode === 'host', seat: ses.seat, seats: ses.seats, send: sendNetPacket });
      ses.onData = recv;
      ses.onClose = () => this.endNet('อีกฝั่งหลุดการเชื่อมต่อ');
      ses.onError = () => this.endNet('การเชื่อมต่อมีปัญหา');
    }
    this.acc = 0; this.timeScale = 1; this.paused = false; this.stepOnce = false;
    // โหมดนักพัฒนา — จำไว้ข้ามรอบเล่น คนที่เปิดไว้ไม่ต้องเปิดใหม่ทุกครั้ง
    // กรอบชนเริ่มที่ "ปิด" เสมอ ไม่ผูกกับโหมดนี้ เปิดโหมดแล้วได้แค่ "ปุ่มโผล่มาให้กด"
    // ซึ่งเดาได้ง่ายกว่าการที่กดเฟืองทีเดียวแล้วจอเปลี่ยนไปหลายอย่างพร้อมกัน
    this.dev = this._devSaved();
    this.showBoxes = false;
    // ลูกศรเหนือหัวเปิดไว้เสมอ — ตัวแปรมีไว้ให้ปิดได้ตอนถ่ายภาพ/ดีบั๊ก ไม่ใช่ตัวเลือกของคนเล่น
    this.showTags = true;
    document.body.classList.toggle('sc-dev', this.dev);
    this.sparks = []; this.popups = []; this.comboFade = 0;
    this._buildStage();
    this._startMusic();
    this.world = this.add.graphics();
    this.fx = this.add.graphics();
    // ทุกชิ้นที่กล้อง UI เป็นคนวาด — ต้องเก็บไว้ตอนสร้าง ไม่ใช่ไปไล่หาทีหลังจากชนิดของอ็อบเจกต์
    this.uiObjects = [];
    // แถบมืดรอง HUD ต้องเป็นชิ้นแรก — วาดก่อนทุกอย่างที่มันรองอยู่
    this.uiObjects.push(this._stageScrim());
    this.hud = this.add.graphics();
    this.uiObjects.push(this.hud);
    // HUD เกาะขอบ "จอ" ไม่ใช่ขอบพื้นที่เล่น — กล้อง UI ไม่เลื่อนตามกล้องโลก
    // เล่นคนเดียวสองค่านี้เท่ากันอยู่แล้ว · ต่อเน็ตเวทีแคบกว่าจอได้ HUD ต้องยังอยู่ขอบจอ
    const W = this.viewW;
    // บนมือถือมีปุ่มเต็มจอ (DOM) ทับมุมขวาบนอยู่ หลบให้พ้นไม่งั้นชื่อฝั่งขวาอ่านไม่ออก
    // 56 px บนจอ แปลงเป็นพิกัดเวที = 56 * (720 / ความสูงจอจริง) ซึ่งประมาณ 100 บนมือถือแนวนอน
    const RPAD = 60 + (isTouch ? 100 : 0);
    const T = (x, y, s, size, color, origin = 0) => {
      const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: '600' }).setOrigin(origin, 0);
      this.uiObjects.push(t);
      return t;
    };
    this.tTitle = T(W / 2, 14, '', 26, C.ink, 0.5).setFontStyle('700');
    this.tSub = T(W / 2, 44, 'Training', 14, C.dim, 0.5);
    // ชื่ออยู่ **ใต้รูปกลม** ตัวเล็ก ไม่ใช่พาดหัวตัวใหญ่ — รูปบอกว่าใครอยู่แล้ว
    // ชื่อมีไว้ตอนสองฝั่งเลือกตัวเดียวกัน ซึ่งเป็นกรณีเดียวที่รูปแยกไม่ออก
    // จัดกลางเหนือ/ใต้รูปของคนแรกในทีม ตำแหน่งจริงตั้งใน _syncMatchHud()
    // ชื่ออยู่ตรงที่แถบมืดรอง HUD จางไปแล้วราวครึ่งหนึ่ง (y≈116) — สีจาง ๆ จะกลืนกับฟ้ากลางวัน
    // ใส่ขอบเข้มรอบตัวอักษรแทนการเพิ่มความทึบของแถบ ซึ่งจะไปบังพื้นที่เล่นเพิ่มโดยไม่จำเป็น
    this.tP1 = T(60, 100, 'NYX', 12, C.ink, 0.5).setStroke('#0c111c', 3);
    this.tP2 = T(W - RPAD, 100, 'Training dummy', 12, C.ink, 0.5).setStroke('#0c111c', 3);
    this.tMode = T(W - RPAD, 136, '', 12, C.dim, 1);   // ใต้ชื่อ ไม่ทับกัน (เฉพาะโหมดซ้อม)
    // ฉายา ("The Fury of Silence") ย้ายไปอยู่แต่บนหน้าเลือกตัว — บนจอสู้มันคือตัวหนังสือที่ไม่มีใครอ่าน
    this.tP1Sub = T(60, 118, '', 11, C.dim);
    this.tP2Sub = T(W - RPAD, 118, '', 11, C.dim, 1);
    this.tCombo = T(1210, 150, '', 44, '#ffffff', 1).setFontStyle('700');
    this.tComboSub = T(1210, 200, '', 16, C.ink, 1);
    this.tMove = T(60, 646, '', 14, C.ink);
    this.tHelp = T(W - 60, 688, isTouch ? '' : this.helpLine(), 12, C.dim, 1);
    this.tHelp2 = T(W - 60, 703, '', 12, C.dim, 1);   // ข้อความจริงตั้งใน _syncDevText()
    this.tStatus = T(W / 2, 90, '', 16, '#ffffff', 0.5);
    // ป้ายน็อก/ผู้ชนะ กลางจอ ตัวใหญ่ — อ่านออกจากอีกฝั่งโซฟาได้
    this.tKo = T(W / 2, 250, '', 64, '#ffffff', 0.5).setFontStyle('700').setDepth(20);
    this.tKoSub = T(W / 2, 330, '', 20, C.ink, 0.5).setDepth(20);
    this.tPace = T(60, 96, '', 13, '#ffd166');   // ใต้ฉายา เหนือแถบข้อมูลท้ายจอที่จะทับ
    // เฉพาะของที่อยู่ "แถวบน" เท่านั้นที่จางตอนมีคนยืนชั้นสูง
    // ป้ายน็อก ตัวนับคอมโบ และแถบข้อมูลท้ายจอไม่อยู่ในแถบนั้น จางไปด้วยก็มีแต่เสีย
    this.hudTop = [this.hud, this.tTitle, this.tSub, this.tP1, this.tP2, this.tMode,
      this.tP1Sub, this.tP2Sub, this.tPace];
    this._splitCameras();
    this._syncDevText();
    // วางกล้องให้ถูกตั้งแต่เฟรมแรก ไม่ใช่ให้มันค่อย ๆ เลื่อนเข้าที่ตอนเปิดเกม
    this.camFollow = true;
    this._stepCamera(this.sim, true);
    this._initSprites();
    this._syncMatchHud();
    this.syncTools();
    // ต่อห้องอยู่แล้ว startNet เปิดหน้าเลือกตัวให้เอง (ต้องรออีกฝั่งด้วย) เล่นออฟไลน์ก็เปิดเลย
    if (this.phase !== 'select') this.openSelect();
  }

  /** เมนูหยุดพัก — ทางออกเดียวที่ไม่ใช่การรีเฟรชหน้าเว็บ
   *
   *  **ต่อเน็ตแล้วหยุดเกมไม่ได้** lockstep เดินด้วยอินพุตของทั้งสองฝั่ง
   *  ฝ่ายเดียวหยุดคือฝ่ายนั้นเลิกส่งอินพุต แล้วอีกฝั่งค้างรอไปเรื่อย ๆ โดยไม่รู้ว่าทำไม
   *  จึงเปิดเมนูได้แต่เกมยังเดินอยู่ และบอกตรง ๆ บนเมนูว่าเกมยังเดิน
   *  (เกมออนไลน์ทุกเกมทำแบบนี้ ไม่ใช่ข้อจำกัดของเราคนเดียว)
   */
  _wireMenu(root) {
    this.menuEl = root.querySelector('#sc-pause');
    root.querySelector('#sc-pause-btn')?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this._toggleMenu();
    });
    this.menuEl?.addEventListener('pointerdown', (e) => {
      const b = e.target.closest?.('[data-act]');
      // แตะพื้นมืดนอกการ์ด = ปิดเมนู (เหมือนกดเล่นต่อ) เป็นท่าที่คนคาดหวังอยู่แล้ว
      if (!b) { if (e.target === this.menuEl) { e.preventDefault(); this._closeMenu(); } return; }
      e.preventDefault();
      this._menuAct(b.dataset.act);
    });
  }

  _toggleMenu() { this.menuEl?.classList.contains('open') ? this._closeMenu() : this._openMenu(); }

  _openMenu() {
    if (!this.menuEl) return;
    const net = this.versus === 'net';
    // หยุด sim เฉพาะตอนเล่นเครื่องเดียว — ดูเหตุผลที่หัวเมธอด _wireMenu
    if (!net) this.paused = true;
    // ตอนต่อเน็ตก็กลับไปเลือกตัวได้ — พากันกลับทั้งสองฝั่ง ไม่ใช่ฝ่ายเดียวหายไปจากเกม
    this.menuEl.querySelector('[data-act="select"]').hidden = false;
    this.menuEl.querySelector('[data-act="select"]').textContent =
      net ? 'กลับไปเลือกตัวละคร (ทั้งสองฝั่ง)' : 'เลือกตัวละคร';
    this.menuEl.querySelector('[data-act="quit"]').textContent = net ? 'ออกจากห้อง' : 'ออกไปหน้าแรก';
    this.menuEl.querySelector('.note').textContent = net ? 'ต่อเน็ตหยุดเกมไม่ได้ — เกมยังเดินอยู่' : '';
    this.menuEl.classList.add('open');
    document.getElementById('sc-pause-btn')?.classList.add('on');
  }

  _closeMenu() {
    if (!this.menuEl) return;
    this.menuEl.classList.remove('open');
    document.getElementById('sc-pause-btn')?.classList.remove('on');
    if (this.versus !== 'net') this.paused = false;
  }

  _menuAct(act) {
    if (act === 'resume') { this._closeMenu(); return; }
    if (act === 'select') { this._closeMenu(); this.toSelect(); return; }
    if (act === 'quit') {
      // ไม่มีใครลงทะเบียนทางออกไว้ = อย่าปิดเมนูทิ้ง
      // ปิดแล้วผู้เล่นจะเห็นว่าเมนูหายแต่ยังอยู่ในเกม ซึ่งดูเหมือนปุ่มเสีย
      if (!quitToLobby()) {
        this.menuEl.querySelector('.note').textContent = 'ออกไม่ได้ตอนนี้ — ลองรีเฟรชหน้าเว็บ';
        return;
      }
      this._closeMenu();
    }
  }

  /** กล้องสองตัว: กล้องโลกซูม/สั่น/เลื่อนได้ · กล้อง UI นิ่งเสมอ
   *
   *  ต้องแยกเพราะ HUD เป็นอ็อบเจกต์ในโลกเหมือนตัวละคร ใช้กล้องเดียวแล้วซูมทีหลอดเลือดโตตาม
   *  และตอนกล้องสั่น (มีอยู่แล้วทุกครั้งที่ตีหนัก) ตัวเลขบน HUD ก็สั่นไปด้วย
   *
   *  ทำตอนนี้ทั้งที่ยังไม่มีซูม เพราะ **การแยกคือส่วนที่แพง** ส่วนซูมเป็นแค่ตัวเลขที่ใส่ทีหลังได้
   *  ของแถมที่ได้ทันทีคือกล้องสั่นแล้ว HUD นิ่ง ซึ่งอ่านง่ายกว่าเดิม
   *
   *  วิธีแบ่ง: เก็บลิสต์ของ UI ไว้ตอนสร้าง (uiObjects) ที่เหลือใน children คือของในโลกทั้งหมด
   *  ไม่เดาจากชนิดหรือ depth เพราะทั้งสองชั้นมีทั้ง graphics ทั้ง text ปนกันอยู่
   */
  _splitCameras() {
    if (this.uiCam) return;
    this.uiCam = this.cameras.add(0, 0, this.viewW, STAGE.h).setName('ui');
    this.cameras.main.ignore(this.uiObjects);
    this.uiCam.ignore(this.children.list.filter((o) => !this.uiObjects.includes(o)));
  }

  /** กล้องตามตัวละคร — เรียกทุกรอบวาด ไม่ใช่ทุกเฟรมของ sim
   *
   *  **การวาดล้วน** อ่านตำแหน่งจาก sim แต่ไม่เขียนอะไรกลับ sim เลย
   *  netplay จึงไม่กระทบ และเพราะอ่านจาก sim ที่เดินตรงกันอยู่แล้ว
   *  สองเครื่องจึงได้กล้องตรงกันเองโดยไม่ต้องส่งอะไรเพิ่ม
   *
   *  ขอบเขตที่กล้องออกไม่ได้คือ "ขอบอาร์ต" ไม่ใช่ขอบพื้นที่เล่น —
   *  อาร์ตกว้างเท่าจอ (viewW) วางกลางเวที ที่ซูม 1 กล้องจึงถูกบีบให้อยู่กลางเวทีพอดี
   *  = เหมือนตอนยังไม่มีซูมเป๊ะ ปิดปุ่ม Zoom แล้วได้ภาพเดิมกลับมาทุกพิกเซล
   *
   *  ใช้ centerOn ไม่ใช่ setScroll เพราะ scrollX ของ Phaser ไม่ได้คิดซูมให้
   *  (ซูมคิดจากจุดกลางกล้อง) เผลอใช้ setScroll แล้วภาพจะเยื้องทุกครั้งที่ซูมไม่เท่า 1
   *
   *  @param snap true = วางทันทีไม่ต้องไหลเข้าหา (ตอนเปิดฉาก)
   */
  _stepCamera(s, snap = false) {
    const cam = this.cameras?.main;
    if (!cam || !s?.fighters?.length) return;
    // ปิดปุ่ม Zoom = ปิดทั้งการตามตัวและซูมกระตุก จะได้เทียบกับภาพเดิมได้ตรง ๆ
    if (!this.camFollow) this.camPunch = 0;
    let minX = Infinity, maxX = -Infinity, top = Infinity, bot = -Infinity;
    for (const f of s.fighters) {
      if (f.x < minX) minX = f.x;
      if (f.x > maxX) maxX = f.x;
      if (f.y - CAM.headroom < top) top = f.y - CAM.headroom;
      if (f.y > bot) bot = f.y;
    }
    // กรอบที่ต้องเห็นให้ครบ แล้วดูว่าซูมได้เท่าไหร่โดยที่ทุกคนยังอยู่ในจอ
    // เอาค่าที่น้อยกว่าระหว่างแกนนอนกับแกนตั้ง — คนกระจายทางไหนก็ต้องเห็นครบทางนั้น
    const needW = (maxX - minX) + CAM.marginX * 2;
    const needH = (bot - top) + CAM.marginY * 2;
    const fit = Math.min(this.viewW / needW, STAGE.h / needH);
    const want = this.camFollow ? Math.min(CAM.max, Math.max(CAM.min, fit)) : CAM.min;

    const z0 = this.camZoom ?? want;
    const k = snap ? 1 : (want < z0 ? CAM.outLerp : CAM.inLerp);
    // camZoom = ค่าฐานที่ไหลเข้าหาเป้า · ซูมกระตุกบวกทับตอนเอาไปใช้ ไม่เก็บลงค่าฐาน
    // ถ้าบวกลงค่าฐาน มันจะกลายเป็นตำแหน่งตั้งต้นของการไหลรอบหน้า แล้วซูมจะค้างสูงขึ้นเรื่อย ๆ
    const base = this.camZoom = z0 + (want - z0) * k;
    const punch = this.camPunch = snap ? 0 : (this.camPunch ?? 0) * CAM.punchDecay;
    const z = base + (punch > 0.0005 ? punch : 0);

    // เก็บค่าที่ไหลแล้วแบบ "ยังไม่บีบขอบ" ไว้ ค่อยบีบตอนเอาไปใช้
    // ถ้าเก็บค่าที่บีบแล้ว พอซูมเปลี่ยนขอบก็เปลี่ยน แล้วกล้องจะกระตุกเป็นก้าว ๆ
    const p = snap ? 1 : CAM.panLerp;
    const wantX = (minX + maxX) / 2, wantY = (top + bot) / 2;
    const x0 = this.camX ?? wantX, y0 = this.camY ?? wantY;
    const cx = this.camX = x0 + (wantX - x0) * p;
    const cy = this.camY = y0 + (wantY - y0) * p;

    const artL = -this.stagePad, artR = artL + this.viewW;
    // ปิดปุ่ม Zoom = กลับไปใช้ก้นเดิม (STAGE.h) ซึ่งตรึงกล้องไว้กลางเวทีเป๊ะเหมือนก่อนมีฟีเจอร์นี้
    // ถ้าปล่อยให้เลื่อนลงได้ตอนปิด "ปิดแล้วได้ภาพเดิมทุกพิกเซล" จะไม่จริงอีกต่อไป
    const artB = this.camFollow ? CAM.viewBot : STAGE.h;
    const halfW = this.viewW / (2 * z), halfH = STAGE.h / (2 * z);
    cam.setZoom(z);
    cam.centerOn(
      Math.max(artL + halfW, Math.min(artR - halfW, cx)),
      Math.max(halfH, Math.min(artB - halfH, cy)));
  }

  /** สองคนแชร์คีย์บอร์ดเดียวกันอยู่ไหม — ถ้าใช่ ฝั่ง 1 ยืม numpad ของฝั่ง 2 มาใช้ไม่ได้
   *  (ดู ALONE_EXTRA) · ซ้อมกับหุ่นและต่อเน็ตต่างก็มีคนจริงคนเดียวต่อเครื่อง */
  sharedKeyboard() { return this.versus === 'local' || this.versus === 'team'; }

  /** ช่องไหนใน fighters คือตัวที่ "เรา" คุม — แหล่งความจริงเดียว
   *  เดิมเขียน `isHost ? 0 : 1` กระจายอยู่หลายที่ ซึ่งพอมีสี่ที่นั่งจะผิดทุกจุดพร้อมกัน */
  mySeat() { return this.versus === 'net' ? (this.netSeat ?? (this.isHost ? 0 : 1)) : 0; }

  /** บรรทัดบอกปุ่มท้ายจอ — เปลี่ยนตามว่าตอนนี้ฝั่ง 1 ใช้ numpad ได้หรือเปล่า
   *  บอกปุ่มผิดแย่กว่าไม่บอก เพราะคนเล่นจะลองแล้วคิดว่าเกมเสีย ไม่ใช่คิดว่าตัวเองกดผิดปุ่ม */
  helpLine() {
    return this.sharedKeyboard()
      ? 'P1  A D / W S / Space / J / L / 1 2 3      P2  ← → / ↑ ↓ / Num0 / Num1 / Num3 / Num4 5 6'
      : 'Move A D   Aim W S   Jump Space   Attack Num1   Block Num8   Skills Num2 Num3 Num5';
  }

  /** ตำแหน่งกลางวงของทุกคน เรียงตามลำดับใน fighters — ทีมแรกชิดซ้าย ทีมสองชิดขวา
   *
   *  คิดใหม่ทุกครั้งที่เรียก ไม่ได้เก็บไว้ เพราะจำนวนคนเปลี่ยนได้กลางเกม (สลับโหมด 1v1 <-> 2v2)
   *  และความกว้างจอก็เปลี่ยนได้ (หมุนจอ) การเก็บค่าไว้แปลว่าต้องจำว่าต้องล้างเมื่อไหร่บ้าง
   */
  _podSpots(s) {
    const ts = s.teams();
    const rpad = POD.side + (isTouch ? 100 : 0);
    return s.fighters.map((f) => {
      const ti = Math.max(0, ts.indexOf(f.team));
      const mates = s.fighters.filter((o) => o.team === f.team);
      const mi = mates.indexOf(f);
      const x = ti === 0 ? POD.side + mi * POD.step : this.viewW - rpad - mi * POD.step;
      return { x, y: POD.top, f, ti };
    });
  }

  /** รูปวงกลมของแต่ละคน — สร้างครั้งเดียวต่อช่อง แล้วเปลี่ยนเท็กซ์เจอร์เมื่อสลับตัวละคร
   *
   *  ตัดเป็นวงกลมด้วย geometry mask ไม่ใช่ setCrop — setCrop ตัดได้แค่สี่เหลี่ยม
   *  หน้ากากไม่ได้อยู่ในลิสต์การวาด (`add: false`) มันจึงไม่ถูกกล้องไหนวาดเป็นภาพ
   *  แต่ยังใช้เป็นแม่พิมพ์ได้ — ถ้าเผลอใส่เข้าลิสต์ จะเห็นวงกลมทึบทับรูปพอดี
   */
  _syncPods(s) {
    this.pods ??= [];
    const spots = this._podSpots(s);
    const mine = this.mySeat();
    // ช่องเกินจากรอบก่อน (สลับ 2v2 -> 1v1) ต้องเก็บกวาด ไม่ใช่ปล่อยค้างเป็นรูปลอย
    while (this.pods.length > spots.length) this.pods.pop()?.img?.destroy();

    spots.forEach((sp, i) => {
      const art = CHAR_ART[sp.f.char];
      const k = i === mine ? POD.mine : 1;
      const r = POD.r * k;
      let pod = this.pods[i];
      if (!pod) pod = this.pods[i] = { img: null, char: null, r: 0, x: 0, y: 0 };
      if (!art || art.artPending || !this.textures.exists(art.atlasKey)) return;

      if (!pod.img) {
        pod.img = this._ui(this.add.image(0, 0, art.atlasKey, 'idle_1.png').setDepth(-4));
        pod.char = sp.f.char;
      } else if (pod.char !== sp.f.char) {
        pod.img.setTexture(art.atlasKey, 'idle_1.png');
        pod.char = sp.f.char;
      }
      // ตำแหน่ง/ขนาดเปลี่ยนเมื่อสลับตัวละคร ย้ายที่ หรือขนาดวงเปลี่ยน — ไม่ต้องคิดใหม่ทุกเฟรม
      if (pod.x !== sp.x || pod.y !== sp.y || pod.r !== r || pod.fitted !== pod.char) {
        this._fitPortrait(pod, art, sp.x, sp.y, r);
        pod.x = sp.x; pod.y = sp.y; pod.r = r; pod.fitted = pod.char;
      }
    });
  }

  /** ย่อ/วางรูปให้ "หัว" อยู่กลางวงพอดี ทุกตัวหัวเท่ากัน
   *
   *  วัดจาก meta ของชีต (standing/anchorX/feetY) ไม่ใช่จากกรอบเฟรม —
   *  ตัวที่ชีตถ่ายไกลกว่าจะหัวเล็กกว่าเพื่อนทันทีถ้าวัดจากกรอบ (ปัญหาเดียวกับรูปบนการ์ดเลือกตัว)
   */
  _fitPortrait(pod, art, cx, cy, r) {
    // **จุดยึดเป็นสัดส่วนของ canvas ไม่ใช่พิกัดของเฟรมในอัตลาส** — เฟรมถูก trim ไว้
    // ตำแหน่งของเฟรมในอัตลาส (fr.x/fr.y) จึงไม่ใช่ระยะที่ภาพถูกตัดขอบออก เอามาหักลบแล้วรูปหลุดจอ
    // วิธีเดียวกับที่ _applyCharTransform ใช้วางสไปรท์บนเวที ซึ่งพิสูจน์แล้วว่าถูก
    const m = art.meta ?? this.textures.get(art.atlasKey)?.customData?.meta;
    if (!m?.standing || !m.canvasW || !m.canvasH) return;
    const headY = m.feetY - m.standing * 0.87;   // กลางหัว วัดจากปลายเท้าขึ้นไป
    pod.img.setScale((r * 4.6) / m.standing)     // ทั้งตัวสูงราว 4.6 รัศมี = หัวเต็มวงพอดี
      .setOrigin(m.anchorX / m.canvasW, headY / m.canvasH)
      .setPosition(cx, cy);
    pod.mask?.destroy();
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0xffffff, 1).fillCircle(cx, cy, r);
    pod.mask = mg;
    pod.img.setMask(mg.createGeometryMask());
  }

  /** วงเลือด/วงพลัง/จุดบอกยก รอบรูปแต่ละคน — วาดใหม่ทุกเฟรมบน hud graphics
   *
   *  วงกวาดจากด้านบนลงสองข้างเท่า ๆ กัน (เว้นก้นวงไว้ให้จุดบอกยก) ไม่ได้เริ่มจากซ้ายไปขวา
   *  เพราะสองฝั่งของจอต้องอ่านเหมือนกัน ถ้ากวาดทางเดียว ฝั่งขวาจะดูเหมือนเลือดลดสวนทาง
   */
  _drawPods(s, hud) {
    const spots = this._podSpots(s);
    const mine = this.mySeat();
    const D = Math.PI / 180, half = POD.sweep / 2;
    spots.forEach((sp, i) => {
      const me = i === mine;
      const k = me ? POD.mine : 1;
      const r = POD.r * k, rr = r + POD.gap + POD.ring / 2;
      const dead = sp.f.hp <= 0;

      // พื้นหลังวงกลม: รูปวาดทับอยู่แล้ว แต่ตัวที่ยังไม่มีอาร์ตจะเหลือแค่วงนี้ ซึ่งยังอ่านออกว่าเป็นคน
      hud.fillStyle(POD.dim, dead ? 0.75 : 0.55);
      hud.fillCircle(sp.x, sp.y, r + 1);

      // รางวงเลือด แล้วทับด้วยส่วนที่เหลือจริง
      const frac = Math.max(0, Math.min(1, sp.f.hp / sp.f.maxHp));
      hud.lineStyle(POD.ring, POD.dim, 0.7);
      hud.beginPath(); hud.arc(sp.x, sp.y, rr, (-90 - half) * D, (-90 + half) * D); hud.strokePath();
      if (frac > 0) {
        hud.lineStyle(POD.ring, frac > 0.3 ? POD.full : POD.low, 1);
        hud.beginPath();
        hud.arc(sp.x, sp.y, rr, (-90 - half) * D, (-90 - half + POD.sweep * frac) * D);
        hud.strokePath();
      }

      // ของเรา: วงทองรอบนอก + วงพลังด้านใน — บอกทั้ง "อันไหนเรา" และ "กดอัลติได้หรือยัง" ที่เดียว
      if (me) {
        hud.lineStyle(2, POD.gold, 0.9);
        hud.strokeCircle(sp.x, sp.y, r + 2.5);
        const ki = Math.min(1, sp.f.ki / KI_MAX);
        const kr = rr + POD.ring / 2 + 3;
        hud.lineStyle(3, POD.dim, 0.6);
        hud.beginPath(); hud.arc(sp.x, sp.y, kr, (-90 - half) * D, (-90 + half) * D); hud.strokePath();
        if (ki > 0) {
          hud.lineStyle(3, ki >= 1 ? POD.kiFull : POD.ki, 1);
          hud.beginPath(); hud.arc(sp.x, sp.y, kr, (-90 - half) * D, (-90 - half + POD.sweep * ki) * D); hud.strokePath();
        }
      }

      // จุดบอกยกที่เหลือ วางใต้วง — จุดที่เสียไปเหลือแต่โครง
      if (s.match.on) {
        const left = s.match.bars[sp.f.team] ?? 0;
        const gap = POD.pip * 3;
        const x0 = sp.x - gap * (ROUND_BARS - 1) / 2;
        for (let n = 0; n < ROUND_BARS; n++) {
          const px = x0 + n * gap, py = sp.y + rr + POD.ring / 2 + 7;
          hud.fillStyle(POD.dim, 0.7); hud.fillCircle(px, py, POD.pip);
          if (n < left) { hud.fillStyle(POD.low, 1); hud.fillCircle(px, py, POD.pip - 1.5); }
        }
      }
    });
  }

  /** ลูกศรเหนือหัวทุกคน — ดู TAG ว่าทำไมต้องมีและทำไมสีตามทีม
   *
   *  ตำแหน่งยึด **หัว** ไม่ใช่เท้า (`f.y - PHYS.standH`) ไม่งั้นตอนกระโดดลูกศรจะจมอยู่กลางตัว
   *  ลอยขึ้นลงด้วยเลขเฟรมของซิม ไม่ใช่เวลาจริง — สองเครื่องที่ต่อเน็ตจึงเห็นลูกศรขยับตรงกัน
   *  (ไม่ได้บังคับ เพราะเป็นภาพล้วน แต่ของที่ตรงกันได้ฟรีก็ไม่มีเหตุผลให้ปล่อยให้ต่างกัน)
   */
  _drawTags(s, fx) {
    if (!this.showTags) return;
    const seats = s.fighters;
    const me = seats[this.mySeat()];
    const ts = s.teams();
    const bob = Math.sin(s.frame * 0.09) * TAG.bob;
    for (const f of seats) {
      // ตัวที่ล้มแล้วไม่ต้องติดป้าย — ตอนนั้นไม่มีใครต้องหามันเจอ และป้ายจะไปกองกับป้ายน็อก
      if (f.hp <= 0) continue;
      const mine = f === me;
      const k = mine ? 1 : TAG.small;
      const w = TAG.w * k, h = TAG.h * k;
      const cx = f.x, cy = f.y - PHYS.standH - TAG.rise + (mine ? bob : 0);
      const color = TAG.team[Math.max(0, ts.indexOf(f.team))] ?? TAG.team[0];
      const tri = [cx, cy + h, cx - w / 2, cy, cx + w / 2, cy];
      if (mine) {
        // ของเราทึบ + มีขอบเข้ม ให้ลอยอยู่เหนือฉากหลังสว่างได้โดยไม่กลืน
        fx.fillStyle(0x0c111c, 0.55);
        fx.fillTriangle(tri[0], tri[1] + 2, tri[2] - 2, tri[3] - 2, tri[4] + 2, tri[5] - 2);
        fx.fillStyle(color, 1);
        fx.fillTriangle(...tri);
      } else {
        fx.lineStyle(2.5, 0x0c111c, 0.45);
        fx.strokeTriangle(...tri);
        fx.lineStyle(2, color, 0.85);
        fx.strokeTriangle(...tri);
      }
    }
  }

  /** จาง HUD แถวบนตอนมีคนยืนสูงพอจะถูกมันบัง — ดู HUD_BAND ว่าทำไมต้องมี */
  _fadeHudFor(s) {
    if (!this.hudTop) return;
    const hidden = s.fighters.some((f) => f.y - PHYS.standH < HUD_BAND);
    const want = hidden ? HUD_DIM : 1;
    this.hudAlpha = (this.hudAlpha ?? 1) + (want - (this.hudAlpha ?? 1)) * HUD_FADE;
    for (const o of this.hudTop) o.setAlpha(this.hudAlpha);
    // รูปในแผงผู้เล่นสร้างทีหลัง (ตอนวาดเฟรมแรก) เข้าลิสต์ hudTop ตอนสร้างฉากไม่ได้
    // ลืมจางด้วยแล้วจะเห็นรูปลอยชัดเจนอยู่บนหัวคนที่กระโดดขึ้นมา ซึ่งบังยิ่งกว่าหลอดเลือดอีก
    for (const p of this.pods ?? []) p.img?.setAlpha(this.hudAlpha);
  }

  /** สั่นกล้อง + ซูมกระตุกไปพร้อมกัน — จุดเดียวที่สั่งสั่นกล้องในฉากนี้
   *
   *  ความแรงของกระตุกคิดจากความแรงของการสั่นที่ส่งมาอยู่แล้ว ไม่ต้องตั้งเลขใหม่ต่อเหตุการณ์
   *  = จุดที่เพิ่มทีหลังได้กระตุกฟรี ไม่ต้องมาจำว่าต้องเรียกสองอย่างทุกครั้ง
   *  กล้อง UI ไม่สั่นไม่กระตุก เพราะเป็นกล้องอีกตัว (ดู _splitCameras)
   */
  _shake(ms, intensity) {
    this.cameras.main.shake(ms, intensity);
    if (this.camFollow === false) return;
    this.camPunch = Math.min(CAM.punchMax, (this.camPunch ?? 0) + intensity * CAM.punchPerShake);
  }

  /** ลงทะเบียนอ็อบเจกต์ที่สร้างหลัง _splitCameras ว่าเป็น "ของในโลก"
   *
   *  ของที่สร้างใหม่ถูกวาดด้วยกล้องทุกตัวเป็นค่าเริ่มต้น ลืมเรียกที่ไหน ชิ้นนั้นจะถูกวาดสองรอบ
   *  รอบที่สองใช้พิกัดของกล้อง UI = เห็นเป็นภาพซ้อนเลื่อนไปอีกที่ ซึ่งดูเหมือนบั๊กกราฟิก
   *  ไม่ใช่บั๊กกล้อง จุดที่ต้องเรียกมีสี่แห่ง: สไปรท์ตัวละคร · หุ่นแสดงแทน · พูลเอฟเฟค · ป้ายลอย
   */
  _world(obj) { this.uiCam?.ignore(obj); return obj; }

  /** ตรงข้ามกับ _world: ของที่สร้างหลังแยกกล้องแล้วเป็น "ของ UI" ไม่ใช่ของในโลก
   *
   *  ต้องมีคู่กัน เพราะกฎจริงไม่ใช่ "ทุกอย่างเป็นของในโลก" แต่คือ
   *  **ทุกชิ้นที่สร้างหลังแยกกล้องต้องบอกว่าตัวเองอยู่กล้องไหน** ลืมบอก = ถูกวาดสองรอบ
   *  รอบที่สองใช้พิกัดของอีกกล้อง เห็นเป็นภาพซ้อนเลื่อนไปอีกที่ ซึ่งดูเหมือนบั๊กกราฟิก
   */
  _ui(obj) {
    this.cameras?.main?.ignore(obj);
    if (!this.uiObjects.includes(obj)) this.uiObjects.push(obj);
    return obj;
  }

  _mountOverlay() {
    const style = document.createElement('style');
    style.id = 'sc-style';
    style.textContent = OVERLAY_CSS;
    const root = document.createElement('div');
    root.id = 'sc-overlay';
    root.innerHTML = OVERLAY_HTML;
    document.head.appendChild(style);
    document.body.appendChild(root);
    this._overlay = [style, root];
    if (isTouch) document.body.classList.add('sc-touch');
    // เสียงปุ่มของแผงเลือกตัวกับแถวเครื่องมือ — ผูกที่ root ทีเดียว
    // การ์ดตัวละครถูกสร้างจาก CHARACTERS ทีหลัง ผูกทีละใบจะหลุดทุกครั้งที่เพิ่มตัวละคร
    // ปุ่มสัมผัสในเกม (#sc-touch) ไม่เอาเสียงนี้ — มันคือปุ่มเล่นเกม ไม่ใช่ปุ่มเมนู
    // และมีเสียงของท่าอยู่แล้ว ใส่เพิ่มจะกลายเป็นสองเสียงทุกครั้งที่กดตี
    wireUiSfx(root.querySelector('#sc-select'));
    wireUiSfx(root.querySelector('#sc-tools'));
    wireUiSfx(root.querySelector('#sc-pause'));
    this._wireMenu(root);

    root.querySelectorAll('#sc-tools button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tool(b.dataset.tool); });
    });
    // ปุ่มสัมผัส: ยิงเข้าชุด held/pressed ชุดเดียวกับคีย์บอร์ด โค้ดเกมจึงไม่ต้องรู้ว่ามาจากไหน
    // สล็อตที่ยังไม่มีสกิลถูกปิดไว้ และขึ้นเป็นสีจาง — อ่านจาก SKILLS ตรง ๆ
    // ใส่สกิลใน core.js แล้วปุ่มเปิดใช้งานเอง ไม่ต้องมาแก้ตรงนี้อีก
    this.skillBtns = [...root.querySelectorAll('#sc-touch .skills button')];

    root.querySelectorAll('#sc-touch button').forEach((b) => {
      const code = b.dataset.code;
      const down = (e) => {
        e.preventDefault();
        // จับ pointer ไว้กับปุ่ม เพื่อให้ได้ event ปล่อยแน่นอนแม้นิ้วจะเลื่อนออกนอกปุ่มไปแล้ว
        b.setPointerCapture?.(e.pointerId);
        held.add(code); pressed.add(code); b.classList.add('on');
      };
      const up = () => { held.delete(code); b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, up));
    });

    const mute = root.querySelector('#sc-mute');
    if (mute) {
      const paint = () => { mute.textContent = this.muted ? '\u266b\u0338' : '\u266b';
        mute.classList.toggle('on', !!this.muted); };
      mute.addEventListener('pointerdown', (e) => { e.preventDefault(); this.toggleMute(); paint(); });
      this.muted = localStorage.getItem(BGM.store) === '1';
      paint();
    }
    this._wireStick(root);
    buildTune();
    this._wireSelect(root);
  }

  /** จอยลอย — แตะตรงไหนในโซนซ้ายก็ได้ วงแหวนไปโผล่ตรงนั้น
   *
   *  ส่งออกเป็น "โค้ดปุ่ม" ชุดเดียวกับคีย์บอร์ด (KeyA/KeyD/KeyW/KeyS) ไม่ได้ต่อเข้า sim ตรง ๆ
   *  sim จึงไม่รู้เลยว่าอินพุตมาจากจอยหรือคีย์บอร์ด และ netplay ยังส่งแค่บิตปุ่มเหมือนเดิม
   *
   *  เขตตายแนวตั้งกว้างกว่าแนวนอน (STICK_DEADY เทียบ STICK_DEAD): การเดินคือสิ่งที่กดบ่อยที่สุด
   *  ถ้าเขตตายเท่ากัน นิ้วที่เลื่อนเฉียงนิดเดียวจะสั่งย่อหรือสั่งท่าขึ้นโดยไม่ได้ตั้งใจตลอดเวลา
   */
  _wireStick(root) {
    const zone = root.querySelector('#sc-touch .stick');
    if (!zone) return;
    const ring = zone.querySelector('.ring'), knob = zone.querySelector('.knob');
    const CODES = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
    let id = null, ox = 0, oy = 0;

    const clear = () => { for (const c of Object.values(CODES)) held.delete(c); };
    const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };

    const aim = (x, y) => {
      let dx = x - ox, dy = y - oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      place(knob, ox + dx, oy + dy);
      clear();
      if (Math.abs(dx) > STICK_DEAD) held.add(dx < 0 ? CODES.left : CODES.right);
      if (Math.abs(dy) > STICK_DEADY) held.add(dy < 0 ? CODES.up : CODES.down);
    };

    // iOS สร้าง pointer event จาก touch event อีกที — preventDefault ที่ pointerdown จึง "สายไปแล้ว"
    // ต้องดักที่ touch event ตัวจริงด้วย passive:false ถึงจะห้ามพฤติกรรมของระบบได้จริง
    // (เหตุผลเดียวกับที่ index.html ต้องดัก gesture* เอง แทนที่จะพึ่ง touch-action อย่างเดียว)
    for (const ev of ['touchstart', 'touchmove', 'touchend']) {
      zone.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    }

    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      zone.setPointerCapture?.(id);
      const r = zone.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      place(ring, ox, oy); place(knob, ox, oy);
      zone.classList.add('on');
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      e.preventDefault();
      const r = zone.getBoundingClientRect();
      aim(e.clientX - r.left, e.clientY - r.top);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      zone.addEventListener(ev, (e) => {
        if (e.pointerId !== id) return;
        id = null; zone.classList.remove('on'); clear();
      });
    }
  }

  /** ผูกปุ่มของหน้าเลือกตัว — ทำครั้งเดียวตอน mount การ์ดสร้างจาก CHARACTERS ตรง ๆ
   *  เพิ่มตัวละครใน core.js แล้วการ์ดโผล่เอง ไม่ต้องมาแก้ที่นี่อีก */
  _wireSelect(root) {
    const el = root.querySelector('#sc-select');
    this.selEl = el;
    this.selGrid = el.querySelector('.grid');
    this.selSides = [...el.querySelectorAll('.side')];
    this.selSlots = [];
    this.selGo = el.querySelector('.go');
    this.selGo.dataset.sfx = 'start';
    // สุ่มให้ "ช่องที่กำลังเลือกอยู่" ไม่ใช่สุ่มทุกช่อง — คนกดอยากสุ่มของตัวเอง
    // ไม่ใช่โดนสุ่มทับตัวที่เพื่อนเลือกไว้แล้ว
    el.querySelector('.rand')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._pickRandom();
    });
    this.selNote = el.querySelector('.note');
    this.selHint = el.querySelector('.hint');
    this.selModes = [...el.querySelectorAll('.modes button')];

    for (const id of Object.keys(CHARACTERS)) {
      const ch = CHARACTERS[id], art = CHAR_ART[id] ?? {};
      const skills = ch.skills.map((k) => (k ? ch.moves[k].label : null)).filter(Boolean).join(' · ');
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.char = id;
      card.dataset.sfx = 'pick';
      // แยกเป็นชิ้น ๆ ไม่ใช้ <br> — จอเตี้ยต้องย่อ/ตัดบรรทัดทีละชิ้น ซึ่ง <br> ทำให้ทำไม่ได้
      card.innerHTML = `<span class="pic"></span><span class="info">`
        + `<span class="name">${ch.label}</span>`
        + `<span class="title">${art.title ?? ''}</span>`
        + `<span class="tip"><b>${art.role ?? ''}</b> · ${art.tip ?? ''}</span>`
        + `<span class="skills">${skills}</span></span>`;
      card.addEventListener('pointerdown', (e) => { e.preventDefault(); this._pickChar(id); });
      this.selGrid.appendChild(card);
    }
    // ต่อท้ายด้วยตัวที่ยังไม่ปล่อย — disabled จริง ๆ ไม่ใช่แค่ไม่ผูก event
    // ปุ่มที่ disabled ถูกข้ามโดยตัวเล่นเสียงปุ่มด้วย (ดู wireUiSfx) จึงไม่มีเสียงตอนกดโดน
    for (const soon of COMING_SOON) {
      const card = document.createElement('button');
      card.className = 'card soon';
      card.dataset.soon = '1';
      card.disabled = true;
      card.innerHTML = `<span class="pic"><i style="background-image:url(${soon.pic})"></i></span>`
        + `<span class="info"><span class="name">${soon.name}</span>`
        + `<span class="tip">${soon.tip}</span></span>`;
      this.selGrid.appendChild(card);
    }
    // ฝั่งที่กำลังเลือก — ตอนต่อเน็ตล็อกไว้ที่ฝั่งตัวเอง กดสลับไม่ได้
    // ดักที่กล่องแม่เพราะช่องถูกสร้างใหม่ทุกครั้งที่จำนวนคนเปลี่ยน ผูกทีละช่องจะหลุด
    el.querySelector('.slots').addEventListener('pointerdown', (e) => {
      const sl = e.target.closest('.slot');
      if (!sl) return;
      e.preventDefault();
      if (this.versus === 'net') return;
      this.selSide = Number(sl.dataset.side);
      this._drawSelect();
    });
    for (const b of this.selModes) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.versus === 'net') return;
        this.versus = b.dataset.mode;
        // จัดวงใหม่ทันทีที่เปลี่ยนโหมด ไม่ใช่ตอนกดเริ่ม — แผงเลือกตัวจะได้โชว์ครบทุกช่องเลย
        this.sim.setRoster(this.versus === 'team' ? 4 : 2);
        this._initSprites();
        if (this.selSide >= this.sim.fighters.length) this.selSide = 0;
        if (this.versus === 'solo') this.selSide = 0;
        this._syncMatchHud();   // ผังปุ่มของฝั่ง 1 เปลี่ยนตามโหมด — บรรทัดบอกปุ่มต้องตามไปด้วย
        this._drawSelect();
      });
    }
    this.selGo.addEventListener('pointerdown', (e) => { e.preventDefault(); this._selectGo(); });
  }

  _unmountOverlay() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    held.clear(); pressed.clear();
    for (const el of this._overlay ?? []) el.remove();
    this._overlay = null;
    document.body.classList.remove('sc-touch');
    document.body.classList.remove('sc-net');
    if (activeScene === this) activeScene = null;
  }

  /** เครื่องมือที่ปลอดภัยตอนต่อเน็ต: เปลี่ยนแค่สิ่งที่เห็นบนจอเครื่องนี้ ไม่แตะ sim */
  // ปุ่มที่กดได้ตอนต่อเน็ต — ต้องไม่แตะ sim เลย ไม่งั้นอีกฝั่งไม่รู้ด้วยแล้วภาพหลุดกันถาวร
  // KeyF (ตัววัดความเร็ว) อยู่ในนี้เพราะเป็นตัวเดียวที่บอกได้ว่าเกมวิ่งความเร็วถูกไหม
  // ซึ่งเป็นอาการที่มองด้วยตาแล้วเถียงกันได้ แต่ดูเลขแล้วจบ (เคยวิ่ง 2 เท่าโดยไม่มีใครพิสูจน์ได้)
  static VIEW_ONLY = new Set(['KeyH', 'KeyZ', 'KeyF', 'KeyG', 'KeyP', 'Escape']);

  tool(code) {
    const s = this.sim;
    // reset/pause/step/slow-mo/สลับตัวละคร/2P ล้วนแก้ sim ของเครื่องเดียว อีกฝั่งไม่รู้ด้วย = ภาพหลุดกันถาวร
    if (this.versus === 'net' && !ScrambleScene.VIEW_ONLY.has(code)) return;
    if (code === 'KeyT') document.getElementById('sc-tune').classList.toggle('open');
    if (code === 'KeyH') this.showBoxes = !this.showBoxes;
    // 1/2/3 เคยเป็นคีย์ลัดตั้งโหมดหุ่น ย้ายไปเป็นปุ่มสกิลแล้ว — ปุ่ม "Dummy" บนจอ (Digit0)
    // ยังวนโหมดได้ครบเหมือนเดิม จึงไม่ได้เสียความสามารถอะไรไป
    if (code === 'Digit0') s.dummyMode = MODES[(MODES.indexOf(s.dummyMode) + 1) % MODES.length];
    if (code === 'Digit4') s.dummyTech = TECHS[(TECHS.indexOf(s.dummyTech) + 1) % TECHS.length];
    if (code === 'KeyR') { s.match.on ? s.startMatch() : s.resetPositions(); this.comboFade = 0; }
    if (code === 'KeyP' || code === 'Escape') this._toggleMenu();
    if (code === 'KeyN') { this.paused = true; this.stepOnce = true; }
    // สลับโหมดสองคน — ฝั่งขวาเปลี่ยนจากหุ่นซ้อมเป็นคนเล่นจริง (ลูกศร + numpad)
    if (code === 'KeyM') { this.versus = this.versus === 'local' ? 'solo' : 'local'; s.resetPositions(); this._syncMatchHud(); }
    if (code === 'KeyO') this.timeScale = this.timeScale === 1 ? 0.25 : 1;
    // กลับไปหน้าเลือกตัว — ตอนต่อเน็ตกดไม่ได้อยู่แล้ว (VIEW_ONLY) เพราะอีกฝั่งไม่รู้ด้วย
    if (code === 'KeyB') { this.openSelect(); return; }
    if (code === 'KeyF') this.showPace = !this.showPace;
    if (code === 'KeyZ') this.camFollow = !this.camFollow;
    if (code === 'KeyG') this._setDev(!this.dev);
    // สลับตัวละคร — สไปรท์เป็นของฝั่ง ไม่ใช่ของตัวละคร จึงไม่มีตัวค้างบนจอให้ต้องซ่อน
    if (code === 'KeyC' || code === 'KeyV') {
      const ids = Object.keys(CHARACTERS);
      const f = code === 'KeyC' ? s.p1 : s.p2;
      f.char = ids[(ids.indexOf(f.char) + 1) % ids.length];
      this._syncSkillSlots();
      this._syncMatchHud();
      s.resetPositions();
      this.comboFade = 0;
    }
    this.syncTools();
  }
  /** ป้ายชื่อ/โหมดบนหัวจอ — เรียกเมื่อโหมดหรือตัวละครเปลี่ยน ไม่ใช่ทุกเฟรม */
  _syncMatchHud() {
    if (!this.tSub) return;
    const name = (f) => CHARACTERS[f.char].label;
    const net = this.versus === 'net';
    this.tSub.setText(net ? (this.isHost ? 'Online · Host' : 'Online · Guest')
      : this.versus === 'local' ? 'Local 2P' : this.versus === 'team' ? 'Local 2v2' : 'Training');
    // ชื่อฝั่งละหนึ่งบรรทัด — ทีมละหลายคนต่อชื่อกันด้วย + ให้ตรงกับหลอดเลือดที่ซ้อนกันอยู่ใต้ชื่อ
    const ts = this.sim.teams();
    const label = (t) => this.sim.fighters.filter((f) => f.team === t).map(name).join(' + ');
    const sub = (t) => {
      const mates = this.sim.fighters.filter((f) => f.team === t);
      return mates.length === 1 ? CHAR_ART[mates[0].char]?.title ?? '' : '';
    };
    this.tP1.setText(label(ts[0] ?? 0));
    this.tP2.setText(this.versus === 'solo' ? 'หุ่นซ้อม' : label(ts[1] ?? 1));
    // ชื่ออยู่ใต้แผงผู้เล่น จัดกลางที่กลุ่มของทีมนั้น — เลื่อนตามจำนวนคนในทีมเอง
    const spots = this._podSpots(this.sim);
    const mid = (t) => {
      const xs = spots.filter((sp) => sp.f.team === t).map((sp) => sp.x);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : POD.side;
    };
    // ใต้จุดบอกยก ไม่ใช่ใต้วงเลือด — คิดจากวงของ "เรา" ซึ่งใหญ่ที่สุด ชื่อจะได้ไม่ทับจุดของใคร
    const nameY = POD.top + POD.r * POD.mine + POD.gap + POD.ring + 7 + POD.pip + 10;
    this.tP1.setPosition(mid(ts[0] ?? 0), nameY);
    this.tP2.setPosition(mid(ts[1] ?? 1), nameY);
    this.tP1Sub?.setText('');
    this.tP2Sub?.setText('');
    // ผังปุ่มของฝั่ง 1 ต่างกันระหว่าง "อยู่คนเดียวบนคีย์บอร์ด" กับ "แชร์กับอีกคน" (ดู ALONE_EXTRA)
    // ต้องอัปเดตตรงนี้ ไม่ใช่ตั้งครั้งเดียวตอนสร้างฉาก เพราะเปลี่ยนโหมดได้ตลอดจากแผงเลือกตัว
    if (!isTouch) this.tHelp?.setText(this.helpLine());
    // แถวเครื่องมือซ้อมกินพื้นที่ครึ่งจอบนมือถือ และตอนต่อเน็ตก็กดไม่ได้อยู่แล้ว
    document.body.classList.toggle('sc-net', net);
    if (net) document.getElementById('sc-tune')?.classList.remove('open');
  }

  /** ป้ายกลางจอตอนน็อกและตอนจบแมตช์ — อ่านจากสถานะ ไม่ใช่จากอีเวนต์
   *  อ่านจากสถานะเพราะเฟรมที่เพิ่งต่อเน็ตติดใหม่อาจพลาดอีเวนต์ไปแล้ว แต่สถานะยังถูกเสมอ */
  _syncKoBanner(s) {
    const m = s.match;
    if (!m.on) { this.tKo.setText(''); this.tKoSub.setText(''); return; }
    // 1v1 เรียกชื่อตัวละคร · เล่นเป็นทีมเรียกชื่อทีม เพราะฝั่งหนึ่งมีสองชื่อ
    const name = (t) => {
      const mates = s.fighters.filter((f) => f.team === t);
      return mates.length === 1 ? CHARACTERS[mates[0].char].label : 'ทีม ' + (s.teams().indexOf(t) + 1);
    };
    if (m.winner !== null) {
      this.tKo.setText(m.winner < 0 ? 'DRAW' : name(m.winner) + ' WINS');
      this.tKoSub.setText('กดปุ่มตีเพื่อเริ่มใหม่');
      return;
    }
    if (m.freeze > 0) {
      this.tKo.setText('K.O.');
      this.tKoSub.setText(m.loser.length > 1 ? 'ล้มพร้อมกันทั้งคู่'
        : name(m.loser[0]) + ' เสียหนึ่งหลอด · เหลือ ' + Math.max(0, m.bars[m.loser[0]] - 1));
      return;
    }
    this.tKo.setText(''); this.tKoSub.setText('');
  }

  /** โหมดนักพัฒนาที่จำไว้จากรอบก่อน — อ่านไม่ได้ก็ถือว่าปิด (โหมดส่วนตัวของ Safari throw ตอนอ่าน) */
  _devSaved() {
    try { return localStorage.getItem(DEV_STORE) === '1'; } catch (e) { return false; }
  }

  /** เปิด/ปิดโหมดนักพัฒนา — ปิดแล้วเก็บของที่เป็นของนักพัฒนาไปด้วยทั้งชุด
   *  ไม่ใช่แค่ซ่อนปุ่ม: กรอบชนกับแผงปรับจูนที่เปิดค้างอยู่ต้องปิดตามด้วย
   *  ไม่งั้นกดปิดโหมดแล้วยังเห็นกรอบสี่เหลี่ยมอยู่ ซึ่งดูเหมือนปุ่มเสีย */
  _setDev(on) {
    this.dev = !!on;
    try { localStorage.setItem(DEV_STORE, this.dev ? '1' : '0'); } catch (e) { /* ปิดโหมดส่วนตัวไว้ */ }
    document.body.classList.toggle('sc-dev', this.dev);
    if (!this.dev) {
      this.showBoxes = false;
      this.showPace = false;
      this.timeScale = 1;
      document.getElementById('sc-tune')?.classList.remove('open');
    }
    this._syncDevText();
    this.syncTools();
  }

  /** ข้อความที่มีความหมายกับนักพัฒนาเท่านั้น — ข้อมูลเฟรมและรายการคีย์ลัดของเครื่องมือ
   *
   *  บรรทัดบอกปุ่มพื้นฐาน (tHelp) ไม่อยู่ในนี้โดยตั้งใจ — คนเล่นบนคอมต้องรู้ว่ากดปุ่มอะไร
   *  ซ่อนไปด้วยแล้วเขาไม่มีทางรู้เลยว่าเริ่มยังไง
   *  "SCRAMBLE" เป็นชื่อโหมดภายใน ไม่ได้สื่ออะไรกับคนเล่น จึงโชว์เฉพาะตอนเปิดโหมดนี้ */
  _syncDevText() {
    this.tTitle?.setText(this.dev ? 'SCRAMBLE' : '');
    this.tHelp2?.setText(this.dev && !isTouch
      ? 'B เลือกตัว   T tune   H hitboxes   4 dummy tech   R reset   P pause   N step   O slow-mo   G dev'
      : '');
    if (!this.dev) this.tMove?.setText('');
  }

  syncTools() {
    const b = q => document.querySelector(`#sc-tools [data-tool="${q}"]`);
    if (!b('KeyH')) return;
    b('KeyG').classList.toggle('on', !!this.dev);
    b('KeyH').classList.toggle('on', this.showBoxes);
    b('Digit0').textContent = 'Dummy: ' + MODE_LABEL[this.sim.dummyMode];
    b('Digit4').textContent = 'Tech: ' + TECH_LABEL[this.sim.dummyTech];
    b('KeyO').classList.toggle('on', this.timeScale !== 1);
    b('KeyT').classList.toggle('on', document.getElementById('sc-tune').classList.contains('open'));
    b('KeyF').classList.toggle('on', !!this.showPace);
    b('KeyZ').classList.toggle('on', !!this.camFollow);
  }

  /** วัดว่าจอวาดจริงกี่ครั้งต่อวินาที และ sim เดินจริงกี่เฟรมต่อวินาที
   *
   *  ต้องใช้ performance.now() ไม่ใช่ delta ที่ Phaser ส่งมา เพราะ Phaser เกลี่ย delta
   *  จนรายงาน 16.7 ms ตลอดไม่ว่าจริง ๆ จะผ่านไปเท่าไหร่ (วัดได้คลาด 2.5-5 เท่าบนเครื่องช้า)
   *  ซึ่งก็คือต้นเหตุที่ทำให้ความเร็วเกมผูกกับอัตราเฟรมของจอแทนที่จะผูกกับเวลาจริง */
  _measurePace() {
    const now = performance.now();
    const p = this.pace ?? (this.pace = { t0: now, draws: 0, frame0: this.sim.frame, hz: 0, sfps: 0 });
    p.draws++;
    const span = now - p.t0;
    if (span >= 1000) {
      p.hz = p.draws / (span / 1000);
      p.sfps = (this.sim.frame - p.frame0) / (span / 1000);
      p.t0 = now; p.draws = 0; p.frame0 = this.sim.frame;
    }
  }

  update(time, delta) {
    this._measurePace();
    const stepMs = 1000 / 60;
    // เลือกตัวอยู่ = sim หยุดนิ่ง แต่ยังวาดฉากอยู่ จะได้เห็นเวทีอยู่ข้างหลังแผง
    if (this.phase === 'select') { this.acc = 0; this.draw(); return; }
    if (!this.paused) {
      this.acc += Math.min(delta, 100) * this.timeScale;
      while (this.acc >= stepMs) { this.acc -= stepMs; this.tick(); }
    } else if (this.stepOnce) { this.stepOnce = false; this.tick(); }
    this.draw();
  }

  /** หนึ่งเฟรมของเกม — ต่างกันแค่ "เดินซิมยังไง" ที่เหลือทำเหมือนกันทั้งสองทาง
   *
   *  **บั๊กที่เจอตอนเล่นกับเพื่อนจริง**: บรรทัดแรกเคยเป็น `if (this.net) { this.tickNet(); return; }`
   *  ทุกอย่างใต้มันจึงไม่ทำงานเลยตอนต่อเน็ต — ไม่มีป้ายเลขดาเมจ ไม่มีเสียง ไม่มีจอสั่น
   *  และที่ร้ายที่สุด **ไม่มีใครนับอายุอนุภาค** ขณะที่รอยฟาดถูกยิงจาก draw() (slashFor)
   *  ซึ่งทำงานอยู่ตลอด = เอฟเฟคกองค้างบนจอไปเรื่อย ๆ ไม่มีวันหาย ยิ่งตียิ่งสะสม
   */
  tick() {
    if (this.net) this.tickNet();
    else {
      const inp = readInput(0, !this.sharedKeyboard());
      // 2v2: คนจริงคนละทีม (p1 กับ p2) ส่วน p3/p4 เดินด้วย AI — ส่ง null ให้ sim คุมเอง
      const inp2 = (this.versus === 'local' || this.versus === 'team') ? readInput(1) : null;
      pressed.clear();
      this.sim.step(inp, inp2);
      this._simEvents();
    }
    this._maybeEndToSelect();
    this._ageFx();
  }

  /** จบแมตช์แล้วพากลับไปหน้าเลือกตัวเอง — เรียกหลังซิมเดินทุกครั้ง ทุกโหมด
   *
   *  **อ่านจากสถานะ ไม่ใช่จากอีเวนต์** เฟรมที่ต่อเน็ตติดใหม่หรือกระตุกอาจพลาดอีเวนต์ไปแล้ว
   *  แต่ `match.winner` ยังถูกเสมอ (เหตุผลเดียวกับ _syncKoBanner)
   *
   *  นับเป็นเฟรมของซิม สองเครื่องจึงถึงเส้นพร้อมกันเป๊ะโดยไม่ต้องส่งอะไรคุยกันเลย
   *  แพ็คเก็ต 'lobby' ที่ toSelect() ส่งเป็นแค่ตาข่ายรอง เผื่อฝั่งไหนไม่ถึงเส้นด้วยตัวเอง
   */
  _maybeEndToSelect() {
    if (this.phase !== 'fight') return;
    const m = this.sim.match;
    if (!m.on || m.winner === null) { this.matchEndAt = null; return; }
    if (this.matchEndAt === null || this.matchEndAt === undefined) { this.matchEndAt = this.sim.frame; return; }
    if (this.sim.frame - this.matchEndAt >= MATCH_END_HOLD) this.toSelect();
  }

  /** แปลอีเวนต์ของซิม "หนึ่งเฟรม" เป็นภาพและเสียง — เรียกหลัง step() ทุกครั้ง ทุกโหมด
   *
   *  ต้องเรียกต่อหนึ่งเฟรมของซิม ไม่ใช่ต่อ tick เพราะ sim.events ถูกล้างทุกครั้งที่ step()
   *  ตอนต่อเน็ตแล้วไล่ตามหลัง tick เดียวเดินได้หลายเฟรม เรียกท้าย tick จะเหลืออีเวนต์เฟรมสุดท้ายเฟรมเดียว
   *
   *  ทุกอย่างในนี้เป็นภาพ/เสียงล้วน ไม่มีอะไรเขียนกลับซิม จึงเรียกตอนต่อเน็ตได้ปลอดภัย
   */
  _simEvents() {
    for (const e of this.sim.events) {
      if (e.type === 'hit') {
        // ระเบิดตัวเองไม่หักเลือด เลยไม่มีเลขให้เด้ง — ขึ้น "0" จะอ่านเหมือนบั๊กมากกว่ากติกา
        if (!e.self) this.popup(e.x, e.y - 30, String(e.dmg), e.heavy ? '#ffd166' : '#ffffff');
        // แรงสั่นคิดจากเวลาที่ภาพหยุดจริง ไม่ใช่สองระดับตายตัว — น้ำหนักหมัดจึงไล่เป็นสเกลเดียวกัน
        // ท่าที่จับลอยได้ hitstop เพิ่มอยู่แล้ว แรงสั่นเลยตามไปเองโดยไม่ต้องมีเงื่อนไขแยก
        const hs = e.hs ?? 5;
        if (hs >= 6) this._shake(40 + hs * 9, 0.0006 * hs);
        // แบ่งเบา/หนักด้วย hitstop ตัวเดียวกับที่ใช้สั่นจอ ภาพกับเสียงจึงไล่ระดับพร้อมกันเสมอ
        this._sfx(hs >= 9 ? 'hitHeavy' : 'hitLight');
        // ทิศที่ประกายกระเด็นคือทิศที่แรงส่งไป = จากคนตีไปหาคนโดน
        this.hitBurst(e.x, e.y, hs, this.sim.p1.x <= this.sim.p2.x ? 1 : -1);
      }
      if (e.type === 'block') {
        this.popup(e.x, e.y - 30, 'Blocked', '#8fc0ff');
        this._sfx('block');
        this.emit('ring', e.x, e.y, { scale: 0.22, life: 14, grow: 1.4, tint: 0x8fc0ff });
        this.emit('burst', e.x, e.y, { scale: 0.14, life: 9, grow: 0.7, tint: 0x5aa0ff });
      }
      if (e.type === 'wall') { this.spark(e.x, e.y, 16, 0xffd166); this.popup(e.x, e.y - 40, 'Wall bounce', '#ffd166'); this._shake(90, 0.005); this._sfx('wall'); }
      if (e.type === 'tech') {
        this.popup(e.x, e.y, e.label, '#8ff0bd');
        this._sfx('whoosh');
        this.emit('ring', e.x, e.y + 20, { scale: 0.16, life: 13, grow: 1.8, tint: 0x8ff0bd });
        this.emit('dustFlat', e.x, e.y + 6, { scale: 0.34, life: 18, grow: 0.9, alpha: 0.5,
          tint: 0xd8c9a8, blend: Phaser.BlendModes.NORMAL, depth: 6 });
      }
      if (e.type === 'djump') {
        this._sfx('whoosh', { vol: 0.8 });
        this.emit('ring', e.x, e.y - 20, { scale: 0.14, life: 12, grow: 1.6, tint: 0xcfe0ff, alpha: 0.8 });
      }
      // ลงพื้น: ฝุ่นฟุ้งตรงเท้า — อันนี้ไม่มีในเกมมาก่อน ทั้งที่เป็นจังหวะที่เกิดบ่อยที่สุด
      if (e.type === 'land') {
        this._sfx(e.hard ? 'landHard' : 'landSoft');
        for (let i = 0; i < 3; i++) {
          const d = (i - 1) * 14;
          this.emit('dustFlat', e.x + d, e.y - 4, { scale: 0.16 + Math.random() * 0.1, life: 14, grow: 1.2,
            vx: d * 0.08, alpha: 0.42, tint: 0xd8c9a8, blend: Phaser.BlendModes.NORMAL, depth: 6 });
        }
      }
      // อัลติ: ควันตอนหาย/โผล่ + จอกระพริบตอนเริ่มท่า
      if (e.type === 'vanish') {
        this._shake(60, 0.003);
        this._sfx('whoosh');
        for (let i = 0; i < 4; i++)
          this.emit('smokeCurl', e.x + (i - 1.5) * 18, e.y - 40 - Math.random() * 50,
            { scale: 0.22, life: 22, grow: 0.9, vy: -1.4, alpha: 0.55, tint: 0x6b5f7a,
              blend: Phaser.BlendModes.NORMAL, depth: 6 });
      }
      if (e.type === 'appear') {
        this._sfx('whoosh');
        this.emit('ring', e.x, e.y - 60, { scale: 0.20, life: 14, grow: 2.0, tint: 0xe05a57 });
        this.emit('star4', e.x, e.y - 60, { scale: 0.26, life: 10, grow: 0.9, tint: 0xffb3b0 });
      }
      if (e.type === 'throw') { this.spark(e.x, e.y, 7, 0xc9a227); this._sfx('whoosh', { vol: 0.7 }); }
      if (e.type === 'lash') { this.popup(e.x, e.y, '\u00d7' + e.n, '#ff9a97'); this._sfx('tick'); }
      // ชั้น "โรงเต็ม" ของ Momus — ต้องเห็นตอนได้ ไม่งั้นคนเล่นไม่รู้ว่าอัลติจะใหญ่แค่ไหน
      if (e.type === 'house') {
        this.popup(e.x, e.y, 'House \u00d7' + e.n, '#ffd166');
        this._sfx('tick', { vol: 1.4 });
        this.emit('ring', e.x, e.y + 40, { scale: 0.18, life: 14, grow: 1.5, tint: 0xffd166 });
      }
      if (e.type === 'burn') {
        this.popup(e.x, e.y - 20, String(e.dmg), '#ffb03a');
        this.emit('flame', e.x + (Math.random() - 0.5) * 30, e.y, { scale: 0.20, life: 20, grow: 0.5,
          vy: -1.2, tint: 0xffb03a });
      }
      if (e.type === 'firepool') {
        this._shake(70, 0.004);
        this._sfx('blast', { vol: 0.6 });
        for (let i = 0; i < 7; i++)
          this.emit('flame', e.x + (i - 3) * 16, e.y, { scale: 0.18 + Math.random() * 0.14,
            life: 16 + Math.round(Math.random() * 14), grow: 0.6, vy: -1.6 - Math.random(), tint: 0xffb03a });
        this.emit('burst', e.x, e.y - 26, { scale: 0.42, life: 13, grow: 1.1, tint: 0xffd166 });
      }
      if (e.type === 'decoy') { this.popup(e.x, e.y - 120, 'Understudy', '#d8b24a'); this._sfx('thud'); }
      if (e.type === 'decoyPop') {
        this._shake(70, 0.004);
        this._sfx('blast', { vol: 0.55 });
        this.emit('burst', e.x, e.y - 60, { scale: 0.34, life: 12, grow: 1.2, tint: 0xffd166 });
        for (let i = 0; i < 4; i++)
          this.emit('smokeCurl', e.x + (i - 1.5) * 16, e.y - 50 - Math.random() * 30,
            { scale: 0.2, life: 24, grow: 1.0, vy: -0.8, alpha: 0.45, tint: 0x9aa3b5,
              blend: Phaser.BlendModes.NORMAL, depth: 6 });
      }
      if (e.type === 'box') { this.spark(e.x, e.y - 20, 8, 0xc9a227); this.popup(e.x, e.y - 60, 'Jack-in-the-Box', '#d8b24a'); this._sfx('thud', { vol: 0.8 }); }
      if (e.type === 'blast') {
        this._shake(110, 0.007);
        this._sfx('blast');
        this.emit('burst', e.x, e.y - 40, { scale: 0.55, life: 15, grow: 1.5, tint: 0xffd166 });
        this.emit('ring', e.x, e.y - 40, { scale: 0.30, life: 18, grow: 2.6, tint: 0xfff2d0 });
        // ควันต้องเป็น NORMAL ไม่ใช่ ADD — ควันขาวบนฟ้าสว่างในโหมด ADD จะหายสนิท
        for (let i = 0; i < 5; i++)
          this.emit('smokeBall', e.x + (i - 2) * 26, e.y - 30 - Math.random() * 30,
            { scale: 0.25 + Math.random() * 0.2, life: 30 + Math.round(Math.random() * 20), grow: 1.1,
              vy: -0.7, alpha: 0.5, tint: 0x9aa3b5, blend: Phaser.BlendModes.NORMAL, depth: 6 });
      }
      if (e.type === 'rain') { this.popup(e.x, e.y, 'Full House', '#ffd166'); this._shake(160, 0.006); this._sfx('blast', { vol: 1.1 }); }
      if (e.type === 'anchor') { this.spark(e.x, e.y, 10, 0xe05a57); this.popup(e.x, e.y - 26, 'กดซ้ำเพื่อวาร์ป', '#e0a0a0'); this._sfx('tick'); }
      if (e.type === 'mark') { this.spark(e.x, e.y, 13, 0xe05a57); this.popup(e.x, e.y - 34, 'หมายหัว', '#ff9a97'); this._sfx('tick', { vol: 1.2 }); }
      if (e.type === 'ult') {
        this.popup(e.x, e.y, 'Oni Veil', '#e05a57');
        this._sfx('blast', { vol: 0.85 });
        this._shake(180, 0.008);
        this.cameras.main.flash(120, 190, 40, 40);
      }
      // ── อีเวนต์ที่มีแต่เสียง ยังไม่มีภาพประกอบเป็นของตัวเอง ──
      // แยกมาไว้ท้ายก้อนเพื่อให้เห็นชัดว่าอันไหน "ต่อเสียงแล้วแต่ยังไม่มีเอฟเฟค"
      // เกราะของ Atlas กินหมัด — โลหะ ไม่ใช่เนื้อ ต้องฟังต่างจากโดนตีปกติ
      if (e.type === 'armor') { this._sfx('metal', { vol: 1.2 }); this.spark(e.x, e.y, 12, 0xd8c9a8); }
      if (e.type === 'caged') this._sfx('metal', { vol: 0.8 });
      // สลับอาวุธของ Alecto — เสียงบอกว่าสลับแล้ว สำคัญเพราะปุ่มตีชุดเดิมออกคนละท่า
      if (e.type === 'swap') this._sfx('metal', { vol: 0.7 });
      if (e.type === 'dust') this._sfx('whoosh', { vol: 0.6 });
      if (e.type === 'decoyGone') this._sfx('whoosh', { vol: 0.45 });
      if (e.type === 'ko') this._sfx('ko');
      if (e.type === 'matchEnd') this._sfx('ko', { vol: 1.2 });
      if (e.type === 'roundStart') this._sfx('roundStart');
      if (e.type === 'comboEnd') { this.lastCombo = { hits: e.hits, dmg: e.dmg }; this.comboFade = e.hits > 1 ? 90 : 0; }
    }
  }

  /** นับอายุอนุภาค ประกาย และป้ายเลข — ต่อ tick ไม่ใช่ต่อเฟรมซิม
   *  พวกนี้เป็นของฝั่งภาพล้วน อายุจึงเดินตามรอบของเกม ไม่ใช่ตามเลขเฟรมของซิม */
  _ageFx() {
    this._stepFx();
    for (const s of this.sparks) s.life--;
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const p of this.popups) { p.life--; p.t.y -= 0.8; p.t.setAlpha(Math.min(1, p.life / 15)); if (p.life <= 0) p.t.destroy(); }
    this.popups = this.popups.filter(p => p.life > 0);
    if (this.comboFade > 0) this.comboFade--;
  }
  // หรี่ปุ่มสกิลตามคูลดาวน์/หลอด ki — ปุ่มยังกดได้ แค่บอกสายตาว่ายังไม่พร้อม
  // ไม่ใช้ disabled เพราะปุ่มที่ disabled ตอนกำลังกดค้างอยู่จะไม่ส่ง event ปล่อย ทำให้ปุ่มค้าง
  /** ตั้งว่าช่องไหนมีสกิล — เรียกตอนเริ่มฉากและตอนสลับตัวละครเท่านั้น ไม่ใช่ทุกเฟรม
   *  ปุ่มที่ถูก disable ตอนนิ้วยังกดค้างอยู่จะไม่ส่ง event ปล่อย แล้วปุ่มจะค้าง
   *  การหรี่ตามคูลดาวน์จึงใช้ opacity อย่างเดียว (ดู _syncSkillBtns) */
  /* ================= หน้าเลือกตัวละคร =================
   *
   * เปิดค้างไว้ก่อนเริ่มแมตช์เสมอ (this.phase === 'select') ตอนนั้น sim หยุดนิ่ง
   * ยังวาดฉากอยู่เบื้องหลัง จะได้เห็นว่ากำลังจะเล่นบนเวทีไหน
   *
   * ตอนต่อเน็ตเป็นการจับมือสามจังหวะ:
   *   ทั้งสองฝั่งส่ง 'pick' ทุกครั้งที่เปลี่ยนตัว (อีกฝั่งเห็นสด ๆ ว่าเลือกอะไรอยู่)
   *   กดพร้อม -> ส่ง 'ready'
   *   โฮสต์เห็นพร้อมครบสองฝั่ง -> ส่ง 'go' พร้อมตัวละครและค่าปรับจูนชุดสุดท้าย แล้วเริ่มเอง
   *   แขกเริ่มก็ต่อเมื่อได้ 'go' เท่านั้น ไม่เริ่มเอง — นาฬิกาเฟรม 0 ต้องออกตัวพร้อมกัน
   */
  /** กลับไปหน้าเลือกตัว **แล้วพาอีกฝั่งไปด้วยถ้าต่อเน็ตอยู่**
   *
   *  ต้องมีคู่กับ openSelect() ไม่ใช่รวมเป็นอันเดียว: openSelect() ถูกเรียกจากฝั่งที่ "ถูกพาไป"
   *  ด้วย รวมกันเมื่อไหร่แพ็คเก็ตจะตีกลับไปกลับมาไม่รู้จบ (เราบอกเขา เขาบอกเรา เราบอกเขา...)
   *
   *  ฝ่ายเดียวกลับไปเลือกตัวไม่ได้ — lockstep เดินด้วยอินพุตของทั้งสองฝั่ง
   *  ฝั่งที่เหลืออยู่ในสนามจะค้างรอเฟรมที่ไม่มีวันมา แล้วเห็นเป็น "เกมแฮงก์" ไม่ใช่ "เพื่อนออกไปแล้ว"
   */
  toSelect() {
    if (this.versus === 'net') this.netSend?.({ t: 'lobby' });
    this.openSelect();
  }

  openSelect() {
    this.phase = 'select';
    this.matchEndAt = null;
    this.selSide = this.mySeat();
    // ความพร้อมล้างทุกครั้งที่กลับมาหน้านี้ — ทุกคนต้องกดใหม่ ไม่งั้นแมตช์หน้าเริ่มเองก่อนใครทัน
    this.myReady = false;
    this.readyBy = {};
    document.body.classList.add('sc-picking');
    this.selEl?.classList.add('open');
    this._drawSelect();
  }

  /** เลือกตัวให้ฝั่งที่กำลังแก้อยู่ — ตอนต่อเน็ตบอกอีกฝั่งด้วยเพื่อให้เห็นสด ๆ */
  _pickChar(id) {
    if (this.phase !== 'select') return;
    if (this.versus === 'net' && this.myReady) return;   // กดพร้อมแล้วเปลี่ยนไม่ได้ กันสลับตัวตอนโฮสต์กำลังส่ง go
    const f = this.sim.fighters[this.selSide] ?? this.sim.p1;
    f.char = id;
    // ต้องติดเลขที่นั่งไปด้วย — ห้องสี่คนมี "อีกฝั่ง" สามคน ไม่ใช่คนเดียวให้เดาได้
    if (this.versus === 'net') this.netSend?.({ t: 'pick', s: this.mySeat(), char: id });
    this._syncSkillSlots();
    this._drawSelect();
  }

  /** สุ่มตัวละครให้ช่องที่กำลังเลือกอยู่
   *
   *  ใช้ `Math.random` ได้เพราะนี่คือ**การกดปุ่มของคนหนึ่งคน** ไม่ใช่การคิดในซิม
   *  ผลที่ได้เดินทางต่อผ่าน `_pickChar()` ซึ่งส่งให้อีกฝั่งอยู่แล้วเหมือนการกดการ์ดปกติ
   *  สองเครื่องจึงไม่ต้องสุ่มให้ตรงกัน — มีคนสุ่มคนเดียวแล้วบอกอีกฝั่งว่าได้อะไร
   *
   *  เลี่ยงตัวเดิม: สุ่มแล้วได้ตัวที่ถืออยู่คือปุ่มที่กดแล้วไม่มีอะไรเกิดขึ้น
   *  ซึ่งแยกไม่ออกจากปุ่มเสีย
   */
  _pickRandom() {
    if (this.phase !== 'select') return;
    const ids = Object.keys(CHARACTERS);
    const now = this.sim.fighters[this.selSide]?.char;
    const pool = ids.filter((id) => id !== now);
    if (!pool.length) return;
    this._pickChar(pool[(Math.random() * pool.length) | 0]);
  }

  /** กดปุ่มใหญ่: ออฟไลน์เริ่มเลย · ต่อเน็ตแปลว่า "พร้อม" แล้วรออีกฝั่ง */
  _selectGo() {
    if (this.phase !== 'select') return;
    if (this.versus !== 'net') { this.beginMatch(); return; }
    this.myReady = !this.myReady;
    const seat = this.mySeat();
    this.netSend?.({ t: 'ready', s: seat, ready: this.myReady, char: this.sim.fighters[seat]?.char });
    this._maybeStartNetMatch();
    this._drawSelect();
  }

  /** ที่นั่งที่ยังไม่กดพร้อม — ใช้ทั้งตัดสินว่าเริ่มได้ และบอกคนเล่นว่ารอใครอยู่ */
  _notReady() {
    const mine = this.mySeat();
    const out = [];
    for (let i = 0; i < (this.netSeats ?? 2); i++) {
      if (!(i === mine ? this.myReady : this.readyBy?.[i])) out.push(i);
    }
    return out;
  }

  /** โฮสต์เท่านั้นที่ตัดสินว่าเริ่มได้แล้ว — แขกรอ 'go' อย่างเดียว
   *  ต้องพร้อม **ครบทุกที่นั่ง** ไม่ใช่แค่สองคนแรก ไม่งั้นห้องสี่คนจะเริ่มทั้งที่คนที่สี่ยังเลือกตัวอยู่ */
  _maybeStartNetMatch() {
    if (!this.isHost || this.phase !== 'select' || this._notReady().length) return;
    const chars = this.sim.fighters.map((f) => f.char);
    this.matchEpoch = (this.matchEpoch ?? 0) + 1;
    // p1/p2 ติดไปด้วยเพื่อให้แท็บที่เปิดบิลด์ก่อนหน้ายังอ่านรู้เรื่องในห้องสองคน
    this.netSend?.({ t: 'go', chars, p1: chars[0], p2: chars[1], m: this.matchEpoch, tune: tuneSnapshot() });
    this.beginMatch();
  }

  /** เริ่มแมตช์จริง — จุดเดียวที่ sim กลับมาเดิน */
  beginMatch() {
    this.phase = 'fight';
    document.body.classList.remove('sc-picking');
    this.selEl?.classList.remove('open');
    // ซ้อมกับหุ่นไม่นับแพ้ชนะ (หุ่นฟื้นเลือดเอง) เล่นกับคนจริงถึงเปิดระบบยก
    if (this.versus === 'solo') this.sim.resetPositions();
    else this.sim.startMatch();
    this.comboFade = 0; this.netMsg = null;
    this.matchEndAt = null;
    if (this.versus === 'net') {
      // นาฬิกาต้องเริ่มที่ศูนย์พร้อมกันทั้งสองเครื่อง — เลขเฟรมเป็นส่วนหนึ่งของเส้นเวลาที่ใช้ร่วมกัน
      this.sim.frame = 0;
      // ล้างคิวเฉพาะตอนขึ้นแมตช์ใหม่จริง ๆ ไม่ใช่ทุกครั้งที่เริ่ม
      // แมตช์แรกคิวยังสะอาดอยู่แล้ว **และอาจมีอินพุตของอีกฝั่งที่มาถึงก่อนเรากดเริ่มค้างอยู่**
      // ล้างทิ้งตรงนั้นแปลว่าเฟรมต้น ๆ ของเขาหายไป แล้วสองฝั่งค้างรอกันตลอดกาล
      // แมตช์ที่สองขึ้นไปต้องล้าง ไม่งั้นมันหยิบอินพุตของแมตช์ก่อนมาเดิน (ดู Lockstep.reset)
      const ep = this.matchEpoch ?? 0;
      if (this.net.epoch !== ep) this.net.reset(ep);
      this.netPress = 0;
      this.net.primeStart();
    }
    this._syncSkillSlots();
    this._syncMatchHud();
    this.syncTools();
  }

  /** สร้างช่องให้ครบตาม roster แล้วจับเข้าคอลัมน์ของทีมตัวเอง
   *  ลิสต์ที่คืนเรียงตามลำดับใน fighters เสมอ ถึงในจอจะสลับฝั่งกันอยู่ —
   *  ที่อื่นใช้ index นี้อ้างตัวละครตรง ๆ */
  _syncSelectSlots() {
    const fs = this.sim.fighters;
    if (this.selSlots.length === fs.length) return;
    for (const side of this.selSides) side.replaceChildren();
    const ts = this.sim.teams();
    this.selSlots = fs.map((f, i) => {
      const sl = document.createElement('div');
      sl.className = 'slot';
      sl.dataset.side = String(i);
      for (const cls of ['tag', 'who']) {
        const sp = document.createElement('span');
        sp.className = cls;
        sl.appendChild(sp);
      }
      (this.selSides[ts.indexOf(f.team)] ?? this.selSides[0]).appendChild(sl);
      return sl;
    });
  }

  /** วาดหน้าเลือกตัวใหม่ทั้งแผง — เรียกเมื่อมีอะไรเปลี่ยน ไม่ใช่ทุกเฟรม */
  _drawSelect() {
    if (!this.selEl || !this.sim) return;
    const net = this.versus === 'net';
    this._syncSelectSlots();
    const chars = this.sim.fighters.map((f) => f.char);
    const mine = this.mySeat();

    this.selSlots.forEach((sl, i) => {
      const label = net ? (i === mine ? 'คุณ' : `ผู้เล่น ${i + 1}`)
        : this.versus === 'team' ? (i < 2 ? `ผู้เล่น ${i + 1}` : 'เพื่อน AI')
        : this.versus === 'local' ? `ผู้เล่น ${i + 1}`
        : i === 0 ? 'คุณ' : 'หุ่นซ้อม';
      sl.querySelector('.tag').textContent = label;
      // "กำลังเลือก..." ต่อที่นั่ง ไม่ใช่ตัวเดียวรวมทุกคน — ห้องสี่คนต้องรู้ว่าใครยังไม่เลือก
      const waiting = net && i !== mine && !this.picks?.[i];
      const ready = net && (i === mine ? this.myReady : this.readyBy?.[i]);
      sl.querySelector('.who').textContent = waiting ? 'กำลังเลือก...'
        : CHARACTERS[chars[i]].label + (ready ? ' ✓' : '');
      sl.classList.toggle('waiting', waiting);
      sl.classList.toggle('active', i === this.selSide);
      sl.classList.toggle('pickable', !net);
    });

    for (const card of this.selGrid.children) {
      if (card.dataset.soon) continue;     // ไม่มีตัวละครจริงให้วาด และไม่มีวันถูกเลือก
      card.classList.toggle('on', card.dataset.char === chars[this.selSide]);
      this._paintPortrait(card.querySelector('.pic'), card.dataset.char);
    }
    for (const b of this.selModes) {
      b.classList.toggle('on', !net && this.versus === b.dataset.mode);
      b.disabled = net;
    }
    this.selEl.querySelector('.modes').style.display = net ? 'none' : 'flex';

    this.selHint.textContent = net
      ? `คุณคือผู้เล่น ${mine + 1}` + (this.netSeats > 2 ? ` · ทีม ${(this.sim.fighters[mine]?.team ?? 0) + 1}` : '')
      : 'แตะที่ช่องด้านบนเพื่อสลับว่ากำลังเลือกให้ฝั่งไหน';
    this.selGo.textContent = !net ? 'เริ่ม' : this.myReady ? 'ยกเลิกพร้อม' : 'พร้อม';
    // บอกว่า "รอใคร" เป็นตัวเลขที่นั่ง ไม่ใช่ "รออีกฝั่ง" — ห้องสี่คนต้องรู้ว่าเหลือใคร
    const wait = net ? this._notReady().filter((i) => i !== mine) : [];
    this.selNote.textContent = !net ? ''
      : !this.myReady && wait.length < (this.netSeats ?? 2) - 1 ? 'คนอื่นพร้อมแล้ว รอคุณ'
      : this.myReady && wait.length ? `รอผู้เล่น ${wait.map((i) => i + 1).join(', ')} กดพร้อม...`
      : '';
  }

  /** รูปตัวละครบนการ์ด — ครอปจากอัตลาสด้วย CSS
   *
   *  ใช้ meta ของชีต (anchorX / feetY / standing) จัดให้ทุกตัวสูงเท่ากันและยืนกลางกรอบเสมอ
   *  ถ้าวัดจากกรอบเฟรมตรง ๆ ตัวที่ชีตถ่ายไกลกว่าจะเล็กกว่าเพื่อนทันที (ปัญหาเดียวกับตอนประกอบชีต)
   *  อ่าน meta ไม่ได้ก็ปล่อยว่าง เหลือแต่ชื่อกับสกิล ดีกว่าโชว์รูปเพี้ยน ๆ */
  _paintPortrait(el, charId) {
    if (!el || el.dataset.painted === charId) return;
    const art = CHAR_ART[charId];
    if (!art || art.artPending) return;
    let meta, fr;
    try {
      meta = this.textures.get(art.atlasKey).customData.meta;
      fr = this.textures.getFrame(art.atlasKey, 'idle_1.png');
    } catch (e) { return; }
    if (!meta || !fr) return;
    const box = el.getBoundingClientRect();
    const h = box.height || 72, w = box.width || 52;
    const scale = (h * 0.9) / meta.standing;   // ทุกตัวสูงเท่ากันในกรอบ ไม่ว่าชีตจะถ่ายใกล้ไกลแค่ไหน
    // จุดยึด/ปลายเท้า วัดในผืนวาดเต็ม ต้องหักระยะที่เฟรมถูกตัดขอบออก (fr.x / fr.y) ให้เป็นพิกัดในเฟรม
    const ax = (meta.anchorX - fr.x) * scale;
    const fy = (meta.feetY - fr.y) * scale;
    const img = el.firstElementChild ?? el.appendChild(document.createElement('i'));
    img.style.width = `${fr.cutWidth * scale}px`;
    img.style.height = `${fr.cutHeight * scale}px`;
    img.style.left = `${w / 2 - ax}px`;
    img.style.top = `${h - 3 - fy}px`;
    img.style.backgroundImage = `url("${art.texture}")`;
    img.style.backgroundSize = `${fr.source.width * scale}px ${fr.source.height * scale}px`;
    img.style.backgroundPosition = `${-fr.cutX * scale}px ${-fr.cutY * scale}px`;
    el.dataset.painted = charId;
  }

  _syncSkillSlots() {
    if (!this.skillBtns || !this.sim) return;
    const f = this.sim.p1;
    for (const b of this.skillBtns) {
      const id = f.skills[Number(b.dataset.slot) - 1];
      b.disabled = !id;
      b.title = id ? f.moves[id].label : 'ยังไม่มีสกิลในช่องนี้';
    }
  }

  _syncSkillBtns() {
    if (!this.skillBtns) return;
    const f = this.sim.p1;
    for (const b of this.skillBtns) {
      const i = Number(b.dataset.slot) - 1;
      if (!f.skills[i]) continue;
      const ready = i === 2 ? f.ki >= KI_MAX : f.cd[i] <= 0;
      const want = ready ? '1' : '.4';
      if (b.style.opacity !== want) b.style.opacity = want;
    }
  }

  /** เริ่มเล่นข้ามเครื่อง — โฮสต์เป็นฝั่งซ้าย (p1) ผู้เข้าร่วมเป็นฝั่งขวา (p2)
   *
   *  ท่อส่งข้อมูลถูกฉีดเข้ามา ไม่ได้ผูกกับ PeerJS ตายตัว: ฉากรู้แค่ "ส่งอ็อบเจกต์นี้ไปอีกฝั่ง"
   *  จึงทดสอบได้ด้วยท่อปลอมที่ต่อสองหน้าต่างเบราว์เซอร์เข้าหากัน และเปลี่ยนไปใช้ท่าอื่น
   *  (เช่น WebSocket ในวงแลน) ได้ทีหลังโดยไม่ต้องแตะโค้ดเกม
   *
   *  ทั้งสองเครื่องเดิน sim ของตัวเองด้วยอินพุตชุดเดียวกัน จึงไม่ส่งสถานะอะไรข้ามเน็ตเลย
   *  คืนฟังก์ชันรับแพ็คเก็ต ให้ฝั่งท่อเรียกเมื่อมีข้อมูลเข้ามา
   */
  /** เข้าโหมดข้ามเครื่อง — `seat` คือช่องใน fighters ที่เครื่องนี้คุม, `seats` คือห้องนี้กี่คน
   *
   *  ทั้งสองค่ามาจากชั้นท่อ (session.js) ไม่ใช่เดาจาก isHost — ห้องสี่คนเดาไม่ได้ว่าใครนั่งที่ไหน
   *  ขึ้นกับว่าใครต่อเข้ามาก่อน และถ้าเดาซ้ำกัน สองเครื่องจะคุมตัวเดียวกันโดยไม่มีอะไรฟ้อง
   */
  startNet({ isHost, seat = isHost ? 0 : 1, seats = 2, send }) {
    this.versus = 'net';
    this.isHost = isHost;
    this.netSeat = seat;
    this.netSeats = seats;
    if (this.sim.fighters.length !== seats) this.sim.setRoster(seats);
    // ต่อเน็ตทุกช่องมีคนจริงนั่งอยู่ ไม่มีใครเดินด้วย AI — setRoster ติดธงให้ช่อง 3-4 ไว้ ต้องปลด
    // ถ้าลืมปลด ซิมจะเอาอินพุตของ AI ไปใช้แทนอินพุตที่ส่งข้ามเน็ตมา (ดู step())
    // สองเครื่องคิดคนละอย่างทันทีตั้งแต่เฟรมแรก และไม่มีอะไรฟ้อง
    for (const f of this.sim.fighters) f.ai = false;
    // ต้องสร้าง Lockstep ตั้งแต่ตอนนี้ ไม่ใช่ตอนเริ่มแมตช์
    // อีกฝั่งอาจกดพร้อมและเริ่มยิงอินพุตก่อนเราจะเลือกตัวเสร็จ ถ้ายังไม่มีที่รับ แพ็คเก็ตพวกนั้นหาย
    // แล้วค้างรอเฟรมที่ไม่มีวันมาถึง (บั๊กเดียวกับตอนที่ฉากโหลดช้ากว่าอีกฝั่ง)
    this.net = new Lockstep(send, { seat, seats });
    this.netSend = send;
    this.picks = {};
    this.readyBy = {};
    this._syncSkillSlots();
    this._syncMatchHud();
    this.syncTools();
    this.openSelect();
    return (pk) => this.netReceive(pk);
  }

  /** ที่นั่งที่แพ็คเก็ตนี้มาจาก — บิลด์เก่าไม่ส่ง `s` มา ห้องสองคนจึงเดาได้ว่าเป็นอีกฝั่ง
   *  ห้องสี่คนเดาไม่ได้ ต้องทิ้ง (เหตุผลเดียวกับ Lockstep.onPacket) */
  _fromSeat(pk) {
    if (typeof pk.s === 'number') return pk.s;
    return (this.netSeats ?? 2) === 2 ? 1 - this.mySeat() : -1;
  }

  netReceive(pk) {
    if (!this.net || !pk) return;
    // คนอื่นเปลี่ยนตัวละคร — เห็นสด ๆ บนหน้าเลือกตัว ทีละที่นั่ง ไม่ใช่ "อีกฝั่ง" ที่มีอยู่คนเดียว
    if (pk.t === 'pick' || pk.t === 'ready') {
      const seat = this._fromSeat(pk);
      if (seat < 0 || seat === this.mySeat()) return;   // ของตัวเองที่วนกลับมาจากตัวส่งต่อ = ข้าม
      if (pk.char && CHARACTERS[pk.char]) {
        (this.picks ??= {})[seat] = pk.char;
        const f = this.sim.fighters[seat];
        if (f) f.char = pk.char;
      }
      if (pk.t === 'ready') { (this.readyBy ??= {})[seat] = !!pk.ready; this._maybeStartNetMatch(); }
      this._drawSelect();
      return;
    }
    // โฮสต์สั่งเริ่ม — ตัวละครและค่าปรับจูนชุดสุดท้ายมาพร้อมกันในแพ็คเก็ตนี้
    // แขกไม่เริ่มเองเด็ดขาด ต้องรออันนี้เท่านั้น นาฬิกาเฟรม 0 จะได้ออกตัวพร้อมกัน
    if (pk.t === 'go') {
      if (this.isHost || this.phase !== 'select') return;
      // chars มาเป็นลิสต์เรียงตามที่นั่ง — p1/p2 คือรูปแบบเก่าของห้องสองคน ยังรับไว้
      const chars = pk.chars ?? [pk.p1, pk.p2];
      chars.forEach((c, i) => { if (CHARACTERS[c] && this.sim.fighters[i]) this.sim.fighters[i].char = c; });
      // เลขแมตช์มาจากโฮสต์เสมอ ไม่ใช่ต่างคนต่างนับ — นับเองแล้วสองฝั่งเหลื่อมกันได้
      // ถ้าเหลื่อม อินพุตของอีกฝั่งจะถูกทิ้งทั้งหมดเพราะ epoch ไม่ตรง = ค้างรอตลอดกาล
      this.matchEpoch = pk.m ?? 0;
      applyTune(pk.tune);       // ฟิสิกส์ต้องเป็นชุดของโฮสต์ ไม่ใช่ที่เครื่องนี้เคยลากสไลเดอร์ไว้
      this.beginMatch();
      return;
    }
    // อีกฝั่งกดกลับไปเลือกตัว (จากเมนู หรืออัตโนมัติตอนจบแมตช์) — ตามไปด้วย ไม่ต้องถาม
    if (pk.t === 'lobby') { if (this.phase !== 'select') this.openSelect(); return; }
    this.net.onPacket(pk);
  }

  endNet(why) {
    if (!this.net) return;
    this.net = null;
    this.netSend = null;
    this.versus = 'solo';
    this.netMsg = why ?? null;
    this.sim.resetPositions();
    this._syncMatchHud();
    this.syncTools();
  }

  /** หนึ่ง tick ของโหมดเน็ต: ส่งปุ่มของตัวเอง แล้วเดินซิม
   *
   *  **บั๊กที่เจอตอนเล่นกับเพื่อนจริง: เกมวิ่งเร็วสี่เท่า**
   *
   *  เดิมเขียน `let budget = 4` ตายตัว ด้วยเจตนาว่า "เผื่อไว้ตอนไล่ตามหลัง"
   *  แต่ lockstep จองอินพุตล่วงหน้า `delay` เฟรมอยู่แล้วทั้งสองฝั่ง (pushLocal เติมถึง frame + delay)
   *  `ready()` จึงเป็นจริงติดกัน delay+1 เฟรม **ตลอดเวลา** ไม่ใช่แค่ตอนตามหลัง
   *  = เดินซิม 4 เฟรมต่อ tick ทุก tick · tick มา 60 ครั้ง/วินาที · ซิมวิ่ง 240 fps
   *
   *  เกิดกับทุกคู่เครื่อง ไม่เกี่ยวกับรีเฟรชเรตของจอ (accumulator ใน update() คุมให้ 60 tick/วินาทีอยู่แล้ว)
   *  และเทสต์ในหน่วยความจำจับไม่ได้ เพราะมันตั้งใจไล่ให้เร็วสุดเพื่อเช็คว่าสองเครื่องตรงกัน
   *  ไม่ได้เช็คว่า "เดินกี่เฟรมต่อ tick"
   *
   *  ตอนนี้เดินหนึ่งเฟรมต่อ tick เป็นหลัก แล้วเดินเกินได้เฉพาะตอน **ตามหลังจริง**
   *  คือคิวของอีกฝั่งกองไว้เกินระยะจองล่วงหน้า (delay + 1) ซึ่งเกิดตอนเน็ตกระตุกแล้วแพ็คเก็ตมาเป็นก้อน
   */
  tickNet() {
    // ต่อเน็ต = คนจริงคนเดียวต่อเครื่องเสมอ ฝั่ง 1 จึงได้ numpad เต็ม ๆ ไม่ต้องถามโหมด
    const v = packInput(readInput(0, true));
    pressed.clear();
    // บิต "เพิ่งกด" ต้องเก็บค้างไว้จนกว่าจะเข้าคิวได้จริง
    // รอบวาดที่คิวเต็มอยู่แล้วจะไม่ได้จองเฟรมใหม่ ถ้าปล่อยผ่านตรงนี้การกดปุ่มจะหายเงียบ ๆ
    // (อาการที่เจอ: เล่นข้ามเครื่องแล้วเดินได้แต่ออกท่าไม่ได้เลย)
    this.netPress = (this.netPress ?? 0) | (v & PRESS_MASK);
    if (this.net.pushLocal((v & HELD_MASK) | this.netPress) > 0) this.netPress = 0;
    // อีกฝั่งนำอยู่กี่เฟรมจริง — หักระยะจองล่วงหน้าที่มีอยู่ตลอดเวลาออกก่อน
    // ไม่หักออก ทุก tick จะดูเหมือนตามหลังอยู่ delay+1 เฟรม แล้วเร่งทิ้งทุก tick
    const lead = this.net.behind - (this.net.delay + 1);
    let budget = 1 + Math.max(0, Math.min(NET_CATCHUP, lead)), stepped = 0;
    while (budget-- > 0 && this.net.ready()) {
      // take() คืนอินพุตเรียงตามที่นั่งแล้ว ทั้งสองเครื่องจึงส่งเข้า step() เหมือนกันเป๊ะ
      // เดิมต้องสลับลำดับเองตอนเป็นแขก ซึ่งเป็นบั๊กรอเกิดทันทีที่มีที่นั่งที่สาม
      this.sim.step(...this.net.take());
      // อีเวนต์ของทุกเฟรมที่เดิน ไม่ใช่แค่เฟรมสุดท้าย — sim.events ถูกล้างทุก step()
      this._simEvents();
      stepped++;
    }
    // ค้างเพราะรออีกฝั่งเป็นเรื่องปกติของ lockstep (เน็ตกระตุกแป๊บเดียวก็ค้างแล้ว)
    // แต่ถ้าค้างนานกว่าครึ่งวินาทีต้องบอกผู้เล่น ไม่งั้นภาพนิ่งเฉย ๆ แยกไม่ออกจากเกมพัง
    this.netWait = stepped > 0 ? 0 : (this.netWait ?? 0) + 1;
  }

  spark(x, y, size, color) { this.sparks.push({ x, y, size, color, life: 9, max: 9, rot: Math.random() * Math.PI }); }

  /** ปล่อยอนุภาคหนึ่งตัวจากแผ่นเอฟเฟค — ใช้พูลซ้ำ ไม่สร้าง/ทิ้งอ็อบเจกต์ทุกนัด
   *
   *  ทั้งหมดเป็นการวาดล้วน ใช้ Math.random ได้เต็มที่ ไม่กระทบ sim และไม่กระทบ netplay
   *  (sim เดินด้วยเลขเฟรมล้วน เอฟเฟคสองเครื่องต่างกันได้ ไม่มีผลกับผลการต่อสู้)
   *
   *  ADD เป็นค่าเริ่มต้นเพราะของส่วนใหญ่คือแสง — ควันกับฝุ่นต้องสั่ง NORMAL เอง
   *  ไม่งั้นควันขาวบนฟ้าสว่างจะหายสนิท
   */
  //  ชื่อ `fx` ใช้ไม่ได้ — `this.fx` เป็นอ็อบเจกต์ graphics ที่ตั้งไว้ใน create() อยู่แล้ว
  //  เมธอดที่ชื่อซ้ำกับพรอเพอร์ตี้ของอินสแตนซ์จะถูกทับเงียบ ๆ แล้วพังตอนรันเท่านั้น
  emit(frame, x, y, o = {}) {
    if (!this.textures.exists('vfx')) return null;
    this._fxPool ??= []; this._fxLive ??= [];
    const img = this._fxPool.pop() ?? this._world(this.add.image(0, 0, 'vfx', frame));
    const life = o.life ?? 16;
    img.setTexture('vfx', frame).setVisible(true).setActive(true)
      .setPosition(x, y).setDepth(o.depth ?? 8)
      .setBlendMode(o.blend ?? Phaser.BlendModes.ADD)
      .setTint(o.tint ?? 0xffffff).setRotation(o.rot ?? 0)
      .setScale(o.scale ?? 1).setAlpha(o.alpha ?? 1).setFlipX(!!o.flipX);
    this._fxLive.push({ img, life, max: life, a0: o.alpha ?? 1, s0: o.scale ?? 1,
      vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, spin: o.spin ?? 0, grow: o.grow ?? 0,
      drag: o.drag ?? 1 });
    return img;
  }

  _stepFx() {
    if (!this._fxLive?.length) return;
    const keep = [];
    for (const f of this._fxLive) {
      f.life--;
      if (f.life <= 0) { f.img.setVisible(false).setActive(false); this._fxPool.push(f.img); continue; }
      const t = 1 - f.life / f.max;
      f.vx *= f.drag; f.vy = f.vy * f.drag + f.g;
      f.img.x += f.vx; f.img.y += f.vy;
      f.img.rotation += f.spin;
      f.img.setScale(f.s0 * (1 + f.grow * t));
      f.img.setAlpha(f.a0 * (1 - t * t));   // ค้างสว่างตอนต้นแล้วดับเร็วตอนท้าย
      keep.push(f);
    }
    this._fxLive = keep;
  }

  /** ระเบิดประกายตอนหมัดเข้า — ทุกตัวเลขคูณตามน้ำหนักหมัด (hitstop) ไม่ใช่ค่าคงที่
   *  หมัดจิ้มกับไม้จบจึงต่างกันทั้งภาพ ไม่ใช่ต่างแค่เวลาที่ภาพหยุด */
  hitBurst(x, y, hs, dir) {
    const w = Math.min(2.2, hs / 5);                    // 3 เฟรม -> 0.6 · 16 เฟรม -> 2.2
    this.emit('spike', x, y, { scale: 0.10 * w, life: 6 + Math.round(hs * 0.7), grow: 1.8,
      alpha: 0.5, tint: HIT_FX.tint, rot: Math.random() * Math.PI });
    this.emit('star4', x, y, { scale: 0.13 * w, life: 4 + Math.round(hs * 0.5), grow: 1.0, alpha: 0.6 });
    for (let i = 0; i < 2 + Math.round(w * 3); i++) {
      const ang = (Math.random() - 0.5) * 1.7 + (dir > 0 ? 0 : Math.PI);
      const sp = (2 + Math.random() * 5) * w;
      this.emit('streak', x, y, { scale: 0.05 + Math.random() * 0.06 * w, life: 8 + Math.round(hs * 0.8),
        rot: ang, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.35, drag: 0.94,
        alpha: 0.75, tint: HIT_FX.spark });
    }
  }

  /** รอยฟาดตอนท่าเข้าช่วง active — ตำแหน่งยึดกลาง hitbox จริง ไม่ใช่กลางตัวละคร
   *  คนเล่นจึงเห็นว่า "ตรงนี้คือที่ที่โดน" ซึ่งเป็นข้อมูลที่ใช้เล่นได้จริง ไม่ใช่แค่สวย */
  /** เสียงหวดลมของท่านี้ — ใช้ตารางเดียวกับรอยฟาด ไม่ตั้งตารางใหม่
   *
   *  ตารางรอยฟาดรู้อยู่แล้วว่าท่าไหน "เหวี่ยงอะไรบางอย่าง" และท่าไหนไม่ใช่
   *  ท่าปืนของ Alecto ตั้งไว้เป็น null อยู่แล้วเพราะไม่มีรอยฟาด — จึงไม่มีเสียงหวดด้วยโดยอัตโนมัติ
   *  (ยิงปืนต้องใช้เสียงปืน ซึ่งยังไม่มีไฟล์ ปล่อยเงียบดีกว่าใส่เสียงหวดลมให้กระสุน)
   *
   *  ตั้งตารางแยกเมื่อไหร่ วันหนึ่งสองตารางจะไม่ตรงกัน แล้วจะมีท่าที่มีเสียงแต่ไม่มีรอย
   */
  _swingFor(f) {
    const art = CHAR_ART[f.char];
    if (!art) return;
    const spec = art.slash && f.moveId in art.slash ? art.slash[f.moveId] : SLASH_DEFAULT[f.moveId];
    if (!spec) return;
    this._sfx(spec.f === 'slashLash' ? 'whip' : 'swing');
  }

  slashFor(f) {
    const art = CHAR_ART[f.char];
    if (!art) return;
    const spec = art.slash && f.moveId in art.slash ? art.slash[f.moveId] : SLASH_DEFAULT[f.moveId];
    if (!spec) return;
    const hb = f.hitbox();
    const x = hb ? hb.x + hb.w / 2 : f.x + f.facing * 60;
    const y = hb ? hb.y + hb.h / 2 : f.y - 70;
    // ขนาดรอยฟาดยึด **ความกว้างของ hitbox จริง** ไม่ใช่เลขตายตัวหรือดาเมจ
    // รอยที่ใหญ่กว่าระยะที่โดนจริงคือการโกหกคนเล่น — เขาจะอ่านระยะผิดทุกครั้งที่เห็น
    // และมันปรับตัวเองตามท่า: จิ้มสั้นได้รอยสั้น แส้ยาวได้รอยยาว โดยไม่ต้องจูนทีละท่า
    const src = this.textures.get('vfx').get(spec.f + '.png');
    const reach = hb ? hb.w : 90;
    this.emit(spec.f, x, y, {
      scale: (reach / (src?.width || 300)) * 1.15,
      life: 10, grow: 0.3, alpha: 0.5, flipX: f.facing < 0,
      rot: (spec.rot ?? 0) * Math.PI / 180 * f.facing,
      tint: 0xfff2d0, depth: 7,
    });
  }
  popup(x, y, s, color) {
    const t = this._world(this.add.text(x, y, s, { fontFamily: FONT, fontSize: '20px', color, fontStyle: '700', stroke: '#0c111c', strokeThickness: 4 }).setOrigin(0.5));
    this.popups.push({ t, life: 40 });
  }

  /**
   * สไปรท์ Nyx — ตอนนี้มีอาร์ตแค่ยืน/เดิน/วิ่ง (ดู tools/build_scramble_nyx.py)
   * state อื่น (กระโดด/ตี/โดนตี/ล้ม) ยังวาดเป็นกล่องเหมือนเดิมจนกว่าคลิปจะมาครบ
   * ทำแบบนี้เพื่อให้เห็นของจริงบางส่วนก่อนโดยไม่ต้องรอครบ และเทียบได้ว่าอันไหนแทนแล้วอันไหนยัง
   */
  _initSprites() {
    for (const id of Object.keys(CHAR_ART)) if (!CHAR_ART[id].artPending) this._initCharSprite(id);
  }

  _initCharSprite(charId) {
    const art = CHAR_ART[charId];
    const meta = this.textures.get(art.atlasKey)?.customData?.meta ?? {};
    // จุดยึดมาจากตอน build ไม่เดาเอง — feetY/anchorX คือตำแหน่งเท้าและกึ่งกลางหัวบน canvas ต้นฉบับ
    // ใช้ขนาด canvas จาก meta ไม่อ่านจาก sprite.width เพราะเฟรมใน atlas ถูก trim ไว้
    // sprite.width จึงขึ้นกับว่า Phaser ตีความ trimmed frame ยังไง ซึ่งเปราะเกินจะพึ่ง
    art.meta = {
      anchorX: meta.anchorX ?? 192, feetY: meta.feetY ?? 315, standing: meta.standing ?? 300,
      canvasW: meta.canvasW ?? 323, canvasH: meta.canvasH ?? 321,
    };
    for (const [name, n] of Object.entries(art.anims)) {
      if (this.anims.exists(art.atlasKey + '/' + name)) continue;
      this.anims.create({
        key: art.atlasKey + '/' + name,
        frames: Array.from({ length: n }, (_, i) => ({ key: art.atlasKey, frame: `${name}_${i + 1}.png` })),
        // ความเร็วตั้งเป็น "เวลาต่อรอบ" ไม่ใช่ fps ตายตัว เพิ่ม/ลดเฟรมแล้วจังหวะไม่เปลี่ยน
        // เวลาต่อรอบ (วินาที) — ท่าที่ผูกกับ state ที่เอนจิ้นจับเวลาไว้ ตั้งให้พอดีกับเวลานั้น
        // (PHYS: knockdownFrames 28 = 0.47 วิ, techRollFrames 20 = 0.33 วิ ที่ 60 เฟรม/วินาที)
        // ท่าวิ่งคิดเวลาจากความเร็วจริง ไม่ใช่ตัวเลขตายตัว: หนึ่งรอบ = หนึ่งก้าว = เท้าเคลื่อน RUN_STRIDE
        // ตั้งตายตัวแล้วเท้าจะไถไปกับพื้นทันทีที่ปรับความเร็ว (ซึ่งปรับได้จากพาเนล Tune)
        frameRate:
          n / (STRIDE_FIELD[name]
            ? (art[STRIDE_FIELD[name]] ?? RUN_STRIDE_DEFAULT) / (PHYS.run * 60)
            : ANIM_SECONDS[name]),
        // ท่าโดนตีเล่นรอบเดียวแล้วค้างเฟรมสุดท้าย — hitstun ในเอนจิ้นยาวไม่เท่ากัน (17-38 เฟรม)
        // ถ้าวนซ้ำ ตัวจะสะบัดรับแรงซ้ำ ๆ ทั้งที่โดนตีครั้งเดียว
        // ท่าที่ "เล่นจบแล้วค้าง" = ท่าที่เอนจิ้นถือไว้ยาวไม่เท่ากันทุกครั้ง
        // โดนตี: hitstun 17-38 เฟรมแล้วแต่ท่าที่โดน · กระโดด: ลอยนานแค่ไหนแล้วแต่กดค้าง/ชนเพดาน
        // ถ้าวนซ้ำจะเห็นสะบัดรับแรงซ้ำ ๆ หรือตีลังกาวนไม่หยุดกลางอากาศ
        repeat: ["hurt", "jump", "knockdown", "tech", "blockstun"].includes(name) ? 0 : -1,
      });
    }
  }

  /** สไปรท์หนึ่งตัวต่อ "ฝั่ง" (p1/p2) ไม่ใช่ต่อตัวละคร
   *  ถ้าผูกไว้กับตัวละคร พอทั้งสองฝั่งเลือกตัวเดียวกันจะแย่ง sprite ตัวเดียวกันวาด เหลือให้เห็นฝั่งเดียว
   *  สถานะที่ใช้ตัดสินว่าจะเล่นท่าใหม่ไหม (lastState/lastJumps) ก็ต้องแยกต่อฝั่งด้วยเหตุผลเดียวกัน */
  _rigFor(f) {
    this.rigs ??= {};
    let r = this.rigs[f.id];
    if (!r) {
      // ความลึกไล่ตามลำดับในลิสต์ คนแรกอยู่หน้าสุด — เดิมเขียน 'p1' ตายตัว
      // ซึ่งพอมีสี่คนจะได้ความลึกเท่ากันหมดสามคน แล้วสลับหน้าหลังมั่วทุกเฟรม
      const idx = Math.max(0, this.sim.fighters.indexOf(f));
      r = this.rigs[f.id] = { sprite: this._world(this.add.sprite(0, 0, CHAR_ART[f.char].atlasKey, 'idle_1.png')
        .setVisible(false).setDepth(5 - idx * 0.1)), char: f.char, lastState: null, lastJumps: null };
    }
    if (r.char !== f.char) {   // สลับตัวละครกลางเกม: เปลี่ยนเท็กซ์เจอร์แล้วบังคับให้เริ่มท่าใหม่
      r.sprite.setTexture(CHAR_ART[f.char].atlasKey, 'idle_1.png');
      r.char = f.char; r.lastState = null;
    }
    return r;
  }

  /** วาง/ย่อ/พลิกสไปรท์ให้ตรงกับตัวละคร — ใช้ร่วมกันทั้งท่าปกติและท่าโจมตี */
  _applyCharTransform(f) {
    const art = CHAR_ART[f.char];
    const m = art.meta;
    const rig = this._rigFor(f);
    // สไปรท์สูง SPRITE_H px บนเวที เทียบกับ hurtbox ที่สูง PHYS.standH (118)
    // เก็บมา 300 px จึงย่อลงด้วยอัตราส่วนนี้ แล้วเลื่อนให้ "เท้าในภาพ" ไปอยู่ที่เท้าของตัวละครพอดี
    const scale = SPRITE_H / m.standing;
    const sp = rig.sprite;
    sp.setVisible(true).setScale(scale).setFlipX(f.facing < 0);
    sp.setOrigin(m.anchorX / m.canvasW, m.feetY / m.canvasH);
    sp.setPosition(f.x, f.y);
    sp.setAlpha(this._veilAlpha(f, f.invuln > 0 && Math.floor(f.invuln / 3) % 2 ? 0.5 : 1));
    this._hitFlash(f, sp);
  }

  /** วาดตัวละครด้วยสไปรท์ถ้าตัวนั้นมีอาร์ตของ state นั้นแล้ว — คืน true ถ้าวาดให้แล้ว
   *  ตัวที่ยังไม่มีอาร์ต (เช่นหุ่นซ้อม) ไม่มีใน CHAR_ART ก็ตกไปวาดเป็นกล่องเหมือนเดิม */
  /** แฟลชตอนโดนตี — ของเดิมมีแต่ในเส้นทางที่วาดเป็นกล่อง (drawFighter)
   *
   *  ตัวละครที่มีอาร์ตจริงจึง **ไม่เคยแฟลชเลยสักครั้ง** ตั้งแต่เปลี่ยนมาใช้สไปรท์
   *  ซึ่งเป็นของที่หายไปโดยไม่ได้ตั้งใจ ไม่ใช่การตัดสินใจ — และมันคือสัญญาณ "โดนแล้ว"
   *  ที่อ่านเร็วที่สุดในเกมต่อสู้ เร็วกว่าหลอดเลือดและเร็วกว่าตัวเลขดาเมจ
   *
   *  ใช้ setTintFill ไม่ใช่ setTint — setTint เป็นการ "คูณสี" ซึ่งคูณด้วยขาวแล้วไม่มีอะไรเปลี่ยน
   *  setTintFill ทับทั้งตัวเป็นสีเดียว = เห็นเป็นเงาดำ/ขาวของท่านั้น ซึ่งคือลุคที่ต้องการ
   *
   *  เกราะของ Atlas แฟลชสีเหลืองอำพันแทน: โดนแล้วแต่ท่าไม่ขาด เป็นคนละเรื่องกับโดนแล้วเซ
   *  ถ้าแฟลชสีเดียวกัน คนตีจะอ่านว่า "เข้าแล้ว" ทั้งที่จริง ๆ อีกฝ่ายกำลังเดินหน้าใส่ต่อ
   */
  _hitFlash(f, sp) {
    if (f.hitstop <= 0) { sp.clearTint(); return; }
    if (f.state === 'hitstun') sp.setTintFill(0xffffff);
    else if (f.state === 'attack' && f.move?.armor && f.armorLeft >= 0) sp.setTintFill(0xffc24a);
    else sp.clearTint();
  }

  /** ความจางตอนอยู่ในวงฝุ่น
   *
   * ข้อจำกัดจริง: เล่นสองคนเครื่องเดียวกันมองจอเดียวกัน ถ้าซ่อนสนิทคนเล่นเธอก็มองไม่เห็นตัวเอง
   * จึงทำสองระดับ — ต่อเน็ตแยกได้ว่าใครเป็นฝั่งเรา เลยซ่อนจากอีกฝั่งได้เต็มที่
   * ส่วนจอเดียวกันต้องประนีประนอม จางพอให้ติดตามยากแต่ยังบังคับได้
   *
   * ค่านี้เป็นแค่การวาด ไม่แตะ sim เลย สองเครื่องจึงยังคำนวณตรงกันเป๊ะ
   */
  _veilAlpha(f, base) {
    if (!f.veil) return base;
    const mine = this.versus === 'net' && f.id === (this.isHost ? 'p1' : 'p2');
    const hidden = this.versus === 'net' ? (mine ? 0.55 : 0.08) : 0.3;
    return Math.min(base, hidden);
  }

  _drawCharSprite(f) {
    const art = CHAR_ART[f.char];
    // ตัวที่ยังไม่มีอาร์ตต้อง "ซ่อนสไปรท์เดิมของฝั่งนั้น" ก่อนคืนค่า ไม่ใช่คืนเฉย ๆ
    // ไม่งั้นสไปรท์ของตัวละครที่เลือกไว้ก่อนหน้าจะค้างอยู่บนเวที (เห็น Nyx ยืนคู่กับกล่อง Atlas)
    if (!art || art.artPending) {
      const rig = this.rigs?.[f.id];
      if (rig) rig.sprite.setVisible(false);
      return false;
    }
    const rig = this._rigFor(f);
    const sp = rig.sprite;
    sp.anims.timeScale = 1;   // ท่าที่หรี่ความเร็วเองจะตั้งทับทีหลัง

    if (f.state === 'attack' && art.attacks.has(f.moveId)) {
      // รอยฟาดปล่อยที่ "เฟรมแรกของช่วง active" เฟรมเดียว ไม่ใช่ทุกเฟรมที่ยังอยู่ในท่า
      // ปล่อยทุกเฟรมจะซ้อนกันเป็นแผ่นทึบ และปล่อยตอนเริ่มท่าจะมาก่อนกรอบโจมตีจริง
      // ซึ่งสอนคนเล่นผิดว่าโดนได้ตั้งแต่ตอนเงื้อ
      const tag = f.moveId + '#' + f.move?.startup;
      // เสียงหวดลมออกตอน "เริ่มท่า" ไม่ใช่ตอน active เหมือนรอยฟาด — ตั้งใจให้ต่างกัน
      // รอยฟาดต้องตรงกับกรอบโจมตีจริง ไม่งั้นสอนคนเล่นผิดว่าโดนได้ตั้งแต่ตอนเงื้อ
      // แต่เสียงต้องมาก่อน เพราะถ้าออกพร้อม active เสียงหวดกับเสียงหมัดจะห่างกันเฟรมเดียว
      // แล้วหักล้างกันเป็นเสียงเดียวขุ่น ๆ แทนที่จะเป็นเงื้อ-แล้ว-โดน
      if (rig.lastSwing !== tag) { rig.lastSwing = tag; this._swingFor(f); }
      if (f.phase() === 'active' && rig.lastSlash !== tag) { rig.lastSlash = tag; this.slashFor(f); }
      else if (f.phase() !== 'active' && rig.lastSlash === tag && f.moveF < f.move.startup) rig.lastSlash = null;
      // ท่าที่ติดธง mobile (โหมดไรเฟิล) เดินไปด้วยยิงไปด้วยได้ เฟรมท่ายิงเป็นท่ายืนนิ่ง
      // ถ้าใช้เฟรมนั้นตอนเธอเคลื่อนที่จริง เท้าจะไถไปกับพื้น -> สลับไปเล่นวงจรเดินถือปืนแทน
      // เป็นเรื่องวาดล้วน ๆ hitbox/เฟรมเดตายังเป็นของท่ายิงเหมือนเดิม sim ไม่รู้เรื่องนี้เลย
      if (art.anims.runGun && f.moves[f.moveId]?.mobile && f.onGround && Math.abs(f.vx) > GUN_WALK_VX) {
        this._applyCharTransform(f);
        // ลงทะเบียนไว้ที่ความเร็ววิ่งเต็ม จึงต้องหรี่ตามความเร็วจริง ไม่งั้นย่ำเท้าเร็วกว่าที่เคลื่อนไป
        sp.anims.timeScale = Math.abs(f.vx) / PHYS.run;
        if (rig.lastState !== 'gunwalk') { rig.lastState = 'gunwalk'; sp.play(art.atlasKey + '/runGun'); }
        return true;
      }
      // ท่าโจมตี: เลือกเฟรมจาก phase() ของเอนจิ้นตรง ๆ ไม่ผ่าน animation ที่เล่นตามเวลา
      // เพราะ animation ต้องกะ fps ให้จบพอดีกับ startup+active+recovery ซึ่งคลาดเคลื่อนได้เสมอ
      // อ่านจาก phase() แทน = เฟรม "ฟันสุดแขน" โผล่ตรงกับช่วงที่ hitbox มีผลจริงเป๊ะทุกครั้ง
      const i = { startup: 1, active: 2, recovery: 3 }[f.phase()] ?? 1;
      this._applyCharTransform(f);
      sp.anims.stop();
      sp.setFrame(`${f.moveId}_${i}.png`);
      rig.lastState = 'attack:' + f.moveId + i;
      return true;
    }

    rig.lastSlash = null;   // ออกจากท่าแล้วล้างตัวจำ ท่าเดิมซ้ำติด ๆ กันจึงปล่อยรอยฟาดทุกครั้ง

    // state ของเอนจิ้น -> ชื่อท่าที่มีอาร์ต (ที่ไม่อยู่ในตารางนี้ยังวาดเป็นกล่อง)
    let key = {
      run: 'run', walk: 'run', idle: 'idle', crouch: 'crouch',
      air: 'jump', landing: 'jump',
      hitstun: 'hurt', knockdown: 'knockdown', techroll: 'techroll', tech: 'tech',
      block: 'block', blockcrouch: 'blockcrouch', blockstun: 'blockstun',
    }[f.state] ?? null;
    // สลับอาวุธแล้วท่ายืน/ท่าวิ่งต้องเปลี่ยนตาม ไม่งั้นเธอถือแส้ยืนอยู่แล้วยิงไรเฟิลออกมา
    // มีเฉพาะสองท่านี้ (ท่าย่อ/กระโดดยังเป็นของแส้) — เป็นอาร์ตที่ยังไม่มี ไม่ใช่การตัดสินใจ
    if (f.alt && art.anims[key + 'Gun']) key += 'Gun';
    if (!key || !art.anims[key]) { sp.setVisible(false); return false; }

    this._applyCharTransform(f);
    const anim = art.atlasKey + '/' + key;
    // เล่นใหม่เมื่อเปลี่ยน state — โดนตีซ้ำตอนยังอยู่ใน hitstun เอนจิ้นไม่รีเซ็ต stateF ให้
    // (setState เช็คว่าซ้ำเดิมไหม) ท่าจึงควรเล่นต่อไม่กระตุกกลับเฟรมแรก
    // ยกเว้นดับเบิลจัมพ์: ยังอยู่ state 'air' เหมือนเดิมแต่ควรตีลังกาใหม่ — ดูจาก jumpsLeft ที่ลดลง
    const doubleJumped = f.jumpsLeft !== rig.lastJumps;
    rig.lastJumps = f.jumpsLeft;
    // ผูกชื่อท่าไว้ในตัวบ่งชี้ด้วย ไม่ใช่แค่ state — สลับอาวุธตอนยืน/วิ่งอยู่ state ไม่เปลี่ยน
    // ถ้าดูแค่ state เธอจะถือแส้ค้างอยู่จนกว่าจะเปลี่ยนท่าอย่างอื่นก่อน
    const tag = f.state + '/' + key;
    if (rig.lastState !== tag || (key === 'jump' && doubleJumped)) {
      rig.lastState = tag;
      // ลงพื้น = ค้างที่เฟรมสุดท้ายของท่ากระโดด (ยืดตัวรับพื้น) ไม่ใช่เริ่มตีลังกาใหม่ตอนแตะพื้น
      if (f.state === 'landing') sp.anims.stop(), sp.setFrame(`jump_${art.anims.jump}.png`);
      else sp.play(anim);
    }
    return true;
  }

  drawFighter(g, f, body, accent, isDummy) {
    const hb = f.hurtbox();
    const flash = f.hitstop > 0 && f.state === 'hitstun';
    const col = flash ? 0xffffff : body;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(f.x, f.onGround ? f.y + 2 : Math.min(STAGE.groundY, f.y + 200) + 2, 50, 10);
    if (f.state === 'techroll') {
      g.fillStyle(col, f.invuln > 0 ? 0.55 : 1); g.fillCircle(f.x, f.y - 30, 30);
      g.lineStyle(3, 0x57e39a, 0.8); g.strokeCircle(f.x, f.y - 30, 30);
      return;
    }
    if (f.state === 'knockdown') {
      g.fillStyle(col, 1); g.fillRoundedRect(f.x - 55, f.y - 26, 110, 26, 10);
      g.fillCircle(f.x - f.facing * 52, f.y - 16, 15);
      return;
    }
    const alpha = f.invuln > 0 && Math.floor(f.invuln / 3) % 2 ? 0.5 : 1;
    // scarf / ponytail trails behind
    if (!isDummy) {
      const wave = f.state === 'run' || !f.onGround ? -6 : 8;
      g.fillStyle(accent, alpha);
      g.fillTriangle(f.x - f.facing * 8, hb.y + 16, f.x - f.facing * 40, hb.y + 18 + wave, f.x - f.facing * 8, hb.y + 30);
    }
    g.fillStyle(col, alpha);
    g.fillRoundedRect(hb.x, hb.y + 26, hb.w, hb.h - 26, 10);
    g.fillCircle(f.x, hb.y + 15, 15);
    if (isDummy) {
      g.lineStyle(3, C.dummyMark, 1);
      g.lineBetween(f.x - 10, hb.y + 50, f.x + 10, hb.y + 70); g.lineBetween(f.x + 10, hb.y + 50, f.x - 10, hb.y + 70);
    } else {
      g.fillStyle(accent, alpha); g.fillRect(hb.x, hb.y + 58, hb.w, 6); // belt
    }
    g.fillStyle(0x10131a, 1); g.fillCircle(f.x + f.facing * 7, hb.y + 13, 2.5);
    // guard pose when blocking
    if (f.state === 'block' || f.state === 'blockstun') {
      g.lineStyle(4, 0x8fc0ff, 0.9);
      g.beginPath(); g.arc(f.x + f.facing * 10, hb.y + hb.h / 2, hb.h / 2 + 6, f.facing > 0 ? -1.1 : Math.PI - 1.1, f.facing > 0 ? 1.1 : Math.PI + 1.1); g.strokePath();
    }
    // daggers
    if (!isDummy) {
      const box = f.hitbox();
      g.lineStyle(4, 0xb9895a, 1);
      if (box) {
        const tipX = f.facing > 0 ? box.x + box.w : box.x;
        g.lineBetween(f.x + f.facing * 14, hb.y + 60, tipX, box.y + box.h / 2);
      } else {
        g.lineBetween(f.x + f.facing * 16, hb.y + 62, f.x + f.facing * 30, hb.y + 80);
        g.lineBetween(f.x - f.facing * 6, hb.y + 62, f.x - f.facing * 22, hb.y + 46);
      }
    }
    // phase pip over head
    const ph = f.phase();
    if (ph) { g.fillStyle(C[ph], 1); g.fillRect(f.x - 14, hb.y - 14, 28, 5); }
  }

  /** เลื่อนเลเยอร์หลังตามจุดกึ่งกลางของการต่อสู้ — อ่านอย่างเดียว ไม่เขียนอะไรกลับเข้า sim
   *
   *  ไล่เข้าหาเป้าแบบ lerp ไม่กระโดดไปตรง ๆ ไม่งั้นตอนใครโดนดีดข้ามจอ ฉากหลังจะสะบัดตาม
   *  ซึ่งอ่านเป็น "ภาพค้าง" มากกว่าความลึก
   */
  _stepParallax(s) {
    if (!this.parallax?.length) return;
    const fx = s.fighters.reduce((a, f) => a + f.x, 0) / s.fighters.length - STAGE.w / 2;
    // ความสูงคิดจาก "สูงกว่าพื้นเท่าไหร่" ไม่ใช่ y ดิบ — ยืนพื้น = 0 เสมอ
    // ค่าจึงไม่เคยติดลบ เลเยอร์เลื่อนลงได้อย่างเดียว ใต้หน้าผาไม่มีวันโหว่ให้เห็นฟ้า
    const rise = Math.max(0, STAGE.groundY - s.fighters.reduce((a, f) => a + f.y, 0) / s.fighters.length);
    for (const L of this.parallax) {
      const wx = L.x0 - fx * L.k.x + (L.drift ? Math.sin(s.frame * L.drift * 0.01) * 26 : 0);
      const wy = L.y0 + rise * L.k.y;
      L.img.x += (wx - L.img.x) * PARALLAX.lerp;
      L.img.y += (wy - L.img.y) * PARALLAX.lerp;
    }
  }

  draw() {
    const s = this.sim, g = this.world, fx = this.fx, hud = this.hud;
    this._stepParallax(s);
    this._stepCamera(s);
    this._fadeHudFor(s);
    g.clear(); fx.clear(); hud.clear();
    // ทั้งสองฝั่งวาดด้วยเส้นทางเดียวกัน — ท่าที่ยังไม่มีอาร์ตตกไปเป็นกล่องเหมือนเดิม
    // เงาใต้เท้ายังวาดจาก graphics เสมอ ทั้งตอนใช้สไปรท์และตอนใช้กล่อง
    for (const f of [...s.fighters].reverse()) {
      if (this._drawCharSprite(f)) {
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(f.x, f.onGround ? f.y + 2 : Math.min(STAGE.groundY, f.y + 200) + 2, 50, 10);
      } else {
        // ตัวละครที่ยังไม่มีอาร์ตใช้สีกล่องของตัวเอง จะได้แยกออกจากหุ่นซ้อม
        const art = CHAR_ART[f.char];
        if (art && art.artPending) this.drawFighter(g, f, art.box, art.boxAccent, false);
        else if (f.team === s.p1.team) this.drawFighter(g, f, C.nyx, C.nyxScarf, false);
        else this.drawFighter(g, f, C.dummy, C.dummyMark, true);
      }
    }

    // นับถอยหลังของท่าตั้งป้อมยืนยิง — ปักหลักอยู่ 5 วินาทีโดยไม่มีอะไรบอกว่าเหลือเท่าไหร่
    // แปลว่าทั้งคนยิงและคนโดนยิงเดาไม่ถูกว่าจะจบเมื่อไหร่ ซึ่งเป็นข้อมูลที่ทั้งคู่ต้องใช้ตัดสินใจ
    for (const f of s.fighters) {
      const left = f.stanceUntil - s.frame;
      if (left <= 0) continue;
      // หาจากสกิลที่ประกาศ stance จริง ๆ ไม่ใช่เดาว่าเป็นช่องแรกเสมอ
      // (Alecto ไม่มีท่าตั้งป้อมแล้ว ส่วนของ Orpheus อยู่ช่อง 3 ไม่ใช่ช่อง 1)
      const total = f.skills.map((k) => k && f.moves[k]?.stance).find(Boolean) ?? 300;
      const w = 46, x = f.x - w / 2, y = f.y - 150;
      g.fillStyle(0x0c111c, 0.7); g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle(0xffb03a, 1); g.fillRect(x, y, w * Math.min(1, left / total), 5);
    }

    // ── ตัวแสดงแทนของ Momus ──
    //
    // ใช้ "เฟรมแรกของท่ายืน" ของตัวละครจริง ไม่ใช่รูปวาดแยก — มันจึงเหมือนเขาจริง ๆ
    // และ **ไม่ขยับเลยสักเฟรม** ซึ่งคือสิ่งที่ทำให้มันยุติธรรม: คนเล่นที่ตั้งใจดูจะแยกออก
    // จากความนิ่ง แต่ในวินาทีที่กำลังรัวอยู่มันหลอกได้จริง
    if (s.decoy) {
      const art = CHAR_ART[(s.fighterById(s.decoy.owner) ?? s.p1).char];
      if (art && !art.artPending) {
        this.decoySprite ??= this._world(this.add.sprite(0, 0, art.atlasKey, 'idle_1.png').setDepth(3));
        const m = art.meta, sp = this.decoySprite;
        sp.setTexture(art.atlasKey, 'idle_1.png');
        sp.setVisible(true).setScale(SPRITE_H / m.standing).setFlipX(s.decoy.facing < 0);
        sp.setOrigin(m.anchorX / m.canvasW, m.feetY / m.canvasH);
        sp.setPosition(s.decoy.x, s.decoy.y);
        // จาง ๆ นิดเดียว พอให้คนที่มองหาจับได้ แต่ไม่ถึงกับประกาศว่าเป็นของปลอม
        sp.setAlpha(0.88);
      }
    } else if (this.decoySprite) this.decoySprite.setVisible(false);

    // กล่องระเบิดของ Momus — ชนวนต้องอ่านออกจากที่ไกล ๆ ไม่งั้นมันคือกับดักที่มองไม่เห็น
    // ยิ่งใกล้ระเบิดยิ่งกะพริบถี่ขึ้น คนเล่นทั้งสองฝั่งจึงกะจังหวะหนีได้เท่ากัน
    // (เจ้าของก็โดนระเบิดตัวเอง สัญญาณนี้จึงเป็นของทั้งสองฝ่ายจริง ๆ ไม่ใช่ของฝ่ายเดียว)
    for (const b of s.boxes) {
      const rate = b.fuse < 40 ? 0.45 : b.fuse < 90 ? 0.2 : 0.09;
      const hot = Math.sin(s.frame * rate) > 0;
      // ── วาดทุกชั้นที่อยู่ในแนวตั้งเดียวกัน ไม่ใช่แค่พื้นล่างสุด ──
      //
      // กลไกจุดชนวนของ sim **ไม่ได้เช็คความสูงเลย** — เงื่อนไขคือ "ยืนอยู่บนพื้น
      // และอยู่ในระยะแนวนอน" เท่านั้น คนที่ยืนบนชั้น 5 จึงจุดชนวนกล่องที่พื้นล่างสุดได้
      // ซึ่งถูกแล้วสำหรับอัลติ (ทั้งโรงโดน) แต่เดิมวาดไว้ที่พื้นอย่างเดียว
      // คนบนชั้นบนจึงโดนระเบิดที่มองไม่เห็น = กับดักที่ไม่ยุติธรรม
      //
      // วาดให้ครบทุกชั้นแล้วภาพตรงกับกลไก และอ่านออกว่า "แนวนี้อันตรายทุกระดับ"
      const surfaces = [STAGE.groundY];
      for (const p of STAGE.platforms)
        if (b.x >= p.x1 && b.x <= p.x2) surfaces.push(p.y);
      for (const y of surfaces) {
        fx.fillStyle(0x6b4a2a, 1); fx.fillRect(b.x - 24, y - 46, 48, 46);
        fx.lineStyle(3, 0x3a2716, 1); fx.strokeRect(b.x - 24, y - 46, 48, 46);
        fx.lineStyle(3, 0x8a6236, 1);
        fx.lineBetween(b.x - 24, y - 46, b.x + 24, y);
        fx.lineBetween(b.x + 24, y - 46, b.x - 24, y);
        // ยังไม่ติดชนวน = ยังเหยียบผ่านได้ ต้องบอกให้รู้ ไม่งั้นคนเล่นจะเดาผิดทั้งสองทาง
        fx.fillStyle(b.arm > 0 ? 0x9aa3b5 : (hot ? 0xffd166 : 0xc8323c), 1);
        fx.fillCircle(b.x, y - 54, 7);
      }
    }

    // กองไฟจากมอลอตอฟ — ต้องเห็นขอบเขตชัดว่าตรงไหนเข้าไม่ได้ ไม่งั้นเป็นกับดักที่มองไม่เห็น
    // เปลวไฟใช้เลขเฟรมของ sim เป็นตัวขยับ ไม่ใช่เวลาจริง ภาพสองเครื่องจึงตรงกันด้วย
    for (const fire of s.fires) {
      const fade = Math.min(1, fire.life / 40);        // ใกล้หมดอายุค่อย ๆ จาง
      const y = STAGE.groundY;
      g.fillStyle(0xe05a57, 0.16 * fade);
      g.fillRect(fire.x - 62, y - 54, 124, 54);
      for (let i = 0; i < 7; i++) {
        const px = fire.x - 54 + i * 18;
        const h = 22 + 16 * Math.abs(Math.sin(this.sim.frame * 0.22 + i * 1.7));
        g.fillStyle(0xffb03a, 0.75 * fade);
        g.fillRect(px - 5, y - h, 10, h);
        g.fillStyle(0xffe08a, 0.85 * fade);
        g.fillRect(px - 2, y - h * 0.55, 4, h * 0.55);
      }
      g.fillStyle(0xc8323c, 0.5 * fade);
      g.fillRect(fire.x - 62, y - 5, 124, 5);
    }

    // มีดที่ขว้างออกไป — หมุดที่ปะทะแล้วค้างอยู่วาดเป็นวงแดงกระพริบให้รู้ว่ากดวาร์ปตามได้
    for (const sh of s.shots) {
      if (!sh.target) {
        const ang = sh.stuck > 0 ? 0 : Math.atan2(sh.vy, sh.vx);
        g.lineStyle(4, 0xc9a227, 1);
        g.beginPath();
        g.moveTo(sh.x - Math.cos(ang) * 13, sh.y - Math.sin(ang) * 13);
        g.lineTo(sh.x + Math.cos(ang) * 13, sh.y + Math.sin(ang) * 13);
        g.strokePath();
      }
      if (sh.anchor && sh.stuck > 0) {
        const pulse = 0.45 + 0.35 * Math.sin(this.sim.frame * 0.35);
        g.lineStyle(2, 0xe05a57, pulse);
        if (sh.target) {
          // หมายหัวคน: วงใหญ่กว่าและเกาะตัวเป้าไป บอกว่า "วาร์ปไปหาคนนี้" ไม่ใช่ "ไปที่จุดนี้"
          g.strokeCircle(sh.x, sh.y, 30);
          g.lineStyle(2, 0xe05a57, pulse * 0.6);
          g.strokeCircle(sh.x, sh.y, 38);
        } else {
          g.strokeCircle(sh.x, sh.y, 17);
        }
      }
    }

    this._drawTags(s, fx);

    for (const f of s.fighters) {
      const box = f.hitbox();
      if (box) {
        fx.fillStyle(0xffffff, 0.35);
        fx.fillEllipse(box.x + box.w / 2, box.y + box.h / 2, box.w, Math.max(14, box.h * 0.8));
      }
      if (this.showBoxes) {
        const hb = f.hurtbox();
        fx.lineStyle(2, C.hurt, f.invuln ? 0.3 : 0.9); fx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        if (box) { fx.fillStyle(C.hit, 0.3); fx.fillRect(box.x, box.y, box.w, box.h); fx.lineStyle(2, C.hit, 1); fx.strokeRect(box.x, box.y, box.w, box.h); }
      }
    }
    for (const sp of this.sparks) {
      const t = 1 - sp.life / sp.max, len = sp.size * (1 + t * 2.2);
      fx.lineStyle(3, sp.color, 1 - t);
      for (let i = 0; i < 6; i++) {
        const a = sp.rot + i * Math.PI / 3;
        fx.lineBetween(sp.x + Math.cos(a) * len * 0.35, sp.y + Math.sin(a) * len * 0.35, sp.x + Math.cos(a) * len, sp.y + Math.sin(a) * len);
      }
    }

    // วงฝุ่นของ Alecto — วาดเป็นแถบจาง ๆ กว้าง ๆ ตรงพื้น บอกขอบเขตให้ชัดว่าตรงไหนปลอดภัย
    if (s.dust) {
      const d = s.dust, t = Math.min(1, d.life / 45);
      fx.fillStyle(0xbfae8e, 0.16 * t);
      fx.fillRect(d.x - 200, STAGE.groundY - 150, 400, 150);
      fx.fillStyle(0xd8c9a8, 0.1 * t);
      fx.fillRect(d.x - 200, STAGE.groundY - 60, 400, 60);
      fx.lineStyle(2, 0xd8c9a8, 0.22 * t);
      fx.strokeRect(d.x - 200, STAGE.groundY - 150, 400, 150);

      // ผนังกรง: วาดเฉพาะตอนมีคนติดอยู่จริง ไม่งั้นมันคือแถบฝุ่นเฉย ๆ
      // ต้องเห็นว่า "เดินออกทางนี้ไม่ได้" ไม่ใช่รู้ตัวตอนเดินชนแล้วงงว่าทำไมไม่ไป
      // ขีดตั้งสูงกว่ากรอบฝุ่น = อ่านเป็นกำแพง ไม่ใช่ขอบแถบ
      const held = s.fighters.some((f) => f.caged);
      if (held) {
        const pulse = 0.45 + 0.25 * Math.abs(Math.sin(s.frame * 0.12));
        for (const wx of [d.x - 200, d.x + 200]) {
          fx.fillStyle(0xd8c9a8, 0.1 * t);
          fx.fillRect(wx - 5, STAGE.groundY - 190, 10, 190);
          fx.fillStyle(0xffe08a, pulse * t);
          fx.fillRect(wx - 2, STAGE.groundY - 190, 4, 190);
        }
      }
    }

    // แผงผู้เล่น: รูปกลม + วงเลือดรอบรูป — กินที่เท่าเดิมไม่ว่าสองคนหรือสี่คน (ดู POD)
    // หลอดยาวแบบเดิมพอเป็น 2v2 กลายเป็นสี่หลอดซ้อนกันกินความกว้างครึ่งจอ และยังไม่รู้ว่าอันไหนของใคร
    this._syncPods(s);
    this._drawPods(s, hud);
    this._syncKoBanner(s);
    this._syncSkillBtns();
    // สถานะหุ่นซ้อมไม่มีความหมายเมื่อฝั่งขวาเป็นคนจริง
    this.tMode.setText(this.versus === 'solo' ? 'Dummy: ' + MODE_LABEL[s.dummyMode] + '    Tech: ' + TECH_LABEL[s.dummyTech] : '');

    // combo counter
    const combod = s.foes(s.p1).reduce((best, f) => (f.comboHits > (best?.comboHits ?? 0) ? f : best), null) ?? s.p2;
    const live = combod.comboHits;
    if (live > 0) { this.tCombo.setText(live + (live === 1 ? ' hit' : ' hits')).setAlpha(1); this.tComboSub.setText(combod.comboDmg + ' damage').setAlpha(1); }
    else if (this.comboFade > 0 && this.lastCombo) {
      const a = Math.min(1, this.comboFade / 30);
      this.tCombo.setText(this.lastCombo.hits + ' hits').setAlpha(a); this.tComboSub.setText(this.lastCombo.dmg + ' damage').setAlpha(a);
    } else { this.tCombo.setText(''); this.tComboSub.setText(''); }

    // move info + frame meter
    const m = this.dev ? s.lastMoveInfo : null;
    if (m) this.tMove.setText(`${m.label}    Startup ${m.startup}f    Active ${m.untilLand ? 'until landing' : m.active + 'f'}    Recovery ${m.untilLand ? m.landLag + 'f landing' : m.recovery + 'f'}    Damage ${m.dmg}`);
    const mx = 60, my = 672;
    hud.fillStyle(0x0c111c, 0.6); hud.fillRect(mx - 4, my - 4, 150 * 5 + 8, 18);
    s.meter.forEach((ph, i) => { hud.fillStyle(C[ph], 1); hud.fillRect(mx + i * 5, my, 4, 10); });

    if (this.showPace && this.pace) {
      const { hz, sfps } = this.pace;
      // เกมควรเดิน 60 เฟรม/วินาทีเสมอ ไม่ว่าจอจะวาดกี่ครั้ง ตัวคูณที่ไม่ใช่ 1.00 คือผิด
      this.tPace.setText(`จอวาด ${hz.toFixed(0)}/วิ · เกมเดิน ${sfps.toFixed(0)} เฟรม/วิ · ความเร็ว ${(sfps / 60).toFixed(2)}x`);
    } else this.tPace.setText('');
    this.tStatus.setText(
      this.netMsg ? this.netMsg
      : this.versus === 'net' && this.netWait > 30 ? 'รออีกฝั่ง...'
      : this.paused ? 'Paused — N to step one frame, P to resume'
      : this.timeScale !== 1 ? 'Slow motion 25%' : '');
  }
}

export { ScrambleScene, C as SCRAMBLE_COLORS, drawBackground, CAM, BINDS, ALONE_EXTRA, readInput };
