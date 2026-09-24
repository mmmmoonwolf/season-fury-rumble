# MOMUS — prompt อาร์ตครบทุกท่า

**The Fury of the Last Laugh** · สายป่วนสนาม · ตัวตลกผมส้มหยิกในชุดขาดวิ่น

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

## ชีต A — ท่าเคลื่อนไหวและท่าโดน (12 ท่า · 4 แถวแถวละ 3)

12 ท่าไม่ใช่ 9 — สี่ตัวที่ทำไปแล้วขาด **ท่าบล็อกตอนนั่ง** ทุกตัว
(ตอนนี้ใช้ท่านั่งธรรมดาแทนอยู่ ผู้เล่นสังเกตเห็นแล้ว) ตัวนี้ขอมาตั้งแต่แรกเลย

```
A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
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
Pose 9 — bracing to block standing: both forearms crossed in front of his
face and chest, shoulders hunched behind them, head tucked down.
Pose 10 — bracing to block CROUCHED: knees deeply bent in a low crouch AND
both forearms crossed in front of his face and chest at the same time,
head tucked down behind them, sitting low.
Pose 11 — taking a hit through the guard: forearms still crossed up but
shoved back, body pushed off balance, one boot sliding back, wincing.
Pose 12 — getting back up off the floor, one knee up and one hand pushing
off the ground, head coming up, the smile returning.
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

## ชีต E — สกิล 1 · Jack-in-the-Box วางกล่องระเบิด (6 ท่า · 2 แถวแถวละ 3)

วางกล่องระเบิดเวลาทิ้งไว้บนพื้น ใครเหยียบหรือครบ 5 วิก็ระเบิด **รวมทั้งตัวเขาเอง**
**กล่องวาดได้** เพราะเป็นของที่เขาหยิบออกมาเอง ไม่ใช่ VFX

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is setting down a small jack-in-the-box toy: a little square wooden crate
with a crank handle on the side and a closed lid. Draw the box, draw NO
spring, NO puppet popping out, NO effects, NO sparkles — the game draws all
of that. The box is closed in every pose.

Pose 1 — reaching behind his back with one hand, other hand out for balance,
head turned to look at the ground in front of him, grinning.
Pose 2 — pulling the little crate out from behind him and holding it up at
chest height in both hands, looking down at it fondly.
Pose 3 — crouching down and setting the crate on the ground in front of his
feet with both hands, head low, tongue out in concentration.
Pose 4 — still crouched, turning the crank handle on the side of the crate
with one finger, the other hand flat on the lid, grinning wide.
Pose 5 — springing back up and away from the crate with both arms thrown
wide, body leaning back, the crate left sitting on the ground at his feet.
Pose 6 — standing clear and well back from it with both hands raised beside
his head, palms out, head tilted, wearing an exaggerated innocent look — as
if to say "not me" — while glancing sideways at the crate.
```

---

## ชีต F — สกิล 2 · Ta-da! สลับที่ (6 ท่า · 2 แถวแถวละ 3)

โค้งคำนับแล้วสลับที่กับคนที่ใกล้ที่สุด **ระเบิดขึ้นทั้งจุดที่ไปและจุดที่มา**

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a stage magician's flourish. Draw NO smoke, NO puff, NO sparkles,
NO magic glow, NO cards, NO props — the game draws all effects. Only the
character and his hands.

Pose 1 — snapping into a theatrical stage bow: one arm swept across his
stomach, the other flung out to the side, upper body folded forward, head
still turned up and forward so his grin is visible.
Pose 2 — straightening up fast with both arms swinging wide and open,
palms forward, chest out, head thrown back.
Pose 3 — snapping the fingers of one raised hand up beside his head, other
hand on his hip, head tilted, eyes narrowed, smiling.
Pose 4 — spinning: body turned mid-rotation with arms wrapped across his
chest, coat frills flaring out around him, head down.
Pose 5 — coming out of the spin with both arms flung straight out to the
sides at shoulder height, palms up, head tipped back, mouth open — "ta-da".
Pose 6 — settling, arms dropping back down loose at his sides, weight on
one leg, head tilted, smiling faintly at the viewer.
```

---

## ชีต G — สกิล 3 อัลติ · **เลือกหนึ่งแบบก่อนเจน**

อัลติยังไม่ล็อก มีสองแบบให้เลือก (ดู `docs/MOMUS_KIT.md` หัวข้อ "สามทางเลือกของอัลติ")
**เจนแค่แบบเดียว** ที่ตัดสินใจแล้ว

### G-A · Last Laugh ยัดกล่อง (ของเดิม · ดาเมจเดี่ยวสูงสุด)

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

### G-B · Full House โปรยกล่องทั้งเวที (แนะนำ · เล่นหลายคนแล้วแรงที่สุด)

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
He is hurling a whole armful of small jack-in-the-box crates up into the air.
Draw the crates he is holding and throwing, but draw NO explosion, NO smoke,
NO confetti, NO sparks, NO springs, NO puppets — the game draws all effects.
The crates are small closed wooden boxes with crank handles.

Pose 1 — dragging a huge sack up off the ground with both hands, bent over
under its weight, grinning up at the viewer.
Pose 2 — swinging the open sack up and back over one shoulder, body coiled
and twisted away, crates already spilling loose from the mouth of it.
Pose 3 — hurling the whole armful of crates up and forward with both arms
fully extended overhead, body arched back, head thrown back, mouth wide open.
Pose 4 — arms still up and empty, hands spread, watching them go, spinning
slowly on one heel with the other leg lifted.
Pose 5 — dropping into a low crouch with both arms wrapped over his head and
both eyes squeezed shut, bracing for what he just did.
Pose 6 — peeking out from under one arm, still crouched, one eye open,
grinning sideways at the viewer.
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
8. **ห้ามวาดคู่ต่อสู้** ในชีตอัลติ วาดแต่มือที่กำรอบที่ว่าง
9. **กล่องวาดได้** (ชีต E และ G) เพราะเป็นของที่เขาหยิบออกมาเอง แต่สปริง ตุ๊กตา
   ควัน ประกาย ระเบิด **ห้ามวาด** เกมวาดเอง

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · **blockcrouch** · blockstun | ชีต A (12 ท่า) |
| ตีปกติ | jab1 · jab2 · jab3 | ชีต B |
| พิเศษพื้น | side (พุ่งสะบัดแขน) · up (เสยขึ้น) · down (กวาดต่ำ) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | วางกล่องสปริง | ชีต E |
| สกิล 2 | สลับที่ | ชีต F |
| สกิล 3 | อัลติ (เลือก G-A หรือ G-B) | ชีต G |
