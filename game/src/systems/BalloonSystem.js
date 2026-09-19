import { DEARV2_BALLOON as B, BALLOON_ATLAS, DV2FX_ATLAS, DV2FX_WORLD_PER_PX, DV2FX_META } from "../config/dearv2.config.js";
import { resolveAttack } from "../config/combat.config.js";
import { CombatSystem } from "./CombatSystem.js";

/**
 * v34 ลูกโป่งของ Dear V.2 (สกิล 1-2)
 *
 * throwBalloon(owner) — S1 พวงลูกโป่งลอยไปข้างหน้า ชนคนแรก -> confetti + มึนงง (root + silence + blind)
 * placeTrap(owner)    — S2 ลูกโป่งบนพื้น ระเบิดเมื่อศัตรูแตะ/ครบฟิวส์ · ผลตาม owner.trapMode:
 *                        0 ควันพิษ (AOE ค้าง ติ๊กดาเมจ) · 1 กล่องไขลาน (ดาเมจ + ตีลอย) · 2 ตัวตลกตัวเล็ก 3 ตัว
 *                        (ไล่หาเป้าที่ใกล้ที่สุด ~chaseMs วิ แล้วรุมแทง · ไม่เจอเป้า/เป้าหนีทัน = จางหาย · ไม่โดนตี)
 *
 * scene เรียก update(dt, players, isAlive) ทุกเฟรม — หยุดพร้อม hitstop เหมือนระบบอื่น
 * ภาพสร้างด้วย scene.add.sprite ทั้งหมด (ไม่มี physics body — ชนเองด้วยระยะ)
 */
const FX = DV2FX_ATLAS.key;
const DEPTH_FX = 3;      // ทับตัวละคร (confetti ต้องบังตัว)
const DEPTH_GROUND = -0.3;
const MODE_KEYS = B.trap.modes.map((m) => m.key);

/** ลงทะเบียนท่าเอฟเฟกต์ (เรียกจาก DearV2.registerAnimations) */
export function registerBalloonAnims(scene, fxMeta = DV2FX_META) {
  const mk = (key, prefix, n, fps, repeat = 0, atlas = FX) => {
    if (scene.anims.exists?.(`dv2fx/${key}`)) return;
    scene.anims.create?.({
      key: `dv2fx/${key}`,
      frames: Array.from({ length: n }, (_, i) => ({ key: atlas, frame: `${prefix}_${i + 1}.png` })),
      frameRate: fps,
      repeat,
    });
  };
  const n = (k, d) => fxMeta?.[k]?.frames ?? d;
  mk("balloon_fly", "balloon_fly", n("balloon_fly", 12), 10, -1);
  mk("balloon_floor", "balloon_floor", n("balloon_floor", 6), 6, -1);
  mk("poison", "poison", n("poison", 19), B.trap.poison.fps);
  mk("confetti", "confetti", n("confetti", 20), B.throw.confettiFps);
  mk("jackbox", "jackbox", n("jackbox", 23), B.trap.jackbox.fps);
  mk("bald_walk", "bald_walk", 17, B.trap.swarm.fps, -1, BALLOON_ATLAS.key); // ตัวตลกอยู่ใน atlas ท่าของ Dear (ผืน 640)
}

export class BalloonSystem {
  constructor(scene) {
    this.scene = scene;
    // Phaser เก็บส่วน meta ของ atlas JSON ไว้ที่ texture.customData
    this.fxMeta = scene.textures?.get?.(DV2FX_ATLAS.key)?.customData?.meta?.fx ?? DV2FX_META;
    this.projectiles = [];
    this.traps = [];
    this.effects = []; // confetti / poison zone / jackbox (มีอายุ)
    this.clowns = [];
  }

  // ---------- ภาพ ----------

  _fxSprite(group, x, y, scale, depth = DEPTH_FX) {
    const m = this.fxMeta?.[group];
    const sp = this.scene.add.sprite(x, y, FX, `${group}_1.png`);
    sp.setOrigin?.(m?.originX ?? 0.5, m?.originY ?? 0.5);
    sp.setScale?.(DV2FX_WORLD_PER_PX * scale);
    sp.setDepth?.(depth);
    return sp;
  }

  _floorY(owner) {
    return owner.body?.bottom ?? owner.y;
  }

  // ---------- S1 ----------

  throwBalloon(owner) {
    const T = B.throw;
    const x = owner.x + owner.facing * 50;
    const y = (owner.body?.top ?? owner.y - 90) + 30;
    const sp = this._fxSprite("balloon_fly", x, y, T.scale, 1);
    sp.play?.("dv2fx/balloon_fly");
    this.projectiles.push({ owner, sp, x, y0: y, dir: owner.facing, t: 0, done: false });
    this.scene.audio?.playSample?.("dv2_balloon_throw");
  }

  _updateProjectiles(dt, players, isAlive) {
    const T = B.throw;
    for (const pr of this.projectiles) {
      pr.t += dt;
      pr.x += (pr.dir * T.speed * dt) / 1000;
      const y = pr.y0 + (T.rise * pr.t) / 1000 + Math.sin((pr.t / 1000) * Math.PI * 2 * T.bobHz) * T.bobAmp;
      pr.sp.setPosition?.(pr.x, y);
      pr.y = y;
      for (const v of players) {
        if (v === pr.owner || !isAlive(v) || v.isInvulnerable?.()) continue;
        if (!this._near(v, pr.x, y, T.radius)) continue;
        this._confettiHit(pr, v);
        break;
      }
      if (!pr.done && pr.t >= T.lifeMs) {
        pr.done = true; // ลอยจนสุดทาง แตกเปล่า (มี confetti เล็ก ๆ ไม่มีผล)
        this._spawnConfetti(pr.x, y, 0.45);
      }
    }
    this._sweep(this.projectiles, (p) => p.sp.destroy?.());
  }

  _confettiHit(pr, v) {
    const T = B.throw;
    pr.done = true;
    const blocked = !!v.isBlocking?.();
    this._spawnConfetti(pr.x, pr.y, T.confettiScale);
    this.scene.audio?.playSample?.("dv2_confetti");
    v.applyHit?.({ damage: T.damage, knockbackX: 0, knockbackY: 0, hitstun: 0 }, pr.owner);
    this.scene._applyDamage?.(v, T.damage, blocked);
    // กันทัน = โดนแค่ดาเมจ ไม่มึน (ทางแก้ของคนโดน) · ย่องอยู่ = applyStatus คืน false เอง
    if (!blocked) {
      const ok = ["root", "silence", "blind"].map((s) => v.applyStatus?.(s, T.statusMs)).some(Boolean);
      if (ok) this.scene.showFloatLabel?.(v, "DAZED", "#f9a8d4");
    }
  }

  _spawnConfetti(x, y, scale) {
    const sp = this._fxSprite("confetti", x, y, scale);
    sp.play?.("dv2fx/confetti");
    const n = this.fxMeta?.confetti?.frames ?? 20;
    this.effects.push({ kind: "confetti", sp, t: 0, life: (n / B.throw.confettiFps) * 1000 });
  }

  // ---------- S2 ----------

  modeOf(owner) {
    return MODE_KEYS[owner.trapMode ?? 0] ?? "poison";
  }

  placeTrap(owner) {
    const P = B.trap;
    // วางได้ทีละลูกต่อคน — ลูกเก่าที่ยังไม่แตก ฝ่อหายไป
    for (const t of this.traps) if (t.owner === owner) t.done = true;
    const x = owner.x + owner.facing * P.offsetX;
    const y = this._floorY(owner);
    const sp = this._fxSprite("balloon_floor", x, y, P.scale, DEPTH_GROUND);
    sp.play?.("dv2fx/balloon_floor");
    this.traps.push({ owner, sp, x, y, mode: this.modeOf(owner), t: 0, done: false });
    this.scene.audio?.playSample?.("dv2_balloon_squeak");
  }

  _updateTraps(dt, players, isAlive) {
    const P = B.trap;
    for (const tr of this.traps) {
      if (tr.done) continue;
      tr.t += dt;
      let fire = tr.t >= P.fuseMs;
      if (!fire && tr.t >= P.armMs) {
        fire = players.some((v) => v !== tr.owner && isAlive(v) && !v.isInvulnerable?.() && this._near(v, tr.x, tr.y - 20, P.triggerRadius));
      }
      if (fire) {
        tr.done = true;
        this._explode(tr, players, isAlive);
      }
    }
    this._sweep(this.traps, (t) => t.sp.destroy?.());
  }

  _explode(tr, players, isAlive) {
    const P = B.trap;
    if (tr.mode === "poison") {
      const Z = P.poison;
      const sp = this._fxSprite("poison", tr.x, tr.y, Z.scale);
      sp.play?.("dv2fx/poison");
      this.scene.audio?.playSample?.("dv2_pop_poison");
      const zone = { kind: "poison", owner: tr.owner, sp, x: tr.x, y: tr.y, t: 0, life: Z.durationMs, tick: Z.tickMs };
      this.effects.push(zone);
      this._hitRadius(zone.owner, tr.x, tr.y - 60, Z.radius, players, isAlive, (v) => this._damage(zone.owner, v, Z.burstDamage));
    } else if (tr.mode === "jackbox") {
      const J = P.jackbox;
      const sp = this._fxSprite("jackbox", tr.x, tr.y, J.scale, 0.5);
      sp.play?.("dv2fx/jackbox");
      this.scene.audio?.playSample?.("dv2_jackbox");
      this.effects.push({ kind: "jackbox", owner: tr.owner, sp, x: tr.x, y: tr.y, t: 0, life: J.popAtMs + J.holdMs, popped: false });
    } else {
      const C = P.swarm;
      for (let i = 0; i < C.count; i++) {
        const x = tr.x + (tr.owner.facing || 1) * (i * C.spawnGap);
        this.clowns.push(new SwarmClown(this, tr.owner, x, tr.y, i * C.delayMs));
      }
      this.scene.audio?.playSample?.("dv2_bald_laugh");
      this._spawnConfetti(tr.x, tr.y - 40, 0.35); // ป๊อปเล็ก ๆ ตอนโผล่
    }
  }

  _updateEffects(dt, players, isAlive) {
    const P = B.trap;
    for (const e of this.effects) {
      e.t += dt;
      if (e.kind === "poison") {
        e.tick -= dt;
        if (e.tick <= 0 && e.t < e.life) {
          e.tick += P.poison.tickMs;
          this._hitRadius(e.owner, e.x, e.y - 60, P.poison.radius, players, isAlive, (v) => this._damage(e.owner, v, P.poison.tickDamage));
        }
        if (e.t > e.life - 500) e.sp.setAlpha?.(Math.max(0, (e.life - e.t) / 500)); // จางออกครึ่งวิสุดท้าย
      } else if (e.kind === "jackbox" && !e.popped && e.t >= P.jackbox.popAtMs) {
        e.popped = true;
        const J = P.jackbox;
        this.scene.cameras?.main.shake(160, 0.006);
        this._hitRadius(e.owner, e.x, e.y - 60, J.radius, players, isAlive, (v) => {
          const blocked = !!v.isBlocking?.();
          const dir = Math.sign(v.x - e.x) || 1;
          v.applyHit?.({ damage: J.damage, knockbackX: J.knockbackX * dir, knockbackY: J.knockbackY, hitstun: J.hitstun }, e.owner);
          this.scene._applyDamage?.(v, J.damage, blocked);
          this.scene.combat?.constructor?.flashVictim?.(this.scene, v);
        });
      } else if (e.kind === "jackbox" && e.t > e.life - 300) {
        e.sp.setAlpha?.(Math.max(0, (e.life - e.t) / 300));
      }
      if (e.t >= e.life) e.done = true;
    }
    this._sweep(this.effects, (e) => e.sp.destroy?.());
  }

  // ---------- วนหลัก ----------

  update(dt, players, isAlive) {
    this._updateProjectiles(dt, players, isAlive);
    this._updateTraps(dt, players, isAlive);
    this._updateEffects(dt, players, isAlive);
    for (const c of this.clowns) c.update(dt, players, isAlive);
    this._sweep(this.clowns, (c) => c.destroy());
  }

  /** เจ้าของตาย / เริ่มรอบใหม่ (owner ว่าง = ล้างหมด) — confetti ที่กำลังโปรยปล่อยให้จบเอง */
  clear(owner) {
    const mine = (o) => !owner || o.owner === owner;
    for (const list of [this.projectiles, this.traps, this.clowns]) for (const o of list) if (mine(o)) o.done = true;
    for (const e of this.effects) if (e.kind !== "confetti" && mine(e)) e.done = true;
    this._sweep(this.projectiles, (p) => p.sp.destroy?.());
    this._sweep(this.traps, (t) => t.sp.destroy?.());
    this._sweep(this.effects, (e) => e.sp.destroy?.());
    this._sweep(this.clowns, (c) => c.destroy());
  }

  // ---------- ช่วย ----------

  _near(v, x, y, r) {
    const b = v.body;
    if (!b) return Math.hypot(v.x - x, v.y - y) <= r;
    const cx = Math.max(b.x, Math.min(x, b.right)); // จุดบนตัวที่ใกล้วงที่สุด (AABB vs วงกลม)
    const top = b.top ?? b.bottom - (b.height ?? 180);
    const cy = Math.max(top, Math.min(y, b.bottom));
    return Math.hypot(cx - x, cy - y) <= r;
  }

  _hitRadius(owner, x, y, r, players, isAlive, fn) {
    for (const v of players) {
      if (v === owner || !isAlive(v) || v.isInvulnerable?.()) continue;
      if (this._near(v, x, y, r)) fn(v);
    }
  }

  _damage(owner, v, dmg) {
    const blocked = !!v.isBlocking?.();
    v.applyHit?.({ damage: dmg, knockbackX: 0, knockbackY: 0, hitstun: 0 }, owner);
    this.scene._applyDamage?.(v, dmg, blocked);
  }

  _sweep(list, destroy) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].done) {
        destroy(list[i]);
        list.splice(i, 1);
      }
    }
  }
}

/**
 * ตัวตลกตัวเล็ก — ไล่หาเป้าที่ใกล้ที่สุด (เล็งใหม่ทุกเฟรม) ภายใน chaseMs
 * เข้าใกล้ระยะแทงเมื่อไหร่ = "จับได้" (เลิกนับเวลาไล่) แล้วหยุดแทงเป็นจังหวะจนครบโควตา
 * ไม่เจอเป้า/เป้าหนีทันภายใน chaseMs = จางหาย · ไม่โดนตี ไม่ทำร้ายเจ้าของ
 * (ใช้ท่าเดินของตัวตลกหัวล้านเดิม — ไม่มีท่าแทงแยก จึงกะพริบสีขาวแทนตอนแทง)
 */
class SwarmClown {
  constructor(sys, owner, x, y, delayMs) {
    const C = B.trap.swarm;
    this.sys = sys;
    this.scene = sys.scene;
    this.owner = owner;
    this.x = x;
    this.floorY = y;
    this.delay = delayMs;
    this.life = C.chaseMs;
    this.caught = false;
    this.stabT = 0;
    this.stabs = 0;
    this.fading = false;
    this.done = false;
    this.facing = owner.facing;
    // ผืนภาพเดียวกับ Dear: สเกล = ความสูงโลก Dear / ตัวยืนในผืน × ขนาดตัวตลก
    const dearScale = (owner.constructor.WORLD_HEIGHT ?? 185) / 393;
    this.sp = this.scene.add.sprite(x, y, BALLOON_ATLAS.key, "bald_walk_1.png");
    this.sp.setOrigin?.(0.5, 431 / 470);
    this.sp.setScale?.(dearScale * C.scale);
    this.sp.setDepth?.(-0.2);
    this.sp.setAlpha?.(0);
    this.sp.play?.("dv2fx/bald_walk");
    this.shadow = this.scene.add.ellipse?.(x, y, (dearScale * 393 * C.scale) * 0.5, 10, 0x000000, 0.22)?.setDepth(-0.3);
  }

  /** เป้าที่ใกล้ที่สุดที่ยังไม่ตาย (ไม่เอาเจ้าของ) */
  _target(players, isAlive) {
    let best = null;
    for (const t of players ?? []) {
      if (t === this.owner || !isAlive?.(t)) continue;
      const d = Math.abs(t.x - this.x);
      if (!best || d < best.d) best = { t, d };
    }
    return best;
  }

  update(dt, players, isAlive) {
    const C = B.trap.swarm;
    if (this.done) return;
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    if (!this._shown) {
      this._shown = true;
      this.scene.tweens?.add({ targets: this.sp, alpha: 1, duration: 220 });
    }
    if (!this.caught && !this.fading) {
      this.life -= dt;
      if (this.life <= 0) this.fading = true;
    }
    if (this.fading) {
      // จางเองทีละเฟรม (ไม่ใช้ tween เพราะ tween หยุดตอน hitstop แล้วตัวจะค้าง)
      this.fadeT = (this.fadeT ?? 0) + dt;
      const k = Math.max(0, 1 - this.fadeT / C.fadeMs);
      this.sp?.setAlpha?.(k);
      this.shadow?.setFillStyle?.(0x000000, 0.22 * k);
      if (this.fadeT >= C.fadeMs) this.done = true;
      return;
    }
    if (this._flash > 0 && (this._flash -= dt) <= 0) this.sp.clearTint?.();
    const hit = this._target(players, isAlive);
    if (!hit) return; // ไม่เจอเป้า -> life เดินต่อจนหมดแล้วจางหาย
    const dx = hit.t.x - this.x;
    const inRange = Math.abs(dx) <= C.stabRange;
    this.facing = Math.sign(dx) || this.facing;
    if (!inRange) {
      this.x += Math.sign(dx) * C.speed * (dt / 1000);
    } else {
      this.caught = true; // จับได้แล้ว -> เลิกนับเวลาไล่
      this.stabT += dt;
      if (this.stabT >= C.stabIntervalMs) {
        this.stabT = 0;
        this._stab(hit.t);
      }
    }
    this.sp?.setFlipX?.(this.facing > 0);
    this.sp?.setPosition?.(this.x, this.floorY);
    this.shadow?.setPosition?.(this.x, this.floorY);
  }

  _stab(victim) {
    const C = B.trap.swarm;
    const sc = this.scene;
    if (victim.isInvulnerable?.()) return;
    const spec = resolveAttack(
      { name: "dv2_swarm", damage: C.damage, knockbackX: C.knockbackX, knockbackY: C.knockbackY, hitstun: C.hitstun },
      this.owner.characterKey,
    );
    const blocked = victim.isBlocking?.() && Math.sign(victim.facing) !== Math.sign(this.facing);
    victim.applyHit?.({ ...spec, knockbackX: this.facing * spec.knockbackX }, this.owner);
    sc._applyDamage?.(victim, blocked ? Math.round(spec.damage * 0.25) : spec.damage, blocked);
    CombatSystem.flashVictim?.(sc, victim);
    this.sp?.setTintFill?.(0xffffff);
    this._flash = 80;
    this.stabs++;
    if (this.stabs >= C.maxStabs) this.fading = true; // แทงครบโควตาแล้วหายไป
    if (this.stabs % C.laughEvery === 1) sc.audio?.playSample?.("dv2_clown_laugh", { rate: 0.95 + Math.random() * 0.2 });
    else sc.audio?.play?.("hit", { pitch: 1.4, volume: 0.6 });
  }

  destroy() {
    this.sp?.destroy?.();
    this.shadow?.destroy?.();
  }
}
