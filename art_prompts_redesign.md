# Alecto / Momus — เจนใหม่ (จบแล้ว ✅)

> ## ผ่านทั้งสองตัว
>
> **ALECTO** — `art_reference/alecto_idle_APPROVED_v2.jpg` (ผ่านรอบเดียว)
> **MOMUS** — `art_reference/momus_idle_APPROVED_v2.jpg` (ผ่านรอบสอง)
>
> **ขั้นต่อไปคือเจนชีต** prompt เขียนรอแล้วทั้งสองตัว ต่อ style anchor ใหม่ให้ในทุกบล็อกแล้ว
> ไม่ต้องวางเอง (ของเดิมต้องวางท้ายเอง ซึ่งลืมง่าย)
>
> - [`art_prompts_alecto_v2.md`](art_prompts_alecto_v2.md) — 8 ชีต
> - [`art_prompts_momus_v2.md`](art_prompts_momus_v2.md) — 11 ชีต
>
> **แนบภาพ APPROVED_v2 ไปกับทุก prompt**

## ผล Momus รอบสอง — ตัวเลขที่วัดได้

| | ทั้งตัว | ท่อนล่าง 30% | กว้าง |
|---|---|---|---|
| Alecto ใหม่ | 65.3 | **45.9** | 346 |
| Momus เก่า | 105.3 | 93.0 | 295 |
| Momus v2 รอบ 1 | 136.7 | 126.1 ❌ | 276 |
| **Momus v2 รอบ 2** | 125.0 | **104.2 ✅** | 276 |

(ความสว่าง 0 = ดำ 255 = ขาว · **พื้นดินของฉากอยู่ราว 150-190** ตัวละครที่ท่อนล่างเข้าใกล้ค่านั้นคือตัวที่จะจม)

**ท่อนล่างเข้มขึ้น 22 จุด** จากผ้าพันแข้งสีเข้ม ผ้าคลุมที่เข้มขึ้น และเชือกคาดเอวแดงหนา
ตอนนี้อยู่ใกล้ Momus เก่า (93.0) ซึ่งพิสูจน์แล้วว่าอ่านออกในเกม — **ผ่าน**

### สองข้อที่ยังไม่ขยับ และทำไมถึงปล่อยผ่าน

**1 · ความกว้างยังเป็น 276 เท่าเดิม** ท่ายืนไม่ได้ถ่างขึ้นจริงแม้จะสั่งไป
**ปล่อยผ่านเพราะท่ายืนไม่ได้แก้ที่ภาพนี้ — มันไปแก้ที่ชีต** ท่ายืนเป็น 1 เฟรมจาก ~70 เฟรม
ที่จะเจนต่อ เลยใส่คำสั่ง "ยืนขาถ่างกว้าง น้ำหนักต่ำ ทุกท่า" ลงใน anchor ของทุกชีตแทน
ซึ่งเป็นที่ที่มันสำคัญจริง

**2 · เท้ายังเป็นรองเท้าแตะเปิดสีอ่อน** แข้งเข้มแล้วแต่ฝ่าเท้ายังสว่าง
เจนอีกรอบเพื่อฝ่าเท้าบนสไปรต์สูง 240 px ไม่คุ้มเวลาและเครดิต ถ้าเล่นจริงแล้วรู้สึกว่ายังจม
ค่อยแก้ทีเดียวตอนนั้น

## วิธีตรวจที่ใช้ และทำไมถึงเชื่อได้

**ไม่ได้ดูจากภาพเต็มใบ** ภาพเต็มใบหลอกเสมอ เพราะทุกตัวดูดีหมดตอนใหญ่ ๆ บนพื้นขาว

1. **เรียงทั้งโรสเตอร์ให้สูงเท่ากัน** ตัดพื้นขาวออก แล้วย่อให้สูง 520 px เท่ากันทุกตัว
   ดูว่าหัวใหญ่เท่ากันไหม ตัวไหนหลุดกลุ่ม
2. **วางบนฉากจริง ที่ขนาดจริงในเกม** เฟรมในเกมคือ **152×240 px** — ย่อลงเท่านั้นแล้ว
   วางบนฟ้ากับพื้นหินของ Valhalla จริง ๆ (`art_reference/redesign_onstage_test.png`)

ข้อ 2 คือข้อที่เปลี่ยนคำตัดสิน ถ้าดูแต่ภาพใหญ่ Momus ใหม่ผ่านสบาย ๆ
พอย่อลงมาวางบนฉากจริงถึงเห็นว่ามันจมหาย

**ความกว้างที่ความสูงเท่ากัน** (วัดได้จริง) — ตัวเลขนี้บอกว่าเงาแน่นแค่ไหน:

| ตัว | กว้าง |
|---|---|
| Atlas | 824 |
| Orpheus | 460 |
| Alecto เก่า | 428 |
| **Alecto ใหม่** | **346** |
| Helios | 295 |
| Momus เก่า | 295 |
| **Momus ใหม่** | **276 ← แคบที่สุดในโรสเตอร์** |

---

# MOMUS รอบที่ 2 — แนวคิดเก็บไว้ทั้งหมด แก้แค่ค่าสีกับท่ายืน

**สิ่งที่ได้มาแล้วและห้ามเปลี่ยน:** หน้ากากตลกเลื่อนไปข้างเผยหน้าจริงที่ยิ้มอยู่ข้างใต้
(อันนี้**ดีกว่าที่ผมสั่งไว้** — ผมขอให้ครอบครึ่งบนของหน้า แต่แบบที่ได้มาเล่าได้มากกว่า
คือเห็นทั้งมุกและคนเล่นมุกพร้อมกัน) · หน้ากากโศกห้อยสะโพก · พวงหรีดลอเรล ·
ผมส้มแนบกะโหลก (แก้ปัญหาไม้บรรทัดได้แล้วจริง) · ชุดคลุมขาดวิ่นไหล่เปลือย · สายรัดแข้งไขว้

**ปัญหาเดียวคือเขาจางเกินไป** ตอนนี้ทั้งตัวมีแต่ครีม เทาอ่อน และสีผิว
ฟ้าของฉากก็อ่อน หินก็อ่อน พื้นดินก็สีแทน — **ท่อนล่างของเขากลืนกับพื้นสนิท**
ของเก่ายังอ่านออกกว่า เพราะมีรองเท้าบูตสีเข้มยึดไว้กับปอมปอมแดงเป็นจุดสี

## ห้าจุดที่ต้องแก้

| แก้อะไร | เพราะอะไร |
|---|---|
| **รองเท้ารัดส้นหนังสีเข้ม** แทนรองเท้าแตะสีแทน | ท่อนล่างต้องมีของเข้มยึด ไม่งั้นขาหายไปกับพื้นดิน — ของเก่าใช้บูตเทาเข้มแล้วได้ผล |
| **ผ้าคลุมเป็นสีน้ำตาลเทาเข้ม** ไม่ใช่เทาอ่อน | ตอนนี้ผ้าคลุมค่าสีเท่ากับ**ท้องฟ้า** ยืนบนฉากแล้วหายไปครึ่งตัว |
| **เพิ่มสีแดงเข้มให้มากขึ้น** เชือกคาดเอวหนาขึ้น + ขลิบแดงที่ชายผ้าคลุม | เขาต้องมีสีอิ่มอย่างน้อยหนึ่งจุดที่ตาจับได้ แบบที่ผ้าพันคอเทอร์ควอยซ์ทำให้ Alecto |
| **ชุดคลุมเป็นสีกระดูก/ข้าวโอ๊ต ไม่ใช่ขาว** | **หน้ากากต้องเป็นของที่ขาวที่สุดบนตัวเขา** ตอนนี้ชุดแย่งความสว่างกับหน้ากาก ซึ่งเป็นของชิ้นที่สำคัญที่สุด |
| **ยืนขาถ่างกว้างขึ้นมาก** ลงน้ำหนักทั้งสองขา | เงาเขาเป็นแท่งแคบที่สุดในโรสเตอร์ (276 เทียบ Alecto 346) เกมต่อสู้ต้องอ่านออกว่า "ตั้งการ์ดอยู่" |

## prompt รอบที่ 2

```
Redraw this exact character with the same design, the same face, the same
mask arrangement and the same proportions — change only the colours, the
footwear and the stance:
(1) replace the pale sandals with dark brown leather strapped boots that
    cover the ankle, keeping the crossed straps up the shins,
(2) make the draped cloak a deep greyish brown, much darker than the tunic,
(3) make the rope belt thicker and a stronger dark red, and add a dark red
    border along the ragged edge of the cloak,
(4) make the tunic a dull bone / oatmeal colour rather than white, so that
    the white comedy mask stays the brightest single thing on the character,
(5) widen his stance — feet planted well apart, weight on both legs, knees
    slightly bent, like a fighter holding ready, so his silhouette is broad
    rather than a narrow column.

Keep everything else identical: the ivory comedy mask pushed to one side
revealing his own grinning face beneath it, the laurel wreath worn askew, the
copper-orange hair lying flat against the skull with the hairline visible, the
bare shoulder, the small pouch, and the dark bronze tragedy mask hanging at
his hip.

Chibi-proportioned anime game sprite, **large head roughly one third of the
total height, short stubby limbs, small body — the whole figure is about two
and a half to three heads tall**, bold dark outlines fully closed around every
part of the figure, flat cel shading, muted desaturated palette.
Three-quarter view, body angled toward the viewer's right. Pure white
background, no shadow, no ground line, no text, no labels, no panel borders.
Full body visible from the top of the wreath to the soles of both boots — do
not crop, do not zoom. Exactly two arms and two legs, clearly separated. No
effects of any kind — no smoke, no sparks, no glow, no motion lines.
```

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

# ภาคผนวก · MOMUS — แนวคิดและ prompt รอบแรก

> เก็บไว้อ้างอิงเฉย ๆ **รอบที่ 2 ข้างบนคือของที่ต้องใช้**

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

# ALECTO — ผ่านแล้ว ✅

`art_reference/alecto_idle_APPROVED_v2.jpg` — ไม่ต้องเจนซ้ำ

ได้ครบทั้งสี่ข้อ: หมวกปีกแคบดันไปหลังเห็นหน้าผาก · เสื้อกั๊กเกือบดำตัดกับเชิ้ตครีม ·
ไรเฟิลสะพายหลังปลายกระบอกพ้นไหล่ · สายคาดอกใส่ขวดกับชายเสื้อไหม้เกรียม
แถมเทอร์ควอยซ์ที่ผ้าพันคอ หัวเข็มขัด ซองปืน และหินบนสายหมวก

**หมายเหตุเล็กน้อย ไม่ต้องแก้** รอยไหม้มีแสงส้มเรือง ๆ อยู่นิดหน่อย ซึ่งผิดกฎ
"ห้ามวาดเอฟเฟค" ทางเทคนิค แต่ย่อลงขนาดในเกมแล้วมองไม่เห็น ปล่อยไว้ได้

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
