// ทดสอบการเล่นสองคนคนละเครื่อง (lockstep) — ทั้งหมดรันในหน่วยความจำ ไม่ต้องมีเน็ต
//
// ความเสี่ยงจริงของ netplay ไม่ใช่ท่อส่งข้อมูล แต่คือ "สอง sim ต้องเดินตรงกันเป๊ะ"
// เทสต์ชุดนี้จึงสร้าง Game สองตัวแยกกัน ส่งให้กันแค่ตัวเลขปุ่มที่กด แล้วเทียบสถานะทุกเฟรม
// ถ้าที่ไหนในแกนมีอะไรสุ่ม/อ่านเวลาจริง/ขึ้นกับลำดับที่ไม่คงที่ เทสต์นี้จะจับได้ทันที
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, CHARACTERS } = await import(G + "/core.js");
const { Lockstep, packInput, unpackInput, NET_DELAY, HELD_MASK, PRESS_MASK } = await import(G + "/netplay.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

const NONE = { left: 0, right: 0, up: 0, down: 0, jump: 0, attack: 0, block: 0, run: 0, skill1: 0, skill2: 0, skill3: 0 };
const inp = (o = {}) => ({ ...NONE, ...o, p: { ...(o.p ?? {}) } });

// ── บีบ/คลายอินพุตต้องได้ของเดิมกลับมาครบ ──
{
  const all = inp({ left: 1, right: 1, up: 1, down: 1, jump: 1, attack: 1, block: 1, skill1: 1, skill2: 1, skill3: 1,
    p: { left: 1, right: 1, jump: 1, attack: 1, block: 1, skill1: 1, skill2: 1, skill3: 1 } });
  const back = unpackInput(packInput(all));
  const keys = ["left","right","up","down","jump","attack","block","skill1","skill2","skill3"];
  ok(keys.every((k) => back[k] === 1), "ปุ่มที่กดค้างครบทุกปุ่มหลังบีบ/คลาย");
  ok(["left","right","jump","attack","block","skill1","skill2","skill3"].every((k) => back.p[k] === 1),
    "ปุ่มที่เพิ่งกดครบทุกปุ่มหลังบีบ/คลาย");

  const none = unpackInput(packInput(inp()));
  ok(keys.every((k) => !none[k]), "ไม่กดอะไรเลยก็ได้ค่าว่างกลับมา");
  ok(packInput(inp()) === 0, "ไม่กดอะไร = 0 (แพ็คเก็ตเล็กสุด)");

  // ปุ่มแต่ละปุ่มต้องไม่ทับบิตกัน
  const bits = new Set();
  for (const k of keys) bits.add(packInput(inp({ [k]: 1 })));
  ok(bits.size === keys.length, `ปุ่มค้างแต่ละปุ่มใช้บิตของตัวเอง (${bits.size}/${keys.length})`);
}

/** จำลองท่อส่งข้อมูลที่มีหน่วง — คิวแพ็คเก็ตแล้วปล่อยตามจำนวนรอบที่กำหนด */
function link(lagA = 0, lagB = 0) {
  const qa = [], qb = [];
  return {
    sendFromA: (pk) => qb.push({ pk, due: lagA }),
    sendFromB: (pk) => qa.push({ pk, due: lagB }),
    /** เดินเวลาไปหนึ่งรอบ คืนแพ็คเก็ตที่ถึงมือแต่ละฝั่ง — ที่ยังไม่ถึงกำหนดต้องค้างในคิวต่อ */
    tick() {
      const drain = (q) => {
        const out = [], keep = [];
        for (const e of q) (--e.due < 0 ? out : keep).push(e);
        q.length = 0; q.push(...keep);
        return out.map((e) => e.pk);
      };
      return [drain(qa), drain(qb)];
    },
  };
}

/** สถานะที่ต้องตรงกันทั้งสองเครื่อง — ทุกอย่างที่มองเห็นบนจอ */
const snap = (g) => [g.frame, ...[g.p1, g.p2].flatMap((f) => [
  Math.round(f.x * 1000), Math.round(f.y * 1000), Math.round(f.vx * 1000), Math.round(f.vy * 1000),
  f.state, f.moveId ?? "-", f.moveF, f.hp, f.facing, f.stun, f.hitstop, f.invuln, f.ki, f.comboHits,
  // สถานะที่ตัวละครรุ่นหลังเพิ่มเข้ามา — ถ้าไม่เทียบด้วย desync ของ Alecto/Atlas จะรอดสายตา
  f.char, f.lash, f.lashF, f.armorLeft, f.burn, f.burnF, f.veil, f.dustGuard,
]),
  g.shots.length,
  ...g.shots.map((s) => [s.owner, Math.round(s.x * 1000), Math.round(s.y * 1000), Math.round(s.vx * 1000), s.dead ? 1 : 0].join(",")),
  // ระบบยก: ถ้าสองเครื่องนับหลอดคนละแบบ จะกลายเป็นคนละยกกันโดยไม่มีใครรู้
  g.dust ? Math.round(g.dust.x) + ':' + g.dust.life : '-',
  g.match.round, g.match.freeze, g.match.winner ?? '-', g.match.bars.join(','),
  g.fires.length,
  ...g.fires.map((fi) => [fi.owner, Math.round(fi.x * 1000), fi.life, fi.t].join(",")),
].join("|");

/** เล่นสองเครื่องด้วยสคริปต์ปุ่มที่กำหนด แล้วคืนว่าสถานะตรงกันตลอดไหม */
function playApart(scriptA, scriptB, { lagA = 0, lagB = 0, frames = 260, c1 = null, c2 = null } = {}) {
  const net = link(lagA, lagB);
  const gA = new Game(), gB = new Game();
  // เลือกตัวละครเหมือนตอนกดจากหน้าเลือกตัว — ทั้งสองเครื่องตั้งค่าเดียวกันจากแพ็คเก็ต go
  if (c1) { gA.p1.char = c1; gB.p1.char = c1; }
  if (c2) { gA.p2.char = c2; gB.p2.char = c2; }
  for (const g of [gA, gB]) { g.p1.hp = g.p1.maxHp; g.p2.hp = g.p2.maxHp; }
  const lsA = new Lockstep(net.sendFromA);
  const lsB = new Lockstep(net.sendFromB);
  lsA.primeStart(); lsB.primeStart();

  let mismatch = null, stepped = 0;
  // นับเหตุการณ์และค่าสูงสุดของสถานะใหม่ ไว้พิสูจน์ว่ารอบทดสอบได้ใช้กลไกนั้นจริง
  const tally = { a: {}, b: {} }, peak = { a: { lash: 0, armor: 0 }, b: { lash: 0, armor: 0 } };
  const note = (g, side) => {
    for (const e of g.events) tally[side][e.type] = (tally[side][e.type] ?? 0) + 1;
    for (const f of [g.p1, g.p2]) {
      if (f.lash > peak[side].lash) peak[side].lash = f.lash;
      if (f.armorLeft > peak[side].armor) peak[side].armor = f.armorLeft;
    }
  };
  for (let t = 0; t < frames * 3 && stepped < frames; t++) {
    lsA.pushLocal(packInput(scriptA(lsA.sent + 1)));
    lsB.pushLocal(packInput(scriptB(lsB.sent + 1)));
    const [toA, toB] = net.tick();
    for (const pk of toA) lsA.onPacket(pk);
    for (const pk of toB) lsB.onPacket(pk);

    // เครื่อง A มองตัวเองเป็นฝั่งซ้าย · เครื่อง B มองอีกฝั่งเป็นฝั่งซ้าย (สลับกัน)
    while (lsA.ready() && lsB.ready() && stepped < frames) {
      const [a1, a2] = lsA.take();
      const [b2, b1] = lsB.take();
      gA.step(a1, a2);
      gB.step(b1, b2);
      stepped++;
      note(gA, "a"); note(gB, "b");
      if (!mismatch && snap(gA) !== snap(gB)) mismatch = { frame: stepped, a: snap(gA), b: snap(gB) };
    }
  }
  return { mismatch, stepped, gA, gB, tally, peak };
}

// ── สองเครื่องต้องได้ภาพตรงกันเป๊ะ แม้หน่วงไม่เท่ากัน ──
{
  // สคริปต์ที่ใช้ท่าให้ครบ: เดิน กระโดด ตี กัน และสกิลทั้งสามช่อง
  // toward = ทิศที่เดินเข้าหาอีกฝั่ง (+1 สำหรับฝั่งซ้าย, -1 สำหรับฝั่งขวา)
  const busy = (seed, toward) => (f) => {
    const k = (f * 7 + seed) % 23;
    const inward = toward > 0 ? 'right' : 'left', outward = toward > 0 ? 'left' : 'right';
    return inp({
      [inward]: k < 6 ? 1 : 0, [outward]: k >= 6 && k < 9 ? 1 : 0,
      up: k === 11 ? 1 : 0, down: k === 12 ? 1 : 0,
      block: k === 13 ? 1 : 0,
      p: { attack: k === 3 || k === 15 ? 1 : 0, jump: k === 9 ? 1 : 0,
           skill1: k === 17 ? 1 : 0, skill2: k === 19 ? 1 : 0, skill3: k === 21 ? 1 : 0 },
    });
  };

  for (const [name, lagA, lagB] of [["ไม่หน่วง", 0, 0], ["หน่วงเท่ากัน", 2, 2], ["หน่วงไม่เท่ากัน", 1, 4]]) {
    const r = playApart(busy(1, 1), busy(2, -1), { lagA, lagB });
    ok(r.stepped >= 250, `${name}: เดินได้ครบ ${r.stepped} เฟรม (ไม่ค้าง)`);
    ok(r.mismatch === null,
      `${name}: สองเครื่องเห็นตรงกันทุกเฟรม` + (r.mismatch ? `\n      เฟรม ${r.mismatch.frame}\n      A ${r.mismatch.a}\n      B ${r.mismatch.b}` : ""));
  }

  // ต้องมีอะไรเกิดขึ้นจริง ไม่ใช่ยืนเฉย ๆ แล้วผ่านเพราะไม่มีอะไรให้ต่าง
  const r = playApart(busy(1, 1), busy(2, -1));
  const moved = r.gA.p1.x !== new Game().p1.x || r.gA.p2.x !== new Game().p2.x;
  ok(moved, "สคริปต์ทดสอบทำให้ตัวละครขยับจริง");
  ok(r.gA.p1.hp < 100 || r.gA.p2.hp < 100, `มีการตีโดนจริงระหว่างทดสอบ (HP ${r.gA.p1.hp}/${r.gA.p2.hp})`);
}

// ── ทุกตัวละครต้องเดินตรงกันสองเครื่อง รวมคู่ที่ผสมกัน ──
//
// ตัวละครรุ่นหลังถือสถานะเพิ่มที่ต้องตรงกันด้วย: ตรารอยแส้ของ Alecto (อยู่ที่คนโดน),
// กองไฟบนพื้น และเกราะของ Atlas ที่ตั้งใหม่ทุกครั้งที่เริ่มท่า
{
  const busy = (seed, toward) => (f) => {
    const k = (f * 7 + seed) % 23;
    const inward = toward > 0 ? 'right' : 'left', outward = toward > 0 ? 'left' : 'right';
    return inp({
      [inward]: k < 6 ? 1 : 0, [outward]: k >= 6 && k < 9 ? 1 : 0,
      up: k === 11 ? 1 : 0, down: k === 12 ? 1 : 0,
      block: k === 13 ? 1 : 0,
      p: { attack: k === 3 || k === 15 ? 1 : 0, jump: k === 9 ? 1 : 0,
           skill1: k === 17 ? 1 : 0, skill2: k === 19 ? 1 : 0, skill3: k === 21 ? 1 : 0 },
    });
  };

  const ids = Object.keys(CHARACTERS);
  const pairs = [...ids.map((id) => [id, id]), ...ids.map((id, i) => [id, ids[(i + 1) % ids.length]])];
  for (const [c1, c2] of pairs) {
    const r = playApart(busy(1, 1), busy(2, -1), { lagA: 1, lagB: 4, c1, c2, frames: 420 });
    ok(r.stepped >= 400 && r.mismatch === null,
      `${c1} vs ${c2}: สองเครื่องเห็นตรงกันทุกเฟรม (${r.stepped} เฟรม)`
      + (r.mismatch ? `\n      เฟรม ${r.mismatch.frame}\n      A ${r.mismatch.a}\n      B ${r.mismatch.b}` : ""));
  }

  // ต้องมีของที่เพิ่งเพิ่มเข้ามาโผล่จริงในรอบทดสอบ ไม่งั้นผ่านเพราะไม่มีอะไรให้ต่าง
  const atlas = playApart(busy(1, 1), busy(2, -1), { lagA: 1, lagB: 4, c1: 'atlas', c2: 'atlas', frames: 420 });
  ok(atlas.peak.a.armor > 0, `Atlas ได้กางเกราะจริงระหว่างทดสอบ (สูงสุด ${atlas.peak.a.armor} ที)`);
  ok(atlas.peak.a.armor === atlas.peak.b.armor, "เกราะที่เหลือตรงกันสองเครื่อง");
  ok(atlas.gA.p1.maxHp === 130 && atlas.gA.p1.hp === atlas.gB.p1.hp, `Atlas เลือดเต็ม 130 และตรงกันสองเครื่อง (${atlas.gA.p1.hp})`);

  // สคริปต์ของ Alecto ต้องเข้าระยะแส้จริง ไม่ใช่ยืนยิงห่าง ๆ — ตรารอยแส้ติดจากท่าตีปกติเท่านั้น
  const closeIn = (toward) => (f) => {
    const inward = toward > 0 ? 'right' : 'left';
    return inp({ [inward]: f < 70 ? 1 : 0,
      p: { attack: f >= 70 && f % 9 === 0 ? 1 : 0, skill2: f === 360 ? 1 : 0 } });
    // กดสกิล 2 ครั้งเดียวตอนท้าย ไม่ใช่รัว ๆ — ของ Alecto สกิล 2 สับเป็นโหมดไรเฟิล 5 วินาที
    // กดถี่แล้วเธอจะไม่ได้ใช้แส้เลย ตรารอยแส้ก็ไม่ขึ้น ซึ่งคือสิ่งที่เทสต์นี้ต้องการวัด
  };
  const alecto = playApart(closeIn(1), closeIn(-1), { lagA: 1, lagB: 4, c1: 'alecto', c2: 'alecto', frames: 420 });
  ok(alecto.peak.a.lash > 0, `ตรารอยแส้ติดจริงระหว่างทดสอบ (สูงสุด ${alecto.peak.a.lash} ชั้น)`);
  ok(alecto.peak.a.lash === alecto.peak.b.lash, "ชั้นตรารอยแส้ตรงกันสองเครื่อง");
  ok((alecto.tally.a.firepool ?? 0) > 0, `มีกองไฟเกิดจริงระหว่างทดสอบ (${alecto.tally.a.firepool} กอง)`);

  // Orpheus: บัฟไฟอยู่ที่คนฟาด ไฟที่ติดตัวอยู่ที่คนโดน — สองอย่างนี้เพิ่งเพิ่มเข้ามา
  const orph = playApart(closeIn(1), closeIn(-1), { lagA: 1, lagB: 4, c1: 'orpheus', c2: 'orpheus', frames: 420 });
  ok(orph.mismatch === null, "orpheus: สองเครื่องเห็นตรงกันทุกเฟรมตอนไล่หวดประชิด");
  ok((orph.tally.a.ignite ?? 0) === (orph.tally.b.ignite ?? 0), "การจุดไฟใส่คู่ต่อสู้ตรงกันสองเครื่อง");
  ok(orph.gA.p2.burn === orph.gB.p2.burn && orph.gA.p1.burn === orph.gB.p1.burn,
    `ไฟที่ติดตัวตรงกันสองเครื่อง (${orph.gA.p1.burn} / ${orph.gA.p2.burn})`);
  ok((alecto.tally.a.firepool ?? 0) === (alecto.tally.b.firepool ?? 0), "กองไฟลุกตรงกันสองเครื่อง");

  // เหตุการณ์ทุกชนิดต้องเกิดจำนวนเท่ากันทั้งสองเครื่อง ไม่ใช่แค่ตำแหน่งตรงกัน
  for (const [name, r] of [["atlas", atlas], ["alecto", alecto]]) {
    const keys = [...new Set([...Object.keys(r.tally.a), ...Object.keys(r.tally.b)])];
    const same = keys.every((k) => r.tally.a[k] === r.tally.b[k]);
    ok(same, `${name}: เหตุการณ์ทุกชนิดเกิดเท่ากันสองเครื่อง (${keys.map((k) => k + ":" + r.tally.a[k]).join(" ")})`);
  }
}

// ── ไม่มีอินพุตของอีกฝั่ง = ต้องรอ ไม่ใช่เดินมั่ว ──
{
  const sent = [];
  const ls = new Lockstep((pk) => sent.push(pk));
  ls.primeStart();
  ok(sent.length === NET_DELAY, `เปิดเกมส่งอินพุตล่วงหน้าไว้ ${NET_DELAY} เฟรม`);
  ok(!ls.ready(), "ยังไม่ได้อินพุตจากอีกฝั่ง = ยังเดินไม่ได้");
  ls.onPacket({ t: "i", f: 0, v: 0 });
  ok(ls.ready(), "ได้อินพุตของเฟรมนั้นจากอีกฝั่งแล้วถึงเดินได้");
  ls.take();
  ok(!ls.ready(), "เฟรมถัดไปก็ต้องรออีกฝั่งเหมือนกัน");
}

// ── อินพุตถูกใช้ที่เฟรมในอนาคต ไม่ใช่เฟรมปัจจุบัน ──
{
  const sent = [];
  const ls = new Lockstep((pk) => sent.push(pk));
  ls.primeStart();
  sent.length = 0;
  ls.pushLocal(123);
  ok(sent[0].f >= NET_DELAY, `อินพุตที่กดตอนนี้ไปใช้ที่เฟรม ${sent[0].f} (>= ${NET_DELAY}) ไม่ใช่เฟรมนี้`);
  ok(sent[0].v === 123, "ส่งค่าปุ่มไปตรง ๆ");
}

// ── คิวเต็มแล้วกดปุ่ม ปุ่มต้องไม่หาย ──
//
// บั๊กจริงที่เคยเจอ: รอบวาดที่ sim ยังเดินไม่ได้ (รออีกฝั่ง) คิวอินพุตเต็มอยู่แล้ว
// pushLocal จึงไม่ได้ส่งอะไร แต่ตัวอ่านปุ่มล้างบิต "เพิ่งกด" ไปแล้ว = กดตีแล้วไม่ออกท่า
// ทางแก้คือ pushLocal บอกกลับว่าเข้าคิวได้กี่เฟรม ผู้เรียกเก็บบิตเพิ่งกดไว้เองจนกว่าจะเข้าคิวได้จริง
{
  const ls = new Lockstep(() => {});
  ls.primeStart();
  ls.pushLocal(0);   // รอบแรกเติมคิวจนเต็มถึง frame + delay
  ok(ls.pushLocal(0) === 0, "คิวเต็มอยู่แล้ว pushLocal ต้องบอกว่าเข้าคิวไม่ได้ (คืน 0)");
  ls.onPacket({ t: "i", f: 0, v: 0 });
  ls.take();
  ok(ls.pushLocal(0) === 1, "พอเดินไปหนึ่งเฟรม คิวว่างหนึ่งช่อง เข้าคิวได้ 1");
}

// ── เลียนแบบลูปของฉาก: กดตีตอนคิวเต็ม แล้วบิตต้องไปโผล่ในเฟรมถัดไป ──
{
  const sent = [];
  const ls = new Lockstep((pk) => sent.push(pk));
  ls.primeStart();
  ls.pushLocal(0);   // เติมคิวให้เต็มก่อน เลียนแบบรอบวาดรอบแรก ๆ
  sent.length = 0;

  const ATTACK = packInput(inp({ p: { attack: 1 } }));
  let sticky = 0;
  // รอบที่ 1: กดตี แต่คิวเต็ม (ยังไม่ได้อินพุตจากอีกฝั่ง sim เลยเดินไม่ได้)
  sticky |= ATTACK & PRESS_MASK;
  if (ls.pushLocal((ATTACK & HELD_MASK) | sticky) > 0) sticky = 0;
  ok(sent.length === 0, "คิวเต็ม รอบนี้ไม่มีอะไรถูกส่ง");
  ok(sticky !== 0, "บิตเพิ่งกดถูกเก็บค้างไว้ ไม่ทิ้ง");

  // รอบที่ 2: อีกฝั่งส่งมาแล้ว เดินได้หนึ่งเฟรม คิวว่าง แล้วปล่อยมือจากปุ่ม
  ls.onPacket({ t: "i", f: 0, v: 0 });
  ls.take();
  if (ls.pushLocal((0 & HELD_MASK) | sticky) > 0) sticky = 0;
  ok(sent.length === 1, "พอคิวว่างถึงส่งออกไปหนึ่งเฟรม");
  ok((sent[0].v & PRESS_MASK) === (ATTACK & PRESS_MASK), "บิต 'เพิ่งกดตี' ตามไปด้วย ไม่หายระหว่างทาง");
  ok(sticky === 0, "ส่งได้แล้วต้องล้างบิตที่เก็บค้าง ไม่งั้นจะออกท่าซ้ำ");
}
