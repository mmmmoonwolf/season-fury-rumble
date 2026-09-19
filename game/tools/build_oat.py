"""
ประกอบ atlas ของ OAT จากคลิปเดียว USE_THIS_IN__ONE.MOV (628 เฟรม @24fps, พื้นขาว 255)

ใช้ (2 คลิป):
  mkdir -p raw/oat raw/oat_punch
  ffmpeg -i USE_THIS_IN__ONE.MOV -vsync 0 -start_number 1 raw/oat/f_%03d.png
  ffmpeg -i Same_character_same_outfit_s.mp4 -vsync 0 -start_number 1 raw/oat_punch/f_%03d.png
  python3 tools/build_oat.py raw/oat raw/oat_punch assets/characters

คลิป B (Same_character_same_outfit_s.mp4, 432 เฟรม @24fps) = ชุดหมัดซ้าย-ขวา
  กล้อง/ขนาดตัวเท่าคลิป A (ตั้งการ์ดสูง ~648px เท่ากัน) จึงใช้สเกลเดียวกัน
  หมัด "เปิดอก" = แขนหน้า (ซ้าย) jab · หมัด "บิดตัวหันหลัง" = แขนหลัง (ขวา) cross · ไม่มี hook
  ชุด jab->cross: f98-f120, f226-f249, f262-f290, f314-f348 (cross ค้างนาน) · cross เดี่ยว f132-f145, f298-f310

ช่วงท่าจริงในคลิป (ตรวจจาก contact sheet แล้ว — ตารางเดิมใน NEXT_SESSION คลาดเคลื่อน):
  f1-f10    ยืนปกติ (ใช้เป็นเกณฑ์สเกล)
  f11-f245  ตั้งการ์ด — มี jab ซ่อนอยู่ 2 ครั้ง: f133-f145 และ f158-f170
  f243-f292 วิ่งพุ่ง (รอบวิ่งสำรอง ยังไม่ใช้)
  f293-f336 กระโจนกลางอากาศ ยกเข่า
  f337-f373 ลงพื้นย่อตัว (ใช้เป็นท่ากัน)
  f376-f395 โดนตี มีประกาย + ฝุ่น
  f396-f486 ปลิวถอยหลัง -> ล้มนอน -> ยันตัวลุก (เก็บไว้เฉย ๆ ยังไม่มี state)
  f496-f557 วิ่ง (รอบก้าวคงที่ช่วง f510+)
  f558-f600 กระโดด / ตก / ลงพื้นมีฝุ่น
  f600-f628 ยืนนิ่ง + แฟลชโดนตีที่อกช่วงท้าย

ชายโค้ทยาวไม่หลุดจาก logic "เก็บชิ้นใหญ่สุด" — ตรวจแล้วชิ้นรองทุกเฟรมเป็นเงาพื้น/ฝุ่น/ประกาย (สีอ่อน)
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW = sys.argv[1] if len(sys.argv) > 1 else "raw/oat"
RAW_B = sys.argv[2] if len(sys.argv) > 2 else "raw/oat_punch"
OUT = sys.argv[3] if len(sys.argv) > 3 else "out"
os.makedirs(OUT, exist_ok=True)

THR = 243
CANVAS = (640, 470); ANCHOR_X = 320; FEET_Y = 431; STANDING = 393
HEAD_TOP = FEET_Y - STANDING
MAX_W = 2048
G, A = "ground", "air"


def cutout(path):
    """ตัดพื้นขาว เก็บชิ้นใหญ่สุด — เนื้อในทึบ 255 ใช้ค่าความสว่างทำ alpha เฉพาะขอบ (กันหน้า/เสื้อเทาโปร่ง)"""
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    fg = ndimage.binary_closing(lum < THR, np.ones((3, 3)))
    lab, n = ndimage.label(fg)
    if n:
        sz = ndimage.sum(fg, lab, range(1, n + 1))
        fg = lab == (int(np.argmax(sz)) + 1)
    # ถมรูเฉพาะที่ "ไม่ใช่พื้นหลัง" — ช่องระหว่างขาที่โค้ทล้อมไว้เป็นพื้นขาวจริง ต้องโปร่ง
    holes, nh = ndimage.label(ndimage.binary_fill_holes(fg) & ~fg)
    if nh:
        idx = range(1, nh + 1)
        area = ndimage.sum(np.ones_like(lum), holes, idx)
        mean = ndimage.mean(lum, holes, idx)
        keep = [i for i, a, m in zip(idx, area, mean) if a < 60 or m < 238]
        fg = fg | np.isin(holes, keep)
    inner = ndimage.binary_erosion(fg, np.ones((5, 5)))
    edge_a = np.clip((THR - lum) * 14, 0, 255)
    alpha = np.where(inner, 255, edge_a) * fg
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA"), fg


# (ชื่อท่า, [(เฟรม, การ align[, องศาหมุน])])
# เฟรม: ตัวเลข = คลิป A · สตริง "B227" = เฟรม 227 ของคลิป B
def seq(frames, kind): return [(f, kind) for f in frames]

SEQ = {
    # ตั้งการ์ด หายใจ — ช่วงที่ไม่มี jab
    "idle":  seq(range(16, 125, 12), G),
    # วิ่ง 1 รอบก้าวเต็ม (จุดกว้างสุด f519 -> f538 = 19 เฟรม) หยิบทุก 2 เฟรม
    "run":   seq(range(520, 539, 2), G),
    "jump":  seq([558, 561, 564, 567, 570], A),   # bottom 649 -> 516
    "fall":  seq([576, 579, 582, 585], A),        # bottom 515 -> 629
    "land":  seq([588, 600], G),        # f590-f598 มีฝุ่นติดเท้า
    # หมัดพื้น ซ้าย-ขวา-ซ้าย จากคลิป B
    # hit1 = jab ซ้าย / hit2 = cross ขวา (ชุดต่อเนื่องเดียวกัน f227-f246) / hit3 = jab ซ้ายอีก take ที่ยืดไกลกว่า
    "hit1":  seq(["B227", "B229", "B230", "B231", "B232", "B234", "B236"], G),
    # hit2 จบที่ B249 (หัวกลับมาใกล้จุดเริ่ม hit3) · hit3 ต่อท้ายด้วยช่วงคืนการ์ดจาก take แรก (B252/B256)
    # เพราะ take f314 ต่อ cross ทันทีโดยไม่คืนการ์ด — ไม่งั้นจบ hit3 แล้วตัวกระตุกถอยกลับไปท่า idle
    "hit2":  seq(["B237", "B238", "B239", "B240", "B242", "B244", "B246", "B249"], G),
    "hit3":  seq(["B314", "B315", "B316", "B317", "B318", "B320", "B322", "B252", "B256"], G),
    # ไม้ตาย (สกิล 1) = รัว jab แขนเดียวจากคลิป A — ผู้ใช้ยืนยันแบบนี้แล้ว
    "rush":  seq([135, 137, 138, 140, 160, 162, 163, 165], G),
    # ── สำรอง: โน้มตัวพุ่ง + กระโจนยกเข่า + ลงพื้น (เคยเป็น hit3) เผื่อทำสกิล ──
    "leap":  [(243, G), (247, G), (299, A), (305, A), (311, A), (317, A), (343, G)],
    # โดนตี: เฟรมแรกคือภาพที่เห็นจริง (hurt เป็น still)
    # เฟรมดิบเอียงหลัง 30-35° มากไป -> หมุนกลับรอบจุดเท้าให้เหลือ ~15°
    # (ไม่ใช้ f376-f377 เพราะมีเศษประกายติดเท้า — hurt เป็น still เฟรมแรกคือภาพเดียวที่เห็น)
    "hurt":  [(380, G, -15), (383, G, -19), (386, G, -20), (389, G, -20)],
    # ท่ากัน = ย่อตัวลง เล่นครั้งเดียวค้างเฟรมสุดท้าย
    "block": seq([343, 346, 349, 352, 355, 358, 361], G),
    # ยั่ว = ยืนชิลล์ ไม่ตั้งการ์ด
    "taunt": seq([612], G),
    # ── เก็บไว้ ยังไม่ผูก state ──
    "knockdown": [(396, A), (408, A), (420, A), (432, A), (444, A), (456, G),
                  (468, G), (474, G), (480, G)],
    "getup": seq([486, 489, 492], G),
}

def p(n):
    if isinstance(n, str):
        return f"{RAW_B}/f_{int(n[1:]):03d}.png"
    return f"{RAW}/f_{n:03d}.png"

# ท่าที่เริ่มจากตั้งการ์ด: ยึดตำแหน่งหัวของเฟรมแรก (ต่อจาก idle ได้เนียน ไม่กระตุกถอยหลัง)
ANCHOR_FIRST = {"block"}
# ยึดตำแหน่งหัวของ "ท่าการ์ดก่อนต่อย" ตัวเดียวกันทั้งชุด (กล้องนิ่ง ตำแหน่งยืนในคลิปดิบแทบเท่ากัน)
# -> หมัด 1-2-3 ต่อกันโดยตัวไม่กระโดด และเริ่ม/จบตรงกับ idle
ANCHOR_FROM = {"hit1": "B227", "hit2": "B227", "hit3": "B227", "rush": 133}
_, fg0 = cutout(p(1))
ys0, _ = np.nonzero(fg0)
SCALE = STANDING / (ys0.max() - ys0.min())
print(f"scale={SCALE:.4f}")

frames = {}
for name, items in SEQ.items():
    cuts = []
    for it in items:
        n, kind = it[0], it[1]
        im, fg = cutout(p(n))
        if len(it) > 2:  # (เฟรม, align, องศาหมุน) — หมุนรอบกึ่งกลางเท้า ลบ = ตามเข็ม (ตั้งตัวขึ้น)
            ys, xs = np.nonzero(fg)
            piv = (float(xs[ys > ys.max() - 40].mean()), float(ys.max()))
            im = im.rotate(it[2], resample=Image.BICUBIC, center=piv)
            fg = np.asarray(Image.fromarray(fg.astype(np.uint8) * 255).rotate(it[2], center=piv)) > 127
        cuts.append(((im, fg), kind))
    # anchor แนวนอนคงที่ทั้งท่า = ค่ากลางของ "ช่วงหัว" ทุกเฟรม
    # (ไม่ใช้กึ่งกลาง bbox รายเฟรม เพราะชายโค้ทปลิวทำให้ตัวไหลไปมา และจะลบการพุ่งหมัดจริงออก)
    heads = []
    for (im, fg), _k in cuts:
        ys, xs = np.nonzero(fg)
        sl = ys < ys.min() + 110
        heads.append(float(np.median(xs[sl])))
    if name in ANCHOR_FROM:
        _, fgr = cutout(p(ANCHOR_FROM[name]))
        ys, xs = np.nonzero(fgr)
        ax = float(np.median(xs[ys < ys.min() + 110]))
    elif name in ANCHOR_FIRST:
        ax = heads[0]
    else:
        ax = float(np.median(heads))
    for i, ((im, fg), kind) in enumerate(cuts, 1):
        ys, _ = np.nonzero(fg)
        top, bot = int(ys.min()), int(ys.max())
        w, h = round(im.width * SCALE), round(im.height * SCALE)
        sim = im.resize((w, h), Image.LANCZOS)
        c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        dx = round(ANCHOR_X - ax * SCALE)
        dy = round(FEET_Y - bot * SCALE) if kind == G else round(HEAD_TOP - top * SCALE)
        c.alpha_composite(sim, (dx, dy))
        a = np.asarray(c)[..., 3].copy(); a[a < 8] = 0  # alpha ขยะรอบตัว
        c.putalpha(Image.fromarray(a))
        frames[f"{name}_{i}.png"] = c
    print(f"{name:10s} {len(items):3d}")

# pack หลายแถว ไม่เกิน MAX_W (กันกล่องดำ)
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
sheet.save(f"{OUT}/oat_atlas.png")
json.dump({"frames": meta, "meta": {"image": "oat_atlas.png", "size": {"w": W, "h": H}, "scale": "1"}},
          open(f"{OUT}/oat_atlas.json", "w"), indent=1)
print(f"packed {W}x{H}  {len(meta)} frames  {len(rows)} rows")
