// ทดสอบแผงเลือกตัวว่ารองรับทั้ง 1v1 และ 2v2 — รันบน DOM ปลอมขนาดจิ๋ว
// รัน: node tools/tests/select_panel.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: ตอนเป็น 2 ช่องตายตัวใน HTML เทสต์แค่ regex ก็พอ
// พอช่องถูกสร้างจาก roster จริง ความถูกต้องย้ายไปอยู่ในโค้ดที่รันตอนกดปุ่ม
// ซึ่งอ่านจากไฟล์ไม่เห็น — ต้องรันจริงถึงจะจับได้ว่ากดเปลี่ยนโหมดแล้วช่องไม่ตาม
import "./phaser_stub.mjs";
import fs from "fs";

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
  for (const m of ['_syncSelectSlots', '_drawSelect', 'mySeat', '_notReady']) sc[m] = ScrambleScene.prototype[m];
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

// ══ ชื่อที่โชว์คือชื่อเล่นของคนที่เล่น ฉายาคือชื่อในตำนาน ═══════════════════════
//
// เกมนี้ทำให้กลุ่มเพื่อนเล่นกันเอง ชื่อที่ควรขึ้นตอนชนะคือชื่อเพื่อน ไม่ใช่ชื่อเทพ
// **แต่ `id` ห้ามเปลี่ยนเด็ดขาด** — มันคือคีย์ของอัตลาส (`scnyx`) ชื่อไฟล์ชีต และค่าที่ส่งข้ามเน็ต
// เปลี่ยนเมื่อไหร่ = อาร์ตหายทั้งตัว และแท็บที่เปิดค้างเล่นกับแท็บใหม่ไม่ได้
{
  const { CHARACTERS } = await import(G + "/core.js");
  const { SCRAMBLE_COLORS } = await import(G + "/ScrambleScene.js");
  void SCRAMBLE_COLORS;
  const src = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  /** ฉายาของตัวละครนั้นตามที่เขียนไว้ใน CHAR_ART */
  const titleOf = (id) => {
    const at = src.indexOf(`  ${id}: {`, src.indexOf("const CHAR_ART"));
    return src.slice(at, at + 600).match(/title: '([^']+)'/)?.[1] ?? "";
  };

  const WANT = { nyx: ['BOMB', 'Nyx'], helios: ['MARCH', 'Helios'], alecto: ['KUNJAE', 'Alecto'],
    atlas: ['TEEMEE', 'Atlas'], orpheus: ['OAT', 'Orpheus'], momus: ['DEAR', 'Momus'] };

  const wrong = [];
  for (const [id, [real, myth]] of Object.entries(WANT)) {
    const ch = CHARACTERS[id];
    if (!ch) { wrong.push(`${id}: ไม่มีตัวนี้แล้ว`); continue; }
    if (ch.id !== id) wrong.push(`${id}: id เปลี่ยนเป็น ${ch.id} — อาร์ตจะหายทั้งตัว`);
    if (ch.label !== real) wrong.push(`${id}: ชื่อเป็น ${ch.label} ควรเป็น ${real}`);
    if (titleOf(id) !== myth) wrong.push(`${id}: ฉายาเป็น "${titleOf(id)}" ควรเป็น ${myth}`);
  }
  ok(wrong.length === 0, wrong.length ? `ชื่อไม่ตรง — ${wrong.join(' · ')}`
    : `ทั้ง ${Object.keys(WANT).length} ตัวใช้ชื่อเล่นเป็นชื่อ และชื่อในตำนานเป็นฉายา`);

  // ฉายาเดิม ("The Fury of ...") ต้องไม่หลงเหลืออยู่ในที่ที่คนเล่นเห็น
  ok(!/title: 'The (Fury|Jester)/.test(src), "ไม่มีฉายา The Fury/The Jester หลงเหลือใน CHAR_ART");

  // ชื่อห้ามซ้ำกัน — ซ้ำแล้วหน้าเลือกตัวกับป้ายผู้ชนะแยกไม่ออกว่าใครเป็นใคร
  const labels = Object.values(CHARACTERS).map((c) => c.label);
  ok(new Set(labels).size === labels.length, `ชื่อไม่ซ้ำกัน (${labels.join(', ')})`);
}

// ── การ์ดต้องแยกคำอธิบายกับชื่อสกิลออกจากกัน ──
//
// รวมอยู่ก้อนเดียวคั่นด้วย <br> แล้วจอเตี้ยย่อ/ตัดบรรทัดทีละชิ้นไม่ได้
// ซึ่งคือสิ่งที่ทำให้การ์ดสูงจนต้องเลื่อนนิ้วในช่องแคบ ๆ (ผู้เล่นรายงานมาเอง)
{
  const src = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const build = src.slice(src.indexOf('card.className = \'card\''), src.indexOf('this.selGrid.appendChild(card)'));
  ok(/class="tip"/.test(build) && /class="skills"/.test(build), "คำอธิบายกับชื่อสกิลเป็นคนละชิ้น");
  // ตัดคอมเมนต์ทิ้งก่อน ไม่งั้นด่านนี้ไปจับคำว่า <br> ในคำอธิบายที่บอกว่า "ไม่ใช้ <br>" เอง
  const code = build.replace(/\/\/[^\n]*/g, '');
  ok(!/<br>/.test(code), "ไม่ใช้ <br> ในการ์ด — ตัดบรรทัดทีละชิ้นไม่ได้");
  const short = src.match(/@media \(max-height: 520px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  ok(short.length > 0, "มีชุดกฎสำหรับจอเตี้ย");
  ok(/-webkit-line-clamp:\s*2/.test(short), "จอเตี้ยตัดคำอธิบายที่สองบรรทัด การ์ดจึงสูงเท่ากันทุกใบ");
  ok(/\.hint \{ display:none/.test(short), "ซ่อนบรรทัดคำแนะนำ เอาที่ว่างไปให้การ์ด");
  const gridH = +(short.match(/\.grid \{ max-height:(\d+)dvh/)?.[1] ?? 0);
  const baseH = +(src.match(/#sc-select \.grid \{[^}]*max-height:min\((\d+)dvh/)?.[1] ?? 0);
  ok(gridH > baseH, `กล่องเลื่อนสูงขึ้นจากเดิม (${baseH}dvh -> ${gridH}dvh)`);
}
