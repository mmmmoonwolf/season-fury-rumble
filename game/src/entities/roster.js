import { KunJae } from "./KunJae.js";
import { DearV2 } from "./DearV2.js";
import { MarchV2 } from "./MarchV2.js";
import { Oat } from "./Oat.js";

/**
 * ทะเบียนตัวละครทั้งหมดในเกม
 *
 * เพิ่มตัวละครใหม่ = สร้างไฟล์ใน entities/ (ก๊อป Oat.js หรือ MarchV2.js เป็นแบบได้เลย) แล้วมาใส่ที่นี่ 1 บรรทัด
 * ที่เหลือ (preload / ลงทะเบียน animation / สร้างตัว / ปุ่มสลับตัวละคร) scene จัดการให้เองหมด
 *
 * กติกาของตัวละครทุกตัว:
 *  - static DISPLAY_NAME, ANIM_PREFIX (ห้ามซ้ำ), WORLD_HEIGHT
 *  - static preload(scene), static registerAnimations(scene)
 *  - constructor(scene, x, y, playerIndex)
 */
export const ROSTER = {
  kunjae: KunJae,
  dearv2: DearV2,
  marchv2: MarchV2,
  oat: Oat,
};

/**
 * ตัวที่เลือกเล่นได้จริง — ปุ่มสลับตัวละครวนเฉพาะในลิสต์นี้
 * (Dear / Bomb / March เวอร์ชันเก่า และ TeeMee ถูกลบออกจากโปรเจกต์แล้วใน v26)
 */
export const PLAYABLE = ["kunjae", "dearv2", "marchv2", "oat"];

/** ลำดับสำหรับปุ่มสลับตัวละคร (V = ผู้เล่น, C = ฝั่ง NPC) */
export const ROSTER_ORDER = PLAYABLE;

/** ตัวละครเริ่มต้นของแต่ละฝั่ง */
export const DEFAULT_P1_CHARACTER = "kunjae"; // v31 สกิล Dear V.2 ถูกถอดออก (รออาร์ตใหม่) — V สลับตัวได้
export const DEFAULT_P2_CHARACTER = "oat";

export function getCharacterClass(key) {
  return ROSTER[key] ?? ROSTER[DEFAULT_P1_CHARACTER];
}

export function nextCharacterKey(current) {
  const i = ROSTER_ORDER.indexOf(current);
  return ROSTER_ORDER[(i + 1) % ROSTER_ORDER.length];
}
