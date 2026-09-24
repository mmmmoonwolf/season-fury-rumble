"""สร้าง atlas ของ Momus จากคลิปท่าวิ่งและชีตท่า A-D

ต่างจาก build script ของตัวก่อน ๆ สองเรื่อง:

1. **ไม้บรรทัดเป็นพื้นที่ตัว ไม่ใช่ความกว้างหัว** — ผมหยิกฟูบังกะโหลกทั้งใบ
   วัดแบบหัวได้ 2.39 หัว ทั้งที่ยืนข้างโรสเตอร์แล้วตัวพอดี (ดู momus_sheets.body_sqrt)

2. **ท่ายืนมาจากชีต ไม่ใช่ภาพเดี่ยว** — ภาพที่อนุมัติไว้เป็นมุมเกือบตรงหน้า
   ส่วนชีตทั้งหมดเป็นมุม 3/4 ถ้าเอาภาพเดี่ยวมาเป็นท่ายืน เขาจะหันหน้าคนละมุม
   กับทุกท่าที่เหลือ A1 เป็นท่ายืนคุมเชิงมุม 3/4 อยู่แล้ว จึงใช้อันนั้นตั้งสเกลสัมบูรณ์ด้วย

⚠️ ยังไม่ครบตัว — ชีตสกิล E-H ยังไม่มา ท่าสกิลจึงยังไม่อยู่ในนี้
รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_momus.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from momus_sheets import body_sqrt, split

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
SHEETS_DIR = os.path.join(REF, "momus_sheets")
CLIP_DIR = os.path.join(REF, "momus_clip")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240
STAND_SRC = ("A", 1)      # ท่ายืนคุมเชิงมุม 3/4 ใช้ตั้งสเกลสัมบูรณ์ของทั้งตัว
GROUND, AIR = "ground", "air"
LETTERS = "ABCD"

SEQ = {
    "idle": ("A", [1], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    # ท่าย่อเอามาจากชีต C ไม่ใช่ A5 ที่ตั้งใจให้เป็นท่าย่อ — วัดแล้ว A5 อยู่ที่ 93% ของท่ายืน
    # ซึ่งบนจอไม่อ่านว่า "ย่อ" เลย (เกณฑ์ของโรสเตอร์คือ 75-85%)
    # C8 (กวาดขาต่ำ) อยู่ที่ 86% ใกล้เคียงที่สุดเท่าที่มีในชุดนี้
    # กับดักเดียวกับที่เจอมาแล้วสองรอบ: Atlas A1 ได้ 99% · Orpheus A6 ได้ 91%
    "crouch":      ("C", [8], GROUND),
    "jump":        ("A", [2, 3, 4], AIR),   # ถีบขึ้น -> ลอยหด -> ขาเหยียดตอนตก
    "hurt":        ("A", [6], GROUND),      # เซถอยรับแรง
    "knockdown":   ("A", [8], GROUND),      # นอนหงาย
    "techroll":    ("A", [9], GROUND),      # ม้วนตัว
    "tech":        ("A", [13], GROUND),     # คุกเข่าลุกขึ้น
    "block":       ("A", [11], GROUND),     # กอดอกกัน
    "blockstun":   ("A", [10], GROUND),     # กันแล้วเซ
    "blockcrouch": ("C", [8], GROUND),      # ยังไม่มีท่าก้มกันของตัวเอง

    # ---- ชีต B: หมัดเร็วสามจังหวะ ----
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [4, 5, 6], GROUND),
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),       # ทิ้งน้ำหนักต่อยตรงไปข้างหน้า
    "up":   ("C", [4, 6, 5], GROUND),       # ย่อ -> ชกขึ้นลอยตัว -> ลงยืน
    "down": ("C", [7, 8, 9], GROUND),       # ย่อ -> กวาดขาต่ำ -> ตั้งหลัก

    # ---- ชีต D: ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 10], AIR),         # หดตัว -> กางแขนหมุน -> หดกลับ
    "sair": ("D", [3, 5, 7], AIR),          # ชกไปข้างหน้ากลางอากาศ
    "dair": ("D", [6, 9, 8], AIR),          # เงื้อเหนือหัว -> ทิ้งลง -> หดขาเก็บ
}

# ---------- อ่านชีต ----------
SHEETS, RULER = {}, {}
for L in LETTERS:
    arr, masks = split(os.path.join(SHEETS_DIR, f"sheet_{L}.jpg"))
    assert masks, f"ชีต {L} แยกท่าไม่ออก"
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([body_sqrt(m) for m in masks]))

_arr, _masks = SHEETS[STAND_SRC[0]]
_ys = np.nonzero(_masks[STAND_SRC[1] - 1].any(axis=1))[0]
SRC_SCALE = {STAND_SRC[0]: STANDING / (_ys.max() - _ys.min() + 1)}
for L in LETTERS:
    SRC_SCALE[L] = SRC_SCALE[STAND_SRC[0]] * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L}: {len(SHEETS[L][1]):2d} ท่า · ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")

# ---------- คลิปท่าวิ่ง ----------
CLIP = json.load(open(os.path.join(CLIP_DIR, "clip.json")))
CLIP_SCALE = STANDING / CLIP["stand_h"]
print(f"คลิป: ท่ายืน {CLIP['stand_h']} px -> สเกล {CLIP_SCALE:.4f}\n")


def source(src, n):
    if src == "clip":
        im = Image.open(os.path.join(CLIP_DIR, f"run_{n:02d}.png")).convert("RGBA")
        return im, CLIP["anchor"][n - 1], CLIP["base"][n - 1] * CLIP_SCALE
    arr, masks = SHEETS[src]
    m = masks[n - 1]
    ys, xs = np.nonzero(m)
    rgba = arr.copy()
    rgba[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m, erode=31) - xs.min(), None


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = CLIP_SCALE if src == "clip" else SRC_SCALE[src]
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
sheet.save(os.path.join(OUT, "scramble_momus.png"))
json.dump({"frames": frames,
           "meta": {"image": "scramble_momus.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(os.path.join(OUT, "scramble_momus.json"), "w"), indent=1)
print(f"เขียนแล้ว: scramble_momus.png {sheet.size}")
