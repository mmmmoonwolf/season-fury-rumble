import {
  MASTER_VOLUME,
  START_MUTED,
  SFX,
  SAMPLES,
  MIN_INTERVAL_MS,
  COMBO_PITCH_STEP,
  COMBO_PITCH_MAX,
  COMBO_CHAIN_RESET_MS,
} from "../config/audio.config.js";

/**
 * เสียงเอฟเฟกต์ทั้งหมดของเกม — สังเคราะห์สดด้วย Web Audio ไม่มีไฟล์เสียงให้โหลด
 *
 * โครงเสียงหนึ่งครั้ง = ซ้อนกันสูงสุด 3 ชั้น (ตามที่ config กำหนดไว้):
 *   noise — white noise ผ่าน bandpass ที่กวาดความถี่ = เนื้อเสียง "แปะ/ฉวับ"
 *   body  — oscillator ที่ pitch ตกลง = น้ำหนักของหมัด
 *   sub   — oscillator ความถี่ต่ำมาก = แรงกระแทกที่รู้สึกมากกว่าได้ยิน
 * ทุกชั้นใช้ envelope แบบเดียวกัน: ดังทันที แล้วจางแบบ exponential
 *
 * ข้อจำกัดเบราว์เซอร์: AudioContext เริ่มมาเป็น "suspended" จนกว่าผู้ใช้จะกดอะไรสักอย่าง
 * เลยต้องดัก keydown/pointerdown ครั้งแรกเพื่อ resume — ถ้าไม่ทำจะเงียบสนิทโดยไม่มี error
 */
export class AudioSystem {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.muted = START_MUTED;
    this.ctx = null;
    this.master = null;
    this._lastPlayed = new Map(); // ชื่อเสียง → เวลาที่เล่นล่าสุด (กันเล่นถี่เกิน)
    this._comboChain = 0; // จำนวนฮิตต่อเนื่อง ใช้ไต่ pitch
    this._lastHitAt = 0;

    this._initContext();
    this._installUnlockHandlers();

    // scene restart (ปุ่ม R) → ปิด context เดิมทิ้ง ไม่ให้ค้างสะสม
    scene.events.once("shutdown", () => this.destroy());
    scene.events.once("destroy", () => this.destroy());
  }

  _initContext() {
    // ใช้ context ของ Phaser ถ้ามี (Phaser จัดการ unlock ให้ส่วนหนึ่งอยู่แล้ว)
    // ถ้าเครื่องนั้น Phaser fallback ไปใช้ HTML5 Audio ค่อยสร้าง context เอง
    const phaserCtx = this.scene.sound?.context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    this.ctx = phaserCtx ?? (Ctor ? new Ctor() : null);
    if (!this.ctx) return; // เบราว์เซอร์ไม่รองรับ → เกมยังเล่นได้ แค่ไม่มีเสียง

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);

    // white noise buffer 1 วินาที สร้างครั้งเดียวแล้วใช้ซ้ำทุกเสียง
    const rate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, rate, rate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** ปลดล็อกเสียงตอนผู้ใช้กดปุ่มแรก — ต้องมี ไม่งั้นเงียบสนิทตาม autoplay policy */
  _installUnlockHandlers() {
    if (!this.ctx) return;
    const unlock = () => {
      if (this.ctx.state === "suspended") this.ctx.resume();
    };
    this.scene.input.keyboard?.on("keydown", unlock);
    this.scene.input.on("pointerdown", unlock);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_VOLUME;
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /**
   * เล่นเสียงตามชื่อใน audio.config
   * @param {keyof typeof SFX} name
   * @param {{pitch?: number, volume?: number}} [opts] pitch = ตัวคูณความถี่, volume = ตัวคูณความดัง
   */
  play(name, opts = {}) {
    const spec = SFX[name];
    if (!spec || !this.ctx || this.muted) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = performance.now();
    const last = this._lastPlayed.get(name) ?? -Infinity;
    if (now - last < MIN_INTERVAL_MS) return; // ถี่เกินหูแยกไม่ออกอยู่ดี ข้ามไป
    this._lastPlayed.set(name, now);

    const jitter = spec.pitchJitter ?? 0;
    const pitch = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    const gain = (spec.volume ?? 0.5) * (opts.volume ?? 1);
    const t = this.ctx.currentTime;

    if (spec.noise) this._playNoise(spec.noise, gain, pitch, t);
    if (spec.body) this._playTone(spec.body, gain, pitch, t);
    if (spec.sub) this._playTone(spec.sub, gain * (spec.sub.volume ?? 1), pitch, t);
  }

  /** โหลดไฟล์เสียงทั้งหมดใน SAMPLES (เรียกจาก preload ของ scene) */
  static preload(scene) {
    for (const [key, s] of Object.entries(SAMPLES)) scene.load.audio?.(key, s.path);
  }

  /**
   * เล่นไฟล์เสียง (ตัดจากคลิป) ผ่าน master ตัวเดียวกับเสียงสังเคราะห์ -> ปุ่ม N ปิดได้เหมือนกัน
   * Phaser (WebAudio) ถอดรหัสไฟล์เก็บใน cache.audio เป็น AudioBuffer ตั้งแต่ตอนโหลด
   * @param {keyof typeof SAMPLES} key
   * @param {{volume?: number, rate?: number}} [opts]
   */
  playSample(key, opts = {}) {
    const spec = SAMPLES[key];
    if (!spec || !this.ctx || this.muted) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const buf = this.scene.cache?.audio?.get(key);
    const vol = (spec.volume ?? 1) * (opts.volume ?? 1);
    if (typeof AudioBuffer === "undefined" || !(buf instanceof AudioBuffer)) {
      // เครื่องที่ Phaser ใช้ HTML5 Audio: ให้ Phaser เล่นเอง (ไม่ผ่าน master แต่ยังเคารพ mute ด้านบน)
      if (this.scene.cache?.audio?.exists?.(key)) this.scene.sound?.play(key, { volume: vol * MASTER_VOLUME, rate: opts.rate ?? 1 });
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
  }

  /**
   * ตบโดน — แยกออกมาเป็นเมธอดของตัวเองเพราะมี logic "ไต่ pitch ตามคอมโบ"
   * ยิ่งฮิตต่อเนื่องเสียงยิ่งสูงขึ้นทีละขั้น พอเว้นช่วงถึงจะรีเซ็ต
   * @param {boolean} heavy หมัดปิดชุดไม้ตายหรือไม่
   */
  playHit(heavy = false) {
    const now = performance.now();
    if (now - this._lastHitAt > COMBO_CHAIN_RESET_MS) this._comboChain = 0;
    this._lastHitAt = now;

    if (heavy) {
      this._comboChain = 0; // ปิดชุดแล้ว เริ่มนับใหม่
      this.play("hitHeavy");
      return;
    }

    const pitch = Math.min(1 + this._comboChain * COMBO_PITCH_STEP, COMBO_PITCH_MAX);
    this._comboChain += 1;
    this.play("hit", { pitch });
  }

  /** กระโดด — ครั้งที่สอง (double jump) เสียงสูงกว่า ให้แยกออกด้วยหู */
  playJump(jumpIndex = 0) {
    this.play("jump", { pitch: jumpIndex === 0 ? 1 : 1.28 });
  }

  // ---------- ชั้นเสียงระดับล่าง ----------

  /** white noise ผ่าน bandpass ที่กวาดความถี่จาก filterFrom → filterTo */
  _playNoise({ duration, filterFrom, filterTo, q = 1 }, gain, pitch, t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(filterFrom * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo * pitch), t + duration);

    const env = this._envelope(gain, duration, t);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  /** oscillator ที่ pitch ตกลง (หรือขึ้น) ตาม from → to */
  _playTone({ type = "sine", from, to, duration }, gain, pitch, t) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * pitch), t + duration);

    const env = this._envelope(gain, duration, t);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /**
   * envelope: ขึ้นเร็วมาก (1.5ms) แล้วจางแบบ exponential
   * ที่ต้องมี attack สั้น ๆ แทนที่จะดังทันที เพราะเริ่มจาก 0 ทันทีจะได้ยินเสียง "คลิก"
   */
  _envelope(peak, duration, t) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    return g;
  }

  destroy() {
    this._lastPlayed.clear();
    // ปิดเฉพาะ context ที่สร้างเอง — ถ้ายืม context ของ Phaser มาห้ามปิด เดี๋ยว scene ใหม่ไม่มีเสียง
    if (this.ctx && this.ctx !== this.scene.sound?.context) {
      this.ctx.close?.();
    }
    this.ctx = null;
    this.master = null;
  }
}
