"""
แปลงอาร์ตยมฑูตแบบทึบ -> เฟรมวิญญาณ + atlas พร้อมใช้ใน Phaser

ทำไมต้องแปลงด้วยโค้ดแทนที่จะสั่ง AI วาดจางมาเลย:
  - ทุกเฟรมจางเท่ากันเป๊ะ (สั่ง AI วาดจาง 3 ครั้งจะได้ 3 ระดับ แล้วดูกระตุก)
  - ปรับทีหลังได้โดยไม่ต้อง gen ใหม่
  - แยกให้ส่วนที่เข้ม (เส้น/ใบเคียว) ทึบกว่าผ้า = อ่านออกว่ากำลังเหวี่ยงอะไร
"""
from PIL import Image, ImageFilter
import numpy as np, json, os, sys

# ไฟล์ต้นฉบับ + จุดยึด (ตำแหน่งฮู้ด/หัวในภาพนั้น) — อ่านมาจากการวางกริดทับดู
SRC = {
    "rise":   ("IMG_3674.jpeg", 255, 55),
    "windup": ("IMG_3675.jpeg", 285, 105),
    "swing":  ("IMG_3676.jpeg", 375, 130),
}
CANVAS = (600, 480)
AX, AY = 370, 110  # ทุกเฟรมเอาหัวมาทับตรงนี้ ร่างจะได้ไม่กระโดดตอนเปลี่ยนเฟรม

# ---- ท่าฟันระยะประชิด (ใช้กับหมัด 1/2/3 ของ Bomb) ----
# วาดมาคนละรอบ ตัวใหญ่กว่าชุดเรียกร่างราว 3 เท่า จึงย่อด้วย SLASH_SCALE ให้หัวเท่ากันก่อน
# ผืนภาพเล็กกว่าเพราะเป็นครึ่งตัวบน + ใบเคียว ไม่ต้องเผื่อชายชุดบานเต็มตัว
SLASH_SRC = {
    "slash_high":   ("IMG_3697.jpeg", 250, 210),
    "slash_low":    ("IMG_3698.jpeg", 225, 190),
    "slash_cross":  ("IMG_3699.jpeg", 145, 205),
    "slash_thrust": ("IMG_3700.jpeg", 245, 250),
}
SLASH_SCALE = 0.34          # 61/180 — เทียบจากความกว้างฮู้ดของทั้งสองชุด
SLASH_CANVAS = (420, 340)
SAX, SAY = 110, 90          # จุดยึดหัวบนผืนภาพท่าฟัน

TINT = dict(rs=0.72, ro=16, gs=0.74, go=38, bs=0.80, bo=70)  # เทา -> ฟ้าเทาเย็น
ALPHA_BASE, ALPHA_DARK = 0.40, 0.55  # ทึบพื้นฐาน + ส่วนเพิ่มตามความเข้มของต้นฉบับ

def ghostify(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    fg = lum < 245
    t = np.clip(lum / 245.0, 0, 1)  # 0 = เส้นเข้ม/ใบเคียว, 1 = ผ้าส่วนสว่าง
    r = lum * TINT["rs"] + TINT["ro"]
    g = lum * TINT["gs"] + TINT["go"]
    b = lum * TINT["bs"] + TINT["bo"]
    alpha = np.where(fg, (ALPHA_BASE + ALPHA_DARK * (1 - t)) * 255, 0)
    return Image.fromarray(np.dstack([r, g, b, alpha]).clip(0, 255).astype(np.uint8), "RGBA")

def _finish(canvas):
    """เรืองแสงขาวฟ้ารอบตัว — ขอบไม่คมเหมือนวัตถุแข็ง"""
    ga = np.asarray(canvas.filter(ImageFilter.GaussianBlur(7))).astype(np.float32)
    ga[..., 0], ga[..., 1], ga[..., 2] = 205, 235, 255
    ga[..., 3] *= 0.28
    return Image.alpha_composite(Image.fromarray(ga.astype(np.uint8), "RGBA"), canvas)

def build():
    frames = {}
    # ท่าฟันระยะประชิด — ย่อให้หัวเท่าชุดเรียกร่างก่อน แล้วยึดหัวไว้ที่เดียวกันทุกเฟรม
    for name, (f, ax, ay) in SLASH_SRC.items():
        gh = ghostify("/mnt/user-data/uploads/" + f)
        gh = gh.resize((int(gh.width * SLASH_SCALE), int(gh.height * SLASH_SCALE)), Image.LANCZOS)
        canvas = Image.new("RGBA", SLASH_CANVAS, (0, 0, 0, 0))
        canvas.alpha_composite(gh, (int(SAX - ax * SLASH_SCALE), int(SAY - ay * SLASH_SCALE)))
        frames[name] = _finish(canvas)

    for name, (f, ax, ay) in SRC.items():
        gh = ghostify("/mnt/user-data/uploads/" + f)
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        canvas.alpha_composite(gh, (AX - ax, AY - ay))
        frames[name] = _finish(canvas)
    return frames

def pack(frames, outdir):
    """atlas แบบ trimmed เรียงแนวนอน (รูปแบบเดียวกับ dear_atlas.json)"""
    trims = {k: (v.getbbox(), v) for k, v in frames.items()}
    pad = 2
    W = sum(b[2] - b[0] + pad for b, _ in trims.values()) + pad
    H = max(b[3] - b[1] for b, _ in trims.values()) + pad * 2
    sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    meta = {}
    x = pad
    for name, (bb, img) in trims.items():
        crop = img.crop(bb)
        sheet.paste(crop, (x, pad))
        meta[f"{name}.png"] = {
            "frame": {"x": x, "y": pad, "w": crop.width, "h": crop.height},
            "rotated": False, "trimmed": True,
            "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": crop.width, "h": crop.height},
            "sourceSize": {"w": img.width, "h": img.height},  # ผืนของท่าฟันเล็กกว่าท่าเรียกร่าง
        }
        x += crop.width + pad
    os.makedirs(outdir, exist_ok=True)
    sheet.save(f"{outdir}/reaper_atlas.png")
    json.dump({"frames": meta, "meta": {"image": "reaper_atlas.png", "size": {"w": W, "h": H}, "scale": "1"}},
              open(f"{outdir}/reaper_atlas.json", "w"), indent=2)
    return sheet, meta

if __name__ == "__main__":
    fr = build()
    sheet, meta = pack(fr, sys.argv[1] if len(sys.argv) > 1 else "/home/claude/reaper")
    print("atlas", sheet.size, list(meta))
