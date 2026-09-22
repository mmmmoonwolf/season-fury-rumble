"""
สร้าง atlas ของ Nyx สำหรับโหมด SCRAMBLE

ทำไมแยกจาก build_b1989.py: คนละชุดอาร์ตกันคนละสไตล์ (ชุดนี้เป็นชิบิเส้นหนา มีเส้นขอบมาในตัว
จึงไม่ต้องเติม add_outline) และคนละระบบพิกัด — SCRAMBLE มีเวทีของตัวเองที่ 1280x720
ตัวละครสูง PHYS.standH = 118 px ไม่ได้ใช้ WORLD_HEIGHT/standingHeightInFrame ของเกมเดิมเลย

รัน (จากโฟลเดอร์ game):  python3 tools/build_scramble_nyx.py
เฟรมดิบอยู่ที่ SCRAMBLE_RAW (นอก repo ตาม .gitignore)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from cut import cutout

RAW = os.environ.get("SCRAMBLE_RAW", "/tmp/sc")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")

# เก็บที่ 300 px จากเท้าถึงยอดกรอบตัวในท่ายืน — บนจอตัวละครสูงราว 120-150 px (standH = 118)
# เก็บใหญ่กว่าราวสองเท่าจึงคมทั้งบนจอ 720p และจอใหญ่ที่ canvas ถูกขยายขึ้นไป
STANDING = 300
PAD = 6

# ช่วงลูปหาด้วยการจับคู่เฟรมที่เหมือนกันที่สุด "หลังจัดกึ่งกลางแล้ว"
# ต้องจัดกึ่งกลางก่อน ไม่งั้น root motion ในคลิปจะหลอกให้ทุกเฟรมดูต่างกันหมด
SEQ = {
    "idle": ("idle",  range(14, 22)),   # คาบ 8 เฟรม
    "walk": ("walkB", range(1, 25)),    # ใช้ทั้งคลิป — ตัดเหลือ 8 เฟรมแล้วขาแทบไม่ขยับ
    "run":  ("run",   range(49, 70)),   # คาบ 21 เฟรม
    # โดนตี: f21-36 สะบัดรับแรง, f41-56 เซถอย — เล่นครั้งเดียวไม่วน ค้างเฟรมสุดท้ายถ้า hitstun ยาวกว่า
    "hurt": ("hitstun", range(21, 59, 4)),
}

# เฟรมอ้างอิงสเกล — "ต่อคลิป" ไม่ใช่ตัวเดียวทั้ง build
# คลิปแต่ละชุดถ่ายมาคนละระยะ: ชุดยืน/เดิน/วิ่ง ตัวสูง ~627 px (86% ของเฟรม)
# ส่วนชุดโดนตี ตัวสูง ~295 px (43%) ถ้าใช้สเกลเดียวกันหมด ตัวจะเล็กลงครึ่งหนึ่งตอนโดนตี
# เฟรมที่เลือกต้องเป็น "ท่ายืนตั้งการ์ด" เหมือนกันทุกคลิป ไม่งั้นเทียบความสูงกันไม่ได้
CLIP_REF = {
    "idle": "idle/f_014.png",
    "walkB": "idle/f_014.png",   # คลิปเดินถ่ายระยะเดียวกับคลิปยืน
    "run": "idle/f_014.png",
    "hitstun": "hitstun/f_001.png",  # f1-16 เป็นท่ายืนก่อนโดนตี ใช้เทียบได้
}

def frame_data(path):
    """คืน (ภาพที่ตัดพื้นแล้ว, กรอบตัว, จุดกึ่งกลางหัว, จุดศูนย์กลางมวล)"""
    im, fg = cutout(path)
    ys, xs = np.nonzero(fg)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    # ยึดตำแหน่งแนวนอนด้วย "จุดศูนย์กลางมวล" (ค่าเฉลี่ย x ของพิกเซลตัวละคร)
    # วัดความส่ายในคลิปวิ่งของทุกวิธีแล้ว: หัว 4.1 px, ศูนย์กลางมวล 5.9, กรอบตัว 15.3, เท้า 72.6
    # หัวนิ่งกว่าเล็กน้อยจริง แต่หัวล้ำไปข้างหน้าลำตัวมาก (ตัวละครโน้มตัว) วางหัวไว้กลาง hurtbox
    # แล้วลำตัวกับขาจะไปกองอยู่นอกกรอบ — ศูนย์กลางมวลอยู่กลางลำตัวโดยนิยาม และต่างกันแค่ 1.8 px
    # ที่สเกลต้นฉบับ = ไม่ถึง 1 px บนจอ แลกกันคุ้ม
    return im, box, float(xs.mean()), float(xs.mean())


# สเกลของแต่ละคลิป = ทำให้ "ท่ายืน" ของคลิปนั้นสูงเท่ากับ STANDING เสมอ
SCALE = {}
for clip, ref in CLIP_REF.items():
    _, rb, _, _ = frame_data(f"{RAW}/{ref}")
    SCALE[clip] = STANDING / (rb[3] - rb[1])
    print(f"  {clip:8s} ท่ายืนสูง {rb[3]-rb[1]:4d} px -> สเกล {SCALE[clip]:.4f}  (อ้างอิง {ref})")

# รอบแรก: เก็บภาพที่จัดตำแหน่งแล้วทั้งหมด เพื่อหาขนาด canvas ที่พอดีจริง
staged = {}
for name, (clip, nums) in SEQ.items():
    for i, n in enumerate(nums, 1):
        p = f"{RAW}/{clip}/f_{n:03d}.png"
        im, box, head_cx, _ = frame_data(p)
        sc = SCALE[clip]
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        # dx/dy = ระยะที่ต้องเลื่อนให้ "กึ่งกลางหัวอยู่ที่ 0" และ "เท้าอยู่ที่ 0"
        staged[f"{name}_{i}"] = (im, head_cx * sc, box[3] * sc, (box[0] * sc, box[2] * sc, box[1] * sc))
    print(f"{name:8s} {len(list(nums)):3d} เฟรม  [{clip}]")

# canvas: กว้างพอให้เฟรมที่แขนยื่นสุดไม่โดนตัด สูงพอให้เฟรมที่ยกมีดสูงสุดไม่โดนตัด
left = max(hx - x0 for _, hx, _, (x0, _, _) in staged.values())
right = max(x1 - hx for _, hx, _, (_, x1, _) in staged.values())
top = max(fy - y0 for _, _, fy, (_, _, y0) in staged.values())
CW, CH = int(left + right) + PAD * 2, int(top) + PAD * 2
ANCHOR_X, FEET_Y = int(left) + PAD, int(top) + PAD
print(f"canvas {CW}x{CH}  จุดยึด: กึ่งกลางหัว x={ANCHOR_X} เท้า y={FEET_Y}")

built = {}
for key, (im, hx, fy, _) in staged.items():
    c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    c.alpha_composite(im, (round(ANCHOR_X - hx), round(FEET_Y - fy)))
    built[key + ".png"] = c

# แพ็กเรียงแถวเดียว (เฟรมน้อย ไม่ต้องจัดตาราง)
tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in built.items()}
W = sum(b[2] - b[0] + 2 for b, _ in tr.values()) + 2
H = max(b[3] - b[1] for b, _ in tr.values()) + 4
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
frames, x = {}, 2
for name, (bb, im) in tr.items():
    cr = im.crop(bb)
    sheet.paste(cr, (x, 2))
    frames[name] = {
        "frame": {"x": x, "y": 2, "w": cr.width, "h": cr.height},
        "rotated": False, "trimmed": True,
        "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": cr.width, "h": cr.height},
        "sourceSize": {"w": CW, "h": CH},
    }
    x += cr.width + 2

sheet.save(os.path.join(OUT, "scramble_nyx.png"))
json.dump(
    {"frames": frames,
     "meta": {"image": "scramble_nyx.png", "size": {"w": W, "h": H}, "scale": "1",
              # ฉากต้องใช้สามค่านี้วางสไปรท์ให้ตรงกับ hurtbox — อย่าเดาเอง
              "anchorX": ANCHOR_X, "feetY": FEET_Y, "standing": STANDING,
              "canvasW": CW, "canvasH": CH}},
    open(os.path.join(OUT, "scramble_nyx.json"), "w"), indent=1)
print(f"\npacked {W}x{H}  {len(frames)} เฟรม")
