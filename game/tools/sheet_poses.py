"""
แยก "ท่า" ออกจากภาพเดียวที่มีหลายท่าเรียงกัน (ไม่ใช่คลิป)

แยกไฟล์ออกจาก build_scramble_nyx.py เพื่อให้เทสต์ import มาใช้ได้โดยไม่ต้องรัน build ทั้งก้อน
(ไฟล์ build เป็นสคริปต์ที่ทำงานตั้งแต่ตอน import — import เมื่อไหร่คือ rebuild atlas ทับทันที)
"""
import numpy as np
from PIL import Image
from scipy import ndimage
from cut import estimate_bg


def flatten_checkerboard(rgb):
    """แทนพื้นหลัง "ลายตารางโปร่งใส" ที่ถูก flatten เป็นพิกเซลจริง ด้วยพื้นขาวเรียบ

    เครื่องมือหลายตัวเซฟ PNG โปร่งใสเป็น JPG แล้วลายตารางที่เอาไว้แสดงความโปร่งใสกลายเป็น
    พิกเซลเทาสองระดับจริง ๆ ซึ่ง estimate_bg() ใน cut.py รับไม่ได้ (มันคิดว่าพื้นหลังสีเดียว)
    ผลคือลายตารางถูกนับเป็นตัวละคร ตัดพื้นออกมาแล้วได้กรอบเทาติดมาเต็มไปหมด

    ตรวจจากสองเงื่อนไขพร้อมกัน ไม่ใช่แค่ "เป็นสีเทา":
      1) เป็นเทากลางจริง (ช่องสีต่างกันไม่เกิน 12) — ชุดของ Nyx เป็นเทาอมน้ำเงินจึงไม่โดน
      2) เกาะกลุ่มกับขอบภาพ — กันลายตารางที่บังเอิญมีสีตรงกับบางจุดบนตัวละคร
    ไม่เข้าเงื่อนไข = คืนภาพเดิมไม่แตะ ภาพพื้นขาวปกติจึงไม่ได้รับผลกระทบ
    """
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    neutral = (mx - mn) <= 12
    if neutral.mean() < 0.4:
        return rgb                      # พื้นหลังมีสี = ไม่ใช่ลายตาราง
    level = rgb.mean(axis=2)
    hist, edges = np.histogram(level[neutral], bins=64, range=(0, 256))
    order = np.argsort(-hist)
    tones = [float((edges[i] + edges[i + 1]) / 2) for i in order[:2]]
    # ลายตารางคือ "เทาสองระดับที่ใกล้กัน และสว่างทั้งคู่" — ต่างกันมากไปหรือมีตัวมืดปน
    # แปลว่าโทนที่สองคือตัวละคร ไม่ใช่พื้นหลัง (ภาพพื้นขาวจะได้โทน 248 กับ 20 ซึ่งเข้าข่ายนี้)
    # ไม่มีข้อนี้ ภาพพื้นขาวธรรมดาจะถูกทาทับจนไม่เหลือตัวละครเลย
    if len(tones) < 2 or not (20 <= abs(tones[0] - tones[1]) <= 80):
        return rgb
    if min(tones) < 50:
        return rgb                      # โทนหนึ่งมืด = เป็นตัวละคร ไม่ใช่ลายตาราง
    band = np.zeros_like(neutral)
    for t in tones:
        band |= np.abs(level - t) <= 22
    band &= neutral
    lab, _ = ndimage.label(band)
    touching = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    if not touching:
        return rgb
    bg = ndimage.binary_closing(np.isin(lab, list(touching)), np.ones((5, 5)))
    if not 0.3 <= bg.mean() <= 0.97:
        return rgb                      # เจอนิดเดียว หรือกินทั้งภาพจนไม่เหลือตัวละคร = อ่านผิด
    out = rgb.copy()
    out[bg] = 248.0                     # ตรงกับพื้นขาวที่ cut.py คาดไว้
    return out


def sheet_poses(path, min_area=3000):
    """แยกท่าจากภาพเดียวที่มีหลายท่าเรียงกัน (ไม่ใช่คลิป) — คืนลิสต์ (ภาพ, กรอบ, ศูนย์กลางมวล) เรียงซ้ายไปขวา

    บางท่ามาเป็นภาพนิ่งแทนคลิป (เช่น ท่ากระโดดที่ส่งมาเป็นภาพ 5 ท่า) แยกด้วยการหาชิ้นที่ไม่ติดกัน
    เพราะแต่ละท่าวางห่างกันบนพื้นขาว ไม่ต้องกะตำแหน่งตัดเอง
    """
    rgb = flatten_checkerboard(np.asarray(Image.open(path).convert("RGB")).astype(np.float32))
    bg = estimate_bg(rgb)
    dist = np.abs(rgb - bg).max(axis=2)
    solid = ndimage.binary_fill_holes(ndimage.binary_closing(dist > 18, np.ones((5, 5))))
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    ids = [i + 1 for i, a in enumerate(sizes) if a >= min_area]
    # เรียง "ตามลำดับที่คนอ่าน" = บนลงล่าง ซ้ายไปขวา
    #
    # เดิมเรียงตามแกน x อย่างเดียว ซึ่งถูกเฉพาะภาพแถวเดียว (jump_sheet/down_sheet ที่มีอยู่เป็นแบบนั้น)
    # พอเป็นภาพสองแถว การเรียงตาม x ล้วนจะสลับแถวบน-ล่างสับกัน (ท่า 1, 6, 2, 7, 3, 8, ...)
    # แล้วเลขท่าใน SEQ จะชี้ผิดตัวทั้งหมดโดยไม่มี error ให้เห็น — เห็นแค่ท่าเล่นแล้วมั่ว
    # แบ่งแถวด้วยระยะห่างของ "กึ่งกลางตัว" แนวตั้ง: ห่างกันเกินครึ่งหนึ่งของความสูงท่าทั่วไป = คนละแถว
    # (ใช้ค่ากลางของความสูง ไม่ใช่ค่าคงที่ ภาพจะถ่ายมาสเกลไหนก็ใช้ได้)
    def _bounds(i):
        ys, xs = np.nonzero(lab == i)
        return float(ys.min() + ys.max()) / 2, float(xs.mean()), int(ys.max() - ys.min() + 1)

    metrics = {i: _bounds(i) for i in ids}
    row_gap = float(np.median([m[2] for m in metrics.values()])) * 0.6
    by_y = sorted(ids, key=lambda i: metrics[i][0])
    rows, row = [], [by_y[0]]
    for prev, cur in zip(by_y, by_y[1:]):
        if metrics[cur][0] - metrics[prev][0] > row_gap:
            rows.append(row); row = []
        row.append(cur)
    rows.append(row)
    ids = [i for r in rows for i in sorted(r, key=lambda i: metrics[i][1])]

    out = []
    for i in ids:
        m = lab == i
        ys, xs = np.nonzero(m)
        box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
        # alpha ไล่ขอบเหมือน cutout ปกติ แต่จำกัดเฉพาะชิ้นนี้ ไม่ให้ท่าข้าง ๆ ติดมา
        a = np.clip(dist / 40.0, 0, 1) * ndimage.binary_dilation(m, np.ones((3, 3)), iterations=2)
        fg = np.clip((rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3), 0, 255)
        img = Image.fromarray(np.dstack([fg, a * 255]).astype(np.uint8), "RGBA")
        out.append((img.crop((0, 0, img.width, img.height)), box, float(xs.mean())))
    return out
