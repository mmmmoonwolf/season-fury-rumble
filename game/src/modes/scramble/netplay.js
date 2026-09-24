/**
 * เล่นสองคนคนละเครื่อง — lockstep แบบหน่วงอินพุต
 *
 * ทำไมใช้ lockstep ได้: core.js เป็น sim ที่เดินทีละเฟรมแบบ deterministic
 * (step(inp1, inp2) อย่างเดียว ไม่อ่านเวลาจริง ไม่มีอะไรสุ่มในเส้นทางที่ผู้เล่นใช้)
 * ทั้งสองเครื่องจึงเดินสูตรเดียวกันแล้วได้ภาพตรงกันเอง ไม่ต้องส่งตำแหน่ง/เลือด/สถานะอะไรข้ามเน็ตเลย
 * ส่งแค่ "ปุ่มที่กด" ซึ่งเป็นตัวเลขตัวเดียวต่อเฟรม
 *
 * วิธีทำงาน: อินพุตของเฟรมนี้ถูกส่งไปใช้ที่เฟรม frame + DELAY
 * เดิน sim เฉพาะเมื่อมีอินพุตครบทั้งสองฝั่งของเฟรมนั้น ไม่ครบก็รอ (ภาพค้างแทนที่จะเดินผิด)
 * แลกกับหน่วงอินพุต DELAY เฟรม (~50 ms ที่ 3 เฟรม) ซึ่งเกมต่อสู้ยังเล่นได้สบาย
 *
 * ที่ไม่ได้ทำ (ตั้งใจ): rollback — ต้องเก็บ/ย้อนสถานะทั้ง sim ซึ่งใหญ่กว่านี้มาก
 * ถ้าเล่นแล้วรู้สึกหน่วงเกิน ค่อยลด DELAY ก่อน แล้วค่อยคิดเรื่อง rollback ทีหลัง
 */

export const NET_DELAY = 3;

/** ปุ่มทั้งหมดที่ต้องส่ง — ลำดับนี้คือรูปแบบสายข้อมูล ห้ามสลับโดยไม่แก้ทั้งสองฝั่งพร้อมกัน */
const HELD = ['left', 'right', 'up', 'down', 'jump', 'attack', 'block', 'skill1', 'skill2', 'skill3'];
const PRESSED = ['left', 'right', 'jump', 'attack', 'block', 'skill1', 'skill2', 'skill3'];

/** บีบอินพุตหนึ่งเฟรมเป็นจำนวนเต็มตัวเดียว (18 บิต) */
export function packInput(i) {
  let v = 0;
  HELD.forEach((k, n) => { if (i[k]) v |= 1 << n; });
  PRESSED.forEach((k, n) => { if (i.p[k]) v |= 1 << (HELD.length + n); });
  return v;
}

/** มาสก์แยกบิต "กดค้าง" กับ "เพิ่งกด" — ฝั่งที่เรียกใช้ต้องเก็บบิตเพิ่งกดค้างไว้เองจนกว่าจะเข้าคิวได้ */
export const HELD_MASK = (1 << HELD.length) - 1;
export const PRESS_MASK = ((1 << PRESSED.length) - 1) << HELD.length;

export function unpackInput(v) {
  const o = { run: 0, p: {} };
  HELD.forEach((k, n) => { o[k] = (v >> n) & 1 ? 1 : 0; });
  PRESSED.forEach((k, n) => { o.p[k] = (v >> (HELD.length + n)) & 1 ? 1 : 0; });
  return o;
}

/**
 * คิวอินพุตสองฝั่ง — บอกว่าเฟรมถัดไปเดินได้หรือยัง
 * ไม่รู้จัก WebRTC เลย รับแค่ฟังก์ชันส่ง จึงเทสต์ได้ด้วยท่อปลอมในหน่วยความจำ
 */
export class Lockstep {
  constructor(send, { delay = NET_DELAY } = {}) {
    this.send = send;
    this.delay = delay;
    this.frame = 0;          // เฟรมถัดไปที่จะเดิน
    this.local = new Map();
    this.remote = new Map();
    this.sent = -1;
    this.stalls = 0;         // นับไว้ดูว่ารออีกฝั่งบ่อยแค่ไหน (โชว์บนจอตอนดีบั๊ก)
  }

  /** เรียกทุกรอบวาด — จองอินพุตของตัวเองไว้ล่วงหน้าให้ครบ delay เฟรมเสมอ
   *
   *  ต้องเติมเป็นลูปจนเต็ม ไม่ใช่เฟรมเดียวต่อรอบ: รอบวาดหนึ่งรอบอาจเดิน sim ได้หลายเฟรม
   *  (ตอนไล่ตามอีกฝั่งที่นำอยู่) ถ้าเติมทีละเฟรมคิวจะโหว่เป็นรู แล้วค้างตรงรูนั้นตลอดไป
   *  ปุ่มที่อ่านได้รอบนี้ใช้กับทุกเฟรมที่เติม ซึ่งถูกต้องเพราะเราอ่านปุ่มรอบละครั้งอยู่แล้ว */
  pushLocal(v) {
    let queued = 0;
    while (this.sent < this.frame + this.delay) {
      this.sent++;
      this.local.set(this.sent, v);
      this.send({ t: 'i', f: this.sent, v });
      queued++;
    }
    return queued;   // 0 = คิวเต็มอยู่แล้ว ผู้เรียกต้องเก็บปุ่มที่เพิ่งกดไว้ส่งรอบหน้า ไม่งั้นหาย
  }

  /** เติมเฟรมเปิดเกมให้ครบ delay แรก — ไม่งั้นเฟรม 0..delay-1 ไม่มีใครส่งให้ */
  primeStart() {
    for (let f = 0; f < this.delay; f++) {
      if (!this.local.has(f)) { this.local.set(f, 0); this.send({ t: 'i', f, v: 0 }); }
    }
    this.sent = Math.max(this.sent, this.delay - 1);
  }

  onPacket(pk) {
    if (pk && pk.t === 'i') this.remote.set(pk.f, pk.v);
  }

  ready() { return this.local.has(this.frame) && this.remote.has(this.frame); }

  /** คืนอินพุตของเฟรมนี้แล้วเดินตัวนับ — เรียกได้เฉพาะตอน ready() */
  take() {
    const a = this.local.get(this.frame);
    const b = this.remote.get(this.frame);
    this.local.delete(this.frame);
    this.remote.delete(this.frame);
    this.frame++;
    return [unpackInput(a), unpackInput(b)];
  }

  /** จำนวนเฟรมที่อีกฝั่งส่งมาแล้วแต่เรายังเดินไม่ถึง — มากแปลว่าเราตามหลัง */
  get behind() {
    let n = 0;
    for (const f of this.remote.keys()) if (f >= this.frame) n++;
    return n;
  }
}
