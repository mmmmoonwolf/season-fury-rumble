# MOMUS — prompt ชีตสกิล (ธีมกรีก · กลไกใหม่เข้าเกมแล้ว)

> ## ⚙️ กลไกทั้งสามสกิลเขียนโค้ดเสร็จและเข้าเกมแล้ว
>
> ที่ยังขาดคือ **อาร์ต** — สามชีตในไฟล์นี้ (E · F · G)
> แนบ `art_reference/momus_idle_APPROVED_v2.jpg` ไปกับทุก prompt
>
> | สกิล | กลไกที่ทำไปแล้ว |
> |---|---|
> | 1 · ขว้างไห | สะบัดมือขว้าง ไหระเบิดเมื่อใครแตะหรือครบ 3 วิ · **ไม่หักเลือดเจ้าของแล้ว** เหลือแรงกระแทก · **ไหโดนคู่ต่อสู้ = ได้ชั้น House** |
> | 2 · Understudy | ทิ้งหุ่นหน้าเหมือนตัวเองไว้ ตัวจริงหลุดถอย 120 px · คู่ต่อสู้ตีหุ่นแล้วระเบิดขัดท่าเขา |
> | 3 · อัลติ | **กดปุ๊บวาร์ปขึ้นชั้นบนสุดทันที** แล้วเรียกฝนไหลงมา 4-9 ใบตามชั้นที่เก็บไว้ |
>
> **ชื่อสกิลในเกมยังเป็นของเดิม** (Jack-in-the-Box / Understudy / Full House)
> จะเปลี่ยนเป็นธีมกรีกพร้อมกันตอนอาร์ตเข้า ไม่งั้นเกมจะขึ้นคำว่า Pandora
> ทั้งที่ Momus ยังเป็นตัวตลกอยู่ ซึ่งดูเหมือนบั๊กมากกว่างานระหว่างทาง

## ชื่อใหม่ทั้งสามสกิล

| เดิม | ใหม่ | ทำไม |
|---|---|---|
| Jack-in-the-Box | **Pandora** | กล่องผีเป็นของเล่นยุควิกตอเรีย ผิดยุคชัดที่สุดในสามอัน · **ไหของแพนโดรา** เป็นกรีกแท้ เป็นไหจริง ๆ (ต้นฉบับคือ *pithos* ไม่ใช่กล่อง — แปลผิดกันมานาน) และ**วางทิ้งไว้ให้คนอื่นไปเปิดเอง คือมุกของ Momus เป๊ะ** |
| Ta-da! | **Exit Stage Left** | คำสั่งเวทีคลาสสิก "ออกทางซ้าย" · เขาเดินออกจากฉากอย่างโอ่อ่าแล้วทิ้งระเบิดไว้ให้คนที่ไล่ |
| Full House | **Full House (เก็บไว้)** | **เป็นคำโรงละครอยู่แล้ว** แปลว่าขายบัตรหมด · เปลี่ยนแค่เรื่องเล่า: สมัยกรีกคนดูปาลูกมะเดื่อกับก้อนหินใส่นักแสดงที่เล่นไม่ดี **โรงเต็ม = ของที่ปาลงมาก็เต็มเวที** |

**Full House ไม่ต้องแก้อะไรเลย** ทั้งชื่อและกลไก แค่เปลี่ยนของที่ตกลงมาจากลังไม้เป็นไห

---

## งานแยกเป็นสองส่วน และส่วนใหญ่ไม่ใช่อาร์ต

**เจอตอนอ่านโค้ด: ลังระเบิดวาดด้วยโค้ด ไม่ใช่อาร์ต**
`ScrambleScene.js` วาดเป็นสี่เหลี่ยมน้ำตาลมีกากบาทกับไฟชนวน ไม่ได้ดึงจาก atlas

| ส่วน | ทำอะไร | ใคร |
|---|---|---|
| **อาร์ต** | ท่าทางของเขาในชีต E · F · G (ท่าขว้าง ท่าดีดนิ้ว ท่าอัลติ) และของที่ถืออยู่ในมือ | เจนใหม่ 3 ใบ ↓ |
| **โค้ด** | ของที่ตกอยู่บนพื้น (ลังไม้ → ไห) กับชื่อสกิลทั้งสาม | ผมแก้ให้ ~15 บรรทัด |

**ผมยังไม่แก้โค้ดตอนนี้** เพราะถ้าแก้เลย เกมจะขึ้นคำว่า "Pandora" กับไหกรีก
ทั้งที่ Momus ยังเป็นตัวตลกอยู่ — เป็นสภาพครึ่ง ๆ กลาง ๆ ที่ดูเหมือนบั๊กมากกว่าดูเหมือนงานระหว่างทาง
**จะแก้พร้อมกันทีเดียวตอนอาร์ตชุดใหม่เข้าครบ** เหมือนที่ตกลงกันไว้กับตัวละคร

---

## ของที่เขาหยิบออกมา: ไหดินเผา

ทั้งสามสกิลใช้ของชิ้นเดียวกัน **ไหกรีกใบเล็ก** ปากแคบ ตัวป่อง มีหูจับสองข้าง
ดินเผาสีส้มอมน้ำตาล มีแถบลายวาดสีดำรอบตัว

**ทำไมไหไม่ใช่หน้ากาก** — คิดถึงหน้ากากวางบนพื้นอยู่เหมือนกัน แต่สองเหตุผล:
ในเกมของชิ้นนี้สูงแค่ **46 พิกเซล** เงาของไห (คอแคบ ตัวป่อง มีหู) อ่านออกที่ขนาดนั้น
ส่วนหน้ากากกลายเป็นก้อนซีด ๆ · และบนตัวเขามีหน้ากากสองใบอยู่แล้ว ใบที่สามจะทำให้อ่านยาก

---

## ชีต E — สกิล 1 · Pandora (6 ท่า · 2 แถวแถวละ 3)

**ขว้างแบบสะบัดมือ ไม่ใช่ย่อลงไปวาง** — ท่านี้ startup แค่ 5 เฟรม ต้องกดได้กลางวงที่กำลังตีกัน
**ไหวาดได้** เพราะเป็นของที่เขาหยิบออกมาเอง ไม่ใช่เอฟเฟค

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is flicking a small Greek clay jar out in front of him in one quick
underarm toss — fast and casual, like skipping a stone, NOT a careful
placement. The jar is a small terracotta amphora: narrow neck, round belly,
two small handles, with a painted black band around it. Draw the jar. Draw
NO crack, NO smoke, NO explosion, NO effects — the game draws all of that.

Pose 1 — already in motion: pulling the small jar out of the pouch at his
hip with one hand, body turning into the throw, eyes forward on the target.
Pose 2 — the arm swinging down and back past his thigh, jar in hand, knees
springing, other arm out for balance, cloak swinging behind him.
Pose 3 — the underarm release: arm whipped forward and up, hand open and
empty, jar just leaving his fingers low in front of him.
Pose 4 — following through, arm carried up across his body, weight on the
front foot, head down watching where it landed.
Pose 5 — skipping backwards a step with both arms swinging up, body already
turning away, cloak flaring.
Pose 6 — landed back with his feet planted wide and both hands raised beside
his head, palms out, head tilted, wearing an exaggerated innocent look.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small mischievous Greek trickster. An ivory-white Greek comedy mask with a wide grinning mouth is pushed to one side of his face, revealing his own grinning face beneath it — the mask stays in that same pushed-aside position in every pose and is always the brightest single thing on him. He wears a laurel wreath askew, and his copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a ragged bone / oatmeal Greek tunic with a torn uneven hem and one bare shoulder, a thick dark red rope belt, and a dark greyish-brown tattered cloak with a dark red border along its ragged edge draped over one shoulder. Dark brown leather wrappings and straps cover both shins above open sandals. A small drawstring pouch hangs at one hip, and a dark bronze Greek tragedy mask with a downturned mouth hangs from a dark red cord at the other hip, clearly visible in silhouette. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of the wreath to the soles of both sandals — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. All cloth and cords fall close to his body and never stream far out to the side. No effects of any kind — no smoke, no sparks, no glow, no motion lines, no confetti.
```

---

## ชีต F — สกิล 2 · Understudy (6 ท่า · 2 แถวแถวละ 3)

**สร้างและเข้าเกมแล้ว** ท่าคือ: ทิ้งหุ่นที่หน้าตาเหมือนตัวเองไว้ตรงที่ยืน แล้วหลุดถอยออกไป 120 px
startup 3 เฟรม เป็นปุ่มหนีตอนโดนต้อนติดมุม ท่าจึง**ต้องอ่านว่าลื่นไหลและไว** ไม่ใช่พิธีรีตอง

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is slipping out of his own cloak and leaving it standing behind him like a
stage dummy, then sliding away sideways. Fast and slick, not ceremonial.
Draw NO second figure, NO dummy, NO smoke, NO sparks — the game draws the
standing decoy and all effects itself.

Pose 1 — dropping into a low ready crouch, one hand already reaching up to
the clasp of his cloak at the shoulder.
Pose 2 — the clasp released: the cloak peeling off one shoulder, his body
beginning to twist out from under it, knees bent low.
Pose 3 — half out of the cloak, both arms sliding free behind him, torso
turned away, weight shifting onto the back foot.
Pose 4 — fully out and pushing off hard sideways, body low and stretched,
both feet nearly leaving the ground, head turned back over his shoulder.
Pose 5 — landing from the slide, feet planted wide apart, knees deep, one
hand touching the floor for balance, looking back the way he came.
Pose 6 — straightened up, feet wide, one finger raised beside his mask in a
"watch this" gesture, grinning.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small mischievous Greek trickster. An ivory-white Greek comedy mask with a wide grinning mouth is pushed to one side of his face, revealing his own grinning face beneath it — the mask stays in that same pushed-aside position in every pose and is always the brightest single thing on him. He wears a laurel wreath askew, and his copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a ragged bone / oatmeal Greek tunic with a torn uneven hem and one bare shoulder, a thick dark red rope belt, and a dark greyish-brown tattered cloak with a dark red border along its ragged edge draped over one shoulder. Dark brown leather wrappings and straps cover both shins above open sandals. A small drawstring pouch hangs at one hip, and a dark bronze Greek tragedy mask with a downturned mouth hangs from a dark red cord at the other hip, clearly visible in silhouette. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of the wreath to the soles of both sandals — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. All cloth and cords fall close to his body and never stream far out to the side. No effects of any kind — no smoke, no sparks, no glow, no motion lines, no confetti.
```

---

## ชีต G — สกิล 3 อัลติ (6 ท่า · 2 แถวแถวละ 3)

**ลำดับในเกมจริง: กด → หายไปทันที → ไปโผล่บนแพลตฟอร์มสูงสุด → เรียกฝน → ก้มหลบ**

วาร์ปเกิดที่**เฟรมแรกสุด** ไม่ใช่หลังเงื้อ เพราะท่านี้เงื้อรวม 18 เฟรม
ถ้ายืนเงื้ออยู่กับพื้นก็โดนสวนฟรี — **อัลติที่กดแล้วโดนตีหลุดคืออัลติที่ไม่มีใครกด**

**ท่อนสุดท้ายต้องเป็นท่าก้มหลบ ไม่ใช่ท่าโพสชนะ** เพราะฝนไหลงทุกชั้นรวมชั้นที่เขายืน
เขาต้องหลบของตัวเองเหมือนกัน (โดนดีดแต่ไม่เสียเลือด)

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.

The sequence is: he vanishes from the ground, reappears standing high above,
calls a rain of clay jars down on the whole theatre, then ducks because it is
falling on him too. Draw NO jars, NO smoke, NO sparks, NO glow, NO motion
lines — the game draws every effect itself.

Pose 1 — coiled low on the ground, knees deep, one arm sweeping upward across
his body, chin lifting, eyes already looking up.
Pose 2 — stretched tall on the balls of both feet, both arms reaching straight
up overhead, body long and thin, head thrown back — the instant before he is
gone.
Pose 3 — landing from above in a deep crouch, both feet planted wide, one hand
touching down in front of him, cloak still settling around him, head up and
looking down past the viewer.
Pose 4 — rising to full height with both arms opening outward to the sides,
palms turned up, face and mask tipped back toward the sky, mouth open in a
laugh.
Pose 5 — at full stretch: both arms flung wide overhead in a V, chest thrown
forward, feet apart, cloak lifted behind him.
Pose 6 — snapping both arms down and crossed over his head, knees bent deep,
shoulders hunched, ducking hard — peering up past his own elbow, still
grinning.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small mischievous Greek trickster. An ivory-white Greek comedy mask with a wide grinning mouth is pushed to one side of his face, revealing his own grinning face beneath it — the mask stays in that same pushed-aside position in every pose and is always the brightest single thing on him. He wears a laurel wreath askew, and his copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a ragged bone / oatmeal Greek tunic with a torn uneven hem and one bare shoulder, a thick dark red rope belt, and a dark greyish-brown tattered cloak with a dark red border along its ragged edge draped over one shoulder. Dark brown leather wrappings and straps cover both shins above open sandals. A small drawstring pouch hangs at one hip, and a dark bronze Greek tragedy mask with a downturned mouth hangs from a dark red cord at the other hip, clearly visible in silhouette. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of the wreath to the soles of both sandals — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. All cloth and cords fall close to his body and never stream far out to the side. No effects of any kind — no smoke, no sparks, no glow, no motion lines, no confetti.
```

---

## โค้ดที่ผมจะแก้ให้ตอนอาร์ตเข้าครบ

**1 · ของบนพื้น** `ScrambleScene.js` ราวบรรทัด 1828 — ตอนนี้เป็น:

```js
fx.fillRect(b.x - 24, y - 46, 48, 46);       // ลังไม้
fx.lineBetween(...); fx.lineBetween(...);    // กากบาท
fx.fillCircle(b.x, y - 54, 7);               // ไฟชนวน
```

เปลี่ยนเป็นไห: ตัวป่อง คอแคบ หูสองข้าง แถบลายดำ และ**ไฟชนวนกลายเป็นรอยร้าวเรืองแสง**
**กลไกสัญญาณไม่แตะ** — ยิ่งใกล้ระเบิดยิ่งกะพริบถี่ และสีเทาตอนยังไม่ติดชนวน
อันนั้นคือสิ่งที่ทำให้กับดักนี้ยุติธรรมกับทั้งสองฝั่ง ห้ามเสีย

**2 · ชื่อสกิล** `core.js` — `label` สามที่ (`box1`/`box2` → `Pandora` · `snap1`/`snap2` →
`Exit Stage Left` · `full1`/`full2` คงเดิม) และข้อความที่ฉากเด้งขึ้นตอนวางไห

**3 · การ์ดเลือกตัว** บรรทัดสรุปสกิลในแผงเลือกตัวละคร

ทั้งหมดราว 15 บรรทัด ไม่แตะค่าตัวเลขสักตัว — `BOX_FUSE` `BOX_HALF` `BOX_DMG` `RAIN_N`
`SNAP_DMG` ทุกค่าเหมือนเดิม **เทสต์ของ Momus 30 กว่าข้อจึงยังผ่านเหมือนเดิมทั้งหมด**
