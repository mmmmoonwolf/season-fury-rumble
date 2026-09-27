// ทดสอบว่า CI ตั้งไว้ถูก — เทสต์ที่ป้องกันตัวรันเทสต์เอง
// รัน: node tools/tests/ci.test.mjs   (จากโฟลเดอร์ game)
//
// เทสต์ 1540 ข้อไม่มีค่าอะไรถ้าไม่มีใครรัน และก่อนหน้านี้ไม่มีใครรันเลย
// deploy-pages.yml เอาโฟลเดอร์ game ขึ้นเว็บทุกครั้งที่ push master โดยไม่เคยถามว่าเทสต์ผ่านไหม
import fs from "fs";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const root = new URL("../../../", import.meta.url).pathname;   // รากรีโป ไม่ใช่โฟลเดอร์ game
const wf = (n) => fs.readFileSync(root + ".github/workflows/" + n, "utf8");

// ══ ไฟล์ต้องมีอยู่ ═════════════════════════════════════════════════════════════
{
  const dir = root + ".github/workflows";
  ok(fs.existsSync(dir), "มีโฟลเดอร์ workflows");
  const files = fs.readdirSync(dir);
  ok(files.includes('tests.yml'), `มี tests.yml (${files.join(', ')})`);
  ok(files.includes('deploy-pages.yml'), "มี deploy-pages.yml");
  // YAML ห้ามมีแท็บเด็ดขาด — พาร์สไม่ผ่านแล้ว workflow ไม่รันเลยโดยไม่มีอะไรฟ้องในรีโป
  for (const f of files) {
    const body = fs.readFileSync(dir + '/' + f, "utf8");
    ok(!/\t/.test(body), `${f} ไม่มีแท็บ (YAML พาร์สไม่ผ่านแล้วเงียบ)`);
    ok(body.trimEnd().length > 0 && /^name:/m.test(body), `${f} มีชื่อ workflow`);
  }
}

// ══ เทสต์ต้องเป็นด่านก่อนขึ้นเว็บ ══════════════════════════════════════════════
//
// นี่คือข้อที่สำคัญที่สุดในไฟล์ — เกมนี้ขึ้นเว็บทุกครั้งที่ push master
// และมีคนกดเล่นจากลิงก์นั้นจริง ปล่อยของพังขึ้นไปแล้วค่อยแก้
// = คนที่เปิดในช่วงนั้นเห็นเกมเสีย
{
  const d = wf('deploy-pages.yml');
  ok(/^  test:/m.test(d), "deploy-pages.yml มี job เทสต์");
  ok(/^  deploy:\n    needs: test/m.test(d), "job deploy รอ job test (needs: test)");
  const test = d.slice(d.indexOf('  test:'), d.indexOf('  deploy:'));
  ok(/working-directory: game/.test(test), "รันจากโฟลเดอร์ game");
  ok(/run_all\.sh/.test(test), "รันตัวรันเทสต์จริง ไม่ใช่คำสั่งอื่น");
  ok(/setup-node/.test(test), "ติดตั้ง node ก่อน");
  ok(/node-version: '2\d'/.test(test), "ตรึงเวอร์ชันเมเจอร์ของ node ไม่ปล่อยตาม runner");

  // ลำดับต้องถูก: ต้องมี checkout ก่อนรันเทสต์
  const runAt = test.indexOf('run: bash tools/tests/run_all.sh');
  ok(runAt > 0, "หาบรรทัดที่สั่งรันเทสต์ได้");
  ok(test.indexOf('checkout') < runAt, "checkout ก่อนรันเทสต์");
  // เทสต์ sheet_order เรียกเครื่องมือฝั่ง Python จริง runner ไม่มีแพ็กเกจพวกนั้น ต้องลงเอง
  // CI รอบแรกแดงเพราะข้อนี้พอดี — ด่านทำงานถูกแล้ว เกมไม่ได้ขึ้นเว็บ
  ok(/pip install[^\n]*-r game\/tools\/requirements\.txt/.test(test),
    "ลง deps จาก requirements.txt ไม่ใช่พิมพ์ชื่อไว้ใน workflow");
  ok(test.indexOf('pip install') < runAt, "ลงก่อนรันเทสต์");
}

// ══ ต้องรู้ก่อนขึ้น master ไม่ใช่หลัง ═══════════════════════════════════════════
{
  const t = wf('tests.yml');
  ok(/^on:/m.test(t) && /\n  push:/.test(t), "รันตอน push");
  ok(/\n  pull_request:/.test(t), "และตอนเปิด pull request");
  ok(/branches-ignore: \[master\]/.test(t), "ข้าม master เพราะที่นั่นมี job เทสต์ของตัวเองแล้ว");
  ok(/working-directory: game/.test(t) && /run_all\.sh/.test(t), "รันชุดเดียวกันจากที่เดียวกัน");
  ok(/cancel-in-progress: true/.test(t), "push ซ้ำ ๆ ยกเลิกรอบเก่า ไม่ต่อคิวยาว");
  ok(/permissions:\s*\n\s*contents: read/.test(t), "ขอสิทธิ์แค่อ่าน — เทสต์ไม่ต้องเขียนอะไร");
  // สองไฟล์ต้องเตรียมสภาพแวดล้อมเหมือนกัน ไม่งั้นผ่านที่หนึ่งแดงที่หนึ่งด้วยเหตุผลที่ไม่ใช่โค้ด
  const d2 = wf('deploy-pages.yml');
  for (const need of ['setup-node', 'requirements.txt'])
    ok(t.includes(need) && d2.includes(need), `ทั้งสอง workflow เตรียม ${need} เหมือนกัน`);
  const ver = (src) => src.match(/node-version: '(\d+)'/)?.[1];
  ok(ver(t) === ver(d2), `ตรึง node เวอร์ชันเดียวกันทั้งสองไฟล์ (${ver(t)} / ${ver(d2)})`);
}

// ══ ตัวรันเทสต์ต้องกัน "เขียวเพราะไม่ได้รันอะไร" ═══════════════════════════════
//
// รันจากโฟลเดอร์ผิดแล้ว glob ไม่แมตช์ ลูปไม่เดินเลยสักรอบ
// ผลคือ PASS 0 FAIL 0 CRASH 0 แล้ว exit 0 = เขียวทั้งที่ไม่ได้ตรวจอะไร
// บน CI อาการนี้อ่านเหมือนผ่านเป๊ะ ๆ ซึ่งแย่กว่าแดง เพราะไม่มีใครไปดู
{
  const sh = fs.readFileSync(new URL("./run_all.sh", import.meta.url).pathname, "utf8");
  ok(/MIN_TESTS=(\d+)/.test(sh), "มีเพดานขั้นต่ำของจำนวนเทสต์");
  const min = Number(sh.match(/MIN_TESTS=(\d+)/)[1]);
  ok(min > 0, `เพดานขั้นต่ำ ${min} ข้อ`);
  ok(/-lt "\$MIN_TESTS"/.test(sh) && /exit 1/.test(sh), "ต่ำกว่าเพดานแล้ว exit 1 จริง");

  // เพดานต้องต่ำกว่าจำนวนจริงพอสมควร ไม่ต้องขยับตามทุกครั้งที่เพิ่มเทสต์
  // แต่ต้องไม่ต่ำจนไร้ความหมาย
  const files = fs.readdirSync(new URL("./", import.meta.url).pathname)
    .filter((f) => f.endsWith('.test.mjs'));
  ok(files.length >= 20, `มีไฟล์เทสต์ ${files.length} ไฟล์`);
  ok(min >= 100, "เพดานสูงพอที่จะจับเคส 'รันได้ไม่กี่ไฟล์' ด้วย ไม่ใช่แค่เคสศูนย์");
}

// ── ตัวรันต้องคืนรหัสออกที่ถูก ไม่ใช่พิมพ์ FAIL แล้ว exit 0 ──
{
  const sh = fs.readFileSync(new URL("./run_all.sh", import.meta.url).pathname, "utf8");
  ok(/\[ "\$failed" = "0" \] && \[ "\$crashed" = "0" \]/.test(sh),
    "บรรทัดสุดท้ายตัดสินรหัสออกจากทั้ง FAIL และ CRASH");
  // นับ CRASH แยกจาก FAIL เพราะเทสต์ที่ throw กลางคันไม่พิมพ์ FAIL สักบรรทัด
  ok(/crashed=\$\(\(crashed \+ 1\)\)/.test(sh), "นับเทสต์ที่ throw กลางคันแยก (ไม่พิมพ์ FAIL)");
}

// ══ requirements.txt ต้องครบตาม import จริงใน tools/*.py ════════════════════════
//
// **ข้อนี้เกิดจากความผิดพลาดจริง**: ตอนตั้ง CI ผมไล่ลง deps จากความจำ ได้ numpy กับ pillow
// CI แดงเพราะ scipy · ลงเพิ่มแล้วก็ยังไม่รู้ว่าเหลืออะไรอีก การเดาแบบนั้นผิดได้เรื่อย ๆ
// ข้อนี้อ่าน import จริงจากไฟล์แล้วเทียบ จะได้ไม่ต้องเดาอีก
{
  const fsp = await import("fs");
  const path = new URL("../", import.meta.url).pathname;        // โฟลเดอร์ tools
  const req = fsp.readFileSync(path + "requirements.txt", "utf8")
    .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)
    .map((l) => l.split(/[<>=!~ ]/)[0].toLowerCase());
  ok(req.length > 0, `requirements.txt มี ${req.length} แพ็กเกจ`);

  // ชื่อโมดูลตอน import ไม่ตรงกับชื่อแพ็กเกจตอนลงเสมอ
  const PKG = { pil: 'pillow', imageio_ffmpeg: 'imageio-ffmpeg' };
  const STD = new Set(['os', 'sys', 'json', 'wave', 'subprocess', 'math', 're', 'shutil',
    'pathlib', 'argparse', 'itertools', 'collections', 'random', 'time', 'struct', 'glob',
    'textwrap', 'hashlib', 'base64', 'io', 'csv', 'zipfile', 'functools', 'typing']);
  const localMods = new Set(fsp.readdirSync(path).filter((f) => f.endsWith('.py'))
    .map((f) => f.replace(/\.py$/, '').toLowerCase()));

  const found = new Set();
  for (const f of fsp.readdirSync(path).filter((f) => f.endsWith('.py'))) {
    for (const m of fsp.readFileSync(path + f, "utf8").matchAll(/^\s*(?:import|from)\s+([A-Za-z_]\w*)/gm)) {
      const mod = m[1].toLowerCase();
      if (STD.has(mod) || localMods.has(mod)) continue;
      found.add(PKG[mod] ?? mod);
    }
  }
  ok(found.size > 0, `เครื่องมือ import แพ็กเกจภายนอก ${found.size} ตัว: ${[...found].sort().join(', ')}`);
  const absent = [...found].filter((m) => !req.includes(m));
  ok(absent.length === 0, absent.length
    ? `import แล้วแต่ไม่อยู่ใน requirements.txt: ${absent.join(', ')}`
    : "requirements.txt ครบตาม import จริงทุกตัว");
}
