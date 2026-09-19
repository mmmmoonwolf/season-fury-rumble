import { TRANSFORM } from "../config/transform.config.js";

/**
 * เอฟเฟกต์ประกอบการแปลงร่างและสกิลไททัน
 *
 * ภาพหลักมาจากคลิปทั้งหมด (อยู่ในเฟรมของตัวละคร) — ไฟล์นี้ทำแค่ส่วนที่เฟรมเดียวทำไม่ได้:
 *  - erupt():   จอแฟลช + กล้องสั่น + ควันปะทุเป็นภาพซ้อน — เฟรม tf_erupt ของคลิปเล่นเป็น sprite แยก
 *               เริ่มที่ขนาดร่าง OAT ค่อย ๆ ขยายจนคลุมไททัน (growTo 1.6 > sizeMul 1.2) พอดีตอนสลับร่าง แล้วจางออก
 *               (ถ้าให้ตัวละครเล่นควันเอง ควันจะเล็กเท่า OAT หัวไททันโผล่พ้นควันตอนสลับร่าง)
 *  - revertPuff(): หลอดไททันแตก — ควันก้อนเต็มขนาดแล้วจาง เผยร่างเดิม
 *  - shatterCrystals(): จบสกิล 2 — หนามคริสตัลหายไปพร้อมเฟรมสุดท้าย จึงปิดรอยต่อด้วยเศษคริสตัลแตกกระจาย
 *
 * เวลาเดินด้วย update(delta) ที่ scene เรียกทุกเฟรม (hitstop ข้ามไปด้วย ภาพจึงหยุดพร้อมกัน)
 */
const SHARD_TEX = "fx_crystal_shard";
const DEPTH_OVERLAY = 40; // เหนือตัวละคร (ใต้ประกาย 45-46 / HUD 55+)

export class TransformEffect {
  constructor(scene) {
    this.scene = scene;
    /** ควันซ้อนที่ยังอยู่ */
    this.overlays = [];
    /** เศษคริสตัลที่ยังลอยอยู่ */
    this.bursts = [];
    this._makeTextures();
  }

  _makeTextures() {
    const tex = this.scene.textures;
    if (tex.exists(SHARD_TEX)) return;
    const c = tex.createCanvas(SHARD_TEX, 18, 30);
    const ctx = c.getContext();
    const g = ctx.createLinearGradient(0, 0, 18, 30);
    g.addColorStop(0, "rgba(240,250,255,1)");
    g.addColorStop(0.6, "rgba(170,210,240,0.95)");
    g.addColorStop(1, "rgba(120,170,215,0.9)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(18, 12);
    ctx.lineTo(9, 30);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    c.refresh();
  }

  /**
   * ปะทุ: จอแฟลชสีอุ่น + กล้องสั่น + ควันภาพซ้อน
   * ต้องเรียกตอน player ยังเป็นร่างเดิมและเริ่มเล่น tf_erupt แล้ว (ใช้ขนาด/ตำแหน่ง/ท่าปัจจุบัน)
   */
  erupt(player) {
    const cam = this.scene.cameras.main;
    cam.flash(260, 255, 240, 200);
    cam.shake(700, 0.004);
    this._overlay(player);
  }

  _overlay(player) {
    const anim = player.anims?.currentAnim;
    const frameIndex = player.anims?.currentFrame?.index ?? 1;
    const frame = player.frame;
    // origin = ระดับเท้าของผืนภาพ (ทุก atlas: เท้าอยู่ที่ y=431 ของ 470, กึ่งกลางแนวนอน)
    const sprite = this.scene.add
      .sprite(player.x, player.body.bottom, frame.texture.key, frame.name)
      .setOrigin(0.5, 431 / 470)
      .setScale(player.scaleX, player.scaleY)
      .setFlipX(player.flipX)
      .setDepth(DEPTH_OVERLAY);
    if (player.baseTint != null) sprite.setTint(player.baseTint);
    if (anim) sprite.play({ key: anim.key, startFrame: Math.max(0, frameIndex - 1) });
    this.overlays.push({ sprite, t: 0, baseScale: player.scaleY, player });
  }

  /**
   * หลอดไททันแตก: ควันก้อนใหญ่ (ช่วงท้ายของ tf_erupt) ขนาดเท่าตอนคลุมไททัน แล้วจางเผยร่างเดิม
   * เรียกหลัง revertForm แล้ว (player เป็นร่างเดิม — ใช้ scale ของร่างเดิม x growTo)
   */
  revertPuff(player) {
    const O = TRANSFORM.overlay;
    const key = `${player.animPrefix}tf_erupt`;
    this.scene.cameras.main.flash(180, 255, 230, 200);
    if (!this.scene.anims.exists(key)) return;
    const sprite = this.scene.add
      .sprite(player.x, player.body.bottom, player.texture.key, player.frame.name)
      .setOrigin(0.5, 431 / 470)
      .setScale(player.scaleY * O.growTo)
      .setFlipX(player.flipX)
      .setDepth(DEPTH_OVERLAY);
    if (player.baseTint != null) sprite.setTint(player.baseTint);
    sprite.play({ key, startFrame: TRANSFORM.anim.swapFrame - 1 });
    // grow = 1 ทันที (เริ่มที่ขนาดเต็ม) · จางตั้งแต่ต้น
    this.overlays.push({ sprite, t: 0, baseScale: player.scaleY, player, growMs: 1, fadeStartMs: 120, fadeMs: TRANSFORM.formBreak.smokeFadeMs });
  }

  /** จบสกิล 2: เศษคริสตัลแตกกระจายตลอดแนวหนาม */
  shatterCrystals(player) {
    const h = player.displayHeight * (393 / 470); // ความสูงตัวยืนจริง
    const halfW = h * 0.75;
    const emitter = this.scene.add
      .particles(0, 0, SHARD_TEX, {
        x: { min: player.x - halfW, max: player.x + halfW },
        y: { min: player.body.bottom - h * 0.7, max: player.body.bottom },
        speedX: { min: -260, max: 260 },
        speedY: { min: -420, max: -60 },
        gravityY: 1100,
        rotate: { min: 0, max: 360 },
        scale: { min: 0.5, max: 1.4 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 500, max: 900 },
        emitting: false,
      })
      .setDepth(DEPTH_OVERLAY);
    emitter.explode(70);
    this.scene.cameras.main.flash(120, 220, 240, 255);
    this.scene.audio?.play("hit", { pitch: 1.8, volume: 0.9 });
    this.bursts.push({ emitter, t: 0 });
  }

  /** เผื่อระบบเก่าเรียก — ตอนนี้ไม่มีอะไรต้องเก็บต่อผู้เล่น */
  end() {}

  update(delta) {
    const O = TRANSFORM.overlay;
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const o = this.overlays[i];
      o.t += delta;
      const grow = Math.min(o.t / (o.growMs ?? O.growMs), 1);
      const s = o.baseScale * (1 + (O.growTo - 1) * grow);
      const fs = o.fadeStartMs ?? O.fadeStartMs, fm = o.fadeMs ?? O.fadeMs;
      const fade = o.t < fs ? 1 : 1 - (o.t - fs) / fm;
      o.sprite.setScale(s).setAlpha(Math.max(0, fade)); // กลับด้านด้วย flipX แล้ว scale จึงเป็นบวกเสมอ
      if (o.player?.active) o.sprite.setPosition(o.player.x, o.player.body.bottom);
      if (fade <= 0) {
        o.sprite.destroy();
        this.overlays.splice(i, 1);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += delta;
      if (b.t > 1200) {
        b.emitter.destroy();
        this.bursts.splice(i, 1);
      }
    }
  }
}
