/**
 * เงาใต้เท้าตัวละคร
 *
 * ตัวละครถูกวาดมาบนพื้นขาวไม่มีเงา พอวางบนฉากที่มีแสงของตัวเองเลยดู "ลอย" ไม่ติดพื้น
 * เงาวงรีใต้เท้าเป็นวิธีที่ถูกที่สุดที่แก้เรื่องนี้ — ไม่ต้องแตะอาร์ตเลยสักเฟรม
 *
 * สองอย่างที่ทำให้มันอ่านเป็นเงาจริง ไม่ใช่จานสีดำแปะพื้น:
 *  1. เงาอยู่ที่ "ระดับพื้น" เสมอ ไม่ได้ติดตัวละคร — ตอนกระโดด ตัวลอยขึ้นแต่เงาอยู่ที่เดิม
 *  2. ยิ่งลอยสูง เงายิ่งเล็กลงและจางลง (เหมือนแหล่งแสงอยู่ด้านบน)
 */

/** ค่าปรับแต่ง — จูนได้หมดโดยไม่ต้องแตะ logic */
export const SHADOW = {
  /** ความกว้างเงา เทียบกับความสูงตัวละคร (0.42 = กว้างราว 42% ของส่วนสูง) */
  widthRatio: 0.5,
  /** ความแบน — ยิ่งน้อยยิ่งแบน (มุมกล้องเกมนี้มองจากด้านข้างเกือบระนาบ เงาจึงต้องแบนมาก) */
  flatness: 0.22,
  /** ความทึบตอนยืนติดพื้น */
  baseAlpha: 0.55,
  /** ลอยสูงเกินกี่ px ถึงจะจางหายหมด */
  fadeHeight: 260,
  /** เล็กลงเหลือกี่เท่าตอนลอยสูงสุด */
  minScale: 0.45,

  /**
   * เงาสะท้อนบนพื้นเปียก — คนละอย่างกับเงาใต้เท้า
   * แมพทั้ง 3 เป็นพื้นเปียกมีแสงสะท้อนหมด บนพื้นแบบนี้ "เงาดำ" แทบไม่ช่วยอะไร
   * เพราะพื้นมันมืดอยู่แล้ว สิ่งที่ทำให้ของวางอยู่บนพื้นเปียกจริง ๆ คือเงาสะท้อนหัวกลับ
   */
  reflection: {
    enabled: true,
    /** ความทึบตอนยืนติดพื้น */
    alpha: 0.26,
    /** บีบแนวตั้งเหลือกี่เท่า (พื้นมองจากมุมเกือบระนาบ เงาสะท้อนจึงสั้นกว่าตัวจริงมาก) */
    squash: 0.55,
    /** จางหมดเมื่อลอยสูงเกินกี่ px */
    fadeHeight: 200,
  },
};

const TEXTURE_KEY = "character_shadow";
const TEX_SIZE = 128;

export class ShadowSystem {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.entries = [];
    ShadowSystem.ensureTexture(scene);
  }

  /**
   * สร้าง texture เงาแบบไล่ระดับจากกลางออกขอบ (วาดเอง ไม่ใช้ไฟล์ภาพ)
   * วาดเป็นวงกลมซ้อนกันหลายชั้นแล้วค่อย ๆ ลดความทึบ = ขอบนุ่มโดยไม่ต้องใช้ shader
   */
  static ensureTexture(scene) {
    if (scene.textures.exists(TEXTURE_KEY)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // ซ้อนวงกลมทึบน้อย ๆ หลายชั้น รัศมีลดแบบไม่เชิงเส้น → ตรงกลางเข้ม ขอบฟุ้งนุ่ม
    const steps = 26;
    for (let i = steps; i > 0; i--) {
      const t = i / steps;
      g.fillStyle(0x000000, 0.09);
      g.fillCircle(TEX_SIZE / 2, TEX_SIZE / 2, (TEX_SIZE / 2) * Math.pow(t, 1.35));
    }
    g.generateTexture(TEXTURE_KEY, TEX_SIZE, TEX_SIZE);
    g.destroy();
  }

  /**
   * ผูกเงาให้ตัวละครหนึ่งตัว
   * @param {import("../entities/Player.js").Player} player
   * @param {number} groundY ระดับพื้นที่เงาจะไปวางอยู่
   */
  attach(player, groundY) {
    const width = player.displayHeight * SHADOW.widthRatio;
    const image = this.scene.add
      .image(player.x, groundY, TEXTURE_KEY)
      .setDepth(-1) // ใต้ตัวละคร แต่เหนือ background (-10) และ platform overlay (-5)
      .setDisplaySize(width, width * SHADOW.flatness)
      .setAlpha(SHADOW.baseAlpha);

    let reflection = null;
    if (SHADOW.reflection.enabled) {
      // ก๊อปสไปรท์ตัวละครแบบกลับหัว วางต่อจากเท้าลงไป
      reflection = this.scene.add
        .image(player.x, groundY, player.texture.key, player.frame.name)
        .setDepth(-2) // ใต้เงาใต้เท้าอีกที
        .setOrigin(0.5, player.originY)
        .setFlipY(true)
        .setAlpha(SHADOW.reflection.alpha);
    }

    this.entries.push({ player, image, reflection, groundY, width });
  }

  update() {
    for (const e of this.entries) {
      const { player, image, reflection } = e;
      if (!player.active) {
        image.setVisible(false);
        reflection?.setVisible(false);
        continue;
      }
      // ระยะจากเท้าถึงพื้น — ใช้ขอบล่างของ physics body ไม่ใช่ y ของ sprite
      // (sprite มี origin อยู่เกือบล่างสุดแต่ไม่เป๊ะ และแต่ละตัวละครไม่เท่ากัน)
      const height = Math.max(0, e.groundY - player.body.bottom);
      const t = Math.min(height / SHADOW.fadeHeight, 1);

      const scale = 1 - (1 - SHADOW.minScale) * t;
      e.width = player.displayHeight * SHADOW.widthRatio; // ขนาดตัวเปลี่ยนได้ (แปลงร่าง) — คิดใหม่ทุกเฟรม
      image
        .setVisible(true)
        .setPosition(player.x, e.groundY)
        .setDisplaySize(e.width * scale, e.width * SHADOW.flatness * scale)
        .setAlpha(SHADOW.baseAlpha * (1 - t));

      if (!reflection) continue;
      const r = SHADOW.reflection;
      const rt = Math.min(height / r.fadeHeight, 1);
      reflection
        .setVisible(true)
        .setTexture(player.texture.key, player.frame.name) // ตามเฟรมปัจจุบันของตัวละคร
        .setFlipX(player.flipX)
        .setTint(player.tintTopLeft)
        // จุดยึดของสไปรท์ไม่ได้อยู่ที่ปลายเท้าพอดีทุกตัวละคร (Bomb เผื่อขอบล่างไว้ 40px)
        // จึงชดเชยด้วยระยะจริงจากจุดยึดถึงพื้นเท้า ไม่งั้นเงาสะท้อนจะหลุดจากเท้าไปข้างล่าง
        .setPosition(player.x, e.groundY + height + (player.body.bottom - player.y) * r.squash)
        .setScale(player.scaleX, player.scaleY * r.squash) // กลับหัวด้วย flipY แล้ว scale จึงเป็นบวก
        .setAlpha(r.alpha * (1 - rt));
    }
  }
}
