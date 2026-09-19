import { Stand } from "../entities/Stand.js";
import { Player } from "../entities/Player.js";
import {
  ROSTER,
  DEFAULT_P1_CHARACTER,
  DEFAULT_P2_CHARACTER,
  getCharacterClass,
  nextCharacterKey,
} from "../entities/roster.js";
import { applySeasonModifiers, PHYSICS } from "../config/physics.config.js";
import { SAKURA_TERRACE } from "../levels/sakura-terrace.js";
import {
  CITY_NIGHT, CITY_DUSK, RIVER_SUNSET, WAT_PHRA_KAEW, BANGKOK_RIVER, TOKYO_STREET,
  HERO_PLAZA, GORILLA_TEMPLE, PETERSON_BANGKOK, PETERSON_STAGE, PETERSON_FLAGSHIP,
} from "../levels/flat-arenas.js";
import { NEON_UNDERLINE_BANGKOK } from "../levels/neon-underline-bangkok.js";
import { SeasonEffects } from "../effects/SeasonEffects.js";
import { TransformEffect } from "../effects/TransformEffect.js";
import { GunEffects } from "../effects/GunEffects.js";
import { CrazyTitanSystem } from "../systems/CrazyTitanSystem.js";
import { MiniClownSystem } from "../systems/MiniClownSystem.js";
import { BalloonSystem } from "../systems/BalloonSystem.js";
import { TRANSFORM } from "../config/transform.config.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { GUARD } from "../config/combat.config.js";
import { AudioSystem } from "../systems/AudioSystem.js";
import { ShadowSystem } from "../systems/ShadowSystem.js";
import { BossSystem } from "../systems/BossSystem.js";

/**
 * Scene หลักตอนนี้: โหลด level config (ROOFTOP_ARENA) แทนที่จะ hardcode ตำแหน่ง
 * ยังใช้ placeholder สี่เหลี่ยมแทน sprite จริง — จุดประสงค์คือเทส "map" ให้แน่นก่อน
 * (collision, ระยะกระโดด, กล้อง, จุดเกิด, สลับฤดู) ก่อนค่อยใส่กราฟิกตัวละครจริง
 *
 * คุมด้วยคีย์บอร์ด (เทส local: คนเล่นแค่ P1 ฝั่งตรงข้ามเป็น NPC เสมอ — ไม่มีปุ่มของ P2 แล้ว):
 *  - P1: A/D เดิน (ดับเบิลแท็ป = วิ่ง), W กระโดด, S กัน, Space ตี, numpad 4/5/6 สกิล, T ยั่ว
 *  - numpad 8: แปลงร่าง (เฉพาะตัวที่มี FORM_ALT — ตอนนี้ OAT) มีปุ่มบนจอด้วย
 *  - V: สลับตัวละคร P1 | C: สลับตัวละครของ NPC
 *  - เลข 1-5: สลับฤดู (เปลี่ยน particle + physics modifier — ภาพพื้นหลังใช้ภาพเดียวกันทุกฤดู)
 *  - F: สลับ fullscreen จริง (Fullscreen API)
 *  - R: เริ่มรอบใหม่ (เทสง่าย ไม่ต้อง reload หน้า)
 */
/**
 * แมพที่ใช้ได้ — กด M สลับระหว่างเล่น (เริ่มที่ตัวแรกใน LEVEL_ORDER)
 *
 * แมพชุดใหม่ทั้ง 3 เป็นแนวระนาบแบบเกมต่อสู้: พื้นเรียบยาว ไม่มีที่ให้ตก ใช้ภาพความละเอียดต้นฉบับ 1:1
 * sakura = แมพเดิม ปิดไว้ก่อน (ยังอยู่ในโค้ด เอากลับมาได้โดยใส่กลับเข้า LEVEL_ORDER)
 */
const LEVELS = {
  city_night: CITY_NIGHT,
  city_dusk: CITY_DUSK,
  river_sunset: RIVER_SUNSET,
  wat_phra_kaew: WAT_PHRA_KAEW,
  bangkok_river: BANGKOK_RIVER,
  tokyo_street: TOKYO_STREET,
  hero_plaza: HERO_PLAZA,
  gorilla_temple: GORILLA_TEMPLE,
  peterson_bangkok: PETERSON_BANGKOK,
  peterson_stage: PETERSON_STAGE,
  peterson_flagship: PETERSON_FLAGSHIP,
  neon_underline_bangkok: NEON_UNDERLINE_BANGKOK,
  sakura: SAKURA_TERRACE,
};

/** ลำดับการสลับด้วยปุ่ม M — ไม่มี sakura อยู่ในลิสต์ = ปิดใช้งาน · ตัวแรก = แมพเริ่มต้น */
const LEVEL_ORDER = [
  "neon_underline_bangkok",
  "wat_phra_kaew", "bangkok_river", "tokyo_street",
  "city_night", "city_dusk", "river_sunset",
  "hero_plaza", "gorilla_temple", "peterson_bangkok", "peterson_stage", "peterson_flagship",
];

const STARTING_STOCKS = 3; // จำนวนชีวิตต่อผู้เล่น — ตกครบแล้วตกรอบ ไม่ respawn อีก

/**
 * พลังชีวิตเต็มต่อ 1 stock — ผู้ใช้เลือก 200 หลังเทส (100 จบเร็วไป)
 * หมัดปกติ 6 → ~34 หมัดต่อ stock · สกิล 1 เต็มชุด (53) → ~4 ครั้งต่อ stock · หมัดไททัน 12
 */
const MAX_HP = 200;

export class MainGameScene extends Phaser.Scene {
  constructor() {
    super("MainGameScene");
  }

  preload() {
    // โหลดภาพพื้นหลังของทุกแมพในลิสต์ ตอน preload รอบเดียว — สลับแมพกลางเกมจะได้ไม่ต้องรอโหลด
    // useSolidBackground = ยังไม่มีอาร์ต วาดท้องฟ้าสีเรียบแทน (ดู _buildBackground) — ไม่มีภาพให้โหลด
    for (const key of LEVEL_ORDER) {
      const level = LEVELS[key];
      const ext = level.backgroundExt ?? "jpg";
      // backgroundImage = ภาพเดียวทุกฤดู วางเต็ม world ตรงๆ ไม่สเกล (แมพหลายชั้นที่ world = ขนาดภาพเป๊ะอยู่แล้ว)
      if (level.backgroundImage) {
        this.load.image(level.backgroundImage, `assets/backgrounds/${level.backgroundImage}.${ext}`);
        continue;
      }
      if (level.useSolidBackground) continue;
      for (const bgKey of new Set(Object.values(level.backgrounds))) {
        this.load.image(bgKey, `assets/backgrounds/${bgKey}.${ext}`);
      }
    }


    // Texture atlas ตัวละครจริง (atlas เก็บ offset ต่อเฟรม ทำให้เท้าตรงกันทุกท่า)
    Stand.preload(this); // atlas ร่างยมฑูตที่ Bomb เรียกออกมา
    AudioSystem.preload(this); // v29 ไฟล์เสียงที่ตัดจากคลิป (เสียงอื่นยังสังเคราะห์สด)
    BossSystem.preload(this); // บอสประจำแมพ

    // โหลด asset ของตัวละครทุกตัวในทะเบียน — เพิ่มตัวใหม่ใน roster.js แล้วที่นี่ไม่ต้องแก้
    for (const CharacterClass of Object.values(ROSTER)) {
      CharacterClass.preload(this);
    }

    // Placeholder พื้นดาดฟ้า — ยังใช้เป็น collision debug overlay (โปร่งแสงทับ background จริง)
    const roof = this.make.graphics({ x: 0, y: 0, add: false });
    roof.fillStyle(0x4b5563, 0.35);
    roof.fillRect(0, 0, 32, 32);
    roof.generateTexture("roof_tile", 32, 32);
    roof.destroy();
  }

  create() {
    // เคลียร์ hitstop ที่อาจค้างจากรอบก่อน (กด R ระหว่างภาพหยุด) — AnimationManager เป็นของทั้งเกม ไม่รีเซ็ตเองตอน restart
    this._hitstopMs = 0;
    this.anims.resumeAll();
    this.events.once("shutdown", () => this.anims.resumeAll());

    this.physics.world.gravity.y = 0; // gravity คุมเองใน Player.js ต่อ body

    // แมพปัจจุบัน — เก็บใน registry เพื่อให้รอด scene.restart() (ปุ่ม R / ปุ่มสลับแมพ)
    this.levelKey = this.registry.get("levelKey") ?? LEVEL_ORDER[0];
    if (!LEVEL_ORDER.includes(this.levelKey)) this.levelKey = LEVEL_ORDER[0];
    this.level = LEVELS[this.levelKey];
    this.currentSeason = "spring";
    applySeasonModifiers(this.currentSeason); // ตั้งค่า PHYSICS ตอนเริ่มเกม

    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);

    // เสียงต้องมาก่อน _spawnPlayer เพราะ Player อ้าง scene.audio ตั้งแต่ท่าแรกที่เล่น
    this.audio = new AudioSystem(this);

    this._buildBackground();
    this._buildPlatforms();
    this._buildHazards();
    this._spawnPlayer();
    this._setupCamera(); // หลัง _spawnPlayer เพราะกล้องเล็งจากตำแหน่งผู้เล่น
    this._setupInput();
    this._setupDebugText();
    this._setupHud();

    this.seasonEffects = new SeasonEffects(this, this.level);
    this.seasonEffects.setSeason(this.currentSeason);

    this.gameOver = false;
  }

  /**
   * วางภาพพื้นหลังให้เต็มความกว้าง world โดยคงสัดส่วนภาพเดิม (ไม่ยืดบิดเบี้ยว)
   * แล้วเลื่อนแนวตั้งให้ "เส้นพื้นในภาพ" (artReference.roofY) ตรงกับพื้น collision ของแมพ
   */
  _buildBackground() {
    // ยังไม่มีอาร์ตจริง — วาดท้องฟ้าสีเรียบเต็ม world แทน (ดู src/levels/unused/blockout-arena.js ต้นแบบ)
    // ฤดูไม่เปลี่ยนสีพื้นหลัง (ไม่มี backgrounds ให้สลับ) — ปุ่ม 1-5 ยังเปลี่ยน particle/physics ได้ตามปกติ
    if (this.level.useSolidBackground) {
      this.bgImage = this.add
        .rectangle(0, 0, this.level.worldWidth, this.level.worldHeight, this.level.skyTopColor ?? 0x1e293b)
        .setOrigin(0, 0)
        .setDepth(-10)
        .setScrollFactor(1);
      return;
    }

    // แมพหลายชั้นที่ออกแบบ world = ขนาดภาพต้นฉบับเป๊ะอยู่แล้ว — วางเต็ม (0,0) ตรงๆ ไม่ต้องคำนวณ scale/offset
    // เหมือน flatArena (ซึ่งมีแค่พื้นเดียวจึงต้องเลื่อนภาพให้ตรง roofY — แมพนี้ตำแหน่ง platform อ้างอิงจากภาพเองอยู่แล้ว)
    if (this.level.backgroundImage) {
      this.bgImage = this.add
        .image(0, 0, this.level.backgroundImage)
        .setOrigin(0, 0)
        .setDisplaySize(this.level.worldWidth, this.level.worldHeight)
        .setDepth(-10)
        .setScrollFactor(1);
      return;
    }

    const art = this.level.artReference;
    const scale = this.level.worldWidth / art.width;
    const offsetY = this.level.platforms[0].y - art.roofY * scale;

    this.bgImage = this.add
      .image(0, offsetY, this.level.backgrounds[this.currentSeason])
      .setOrigin(0, 0)
      .setDisplaySize(this.level.worldWidth, art.height * scale)
      .setDepth(-10)
      .setScrollFactor(1);
  }

  _setBackgroundSeason(seasonKey) {
    if (this.level.useSolidBackground || this.level.backgroundImage) return; // ภาพ/สีเดียวทุกฤดู
    const bgKey = this.level.backgrounds[seasonKey];
    if (bgKey) {
      this.bgImage.setTexture(bgKey);
    }
  }

  _buildPlatforms() {
    this.platformsGroup = this.physics.add.staticGroup();

    for (const plat of this.level.platforms) {
      // ตั้ง collision เป็นก้อนเดียวแบนต่อพื้นแต่ละตึก (ง่ายกว่า tile หลายชิ้น เช็คถูกต้องกว่า)
      const centerX = plat.x + plat.width / 2;
      const centerY = plat.y + plat.height / 2;
      const tile = this.platformsGroup.create(centerX, centerY, "roof_tile");
      tile.setDisplaySize(plat.width, plat.height);
      tile.refreshBody();
      // มีอาร์ตจริงวาดพื้นไว้ให้แล้ว (level.backgroundImage) — ซ่อน collision debug ทั้งหมด ไม่วาดทับภาพ
      if (this.level.backgroundImage) tile.setVisible(false);
      // plat.color = สีเจาะจงต่อก้อน (เช่น แมพหลายโซนสี) ชนะสีตาม kind เสมอ
      else if (plat.color != null) tile.setTint(plat.color);
      // แยกสีให้ดูออกว่าอันไหนตึก อันไหนแพลตฟอร์มลอย (แมพ blockout ยังไม่มีอาร์ต)
      else if (plat.kind === "floating") tile.setTint(0x94a3b8);
      else if (plat.kind === "building") tile.setTint(0x64748b);
      // kind "ground" = พื้นที่มีภาพวาดทับอยู่แล้ว ซ่อน collision ไว้ใต้ภาพ ไม่ต้องวาดทับ
      else if (plat.kind === "ground") tile.setVisible(false);

      // ก้อนทึบใต้พื้นเดินได้ — แค่ภาพประกอบให้ดูเป็นโซน/ตึก ไม่มี collision (เดินทะลุใต้พื้นได้ปกติ)
      // ข้ามถ้ามีอาร์ตจริงแล้ว (ภาพวาดชั้น/เสาไว้ให้แล้ว ไม่ต้องวาดกล่องสีทับ)
      if (plat.fillDepth && !this.level.backgroundImage) {
        this.add
          .rectangle(centerX, plat.y + plat.height, plat.width, plat.fillDepth, plat.fillColor ?? plat.color ?? 0x334155)
          .setOrigin(0.5, 0)
          .setDepth(-5);
      }
      if (plat.kind === "building") {
        this.add
          .rectangle(centerX, plat.y + plat.height, plat.width, this.level.worldHeight - plat.y, 0x334155)
          .setOrigin(0.5, 0)
          .setDepth(-5);
      }
    }
  }

  /**
   * วาด level.ladders (โซนปีน — ยังไม่มีท่าปีนเฉพาะ ใช้แถบสีเหลืองแทนบันไดจริงไปก่อน)
   * และ level.pits (เหวอันตราย) เป็นรูปสี่เหลี่ยม ไม่มี collision ทั้งคู่ — ชนด้วยระยะใน
   * _checkLadderEntry/_checkPitHazard ไม่ใช่ physics body
   */
  _buildHazards() {
    for (const L of this.level.ladders ?? []) {
      this.add
        .rectangle(L.x, (L.topY + L.bottomY) / 2, L.width, L.bottomY - L.topY, 0xfacc15, 0.35)
        .setStrokeStyle(2, 0xfde047, 0.8)
        .setDepth(-4);
    }
    for (const pit of this.level.pits ?? []) {
      this.add
        .rectangle(pit.x + pit.width / 2, pit.y + (this.level.worldHeight - pit.y) / 2, pit.width, this.level.worldHeight - pit.y, 0x7f1d1d, 0.5)
        .setDepth(-4);
    }
  }

  _spawnPlayer() {
    // เทส local multiplayer เบื้องต้น — 2 ผู้เล่น ใช้ spawn point ที่ห่างกันที่สุดในลิสต์
    // (index 0 กับ 3 = ตึกซ้ายสุด กับ ตึกขวาสุด) เพื่อเช็คว่ากล้อง/ความแฟร์ทำงานตอนคนกระจายตัวสุดขั้ว
    const spawn1 = this.level.spawnPoints[0];
    const spawn2 = this.level.spawnPoints[3];

    // ตัวละครที่เลือกไว้ — เก็บใน registry เพื่อให้รอด scene.restart() (ปุ่ม R / ปุ่มสลับตัวละคร)
    this.charKeyP1 = this.registry.get("charP1") ?? DEFAULT_P1_CHARACTER;
    this.charKeyP2 = this.registry.get("charP2") ?? DEFAULT_P2_CHARACTER;
    const CharP1 = getCharacterClass(this.charKeyP1);
    const CharP2 = getCharacterClass(this.charKeyP2);

    // ลงทะเบียน animation ของทุกตัวในทะเบียน (ครั้งเดียว ก่อนสร้างตัวละคร)
    // ลงให้หมดไม่ใช่เฉพาะ 2 ตัวที่เลือก เพราะสลับตัวละครกลางเกมแล้วไม่ต้องมาลงทะเบียนซ้ำ
    for (const CharacterClass of Object.values(ROSTER)) {
      CharacterClass.registerAnimations(this);
    }

    this.p1 = new CharP1(this, spawn1.x, spawn1.y, 0);
    this.p2 = new CharP2(this, spawn2.x, spawn2.y, 1);
    // วางตัวละครโดยอ้างอิงตำแหน่งเท้า ไม่ใช่จุดกึ่งกลาง sprite
    // (spawnPoints.y เป็นค่าที่ตั้งไว้สมัย placeholder ตัวเล็ก ใช้ตรงๆ กับ sprite จริงไม่ได้)
    this._placeAtSpawn(this.p1, 0);
    this._placeAtSpawn(this.p2, 3);
    // ปรับโทนตัวละครให้เข้ากับแสงของแมพ (ดู characterTint ใน flat-arenas.js)
    const grade = this.level.characterTint ?? 0xffffff;
    this.p1.setTint(grade);
    this.p1.baseTint = grade; // CombatSystem.flashVictim คืนสีนี้หลังกระพริบ

    // tint แยกฝั่งเฉพาะตอนสองคนเลือกตัวละครเดียวกัน — คนละตัวแล้วแยกออกด้วยรูปร่างอยู่แล้ว
    this.sameCharacterMatch = this.charKeyP1 === this.charKeyP2;
    this.p2.baseTint = this.sameCharacterMatch ? this._mixTint(grade, 0xffb37a) : grade;
    this.p2.setTint(this.p2.baseTint);

    // เงาใต้เท้า — แก้อาการ "ตัวละครลอยไม่ติดพื้น" บนฉากที่มีแสงของตัวเอง
    this.shadows = new ShadowSystem(this);
    this.guardBars = this.add.graphics().setDepth(55); // หลอดการ์ดเหนือหัว (ดู _drawGuardBars)
    this.transformFx = new TransformEffect(this); // แสง/ควันตอนแปลงร่าง (Player เรียกผ่าน scene.transformFx)
    this.gunFx = new GunEffects(this); // ไฟปากกระบอก/ลูกปราย + ไอคอนอาวุธ (ต้องสร้างก่อน HUD)
    this.crazyTitans = new CrazyTitanSystem(this); // ไททันบ้าของสกิล 3 ไททัน
    this.miniClowns = new MiniClownSystem(this); // ตัวตลกเล็กของสกิล 2 Dear V.2
    this.balloons = new BalloonSystem(this); // v34 ลูกโป่ง S1-S2 Dear V.2
    const groundY = this.level.platforms[0].y;
    this.shadows.attach(this.p1, groundY);
    this.shadows.attach(this.p2, groundY);

    this.players = [this.p1, this.p2];

    // อีเวนต์บอส — โผล่เป็นช่วง ๆ ระหว่างที่ผู้เล่นตีกันอยู่
    this.bossSystem = new BossSystem(this, this.players, groundY);
    this.playerLabels = new Map([
      [this.p1, `P1 ${CharP1.DISPLAY_NAME}`],
      [this.p2, `P2 ${CharP2.DISPLAY_NAME}`],
    ]);
    this.spawnIndexByPlayer = new Map([
      [this.p1, 0],
      [this.p2, 3],
    ]);
    this.stocks = new Map([
      [this.p1, STARTING_STOCKS],
      [this.p2, STARTING_STOCKS],
    ]);
    this.playerAlive = new Map([
      [this.p1, true],
      [this.p2, true],
    ]);
    // HP ต่อผู้เล่น (0 ถึง MAX_HP) — หักจริงจากหมัดที่เข้าเป้า (ดู _applyDamage)
    this.hp = new Map([
      [this.p1, MAX_HP],
      [this.p2, MAX_HP],
    ]);

    // ระบบต่อสู้ — ผูก callback ให้หัก HP ทุกครั้งที่มีหมัดเข้า
    this.combat = new CombatSystem(this, (victim, attacker, damage, blocked, spec) =>
      this._applyDamage(victim, damage, blocked, { trueDamage: !!spec?.trueDamage })
    );
    for (const player of this.players) {
      player.combat = this.combat; // ให้ตัวละครยิง hitbox ผ่านระบบเดียวกัน
    }

    for (const player of this.players) {
      this.physics.add.collider(player, this.platformsGroup);
    }
    // Player vs player — ชนแล้วดันกันเบาๆ (ดาเมจแยกไปอยู่ที่ CombatSystem ไม่เกี่ยวกับ collider นี้)
    // v32: คนที่ย่องอยู่ (Dear V.2 สกิล 2) เดินทะลุได้ — processCallback คืน false = ไม่ชน
    this.physics.add.collider(this.p1, this.p2, null, (a, b) => !(a.isSneaking?.() || b.isSneaking?.()));
  }

  /**
   * วางตัวละครที่ spawn point โดยให้ "เท้า" อยู่บนพื้นดาดฟ้าพอดี
   * ใช้ระดับ y ของ platform เป็นระดับพื้นจริง แทนค่า spawnPoints.y เดิมที่ตั้งไว้สมัย placeholder
   */
  _placeAtSpawn(player, spawnIndex) {
    const spawn = this.level.spawnPoints[spawnIndex % this.level.spawnPoints.length];
    // spawn.floorY ระบุตรงมา = ใช้เลย (จำเป็นสำหรับแมพหลายชั้นซ้อน x ทับกัน เช่นชั้นบน/กลาง/ล่างที่ x เดียวกัน
    // หา platform จาก x อย่างเดียวแยกไม่ออกว่าหมายถึงชั้นไหน) · ไม่ระบุ = เดาจาก platform ใต้จุดเกิด (แมพเก่า)
    let floorY = spawn.floorY;
    if (floorY == null) {
      const platform =
        this.level.platforms.find((p) => spawn.x >= p.x && spawn.x <= p.x + p.width) ?? this.level.platforms[0];
      floorY = platform.y;
    }
    player.placeFeetAt(spawn.x, floorY - 2); // ลอยเหนือพื้นเล็กน้อย ให้ตกลงมาแตะพื้นเอง
    player.jumpsUsed = 0;
  }

  _respawnPlayer(player) {
    const spawnIndex = this.spawnIndexByPlayer.get(player) ?? 0;
    if (player.isStunned?.()) player.stateMachine.setState("idle"); // ตายตอนการ์ดแตก/โดนตี ไม่ให้ค้างไปชีวิตใหม่
    player.guard = GUARD.max;
    this._placeAtSpawn(player, spawnIndex);
  }

  // ---------- บันได/ทางลาด (level.ladders) ----------
  /**
   * เช็คทุกเฟรมก่อน handleMovement — ยืนอยู่ในโซนบันได + กดขึ้น/ลงค้าง = เริ่มปีน (Player.startClimb)
   * ปีนอยู่แล้วไม่ต้องทำอะไร (Player._handleClimbing คุมเอง) · คุมตัวไม่ได้ (สตัน/ท่ายาว) ก็ปีนไม่ได้
   */
  _checkLadderEntry(player, input) {
    const ladders = this.level.ladders;
    if (!ladders || player.isClimbing() || (!input.upHeld && !input.downHeld)) return;
    if (player.isStunned?.() || player.isAttacking?.() || player.isUsingSkill?.() || player.isTransforming?.()) return;
    for (const L of ladders) {
      if (Math.abs(player.x - L.x) > L.width / 2) continue;
      // ต้องอยู่ในช่วงความสูงของบันได (เผื่อขอบเล็กน้อยกันจับไม่ติดตอนเพิ่งลงจอด/เพิ่งก้าวออก)
      if (player.body.bottom < L.topY - 4 || player.body.bottom > L.bottomY + 4) continue;
      player.startClimb(L);
      return;
    }
  }

  // ---------- เหวกลาง (level.pits) ----------
  /**
   * ตกลงไปในเหว = เสีย HP ตามสัดส่วน (trueDamage ไม่สนการกัน) + เด้งกลับขึ้นตรงจุดที่ตกทันที
   * คนละแบบกับตกขอบล่างของ world (เสีย 1 stock) — ต้องเช็คก่อนตัวจะร่วงลึกไปโดนกฎนั้นด้วย
   */
  _checkPitHazard(player, dt) {
    if (player._pitGrace > 0) player._pitGrace -= dt;
    const pits = this.level.pits;
    if (!pits || player.isInvulnerable?.()) return;
    if (player._pitGrace > 0) return; // เพิ่งเด้งไป กันโดนซ้ำระหว่างลอยขึ้นผ่านโซนเดิม
    for (const pit of pits) {
      if (player.x < pit.x || player.x > pit.x + pit.width) continue;
      if (player.body.bottom < pit.y) continue; // เท้ายังไม่ถึงระดับปากเหว (ยืนบนพื้นข้างๆ อยู่)
      const dmg = Math.round((pit.damagePercent ?? 0.2) * MAX_HP);
      this._applyDamage(player, dmg, false, { trueDamage: true });
      player.body.setVelocity(0, pit.bounceVelocityY ?? PHYSICS.JUMP_VELOCITY);
      player.jumpsUsed = 0;
      player._pitGrace = 600; // ms — พอให้ลอยพ้นปากเหวก่อนเช็คซ้ำ
      this.showFloatLabel?.(player, "-" + dmg, "#f87171");
      return;
    }
  }

  // ---------- Hitstop ----------
  /**
   * หยุดภาพทั้งจอ ms มิลลิวินาที (เรียกซ้อนได้ — ใช้ค่าที่ยาวกว่า)
   * หยุด: physics, animation, tween, ตัวจับเวลาของ scene · ไม่หยุด: กล้องสั่น, particle ฤดู, HUD
   * ความเร็ว (knockback) ที่ตั้งไว้ก่อนหยุดยังอยู่ พอปล่อยตัวละครกระเด็นต่อทันที
   */
  hitstop(ms) {
    if (!ms || ms <= 0) return;
    if (this._hitstopMs <= 0) {
      this.physics.world.pause();
      this.anims.pauseAll();
      this.tweens.pauseAll();
      this.time.paused = true;
    }
    this._hitstopMs = Math.max(this._hitstopMs, ms);
  }

  _tickHitstop(delta) {
    if (this._hitstopMs <= 0) return false;
    this._hitstopMs -= delta;
    if (this._hitstopMs > 0) return true;
    this._hitstopMs = 0;
    this.physics.world.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
    return false;
  }

  // ---------- Guard ----------
  /** ป้าย "GUARD BREAK!" เด้งเหนือหัว — สร้างหลัง hitstop เริ่มแล้ว tween จึงรอเล่นตอนภาพกลับมาขยับ */
  showGuardBreak(player) {
    this.showFloatLabel(player, "GUARD BREAK!");
  }

  /** ป้ายเด้งเหนือหัว (GUARD BREAK! / TITAN BREAK!) */
  showFloatLabel(player, label, color = "#fde047") {
    const t = this.add
      .text(player.x, player.body.y - 30, label, {
        font: "bold 22px monospace",
        color,
        stroke: "#7f1d1d",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(60);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }

  /**
   * หลอดการ์ดเล็กเหนือหัว — โชว์เฉพาะตอนกันอยู่หรือมาตรยังไม่เต็ม (เต็มแล้วซ่อน ไม่รกจอ)
   * สี: ฟ้า -> ส้ม (ต่ำกว่าครึ่ง) -> แดง (ต่ำกว่า 25%)
   */
  _drawGuardBars() {
    const g = this.guardBars;
    g.clear();
    for (const p of this.players) {
      if (!this.playerAlive.get(p)) continue;
      const broken = p.isGuardBroken?.();
      if (!broken && !p.isBlocking?.() && p.guard >= GUARD.max) continue;
      const ratio = Phaser.Math.Clamp(p.guard / GUARD.max, 0, 1);
      const w = 56, h = 6;
      const x = p.x - w / 2;
      const y = p.body.y - 12;
      g.fillStyle(0x0f172a, 0.75).fillRect(x - 1, y - 1, w + 2, h + 2);
      const color = broken ? 0xef4444 : ratio < 0.25 ? 0xef4444 : ratio < 0.5 ? 0xf59e0b : 0x60a5fa;
      g.fillStyle(color, 1).fillRect(x, y, w * ratio, h);
    }
    // v32 แถบเวลาย่องที่เหลือ (ม่วง) — ตำแหน่งเดียวกับหลอดการ์ด (ย่องอยู่กันไม่ได้ หลอดการ์ดจึงไม่ทับ)
    for (const p of this.players) {
      if (!this.playerAlive.get(p) || !p.isSneaking?.()) continue;
      const ratio = Phaser.Math.Clamp(p.sneakRatio(), 0, 1);
      const w = 56, h = 5;
      const x = p.x - w / 2;
      const y = p.body.y - 20;
      g.fillStyle(0x0f172a, 0.75).fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(ratio < 0.25 ? 0xf0abfc : 0xa78bfa, 1).fillRect(x, y, w * ratio, h);
    }
    // หลอดเลือดร่างแปลง (ไททัน) — โชว์ตลอดที่อยู่ในร่างแปลง เหนือหลอดการ์ด
    for (const p of this.players) {
      if (!this.playerAlive.get(p) || !p.isTransformed?.() || !p.formMaxHp) continue;
      const ratio = Phaser.Math.Clamp(p.formHp / p.formMaxHp, 0, 1);
      const w = 80, h = 7;
      const x = p.x - w / 2;
      const y = p.body.y - 24;
      g.fillStyle(0x0f172a, 0.8).fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(ratio < 0.3 ? 0xef4444 : 0xf97316, 1).fillRect(x, y, w * ratio, h);
    }
  }

  /**
   * ตกจากแมพ — เสียชีวิต 1 stock ถ้ายังเหลือให้ respawn ที่เดิม
   * ถ้าหมด stock แล้วให้ตกรอบ (ซ่อนตัว, ปิด physics body, ไม่กลับมาอีกจนกว่าจะ restart)
   */
  /**
   * หัก HP จากหมัดที่เข้าเป้า — HP หมด = เสีย 1 stock แล้วเกิดใหม่พร้อม HP เต็ม
   * (แยกจากการตกแมพ ซึ่งเสีย stock ทันทีโดยไม่สนใจ HP)
   */
  _applyDamage(victim, damage, blocked = false, { trueDamage = false } = {}) {
    if (!this.playerAlive.get(victim) || this.gameOver) return;
    if (victim.isInvulnerable?.()) return; // แปลงร่าง / อมตะหลังหลอดไททันแตก (ดาเมจจากไททันบ้าไม่ผ่าน CombatSystem)
    // กันอยู่ = ดาเมจเหลือเศษเดียว (ตัวคูณอยู่ใน Player.BLOCK_DAMAGE_MUL)
    // ใช้ค่า blocked ที่ CombatSystem จำไว้ก่อนโดน — หมัดที่ทำให้การ์ดแตกยังนับเป็นหมัดที่กันได้
    // v32 True Damage (ย่องแทง): ไม่สนการกัน และไม่สนตัวคูณดาเมจที่ได้รับของเหยื่อ (เช่น ย่องอยู่ลด 90%)
    //   ยังหักหลอดไททันตามปกติ — หลอดไททันคือหลอดเลือดของร่าง ไม่ใช่เกราะ
    let dealt = blocked && !trueDamage ? Math.round(damage * Player.BLOCK_DAMAGE_MUL) : damage;
    // ไม่ปัดเศษ: 10% ของหมัด 6 = 0.6 ถ้าปัดจะเป็น 1 (ลดแค่ 83%) — HP เก็บทศนิยมได้ HUD ปัดตอนโชว์
    if (!trueDamage) dealt *= victim.damageTakenMul?.() ?? 1;
    // อยู่ในร่างแปลง = หักหลอดร่างแปลงแทน (หลอดหมด -> กลับร่าง ไม่เสียชีวิต · ดาเมจส่วนเกินทิ้ง)
    if (victim.absorbFormDamage?.(dealt)) return;
    const next = (this.hp.get(victim) ?? MAX_HP) - dealt;
    this._setPlayerHp(victim, next);

    if (next <= 0) {
      this._handlePlayerDeath(victim);
    }
  }

  _handlePlayerDeath(player) {
    player.activeStand?.cancel(); // ตายกลางท่าเรียกร่าง — ร่างต้องสลายตาม ไม่ค้างในสนาม
    player.activeStand = null;
    this.audio?.play("ko");
    this.combat.clearFor(player); // หมัดที่ค้างอยู่ของคนที่เพิ่งตายเป็นโมฆะ
    player._resetCombo?.();
    this.crazyTitans?.dropVictim(player); // ตายระหว่างโดนลาก — ปล่อยทิ้ง ไม่ลากต่อหลังเกิดใหม่
    this.miniClowns?.clear(player); // ตัวตลกที่เสกไว้หายไปพร้อมเจ้าของ
    this.balloons?.clear(player);
    player.clearStatus?.();
    player.endSneak?.(); // v32 ตายระหว่างย่อง (โดน True Damage) — ชีวิตใหม่ไม่ได้ย่องต่อ
    player.revertForm?.(); // กันไว้ (ปกติร่างแปลงไม่ตาย — หลอดแยกหมดก็กลับร่างก่อน) · คูลดาวน์นับต่อ
    this._setPlayerHp(player, MAX_HP); // เกิดใหม่ HP เต็มเสมอ
    const remaining = (this.stocks.get(player) ?? 1) - 1;
    this.stocks.set(player, remaining);

    if (remaining > 0) {
      this._respawnPlayer(player);
    } else {
      this._eliminatePlayer(player);
    }
    this._checkWinCondition();
  }

  _eliminatePlayer(player) {
    this.playerAlive.set(player, false);
    player.setVisible(false);
    player.body.enable = false;
  }

  _checkWinCondition() {
    if (this.gameOver) return;
    const alive = this.players.filter((p) => this.playerAlive.get(p));
    if (alive.length <= 1) {
      this.gameOver = true;
      const label = alive.length === 1 ? this.playerLabels.get(alive[0]) : "ไม่มีใคร";
      const message = alive.length === 1 ? `${label} ชนะ!` : "เสมอ (ตกพร้อมกัน)";
      this.winText = this.add
        .text(this.sys.game.config.width / 2, this.sys.game.config.height / 2, `${message}\n\nกด R เริ่มใหม่`, {
          font: "28px monospace",
          color: "#facc15",
          align: "center",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100);
    }
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.attackKeyP1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // ท่าเรียกร่าง = Enter (ระบบยังอยู่ แต่ตอนนี้ไม่มีตัวละครไหนเปิด CAN_SUMMON)
    this.summonKeyP1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    // ── ปุ่มผู้เล่น (ชุดใหม่) ──
    // A/D เดิน (ดับเบิลแท็ป = วิ่ง), W กระโดด, S กัน, Space ตี, numpad 4/5/6 สกิล
    this.moveLeftKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.moveRightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.jumpKey      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.blockKeyP1   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.skillKeys = {
      1: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR),
      2: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE),
      3: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX),
    };
    this._skillClick = { 1: false, 2: false, 3: false };
    this.transformKeyP1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_EIGHT);
    this._transformClick = false;
    this.tauntKeyP1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    // ธงสำหรับปุ่มกดบนจอ — ตั้ง true 1 เฟรมแล้วเคลียร์ (เลียนแบบ justDown ของคีย์บอร์ด)
    this._tauntClickP1 = false;
    this._skillClick = { 1: false, 2: false, 3: false };
    this._prevUpDown = false;
    this._prevAttackP1Down = false;

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on("down", () => {
      this.scene.restart();
    });

    // M = สลับแมพ แล้วเริ่มรอบใหม่
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on("down", () => {
      const next = LEVEL_ORDER[(LEVEL_ORDER.indexOf(this.levelKey) + 1) % LEVEL_ORDER.length];
      this.registry.set("levelKey", next);
      this.scene.restart();
    });

    // V / C = สลับตัวละครของ P1 / NPC แล้วเริ่มรอบใหม่ (ตัวเลือกอยู่ที่ ROSTER_ORDER ใน roster.js)
    // ต้อง restart scene เพราะ sprite/animation/สเกล ผูกกับตัวละครตั้งแต่ตอนสร้าง
    const characterKeys = [
      ["V", "charP1", DEFAULT_P1_CHARACTER],
      ["C", "charP2", DEFAULT_P2_CHARACTER],
    ];
    for (const [keyName, registryKey, fallback] of characterKeys) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyName]).on("down", () => {
        const current = this.registry.get(registryKey) ?? fallback;
        this.registry.set(registryKey, nextCharacterKey(current));
        this.scene.restart();
      });
    }

    // N = ปิด/เปิดเสียง (N เคยชนกับปุ่มกันของ P2 — ถอดปุ่ม P2 ออกแล้ว ไม่ชนอีก)
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N).on("down", () => {
      const muted = this.audio?.toggleMute();
      this._flashToast(muted ? "SOUND OFF" : "SOUND ON");
    });

    // F = สลับ fullscreen จริง (Fullscreen API) — ต้องกดคีย์ (user gesture) ถึงจะขอ fullscreen ได้
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F).on("down", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // เลข 1-5 สลับฤดู — ไว้เทส physics modifier ระหว่างเล่นจริง ไม่ต้อง restart scene
    const seasonKeys = { ONE: "spring", TWO: "summer", THREE: "autumn", FOUR: "winter", FIVE: "rain" };
    for (const [keyName, seasonName] of Object.entries(seasonKeys)) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyName]).on("down", () => {
        this.currentSeason = seasonName;
        applySeasonModifiers(seasonName);
        this.seasonEffects.setSeason(seasonName);
        this._setBackgroundSeason(seasonName);
      });
    }
  }

  /** ข้อความแจ้งสั้น ๆ กลางจอ แล้วจางหายเอง — ตอนนี้ใช้กับปุ่มปิด/เปิดเสียง */
  _flashToast(message) {
    const width = this.sys.game.config.width;
    const text = this.add
      .text(width / 2, 70, message, {
        font: "22px monospace",
        color: "#ffffff",
        stroke: "#0f172a",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(95);

    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0 },
      y: 56,
      delay: 500,
      duration: 400,
      onComplete: () => text.destroy(),
    });
  }

  _setupDebugText() {
    this.debugText = this.add
      .text(10, 10, "", { font: "13px monospace", color: "#e2e8f0" })
      .setScrollFactor(0);
  }

  /**
   * HUD ชั่วคราว — ตัวเลข HP มุมซ้าย/ขวาบน ไม่มีหลอด ไม่มีกรอบ
   * หลอด HP กับกิ่งไม้ถอดออกแล้ว (ตัดสินใจไว้ว่าค่อยกลับมาคิด UI จริงทีหลัง)
   * ตอนนี้เอาแค่อ่านออกระหว่างเทส combat ก็พอ
   */
  _setupHud() {
    const canvasWidth = this.sys.game.config.width;
    const HUD_DEPTH = 90;
    const style = { font: "28px monospace", color: "#ffffff", stroke: "#0f172a", strokeThickness: 5 };

    this.hpTextP1 = this.add
      .text(20, 16, "", { ...style, color: "#7dd3fc" })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.hpTextP2 = this.add
      .text(canvasWidth - 20, 16, "", { ...style, color: "#fb923c" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this._createTauntButtons(canvasWidth, HUD_DEPTH);
  }

  /**
   * ปุ่มยั่วบนหน้าจอ — มุมล่างซ้าย = P1 (ฝั่ง NPC ไม่มีปุ่ม)
   * setScrollFactor(0) สำคัญ: ไม่งั้นปุ่มจะเลื่อนหายไปกับฉากตอนกล้องแพน
   */
  _createTauntButtons(canvasWidth, hudDepth) {
    const canvasHeight = this.scale.height;
    const R = 26;
    const mk = (x, color, onTap) => {
      const btn = this.add
        .circle(x, canvasHeight - 46, R, color, 0.28)
        .setStrokeStyle(2, color, 0.9)
        .setScrollFactor(0)
        .setDepth(hudDepth)
        // Shape ไม่มี texture -> ต้องระบุ hit area เป็น geometry เอง
        // ถ้าใช้ setInteractive({useHandCursor:true}) เฉย ๆ Phaser จะไปหา hit area จาก texture แล้วพัง
        .setInteractive(new Phaser.Geom.Circle(R, R, R), Phaser.Geom.Circle.Contains);
      btn.input.cursor = "pointer";
      this.add
        .text(x, canvasHeight - 46, "T", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(hudDepth + 1);
      btn.on("pointerdown", () => {
        btn.setFillStyle(color, 0.6);
        onTap();
      });
      btn.on("pointerup", () => btn.setFillStyle(color, 0.28));
      btn.on("pointerout", () => btn.setFillStyle(color, 0.28));
      return btn;
    };
    mk(46, 0x7dd3fc, () => (this._tauntClickP1 = true));

    this._createSkillButtons(canvasWidth, hudDepth);
    this._createTransformButton(canvasWidth, hudDepth);
  }

  /**
   * ปุ่มแปลงร่าง / สลับอาวุธบนจอ (คู่กับ numpad 8) — วางขวาของ S3
   * แสดงเฉพาะตอน P1 แปลงร่างได้ (ตัวเลข = วินาทีคูลดาวน์) หรือมีอาวุธให้สลับ (ไอคอนอาวุธที่ถืออยู่)
   */
  _createTransformButton(canvasWidth, hudDepth) {
    const canvasHeight = this.scale.height;
    const R = 30;
    const x = canvasWidth / 2 + 2 * (28 * 2 + 16) + 12; // ถัดจากปุ่ม S3
    const y = canvasHeight - 46;
    const btn = this.add
      .circle(x, y, R, 0xf97316, 0.3)
      .setStrokeStyle(3, 0xf97316, 0.95)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setInteractive(new Phaser.Geom.Circle(R, R, R), Phaser.Geom.Circle.Contains);
    const label = this.add
      .text(x, y, "", { fontFamily: "monospace", fontSize: "15px", color: "#ffffff", align: "center" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    // ไอคอนอาวุธ (KunJae) — ซ่อนไว้ ใช้เฉพาะตัวที่มีอาวุธ (HUD สร้างก่อน gunFx จึงวาดไอคอนเองตรงนี้)
    GunEffects.makeIcons(this);
    const icon = this.add.image(x, y - 3, "wpn_whip").setDisplaySize(40, 40).setScrollFactor(0).setDepth(hudDepth + 1);
    const name = this.add
      .text(x, y + R + 4, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffffff", stroke: "#0f172a", strokeThickness: 4 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    btn.input.cursor = "pointer";
    btn.on("pointerdown", () => (this._transformClick = true));
    this.transformBtn = { btn, label, icon, name };
  }

  _updateTransformButton() {
    const tb = this.transformBtn;
    if (!tb) return;
    const p = this.p1;
    const alive = !!this.playerAlive.get(p);
    const weapons = alive && !!p.hasWeapons?.() && !p.hasTransform?.();
    const show = alive && (!!p.hasTransform?.() || weapons);
    tb.btn.setVisible(show);
    tb.label.setVisible(show && !weapons);
    tb.icon.setVisible(weapons);
    tb.name.setVisible(weapons);
    if (!show) return;
    if (weapons) {
      const w = p.weapon;
      if (tb.icon.texture.key !== w.icon) tb.icon.setTexture(w.icon).setDisplaySize(40, 40);
      tb.name.setText(`${w.short} [8]`);
      tb.btn.setFillStyle(w.color, 0.45).setStrokeStyle(3, w.color, 0.95);
      return;
    }
    let text, color, fill;
    if (p.isTransforming()) {
      text = "...";
      color = 0xfde047;
      fill = 0.55;
    } else if (p.isTransformed()) {
      text = "ON";
      color = 0xef4444;
      fill = 0.45;
    } else if (p.transformCooldown > 0) {
      text = String(Math.ceil(p.transformCooldown / 1000));
      color = 0x64748b;
      fill = 0.18;
    } else {
      text = "TITAN\n8";
      color = 0xf97316;
      fill = 0.35;
    }
    tb.label.setText(text);
    tb.btn.setFillStyle(color, fill).setStrokeStyle(3, color, 0.95);
  }

  /**
   * ปุ่มสกิล 1-3 บนหน้าจอ (คู่กับ numpad 4/5/6)
   * สีปุ่มอัปเดตทุกเฟรมตามร่างปัจจุบันของ P1 (เช่น S2 สว่างเฉพาะตอนเป็นไททัน)
   * สกิลที่ติดคูลดาวน์แสดงวินาทีที่เหลือแทนชื่อปุ่ม
   */
  _createSkillButtons(canvasWidth, hudDepth) {
    const canvasHeight = this.scale.height;
    const R = 28;
    const gap = 16;
    const startX = canvasWidth / 2 - (R * 2 + gap);
    this.skillBtns = {};

    for (const n of [1, 2, 3]) {
      const x = startX + (n - 1) * (R * 2 + gap);
      const btn = this.add
        .circle(x, canvasHeight - 46, R, 0x64748b, 0.14)
        .setScrollFactor(0)
        .setDepth(hudDepth)
        .setInteractive(new Phaser.Geom.Circle(R, R, R), Phaser.Geom.Circle.Contains);
      const label = this.add
        .text(x, canvasHeight - 46, `S${n}`, { fontFamily: "monospace", fontSize: "17px", color: "#94a3b8" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(hudDepth + 1);
      btn.input.cursor = "pointer";
      btn.on("pointerdown", () => (this._skillClick[n] = true)); // ใช้ไม่ได้ก็แค่กดไม่ติด (trySkill ปฏิเสธเอง)
      this.skillBtns[n] = { btn, label, state: null };
    }
  }

  _updateSkillButtons() {
    const p = this.p1;
    for (const n of [1, 2, 3]) {
      const b = this.skillBtns?.[n];
      if (!b) continue;
      const enabled = !!p.isSkillEnabled?.(n);
      const cd = enabled ? p.skillCooldownLeft?.(n) ?? 0 : 0;
      // สกิลแบบกดได้หลายครั้ง (เช่น เสกตัวตลกของ Dear V.2) โชว์จำนวนครั้งที่เหลือ เช่น S2·2
      const charges = enabled && cd <= 0 ? p.skillChargesLeft?.(n) : null;
      const sfx = enabled ? p.skillLabelSuffix?.(n) ?? "" : ""; // v34 เช่น S2 ของ Dear บอกผลกับดักที่เลือก
      const state = (!enabled ? "off" : cd > 0 ? `cd${Math.ceil(cd / 1000)}` : `on${charges ?? ""}`) + sfx;
      if (state === b.state) continue; // เปลี่ยนเฉพาะตอนสถานะเปลี่ยน
      b.state = state;
      const on = state.startsWith("on");
      const color = on ? 0xfacc15 : 0x64748b;
      b.btn.setFillStyle(color, on ? 0.3 : 0.14).setStrokeStyle(2, color, state === "off" ? 0.4 : 0.95);
      b.label
        .setText((state.startsWith("cd") ? `${Math.ceil(cd / 1000)}` : charges ? `S${n}·${charges}` : `S${n}`) + sfx)
        .setColor(on ? "#ffffff" : "#94a3b8");
    }
  }

  /**
   * Hook สำหรับระบบ combat ในอนาคต — เรียกตอนตัวละครโดนโจมตี/หายดาเมจ
   * ยังไม่มีอะไรเรียกใช้จริงตอนนี้เพราะยังไม่มี hit detection (รอ Phase ถัดไป)
   */
  /**
   * สมองของ NPC ฝั่งตรงข้าม (โหมดเทสตัวเดียว)
   *
   * ตั้งใจให้ "พอเป็นเป้าซ้อมที่ขยับได้" ไม่ใช่ AI ที่เล่นเก่ง:
   *  - ไกลกว่า approachRange -> เดินเข้าหา
   *  - อยู่ในระยะตี -> สุ่มตีเป็นจังหวะ ไม่รัวตลอด
   *  - สุ่มกันบ้าง เพื่อให้เห็นว่าระบบ block ทำงาน
   * ปรับความดุได้ที่ NPC_* ด้านล่าง
   */
  _npcInput(dt) {
    const NPC_APPROACH_RANGE = 120; // ไกลกว่านี้ = เดินเข้าหา
    const NPC_ATTACK_EVERY = 900;   // ms ระหว่างการตีแต่ละครั้ง
    const NPC_BLOCK_CHANCE = 0.18;  // โอกาสกันแทนการตีในแต่ละรอบ
    const NPC_BLOCK_MS = 600;

    this._npc = this._npc ?? { atkTimer: 0, blockTimer: 0 };
    const st = this._npc;
    st.atkTimer -= dt;
    st.blockTimer -= dt;

    const me = this.p2, foe = this.p1;
    const gap = foe.x - me.x;
    const dist = Math.abs(gap);

    const input = {
      left: false, right: false, jumpPressed: false,
      attackPressed: false, summonPressed: false, tauntPressed: false,
      blockHeld: st.blockTimer > 0, skillPressed: 0,
    };

    if (st.blockTimer > 0) return input; // กันอยู่ = ไม่ทำอย่างอื่น

    if (dist > NPC_APPROACH_RANGE) {
      if (gap > 0) input.right = true; else input.left = true;
    } else if (st.atkTimer <= 0) {
      if (Math.random() < NPC_BLOCK_CHANCE) {
        st.blockTimer = NPC_BLOCK_MS;
        input.blockHeld = true;
      } else {
        input.attackPressed = true;
      }
      st.atkTimer = NPC_ATTACK_EVERY;
    }
    return input;
  }

  _setPlayerHp(player, newHp) {
    this.hp.set(player, Phaser.Math.Clamp(newHp, 0, MAX_HP));
  }

  /**
   * อ่านปุ่มของ P1 เป็น input หนึ่งเฟรม (แยกออกมาใน v32 เพื่อใช้ซ้ำตอน hitstop — ตัวที่ย่องอยู่ยังรับปุ่มได้)
   * ⚠️ เรียกได้ครั้งเดียวต่อเฟรม: อัปเดตธง _prev* (justDown) ในตัว
   */
  _readP1Input() {
    // กระโดด = W (ลูกศรขึ้นยังใช้ได้ด้วยเผื่อความเคยชิน)
    const jumpDown = this.jumpKey.isDown || this.cursors.up.isDown;
    const upJustDown = jumpDown && !this._prevUpDown;
    this._prevUpDown = jumpDown;

    // สกิล: numpad 4/5/6 หรือปุ่มบนจอ — ส่งเป็นเลขสกิลที่กด (0 = ไม่ได้กด)
    let skillPressed = 0;
    for (const n of [1, 2, 3]) {
      const k = this.skillKeys[n];
      const just = (k.isDown && !this[`_prevSkill${n}`]) || this._skillClick[n];
      this[`_prevSkill${n}`] = k.isDown;
      if (just) skillPressed = n;
    }

    const attackP1JustDown = this.attackKeyP1.isDown && !this._prevAttackP1Down;
    this._prevAttackP1Down = this.attackKeyP1.isDown;

    const summonP1JustDown = this.summonKeyP1.isDown && !this._prevSummonP1Down;
    this._prevSummonP1Down = this.summonKeyP1.isDown;

    // ยั่ว: รับได้ทั้งคีย์บอร์ดและปุ่มบนจอ (ธงจากปุ่มถูกเคลียร์ท้าย update)
    const transformP1JustDown =
      (this.transformKeyP1.isDown && !this._prevTransformP1Down) || this._transformClick;
    this._prevTransformP1Down = this.transformKeyP1.isDown;

    const tauntP1JustDown =
      (this.tauntKeyP1.isDown && !this._prevTauntP1Down) || this._tauntClickP1;
    this._prevTauntP1Down = this.tauntKeyP1.isDown;

    return {
      left: this.moveLeftKey.isDown || this.cursors.left.isDown,
      right: this.moveRightKey.isDown || this.cursors.right.isDown,
      jumpPressed: upJustDown,
      // ปีนบันได (ค้างกด ไม่ใช่ edge แบบ jumpPressed): W/ลูกศรขึ้น = ขึ้น, ลูกศรลง = ลง (S เป็นปุ่มกันอยู่แล้ว ไม่ชนกัน)
      upHeld: jumpDown,
      downHeld: this.cursors.down.isDown,
      attackPressed: attackP1JustDown,
      summonPressed: summonP1JustDown,
      tauntPressed: tauntP1JustDown,
      transformPressed: transformP1JustDown,
      blockHeld: this.blockKeyP1.isDown,
      skillPressed,
    };
  }

  /**
   * v32 ระหว่าง hitstop: ทั้งจอหยุด แต่ตัวที่ ignoresHitstop() (ย่องอยู่) ยังรับปุ่ม/เดิน/แทง/เล่นท่าต่อ
   * - physics หยุดอยู่ -> Player.stepWhileFrozen ขยับแนวนอน + เลื่อนเฟรมเอง
   * - hitbox ที่ปล่อยระหว่างนี้ตัดสินตอนภาพกลับมาขยับ (combat.update ไม่รันระหว่างหยุด = ทุกคนนิ่งเท่ากัน)
   * - ธงปุ่มบนจอเคลียร์ตรงนี้ด้วย ไม่งั้นกดครั้งเดียวทำงานซ้ำหลังภาพขยับต่อ
   */
  _updateHitstopExempt(delta) {
    if (this.gameOver) return;
    let any = false;
    for (const p of this.players) {
      if (!this.playerAlive.get(p) || !p.ignoresHitstop?.()) continue;
      any = true;
      const input = p === this.p1 ? this._readP1Input() : this._npcInput(delta);
      p.handleMovement(input, delta);
      p.stepWhileFrozen(delta);
    }
    if (!any) return;
    if (this.p1.ignoresHitstop?.()) {
      this._tauntClickP1 = false;
      this._transformClick = false;
      this._skillClick = { 1: false, 2: false, 3: false };
    }
    this.shadows.update(); // เงาใต้เท้าตามตัวที่ขยับ
    this._drawGuardBars();
  }

  update(time, delta) {
    // ภาพหยุดอยู่ (hitstop) — ข้ามทั้งเฟรม ธงปุ่มบนจอยังค้างไว้ใช้ตอนภาพขยับต่อ
    // นับก่อนเช็ค gameOver เพื่อให้หมัดปิดเกมยังปลดล็อกภาพได้
    if (this._tickHitstop(delta)) {
      this._updateHitstopExempt(delta); // v32 ตัวที่ย่องอยู่ยังขยับได้ระหว่างภาพหยุด
      return;
    }

    if (this.gameOver) {
      return; // หยุดรับ input/update ผู้เล่นตอนจบเกม รอกด R
    }

    if (this.playerAlive.get(this.p1)) {
      const inputP1 = this._readP1Input();
      this._checkLadderEntry(this.p1, inputP1);
      this.p1.handleMovement(inputP1, delta);
    }

    if (this.playerAlive.get(this.p2)) {
      // ฝั่งตรงข้ามเป็น NPC แล้ว (ไม่ได้บังคับด้วยคีย์บอร์ด) — ดู _npcInput()
      const inputP2 = this._npcInput(delta);
      this._checkLadderEntry(this.p2, inputP2);
      this.p2.handleMovement(inputP2, delta);
    }


    // บอสถูกนับเป็นเป้าหมายของ hitbox ด้วย (บอสไม่มีใน playerAlive จึงเช็คแยก)
    const isAlive = (t) => (this.playerAlive.has(t) ? this.playerAlive.get(t) : !t.dead);
    this.combat.update(delta, [...this.players, ...this.bossSystem.targets()], isAlive);
    this.crazyTitans.update(delta, this.players, isAlive);
    this.miniClowns.update(delta, this.players, isAlive);
    this.balloons.update(delta, this.players, isAlive);
    this.bossSystem.update(delta, (p) => this.playerAlive.get(p));

    // Death trigger — ตกต่ำกว่าขอบล่างของ world = เสีย 1 stock (เช็คเฉพาะคนที่ยังไม่ตกรอบ)
    for (const player of this.players) {
      if (this.playerAlive.get(player) && player.y > this.level.worldHeight + 50) {
        this._handlePlayerDeath(player);
      }
    }

    // เหวกลาง (level.pits) — ตกแล้วเสีย HP + เด้งกลับขึ้นตรงจุดที่ตก คนละแบบกับตกขอบแมพด้านบน (ไม่เสีย stock)
    for (const player of this.players) {
      if (this.playerAlive.get(player)) this._checkPitHazard(player, delta);
    }

    // เคลียร์ธงปุ่มบนจอ ให้ทำงานครั้งเดียวต่อการกด 1 ครั้ง เหมือน justDown
    this._tauntClickP1 = false;
    this._transformClick = false;
    this._skillClick = { 1: false, 2: false, 3: false };

    this.transformFx.update(delta);
    this.shadows.update();
    this._drawGuardBars();
    this._updateCamera();
    this._updateDebugText();
    this._updateHud();
    this._updateTransformButton();
    this._updateSkillButtons();
  }

  /**
   * กล้องล็อกความสูง + แพนซ้ายขวา (แบบเกมต่อสู้)
   *
   * zoom ตั้งครั้งเดียวให้ "ความสูงแมพพอดีจอ" แล้วไม่เปลี่ยนอีกเลย
   * ผู้เล่นจึงเห็นพื้นถึงฟ้าเต็มเสมอ ขนาดตัวละครบนจอคงที่ ไม่ซูมเข้าออกกวนสายตา
   * ส่วนแนวนอน แมพกว้างกว่าจอ (~2000 vs ~1365 ที่มองเห็น) กล้องเลยแพนตามจุดกึ่งกลางระหว่างผู้เล่น
   * Phaser clamp ให้อยู่ใน bounds เองอยู่แล้ว กล้องจึงไม่มีทางเลื่อนออกนอกแมพ
   */
  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    cam.setZoom(cam.height / this.level.worldHeight);
    this._updateCamera(true);
  }

  /** @param {boolean} [instant] ข้าม smoothing (ใช้ตอนเริ่มฉาก ไม่งั้นกล้องจะไถลเข้าที่ให้เห็น) */
  _updateCamera(instant = false) {
    const alive = this.players.filter((p) => this.playerAlive.get(p));
    const active = alive.length > 0 ? alive : this.players;
    const xs = active.map((p) => p.x);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;

    const cam = this.cameras.main;
    const halfView = cam.width / cam.zoom / 2;
    const targetX = Phaser.Math.Clamp(midX, halfView, this.level.worldWidth - halfView);
    const centerY = this.level.worldHeight / 2;
    if (instant) {
      cam.centerOn(targetX, centerY);
      return;
    }
    // ตามแบบหน่วง ๆ ไม่ติดตัวเป๊ะ — กล้องกระตุกตามทุกก้าวจะเวียนหัว
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, targetX, 0.08), centerY);
  }

  _updateHud() {
    const hp1 = Math.round(this.hp.get(this.p1) ?? 0);
    const hp2 = Math.round(this.hp.get(this.p2) ?? 0);
    const nameP1 = this.p1.displayName ?? getCharacterClass(this.charKeyP1).DISPLAY_NAME;
    const nameP2 = this.p2.displayName ?? getCharacterClass(this.charKeyP2).DISPLAY_NAME;
    // ◆ = ท่าเรียกร่างพร้อม, ◇ = ยังคูลดาวน์, ว่าง = ตัวละครนี้ไม่มีท่านี้
    const standMark = (p) => (p.constructor.CAN_SUMMON ? (p.canSummon() ? " ◆" : " ◇") : "");
    // ร่างแปลง: โชว์หลอดร่างแปลงคู่กับหลอดปกติ (หลอดปกติไม่ลดระหว่างเป็นไททัน)
    // v33 ร่างแปลงมีเวลาจำกัด -> โชว์วินาทีที่เหลือต่อท้ายหลอด
    const formHp = (p) =>
      p.isTransformed?.()
        ? `[${Math.ceil(p.formHp)}/${p.formMaxHp}${p.formTimeLeft > 0 ? ` · ${Math.ceil(p.formTimeLeft / 1000)}s` : ""}] `
        : "";
    this.hpTextP1.setText(`${nameP1}  ${formHp(this.p1)}${hp1}/${MAX_HP}  ${this._heartsString(this.p1)}${standMark(this.p1)}`);
    this.hpTextP2.setText(`${standMark(this.p2)}${this._heartsString(this.p2)}  ${formHp(this.p2)}${hp2}/${MAX_HP}  ${nameP2}`);
  }

  /** คูณสองสีเข้าด้วยกัน — ใช้ตอนต้องใส่ทั้งโทนแมพและสีแยกฝั่งผู้เล่นพร้อมกัน */
  _mixTint(a, b) {
    const ch = (v, shift) => ((v >> shift) & 0xff) / 255;
    const r = Math.round(ch(a, 16) * ch(b, 16) * 255);
    const g = Math.round(ch(a, 8) * ch(b, 8) * 255);
    const bl = Math.round(ch(a, 0) * ch(b, 0) * 255);
    return (r << 16) | (g << 8) | bl;
  }

  _heartsString(player) {
    const remaining = Math.max(this.stocks.get(player) ?? 0, 0);
    return "♥".repeat(remaining) + "♡".repeat(Math.max(STARTING_STOCKS - remaining, 0));
  }

  _updateDebugText() {
    this.debugText.setText(
      `แมพ: ${this.level.id} | ฤดู: ${this.currentSeason} (1-5) | ตี: Space\n` +
        `P1 คอมโบ ${this.p1.comboStep}/3 เข้า ${this.p1.hitsLanded}` +
        `${this.p1.finisherReady ? " ★ไม้ตายพร้อม" : ""} | ` +
        `P2 คอมโบ ${this.p2.comboStep}/3 เข้า ${this.p2.hitsLanded}` +
        `${this.p2.finisherReady ? " ★ไม้ตายพร้อม" : ""}`
    );
  }
}
