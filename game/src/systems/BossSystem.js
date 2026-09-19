import { BOSS } from "../config/boss.config.js";
import { Boss } from "../entities/Boss.js";

/**
 * อีเวนต์บอส — คุมทั้งจังหวะการโผล่ เวลานับถอยหลัง HUD และการแจกรางวัล
 *
 * โครงของอีเวนต์: เว้นช่วง → วาร์ปลง → ผู้เล่นมีเวลาจำกัดช่วยกันเก็บ → คนตีทีสุดท้ายได้บัฟ
 * ถ้าหมดเวลาก่อน บอสหนีไปเฉย ๆ ไม่มีใครได้อะไร (ไม่ลงโทษ แต่ก็ไม่ให้ฟรี)
 *
 * ตั้งใจไม่ให้บอสฆ่าผู้เล่นได้ง่าย — จุดประสงค์คือ "ป่วน" ให้คู่แข่งต้องหยุดตีกันชั่วคราว
 * ไม่ใช่ด่านที่ต้องผ่าน ถ้าบอสอันตรายเกินไปผู้เล่นจะเลี่ยงไม่ยุ่งกับมันเลย แล้วอีเวนต์จะไร้ความหมาย
 */
export class BossSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Array} players
   * @param {number} groundY
   */
  constructor(scene, players, groundY) {
    this.scene = scene;
    this.players = players;
    this.groundY = groundY;

    /** @type {Boss|null} */
    this.boss = null;
    this.timer = BOSS.firstSpawnDelay;
    this.remaining = 0;
    this.auras = new Map(); // player -> graphics

    this._buildHud();
  }

  static preload(scene) {
    Boss.preload(scene);
  }

  _buildHud() {
    const width = this.scene.sys.game.config.width;
    this.hud = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(90).setVisible(false);

    this.hudBarBg = this.scene.add.rectangle(width / 2, 58, 420, 16, 0x000000, 0.55).setOrigin(0.5);
    this.hudBar = this.scene.add.rectangle(width / 2 - 210, 58, 420, 16, 0xe0483c).setOrigin(0, 0.5);
    this.hudText = this.scene.add
      .text(width / 2, 36, "", { font: "18px monospace", color: "#ffd34d", stroke: "#0f172a", strokeThickness: 4 })
      .setOrigin(0.5);
    this.hud.add([this.hudBarBg, this.hudBar, this.hudText]);
  }

  update(dt, isAlive) {
    this._tickAuras(dt);

    if (!this.boss) {
      if (!BOSS.enabled) return; // ปิดอีเวนต์บอสไว้ (ดู boss.config.js) — ไม่นับเวลาถอยหลัง ไม่โผล่
      this.timer -= dt;
      if (this.timer <= 0) this._spawn();
      return;
    }

    this.boss.update(dt, this.players.filter(isAlive));
    if (this._escaping) { this._tickAuras(0); return; }

    if (this.boss.dead) {
      this._defeated();
      return;
    }

    if (this._escaping) return; // กำลังจางหายอยู่ อย่าสั่งหนีซ้ำทุกเฟรม
    this.remaining -= dt;
    this._updateHud();
    if (this.remaining <= 0) this._escape();
  }

  /** บอสเป็นเป้าให้ hitbox ของผู้เล่นด้วย — scene เอาไปต่อท้ายลิสต์เป้าหมาย */
  targets() {
    return this.boss && !this.boss.dead && !this.boss.warping ? [this.boss] : [];
  }

  _spawn() {
    const w = this.scene.level.worldWidth;
    // โผล่กลางระหว่างผู้เล่นสองคน — บังคับให้ทั้งคู่ต้องขยับ ไม่ใช่โผล่มุมใดมุมหนึ่งแล้วคนหนึ่งเมิน
    const xs = this.players.map((p) => p.x);
    const midX = Phaser.Math.Clamp((Math.min(...xs) + Math.max(...xs)) / 2, w * 0.15, w * 0.85);

    this.boss = new Boss(this.scene, midX, this.groundY);
    this.remaining = BOSS.timeLimit;
    this.hud.setVisible(true);
    this._warpIn();
  }

  /** วาร์ปลงมา: ลำแสงจากฟ้า + ตัวบอสร่วงลงมาแล้วกระแทกพื้น */
  _warpIn() {
    const b = this.boss;
    b.setAlpha(0);
    b.y = this.groundY - 420;

    const beam = this.scene.add
      .rectangle(b.x, this.groundY, 90, this.scene.level.worldHeight, 0xffd34d, 0.35)
      .setOrigin(0.5, 1)
      .setDepth(5);
    this.scene.tweens.add({ targets: beam, alpha: 0, duration: BOSS.warpInMs, onComplete: () => beam.destroy() });

    this.scene.tweens.add({
      targets: b,
      alpha: 1,
      y: this.groundY,
      duration: BOSS.warpInMs,
      ease: "Quad.easeIn",
      onComplete: () => {
        b.warping = false;
        this.scene.cameras.main.shake(300, 0.012);
        this.scene.audio?.play("hitHeavy");
        this._flash("BOSS!");
      },
    });
  }

  _updateHud() {
    const b = this.boss;
    this.hudBar.width = 420 * (b.hp / b.maxHp);
    this.hudText.setText(`BOSS   ${Math.ceil(this.remaining / 1000)}s`);
  }

  _defeated() {
    const winner = this.boss.lastAttacker;
    this._explode(this.boss.x, this.boss.body.center.y);
    this.boss.destroy();
    this.boss = null;
    this.hud.setVisible(false);
    this.timer = Phaser.Math.Between(BOSS.respawnDelayMin, BOSS.respawnDelayMax);

    if (winner && winner.applyPowerBuff) {
      winner.applyPowerBuff(BOSS.reward.durationMs, BOSS.reward.damageMultiplier);
      this._attachAura(winner);
      this._flash(`${winner.constructor.DISPLAY_NAME} POWER UP!`);
    }
  }

  /** หมดเวลา — บอสหายไปเฉย ๆ ไม่มีใครได้บัฟ */
  _escape() {
    this._escaping = true;
    this.scene.tweens.add({
      targets: this.boss,
      alpha: 0,
      y: this.groundY - 300,
      duration: 500,
      onComplete: () => {
        this.boss?.destroy();
        this.boss = null;
        this._escaping = false;
      },
    });
    this.hud.setVisible(false);
    this.timer = Phaser.Math.Between(BOSS.respawnDelayMin, BOSS.respawnDelayMax);
    this._flash("BOSS ESCAPED");
  }

  _explode(x, y) {
    const g = this.scene.add.graphics().setDepth(47);
    const st = { r: 20, alpha: 1 };
    this.scene.cameras.main.shake(400, 0.02);
    this.scene.audio?.play("ko");
    this.scene.tweens.add({
      targets: st,
      r: 320,
      alpha: 0,
      duration: 520,
      onUpdate: () => {
        g.clear();
        g.lineStyle(8, 0xffd34d, st.alpha);
        g.strokeCircle(x, y, st.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  // ---------- ออร่าของคนที่เก็บทีสุดท้าย ----------

  _attachAura(player) {
    this.auras.get(player)?.destroy();
    const g = this.scene.add.graphics().setDepth(4); // หลังตัวละคร
    this.auras.set(player, g);
  }

  _tickAuras(dt) {
    for (const [player, g] of this.auras) {
      if (!player.buffTimer || player.buffTimer <= 0) {
        g.destroy();
        this.auras.delete(player);
        continue;
      }
      // วงแสงเต้นตามจังหวะ + จางลงเมื่อบัฟใกล้หมด = อ่านเวลาที่เหลือได้จากตัวละครโดยไม่ต้องดู HUD
      const t = this.scene.time.now / 220;
      const fade = Math.min(1, player.buffTimer / 2500);
      const rx = player.displayWidth * 0.75 + Math.sin(t) * 5;
      const ry = player.displayHeight * 0.62 + Math.cos(t * 1.3) * 5;
      g.clear();
      g.lineStyle(4, BOSS.reward.auraColor, 0.55 * fade);
      g.strokeEllipse(player.x, player.body.center.y, rx * 2, ry * 2);
      g.lineStyle(2, 0xffffff, 0.35 * fade);
      g.strokeEllipse(player.x, player.body.center.y, rx * 1.7, ry * 1.7);
    }
  }

  _flash(message) {
    this.scene._flashToast?.(message);
  }

  /** เรียกตอน restart รอบใหม่ */
  reset() {
    this.boss?.destroy();
    this.boss = null;
    for (const g of this.auras.values()) g.destroy();
    this.auras.clear();
    this.hud.setVisible(false);
    this.timer = BOSS.firstSpawnDelay;
  }
}
