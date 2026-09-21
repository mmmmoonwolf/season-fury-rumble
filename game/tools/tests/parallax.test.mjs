// ทดสอบพื้นหลังหลายชั้น (parallax) — level.parallaxLayers ใน MainGameScene._buildParallax()
// รัน: node tools/tests/parallax.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { MainGameScene } = await import(G + "/scenes/MainGameScene.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

function setup(level) {
  const scene = makeScene();
  scene.level = level;
  // _buildBackground() เรียก this._buildParallax() แบบ method call — scene เป็น plain object ไม่ใช่
  // instance ของ MainGameScene เลยต้องแปะเมธอดนี้ไว้ก่อน ไม่งั้น this.xxx() หาไม่เจอ
  scene._buildParallax = MainGameScene.prototype._buildParallax;
  return scene;
}

// ── สร้างภาพครบทุกชั้น ตามลำดับหลังสุด->หน้าสุด ──
{
  const level = {
    worldWidth: 2000,
    worldHeight: 900,
    parallaxLayers: [
      { key: "sky", scrollFactor: 0.2 },
      { key: "mid", scrollFactor: 0.5 },
      { key: "near", scrollFactor: 0.8 },
    ],
  };
  const scene = setup(level);
  MainGameScene.prototype._buildParallax.call(scene);
  ok(scene.parallaxImages.length === 3, "สร้างภาพครบ 3 ชั้นตาม parallaxLayers");
  ok(scene.log.filter((l) => l.startsWith("image:")).length === 3, "เรียก add.image 3 ครั้ง");
  ok(
    scene.parallaxImages[0].scrollFactor === 0.2 &&
      scene.parallaxImages[1].scrollFactor === 0.5 &&
      scene.parallaxImages[2].scrollFactor === 0.8,
    "แต่ละชั้นได้ scrollFactor ตรงตามที่ระบุ"
  );
}

// ── depth auto-increment เมื่อไม่ระบุ (หลังสุดอยู่ลึกสุด อยู่หลัง platform เสมอ -5 ถึง 0) ──
{
  const level = {
    worldWidth: 2000,
    worldHeight: 900,
    parallaxLayers: [{ key: "a", scrollFactor: 0.3 }, { key: "b", scrollFactor: 0.6 }, { key: "c", scrollFactor: 1 }],
  };
  const scene = setup(level);
  MainGameScene.prototype._buildParallax.call(scene);
  const depths = scene.parallaxImages.map((im) => im.depth);
  ok(depths[0] === -20 && depths[1] === -19 && depths[2] === -18, `depth ไล่จากหลังสุดอัตโนมัติ (ได้ ${depths})`);
  ok(depths.every((d) => d < -5), "ทุกชั้น parallax ยังอยู่หลัง platform/hazard เสมอ (depth < -5) เมื่อไม่ระบุเอง");
}

// ── ระบุ depth เองได้ (เช่น ชั้นหน้าสุดอยากให้บังตัวละคร) ──
{
  const level = {
    worldWidth: 2000,
    worldHeight: 900,
    parallaxLayers: [
      { key: "sky", scrollFactor: 0.2, depth: -20 },
      { key: "fg", scrollFactor: 1.2, depth: 50 }, // ชั้นหน้าสุด เร็วกว่าโลก + ตั้งใจให้บังตัวละคร (depth สูงกว่า HUD ยังไม่ถึง 90)
    ],
  };
  const scene = setup(level);
  MainGameScene.prototype._buildParallax.call(scene);
  ok(scene.parallaxImages[1].depth === 50, "ระบุ depth เองได้ ไม่ต้องพึ่ง auto-increment");
  ok(scene.parallaxImages[1].scrollFactor === 1.2, "scrollFactor > 1 ได้ (ชั้นหน้าสุด เคลื่อนไวกว่าโลก)");
}

// ── ชั้นที่เลื่อนช้ากว่าโลก (scrollFactor < 1) ต้องกว้างกว่า world เผื่อไม่เห็นขอบตอนกล้องแพนสุดทาง ──
{
  const level = {
    worldWidth: 2000,
    worldHeight: 900,
    parallaxLayers: [
      { key: "static", scrollFactor: 1 }, // เท่าโลกพอดี ไม่ต้องเผื่อ (เคลื่อนพร้อมโลกเป๊ะ)
      { key: "far", scrollFactor: 0.2 }, // ช้ากว่าโลกมาก ต้องเผื่อกว้างเยอะ
    ],
  };
  const scene = setup(level);
  MainGameScene.prototype._buildParallax.call(scene);
  ok(scene.parallaxImages[0].displayWidth === 2000, "scrollFactor 1 ไม่ต้องเผื่อความกว้างเลย (เท่า world เป๊ะ)");
  const expectedFar = 2000 + 2000 * 0.8 * 1.2 * 2; // slack ทั้งสองข้าง
  ok(scene.parallaxImages[1].displayWidth === expectedFar, `scrollFactor 0.2 เผื่อกว้างกว่า world มาก (ได้ ${scene.parallaxImages[1].displayWidth} คาดหวัง ${expectedFar})`);
  ok(scene.parallaxImages[1].displayWidth > scene.parallaxImages[0].displayWidth, "ชั้นที่ scroll ช้ากว่า ต้องกว้างกว่าชั้นที่เท่าโลกเสมอ");
}

// ── _buildBackground() dispatch ไปที่ _buildParallax() เมื่อแมพมี parallaxLayers (ไม่ทับกับ backgroundImage/useSolidBackground เดิม) ──
{
  const level = { worldWidth: 1600, worldHeight: 800, parallaxLayers: [{ key: "only", scrollFactor: 0.5 }] };
  const scene = setup(level);
  MainGameScene.prototype._buildBackground.call(scene);
  ok(scene.parallaxImages?.length === 1, "_buildBackground() เรียก _buildParallax() เมื่อแมพมี parallaxLayers");
  ok(scene.bgImage == null, "ไม่ได้ไปสร้าง bgImage ผ่านทาง backgroundImage/useSolidBackground เดิมซ้ำ");
}
{
  // แมพเดิมที่ไม่มี parallaxLayers ยังทำงานตามปกติ ไม่ถูกกระทบ
  const level = { worldWidth: 1600, worldHeight: 800, useSolidBackground: true, skyTopColor: 0x1e293b };
  const scene = setup(level);
  MainGameScene.prototype._buildBackground.call(scene);
  ok(scene.parallaxImages == null, "แมพที่ไม่มี parallaxLayers ไม่ถูกกระทบ ไม่มี parallaxImages เลย");
  ok(scene.bgImage != null, "useSolidBackground เดิมยังทำงานตามปกติ (bgImage ถูกสร้าง)");
}

// ── _setBackgroundSeason ไม่พังตอนแมพมี parallaxLayers (ไม่มี level.backgrounds ให้สลับ) ──
{
  const level = { worldWidth: 1600, worldHeight: 800, parallaxLayers: [{ key: "only", scrollFactor: 0.5 }] };
  const scene = setup(level);
  MainGameScene.prototype._buildBackground.call(scene);
  let threw = false;
  try {
    MainGameScene.prototype._setBackgroundSeason.call(scene, "summer");
  } catch (e) {
    threw = true;
  }
  ok(!threw, "_setBackgroundSeason ไม่พังเมื่อแมพมี parallaxLayers (ไม่มี level.backgrounds ก็ไม่เป็นไร)");
}

console.log("\nParallax: multi-layer backgrounds, per-layer scrollFactor/depth, auto width-padding for slow layers");
