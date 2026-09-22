import { STAGE, PHYS, MOVES, Game } from "./core.js";

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
const GAME_KEYS = new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyJ','KeyK','KeyL','ShiftLeft','ShiftRight']);
const TOOL_KEYS = new Set(['KeyT','KeyH','Digit1','Digit2','Digit3','Digit4','KeyR','KeyP','KeyN','KeyO']);
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
    jump: any('Space','KeyK'), attack: any('KeyJ'), block: any('KeyL'), run: any('ShiftLeft','ShiftRight'),
    p: { left: anyP('KeyA','ArrowLeft'), right: anyP('KeyD','ArrowRight'), jump: anyP('Space','KeyK'), attack: anyP('KeyJ'), block: anyP('KeyL') },
  };
}

/**
 * ความสูงหัวจรดเท้าของสไปรท์ Nyx บนเวที (พิกเซลของเวที 1280x720)
 * hurtbox สูง PHYS.standH = 118 — ตั้งไว้ 130 = สูงกว่ากรอบ 11% ซึ่งเป็นสัดส่วนปกติของเกมต่อสู้
 * (ลองแล้ว 150 ตัวใหญ่เกินกรอบ 28% ดูเหมือนกรอบเล็กกว่าตัวจนโดนตีแล้วงง)
 * ปรับค่านี้ค่าเดียวถ้าเล่นแล้วรู้สึกตัวใหญ่/เล็กไป
 */
const SPRITE_H = 130;

const isTouch = (window.matchMedia?.('(pointer: coarse)')?.matches ?? false) || 'ontouchstart' in window;

// ---------- หน้าตา (ยกจาก prototype) ----------
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
 * @param padX ระยะที่ต้องวาดเลยขอบเวทีออกไปข้างละเท่าไร
 *   เวที SCRAMBLE กว้างตายตัว 1280 (กำแพง/ฟิสิกส์ผูกกับตัวเลขนี้ ปรับไม่ได้โดยไม่เปลี่ยน game feel)
 *   แต่ผืนเกมกว้างตามสัดส่วนจอ (ดู index.html) บนมือถือจึงกว้างกว่าเวที
 *   วาดพื้นหลังเลยออกไปให้เต็มจอ แล้วเลื่อนกล้องให้เวทีอยู่กลาง (ดู create())
 */
function drawBackground(g, padX = 0) {
  g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBot, C.skyBot, 1);
  g.fillRect(-padX, 0, 1280 + padX * 2, STAGE.groundY);
  const r = rng(7);
  for (const [color, base, minH, maxH, winA] of [[C.far, 520, 160, 330, 0.18], [C.near, 600, 120, 260, 0.32]]) {
    let x = -20 - padX;
    while (x < 1300 + padX) {
      const w = 60 + r() * 110, h = minH + r() * (maxH - minH);
      g.fillStyle(color, 1); g.fillRect(x, base - h, w, h + 40);
      g.fillStyle(C.window, winA);
      for (let wy = base - h + 14; wy < base - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (r() > 0.55) g.fillRect(wx, wy, 6, 8);
      x += w + 6 + r() * 20;
    }
  }
  // ground + scramble crossing stripes
  g.fillStyle(C.asphalt, 1); g.fillRect(-padX, STAGE.groundY, 1280 + padX * 2, 100);
  g.fillStyle(C.stripe, 0.22);
  for (let x = 60; x < 1240; x += 46) g.fillRect(x, STAGE.groundY + 18, 24, 70);
  g.fillStyle(C.stripe, 0.5); g.fillRect(-padX, STAGE.groundY, 1280 + padX * 2, 3);
  // walls
  g.fillStyle(0x0c111c, 0.55); g.fillRect(-padX, 0, STAGE.wallL + padX, 720); g.fillRect(STAGE.wallR, 0, 1280 - STAGE.wallR + padX, 720);
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
body.sc-touch #sc-touch { display:flex; }
#sc-touch .pad { display:grid; grid-template-columns:repeat(3,56px); grid-template-rows:repeat(3,48px); gap:4px; pointer-events:auto; }
#sc-touch .acts { display:grid; grid-template-columns:repeat(2,68px); gap:8px; pointer-events:auto; }
#sc-touch .acts button { height:56px; }
#sc-touch .acts .big { grid-column:span 2; height:62px; font-size:15px; }
`;

const OVERLAY_HTML = `
<div id="sc-tools">
  <button data-tool="KeyH">Hitboxes</button>
  <button data-tool="Digit0">Dummy: Stand</button>
  <button data-tool="Digit4">Tech: Off</button>
  <button data-tool="KeyO">Slow-mo</button>
  <button data-tool="KeyR">Reset</button>
  <button data-tool="KeyT">Tune</button>
</div>
<div id="sc-tune"></div>
<div id="sc-touch">
  <div class="pad">
    <span></span><button data-code="KeyW">Up</button><span></span>
    <button data-code="KeyA">Left</button><button data-code="KeyS">Down</button><button data-code="KeyD">Right</button>
  </div>
  <div class="acts">
    <button data-code="KeyL">Block</button><button data-code="ShiftLeft">Run</button>
    <button class="big" data-code="Space">Jump</button><button class="big" data-code="KeyJ">Attack</button>
  </div>
</div>`;

const TUNE = [
  ['walk', 'Walk speed', 2, 8, 0.1],
  ['run', 'Run speed', 4, 12, 0.1],
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
    this.load.atlas('scnyx', 'assets/characters/scramble_nyx.png', 'assets/characters/scramble_nyx.json');
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
    this.sim = new Game();
    this.acc = 0; this.timeScale = 1; this.paused = false; this.showBoxes = true; this.stepOnce = false;
    this.sparks = []; this.popups = []; this.comboFade = 0;
    // เวทีกว้างตายตัว 1280 แต่ผืนเกมกว้างตามจอ — เลื่อนกล้องให้เวทีอยู่กลาง
    // แล้ววาดพื้นหลังเลยออกไปข้างละ padX เพื่อไม่ให้เห็นขอบว่างสองข้างบนจอมือถือ
    const padX = Math.max(0, (this.sys.game.config.width - STAGE.w) / 2);
    this.cameras.main.setScroll(-padX, 0);
    drawBackground(this.add.graphics(), padX);
    this.world = this.add.graphics();
    this.fx = this.add.graphics();
    this.hud = this.add.graphics();
    const T = (x, y, s, size, color, origin = 0) => this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: '600' }).setOrigin(origin, 0);
    this.tTitle = T(640, 14, 'SCRAMBLE', 26, C.ink, 0.5).setFontStyle('700');
    this.tSub = T(640, 44, 'Training', 14, C.dim, 0.5);
    this.tP1 = T(60, 14, 'NYX', 20, C.ink);
    this.tP2 = T(1220, 14, 'Training dummy', 20, C.ink, 1);
    this.tMode = T(1220, 66, '', 13, C.dim, 1);
    this.tCombo = T(1210, 150, '', 44, '#ffffff', 1).setFontStyle('700');
    this.tComboSub = T(1210, 200, '', 16, C.ink, 1);
    this.tMove = T(60, 646, '', 14, C.ink);
    this.tHelp = T(1220, 688, isTouch ? '' : 'Move A D   Aim W S   Jump Space   Attack J   Block L   Run Shift or double-tap', 12, C.dim, 1);
    this.tHelp2 = T(1220, 703, isTouch ? '' : 'T tune   H hitboxes   1 2 3 dummy   4 dummy tech   R reset   P pause   N step   O slow-mo', 12, C.dim, 1);
    this.tStatus = T(640, 90, '', 16, '#ffffff', 0.5);
    this._initNyxSprite();
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
    if (code === 'Digit1') s.dummyMode = 'stand';
    if (code === 'Digit2') s.dummyMode = 'block';
    if (code === 'Digit3') s.dummyMode = 'jump';
    if (code === 'Digit0') s.dummyMode = MODES[(MODES.indexOf(s.dummyMode) + 1) % MODES.length];
    if (code === 'Digit4') s.dummyTech = TECHS[(TECHS.indexOf(s.dummyTech) + 1) % TECHS.length];
    if (code === 'KeyR') { s.resetPositions(); this.comboFade = 0; }
    if (code === 'KeyP') this.paused = !this.paused;
    if (code === 'KeyN') { this.paused = true; this.stepOnce = true; }
    if (code === 'KeyO') this.timeScale = this.timeScale === 1 ? 0.25 : 1;
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
      if (e.type === 'comboEnd') { this.lastCombo = { hits: e.hits, dmg: e.dmg }; this.comboFade = e.hits > 1 ? 90 : 0; }
    }
    for (const s of this.sparks) s.life--;
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const p of this.popups) { p.life--; p.t.y -= 0.8; p.t.setAlpha(Math.min(1, p.life / 15)); if (p.life <= 0) p.t.destroy(); }
    this.popups = this.popups.filter(p => p.life > 0);
    if (this.comboFade > 0) this.comboFade--;
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
  _initNyxSprite() {
    const meta = this.textures.get('scnyx')?.customData?.meta ?? {};
    // จุดยึดมาจากตอน build ไม่เดาเอง — feetY/anchorX คือตำแหน่งเท้าและกึ่งกลางหัวบน canvas ต้นฉบับ
    // ใช้ขนาด canvas จาก meta ไม่อ่านจาก sprite.width เพราะเฟรมใน atlas ถูก trim ไว้
    // sprite.width จึงขึ้นกับว่า Phaser ตีความ trimmed frame ยังไง ซึ่งเปราะเกินจะพึ่ง
    this.nyxMeta = {
      anchorX: meta.anchorX ?? 192, feetY: meta.feetY ?? 315, standing: meta.standing ?? 300,
      canvasW: meta.canvasW ?? 323, canvasH: meta.canvasH ?? 321,
    };
    this.nyxAnims = { idle: 8, walk: 24, run: 21, hurt: 10, crouch: 7, jump: 5, knockdown: 2, techroll: 2, tech: 1 };
    for (const [name, n] of Object.entries(this.nyxAnims)) {
      if (this.anims.exists('scnyx/' + name)) continue;
      this.anims.create({
        key: 'scnyx/' + name,
        frames: Array.from({ length: n }, (_, i) => ({ key: 'scnyx', frame: `${name}_${i + 1}.png` })),
        // ความเร็วตั้งเป็น "เวลาต่อรอบ" ไม่ใช่ fps ตายตัว เพิ่ม/ลดเฟรมแล้วจังหวะไม่เปลี่ยน
        // เวลาต่อรอบ (วินาที) — ท่าที่ผูกกับ state ที่เอนจิ้นจับเวลาไว้ ตั้งให้พอดีกับเวลานั้น
        // (PHYS: knockdownFrames 28 = 0.47 วิ, techRollFrames 20 = 0.33 วิ ที่ 60 เฟรม/วินาที)
        frameRate:
          n / ({ idle: 0.8, walk: 0.7, run: 0.5, hurt: 0.5, crouch: 1.2, jump: 0.6, knockdown: 0.25, techroll: 0.22, tech: 0.17 }[name]),
        // ท่าโดนตีเล่นรอบเดียวแล้วค้างเฟรมสุดท้าย — hitstun ในเอนจิ้นยาวไม่เท่ากัน (17-38 เฟรม)
        // ถ้าวนซ้ำ ตัวจะสะบัดรับแรงซ้ำ ๆ ทั้งที่โดนตีครั้งเดียว
        // ท่าที่ "เล่นจบแล้วค้าง" = ท่าที่เอนจิ้นถือไว้ยาวไม่เท่ากันทุกครั้ง
        // โดนตี: hitstun 17-38 เฟรมแล้วแต่ท่าที่โดน · กระโดด: ลอยนานแค่ไหนแล้วแต่กดค้าง/ชนเพดาน
        // ถ้าวนซ้ำจะเห็นสะบัดรับแรงซ้ำ ๆ หรือตีลังกาวนไม่หยุดกลางอากาศ
        repeat: ["hurt", "jump", "knockdown", "tech"].includes(name) ? 0 : -1,
      });
    }
    this.nyx = this.add.sprite(0, 0, 'scnyx', 'idle_1.png').setVisible(false).setDepth(5);
  }

  /** วาด Nyx ด้วยสไปรท์ถ้า state นั้นมีอาร์ตแล้ว — คืน true ถ้าวาดให้แล้ว */
  _drawNyxSprite(f) {
    // state ของเอนจิ้น -> ชื่อท่าที่มีอาร์ต (ที่ไม่อยู่ในตารางนี้ยังวาดเป็นกล่อง)
    const key = {
      run: 'run', walk: 'walk', idle: 'idle', crouch: 'crouch',
      air: 'jump', landing: 'jump',
      hitstun: 'hurt', knockdown: 'knockdown', techroll: 'techroll', tech: 'tech',
    }[f.state] ?? null;
    if (!key) { this.nyx.setVisible(false); return false; }

    const m = this.nyxMeta;
    // สไปรท์สูง SPRITE_H px บนเวที เทียบกับ hurtbox ที่สูง PHYS.standH (118)
    // เก็บมา 300 px จึงย่อลงด้วยอัตราส่วนนี้ แล้วเลื่อนให้ "เท้าในภาพ" ไปอยู่ที่เท้าของตัวละครพอดี
    const scale = SPRITE_H / m.standing;
    this.nyx.setVisible(true).setScale(scale).setFlipX(f.facing < 0);
    this.nyx.setOrigin(m.anchorX / m.canvasW, m.feetY / m.canvasH);
    this.nyx.setPosition(f.x, f.y);
    const anim = 'scnyx/' + key;
    // เล่นใหม่เมื่อ "เปลี่ยน state" ไม่ใช่เมื่อเปลี่ยนชื่อท่า — โดนตีซ้ำตอนยังอยู่ใน hitstun
    // เอนจิ้นไม่รีเซ็ต stateF ให้ (setState เช็คว่าซ้ำเดิมไหม) ท่าจึงควรเล่นต่อไม่กระตุกกลับไปเฟรมแรก
    // เล่นใหม่เมื่อเปลี่ยน state — โดนตีซ้ำตอนยังอยู่ใน hitstun เอนจิ้นไม่รีเซ็ต stateF ให้
    // (setState เช็คว่าซ้ำเดิมไหม) ท่าจึงควรเล่นต่อไม่กระตุกกลับเฟรมแรก
    // ยกเว้นดับเบิลจัมพ์: ยังอยู่ state 'air' เหมือนเดิมแต่ควรตีลังกาใหม่ — ดูจาก jumpsLeft ที่ลดลง
    const doubleJumped = f.jumpsLeft !== this._nyxJumps;
    this._nyxJumps = f.jumpsLeft;
    if (this._nyxState !== f.state || (key === 'jump' && doubleJumped)) {
      this._nyxState = f.state;
      // ลงพื้น = ค้างที่เฟรมสุดท้ายของท่ากระโดด (ยืดตัวรับพื้น) ไม่ใช่เริ่มตีลังกาใหม่ตอนแตะพื้น
      if (f.state === 'landing') this.nyx.anims.stop(), this.nyx.setFrame(`jump_${this.nyxAnims.jump}.png`);
      else this.nyx.play(anim);
    }
    this.nyx.setAlpha(f.invuln > 0 && Math.floor(f.invuln / 3) % 2 ? 0.5 : 1);
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
    if (this._drawNyxSprite(s.p1)) {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(s.p1.x, s.p1.onGround ? s.p1.y + 2 : Math.min(STAGE.groundY, s.p1.y + 200) + 2, 50, 10);
    } else {
      this.drawFighter(g, s.p1, C.nyx, C.nyxScarf, false);
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
    bar(840, 380, s.p2.hp, s.p2.maxHp, true);
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
