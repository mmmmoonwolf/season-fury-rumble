// ทดสอบ B1989/Nyx — คอมโบ 5 จังหวะ + ดาชพุ่งตี (ปลดล็อกตีติดครบ 5 ภายใน 2 วิ), ท่ากระโดดพิเศษ
// (ถือ A/S), ท่าก้มหลบ (D), ท่าปีนบันไดของตัวเอง (ไม่ยืมท่าวิ่งเหมือนตัวละครอื่น)
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

// ── ท่ากระโดดพิเศษ: ถือ A = jumpForward, ถือ S = jumpSpinBack, ไม่ถืออะไร = jump ปกติ ──
// เช็ค _pickSpecialJumpState() ตรง ๆ (ไม่ผ่าน handleMovement เต็ม) เพราะ stub นี้ body.blocked.down
// เป็น true ตายตัว ทำให้ state "jump"/"jumpForward" ข้ามไป "land" ทันทีในเฟรมเดียวกันเสมอ (ดู
// climb_pit.test.mjs ที่เจอปัญหาเดียวกันมาก่อน) เช็ค method ตรง ๆ แม่นกว่าและไม่ติดข้อจำกัดของ stub
{
  const { A } = setup();
  ok(A._pickSpecialJumpState({ aKeyDown: true }) === "jumpForward", "ถือ A ค้าง + กระโดด -> jumpForward");
  ok(A._pickSpecialJumpState({ sKeyDown: true }) === "jumpSpinBack", "ถือ S ค้าง + กระโดด -> jumpSpinBack (S ว่างเพราะกันย้ายไป B แล้ว)");
  ok(A._pickSpecialJumpState({}) === null, "ไม่ถือปุ่มพิเศษ -> คืน null (ใช้ jump ปกติเหมือนตัวละครอื่น)");
  const { A: K } = setup(KunJae);
  ok(K._pickSpecialJumpState({ aKeyDown: true }) === null, "ตัวละครอื่น (KunJae) ไม่มีท่ากระโดดพิเศษ -> คืน null เสมอ");
}
{
  // double jump (จั๊มพ์ที่ 2) ไม่เข้าท่าพิเศษแม้ถือ A/S ค้างอยู่ — handleMovement เช็คเฉพาะกระโดดครั้งแรก
  // (jumpsUsed === 0) เท่านั้นก่อนเรียก _pickSpecialJumpState ดู Player.js บรรทัดที่เรียกใช้
  const { A } = setup();
  A.jumpsUsed = 1; // จำลองว่าใช้จั๊มพ์แรกไปแล้ว (ครั้งนี้คือ double jump)
  // หมายเหตุ: ไม่เช็ค jumpsUsed หลังจากนี้ เพราะ stub body.blocked.down เป็น true ตายตัว ทำให้ทันที
  // ที่กระโดด สถานะจะไหลต่อไปถึง "land" ในเฟรมเดียวกัน ซึ่ง onEnter ของ "land" รีเซ็ต jumpsUsed=0 เอง
  // (พฤติกรรมจริงในเกมไม่เป็นแบบนี้ เพราะ physics จริงใช้เวลาก่อนจะแตะพื้นอีกครั้ง)
  A.handleMovement({ ...idle, jumpPressed: true, aKeyDown: true }, 16);
  ok(A.lastAnim !== "b1989/jumpForward", `ดับเบิ้ลจั๊มพ์ไม่เข้าท่าพิเศษแม้ถือ A ค้างอยู่ (ได้ ${A.lastAnim})`);
}

// ── ท่าก้มหลบ (กด D) — จับเวลาแล้วคืนกลับเอง ไม่กินอินพุตค้างถ้าไม่ใช่ D ──
{
  const { A } = setup();
  A.handleMovement({ ...idle, dKeyDown: true, dKeyPressed: true, right: true }, 16);
  ok(A.stateMachine.is("dodge"), "กด D -> เข้าท่าก้มหลบทันที");
  ok(Math.abs(A.body.velocity.x) < 1, "ไม่เดินขวาไปด้วยทั้งที่ D ก็คือ moveRightKey (กินอินพุตเฟรมนี้แล้ว)");

  A.handleMovement({ ...idle }, 500); // เวลาผ่านไปเกิน DODGE_MS (400) แล้ว
  ok(!A.isDodging(), "ผ่านไปเกิน 400ms แล้ว -> คืนกลับ idle/run เอง");
}
{
  const { A } = setup();
  A.handleMovement({ ...idle, right: true }, 16); // ไม่ใช่ D (จำลองลูกศรขวา) -> เดินขวาได้ปกติ
  ok(!A.isDodging() && A.body.velocity.x > 0, "ไม่ได้กด D (แค่ right เฉย ๆ) -> เดินขวาได้ปกติ ไม่เข้าท่าก้มหลบ");
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

console.log("\nB1989/Nyx: 5-hit combo + dash finisher, jumpForward/jumpSpinBack, dodge(D), own climb anim");
