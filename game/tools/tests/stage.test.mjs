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

// ── ห้าชั้นตามอาร์ต และทุกช่องต้องกระโดดถึงด้วยการกระโดดครั้งเดียว ──
//
// ถ้าช่องไหนกว้างเกินแรงกระโดด ชั้นนั้นจะไปถึงได้เฉพาะตอนมีดับเบิลจัมพ์เหลือ
// ซึ่งแปลว่าโดนไล่ต้อนอยู่แล้วหนีขึ้นไปไม่ได้ = ชั้นที่มีไว้ให้คนที่สบายอยู่แล้วเท่านั้น
{
  const { PHYS } = await import(G + "/core.js");
  ok(STAGE.platforms.length === 5, `มีห้าชั้น (${STAGE.platforms.length})`);

  const rise = (PHYS.jumpV ** 2) / (2 * PHYS.gravity);
  const tiers = [...new Set([STAGE.groundY, ...STAGE.platforms.map((p) => p.y)])].sort((a, b) => b - a);
  for (let i = 1; i < tiers.length; i++) {
    const gap = tiers[i - 1] - tiers[i];
    ok(gap > 0 && gap < rise, `ชั้น ${tiers[i - 1]} -> ${tiers[i]}: ช่อง ${gap} px (กระโดดขึ้นได้ ${Math.round(rise)})`);
  }

  // ชั้นบนสุดต้องแคบกว่าชั้นล่าง — ที่เสี่ยง ไม่ใช่ที่ปลอดภัย
  const top = STAGE.platforms.reduce((a, p) => (p.y < a.y ? p : a));
  const low = STAGE.platforms.reduce((a, p) => (p.y > a.y ? p : a));
  ok(top.x2 - top.x1 < low.x2 - low.x1,
    `ชั้นบนสุดแคบกว่าชั้นล่างสุด (${top.x2 - top.x1} เทียบ ${low.x2 - low.x1} px)`);
}

// ── เส้นยืนของแพลตฟอร์มต้องอยู่ที่แถบหญ้า ไม่ใช่ยอดหินหลัง ──
//
// ผู้เล่นรายงานว่า "ต้องลงมาอีกนิด ให้เหยียบดิน" — ของเดิมยึดความกว้าง
// เลยไปเจอสันหินด้านหลังซึ่งสูงกว่าแถบหญ้าราว 40 px
{
  for (const [k, min] of [["plat_c", 80], ["plat_l", 80], ["plat_r", 50]]) {
    ok(meta[k].surface >= min,
      `${k}: เส้นยืนลงมาอยู่ที่แถบหญ้าแล้ว (แถว ${meta[k].surface} · ของเดิมอยู่ที่ราว ${Math.round(min / 1.7)})`);
  }
  // เทียบเป็นสัดส่วนของความสูงรูป ไม่ใช่เลขแถวดิบ — แต่ละชิ้นถูกย่อคนละอัตรา
  // สิ่งที่ต้องจับให้ได้คือ "เส้นไปอยู่ยอดหินบนสุด" ซึ่งจะทำให้สัดส่วนต่ำมาก
  for (const k of ["ground", "plat_c", "plat_l", "plat_r", "plat_top"]) {
    const f = meta[k].surface / meta[k].h;
    ok(f > 0.07, `${k}: เส้นยืนไม่ได้อยู่ยอดสุดของรูป (${(f * 100).toFixed(0)}% ของความสูง)`);
    ok(f < 0.6, `${k}: และไม่ได้ต่ำจนจมเข้าไปในก้อนหิน (${(f * 100).toFixed(0)}%)`);
  }
}

// ── พารัลแลกซ์: สามชั้นคนละอัตรา ทั้งแกนนอนและแกนตั้ง ──
//
// สองชั้นไม่พอ — หน้าผาสองข้างอยู่ใกล้กว่าเกาะบ้านลอยมาก อยู่ชั้นเดียวกันแล้วเลื่อนเท่ากัน
// ซึ่งอ่านเป็นฉากแบนไถล ความลึกเกิดจากความต่างของอัตรา ไม่ใช่จากการขยับ
{
  const num = (k, a) => +(scene.match(new RegExp(`${k}:\\s*\\{ x: ([\\d.]+), y: ([\\d.]+), pad: ([\\d.]+) \\}`))?.[a] ?? NaN);
  const sky = num('sky', 1), far = num('far', 1), near = num('near', 1);
  ok(Number.isFinite(sky) && Number.isFinite(far) && Number.isFinite(near), "มีครบสามชั้น");
  ok(sky < far && far < near, `อัตราไล่จากไกลไปใกล้ (ฟ้า ${sky} < ไกล ${far} < ใกล้ ${near})`);
  ok(near > sky * 4, `ชั้นใกล้สุดเลื่อนเร็วกว่าฟ้าอย่างน้อยสี่เท่า (${(near / sky).toFixed(1)} เท่า)`);

  // แรงพอจะมองเห็น — รอบแรกตั้งไว้ 0.018/0.055 แล้ววัดได้ว่าขยับแค่ 10-31 px ทั้งเวที
  ok(near * 640 > 90, `ชั้นใกล้ขยับได้ถึง ${Math.round(near * 640)} px ทั้งเวที — มากพอจะเห็น`);

  // แกนตั้งต้องมี และต้องช้ากว่าแกนนอนของชั้นเดียวกัน (จอเตี้ยกว่ากว้าง)
  for (const k of ['sky', 'far', 'near']) {
    ok(num(k, 2) > 0, `${k}: มีพารัลแลกซ์แกนตั้ง (${num(k, 2)})`);
    ok(num(k, 2) < num(k, 1), `${k}: แกนตั้งช้ากว่าแกนนอน`);
  }

  // ตัวขับคือตำแหน่งเฉลี่ยของสองคน ไม่ใช่กล้อง — เกมนี้กล้องนิ่งสนิท
  ok(/\(s\.p1\.x \+ s\.p2\.x\) \/ 2 - STAGE\.w \/ 2/.test(scene), "แกนนอนขับด้วยจุดกึ่งกลางระหว่างสองคน");
  // แกนตั้งต้องคิดจาก "สูงกว่าพื้นเท่าไหร่" และตัดค่าติดลบทิ้ง
  // ถ้าเลื่อนขึ้นเหนือเส้นฐานได้ ใต้หน้าผาจะโหว่ให้เห็นฟ้า
  ok(/Math\.max\(0, STAGE\.groundY - \(s\.p1\.y \+ s\.p2\.y\) \/ 2\)/.test(scene),
    "แกนตั้งคิดจากความสูงเหนือพื้น และไม่เคยติดลบ");
  // เมฆต้องไหลด้วยเลขเฟรมของ sim ไม่ใช่เวลาจริง ไม่งั้นสองเครื่องเห็นเมฆคนละที่
  ok(/Math\.sin\(s\.frame \*/.test(scene), "เมฆไหลด้วยเลขเฟรมของ sim ไม่ใช่เวลาจริง");
  // และต้องไม่เขียนอะไรกลับเข้า sim
  ok(!/_stepParallax[\s\S]{0,900}s\.(p1|p2)\.\w+\s*=/.test(scene), "พารัลแลกซ์ไม่เขียนอะไรกลับเข้า sim");

  // ชั้นที่เลื่อนเยอะต้องเผื่อขอบเยอะตามส่วน ไม่งั้นเลื่อนแล้วเห็นขอบภาพ
  ok(num('near', 3) > num('sky', 3), `ชั้นใกล้เผื่อขอบมากกว่าฟ้า (${num('near', 3)} > ${num('sky', 3)})`);
  ok(num('near', 3) * 1280 / 2 - 640 > near * 640,
    `ที่ว่างข้างละ ${Math.round(num('near', 3) * 1280 / 2 - 640)} px มากกว่าระยะเลื่อนสูงสุด ${Math.round(near * 640)} px`);
}
