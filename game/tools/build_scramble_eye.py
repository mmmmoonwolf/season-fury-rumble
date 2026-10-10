"""สร้าง atlas ของ EYE จากคลิปท่าวิ่งและชีต A B C D E E3 F

ชื่อไฟล์ที่ออกเป็น `scramble_chronos` เพราะ **`id` ของตัวละครคือ `chronos`**
ซึ่งห้ามเปลี่ยน — มันคือคีย์ของอัตลาสใน `ScrambleScene.js` และค่าที่ส่งข้ามเน็ตตอนเลือกตัว

## ชีตที่ได้มาไม่ตรงกับที่สั่ง — เลือกท่าเอง ไม่ใช่ไล่ 1-2-3

สั่ง A=12 B=9 C=9 ได้ A=12 B=8 C=11 และ **ใบ C เจนมาเป็นผังกระจาย ไม่ใช่ตาราง**
(`orpheus_sheets.split()` จับก้อนแล้วเรียงตามตำแหน่งจริง จึงอ่านได้ทั้งที่ตารางเบี้ยว)

เกณฑ์เลือก: **เฟรมกลางของทุกท่าโจมตีต้องเป็นเฟรมที่แขนเหยียดสุด**
เพราะเอนจินเลือกเฟรมจาก `phase()` (`{startup:1, active:2, recovery:3}`)
เฟรมกลางจึงตรงกับช่วงที่กรอบชนเปิดพอดี

## เลือกเฟรมกลางด้วยการ "วัดระยะเอื้อม" ไม่ใช่กะด้วยตา

ตัวละครหันขวา เฟรมกลางจึงต้องเป็นท่าที่ **ยื่นไปทางขวาไกลที่สุด**
วัดเป็น (ขอบขวาสุด - แกนลำตัว) / ความสูง จะได้เทียบข้ามชีตที่กล้องคนละสเกลได้
ห้ามวัดด้วยความกว้างกรอบเฉย ๆ เพราะท่าตั้งการ์ดกางหมัดสองข้างก็กว้างได้โดยไม่ได้ชก
(วัดแล้วพบว่า D8 เอื้อมขวาน้อยที่สุดในใบ D = 0.271 ทั้งที่ตาเห็นเป็นท่าเงื้อ)

## เทียบกรอบชนกับภาพ ต้องคูณอัตราย่อก่อนเสมอ

อัตลาสเก็บที่ความสูงยืน 240 px แต่ตอนวาดจริงย่อเหลือ `SPRITE_H` = 130
(`_applyCharTransform` ใน ScrambleScene.js) ส่วน `hb` ใน core.js เป็นหน่วยเกม
เทียบกับ hurtbox ที่สูงแค่ `PHYS.standH` = 118 **หนึ่งพิกเซลในชีต = 0.542 หน่วยเกม**

เอาเลข px ของชีตไปเทียบกับ `hb` ตรง ๆ จะเห็นเป็น "กรอบชนต่ำกว่าหมัดที่วาด 20-40"
ทุกท่าของทุกตัว ซึ่งไม่จริง — คูณ 0.542 ก่อนแล้วทับกันหมด
(เคยหลงมาแล้วรอบหนึ่ง แก้กรอบชนไปสี่ท่าก่อนจะจับได้ตอนเอา HELIOS ซึ่งลงเกมไปแล้ว
มาวัดด้วยวิธีเดียวกันแล้วได้ "พัง 22 จาก 26 ท่า" ซึ่งเป็นไปไม่ได้)

## ใบ E2 ไม่ได้ใช้ — ทั้งใบเป็นท่าย่ำเท้า ไม่มีจังหวะหมัด

วัดได้เอื้อมขวา 0.370-0.481 ทั้งเก้าท่า ต่างกันแค่ 0.11 เอาเป็นชุดรัวไม่ได้
เพราะเฟรมกลางจะไม่ต่างจากเฟรมตั้งการ์ดพอให้ตาเห็นว่าชก
ชุดรัวจึงใช้ใบ E กับ E3 ซึ่งสูงใกล้กัน (355/350 px) ต่อกันแล้วตัวไม่เปลี่ยนขนาดกลางชุด

## ยังขาดอยู่ท่าเดียว — ท่ากันตอนย่อ (ดู BORROW)

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
LETTERS = ["I0", "A", "B", "C", "D", "E", "E3", "F"]

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
    # ---- ใบ D: ท่าอากาศ ----
    # ตัวเลขท้ายบรรทัดคือระยะเอื้อมขวาที่วัดได้ เฟรมกลางต้องสูงสุดของชุดเสมอ
    "nair": ("D", [1, 2, 3], AIR),   # หดตัว .301 -> เตะหมุน .593 -> ทิ้งตัวลง .293
    "sair": ("D", [4, 5, 6], AIR),   # เงื้อหมัด .312 -> หมัดพุ่งสุดแขน .515 -> ชักกลับ .335
    # ใบ D ไม่มีท่า "ทุบลง" มาเลย — สามท่านี้เป็นท่าดิ่งล้วน
    # เฟรมกลางจึงเลือกจาก **ลำตัวที่ยืดสุด** (D8 สูง 267 px สูงสุดทั้งใบ) แทนระยะเอื้อม
    # ซึ่งถูกกับท่าดิ่งอยู่แล้ว เพราะท่าดิ่งกินระยะด้วยลำตัว ไม่ใช่ด้วยแขน
    "dair": ("D", [7, 8, 9], AIR),   # ชูแขนคาบมวน -> ดิ่งตัวยืดสุด -> หดตัวรับพื้น

    # ---- ใบ E + E3: ชุดรัวสามไม้ สลับมือเปล่า-มือคาบมวน-มือเปล่า ----
    "haze1": ("E",  [9, 2, 6], GROUND),   # การ์ดชิดหน้า .241 -> หมัดขวา .403 -> เก็บมือ .285
    "haze2": ("E",  [1, 8, 10], GROUND),  # ถือมวน .264 -> ชกด้วยมือที่ถือมวน .437 -> เก็บมือ .278
    "haze3": ("E3", [1, 2, 3], GROUND),   # การ์ด+มวน .271 -> หมัดขวาสุดแขน .415 -> เก็บมวน .284

    # ---- ใบ F: ไม้จบ ท่าย้อน และอัลติ ----
    "hazeEnd": ("F", [1, 3, 5], GROUND),  # เงื้อสุด -> หมัดปิด .416 -> **ยืนสูบหนึ่งที**
    "snap1":   ("F", [4, 6, 2], GROUND),  # ย่อเงื้อ -> พุ่งสุดตัว .622 กว้างสุดทั้งใบ -> ดึงกลับ
    "veil1":   ("F", [5, 7, 8], GROUND),  # สูดลึก -> กางแขนพ่นควันออกหมด -> ยืนลง

    # ---- ท่ากัน: ใบ E มีท่าการ์ดจริง เลิกยืมจากใบแย็บแล้ว ----
    "block":     ("E", [9], GROUND),      # กำหมัดสองข้างชิดหน้า เอื้อมขวาน้อยสุดทั้งใบ .241
    "blockstun": ("E", [5], GROUND),      # หมัดยังอยู่แต่ตัวถูกดันถอย
}

# เหลือท่าเดียวที่ยังไม่มีอาร์ตของตัวเอง — **ลบบรรทัดเมื่อชีตจริงมาถึง**
BORROW = {
    # ท่ากันตอนย่อ: ยังไม่มีใบไหนวาดท่าย่อแล้วกำหมัดมาเลย ใช้ท่าย่อเปล่าไปก่อน
    "blockcrouch": ("A", [11], GROUND),
}
SEQ.update(BORROW)
EXTRA = {}

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
