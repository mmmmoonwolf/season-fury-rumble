"""
KunJae ชุดอาวุธ (v27) — ขยายผืนภาพ + เพิ่มท่าแส้ (ตีพื้นฐาน) และท่าลูกซองคู่ (สกิล 1 ลูกซอง)

ใช้:
  mkdir -p raw/kj_whip raw/kj_guns
  ffmpeg -i gemini_generated_video_AC8D3681.mp4 -vsync 0 -start_number 1 raw/kj_whip/f%03d.png
  ffmpeg -i gemini_generated_video_30FEA331.mp4 -vsync 0 -start_number 1 raw/kj_guns/f%03d.png
  python3 tools/build_kunjae_weapons.py raw/kj_whip raw/kj_guns assets/characters

อ่าน atlas KunJae เดิม (560x470) แล้ว "ขยายผืนภาพ" เป็น 944x470 โดยไม่แตะพิกเซล (เลื่อน spriteSourceSize)
เพราะแส้ยืดไกล — เฟรมทุกท่าของตัวละครเดียวกันต้องใช้ผืนภาพเท่ากัน (frames.test ตรวจ)

คลิป (1280x720 @24fps 304 เฟรม พื้นขาว 255 · กล้องนิ่ง · ตัวละครสูง 625px ตำแหน่งเดียวกับคลิป idle เดิม)
  AC8D3681 แส้:  f1-f70 ยืนการ์ด · f73-f103 ชักแส้จากสะโพก
                 ฟาด 4 รอบ: เงื้อ f121-f136 -> ฟาดขวา f145-f148 | เงื้อ f160-f169 -> f175-f178
                            | เงื้อ f190-f199 -> f205-f208 | เงื้อ f217-f226 -> f232-f235
                 f241-f301 แส้ลงพื้น เก็บแส้
  30FEA331 ปืนคู่: f109-f155 ชักปืน 2 กระบอก · f159 ปืนชี้ฟ้า · f163-f179 กางแขนเล็งซ้าย-ขวา
                 f183-f195 ยิงพร้อมกัน (ไฟปากกระบอก + ตัวโดนแสงส้ม) · f199+ ควันเต็มฉาก (ไม่ใช้)
                 f247-f283 เล็งมือเดียวไปข้างหน้า ยิง f253 (ยังไม่ใช้)
  ไฟ/ควันตอนยิงวาดด้วยโค้ด (GunEffects) — เฟรมที่มีไฟ/ควันตัดยาก และตัวโดนแสงส้มเพี้ยนสี
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW_W = sys.argv[1] if len(sys.argv) > 1 else "raw/kj_whip"
RAW_G = sys.argv[2] if len(sys.argv) > 2 else "raw/kj_guns"
OUT = sys.argv[3] if len(sys.argv) > 3 else "out"
RAW_S = sys.argv[4] if len(sys.argv) > 4 else "raw/kj_sonic"   # v29 คลิปแส้ sonic boom (123B2E73)
RAW_L = sys.argv[5] if len(sys.argv) > 5 else "raw/kj_lasso"   # v29 คลิปบ่วงบาศ + เตะ (0DDB62E1)

THR = 243
KNOWN_W = (560, 944, 1240)  # ผืนภาพรุ่นก่อน (v26 = 560, v27-28 = 944, ทดลอง 1240)
CANVAS = (1400, 470)  # v29: เชือกบ่วงบาศยืดไกลกว่าแส้
ANCHOR_X = CANVAS[0] // 2; FEET_Y = 431; STANDING = 393
MAX_W = 4096
# กล้องนิ่งทั้ง 2 คลิป — ใช้จุดยึดเดียวจากเฟรมยืน f1 (กึ่งกลางตัว x=533, เท้า y=687, สูง 625)
CLIP_CX, CLIP_FEET, CLIP_H = 533, 687, 625
SCALE = STANDING / CLIP_H
BODY_BOX = (440, 300, 640, 600)  # x0, y0, x1, y1 ในคลิป — สะโพกถึงเข่าของตัวยืน

def cutout(path, extra_parts=True, body_box=None, drop_shadow=False, drop_glow=False):
    """พื้นขาว -> โปร่ง · เก็บชิ้นใหญ่สุด (+ ชิ้นรองที่เข้มพอ ถ้า extra_parts — ปลายแส้เบลอหลุดจากเส้นหลัก)"""
    bb = body_box or BODY_BOX
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    raw = lum < THR
    if drop_shadow:  # คลิปบ่วงบาศมีเงาเทาบนพื้น (ShadowSystem วาดเงาให้อยู่แล้ว) — ตัดเทาอ่อนไม่มีสีทิ้ง
        raw &= ~((lum > 175) & (sat < 22))
    fg = ndimage.binary_closing(raw, np.ones((3, 3)))
    lab, n = ndimage.label(fg)
    if n:
        idx = range(1, n + 1)
        sz = ndimage.sum(fg, lab, idx)
        mn = ndimage.mean(lum, lab, idx)
        # ชิ้นหลัก = ชิ้นที่ทับ "ช่วงลำตัว" มากสุด (ไม่ใช่ใหญ่สุด — ควันบนพื้นบางเฟรมใหญ่กว่าตัว)
        box = np.zeros_like(fg); box[bb[1]:bb[3], bb[0]:bb[2]] = True
        big = int(np.argmax(ndimage.sum(fg & box, lab, idx))) + 1
        keep = [i for i, s, m in zip(idx, sz, mn) if i == big or (extra_parts and s >= 40 and m < 200)]
        fg = np.isin(lab, keep)
    holes, nh = ndimage.label(ndimage.binary_fill_holes(fg) & ~fg)
    if nh:
        idx = range(1, nh + 1)
        area = ndimage.sum(np.ones_like(lum), holes, idx)
        mean = ndimage.mean(lum, holes, idx)
        keepH = [i for i, a, m in zip(idx, area, mean) if a < 60 or m < 238]
        fg = fg | np.isin(holes, keepH)
    inner = ndimage.binary_erosion(fg, np.ones((5, 5)))
    # เงาเบลอของแส้ที่หนา (สีเทาอ่อนต่อกับพื้นขาว) ไม่นับเป็นเนื้อทึบ — ส่วนสีอ่อนที่เส้นขอบล้อมไว้ (เสื้อขาว) ยังทึบ
    light = lum >= 205
    # เส้นขอบตัวบางช่วงขาด (แขนเบลอ) -> ขยายเส้นเข้มกั้นไว้ก่อน ไม่ให้ "ช่องสว่าง" รั่วเข้าไปถึงแขนเสื้อ
    # (กั้นเฉพาะรอบลำตัว — ตัวแส้เองไม่กั้น เงาเบลอข้างแส้ยังโปร่งได้)
    op = ndimage.binary_opening(fg, np.ones((15, 15)))
    labc, nc = ndimage.label(op)
    if nc:  # เก็บเฉพาะก้อนลำตัว (ก้อนเบลอหนาของแส้ที่ลอยห่างตัวไม่นับ)
        ids = np.unique(labc[bb[1]:bb[3], bb[0]:bb[2]])
        op = np.isin(labc, ids[ids > 0])
    core = ndimage.binary_dilation(op, np.ones((3, 3)), iterations=4)
    if drop_glow:  # แสงเหลืองตามแส้/แฟลชบูม (คลิป sonic) นอกลำตัว -> ทิ้ง (วาดเอฟเฟกต์ด้วยโค้ด)
        glow = (lum > 150) & (rgb[..., 2] < rgb[..., 0] - 35) & (rgb[..., 1] > 120)
        fg &= ~(glow & ~core)
        inner &= fg
    barrier = ndimage.binary_dilation(lum < 170, np.ones((3, 3)), iterations=3) & core
    lab2, _ = ndimage.label((light & ~barrier) | ~fg)
    open_ids = np.unique(lab2[~fg & (lab2 > 0)])
    inner &= ~(np.isin(lab2, open_ids) & light & ~barrier)
    # เงาเบลอหนาของแส้ (เทาอ่อน ไม่มีสี) ที่อยู่นอกลำตัว -> โปร่งแสงเสมอ
    inner &= ~(~core & (lum > 140) & (sat < 25))
    # ขอบ + เส้นบาง (แส้): ถอดสีขาวของพื้นออก (สมมติภาพ = a*สีจริง + (1-a)*ขาว)
    # ไม่ทำ แส้ที่หนาแค่ 2-3px จะกลายเป็นเส้นขาวบนพื้นเข้ม
    a = np.clip((252 - lum) / (252 - 70), 0, 1)
    col = np.clip((rgb - (1 - a[..., None]) * 255) / np.maximum(a, 0.08)[..., None], 0, 255)
    rgb = np.where(inner[..., None], rgb, col)
    alpha = np.where(inner, 255, a * 255) * fg
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")

def place(path, extra_parts=True, cx=CLIP_CX, feet=CLIP_FEET, zoom=1.0, body_box=None, drop_shadow=False, drop_glow=False):
    """zoom = ขนาดตัวในคลิปเทียบมาตรฐาน (สูง 625) — กล้องซูมออก = < 1"""
    im = cutout(path, extra_parts, body_box, drop_shadow, drop_glow)
    sc = SCALE / zoom
    w, h = round(im.width * sc), round(im.height * sc)
    sim = im.resize((w, h), Image.LANCZOS)
    c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    c.alpha_composite(sim, (round(ANCHOR_X - cx * sc), round(FEET_Y - feet * sc)))
    a = np.asarray(c)[..., 3].copy(); a[a < 8] = 0
    c.putalpha(Image.fromarray(a))
    return c

# ท่าแส้ 3 แบบ (ปุ่มตีสลับไปมา) — เฟรมที่แส้ยืดสุดอยู่ลำดับที่ 3 ให้ตรงช่วง hitbox (ดู KunJae.js)
WHIP = {
    "whip1": [136, 142, 145, 148, 151, 154, 157],
    "whip2": [166, 172, 175, 178, 181, 184, 187],
    "whip3": [199, 202, 205, 208, 211, 214],
}
# ลูกซองคู่: ชักปืน -> ปืนชี้ฟ้า -> กางแขนเล็งซ้าย-ขวา (เฟรมสุดท้าย = ท่ายิง)
# ยืนถือแส้ แส้ห้อยลากพื้นด้านหลัง (ช่วงเก็บแส้ f259-f280) — idle ตอนถือแส้
WHIP["whipidle"] = [259, 262, 265, 268, 271, 274, 277, 280]
# คลิปปืนคู่ (ลูกซอง) — เก็บชิ้นใหญ่สุดชิ้นเดียว (ปลอกกระสุน/ควันบนพื้นหลุดออก)
GUNS = {
    "sg": [139, 143, 147, 151, 155, 159, 163, 167, 171, 175, 179],  # สกิล 1 ยิงซ้าย-ขวา
    "sgidle": [239, 240, 241, 242],        # ยืนถือปืนคู่ ยกปืนระดับอก (idle ตอนถือลูกซอง)
    "sgshot": [241, 244, 247, 250],        # เล็งไปข้างหน้า -> ยิง (f250 = ท่ายิง · ไฟวาดด้วยโค้ด)
}

# ── v29 แส้ S1: ฟาดเร็ว sonic boom (คลิป 123B2E73 · 137 เฟรม) ──
#   f1-f31 เหวี่ยงแส้มีแสงตามแส้ -> f31 แส้ยืดสุด (เสียงบูม f31) · f36-f66 วงคลื่นกระแทก+แฟลชเต็มจอ (ตัดไม่ได้ วาดด้วยโค้ด)
#   f71-f91 ดึงแส้กลับ · f96+ ยืนถือแส้ · กล้องนิ่ง ตัวสูงเท่ามาตรฐาน สะโพก x~549 (คลิปแส้เดิม ~523 ที่จุดยึด 533)
#   ⚠️ f31 แส้ยังง้างอยู่ด้านหลัง — แส้สะบัดไปข้างหน้าจริงที่ f32-f33 (บูมเกิดหน้ามือ f33)
#   ใช้ช่วงง้างท้าย ๆ (แสงน้อย ตัวไม่โดนแสงเหลืองย้อม) -> สะบัด -> ดึงกลับ
#   f32-f33 มีวงคลื่นเทาทับแขน ตัดไม่สะอาด -> KunJae.js ใช้ whip1_3/whip1_4 (แส้ฟาดไปหน้า ท่าใกล้กัน) แทน
SONIC = {"sonic": [25, 27, 29, 31, 76, 81, 86, 91]}
SONIC_CX = 559
# ── v29 แส้ S2: เขวี้ยงบ่วงบาศ ดึง แล้วเตะ (คลิป 0DDB62E1 · 240 เฟรม) ──
#   f31-f66 หมุนบ่วงเหนือหัว · f71-f91 เขวี้ยง · f96-f146 เชือกตึง · f151-f171 ดึงกลับ · f176-f206 ม้วนเชือก+ยกเข่า
#   f211 เตะโดน (เสียงกระแทก) · f216-f236 เตะค้าง/คืนท่า
#   ⚠️ กล้องซูมออก+แพนระหว่างคลิป -> ปรับขนาด/จุดยึดรายเฟรม (สะโพก + เท้า) · มีเงาเทาบนพื้น (ตัดทิ้ง)
# (f141 ขนาดตัวไม่เข้ากับเฟรมข้างเคียง — ข้าม)
LASSO = [36, 46, 56, 66, 71, 76, 81, 86, 91, 121, 146, 151, 156, 161, 166, 171,
         176, 181, 186, 191, 196, 201, 206, 211, 216, 221, 226, 231, 236]
LASSO_KICK = 216  # เฟรมขาเหยียดสุดที่ใช้วัดระยะเตะ (เสียงกระแทกอยู่ f211)

# ขนาดตัวเทียบมาตรฐาน (กล้องซูม) — วัดจากความสูงท่ากางขาเขวี้ยง (สูง 628 ที่ขนาดมาตรฐาน f31)
# และท่ายืนตรงช่วงเตะ (f176 สูง 515) · ช่วงเอนตัวดึงวัดไม่ได้ ใช้ค่ากลาง
LASSO_ZOOM = {71: 0.927, 76: 0.919, 81: 0.912, 86: 0.903, 91: 0.895, 121: 0.893, 146: 0.84}
def lasso_zoom(f):
    if f <= 66: return 1.01
    if f in LASSO_ZOOM: return LASSO_ZOOM[f]
    if f <= 171: return 0.83
    return 0.825

def lasso_measure(path):
    """สะโพก x / เท้า y / หัว y ของตัวละคร (ไม่รวมเชือก/เงา)"""
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    solid = (lum < 200) & ((sat > 30) | (lum < 120))
    lab, n = ndimage.label(ndimage.binary_opening(solid, np.ones((9, 9))))  # opening ตัดเชือกบาง ๆ ออก
    sz = ndimage.sum(np.ones_like(lum), lab, range(1, n + 1))
    m = lab == (int(np.argmax(sz)) + 1)
    ys, xs = np.nonzero(m)
    top, bot = int(ys.min()), int(ys.max())
    band = (ys > top + 0.5 * (bot - top)) & (ys < top + 0.6 * (bot - top))
    hip = float(np.median(xs[band]))
    near = np.abs(xs - hip) < 90
    return hip, bot, int(ys[near].min())

frames = {}
# 1) เฟรมเดิม — ขยายผืนภาพ ไม่แตะพิกเซล
src_json = f"{OUT}/kunjae_atlas.json"
old = json.load(open(src_json))
old_png = Image.open(f"{OUT}/{old['meta']['image']}").convert("RGBA")
NEW_PREFIX = tuple(f"{n}_" for n in (*WHIP, *GUNS, *SONIC, "lasso"))
for k, m in old["frames"].items():
    w0 = m["sourceSize"]["w"]
    if w0 == CANVAS[0]:
        if k.startswith(NEW_PREFIX):
            continue  # รันซ้ำ: atlas ถูกขยายแล้ว — ทิ้งท่าใหม่รอบก่อน สร้างใหม่ด้านล่าง
        sh = 0
    elif w0 in KNOWN_W:
        sh = (CANVAS[0] - w0) // 2
    else:
        raise SystemExit(f"{k}: ผืนภาพกว้าง {w0} ไม่รู้จัก")
    f = m["frame"]; s = m["spriteSourceSize"]
    c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    c.alpha_composite(old_png.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), (s["x"] + sh, s["y"]))
    frames[k] = c

# 2) ท่าใหม่
for name, lst in WHIP.items():
    for i, n in enumerate(lst, 1):
        frames[f"{name}_{i}.png"] = place(f"{RAW_W}/f{n:03d}.png")
    print(name, len(lst))
for name, lst in GUNS.items():
    for i, n in enumerate(lst, 1):
        frames[f"{name}_{i}.png"] = place(f"{RAW_G}/f{n:03d}.png", extra_parts=False)
    print(name, len(lst))

for name, lst in SONIC.items():
    for i, n in enumerate(lst, 1):
        frames[f"{name}_{i}.png"] = place(f"{RAW_S}/f{n:03d}.png", cx=SONIC_CX, feet=686,
                                          body_box=(SONIC_CX - 110, 300, SONIC_CX + 90, 600), drop_glow=True)
    print(name, len(lst))

lasso_tip = []
for i, n in enumerate(LASSO, 1):
    path = f"{RAW_L}/f{n:03d}.png"
    hip, bot, top = lasso_measure(path)
    z = lasso_zoom(n)
    bb = (int(hip - 100 * z), int(bot - 390 * z), int(hip + 100 * z), int(bot - 90 * z))
    c = place(path, extra_parts=False, cx=hip, feet=bot, zoom=z, body_box=bb, drop_shadow=True)
    frames[f"lasso_{i}.png"] = c
    a = np.asarray(c)[..., 3] > 60
    ys, xs = np.nonzero(a[: FEET_Y - 70])  # ปลายเชือก/บ่วงด้านหน้า (ไม่นับช่วงเท้า)
    lasso_tip.append(int(xs.max()) - ANCHOR_X)
    if n == LASSO_KICK:
        ys2, xs2 = np.nonzero(a[FEET_Y - 330: FEET_Y - 150])  # ช่วงขาที่เตะ
        kick_x = int(xs2.max()) - ANCHOR_X
print("lasso", len(LASSO), "tip:", lasso_tip, "kick:", kick_x)

# ขอบผืนภาพ — มีอะไรชนขอบ = ผืนภาพแคบไป
for k, c in frames.items():
    bb = c.getbbox()
    if bb and (bb[0] == 0 or bb[2] == CANVAS[0] or bb[1] == 0):
        print("⚠️ ชนขอบผืนภาพ:", k, bb)

# ปากกระบอกปืนในท่ายิง (sg ท่าสุดท้าย) — จุดซ้าย/ขวาสุดของชิ้นที่อยู่ช่วงความสูงแขน -> GunEffects ใช้วางไฟ
last = np.asarray(frames[f"sg_{len(GUNS['sg'])}.png"])[..., 3] > 60
ys, xs = np.nonzero(last)
arm = (ys > 120) & (ys < 260)
lx, rx = int(xs[arm].min()), int(xs[arm].max())
ly = int(np.median(ys[arm][xs[arm] < lx + 12])); ry = int(np.median(ys[arm][xs[arm] > rx - 12]))
# ยิงไปข้างหน้า (sgshot ท่าสุดท้าย) — ปลายปืนขวาสุด
shot = np.asarray(frames[f"sgshot_{len(GUNS['sgshot'])}.png"])[..., 3] > 60
ys2, xs2 = np.nonzero(shot)
band = (ys2 > 100) & (ys2 < 240)
fx = int(xs2[band].max()); fy = int(np.median(ys2[band][xs2[band] > fx - 12]))
muzzle = {"left": [lx - ANCHOR_X, ly - FEET_Y], "right": [rx - ANCHOR_X, ry - FEET_Y],
          "front": [fx - ANCHOR_X, fy - FEET_Y]}
print("muzzle (จากจุดยึดเท้า, px ผืนภาพ):", muzzle)

# 3) pack หลายแถว — แยก 2 ไฟล์ ไม่ให้ texture ใหญ่เกิน 4096 (ท่าสกิลแส้ v29 อยู่ไฟล์แยก)
def pack(fr, name, extra_meta):
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
    json.dump({"frames": meta, "meta": {"image": f"{name}.png", "size": {"w": W, "h": H}, "scale": "1", **extra_meta}},
              open(f"{OUT}/{name}.json", "w"), indent=1)
    print(f"{name}: packed {W}x{H}  {len(meta)} frames  {len(rows)} rows")
    if max(W, H) > MAX_W:
        print(f"⚠️ {name} ใหญ่เกิน {MAX_W}")

SKILL_PREFIX = tuple(f"{n}_" for n in (*SONIC, "lasso"))
main = {k: v for k, v in frames.items() if not k.startswith(SKILL_PREFIX)}
skill = {k: v for k, v in frames.items() if k.startswith(SKILL_PREFIX)}
pack(main, "kunjae_atlas", {"muzzle": muzzle})
pack(skill, "kunjae_whipskill_atlas", {"lassoTip": dict(zip([f"lasso_{i}.png" for i in range(1, len(LASSO) + 1)], lasso_tip)),
                                       "kickX": kick_x})
