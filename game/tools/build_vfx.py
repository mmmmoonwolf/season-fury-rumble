"""ตัดแผ่นเอฟเฟคสองใบเป็น atlas เดียว

อาร์ตมาเป็น **ขาวดำบนพื้นดำ** ตามที่สั่ง ซึ่งแปลงเป็นเท็กซ์เจอร์ได้ตรง ๆ โดยไม่ต้องคีย์สีเลย:
**ความสว่าง = ความทึบ** ส่วนสีตัวเองทิ้งไปเป็นขาวล้วน แล้วให้เกมย้อมสีเอาตอนใช้

ทำแบบนี้เพราะเท็กซ์เจอร์ชุดนี้ต้องใช้ได้ทั้งสองโหมดผสม:
  ADD    — ประกาย ไฟ แสง (ขาว x สีที่ย้อม = เรืองแสง)
  NORMAL — ควัน ฝุ่น (ต้องมีอัลฟาจริงถึงจะทับพื้นหลังสว่างได้)
ถ้าเก็บเป็นภาพสีตรง ๆ จะใช้ได้โหมดเดียว และย้อมสีไม่ได้

รัน (จากโฟลเดอร์ game):  python3 tools/build_vfx.py
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference", "vfx")
OUT = os.path.join(HERE, "..", "assets", "vfx")

FLOOR = 9        # ต่ำกว่านี้คือสัญญาณรบกวนของ JPEG ในพื้นดำ ไม่ใช่เนื้อภาพ
GUTTER = 6       # กัดขอบช่องทิ้ง — ใบรอยฟาดมีเส้นตารางจาง ๆ คั่นอยู่จริง (วัดได้ที่คอลัมน์ 643/1287/1931)
MAX_SIDE = 320   # ไม่ต้องเก็บใหญ่กว่าที่จะวาดจริง
PAD = 2

SHEETS = [
    ("slash.jpg", 2, 4, ["slashWide", "slashThin", "slashSpin", "slashThrust",
                         "slashLash", "slashChop", "slashRise", "slashCross"]),
    ("particles.jpg", 4, 4, ["star4", "burst", "crescent", "spike",
                             "smokeBall", "smokeWisp", "dustFlat", "smokeCurl",
                             "flame", "ember", "orb", "fireWisp",
                             "ring", "glow", "streak", "diamond"]),
]


def cells(path, rows, cols, names):
    """คืน (ชื่อ, ภาพ RGBA) ต่อช่อง — ขาวล้วน อัลฟาเท่าความสว่าง"""
    lum = np.asarray(Image.open(path).convert("L")).astype(float)
    H, W = lum.shape
    ch, cw = H / rows, W / cols
    out = []
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        y0, y1 = round(r * ch) + GUTTER, round((r + 1) * ch) - GUTTER
        x0, x1 = round(c * cw) + GUTTER, round((c + 1) * cw) - GUTTER
        a = np.clip((lum[y0:y1, x0:x1] - FLOOR) / (255 - FLOOR), 0, 1)
        ys, xs = np.nonzero(a > 0.06)
        if not len(ys):
            print(f"  ! {name}: ว่างเปล่า ข้าม")
            continue
        a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        rgba = np.dstack([np.full(a.shape, 255), np.full(a.shape, 255), np.full(a.shape, 255), a * 255])
        im = Image.fromarray(rgba.astype("uint8"), "RGBA")
        if max(im.size) > MAX_SIDE:
            s = MAX_SIDE / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        out.append((name, im))
        print(f"  {name:11s} {im.width:4d}x{im.height:4d}")
    return out


items = []
for fn, rows, cols, names in SHEETS:
    print(f"{fn}:")
    items += cells(os.path.join(REF, fn), rows, cols, names)

# แพ็คแบบชั้นวาง (shelf) — เรียงสูงลงต่ำแล้ววางทีละแถว กว้างไม่เกิน 2048
items.sort(key=lambda kv: -kv[1].height)
MAX_W = 2048
x = y = shelf = 0
place = {}
for name, im in items:
    if x + im.width + PAD > MAX_W:
        x, y, shelf = 0, y + shelf + PAD, 0
    place[name] = (x, y, im)
    x += im.width + PAD
    shelf = max(shelf, im.height)
W, H = MAX_W, y + shelf + PAD

sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
frames = {}
for name, (px, py, im) in place.items():
    sheet.paste(im, (px, py))
    frames[name + ".png"] = {"frame": {"x": px, "y": py, "w": im.width, "h": im.height},
                             "sourceSize": {"w": im.width, "h": im.height},
                             "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height}}

os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, "vfx.png"), optimize=True)
json.dump({"frames": frames, "meta": {"image": "vfx.png", "size": {"w": W, "h": H}, "scale": "1"}},
          open(os.path.join(OUT, "vfx.json"), "w"), indent=1)
print(f"\nเขียนแล้ว: vfx.png {W}x{H} · {len(frames)} เฟรม")
