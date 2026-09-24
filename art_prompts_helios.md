# HELIOS — ตัวละครที่ 2 (สายไฟต์เตอร์ รัวหมัด-เตะ · ชุดสกิล D)

**ชื่อยังไม่ล็อก** — HELIOS (ดวงอาทิตย์ที่ไม่เคยหยุดเดิน) คู่ตรงข้าม Nyx (ราตรี)
สำรอง: ATLAS (เหมาะกับตัวถึงยืนรับมากกว่า) / KAIROS

---

## ✅ ด่านแรกผ่านแล้ว

ท่ายืนที่อนุมัติแล้วอยู่ที่ **`art_reference/helios_idle_APPROVED.jpg`**
**แนบไฟล์นี้เป็น image reference ของทุกชีตต่อจากนี้** สไตล์จะได้ไม่ไหลระหว่างชีต

| | ตัวสูง | หัวกว้าง | อัตราส่วน |
|---|---|---|---|
| Nyx | 628 | 237 | 2.65 |
| **Helios (ผ่าน)** | 674 | 245 | **2.75** |
| ที่เคยไม่ผ่าน 2 รอบ | 753 | 207 | 3.64 |

เกณฑ์คือ 2.50-2.80 · ชุดที่ไม่ผ่านห่างจาก Nyx 37% ชุดที่ผ่านห่าง 4%

ตัวละครนี้ต้องใช้ ~59 ท่า การตั้งด่านนี้ก่อนคือสิ่งที่กันไม่ให้ต้องวาดใหม่ทั้งชุด

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, large head roughly one third of the total height, short limbs, bold dark outlines, flat cel shading with subtle texture, muted desaturated palette — match the attached reference proportions exactly. Character: a young man with spiky black hair and thin-rimmed glasses, fitted black short-sleeved t-shirt over a muscular build, loose light grey martial-arts trousers, a black cloth belt tied at the waist with two short ends hanging, plain black flat cloth shoes. Bare hands, no weapons. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props. Full body visible from the top of the hair to the soles of both shoes — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

# ลำดับการเจน

## 0. ท่ายืน — ✅ เสร็จแล้ว (`art_reference/helios_idle_APPROVED.jpg`)

เก็บ prompt ไว้เผื่อต้องเจนซ่อม · **แนบ 2 อัน:** เฟรม `idle` ของ Nyx + ภาพตัวละครที่มีอยู่

```
A single standing fighting-stance sprite of a new character, drawn in the
exact art style and exact body proportions of the FIRST attached reference
image (the small ninja): chibi proportions with a large head roughly one
third of the total height, short limbs.

Take ONLY the character design from the SECOND attached image, not its
proportions: a young man with spiky black hair, thin-rimmed glasses, a
fitted black short-sleeved t-shirt over a muscular build, loose light grey
martial-arts trousers, a black cloth belt tied at the waist with two short
ends hanging down, plain black flat cloth shoes. Serious, focused
expression.

Standing in a boxer's guard: both fists raised, one forward one near the
chin, knees slightly bent, feet apart. Three-quarter view, body angled
toward the viewer's right.
```

## 1. คลิป: ยืน → วิ่ง  — ✅ เสร็จแล้ว

**แนบ `art_reference/helios_idle_APPROVED.jpg`**

ท่าวิ่งของ Nyx ที่ขาสลับซ้าย-ขวาจริงได้มาจาก**คลิป** ไม่ใช่ภาพนิ่งทีละท่า

```
Animate this exact character: starts in the fighting stance, holds it
briefly, then runs forward to the right in a full run cycle with legs
alternating clearly, at least three full strides. Same art style, same
proportions, same camera distance throughout. Pure white background, no
shadow, no ground line. Full body always visible, never cropped.
```

ส่งคลิปมา เดี๋ยวตัดเฟรมให้

## 2. ชีต A — ✅ เสร็จแล้ว · ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.

Pose 1 — crouching down low, knees deeply bent, fists still up in guard.
Pose 2 — pushing off the ground at the start of a jump, body stretching
upward, arms swinging up.
Pose 3 — airborne at the top of a jump, knees tucked up, fists near chest.
Pose 4 — falling, legs reaching down, arms out slightly for balance.
Pose 5 — landing in a deep crouch, both feet planted, one hand near the floor.
Pose 6 — struck and recoiling, head snapped back, torso twisted away, arms
flung loose.
Pose 7 — knocked down, lying on his back on the ground, limbs sprawled.
Pose 8 — rolling sideways along the ground, body curled.
Pose 9 — standing guard with both forearms raised and crossed in front of
the face, bracing to block.
```

## 3. ชีต B — ✅ เสร็จแล้ว · คอมโบหมัดพื้นฐาน (9 ท่า · 3 แถวแถวละ 3)

3 ท่าต่อหนึ่งหมัด: เงื้อ → สุดแขน → ชักกลับ

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a three-punch combo, three poses per punch.

Pose 1 — left fist pulled back beside the chin, weight loaded back.
Pose 2 — left jab fully extended straight forward at head height.
Pose 3 — left arm pulling back, weight shifting forward.
Pose 4 — right fist cocked at the hip, torso twisted back.
Pose 5 — right cross fully extended, hips rotated fully into the punch.
Pose 6 — right arm retracting, shoulders squaring up again.
Pose 7 — both fists low, knees bent, coiling for a big finishing blow.
Pose 8 — a heavy overhand right fully extended and slightly downward,
whole body committed, back foot lifted.
Pose 9 — recovering from the finisher, arms lowering, feet resettling.
```

## 4. ชีต C — ✅ เสร็จแล้ว · ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.

Pose 1 — stepping forward, right shoulder dropping, winding up.
Pose 2 — a lunging straight punch reaching far forward, front leg deep in
a long stride.
Pose 3 — recovering from the lunge, pulling the fist back.
Pose 4 — crouched low, coiled, fist near the floor.
Pose 5 — a rising uppercut, fist punching straight up past his own head,
body fully extended upward, back heel lifted.
Pose 6 — landing back down from the uppercut, knees absorbing.
Pose 7 — dropping into a low crouch, one hand on the ground.
Pose 8 — a low sweeping kick, one leg extended straight along the ground,
supporting hand pressed to the floor.
Pose 9 — pulling the sweeping leg back in, rising from the crouch.
```

## 5. ชีต D — ✅ เสร็จแล้ว · ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Every pose is airborne — both feet off the ground, no ground contact.

Pose 1 — airborne, knees tucked, arms drawn in close.
Pose 2 — airborne spinning kick, one leg swung out horizontally to the
side, arms wide for balance.
Pose 3 — airborne, leg pulling back in from the spin.
Pose 4 — airborne, leaning forward, knee drawn up to the chest.
Pose 5 — airborne flying kick, leading leg driven straight forward,
trailing leg tucked behind, body angled forward.
Pose 6 — airborne, recovering from the flying kick, legs gathering.
Pose 7 — airborne, both knees raised high, fists up above the head.
Pose 8 — airborne axe kick driving straight down, one leg swung down hard
below the body, arms up for balance.
Pose 9 — airborne, legs together underneath, body upright, ready to land.
```

## 6. ชีต E — ✅ เสร็จแล้ว · Chain Rush ชุดรัว (6 ท่า · 2 แถวแถวละ 3)

หมัด → หมัด → เตะ → หมัด → เตะ + ท่าตั้งต้น

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is one continuous rapid flurry, each pose moving slightly further
forward than the last.

Pose 1 — a short quick left jab extended, body compact, weight forward.
Pose 2 — a right straight extended, torso rotated, front foot stepping in.
Pose 3 — a low roundhouse kick, right leg swung forward at thigh height,
arms tight to the body.
Pose 4 — a left hook swinging across at head height, shoulders turned hard.
Pose 5 — a high roundhouse kick, right leg swung up at head height, body
leaning back for balance.
Pose 6 — landing the kicking foot down, fists coming back up into guard,
still leaning forward and pressing in.
```

## 7. ชีต F —  ← ทำต่อจากนี้ ·  ไม้จบสามทาง + เข่าพุ่ง (9 ท่า · 3 แถวแถวละ 3)

ไม้จบของชุดรัวแยกสามทางตามปุ่มทิศที่กดค้าง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.

Pose 1 — winding up, right fist drawn far back, weight loaded on the back leg.
Pose 2 — an enormous straight right punch fully extended, whole body behind
it, back foot lifted off the ground.
Pose 3 — recovering from the big punch, arm dropping, feet resettling.
Pose 4 — crouching, coiling the back leg underneath, arms tucked.
Pose 5 — a rising kick, back leg whipped straight up past his own head in
an upward arc, body arched back.
Pose 6 — coming down from the rising kick, landing on both feet.
Pose 7 — dropping low with one hand planted on the ground.
Pose 8 — a low spinning sweep kick, leg fully extended along the floor,
body rotated over the planted hand.
Pose 9 — driving forward with one knee raised hard to chest height, both
fists pulled down beside the knee, body lunging ahead.
```

## 8. ชีต G — Hundred Hands ร้อยหมัด (อัลติ · 6 ท่า · 2 แถวแถวละ 3)

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.

Pose 1 — settling into a wide, low, braced stance, both fists raised,
shoulders hunched, about to unload.
Pose 2 — mid-flurry, left fist fully extended forward, right fist already
pulled back, body compact and square.
Pose 3 — mid-flurry, right fist fully extended forward, left pulled back,
mirrored from the previous pose.
Pose 4 — mid-flurry knee strike, one knee driven up to chest height while
both fists stay raised.
Pose 5 — winding up the finisher, whole body torqued back, right fist
drawn far behind the hip.
Pose 6 — the finishing straight punch fully extended, maximum reach, body
stretched out completely behind it, back foot off the ground.
```

---

## ข้อกำชับที่ใช้กับทุกชีต

1. **ขนาดตัวเท่ากันทุกท่า** ระยะกล้องเดียวกัน — ข้อที่พังบ่อยที่สุด
2. **หันขวาทุกท่า** เกมพลิกภาพเอง
3. **พื้นขาวล้วน ไม่มีเงา ไม่มีเส้นพื้น**
4. **เต็มตัว ไม่ครอป** เห็นตั้งแต่ปลายผมถึงพื้นรองเท้า
5. **ห้ามวาดเส้นความเร็ว/เส้นหมัด** — VFX เกมวาดเอง (บทเรียนจากชีต Stone Curse)

## วัดสเกลตัวนี้

ตัวนี้ไม่ใส่หน้ากากและผมไม่คลุมหน้า → วัดได้ทั้งสองทางตามปกติ
`python3 tools/measure_sheet_scale.py <ไฟล์>` ต่างกันเกิน 15% = มีทางโดนบัง
แล้ว build วัดความสูงเฟรมจริงเทียบท่ายืนเสมอ — ท่าตั้งหลัก 96-100%
