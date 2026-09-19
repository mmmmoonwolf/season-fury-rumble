import { SHOTGUN_SKILL1, WEAPON_LIST } from "../config/weapons.config.js";

/**
 * เอฟเฟกต์ปืน (วาดด้วยโค้ดล้วน) + ไอคอนอาวุธบนปุ่ม HUD
 *  - muzzleBlast(): ไฟปากกระบอก + ลูกปราย + ควัน — เฟรมยิงในคลิปมีไฟ/ควันเต็มฉากตัดไม่ได้ จึงวาดเอง
 *  - makeIcons(): texture ไอคอนอาวุธ 48x48 (ชื่อตาม WEAPON_LIST[].icon)
 * ใช้ tween ทั้งหมด -> หยุดพร้อม hitstop เอง
 */
const DEPTH = 46;

export class GunEffects {
  constructor(scene) {
    this.scene = scene;
    GunEffects.makeIcons(scene);
  }

  /**
   * ไฟ + ลูกปรายออกจากปากกระบอก
   * @param {Player} p
   * @param {{left:number[], right:number[]}} muzzle จุดปากกระบอก (px ผืนภาพ นับจากกลางเท้า)
   * @param {Array<"left"|"right"|"front">} sides
   * @param {{small?: boolean}} [opts] small = ตีพื้นฐาน (ไฟเล็กลง ไม่แฟลชจอ สั่นเบา)
   */
  muzzleBlast(p, muzzle, sides = ["left", "right"], opts = {}) {
    const s = Math.abs(p.scaleY);
    for (const side of sides) {
      let [ox, oy] = muzzle[side];
      if (p.flipX) ox = -ox; // หันซ้าย = ภาพกลับด้าน ปืนซ้าย-ขวาสลับที่
      const x = p.x + ox * s;
      const y = p.body.bottom + oy * s;
      const dir = Math.sign(ox) || 1;
      this._flash(x, y, dir, opts.small ? 0.7 : 1);
      this._pellets(x, y, dir, opts.small ? 0.75 : 1);
      this._smoke(x, y, dir, opts.small ? 3 : 5);
    }
    if (opts.small) {
      this.scene.cameras.main.shake(90, 0.004);
      this.scene.audio?.play("hit", { pitch: 0.9, volume: 0.9 });
      return;
    }
    this.scene.cameras.main.flash(90, 255, 220, 150);
    this.scene.cameras.main.shake(220, 0.01);
    this.scene.audio?.play("hit", { pitch: 0.7, volume: 1.4 });
  }

  _flash(x, y, dir, size = 1) {
    const g = this.scene.add.graphics().setDepth(DEPTH).setPosition(x, y).setScale(size);
    g.fillStyle(0xffb020, 0.85);
    g.fillTriangle(0, -16, 0, 16, dir * 70, 0);
    g.fillStyle(0xfff2b0, 1);
    g.fillTriangle(0, -9, 0, 9, dir * 44, 0);
    g.fillCircle(dir * 4, 0, 13);
    this.scene.tweens.add({
      targets: g, scaleX: { from: 0.6 * size, to: 1.5 * size }, scaleY: { from: 0.8 * size, to: 1.3 * size }, alpha: { from: 1, to: 0 },
      duration: 170, ease: "Quad.easeOut", onComplete: () => g.destroy(),
    });
  }

  _pellets(x, y, dir, rangeMul = 1) {
    const g = this.scene.add.graphics().setDepth(DEPTH).setPosition(x, y);
    g.lineStyle(2, 0xfff7d6, 1);
    const R = SHOTGUN_SKILL1.pelletRange * rangeMul;
    for (let i = 0; i < 7; i++) {
      const ang = (Math.random() - 0.5) * 0.5; // กระจาย ~±14°
      const len = R * (0.6 + Math.random() * 0.4);
      const x0 = dir * 20, x1 = dir * (20 + len * Math.cos(ang));
      g.lineBetween(x0, 0, x1, len * Math.sin(ang));
    }
    this.scene.tweens.add({ targets: g, alpha: { from: 1, to: 0 }, duration: 140, onComplete: () => g.destroy() });
  }

  _smoke(x, y, dir, count = 5) {
    for (let i = 0; i < count; i++) {
      const c = this.scene.add
        .circle(x + dir * (10 + i * 12), y + (Math.random() - 0.5) * 10, 10 + Math.random() * 6, 0xd4d4d8, 0.55)
        .setDepth(DEPTH - 1);
      this.scene.tweens.add({
        targets: c,
        x: c.x + dir * (40 + Math.random() * 50),
        y: c.y - 20 - Math.random() * 25,
        scale: { from: 0.6, to: 2.2 },
        alpha: { from: 0.55, to: 0 },
        duration: 650 + Math.random() * 300,
        delay: 40 + i * 25,
        ease: "Sine.easeOut",
        onComplete: () => c.destroy(),
      });
    }
  }

  /**
   * v29 แส้ S1 — sonic boom: แฟลชขาว + วงคลื่นกระแทกซ้อนหลายชั้น + เส้นความเร็ว
   * (คลิปมีวงคลื่นเต็มจอแต่ตัดไม่ได้ จึงวาดเอง) · tween หยุดตาม hitstop -> ตอนภาพหยุดเห็นวงค้างอยู่
   */
  sonicBoom(x, y, dir) {
    const sc = this.scene;
    const core = sc.add.graphics().setDepth(DEPTH + 1).setPosition(x, y);
    core.fillStyle(0xffffff, 1).fillCircle(0, 0, 22);
    core.fillStyle(0xfff3c4, 0.8).fillCircle(0, 0, 36);
    sc.tweens.add({ targets: core, scale: { from: 0.4, to: 2.4 }, alpha: { from: 1, to: 0 }, duration: 320, ease: "Quad.easeOut", onComplete: () => core.destroy() });
    // วงคลื่น 3 ชั้น แบนตามทิศฟาด (วงรีตั้ง = คลื่นวิ่งออกด้านหน้า)
    for (let i = 0; i < 3; i++) {
      const g = sc.add.graphics().setDepth(DEPTH).setPosition(x, y);
      g.lineStyle(5 - i, 0xffffff, 0.9);
      g.strokeEllipse(0, 0, 60, 120);
      g.lineStyle(2, 0xcbd5e1, 0.6);
      g.strokeEllipse(0, 0, 76, 150);
      sc.tweens.add({
        targets: g,
        x: x + dir * (40 + i * 30),
        scaleX: { from: 0.3, to: 2.2 + i * 0.6 },
        scaleY: { from: 0.3, to: 1.6 + i * 0.4 },
        alpha: { from: 0.95, to: 0 },
        duration: 420 + i * 120,
        delay: i * 60,
        ease: "Cubic.easeOut",
        onComplete: () => g.destroy(),
      });
    }
    // เส้นความเร็วพุ่งไปด้านหน้า
    const lines = sc.add.graphics().setDepth(DEPTH).setPosition(x, y);
    lines.lineStyle(2, 0xffffff, 0.9);
    for (let i = 0; i < 9; i++) {
      const yy = (i - 4) * 12;
      lines.lineBetween(dir * 10, yy, dir * (70 + Math.random() * 60), yy * 1.4);
    }
    sc.tweens.add({ targets: lines, x: x + dir * 60, alpha: { from: 1, to: 0 }, duration: 260, onComplete: () => lines.destroy() });
    sc.cameras.main.flash(120, 255, 255, 255);
    sc.cameras.main.shake(380, 0.02);
  }

  /** v29 แส้ S2 — ฝุ่น/ประกายตอนบ่วงรัดเป้า */
  lassoSnap(x, y) {
    const g = this.scene.add.graphics().setDepth(DEPTH).setPosition(x, y);
    g.lineStyle(3, 0xe7d3a8, 1).strokeEllipse(0, 0, 70, 30);
    this.scene.tweens.add({ targets: g, scaleX: { from: 1.4, to: 0.6 }, scaleY: { from: 1.4, to: 0.6 }, alpha: { from: 1, to: 0 }, duration: 220, onComplete: () => g.destroy() });
  }

  /** ไอคอนอาวุธ 48x48 (เส้นขาวบนพื้นโปร่ง — ปุ่มให้สีพื้นเอง) */
  static makeIcons(scene) {
    const tex = scene.textures;
    const draw = {
      wpn_whip(ctx) {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(10, 38); ctx.lineTo(18, 28); ctx.stroke(); // ด้าม
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, 28);
        ctx.bezierCurveTo(30, 8, 44, 20, 32, 26);
        ctx.bezierCurveTo(22, 31, 30, 42, 42, 38);
        ctx.stroke();
      },
      wpn_pistol(ctx) {
        // ลูกโม่ 1 กระบอก + "x2"
        ctx.fillRect(18, 12, 24, 6);                                   // ลำกล้อง
        ctx.beginPath(); ctx.roundRect(10, 9, 13, 13, 3); ctx.fill();   // โม่
        ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(19, 20); ctx.lineTo(15, 36); ctx.lineTo(6, 34); ctx.closePath(); ctx.fill(); // ด้าม
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(21, 23, 4, 0, Math.PI); ctx.stroke();           // โกร่งไก
        ctx.font = "bold 13px monospace"; ctx.fillText("x2", 27, 40);
      },
      wpn_shotgun(ctx) {
        // ลูกซองลำกล้องคู่ 1 กระบอก + "x2"
        ctx.fillRect(16, 11, 30, 4);
        ctx.fillRect(16, 16, 30, 4);                                    // ลำกล้องคู่
        ctx.fillRect(9, 10, 9, 12);                                     // โครงปืน
        ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(1, 26); ctx.lineTo(3, 32); ctx.lineTo(13, 22); ctx.closePath(); ctx.fill(); // พานท้าย
        ctx.font = "bold 13px monospace"; ctx.fillText("x2", 27, 40);
      },
      wpn_rifle(ctx) {
        ctx.fillRect(6, 24, 38, 3);
        ctx.fillRect(16, 17, 14, 4);        // กล้อง
        ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(4, 34); ctx.lineTo(14, 30); ctx.lineTo(16, 27); ctx.closePath(); ctx.fill();
      },
      wpn_grenade(ctx) {
        ctx.beginPath(); ctx.ellipse(24, 29, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(20, 13, 8, 5);
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(33, 15, 5, 0, Math.PI * 2); ctx.stroke(); // ห่วงสลัก
      },
    };
    for (const w of WEAPON_LIST) {
      if (tex.exists(w.icon) || !draw[w.icon]) continue;
      const c = tex.createCanvas(w.icon, 48, 48);
      const ctx = c.getContext();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineCap = "round";
      draw[w.icon](ctx);
      c.refresh();
    }
  }
}
