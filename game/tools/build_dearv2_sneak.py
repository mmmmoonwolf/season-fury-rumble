"""
Dear V.2 สกิล 2 "ย่อง" (v32) — ตัดท่าจากคลิป gemini_generated_video_83B1F778.mp4 (1280x720 @24fps, 348 เฟรม)

ใช้:
  mkdir -p raw/dv2_sneak
  ffmpeg -i gemini_generated_video_83B1F778.mp4 -vsync 0 raw/dv2_sneak/f%04d.png
  python3 tools/build_dearv2_sneak.py raw/dv2_sneak assets/characters
  python3 tools/build_dearv2_sneak.py raw/dv2_sneak assets/characters --widen   # ครั้งแรกเท่านั้น (ดูข้อ 3)

ออก atlas `dearv2_sneak_atlas` (ผืนภาพ 640x470 · จุดยึด x=320 · เท้า y=431 · ตัวยืนสูง 393)

ช่วงท่าในคลิป (ไล่ดู contact sheet แล้ว):
  f1-f30    ยืนหน้าตรง ถือมีดต่ำ           — ไม่ใช้
  f28-f46   ย่อตัวลงเข้าท่าย่อง              -> sneak_in (ท่าเปิดสกิล)
  f44-f118  ย่องเดินเขย่ง มือทำท่ากรงเล็บ (ไม่ถือมีด) — ตัวเดินไปทางขวาจริง ยึดสะโพกรายเฟรมเพื่อเดินอยู่กับที่
            รอบก้าวครบ 2 ขา = f60 -> f91 (ซ้อนภาพ IoU สูงสุด)  -> sneak_walk
            f62-f70 เท้าชิดกัน นิ่ง                            -> sneak_idle
  f121-f160 หันหน้าตรง ควักมีด              — ไม่ใช้
  f161-f200 ก้าวพุ่งแทงยาว                  — ไม่ใช้ (ใหญ่ไป ไม่เหมาะกับรัว)
  f210-f248 แทงลงแบบคว่ำมีด (ตัวสูงกว่า)     — ไม่ใช้
  f268-f298 ย่อต่ำ แทงมีดแนวนอน 2 ครั้ง       -> stab A (f274 ยืดสุด) / stab B (f292 ยืดสุด)
  f300-f340 ถือมีดไพล่หลัง                  — ไม่ใช้

1) พื้นหลัง: ขาวเกือบล้วน (~252-255) แต่อมเหลือง/ไล่เฉดเล็กน้อยช่วงหลังของคลิป
   ฟิต \"พื้นผิวพหุนามกำลัง 2\" ต่อช่องสีจากพิกเซลที่ไม่ใช่ตัวละคร (bg_plate)
   — วิธีเฉลี่ยเบลอของ v30 พังตรงที่ตัวละครบังเต็มหน้าต่าง (พื้นหลังในตัวมืดลงเหลือ ~150 -> ชุดครีมเป็นรู)
2) นับเป็นตัวละครเฉพาะพิกเซลที่ \"เข้มกว่าพื้นหลัง\" หรืออิ่มสี — แสงฟุ้งรอบตัวที่สว่างกว่าพื้นหลังจะไม่ติดมาเป็นขอบขาว
   ขอบ alpha นุ่มตามส่วนต่าง + ถอดสีพื้นหลังออกจากขอบ (I = a*C + (1-a)*B)
   เงาเทาใต้รองเท้า: ตัดในแถบล่าง 60px (48 เดิมสั้นไป เงาข้างเท้าหน้าท่าย่อต่ำหลุดขอบแถบ) (สีไม่อิ่ม + ไม่เข้ม) แล้ว opening แรงเฉพาะแถบนั้น
3) ท่าแทงยื่นมีดไกลกว่าผืนภาพเดิม 420 -> ขยายผืนภาพ Dear V.2 เป็น 640 ทุกไฟล์
   `--widen` แก้ dearv2_atlas.json ให้ผืนภาพกว้าง 640 (เลื่อน spriteSourceSize.x +110 ไม่แตะพิกเซล)
   รันซ้ำไม่ได้ (สคริปต์เช็ค sourceSize ก่อน ถ้าเป็น 640 แล้วจะข้าม)
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW = sys.argv[1] if len(sys.argv) > 1 else "raw/dv2_sneak"
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/characters"
WIDEN = "--widen" in sys.argv

CANVAS = (640, 470); ANCHOR_X = 320; FEET_Y = 431; STANDING = 393
OLD_W = 420
CLIP_H = 660                       # ตัวยืนตรงในคลิป (f1: y42-y701) = เท่าคลิปเก่าของ Dear V.2
SCALE = STANDING / CLIP_H
MAX_W = 4096

# (ชื่อท่า, เฟรม, วิธียึดแนวนอน) — "hip" = สะโพกรายเฟรม (เดินอยู่กับที่) · "fixed" = ค่ากลางสะโพกทั้งท่า (แขนพุ่งจริง)
SEQ = [
    ("sneak_in", list(range(28, 47, 2)), "hip"),
    ("sneak_idle", [62, 64, 66, 68, 70], "hip"),
    ("sneak_walk", list(range(60, 91, 2)), "hip"),
    ("stabA", [270, 272, 274, 276, 278, 282], "fixed"),
    ("stabB", [288, 290, 292, 294, 296, 298], "fixed"),
]


def bg_plate(rgb, rough):
    H, W, _ = rgb.shape
    yy, xx = np.mgrid[0:H:6, 0:W:6]
    ok = ~rough[::6, ::6]
    x = xx[ok] / W - 0.5; y = yy[ok] / H - 0.5
    A = np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1)
    Y, X = np.mgrid[0:H, 0:W]; X = X / W - 0.5; Y = Y / H - 0.5
    B = np.stack([np.ones_like(X), X, Y, X * X, Y * Y, X * Y], -1)
    out = np.empty_like(rgb)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, rgb[::6, ::6, c][ok], rcond=None)
        out[..., c] = B @ coef
    return out.astype(np.float32)


def cut(path, thr=10):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(2) - rgb.min(2)
    rough = ndimage.binary_dilation((lum < 240) | (sat > 14), np.ones((25, 25)))
    bg = bg_plate(rgb, rough)
    d = np.clip(bg - rgb, 0, None).max(2) + np.clip(sat - 12, 0, None)
    core = ndimage.binary_closing(d > thr, np.ones((5, 5)))
    ys = np.nonzero(core.any(1))[0]
    if len(ys):
        bot = ys.max(); y0 = max(bot - 60, 0)
        band = np.zeros_like(core); band[y0:bot + 1] = True
        core &= ~(band & (sat < 22) & (lum > 110))
        core = np.where(band, ndimage.binary_opening(core, np.ones((9, 9))), core)
        core = ndimage.binary_opening(core, np.ones((3, 3)))
    core[640:, 1150:] = False                         # ลายน้ำ Gemini มุมขวาล่าง
    lab, n = ndimage.label(core)
    sz = ndimage.sum(core, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sz)) + 1)
    near = ndimage.binary_dilation(main, np.ones((61, 61)))
    keep = main.copy()
    for i in range(1, n + 1):                         # ชิ้นเล็กที่อยู่ติดตัว (ใบมีด/ปลายริบบิ้น)
        if sz[i - 1] >= 120 and (near & (lab == i)).any():
            keep |= lab == i
    holes = ndimage.binary_fill_holes(keep) & ~keep   # อุดรูเล็กในชุด ไม่ถมช่องใหญ่ระหว่างแขน/ขา
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1))
        for i, s in enumerate(hs, 1):
            if s < 400:
                keep |= hl == i
    inner = ndimage.binary_erosion(keep, np.ones((5, 5)))
    a = np.where(inner, 1.0, np.clip((d - 3) / 22, 0, 1)) * ndimage.binary_dilation(keep, np.ones((3, 3)))
    col = np.clip((rgb - (1 - a[..., None]) * bg) / np.maximum(a, 1e-3)[..., None], 0, 255)
    col = np.where(a[..., None] > 0.02, col, 0)
    return Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), "RGBA"), keep


def hip_x(mask):
    ys, xs = np.nonzero(mask)
    top, bot = ys.min(), ys.max()
    band = (ys > top + 0.45 * (bot - top)) & (ys < top + 0.6 * (bot - top))
    return float(np.median(xs[band])) if band.any() else float((xs.min() + xs.max()) / 2)


def place(im, mask, cx):
    ys, _ = np.nonzero(mask)
    bot = int(ys.max())
    sim = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
    c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    c.alpha_composite(sim, (round(ANCHOR_X - cx * SCALE), round(FEET_Y - bot * SCALE)))
    return c


frames, meta_extra = {}, {}
for name, nums, mode in SEQ:
    cuts = [cut(f"{RAW}/f{n:04d}.png") for n in nums]
    hips = [hip_x(m) for _, m in cuts]
    fixed = float(np.median(hips))
    for i, ((im, m), h) in enumerate(zip(cuts, hips), 1):
        frames[f"{name}_{i}.png"] = place(im, m, h if mode == "hip" else fixed)
    print(f"{name:11s} {len(nums)} frames  f{nums[0]}-f{nums[-1]}")

# ปลายมีดตอนยืดสุด (px ผืนภาพจากจุดยึด) — ไว้เทียบกับ reach ของ hitbox
for name, idx in (("stabA", 3), ("stabB", 3)):
    im = frames[f"{name}_{idx}.png"]
    bb = im.getbbox()
    meta_extra[name] = {"tipX": bb[2] - ANCHOR_X}
    print(f"{name} ปลายมีด {bb[2] - ANCHOR_X}px จากจุดยึด (ผืนภาพ) ≈ {(bb[2] - ANCHOR_X) * 185 / STANDING:.0f}px โลก")


def pack(fr, name):
    tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in fr.items()}
    pad = 2
    rows, cur, cw = [], [], pad
    for k, (bb, _) in tr.items():
        w = bb[2] - bb[0] + pad
        if cur and cw + w > MAX_W:
            rows.append(cur); cur, cw = [], pad
        cur.append(k); cw += w
    rows.append(cur)
    rh = [max(tr[k][0][3] - tr[k][0][1] for k in r) + pad for r in rows]
    W = max(sum(tr[k][0][2] - tr[k][0][0] + pad for k in r) + pad for r in rows)
    H = sum(rh) + pad
    sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0)); meta = {}
    y = pad
    for ri, r in enumerate(rows):
        x = pad
        for k in r:
            bb, im = tr[k]; cr = im.crop(bb); sheet.paste(cr, (x, y))
            meta[k] = {"frame": {"x": x, "y": y, "w": cr.width, "h": cr.height}, "rotated": False, "trimmed": True,
                       "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": cr.width, "h": cr.height},
                       "sourceSize": {"w": im.width, "h": im.height}}
            x += cr.width + pad
        y += rh[ri]
    sheet.save(f"{OUT}/{name}.png", optimize=True)
    json.dump({"frames": meta, "meta": {"image": f"{name}.png", "size": {"w": W, "h": H}, "scale": "1", "sneak": meta_extra}},
              open(f"{OUT}/{name}.json", "w"), indent=1)
    print(f"{name}: {W}x{H}  {len(meta)} frames")
    for k, im in fr.items():
        bb = im.getbbox()
        if bb and (bb[0] == 0 or bb[2] == im.width or bb[1] == 0):
            print("⚠️ ชนขอบ:", k, bb)


pack(frames, "dearv2_sneak_atlas")

if WIDEN:
    p = f"{OUT}/dearv2_atlas.json"
    d = json.load(open(p))
    shift = (CANVAS[0] - OLD_W) // 2
    n = 0
    for k, f in d["frames"].items():
        if f["sourceSize"]["w"] == CANVAS[0]:
            continue
        f["spriteSourceSize"]["x"] += shift
        f["sourceSize"]["w"] = CANVAS[0]
        n += 1
    json.dump(d, open(p, "w"), indent=1)
    print(f"dearv2_atlas.json: ขยายผืนภาพ {OLD_W} -> {CANVAS[0]} ({n} เฟรม, เลื่อน +{shift})")
