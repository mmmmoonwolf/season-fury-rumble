"""
สร้าง atlas ของ Helios จากคลิป (ยืน+วิ่ง) และชีตท่า A-E

แหล่งอาร์ตมาคนละรอบเจน ระยะกล้องจึงไม่เท่ากัน — ชีต B/E ตรงกับคลิปพอดี ส่วน A/C/D ซูมออกกว่า 32-40%
แก้ด้วยการวัด "ความกว้างหัว" ของแต่ละแหล่ง (ไม่เปลี่ยนตามท่า เปลี่ยนตามระยะกล้องอย่างเดียว)
แล้วคูณสเกลให้เท่ากับคลิป ใช้มัธยฐานเพราะท่าที่ยกแขนเหนือหัวจะวัดเกินจริงไม่กี่ท่า

ท่าที่ยังไม่มีอาร์ต (เข่าพุ่ง / อัลติ) ยังวาดเป็นกล่องในเกม — ได้ชีต F/G มาแล้วใส่เพิ่มแล้วรันซ้ำ

รัน (จากโฟลเดอร์ game):
  HELIOS_RAW=/tmp/claude-0/hel HELIOS_SHEETS=/tmp/hel python3 tools/build_scramble_helios.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import estimate_bg
from sheet_poses import sheet_poses

RAW = os.environ.get("HELIOS_RAW", "/tmp/claude-0/hel")
SHEETS_DIR = os.environ.get("HELIOS_SHEETS", "/tmp/hel")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")

STANDING = 240          # ความสูงท่ายืนหลังย่อ — เท่ากับของ Nyx ให้สองตัวสูงเท่ากันบนเวที
GROUND, AIR = "ground", "air"

# ลำดับท่า: (แหล่ง, เลขท่า, ชนิดการจัดตำแหน่ง)
#   แหล่ง "clip" = เฟรมจากคลิป · "A".."E" = ท่าที่ n ของชีตนั้น
SEQ = {
    # ---- จากคลิป ----
    "idle": ("clip", [5], GROUND),
    "run":  ("clip", list(range(68, 79)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    # ชีตนี้เจนมา 10 ท่า (เกินที่สั่งไป 1) ท่า 1 เป็นท่ายืนซ้ำกับคลิป จึงไม่ได้ใช้
    "jump":        ("A", [2, 3, 5, 4], AIR),   # ถีบพื้น -> ลอยสุด -> ร่วง -> ย่อรับพื้น
    "crouch":      ("A", [6], GROUND),
    "hurt":        ("A", [7], GROUND),
    "knockdown":   ("A", [8], GROUND),
    "techroll":    ("A", [9], GROUND),
    "tech":        ("A", [8], GROUND),
    "block":       ("A", [10], GROUND),
    "blockstun":   ("A", [10], GROUND),
    "blockcrouch": ("A", [6], GROUND),         # ยังไม่มีท่าก้มกันแยก ใช้ท่าย่อไปก่อน (ความสูงตรงกับกรอบ)

    # ---- ชีต B: คอมโบหมัดพื้นฐาน 3 ท่า ท่าละ 3 เฟรม ----
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [4, 5, 6], GROUND),
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C: ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),          # พุ่งต่อย
    "up":   ("C", [4, 5, 6], GROUND),          # อัปเปอร์
    "down": ("C", [7, 8, 9], GROUND),          # กวาดขา

    # ---- ชีต D: ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    "dair": ("D", [7, 8, 9], AIR),

    # ---- ชีต E: Chain Rush (สกิล 1) ----
    # ชีตมี 6 ท่า แต่สกิลมี 5 จังหวะ ท่าละ 3 เฟรม จึงใช้ท่าซ้ำข้ามจังหวะ
    # แต่ละจังหวะโชว์ราว 9 เฟรม (0.15 วิ) ตาจับได้แค่ "ต่อย/เตะสลับกันรัว" ไม่ได้จับเฟรมเดี่ยว
    "rush1": ("E", [1, 2, 6], GROUND),
    "rush2": ("E", [6, 4, 1], GROUND),
    "rush3": ("E", [1, 3, 6], GROUND),
    "rush4": ("E", [6, 2, 1], GROUND),
    "rush5": ("E", [1, 5, 6], GROUND),
    # ไม้จบสามทางยืมท่าจากชีต C ไปก่อน เพราะเป็นการเคลื่อนไหวเดียวกันเป๊ะ
    # (หมัดตรง / อัปเปอร์ / กวาดขา) ได้ชีต F มาแล้วค่อยเปลี่ยนมาใช้ของจริง
    "rushEndF": ("C", [1, 2, 3], GROUND),
    "rushEndU": ("C", [4, 5, 6], GROUND),
    "rushEndD": ("C", [7, 8, 9], GROUND),
}


def clip_mask(n):
    im = Image.open(f"{RAW}/f_{n:03d}.png").convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = estimate_bg(rgb)
    solid = ndimage.binary_fill_holes(
        ndimage.binary_closing(np.abs(rgb - bg).max(axis=2) > 18, np.ones((5, 5))))
    lab, k = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, k + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    rgba = Image.fromarray(np.dstack([np.asarray(im), (big * 255).astype(np.uint8)]))
    return rgba, big


def head_width(mask):
    """ความกว้างหัว — ไม่เปลี่ยนตามท่า เปลี่ยนตามระยะกล้องอย่างเดียว จึงใช้เทียบสเกลข้ามแหล่งได้"""
    ys, xs = np.nonzero(mask)
    h = ys.max() - ys.min() + 1
    band = mask[ys.min():ys.min() + max(1, int(h * 0.18))]
    w = [np.count_nonzero(r) for r in band if r.any()]
    return max(w) if w else 0


SHEETS = {n: sheet_poses(f"{SHEETS_DIR}/{n}.jpg") for n in "ABCDE"}

# สเกลของแต่ละแหล่ง เทียบให้หัวเท่ากับในคลิป
_, ref_mask = clip_mask(5)
REF_HEAD = head_width(ref_mask)
ref_h = np.count_nonzero(ref_mask.any(axis=1))
SRC_SCALE = {"clip": STANDING / ref_h}
print(f"คลิป: หัวกว้าง {REF_HEAD}  ท่ายืนสูง {ref_h}  -> สเกล {SRC_SCALE['clip']:.4f}")
for n, poses in SHEETS.items():
    hw = []
    for img, b, _ in poses:
        a = np.asarray(img.crop((b[0], b[1], b[2] + 1, b[3] + 1)).convert("RGBA"))[:, :, 3] > 110
        hw.append(head_width(a))
    med = float(np.median(hw))
    SRC_SCALE[n] = SRC_SCALE["clip"] * (REF_HEAD / med)
    print(f"ชีต {n}: หัวกว้างมัธยฐาน {med:.0f}  -> สเกล {SRC_SCALE[n]:.4f}  ({REF_HEAD / med:.3f} เท่าของคลิป)")


def source(src, n):
    """คืน (ภาพ RGBA ที่ครอปพอดีตัว, จุดศูนย์กลางมวลแนวนอนในภาพที่ครอปแล้ว)"""
    if src == "clip":
        rgba, mask = clip_mask(n)
        ys, xs = np.nonzero(mask)
        return rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), float(xs.mean() - xs.min())
    img, b, _ = SHEETS[src][n - 1]
    crop = img.crop((b[0], b[1], b[2] + 1, b[3] + 1)).convert("RGBA")
    a = np.asarray(crop)[:, :, 3] > 110
    _, xs = np.nonzero(a)
    return crop, float(xs.mean())


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = SRC_SCALE[src]
    for i, n in enumerate(nums, 1):
        crop, com = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        # ท่าบนพื้นยึดเท้า (ขอบล่าง) · ท่าลอยยึดกึ่งกลางตัวให้ตรงกับกึ่งกลางตัวตอนยืน
        # ยึดเท้ากับท่าลอยจะทำให้ท่าตีลังกาจมพื้น ส่วนยึดกลางกับท่ายืนจะทำให้ลอยสูงผิดปกติ
        base = h if kind == GROUND else h / 2 + STANDING / 2
        staged[f"{name}_{i}.png"] = (im, com * sc, base)
    print(f"  {name:11s} {len(nums)} เฟรม  [{src}]")

PAD = 14
left = max(c for _, c, _ in staged.values())
right = max(im.width - c for im, c, _ in staged.values())
top = max(b for _, _, b in staged.values())
bottom = max(im.height - b for im, _, b in staged.values())
CW, CH = round(left + right) + PAD * 2, round(top + bottom) + PAD * 2
ANCHOR_X, FEET_Y = round(left) + PAD, round(top) + PAD
print(f"\ncanvas {CW}x{CH}  จุดยึด x={ANCHOR_X} เท้า y={FEET_Y}")

frames, x = {}, 0
sheet = Image.new("RGBA", (CW * len(staged), CH), (0, 0, 0, 0))
for name, (im, com, base) in staged.items():
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.paste(im, (round(ANCHOR_X - com), round(FEET_Y - base)), im)
    sheet.paste(canvas, (x, 0))
    frames[name] = {"frame": {"x": x, "y": 0, "w": CW, "h": CH},
                    "sourceSize": {"w": CW, "h": CH},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": CW, "h": CH}}
    x += CW

os.makedirs(OUT, exist_ok=True)
json_path = os.path.join(OUT, "scramble_helios.json")
sheet.save(os.path.join(OUT, "scramble_helios.png"), optimize=True)
json.dump({"frames": frames,
           "meta": {"image": "scramble_helios.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(json_path, "w"), indent=1)
print(f"packed {sheet.width}x{sheet.height}  {len(frames)} เฟรม")

from repack_atlas import repack
repack(json_path, max_w=4096)
final = json.load(open(json_path))["meta"]["size"]
print(f"scramble_helios.png: {final['w']}x{final['h']}  VRAM {final['w'] * final['h'] * 4 / 1e6:.1f} MB")
