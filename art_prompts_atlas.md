# ATLAS — ตัวละครที่ 2 (สายไฟต์เตอร์ มือเปล่า)

**ชื่อยังไม่ล็อก** — ATLAS (ไททันแบกฟ้า) เป็นตัวตั้ง สำรอง: KAIROS / HELIOS
คู่กับ Nyx เป็นระบบชื่อกรีก และตรงข้ามกันทั้งคาแรกเตอร์: Nyx หายตัว-ลอบฆ่า · Atlas ยืนรับ-ต่อยสวน

---

## ⚠️ เรื่องสัดส่วน — เหตุผลที่ต้องเจนใหม่

อาร์ตชุดแรกที่ได้มาเป็น**สัดส่วนคนจริง** ซึ่งคนละทางกับ Nyx ที่เป็น chibi หัวโต
วัดแล้ว ตัวสูง/หัวกว้าง: **Nyx 2.65 · ชุดแรก 3.62** ต่างกัน 37%
ย่อให้สูงเท่ากันที่ขนาดในเกม (242 px) แล้วยังดูเหมือนมาคนละเกม

**ดีไซน์ตัวละครใช้ของเดิมได้หมด** (แว่น เสื้อยืดดำรัดรูป กางเกงยูโดเทาหลวม สายดำ รองเท้าผ้าดำ ผมดำตั้ง)
เปลี่ยนแค่สัดส่วน — แนบเฟรม Nyx เป็น image reference แล้วสั่งให้ตามสัดส่วนนั้น

---

## ขั้นที่ 1 — ท่ายืนตัวเดียวก่อน (ต้องผ่านก่อนค่อยทำอย่างอื่น)

**แนบ 2 อัน:** เฟรม `idle` ของ Nyx จาก atlas จริง + ภาพตัวละครชุดแรก (เอาไว้ล็อกดีไซน์)

```
A single standing fighting-stance sprite of a new character, drawn in the
exact art style and exact body proportions of the FIRST attached reference
image (the small ninja): chibi proportions with a large head roughly one
third of the total height, short limbs, bold dark outlines, flat cel
shading with subtle texture, muted desaturated palette.

Take ONLY the character design from the SECOND attached image, not its
proportions: a young man with spiky black hair, thin-rimmed glasses, a
fitted black short-sleeved t-shirt over a muscular build, loose light grey
martial-arts trousers, a black cloth belt tied at the waist with two short
ends hanging down, plain black flat cloth shoes. Serious, focused
expression.

Standing in a boxer's guard: both fists raised, one forward one near the
chin, knees slightly bent, feet apart. Three-quarter view, body angled
toward the viewer's right.

Pure white background, no shadow, no ground line, no props. Full body
visible from the top of the hair to the soles of both shoes — do not crop,
do not zoom. Exactly two arms and two legs, clearly separated.
```

**เช็กก่อนผ่าน:** เอาไปวางข้าง Nyx ย่อให้สูงเท่ากัน หัวต้องดูโตพอ ๆ กัน
ถ้ายังผอมยาวอยู่ สั่งซ้ำโดยเน้น `head roughly one third of total height`

## ขั้นที่ 2 — ท่ายืน + ท่าวิ่ง ทำเป็นคลิป

ท่าวิ่งของ Nyx ที่ขาสลับซ้าย-ขวาจริงได้มาจาก**คลิป** ไม่ใช่ภาพนิ่งทีละท่า
พอท่ายืนผ่านแล้ว ให้เจนคลิปต่อโดยใช้ท่ายืนนั้นเป็น reference:

```
Animate this exact character: starts in the fighting stance, then runs
forward to the right in a full run cycle, legs alternating clearly.
Same art style, same proportions, same camera distance throughout.
Pure white background, no shadow, no ground line. Full body always visible.
```

ส่งคลิปมา เดี๋ยวตัดเฟรมให้ (`tools/cut.py` + `sheet_poses.py` รองรับอยู่แล้ว)

## ขั้นที่ 3 — ชีตท่าโจมตี

ทำทีหลังเมื่อเลือกชุดสกิลแล้ว — รูปแบบเดียวกับชีตหน้ากากของ Nyx
(6 ท่า 2 แถวแถวละ 3 หรือ 9 ท่า 3 แถวแถวละ 3 · ขนาดตัวเท่ากันทุกท่า · หันขวาหมด)

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, large head roughly one third of the total height, short limbs, bold dark outlines, flat cel shading with subtle texture, muted desaturated palette — match the attached reference proportions exactly. Character: a young man with spiky black hair and thin-rimmed glasses, fitted black short-sleeved t-shirt over a muscular build, loose light grey martial-arts trousers, black cloth belt tied at the waist with two short ends hanging, plain black flat cloth shoes. Bare hands, no weapons. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props. Full body visible from the top of the hair to the soles of both shoes — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

## วัดสเกลตัวนี้ยังไง

ตัวนี้**ไม่ใส่หน้ากาก** และผมไม่ได้ยาวคลุมหน้า → วัดได้ทั้งสองทางตามปกติ
`python3 tools/measure_sheet_scale.py <ไฟล์>` แล้วดูว่าค่าจากใบหน้ากับค่าจากผมตรงกันไหม
ต่างกันเกิน 15% = มีทางโดนบัง ให้ build แล้ววัดความสูงเฟรมจริงเทียบท่ายืน (ท่าตั้งหลัก 96-100%)
