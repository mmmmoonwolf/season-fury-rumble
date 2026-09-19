"""
Dear V.2 ท่าสกิล (v30) — มีดจ้วง (S1) + เสกตัวตลกเล็ก 3 ตัว (S2)

ใช้:
  mkdir -p raw/dv2_s1 raw/dv2_s2
  ffmpeg -i skill1.MP4 -vsync 0 raw/dv2_s1/f%03d.png
  ffmpeg -i skill2.MP4 -vsync 0 raw/dv2_s2/f%03d.png
  python3 tools/build_dearv2_skills.py raw/dv2_s1 raw/dv2_s2 assets/characters

ออก 2 atlas:
  dearv2_skill_atlas  — ท่าของ Dear เอง (ผืนภาพ 420x470 เท่า dearv2_atlas · knife_* / cast_*)
  dearv2_clown_atlas  — ตัวตลกเล็กที่ถูกเสก (ผืนภาพ 260x240 · crun_* / cstab_*) วาดโดย MiniClownSystem

⚠️ คลิปชุดนี้พื้นหลัง "เทาอ่อนไล่เฉด + ขอบมืด" (RGB ~200-235) และชุดตัวละครก็ขาวครีม
   ตัดด้วยค่าความสว่างคงที่ไม่ได้ -> ประมาณ "แผ่นพื้นหลัง" จากภาพเบลอที่ตัดตัวละครออก แล้วดูส่วนต่าง
   (วิธีเดียวกับที่ build_dearv2.py เจอปัญหา แต่ทนกับขอบมืดได้ดีกว่า)
   ลายน้ำ Gemini มุมขวาล่างเป็นชิ้นเล็กแยก -> ถูกตัดทิ้งเพราะเก็บเฉพาะชิ้นใหญ่
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW1 = sys.argv[1] if len(sys.argv) > 1 else "raw/dv2_s1"
RAW2 = sys.argv[2] if len(sys.argv) > 2 else "raw/dv2_s2"
OUT = sys.argv[3] if len(sys.argv) > 3 else "out"

# ── Dear (ผืนภาพเดียวกับ dearv2_atlas) ──
CANVAS = (420, 470); ANCHOR_X = 210; FEET_Y = 431; STANDING = 393
DEAR_CLIP_H = 660          # ความสูงตัวยืนในคลิปทั้ง 2 (วัดจากเฟรมแรก)
SCALE = STANDING / DEAR_CLIP_H
# ── ตัวตลกเล็ก (atlas แยก ระบบ MiniClownSystem วาดเอง) ──
CLOWN_CANVAS = (260, 240); CLOWN_ANCHOR_X = 130; CLOWN_FEET = 225
CLOWN_H = 190              # ความสูงในผืนภาพ
CLOWN_CLIP_H = 458         # ความสูงจริงในคลิป = 0.69 เท่าของ Dear
MAX_W = 4096

# S1 มีดจ้วง: f128 ชักมีด -> f132-f160 จ้วงรัว (3/4 หน้า หันขวา) -> f164 คืนท่า
S1 = [128, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 164]
# S2 ร่ายเสก: f20-f40 ยืนหน้าตรง ปอมปอมแดงเรืองแสง (หลัง f42 ตัวตลกเล็กโผล่มาบังตัว ใช้ไม่ได้)
S2_CAST = [20, 24, 28, 32, 36, 40]
# ตัวตลกเล็ก: วิ่ง (เลือกตัวกลาง แยกจากตัวอื่นชัด) · แทง (เลือกตัวขวาสุด)
CLOWN_RUN = list(range(108, 132, 2))
CLOWN_STAB = [206, 208, 210, 220, 222, 224, 226, 228]  # เฟรมที่ตัวขวาสุดไม่ทับตัวอื่น

def bg_plate(lum, rough):
    """ประมาณพื้นหลังไล่เฉด: เฉลี่ยเฉพาะพิกเซลที่ไม่ใช่ตัวละคร แล้วเบลอแรง ๆ"""
    v = np.where(rough, 0, lum)
    m = (~rough).astype(np.float32)
    k = 81
    bg = ndimage.uniform_filter(v, k) / np.maximum(ndimage.uniform_filter(m, k), 1e-3)
    return ndimage.uniform_filter(bg, 121)

def foreground(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    rough = (lum < 195) | (sat > 28)
    d = np.abs(lum - bg_plate(lum, rough))
    fg = ndimage.binary_closing((d > 9) | (sat > 25), np.ones((5, 5)))
    return rgb, fg, d

def rgba(rgb, mask, d):
    """ขอบนุ่มตามส่วนต่างจากพื้นหลัง (ไม่งั้นขอบแข็งเป็นฟันเลื่อย)"""
    inner = ndimage.binary_erosion(mask, np.ones((3, 3)))
    a = np.where(inner, 255, np.clip((d - 4) * 32, 0, 255)) * mask
    return Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")

def solid(mask):
    """อุดรูในชุด — ชุดขาวครีมกับพื้นหลังเทาอ่อนสีใกล้กัน ส่วนต่างบางจุดต่ำกว่าเกณฑ์จนเป็นรู"""
    return ndimage.binary_fill_holes(ndimage.binary_closing(mask, np.ones((7, 7))))

def biggest(fg, min_px=20000):
    lab, n = ndimage.label(fg)
    if not n:
        return fg
    sz = ndimage.sum(fg, lab, range(1, n + 1))
    return solid(lab == (int(np.argmax(sz)) + 1)) if sz.max() >= min_px else solid(fg)

def parts(fg, min_px=20000):
    """ชิ้นใหญ่ ๆ ทั้งหมด (ตัวตลกแต่ละตัว) เรียงจากซ้ายไปขวา — ลูกโป่ง/ลายน้ำเล็กกว่าจึงหลุด"""
    lab, n = ndimage.label(fg)
    out = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < min_px:
            continue
        ys, xs = np.nonzero(m)
        out.append({"mask": solid(m), "x0": int(xs.min()), "x1": int(xs.max()), "y0": int(ys.min()), "y1": int(ys.max())})
    return sorted(out, key=lambda p: p["x0"])

def hip_x(mask):
    ys, xs = np.nonzero(mask)
    top, bot = ys.min(), ys.max()
    band = (ys > top + 0.45 * (bot - top)) & (ys < top + 0.6 * (bot - top))
    return float(np.median(xs[band])) if band.any() else float((xs.min() + xs.max()) / 2)

def place(im, mask, canvas, anchor_x, feet_y, scale):
    ys, xs = np.nonzero(mask)
    cx, bot = hip_x(mask), int(ys.max())
    w, h = round(im.width * scale), round(im.height * scale)
    sim = im.resize((w, h), Image.LANCZOS)
    c = Image.new("RGBA", canvas, (0, 0, 0, 0))
    c.alpha_composite(sim, (round(anchor_x - cx * scale), round(feet_y - bot * scale)))
    return c

frames_dear, frames_clown = {}, {}

for name, nums, raw in (("knife", S1, RAW1), ("cast", S2_CAST, RAW2)):
    for i, n in enumerate(nums, 1):
        rgb, fg, d = foreground(f"{raw}/f{n:03d}.png")
        m = biggest(fg)
        frames_dear[f"{name}_{i}.png"] = place(rgba(rgb, m, d), m, CANVAS, ANCHOR_X, FEET_Y, SCALE)
    print(f"{name:6s} {len(nums)} frames")

# ตัวตลกเล็ก — เลือกตัวตามลำดับซ้าย-ขวาในเฟรม (วิ่ง = ตัวกลาง · แทง = ตัวขวาสุด)
for name, nums, pick in (("crun", CLOWN_RUN, 1), ("cstab", CLOWN_STAB, -1)):
    hs = []
    for n in nums:
        rgb, fg, d = foreground(f"{RAW2}/f{n:03d}.png")
        ps = parts(fg)
        if len(ps) < 2:
            print(f"⚠️ {name} f{n}: แยกตัวไม่ออก ({len(ps)} ชิ้น) — ข้าม")
            continue
        p = ps[pick]
        m = p["mask"]
        hs.append(p["y1"] - p["y0"])
        frames_clown[f"{name}_{len(hs)}.png"] = place(rgba(rgb, m, d), m, CLOWN_CANVAS, CLOWN_ANCHOR_X, CLOWN_FEET, CLOWN_H / CLOWN_CLIP_H)
    print(f"{name:6s} {len(hs)} frames  สูงในคลิป ~{int(np.median(hs))}px ({np.median(hs) / DEAR_CLIP_H:.2f} เท่าของ Dear)")

def pack(fr, name):
    tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in fr.items()}
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
    sheet.save(f"{OUT}/{name}.png", optimize=True)
    json.dump({"frames": meta, "meta": {"image": f"{name}.png", "size": {"w": W, "h": H}, "scale": "1"}},
              open(f"{OUT}/{name}.json", "w"), indent=1)
    print(f"{name}: {W}x{H}  {len(meta)} frames")
    for k, im in fr.items():  # ชนขอบผืนภาพ = ผืนภาพแคบไป
        bb = im.getbbox()
        if bb and (bb[0] == 0 or bb[2] == im.width or bb[1] == 0):
            print("⚠️ ชนขอบ:", k, bb)

pack(frames_dear, "dearv2_skill_atlas")
pack(frames_clown, "dearv2_clown_atlas")
