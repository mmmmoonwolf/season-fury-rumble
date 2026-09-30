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

## ✅ ความเสี่ยงข้อ 1 — **ไม่จริง ยกเลิก** หมวกไอวอรีปลอดภัย

เคยเขียนไว้ว่าหมวกครีมจะถูกตัวตัดพื้นหลังกินไป 32% โดยอ้างตัวเลขจากการวัด
**ตัวเลขนั้นผิด และข้อสรุปก็ผิด**

ที่วัดรอบแรกคือ "กี่ % ของ*กรอบสี่เหลี่ยม*รอบหมวกเข้าเกณฑ์พื้นหลัง" ซึ่งนับพื้นหลังจริง
รอบ ๆ หมวกเข้าไปด้วยเต็ม ๆ — เลขนั้นไม่ได้บอกอะไรเกี่ยวกับตัวหมวกเลยสักนิด

วัดใหม่ให้ถูก: แยก "ก้อนพื้นหลังที่แตะขอบภาพ" (พื้นหลังจริง) ออกจาก "รูที่ถูกเจาะข้างในตัว"
แล้วระบายรูเป็นสีชมพูแล้วดูด้วยตา ผลคือ:

| สิ่งที่ถูกเจาะ | ถูกไหม |
|---|---|
| ช่องว่างกลางวงหาง | ✅ ถูกต้อง มันคือพื้นหลังที่หางล้อมไว้ ตัวตัดออกแบบมาให้เจาะรูแบบนี้ |
| ร่องเล็ก ๆ ระหว่างเส้นผม | ✅ ถูกต้อง เป็นพื้นหลังจริงที่ลอดผมออกมา |
| **หมวก / ผ้าคลุมหน้า** | **ไม่ถูกแตะเลยสักพิกเซล** |

ทดสอบทั้งแบบแทนอุ่นและแบบไอวอรี **ได้ผลเหมือนกัน** เพราะงานมีเส้นขอบเข้มกับเงาแบ่ง
พื้นที่อยู่แล้ว ไม่มีปื้นจืด-สว่างก้อนใหญ่เกิน 500 px ให้ตัวตัดจับ

> **บทเรียน (ซ้ำรอยเดิมอีกรอบ):** ตัวเลขจากกรอบที่เลือกเองมั่ว ๆ ไม่ได้พิสูจน์อะไร
> ต้อง render ออกมาแล้วดูว่าอะไรหายไปจริง — กฎเดียวกับที่ใช้จับบั๊ก sky2 ของ MARCH
> และกับ "เฟรมกลางกว้างสุด" ที่กลายเป็นหลักฐานปลอม

**ใช้ไอวอรี/กระดูกได้ตามต้องการ** ยังคงไว้ข้อเดียว: **ห้ามมีปื้นขาวล้วนเรียบ ๆ ใหญ่เกิน
~500 px** (ไม่มีเส้นขอบ ไม่มีเงา) เพราะนั่นคือสิ่งเดียวที่ตัวตัดกินจริง

## ⚠️ ความเสี่ยงข้อ 2 — **จริง และยืนยันแล้ว** ไม้บรรทัดวัดสเกลพัง

`build_scramble_alecto.py` ยึดสเกลจาก **"คางถึงพื้นรองเท้า"** โดย `chin_y()` จับ
**ก้อนสีผิวที่ใหญ่ที่สุดในครึ่งบนของตัว แล้วเอาขอบล่างสุด**

เอาท่ายืนใบใหม่มารันไม้บรรทัดตัวจริง:

| | y ของ "คาง" | คางถึงเท้า |
|---|---|---|
| เกณฑ์ที่ต้องได้ (Nyx/Helios) | — | **62%** ของความสูงตัว |
| ไม้บรรทัดปัจจุบัน | 165 | **79%** ❌ |
| ลองเปลี่ยนเป็น "ก้อนที่ต่ำที่สุด" | 347 | **55%** ❌ |

**สาเหตุ: มันไปจับเงาใต้ปีกหมวก** ซึ่งเป็นน้ำตาลที่เข้าเกณฑ์สีผิวพอดี และก้อนใหญ่ถึง
5,446 px ขณะที่หน้าเธอโผล่มาแค่แถบแคบ ๆ ระหว่างเงาหมวกกับผ้าคลุม
ก้อนสีผิวในครึ่งบนแตกเป็น 8 ก้อน ไม่มีก้อนไหนเป็น "คาง" เลย — เพราะ**คางไม่ได้โผล่**

**ปะด้วยการเลือกก้อนไม่ได้ ต้องเปลี่ยนจุดอ้างอิง** ตัวเลือกที่เหลือ:
แนวตา→เท้า · ขอบล่างปีกหมวก→เท้า · หรือความสูงทั้งตัวลบส่วนเผื่อหมวกแบบตายตัว
ทุกทางต้องไปวัดจุดเดียวกันบนท่ายืนของตัวอื่นก่อนเพื่อหาค่าคงที่ใหม่

> **ไม่บล็อกการเจนอาร์ต** เป็นงานฝั่ง builder ล้วน ๆ แก้ตอนต่อเข้าเกม
> แต่ต้องแก้ **ก่อน** build ชีตจริง ไม่งั้นเจนครบทุกใบแล้วมาพบว่าสเกลเพี้ยนทั้งตัว

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

## 1. ขั้น 0 — ท่ายืน · ✅ **ผ่านแล้ว** (`art_reference/alecto_idle_NEW.jpg`)

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

The hat and the face-wrap are IVORY / BONE — a pale warm off-white with soft
brown shading in the folds and under the brim. The hat has a darker brown
leather band around its base.

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

1. **ไม่มีปื้นขาวล้วนเรียบ ๆ ใหญ่** (ไม่มีเส้นขอบ ไม่มีเงา) บนหมวก/ผ้า/เกราะ/ปืน
   — ไอวอรีที่มีเงาและเส้นขอบปกติผ่านสบาย วัดแล้ว
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
- **หมวกกับผ้าคลุมสีไอวอรี/กระดูก** ทุกใบ ให้เหมือนท่ายืนที่อนุมัติแล้ว
- หมวกปีกกว้างต้องเห็นเต็มใบทุกท่า (มุม 3/4) — ตัวตัดใช้**พื้นที่หมวก**เป็นไม้บรรทัด
  วัดระยะกล้อง ท่าโปรไฟล์ด้านข้างล้วนทำให้ปีกหมวกหุบจนพื้นที่หายเกือบครึ่ง แล้ววัดผิด
  (ใบท่าเดินของตัวเดิมเจอปัญหานี้จริง มีทางแก้สำรองเขียนไว้ใน builder)

## สิ่งที่ห้ามใส่ทุกใบ

- ห้ามมีกระสุน/ลำแสง/ประกาย/ควันหลุดออกจากตัว — เกมวาดเอฟเฟคเองหมด
  และตัวตัดทิ้งก้อนที่หลุดจากตัวอยู่แล้ว
- ห้ามมีวงรัศมีรอบตัว ห้ามมีเส้นความเร็ว ห้ามมีรอยแตกพื้น ห้ามมีเงา ห้ามมีเส้นพื้น
- ห้ามมีปื้นขาวล้วนใหญ่เกินราว 500 px บนตัวละคร (จะถูกตัดเป็นรู)

---

## 2. ชีต E — สามท่าหาง (9 ท่า · 3×3) · ✅ **รับแล้ว**

`art_reference/alecto_sheets_new/sheet_E.jpg` (ใบสำรองที่ดีรองลงมา: `sheet_E_alt.jpg`)

| แถว | ท่า | กรอบชนจริง | เฟรมกลางต้องเป็น |
|---|---|---|---|
| 1 | `hook1` ตะขอ | กว้าง 260 สูง 44 ระดับอก **แนวนอน** | หางเหยียดไปหน้าสุด |
| 2 | `slam1` ทุบลง | กว้าง 130 สูง 170 **แนวตั้ง** | หางฟาดลงถึงพื้น |
| 3 | `quill1` ปักหาง | ไม่มีกรอบชน (หนามเป็นตัวตี) | ปลายหางจมในพื้น |

### ⚠️ กฎที่ห้ามพลาด: เฟรมกลาง = จังหวะที่กล่องชนเปิด

เอนจิ้นเลือกเฟรมจาก*ช่วงของท่า* ไม่ใช่จากเวลา — `{startup:1, active:2, recovery:3}`
**เฟรมที่ 2 ของทุกแถวคือเฟรมที่โดนตัวจริง** ถ้ามันไม่ใช่ท่าเหยียดสุด ผู้เล่นจะเห็นว่า
"ท่านี้ไม่มีอะไรเกิดขึ้น" (กับดักที่เกิดจริงกับ MARCH ใบ H)

**วิธีตรวจ: ตัดเฉพาะคอลัมน์กลางของทุกใบมาเรียงกันแล้วดูอย่างเดียว** ทำแบบนี้กับห้าใบที่เจนมา
แล้วเห็นผลต่างทันที:

| | แถว 1 | แถว 2 | แถว 3 |
|---|---|---|---|
| **ใบที่เลือก** | ✓ เหยียดตรงยาว | ✓ ปลายจิ้มพื้น | ✓✓ ตั้งดิ่งปักลงดิน |
| ใบ 2 | ✗ ชี้กลับทาง (ปืนขวา หางซ้าย) | ✗ ปลายอยู่ระดับเอว | ✗ โค้งข้างตัว |
| ใบ 3 | ✓ | ✓ | ✗ **เหมือนแถว 2 เกือบเป๊ะ** |
| ใบ 4 | ✓✓ ยาวสุด | ✗ หางชี้ขึ้น ไม่ใช่ท่าทุบ | ✓✓ ดิ่งลงดิน |
| ใบ 5 | ✓ | ✓ | ✗ เหมือนแถว 2 |

ข้อที่พลาดกันบ่อยสุดคือ **แถว 2 กับแถว 3 ออกมาเหมือนกัน** (หางโค้งลงพื้นทั้งคู่)
ต้องสั่งให้แถว 3 เป็น "ดิ่งลงตรง ๆ แข็ง ไม่โค้ง" ให้ชัด

### ผลรันตัวตัดจริง — ผ่าน

ทั้ง 9 ช่องอ่านได้ **ชิ้นเดียวทุกช่อง** ไม่มีก้อนหลงเหลือ (ประกายที่หลุดจากตัวถูกทิ้งเอง
เพราะเล็กกว่า `part_min`) และขนาดตัวสม่ำเสมอ 29,748-34,402 px

---

## ⚠️ ไม้บรรทัดทั้งสองอันของ builder พังกับดีไซน์ใหม่

ทั้งคู่ผูกกับ**สีของตัวละครเก่า** (คาวเกิร์ลหมวกแดง) จึงใช้กับตัวใหม่ไม่ได้เลย

| ไม้บรรทัด | ใช้ทำอะไร | อาการ |
|---|---|---|
| `chin_y()` | สเกลสัมบูรณ์จากคลิป | จับเงาใต้ปีกหมวก → คางถึงเท้า **79%** (เกณฑ์ 62%) |
| `hat_sqrt()` | ระยะกล้องต่อชีต | ตรวจ**สีแดง** (`r>95 & r<190 & g<75 & b<85`) → **คืน 0 ทุกท่า** |

### ตัวแทนที่ทดสอบแล้วว่าใช้ได้ — `hat_sqrt`

วัดพื้นที่ **ไอวอรีในช่วงบน 42%** แทนสีแดง ผลกับชีต E ทั้งเก้าท่า:

```
(r>150) & (g>135) & (b>95) & ((r-b)>18) & ((r-g)<40)
```

| | กระจายทั้งใบ |
|---|---|
| **พื้นที่ไอวอรีช่วงบน** | **6.8%** (ทุกท่าอยู่ใน ±3.4%) ✅ |
| ความกว้างสูงสุดช่วงบน (ไม่พึ่งสี) | 52.3% ❌ หางเข้ามาในแถบบนบางท่า |

### `chin_y` ยังไม่มีตัวแทน

คางไม่ได้โผล่เลยเพราะผ้าคลุมปิดอยู่ ปะด้วยการเลือกก้อนไม่ได้ (ลองเอาก้อนต่ำสุดได้ 55%
ก็ยังผิด) ต้องเปลี่ยนจุดอ้างอิงเป็นแนวตา หรือขอบล่างปีกหมวก **แล้วไปวัดจุดเดียวกัน
บนท่ายืนของตัวอื่นเพื่อหาค่าคงที่ใหม่** — งานนี้ต้องทำก่อน build ชีตจริง

### รอบสอง: เจนมาอีกห้าใบ — เอาคนละแถวจากคนละใบ

**สี่ในห้าใบเลื่อนออกนอกสเปก** แถว 2 กับ 3 กลายเป็นท่าปืน (มีแฟลชปากกระบอก ควัน)
กับท่าเอฟเฟควงม่วงรอบตัว ซึ่งไม่ใช่สามท่าหางที่สั่ง — เหลือใบเดียวที่ยังเป็นชีต E จริง
เก็บเป็น `sheet_E2.jpg`

เทียบเฟรมกลางทีละแถวกับใบเดิม แล้วตัดออกมาวางบนพื้นเข้มแบบที่เกมวาดจริง:

| แถว | ใบเดิม (`sheet_E`) | ใบใหม่ (`sheet_E2`) | เอาอันไหน |
|---|---|---|---|
| 1 `hook1` | หางเป็นเส้นบางอยู่ใต้ปืน ปืนเด่นกว่าหาง | **หางพาดทั้งลำตัวระดับอก แข็งเหมือนหอก ปลายเป็นจุดไกลสุดชัด** | **E2** |
| 2 `slam1` | หางโค้งลงจิ้มพื้น ประกายเล็ก สะอาด | **เส้นเอฟเฟคม่วงติดมาในภาพ ตัดออกมาแล้วดูเหมือนมีหางสองเส้น** | **E** |
| 3 `quill1` | ปักดิ่ง ย่อตัวต่ำ อ่านว่ากำลังอัดลงดิน | ปักดิ่งเหมือนกัน แต่ยืนตรงกว่า | **E** |

```python
"hook1":  ("E2", [1, 2, 3], GROUND),
"slam1":  ("E",  [4, 5, 6], GROUND),
"quill1": ("E",  [7, 8, 9], GROUND),
```

ต้องเพิ่ม `"E2": (3, 3)` เข้า `LAYOUT` ใน `tools/alecto_sheets.py` ด้วย

> **บทเรียน: เอฟเฟคที่วาดติดมาในชีตมองไม่ออกตอนดูใบเต็ม** เส้นม่วงของแถว 2 ดูเหมือน
> เส้นบอกทิศทางเฉย ๆ บนพื้นขาว แต่พอตัดพื้นออกแล้ววางบนเวทีมืด มันกลายเป็นวัตถุทึบ
> ที่ต่อกับตัวละคร ตัวตัดเก็บมาด้วยเพราะมันเชื่อมกับหาง **ต้องตัดออกมาดูบนพื้นเข้มเสมอ**

---

# ชีตที่เหลือทั้งห้าใบ

**ทุกใบแนบ `art_reference/alecto_idle_NEW.jpg` ไปด้วยเสมอ** แล้วต่อ **บล็อกสไตล์ร่วม**
ข้างล่างนี้ไว้ท้าย prompt ของทุกใบ (เหมือนกันทุกใบ ไม่ต้องแก้)

### บล็อกสไตล์ร่วม — ต่อท้ายทุกใบ

```
Chibi-proportioned anime game sprite, large head roughly one third of the total height, short sturdy limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference exactly. Character: a lean gunslinger woman with long wavy SILVER-WHITE hair loose to her shoulders, dark skin, sharp narrow eyes, a level unimpressed expression. A wide-brimmed cowboy hat and a torn cloth face-wrap covering her nose, mouth and chin, both IVORY / BONE with soft brown shading in the folds, the hat with a darker brown leather band. Close-fitting segmented armour in dark charcoal gunmetal over shoulders, arms, torso and legs. Brown leather belt with a metal buckle. Black fingerless gloves, dark heavy boots. Growing from her RIGHT SHOULDER is a long mechanical scorpion tail of chunky armoured segments, each joint glowing VIOLET, ending in a smooth curved barb — the tail must visibly ATTACH TO HER SHOULDER PLATE in every pose, it is part of her, never a floating object, and it stays curled compactly behind her within about one body-width unless the pose says otherwise. Violet is the ONLY accent colour: the tail joints and the glow in the revolvers. Three-quarter view, body angled toward the viewer's right, in every pose. The WIDE HAT BRIM must be fully visible and read as a full oval in every pose — never turn her to a flat side profile where the brim collapses to a line. Pure white background. No ground line, no shadow, no props, no text, no labels, no panel borders, no numbers. No effects of any kind: no muzzle flash, no sparks, no smoke, no glow haze, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself. Nothing detached from her body anywhere in the image. Exactly two arms, two legs and one tail per pose, clearly separated, do not overlap or duplicate limbs. No large flat patches of pure white anywhere on her hat, wrap, armour or guns — shading and outlines everywhere. Identical camera distance and identical character size in every pose. Full body visible from the top of the hat to the soles of both boots in every pose — do not crop, do not zoom. Leave a clear band of empty white space around every pose; nothing may touch or run off the edge of the image or overlap the neighbouring pose.
```

---

## ชีต A — เคลื่อนไหวและท่าโดน (9 ท่า · 3×3)

**ใบนี้ไม่ใช่ท่าตี** ทุกช่องเป็นท่าเดี่ยวที่เกมหยิบไปใช้คนละที่ ไม่ได้เรียงเป็นคอมโบ
**ช่องที่ 2-5 เป็นวงจรกระโดดที่ต้องต่อกันลื่น** นอกนั้นเป็นท่าเดี่ยว

| ช่อง | ท่า | ใช้ตอนไหน |
|---|---|---|
| 1 | ย่อ | กดลง · และเป็นท่าการ์ดต่ำ |
| 2-5 | กระโดด 4 จังหวะ | ถีบพื้น → ลอยขึ้น → ร่วงลง → ย่อรับพื้น |
| 6 | เจ็บ | โดนตี |
| 7 | ล้มนอน | โดนหนัก · และเป็นท่าลุก |
| 8 | กลิ้งลุก | กดตอนล้ม |
| 9 | การ์ด | กดบล็อก |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

These are NOT attacks. Each pose is a separate body state the game uses on its
own, except poses 2-5 which are one jump broken into four moments and must flow
into each other.

1 CROUCHING: knees deeply bent, hips low, head tucked down, both revolvers held
  close to her chest. Compact and small.
2 JUMP LAUNCH: still on the ground but exploding upward, legs straightening hard,
  body stretched tall, arms dropping behind her.
3 RISING: fully airborne, legs tucked up under her, body compact, arms in close.
4 FALLING: airborne, legs starting to reach down for the ground, arms out a
  little for balance, body angled slightly forward.
5 LANDING: feet just touching down, knees absorbing the impact in a deep bend,
  head low, one hand near the ground.
6 HURT: head snapped back, torso recoiling backward, one arm flung out, knees
  buckling — clearly taking a hit, not attacking.
7 KNOCKED DOWN: lying on the ground on her back, hat still on, limbs loose, one
  knee slightly raised. Read flat and low.
8 GETTING UP: mid-roll, body curled and tipped onto one shoulder, pushing off the
  ground with one hand, about to come back to her feet.
9 GUARDING: both forearms raised crossed in front of her face and chest, elbows
  in, shoulders hunched, weight on the back foot, both revolvers still in hand.
```

---

## ชีต B — ชุดแย็บปืน (9 ท่า · 3×3)

แต่ละแถวเป็นท่าเดียว สามจังหวะ **เฟรมกลาง = จังหวะที่กระสุนออก**

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `jab1` Hip Fire | ยิงเร็วจากสะโพก เดินยิงได้ |
| 2 | `jab2` Hip Fire | ยิงอีกกระบอก เดินยิงได้ |
| 3 | `jab3` Kick Back | **ยิงสองนัดพร้อมกัน** ปักเท้า ดันตัวเองถอย |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended and most braced pose of its row — obvious at a glance.

ROW 1 — a fast snap shot from the hip with her RIGHT revolver, while moving.
  1a the right gun coming up from her hip, elbow still bent, weight forward.
  1b THE SHOT: the right arm punched out straight and level at chest height, the
     gun horizontal, wrist locked, her shoulder driven behind it. Left gun stays
     low at her side.
  1c the right arm recoiling, gun kicking up and back, elbow folding again.

ROW 2 — the same fast snap shot but with her LEFT revolver, mirrored in her body
  while she still faces the same way.
  2a the left gun coming up across her body, elbow bent, torso rotating.
  2b THE SHOT: the left arm punched out straight and level at chest height, gun
     horizontal, torso turned in behind it. Right gun low.
  2c the left arm recoiling, gun kicking up, torso unwinding.

ROW 3 — she plants both feet and fires BOTH revolvers at once, and the recoil
  shoves her backward.
  3a both guns drawn in tight against her ribs, knees bending, feet setting wide
     and firm — bracing for it.
  3b THE SHOT: BOTH arms punched straight out together at chest height, both guns
     horizontal and level, body squared up hard behind them, both feet dug in.
     This is the widest and most planted pose on the whole sheet.
  3c both arms thrown up and back by the recoil, guns pointing skyward, her upper
     body leaning back, one foot sliding back to catch herself.
```

---

## ชีต C — ปืนกดทิศ (9 ท่า · 3×3)

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `side` Walking Fire | **ถอยหลังพลางยิงพลาง** ไม้ใช้ตอนโดนไล่ |
| 2 | `up` Skyward Shot | ยิงเฉียงขึ้นสวนคนกระโดด |
| 3 | `down` Knee Shot | **ย่อตัวลงยิงต่ำ** ลอดท่าที่ตีสูง |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended pose of its row — obvious at a glance.

ROW 1 — she is BACKING AWAY while shooting, giving ground on purpose.
  1a stepping backward, her back foot reaching behind her, right gun rising.
  1b THE SHOT: still mid-backward-step, weight on the back foot, right arm out
     straight and level at chest height firing forward while her body travels the
     other way. Head and gun stay aimed forward even as she retreats.
  1c weight settling onto the back foot, gun recoiling up, other foot dragging.

ROW 2 — she fires UP at a steep angle to catch someone jumping in.
  2a knees bending slightly, chin lifting, right gun swinging upward.
  2b THE SHOT: the right arm extended straight up and forward at roughly 45
     degrees above horizontal, gun pointing high, her head tipped back looking up
     along the barrel, chest opened. The gun is the HIGHEST point of the pose.
  2c the arm recoiling further back over her shoulder, her head coming down.

ROW 3 — she drops onto one knee and fires LOW along the ground.
  3a dropping, one knee bending toward the ground, torso lowering.
  3b THE SHOT: down on one knee, the other leg folded under her, body low and
     compact, right arm extended straight forward at knee height, gun horizontal
     and close to the ground. This is the LOWEST pose on the whole sheet — her
     head is clearly below where it sits in the other rows.
  3c still low, gun recoiling upward, her free hand touching the ground.
```

---

## ชีต D — ปืนกลางอากาศ (9 ท่า · 3×3)

**ทั้งเก้าท่าลอยทั้งหมด** ไม่มีเท้าแตะพื้นสักท่า ไม่มีเส้นพื้น

| แถว | ท่า | ทิศกระสุน |
|---|---|---|
| 1 | `nair` Air Fire | **ยิงตรง** = ไม้อากาศต่ออากาศ |
| 2 | `sair` Dive Fire | เฉียงลงเล็กน้อย + พุ่งไปข้างหน้า |
| 3 | `dair` Dive Shot | **ยิงลงชัน 69 องศา** ใส่คนที่อยู่ใต้ตัว |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

ALL NINE poses are fully AIRBORNE — both feet clear of the ground, nothing below
her, legs tucked or trailing. No ground line anywhere.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended pose of its row.

ROW 1 — floating, firing STRAIGHT AHEAD at another airborne target.
  1a airborne, legs tucked, right gun coming up across her chest.
  1b THE SHOT: right arm straight out level at chest height, gun horizontal and
     pointing dead ahead, her body upright and squared behind it, legs tucked.
  1c the arm recoiling, gun kicking up, body starting to tilt.

ROW 2 — she LUNGES FORWARD through the air while firing slightly downward.
  2a airborne, body coiling, leading knee drawn up, right gun tucked in.
  2b THE SHOT: her whole body stretched FORWARD along the direction of travel,
     leading leg extended ahead, right arm out straight and angled slightly DOWN
     from horizontal, gun following that line. She reads as diving forward.
  2c still stretched forward, gun recoiling, trailing leg swinging through.

ROW 3 — she fires STEEPLY DOWN at someone below her.
  3a airborne, body folding forward at the waist, looking down, gun swinging down.
  3b THE SHOT: her torso pitched sharply forward and down, both knees pulled up
     behind her, the right arm extended straight DOWN and only slightly forward —
     close to vertical, aiming at the ground beneath her. The gun is the LOWEST
     point of the pose and clearly points down, not sideways.
  3c the arm recoiling back up, body beginning to straighten.
```

---

## ชีต F — ท่าถอย (6 ท่า · 2×3)

**ใบนี้เป็นตาราง 2 แถว 3 คอลัมน์** ไม่ใช่ 3×3

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `hop` Backstep | กระโดดถอย ไว แต่ไม่มีอมตะ |
| 2 | `roll` Roll Back | กลิ้งถอย ช้ากว่าแต่รอด — **ท่าป้องกันตัวท่าเดียวของเธอ** |

```
A 2x3 sprite sheet of the same character: 2 rows, 3 columns, 6 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Neither row is an attack — both are retreats. She keeps both revolvers in hand
throughout but never aims or fires.

ROW 1 — a quick BACKWARD HOP.
  1a crouching to load the hop, knees bent, weight dropping, both guns held in.
  1b mid-hop: airborne and travelling BACKWARD, both feet off the ground and
     swept forward ahead of her, body leaning back, arms tucked. She is clearly
     moving away from the direction she faces.
  1c landing out of the hop, feet catching the ground behind her, knees bending,
     torso still leaning back.

ROW 2 — a low BACKWARD ROLL along the ground.
  2a dropping into it: knees folding, one shoulder dipping backward, head tucking.
  2b mid-roll: her body curled into a tight ball low to the ground, tipped onto
     her back and shoulder, knees pulled into her chest, hat still on her head.
     This is the LOWEST and most compact pose on the sheet.
  2c coming out of the roll: rising onto one knee, one hand pushing off the
     ground, head lifting, about to stand.
```

---

## ตรวจก่อนรับ — ใช้ได้กับทุกใบ

1. **เฟรมกลางของทุกแถวคือจังหวะที่ยิง/ตี** (ใบ A กับ F ไม่มีข้อนี้ เพราะไม่ใช่ท่าตี)
   วิธีตรวจ: **ตัดเฉพาะคอลัมน์กลางมาดูอย่างเดียว** ต้องอ่านออกทันทีว่ากำลังทำอะไร
2. **ปีกหมวกเป็นวงรีเต็มใบทุกท่า** — ตัวตัดใช้พื้นที่หมวกเป็นไม้บรรทัดวัดระยะกล้อง
   ท่าโปรไฟล์ด้านข้างทำให้ปีกหุบจนวัดผิดทั้งใบ
3. **หางติดไหล่เห็นจุดต่อทุกท่า** และไม่กางเกินหนึ่งช่วงตัว
4. **ปืนอยู่ในมือทั้งสองข้างทุกท่า** (ยกเว้นท่าล้มที่มือหลวมได้ แต่ปืนยังอยู่)
5. **ไม่มีเอฟเฟคใด ๆ วาดติดมา** — ไม่มีแฟลชปากกระบอก ควัน เส้นความเร็ว ฝุ่น
   **ข้อนี้พลาดมาแล้วกับชีต E** เส้นเอฟเฟคม่วงมองไม่ออกตอนดูบนพื้นขาว แต่พอตัดพื้น
   ออกแล้ววางบนเวทีมืดมันกลายเป็นวัตถุทึบที่ต่อกับตัวละคร
6. **ตารางสม่ำเสมอ ขนาดตัวเท่ากันทุกช่อง** ตัวตัดหารช่องตายตัว ตารางเบี้ยว = จับผิดช่องทั้งใบ

ได้แล้ววางที่ `art_reference/alecto_sheets_new/sheet_<A|B|C|D|F>.jpg`

---

# ชีตที่เหลือทั้งห้าใบ

**ทุกใบแนบ `art_reference/alecto_idle_NEW.jpg` ไปด้วยเสมอ** แล้วต่อ **บล็อกสไตล์ร่วม**
ข้างล่างนี้ไว้ท้าย prompt ของทุกใบ (เหมือนกันทุกใบ ไม่ต้องแก้)

### บล็อกสไตล์ร่วม — ต่อท้ายทุกใบ

```
Chibi-proportioned anime game sprite, large head roughly one third of the total height, short sturdy limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference exactly. Character: a lean gunslinger woman with long wavy SILVER-WHITE hair loose to her shoulders, dark skin, sharp narrow eyes, a level unimpressed expression. A wide-brimmed cowboy hat and a torn cloth face-wrap covering her nose, mouth and chin, both IVORY / BONE with soft brown shading in the folds, the hat with a darker brown leather band. Close-fitting segmented armour in dark charcoal gunmetal over shoulders, arms, torso and legs. Brown leather belt with a metal buckle. Black fingerless gloves, dark heavy boots. Growing from her RIGHT SHOULDER is a long mechanical scorpion tail of chunky armoured segments, each joint glowing VIOLET, ending in a smooth curved barb — the tail must visibly ATTACH TO HER SHOULDER PLATE in every pose, it is part of her, never a floating object, and it stays curled compactly behind her within about one body-width unless the pose says otherwise. Violet is the ONLY accent colour: the tail joints and the glow in the revolvers. Three-quarter view, body angled toward the viewer's right, in every pose. The WIDE HAT BRIM must be fully visible and read as a full oval in every pose — never turn her to a flat side profile where the brim collapses to a line. Pure white background. No ground line, no shadow, no props, no text, no labels, no panel borders, no numbers. No effects of any kind: no muzzle flash, no sparks, no smoke, no glow haze, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself. Nothing detached from her body anywhere in the image. Exactly two arms, two legs and one tail per pose, clearly separated, do not overlap or duplicate limbs. No large flat patches of pure white anywhere on her hat, wrap, armour or guns — shading and outlines everywhere. Identical camera distance and identical character size in every pose. Full body visible from the top of the hat to the soles of both boots in every pose — do not crop, do not zoom. Leave a clear band of empty white space around every pose; nothing may touch or run off the edge of the image or overlap the neighbouring pose.
```

---

## ชีต A — เคลื่อนไหวและท่าโดน (9 ท่า · 3×3)

**ใบนี้ไม่ใช่ท่าตี** ทุกช่องเป็นท่าเดี่ยวที่เกมหยิบไปใช้คนละที่ ไม่ได้เรียงเป็นคอมโบ
ยกเว้นช่อง 2-5 ที่เป็นวงจรกระโดดซึ่งต้องต่อกันลื่น

| ช่อง | ท่า | ใช้ตอนไหน |
|---|---|---|
| 1 | ย่อ | กดลง · และเป็นท่าการ์ดต่ำ |
| 2-5 | กระโดด 4 จังหวะ | ถีบพื้น → ลอยขึ้น → ร่วงลง → ย่อรับพื้น |
| 6 | เจ็บ | โดนตี |
| 7 | ล้มนอน | โดนหนัก · และเป็นท่าลุก |
| 8 | กลิ้งลุก | กดตอนล้ม |
| 9 | การ์ด | กดบล็อก |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

These are NOT attacks. Each pose is a separate body state the game uses on its
own, except poses 2-5 which are one jump broken into four moments and must flow
into each other.

1 CROUCHING: knees deeply bent, hips low, head tucked down, both revolvers held
  close to her chest. Compact and small.
2 JUMP LAUNCH: still on the ground but exploding upward, legs straightening hard,
  body stretched tall, arms dropping behind her.
3 RISING: fully airborne, legs tucked up under her, body compact, arms in close.
4 FALLING: airborne, legs starting to reach down for the ground, arms out a
  little for balance, body angled slightly forward.
5 LANDING: feet just touching down, knees absorbing the impact in a deep bend,
  head low, one hand near the ground.
6 HURT: head snapped back, torso recoiling backward, one arm flung out, knees
  buckling — clearly taking a hit, not attacking.
7 KNOCKED DOWN: lying on the ground on her back, hat still on, limbs loose, one
  knee slightly raised. Read flat and low.
8 GETTING UP: mid-roll, body curled and tipped onto one shoulder, pushing off the
  ground with one hand, about to come back to her feet.
9 GUARDING: both forearms raised crossed in front of her face and chest, elbows
  in, shoulders hunched, weight on the back foot, both revolvers still in hand.
```

---

## ชีต B — ชุดแย็บปืน (9 ท่า · 3×3)

แต่ละแถวเป็นท่าเดียว สามจังหวะ **เฟรมกลาง = จังหวะที่กระสุนออก**

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `jab1` Hip Fire | ยิงเร็วจากสะโพก เดินยิงได้ |
| 2 | `jab2` Hip Fire | ยิงอีกกระบอก เดินยิงได้ |
| 3 | `jab3` Kick Back | **ยิงสองนัดพร้อมกัน** ปักเท้า ดันตัวเองถอย |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended and most braced pose of its row — obvious at a glance.

ROW 1 — a fast snap shot from the hip with her RIGHT revolver, while moving.
  1a the right gun coming up from her hip, elbow still bent, weight forward.
  1b THE SHOT: the right arm punched out straight and level at chest height, the
     gun horizontal, wrist locked, her shoulder driven behind it. Left gun stays
     low at her side.
  1c the right arm recoiling, gun kicking up and back, elbow folding again.

ROW 2 — the same fast snap shot but with her LEFT revolver, mirrored in her body
  while she still faces the same way.
  2a the left gun coming up across her body, elbow bent, torso rotating.
  2b THE SHOT: the left arm punched out straight and level at chest height, gun
     horizontal, torso turned in behind it. Right gun low.
  2c the left arm recoiling, gun kicking up, torso unwinding.

ROW 3 — she plants both feet and fires BOTH revolvers at once, and the recoil
  shoves her backward.
  3a both guns drawn in tight against her ribs, knees bending, feet setting wide
     and firm — bracing for it.
  3b THE SHOT: BOTH arms punched straight out together at chest height, both guns
     horizontal and level, body squared up hard behind them, both feet dug in.
     This is the widest and most planted pose on the whole sheet.
  3c both arms thrown up and back by the recoil, guns pointing skyward, her upper
     body leaning back, one foot sliding back to catch herself.
```

---

## ชีต C — ปืนกดทิศ (9 ท่า · 3×3)

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `side` Walking Fire | **ถอยหลังพลางยิงพลาง** ไม้ใช้ตอนโดนไล่ |
| 2 | `up` Skyward Shot | ยิงเฉียงขึ้นสวนคนกระโดด |
| 3 | `down` Knee Shot | **ย่อตัวลงยิงต่ำ** ลอดท่าที่ตีสูง |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended pose of its row — obvious at a glance.

ROW 1 — she is BACKING AWAY while shooting, giving ground on purpose.
  1a stepping backward, her back foot reaching behind her, right gun rising.
  1b THE SHOT: still mid-backward-step, weight on the back foot, right arm out
     straight and level at chest height firing forward while her body travels the
     other way. Head and gun stay aimed forward even as she retreats.
  1c weight settling onto the back foot, gun recoiling up, other foot dragging.

ROW 2 — she fires UP at a steep angle to catch someone jumping in.
  2a knees bending slightly, chin lifting, right gun swinging upward.
  2b THE SHOT: the right arm extended straight up and forward at roughly 45
     degrees above horizontal, gun pointing high, her head tipped back looking up
     along the barrel, chest opened. The gun is the HIGHEST point of the pose.
  2c the arm recoiling further back over her shoulder, her head coming down.

ROW 3 — she drops onto one knee and fires LOW along the ground.
  3a dropping, one knee bending toward the ground, torso lowering.
  3b THE SHOT: down on one knee, the other leg folded under her, body low and
     compact, right arm extended straight forward at knee height, gun horizontal
     and close to the ground. This is the LOWEST pose on the whole sheet — her
     head is clearly below where it sits in the other rows.
  3c still low, gun recoiling upward, her free hand touching the ground.
```

---

## ชีต D — ปืนกลางอากาศ (9 ท่า · 3×3)

**ทั้งเก้าท่าลอยทั้งหมด** ไม่มีเท้าแตะพื้นสักท่า ไม่มีเส้นพื้น

| แถว | ท่า | ทิศกระสุน |
|---|---|---|
| 1 | `nair` Air Fire | **ยิงตรง** = ไม้อากาศต่ออากาศ |
| 2 | `sair` Dive Fire | เฉียงลงเล็กน้อย + พุ่งไปข้างหน้า |
| 3 | `dair` Dive Shot | **ยิงลงชัน 69 องศา** ใส่คนที่อยู่ใต้ตัว |

```
A 3x3 sprite sheet of the same character: 3 rows, 3 columns, 9 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

ALL NINE poses are fully AIRBORNE — both feet clear of the ground, nothing below
her, legs tucked or trailing. No ground line anywhere.

Each ROW is one shooting action in three moments: wind-up, the shot, recovery.
In EVERY row the MIDDLE pose is the instant the gun fires and must be the most
extended pose of its row.

ROW 1 — floating, firing STRAIGHT AHEAD at another airborne target.
  1a airborne, legs tucked, right gun coming up across her chest.
  1b THE SHOT: right arm straight out level at chest height, gun horizontal and
     pointing dead ahead, her body upright and squared behind it, legs tucked.
  1c the arm recoiling, gun kicking up, body starting to tilt.

ROW 2 — she LUNGES FORWARD through the air while firing slightly downward.
  2a airborne, body coiling, leading knee drawn up, right gun tucked in.
  2b THE SHOT: her whole body stretched FORWARD along the direction of travel,
     leading leg extended ahead, right arm out straight and angled slightly DOWN
     from horizontal, gun following that line. She reads as diving forward.
  2c still stretched forward, gun recoiling, trailing leg swinging through.

ROW 3 — she fires STEEPLY DOWN at someone below her.
  3a airborne, body folding forward at the waist, looking down, gun swinging down.
  3b THE SHOT: her torso pitched sharply forward and down, both knees pulled up
     behind her, the right arm extended straight DOWN and only slightly forward —
     close to vertical, aiming at the ground beneath her. The gun is the LOWEST
     point of the pose and clearly points down, not sideways.
  3c the arm recoiling back up, body beginning to straighten.
```

---

## ชีต F — ท่าถอย (6 ท่า · **2×3**)

**ใบนี้เป็นตาราง 2 แถว 3 คอลัมน์** ไม่ใช่ 3×3

| แถว | ท่า | ลักษณะ |
|---|---|---|
| 1 | `hop` Backstep | กระโดดถอย ไว แต่ไม่มีอมตะ |
| 2 | `roll` Roll Back | กลิ้งถอย ช้ากว่าแต่รอด — **ท่าป้องกันตัวท่าเดียวของเธอ** |

```
A 2x3 sprite sheet of the same character: 2 rows, 3 columns, 6 poses total,
evenly spaced in a clean grid, read left to right, top to bottom. No pose
touching another, no grid lines drawn.

Neither row is an attack — both are retreats. She keeps both revolvers in hand
throughout but never aims or fires.

ROW 1 — a quick BACKWARD HOP.
  1a crouching to load the hop, knees bent, weight dropping, both guns held in.
  1b mid-hop: airborne and travelling BACKWARD, both feet off the ground and
     swept forward ahead of her, body leaning back, arms tucked. She is clearly
     moving away from the direction she faces.
  1c landing out of the hop, feet catching the ground behind her, knees bending,
     torso still leaning back.

ROW 2 — a low BACKWARD ROLL along the ground.
  2a dropping into it: knees folding, one shoulder dipping backward, head tucking.
  2b mid-roll: her body curled into a tight ball low to the ground, tipped onto
     her back and shoulder, knees pulled into her chest, hat still on her head.
     This is the LOWEST and most compact pose on the sheet.
  2c coming out of the roll: rising onto one knee, one hand pushing off the
     ground, head lifting, about to stand.
```

---

## ตรวจก่อนรับ — ใช้ได้กับทุกใบ

1. **เฟรมกลางของทุกแถวคือจังหวะที่ยิง** (ใบ A กับ F ไม่มีข้อนี้ เพราะไม่ใช่ท่าตี)
   วิธีตรวจ: **ตัดเฉพาะคอลัมน์กลางมาดูอย่างเดียว** ต้องอ่านออกทันทีว่ากำลังทำอะไร
2. **ปีกหมวกเป็นวงรีเต็มใบทุกท่า** — ตัวตัดใช้พื้นที่หมวกเป็นไม้บรรทัดวัดระยะกล้อง
   ท่าโปรไฟล์ด้านข้างทำให้ปีกหุบจนวัดผิดทั้งใบ
3. **หางติดไหล่เห็นจุดต่อทุกท่า** และไม่กางเกินหนึ่งช่วงตัว
4. **ปืนอยู่ในมือทั้งสองข้างทุกท่า** (ท่าล้มมือหลวมได้ แต่ปืนยังต้องอยู่)
5. **ไม่มีเอฟเฟคใด ๆ วาดติดมา** — ไม่มีแฟลชปากกระบอก ควัน เส้นความเร็ว ฝุ่น
   **ข้อนี้พลาดมาแล้วกับชีต E** เส้นเอฟเฟคม่วงมองไม่ออกตอนดูบนพื้นขาว แต่พอตัดพื้น
   ออกแล้ววางบนเวทีมืดมันกลายเป็นวัตถุทึบที่ต่อกับตัวละคร
6. **ตารางสม่ำเสมอ ขนาดตัวเท่ากันทุกช่อง** ตัวตัดหารช่องตายตัว ตารางเบี้ยว = จับผิดช่องทั้งใบ

ได้แล้ววางที่ `art_reference/alecto_sheets_new/sheet_<A|B|C|D|F>.jpg`

---

## หลัง build ครบแล้วต้องเก็บกวาดอะไรบ้าง

- ลบเงื่อนไขหมวก**แดง**ใน `hat_sqrt()` และค่าชดเชย `IVORY_K` ทิ้ง แล้วปรับสเกลตรง ๆ แทน
- แก้ `chin_y()` — คางไม่โผล่เพราะผ้าคลุมปิด ต้องเปลี่ยนจุดอ้างอิง (ดูหัวข้อความเสี่ยงข้อ 2)
  **ข้อนี้บังคับ** เพราะคลิปวิ่งใบใหม่จะเข้ามาแทนคลิปเก่าที่ยังใช้ไม้บรรทัดคางได้อยู่
- ลบ `artAs` ที่เหลือทั้งหมดใน `ScrambleScene.js` แล้วเปลี่ยน `attacks` เป็นชื่อท่าจริง
- ลบ `gunStance` กับ `anims.runGun` / `anims.idleGun` — ดีไซน์ใหม่ถือปืนตลอดเวลา
  ท่ายืนกับท่าวิ่งปกติคือท่าถือปืนอยู่แล้ว ไม่ต้องมีสองชุด
- ขยับ `VERSION` ใน `sw.js`
