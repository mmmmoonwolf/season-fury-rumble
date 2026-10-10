"""เตรียมเฟรมท่าวิ่งของ EYE จากคลิป — ตัดพื้น หา anchor แล้วเขียน clip.json

เลือกหน้าต่างด้วย **รอยต่อของลูป** ไม่ใช่ด้วยตา (วิธีเดียวกับ KUNJAE):
ไล่ทุกหน้าต่างยาวหนึ่งคาบ แล้ววัด IoU ของรอยต่อ (เฟรมถัดจากรอบ -> เฟรมแรก)
เทียบกับ IoU ของเฟรมติดกันเฉลี่ย — ยิ่งสองค่าใกล้กันยิ่งแปลว่าลูปเนียน

รัน (จากโฟลเดอร์ game):  python3 tools/prep_eye_clip.py <โฟลเดอร์เฟรม>
"""
import json, os, sys, glob
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import background, body_anchor, soft_alpha, trim_ground_debris
from scipy import ndimage

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art_reference", "chronos_clip")
os.makedirs(OUT, exist_ok=True)
PERIOD, TAKE = 23, 10

files = sorted(glob.glob(os.path.join(SRC, "*.png")))
masks, arrs = [], []
for p in files:
    a = np.asarray(Image.open(p).convert("RGB")).astype(int)
    m = trim_ground_debris(~background(a))
    lab, k = ndimage.label(m)
    if k > 1:                                  # เก็บเฉพาะก้อนใหญ่สุด = ตัวละคร
        sz = ndimage.sum(m, lab, range(1, k + 1))
        m = lab == (int(np.argmax(sz)) + 1)
    masks.append(m); arrs.append(a)

def iou(a, b):
    ya, xa = np.nonzero(a); yb, xb = np.nonzero(b)
    bb = np.roll(np.roll(b, int(ya.mean() - yb.mean()), 0), int(xa.mean() - xb.mean()), 1)
    u = (a | bb).sum()
    return (a & bb).sum() / u if u else 0.0

best = None
for s in range(8, len(masks) - PERIOD - 2):
    cons = float(np.mean([iou(masks[s + i], masks[s + i + 1]) for i in range(PERIOD)]))
    seam = iou(masks[s + PERIOD], masks[s])
    d = abs(seam - cons)
    if best is None or d < best[0]:
        best = (d, s, cons, seam)
d, start, cons, seam = best
print(f"ลูปเนียนที่สุด: เริ่ม f{start} · ติดกันเฉลี่ย {cons:.3f} · รอยต่อ {seam:.3f} · ต่าง {d:.3f}")
idx = [start + round(i * PERIOD / TAKE) for i in range(TAKE)]

# ท่ายืนใช้ความสูงมัธยฐานของทั้งรอบเป็นไม้บรรทัด (วิ่งไม่มีท่ายืนให้วัด)
hs, anchors, bases = [], [], []
for k, i in enumerate(idx, 1):
    m = masks[i]
    ys, xs = np.nonzero(m)
    # soft_alpha คืน (สีที่ถอดขอบพื้นแล้ว, อัลฟา) — ต้องประกอบเป็น RGBA เอง
    fg, al = soft_alpha(arrs[i], ~m)
    crop = Image.fromarray(np.dstack([fg, al])).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    crop.save(os.path.join(OUT, f"run_{k:02d}.png"))
    hs.append(int(ys.max() - ys.min() + 1))
    anchors.append(float(body_anchor(m, erode=31) - xs.min()))
    bases.append(int(ys.max() - ys.min() + 1))     # ท่าวิ่งยึดเท้า = ขอบล่างของตัวเอง
json.dump({"stand_h": int(np.median(hs)), "start": start, "period": PERIOD,
           "frames": idx, "anchor": anchors, "base": bases},
          open(os.path.join(OUT, "clip.json"), "w"), indent=1)
print(f"เขียน {TAKE} เฟรม · ความสูงมัธยฐาน {int(np.median(hs))} px (ต่ำสุด {min(hs)} สูงสุด {max(hs)})")
