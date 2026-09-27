/**
 * เสียงปุ่มของเมนู — ฝั่ง DOM ล้วน ไม่ผ่าน Phaser
 *
 * ทำไมต้องแยกจาก `_sfx()` ของฉาก: เมนูล็อบบี้อยู่ใน `index.html` และทำงาน**ก่อนฉากจะถูกสร้าง**
 * `this.sound` ยังไม่มี ส่วนแผงเลือกตัวก็เป็น DOM ที่ไม่ได้เดินผ่านลูปอีเวนต์ของซิม
 * จะยัดเข้าระบบเดิมต้องรอฉาก ซึ่งแปลว่าปุ่มในล็อบบี้ไม่มีวันมีเสียง
 *
 * สามเรื่องที่ต้องจัดการ และจัดการแล้วทั้งสาม:
 *
 * 1. **นโยบาย autoplay** เบราว์เซอร์ไม่ให้เล่นเสียงจนกว่าจะมีการกดของคนจริง
 *    ถ้ารอให้ปุ่มแรกเป็นตัวปลุก ปุ่มแรกจะเงียบเสมอ — ปลุก AudioContext จาก pointerdown
 *    ของ "การกดครั้งไหนก็ได้" ซึ่งมาถึงก่อน click เสมอ ปุ่มแรกจึงดังตั้งแต่ครั้งแรก
 *
 * 2. **ปุ่มปิดเสียงต้องคุมอันนี้ด้วย** อ่านคีย์เดียวกับเพลง (`sfr.muted`) ทุกครั้งที่จะเล่น
 *    ไม่ได้อ่านครั้งเดียวตอนโหลด คนกดปิดกลางเกมจึงมีผลทันที
 *
 * 3. **พังแล้วต้องไม่ลามไปที่เมนู** ทุกอย่างในนี้ห่อ try ไว้หมด
 *    เสียงปุ่มไม่ดังคือเรื่องเล็ก เมนูกดไม่ได้คือเกมเสีย
 */

const STORE = 'sfr.muted';      // คีย์เดียวกับปุ่มปิดเสียงของเพลง — ห้ามแยกกัน
const DIR = 'assets/audio/sfx/';
const VOL = 0.5;

/** ชื่อที่ผู้เรียกใช้ -> ไฟล์จริง · หลายไฟล์ = สุ่มสลับกัน ไม่ให้ฟังซ้ำจนน่ารำคาญ */
const BANK = {
  click: ['ui_click_1', 'ui_click_2'],
  hover: ['ui_hover'],
  pick: ['ui_pick_1', 'ui_pick_2'],
  back: ['ui_back'],
  start: ['ui_start'],
};

let ctx = null;
const buf = new Map();          // ชื่อไฟล์ -> AudioBuffer (หรือ null ถ้าโหลดไม่ขึ้น)
let ext = null;
let last = 0;

/** ฟอร์แมตที่เครื่องนี้เล่นได้ — ogg สำหรับส่วนใหญ่ m4a สำหรับ Safari เก่า */
function pickExt() {
  try {
    const a = document.createElement('audio');
    if (a.canPlayType('audio/ogg; codecs=vorbis')) return 'ogg';
  } catch (e) { /* ไม่มี DOM ก็ตกไปใช้ m4a */ }
  return 'm4a';
}

function muted() {
  try { return localStorage.getItem(STORE) === '1'; } catch (e) { return false; }
}

async function load(name) {
  if (buf.has(name)) return buf.get(name);
  buf.set(name, null);          // จองไว้ก่อน กันโหลดซ้ำตอนกดรัว
  try {
    const res = await fetch(DIR + name + '.' + ext);
    const bytes = await res.arrayBuffer();
    const b = await ctx.decodeAudioData(bytes);
    buf.set(name, b);
    return b;
  } catch (e) {
    return null;               // ไฟล์หายหรือถอดไม่ได้ = เงียบไปเฉย ๆ ไม่ใช่เมนูพัง
  }
}

/** ปลุกระบบเสียงและโหลดไว้ล่วงหน้า — เรียกครั้งเดียวตอนแตะครั้งแรก */
export function unlockUiSfx() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    ext = pickExt();
    // โหลดล่วงหน้าทั้งชุด รวมกันไม่ถึง 30 KB — ปุ่มถัดไปจะได้ดังทันทีไม่ต้องรอ fetch
    for (const names of Object.values(BANK)) for (const n of names) load(n);
  } catch (e) { ctx = null; }
}

/**
 * เล่นเสียงปุ่มหนึ่งครั้ง
 * @param kind ชื่อใน BANK — ชื่อที่ไม่รู้จักถูกเมินเงียบ ๆ ไม่ throw
 */
export function uiSfx(kind) {
  const names = BANK[kind];
  if (!names || muted()) return false;
  if (!ctx) unlockUiSfx();
  if (!ctx) return false;
  // กดรัว ๆ หรือเมาส์กวาดผ่านปุ่มหลายอัน เสียงจะซ้อนกันเป็นเสียงรบกวน
  const now = ctx.currentTime;
  if (now - last < 0.03) return false;
  last = now;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const b = buf.get(names[(Math.random() * names.length) | 0]);
    if (!b) { for (const n of names) load(n); return false; }   // ยังโหลดไม่เสร็จ ครั้งหน้าค่อยดัง
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = VOL;
    src.buffer = b;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return true;
  } catch (e) { return false; }
}

/**
 * ผูกเสียงให้ปุ่มทั้งแผงในทีเดียว — ดักที่กล่องแม่ ปุ่มที่สร้างทีหลังจึงได้เสียงเอง
 *
 * `data-sfx` บนปุ่มเลือกเสียงเองได้ (`back` / `start` / `pick`) ไม่ใส่ = เสียงกดทั่วไป
 * เสียงตอนเลื่อนผ่านเปิดเฉพาะเครื่องที่มีเมาส์จริง — บนมือถือ pointerover มาพร้อมการแตะ
 * จะได้ยินสองเสียงซ้อนกันทุกครั้งที่กด
 */
export function wireUiSfx(root, { hover = true } = {}) {
  if (!root) return;
  const pick = (el) => el?.closest?.('button, [data-sfx]');
  root.addEventListener('pointerdown', (e) => {
    const el = pick(e.target);
    if (!el || el.disabled) return;
    uiSfx(el.dataset.sfx || 'click');
  }, true);
  if (hover && !isCoarse()) {
    root.addEventListener('pointerover', (e) => {
      const el = pick(e.target);
      if (!el || el.disabled || el === root) return;
      uiSfx('hover');
    }, true);
  }
}

function isCoarse() {
  try { return window.matchMedia?.('(pointer: coarse)')?.matches ?? false; } catch (e) { return false; }
}

/** ให้เทสต์มองเห็นตารางเสียงได้โดยไม่ต้องมีเบราว์เซอร์ */
export const UI_BANK = BANK;
export const UI_STORE = STORE;
