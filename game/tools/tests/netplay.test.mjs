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
const snap = (g) => [g.frame, ...g.fighters.flatMap((f) => [
  Math.round(f.x * 1000), Math.round(f.y * 1000), Math.round(f.vx * 1000), Math.round(f.vy * 1000),
  f.state, f.moveId ?? "-", f.moveF, f.hp, f.facing, f.stun, f.hitstop, f.invuln, f.ki, f.comboHits,
  // สถานะที่ตัวละครรุ่นหลังเพิ่มเข้ามา — ถ้าไม่เทียบด้วย desync ของ Alecto/Atlas จะรอดสายตา
  f.char, f.lash, f.lashF, f.armorLeft, f.burn, f.burnF, f.veil, f.dustGuard, f.caged,
  // DEAR: ไอพ่น/การลาก/โอเวอร์คล็อก — ทั้งสามเป็นสถานะที่ตัดสินผลการชน
  // ไม่เทียบแล้วสองเครื่องจะเดินคนละเกมโดยที่ตำแหน่งกับเลือดยังดูตรงกันอยู่
  f.boost, f.boostGain, f.overclock, f.carriedBy ?? '-', f.carryLeft, f.mashOut,
  f.carrying.join('+') || '-', f.dashTap, f.dashTapF, f.dashLock, f.slammed,
  // MARCH: การเด้งพื้น — ธงนี้ตัดสินว่า "ตกถึงพื้นแล้วล้มหรือเด้ง" ซึ่งเปลี่ยนผลคอมโบทั้งชุด
  f.bounced ? 1 : 0, f.bouncePend,
  // เพื่อน AI คิดในซิม แผนของมันจึงเป็นสถานะที่ต้องตรงกันเหมือนตำแหน่งและเลือด
  f.ai ? 1 : 0, f.aiNext, JSON.stringify(f.aiPlan),
  // อาวุธที่ถืออยู่ (Alecto สลับแส้/ไรเฟิล) — ถ้าไม่เทียบ สองเครื่องถืออาวุธคนละชุด
  // แล้วปุ่มตีเดียวกันจะออกท่าคนละท่า ซึ่งเป็น desync ที่ทุกอย่างอื่นยังดูตรงกันหมด
  f.alt,
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
  // A นั่งที่นั่ง 0 (โฮสต์) · B นั่งที่นั่ง 1 (แขก) — เหมือนที่ฉากตั้งให้จริง
  const lsA = new Lockstep(net.sendFromA, { seat: 0 });
  const lsB = new Lockstep(net.sendFromB, { seat: 1 });
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

    // take() คืนอินพุตเรียงตามที่นั่ง ทั้งสองเครื่องจึงส่งเข้า step() เหมือนกันเป๊ะ ไม่มีสลับลำดับ
    while (lsA.ready() && lsB.ready() && stepped < frames) {
      const a = lsA.take(), b = lsB.take();
      gA.step(...a);
      gB.step(...b);
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
    // กดสกิล 2 ครั้งเดียวตอนท้าย ไม่ใช่รัว ๆ — สกิล 2 ขว้างระเบิดแล้วรัวลูกโม่ยาว
    // กดถี่แล้วเธอจะไม่ได้ใช้แส้เลย ตรารอยแส้ก็ไม่ขึ้น ซึ่งคือสิ่งที่เทสต์นี้ต้องการวัด
    // และห้ามกดสกิล 1 เลย เพราะนั่นคือสลับไปถือปืน ซึ่งก็ทำให้ไม่มีตราเหมือนกัน
  };
  const alecto = playApart(closeIn(1), closeIn(-1), { lagA: 1, lagB: 4, c1: 'alecto', c2: 'alecto', frames: 420 });
  ok(alecto.peak.a.lash > 0, `ตรารอยแส้ติดจริงระหว่างทดสอบ (สูงสุด ${alecto.peak.a.lash} ชั้น)`);
  ok(alecto.peak.a.lash === alecto.peak.b.lash, "ชั้นตรารอยแส้ตรงกันสองเครื่อง");
  ok((alecto.tally.a.firepool ?? 0) > 0, `มีกองไฟเกิดจริงระหว่างทดสอบ (${alecto.tally.a.firepool} กอง)`);

  // สลับอาวุธเป็นสถานะที่ "ปุ่มเดียวกันให้ผลคนละอย่าง" จึงเป็น desync ที่เนียนที่สุดเท่าที่มี
  // สองเครื่องถืออาวุธคนละชุดแล้วกดตีพร้อมกัน จะเห็นท่าคนละท่าโดยที่ทุกค่าอื่นยังตรงกันหมด
  // ต้องพิสูจน์ว่ามีการสลับเกิดขึ้นจริงในรอบทดสอบ ไม่งั้นผ่านเพราะไม่มีอะไรให้ต่าง
  const swap = playApart(busy(1, 1), busy(2, -1), { lagA: 2, lagB: 5, c1: 'alecto', c2: 'alecto', frames: 420 });
  ok((swap.tally.a.swap ?? 0) > 0, `มีการสลับอาวุธจริงระหว่างทดสอบ (${swap.tally.a.swap} ครั้ง)`);
  ok((swap.tally.a.swap ?? 0) === (swap.tally.b.swap ?? 0), "จำนวนครั้งที่สลับตรงกันสองเครื่อง");
  ok(swap.gA.p1.alt === swap.gB.p1.alt && swap.gA.p2.alt === swap.gB.p2.alt,
    `จบแล้วถืออาวุธชุดเดียวกันทั้งสองเครื่อง (p1=${swap.gA.p1.alt} p2=${swap.gA.p2.alt})`);
  ok(swap.mismatch === null, "และไม่มีเฟรมไหนต่างกันเลยตลอดการทดสอบ");

  // DEAR: ไอพ่นกับการลากเป็นสถานะที่ตัดสินผลการชน แต่ **ไม่โผล่ในตำแหน่งหรือเลือด**
  // ขีดไอพ่นคลาดกันขีดเดียว = อีกเฟรมหนึ่งคนหนึ่งพุ่งได้อีกคนพุ่งไม่ได้ แล้วแยกกันไปเลย
  // โดยที่เฟรมก่อนหน้าทุกค่ายังตรงกันหมด — เป็น desync ที่ไล่ย้อนหาต้นตอยากที่สุดแบบหนึ่ง
  const dear = playApart(busy(1, 1), busy(2, -1), { lagA: 2, lagB: 5, c1: 'momus', c2: 'momus', frames: 420 });
  ok((dear.tally.a.boost ?? 0) + (dear.tally.a.boostGain ?? 0) > 0,
    `มีการใช้/เติมไอพ่นจริงระหว่างทดสอบ (ใช้ ${dear.tally.a.boost ?? 0} · เติม ${dear.tally.a.boostGain ?? 0})`);
  ok((dear.tally.a.grab ?? 0) > 0, `และมีการคว้าลากจริง (${dear.tally.a.grab} ครั้ง)`);
  ok((dear.tally.a.boost ?? 0) === (dear.tally.b.boost ?? 0)
    && (dear.tally.a.grab ?? 0) === (dear.tally.b.grab ?? 0), "ไอพ่นและการคว้าตรงกันสองเครื่อง");
  ok(dear.mismatch === null, "และไม่มีเฟรมไหนต่างกันเลยตลอดการทดสอบ");

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

// ══ A · lockstep สี่ที่นั่ง ════════════════════════════════════════════════════
//
// ที่นั่ง = ตำแหน่งใน fighters ไม่ใช่ "ฉัน/อีกฝั่ง"
// ของเดิมเก็บเป็น local/remote แล้วผู้เรียกสลับลำดับเองตอนเป็นแขก
// ซึ่งเป็นวิธีที่ใช้ต่อไม่ได้เลยเมื่อมีที่นั่งที่สาม — "สลับ" ไม่มีความหมายแล้ว

// ── เลขที่นั่งติดไปกับแพ็คเก็ต ──
{
  const sent = [];
  const ls = new Lockstep((pk) => sent.push(pk), { seats: 4, seat: 2 });
  ls.primeStart();
  ls.pushLocal(7);
  ok(sent.length > 0 && sent.every((pk) => pk.s === 2), `ทุกแพ็คเก็ตบอกว่ามาจากที่นั่ง 2 (${sent.map((p) => p.s).join()})`);
}

// ── อินพุตเข้าคิวของที่นั่งที่ส่งมา ไม่ใช่ "อีกฝั่ง" ──
{
  const ls = new Lockstep(() => {}, { seats: 4, seat: 0 });
  ls.primeStart();
  ok(!ls.ready(), "ขาดใครสักคนก็ยังเดินไม่ได้");
  ok(ls.waitingOn().join() === '1,2,3', `บอกได้ว่ารอใครอยู่ (${ls.waitingOn().join()})`);
  ls.onPacket({ t: "i", s: 3, f: 0, v: 11 });
  ok(ls.waitingOn().join() === '1,2', "ได้ของที่นั่ง 3 แล้วเหลือรอสองคน");
  ls.onPacket({ t: "i", s: 1, f: 0, v: 22 });
  ls.onPacket({ t: "i", s: 2, f: 0, v: 33 });
  ok(ls.ready() && ls.waitingOn().length === 0, "ครบทุกที่นั่งถึงเดินได้");
  const got = ls.take();
  ok(got.length === 4, `คืนอินพุตครบสี่ช่อง (${got.length})`);
  // v=11 = บิต 0,1,3 = left | right | down  (ลำดับบิตคือลำดับใน HELD)
  ok(got[3].left === 1 && got[3].right === 1 && got[3].down === 1 && got[3].up === 0,
    "อินพุตของที่นั่ง 3 ไปอยู่ช่องที่ 3 จริง ไม่ใช่ช่องอื่น");
  // v=22 = บิต 1,2,4 = right | up | jump
  ok(got[1].right === 1 && got[1].up === 1 && got[1].jump === 1 && got[1].left === 0,
    "และของที่นั่ง 1 ก็อยู่ช่องของตัวเอง");
}

// ── แพ็คเก็ตที่นั่งเกินจำนวน หรือไม่มีเลขที่นั่งเลย ต้องทิ้ง ไม่ใช่เดา ──
//
// เดาผิดแล้วอินพุตไปลงที่นั่งคนอื่น = สองเครื่องเดินคนละอินพุตโดยไม่มีอะไรฟ้อง
// ซึ่งแย่กว่าค้างรอไปเลย เพราะ desync ไม่มีอาการให้เห็นจนกว่าจะเลือดไม่เท่ากัน
{
  const ls = new Lockstep(() => {}, { seats: 4, seat: 0 });
  ls.primeStart();
  ls.onPacket({ t: "i", f: 0, v: 99 });          // ไม่บอกที่นั่ง
  ls.onPacket({ t: "i", s: 9, f: 0, v: 99 });    // ที่นั่งไม่มีจริง
  ls.onPacket({ t: "i", s: -1, f: 0, v: 99 });
  ok(ls.waitingOn().join() === '1,2,3', `ทิ้งทั้งสามแพ็คเก็ต ยังรอครบสามคนเหมือนเดิม (${ls.waitingOn().join()})`);
}

// ── สองที่นั่งยังรับแพ็คเก็ตแบบเก่าที่ไม่มีเลขที่นั่งได้ ──
//
// แท็บที่เปิดค้างไว้ก่อนอัปเดตยังส่งโปรโตคอลเดิม ถ้าไม่รับ คนที่ไม่รีเฟรชจะเล่นไม่ได้
// สองที่นั่งเดาได้แน่นอนเพราะมี "อีกฝั่ง" อยู่อันเดียว
{
  const ls = new Lockstep(() => {}, { seats: 2, seat: 1 });
  ls.primeStart();
  ls.onPacket({ t: "i", f: 0, v: 5 });
  ok(ls.ready(), "แพ็คเก็ตไม่มีเลขที่นั่งถูกนับเป็นของอีกฝั่ง");
  // v=5 = บิต 0,2 = left | up
  const got = ls.take();
  ok(got[0].left === 1 && got[0].up === 1, "และไปลงที่นั่ง 0 ซึ่งเป็นอีกฝั่งของเรา");
}

// ── remote ใช้กับสี่ที่นั่งไม่ได้ ต้องฟ้องดัง ๆ ไม่ใช่คืนค่าผิด ──
{
  const ls = new Lockstep(() => {}, { seats: 4, seat: 0 });
  let threw = false;
  try { ls.remote; } catch (e) { threw = true; }
  ok(threw, "อ่าน .remote ตอนสี่ที่นั่งแล้ว error ทันที ไม่ใช่คืนคิวผิดตัวเงียบ ๆ");
  const two = new Lockstep(() => {}, { seats: 2, seat: 0 });
  ok(two.remote === two.q[1] && two.local === two.q[0], "สองที่นั่งยังอ่าน local/remote ได้เหมือนเดิม");
}

/** ท่อแบบดาว: ทุกคนส่งถึงกันหมด หน่วงต่อคนไม่เท่ากันได้ */
function hub(seats, lags = []) {
  const q = Array.from({ length: seats }, () => []);
  return {
    sendFrom: (from) => (pk) => {
      for (let to = 0; to < seats; to++) if (to !== from) q[to].push({ pk, due: lags[from] ?? 0 });
    },
    tick() {
      return q.map((one) => {
        const out = [], keep = [];
        for (const e of one) (--e.due < 0 ? out : keep).push(e);
        one.length = 0; one.push(...keep);
        return out.map((e) => e.pk);
      });
    },
  };
}

// ══ สี่เครื่องเดิน 2v2 แล้วต้องเห็นตรงกันเป๊ะทุกเฟรม ═══════════════════════════
//
// นี่คือข้อที่มีความหมายจริง: ที่เหลือเทสต์คิวกับโปรโตคอล ข้อนี้เทสต์ว่า **sim สี่ตัวเดินตรงกัน**
// หน่วงตั้งไม่เท่ากันทั้งสี่คน เพื่อให้ลำดับที่แพ็คเก็ตมาถึงต่างกันทุกเครื่อง
// ถ้าที่ไหนในแกนตัดสินจากลำดับที่ของมาถึง (ไม่ใช่ลำดับในลิสต์) ข้อนี้จะจับได้
{
  const SEATS = 4, chars = ['nyx', 'helios', 'momus', 'alecto'];
  const net = hub(SEATS, [0, 1, 3, 2]);
  const games = [], ls = [];
  for (let i = 0; i < SEATS; i++) {
    const g = new Game();
    g.setRoster(4);
    g.fighters.forEach((f, n) => { f.char = chars[n]; f.hp = f.maxHp; });
    g.startMatch();
    games.push(g);
    const l = new Lockstep(net.sendFrom(i), { seats: SEATS, seat: i });
    l.primeStart();
    ls.push(l);
  }

  // สคริปต์ปุ่มคนละชุดต่อที่นั่ง ใช้ท่าให้ครบทั้งเดิน กระโดด ตี กัน และสกิลสามช่อง
  const script = (seed) => (f) => {
    const k = (f * 7 + seed * 5) % 23;
    return inp({
      left: k < 4 ? 1 : 0, right: k >= 4 && k < 8 ? 1 : 0,
      up: k === 11 ? 1 : 0, down: k === 12 ? 1 : 0, block: k === 13 ? 1 : 0,
      p: { attack: k === 3 || k === 15 ? 1 : 0, jump: k === 9 ? 1 : 0,
           skill1: k === 17 ? 1 : 0, skill2: k === 19 ? 1 : 0, skill3: k === 21 ? 1 : 0 },
    });
  };
  const scripts = [0, 1, 2, 3].map((i) => script(i + 1));

  let mismatch = null, stepped = 0;
  const FRAMES = 260;
  for (let t = 0; t < FRAMES * 4 && stepped < FRAMES; t++) {
    for (let i = 0; i < SEATS; i++) ls[i].pushLocal(packInput(scripts[i](ls[i].sent + 1)));
    const arrived = net.tick();
    for (let i = 0; i < SEATS; i++) for (const pk of arrived[i]) ls[i].onPacket(pk);

    while (ls.every((l) => l.ready()) && stepped < FRAMES) {
      for (let i = 0; i < SEATS; i++) games[i].step(...ls[i].take());
      stepped++;
      const base = snap(games[0]);
      for (let i = 1; i < SEATS && !mismatch; i++)
        if (snap(games[i]) !== base) mismatch = { frame: stepped, seat: i, a: base, b: snap(games[i]) };
    }
  }

  ok(stepped === FRAMES, `เดินครบ ${FRAMES} เฟรมโดยไม่ค้าง (เดินได้ ${stepped})`);
  ok(!mismatch, mismatch
    ? `สี่เครื่องเห็นตรงกัน — หลุดที่เฟรม ${mismatch.frame} ที่นั่ง ${mismatch.seat}\n  ที่นั่ง 0: ${mismatch.a}\n  ที่นั่ง ${mismatch.seat}: ${mismatch.b}`
    : `สี่เครื่องเห็นตรงกันทุกเฟรม (${stepped} เฟรม)`);
  // พิสูจน์ว่ารอบทดสอบได้ใช้กลไกจริง ไม่ใช่ทุกคนยืนเฉย ๆ แล้วผ่านเพราะไม่มีอะไรเกิด
  const hurt = games[0].fighters.filter((f) => f.hp < f.maxHp).length;
  ok(hurt >= 2, `มีคนเจ็บจริงระหว่างทดสอบ (${hurt}/4 คน)`);
  ok(games[0].frame === FRAMES, `นาฬิกาเฟรมตรงกับจำนวนที่เดิน (${games[0].frame})`);
}

// ── ที่นั่งเดียวขาดหาย ทุกเครื่องต้องค้างพร้อมกัน ไม่ใช่เดินต่อโดยเดาอินพุตแทน ──
//
// เดินต่อโดยเดาคือ desync ที่เงียบที่สุดที่เป็นไปได้ — ทุกเครื่องเดาไม่เหมือนกัน
{
  const SEATS = 4;
  const net = hub(SEATS);
  const ls = [];
  for (let i = 0; i < SEATS; i++) {
    const l = new Lockstep(i === 2 ? () => {} : net.sendFrom(i), { seats: SEATS, seat: i });
    l.primeStart();
    ls.push(l);
  }
  for (let t = 0; t < 20; t++) {
    for (const l of ls) l.pushLocal(0);
    const arrived = net.tick();
    for (let i = 0; i < SEATS; i++) for (const pk of arrived[i]) ls[i].onPacket(pk);
  }
  ok(!ls[0].ready() && !ls[1].ready() && !ls[3].ready(), "ที่นั่ง 2 เงียบ ทุกเครื่องค้างรอ ไม่มีใครเดินต่อ");
  ok(ls.every((l) => l.frame === 0), "และไม่มีเครื่องไหนเดินเฟรมไปเลยสักเฟรม");
  ok(ls[0].waitingOn().join() === '2', `บอกได้ตรงตัวว่ารอที่นั่ง 2 (${ls[0].waitingOn().join()})`);
}

// ══ เล่นสองแมตช์ติดในห้องเดิม แล้วต้องยังตรงกันเป๊ะ ═══════════════════════════════
//
// **บั๊กที่ข้อนี้กันไว้ และเคยมีจริงตั้งแต่วันแรกของ netplay:**
// `beginMatch()` ตั้ง `sim.frame = 0` ใหม่ทุกครั้ง แต่ `Lockstep.frame` เดินต่อจากของเดิม
// แมตช์ที่สองจึงไป `take()` อินพุตที่เลขเฟรมหลักพัน ซึ่งเป็นของแมตช์ที่แล้ว
// เดินได้ปกติ ไม่ throw ไม่ค้าง — แค่สองเครื่องเห็นคนละเกม
//
// เดิมไม่มีใครเจอเพราะ **กลับไปเลือกตัวตอนต่อเน็ตไม่ได้เลย** ต้องรีเฟรชเข้าห้องใหม่
// ซึ่งสร้าง Lockstep ใหม่ทั้งตัว พอเปิดทางให้เล่นต่อได้ บั๊กนี้จึงเป็นด่านแรกที่ต้องผ่าน
{
  const script = (seed) => (f) => {
    const k = (f * 7 + seed * 5) % 23;
    return inp({
      left: k < 4 ? 1 : 0, right: k >= 4 && k < 9 ? 1 : 0, block: k === 13 ? 1 : 0,
      p: { attack: k === 3 || k === 15 ? 1 : 0, jump: k === 9 ? 1 : 0,
           skill1: k === 17 ? 1 : 0, skill2: k === 19 ? 1 : 0, skill3: k === 21 ? 1 : 0 },
    });
  };
  const net = link(1, 2);
  const gA = new Game(), gB = new Game();
  const lsA = new Lockstep(net.sendFromA, { seat: 0 });
  const lsB = new Lockstep(net.sendFromB, { seat: 1 });

  /** เริ่มแมตช์เหมือนที่ beginMatch() ทำจริง — เลขแมตช์มาจากโฮสต์ ทั้งคู่ใช้เลขเดียวกัน */
  const begin = (epoch, c1, c2) => {
    for (const [g, l] of [[gA, lsA], [gB, lsB]]) {
      g.p1.char = c1; g.p2.char = c2;
      g.startMatch();
      g.frame = 0;
      if (l.epoch !== epoch) l.reset(epoch);
      l.primeStart();
    }
  };
  /** เดินไปข้างหน้า n เฟรมของซิม — คืนเฟรมแรกที่สองเครื่องไม่ตรงกัน (null = ตรงตลอด) */
  const play = (n, sa, sb) => {
    let stepped = 0, bad = null;
    for (let t = 0; t < n * 6 && stepped < n; t++) {
      lsA.pushLocal(packInput(sa(lsA.sent + 1)));
      lsB.pushLocal(packInput(sb(lsB.sent + 1)));
      const [toA, toB] = net.tick();
      for (const pk of toA) lsA.onPacket(pk);
      for (const pk of toB) lsB.onPacket(pk);
      while (lsA.ready() && lsB.ready() && stepped < n) {
        gA.step(...lsA.take());
        gB.step(...lsB.take());
        stepped++;
        if (bad === null && snap(gA) !== snap(gB)) bad = stepped;
      }
    }
    return { bad, stepped };
  };

  /** เดินเวลาต่อโดย **ไม่เดินซิม** — คือสิ่งที่เกิดจริงตอนแมตช์จบแล้วทั้งคู่ไปหน้าเลือกตัว
   *  pushLocal จองเฟรมล่วงหน้าไว้แล้ว และแพ็คเก็ตที่ยังลอยอยู่ในสายก็ทยอยถึงมือ
   *  ของพวกนี้แหละที่ค้างอยู่ในคิวข้ามไปแมตช์หน้า ถ้าไม่มีใครล้าง */
  const linger = (n) => {
    for (let t = 0; t < n; t++) {
      lsA.pushLocal(packInput(inp())); lsB.pushLocal(packInput(inp()));
      const [toA, toB] = net.tick();
      for (const pk of toA) lsA.onPacket(pk);
      for (const pk of toB) lsB.onPacket(pk);
    }
  };

  begin(1, 'nyx', 'helios');
  const m1 = play(200, script(1), script(2));
  ok(m1.stepped === 200, `แมตช์แรกเดินครบ 200 เฟรม (ได้ ${m1.stepped})`);
  ok(m1.bad === null, `แมตช์แรกตรงกันตลอด${m1.bad ? ` (หลุดที่เฟรม ${m1.bad})` : ''}`);
  ok(gA.frame === 200 && lsA.frame === 200, `นาฬิกาของคิวเดินมาถึง ${lsA.frame} แล้ว`);

  linger(6);
  ok(lsA.q[1].size > 0 && lsB.q[0].size > 0,
    `จบแมตช์แล้วมีอินพุตค้างในคิวจริง (A ${lsA.q[1].size} · B ${lsB.q[0].size}) — ถ้าไม่มี ข้อล่างก็ไม่พิสูจน์อะไร`);

  // กลับไปเลือกตัว แล้วเริ่มแมตช์ใหม่ด้วยตัวละครคนละคู่ — เหมือนที่คนเล่นจะทำจริง
  // ระหว่างนี้แพ็คเก็ตของแมตช์แรกยังค้างในสายอยู่ (หน่วง 1-2 รอบ) ซึ่งคือเคสที่อันตรายที่สุด
  begin(2, 'momus', 'alecto');
  ok(lsA.frame === 0 && lsB.frame === 0, "คิวเริ่มนับใหม่ที่เฟรม 0 ทั้งสองเครื่อง");
  ok(lsA.epoch === 2 && lsB.epoch === 2, "และรู้ว่าเป็นแมตช์ที่สองเหมือนกัน");
  // คิวของอีกฝั่งต้องว่างเกลี้ยง — ของที่เหลือจากแมตช์ก่อนคือเฟรมที่จองล่วงหน้าไว้แล้วยังไม่ได้เดิน
  // (เฟรม 200..202 ของแมตช์แรก) ถ้าไม่ล้าง มันจะกลายเป็นอินพุตของเฟรม 200..202 ของแมตช์ใหม่
  // และสองเครื่องมีของค้างคนละชุด = เดินคนละเกมตั้งแต่วินาทีที่สามของแมตช์ที่สอง
  ok(lsA.q[1].size === 0 && lsB.q[0].size === 0,
    `ไม่มีอินพุตของแมตช์ก่อนค้างอยู่ (A ${lsA.q[1].size} · B ${lsB.q[0].size})`);

  // เดินยาวกว่าแมตช์แรก เพื่อให้ผ่านช่วงเฟรมที่ของเก่าเคยค้างอยู่จริง ๆ
  const m2 = play(280, script(3), script(4));
  ok(m2.stepped === 280, `แมตช์ที่สองเดินครบ 280 เฟรม ไม่ค้างรอ (ได้ ${m2.stepped})`);
  ok(m2.bad === null, `แมตช์ที่สองยังตรงกันเป๊ะ${m2.bad ? ` (หลุดที่เฟรม ${m2.bad})` : ''}`);
  ok(gA.p1.char === 'momus' && gB.p1.char === 'momus', "และใช้ตัวละครชุดใหม่จริง ไม่ใช่ชุดเดิม");

  // แมตช์ที่สาม เพื่อพิสูจน์ว่าไม่ใช่ของที่ทำได้ครั้งเดียว
  begin(3, 'nyx', 'atlas');
  const m3 = play(150, script(5), script(6));
  ok(m3.stepped === 150 && m3.bad === null,
    `แมตช์ที่สามก็ยังเดินครบและตรงกัน (${m3.stepped} เฟรม${m3.bad ? ` · หลุดที่ ${m3.bad}` : ''})`);
}

// ══ อินพุตของแมตช์เก่าที่ค้างในสาย ต้องไม่ปนเข้าแมตช์ใหม่ ═══════════════════════
{
  const sent = [];
  const ls = new Lockstep((pk) => sent.push(pk), { seat: 0 });
  ls.reset(1);
  // อีกฝั่งยังส่งของแมตช์ 0 ตามมา (ค้างในสาย) — เลขเฟรมทับกับของแมตช์ใหม่พอดี
  ls.onPacket({ t: 'i', s: 1, m: 0, f: 0, v: 999 });
  ok(!ls.q[1].has(0), "อินพุตของแมตช์ก่อนถูกทิ้ง ไม่ได้ไปนั่งทับเฟรม 0 ของแมตช์ใหม่");
  ls.onPacket({ t: 'i', s: 1, m: 1, f: 0, v: 7 });
  ok(ls.q[1].get(0) === 7, "ของแมตช์ปัจจุบันเข้าคิวปกติ");

  // แพ็คเก็ตไม่มีเลขแมตช์ = บิลด์เก่า ถือเป็นแมตช์ 0 — แท็บเก่ายังเล่นแมตช์แรกกับแท็บใหม่ได้
  const old = new Lockstep(() => {}, { seat: 0 });
  old.onPacket({ t: 'i', s: 1, f: 2, v: 5 });
  ok(old.q[1].get(2) === 5, "บิลด์เก่าที่ไม่ส่งเลขแมตช์มายังเล่นแมตช์แรกด้วยกันได้");
}

// ══ อินพุตของแมตช์ถัดไปที่มาถึงก่อนเรารู้ตัว ต้องเก็บไว้ ไม่ใช่ทิ้ง ═══════════════
//
// อีกฝั่งกดเริ่มก่อนเราเสี้ยววินาที แล้วยิงเฟรม 0..delay-1 ของแมตช์ใหม่มาทันที
// ทิ้งทิ้งไป = เขารอเฟรม 0 ของเรา เราก็รอเฟรม 0 ของเขาที่ถูกทิ้งแล้ว ค้างกันตลอดกาล
{
  const ls = new Lockstep(() => {}, { seat: 0 });
  for (let f = 0; f < 3; f++) ls.onPacket({ t: 'i', s: 1, m: 1, f, v: f + 1 });
  ok(!ls.q[1].size, "ยังไม่ถึงแมตช์นั้น จึงยังไม่เข้าคิว");
  ls.reset(1);
  ok(ls.q[1].size === 3 && ls.q[1].get(2) === 3,
    `พอขึ้นแมตช์นั้นจริง ของที่เก็บไว้เข้าคิวครบ (${ls.q[1].size}/3)`);
  ls.primeStart();
  ok(ls.ready(), "และเดินต่อได้ทันที ไม่ค้างรอเฟรม 0 ที่หายไป");

  // ข้ามแมตช์ไปเลย (ไม่น่าเกิด แต่ถ้าเกิดต้องไม่พาของเก่าไปด้วย)
  const skip = new Lockstep(() => {}, { seat: 0 });
  skip.onPacket({ t: 'i', s: 1, m: 1, f: 0, v: 1 });
  skip.reset(2);
  ok(!skip.q[1].size, "ข้ามไปแมตช์ 2 แล้วของที่เก็บไว้ให้แมตช์ 1 ไม่ถูกพาไปด้วย");
}
