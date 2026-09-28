// ทดสอบผังปุ่มคีย์บอร์ด — คำนวณล้วน ไม่ต้องมีเบราว์เซอร์
// รัน: node tools/tests/keys.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: ผังปุ่มพังแบบ "กดแล้วไม่เกิดอะไร" ซึ่งคนเล่นอ่านว่าเกมเสีย ไม่ใช่ว่าตัวเองกดผิด
// และเคสที่อันตรายที่สุดคือ **ปุ่มเดียวสั่งสองคนพร้อมกัน** ตอนเล่นสองคนบนคีย์บอร์ดเดียว
// ซึ่งไม่ throw ไม่ขึ้นแดง แค่ตัวละครอีกตัวขยับเองเฉย ๆ
import "./phaser_stub.mjs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { ScrambleScene, BINDS, ALONE_EXTRA, readInput } = await import(G + "/ScrambleScene.js");

/** กดปุ่มชุดนี้ค้างไว้แล้วอ่านอินพุตของฝั่งที่ระบุ */
const read = (codes, side = 0, alone = false) => {
  const set = new Set([].concat(codes));
  return readInput(side, alone, set, set);
};
const ACTS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'block', 'skill1', 'skill2', 'skill3'];
/** ปุ่มนี้ทำให้ท่าไหนติดบ้าง */
const firesOf = (code, side, alone) => {
  const inp = read(code, side, alone);
  return ACTS.filter((k) => inp[k]);
};

// ══ ผังที่ขอไว้: WASD เดิน · Space กระโดด · มือขวาอยู่ที่ numpad ═══════════════
//
// numpad วางตามตำแหน่งนิ้ว ไม่ใช่ตามเลข:
//   แถวล่าง (1 2 3) = แถวที่รัวเร็วที่สุด ให้ท่าที่กดบ่อยที่สุด
//   5 อยู่กลาง = อัลติ ต้องเล็งกด ไม่ใช่ปุ่มที่ปัดโดนได้
//   8 อยู่บน = กัน นิ้วเอื้อมขึ้น ไม่กดพลาดตอนรัวตี
{
  const WANT = [
    ['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'up'], ['KeyS', 'down'],
    ['Space', 'jump'],
    ['Numpad1', 'attack'], ['Numpad2', 'skill1'], ['Numpad3', 'skill2'],
    ['Numpad5', 'skill3'], ['Numpad8', 'block'],
  ];
  const wrong = [];
  for (const [code, act] of WANT) {
    const got = firesOf(code, 0, true);
    if (got.length !== 1 || got[0] !== act) wrong.push(`${code} -> ${got.join('+') || 'ไม่ทำอะไร'} (ควรเป็น ${act})`);
  }
  ok(wrong.length === 0, wrong.length
    ? `ผังปุ่มไม่ตรงที่ขอ — ${wrong.join(' · ')}`
    : `ผังปุ่ม PC ตรงตามที่ขอครบทั้ง ${WANT.length} ปุ่ม`);

  // และต้องยิงได้ทั้ง "กดค้าง" กับ "เพิ่งกด" — ท่าส่วนใหญ่ใช้บิตเพิ่งกด ไม่ใช่กดค้าง
  const inp = read('Numpad1', 0, true);
  ok(inp.attack && inp.p.attack, "ปุ่มตีติดทั้งบิตกดค้างและบิตเพิ่งกด");
  ok(read('Numpad8', 0, true).p.block, "ปุ่มกันก็มีบิตเพิ่งกด");
}

// ══ ข้อที่สำคัญที่สุด: numpad เป็นของฝั่ง 2 ตอนเล่นสองคนคีย์บอร์ดเดียว ══════════
//
// ถ้าฝั่ง 1 ยืม numpad มาใช้ตอนนั้นด้วย ปุ่มเดียวจะสั่งสองคนพร้อมกัน
// อาการบนจอคือ "ตัวละครอีกตัวขยับเอง" ซึ่งไม่มีใครเดาถูกว่ามาจากผังปุ่ม
{
  const shared = [];
  for (const code of Object.values(ALONE_EXTRA).flat()) {
    const p1 = firesOf(code, 0, false);        // ฝั่ง 1 ตอนแชร์คีย์บอร์ด = ไม่ได้ชุดเสริม
    const p2 = firesOf(code, 1, false);
    if (p1.length && p2.length) shared.push(`${code}: p1 ${p1.join('+')} · p2 ${p2.join('+')}`);
  }
  ok(shared.length === 0, shared.length
    ? `ปุ่มเดียวสั่งสองคนพร้อมกัน — ${shared.join(' · ')}`
    : "เล่นสองคนคีย์บอร์ดเดียว: ไม่มีปุ่มไหนสั่งสองคนพร้อมกัน");

  // พิสูจน์ว่าเงื่อนไขมีผลจริง ไม่ใช่ผ่านเพราะ numpad ไม่ได้อยู่ในผังของฝั่ง 1 เลย
  ok(firesOf('Numpad1', 0, true).includes('attack'), "อยู่คนเดียวบนคีย์บอร์ด: Numpad1 ใช้ได้");
  ok(firesOf('Numpad1', 0, false).length === 0, "แชร์คีย์บอร์ด: Numpad1 ไม่ใช่ปุ่มของฝั่ง 1 อีกต่อไป");
  ok(firesOf('Numpad1', 1, false).includes('attack'), "และยังเป็นปุ่มตีของฝั่ง 2 เหมือนเดิม");
}

// ══ ปุ่มเดิม (JKL + 123) ต้องไม่หายไป ═══════════════════════════════════════════
//
// ปุ่มบนจอของมือถือยิง key code พวกนี้เข้ามา (ดู data-code ใน #sc-touch)
// ถอดออกเมื่อไหร่ = ปุ่มบนจอตายทั้งแผงโดยที่ไม่มีเทสต์ไหนร้อง
{
  const legacy = [['KeyJ', 'attack'], ['KeyL', 'block'], ['Space', 'jump'],
    ['Digit1', 'skill1'], ['Digit2', 'skill2'], ['Digit3', 'skill3']];
  const lost = legacy.filter(([code, act]) => !firesOf(code, 0, false).includes(act));
  ok(lost.length === 0, lost.length
    ? `ปุ่มเดิมหายไป — ${lost.map((l) => l[0]).join(', ')}`
    : "ปุ่มเดิม JKL/123 ยังใช้ได้ทุกปุ่ม (ปุ่มบนจอมือถือยิงชุดนี้)");
  // และต้องใช้ได้ทั้งตอนอยู่คนเดียวด้วย — คนที่ชินของเดิมไม่ควรต้องมาเรียนใหม่
  ok(legacy.every(([code, act]) => firesOf(code, 0, true).includes(act)),
    "และยังใช้ได้ตอนอยู่คนเดียวบนคีย์บอร์ด — ของใหม่เป็นการเพิ่ม ไม่ใช่การแทนที่");
}

// ══ ไม่มีปุ่มไหนในฝั่งเดียวกันถูกผูกไว้สองท่า ══════════════════════════════════
//
// ผูกซ้ำ = กดทีเดียวออกสองท่า ซึ่งดูเหมือนบั๊กของระบบท่า ไม่ใช่ของผังปุ่ม
{
  const dup = [];
  for (const [side] of BINDS.entries()) {
    for (const alone of (side === 0 ? [false, true] : [false])) {
      const all = new Set(Object.values(BINDS[side]).flat()
        .concat(side === 0 && alone ? Object.values(ALONE_EXTRA).flat() : []));
      for (const code of all) {
        const acts = firesOf(code, side, alone);
        if (acts.length > 1) dup.push(`ฝั่ง ${side + 1}${alone ? ' (คนเดียว)' : ''} ${code} -> ${acts.join('+')}`);
      }
    }
  }
  ok(dup.length === 0, dup.length ? `ปุ่มผูกซ้ำ — ${dup.join(' · ')}` : "ไม่มีปุ่มไหนผูกไว้สองท่าในฝั่งเดียวกัน");
}

// ══ บรรทัดบอกปุ่มต้องตรงกับผังที่ใช้จริง ═══════════════════════════════════════
//
// บอกปุ่มผิดแย่กว่าไม่บอก เพราะคนเล่นจะลองตามแล้วสรุปว่าเกมเสีย
{
  const line = (versus) => ScrambleScene.prototype.helpLine.call({
    versus, sharedKeyboard: ScrambleScene.prototype.sharedKeyboard });

  const alone = line('solo');
  ok(alone === line('net'), "ซ้อมกับต่อเน็ตบอกปุ่มชุดเดียวกัน (คนเดียวต่อเครื่องเหมือนกัน)");
  for (const [code, act] of [['Num1', 'ตี'], ['Num2', 'สกิล 1'], ['Num3', 'สกิล 2'], ['Num5', 'อัลติ'], ['Num8', 'กัน']])
    ok(alone.includes(code), `บรรทัดบอกปุ่มมี ${code} (${act})`);

  const shared = line('local');
  ok(shared !== alone, "เล่นสองคนคีย์บอร์ดเดียวบอกคนละชุด");
  ok(!shared.includes('Num8') && !shared.includes('Num2 '), "และไม่ไปบอกปุ่มที่ฝั่ง 1 ใช้ไม่ได้ตอนนั้น");
  ok(shared.includes('P1') && shared.includes('P2'), "บอกแยกเป็นสองฝั่งให้ชัด");
  ok(line('team') === shared, "2v2 บนเครื่องเดียวก็แชร์คีย์บอร์ดเหมือนกัน");
}
