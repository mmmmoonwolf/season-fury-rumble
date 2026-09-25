// ทดสอบการต่อแผ่นเอฟเฟคเข้ากับเกม
// รัน: node tools/tests/vfx.test.mjs   (จากโฟลเดอร์ game)
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const fs = await import("fs");
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const atlas = JSON.parse(read("../../assets/vfx/vfx.json"));
const scene = read("../../src/modes/scramble/ScrambleScene.js");
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { CHARACTERS } = await import(G + "/core.js");

// ── เฟรมครบทั้งสองใบ ──
{
  const want = ["slashWide", "slashThin", "slashSpin", "slashThrust", "slashLash", "slashChop",
    "slashRise", "slashCross", "star4", "burst", "crescent", "spike", "smokeBall", "smokeWisp",
    "dustFlat", "smokeCurl", "flame", "ember", "orb", "fireWisp", "ring", "glow", "streak", "diamond"];
  const missing = want.filter((k) => !atlas.frames[k + ".png"]);
  ok(missing.length === 0, `เฟรมครบ 24 อัน${missing.length ? " (ขาด " + missing.join(",") + ")" : ""}`);
  ok(Object.keys(atlas.frames).length === want.length,
    `ไม่มีเฟรมเกินมา (${Object.keys(atlas.frames).length})`);
  // เส้นตารางของใบรอยฟาดต้องถูกกัดทิ้ง ไม่งั้นจะเห็นเป็นเส้นจาง ๆ ตอนผสมแบบ ADD
  ok(/GUTTER = \d+/.test(read("../build_vfx.py")), "ตัวตัดกัดขอบช่องทิ้ง (ใบรอยฟาดมีเส้นตารางจริง)");
}

// ── รอยฟาดผูกกับ "ชื่อท่า" ไม่ใช่ต่อตัวละคร ──
//
// ทุกตัวใช้ชื่อท่าเดียวกันหมด ตารางกลางจึงครอบคลุมทั้งโรสเตอร์ได้ด้วยตารางเดียว
// ตัวที่อาวุธต่างจริง ๆ ค่อยเขียนทับเป็นรายตัว
{
  const def = scene.match(/const SLASH_DEFAULT = \{([\s\S]*?)\n\};/)?.[1] ?? "";
  for (const k of ["jab1", "jab2", "jab3", "side", "up", "down", "nair", "sair", "dair"])
    ok(new RegExp(`\\b${k}:`).test(def), `ตารางกลางครอบคลุม ${k}`);

  // ชื่อเฟรมที่อ้างในตารางต้องมีอยู่จริงใน atlas ทุกอัน
  const refs = [...scene.matchAll(/f: '(slash\w+)'/g)].map((m) => m[1]);
  const bad = [...new Set(refs)].filter((r) => !atlas.frames[r + ".png"]);
  ok(refs.length > 0 && bad.length === 0,
    `ชื่อเฟรมที่อ้างถึงมีจริงทุกอัน (${[...new Set(refs)].length} แบบ)${bad.length ? " เจอ " + bad.join(",") : ""}`);
}

// ── Alecto ต้องใช้รอยแส้ ไม่ใช่รอยดาบ และท่าปืนต้องไม่มีรอยฟาดเลย ──
{
  const al = scene.match(/slash: \{([\s\S]*?)\},\n    anims:/)?.[1] ?? "";
  ok(/jab1: \{ f: 'slashLash' \}/.test(al), "ท่าแส้ใช้รอยสะบัดยาว ไม่ใช่รอยดาบโค้ง");
  for (const g of ["gjab1", "gside", "gup", "gdown"])
    ok(new RegExp(`${g}: null`).test(al), `${g}: ท่าปืนไม่มีรอยฟาด — ปืนไม่ได้ฟาด มันยิง`);
  // และท่าปืนต้องมีอยู่จริงใน sim ไม่ใช่เขียนกันชื่อผิด
  ok(CHARACTERS.alecto.moves.gjab1 && CHARACTERS.alecto.moves.gside, "ชื่อท่าปืนตรงกับใน core.js");
}

// ── ขนาดรอยฟาดต้องยึดความกว้าง hitbox จริง ──
//
// รอยที่ใหญ่กว่าระยะที่โดนจริงคือการโกหกคนเล่น เขาจะอ่านระยะผิดทุกครั้งที่เห็น
{
  ok(/const reach = hb \? hb\.w : \d+/.test(scene), "อ่านความกว้าง hitbox มาใช้");
  ok(/scale: \(reach \/ \(src\?\.width \|\| \d+\)\)/.test(scene), "แปลงเป็นสเกลเทียบความกว้างเฟรมต้นฉบับ");
}

// ── ปล่อยรอยฟาดเฟรมเดียวต่อหนึ่งท่า ไม่ใช่ทุกเฟรมที่ยังอยู่ในท่า ──
{
  ok(/f\.phase\(\) === 'active' && rig\.lastSlash !== tag/.test(scene),
    "ปล่อยที่เฟรมแรกของช่วง active เท่านั้น");
  ok(/rig\.lastSlash = null;\s+\/\/ ออกจากท่าแล้วล้างตัวจำ/.test(scene),
    "ออกจากท่าแล้วล้างตัวจำ — ท่าเดิมซ้ำติด ๆ กันจึงปล่อยรอยฟาดทุกครั้ง");
}

// ── ควันต้องเป็น NORMAL ไม่ใช่ ADD ──
// ควันขาวบนฟ้าสว่างในโหมด ADD จะหายสนิท — เป็นกับดักที่เห็นก็ต่อเมื่อเปลี่ยนฉากเป็นกลางวันแล้ว
{
  for (const f of ["smokeBall", "smokeCurl", "dustFlat"]) {
    const m = scene.match(new RegExp(`emit\\('${f}'[\\s\\S]{0,400}?\\}\\)`));
    ok(m && /BlendModes\.NORMAL/.test(m[0]), `${f}: ใช้ NORMAL ไม่ใช่ ADD`);
  }
  ok(/setBlendMode\(o\.blend \?\? Phaser\.BlendModes\.ADD\)/.test(scene), "ค่าเริ่มต้นเป็น ADD (ของส่วนใหญ่คือแสง)");
}

// ── ชื่อเมธอดต้องไม่ชนกับพรอเพอร์ตี้ของอินสแตนซ์ ──
// `this.fx` เป็นอ็อบเจกต์ graphics อยู่แล้ว เมธอดชื่อซ้ำจะถูกทับเงียบ ๆ แล้วพังตอนรันเท่านั้น
{
  ok(/^\s{2}emit\(frame, x, y/m.test(scene), "เมธอดปล่อยอนุภาคชื่อ emit");
  ok(!/this\.fx\(/.test(scene), "ไม่มีที่ไหนเรียก this.fx() เป็นฟังก์ชัน");
  ok(/this\.fx = this\.add\.graphics\(\)/.test(scene), "และ this.fx ยังเป็น graphics ตามเดิม");
}

// ── อนุภาคต้องคืนเข้าพูล ไม่สร้างทิ้งทุกนัด ──
{
  ok(/this\._fxPool\.push\(f\.img\)/.test(scene), "หมดอายุแล้วคืนเข้าพูล");
  ok(/this\._fxPool\.pop\(\) \?\? this\.add\.image/.test(scene), "หยิบจากพูลก่อนค่อยสร้างใหม่");
}
