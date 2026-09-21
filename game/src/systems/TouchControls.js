/**
 * ปุ่มสัมผัสบนจอ สำหรับเล่นบนมือถือ/แท็บเล็ต
 *
 * ทำไมต้องมี: เดิน/กระโดด/ตี/กัน ผูกกับคีย์บอร์ดล้วน (W/A/S/D) บนมือถือจึงขยับไม่ได้เลย
 * มีแต่ปุ่มสกิล/แปลงร่าง/ยั่ว ที่กดบนจอได้อยู่แล้ว
 *
 * ── ออกแบบให้เป็น "สถานะกดค้าง" ล้วน ไม่คิด edge เอง ──
 * คลาสนี้บอกแค่ว่าตอนนี้ปุ่มไหน "ถูกกดอยู่" เหมือน key.isDown ของคีย์บอร์ดเป๊ะ ๆ
 * แล้วปล่อยให้ _readP1Input() คิด "เพิ่งกด" ด้วยกลไก _prevXxx เดิมที่มีอยู่แล้ว
 * ได้ผลสองอย่าง: (1) ไม่ต้องมีโค้ดเคลียร์ธงเพิ่มอีกชุด (2) พฤติกรรมเหมือนคีย์บอร์ดทุกจุด
 * รวมถึงตอนภาพหยุด (hitstop) และตอนเล่นออนไลน์ที่ input ถูกส่งข้ามเน็ต ไม่ต้องแก้อะไรเพิ่ม
 *
 * ── ทำไมอ่านค่าด้วยการวนเช็ค pointer เอง แทน event pointerdown/pointerup ──
 * ปุ่มกดค้างที่ใช้ event จะค้างติดถ้านิ้วเลื่อนออกนอกปุ่มแล้วปล่อย (pointerup ไปตกที่อื่น)
 * หรือถ้าเบราว์เซอร์กลืน event ตอนสลับแอป — ตัวละครจะวิ่งไปเรื่อยไม่หยุด
 * วนเช็คตำแหน่งนิ้วทุกเฟรมแทน สถานะจึงตรงกับความจริงเสมอ และเลื่อนนิ้วจากปุ่มหนึ่งไปอีกปุ่มได้ด้วย
 */

const HELD_KEYS = ["left", "right", "up", "down", "attack", "block"];

export class TouchControls {
  /**
   * เปิดปุ่มสัมผัสไหม — ดูจาก "ชนิดอุปกรณ์ชี้ตำแหน่งหลัก" ไม่ใช่แค่ว่ารองรับ touch ไหม
   * โน้ตบุ๊กจอสัมผัสรองรับ touch แต่คนใช้เมาส์เป็นหลัก ไม่ควรมีปุ่มมาบังจอ
   * (pointer: coarse) = อุปกรณ์ชี้หลักเป็นนิ้ว ซึ่งตรงกับที่ต้องการพอดี
   * ?touch=1 / ?touch=0 บังคับเปิด-ปิดได้ เอาไว้เทสบนคอมโดยไม่ต้องมีมือถือ
   */
  static shouldEnable() {
    const forced = new URLSearchParams(location.search).get("touch");
    if (forced === "1") return true;
    if (forced === "0") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  }

  constructor(scene, depth = 90) {
    this.scene = scene;
    this.held = Object.fromEntries(HELD_KEYS.map((k) => [k, false]));

    // Phaser ตั้งต้นรับนิ้วเดียว ต้องขอเพิ่มเอง ไม่งั้นกดค้าง "เดินขวา" แล้วกด "ตี" พร้อมกันไม่ได้
    // (4 นิ้ว: เดิน + กระโดด + ตี + กัน เผื่อไว้ครบ)
    // เช็คจำนวนที่มีอยู่ก่อน เพราะ input manager อยู่ระดับเกม ไม่ได้ถูกรีเซ็ตตอน scene.restart()
    // (กด R/M/V/C รีสตาร์ทฉากบ่อย ๆ แล้วเรียก addPointer ซ้ำทุกครั้งจะชนเพดาน 10 ตัวของ Phaser)
    const want = 4;
    const have = scene.input.manager?.pointersTotal ?? 0;
    if (have < want) scene.input.addPointer(want - have);

    const W = scene.sys.game.config.width;
    const H = scene.sys.game.config.height;

    // แถวปุ่มเดิม (ยั่ว/สกิล/แปลงร่าง) อยู่ล่างสุดที่ x 16-76 และ 540-826 — เลี่ยงโซนนั้น
    this.buttons = [
      { key: "left",   x: 150,     y: H - 120, r: 54, label: "◀",    color: 0x38bdf8 },
      { key: "right",  x: 292,     y: H - 120, r: 54, label: "▶",    color: 0x38bdf8 },
      { key: "down",   x: 221,     y: H - 232, r: 40, label: "▼",    color: 0x64748b },
      { key: "up",     x: W - 150, y: H - 242, r: 52, label: "▲",    color: 0x4ade80 },
      { key: "attack", x: W - 272, y: H - 128, r: 58, label: "ตี",   color: 0xf87171 },
      { key: "block",  x: W - 122, y: H - 108, r: 46, label: "กัน",  color: 0xfacc15 },
    ];

    for (const b of this.buttons) {
      b.shape = scene.add
        .circle(b.x, b.y, b.r, b.color, 0.18)
        .setStrokeStyle(3, b.color, 0.75)
        .setScrollFactor(0)
        .setDepth(depth);
      b.text = scene.add
        .text(b.x, b.y, b.label, { fontFamily: "monospace", fontSize: `${Math.round(b.r * 0.62)}px`, color: "#ffffff" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);
    }
  }

  /** เรียกทุกเฟรม ก่อนอ่าน input — ตั้ง this.held ตามนิ้วที่แตะอยู่จริงตอนนี้ */
  update() {
    for (const k of HELD_KEYS) this.held[k] = false;

    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        // เทียบระยะกำลังสอง ไม่ต้องถอดราก — เช็คทุกปุ่มทุกนิ้วทุกเฟรม เลี่ยง sqrt ได้ก็เอา
        if (dx * dx + dy * dy <= b.r * b.r) this.held[b.key] = true;
      }
    }

    // ซ้าย+ขวาพร้อมกัน (นิ้วคร่อมสองปุ่ม) = ไม่เดิน ดีกว่าให้ตัวสั่นไปมาตามลำดับการเช็ค
    if (this.held.left && this.held.right) this.held.left = this.held.right = false;

    for (const b of this.buttons) b.shape.setFillStyle(b.color, this.held[b.key] ? 0.55 : 0.18);
  }

  destroy() {
    for (const b of this.buttons) {
      b.shape.destroy();
      b.text.destroy();
    }
    this.buttons = [];
  }
}
