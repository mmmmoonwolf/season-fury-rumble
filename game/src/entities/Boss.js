import { BOSS } from "../config/boss.config.js";

/**
 * บอสประจำแมพ
 *
 * ตั้งใจให้ "โง่แต่หนัก" — ไม่ไล่ล่า ไม่มี AI ซับซ้อน แค่ยืนอยู่แล้วทุบพื้นเป็นจังหวะ
 * เพราะสิ่งที่ต้องท้าทายคือ "ผู้เล่นสองคนจะจัดการกันเองยังไง" ไม่ใช่ตัวบอส
 * ถ้าบอสฉลาดและไล่กัด ผู้เล่นจะเอาแต่หนี ไม่มีเวลามาแย่งทีสุดท้ายกัน ซึ่งเป็นหัวใจของอีเวนต์นี้
 *
 * ไม่รับ knockback และไม่มี hitstun — ตีได้เรื่อย ๆ ไม่มีการล็อกท่า
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  static TEXTURE = "boss_bass";

  static preload(scene) {
    scene.load.image(Boss.TEXTURE, "assets/characters/boss_bass.png");
  }

  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} groundY ระดับพื้นของแมพ
   */
  constructor(scene, x, groundY) {
    super(scene, x, groundY, Boss.TEXTURE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = BOSS.hp;
    this.maxHp = BOSS.hp;
    this.facing = -1;
    /** ยังวาร์ปลงไม่เสร็จ = ตียังไม่โดนและยังไม่ทุบ */
    this.warping = true;
    this.dead = false;
    /** ใครตีทีสุดท้าย — ใช้ตัดสินรางวัล */
    this.lastAttacker = null;

    this.setOrigin(0.5, 1);
    const scale = BOSS.worldHeight / this.height;
    this.setScale(scale);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    // hurtbox แคบกว่าภาพ — ภาพมีกล่องเครื่องดนตรีสะพายหลังยื่นออกมา ไม่ควรนับเป็นตัว
    this.body.setSize(this.width * 0.42, this.height * 0.92);
    this.body.setOffset(this.width * 0.34, this.height * 0.08);
    this.body.updateBounds(); // sync ขนาด body กับ scale ทันที (บั๊กเดิม: ตัวจมพื้นตอนเกิด)
    this.setDepth(6);

    this.y = groundY;
    this._slamTimer = BOSS.slam.intervalMs;
    this._slamPhase = null;
  }

  /** เรียกทุกเฟรมจาก BossSystem */
  update(dt, players) {
    if (this.dead || this.warping) return;

    // หันหน้าเข้าหาผู้เล่นที่ใกล้ที่สุด — อย่างเดียวที่บอส "คิด"
    const nearest = players.reduce(
      (best, p) => (best && Math.abs(best.x - this.x) < Math.abs(p.x - this.x) ? best : p),
      null
    );
    if (nearest) {
      this.facing = nearest.x >= this.x ? 1 : -1;
      this.setFlipX(this.facing === 1); // อาร์ตต้นฉบับหันซ้าย
    }

    this._tickSlam(dt);
  }

  /**
   * ท่าทุบพื้น: เงื้อ (สั่นตัว) → ทุบ (เปิด hitbox สองข้าง) → รอรอบถัดไป
   * ช่วงเงื้อยาว 0.7 วิ ตั้งใจให้ยาวพอที่ผู้เล่นจะกระโดดหลบทัน — บอสไม่ควรตีโดนแบบไม่มีทางเลี่ยง
   */
  _tickSlam(dt) {
    this._slamTimer -= dt;
    if (this._slamPhase === "windup" && this._slamTimer <= 0) {
      this._slamPhase = null;
      this._slamTimer = BOSS.slam.intervalMs;
      this._doSlam();
      return;
    }
    if (this._slamPhase === null && this._slamTimer <= 0) {
      this._slamPhase = "windup";
      this._slamTimer = BOSS.slam.windupMs;
      this.scene.tweens.add({
        targets: this,
        scaleY: this.scaleY * 0.94,
        yoyo: true,
        duration: BOSS.slam.windupMs / 2,
        ease: "Quad.easeOut",
      });
    }
  }

  _doSlam() {
    const s = BOSS.slam;
    // คลื่นกระแทกออกทั้งสองข้างพร้อมกัน — ยืนข้างไหนก็โดน ต้องกระโดดหลบอย่างเดียว
    this.scene.combat?.spawnHitbox({
      attacker: this,
      duration: s.activeMs,
      spec: s,
      feedsCombo: false,
      rectProvider: () => ({
        x: this.body.center.x - s.reach,
        y: this.body.bottom - s.hitboxHeight,
        w: s.reach * 2,
        h: s.hitboxHeight,
      }),
    });

    this.scene.cameras.main.shake(220, 0.008);
    this.scene.audio?.play("hitHeavy");
    this._spawnShockwave();
  }

  /** คลื่นกระแทก — วาดสด ไม่ใช้ asset */
  _spawnShockwave() {
    const g = this.scene.add.graphics().setDepth(7);
    const y = this.body.bottom - 6;
    const state = { r: 20, alpha: 0.85 };
    this.scene.tweens.add({
      targets: state,
      r: BOSS.slam.reach,
      alpha: 0,
      duration: 340,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, 0xffe08a, state.alpha);
        g.strokeEllipse(this.body.center.x, y, state.r * 2, state.r * 0.5);
      },
      onComplete: () => g.destroy(),
    });
  }

  /**
   * โดนตี — โครงเดียวกับ Player.applyHit เพื่อให้ CombatSystem ใช้ได้โดยไม่ต้องแยกเคส
   * แต่บอสไม่กระเด็นและไม่ติด hitstun (ตัวใหญ่เกินกว่าจะโดนหมัดผลัก)
   */
  applyHit({ damage }, attacker) {
    if (this.dead || this.warping) return;
    this.hp = Math.max(0, this.hp - damage * BOSS.damageTaken);
    if (attacker) this.lastAttacker = attacker;

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());

    if (this.hp <= 0) this.dead = true;
  }
}
