"""แยกท่าออกจากชีตของ Alecto

ทำไมต้องมีตัวแยกเฉพาะ ไม่ใช้ cut.py ร่วมกับตัวอื่น — ชีตชุดนี้มีปัญหาที่สองตัวก่อนไม่มีสามอย่าง:

1. ชีต B พื้นหลังเป็น "ลายตาราง" อบมากับ JPG ไม่ใช่ขาวล้วนเหมือนชีตอื่น
   ตัดด้วยระยะห่างจากสีพื้น (แบบ cut.py) ไม่ได้ เพราะพื้นมีสองโทนสลับกัน
   -> แยกด้วย "ความอิ่มสี" แทน: พื้นหลังเป็นเทาล้วน (sat=0) ตัวละครมีสีทุกจุด

2. ห่วงแส้เป็นวงปิด ถ้าใช้ binary_fill_holes จะเหมาพื้นหลังข้างในวงมาเป็นตัวละครด้วย
   (เห็นเป็นลายตารางค้างอยู่กลางห่วงแส้) -> ใช้ "ชิ้นพื้นหลังที่ใหญ่พอ" แทนการอุดรู
   ข้างในห่วงแส้ใหญ่กว่า 3800 px ส่วนไฮไลต์บนเสื้อเล็กกว่านั้นมาก จึงแยกกันได้ชัด

3. บางท่ามีชิ้นส่วนหลุดออกจากตัว: หมวกที่ปลิวตกตอนล้ม (ชีต A ท่า 7)
   และปลายแส้ที่ขาดจากเส้น (ชีต B ท่า 5)
   cut.py เก็บ "ชิ้นใหญ่สุด" ชิ้นเดียวเพื่อตัดเงา/ฝุ่นทิ้ง ซึ่งจะทำให้ของพวกนี้หายไปด้วย
   -> จับชิ้นเข้าช่องตารางตามตำแหน่งแทน ชิ้นที่อยู่ช่องเดียวกันถือเป็นท่าเดียวกัน
"""
from PIL import Image
import numpy as np
from scipy import ndimage

# ชีตไหนวางกี่แถวกี่คอลัมน์
LAYOUT = {"A": (3, 3), "B": (3, 3), "C": (3, 3), "D": (3, 3),
          "E": (2, 3), "F": (2, 3), "G": (2, 3), "H": (2, 3)}


def soft_alpha(rgb, bg_region, soft=34.0):
    """อัลฟาแบบนุ่ม + ถอดสีพื้นออกจากขอบ (defringe)

    ขอบที่ตัวเข้ารหัสภาพเบลอไว้คือสีตัวละครผสมสีพื้นมาแล้ว (observed = a*fg + (1-a)*bg)
    ถ้าตัดเป็น 0/1 ดื้อ ๆ พิกเซลพวกนี้จะเหลือค่าเดิมซึ่งอ่อนไปทางสีพื้น = ขอบขาวเรืองรอบตัว
    บนเวทีมืด แก้ด้วยการให้อัลฟาตามระยะห่างจากสีพื้น แล้วถอดสมการกลับหาสีตัวจริง

    @param bg_region พื้นที่ที่ตัดสินแล้วว่าเป็นพื้นหลัง (รวมรูข้างในห่วงแส้) — บังคับอัลฟา 0
    """
    tone = np.median(rgb[bg_region], axis=0) if bg_region.any() else np.array([255., 255., 255.])
    dist = np.abs(rgb - tone).max(axis=2)
    alpha = np.clip(dist / soft, 0.0, 1.0)
    alpha[bg_region] = 0.0
    a3 = alpha[:, :, None]
    fg = np.where(a3 > 0.02, (rgb - (1 - a3) * tone) / np.maximum(a3, 0.02), rgb)
    return np.clip(fg, 0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)


def extract(path, rows, cols, bg_min=500, part_min=1500):
    """คืน (ภาพ RGBA ที่ตัดพื้นและถอดขอบแล้ว, ลิสต์ของ (mask, จำนวนชิ้นที่รวมกัน))

    bg_min ต้องต่ำพอจะตัด "รูข้างในตัวละคร" ด้วย — รูตรงกลางห่วงแส้ใหญ่ราว 1,400-4,000 px
    ตอนแรกตั้งไว้ 2,000 ซึ่งตัดได้แค่ 2 จาก 26 รู เหลือเป็นปื้นขาวกลางห่วงแส้ทุกท่า
    ขนาดรูจริงกับสัญญาณรบกวนมีช่องว่างชัดเจนที่ 254 -> 708 px จึงตั้ง 500 ได้ปลอดภัย
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    H, W, _ = a.shape
    sat = a.max(axis=2) - a.min(axis=2)
    val = a.max(axis=2)
    flat = (sat <= 8) & (val > 195)
    lab, k = ndimage.label(flat)
    sizes = ndimage.sum(flat, lab, range(1, k + 1))
    bg = np.isin(lab, [i + 1 for i in range(k) if sizes[i] >= bg_min])

    l2, k2 = ndimage.label(~bg)
    s2 = ndimage.sum(~bg, l2, range(1, k2 + 1))
    cells = {}
    for i in range(k2):
        if s2[i] < part_min:
            continue
        m = l2 == (i + 1)
        ys, xs = np.nonzero(m)
        r = min(rows - 1, int(ys.mean() / (H / rows)))
        c = min(cols - 1, int(xs.mean() / (W / cols)))
        cells.setdefault((r, c), []).append(m)

    out = []
    for r in range(rows):
        for c in range(cols):
            ms = cells.get((r, c))
            out.append((np.logical_or.reduce(ms), len(ms)) if ms else None)

    fg, alpha = soft_alpha(a.astype(np.float32), bg)
    return np.dstack([fg, alpha]), out


def body_anchor(m, erode=31):
    """จุดยึดแนวนอนที่ไม่เอนตามแส้

    build script ของตัวอื่นยึด "จุดศูนย์กลางมวลของทุกพิกเซล" ซึ่งใช้ไม่ได้กับตัวนี้:
    แส้ที่สะบัดออกไปทางเดียวลากจุดศูนย์กลางตามไปด้วย ตัวละครจะเลื่อนไปมาระหว่างเฟรม
    วัดได้ว่าท่าที่แย่สุดเพี้ยนไป 55 px (6.4% ของความกว้างเฟรม)

    กัดภาพด้วยจานใหญ่ก่อน — เส้นแส้หนาไม่กี่สิบพิกเซลจะหายไป เหลือแต่ลำตัวที่หนากว่ามาก
    """
    body = ndimage.binary_erosion(m, np.ones((erode, erode)))
    if body.sum() < 500:
        body = ndimage.binary_erosion(m, np.ones((15, 15)))
    if body.sum() < 200:
        body = m
    return float(np.nonzero(body)[1].mean())


def hat_sqrt(a, m):
    """รากที่สองของพื้นที่หมวก — ไม้บรรทัดวัดระยะกล้องของตัวนี้

    วัดความกว้างหัวไม่ได้เพราะหมวกบังกะโหลก · วัดความสูงตัวไม่ได้เพราะแต่ละท่าย่อ/ยืดไม่เท่ากัน
    หมวกเป็นของแข็งขนาดคงที่ จึงเป็นไม้บรรทัดที่เหลืออยู่ที่เชื่อถือได้
    """
    ys, xs = np.nonzero(m)
    top, h = ys.min(), ys.max() - ys.min() + 1
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    hat = (r > 95) & (r < 190) & (g < 75) & (b < 85) & (r - g > 45) & m
    band = np.zeros_like(hat)
    band[top:top + int(h * 0.45)] = True
    hat = ndimage.binary_opening(hat & band, np.ones((5, 5)))
    l, n = ndimage.label(hat)
    return float(np.sqrt(ndimage.sum(hat, l, range(1, n + 1)).max())) if n else 0.0
