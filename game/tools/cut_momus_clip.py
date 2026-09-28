"""ตัดคลิปวิ่งออกเป็นเฟรม PNG + clip.json

รูปแบบเอาต์พุตเหมือนของ Orpheus/Atlas เป๊ะ build script จึงอ่านได้ด้วยโค้ดชุดเดียวกัน

รัน (จากโฟลเดอร์ game):  python3 tools/cut_momus_clip.py <โฟลเดอร์เฟรม> [ชื่อคลิป]

## หาคาบของรอบวิ่งยังไง

**ตัวตลก** วัดจาก "ระยะถ่างเท้า" แล้ว autocorrelate — สัญญาณขึ้นลงหนึ่งรอบต่อหนึ่งก้าว
รอบเต็ม (ซ้าย+ขวา) เป็นสองเท่าของนั้น

**DEAR ใช้วิธีนั้นไม่ได้** หมัดกลของเขาห้อยยาวเลยเข่า พาดอยู่ในแถบล่างของตัวที่ใช้วัดเท้า
ระยะถ่างเท้าจึงอ่านได้ 711 px ตอนยืนนิ่ง (จริง ๆ คือความกว้างของกำปั้นสองข้าง)
autocorrelation ได้ r แค่ 0.41-0.51 ซึ่งเชื่อไม่ได้

เปลี่ยนไปเทียบ **รูปทรงทั้งตัว** แทน: จัดให้เท้าแตะเส้นเดียวกันและกึ่งกลางตรงกัน
แล้ววัด IoU ระหว่างเฟรม n กับ n+P ทุกค่า P — คาบคือ P ที่ IoU เฉลี่ยสูงสุด
วัดจริงได้ P=29 ที่ IoU 0.854 ซึ่งเป็นยอดที่ชัด (P ข้างเคียงต่ำกว่าชัดเจน)
และ 29 ≈ 2 x 14.5 ตรงกับครึ่งคาบที่สัญญาณเท้าให้มา — สองวิธีเห็นตรงกัน

จุดเริ่มก็เลือกด้วยไม้เดียวกัน: เฟรมที่ **ลูปปิดสนิทที่สุด** (IoU ของ n กับ n+P สูงสุด)
โดยที่เฟรมในรอบยังต่างกันพอ ไม่ใช่ช่วงที่ภาพค้าง — f95 ได้ 0.970
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_sheets import body_anchor
from cut import cutout

HERE = os.path.dirname(os.path.abspath(__file__))
REF_DIR = os.path.join(HERE, "..", "..", "art_reference")
N_CELLS = 10

# ค่าที่วัดมาแล้วต่อคลิป — อย่าเดา ทุกตัวเลขในนี้มาจากการวัดคลิปจริง (ดู docstring)
CLIPS = {
    # idle = เฟรมที่ยังยืนนิ่ง ใช้วัดความสูงท่ายืนอย่างเดียว ไม่ได้เป็นเฟรมในเกม
    "momus": {"idle": 10, "start": 111, "period": 23},
    "dear":  {"idle": 3,  "start": 95,  "period": 29},
}


def main(frame_dir, name="momus"):
    cfg = CLIPS[name]
    OUT = os.path.join(REF_DIR, f"{name}_clip")
    IDLE_FRAME, RUN_START, PERIOD = cfg["idle"], cfg["start"], cfg["period"]
    pick = [round(RUN_START + PERIOD * i / N_CELLS) for i in range(N_CELLS)]
    print("เฟรมที่เลือก:", pick)

    # ท่ายืน: ใช้วัดความสูงอ้างอิงอย่างเดียว ไม่ได้เอาไปเป็นเฟรมในเกม
    _, m0 = cutout(os.path.join(frame_dir, f"f{IDLE_FRAME:03d}.png"))
    ys0 = np.nonzero(m0.any(axis=1))[0]
    stand_h = int(ys0.max() - ys0.min() + 1)
    ground_y = int(ys0.max())

    os.makedirs(OUT, exist_ok=True)
    anchors, bases = [], []
    for i, f in enumerate(pick, 1):
        rgba, m = cutout(os.path.join(frame_dir, f"f{f:03d}.png"))
        ys, xs = np.nonzero(m)
        out = np.asarray(rgba).copy()
        out[:, :, 3] = np.where(m, out[:, :, 3], 0)
        crop = Image.fromarray(out).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        crop.save(os.path.join(OUT, f"run_{i:02d}.png"))
        # erode=31 เท่าตัวอื่น — ผมฟูของเขาไม่ได้ยื่นออกข้างเดียวเหมือนแส้/กีตาร์
        anchors.append(float(body_anchor(m, erode=31) - xs.min()))
        # ฐาน = ระยะจากขอบบนของเฟรมถึงเส้นพื้นเดียวกันทุกเฟรม ไม่ใช่ความสูงเฟรม
        # ไม่งั้นเฟรมที่ตัวลอยขึ้นจะถูกดันลงมาติดพื้น รอบวิ่งเลยไม่มีจังหวะลอย
        bases.append(int(ground_y - ys.min()))

    json.dump({"stand_h": stand_h, "frames": pick, "start": RUN_START, "period": PERIOD,
               "ground_y": ground_y, "anchor": anchors, "base": bases},
              open(os.path.join(OUT, "clip.json"), "w"), indent=1)
    print(f"ท่ายืนสูง {stand_h} px · เส้นพื้น y={ground_y}")
    print("ฐานต่อเฟรม:", bases)
    print(f"เขียนแล้ว: {N_CELLS} เฟรม + clip.json")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "momus")
