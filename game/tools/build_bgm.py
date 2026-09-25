"""ตัดเพลงประกอบเวทีจากคลิปต้นฉบับ แล้วเข้ารหัสสองฟอร์แมต

สองเรื่องที่ต้องทำ ไม่งั้นเพลงวนแล้วฟังออกว่าวน:

1. **ตัดความเงียบหัวท้ายทิ้ง** ต้นฉบับมีเงียบหัว 0.6 วิ ท้าย 4.8 วิ
   วนแล้วจะได้ช่องว่าง 5.4 วินาทีคั่นทุกรอบ ซึ่งได้ยินชัดกว่าตัวรอยต่อเองอีก

2. **ตัดที่จุดตัดศูนย์ (zero crossing)** ไม่ใช่ตัดตรงเวลาเป๊ะ ๆ
   ตัดกลางคลื่นแล้วค่าจะกระโดดตอนวนกลับ = เสียง "แป๊ะ" ทุกรอบ
   หาจุดที่คลื่นข้ามศูนย์ใกล้ ๆ เวลาที่ต้องการแทน แล้วไม่ต้องเฟดเลย
   (เฟดออกก่อนวนก็แก้เสียงแป๊ะได้ แต่จะได้ยินเสียงหรี่ลงทุกรอบแทน ซึ่งแย่กว่า)

ออกสองฟอร์แมตเพราะ Safari รุ่นเก่าไม่เล่น ogg ส่วน Firefox รุ่นเก่าไม่เล่น m4a
Phaser เลือกอันที่เบราว์เซอร์นั้นเล่นได้ให้เอง

รัน (จากโฟลเดอร์ game):  python3 tools/build_bgm.py
"""
import os
import subprocess
import wave

import numpy as np
from imageio_ffmpeg import get_ffmpeg_exe

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "art_reference", "audio", "bgm_source.mp4")
OUT = os.path.join(HERE, "..", "assets", "audio")
TMP = os.path.join(HERE, "out", "bgm_raw.wav")
FF = get_ffmpeg_exe()
QUIET = 0.012      # สัดส่วนของพีคที่ถือว่า "ยังเงียบอยู่"
BITRATE = "96k"    # ชิปทูนสเปกตรัมเรียบ บีบได้เยอะโดยไม่เสียลักษณะเสียง


def zero_cross(mono, at, back):
    """เลื่อนจาก `at` ไปหาจุดที่คลื่นข้ามศูนย์ที่ใกล้ที่สุด (ไม่เกิน 4410 ตัวอย่าง = 0.1 วิ)"""
    step = -1 if back else 1
    for i in range(4410):
        j = at + i * step
        if 0 < j < len(mono) - 1 and mono[j - 1] <= 0 < mono[j]:
            return j
    return at


os.makedirs(os.path.dirname(TMP), exist_ok=True)
subprocess.run([FF, "-v", "error", "-i", SRC, "-vn", "-ac", "2", "-ar", "44100",
                "-c:a", "pcm_s16le", TMP, "-y"], check=True)

w = wave.open(TMP)
sr, n = w.getframerate(), w.getnframes()
a = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, 2)
mono = a.mean(axis=1)
env = np.abs(mono)
live = np.nonzero(env > env.max() * QUIET)[0]
s0 = zero_cross(mono, max(0, live[0] - 220), back=True)
s1 = zero_cross(mono, min(len(mono) - 1, live[-1] + 220), back=False)
print(f"ต้นฉบับ {n/sr:.2f} วิ -> ตัดเหลือ {(s1-s0)/sr:.2f} วิ "
      f"(ทิ้งหัว {s0/sr:.2f} ท้าย {(n-s1)/sr:.2f})")
print(f"ค่าที่จุดตัด: เริ่ม {mono[s0]:+.0f} จบ {mono[s1]:+.0f} (ยิ่งใกล้ศูนย์ยิ่งไม่มีเสียงแป๊ะ)")

cut = os.path.join(HERE, "out", "bgm_cut.wav")
cw = wave.open(cut, "wb")
cw.setnchannels(2); cw.setsampwidth(2); cw.setframerate(sr)
cw.writeframes(a[s0:s1].astype(np.int16).tobytes()); cw.close()

os.makedirs(OUT, exist_ok=True)
for name, args in [("stage.ogg", ["-c:a", "libvorbis", "-b:a", BITRATE]),
                   ("stage.m4a", ["-c:a", "aac", "-b:a", BITRATE])]:
    dst = os.path.join(OUT, name)
    subprocess.run([FF, "-v", "error", "-i", cut, *args, dst, "-y"], check=True)
    print(f"  {name}: {os.path.getsize(dst)/1024:.0f} KB")
