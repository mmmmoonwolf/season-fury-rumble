// ทดสอบ "กดเข้าเกมเลย" — เข้าห้องโดยไม่ต้องกรอกรหัส
// รัน: node tools/tests/quick_match.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: เกมนี้ไม่มีเซิร์ฟเวอร์ของตัวเอง จึงไม่มีรายชื่อห้องให้ถาม (ดู quickCodes)
// การจับคู่ทั้งหมดจึงเป็น "ไล่ลองรหัสที่ตกลงกันไว้ในโค้ด" ซึ่งมีเคสชิงกันที่ต้องคิดให้ครบ
// และเคสที่พังแล้วอ่านไม่ออกเลยจากฝั่งคนเล่น: **สองคนที่กดพร้อมกันไปนั่งรอกันคนละห้อง**
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

// ── PeerJS ปลอม: พอให้ session.js เดินได้จริงทั้งเส้น ทุกอย่าง async หนึ่งคิวเหมือนของจริง ──
const registry = new Map();
let queue = [];
const soon = (fn) => queue.push(fn);
async function flush(rounds = 400) {
  for (let i = 0; i < rounds && queue.length; i++) {
    const now = queue; queue = [];
    for (const f of now) f();
    await null;
  }
}
class Emitter {
  constructor() { this._h = {}; }
  on(k, fn) { (this._h[k] ??= []).push(fn); return this; }
  emit(k, ...a) { for (const f of this._h[k] ?? []) f(...a); }
}
class Conn extends Emitter {
  constructor() { super(); this.open = false; }
  send(pk) { if (this.open) soon(() => this.other.emit("data", JSON.parse(JSON.stringify(pk)))); }
  close() {
    if (!this.open && !this.other?.open) return;
    this.open = false; if (this.other) this.other.open = false;
    soon(() => { this.emit("close"); this.other?.emit("close"); });
  }
}
class FakePeer extends Emitter {
  constructor(id) {
    super();
    this.id = id ?? "rnd" + (FakePeer.n = (FakePeer.n ?? 0) + 1);
    // **การจองไอดีต้องเกิดช้ากว่า new หนึ่งรอบ** เพราะของจริงมันเกิดที่เซิร์ฟเวอร์
    // ถ้าเขียนให้จองทันทีแบบ synchronous เคส "สองคนจองรหัสเดียวกันพร้อมกัน"
    // จะไม่มีทางเกิดขึ้นในเทสต์เลย (คนที่สองจะเห็นว่ามีห้องแล้วเสมอ แล้วเข้าไปเป็นแขกตามปกติ)
    // ซึ่งทำให้ทางเดิน onTaken ทั้งเส้นไม่เคยถูกทดสอบ — เคยหลงมาแล้วจริง ตอนแกล้งทำพังแล้วไม่แดง
    soon(() => {
      if (this.dead) return;
      // ไอดีซ้ำ = มีคนจองไปแล้ว — ของจริงตอบเป็น error ชนิดนี้ และ **ไม่ได้ถือทะเบียนนั้น**
      if (registry.has(this.id)) { this.lost = true; this.emit("error", { type: "unavailable-id" }); return; }
      registry.set(this.id, this);
      this.emit("open", this.id);
    });
  }
  connect(target) {
    const a = new Conn();
    soon(() => {
      const t = registry.get(target);
      if (!t || t.dead) { this.emit("error", { type: "peer-unavailable" }); return; }
      const b = new Conn();
      a.other = b; b.other = a;
      t.emit("connection", b);
      soon(() => { a.open = true; b.open = true; a.emit("open"); b.emit("open"); });
    });
    return a;
  }
  // peer ที่จองไอดีไม่สำเร็จ destroy แล้วต้องไม่ไปลบทะเบียนของคนที่จองได้
  destroy() { this.dead = true; if (!this.lost && registry.get(this.id) === this) registry.delete(this.id); }
}
globalThis.window = { Peer: FakePeer };

const SRC = new URL("../../src/net/session.js", import.meta.url).href;
/** หนึ่ง "เครื่อง" = หนึ่งอินสแตนซ์ของโมดูล (ของจริงเป็น singleton ต่อหนึ่งหน้าเว็บ) */
let nth = 0;
const machine = () => import(SRC + "?pc=" + nth++);

const M0 = await machine();

// ══ รหัสห้องสาธารณะต้องเป็นรหัสห้องที่ถูกกติกาเดิมทุกข้อ ═══════════════════════
//
// ไม่ใช่เรื่องสวยงาม — ถ้ามันไม่ผ่าน normalizeRoomCode คนเล่นจะพิมพ์ตามไม่ได้เลย
// ทั้งที่หน้าจอโชว์รหัสนั้นให้เขาเอาไปบอกเพื่อน (ดู onHosting ใน index.html)
{
  for (const seats of [2, 4]) {
    const codes = M0.quickCodes(seats);
    ok(codes.length >= 2, `ห้อง ${seats} คนมีช่องสาธารณะ ${codes.length} ช่อง`);
    ok(codes.every((c) => c.length === M0.ROOM_CODE_LEN),
      `ยาว ${M0.ROOM_CODE_LEN} ตัวเท่ารหัสปกติทุกช่อง`);
    ok(codes.every((c) => M0.normalizeRoomCode(c) === c),
      `ผ่านตัวล้างรหัสครบทุกช่อง คนเล่นพิมพ์ตามได้ (${codes[0]})`);
    ok(new Set(codes).size === codes.length, "ไม่มีช่องไหนรหัสซ้ำกัน");
  }
  const a = M0.quickCodes(2), b = M0.quickCodes(4);
  ok(!a.some((c) => b.includes(c)),
    `ห้อง 1v1 กับ 2v2 ใช้รหัสคนละชุด (${a[0]} / ${b[0]}) — ไม่งั้นคนหา 1v1 จะไปโผล่ในห้องสี่คน`);
  ok(M0.quickCodes(2).join() === M0.quickCodes(2).join(), "เรียกกี่ครั้งก็ได้ชุดเดิม ลำดับเดิม");
}

/** กด "เข้าเกมเลย" บนเครื่องใหม่หนึ่งเครื่อง แล้วคืนผลที่เกิดขึ้น */
async function press(seats, rounds = 400) {
  const M = await machine();
  const r = { M, status: [], hosting: null, joined: false, seated: null, err: null };
  M.quickMatch({
    seats,
    onStatus: (s) => r.status.push(s),
    onHosting: (code) => { r.hosting = code; },
    onConnected: (here, total) => { r.joined = true; r.seated = [here, total]; },
    onError: (m) => { r.err = m; },
  });
  await flush(rounds);
  return r;
}

// ══ คนแรกกด: ไม่มีใครรออยู่ จึงเปิดห้องสาธารณะช่องแรกเองแล้วรอ ═══════════════
{
  registry.clear(); queue = [];
  const first = await press(2);
  ok(first.hosting === M0.quickCodes(2)[0],
    `คนแรกเปิดห้องช่องแรกเองแล้วรอ (${first.hosting})`);
  ok(first.M.getSession().mode === "host" && first.M.getSession().seat === 0,
    "เป็นเจ้าของห้อง นั่งที่ 0");
  ok(!first.joined, "ยังไม่เข้าเกม เพราะยังไม่มีคู่");
  ok(first.status.some((s) => /หาห้อง/.test(s)), "บอกคนเล่นว่ากำลังหาห้องอยู่");

  // ── คนที่สองกด: ต้องเจอคนแรก ไม่ใช่ไปเปิดห้องใหม่ ──
  const second = await press(2);
  ok(second.joined, "คนที่สองได้ที่นั่งโดยไม่ต้องกรอกรหัสอะไรเลย");
  ok(second.hosting === null, "และไม่ได้ไปเปิดห้องของตัวเอง");
  ok(second.M.getSession().mode === "guest" && second.M.getSession().seat === 1,
    `เป็นแขก นั่งที่ ${second.M.getSession().seat}`);
  ok(second.M.getSession().roomCode === first.hosting,
    `อยู่ห้องเดียวกับคนแรกจริง (${second.M.getSession().roomCode})`);
  ok(first.joined && first.seated?.[0] === 2,
    `คนแรกรู้ว่าครบแล้ว (${first.seated?.join("/")})`);
}

// ══ ห้องช่องแรกเต็ม: คนที่สามต้องไปช่องถัดไป ไม่ใช่ขึ้นว่าเต็ม ════════════════
//
// (ต่อจากก้อนบน — ช่องแรกมีสองคนเต็มแล้ว)
{
  const third = await press(2);
  ok(third.hosting === M0.quickCodes(2)[1],
    `ช่องแรกเต็ม จึงไปเปิดช่องที่สองแทน (${third.hosting})`);
  ok(third.err === null, "และไม่ได้ฟ้องว่าเข้าไม่ได้");
  const fourth = await press(2);
  ok(fourth.joined && fourth.M.getSession().roomCode === third.hosting,
    `คนที่สี่ไปเจอคนที่สามที่ช่องสอง (${fourth.M.getSession().roomCode})`);
}

// ══ เต็มทุกช่อง: ต้องบอกตรง ๆ และบอกทางออก ไม่ใช่ค้างเงียบ ═══════════════════
{
  registry.clear(); queue = [];
  const codes = M0.quickCodes(2);
  // เปิดห้องเต็มไว้ทุกช่อง (สองคนต่อช่อง)
  for (let i = 0; i < codes.length; i++) { await press(2); await press(2); }
  const late = await press(2, 900);
  ok(late.err !== null, "เต็มทุกช่องแล้วบอกตรง ๆ ไม่ปล่อยให้ค้าง");
  ok(/ห้องส่วนตัว/.test(late.err ?? ""), `และบอกทางออกที่ยังใช้ได้ — "${(late.err ?? "").slice(0, 30)}..."`);
  ok(!late.joined, "และไม่ได้เด้งเข้าเกมมั่ว ๆ");
}

// ══ กดพร้อมกันเป๊ะ: คนแพ้ต้องไปเป็นแขกของ **ช่องเดิม** ═════════════════════
//
// นี่คือเคสที่พังแล้วอ่านไม่ออกเลย: ทั้งคู่เห็นช่องแรกว่างเหมือนกัน แล้วชิงกันเปิด
// คนแพ้ได้ unavailable-id กลับมา ซึ่ง **แปลว่าเจอคนแล้ว** ไม่ใช่ความผิดพลาด
// ถ้าคนแพ้ย้ายไปช่องถัดไป สองคนที่กดหากันอยู่พอดีจะนั่งรอกันคนละห้องตลอดกาล
{
  registry.clear(); queue = [];
  const a = await machine(), b = await machine();
  const res = [{ host: null, joined: false }, { host: null, joined: false }];
  [a, b].forEach((M, i) => M.quickMatch({
    seats: 2,
    onHosting: (c) => { res[i].host = c; },
    onConnected: () => { res[i].joined = true; },
    onError: (m) => { res[i].err = m; },
  }));
  await flush(900);
  const hosts = [a, b].map((M) => M.getSession()).filter((s) => s.mode === "host");
  const guests = [a, b].map((M) => M.getSession()).filter((s) => s.mode === "guest");
  ok(hosts.length === 1 && guests.length === 1,
    `กดพร้อมกันแล้วได้เจ้าของห้องหนึ่งคน แขกหนึ่งคน (เจ้าของ ${hosts.length} แขก ${guests.length})`);
  ok(hosts[0]?.roomCode === guests[0]?.roomCode,
    `และอยู่ห้องเดียวกัน ไม่ใช่แยกไปคนละช่อง (${hosts[0]?.roomCode} / ${guests[0]?.roomCode})`);
  ok(hosts[0]?.roomCode === M0.quickCodes(2)[0], "ซึ่งคือช่องแรก ไม่ได้เขยิบไปช่องอื่นเปล่า ๆ");
  ok(res.every((r) => r.joined), "ทั้งคู่เข้าเกมได้");
}

// ══ ห้องสี่คน: เริ่มเฉพาะตอนครบสี่ที่นั่ง ═══════════════════════════════════
//
// เริ่มตอนยังไม่ครบ = ที่นั่งว่างไม่มีใครส่งอินพุต แล้ว lockstep ค้างรอตลอดกาล
// ซึ่งบนจออ่านว่า "เกมแฮงก์" ไม่ใช่ "ยังรอเพื่ออยู่"
{
  registry.clear(); queue = [];
  const ppl = [];
  for (let i = 0; i < 4; i++) {
    ppl.push(await press(4));
    const host = ppl[0];
    if (i < 3) ok(!host.joined || (host.seated?.[0] ?? 0) < 4,
      `มา ${i + 1}/4 คน ยังไม่เริ่ม (${host.seated?.join("/") ?? "ยังไม่มีใคร"})`);
  }
  ok(ppl[0].hosting === M0.quickCodes(4)[0], `คนแรกเปิดห้องสี่คนช่องแรก (${ppl[0].hosting})`);
  ok(ppl[0].seated?.join("/") === "4/4", `ครบสี่แล้วค่อยเริ่ม (${ppl[0].seated?.join("/")})`);
  ok(ppl.every((p) => p.joined), "ทั้งสี่เครื่องได้เข้าเกม");
  const seats = ppl.map((p) => p.M.getSession().seat).sort().join();
  ok(seats === "0,1,2,3", `ที่นั่งแจกครบไม่ซ้ำกัน (${seats})`);
  ok(ppl.every((p) => p.M.getSession().seats === 4), "ทุกเครื่องรู้ว่าห้องนี้สี่คน");
}

// ══ กดย้อนกลับกลางทางต้องหยุดจริง ไม่ใช่เด้งเข้าเกมทีหลัง ═══════════════════
//
// การไล่หาห้องเป็นงานที่เดินอยู่เบื้องหลังหลายจังหวะ ไม่หยุดให้สนิทแล้วคนเล่นจะเจอ
// หน้าจอเด้งเข้าเกมเองหลังกดย้อนกลับไปแล้ว ซึ่งแยกไม่ออกจากเกมพัง
{
  registry.clear(); queue = [];
  await press(2);                      // มีคนเปิดห้องรออยู่แล้วหนึ่งคน
  const M = await machine();
  let joined = false, hosting = null;
  M.quickMatch({ seats: 2, onConnected: () => { joined = true; }, onHosting: (c) => { hosting = c; } });
  M.cancelSession();                   // กดย้อนกลับทันที
  await flush(900);
  ok(!joined, "ยกเลิกแล้วไม่เด้งเข้าเกม");
  ok(hosting === null, "และไม่ไปเปิดห้องค้างไว้");
  ok(M.getSession().mode === "offline", `สถานะกลับเป็นออฟไลน์ (${M.getSession().mode})`);
}

// ══ ล็อบบี้ต้องต่อสายปุ่มไว้จริง ไม่ใช่มีแต่ฟังก์ชัน ═══════════════════════════
{
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url).pathname, "utf8");
  ok(/id="btn-quick4"/.test(html) && /id="btn-quick2"/.test(html), "มีปุ่มเข้าเกมเลยทั้งสองแบบ");
  ok(/quickMatch/.test(html), "ล็อบบี้เรียก quickMatch จริง");
  ok(/for \(const id of \["btn-quick2", "btn-quick4"\]\)/.test(html), "ปุ่มสองปุ่มผูกกับฟังก์ชันเดียวกัน");
  const quick = html.slice(html.indexOf("const openQuick ="), html.indexOf('$("btn-private")'));
  ok(/setTimeout\(startGame/.test(quick), "ครบที่นั่งแล้วเข้าเกมเอง ไม่ต้องกดอะไรอีก");
  ok(/cancelSession\(\)/.test(quick), "พังแล้วตัดห้องทิ้งก่อนกลับเมนู ไม่ปล่อยค้าง");
  ok(/btn-quick-back"\)\.addEventListener\("click", \(\) => \{ cancelSession\(\)/.test(html),
    "ปุ่มย้อนกลับหยุดการไล่หาห้องด้วย");
  // ทางเดิม (รหัสห้อง) ต้องยังอยู่ครบ — เล่นกับเพื่อนที่เจาะจงคนยังต้องทำได้
  ok(/id="btn-host"/.test(html) && /id="btn-host4"/.test(html) && /id="btn-join"/.test(html),
    "ทางห้องส่วนตัวด้วยรหัสยังอยู่ครบ");
  ok(/id="btn-private"/.test(html), "และเข้าถึงได้จากเมนูแรก");
}
