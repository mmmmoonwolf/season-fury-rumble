import { StateMachine } from "../systems/StateMachine.js";
import { PHYSICS } from "../config/physics.config.js";
import { BASIC_COMBO, FINISHER, COMBO_WINDOW, FINISHER_WINDOW, GUARD, HITSTOP, resolveAttack } from "../config/combat.config.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { STAND } from "../config/stand.config.js";
import { TRANSFORM } from "../config/transform.config.js";
import { WEAPON_SWITCH_COOLDOWN_MS } from "../config/weapons.config.js";
import { Stand, StandSlash } from "./Stand.js";

/**
 * Base class ของตัวละครทุกตัว (Dear, ...)
 * รับผิดชอบ: sprite + arcade physics body, state machine, input-agnostic movement logic
 *
 * Character ลูก (extends Player) ควร override:
 *  - textureKey  (ชื่อ texture/spritesheet)
 *  - getSkillEffect() (Phase 2+ — ยังไม่ทำใน Phase 1)
 */
export class Player extends Phaser.GameObjects.Sprite {
  /** ดับเบิลแท็ป A/D ภายในกี่ ms ถึงนับเป็นวิ่ง */
  static DASH_TAP_MS = 260;
  /** วิ่ง (ดับเบิลแท็ป) เร็วกว่าเดินปกติกี่เท่า */
  static DASH_SPEED_MUL = 1.65;

  /** ท่ากัน: ลดดาเมจเหลือกี่ส่วน (0.25 = กันได้ 75%) */
  static BLOCK_DAMAGE_MUL = 0.25;
  /** ท่ากัน: knockback เหลือกี่ส่วน — กันแล้วยังถอยได้บ้าง แต่ไม่กระเด็นไกล */
  static BLOCK_KNOCKBACK_MUL = 0.35;

  /** ท่ายั่ว: ยืนค้างกี่ ms ก่อนกลับ idle — สั้นพอไม่ให้โดนสวนฟรีเกินไป */
  static TAUNT_MS = 900;
  /** รอบการเขย่ง 1 จังหวะ (ms) — เล็กกว่านี้ = หัวเราะถี่ขึ้น */
  static TAUNT_BOUNCE_MS = 220;
  /** ความแรงการบีบ-ยืดตัว 0.06 = ±6% ถ้าอยากให้เว่อร์ขึ้นเพิ่มเป็น 0.10 */
  static TAUNT_SQUASH = 0.06;

  constructor(scene, x, y, textureKey = "player_placeholder", playerIndex = 0, animPrefix = "") {
    super(scene, x, y, textureKey);

    this.scene = scene;
    this.playerIndex = playerIndex; // ใช้แยก player 1/2/3/4 ตอนต่อ local multiplayer input
    /**
     * prefix ของ animation ตัวละครนี้ (เช่น "dear/") — ดู play() ด้านล่าง
     * ต้องตั้งก่อน setState("idle") ตอนท้าย constructor เพราะ state แรกเรียก play() ทันที
     */
    this.animPrefix = animPrefix;
    /** คีย์ตัวละคร (เช่น "kunjae") — ใช้ดึงค่าปรับต่อตัวใน combat.config.js */
    this.characterKey = animPrefix.replace(/\/$/, "");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    /** @type {Phaser.Physics.Arcade.Body} */
    this.body.setGravityY(PHYSICS.GRAVITY_Y - scene.physics.world.gravity.y); // เผื่อ world gravity ตั้งไว้แล้ว
    this.body.setCollideWorldBounds(false); // ขอบจอ = ตาย ไม่ใช่ชนกำแพง (ทำใน scene แยก)
    this.body.setDragX(PHYSICS.GROUND_DRAG);
    this.body.setSize(this.width * 0.5, this.height * 0.9);

    this.jumpsUsed = 0;
    this.facing = 1; // 1 = ขวา, -1 = ซ้าย
    this.isWalking = false; // toggle เดิน/วิ่ง (ผูกกับปุ่ม modifier ใน input)

    // ---------- สถานะคอมโบ ----------
    this.comboStep = 0; // หมัดถัดไปในลูกโซ่ (0,1,2) — รีเซ็ตเมื่อหมดเวลาต่อคอมโบ
    this.comboTimer = 0; // เวลาที่เหลือให้ต่อหมัดถัดไป
    this.hitsLanded = 0; // นับเฉพาะหมัดที่ "โดนจริง" ติดกัน — ครบ 3 ถึงปลดล็อกท่าไม้ตาย
    this.finisherReady = false;
    this.finisherTimer = 0;
    this.attackQueued = false; // กดปุ่มไว้ระหว่างหมัดก่อนหน้ายังไม่จบ → ต่อทันทีที่จบ
    this.currentAttack = null;
    /** @type {CombatSystem|null} ผูกจาก scene ตอนสร้างระบบต่อสู้ */
    this.combat = null;

    // ---------- ท่าเรียกร่าง (stand) ----------
    // เปิดใช้เฉพาะตัวละครที่ประกาศ static CAN_SUMMON = true (ตอนนี้มีแค่ Bomb)
    this.standCooldown = 0;
    /** มาตรการ์ด 0..GUARD.max — หมดแล้วการ์ดแตก (ดู GUARD ใน combat.config) */
    this.guard = GUARD.max;
    this._guardRegenDelay = 0;

    // ---------- แปลงร่าง (เปิดเฉพาะคลาสที่ประกาศ static FORM_ALT) ----------
    /** "base" = ร่างปกติ, "alt" = ร่างที่แปลงแล้ว */
    this.form = "base";
    this.transformCooldown = 0;
    // ---------- สลับอาวุธ (เปิดเฉพาะคลาสที่ประกาศ static WEAPONS) ----------
    /** ลำดับใน WEAPONS ที่ถืออยู่ */
    this.weaponIndex = 0;
    this._weaponSwitchCd = 0;
    /** หลอดเลือดของร่างแปลง (ใช้เฉพาะตอน form = "alt") */
    this.formHp = 0;
    this.formMaxHp = 0;
    /** อมตะหลังหลอดร่างแปลงแตก (ms) */
    this._formBreakInvuln = 0;
    /** @type {Stand|null} ร่างที่กำลังอยู่ในสนาม — เก็บไว้เพื่อยกเลิกตอนโดนสวน */
    this.activeStand = null;

    // ---------- บัฟเพิ่มพลัง (รางวัลจากการเก็บบอสทีสุดท้าย) ----------
    /** ตัวคูณดาเมจปัจจุบัน — CombatSystem อ่านค่านี้ตอนคำนวณหมัดที่เข้า */
    this.damageMultiplier = 1;
    /** เวลาที่เหลือของบัฟ (ms) — BossSystem ใช้ค่านี้วาดออร่าและตัดสินว่าจะลบออร่าเมื่อไหร่ */
    this.buffTimer = 0;

    this.stateMachine = new StateMachine(this);
    this._registerBaseStates();
    this._registerCombatStates();
    this.stateMachine.setState("idle");
  }

  /**
   * เติม prefix ตัวละครให้ชื่อ animation อัตโนมัติ
   * โค้ด state เรียก play("idle") เหมือนเดิม แต่ Phaser ได้รับ "dear/idle" หรือ "bomb/idle"
   * ทำให้ตัวละครหลายตัวใช้ชื่อท่าชุดเดียวกันได้โดยไม่ทับกันใน anim manager ที่เป็น global
   */
  play(key, ignoreIfPlaying) {
    // v32 โหมดย่อง: ท่ายืน/เดินถูกแทนด้วยท่าย่อง (คลาสลูกประกาศ static SNEAK_ANIMS)
    if (typeof key === "string" && !key.includes("/") && this.isSneaking?.()) {
      key = this.constructor.SNEAK_ANIMS?.[key] ?? key;
    }
    const full = typeof key === "string" && this.animPrefix && !key.includes("/") ? this.animPrefix + key : key;
    return super.play(full, ignoreIfPlaying);
  }

  /**
   * เรียกจากคลาสลูก (เช่น Dear) หลัง super() เมื่อใช้ sprite จริงแทน placeholder
   * ตั้ง display scale + hitbox ให้ตรงกับสัดส่วนที่ออกแบบไว้ (ตัวละครสูง ~247px ในโลกเกม)
   *
   * @param {number} standingHeightInFrame ความสูงตัวละคร (px) ในเฟรมต้นฉบับของ spritesheet
   * @param {number} targetWorldHeight ความสูงที่ต้องการในโลกเกม
   * @param {number} [bottomMargin] ระยะจากระดับเท้าถึงขอบล่างของเฟรม (px หน่วยเฟรมดิบ)
   *        atlas ที่เผื่อขอบล่างไว้ให้ท่าขาเหยียดลง ต้องบอกค่านี้ ไม่งั้นตัวละครจะลอยเหนือพื้น
   */
  applySpriteScale(standingHeightInFrame, targetWorldHeight, bottomMargin = 4) {
    this._scaleArgs = { standingHeightInFrame, targetWorldHeight, bottomMargin }; // ใช้ตอนสลับร่าง
    const displayScale = targetWorldHeight / standingHeightInFrame;
    this.setScale(displayScale);

    // hitbox: แคบกว่าเฟรมมาก เพราะเฟรมกว้างเผื่อท่าวิ่ง/กระโดดที่กางแขนขา
    // ใช้สัดส่วนตัวยืนจริงเป็นเกณฑ์ ไม่ใช่ความกว้างเฟรมทั้งหมด
    const bodyW = standingHeightInFrame * 0.26; // ~1:2 ratio ตาม spec (กว้าง:สูง)
    const bodyH = standingHeightInFrame * 0.95;
    this.body.setSize(bodyW, bodyH);
    // จัด body ให้อยู่กลางเฟรมแนวนอน และชิดล่าง (เท้าอยู่ล่างสุดของเฟรมทุกท่า)
    this.body.setOffset((this.width - bodyW) / 2, this.height - bodyH - bottomMargin);
    this._baseBodyOffsetY = this.body.offset.y; // ค่าอ้างอิงของ "เขย่งตอนยืน" ด้านล่าง

    // บังคับให้ body คำนวณขนาดตาม scale ใหม่ทันที
    // ปกติ Arcade จะอัปเดตให้ตอน physics step ถัดไป ซึ่งช้าไปสำหรับ placeFeetAt()
    // ที่ถูกเรียกต่อทันทีในเฟรมเดียวกัน (นี่คือสาเหตุที่ตัวละครจมพื้นเฉพาะครั้งแรก)
    this.body.updateBounds();
  }

  /**
   * วางตัวละครโดยอ้างอิง "ตำแหน่งเท้า" แทนจุดกึ่งกลาง sprite
   * จำเป็นเพราะ sprite จริงสูงกว่า placeholder เดิมมาก ถ้าใช้จุดกึ่งกลางตรงๆ
   * ตัวละครจะจมทะลุพื้นตั้งแต่เกิด (เคยเจอ bug นี้มาแล้ว)
   *
   * @param {number} x ตำแหน่งแนวนอน
   * @param {number} feetY ระดับพื้นที่ต้องการให้เท้าแตะ
   */
  placeFeetAt(x, feetY) {
    // คำนวณจาก sourceWidth/sourceHeight เท่านั้น — ค่าเหล่านี้เป็นหน่วย "เฟรมดิบ" เสมอ
    // ไม่ขึ้นกับว่า body.updateBounds() ทำงานไปแล้วหรือยัง
    //
    // เดิมอ่าน body.height ตรงๆ ซึ่งค่าต่างกันตามจังหวะ: ตอนเพิ่งสร้างตัวละครยังไม่สเกล
    // แต่ตอน respawn สเกลแล้ว → ตัวละครจมพื้นเฉพาะครั้งแรกครั้งเดียว ที่เหลือปกติ
    const bodyH = this.body.sourceHeight * this.scaleY; // ความสูง body จริงในโลกเกม
    const bottomGap = (this.height - (this.body.offset.y + this.body.sourceHeight)) * this.scaleY;
    // y ของ sprite = จุดกึ่งกลาง → เลื่อนขึ้นครึ่งหนึ่งของ body ที่แสดงผลจริง
    this.setPosition(x, feetY - bodyH / 2 - bottomGap);
    this.body.setVelocity(0, 0);
  }

  // ---------- State definitions ----------
  _registerBaseStates() {
    this.stateMachine
      .addState("idle", {
        onEnter: (p) => {
          p.play?.("idle", true); // no-op ถ้ายังไม่มี animation ผูกไว้
          p._idleBobT = 0;
        },
        onExit: (p) => p._setIdleBob(0),
        onUpdate: (p, dt) => {
          p._tickIdleBob(dt);
          if (!p.body.blocked.down && !p.body.touching.down) {
            p._toAirState();
            return;
          }
          if (Math.abs(p.body.velocity.x) > 5) {
            p.stateMachine.setState(p.isWalking ? "walk" : "run");
          }
        },
      })
      .addState("walk", {
        onEnter: (p) => {
          p.play?.("run", true); // ใช้ animation วิ่งตัวเดียวกัน ตามที่ตกลงไว้
          p._setAnimFps(PHYSICS.WALK_ANIM_FPS); // แต่เล่นช้าลง ให้ดูเป็นก้าวเดิน
        },
        onUpdate: (p) => {
          if (!p.body.blocked.down && !p.body.touching.down) {
            p._toAirState();
            return;
          }
          if (Math.abs(p.body.velocity.x) < 5) {
            p.stateMachine.setState("idle");
          } else if (!p.isWalking) {
            p.stateMachine.setState("run");
          }
        },
      })
      .addState("run", {
        onEnter: (p) => {
          p.play?.("run", true);
          p._setAnimFps(PHYSICS.RUN_ANIM_FPS);
        },
        onUpdate: (p) => {
          if (!p.body.blocked.down && !p.body.touching.down) {
            p._toAirState();
            return;
          }
          if (Math.abs(p.body.velocity.x) < 5) {
            p.stateMachine.setState("idle");
          } else if (p.isWalking) {
            p.stateMachine.setState("walk");
          }
        },
      })
      .addState("jump", {
        onEnter: (p) => p.play?.("jump", true),
        onUpdate: (p) => {
          if (p.body.velocity.y > PHYSICS.FALL_VELOCITY_THRESHOLD) {
            p.stateMachine.setState("fall");
          } else if (p.body.blocked.down || p.body.touching.down) {
            p.stateMachine.setState("land");
          }
        },
      })
      .addState("fall", {
        onEnter: (p) => p.play?.("fall", true),
        onUpdate: (p) => {
          if (p.body.blocked.down || p.body.touching.down) {
            p.stateMachine.setState("land");
          }
        },
      })
      .addState("land", {
        onEnter: (p) => {
          p.jumpsUsed = 0; // แตะพื้น = รีเซ็ต double jump
          p.play?.("land", true);
          p.scene.audio?.play("land");
          // land เป็น state สั้นๆ แล้วปล่อยกลับ idle/walk/run เอง — ทำผ่าน timer สั้นๆ กัน flicker
          p._landTimer = 80; // ms
        },
        onUpdate: (p, dt) => {
          p._landTimer -= dt;
          if (p._landTimer <= 0) {
            p.stateMachine.setState(Math.abs(p.body.velocity.x) > 5 ? (p.isWalking ? "walk" : "run") : "idle");
          }
        },
      });
  }

  // ---------- Attack / hitstun states ----------
  /**
   * แต่ละหมัดเดินผ่าน 3 เฟส: startup → active (เปิด hitbox) → recovery
   * เก็บ phase ไว้ใน _atk แทนการทำ state แยกย่อย เพราะโครงเวลาเหมือนกันทุกหมัด
   */
  _registerCombatStates() {
    this.stateMachine
      .addState("attack", {
        onEnter: (p) => {
          const spec = resolveAttack(BASIC_COMBO[p.comboStep], p.characterKey);
          p.currentAttack = spec;
          p._atk = { phase: "startup", t: spec.startup, spawned: false };
          p.play?.(`attack_${p.comboStep + 1}`, true);
          p._lunge(spec.lungeX);
          p.scene.audio?.play("swing"); // เสียงลมตอนเหวี่ยง — ออกทุกครั้งแม้ตบไม่โดน
        },
        onUpdate: (p, dt) => p._tickAttack(dt),
      })
      .addState("finisher", {
        onEnter: (p) => {
          p.currentAttack = resolveAttack(FINISHER, p.characterKey);
          p._atk = { phase: "startup", t: p.currentAttack.startup, hitsDone: 0, sinceHit: 0 };
          p.play?.("finisher", true);
          p._lunge(40);
          p.finisherReady = false;
          // ไม้ตาย: เหวี่ยงยาวกว่า pitch ต่ำกว่า ให้รู้ว่าเป็นท่าใหญ่ตั้งแต่ก่อนโดน
          p.scene.audio?.play("swing", { pitch: 0.8, volume: 1.4 });
        },
        onUpdate: (p, dt) => p._tickFinisher(dt),
      })
      .addState("summon", {
        onEnter: (p) => {
          p.body.setVelocityX(0); // ยืนนิ่งตอนเรียก = ราคาของท่า พลาดแล้วโดนสวนเต็ม ๆ
          p.play?.("attack_3", true); // placeholder: ยืมท่าตบปิดชุดมาใช้เป็นท่ายืนเรียก
          p._summonTimer = STAND.ownerLock;
          p.activeStand = new Stand(p.scene, p);
        },
        onUpdate: (p, dt) => {
          p._summonTimer -= dt;
          if (p._summonTimer <= 0) {
            p.activeStand = null;
            p._toNeutralState();
          }
        },
      })
      .addState("block", {
        onEnter: (p) => {
          p.body.setVelocityX(0); // กันอยู่กับที่ ขยับไม่ได้
          p.play?.("block", true);
        },
        onUpdate: (p) => {
          // ปล่อยปุ่มเมื่อไหร่ก็เลิกกัน (เช็คจาก flag ที่ handleMovement ตั้งให้)
          if (!p._blockHeld) p._toNeutralState();
        },
      })
      .addState("taunt", {
        onEnter: (p) => {
          p.body.setVelocityX(0); // ยืนนิ่งตอนยั่ว = เปิดช่องให้โดนสวน
          p.play?.("taunt", true);
          p._tauntTimer = Player.TAUNT_MS;
          p._tauntT = 0;
          p._baseScaleY = p.scaleY;
          p._baseScaleX = p.scaleX;
        },
        onUpdate: (p, dt) => {
          p._tauntTimer -= dt;
          // เขย่งหัวเราะ: บีบ-ยืดตัวเป็นจังหวะ (เฟรมเดียวแต่ดูมีชีวิต)
          // ใช้ scale แทนการขยับ y เพื่อไม่ให้ไปยุ่งกับ physics body
          p._tauntT += dt;
          const phase = (p._tauntT / Player.TAUNT_BOUNCE_MS) * Math.PI * 2;
          const squash = Math.sin(phase) * Player.TAUNT_SQUASH;
          p.setScale(p._baseScaleX * (1 - squash * 0.5), p._baseScaleY * (1 + squash));
          if (p._tauntTimer <= 0) {
            p.setScale(p._baseScaleX, p._baseScaleY); // คืนสเกลเดิมเสมอ กันค้าง
            p._toNeutralState();
          }
        },
        onExit: (p) => {
          // โดนตีขัดกลางคัน ก็ต้องคืนสเกลเหมือนกัน
          if (p._baseScaleX != null) p.setScale(p._baseScaleX, p._baseScaleY);
        },
      })
      // แปลงร่าง — ยืนนิ่ง โดนตีไม่ได้ (ดู isInvulnerable) · ภาพทั้งหมดมาจากคลิป จังหวะอยู่ใน TRANSFORM.timeline
      //   เรืองแสง (tf_glow) -> ปะทุเป็นควัน (tf_erupt) -> ควันท่วมมิด สลับเป็นไททันที่ยืนคำราม (roar)
      .addState("transform", {
        onEnter: (p) => {
          p.body.setVelocityX(0);
          p._resetCombo();
          p.combat?.clearFor(p);
          p.transformCooldown = TRANSFORM.cooldownMs;
          p._tf = { t: 0, erupted: false, swapped: false, shook: false };
          p.play?.("tf_glow", true);
          p.scene.audio?.play("swing", { pitch: 0.5, volume: 1.2 });
        },
        onUpdate: (p, dt) => {
          const T = TRANSFORM.timeline;
          const tf = p._tf;
          tf.t += dt;
          p.body.setVelocityX(0);
          if (!tf.erupted && tf.t >= T.eruptAt) {
            tf.erupted = true;
            p.play?.("tf_erupt", true);
            p.scene.transformFx?.erupt(p); // ควันเล่นเป็นภาพซ้อนแทน -> ซ่อนตัวจริงไว้ข้างใต้
            p.setAlpha(0);
          }
          if (!tf.swapped && tf.t >= T.swapAt) p._swapToAlt();
          if (!tf.shook && tf.t >= T.roarShakeAt) {
            tf.shook = true;
            p.scene.cameras?.main.shake(600, 0.007);
            // v33 เสียงคำรามจริงจากคลิป (แทนเสียงสังเคราะห์) — แปลงร่างเล่นครั้งเดียวตรงนี้
            if (p.scene.audio?.playSample) p.scene.audio.playSample("oat_titan_roar");
            else p.scene.audio?.play("hit", { pitch: 0.35, volume: 1.3 });
          }
          if (tf.t >= T.endAt) p._toNeutralState();
        },
        onExit: (p) => {
          if (p._tf && !p._tf.swapped) p._swapToAlt(); // กันกรณีถูกตัดกลางคัน — ต้องจบในร่างใหม่เสมอ
          p._tf = null;
        },
      })
      // สกิลแบบมีจังหวะ (เช่น สกิล 2 ไททัน) — เล่นท่ายาวท่าเดียว ปล่อย hitbox ตามเวลาที่กำหนด
      .addState("skill", {
        onEnter: (p) => {
          const d = p._skill.def;
          p.body.setVelocityX(0);
          p._resetCombo();
          p.play?.(d.anim, true);
          if (d.startSound !== false) p.scene.audio?.play("swing", { pitch: 0.6, volume: 1.2 });
          d.onStart?.(p, p._skill);
        },
        // def เพิ่มเติม (v29): onStart / onUpdate(p, sk, dt) / onEnd — สกิลที่มี logic เอง (เช่น บ่วงบาศ)
        //   sk.endAt = จบก่อนกำหนด (ms) · startSound: false = ไม่เล่นเสียงเหวี่ยงตอนเริ่ม
        onUpdate: (p, dt) => {
          const sk = p._skill;
          const d = sk.def;
          sk.t += dt;
          p.body.setVelocityX(0);
          d.onUpdate?.(p, sk, dt);
          for (const ev of d.events ?? []) {
            if (sk.fired.has(ev) || sk.t < ev.atMs) continue;
            sk.fired.add(ev);
            ev.fn(p);
          }
          for (const h of d.hits ?? []) {
            if (sk.fired.has(h) || sk.t < h.atMs) continue;
            sk.fired.add(h);
            const spec = resolveAttack(h.spec, p.characterKey);
            p.combat?.spawnHitbox({ attacker: p, duration: spec.active, spec, feedsCombo: false });
            if (h.shake) p.scene.cameras?.main.shake(h.shake[0], h.shake[1]);
            if (h.sound) p.scene.audio?.play("hit", h.sound);
          }
          if (sk.t >= (sk.endAt ?? d.durationMs)) p._toNeutralState();
        },
        onExit: (p) => {
          const d = p._skill?.def;
          if (p._skill) d?.onEnd?.(p, p._skill); // จบเอง หรือถูกตัด (โดนตี) — ปล่อยสิ่งที่ค้างไว้
          if (d?.onEndFx) p.scene.transformFx?.[d.onEndFx]?.(p);
          p._skill = null;
        },
      })
      // การ์ดแตก — ยืนแข็งทำอะไรไม่ได้ โดนตีฟรี (ใช้เฟรม hurt ไม่ต้องมีอาร์ตใหม่ + กระพริบให้รู้ว่าแตก)
      .addState("guardbreak", {
        onEnter: (p) => {
          p.body.setVelocityX(0);
          p.play?.("hurt", true);
          p._stunTimer = GUARD.breakStunMs;
          p._blinkT = 0;
          p._resetCombo();
          p.combat?.clearFor(p);
        },
        onUpdate: (p, dt) => {
          p._blinkT += dt;
          p.setAlpha(Math.floor(p._blinkT / 90) % 2 ? 0.55 : 1);
          p._stunTimer -= dt;
          if (p._stunTimer <= 0) p._toNeutralState();
        },
        onExit: (p) => {
          p.setAlpha(1);
          p.guard = GUARD.max * GUARD.refillAfterBreak;
          p._guardRegenDelay = GUARD.regenDelayMs;
        },
      })
      // โดนลาก (เช่น ไททันบ้าวิ่งชน) — ตำแหน่งถูกคุมโดยผู้ลาก (grabber.holdPosition) ทำอะไรไม่ได้
      .addState("grabbed", {
        onEnter: (p) => {
          p.body.setVelocity(0, 0);
          p.play?.("hurt", true);
          p.activeStand?.cancel();
          p.activeStand = null;
          p._resetCombo();
          p.combat?.clearFor(p);
        },
        onUpdate: (p) => {
          p.body.setVelocityX(0);
        },
        onExit: (p) => {
          p._grabber = null;
        },
      })
      // v32 ย่องแทง (Dear V.2 สกิล 2) — จังหวะเดียวกับหมัดปกติ startup/active/recovery
      //   แต่กดซ้ำหลังช่วง active = ตัดช่วงชักมีดกลับ แทงใหม่ทันที (ดู handleMovement) · ไม่นับคอมโบ
      .addState("sneakstab", {
        onEnter: (p) => {
          const S = p._sneak.def;
          const spec = resolveAttack(S.stab, p.characterKey);
          p.currentAttack = spec;
          p._atk = { phase: "startup", t: spec.startup, elapsed: 0 };
          p._stabVariant = p._stabVariant === "A" ? "B" : "A";
          p.play?.(`sneak_stab${p._stabVariant}`, false); // false = เริ่มท่าใหม่ทุกครั้งแม้กดรัว
          p._lunge(spec.lungeX);
          const now = p.scene.time?.now ?? 0;
          // เสียงมีด (สุ่ม 3 แบบ) — เว้นระยะขั้นต่ำ กันเสียงซ้อนเป็นก้อนตอนรัว
          if (!(p._lastStabSound > now - S.stabSoundGapMs)) {
            p._lastStabSound = now;
            const list = S.stabSamples;
            p.scene.audio?.playSample?.(list[Math.floor(Math.random() * list.length)], { rate: 0.94 + Math.random() * 0.12 });
          }
        },
        onUpdate: (p, dt) => {
          const spec = p.currentAttack;
          const a = p._atk;
          a.elapsed += dt;
          a.t -= dt;
          if (a.t > 0) return;
          if (a.phase === "startup") {
            a.phase = "active";
            a.t = spec.active;
            p.combat?.spawnHitbox({ attacker: p, duration: spec.active, spec, feedsCombo: false });
          } else if (a.phase === "active") {
            a.phase = "recovery";
            a.t = spec.recovery;
          } else {
            p.currentAttack = null;
            p._atk = null;
            if (p.attackQueued && p.isSneaking()) {
              p.attackQueued = false;
              p.stateMachine.setState("sneakstab", true);
              return;
            }
            p.attackQueued = false;
            p._toNeutralState();
          }
        },
      })
      .addState("hitstun", {
        onEnter: (p) => {
          p.play?.("hurt", true);
          // โดนสวนระหว่างเรียก = ร่างสลายทันที hitbox ที่ค้างอยู่เป็นโมฆะ
          p.activeStand?.cancel();
          p.activeStand = null;
          p._resetCombo(); // โดนสวนกลางคอมโบ = คอมโบขาด
          p.combat?.clearFor(p); // หมัดที่ค้างอยู่เป็นโมฆะ
        },
        onUpdate: (p, dt) => {
          p._stunTimer -= dt;
          if (p._stunTimer <= 0) {
            p.stateMachine.setState(p.body.blocked.down || p.body.touching.down ? "idle" : "fall");
          }
        },
      });
  }

  /** พุ่งไปข้างหน้าสั้นๆ ตอนออกหมัด ให้รู้สึกว่าหมัดมีน้ำหนัก ไม่ใช่ยืนตบเฉยๆ */
  _lunge(px) {
    if (!px) return;
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!onGround) return; // กลางอากาศไม่พุ่ง จะคุมยาก
    this.body.setVelocityX(px * this.facing);
  }

  _tickAttack(dt) {
    const spec = this.currentAttack;
    const a = this._atk;
    a.t -= dt;
    if (a.t > 0) return;

    if (a.phase === "startup") {
      a.phase = "active";
      a.t = spec.active;
      this.combat?.spawnHitbox({ attacker: this, duration: spec.active, spec });
      this.onAttackActive?.(spec); // เอฟเฟกต์ตอนหมัดออก (เช่น ไฟปากกระบอกของลูกซอง)
      // ตัวละครที่ "ไม่ได้ตีเอง" (Bomb) — ให้ร่างยมฑูตวาบมาฟันแทนหมัด ดาเมจยังเป็นของ BASIC_COMBO เหมือนเดิม
      if (this.constructor.ATTACKS_VIA_SUMMON) new StandSlash(this.scene, this, this.comboStep);
    } else if (a.phase === "active") {
      a.phase = "recovery";
      a.t = spec.recovery;
    } else {
      this._finishAttack();
    }
  }

  _tickFinisher(dt) {
    const a = this._atk;
    const F = this.currentAttack; // ค่าที่ resolve ตามตัวละคร/ร่างแล้ว (เดิมอ่าน FINISHER ตรง ๆ ค่าปรับต่อตัวเลยไม่มีผล)
    a.t -= dt;

    if (a.phase === "startup") {
      if (a.t <= 0) {
        a.phase = "flurry";
        a.sinceHit = F.hitInterval; // ตบทันทีที่เข้าเฟส ไม่ต้องรออีกจังหวะ
      }
      return;
    }

    if (a.phase === "flurry") {
      a.sinceHit += dt;
      if (a.sinceHit >= F.hitInterval) {
        a.sinceHit = 0;
        a.hitsDone += 1;
        const isFinal = a.hitsDone >= F.hits;
        this.combat?.spawnHitbox({
          attacker: this,
          duration: F.hitInterval * 0.9,
          spec: F,
          isFinalHit: isFinal,
        });
        // ไม้ตายของ Bomb: ไม่ต้องวาบทุกฮิต (9 ฮิตจะพรืด) — เอาแค่ทุก 3 ฮิตกับฮิตปิด
        if (this.constructor.ATTACKS_VIA_SUMMON && (isFinal || a.hitsDone % 3 === 1)) {
          new StandSlash(this.scene, this, a.hitsDone % 3);
        }
        if (isFinal) {
          a.phase = "recovery";
          a.t = F.recovery;
        }
      }
      return;
    }

    if (a.t <= 0) this._finishAttack();
  }

  /** จบหมัดหนึ่งครั้ง — ตัดสินว่าต่อคอมโบ, ออกไม้ตาย, หรือกลับสู่ท่าปกติ */
  _finishAttack() {
    const wasFinisher = this.currentAttack?.name === FINISHER.name; // spec ที่ resolve แล้วเป็นคนละ object
    this.currentAttack = null;
    this._atk = null;

    if (wasFinisher) {
      this._resetCombo();
      this._toNeutralState();
      return;
    }

    this.comboStep += 1;
    this.comboTimer = COMBO_WINDOW;

    if (this.comboStep >= BASIC_COMBO.length) {
      // ครบ 3 จังหวะแล้ว — จะได้ไม้ตายต่อก็ต่อเมื่อ "เข้าครบ 3" จริงเท่านั้น
      if (this.hitsLanded >= BASIC_COMBO.length) {
        this.finisherReady = true;
        this.finisherTimer = FINISHER_WINDOW;
      }
      this.comboStep = 0;
      if (!this.finisherReady) this.hitsLanded = 0;
    }

    if (this.attackQueued) {
      this.attackQueued = false;
      this._startAttack();
      return;
    }
    this._toNeutralState();
  }

  /**
   * ตรวจดับเบิลแท็ป A/D -> วิ่งเร็วขึ้น
   * เก็บเวลาที่ "เพิ่งกด" ทิศนั้นครั้งล่าสุด ถ้ากดซ้ำทิศเดิมภายใน DASH_TAP_MS ถือว่าดับเบิลแท็ป
   * ดาชค้างไว้จนกว่าจะปล่อยปุ่มทิศนั้น หรือเปลี่ยนทิศ
   */
  _updateDash(input, dt) {
    this._tapClock = (this._tapClock ?? 0) + dt;
    const dir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
    const prevDir = this._prevDir ?? 0;

    if (dir !== 0 && prevDir !== dir) {
      // เพิ่งเริ่มกดทิศนี้
      const last = this._lastTap?.[dir];
      if (last != null && this._tapClock - last <= Player.DASH_TAP_MS) {
        this._dashing = true;
      }
      this._lastTap = { ...(this._lastTap ?? {}), [dir]: this._tapClock };
    }
    if (dir === 0 || (prevDir !== 0 && dir !== prevDir)) {
      this._dashing = false; // ปล่อยปุ่มหรือเปลี่ยนทิศ = เลิกวิ่ง
    }
    this._prevDir = dir;
  }

  /**
   * สกิล 1-3
   *  1 = คอมโบรัว (ของเดิมที่เคยต้องตีครบ 3 ครั้งถึงปลด ตอนนี้กดใช้ได้เลย)
   *  2, 3 = ยังไม่ทำ (ปิดไว้ก่อน ปุ่มบนจอจะเป็นสีเทา)
   * @param {1|2|3} n
   * @returns {boolean} ใช้ได้หรือไม่
   */
  trySkill(n) {
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!onGround) return false;
    if (this.isAttacking() || this.isStunned() || this.isSummoning() || this.isBlocking() || this.isTaunting()) return false;
    const def = this._skillDefs()[n];
    // สกิล 1 แบบรัว (finisher): ตัวละครทั่วไปมีเสมอ · ตัวที่มีอาวุธ ต้องเป็นอาวุธที่ประกาศ "rush"
    if (n === 1 && (def === "rush" || (def == null && !this._usesWeaponSkills()))) {
      // v33 มีคูลดาวน์แล้ว (เดิมกดซ้ำได้ทันที = แรงสุดในเกม) — นับแยกร่าง/อาวุธเหมือนสกิลอื่น
      if (this.skillCooldownLeft(1) > 0) return false;
      this._skillCd = this._skillCd ?? {};
      this._skillCd[this._skillCdKey(1)] = FINISHER.cooldownMs ?? 0;
      this.stateMachine.setState("finisher", true);
      return true;
    }
    if (!def || typeof def !== "object" || this.skillCooldownLeft(n) > 0) return false;
    this._skillCd = this._skillCd ?? {};
    const key = this._skillCdKey(n);
    if (def.charges > 1) {
      // สกิลแบบมีหลายครั้ง: คูลดาวน์เริ่มนับเมื่อใช้ครบ แล้วเติมเต็มพร้อมกัน
      this._skillCharges = this._skillCharges ?? {};
      const left = (this._skillCharges[key] ?? def.charges) - 1;
      this._skillCharges[key] = left > 0 ? left : def.charges;
      if (left <= 0) this._skillCd[key] = def.cooldownMs ?? 0;
    } else {
      this._skillCd[key] = def.cooldownMs ?? 0;
    }
    this._skill = { n, def, t: 0, fired: new Set() };
    this.stateMachine.setState("skill", true);
    return true;
  }

  /** (เลิกใช้ — HUD ใช้ isSkillEnabled แทน) */
  static SKILL_ENABLED = { 1: true, 2: false, 3: false };

  /** กำลังวิ่ง (ดับเบิลแท็ป) อยู่ไหม — เผื่อ HUD/เอฟเฟกต์เอาไปใช้ */
  isDashing() {
    return !!this._dashing;
  }

  _toNeutralState() {
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!onGround) {
      this._toAirState();
    } else {
      this.stateMachine.setState(Math.abs(this.body.velocity.x) > 5 ? (this.isWalking ? "walk" : "run") : "idle");
    }
  }

  /**
   * ปุ่มตี = ต่อยธรรมดาซ้ำไปเรื่อย ๆ ไม่ไต่คอมโบ ไม่ปลดไม้ตาย
   * (ระบบคอมโบเดิมถูกย้ายไปเป็น "สกิล 1" แล้ว ดู trySkill())
   * ยังสลับเฟรมหมัด 1/2/3 ไปมาเพื่อไม่ให้ภาพซ้ำจำเจ แต่ดาเมจใช้ของหมัดแรกเสมอ
   */
  _startAttack() {
    this.comboStep = (this._punchVariant ?? 0) % BASIC_COMBO.length;
    this._punchVariant = ((this._punchVariant ?? 0) + 1) % BASIC_COMBO.length;
    this.stateMachine.setState("attack", true);
  }

  isAttacking() {
    return (
      this.stateMachine.is("attack") ||
      this.stateMachine.is("finisher") ||
      this.stateMachine.is("skill") ||
      this.stateMachine.is("sneakstab")
    );
  }

  /**
   * เขย่งตอนยืน — ขยับ "ภาพ" ขึ้นลงโดยที่ตัว body ยังอยู่กับที่
   *
   * ทำไมต้องมี: อาร์ตท่ายืนที่ AI วาดมาหลายเฟรม มักได้ท่าเดิมเป๊ะทุกเฟรม (ความสูงต่างกันไม่ถึง 3%)
   * ซึ่งไม่พอให้ตาเห็นเป็นการเขย่ง โค้ดขยับให้แทนจึงคุมได้แน่นอนกว่าและใช้อาร์ตเฟรมเดียวก็พอ
   *
   * กลไก: ดัน body.offset.y ลง k แล้วปล่อยให้ตัว collider ดันตัวละครขึ้นมา k เอง
   * ผลคือ body ยังนั่งอยู่บนพื้นเท่าเดิม แต่สไปรท์ถูกวาดสูงขึ้น k px — ได้การเขย่งฟรีโดยไม่แตะ physics
   */
  _tickIdleBob(dt) {
    const px = this.constructor.IDLE_BOB_PX ?? 0;
    if (!px) return;
    const period = this.constructor.IDLE_BOB_MS ?? 800;
    this._idleBobT = ((this._idleBobT ?? 0) + dt) % period;
    // ครึ่งบวกของ sine: ขึ้นเร็ว-ลงช้าเล็กน้อย ให้รู้สึกมีน้ำหนักมากกว่า sine เต็มคลื่น
    const phase = (this._idleBobT / period) * Math.PI * 2;
    this._setIdleBob(px * Math.max(0, Math.sin(phase)));
  }

  /** @param {number} worldPx ความสูงที่ยกภาพขึ้น (หน่วยพิกเซลในโลกเกม) */
  _setIdleBob(worldPx) {
    if (this._baseBodyOffsetY == null) return;
    // offset เป็นหน่วยเฟรมดิบ จึงต้องหารด้วย scale ก่อน
    this.body.offset.y = this._baseBodyOffsetY + worldPx / (this.scaleY || 1);
  }

  /**
   * รับบัฟเพิ่มพลังโจมตี — ได้ซ้ำระหว่างที่บัฟเดิมยังอยู่ก็แค่ต่อเวลา ไม่คูณทับกัน
   * (ถ้าคูณทับได้ คนที่เก็บบอสได้สองรอบติดจะแรงเกินจนเกมจบไว)
   */
  applyPowerBuff(durationMs, multiplier) {
    this.buffTimer = Math.max(this.buffTimer, durationMs);
    this.damageMultiplier = multiplier;
  }

  /** กำลังเรียกร่างอยู่ — ขยับไม่ได้ ตีไม่ได้ จนกว่าจะครบ ownerLock */
  isSummoning() {
    return this.stateMachine.is("summon");
  }

  /** พร้อมเรียกร่างหรือยัง (ใช้โชว์บน HUD ด้วย) */
  canSummon() {
    return this.constructor.CAN_SUMMON === true && this.standCooldown <= 0;
  }

  /**
   * สั่งเรียกร่าง — คืน true ถ้าออกท่าได้จริง
   * เรียกได้เฉพาะตอนยืนอยู่บนพื้นและไม่ได้ติดท่าอื่นอยู่
   */
  trySummon() {
    if (!this.canSummon()) return false;
    if (this.isStunned() || this.isAttacking() || this.isSummoning()) return false;
    if (!(this.body.blocked.down || this.body.touching.down)) return false;

    this.standCooldown = STAND.cooldown;
    this.stateMachine.setState("summon");
    return true;
  }

  // ---------- แปลงร่าง ----------
  /**
   * คลาสลูกประกาศ static FORM_ALT = { textureKey, firstFrame, prefix, characterKey,
   *   standingHeightInFrame, bottomMargin, worldHeight, displayName }
   */
  hasTransform() {
    return !!this.constructor.FORM_ALT;
  }

  isTransformed() {
    return this.form === "alt";
  }

  isTransforming() {
    return this.stateMachine.is("transform");
  }

  isUsingSkill() {
    return this.stateMachine.is("skill");
  }

  /**
   * สกิลที่มีจังหวะของร่างปัจจุบัน { เลขสกิล: def }
   * def = { anim, durationMs, cooldownMs, armor, hits: [{ atMs, spec, shake, sound }], onEndFx }
   * ร่างปกติอ่าน static SKILLS ของคลาส · ร่างแปลงอ่าน FORM_ALT.skills
   */
  _skillDefs() {
    if (this.isTransformed()) return this.constructor.FORM_ALT?.skills ?? {};
    if (this._usesWeaponSkills()) return this.weapon?.skills ?? {};
    return this.constructor.SKILLS ?? {};
  }

  /** สกิลนี้มีในร่าง/อาวุธปัจจุบันไหม (HUD ใช้ตัดสินสีปุ่ม) */
  isSkillEnabled(n) {
    const def = this._skillDefs()[n];
    if (this._usesWeaponSkills()) return !!def; // ตัวมีอาวุธ: สกิล 1 ก็ต้องประกาศเอง
    return n === 1 || !!def;
  }

  /** คูลดาวน์ที่เหลือของสกิล (ms) — แยกตามร่าง และตามอาวุธ */
  skillCooldownLeft(n) {
    return this._skillCd?.[this._skillCdKey(n)] ?? 0;
  }

  /** สกิลแบบหลายครั้งเหลือกี่ครั้ง (HUD เอาไปโชว์) — สกิลทั่วไปคืน null */
  skillChargesLeft(n) {
    const def = this._skillDefs()[n];
    if (!def?.charges || def.charges <= 1) return null;
    if (this.skillCooldownLeft(n) > 0) return 0;
    return this._skillCharges?.[this._skillCdKey(n)] ?? def.charges;
  }

  _skillCdKey(n) {
    return this._usesWeaponSkills() ? `${this.form}:${this.weapon.key}:${n}` : `${this.form}:${n}`;
  }

  // ---------- สลับอาวุธ ----------
  /** คลาสลูกประกาศ static WEAPONS = [{ key, label, icon, color, enabled, skills: {1: def | "rush", ...} }] */
  hasWeapons() {
    return !!this.constructor.WEAPONS?.length;
  }

  /** ชุดสกิลมาจากอาวุธ (ร่างแปลงใช้สกิลของร่างนั้นแทน) */
  _usesWeaponSkills() {
    return this.hasWeapons() && !this.isTransformed();
  }

  /** อาวุธที่ถืออยู่ (null = ตัวละครนี้ไม่มีระบบอาวุธ) */
  get weapon() {
    return this.constructor.WEAPONS?.[this.weaponIndex] ?? null;
  }

  /**
   * ใช้ชุดท่า + ค่าต่อสู้ของอาวุธที่ถือ (prefix / combatKey ใน WEAPONS)
   * ท่าที่เล่นอยู่ (ยืน/วิ่ง/ลอย) สลับเป็นท่าชื่อเดียวกันของชุดใหม่ทันที
   */
  _applyWeapon() {
    const w = this.weapon;
    if (!w || this.isTransformed()) return;
    const oldPrefix = this.animPrefix;
    const cur = this.anims?.currentAnim?.key;
    this.animPrefix = w.prefix ?? this.constructor.ANIM_PREFIX;
    this.characterKey = w.combatKey ?? this.animPrefix.replace(/\/$/, "");
    if (cur && oldPrefix !== this.animPrefix && cur.startsWith(oldPrefix)) {
      const name = cur.slice(oldPrefix.length);
      if (!name.includes("/")) this.play?.(name, true);
    }
  }

  canSwitchWeapon() {
    if (!this._usesWeaponSkills() || this._weaponSwitchCd > 0) return false;
    return !(this.isAttacking() || this.isStunned() || this.isSummoning() || this.isTransforming() || this.isTaunting());
  }

  /** ไปอาวุธถัดไปที่ enabled (วนกลับหัว) — คืน true ถ้าเปลี่ยนจริง */
  trySwitchWeapon() {
    if (!this.canSwitchWeapon()) return false;
    const W = this.constructor.WEAPONS;
    let i = this.weaponIndex;
    for (let k = 0; k < W.length; k++) {
      i = (i + 1) % W.length;
      if (W[i].enabled !== false) break;
    }
    if (i === this.weaponIndex) return false;
    this.weaponIndex = i;
    this._weaponSwitchCd = WEAPON_SWITCH_COOLDOWN_MS;
    this._applyWeapon();
    this.scene.audio?.play("swing", { pitch: 1.7, volume: 0.5 });
    this.scene.showFloatLabel?.(this, W[i].label, "#e2e8f0");
    return true;
  }

  /** CombatSystem ข้ามคนที่คืนค่า true */
  isInvulnerable() {
    return this.isTransforming() || this._formBreakInvuln > 0;
  }

  canTransform() {
    if (!this.hasTransform() || this.isTransformed() || this.transformCooldown > 0) return false;
    if (!(this.body.blocked.down || this.body.touching.down)) return false;
    return !(this.isAttacking() || this.isStunned() || this.isSummoning() || this.isBlocking() || this.isTaunting());
  }

  tryTransform() {
    if (!this.canTransform()) return false;
    this.stateMachine.setState("transform");
    return true;
  }

  /** ชื่อที่ HUD แสดง — ร่างใหม่ใช้ชื่อของร่างนั้น */
  get displayName() {
    return this.isTransformed() ? this.constructor.FORM_ALT.displayName : this.constructor.DISPLAY_NAME;
  }

  _swapToAlt() {
    if (this._tf) this._tf.swapped = true;
    if (this.isTransformed()) return;
    // ควันภาพซ้อน (เริ่มตอนปะทุ) บังอยู่ -> โชว์ตัวจริงที่เป็นไททันแล้วข้างใต้
    this.setAlpha(1);
    const A = this.constructor.FORM_ALT;
    this._baseForm = {
      textureKey: this.texture.key,
      firstFrame: this.frame.name,
      prefix: this.animPrefix,
      characterKey: this.characterKey,
      ...this._scaleArgs,
    };
    this._applyForm({ ...A, targetWorldHeight: A.worldHeight });
    this.form = "alt";
    this.formMaxHp = A.maxHp ?? TRANSFORM.titanHp;
    this.formHp = this.formMaxHp;
    this.formTimeLeft = TRANSFORM.titanDurationMs || 0;
    this._formTimed = this.formTimeLeft > 0; // titanDurationMs 0 = ไม่จำกัดเวลา
    this._restoreTint();
    this.play?.("roar", true);
  }

  /** กลับร่างเดิม — scene เรียกตอนเลือดหมดหลอด (ก่อนเกิดใหม่) */
  revertForm() {
    if (!this.isTransformed()) return;
    if (this.isTransforming() || this.isUsingSkill()) this.stateMachine.setState("idle");
    this._applyForm(this._baseForm);
    this.form = "base";
    this.formHp = 0;
    this.formTimeLeft = 0;
    this._formTimed = false;
    this.setAlpha(1);
    this._restoreTint();
    if (this.stateMachine.is("idle")) this.play?.("idle", true);
  }

  /**
   * หักดาเมจจากหลอดร่างแปลง — scene เรียกก่อนหักหลอดปกติ
   * @returns {boolean} true = ร่างแปลงรับไว้แล้ว (scene ไม่ต้องหักหลอดปกติ)
   */
  absorbFormDamage(dealt) {
    if (!this.isTransformed()) return false;
    this.formHp = Math.max(0, this.formHp - dealt);
    if (this.formHp <= 0) this.breakForm();
    return true;
  }

  /**
   * v33 ร่างแปลงหมดเวลา -> กลับร่าง (ควันเหมือนหลอดแตก แต่ไม่มีอมตะ/ภาพหยุด — ไม่ได้โดนอะไร)
   * รอให้สกิล/ท่าแปลงที่ค้างอยู่จบก่อน ไม่ตัดกลางท่า
   */
  _tickFormTime(dt) {
    // ⚠️ อย่าเช็ค formTimeLeft > 0 เป็นเงื่อนไขออก — ค่าติดลบระหว่างรอสกิลจบต้องยังถูกตรวจทุกเฟรม
    if (!this.isTransformed() || !this._formTimed) return;
    if (this.isTransforming()) return; // นับหลังคุมตัวได้
    if (this.formTimeLeft > 0) this.formTimeLeft = Math.max(0, this.formTimeLeft - dt);
    if (this.formTimeLeft > 0 || this.isUsingSkill() || this.isAttacking()) return;
    this.revertForm();
    this.scene.transformFx?.revertPuff?.(this);
    this.scene.showFloatLabel?.(this, "TIME UP", "#fdba74");
  }

  /** หลอดร่างแปลงหมด: ควันปะทุ -> กลับร่างเดิม (ไม่เสียชีวิต) + อมตะสั้น ๆ */
  breakForm() {
    if (!this.isTransformed()) return;
    const B = TRANSFORM.formBreak;
    this.revertForm();
    this._formBreakInvuln = B.invulnMs;
    this.combat?.clearFor(this);
    this.scene.transformFx?.revertPuff?.(this);
    this.scene.hitstop?.(B.hitstopMs);
    this.scene.cameras?.main.shake(300, 0.006);
    this.scene.audio?.play("hit", { pitch: 0.4, volume: 1.2 });
    this.scene.showFloatLabel?.(this, "TITAN BREAK!", "#fdba74");
  }

  /** เปลี่ยน atlas / ชื่อ animation / ค่าต่อสู้ / ขนาดตัว โดยเท้าอยู่ที่เดิม */
  _applyForm(f) {
    const x = this.x;
    const feetY = this.body.bottom;
    this.setTexture(f.textureKey, f.firstFrame);
    this.animPrefix = f.prefix;
    this.characterKey = f.characterKey;
    this.applySpriteScale(f.standingHeightInFrame, f.targetWorldHeight, f.bottomMargin);
    this.placeFeetAt(x, feetY);
  }

  _restoreTint() {
    this.clearTint();
    if (this.baseTint != null) this.setTint(this.baseTint);
  }

  // ---------- v34 สถานะผิดปกติ (debuff) ----------
  // root = เดิน/กระโดดไม่ได้ (ยังตี/กันได้) · silence = ใช้สกิล/แปลงร่าง/สลับอาวุธไม่ได้
  // blind = ตีวืดทุกหมัด (CombatSystem ข้าม) · slow = เดินช้าลงตามตัวคูณ
  // คนที่ไม่ติดสถานะ (ย่องอยู่) applyStatus คืน false · ต่ออายุได้ (เอาค่ายาวกว่า)

  applyStatus(name, ms, value) {
    if (this.isStatusImmune?.()) return false;
    this._status = this._status ?? {};
    const cur = this._status[name];
    this._status[name] = { left: Math.max(cur?.left ?? 0, ms), value: value ?? cur?.value };
    return true;
  }

  hasStatus(name) {
    return (this._status?.[name]?.left ?? 0) > 0;
  }

  isRooted() {
    return this.hasStatus("root");
  }

  isSilenced() {
    return this.hasStatus("silence");
  }

  isBlinded() {
    return this.hasStatus("blind");
  }

  slowMul() {
    return this.hasStatus("slow") ? this._status.slow.value ?? 0.5 : 1;
  }

  clearStatus() {
    this._status = null;
  }

  _tickStatus(dt) {
    if (!this._status) return;
    let any = false;
    for (const k in this._status) {
      const s = this._status[k];
      if (s.left > 0) {
        s.left -= dt;
        any = true;
      }
    }
    if (!any) this._status = null;
    // ไม่ใช้ tint บอกสถานะ — P2/ร่างแปลงใช้ tint อยู่แล้ว เคลียร์แล้วสีหาย · ภาพบอกสถานะ = confetti + ป้าย DAZED
  }

  /** ตัดปุ่มที่สถานะไม่อนุญาต (ใช้ทุกเส้นทาง: ปกติ + ระหว่าง hitstop) */
  _filterInputByStatus(input) {
    if (!this._status) return input;
    const out = { ...input };
    if (this.isRooted()) {
      out.left = out.right = out.jumpPressed = false;
      if (this.body?.velocity) this.body.velocity.x = 0;
    }
    if (this.isSilenced()) {
      out.skillPressed = 0;
      out.transformPressed = false;
      out.summonPressed = false;
    }
    return out;
  }

  // ---------- v32 โหมดย่อง (Dear V.2 สกิล 2) ----------
  // ค่าทั้งหมดมาจาก def (DEARV2_SNEAK) ที่ส่งเข้ามาตอนเริ่ม — Player ไม่ผูกกับตัวละครไหน

  /** เข้าโหมดย่อง — เรียกจาก onStart ของสกิล (ระหว่างท่าเข้าโหมดก็ได้รับผลแล้ว) */
  startSneak(def) {
    this._sneak = { def, left: def.durationMs, lastStepFrame: -1 };
    this.setAlpha(def.alpha);
    this.scene.audio?.playSample?.("dv2_sneak_laugh");
    this.scene.showFloatLabel?.(this, "SNEAK", "#c4b5fd");
  }

  isSneaking() {
    return !!this._sneak && this._sneak.left > 0;
  }

  /** เวลาย่องที่เหลือ 0..1 (HUD วาดแถบเหนือหัว) */
  sneakRatio() {
    return this.isSneaking() ? this._sneak.left / this._sneak.def.durationMs : 0;
  }

  /** หมดเวลา / ตาย — คืนสภาพ และสลับท่าที่ค้างอยู่กลับเป็นท่าปกติ */
  endSneak() {
    if (!this._sneak) return;
    this._sneak = null;
    this.setAlpha(1);
    const back = { idle: "idle", walk: "run", run: "run", land: "land" }[this.stateMachine.currentStateName];
    if (back) {
      this.play?.(back, false);
      if (back === "run") this._setAnimFps(PHYSICS.RUN_ANIM_FPS);
    }
  }

  /** ไม่ติดสถานะใด ๆ (hitstun / knockback / grab / guard) */
  isStatusImmune() {
    return this.isSneaking();
  }

  /** scene ยังอัปเดตตัวนี้ระหว่าง hitstop (ทั้งจอหยุด แต่ตัวนี้ขยับได้) */
  ignoresHitstop() {
    return this.isSneaking();
  }

  /** ตัวคูณดาเมจที่ได้รับ — True Damage ไม่สนค่านี้ (ดู scene._applyDamage) */
  damageTakenMul() {
    return this.isSneaking() ? this._sneak.def.damageTakenMul : 1;
  }

  canBeGrabbed() {
    return !this.isStatusImmune();
  }

  _tickSneak(dt) {
    const sn = this._sneak;
    if (!sn) return;
    sn.left -= dt;
    if (sn.left <= 0) {
      this.endSneak();
      return;
    }
    // ตัวอื่น (เช่น กระพริบตอนอมตะ) อาจตั้ง alpha ทับ — ย้ำทุกเฟรม
    if (this.alpha !== sn.def.alpha) this.setAlpha(sn.def.alpha);
    // เสียงเขย่งตามจังหวะเท้าแตะพื้นในท่าย่องเดิน
    const cur = this.anims?.currentAnim?.key;
    if (cur && cur.endsWith("sneak_walk")) {
      const idx = (this.anims.currentFrame?.index ?? 1) - 1;
      if (idx !== sn.lastStepFrame) {
        sn.lastStepFrame = idx;
        if (sn.def.stepFrames.includes(idx)) this.scene.audio?.playSample?.("dv2_sneak_step", { volume: sn.def.stepVolume });
      }
    } else {
      sn.lastStepFrame = -1;
    }
  }

  /** หันตามปุ่มทิศที่กดอยู่ตอนเริ่มแทงใหม่ (รัวแทงไปพลางหันกลับได้) */
  _faceFromInput(input) {
    if (input.left && !input.right) {
      this.facing = -1;
      this.setFlipX(true);
    } else if (input.right && !input.left) {
      this.facing = 1;
      this.setFlipX(false);
    }
  }

  /**
   * เดินหน้าตัวเองหนึ่งเฟรมระหว่าง hitstop — physics/animation ของทั้งเกมหยุดอยู่ จึงขยับเอง
   *  - แนวนอนตาม velocity (แนวตั้งไม่ขยับ: ไม่มีการชนพื้นให้ ถ้าคำนวณแรงโน้มถ่วงเองจะจมพื้น)
   *  - เลื่อนเฟรม animation เอง (Phaser หยุด anim ระดับ "ชุดท่า" ด้วย pauseAll ตัวเดียวสั่งเล่นต่อไม่ได้)
   * พอ hitstop จบ Arcade body ดึงตำแหน่งจาก sprite ต่อให้เอง
   */
  stepWhileFrozen(dt) {
    const dx = (this.body.velocity.x * dt) / 1000;
    if (dx) {
      this.x += dx;
      if (this.body.position) this.body.position.x += dx;
    }
    const st = this.anims;
    const anim = st?.currentAnim;
    if (!anim?.frames?.length) return;
    const msPerFrame = st.msPerFrame || 1000 / (anim.frameRate || 12);
    this._frozenAnimAcc = (this._frozenAnimAcc ?? 0) + dt;
    while (this._frozenAnimAcc >= msPerFrame) {
      this._frozenAnimAcc -= msPerFrame;
      const i = st.currentFrame?.index ?? 1; // index ของ Phaser นับจาก 1
      let next = i; // = เฟรมถัดไป (อาเรย์นับจาก 0)
      if (next >= anim.frames.length) {
        if (anim.repeat !== -1) break; // ท่าเล่นครั้งเดียว: ค้างเฟรมสุดท้าย
        next = 0;
      }
      const f = anim.frames[next];
      if (typeof st.setCurrentFrame === "function") st.setCurrentFrame(f);
      else this.setFrame(f.textureFrame);
    }
  }

  /** โดนตีอยู่ / การ์ดแตก / โดนลาก — คุมตัวไม่ได้ทั้งหมด */
  isStunned() {
    return this.stateMachine.is("hitstun") || this.stateMachine.is("guardbreak") || this.isGrabbed();
  }

  isGrabbed() {
    return this.stateMachine.is("grabbed");
  }

  /** เริ่มโดนลาก — grabber ต้องมีเมธอด holdPosition(victim) ที่ระบบเรียกทุกเฟรม */
  grabBy(grabber) {
    if (!this.canBeGrabbed()) return false; // ย่องอยู่ = ลากไม่ได้ (ผู้เรียกควรเช็ค canBeGrabbed ก่อนอยู่แล้ว)
    this._grabber = grabber;
    this.stateMachine.setState("grabbed", true);
    return true;
  }

  /** ปล่อยจากการลาก แล้วกระเด็นตาม knockback (ไม่มีดาเมจในนี้ — scene หักเอง) */
  releaseGrab({ knockbackX = 0, knockbackY = 0, hitstun = 0 } = {}) {
    if (!this.isGrabbed()) return;
    this.stateMachine.setState("idle", true); // ออกจาก grabbed ก่อน applyHit จะได้เข้า hitstun ปกติ
    if (hitstun > 0) this.applyHit({ damage: 0, knockbackX, knockbackY, hitstun });
  }

  isGuardBroken() {
    return this.stateMachine.is("guardbreak");
  }

  /** มาตรการ์ดหมด → ยืนแข็ง + หยุดภาพนานกว่าปกติ + ป้ายเตือนเหนือหัว */
  _breakGuard() {
    this.guard = 0;
    this.stateMachine.setState("guardbreak", true);
    this.scene.hitstop?.(HITSTOP.guardBreak);
    this.scene.cameras?.main.shake(160, 0.005);
    this.scene.audio?.play("hit", { pitch: 0.55, volume: 1 });
    this.scene.showGuardBreak?.(this);
  }

  _resetCombo() {
    this.comboStep = 0;
    this.comboTimer = 0;
    this.hitsLanded = 0;
    this.finisherReady = false;
    this.finisherTimer = 0;
    this.attackQueued = false;
  }

  /** เรียกจาก CombatSystem เมื่อหมัดของตัวเองเข้าเป้า */
  notifyHitLanded() {
    if (this.currentAttack?.name === FINISHER.name) return; // หมัดในชุดไม้ตายไม่นับสะสมใหม่
    this.hitsLanded += 1;
  }

  /**
   * รับดาเมจ — เรียกจาก CombatSystem
   * @param {{damage:number, knockbackX:number, knockbackY:number, hitstun:number}} hit
   */
  applyHit({ damage, knockbackX, knockbackY, hitstun }) {
    // v32 โหมดย่อง: ไม่ติดสถานะใด ๆ — ไม่สะดุด ไม่กระเด็น ไม่เสียการ์ด (ดาเมจลดที่ scene._applyDamage)
    if (this.isStatusImmune()) {
      CombatSystem.flashVictim(this.scene, this);
      this.lastDamageTaken = damage;
      return;
    }
    if (this.isBlocking()) {
      // กันไว้ได้: ถอยเล็กน้อย ไม่เข้า hitstun — แต่มาตรการ์ดลด หมดเมื่อไหร่การ์ดแตก
      // ส่วนการหักดาเมจทำที่ scene._applyDamage เพราะ HP เก็บอยู่ที่ scene
      this.body.setVelocityX(knockbackX * Player.BLOCK_KNOCKBACK_MUL);
      this.guard -= GUARD.hitCost + damage * GUARD.damageCostMul;
      this._guardRegenDelay = GUARD.regenDelayMs;
      if (this.guard <= 0) {
        this._breakGuard();
        return;
      }
      this.scene.audio?.play("hit", { pitch: 1.5, volume: 0.6 });
      return;
    }
    // super armor ระหว่างสกิลบางท่า / โดนลากอยู่: เลือดลดตามปกติ (scene หักให้) แต่ไม่สะดุด ไม่กระเด็น
    // (โดนลาก: ถ้าหมัดทำให้หลุด ไททันบ้าจะหมดความหมาย — ให้ตีซ้ำระหว่างลากได้แต่ไม่หลุด)
    if ((this.isUsingSkill() && this._skill?.def.armor) || this.isGrabbed()) {
      CombatSystem.flashVictim(this.scene, this);
      this.lastDamageTaken = damage;
      return;
    }
    // โดนตีระหว่างการ์ดแตก: ยังแข็งอย่างน้อยเท่าเวลาที่เหลือ (หมัดเบาไม่ช่วยให้หลุดเร็วขึ้น)
    const breakLeft = this.isGuardBroken() ? this._stunTimer : 0;
    this._stunTimer = Math.max(hitstun, breakLeft);
    this.body.setVelocity(knockbackX, knockbackY);
    this.stateMachine.setState("hitstun", true);
    CombatSystem.flashVictim(this.scene, this);
    this.lastDamageTaken = damage;
  }

  /**
   * ปรับความเร็วเล่น animation ปัจจุบัน (fps) โดยไม่รีสตาร์ทเฟรม
   * ใช้กับท่าวิ่ง 4 เฟรม ที่ walk/run แชร์กัน — เปลี่ยนแค่จังหวะ ไม่เปลี่ยนรูป
   * @param {number} fps
   */
  _setAnimFps(fps) {
    if (!this.anims?.currentAnim) return;
    if (this.isSneaking?.()) return; // ท่าย่องเดินมี fps ของตัวเอง (walk/run state ตั้ง 4/10 ทับไม่ได้)
    this.anims.msPerFrame = 1000 / fps;
  }

  _toAirState() {
    this.stateMachine.setState(this.body.velocity.y < 0 ? "jump" : "fall");
  }

  /** กำลังกันอยู่ไหม */
  isBlocking() {
    return this.stateMachine.is("block");
  }

  /**
   * กัน — ทำได้เฉพาะตอนยืนกับพื้นและไม่ได้ทำอย่างอื่นอยู่
   * ตัวละครที่ไม่มีเฟรม block จะเรียกไม่ติด (คืน false เฉย ๆ)
   */
  tryBlock() {
    if (this.isSneaking()) return false; // กันแล้วการ์ดแตกได้ = ขัดกับ "ไม่ติดสถานะ"
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!onGround) return false;
    if (this.isAttacking() || this.isStunned() || this.isSummoning() || this.isTaunting()) return false;
    if (!this.scene.anims.exists(`${this.animPrefix}block`)) return false;
    if (this.isBlocking()) return true;
    this.stateMachine.setState("block");
    return true;
  }

  /** กำลังยั่วอยู่ไหม */
  isTaunting() {
    return this.stateMachine.is("taunt");
  }

  /**
   * ยั่ว — ทำได้เฉพาะตอนยืนอยู่กับพื้นและไม่ได้ทำอย่างอื่นอยู่
   * ตัวละครที่ไม่มีเฟรม taunt จะเรียกไม่ติด (คืน false เฉย ๆ ไม่พัง)
   * @returns {boolean} เริ่มท่าได้หรือไม่
   */
  tryTaunt() {
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!onGround) return false;
    if (this.isAttacking() || this.isStunned() || this.isSummoning() || this.isTaunting()) return false;
    if (!this.scene.anims.exists(`${this.animPrefix}taunt`)) return false;
    this.stateMachine.setState("taunt");
    return true;
  }

  /** กันค้าง = มาตรลด · ไม่ได้กัน = รอ regenDelay แล้วค่อยฟื้น · การ์ดแตกอยู่ = ไม่ฟื้น */
  _tickGuard(dt) {
    if (this.isBlocking()) {
      this.guard -= (GUARD.holdDrainPerSec * dt) / 1000;
      this._guardRegenDelay = GUARD.regenDelayMs;
      if (this.guard <= 0) this._breakGuard();
      return;
    }
    if (this.isGuardBroken() || this.guard >= GUARD.max) return;
    if (this._guardRegenDelay > 0) {
      this._guardRegenDelay -= dt;
      return;
    }
    this.guard = Math.min(GUARD.max, this.guard + (GUARD.regenPerSec * dt) / 1000);
  }

  /** นับถอยหลังหน้าต่างต่อคอมโบและหน้าต่างไม้ตาย — ปล่อยว่างนานไปคอมโบขาดเอง */
  _tickComboTimers(dt) {
    if (this.standCooldown > 0) this.standCooldown -= dt;
    if (this.transformCooldown > 0) this.transformCooldown -= dt;
    this._tickFormTime(dt);
    if (this._weaponSwitchCd > 0) this._weaponSwitchCd -= dt;
    if (this._formBreakInvuln > 0) {
      this._formBreakInvuln -= dt;
      // กระพริบบอกว่าอมตะ (การ์ดแตกกระพริบเองอยู่แล้ว ไม่ทับกัน)
      if (!this.isGuardBroken()) this.setAlpha(this._formBreakInvuln > 0 && Math.floor(this._formBreakInvuln / 80) % 2 ? 0.45 : 1);
    }
    for (const k in this._skillCd ?? {}) if (this._skillCd[k] > 0) this._skillCd[k] -= dt;
    this._tickSneak(dt);
    this._tickGuard(dt);
    if (this.buffTimer > 0) {
      this.buffTimer -= dt;
      if (this.buffTimer <= 0) this.damageMultiplier = 1; // หมดเวลาแล้วกลับเป็นปกติ
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0 && !this.isAttacking()) {
        this.comboStep = 0;
        if (!this.finisherReady) this.hitsLanded = 0;
      }
    }
    if (this.finisherTimer > 0) {
      this.finisherTimer -= dt;
      if (this.finisherTimer <= 0) {
        this.finisherReady = false;
        this.hitsLanded = 0;
      }
    }
  }

  // ---------- Movement API — เรียกจาก scene ทุก frame โดยส่ง input state เข้ามา ----------
  /**
   * @param {{left:boolean, right:boolean, jumpPressed:boolean, walkModifier:boolean, attackPressed:boolean}} input
   * @param {number} dt milliseconds
   */
  handleMovement(input, dt) {
    this._tickComboTimers(dt);
    this._tickStatus(dt);
    input = this._filterInputByStatus(input);

    // กำลังแปลงร่าง / ใช้สกิลยาว = คุมตัวไม่ได้ จนกว่าท่าจะจบ
    if (this.isTransforming() || this.isUsingSkill()) {
      this.stateMachine.update(dt);
      return;
    }

    // โดนตีอยู่ = คุมตัวไม่ได้ ปล่อยให้ knockback พาไป จนกว่า hitstun จะหมด
    if (this.isStunned()) {
      this.stateMachine.update(dt);
      return;
    }

    if (this.isAttacking()) {
      // v32 ย่องแทง: กดซ้ำหลังมีดพุ่งออกแล้ว = แทงใหม่ทันที (ยิ่งรัวยิ่งไว) · กดก่อนนั้น = จองไว้แทงต่อทันทีที่จบ
      if (input.attackPressed && this.stateMachine.is("sneakstab") && this.isSneaking()) {
        if (this._atk && this._atk.elapsed >= this._sneak.def.stab.cancelAfterMs) {
          this._faceFromInput(input);
          this.stateMachine.setState("sneakstab", true);
        } else {
          this.attackQueued = true;
        }
        this.stateMachine.update(dt);
        return;
      }
      // ระหว่างออกหมัด: เดินไม่ได้ กระโดดไม่ได้ แต่กดปุ่มตีเก็บไว้ต่อยซ้ำได้ทันทีที่ท่าจบ
      if (input.attackPressed) this.attackQueued = true;
      this.stateMachine.update(dt);
      return;
    }

    if (this.isSummoning()) {
      // ระหว่างเรียกร่าง: ล็อกหมด ไม่ queue อะไรทั้งนั้น
      this.stateMachine.update(dt);
      return;
    }

    if (this.isTaunting()) {
      // ระหว่างยั่ว: ขยับไม่ได้ แต่กดตี/กระโดดเพื่อยกเลิกท่าได้ทันที (กันโดนสวนฟรี)
      if (input.attackPressed || input.jumpPressed) {
        this.stateMachine.setState("idle");
      } else {
        this.stateMachine.update(dt);
        return;
      }
    }

    // กดค้างไว้ = กัน ปล่อย = เลิก
    this._blockHeld = !!input.blockHeld;
    if (this._blockHeld && this.tryBlock()) {
      this.stateMachine.update(dt);
      return;
    }
    if (this.isBlocking()) {
      this.stateMachine.update(dt);
      return;
    }

    if (input.tauntPressed && this.tryTaunt()) {
      this.stateMachine.update(dt);
      return;
    }

    if (input.summonPressed && this.trySummon()) {
      this.stateMachine.update(dt);
      return;
    }

    // ปุ่มเดียวกัน: ตัวแปลงร่างได้ = แปลงร่าง · ตัวมีอาวุธ = สลับอาวุธ
    if (input.transformPressed && (this.tryTransform() || this.trySwitchWeapon())) {
      this.stateMachine.update(dt);
      return;
    }

    if (input.skillPressed && this.trySkill(input.skillPressed)) {
      this.stateMachine.update(dt);
      return;
    }

    if (input.attackPressed && this.isSneaking()) {
      this._faceFromInput(input);
      this.stateMachine.setState("sneakstab", true);
      this.stateMachine.update(dt);
      return;
    }

    if (input.attackPressed) {
      this._startAttack();
      this.stateMachine.update(dt);
      return;
    }

    // ── เดิน/วิ่ง ──
    // ไม่มีปุ่ม walk modifier แล้ว: เดินคือค่าปกติ, ดับเบิลแท็ปทิศเดิม = วิ่งเร็วขึ้น
    this._updateDash(input, dt);
    this.isWalking = false;
    const onGround = this.body.blocked.down || this.body.touching.down;
    const speed =
      PHYSICS.RUN_SPEED *
      (this._dashing ? Player.DASH_SPEED_MUL : 1) *
      (this.isSneaking() ? this._sneak.def.speedMul : 1) *
      this.slowMul();
    const control = onGround ? 1 : PHYSICS.AIR_CONTROL_FACTOR;

    if (input.left && !input.right) {
      this.body.setVelocityX(-speed * control);
      this.facing = -1;
      this.setFlipX(true);
    } else if (input.right && !input.left) {
      this.body.setVelocityX(speed * control);
      this.facing = 1;
      this.setFlipX(false);
    } else if (onGround) {
      // ปล่อยปุ่มตอนติดพื้น ให้ drag (ตั้งไว้ใน constructor) ค่อยๆ หยุดเอง ไม่ตัด velocity ทันที
    }

    if (input.jumpPressed && this.jumpsUsed < PHYSICS.MAX_JUMPS) {
      const vy = this.jumpsUsed === 0 ? PHYSICS.JUMP_VELOCITY : PHYSICS.DOUBLE_JUMP_VELOCITY;
      this.body.setVelocityY(vy);
      this.scene.audio?.playJump(this.jumpsUsed); // นับก่อนบวก: 0 = กระโดดแรก, 1 = double jump
      this.jumpsUsed += 1;
      this.stateMachine.setState("jump", true); // force เผื่อกด double jump ตอนอยู่ state jump อยู่แล้ว
    }

    this.stateMachine.update(dt);
  }
}
