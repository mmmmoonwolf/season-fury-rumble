import { GAME_MODES, DEFAULT_GAME_MODE } from "../config/mode.config.js";

/**
 * ล็อบบี้เลือกโหมดเกม — หน้าจอแรกก่อนเข้า MainGameScene (ดู index.html: scene: [LobbyScene, MainGameScene])
 *
 * เลือกแล้วเซฟลง registry (คงอยู่ข้าม scene.restart() เหมือน levelKey/charP1/charP2 เดิม)
 * แล้ว this.scene.start("MainGameScene") — MainGameScene.init() จะอ่าน registry.gameMode
 * เพื่อเลือกทั้ง LEVEL_ORDER (แมพไหนสลับด้วยปุ่ม M ได้บ้าง) และตัวคูณ physics/ขนาดตัวละคร
 * (ดู GAME_MODES ใน config/mode.config.js)
 *
 * กด M ระหว่างเล่นยังสลับแมพภายในโหมดเดิมได้ตามปกติ — จะกลับมาเลือกโหมดใหม่ต้อง reload หน้าเว็บ
 * (ยังไม่มีปุ่ม "กลับล็อบบี้" กลางเกม — ไม่ใช่ scope ของงานนี้ เพิ่มทีหลังได้ถ้าต้องการ)
 */
export class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

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
    const cardW = 380;
    const cardH = 220;
    const gap = 48;
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
    const accent = isPlatform ? 0x38bdf8 : 0xfacc15;

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
      this.add
        .text(x, y + h / 2 - 40, "ควบคุม/ฟิสิกส์เดิมทุกอย่าง", {
          font: "13px monospace",
          color: "#fde68a",
          align: "center",
        })
        .setOrigin(0.5);
    }

    card.on("pointerover", () => card.setFillStyle(0x334155, 0.95));
    card.on("pointerout", () => card.setFillStyle(0x1e293b, 0.9));
    card.on("pointerdown", () => this._selectMode(mode.id));
  }

  _selectMode(modeKey) {
    this.registry.set("gameMode", modeKey);
    // เลือกโหมดใหม่ = ล้าง levelKey เดิม (โหมดก่อนหน้าอาจสลับแมพค้างไว้ที่ไม่มีในลิสต์ของโหมดใหม่)
    this.registry.remove("levelKey");
    this.scene.start("MainGameScene");
  }
}

// เผื่อ registry ไม่เคยถูกตั้งเลย (เช่น debug เข้า MainGameScene ตรง ๆ ระหว่างพัฒนา)
export { DEFAULT_GAME_MODE };
