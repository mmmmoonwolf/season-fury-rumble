"""
วัดว่า "ท่ายืนที่สเกลของภาพนี้สูงกี่พิกเซล" สำหรับเอาไปใส่ CLIP_STANDING_PX ใน build_scramble_nyx.py

ใช้กับภาพรวมท่าที่ไม่มีท่ายืนตรงอยู่ในตัวเอง (ชีตท่ากัน/ท่าโจมตี) ซึ่งเทียบสเกลจากในชีตเองไม่ได้
วัดจากขนาดใบหน้า — ใบหน้าไม่เปลี่ยนขนาดตามท่า เปลี่ยนตามระยะกล้องอย่างเดียว
แล้วเทียบกับท่ายืนอ้างอิง (idle/f_014.png) ที่รู้ความสูงจริงอยู่แล้ว

ตรวจความถูกต้องของวิธีแล้ว: ทำนายชีตท่ากันได้ 586 เทียบค่าที่วัดจากภาพในเกมจริง 585 = คลาด 0%

ข้อจำกัดที่ต้องรู้: ถ้า "ทุกท่า" ในชีตมีมือหรือดาบบังหน้า ตัวเลขจะต่ำกว่าจริงแบบเงียบ ๆ
(ชีตก้มกันชุดแรกคลาด -16% ด้วยเหตุนี้) สคริปต์จึงพิมพ์ค่าของทุกท่าให้ดู ไม่ได้บอกแค่ตัวเลขเดียว
ถ้าค่ากระจายกันมาก แปลว่าหน้าโดนบังบางท่า ให้เชื่อค่าสูงสุด แล้วยืนยันด้วยภาพในเกมเสมอ

และวัด "มวลผม" คู่กันไปอีกทาง เพราะผมไม่โดนมือบัง แต่โดนผมหน้าม้าที่ยาวไม่เท่ากันในแต่ละชุดอาร์ตแทน
ชีตแทงรัวโดนผมหน้าม้าปิดหน้าจนโทนผิวอ่านได้แค่ 80% ของจริง ขณะที่มวลผมอ่านได้ตรงกว่า
สองค่านี้ต่างกันเกิน 15% เมื่อไหร่ แปลว่าอย่างน้อยหนึ่งทางโดนบัง อย่าเชื่อค่าไหนลอย ๆ
ให้ build ออกมาแล้ววัดความสูงเฟรมจริงเทียบท่ายืน: ท่าตั้งหลักควรได้ 96-100% ท่าย่อลึกต่ำกว่านั้น

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


def hair_sqrt(img):
    """รากที่สองของพื้นที่ผม (โทนเกือบดำในช่วงหัว) — อีกทางหนึ่งที่เป็นสัดส่วนตรงกับระยะกล้อง
    ใช้คู่กับ face_sqrt เพราะคนละอย่างโดนบัง: หน้าโดนมือ/ดาบ ส่วนผมโดนผมหน้าม้าที่ยาวไม่เท่ากัน"""
    a = np.asarray(img)
    m = a[:, :, 3] > 110 if a.shape[2] == 4 else np.ones(a.shape[:2], bool)
    rgb = a[:, :, :3].astype(np.float32)
    ys, _ = np.nonzero(m)
    if len(ys) == 0:
        return 0.0
    top, h = ys.min(), ys.max() - ys.min() + 1
    dark = (rgb.max(axis=2) < 95) & m
    band = np.zeros_like(dark)
    band[top:top + int(h * 0.32)] = True
    dark = ndimage.binary_opening(dark & band, np.ones((3, 3)))
    lab, n = ndimage.label(dark)
    if n == 0:
        return 0.0
    return float(np.sqrt(ndimage.sum(dark, lab, range(1, n + 1)).max()))


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
    return int(ys.max() - ys.min() + 1), face_sqrt(rgba), hair_sqrt(rgba)


def main(paths):
    ref_h, ref_face, ref_hair = reference()
    print(f"ท่ายืนอ้างอิง {REF}: สูง {ref_h} px  ใบหน้า {ref_face:.1f}  ผม {ref_hair:.1f}\n")
    for path in paths:
        poses = sheet_poses(path)
        crops = [img.crop((b[0], b[1], b[2] + 1, b[3] + 1)) for img, b, _ in poses]
        faces = [face_sqrt(c) for c in crops]
        hairs = [hair_sqrt(c) for c in crops]
        print(f"{os.path.basename(path)}  ({len(poses)} ท่า)")
        est = {}
        for label, vals, ref in (("ใบหน้า", faces, ref_face), ("ผม", hairs, ref_hair)):
            seen = [v for v in vals if v > 0]
            print(f"   {label}แต่ละท่า: " + " ".join(f"{v:.0f}" for v in vals))
            if not seen:
                print(f"   วัด{label}ไม่ได้สักท่า")
                continue
            est[label] = ref_h * max(seen) / ref
            spread = (max(seen) / min(seen) - 1) * 100
            print(f"   -> จาก{label}: CLIP_STANDING_PX = {est[label]:.0f}  (กระจาย {spread:.0f}%)")
        if not est:
            print("   วัดไม่ได้เลย — ต้องกำหนดเลขเอง\n")
            continue
        if len(est) == 2:
            lo, hi = min(est.values()), max(est.values())
            if hi / lo - 1 > 0.15:
                print(f"   ** สองทางต่างกัน {(hi / lo - 1) * 100:.0f}% — อย่างน้อยหนึ่งทางโดนบัง "
                      f"ต้อง build แล้ววัดความสูงเฟรมจริงเทียบท่ายืน (ท่าตั้งหลักควรได้ 96-100%) **")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(sys.argv[1:])
