"""ตัดเวที Valhalla ออกเป็นเลเยอร์ + ชิ้นแพลตฟอร์ม

อาร์ตมาเป็นสี่ใบ: ภาพประกอบเสร็จ · ใบที่ฟ้าซีด (ไว้ตัดชิ้น) · ท้องฟ้าล้วน · มิดกราวด์
มิดกราวด์ส่งมาเป็น JPG ที่ **อัลฟาถูกอบเป็นลายหมากรุก** ต้องคีย์ออกเอง

ทำไมต้องตัดเป็นชิ้น ไม่ใช้ภาพประกอบเสร็จทั้งใบ:
ตำแหน่งแพลตฟอร์มในเกมผ่าน playtest มาแล้ว ถ้าเอาภาพที่วาดแพลตฟอร์มติดมาด้วยไปแปะ
กรอบชนกับรูปจะไม่ตรงกัน คนเล่นจะเห็นหินตรงหนึ่งแต่ยืนได้อีกตรงหนึ่ง
ตัดเป็นชิ้นแล้ววางตามพิกัดจริงของ sim แทน — รูปกับกรอบชนจึงตรงกันเสมอ

รัน (จากโฟลเดอร์ game):  python3 tools/build_stage_valhalla.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference", "stage_valhalla")
OUT = os.path.join(HERE, "..", "assets", "stage")

# ก้อนที่ตัวแยกหาเจอในใบ pieces.jpg -> ชื่อชิ้น (เรียงตามพื้นที่จากใหญ่ไปเล็ก)
# ไม่ได้ฮาร์ดโค้ดพิกัด แต่ฮาร์ดโค้ด "ลำดับขนาด" ซึ่งคงที่กว่าและตรวจสอบได้จากที่พิมพ์ออกมา
PIECES = ["ground", "plat_c", None, "plat_l", "plat_r"]


def cut_checkerboard(path):
    """ถอดลายหมากรุก (อัลฟาที่ถูกอบลงไปใน JPG) ออกจากเลเยอร์มิดกราวด์

    ลายเป็นเทาล้วนสองค่าสลับกัน (195 กับ 255) ส่วนเนื้อภาพมีสีทั้งหมด
    จึงแยกด้วย "เทาล้วน + ค่าตรงกับสองค่านั้น" ได้สะอาด

    ท้ายสุดต้อง `& ~checker` อีกรอบหลังปิดรู ไม่งั้นช่องหมากรุกสีขาวที่ถูกล้อมด้วยเนื้อภาพ
    จะถูกนับเป็น "รูข้างใน" แล้วโดนถมกลับมาเป็นสี่เหลี่ยมขาวลอยกลางฟ้า (เจอจริงสี่จุด)
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    # เกณฑ์แรกยึดค่าสีตรง ๆ (195/255) แล้วพลาดช่องเล็ก ๆ ที่ติดขอบเนื้อภาพ
    # JPEG เกลี่ยสีช่องพวกนั้นไปเป็น 222-244 เหลือสี่เหลี่ยมขาวลอยกลางฟ้าสี่จุด
    # เกณฑ์ที่ใช้จริงจึงเป็น "เทาล้วนจริง ๆ และสว่าง" ซึ่งเนื้อภาพชั้นนี้ไม่มีเลย
    # (บ้านเป็นไม้อมเหลือง r>b · หินเป็นเทาอมฟ้า b>r · หญ้าเขียว — ไม่มีอะไรเป็นเทากลางสว่าง)
    grey = (np.abs(r - g) < 6) & (np.abs(g - b) < 6) & (np.abs(r - b) < 6)
    checker = grey & (r > 185)

    solid = ndimage.binary_closing(ndimage.binary_opening(~checker, np.ones((5, 5))), np.ones((9, 9)))
    solid = ndimage.binary_fill_holes(solid)
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 3000]) & ~checker

    alpha = np.clip(ndimage.gaussian_filter(keep.astype(float), 1.2), 0, 1)
    print(f"มิดกราวด์: ลายหมากรุก {100*checker.mean():.0f}% · เหลือเนื้อภาพ {100*keep.mean():.0f}%")
    return Image.fromarray(np.dstack([a, alpha * 255]).astype("uint8"), "RGBA")


def surface_row(m):
    """แถวที่เป็น 'ผิวบนของหิน' — ข้ามเสาหินรูนที่สูงกว่าตัวแพลตฟอร์ม

    ยึดแถวแรกที่กว้างถึง 45% ของความกว้างทั้งชิ้น เสารูนสองข้างรวมกันยังไม่ถึงเกณฑ์นั้น
    ถ้ายึดแถวบนสุดเฉย ๆ เส้นยืนจะไปอยู่ที่ยอดเสา = ตัวละครลอยเหนือหินอยู่หลายสิบพิกเซล
    """
    w = np.count_nonzero(m, axis=1)
    need = w.max() * 0.45
    return int(np.nonzero(w >= need)[0][0])


def ground_surface(rgba):
    """เส้นยืนของพื้นล่าง — ยึด "ทางดินสีเหลือง" ไม่ใช่แถวบนสุดที่กว้างพอ

    พื้นล่างวาดเป็นมุมเฉียง: สันหินด้านหลังสูงกว่าทางเดินด้านหน้าอยู่ราว 40 px
    surface_row() จะไปเจอสันหินหลังก่อน แล้วตัวละครจะลอยเหนือพื้นที่เห็นว่ายืนอยู่
    ทางดินเป็นแถบสีเหลืองอมส้มกว้างที่สุดในภาพ หาได้ตรง ๆ จากสี
    """
    a = np.asarray(rgba).astype(int)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    path = (al > 200) & (r > 140) & (r - b > 45) & (r >= g) & (g - b > 18)
    w = np.count_nonzero(path, axis=1)
    return int(np.nonzero(w >= w.max() * 0.4)[0][0])


def cut_pieces(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    r, b, mx = a[:, :, 0], a[:, :, 2], a.max(2)
    sky = (mx > 205) & (b >= r - 4)           # ฟ้าในใบนี้ซีดมากและออกฟ้าเสมอ
    solid = ndimage.binary_closing(ndimage.binary_opening(~sky, np.ones((4, 4))), np.ones((11, 11)))
    solid = ndimage.binary_fill_holes(solid)
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1]

    out = {}
    for rank, name in enumerate(PIECES):
        idx = int(order[rank]) + 1
        m = lab == idx
        ys, xs = np.nonzero(m)
        if name is None:
            print(f"  ข้าม #{rank}: x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()} (เกาะบ้านลอย ไม่ใช่แพลตฟอร์ม)")
            continue
        rgba = np.dstack([a, ndimage.gaussian_filter(m.astype(float), 1.0) * 255]).astype("uint8")
        crop = Image.fromarray(rgba, "RGBA").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        surf = (ground_surface(crop) if name == "ground"
                else surface_row(m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
        out[name] = (crop, surf)
        print(f"  {name:7s} {crop.width:5d}x{crop.height:4d} · ผิวบนอยู่แถวที่ {surf}")
    return out


os.makedirs(OUT, exist_ok=True)

sky = Image.open(os.path.join(REF, "sky.jpg")).convert("RGB")
sky = sky.resize((1920, round(1920 * sky.height / sky.width)), Image.LANCZOS)
sky.save(os.path.join(OUT, "sky.jpg"), quality=84, optimize=True)
print(f"ท้องฟ้า: {sky.size}")

mid = cut_checkerboard(os.path.join(REF, "mid.jpg"))
mid = mid.resize((1920, round(1920 * mid.height / mid.width)), Image.LANCZOS)
mid.save(os.path.join(OUT, "mid.png"), optimize=True)
print(f"มิดกราวด์: {mid.size}")

print("ชิ้นแพลตฟอร์ม:")
meta = {}
for name, (im, surf) in cut_pieces(os.path.join(REF, "pieces.jpg")).items():
    scale = min(1.0, 1100 / im.width)         # ไม่ต้องเก็บใหญ่กว่าที่จะวาดจริง
    if scale < 1.0:
        surf = round(surf * scale)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(os.path.join(OUT, f"{name}.png"), optimize=True)
    meta[name] = {"w": im.width, "h": im.height, "surface": surf}

json.dump(meta, open(os.path.join(OUT, "stage.json"), "w"), indent=1)
print("เขียนแล้ว:", ", ".join(sorted(meta)))
