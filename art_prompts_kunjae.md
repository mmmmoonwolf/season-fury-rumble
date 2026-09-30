# KUNJAE — คำสั่งเจนอาร์ต (ดีไซน์ใหม่: มือปืนคู่ + หางไซเบอร์)

> `id` ของตัวละครยังเป็น **`alecto`** ห้ามเปลี่ยน — คีย์อัตลาส (`scalecto`) ชื่อไฟล์ใน `tools/`
> และค่าที่ส่งข้ามเน็ตตอนเลือกตัว · ชื่อที่โชว์คือ `label: 'KUNJAE'`
>
> ภาพอ้างอิงดีไซน์: `art_reference/alecto_redesign_REF.jpg`

## ทำไมต้องเจนใหม่ทั้งตัว

ชีตที่มีอยู่ (`art_reference/alecto_sheets/A-J`) เป็น **ตัวละครคนละคน** — คาวเกิร์ลผมแดง
หมวกแดง เสื้อขาว กางเกงหนังน้ำตาล ถือทอมมี่กัน **ไม่มีหางเลยสักท่า**
เป็นดีไซน์ก่อนรีเวิร์ค และเป็นตัวที่เห็นอยู่ในเกมตอนนี้

ดีไซน์ใหม่ต่างเกือบทุกอย่าง: ผมขาว หมวกครีม ผ้าคลุมหน้า เกราะเทาเข้ม **ปืนสั้นคู่**
และ **หางไซเบอร์เป็นปล้องติดไหล่** ซึ่งเป็นของที่กลไกทั้งสามสกิลใช้

---

## ⚠️ ความเสี่ยงข้อ 1 (วัดแล้ว): หมวกกับผ้าคลุมหน้าจะโดนตัดทิ้ง

ตัวตัดพื้นหลังของเธอ (`tools/alecto_sheets.py`) ตัดสินว่าอะไรคือพื้นหลังด้วยกฎนี้:

```python
flat = (sat <= 8) & (val > 195)      # จืดและสว่าง = พื้นหลัง
```

เอาภาพอ้างอิงดีไซน์มาวัดตามกฎนี้ตรง ๆ:

| วัดที่ | ผล |
|---|---|
| ทั้งภาพ | 71.2% เป็น "พื้นหลัง" (ถูกต้อง — พื้นขาว) |
| **เฉพาะกรอบหมวก/ผ้าคลุมหน้า** | **32.2% จะถูกตัดทิ้งด้วย** |
| ความอิ่มสีเฉลี่ยของหมวก | **13** (เกณฑ์อันตรายคือ ≤ 8) |

ครีมของหมวกกับผ้าคลุมจืดเกินไป ใกล้เทากลาง ๆ เกินไป **หนึ่งในสามของหมวกจะหายเป็นรู**
โดยที่ทุกอย่างอื่นดูปกติ นี่คือกับดักเดียวกับ "กางเกงขาว" ของ MARCH แต่หนักกว่า
เพราะของ MARCH เป็นขาวอมเทาที่ยังมีเงาเข้ม ส่วนอันนี้เป็นพื้นที่กว้างสีเรียบ

**ทางแก้ในคำสั่ง: สั่งให้หมวกกับผ้าคลุมเป็นสีแทน/ทรายอุ่น ๆ ที่เห็นชัดว่าไม่ใช่ขาว**
(ความอิ่มสี ≥ 20 หรือความสว่าง < 195 อย่างใดอย่างหนึ่งก็พอ) และ**ห้ามมีไฮไลต์ขาวล้วน
เป็นปื้นใหญ่** บนเกราะหรือปืน เพราะรูที่จืด-สว่างและใหญ่เกิน 500 px จะถูกตัดเหมือนกัน

> ห้ามแก้ด้วยการเปลี่ยนพื้นหลังเป็นเทา — กฎมันต้องการพื้นหลัง **สว่าง** (`val > 195`)
> พื้นเทากลางจะไม่ถูกมองว่าเป็นพื้นหลังเลย แล้วทั้งภาพจะกลายเป็นตัวละครก้อนเดียว

## ⚠️ ความเสี่ยงข้อ 2: ผ้าคลุมหน้าบังคาง ซึ่งเป็นไม้บรรทัดวัดสเกล

`build_scramble_alecto.py` ยึดสเกล **"คางถึงพื้นรองเท้า"** ไม่ใช่ความสูงทั้งตัว
(เพราะหมวกกินความสูงไปราว 12% ถ้ายึดความสูงทั้งตัวเธอจะเตี้ยกว่าคนอื่นเห็นได้ชัด)

`chin_y()` หาคางด้วยการจับ**ก้อนสีผิวที่ใหญ่ที่สุดในครึ่งบนของตัว แล้วเอาขอบล่างสุด**
ดีไซน์ใหม่มีผ้าคลุมปิดปากกับคาง — ก้อนสีผิวจะจบแค่กลางหน้า ไม่ถึงคางจริง
`clip_chin` จะสั้นกว่าความจริง แล้วสเกลจะใหญ่เกิน = **เธอตัวโตกว่าคนอื่นทั้งโรสเตอร์**

**ยังไม่แก้ตอนนี้** เพราะต้องเห็นภาพจริงก่อนว่าผิวโผล่แค่ไหน — พอได้ท่ายืนขั้น 0 มา
จะวัดแล้วปรับไม้บรรทัด (อาจย้ายไปยึดขอบล่างของผ้าคลุม หรือยึดหัวเข็มขัดแทน)
**ข้อนี้ต้องเช็กก่อนเจนชีตทั้งหมด** ไม่งั้นเจนครบสิบใบแล้วมาพบว่าสเกลเพี้ยนทั้งตัว

---

## แผนชีต

ตัวตัดของเธอ**ตัดด้วยกริดตายตัว** (ไม่ใช่หาก้อนเองแบบ MARCH) ทุกใบจึงต้องเป็นตาราง
สม่ำเสมอจริง ๆ — `LAYOUT` ใน `tools/alecto_sheets.py` กำหนดไว้ว่าใบไหนกี่แถวกี่คอลัมน์

| ขั้น | ของที่ต้องได้ | จำนวนท่า |
|---|---|---|
| **0** | ท่ายืน (ตัวตั้งต้นของทุกอย่าง) | 1 |
| **1** | คลิปยืน → วิ่ง ตัดเป็นสตริป | 1 + 10 |
| **A** | เคลื่อนไหว + โดน: ย่อ · กระโดด 4 ท่า · เจ็บ · ล้ม · กลิ้งลุก · การ์ด | 9 (3×3) |
| **B** | ชุดแย็บปืน `jab1` `jab2` `jab3` | 9 (3×3) |
| **C** | ปืนกดทิศ `side` `up` `down` | 9 (3×3) |
| **D** | ปืนกลางอากาศ `nair` `sair` `dair` | 9 (3×3) |
| **E** | **หาง** `hook1` `slam1` `quill1` | 9 (3×3) |
| **F** | ท่าถอย `hop` `roll` | 6 (2×3) |

รวม **52 ท่า** + คลิป

> **ไม่มี `idleGun` / `runGun` อีกแล้ว** ดีไซน์ใหม่ถือปืนคู่ตลอดเวลา ท่ายืนกับท่าวิ่ง
> ปกติคือท่าถือปืนอยู่แล้ว (เดิมมีสองชุดเพราะเธอสลับแส้กับไรเฟิล ซึ่งถอดออกแล้ว)
> ตอนต่อเข้าเกมต้องลบ `gunStance` กับ `anims.runGun/idleGun` ใน `ScrambleScene.js` ด้วย

### ลำดับที่ต้องทำ (ห้ามข้าม)

1. **ขั้น 0 ท่ายืน** → ตรวจสีหมวก/ผ้าคลุมด้วยตัววัด แล้ว**เช็กไม้บรรทัดคาง**
2. ขั้น 1 คลิปวิ่ง
3. ชีต E (หาง) **ก่อนใบอื่น** — เป็นใบเสี่ยงที่สุดและเป็นหัวใจของกิตใหม่
4. ที่เหลือ A B C D F

---

## 1. ขั้น 0 — ท่ายืน

ใบนี้เป็นตัวตั้งต้นของทุกใบที่เหลือ ทุก prompt หลังจากนี้จะแนบใบนี้ไปด้วยแล้วสั่งว่า
"match the attached reference exactly" — ถ้าใบนี้ไม่ผ่าน อย่าเพิ่งเจนใบอื่น

```
A single full-body character sprite for a 2D fighting game, standing in a
relaxed ready stance, three-quarter view, body angled toward the viewer's right.

Chibi-proportioned anime game sprite: large head roughly one third of the total
height, short sturdy limbs, bold dark outlines, flat cel shading, muted
desaturated palette.

Character: a lean gunslinger woman. Long wavy SILVER-WHITE hair falling loose to
her shoulders from under her hat. Dark skin. Sharp narrow eyes, a level
unimpressed expression. A wide-brimmed cowboy hat and a torn cloth face-wrap
that covers her nose, mouth and chin, the wrap's long frayed ends hanging down
over her left shoulder and chest.

IMPORTANT — the hat and the face-wrap must be a WARM SANDY TAN, clearly darker
and browner than the white background: think dry desert sand or weathered
canvas, never a clean white, never a neutral grey-white, never ivory. A viewer
must be able to tell at a glance that the hat is a colour and the background is
not. The hat has a darker brown leather band around its base.

She wears close-fitting segmented armour in dark charcoal gunmetal over her
shoulders, arms, torso and legs — hard plates with visible seams between them,
not cloth. A brown leather belt with a metal buckle at her waist. Black
fingerless gloves. Dark heavy boots.

She holds ONE REVOLVER IN EACH HAND, both pointed down and slightly outward at
her sides, relaxed, not aimed. The revolvers are dark metal with a VIOLET glow
running through slots in the barrel and cylinder.

Growing from her RIGHT SHOULDER is a long mechanical scorpion tail made of
chunky armoured segments, each segment separated by a joint that glows VIOLET.
The tail arcs up and over behind her head and ends in a smooth curved barb. The
tail must clearly ATTACH TO HER SHOULDER PLATE — it is part of her, not a
floating object behind her. Keep the whole tail within roughly one body-width to
either side of her: a compact arc, NOT a wide sprawling loop across the image.

Violet is the ONLY accent colour in the whole image — the tail joints, the gun
glow. Everything else is tan, brown, charcoal and skin.

Pure white background. No ground line, no shadow, no props, no text, no labels,
no panel borders, no effects of any kind: no sparks, no glow haze, no motion
lines, no dust, no muzzle flash. Nothing detached from her body anywhere in the
image. Exactly two arms, two legs and one tail, clearly separated, do not
overlap or duplicate limbs. No large patches of pure white anywhere on her
armour, guns or clothing — highlights must stay light grey or light tan, never
white. Full body visible from the top of the hat to the soles of both boots — do
not crop, do not zoom. Leave a clear band of empty white space below the soles,
above the hat and to the left and right of the tail; nothing may touch or run
off the edge of the image.
```

### ตรวจก่อนรับ — 5 ข้อ

1. **หมวกกับผ้าคลุมเป็นสีแทนอุ่นชัด ๆ ไม่ใช่ขาว/ครีมจืด** ← ข้อที่เสี่ยงที่สุด
   ถ้าดูแล้วลังเลว่า "ขาวหรือเปล่า" = ไม่ผ่าน เจนใหม่
2. **หางงอกจากแผ่นเกราะไหล่ เห็นจุดต่อ** ไม่ใช่ของลอยอยู่ข้างหลัง
3. **หางไม่กางเกินหนึ่งช่วงตัวต่อข้าง** — หางที่วนกว้างจะทำให้กรอบภาพต่อท่าใหญ่จนสเกลเพี้ยน
   และตัวตัดกัดจุดยึดตามหางไปด้วย (บทเรียนจากแส้ของตัวเดิม เขียนไว้ในหัว `build_scramble_alecto.py`)
4. **ปืนอยู่ในมือทั้งสองข้าง** และไม่มีอะไรหลุดออกจากตัว
5. **ไม่มีปื้นขาวล้วนใหญ่ ๆ** บนเกราะ/ปืน/ผ้า

ได้แล้ววางที่ `art_reference/alecto_idle_NEW.jpg` แล้วผมจะรันตัววัดสองอันให้ก่อนไปต่อ:
สีหมวกผ่านเกณฑ์ตัวตัดไหม และไม้บรรทัดคางยังใช้ได้ไหม

---

## สิ่งที่ต้องมีในทุก prompt หลังจากนี้

- **หางไซเบอร์เป็นปล้อง ติดไหล่ขวา เรืองม่วงตามข้อต่อ** เขียนลงไปในบรรทัดของทุกท่า
  ไม่ใช่แค่ในย่อหน้าสไตล์ท้าย prompt (บทเรียนจาก DEAR: ของที่เขียนไว้แต่ใน style anchor
  คือของที่ตัวเจนทำหาย)
- **ปืนคู่อยู่ในมือทั้งสองข้างเสมอ** ยกเว้นสามท่าของชีต E ที่หางทำงาน ซึ่งมือยังถือปืนอยู่
  แค่ไม่ได้ยิง
- **หมวกกับผ้าคลุมสีแทนอุ่น** ทุกใบ ไม่ใช่แค่ใบแรก
- หมวกปีกกว้างต้องเห็นเต็มใบทุกท่า (มุม 3/4) — ตัวตัดใช้**พื้นที่หมวก**เป็นไม้บรรทัด
  วัดระยะกล้อง ท่าโปรไฟล์ด้านข้างล้วนทำให้ปีกหมวกหุบจนพื้นที่หายเกือบครึ่ง แล้ววัดผิด
  (ใบท่าเดินของตัวเดิมเจอปัญหานี้จริง มีทางแก้สำรองเขียนไว้ใน builder)

## สิ่งที่ห้ามใส่ทุกใบ

- ห้ามมีกระสุน/ลำแสง/ประกาย/ควันหลุดออกจากตัว — เกมวาดเอฟเฟคเองหมด
  และตัวตัดทิ้งก้อนที่หลุดจากตัวอยู่แล้ว
- ห้ามมีวงรัศมีรอบตัว ห้ามมีเส้นความเร็ว ห้ามมีรอยแตกพื้น ห้ามมีเงา ห้ามมีเส้นพื้น
- ห้ามมีปื้นขาวล้วนใหญ่เกินราว 500 px บนตัวละคร (จะถูกตัดเป็นรู)
