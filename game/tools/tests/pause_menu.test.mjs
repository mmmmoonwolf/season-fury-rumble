// ทดสอบเมนูหยุดพักและทางออกกลับหน้าแรก
// รัน: node tools/tests/pause_menu.test.mjs   (จากโฟลเดอร์ game)
//
// ก่อนหน้านี้ **เข้าเกมแล้วออกไม่ได้เลย** — B กลับได้แค่หน้าเลือกตัว P หยุดเกมแต่ไม่มีเมนูโผล่มา
// ต้องรีเฟรชหน้าเว็บอย่างเดียว และบนมือถือไม่มีปุ่มหยุดเกมด้วยซ้ำ (P เป็นคีย์บอร์ดเท่านั้น)
import "./phaser_stub.mjs";
import fs from "fs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const scene = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");
const html = fs.readFileSync(root + "index.html", "utf8");

globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
const btnCls = new Set();
globalThis.document = {
  createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }),
  getElementById: () => ({ classList: { add: (c) => btnCls.add(c), remove: (c) => btnCls.delete(c), toggle() {}, contains: (c) => btnCls.has(c) } }),
};
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { ScrambleScene } = await import(G + "/ScrambleScene.js");
const shell = await import(new URL("../../src/ui/shell.js", import.meta.url).href);

/** เมนูปลอม — เก็บค่าที่โค้ดเขียนลงไปให้ตรวจได้ */
function mkMenu() {
  const cls = new Set();
  const fields = { select: { hidden: null }, quit: { textContent: '' }, note: { textContent: '' } };
  return {
    cls, fields,
    classList: { contains: (c) => cls.has(c), add: (c) => cls.add(c), remove: (c) => cls.delete(c) },
    querySelector: (sel) => sel.includes('select') ? fields.select
      : sel.includes('quit') ? fields.quit : fields.note,
  };
}
function mkScene(versus = 'solo') {
  const menu = mkMenu();
  const sc = { versus, paused: false, menuEl: menu, opened: 0, sent: [], syncTools() {},
    openSelect() { this.opened++; }, netSend(pk) { this.sent.push(pk); } };
  for (const m of ['_toggleMenu', '_openMenu', '_closeMenu', '_menuAct', 'toSelect'])
    sc[m] = ScrambleScene.prototype[m];
  return sc;
}

// ══ เล่นเครื่องเดียว: เปิดเมนู = หยุดเกมจริง ════════════════════════════════════
{
  const sc = mkScene('solo');
  sc._toggleMenu();
  ok(sc.menuEl.cls.has('open'), "เปิดเมนูได้");
  ok(sc.paused === true, "เล่นคนเดียวแล้วหยุดเกมจริง");
  ok(sc.menuEl.fields.select.hidden === false, "มีปุ่มกลับไปเลือกตัวละคร");
  ok(sc.menuEl.fields.quit.textContent === 'ออกไปหน้าแรก', `ปุ่มออกบอกว่าไปไหน (${sc.menuEl.fields.quit.textContent})`);
  ok(sc.menuEl.fields.note.textContent === '', "ไม่มีคำเตือน");
  sc._toggleMenu();
  ok(!sc.menuEl.cls.has('open') && sc.paused === false, "กดอีกทีเล่นต่อ และเกมเดินต่อ");
}

// ══ ต่อเน็ต: เปิดเมนูได้ แต่ห้ามหยุดเกม ════════════════════════════════════════
//
// lockstep เดินด้วยอินพุตของทั้งสองฝั่ง ฝ่ายเดียวหยุดคือฝ่ายนั้นเลิกส่งอินพุต
// แล้วอีกฝั่งค้างรอไปเรื่อย ๆ โดยไม่รู้ว่าทำไม — ซึ่งแยกไม่ออกจากเน็ตหลุด
{
  const sc = mkScene('net');
  sc._openMenu();
  ok(sc.menuEl.cls.has('open'), "ต่อเน็ตก็เปิดเมนูได้");
  ok(sc.paused === false, "แต่ไม่หยุดเกม — ไม่งั้นอีกฝั่งค้างรอไปเรื่อย ๆ");
  ok(sc.menuEl.fields.select.hidden === false, "ต่อเน็ตก็กลับไปเลือกตัวละครได้ ไม่ต้องรีเฟรชเข้าห้องใหม่");
  ok(/ทั้งสองฝั่ง/.test(sc.menuEl.fields.select.textContent),
    `ปุ่มบอกว่ามันพาอีกฝั่งไปด้วย (${sc.menuEl.fields.select.textContent})`);
  ok(sc.menuEl.fields.quit.textContent === 'ออกจากห้อง', `ปุ่มออกเปลี่ยนคำตามโหมด (${sc.menuEl.fields.quit.textContent})`);
  ok(/เกมยังเดินอยู่/.test(sc.menuEl.fields.note.textContent), "บอกตรง ๆ ว่าเกมยังเดิน ไม่ปล่อยให้เข้าใจผิด");
  sc._closeMenu();
  ok(sc.paused === false, "ปิดเมนูแล้วก็ยังไม่แตะ paused");
}

// ══ ปุ่มในเมนูทำงานถูก ═════════════════════════════════════════════════════════
{
  const sc = mkScene('solo');
  sc._openMenu();
  sc._menuAct('resume');
  ok(!sc.menuEl.cls.has('open') && !sc.paused, "เล่นต่อ = ปิดเมนูและเดินต่อ");

  sc._openMenu();
  sc._menuAct('select');
  ok(sc.opened === 1 && !sc.menuEl.cls.has('open'), "เลือกตัวละคร = ปิดเมนูแล้วเปิดหน้าเลือกตัว");
}

// ── ยังไม่มีใครลงทะเบียนทางออก: ต้องไม่ปิดเมนูทิ้ง ──
//
// ปิดแล้วผู้เล่นเห็นว่าเมนูหายแต่ยังอยู่ในเกม ซึ่งดูเหมือนปุ่มเสีย
// แล้วเขาจะกดซ้ำอีกหลายครั้งโดยไม่มีอะไรเกิดขึ้น
{
  shell.resetShell();
  const sc = mkScene('solo');
  sc._openMenu();
  sc._menuAct('quit');
  ok(sc.menuEl.cls.has('open'), "ออกไม่ได้ก็ไม่ปิดเมนูทิ้ง");
  ok(/รีเฟรช/.test(sc.menuEl.fields.note.textContent), `บอกทางออกสำรองให้ (${sc.menuEl.fields.note.textContent})`);
}

// ── ลงทะเบียนแล้วต้องเรียกจริง ──
{
  let called = 0;
  shell.onQuitToLobby(() => { called++; });
  const sc = mkScene('solo');
  sc._openMenu();
  sc._menuAct('quit');
  ok(called === 1, "เรียกทางออกที่หน้าเว็บลงทะเบียนไว้");
  ok(!sc.menuEl.cls.has('open'), "และปิดเมนู");
  shell.resetShell();
  ok(shell.quitToLobby() === false, "ล้างค่าแล้วบอกกลับว่าออกไม่ได้");
}

// ══ ทางออกต้องเป็นด้านกลับของ startGame ให้ครบทุกบรรทัด ════════════════════════
//
// startGame ซ่อน #lobby, ซ่อน #credits, สร้าง Phaser.Game
// ขาดข้อไหนคือกลับมาแล้วหน้าตาไม่เหมือนเดิม เช่นเครดิตหายไปเฉย ๆ
{
  const start = html.slice(html.indexOf('function startGame'), html.indexOf('const $ = (id)'));
  const quit = html.slice(html.indexOf('onQuitToLobby(() =>'), html.indexOf('$("btn-solo")'));
  for (const id of ['lobby', 'credits'])
    ok(start.includes(id) && quit.includes(id), `ทางออกคืนค่า #${id} ที่ startGame ซ่อนไว้`);
  ok(/__sfrGame\?\.destroy\(true\)/.test(quit), "ทำลายเกมและเอา canvas ออกจากหน้า");
  ok(/__sfrGame = null/.test(quit), "ล้างตัวอ้างอิงทิ้ง ไม่ให้กดเริ่มใหม่แล้วมีสองเกมซ้อน");
  ok(/cancelSession\(\)/.test(quit), "ตัดการต่อห้องให้เรียบร้อย ไม่ปล่อยค้าง");
  ok(/showPanel\("menu"\)/.test(quit), "กลับไปหน้าเมนูหลัก ไม่ใช่หน้าที่ค้างอยู่ก่อนเข้าเกม");
  // เรียกจากใน event handler ของฉากเอง ทำลายทันทีคือดึงพื้นออกจากใต้เท้าตัวเอง
  ok(/setTimeout\(\(\) => \{/.test(quit), "เลื่อนออกไปหนึ่งรอบก่อนทำลาย (Phaser ยังวนลูปอยู่ในสแต็กเดียวกัน)");
}

// ══ ต้องกดได้บนมือถือ ไม่ใช่มีแต่คีย์บอร์ด ═════════════════════════════════════
//
// เดิม P เป็นคีย์บอร์ดเท่านั้น และไม่มีปุ่มบนจอ = บนมือถือหยุดเกมไม่ได้เลย
{
  ok(/id="sc-pause-btn"/.test(scene), "มีปุ่มหยุดพักบนจอ");
  // อยู่นอกแถวเครื่องมือโดยตั้งใจ — แถวนั้นถูกซ่อนทั้งแถวตอนต่อเน็ต
  // แต่ "ออกจากห้อง" คือสิ่งที่ต้องทำได้ตอนต่อเน็ตมากกว่าตอนเล่นคนเดียวด้วยซ้ำ
  const tools = scene.slice(scene.indexOf('<div id="sc-tools">'), scene.indexOf('<div id="sc-pause">'));
  ok(!/sc-pause-btn/.test(tools), "ปุ่มหยุดพักไม่อยู่ในแถวเครื่องมือ (แถวนั้นหายตอนต่อเน็ต)");
  // เคยต้องมีกฎแยกสำหรับตอนต่อเน็ต เพราะแถวเครื่องมือที่หายไปทำให้ที่ว่างเปลี่ยน
  // ตอนนี้ตำแหน่งคิดจาก "แผงผู้เล่นจบตรงไหน" ซึ่งเท่ากันทุกโหมด กฎแยกจึงไม่จำเป็นอีก
  //
  // **ต้องเป็นเปอร์เซ็นต์ของจอ ไม่ใช่ px**: ผืนเกมสูง 720 เสมอแล้วถูกย่อเท่าความสูงจอจริง
  // (มือถือแนวนอน 414 px = ย่อ 0.575 เท่า) ตั้งเป็น px แล้วจะถูกบนคอมแต่ต่ำเกินไปเท่าตัวบนมือถือ
  const btnTop = (sel) => scene.match(new RegExp(`${sel}[^}]*top:\\s*calc\\(([^)]*)`))?.[1] ?? "";
  for (const sel of ['#sc-pause-btn', '#sc-mute'])
    ok(/dvh/.test(btnTop(sel)), `${sel} วางตำแหน่งด้วยเปอร์เซ็นต์ของจอ ไม่ใช่ px (${btnTop(sel).trim()})`);
  ok(!/body\.sc-net #sc-(pause-btn|mute)\s*\{[^}]*top:/.test(scene),
    "ไม่มีกฎตำแหน่งแยกสำหรับตอนต่อเน็ตอีกแล้ว — ที่ว่างเท่ากันทุกโหมด");
  // ตอนแผงเลือกตัวเปิดอยู่ต้องหลบขึ้นไป ไม่งั้นลอยทับการ์ดใบซ้ายบน (z-index สูงกว่าแผงโดยตั้งใจ)
  ok(/body\.sc-picking #sc-mute[\s\S]{0,120}top:/.test(scene), "หลบขึ้นมุมบนตอนแผงเลือกตัวเปิดอยู่");
  ok(/#sc-pause \{[^}]*z-index:32/.test(scene), "ทับแผงเลือกตัว (z-index 30) ได้");
  ok(/e\.target === this\.menuEl/.test(scene), "แตะพื้นมืดนอกการ์ดก็ปิดเมนูได้");
}

// ══ กลับไปเลือกตัวละครตอนต่อเน็ต: ต้องพาอีกฝั่งไปด้วยเสมอ ═════════════════════
//
// ฝ่ายเดียวกลับไปเลือกตัวไม่ได้ — lockstep เดินด้วยอินพุตของทั้งสองฝั่ง
// ฝั่งที่ยังอยู่ในสนามจะค้างรอเฟรมที่ไม่มีวันมา แล้วอ่านว่า "เกมแฮงก์" ไม่ใช่ "เพื่อนออกไปแล้ว"
{
  const sc = mkScene('net');
  sc._openMenu();
  sc._menuAct('select');
  ok(sc.opened === 1, "ตัวเองไปหน้าเลือกตัว");
  ok(sc.sent.filter((p) => p.t === 'lobby').length === 1, "และส่งคำสั่งให้อีกฝั่งตามไปด้วย หนึ่งครั้ง");
  ok(!sc.menuEl.cls.has('open'), "ปิดเมนูด้วย");

  // เล่นเครื่องเดียวต้องไม่ส่งอะไรออกไป — ไม่มีใครอยู่ปลายสาย
  const solo = mkScene('solo');
  solo._openMenu();
  solo._menuAct('select');
  ok(solo.opened === 1 && solo.sent.length === 0, "เล่นเครื่องเดียวไม่ส่งแพ็คเก็ตอะไรเลย");
}

// ══ จบแมตช์แล้วพากลับหน้าเลือกตัวเอง — นับเป็นเฟรมของซิม ไม่ใช่เวลาจริง ══════════
//
// นับด้วยเวลาจริงเมื่อไหร่ เครื่อง 60 Hz กับ 120 Hz จะกลับคนละจังหวะ
// ฝั่งที่กลับก่อนหยุดส่งอินพุต อีกฝั่งจึงค้างอยู่หน้าจอจบไปอีกพักโดยไม่มีเหตุผล
{
  const HOLD = +(scene.match(/const MATCH_END_HOLD = (\d+)/)?.[1] ?? 0);
  ok(HOLD > 0, `มีระยะค้างป้ายผู้ชนะจริง (${HOLD} เฟรม)`);

  const mkFight = (versus = 'net') => {
    const sc = mkScene(versus);
    sc.phase = 'fight';
    sc.sim = { frame: 0, match: { on: true, winner: null } };
    sc.matchEndAt = null;
    sc._maybeEndToSelect = ScrambleScene.prototype._maybeEndToSelect;
    return sc;
  };

  // ยังไม่จบ = ไม่ไปไหน ต่อให้เดินนานแค่ไหน
  const live = mkFight();
  for (let i = 0; i < HOLD * 3; i++) { live.sim.frame++; live._maybeEndToSelect(); }
  ok(live.opened === 0, "แมตช์ยังไม่จบก็ไม่พาไปไหน");

  // จบแล้วต้องค้างป้ายไว้ก่อน แล้วค่อยไป — ไม่ใช่ไปทันทีจนอ่านไม่ทันว่าใครชนะ
  const done = mkFight();
  done.sim.match.winner = 0;
  done._maybeEndToSelect();                       // เฟรมที่จบ = เริ่มจับเวลา
  for (let i = 1; i < HOLD; i++) { done.sim.frame++; done._maybeEndToSelect(); }
  ok(done.opened === 0, `ยังค้างป้ายผู้ชนะอยู่ที่เฟรม ${done.sim.frame}`);
  done.sim.frame++; done._maybeEndToSelect();
  ok(done.opened === 1, `ครบ ${HOLD} เฟรมแล้วพาไปหน้าเลือกตัว`);
  ok(done.sent.filter((p) => p.t === 'lobby').length === 1, "และบอกอีกฝั่งให้ตามไปด้วย");

  // ซ้อมกับหุ่น (match.on = false) ต้องไม่โดนพาไปไหนเลย — ไม่มีผู้ชนะให้ประกาศ
  const training = mkFight('solo');
  training.sim.match = { on: false, winner: null };
  for (let i = 0; i < HOLD * 3; i++) { training.sim.frame++; training._maybeEndToSelect(); }
  ok(training.opened === 0, "โหมดซ้อมไม่โดนเด้งออกจากสนาม");

  // อยู่หน้าเลือกตัวอยู่แล้วต้องไม่เปิดซ้ำ ไม่งั้นส่ง 'lobby' วนไม่จบ
  const already = mkFight();
  already.phase = 'select';
  already.sim.match.winner = 0;
  for (let i = 0; i < HOLD * 3; i++) { already.sim.frame++; already._maybeEndToSelect(); }
  ok(already.opened === 0 && already.sent.length === 0, "อยู่หน้าเลือกตัวแล้วไม่ทำอะไรซ้ำ");
}
