// ทดสอบล็อบบี้เลือกโหมด (LobbyScene) โดยเฉพาะตอนเล่นออนไลน์
// รัน: node tools/tests/lobby_online.test.mjs   (จากโฟลเดอร์ game) — ต้องขึ้น PASS ทุกบรรทัด
//
// ทำไมต้องมีเทสต์นี้: ฟีเจอร์ "เลือกโหมด" (branch นี้) กับ "เล่นออนไลน์" (netplay จาก master)
// ถูกพัฒนาแยกกันคนละสายแล้วมา merge กัน จุดที่ชนกันคือโหมดถูกเลือกที่เครื่องใครเครื่องมัน
// แต่ registry ไม่ได้ซิงก์ข้ามเน็ต ถ้า host เลือก platform แล้ว guest เลือกปกติ จะได้คนละขนาดตัวละคร
// คนละ physics คนละลิสต์แมพ = ภาพหลุดกันทันทีตั้งแต่เฟรมแรก และไม่มีทางรู้จนกว่าจะมีคนเล่นจริงสองคน
import { makeScene } from "./phaser_stub.mjs";
const G = new URL("../../src", import.meta.url).href;
const { LobbyScene } = await import(G + "/scenes/LobbyScene.js");
const { DEFAULT_GAME_MODE, GAME_MODES } = await import(G + "/config/mode.config.js");
const { ROSTER_ORDER, DEFAULT_P1_CHARACTER, DEFAULT_P2_CHARACTER } = await import(G + "/entities/roster.js");

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);

function makeLobby(online) {
  const scene = makeScene();
  const lobby = new LobbyScene();
  Object.assign(lobby, scene);
  lobby.registry = {
    store: new Map(),
    set(k, v) { this.store.set(k, v); },
    get(k) { return this.store.get(k); },
    remove(k) { this.store.delete(k); this.removed = k; },
  };
  lobby.scene = { started: null, start(k) { this.started = k; } };
  lobby._isOnline = () => online; // แทน getSession() จริง ไม่ต้องมี PeerJS ในเทสต์
  return lobby;
}

// ── ออนไลน์: ข้ามหน้าเลือกโหมด บังคับโหมดปกติทั้งสองฝั่ง ──
{
  const lobby = makeLobby(true);
  lobby.registry.set("gameMode", "platform"); // ค้างจากรอบเล่นออฟไลน์ก่อนหน้า — ต้องถูกทับ
  lobby.create();
  ok(lobby.scene.started === "MainGameScene", "ออนไลน์: เข้า MainGameScene ทันที ไม่ผ่านหน้าเลือกโหมด");
  ok(
    lobby.registry.get("gameMode") === DEFAULT_GAME_MODE,
    `ออนไลน์: บังคับโหมดปกติเสมอ ทับค่าที่ค้างจากรอบก่อน (ได้ ${lobby.registry.get("gameMode")})`
  );
  ok(lobby.log.filter((l) => l.startsWith("rect")).length === 0, "ออนไลน์: ไม่วาดการ์ดเลือกโหมดเลยสักใบ");
  ok(lobby.log.filter((l) => l.startsWith("text:")).length === 0, "ออนไลน์: ไม่วาดตัวหนังสือหัวข้อ/คำอธิบายเลย");
  ok(lobby.portraitCells == null, "ออนไลน์: ข้ามหน้าเลือกตัวละครด้วย (ตัวละครสองฝั่งต้องตรงกัน ห้ามให้เลือกแยกกัน)");
}

// ── ออฟไลน์: ยังได้หน้าเลือกโหมดครบเหมือนเดิม ──
{
  const lobby = makeLobby(false);
  lobby.create();
  ok(lobby.scene.started === null, "ออฟไลน์: ยังไม่เข้าเกมจนกว่าจะคลิกเลือกโหมด");
  const cards = lobby.log.filter((l) => l.startsWith("rect")).length;
  ok(cards === Object.keys(GAME_MODES).length, `ออฟไลน์: วาดการ์ดครบทุกโหมด (ได้ ${cards} จาก ${Object.keys(GAME_MODES).length})`);
}

// ── ออฟไลน์: คลิกการ์ดแล้วเซฟโหมดลง registry + ล้าง levelKey เดิม ──
{
  const lobby = makeLobby(false);
  lobby.registry.set("levelKey", "sakura_heights"); // ค้างจากโหมด platform รอบก่อน
  lobby._selectMode("normal");
  ok(lobby.scene.started === null, "เลือกโหมดแล้วยังไม่เข้าเกม ไปหน้าเลือกตัวละครก่อน");
  ok(lobby.portraitCells.length === ROSTER_ORDER.length * 2, `หน้าเลือกตัวมีสองแถว ตัวเรา+คู่ต่อสู้ (${lobby.portraitCells.length} ช่อง)`);
  lobby._startGame(lobby.pendingMode);
  ok(lobby.registry.get("gameMode") === "normal", "กดเริ่มเล่นแล้วเซฟโหมดลง registry");
  ok(lobby.registry.get("levelKey") === undefined, "ล้าง levelKey เดิมทิ้ง (แมพของโหมดก่อนอาจไม่มีในโหมดใหม่)");
  ok(lobby.scene.started === "MainGameScene", "กดเริ่มเล่นแล้วเข้า MainGameScene");
}

// ── หน้าเลือกตัวละคร: แตะรูปแล้วเปลี่ยนตัว และแยกสองฝั่งอิสระจากกัน ──
{
  const lobby = makeLobby(false);
  lobby._selectMode("normal");
  ok(
    lobby.picked.charP1 === DEFAULT_P1_CHARACTER && lobby.picked.charP2 === DEFAULT_P2_CHARACTER,
    "เปิดมาตั้งต้นที่ตัวละครเริ่มต้นของแต่ละฝั่ง"
  );

  const other = ROSTER_ORDER.find((k) => k !== DEFAULT_P1_CHARACTER);
  lobby.portraitCells.find((c) => c.side === "charP1" && c.key === other).frame.emit("pointerdown");
  ok(lobby.picked.charP1 === other, `แตะรูปแถวบนแล้วเปลี่ยนตัวเราเป็น ${other}`);
  ok(lobby.picked.charP2 === DEFAULT_P2_CHARACTER, "เปลี่ยนตัวเราแล้วตัวคู่ต่อสู้ไม่เปลี่ยนตาม (สองแถวอิสระจากกัน)");

  const foe = ROSTER_ORDER.find((k) => k !== DEFAULT_P2_CHARACTER);
  lobby.portraitCells.find((c) => c.side === "charP2" && c.key === foe).frame.emit("pointerdown");
  ok(lobby.picked.charP2 === foe, `แตะรูปแถวล่างแล้วเปลี่ยนคู่ต่อสู้เป็น ${foe}`);

  lobby._startGame(lobby.pendingMode);
  ok(lobby.registry.get("charP1") === other, "กดเริ่มเล่นแล้วตัวที่เลือกถูกเซฟลง registry.charP1");
  ok(lobby.registry.get("charP2") === foe, "และ registry.charP2 ด้วย");
}

// ── เลือกตัวเดิมซ้ำ เลือกได้ทุกตัวในโรสเตอร์ ──
{
  const lobby = makeLobby(false);
  lobby._selectMode("platform");
  for (const key of ROSTER_ORDER) {
    lobby.portraitCells.find((c) => c.side === "charP1" && c.key === key).frame.emit("pointerdown");
    if (lobby.picked.charP1 !== key) { ok(false, `เลือก ${key} ไม่ได้`); break; }
  }
  ok(lobby.picked.charP1 === ROSTER_ORDER[ROSTER_ORDER.length - 1], `เลือกได้ครบทุกตัวใน ROSTER_ORDER (${ROSTER_ORDER.length} ตัว)`);
  ok(lobby.pendingMode === "platform", "โหมดที่เลือกไว้ยังค้างอยู่ระหว่างเลือกตัวละคร ไม่หายไป");
}

// ── รูปย่อต้องมีจริงและโหลดในล็อบบี้ ไม่ใช่ atlas ตัวละครจริง (ไฟล์ละ ~9 MB) ──
{
  const fs = await import("fs");
  const lobby = makeLobby(false);
  lobby.preload();
  ok(lobby.log.includes("load.atlas:portraits"), "ล็อบบี้โหลด atlas รูปย่อ ไม่ใช่ atlas ตัวละครเต็ม");

  const url = new URL("../../assets/characters/portraits.json", import.meta.url);
  const portraits = JSON.parse(fs.readFileSync(url));
  const missing = ROSTER_ORDER.filter((k) => !portraits.frames[`${k}.png`]);
  ok(missing.length === 0, `มีรูปย่อครบทุกตัวในโรสเตอร์ (ขาด ${missing})`);
  const png = fs.statSync(new URL("../../assets/characters/portraits.png", import.meta.url)).size;
  ok(png < 1.5e6, `ไฟล์รูปย่อเล็กพอสำหรับเน็ตมือถือ (${(png / 1e6).toFixed(2)} MB)`);
}

// ── โหมดที่เลือกได้ต้องมีอยู่จริงใน GAME_MODES (กันพิมพ์ชื่อผิดแล้วตกไป default เงียบๆ) ──
{
  ok(GAME_MODES[DEFAULT_GAME_MODE] != null, `DEFAULT_GAME_MODE ("${DEFAULT_GAME_MODE}") มีอยู่จริงใน GAME_MODES`);
  ok(
    (GAME_MODES[DEFAULT_GAME_MODE].characterScaleMul ?? 1) === 1,
    "โหมดที่บังคับตอนออนไลน์ต้องเป็นโหมดขนาดตัวละครปกติ (scaleMul = 1) ไม่ใช่โหมดที่ย่อตัว"
  );
}

console.log("\nLobbyScene: online forces default mode (no per-side mode desync), offline mode-select unchanged");
