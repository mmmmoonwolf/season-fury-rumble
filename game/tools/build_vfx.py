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

# ── ใบที่ตัดด้วยกริดไม่ได้ ──
# สองใบนี้มาคนละทรงกับสองใบบน จึงตัดด้วยการหาก้อนเอง ไม่ใช่หารช่อง
#
# `tail_rise` มาเป็น **แผงดำสี่แผงบนกระดาษขาว** ถ้าหารช่องแบบใบอื่น ช่องว่างสีขาว
# ระหว่างแผงจะถูกอ่านว่า "สว่างเต็ม = ทึบเต็ม" แล้วกลายเป็นแท่งขาวทึบติดมาในอัตลาส
# (ความสว่าง = ความทึบ ตามหัวไฟล์) จึงต้องหาขอบแผงดำก่อนแล้วค่อยตัดข้างใน
BLOBS = [
    ("tail_rise.jpg",  ["tailRise1", "tailRise2", "tailRise3", "tailRise4"], True),
    ("soil_burst.jpg", ["soilBurst1", "soilBurst2", "soilBurst3"], False),
]


def _runs(flags, min_len):
    out, s = [], None
    for i, d in enumerate(flags):
        if d and s is None: s = i
        if not d and s is not None: out.append((s, i - 1)); s = None
    if s is not None: out.append((s, len(flags) - 1))
    return [(a, b) for a, b in out if b - a >= min_len]


def _panels(lum):
    """ขอบแผงดำในใบที่วางบนกระดาษขาว — ต้องกันทั้งสองแกน

    **กับดักที่กัดจริง: ตอนแรกตัดแต่คอลัมน์ ไม่ได้ตัดแถว** แถวกระดาษขาวเหนือและใต้แผง
    จึงติดมาด้วย แล้วเพราะความสว่าง = ความทึบ ขอบขาวนั้นกลายเป็นเนื้อภาพทึบเต็ม
    ทุกเฟรมเลยได้กรอบเท่ากันหมด (246x768) = ความสูงที่ไล่ขึ้นของทั้งสี่ระยะหายเกลี้ยง
    """
    xs = _runs(lum.min(axis=0) < 40, 100)
    ys = _runs(lum.min(axis=1) < 40, 100)
    if not ys:
        raise SystemExit("!! หาขอบแผงแนวตั้งไม่เจอ")
    y0, y1 = ys[0][0], ys[-1][1]
    return xs, (y0, y1)


def blobs(path, names, paper):
    """ตัดทีละก้อนโดยไม่ต้องรู้กริด — คืน (ชื่อ, ภาพ RGBA) เหมือน cells()"""
    lum = np.asarray(Image.open(path).convert("L")).astype(float)
    if paper:
        spans, (y0, y1) = _panels(lum)
        # กัดขอบแผงเข้ามานิดเดียวทั้งสี่ด้าน กันเส้นขอบขาวของแผงติดมา
        cols = [lum[y0 + 3:y1 - 2, a + 3:b - 2] for a, b in spans]
    else:
        cols = [lum[:, a:b + 1] for a, b in _runs((lum > 28).any(axis=0), 30)]
    if len(cols) != len(names):
        raise SystemExit(f"!! {path}: หาก้อนได้ {len(cols)} ก้อน แต่ตั้งชื่อไว้ {len(names)} ชื่อ")
    cut = []
    for sub in cols:
        a = np.clip((sub - FLOOR) / (255 - FLOOR), 0, 1)
        ys, xs = np.nonzero(a > 0.06)
        cut.append(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])

    # **ย่อด้วยสเกลเดียวกันทั้งกลุ่ม ไม่ใช่ย่อทีละใบ**
    # ทั้งกลุ่มเป็นระยะของเอฟเฟคเดียวกัน ความสูงที่ไล่ขึ้นเรื่อย ๆ คือตัวเอฟเฟคเอง
    # ย่อทีละใบให้ด้านยาวเท่ากับ MAX_SIDE เหมือนใบอื่น = ทุกระยะสูงเท่ากันหมด
    # แล้วมันจะไม่ใช่ "หนามที่ค่อย ๆ โผล่" อีกต่อไป (วัดได้: 2 3 4 ได้ 320 เท่ากันทั้งสาม)
    big = max(max(a.shape) for a in cut)
    scale = min(1.0, MAX_SIDE / big)

    out = []
    for name, a in zip(names, cut):
        rgba = np.dstack([np.full(a.shape, 255), np.full(a.shape, 255), np.full(a.shape, 255), a * 255])
        im = Image.fromarray(rgba.astype("uint8"), "RGBA")
        if scale < 1.0:
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        out.append((name, im))
        print(f"  {name:11s} {im.width:4d}x{im.height:4d}")
    return out


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
for fn, names, paper in BLOBS:
    print(f"{fn}:")
    items += blobs(os.path.join(REF, fn), names, paper)

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
