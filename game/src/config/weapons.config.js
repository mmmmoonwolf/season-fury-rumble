/**
 * ระบบสลับอาวุธ (ตอนนี้มีแค่ KunJae) — ปุ่มเดียวกับแปลงร่าง (numpad 8 / ปุ่มกลมขวาของ S3)
 *
 * - v28: อาวุธที่ถือเปลี่ยน "ท่ายืน + ตีพื้นฐาน + สกิล 1-3" ทั้งชุด (ท่าวิ่ง/กระโดด/โดนตียังใช้ชุดเดียวกัน)
 *   prefix = ชุด animation ของอาวุธนั้น (KunJae.js ลงทะเบียน) · combatKey = ค่าต่อสู้ใน CHARACTER_COMBAT
 * - สกิลที่ยังไม่มี = ปุ่มเทา กดไม่ได้
 * - enabled: false = ข้ามตอนสลับ (ยังไม่มีอาร์ต) — เปิดเป็น true ได้เลยถ้าอยากเห็นในวงสลับ
 * - คูลดาวน์สกิลแยกตามอาวุธ (สลับอาวุธหนีคูลดาวน์ไม่ได้ ของเดิมยังนับต่อ)
 */
export const WEAPON_SWITCH_COOLDOWN_MS = 250; // กันกดรัวจนไอคอนกระพริบ

/** ลูกซองยิงไปข้างหน้า (ตีพื้นฐานตอนถือลูกซอง) — ภาพไฟเล็กกว่าสกิล ไม่แฟลชจอ */
export const SHOTGUN_BASIC_FX = { small: true };

/** ลำดับการสลับ · icon = ชื่อ texture ที่ GunEffects วาดให้ · color = สีปุ่ม */
export const WEAPON_LIST = [
  // prefix null = ชุดหลักของตัวละคร (kunjae/)
  { key: "whip",    label: "WHIP",     short: "แส้",       icon: "wpn_whip",    color: 0xa16207, enabled: true,  prefix: null,              combatKey: "kunjae" },
  { key: "pistol",  label: "PISTOLS",  short: "ปืนสั้นคู่", icon: "wpn_pistol",  color: 0x38bdf8, enabled: true,  prefix: "kunjae/pistol/",  combatKey: "kunjae_pistol" },
  { key: "shotgun", label: "SHOTGUNS", short: "ลูกซองคู่", icon: "wpn_shotgun", color: 0xef4444, enabled: true,  prefix: "kunjae/shotgun/", combatKey: "kunjae_shotgun" },
  // ยังไม่ได้ทำ — เปิดแล้วใช้ท่า/ค่าของแส้ไปก่อน
  { key: "rifle",   label: "RIFLE",    short: "ไรเฟิล",    icon: "wpn_rifle",   color: 0x22c55e, enabled: false, prefix: null,              combatKey: "kunjae" },
  { key: "grenade", label: "GRENADE",  short: "ระเบิด",    icon: "wpn_grenade", color: 0xa3a3a3, enabled: false, prefix: null,              combatKey: "kunjae" },
];

/**
 * v29 แส้ สกิล 1 — ฟาดเร็ว 1 ที จนเกิด sonic boom (คลิป 123B2E73 + เสียงจากคลิป)
 * ค่าเป็นค่าก่อนคูณ CHARACTER_COMBAT.kunjae (ระยะ x3.2 · ดาเมจ x0.6) -> ระยะ 256 · ดาเมจ 18
 * ไม่คูณ timeMul (สกิลใช้เวลาตามท่า) · hitstopKind "sonic" = HITSTOP.sonic
 */
export const WHIP_SKILL1 = {
  cooldownMs: 7000,
  fps: 24,
  hit: {
    name: "whip_sonic",
    damage: 30,
    reach: 80,
    hitboxHeight: 130,
    hitboxYOffset: -30,
    knockbackX: 560,
    knockbackY: -340,
    hitstun: 700,
    active: 90,
    hitstopKind: "sonic",
  },
  /** จุดเกิดบูม: ระยะจากกลางตัว (สัดส่วนของ reach) · ความสูงจากเท้า (px โลก) */
  boomAtReach: 0.8,
  boomHeight: 110,
};

/**
 * v29 แส้ สกิล 2 — เขวี้ยงบ่วงบาศคล้องเป้าที่อยู่ด้านหน้า ดึงเข้ามา แล้วเตะ (คลิป 0DDB62E1 + เสียงจากคลิป)
 * ระยะคล้อง = ปลายเชือกในภาพตอนตึงสุด (meta.lassoTip ของ atlas) — ไม่ต้องตั้งเอง
 * คล้องไม่โดน = ม้วนเชือกกลับแล้วจบ (ไม่เตะ) · KunJae โดนตีระหว่างดึง = ปล่อยเป้า
 * เป้ากันอยู่ตอนคล้อง = ไม่ติดบ่วง เสียมาตรการ์ดแทน
 */
export const WHIP_SKILL2 = {
  cooldownMs: 9000,
  fps: 24,
  catchDamage: 3,      // ตอนบ่วงรัด (ก่อนคูณ 0.6 -> 2)
  loopRadius: 45,      // px ผืนภาพ — เป้าอยู่กลางวงบ่วง (ปลายเชือก - รัศมีวง)
  kick: {
    name: "lasso_kick",
    damage: 26,        // x0.6 -> 16
    knockbackX: 640,
    knockbackY: -380,
    hitstun: 750,
  },
  kickHitstop: 200,
};

/**
 * ลูกซองคู่ สกิล 1 — กางแขนยิงซ้าย-ขวาพร้อมกัน โดนรอบตัว (AOE) กระเด็นออกจากตัว
 * ค่าเป็นค่าก่อนคูณ — v28 ถือลูกซองใช้ CHARACTER_COMBAT.kunjae_shotgun (ดาเมจ x1.3, กระเด็น x1.8)
 *   -> ดาเมจจริง 12 x 1.3 = 16 · กระเด็น 240 x 1.8 = 432
 * aoe.halfWidth นับจากกลางตัว (ปากกระบอก ~107px + ลูกปราย ~110px)
 */
export const SHOTGUN_SKILL1 = {
  cooldownMs: 6000,
  fps: 28,                 // ท่าชักปืน 11 เฟรม -> ยิงที่ ~390ms
  blast: {
    name: "shotgun_blast",
    damage: 12,
    knockbackX: 240,
    knockbackY: -150,
    hitstun: 520,
    active: 120,
    aoe: { halfWidth: 220, height: 170 },
    radial: true,
    hitstopKind: "heavy",
  },
  pelletRange: 115,        // ความยาวเส้นลูกปราย (ภาพ) ต่อจากปากกระบอก
};
