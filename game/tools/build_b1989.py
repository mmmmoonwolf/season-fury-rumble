import sys; sys.path.insert(0, '.')
from cut import cutout, add_outline
from PIL import Image
import numpy as np, json, os

# B1989 / Nyx — ตัวละครใหม่ นักฆ่ามีดคู่ ธาตุความมืด/วิญญาณความตาย
# RAW = โฟลเดอร์เฟรมดิบนอก repo (ดู .gitignore: tools/raw/) ต้องแก้ path ตรงนี้ให้ตรงเครื่องที่รัน
RAW = os.environ.get("B1989_RAW", "raw/b1989")
OUT = "out"; os.makedirs(OUT, exist_ok=True)

# ตัวละครอื่นใช้ผืนภาพ 480x470 ยืนสูง 393 แต่ Nyx เก็บเล็กกว่าที่ 0.7125 เท่า (ยืนสูง 280)
# ขนาดในเกมเท่าเดิมเป๊ะ เพราะเอนจิ้นย่อ/ขยายจาก standingHeightInFrame -> WORLD_HEIGHT อยู่แล้ว
# (ดู B1989_ATLAS ใน src/entities/B1989.js — ต้องแก้ standingHeightInFrame/bottomMargin ให้ตรงกัน)
#
# ทำไมต้องเล็กลง: atlas เดิม 93 เฟรมกิน 4038x3565 = 86% ของลิมิต GPU (4096) ใส่เพิ่มได้อีกแค่ ~15 เฟรม
# แต่ที่จอ 720p ตัวละครถูกวาดจริงสูงสุดราว 204 px เท่านั้น (WORLD_HEIGHT 190 x ซูมสูงสุด 720/672)
# เก็บไว้ 393 จึงเกินจำเป็นเกือบ 2 เท่า ลดเหลือ 280 ได้พื้นที่คืนมาเกือบครึ่ง = ใส่เฟรมได้ 2 เท่า
# ที่ 280 ยังละเอียดกว่าที่วาดจริงบน 720p และพอดีราว 1:1 ที่ 1080p
CANVAS = (342, 335); ANCHOR_X = 171; FEET_Y = 307; STANDING = 280
HEAD_TOP = FEET_Y - STANDING
OUTLINE_PX = 2  # เทียบเท่า 3 px ของตัวละครอื่นที่เก็บสเกล 393 (3 x 0.7125 ~ 2) — ความหนาบนจอเท่ากัน
G, A = "ground", "air"

# เอนจิ้นถือว่า "อาร์ตหันขวา" เป็นค่าตั้งต้น แล้ว setFlipX(true) ตอนหันซ้าย (ดู Player.js: facing=1 -> setFlipX(false))
# แต่คลิปต้นทางถ่ายมาคนละทิศกัน — ท่าเดิน/ยืน/กระโดดหันซ้าย ส่วนท่าโจมตีหันขวา
# ถ้าไม่มิเรอร์ ตัวละครจะพลิกกลับหลัง 180 องศาทุกครั้งที่กดตี แล้วพลิกกลับมาอีกตอนตีจบ
# (atlas เวอร์ชันแรกก็เป็นแบบนี้ — บั๊กที่มีมาตั้งแต่ต้น ไม่ใช่ของใหม่)
# climb เป็นภาพหันหลัง ไม่มีทิศซ้ายขวาชัดเจน ปล่อยไว้ได้
FLIP = {"idle", "run", "jumpForward", "jumpSpinBack", "dodge", "guard", "hurt"}


def span(a, b, n):
    """n เฟรมกระจายเท่า ๆ กันจาก a ถึง b (รวมปลายทั้งสองข้าง) — เพิ่ม/ลดความลื่นได้ที่ตัวเลขเดียว"""
    if n == 1:
        return [a]
    return [a + round(i * (b - a) / (n - 1)) for i in range(n)]

# คลิปชุดใหม่ (ไม่มีเงาติดพื้น) 8 คลิป 1280x720 24fps
#
# ช่วงลูปของท่าที่เล่นวน (วิ่ง/ยืน/ปีน) ไม่ได้กะด้วยตา — หาด้วยการจับคู่เฟรมที่เหมือนกันที่สุด
# (เทียบภาพย่อขาวดำทุกคู่ (เริ่ม, คาบ) เลือกคู่ที่ต่างกันน้อยสุด) ได้ลูปที่ต่อติดเนียนจริง:
#   วิ่ง  f147 คาบ 20 เฟรม (ค่าความต่าง 0.65 — เกือบสมบูรณ์แบบ)
#   ปีน   f74  คาบ 36 เฟรม (0.99)
#   ยืน   f45  คาบ 21 เฟรม (0.80)
# ทุกคลิปมีช่วง "ตัวค่อย ๆ ปรากฏ" ราว 30 เฟรมแรก ต้องข้ามทิ้งเสมอ
SEQ = {
    # ยืนตั้งการ์ด — เก็บทั้งคาบ ได้ลูปหายใจที่ต่อติดสนิท
    "idle": ("idle", span(45, 65, 21), G),

    # วิ่ง — เก็บทั้งคาบก้าว (20 เฟรม = 0.83 วิต่อรอบ)
    "run": ("run", span(147, 166, 20), G),

    # กระโดด — ช่วงลอยขึ้นจริง (ระดับเท้าลอยจาก 683 ขึ้นไป 550)
    "jumpForward": ("jumpspin_crouch", span(60, 82, 10), A),
    # หมุนตัวกลางอากาศ — ช่วงลอยสูงสุด (ระดับเท้า 401-597 = ลอยพ้นพื้นเต็มตัว)
    "jumpSpinBack": ("jumpspin_crouch", span(114, 158, 12), A),
    # ย่อตัว — ช่วงท้ายคลิปที่ย่อนิ่ง (หัวอยู่ที่ y 258-272)
    "dodge": ("jumpspin_crouch", span(204, 232, 8), G),

    # ตั้งการ์ด — ท่าไขว้มีดค้างไว้ (นิ่งเกือบตลอด เก็บ 8 เฟรมพอได้จังหวะหายใจ)
    "guard": ("guard_hurt", span(51, 111, 8), G),
    # โดนโจมตี — ช่วงเซถอย (ระดับเท้าถอยจาก 687 ไป 707)
    "hurt": ("guard_hurt", span(121, 181, 10), G),

    # ปีนบันได — หันหลังปีนขึ้น/ลง (ใช้ชุดเดียวกันทั้งขึ้น-ลง เล่นย้อนได้เพราะเป็นรอบมือสลับ)
    # เก็บครึ่งคาบละเฟรม (ทุก 2 เฟรมของคาบ 36) = 18 เฟรม
    "climb": ("climb", span(74, 108, 18), G),

    # คอมโบพื้นฐาน 5 จังหวะ — คลิปเดียวเป็นสแตบวนซ้ำ ไม่ใช่ 5 ท่าที่ต่างกันจริง
    # เลือกจาก "จังหวะสุดแขน" (จุดที่ความกว้างหลังตัดพื้นขึ้นสูงสุดเฉพาะที่) 5 จุดที่ต่างมุมกัน
    # แล้วกินช่วงหน้า-หลังจุดนั้นข้างละ ~7 เฟรม ให้เห็นทั้งเงื้อ-ฟัน-ชัก
    "attack1": ("atk", span(46, 60, 8), G),    # สุดแขนที่ f54
    "attack2": ("atk", span(60, 74, 8), G),    # f66
    "attack3": ("atk", span(82, 96, 8), G),    # f90 (กว้างสุด 605)
    "attack4": ("atk", span(96, 110, 8), G),   # f102
    "attack5": ("atk", span(162, 176, 8), G),  # f170 (กว้างสุดทั้งคลิป 676)

    # คอมโบ 2 (ดาชพุ่งตี) — ปลดล็อกถ้ากดตีต่อภายใน 2 วิหลังคอมโบพื้นฐานครบ 5 (ดู B1989.js)
    # f5-13 ออกตัว, f25-45 พุ่ง (เส้นความเร็ว), f49-61 กระทบ (แฟลชขาว), f97-120 ชักตัวกลับ
    "dashFinisher": ("atk3", span(5, 120, 18), G),
}

# สเกลอ้างอิงจาก "ท่ายืนตรงเต็มความสูง" ไม่ใช่ท่าตั้งการ์ด — ต้องเป็นเฟรมที่ยืดตัวสุด
# ไม่งั้นเอนจิ้นจะเอาความสูงของท่าย่อไปเทียบกับ WORLD_HEIGHT แล้ว Nyx จะตัวใหญ่กว่าตัวอื่น
# f21 = ยืนตรงแล้ว (สูง 589 px) แต่ยังไม่ย่อเข้าท่าการ์ดที่ f31 เป็นต้นไป (เหลือ ~510)
SCALE_REF = f"{RAW}/idle/f_021.png"
im0, fg0 = cutout(SCALE_REF)
ys0, _ = np.nonzero(fg0)
SCALE = STANDING / (ys0.max() - ys0.min())
print(f"scale={SCALE:.4f}  (อ้างอิง {SCALE_REF} สูง {ys0.max()-ys0.min()} px)")

built = {}
for name, (clip, nums, kind) in SEQ.items():
    made = 0
    for n in nums:
        p = f"{RAW}/{clip}/f_{n:03d}.png"
        if not os.path.exists(p):
            print(f"  !! missing {p}")
            continue
        im, fg = cutout(p)
        if name in FLIP:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
            fg = fg[:, ::-1]
        ys, xs = np.nonzero(fg)
        if len(ys) == 0:
            print(f"  !! empty cutout {p}")
            continue
        top, bot = int(ys.min()), int(ys.max())
        cx = (int(xs.min()) + int(xs.max())) / 2
        w, h = round(im.width * SCALE), round(im.height * SCALE)
        im = im.resize((w, h), Image.LANCZOS)
        c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        dx = round(ANCHOR_X - cx * SCALE)
        dy = round(FEET_Y - bot * SCALE) if kind == G else round(HEAD_TOP - top * SCALE)
        c.alpha_composite(im, (dx, dy))
        # เส้นขอบเข้มต้องทำ "หลัง" ย่อขนาดแล้ว ถ้าทำก่อนย่อ เส้นจะบางลงตามจนหายไปเลย
        c = add_outline(c, OUTLINE_PX)
        made += 1
        key = f"{name}_{made}"
        c.save(f"{OUT}/{key}.png")
        built[key] = c
    print(f"{name:14s} {made:3d} frames  [{clip}]")

frames = {f"{k}.png": v for k, v in built.items()}
tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in frames.items()}
pad, x = 2, 2
W = sum(b[2] - b[0] + pad for b, _ in tr.values()) + pad
H = max(b[3] - b[1] for b, _ in tr.values()) + pad * 2
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
om = {}
for name, (bb, im) in tr.items():
    cr = im.crop(bb)
    sheet.paste(cr, (x, pad))
    om[name] = {
        "frame": {"x": x, "y": pad, "w": cr.width, "h": cr.height},
        "rotated": False, "trimmed": True,
        "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": cr.width, "h": cr.height},
        "sourceSize": {"w": im.width, "h": im.height},
    }
    x += cr.width + pad
sheet.save(f"{OUT}/b1989_atlas.png")
json.dump(
    {"frames": om, "meta": {"image": "b1989_atlas.png", "size": {"w": W, "h": H}, "scale": "1"}},
    open(f"{OUT}/b1989_atlas.json", "w"), indent=1,
)
print(f"\npacked {(W, H)} {len(om)} frames")
