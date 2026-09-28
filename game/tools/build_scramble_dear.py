"""สร้าง atlas ของ DEAR จากคลิปท่าวิ่งและชีตท่า A-G

ชื่อไฟล์ที่ออกยังเป็น `scramble_momus` เพราะ **`id` ของตัวละครยังเป็น `momus`**
ซึ่งห้ามเปลี่ยน — มันคือคีย์ของอัตลาสใน `ScrambleScene.js` และค่าที่ส่งข้ามเน็ตตอนเลือกตัว
(ของเดิมที่เป็นตัวตลกอยู่ที่ `build_scramble_momus.py` เก็บไว้เผื่อย้อนกลับ)

ต่างจาก build script ของตัวก่อน ๆ สามเรื่อง:

1. **ไม้บรรทัดเป็นพื้นที่ผม ไม่ใช่พื้นที่ตัวหรือความกว้างหัว** — แขนกลกินพื้นที่ 64%
   และยืดหดทุกท่า พื้นที่ตัวจึงไม่คงที่พอจะเป็นไม้บรรทัด (ดู `dear_sheets`)

2. **ท่ายืนมาจากภาพเดี่ยวที่อนุมัติไว้** ต่างจากตัวตลกที่ต้องหยิบจากชีตเพราะภาพเดี่ยว
   เป็นมุมเกือบตรงหน้า — ของ DEAR เป็นมุม 3/4 เหมือนชีตอยู่แล้ว
   และเป็นภาพที่วัดเทียบโรสเตอร์มาแล้วว่าขนาดกับความเข้มถูกต้อง

3. **ท่าอัปเปอร์มาจากชีตแยก (C2)** เพราะใบ C เจนสองรอบแล้วโครงแขนกลหายทุกรอบ
   เฉพาะท่าที่ยกหมัดขึ้นเหนือไหล่ ท่าที่เหลือของใบ C ใช้ได้ปกติ
   (ดู `art_prompts_dear.md` หัวข้อ "ใบ C")

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_dear.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from dear_sheets import figures, hair_sqrt

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
SHEETS_DIR = os.path.join(REF, "dear_sheets")
CLIP_DIR = os.path.join(REF, "dear_clip")
IDLE_IMG = os.path.join(REF, "dear_idle_APPROVED.jpg")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240
STAND_SRC = ("I", 1)      # ภาพเดี่ยวที่อนุมัติไว้ ใช้ตั้งสเกลสัมบูรณ์ของทั้งตัว
GROUND, AIR = "ground", "air"
LETTERS = ["I", "A", "B", "C", "C2", "D", "E", "F", "G"]

SEQ = {
    "idle": ("I", [1], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    "jump":        ("A", [1, 2, 3], AIR),   # ถีบขึ้น -> ลอยหด -> ขาเหยียดตอนตก
    "hurt":        ("A", [4], GROUND),      # เซถอยรับแรง แขนสะบัดออก
    "knockdown":   ("A", [5], GROUND),      # นอนหงาย แขนกลกองข้างตัว
    "techroll":    ("A", [6], GROUND),      # ม้วนตัวขดรอบโครง
    "tech":        ("A", [7], GROUND),      # ยันหมัดกับพื้นลุกขึ้น
    "block":       ("A", [8], GROUND),      # ไขว้แขนกลบังหน้า
    "blockstun":   ("A", [9], GROUND),      # กันแล้วไถลถอย

    # ---- ชีต B: หมัดลูกสูบสามจังหวะ ----
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [4, 5, 6], GROUND),
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C2: ไม้จบส่งขึ้นฟ้า + อัปเปอร์ (ชีตแยก ดู docstring) ----
    "jab4": ("C2", [1, 2, 3], GROUND),      # ย่อรวมแรง -> ชกขึ้น -> ลอยตาม
    "up":   ("C2", [4, 5, 6], GROUND),      # ย่อเงื้อ -> ชกขึ้นเฉียง -> ลงพื้น

    # ---- ชีต C: พุ่งไหล่ (ท่าที่โครงแขนกลอยู่ครบ) ----
    "side": ("C", [5, 6, 7], GROUND),       # ทิ้งตัวพุ่ง -> ชกตรงสุดแขน -> ไถลตั้งหลัก

    # ---- ชีต D: ท่าต่ำ · ท่าย่อ · หมุนหมัด ----
    "down": ("D", [1, 2, 3], GROUND),       # ย่อเงื้อต่ำ -> ชกระดับข้อเท้า -> ตั้งหลัก
    "crouch":      ("D", [4], GROUND),
    "blockcrouch": ("D", [5], GROUND),
    "nair": ("D", [7, 8, 9], AIR),          # หดตัว -> กางแขนหมุน -> หดกลับ

    # ---- ชีต E: ท่ากลางอากาศ ----
    "sair": ("E", [1, 2, 3], AIR),          # เงื้อ -> หมัดจรวดสุดแขน -> ชักกลับ
    "dair": ("E", [4, 5, 6], AIR),          # ชูสองหมัด -> ทุบลงใต้เท้า -> เด้งขึ้น

    # ---- ชีต F: สกิล 1 ลากทุบ + สกิล 2 โอเวอร์คล็อก ----
    "drag1": ("F", [1, 2, 3], GROUND),      # ทิ้งตัวกวาดแขน -> ไถไป -> เริ่มเงื้อ
    "drag2": ("F", [4, 6, 7], GROUND),      # ชูสองหมัด -> ทุบลงพื้น -> ค้างท่า
    "over1": ("F", [8, 9, 10], GROUND),     # กางแผ่นเกราะ -> สว่างเต็มที่ -> เข้าท่าสู้

    # ---- ชีต G: อัลติ METEOR ----
    # G4 เป็นก้อนที่สองท่าวาดติดกันจนตัวแยกอ่านเป็นก้อนเดียว จึงข้ามไป
    # ช่วงลอยนิ่งใช้ G5 สองเฟรมแทน ซึ่งตรงกับท่าอยู่แล้ว (ค้างเงื้อรอที่จุดสูงสุด)
    "meteor1": ("G", [1, 2, 3], GROUND),    # ย่อกางแขน -> พุ่งขึ้น -> ไต่ขึ้น
    "meteor2": ("G", [5, 5, 6], AIR),       # ค้างเงื้อที่จุดสูงสุด -> เริ่มคว่ำหัวลง
    "meteor3": ("G", [7, 8, 9], AIR),       # ดิ่งหัวลง -> อัดพื้น -> ลุกขึ้น
}

# ---------- อ่านชีต ----------
SHEETS, RULER = {}, {}
for L in LETTERS:
    path = IDLE_IMG if L == "I" else os.path.join(SHEETS_DIR, f"sheet_{L}.jpg")
    arr, masks = figures(path)
    assert masks, f"ชีต {L} แยกท่าไม่ออก"
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([hair_sqrt(arr, m) for m in masks]))

_arr, _masks = SHEETS[STAND_SRC[0]]
_ys = np.nonzero(_masks[STAND_SRC[1] - 1].any(axis=1))[0]
SRC_SCALE = {STAND_SRC[0]: STANDING / (_ys.max() - _ys.min() + 1)}
for L in LETTERS:
    SRC_SCALE[L] = SRC_SCALE[STAND_SRC[0]] * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L:2s}: {len(SHEETS[L][1]):2d} ท่า · ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")

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
    rgba = np.dstack([arr[:, :, :3], np.where(m, 255, 0)]).astype("uint8")
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
json_path = os.path.join(OUT, "scramble_momus.json")
json.dump({"frames": frames,
           "meta": {"image": "scramble_momus.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(json_path, "w"), indent=1)
print(f"เขียนแล้ว (แถวเดียว): scramble_momus.png {sheet.size}")

# แถวเดียวกว้าง 35000 px ซึ่งเกินลิมิต texture ของการ์ดจอทุกใบ -> เรนเดอร์เป็นกล่องดำ
# ต้องห่อลงหลายแถวก่อนเสมอ (ดู repack_atlas.py)
from repack_atlas import repack
repack(json_path, max_w=4096)
