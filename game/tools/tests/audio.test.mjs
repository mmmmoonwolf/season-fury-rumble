// ทดสอบระบบเสียง — เพลงประกอบเวที
// รัน: node tools/tests/audio.test.mjs   (จากโฟลเดอร์ game)
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const fs = await import("fs");
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const scene = read("../../src/modes/scramble/ScrambleScene.js");
const stat = (p) => { try { return fs.statSync(new URL(p, import.meta.url)).size; } catch { return 0; } };

// ── มีไฟล์ทั้งสองฟอร์แมต ──
// Safari รุ่นเก่าไม่เล่น ogg · Firefox รุ่นเก่าไม่เล่น m4a — มีอันเดียวคือมีคนเล่นไม่ได้เสียงแน่ ๆ
{
  const ogg = stat("../../assets/audio/stage.ogg"), m4a = stat("../../assets/audio/stage.m4a");
  ok(ogg > 100000, `stage.ogg มีอยู่ (${Math.round(ogg / 1024)} KB)`);
  ok(m4a > 100000, `stage.m4a มีอยู่ (${Math.round(m4a / 1024)} KB)`);
  ok(ogg < 4e6 && m4a < 4e6, "ทั้งคู่ไม่เกิน 4 MB — ใหญ่กว่านี้ควรหั่นเพลงก่อน");
  const files = scene.match(/files: \[([^\]]*)\]/)?.[1] ?? "";
  ok(/stage\.ogg/.test(files) && /stage\.m4a/.test(files), "ฉากอ้างถึงทั้งสองฟอร์แมต");
}

// ── โหลดทีหลัง ไม่ใช่ใน preload() ──
//
// ไฟล์ 2.2 MB ถ้ารอให้โหลดเสร็จก่อนเข้าฉาก คนเล่นจะนั่งมองจอโหลดเพิ่มหลายวินาที
// เพื่ออะไรที่ไม่ใช่การเล่น — วัดจริงได้ว่าเข้าฉากได้ก่อนเพลงมาถึง 3.2 วินาที
{
  const pre = scene.match(/  preload\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  ok(!/load\.audio/.test(pre), "preload() ไม่มีการโหลดเสียง");
  ok(/new Phaser\.Loader\.LoaderPlugin\(this\)/.test(scene), "ใช้ตัวโหลดแยกที่สั่งเริ่มเอง");
  ok(/ld\.once\('complete', \(\) => this\._playMusic\(\)\)/.test(scene), "โหลดเสร็จแล้วค่อยเริ่มเล่น");
}

// ── ปลดล็อกเสียงตามนโยบาย autoplay ของเบราว์เซอร์ ──
{
  ok(/if \(this\.sound\.locked\) this\.sound\.once\('unlocked'/.test(scene),
    "ถ้าเบราว์เซอร์ยังล็อกเสียงอยู่ ให้รอปลดล็อกก่อนค่อยเล่น");
  ok(/loop: true/.test(scene), "เพลงวนซ้ำ");
  const vol = +(scene.match(/vol: ([\d.]+)/)?.[1] ?? 1);
  ok(vol > 0 && vol < 0.5, `ดังไม่เกินครึ่ง (${vol}) — เพลงที่กลบเสียงหมัดคือเพลงที่ตั้งดังเกินไป`);
}

// ── ปิดเสียงแล้วต้องจำไว้ข้ามรอบเล่น ──
// คนที่ปิดเสียงเพราะอยู่ที่สาธารณะ ไม่ควรต้องปิดใหม่ทุกครั้งที่เข้าเกม
{
  ok(/localStorage\.setItem\(BGM\.store/.test(scene), "จำสถานะปิดเสียงไว้");
  ok(/localStorage\.getItem\(BGM\.store\) === '1'/.test(scene), "และอ่านกลับมาตอนเริ่มฉาก");
  // ปิดไว้แล้วต้องไม่โหลดไฟล์เลย ไม่ใช่โหลดมาแล้วไม่เล่น
  ok(/_startMusic\(\) \{\s*if \(localStorage\.getItem\(BGM\.store\) === '1'\)[\s\S]{0,60}return;/.test(scene),
    "ปิดเสียงไว้แล้วไม่โหลดไฟล์เลย — ไม่ต้องจ่ายค่าเน็ต 2.2 MB ฟรี ๆ");
}

// ── ปุ่มปิดเสียงต้องกดได้ทุกโหมดและทุกหน้าจอ ──
{
  ok(/<button id="sc-mute"/.test(scene), "มีปุ่มปิดเสียง");
  ok(!/body\.sc-net #sc-mute \{[^}]*display:\s*none/.test(scene),
    "ไม่ถูกซ่อนตอนต่อเน็ต — คนที่อยู่ที่สาธารณะต้องปิดได้ทุกโหมด");
  const z = +(scene.match(/#sc-mute \{[^}]*z-index:(\d+)/)?.[1] ?? 0);
  const zSel = +(scene.match(/#sc-select \{[^}]*z-index:(\d+)/)?.[1] ?? 0);
  ok(z > zSel, `อยู่เหนือแผงเลือกตัว (${z} > ${zSel}) — เพลงเริ่มตั้งแต่หน้าเลือกตัว ถ้าปุ่มอยู่ใต้แผงก็กดไม่ได้`);
}

// ── ออกจากฉากแล้วเพลงต้องหยุด ──
// ไม่หยุด = กลับไปเมนูแล้วเพลงยังเล่นอยู่ และเข้าฉากใหม่จะได้สองเพลงซ้อนกัน
{
  ok(/this\.events\.once\('shutdown', \(\) => \{ this\.music\?\.stop\(\)/.test(scene),
    "ออกจากฉากแล้วหยุดและคืนหน่วยความจำ");
  ok(/if \(this\.music \|\| this\.muted\) return;/.test(scene), "กันเล่นซ้อนกันสองเพลง");
}
