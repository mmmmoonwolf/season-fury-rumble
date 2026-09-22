import { GAME_MODES, DEFAULT_GAME_MODE } from "../config/mode.config.js";
import { getSession } from "../net/session.js";
import { ROSTER, ROSTER_ORDER, DEFAULT_P1_CHARACTER, DEFAULT_P2_CHARACTER } from "../entities/roster.js";

/**
 * ล็อบบี้เลือกโหมดเกม — หน้าจอแรกก่อนเข้า MainGameScene (ดู index.html: scene: [LobbyScene, MainGameScene])
 *
 * เลือกแล้วเซฟลง registry (คงอยู่ข้าม scene.restart() เหมือน levelKey/charP1/charP2 เดิม)
 * แล้ว this.scene.start("MainGameScene") — MainGameScene.init() จะอ่าน registry.gameMode
 * เพื่อเลือกทั้ง LEVEL_ORDER (แมพไหนสลับด้วยปุ่ม M ได้บ้าง) และตัวคูณ physics/ขนาดตัวละคร
 * (ดู GAME_MODES ใน config/mode.config.js)
 *
 * มีสองหน้าต่อกัน: เลือกโหมด -> เลือกตัวละคร -> เข้าเกม
 * หน้าเลือกตัวละครจำเป็นเพราะเดิมเปลี่ยนตัวได้ด้วยปุ่ม V/C บนคีย์บอร์ดเท่านั้น บนมือถือจึงเปลี่ยนไม่ได้เลย
 * และต่อให้อยู่บนคอม การกด V วนไปเรื่อย ๆ ก็ไม่เห็นว่ากำลังจะได้ตัวไหน ต้องกดจนกว่าจะเจอ
 *
 * กด M ระหว่างเล่นยังสลับแมพภายในโหมดเดิมได้ตามปกติ — จะกลับมาเลือกโหมดใหม่ต้อง reload หน้าเว็บ
 * (ยังไม่มีปุ่ม "กลับล็อบบี้" กลางเกม — ไม่ใช่ scope ของงานนี้ เพิ่มทีหลังได้ถ้าต้องการ)
 */
export class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  preload() {
    // รูปย่อสำหรับหน้าเลือกตัว ไม่ใช่ atlas ตัวละครจริง (ที่ไฟล์ละราว 9 MB)
    // โหลดที่นี่เพื่อให้หน้าล็อบบี้ขึ้นเร็ว ส่วน atlas จริง MainGameScene ค่อยโหลดตอนเข้าเกม
    this.load.atlas("portraits", "assets/characters/portraits.png", "assets/characters/portraits.json");
  }

  create() {
    // เล่นออนไลน์: ข้ามหน้าเลือกโหมดไปเลย บังคับโหมดปกติทั้งสองฝั่ง
    // การเลือกโหมดเกิดที่เครื่องใครเครื่องมัน (registry ไม่ได้ซิงก์ข้ามเน็ต) ถ้าปล่อยให้เลือกได้
    // host กับ guest อาจได้คนละโหมด = คนละขนาดตัวละคร คนละ physics คนละลิสต์แมพ ภาพจะหลุดกันทันที
    // เป็นเหตุผลเดียวกับที่ MainGameScene บังคับ levelOrder[0] ตอนออนไลน์ (ดู create())
    if (this._isOnline()) {
      this._startGame(DEFAULT_GAME_MODE);
      return;
    }

    // ใช้ this.sys.game.config.width/height (ค่าคงที่ 1280x720 จาก index.html) แทน this.scale.width/height
    // เพราะ this.scale.* บางเบราว์เซอร์/เครื่องคืนค่าตามขนาดหน้าต่างจริงก่อน Scale Manager ปรับ FIT เสร็จ
    // ทำให้เลย์เอาต์เพี้ยนไปคนละขนาดจอ (การ์ดโหมด/ตัวหนังสือหลุดขอบจอ) — MainGameScene._setupHud ก็ใช้วิธีนี้อยู่แล้ว
    const w = this.sys.game.config.width;
    const h = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor("#0f172a");

    this.add
      .text(w / 2, h * 0.18, "SEASON FURY RUMBLE", {
        font: "44px monospace",
        color: "#f8fafc",
        stroke: "#0f172a",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.18 + 46, "เลือกโหมดเกม", {
        font: "20px monospace",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    const modeKeys = Object.keys(GAME_MODES);
    // ความกว้างการ์ดคิดจากจำนวนโหมด ไม่ fix ไว้ — เพิ่มโหมดใหม่แล้วการ์ดไม่ล้นขอบจอเอง
    const gap = 40;
    const margin = 60;
    const cardW = Math.min(380, (w - margin * 2 - gap * (modeKeys.length - 1)) / modeKeys.length);
    const cardH = 220;
    const totalW = cardW * modeKeys.length + gap * (modeKeys.length - 1);
    const startX = w / 2 - totalW / 2 + cardW / 2;
    const cardY = h * 0.56;

    modeKeys.forEach((key, i) => {
      this._buildModeCard(startX + i * (cardW + gap), cardY, cardW, cardH, GAME_MODES[key]);
    });

    this.add
      .text(w / 2, h * 0.92, "คลิกการ์ดเพื่อเริ่มเล่น — ระหว่างเล่นกด M สลับแมพภายในโหมดเดิมได้ตามปกติ", {
        font: "14px monospace",
        color: "#64748b",
      })
      .setOrigin(0.5);
  }

  _buildModeCard(x, y, w, h, mode) {
    const isPlatform = mode.id === "platform";
    const accent = { platform: 0x38bdf8, scramble: 0xf87171 }[mode.id] ?? 0xfacc15;

    const card = this.add
      .rectangle(x, y, w, h, 0x1e293b, 0.9)
      .setStrokeStyle(3, accent, 0.9)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y - h / 2 + 40, mode.label, { font: "26px monospace", color: "#f8fafc" })
      .setOrigin(0.5);
    this.add
      .text(x, y - h / 2 + 76, mode.subLabel, {
        font: "14px monospace",
        color: "#cbd5e1",
        align: "center",
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);

    // สรุปตัวปรับแต่งของโหมดนี้ให้ดูก่อนเข้าเล่น (เฉพาะโหมด platform ที่มีของพิเศษ)
    if (isPlatform) {
      const lines = [
        `ขนาดตัวละคร ${Math.round(mode.characterScaleMul * 100)}%`,
        `สปีดวิ่ง ${Math.round((mode.physics.RUN_SPEED ?? 1) * 100)}%`,
        "ไม่มีดับเบิลแท็ปวิ่งเร็ว",
        `ดับเบิ้ลจั๊มพ์ ${Math.round((mode.physics.DOUBLE_JUMP_VELOCITY ?? 1) * 100)}%`,
      ];
      this.add
        .text(x, y + h / 2 - 60, lines.join("\n"), {
          font: "13px monospace",
          color: "#7dd3fc",
          align: "center",
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0.5);
    } else {
      const note =
        mode.id === "scramble"
          ? "A/D เดิน · J ตี · L กัน\nSpace กระโดด · Shift วิ่ง\n(ระบบต่อสู้คนละชุดกับโหมดอื่น)"
          : "ควบคุม/ฟิสิกส์เดิมทุกอย่าง";
      this.add
        .text(x, y + h / 2 - (mode.id === "scramble" ? 56 : 40), note, {
          font: "13px monospace",
          color: mode.id === "scramble" ? "#fecaca" : "#fde68a",
          align: "center",
          lineSpacing: 4,
        })
        .setOrigin(0.5);
    }

    card.on("pointerover", () => card.setFillStyle(0x334155, 0.95));
    card.on("pointerout", () => card.setFillStyle(0x1e293b, 0.9));
    card.on("pointerdown", () => this._selectMode(mode.id));
  }

  /** แยกเป็นเมธอดเพื่อให้เทสต์ stub ทับได้ (getSession() อ่าน state ของโมดูล net ตรงๆ) */
  _isOnline() {
    const mode = getSession().mode;
    return mode === "host" || mode === "guest";
  }

  _selectMode(modeKey) {
    this.pendingMode = modeKey;
    // บางโหมดไม่มีตัวละครให้เลือก (เช่น SCRAMBLE ที่เป็นห้องซ้อม Nyx ปะทะหุ่น) — เข้าเกมเลย
    if (GAME_MODES[modeKey]?.skipCharacterSelect) {
      this._startGame(modeKey);
      return;
    }
    this._buildCharacterSelect();
  }

  // ---------- หน้าเลือกตัวละคร ----------

  /**
   * แถวบน = ตัวเรา, แถวล่าง = คู่ต่อสู้ — แตะรูปเพื่อเลือก แล้วกดเริ่มเล่น
   *
   * แยกเป็นสองแถวแทนที่จะเป็น "เลือกทีละฝั่ง" เพราะเห็นทั้งคู่พร้อมกันตลอด
   * รู้ได้ทันทีว่ากำลังจะเจอใคร และเปลี่ยนใจฝั่งไหนก่อนก็ได้ ไม่ต้องย้อนขั้นตอน
   */
  _buildCharacterSelect() {
    this.children.removeAll(); // ล้างหน้าเลือกโหมดทิ้ง ใช้ scene เดิมต่อ ไม่ต้องสร้าง scene ใหม่

    const w = this.sys.game.config.width;
    const h = this.sys.game.config.height;
    this.picked = {
      charP1: this.registry.get("charP1") ?? DEFAULT_P1_CHARACTER,
      charP2: this.registry.get("charP2") ?? DEFAULT_P2_CHARACTER,
    };

    this.add
      .text(w / 2, 46, "เลือกตัวละคร", { font: "34px monospace", color: "#f8fafc" })
      .setOrigin(0.5);
    this.add
      .text(w / 2, 82, GAME_MODES[this.pendingMode]?.label ?? "", { font: "16px monospace", color: "#94a3b8" })
      .setOrigin(0.5);

    this.portraitCells = [];
    this._buildRoster("charP1", 210, "ตัวเรา", 0x7dd3fc);
    this._buildRoster("charP2", 440, "คู่ต่อสู้", 0xfb923c);

    const start = this.add
      .rectangle(w / 2, h - 72, 320, 66, 0x16a34a, 0.92)
      .setStrokeStyle(3, 0x4ade80, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(w / 2, h - 72, "เริ่มเล่น", { font: "26px monospace", color: "#f0fdf4" }).setOrigin(0.5);
    start.on("pointerover", () => start.setFillStyle(0x22c55e, 0.95));
    start.on("pointerout", () => start.setFillStyle(0x16a34a, 0.92));
    start.on("pointerdown", () => this._startGame(this.pendingMode));

    this._refreshPicked();
  }

  /** แถวรูปตัวละครหนึ่งแถว — side คือคีย์ใน registry ("charP1" / "charP2") */
  _buildRoster(side, y, label, accent) {
    const w = this.sys.game.config.width;
    const cellW = 138;
    const cellH = 190; // สูงกว่ารูปเพื่อกันแถบล่างไว้ใส่ชื่อ ไม่ให้ชื่อไปทับขาตัวละคร
    const NAME_STRIP = 34;
    const gap = 18;
    const totalW = ROSTER_ORDER.length * cellW + (ROSTER_ORDER.length - 1) * gap;
    const startX = w / 2 - totalW / 2 + cellW / 2;

    this.add.text(56, y - 14, label, { font: "18px monospace", color: "#cbd5e1" }).setOrigin(0, 0.5);

    ROSTER_ORDER.forEach((key, i) => {
      const x = startX + i * (cellW + gap);
      const frame = this.add
        .rectangle(x, y, cellW, cellH, 0x1e293b, 0.9)
        .setStrokeStyle(3, 0x334155, 1)
        .setInteractive({ useHandCursor: true });
      // รูปอยู่ครึ่งบน ชื่ออยู่แถบล่างที่กันไว้ ไม่ทับกัน
      this.add
        .image(x, y - NAME_STRIP / 2, "portraits", `${key}.png`)
        .setDisplaySize(cellW - 14, cellH - NAME_STRIP - 12);
      this.add
        .text(x, y + cellH / 2 - NAME_STRIP / 2, ROSTER[key]?.DISPLAY_NAME ?? key, {
          font: "16px monospace",
          color: "#e2e8f0",
        })
        .setOrigin(0.5);

      frame.on("pointerdown", () => {
        this.picked[side] = key;
        this._refreshPicked();
      });
      this.portraitCells.push({ side, key, frame, accent });
    });
  }

  /** ไฮไลต์เฉพาะช่องที่เลือกอยู่ของแต่ละแถว */
  _refreshPicked() {
    for (const c of this.portraitCells) {
      const on = this.picked[c.side] === c.key;
      c.frame.setStrokeStyle(on ? 5 : 3, on ? c.accent : 0x334155, 1);
      c.frame.setFillStyle(on ? 0x0f172a : 0x1e293b, on ? 1 : 0.9);
    }
  }

  _startGame(modeKey) {
    this.registry.set("gameMode", modeKey);
    if (this.picked) {
      this.registry.set("charP1", this.picked.charP1);
      this.registry.set("charP2", this.picked.charP2);
    }
    // เลือกโหมดใหม่ = ล้าง levelKey เดิม (โหมดก่อนหน้าอาจสลับแมพค้างไว้ที่ไม่มีในลิสต์ของโหมดใหม่)
    this.registry.remove("levelKey");
    // โหมดที่มีฉากของตัวเอง (SCRAMBLE) ยิงไปฉากนั้นตรง ๆ ไม่ผ่าน MainGameScene
    this.scene.start(GAME_MODES[modeKey]?.scene ?? "MainGameScene");
  }
}

// เผื่อ registry ไม่เคยถูกตั้งเลย (เช่น debug เข้า MainGameScene ตรง ๆ ระหว่างพัฒนา)
export { DEFAULT_GAME_MODE };
