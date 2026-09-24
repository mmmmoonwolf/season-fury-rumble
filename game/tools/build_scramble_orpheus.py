"""สร้าง atlas ของ Orpheus จากภาพท่ายืน ท่าบล็อก คลิปท่าวิ่ง และชีตท่า A-G

ต่างจาก build script ของตัวก่อน ๆ สามเรื่อง:

1. **ชีตเจนมาตารางไม่สม่ำเสมอ** (ใบเดียวกันมีแถวละ 4 บ้าง 3 บ้าง)
   จึงใช้ orpheus_sheets.split() ที่ไม่ต้องรู้ตาราง แทนการหารช่องแบบตัวก่อน

2. **มีแหล่งภาพสี่ชนิด** ไม่ใช่สองชนิด: ชีต · คลิป · ท่ายืนเดี่ยว · ท่าบล็อกเดี่ยว
   ภาพเดี่ยวสองใบถ่ายคนละระยะกับชีต จึงตั้งความสูงของตัวเองเป็น 240 ตรง ๆ
   ไม่ผ่านไม้บรรทัดพื้นที่ (พื้นที่เทียบข้ามระยะกล้องที่ต่างกันมากไม่ได้)

3. **ไม้บรรทัดหักกีตาร์ออก** กีตาร์แต่ละท่าหันคนละมุม พื้นที่ที่เห็นจึงไม่เท่ากัน
   กีตาร์เป็นน้ำตาลส้มอิ่มสี แยกจากสูทเทา เสื้อดำ กางเกงเขียว รองเท้าขาวได้

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_orpheus.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from orpheus_sheets import body_scale, solo, split

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
SHEETS_DIR = os.path.join(REF, "orpheus_sheets")
CLIP_DIR = os.path.join(REF, "orpheus_clip")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240
STAND_SRC = ("C", 1)      # ท่ายืนคุมเชิงในชีต C ใช้ตั้งสเกลสัมบูรณ์ของชีตทั้งหมด
GROUND, AIR = "ground", "air"

# ชีตที่เจนมาเรียงตามลำดับที่ส่ง -> ตัวอักษรตามผัง
FILES = {"A": "s1", "B": "s2", "C": "s3", "D": "s4", "E": "s5", "F": "s6", "G": "s7"}

SEQ = {
    "idle": ("idle", [1], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    # ท่านั่งเอามาจากชีต C ไม่ใช่ชีต A — วัดแล้วชีต A ไม่มีท่าไหนย่อจริงเลย
    # ท่าที่เตี้ยสุดที่ไม่ใช่ท่านอนคือ A6 ซึ่งยังอยู่ที่ 91% ของท่ายืน
    # C8 (กวาดต่ำติดพื้น) อยู่ที่ 80% ตรงกับตัวอื่น (Nyx 75 · Atlas 77 · Helios/Alecto 83)
    "crouch":      ("C", [8], GROUND),
    "jump":        ("A", [2, 3, 4, 6], AIR),
    "hurt":        ("A", [5], GROUND),
    "knockdown":   ("A", [8], GROUND),
    "techroll":    ("A", [9], GROUND),
    "tech":        ("A", [8], GROUND),
    "block":       ("block", [1], GROUND),
    "blockstun":   ("A", [10], GROUND),
    "blockcrouch": ("C", [8], GROUND),

    # ---- ชีต B: Riff ห้าจังหวะ · 10 ท่าต่อ 5 ท่าโจมตี จึงใช้หน้าต่างเลื่อนทับกัน
    # ซึ่งเข้ากับท่านี้พอดี เพราะไล่หวดคือการเหวี่ยงต่อเนื่อง ไม่ใช่หมัดแยกกันเป็นทีๆ
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [3, 4, 5], GROUND),
    "jab3": ("B", [5, 6, 7], GROUND),
    "jab4": ("B", [7, 8, 9], GROUND),
    "jab5": ("B", [8, 9, 10], GROUND),

    # ---- ชีต C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),
    "up":   ("C", [4, 5, 6], GROUND),
    "down": ("C", [7, 8, 9], GROUND),

    # ---- ชีต D: ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    "dair": ("D", [7, 8, 9], AIR),

    # ---- ชีต E: สกิล 1 สไลด์เข่า ----
    "slide1": ("E", [1, 2, 3], GROUND),   # วิ่งเข้า -> ทิ้งตัว -> ไถเอนหลัง
    "slide2": ("E", [4, 5, 6], GROUND),   # ยันพื้น -> เด้งขึ้นฟาด -> ลงยืน

    # ---- ชีต F: สกิล 2 ถอยหลังลากไฟ · ท่าลากสาย -> ฟาดลง -> ตั้งหลัก ----
    "burn1": ("F", [2, 4, 6], GROUND),

    # ---- ชีต G: อัลติ · สองจังหวะกลางใช้ท่าย่างเท้า เพราะเดินโซโล่ได้ ----
    "solo1":   ("G", [1, 1, 2], GROUND),
    "solo2":   ("G", [4, 2, 4], GROUND),
    "solo3":   ("G", [5, 3, 5], GROUND),
    "soloEnd": ("G", [6, 1, 6], GROUND),
}

# ---------- อ่านชีต ----------
SHEETS, RULER = {}, {}
for L, f in FILES.items():
    arr, masks = split(os.path.join(SHEETS_DIR, f"{f}.jpg"))
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([body_scale(arr, m) for m in masks]))

_arr, _masks = SHEETS[STAND_SRC[0]]
_ys = np.nonzero(_masks[STAND_SRC[1] - 1].any(axis=1))[0]
SRC_SCALE = {STAND_SRC[0]: STANDING / (_ys.max() - _ys.min() + 1)}
for L in FILES:
    SRC_SCALE[L] = SRC_SCALE[STAND_SRC[0]] * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L} ({FILES[L]}): {len(SHEETS[L][1]):2d} ท่า · ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")

# ---------- ภาพเดี่ยว: ท่ายืน และท่าบล็อก ----------
SOLOS = {}
for key, path in [("idle", "orpheus_idle_APPROVED.jpg"), ("block", "orpheus_block.jpg")]:
    rgba, m = solo(os.path.join(REF, path))
    ys, _ = np.nonzero(m)
    SOLOS[key] = (rgba, m, STANDING / (ys.max() - ys.min() + 1))
    print(f"{key}: สูง {ys.max()-ys.min()+1} px -> สเกล {SOLOS[key][2]:.4f}")

# ---------- คลิปท่าวิ่ง ----------
CLIP = json.load(open(os.path.join(CLIP_DIR, "clip.json")))
CLIP_SCALE = STANDING / CLIP["stand_h"]
print(f"คลิป: ท่ายืน {CLIP['stand_h']} px -> สเกล {CLIP_SCALE:.4f}\n")


def source(src, n):
    if src == "clip":
        im = Image.open(os.path.join(CLIP_DIR, f"run_{n:02d}.png")).convert("RGBA")
        return im, CLIP["anchor"][n - 1], CLIP["base"][n - 1] * CLIP_SCALE
    if src in SOLOS:
        rgba, m, _ = SOLOS[src]
        ys, xs = np.nonzero(m)
        out = rgba.copy(); out[:, :, 3] = np.where(m, rgba[:, :, 3], 0)
        crop = Image.fromarray(out).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        return crop, body_anchor(m, erode=61) - xs.min(), None
    arr, masks = SHEETS[src]
    m = masks[n - 1]
    ys, xs = np.nonzero(m)
    rgba = arr.copy(); rgba[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m, erode=31) - xs.min(), None


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = CLIP_SCALE if src == "clip" else (SOLOS[src][2] if src in SOLOS else SRC_SCALE[src])
    for i, n in enumerate(nums, 1):
        crop, com, fixed_base = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        base = fixed_base if fixed_base is not None else (h if kind == GROUND else h / 2 + STANDING / 2)
        staged[f"{name}_{i}.png"] = (im, com * sc, base)
print(f"ท่าทั้งหมด {len(staged)} เฟรม")

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
sheet.save(os.path.join(OUT, "scramble_orpheus.png"))
json.dump({"frames": frames,
           "meta": {"image": "scramble_orpheus.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(os.path.join(OUT, "scramble_orpheus.json"), "w"), indent=1)
print(f"เขียนแล้ว: scramble_orpheus.png {sheet.size}")
