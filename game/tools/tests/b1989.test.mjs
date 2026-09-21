// ทดสอบ B1989/Nyx — คอมโบ 5 จังหวะ + ดาชพุ่งตี (ปลดล็อกตีติดครบ 5 ภายใน 2 วิ), ท่าปีนบันไดของตัวเอง
// (ไม่ยืมท่าวิ่งเหมือนตัวละครอื่น), และยืนยันว่า W/A/S/D เดิน/กระโดด/กัน เหมือนตัวละครอื่นทุกตัว
// (v35: เคยมีท่าพิเศษผูกกับ A/S ค้าง+กระโดด และ D=ก้มหลบ แต่เอาออกแล้วตามที่ขอ)
// รัน: node tools/tests/b1989.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { ROSTER } = await import(G + "/entities/roster.js");
const { B1989 } = await import(G + "/entities/B1989.js");
const { KunJae } = await import(G + "/entities/KunJae.js");
const { BASIC_COMBO, FINISHER_WINDOW } = await import(G + "/config/combat.config.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const idle = { left: false, right: false, jumpPressed: false, upHeld: false, downHeld: false, attackPressed: false, blockHeld: false, skillPressed: 0 };

function setup(CharClass = B1989) {
  const scene = makeScene();
  const A = new CharClass(scene, 0, 0, 0);
  A.combat = { clearFor() {} };
  A.placeFeetAt(100, 100);
  return { scene, A };
}

// ── B1989 อยู่ในโรสเตอร์ ชื่อในเกม Nyx ตามที่ตกลง ──
{
  ok(ROSTER.b1989 === B1989, "ลงทะเบียนใน ROSTER แล้ว (คีย์ b1989)");
  ok(B1989.DISPLAY_NAME === "Nyx", "ชื่อในเกม Nyx");
}

// ── คอมโบเฉพาะตัว 5 จังหวะ ไม่กระทบตัวละครอื่น (ยังใช้ BASIC_COMBO ส่วนกลาง 3 จังหวะ, FINISHER_WINDOW 700) ──
{
  ok(B1989.BASIC_COMBO.length === 5, "Nyx มีคอมโบ 5 จังหวะ (ไม่ใช่ 3 เหมือนตัวละครอื่น)");
  ok(B1989.FINISHER_WINDOW === 2000, "หน้าต่างดาชพุ่งตี 2 วิ ตามที่ขอ (ส่วนกลางคือ 700ms)");
  const { A: K } = setup(KunJae);
  ok((K.constructor.BASIC_COMBO ?? BASIC_COMBO).length === 3, "KunJae ยังใช้คอมโบ 3 จังหวะส่วนกลางเหมือนเดิม ไม่ถูกกระทบ");
  ok((K.constructor.FINISHER_WINDOW ?? FINISHER_WINDOW) === 700, "KunJae ยังใช้ FINISHER_WINDOW ส่วนกลาง 700ms เหมือนเดิม");
}

// ── ตีติดครบ 5 ภายในเวลา -> ปลดล็อกดาชพุ่งตี กดตีต่อ (ปุ่มเดิม) = ดาชพุ่งตี ไม่ใช่วนกลับสแตบ 1 ──
{
  const { A } = setup();
  for (let i = 0; i < 5; i++) {
    A._startAttack();
    A.notifyHitLanded();
    A._finishAttack();
  }
  ok(A.finisherReady === true, "ตีติดครบ 5 -> finisherReady ปลดล็อก");
  ok(A.finisherTimer === 2000, "ตั้งเวลาปลดล็อกไว้ 2000ms พอดี");

  A._startAttack();
  ok(A.currentAttack?.name === "nyx_dash_finisher", "กดตีต่อภายในหน้าต่าง -> เข้าดาชพุ่งตี ไม่ใช่สแตบ 1");
  ok(A.currentAttack.damage === 17, "ดาชพุ่งตีดาเมจ 17 (สูงกว่าสแตบธรรมดา ~2.5 เท่า)");
  ok(A.currentAttack.knockbackX === 320 && A.currentAttack.hitstun === 340, "knockback/hitstun ของดาชพุ่งตีสูงกว่าสแตบปกติชัดเจน");
  ok(A._forcedAttackAnim == null, "onEnter เคลียร์ _forcedAttackAnim ไปแล้วหลังใช้");

  A._finishAttack();
  ok(A.comboStep === 0 && A.finisherReady === false && A.hitsLanded === 0, "ดาชพุ่งตีจบแล้ว รีเซ็ตคอมโบทั้งชุด ไม่ต่อจากจังหวะที่ค้างไว้");
}

// ── ตีติดครบ 5 แต่ไม่กดต่อจนหมดเวลา -> โอกาสดาชพุ่งตีหายไป กดตีใหม่ = สแตบ 1 ตามปกติ ──
{
  const { A } = setup();
  for (let i = 0; i < 5; i++) {
    A._startAttack();
    A.notifyHitLanded();
    A._finishAttack();
  }
  ok(A.finisherReady === true, "ปลดล็อกดาชพุ่งตีก่อน");
  A._tickComboTimers(2100); // เกิน 2000ms ไปแล้ว
  ok(A.finisherReady === false && A.hitsLanded === 0, "หมดเวลาแล้ว -> โอกาสดาชพุ่งตีหายไปเอง");

  A._startAttack();
  ok(A.currentAttack?.name === "nyx_stab1", "กดตีหลังหมดเวลา -> กลับไปสแตบ 1 ตามปกติ ไม่ใช่ดาชพุ่งตี");
}

// ── W/A/S/D เหมือนตัวละครอื่นทุกตัว: ไม่มีท่าพิเศษผูกกับปุ่มทิศแล้ว (v35 เอาออกตามที่ขอ) ──
{
  const { A } = setup();
  ok(A._pickSpecialJumpState({ aKeyDown: true }) === null, "Nyx ไม่มีท่ากระโดดพิเศษอีกต่อไป (ถือ A ก็คืน null เหมือนตัวละครอื่น)");
  ok(A._pickSpecialJumpState({ sKeyDown: true }) === null, "ถือ S ก็คืน null เหมือนกัน (S กลับไปเป็นปุ่มกันของทุกตัวละคร)");
  ok(A._tryGroundSpecial({ dKeyDown: true, dKeyPressed: true }) === false, "Nyx ไม่มีท่าก้มหลบพิเศษอีกต่อไป (กด D ก็คืน false เหมือนตัวละครอื่น)");
}
{
  // D เดินขวาได้ปกติเหมือนตัวละครอื่นทุกตัว ไม่ใช่ท่าก้มหลบอีกต่อไป
  const { A } = setup();
  A.handleMovement({ ...idle, right: true }, 16);
  ok(!A.isDodging() && A.body.velocity.x > 0, "กด D (right) -> เดินขวาได้ปกติเหมือนตัวละครอื่น ไม่เข้าท่าก้มหลบ");
}
{
  // กระโดดปกติ ไม่มีท่าพิเศษไม่ว่าจะถือ A/S ระหว่างกระโดดหรือไม่ก็ตาม
  // (ไม่เช็ค lastAnim === "b1989/jump" ตรง ๆ เพราะ stub นี้ body.blocked.down เป็น true ตายตัว ทำให้
  // ไหลต่อไปถึง "land" ในเฟรมเดียวกันเสมอ ดู climb_pit.test.mjs ที่เจอปัญหาเดียวกันมาก่อน — เช็คแค่ว่า
  // ไม่ใช่ jumpForward/jumpSpinBack ก็พอยืนยันว่าไม่มีท่าพิเศษถูกเลือกแล้ว)
  const { A } = setup();
  A.handleMovement({ ...idle, jumpPressed: true, left: true }, 16);
  ok(A.lastAnim !== "b1989/jumpForward" && A.lastAnim !== "b1989/jumpSpinBack", `ถือ A (left) + กระโดด -> ไม่มีท่าพิเศษถูกเลือก (ได้ ${A.lastAnim})`);
}

// ── S กลับไปเป็นปุ่มกันของทุกตัวละครเหมือนเดิม (ไม่ใช่ปุ่มเสริมของ Nyx อีกต่อไป) ──
{
  const { A } = setup();
  A.handleMovement({ ...idle, blockHeld: true }, 16);
  ok(A.isBlocking(), "Nyx กันด้วย blockHeld เหมือนตัวละครอื่นทุกตัว (คีย์ S ผูกกับ blockHeld ใน MainGameScene ไม่ใช่ B1989.js)");
}

// ── ปีนบันไดของตัวเอง — มีท่าเฉพาะ ไม่ยืมท่าวิ่งเหมือนตัวละครอื่น ──
{
  const { A } = setup();
  A.startClimb({ x: A.x, topY: 0, bottomY: 200 });
  ok(A.lastAnim === "b1989/climb", `Nyx เล่นท่าปีนของตัวเอง (ได้ ${A.lastAnim})`);
}
{
  const { A } = setup(KunJae);
  A.startClimb({ x: A.x, topY: 0, bottomY: 200 });
  ok(A.lastAnim === "kunjae/run", `ตัวละครอื่นยังยืมท่าวิ่งเหมือนเดิม ไม่ถูกกระทบ (ได้ ${A.lastAnim})`);
}

console.log("\nB1989/Nyx: 5-hit combo + dash finisher, standard W/A/S/D (no special jump/dodge keys), own climb anim");
