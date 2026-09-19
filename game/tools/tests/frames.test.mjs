// ตรวจว่าทุกเฟรมที่ animation ของทุกตัวละคร (รวมร่างแปลง) อ้างถึง มีอยู่จริงใน atlas
// รัน: node tools/tests/frames.test.mjs   (จากโฟลเดอร์ game)
import fs from "fs";
import "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { ROSTER } = await import(G + "/entities/roster.js");

const atlases = {};
const created = [];
const scene = {
  load: { atlas: (key, png, json) => (atlases[key] = JSON.parse(fs.readFileSync(new URL("../../" + json, import.meta.url))).frames) },
  anims: { _k: new Set(), exists(k) { return this._k.has(k); }, create(def) { this._k.add(def.key); created.push(def); } },
};
let fail = 0;
for (const [key, C] of Object.entries(ROSTER)) {
  C.preload(scene);
  C.registerAnimations(scene);
}
for (const def of created) {
  for (const f of def.frames) {
    if (!atlases[f.key]) { console.log(`FAIL ${def.key}: ไม่มี atlas "${f.key}"`); fail++; continue; }
    if (!atlases[f.key][f.frame]) { console.log(`FAIL ${def.key}: ไม่มีเฟรม ${f.frame} ใน ${f.key}`); fail++; }
  }
}
// ร่างแปลงต้องมีท่าที่ state ใช้ครบ
for (const C of Object.values(ROSTER)) {
  const A = C.FORM_ALT;
  if (!A) continue;
  for (const n of ["idle", "run", "jump", "fall", "land", "hurt", "attack_1", "attack_2", "attack_3", "finisher", "roar"]) {
    if (!scene.anims.exists(A.prefix + n)) { console.log(`FAIL ${A.prefix}${n} ไม่ได้ลงทะเบียน`); fail++; }
  }
  for (const [n, d] of Object.entries(A.skills ?? {})) {
    if (!scene.anims.exists(A.prefix + d.anim)) { console.log(`FAIL สกิล ${n}: ไม่มีท่า ${A.prefix}${d.anim}`); fail++; }
  }
  for (const n of ["tf_glow", "tf_erupt"]) {
    const base = C.name.toLowerCase() + "/";
    if (!scene.anims.exists(base + n)) { console.log(`FAIL ${base}${n} ไม่ได้ลงทะเบียน`); fail++; }
  }
  if (!atlases[A.textureKey]?.[A.firstFrame]) { console.log(`FAIL firstFrame ${A.firstFrame}`); fail++; }
}
// v32 สกิลของร่างปกติ (static SKILLS) + ท่าย่องแทนท่าปกติ (static SNEAK_ANIMS) ต้องลงทะเบียนจริง
for (const C of Object.values(ROSTER)) {
  const pre = C.ANIM_PREFIX;
  for (const [n, d] of Object.entries(C.SKILLS ?? {})) {
    if (d.anim && !scene.anims.exists(pre + d.anim)) { console.log(`FAIL ${pre} สกิล ${n}: ไม่มีท่า ${pre}${d.anim}`); fail++; }
  }
  for (const to of Object.values(C.SNEAK_ANIMS ?? {})) {
    if (!scene.anims.exists(pre + to)) { console.log(`FAIL ${pre} SNEAK_ANIMS: ไม่มีท่า ${pre}${to}`); fail++; }
  }
  if (C.SNEAK_ANIMS) for (const v of ["A", "B"]) {
    if (!scene.anims.exists(`${pre}sneak_stab${v}`)) { console.log(`FAIL ${pre}sneak_stab${v} ไม่ได้ลงทะเบียน`); fail++; }
  }
}
// v33 ง้างเตะไททัน: จำนวนเฟรม/จังหวะใน config ต้องตรงกับที่ build ออกมา (meta.kick)
{
  const { TITAN_SKILL1 } = await import(G + "/config/combat.config.js");
  const m = JSON.parse(fs.readFileSync(new URL("../../assets/characters/oattitan_kick_atlas.json", import.meta.url))).meta.kick;
  const n = Object.keys(atlases.oattitan_kick ?? {}).length;
  if (!m || n !== TITAN_SKILL1.frames || m.contactIndex !== TITAN_SKILL1.contactIndex || m.swingSoundIndex !== TITAN_SKILL1.swingIndex) {
    console.log(`FAIL TITAN_SKILL1 ไม่ตรงกับ oattitan_kick_atlas (เฟรม ${n}, meta ${JSON.stringify(m)})`); fail++;
  }
}
// v34 ลูกโป่ง: จำนวนเฟรม/จังหวะใน config ต้องตรงกับที่ build ออกมา
{
  const { DEARV2_BALLOON: DB, DV2FX_META } = await import(G + "/config/dearv2.config.js");
  const rd = (n) => JSON.parse(fs.readFileSync(new URL(`../../assets/characters/${n}.json`, import.meta.url)));
  const bal = rd("dearv2_balloon_atlas"), fxm = rd("dv2fx_atlas").meta.fx;
  const cnt = (pre) => Object.keys(bal.frames).filter((k) => k.startsWith(pre + "_")).length;
  const bad = [];
  if (cnt("throw") !== DB.throw.frames) bad.push(`throw ${cnt("throw")} != ${DB.throw.frames}`);
  if (cnt("place") !== DB.trap.frames) bad.push(`place ${cnt("place")} != ${DB.trap.frames}`);
  if (bal.meta.releaseIndex !== DB.throw.releaseIndex) bad.push("releaseIndex");
  if (bal.meta.placeIndex !== DB.trap.placeIndex) bad.push("placeIndex");
  for (const [k, v] of Object.entries(fxm)) {
    const c = DV2FX_META[k];
    if (!c || c.frames !== v.frames || c.originX !== v.originX || c.originY !== v.originY) bad.push(`DV2FX_META.${k}`);
  }
  if (bad.length) { console.log("FAIL config ลูกโป่งไม่ตรงกับ atlas: " + bad.join(", ")); fail++; }
}
// ท่าหนึ่งท่าใช้เฟรมจากหลาย atlas ได้ — แต่ผืนภาพต้องขนาดเดียวกันทั้งท่า ไม่งั้นตัวกระโดดตอนข้ามไฟล์
const sizeOf = (k, f) => { const s = atlases[k][f].sourceSize; return `${s.w}x${s.h}`; };
const bySprite = new Map(); // prefix ตัวละคร -> ขนาดผืนภาพที่พบ
for (const def of created) {
  // ร่างแปลงนับเป็นตัวเดียวกับร่างปกติ · ไททันบ้าแต่ละตัวเป็น sprite แยก (ผืนภาพต่างกันได้)
  // v34 เอฟเฟกต์ลูกโป่ง (dv2fx/*) แต่ละท่าเป็นวัตถุแยก ผืนต่างกันได้ (ท่าเดียวกันยังต้องเท่ากัน — กฎด้านบน)
  const who = def.key.startsWith("crazy/") || def.key.startsWith("dv2fx/") ? def.key : def.key.split("/")[0].replace(/titan$/, "");
  for (const f of def.frames) {
    if (!atlases[f.key]?.[f.frame]) continue;
    const sz = sizeOf(f.key, f.frame);
    if (!bySprite.has(who)) bySprite.set(who, new Set());
    bySprite.get(who).add(sz);
  }
}
for (const [who, sizes] of bySprite) {
  if (sizes.size > 1) { console.log(`FAIL ${who}: ผืนภาพหลายขนาด ${[...sizes]}`); fail++; }
}
// ค่าผืนภาพของไททันบ้าใน config ต้องตรงกับที่ build ออกมา (meta.titans)
{
  const { TITAN_SKILL3 } = await import(G + "/config/combat.config.js");
  const meta = JSON.parse(fs.readFileSync(new URL("../../assets/characters/crazytitans_atlas.json", import.meta.url))).meta;
  for (const r of TITAN_SKILL3.runners) {
    const m = meta.titans[r.kind];
    const same = m && m.canvas[0] === r.canvas[0] && m.canvas[1] === r.canvas[1] && m.anchorX === r.anchorX && m.feetY === r.feetY && m.frames === r.frames;
    if (!same) { console.log(`FAIL TITAN_SKILL3.runners.${r.kind} ไม่ตรงกับ crazytitans_atlas.json meta`, JSON.stringify(m)); fail++; }
  }
  if (meta.storeMul !== TITAN_SKILL3.storeMul) { console.log("FAIL storeMul ไม่ตรง"); fail++; }
}
// ปากกระบอกลูกซองใน KunJae.js ต้องตรงกับที่ build วัดได้ (meta.muzzle) · สกิลอาวุธต้องมีท่า
{
  const { KunJae, KUNJAE_ATLAS, KUNJAE_WHIPSKILL_ATLAS } = await import(G + "/entities/KunJae.js");
  const meta = JSON.parse(fs.readFileSync(new URL("../../assets/characters/kunjae_atlas.json", import.meta.url))).meta;
  if (JSON.stringify(meta.muzzle) !== JSON.stringify(KUNJAE_ATLAS.muzzle)) { console.log("FAIL KUNJAE_ATLAS.muzzle ไม่ตรงกับ meta.muzzle", JSON.stringify(meta.muzzle)); fail++; }
  const m2 = JSON.parse(fs.readFileSync(new URL("../../assets/characters/kunjae_whipskill_atlas.json", import.meta.url))).meta;
  if (JSON.stringify(Object.values(m2.lassoTip)) !== JSON.stringify(KUNJAE_WHIPSKILL_ATLAS.lassoTip) || m2.kickX !== KUNJAE_WHIPSKILL_ATLAS.kickX) {
    console.log("FAIL KUNJAE_WHIPSKILL_ATLAS.lassoTip/kickX ไม่ตรงกับ meta", JSON.stringify(Object.values(m2.lassoTip)), m2.kickX); fail++;
  }
  // ไฟล์เสียงที่ config อ้าง ต้องมีจริง
  const { SAMPLES } = await import(G + "/config/audio.config.js");
  for (const [k, s] of Object.entries(SAMPLES)) {
    if (!fs.existsSync(new URL("../../" + s.path, import.meta.url))) { console.log(`FAIL ไม่มีไฟล์เสียง ${k}: ${s.path}`); fail++; }
  }
  for (const w of KunJae.WEAPONS) {
    for (const [n, d] of Object.entries(w.skills)) {
      if (typeof d === "object" && !scene.anims.exists(w.prefix + d.anim)) { console.log(`FAIL ${w.key} สกิล ${n}: ไม่มีท่า ${w.prefix}${d.anim}`); fail++; }
    }
    // ทุกอาวุธต้องมีชุดท่าที่ state ใช้ครบ (สลับอาวุธกลางท่าไหนก็ได้)
    for (const n of ["idle", "run", "jump", "fall", "land", "hurt", "attack_1", "attack_2", "attack_3", "finisher"]) {
      if (!scene.anims.exists(w.prefix + n)) { console.log(`FAIL ${w.key}: ไม่มีท่า ${w.prefix}${n}`); fail++; }
    }
  }
}
// เมธอดชื่อซ้ำใน class (JS ไม่ error — ตัวหลังทับตัวแรกเงียบ ๆ)
for (const f of ["entities/Player.js", "scenes/MainGameScene.js", "systems/CombatSystem.js", "effects/TransformEffect.js", "effects/GunEffects.js", "systems/CrazyTitanSystem.js"]) {
  const src = fs.readFileSync(new URL("../../src/" + f, import.meta.url), "utf8");
  // ตรวจทีละ class (ไฟล์เดียวมีหลาย class ได้ ชื่อเมธอดซ้ำข้าม class ไม่ผิด)
  for (const body of src.split(/^(?:export )?class /m).slice(1)) {
    const names = [...body.matchAll(/^  (?:static )?(?:get )?([A-Za-z_$][\w$]*)\([^)]*\) \{$/gm)].map((m) => m[1]);
    const dup = names.filter((n, i) => names.indexOf(n) !== i && n !== "constructor");
    if (dup.length) { console.log(`FAIL ${f} (class ${body.split(/\s/)[0]}): เมธอดซ้ำ ${[...new Set(dup)]}`); fail++; }
  }
}
console.log(fail ? `${fail} FAIL` : `PASS ${created.length} animations, ${Object.keys(atlases).length} atlases`);
process.exit(fail ? 1 : 0);
