"""แยกท่าออกจากชีตของ Orpheus

ทำไมต้องมีตัวแยกเฉพาะอีกตัว ทั้งที่การตัดพื้นหลังใช้ของ Atlas ได้:
**ชีตชุดนี้เจนมาเป็นตารางไม่สม่ำเสมอ** — ใบเดียวกันมีแถวละ 4 บ้าง 3 บ้าง
ตัวแยกของ Alecto กับ Atlas ต้องบอกก่อนว่ากี่แถวกี่คอลัมน์ แล้วหารช่องเอา
พอตารางไม่สม่ำเสมอ ท่าจะถูกจับเข้าช่องผิดทั้งใบ

วิธีที่ใช้แทน: **ไม่ต้องรู้ตารางเลย** จับก้อนที่ใหญ่พอมาเรียงตามตำแหน่งจริง
- จัดเป็นแถวโดยดูว่าจุดกึ่งกลางแนวตั้งห่างกันเกินครึ่งหนึ่งของความสูงท่าหรือยัง
- แล้วเรียงซ้ายไปขวาในแต่ละแถว
รองรับทั้งตารางสวยและตารางเบี้ยว ใช้กับชีตของตัวอื่นก็ได้
"""
import numpy as np
from PIL import Image
from scipy import ndimage

from atlas_sheets import background, body_anchor, soft_alpha, trim_ground_debris

MIN_PX = 4000      # เล็กกว่านี้คือสัญญาณรบกวน ไม่ใช่ท่า
ROW_GAP = 0.55     # จุดกึ่งกลางห่างเกินเท่านี้ของความสูงท่า = ขึ้นแถวใหม่


def split(path, min_px=MIN_PX):
    """คืน (ภาพ RGBA ที่ตัดพื้นแล้ว, ลิสต์ของมาสก์เรียงตามลำดับอ่าน)"""
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    bg = background(a)
    lab, k = ndimage.label(~bg)
    sizes = ndimage.sum(~bg, lab, range(1, k + 1))

    items = []
    for i in range(k):
        if sizes[i] < min_px:
            continue
        m = trim_ground_debris(lab == i + 1)
        ys, xs = np.nonzero(m)
        items.append({"m": m, "cy": float(ys.mean()), "cx": float(xs.mean()),
                      "h": int(ys.max() - ys.min() + 1)})
    if not items:
        return None, []

    items.sort(key=lambda d: d["cy"])
    rows, cur = [], [items[0]]
    for it in items[1:]:
        if abs(it["cy"] - cur[-1]["cy"]) < cur[-1]["h"] * ROW_GAP:
            cur.append(it)
        else:
            rows.append(cur)
            cur = [it]
    rows.append(cur)

    out = []
    for r in rows:
        r.sort(key=lambda d: d["cx"])
        out.extend(d["m"] for d in r)

    fg, al = soft_alpha(a.astype(np.float32), bg)
    return np.dstack([fg, al]).astype(np.uint8), out


def solo(path, min_px=20000):
    """ภาพเดี่ยวหนึ่งท่า — เก็บชิ้นใหญ่สุดชิ้นเดียว

    ภาพท่าบล็อกที่เจนมามีรอยเบลอสีเทาเป็นฉากหลังติดมาด้วยสองก้อน
    (102,508 และ 30,971 px ความสว่าง 183/196) ส่วนตัวละครอยู่ที่ 799,699 px
    ความสว่าง 73 — ห่างกันมากพอจะเก็บแค่ชิ้นใหญ่สุด
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    bg = background(a)
    lab, k = ndimage.label(~bg)
    sizes = ndimage.sum(~bg, lab, range(1, k + 1))
    m = trim_ground_debris(lab == (1 + int(np.argmax(sizes))))
    fg, al = soft_alpha(a.astype(np.float32), bg)
    return np.dstack([fg, np.where(m, al, 0)]).astype(np.uint8), m


def body_scale(rgba, m):
    """ไม้บรรทัดวัดระยะกล้อง = รากที่สองของพื้นที่ตัว (ไม่นับกีตาร์)

    กีตาร์เป็นสีน้ำตาลส้มอิ่มสี แยกจากสูทเทา เสื้อดำ กางเกงเขียว และรองเท้าขาวได้
    ต้องหักออกเพราะกีตาร์ในแต่ละท่าหันคนละมุม พื้นที่ที่เห็นเลยไม่เท่ากัน
    """
    r, g, b = (rgba[:, :, i].astype(int) for i in range(3))
    guitar = (r > 120) & ((r - b) > 45) & ((r - g) > 18)
    return float(np.sqrt(np.count_nonzero(m & ~guitar)))
