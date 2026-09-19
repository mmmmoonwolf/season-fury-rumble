"""
ประกอบ atlas ไททันบ้า 3 ตัว (สกิล 3 ของ OAT ร่างไททัน) จากคลิปเดียว

ใช้:
  mkdir -p raw/crazyG && ffmpeg -i gemini_generated_video_167A5844.mov -start_number 1 raw/crazyG/f_%03d.png
  python3 tools/build_crazy_titans.py raw/crazyG assets/characters

คลิป 167A5844 (72 เฟรม @24fps, 1280x720) — กล้องแพนตามกลุ่มที่วิ่งไปทางขวา พื้นหลังเทาอมเขียว ~240
  ตัวสูงกางแขน : อยู่ขวาสุด แยกชัด f24-f44 (f45+ ซ้อนกับตัวอ้วน)
  ตัวอ้วน       : อยู่ซ้าย แยกชัด f24-f43
  ตัวเล็กผมทอง : ตัวที่ 2 วิ่งเข้ามาจากซ้าย แยกชัด f53-f72 (ตัวแรก f1-f14 ซ้อนกับตัวสูง)
รอบวิ่ง (หาจากความคล้ายของรูปร่างระหว่างเฟรม): ตัวสูง f40-44 ไป-กลับ 8 เฟรม · ตัวอ้วน 20 เฟรม (f24-43) · ตัวเล็ก 13 เฟรม (f53-65)

แต่ละตัว "วิ่งอยู่กับที่" (ยึดกึ่งกลางสะโพกทุกเฟรม ตัดการแพนกล้องทิ้ง) — เกมเป็นคนเลื่อนตำแหน่งเอง
ขนาด: สเกลเดียวกันทั้ง 3 ตัว (รักษาสัดส่วนในคลิป) ตัวสูง ~270px ในเกม
เก็บภาพใหญ่กว่าขนาดในเกม STORE_MUL เท่า (ให้คม) — เกมย่อด้วย CRAZY_TITANS.displayScale
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW = sys.argv[1] if len(sys.argv) > 1 else "raw/crazyG"
OUT = sys.argv[2] if len(sys.argv) > 2 else "out"
os.makedirs(OUT, exist_ok=True)
LUMW = np.array([0.299, 0.587, 0.114], dtype=np.float32)

GAME_TALL_HEIGHT = 270       # ตัวสูงในเกม (px)
STORE_MUL = 1.5              # เก็บใหญ่กว่าในเกมกี่เท่า
PAD = 12
MAX_W = 2048
# โทนเดียวกับไททัน OAT (ระดับ 1) ให้เข้าชุดกัน
STYLE = dict(bright=0.08, contrast=0.10, sat=0.15, outline=2, line=(26, 20, 18))

TITANS = {
    # ชื่อ: (ช่วงเฟรมรอบวิ่ง, วิธีเลือกชิ้นในเฟรม)
    # ตัวสูง: f17-f39 มีขาของตัวเล็กตัวแรกซ้อนอยู่ข้างหลัง (อยู่ในเงา แยกด้วยสีไม่ได้) · f45+ ติดตัวอ้วน/ขอบภาพ
    # เหลือเฟรมสะอาดแค่ f40-f44 (= 1 ก้าว) -> เล่นไป-กลับ (ping-pong) กันกระตุกตอนวนรอบ
    "tall": ([40, 41, 42, 43, 44, 43, 42, 41], "rightmost"),
    "fat": (range(24, 44), "leftmost_big"),
    "small": (range(53, 66), "leftmost"),
}


def comps(n):
    rgb = np.asarray(Image.open(f"{RAW}/f_{n:03d}.png").convert("RGB")).astype(np.float32)
    lum = rgb @ LUMW
    sat = rgb.max(2) - rgb.min(2)
    # ผิวอิ่มสี / ผม-เงาเข้ม · พื้นหลังและเงาพื้นเป็นเทาไม่อิ่มสี
    fg = (lum < 170) | ((sat > 22) & (lum < 236))
    fg = ndimage.binary_opening(fg, np.ones((3, 3)))
    fg = ndimage.binary_closing(fg, np.ones((5, 5)))
    lab, k = ndimage.label(fg)
    sz = ndimage.sum(fg, lab, range(1, k + 1))
    out = []
    for i in range(k):
        if sz[i] < 8000:
            continue
        m = lab == i + 1
        ys, xs = np.nonzero(m)
        out.append(dict(mask=m, area=int(sz[i]), cx=float(xs.mean())))
    return rgb, lum, sat, out


def pick(n, how):
    rgb, lum, sat, cs = comps(n)
    if how == "rightmost":
        c = max(cs, key=lambda c: c["cx"])
    elif how == "leftmost_big":
        c = min([c for c in cs if c["area"] > 50000], key=lambda c: c["cx"])
    else:
        c = min(cs, key=lambda c: c["cx"])
    m = c["mask"]
    # ถมรูที่ไม่ใช่พื้นหลัง (ผิวซีดของตัวอ้วน)
    holes, nh = ndimage.label(ndimage.binary_fill_holes(m) & ~m)
    if nh:
        idx = range(1, nh + 1)
        area = ndimage.sum(np.ones_like(lum), holes, idx)
        msat = ndimage.mean(sat, holes, idx)
        mlum = ndimage.mean(lum, holes, idx)
        # เงาพื้นระหว่างขาเป็นเทาเข้ม — ไม่นับความสว่าง ใช้แค่ความอิ่มสี
        keep = [i for i, a, s in zip(idx, area, msat) if a < 80 or s > 14]
        m = m | np.isin(holes, keep)
    inner = ndimage.binary_erosion(m, np.ones((5, 5)))
    edge = np.clip((238 - lum) * 8 + sat * 6, 0, 255)
    alpha = np.where(inner, 255, edge) * m
    return rgb, alpha, m


def hip_x(m):
    ys, xs = np.nonzero(m)
    h = ys.max() - ys.min()
    sel = (ys > ys.min() + 0.45 * h) & (ys < ys.min() + 0.62 * h)
    return float(np.median(xs[sel]))


def style(im):
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3] / 255
    al = arr[..., 3]
    lum = (rgb @ LUMW)[..., None]
    adj = lum + (rgb - lum) * (1 - STYLE["sat"])
    adj = (adj - 0.5) * (1 + STYLE["contrast"]) + 0.5
    adj = np.clip(adj * (1 - STYLE["bright"]), 0, 1)
    out = Image.fromarray(np.dstack([adj * 255, al]).astype(np.uint8), "RGBA")
    m = al > 100
    ring = ndimage.binary_dilation(m, iterations=STYLE["outline"]) & ~m
    e = np.zeros(arr.shape, dtype=np.uint8)
    e[..., :3] = STYLE["line"]
    e[..., 3] = ring * 235
    base = Image.fromarray(e, "RGBA")
    base.alpha_composite(out)
    return base


# ── สเกลร่วม: จากความสูงตัวสูงในรอบวิ่ง ──
_cache = {}


def pick_cached(n, how):
    if (n, how) not in _cache:
        _cache[(n, how)] = pick(n, how)
    return _cache[(n, how)]


cuts = {name: [(n, *pick_cached(n, how)) for n in rng] for name, (rng, how) in TITANS.items()}
tall_h = np.median([np.ptp(np.nonzero(m)[0]) for _, _, _, m in cuts["tall"]])
SCALE = GAME_TALL_HEIGHT * STORE_MUL / tall_h
print(f"tall raw height {tall_h:.0f} -> scale {SCALE:.4f}")

frames, meta_titans = {}, {}
for name, items in cuts.items():
    # ผืนภาพต่อตัว: พอดีทุกเฟรม · เท้าอยู่ที่ขอบล่าง-PAD · กึ่งกลางสะโพกอยู่ที่ anchorX
    boxes = []
    for n, rgb, alpha, m in items:
        ys, xs = np.nonzero(m)
        hx = hip_x(m)
        boxes.append((xs.min() - hx, xs.max() - hx, ys.max() - ys.min(), ys.max()))
    left = max(-b[0] for b in boxes) * SCALE
    right = max(b[1] for b in boxes) * SCALE
    height = max(b[2] for b in boxes) * SCALE
    CW = int(left + right + PAD * 2)
    CH = int(height + PAD * 2)
    AX = int(left + PAD)
    FY = CH - PAD
    for i, (n, rgb, alpha, m) in enumerate(items, 1):
        ys, xs = np.nonzero(m)
        im = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
        bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        crop = im.crop(bb)
        sim = crop.resize((max(1, round(crop.width * SCALE)), max(1, round(crop.height * SCALE))), Image.LANCZOS)
        c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        dx = round(AX - (hip_x(m) - bb[0]) * SCALE)
        dy = round(FY - (ys.max() + 1 - bb[1]) * SCALE)
        c.alpha_composite(sim, (dx, dy))
        frames[f"{name}_{i}.png"] = style(c)
    meta_titans[name] = {"frames": len(items), "canvas": [CW, CH], "anchorX": AX, "feetY": FY,
                         "height": round(height / STORE_MUL)}
    print(f"{name:6s} {len(items):2d} frames canvas {CW}x{CH} anchor {AX} feet {FY} game height {round(height / STORE_MUL)}")

# pack หลายแถว
tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in frames.items()}
pad = 2
rows, cur, cw = [], [], pad
for k, (bb, _) in tr.items():
    w = bb[2] - bb[0] + pad
    if cur and cw + w > MAX_W:
        rows.append(cur); cur, cw = [], pad
    cur.append(k); cw += w
rows.append(cur)
rh = [max(tr[k][0][3] - tr[k][0][1] for k in r) + pad for r in rows]
W = max(sum(tr[k][0][2] - tr[k][0][0] + pad for k in r) + pad for r in rows)
H = sum(rh) + pad
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0)); meta = {}
y = pad
for ri, r in enumerate(rows):
    x = pad
    for k in r:
        bb, im = tr[k]; cr = im.crop(bb); sheet.paste(cr, (x, y))
        meta[k] = {"frame": {"x": x, "y": y, "w": cr.width, "h": cr.height}, "rotated": False, "trimmed": True,
                   "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": cr.width, "h": cr.height},
                   "sourceSize": {"w": im.width, "h": im.height}}
        x += cr.width + pad
    y += rh[ri]
assert H <= 8192, f"atlas สูง {H} เกินลิมิต"
sheet.save(f"{OUT}/crazytitans_atlas.png", optimize=True)
json.dump({"frames": meta, "meta": {"image": "crazytitans_atlas.png", "size": {"w": W, "h": H}, "scale": "1",
                                     "titans": meta_titans, "storeMul": STORE_MUL}},
          open(f"{OUT}/crazytitans_atlas.json", "w"), indent=1)
print(f"packed {W}x{H} {len(meta)} frames {os.path.getsize(f'{OUT}/crazytitans_atlas.png') // 1024} KB")
