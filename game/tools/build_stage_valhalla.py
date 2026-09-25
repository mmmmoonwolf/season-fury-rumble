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
PIECES = ["ground", "plat_c", None, "plat_l", "plat_r", "plat_top"]


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


def topsoil_row(rgba):
    """เส้นยืนของแพลตฟอร์มลอย — ยึด "แถบหญ้ากับดิน" ไม่ใช่ยอดหินด้านหลัง

    surface_row() ที่ยึดความกว้างไปเจอสันหินด้านหลังซึ่งสูงกว่าแถบหญ้าราว 40 px
    เล่นจริงแล้วตัวละครลอยเหนือหินที่เห็นว่ายืนอยู่ชัดเจน (ผู้เล่นรายงานเอง)
    แถบหญ้าเป็นเขียวอมเหลืองกับดินสีแทน หาได้ตรง ๆ จากสี

    วัดได้: plat_c 58 -> 99 · plat_l 73 -> 96 · plat_r 22 -> 66
    """
    a = np.asarray(rgba).astype(int)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    grass = (al > 150) & (g > r + 6) & (g > b + 22) & (g > 85)
    dirt = (al > 150) & (r > 140) & (r - b > 45) & (r >= g) & (g - b > 18)
    w = np.count_nonzero(grass | dirt, axis=1)
    return int(np.nonzero(w >= w.max() * 0.35)[0][0])


def ground_surface(rgba):
    """เส้นยืนของพื้นล่าง — ยึด "ทางดินสีเหลือง" ไม่ใช่แถวบนสุดที่กว้างพอ

    พื้นล่างวาดเป็นมุมเฉียง: สันหินด้านหลังสูงกว่าทางเดินด้านหน้าอยู่ราว 130 px

    ต่างจากแพลตฟอร์มลอยตรงที่ **ห้ามนับหญ้า** — หญ้าของพื้นล่างอยู่บนสันหินหลัง
    ไม่ใช่บนทางเดินหน้า นับหญ้าด้วยแล้วเส้นจะเด้งขึ้นไปที่สันหลังทันที
    (วัดบนไฟล์ที่ย่อแล้ว: ทางดินหน้า 88 · หญ้าบนสันหลัง 76)
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
            print(f"  ข้าม #{rank}: x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}"
                  " (ชั้นกลางติดกับเกาะบ้านลอยเป็นก้อนเดียว แยกไม่ขาด — ยืมรูป plat_top ไปใช้แทน)")
            continue
        rgba = np.dstack([a, ndimage.gaussian_filter(m.astype(float), 1.0) * 255]).astype("uint8")
        crop = Image.fromarray(rgba, "RGBA").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        surf = ground_surface(crop) if name == "ground" else topsoil_row(crop)
        out[name] = (crop, surf)
        print(f"  {name:7s} {crop.width:5d}x{crop.height:4d} · ผิวบนอยู่แถวที่ {surf}")
    return out


os.makedirs(OUT, exist_ok=True)

sky = Image.open(os.path.join(REF, "sky.jpg")).convert("RGB")
sky = sky.resize((1920, round(1920 * sky.height / sky.width)), Image.LANCZOS)
sky.save(os.path.join(OUT, "sky.jpg"), quality=84, optimize=True)
print(f"ท้องฟ้า: {sky.size}")

# มิดกราวด์ต้องแยกเป็นสองชั้น ไม่ใช่ชั้นเดียว
#
# หน้าผาสองข้างอยู่ "ใกล้" กว่าเกาะบ้านลอยมาก อยู่ชั้นเดียวกันแล้วมันเลื่อนเท่ากัน
# ซึ่งอ่านเป็นฉากแบนไถล ไม่ใช่ความลึก — ความลึกเกิดจากของใกล้ขยับเยอะกว่าของไกล
#
# แยกด้วยขนาดก้อน: หน้าผาต่อกันเป็นก้อนเดียวยาวเต็มภาพ (678k px)
# ส่วนเกาะบ้านกับเกาะเล็ก ๆ เป็นก้อนแยกที่เล็กกว่าสิบเท่า
mid = cut_checkerboard(os.path.join(REF, "mid.jpg"))
mid = mid.resize((1920, round(1920 * mid.height / mid.width)), Image.LANCZOS)
ma = np.asarray(mid).copy()
lab, n = ndimage.label(ma[:, :, 3] > 120)
sizes = ndimage.sum(ma[:, :, 3] > 120, lab, range(1, n + 1))
cliff = lab == int(np.argmax(sizes)) + 1
for name, keep in [("near", cliff), ("far", ~cliff)]:
    out = ma.copy()
    out[:, :, 3] = np.where(keep, ma[:, :, 3], 0)
    # ล้างสีใต้พิกเซลโปร่งให้เป็นศูนย์ด้วย ไม่งั้น PNG ยังเก็บสีที่มองไม่เห็นไว้เต็ม ๆ
    # (ไม่ล้าง: ไฟล์ละ 1.0 MB · ล้างแล้ว: เหลือหลักแสน) แต่ละชั้นใช้ภาพแค่ส่วนของตัวเอง
    out[:, :, :3] = np.where(out[:, :, 3:4] > 0, out[:, :, :3], 0)
    Image.fromarray(out, "RGBA").save(os.path.join(OUT, f"{name}.png"), optimize=True)
    print(f"  {name}: {int(np.count_nonzero(keep & (ma[:, :, 3] > 120)))} px ทึบ")
# mid.png ไม่ได้ใช้แล้ว ลบทิ้งไม่ให้ติดไปกับเกม
if os.path.exists(os.path.join(OUT, "mid.png")):
    os.remove(os.path.join(OUT, "mid.png"))
print(f"มิดกราวด์แยกเป็นสองชั้น: {mid.size}")

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
