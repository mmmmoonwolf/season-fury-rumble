"""
สร้าง atlas ของ Helios จากอาร์ตที่มีอยู่

ตอนนี้มีแค่ท่ายืนที่อนุมัติแล้ว (art_reference/helios_idle_APPROVED.jpg)
state อื่นยังวาดเป็นกล่องในเกมจนกว่าอาร์ตจะมา — เป็นวิธีเดียวกับที่ Nyx เริ่ม
ได้ชีตมาเพิ่มเมื่อไหร่ ใส่ใน SEQ แล้วรันซ้ำ

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_helios.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import estimate_bg

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")

# ความสูงท่ายืนในภาพที่ตัดแล้ว — เท่ากับของ Nyx เพื่อให้สองตัวสูงเท่ากันบนเวที
# (ฉากย่อด้วย SPRITE_H / standing ค่านี้จึงเป็นตัวกำหนดขนาดบนจอโดยตรง)
STANDING = 240

SEQ = {
    "idle": [os.path.join(ROOT, "art_reference", "helios_idle_APPROVED.jpg")],
}


def cutout(path):
    """ตัดพื้นหลังออกด้วยความสว่าง แล้วคืนภาพ RGBA ที่ครอปพอดีตัว"""
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = estimate_bg(rgb)
    solid = ndimage.binary_fill_holes(
        ndimage.binary_closing(np.abs(rgb - bg).max(axis=2) > 18, np.ones((5, 5))))
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    ys, xs = np.nonzero(big)
    rgba = Image.fromarray(np.dstack([np.asarray(im), (big * 255).astype(np.uint8)]))
    return rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


staged = {}
for name, paths in SEQ.items():
    for i, p in enumerate(paths, 1):
        img = cutout(p)
        img = img.resize((round(img.width * STANDING / img.height), STANDING), Image.LANCZOS)
        staged[f"{name}_{i}.png"] = img
        print(f"{name}_{i}  {img.width}x{img.height}")

# แคนวาสร่วม: ทุกเฟรมวางกลางแนวนอน เท้าชิดล่าง — จุดยึดจึงคงที่ทุกเฟรมเหมือน atlas ของ Nyx
CW = max(im.width for im in staged.values()) + 40
CH = STANDING + 20
ANCHOR_X, FEET_Y = CW // 2, CH - 10

frames, x = {}, 0
sheet = Image.new("RGBA", (CW * len(staged), CH), (0, 0, 0, 0))
for name, im in staged.items():
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.paste(im, (ANCHOR_X - im.width // 2, FEET_Y - im.height), im)
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
