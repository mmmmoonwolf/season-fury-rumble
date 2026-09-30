"""สร้าง atlas ของ Alecto จากสตริปคลิป (ยืน+วิ่ง) และชีตท่า A-G

ต่างจาก build script ของสองตัวแรกสามเรื่อง เพราะตัวนี้ใส่หมวกและถือแส้:

1. ไม้บรรทัดวัดระยะกล้องใช้ "พื้นที่หมวก" ไม่ใช่ความกว้างหัว — หมวกบังกะโหลกจนวัดหัวไม่ได้
2. จุดยึดแนวนอนกัดภาพให้แส้หายก่อน — แส้ที่สะบัดออกไปทางเดียวลากจุดศูนย์กลางมวลตามไปด้วย
3. สเกลยึด "คางถึงพื้นรองเท้า" ไม่ใช่ความสูงทั้งตัว — หมวกกินความสูงไปราว 12%
   ถ้ายึดความสูงทั้งตัว ลำตัวเธอจะถูกย่อจนเตี้ยกว่าอีกสองคนอย่างเห็นได้ชัด

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_alecto.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from alecto_sheets import LAYOUT, body_anchor, extract, hat_sqrt

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240          # ตัวหารของสเกลในเกม เท่ากับ Nyx/Helios
GROUND, AIR = "ground", "air"

SEQ = {
    # ---- จากสตริปคลิป (ช่อง 0 = ยืน · 1-10 = วิ่งหนึ่งรอบ) ----
    "idle": ("clip", [0], GROUND),
    "run":  ("clip", list(range(1, 11)), GROUND),

    # ---- ชีต A: ท่าเคลื่อนไหวและท่าโดน ----
    "jump":        ("A", [2, 3, 4, 5], AIR),   # ถีบพื้น -> ลอย -> ร่วง -> ย่อรับพื้น
    "crouch":      ("A", [1], GROUND),
    "hurt":        ("A", [6], GROUND),
    "knockdown":   ("A", [7], GROUND),
    "techroll":    ("A", [8], GROUND),
    "tech":        ("A", [7], GROUND),
    "block":       ("A", [9], GROUND),
    "blockstun":   ("A", [9], GROUND),
    "blockcrouch": ("A", [1], GROUND),

    # ---- ชีต B: ชุดแย็บปืน ----
    # **แถว 2 ของใบที่เจนมาเล็งย้อนหลัง** (ปืนซ้ายชี้ไปทางซ้าย) ขณะที่กระสุนในเกมพุ่งไปหน้า
    # เล่นจริงจะเห็นเธอยิงไปทางตรงข้ามกับลูกที่ออก จึงใช้แถว 1 ซ้ำไปก่อน
    # ชุดแย็บสองจังหวะที่ใช้อาร์ตชุดเดียวกันเป็นเรื่องปกติ ดีกว่าเล็งผิดทาง
    "jab1": ("B", [1, 2, 3], GROUND),
    "jab2": ("B", [1, 2, 3], GROUND),
    # แถว 3 ยิงออกสองข้างซ้าย-ขวา ที่สั่งไปคือยิงไปหน้าพร้อมกันสองกระบอก
    # ยังใช้ได้เพราะอ่านออกว่า "ยิงสองกระบอกพร้อมกัน" ซึ่งตรงกับที่ท่านี้ยิงจริงสองนัด
    "jab3": ("B", [7, 8, 9], GROUND),

    # ---- ชีต C: ปืนกดทิศ ----
    "side": ("C", [1, 2, 3], GROUND),          # ถอยพลางยิงพลาง
    "up":   ("C", [4, 5, 6], GROUND),          # ยิงเฉียงขึ้นสวนคนกระโดด
    "down": ("C", [7, 8, 9], GROUND),          # ย่อยิงต่ำ

    # ---- ชีต D: ปืนกลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    # **แถว 3 ที่เจนมายิงตรง ไม่ใช่ยิงลงชันอย่างที่สั่ง** จึงดูไม่ต่างจากแถว 1
    # ยังใช้ไปก่อนเพราะมีเฟรมดีกว่าไม่มี แต่ท่านี้ควรเจนใหม่
    "dair": ("D", [7, 8, 9], AIR),

    # ---- สามท่าหาง (ดีไซน์ใหม่) — ชีต E/E2 ของ art_reference/alecto_sheets_new ----
    # เอาคนละแถวจากคนละใบ: ตะขอจาก E2 (หางพาดลำตัวแข็งเหมือนหอก ปลายเป็นจุดไกลสุด)
    # อีกสองแถวจาก E (ใบ E2 มีเส้นเอฟเฟคม่วงวาดติดมาจนดูเหมือนมีหางสองเส้นตอนตัดพื้นออก)
    "hook1":  ("E2", [1, 2, 3], GROUND),
    "slam1":  ("Enew", [4, 5, 6], GROUND),
    "quill1": ("Enew", [7, 8, 9], GROUND),


    # ---- ชีต F: มอลอตอฟ (สกิล 2) ----
    "fire1": ("F", [1, 2, 3], GROUND),         # ควักขวด -> จุดไฟ -> ยกขึ้น
    "fire2": ("F", [4, 5, 6], GROUND),         # เงื้อ -> ขว้าง -> ตามแรง

    # ---- ชีต G: ทอมมี่กัน (อัลติ) ----
    # ---- อัลติ Dust Devil: ควักถุงฝุ่น -> ปาลงพื้น -> ย่อรออยู่ในวง
    # ใช้ท่าของชีต F (มอลอตอฟ) กับท่านั่ง ไม่ได้เจนอาร์ตใหม่สักท่า
    "dust1": ("F", [1, 2, 3], GROUND),
    "dust2": ("F", [4, 5, 6], GROUND),

    # ---- ชีต H: ท่าถอย (กระโดดถอย 3 ท่า · กลิ้งถอย 3 ท่า) ----
    "hop":  ("F", [1, 2, 3], GROUND),
    "roll": ("F", [4, 5, 6], GROUND),
}

# ---------- อ่านสตริปคลิป ----------
strip_meta = json.load(open(os.path.join(REF, "alecto_clip_strip.json")))
CW_STRIP, CH_STRIP = strip_meta["cell_w"], strip_meta["cell_h"]
strip = Image.open(os.path.join(REF, "alecto_clip_strip.png")).convert("RGBA")
N_CELLS = strip.width // CW_STRIP


def clip_cell(n):
    cell = strip.crop((n * CW_STRIP, 0, (n + 1) * CW_STRIP, CH_STRIP))
    m = np.asarray(cell)[:, :, 3] > 110
    return cell, m


# ---------- สเกลสัมบูรณ์: ยึดหมวก ไม่ใช่คาง ----------
#
# **เดิมยึด "คางถึงพื้นรองเท้า"** ซึ่งใช้ได้กับคาวเกิร์ลคนเดิมที่เห็นคางเต็ม ๆ
# ดีไซน์ใหม่มีผ้าคลุมปิดปากกับคาง ตัวหาคาง (`chin_y`) จึงไปจับ**เงาใต้ปีกหมวก**แทน
# ซึ่งเป็นน้ำตาลที่เข้าเกณฑ์สีผิวพอดีและก้อนใหญ่กว่าหน้าที่โผล่มาแค่แถบแคบ
# วัดจริงกับท่ายืนใบใหม่ได้คางถึงเท้า 79% ของความสูงตัว ขณะที่เกณฑ์คือ 62%
# ลองเปลี่ยนไปเอา "ก้อนสีผิวที่ต่ำที่สุด" แทนก้อนใหญ่สุดก็ยังได้ 55% — ปะไม่ได้
# เพราะ**คางไม่ได้โผล่เลย** ก้อนสีผิวในครึ่งบนแตกเป็นแปดก้อนและไม่มีก้อนไหนเป็นคาง
#
# เปลี่ยนมายึด `hat_sqrt` ซึ่งเป็นไม้บรรทัดเดียวกับที่ใช้เทียบชีตอยู่แล้ว
# ทั้งไปป์ไลน์จึงเหลือไม้บรรทัดเดียว และค่าชดเชย `IVORY_K` ตัดกันหายไปเอง
# (สเกลชีต = TARGET_HAT/hat_clip x hat_clip/hat_sheet = TARGET_HAT/hat_sheet)
#
# TARGET_HAT มาจากการวัดย้อนกลับ: ชีต E ที่ตรวจแล้วว่าตัวสูงเท่าโรสเตอร์พอดี
# ใช้สเกล 0.9836 กับหมวกที่วัดได้ 22.5 (ค่าดิบ ไม่มีตัวชดเชยแล้ว) -> 22.2
TARGET_HAT = 22.2

idle_cell, idle_mask = clip_cell(0)
idle_rgb = np.asarray(idle_cell)[:, :, :3].astype(int)
ys = np.nonzero(idle_mask.any(axis=1))[0]
CLIP_HAT = hat_sqrt(idle_rgb, idle_mask)
SRC_SCALE = {"clip": TARGET_HAT / CLIP_HAT}
print(f"คลิป: หมวก {CLIP_HAT:.1f} -> สเกล {SRC_SCALE['clip']:.4f} "
      f"(ตัวสูง {ys.max() - ys.min() + 1} px -> {(ys.max() - ys.min() + 1) * SRC_SCALE['clip']:.0f} px)")

HEIGHT_RULER = set()   # เคยมีชีต I ที่วาดด้านข้างล้วนจนปีกหมวกหุบ ถอดไปแล้ว


def mask_h(m):
    ys = np.nonzero(m.any(axis=1))[0]
    return ys.max() - ys.min() + 1


CLIP_RUN_H = float(np.median([mask_h(clip_cell(n)[1]) for n in range(1, 11)]))

# ---------- อ่านชีต แล้วปรับสเกลให้เท่าคลิป ----------
# ระหว่างเปลี่ยนตัวละคร: ชีตชุดเดิมอยู่ใน alecto_sheets/ ชีตดีไซน์ใหม่อยู่ใน alecto_sheets_new/
# ทั้งสองชุดถูกอ่านพร้อมกันจนกว่าจะเจนชุดใหม่ครบ แล้วค่อยลบฝั่งเดิมทิ้ง
# ชีตชุดเดิม (คาวเกิร์ลผมแดง) ถูกถอดออกหมดแล้ว เหลือแต่ดีไซน์ใหม่
SHEET_SRC = {L: ("alecto_sheets_new", f"sheet_{L}.jpg") for L in "ABCDF"}
SHEET_SRC["Enew"] = ("alecto_sheets_new", "sheet_E.jpg")
SHEET_SRC["E2"] = ("alecto_sheets_new", "sheet_E2.jpg")

SHEETS = {}
for L, (folder, fn) in SHEET_SRC.items():
    arr, poses = extract(os.path.join(REF, folder, fn), *LAYOUT[L])
    assert all(p is not None for p in poses), f"ชีต {L} มีช่องว่าง"
    if L in HEIGHT_RULER:
        med = float(np.median([mask_h(m) for m, _ in poses]))
        SRC_SCALE[L] = SRC_SCALE["clip"] * (CLIP_RUN_H / med)
        print(f"ชีต {L}: สูงมัธยฐาน {med:.0f} -> สเกล {SRC_SCALE[L]:.4f} "
              f"({CLIP_RUN_H/med:.3f} เท่าของคลิป · วัดด้วยความสูง)")
    else:
        hs = [hat_sqrt(arr, m) for m, _ in poses]
        # เดิมกรองด้วยค่าคงที่ `h > 20` ซึ่งเผื่อไว้สำหรับชีตชุดเดิมที่หมวกวัดได้ราว 90
        # ชีตดีไซน์ใหม่วัดได้ 21-23 ทั้งใบ (ตัวละครถูกวาดเล็กกว่าในไฟล์ต้นฉบับราว 4 เท่า)
        # ค่าคงที่นี้จึงเกือบตัดทั้งใบทิ้ง — เปลี่ยนเป็นตัดเฉพาะท่าที่หลุดจากพวกเดียวกันเอง
        rough = float(np.median([h for h in hs if h > 0]))
        med = float(np.median([h for h in hs if h > rough * 0.5]))
        SRC_SCALE[L] = SRC_SCALE["clip"] * (CLIP_HAT / med)
        print(f"ชีต {L}: หมวกมัธยฐาน {med:.0f} -> สเกล {SRC_SCALE[L]:.4f} ({CLIP_HAT/med:.3f} เท่าของคลิป)")
    SHEETS[L] = (arr, poses)


def source(src, n):
    """คืน (ภาพ RGBA ครอปพอดีตัว, จุดยึดแนวนอนในภาพที่ครอปแล้ว)"""
    if src == "clip":
        cell, m = clip_cell(n)
        ys, xs = np.nonzero(m)
        crop = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        return crop, body_anchor(m) - xs.min()
    arr, poses = SHEETS[src]
    m = poses[n - 1][0]
    ys, xs = np.nonzero(m)
    # arr ถูกตัดพื้นและถอดขอบมาแล้ว เหลือแค่กันไม่ให้พิกเซลของท่าข้าง ๆ ติดมาด้วย
    rgba = arr.copy()
    rgba[:, :, 3] = np.where(m, arr[:, :, 3], 0)
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m) - xs.min()


staged = {}
for name, (src, nums, kind) in SEQ.items():
    sc = SRC_SCALE[src]
    for i, n in enumerate(nums, 1):
        crop, com = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        base = h if kind == GROUND else h / 2 + STANDING / 2
        staged[f"{name}_{i}.png"] = (im, com * sc, base)
print(f"\nท่าทั้งหมด {len(staged)} เฟรม")

PAD = 14
left = max(c for _, c, _ in staged.values())
right = max(im.width - c for im, c, _ in staged.values())
top = max(b for _, _, b in staged.values())
bottom = max(im.height - b for im, _, b in staged.values())
CW, CH = round(left + right) + PAD * 2, round(top + bottom) + PAD * 2
ANCHOR_X, FEET_Y = round(left) + PAD, round(top) + PAD
print(f"canvas {CW}x{CH}  จุดยึด x={ANCHOR_X} เท้า y={FEET_Y}")

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
sheet.save(os.path.join(OUT, "scramble_alecto.png"))
json_path = os.path.join(OUT, "scramble_alecto.json")
json.dump({"frames": frames,
           "meta": {"image": "scramble_alecto.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(json_path, "w"), indent=1)
print(f"เขียนแล้ว (แถวเดียว): scramble_alecto.png {sheet.size}")

# ---------- ห่อเป็นหลายแถวให้ไม่เกินลิมิตเท็กซ์เจอร์ ----------
#
# **ตัว build ตัวนี้เคยไม่มีขั้นนี้ ต่างจาก builder ของตัวอื่นทุกตัว** ไฟล์ที่คอมมิตไว้
# เป็นแบบหลายแถว (2047x3182) แปลว่าเคยถูกแพ็กด้วยมือตอนไหนสักตอน ใครรีบิลด์หลังจากนั้น
# จะได้แถบยาว 61,182 px ซึ่งเกินลิมิต 4096 ไป 15 เท่า **แล้วเรนเดอร์เป็นกล่องดำทับตัวละคร
# โดยไม่มี error อะไรเลย** เจอตอนต่อชีตหางใบใหม่เข้าเกมแล้วเห็นเป็นกล่องดำ
GPU_LIMIT = 4096
sys.path.insert(0, HERE)
from repack_atlas import repack
repack(json_path, max_w=GPU_LIMIT)
