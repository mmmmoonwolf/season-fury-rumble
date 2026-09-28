// ทดสอบแผงผู้เล่น (รูปกลม + วงเลือด) และลูกศรเหนือหัว
// รัน: node tools/tests/hud_pods.test.mjs   (จากโฟลเดอร์ game)
//
// ทั้งสองอย่างแก้ปัญหาเดียวกัน: **เล่น 2v2 แล้วหาตัวเองไม่เจอ**
// ซึ่งไม่มีทางจับได้ด้วยเทสต์ที่ดูแค่ว่า "ไม่ throw" — ต้องวัดตำแหน่งกับสีจริง
import "./phaser_stub.mjs";
import fs from "fs";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.location = { search: "" };
globalThis.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } }) };
const G = new URL("../../src/modes/scramble", import.meta.url).href;
const { Game, STAGE, PHYS, ROUND_BARS } = await import(G + "/core.js");
const { ScrambleScene } = await import(G + "/ScrambleScene.js");
const scene = fs.readFileSync(new URL("../../src/modes/scramble/ScrambleScene.js", import.meta.url), "utf8");
const num = (k) => +(scene.match(new RegExp(`\\b${k}: ([\\d.]+)`))?.[1] ?? NaN);

/** กราฟิกปลอมที่จำทุกอย่างที่ถูกวาดลงไป */
const mkG = () => ({
  circles: [], arcs: [], tris: [],
  fillStyle(c, a) { this.c = c; this.a = a; return this; },
  lineStyle(w, c, a) { this.lw = w; this.c = c; this.a = a; return this; },
  fillCircle(x, y, r) { this.circles.push({ x, y, r, c: this.c }); return this; },
  strokeCircle(x, y, r) { this.circles.push({ x, y, r, c: this.c, stroke: true }); return this; },
  beginPath() { this._arc = null; return this; },
  arc(x, y, r, a0, a1) { this._arc = { x, y, r, a0, a1, c: this.c, lw: this.lw }; return this; },
  strokePath() { if (this._arc) this.arcs.push(this._arc); return this; },
  fillTriangle(...p) { this.tris.push({ p, c: this.c, fill: true }); return this; },
  strokeTriangle(...p) { this.tris.push({ p, c: this.c, fill: false }); return this; },
});

const mk = ({ seats = 2, seat = 0, versus = "solo", viewW = STAGE.w } = {}) => {
  const sc = { viewW, versus, netSeat: versus === "net" ? seat : undefined, netSeats: seats, showTags: true };
  sc.sim = new Game();
  if (seats === 4) sc.sim.setRoster(4);
  for (const m of ["_podSpots", "_drawPods", "_drawTags", "mySeat"]) sc[m] = ScrambleScene.prototype[m];
  return sc;
};

// ══ ตำแหน่งแผง: ทีมแรกชิดซ้าย ทีมสองชิดขวา ไม่ทับกันไม่ว่ากี่คน ═══════════════
{
  const two = mk();
  const s2 = two._podSpots(two.sim);
  ok(s2.length === 2, `1v1 ได้สองแผง (${s2.length})`);
  ok(s2[0].x < STAGE.w / 2 && s2[1].x > STAGE.w / 2, `แยกกันคนละฝั่งจอ (${s2[0].x} · ${s2[1].x})`);

  const four = mk({ seats: 4 });
  const s4 = four._podSpots(four.sim);
  ok(s4.length === 4, `2v2 ได้สี่แผง (${s4.length})`);
  // ทีมเดียวกันต้องอยู่ฝั่งเดียวกัน — ข้อมูลสำคัญที่สุดบนจอตอนเล่นเป็นทีมคือ "ใครอยู่ทีมใคร"
  const byTeam = {};
  for (const sp of s4) (byTeam[sp.f.team] ??= []).push(sp.x);
  const sides = Object.values(byTeam).map((xs) => xs.every((x) => x < STAGE.w / 2));
  ok(sides[0] !== sides[1], "สองทีมอยู่คนละฝั่งจอ ไม่ปนกัน");
  ok(Object.values(byTeam).every((xs) => new Set(xs).size === xs.length), "คนในทีมเดียวกันไม่ทับตำแหน่งกัน");

  // ไม่มีแผงไหนล้นขอบจอ — ล้นแล้ววงเลือดของคนที่สี่จะโดนตัดครึ่ง
  const r = num("r") * num("mine") + num("gap") + num("ring");
  const bad = s4.filter((sp) => sp.x - r < 0 || sp.x + r > STAGE.w);
  ok(bad.length === 0, `ทุกแผงอยู่ในจอครบ (ล้น ${bad.length} แผง)`);
}

// ══ วงเลือด: ยาวตามเลือดจริง และของเรามีวงพลังเพิ่ม ═══════════════════════════
{
  const sc = mk();
  sc.sim.fighters[0].hp = sc.sim.fighters[0].maxHp;
  sc.sim.fighters[1].hp = sc.sim.fighters[1].maxHp * 0.25;
  const g = mkG();
  sc._drawPods(sc.sim, g);

  const spots = sc._podSpots(sc.sim);
  const arcAt = (x) => g.arcs.filter((a) => Math.abs(a.x - x) < 1);
  const sweep = (a) => Math.abs(a.a1 - a.a0);
  // แต่ละแผงมีรางหนึ่งวง + ส่วนที่เหลือจริงหนึ่งวง (ของเราเพิ่มวงพลังอีกสองวง)
  const full = arcAt(spots[0].x), low = arcAt(spots[1].x);
  ok(full.length >= 2 && low.length >= 2, `วาดทั้งรางและส่วนที่เหลือ (${full.length} · ${low.length})`);
  // เลือดเต็มต้องกวาดยาวกว่าเลือด 25% อย่างชัดเจน
  const liveFull = full[1], liveLow = low[1];
  ok(sweep(liveFull) > sweep(liveLow) * 3,
    `เลือดเต็มกวาดยาวกว่าเลือดน้อยตามสัดส่วนจริง (${(sweep(liveFull) * 57.3).toFixed(0)}° เทียบ ${(sweep(liveLow) * 57.3).toFixed(0)}°)`);
  // เลือดน้อยเปลี่ยนสี — อ่านออกจากหางตาโดยไม่ต้องวัดความยาววง
  ok(liveFull.c !== liveLow.c, "เลือดน้อยเปลี่ยนสี ไม่ใช่แค่สั้นลง");

  // ของเราได้วงพลัง (ki) เพิ่ม คนอื่นไม่ได้ — เราใช้ ki ของเราคนเดียว
  ok(full.length > low.length, `ของเรามีวงมากกว่า (วงพลัง) — ${full.length} เทียบ ${low.length}`);
  // และวงทองรอบนอกบอกว่าอันไหนคือเรา
  const ring = g.circles.filter((c) => c.stroke && Math.abs(c.x - spots[0].x) < 1);
  ok(ring.length === 1, `ของเรามีวงทองรอบนอกหนึ่งวง (${ring.length})`);
  ok(!g.circles.some((c) => c.stroke && Math.abs(c.x - spots[1].x) < 1), "คนอื่นไม่มี");
}

// ── จุดบอกยก: มีเฉพาะตอนเปิดระบบยก และนับตามหลอดที่เหลือจริง ──
{
  const off = mk();
  const g1 = mkG();
  off._drawPods(off.sim, g1);
  const pipsOff = g1.circles.filter((c) => c.r <= num("pip"));
  ok(pipsOff.length === 0, "โหมดซ้อมไม่มีจุดบอกยก (ไม่มียกให้บอก)");

  const on = mk();
  on.sim.startMatch();
  on.sim.match.bars = [ROUND_BARS, 1];
  const g2 = mkG();
  on._drawPods(on.sim, g2);
  const spots = on._podSpots(on.sim);
  // จุดเรียงกระจายรอบจุดกลางวง ไม่ได้ซ้อนกันอยู่ที่จุดเดียว — นับเป็นช่วง
  const litAt = (x) => g2.circles.filter((c) => c.r < num("pip") && Math.abs(c.x - x) < 40).length;
  ok(litAt(spots[0].x) === ROUND_BARS, `ทีมที่ยังครบได้จุดเต็ม ${ROUND_BARS} (${litAt(spots[0].x)})`);
  ok(litAt(spots[1].x) === 1, `ทีมที่เหลือหลอดเดียวได้จุดเดียว (${litAt(spots[1].x)})`);
}

// ══ ลูกศรเหนือหัว ══════════════════════════════════════════════════════════════
{
  const sc = mk({ seats: 4 });
  const g = mkG();
  sc._drawTags(sc.sim, g);
  // ป้ายหนึ่งอันวาดสองชั้นเสมอ: เงาเข้มข้างหลัง + ตัวป้ายข้างหน้า
  // ไม่มีเงาแล้วป้ายสีทองจะกลืนหายไปกับฟ้ากลางวัน ซึ่งเป็นฉากหลังที่ใช้จริง
  ok(g.tris.length === 8, `ติดป้ายครบทุกคน คนละสองชั้น (${g.tris.length}/8)`);

  // ของเราต้องทึบ คนอื่นเป็นเส้น — แยกออกในเสี้ยววินาทีโดยไม่ต้องอ่านสี
  const filled = g.tris.filter((t) => t.fill);
  ok(filled.length === 2, `ของเราวาดทึบ (พื้นเงา + ตัวป้าย = 2 ชิ้น · ได้ ${filled.length})`);
  ok(g.tris.filter((t) => !t.fill).length === 6, "คนอื่นสามคนวาดเป็นเส้น คนละสองชั้น (เงา + สี)");

  // สีตามทีม ไม่ใช่ตามคน — ข้อมูลที่ต้องการตอนวุ่นคือ "ฝั่งไหนพวกเรา"
  const teamOf = (x) => sc.sim.fighters.find((f) => Math.abs(f.x - x) < 1)?.team;
  const SHADOW = 0x0c111c;   // ชั้นเงาใช้สีเดียวกันทุกทีม ไม่ใช่สีประจำทีม
  const colors = {};
  for (const t of g.tris) {
    const team = teamOf(t.p[0]);
    if (team === undefined || t.c === SHADOW) continue;
    (colors[team] ??= new Set()).add(t.c);
  }
  const t0 = [...(colors[0] ?? [])], t1 = [...(colors[1] ?? [])];
  ok(t0.length && t1.length && !t0.some((c) => t1.includes(c)),
    `สองทีมใช้คนละสี (${t0.map((c) => c.toString(16)).join()} เทียบ ${t1.map((c) => c.toString(16)).join()})`);

  // อยู่เหนือหัว ไม่ใช่เหนือเท้า — ไม่งั้นตอนกระโดดป้ายจะจมอยู่กลางตัว
  const me = sc.sim.fighters[0];
  const mine = g.tris.find((t) => t.fill && Math.abs(t.p[0] - me.x) < 1);
  ok(mine && mine.p[1] < me.y - PHYS.standH, `ป้ายอยู่เหนือหัวจริง (${mine?.p[1].toFixed(0)} < ${me.y - PHYS.standH})`);

  // ล้มแล้วไม่ต้องติดป้าย — ตอนนั้นไม่มีใครต้องหามันเจอ และป้ายจะไปกองกับป้ายน็อก
  sc.sim.fighters[1].hp = 0;
  const g2 = mkG();
  sc._drawTags(sc.sim, g2);
  ok(g2.tris.length === 6, `คนที่ล้มไม่มีป้าย เหลือสามคนคนละสองชั้น (${g2.tris.length}/6)`);

  // ปิดแล้วต้องไม่วาดอะไรเลย
  sc.showTags = false;
  const g3 = mkG();
  sc._drawTags(sc.sim, g3);
  ok(g3.tris.length === 0, "ปิดแล้วไม่วาดอะไรเลย");
}

// ── ต่อเน็ต: ป้ายทึบต้องอยู่ที่ช่องของเรา ไม่ใช่ช่องแรกเสมอ ──
//
// เขียน p1 ตายตัวแล้วแขกจะเห็นป้าย "ตัวคุณ" ลอยอยู่บนหัวคู่ต่อสู้ ซึ่งแย่กว่าไม่มีป้ายเลย
{
  for (const seat of [0, 1, 2, 3]) {
    const sc = mk({ seats: 4, seat, versus: "net" });
    const g = mkG();
    sc._drawTags(sc.sim, g);
    const me = sc.sim.fighters[seat];
    const mine = g.tris.filter((t) => t.fill);
    ok(mine.length === 2 && Math.abs(mine[0].p[0] - me.x) < 1,
      `ที่นั่ง ${seat}: ป้ายทึบอยู่บนหัวตัวเอง (x=${mine[0]?.p[0]} ควรเป็น ${me.x})`);
  }
}
