// ทดสอบเสียงปุ่มเมนู (ฝั่ง DOM ไม่ผ่าน Phaser)
// รัน: node tools/tests/ui_sfx.test.mjs   (จากโฟลเดอร์ game)
//
// README ที่เขียนไว้ตอนคัดไฟล์ระบุสามเรื่องที่ต้องจัดการ ไฟล์นี้เช็คทั้งสาม:
// นโยบาย autoplay · ปุ่มปิดเสียงต้องคุมด้วย · พังแล้วต้องไม่ลามไปที่เมนู
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const scene = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

// ── DOM/เสียงปลอม ต้องตั้งก่อน import เพราะโมดูลจำ ctx ไว้ที่ระดับโมดูล ──
let played = [], resumed = 0, store = {}, now = 0;
/** เดินนาฬิกาเสียงให้พ้นตัวกันเสียงซ้อน แล้วรอให้การโหลดแบบ async ลงตัว */
const step = async () => { now += 1; await new Promise((r) => setTimeout(r, 0)); };
class FakeCtx {
  constructor() { this.state = 'running'; this.destination = {}; }
  get currentTime() { return now; }
  resume() { resumed++; this.state = 'running'; }
  createGain() { return { gain: {}, connect: (n) => n }; }
  createBufferSource() {
    const self = this;
    return { buffer: null, connect: (n) => n, start() { played.push(self._name ?? '?'); } };
  }
  async decodeAudioData() { return { fake: true }; }
}
globalThis.window = { AudioContext: FakeCtx, matchMedia: () => ({ matches: false }) };
globalThis.document = { createElement: () => ({ canPlayType: () => 'probably' }) };
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(8) });

const M = await import(new URL("../../src/ui/uisfx.js", import.meta.url).href);
const { uiSfx, unlockUiSfx, wireUiSfx, UI_BANK, UI_STORE } = M;

// ══ ไฟล์ที่ตารางอ้างถึงต้องมีจริงทั้งสองฟอร์แมต ══════════════════════════════════
//
// ตารางชี้ไปที่ไฟล์ที่ไม่มี = ปุ่มเงียบโดยไม่มี error ให้เห็น ซึ่งแยกไม่ออกจาก "ยังไม่ได้ทำ"
{
  const dir = root + "assets/audio/sfx/";
  const missing = [];
  for (const [kind, names] of Object.entries(UI_BANK))
    for (const n of names)
      for (const ext of ['ogg', 'm4a'])
        if (!fs.existsSync(dir + n + '.' + ext)) missing.push(`${kind}:${n}.${ext}`);
  ok(missing.length === 0, missing.length ? `ไฟล์หาย: ${missing.join(' ')}` : "ไฟล์เสียงปุ่มครบทั้ง ogg และ m4a");
  ok(Object.keys(UI_BANK).length >= 5, `มีเสียงครบทุกชนิด (${Object.keys(UI_BANK).join(', ')})`);
  // สองฟอร์แมตเพราะ Safari เก่าไม่เล่น ogg / Firefox เก่าไม่เล่น m4a — เหตุผลเดียวกับเพลง
  ok(/canPlayType\('audio\/ogg/.test(fs.readFileSync(root + "src/ui/uisfx.js", "utf8")),
    "เลือกฟอร์แมตตามที่เครื่องเล่นได้ ไม่ฮาร์ดโค้ด");
}

// ══ สัญญาอนุญาต — ต้องโผล่ใน SOURCES.json เหมือนเสียงอื่น ═══════════════════════
{
  const src = JSON.parse(fs.readFileSync(root + "assets/audio/sfx/SOURCES.json", "utf8"));
  const rows = Object.entries(src.files ?? src).filter(([k]) => k.startsWith('ui_'));
  ok(rows.length >= 7, `เสียงปุ่มอยู่ในบัญชีสัญญาอนุญาตครบ (${rows.length} ไฟล์)`);
  ok(rows.every(([, v]) => (v.lic ?? v.license) === 'cc0'), "และเป็น CC0 ทั้งหมด ใช้เชิงพาณิชย์ได้");
}

// ══ ปุ่มปิดเสียงต้องคุมเสียงปุ่มด้วย ═══════════════════════════════════════════
//
// ถ้าเมนูอ่านคีย์คนละตัว คนที่ปิดเสียงไว้จะยังโดนเสียงปุ่มเด้งใส่
{
  ok(UI_STORE === 'sfr.muted', `ใช้คีย์ปิดเสียงเดียวกับเพลง (${UI_STORE})`);
  const bgm = scene.match(/store:\s*'([^']+)'/);
  ok(bgm && bgm[1] === UI_STORE, `ตรงกับที่ฉากใช้จริง (${bgm?.[1]})`);

  unlockUiSfx();
  await step(); await step();          // รอให้โหลดล่วงหน้าเสร็จ (fetch + decode เป็น async)
  played = [];
  ok(uiSfx('click') === true, "ไม่ได้ปิดเสียง = ดัง");

  store['sfr.muted'] = '1';
  await step();
  played = [];
  ok(uiSfx('click') === false && played.length === 0, "ปิดเสียงแล้วเงียบจริง");

  // อ่านคีย์ทุกครั้งที่จะเล่น ไม่ใช่อ่านครั้งเดียวตอนโหลด — กดปิดกลางเกมต้องมีผลทันที
  delete store['sfr.muted'];
  await step();
  ok(uiSfx('click') === true, "เปิดกลับมาแล้วดังทันที ไม่ต้องรีโหลดหน้า");

  // กดรัวหรือเมาส์กวาดผ่านหลายปุ่มติดกัน เสียงจะซ้อนกันเป็นเสียงรบกวน
  played = [];
  ok(uiSfx('click') === false, "กดซ้ำในเสี้ยววินาทีเดียวกันไม่ดังซ้อน");
  await step();
  ok(uiSfx('click') === true, "พ้นช่วงนั้นแล้วดังตามปกติ");
}

// ══ พังแล้วต้องไม่ลามไปที่เมนู ═════════════════════════════════════════════════
//
// เสียงปุ่มไม่ดังคือเรื่องเล็ก เมนูกดไม่ได้คือเกมเสีย
{
  let threw = false;
  try { uiSfx('ชื่อที่ไม่มีอยู่') ; } catch (e) { threw = true; }
  ok(!threw, "ชื่อเสียงที่ไม่รู้จักถูกเมินเงียบ ๆ ไม่ throw");
  ok(uiSfx('ชื่อที่ไม่มีอยู่') === false, "และบอกกลับว่าไม่ได้เล่น");

  // localStorage พังได้จริง (โหมดส่วนตัวของ Safari throw ตอนอ่าน)
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('denied'); } };
  let ok2 = true;
  try { uiSfx('click'); } catch (e) { ok2 = false; }
  globalThis.localStorage = real;
  ok(ok2, "อ่าน localStorage ไม่ได้ก็ยังไม่ throw (โหมดส่วนตัวของ Safari)");

  const src = fs.readFileSync(root + "src/ui/uisfx.js", "utf8");
  const fns = src.split('\n').filter((l) => /^(export )?(async )?function/.test(l)).length;
  ok((src.match(/try \{/g) ?? []).length >= 5, `ทุกทางที่แตะของนอกห่อ try ไว้ (${(src.match(/try \{/g) ?? []).length} จุด / ${fns} ฟังก์ชัน)`);
}

// ══ นโยบาย autoplay — ปุ่มแรกต้องดัง ไม่ใช่เงียบแล้วค่อยดังตั้งแต่ปุ่มที่สอง ══════
//
// pointerdown มาถึงก่อน click เสมอ ปลุกที่นั่นจึงทันปุ่มแรก
// ปลุกตอน click ของปุ่มแรกจะสายไปหนึ่งปุ่มเสมอ (ยังไม่มี ctx ตอนที่ต้องเล่น)
{
  ok(/addEventListener\("pointerdown", unlockUiSfx/.test(html), "ปลุกระบบเสียงจาก pointerdown");
  ok(/\{ once: true, capture: true \}/.test(html), "ครั้งเดียว และดักตอนลงก่อนใครจับ");
  const idx = html.indexOf('unlockUiSfx');
  const wire = html.indexOf('wireUiSfx(document.body)');
  ok(idx > 0 && wire > idx, "ปลุกก่อนผูกปุ่ม");
  const src = fs.readFileSync(root + "src/ui/uisfx.js", "utf8");
  ok(/for \(const names of Object\.values\(BANK\)\)/.test(src), "ปลุกแล้วโหลดไว้ล่วงหน้าทั้งชุด");
  ok(/ctx\.state === 'suspended'/.test(src), "เจอ context ที่ถูกพักไว้แล้วปลุกต่อ");
}

// ══ ผูกที่กล่องแม่ ปุ่มที่สร้างทีหลังได้เสียงเอง ═══════════════════════════════
{
  const mkEl = (tag, attrs = {}) => {
    const el = { tagName: tag, dataset: attrs.dataset ?? {}, disabled: !!attrs.disabled,
      children: [], handlers: {}, parent: null };
    el.closest = (sel) => (sel.includes('button') && tag === 'button') || (el.dataset.sfx ? true : false) ? el : (el.parent ? el.parent.closest(sel) : null);
    el.addEventListener = (t, fn) => { (el.handlers[t] ??= []).push(fn); };
    el.appendChild = (c) => { c.parent = el; el.children.push(c); return c; };
    el.fire = (t, target) => { for (const fn of el.handlers[t] ?? []) fn({ target: target ?? el }); };
    return el;
  };
  const panel = mkEl('div');
  wireUiSfx(panel);
  const b1 = panel.appendChild(mkEl('button'));
  const b2 = panel.appendChild(mkEl('button', { dataset: { sfx: 'back' } }));
  const b3 = panel.appendChild(mkEl('button', { disabled: true }));

  await step();
  played = [];
  panel.fire('pointerdown', b1);
  ok(played.length === 1, "ปุ่มที่สร้างหลังผูกก็ยังมีเสียง (ดักที่กล่องแม่)");

  await step();
  played = [];
  panel.fire('pointerdown', b2);
  ok(played.length === 1, "ปุ่มที่บอกชนิดเสียงเองก็ดัง");

  await step();
  played = [];
  panel.fire('pointerdown', b3);
  ok(played.length === 0, "ปุ่มที่ถูกปิดไว้ไม่มีเสียง");

  ok(/data-sfx="back"/.test(html), "ปุ่มย้อนกลับในล็อบบี้ใช้เสียงย้อนกลับ");
  ok(/data-sfx="start"/.test(html), "ปุ่มเริ่ม/เชื่อมต่อใช้เสียงยืนยัน");
  ok(/card\.dataset\.sfx = 'pick'/.test(scene), "การ์ดตัวละครใช้เสียงเลือก");
  ok(/this\.selGo\.dataset\.sfx = 'start'/.test(scene), "ปุ่มเริ่มในแผงเลือกตัวใช้เสียงยืนยัน");
}

// ── ปุ่มเล่นเกม (#sc-touch) ต้องไม่เอาเสียงเมนู ──
//
// มันมีเสียงของท่าอยู่แล้ว ใส่เพิ่มจะได้สองเสียงทุกครั้งที่กดตี
{
  ok(/wireUiSfx\(root\.querySelector\('#sc-select'\)\)/.test(scene), "แผงเลือกตัวมีเสียง");
  ok(/wireUiSfx\(root\.querySelector\('#sc-tools'\)\)/.test(scene), "แถวเครื่องมือมีเสียง");
  ok(!/wireUiSfx\([^)]*sc-touch/.test(scene), "ปุ่มเล่นเกมไม่มีเสียงเมนู");
}

// ── เสียงตอนเลื่อนผ่านเปิดเฉพาะเครื่องที่มีเมาส์จริง ──
//
// บนมือถือ pointerover มาพร้อมการแตะ จะได้ยินสองเสียงซ้อนกันทุกครั้งที่กด
{
  const src = fs.readFileSync(root + "src/ui/uisfx.js", "utf8");
  ok(/hover && !isCoarse\(\)/.test(src), "เช็คว่าเป็นเมาส์จริงก่อนผูกเสียงเลื่อนผ่าน");
  ok(/pointer: coarse/.test(src), "ดูจาก pointer: coarse");
}
