// ตรวจว่าทุกไฟล์ใน src/ ยังแปลงเป็นโค้ดได้จริง
//
// ทำไมต้องมี: ไฟล์ฉาก (ScrambleScene.js) อ้าง Phaser ตั้งแต่ตอน import เทสต์อื่นจึงอ่านมันเป็น
// "ข้อความ" อย่างเดียว ไม่เคยให้ตัวแปลภาษาแตะเลย — วงเล็บเกินหนึ่งตัวจึงผ่านเทสต์ทั้งชุดได้สบาย
// แล้วไปโผล่เป็นจอขาวตอนเปิดเกมจริง (เจอมาแล้ว: เหลือ } ลอยจากการแก้ไฟล์ด้วยสคริปต์)
//
// ⚠️ ต้องบังคับ --input-type=module ผ่าน stdin เท่านั้น
// `node --check ไฟล์.js` ห่อโค้ดเป็น CommonJS ก่อนตรวจ วงเล็บปิดที่เกินมาจึงแค่ "ปิดตัวห่อ"
// แล้วผ่านฉลุย — ลองแล้วกับไฟล์ที่พังจริง มันบอกว่าผ่าน ทั้งที่เบราว์เซอร์ปฏิเสธ
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = path.dirname(fileURLToPath(new URL("../../", import.meta.url))) + "/game";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
  });
}

const files = walk(path.join(root, "src"));
ok(files.length > 0, `เจอไฟล์ต้นฉบับ ${files.length} ไฟล์`);
const bad = [];
for (const f of files) {
  try {
    execFileSync(process.execPath, ["--input-type=module", "--check"],
      { input: fs.readFileSync(f), stdio: "pipe" });
  } catch (e) {
    bad.push(`${path.relative(root, f)}: ${String(e.stderr).split("\n").slice(1, 4).join(" ").trim()}`);
  }
}
ok(bad.length === 0, `ทุกไฟล์แปลงเป็นโค้ดได้${bad.length ? ":\n      " + bad.join("\n      ") : ""}`);

// สคริปต์โมดูลใน index.html ก็ต้องตรวจด้วย — อยู่ในไฟล์ HTML เลยไม่มีใครตรวจมาก่อน
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const open = html.lastIndexOf('<script type="module">');
const close = html.indexOf("</script>", open);
ok(open > 0 && close > open, "หาสคริปต์โมดูลใน index.html เจอ");
let htmlErr = null;
try {
  execFileSync(process.execPath, ["--input-type=module", "--check"],
    { input: html.slice(open + '<script type="module">'.length, close), stdio: "pipe" });
} catch (e) { htmlErr = String(e.stderr).split("\n").slice(1, 4).join(" ").trim(); }
ok(htmlErr === null, `สคริปต์ใน index.html แปลงเป็นโค้ดได้${htmlErr ? ": " + htmlErr : ""}`);
