from PIL import Image
import numpy as np, json, os

RAW="raw"; OUT="out"; os.makedirs(OUT, exist_ok=True)
CANVAS=(560,470); ANCHOR_X=280; FEET_Y=431; STANDING=393
HEAD_TOP=FEET_Y-STANDING

# ตัวละครยืนเต็มความสูงในวิดีโอ idle = 625px  -> scale ให้เหลือ 393
SCALE = STANDING/625.0

G,A="ground","air"
# (video, frame number, kind)
SEL = {
  # ---- idle: เลือกเฟรมที่ต่างกันพอให้เห็นการหายใจ ไม่ถี่จนกระตุก
  "idle_1": ("C7C07C8E",  1, G),
  "idle_2": ("C7C07C8E", 25, G),
  "idle_3": ("C7C07C8E", 49, G),
  "idle_4": ("C7C07C8E", 73, G),
  # ---- run: 1 รอบก้าวเต็ม (f1-f24) ขาสลับซ้าย-ขวาจริง
  "run_1": ("1875EC6F",  1, G),
  "run_2": ("1875EC6F",  4, G),
  "run_3": ("1875EC6F",  7, G),
  "run_4": ("1875EC6F", 10, G),
  "run_5": ("1875EC6F", 13, G),
  "run_6": ("1875EC6F", 16, G),
  "run_7": ("1875EC6F", 19, G),
  "run_8": ("1875EC6F", 22, G),
  # ---- กระโดด (ใช้จั๊มพ์ครั้งที่ 2 ที่ลอยสูงและนานกว่า)
  "jump":  ("1875EC6F", 135, A),
  "fall":  ("1875EC6F", 150, A),
  "land":  ("1875EC6F", 161, G),
  # ---- ชักปืน / เล็ง / ยิง
  "draw":    ("4C00AB7D", 112, G),
  "aim":     ("4C00AB7D", 158, G),
  "shoot_1": ("4C00AB7D", 165, G),
  "shoot_2": ("4C00AB7D", 188, G),
  "shoot_3": ("4C00AB7D", 204, G),
  "shoot_4": ("4C00AB7D", 212, G),
  "recover": ("4C00AB7D", 222, G),
  "smoke":   ("4C00AB7D", 240, G),
}

def cutout(path):
    rgb=np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum=rgb@np.array([0.299,0.587,0.114],dtype=np.float32)
    # วิดีโอมี BG ขาวไม่สนิท (มี noise) -> threshold นุ่ม ๆ กันขอบแหว่ง
    alpha=np.clip((238-lum)*10,0,255)
    return Image.fromarray(np.dstack([rgb,alpha]).astype(np.uint8),"RGBA"), lum

built={}
for name,(vid,fn,kind) in SEL.items():
    p=f"{RAW}/{vid}/f_{fn:03d}.png"
    img,lum=cutout(p)
    fg=lum<235; ys,xs=np.nonzero(fg)
    top,bot=int(ys.min()),int(ys.max()); cx=(int(xs.min())+int(xs.max()))/2
    w,h=round(img.width*SCALE),round(img.height*SCALE)
    im=img.resize((w,h),Image.LANCZOS)
    c=Image.new("RGBA",CANVAS,(0,0,0,0))
    dx=round(ANCHOR_X-cx*SCALE)
    dy=round(FEET_Y-bot*SCALE) if kind==G else round(HEAD_TOP-top*SCALE)
    c.alpha_composite(im,(dx,dy))
    c.save(f"{OUT}/{name}.png")
    built[name]=c
    print(f"{name:9s} {vid} f{fn:<4d} {kind:6s} placed=({dx},{dy})")

# ---- pack ----
frames={f"{k}.png":v for k,v in built.items()}
tr={k:(v.getbbox() or (0,0,1,1),v) for k,v in frames.items()}
pad,x=2,2
W=sum(b[2]-b[0]+pad for b,_ in tr.values())+pad
H=max(b[3]-b[1] for b,_ in tr.values())+pad*2
sheet=Image.new("RGBA",(W,H),(0,0,0,0)); om={}
for name,(bb,im) in tr.items():
    cr=im.crop(bb); sheet.paste(cr,(x,pad))
    om[name]={"frame":{"x":x,"y":pad,"w":cr.width,"h":cr.height},"rotated":False,"trimmed":True,
              "spriteSourceSize":{"x":bb[0],"y":bb[1],"w":cr.width,"h":cr.height},
              "sourceSize":{"w":im.width,"h":im.height}}
    x+=cr.width+pad
sheet.save(f"{OUT}/kunjae_atlas.png")
json.dump({"frames":om,"meta":{"image":"kunjae_atlas.png","size":{"w":W,"h":H}}},
          open(f"{OUT}/kunjae_atlas.json","w"),indent=1)
print("\npacked", (W,H), len(om), "frames")
