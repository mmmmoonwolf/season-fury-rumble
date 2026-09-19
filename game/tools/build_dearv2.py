import sys; sys.path.insert(0,'.')
from cutlib import cut_mask
from PIL import Image
import numpy as np, json, os

RAW="raw"; OUT="out"; os.makedirs(OUT,exist_ok=True)
CANVAS=(420,470); ANCHOR_X=210; FEET_Y=431; STANDING=393
HEAD_TOP=FEET_Y-STANDING
G,A="ground","air"

SEQ = {
 "idle":  (list(range(1,40,6)), G),
 "run":   (list(range(41,89,4)), G),
 "jump":  ([89,93,97], A),
 "fall":  ([101,105,109], A),
 "land":  ([113,117], G),
 "block": ([565,569,573,577,581,585], G),
 "hit1":  (list(range(274,299,4)), G),
 "hit2":  (list(range(508,533,4)), G),
 "hit3":  (list(range(370,395,4)), G),
 "taunt": (list(range(601,641,6)), G),
}

# สเกลอ้างอิง: ท่ายืนเฟรมแรก = ความสูงตัวยืนจริง
rgb0=np.asarray(Image.open(f"{RAW}/f_001.png").convert("RGB")).astype(np.int16)
fg0=cut_mask(rgb0); ys0,_=np.nonzero(fg0)
SCALE = STANDING/(ys0.max()-ys0.min())
print(f"scale={SCALE:.4f}")

built={}
for name,(nums,kind) in SEQ.items():
    for idx,n in enumerate(nums,1):
        rgb=np.asarray(Image.open(f"{RAW}/f_{n:03d}.png").convert("RGB")).astype(np.int16)
        fg=cut_mask(rgb)
        ys,xs=np.nonzero(fg)
        out=np.dstack([rgb.astype(np.uint8),(fg*255).astype(np.uint8)])
        im=Image.fromarray(out,"RGBA")
        top,bot=int(ys.min()),int(ys.max()); cx=(int(xs.min())+int(xs.max()))/2
        w,h=round(im.width*SCALE),round(im.height*SCALE)
        im=im.resize((w,h),Image.LANCZOS)
        c=Image.new("RGBA",CANVAS,(0,0,0,0))
        dx=round(ANCHOR_X-cx*SCALE)
        dy=round(FEET_Y-bot*SCALE) if kind==G else round(HEAD_TOP-top*SCALE)
        c.alpha_composite(im,(dx,dy))
        key=f"{name}_{idx}"
        c.save(f"{OUT}/{key}.png"); built[key]=c
    print(f"{name:6s} {len(nums)} frames  (f{nums[0]}-f{nums[-1]})")

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
sheet.save(f"{OUT}/dearv2_atlas.png")
json.dump({"frames":om,"meta":{"image":"dearv2_atlas.png","size":{"w":W,"h":H},"scale":"1"}},
          open(f"{OUT}/dearv2_atlas.json","w"),indent=1)
print(f"\npacked {(W,H)} {len(om)} frames")
