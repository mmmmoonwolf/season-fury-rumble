import { STAGE, setStageWidth, PHYS, MOVES, SKILLS, SKILL_CD, KI_MAX, CHARACTERS, Game } from "./core.js";

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

// ---------- อินพุต (ยกจาก prototype) ----------
const GAME_KEYS = new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyJ','KeyK','KeyL','ShiftLeft','ShiftRight','Digit1','Digit2','Digit3']);
const TOOL_KEYS = new Set(['KeyT','KeyH','Digit0','Digit4','KeyR','KeyP','KeyN','KeyO','KeyC']);
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

function readInput() {
  const h = (c) => held.has(c), any = (...c) => c.some(h), anyP = (...c) => c.some((k) => pressed.has(k));
  return {
    left: any('KeyA','ArrowLeft'), right: any('KeyD','ArrowRight'), up: any('KeyW','ArrowUp'), down: any('KeyS','ArrowDown'),
    jump: any('Space','KeyK'), attack: any('KeyJ'), block: any('KeyL'), run: 0,
    skill1: any('Digit1','ShiftLeft','ShiftRight'), skill2: any('Digit2'), skill3: any('Digit3'),
    p: { left: anyP('KeyA','ArrowLeft'), right: anyP('KeyD','ArrowRight'), jump: anyP('Space','KeyK'), attack: anyP('KeyJ'), block: anyP('KeyL'),
          skill1: anyP('Digit1','ShiftLeft','ShiftRight'), skill2: anyP('Digit2'), skill3: anyP('Digit3') },
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

const isTouch = (window.matchMedia?.('(pointer: coarse)')?.matches ?? false) || 'ontouchstart' in window;

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
    anims: { idle: 8, run: 10, hurt: 10, crouch: 3, jump: 5, knockdown: 2, techroll: 2, tech: 1,
      block: 3, blockstun: 2, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "thrust1", "thrust2", "thrust3", "thrust4",
      "fox1", "fox2", "curse1", "curse2", "ult1", "ult2", "ult3", "ult4"]),
    // เติมตอน _initCharSprite: meta / sprite / lastState / lastJumps
  },
  // Helios: เหลือเข่าพุ่งกับอัลติที่ยังวาดเป็นกล่อง (รอชีต F/G)
  helios: {
    atlasKey: 'schelios',
    texture: 'assets/characters/scramble_helios.png',
    data: 'assets/characters/scramble_helios.json',
    runStride: 85,
    anims: { idle: 1, run: 11, jump: 4, crouch: 1, hurt: 1, knockdown: 1, techroll: 1, tech: 1,
      block: 1, blockstun: 1, blockcrouch: 1 },
    attacks: new Set(["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair",
      "rush1", "rush2", "rush3", "rush4", "rush5", "rushEndF", "rushEndU", "rushEndD"]),
  },
};

const C = {
  skyTop: 0x1a2440, skyBot: 0x3b4a6a, far: 0x2b3656, near: 0x212a42, window: 0xe8c56d,
  asphalt: 0x262a33, stripe: 0xd6dae2, slab: 0x9aa0a8, slabTop: 0xcdd1d6, slabUnder: 0x565b64,
  nyx: 0xdcdfe6, nyxScarf: 0xc8323c, dummy: 0xc9a26b, dummyMark: 0x7a5530,
  startup: 0xf2b53c, active: 0xff4d5e, recovery: 0x5aa0ff, free: 0x59606e,
  hurt: 0x57e39a, hit: 0xff4d5e, ink: '#e9e3d6', dim: '#9aa3b5',
};
const FONT = '"Chakra Petch", system-ui, sans-serif';
const MODES = ['stand', 'block', 'jump'];
const MODE_LABEL = { stand: 'Stand', block: 'Block', jump: 'Jump' };
const TECHS = ['off', 'place', 'random'];
const TECH_LABEL = { off: 'Off', place: 'In place', random: 'Random' };

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

/**
 *   เวที SCRAMBLE กว้างเท่าผืนเกม (setStageWidth) กำแพงจึงอยู่ขอบจอพอดี
 *   แต่ผืนเกมกว้างตามสัดส่วนจอ (ดู index.html) บนมือถือจึงกว้างกว่าเวที
 *   วาดพื้นหลังเลยออกไปให้เต็มจอ แล้วเลื่อนกล้องให้เวทีอยู่กลาง (ดู create())
 */
function drawBackground(g) {
  g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBot, C.skyBot, 1);
  g.fillRect(0, 0, STAGE.w, STAGE.groundY);
  const r = rng(7);
  for (const [color, base, minH, maxH, winA] of [[C.far, 520, 160, 330, 0.18], [C.near, 600, 120, 260, 0.32]]) {
    let x = -20;
    while (x < STAGE.w + 20) {
      const w = 60 + r() * 110, h = minH + r() * (maxH - minH);
      g.fillStyle(color, 1); g.fillRect(x, base - h, w, h + 40);
      g.fillStyle(C.window, winA);
      for (let wy = base - h + 14; wy < base - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (r() > 0.55) g.fillRect(wx, wy, 6, 8);
      x += w + 6 + r() * 20;
    }
  }
  // ground + scramble crossing stripes
  g.fillStyle(C.asphalt, 1); g.fillRect(0, STAGE.groundY, STAGE.w, 100);
  g.fillStyle(C.stripe, 0.22);
  for (let x = 60; x < 1240; x += 46) g.fillRect(x, STAGE.groundY + 18, 24, 70);
  g.fillStyle(C.stripe, 0.5); g.fillRect(0, STAGE.groundY, STAGE.w, 3);
  // walls
  g.fillStyle(0x0c111c, 0.55); g.fillRect(0, 0, STAGE.wallL, 720); g.fillRect(STAGE.wallR, 0, STAGE.w - STAGE.wallR, 720);
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
#sc-tools button, #sc-touch button { font:600 13px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6; background:rgba(233,227,214,.14); border:1px solid rgba(233,227,214,.28); border-radius:12px; touch-action:none; user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent; }
#sc-tools button { padding:6px 10px; font-size:12px; }
#sc-tools button.on, #sc-touch button.on { background:rgba(200,50,60,.55); }
#sc-tune { display:none; position:absolute; right:calc(12px + env(safe-area-inset-right,0px)); top:calc(100px + env(safe-area-inset-top,0px)); width:250px; max-height:60%; overflow-y:auto; background:rgba(12,17,28,.9); border:1px solid rgba(233,227,214,.25); border-radius:12px; padding:10px 12px; font:13px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6; z-index:16; }
#sc-tune.open { display:block; }
#sc-tune label { display:flex; justify-content:space-between; margin-top:8px; }
#sc-tune input { width:100%; accent-color:#c8323c; }
#sc-tune .row { display:flex; gap:6px; margin-top:10px; }
#sc-tune .row button { flex:1; font:600 12px "Chakra Petch", system-ui, sans-serif; color:#e9e3d6; background:rgba(233,227,214,.14); border:1px solid rgba(233,227,214,.28); border-radius:8px; padding:6px; }
#sc-touch { display:none; position:absolute; inset:auto 0 0 0; justify-content:space-between; align-items:flex-end; padding:0 calc(14px + env(safe-area-inset-right,0px)) 14px calc(14px + env(safe-area-inset-left,0px)); pointer-events:none; z-index:15; }
/* ปุ่มล่างสุดต้องห่างขอบจอ ไม่งั้นแถบ gesture / ขีดโฮม ของมือถือกินการแตะไปก่อน = กดไม่ติด
   (เหตุผลเดียวกับ BOTTOM_SAFE ในโหมดปกติ ซึ่งพอร์ต SCRAMBLE เข้ามาทีหลังเลยยังไม่ได้ของนี้)
   โหมดปกติเว้นไว้ 94 หน่วยเกมจาก 720 = 13% ของความสูงจอ วัดบนมือถือแนวนอนได้ราว 56 px
   ที่นี่ DOM ไม่ได้ย่อตาม canvas จึงต้องคิดจากความสูงจอตรง ๆ ให้ได้ระยะเท่ากัน
   env() เป็นพื้นล่างเผื่อจอเตี้ยมาก ๆ · บรรทัด vh ไว้ให้เบราว์เซอร์เก่าที่ยังไม่รู้จัก dvh */
#sc-touch { padding-bottom: max(13vh, calc(14px + env(safe-area-inset-bottom,0px))); }
#sc-touch { padding-bottom: max(13dvh, calc(14px + env(safe-area-inset-bottom,0px))); }
body.sc-touch #sc-touch { display:flex; }
/* กล่องที่ห่อปุ่มต้องปิด double-tap zoom ด้วย ไม่ใช่แค่ตัวปุ่ม — นิ้วที่พลาดลงช่องว่างระหว่างปุ่ม
   สองทีติดกันคือสาเหตุที่จอซูมเองตอนกดรัว ๆ (ดูคอมเมนต์ touch-action ใน index.html) */
#sc-tools, #sc-touch, #sc-touch .pad, #sc-touch .acts { touch-action:none; }
#sc-touch .pad { display:grid; grid-template-columns:repeat(3,56px); grid-template-rows:repeat(3,48px); gap:4px; pointer-events:auto; }
#sc-touch .acts { display:grid; grid-template-columns:repeat(2,76px); gap:8px; pointer-events:auto; }
#sc-touch .acts button { height:56px; }
#sc-touch .acts .big { grid-column:span 2; height:62px; font-size:15px; }
/* แถวสกิลสามปุ่ม เตี้ยกว่าปุ่มหลักเพราะกดไม่บ่อยเท่า แต่ยังกว้างพอตามระยะแตะขั้นต่ำ
   สล็อตที่ยังไม่มีสกิลขึ้นเป็นสีจางและกดไม่ได้ จะได้รู้ว่าเตรียมที่ไว้ให้แล้วแต่ยังว่าง */
#sc-touch .skills { grid-column:span 2; display:grid; grid-template-columns:repeat(3,1fr); gap:6px; touch-action:none; }
#sc-touch .skills button { height:46px; font-size:14px; }
#sc-touch .skills button[disabled] { opacity:.32; }
`;

const OVERLAY_HTML = `
<div id="sc-tools">
  <button data-tool="KeyH">Hitboxes</button>
  <button data-tool="Digit0">Dummy: Stand</button>
  <button data-tool="Digit4">Tech: Off</button>
  <button data-tool="KeyO">Slow-mo</button>
  <button data-tool="KeyR">Reset</button>
  <button data-tool="KeyT">Tune</button>
  <button data-tool="KeyC">Char: NYX</button>
</div>
<div id="sc-tune"></div>
<div id="sc-touch">
  <div class="pad">
    <span></span><button data-code="KeyW">Up</button><span></span>
    <button data-code="KeyA">Left</button><button data-code="KeyS">Down</button><button data-code="KeyD">Right</button>
  </div>
  <div class="acts">
    <button class="big" data-code="KeyL">Block</button>
    <button class="big" data-code="Space">Jump</button><button class="big" data-code="KeyJ">Attack</button>
    <div class="skills">
      <button data-code="Digit1" data-slot="1">1</button>
      <button data-code="Digit2" data-slot="2">2</button>
      <button data-code="Digit3" data-slot="3">3</button>
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
    for (const art of Object.values(CHAR_ART)) this.load.atlas(art.atlasKey, art.texture, art.data);
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
    // เวทีกว้างเท่าผืนเกม กำแพงจึงอยู่ขอบจอพอดี ไม่เหลือแถบมืดสองข้างให้ดูเหมือนเกมไม่เต็มจอ
    // ต้องตั้งก่อน new Game() เพราะจุดเกิดของทั้งสองฝั่งอ่าน STAGE ตอนสร้าง
    setStageWidth(this.sys.game.config.width);
    this.sim = new Game();
    this._syncSkillSlots();   // ต้องหลัง new Game() — อ่านสกิลจากตัวละครของผู้เล่น
    this.acc = 0; this.timeScale = 1; this.paused = false; this.showBoxes = true; this.stepOnce = false;
    this.sparks = []; this.popups = []; this.comboFade = 0;
    drawBackground(this.add.graphics());
    this.world = this.add.graphics();
    this.fx = this.add.graphics();
    this.hud = this.add.graphics();
    const W = STAGE.w;   // ข้อความ HUD เกาะขอบเวทีจริง ไม่ใช่เลข 1280 ตายตัว
    // บนมือถือมีปุ่มเต็มจอ (DOM) ทับมุมขวาบนอยู่ หลบให้พ้นไม่งั้นชื่อฝั่งขวาอ่านไม่ออก
    // 56 px บนจอ แปลงเป็นพิกัดเวที = 56 * (720 / ความสูงจอจริง) ซึ่งประมาณ 100 บนมือถือแนวนอน
    const RPAD = 60 + (isTouch ? 100 : 0);
    const T = (x, y, s, size, color, origin = 0) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: '600' }).setOrigin(origin, 0);
    this.tTitle = T(W / 2, 14, 'SCRAMBLE', 26, C.ink, 0.5).setFontStyle('700');
    this.tSub = T(W / 2, 44, 'Training', 14, C.dim, 0.5);
    this.tP1 = T(60, 14, 'NYX', 20, C.ink);
    this.tP2 = T(W - RPAD, 14, 'Training dummy', 20, C.ink, 1);
    this.tMode = T(W - RPAD, 66, '', 13, C.dim, 1);
    this.tCombo = T(1210, 150, '', 44, '#ffffff', 1).setFontStyle('700');
    this.tComboSub = T(1210, 200, '', 16, C.ink, 1);
    this.tMove = T(60, 646, '', 14, C.ink);
    this.tHelp = T(W - 60, 688, isTouch ? '' : 'Move A D   Aim W S   Jump Space   Attack J   Block L   Skills 1 2 3', 12, C.dim, 1);
    this.tHelp2 = T(W - 60, 703, isTouch ? '' : 'T tune   H hitboxes   4 dummy tech   R reset   P pause   N step   O slow-mo', 12, C.dim, 1);
    this.tStatus = T(W / 2, 90, '', 16, '#ffffff', 0.5);
    this._initSprites();
    this.syncTools();
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

    buildTune();
  }

  _unmountOverlay() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    held.clear(); pressed.clear();
    for (const el of this._overlay ?? []) el.remove();
    this._overlay = null;
    document.body.classList.remove('sc-touch');
    if (activeScene === this) activeScene = null;
  }

  tool(code) {
    const s = this.sim;
    if (code === 'KeyT') document.getElementById('sc-tune').classList.toggle('open');
    if (code === 'KeyH') this.showBoxes = !this.showBoxes;
    // 1/2/3 เคยเป็นคีย์ลัดตั้งโหมดหุ่น ย้ายไปเป็นปุ่มสกิลแล้ว — ปุ่ม "Dummy" บนจอ (Digit0)
    // ยังวนโหมดได้ครบเหมือนเดิม จึงไม่ได้เสียความสามารถอะไรไป
    if (code === 'Digit0') s.dummyMode = MODES[(MODES.indexOf(s.dummyMode) + 1) % MODES.length];
    if (code === 'Digit4') s.dummyTech = TECHS[(TECHS.indexOf(s.dummyTech) + 1) % TECHS.length];
    if (code === 'KeyR') { s.resetPositions(); this.comboFade = 0; }
    if (code === 'KeyP') this.paused = !this.paused;
    if (code === 'KeyN') { this.paused = true; this.stepOnce = true; }
    if (code === 'KeyO') this.timeScale = this.timeScale === 1 ? 0.25 : 1;
    // สลับตัวละครของผู้เล่น — ล้างสไปรท์ตัวเดิมทิ้งก่อน ไม่งั้นค้างอยู่บนจอทั้งที่ไม่ได้ใช้แล้ว
    if (code === 'KeyC') {
      const ids = Object.keys(CHARACTERS);
      const cur = ids.indexOf(s.p1.char);
      const prev = CHAR_ART[s.p1.char];
      if (prev?.sprite) prev.sprite.setVisible(false);
      s.p1.char = ids[(cur + 1) % ids.length];
      this._syncSkillSlots();
      s.resetPositions();
      this.comboFade = 0;
    }
    this.syncTools();
  }
  syncTools() {
    const b = q => document.querySelector(`#sc-tools [data-tool="${q}"]`);
    if (!b('KeyH')) return;
    b('KeyH').classList.toggle('on', this.showBoxes);
    b('Digit0').textContent = 'Dummy: ' + MODE_LABEL[this.sim.dummyMode];
    b('Digit4').textContent = 'Tech: ' + TECH_LABEL[this.sim.dummyTech];
    b('KeyO').classList.toggle('on', this.timeScale !== 1);
    b('KeyT').classList.toggle('on', document.getElementById('sc-tune').classList.contains('open'));
    b('KeyC').textContent = 'Char: ' + CHARACTERS[this.sim.p1.char].label;
  }

  update(time, delta) {
    const stepMs = 1000 / 60;
    if (!this.paused) {
      this.acc += Math.min(delta, 100) * this.timeScale;
      while (this.acc >= stepMs) { this.acc -= stepMs; this.tick(); }
    } else if (this.stepOnce) { this.stepOnce = false; this.tick(); }
    this.draw();
  }

  tick() {
    const inp = readInput(); pressed.clear();
    this.sim.step(inp);
    for (const e of this.sim.events) {
      if (e.type === 'hit') {
        this.spark(e.x, e.y, e.heavy ? 14 : 9, 0xffffff);
        this.popup(e.x, e.y - 30, String(e.dmg), e.heavy ? '#ffd166' : '#ffffff');
        if (e.launch) this.cameras.main.shake(110, 0.006); else if (e.heavy) this.cameras.main.shake(80, 0.004);
      }
      if (e.type === 'block') { this.spark(e.x, e.y, 8, 0x5aa0ff); this.popup(e.x, e.y - 30, 'Blocked', '#8fc0ff'); }
      if (e.type === 'wall') { this.spark(e.x, e.y, 16, 0xffd166); this.popup(e.x, e.y - 40, 'Wall bounce', '#ffd166'); this.cameras.main.shake(90, 0.005); }
      if (e.type === 'tech') { this.spark(e.x, e.y + 30, 10, 0x57e39a); this.popup(e.x, e.y, e.label, '#8ff0bd'); }
      if (e.type === 'djump') this.spark(e.x, e.y, 6, 0x9aa3b5);
      // อัลติ: ควันตอนหาย/โผล่ + จอกระพริบตอนเริ่มท่า
      if (e.type === 'vanish') { this.spark(e.x, e.y - 60, 18, 0x2a2333); this.cameras.main.shake(60, 0.003); }
      if (e.type === 'appear') this.spark(e.x, e.y - 60, 14, 0xb9312f);
      if (e.type === 'throw') this.spark(e.x, e.y, 7, 0xc9a227);
      if (e.type === 'anchor') { this.spark(e.x, e.y, 10, 0xe05a57); this.popup(e.x, e.y - 26, 'กดซ้ำเพื่อวาร์ป', '#e0a0a0'); }
      if (e.type === 'mark') { this.spark(e.x, e.y, 13, 0xe05a57); this.popup(e.x, e.y - 34, 'หมายหัว', '#ff9a97'); }
      if (e.type === 'ult') {
        this.popup(e.x, e.y, 'Oni Veil', '#e05a57');
        this.cameras.main.shake(180, 0.008);
        this.cameras.main.flash(120, 190, 40, 40);
      }
      if (e.type === 'comboEnd') { this.lastCombo = { hits: e.hits, dmg: e.dmg }; this.comboFade = e.hits > 1 ? 90 : 0; }
    }
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

  spark(x, y, size, color) { this.sparks.push({ x, y, size, color, life: 9, max: 9, rot: Math.random() * Math.PI }); }
  popup(x, y, s, color) {
    const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: '20px', color, fontStyle: '700', stroke: '#0c111c', strokeThickness: 4 }).setOrigin(0.5);
    this.popups.push({ t, life: 40 });
  }

  /**
   * สไปรท์ Nyx — ตอนนี้มีอาร์ตแค่ยืน/เดิน/วิ่ง (ดู tools/build_scramble_nyx.py)
   * state อื่น (กระโดด/ตี/โดนตี/ล้ม) ยังวาดเป็นกล่องเหมือนเดิมจนกว่าคลิปจะมาครบ
   * ทำแบบนี้เพื่อให้เห็นของจริงบางส่วนก่อนโดยไม่ต้องรอครบ และเทียบได้ว่าอันไหนแทนแล้วอันไหนยัง
   */
  _initSprites() {
    for (const id of Object.keys(CHAR_ART)) this._initCharSprite(id);
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
          n / (name === 'run'
            ? (art.runStride ?? RUN_STRIDE_DEFAULT) / (PHYS.run * 60)
            : ANIM_SECONDS[name]),
        // ท่าโดนตีเล่นรอบเดียวแล้วค้างเฟรมสุดท้าย — hitstun ในเอนจิ้นยาวไม่เท่ากัน (17-38 เฟรม)
        // ถ้าวนซ้ำ ตัวจะสะบัดรับแรงซ้ำ ๆ ทั้งที่โดนตีครั้งเดียว
        // ท่าที่ "เล่นจบแล้วค้าง" = ท่าที่เอนจิ้นถือไว้ยาวไม่เท่ากันทุกครั้ง
        // โดนตี: hitstun 17-38 เฟรมแล้วแต่ท่าที่โดน · กระโดด: ลอยนานแค่ไหนแล้วแต่กดค้าง/ชนเพดาน
        // ถ้าวนซ้ำจะเห็นสะบัดรับแรงซ้ำ ๆ หรือตีลังกาวนไม่หยุดกลางอากาศ
        repeat: ["hurt", "jump", "knockdown", "tech", "blockstun"].includes(name) ? 0 : -1,
      });
    }
    art.sprite = this.add.sprite(0, 0, art.atlasKey, 'idle_1.png').setVisible(false).setDepth(5);
  }

  /** วาง/ย่อ/พลิกสไปรท์ให้ตรงกับตัวละคร — ใช้ร่วมกันทั้งท่าปกติและท่าโจมตี */
  _applyCharTransform(f) {
    const art = CHAR_ART[f.char];
    const m = art.meta;
    // สไปรท์สูง SPRITE_H px บนเวที เทียบกับ hurtbox ที่สูง PHYS.standH (118)
    // เก็บมา 300 px จึงย่อลงด้วยอัตราส่วนนี้ แล้วเลื่อนให้ "เท้าในภาพ" ไปอยู่ที่เท้าของตัวละครพอดี
    const scale = SPRITE_H / m.standing;
    const sp = art.sprite;
    sp.setVisible(true).setScale(scale).setFlipX(f.facing < 0);
    sp.setOrigin(m.anchorX / m.canvasW, m.feetY / m.canvasH);
    sp.setPosition(f.x, f.y);
    sp.setAlpha(f.invuln > 0 && Math.floor(f.invuln / 3) % 2 ? 0.5 : 1);
  }

  /** วาดตัวละครด้วยสไปรท์ถ้าตัวนั้นมีอาร์ตของ state นั้นแล้ว — คืน true ถ้าวาดให้แล้ว
   *  ตัวที่ยังไม่มีอาร์ต (เช่นหุ่นซ้อม) ไม่มีใน CHAR_ART ก็ตกไปวาดเป็นกล่องเหมือนเดิม */
  _drawCharSprite(f) {
    const art = CHAR_ART[f.char];
    if (!art) return false;
    const sp = art.sprite;

    // ท่าโจมตี: เลือกเฟรมจาก phase() ของเอนจิ้นตรง ๆ ไม่ผ่าน animation ที่เล่นตามเวลา
    // เพราะ animation ต้องกะ fps ให้จบพอดีกับ startup+active+recovery ซึ่งคลาดเคลื่อนได้เสมอ
    // อ่านจาก phase() แทน = เฟรม "ฟันสุดแขน" โผล่ตรงกับช่วงที่ hitbox มีผลจริงเป๊ะทุกครั้ง
    if (f.state === 'attack' && art.attacks.has(f.moveId)) {
      const i = { startup: 1, active: 2, recovery: 3 }[f.phase()] ?? 1;
      this._applyCharTransform(f);
      sp.anims.stop();
      sp.setFrame(`${f.moveId}_${i}.png`);
      art.lastState = 'attack:' + f.moveId + i;
      return true;
    }

    // state ของเอนจิ้น -> ชื่อท่าที่มีอาร์ต (ที่ไม่อยู่ในตารางนี้ยังวาดเป็นกล่อง)
    const key = {
      run: 'run', walk: 'run', idle: 'idle', crouch: 'crouch',
      air: 'jump', landing: 'jump',
      hitstun: 'hurt', knockdown: 'knockdown', techroll: 'techroll', tech: 'tech',
      block: 'block', blockcrouch: 'blockcrouch', blockstun: 'blockstun',
    }[f.state] ?? null;
    if (!key || !art.anims[key]) { sp.setVisible(false); return false; }

    this._applyCharTransform(f);
    const anim = art.atlasKey + '/' + key;
    // เล่นใหม่เมื่อเปลี่ยน state — โดนตีซ้ำตอนยังอยู่ใน hitstun เอนจิ้นไม่รีเซ็ต stateF ให้
    // (setState เช็คว่าซ้ำเดิมไหม) ท่าจึงควรเล่นต่อไม่กระตุกกลับเฟรมแรก
    // ยกเว้นดับเบิลจัมพ์: ยังอยู่ state 'air' เหมือนเดิมแต่ควรตีลังกาใหม่ — ดูจาก jumpsLeft ที่ลดลง
    const doubleJumped = f.jumpsLeft !== art.lastJumps;
    art.lastJumps = f.jumpsLeft;
    if (art.lastState !== f.state || (key === 'jump' && doubleJumped)) {
      art.lastState = f.state;
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

  draw() {
    const s = this.sim, g = this.world, fx = this.fx, hud = this.hud;
    g.clear(); fx.clear(); hud.clear();
    this.drawFighter(g, s.p2, C.dummy, C.dummyMark, true);
    // เงาใต้เท้ายังวาดจาก graphics เสมอ ทั้งตอนใช้สไปรท์และตอนใช้กล่อง
    if (this._drawCharSprite(s.p1)) {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(s.p1.x, s.p1.onGround ? s.p1.y + 2 : Math.min(STAGE.groundY, s.p1.y + 200) + 2, 50, 10);
    } else {
      this.drawFighter(g, s.p1, C.nyx, C.nyxScarf, false);
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

    for (const f of [s.p1, s.p2]) {
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

    // HP bars
    const bar = (x, w, hp, max, alignRight) => {
      hud.fillStyle(0x0c111c, 0.7); hud.fillRect(x, 42, w, 16);
      const fw = w * hp / max;
      hud.fillStyle(hp / max > 0.3 ? 0xe9e3d6 : C.nyxScarf, 1);
      hud.fillRect(alignRight ? x + w - fw : x, 44, fw, 12);
    };
    bar(60, 380, s.p1.hp, s.p1.maxHp, false);
    bar(STAGE.w - 440 - (isTouch ? 100 : 0), 380, s.p2.hp, s.p2.maxHp, true);
    // หลอด ki ของผู้เล่น — เต็มเมื่อไหร่ถึงกดอัลติได้ เต็มแล้วเปลี่ยนเป็นสีแดงให้เห็นชัด
    const ki = s.p1.ki / KI_MAX;
    hud.fillStyle(0x0c111c, 0.7); hud.fillRect(60, 64, 260, 10);
    hud.fillStyle(ki >= 1 ? 0xe05a57 : 0x5aa0ff, 1);
    hud.fillRect(61, 65, 258 * Math.min(1, ki), 8);
    this._syncSkillBtns();
    this.tMode.setText('Dummy: ' + MODE_LABEL[s.dummyMode] + '    Tech: ' + TECH_LABEL[s.dummyTech]);

    // combo counter
    const live = s.p2.comboHits;
    if (live > 0) { this.tCombo.setText(live + (live === 1 ? ' hit' : ' hits')).setAlpha(1); this.tComboSub.setText(s.p2.comboDmg + ' damage').setAlpha(1); }
    else if (this.comboFade > 0 && this.lastCombo) {
      const a = Math.min(1, this.comboFade / 30);
      this.tCombo.setText(this.lastCombo.hits + ' hits').setAlpha(a); this.tComboSub.setText(this.lastCombo.dmg + ' damage').setAlpha(a);
    } else { this.tCombo.setText(''); this.tComboSub.setText(''); }

    // move info + frame meter
    const m = s.lastMoveInfo;
    if (m) this.tMove.setText(`${m.label}    Startup ${m.startup}f    Active ${m.untilLand ? 'until landing' : m.active + 'f'}    Recovery ${m.untilLand ? m.landLag + 'f landing' : m.recovery + 'f'}    Damage ${m.dmg}`);
    const mx = 60, my = 672;
    hud.fillStyle(0x0c111c, 0.6); hud.fillRect(mx - 4, my - 4, 150 * 5 + 8, 18);
    s.meter.forEach((ph, i) => { hud.fillStyle(C[ph], 1); hud.fillRect(mx + i * 5, my, 4, 10); });

    this.tStatus.setText(this.paused ? 'Paused — N to step one frame, P to resume' : this.timeScale !== 1 ? 'Slow motion 25%' : '');
  }
}

export { ScrambleScene, C as SCRAMBLE_COLORS, drawBackground };
