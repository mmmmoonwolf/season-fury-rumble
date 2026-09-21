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
  ok(lobby.registry.get("gameMode") === "normal", "เลือกโหมดแล้วเซฟลง registry");
  ok(lobby.registry.get("levelKey") === undefined, "เลือกโหมดใหม่แล้วล้าง levelKey เดิมทิ้ง (แมพของโหมดก่อนอาจไม่มีในโหมดใหม่)");
  ok(lobby.scene.started === "MainGameScene", "เลือกโหมดแล้วเข้า MainGameScene");
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
