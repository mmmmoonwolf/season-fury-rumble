"""
v34 Dear V.2 สกิล 1-2 ลูกโป่ง — ตัดอาร์ต 6 คลิป (1280x720 @24fps ทุกคลิป, ไม่อยู่ในซิป)

  A 4295CB05  ถือลูกโป่งพวง -> เขวี้ยง (f64-f106 ปล่อยมือ) -> ลูกโป่งลอย (f120-f164) -> ระเบิด confetti (f168-)
  B 610D2C20  ก้มวางลูกโป่งบนพื้น (f48-f128 วางถึงพื้น) -> ลุก (f132-) -> ลูกโป่งระเบิดเป็นควัน f200+
  C 7ADD6551  ลูกโป่งบนพื้น (f1-f24) -> ระเบิดควันพิษเขียว (f25-f80)
  D 6ED7D0F2  Dear + ลูกโป่ง -> ควัน -> กล่องไขลาน -> ตุ๊กตาสปริงเด้ง (f256-f300) · พื้นขาว ตัวแยกจาก Dear ชัด
  E EDA228D2  Dear แบกกล่องมาวาง -> ตุ๊กตาสปริง — พื้นเบจ + หัวตุ๊กตาทับ Dear ตอนเด้ง -> ใช้แค่เสียง
  F 64805FF8  ตัวตลกหัวล้านเดิน+หัวเราะ — รอบเดิน f67-f84 (ซ้อน IoU 0.88)

ใช้:
  for c in 4295CB05 610D2C20 7ADD6551 6ED7D0F2 64805FF8; do mkdir -p raw/$c; ffmpeg -i gemini_generated_video_$c.mp4 -vsync 0 raw/$c/f%04d.png; done
  python3 tools/build_dearv2_balloon.py raw assets/characters

ออก:
  dearv2_balloon_atlas — ท่า Dear (ผืน 640x470 จุดยึด 320 เท้า 431 เท่า atlas Dear อื่น) + ตัวตลกหัวล้านเดิน (ผืนเดียวกัน)
  dv2fx_atlas          — เอฟเฟกต์ แต่ละกลุ่มผืนภาพเท่ากันทั้งกลุ่ม · meta.fx บอกจุดยึด + worldPerPx
วิธีตัด: ตัวละคร/วัตถุทึบ = cut() ของ build_dearv2_sneak.py (พื้นขาว ขอบเนียน) · ควัน/confetti = alpha นุ่มตามส่วนต่าง
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
_ns = {}
_src = open(os.path.join(HERE, "build_dearv2_sneak.py"), encoding="utf-8").read().split("frames, meta_extra")[0]
_argv = sys.argv; sys.argv = [sys.argv[0], "_", "_"]
exec(_src, _ns)
_full = open(os.path.join(HERE, "build_dearv2_sneak.py"), encoding="utf-8").read()
exec(_full[_full.index("def pack("):_full.index('pack(frames, "dearv2_sneak_atlas")')], _ns)  # ใช้ตัวแพ็ก atlas เดียวกัน
sys.argv = _argv
cut, hip_x, bg_plate, place_dear = _ns["cut"], _ns["hip_x"], _ns["bg_plate"], _ns["place"]
CANVAS, ANCHOR_X, FEET_Y, SCALE = _ns["CANVAS"], _ns["ANCHOR_X"], _ns["FEET_Y"], _ns["SCALE"]
pack = _ns["pack"]

RAW = sys.argv[1] if len(sys.argv) > 1 else "raw"
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/characters"
_ns["OUT"] = OUT
TMP = "/tmp/_dv2crop.png"
WORLD_PER_PX = 185 / 393  # ผืนภาพ Dear สูง 393 = โลก 185 -> เอฟเฟกต์ bake ที่สเกลเดียวกัน


def fp(clip, n):
    return f"{RAW}/{clip}/f{n:04d}.png"


def drop_big_red(im, min_area=600):
    """ลบก้อนแดงสดใหญ่ (ลูกโป่งที่หลุดมือแล้ว) — วัดบนผืนที่ย่อแล้ว: ลูกโป่ง ~1200px ปอมปอม ~200px"""
    a = np.asarray(im).copy()
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    # แดงตามสัดส่วน (รวมเงา/ไฮไลต์ของลูกโป่ง) ไม่ใช่ค่าตายตัว + อุดรูไฮไลต์ในก้อน
    # แดงแท้ (เขียว≈น้ำเงิน) — ผมส้มของ Dear เขียวสูงกว่าน้ำเงินชัด (>35) จึงไม่โดน
    red = (a[..., 3] > 0) & (r > 110) & (r - g > 60) & (np.abs(g - b) < 28)
    red = ndimage.binary_fill_holes(ndimage.binary_dilation(red, iterations=2))
    lab, n = ndimage.label(red)
    for i in range(1, n + 1):
        blob = lab == i
        if blob.sum() >= min_area:
            a[ndimage.binary_dilation(blob, iterations=3), 3] = 0
    return Image.fromarray(a, "RGBA")


def cut_crop(path, box):
    Image.open(path).crop(box).save(TMP)
    return cut(TMP)


def soft_cut(path, box, gain=45, bg_from=None):
    """ควัน/กระดาษโปรย: alpha นุ่มทั้งผืน (ไม่มีเนื้อทึบ) + ถอดสีพื้นออก"""
    rgb = np.asarray(Image.open(path).convert("RGB").crop(box)).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(2) - rgb.min(2)
    if bg_from:  # confetti เต็มจอจนฟิตพื้นจากเฟรมเดียวกันไม่ได้ (เกิดกรอบเทา) -> ใช้พื้นจากเฟรมก่อนระเบิด
        ref = np.asarray(Image.open(bg_from).convert("RGB").crop(box)).astype(np.float32)
        rl = ref @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        bg = bg_plate(ref, ndimage.binary_dilation((rl < 240) | ((ref.max(2) - ref.min(2)) > 14), np.ones((25, 25))))
        floor = 10
    else:
        rough = ndimage.binary_dilation((lum < 240) | (sat > 14), np.ones((25, 25)))
        bg = bg_plate(rgb, rough)
        floor = 4
    d = np.clip(bg - rgb, 0, None).max(2) + np.clip(sat - 10, 0, None)
    a = np.clip((d - floor) / gain, 0, 1)
    col = np.clip((rgb - (1 - a[..., None]) * bg) / np.maximum(a, 1e-3)[..., None], 0, 255)
    return Image.fromarray(np.dstack([np.where(a[..., None] > 0.02, col, 0), a * 255]).astype(np.uint8), "RGBA")


def scaled(im):
    return im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)


def on_canvas(ims, anchor_in_src, fixed=None):
    """วางทุกเฟรมของกลุ่มบนผืนเดียวกัน · anchor_in_src = จุดยึดในพิกัดภาพต้นทาง (ก่อนย่อ)"""
    sims = [scaled(i) for i in ims]
    ax, ay = anchor_in_src[0] * SCALE, anchor_in_src[1] * SCALE
    W = max(s.width for s in sims); H = max(s.height for s in sims)
    out = []
    for s in sims:
        c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.alpha_composite(s, (0, 0)); out.append(c)
    return out, {"w": W, "h": H, "originX": round(ax / W, 4), "originY": round(ay / H, 4), "worldPerPx": round(WORLD_PER_PX, 5)}


dear, fx, fxmeta = {}, {}, {}

# ── Dear: เขวี้ยง (A) ── ง้างพวงลูกโป่งข้ามไหล่ -> ปล่อยมือที่เฟรมสุดท้ายของช่วงแรก -> ส่งตาม (ลบลูกโป่งที่หลุดมือ)
THROW = list(range(64, 107, 3)); FOLLOW = [110, 114, 118]
seqs = [("throw", THROW + FOLLOW, set(FOLLOW), "4295CB05"),
        ("place", list(range(48, 129, 5)) + [140, 148], {140, 148}, "610D2C20")]
for name, nums, drop, clip in seqs:
    cuts = [cut(fp(clip, n)) for n in nums]
    fixed = float(np.median([hip_x(m) for _, m in cuts]))
    for i, ((im, m), n) in enumerate(zip(cuts, nums), 1):
        if n in drop: im = drop_big_red(im)
        dear[f"{name}_{i}.png"] = place_dear(im, m, fixed)
    print(f"{name}: {len(nums)} เฟรม f{nums[0]}-f{nums[-1]}")
RELEASE_INDEX = len(THROW) - 1          # 0-based: เฟรมปล่อยมือ = สร้างลูกโป่งลอย
PLACE_INDEX = len(range(48, 129, 5)) - 1  # เฟรมลูกโป่งถึงพื้น = สร้างกับดัก

# ── ตัวตลกหัวล้านเดิน (F) ── ยึดสะโพกรายเฟรม (เดินอยู่กับที่)
for i, n in enumerate(range(67, 84), 1):
    im, m = cut(fp("64805FF8", n))
    dear[f"bald_walk_{i}.png"] = place_dear(im, m, hip_x(m))
print("bald_walk: 17 เฟรม f67-f83")

# ── ลูกโป่งลอย (A f120-f164) ── จัดกึ่งกลางพวงทุกเฟรม (โค้ดเป็นคนพาไป)
BOX = (640, 40, 1120, 460)
ims = []
for n in range(120, 165, 4):
    im, m = cut_crop(fp("4295CB05", n), BOX)
    bb = im.getbbox(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    c = Image.new("RGBA", (300, 300), (0, 0, 0, 0)); c.alpha_composite(im, (round(150 - cx), round(150 - cy)))
    ims.append(c)
fr, meta = on_canvas(ims, (150, 150)); fxmeta["balloon_fly"] = meta
for i, f in enumerate(fr, 1): fx[f"balloon_fly_{i}.png"] = f

# ── ลูกโป่งบนพื้น (C f1-f24) ── จุดยึดล่างกลาง
BOX = (740, 480, 1030, 720)
cuts = [cut_crop(fp("7ADD6551", n), BOX) for n in range(1, 25, 4)]
bot = max(np.nonzero(m)[0].max() for _, m in cuts); cx = float(np.median([hip_x(m) for _, m in cuts]))
fr, meta = on_canvas([im for im, _ in cuts], (cx, bot)); fxmeta["balloon_floor"] = meta
for i, f in enumerate(fr, 1): fx[f"balloon_floor_{i}.png"] = f

# ── ควันพิษ (C f25-f80) ── จุดยึด = จุดระเบิดบนพื้น (ตำแหน่งลูกโป่งเดิม)
BOX = (540, 20, 1200, 720)
fr, meta = on_canvas([soft_cut(fp("7ADD6551", n), BOX) for n in range(25, 81, 3)], (883 - 540, 700 - 20))
fxmeta["poison"] = meta
for i, f in enumerate(fr, 1): fx[f"poison_{i}.png"] = f

# ── confetti (A f168-f206) ── จุดยึด = จุดที่พวงลูกโป่งแตก (~x916 y264 ในคลิป) · ตัด Dear ทางซ้ายออก · ขอบขวา/พื้นมืดกว่าพื้นอ้างอิง ตัดทิ้ง
BOX = (300, 0, 1236, 690)
fr, meta = on_canvas([soft_cut(fp("4295CB05", n), BOX, gain=35, bg_from=fp("4295CB05", 30)) for n in range(168, 207, 2)], (916 - 300, 264))
fxmeta["confetti"] = meta
for i, f in enumerate(fr, 1): fx[f"confetti_{i}.png"] = f

# ── กล่องไขลาน + ตุ๊กตาสปริง (D f256-f300) ── จุดยึดล่างกลางกล่อง (x~868 y~710)
BOX = (580, 30, 1140, 716)
fr, meta = on_canvas([cut_crop(fp("6ED7D0F2", n), BOX)[0] for n in range(256, 301, 2)], (868 - 580, 710 - 30))
fxmeta["jackbox"] = meta
for i, f in enumerate(fr, 1): fx[f"jackbox_{i}.png"] = f

for k, v in fxmeta.items():
    v["frames"] = sum(1 for f in fx if f.startswith(k + "_"))
    print(f"fx {k}: {v['frames']} เฟรม ผืน {v['w']}x{v['h']} origin ({v['originX']},{v['originY']})")

_ns["meta_extra"] = {"releaseIndex": RELEASE_INDEX, "placeIndex": PLACE_INDEX}
pack(dear, "dearv2_balloon_atlas")
_ns["meta_extra"] = {}
pack(fx, "dv2fx_atlas")
for name, extra in (("dearv2_balloon_atlas", {"releaseIndex": RELEASE_INDEX, "placeIndex": PLACE_INDEX}), ("dv2fx_atlas", {"fx": fxmeta})):
    p = f"{OUT}/{name}.json"; d = json.load(open(p)); d["meta"].pop("sneak", None); d["meta"].update(extra)
    json.dump(d, open(p, "w"), indent=1)
print("releaseIndex", RELEASE_INDEX, "placeIndex", PLACE_INDEX)
