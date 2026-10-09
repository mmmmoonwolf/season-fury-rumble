# EYE (chronos) — prompt ชีตทั้งชุด

> กลไก **เข้าเกมแล้วเล่นได้จริง** ดู [`docs/EYE_KIT.md`](docs/EYE_KIT.md)
> ตอนนี้วาดเป็นกล่องเขียว (`artPending: true`) — ชีตชุดนี้คือของจริงที่จะมาแทนทั้งตัว
> เจนแล้ววางที่ `art_reference/chronos_sheets/sheet_A.jpg` … `sheet_F.jpg`

> 📎 **แนบ "ขั้น 0" (ท่ายืนที่ผ่านแล้ว) ไปกับทุก prompt** ทุกบล็อกเขียนว่า "the same character"
> ซึ่งแปลว่าไม่มีภาพอ้างอิง = ได้คนละคนทุกใบ (บทเรียนจาก MARCH ที่เจนครบ 102 เฟรมสำเร็จ)

---

## 🔴 ความเสี่ยงอันดับหนึ่งของตัวนี้: **มันจะใส่ควันมาให้**

ตัวนี้คือ "ตัวควัน" ใบกัญชา ธีมเมา — **ตัวเจนจะใส่ควัน หมอก แสงเรือง มาให้แน่นอน**
ถ้าไม่ห้ามแรงพอ และ **ห้ามที่ท้าย prompt ไม่พอ**

> บทเรียนตรง ๆ จาก KUNJAE (`art_prompts_kunjae.md` บรรทัด 811):
> บรรทัด "no muzzle flash" อยู่ท้าย prompt แล้ว**ได้แฟลชปากกระบอกมาสองรอบติด**
> จนตอนนี้ยังมีวงขาวเรืองติดอยู่ใน `jab1` `jab2` `side` `up` `down` แก้ไม่ได้นอกจากเจนใหม่
>
> **รอบนี้เอาข้อห้ามเรื่องควันขึ้นไปไว้บรรทัดแรกสุดของทุก prompt** (ทำไว้แล้วข้างล่าง)

เหตุผลที่ต้องห้ามจริง ๆ ไม่ใช่แค่ความสวย: **เกมวาดควันเองหมดแล้ว** (ดู `SMOKE` ใน `ScrambleScene.js`)
ควันที่ติดมากับอาร์ตจะซ้อนกับควันของเกม แล้วอ่านไม่ออกว่าอันไหนคือควันที่ตีจริง
ซึ่งคือการโกหกระยะ — ปัญหาเดียวกับที่เพิ่งแก้ไปตอนทำเอฟเฟกต์

---

## 🔴 ความเสี่ยงข้อสอง: ใบกัญชายักษ์คือ "ของที่หลุดได้"

ตัวตัดชีตทิ้ง "ก้อนที่ไม่ติดกับตัว" อยู่แล้ว · ใบไม้ที่ยื่นออกไปไกลหรือหลุดจากมือจะ
**โดนตัดทิ้ง หรือถูกนับเป็นท่าหนึ่งท่า แล้วไม้บรรทัดวัดสเกลเพี้ยนทั้งใบ**

เคยเกิดมาแล้วสองรอบในโปรเจกต์นี้ — ผ้าคาดเอวของ MARCH และหางไซเบอร์ของ KUNJAE
(หางของ KUNJAE ยังเหลือปัญหา "หางสองเส้น" ในใบ D จนทุกวันนี้)

anchor สั่งไว้แล้วว่า **ก้านใบต้องอยู่ในมือเสมอ และใบต้องแตะตัวหรือแขนตลอด**
แต่ **เปิดดูทุกใบด้วยตาเสมอ** — ตัวเลขจับได้แค่ของหลุด/ท่าติดกัน/ชนขอบ/สเกลเพี้ยน
ส่วน "ใบไม้หายไปจากมือ" ตัวเลขจับไม่ได้เลย

---

## 🔴 ความเสี่ยงข้อสาม: เขียวจมไปกับฉากหลัง

ฉากหลังของเวทีคือ **เนินเขาเขียว** · ถ้าเธอเขียวทั้งตัวเธอจะจมหายตอนยืนหน้าเนิน

anchor จึงสั่งว่า **เสื้อผ้าเป็นโทนเข้ม (ดำ/น้ำตาลเข้ม/ม่วงเข้ม) ใบไม้เป็นเขียวเดียวในตัว**
ใบไม้จึงกลายเป็นจุดอ่านซิลูเอตของเธอ ไม่ใช่ตัวกลืนฉาก

> 📌 **ต้องวัดจริงตอนขั้น 0 ก่อนเจนอีก 6 ใบ** วิธีเดียวกับ DEAR และ MARCH:
> ตัดพื้นขาวออก แล้ววัดความสว่างเฉลี่ยของ **40% ล่างของตัว ถ้าเกิน ~140 ให้เจนใหม่**
> (พื้นเวทีสว่าง 150-190 — สว่างกว่านั้นคือครึ่งล่างของเธอจมหายไปกับพื้น)
> เทียบของเดิม: DEAR 66-68 · KUNJAE 49 · MARCH เดิม 126 · OAT 114 · ตัวตลก 107

---

## ดีไซน์ตัวละคร (anchor — ก๊อปท่อนนี้ลงทุก prompt)

เธอคือ **"หมัดมาช้ากว่าเสียง"** — เมา ช้า แต่บู๊ ไม่ใช่สายเวทมนตร์ ไม่ใช่สายวางของ
ท่าทางต้องอ่านว่า **คนที่พร้อมจะเข้าไปต่อย** ไม่ใช่คนที่ยืนร่ายอะไรอยู่

- ผู้หญิงวัยยี่สิบต้น ตัวสูงโปร่ง ไหล่กว้างพอให้เห็นว่าเธอออกแรงได้
- ผมยาวมัดหลวม ๆ สีเข้ม มีปอยหลุดลงหน้า — **ผมต้องแนบหัว ไม่ใช่พองเป็นวงกลม**
- ตาปรือครึ่งหลับตลอด (ที่มาของชื่อ EYE) แต่ **ไม่ยิ้ม ไม่ทำหน้าน่ารัก** — นิ่ง ๆ เบื่อ ๆ
- เสื้อกล้ามสีเข้ม ทับด้วยแจ็กเก็ตตัวใหญ่ปลดกระดุม แขนพับขึ้นถึงศอก
- กางเกงขายาวหลวมสีเข้ม รัดข้อเท้า · รองเท้าผ้าใบสูงสีเข้ม
- ผ้าพันมือทั้งสองข้างแบบนักมวย — **นี่คือสิ่งที่บอกว่าเธอเป็นสายต่อย**
- **ใบกัญชายักษ์ใบเดียว** ขนาดราวครึ่งลำตัว ถือที่ก้านด้วยมือข้างหนึ่งเสมอ
  ใช้เหมือนพัดหรือไม้ตี ไม่ใช่คทา ไม่ใช่อาวุธวิเศษ · **เขียวเข้มด้าน ไม่เรืองแสง**

---

## แผนชีต — 68 เฟรม

| ใบ | ท่า | จำนวน | ตาราง |
|---|---|---|---|
| ขั้น 0 | ท่ายืน (anchor ของทั้งชุด) | 1 | — |
| คลิปวิ่ง | วิ่งหนึ่งรอบเต็ม (ท่ายืนเอาจากขั้น 0) | 10 | วิดีโอ ไม่ใช่ชีต |
| A | เคลื่อนไหว + โดนตี + กัน | 12 | 4 แถว × 3 |
| B | ฟาดใบไม้สามจังหวะ (`jab1-3`) | 9 | 3 × 3 |
| C | ท่าพิเศษบนพื้น (`side` `up` `down`) | 9 | 3 × 3 |
| D | ท่ากลางอากาศ (`nair` `sair` `dair`) | 9 | 3 × 3 |
| E | รัวควัน (`haze1` `haze2` `haze3`) | 9 | 3 × 3 |
| F | ไม้จบรัว + ต่อยแล้วย้อน + อัลติ | 9 | 3 × 3 |

**ทุกท่าโจมตีคือ 3 เฟรมเป๊ะ** (ตั้งท่า → สุดแรง → ชักกลับ) เพราะเอนจิ้นเลือกเฟรมจาก
`phase()` ตรง ๆ: `{startup: 1, active: 2, recovery: 3}` — เฟรมกลางคือเฟรมที่กรอบชนเปิดจริง
เกินหรือขาดจากสามไม่ได้ ไม่ใช่เรื่องความสวย

---

## ⛔ ท่อนห้าม — วางไว้ **บรรทัดแรก** ของทุก prompt ไม่ใช่ท้าย

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO FOG, NO CLOUDS, NO GLOW, NO
SPARKLES, NO MAGIC EFFECTS anywhere in this image. The character never exhales
smoke and nothing is burning or lit. This is a clean character sprite sheet only —
the game engine draws every smoke and light effect by itself. Any smoke drawn into
the art is a defect and the whole sheet gets thrown away.
```

---

## 1. ขั้น 0 — ท่ายืน (ทำใบนี้ให้ผ่านก่อน แล้วค่อยเจนที่เหลือ)

**อย่าเจนใบอื่นจนกว่าใบนี้จะผ่าน** ทุกใบที่เหลือแนบใบนี้เป็น reference
ถ้า anchor ผิด ทั้งชุด 68 เฟรมผิดตามโดยไม่มีทางกู้

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO FOG, NO CLOUDS, NO GLOW, NO
SPARKLES, NO MAGIC EFFECTS anywhere in this image. The character never exhales
smoke and nothing is burning or lit. This is a clean character sprite illustration only —
the game engine draws every smoke and light effect by itself.

A single standing idle pose of an original game character, full body, facing
three-quarter toward the viewer's right.

Chibi-proportioned anime game sprite, large head roughly one third of the total
height, short stubby limbs, bold dark outlines, flat cel shading, muted
desaturated palette.

Character: a young woman in her early twenties, tall and lean with shoulders
broad enough to read as someone who throws punches. Dark hair tied in a loose
bun with a few strands fallen across her face; the hair lies FLAT against her
skull with the hairline visible, never a wide round frizzy halo. Her eyes are
half-lidded and heavy, her expression flat and unimpressed — never smiling,
never cute, never wide-eyed. She wears a dark charcoal tank top under an
oversized unbuttoned dark brown jacket with the sleeves pushed up to the
elbows, loose dark trousers cuffed at the ankle, and dark high-top sneakers.
Both hands are wrapped in boxer's hand wraps. In one hand she holds a single
oversized cannabis leaf by its stem, about half as tall as her torso, held like
a fan or a paddle — not a staff, not a magic wand. The leaf is matte deep green
and does not glow. Everything else she wears is dark; the leaf is the only
green in the whole design.

She stands with her feet planted WELL APART and her weight low, so her
silhouette stays broad rather than a narrow column. The leaf stem stays in her
hand and the leaf itself always touches her arm or body — nothing is ever
detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no
text, no labels, no panel borders. Full body visible from the top of her hair
to the soles of both shoes — do not crop, do not zoom. Leave a clear band of
empty white space below the soles and above her hair. Exactly two arms and two
legs, clearly separated, do not overlap or duplicate limbs. Anatomically
correct human proportions.
```

**ตรวจก่อนผ่าน:** วัดความสว่าง 40% ล่าง (ต้อง < 140) · ใบไม้ติดมืออยู่ · ผมไม่พอง · ไม่มีควัน

---

## 2. คลิปวิ่ง — เจนเป็น **วิดีโอ** ไม่ใช่ชีต

ท่าวิ่งที่เจนเป็นภาพนิ่งทีละเฟรม **ขาไม่สลับซ้าย-ขวาจริง** — พลาดมาแล้วทั้ง MARCH และ BOMB
(ดู `STYLE_LOCK.md` ส่วนที่ 5: "Bomb ท่าวิ่งยังดูเหมือนวิ่งขาเดียว")

ของที่ได้ผลคือ **เจนเป็นคลิปแล้วตัดเฟรมเอา** — ท่าวิ่ง 10 เฟรมขาสลับจริงของ KUNJAE
มาจากวิธีนี้ (ดู `art_prompts_kunjae.md` หมวด "เลือกหน้าต่างด้วยรอยต่อของลูป")

ตัว build ต้องการจากคลิปนี้: **ท่าวิ่งหนึ่งรอบเต็ม 10 เฟรม**
(ท่ายืนใช้ของขั้น 0 ไม่ต้องเอาจากคลิป — เอาจากคลิปจะได้ท่ายืนคนละใบกับ anchor)
(รอบเต็ม = เท้าซ้ายแตะพื้น → เท้าขวาแตะพื้น → กลับมาเท้าซ้ายแตะพื้นในท่าเดิม)

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO MAGIC EFFECTS, NO DUST,
NO SPEED LINES anywhere in this video.

A short looping animation of the attached character on a pure white background,
side-scrolling game view, three-quarter angle, moving toward the viewer's right.
She starts in her idle standing pose, then breaks into a steady run cycle and
keeps running for several full strides. Her feet clearly alternate — left foot
plants, then right foot plants, then left again — each stride the same length.

The camera does not move, does not zoom and does not change angle. She stays
the same size in frame the whole time and her whole body including the soles of
her shoes stays inside the frame at all times. She keeps holding the cannabis
leaf by its stem the whole run; the leaf stays close against her body and never
flies away from her hand. Her hair stays flat against her skull.

Pure white background throughout, no shadow, no ground line, no props, no text.
```

**ตัดเฟรมด้วย:** `game/tools/cut.py` แล้วเลือกหน้าต่างด้วยวิธี "รอยต่อของลูป"
(ไล่ทุกหน้าต่าง 10 เฟรมติดกัน แล้ววัด IoU ของรอยต่อเทียบกับ IoU ของเฟรมติดกันเฉลี่ย
ยิ่งใกล้กันยิ่งลูปเนียน — ดูตารางตัวอย่างใน `art_prompts_kunjae.md`)

---

## 3. ชีต A — ท่าเคลื่อนไหวและท่าโดน (12 ท่า · 4 แถว × 3)

ใบนี้ไม่มีท่าตีเลยสักท่า แต่เป็นใบที่เห็นบ่อยที่สุดตอนเล่นจริง
**ท่าโดนตีกับท่าล้มคือท่าที่คนเล่นดูมากที่สุดตอนแพ้** อย่าให้มันดูเหมือนท่ายืนเอียง ๆ

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO GLOW, NO SPARKLES, NO MAGIC
EFFECTS anywhere in this image. The character never exhales smoke. The game
engine draws every smoke and light effect by itself.

A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no impact flashes, no dust — the game draws all of that.

Pose 1 — pushing off the ground into a jump, knees driving up, body stretched tall.
Pose 2 — the top of the jump, body tucked compact, knees pulled toward the chest.
Pose 3 — falling, legs reaching down, arms out for balance.
Pose 4 — landing, both feet planted, knees deeply bent absorbing the impact.
Pose 5 — hit hard: head snapped back, upper body folded over, both arms thrown
loose behind her, clearly in pain and off balance.
Pose 6 — knocked down, lying face down on the ground, limbs sprawled, head low.
Pose 7 — rolling sideways along the ground, body curled into a tight ball.
Pose 8 — pushing herself back up off the ground onto one knee.
Pose 9 — standing guard: both forearms crossed in front of her face, feet apart,
weight low and solid.
Pose 10 — knocked back while guarding: same crossed-arm guard but skidding
backward, heels dragging, body leaned away.
Pose 11 — crouching low, knees fully bent, sitting almost on her heels, head low.
Pose 12 — crouching low with both forearms up guarding her face at the same time.

[วาง anchor ดีไซน์ตัวละครทั้งย่อหน้าตรงนี้]

Pure white background, no shadow, no ground line, no props, no text, no labels,
no panel borders. Full body visible in every pose — do not crop, do not zoom.
Leave a clear band of empty white space below and above every pose; nothing may
touch or run off the edge of the image. Identical camera distance and identical
character size in every pose. Exactly two arms and two legs per pose, clearly
separated. Nothing detached from her body anywhere in the image — the cannabis
leaf stays in her hand and against her body in every single pose, including
while she is knocked down and rolling.
```

---

## 4. ชีต B — ฟาดใบไม้สามจังหวะ (9 ท่า · 3 × 3)

ไม้ปกติของเธอ ออกช้ากว่าทุกคนในเกม แต่กรอบกว้างและสูง (กวาดคนกระโดดต่ำ ๆ ติด)
**ใบไม้ต้องกวาดเป็นส่วนโค้งกว้าง ไม่ใช่แทง** ซิลูเอตต้องอ่านออกว่า "กวาด"

**รอยต่อคือทั้งหมดของใบนี้** — ท่าสุดท้ายของจังหวะหนึ่งต้องเป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO GLOW, NO SPARKLES, NO MAGIC
EFFECTS anywhere in this image. The character never exhales smoke. The game
engine draws every smoke and light effect by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

This sheet is one continuous combination, not separate poses. Draw the LAST pose
of each beat and the FIRST pose of the next beat as the SAME body position, so
the sequence reads as one unbroken motion: the hand pulling back from one swing
is already the hand starting the next one, and her weight keeps flowing forward
instead of resetting to a neutral stance between beats.

Pose 1 — the leaf drawn back beside her hip, body coiled, front shoulder dropped.
Pose 2 — a wide flat sweep of the leaf across chest height at full reach, her
whole torso turned through behind it, back heel lifted.
Pose 3 — the leaf carried past the target and pulling back in, hips still turning.
Pose 4 — the leaf raised back over her opposite shoulder, elbow high, knees loading.
Pose 5 — a downward diagonal sweep of the leaf from high to low at full reach,
her body dropping behind it.
Pose 6 — the leaf swinging through to low, weight rolling onto the front foot.
Pose 7 — both hands on the stem now, the leaf cocked low and back like a bat.
Pose 8 — a big two-handed upward swing of the leaf from low to head height at
full reach, her whole body uncoiling behind it, back foot leaving the ground.
Pose 9 — following through above her head, body turned all the way through.

[วาง anchor ดีไซน์ตัวละครทั้งย่อหน้าตรงนี้]

[วางท่อนปิดท้ายเทคนิคเหมือนใบ A]
```

---

## 5. ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 × 3)

ท่า 4-6 คือท่าส่งขึ้นฟ้าของเธอ **ใบไม้ต้องชี้ขึ้นชัด ๆ** ไม่งั้นอ่านไม่ออกว่าเป็นท่าส่งขึ้น

```
[ท่อนห้ามควัน]

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — stepping deep into a long forward lunge, the leaf drawn back at her hip.
Pose 2 — a long lunging thrust, pushing the leaf straight forward at chest height
at full extension, front leg deep in a long stride, body stretched out behind it.
Pose 3 — recovering out of the lunge, pulling the leaf back in.
Pose 4 — crouched low, the leaf held down beside her knee, coiled to swing upward.
Pose 5 — swinging the leaf STRAIGHT UP past her own head, arm fully extended
vertically, body stretched tall, back heel lifted, head tipped back.
Pose 6 — coming down out of the upward swing, knees absorbing.
Pose 7 — dropping into a low crouch, one leg folded under her, the leaf low.
Pose 8 — a low sweeping kick with her back leg swung all the way through at
ankle height, body low to the ground, one hand planted, the leaf in the other.
Pose 9 — recovering up out of the low sweep.

[anchor + ท่อนปิดท้าย]
```

---

## 6. ชีต D — ท่ากลางอากาศ (9 ท่า · 3 × 3)

**ทุกท่าในใบนี้เท้าต้องลอย** ไม่มีท่าไหนแตะพื้น — พลาดข้อนี้แล้วท่าอากาศจะดูเหมือนท่าพื้น

```
[ท่อนห้ามควัน]

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
Every pose in this sheet happens in mid-air — both of her feet are off the
ground in all nine poses, with nothing below her.
No motion lines, no effects — the game draws all of that.

Pose 1 — airborne, curling up, the leaf tucked in across her chest.
Pose 2 — airborne, spinning with the leaf swept out in a full circle around her
at waist height, both legs tucked.
Pose 3 — airborne, coming out of the spin, the leaf pulling back in.
Pose 4 — airborne, the leaf drawn back behind her shoulder, body angled forward.
Pose 5 — airborne, thrusting the leaf forward sideways at full reach, body
stretched out flat behind it, legs trailing.
Pose 6 — airborne, pulling the leaf back in, body folding.
Pose 7 — airborne, the leaf raised high over her head with both hands.
Pose 8 — airborne, smashing the leaf straight DOWN below her at full reach,
head and shoulders driving down after it, knees pulled up.
Pose 9 — airborne, after the downward smash, body curled under.

[anchor + ท่อนปิดท้าย]
```

---

## 7. ชีต E — รัวควัน `haze1` `haze2` `haze3` (9 ท่า · 3 × 3)

**นี่คือสกิลหลักของเธอ** หมัดรัวกดรัวยืดได้ — ใบนี้ต้องอ่านเป็น "กำแพงหมัด" ไม่ใช่ "หมัดเป็นชุด ๆ"

ท่า 7-9 (`haze3`) **วนกลับไปต่อท่า 4 (`haze2`) ได้เรื่อย ๆ** ถ้าคนเล่นกดรัว
ท่า 9 จึงต้องต่อเข้าท่า 4 ได้เนียนเหมือนต่อเข้าท่า 1 — **เป็นลูปปิด ไม่ใช่เส้นตรง**

```
[ท่อนห้ามควัน]

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

This sheet is one continuous rapid flurry of close-range strikes, not separate
poses. She stays planted in one tight stance the whole time, leaning in, and
only her arms move fast. Her feet barely shift between poses.

This sequence LOOPS: pose 9 must flow straight back into pose 4 just as cleanly
as pose 3 flows into pose 4, so the flurry can repeat without a visible seam.

Pose 1 — dropping into a tight forward stance, both hands coming up, the leaf
held close against her forearm so it does not swing out.
Pose 2 — a fast short strike with the leaf at chest height, arm barely extended,
elbow still bent, body leaning in.
Pose 3 — that arm snapping back in while the other hand is already coming out.
Pose 4 — the other hand striking short and fast at chest height.
Pose 5 — the first hand striking again, slightly higher, at shoulder height.
Pose 6 — the other hand striking again, slightly lower, at stomach height.
Pose 7 — a fast short strike at chin height, elbow tight.
Pose 8 — a fast short strike at stomach height, elbow tight.
Pose 9 — both hands pulled back in tight against her chest, already coiled to
throw the next strike, her stance and weight identical to pose 3.

[anchor + ท่อนปิดท้าย — เน้นว่าใบไม้ต้องแนบแขน ไม่กางออก]
```

---

## 8. ชีต F — ไม้จบรัว + ต่อยแล้วย้อน + อัลติ (9 ท่า · 3 × 3)

สามท่าที่หนักที่สุดของเธอ แต่ละท่าต้องอ่านออกจากกันที่ซิลูเอตอย่างเดียว

- ท่า 1-3 `hazeEnd` — หมัดปิดหมัดเดียวหลังรัวจนเป็นกำแพง **ต้องใหญ่กว่าทุกไม้ในใบ E ชัด ๆ**
- ท่า 4-6 `snap1` — พุ่งเข้าไปต่อย **แล้วเกมจะเด้งเธอกลับที่เดิมเอง** ท่าไม่ต้องแสดงการย้อน
  (เกมวาดทางควันให้แล้ว — ดู `rewind` ใน `ScrambleScene.js`)
- ท่า 7-9 `veil1` อัลติ — กางใบไม้ออกเต็มที่รอบตัว **ท่ากว้างที่สุดของเธอ**

```
[ท่อนห้ามควัน]

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — winding up fully: the leaf drawn all the way back past her hip with
both hands, knees deeply loaded, shoulder turned away, the biggest wind-up in
her whole moveset.
Pose 2 — a single enormous two-handed swing of the leaf across chest height at
maximum reach, her entire body uncoiling behind it, back foot off the ground,
teeth gritted.
Pose 3 — following all the way through, the swing carried past her, body turned
completely around.

Pose 4 — dropping low and launching forward, front foot reaching out, the leaf
drawn back tight against her ribs.
Pose 5 — a long committed lunging strike, pushing the leaf forward at chest
height at full extension while her body is stretched far out over her front
leg, almost falling forward.
Pose 6 — landing out of the lunge, front knee deep, the leaf still extended.

Pose 7 — standing tall and still, the leaf held flat in front of her chest with
both hands, head lowered, feet together — the calmest pose in the whole sheet.
Pose 8 — both arms thrown WIDE open to either side, the leaf swept out at full
arm's length, chest open, head tipped back, feet planted far apart — the widest
and most open pose in her entire moveset.
Pose 9 — arms coming back down from the wide opening, the leaf lowering, body
settling.

[anchor + ท่อนปิดท้าย]
```

---

## เช็กลิสต์ก่อน build

- [ ] ขั้น 0 ผ่านแล้ว และวัดความสว่าง 40% ล่างได้ **ต่ำกว่า 140**
- [ ] ทุกใบแนบขั้น 0 เป็น reference
- [ ] ท่อนห้ามควันอยู่ **บรรทัดแรก** ของทุก prompt ไม่ใช่ท้าย
- [ ] เปิดดูทุกใบด้วยตา: **ใบกัญชาอยู่ในมือครบทุกท่าไหม** (ตัวเลขจับข้อนี้ไม่ได้)
- [ ] ไม่มีควัน/แสงเรือง/ประกายติดมาสักท่า
- [ ] แขนขาไม่เกิน ไม่ซ้อน · ไม่มีท่าชนขอบ · ไม่มีท่าติดกัน
- [ ] `tools/measure_sheet_scale.py` — ท่าตั้งหลักต้องได้ 96-100% ของท่ายืน
- [ ] ใบ E ท่า 9 ต่อเข้าท่า 4 ได้เนียน (ลูปปิด)
- [ ] ใบ D ทุกท่าเท้าลอยจริง

---

## ตารางเทียบ: ท่าในชีต → ไอดีท่าในซิม

ตารางนี้คือสิ่งที่ `tools/build_scramble_eye.py` (ยังไม่ได้เขียน) จะใช้
**ทุกไอดีต้องตรงกับ `EYE_MOVES` ใน `core.js` เป๊ะ** ไม่งั้นท่าหาย วาดเป็นกล่องแทน

| ไอดีในซิม | ใบ | ท่า | หมายเหตุ |
|---|---|---|---|
| `idle` | ขั้น 0 | 1 | |
| `run` | คลิป | 1-10 | ตัดจากวิดีโอ |
| `jump` | A | 1-4 | ถีบขึ้น → หดสุด → ร่วง → ลงพื้น |
| `hurt` | A | 5 | |
| `knockdown` | A | 6 | |
| `techroll` | A | 7 | |
| `tech` | A | 8 | |
| `block` | A | 9 | |
| `blockstun` | A | 10 | |
| `crouch` | A | 11 | |
| `blockcrouch` | A | 12 | |
| `jab1` | B | 1, 2, 3 | |
| `jab2` | B | 4, 5, 6 | |
| `jab3` | B | 7, 8, 9 | ไม้ที่ทิ้งควัน |
| `side` | C | 1, 2, 3 | |
| `up` | C | 4, 5, 6 | |
| `down` | C | 7, 8, 9 | |
| `nair` | D | 1, 2, 3 | |
| `sair` | D | 4, 5, 6 | |
| `dair` | D | 7, 8, 9 | ไม้ที่ทิ้งควัน |
| `haze1` | E | 1, 2, 3 | |
| `haze2` | E | 4, 5, 6 | ไม้ที่ทิ้งควัน |
| `haze3` | E | 7, 8, 9 | วนกลับไป `haze2` |
| `hazeEnd` | F | 1, 2, 3 | |
| `snap1` | F | 4, 5, 6 | เกมเด้งกลับที่เดิมให้เอง |
| `veil1` | F | 7, 8, 9 | อัลติ |

**รวม 68 เฟรม** (1 + 10 + 12 + 9×5) — ใกล้เคียง DEAR (70) น้อยกว่า MARCH (102)

> ท่ายืนนับครั้งเดียว มาจากขั้น 0 — คลิปวิ่งให้มาแต่เฟรมวิ่ง
> (ร่างแรกของไฟล์นี้เขียน 69 เพราะนับท่ายืนสองรอบ ทั้งจากขั้น 0 และจากคลิป)

---

## หลังได้อาร์ตครบ

1. เขียน `game/tools/build_scramble_eye.py` (ลอกจาก `build_scramble_march.py` ได้เลย)
2. ลบ `artPending: true` ออกจาก **สองที่**: `CHARACTERS.chronos` ใน `core.js`
   และ `CHAR_ART.chronos` ใน `ScrambleScene.js`
3. เติม `atlasKey: 'scchronos'` · `texture` · `data` · `anims` · `runStride` ใน `CHAR_ART.chronos`
4. เช็กว่าอัตลาสไม่เกิน **4096 px** ทุกด้าน — เกินแล้วการ์ดจอวาดเป็นสีดำ **โดยไม่มี error**
   (ใช้ `tools/repack_atlas.py` พับเป็นหลายแถว)
5. เติม `chronos` ใน `tools/tests/` ที่ล็อกจำนวนตัวละครไว้ (`lobby_bits.test.mjs`)
6. `bash tools/tests/run_all.sh` — `scramble.test.mjs` จะเลิกข้ามการตรวจอาร์ตของตัวนี้เอง
   ทันทีที่ธง `artPending` หายไป แล้วมันจะฟ้องทุกเฟรมที่ขาด
