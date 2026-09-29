"""สร้าง atlas ของ MARCH จากคลิปท่าวิ่งและชีตท่า A-J

ชื่อไฟล์ที่ออกยังเป็น `scramble_helios` เพราะ **`id` ของตัวละครยังเป็น `helios`**
ซึ่งห้ามเปลี่ยน — มันคือคีย์ของอัตลาสใน `ScrambleScene.js` และค่าที่ส่งข้ามเน็ตตอนเลือกตัว
(ของเดิมอยู่ที่ `build_scramble_helios.py` เก็บไว้เผื่อย้อนกลับ)

## ไม้บรรทัดวัดระยะกล้อง: `body_sqrt` (รากที่สองของพื้นที่ตัว)

**ตัวนี้ใช้ไม้บรรทัดสีแบบ DEAR ไม่ได้** DEAR วัดจากผมส้ม เพราะสีนั้นมีอยู่ที่เดียวบนตัว
ของ MARCH **ผมดำ เสื้อดำ ผ้าคาดเอวดำ ถุงมือดำ รองเท้าดำ** — ทุกอย่างสีเดียวกันหมด

ลองวัด "ก้อนดำที่ใหญ่ที่สุดในตัว" โดยหวังว่าจะได้ผม แล้วเปิดมาสก์ออกมาดูจริง:
มันจับผม+เสื้อ+ผ้าคาด+ถุงมือ+รองเท้าติดกันเป็นก้อนเดียว **กินพื้นที่ 49-66% ของทั้งตัว**
และในท่าเตะของใบ G รองเท้าก็เชื่อมเข้ามาด้วย ค่าจึงเพี้ยนเฉพาะใบนั้น
(นี่คือบทเรียนเดิมของ DEAR ซ้ำอีกรอบ: **เกณฑ์สีต้องเปิดมาสก์ออกมาดูว่ามันเลือกอะไรจริง ๆ**
ตัวเลขการกระจายอย่างเดียวบอกไม่ได้ — ก้อนผิดตัวนั้นให้การกระจาย 7-16% ซึ่งดูดีกว่าของจริงด้วยซ้ำ)

จึงกลับมาใช้พื้นที่ตัวทั้งตัว และ **ยืนยันด้วยไม้บรรทัดอิสระสี่อันที่สร้างจากคนละบริเวณสี**
(พื้นที่ตัว · ผิว · กางเกงขาว · พิกเซลดำทั้งหมด) ทั้งสี่ให้คำตอบตรงกันว่า:

    ใบ A B C D F H J อยู่กล้องเดียวกัน (ต่างกันไม่เกิน ~10%)
    ใบ E G I ใหญ่กว่าราว 1.45-1.60 เท่า  (ใบท่าน้อย เจนมาตัวใหญ่กว่า)

การกระจายในใบของ `body_sqrt` อยู่ที่ 2.4-9.9% ยกเว้นใบ A ที่ 17.7% เพราะมีท่านอน/ม้วน
ค่าที่เอาไปใช้คือ **มัธยฐานของทั้งใบ** ซึ่งนิ่งพอ — และใบ A ที่ไม้บรรทัดสี่อันให้ 1.04-1.13
ก็แปลว่าความไม่แน่นอนของใบนั้นอยู่ที่ ~8% ไม่ใช่ 17.7%

## ชีตเจนมาเกินที่สั่งเกือบทุกใบ

สั่ง A=12 B=9 J=12 แต่ได้ 15 ทั้งสามใบ ใบ E สั่ง 9 ได้ 8
จึงต้อง **เลือกท่าเอง ไม่ใช่ไล่ 1-2-3 ตามลำดับ** เกณฑ์ที่ใช้เลือกคือ:

เฟรมกลางของทุกท่าโจมตีต้องเป็นเฟรมที่ **แขนเหยียดสุด** เพราะเอนจินเลือกเฟรมจาก `phase()`
(`{startup:1, active:2, recovery:3}`) เฟรมกลางจึงตรงกับช่วงที่กล่องชนเปิดพอดี
วัด "ระยะเอื้อม" = ความกว้างกรอบของท่า แล้วจัดให้ยอดอยู่กลางเสมอ

ใบ E ขาดท่าที่ 9 ไป — **ท่าแรกของใบ F คือท่านั้น** (prompt สั่งรอยต่อไว้ว่าท่าสุดท้าย
ของ E ต้องเป็นท่าเดียวกับท่าแรกของ F) `rush3` จึงจบด้วย `F:1` แล้ว `rush4` เริ่มด้วยเฟรมเดียวกัน
ซึ่งเป็นสิ่งที่คำสั่งรอยต่อต้องการพอดี: มือที่ชักกลับ = มือที่กำลังจะออก

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_march.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from orpheus_sheets import split

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "art_reference")
SHEETS_DIR = os.path.join(REF, "helios_sheets")
CLIP_DIR = os.path.join(REF, "helios_clip")
IDLE_IMG = os.path.join(REF, "helios_idle_APPROVED_v2.jpg")
OUT = os.path.join(HERE, "..", "assets", "characters")

STANDING = 240            # ความสูงท่ายืนหลังย่อ — เท่ากับตัวอื่นให้ทุกตัวสูงเท่ากันบนเวที
STAND_SRC = ("I0", 1)     # ภาพเดี่ยวที่อนุมัติไว้ ใช้ตั้งสเกลสัมบูรณ์ของทั้งตัว
GROUND, AIR = "ground", "air"
LETTERS = ["I0", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

# (แหล่ง, ลิสต์เลขท่า, ชนิดการจัดตำแหน่ง)
#   เลขท่าเป็น int = ท่าที่ n ของแหล่งนั้น · เป็น "X:n" = ข้ามไปหยิบท่าที่ n ของใบ X
#   ชนิดเป็น str = ใช้กับทุกเฟรม · เป็นลิสต์ = กำหนดทีละเฟรม
SEQ = {
    "idle": ("I0", [1], GROUND),
    "run":  ("clip", list(range(1, 12)), GROUND),

    # ---- ชีต A (15 ท่า เลือกใช้ 12) ----
    "jump":        ("A", [1, 2, 3, 4], AIR),   # ถีบขึ้น -> หดสุด -> ร่วง -> ตั้งรับพื้น
    "hurt":        ("A", [5], GROUND),         # กัดฟันสะบัดถอย
    "knockdown":   ("A", [6], GROUND),         # นอนคว่ำกับพื้น
    "techroll":    ("A", [7], GROUND),         # ม้วนตัว
    "tech":        ("A", [9], GROUND),         # ยันเข่าลุกขึ้น
    "block":       ("A", [13], GROUND),        # ไขว้แขนบังหน้า ยืนถ่างขา
    "blockstun":   ("A", [12], GROUND),        # กันแล้วไถลถอย
    "crouch":      ("A", [14], GROUND),
    "blockcrouch": ("A", [15], GROUND),

    # ---- ชีต B แย็บสามจังหวะ (15 ท่า เลือกใช้ 9 — ทุกจังหวะเริ่มจากการ์ด ยอดอยู่กลาง) ----
    "jab1": ("B", [1, 3, 2], GROUND),          # การ์ด 150 -> สุดแขน 223 -> ชักกลับ 186
    "jab2": ("B", [7, 6, 8], GROUND),          # การ์ด 168 -> สุดแขน 211 -> ชักกลับ 198
    "jab3": ("B", [12, 15, 13], GROUND),       # การ์ด 158 -> สุดแขน 221 -> ชักกลับ 205

    # ---- ชีต C ท่าพิเศษบนพื้น ----
    "side": ("C", [1, 2, 3], GROUND),          # พุ่งต่อย
    "up":   ("C", [4, 5, 6], GROUND),          # อัปเปอร์
    "down": ("C", [7, 8, 9], GROUND),          # กวาดขา

    # ---- ชีต D ท่ากลางอากาศ ----
    "nair": ("D", [1, 2, 3], AIR),
    "sair": ("D", [4, 5, 6], AIR),
    "dair": ("D", [7, 8, 9], AIR),

    # ---- ชีต E+F: Chain Rush (สกิล 1) ----
    # ใบ E มี 8 ท่า ท่าที่ 9 คือท่าแรกของใบ F (ดู docstring หัวข้อรอยต่อ)
    "rush1":    ("E", [1, 2, 3], GROUND),
    "rush2":    ("E", [4, 5, 6], GROUND),
    "rush3":    ("E", [7, 8, "F:1"], GROUND),  # ศอกเงื้อ -> ศอกอัด -> พับแขนส่งต่อ
    "rush4":    ("F", [1, 2, 3], GROUND),      # รับช่วงจาก rush3 -> ฮุก -> ฮุกผ่าน
    "rush5":    ("F", [4, 5, 6], GROUND),      # เงื้อหลังมือ -> หลังมือโดน -> ชักกลับ
    "rushEndF": ("F", [7, 8, 9], GROUND),      # เงื้อหมัด -> หมัดตรงสุดแรง -> ส่งแรงตาม

    # ---- ชีต G: ไม้จบอีกสองทาง ----
    "rushEndU": ("G", [1, 2, 3], GROUND),      # เตะยกขึ้น
    "rushEndD": ("G", [4, 5, 6], GROUND),      # กวาดลงต่ำ

    # ---- ชีต H+I: SKY DRIVE (สกิล 2) ----
    "sky1": ("H", [1, 2, 3], GROUND),          # ย่อ -> ชกขึ้นยกคาง -> ลอยตาม
    # ใบ H แถวกลาง (ท่า 4-6) **ไม่ได้เจนท่าศอกมาให้** ที่สั่งไปคือ "ศอกกลางอากาศ"
    # แต่ที่ได้คือ ท่า 4 = แขนชูขึ้นสุด (ท่าต่อจากอัปเปอร์ของแถวแรก) · ท่า 5 กับ 6 = การ์ดลอยเฉย ๆ
    # เรียงตามลำดับ 4-5-6 จึงได้ "เฟรมกลาง = การ์ด" = ช่วงที่กล่องชนเปิดอยู่ไม่มีอะไรเคลื่อนเลย
    # เล่นจริงจึงเห็นเป็น "สกิล 2 ไม่มีเฟรม" (ผู้เล่นรายงานมาแบบนี้ตรง ๆ)
    #
    # สลับเป็น 5-4-6 = การ์ด -> แขนพุ่งขึ้น -> การ์ด ซึ่งเป็นสามจังหวะที่ตาอ่านออกว่าตี
    # และวางเฟรมเดียวที่แขนเหยียดไว้ตรงกลางตามกฎเดิมของทั้งอัตลาส
    # **นี่คือการแก้เท่าที่อาร์ตที่มีทำได้ ไม่ใช่ท่าศอกจริง** — ท่าศอกต้องสั่งชีตใหม่สามท่า
    "sky2": ("H", [5, 4, 6], AIR),
    "sky3": ("H", [7, 8, 9], AIR),
    "sky4": ("I", [1, 2, 3], AIR),
    # ท่าตบลง: เงื้อสองหมัดกลางอากาศ -> อัดพื้นย่อลึก -> ตั้งหลัก
    # เฟรมแรกลอย เฟรมที่เหลือติดพื้น — การสลับจุดยึดตรงนี้คือจังหวะกระแทกพื้นพอดี
    "sky5": ("I", [4, 5, 6], [AIR, GROUND, GROUND]),

    # ---- ชีต J: อัลติ Hundred Hands (15 ท่า เลือกใช้ 12) ----
    # `hh2`/`hh3` ถูกเล่นวนซ้ำตอนกดรัว จึงเลือกให้เฟรมท้ายของ hh3 แคบเท่าเฟรมแรกของ hh2
    "hh1":   ("J", [1, 2, 3], GROUND),         # เงื้อสองหมัด 143 -> ออกหมัดแรก 200 -> ชัก 189
    "hh2":   ("J", [11, 6, 7], GROUND),        # 150 -> 211 -> 201
    "hh3":   ("J", [10, 13, 9], GROUND),       # 170 -> 201 -> 157 (ยกหมัดระดับคาง วนกลับเข้า hh2)
    "hhEnd": ("J", [12, 14, 15], GROUND),      # เงื้อสุด -> หมัดปิดกัดฟัน -> ส่งแรงตาม
}

# ---------- อ่านชีต ----------
SHEETS, RULER = {}, {}
for L in LETTERS:
    path = IDLE_IMG if L == "I0" else os.path.join(SHEETS_DIR, f"sheet_{L}.jpg")
    arr, masks = split(path)
    assert masks, f"ชีต {L} แยกท่าไม่ออก"
    SHEETS[L] = (arr, masks)
    RULER[L] = float(np.median([np.sqrt(np.count_nonzero(m)) for m in masks]))

_arr, _masks = SHEETS[STAND_SRC[0]]
_ys = np.nonzero(_masks[STAND_SRC[1] - 1].any(axis=1))[0]
SRC_SCALE = {}
_base = STANDING / (_ys.max() - _ys.min() + 1)
for L in LETTERS:
    SRC_SCALE[L] = _base * (RULER[STAND_SRC[0]] / RULER[L])
    print(f"ชีต {L:2s}: {len(SHEETS[L][1]):2d} ท่า · ไม้บรรทัด {RULER[L]:6.1f} -> สเกล {SRC_SCALE[L]:.4f}")

# ---------- คลิปท่าวิ่ง ----------
CLIP = json.load(open(os.path.join(CLIP_DIR, "clip.json")))
CLIP_SCALE = STANDING / CLIP["stand_h"]
print(f"คลิป: ท่ายืน {CLIP['stand_h']} px -> สเกล {CLIP_SCALE:.4f}\n")


def source(src, n):
    if src == "clip":
        im = Image.open(os.path.join(CLIP_DIR, f"run_{n:02d}.png")).convert("RGBA")
        return im, CLIP["anchor"][n - 1], CLIP["base"][n - 1] * CLIP_SCALE, CLIP_SCALE
    if isinstance(n, str):
        src, n = n.split(":")
        n = int(n)
    arr, masks = SHEETS[src]
    m = masks[n - 1]
    ys, xs = np.nonzero(m)
    rgba = np.dstack([arr[:, :, :3], np.where(m, 255, 0)]).astype("uint8")
    crop = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return crop, body_anchor(m, erode=31) - xs.min(), None, SRC_SCALE[src]


staged = {}
for name, (src, nums, kind) in SEQ.items():
    kinds = kind if isinstance(kind, list) else [kind] * len(nums)
    assert len(kinds) == len(nums), f"{name}: ชนิดการจัดตำแหน่งไม่เท่าจำนวนเฟรม"
    for i, (n, k) in enumerate(zip(nums, kinds), 1):
        crop, com, fixed_base, sc = source(src, n)
        w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
        im = crop.resize((w, h), Image.LANCZOS)
        # ท่าบนพื้นยึดเท้า (ขอบล่าง) · ท่าลอยยึดกึ่งกลางตัวให้ตรงกับกึ่งกลางตัวตอนยืน
        # ยึดเท้ากับท่าลอยจะทำให้ท่าหดขาจมพื้น ส่วนยึดกลางกับท่ายืนจะทำให้ลอยสูงผิดปกติ
        base = fixed_base if fixed_base is not None else (h if k == GROUND else h / 2 + STANDING / 2)
        staged[f"{name}_{i}.png"] = (im, com * sc, base)
print(f"ท่าทั้งหมด {len(staged)} เฟรม")

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
sheet.save(os.path.join(OUT, "scramble_helios.png"))
json_path = os.path.join(OUT, "scramble_helios.json")
json.dump({"frames": frames,
           "meta": {"image": "scramble_helios.png", "size": {"w": sheet.width, "h": sheet.height},
                    "scale": "1", "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
                    "canvasW": CW, "canvasH": CH}},
          open(json_path, "w"), indent=1)
print(f"เขียนแล้ว (แถวเดียว): scramble_helios.png {sheet.size}")

# **เกิน 4096 ด้านใดด้านหนึ่ง = การ์ดจอหลายรุ่นเรนเดอร์เป็นสีดำล้วน และไม่มี error ให้เห็น**
from repack_atlas import repack
GPU_LIMIT = 4096
repack(json_path, max_w=GPU_LIMIT)
final = json.load(open(json_path))["meta"]["size"]
if max(final["w"], final["h"]) > GPU_LIMIT:
    raise SystemExit(f"!! atlas {final['w']}x{final['h']} เกินลิมิต {GPU_LIMIT} — ต้องลดเฟรมหรือ STANDING")
print(f"atlas สุดท้าย {final['w']}x{final['h']} (ลิมิต {GPU_LIMIT})")


# ---------- ตรวจว่าค่า runStride ในฉากตรงกับ "จำนวนก้าวต่อหนึ่งรอบ" ของคลิปจริง ----------
#
# `ScrambleScene.js` ตั้งเวลาต่อรอบของท่าวิ่งจาก runStride = ระยะที่เท้าเคลื่อนได้ "หนึ่งรอบ"
# ถ้าคลิปเป็นวงจรเดินเต็ม (สองก้าว) แต่ค่าถูกคิดมาแบบก้าวเดียว รอบจะจบเร็วไปเท่าตัว
# เห็นเป็นสับขาไวเกิน **และไม่มีอะไรฟ้องเลย** เพราะทั้งสองฝั่งต่างก็ทำงานถูกตามที่เขียนไว้
# (พลาดมาแล้วรอบหนึ่งตอนเปลี่ยนคลิป: คลิปเดิมก้าวเดียว คลิปใหม่สองก้าว ค่าเดิมถูกย่อตามสัดส่วนมา)
#
# วิธีนับจำนวนก้าว: เทียบ IoU ของ "เฟรมติดกัน" กับ "เฟรมที่ห่างกันครึ่งรอบ"
# วงจรสองก้าว ครึ่งรอบหลังจะซ้ำครึ่งรอบแรก คู่ที่ห่างครึ่งรอบจึงเหมือนกันมากกว่าคู่ที่ติดกัน
# (ชุดนี้ 0.783 เทียบ 0.684 · ชุดเดิมที่เป็นก้าวเดียว 0.626 เทียบ 0.800 — แยกขาดทั้งสองทาง)
# ไม่นับยอดถ่างขาเพราะยอดปลอมจากการสุ่มเฟรมทำให้นับได้ 3 ยอดในวงจรสองก้าว
SPRITE_H = 130          # ต้องตรงกับค่าใน ScrambleScene.js
_run = [staged[f"run_{i}.png"] for i in range(1, 12)]
_m = []
for im, com, base in _run:
    c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    c.paste(im, (round(ANCHOR_X - com), round(FEET_Y - base)), im)
    _m.append(np.array(c)[:, :, 3] > 40)


def _iou(a, b):
    return float((a & b).sum()) / max(int((a | b).sum()), 1)


_n = len(_m)
_adj = np.mean([_iou(_m[i], _m[(i + 1) % _n]) for i in range(_n)])
_half = np.mean([_iou(_m[i], _m[(i + _n // 2) % _n]) for i in range(_n)])
_steps = 2 if _half > _adj else 1
# ระยะถ่างขาสูงสุดของทั้งรอบ วัดจากแถบล่าง 22% ของตัว (ช่วงขา) ไม่ใช่ความกว้างทั้งตัวที่รวมแขน
_spread = 0
for m in _m:
    ys, xs = np.nonzero(m)
    h = ys.max() - ys.min() + 1
    leg = m[ys.max() - int(h * 0.22):ys.max() + 1, :]
    lx = np.nonzero(leg.any(axis=0))[0]
    _spread = max(_spread, int(lx.max() - lx.min() + 1))
_want = round(_spread * SPRITE_H / STANDING * _steps)
_scene = os.path.join(HERE, "..", "src", "modes", "scramble", "ScrambleScene.js")
_js = open(_scene, encoding="utf-8").read()
_helios = _js.split("helios: {", 1)[1].split("},", 1)[0]
_have = int(__import__("re").search(r"runStride:\s*(\d+)", _helios).group(1))
print(f"ท่าวิ่ง: {_steps} ก้าวต่อรอบ (ติดกัน {_adj:.3f} · ครึ่งรอบ {_half:.3f}) · "
      f"ถ่างขาสูงสุด {_spread} px -> runStride ควรเป็น {_want} · ในฉากตั้งไว้ {_have}")
if abs(_have - _want) > _want * 0.08:
    raise SystemExit(f"!! runStride ในฉาก ({_have}) ไม่ตรงกับคลิป ({_want}) เกิน 8% — "
                     f"ท่าวิ่งจะสับขาผิดจังหวะกับความเร็วที่เคลื่อนจริง")
