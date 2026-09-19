"""
v33 ไททัน สกิล 1 "ง้างเตะ" (เตะแบบเตะบอล) — คลิป gemini_generated_video_F1A409B6.mp4 (1280x720 @24fps, 300 เฟรม)
ใช้ฟังก์ชันตัดภาพ/ปรับโทน/แพ็กของ build_oat_titan.py ทั้งหมด (ผลลัพธ์โทนเดียวกับท่าไททันอื่น)

ใช้:
  mkdir -p raw/titanK && ffmpeg -i gemini_generated_video_F1A409B6.mp4 -start_number 1 raw/titanK/f_%03d.png
  python3 tools/build_oat_titan_kick.py raw/titan assets/characters

คลิป K (ไล่ดู contact sheet แล้ว):
  f1-f100    ยืนคำราม ไอพวยพุ่ง -> ตั้งการ์ด       (เสียงคำราม 0.15-4.1 วิ ใช้เป็นเสียงแปลงร่าง/สกิล 3)
  f118-f140  ก้าวเข้า เอนตัว
  f142-f174  ง้างขาไปด้านหลังสุด                  (เสียงง้าง 5.6-7.2 วิ)
  f178-f192  เหวี่ยงขาไปข้างหน้า                  (เสียงเตะเริ่ม 7.4 วิ = f178)
  f193-f230  ขายืดสุด -> ส่งตามลดลง
  f234-f270  เตะสูงอีกรอบ                          — ไม่ใช้ (เผื่อทำท่าอื่น)
  ⚠️ f186-f192 ไอพ่นวนรอบขา บังหน้าแข้งขายืน (ตัดภาพแล้วขายืนขาด) -> ข้ามไป ขาเหวี่ยงจาก f185 -> f193 ทันที (ดูเป็นเตะไว)
  ⚠️ f181-f183 มีเศษไอติดใต้เท้า (ขอบล่างเพี้ยน 18px) -> ข้าม

สเกล: ตัวในคลิปนี้เล็กกว่าคลิป C — ท่าตั้งการ์ด f90-f100 สูง ~638px เทียบ idle ใน oattitan_atlas สูง ~383 (ผืนภาพ)
"""
import sys

sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else "raw/titan", sys.argv[2] if len(sys.argv) > 2 else "out", "__none__"]
_src = open(__file__.replace("build_oat_titan_kick.py", "build_oat_titan.py"), encoding="utf-8").read()
exec(_src.split("only = sys.argv[3:]")[0])  # ได้ cutout_body / style / compose / build / pack (ไม่ build ของเดิม)

TITAN_SCALE = 383 / 638  # build() อ่านตัวแปรนี้ตอนเรียก

# ไอพ่นขาวพาดผ่านตัว (เช่น f150-f154 แถบขาวที่เอว) ถูกนับเป็น "ตัว" -> ระบายสีผิวรอบ ๆ ทับ
_cutout_body_orig = cutout_body


def cutout_body(fid, mode):
    rgb, alpha, fg = _cutout_body_orig(fid, mode)
    # ไอที่บังเต็มแนว (เช่น ข้อเท้าขายืน f193) ทำให้ตัวขาดเป็นร่องบาง -> ปิดร่องแนวตั้งแล้วระบายสีผิวทับ
    closed = ndimage.binary_closing(fg, np.ones((13, 5)))
    bridge = closed & ~fg
    fg = fg | bridge
    alpha = np.where(bridge, 255, alpha)
    lum = rgb @ LUMW
    sat = rgb.max(2) - rgb.min(2)
    # ผิวไททันอมส้มชัด (แดง-น้ำเงิน > 25) · ไอเป็นเทา/ขาว (แดง≈น้ำเงิน) · ผมดำ (มืด) ไม่นับ
    # วัดเป็นสัดส่วนความอิ่มสีต่อความสว่าง: ผิว ~0.45 · ไอทับผิว 0.1-0.25 (ค่าตายตัวจับไม่ได้ เพราะไอโปร่งแสงผสมสีผิว)
    steam = fg & (sat / np.maximum(lum, 1) < 0.27) & (lum > 150)
    steam = ndimage.binary_opening(steam, np.ones((2, 2)))
    steam = (ndimage.binary_dilation(steam, iterations=3) & fg) | bridge
    if steam.any():
        ok = (fg & ~steam).astype(np.float32)
        w = ndimage.gaussian_filter(ok, 6)
        rgb = rgb.copy()
        for c in range(3):
            est = ndimage.gaussian_filter(rgb[..., c] * ok, 6) / np.maximum(w, 1e-3)
            rgb[..., c] = np.where(steam, est, rgb[..., c])
    return rgb, alpha, fg

WINDUP = list(range(126, 175, 4))                  # 13 เฟรม
SWING = [178, 179, 180, 184, 185, 193, 196, 199, 202]  # 9 เฟรม · เฟรมที่ 6 (f193) = ขายืดสุด = จังหวะโดน
FOLLOW = list(range(206, 231, 4))                  # 7 เฟรม
IDS = [f"K{n}" for n in WINDUP + SWING + FOLLOW]

# ท่าเดียวทั้งชุด = ยึดหัวค่ากลางเดียวกัน ไม่กระโดดตอนเปลี่ยนช่วง · เท้ายึดรายเฟรม
build("oattitan_kick", [("kick", IDS, G, T, None, None)])

import json
meta_path = f"{OUT}/oattitan_kick_atlas.json"
d = json.load(open(meta_path))
d["meta"]["kick"] = {"windup": len(WINDUP), "swing": len(SWING), "follow": len(FOLLOW), "contactIndex": len(WINDUP) + 5,
                     "swingSoundIndex": len(WINDUP)}
json.dump(d, open(meta_path, "w"), indent=1)
print("contact frame index (0-based):", len(WINDUP) + 5)
