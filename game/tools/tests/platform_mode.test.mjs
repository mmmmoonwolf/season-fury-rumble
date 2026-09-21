// ทดสอบระบบใหม่: โหมดเกม (GAME_MODES) — เลือกจากล็อบบี้ ตัวคูณ physics ต่อโหมด, ปิดดับเบิลแท็ปวิ่งเร็ว,
// ย่อขนาดตัวละคร 60% (รวมร่างแปลงด้วย), และโครงสร้างแมพใหม่ sakura-heights.js (fall-free)
// รัน: node tools/tests/platform_mode.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { ROSTER } = await import(G + "/entities/roster.js");
const { Oat } = await import(G + "/entities/Oat.js");
const { GAME_MODES, DEFAULT_GAME_MODE, getGameMode } = await import(G + "/config/mode.config.js");
const { applySeasonModifiers, BASE_PHYSICS, PHYSICS } = await import(G + "/config/physics.config.js");
const { SAKURA_HEIGHTS } = await import(G + "/levels/sakura-heights.js");
const { NEON_UNDERLINE_BANGKOK } = await import(G + "/levels/neon-underline-bangkok.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const idle = { left: false, right: false, jumpPressed: false, upHeld: false, downHeld: false, attackPressed: false, blockHeld: false, skillPressed: 0 };

// ── mode.config.js: ค่าคงที่ตรงตามไอเดียผู้ใช้ ──
{
  ok(GAME_MODES.normal.characterScaleMul === 1 && GAME_MODES.normal.allowDash === true, "โหมดปกติไม่ปรับอะไรเลย");
  ok(GAME_MODES.platform.characterScaleMul === 0.6, "โหมด platform ย่อตัวละคร 60% ตามที่ขอ");
  ok(GAME_MODES.platform.allowDash === false, "โหมด platform ปิดดับเบิลแท็ปวิ่งเร็ว");
  ok(GAME_MODES.platform.physics.DOUBLE_JUMP_VELOCITY < 1, "โหมด platform ลดระยะดับเบิ้ลจั๊มพ์");
  ok(getGameMode("ไม่มีจริง").id === DEFAULT_GAME_MODE, "getGameMode คีย์ไม่รู้จัก -> fallback โหมดปกติ");
}

// ── physics.config.js: applySeasonModifiers คูณ season x mode อิสระต่อกัน ──
{
  applySeasonModifiers("spring", {}); // reset baseline
  ok(PHYSICS.RUN_SPEED === BASE_PHYSICS.RUN_SPEED, "spring + ไม่มี mode modifier = ค่าฐานเป๊ะ");

  applySeasonModifiers("spring", GAME_MODES.platform.physics);
  ok(
    Math.abs(PHYSICS.RUN_SPEED - BASE_PHYSICS.RUN_SPEED * 0.78) < 0.01,
    `spring + platform mode คูณ RUN_SPEED ด้วย 0.78 (ได้ ${PHYSICS.RUN_SPEED})`
  );

  applySeasonModifiers("winter", GAME_MODES.platform.physics);
  const expectedJump = BASE_PHYSICS.JUMP_VELOCITY * 0.95 * 1; // winter ปรับ JUMP_VELOCITY, platform mode ไม่ยุ่งกับ JUMP_VELOCITY (แค่ double jump)
  ok(Math.abs(PHYSICS.JUMP_VELOCITY - expectedJump) < 0.01, "ฤดูหนาว + platform mode คูณร่วมกันได้ถูกต้อง (ฤดูคุม jump, โหมดคุม double jump คนละคีย์)");

  applySeasonModifiers("spring", {}); // คืนค่าฐานให้เทสต่อไปไม่กระทบกัน
}

// ── Player._updateDash: โหมด platform (allowDash:false) กดดับเบิลแท็ปแล้วไม่วิ่งเร็ว ──
{
  const scene = makeScene();
  scene.modeConfig = GAME_MODES.platform;
  const A = new ROSTER.kunjae(scene, 0, 0, 0);
  A.combat = { clearFor() {} };
  A.placeFeetAt(100, 100);

  A.handleMovement({ ...idle, right: true }, 16);
  A.handleMovement({ ...idle }, 16); // ปล่อยปุ่ม
  A.handleMovement({ ...idle, right: true }, 16); // แท็ปที่ 2 ภายในเวลา — ปกติจะดับเบิลแท็ป
  ok(A._dashing !== true, "โหมด platform: ดับเบิลแท็ปทิศเดิมไม่ทำให้ _dashing เป็น true");

  const scene2 = makeScene();
  scene2.modeConfig = GAME_MODES.normal;
  const B = new ROSTER.kunjae(scene2, 0, 0, 0);
  B.combat = { clearFor() {} };
  B.placeFeetAt(100, 100);
  B.handleMovement({ ...idle, right: true }, 16);
  B.handleMovement({ ...idle }, 16);
  B.handleMovement({ ...idle, right: true }, 16);
  ok(B._dashing === true, "โหมดปกติ: ดับเบิลแท็ปทิศเดิมยังวิ่งเร็วได้เหมือนเดิม (ไม่กระทบของเดิม)");
}

// ── ย่อขนาดตัวละคร 60%: targetWorldHeight ที่ MainGameScene._spawnPlayer จะส่งให้ constructor ──
{
  const scene = makeScene();
  scene.modeConfig = GAME_MODES.platform;
  const { kunjae: KunJae } = ROSTER;
  const scaleMul = scene.modeConfig.characterScaleMul;
  const A = new KunJae(scene, 0, 0, 0, KunJae.WORLD_HEIGHT * scaleMul);
  ok(
    Math.abs(A._scaleArgs.targetWorldHeight - KunJae.WORLD_HEIGHT * 0.6) < 0.01,
    `ตัวละครถูกสร้างด้วยความสูง 60% ของ WORLD_HEIGHT เดิม (${A._scaleArgs.targetWorldHeight} vs ${KunJae.WORLD_HEIGHT * 0.6})`
  );
}

// ── ร่างแปลง (Oat -> Titan) ต้องสเกลตามร่างเดิมที่ถูกย่อไว้ด้วย ไม่กระโดดกลับไปไซส์เต็ม ──
{
  const scene = makeScene();
  scene.modeConfig = GAME_MODES.platform;
  const scaleMul = 0.6;
  const A = new Oat(scene, 0, 0, 0, Oat.WORLD_HEIGHT * scaleMul);
  A.combat = { clearFor() {} };
  A.placeFeetAt(100, 100);
  const beforeSwapHeight = A._scaleArgs.targetWorldHeight;
  ok(Math.abs(beforeSwapHeight - Oat.WORLD_HEIGHT * scaleMul) < 0.01, "Oat ร่างเดิมถูกย่อ 60% ตามโหมด platform");

  A._swapToAlt();
  const expectedAltHeight = Oat.FORM_ALT.worldHeight * scaleMul;
  ok(
    Math.abs(A._scaleArgs.targetWorldHeight - expectedAltHeight) < 0.5,
    `แปลงร่างเป็นไททันแล้ว ยังคงสัดส่วน 60% ไว้ (ได้ ${A._scaleArgs.targetWorldHeight} คาดหวัง ${expectedAltHeight})`
  );
}

// ── โครงสร้างแมพ Sakura Heights (โหมด platform, v2 — มีอาร์ตจริงแล้ว 1264x848) — sanity check ──
{
  const L = SAKURA_HEIGHTS;
  ok(L.worldWidth === 1264 && L.worldHeight === 848, "ขนาด world ตรงกับภาพจริงที่ผู้ใช้ส่งมา (1264x848)");
  ok(L.backgroundImage === "sakura_heights" && L.backgroundExt === "jpg", "ใช้อาร์ตจริงแล้ว (ไม่ใช่ blockout สีเรียบ)");
  ok(L.pits.length === 0, "fall-free ตามไอเดียต้นฉบับ — ไม่มี pit เลย");
  ok(L.platforms.length === 3 && L.ladders.length === 3, "3 ชั้น 3 บันได");
  ok(L.platforms[0].width === L.worldWidth && L.platforms[1].width === L.worldWidth, "ชั้นล่าง+กลางเต็มความกว้างจอ (เดินสุดขอบไม่ตก)");
  const top = L.platforms.find((p) => p.kind === "high");
  ok(top.width < L.worldWidth && top.x > 0 && top.x + top.width < L.worldWidth, "ชั้นบนลอยกลางจอเท่านั้น ซ้าย-ขวาเปิดโล่ง");
  ok(L.ladders.every((l) => l.bottomY > l.topY), "ทุกบันไดมีทิศขึ้น-ลงถูกต้อง");
  ok(L.spawnPoints[0].floorY != null && L.spawnPoints[3].floorY != null, "spawn P1/P2 ระบุ floorY ตรง");
}

// ── Neon Underline Bangkok ยังใช้ได้ปกติ แค่ย้ายไปอยู่โหมด platform (ไม่ได้แก้โครงสร้างแมพ) ──
{
  ok(NEON_UNDERLINE_BANGKOK.ladders.length === 4 && NEON_UNDERLINE_BANGKOK.pits.length === 1, "โครงสร้างเดิมยังอยู่ครบ ไม่ถูกแก้ตอนย้ายโหมด");
}

console.log("\nPlatform mode: normal=100%/dash-on, platform=60%/no-dash/speed-78%/doublejump-82%");
