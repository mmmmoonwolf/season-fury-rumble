// ทดสอบว่าล็อบบี้กับในเกมเป็นระบบภาพเดียวกัน (สี + ฟอนต์)
// รัน: node tools/tests/theme.test.mjs   (จากโฟลเดอร์ game)
//
// เดิมเป็นสองจานสีที่ไม่คุยกัน: ล็อบบี้เทาฟ้า+ส้มแบบ Tailwind
// ในเกมครีมกระดาษ+แดงชาดซึ่งเป็นสีของตัวละครกับเวทีจริง
// รอยต่ออยู่ตรงปุ่ม "เล่นคนเดียว" เป๊ะ — กดแล้วเหมือนข้ามไปอีกเกม
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const scene = fs.readFileSync(root + "src/modes/scramble/ScrambleScene.js", "utf8");

// ══ ฟอนต์ที่โค้ดอ้าง ต้องมีคนโหลดจริง ═════════════════════════════════════════
//
// โค้ดอ้าง "Chakra Petch" อยู่หกจุดมาตั้งแต่ต้น แต่ไม่มี @font-face ไม่มีลิงก์ ไม่มีไฟล์
// ทุกจุดจึงตกไปใช้ system-ui เงียบ ๆ = ได้ฟอนต์คนละตัวในแต่ละเครื่อง
// เป็นบั๊กที่มองไม่เห็นเพราะมันไม่พัง แค่ได้ของที่ไม่ได้ตั้งใจ
{
  const asked = new Set();
  for (const src of [html, scene])
    for (const m of src.matchAll(/'([^']+)', system-ui|"([^"]+)", system-ui/g))
      asked.add((m[1] || m[2]).replace(/['"]/g, ''));
  for (const m of html.matchAll(/font-family:'([^']+)'/g)) asked.add(m[1]);
  ok(asked.size > 0, `โค้ดอ้างฟอนต์: ${[...asked].join(', ')}`);

  const faces = [...html.matchAll(/@font-face \{[^}]*font-family:'([^']+)'[\s\S]*?src:url\(([^)]+)\)/g)];
  ok(faces.length >= 6, `มี @font-face ${faces.length} ชุด (น้ำหนัก × ชุดอักษร)`);
  const loaded = new Set(faces.map((f) => f[1]));
  const orphan = [...asked].filter((a) => !loaded.has(a) && a !== 'system-ui');
  ok(orphan.length === 0, orphan.length ? `อ้างแต่ไม่มีใครโหลด: ${orphan.join(', ')}` : "ฟอนต์ที่อ้างถูกโหลดจริงทุกตัว");

  const missing = faces.map((f) => f[2]).filter((u) => !fs.existsSync(root + u));
  ok(missing.length === 0, missing.length ? `ไฟล์ฟอนต์หาย: ${missing.join(' ')}` : "ไฟล์ฟอนต์มีครบทุกไฟล์");
}

// ── แยกชุดอักษรไทย/ละติน และไม่หยุดรอฟอนต์ ──
{
  ok(/unicode-range:U\+0E01-0E5B/.test(html.replace(/\s+/g, '')) ||
     /U\+0E01-0E5B/.test(html), "มีชุดอักษรไทย (UI ของเกมเป็นไทยเกือบทั้งหมด)");
  ok(/U\+0000-00FF/.test(html), "มีชุดอักษรละติน");
  const swap = (html.match(/font-display:swap/g) ?? []).length;
  ok(swap >= 6, `ทุกชุดใช้ font-display:swap (${swap}) — เห็นตัวหนังสือทันที ไม่ใช่จอว่างรอฟอนต์`);
}

// ══ สัญญาอนุญาต — OFL บังคับให้แนบไปด้วย (ต่างจาก CC0 ของเสียง) ════════════════
{
  ok(fs.existsSync(root + "vendor/fonts/OFL.txt"), "แนบข้อความสัญญาอนุญาต SIL OFL มาด้วย");
  const ofl = fs.readFileSync(root + "vendor/fonts/OFL.txt", "utf8");
  ok(/SIL Open Font License/.test(ofl), "เป็นข้อความ OFL จริง");
  ok(/Copyright/.test(ofl), "มีบรรทัดลิขสิทธิ์ของผู้ทำฟอนต์");
  ok(fs.existsSync(root + "vendor/fonts/README.md"), "มีบันทึกว่ามาจากไหนและทำไมเก็บในรีโป");
}

// ══ จานสีเดียว ═════════════════════════════════════════════════════════════════
{
  // สีในเกมมาจากอาร์ตจริง จึงเป็นตัวตั้ง — ล็อบบี้ต้องมาหามัน ไม่ใช่กลับกัน
  const C = scene.match(/const C = \{[\s\S]*?\};/)[0];
  const ink = C.match(/ink: '(#[0-9a-f]{6})'/i)[1];
  const dim = C.match(/dim: '(#[0-9a-f]{6})'/i)[1];
  const scarf = C.match(/nyxScarf: 0x([0-9a-f]{6})/i)[1];

  const tok = (n) => html.match(new RegExp('--' + n + ': (#[0-9a-f]{6})', 'i'))?.[1];
  ok(tok('ink')?.toLowerCase() === ink.toLowerCase(), `--ink ตรงกับ C.ink ในฉาก (${tok('ink')})`);
  ok(tok('dim')?.toLowerCase() === dim.toLowerCase(), `--dim ตรงกับ C.dim (${tok('dim')})`);
  ok(tok('crimson')?.toLowerCase() === '#' + scarf.toLowerCase(),
    `--crimson ตรงกับผ้าพันคอของ Nyx (${tok('crimson')})`);
  ok(tok('bg') && tok('card') && tok('gold'), "มีโทเคนสีครบชุด");
}

// ── สีชุดเก่าของ Tailwind ต้องไม่เหลืออยู่ในส่วนที่คนเล่นเห็น ──
//
// ยกเว้นในคอมเมนต์ (ที่อธิบายว่าเคยเป็นอะไร) และหน้าเตือน file:// ซึ่งเป็นหน้าสำหรับนักพัฒนา
{
  const lines = html.split('\n');
  const old = /#f97316|#facc15|#1e293b|#334155|#475569|#7dd3fc|#94a3b8|#f1f5f9|#0f172a|#e2e8f0/;
  const bad = [];
  // ต้องตัดคอมเมนต์ที่คร่อมหลายบรรทัดออกด้วย — คอมเมนต์ที่อธิบายว่า "เคยเป็นสีอะไร"
  // มีชื่อสีเก่าอยู่ในนั้นโดยตั้งใจ ไม่ใช่สีที่ใช้จริง
  let inComment = false, inDevWarning = false;
  lines.forEach((l, i) => {
    if (/id="file-protocol-warning"/.test(l)) inDevWarning = true;
    else if (inDevWarning && /<\/div>/.test(l)) inDevWarning = false;
    let code = l;
    if (inComment) {
      const end = code.indexOf('*/');
      if (end < 0) return;
      inComment = false; code = code.slice(end + 2);
    }
    code = code.replace(/\/\*.*?\*\//g, '').replace(/<!--.*?-->/g, '');
    const open = Math.max(code.lastIndexOf('/*'), code.lastIndexOf('<!--'));
    if (open >= 0) { inComment = true; code = code.slice(0, open); }
    if (inDevWarning) return;
    if (old.test(code)) bad.push(`บรรทัด ${i + 1}: ${code.trim().slice(0, 60)}`);
  });
  ok(bad.length === 0, bad.length ? `สีชุดเก่ายังเหลือ:\n  ${bad.join('\n  ')}` : "ไม่มีสีชุดเก่าเหลือในส่วนที่คนเล่นเห็น");
}

// ── เล่นด้วยคีย์บอร์ดต้องเห็นโฟกัส ──
{
  ok(/:focus-visible/.test(html), "มี :focus-visible");
  const fv = html.match(/[^}]*:focus-visible[^{]*\{[^}]*\}/)[0];
  ok(/outline:/.test(fv), "และวาดเส้นขอบให้เห็นจริง");
  for (const sel of ['.lobby-btn', '.lobby-input'])
    ok(html.includes(sel + ':focus-visible'), `${sel} มีสถานะโฟกัส`);
}

// ── ฟอนต์ต้องอยู่ในรายการโหลดล่วงหน้าของ service worker ──
//
// ไม่อยู่ = เปิดออฟไลน์แล้วตัวหนังสือเปลี่ยนหน้าตา ซึ่งดูเหมือนหน้าพังมากกว่าดูเหมือนไม่มีเน็ต
{
  const sw = fs.readFileSync(root + "sw.js", "utf8");
  const pre = sw.slice(sw.indexOf('const PRECACHE'), sw.indexOf('];', sw.indexOf('const PRECACHE')));
  const fonts = fs.readdirSync(root + "vendor/fonts").filter((f) => f.endsWith('.woff2'));
  const absent = fonts.filter((f) => !pre.includes(f));
  ok(fonts.length === 6, `มีไฟล์ฟอนต์ ${fonts.length} ไฟล์`);
  ok(absent.length === 0, absent.length ? `ยังไม่ได้โหลดล่วงหน้า: ${absent.join(' ')}` : "โหลดล่วงหน้าครบทุกไฟล์");
}
