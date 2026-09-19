"""
ประกอบ atlas ของการแปลงร่าง OAT -> ไททัน (6 ไฟล์) · ไททันบ้าของสกิล 3 อยู่ที่ build_crazy_titans.py

  oat_tf           ร่าง OAT: เรืองแสง (A21-A76) + ควันปะทุ (A77-A117)      สเกลเดียวกับ oat_atlas
  oattitan         ร่างไททัน: ท่าพื้นฐาน + หมัด 1-2-3 + รัว                 สเกลไททัน
  oattitan_roar    ร่างไททัน: ท่าปรากฏตัว ยืนคำราม ไฟวาบที่หัว + ไอพวยพุ่ง (D)
  oattitan_roar2   ร่างไททัน: สกิล 3 ยืนคำรามเรียกไททันบ้า (H)
  oattitan_skill2a ร่างไททัน: สกิล 2 แขนคริสตัล -> ทุบพื้น + หนามระลอก 1 (E)
  oattitan_skill2b ร่างไททัน: สกิล 2 หนามระลอก 2 + ค้าง (E)
  (แยกไฟล์เพราะเฟรมที่มีควัน/หนามใหญ่มาก รวมกันแล้วสูงเกินลิมิต texture 8192)

ใช้:
  for c in A:A8927AEE.mov C:DC191093.mp4 D:CF4454DF.mov E:5832249E.mp4 F:669BA008.mov; do
    mkdir -p raw/titan${c%%:*}
    ffmpeg -i gemini_generated_video_${c#*:} -start_number 1 raw/titan${c%%:*}/f_%03d.png
  done
  python3 tools/build_oat_titan.py raw/titan assets/characters     # อ่าน raw/titanA ... raw/titanF

คลิป (1280x720 @24fps) — ⚠️ 669BA008 มี 2 เวอร์ชันชื่อซ้ำกัน ใช้ตัวใหม่ (70 เฟรม md5 07870db8...)
  A A8927AEE (212f)  OAT ตั้งการ์ด -> แสงวาบ f21-f73 -> ควันท่วม f77-f137 -> ไททันหมอบ/ลุก (ไม่ใช้แล้ว)
  C DC191093 (308f)  ยืน f1 · การ์ด f6-80 · วิ่ง f86-176 · กระโดด f178-225 (f185-217 หัวหลุดขอบ) · ลงพื้น f226-235 · กัน f236-306
  D CF4454DF (62f)   ยืนคำราม ไฟวาบที่หัว ไอพวยพุ่งจากตัวเพิ่มขึ้นเรื่อย ๆ
  E 5832249E (308f)  สกิล 2: การ์ด f1-80 · แขนกลายเป็นคริสตัล f81-178 · ทุบพื้น f179-187 · หนามระลอก 1 + เศษ f187-199
                     · ยืดตัว f200-224 · หนามระลอก 2 สูง f225-238 · ค้าง f238-306
  H CF4454DF v2 (49f) ยืนคำรามแหงนหน้า ไฟวาบที่หัว ไอพวยพุ่ง (ชื่อซ้ำกับคลิป D! md5 edee77ad…)
  F 669BA008 v2 (70f) ยืนพ่นไอ f1-8 · ขวา f9-15 · ซ้าย f16-22 · ขวาหนัก f24-46 (ยืดค้าง) · คืนการ์ด f47-70
     (แขน: บิดตัวเห็นหลัง = แขนขวา(ใกล้กล้อง) · เปิดอก = แขนซ้าย)

ขนาดตัว: A (OAT) = คลิป OAT เดิม · C = D = E = F (E1 ตรงกับ C1 ทุกค่า)

การตัดภาพ 2 แบบ
  body : ผิว/ผม = "มืด หรือ อิ่มสี" (พื้นหลังและเงาเป็นสีเทา) เก็บชิ้นใหญ่สุด
  fx   : เอฟเฟกต์ (ควัน/ไอ/แสง/คริสตัล) = ต่างจาก "ภาพพื้นหลังเปล่า" ของคลิปนั้น -> โปร่งแสงตามความต่าง
         ควันขาวบนพื้นขาว: ส่วนสว่างสุดของควันแทบไม่ต่างจากพื้นหลัง -> ถมด้วยค่าเบลอให้ควันดูเป็นก้อน
         เก็บทุกชิ้นที่ใหญ่พอ (เศษคริสตัล/ก้อนควันที่แยกจากตัว)
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = sys.argv[1] if len(sys.argv) > 1 else "raw/titan"
OUT = sys.argv[2] if len(sys.argv) > 2 else "out"
os.makedirs(OUT, exist_ok=True)

CANVAS = (640, 470); ANCHOR_X = 320; FEET_Y = 431; STANDING = 393
HEAD_TOP = FEET_Y - STANDING
MAX_W, MAX_H = 2048, 8192
G, A = "ground", "air"
LUMW = np.array([0.299, 0.587, 0.114], dtype=np.float32)

# ปรับโทนไททันให้เข้ากับลายเส้นตัวอื่น (ผู้ใช้เลือก "ระดับ 1" จากภาพเปรียบเทียบ)
# คลิปไททันออกมาแบบหุ่นปั้น/3D ผิวสว่างอมส้ม ไม่มีเส้นขอบ -> ดูโดดจากตัวอื่นที่เป็น cel shading
# ใช้เฉพาะผิว+ผม (ไม่แตะควัน ไอ คริสตัล) · ค่าเป็นสัดส่วน: bright 0.08 = มืดลง 8%
TITAN_STYLE = dict(bright=0.08, contrast=0.10, sat=0.15, outline=2, line=(26, 20, 18))

# สเกล: OAT ใช้ค่าเดียวกับ build_oat.py (ยืนตรงสูง 668px ในคลิป OAT เดิม) · ไททันยืนตรงใน C1 สูง 705px
OAT_SCALE = STANDING / 668
TITAN_SCALE = STANDING / 705


def path(fid):
    return f"{ROOT}{fid[0]}/f_{int(fid[1:]):03d}.png"


def load(fid):
    rgb = np.asarray(Image.open(path(fid)).convert("RGB")).astype(np.float32)
    return rgb, rgb @ LUMW, rgb.max(2) - rgb.min(2)


def body_mask(fid, thr_mode):
    rgb, lum, sat = load(fid)
    if thr_mode == "oat":  # คลิป A พื้นขาว 255 ตัวละครชุดดำ
        fg = lum < 243
    else:                  # ไททัน: ผิวอิ่มสี พื้นหลังเทา
        fg = (lum < 200) | ((sat > 14) & (lum < 246))
    fg = ndimage.binary_closing(fg, np.ones((3, 3)))
    return rgb, lum, sat, fg


def largest(fg):
    lab, n = ndimage.label(fg)
    if not n:
        return fg
    sz = ndimage.sum(fg, lab, range(1, n + 1))
    return lab == (int(np.argmax(sz)) + 1)


def fill_holes(fg, lum, sat):
    holes, nh = ndimage.label(ndimage.binary_fill_holes(fg) & ~fg)
    if not nh:
        return fg
    idx = range(1, nh + 1)
    area = ndimage.sum(np.ones_like(lum), holes, idx)
    mlum = ndimage.mean(lum, holes, idx)
    msat = ndimage.mean(sat, holes, idx)
    keep = [i for i, a, l, s in zip(idx, area, mlum, msat) if a < 60 or s > 14 or l < 200]
    return fg | np.isin(holes, keep)


def cutout_body(fid, mode):
    rgb, lum, sat, fg = body_mask(fid, mode)
    fg = fill_holes(largest(fg), lum, sat)
    inner = ndimage.binary_erosion(fg, np.ones((5, 5)))
    if mode == "oat":
        edge = np.clip((243 - lum) * 14, 0, 255)
    else:
        edge = np.clip((250 - lum) * 10 + sat * 6, 0, 255)
    alpha = np.where(inner, 255, edge) * fg
    return rgb, alpha, fg


_BG = {}


def background(clip, ref, mode):
    """ภาพพื้นหลังเปล่าของคลิป = เฟรมอ้างอิงที่ยังไม่มีเอฟเฟกต์ ลบตัวละครออกแล้วเกลี่ยให้เรียบ"""
    if clip in _BG:
        return _BG[clip]
    rgb, lum, sat, fg = body_mask(ref, mode)
    keep = ~ndimage.binary_dilation(fg, iterations=20)
    bg = np.empty_like(rgb)
    w = ndimage.gaussian_filter(keep.astype(np.float32), 40)
    for c in range(3):
        bg[..., c] = ndimage.gaussian_filter(rgb[..., c] * keep, 40) / np.maximum(w, 1e-3)
    _BG[clip] = bg
    return bg


def _diff(rgb, bg):
    return np.maximum((bg - rgb).max(2), (rgb - bg).max(2) * 1.5)


def cutout_fx(fid, mode, bg_ref, cut_floor=False, fill=False):
    rgb, body_a, body = cutout_body(fid, mode)
    lum = rgb @ LUMW
    bg = background(fid[0], bg_ref, mode)
    d = _diff(rgb, bg)
    # รอบ 2: แสงพื้นหลังของคลิปเปลี่ยนไปตามเวลา (คลิป E สว่างขึ้นช่วงหลัง) -> ประเมินพื้นหลังจากเฟรมนี้เอง
    # โดยตัดส่วนที่เป็นตัว/เอฟเฟกต์ออกแล้วเกลี่ย ถ้าเหลือพื้นที่ให้ประเมินน้อยเกินไปใช้ค่าจากเฟรมอ้างอิง
    # ตัดทิ้งเฉพาะที่ต่างชัด (>14) — พื้นหลังที่มืดลงเอง (ต่าง ~8) ต้องถูกนับเป็นพื้นหลัง ไม่งั้นกลายเป็นแถบเทา
    keep = ~ndimage.binary_dilation((d > 14) | body, iterations=15)
    w = ndimage.gaussian_filter(keep.astype(np.float32), 40)
    bg2 = bg.copy()
    ok = w > 0.05
    for c in range(3):
        est = ndimage.gaussian_filter(rgb[..., c] * keep, 40) / np.maximum(w, 1e-3)
        bg2[..., c] = np.where(ok, est, bg[..., c])
    d = _diff(rgb, bg2)
    a_raw = np.clip((d - 7) / 22, 0, 1)  # 7 = เผื่อ noise จากการบีบอัดวิดีโอ
    near = ndimage.binary_dilation(body, iterations=2)
    a = a_raw.copy()
    a[near] = 0  # ตัวละครไม่ต้องร่วมเบลอ (ไม่งั้นเกิดรัศมีขาวรอบตัว)
    # ถมส่วนสว่างของควัน (ขาวบนขาวแยกไม่ออก) — ใช้ค่าเบลอ เฉพาะบริเวณที่มีควันจริงรอบ ๆ
    blur = ndimage.gaussian_filter(a, 6)
    a = np.maximum(a, np.clip(blur * 1.35, 0, 1) * (blur > 0.08))
    # แถบ 2px รอบตัวใช้ค่าจริงคืน — เดิมปล่อยเป็น 0 เกิด "เส้นโปร่ง" สีเข้มแทรกในคริสตัล/ไอที่ติดตัว
    ring = near & ~body
    a[ring] = np.maximum(a[ring], a_raw[ring])
    if cut_floor:
        # เงาพื้นใต้เท้า (เทาไม่อิ่มสี) ไม่เอา — เกมมีเงาของตัวเอง
        rgb_i = rgb.astype(int)
        blue = (rgb_i[..., 2] - rgb_i[..., 0]) > 10
        ys, _ = np.nonzero(body)
        band = np.zeros_like(a, dtype=bool)
        band[ys.max() - 30:, :] = True
        a[band & ~blue] = 0
    lab, n = ndimage.label(a > 0.15)
    if n:
        sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
        small = np.isin(lab, [i + 1 for i, s in enumerate(sz) if s < 80])
        a[small] = 0
    # รูสว่างที่ถูกล้อม: ในตัว = แกนแสงขาว · ในควัน = ส่วนสว่างของก้อนควัน -> ทึบด้วยสีเดิม (ขาว)
    if fill:
        # เฉพาะควันก้อนหนา (คลิป A) — ไอบาง ๆ / ช่องระหว่างหนาม ถมแล้วกลายเป็นก้อนขาว
        solid = (a > 0.2) | body
        holes = ndimage.binary_fill_holes(solid) & ~solid
        # ขยายออก 3px กันเส้นขอบมืดรอบรูที่ถม (ขอบรูมี alpha ต่ำ พื้นเกมสีเข้มโผล่)
        a[ndimage.binary_dilation(holes, iterations=3) & (lum > 200)] = 1
    alpha = np.maximum(body_a, a * 255)
    # ขอบภาพต้นฉบับ: ควันที่ล้นกรอบถูกตัดเป็นเส้นตรง -> ไล่จางเข้าขอบ
    # (ทำกับ alpha สุดท้าย — คลิป A ควันสีเทาถูกนับเป็น "ตัว" ด้วย)
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([yy, xx, h - 1 - yy, w - 1 - xx]).astype(np.float32)
    alpha = alpha * np.clip(edge / 60, 0, 1)
    return rgb, alpha, body, body_a


def compose(rgb, alpha, fg_for_align, scale, ax, kind, fixed_tb=None):
    im = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
    if fixed_tb:
        top, bot = fixed_tb
    else:
        ys, _ = np.nonzero(fg_for_align)
        top, bot = int(ys.min()), int(ys.max())
    sim = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    c = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    dx = round(ANCHOR_X - ax * scale)
    dy = round(FEET_Y - bot * scale) if kind == G else round(HEAD_TOP - top * scale)
    c.alpha_composite(sim, (dx, dy))
    arr = np.asarray(c).copy()
    arr[..., 3][arr[..., 3] < 8] = 0
    return Image.fromarray(arr, "RGBA")


def style_mask(rgb, body_a):
    """ส่วนที่จะปรับโทน = ผิว (แดง > น้ำเงิน) หรือ ผม/เงาเข้ม · คริสตัล (น้ำเงิน) และไอ/ควัน (เทา) ไม่นับ"""
    r, b = rgb[..., 0], rgb[..., 2]
    lum = rgb @ LUMW
    sat = rgb.max(2) - rgb.min(2)
    # ผิวต้องอมแดงชัดและอิ่มสีจริง — น้ำแข็งที่สะท้อนโทนอุ่นนิด ๆ ไม่นับ (เคยได้เส้นดำแทรกในหนาม)
    keep = (((r - b) > 20) & (sat > 25) & (lum < 235)) | (lum < 90)
    keep &= body_a > 0
    keep = ndimage.binary_opening(keep, np.ones((2, 2)))
    # เอาเฉพาะก้อนใหญ่ (ตัว+ผม) — จุดเล็ก ๆ ในน้ำแข็ง/เศษ ทิ้ง
    lab, n = ndimage.label(keep)
    if n:
        sz = ndimage.sum(keep, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 1500])
    return body_a * keep


def apply_style(im, style_alpha, bright, contrast, sat, outline, line):
    """ปรับสีเฉพาะส่วนผิว/ผม (ถ่วงด้วย style_alpha) + เส้นขอบเข้มรอบตัว วางไว้ใต้ภาพ"""
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3] / 255
    w = (style_alpha.astype(np.float32) / 255)[..., None]
    lum = (rgb @ LUMW)[..., None]
    adj = lum + (rgb - lum) * (1 - sat)
    adj = (adj - 0.5) * (1 + contrast) + 0.5
    adj = np.clip(adj * (1 - bright), 0, 1)
    rgb = rgb * (1 - w) + adj * w
    out = Image.fromarray(np.dstack([rgb * 255, arr[..., 3]]).astype(np.uint8), "RGBA")
    if outline:
        m = style_alpha > 100
        ring = ndimage.binary_dilation(m, iterations=outline) & ~m
        edge = np.zeros(arr.shape, dtype=np.uint8)
        edge[..., :3] = line
        edge[..., 3] = ring * 235
        base = Image.fromarray(edge, "RGBA")
        base.alpha_composite(out)
        out = base
    return out


def head_x(fg):
    ys, xs = np.nonzero(fg)
    return float(np.median(xs[ys < ys.min() + 110]))


def rng(clip, a, b, step=1):
    return [f"{clip}{n}" for n in range(a, b + 1, step)]


# ────────────── ท่าต่อท่า ──────────────
# (ชื่อท่า, เฟรม, align, mode, fx, anchor)
#   mode: "oat" | "titan" · fx: None | (เฟรมพื้นหลังเปล่า, ตัดเงาพื้น?, ถมรูในควัน?) · anchor: เฟรมที่ยึดตำแหน่ง | None = ค่ากลางทั้งท่า
T, O = "titan", "oat"
F_ANC = "F8"
ATLASES = {
    "oat_tf": [
        # เรืองแสง ลำแสงพุ่งออกจากตัว (เก็บทุก 2 เฟรม)
        ("tfglow", rng("A", 21, 76, 2), G, O, ("A1", False, True), "A1"),
        # ปะทุเป็นควัน — ท่วมจนมิด (A105+) · ใช้เป็นทั้งเฟรมของ OAT และภาพควันซ้อนตอนสลับร่าง
        ("tferupt", rng("A", 77, 117, 2), G, O, ("A1", False, True), "A1"),
    ],
    "oattitan": [
        ("idle", rng("C", 8, 80, 8), G, T, None, None),
        ("run", rng("C", 130, 157, 3), G, T, None, None),
        ("jump", ["C180", "C182", "C183"], A, T, None, None),
        ("fall", ["C218", "C221", "C224"], A, T, None, None),
        ("land", ["C226", "C230"], G, T, None, None),
        ("block", ["C230", "C233", "C236", "C240", "C248"], G, T, None, None),
        ("hurt", ["C178"], G, T, None, None),            # ⚠️ ชั่วคราว ยังไม่มีท่าโดนตี
        ("taunt", ["F4"], G, T, None, None),              # ยืนย่อพ่นไอ (ไอถูกตัดไปกับพื้นหลัง)
        # หมัด 1-2-3 จากเทคเดียวกัน (F) ตามลำดับในคลิป: ขวา -> ซ้าย -> ขวาหนัก
        ("hit1", rng("F", 8, 15), G, T, None, F_ANC),
        ("hit2", rng("F", 16, 23), G, T, None, F_ANC),
        ("hit3", ["F24", "F25", "F26", "F27", "F28", "F30", "F33", "F37", "F41", "F45", "F50", "F55"], G, T, None, F_ANC),
        # สกิล 1 รัวหมัด: สลับ ขวา-ซ้าย ตอนยืดสุด
        ("rush", ["F11", "F12", "F13", "F18", "F19", "F27", "F29", "F31"], G, T, None, F_ANC),
    ],
    "oattitan_roar": [
        # ปรากฏตัว: ยืนคำราม ไฟวาบที่หัว ไอพวยพุ่ง (เก็บทุก 2 เฟรม)
        ("roar", rng("D", 1, 62, 2), G, T, ("D1", True), "D1"),
    ],
    "oattitan_roar2": [
        # สกิล 3: ยืนคำรามเรียกไททันบ้า — แหงนหน้า ไฟวาบที่หัว ไอพวยพุ่ง (คลิป H ทุก 2 เฟรม)
        ("s3roar", rng("H", 1, 49, 2), G, T, ("H1", True), "H1"),
    ],
    "oattitan_skill2a": [
        # แขนกลายเป็นคริสตัล (ย่อ 98 เฟรม -> 25)
        ("s2harden", rng("E", 81, 178, 4), G, T, ("E1", True), "E60"),
        # ทุบพื้น + หนามระลอก 1 + เศษกระจาย (ทุกเฟรม)
        ("s2slam", rng("E", 179, 199), G, T, ("E1", True), "E60"),
    ],
    "oattitan_skill2b": [
        # ยืดตัว + หนามระลอก 2 ขึ้นสูง
        ("s2wave", rng("E", 200, 238, 2), G, T, ("E1", True), "E60"),
        # ค้าง
        ("s2hold", rng("E", 240, 270, 3), G, T, ("E1", True), "E60"),
    ],
}


def build(name, specs):
    frames = {}
    for tag, ids, kind, mode, fx, anchor in specs:
        scale = OAT_SCALE if mode == O else TITAN_SCALE
        cuts = []
        for fid in ids:
            if fx:
                rgb, alpha, body, body_a = cutout_fx(fid, mode, fx[0], cut_floor=fx[1], fill=fx[2] if len(fx) > 2 else False)
            else:
                rgb, alpha, body = cutout_body(fid, mode)
                body_a = alpha
            style_a = style_mask(rgb, body_a) if mode == T else None
            cuts.append((rgb, alpha, body, style_a))
        fixed_tb = None
        if anchor:
            # กล้องนิ่ง -> ยึดทั้งแนวนอน (หัว) และแนวตั้ง (เท้า) จากเฟรมอ้างอิงเฟรมเดียว
            # (เฟรมที่แสง/ควันแรง ตัวถูกแยกเป็นท่อน วัดจากเฟรมตัวเองจะเพี้ยน)
            ab = cutout_body(anchor, mode)[2]
            ax = head_x(ab)
            ys, _ = np.nonzero(ab)
            fixed_tb = (int(ys.min()), int(ys.max()))
        else:
            ax = float(np.median([head_x(c[2]) for c in cuts]))
        for i, (rgb, alpha, body, style_a) in enumerate(cuts, 1):
            im = compose(rgb, alpha, body, scale, ax, kind, fixed_tb)
            if style_a is not None:
                sm = compose(rgb, style_a, body, scale, ax, kind, fixed_tb)
                im = apply_style(im, np.asarray(sm)[..., 3], **TITAN_STYLE)
            frames[f"{tag}_{i}.png"] = im
        print(f"  {name:16s} {tag:9s} {len(ids):3d}")
    pack(name, frames)


def pack(name, frames):
    tr = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in frames.items()}
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
    if H > MAX_H:
        raise SystemExit(f"❌ {name} สูง {H} เกิน {MAX_H} — ลดจำนวนเฟรมหรือแยก atlas")
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
    sheet.save(f"{OUT}/{name}_atlas.png", optimize=True)
    json.dump({"frames": meta, "meta": {"image": f"{name}_atlas.png", "size": {"w": W, "h": H}, "scale": "1"}},
              open(f"{OUT}/{name}_atlas.json", "w"), indent=1)
    kb = os.path.getsize(f"{OUT}/{name}_atlas.png") // 1024
    print(f"packed {name}: {W}x{H}  {len(meta)} frames  {kb} KB")


only = sys.argv[3:]  # ระบุชื่อ atlas เพื่อ build เฉพาะตัว
for name, specs in ATLASES.items():
    if not only or name in only:
        build(name, specs)
