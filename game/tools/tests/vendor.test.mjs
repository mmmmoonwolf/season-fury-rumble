// ทดสอบว่าเกม "บูตขึ้น" ได้โดยไม่ต้องพึ่งเน็ตนอก และถ้าบูตไม่ขึ้นต้องมีอะไรบอกบนจอ
// รัน: node tools/tests/vendor.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมีเทสต์นี้: เดิม index.html ดึง phaser/peerjs จาก cdnjs.cloudflare.com
// ถ้าโหลดไม่สำเร็จ (เน็ตบล็อกโดเมนนั้น / CDN ล่ม / เน็ตหลุดจังหวะนั้นพอดี) จะได้ Phaser is not defined
// แล้ว <script type="module"> ทั้งก้อน throw ตั้งแต่ import แรก (Player.js: class extends Phaser...)
// = ปุ่มในล็อบบี้ไม่ถูกผูก event เลยสักปุ่ม กดแล้วเงียบสนิท หน้าค้างอยู่ที่เดิม ไม่มี error บนจอ
// ผู้ใช้เจออาการนี้จริง ("กดปุ่มเล่นกับ NPC แล้วไม่เข้าเกม") — reproduce ได้ด้วยการบล็อก cdnjs
import fs from "fs";
import path from "path";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../", import.meta.url).pathname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// ── ห้ามโหลดสคริปต์จากโดเมนอื่น ──
{
  const external = [...html.matchAll(/<script[^>]*\ssrc=["'](https?:)?\/\/[^"']+["']/g)].map((m) => m[0]);
  ok(external.length === 0, `ไม่มี <script src> ที่ชี้ออกนอกเว็บเราเลย (เจอ ${external.length}: ${external.join(" | ")})`);
  ok(!html.includes("cdnjs.cloudflare.com"), "ไม่อ้างถึง cdnjs.cloudflare.com แล้ว");
}

// ── ทุกไฟล์ที่ <script src> อ้าง ต้องมีอยู่จริง ──
// พิมพ์ path ผิด = ไฟล์ 404 = Phaser หาย = อาการเดียวกับ CDN ล่มเป๊ะ ๆ
{
  const srcs = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map((m) => m[1]);
  ok(srcs.length >= 2, `มี <script src> ของ phaser กับ peerjs (เจอ ${srcs.length})`);
  for (const src of srcs) {
    const f = path.join(root, src);
    ok(fs.existsSync(f), `ไฟล์ที่ index.html อ้างมีอยู่จริง: ${src}`);
  }
}

// ── ไฟล์ vendor ต้องเป็นของจริง และเลขเวอร์ชันในชื่อไฟล์ต้องตรงกับในตัวไฟล์ ──
// ชื่อไฟล์เป็นแหล่งข้อมูลเดียวที่บอกว่าใช้เวอร์ชันไหน ถ้าเปลี่ยนไฟล์แล้วลืมเปลี่ยนชื่อจะหลงเวอร์ชันกันยาว
{
  const cases = [
    { file: "vendor/phaser-3.70.0.min.js", version: "3.70.0", needle: (v) => `VERSION:"${v}"`, minKB: 500, global: "Phaser" },
    { file: "vendor/peerjs-1.5.5.min.js", version: "1.5.5", needle: (v) => `"${v}"`, minKB: 40, global: "Peer" },
  ];
  for (const c of cases) {
    const f = path.join(root, c.file);
    if (!fs.existsSync(f)) { ok(false, `ไม่มีไฟล์ ${c.file}`); continue; }
    const src = fs.readFileSync(f, "utf8");
    const kb = Math.round(fs.statSync(f).size / 1024);
    ok(kb >= c.minKB, `${c.file} เป็นไฟล์เต็มไม่ใช่ไฟล์เปล่า/ไฟล์ error page (${kb} KB)`);
    ok(src.includes(c.needle(c.version)), `${c.file} เป็นเวอร์ชัน ${c.version} จริงตามชื่อไฟล์`);
    ok(new RegExp(`window\\.${c.global}\\s*=`).test(src) || src.includes(`.${c.global}=`), `${c.file} ประกาศ global ${c.global} ให้ index.html ใช้`);
    ok(html.includes(`src="${c.file}"`), `index.html อ้างถึง ${c.file}`);
  }
}

// ── ตัวดักพังแบบเห็นบนจอ ──
// error ของ module script ไม่ขึ้นที่ไหนเลยนอกจาก devtools ซึ่งบนมือถือเปิดไม่ได้
// ไม่มีตัวนี้ = พังทีไรก็เห็นแค่ "ปุ่มกดไม่ติด" แยกไม่ออกจากปุ่มเสีย
{
  ok(/id="boot-error"/.test(html), "มีช่องแสดง error ตอนบูต (#boot-error) ในหน้าล็อบบี้");
  const handlerIdx = html.indexOf('window.addEventListener("error"');
  // หาแท็กจริง ไม่ใช่ที่ถูกพูดถึงในคอมเมนต์ จึงบังคับว่าต้องขึ้นต้นบรรทัด
  const moduleIdx = html.search(/^\s*<script type="module">/m);
  ok(handlerIdx !== -1, "มีตัวดัก window error");
  ok(html.includes('window.addEventListener("unhandledrejection"'), "ดัก promise ที่ reject ค้างด้วย");
  ok(handlerIdx !== -1 && moduleIdx !== -1 && handlerIdx < moduleIdx, "ตัวดักอยู่ก่อน <script type=\"module\"> (ติดตั้งทีหลังจะดักไม่ทัน)");
  const head = html.slice(0, handlerIdx);
  const lastOpen = head.lastIndexOf("<script");
  ok(!head.slice(lastOpen).includes('type="module"'), "ตัวดักเป็น script ธรรมดา ไม่ใช่ module (module พังเองก็ดักตัวเองไม่ได้)");
  ok(html.includes('typeof window.Phaser === "undefined"'), "เช็คซ้ำตอน load ว่ามี Phaser จริง (เผื่อไฟล์โหลดได้แต่เนื้อในพัง)");
}

console.log("\nBoot: no third-party CDN, vendored libs present and version-matched, failures surface on screen");
