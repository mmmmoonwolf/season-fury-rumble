"""แยกท่าออกจากชีตของ Atlas

ทำไมต้องมีตัวแยกเฉพาะอีกตัว ไม่ใช้ของ Alecto — ตัวนี้มีปัญหาที่ตรงข้ามกันเลย:

Alecto แยกพื้นหลังด้วย "ความอิ่มสี" (พื้นเป็นเทาล้วน ตัวละครมีสีทุกจุด)
แต่ Atlas เป็น **เสือขาวบนพื้นขาว** — ขนกับพื้นไม่มีสีทั้งคู่
วัดจริงจากชีต A: พิกเซลที่ "ขาวและไม่มีสี" กินพื้นที่ 79.4% ของภาพ
คือเหมาขนเสือมาเป็นพื้นหลังหมด วิธีของ Alecto ใช้ไม่ได้เลยกับตัวนี้

สิ่งที่แยกสองอย่างนี้ออกจากกันจริง ๆ มีสองอย่าง:

1. **เส้นขอบดำหนา** ล้อมตัวละครไว้ทุกด้าน
   พื้นหลังข้างนอกจึงต่อถึงขอบภาพได้ แต่ขนขาวข้างในต่อไม่ถึง
   -> พื้นหลัง = ชิ้นขาวที่ "แตะขอบภาพ" เท่านั้น ที่เหลือคือตัวละคร
   ข้อดีคือรูข้างในตัว (ลายขน ไฮไลต์) ถูกนับเป็นตัวละครอัตโนมัติ ไม่ต้องอุดรูเอง

2. **ความสว่าง** พื้นหลังเป็นขาวสนิท ส่วนขนขาวมีเงาอ่อน ๆ เป็นสีครีม
   วัดจริง: พื้นหลัง min-channel เฉลี่ย 254.1 · ช่องปิดล้อมทุกช่องเฉลี่ย 228-234
   และมีพิกเซล >=252 ไม่ถึง 1% ช่องว่างนี้กว้างมาก แยกได้ชัดเจน
   -> ช่องพื้นหลังที่ "ติดอยู่ข้างใน" (เช่น ซอกใต้แขน ช่องกลางเปลวไฟ)
      คือช่องปิดล้อมที่สว่างเฉลี่ย >= BG_MEAN เท่านั้น ซึ่งมีแค่ 1-5 ช่องต่อชีต
      ถ้าใช้ "ขนาด" ตัดสินแบบ Alecto จะเจาะรูผิด 900-2,200 ช่องต่อชีต
"""
from PIL import Image
import numpy as np
from scipy import ndimage

# ชีตไหนวางกี่แถวกี่คอลัมน์
LAYOUT = {"A": (3, 3), "B": (3, 3), "C": (3, 3), "D": (3, 3),
          "E": (2, 3), "F": (2, 3), "G": (2, 3)}

NEAR_WHITE = 205   # ต่ำกว่านี้ถือว่าเป็นเส้นขอบ/สีจริง ไม่ใช่ขาว
BG_MEAN = 249      # ช่องปิดล้อมที่สว่างเฉลี่ยถึงเท่านี้ = พื้นหลังที่ติดอยู่ข้างใน
BG_HOLE_MIN = 150  # เล็กกว่านี้ไม่เจาะ กันสัญญาณรบกวนจาก JPEG


def soft_alpha(rgb, bg_region, soft=34.0):
    """อัลฟาแบบนุ่ม + ถอดสีพื้นออกจากขอบ (defringe) — เหมือนของ Alecto

    ขอบที่ตัวเข้ารหัสภาพเบลอไว้คือสีตัวละครผสมสีพื้นมาแล้ว (observed = a*fg + (1-a)*bg)
    ถ้าตัดเป็น 0/1 ดื้อ ๆ จะเหลือขอบขาวเรืองรอบตัวเวลาอยู่บนเวทีมืด
    """
    tone = np.median(rgb[bg_region], axis=0) if bg_region.any() else np.array([255., 255., 255.])
    dist = np.abs(rgb - tone).max(axis=2)
    alpha = np.clip(dist / soft, 0.0, 1.0)
    alpha[bg_region] = 0.0
    a3 = alpha[:, :, None]
    fg = np.where(a3 > 0.02, (rgb - (1 - a3) * tone) / np.maximum(a3, 0.02), rgb)
    return np.clip(fg, 0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)


def background(a):
    """คืนมาสก์พื้นหลัง = ขาวที่แตะขอบภาพ + ช่องขาวสว่างที่ติดอยู่ข้างใน"""
    mn = a.min(axis=2)
    nw = mn > NEAR_WHITE
    lab, k = ndimage.label(nw)
    edge = set(lab[0].tolist()) | set(lab[-1].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    edge.discard(0)

    means = ndimage.mean(mn, lab, range(1, k + 1))
    sizes = ndimage.sum(nw, lab, range(1, k + 1))
    inner = [i for i in range(1, k + 1)
             if i not in edge and means[i - 1] >= BG_MEAN and sizes[i - 1] >= BG_HOLE_MIN]
    return np.isin(lab, list(edge) + inner)


def extract(path, rows, cols, part_min=1500):
    """คืน (ภาพ RGBA ที่ตัดพื้นและถอดขอบแล้ว, ลิสต์ของ (mask, จำนวนชิ้นที่รวมกัน))

    จับชิ้นเข้าช่องตารางตามตำแหน่ง ไม่ใช่เก็บชิ้นใหญ่สุดชิ้นเดียว
    เพราะบางท่ามีของหลุดจากตัว (ดาบที่ตกอยู่ข้าง ๆ ตอนล้ม ชีต A ท่า 7)
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    H, W, _ = a.shape
    bg = background(a)

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
    """จุดยึดแนวนอนที่ไม่เอนตามหางกับเปลวไฟ

    ปัญหาเดียวกับแส้ของ Alecto: ของที่ยื่นออกไปทางเดียวลากจุดศูนย์กลางมวลตามไปด้วย
    กัดภาพด้วยจานใหญ่ก่อน — หางกับใบดาบหนาไม่กี่สิบพิกเซลจะหายไป เหลือแต่ลำตัว
    """
    body = ndimage.binary_erosion(m, np.ones((erode, erode)))
    if body.sum() < 500:
        body = ndimage.binary_erosion(m, np.ones((15, 15)))
    if body.sum() < 200:
        body = m
    return float(np.nonzero(body)[1].mean())


def head_width(m):
    """ความกว้างหัว — ไม้บรรทัดวัดระยะกล้องของตัวนี้

    ต่างจาก Alecto ตรงที่ Atlas ไม่ใส่หมวก กะโหลกจึงไม่ถูกบัง
    ใช้ไม้บรรทัดดั้งเดิมแบบ Nyx/Helios ได้ตรง ๆ
    """
    ys, xs = np.nonzero(m)
    h = ys.max() - ys.min() + 1
    band = m[ys.min():ys.min() + max(1, int(h * 0.18))]
    w = [np.count_nonzero(r) for r in band if r.any()]
    return max(w) if w else 0


def strip_ground_fx(rgba, m, band_frac=0.84, fill_min=800, keep_min=3000):
    """ลบฝุ่นกระเด็นที่ถูกวาดอบมากับภาพออกจากท่า

    prompt สั่งชัดว่า "no dust, no impact effects" แต่ชีต E ท่า 2 เจนฝุ่นมาใต้รองเท้าอยู่ดี
    ปล่อยไว้ไม่ได้เพราะเกมวาดฝุ่นของตัวเองตอนแตะพื้น ส่วนฝุ่นที่อบมาจะติดไปกับตัว
    ลอยตามขึ้นไปกลางอากาศด้วย

    ฝุ่นเป็นสีแทนอ่อนอยู่แถบล่างสุดของท่า แยกจากขนขาวกับหนังน้ำตาลได้ด้วยสี
    แต่ลบแค่เนื้อสีไม่พอ **เส้นขอบดำของฝุ่นจะค้างเป็นหนามอยู่** จึงต้องโตตามเส้นขอบต่อ
    โดยห้ามข้ามไปโดนขนขาวหรือหนัง (เงื่อนไข dark|tan กันไว้) แล้วเก็บเศษเส้นที่ขาดลอยทิ้ง
    """
    ys, _ = np.nonzero(m)
    y0, y1 = ys.min(), ys.max()
    h = y1 - y0 + 1
    band = np.zeros_like(m)
    band[y0 + int(h * band_frac):y1 + 1] = True

    r, g, b = (rgba[:, :, i].astype(int) for i in range(3))
    tan = (m & band & (r > 195) & (r < 245) & (g > 175) & (g < 225)
           & (b > 130) & (b < 190) & ((r - b) > 45))
    lab, k = ndimage.label(tan)
    if not k:
        return m
    sizes = ndimage.sum(tan, lab, range(1, k + 1))
    seed = np.isin(lab, [i + 1 for i in range(k) if sizes[i] >= fill_min])
    if not seed.any():
        return m

    dark = np.maximum(np.maximum(r, g), b) < 135
    grow = seed
    for _ in range(12):
        nxt = ndimage.binary_dilation(grow, np.ones((3, 3))) & m & band & (dark | tan)
        if nxt.sum() == grow.sum():
            break
        grow = nxt

    clean = m & ~grow
    l2, k2 = ndimage.label(clean)
    s2 = ndimage.sum(clean, l2, range(1, k2 + 1))
    return np.isin(l2, [i + 1 for i in range(k2) if s2[i] >= keep_min])


def body_scale(rgba, m):
    """ไม้บรรทัดวัดระยะกล้องของตัวนี้ = รากที่สองของพื้นที่ตัว (ไม่นับเปลวไฟ)

    ทำไมไม่ใช้ความกว้างหัวเหมือน Nyx/Helios ทั้งที่ตัวนี้ไม่ใส่หมวก:
    วัดจริงจากชีต A ความกว้างหัวกระจาย 125-377 px ในชีตเดียวกัน
    เพราะแถบ "บนสุด 18%" ไปโดนดาบที่ชูขึ้นบ้าง โดนสะโพกในท่านอนบ้าง มัธยฐานเลยเชื่อไม่ได้

    พื้นที่ตัวนิ่งกว่ามาก — แขนขาพับเก็บแต่เนื้อที่รวมเท่าเดิม
    วัดจริงกระจายแค่ ±3.3-6.6% ในชีตเดียวกัน ใช้เทียบข้ามชีตได้จริง
    ต้องหักเปลวไฟออกก่อนเพราะขนาดไฟแต่ละท่าไม่เท่ากันเลย
    """
    r, g, b = (rgba[:, :, i].astype(int) for i in range(3))
    fire = (r > 190) & ((r - b) > 70) & ((g - b) > 25)
    return float(np.sqrt(np.count_nonzero(m & ~fire)))
