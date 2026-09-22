/**
 * โหมดเกม — เลือกจากล็อบบี้ก่อนเริ่มเล่น (ดู LobbyScene.js)
 *
 * normal   = แมพระนาบเดียวปกติ (ของเดิมทั้งหมด) ตัวละครไซส์เต็ม ควบคุมแบบเดิมทุกอย่าง
 *
 * scramble = โหมดใหม่ทั้งระบบ ไม่ใช้เอนจิ้นเดิมเลย (ดู src/modes/scramble/) — ฉากของตัวเอง
 *            ฟิสิกส์ของตัวเอง เฟรมเดต้าของตัวเอง เดินที่ 60 เฟรม/วินาทีคงที่
 *            จึงไม่มี characterScaleMul/physics เพราะไม่ได้ไปแตะ BASE_PHYSICS ของเกมเดิม
 *            scene ระบุว่าให้ล็อบบี้ยิงไปฉากไหน ไม่ระบุ = MainGameScene ตามเดิม
 *
 * physics = ตัวคูณทับ BASE_PHYSICS (ดู applySeasonModifiers ใน physics.config.js) — คูณร่วมกับตัวคูณฤดูด้วย
 * ไม่ระบุคีย์ไหน = ไม่ปรับ (multiplier 1.0) เหมือนกลไก SEASON_MODIFIERS เดิม
 */
export const GAME_MODES = {
  normal: {
    id: "normal",
    label: "โหมดปกติ",
    subLabel: "แมพระนาบเดียว ต่อสู้เต็มไซส์",
    characterScaleMul: 1,
    allowDash: true,
    physics: {},
  },
  scramble: {
    id: "scramble",
    label: "SCRAMBLE",
    subLabel: "Platform fighter — enclosed stage, no ring-outs (training)",
    scene: "ScrambleScene",
    // ไม่มีหน้าเลือกตัวละคร: รอบนี้เป็นห้องซ้อม Nyx ปะทะหุ่น ตามที่ระบุไว้ใน SCRAMBLE_HANDOFF.md
    skipCharacterSelect: true,
    characterScaleMul: 1,
    allowDash: true,
    physics: {},
  },
};

export const DEFAULT_GAME_MODE = "normal";

export function getGameMode(key) {
  return GAME_MODES[key] ?? GAME_MODES[DEFAULT_GAME_MODE];
}
