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
const { TouchControls } = await import(G + "/systems/TouchControls.js");
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

// ── ปุ่มสัมผัสของ SCRAMBLE ต้องห่างขอบล่างพอ ๆ กับโหมดปกติ ──
// มือถือมีแถบ gesture / ขีดโฮม ทับอยู่ล่างจอ ซึ่งกินการแตะไปก่อนเสมอ
// โหมดปกติเรียนรู้เรื่องนี้ไปแล้ว (BOTTOM_SAFE) แต่ SCRAMBLE พอร์ตเข้ามาทีหลังพร้อม DOM ของตัวเอง
// เลยยังเว้นแค่ 14px อยู่ = ปุ่มจมอยู่ในโซนที่ระบบกินการแตะ
{
  // ระยะจริงของโหมดปกติ: ขอบล่างของปุ่มที่ต่ำที่สุด ห่างจากขอบล่างผืนเกมกี่หน่วย
  const tc = new TouchControls(makeScene(), 90);
  const gap = Math.min(...tc.buttons.map((b) => GAME_HEIGHT - (b.y + b.r)));
  const pct = (gap / GAME_HEIGHT) * 100;
  ok(gap > 0, `โหมดปกติ: ปุ่มล่างสุดห่างขอบล่าง ${gap} หน่วยเกม (${pct.toFixed(1)}% ของความสูงจอ)`);

  const pads = [...scrambleCss.matchAll(/#sc-touch\s*\{\s*padding-bottom:\s*max\(\s*([\d.]+)(dvh|vh)/g)].map((m) => ({ pct: +m[1], unit: m[2] }));
  ok(pads.length >= 1, "#sc-touch มีกฎ padding-bottom ที่คิดจากความสูงจอ");
  ok(pads.some((p) => p.unit === "dvh"), "ใช้ dvh (ความสูงที่มองเห็นจริง หดขยายตามแถบเบราว์เซอร์)");
  ok(pads.some((p) => p.unit === "vh"), "มีบรรทัด vh สำรองไว้ให้เบราว์เซอร์เก่าที่ยังไม่รู้จัก dvh");
  ok(/env\(safe-area-inset-bottom/.test(scrambleCss), "เผื่อ safe-area-inset-bottom ของ iOS ไว้เป็นพื้นล่างด้วย");
  for (const p of pads) {
    ok(
      Math.abs(p.pct - pct) <= 3,
      `ระยะห่างขอบล่างของ SCRAMBLE (${p.pct}${p.unit}) ตรงกับโหมดปกติ (${pct.toFixed(1)}%) ไม่หลุดจากกัน`
    );
  }
}

console.log("\nMobile landscape: lobby fits and switches panels, canvas matches screen after rotation, SCRAMBLE buttons clear the gesture bar");
