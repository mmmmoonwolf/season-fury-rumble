// ทดสอบว่า "กดแล้วไม่มีอะไรเกิดขึ้น" เป็นไปไม่ได้อีกแล้ว
// รัน: node tools/tests/net_timeout.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: PeerJS ไม่มี timeout ให้เอง ถ้าเซิร์ฟเวอร์ signaling ฟรีของเขาช้าหรือค้าง
// callback `open` จะไม่ยิงเลยและไม่มี error ด้วย คนเล่นเห็น "กำลังเชื่อมต่อ..." ค้างตลอดกาล
// ซึ่งแยกไม่ออกจากเกมพัง — อาการนี้เคยเกิดจริงแล้ว
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

/** Peer ปลอมที่ "ไม่ตอบอะไรเลย" — จำลองเซิร์ฟเวอร์ที่ค้าง ไม่ใช่เซิร์ฟเวอร์ที่ error */
class DeadPeer {
  constructor() { this.handlers = {}; }
  on(ev, fn) { this.handlers[ev] = fn; }
  connect() { return { on() {}, close() {} }; }
  destroy() { this.destroyed = true; }
}

globalThis.window = { Peer: DeadPeer };

// เร่งเวลาให้เทสต์ไม่ต้องรอจริง 20 วินาที — เก็บ timer ไว้ยิงเอง
const timers = [];
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => { const id = { fn, ms }; timers.push(id); return id; };
globalThis.clearTimeout = (id) => { const i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); };
const fireAll = () => { const q = timers.splice(0); for (const t of q) t.fn(); };

const S = new URL("../../src/net/session.js", import.meta.url).href;
const { hostRoom, joinRoom, cancelSession } = await import(S);

// ── เข้าร่วมห้องแล้วเซิร์ฟเวอร์เงียบ ต้องได้ error ไม่ใช่ค้าง ──
{
  let err = null, connected = false;
  joinRoom("ABCDE", { onConnected: () => { connected = true; }, onError: (m) => { err = m; } });
  ok(err === null && !connected, "ตอนแรกยังไม่ตัดสินอะไร กำลังรออยู่");
  ok(timers.length > 0, "ตั้งนาฬิกาจับเวลาไว้จริง");
  const ms = timers[0].ms;
  ok(ms >= 10000 && ms <= 30000, `รอนานพอสำหรับเน็ตช้า แต่ไม่นานจนคนเล่นเลิกสนใจ (${ms} ms)`);
  fireAll();
  ok(err !== null, "หมดเวลาแล้วได้ข้อความผิดพลาดจริง");
  ok(/20 วินาที/.test(err), `ข้อความบอกว่ารอไปนานแค่ไหน — "${err}"`);
  ok(/PeerJS/.test(err), "และบอกด้วยว่าเป็นเซิร์ฟเวอร์ของใคร คนเล่นจะได้ไม่คิดว่าเกมพัง");
  cancelSession();
}

// ── สร้างห้องแล้วเซิร์ฟเวอร์เงียบ ก็ต้องได้ error เหมือนกัน ──
{
  let err = null, code = null;
  hostRoom({ onCodeReady: (c) => { code = c; }, onError: (m) => { err = m; } });
  ok(code === null && err === null, "ตอนแรกยังไม่ได้รหัสห้องและยังไม่ error");
  fireAll();
  ok(err !== null, "หมดเวลาแล้วฝั่งสร้างห้องก็ได้ข้อความผิดพลาด");
  cancelSession();
}

// ── ต่อติดก่อนหมดเวลา ต้องไม่โดน error ตามมาทีหลัง ──
//
// ข้อนี้สำคัญกว่าที่คิด: ถ้าลืมยกเลิกนาฬิกา คนที่ต่อติดแล้วกำลังเล่นอยู่
// จะโดนข้อความ "เชื่อมต่อไม่ได้" เด้งใส่กลางเกมตอนครบ 20 วินาทีพอดี
{
  class SlowPeer extends DeadPeer {
    connect() {
      const h = {};
      this._conn = { on: (ev, fn) => { h[ev] = fn; }, close() {}, send() {} };
      realSetTimeout(() => {}, 0);
      queueMicrotask(() => h.open?.());
      return this._conn;
    }
  }
  globalThis.window = { Peer: SlowPeer };
  let err = null, connected = false;
  joinRoom("ABCDE", { onConnected: () => { connected = true; }, onError: (m) => { err = m; } });
  const peer = (await import(S)).getSession().peer;
  peer.handlers.open?.();                       // เซิร์ฟเวอร์ตอบ แล้วต่อหาเจ้าของห้องติดทันที
  await new Promise((r) => realSetTimeout(r, 0));
  ok(connected, "ต่อติดแล้ว");
  ok(timers.length === 0, "นาฬิกาถูกยกเลิกทิ้งแล้ว ไม่มีระเบิดเวลาค้างไว้");
  fireAll();
  ok(err === null, "ต่อให้เวลาผ่านไปเท่าไหร่ก็ไม่มี error เด้งใส่คนที่กำลังเล่นอยู่");
  cancelSession();
}
