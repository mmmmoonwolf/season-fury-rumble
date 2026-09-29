# MARCH (Helios) — prompt ชีตทั้งชุด

> กลไกใหม่ (สกิล 2 Sky Drive) **เข้าเกมแล้วและเล่นได้จริง** ดู [`docs/HELIOS_KIT.md`](docs/HELIOS_KIT.md)
> ตอนนี้ยืมเฟรมเดิมอยู่ผ่าน `artAs` — ชีตชุดนี้คือของจริงที่จะมาแทนทั้งตัว
> เจนแล้ววางที่ `art_reference/helios_sheets/sheet_A.jpg` … `sheet_J.jpg`

> 📎 **แนบ `art_reference/helios_redesign_TURNAROUND.png` ไปกับทุก prompt**
> ภาพนั้นเป็น turnaround เต็มชุด (8 มุมตัว + 8 มุมหัว + สีหน้า 4 แบบ + ท่าตั้งการ์ด 5 ท่า)
> ซึ่งเป็นของอ้างอิงที่ดีที่สุดเท่าที่เคยได้มาในโปรเจกต์นี้ ทุกบล็อกเขียนว่า "the same character"
> ซึ่งแปลว่าไม่มีภาพอ้างอิง = ได้คนละคนทุกใบ

---

## ⚠️ ความเสี่ยงเฉพาะตัวนี้: กางเกงขาว

**ท่อนบนดำ ท่อนล่างขาว** ทำให้เงาของเขาอ่านออกง่ายที่สุดในโรสเตอร์ บอกได้ทันทีว่าหันทางไหน

**แต่พื้นของเวทีสว่างอยู่ราว 150-190 บนสเกล 0-255** ถ้ากางเกงสว่างกว่านั้น
**ครึ่งล่างของเขาจะจมหายไปกับพื้น** ซึ่งเป็นปัญหาที่ตัวตลกเคยเจอมาแล้วจนต้องเจนซ้ำ

anchor ในไฟล์นี้จึงสั่งว่า **ขาวหม่น/เทาอุ่นอ่อน พร้อมเงาในรอยพับลึก ๆ** ไม่ใช่ขาวสว่างแบน ๆ

> 📌 **ต้องวัดจริงตอนขั้น 0 ก่อนเจนอีก 9 ใบ** วิธีวัดเดียวกับที่ใช้กับ DEAR:
> ตัดพื้นขาวออก แล้ววัดความสว่างเฉลี่ยของ 40% ล่างของตัว **ถ้าเกิน ~140 ให้เจนใหม่**
> (เทียบ: DEAR วัดได้ 66-68 · Alecto 49 · Momus ตัวตลก 107 · Orpheus 114 · Helios เดิม 126)

---

## ⚠️ ความเสี่ยงข้อสอง: ปลายผ้าคาดเอว

ตัวตัดชีตทิ้ง "ก้อนที่ไม่ติดกับตัว" อยู่แล้ว **ปลายผ้าที่ปลิวหลุดออกไปจะโดนตัดทิ้ง**
หรือไม่ก็ถูกนับเป็นท่าหนึ่งท่า แล้วไม้บรรทัดวัดสเกลเพี้ยนทั้งใบ

anchor สั่งไว้แล้วว่าปลายผ้าต้องแนบขาเสมอ แต่ **เปิดดูทุกใบด้วยตาเสมอ** —
บทเรียนจาก DEAR: ตัวเลขจับได้แค่ของหลุด/ท่าติดกัน/ชนขอบ/สเกลเพี้ยน
**ส่วน "ของหายไปจากดีไซน์" ตัวเลขจับไม่ได้เลย ต้องเปิดดู**

---

## สถานะ (อัปเดตหลังวัดของจริง)

| ใบ | สถานะ | ท่า | ไม้บรรทัด (ปรับแล้ว) | กระจาย |
|---|---|---|---|---|
| ขั้น 0 | ✅ | — | — | ท่อนล่าง 112 |
| คลิปวิ่ง | ✅ | 11 | — | คาบ 39 เริ่ม f96 |
| A เคลื่อนไหว/โดน | ✅ | 15 | 33.7 | 23.0% |
| B แย็บ | ✅ | 15 | 111.8 | 5.6% |
| C ท่าพิเศษพื้น | ✅ | 9 | 32.6 | 12.7% |
| D ท่าอากาศ | ✅ | 9 | 32.4 | 10.7% |
| E Chain Rush | ✅ | 8 | 156.9 | 6.3% |
| **F Chain Rush ครึ่งหลัง** | ⬜ **ยังขาด** | | | |
| G ไม้จบสองทาง | ✅ | 6 | 161.8 | 7.0% |
| H SKY DRIVE ขาขึ้น | ✅ | 9 | 103.3 | 5.0% |
| I SKY DRIVE ตบลง | ✅ | 6 | 157.2 | 8.8% |
| **J อัลติ** | ⬜ **ยังขาด** | | | |

**ทุกใบสะอาด ไม่มีก้อนขยะเลยสักใบ** ปลายผ้าคาดแนบขาตามที่สั่งทุกใบ

### ✅ คำสั่ง "ต่อรอยต่อ" ได้ผลจริง — วัดแล้ว

สั่งไว้ว่าท่าสุดท้ายของใบ H ต้องเป็นท่าเดียวกับท่าแรกของใบ I วัดด้วย IoU หลังปรับขนาดเท่ากัน:

| คู่ | IoU |
|---|---|
| **H.9 ↔ I.1 (คู่ที่สั่งให้ตรงกัน)** | **0.789** |
| H.1 ↔ I.1 (คู่ที่ไม่เกี่ยวกัน — ฐานเทียบ) | 0.506 |
| H.5 ↔ I.4 (คู่ที่ไม่เกี่ยวกัน — ฐานเทียบ) | 0.599 |

สูงกว่าฐานอย่างชัดเจน = **รอยต่อเชื่อมกันจริง** ซึ่งคือกลไกที่ทำให้คอมโบดูลื่นโดยไม่ต้องเพิ่มเฟรม

### ⚠️ กล้องต่างกันระหว่างใบเยอะ (แต่ไม่เป็นไร)

ไม้บรรทัดหลังปรับขนาดภาพอยู่ระหว่าง **32.4 ถึง 161.8** ซึ่งต่างกันห้าเท่า
ใบที่ท่าน้อย (6-9 ท่า) ตัวละครถูกวาดใหญ่กว่าใบที่ท่าเยอะ (15 ท่า) มาก

**นี่คือสิ่งที่ไม้บรรทัดมีไว้แก้พอดี** และการกระจายในใบอยู่ที่ 5-12% (ยกเว้นใบ A ที่ 23%
เพราะมีท่านอน/ม้วนซึ่งพื้นที่ตัวต่างไปจริง ๆ) ค่ากลางจึงเชื่อถือได้ทุกใบ

มีใบ A อีกใบ (`sheet_A_alt.jpg` 12 ท่า) เก็บไว้เป็นตัวสำรอง — ใบหลักครบกว่า

### ✅ ไม้บรรทัดวัดกล้องของตัวนี้คือ `body_sqrt` ตัวเดิม

**ไม่ต้องเขียนไม้บรรทัดใหม่เหมือน DEAR** เพราะเขาไม่มีของติดตัวที่ยืด/หด/เปลี่ยนมุม
พื้นที่เงาของเขาจึงคงที่พอจะเป็นไม้บรรทัดได้จริง

| ไม้บรรทัด | การกระจายเฉลี่ย |
|---|---|
| **รากพื้นที่ตัว (`body_sqrt`)** | **15.2%** ✅ |
| รากผิว+กางเกง | 21.9% |
| รากพื้นที่ผิวหน้า | 27.1% |
| รากพื้นที่กางเกง | 28.9% |

> ที่ลองผิวหน้าก่อนเพราะติดนิสัยจาก DEAR (ที่ต้องใช้ผมส้มเพราะแขนกลกินพื้นที่ 64%)
> **แต่ของเขาไม่มีปัญหานั้น** ผิวหน้าแพ้เพราะหน้าหันไปมาและถูกบังตอนท่านอน/ม้วน
> ส่วนกางเกงแพ้เพราะขาเปลี่ยนท่ามากที่สุด — **ของที่คงที่ที่สุดคือทั้งตัว**

---

## แผนชีต — 102 เฟรม

| ใบ | ตาราง | เนื้อหา |
|---|---|---|
| ขั้น 0 | เดี่ยว | ท่ายืน (ด่านกั้น) |
| ขั้น 1 | คลิป | ยืน → วิ่ง ตัดเป็น 11 เฟรม |
| A | 4×3 | ท่าเคลื่อนไหวและท่าโดน 12 ท่า |
| B | 3×3 | แย็บสามจังหวะ |
| C | 3×3 | ท่าพิเศษบนพื้น |
| D | 3×3 | ท่ากลางอากาศ |
| E | 3×3 | Chain Rush 1-3 |
| F | 3×3 | Chain Rush 4-5 + ไม้จบตรง |
| G | 2×3 | ไม้จบอีกสองทาง |
| H | 3×3 | **SKY DRIVE** ยกคาง + สองทีกลางอากาศ |
| I | 2×3 | **SKY DRIVE** ทีที่สาม + ตบลง |
| J | 4×3 | อัลติ Hundred Hands |

> **ใบ A กับ J สั่งเป็น 4 แถว ไม่ใช่ 3** เพราะกรอบจะสูงขึ้น ท่าเล็กลง แล้วเหลือขอบว่างมากขึ้นเอง
> เป็นทางแก้ที่ได้ผลกว่าการเขียน "do not crop" ซ้ำ ๆ ซึ่งพิสูจน์แล้วว่าไม่ได้ผลตอนทำ DEAR

---

## 1. ขั้น 0 — ท่ายืน (✅ **ผ่านแล้ว ไม่ต้องเจนซ้ำ**)

> ของที่ใช้จริงอยู่ที่ `art_reference/helios_idle_APPROVED_v2.jpg`
> **แนบภาพนี้ไปกับทุก prompt คู่กับ turnaround** · ภาพเทียบบนเวทีอยู่ที่ `march_onstage_test.png`

### ผลวัด

| | ค่า | เกณฑ์ |
|---|---|---|
| **ท่อนล่างสว่าง** | **112.4** | ≤140 ✅ ห่างจากพื้นเวที (150-190) พอ |
| กว้าง (bbox) | 140 | Helios เดิม 136 · Alecto 160 ✅ |
| กว้างเฉลี่ย | 85 | Helios เดิม 67 · Momus 81 ✅ กว้างขึ้นตามที่สั่งให้ถ่างเท้า |
| พื้นรองเท้า | ครบ | แถวล่างสุดไล่ 122→10 = ปลายรองเท้าจบเอง ไม่โดนตัด ✅ |
| ก้อนที่แยกได้ | 1 | ไม่มีอะไรหลุดจากตัว ✅ |

**กางเกงขาวผ่าน** — เส้นขอบดำหนากับเงาในรอยพับทำงานได้จริง เทียบ: DEAR 66 · Alecto 49 ·
Momus ตัวตลก 107 · **MARCH ใหม่ 112** · Orpheus 114 · Helios เดิม 126

> ⚠️ **ความสูงเป็นหัววัดได้ 3.11 ซึ่งเกินเกณฑ์ 2.50-2.80** แต่ **ปล่อยผ่าน**
> ผมหนามแหลมดันยอดหัวขึ้นไปโดยที่กะโหลกไม่ได้โตตาม ไม้บรรทัดนี้จึงอ่านเพี้ยน
> — ปัญหาเดียวกับหมวกของ Alecto (วัดได้ 1.81) และผมฟูของ Momus (2.39) ซึ่งทั้งคู่ผ่านมาแล้ว
>
> **ตัวตัดสินคือภาพเทียบบนเวทีจริง** ซึ่งวางข้างโรสเตอร์แล้วขนาดพอดีทุกตัว

```
A single full-body standing pose of this character, drawn in chibi game-sprite
proportions: big head, short legs, compact body, the whole figure only about
two and a half to three heads tall.
He stands in a loose ready stance, feet well apart and weight low, both fists
raised lightly in front of his chest, chin slightly down, eyes forward, calm.
One character only, one pose only. No turnaround, no multiple views, no text,
no labels, no header bars.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 2. ขั้น 1 — คลิป ยืน → วิ่ง (✅ **ตัดเสร็จแล้ว**)

> อยู่ที่ `art_reference/helios_clip/run_01.png` … `run_11.png` + `clip.json`
> **คาบ 39 เฟรม เริ่มที่ f96** (39 ≈ 2 × 19.5 คือสองก้าว) · ท่ายืนในคลิปสูง 714 px
> หาด้วยวิธีเดียวกับ DEAR: เทียบรูปทรงทั้งตัวด้วย IoU แล้วเลือกจุดที่ลูปปิดสนิทที่สุด (0.952)
> เพิ่ม `helios` ลงตาราง `CLIPS` ใน `tools/cut_momus_clip.py` แล้ว พร้อมช่อง `n`
> เพราะตัวนี้ใช้ 11 เฟรมไม่ใช่ 10 เหมือนสองตัวก่อน

```
Animate this exact character: starts in the loose ready stance, holds it
briefly, then runs forward to the right for at least three full strides.
He runs like a fighter — upright, compact, arms tucked in and pumping close to
his body rather than swinging wide. The baggy trousers swing and ripple with
each stride but stay close to his legs, and the sash ends stay against his hip.
Same art style, same proportions, same camera distance throughout.
Pure white background, no shadow, no ground line. Full body always visible.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 3. ชีต A — ท่าเคลื่อนไหวและท่าโดน (12 ท่า · 4 แถวแถวละ 3)

เก้าท่าหลังเป็นท่า "โดน" กับ "กัน" ซึ่งเป็นท่าที่คนเล่นเห็นบ่อยที่สุดรองจากท่ายืน
ต้องอ่านออกจากหางตาว่าโดนแล้ว ไม่ใช่แค่ยืนเอียง ๆ

```
A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no impact effects — the game draws all of that.

Pose 1 — launching upward off both feet, knees starting to tuck, arms driving down.
Pose 2 — rising with knees pulled up tight, body compact, fists near his chest.
Pose 3 — floating at the top of the jump, body loose, one arm slightly out.
Pose 4 — falling, legs reaching down for the ground, body angled forward.
Pose 5 — hit and staggering backward, head snapped back, one arm flung out,
knees buckling, clearly taking damage.
Pose 6 — knocked flat on his back, limbs slack, one knee half raised.
Pose 7 — rolling sideways along the ground, body curled into a tight ball.
Pose 8 — pushing up off one knee getting back to his feet, one fist on the ground.
Pose 9 — guarding: both forearms crossed in front of his face and chest,
shoulders hunched, feet braced wide.
Pose 10 — guard broken through: same crossed-arm guard but skidding backward,
feet sliding, head turned aside from the force.
Pose 11 — crouched LOW and still, knees fully folded, forearms on his knees.
Pose 12 — crouched LOW in a guard, both forearms crossed in front of his face
while still folded down into the crouch.

Poses 11 and 12 must be crouched LOW — total height only about 80% of the standing pose, clearly shorter, not a shallow knee-bend.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 4. ชีต B — แย็บสามจังหวะ (9 ท่า · 3 แถวแถวละ 3)

สามหมัดแรกของเขา เร็วและเบา ไม่ใช่หมัดหนักที่เงื้อนาน

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Pose 1 — left fist pulled back only as far as his ribs, right hand up guarding,
body compact and already leaning in.
Pose 2 — a fast straight left fully extended at chest height, shoulder turned
in behind it, right hand still up.
Pose 3 — the left hand snapping back in, already rotating for the right.
Pose 4 — right fist cocked at the ribs, torso turned the other way, the left
hand exactly where pose 3 left it.
Pose 5 — a straight right fully extended at chest height, shoulder driving
behind it, hips turned through.
Pose 6 — the right hand snapping back in, weight rolling onto the front foot.
Pose 7 — winding up an overhand: right fist drawn up and back beside his head,
front shoulder dropped, knees loading.
Pose 8 — the overhand landing, right arm swung down and forward over the top
at head height, his whole body dropping behind it.
Pose 9 — following through low, fist past the target, body turned through.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 5. ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

ท่า 4-6 คืออัปเปอร์คัต ซึ่งเป็นท่าส่งขึ้นฟ้าของเขา **หมัดต้องชี้ขึ้นชัด ๆ**

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — stepping deep into a long forward lunge, right fist drawn back at the ribs.
Pose 2 — a long lunging straight right at full extension, front leg deep in a
long stride, the whole body stretched out behind the punch.
Pose 3 — recovering out of the lunge, pulling the arm back in.
Pose 4 — crouched low, right fist down at knee height, coiled to swing upward.
Pose 5 — a rising uppercut with the right fist punched STRAIGHT UP past his own
head, arm fully extended vertically, body stretched tall, back heel lifted,
head tipped back.
Pose 6 — coming down out of the uppercut, knees absorbing the landing.
Pose 7 — dropping into a low crouch, both hands planted near the ground.
Pose 8 — a low sweeping kick along the floor, leg extended flat and level with
the ground, body rotated over the planted hands.
Pose 9 — rising out of the sweep, gathering himself back up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 6. ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

ท่า 7-9 คือเตะขวานที่ทุบโดนแล้วเด้งกลับขึ้น — ต้องเห็นว่าทุบลงแนวดิ่งจริง ๆ
ไม่ใช่เตะเฉียง ๆ ไม่งั้นคนเล่นจะไม่เข้าใจว่าทำไมมันเด้ง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
All nine poses are AIRBORNE — both feet off the ground, no ground contact in
any pose. No motion lines, no effects.

Pose 1 — airborne, knees tucked and body compact, winding up a spin.
Pose 2 — airborne mid-spin with one leg swung straight out to the side
horizontally, body rotating, arms tucked in.
Pose 3 — airborne pulling the leg back in from the spin, body compact again.
Pose 4 — airborne with the front knee drawn up high to his chest, body angled
forward, the back leg trailing.
Pose 5 — airborne flying kick with that leg snapped straight forward at chest
height, the whole body strung out in one line behind it.
Pose 6 — airborne retracting the leg, body folding back up.
Pose 7 — airborne with one leg raised STRAIGHT UP high above his head, body
stretched vertically, arms out for balance.
Pose 8 — airborne driving that heel STRAIGHT DOWN below his own body, leg
locked out vertically beneath him, body stacked directly above it, head down —
a pure downward axe kick, not a diagonal kick.
Pose 9 — airborne rebounding upward off that kick, leg still down, body rising,
the other knee drawing up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 7. ชีต E — Chain Rush จังหวะ 1-3 (9 ท่า · 3 แถวแถวละ 3)

ชุดรัวของเขา **แต่ละจังหวะต้องเป็นหมัดคนละทรง** ของเดิมเป็นหมัด-หมัด-เตะ-หมัด-เตะ
ซึ่งบนจอแยกไม่ออกว่าทีไหนเป็นทีไหน เพราะท่าวาดคล้ายกันหมด

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

**ท่าสุดท้ายของใบนี้ (ท่า 9) ต้องเป็นท่าเดียวกับท่าแรกของใบ F** — เขียนกำกับไว้ในทั้งสองใบแล้ว

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

This is beat 1 to 3 of a longer rush. Each beat is a DIFFERENT technique, not
the same punch repeated: a jab, then a cross, then an elbow.

Pose 1 — left jab winding: left fist at the ribs, body already driving forward.
Pose 2 — the left jab fully extended at chest height, short and fast.
Pose 3 — left hand snapping back as the right shoulder loads.
Pose 4 — right cross winding, hips turning, the left hand exactly where pose 3
left it.
Pose 5 — the right cross fully extended, hips turned all the way through.
Pose 6 — right hand pulling back as that same arm folds at the elbow.
Pose 7 — that folded right arm rising, elbow leading, shoulder lifting.
Pose 8 — a rising elbow strike, the point of the elbow driven up and forward at
head height, body lifting behind it.
Pose 9 — coming out of the elbow with the right arm folded across his chest and
his weight already rolling onto the front foot, mid-stride, NOT re-set into a
neutral stance.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 8. ชีต F — Chain Rush จังหวะ 4-5 + ไม้จบตรง (9 ท่า · 3 แถวแถวละ 3)

ต่อจากใบ E ทันที **ท่าแรกของใบนี้ต้องเป็นท่าเดียวกับท่าสุดท้ายของใบ E**

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

This continues a rush combination already in progress. Pose 1 is a HANDOFF
pose: he is already mid-stride with his right arm folded across his chest and
his weight on the front foot — he is NOT starting from a neutral stance.

Pose 1 — mid-stride, right arm folded across his chest, weight forward,
the left shoulder beginning to swing open.
Pose 2 — a wide left hook swung around at head height, the arm curved rather
than straight, body rotating hard behind it.
Pose 3 — the hook carrying through, his back turning slightly toward the viewer.
Pose 4 — that rotation continuing into a backfist: the right arm swinging up
and out with the back of the fist leading.
Pose 5 — the backfist landing at head height, arm extended across his body.
Pose 6 — the backfist arm whipping back in as both hips square up forward again.
Pose 7 — loading the finisher: both feet planted, right fist drawn far back
past his hip, shoulder wound up.
Pose 8 — a full-power straight right at maximum extension, his whole body
committed behind it, back foot pivoted up onto the toe.
Pose 9 — the long follow-through, arm still out, body settled low and forward.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 9. ชีต G — ไม้จบอีกสองทาง (6 ท่า · 2 แถวแถวละ 3)

ไม้จบของชุดรัวแยกสามทางตามปุ่มทิศ — ทางตรงอยู่ในใบ F แล้ว ใบนี้คือขึ้นกับลง
**เจนแยกเป็นใบเล็กเพราะท่าเตะยกขึ้นเป็นกลุ่มเสี่ยง** (บทเรียนจาก DEAR: ท่าที่ยกแขนขาเหนือไหล่
คือท่าที่ตัวเจนชอบทำของหายไปจากดีไซน์ ท่าน้อยลง = ใส่ใจต่อท่ามากขึ้น)

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — crouched low with the back leg coiled, both fists up, loading upward.
Pose 2 — a rising kick with the lead leg snapped STRAIGHT UP past the height of
his own head, body stretched vertically, arms thrown down for counterbalance,
back heel lifted off the ground.
Pose 3 — dropping back down out of the kick, knees absorbing the landing.
Pose 4 — dropping into a deep low crouch, both hands planted on the ground,
the back leg drawn in underneath him.
Pose 5 — a low sweeping kick with the leg extended flat and level along the
floor, body rotated low over the planted hands, head near knee height.
Pose 6 — rising out of the sweep, one hand still down, gathering back up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 10. ชีต H — SKY DRIVE: ยกคาง + สองทีกลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

สกิล 2 ใหม่ — **ท่า 1-3 เป็นท่าเดียวที่เขายืนบนพื้น ที่เหลือลอยหมด**
ท่ายกคางต้องอ่านออกว่า "เขาลอยตามขึ้นไปเอง" ไม่ใช่แค่ต่อยขึ้นแล้วยืนอยู่กับที่

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Poses 1 to 3 start on the ground and leave it. Poses 4 to 9 are fully AIRBORNE
with both feet off the ground.

Pose 1 — crouched low, both fists drawn down beside his knees, knees deeply
bent, gathering everything downward before launching.
Pose 2 — a rising hook punched up past his own head with the lead fist, his
whole body leaving the ground behind it, both feet lifting clear, back arched.
Pose 3 — climbing, body stretched upward, that fist still high, legs trailing
straight down beneath him, feet well off the ground.
Pose 4 — airborne, the lead arm folding back down across his chest as the other
elbow lifts.
Pose 5 — airborne elbow strike, the point of the elbow driven forward at head
height, body turned in behind it.
Pose 6 — airborne, the elbow arm whipping back in as the far shoulder opens.
Pose 7 — airborne, that far arm swinging open and back, winding a hook.
Pose 8 — airborne hook landing at head height, arm curved, torso rotating hard.
Pose 9 — airborne carrying through the hook, his back turning toward the viewer,
the other arm already lifting — mid-motion, NOT re-set.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 11. ชีต I — SKY DRIVE: ทีที่สาม + ตบลงพื้น (6 ท่า · 2 แถวแถวละ 3)

ต่อจากใบ H ทันที **ท่าแรกต้องเป็นท่าเดียวกับท่าสุดท้ายของใบ H**

ท่า 4-6 คือท่าตบลงพื้นซึ่งทำให้คู่ต่อสู้ **เด้ง** แล้วคอมโบต่อได้ — ต้องอ่านออกว่าทุบลงแนวดิ่ง
ไม่ใช่เหวี่ยงเฉียง ไม่งั้นคนเล่นจะไม่เข้าใจว่าทำไมอีกฝ่ายเด้งขึ้นมา

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
All six poses are fully AIRBORNE — both feet off the ground in every pose.
No motion lines, no effects.

Pose 1 — airborne mid-motion with his back turned slightly toward the viewer
and one arm already lifting, exactly continuing a hook that just landed.
Pose 2 — airborne backfist, the back of the fist swung out and across at head
height, arm extended over his own centre line.
Pose 3 — airborne, that arm whipping back in as both hands rise together above
his head, hips beginning to pitch forward.
Pose 4 — airborne with both fists clasped high above his head, knees pulled up,
body coiled, at the very top of the wind-up.
Pose 5 — airborne driving both fists STRAIGHT DOWN below his own body, arms
locked out vertically beneath him, body stacked directly above them, head down
between his shoulders — a pure downward hammer, not a diagonal swing.
Pose 6 — airborne just after the hammer, arms still down and locked, body
straightening, legs reaching down for the ground.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 12. ชีต J — อัลติ Hundred Hands (12 ท่า · 4 แถวแถวละ 3)

อัลติเป็นชุดรัวที่กดปุ่มรัวเพิ่มรอบได้ **ท่า 4-9 จะถูกเล่นวนซ้ำ**
จึงต้องต่อกันเป็นวงได้: ท่า 9 ต้องต่อกลับเข้าท่า 4 ได้เนียนเหมือนต่อเข้าท่า 10

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Poses 4 to 9 will be played on a loop, so pose 9 must flow back into pose 4 as
smoothly as it flows into pose 10.

Pose 1 — both fists drawn back at his hips, knees bent, shoulders loading.
Pose 2 — the first straight punch of the flurry fired out at chest height.
Pose 3 — that hand snapping back as the other fist fires.
Pose 4 — a straight left at full extension, body low and driving in.
Pose 5 — left hand retracting as the right starts out, both arms mid-travel.
Pose 6 — a straight right at full extension, hips turned through.
Pose 7 — right retracting as the left fires again, arms crossing mid-flight.
Pose 8 — a rising left at chin height, elbow lifting.
Pose 9 — that arm folding back in with the hips already re-loading, weight
still forward, mid-stride — the pose flows straight back into pose 4.
Pose 10 — loading the finisher: both feet planted wide, right fist drawn far
back past his hip, shoulder fully wound.
Pose 11 — the finishing straight right at maximum extension, whole body
committed, back foot pivoted onto the toe.
Pose 12 — the long follow-through, arm still out, body settled low and forward.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## เช็กลิสต์ก่อน build

1. **วัดความสว่างท่อนล่างของขั้น 0 ก่อนอย่างอื่นทั้งหมด** เกิน ~140 = เจนใหม่
   อย่าเจนอีก 9 ใบแล้วค่อยมารู้
2. เปิดดูทุกใบด้วยตา ไม่ใช่ดูแค่ตัวเลข — เช็กว่าผ้าคาดยังติดเอวไหม · เสื้อยังดำไหม ·
   ทรงผมยังแนบกะโหลกไหม (ตัวเจนชอบทำผมฟูขึ้นเรื่อย ๆ ทีละใบ)
3. **เช็กรอยต่อของใบ E→F และ H→I** ว่าท่าสุดท้ายกับท่าแรกเป็นท่าเดียวกันจริง
   นี่คือสิ่งที่ทำให้คอมโบดูลื่น ถ้าไม่ตรงก็ได้ชีตที่กระตุกเหมือนเดิม
4. รันตัวแยกท่าแล้วดูว่าได้จำนวนก้อนตรงกับจำนวนท่าไหม และไม่มีก้อนขยะ
5. ดูไม้บรรทัดวัดกล้องของทุกใบ ใบไหนกระจายเกิน ~20% แปลว่ามีท่าที่กล้องเพี้ยน
6. **ลบ `artAs` ของ `helios` ออกจาก `ScrambleScene.js` ให้หมด** ถ้าลืมลบ
   ท่าใหม่จะไม่ถูกใช้เลยทั้งที่ชีตมาแล้ว
7. เทียบท่ายืนข้างโรสเตอร์อีกครั้งหลัง build จริง ไม่ใช่แค่ตอนขั้น 0

---

## ตารางเทียบ: ท่าในชีต → ไอดีท่าในซิม

| ไอดี | ที่มา | เฟรม |
|---|---|---|
| `idle` · `run` | ขั้น 0 · คลิป | 1 + 11 |
| `jump` | A1-4 | 4 |
| `hurt` · `knockdown` · `techroll` · `tech` | A5 · A6 · A7 · A8 | 4 |
| `block` · `blockstun` | A9 · A10 | 2 |
| `crouch` · `blockcrouch` | A11 · A12 | 2 |
| `jab1` · `jab2` · `jab3` | B1-3 · B4-6 · B7-9 | 9 |
| `side` · `up` · `down` | C1-3 · C4-6 · C7-9 | 9 |
| `nair` · `sair` · `dair` | D1-3 · D4-6 · D7-9 | 9 |
| `rush1` · `rush2` · `rush3` | E1-3 · E4-6 · E7-9 | 9 |
| `rush4` · `rush5` · `rushEndF` | F1-3 · F4-6 · F7-9 | 9 |
| `rushEndU` · `rushEndD` | G1-3 · G4-6 | 6 |
| `sky1` · `sky2` · `sky3` | H1-3 · H4-6 · H7-9 | 9 |
| `sky4` · `sky5` | I1-3 · I4-6 | 6 |
| `hh1` · `hh2` · `hh3` · `hhEnd` | J1-3 · J4-6 · J7-9 · J10-12 | 12 |

**รวม 102 เฟรม**
