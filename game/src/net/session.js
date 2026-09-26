/**
 * โมดูลกลางเก็บสถานะ "ห้องออนไลน์" (WebRTC ผ่าน PeerJS cloud signaling ฟรี — ไม่มี backend ของเราเอง)
 * แยกออกมาต่างหากเพราะทั้งหน้าล็อบบี้ (DOM ล้วนใน index.html) และ MainGameScene (Phaser)
 * ต้องอ่าน/เขียนสถานะเดียวกันโดยไม่ผูกกันตรงๆ — ES module เป็น singleton ต่อหน้าเว็บอยู่แล้ว
 * จึงใช้ตัวแปรโมดูลนี้เป็น "แหล่งความจริงเดียว" แทนการยัดใส่ Phaser registry
 *
 * ใช้งานยังไง:
 *  - index.html (ล็อบบี้) เรียก hostRoom() / joinRoom() ตอนผู้เล่นกดปุ่ม รอ callback ตัดสินว่าเชื่อมสำเร็จ
 *    ก่อนค่อยซ่อนล็อบบี้แล้วสร้าง Phaser.Game
 *  - MainGameScene.create() เรียก getSession() เพื่ออ่าน mode ปัจจุบัน แล้วเซ็ต session.onData/onClose/onError
 *    ของตัวเอง (ทับของล็อบบี้ได้เลย เพราะตอนนั้นหน้าที่ของล็อบบี้จบแล้ว)
 *
 * ข้อจำกัดที่ตั้งใจไว้ (MVP รอบนี้ — ดู PR):
 *  - ไม่มี TURN server เพิ่มจากที่ PeerJS cloud ให้ฟรี → เน็ตที่จำกัด WebRTC/UDP จัดๆ (บางออฟฟิศ) อาจต่อไม่ติด
 *  - ไม่มี reconnect กลางแมตช์ — หลุดแล้วต้องกลับไปเริ่มที่ล็อบบี้ใหม่
 *  - รองรับ 2 คนต่อห้องเท่านั้น (host ปฏิเสธคนที่ 3 ที่พยายามต่อเข้ามา)
 */

const ROOM_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ตัด 0/O/1/I ออก กันอ่าน/พิมพ์ผิด
const ROOM_CODE_LEN = 5;
const PEER_ID_PREFIX = "sfr-";
const HOST_ID_RETRY_MAX = 5; // ชนไอดีซ้ำ (unavailable-id) — สุ่มรหัสใหม่แล้วลองอีกได้กี่ครั้ง

/** รอเซิร์ฟเวอร์ signaling ตอบกี่มิลลิวินาทีก่อนยอมแพ้
 *
 *  **จำเป็น เพราะ PeerJS ไม่มี timeout ให้เอง** ถ้าเซิร์ฟเวอร์ฟรีของเขาช้าหรือค้าง
 *  (มีรายงานยาวเป็นปี รวมถึงเคสที่ WebSocket ใช้เวลา 6 นาทีกว่าจะตอบ)
 *  `peer.on("open")` จะไม่ยิงเลย และไม่มี error ด้วย
 *  คนเล่นเห็นแค่ "กำลังเชื่อมต่อ..." ค้างอยู่อย่างนั้นตลอดกาล ซึ่งแยกไม่ออกจากเกมพัง
 *
 *  20 วินาทีเผื่อเน็ตช้าไว้เยอะแล้ว ต่อติดจริงใช้เวลาระดับ 1-3 วินาที */
const SIGNAL_TIMEOUT_MS = 20000;

/** สถานะห้องปัจจุบัน — instance เดียวต่อหน้าเว็บ */
const session = {
  mode: "offline", // "offline" | "host" | "guest"
  peer: null, // instance ของ Peer (PeerJS) — null ถ้ายังไม่เปิดห้อง/ยังไม่เข้าร่วม
  conn: null, // DataConnection ที่เชื่อมกับอีกฝั่ง
  roomCode: null, // รหัสห้อง 5 ตัวอักษร
  // ฉากเข้ามาเซ็ต 3 ตัวนี้เองตอน create() (ตอนเปิดห้อง/เข้าร่วมยังไม่มี scene ให้ผูก)
  onClose: null,
  onError: null,

  /* แพ็คเก็ตที่มาถึงก่อนฉากจะพร้อมรับ ต้องเก็บไว้ ห้ามทิ้ง
   *
   * สองเครื่องต่อห้องติดพร้อมกัน แต่ "ฉากพร้อมเล่น" ไม่พร้อมกัน: Phaser ต้องโหลดภาพทั้งหมดก่อน
   * ซึ่งกินเวลาไม่เท่ากันในแต่ละเครื่อง/แต่ละความเร็วเน็ต เครื่องที่เสร็จก่อนจะเริ่มยิงอินพุต
   * ตั้งแต่เฟรม 0 ไปเลย ถ้าอีกฝั่งทิ้งช่วงนั้นไป = ขาดอินพุตของเฟรมต้น ๆ ไปถาวร
   * lockstep จะค้างรอเฟรมนั้นตลอดกาล ทั้งสองเครื่องขยับไม่ได้เลย และไม่มีอะไรฟ้องด้วย
   *
   * เพดานกันหน่วยความจำบวม: ถ้าเกินนี้แปลว่าอีกฝั่งไม่มาแล้วจริง ๆ เกมนั้นตายไปแล้ว
   * เก็บต่อไปก็ไม่ได้ช่วยอะไร */
  _pending: [],
  _onData: null,
  get onData() { return this._onData; },
  set onData(fn) {
    this._onData = fn;
    if (!fn || this._pending.length === 0) return;
    const queued = this._pending;
    this._pending = [];
    for (const p of queued) fn(p);   // ต้องส่งตามลำดับเดิม แพ็คเก็ตตั้งต้น (ตัวละคร/ค่าปรับจูน) มาก่อนอินพุตเสมอ
  },
};

/** จำนวนแพ็คเก็ตสูงสุดที่ยอมเก็บรอฉาก — 60 เฟรม/วินาที คูณ 30 วินาที เผื่อเครื่องช้าโหลดนาน */
const PENDING_MAX = 1800;

export function getSession() {
  return session;
}

function randomRoomCode() {
  let s = "";
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return s;
}

/**
 * ผูก listener กลางของ DataConnection ไว้ครั้งเดียวตอนต่อสำเร็จ
 * ทำแบบนี้เพื่อให้ session.onData/onClose/onError ที่ผู้เรียกคนทีหลัง (MainGameScene) มาเซ็ตทับ
 * ทำงานได้ทันทีโดยไม่ต้อง re-register listener ของ PeerJS ใหม่
 */
function wireConnection(conn) {
  session.conn = conn;
  conn.on("data", (packet) => {
    if (session._onData) session._onData(packet);
    else if (session._pending.length < PENDING_MAX) session._pending.push(packet);
  });
  conn.on("close", () => session.onClose?.());
  conn.on("error", (err) => session.onError?.(err));
}

/**
 * ส่งแพ็คเก็ต (plain object — PeerJS serialize ให้เอง) ไปอีกฝั่ง
 * เงียบๆ ถ้ายังไม่ต่อ/หลุดไปแล้ว ผู้เรียกไม่ต้องเช็ค conn เอง — เรียกได้ทุกเฟรมโดยไม่ throw
 */
export function sendNetPacket(packet) {
  if (session.conn && session.conn.open) {
    try {
      session.conn.send(packet);
    } catch (_e) {
      // data channel อาจหลุดกลางอากาศระหว่างส่ง — ปล่อยให้ event "close"/"error" ของ conn แจ้งเตือนแทน
    }
  }
}

const TIMEOUT_MSG = "เซิร์ฟเวอร์จับคู่ไม่ตอบใน 20 วินาที — ลองใหม่อีกครั้ง "
  + "(ใช้เซิร์ฟเวอร์ฟรีของ PeerJS ซึ่งล่มเป็นพัก ๆ)";

function describePeerError(err) {
  const type = err?.type ?? "unknown";
  if (type === "peer-unavailable") return "ไม่พบห้องนี้ — เช็ครหัสอีกครั้ง";
  if (["network", "server-error", "socket-error", "socket-closed"].includes(type)) {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — เช็คอินเทอร์เน็ต (วง wifi บางที่บล็อก WebRTC)";
  }
  return `เชื่อมต่อผิดพลาด (${type})`;
}

/**
 * เป็นเจ้าของห้อง — สุ่มรหัส 5 ตัวอักษร แล้วเปิด Peer ด้วยไอดี "sfr-XXXXX"
 * ชนไอดีซ้ำ (unavailable-id — โอกาสน้อยมากแต่เป็นไปได้ถ้ามีคนอื่นสุ่มโดนพอดี) จะสุ่มรหัสใหม่แล้วลองอีก
 * รับเฉพาะผู้เข้าร่วมคนแรกที่ต่อเข้ามา (เกม 1v1 — ปฏิเสธคนที่ 3)
 * @param {{onCodeReady?:(code:string)=>void, onConnected?:()=>void, onError?:(msg:string)=>void}} handlers
 */
export function hostRoom({ onCodeReady, onConnected, onError } = {}) {
  session.mode = "host";
  let attempt = 0;
  let opened = false;
  let openTimer = null;

  const tryCreate = () => {
    attempt += 1;
    const code = randomRoomCode();
    const peer = new window.Peer(PEER_ID_PREFIX + code);
    session.peer = peer;
    session.roomCode = code;

    // นับเฉพาะ "กว่าจะได้รหัสห้อง" ไม่ใช่ "กว่าจะมีคนเข้า" — เพื่อนจะเข้ามาเมื่อไหร่ก็ได้
    clearTimeout(openTimer);
    openTimer = setTimeout(() => { if (!opened) onError?.(TIMEOUT_MSG); }, SIGNAL_TIMEOUT_MS);
    peer.on("open", () => { opened = true; clearTimeout(openTimer); onCodeReady?.(code); });

    peer.on("connection", (conn) => {
      if (session.conn) {
        conn.close(); // มีคนต่ออยู่แล้ว — ห้องนี้รับได้แค่ 1v1
        return;
      }
      wireConnection(conn);
      conn.on("open", () => onConnected?.());
    });

    peer.on("error", (err) => {
      if (err?.type === "unavailable-id" && attempt < HOST_ID_RETRY_MAX) {
        peer.destroy();
        tryCreate();
        return;
      }
      clearTimeout(openTimer);
      onError?.(describePeerError(err));
    });
  };

  tryCreate();
}

/**
 * เข้าร่วมห้องด้วยรหัส 5 ตัวอักษรที่ฝั่ง host โชว์ไว้
 * @param {string} code
 * @param {{onConnected?:()=>void, onError?:(msg:string)=>void}} handlers
 */
export function joinRoom(code, { onConnected, onError } = {}) {
  session.mode = "guest";
  session.roomCode = code;
  const peer = new window.Peer();
  session.peer = peer;

  // นับถอยหลังตั้งแต่กด ครอบทั้งสองจังหวะ: ต่อเซิร์ฟเวอร์ signaling และต่อหาเจ้าของห้อง
  // ค้างที่จังหวะไหนก็ได้ผลเหมือนกันสำหรับคนเล่น คือกดแล้วไม่มีอะไรเกิดขึ้น
  let done = false;
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    onError?.(TIMEOUT_MSG);
  }, SIGNAL_TIMEOUT_MS);
  const settle = (fn) => (...a) => { if (done) return; done = true; clearTimeout(timer); fn?.(...a); };

  peer.on("open", () => {
    if (done) return;                       // หมดเวลาไปแล้ว อย่าเริ่มต่อใหม่ซ้อน
    const conn = peer.connect(PEER_ID_PREFIX + code, { reliable: true });
    wireConnection(conn);
    conn.on("open", settle(() => onConnected?.()));
    conn.on("error", settle((err) => onError?.(describePeerError(err))));
  });

  peer.on("error", settle((err) => onError?.(describePeerError(err))));
}

/** ยกเลิก/เคลียร์ห้องปัจจุบัน — ใช้ตอนกดย้อนกลับจากล็อบบี้ ก่อนเริ่มเกมจริง (กลับไปเป็น offline) */
export function cancelSession() {
  session.conn?.close();
  session.peer?.destroy();
  session.mode = "offline";
  session.peer = null;
  session.conn = null;
  session.roomCode = null;
  session._pending = [];
  session.onData = null;
  session.onClose = null;
  session.onError = null;
}
