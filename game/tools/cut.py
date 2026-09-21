from PIL import Image
import numpy as np
from scipy import ndimage

# ย้ายมาจาก marchv2_cut.py (โมดูลใช้ร่วมข้ามตัวละคร — build script ตัวใหม่ import ได้ตรงๆ
# แทนที่จะก็อปโค้ดซ้ำ) อัลกอริทึม: ตัดพื้นหลังออกด้วยระยะห่างจากสีพื้น แล้วเก็บเฉพาะ
# "ชิ้นใหญ่สุด" ที่เหลือ = ตัวละคร (ตัดเงาบนพื้น/ฝุ่นฟุ้ง/เส้นความเร็วทิ้ง เพราะเป็นชิ้นแยกจากตัว)


def estimate_bg(rgb):
    """
    วัดสีพื้นหลังจากมุมภาพทั้งสี่ (median = ทนต่อมุมที่บังเอิญมีตัวละครโผล่เข้ามา)

    ทำไมต้องวัด ไม่ fix 255: พื้นหลังในคลิปที่ render มาไม่ใช่ขาวสนิท วัดจริงได้ 244-248
    และต่างกันในแต่ละคลิป ถ้าไป de-fringe โดยสมมติว่าพื้นเป็น 255 จะถอดสีขาวออกไม่หมด
    เหลือเป็น "ขอบเรืองแสงขาว" รอบตัวละครตอนวางบนแมพมืด
    """
    h, w, _ = rgb.shape
    m = max(8, min(h, w) // 20)
    corners = np.concatenate([
        rgb[:m, :m].reshape(-1, 3), rgb[:m, -m:].reshape(-1, 3),
        rgb[-m:, :m].reshape(-1, 3), rgb[-m:, -m:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def cutout(path, soft=40.0, tol=8.0, defringe=True, bg=None):
    """
    ตัดพื้นหลัง + เก็บเฉพาะ 'ชิ้นใหญ่สุด' = ตัวละคร

    เก็บชิ้นใหญ่สุดชิ้นเดียวเพราะคลิปมีของแถมที่ไม่ต้องการ:
      - เงาบนพื้น (ทำให้ระดับเท้าเพี้ยน ท่ากระโดดเลยดูไม่ลอย)
      - ฝุ่นฟุ้งใต้เท้า / เส้นความเร็ว (ทำให้ความกว้างพุ่งจาก ~350 เป็น ~720)
    ทั้งสองอย่างเป็นชิ้นแยกจากตัว จึงตัดออกได้ด้วยการเก็บชิ้นใหญ่สุด

    alpha มาจาก "ระยะห่างจากสีพื้น" ต่อพิกเซล (max ของทั้งสามแชนเนล) ไม่ใช่ความสว่าง
    เพราะตัดสินจากความสว่างอย่างเดียวจะกินส่วนที่สว่างพอ ๆ กับพื้น (รองเท้า/ผิว) หายไปด้วย

    @param soft ระยะห่างที่ถือว่าทึบเต็ม 100% — ต่ำไปขอบจะแข็งเป็นรอยหยัก สูงไปขอบจะฟุ้ง
    @param tol  ระยะห่างที่ถือว่า "ไม่ใช่พื้นแน่ ๆ" ใช้หารูปทรงก่อนค่อยไล่ alpha (กันสัญญาณรบกวนในพื้น)
    @param defringe ถอดสีพื้นออกจากพิกเซลขอบที่กึ่งโปร่งใส
      พิกเซลขอบที่ตัวเข้ารหัสเบลอไว้ = สีตัวละครผสมสีพื้นมาแล้ว (observed = a*fg + (1-a)*bg)
      แก้ด้วยการถอดสมการกลับ: fg = (observed - (1-a)*bg) / a  -> ได้สีตัวจริงคืนมา ขอบเนียนกับทุกพื้นหลัง
    @param bg สีพื้นหลัง [R,G,B] ถ้าไม่ระบุจะวัดจากมุมภาพให้เอง (แนะนำให้ปล่อยว่าง)
    """
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    if bg is None:
        bg = estimate_bg(rgb)
    bg = np.asarray(bg, dtype=np.float32)

    dist = np.abs(rgb - bg).max(axis=2)
    solid = ndimage.binary_closing(dist > tol, np.ones((3, 3)))
    lab, n = ndimage.label(solid)
    if n:
        sz = ndimage.sum(solid, lab, range(1, n + 1))
        solid = lab == (int(np.argmax(sz)) + 1)
    shape = ndimage.binary_fill_holes(solid)
    # ขยายกลับ 2 px เพื่อไม่ให้ขอบกึ่งโปร่งใส (ซึ่ง dist ยังไม่ถึง tol) โดนตัดทิ้งไปด้วย
    # ใช้เฉพาะตอนคิด alpha เท่านั้น — ตัว mask ที่คืนออกไปยังเป็นรูปทรงจริง เพราะ build script
    # เอาไปวัด bbox หาระดับเท้า/จุดกึ่งกลางตัว ถ้าคืนตัวที่ขยายแล้วสเกลกับตำแหน่งเท้าจะเพี้ยน
    keep = ndimage.binary_dilation(shape, np.ones((3, 3)), iterations=2)
    alpha = np.clip(dist / soft, 0, 1) * keep

    if defringe:
        a = alpha[..., None]
        # กันหารศูนย์: พิกเซลที่ alpha ต่ำมากไม่มีข้อมูลสีตัวจริงเหลือพอจะกู้คืนอยู่แล้ว
        rgb = np.clip((rgb - (1.0 - a) * bg) / np.maximum(a, 1e-3), 0, 255)

    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA"), shape


def add_outline(img, px=6, color=(18, 16, 22), alpha_thr=110):
    """
    เติมเส้นขอบเข้มรอบตัวละคร (ลุค Brawlhalla / เกมต่อสู้การ์ตูนทั่วไป)

    ทำไมต้องมี: ตัวละครที่ตัดจากคลิปไม่มีเส้นขอบ พอวางบนแมพที่มีรายละเอียดเยอะ ตัวจะ "จม"
    ไปกับพื้นหลัง อ่านซิลูเอทไม่ออกตอนสู้กันเร็ว ๆ เส้นขอบเข้มแก้ปัญหานี้ได้ตรงที่สุด
    และทำตอน build ทีเดียวครบทุกตัวละคร ไม่ต้องวาดใหม่

    วิธี: ขยาย (dilate) รูปทรง alpha ออกไป px พิกเซล แล้วระบายสีเข้มเฉพาะวงที่งอกออกมา

    px ค่าเริ่มต้น 6 เพราะวัดจากขนาดที่เห็นจริงบนจอ ไม่ใช่ขนาดใน atlas:
    atlas สูง 393 px แต่ตัวละครถูกวาดจริงราว 144 px บนจอ 720p (WORLD_HEIGHT 190 @ zoom .76)
    = ย่อราว 0.37 เท่า เส้น 2-3 px ใน atlas จึงบางกว่า 1 px บนจอ มองไม่เห็นเลย
    6 px -> ราว 2 px บนจอ = กำลังพอดี (ลองแล้ว 8 เริ่มหนาจนปอยผมทึบติดกัน)

    alpha_thr: นับเฉพาะพิกเซลที่ทึบพอเป็นตัวจริง ไม่งั้นขอบฟุ้งบาง ๆ จะถูกขยายจนเส้นดูหนาเกิน

    @param img RGBA ของเฟรมที่ปรับขนาดเป็นขนาด atlas แล้ว (ต้องทำหลัง resize ไม่ใช่ก่อน)
    @returns RGBA ขนาดเท่าเดิม ที่มีเส้นขอบแล้ว
    """
    if px <= 0:
        return img
    arr = np.asarray(img).astype(np.uint8)
    solid = arr[..., 3] >= alpha_thr
    if not solid.any():
        return img

    grown = ndimage.binary_dilation(solid, ndimage.generate_binary_structure(2, 2), iterations=px)
    ring = grown & ~solid  # เฉพาะวงขอบที่งอกออกมา ไม่ทับตัวละครเดิม

    out = arr.copy()
    out[ring, 0], out[ring, 1], out[ring, 2] = color
    out[ring, 3] = 255
    return Image.fromarray(out, "RGBA")
