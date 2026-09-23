"""
แยก "ท่า" ออกจากภาพเดียวที่มีหลายท่าเรียงกัน (ไม่ใช่คลิป)

แยกไฟล์ออกจาก build_scramble_nyx.py เพื่อให้เทสต์ import มาใช้ได้โดยไม่ต้องรัน build ทั้งก้อน
(ไฟล์ build เป็นสคริปต์ที่ทำงานตั้งแต่ตอน import — import เมื่อไหร่คือ rebuild atlas ทับทันที)
"""
import numpy as np
from PIL import Image
from scipy import ndimage
from cut import estimate_bg

def sheet_poses(path, min_area=3000):
    """แยกท่าจากภาพเดียวที่มีหลายท่าเรียงกัน (ไม่ใช่คลิป) — คืนลิสต์ (ภาพ, กรอบ, ศูนย์กลางมวล) เรียงซ้ายไปขวา

    บางท่ามาเป็นภาพนิ่งแทนคลิป (เช่น ท่ากระโดดที่ส่งมาเป็นภาพ 5 ท่า) แยกด้วยการหาชิ้นที่ไม่ติดกัน
    เพราะแต่ละท่าวางห่างกันบนพื้นขาว ไม่ต้องกะตำแหน่งตัดเอง
    """
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
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
