"""
สร้าง atlas ของ Helios จากคลิป ยืน+วิ่ง

คลิปเป็นแหล่งเดียวของทั้งสองท่า จึงได้สเกลเดียวกันโดยอัตโนมัติ — ถ้าเอาท่ายืนจากภาพนิ่ง
แล้วท่าวิ่งจากคลิป ต้องมานั่งจูนให้สูงเท่ากันทีหลัง ซึ่งเป็นงานที่ไม่จำเป็น
(ตรวจแล้วคลิปตรงกับท่ายืนที่อนุมัติไว้: อัตราส่วนตัวสูง/หัวกว้าง 2.76 เทียบ 2.75)

ท่าที่ยังไม่มี (กระโดด/โดนตี/ล้ม/กัน/ท่าโจมตี) ยังวาดเป็นกล่องในเกม — วิธีเดียวกับที่ Nyx เริ่ม
ได้ชีตมาเพิ่มเมื่อไหร่ ใส่ใน SEQ แล้วรันซ้ำ

รัน (จากโฟลเดอร์ game):  HELIOS_RAW=/tmp/claude-0/hel python3 tools/build_scramble_helios.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import estimate_bg

RAW = os.environ.get("HELIOS_RAW", "/tmp/claude-0/hel")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")

# ความสูงท่ายืนในภาพที่ตัดแล้ว — เท่ากับของ Nyx เพื่อให้สองตัวสูงเท่ากันบนเวที
# (ฉากย่อด้วย SPRITE_H / standing ค่านี้จึงเป็นตัวกำหนดขนาดบนจอโดยตรง)
STANDING = 240

# หนึ่งก้าววนซ้ำ ไม่ใช่สองก้าว — สูตรความเร็วในฉากคิดจาก "หนึ่งรอบ = หนึ่งก้าว" ไว้แล้ว
# (ดู RUN_STRIDE ใน ScrambleScene.js) จังหวะก้าวในคลิปวัดได้ 11 เฟรม
SEQ = {
    "idle": [5],
    "run": list(range(68, 79)),
}


def frame(n):
    """คืน (ภาพตัดพื้นแล้ว, กรอบตัว, จุดศูนย์กลางมวลแนวนอน) ของเฟรมที่ n"""
    im = Image.open(f"{RAW}/f_{n:03d}.png").convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = estimate_bg(rgb)
    solid = ndimage.binary_fill_holes(
        ndimage.binary_closing(np.abs(rgb - bg).max(axis=2) > 18, np.ones((5, 5))))
    lab, k = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, k + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    ys, xs = np.nonzero(big)
    rgba = Image.fromarray(np.dstack([np.asarray(im), (big * 255).astype(np.uint8)]))
    return rgba, (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())), float(xs.mean())


# สเกลเดียวทั้ง atlas คิดจากท่ายืน — ท่าวิ่งตัวเตี้ยกว่าท่ายืนจริง ถ้าย่อแต่ละท่าให้สูงเท่ากันหมด
# ตัวจะโป่งขึ้นตอนวิ่ง ซึ่งเป็นคนละปัญหากับที่เคยไล่แก้มาทั้งโปรเจกต์ แต่หน้าตาเหมือนกัน
_, idle_box, _ = frame(SEQ["idle"][0])
SCALE = STANDING / (idle_box[3] - idle_box[1] + 1)
print(f"ท่ายืนในคลิปสูง {idle_box[3] - idle_box[1] + 1} px -> สเกล {SCALE:.4f}")

staged = {}
for name, nums in SEQ.items():
    for i, n in enumerate(nums, 1):
        img, box, cx = frame(n)
        # ยึดแนวนอนด้วยจุดศูนย์กลางมวล ไม่ใช่กลางกรอบตัว
        # ตอนขาถ่างสุด กรอบตัวกว้างขึ้นข้างเดียว จัดกลางกรอบแล้วลำตัวจะส่ายไปมาทุกก้าว
        # (วัดบนคลิปของ Nyx: ส่ายด้วยกรอบตัว 15.3 px ด้วยศูนย์กลางมวล 5.9 px)
        crop = img.crop((box[0], box[1], box[2] + 1, box[3] + 1))
        crop = crop.resize((max(1, round(crop.width * SCALE)), max(1, round(crop.height * SCALE))),
                           Image.LANCZOS)
        staged[f"{name}_{i}.png"] = (crop, (cx - box[0]) * SCALE)
        print(f"  {name}_{i}  {crop.width}x{crop.height}")

CW = max(im.width for im, _ in staged.values()) + 60
CH = max(im.height for im, _ in staged.values()) + 20
ANCHOR_X, FEET_Y = CW // 2, CH - 10

frames, x = {}, 0
sheet = Image.new("RGBA", (CW * len(staged), CH), (0, 0, 0, 0))
for name, (im, com) in staged.items():
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    # ศูนย์กลางมวลไปอยู่ที่จุดยึด · เท้า (ขอบล่างของกรอบ) ไปอยู่ที่ระดับพื้น
    canvas.paste(im, (round(ANCHOR_X - com), FEET_Y - im.height), im)
    sheet.paste(canvas, (x, 0))
    frames[name] = {"frame": {"x": x, "y": 0, "w": CW, "h": CH},
                    "sourceSize": {"w": CW, "h": CH},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": CW, "h": CH}}
    x += CW

os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, "scramble_helios.png"), optimize=True)
json.dump({"frames": frames,
           "meta": {"image": "scramble_helios.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(os.path.join(OUT, "scramble_helios.json"), "w"), indent=1)
print(f"\nscramble_helios.png: {sheet.width}x{sheet.height}  {len(frames)} เฟรม")
