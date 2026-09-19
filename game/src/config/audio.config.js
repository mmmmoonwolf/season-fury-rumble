/**
 * ค่าเสียงทั้งหมดอยู่ที่นี่ที่เดียว — จูนได้โดยไม่ต้องแตะ AudioSystem.js
 *
 * เสียงในเกมนี้ "สังเคราะห์สด" ด้วย Web Audio ไม่ได้โหลดไฟล์ .mp3/.wav
 * เหตุผล:
 *  - ไม่ต้องหา/ลิขสิทธิ์ไฟล์เสียง ไม่เพิ่มขนาด zip เลยสักไบต์
 *  - ปรับ pitch/ความยาว/ความแรงได้ทุกครั้งที่เล่น → ตบ 9 ครั้งรัวไม่ได้ยินเสียงซ้ำเป๊ะ ๆ
 *  - ถ้าวันหลังหาไฟล์เสียงจริงที่ชอบได้ ค่อยเปลี่ยน AudioSystem.play() ให้ไปเรียก
 *    this.scene.sound.play(key) แทน โดยจุดที่เรียกใช้ในเกม (Player/CombatSystem) ไม่ต้องแก้เลย
 *
 * หน่วย: duration = วินาที (Web Audio ใช้วินาที ไม่ใช่ ms เหมือน combat.config)
 *        freq = Hz, volume = 0..1
 */

/** ดังรวมทุกเสียง — ลดค่านี้ค่าเดียวถ้าเสียงดังไป */
export const MASTER_VOLUME = 0.5;

/**
 * v29 เสียงจากไฟล์ (ตัดจากคลิปอ้างอิง) — key = ชื่อที่ใช้ใน playSample() · ไฟล์ใน assets/audio/
 * volume = ความดังของไฟล์นั้น (คูณ MASTER_VOLUME อีกชั้น) · ไฟล์ถูก normalize peak -1dB มาแล้ว
 */
export const SAMPLES = {
  kj_whip_whoosh: { path: "assets/audio/kj_whip_whoosh.mp3", volume: 0.6 },
  kj_sonic_boom:  { path: "assets/audio/kj_sonic_boom.mp3",  volume: 1.0 },
  kj_lasso_throw: { path: "assets/audio/kj_lasso_throw.mp3", volume: 0.7 },
  kj_lasso_catch: { path: "assets/audio/kj_lasso_catch.mp3", volume: 0.8 },
  kj_kick_impact: { path: "assets/audio/kj_kick_impact.mp3", volume: 1.0 },
  dv2_laugh:       { path: "assets/audio/dv2_laugh.mp3",       volume: 0.9 },
  dv2_knife_hit:   { path: "assets/audio/dv2_knife_hit.mp3",   volume: 0.7 },
  dv2_clown_call:  { path: "assets/audio/dv2_clown_call.mp3",  volume: 0.9 },
  dv2_clown_laugh: { path: "assets/audio/dv2_clown_laugh.mp3", volume: 0.9 },
  // v32 Dear V.2 สกิล 2 ย่อง — ตัดจากคลิปสกิล (normalize -1dB แล้ว ปรับดังเบาที่นี่)
  dv2_sneak_laugh: { path: "assets/audio/dv2_sneak_laugh.mp3", volume: 0.85 },
  dv2_sneak_step:  { path: "assets/audio/dv2_sneak_step.mp3",  volume: 0.5 },
  dv2_sneak_stab1: { path: "assets/audio/dv2_sneak_stab1.mp3", volume: 0.55 },
  dv2_sneak_stab2: { path: "assets/audio/dv2_sneak_stab2.mp3", volume: 0.55 },
  dv2_sneak_stab3: { path: "assets/audio/dv2_sneak_stab3.mp3", volume: 0.55 },
  // v33 OAT ร่างไททัน — คลิปง้างเตะ (คำราม 0.15-3.8 วิ · ง้าง 5.7-6.8 · เตะ 7.36-8.9)
  oat_titan_roar:   { path: "assets/audio/oat_titan_roar.mp3",   volume: 1.0 },
  oat_titan_windup: { path: "assets/audio/oat_titan_windup.mp3", volume: 0.8 },
  oat_titan_kick:   { path: "assets/audio/oat_titan_kick.mp3",   volume: 1.0 },
  // v34 Dear V.2 ลูกโป่ง (6 คลิป — ดู tools/build_dearv2_balloon.py)
  dv2_balloon_squeak: { path: "assets/audio/dv2_balloon_squeak.mp3", volume: 0.6 },
  dv2_balloon_throw:  { path: "assets/audio/dv2_balloon_throw.mp3",  volume: 0.8 },
  dv2_confetti:       { path: "assets/audio/dv2_confetti.mp3",       volume: 0.85 },
  dv2_pop_poison:     { path: "assets/audio/dv2_pop_poison.mp3",     volume: 0.9 },
  dv2_jackbox:        { path: "assets/audio/dv2_jackbox.mp3",        volume: 1.0 },
  dv2_bald_laugh:     { path: "assets/audio/dv2_bald_laugh.mp3",     volume: 0.8 },
};

/** เริ่มเกมมาเสียงเปิดไว้ไหม (กด N สลับได้ระหว่างเล่น) */
export const START_MUTED = false;

export const SFX = {
  /**
   * ตบโดน (หมัดธรรมดา + หมัดในชุดไม้ตาย)
   * สองชั้นซ้อนกัน: noise = เสียง "แปะ" ของฝ่ามือ, body = เสียงทุ้มที่ให้น้ำหนัก
   */
  hit: {
    volume: 0.55,
    noise: { duration: 0.09, filterFrom: 3200, filterTo: 900, q: 1.1 },
    body: { type: "sine", from: 200, to: 70, duration: 0.11 },
    /** สุ่ม pitch ±% ทุกครั้ง กันเสียงซ้ำจนล้าหู */
    pitchJitter: 0.12,
  },

  /**
   * หมัดปิดชุดไม้ตาย — ตัวเดียวกับ hit แต่ตัวใหญ่ขึ้น ทุ้มลง ยาวขึ้น
   * มาคู่กับกล้องสั่นที่มีอยู่แล้วใน CombatSystem
   */
  hitHeavy: {
    volume: 0.85,
    noise: { duration: 0.18, filterFrom: 2600, filterTo: 400, q: 0.9 },
    body: { type: "triangle", from: 150, to: 38, duration: 0.3 },
    /** ชั้นล่างสุด ให้รู้สึกที่หน้าอกมากกว่าที่หู */
    sub: { type: "sine", from: 90, to: 30, duration: 0.36, volume: 0.7 },
    pitchJitter: 0.08,
  },

  /**
   * เสียงลมตอนเหวี่ยงมือ — เล่นตอนเริ่มออกหมัด ไม่ว่าจะโดนหรือไม่โดน
   * เบาไว้ตั้งใจ: หน้าที่มันคือทำให้ "ตบโดน" ฟังดูหนักขึ้นโดยเปรียบเทียบ
   */
  swing: {
    volume: 0.22,
    noise: { duration: 0.13, filterFrom: 700, filterTo: 2600, q: 3.2 },
    pitchJitter: 0.15,
  },

  /** กระโดด — ตุ๊บสั้น ๆ เบา ๆ (double jump จะสูงกว่าอัตโนมัติ ดู AudioSystem.playJump) */
  jump: {
    volume: 0.18,
    body: { type: "sine", from: 320, to: 620, duration: 0.09 },
  },

  /** ลงพื้น */
  land: {
    volume: 0.2,
    noise: { duration: 0.08, filterFrom: 900, filterTo: 250, q: 0.8 },
    body: { type: "sine", from: 120, to: 60, duration: 0.1 },
  },

  /** HP หมด 1 stock */
  ko: {
    volume: 0.6,
    noise: { duration: 0.35, filterFrom: 2000, filterTo: 300, q: 1.0 },
    body: { type: "sawtooth", from: 420, to: 70, duration: 0.5 },
  },
};

/**
 * กันเสียงทับกันจนแตก: เสียงชื่อเดียวกันเล่นถี่กว่านี้ (ms) จะถูกข้าม
 * ไม้ตายตบทุก 55ms — ตั้ง 40 จึงยังได้ยินครบทุกฮิต แต่กันเคสหลายคนตบพร้อมกัน
 */
export const MIN_INTERVAL_MS = 40;

/**
 * ตอนโดนตบรัว ๆ ติดกัน ให้ pitch ไต่ขึ้นทีละขั้น (แบบเกมต่อสู้)
 * ฟังแล้วรู้สึกว่าคอมโบ "กำลังไต่" ไม่ใช่เสียงเดิมซ้ำ 9 รอบ
 */
export const COMBO_PITCH_STEP = 0.045; // +4.5% ต่อฮิตที่ต่อเนื่อง
export const COMBO_PITCH_MAX = 1.55; // เพดาน กันแหลมเกิน
export const COMBO_CHAIN_RESET_MS = 400; // เว้นนานกว่านี้ = เริ่มนับใหม่
