// ทดสอบการคิดขนาดผืนเกมตามสัดส่วนจอ (src/config/viewport.config.js)
// รัน: node tools/tests/viewport.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
//
// ทำไมต้องมี: อาการ "เล่นบนมือถือแล้วไม่เต็มจอ" มาจาก Scale.FIT รักษาสัดส่วนผืนเกมไว้
// ผืน 16:9 บนจอมือถือ 19.5:9 จึงเหลือแถบดำซ้ายขวาเกือบ 20% ของจอ
// เทสต์นี้ยืนยันว่าจอมือถือได้ผืนที่ตรงสัดส่วน (ไม่เหลือแถบ) และจอสุดขั้วไม่ทำเลย์เอาต์พัง
const G = new URL("../../src/config", import.meta.url).href;
const { gameWidthFor, GAME_HEIGHT, MIN_GAME_WIDTH, MAX_GAME_WIDTH } = await import(G + "/viewport.config.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
/** สัดส่วนแถบดำที่จะเหลือ หลัง FIT ย่อผืนเกมลงจอ */
const barPct = (w, h) => {
  const game = gameWidthFor(w, h) / GAME_HEIGHT;
  const screen = w / h;
  return (1 - Math.min(game, screen) / Math.max(game, screen)) * 100;
};

// ── มือถือแนวนอน: ต้องไม่เหลือแถบดำเลย ──
for (const [w, h, name] of [[2532, 1170, "iPhone 14"], [2400, 1080, "Android 20:9"], [2778, 1284, "iPhone Max"], [1920, 888, "มือถือ 19.5:9"]]) {
  ok(barPct(w, h) < 0.5, `${name} (${(w / h).toFixed(2)}:1) ไม่เหลือแถบดำ (${barPct(w, h).toFixed(1)}%)`);
}

// ── คอม 16:9 ต้องได้ 1280x720 เท่าเดิมเป๊ะ ไม่เปลี่ยนพฤติกรรมของเดิม ──
{
  ok(gameWidthFor(1920, 1080) === 1280, "จอ 16:9 ยังได้ผืน 1280 เท่าเดิม (เลย์เอาต์เดิมไม่ขยับ)");
  // 1366x768 ไม่ใช่ 16:9 เป๊ะ (1.7786) จึงได้ 1281 — ต่างกัน 1 px ไม่มีผลกับเลย์เอาต์
  ok(Math.abs(gameWidthFor(1366, 768) - 1280) <= 2, `โน้ตบุ๊ก 1366x768 ได้ผืนเท่าเดิมในทางปฏิบัติ (${gameWidthFor(1366, 768)})`);
  ok(GAME_HEIGHT === 720, "ความสูงยังคงที่ 720 — สเกลตัวละคร/HUD ทั้งเกมอิงค่านี้");
}

// ── จอเตี้ยกว่า 16:9 ไม่ยอมให้ผืนแคบกว่าที่ออกแบบไว้ ──
{
  ok(gameWidthFor(2048, 1536) === MIN_GAME_WIDTH, "แท็บเล็ต 4:3 ไม่ย่อผืนให้แคบกว่า 16:9 (เลย์เอาต์จะพัง)");
  ok(gameWidthFor(1080, 2400) === MIN_GAME_WIDTH, "ถือแนวตั้งก็ยังได้ผืน 16:9 ไม่ใช่ผืนแคบสูง");
}

// ── จอกว้างสุดขั้วมีเพดาน ──
{
  ok(gameWidthFor(5120, 1440) === MAX_GAME_WIDTH, `จอ ultrawide ชนเพดาน ${MAX_GAME_WIDTH} ไม่กว้างไปเรื่อย ๆ`);
  ok(gameWidthFor(10000, 720) === MAX_GAME_WIDTH, "จอกว้างเว่อร์ก็ยังอยู่ในเพดาน");
}

// ── ค่าพังตอนหน้ายังไม่ layout เสร็จ / แท็บถูกซ่อน ──
// ปล่อยให้ NaN ไหลเข้า Phaser = canvas ขนาด NaN แล้วจอดำสนิทโดยไม่มี error ให้เห็น
for (const [w, h, name] of [[0, 0, "ขนาด 0"], [NaN, NaN, "NaN"], [undefined, undefined, "undefined"], [800, 0, "สูงเป็น 0"]]) {
  const v = gameWidthFor(w, h);
  ok(Number.isFinite(v) && v >= MIN_GAME_WIDTH && v <= MAX_GAME_WIDTH, `${name} -> ได้ค่าที่ใช้ได้ ${v} ไม่ใช่ NaN`);
}

// ── ผลลัพธ์ต้องเป็นจำนวนเต็มเสมอ (canvas ขนาดทศนิยมทำให้ภาพเบลอ) ──
{
  const vals = [[2532, 1170], [2400, 1080], [1777, 1000]].map(([w, h]) => gameWidthFor(w, h));
  ok(vals.every(Number.isInteger), `ได้จำนวนเต็มเสมอ (${vals})`);
}

console.log("\nViewport: game canvas matches the device aspect so Scale.FIT leaves no bars on phones");
