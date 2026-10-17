// ทดสอบการต่อแผ่นเอฟเฟคเข้ากับเกม
// รัน: node tools/tests/vfx.test.mjs   (จากโฟลเดอร์ game)
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const fs = await import("fs");
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const atlas = JSON.parse(read("../../assets/vfx/vfx.json"));
const scene = read("../../src/modes/scramble/ScrambleScene.js");
const G = new URL("../../src/modes/scramble", import.meta.url).href;

/** ตัดเนื้อเมธอดจากซอร์ส — ถึง "\n  }" ตัวแรกซึ่งคือท้ายเมธอดระดับคลาส
 *  เคยตัดด้วยการนับตัวอักษร (+1500) แล้วพอโค้ดยาวขึ้นก็ตัดครึ่งเมธอด เทสต์แดงทั้งที่ของถูก */
const methodBody = (name) => {
  const i = scene.indexOf(`  ${name}(`);
  return i < 0 ? "" : scene.slice(i, scene.indexOf("\n  }", i) + 4);
};

const { CHARACTERS } = await import(G + "/core.js");

// ── เฟรมครบทั้งสองใบ ──
{
  const want = ["slashWide", "slashThin", "slashSpin", "slashThrust", "slashLash", "slashChop",
    "slashRise", "slashCross", "star4", "burst", "crescent", "spike", "smokeBall", "smokeWisp",
    "dustFlat", "smokeCurl", "flame", "ember", "orb", "fireWisp", "ring", "glow", "streak", "diamond",
    // ใบที่ตัดด้วยการหาก้อน ไม่ใช่หารช่อง — อัลติของ KUNJAE (หนามผุดจากพื้น)
    "tailRise1", "tailRise2", "tailRise3", "tailRise4", "soilBurst1", "soilBurst2", "soilBurst3"];
  const missing = want.filter((k) => !atlas.frames[k + ".png"]);
  ok(missing.length === 0, `เฟรมครบ ${want.length} อัน${missing.length ? " (ขาด " + missing.join(",") + ")" : ""}`);
  ok(Object.keys(atlas.frames).length === want.length,
    `ไม่มีเฟรมเกินมา (${Object.keys(atlas.frames).length})`);

  // สี่ระยะของหนามต้อง **สูงไล่ขึ้น** ไม่ใช่สูงเท่ากัน
  // ตัวตัดย่อทีละใบให้ด้านยาว = MAX_SIDE ซึ่งทำให้ทุกระยะสูง 320 เท่ากันหมด
  // แล้วมันจะไม่ใช่หนามที่ค่อย ๆ โผล่อีกต่อไป — ใบนี้จึงย่อด้วยสเกลเดียวทั้งกลุ่ม
  const h = (n) => atlas.frames[n + ".png"].frame.h;
  ok(h("tailRise1") < h("tailRise2") && h("tailRise2") < h("tailRise3"),
    `หนามสี่ระยะสูงไล่ขึ้นจริง (${[1,2,3,4].map((i) => h("tailRise" + i)).join(" -> ")})`);
  const w = (n) => atlas.frames[n + ".png"].frame.w;
  ok(w("soilBurst1") < w("soilBurst2") && w("soilBurst2") < w("soilBurst3"),
    `ดินแตกสามระยะกว้างไล่ออกจริง (${[1,2,3].map((i) => w("soilBurst" + i)).join(" -> ")})`);
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

// ── KUNJAE: ท่าปืนต้องไม่มีรอยฟาดเลย · สองสกิลที่ใช้หางต้องเป็นรอยสะบัดยาว ──
//
// **รีเวิร์ครอบสาม** ปืนเป็นท่าปกติทั้งชุดแล้ว รอยฟาดจึงเหลือแค่สองสกิลที่ใช้หางจริง
// ปืนไม่ได้ฟาด มันยิง — กระสุนเป็นตัวบอกอยู่แล้ว ใส่รอยฟาดทับเข้าไปคืออ่านผิด
{
  // ตัดเอาเฉพาะบล็อก slash ของเธอ — ปิดที่ `\n    },` ของตัวเอง ไม่ใช่ไล่ไปจนเจอ `anims:`
  // (เคยผูกกับ `anims:` แล้วพอมีคอมเมนต์มาคั่นสองบรรทัด regex ก็หาไม่เจอแล้วคืนสตริงว่าง
  //  ซึ่งทำให้ทุกข้อในบล็อกนี้แดงพร้อมกันโดยที่ของจริงไม่ได้พัง)
  const al = scene.slice(scene.indexOf("slash: {", scene.indexOf("alecto: {")))
    .match(/^slash: \{([\s\S]*?)\},\n/)?.[1] ?? "";
  // **ไม่มีรอยฟาดเลยสักท่า** ท่าปืนไม่ได้ฟาด กระสุนเป็นตัวบอกอยู่แล้ว
  // ส่วนสามท่าหาง ชีตดีไซน์ใหม่มีหางอยู่ในเฟรมจริงแล้ว วาดรอยสะบัดทับอีกจะเป็นหางสองเส้น
  // (เคยมีรอยสะบัดตอนที่สามท่านี้ยังยืมเฟรมแส้ของตัวละครเก่าอยู่)
  for (const g of ["hook1", "slam1", "quill1",
                   "jab1", "side", "up", "down", "nair", "sair", "dair"])
    ok(new RegExp(`\\b${g}: null`).test(al), `${g}: ไม่มีรอยฟาดวาดทับ`);
  // และชื่อท่าต้องมีอยู่จริงใน sim ไม่ใช่เขียนกันชื่อผิด
  const miss = ["jab1", "side", "hook1", "slam1", "quill1"].filter((k) => !CHARACTERS.alecto.moves[k]);
  ok(miss.length === 0, `ชื่อท่าในตารางรอยฟาดตรงกับใน core.js (${miss.join(",") || "ครบ"})`);
}

// ── ขนาดรอยฟาดต้องยึดความกว้าง hitbox จริง ──
//
// รอยที่ใหญ่กว่าระยะที่โดนจริงคือการโกหกคนเล่น เขาจะอ่านระยะผิดทุกครั้งที่เห็น
{
  ok(/const reach = hb \? hb\.w : \d+/.test(scene), "อ่านความกว้าง hitbox มาใช้");
  // เดิมเช็กข้อความ `scale: (reach / ...)` ตรง ๆ แล้วแดงทันทีตอนแยกเป็นตัวแปร `base`
  // ทั้งที่เจตนาไม่เปลี่ยน — เช็กว่า **สเกลทุกชั้นมาจาก base ที่คิดจาก reach** แทน
  ok(/const base = \(reach \/ \(src\?\.width \|\| \d+\)\)/.test(scene),
    "ฐานของสเกลคิดจากความกว้าง hitbox เทียบความกว้างเฟรมต้นฉบับ");
  const sf = methodBody("slashFor");
  const scales = [...sf.matchAll(/scale: ([^,]+),/g)].map((m) => m[1].trim());
  ok(scales.length >= 2 && scales.every((v) => v.startsWith("base")),
    `ทุกชั้นสเกลจาก base (${scales.join(" · ")})`);
}

// ── ปล่อยรอยฟาดเฟรมเดียวต่อหนึ่งท่า ไม่ใช่ทุกเฟรมที่ยังอยู่ในท่า ──
{
  ok(/f\.phase\(\) === 'active' && rig\.lastSlash !== tag/.test(scene),
    "ปล่อยที่เฟรมแรกของช่วง active เท่านั้น");
  ok(/rig\.lastSlash = null;\s+\/\/ ออกจากท่าแล้วล้างตัวจำ/.test(scene),
    "ออกจากท่าแล้วล้างตัวจำ — ท่าเดิมซ้ำติด ๆ กันจึงปล่อยรอยฟาดทุกครั้ง");
}

// ── ควันต้องเดินผ่าน puff() เท่านั้น และ puff() บังคับ NORMAL ให้เอง ──
//
// ควันขาวบนฟ้าสว่างในโหมด ADD จะหายสนิท — เป็นกับดักที่พลาดมาสามรอบในโปรเจกต์นี้
// เดิมเทสต์ไล่เช็ค `blend` ทีละจุดที่เรียก emit() ซึ่งแปลว่า **จุดใหม่ที่ลืมใส่ก็หลุดได้**
// ตอนนี้ควันทุกก้อนต้องเรียก puff() ซึ่งบังคับ NORMAL ไว้ในตัว = ลืมไม่ได้อีกแล้วโดยโครงสร้าง
{
  ok(/const NORM = Phaser\.BlendModes\.NORMAL;/.test(scene), "NORM = BlendModes.NORMAL");
  const helper = scene.slice(scene.indexOf("puff(frame, x, y, o = {})"), scene.indexOf("puff(frame, x, y, o = {})") + 700);
  ok(helper.length > 100, "มีตัวช่วย puff() อยู่จริง");
  ok((helper.match(/blend: NORM/g) ?? []).length >= 2,
    "puff() บังคับ NORMAL ทั้งชั้นเงาและชั้นขาว — ผู้เรียกลืมใส่ไม่ได้");
  // ควันขาวทึบต้องมีเงาอยู่หลัง ไม่งั้นได้ปื้นขาวแบน ๆ ที่ไม่มีรูปทรง
  ok(/tint: tone\.shade/.test(helper) && /tint: o\.hot \? tone\.hot : tone\.body/.test(helper),
    "วาดสองชั้น: เงาเทาอยู่หลัง + ก้อนขาวอยู่หน้า");

  for (const f of ["smokeBall", "smokeCurl", "smokeWisp", "dustFlat"]) {
    const viaPuff = [...scene.matchAll(new RegExp(`this\\.puff\\('${f}'`, "g"))].length;
    const viaEmit = [...scene.matchAll(new RegExp(`this\\.emit\\('${f}'`, "g"))].length;
    ok(viaPuff > 0, `${f}: วาดผ่าน puff() จริง (${viaPuff} จุด)`);
    ok(viaEmit === 0, `${f}: ไม่มีจุดไหนเรียก emit() ตรง ๆ (เจอ ${viaEmit})`);
  }
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
  // ตัวที่สร้างใหม่ต้องลงทะเบียนเป็นของในโลกด้วย ไม่งั้นกล้อง UI วาดซ้ำเป็นภาพซ้อน
  // (ตัวที่หยิบจากพูลลงทะเบียนไว้แล้วตั้งแต่ตอนสร้าง)
  ok(/this\._fxPool\.pop\(\) \?\? this\._world\(this\.add\.image/.test(scene), "หยิบจากพูลก่อนค่อยสร้างใหม่");
}

// ── ชื่อเฟรมที่ส่งเข้า emit() ต้องชี้ไปถึงเฟรมจริงในใบเอฟเฟค ──
//
// คีย์ในอัตลาส **พกนามสกุลมาด้วย** (`ring.png`) แต่ทุกที่ที่เรียกเขียนชื่อเปล่า (`emit('ring', ...)`)
// Phaser ไม่ throw เมื่อหาเฟรมไม่เจอ มันเตือนใน console แล้วคืน "เฟรมแรกของอัตลาส" มาแทน
// ผลคืออนุภาคทุกชนิดวาดเป็น slashWide.png อันเดียวกันหมด โดยเกมยังเดินได้ปกติและไม่มีอะไรฟ้อง
// (พลาดแบบเดียวกับ verify.py ที่แมตช์ "idle_1" แทน "idle_1.png")
{
  ok(/const key = frame\.endsWith\('\.png'\) \? frame : frame \+ '\.png';/.test(scene),
    "emit() เติมนามสกุลให้เองเมื่อผู้เรียกเขียนชื่อเปล่า");
  ok(!/this\.add\.image\(0, 0, 'vfx', frame\)/.test(scene) && !/setTexture\('vfx', frame\)/.test(scene),
    "ไม่มีที่ไหนส่ง frame ดิบเข้า texture โดยไม่ผ่านการเติมนามสกุล");

  // และชื่อที่เรียกจริงต้องมีอยู่ในใบ — ดักคำผิดไปในตัว
  //
  // บางที่ต่อเลขท้ายชื่อตอนเรียก (`emit('tailRise' + (k + 1), ...)`) ซึ่ง regex จับได้แค่
  // ส่วนหน้า จึงยอมรับ "ชื่อที่เป็นหัวของตระกูลเฟรมที่มีเลขต่อท้าย" ด้วย
  // ยังดักคำผิดได้อยู่ เพราะหัวที่สะกดผิดจะไม่มีเฟรมไหนขึ้นต้นด้วยมันเลย
  const frameNames = Object.keys(atlas.frames);
  const known = (n) => atlas.frames[n.endsWith(".png") ? n : n + ".png"]
    || frameNames.some((f) => new RegExp(`^${n}\\d+\\.png$`).test(f));
  const names = [...scene.matchAll(/(?:this\.)?emit\('([\w.]+)'/g)].map((m) => m[1]);
  const bad = [...new Set(names)].filter((n) => !known(n));
  ok(names.length > 10 && bad.length === 0,
    `ชื่อเฟรมที่ emit() เรียกมีจริงทุกอัน (${[...new Set(names)].length} แบบ)${bad.length ? " เจอ " + bad.join(",") : ""}`);
}

// ── emit() ต้องคืนจุดยึดกลางภาพทุกครั้งที่หยิบจากพูล ────────────────────────
//
// **บั๊กที่เคยมี**: ผู้เรียกบางรายตั้งจุดยึดเองหลัง emit (หนามของ KUNJAE ยึดโคนด้วย
// `setOrigin(0.5, 1)`) แล้วภาพนั้นถูกคืนเข้าพูลพร้อมจุดยึดที่เปลี่ยนไป
// อนุภาคตัวถัดไปที่หยิบมันไปใช้จะวาดเยื้องขึ้นครึ่งภาพโดยไม่มีอะไรฟ้อง
{
  const body = scene.slice(scene.indexOf("  emit(frame, x, y"));
  const head = body.slice(0, body.indexOf("this._fxLive.push"));
  ok(/setOrigin\(0\.5,\s*0\.5\)/.test(head),
    "emit() ตั้งจุดยึดกลางภาพให้ทุกครั้ง (กันจุดยึดค้างจากผู้เรียกคนก่อน)");
}

// ── อีเวนต์ที่ซิมปล่อยต้องมีคนวาดรับทุกตัว ──────────────────────────────────
//
// `emit()` ไม่ throw เมื่อหาเฟรมไม่เจอ และลูปอีเวนต์ก็ไม่บ่นเมื่อไม่มีสาขารับ
// อีเวนต์ที่เพิ่มในซิมแล้วลืมต่อฝั่งวาดจึงเงียบสนิท ไม่มีอะไรฟ้องเลยสักทาง
{
  const core = read("../../src/modes/scramble/core.js");
  const inSim = [...new Set([...core.matchAll(/type: *'(\w+)'/g)].map((m) => m[1]))];
  const drawn = new Set([...scene.matchAll(/e\.type === '(\w+)'/g)].map((m) => m[1]));
  // อีเวนต์ที่ตั้งใจไม่วาด: ใช้เก็บสถิติหรือส่งต่อให้ระบบอื่น ไม่ใช่ภาพ
  // `move` = เสียงหวดลม ต่ออยู่ที่ตัววาดตัวละคร (`_swingFor`) ไม่ใช่ที่ลูปอีเวนต์
  const NO_DRAW = new Set(['ko', 'matchEnd', 'roundStart', 'comboEnd', 'move']);
  const missing = inSim.filter((t) => !drawn.has(t) && !NO_DRAW.has(t));
  ok(missing.length === 0,
    `อีเวนต์ทุกตัวที่ซิมปล่อยมีสาขารับในฝั่งวาด${missing.length ? " — ขาด " + missing.join(", ") : ""}`);
  ok(drawn.has('flurry'), "อีเวนต์หมัดรัวของอัลติ MARCH มีคนวาดรับ");
}

// ══ บิดท่าตามจังหวะ — ให้ภาพนิ่งสามเฟรมอ่านเป็นการเคลื่อนไหว ═══════════════════
//
// สไปรท์เรามีสามเฟรมต่อท่า (เงื้อ/สุดแขน/ชักกลับ) ซึ่งอ่านเป็นสไลด์ ไม่ใช่การเคลื่อนไหว
// ตัวนี้เติมน้ำหนักโดยแปลงภาพเดิม **ไม่เพิ่มอาร์ตสักเฟรม**
{
  globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  await import("./phaser_stub.mjs");
  const { poseWarp } = await import(G + "/ScrambleScene.js");
  const mk = (m, n) => ({
    state: "attack", move: m, moveF: n, hitstop: 0, onGround: true, stateF: 0, vy: 0,
    phase: () => (n < m.startup ? "startup" : n < m.startup + m.active ? "active" : "recovery"),
  });
  const jab = CHARACTERS.helios.moves.jab1;

  // ยืนเฉย ๆ ต้องไม่บิดเลย ไม่งั้นตัวเอียงค้างตลอดเวลา
  const idle = poseWarp({ state: "idle", move: null, moveF: 0, hitstop: 0, onGround: true, stateF: 40, vy: 0, phase: () => null });
  ok(idle.rot === 0 && idle.sx === 1 && idle.sy === 1 && idle.dx === 0, "ยืนเฉย ๆ ไม่บิด");

  // เงื้อ = เอนหลัง · กรอบชนเปิด = เอนหน้า — ต้องสลับเครื่องหมายกันจริง
  const back = poseWarp(mk(jab, jab.startup - 1));
  const fwd = poseWarp(mk(jab, jab.startup));
  ok(back.rot < 0, `ช่วงเงื้อเอนหลัง (${(back.rot * 57.3).toFixed(1)}°)`);
  ok(fwd.rot > 0, `ช่วงกรอบชนเปิดเอนหน้า (${(fwd.rot * 57.3).toFixed(1)}°)`);
  // ต้องสะบัดข้ามในเฟรมเดียว นั่นคือสิ่งที่อ่านว่า "ออกหมัด"
  ok((fwd.rot - back.rot) * 57.3 > 8,
    `สะบัดข้ามในเฟรมเดียว ${( (fwd.rot - back.rot) * 57.3).toFixed(1)}° ไม่ใช่ค่อย ๆ ไหล`);
  // เงื้อหดกว้างยืดสูง · ออกหมัดยืดกว้างหดสูง (squash & stretch)
  ok(back.sx < 1 && back.sy > 1, "เงื้อ: หดกว้าง ยืดสูง");
  ok(fwd.sx > 1 && fwd.sy < 1, "ออกหมัด: ยืดกว้าง หดสูง");

  // แรงสุดต้องอยู่ที่ **เฟรมแรก** ของช่วงกรอบชนเปิด แล้วคลายลง ไม่ใช่ค้างเท่ากันทั้งช่วง
  const a0 = poseWarp(mk(jab, jab.startup)), a2 = poseWarp(mk(jab, jab.startup + jab.active - 1));
  ok(a0.rot > a2.rot, `แรงสุดที่เฟรมแรกของการกระทบแล้วคลาย (${(a0.rot * 57.3).toFixed(1)}° -> ${(a2.rot * 57.3).toFixed(1)}°)`);

  // ไม้หนักต้องบิดมากกว่าไม้เบา โดยไม่ต้องตั้งเลขทีละไม้
  const heavy = CHARACTERS.helios.moves.rushEndU;
  const hw = poseWarp(mk(heavy, heavy.startup));
  ok(hw.rot > fwd.rot, `ไม้หนัก (dmg ${heavy.dmg}) บิดมากกว่าไม้เบา (dmg ${jab.dmg}): ${(hw.rot * 57.3).toFixed(1)}° > ${(fwd.rot * 57.3).toFixed(1)}°`);

  // เพดาน — ตัวสูงบนเวทีแค่ 130 px เอียงเกินนี้อ่านเป็นภาพเพี้ยน ไม่ใช่แรง
  let maxDeg = 0, maxS = 0, maxDx = 0;
  for (const char of ["helios", "chronos"])
    for (const m of Object.values(CHARACTERS[char].moves)) {
      if (!m.startup || !m.hb) continue;
      for (let n = 0; n < m.startup + m.active + m.recovery; n++) {
        const w = poseWarp(mk(m, n));
        maxDeg = Math.max(maxDeg, Math.abs(w.rot * 57.3));
        maxS = Math.max(maxS, Math.abs(w.sx - 1), Math.abs(w.sy - 1));
        maxDx = Math.max(maxDx, Math.abs(w.dx));
      }
    }
  ok(maxDeg <= 12, `เอียงไม่เกิน 12° ทั้งโรสเตอร์ (สุด ${maxDeg.toFixed(1)}°)`);
  ok(maxS <= 0.20, `ย่อ/ยืดไม่เกิน 20% (สุด ${(maxS * 100).toFixed(0)}%)`);
  // 🔴 ภาพที่เลื่อนไปข้างหน้าเกินกรอบชน = โกหกระยะ ซึ่งเป็นกับดักเดิมของโปรเจกต์นี้
  ok(maxDx <= 8, `เลื่อนไปข้างหน้าไม่เกิน 8 px (สุด ${maxDx.toFixed(1)})`);

  // ลงพื้นต้องย่อ · โดนตีต้องเอนถอย
  const land = poseWarp({ state: "landing", move: null, moveF: 0, hitstop: 0, onGround: true, stateF: 0, vy: 0, phase: () => null });
  ok(land.sy < 1 && land.sx > 1, `แตะพื้นแล้วย่อ (สูง ${land.sy.toFixed(2)})`);
  const hurt = poseWarp({ state: "hitstun", move: null, moveF: 0, hitstop: 0, onGround: true, stateF: 0, vy: 0, phase: () => null });
  ok(hurt.rot < 0, "โดนตีแล้วเอนถอย");

  // หมุนต้องคูณ facing ตอนวาด ไม่งั้นหันซ้ายแล้วเอนผิดข้าง
  ok(/setRotation\(w\.rot \* f\.facing\)/.test(scene), "ตอนวาดคูณ facing ให้การหมุน");
  // เงาซ้อนต้องก๊อปการหมุนไปด้วย ไม่งั้นร่างซ้อนตั้งตรงขณะตัวจริงเอน
  ok(/setRotation\(src\.rotation\)/.test(scene), "เงาซ้อนก๊อปการหมุนของตัวจริง");
}

// ══ รอยฟาดต้องครบทุกท่าโจมตี ไม่ใช่เฉพาะไม้ที่มีชื่อในตาราง ═══════════════════
//
// `SLASH_DEFAULT` ไล่ตาม **ชื่อไม้** (jab/side/up/down/air) ซึ่งครอบแค่ไม้ทั่วไป
// ไม้สกิลทุกตัวจึงหลุด — วัดแล้ว 48 ท่าทั่วโรสเตอร์ไม่มีรอยฟาดเลย
// MARCH ไม่มี 19 จาก 28 (Chain Rush · Sky Drive · Hundred Hands ทั้งชุด) · EYE ไม่มีทั้งสกิล
{
  const { slashShapeFor, SLASH_DEFAULT } = await import(G + "/ScrambleScene.js");
  const block = (id) => {
    const i = scene.indexOf(`  ${id}: {`);
    return i < 0 ? "" : scene.slice(i, scene.indexOf("\n  },", i));
  };
  let total = 0, covered = 0;
  const miss = [];
  for (const [id, c] of Object.entries(CHARACTERS)) {
    if (c.artPending) continue;
    const blk = block(id);
    const own = new Set([...blk.slice(blk.indexOf("slash:")).matchAll(/(\w+):\s*\{\s*f:/g)].map((m) => m[1]));
    for (const [k, m] of Object.entries(c.moves)) {
      if (!m.startup || !m.hb || (m.hb.w === 0 && m.hb.h === 0)) continue;
      total++;
      if (own.has(k) || SLASH_DEFAULT[k] || slashShapeFor(m.hb)) covered++;
      else miss.push(`${id}/${k}`);
    }
  }
  // 🔴 ต้องเช็กว่า **slashFor เรียกตัวสำรองจริง** ไม่ใช่แค่ฟังก์ชันมีอยู่
  // เทสต์ที่เรียก slashShapeFor เองจะเขียวอยู่ดีถ้ามีคนถอดมันออกจากจุดเรียก
  // (ลองถอดออกแล้วเทสต์ไม่แดง จึงต้องมีข้อนี้)
  ok(/\?\? \(hb \? slashShapeFor\(hb\) : null\)/.test(methodBody("slashFor")),
    "slashFor ตกไปใช้ตัวสำรองเมื่อไม้ไม่มีชื่อในตาราง");
  ok(total > 90, `นับท่าโจมตีได้ ${total} ท่า`);
  ok(covered === total, `ทุกท่ามีรอยฟาด ${covered}/${total}${miss.length ? " ขาด: " + miss.slice(0, 5).join(",") : ""}`);

  // ตัวสำรองเลือกทรงจาก **สัดส่วนกรอบชน** ไม่ใช่ชื่อไม้ — ไม้ใหม่จึงได้รอยฟาดเองโดยไม่ต้องแก้ตาราง
  ok(slashShapeFor({ w: 60, h: 130 }).f === "slashRise", "กรอบตั้ง -> รอยงัดขึ้น");
  ok(slashShapeFor({ w: 160, h: 34 }).f === "slashChop", "กรอบแบนยาว -> รอยกวาด");
  ok(slashShapeFor({ w: 240, h: 180 }).f === "crescent", "กรอบใหญ่มาก -> รอยโค้งใหญ่");
  ok(slashShapeFor({ w: 90, h: 60 }).f === "slashThrust", "กรอบธรรมดา -> รอยพุ่ง");
  // ทุกทรงที่ตัวสำรองคืนต้องมีอยู่จริงในอัตลาส ไม่งั้น Phaser คืนเฟรมแรกมาเงียบ ๆ
  for (const hb of [{ w: 60, h: 130 }, { w: 160, h: 34 }, { w: 240, h: 180 }, { w: 90, h: 60 }])
    ok(!!atlas.frames[slashShapeFor(hb).f + ".png"], `ทรง ${slashShapeFor(hb).f} มีในอัตลาส`);

  // 🔴 ขนาดรอยฟาดต้องผูกกับกรอบชนเสมอ — รอยที่ใหญ่เกินระยะจริงคือการโกหกคนเล่น
  // ไม้หนักได้ "สว่างกว่า/อยู่นานกว่า" ไม่ใช่ "ใหญ่กว่า"
  const body = methodBody("slashFor");
  ok(/reach \/ \(src\?\.width/.test(body), "ขนาดคิดจากความกว้างกรอบชน");
  ok(!/heavy \?[^:]*scale/.test(body), "ไม้หนักไม่ได้ขนาดใหญ่กว่า");
  ok((body.match(/this\.emit\(spec\.f/g) ?? []).length === 2, "วาดสองชั้น (ชั้นเงาทึบ + แกนเรืองแสง)");

  // 🔴 ชั้นหลังต้องเป็น NORMAL สีเข้ม — `emit()` ตั้งค่าเริ่มต้นเป็น ADD
  // รอยสีครีมในโหมด ADD บนฟ้าสว่างของเวทีนี้**จางหายไปเกือบหมด** (ถ่ายในเบราว์เซอร์จริงแล้วเห็น)
  // กับดักเดียวกับที่ทำให้ต้องสร้าง puff() ขึ้นมาบังคับ NORMAL ให้ควัน
  ok(/blend: Phaser\.BlendModes\.NORMAL/.test(body), "ชั้นหลังบังคับ NORMAL ไม่ใช่ ADD ตามค่าเริ่มต้น");
  ok(/tint: art\.slashShade \?\? SLASH_SHADE/.test(body), "ชั้นหลังใช้สีเข้ม ไม่ใช่สีเดียวกับแกน");
  ok(/const SLASH_SHADE = 0x[0-9a-f]{6}/.test(scene), "สีเงาแยกเป็นค่าคงที่");
  // แกนยังต้องเป็น ADD เพื่อให้เรืองแสงบนพื้นหลังมืด — เวทีมีทั้งฟ้าสว่างและหินมืดในจอเดียวกัน
  const layers = body.split("this.emit(spec.f");
  ok(!/blend:/.test(layers[2] ?? ""), "แกนไม่ได้ตั้ง blend = ใช้ ADD ตามค่าเริ่มต้น");
}

// ══ ร่างซ้อนตอนพุ่ง — ดูจากความเร็วจริง ไม่ใช่ไล่ชื่อไม้ ════════════════════════
{
  const hook = methodBody("_rushGhosts");
  ok(/Math\.abs\(f\.vx\) < 6\.5/.test(hook), "เกณฑ์ความเร็วสูงกว่าความเร็ววิ่งปกติ");
  const { PHYS } = await import(G + "/core.js");
  const fastest = Math.max(PHYS.run, ...Object.values(CHARACTERS).map((c) => c.run ?? 0));
  ok(6.5 > fastest, `วิ่งเฉย ๆ ไม่ได้ร่างซ้อน (เร็วสุดในโรสเตอร์ ${fastest} < 6.5)`);
  ok(/s\.frame % 2/.test(hook), "เว้นเฟรม ไม่งั้นร่างซ้อนกันทึบ");
  ok(/f\.state !== 'attack'/.test(hook), "เฉพาะตอนออกท่า ไม่ใช่ตอนถูกตีกระเด็น");
}
