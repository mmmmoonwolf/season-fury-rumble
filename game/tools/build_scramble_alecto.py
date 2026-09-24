"""สร้าง atlas ของ Alecto จากสตริปคลิป (ยืน+วิ่ง) และชีตท่า A-G

ต่างจาก build script ของสองตัวแรกสามเรื่อง เพราะตัวนี้ใส่หมวกและถือแส้:

1. ไม้บรรทัดวัดระยะกล้องใช้ "พื้นที่หมวก" ไม่ใช่ความกว้างหัว — หมวกบังกะโหลกจนวัดหัวไม่ได้
2. จุดยึดแนวนอนกัดภาพให้แส้หายก่อน — แส้ที่สะบัดออกไปทางเดียวลากจุดศูนย์กลางมวลตามไปด้วย
3. สเกลยึด "คางถึงพื้นรองเท้า" ไม่ใช่ความสูงทั้งตัว — หมวกกินความสูงไปราว 12%
   ถ้ายึดความสูงทั้งตัว ลำตัวเธอจะถูกย่อจนเตี้ยกว่าอีกสองคนอย่างเห็นได้ชัด

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_alecto.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from alecto_sheets import LAYOUT, body_anchor, extract, hat_sqrt

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240          # ตัวหารของสเกลในเกม เท่ากับ Nyx/Helios
CHIN_FRAC = 0.62        # คางถึงเท้าของ Nyx/Helios = 62% ของความสูงตัว
TARGET_CHIN = STANDING * CHIN_FRAC
GROUND, AIR = "ground", "air"

SEQ = {
    # ---- จากสตริปคลิป (ช่อง 0 = ยืน · 1-10 = วิ่งหนึ่งรอบ) ----
    "idle": ("clip", [0], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    "jump":        ("A", [2, 3, 4, 5], AIR),   # ถีบพื้น -> ลอย -> ร่วง -> ย่อรับพื้น
    "crouch":      ("A", [1], GROUND),
    "hurt":        ("A", [6], GROUND),
    "knockdown":   ("A", [7], GROUND),
    "techroll":    ("A", [8], GROUND),
    "tech":        ("A", [7], GROUND),
    "block":       ("A", [9], GROUND),
    "blockstun":   ("A", [9], GROUND),
    "blockcrouch": ("A", [1], GROUND),

    # ---- ชีต B: ชุดฟาดแส้ (ท่าตีปกติ) ----
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [4, 5, 6], GROUND),
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),          # สะบัดเกี่ยวแล้วลากเข้ามา
    "up":   ("C", [4, 5, 6], GROUND),          # สะบัดขึ้นสวนคนกระโดด
    "down": ("C", [7, 8, 9], GROUND),          # ปัดต่ำติดพื้น

    # ---- ชีต D: ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    "dair": ("D", [7, 8, 9], AIR),

    # ---- ชีต E: ลูกโม่ (สกิล 1) ----
    "shot1": ("E", [1, 2, 3], GROUND),         # ชัก -> ยิง -> สะบัดข้อมือ
    "shot2": ("E", [2, 3, 2], GROUND),
    "shot3": ("E", [2, 3, 6], GROUND),         # นัดท้ายแล้วเก็บปืน

    # ---- ชีต F: มอลอตอฟ (สกิล 2) ----
    "fire1": ("F", [1, 2, 3], GROUND),         # ควักขวด -> จุดไฟ -> ยกขึ้น
    "fire2": ("F", [4, 5, 6], GROUND),         # เงื้อ -> ขว้าง -> ตามแรง

    # ---- ชีต G: ทอมมี่กัน (อัลติ) ----
    "hail1":   ("G", [1, 2, 3], GROUND),
    "hail2":   ("G", [2, 3, 2], GROUND),
    "hail3":   ("G", [3, 4, 3], GROUND),
    "hailEnd": ("G", [5, 6, 6], GROUND),       # กวาดขึ้น -> ลดปืน แตะปีกหมวก

    # ---- ชีต H: ท่าถอย (กระโดดถอย 3 ท่า · กลิ้งถอย 3 ท่า) ----
    "hop":  ("H", [1, 2, 3], GROUND),
    "roll": ("H", [4, 5, 6], GROUND),
}

# ---------- อ่านสตริปคลิป ----------
strip_meta = json.load(open(os.path.join(REF, "alecto_clip_strip.json")))
CW_STRIP, CH_STRIP = strip_meta["cell_w"], strip_meta["cell_h"]
strip = Image.open(os.path.join(REF, "alecto_clip_strip.png")).convert("RGBA")
N_CELLS = strip.width // CW_STRIP


def clip_cell(n):
    cell = strip.crop((n * CW_STRIP, 0, (n + 1) * CW_STRIP, CH_STRIP))
    m = np.asarray(cell)[:, :, 3] > 110
    return cell, m


def chin_y(rgb, m):
    ys = np.nonzero(m.any(axis=1))[0]
    top, h = ys.min(), ys.max() - ys.min() + 1
    r, g, b = [rgb[:, :, i].astype(float) for i in range(3)]
    skin = (r > 150) & (r < 252) & (g > 110) & (g < 215) & (b > 85) & (b < 190)
    skin &= ((r - b) > 32) & ((r - g) > 14) & m
    band = np.zeros_like(skin)
    band[top:top + int(h * 0.45)] = True
    sk = ndimage.binary_opening(skin & band, np.ones((3, 3)))
    lab, n = ndimage.label(sk)
    sizes = ndimage.sum(sk, lab, range(1, n + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    return int(np.nonzero(big.any(axis=1))[0].max())


idle_cell, idle_mask = clip_cell(0)
idle_rgb = np.asarray(idle_cell)[:, :, :3].astype(int)
ys = np.nonzero(idle_mask.any(axis=1))[0]
clip_chin = ys.max() - chin_y(idle_rgb, idle_mask)
SRC_SCALE = {"clip": TARGET_CHIN / clip_chin}
CLIP_HAT = hat_sqrt(idle_rgb, idle_mask)
print(f"คลิป: คางถึงเท้า {clip_chin} px -> สเกล {SRC_SCALE['clip']:.4f} · หมวก {CLIP_HAT:.0f}")

# ---------- อ่านชีต แล้วปรับสเกลให้เท่าคลิปด้วยขนาดหมวก ----------
SHEETS = {}
for L in "ABCDEFGH":
    arr, poses = extract(os.path.join(REF, "alecto_sheets", f"sheet_{L}.jpg"), *LAYOUT[L])
    assert all(p is not None for p in poses), f"ชีต {L} มีช่องว่าง"
    hs = [hat_sqrt(arr, m) for m, _ in poses]
    med = float(np.median([h for h in hs if h > 20]))
    SRC_SCALE[L] = SRC_SCALE["clip"] * (CLIP_HAT / med)
    SHEETS[L] = (arr, poses)
    print(f"ชีต {L}: หมวกมัธยฐาน {med:.0f} -> สเกล {SRC_SCALE[L]:.4f} ({CLIP_HAT/med:.3f} เท่าของคลิป)")


def source(src, n):
    """คืน (ภาพ RGBA ครอปพอดีตัว, จุดยึดแนวนอนในภาพที่ครอปแล้ว)"""
    if src == "clip":
        cell, m = clip_cell(n)
        ys, xs = np.nonzero(m)
        crop = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        return crop, body_anchor(m) - xs.min()
    arr, poses = SHEETS[src]
    m = poses[n - 1][0]
    ys, xs = np.nonzero(m)
    # arr ถูกตัดพื้นและถอดขอบมาแล้ว เหลือแค่กันไม่ให้พิกเซลของท่าข้าง ๆ ติดมาด้วย
    rgba = arr.copy()
    rgba[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m) - xs.min()


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = SRC_SCALE[src]
    for i, n in enumerate(nums, 1):
        crop, com = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        base = h if kind == GROUND else h / 2 + STANDING / 2
        staged[f"{name}_{i}.png"] = (im, com * sc, base)
print(f"\nท่าทั้งหมด {len(staged)} เฟรม")

PAD = 14
left = max(c for _, c, _ in staged.values())
right = max(im.width - c for im, c, _ in staged.values())
top = max(b for _, _, b in staged.values())
bottom = max(im.height - b for im, _, b in staged.values())
CW, CH = round(left + right) + PAD * 2, round(top + bottom) + PAD * 2
ANCHOR_X, FEET_Y = round(left) + PAD, round(top) + PAD
print(f"canvas {CW}x{CH}  จุดยึด x={ANCHOR_X} เท้า y={FEET_Y}")

frames, x = {}, 0
sheet = Image.new("RGBA", (CW * len(staged), CH), (0, 0, 0, 0))
for name, (im, com, base) in staged.items():
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.paste(im, (round(ANCHOR_X - com), round(FEET_Y - base)), im)
    sheet.paste(canvas, (x, 0))
    frames[name] = {"frame": {"x": x, "y": 0, "w": CW, "h": CH},
                    "sourceSize": {"w": CW, "h": CH},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": CW, "h": CH}}
    x += CW

os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, "scramble_alecto.png"))
json.dump({"frames": frames,
           "meta": {"image": "scramble_alecto.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(os.path.join(OUT, "scramble_alecto.json"), "w"), indent=1)
print(f"เขียนแล้ว: scramble_alecto.png {sheet.size}")
