// ทดสอบการต่ออาร์ตเวทีเข้ากับพิกัดจริงของ sim
// รัน: node tools/tests/stage.test.mjs   (จากโฟลเดอร์ game)
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { STAGE, setStageWidth, STAGE_BASE_W } = await import(G + "/core.js");
const fs = await import("fs");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const meta = JSON.parse(read("../../assets/stage/stage.json"));
const scene = read("../../src/modes/scramble/ScrambleScene.js");

// ── ชิ้นเวทีต้องครบและมีเส้นยืนของตัวเอง ──
{
  const want = ["ground", "plat_c", "plat_l", "plat_r"];
  const missing = want.filter((k) => !meta[k]);
  ok(missing.length === 0, `ชิ้นเวทีครบ${missing.length ? " (ขาด " + missing.join(",") + ")" : ""}`);
  for (const k of want) {
    const m = meta[k];
    ok(m.surface > 0 && m.surface < m.h, `${k}: เส้นยืนอยู่ในรูป (แถว ${m.surface} จาก ${m.h})`);
  }
}

// ── เส้นยืนต้องไม่ใช่ขอบบนของรูป ──
//
// เสาหินรูนสูงกว่าตัวแพลตฟอร์ม และพื้นล่างวาดเป็นมุมเฉียงจนสันหินหลังสูงกว่าทางเดินหน้า
// ถ้ายึดขอบบนของรูป ตัวละครจะลอยเหนือพื้นที่เห็นว่ายืนอยู่หลายสิบพิกเซล
{
  ok(meta.ground.surface > meta.ground.h * 0.2,
    `พื้นล่างยึดทางเดินหน้า ไม่ใช่สันหินหลัง (แถว ${meta.ground.surface} จาก ${meta.ground.h})`);
  ok(meta.plat_c.surface > 10,
    `แพลตฟอร์มกลางยึดผิวหิน ไม่ใช่ยอดเสารูน (แถว ${meta.plat_c.surface})`);
}

// ── ฉากต้องวางชิ้นตามพิกัดของ sim ไม่ใช่พิกัดที่วาดไว้ในรูป ──
//
// ถ้าฮาร์ดโค้ดพิกัดจากรูป กรอบชนกับรูปจะไม่ตรงกันทันทีที่ใครปรับเลย์เอาต์แพลตฟอร์ม
// คนเล่นจะเห็นหินตรงหนึ่งแต่ยืนได้อีกตรงหนึ่ง ซึ่งเป็นความผิดพลาดที่ให้อภัยไม่ได้ในเกมแพลตฟอร์ม
{
  ok(/STAGE\.platforms\.forEach/.test(scene), "ฉากวนตาม STAGE.platforms ของ sim");
  ok(/\(p\.x2 - p\.x1\) \/ m\.w/.test(scene), "ย่อรูปให้กว้างเท่ากรอบชนจริง");
  ok(/p\.y - m\.surface \* sc/.test(scene), "วางให้ผิวบนของรูปตรงกับ p.y เป๊ะ");
  ok(/STAGE\.groundY - gm\.surface \* gs/.test(scene), "พื้นล่างก็ยึด groundY เหมือนกัน");
}

// ── ต้องมีทางถอยถ้าไฟล์เวทีโหลดไม่ขึ้น ──
// ปล่อยจอว่างแล้วคนเล่นไม่รู้ว่าพื้นอยู่ตรงไหน แย่กว่าฉากเมืองเดิมที่ดูเชย
{
  ok(/if \(!meta \|\| !this\.textures\.exists\('stageGround'\)\)[\s\S]{0,120}drawBackground/.test(scene),
    "โหลดไฟล์เวทีไม่ขึ้นแล้วตกกลับไปวาดฉากเดิม");
}

// ── จอกว้างขึ้นแล้วแพลตฟอร์มต้องยังอยู่กลางเวที ──
// รูปถูกวางจาก p.x1/p.x2 โดยตรง ถ้าค่าพวกนี้ไม่เลื่อนตาม รูปกับกรอบชนจะหลุดกันบนจอกว้าง
{
  setStageWidth(STAGE_BASE_W);
  const narrow = STAGE.platforms.map((p) => [p.x1, p.x2]);
  setStageWidth(1920);
  const wide = STAGE.platforms.map((p) => [p.x1, p.x2]);
  const shift = (1920 - STAGE_BASE_W) / 2;
  const moved = wide.every(([a, b], i) => a === narrow[i][0] + shift && b === narrow[i][1] + shift);
  ok(moved, `กว้างขึ้นแล้วแพลตฟอร์มเลื่อนเข้ากลางเท่ากันทุกอัน (+${shift} px)`);
  const sameW = wide.every(([a, b], i) => b - a === narrow[i][1] - narrow[i][0]);
  ok(sameW, "และความกว้างไม่เปลี่ยน — รูปจึงไม่ถูกยืดตามจอ");
  setStageWidth(STAGE_BASE_W);
}
