"""
เติมเส้นขอบเข้มให้ atlas ที่ build ไปแล้ว — ไม่ต้องมีเฟรมดิบ

ทำไมต้องมีเครื่องมือนี้แยกจาก build_*.py: เฟรมดิบของตัวละคร 4 ตัวแรกไม่ได้เก็บไว้ในเครื่องแล้ว
(อยู่นอก repo ตาม .gitignore) จะ build ใหม่ทั้งชุดไม่ได้ แต่เส้นขอบเป็น post-process ล้วน
ทำกับผืนภาพที่ pack แล้วได้ตรง ๆ โดยผลลัพธ์เหมือนกับทำตอน build ทุกประการ

ผลพลอยได้: ขอบขาวเรืองแสงหายไปด้วย เพราะพิกเซลขอบกึ่งโปร่งใสที่ "ติดสีพื้นขาวมา"
อยู่ในระยะที่โดนวงขอบเข้มทับพอดี (ดู add_outline: ring = grown & ~solid)
จึงแก้ทั้งสองปัญหาในขั้นตอนเดียว ไม่ต้องรู้สีพื้นหลังเดิมของคลิปเลย

วิธีใช้ (จากโฟลเดอร์ game):
    python3 tools/outline_atlas.py kunjae_atlas marchv2_atlas ...
    python3 tools/outline_atlas.py --px 5 --dry-run oat_atlas
"""
import sys, os, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import add_outline
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "characters")
GPU_LIMIT = 4096  # เกินนี้การ์ดจอหลายรุ่นเรนเดอร์เป็นสีดำล้วน


def frame_images(atlas, sheet):
    """คืนเฟรมแต่ละอันเป็นภาพขนาด sourceSize เต็ม (กางกลับจากที่ pack ไว้แบบ trim แล้ว)"""
    for name, meta in atlas["frames"].items():
        f, ss, src = meta["frame"], meta["spriteSourceSize"], meta["sourceSize"]
        canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
        canvas.paste(sheet.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), (ss["x"], ss["y"]))
        yield name, canvas


def pack(images, max_w=GPU_LIMIT, pad=2):
    """เรียงเป็นตาราง กว้างไม่เกิน max_w — แถวสูงเท่าเฟรมที่สูงสุดในแถวนั้น"""
    trimmed = {n: (im.getbbox() or (0, 0, 1, 1), im) for n, im in images}
    rows, cur, cw, ch = [], [], pad, 0
    for name, (bb, im) in trimmed.items():
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if cur and cw + w + pad > max_w:
            rows.append((cur, ch)); cur, cw, ch = [], pad, 0
        cur.append((name, bb, im, cw, w, h)); cw += w + pad; ch = max(ch, h)
    if cur:
        rows.append((cur, ch))

    W = max(sum(e[4] + pad for e in r) + pad for r, _ in rows)
    H = sum(h + pad for _, h in rows) + pad
    sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out, y = {}, pad
    for row, rh in rows:
        for name, bb, im, x, w, h in row:
            sheet.paste(im.crop(bb), (x, y))
            out[name] = {
                "frame": {"x": x, "y": y, "w": w, "h": h},
                "rotated": False, "trimmed": True,
                "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": w, "h": h},
                "sourceSize": {"w": im.width, "h": im.height},
            }
        y += rh + pad
    return sheet, out


def process(key, px, dry_run=False):
    jp, pp = os.path.join(ASSETS, key + ".json"), os.path.join(ASSETS, key + ".png")
    atlas = json.load(open(jp))
    sheet = Image.open(pp).convert("RGBA")
    before = atlas["meta"]["size"]

    outlined = [(n, add_outline(im, px)) for n, im in frame_images(atlas, sheet)]
    new_sheet, frames = pack(outlined)
    w, h = new_sheet.size
    grew = (w * h) / (before["w"] * before["h"]) - 1
    flag = "  !! เกินลิมิต GPU" if max(w, h) > GPU_LIMIT else ""
    print(f"{key:26s} {before['w']}x{before['h']} -> {w}x{h}  ({len(frames)} เฟรม, {grew:+.0%}){flag}")
    if max(w, h) > GPU_LIMIT:
        return False
    if dry_run:
        return True

    meta = dict(atlas["meta"]); meta["size"] = {"w": w, "h": h}
    new_sheet.save(pp)
    json.dump({"frames": frames, "meta": meta}, open(jp, "w"), indent=1)
    return True


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="+", help="ชื่อ atlas ไม่ต้องใส่นามสกุล เช่น kunjae_atlas")
    ap.add_argument("--px", type=int, default=6, help="ความหนาเส้นขอบ (ค่าเริ่มต้น 6 สำหรับเฟรมสเกล 393)")
    ap.add_argument("--dry-run", action="store_true", help="คำนวณขนาดใหม่อย่างเดียว ไม่เขียนทับไฟล์")
    args = ap.parse_args()
    ok = all([process(k, args.px, args.dry_run) for k in args.keys])
    sys.exit(0 if ok else 1)
