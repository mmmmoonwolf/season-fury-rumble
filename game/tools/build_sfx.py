"""แปลงไฟล์เสียงเอฟเฟคดิบจาก ElevenLabs ให้พร้อมใช้ในเกม

ไฟล์ที่ ElevenLabs ให้มาใช้ตรง ๆ ไม่ได้ เพราะมันออกแบบมาให้ฟังเดี่ยว ๆ แล้วเพราะ
ไม่ได้ออกแบบมาให้ยิงรัว 5 ครั้งต่อวินาทีทับกัน สี่อย่างที่ต้องทำ:

1. **ตัดหัวทิ้ง** ของจริงมีเงียบนำหน้าได้ถึง 0.56 วินาที ถ้าไม่ตัด เสียงหมัดจะมาถึงหู
   ช้ากว่าภาพครึ่งวินาที ซึ่งคือความรู้สึก "ดีเลย์" ที่แก้ที่อื่นไม่ได้เลย

2. **ตัดหางทิ้ง** ต้นฉบับ 5-7 วินาที แต่ตัวเสียงจริงยาว 40-160 มิลลิวินาที
   ที่เหลือคือเสียงห้องกับฮิสที่ ElevenLabs แถมมา ไม่ตัด = ต่อยรัวแล้วหางทับกันเป็นโคลน

3. **ปรับระดับให้เท่ากัน** วัดที่ 100 มิลลิวินาทีแรกหลังหัวเสียง ไม่ใช่ทั้งไฟล์
   วัดทั้งไฟล์แล้วเสียงสั้นจะได้เปรียบเสียงยาวโดยอัตโนมัติ ซึ่งไม่ใช่สิ่งที่หูได้ยิน

4. **เฟดออก 4 มิลลิวินาทีตรงรอยตัด** ตัดกลางคลื่นแล้วค่ากระโดดลงศูนย์ = เสียง "แป๊ะ"
   ตรงนี้ต่างจากเพลง (`build_bgm.py`) ที่ห้ามเฟดเด็ดขาดเพราะมันวน จึงต้องหาจุดตัดศูนย์แทน
   ของชิ้นนี้เล่นครั้งเดียวจบ ไม่วน เฟดสั้น ๆ จึงใช้ได้และง่ายกว่ามาก
   4 มิลลิวินาทีสั้นเกินกว่าหูจะได้ยินว่าเป็นการหรี่

ออกสองฟอร์แมตด้วยเหตุผลเดียวกับเพลง: Safari เก่าไม่เล่น ogg / Firefox เก่าไม่เล่น m4a

รัน (จากโฟลเดอร์ game):  python3 tools/build_sfx.py
"""
import json
import os
import subprocess
import wave

import numpy as np
from imageio_ffmpeg import get_ffmpeg_exe

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "art_reference", "audio", "sfx_raw")
OUT = os.path.join(HERE, "..", "assets", "audio", "sfx")
TMP = os.path.join(HERE, "out", "sfx")
FF = get_ffmpeg_exe()

SR = 44100
HEAD_PAD = int(0.005 * SR)    # เก็บไว้หน้าหัวเสียง 5 มิลลิวินาที กันตัดโดนหัวเอง
TAIL_DB = -35.0               # ต่ำกว่านี้ถือว่าเป็นเสียงห้อง ไม่ใช่ตัวเสียง
ENV_HOP = 441                 # 10 ms — วัดหางเป็นช่วง ไม่ใช่รายตัวอย่าง
FADE = int(0.004 * SR)        # เฟดออกตรงรอยตัด
LOUD_WIN = int(0.100 * SR)    # หน้าต่างที่ใช้วัดความดัง
TARGET_RMS = 0.085            # ระดับเป้าหมายของหน้าต่างนั้น
CEILING = 10 ** (-1.0 / 20)   # เพดานพีค -1 dBFS กันคลิป
BITRATE = "64k"               # โมโน สั้น ๆ เท่านี้เหลือเฟือ

# สัญญาอนุญาตที่เจอในงานเสียงฟรี — ผูกไว้กับ "ต้องทำอะไร" ไม่ใช่แค่ชื่อ
#
# มีสองอย่างที่ต่างกันและมักถูกสลับกัน:
#   credit     = ต้องมีข้อความนี้ในบรรทัดเครดิต ไม่งั้นผิดเงื่อนไข
#   commercial = เอาไปหาเงินได้ไหม — การใส่เครดิต "ไม่ได้" ปลดข้อนี้
# CC-BY ใส่เครดิตแล้วขายได้ · ElevenLabs แพ็กฟรีใส่เครดิตแล้วก็ยังขายไม่ได้
LICENSES = {
    "cc0":             {"credit": None,         "commercial": True},
    "cc-by":           {"credit": "PER_FILE",   "commercial": True},
    "elevenlabs-free": {"credit": "ElevenLabs", "commercial": False},
}

# ชื่อไฟล์ดิบ -> ปลายทาง + ที่มา
#
# ที่ต้องบันทึกสัญญาอนุญาตต่อไฟล์ เพราะพอผสมหลายแหล่งแล้วจะไม่มีทางรู้ย้อนหลังเลยว่า
# ไฟล์ไหนมาจากไหน — แล้ววันที่ต้องตอบว่า "เกมนี้ขายได้ไหม" จะตอบไม่ได้ทั้งโฟลเดอร์
# ไฟล์ดิบเก็บชื่อเดิมที่ต้นทางตั้งมา จะได้ตามกลับไปหา prompt หรือหน้าดาวน์โหลดได้
MAP = {
    # ── หมัด ── ชุดเดียวกันทั้งเบาและหนัก จงใจ
    #
    # Kenney ทำสองชุดนี้เป็นคู่กันมาแต่แรก เบากับหนักจึงฟังเป็นตัวละครเดียวกัน
    # ต่างกันที่น้ำหนัก ไม่ใช่ต่างกันที่ "คนละโลก"
    # ก่อนหน้านี้ใช้ของ ElevenLabs เป็นหมัดเบา แต่ของนั้นพลังงาน 59% อยู่เหนือ 4 kHz
    # ส่วนหมัดหนักของ Kenney มีแค่ 2% เอามาอยู่ด้วยกันแล้วเหมือนคนละเกม
    "impactPunch_medium_000.ogg": {"out": "hit_light_1", "lic": "cc0"},
    "impactPunch_medium_001.ogg": {"out": "hit_light_2", "lic": "cc0"},
    "impactPunch_medium_002.ogg": {"out": "hit_light_3", "lic": "cc0"},
    "impactPunch_medium_003.ogg": {"out": "hit_light_4", "lic": "cc0"},
    "impactPunch_medium_004.ogg": {"out": "hit_light_5", "lic": "cc0"},
    "impactPunch_heavy_000.ogg": {"out": "hit_heavy_1", "lic": "cc0"},
    "impactPunch_heavy_001.ogg": {"out": "hit_heavy_2", "lic": "cc0"},
    "impactPunch_heavy_002.ogg": {"out": "hit_heavy_3", "lic": "cc0"},
    "impactPunch_heavy_003.ogg": {"out": "hit_heavy_4", "lic": "cc0"},

    # ── บล็อก ── โลหะเบา เบสแทบเป็นศูนย์ (0.5-1%)
    # ตั้งใจเลือกให้ไม่มีเบส เพราะบล็อกเกิดพร้อม ๆ กับหมัดที่เบสหนัก
    # ถ้าสองอย่างแย่งย่านเดียวกัน จะกลายเป็นก้อนเดียวแยกไม่ออกว่าโดนหรือกัน
    "impactMetal_light_000.ogg": {"out": "block_1", "lic": "cc0"},
    "impactMetal_light_001.ogg": {"out": "block_2", "lic": "cc0"},
    "impactMetal_light_004.ogg": {"out": "block_3", "lic": "cc0"},

    # ── ลงพื้นเบา ── เสียงเหยียบหญ้า ตรงกับพื้นเวทีที่เป็นหญ้ากับดิน
    "footstep_grass_000.ogg": {"out": "land_soft_1", "lic": "cc0"},
    "footstep_grass_001.ogg": {"out": "land_soft_2", "lic": "cc0"},
    "footstep_grass_002.ogg": {"out": "land_soft_3", "lic": "cc0"},

    # ── ลงพื้นแรง ── เลือก impactPlank ไม่ใช่ impactSoft_heavy ที่ชื่อตรงกว่า
    #
    # impactSoft_heavy พลังงาน 95% อยู่ต่ำกว่า 200 Hz ซึ่งลำโพงมือถือแทบไม่มีเลย
    # เกมนี้เล่นบนมือถือเป็นหลัก เสียงนั้นจะหายไปเฉย ๆ ทั้งที่ในหูฟังดังมาก
    # impactPlank มีเบส 44-50% แต่ที่เหลืออยู่ย่าน 800-1000 Hz ซึ่งมือถือส่งออกได้
    "impactPlank_medium_001.ogg": {"out": "land_hard_1", "lic": "cc0"},
    "impactPlank_medium_002.ogg": {"out": "land_hard_2", "lic": "cc0"},
    "impactPlank_medium_003.ogg": {"out": "land_hard_3", "lic": "cc0"},

    # ── หวดลม ── เสียงผ้าสะบัด คือเสียงแขนเหวี่ยงผ่านอากาศจริง ๆ
    # ต้นฉบับยาว 260-420 ms ซึ่งยาวกว่าจังหวะแย็บ (ราว 200 ms) ต้องตัดเพดาน
    "cloth1.ogg": {"out": "swing_1", "lic": "cc0", "max_ms": 150},
    "cloth2.ogg": {"out": "swing_2", "lic": "cc0", "max_ms": 150},
    "cloth3.ogg": {"out": "swing_3", "lic": "cc0", "max_ms": 150},

    # ── แส้ของ Alecto ── เสียงเฉือน ตัดเพดานให้เหลือแต่หัวเสียงกับหางสั้น ๆ
    "knifeSlice2.ogg": {"out": "whip_1", "lic": "cc0", "max_ms": 180},
    "knifeSlice.ogg": {"out": "whip_2", "lic": "cc0", "max_ms": 180},
}

# ── เก็บไว้เผื่อย้อนกลับ ──
# หมัดเบาเคยเป็นของ ElevenLabs แพ็กฟรี 2 ไฟล์ ยังอยู่ใน art_reference/audio/sfx_raw/
#   d9cbd7be-Isolated_Punch_Impact.mp3   -> hit_light_1 (เดิม)
#   dd04de09-Flesh_and_Leather_Impact.mp3 -> hit_light_2 (เดิม)
# ถอดออกเพราะสองเหตุผล ไม่ใช่เพราะมันไม่ดี:
#   1. โทนไม่เข้ากับหมัดหนักของ Kenney (แหลม 59% กับ 2%) อยู่ในเกมเดียวกันแล้วขัดกัน
#   2. แพ็กฟรีห้ามใช้เชิงพาณิชย์ ไฟล์เดียวก็ทำให้ทั้งเกมติดข้อนั้น
# อยากกลับไปใช้ แค่ย้ายสองบรรทัดกลับเข้า MAP แล้วรันใหม่

# ไฟล์ที่เจนมาแล้วใช้ไม่ได้ เก็บชื่อไว้กันเจนซ้ำแล้วลืมว่าเคยเจนไปแล้ว
# 34811d6b-Sharp_Strike.mp3 และ af393040-The_Sudden_Hit.mp3
#   เป็นไฟล์ mp3 ที่ถูกต้องทุกอย่าง 6.03 วินาที 192 kbps สเตอริโอ
#   แต่ข้างในเป็น "ความเงียบดิจิทัล" ทั้งไฟล์ — max_volume -91 dB ทั้ง 532,224 ตัวอย่าง
#   (-91 dB คือพื้นของ 16 บิต ไม่ใช่เสียงเบา แต่คือไม่มีอะไรเลย)
#   เป็นอาการที่ ElevenLabs เจนพลาดแล้วยังให้ดาวน์โหลดได้ตามปกติ ต้องเจนใหม่อย่างเดียว


def load_mono(path):
    """ถอดเป็น mono 44.1k — เกมแพนเสียงตามตำแหน่งเอง ไฟล์จึงไม่ควรกว้างมาแต่แรก"""
    wav = os.path.join(TMP, os.path.basename(path) + ".wav")
    subprocess.run([FF, "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", str(SR),
                    "-c:a", "pcm_s16le", wav], check=True)
    w = wave.open(wav)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    w.close()
    return a


def trim(a):
    """คืน (ช่วงที่ตัดแล้ว, หัวที่ทิ้ง, หางที่ทิ้ง) หน่วยเป็นวินาที

    หางวัดเป็นช่วงละ 10 ms ไม่ใช่รายตัวอย่าง — ฮิสที่ ElevenLabs แถมมามีตัวอย่างเดี่ยว ๆ
    เด้งขึ้นมาเกินเส้นเป็นระยะ ถ้าดูรายตัวอย่างจะได้จุดตัดที่ 5 วินาทีทุกไฟล์
    """
    peak = np.abs(a).max()
    s0 = max(0, int(np.argmax(np.abs(a) > peak * 0.20)) - HEAD_PAD)   # หัวเสียง = 20% ของพีค
    env = np.array([np.abs(a[i:i + ENV_HOP]).max()
                    for i in range(0, len(a) - ENV_HOP, ENV_HOP)])
    live = np.nonzero(env > peak * 10 ** (TAIL_DB / 20))[0]
    s1 = min(len(a), (int(live[-1]) + 1) * ENV_HOP + FADE) if len(live) else len(a)
    return a[s0:s1], s0 / SR, (len(a) - s1) / SR


def shape(a):
    """ปรับระดับ + เฟดออกตรงรอยตัด"""
    # เติมศูนย์ให้ครบ 100 ms ก่อนวัด ไม่งั้นเสียงที่สั้นกว่าหน้าต่างจะวัดได้ดังเกินจริง
    win = np.zeros(LOUD_WIN)
    n = min(LOUD_WIN, len(a))
    win[:n] = a[:n]
    rms = float(np.sqrt((win ** 2).mean()))
    gain = TARGET_RMS / rms if rms > 0 else 1.0
    gain = min(gain, CEILING / max(np.abs(a).max(), 1e-9))   # อย่าให้พีคเกินเพดาน
    a = a * gain
    if len(a) > FADE:
        a[-FADE:] *= np.linspace(1.0, 0.0, FADE)
    return a, gain


def main():
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    built = []
    for src, info in sorted(MAP.items(), key=lambda kv: kv[1]["out"]):
        name = info["out"]
        if info["lic"] not in LICENSES:
            raise SystemExit(f"{src}: ไม่รู้จักสัญญาอนุญาต {info['lic']!r}")
        path = os.path.join(SRC, src)
        raw = load_mono(path)
        peak = np.abs(raw).max()
        # ถ้าเจนพลาดเป็นไฟล์เงียบ ต้องบอกตรงนี้ ไม่ใช่ปล่อยให้ไปเงียบอยู่ในเกม
        if peak < 1e-4:
            raise SystemExit(
                f"{src}: ไฟล์เงียบทั้งอัน (พีค {peak:.6f}) — ElevenLabs เจนพลาด ต้องเจนใหม่")
        cut, head, tail = trim(raw)
        # เพดานความยาว: ไลบรารีเสียงทั่วไปไม่ได้ทำมาให้จังหวะเกมต่อสู้
        # เสียงหวดลมที่ยาวกว่าช่วงห่างระหว่างหมัด จะค้างทับหมัดถัดไปของตัวเอง
        cap = info.get("max_ms")
        if cap and len(cut) > cap * SR // 1000:
            cut = cut[:cap * SR // 1000]
        cut, gain = shape(cut)

        wav = os.path.join(TMP, name + ".wav")
        w = wave.open(wav, "wb")
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.clip(cut * 32768, -32768, 32767).astype("<i2").tobytes())
        w.close()

        sizes = []
        for ext, args in [("ogg", ["-c:a", "libvorbis", "-b:a", BITRATE]),
                          ("m4a", ["-c:a", "aac", "-b:a", BITRATE])]:
            dst = os.path.join(OUT, f"{name}.{ext}")
            subprocess.run([FF, "-v", "error", "-y", "-i", wav, *args, dst], check=True)
            sizes.append(f"{ext} {os.path.getsize(dst)/1024:.1f} KB")
        print(f"{name:14s} {len(raw)/SR:5.2f} วิ -> {len(cut)/SR*1000:6.1f} มิลลิวินาที "
              f"(ทิ้งหัว {head*1000:5.1f} ms ท้าย {tail:4.2f} วิ) "
              f"เกน x{gain:4.2f} พีค {20*np.log10(max(np.abs(cut).max(),1e-9)):+5.1f} dBFS · "
              + " · ".join(sizes))
        built.append((name, src, info))

    # ── บันทึกที่มาไว้ข้างไฟล์เสียง ──
    # เกมไม่ได้อ่านไฟล์นี้ แต่เทสต์อ่าน และคนที่เปิดโฟลเดอร์มาเจอก็อ่านออกทันที
    # ว่าไฟล์ไหนมาจากไหนและติดเงื่อนไขอะไร ไม่ต้องไปขุดจากประวัติ git
    manifest = {
        "note": "ที่มาและสัญญาอนุญาตของไฟล์เสียงในโฟลเดอร์นี้ สร้างโดย tools/build_sfx.py",
        "licenses": LICENSES,
        "files": {n: {"source": src, **info} for n, src, info in built},
    }
    with open(os.path.join(OUT, "SOURCES.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\nเสร็จ {len(built)} เสียง: {', '.join(n for n, _, _ in built)}")

    # ── สรุปสิทธิ์ ──
    # ข้อสรุปของทั้งโฟลเดอร์เท่ากับข้อที่เข้มที่สุดเสมอ ไฟล์เดียวที่ห้ามเชิงพาณิชย์
    # ทำให้ทั้งเกมใช้เชิงพาณิชย์ไม่ได้ ไม่ใช่แค่ฉากที่เล่นเสียงนั้น
    used = {}
    for n, _, info in built:
        used.setdefault(info["lic"], []).append(n)
    print("\nสัญญาอนุญาตที่ใช้อยู่:")
    blockers = []
    for lic, names in sorted(used.items()):
        L = LICENSES[lic]
        need = "ไม่ต้องให้เครดิต" if L["credit"] is None else f"ต้องเครดิต {L['credit']!r}"
        comm = "ใช้เชิงพาณิชย์ได้" if L["commercial"] else "ห้ามใช้เชิงพาณิชย์"
        print(f"  {lic:16s} {len(names)} ไฟล์ · {need} · {comm}")
        if not L["commercial"]:
            blockers.append(lic)
    print("เกมนี้ตอนนี้: " + ("ใช้เชิงพาณิชย์ได้ทั้งหมด" if not blockers
          else f"ใช้เชิงพาณิชย์ไม่ได้ ติดที่ {', '.join(blockers)}"))


if __name__ == "__main__":
    main()
