# Alecto / Momus — เจนใหม่ (รอบออกแบบใหม่)

> **ด่านกั้น: เจนแค่ "ขั้น 0 ท่ายืน" ก่อน แล้วส่งมาให้ดู**
> อย่าเพิ่งเจนชีตท่าใด ๆ ทั้งสิ้น เพราะถ้าสัดส่วนหรือดีไซน์ไม่ผ่าน
> ชีตทั้งหมดที่เจนไปจะต้องทิ้งทั้งใบ รอบที่แล้วเสียไปแบบนั้นหลายใบ
>
> ผ่านแล้วผมจะเขียนชีต A-H ให้ โดยเอา **style anchor** อันใหม่ไปแทนของเดิม
> โครงชีตเดิมใช้ต่อได้ทั้งหมด (อยู่ใน `art_prompts_momus_READY.md` / `art_prompts_alecto.md`)

---

## สามข้อที่แก้จากรอบที่แล้ว — เขียนลงใน prompt ทุกใบแล้ว

| ปัญหาที่เจอจริง | แก้ด้วย |
|---|---|
| **ผม/หมวกบังกะโหลก** ไม้บรรทัดวัดสัดส่วนอ่าน Momus ได้ 2.39 หัว Alecto ได้ 1.81 ทั้งที่ตัวพอดี ต้องเขียนไม้บรรทัดสำรองมาแก้ทีหลังทั้งสองตัว | สั่งตรง ๆ ว่า **ผมต้องแนบกะโหลก ไม่ฟุ้งเป็นวงกลม** และ **ต้องเห็นเส้นผมกับหน้าผาก** |
| **ท่าหมอบตื้นเกิน** Momus ได้ 93% ของท่ายืน เป้าคือ 75-85% ต้องไปยืมเฟรมจากชีตอื่นมาใช้แทน | เขียน**ตัวเลขเป้าหมายลงไปใน prompt ตรง ๆ** ไม่ใช่บอกว่า "ย่อลึก ๆ" |
| **โปรไฟล์ด้านข้างล้วน** ทำให้หัวหุบ ไม้บรรทัดอ่านว่ากล้องอยู่ไกล แล้วขยายทั้งตัวขึ้น 30% | `Three-quarter view` อยู่ใน anchor แล้ว **ห้ามลบเวลาก๊อป** |

> ⛔ **ห้ามวาดเอฟเฟค** ไม่มีไฟ ควัน ประกาย ระเบิด แสง เส้นความเร็ว
> เอฟเฟคทั้งหมดเกมวาดเอง เป็นกฎที่ใช้มาทั้งโปรเจกต์ · **ห้ามวาดคู่ต่อสู้**

---

# MOMUS — นักล้อเลียนกรีก สวมหน้ากากละคร

## แนวคิด

Momus คือ**เทพกรีกแห่งการเยาะเย้ย ที่ถูกเนรเทศจากโอลิมปัสเพราะขำเทพองค์อื่นมากเกินไป**
ของเดิมวาดเป็นตัวตลกสยองขวัญ ซึ่งบอกว่า "น่ากลัว" แต่สกิลเขาบอกว่า "ป่วน" — และไปเหมือน
ตัวละครมีลิขสิทธิ์เข้าโดยตรง รอบนี้ดึงกลับมาหาที่มาจริงของชื่อ

**ห้าอย่างที่ทำให้อ่านออกที่ 64 พิกเซล**

1. **หน้ากากตลกกรีกสีงาช้าง** ครอบครึ่งบนของหน้า ปากยิ้มกว้าง ตาเป็นรูโหว่ คิ้วโก่งเกินจริง
   **สวมเอียง ๆ ไม่เคยตรง** — หน้ากากที่ใส่ตรงดูขรึม หน้ากากที่ใส่เบี้ยวดูกวน
2. **หน้ากากโศกสีเข้มห้อยสะโพก** ปากคว่ำ แกว่งตามตัวทุกท่า เป็นทั้งเงาที่จำได้และเป็นเรื่องเล่า
   (และเผื่อทางไว้ให้สลับหน้ากากเป็นลูกเล่นภาพในอนาคต — เขามีสกิลสลับอยู่แล้ว)
3. **ผมส้มทองแดงรุงรัง** เก็บสีเดิมไว้ เขายังเป็น "คนผมส้ม" คนเดิมของโรสเตอร์
4. **พวงหรีดลอเรลหัก ใส่เบี้ยว** — ลอเรลคือของผู้ชนะ **ลอเรลที่หักแล้วใส่เอียงคือคนที่โดนไล่ออกมา**
   เล่าทั้งเรื่องได้ในพร็อพชิ้นเดียว
5. **ชุดคลุมกรีกขาดวิ่น** ไหล่เปลือยข้างหนึ่ง ผ้าคลุมตัวใหญ่เกินตัวลากพื้นนิดหน่อย
   รองเท้าแตะรัดสายไขว้ขึ้นแข้ง (เก็บลายพันแข้งของเดิมไว้)

**เก็บสีแดงเข้มไว้เป็นสีตัด** — เชือกคาดเอวกับสายหน้ากากโศก

## ขั้น 0 — ท่ายืน (ด่านกั้น)

```
A single full-body standing pose of an original chibi game character: a small
Greek trickster in ragged robes wearing a theatre mask.

He stands upright in a loose, cocky ready stance — feet apart, weight on one
hip, one hand open at his side and the other resting on the pouch at his belt,
head tilted. One character only, one pose only, facing three-quarters toward
the viewer. No turnaround, no multiple views, no text, no labels, no borders.

Chibi-proportioned anime game sprite, **large head roughly one third of the
total height, short stubby limbs, small body — the whole figure is about two
and a half to three heads tall, NOT a realistic full-body proportion**, bold
dark outlines fully closed around every part of the figure, flat cel shading,
muted desaturated palette. Character: a small, mischievous young trickster.
He wears an ivory-white Greek comedy mask over the upper half of his face —
a wide grinning mouth, hollow empty eye holes and high arched brows — and the
mask sits visibly crooked, tilted off-centre, never straight. His own mouth
shows below the mask, curled in a small private smile. His hair is messy
copper-orange, **cut close to the skull and falling flat against it, NOT a
wide round frizzy halo — the hairline and forehead edge must stay visible.**
On his head sits a broken laurel wreath, snapped on one side and worn askew.
He wears a short ragged off-white Greek tunic with a frayed uneven hem, one
shoulder bare, cinched with a twisted dark red rope belt, and an oversized
tattered pale grey cloak draped over the other shoulder. His arms and lower
legs are bare, with leather sandal straps crossed up both shins. A small
drawstring sack hangs at one hip. On the opposite hip, a second mask — a dark
bronze Greek tragedy mask with a downturned mouth — hangs from a dark red cord
and is clearly visible in silhouette. All hanging cloth and cords fall close
to his body and never stream far out to the side. Three-quarter view, body
angled toward the viewer's right. Pure white background, no shadow, no ground
line, no props beyond those described, no text, no labels, no panel borders.
Full body visible from the top of the wreath to the soles of both sandals —
do not crop, do not zoom. Identical camera distance and identical character
size in every pose. Exactly two arms and two legs, clearly separated, do not
overlap or duplicate limbs. No effects of any kind — no smoke, no sparks, no
glow, no motion lines, no confetti.
```

---

# ALECTO — คาวเกิร์ลคนเดิม แก้สามจุดที่กัดเรา

## แนวคิด

**ไม่ได้เปลี่ยนตัวละคร** ของเดิมดีและผ่านอนุมัติแล้ว รอบนี้แก้เฉพาะสิ่งที่มีปัญหาจริง

**สี่อย่างที่เปลี่ยน**

1. **หมวกปีกแคบลงและดันไปหลัง** ให้เห็นหน้าผากกับไรผม — ปีกกว้างของเดิมกินเงาทั้งตัว
   และบังกะโหลกจนไม้บรรทัดวัดสัดส่วนพังสองรอบ แว่นกันลมบนสายหมวกเก็บไว้
2. **แยกค่าความสว่างที่ลำตัว** เสื้อกั๊กเข้มเกือบดำ เสื้อเชิ้ตครีมสว่าง —
   **ปัญหา "ก้อนแดง" ที่ตัวเล็ก ๆ แก้ด้วยค่าความสว่าง ไม่ใช่ด้วยการเพิ่มสี**
   แล้วค่อยเติมเทอร์ควอยซ์จุดเล็ก ๆ (ผ้าพันคอ หัวเข็มขัด หินบนสายหมวก) เป็นประกาย
3. **สะพายไรเฟิลไว้บนหลังทุกท่า** ปลายกระบอกโผล่พ้นไหล่ — ตอนนี้เธอมีสองอาวุธแล้ว
   แต่ดีไซน์ไม่เคยบอกเลย ท่ายืนเห็นแค่แส้
4. **ภาษาของไฟ** ฉายาเธอคือ The Fury of the **Burning Trail** สกิลคือมอลอตอฟกับบ่อไฟ
   แต่ดีไซน์เดิมไม่มีอะไรเกี่ยวกับไฟสักอย่าง เติม **สายคาดอกใส่ขวดแก้ว** ชายเสื้อกับชายชาพส์
   **ไหม้เกรียมเป็นรอยด่าง** และไฮไลต์ผมออกสีถ่านแดง — **ห้ามวาดเปลวไฟจริง**

## ขั้น 0 — ท่ายืน (ด่านกั้น)

```
A single full-body standing pose of this cowgirl character, redrawn with four
specific changes to her design. Keep her identity exactly — the same red-haired
gunslinger with the long braid, the whip, the revolver on her hip and the
fringed chaps — but apply these changes:
(1) her hat brim is narrower and the hat is pushed back on her head so her
    forehead and hairline are clearly visible,
(2) her vest is now very dark burgundy, almost black, against a bright cream
    shirt, so the torso reads as a strong light-dark split,
(3) a lever-action rifle is slung across her back with the barrel showing
    above one shoulder,
(4) a bandolier of small corked glass bottles crosses her chest, and the hem
    of her chaps and vest are singed and scorched with dark burn marks.

She stands in a loose ready stance, feet apart, whip coiled in one hand at her
side, other hand hovering near the revolver. One character only, one pose only.
No turnaround, no multiple views, no text, no labels, no borders.

Chibi-proportioned anime game sprite, **large head roughly one third of the
total height, short stubby limbs, small body — the whole figure is about two
and a half to three heads tall, NOT a realistic full-body proportion**, bold
dark outlines fully closed around every part of the figure, flat cel shading,
muted desaturated palette. Character: a sharp-eyed young cowgirl with long
deep-red hair worn in a thick braid over one shoulder, with darker ember-red
highlights. She wears a **narrow-brimmed** dark red hat pushed back off her
forehead — **the brim must not shade or cover her face, and her hairline and
forehead must stay clearly visible** — with a leather band, a pair of brass
goggles and small turquoise stones on it. Her vest is near-black burgundy with
faded tooled patterns, worn over a bright cream western shirt with rolled
sleeves; a turquoise neckerchief sits at her throat. A leather bandolier of
small corked glass bottles crosses her chest. A heavy belt with a silver and
turquoise buckle carries a revolver in a tooled holster. She wears dark brown
fringed leather chaps over denim and scuffed brown boots, and the lower hem of
the chaps and vest is scorched with dark uneven burn marks. A lever-action
rifle is slung diagonally across her back, its barrel and stock visible past
her shoulders. Fingerless leather gloves. All fringe and hanging leather falls
close to her body and never streams far out to the side. Three-quarter view,
body angled toward the viewer's right. Pure white background, no shadow, no
ground line, no props beyond those described, no text, no labels, no panel
borders. Full body visible from the top of the hat to the soles of both boots
— do not crop, do not zoom. Identical camera distance and identical character
size in every pose. Exactly two arms and two legs, clearly separated, do not
overlap or duplicate limbs. No effects of any kind — no fire, no smoke, no
sparks, no glow, no motion lines.
```

---

## หลังจากนี้

1. **เจนขั้น 0 ทั้งสองตัว ส่งมาให้ดู** ผมวัดสัดส่วนเทียบกับโรสเตอร์ให้
   (เกณฑ์ 2.50-2.80 หัว แต่ถ้าผม/หมวกบังก็จะใช้ไม้บรรทัดสำรองเหมือนเดิม)
2. ผ่านแล้วผมเขียน **ชีต A-H** ให้ โดยสลับ style anchor อันใหม่เข้าไป โครงเดิมใช้ต่อได้หมด
3. ชีตที่ต้องเพิ่มจากรอบที่แล้วเพราะดีไซน์เปลี่ยน:
   - **Momus** ชีตสกิลทั้งหมด (E-G) ต้องเจนใหม่ เพราะท่าทางถือกล่องเปลี่ยนไปตามชุด
   - **Alecto** ชีตท่าเดินถือปืน (I/J) ต้องเจนใหม่ เพราะตอนนี้มีไรเฟิลสะพายหลังตลอด
4. **ท่าหมอบลึก** รอบนี้ขอมาในชีตเลย อย่ารอทีหลัง เขียนเป้าไว้ว่า
   `crouched so low that his/her total height is only about 80% of the standing pose`

> 💡 **ของเก่าไม่ต้องลบ** อาร์ตชุดปัจจุบันยังอยู่ในเกมและเล่นได้ปกติ
> เปลี่ยนตอนที่ชุดใหม่ครบแล้วเท่านั้น จะได้ไม่มีช่วงที่เกมพังระหว่างทาง
