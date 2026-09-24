# MOMUS — prompt อาร์ตครบทุกท่า

**The Fury of the Last Laugh** · สายจับ · ตัวตลกผมส้มหยิกในชุดขาดวิ่น

---

## ⚠️ สิ่งที่วัดจากภาพต้นแบบแล้ว

### 1. ❌ ภาพที่ส่งมา **ไม่ผ่านด่านสัดส่วน** — ต้องเจนท่ายืนใหม่ก่อน

**วัดได้ 3.78 หัว** · เกณฑ์คือ **2.50-2.80**

| ตัว | สัดส่วน |
|---|---|
| Alecto | 1.81 |
| Nyx | 2.62 |
| Orpheus | 2.76 |
| Helios | 2.82 |
| **ภาพตัวตลกที่ส่งมา** | **3.78 ❌** |

ภาพที่ส่งมาเป็นภาพ turnaround สไตล์อนิเมะสัดส่วนคนจริง ไม่ใช่ chibi เหมือนในเกม
**ถ้าใช้เลย** เครื่องมือจะย่อให้สูง 240 เท่าคนอื่น แล้ว**หัวจะเล็กกว่าเพื่อนอย่างเห็นได้ชัด**
ยืนข้างกันจะเหมือนมาจากคนละเกม

**ดีไซน์ชุดใช้ได้หมด เก็บไว้ทุกอย่าง** — แค่ต้องเจนใหม่ให้หัวใหญ่ขึ้น ตัวสั้นลง
ใช้ prompt ขั้น 0 ข้างล่าง แล้วส่งกลับมาให้วัดก่อนเจนชีต

### 2. ✅ การตัดพื้นหลังผ่านสบาย — สบายที่สุดในบรรดาตัวที่ผ่านมา

วัดจากภาพที่ส่งมา: **ชุดครีมอยู่ที่ 132 · พื้นหลัง 253** ห่างกันมหาศาล
ตัวละครออกมาเป็นชิ้นเดียว 83,969 px ไม่มีเศษหลุด

ต่างจาก Atlas (เสือขาวบนพื้นขาว เฉียดฉิว) และ Orpheus (รองเท้าขาว ต้องพึ่งเส้นขอบ)
ชุดตัวนี้ถึงจะดูขาว แต่จริง ๆ เป็นครีมหม่นที่มีคราบ เครื่องมือแยกออกสบาย
**ใช้ `atlas_sheets.background()` ได้เลย ไม่ต้องเขียนตัวแยกใหม่**

### 3. ไม้บรรทัดวัดระยะกล้อง

| ไม้บรรทัด | ใช้ได้ไหม |
|---|---|
| `face_sqrt` (โทนผิวช่วงหัว) | **✓ ใช้ได้** หน้าซีดแต่ยังเป็นโทนผิวคน |
| `hair_sqrt` (สีเกือบดำ) | ✗ ผมสีส้ม ไม่เข้มพอ |
| ความกว้างหัว | ~ ผมหยิกฟูทำให้แถบบนกว้างไม่คงที่ |

**ใช้ `face_sqrt` เป็นหลัก** เหมือน Nyx/Helios/Orpheus

### 4. ระบายกับริบบิ้นจะทำให้กรอบเฟรมบวมและลากจุดยึด

ปัญหาเดียวกับแส้ Alecto / หางกับดาบ Atlas / กีตาร์ Orpheus
**ชุดนี้หนักกว่าทุกตัว** เพราะมีของรุ่ยห้อยเต็มไปหมด ทั้งระบายคอ ชายแขน ชายขา ริบบิ้นแดง

- **กำชับทุก prompt:** ผ้าที่ห้อยต้องตกลงใกล้ตัว ไม่สะบัดยาวออกไปด้านข้าง
- ริบบิ้นแดงสั้น ๆ พอ ไม่ใช่ริบบิ้นยาวพลิ้ว
- ของรุ่ยพวกนี้บางมาก การกัดภาพหาจุดยึดจะกำจัดได้หมด ไม่น่ามีปัญหาเท่ากีตาร์

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, **large head roughly one third of the total height, short stubby limbs, small body — the whole figure is about two and a half to three heads tall, NOT a realistic full-body proportion**, bold dark outlines fully closed around every part of the figure, flat cel shading, muted desaturated palette. Character: a pale, slightly sinister young clown with messy curly ginger-orange hair, hollow shadowed eyes and a small unsettling smile. He wears a ragged off-white ruffled clown costume — a big frilled collar, puffed torn sleeves, baggy bloomer trousers gathered at the calf, all of it dirty cream and grey with old stains — plus dark red pompoms on the chest, hips and boots, a cloth sash at the waist, short dark red ribbons, dirty white bandages wrapped around both forearms and both shins, and heavy scuffed dark grey boots. The hanging frills and ribbons fall close to his body and never stream far out to the side. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props, no balloons, no text, no labels, no panel borders. Full body visible from the top of the hair to the soles of both boots — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

# ลำดับการเจน

## ขั้น 0 — ท่ายืน (ด่านกั้น · ต้องผ่านก่อนเจนอย่างอื่น)

```
A single full-body standing pose of this clown character, redrawn in chibi
game-sprite proportions: big head, short arms and legs, compact body, the
whole figure only about two and a half to three heads tall. Keep the costume
design exactly as in the reference — ragged cream ruffled clown suit, dark
red pompoms, waist sash, bandaged forearms and shins, heavy dark boots,
curly ginger hair — but rebuild the body proportions as a stubby chibi.
He stands upright in a loose ready stance, feet apart, hands open at his
sides, head tilted slightly, smiling faintly. One character only, one pose
only. No turnaround, no multiple views, no text, no labels, no header bars.
```

ส่งกลับมา เดี๋ยววัดให้ · **ต้องได้ 2.50-2.80 ถึงจะเจนชีตต่อ**

## ขั้น 1 — คลิป ยืน → วิ่ง

```
Animate this exact character: starts in the loose ready stance, holds it
briefly, then runs forward to the right in a bouncing, slightly lurching run
cycle with legs alternating clearly, at least three full strides. The ruffles
and ribbons bounce with him but stay close to his body. Same art style, same
proportions, same camera distance throughout. Pure white background, no
shadow, no ground line. Full body always visible, never cropped.
```

---

## ชีต A — ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No effects of any kind. Ruffles and ribbons stay close to the body.

Pose 1 — crouching down low, knees deeply bent, hands hanging between them.
Pose 2 — pushing off the ground at the start of a jump, body stretching
upward, arms flung up.
Pose 3 — airborne at the top of a jump, knees tucked, arms out to the sides.
Pose 4 — falling, legs reaching down, arms out for balance.
Pose 5 — landing in a crouch, both boots planted, one hand on the floor.
Pose 6 — struck and recoiling, head snapped back, torso twisted away, but
feet still planted — staggered, not thrown. The smile is gone.
Pose 7 — knocked down, lying on his back on the ground, limbs sprawled out.
Pose 8 — rolling sideways along the ground, body curled up tight.
Pose 9 — bracing to block: both forearms crossed in front of his face and
chest, shoulders hunched behind them, head tucked down.
```

---

## ชีต B — ชุดหมัดพื้นฐาน (9 ท่า · 3 แถวแถวละ 3)

3 ท่าต่อหนึ่งหมัด: เงื้อ → สุดแขน → ชักกลับ · **ท่าตีปกติ** ช้าแต่วงกว้าง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a three-punch combo, three poses per punch, thrown with heavy
bandaged fists. Every punch is slow and committed — his whole body turns
into it and the torn sleeves trail behind the arm. No motion lines, no
impact effects, no sparks — the game draws all effects.

Pose 1 — right fist drawn back past his hip, shoulder loaded, body coiled.
Pose 2 — a wide looping right hook fully extended at chest height.
Pose 3 — recovering from the hook, arm swung through and across his body.
Pose 4 — left fist pulled back to the other side, torso wound the opposite way.
Pose 5 — a wide left hook fully extended the other direction.
Pose 6 — arm coming to rest, weight settling onto the front foot.
Pose 7 — both fists raised high overhead together, body fully stretched up.
Pose 8 — a heavy double-fist hammer blow driven straight down in front of
him, whole body committed, back boot lifted off the ground.
Pose 9 — recovering from the hammer blow, fists low, knees bent, head down.
```

---

## ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — stepping forward, shoulder dropped, arm drawn far back behind him.
Pose 2 — a long lunging forward strike, the whole arm and torn sleeve
snapped straight out ahead, front leg deep in a long stride, body stretched.
Pose 3 — recovering from the lunge, pulling the arm back in.
Pose 4 — crouched low, fist at knee height, coiled to swing upward.
Pose 5 — a huge rising uppercut, fist punched straight up past his own head,
body fully extended upward, back heel lifted, head thrown back.
Pose 6 — coming down from the uppercut, knees absorbing the landing.
Pose 7 — dropping into a low crouch, both hands planted on the ground.
Pose 8 — a low sweeping kick along the floor, leg extended flat and level
with the ground, body rotated over the planted hands.
Pose 9 — rising out of the crouch, gathering himself back up.
```

---

## ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Every pose is airborne — both boots off the ground, no ground contact.
No effects of any kind.

Pose 1 — airborne, knees tucked, arms pulled in close.
Pose 2 — airborne spinning strike, one arm swung out horizontally to the
side, other arm wide for balance, body turning.
Pose 3 — airborne, arm pulling back in from the spin.
Pose 4 — airborne, leaning forward, fist drawn back past his hip.
Pose 5 — airborne forward punch, fist driven straight ahead at full reach,
trailing leg tucked, body angled forward.
Pose 6 — airborne, recovering from the punch, legs gathering.
Pose 7 — airborne, both arms raised above his head together, knees up.
Pose 8 — airborne downward hammer blow, both fists driven straight down
beneath him, body folded over it.
Pose 9 — airborne, legs together underneath, arms gathered, ready to land.
```

---

## ชีต E — สกิล 1 · Jack Grab จับพื้น (6 ท่า · 2 แถวแถวละ 3)

คว้าตัวแล้วทุ่มลงพื้น · **ต้องมีท่า "คว้าไม่โดน" ด้วย** ไม่งั้นพลาดแล้วดูเหมือนจับติด

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is grabbing an invisible opponent — do NOT draw the opponent, draw only
this character and his hands shaped around empty space. No effects.

Pose 1 — lunging forward low with both arms thrown wide open, fingers
spread, head down, mouth open in a grin — reaching to grab.
Pose 2 — hands closed shut on something at chest height in front of him,
arms bent, body braced, weight dropping back.
Pose 3 — hauling it up and over: arms swung up above his head, body arched
back, both feet planted wide, straining.
Pose 4 — slamming it straight down in front of his feet, both arms driven
down, body folded over, one knee dropping.
Pose 5 — standing back up out of the slam, hands open and empty, head
tilted, smiling.
Pose 6 — THE MISS: arms still flung wide open and empty, over-committed and
off balance, stumbling a step forward, head down, wide-eyed.
```

---

## ชีต F — สกิล 2 · Big Top สอยลงเต็นท์ (6 ท่า · 2 แถวแถวละ 3)

เอื้อมคว้าคนที่ลอยอยู่ลงมาฟาดพื้น

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is snatching an invisible opponent out of the air — do NOT draw the
opponent, draw only this character. No effects.

Pose 1 — crouching and looking straight up, both arms cocked back low,
knees deeply bent, ready to spring.
Pose 2 — exploding upward: both arms punched straight up overhead, fingers
spread wide, body fully extended, back heel lifted, head tipped back.
Pose 3 — hands closed shut on something high above his head, arms straight
up, body stretched, grinning up at it.
Pose 4 — hauling it down: arms dragged down in front of his chest, body
folding forward, knees bending under the weight.
Pose 5 — smashing it into the ground at his feet, both arms driven straight
down, dropped into a deep crouch, head down.
Pose 6 — rising out of it, hands open and empty, one arm out to the side,
head tilted, smiling.
```

---

## ชีต G — สกิล 3 อัลติ · Last Laugh หัวเราะทีหลัง (6 ท่า · 2 แถวแถวละ 3)

คว้าตัวยัดใส่กล่อง ปิดฝา นั่งทับ แล้วกล่องระเบิด
**กล่องวาดได้** เพราะเป็นของที่เขาหยิบออกมาเอง ไม่ใช่ VFX

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is stuffing an invisible opponent into a large wooden toy chest — draw the
chest, but do NOT draw the opponent. Draw NO explosion, NO smoke, NO
confetti, NO sparks — the game draws all effects.

Pose 1 — hauling a big battered wooden toy chest up from behind him and
dropping it upright on the ground beside him, lid flung open, grinning.
Pose 2 — lunging forward with both arms wide open, fingers spread, reaching
to grab something, the open chest sitting beside him.
Pose 3 — cramming something down into the open chest with both hands,
leaning his whole weight onto it, head down, teeth bared.
Pose 4 — slamming the lid shut with both palms flat on top, body pressed
down over it, looking down at the chest.
Pose 5 — sitting on the closed chest with his legs crossed and his arms
folded, head tilted back, laughing openly.
Pose 6 — leaping clear off the chest to the side, arms flung wide in the
air, body turned away from it, still laughing.
```

---

## ข้อกำชับที่ใช้กับทุกชีต

1. **ขนาดตัวเท่ากันทุกท่า** ระยะกล้องเดียวกัน — ข้อที่พังบ่อยที่สุด
2. **หันขวาทุกท่า** เกมพลิกภาพเอง
3. **พื้นขาวล้วน ไม่มีเงา ไม่มีเส้นพื้น ไม่มีตัวหนังสือ ไม่มีแถบหัวเรื่อง**
   (ภาพ turnaround ที่ส่งมามีแถบดำกับคำว่า FRONT/LEFT/RIGHT/BACK — ห้ามมี)
4. **เต็มตัว ไม่ครอป** เห็นตั้งแต่ปลายผมถึงพื้นรองเท้า
5. **หนึ่งท่าหนึ่งตัว** ห้ามเจนเป็น turnaround หลายมุมในช่องเดียว
6. **ห้ามวาดเอฟเฟค** ไม่มีเส้นความเร็ว ไม่มีระเบิด ไม่มีควัน ไม่มีคอนเฟตตี
   ไม่มีลูกโป่ง — VFX เกมวาดเอง (ลูกโป่งเป็นสถานะที่เกมวาดบนตัวคู่ต่อสู้)
7. **ระบายกับริบบิ้นตกใกล้ตัว** ไม่สะบัดยาวออกด้านข้าง (เหตุผลเดียวกับแส้ Alecto)
8. **ห้ามวาดคู่ต่อสู้** ในชีตท่าจับ วาดแต่มือที่กำรอบที่ว่าง

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · blockstun · blockcrouch | ชีต A |
| ตีปกติ | jab1 · jab2 · jab3 | ชีต B |
| พิเศษพื้น | side (พุ่งสะบัดแขน) · up (เสยขึ้น) · down (กวาดต่ำ) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | จับพื้น (+ ท่าคว้าไม่โดน) | ชีต E |
| สกิล 2 | จับอากาศ | ชีต F |
| สกิล 3 | หัวเราะทีหลัง (อัลติ) | ชีต G |
