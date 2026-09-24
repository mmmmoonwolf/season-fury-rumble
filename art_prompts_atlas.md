# ATLAS — The Fury of the Unbroken (ตัวละครที่ 4 · สายแท้งค์)

เสือขาวร่างมนุษย์ ถือดาบใหญ่ติดไฟ · กลไกหลักคือ **เกราะทน** (โดนตีแล้วไม่หลุดท่า)
ผังสกิลเต็มอยู่ที่ `docs/ATLAS_KIT.md`

---

## ⚠️ สามเรื่องที่ต้องรู้ก่อนเจน — แต่ละตัวมีปัญหาของตัวเอง ตัวนี้ก็มี

### 1. เครื่องวัดสเกลอัตโนมัติใช้กับตัวนี้ไม่ได้เลย (แต่ด่านเดิมใช้ได้)

`tools/measure_sheet_scale.py` มีสองไม้บรรทัด **พังทั้งคู่**กับตัวนี้ คนละเหตุผลกับ Alecto:

| ไม้บรรทัด | วิธีวัด | ทำไมพังกับ Atlas |
|---|---|---|
| `face_sqrt` | หาพื้นที่**โทนสีผิวคน**ในช่วงหัว | หน้าเป็นขนเสือขาว ไม่มีโทนสีผิวให้จับ |
| `hair_sqrt` | หาพื้นที่**สีเกือบดำ**ในช่วงหัว | ไม่มีผม มีแต่ลายเสือสีน้ำตาลซึ่งไม่เข้มพอ |

**แต่ข่าวดีคือ ตัวนี้ไม่ใส่หมวก** — กะโหลกไม่ถูกบังเลย จึงกลับไปใช้
**ไม้บรรทัดดั้งเดิม (ตัวสูง ÷ หัวกว้าง)** ได้ตรง ๆ เหมือน Nyx กับ Helios
เกณฑ์ผ่านคือ **2.50–2.80** ส่งภาพมาเดี๋ยวผมวัดให้

### 2. ทำให้ "ตัวหนา" ไม่ใช่ "ตัวสูง"

อันนี้สำคัญที่สุดสำหรับแท้งค์ และผิดกันบ่อย

เครื่องมือประกอบจะ**ย่อทุกตัวให้สูงเท่ากันบนเวที** ถ้าเจนมาตัวสูงกว่าเพื่อน
มันจะถูกย่อลงจนสุดท้ายตัวเท่ากันหมด **ความเป็นแท้งค์หายเกลี้ยง**

ความใหญ่ต้องมาจาก **ความกว้าง** — ไหล่กว้าง อกหนา แขนใหญ่ ขาหนา คอสั้น
ตัวควรกว้างกว่า Helios ราว 1.4–1.6 เท่าที่ความสูงเท่ากัน

> ย้ำในทุก prompt: *"heavy and wide — broad shoulders, thick chest and limbs,
> short neck. He is not taller than the other fighters, he is much wider."*

### 3. หางกับเปลวไฟจะทำให้กรอบเฟรมบวม

ปัญหาเดียวกับแส้ของ Alecto: ของที่ยื่นยาวออกไปทางเดียวจะลากจุดยึดให้เพี้ยน
ตัวละครจะกระตุกไปมาระหว่างเฟรม (วัดได้ว่าท่าที่แย่สุดเพี้ยน 55 px)

**กำชับทุก prompt:** หางต้องโค้งอยู่ใกล้ตัว ไม่สะบัดยาวออกไป
และ **เปลวไฟเกาะอยู่ที่ใบดาบเท่านั้น** ไม่ใช่กลุ่มไฟใหญ่ลอยฟุ้ง
(ภาพต้นฉบับที่ส่งมาไฟใหญ่เกินไปสำหรับใช้ในเกม — เอาแค่ไฟเลียใบดาบพอ)

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, large head roughly one third of the total height, short limbs, bold dark outlines, flat cel shading with subtle texture, muted desaturated palette — match the attached reference proportions exactly. Character: a hulking white tiger beastman, white fur with soft brown stripes, amber eyes, heavy and wide — broad shoulders, thick chest, thick arms and legs, short neck. He is not taller than the other fighters, he is much wider. He wears brown leather harness straps across the chest, a leather waist guard with hanging plates, leather bracers and simple boots, bare arms. He carries a large single-edged greatsword whose blade is wrapped in fire — the flame clings tightly to the blade, no large floating fireball, no smoke. His striped tail curves close to his body and never trails far away. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props. Full body visible from the top of the ears to the soles of both boots — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

# ลำดับการเจน

## ขั้น 0 — ท่ายืน (ด่านกั้น ต้องผ่านก่อนเจนอย่างอื่น)

**อย่าเจนชีตอื่นจนกว่าท่ายืนจะผ่าน** ตัวนี้ต้องใช้ ~59 ท่า หลุดตั้งแต่แรกคือวาดใหม่ทั้งชุด
(Helios เคยไม่ผ่านสองรอบก่อนจะได้)

**แนบ 2 ภาพ:** เฟรม `idle` ของ Nyx + ภาพเสือขาวถือดาบไฟที่คุณเจนไว้แล้ว

```
A single standing fighting-stance sprite of a new character, drawn in the
exact art style and exact body proportions of the FIRST attached reference
image (the small ninja): chibi proportions with a large head roughly one
third of the total height, short limbs.

Take ONLY the character design from the SECOND attached image, not its
proportions: a white tiger beastman with soft brown stripes and amber eyes,
brown leather harness straps across a bare muscular chest, a leather waist
guard with hanging plates, leather bracers, simple boots, and a large
single-edged greatsword with fire clinging to the blade.

Make him HEAVY AND WIDE: broad shoulders, thick chest, thick arms and legs,
short neck. He must NOT be taller than the ninja in the first image — he
should be roughly the same height but much wider and bulkier.

Standing braced for a fight: feet planted wide, knees bent, the flaming
greatsword held low across his body in both hands, shoulders forward, head
lowered slightly, eyes up. The tail curves close behind his legs. The flame
hugs the blade closely — no large fireball, no smoke.
```

**เกณฑ์ผ่าน — อัตราส่วน ตัวสูง ÷ หัวกว้าง ต้องอยู่ 2.50–2.80**

| | ตัวสูง | หัวกว้าง | อัตราส่วน |
|---|---|---|---|
| Nyx | 628 | 237 | 2.65 |
| Helios | 674 | 245 | 2.75 |
| Alecto | — | — | 2.65 (วัดโดยไม่นับหมวก) |
| Atlas | ? | ? | ต้องได้ 2.50–2.80 **และกว้างกว่าเพื่อน 1.4-1.6 เท่า** |

ส่งภาพมา เดี๋ยวผมวัดทั้งอัตราส่วนและความกว้างเทียบกับสามตัวเดิมให้

พอผ่านแล้วเซฟเป็น `art_reference/atlas_idle_APPROVED.jpg`
แล้ว**แนบไฟล์นี้กับทุกชีตต่อจากนี้** สไตล์จะได้ไม่ไหลระหว่างชีต

---

## ขั้น 1 — คลิป ยืน → วิ่ง

ท่าวิ่งที่ขาสลับซ้าย-ขวาจริงได้จาก**คลิป** ไม่ใช่ภาพนิ่งทีละท่า (สามตัวก่อนทำแบบนี้หมด)

```
Animate this exact character: starts in the braced stance, holds it briefly,
then runs forward to the right in a heavy lumbering run cycle with legs
alternating clearly, at least three full strides. He is heavy — the run is
powerful and grounded, not light or bouncy. The greatsword stays gripped in
one hand at his side, the tail stays close to his body. Same art style, same
proportions, same camera distance throughout. Pure white background, no
shadow, no ground line. Full body always visible, never cropped.
```

ส่งคลิปมา เดี๋ยวตัดเฟรมให้

---

## ชีต A — ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
The greatsword stays in his hand in every pose, flame clinging to the blade.
The tail curves close to his body, never stretching far.

Pose 1 — crouching down low, knees deeply bent, sword braced across his knees.
Pose 2 — pushing off the ground at the start of a jump, body stretching
upward, sword swung out for momentum.
Pose 3 — airborne at the top of a jump, knees tucked, sword held close.
Pose 4 — falling, legs reaching down, sword arm out for balance.
Pose 5 — landing in a heavy crouch, both boots planted, free hand on the floor.
Pose 6 — struck and recoiling, head snapped back, torso twisted away, but
feet still planted — he is staggered, not thrown.
Pose 7 — knocked down, lying on his back on the ground, limbs sprawled,
sword fallen beside him.
Pose 8 — rolling sideways along the ground, body curled around the sword.
Pose 9 — bracing to block: sword held upright in both hands in front of his
face and chest like a wall, shoulders hunched behind it.
```

---

## ชีต B — ชุดฟันดาบพื้นฐาน (9 ท่า · 3 แถวแถวละ 3)

3 ท่าต่อหนึ่งฟัน: เงื้อ → สุดวง → ชักกลับ · นี่คือ**ท่าตีปกติ** ฟันช้า วงกว้าง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a three-swing greatsword combo, three poses per swing. Every swing
is heavy and committed — his whole body turns into it. No motion lines, no
slash arcs, no sparks — only the flame on the blade itself.

Pose 1 — sword drawn back over one shoulder, body coiled, front foot planted.
Pose 2 — a wide horizontal slash fully extended across his body at chest height.
Pose 3 — recovering from the slash, sword swung through and low, shoulders open.
Pose 4 — sword pulled back to the other side, torso wound the opposite way.
Pose 5 — a wide backhand slash fully extended the other direction.
Pose 6 — sword coming to rest, weight settling onto the front foot.
Pose 7 — sword raised high overhead in both hands, body fully stretched up.
Pose 8 — a heavy overhead chop driven straight down in front of him, whole
body committed, back boot lifted off the ground.
Pose 9 — recovering from the chop, sword low, knees bent, shoulders heaving.
```

---

## ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no slash arcs — only the flame on the blade.

Pose 1 — stepping forward, shoulder dropped, sword drawn far back behind him.
Pose 2 — a long lunging thrust, the flaming blade driven straight forward,
front leg deep in a long stride.
Pose 3 — recovering from the lunge, pulling the sword back in.
Pose 4 — crouched low, sword held near the ground, coiled to swing upward.
Pose 5 — a rising upward slash, the sword swung straight up past his own head,
body fully extended upward, back heel lifted.
Pose 6 — coming down from the rising slash, knees absorbing the landing.
Pose 7 — dropping into a low crouch, one hand planted on the ground.
Pose 8 — a low sweeping slash along the floor, sword extended flat and level
with the ground, body rotated over the planted hand.
Pose 9 — rising out of the crouch, dragging the sword back up.
```

---

## ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Every pose is airborne — both boots off the ground, no ground contact.

Pose 1 — airborne, knees tucked, sword held close across his chest.
Pose 2 — airborne spinning slash, sword swung out horizontally to the side,
free arm wide for balance, tail curled in.
Pose 3 — airborne, sword pulling back in from the spin.
Pose 4 — airborne, leaning forward, sword drawn back past his hip.
Pose 5 — airborne forward thrust, the flaming blade driven straight ahead,
trailing leg tucked, body angled forward.
Pose 6 — airborne, recovering from the thrust, legs gathering.
Pose 7 — airborne, sword raised high above his head in both hands, knees up.
Pose 8 — airborne downward chop, sword driven straight down beneath him,
body folded over it.
Pose 9 — airborne, legs together underneath, sword gathered, ready to land.
```

---

## ชีต E — สกิล 1 · พุ่งชน (6 ท่า · 2 แถวแถวละ 3)

ถลาไปข้างหน้าพร้อมเกราะ ทะลุกระสุนได้

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no dust, no impact effects — the game draws those.

Pose 1 — dropping low and loading the back leg, shoulder dropped forward,
sword swept back behind him, head down.
Pose 2 — driving forward shoulder-first, body low and level like a charging
animal, front boot slamming down, sword trailing behind.
Pose 3 — still charging forward, the other boot driving through, body even
lower, head tucked behind the leading shoulder.
Pose 4 — the impact: shoulder rammed forward at full extension, body
stretched out behind it, back boot lifted.
Pose 5 — swinging the sword up and around out of the charge, body rising.
Pose 6 — the follow-up slash, sword brought down hard in front of him,
feet resettling wide.
```

---

## ชีต F — สกิล 2 · กระโจน (6 ท่า · 2 แถวแถวละ 3)

ถีบพื้นพุ่งเป็นเส้นโค้ง ลงมาฟันจากบนหัว

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no dust — the game draws those.

Pose 1 — crouched all the way down on all fours like a big cat about to
pounce, one hand on the ground, sword gripped in the other, haunches loaded.
Pose 2 — launching upward and forward, body stretched out in a long diagonal
line, both legs extended behind, sword trailing.
Pose 3 — airborne at the peak, body curling, knees drawing up, sword swinging
up overhead into both hands.
Pose 4 — airborne and falling, sword raised high above his head in both
hands, body coiled over it, looking down at the target.
Pose 5 — the landing strike: sword driven down from overhead into the ground
in front of him, both boots slamming down, body folded over the blow.
Pose 6 — rising out of the landing, dragging the sword up, knees still bent.
```

---

## ชีต G — สกิล 3 อัลติ · ฟ้าถล่ม (6 ท่า · 2 แถวแถวละ 3)

กระโดดขึ้นปักดาบลงพื้น แรงกระแทกแผ่ออกสองข้าง · **ตอนเงื้อติดเกราะเต็ม**

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Draw NO shockwave, NO ground cracks, NO explosion, NO smoke — the game draws
all of that. Only the character and the flame on his blade.

Pose 1 — planting both feet wide and raising the sword slowly overhead in
both hands, head tilted back, chest open, roaring.
Pose 2 — fully wound up: sword held straight up at maximum height in both
hands, body arched back, every muscle tensed, tail rigid.
Pose 3 — leaping straight upward, knees drawn up, sword still held overhead.
Pose 4 — at the top, body folding forward over the sword, blade turning
point-down beneath him.
Pose 5 — driving the blade straight down into the ground between his feet,
landing in a deep crouch, both hands on the hilt, head down.
Pose 6 — holding the finish: crouched low with the sword buried point-first
in the ground, both hands on the hilt, head raised, looking forward.
```

---

## ข้อกำชับที่ใช้กับทุกชีต

1. **ขนาดตัวเท่ากันทุกท่า** ระยะกล้องเดียวกัน — ข้อที่พังบ่อยที่สุด
2. **หันขวาทุกท่า** เกมพลิกภาพเอง
3. **พื้นขาวล้วน ไม่มีเงา ไม่มีเส้นพื้น** (ลายตารางก็ไม่เอา — ชีต B ของ Alecto
   เจนมาพื้นลายตารางแล้วต้องเขียนโค้ดถอดออกเพิ่ม)
4. **เต็มตัว ไม่ครอป** เห็นตั้งแต่ปลายหูถึงพื้นรองเท้า
5. **ห้ามวาดเอฟเฟค** ไม่มีเส้นความเร็ว ไม่มีวงฟัน ไม่มีคลื่นกระแทก ไม่มีควัน
   — VFX เกมวาดเอง (บทเรียนจากชีต Stone Curse)
6. **ไฟเกาะใบดาบเท่านั้น** ไม่ใช่กลุ่มไฟใหญ่ลอยฟุ้ง
7. **หางโค้งอยู่ใกล้ตัว** ไม่สะบัดยาวออกไป (เหตุผลเดียวกับแส้ของ Alecto)
8. **หนาไม่ใช่สูง** — ความใหญ่มาจากความกว้าง ไม่ใช่ความสูง

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · blockstun · blockcrouch | ชีต A |
| ตีปกติ | jab1 · jab2 · jab3 (ท่าละ 3 เฟรม) | ชีต B |
| พิเศษพื้น | side (พุ่งแทง) · up (สอยขึ้น) · down (กวาดต่ำ) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | พุ่งชน | ชีต E |
| สกิล 2 | กระโจน | ชีต F |
| สกิล 3 | ฟ้าถล่ม (อัลติ) | ชีต G |
