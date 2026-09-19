import sys; sys.path.insert(0,'.')
from cut import cutout
from PIL import Image
import numpy as np, json, os

RAW="raw"; OUT="out"; os.makedirs(OUT,exist_ok=True)
CANVAS=(480,470); ANCHOR_X=240; FEET_Y=431; STANDING=393
HEAD_TOP=FEET_Y-STANDING
G,A="ground","air"

SEQ = {
  # ยืนตั้งการ์ด — เก็บทั่วคลิปให้เห็นการหายใจ
  "idle":  ("7C49CEEE",   list(range(1,210,26)), G),
  # วิ่ง — เอาเฉพาะ "รอบก้าวจริง" f10-f29 (f1-f9 คือช่วงออกตัวจากยืน เอามาลูปแล้วดูหนืด)
  # f30+ ใช้ไม่ได้เพราะฝุ่น/เส้นความเร็วบังจนความกว้างพุ่งเป็น 700+
  "run":   ("1037ED94_2_",[11,13,15,17,19,21,23,25,27,29], G),
  # กระโดด: f7-f13 ลอยขึ้น (bottom 640->486) / f21-f27 ตกลง / f30-f36 ลงพื้น
  "jump":  ("1037ED94",   [5,7,9,11,13],         A),
  "fall":  ("1037ED94",   [21,23,25,27],         A),
  "land":  ("1037ED94",   [30,33,36],            G),
  # หมัด 3 จังหวะ (windup -> กระแทก -> ชัก)
  "hit1":  ("7C49CEEE_1_",[17,19,21,23,25,27,29],G),
  "hit2":  ("7C49CEEE_1_",[33,35,37,39,41,45,49],G),
  "hit3":  ("7C49CEEE_1_",[53,55,57,59,61,65,69],G),
  # รัวหมัด — ช่วงที่มีเส้นแรงกระแทกในคลิป
  "rush":  ("7C49CEEE_1_",list(range(93,134,2)), G),
  # โดนตี: แฟลช -> เซถอย
  "hurt":  ("1037ED94_1_",[1,4,8,12,16,20,26,32],G),
  # ท่ากัน: กอดอก
  "block": ("1037ED94_1_",[57,60,63,66,69,72,75,78],G),
}

# สเกลอ้างอิงจากท่ายืน
im0,fg0=cutout(f"{RAW}/7C49CEEE/f_001.png")
ys0,_=np.nonzero(fg0)
SCALE=STANDING/(ys0.max()-ys0.min())
print(f"scale={SCALE:.4f}")

built={}
for name,(vid,nums,kind) in SEQ.items():
    made=0
    for idx,n in enumerate(nums,1):
        p=f"{RAW}/{vid}/f_{n:03d}.png"
        if not os.path.exists(p): continue
        im,fg=cutout(p)
        ys,xs=np.nonzero(fg)
        top,bot=int(ys.min()),int(ys.max()); cx=(int(xs.min())+int(xs.max()))/2
        w,h=round(im.width*SCALE),round(im.height*SCALE)
        im=im.resize((w,h),Image.LANCZOS)
        c=Image.new("RGBA",CANVAS,(0,0,0,0))
        dx=round(ANCHOR_X-cx*SCALE)
        dy=round(FEET_Y-bot*SCALE) if kind==G else round(HEAD_TOP-top*SCALE)
        c.alpha_composite(im,(dx,dy))
        made+=1
        key=f"{name}_{made}"
        c.save(f"{OUT}/{key}.png"); built[key]=c
    print(f"{name:6s} {made:3d} frames  [{vid}]")

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
sheet.save(f"{OUT}/marchv2_atlas.png")
json.dump({"frames":om,"meta":{"image":"marchv2_atlas.png","size":{"w":W,"h":H},"scale":"1"}},
          open(f"{OUT}/marchv2_atlas.json","w"),indent=1)
print(f"\npacked {(W,H)} {len(om)} frames")
