import { TITAN_SKILL3 as S3 } from "../config/combat.config.js";
import { CombatSystem } from "./CombatSystem.js";

/**
 * ไททันบ้า (สกิล 3 ของ OAT ร่างไททัน)
 *
 * spawn(owner) — เรียกจากท่าคำราม: ไททันบ้า 3 ตัวทยอยเกิดจากแสงกลางอากาศที่ขอบซ้ายของจอ
 *   แล้ววิ่งไปขอบขวาของจอ (ตำแหน่งจอ ณ ตอนเรียก)
 * ระหว่างวิ่ง: ชนคนที่ไม่ใช่เจ้าของ -> ลากไปด้วยจนสุดทาง แล้วเหวี่ยงทิ้ง
 *   กันทันตอนชน = ไม่โดนลาก (เสียมาตรการ์ด/ดาเมจเศษ) · ไททัน 1 ตัวลากได้ 1 คน
 * ไททันบ้าไม่โดนตี (ไม่ใช่เป้าของ CombatSystem) และไม่บล็อกการเคลื่อนที่ของใคร
 *
 * update(dt, targets, isAlive) — scene เรียกทุกเฟรม (hitstop ข้ามเฟรมไปด้วย ภาพจึงหยุดพร้อมกัน)
 * เอฟเฟกต์ภาพสร้างผ่าน this.scene.add.* ทั้งหมด (ในชุดทดสอบ stub ไว้)
 */
const ATLAS = "crazytitans";
const DEPTH_RUNNER = -0.5;  // หลังตัวละคร (คนที่โดนลากต้องอยู่หน้าไททัน)
const DEPTH_LIGHT = 30;

export class CrazyTitanSystem {
  constructor(scene) {
    this.scene = scene;
    /** @type {Runner[]} */
    this.runners = [];
    /** ตารางเรียกที่ยังไม่ถึงเวลา (หน่วงตาม delayMs) */
    this.pending = [];
  }

  /** เรียกไททันบ้าชุดใหม่ — ตำแหน่งขอบจอคิดตอนนี้ครั้งเดียว */
  spawn(owner) {
    const view = this._view();
    const startX = view.left + S3.startInset;
    const endX = view.right - S3.endInset;
    const floorY = owner.body.bottom;
    for (const def of S3.runners) {
      this.pending.push({ t: def.delayMs, def, owner, startX, endX, floorY });
    }
    this.scene.cameras?.main.flash(160, 255, 244, 214);
  }

  _view() {
    const cam = this.scene.cameras?.main;
    const wv = cam?.worldView;
    const b = this.scene.physics?.world?.bounds;
    const left = Math.max(wv?.x ?? 0, b?.x ?? -Infinity);
    const right = Math.min((wv?.x ?? 0) + (wv?.width ?? 1280), b ? b.x + b.width : Infinity);
    return { left, right };
  }

  update(dt, targets, isAlive) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) {
        this.pending.splice(i, 1);
        this.runners.push(this._createRunner(p));
      }
    }
    for (let i = this.runners.length - 1; i >= 0; i--) {
      const r = this.runners[i];
      r.update(dt, targets, isAlive);
      if (r.done) {
        r.destroy();
        this.runners.splice(i, 1);
      }
    }
  }

  /** ใครกำลังโดนลากอยู่ปล่อยทิ้งเงียบ ๆ (ใช้ตอนคนนั้นตาย) */
  dropVictim(victim) {
    for (const r of this.runners) if (r.victim === victim) r.victim = null;
    if (victim.isGrabbed?.()) victim.stateMachine.setState("idle", true);
  }

  _createRunner(p) {
    return new Runner(this.scene, p);
  }

  /** ภาพแสงวาบกลางอากาศ (วงเรืองแสงขยายแล้วจาง) */
  lightBurst(x, y, size) {
    const add = this.scene.add;
    if (!add?.circle) return;
    const glow = add.circle(x, y, size * 0.25, 0xfff4c2, 0.95).setDepth(DEPTH_LIGHT);
    glow.setBlendMode?.(Phaser.BlendModes.ADD);
    const ring = add.circle(x, y, size * 0.2).setStrokeStyle(4, 0xffffff, 0.9).setDepth(DEPTH_LIGHT);
    this.scene.tweens?.add({ targets: glow, scale: 2.6, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => glow.destroy() });
    this.scene.tweens?.add({ targets: ring, scale: 3.4, alpha: 0, duration: 420, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
  }
}

class Runner {
  constructor(scene, { def, owner, startX, endX, floorY }) {
    this.scene = scene;
    this.def = def;
    this.owner = owner;
    this.x = startX;
    this.endX = endX;
    this.floorY = floorY;
    this.t = 0;
    this.phase = "appear";
    this.victim = null;
    this.ignored = new Set([owner]); // ชนแล้วกันได้ = ไม่ชนซ้ำ
    this.done = false;
    this.scale = 1 / S3.storeMul;
    this.height = def.height;

    const sprite = scene.add?.sprite?.(startX, floorY, ATLAS, `${def.kind}_1.png`);
    if (sprite) {
      sprite
        .setOrigin(def.anchorX / def.canvas[0], def.feetY / def.canvas[1])
        .setScale(this.scale)
        .setDepth(DEPTH_RUNNER)
        .setAlpha(0);
      const tint = owner.baseTint;
      if (tint != null) sprite.setTint(tint);
      sprite.play?.(`crazy/${def.kind}`);
    }
    this.sprite = sprite;
    this.shadow = scene.add?.ellipse?.(startX, floorY, def.height * 0.55, 14, 0x000000, 0).setDepth(DEPTH_RUNNER - 0.2);
    scene.crazyTitans?.lightBurst(startX, floorY - def.height * 0.75, def.height);
    scene.audio?.play("swing", { pitch: 0.7, volume: 0.8 });
  }

  /** กรอบที่ชนได้: ลำตัว + ระยะด้านหน้า (วิ่งไปทางขวาเสมอ) */
  hitRect() {
    const w = this.def.height * 0.18;
    return { x: this.x - w, y: this.floorY - this.height, w: w + this.def.reach, h: this.height };
  }

  /** ตำแหน่งคนที่โดนลาก: หน้าไททัน เท้าอยู่ระดับเดิม */
  holdPosition(victim) {
    const x = this.x + this.def.reach * 0.6;
    const b = victim.body;
    const y = victim.y; // คงความสูงไว้ (ถ้าโดนตอนลอยอยู่ จะค่อย ๆ ตกเองตามแรงโน้มถ่วง)
    if (b?.reset) b.reset(x, y);
    else victim.x = x;
  }

  update(dt, targets, isAlive) {
    this.t += dt;
    if (this.phase === "appear") {
      const k = Math.min(this.t / S3.appearMs, 1);
      this.sprite?.setAlpha(k).setPosition(this.x, this.floorY - (1 - k) * 90);
      this.shadow?.setFillStyle?.(0x000000, 0.25 * k);
      if (k >= 1) this.phase = "run";
      return;
    }
    if (this.phase === "vanish") {
      const k = Math.min(this.t / 300, 1);
      this.sprite?.setAlpha(1 - k);
      this.shadow?.setFillStyle?.(0x000000, 0.25 * (1 - k));
      if (k >= 1) this.done = true;
      return;
    }

    // วิ่ง
    this.x = Math.min(this.endX, this.x + (this.def.speed * dt) / 1000);
    this.sprite?.setPosition(this.x, this.floorY);
    this.shadow?.setPosition(this.x, this.floorY);

    if (this.victim) {
      if (!isAlive(this.victim) || !this.victim.isGrabbed?.()) this.victim = null;
      else this.holdPosition(this.victim);
    } else {
      this._checkContact(targets, isAlive);
    }

    if (this.x >= this.endX) this._finish();
  }

  _checkContact(targets, isAlive) {
    const r = this.hitRect();
    for (const v of targets) {
      if (this.ignored.has(v) || !v.stateMachine || !isAlive(v)) continue; // ข้ามบอส/เจ้าของ/คนตาย
      if (v.isInvulnerable?.() || v.isGrabbed?.()) continue;
      const b = v.body;
      const overlap = r.x < b.right && r.x + r.w > b.x && r.y < b.bottom && r.y + r.h > b.y;
      if (!overlap) continue;
      this.ignored.add(v);
      const scene = this.scene;
      // v32 ย่องอยู่ (ไม่ติดสถานะ): ชนแล้วทะลุ — ได้แค่ดาเมจชน (ลด 90% ที่ scene) ไม่โดนลาก
      if (v.canBeGrabbed && !v.canBeGrabbed()) {
        v.applyHit({ damage: S3.grabDamage, knockbackX: 0, knockbackY: 0, hitstun: 0 });
        scene._applyDamage?.(v, S3.grabDamage, false);
        continue;
      }
      if (v.isBlocking?.()) {
        // กันทัน: ไม่โดนลาก เสียมาตรการ์ด + ดาเมจเศษ (applyHit ทางกันจัดการให้)
        v.applyHit({ damage: S3.grabDamage, knockbackX: S3.blockKnockbackX, knockbackY: 0, hitstun: 0 });
        scene._applyDamage?.(v, S3.grabDamage, true);
        scene.hitstop?.(40);
        continue;
      }
      const stocksBefore = scene.stocks?.get(v);
      scene._applyDamage?.(v, S3.grabDamage, false);
      // โดนชนจนตาย (scene ให้เกิดใหม่ไปแล้วในเฟรมนี้) -> ไม่ลาก
      if (!isAlive(v) || scene.stocks?.get(v) !== stocksBefore) continue;
      v.grabBy(this);
      CombatSystem.flashVictim(scene, v);
      scene.hitstop?.(S3.grabHitstop);
      scene.cameras?.main.shake(120, 0.006);
      scene.audio?.play("hit", { pitch: 0.7, volume: 1.1 });
      this.victim = v;
      this.holdPosition(v);
      return; // ลากได้ทีละคน
    }
  }

  _finish() {
    const v = this.victim;
    const scene = this.scene;
    if (v && v.isGrabbed?.()) {
      v.releaseGrab(S3.release);
      scene._applyDamage?.(v, S3.releaseDamage, false);
      scene.hitstop?.(S3.releaseHitstop);
      scene.cameras?.main.shake(200, 0.01);
      scene.audio?.play("hit", { pitch: 0.55, volume: 1.3 });
    }
    this.victim = null;
    this.phase = "vanish";
    this.t = 0;
    scene.crazyTitans?.lightBurst(this.x, this.floorY - this.height * 0.6, this.height * 0.8);
  }

  destroy() {
    if (this.victim?.isGrabbed?.()) this.victim.stateMachine.setState("idle", true);
    this.sprite?.destroy();
    this.shadow?.destroy();
  }
}
