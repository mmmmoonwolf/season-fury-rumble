import { STAND, STAND_SLASH } from "../config/stand.config.js";

/**
 * ร่างยมฑูตที่ถูกเรียกออกมา — ไม่ใช่ตัวละคร ไม่มี physics body ไม่ชนอะไรทั้งนั้น
 * มันคือ "เอฟเฟกต์ที่ทำดาเมจ" เท่านั้น hitbox ไปฝากไว้กับ CombatSystem โดยผูก attacker = เจ้าของท่า
 * (ดาเมจจึงเข้าบัญชีคนเรียก และไม่ต้องมีโค้ดเช็คทีมใครทีมมัน)
 *
 * ⚠️ อาร์ต placeholder: ตอนนี้ยืมเฟรมท่าตบของเจ้าของท่ามาย้อมฟ้าซีด+ทำโปร่ง
 * ของจริงต้องเป็นร่างคลุมฮู้ด ไม่มีขา ชายชุดสลายเป็นริ้ว หน้าอยู่ในเงาฮู้ด
 * เปลี่ยนแค่ตั้ง STAND_TEXTURE ด้านล่างให้ชี้ atlas ใหม่ ที่เหลือไม่ต้องแก้
 *
 * สามชั้นที่ทำให้มันอ่านเป็น "ลอยออกมาแล้วหาย" ไม่ใช่ตัวละครที่มาร่วมฉาก:
 *  1. เวลา — อยู่รวมไม่ถึงครึ่งวินาที
 *  2. ความโปร่ง + ร่างซ้อนจาง ๆ (afterimage) — ขอบไม่นิ่งเหมือน sprite ทึบ
 *  3. ไม่แตะพื้น ไม่มีเงา ลอยขึ้นลงตลอด แล้วสลายขึ้นข้างบน
 */

/**
 * atlas ของร่างจริง — ตั้งเป็น null เมื่อไหร่ ระบบจะกลับไปยืมสไปรท์ของเจ้าของท่าเป็น placeholder
 * ไฟล์นี้สร้างจาก make_reaper.py (แปลงอาร์ตทึบ → วิญญาณ แล้ว pack เป็น atlas)
 */
const STAND_TEXTURE = {
  key: "reaper",
  texturePath: "assets/characters/reaper_atlas.png",
  dataPath: "assets/characters/reaper_atlas.json",
  /** เฟรมของแต่ละช่วงในไทม์ไลน์ */
  frames: { rise: "rise.png", windup: "windup.png", swing: "swing.png" },
};

export class Stand {
  /** โหลด atlas ของร่าง — เรียกใน scene.preload() */
  static preload(scene) {
    if (!STAND_TEXTURE) return;
    scene.load.atlas(STAND_TEXTURE.key, STAND_TEXTURE.texturePath, STAND_TEXTURE.dataPath);
  }

  /**
   * @param {Phaser.Scene} scene
   * @param {import("./Player.js").Player} owner ผู้เรียก — ใช้เป็น attacker ของ hitbox
   */
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.facing = owner.facing;
    this.done = false;

    const cfg = STAND.visual;
    const originX = owner.x + STAND.offsetX * this.facing;
    const originY = owner.body.center.y + STAND.offsetY;
    this.x = originX;
    this.y = originY;

    // ---------- ร่างหลัก + ร่างซ้อน ----------
    // มี atlas จริงไหม (ถ้าโหลดไม่ติดด้วยเหตุผลอะไรก็ตาม ให้ตกกลับไปใช้ placeholder แทนที่จะพัง)
    this.hasArt = !!STAND_TEXTURE && scene.textures.exists(STAND_TEXTURE.key);
    const tex = this.hasArt
      ? { key: STAND_TEXTURE.key, frame: STAND_TEXTURE.frames.rise }
      : { key: owner.texture.key, frame: owner.frame.name };
    this.sprites = [];
    for (let i = cfg.afterimages; i >= 0; i--) {
      const isMain = i === 0;
      const s = scene.add
        .sprite(originX - this.facing * cfg.afterimageOffset * i, originY, tex.key, tex.frame)
        .setDepth(44) // ใต้ hit spark (45) แต่เหนือผู้เล่น
        .setAlpha(0)
        .setTint(cfg.tint)
        .setFlipX(this.facing === -1)
        // ADD เฉพาะตอน placeholder — ภาพจริงย้อมสี/ไล่ความทึบมาแล้ว ถ้า ADD ทับจะสว่างจนหลุด
        .setBlendMode(cfg.additive || !this.hasArt ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);

      if (this.hasArt) {
        // ผืนภาพทุกเฟรมขนาดเท่ากัน (trimmed atlas + sourceSize เดียวกัน)
        // สเกลจากความสูงผืนภาพจึงคุมขนาดได้ตรง ๆ และเฟรมไม่กระโดดตอนสลับ
        s.setScale(STAND.worldHeight / STAND.sourceCanvasHeight);
      } else {
        s.setScale(owner.scaleX * STAND.placeholderHeightScale, owner.scaleY * STAND.placeholderHeightScale);
      }
      s.setAlpha(0);
      s._targetAlpha = isMain ? cfg.alpha : cfg.alpha * (cfg.afterimageAlphaRatio ?? 0.25);
      this.sprites.push(s);
    }
    this.main = this.sprites[this.sprites.length - 1];

    // เส้นคมเคียว — วาดสด ไม่ใช้ asset
    this.arc = scene.add.graphics().setDepth(46);

    this._runTimeline();
  }

  _runTimeline() {
    const { scene } = this;
    const cfg = STAND.visual;

    // 1) จางเข้า + ลอยขึ้นเล็กน้อย (โผล่จากด้านล่างเหมือนผุดขึ้นมา)
    for (const s of this.sprites) {
      s.y += 26;
      scene.tweens.add({
        targets: s,
        alpha: s._targetAlpha,
        y: s.y - 26,
        duration: STAND.appear,
        ease: "Sine.easeOut",
      });
    }
    // ลอยขึ้นลงตลอดเวลาที่อยู่ — ไม่แตะพื้น = ไม่ใช่สิ่งมีชีวิตที่ยืนอยู่ในฉาก
    this.bobTween = scene.tweens.add({
      targets: this.sprites,
      y: `-=${cfg.bob}`,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: STAND.appear,
    });

    // เปลี่ยนเฟรมตามช่วง: โผล่นิ่ง → เงื้อเคียว → ฟันลง
    scene.time.delayedCall(STAND.appear, () => this._setFrame("windup"));

    // 2) เหวี่ยงเคียว — เปิด hitbox พร้อมกับเส้นโค้งที่กวาด
    scene.time.delayedCall(STAND.appear + STAND.startup, () => this._swing());

    // 3) สลาย
    scene.time.delayedCall(STAND.appear + STAND.startup + STAND.active, () => this._dissolve());
  }

  /** สลับเฟรมทุกร่าง (ร่างหลัก + ร่างซ้อน) พร้อมกัน */
  _setFrame(phase) {
    if (this.done || !this.hasArt) return;
    for (const s of this.sprites) s.setFrame(STAND_TEXTURE.frames[phase]);
  }

  _swing() {
    if (this.done) return;
    this._setFrame("swing");
    const { scene } = this;
    const cfg = STAND.visual;

    scene.audio?.play("swing", { pitch: 0.62, volume: 1.5 }); // เสียงต่ำกว่าหมัดปกติ ให้รู้ว่าคนละระดับ

    // hitbox: ผูก attacker เป็นเจ้าของท่า แต่กรอบคำนวณจากตำแหน่งร่างที่เรียกออกมา
    // feedsCombo:false — ดาเมจจากท่านี้ไม่ควรไปปลดล็อกไม้ตายให้ฟรี ๆ
    this.owner.combat?.spawnHitbox({
      attacker: this.owner,
      duration: STAND.active,
      spec: STAND.spec,
      feedsCombo: false,
      rectProvider: () => ({
        x: this.facing === 1 ? this.main.x : this.main.x - STAND.spec.reach,
        y: this.main.y + STAND.spec.hitboxYOffset - STAND.spec.hitboxHeight / 2,
        w: STAND.spec.reach,
        h: STAND.spec.hitboxHeight,
      }),
    });

    // เส้นคมเคียวกวาดจากบนลงล่าง — ส่วนเดียวของท่านี้ที่คมชัด
    const sweep = { t: 0 };
    scene.tweens.add({
      targets: sweep,
      t: 1,
      duration: STAND.active,
      ease: "Cubic.easeIn",
      onUpdate: () => cfg.arcEnabled !== false && this._drawArc(sweep.t),
      onComplete: () => this.arc.clear(),
    });
  }

  /**
   * วาดคมเคียวเป็นส่วนโค้ง — หัวโค้งนำหน้า หางตามหลัง อ่านเป็นรอยกวาด
   * วาดรอบจุด (0,0) แล้วย้าย/กลับด้านที่ตัว graphics เอง จะได้ไม่ต้องคำนวณมุมกลับด้านเองตอนหันซ้าย
   */
  _drawArc(progress) {
    const cfg = STAND.visual;
    const from = Phaser.Math.DegToRad(cfg.arcFromDeg);
    const to = Phaser.Math.DegToRad(cfg.arcToDeg);
    const head = Phaser.Math.Linear(from, to, progress);
    const tail = Phaser.Math.Linear(from, head, 0.45);

    this.arc.clear();
    this.arc.setPosition(this.main.x, this.main.y);
    this.arc.setScale(this.facing, 1); // หันซ้าย = พลิกภาพทั้งอัน มุมที่คำนวณไว้ใช้ได้เหมือนเดิม

    // สองเส้นซ้อน: เส้นหนาจาง (แสงฟุ้ง) + เส้นบางสว่าง (คมจริง)
    for (const [width, alpha] of [
      [cfg.arcWidth * 2.4, 0.25 * (1 - progress * 0.4)],
      [cfg.arcWidth, 0.95 * (1 - progress * 0.3)],
    ]) {
      this.arc.lineStyle(width, cfg.arcColor, alpha);
      this.arc.beginPath();
      this.arc.arc(0, 0, cfg.arcRadius, tail, head);
      this.arc.strokePath();
    }
  }

  _dissolve() {
    if (this.done) return;
    this.done = true;
    this.bobTween?.remove();

    for (const s of this.sprites) {
      this.scene.tweens.add({
        targets: s,
        alpha: 0,
        y: s.y - 54, // สลายขึ้นข้างบน ไม่ใช่จางอยู่กับที่ — อ่านว่า "กลับไป" ไม่ใช่ "หายไปเฉย ๆ"
        scaleY: s.scaleY * 1.12,
        duration: STAND.dissolve,
        ease: "Sine.easeIn",
        onComplete: () => s.destroy(),
      });
    }
    this.scene.time.delayedCall(STAND.dissolve + 30, () => this.arc.destroy());
  }

  /** ยกเลิกกลางคัน (เจ้าของโดนสวน / ตาย / restart) */
  cancel() {
    if (this.done) return;
    this.owner.combat?.clearFor(this.owner);
    this._dissolve();
  }
}

/**
 * ร่างยมฑูตแบบ "วาบมาฟันแล้วหาย" — ใช้กับหมัดพื้นฐาน 1/2/3 และไม้ตายของ Bomb
 *
 * เป็นภาพล้วน ไม่มี hitbox ของตัวเอง: ดาเมจยังมาจาก BASIC_COMBO/FINISHER เหมือนตัวละครอื่น
 * ทำแบบนี้เพราะบาลานซ์ที่จูนไว้แล้วจะได้ไม่เปลี่ยน และถ้าอยากเลิกใช้ก็ปิดได้โดยไม่กระทบการต่อสู้เลย
 *
 * ทำไมไม่ใช้ Stand ตัวเต็ม: ท่าเรียกร่างเต็มกินเวลา ~0.6 วิ ซึ่งยาวกว่าหมัดหนึ่งครั้งทั้งหมัด
 * ถ้าเอามาใส่ทุกหมัด ร่างจะค้างซ้อนกันเป็นพรืดตอนตบรัว ๆ
 */
export class StandSlash {
  /**
   * @param {Phaser.Scene} scene
   * @param {import("./Player.js").Player} owner
   * @param {number} step จังหวะที่เท่าไหร่ของคอมโบ (0-2) — ใช้เลือกมุม/ระยะให้ไม่ซ้ำกัน
   */
  constructor(scene, owner, step = 0) {
    const cfg = STAND_SLASH;
    const i = step % cfg.frames.length;
    const facing = owner.facing;
    const off = cfg.offsets[i] ?? cfg.offsets[0];

    // ไม่มี atlas จริง = ไม่ต้องวาดอะไรเลย ดีกว่าเอาสไปรท์ของเจ้าของมาซ้อนตัวเองให้งง
    if (!scene.textures.exists("reaper")) return;

    const s = scene.add
      .sprite(owner.x + off.x * facing, owner.body.center.y + off.y, "reaper", `${cfg.frames[i]}.png`)
      .setDepth(44)
      .setFlipX(facing === -1)
      .setAlpha(0)
      .setAngle((cfg.angles[i] ?? 0) * facing)
      .setScale(cfg.worldHeight / cfg.sourceCanvasHeight);

    // วาบเข้า → ค้างสั้น ๆ → จางออกพร้อมเลื่อนไปข้างหน้าเล็กน้อย (อ่านเป็นการฟันผ่าน ไม่ใช่ยืนค้าง)
    scene.tweens.add({ targets: s, alpha: cfg.alpha, duration: cfg.appear, ease: "Quad.easeOut" });
    scene.tweens.add({
      targets: s,
      alpha: 0,
      x: s.x + 26 * facing,
      delay: cfg.appear + cfg.hold,
      duration: cfg.fade,
      ease: "Quad.easeIn",
      onComplete: () => s.destroy(),
    });
    this.sprite = s;
  }
}
