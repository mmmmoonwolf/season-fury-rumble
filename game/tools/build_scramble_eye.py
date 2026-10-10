"""สร้าง atlas ของ EYE จากคลิปท่าวิ่งและชีต A B C

ชื่อไฟล์ที่ออกเป็น `scramble_chronos` เพราะ **`id` ของตัวละครคือ `chronos`**
ซึ่งห้ามเปลี่ยน — มันคือคีย์ของอัตลาสใน `ScrambleScene.js` และค่าที่ส่งข้ามเน็ตตอนเลือกตัว

## ชีตที่ได้มาไม่ตรงกับที่สั่ง — เลือกท่าเอง ไม่ใช่ไล่ 1-2-3

สั่ง A=12 B=9 C=9 ได้ A=12 B=8 C=11 และ **ใบ C เจนมาเป็นผังกระจาย ไม่ใช่ตาราง**
(`orpheus_sheets.split()` จับก้อนแล้วเรียงตามตำแหน่งจริง จึงอ่านได้ทั้งที่ตารางเบี้ยว)

เกณฑ์เลือก: **เฟรมกลางของทุกท่าโจมตีต้องเป็นเฟรมที่แขนเหยียดสุด**
เพราะเอนจินเลือกเฟรมจาก `phase()` (`{startup:1, active:2, recovery:3}`)
เฟรมกลางจึงตรงกับช่วงที่กรอบชนเปิดพอดี

## ท่าที่ยังไม่มีชีต — ยืมของท่าอื่นไปก่อน (ดู BORROW)

ยังขาดใบ D (ท่าอากาศ) E (ชุดรัว) F (ไม้จบ/ย้อน/อัลติ) และ **ท่ากันทั้งสามท่า**
ยืมไว้เพื่อให้เล่นได้จริงทั้งตัวก่อน ไม่ใช่ครึ่งอาร์ตครึ่งกล่อง
ตรงไหนยืม เขียนไว้ตรงนั้นหมดแล้ว ลบทิ้งทีละบรรทัดตอนชีตจริงมาถึง

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_eye.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from orpheus_sheets import split

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
SHEETS_DIR = os.path.join(REF, "chronos_sheets")
CLIP_DIR = os.path.join(REF, "chronos_clip")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240            # ความสูงท่ายืนหลังย่อ — เท่าตัวอื่นทั้งโรสเตอร์
STAND_SRC = ("I0", 1)
GROUND, AIR = "ground", "air"
LETTERS = ["I0", "A", "B", "C"]

# (แหล่ง, ลิสต์เลขท่า, ชนิดการจัดตำแหน่ง)
SEQ = {
    "idle": ("I0", [1], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ใบ A: เคลื่อนไหวและท่าโดน ----
    "jump":        ("A", [1, 2, 3, 4], AIR),   # ถีบขึ้น -> หดตัว -> ร่วง -> ลงพื้น
    "hurt":        ("A", [5], GROUND),         # หัวสะบัดหลัง ปากอ้า แขนสะบัด
    "knockdown":   ("A", [6], GROUND),         # นอนคว่ำ
    "techroll":    ("A", [7], GROUND),         # ม้วนตัวบนพื้น
    "tech":        ("A", [12], GROUND),        # ยันเข่าลุกขึ้น (คาบมวนไปด้วย)
    "crouch":      ("A", [11], GROUND),

    # ---- ใบ B: แย็บด้วยมือเปล่า ----
    # รอยต่อทำงานจริง: ท่าชักกลับของไม้หนึ่ง = ท่าตั้งการ์ดของไม้ถัดไป
    # ใบนี้ได้มา 8 ท่าแทนที่จะเป็น 9 แต่พอดีกับ 9 ช่องเพราะใช้ท่ารอยต่อร่วมกัน
    "jab1": ("B", [3, 2, 7], GROUND),          # การ์ด+มวน -> หมัดสุดแขน -> ชักกลับ
    "jab2": ("B", [7, 4, 1], GROUND),          # รับช่วงจาก jab1 -> หมัดสุดแขน -> การ์ด
    "jab3": ("B", [5, 8, 6], GROUND),          # เงื้อหมัดสูง -> หมัดปิด -> เก็บมือ

    # ---- ใบ C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),          # ย่อพุ่ง -> พุ่งสุดตัว -> ตั้งหลัก
    "up":   ("C", [6, 8, 11], GROUND),         # ตั้งการ์ด -> ชกขึ้นสุดแขน -> ลงมายืน
    "down": ("C", [7, 10, 9], GROUND),         # ย่อต่ำ -> กวาดขา -> คุกเข่า
}

# ท่าที่ยังไม่มีชีตของตัวเอง — ยืมเฟรมของท่าอื่นไปก่อน
# **ลบบรรทัดแล้วย้ายไปใส่ SEQ เมื่อชีตจริงมาถึง** (ใบ D ท่าอากาศ · E ชุดรัว · F ไม้จบ)
BORROW = {
    # ท่ากัน: ใบ A ไม่มีท่ากันมาเลย ยืมท่าตั้งการ์ดจากใบแย็บซึ่งกำหมัดทั้งสองข้างพอดี
    "block":       ("B", [6], GROUND),
    "blockstun":   ("B", [1], GROUND),
    "blockcrouch": ("A", [11], GROUND),        # ใช้ท่าย่อไปก่อน
    # ท่าอากาศ: ยืมท่าพื้นที่ทิศเดียวกัน จัดตำแหน่งแบบลอย
    "nair": ("C", [6, 8, 11], AIR),
    "sair": ("C", [1, 2, 3], AIR),
    "dair": ("C", [7, 10, 9], AIR),
    # ชุดรัว: ยืมแย็บ ซึ่งเป็นหมัดสั้นเหมือนกันอยู่แล้ว
    "haze1": ("B", [3, 2, 7], GROUND),
    "haze2": ("B", [7, 4, 1], GROUND),
    "haze3": ("B", [1, 8, 6], GROUND),
    # ไม้จบ: เงื้อ -> หมัดปิด -> **สูบหนึ่งที** (A10 คือท่าคาบมวนยืนถ่างขา ตรงกับ gimmick พอดี)
    "hazeEnd": ("B", [5, 8], GROUND),
    # ต่อยแล้วย้อน: ท่าเดียวกับ side
    "snap1": ("C", [1, 2, 3], GROUND),
    # อัลติ: สูดลึก -> ชูแขน -> ลงมายืน
    "veil1": ("A", [10], GROUND),
}
SEQ.update(BORROW)
SEQ["hazeEnd"] = ("B", [5, 8], GROUND)         # สองเฟรมแรก ที่สามต่อท้ายข้างล่าง
EXTRA = {"hazeEnd_3": ("A", 10, GROUND),       # สูบหนึ่งที
         "veil1_2": ("C", 8, GROUND), "veil1_3": ("C", 11, GROUND)}

# ---------- อ่านชีต ----------
SHEETS, RULER = {}, {}
for L in LETTERS:
    name = "sheet_idle.jpg" if L == "I0" else f"sheet_{L}.jpg"
    arr, masks = split(os.path.join(SHEETS_DIR, name))
    assert masks, f"ชีต {L} แยกท่าไม่ออก"
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([np.sqrt(np.count_nonzero(m)) for m in masks]))

_arr, _masks = SHEETS[STAND_SRC[0]]
_ys = np.nonzero(_masks[STAND_SRC[1] - 1].any(axis=1))[0]
SRC_SCALE = {}
_base = STANDING / (_ys.max() - _ys.min() + 1)
for L in LETTERS:
    SRC_SCALE[L] = _base * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L:3s}: {len(SHEETS[L][1]):2d} ท่า · ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")

CLIP = json.load(open(os.path.join(CLIP_DIR, "clip.json")))
CLIP_SCALE = STANDING / CLIP["stand_h"]
print(f"คลิป: ท่าวิ่งสูงมัธยฐาน {CLIP['stand_h']} px -> สเกล {CLIP_SCALE:.4f}\n")


def source(src, n):
    if src == "clip":
        im = Image.open(os.path.join(CLIP_DIR, f"run_{n:02d}.png")).convert("RGBA")
        return im, CLIP["anchor"][n - 1], CLIP["base"][n - 1] * CLIP_SCALE, CLIP_SCALE
    arr, masks = SHEETS[src]
    m = masks[n - 1]
    ys, xs = np.nonzero(m)
    rgba = np.dstack([arr[:, :, :3], np.where(m, 255, 0)]).astype("uint8")
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m, erode=31) - xs.min(), None, SRC_SCALE[src]


def stage(key, src, n, kind, into):
    crop, com, fixed_base, sc = source(src, n)
    w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
    im = crop.resize((w, h), Image.LANCZOS)
    base = fixed_base if fixed_base is not None else (h if kind == GROUND else h / 2 + STANDING / 2)
    into[key] = (im, com * sc, base)


staged = {}
for name, (src, nums, kind) in SEQ.items():
    kinds = kind if isinstance(kind, list) else [kind] * len(nums)
    for i, (n, k) in enumerate(zip(nums, kinds), 1):
        stage(f"{name}_{i}.png", src, n, k, staged)
for key, (src, n, k) in EXTRA.items():
    stage(f"{key}.png", src, n, k, staged)
print(f"ท่าทั้งหมด {len(staged)} เฟรม")

PAD = 14
left = max(c for _, c, _ in staged.values())
right = max(im.width - c for im, c, _ in staged.values())
top = max(b for _, _, b in staged.values())
bottom = max(im.height - b for im, _, b in staged.values())
CW, CH = round(left + right) + PAD * 2, round(top + bottom) + PAD * 2
ANCHOR_X, FEET_Y = round(left) + PAD, round(top) + PAD
print(f"canvas {CW}x{CH}  จุดยึด x={ANCHOR_X} เท้า y={FEET_Y}")

# ---------- พับเป็นหลายแถวถ้ายาวเกินลิมิตการ์ดจอ ----------
# เกิน 4096 px แล้วการ์ดจอวาดเป็นสีดำ **โดยไม่มี error** — บทเรียนเดิมของทุกตัวในเกม
MAXW = 4096
per_row = max(1, MAXW // CW)
rows = (len(staged) + per_row - 1) // per_row
sheet = Image.new("RGBA", (CW * min(per_row, len(staged)), CH * rows), (0, 0, 0, 0))
frames = {}
for i, (name, (im, com, base)) in enumerate(staged.items()):
    gx, gy = (i % per_row) * CW, (i // per_row) * CH
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.paste(im, (round(ANCHOR_X - com), round(FEET_Y - base)), im)
    sheet.paste(canvas, (gx, gy))
    frames[name] = {"frame": {"x": gx, "y": gy, "w": CW, "h": CH},
                    "sourceSize": {"w": CW, "h": CH},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": CW, "h": CH}}

os.makedirs(OUT, exist_ok=True)
png = os.path.join(OUT, "scramble_chronos.png")
sheet.save(png)
json.dump({"frames": frames,
           "meta": {"image": "scramble_chronos.png",
                    "size": {"w": sheet.width, "h": sheet.height}, "scale": "1",
                    "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING}},
          open(os.path.join(OUT, "scramble_chronos.json"), "w"), indent=1)
print(f"เขียน {png}  {sheet.width}x{sheet.height}  ({len(frames)} เฟรม · {rows} แถว)")
assert sheet.width <= MAXW and sheet.height <= MAXW, "อัตลาสเกิน 4096 — การ์ดจอจะวาดเป็นสีดำเงียบ ๆ"
