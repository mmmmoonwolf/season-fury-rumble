from PIL import Image
import numpy as np
from scipy import ndimage

# ย้ายมาจาก marchv2_cut.py (โมดูลใช้ร่วมข้ามตัวละคร — build script ตัวใหม่ import ได้ตรงๆ
# แทนที่จะก็อปโค้ดซ้ำ) อัลกอริทึม: ตัดพื้นหลังขาวด้วย threshold ความสว่าง แล้วเก็บเฉพาะ
# "ชิ้นใหญ่สุด" ที่เหลือ = ตัวละคร (ตัดเงาบนพื้น/ฝุ่นฟุ้ง/เส้นความเร็วทิ้ง เพราะเป็นชิ้นแยกจากตัว)


def cutout(path, thr=243):
    """
    ตัดพื้นหลังขาว + เก็บเฉพาะ 'ชิ้นใหญ่สุด' = ตัวละคร

    เก็บชิ้นใหญ่สุดชิ้นเดียวเพราะคลิปมีของแถมที่ไม่ต้องการ:
      - เงาบนพื้น (ทำให้ระดับเท้าเพี้ยน ท่ากระโดดเลยดูไม่ลอย)
      - ฝุ่นฟุ้งใต้เท้า / เส้นความเร็ว (ทำให้ความกว้างพุ่งจาก ~350 เป็น ~720)
    ทั้งสองอย่างเป็นชิ้นแยกจากตัว จึงตัดออกได้ด้วยการเก็บชิ้นใหญ่สุด
    """
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    fg = lum < thr
    fg = ndimage.binary_closing(fg, np.ones((3, 3)))
    lab, n = ndimage.label(fg)
    if n:
        sz = ndimage.sum(fg, lab, range(1, n + 1))
        fg = lab == (int(np.argmax(sz)) + 1)
    fg = ndimage.binary_fill_holes(fg)
    alpha = np.clip((thr - lum) * 14, 0, 255) * fg
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA"), fg
