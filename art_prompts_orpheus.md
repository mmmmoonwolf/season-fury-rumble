# ORPHEUS — prompt อาร์ตครบทุกท่า

**The Fury of the Long Echo** · สายวางเสียงสะท้อน · นักดนตรีผมยาวถือกีตาร์

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
The guitar stays in his hands in every pose. Hair moves with each pose.

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

## ชีต B — ชุดเหวี่ยงกีตาร์ (9 ท่า · 3 แถวแถวละ 3)

3 ท่าต่อหนึ่งเหวี่ยง: เงื้อ → สุดวง → ชักกลับ · นี่คือ**ท่าตีปกติ**

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is swinging the guitar as a weapon, three poses per swing, gripping it by
the neck with both hands like an axe. No motion lines, no slash arcs, no
sound waves, no sparks — the game draws all effects.

Pose 1 — guitar drawn back over one shoulder by the neck, body coiled.
Pose 2 — a wide horizontal swing fully extended across his body at chest height.
Pose 3 — recovering from the swing, guitar swung through and low.
Pose 4 — guitar pulled back to the other side, torso wound the opposite way.
Pose 5 — a wide backhand swing fully extended the other direction.
Pose 6 — guitar coming to rest, weight settling onto the front foot.
Pose 7 — guitar raised high overhead by the neck in both hands, body stretched up.
Pose 8 — a heavy overhead smash driven straight down in front of him, whole
body committed, back sneaker lifted off the ground.
Pose 9 — recovering from the smash, guitar low, knees bent, shoulders heaving.
```

---

## ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no sound waves — the game draws all effects.

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

## ชีต E — สกิล 1 · คอร์ดหนัก (6 ท่า · 2 แถวแถวละ 3)

ตีคอร์ดเต็มแรงลงข้างหน้า แล้วทิ้งเสียงสะท้อนไว้

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is PLAYING the guitar here, not swinging it — held in normal playing
position across his body, strumming hand raised and struck down hard.
Draw NO sound waves, NO shockwave, NO speed lines — the game draws all of that.

Pose 1 — planting both feet wide, strumming hand lifted high above the strings,
body arched back, head down over the guitar.
Pose 2 — the strum: hand slashed down across the strings at full force, whole
body dropping into it, knees bending, hair thrown forward.
Pose 3 — holding the chord, body pressed low over the guitar, strumming arm
extended past the body, face tight.
Pose 4 — leaning hard into it, front foot stamped forward, head thrown back.
Pose 5 — the note ringing out, body straightening, strumming arm sweeping up.
Pose 6 — settling back to the ready stance, hand back over the strings.
```

---

## ชีต F — สกิล 2 · ฟีดแบ็ก (6 ท่า · 2 แถวแถวละ 3)

ยกกีตาร์รับ ถ้าโดนตีจะแปลงแรงนั้นกลับเป็นเสียงสะท้อน

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Draw NO sound waves, NO glow, NO impact effects — the game draws all of that.

Pose 1 — snapping the guitar up flat in front of his chest with both hands,
face turned toward the threat, feet braced apart.
Pose 2 — holding the guard: guitar held out flat like a shield, body leaning
into it, shoulders squared, chin tucked.
Pose 3 — absorbing a blow: body shoved back a step, arms bent taking the weight,
guitar still up, teeth bared.
Pose 4 — turning the guard over: guitar rotated face-out, one hand on the neck,
the other flat against the back of the body, pushing forward.
Pose 5 — throwing it back: shoving the guitar forward at arm's length, body
twisting behind the push, front leg driving.
Pose 6 — recovering, guitar swung back down to his side, breathing hard.
```

---

## ชีต G — สกิล 3 อัลติ · อังกอร์สุดท้าย (6 ท่า · 2 แถวแถวละ 3)

ตั้งท่าโซโล่ · **เดินได้ระหว่างโซโล่** ดังนั้นสองท่าสุดท้ายต้องเป็นท่าย่างเท้า

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is playing a guitar solo. Draw NO sound waves, NO shockwave, NO glow,
NO lightning, NO smoke — the game draws all of that. Only the character.

Pose 1 — throwing his head back and lifting the guitar neck high, mouth open,
both feet planted wide, starting the solo.
Pose 2 — deep in the solo: fretting hand high up the neck, strumming hand a
blur against the strings, body bent backward, hair thrown back.
Pose 3 — leaning far forward over the guitar, head down, hair curtaining his
face, both hands working the neck.
Pose 4 — dropping to one knee, guitar held up and out, face turned upward.
Pose 5 — still playing but WALKING: mid-stride with one leg forward, guitar
held across the body, hands still on it, weight moving forward.
Pose 6 — still playing, the opposite stride: other leg forward, torso turned
slightly, hands still on the guitar.
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
6. **ห้ามวาดเอฟเฟค** ไม่มีคลื่นเสียง ไม่มีเส้นความเร็ว ไม่มีประกายไฟ
   — VFX เกมวาดเอง (บทเรียนจากชีต Stone Curse ของ Nyx)
7. **คอกีตาร์เอียงเข้าหาตัว** ไม่ยื่นยาวออกด้านข้าง (เหตุผลเดียวกับแส้ Alecto)
8. **ผมไม่บังหน้า** ยกเว้นท่าที่ระบุไว้ชัด (ชีต G ท่า 3)

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · blockstun · blockcrouch | ชีต A |
| ตีปกติ | jab1 · jab2 · jab3 (ท่าละ 3 เฟรม) | ชีต B |
| พิเศษพื้น | side (ทิ่มคอกีตาร์) · up (สอยขึ้น) · down (กวาดต่ำ) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | คอร์ดหนัก | ชีต E |
| สกิล 2 | ฟีดแบ็ก (ท่าสวนกลับ) | ชีต F |
| สกิล 3 | อังกอร์สุดท้าย (อัลติ) | ชีต G |
| ถอยหลัง | กระโดดถอย 3 ท่า | ชีต A ท่า 2-4 ใช้ซ้ำได้ ถ้าไม่พอค่อยขอเพิ่ม |
