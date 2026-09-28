// ทดสอบว่า "หนึ่ง tick เดินซิมกี่เฟรม" และ "ของฝั่งภาพถูกนับอายุทุก tick หรือไม่"
// รัน: node tools/tests/tick_rate.test.mjs   (จากโฟลเดอร์ game)
//
// ทั้งสองข้อในไฟล์นี้เกิดจากบั๊กที่เจอตอนเล่นกับเพื่อนจริง และ **เทสต์ 1233 ข้อเดิมจับไม่ได้เลย**
// เพราะเทสต์ netplay เดิมไล่เดินให้เร็วสุดเพื่อเช็คว่าสองเครื่องตรงกัน
// ซึ่งเป็นคำถามคนละข้อกับ "เดินเร็วเท่าที่ควรไหม" และไม่มีใครเคยถามข้อหลัง
import "./phaser_stub.mjs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
globalThis.location = { search: "" };
globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game } = await import(G + "/core.js");
const { Lockstep, NET_DELAY } = await import(G + "/netplay.js");
const { ScrambleScene } = await import(G + "/ScrambleScene.js");

// ══ เกมวิ่งเร็วสี่เท่าตอนต่อเน็ต ════════════════════════════════════════════════
//
// update() มี accumulator คุมให้ tick มา 60 ครั้ง/วินาทีอยู่แล้ว ไม่ว่าจอจะ 60 หรือ 120 Hz
// ดังนั้น "หนึ่ง tick = หนึ่งเฟรมซิม" คือเงื่อนไขเดียวที่ทำให้เกมวิ่งความเร็วถูก
//
// เดิม tickNet เขียน budget = 4 ตายตัว ด้วยเจตนาว่าเผื่อไล่ตามหลัง
// แต่ lockstep จองอินพุตล่วงหน้า delay เฟรมอยู่แล้วทั้งสองฝั่ง ready() จึงจริงติดกันตลอดเวลา
// = เดิน 4 เฟรมทุก tick = ซิมวิ่ง 240 fps เกิดกับทุกคู่เครื่อง ไม่เกี่ยวกับรีเฟรชเรต

/** สองเครื่องต่อกันด้วยท่อในหน่วยความจำ ใช้ tickNet ตัวจริงของฉาก */
function pair({ lag = 0 } = {}) {
  const qs = [[], []];
  const mk = (seat) => {
    const sc = {
      sim: new Game(), isHost: seat === 0, versus: 'net', events: 0,
      net: new Lockstep((pk) => qs[1 - seat].push({ pk, due: lag }), { seat }),
      _simEvents() { this.events++; },
    };
    sc.tickNet = ScrambleScene.prototype.tickNet;
    sc.tick = ScrambleScene.prototype.tick;
    sc.sharedKeyboard = ScrambleScene.prototype.sharedKeyboard;
    sc.net.primeStart();
    return sc;
  };
  const peers = [mk(0), mk(1)];
  return {
    peers,
    /** ปล่อยแพ็คเก็ตที่ถึงกำหนดเข้าปลายทาง */
    flush() {
      qs.forEach((q, i) => {
        const keep = [];
        for (const e of q) (--e.due < 0 ? peers[i].net.onPacket(e.pk) : keep.push(e));
        q.length = 0; q.push(...keep);
      });
    },
  };
}

// ── เน็ตนิ่ง: หนึ่ง tick ต้องได้หนึ่งเฟรม ไม่ใช่สี่ ──
{
  const { peers, flush } = pair();
  const TICKS = 120;
  for (let t = 0; t < TICKS; t++) { flush(); for (const p of peers) p.tickNet(); }
  for (const [i, p] of peers.entries())
    ok(p.sim.frame === TICKS, `เครื่อง ${i}: ${TICKS} tick ได้ ${p.sim.frame} เฟรม (ต้องได้ ${TICKS})`);
  ok(peers[0].sim.frame === peers[1].sim.frame, "และสองเครื่องอยู่เฟรมเดียวกัน");
}

// ── เน็ตหน่วง: ไม่เร่งทิ้ง และช้าลงตามหน่วงอย่างที่ lockstep ต้องเป็น ──
//
// lockstep เดินเฟรม F ได้ก็ต่อเมื่ออินพุตเฟรม F ของอีกฝั่งมาถึงแล้ว
// อีกฝั่งส่งเฟรม F ตอนมันอยู่เฟรม F - delay แล้วใช้เวลาเดินทาง lag เฟรม
//
// **ถ้า lag มากกว่า delay เกมจะเดินช้ากว่าเวลาจริงโดยหลีกเลี่ยงไม่ได้** ราว delay/(lag+delay)
// ทางแก้คือเพิ่ม delay (แลกกับปุ่มหน่วงขึ้น) ไม่ใช่ปล่อยให้เดินเกินหนึ่งเฟรมต่อ tick
// เร่งเกินหนึ่งเฟรมต่อ tick "แก้" อาการช้าได้จริง แต่แลกด้วยเกมวิ่งเร็วเกินตอนเน็ตดี
// ซึ่งคือบั๊กที่เพิ่งแก้ไป — เร็วเกินอ่านง่ายกว่าช้าเกิน แต่ทั้งคู่คือความเร็วผิด
{
  for (const lag of [1, 3, 6]) {
    const { peers, flush } = pair({ lag });
    const TICKS = 150;
    for (let t = 0; t < TICKS; t++) { flush(); for (const p of peers) p.tickNet(); }
    const f = peers[0].sim.frame;
    const floor = Math.floor(TICKS * NET_DELAY / (lag + NET_DELAY));
    ok(f <= TICKS, `หน่วง ${lag}: เดิน ${f}/${TICKS} เฟรม — ไม่เกินความเร็วจริง`);
    ok(f >= floor, `หน่วง ${lag}: และไม่ช้ากว่าที่ lockstep ควรทำได้ (${f} >= ${floor})`);
    ok(peers[0].sim.frame === peers[1].sim.frame, `หน่วง ${lag}: สองเครื่องยังอยู่เฟรมเดียวกัน`);
  }
}

// ── ตามหลังจริงถึงเร่งได้ และเร่งแบบมีเพดาน ──
//
// เคสจริง: เน็ตกระตุกแล้วแพ็คเก็ตมาเป็นก้อนทีเดียว ถ้าไม่เร่งเลยจะตามไม่ทันตลอดกาล
// แต่เร่งไม่จำกัดก็จะกระโดดเป็นก้อนให้เห็นเป็นภาพสะดุด
{
  const { peers, flush } = pair();
  // เดินปกติไปก่อนสิบ tick แล้วหยุดปล่อยของให้เครื่อง 0 ทำให้มันตามหลัง
  for (let t = 0; t < 10; t++) { flush(); for (const p of peers) p.tickNet(); }
  const at = peers[0].sim.frame;
  // อัดอินพุตของอีกฝั่งเข้าคิวเครื่อง 0 ล่วงหน้าเยอะ ๆ (เลียนแบบแพ็คเก็ตมาเป็นก้อน)
  for (let f = at; f < at + 40; f++) peers[0].net.onPacket({ t: 'i', s: 1, f, v: 0 });
  peers[0].tickNet();
  const jump = peers[0].sim.frame - at;
  ok(jump > 1, `ตามหลังแล้วเร่งได้จริง (เดิน ${jump} เฟรมใน tick เดียว)`);
  ok(jump <= 4, `แต่มีเพดาน ไม่กระโดดเป็นก้อน (${jump} เฟรม)`);
}

// ══ ของฝั่งภาพต้องถูกนับอายุทุก tick ทั้งสองโหมด ═════════════════════════════════
//
// บั๊กเดิม: tick() ขึ้นต้นด้วย `if (this.net) { this.tickNet(); return; }`
// ทุกอย่างใต้มันจึงไม่ทำงานตอนต่อเน็ต รวมถึงตัวนับอายุอนุภาค
// ขณะที่รอยฟาดถูกยิงจาก draw() (slashFor) ซึ่งทำงานอยู่
// = เอฟเฟคกองค้างบนจอ ยิ่งตียิ่งสะสม ซึ่งเป็นอาการที่เจอจริง
{
  const mkScene = (net) => {
    const sc = { sim: new Game(), versus: net ? 'net' : 'solo', net: net ? {} : null,
      aged: 0, netTicks: 0, events: 0 };
    sc.tick = ScrambleScene.prototype.tick;
    sc.sharedKeyboard = ScrambleScene.prototype.sharedKeyboard;
    sc.tickNet = function () { this.netTicks++; };
    sc._ageFx = function () { this.aged++; };
    sc._simEvents = function () { this.events++; };
    return sc;
  };
  const online = mkScene(true);
  for (let i = 0; i < 5; i++) online.tick();
  ok(online.netTicks === 5, "ต่อเน็ต: เดินซิมผ่าน tickNet");
  ok(online.aged === 5, `ต่อเน็ต: นับอายุเอฟเฟคทุก tick (${online.aged}/5) — ข้อที่บั๊กเดิมทำไม่ได้`);

  const offline = mkScene(false);
  for (let i = 0; i < 5; i++) offline.tick();
  ok(offline.netTicks === 0 && offline.aged === 5, "เล่นคนเดียว: ยังนับอายุทุก tick เหมือนเดิม");
  ok(offline.events === 5, "เล่นคนเดียว: แปลอีเวนต์ทุก tick เหมือนเดิม");
}

// ── อนุภาคหมดอายุแล้วคืนเข้าพูลจริง ไม่ค้าง ──
{
  const sc = { _fxPool: [], _fxLive: [], sparks: [], popups: [], comboFade: 0 };
  sc._stepFx = ScrambleScene.prototype._stepFx;
  sc._ageFx = ScrambleScene.prototype._ageFx;
  const img = () => ({ x: 0, y: 0, rotation: 0, setVisible() { return this; }, setActive() { return this; },
    setScale() { return this; }, setAlpha() { return this; } });
  for (let i = 0; i < 6; i++)
    sc._fxLive.push({ img: img(), life: 3, max: 3, a0: 1, s0: 1, vx: 0, vy: 0, g: 0, spin: 0, grow: 0, drag: 1 });
  for (let i = 0; i < 3; i++) sc._ageFx();
  ok(sc._fxLive.length === 0, `นับอายุครบแล้วไม่มีอนุภาคค้าง (เหลือ ${sc._fxLive.length})`);
  ok(sc._fxPool.length === 6, `และคืนเข้าพูลครบทุกตัว (${sc._fxPool.length}/6)`);
}

// ── ต่อเน็ตแล้วอีเวนต์ของทุกเฟรมที่เดินต้องถูกแปล ไม่ใช่แค่เฟรมสุดท้าย ──
//
// sim.events ถูกล้างทุกครั้งที่ step() ถ้าเรียก _simEvents ท้าย tick
// tick ที่เดินสามเฟรมจะเหลืออีเวนต์เฟรมสุดท้ายเฟรมเดียว ป้ายเลขดาเมจจะหายไปสองในสาม
{
  const { peers, flush } = pair();
  for (let t = 0; t < 10; t++) { flush(); for (const p of peers) p.tickNet(); }
  const at = peers[0].sim.frame, ev = peers[0].events;
  for (let f = at; f < at + 40; f++) peers[0].net.onPacket({ t: 'i', s: 1, f, v: 0 });
  peers[0].tickNet();
  const stepped = peers[0].sim.frame - at;
  ok(peers[0].events - ev === stepped,
    `tick ที่เดิน ${stepped} เฟรม แปลอีเวนต์ ${peers[0].events - ev} ครั้ง (ต้องเท่ากัน)`);
}

ok(NET_DELAY === 3, `ระยะจองล่วงหน้ายังเป็น ${NET_DELAY} เฟรมตามที่คิดเลขไว้`);

// ── ตัววัดความเร็วต้องเปิดได้ตอนต่อเน็ต ──
//
// อาการ "เกมวิ่งเร็วเกิน" มองด้วยตาแล้วเถียงกันได้ แต่ดูเลขแล้วจบ
// ถ้าเปิดดูตอนต่อเน็ตไม่ได้ ก็ไม่มีทางยืนยันได้เลยว่าแก้แล้วจริงหรือยัง
{
  ok(ScrambleScene.VIEW_ONLY.has('KeyF'), "ปุ่มวัดความเร็ว (F) กดได้ตอนต่อเน็ต");
  ok(ScrambleScene.VIEW_ONLY.has('KeyH'), "ปุ่มโชว์กล่องชน (H) ยังกดได้เหมือนเดิม");
  ok(ScrambleScene.VIEW_ONLY.has('KeyZ'), "ปุ่มซูม (Z) ยังกดได้เหมือนเดิม");
  // ปุ่มที่แตะ sim ต้องกดไม่ได้ ไม่งั้นอีกฝั่งไม่รู้ด้วยแล้วภาพหลุดกันถาวร
  for (const k of ['KeyR', 'KeyN', 'KeyO', 'KeyC', 'KeyV', 'KeyM', 'Digit0', 'Digit4'])
    ok(!ScrambleScene.VIEW_ONLY.has(k), `${k} ยังกดไม่ได้ตอนต่อเน็ต (แตะ sim)`);
  // KeyP/Escape เปิดเมนูหยุดพัก ซึ่งต้องกดได้ตอนต่อเน็ต (ไว้ออกจากห้อง)
  // การหยุด sim ถูกกั้นแยกข้างใน _openMenu ไม่ได้กั้นที่ระดับปุ่ม
  ok(ScrambleScene.VIEW_ONLY.has('KeyP') && ScrambleScene.VIEW_ONLY.has('Escape'),
    "ปุ่มเมนูหยุดพักกดได้ตอนต่อเน็ต");
}
