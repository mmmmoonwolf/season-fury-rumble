import { HIT_FLASH_DURATION, HITSTOP } from "../config/combat.config.js";

/**
 * ตัวกลางจัดการการปะทะ — ไม่ใช้ Arcade physics overlap เพราะ hitbox ของหมัด
 * มีอายุแค่ไม่กี่สิบมิลลิวินาที การสร้าง/ทำลาย body จริงทุกหมัดสิ้นเปลืองเกินจำเป็น
 * ใช้เช็ค AABB ตรงๆ ต่อเฟรมแทน (ผู้เล่นมีไม่กี่คน ถูกกว่ามาก)
 *
 * หน้าที่:
 *  - เก็บ hitbox ที่ยัง active อยู่ แล้วเช็คชนกับ hurtbox (body) ของคนอื่น
 *  - กันไม่ให้หมัดเดียวกันโดนคนเดิมซ้ำ (แต่ละ hitbox จำรายชื่อคนที่โดนแล้ว)
 *  - ส่งดาเมจ/knockback/hitstun ให้เหยื่อ แล้วแจ้ง scene ผ่าน onHit
 */
export class CombatSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {(victim, attacker, damage, blocked, spec) => void} onHit เรียกทุกครั้งที่มีหมัดเข้า (scene เอาไปหัก HP)
   *        spec ส่งไปด้วยตั้งแต่ v32 — scene อ่าน spec.trueDamage (ไม่สนการกัน/การลดดาเมจของเหยื่อ)
   */
  constructor(scene, onHit) {
    this.scene = scene;
    this.onHit = onHit;
    /** @type {Array<object>} hitbox ที่ยังเปิดอยู่ */
    this.active = [];
    this.fx = scene.add.graphics().setDepth(45);
  }

  /**
   * เปิด hitbox หนึ่งอัน
   * @param {object} opts
   * @param {Phaser.GameObjects.Sprite} opts.attacker
   * @param {number} opts.duration อายุ hitbox (ms)
   * @param {object} opts.spec ค่าจาก combat.config (reach, damage, knockback...)
   * @param {boolean} [opts.isFinalHit] หมัดปิดชุด — ใช้ค่า knockback ชุดใหญ่
   * @param {() => {x:number,y:number,w:number,h:number}} [opts.rectProvider]
   *        กรอบ hitbox แบบกำหนดเอง เรียกทุกเฟรม — ใช้กับท่าที่ระยะโจมตีไม่ได้ติดตัวผู้โจมตี
   *        (เช่น ร่างที่เรียกออกมา ซึ่งลอยอยู่คนละที่กับเจ้าของท่า)
   * @param {boolean} [opts.feedsCombo] หมัดนี้นับเข้าคอมโบเพื่อปลดล็อกไม้ตายไหม (ดีฟอลต์ = นับ)
   */
  spawnHitbox({ attacker, duration, spec, isFinalHit = false, rectProvider = null, feedsCombo = true }) {
    this.active.push({
      attacker,
      spec,
      isFinalHit,
      rectProvider,
      feedsCombo,
      remaining: duration,
      alreadyHit: new Set(), // กันหมัดเดียวโดนคนเดิมหลายรอบ
    });
  }

  /** ล้าง hitbox ของคนคนหนึ่งทั้งหมด (เช่น ตอนโดนสวนกลางคัน / ตาย / respawn) */
  clearFor(attacker) {
    this.active = this.active.filter((h) => h.attacker !== attacker);
  }

  clearAll() {
    this.active.length = 0;
  }

  /**
   * @param {number} delta ms
   * @param {Array} players รายชื่อผู้เล่นทั้งหมดที่ยังอยู่ในสนาม
   * @param {(p) => boolean} isAlive
   */
  update(delta, players, isAlive) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const box = this.active[i];
      box.remaining -= delta;

      const rect = this._hitboxRect(box);
      // v34 ตาบอด (confetti ของ Dear V.2): หมัดวืดทั้งหมด — ป้าย MISS ครั้งเดียวต่อหมัด
      if (box.attacker.isBlinded?.()) {
        if (!box.missShown) {
          box.missShown = true;
          this.scene.showFloatLabel?.(box.attacker, "MISS", "#cbd5e1");
        }
        if (box.remaining <= 0) this.active.splice(i, 1);
        continue;
      }
      // v34 เป้าที่ไม่ใช่ผู้เล่น (ตัวตลกหัวล้าน) — มีกรอบ hurtRect() + takeHit() · เจ้าของตีไม่โดน
      for (const t of this.extraTargets?.() ?? []) {
        if (t.owner === box.attacker || t.done || box.alreadyHit.has(t)) continue;
        const r = t.hurtRect();
        if (!(rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y)) continue;
        box.alreadyHit.add(t);
        const s = box.spec;
        t.takeHit(box.isFinalHit ? (s.finalDamage ?? s.damage) : (s.damagePerHit ?? s.damage), box.attacker);
      }
      for (const victim of players) {
        if (victim === box.attacker) continue;
        if (!isAlive(victim)) continue;
        if (victim.isInvulnerable?.()) continue; // เช่น กำลังแปลงร่าง
        if (box.alreadyHit.has(victim)) continue;
        if (!this._overlaps(rect, victim)) continue;

        box.alreadyHit.add(victim);
        this._resolveHit(box, victim, rect);
      }

      if (box.remaining <= 0) this.active.splice(i, 1);
    }
  }

  /**
   * คำนวณกรอบ hitbox จากตำแหน่ง+ทิศทางของผู้โจมตี ณ เฟรมนี้ (ตามตัวไปด้วยตอนพุ่ง)
   *
   * ใช้ body.x/right/width ตรงๆ ไม่คูณ scale ซ้ำ — Arcade body ถูกสเกลตาม sprite
   * ให้แล้วตั้งแต่ updateBounds() ค่าที่อ่านได้จึงเป็นพิกเซลในโลกเกมอยู่แล้ว
   */
  _hitboxRect(box) {
    if (box.rectProvider) return box.rectProvider();
    const a = box.attacker;
    const s = box.spec;
    // โจมตีรอบตัว (เช่น หนามคริสตัล) — กรอบกลางตัว ยืนบนพื้นระดับเท้า
    if (s.aoe) {
      return { x: a.x - s.aoe.halfWidth, y: a.body.bottom - s.aoe.height, w: s.aoe.halfWidth * 2, h: s.aoe.height };
    }
    const w = s.reach;
    const h = s.hitboxHeight;
    const x = a.facing === 1 ? a.body.right : a.body.x - w;
    const y = a.body.center.y + (s.hitboxYOffset ?? 0) - h / 2;
    return { x, y, w, h };
  }

  /** AABB ระหว่าง hitbox กับ hurtbox (= physics body ของเหยื่อ) */
  _overlaps(rect, victim) {
    const b = victim.body;
    return rect.x < b.right && rect.x + rect.w > b.x && rect.y < b.bottom && rect.y + rect.h > b.y;
  }

  _resolveHit(box, victim, rect) {
    const s = box.spec;
    // radial = กระเด็นออกจากตัวผู้โจมตี (ไม่ว่าอยู่ซ้ายหรือขวา) · ปกติ = ตามทิศที่หัน
    const dir = s.radial ? Math.sign(victim.x - box.attacker.x) || box.attacker.facing : box.attacker.facing;

    // คูณด้วยบัฟของผู้โจมตี (รางวัลจากการเก็บบอสทีสุดท้าย) — ไม่มีบัฟก็เป็น 1
    const base = box.isFinalHit ? (s.finalDamage ?? s.damage) : (s.damagePerHit ?? s.damage);
    const damage = Math.round(base * (box.attacker.damageMultiplier ?? 1));
    const kbX = box.isFinalHit ? (s.finalKnockbackX ?? s.knockbackX) : (s.holdKnockbackX ?? s.knockbackX);
    const kbY = box.isFinalHit ? (s.finalKnockbackY ?? s.knockbackY) : (s.holdKnockbackY ?? s.knockbackY);
    const stun = box.isFinalHit ? (s.finalHitstun ?? s.hitstun) : s.hitstun;

    // จำไว้ก่อน applyHit — หมัดที่ทำให้การ์ดแตกจะเปลี่ยน state ของเหยื่อไปแล้วหลังเรียก
    const blocked = !!victim.isBlocking?.();

    // ส่ง attacker ไปด้วย — บอสใช้ตัดสินว่าใครตีทีสุดท้าย (Player ไม่สนใจพารามิเตอร์นี้)
    victim.applyHit({ damage, knockbackX: kbX * dir, knockbackY: kbY, hitstun: stun }, box.attacker);
    this.onHit?.(victim, box.attacker, damage, blocked, s);

    // Hitstop — หยุดภาพทั้งจอชั่วครู่ (การ์ดแตกสั่งค่าที่ยาวกว่าเองจาก Player — scene เลือกค่ามากสุด)
    const isMulti = s.damagePerHit != null && !box.isFinalHit;
    const kind = s.hitstopKind ?? (box.isFinalHit ? "heavy" : isMulti ? "multiHit" : "normal");
    const stopMs = blocked ? HITSTOP.blocked : HITSTOP[kind];
    this.scene.hitstop?.(stopMs * (s.hitstopMul ?? 1)); // ร่างไททัน: หมัด 1-2-3 หยุดนานขึ้น
    if (s.heavyShake && !blocked) this.scene.cameras.main.shake(160, 0.011);

    // แจ้งผู้โจมตีว่าหมัดนี้เข้า — ใช้ตัดสินว่าคอมโบจบท่าจะปลดล็อกไหม
    if (box.feedsCombo !== false) box.attacker.notifyHitLanded?.();

    // เสียงตบโดน — เล่นคู่กับประกาย/กล้องสั่น ให้ impact มาพร้อมกันทั้งภาพและเสียง
    if (!blocked) this.scene.audio?.playHit(box.isFinalHit); // เสียงกันเล่นจาก Player.applyHit แล้ว

    const sparkX = s.aoe ? victim.x : rect.x + (dir === 1 ? rect.w : 0);
    this._spawnHitSpark(sparkX, victim.body.center.y - 20, box.isFinalHit || s.hitstopKind === "heavy" || s.hitstopKind === "sonic", blocked);
  }

  /** ประกายตอนโดน — วงกลมขาวขยายแล้วจาง ไม่ใช้ particle เพราะแค่ครั้งเดียวสั้นๆ */
  _spawnHitSpark(x, y, big, blocked = false) {
    const g = this.scene.add.graphics().setDepth(46);
    const radius = big ? 34 : blocked ? 14 : 18;
    g.fillStyle(blocked ? 0xbfdbfe : 0xffffff, 0.9); // โดนกัน = ประกายฟ้าเล็ก แยกจากหมัดเข้า
    g.fillCircle(0, 0, radius);
    g.lineStyle(3, big ? 0xff5555 : blocked ? 0x60a5fa : 0xffcc55, 1);
    g.strokeCircle(0, 0, radius);
    g.setPosition(x, y);

    this.scene.tweens.add({
      targets: g,
      scale: { from: 0.5, to: big ? 2.0 : 1.4 },
      alpha: { from: 1, to: 0 },
      duration: big ? 260 : 150,
      onComplete: () => g.destroy(),
    });

    if (big) this.scene.cameras.main.shake(180, 0.009); // v26: แรงขึ้น (เดิม 140, 0.006)
  }

  /** ไฟกระพริบแดงบนตัวเหยื่อ — เรียกจาก Player.applyHit */
  static flashVictim(scene, victim) {
    victim.setTintFill?.(0xffffff);
    scene.time.delayedCall(HIT_FLASH_DURATION, () => {
      victim.clearTint();
      // คืน tint ที่ scene ตั้งไว้ (โทนแมพ + สีแยกฝั่ง) — เดิมคืนแค่สีส้มของ P2 โทนแมพเลยหายหลังโดนตีครั้งแรก
      if (victim.baseTint != null) victim.setTint(victim.baseTint);
      else if (victim.playerIndex === 1) victim.setTint(0xffb37a);
    });
  }
}
