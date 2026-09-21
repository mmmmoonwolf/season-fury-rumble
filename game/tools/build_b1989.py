import sys; sys.path.insert(0, '.')
from cut import cutout
from PIL import Image
import numpy as np, json, os

# B1989 / Nyx — ตัวละครใหม่ นักฆ่ามีดคู่ ธาตุความมืด/วิญญาณความตาย
# RAW = โฟลเดอร์เฟรมดิบนอก repo (ดู .gitignore: tools/raw/) ต้องแก้ path ตรงนี้ให้ตรงเครื่องที่รัน
RAW = os.environ.get("B1989_RAW", "raw/b1989")
OUT = "out"; os.makedirs(OUT, exist_ok=True)

# ธรรมเนียมเดียวกับตัวละครอื่นทั้งหมด (ดู build_marchv2.py) — ผืนภาพ 480x470, เท้าที่ y=431, ยืนสูง 393
CANVAS = (480, 470); ANCHOR_X = 240; FEET_Y = 431; STANDING = 393
HEAD_TOP = FEET_Y - STANDING
G, A = "ground", "air"

SEQ = {
    # ยืนตั้งการ์ด — คลิปสั้น 2s/49 เฟรม ทั้งคลิปเป็นท่ายืนเดียวกันหมด (นิ่ง แค่หายใจนิดหน่อย)
    "idle": ("idle", [1, 7, 13, 19, 25, 31, 37, 43, 49], G),

    # วิ่ง — f97-140 คือรอบก้าวจริง (ตัดช่วงออกตัวจากยืน f1-90 ทิ้ง)
    # f145-185 คือเฟรม "ยื่นหน้าพรวด" ที่ผู้ใช้ขอให้ใส่ไว้ (หลอนดี) — สอดแทรกเข้าไปกลางลูป 2 เฟรม
    "run": (
        "run",
        [97, 105, 113, 121, 129, 137, 153, 161, 121, 129, 137],
        G,
    ),

    # กระโดดไปข้างหน้า (ถือ A) — ช่วงลอยขึ้นของท่ากระโดด/หมุนตัว f57-93 (ก่อนถึงจุดหมุนตัวจริง)
    "jumpForward": ("jumpspin_crouch", [57, 65, 73, 81, 89, 93], A),
    # กระโดดหมุนตัวกลับหลัง (ถือ S) — ช่วงหมุนตัวกลางอากาศจริง f105-140
    "jumpSpinBack": ("jumpspin_crouch", [105, 113, 121, 129, 137, 140], A),
    # ท่าก้มหลบ (กด D) — ช่วงย่อตัวต่ำถือมีดไปข้างหน้า f193-233
    "dodge": ("jumpspin_crouch", [193, 201, 209, 217, 225, 233], G),

    # ท่าตั้งการ์ด (ปุ่ม B) — ท่าย่อตัวคุกเข่าไขว้มีด f49-113 (f130 เริ่มยืดตัวกลับยืนแล้ว ตัดทิ้ง)
    "guard": ("guard_hurt", [49, 61, 73, 85, 97, 109], G),
    # โดนโจมตี — ท่าเซถอยมีดหลุดมือ f193-233
    "hurt": ("guard_hurt", [193, 201, 209, 217, 225, 233], G),

    # ปีนบันได — หันหลังปีนขึ้น/ลง (ใช้ชุดเดียวกันทั้งขึ้น-ลง เล่นย้อนได้เพราะเป็นรอบมือสลับ) f60-257
    "climb": ("climb", [60, 85, 110, 135, 160, 185, 210, 235, 257], G),

    # คอมโบพื้นฐาน 5 จังหวะ — สลับหยิบจาก 2 คลิป (atk1/atk2) ให้มีความหลากหลายของมุม/จังหวะ
    # แต่ละคลิปเป็นสแตบวนซ้ำ 11 วิ ไม่ใช่ 5 ท่าที่ต่างกันจริง เลยเลือกจุด "สุดแขน" ที่ต่างจังหวะกันแทน
    "attack1": ("atk1", [78, 86, 94, 102], G),
    "attack2": ("atk2", [82, 90, 98, 106], G),
    "attack3": ("atk1", [150, 158, 166, 174], G),
    "attack4": ("atk2", [154, 162, 170, 178], G),
    "attack5": ("atk1", [222, 230, 238, 246], G),

    # คอมโบ 2 (ดาชพุ่งตี) — ปลดล็อกถ้ากดตีต่อภายใน 2 วิหลังคอมโบพื้นฐานครบ 5 (ดู B1989.js)
    # f1-25 ออกตัว, f25-65 พุ่ง (มีเส้นความเร็ว), f45-90 กระทบ (แฟลชขาว), f97-117 ชักตัวกลับ
    "dashFinisher": ("atk3", [5, 13, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105, 113], G),
}

# สเกลอ้างอิงจากท่ายืน (เฟรมแรกของ idle)
im0, fg0 = cutout(f"{RAW}/idle/f_001.png")
ys0, _ = np.nonzero(fg0)
SCALE = STANDING / (ys0.max() - ys0.min())
print(f"scale={SCALE:.4f}")

built = {}
for name, (clip, nums, kind) in SEQ.items():
    made = 0
    for n in nums:
        p = f"{RAW}/{clip}/f_{n:03d}.png"
        if not os.path.exists(p):
            print(f"  !! missing {p}")
            continue
        im, fg = cutout(p)
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
