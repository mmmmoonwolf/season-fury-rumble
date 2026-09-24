"""สร้าง atlas ของ Atlas จากชีตท่า A-G

ต่างจาก build script ของสามตัวก่อนสามเรื่อง:

1. **ไม่มีคลิป** — สามตัวก่อนได้ท่ายืนกับท่าวิ่งจากคลิป ตัวนี้ยังไม่มี
   ท่ายืนใช้ภาพเดี่ยวที่อนุมัติแล้ว (atlas_idle_APPROVED.jpg) ตั้งความสูงตัวเองเป็น 240
   ไม่ผ่านไม้บรรทัดพื้นที่ เพราะภาพนี้ถ่ายคนละระยะกับชีตและดาบใหญ่กว่ามาก
   พื้นที่จึงเทียบกันไม่ได้ แต่ "ความสูงท่ายืน" เทียบกันได้ตรง ๆ อยู่แล้ว
   ท่าวิ่งยังยืมสองจังหวะย่างของชีต E ไปก่อน -> ได้คลิปเมื่อไหร่แก้บรรทัดเดียวใน SEQ

2. **ไม้บรรทัดวัดระยะกล้องใช้พื้นที่ตัว** ไม่ใช่ความกว้างหัว (Nyx/Helios) หรือพื้นที่หมวก (Alecto)
   วัดจริง: ความกว้างหัวกระจาย 125-377 px ในชีตเดียวกัน เพราะแถบบนสุดไปโดนดาบที่ชูขึ้น
   พื้นที่ตัวหักเปลวไฟออกกระจายแค่ 3.3-6.6% ต่อชีต ใช้เทียบข้ามชีตได้จริง

3. **สเกลยึดท่ายืนของชีต E** ไม่ใช่คางถึงเท้า (Alecto) — ตัวนี้ไม่ใส่หมวก
   หัวจึงเป็นจุดสูงสุดจริงในท่ายืน วัดความสูงทั้งตัว (หักเปลวไฟออก) ได้ตรง ๆ

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_atlas.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scipy import ndimage

from atlas_sheets import (LAYOUT, background, body_anchor, body_scale, extract,
                          strip_ground_fx, trim_ground_debris)

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference", "atlas_sheets")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240     # ความสูงท่ายืนในเกม เท่ากับ Nyx/Helios/Alecto
STAND_SRC = ("E", 6)   # ท่าที่ใช้ตั้งสเกลสัมบูรณ์ — ยืนคุมเชิง หัวเป็นจุดสูงสุด
GROUND, AIR = "ground", "air"

SEQ = {
    "idle": ("solo", [1], GROUND),
    # ---- ชั่วคราว: ยังไม่มีคลิปท่าวิ่ง ----
    "run":  ("E", [2, 3], GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    "jump":        ("A", [2, 3, 4, 5], AIR),
    "crouch":      ("A", [1], GROUND),
    "hurt":        ("A", [6], GROUND),
    "knockdown":   ("A", [7], GROUND),
    "techroll":    ("A", [8], GROUND),
    "tech":        ("A", [7], GROUND),
    "block":       ("A", [9], GROUND),
    "blockstun":   ("A", [9], GROUND),
    "blockcrouch": ("A", [1], GROUND),

    # ---- ชีต B: ชุดฟันดาบ (ท่าตีปกติ) ----
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [4, 5, 6], GROUND),
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),
    "up":   ("C", [4, 5, 6], GROUND),
    "down": ("C", [7, 8, 9], GROUND),

    # ---- ชีต D: ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    "dair": ("D", [7, 8, 9], AIR),

    # ---- ชีต E: พุ่งชน (สกิล 1) ----
    "ram1": ("E", [1, 2, 3], GROUND),   # ย่อโหลดขาหลัง -> ถลา -> ถลาต่ำลง
    "ram2": ("E", [4, 5, 6], GROUND),   # กระแทกไหล่ -> เหวี่ยงดาบขึ้น -> ฟันตาม

    # ---- ชีต F: กระโจน (สกิล 2) ----
    # ท่าเดียวจบด้วย untilLand จึงใช้แค่สามจังหวะ: ย่อ -> กลางอากาศ -> ลงฟัน
    "leap": ("F", [1, 4, 5], GROUND),

    # ---- ชีต G: ฟ้าถล่ม (อัลติ) ----
    "sky1": ("G", [1, 2, 3], GROUND),   # ชูดาบ -> เงื้อสุด -> ถีบขึ้น
    "sky2": ("G", [4, 5, 6], GROUND),   # พับตัวลง -> ปักพื้น -> ค้างท่าจบ
}

# ---------- อ่านชีตทั้งหมด แล้วทำความสะอาดเอฟเฟคที่เจนมาอบในภาพ ----------
SHEETS, RULER = {}, {}
for L in "ABCDEFG":
    arr, poses = extract(os.path.join(REF, f"sheet_{L}.jpg"), *LAYOUT[L])
    assert all(p is not None for p in poses), f"ชีต {L} มีช่องว่าง"
    masks = []
    for m, _ in poses:
        m = strip_ground_fx(arr, m)      # ฝุ่นกระเด็นใต้รองเท้า (ชีต E ท่า 2)
        m = trim_ground_debris(m)        # รอยแตกพื้นบาง ๆ ใต้เท้า (ชีต G ท่า 5-6)
        masks.append(m)
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([body_scale(arr, m) for m in masks]))

# ---------- ท่ายืนจากภาพเดี่ยวที่อนุมัติแล้ว ----------
_idle_rgb = np.asarray(Image.open(os.path.join(REF, "..", "atlas_idle_APPROVED.jpg"))
                       .convert("RGB")).astype(int)
_ibg = background(_idle_rgb)
_il, _ik = ndimage.label(~_ibg)
_isz = ndimage.sum(~_ibg, _il, range(1, _ik + 1))
# เก็บทุกชิ้นที่ใหญ่พอ ไม่ใช่ชิ้นใหญ่สุดชิ้นเดียว — ปลายเปลวไฟขาดออกมาเป็นอีกชิ้น
IDLE_MASK = np.isin(_il, [i + 1 for i in range(_ik) if _isz[i] >= 1000])
IDLE_RGBA = np.dstack([_idle_rgb, np.where(IDLE_MASK, 255, 0)]).astype(np.uint8)
_ir, _ig, _ib = (_idle_rgb[:, :, i] for i in range(3))
_ifire = (_ir > 190) & ((_ir - _ib) > 70) & ((_ig - _ib) > 25)
_iys = np.nonzero((IDLE_MASK & ~_ifire).any(axis=1))[0]
IDLE_SCALE = STANDING / (_iys.max() - _iys.min() + 1)

# ---------- ตั้งสเกล ----------
_arr, _masks = SHEETS[STAND_SRC[0]]
_m = _masks[STAND_SRC[1] - 1]
_r, _g, _b = (_arr[:, :, i].astype(int) for i in range(3))
_fire = (_r > 190) & ((_r - _b) > 70) & ((_g - _b) > 25)
_ys = np.nonzero((_m & ~_fire).any(axis=1))[0]
stand_h = int(_ys.max() - _ys.min() + 1)

SRC_SCALE = {}
SRC_SCALE[STAND_SRC[0]] = STANDING / stand_h
for L in "ABCDEFG":
    SRC_SCALE[L] = SRC_SCALE[STAND_SRC[0]] * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L}: ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")
print(f"ท่ายืน {STAND_SRC[0]}{STAND_SRC[1]}: สูง {stand_h} px -> {STANDING} px ในเกม\n")


def source(src, n):
    """คืน (ภาพ RGBA ครอปพอดีตัว, จุดยึดแนวนอนในภาพที่ครอปแล้ว)"""
    if src == "solo":
        ys, xs = np.nonzero(IDLE_MASK)
        crop = Image.fromarray(IDLE_RGBA).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        return crop, body_anchor(IDLE_MASK, erode=61) - xs.min()
    arr, masks = SHEETS[src]
    m = masks[n - 1]
    ys, xs = np.nonzero(m)
    rgba = arr.copy()
    rgba[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m) - xs.min()


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = IDLE_SCALE if src == "solo" else SRC_SCALE[src]
    for i, n in enumerate(nums, 1):
        crop, com = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        base = h if kind == GROUND else h / 2 + STANDING / 2
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

# เรียงเป็นตาราง ไม่ใช่แถวเดียว — แถวเดียวจะกว้างเกินขีดจำกัดเทกซ์เจอร์ของ GPU (2048)
# เคยพลาดมาแล้วกับ Alecto: ได้ไฟล์กว้าง 56,274 px ซึ่งการ์ดจอปฏิเสธทั้งใบ
PER_ROW = max(1, 2048 // CW)
rows = (len(staged) + PER_ROW - 1) // PER_ROW
sheet = Image.new("RGBA", (CW * min(PER_ROW, len(staged)), CH * rows), (0, 0, 0, 0))
frames = {}
for i, (name, (im, com, base)) in enumerate(staged.items()):
    gx, gy = (i % PER_ROW) * CW, (i // PER_ROW) * CH
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.paste(im, (round(ANCHOR_X - com), round(FEET_Y - base)), im)
    sheet.paste(canvas, (gx, gy))
    frames[name] = {"frame": {"x": gx, "y": gy, "w": CW, "h": CH},
                    "sourceSize": {"w": CW, "h": CH},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": CW, "h": CH}}

os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, "scramble_atlas.png"))
json.dump({"frames": frames,
           "meta": {"image": "scramble_atlas.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(os.path.join(OUT, "scramble_atlas.json"), "w"), indent=1)
print(f"เขียนแล้ว: scramble_atlas.png {sheet.size}")
