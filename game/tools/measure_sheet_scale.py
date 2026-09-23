"""
วัดว่า "ท่ายืนที่สเกลของภาพนี้สูงกี่พิกเซล" สำหรับเอาไปใส่ CLIP_STANDING_PX ใน build_scramble_nyx.py

ใช้กับภาพรวมท่าที่ไม่มีท่ายืนตรงอยู่ในตัวเอง (ชีตท่ากัน/ท่าโจมตี) ซึ่งเทียบสเกลจากในชีตเองไม่ได้
วัดจากขนาดใบหน้า — ใบหน้าไม่เปลี่ยนขนาดตามท่า เปลี่ยนตามระยะกล้องอย่างเดียว
แล้วเทียบกับท่ายืนอ้างอิง (idle/f_014.png) ที่รู้ความสูงจริงอยู่แล้ว

ตรวจความถูกต้องของวิธีแล้ว: ทำนายชีตท่ากันได้ 586 เทียบค่าที่วัดจากภาพในเกมจริง 585 = คลาด 0%

ข้อจำกัดที่ต้องรู้: ถ้า "ทุกท่า" ในชีตมีมือหรือดาบบังหน้า ตัวเลขจะต่ำกว่าจริงแบบเงียบ ๆ
(ชีตก้มกันชุดแรกคลาด -16% ด้วยเหตุนี้) สคริปต์จึงพิมพ์ค่าของทุกท่าให้ดู ไม่ได้บอกแค่ตัวเลขเดียว
ถ้าค่ากระจายกันมาก แปลว่าหน้าโดนบังบางท่า ให้เชื่อค่าสูงสุด แล้วยืนยันด้วยภาพในเกมเสมอ

รัน (จากโฟลเดอร์ game):  python3 tools/measure_sheet_scale.py <ไฟล์ภาพ> [ไฟล์ภาพ ...]
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import estimate_bg
from sheet_poses import sheet_poses

RAW = os.environ.get("SCRAMBLE_RAW", "/tmp/sc")
REF = os.path.join(RAW, "idle", "f_014.png")


def face_sqrt(img):
    """รากที่สองของพื้นที่ใบหน้า (โทนผิวในช่วงหัว) — เป็นสัดส่วนตรงกับระยะกล้อง"""
    a = np.asarray(img)
    m = a[:, :, 3] > 110 if a.shape[2] == 4 else np.ones(a.shape[:2], bool)
    rgb = a[:, :, :3].astype(np.float32)
    ys, _ = np.nonzero(m)
    if len(ys) == 0:
        return 0.0
    top, h = ys.min(), ys.max() - ys.min() + 1
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    skin = (r > 150) & (r < 252) & (g > 110) & (g < 215) & (b > 85) & (b < 190)
    skin &= ((r - b) > 32) & ((r - g) > 14) & m
    band = np.zeros_like(skin)
    band[top:top + int(h * 0.30)] = True   # เฉพาะช่วงหัว ไม่เอามือ/ขาที่เป็นสีผิวเหมือนกัน
    skin = ndimage.binary_opening(skin & band, np.ones((3, 3)))
    lab, n = ndimage.label(skin)
    if n == 0:
        return 0.0
    return float(np.sqrt(ndimage.sum(skin, lab, range(1, n + 1)).max()))


def reference():
    im = Image.open(REF).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = estimate_bg(rgb)
    solid = ndimage.binary_fill_holes(
        ndimage.binary_closing(np.abs(rgb - bg).max(axis=2) > 18, np.ones((5, 5))))
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    ys, _ = np.nonzero(big)
    rgba = Image.fromarray(np.dstack([np.asarray(im), (big * 255).astype(np.uint8)]))
    return int(ys.max() - ys.min() + 1), face_sqrt(rgba)


def main(paths):
    ref_h, ref_face = reference()
    print(f"ท่ายืนอ้างอิง {REF}: สูง {ref_h} px  ใบหน้า {ref_face:.1f}\n")
    for path in paths:
        poses = sheet_poses(path)
        faces = [face_sqrt(img.crop((b[0], b[1], b[2] + 1, b[3] + 1))) for img, b, _ in poses]
        seen = [f for f in faces if f > 0]
        if not seen:
            print(f"{os.path.basename(path)}: วัดใบหน้าไม่ได้สักท่า — ต้องกำหนดเลขเอง")
            continue
        px = ref_h * max(seen) / ref_face
        spread = (max(seen) / min(seen) - 1) * 100
        print(f"{os.path.basename(path)}  ({len(poses)} ท่า)")
        print("   ใบหน้าแต่ละท่า: " + " ".join(f"{f:.0f}" for f in faces))
        print(f"   -> CLIP_STANDING_PX = {px:.0f}")
        if spread > 25:
            print(f"   ** ค่ากระจาย {spread:.0f}% — บางท่าหน้าโดนบัง เชื่อค่าสูงสุด "
                  f"และต้องยืนยันด้วยภาพในเกม **")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(sys.argv[1:])
