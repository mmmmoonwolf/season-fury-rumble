"""ตัดคลิปวิ่งของ Momus ออกเป็นเฟรม PNG + clip.json

รูปแบบเอาต์พุตเหมือนของ Orpheus/Atlas เป๊ะ build script จึงอ่านได้ด้วยโค้ดชุดเดียวกัน

คาบของรอบวิ่งวัดจาก "ระยะถ่างเท้า" ไม่ใช่เดาเอา — สัญญาณนี้ขึ้นลงหนึ่งรอบต่อหนึ่งก้าว
ส่วนรอบเต็ม (ซ้าย+ขวา) เป็นสองเท่าของนั้น หาได้จาก autocorrelation
รัน (จากโฟลเดอร์ game):  python3 tools/cut_momus_clip.py <โฟลเดอร์เฟรม>
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
OUT = os.path.join(HERE, "..", "..", "art_reference", "momus_clip")
N_CELLS = 10
IDLE_FRAME = 10          # ช่วงต้นคลิปเขายืนนิ่ง ใช้วัดความสูงท่ายืน
RUN_START = 111          # จังหวะเท้าแตะพื้นหลังผ่านจุดถ่างเท้าน้อยสุด (เฟรม 110)
PERIOD = 23              # วัดจาก autocorrelation ของระยะถ่างเท้า


def main(frame_dir):
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
    main(sys.argv[1])
