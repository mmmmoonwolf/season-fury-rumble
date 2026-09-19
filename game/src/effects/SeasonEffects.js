/**
 * Particle effect ต่อฤดู — แยกเลเยอร์อิสระจาก background art และ collision
 * ใช้ this.add.particles() ของ Phaser 3.60+ (คืนค่า emitter ตรงๆ ไม่ต้องผ่าน manager)
 *
 * หลักการวาง emission zone: เว้นพื้นที่เล่น (floor) ให้โล่งที่สุด
 * ฝน/หิมะปล่อยเต็มความกว้าง world แต่ไม่ปล่อยหนาแน่นจนบัง sightline
 * เอฟเฟกต์ทั้งหมดตั้ง depth ต่ำกว่าตัวละคร (ต้องตั้ง depth ตัวละครสูงกว่านี้ตอนใส่ sprite จริง)
 */
export class SeasonEffects {
  static PARTICLE_DEPTH = 5; // ตัวละครควรตั้ง depth > 5 ตอนใส่ sprite จริง

  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.activeEmitters = [];
    this._generateTextures();
  }

  _generateTextures() {
    const s = this.scene;

    // กลีบซากุระ — วงรีชมพูเล็ก
    const petal = s.make.graphics({ x: 0, y: 0, add: false });
    petal.fillStyle(0xffb7c5, 1);
    petal.fillEllipse(4, 3, 8, 6);
    petal.generateTexture("particle_petal", 8, 6);
    petal.destroy();

    // ใบไม้ร่วง — สี่เหลี่ยมข้าวหลามตัดสีส้ม
    const leaf = s.make.graphics({ x: 0, y: 0, add: false });
    leaf.fillStyle(0xd97706, 1);
    leaf.fillTriangle(5, 0, 10, 8, 0, 8);
    leaf.generateTexture("particle_leaf", 10, 8);
    leaf.destroy();

    // หิมะ — วงกลมขาวเล็ก
    const snow = s.make.graphics({ x: 0, y: 0, add: false });
    snow.fillStyle(0xffffff, 1);
    snow.fillCircle(3, 3, 3);
    snow.generateTexture("particle_snow", 6, 6);
    snow.destroy();

    // เส้นฝน — เส้นบางสีฟ้าอมขาว
    const rain = s.make.graphics({ x: 0, y: 0, add: false });
    rain.lineStyle(2, 0xbfdbfe, 0.8);
    rain.lineBetween(0, 0, 0, 18);
    rain.generateTexture("particle_rain", 4, 18);
    rain.destroy();

    // Splash ตอนฝนกระทบพื้น — วงแหวนเล็ก
    const splash = s.make.graphics({ x: 0, y: 0, add: false });
    splash.lineStyle(1.5, 0xdbeafe, 0.7);
    splash.strokeCircle(4, 4, 4);
    splash.generateTexture("particle_splash", 8, 8);
    splash.destroy();

    // ฝุ่นแสง/ละอองสำหรับฤดูร้อน — วงกลมเล็กจางๆ (heat shimmer แบบง่าย)
    const mote = s.make.graphics({ x: 0, y: 0, add: false });
    mote.fillStyle(0xfde68a, 0.5);
    mote.fillCircle(3, 3, 3);
    mote.generateTexture("particle_mote", 6, 6);
    mote.destroy();
  }

  setSeason(seasonKey) {
    this._clearActive();
    const handler = this[`_${seasonKey}`];
    if (handler) {
      handler.call(this);
    } else {
      console.warn(`[SeasonEffects] ไม่รู้จักฤดู "${seasonKey}"`);
    }
  }

  _clearActive() {
    for (const emitter of this.activeEmitters) {
      emitter.stop();
      emitter.destroy();
    }
    this.activeEmitters = [];
  }

  _register(emitter) {
    emitter.setDepth(SeasonEffects.PARTICLE_DEPTH);
    this.activeEmitters.push(emitter);
    return emitter;
  }

  // ---------- ใบไม้ผลิ: กลีบซากุระร่วง ----------
  _spring() {
    const { worldWidth } = this.level;
    const emitter = this.scene.add.particles(0, 0, "particle_petal", {
      x: { min: 0, max: worldWidth },
      y: -20,
      lifespan: 6000,
      speedY: { min: 20, max: 45 },
      speedX: { min: -15, max: 15 }, // แกว่งซ้าย-ขวาตามลม
      rotate: { min: 0, max: 360 },
      angle: { min: -100, max: -80 }, // ทิศเริ่มลอยลง
      scale: { min: 0.6, max: 1.1 },
      alpha: { start: 0.9, end: 0.4 },
      frequency: 220, // ms ต่อ 1 กลีบ (ไม่หนาแน่นเกินไป)
    });
    this._register(emitter);
  }

  // ---------- ร้อน: ฝุ่นแสงลอยขึ้นเบาๆ (heat shimmer แบบง่าย) ----------
  _summer() {
    const { worldWidth, worldHeight } = this.level;
    const emitter = this.scene.add.particles(0, 0, "particle_mote", {
      x: { min: 0, max: worldWidth },
      y: { min: worldHeight - 100, max: worldHeight },
      lifespan: 3000,
      speedY: { min: -25, max: -10 }, // ลอยขึ้น (heat rising)
      speedX: { min: -5, max: 5 },
      scale: { min: 0.4, max: 0.9 },
      alpha: { start: 0.5, end: 0 },
      frequency: 300,
    });
    this._register(emitter);
  }

  // ---------- ใบไม้ร่วง: ใบไม้หมุนตกช้าๆ ----------
  _autumn() {
    const { worldWidth } = this.level;
    const emitter = this.scene.add.particles(0, 0, "particle_leaf", {
      x: { min: 0, max: worldWidth },
      y: -20,
      lifespan: 7000,
      speedY: { min: 15, max: 35 }, // ช้ากว่ากลีบซากุระ
      speedX: { min: -25, max: 25 }, // แกว่งกว้างกว่า (ใบไม้เบากว่ากลีบ)
      rotate: { min: 0, max: 360 },
      scale: { min: 0.7, max: 1.2 },
      alpha: { start: 0.9, end: 0.5 },
      frequency: 280,
    });
    this._register(emitter);
  }

  // ---------- หนาว: หิมะตก ----------
  _winter() {
    const { worldWidth } = this.level;
    const emitter = this.scene.add.particles(0, 0, "particle_snow", {
      x: { min: 0, max: worldWidth },
      y: -20,
      lifespan: 8000,
      speedY: { min: 25, max: 50 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.5, max: 1 },
      alpha: { start: 0.9, end: 0.6 },
      frequency: 150, // หนาแน่นกว่าฤดูอื่นนิดหน่อย ให้ความรู้สึกหนาว
    });
    this._register(emitter);
  }

  // ---------- ฝน: เส้นฝนตกเร็ว + splash ตรงพื้นดาดฟ้า ----------
  _rain() {
    const { worldWidth, platforms } = this.level;

    const rainEmitter = this.scene.add.particles(0, 0, "particle_rain", {
      x: { min: 0, max: worldWidth },
      y: -20,
      lifespan: 900, // ตกเร็ว ใช้เวลาสั้นกว่าฤดูอื่นมาก
      speedY: { min: 500, max: 650 },
      speedX: { min: -20, max: -10 }, // เอียงตามลมเล็กน้อย
      scale: 1,
      alpha: { start: 0.7, end: 0.3 },
      frequency: 30, // หนาแน่นมาก (ฝนต้องดูตกถี่)
    });
    this._register(rainEmitter);

    // Splash เฉพาะตรงขอบบนของแต่ละ platform (ไม่ใช่ทั่วจอ)
    for (const plat of platforms) {
      const splashEmitter = this.scene.add.particles(0, 0, "particle_splash", {
        x: { min: plat.x, max: plat.x + plat.width },
        y: plat.y,
        lifespan: 300,
        speed: 0,
        scale: { start: 0.3, end: 1 },
        alpha: { start: 0.6, end: 0 },
        frequency: 90,
      });
      this._register(splashEmitter);
    }
  }

  destroy() {
    this._clearActive();
  }
}
