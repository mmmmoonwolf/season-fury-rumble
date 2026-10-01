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

export const ROOM_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ตัด 0/O/1/I ออก กันอ่าน/พิมพ์ผิด
export const ROOM_CODE_LEN = 5;

/**
 * ล้างรหัสห้องที่คนพิมพ์ให้เหลือแต่ตัวที่ใช้ได้
 *
 * **ที่เดียวที่รู้กติกาของรหัสห้อง** — ช่องกรอกในล็อบบี้ ปุ่มเชื่อมต่อ และ joinRoom()
 * ต้องคิดเหมือนกันหมด ไม่งั้นจะมีเคสที่ช่องกรอกยอมให้พิมพ์ แต่ปุ่มบอกว่าไม่ครบ
 * หรือกดได้แล้วไปโดนปฏิเสธที่ชั้นเน็ตอีกที ซึ่งผู้เล่นอ่านไม่ออกว่าใครผิด
 *
 * ตัวพิมพ์เล็กแปลงเป็นใหญ่ · ตัวที่ไม่อยู่ในชุดทิ้ง (รวม 0 O 1 I ที่ตัดออกตั้งแต่ตอนสุ่ม)
 * · ยาวเกินตัดท้าย
 */
export function normalizeRoomCode(raw) {
  return [...String(raw ?? "").toUpperCase()]
    .filter((c) => ROOM_CODE_CHARS.includes(c))
    .slice(0, ROOM_CODE_LEN)
    .join("");
}
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

/** หาห้องไม่เจอแล้วลองใหม่กี่ครั้ง และห่างกันเท่าไหร่
 *
 *  **ไม่ใช่การกลบปัญหา** — เซิร์ฟเวอร์ฟรีของ PeerJS เป็นตัวกลางหลายเครื่องอยู่หลังตัวกระจายโหลด
 *  เจ้าของห้องไปจดชื่อไว้ที่เครื่องหนึ่ง คนเข้าร่วมอาจไปถามอีกเครื่องที่ยังไม่รู้จักชื่อนั้น
 *  ผลคือ "ไม่พบห้องนี้" ทั้งที่ห้องมีอยู่จริงและเจ้าของนั่งรออยู่ ซึ่งตรงกับอาการที่เจอ
 *  (สร้างห้องได้ แปลว่า signaling ใช้งานได้ ปัญหาจึงอยู่ที่ "หา" ไม่ใช่ที่ "ต่อ")
 *
 *  ลองซ้ำเฉพาะกรณีหาไม่เจอเท่านั้น — เน็ตพังหรือเซิร์ฟเวอร์ล่มลองกี่ครั้งก็เหมือนเดิม */
const JOIN_RETRY_MAX = 3;
const JOIN_RETRY_MS = 1200;

/** ที่นั่งมากสุดต่อห้อง — 2v2 คือเพดานของเกมนี้ (ดู STAGE.platforms กับ setRoster) */
export const MAX_SEATS = 4;

/**
 * ทำไมเป็น "ดาว" ไม่ใช่ "ตาข่าย"
 *
 * เล่นสี่คนแบบตาข่ายต้องให้แขกทุกคนรู้จัก peer id ของแขกคนอื่น ซึ่งต้องมีใครสักคนบอก
 * = ต้องมีตัวกลางอยู่ดี และยังเพิ่มทางที่ต่อไม่ติดจาก 1 เส้นเป็น 6 เส้น
 * (วง wifi ที่บล็อก WebRTC บล็อกทีละคู่ ไม่ใช่ทั้งห้อง — ตาข่ายจึงพังบ่อยกว่าเป็นทวีคูณ)
 *
 * เจ้าของห้องเป็นศูนย์กลาง: แขกคุยกับเจ้าของห้องคนเดียว เจ้าของห้องส่งต่อให้แขกคนอื่น
 * ราคาที่จ่ายคือ **แขกถึงแขกเดินสองต่อ** หน่วงเป็นสองเท่าของแขกถึงเจ้าของห้อง
 * ซึ่งอาจต้องเพิ่ม NET_DELAY ตอนเล่นสี่คนจริง (วัดก่อนค่อยปรับ อย่าเดา)
 */
/** สถานะห้องปัจจุบัน — instance เดียวต่อหน้าเว็บ */
const session = {
  mode: "offline", // "offline" | "host" | "guest"
  peer: null, // instance ของ Peer (PeerJS) — null ถ้ายังไม่เปิดห้อง/ยังไม่เข้าร่วม
  conn: null, // สายหลัก: แขกคือสายไปหาเจ้าของห้อง · เจ้าของห้องคือแขกคนแรกที่ต่อเข้ามา
  conns: [], // เจ้าของห้อง: สายของแขกทุกคน เรียงตามลำดับที่ต่อเข้ามา = ที่นั่ง 1, 2, 3
  seat: 0, // ที่นั่งของเครื่องนี้ — เจ้าของห้องได้ 0 เสมอ แขกได้ตามที่เจ้าของห้องแจก
  seats: 2, // ห้องนี้เล่นกี่คน — เจ้าของห้องตั้งตอนสร้าง แล้วบอกแขกตอนต่อติด
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
  if (!session.conns.includes(conn)) session.conns.push(conn);
  session.conn ??= conn;
  conn.on("data", (packet) => {
    // ที่นั่งเป็นข้อมูลของชั้นท่อ ไม่ใช่ของเกม — กินตรงนี้ ไม่ส่งต่อให้ฉาก
    // "เต็มแล้ว" เป็นข้อมูลของชั้นท่อเหมือนที่นั่ง ไม่ใช่ของเกม — กินตรงนี้ ไม่ส่งต่อให้ฉาก
    if (packet?.t === "full" && session.mode === "guest") {
      const full = session._onFull;
      session._onFull = null;
      full?.();
      return;
    }
    if (packet?.t === "seat" && session.mode === "guest") {
      session.seat = packet.seat;
      session.seats = packet.seats;
      const done = session._onSeat;
      session._onSeat = null;
      done?.();
      return;
    }
    // เจ้าของห้องเป็นศูนย์กลาง: ของที่แขกคนหนึ่งส่งมา แขกคนอื่นไม่ได้ยิน ต้องส่งต่อให้
    // ส่งต่อ**ก่อน**เอาเข้าฉากของตัวเอง เพื่อให้ทางเดินของแขกสองคนสั้นที่สุดเท่าที่ทำได้
    // (ส่งต่อทุกชนิดแพ็คเก็ต ไม่ใช่แค่อินพุต — เลือกตัว/กดพร้อม แขกคนอื่นก็ต้องเห็นเหมือนกัน)
    if (session.mode === "host") relay(packet, conn);
    if (session._onData) session._onData(packet);
    else if (session._pending.length < PENDING_MAX) session._pending.push(packet);
  });
  conn.on("close", () => session.onClose?.());
  conn.on("error", (err) => session.onError?.(err));
}

/** ส่งของที่ได้จากแขกคนหนึ่ง ต่อให้แขกที่เหลือ — ไม่ส่งกลับคนเดิม ไม่งั้นวนไม่จบ */
function relay(packet, from) {
  for (const c of session.conns) if (c !== from) safeSend(c, packet);
}

function safeSend(conn, packet) {
  if (!conn || !conn.open) return;
  try {
    conn.send(packet);
  } catch (_e) {
    // data channel อาจหลุดกลางอากาศระหว่างส่ง — ปล่อยให้ event "close"/"error" ของ conn แจ้งเตือนแทน
  }
}

/**
 * ส่งแพ็คเก็ต (plain object — PeerJS serialize ให้เอง) ออกไปทุกสายที่เปิดอยู่
 *
 * แขกมีสายเดียว (ไปหาเจ้าของห้อง) · เจ้าของห้องมีสายละคนของแขกทุกคน
 * ผู้เรียกไม่ต้องรู้ว่าตัวเองเป็นใครหรือห้องมีกี่คน เรียกได้ทุกเฟรมโดยไม่ throw
 */
export function sendNetPacket(packet) {
  for (const c of session.conns) safeSend(c, packet);
}

const TIMEOUT_MSG = "เซิร์ฟเวอร์จับคู่ไม่ตอบใน 20 วินาที — ลองใหม่อีกครั้ง "
  + "(ใช้เซิร์ฟเวอร์ฟรีของ PeerJS ซึ่งล่มเป็นพัก ๆ)";

function describePeerError(err) {
  const type = err?.type ?? "unknown";
  if (type === "peer-unavailable") {
    return "ไม่พบห้องนี้ — เช็ครหัสอีกครั้ง "
      + "(ถ้ารหัสถูกและเพื่อนยังรออยู่ ให้เพื่อนกดสร้างห้องใหม่แล้วลองอีกที)";
  }
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
export function hostRoom({ seats = 2, code: fixed = null, onCodeReady, onConnected, onError, onTaken } = {}) {
  session.mode = "host";
  session.seat = 0;
  session.seats = Math.max(2, Math.min(MAX_SEATS, seats | 0));
  session.conns = [];
  session.conn = null;
  let attempt = 0;
  let opened = false;
  let openTimer = null;

  const tryCreate = () => {
    attempt += 1;
    // รหัสที่กำหนดมาใช้สำหรับ "ห้องสาธารณะ" ที่รหัสต้องเดาได้ (ดู quickMatch)
    const code = fixed ?? randomRoomCode();
    const peer = new window.Peer(PEER_ID_PREFIX + code);
    session.peer = peer;
    session.roomCode = code;

    // นับเฉพาะ "กว่าจะได้รหัสห้อง" ไม่ใช่ "กว่าจะมีคนเข้า" — เพื่อนจะเข้ามาเมื่อไหร่ก็ได้
    clearTimeout(openTimer);
    openTimer = setTimeout(() => { if (!opened) onError?.(TIMEOUT_MSG); }, SIGNAL_TIMEOUT_MS);
    peer.on("open", () => { opened = true; clearTimeout(openTimer); onCodeReady?.(code); });

    peer.on("connection", (conn) => {
      if (session.conns.length >= session.seats - 1) {
        // **ต้องบอกก่อนปิด** ไม่งั้นอีกฝั่งแยกไม่ออกระหว่าง "เต็มแล้ว" กับ "ต่อไม่ติด"
        // ซึ่งเป็นคนละเรื่องกันสิ้นเชิงสำหรับคนที่กำลังไล่หาห้องว่างอยู่ (ดู quickMatch)
        conn.on("open", () => { safeSend(conn, { t: "full" }); setTimeout(() => conn.close(), 60); });
        return;
      }
      // ที่นั่งแจกตามลำดับที่ต่อเข้ามา เจ้าของห้องนั่ง 0 แขกคนแรกนั่ง 1 ไล่ไป
      // **ต้องแจกที่นี่ที่เดียว** แขกเดาเองไม่ได้ เพราะไม่รู้ว่ามีใครเข้ามาก่อนหรือยัง
      // และถ้าเดาซ้ำกัน สองเครื่องจะคุมตัวละครตัวเดียวกันโดยไม่มีอะไรฟ้อง
      const seat = session.conns.length + 1;
      wireConnection(conn);
      conn.on("open", () => {
        safeSend(conn, { t: "seat", seat, seats: session.seats });
        onConnected?.(session.conns.length + 1, session.seats);
      });
    });

    peer.on("error", (err) => {
      if (err?.type === "unavailable-id") {
        peer.destroy();
        // รหัสที่กำหนดมา ชนซ้ำ = **มีคนจองห้องนั้นไปแล้ว** ไม่ใช่ความซวยของการสุ่ม
        // สุ่มรหัสใหม่ไม่ช่วยอะไร เพราะเราตั้งใจจะไปอยู่ห้องนั้นพอดี ต้องเปลี่ยนไปเป็นแขกแทน
        if (fixed) { onTaken?.(fixed); return; }
        if (attempt < HOST_ID_RETRY_MAX) { tryCreate(); return; }
      }
      clearTimeout(openTimer);
      onError?.(describePeerError(err));
    });
  };

  tryCreate();
}

const FULL_MSG = "ห้องนี้เต็มแล้ว";

const SEAT_MSG = "ต่อห้องติดแล้วแต่เจ้าของห้องไม่ตอบว่าให้นั่งที่ไหน — "
  + "ให้เพื่อนรีเฟรชหน้าเว็บแล้วสร้างห้องใหม่ (หน้าเว็บของเขาน่าจะเป็นเวอร์ชันเก่า)";

/**
 * เข้าร่วมห้องด้วยรหัส 5 ตัวอักษรที่ฝั่ง host โชว์ไว้
 * @param {string} code
 * @param {{onConnected?:()=>void, onError?:(msg:string)=>void}} handlers
 */
/** `tries` = **ลองทั้งหมดกี่ครั้ง** ไม่ใช่ลองซ้ำกี่ครั้ง — 1 คือยิงครั้งเดียวแล้วจบ
 *  (ตอนไล่หาห้องสาธารณะต้องเป็น 1 เพราะ "ไม่เจอ" คือคำตอบที่เราอยากได้ ไม่ใช่ความล้มเหลว) */
export function joinRoom(code, { onConnected, onError, onEmpty, onFull,
                                 timeoutMs = SIGNAL_TIMEOUT_MS, tries: retries = JOIN_RETRY_MAX } = {}) {
  // ตรวจตัวอักษรก่อนยิงออกเน็ต — รหัสห้องไม่เคยมี 0 O 1 I เพราะตัดออกตั้งแต่ตอนสุ่ม
  // ถ้าพิมพ์มาแล้วมีตัวพวกนี้ แปลว่าอ่านผิดแน่นอน บอกตรง ๆ ดีกว่าปล่อยไปได้ "ไม่พบห้องนี้"
  // ซึ่งชวนให้คิดว่าเพื่อนปิดห้องไปแล้ว
  const bad = [...code].filter((c) => !ROOM_CODE_CHARS.includes(c));
  if (bad.length) {
    onError?.(`รหัสห้องไม่มีตัว ${[...new Set(bad)].join(" ")} — ลองดูใหม่ว่าอ่านผิดหรือเปล่า`
      + " (รหัสไม่ใช้ 0 O 1 I เพราะอ่านสับสน)");
    return;
  }
  session.mode = "guest";
  session.roomCode = code;
  session.conns = [];
  session.conn = null;
  session.seat = 1;          // ค่าเริ่มต้นเผื่อเจ้าของห้องเป็นบิลด์เก่าที่ไม่ส่ง 'seat' มา (ห้อง 1v1)
  session.seats = 2;
  session.seatKnown = false;
  session._onSeat = null;
  session._onFull = null;
  const peer = new window.Peer();
  session.peer = peer;

  // นับถอยหลังตั้งแต่กด ครอบทั้งสองจังหวะ: ต่อเซิร์ฟเวอร์ signaling และต่อหาเจ้าของห้อง
  // ค้างที่จังหวะไหนก็ได้ผลเหมือนกันสำหรับคนเล่น คือกดแล้วไม่มีอะไรเกิดขึ้น
  let done = false, opened = false;
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    // ต่อติดแล้วแต่ไม่ได้ที่นั่ง เป็นคนละอาการกับเซิร์ฟเวอร์ไม่ตอบ — บอกให้ตรงกับที่เกิดจริง
    onError?.(opened ? SEAT_MSG : TIMEOUT_MSG);
  }, timeoutMs);
  const settle = (fn) => (...a) => { if (done) return; done = true; clearTimeout(timer); fn?.(...a); };

  let tries = 0;
  const attempt = () => {
    if (done) return;                       // หมดเวลาไปแล้ว อย่าเริ่มต่อใหม่ซ้อน
    tries += 1;
    const conn = peer.connect(PEER_ID_PREFIX + code, { reliable: true });
    wireConnection(conn);
    // ต่อติดแล้ว **ยังเข้าเกมไม่ได้** จนกว่าจะรู้ที่นั่งของตัวเอง
    // ฉากสร้างคิวอินพุตจากเลขที่นั่งตั้งแต่เฟรมแรก แก้ทีหลังไม่ได้ และเดาเองก็ไม่ได้
    // (ห้อง 1v1 แขกเป็นที่นั่ง 1 เสมอ แต่ห้องสี่คนขึ้นกับว่าใครต่อเข้ามาก่อน)
    //
    // ไม่ได้ตั้งนาฬิกาเพิ่ม — ใช้นาฬิกาหมดเวลาตัวเดิมที่ยังเดินอยู่
    // เพิ่มนาฬิกาตัวที่สองแปลว่ามีระเบิดเวลาอีกลูกที่ต้องจำว่าต้องยกเลิกตรงไหนบ้าง
    conn.on("open", () => { opened = true; });
    session._onSeat = settle(() => onConnected?.());
    // ห้องเต็ม: เจ้าของห้องบอกมาตรง ๆ (บิลด์ใหม่) หรือปิดสายเงียบ ๆ ก่อนแจกที่นั่ง (บิลด์เก่า)
    // สองทางนี้แปลว่าอย่างเดียวกันสำหรับคนที่กำลังหาห้องว่าง จึงลงปลายทางเดียวกัน
    session._onFull = settle(() => (onFull ?? onError)?.(FULL_MSG));
    conn.on("close", () => { if (!done) settle(() => (onFull ?? onError)?.(FULL_MSG))(); });
    conn.on("error", settle((err) => onError?.(describePeerError(err))));
  };

  peer.on("open", attempt);

  peer.on("error", (err) => {
    // หาห้องไม่เจอ = อาจเป็นเรื่องของเซิร์ฟเวอร์ ไม่ใช่เรื่องของห้อง ลองถามใหม่อีกที
    if (err?.type === "peer-unavailable" && tries < retries && !done) {
      setTimeout(attempt, JOIN_RETRY_MS);
      return;
    }
    // "ไม่มีห้องนี้" เป็นคำตอบที่ใช้ได้ ไม่ใช่ความผิดพลาด สำหรับคนที่กำลังหาห้องว่างมาเปิดเอง
    if (err?.type === "peer-unavailable" && onEmpty) { settle(() => onEmpty())(); return; }
    settle(() => onError?.(describePeerError(err)))();
  });
}

/** ห้องสาธารณะมีกี่ช่อง — ไล่จากช่องแรกเสมอ คนจึงมากองรวมกันที่ช่องต้น ๆ แล้วเจอกันเร็ว
 *  ช่องเยอะเกินไปทำให้คนกระจายจนไม่เจอกัน และทำให้รอบที่ "เต็มทุกช่อง" ใช้เวลานานขึ้นเปล่า ๆ */
const QUICK_SLOTS = 6;

/** เวลารอต่อหนึ่งช่องตอนไล่หา — สั้นกว่าปกติมาก เพราะคำตอบที่เราต้องการคือ
 *  "มีห้องนี้ไหม" ซึ่งเซิร์ฟเวอร์ตอบได้ในรอบเดียว ไม่ใช่ "ต่อให้ติด" */
const QUICK_TIMEOUT_MS = 6000;

/**
 * รหัสของห้องสาธารณะ — **ต้องเดาได้ตรงกันทุกเครื่องโดยไม่ต้องคุยกัน**
 *
 * เราไม่มีเซิร์ฟเวอร์ของตัวเอง จึงไม่มีใครเก็บ "รายชื่อห้องที่เปิดอยู่" ให้
 * ทางเดียวที่คนสองคนจะเจอกันโดยไม่ต้องส่งรหัสให้กันคือ **ตกลงรหัสกันไว้ล่วงหน้าในโค้ด**
 * แล้วทุกเครื่องไล่ลองรหัสชุดเดียวกันตามลำดับเดียวกัน
 *
 * ยังอยู่ในชุดตัวอักษรของรหัสห้องปกติและยาว 5 ตัวเท่ากัน คนเล่นจึงพิมพ์ตามได้ด้วย
 * ถ้าอยากชวนเพื่อนเข้าห้องสาธารณะห้องเดียวกันเป๊ะ ๆ
 */
export function quickCodes(seats) {
  return Array.from({ length: QUICK_SLOTS }, (_, i) => `Q${seats > 2 ? 4 : 2}XX${"ABCDEFGH"[i]}`);
}

const ALL_FULL_MSG = "ห้องสาธารณะเต็มหมดทุกห้องตอนนี้ — ลองใหม่อีกที "
  + "หรือใช้ \"ห้องส่วนตัว\" ชวนเพื่อนด้วยรหัส";

/** ทิ้ง peer ของรอบที่แล้วก่อนเริ่มรอบใหม่ — ไม่ทิ้งแล้วมันค้างกินสายอยู่เบื้องหลัง
 *  และยังตอบ event ของรอบเก่าเข้ามาปนกับรอบใหม่ได้ */
function dropPeer() {
  for (const c of session.conns) c?.close();
  session.peer?.destroy();
  session.peer = null;
  session.conn = null;
  session.conns = [];
  session._onSeat = null;
  session._onFull = null;
  session._pending = [];
}

/**
 * เข้าเกมเลย ไม่ต้องกรอกรหัส — ไล่ห้องสาธารณะทีละช่องจนกว่าจะได้ที่นั่ง
 *
 * ทำไมต้องไล่ ไม่ใช่ถามเซิร์ฟเวอร์ว่าห้องไหนว่าง: เราไม่มีเซิร์ฟเวอร์ (ดู quickCodes)
 * PeerJS cloud ให้ได้แค่ "ไอดีนี้มีคนจองอยู่ไหม" ซึ่งพอดีกับที่ต้องการ
 *
 * ทางเดินของแต่ละช่อง:
 *   ต่อติดและได้ที่นั่ง  -> จบ เข้าเกม
 *   เจ้าของห้องบอกเต็ม   -> ช่องถัดไป
 *   ไม่มีห้องนี้         -> **เปิดห้องนั้นเองแล้วรอ** คนถัดไปที่กดจะมาเจอเรา
 *   รหัสถูกจองไปก่อน    -> มีคนชิงเปิดพร้อมกันเสี้ยววินาที เข้าไปเป็นแขกของเขาแทน
 *
 * จังหวะชิงกันเปิดห้องพร้อมกันคือเคสที่ต้องคิดให้ครบ ไม่ใช่เคสหายาก:
 * สองคนกดพร้อมกันย่อมเห็นช่องแรกว่างเหมือนกันทั้งคู่ PeerJS ให้คนเดียวชนะ
 * คนแพ้ได้ unavailable-id กลับมา ซึ่ง **แปลว่าเจอคนแล้ว** ไม่ใช่ความผิดพลาด
 */
export function quickMatch({ seats = 2, onStatus, onHosting, onConnected, onError } = {}) {
  const codes = quickCodes(seats);
  const flag = (session._quick = { cancelled: false });
  const live = () => !flag.cancelled;
  let i = 0;

  const next = () => {
    if (!live()) return;
    if (i >= codes.length) { onError?.(ALL_FULL_MSG); return; }
    const code = codes[i++];
    onStatus?.(`กำลังหาห้อง... (${i}/${codes.length})`);
    dropPeer();
    joinRoom(code, {
      timeoutMs: QUICK_TIMEOUT_MS,
      // ยิงครั้งเดียว ไม่ลองซ้ำ — ที่นี่ "ไม่เจอ" เป็นคำตอบที่เราอยากได้ ไม่ใช่ความล้มเหลว
      // และถ้าเป็นการไม่เจอแบบหลอก (เซิร์ฟเวอร์คนละเครื่องยังไม่รู้จักชื่อ) เราจะไปเปิดห้องนั้น
      // แล้วโดน unavailable-id กลับมา ซึ่งพาเราไปเป็นแขกของห้องนั้นอยู่ดี — หายเองทั้งสองทาง
      tries: 1,
      onConnected: () => { if (live()) onConnected?.(); },
      onFull: next,
      onEmpty: () => claim(code),
      onError: next,          // ช่องนี้มีปัญหาก็ข้ามไป ครบทุกช่องแล้วค่อยบอกว่าไม่ไหวจริง
    });
  };

  const claim = (code) => {
    if (!live()) return;
    dropPeer();
    hostRoom({
      seats,
      code,
      onCodeReady: () => { if (live()) onHosting?.(code); },
      onConnected: (here, total) => { if (live()) onConnected?.(here, total); },
      onTaken: () => {
        // มีคนเปิดห้องนี้ตัดหน้าไปเสี้ยววินาที — เข้าไปเป็นแขกของเขา **ไม่ใช่ไปหาช่องอื่น**
        //
        // ไปหาช่องอื่นคือความผิดพลาดที่อ่านไม่ออกเลยจากฝั่งคนเล่น: สองคนที่กดพร้อมกัน
        // จะแยกย้ายไปเปิดห้องคนละห้อง แล้วนั่งรอกันคนละที่ตลอดกาล ทั้งที่กดหากันอยู่พอดี
        // (เจอมาแล้วตอนลองสี่แท็บพร้อมกัน — ต่างกันแค่เสี้ยววินาทีก็ไม่เจอกันเลย)
        //
        // และ "ห้องนี้ไม่มี" ที่ได้กลับมาตอนนี้ **เชื่อไม่ได้** เพราะเพิ่งโดนบอกว่ารหัสนี้มีคนจอง
        // (เซิร์ฟเวอร์ฟรีของ PeerJS เป็นหลายเครื่องหลังตัวกระจายโหลด เครื่องที่เราถามอาจยังไม่รู้จักชื่อนี้
        //  — เหตุผลเดียวกับที่ JOIN_RETRY_MAX มีอยู่) จึงถามซ้ำที่ช่องเดิมก่อน ไม่ใช่ย้ายช่องทันที
        if (!live()) return;
        dropPeer();
        joinRoom(code, { timeoutMs: QUICK_TIMEOUT_MS, tries: JOIN_RETRY_MAX,
          onConnected: () => { if (live()) onConnected?.(); },
          onFull: next, onEmpty: next, onError: next });
      },
      onError: (msg) => { if (live()) onError?.(msg); },
    });
  };

  next();
}

/** ยกเลิก/เคลียร์ห้องปัจจุบัน — ใช้ตอนกดย้อนกลับจากล็อบบี้ ก่อนเริ่มเกมจริง (กลับไปเป็น offline) */
export function cancelSession() {
  // หยุดการไล่หาห้องที่ค้างอยู่ด้วย ไม่งั้นมันจะเด้งเข้าเกมทีหลังทั้งที่คนกดย้อนกลับไปแล้ว
  if (session._quick) session._quick.cancelled = true;
  session._quick = null;
  for (const c of session.conns) c?.close();
  session.peer?.destroy();
  session.mode = "offline";
  session.peer = null;
  session.conn = null;
  session.conns = [];
  session.seat = 0;
  session.seats = 2;
  session.seatKnown = false;
  session._onSeat = null;
  session._onFull = null;
  session.roomCode = null;
  session._pending = [];
  session.onData = null;
  session.onClose = null;
  session.onError = null;
}
