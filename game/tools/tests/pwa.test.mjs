// ทดสอบ PWA — ติดไอคอนหน้าจอแล้วเปิดเล่นได้โดยไม่ต้องมีเน็ต
// รัน: node tools/tests/pwa.test.mjs   (จากโฟลเดอร์ game)
//
// **ของที่พังแล้วพังถาวรที่สุดในเว็บคือ service worker ที่เขียนผิด**
// มันอยู่ระหว่างผู้ใช้กับเซิร์ฟเวอร์ เสิร์ฟของเก่าค้างได้ตลอดกาล
// และผู้ใช้แก้เองไม่ได้นอกจากล้างข้อมูลเว็บทิ้ง — ซึ่งไม่มีใครรู้ว่าต้องทำ
// เทสต์ชุดนี้จึงเน้นที่ "กันพังถาวร" มากกว่า "ทำงานถูก"
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const read = (p) => fs.readFileSync(root + p, "utf8");
const html = read("index.html");
const sw = read("sw.js");
const mf = JSON.parse(read("manifest.webmanifest"));

// ══ manifest ═══════════════════════════════════════════════════════════════════
{
  ok(mf.name && mf.short_name, `มีชื่อทั้งแบบเต็มและแบบสั้น (${mf.short_name})`);
  // ทุก path ต้องเป็น relative — GitHub Pages เสิร์ฟจากโฟลเดอร์ย่อย ไม่ใช่รากโดเมน
  // ใส่ "/" นำหน้าเมื่อไหร่ เปิดจากหน้าโฮมสกรีนจะไปโผล่ที่ mmmmoonwolf.github.io ว่าง ๆ
  ok(!mf.start_url.startsWith('/'), `start_url เป็น relative (${mf.start_url})`);
  ok(!mf.scope.startsWith('/'), `scope เป็น relative (${mf.scope})`);
  ok(mf.icons.every((i) => !i.src.startsWith('/')), "path ของไอคอนก็ relative");
  ok(mf.orientation === 'landscape', "บังคับแนวนอน — แมพเป็น 16:9 แนวตั้งเล่นไม่ได้");
  ok(mf.background_color === '#0f172a' && mf.theme_color === '#0f172a',
    "สีพื้นตรงกับ backgroundColor ของเกม — ไม่งั้นตอนเปิดจะเห็นขาววาบก่อน");
  ok(mf.icons.some((i) => i.sizes === '192x192') && mf.icons.some((i) => i.sizes === '512x512'),
    "มีไอคอนครบทั้ง 192 และ 512 (Android ต้องการทั้งคู่)");
  ok(mf.icons.some((i) => i.purpose === 'maskable'),
    "มีไอคอนแบบ maskable — ไม่มีแล้ว Android จะตัดขอบเป็นวงกลมทับตัวละคร");
}

// ── ไฟล์ไอคอนต้องมีจริงและขนาดตรงกับที่ประกาศ ──
//
// manifest ที่ชี้ไปไฟล์ผิดขนาดถูกเมินทั้งอัน โดยไม่มี error ให้เห็นที่ไหนเลย
{
  const png = (p) => {
    const b = fs.readFileSync(root + p);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };   // IHDR
  };
  for (const i of mf.icons) {
    const path = i.src;
    if (!fs.existsSync(root + path)) { ok(false, `ไอคอนหาย: ${i.src}`); continue; }
    const { w, h } = png(path);
    const [ew, eh] = i.sizes.split('x').map(Number);
    ok(w === ew && h === eh, `${i.src} ขนาด ${w}x${h} ตรงกับที่ประกาศ (${i.sizes})`);
  }
  for (const p of ['assets/icons/apple-touch-icon.png', 'assets/icons/favicon-32.png'])
    ok(fs.existsSync(root + p), `มี ${p}`);
}

// ══ iOS ไม่อ่าน manifest ต้องบอกแยกทุกอย่าง ════════════════════════════════════
{
  ok(/rel="manifest"/.test(html), "หน้าเว็บลิงก์ manifest");
  ok(/rel="apple-touch-icon"/.test(html), "มีไอคอนสำหรับ iOS แยกต่างหาก");
  ok(/apple-mobile-web-app-capable/.test(html), "เปิดจากโฮมสกรีนแล้วไม่มีแถบที่อยู่ของ Safari");
  ok(/name="theme-color"/.test(html), "มีสีธีม");
}

// ══ service worker — ข้อที่กันพังถาวร ══════════════════════════════════════════
{
  // 1. แตะเฉพาะ GET ของโดเมนตัวเอง
  //    สัญญาณต่อห้องของ PeerJS เป็นการเชื่อมต่อข้ามโดเมน เข้าไปยุ่งเมื่อไหร่ต่อห้องพังทันที
  ok(/req\.method !== 'GET'/.test(sw), "ไม่แตะอย่างอื่นนอกจาก GET");
  ok(/url\.origin !== self\.location\.origin/.test(sw), "ไม่แตะคำขอข้ามโดเมน (สัญญาณต่อห้อง)");

  // 2. ไม่เก็บคำตอบที่ใช้ไม่ได้ — เก็บ 404 ไว้แล้วจะเสิร์ฟของเสียซ้ำ ๆ ตลอดไป
  ok(/res\.ok && res\.type === 'basic'/.test(sw), "เก็บเฉพาะคำตอบที่ใช้ได้จริง ไม่เก็บ 404 หรือ opaque");

  // 3. ต้องอัปเดตถึงมือคนเล่นได้โดยไม่ต้องพึ่งความจำใครในการเปลี่ยนเลขเวอร์ชัน
  ok(/skipWaiting/.test(sw) && /clients\.claim/.test(sw), "ตัวใหม่เข้าแทนที่ทันที ไม่รอปิดแท็บ");
  // เปลือกต้องเป็น network-first: deploy แล้วเทสบนมือถือจริงทุกครั้ง
  // เสิร์ฟของเก่าก่อนเมื่อไหร่ คนเทสจะเจอบิลด์เมื่อวานแล้วรายงานบั๊กที่แก้ไปแล้ว
  const shell = sw.slice(sw.indexOf('async function shellFresh'));
  const fetchAt = shell.indexOf('await fetch(req)');
  const cacheAt = shell.indexOf('cache.match(req)');
  ok(fetchAt > 0 && cacheAt > fetchAt, "เปลือกลองเน็ตก่อนแคช (network-first)");
  ok(/catch \(err\)[\s\S]{0,160}cache\.match/.test(shell), "ต่อเน็ตไม่ได้ถึงใช้ของในแคช");
  // ของหนักต้องกลับกัน — แคชก่อน ไม่งั้นเปิดออฟไลน์แล้วอาร์ตไม่ขึ้น
  const asset = sw.slice(sw.indexOf('async function assetFirst'), sw.indexOf('async function shellFresh'));
  ok(asset.indexOf('caches.match(req)') < asset.indexOf('await fetch(req)'), "ของหนักเอาแคชก่อน (cache-first)");

  // 4. ลบแคชเก่า ไม่งั้นพื้นที่บวมขึ้นทุกครั้งที่ deploy
  ok(/caches\.keys\(\)[\s\S]{0,200}caches\.delete/.test(sw), "ลบแคชของเวอร์ชันก่อนตอน activate");

  // 5. ไฟล์เดียวโหลดไม่ขึ้นต้องไม่ทำให้ติดตั้งล้มทั้งชุด
  //    addAll ล้มทั้งก้อนถ้ามีอันไหนพลาด แล้วผู้ใช้จะไม่มี service worker เลย
  ok(!/\.addAll\(/.test(sw), "ไม่ใช้ addAll (ล้มทั้งก้อนถ้ามีไฟล์เดียวพลาด)");
  ok(/c\.add\(u\)\.catch/.test(sw), "โหลดล่วงหน้าทีละไฟล์ พลาดอันไหนข้ามอันนั้น");
}

// ── รายการที่โหลดล่วงหน้าต้องมีไฟล์อยู่จริงทุกอัน ──
//
// ชี้ไปไฟล์ที่ไม่มี = ติดตั้งสำเร็จแต่เปิดออฟไลน์ไม่ขึ้น ซึ่งรู้ตัวตอนไม่มีเน็ตแล้วเท่านั้น
{
  const list = sw.slice(sw.indexOf('const PRECACHE'), sw.indexOf('];', sw.indexOf('const PRECACHE')));
  const paths = [...list.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  const missing = paths.filter((p) => !fs.existsSync(root + p));
  ok(paths.length >= 10, `โหลดล่วงหน้า ${paths.length} ไฟล์`);
  ok(missing.length === 0, missing.length ? `ไฟล์หาย: ${missing.join(' ')}` : "ไฟล์ที่โหลดล่วงหน้ามีครบทุกอัน");

  // โมดูลทุกตัวที่เกมต้องใช้ต้องอยู่ในรายการ ไม่งั้นเปิดออฟไลน์แล้วจอขาว
  const mods = fs.readdirSync(root + 'src', { recursive: true })
    .filter((f) => String(f).endsWith('.js')).map((f) => 'src/' + String(f).replace(/\\/g, '/'));
  const absent = mods.filter((m) => !paths.includes(m));
  ok(absent.length === 0, absent.length ? `โมดูลที่ยังไม่ได้โหลดล่วงหน้า: ${absent.join(' ')}` : `โมดูลครบทั้ง ${mods.length} ไฟล์`);
}

// ══ ลงทะเบียนแบบที่พังแล้วไม่ลามไปที่เกม ═══════════════════════════════════════
{
  ok(/"serviceWorker" in navigator/.test(html), "เช็คว่าเบราว์เซอร์รองรับก่อน");
  ok(/location\.protocol\.startsWith\("http"\)/.test(html), "ไม่ลงทะเบียนตอนเปิดจากไฟล์ตรง ๆ");
  ok(/register\("\.\/sw\.js", \{ scope: "\.\/" \}\)/.test(html), "path เป็น relative (GitHub Pages อยู่ในโฟลเดอร์ย่อย)");
  ok(/\.catch\(function \(\) \{\}\)/.test(html), "ลงทะเบียนไม่สำเร็จก็เงียบ ไม่ throw ใส่หน้าเกม");
  const reg = html.slice(html.indexOf('serviceWorker'), html.indexOf('serviceWorker') + 500);
  ok(/try \{/.test(html.slice(Math.max(0, html.indexOf('serviceWorker') - 400), html.indexOf('serviceWorker'))),
    "ห่อ try ไว้ทั้งก้อน");
}

// ── ของหนักกับเปลือกต้องแยกกลยุทธ์กันจริง ──
//
// assets รวม ~38 MB โหลดล่วงหน้าทั้งหมดไม่ได้ ต้องเป็นแบบเจอแล้วค่อยเก็บ
{
  ok(/url\.pathname\.includes\('\/assets\/'\)/.test(sw), "แยกของหนักออกจากเปลือก");
  ok(/assetFirst/.test(sw) && /shellFresh/.test(sw), "สองชั้นใช้กลยุทธ์คนละแบบ");
  const pre = sw.slice(sw.indexOf('const PRECACHE'), sw.indexOf('];', sw.indexOf('const PRECACHE')));
  ok(!/assets\/(characters|audio|stage|vfx)/.test(pre),
    "ไม่โหลดอาร์ต/เสียงล่วงหน้า (ใหญ่เกินไป เล่นอะไรไปแล้วอันนั้นถึงเก็บ)");
}
