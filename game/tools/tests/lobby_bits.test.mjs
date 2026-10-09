// ทดสอบของเล็กในล็อบบี้และแผงเลือกตัว: ก๊อปรหัสห้อง · ตรวจรหัสตอนพิมพ์ · สุ่มตัวละคร
// รัน: node tools/tests/lobby_bits.test.mjs   (จากโฟลเดอร์ game)
import "./phaser_stub.mjs";
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const scene = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const S = await import(new URL("../../src/net/session.js", import.meta.url).href);

// ══ กติกาของรหัสห้องต้องอยู่ที่เดียว ═══════════════════════════════════════════
//
// เดิมช่องกรอกเช็ค `length < 4` ทั้งที่รหัสยาว 5 ตัว รหัส 4 ตัวจึงผ่านด่านนั้นไป
// โดนปฏิเสธที่ชั้นเน็ตอีกที ซึ่งผู้เล่นอ่านไม่ออกว่าใครผิด
{
  ok(S.ROOM_CODE_LEN === 5, `รหัสยาว ${S.ROOM_CODE_LEN} ตัว`);
  ok(typeof S.normalizeRoomCode === 'function', "มีตัวล้างรหัสให้ใช้ร่วมกัน");
  const n = S.normalizeRoomCode;
  ok(n('ab3d9') === 'AB3D9', "ตัวเล็กกลายเป็นใหญ่");
  ok(n('  a b 3 ') === 'AB3', "ช่องว่างหายไป");
  ok(n('O0I1') === '', "ตัวที่ตัดออกตั้งแต่ตอนสุ่ม (0 O 1 I) ถูกทิ้ง");
  ok(n('xyz23456789') === 'XYZ23', `ยาวเกินตัดท้าย (${n('xyz23456789')})`);
  ok(n(null) === '' && n(undefined) === '', "ค่าว่าง/ไม่มีค่าไม่ throw");

  // ทั้งสามที่ต้องใช้ตัวเดียวกัน ไม่ใช่เขียนกติกาซ้ำ
  ok(/normalizeRoomCode\(el\.value\)/.test(html), "ช่องกรอกใช้ตัวล้างร่วม");
  ok(/normalizeRoomCode\(\$\("join-code-input"\)\.value\)/.test(html), "ปุ่มเชื่อมต่อก็ใช้ตัวเดียวกัน");
  // ต้องดูแต่โค้ด — คอมเมนต์ที่อธิบายว่า "เดิมเช็ค length < 4" มีข้อความนั้นอยู่โดยตั้งใจ
  const code = html
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').map((l) => l.replace(/(^|\s)(\/\/|\*)\s.*$/, '')).join('\n');
  ok(!/length < 4/.test(code), "ไม่มีเลข 4 ที่ฮาร์ดโค้ดไว้แล้วขัดกับความยาวจริง");
  ok(/code\.length < ROOM_CODE_LEN/.test(html), "เช็คความยาวจากค่าจริง ไม่ใช่เลขตายตัว");
}

// ── ปุ่มเชื่อมต่อปิดไว้จนรหัสครบ และบอกว่าขาดอีกกี่ตัว ──
{
  ok(/btn-join-submit"\)\.disabled = !full/.test(html), "รหัสไม่ครบ ปุ่มเชื่อมต่อกดไม่ได้");
  ok(/อีก \$\{ROOM_CODE_LEN - clean\.length\} ตัว/.test(html), "บอกว่าขาดอีกกี่ตัว ไม่ปล่อยให้เดา");
  ok(/\.lobby-btn:disabled \{[^}]*opacity/.test(html), "ปุ่มที่กดไม่ได้ดูออกว่ากดไม่ได้");
  ok(/addEventListener\("input", syncJoinInput\)/.test(html), "กรองตอนพิมพ์ ไม่ใช่ตอนกด");
  ok(/syncJoinInput\(\);\s+\/\/ ช่องว่าง/.test(html), "เข้าหน้ามาปุ่มปิดไว้ตั้งแต่ต้น");
}

// ══ ปุ่มก๊อปรหัสห้อง ═══════════════════════════════════════════════════════════
{
  ok(/id="btn-copy-code"/.test(html), "มีปุ่มก๊อป");
  ok(/id="btn-copy-code" hidden/.test(html), "ซ่อนไว้ก่อน — โชว์ตอนช่องยังว่างคือปุ่มที่กดแล้วไม่เกิดอะไร");
  const host = html.slice(html.indexOf('const openHostPanel ='), html.indexOf('$("btn-host-back")'));
  ok(/btn-copy-code"\)\.hidden = false/.test(host), "โผล่ตอนได้รหัสจริงแล้ว");
  ok(/btn-copy-code"\)\.hidden = true/.test(host), "และซ่อนกลับตอนเริ่มสร้างห้องใหม่");

  // ── สามทางออกของการก๊อป เทสต์จริง ไม่ใช่อ่านว่ามีคำนั้นอยู่ในไฟล์ ──
  //
  // ตอนแรกเขียนเทสต์แบบอ่านข้อความในโค้ด แล้วลองใส่บั๊ก (ตัดทางสำรองทิ้ง) ปรากฏว่า**ไม่แดง**
  // เพราะคำว่า selectNodeContents ยังอยู่ในไฟล์ แค่ไม่มีใครเดินไปถึง
  // จึงย้ายตรรกะไป src/ui/shell.js เพื่อเรียกจริงได้
  {
    const { copyText } = await import(new URL("../../src/ui/shell.js", import.meta.url).href);
    const range = { selectNodeContents(el) { this.el = el; } };
    let selected = null;
    globalThis.document = { ...(globalThis.document ?? {}), createRange: () => range };
    globalThis.getSelection = () => ({ removeAllRanges() {}, addRange: (r) => { selected = r.el; } });

    // node 22 มี globalThis.navigator เป็น getter อย่างเดียว กำหนดค่าตรง ๆ ไม่ได้
    const setNav = (v) => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true, writable: true });
    setNav({ clipboard: { writeText: async () => {} } });
    ok(await copyText('AB3D9', 'กล่อง') === 'copied', "https + ได้สิทธิ์ = ก๊อปได้");

    setNav({ clipboard: { writeText: async () => { throw new Error('denied'); } } });
    selected = null;
    ok(await copyText('AB3D9', 'กล่อง') === 'selected', "ถูกปฏิเสธสิทธิ์ = เลือกข้อความให้แทน");
    ok(selected === 'กล่อง', "และเลือกกล่องรหัสจริง ไม่ใช่เลือกลอย ๆ");

    setNav({});                                      // เบราว์เซอร์ไม่มีคลิปบอร์ดเลย
    ok(await copyText('AB3D9', 'กล่อง') === 'selected', "ไม่มี API ก็ยังเลือกให้ได้");

    globalThis.document = { ...globalThis.document, createRange: () => { throw new Error('no'); } };
    ok(await copyText('AB3D9', 'กล่อง') === 'failed', "เลือกก็ไม่ได้ = บอกตรง ๆ ว่าทำไม่ได้ ไม่ throw");
    ok(await copyText('', 'กล่อง') === 'failed', "ไม่มีรหัสก็ไม่ทำอะไร");
  }

  const copy = html.slice(html.indexOf('$("btn-copy-code").addEventListener'));
  ok(/copyText\(box\.textContent\.trim\(\), box\)/.test(copy), "ปุ่มเรียกตัวที่เทสต์ไว้");
  for (const [how, msg] of [['copied', 'ก๊อปแล้ว'], ['selected', 'กดก๊อปเอง'], ['failed', 'อ่านรหัสให้เพื่อนฟัง']])
    ok(copy.includes(msg), `ทางออก ${how} มีข้อความของตัวเอง`);
  ok(/clearTimeout\(btn\._t\)/.test(copy), "กดรัวแล้วข้อความไม่ค้างผิด");
}

// ══ ปุ่มสุ่มตัวละคร ════════════════════════════════════════════════════════════
{
  ok(/class="rand"/.test(scene), "มีปุ่มสุ่มในแผงเลือกตัว");
  // วางใต้การ์ด ไม่ใช่ข้างปุ่มเริ่ม — กันนิ้วพลาดไปกดสุ่มตอนจะกดเริ่ม
  const wrap = scene.slice(scene.indexOf('<div id="sc-select">'), scene.indexOf('<div id="sc-tune">'));
  ok(wrap.indexOf('class="rand"') < wrap.indexOf('class="go"'), "อยู่ก่อนปุ่มเริ่ม ไม่ติดกัน");

  globalThis.location = { search: "" };
  globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
  const G = new URL("../../src/modes/scramble", import.meta.url).href;
  const { Game, CHARACTERS } = await import(G + "/core.js");
  const { ScrambleScene } = await import(G + "/ScrambleScene.js");

  const mk = (side = 0) => {
    const sc = { phase: 'select', selSide: side, sim: new Game(), picked: [],
      _pickChar(id) { this.sim.fighters[this.selSide].char = id; this.picked.push(id); } };
    sc._pickRandom = ScrambleScene.prototype._pickRandom;
    return sc;
  };

  // สุ่มแล้วต้องไม่ได้ตัวเดิม — ได้ตัวเดิมคือปุ่มที่กดแล้วไม่มีอะไรเกิดขึ้น
  // ซึ่งแยกไม่ออกจากปุ่มเสีย
  let same = 0;
  for (let i = 0; i < 300; i++) {
    const sc = mk(0);
    const before = sc.sim.fighters[0].char;
    sc._pickRandom();
    if (sc.sim.fighters[0].char === before) same++;
  }
  ok(same === 0, `สุ่ม 300 ครั้งไม่เคยได้ตัวเดิม (ได้ซ้ำ ${same} ครั้ง)`);

  // สุ่มให้ช่องที่กำลังเลือกอยู่เท่านั้น ไม่ไปทับตัวที่อีกช่องเลือกไว้
  const sc = mk(1);
  const other = sc.sim.fighters[0].char;
  sc._pickRandom();
  ok(sc.sim.fighters[0].char === other, "ไม่แตะช่องอื่น");
  ok(sc.picked.length === 1, "เรียกทางเดียวกับการกดการ์ด (ต่อเน็ตจึงส่งให้อีกฝั่งเอง)");

  // ครอบคลุมทุกตัวละคร ไม่ใช่วนอยู่สองสามตัว
  const seen = new Set();
  for (let i = 0; i < 600; i++) { const s2 = mk(0); s2._pickRandom(); seen.add(s2.sim.fighters[0].char); }
  ok(seen.size === Object.keys(CHARACTERS).length - 1,
    `สุ่มถึงทุกตัวที่ไม่ใช่ตัวปัจจุบัน (${seen.size}/${Object.keys(CHARACTERS).length - 1})`);

  // ไม่ได้อยู่หน้าเลือกตัวแล้วกดไม่ได้
  const off = mk(0); off.phase = 'fight';
  off._pickRandom();
  ok(off.picked.length === 0, "กดตอนไม่ได้อยู่หน้าเลือกตัวแล้วไม่ทำอะไร");
}

// ══ การ์ดตัวละครที่ยังไม่ปล่อย (coming soon) ═══════════════════════════════════
//
// ของแบบนี้พังแบบเดียวกันเสมอ: เอาไปใส่ในรายชื่อตัวละครจริงเพื่อความง่าย
// แล้วมันไหลไปทุกที่ที่อ่านรายชื่อ — ปุ่มสุ่ม · ปุ่มสลับตัว · ตัวโหลดอัตลาส · เทสต์อาร์ต
// แล้วต้องไล่ใส่เงื่อนไขยกเว้นทีละที่ ซึ่งลืมง่ายกว่าการไม่ใส่ตั้งแต่แรก
{
  const G = new URL("../../src/modes/scramble", import.meta.url).href;
  const { CHARACTERS } = await import(G + "/core.js");
  const fsx = await import("fs");

  const soon = scene.match(/const COMING_SOON = \[([\s\S]*?)\];/)?.[1] ?? "";
  ok(soon.length > 0, "มีรายการตัวที่ยังไม่ปล่อย");
  const pics = [...soon.matchAll(/pic: '([^']+)'/g)].map((m) => m[1]);
  ok(pics.length >= 1, `มี ${pics.length} ตัว`);

  // ห้ามอยู่ใน CHARACTERS — ข้อนี้คือข้อที่สำคัญที่สุดในก้อนนี้
  const names = [...soon.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
  for (const n of names)
    ok(!Object.keys(CHARACTERS).includes(n), `"${n}" ไม่อยู่ในรายชื่อตัวละครจริง`);
  // ล็อกจำนวนไว้เพื่อให้ "เพิ่มตัวละคร" เป็นการตัดสินใจที่ต้องมาแก้บรรทัดนี้ด้วยเสมอ
  // ไม่ใช่เผลอเพิ่มเข้าไปแล้วไม่มีใครรู้ว่าการ์ด COMING_SOON ควรลดลงหรือยัง
  ok(Object.keys(CHARACTERS).length === 7, `ตัวละครที่เล่นได้มี ${Object.keys(CHARACTERS).length} ตัว`);

  // ไฟล์เงาต้องมีจริง — ชี้ไปไฟล์ที่ไม่มี = การ์ดว่างเปล่า ดูเหมือนอาร์ตโหลดไม่ขึ้น
  for (const pic of pics)
    ok(fsx.existsSync(root + pic), `มีไฟล์ ${pic}`);
  // อยู่นอก assets/characters/ เพราะโฟลเดอร์นั้น service worker ไม่โหลดล่วงหน้า (30 MB)
  // แต่เงาต้องเห็นตั้งแต่เปิดแผงครั้งแรกแม้ไม่มีเน็ต
  for (const pic of pics)
    ok(!pic.includes('assets/characters/'), `${pic} ไม่ปนกับชีตตัวละครที่โหลดทีหลัง`);
  const sw = fsx.readFileSync(root + "sw.js", "utf8");
  for (const pic of pics)
    ok(sw.includes(pic), `${pic} อยู่ในรายการโหลดล่วงหน้า`);

  // การ์ดต้องกดไม่ได้จริง ไม่ใช่แค่ไม่ผูก event
  ok(/card\.disabled = true;/.test(scene), "ตั้ง disabled จริง");
  ok(/card\.dataset\.soon = '1';/.test(scene), "ทำเครื่องหมายไว้ให้โค้ดอื่นข้ามได้");
  ok(/if \(card\.dataset\.soon\) continue;/.test(scene), "ตัววาดแผงข้ามการ์ดนี้ ไม่ไปหาตัวละครที่ไม่มี");
  ok(/\.card\.soon \{[^}]*border-style:dashed/.test(scene), "ขอบประ อ่านออกว่ายังกดไม่ได้โดยไม่ต้องลองกด");
  ok(/\.card\.soon \{[^}]*opacity:\.5/.test(scene), "และจางลง");
  // .pic i ของการ์ดปกติตั้ง image-rendering:pixelated ไว้ให้เฟรมอัตลาสคม
  // เงาเป็นภาพย่อธรรมดา เปิดพิกเซลไว้แล้วขอบหยักเป็นบันได
  ok(/\.card\.soon \.pic i \{[^}]*image-rendering:auto/.test(scene), "ทับ image-rendering ของการ์ดปกติ");

  // ปุ่มสุ่มต้องไม่สุ่มไปโดนตัวที่ยังไม่ปล่อย (มันสุ่มจาก CHARACTERS ซึ่งไม่มีตัวนี้อยู่แล้ว)
  ok(/const ids = Object\.keys\(CHARACTERS\);/.test(scene), "ปุ่มสุ่มอ่านจาก CHARACTERS เท่านั้น");
}

// ══ ห้องสี่คน: ต้องรอครบก่อนเริ่ม ═══════════════════════════════════════════════
//
// เข้าเกมไปตอนยังไม่ครบ = ที่นั่งที่เหลือไม่มีใครส่งอินพุต แล้ว lockstep ค้างรอตลอดกาล
// ซึ่งบนจออ่านว่า "เกมแฮงก์" ไม่ใช่ "ยังรอเพื่อนอยู่" — คนเล่นจะรีเฟรชหนีทันที
{
  ok(/id="btn-host4"/.test(html), "มีปุ่มสร้างห้องสี่คน");
  ok(/data-seats="4"/.test(html), "ปุ่มบอกจำนวนที่นั่งไว้ใน markup ไม่ใช่ฮาร์ดโค้ดในสคริปต์");
  const host = html.slice(html.indexOf('const openHostPanel ='), html.indexOf('$("btn-host-back")'));
  ok(/hostRoom\(\{\s*\n?\s*seats,/.test(host), "ส่งจำนวนที่นั่งเข้า hostRoom จริง");
  ok(/if \(here < total\)/.test(host), "ยังไม่ครบก็ยังไม่เริ่ม");
  ok(/return;/.test(host.slice(host.indexOf('if (here < total)'))), "และออกจากฟังก์ชันไปเลย ไม่เผลอเริ่มต่อ");
  ok(/\$\{total - here\}/.test(host), "บอกเป็นตัวเลขว่าขาดอีกกี่คน ไม่ใช่ \"รอเพื่อน\" เฉย ๆ");
  // ปุ่มทั้งสองต้องใช้ทางเดียวกัน ไม่ใช่ก๊อปโค้ดกันคนละชุดแล้วแก้ไม่ครบทีหลัง
  ok(/for \(const id of \["btn-host", "btn-host4"\]\)/.test(html), "ปุ่มสองปุ่มผูกกับฟังก์ชันเดียวกัน");
}
