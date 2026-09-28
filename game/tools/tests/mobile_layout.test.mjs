// ทดสอบเลย์เอาต์บนจอมือถือแนวนอน — ปุ่มต้อง "กดถึง" และ "กดติด"
// รัน: node tools/tests/mobile_layout.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: บั๊กชุดนี้มองไม่เห็นบนคอมเลยสักอัน จอคอมสูง 700-1000px ทุกอย่างพอดีหมด
// ต้องจอเตี้ย ๆ แบบมือถือแนวนอน (สูง 390-430px) ถึงจะโผล่ และตอนโผล่ก็ไม่มี error ให้เห็น
// มีแค่ "ปุ่มกดไม่ได้" ซึ่งแยกไม่ออกจากปุ่มเสีย ผู้ใช้เจอมาแล้วสามอาการรวด
import fs from "fs";
import { makeScene } from "./phaser_stub.mjs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const scrambleCss = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
const G = new URL("../../src", import.meta.url).href;
const { GAME_HEIGHT, gameWidthFor } = await import(G + "/config/viewport.config.js");

// ── [hidden] ต้องชนะ .lobby-panel ──
// UA stylesheet ([hidden]{display:none}) แพ้ author stylesheet เสมอ ไม่ว่า specificity เท่าไหร่
// .lobby-panel{display:flex} จึงทับมันทิ้ง แล้ว el.hidden = true ไม่มีผลอะไรเลย
// = พาเนลทั้งสามโผล่ซ้อนกันหมด การ์ดสูง 768px แทนที่จะเป็น ~300px
// บนมือถือแนวนอนปุ่ม "เล่นคนเดียว" ที่อยู่บนสุดถูกดันขึ้นไปนอกจอ (วัดได้ y = -87) กดไม่ได้เลย
{
  const rule = html.match(/\[hidden\]\s*\{([^}]*)\}/);
  ok(rule != null, "มีกฎ [hidden] เขียนทับ UA stylesheet");
  ok(rule != null && /display:\s*none\s*!important/.test(rule[1]), "กฎ [hidden] ใช้ !important (ไม่งั้นแพ้ .lobby-panel{display:flex} อยู่ดี)");
  ok(/\.lobby-panel\s*\{[^}]*display:\s*flex/.test(html), "ยืนยันว่า .lobby-panel ยังตั้ง display:flex อยู่จริง (คู่กรณีที่กฎข้างบนต้องเอาชนะ)");
}

// ── การ์ดล็อบบี้ต้องไม่ล้นจอเตี้ย ──
// body ตั้ง overflow:hidden ไว้ ล้นแล้วเลื่อนหน้าไปหาไม่ได้ ปุ่มที่อยู่นอกจอคือกดไม่ได้ถาวร
{
  const card = html.match(/\.lobby-card\s*\{([^}]*)\}/);
  ok(card != null && /max-height:/.test(card[1]), ".lobby-card จำกัดความสูงไม่ให้ล้นจอ");
  ok(card != null && /overflow-y:\s*auto/.test(card[1]), ".lobby-card เลื่อนดูข้างในได้ถ้าเนื้อหายาวกว่าจอ");
}

// ── ขนาดผืนเกมต้องคิดตอนกดเริ่มเล่น ไม่ใช่ตอนโหลดหน้า ──
// คนเล่นมือถือเปิดลิงก์มาด้วยการถือแนวตั้งเกือบทุกครั้ง แล้วค่อยหมุนจอตามที่ #rotate-hint บอก
// คิดตอนโหลดหน้า = ได้สัดส่วนแนวตั้ง ซึ่งโดน MIN_GAME_WIDTH บีบเหลือ 16:9
// พอหมุนมาเล่นแนวนอนจริงจะเหลือแถบดำข้างละ 75px (18% ของจอ) และ DOM ที่ทับบน canvas
// (ปุ่มของ SCRAMBLE) ไม่ได้ย่อตาม canvas จึงไปลอยอยู่บนแถบดำ เยื้องจากภาพเกม
{
  const calls = [...html.matchAll(/gameWidthFor\s*\(/g)].map((m) => m.index);
  const makeIdx = html.search(/function makeConfig\s*\(/);
  ok(calls.length > 0, "index.html เรียก gameWidthFor()");
  ok(makeIdx !== -1, "ขนาดผืนเกมถูกห่อไว้ในฟังก์ชัน (makeConfig)");
  ok(calls.every((i) => i > makeIdx), "ไม่มีการเรียก gameWidthFor() ที่ระดับบนสุดของโมดูลเลย (คิดครั้งเดียวตอนโหลดหน้า = บั๊กเดิม)");
  ok(/new Phaser\.Game\(\s*makeConfig\(\)\s*\)/.test(html), "สร้างเกมด้วย makeConfig() สด ๆ ตอนกดเริ่มเล่น");

  // สัดส่วนจริงของมือถือแนวนอนต้องได้ผืนเกมที่ไม่เหลือแถบดำ
  for (const [w, h, name] of [[844, 390, "iPhone 14"], [932, 430, "iPhone Pro Max"], [1280, 720, "จอ 16:9"]]) {
    const gw = gameWidthFor(w, h);
    const scale = Math.min(w / gw, h / GAME_HEIGHT);
    const bars = Math.round((w - gw * scale) / 2);
    ok(bars <= 1, `${name} (${w}x${h}): ไม่เหลือแถบดำซ้ายขวา (${bars}px)`);
  }
}

// ── ปุ่มสัมผัสของ SCRAMBLE ต้องห่างขอบล่างพอ ──
// มือถือมีแถบ gesture / ขีดโฮม ทับอยู่ล่างจอ ซึ่งกินการแตะไปก่อนเสมอ ปุ่มที่จมอยู่ในโซนนั้นกดไม่ติด
//
// **เคยตั้งพื้นไว้ที่ 13%** (94 หน่วยจาก 720 ของโหมด 1v1 เดิม) เพราะตัวละครยืนอยู่ที่ 86%
// ของความสูงจอ ซึ่งคือแถบเดียวกับที่นิ้วโป้งพาดอยู่พอดี — ผู้เล่นรายงานว่านิ้วบังตัวละคร
//
// เหตุผลนั้นหมดอายุไปแล้วตอนกล้องเล็งใหม่: ลำตัวอยู่ที่ราว 53% ของจอ (ดู CAM.viewBot ใน ScrambleScene)
// ใต้ตัวละครลงมาเป็นหมอกกับฟ้า ไม่ใช่พื้นที่เล่น นิ้วบังตรงนั้นไม่เสียอะไร
// ผู้เล่นขอให้เลื่อนปุ่มลงมา ซึ่งตอนนี้ทำได้แล้วโดยไม่แลกอะไรเลย
//
// พื้นที่เหลือมีไว้กันเรื่องเดียว: **แถบ gesture / ขีดโฮม ของมือถือกินการแตะไปก่อน**
// ซึ่งกันด้วยสองชั้นพร้อมกัน — เปอร์เซ็นต์ของจอ และค่าคงที่ (px) ที่ไม่ขึ้นกับความสูงจอเลย
// ค่าคงที่สำคัญกว่าบน Android ที่ env(safe-area-inset-bottom) รายงาน 0 ทั้งที่มีแถบ gesture อยู่จริง
{
  const pct = 6;     // 6% ของ 390 px = 23 px · รวมกับค่าคงที่ข้างล่างแล้วพ้นแถบ gesture ทุกเครื่อง
  const MINPX = 24;  // แถบ gesture ของ Android แนวนอนสูงราว 16-24 px และ safe-area มักรายงาน 0
  const CEIL = 28;   // มือถือแนวนอนสูง ~390 px · ฝั่งขวาสูง ~180 px · เกินนี้ชนของด้านบน

  const fixed = [...scrambleCss.matchAll(/#sc-touch\s*\{\s*padding-bottom:\s*max\([^)]*?calc\(\s*(\d+)px/g)].map((m) => +m[1]);
  ok(fixed.length >= 2, `มีค่าคงที่เป็น px กำกับทุกบรรทัด (${fixed.length})`);
  ok(fixed.every((v) => v >= MINPX), `ค่าคงที่ไม่ต่ำกว่า ${MINPX} px — กัน Android ที่ safe-area รายงาน 0 (${fixed.join()})`);

  const pads = [...scrambleCss.matchAll(/#sc-touch\s*\{\s*padding-bottom:\s*max\(\s*([\d.]+)(dvh|vh)/g)].map((m) => ({ pct: +m[1], unit: m[2] }));
  ok(pads.length >= 1, "#sc-touch มีกฎ padding-bottom ที่คิดจากความสูงจอ");
  ok(pads.some((p) => p.unit === "dvh"), "ใช้ dvh (ความสูงที่มองเห็นจริง หดขยายตามแถบเบราว์เซอร์)");
  ok(pads.some((p) => p.unit === "vh"), "มีบรรทัด vh สำรองไว้ให้เบราว์เซอร์เก่าที่ยังไม่รู้จัก dvh");
  ok(/env\(safe-area-inset-bottom/.test(scrambleCss), "เผื่อ safe-area-inset-bottom ของ iOS ไว้เป็นพื้นล่างด้วย");
  for (const p of pads) {
    ok(p.pct >= pct - 0.1,
      `ปุ่ม (${p.pct}${p.unit}) พ้นแถบ gesture ตามพื้นล่างของโหมดปกติ (${pct.toFixed(1)}%)`);
    ok(p.pct <= CEIL,
      `ปุ่ม (${p.pct}${p.unit}) ไม่สูงเกิน ${CEIL}% จนชนแถบเลือดกับปุ่มเครื่องมือด้านบน`);
  }
  ok(new Set(pads.map((p) => p.pct)).size === 1,
    `บรรทัด vh กับ dvh ใช้ค่าเดียวกัน (${[...new Set(pads.map((p) => p.pct))].join(" / ")})`);
}

console.log("\nMobile landscape: lobby fits and switches panels, canvas matches screen after rotation, SCRAMBLE buttons clear the gesture bar");

// ── กันจอซูมเองตอนกดรัว ๆ (iPhone) ──
// iOS Safari เมิน user-scalable=no / maximum-scale มาตั้งแต่ iOS 10 ทางเดียวที่ได้ผลคือ touch-action
// ของเดิมใส่ไว้แค่ canvas กับตัวปุ่ม แต่ช่องว่างระหว่างปุ่ม (gap 4-8px + padding ของกล่อง) ยังเป็น auto
// กดรัว ๆ แล้วนิ้วพลาดลงช่องว่างสองทีติดกัน = iOS นับเป็น double-tap แล้วซูมค้าง
// ซูมแล้วกู้ไม่ได้จากในหน้าเว็บ ต้องกันไม่ให้เกิดตั้งแต่แรกอย่างเดียว
{
  const scramble = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

  const star = html.match(/(^|\n)\s*\*\s*\{([^}]*)\}/);
  ok(star != null && /touch-action:\s*manipulation/.test(star[2]),
     "มีกฎ * { touch-action: manipulation } คลุมทุก element รวมช่องว่างระหว่างปุ่ม");

  // กฎเจาะจงต้องยังชนะ * (specificity 0) — canvas กับปุ่มเกมต้องเป็น none ไม่ใช่ manipulation
  ok(/canvas\s*\{[^}]*touch-action:\s*none/.test(html), "canvas ยังเป็น touch-action: none ตามเดิม");
  // จับกฎจาก "#sc-tools button" ไม่ใช่จากรายชื่อตัวเลือกทั้งบรรทัด
  // เพิ่มปุ่มใหม่เข้ากฎเดียวกันแล้วเทสต์ต้องยังผ่าน (ปุ่มหยุดพักเพิ่มมาทีหลัง)
  const gameBtnRule = (src) => src.match(/#sc-tools button[^{]*\{([^}]*)\}/)?.[1] ?? "";
  ok(/touch-action:none/.test(gameBtnRule(scramble)), "ปุ่มของ SCRAMBLE ยังเป็น none");

  // กล่องที่ห่อปุ่ม — จุดที่ทำให้ซูมจริง ๆ
  for (const sel of ["#sc-tools", "#sc-touch", "#sc-touch .stick", "#sc-touch .acts"]) {
    const rule = scramble.match(new RegExp(`[^\\n]*${sel.replace(/[.#]/g, (c) => "\\" + c)}[^{\\n]*\\{([^}]*)\\}`));
    ok(rule != null && /touch-action:\s*none/.test(rule[1]) ||
       new RegExp(`#sc-tools, #sc-touch, #sc-touch \\.stick, #sc-touch \\.acts \\{ touch-action:none`).test(scramble),
       `กล่อง ${sel} ปิด double-tap zoom ด้วย ไม่ใช่แค่ตัวปุ่มข้างใน`);
  }

  // บีบสองนิ้ว: touch-action ปิดไม่ได้ ต้องดัก gesture event ของ WebKit เอง
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) {
    ok(html.includes(`"${ev}"`), `ดัก ${ev} เพื่อกันบีบสองนิ้วซูม (event เฉพาะ WebKit)`);
  }
  ok(/\{ passive: false \}/.test(html), "ลงทะเบียนแบบ passive: false ไม่งั้น preventDefault ถูกเมิน");

  // กดค้างแล้วเด้งเมนูคัดลอก/แชร์ขวางกลางเกม
  ok(/-webkit-touch-callout:\s*none/.test(html), "ปิดเมนูกดค้างของ iOS");
  // ช่องกรอกรหัสห้องต้องยกเว้นไว้ ไม่งั้นวางรหัสที่เพื่อนส่งมาไม่ได้บน iOS
  ok(/\.lobby-input \{[^}]*-webkit-touch-callout:\s*default/.test(html),
    "ยกเว้นช่องกรอกรหัสห้อง ยังวาง/เลือกข้อความได้");

  // meta viewport: iOS เมิน แต่ Android ยังฟัง จึงยังต้องมี
  ok(/maximum-scale=1/.test(html) && /user-scalable=no/.test(html), "meta viewport ยังกันซูมฝั่ง Android ไว้");
}

// ── จอยลอย: ต้องไม่ต่อเข้า sim ตรง ๆ ──
//
// ส่งออกเป็นโค้ดปุ่มชุดเดียวกับคีย์บอร์ด sim จึงไม่รู้ว่าอินพุตมาจากจอยหรือคีย์บอร์ด
// ถ้าต่อเข้า sim ตรง ๆ netplay จะต้องส่งค่าแอนะล็อกข้ามเน็ต แล้วสองเครื่องจะปัดเศษไม่ตรงกัน
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  ok(/_wireStick/.test(scr), "มีจอยลอย");
  ok(/CODES = \{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' \}/.test(scr),
    "จอยส่งออกเป็นโค้ดปุ่มชุดเดียวกับคีย์บอร์ด");
  ok(/held\.add\(dx < 0 \? CODES\.left : CODES\.right\)/.test(scr), "เข้าคิวผ่าน held เหมือนปุ่มอื่นทุกประการ");
  ok(!/sim\.[a-z]+\s*=\s*.*stick/i.test(scr), "ไม่มีเส้นทางไหนที่จอยเขียนใส่ sim ตรง ๆ");

  // เขตตายแนวตั้งต้องกว้างกว่าแนวนอน — การเดินคือสิ่งที่กดบ่อยที่สุด
  // ถ้าเท่ากัน นิ้วที่เลื่อนเฉียงนิดเดียวจะสั่งย่อหรือสั่งท่าขึ้นโดยไม่ได้ตั้งใจตลอดเวลา
  const m = scr.match(/STICK_R = (\d+), STICK_DEAD = (\d+), STICK_DEADY = (\d+)/);
  ok(m, "มีค่าคงที่ของจอยครบสามตัว");
  ok(+m[3] > +m[2], `เขตตายแนวตั้ง ${m?.[3]} กว้างกว่าแนวนอน ${m?.[2]}`);
  ok(+m[1] > +m[3], `รัศมีลากสุด ${m?.[1]} ยังมากกว่าเขตตายแนวตั้ง — ไม่งั้นสั่งขึ้น/ลงไม่ได้เลย`);
}

// ── ปุ่มต้องอ่านออกบนฉากสว่าง ──
// ฉากเปลี่ยนจากเมืองกลางคืนเป็นฟ้ากลางวัน ปุ่มพื้นขาวโปร่งแบบเดิมกลืนหายไปทันที
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const btn = scr.match(/#sc-tools button[^{]*\{([^}]*)\}/)?.[1] ?? "";
  // ปุ่มบนจอทุกปุ่มต้องอยู่ในกฎเดียวกันหมด ไม่ใช่ปุ่มใหม่ตกหล่นแล้วอ่านไม่ออกบนฟ้าสว่าง
  const sel = scr.match(/(#sc-tools button[^{]*)\{/)?.[1] ?? "";
  for (const id of ['#sc-touch button', '#sc-mute', '#sc-pause-btn'])
    ok(sel.includes(id), `${id} อยู่ในกฎหน้าตาปุ่มชุดเดียวกัน`);
  ok(/background:rgba\(12,17,28,\.\d+\)/.test(btn), "พื้นปุ่มเป็นสีเข้มทึบ ไม่ใช่ขาวโปร่ง");
  ok(/text-shadow/.test(btn), "ตัวอักษรมีเงา — อ่านออกทั้งบนฟ้าสว่างและบนหินเข้ม");
  ok(/border:1\.5px|border:2px/.test(btn), "ขอบหนาขึ้นให้เห็นรูปปุ่มชัด");
}

// ── จอยเป็น <div> ไม่ใช่ <button> — ต้องปิดแว่นขยายของ iOS เอง ──
//
// อาการที่ผู้เล่นเจอ: "จอซูมเอง" บน iOS หลังเปลี่ยนมาใช้จอยลอย
// นิ้วโป้งแตะค้างบน div เปล่า ๆ นาน ๆ (ท่าเล่นปกติของจอย) iOS เปิดแว่นขยายเลือกข้อความ
// ปุ่มเดิมไม่เคยเจอเพราะ <button> ไม่มีพฤติกรรมนี้ และกดแป๊บเดียวปล่อย
// touch-action กันได้แค่ double-tap กับ scroll — ไม่ได้กันแว่นขยาย
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const css = scr.match(/#sc-touch \.stick \{([^}]*)\}/)?.[1] ?? "";
  ok(/-webkit-touch-callout:\s*none/.test(css), "ปิด callout (แว่นขยาย) ของ iOS");
  ok(/-webkit-user-select:\s*none/.test(css), "ปิดการเลือกข้อความ");
  ok(/-webkit-tap-highlight-color:\s*transparent/.test(css), "ปิดไฮไลต์ตอนแตะ");

  // iOS สร้าง pointer event จาก touch event อีกที preventDefault ที่ pointerdown จึงสายไปแล้ว
  ok(/for \(const ev of \['touchstart', 'touchmove', 'touchend'\]\)[\s\S]{0,140}passive: false/.test(scr),
    "ดัก touch event ตัวจริงด้วย passive:false ไม่ได้พึ่งแค่ pointerdown");
}

// ══ ปุ่ม "เริ่ม" ต้องไม่ถูกการ์ดตัวละครดันตกขอบจอ ═══════════════════════════════
//
// คอมเมนต์เดิมในโค้ดเตือนไว้เองว่า "แถวที่สองดันปุ่มเริ่มตกขอบจอมือถือ"
// แล้วเผื่อไว้แค่ 5 ใบ — ตอนนี้มี 8 ใบ (ตัวละครจริง 6 + ตัวที่ยังไม่ปล่อย 2)
// ทางเดิมหมดอายุไปแล้วจริง ๆ และอาการคือเลือกตัวเสร็จแล้วกดเริ่มไม่ได้
// ซึ่งเป็นทางตันที่ไม่มีอะไรบอกว่าเกิดอะไรขึ้น
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const grid = scr.match(/#sc-select \.grid \{([^}]*)\}/)?.[1] ?? "";
  ok(grid.length > 0, "อ่านกฎของตารางการ์ดได้");

  // ตารางต้องเลื่อนในกล่องของตัวเอง ไม่ใช่ดันของข้างล่างออกไป
  ok(/max-height:/.test(grid), "ตารางการ์ดมีเพดานความสูง");
  ok(/overflow-y:auto/.test(grid), "เกินเพดานแล้วเลื่อนในกล่องตัวเอง");
  ok(/dvh/.test(grid), "เพดานคิดจากความสูงจอจริง (dvh) ไม่ใช่เลขตายตัว");
  // iOS เลื่อนจนสุดแล้วจะไปเลื่อนของที่อยู่ข้างหลังต่อ ซึ่งคือแผงทั้งแผง
  ok(/overscroll-behavior:contain/.test(grid), "เลื่อนสุดแล้วไม่ทะลุไปเลื่อนแผงข้างหลัง");

  // จำนวนการ์ดจริงต้องมากกว่าที่แผนเดิมเผื่อไว้ — ยืนยันว่าข้อบนนี้ไม่ได้กันเคสที่ไม่มีจริง
  const G2 = new URL("../../src/modes/scramble", import.meta.url).href;
  const { CHARACTERS } = await import(G2 + "/core.js");
  const soon = (scr.match(/const COMING_SOON = \[([\s\S]*?)\];/)?.[1].match(/pic:/g) ?? []).length;
  const cards = Object.keys(CHARACTERS).length + soon;
  ok(cards > 5, `การ์ดทั้งหมด ${cards} ใบ เกินที่แผนเดิมเผื่อไว้ (5) จริง`);
}

// ══ ปุ่มท่าฝั่งขวา: วางตามนิ้วโป้ง ไม่ใช่ตาราง ══════════════════════════════════
//
// นิ้วโป้งหมุนรอบโคนนิ้วที่มุมขวาล่าง ปลายนิ้วจึงกวาดเป็นส่วนโค้ง ไม่ใช่สี่เหลี่ยม
// ปุ่มที่อยู่มุมบนซ้ายของตารางคือปุ่มที่ต้องยืดนิ้วไปหา = ปุ่มที่กดพลาดบ่อยที่สุด
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  // ต้องยึดหัวบรรทัด ไม่งั้นไปเจอกฎรวม (#sc-tools, #sc-touch, ... .acts { touch-action:none })
  // ซึ่งมีชื่อตัวเลือกเดียวกันอยู่กลางบรรทัด แล้วอ่านคุณสมบัติผิดกฎไปเลย
  const rule = (sel) => scr.match(
    new RegExp('^' + sel.replace(/[.#]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm'))?.[1] ?? "";

  // ทุกปุ่มวางด้วยพิกัดจากมุมขวาล่าง ไม่ใช่ไหลตามตาราง
  for (const b of ['.atk', '.jmp', '.blk', '.s1', '.s2', '.s3']) {
    const r = rule('#sc-touch ' + b);
    ok(/right:/.test(r) && /bottom:/.test(r), `${b} วางด้วยพิกัดจากมุมขวาล่าง`);
  }
  ok(/position:absolute/.test(rule('#sc-touch .hex')), "ปุ่มเป็น absolute ทุกใบ");
  ok(!/grid-template-columns/.test(rule('#sc-touch .acts')), "ไม่ใช่ตารางอีกแล้ว");

  // "ตี" ต้องใหญ่ที่สุดและใกล้มุมที่สุด — เป็นปุ่มที่กดบ่อยที่สุดในเกม
  const px = (r, k) => Number(r.match(new RegExp(k + ':calc\\((\\d+)px'))?.[1] ?? NaN);
  const atk = rule('#sc-touch .atk'), jmp = rule('#sc-touch .jmp'), sk = rule('#sc-touch .sk');
  ok(px(atk, 'width') > px(jmp, 'width'), `ปุ่มตีใหญ่กว่าปุ่มกระโดด (${px(atk, 'width')} > ${px(jmp, 'width')})`);
  ok(px(jmp, 'width') > px(sk, 'width'), `ปุ่มกระโดดใหญ่กว่าปุ่มสกิล (${px(jmp, 'width')} > ${px(sk, 'width')})`);
  const near = (r) => px(r, 'right') + px(r, 'bottom');
  for (const b of ['.jmp', '.blk', '.s1', '.s2', '.s3'])
    ok(near(atk) < near(rule('#sc-touch ' + b)), `ปุ่มตีอยู่ใกล้มุมกว่า ${b}`);
  // สกิลอยู่ชั้นนอก กดเป็นจังหวะ ไม่ใช่ทุกวินาที
  for (const b of ['.s1', '.s2', '.s3'])
    ok(near(rule('#sc-touch ' + b)) > near(rule('#sc-touch .blk')), `${b} อยู่ไกลกว่าปุ่มหลัก`);

  // ย่อทั้งชุดด้วยตัวคูณตัวเดียว ไม่ต้องไล่แก้ทุกปุ่มตอนจอเตี้ย
  ok(/--u:1/.test(rule('#sc-touch .acts')), "มีตัวคูณขนาดทั้งชุด");
  const short = scr.match(/@media \(max-height: 500px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const u = Number(short.match(/--u:\.?(\d+)/)?.[0].split(':')[1]);
  ok(short.includes('--u:'), "จอเตี้ยย่อด้วยการเปลี่ยนตัวคูณ");
  ok(u > 0 && u < 1, `ย่อจริง (--u:${u})`);
  // ปุ่มที่กดบ่อยที่สุดต้องยังเกินระยะแตะขั้นต่ำ 44 px ของ iOS แม้ย่อแล้ว
  ok(px(atk, 'width') * u >= 44, `ปุ่มตีตอนย่อแล้วยังได้ ${Math.round(px(atk, 'width') * u)} px (ต้อง >= 44)`);

  // แยกสีต่อท่า — บนจอที่ไม่มีสัมผัสตอบกลับ คนจำตำแหน่ง+สี ไม่ได้อ่านตัวหนังสือทุกครั้ง
  // สีย้ายจาก "ถมทั้งปุ่ม" ไปอยู่ที่ "ขอบกับไอคอน" (border ใช้ currentColor) — ปุ่มโปร่งขึ้นแต่ยังแยกสีได้
  const cols = ['.atk', '.jmp', '.blk', '.sk'].map((b) => rule('#sc-touch ' + b).match(/color:(#[0-9a-f]{6})/i)?.[1]);
  ok(cols.every(Boolean), `ทุกท่ามีสีของตัวเอง (${cols.join(' ')})`);
  ok(new Set(cols).size === cols.length, "และไม่มีสีซ้ำกัน");

  // กล่อง .acts กว้างกว่าที่ปุ่มกินจริง ปล่อยให้รับการแตะทั้งใบ = แตะที่ว่างแล้วโดนกลืน
  ok(/pointer-events:none/.test(rule('#sc-touch .acts')), "กล่องไม่รับการแตะ");
  ok(/pointer-events:auto/.test(rule('#sc-touch .hex')), "เฉพาะตัวปุ่มที่รับ");
}

// ── ปุ่มต้องยังผูกกับปุ่มคีย์บอร์ดชุดเดิม ──
//
// เปลี่ยนหน้าตาปุ่มแล้วลืม data-code = ปุ่มสวยแต่กดไม่ติด ซึ่งดูเหมือนเกมค้าง
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const acts = scr.slice(scr.indexOf('<div class="acts">'), scr.indexOf('</div>`;'));
  for (const code of ['KeyJ', 'Space', 'KeyL', 'Digit1', 'Digit2', 'Digit3'])
    ok(acts.includes(`data-code="${code}"`), `ยังมีปุ่ม ${code}`);
  for (const slot of ['1', '2', '3'])
    ok(acts.includes(`data-slot="${slot}"`), `ช่องสกิล ${slot} ยังบอกเลขช่องไว้`);
  ok(/querySelectorAll\('#sc-touch \.skills button'\)/.test(scr),
    "ตัวหรี่ปุ่มสกิลยังหาปุ่มเจอ (.skills ยังเป็นตัวครอบอยู่)");
}

// ══ ปุ่มฝั่งขวาต้องไม่ทับกันเอง และไม่ล้นกล่อง ══════════════════════════════════
//
// ส่วนโค้งของนิ้วโป้งวางด้วยมือ ทุกครั้งที่ใครขยับขนาดปุ่มใบเดียว ใบข้าง ๆ มีสิทธิ์โดนทับทันที
// ปุ่มที่ทับกันไม่ได้ดูพัง — มันดูปกติ แต่กดตรงที่ทับแล้ว **ได้ท่าผิด** ซึ่งโทษตัวเองไปก่อนเสมอ
// (ใบที่อยู่หลังใน DOM รับการแตะ ไม่ใช่ใบที่ตาเห็นว่าอยู่บน)
{
  const scr = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
  const rule = (sel) => scr.match(
    new RegExp('^' + sel.replace(/[.#]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm'))?.[1] ?? "";
  const px = (r, k) => Number(r.match(new RegExp(k + ':calc\\((\\d+)px'))?.[1] ?? NaN);

  const KEYS = ['.atk', '.jmp', '.blk', '.s1', '.s2', '.s3'];
  const size = (b) => {
    const own = rule('#sc-touch ' + b);
    // สกิลสามใบเอาขนาดจากกฎรวม .sk ไม่ได้เขียนซ้ำในกฎของตัวเอง
    const w = px(own, 'width') || px(rule('#sc-touch .sk'), 'width');
    return w;
  };
  /** กรอบของปุ่ม วัดจากมุมขวาล่างของกล่อง (x โตไปทางซ้าย · y โตขึ้นบน) */
  const box = (b) => {
    const r = rule('#sc-touch ' + b), w = size(b);
    const x = px(r, 'right'), y = px(r, 'bottom');
    return { b, x0: x, x1: x + w, y0: y, y1: y + w, w };
  };
  const boxes = KEYS.map(box);
  ok(boxes.every((v) => Number.isFinite(v.x0) && Number.isFinite(v.y0) && v.w > 0),
    `อ่านกรอบของทุกปุ่มได้ (${boxes.map((v) => `${v.b}:${v.w}`).join(' ')})`);

  const hits = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], c = boxes[j];
    if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) hits.push(`${a.b}+${c.b}`);
  }
  ok(hits.length === 0, hits.length ? `ปุ่มทับกัน: ${hits.join(' · ')}` : "ไม่มีปุ่มคู่ไหนทับกันเลย");

  // ช่องว่างระหว่างใบที่ใกล้ที่สุดต้องพอให้นิ้วพลาดแล้วไม่ไปโดนใบข้าง ๆ
  let gap = Infinity;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], c = boxes[j];
    const dx = Math.max(a.x0 - c.x1, c.x0 - a.x1, 0);
    const dy = Math.max(a.y0 - c.y1, c.y0 - a.y1, 0);
    if (dx > 0 || dy > 0) gap = Math.min(gap, Math.max(dx, dy));
  }
  ok(gap >= 6, `ใบที่ใกล้กันที่สุดห่างกัน ${gap} px (ต้อง >= 6)`);

  // ทุกใบต้องอยู่ในกล่อง .acts — ล้นแล้วกล่องไม่รู้ตัว แต่ปุ่มไปโผล่นอกพื้นที่ที่จองไว้
  const acts = rule('#sc-touch .acts');
  const bw = px(acts, 'width'), bh = px(acts, 'height');
  const over = boxes.filter((v) => v.x1 > bw || v.y1 > bh);
  ok(over.length === 0, over.length
    ? `ปุ่มล้นกล่อง ${bw}x${bh}: ${over.map((v) => `${v.b}(${v.x1},${v.y1})`).join(' ')}`
    : `ทุกปุ่มอยู่ในกล่อง ${bw}x${bh}`);

  // ย่อบนมือถือแล้วปุ่มสกิลต้องยังพ้นระยะแตะขั้นต่ำของ iOS
  const u = Number(scr.match(/@media \(max-height: 500px\) \{[\s\S]*?--u:(\.?\d+)/)?.[1] ?? 0);
  const skMin = size('.s1') * u;
  ok(skMin >= 44, `ปุ่มสกิลตอนย่อแล้วได้ ${skMin.toFixed(1)} px (ต้อง >= 44 ตามเกณฑ์ iOS)`);
}
