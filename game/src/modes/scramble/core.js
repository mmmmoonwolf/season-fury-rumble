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
  jab3: { label: 'Finisher Thrust', kind: 'ground', startup: 7, active: 4, recovery: 20, dmg: 6,
    hb: { x: 10, y: -88, w: 98, h: 26 }, kb: [10, -5], stun: 28, imp: { f: 6, vx: 7 } },
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
  // ---- สกิล: แทงรัวเดินหน้า 4 จังหวะ (ปุ่ม Shift) ----
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

  dair: { label: 'Plunge', kind: 'air', startup: 8, active: 90, recovery: 0, dmg: 6,
    hb: { x: -26, y: -32, w: 52, h: 48 }, kb: [2, -12], stun: 30, imp: { f: 7, vxMul: 0.3, vy: 17 },
    untilLand: true, landLag: 14, pogo: -12 },
};

const ACTIONABLE = new Set(['idle', 'walk', 'run', 'crouch', 'air', 'block', 'blockcrouch']);

class Fighter {
  constructor(id, name, x, facing) {
    this.id = id; this.name = name; this.spawnX = x; this.spawnFacing = facing;
    this.maxHp = 100; this.reset();
  }
  reset() {
    Object.assign(this, {
      x: this.spawnX, y: STAGE.groundY, vx: 0, vy: 0, facing: this.spawnFacing,
      onGround: true, state: 'idle', stateF: 0, jumpsLeft: 1, coyote: 0, dropT: 0,
      move: null, moveId: null, moveF: 0, hitList: new Set(), hitConfirmed: false, used: new Set(),
      hp: this.maxHp, stun: 0, hitstop: 0, invuln: 0, lastHitF: -9999,
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
    this.buf = { attack: 0, jump: 0, skill: 0 };
    this.lastTap = { dir: 0, f: -99 };
    this.dashLatch = false;
    this.meter = []; this.meterIdle = 0;
    this.lastMoveInfo = null;
  }
  resetPositions() { this.p1.reset(); this.p2.reset(); this.meter = []; }

  step(inp) {
    this.frame++; this.events = [];
    const p = this.p1, d = this.p2;
    if (inp.p.attack) this.buf.attack = PHYS.buffer + 1;
    if (inp.p.jump) this.buf.jump = PHYS.buffer + 1;
    if (inp.p.skill) this.buf.skill = PHYS.buffer + 1;

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
      if (this.buf.skill > 0) this.buf.skill--;
    }
    if (d.hitstop > 0) d.hitstop--; else { this.controlDummy(d); this.physics(d, null); this.advanceMove(d, null); }

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
    f.move = MOVES[id]; f.moveId = id; f.moveF = 0;
    f.hitList = new Set(); f.hitConfirmed = false; f.used.add(id);
    f.setState('attack');
    this.lastMoveInfo = { id, ...MOVES[id] };
    this.events.push({ type: 'move', id });
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
      if (this.buffered('attack')) {
        const neutral = dir === 0 && !inp.up && !inp.down;
        let next = null;
        if (m.chain && neutral && (afterActive || f.hitConfirmed)) next = m.chain;
        else if (f.hitConfirmed && f.moveF >= m.startup) {
          const cand = this.pickMove(f, inp);
          if (!f.used.has(cand) && MOVES[cand].kind === m.kind) next = cand;
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
    // สกิลแทงรัว — เริ่มได้เฉพาะตอนยืนอยู่บนพื้น (เป็นคอมโบเดินหน้า ไม่มีเวอร์ชันกลางอากาศ)
    if (this.buffered('skill') && f.onGround) {
      this.consume('skill'); f.used.clear();
      this.startMove(f, 'thrust1', dir || f.facing); return;
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
    const m = f.state === 'attack' ? f.move : null;
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
    } else if (m) f.vx *= 0.82;
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

export { STAGE, STAGE_BASE_W, setStageWidth, PHYS, MOVES, ACTIONABLE, Fighter, Game, overlap };
