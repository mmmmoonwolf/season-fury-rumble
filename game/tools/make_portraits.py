"""
สร้างรูปย่อตัวละครสำหรับหน้าเลือกตัวในล็อบบี้

ทำไมไม่ใช้ atlas ตัวละครตรง ๆ: atlas ไฟล์ละราว 9 MB โหลดครบ 5 ตัวก่อนเข้าล็อบบี้
= ราว 45 MB บนเน็ตมือถือ กว่าจะเห็นหน้าจอแรก — ทั้งที่ต้องการแค่รูปเล็ก ๆ 5 รูป
ตัดหัว+ลำตัวจากเฟรมยืนมาแพ็กเป็นผืนเดียวแทน เหลือไม่กี่ร้อย KB

รันใหม่เมื่อ: เพิ่มตัวละคร / เปลี่ยนอาร์ตตัวเดิม
    python3 tools/make_portraits.py      (จากโฟลเดอร์ game)
"""
import json, os
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")
OUT = "portraits"
CELL = (220, 260)
PAD = 2

# key ต้องตรงกับ ROSTER ใน src/entities/roster.js — เฟรมที่ใช้เป็นท่ายืนของแต่ละตัว
SOURCES = [
    ("kunjae", "kunjae_atlas", "idle"),
    ("dearv2", "dearv2_atlas", "idle"),
    ("marchv2", "marchv2_atlas", "idle"),
    ("oat", "oat_atlas", "idle"),
    # Nyx ใช้เฟรมท่าโจมตีแทนท่ายืน เพราะท่ายืนเธอเป็น side stance ก้มหน้าและมีแขนบังหน้าอยู่
    # ตัวอื่นยืนหันหน้าตรงอยู่แล้วเลยใช้ idle ได้ตามปกติ
    ("b1989", "b1989_atlas", "attack5"),
]


def first_frame(atlas, sheet, prefix):
    """เฟรมแรกของท่านั้น กางกลับเป็นภาพเต็ม (atlas เก็บแบบ trim ไว้)"""
    name = next(n for n in atlas["frames"] if n.startswith(prefix))
    m = atlas["frames"][name]
    f, ss, src = m["frame"], m["spriteSourceSize"], m["sourceSize"]
    canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
    canvas.paste(sheet.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), (ss["x"], ss["y"]))
    return canvas


def portrait(img):
    """ครอปกรอบสัดส่วนคงที่รอบหัว แล้วย่อให้เต็มช่องพอดี

    ทำไมต้องกรอบสัดส่วนคงที่ ไม่ใช่ย่อทั้งตัวตามสัดส่วนเดิม: แต่ละตัวยืนท่าไม่เหมือนกัน
    Nyx ยืนท่าย่อ (กว้างและเตี้ย) พอย่อตามสัดส่วนเดิมจะได้รูปแบน ๆ เล็กกว่าเพื่อนชัดเจน
    ครอปกรอบอัตราส่วนเท่าช่องเสมอ แล้ว resize เต็มช่อง ทุกตัวจึงมาขนาดเท่ากันไม่ว่ายืนท่าไหน

    หาหัวจากจุดกึ่งกลางแนวนอนของ 12% บนสุดของตัว ไม่ใช่กึ่งกลางกรอบทั้งตัว
    เพราะท่าที่ยื่นแขน/อาวุธไปข้างหนึ่งจะดึงกึ่งกลางกรอบเบนไปจนหัวหลุดออกนอกรูป
    """
    import numpy as np

    box = img.getbbox()
    if not box:
        return Image.new("RGBA", CELL, (0, 0, 0, 0))
    body = img.crop(box)
    alpha = np.asarray(body)[..., 3] > 40
    if not alpha.any():
        return Image.new("RGBA", CELL, (0, 0, 0, 0))

    head_rows = alpha[: max(1, int(body.height * 0.12))]
    cols = np.nonzero(head_rows.any(axis=0))[0]
    head_cx = float(cols.mean()) if len(cols) else body.width / 2

    h = body.height * 0.58
    w = h * (CELL[0] / CELL[1])
    left = head_cx - w / 2
    crop = body.crop((round(left), 0, round(left + w), round(h)))  # crop นอกขอบได้ ได้พื้นที่โปร่งใสมาเติม
    return crop.resize(CELL, Image.LANCZOS)


cells = {}
for key, atlas_name, prefix in SOURCES:
    atlas = json.load(open(os.path.join(ASSETS, atlas_name + ".json")))
    sheet = Image.open(os.path.join(ASSETS, atlas_name + ".png")).convert("RGBA")
    cells[key] = portrait(first_frame(atlas, sheet, prefix))
    print(f"  {key:10s} <- {atlas_name} ({prefix})")

W = (CELL[0] + PAD) * len(cells) + PAD
H = CELL[1] + PAD * 2
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
frames, x = {}, PAD
for key, im in cells.items():
    sheet.paste(im, (x, PAD))
    frames[key + ".png"] = {
        "frame": {"x": x, "y": PAD, "w": CELL[0], "h": CELL[1]},
        "rotated": False, "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": CELL[0], "h": CELL[1]},
        "sourceSize": {"w": CELL[0], "h": CELL[1]},
    }
    x += CELL[0] + PAD

sheet.save(os.path.join(ASSETS, OUT + ".png"))
json.dump({"frames": frames, "meta": {"image": OUT + ".png", "size": {"w": W, "h": H}, "scale": "1"}},
          open(os.path.join(ASSETS, OUT + ".json"), "w"), indent=1)
print(f"\n{OUT}.png {W}x{H}  {len(frames)} รูป")
