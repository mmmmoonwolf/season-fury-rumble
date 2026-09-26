// ทดสอบแผงเลือกตัวว่ารองรับทั้ง 1v1 และ 2v2 — รันบน DOM ปลอมขนาดจิ๋ว
// รัน: node tools/tests/select_panel.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: ตอนเป็น 2 ช่องตายตัวใน HTML เทสต์แค่ regex ก็พอ
// พอช่องถูกสร้างจาก roster จริง ความถูกต้องย้ายไปอยู่ในโค้ดที่รันตอนกดปุ่ม
// ซึ่งอ่านจากไฟล์ไม่เห็น — ต้องรันจริงถึงจะจับได้ว่ากดเปลี่ยนโหมดแล้วช่องไม่ตาม
import "./phaser_stub.mjs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

// ── DOM ปลอม: พอสำหรับ createElement / appendChild / querySelector('.cls') ──
class El {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.parent = null;
    this.dataset = {}; this._text = ''; this.className = '';
    const self = this;
    this.classList = {
      add: (c) => { if (!self._cls().includes(c)) self.className = (self.className + ' ' + c).trim(); },
      remove: (c) => { self.className = self._cls().filter((x) => x !== c).join(' '); },
      contains: (c) => self._cls().includes(c),
      toggle: (c, on) => (on ? self.classList.add(c) : self.classList.remove(c)),
    };
  }
  _cls() { return this.className.split(/\s+/).filter(Boolean); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  replaceChildren(...cs) { this.children = cs; }
  addEventListener() {}
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  querySelectorAll(sel) {
    const cls = sel.replace(/^\./, '');
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (c._cls().includes(cls)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}
globalThis.document = { createElement: (t) => new El(t) };

const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game } = await import(G + "/core.js");
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
const { ScrambleScene } = await import(G + "/ScrambleScene.js");

function mk(versus = 'local') {
  const sides = [new El(), new El()];
  const sc = {
    sim: new Game(), versus, selSide: 0, isHost: true, foePick: null,
    selSides: sides, selSlots: [],
    selEl: { querySelector: () => ({ style: {} }) },
    selGrid: { children: [] }, selModes: [],
    selHint: new El(), selGo: new El(), selNote: new El(),
    myReady: false, foeReady: false,
    _paintPortrait() {},
  };
  for (const m of ['_syncSelectSlots', '_drawSelect']) sc[m] = ScrambleScene.prototype[m];
  return sc;
}
const tags = (sc) => sc.selSlots.map((sl) => sl.querySelector('.tag').textContent);
const whos = (sc) => sc.selSlots.map((sl) => sl.querySelector('.who').textContent);

// ── 1v1: สองช่อง ฝั่งละหนึ่ง ──
{
  const sc = mk('local');
  sc._drawSelect();
  ok(sc.selSlots.length === 2, `2 คนได้สองช่อง (${sc.selSlots.length})`);
  ok(sc.selSides[0].children.length === 1 && sc.selSides[1].children.length === 1, "ฝั่งละหนึ่งช่อง");
  ok(tags(sc).join() === 'ผู้เล่น 1,ผู้เล่น 2', `ป้ายถูก (${tags(sc).join()})`);
  ok(whos(sc).every(Boolean), "ทุกช่องมีชื่อตัวละคร ไม่ใช่ช่องว่าง");
}

// ── 2v2: สี่ช่อง ฝั่งละสอง เรียงตามทีมไม่ใช่ตามลำดับในลิสต์ ──
//
// จุดที่พลาดง่ายที่สุด: fighters เรียง [ทีม0, ทีม1, ทีม0, ทีม1] สลับกัน
// ถ้าเอาเข้าคอลัมน์ตามลำดับดื้อ ๆ จะได้เพื่อนร่วมทีมไปอยู่คนละฝั่งจอ
{
  const sc = mk('team');
  sc.sim.setRoster(4);
  sc._drawSelect();
  ok(sc.selSlots.length === 4, `4 คนได้สี่ช่อง (${sc.selSlots.length})`);
  ok(sc.selSides[0].children.length === 2 && sc.selSides[1].children.length === 2, "ฝั่งละสองช่อง");
  const left = sc.selSides[0].children.map((sl) => Number(sl.dataset.side));
  ok(left.join() === '0,2', `ฝั่งซ้ายคือคนที่ 1 กับ 3 ซึ่งอยู่ทีมเดียวกัน (${left.join()})`);
  ok(sc.selSlots.map((sl) => Number(sl.dataset.side)).join() === '0,1,2,3',
    "ลิสต์ selSlots เรียงตาม fighters เสมอ ถึงในจอจะสลับฝั่งกัน");
  ok(tags(sc).join() === 'ผู้เล่น 1,ผู้เล่น 2,เพื่อน AI,เพื่อน AI', `ป้าย 2v2 ถูก (${tags(sc).join()})`);
}

// ── สลับโหมดไปกลับแล้วช่องต้องตามทุกครั้ง ไม่ค้างของเก่าไว้ ──
{
  const sc = mk('team');
  sc.sim.setRoster(4); sc._drawSelect();
  sc.versus = 'local'; sc.sim.setRoster(2); sc._drawSelect();
  ok(sc.selSlots.length === 2, `กลับมา 2 คนเหลือสองช่อง (${sc.selSlots.length})`);
  ok(sc.selSides[0].children.length === 1 && sc.selSides[1].children.length === 1, "ช่องเก่าถูกล้างทิ้ง ไม่ค้างอยู่ในคอลัมน์");
  sc.versus = 'team'; sc.sim.setRoster(4); sc._drawSelect();
  ok(sc.selSlots.length === 4, "สลับกลับไป 4 ได้อีก");
}

// ── ช่องที่กำลังแก้อยู่ต้องติดสถานะ active ช่องเดียว ──
{
  const sc = mk('team');
  sc.sim.setRoster(4); sc.selSide = 2; sc._drawSelect();
  const act = sc.selSlots.filter((sl) => sl.classList.contains('active'));
  ok(act.length === 1 && Number(act[0].dataset.side) === 2, "ช่องที่เลือกอยู่ติด active ช่องเดียว และเป็นช่องที่ 3");
}

// ── โหมดซ้อม: ฝั่งขวาคือหุ่น ไม่ใช่ "ผู้เล่น 2" ──
{
  const sc = mk('solo');
  sc._drawSelect();
  ok(tags(sc).join() === 'คุณ,หุ่นซ้อม', `โหมดซ้อมป้ายเดิม (${tags(sc).join()})`);
}
