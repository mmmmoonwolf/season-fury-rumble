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
  // ห้ามโหลด "เพลง" ใน preload() — ไม่ใช่ห้ามโหลดเสียงทุกชนิด
  // เสียงเอฟเฟครวมกันไม่ถึง 10 KB โหลดตรงนี้ได้ (และต้องโหลด ไม่งั้นหมัดแรก ๆ เงียบ)
  ok(!/load\.audio\([^)]*BGM/.test(pre) && !/stage\.(ogg|m4a)/.test(pre),
    "preload() ไม่โหลดเพลง (2.2 MB)");
  for (const m of pre.matchAll(/load\.audio\(\s*([^,]+),/g))
    ok(/sfx_/.test(m[1]), `เสียงที่โหลดใน preload() เป็นเสียงเอฟเฟคเท่านั้น (${m[1].trim()})`);
  ok(/new Phaser\.Loader\.LoaderPlugin\(this\)/.test(scene), "ใช้ตัวโหลดแยกที่สั่งเริ่มเอง");
  ok(/ld\.once\('complete', \(\) => this\._playMusic\(\)\)/.test(scene), "โหลดเสร็จแล้วค่อยเริ่มเล่น");
}

// ── ปลดล็อกเสียงตามนโยบาย autoplay ของเบราว์เซอร์ ──
{
  ok(/if \(this\.sound\.locked\) this\.sound\.once\('unlocked'/.test(scene),
    "ถ้าเบราว์เซอร์ยังล็อกเสียงอยู่ ให้รอปลดล็อกก่อนค่อยเล่น");
  ok(/loop: true/.test(scene), "เพลงวนซ้ำ");
  const bgmBlock = scene.match(/const BGM = \{[\s\S]*?\};/)?.[0] ?? "";
  const vol = +(bgmBlock.match(/vol: ([\d.]+)/)?.[1] ?? 1);
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

// ── เครดิตเพลงต้องอยู่ในหน้าเมนูจริง ──
//
// ต้นทางกำหนดให้ใส่เครดิต และเกมนี้เผยแพร่สาธารณะบน GitHub Pages ไม่ใช่ใช้ส่วนตัว
// เงื่อนไขจึงต่างกัน — ถ้าเครดิตหายไปตอนไหน เท่ากับผิดเงื่อนไขทันที
{
  const html = read("../../index.html");
  ok(/<div id="credits">/.test(html), "มีบล็อกเครดิตในหน้าเมนู");
  ok(/Vibe Mountain/.test(html), "ระบุชื่อศิลปิน");
  ok(/Operatic 3/.test(html), "ระบุชื่อเพลง");

  // ต้องอยู่นอก #lobby ทั้งก้อน — การ์ดข้างในมีประวัติว่าพอสูงเกินแล้วปุ่มบนสุด
  // ถูกดันออกนอกจอบนมือถือแนวนอนเงียบ ๆ (วัดได้ y = -87 ตอนนั้น)
  // เดินนับความลึกของ <div> จาก <div id="lobby"> เพื่อหาว่ามันปิดตรงไหนจริง ๆ
  {
    const start = html.indexOf('<div id="lobby">');
    let i = start, depth = 0, close = -1;
    const tag = /<div\b|<\/div>/g; tag.lastIndex = start;
    for (let m; (m = tag.exec(html)); ) {
      depth += m[0] === '</div>' ? -1 : 1;
      if (depth === 0) { close = m.index; break; }
    }
    ok(close > start && html.indexOf('<div id="credits">') > close,
      "เครดิตอยู่นอก #lobby — เพิ่มบรรทัดแล้วไม่กระทบความสูงของการ์ด");
  }

  // ซ่อนตอนเริ่มเกม ไม่งั้นค้างทับปุ่มควบคุมมือถือที่อยู่ขอบล่างพอดี
  ok(/getElementById\("credits"\)\.style\.display = "none"/.test(html),
    "ซ่อนตอนเริ่มเกม — ไม่ค้างทับปุ่มควบคุมมือถือ");
  ok(/#credits \{[^}]*pointer-events: none/.test(html),
    "ไม่ขวางการกดปุ่ม แม้ตอนยังแสดงอยู่บนจอเตี้ย");

  // ช่องต้นทางคือ Free Music (@freemusicc) — ให้เครดิตถึงช่อง ไม่ใช่แค่ชื่อศิลปิน
  // เพราะคนที่เห็นเกมแล้วอยากได้เพลง ต้องตามกลับไปหาต้นทางได้จริง
  ok(/Free Music/.test(html), "ระบุชื่อช่องต้นทาง");
  const link = html.match(/<a href="(https:\/\/www\.youtube\.com\/@freemusicc)"[^>]*>/);
  ok(link, "มีลิงก์กลับไปช่องต้นทาง");
  ok(link && /rel="noopener noreferrer"/.test(link[0]),
    "ลิงก์ออกนอกเว็บต้องมี noopener — ไม่ให้หน้าปลายทางจับ window.opener ของเกมได้");
  ok(/#credits a \{[^}]*pointer-events: auto/.test(html),
    "ลิงก์กดได้จริง แม้ทั้งบล็อกจะ pointer-events:none");
}


// ══ เสียงเอฟเฟค ══════════════════════════════════════════════════════════════
//
// ตรงข้ามกับเพลงทุกข้อ: เล็กมาก โหลดใน preload() เล่นครั้งเดียวจบ ไม่วน
// และต้องตัดสั้น — ไฟล์ดิบจาก ElevenLabs ยาว 5-7 วินาที แต่ตัวเสียงจริงยาวไม่ถึงหนึ่งในสิบนั้น
{
  const sfxBlock = scene.match(/const SFX = \{[\s\S]*?\n\};/)?.[0] ?? "";
  ok(sfxBlock.length > 0, "มีบล็อกตั้งค่าเสียงเอฟเฟค");

  const banks = [...sfxBlock.matchAll(/(\w+): \{ files: \[([^\]]*)\]([^}]*)\}/g)];
  ok(banks.length > 0, `มีชุดเสียงอย่างน้อยหนึ่งชุด (${banks.length})`);

  const names = new Set();
  for (const [, bank, list] of banks)
    for (const m of list.matchAll(/'([^']+)'/g)) names.add(m[1]);

  // ── ทั้งสองฟอร์แมตต้องมีครบทุกไฟล์ ──
  // เหตุผลเดียวกับเพลง: Safari เก่าไม่เล่น ogg · Firefox เก่าไม่เล่น m4a
  // ขาดอันใดอันหนึ่ง = มีคนกลุ่มหนึ่งเล่นแล้วหมัดเงียบสนิท ซึ่งแยกไม่ออกจากเกมพัง
  for (const n of names) {
    const ogg = stat(`../../assets/audio/sfx/${n}.ogg`);
    const m4a = stat(`../../assets/audio/sfx/${n}.m4a`);
    ok(ogg > 500 && m4a > 500, `${n} มีครบสองฟอร์แมต (ogg ${ogg}B · m4a ${m4a}B)`);
  }

  // ── ต้องถูกตัดสั้นจริง ──
  //
  // อ่านความยาวจาก granule position ของหน้าสุดท้ายในไฟล์ ogg ซึ่งนับเป็นจำนวนตัวอย่าง
  // เทสต์นี้จับกรณีที่ลืมรันสคริปต์ตัด แล้วเอาไฟล์ดิบ 6 วินาทีใส่เกมไปตรง ๆ
  // ซึ่งดูจากขนาดไฟล์อย่างเดียวไม่แน่ เพราะความเงียบบีบแล้วเล็กมาก
  const oggSeconds = (p) => {
    let b;
    try { b = fs.readFileSync(new URL(p, import.meta.url)); } catch { return -1; }
    const last = b.lastIndexOf("OggS");
    if (last < 0) return -1;
    return Number(b.readBigUInt64LE(last + 6)) / 44100;
  };
  for (const n of names) {
    const d = oggSeconds(`../../assets/audio/sfx/${n}.ogg`);
    ok(d > 0.01 && d < 0.4,
      `${n} ยาว ${(d * 1000).toFixed(0)} ms — อยู่ในช่วงที่เล่นรัวได้ (ต่ำกว่า 400 ms)`);
  }

  // ── โหลดใน preload() ──
  // ของเล็กขนาดนี้ถ้าโหลดทีหลังเหมือนเพลง หมัดสิบวินาทีแรกของเกมจะเงียบ
  // ซึ่งคือช่วงที่คนตัดสินว่าเกมรู้สึกดีไหมพอดี
  {
    const pre = scene.match(/  preload\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
    ok(/SFX\.dir/.test(pre), "เสียงเอฟเฟคโหลดใน preload()");
  }

  // ── สุ่มเสียงสูงต่ำทุกครั้งที่เล่น ──
  // หูจับความซ้ำจากระดับเสียงก่อนจับจากตัวเสียง ไฟล์ 2 อันจึงฟังเหมือนมีสิบกว่าอัน
  ok(/jitter: \d+/.test(sfxBlock), "ตั้งค่าการสุ่มเสียงสูงต่ำไว้");
  ok(/detune: \(b\.detune \?\? 0\) \+ \(Math\.random\(\) \* 2 - 1\) \* SFX\.jitter/.test(scene),
    "สุ่มเสียงสูงต่ำจริงตอนเล่น ไม่ใช่ตั้งค่าไว้เฉย ๆ");

  // ── กันเสียงเดียวกันซ้อนกันเอง ──
  // ระเบิดโดนทั้งสองคนพร้อมกัน = เล่นไฟล์เดียวกันห่างกันไม่ถึงเฟรม
  // ไฟล์เดียวกันซ้อนห่างไม่กี่มิลลิวินาทีจะหักล้างกันเป็นเสียงหวีด ไม่ใช่ดังขึ้น
  ok(/gap: \d+/.test(sfxBlock), "ตั้งระยะห่างขั้นต่ำระหว่างเสียงเดียวกันไว้");
  ok(/now - \(this\._sfxAt\[name\] \|\| -1e9\) < SFX\.gap/.test(scene), "เช็คระยะห่างจริงตอนเล่น");

  // ── ปิดเสียงแล้วต้องเงียบทั้งหมด ไม่ใช่เงียบแค่เพลง ──
  ok(/_sfx\(name, opts\) \{\s*\n\s*if \(this\.muted\) return;/.test(scene),
    "ปิดเสียงแล้วเสียงเอฟเฟคเงียบด้วย");

  // ── ระดับเสียงรวมต้องไม่เกิน 1 ──
  const base = +(sfxBlock.match(/vol: ([\d.]+),\s*\/\//)?.[1] ?? 1);
  let worst = base;
  for (const [, , , extra] of banks) {
    const v = +(extra.match(/vol: ([\d.]+)/)?.[1] ?? 1);
    worst = Math.max(worst, base * v);
  }
  ok(worst <= 1, `ดังรวมกันไม่เกินเพดาน (สูงสุด ${worst.toFixed(2)})`);
  ok(base < 1, `เสียงเอฟเฟคมีเพดานรวม (${base}) ปรับที่เดียวได้`);

  // ── ซิมต้องไม่รู้จักเสียง ──
  //
  // กฎเดียวกับที่ใช้กับภาพมาตลอดโปรเจกต์ `core.js` ห้ามมี Phaser ห้ามอ่านนาฬิกาจริง
  // ห้ามสุ่ม — เสียงเอฟเฟคสุ่มไฟล์และสุ่มระดับเสียง ถ้าหลุดเข้าไปในซิมเมื่อไหร่
  // เล่นข้ามเครื่องจะเดินไม่ตรงกันทันที
  const core = read("../../src/modes/scramble/core.js");
  ok(!/_sfx|this\.sound|SFX\./.test(core), "core.js ไม่รู้จักเสียงเลย");

  // ── ต่อเข้ากับอีเวนต์ตีจริง ──
  // แบ่งเบา/หนักด้วย hitstop ตัวเดียวกับที่ใช้สั่นจอ ภาพกับเสียงจึงไล่ระดับพร้อมกัน
  ok(/this\._sfx\(hs >= \d+ \? 'hitHeavy' : 'hitLight'\)/.test(scene),
    "อีเวนต์ตีเล่นเสียง และแบ่งหนักเบาด้วยค่าเดียวกับที่ใช้สั่นจอ");
}
