import { DEARV2_SKILL2 as S2, CLOWN_ATLAS } from "../config/dearv2.config.js";
import { resolveAttack } from "../config/combat.config.js";
import { CombatSystem } from "./CombatSystem.js";

/**
 * ตัวตลกเล็ก (สกิล 2 ของ Dear V.2)
 *
 * spawn(owner) — เสกตัวตลกเล็ก 3 ตัวโผล่หน้าเจ้าของ แล้ววิ่งไปหา "เป้าที่ใกล้ที่สุด" (เล็งใหม่ทุกเฟรม)
 *   เข้าใกล้ระยะแทง -> หยุดแทงเป็นจังหวะ (มีเสียงหัวเราะเด็ก) จนหมดอายุแล้วจางหาย
 * ตัวตลกไม่โดนตี ไม่บล็อกการเดิน และไม่ทำร้ายเจ้าของ
 *
 * update(dt, targets, isAlive) — scene เรียกทุกเฟรม (หยุดพร้อม hitstop เหมือนระบบอื่น)
 * โครงเดียวกับ CrazyTitanSystem (ไททันบ้า) — ภาพสร้างผ่าน scene.add.* ทั้งหมด
 */
const ATLAS = CLOWN_ATLAS.key;
const DEPTH = -0.4; // หลังตัวละครหลักเล็กน้อย

export class MiniClownSystem {
  constructor(scene) {
    this.scene = scene;
    this.clowns = [];
    this.pending = [];
  }

  /** เสกชุดใหม่ (ทยอยโผล่ทีละตัว) */
  spawn(owner) {
    const C = S2.clown;
    for (let i = 0; i < C.count; i++) {
      const x = owner.x + owner.facing * (40 + i * C.spawnGap);
      this.pending.push({ t: i * C.delayMs, owner, x, y: owner.body.bottom });
    }
    this.scene.audio?.playSample?.("dv2_clown_call");
    this.scene.cameras?.main.flash(140, 255, 210, 210);
  }

  update(dt, targets, isAlive) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) {
        this.pending.splice(i, 1);
        this.clowns.push(new MiniClown(this.scene, p));
      }
    }
    for (let i = this.clowns.length - 1; i >= 0; i--) {
      const c = this.clowns[i];
      c.update(dt, targets, isAlive);
      if (c.done) {
        c.destroy();
        this.clowns.splice(i, 1);
      }
    }
  }

  /** เจ้าของตาย/เริ่มรอบใหม่ -> เก็บกวาด */
  clear(owner) {
    for (let i = this.clowns.length - 1; i >= 0; i--) {
      if (!owner || this.clowns[i].owner === owner) {
        this.clowns[i].destroy();
        this.clowns.splice(i, 1);
      }
    }
    this.pending = this.pending.filter((p) => owner && p.owner !== owner);
  }
}

class MiniClown {
  constructor(scene, { owner, x, y }) {
    const C = S2.clown;
    this.scene = scene;
    this.owner = owner;
    this.x = x;
    this.floorY = y;
    this.life = C.lifeMs;
    this.stabT = 0;
    this.stabs = 0;
    this.done = false;
    this.facing = owner.facing;

    const sprite = scene.add?.sprite?.(x, y, ATLAS, "crun_1.png");
    if (sprite) {
      // สเกลจากความสูงตัวในผืนภาพ (ไม่ใช่ความสูงผืนภาพ) ไม่งั้นตัวเล็กกว่าที่ตั้งไว้
      sprite
        .setOrigin(0.5, CLOWN_ATLAS.feetY / CLOWN_ATLAS.canvasH)
        .setScale(C.worldHeight / CLOWN_ATLAS.standingHeightInFrame)
        .setDepth(DEPTH)
        .setAlpha(0);
      if (owner.baseTint != null) sprite.setTint(owner.baseTint);
      sprite.play?.("dv2clown/run");
      scene.tweens?.add({ targets: sprite, alpha: 1, duration: 220 });
    }
    this.sprite = sprite;
    this.shadow = scene.add?.ellipse?.(x, y, C.worldHeight * 0.5, 10, 0x000000, 0.22)?.setDepth(DEPTH - 0.1);
    this.baseScale = sprite?.scaleY ?? 1;
  }

  /** เป้าที่ใกล้ที่สุดที่ยังไม่ตาย (ไม่เอาเจ้าของ) */
  _target(targets, isAlive) {
    let best = null;
    for (const t of targets ?? []) {
      if (t === this.owner || !isAlive?.(t)) continue;
      const d = Math.abs(t.x - this.x);
      if (!best || d < best.d) best = { t, d };
    }
    return best;
  }

  update(dt, targets, isAlive) {
    const C = S2.clown;
    this.life -= dt;
    if (this.fading || this.life <= 0) this.fading = true;
    if (this.fading) {
      // จางเองทีละเฟรม (ไม่ใช้ tween เพราะ tween หยุดตอน hitstop แล้วตัวจะค้าง)
      this.fadeT = (this.fadeT ?? 0) + dt;
      const k = Math.max(0, 1 - this.fadeT / C.fadeMs);
      this.sprite?.setAlpha?.(k);
      this.shadow?.setFillStyle?.(0x000000, 0.22 * k);
      if (this.fadeT >= C.fadeMs) this.done = true;
      return;
    }
    const hit = this._target(targets, isAlive);
    if (!hit) return;
    const dx = hit.t.x - this.x;
    const inRange = Math.abs(dx) <= C.stabRange;
    this.facing = Math.sign(dx) || this.facing;
    if (!inRange) {
      this.x += Math.sign(dx) * C.speed * (dt / 1000);
      if (this.anim !== "run") {
        this.anim = "run";
        this.sprite?.play?.("dv2clown/run");
      }
    } else {
      if (this.anim !== "stab") {
        this.anim = "stab";
        this.sprite?.play?.("dv2clown/stab");
        this.stabT = 0;
      }
      this.stabT += dt;
      if (this.stabT >= C.stabIntervalMs) {
        this.stabT = 0;
        this._stab(hit.t);
      }
    }
    // เฟรมในคลิปหันซ้าย -> flipX เมื่อจะให้หันขวา
    this.sprite?.setFlipX?.(this.facing > 0);
    this.sprite?.setPosition?.(this.x, this.floorY);
    this.shadow?.setPosition?.(this.x, this.floorY);
  }

  _stab(victim) {
    const C = S2.clown;
    const sc = this.scene;
    if (victim.isInvulnerable?.()) return;
    const spec = resolveAttack(
      { name: "dv2_clown", damage: C.damage, knockbackX: C.knockbackX, knockbackY: C.knockbackY, hitstun: C.hitstun },
      this.owner.characterKey,
    );
    const blocked = victim.isBlocking?.() && Math.sign(victim.facing) !== Math.sign(this.facing);
    victim.applyHit?.({ ...spec, knockbackX: this.facing * spec.knockbackX }, this.owner);
    sc._applyDamage?.(victim, blocked ? Math.round(spec.damage * 0.25) : spec.damage, blocked);
    CombatSystem.flashVictim?.(sc, victim);
    this.stabs++;
    if (this.stabs >= C.maxStabs) this.fading = true; // แทงครบโควตาแล้วหายไป
    if (this.stabs % C.laughEvery === 1) sc.audio?.playSample?.("dv2_clown_laugh", { rate: 0.95 + Math.random() * 0.2 });
    else sc.audio?.play?.("hit", { pitch: 1.4, volume: 0.6 });
  }

  destroy() {
    this.sprite?.destroy?.();
    this.shadow?.destroy?.();
  }
}
