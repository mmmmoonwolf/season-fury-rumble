// ทดสอบกลไกใหม่: ปีนบันได (Player climb state) + เหวมีดาเมจ (MainGameScene._checkPitHazard)
// รัน: node tools/tests/climb_pit.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { ROSTER } = await import(G + "/entities/roster.js");
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");
const { PHYSICS } = await import(G + "/config/physics.config.js");
const { NEON_UNDERLINE_BANGKOK } = await import(G + "/levels/neon-underline-bangkok.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const idle = { left: false, right: false, jumpPressed: false, upHeld: false, downHeld: false, attackPressed: false, blockHeld: false, skillPressed: 0 };

function setup(level) {
  const scene = makeScene();
  for (const m of ["_applyDamage", "_setPlayerHp", "_checkLadderEntry", "_checkPitHazard"]) scene[m] = MainGameScene.prototype[m];
  const labels = [];
  scene.showFloatLabel = (p, t) => labels.push(t);
  scene.level = level;
  const A = new ROSTER.kunjae(scene, 0, 0, 0);
  A.combat = { clearFor() {} };
  scene.hp = new Map([[A, 200]]);
  scene.playerAlive = new Map([[A, true]]);
  scene.gameOver = false;
  return { scene, A, labels };
}

// ── ปีนบันได: เข้าโซน + กดขึ้นค้าง -> ไต่ขึ้นจนถึงปลายบน -> ออกจากโหมดปีนเอง ──
// (stub ไม่มี physics step จริง — setVelocityY ไม่ขยับตำแหน่งเอง จึงจำลองว่า "ไต่มาจนเกือบถึงปลาย" ด้วย placeFeetAt ตรงๆ)
{
  const zone = { x: 300, width: 70, topY: 400, bottomY: 600 };
  const { scene, A } = setup({ ladders: [zone], pits: [] });
  A.placeFeetAt(zone.x, (zone.topY + zone.bottomY) / 2);
  ok(!A.isClimbing(), "ยังไม่ปีนตอนแรก (ต้องกดขึ้น/ลงก่อน)");

  scene._checkLadderEntry(A, { ...idle, upHeld: true });
  ok(A.isClimbing(), "อยู่ในโซน + กดขึ้นค้าง -> เริ่มปีน");
  ok(Math.abs(A.x - zone.x) < 1, "ล็อกแนวนอนไว้กลางบันได");

  // ไต่ถึงปลายบนแล้ว — ตั้ง body.bottom ตรงๆ (stub: bottom = y+90) เพราะ placeFeetAt คำนวณผ่าน scale
  // ของตัวละครแต่ละตัว (ไม่ตรง feetY เป๊ะในสภาพจำลองนี้) ตัวเกมจริงไม่มีปัญหานี้ (Arcade body จริง)
  A.y = zone.topY - 90;
  A.handleMovement({ ...idle, upHeld: true }, 16);
  ok(!A.isClimbing(), "ถึงปลายบนแล้วออกจากโหมดปีนเอง");
}

// ── ปีนลง: กดลงค้างจนถึงปลายล่าง ──
{
  const zone = { x: 300, width: 70, topY: 400, bottomY: 600 };
  const { scene, A } = setup({ ladders: [zone], pits: [] });
  A.placeFeetAt(zone.x, (zone.topY + zone.bottomY) / 2);
  scene._checkLadderEntry(A, { ...idle, downHeld: true });
  ok(A.isClimbing(), "กดลงค้างในโซนบันได -> เริ่มปีนเหมือนกัน");
  A.placeFeetAt(zone.x, zone.bottomY); // ไต่ถึงปลายล่างแล้ว
  A.handleMovement({ ...idle, downHeld: true }, 16);
  ok(!A.isClimbing(), "ถึงปลายล่างแล้วออกจากโหมดปีนเอง");
}

// ── หลุดบันไดกลางทาง: กดกระโดดออกจากบันได ──
{
  const zone = { x: 300, width: 70, topY: 400, bottomY: 600 };
  const { scene, A } = setup({ ladders: [zone], pits: [] });
  A.placeFeetAt(zone.x, (zone.topY + zone.bottomY) / 2);
  scene._checkLadderEntry(A, { ...idle, upHeld: true });
  ok(A.isClimbing(), "เริ่มปีน");
  A.handleMovement({ ...idle, jumpPressed: true }, 16);
  // stub: body.blocked.down เป็น true ตายตัว ท่า "jump" เลยข้ามไป "land" ทันทีในเฟรมเดียวกัน (ปกติของ stub นี้)
  ok(!A.isClimbing(), "กดกระโดดกลางบันได -> หลุดออกจากโหมดปีนทันที");
  ok(A.body.velocity.y < 0, "มีแรงเด้งขึ้น (โดดหลบออกจากบันได)");
}

// ── ไม่อยู่ในระยะ x ของบันได -> กดขึ้นก็ไม่ปีน ──
{
  const zone = { x: 300, width: 70, topY: 400, bottomY: 600 };
  const { scene, A } = setup({ ladders: [zone], pits: [] });
  A.placeFeetAt(zone.x + 500, (zone.topY + zone.bottomY) / 2); // ไกลจากบันไดมาก
  scene._checkLadderEntry(A, { ...idle, upHeld: true });
  ok(!A.isClimbing(), "อยู่นอกระยะบันได กดขึ้นก็ไม่เข้าโหมดปีน");
}

// ── โดนตีระหว่างปีน -> หลุดโหมดปีนทันที (คืนแรงโน้มถ่วง) ──
{
  const zone = { x: 300, width: 70, topY: 400, bottomY: 600 };
  const { scene, A } = setup({ ladders: [zone], pits: [] });
  A.placeFeetAt(zone.x, (zone.topY + zone.bottomY) / 2);
  scene._checkLadderEntry(A, { ...idle, upHeld: true });
  ok(A.isClimbing(), "เริ่มปีน");
  A.applyHit({ damage: 10, knockbackX: 100, knockbackY: -50, hitstun: 300 });
  ok(!A.isClimbing() && A.stateMachine.is("hitstun"), "โดนตีระหว่างปีน -> หลุดโหมดปีน เข้า hitstun ทันที");
}

// ── เหวกลาง: ตกถึงปากเหว -> เสีย 20% HP (trueDamage) + เด้งกลับขึ้น ──
{
  const pit = { x: 900, width: 200, y: 500, damagePercent: 0.2 };
  const { scene, A, labels } = setup({ ladders: [], pits: [pit] });
  A.placeFeetAt(pit.x + pit.width / 2, pit.y + 50); // เลยปากเหวลงไปแล้ว
  const hpBefore = scene.hp.get(A);
  scene._checkPitHazard(A, 16);
  ok(scene.hp.get(A) === hpBefore - 40, `เสีย HP 20% ของ 200 = 40 (เหลือ ${scene.hp.get(A)})`);
  ok(A.body.velocity.y < 0, "เด้งกลับขึ้น (velocity.y ติดลบ)");
  ok(labels.some((l) => l.includes("40")), "มีป้ายดาเมจลอยขึ้น");
}

// ── เหวกลาง: กันไว้ก็ยังโดนเต็ม (trueDamage ไม่สนการกัน) ──
{
  const pit = { x: 900, width: 200, y: 500, damagePercent: 0.2 };
  const { scene, A } = setup({ ladders: [], pits: [pit] });
  A.tryBlock = () => true;
  A.isBlocking = () => true;
  A.placeFeetAt(pit.x + pit.width / 2, pit.y + 50);
  scene._checkPitHazard(A, 16);
  ok(scene.hp.get(A) === 160, "trueDamage ทะลุการกัน เสียเต็ม 40 เหมือนไม่ได้กัน");
}

// ── เหวกลาง: มี grace period กันโดนซ้ำระหว่างลอยขึ้นผ่านโซนเดิม ──
{
  const pit = { x: 900, width: 200, y: 500, damagePercent: 0.2 };
  const { scene, A } = setup({ ladders: [], pits: [pit] });
  A.placeFeetAt(pit.x + pit.width / 2, pit.y + 50);
  scene._checkPitHazard(A, 16);
  const hpAfterFirst = scene.hp.get(A);
  scene._checkPitHazard(A, 16); // เฟรมถัดไปทันที ยังอยู่ในโซนเดิม
  ok(scene.hp.get(A) === hpAfterFirst, "เฟรมถัดไปยังอยู่ในเหว แต่ไม่โดนดาเมจซ้ำ (grace period)");
  scene._checkPitHazard(A, 700); // เวลาผ่านไปเกิน grace (600ms)
  ok(scene.hp.get(A) < hpAfterFirst, "หมด grace แล้วยังอยู่ในเหว -> โดนติ๊กใหม่ได้");
}

// ── นอกระยะ x ของเหว -> ไม่โดน ──
{
  const pit = { x: 900, width: 200, y: 500, damagePercent: 0.2 };
  const { scene, A } = setup({ ladders: [], pits: [pit] });
  A.placeFeetAt(pit.x - 300, pit.y + 50); // อยู่นอกช่วง x ของเหว
  scene._checkPitHazard(A, 16);
  ok(scene.hp.get(A) === 200, "อยู่นอกช่วง x ของเหว ไม่โดนดาเมจ");
}

// ── ยังไม่ตกถึงปากเหว (เท้ายังอยู่เหนือ pit.y) -> ไม่โดน ──
{
  const pit = { x: 900, width: 200, y: 500, damagePercent: 0.2 };
  const { scene, A } = setup({ ladders: [], pits: [pit] });
  A.placeFeetAt(pit.x + pit.width / 2, pit.y - 100); // ยังลอยอยู่เหนือปากเหว
  scene._checkPitHazard(A, 16);
  ok(scene.hp.get(A) === 200, "เท้ายังไม่ถึงปากเหว ไม่โดนดาเมจ");
}

// ── โครงสร้างแมพ Neon Underline Bangkok จริง — sanity check ──
{
  const L = NEON_UNDERLINE_BANGKOK;
  ok(L.platforms.length === 6 && L.ladders.length === 4 && L.pits.length === 1, "6 พื้น 4 บันได 1 เหว");
  ok(L.spawnPoints[0].floorY != null && L.spawnPoints[3].floorY != null, "spawn P1/P2 (index 0,3) ระบุ floorY ตรง (ไม่ต้องเดาจาก platform เพราะ x ซ้อนกันหลายชั้น)");
  const gaps = new Set();
  for (const L2 of L.ladders) gaps.add(L2.bottomY - L2.topY);
  ok([...gaps].every((g) => g <= 137), `ทุกบันไดเชื่อมต่างระดับ ${[...gaps].join(",")} ≤137 (กระโดดเดียวไหวถ้าจะทำ one-way เพิ่มทีหลัง)`);
  ok(Math.round(720 / L.worldHeight * 100) / 100 >= 0.9, `zoom ${Math.round(720 / L.worldHeight * 100) / 100} ยังไม่ทำให้ตัวละครเล็กลงเกิน 10%`);
}

console.log(`\nCLIMB_SPEED=${PHYSICS.CLIMB_SPEED}px/s`);
