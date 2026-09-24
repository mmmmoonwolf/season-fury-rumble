# ORPHEUS — prompt อาร์ตครบทุกท่า

**The Fury of the Final Encore** · สายไล่หวดติดไฟ · นักดนตรีผมยาวถือกีตาร์

---

## ⚠️ สิ่งที่วัดจากภาพต้นแบบแล้ว (ไม่ต้องเดา)

### 1. ตัวนี้เครื่องมือเดิมใช้ได้หมด — ต่างจากสองตัวก่อน

| ไม้บรรทัด | Alecto | Atlas | **Orpheus** |
|---|---|---|---|
| ความกว้างหัว | ✗ หมวกบัง | ✗ ดาบที่ชูบังแถบบน | **✓ ใช้ได้** |
| `face_sqrt` (โทนผิวช่วงหัว) | ✗ | ✗ ขนเสือไม่มีโทนผิว | **✓ วัดได้ 23,837 px** |
| `hair_sqrt` (สีเกือบดำช่วงหัว) | ✗ ผมแดงเท่าหมวก | ✗ ลายเสือไม่เข้มพอ | ~ วัดได้ 163,590 px แต่ผมยาวสะบัดตามท่า |

**ใช้ `face_sqrt` เป็นหลัก** หน้าเป็นของแข็งขนาดคงที่ ส่วนผมยาวเปลี่ยนรูปตามท่า

**ด่านสัดส่วนผ่านแล้ว: 2.76 หัว** (เกณฑ์ 2.50-2.80 · Nyx 2.62 · Helios 2.82 · Alecto 1.81)
ภาพต้นแบบสูง 1381 px หัวกว้าง 500 px

### 2. การตัดพื้นหลังใช้วิธีของ Atlas ได้เลย ทดสอบแล้วผ่าน

`atlas_sheets.background()` (เส้นขอบดำ + ความสว่าง) ทำงานกับภาพต้นแบบได้สะอาด:
ตัวละครออกมาเป็นชิ้นเดียว 777,625 px · พื้นหลังเฉลี่ย 254.6 · เจาะรูถูกต้องแค่ 2 ช่อง

**จุดที่เกือบพัง:** รองเท้าผ้าใบสีขาวกับสูทสีเทาอ่อน
วัดแล้วออกมา 233-236 ซึ่งยังห่างจากเกณฑ์พื้นหลัง (249) พอสมควร — ปลอดภัย
**แต่เงื่อนไขคือเส้นขอบดำต้องปิดรอบตัวครบ** ถ้าเส้นขอบรองเท้าขาดตรงไหน
พื้นหลังจะไหลเข้าไปกินรองเท้าทั้งข้าง → **ทุก prompt ต้องย้ำเส้นขอบเข้มรอบตัว**

### 3. กีตาร์จะทำให้กรอบเฟรมบวมและอาจลากจุดยึด

ปัญหาเดียวกับแส้ Alecto / ดาบกับหางของ Atlas แต่**หนักกว่า**:
แส้กับดาบบาง กัดภาพทิ้งได้ แต่**ตัวกีตาร์เป็นก้อนตันใหญ่** กัดแล้วไม่หาย

- **กำชับทุก prompt:** คอกีตาร์เอียงเข้าหาตัว ไม่ยื่นยาวออกไปด้านข้าง
- ถ้าวัดแล้วจุดยึดยังเพี้ยน แผนสำรองคือหักกีตาร์ออกด้วยสี —
  ฟิงเกอร์บอร์ดเกือบดำและขอบซันเบิร์สต์แยกจากกางเกงเขียวกับสูทเทาได้

### 4. ⛔ ห้ามวาดไฟในอาร์ตเด็ดขาด — ข้อที่สำคัญที่สุดของตัวนี้

ไฟของตัวนี้เป็น **สถานะชั่วคราว** ไม่ใช่ส่วนหนึ่งของตัวละคร (ต่างจากดาบไฟของ Atlas
ที่ติดไฟตลอดเวลา จึงวาดไฟลงไปในภาพได้)

ท่าฟาดชุดเดียวกันต้องใช้ได้ทั้ง**ตอนกีตาร์ติดไฟ**และ**ตอนไม่ติด**
ถ้าเจนไฟมาในภาพ จะต้องวาดท่าฟาดสองชุด = **เปลืองอาร์ตเท่าตัวโดยไม่จำเป็น**

**เกมวาดไฟเองทั้งหมด** กีตาร์ในภาพเป็นกีตาร์ธรรมดาทุกท่า รวมถึงชีตสกิลไฟด้วย

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, head roughly one third of the total height, bold dark outlines fully closed around every part of the figure including the shoes, flat cel shading, muted palette — match the attached reference proportions exactly. Character: a lean young man with long black wavy hair past his shoulders, pale skin, sharp brows, wearing an open grey blazer over a plain black t-shirt, olive green cargo pants and white chunky sneakers. He carries a sunburst Les Paul electric guitar, held in his hands in every pose, neck angled in toward his body and never stretched far out to the side. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props, no stage, no amplifier. Full body visible from the top of the hair to the soles of both sneakers — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

# ลำดับการเจน

## ขั้น 0 — ท่ายืน ✅ ผ่านแล้ว

ภาพที่ส่งมาใช้เป็นท่ายืนได้เลย · สัดส่วน 2.76 หัว · ตัดพื้นหลังสะอาด

## ขั้น 1 — คลิป ยืน → วิ่ง

```
Animate this exact character: starts in the braced playing stance, holds it
briefly, then runs forward to the right in a driving run cycle with legs
alternating clearly, at least three full strides. The guitar stays gripped
in both hands across his body the whole time, hair swinging with the motion
but never covering his face. Same art style, same proportions, same camera
distance throughout. Pure white background, no shadow, no ground line.
Full body always visible, never cropped.
```

---

## ชีต A — ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
The guitar stays in his hands in every pose and is a plain sunburst Les Paul
with NO flame on it. Hair moves with each pose. No effects of any kind.

Pose 1 — crouching down low, knees deeply bent, guitar pulled in across his chest.
Pose 2 — pushing off the ground at the start of a jump, body stretching upward,
guitar swung out behind for momentum.
Pose 3 — airborne at the top of a jump, knees tucked, guitar held close.
Pose 4 — falling, legs reaching down, free hand out for balance.
Pose 5 — landing in a crouch, both sneakers planted, guitar neck low.
Pose 6 — struck and recoiling, head snapped back, hair flying forward,
torso twisted away, but feet still planted — staggered, not thrown.
Pose 7 — knocked down, lying on his back on the ground, limbs sprawled,
guitar fallen across his body.
Pose 8 — rolling sideways along the ground, body curled around the guitar.
Pose 9 — bracing to block: guitar held upright in both hands in front of his
face and chest like a shield, shoulders hunched behind it.
```

---

## ชีต B — Riff ไล่หวดกีตาร์ (9 ท่า · 3 แถวแถวละ 3)

**ตัวชูโรงของตัวนี้** กดรัวแล้วหวดรัว 5 จังหวะต่อเนื่อง ฟาดวงกว้าง ไม่ใช่จิ้มทีละที
9 ท่านี้ = 5 จังหวะ + ท่าเชื่อม (บางจังหวะใช้ 2 ท่า บางจังหวะใช้ท่าเดียว)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a fast, wild flurry of guitar swings — he is beating with the guitar,
gripping it by the neck with both hands like a baseball bat. Every swing is
loose and wide and reckless, hair whipping with each one. He stays roughly in
place, turning his body into each swing rather than stepping forward.
No motion lines, no arcs, no sparks, NO FIRE — the game draws all effects.
The guitar is a plain sunburst Les Paul with no flame on it.

Pose 1 — guitar cocked back over the right shoulder, knees bent, coiled.
Pose 2 — first swing: a fast flat swing across at waist height, arms extended.
Pose 3 — second swing: backhand whipping the other way at chest height,
torso already twisting back, hair thrown across.
Pose 4 — third swing: an overhead chop coming straight down in front of him.
Pose 5 — fourth swing: a low rising swing coming up from his knees,
body opening up, head tilted back.
Pose 6 — winding up the finisher: guitar hauled all the way back behind him
with both hands, back foot planted, whole body loaded.
Pose 7 — the finisher connecting: an enormous full-body swing at maximum reach,
front foot stamped down, both arms straight, head snapped forward.
Pose 8 — following through past the swing, body rotated well past square,
guitar carried out to the far side.
Pose 9 — recovering, guitar dropped low, shoulders heaving, hair settling.
```

---

## ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no sound waves, NO FIRE — the game draws all effects.
Plain sunburst guitar, no flame.

Pose 1 — stepping forward, shoulder dropped, guitar drawn back behind him.
Pose 2 — a long lunging thrust, driving the guitar neck straight forward like
a spear, front leg deep in a long stride.
Pose 3 — recovering from the lunge, pulling the guitar back in.
Pose 4 — crouched low, guitar held near the ground, coiled to swing upward.
Pose 5 — a rising upward swing, the guitar swung straight up past his own head,
body fully extended upward, back heel lifted.
Pose 6 — coming down from the rising swing, knees absorbing the landing.
Pose 7 — dropping into a low crouch, one hand planted on the ground.
Pose 8 — a low sweeping swing along the floor, guitar body extended flat and
level with the ground, torso rotated over the planted hand.
Pose 9 — rising out of the crouch, dragging the guitar back up.
```

---

## ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Every pose is airborne — both sneakers off the ground, no ground contact.
No effects of any kind, NO FIRE. Plain sunburst guitar, no flame.

Pose 1 — airborne, knees tucked, guitar held close across his chest.
Pose 2 — airborne spinning swing, guitar swung out horizontally to the side,
free arm wide for balance, hair flared out.
Pose 3 — airborne, guitar pulling back in from the spin.
Pose 4 — airborne, leaning forward, guitar drawn back past his hip.
Pose 5 — airborne forward thrust, guitar neck driven straight ahead,
trailing leg tucked, body angled forward.
Pose 6 — airborne, recovering from the thrust, legs gathering.
Pose 7 — airborne, guitar raised high above his head in both hands, knees up.
Pose 8 — airborne downward smash, guitar driven straight down beneath him,
body folded over it.
Pose 9 — airborne, legs together underneath, guitar gathered, ready to land.
```

---

## ชีต E — สกิล 1 · Power Slide สไลด์เข่า (6 ท่า · 2 แถวแถวละ 3)

ทิ้งตัวสไลด์เข่าไปข้างหน้า ตัวต่ำลอดกระสุน แล้วเด้งขึ้นฟาดสวน

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a rock-star knee slide. No motion lines, no dust, no sparks, NO FIRE
— the game draws all of that. Plain sunburst guitar, no flame.

Pose 1 — running start: leaning forward, one leg driving, guitar swung back.
Pose 2 — dropping into the slide: throwing both knees forward and down toward
the ground, body tipping back, guitar lifted clear of the floor.
Pose 3 — mid slide, LOW: both knees down and skidding, torso leaned far back
almost horizontal, head thrown back, guitar held up across his chest,
hair streaming behind. This pose must read as very low to the ground.
Pose 4 — still sliding, starting to gather: one knee coming up under him,
free hand reaching down to the floor.
Pose 5 — bursting up out of the slide with an upward swing, guitar swung from
low to high past his own head, body fully extended upward, back heel lifted.
Pose 6 — landing out of it, feet back under him, guitar coming down to his side.
```

---

## ชีต F — สกิล 2 · Burnout ถอยหลังลากไฟ (6 ท่า · 2 แถวแถวละ 3)

ท่าจุดบัฟ กดครั้งเดียวแล้วบัฟอยู่ 8 วินาที — เป็นท่าสั้น ๆ แต่ต้องอลังการ

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is calling something up out of the guitar. Draw NO fire, NO flame, NO glow,
NO smoke, NO lightning — the game draws every effect. The guitar stays a plain
sunburst Les Paul in all six poses. Only the character and his pose.

Pose 1 — dropping into a wide stance, gripping the guitar neck hard with the
fretting hand, other hand flat on the strings, head down.
Pose 2 — dragging the strumming hand slowly down the strings, body sinking,
shoulders rolling forward, face tightening.
Pose 3 — head snapping up, mouth open in a shout, guitar swung up and out to
his side at arm's length, chest thrown open.
Pose 4 — holding the guitar straight up overhead by the neck in one hand,
other arm flung wide, body arched back, hair thrown back, looking upward.
Pose 5 — bringing it down and across into a ready stance, both hands back on
the guitar, weight shifting onto the front foot.
Pose 6 — settled into an aggressive forward stance, guitar held low and ready
across his body, head lowered, eyes forward, shoulders squared.
```

---

## ชีต G — สกิล 3 อัลติ · Burn the House Down (6 ท่า · 2 แถวแถวละ 3)

ตั้งวงโซโล่ 4 วินาที · **เดินโซโล่ได้** ดังนั้น **สามท่าสุดท้ายต้องเป็นท่าย่างเท้า**
ไม่ใช่ท่ายืนนิ่งทั้งหมด ไม่งั้นเวลาเดินจะเห็นตัวไถไปกับพื้น

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is playing a wild guitar solo. Draw NO fire, NO flame, NO glow, NO smoke,
NO shockwave, NO sound waves — the game draws every effect. Plain sunburst
guitar in all six poses.

Pose 1 — the moment it kicks off: both feet stamped wide apart, head thrown
back, guitar neck hauled up high, mouth open in a roar.
Pose 2 — deep in the solo standing still: fretting hand high up the neck,
strumming arm mid-motion across the strings, body bent backward, hair flying.
Pose 3 — bent far forward over the guitar, head down, hair curtaining his face,
both hands working hard on the neck.
Pose 4 — WALKING while playing: mid-stride with the left leg forward and the
right pushing off, guitar held across the body, both hands still on it,
torso turned into the step, hair swinging.
Pose 5 — WALKING, the opposite stride: right leg forward, left pushing off,
still playing, shoulders rolled the other way.
Pose 6 — the final chord: stopped, both feet planted, strumming arm slashed
all the way down past the guitar and out to the side, head thrown back,
whole body arched, guitar neck angled up.
```

---

## ข้อกำชับที่ใช้กับทุกชีต

1. **ขนาดตัวเท่ากันทุกท่า** ระยะกล้องเดียวกัน — ข้อที่พังบ่อยที่สุด
2. **หันขวาทุกท่า** เกมพลิกภาพเอง
3. **พื้นขาวล้วน ไม่มีเงา ไม่มีเส้นพื้น** (ลายตารางก็ไม่เอา)
4. **เต็มตัว ไม่ครอป** เห็นตั้งแต่ปลายผมถึงพื้นรองเท้า
5. **เส้นขอบดำต้องปิดครบรอบตัว โดยเฉพาะรอบรองเท้าขาว** — ถ้าขาด
   ตัวตัดพื้นหลังจะกินรองเท้าหายทั้งข้าง (วัดแล้วรองเท้าอยู่ที่ 233-236
   ส่วนพื้นหลัง 254 ห่างกันพอ แต่ต้องมีเส้นขอบกั้น)
6. **ห้ามวาดเอฟเฟคทุกชนิด โดยเฉพาะไฟ** ไม่มีเปลวไฟ ไม่มีแสงเรือง ไม่มีควัน
   ไม่มีเส้นความเร็ว — VFX เกมวาดเอง (บทเรียนจากชีต Stone Curse ของ Nyx)
   **กีตาร์ต้องเป็นกีตาร์ธรรมดาทุกท่าทุกชีต** เหตุผลอยู่ในหัวข้อเตือนข้อ 4
7. **คอกีตาร์เอียงเข้าหาตัว** ไม่ยื่นยาวออกด้านข้าง (เหตุผลเดียวกับแส้ Alecto)
8. **ผมไม่บังหน้า** ยกเว้นท่าที่ระบุไว้ชัด (ชีต G ท่า 3)

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · blockstun · blockcrouch | ชีต A |
| ตีปกติ | Riff ไล่หวด 5 จังหวะ | ชีต B |
| พิเศษพื้น | side (ทิ่มคอกีตาร์) · up (สอยขึ้น) · down (กวาดต่ำ) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | สไลด์เข่า | ชีต E |
| สกิล 2 | ถอยหลังฟาดกีตาร์ลงพื้น | ชีต F |
| สกิล 3 | เผาเวที (อัลติ · เดินโซโล่ได้) | ชีต G |
| ถอยหลัง | กระโดดถอย 3 ท่า | ชีต A ท่า 2-4 ใช้ซ้ำได้ ถ้าไม่พอค่อยขอเพิ่ม |
