"""
จัด atlas ใหม่เป็นแบบหลายแถว (grid) แทนแถวเดียวยาว

ทำไมต้องมี: การ์ดจอมีลิมิตความกว้าง texture (มักเป็น 16384 บางเครื่อง 8192)
atlas แถวเดียวของตัวละครที่มีเฟรมเยอะจะกว้างเกินลิมิต -> อัปโหลดไม่ได้ -> เรนเดอร์เป็นกล่องดำ
สคริปต์นี้ห่อเฟรมลงหลายแถวให้กว้างไม่เกิน MAX_W โดยพิกัดใน .json อัปเดตตาม

ใช้: python3 tools/repack_atlas.py assets/characters/xxx_atlas.json
"""
from PIL import Image
import json, sys, os

MAX_W = 2048

def repack(json_path, max_w=MAX_W):
    d = json.load(open(json_path))
    png_path = os.path.join(os.path.dirname(json_path), d["meta"]["image"])
    sheet = Image.open(png_path).convert("RGBA")

    # คลี่กลับเป็น canvas เต็มของแต่ละเฟรมก่อน
    full = {}
    for name, info in d["frames"].items():
        fr, ss, sz = info["frame"], info["spriteSourceSize"], info["sourceSize"]
        crop = sheet.crop((fr["x"], fr["y"], fr["x"] + fr["w"], fr["y"] + fr["h"]))
        c = Image.new("RGBA", (sz["w"], sz["h"]), (0, 0, 0, 0))
        c.alpha_composite(crop, (ss["x"], ss["y"]))
        full[name] = c

    # trim + จัดเป็นแถว
    trims = {k: (v.getbbox() or (0, 0, 1, 1), v) for k, v in full.items()}
    pad = 2
    rows, cur, cur_w = [], [], pad
    for name, (bb, img) in trims.items():
        w = bb[2] - bb[0] + pad
        if cur and cur_w + w > max_w:
            rows.append(cur); cur, cur_w = [], pad
        cur.append(name); cur_w += w
    if cur: rows.append(cur)

    row_h = [max(trims[n][0][3] - trims[n][0][1] for n in r) + pad for r in rows]
    W = max(sum(trims[n][0][2] - trims[n][0][0] + pad for n in r) + pad for r in rows)
    H = sum(row_h) + pad

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    meta = {}
    y = pad
    for ri, r in enumerate(rows):
        x = pad
        for name in r:
            bb, img = trims[name]
            crop = img.crop(bb)
            out.paste(crop, (x, y))
            meta[name] = {
                "frame": {"x": x, "y": y, "w": crop.width, "h": crop.height},
                "rotated": False, "trimmed": True,
                "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": crop.width, "h": crop.height},
                "sourceSize": {"w": img.width, "h": img.height},
            }
            x += crop.width + pad
        y += row_h[ri]

    out.save(png_path)
    # คงคีย์อื่นใน meta ที่ build script ใส่มาไว้ (เช่น anchorX/feetY ของ SCRAMBLE, kick ของไททัน)
    # เขียนทับทั้งก้อนจะทำให้ค่าพวกนั้นหายเงียบ ๆ แล้วฉากไปวางสไปรท์ผิดตำแหน่งโดยไม่มี error
    new_meta = {**d["meta"], "image": d["meta"]["image"], "size": {"w": W, "h": H}, "scale": "1"}
    json.dump({"frames": meta, "meta": new_meta}, open(json_path, "w"), indent=1)
    print(f"{os.path.basename(png_path)}: -> {W} x {H}  ({len(rows)} แถว, {len(meta)} เฟรม)")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        repack(p)
