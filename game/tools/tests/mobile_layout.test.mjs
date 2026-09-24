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
// พื้นล่าง 13% มาจากโหมด 1v1 เดิมที่ปรับจนใช้ได้จริงบนมือถือ: ปุ่มที่ต่ำที่สุด (ปุ่มกัน)
// ขอบล่างห่างจากขอบผืนเกม 94 หน่วยจาก 720 = 13.06% — โหมดนั้นถูกลบไปแล้ว
// จึงตรึงตัวเลขไว้ตรงนี้แทน พร้อมที่มา ไม่งั้นเหลือแค่ "13" ลอย ๆ ที่ไม่มีใครรู้ว่ามาจากไหน
//
// เป็น "อย่างน้อย" ไม่ใช่ "เท่ากับ": ผู้เล่นรายงานว่านิ้วโป้งบังตัวละครซึ่งยืนอยู่ชั้นล่างของเวที
// จึงยกปุ่มสูงกว่าพื้นล่างนี้ได้ แต่ห้ามเกินเพดานไม่งั้นชนแถบเลือดด้านบน
{
  const pct = 94 / GAME_HEIGHT * 100;
  const CEIL = 28;   // มือถือแนวนอนสูง ~390 px · ฝั่งขวาสูง ~180 px · เกินนี้ชนของด้านบน

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
  ok(/#sc-tools button, #sc-touch button \{[^}]*touch-action:none/.test(scramble), "ปุ่มของ SCRAMBLE ยังเป็น none");

  // กล่องที่ห่อปุ่ม — จุดที่ทำให้ซูมจริง ๆ
  for (const sel of ["#sc-tools", "#sc-touch", "#sc-touch .pad", "#sc-touch .acts"]) {
    const rule = scramble.match(new RegExp(`[^\\n]*${sel.replace(/[.#]/g, (c) => "\\" + c)}[^{\\n]*\\{([^}]*)\\}`));
    ok(rule != null && /touch-action:\s*none/.test(rule[1]) ||
       new RegExp(`#sc-tools, #sc-touch, #sc-touch \\.pad, #sc-touch \\.acts \\{ touch-action:none`).test(scramble),
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
