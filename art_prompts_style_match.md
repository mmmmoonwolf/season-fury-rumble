# เจนตัวละครใหม่ให้ลายเส้นเข้ากับแมพ

## วิเคราะห์ก่อน: ทำไมตอนนี้มันไม่กลืน

เอาภาพในเกมมาดูแล้ว ปัญหาไม่ได้อยู่ที่ "ลายเส้น" อย่างเดียว มี 3 ชั้นซ้อนกัน และแก้คนละวิธี

**1. ค่าความสว่าง (แก้ด้วยโค้ดแล้ว ไม่ต้อง gen ใหม่)**
แมพเป็นฉากกลางคืน/พลบค่ำที่มืดและมีแสงสีของตัวเอง แต่ตัวละครวาดบนพื้นขาวแสงกลาง ๆ พอวางทับเลยสว่างลอยเหมือนสติกเกอร์ โดยเฉพาะชุดขาวของ Dear
→ ใส่ `characterTint` ต่อแมพให้แล้ว (คูณสีตัวละครให้เข้าโทนแมพ) เห็นผลทันทีตอนเปิดเกม

**2. ลายเส้นและการลงเงา (ต้อง gen ใหม่ — คือสิ่งที่ขอมา)**
แมพเป็นงาน **painterly ดีเทลสูง ไม่มีเส้นขอบดำ** เงาไล่นุ่ม มีแสงขอบจากไฟในฉาก
ตัวละครเป็น **cel shading เส้นขอบดำหนา** เงาเป็นแผ่นแบน ๆ 2 ระดับ
สองอย่างนี้อยู่คนละภาษาภาพ ต่อให้ปรับสียังไงก็ยังดูคนละงาน

**3. ความคมของขอบ (แถมมาเอง)**
ถ้าลดเส้นขอบดำลงแล้ว ตัวละครจะกลืนขึ้นมากโดยอัตโนมัติ

---

## ⚠️ ข้อจำกัดที่ต้องรู้ก่อนสั่ง

**อย่าสั่งให้ตัวละคร "มีแสงตรงกับแมพใดแมพหนึ่ง"** — เพราะตัวละครตัวเดียวต้องใช้ได้กับทั้ง 3 แมพที่แสงคนละสี
(กลางคืนไฟแดง / พลบค่ำฟ้าชมพู / ริมน้ำแดงเข้ม) ถ้าอบแสงนีออนแดงลงไปในภาพตัวละครเลย พอไปแมพพลบค่ำจะดูผิดที่ทันที

**สิ่งที่ต้องสั่งคือ "ภาษาภาพเดียวกัน" ไม่ใช่ "แสงเดียวกัน":**
ดีเทลสูง เงาไล่นุ่ม ค่าความมืดลึก เส้นขอบบาง — แล้วปล่อยให้ `characterTint` ในเกมจัดการเรื่องสีต่อแมพ

---

## Style anchor ใหม่ (ใช้แทนอันเดิมทั้งหมด)

แปะนำหน้าทุก prompt แล้วต่อด้วยคำอธิบายตัวละครและท่าเดิม

> Detailed cinematic anime illustration, semi-painterly rendering with soft blended shading and rich deep shadows — NOT flat cel shading, NOT a thick black outline style. Outlines are thin and dark-coloured rather than pure black, and disappear into shadow where the form turns away. High detail on fabric folds, seams and material texture. Dramatic contrast: deep dark values in the shadows with crisp highlight edges, in the style of a modern fighting-game character render.
>
> **Neutral lighting only:** lit by soft, neutral, slightly cool light from above and slightly in front. Do NOT add coloured neon light, do NOT add a coloured rim light, do NOT bake any environment reflection into the character — this character has to sit in several differently-lit stages.
>
> Orthographic side view facing RIGHT, strict side-view, not 3/4 angle. Pure white background, no shadow on the ground, no background elements at all.

**ต่อท้ายทุก prompt:**
> Full body, feet at the bottom of the frame, centered, character at least 1264 px tall, pure white background. Match the exact character height of the reference image.

---

## สั่งยังไงให้ยังเป็นตัวละครเดิม

**แนบภาพตัวละครเดิมไปทุกครั้ง** แล้วขึ้นต้นด้วยประโยคนี้:

> Redraw this exact character, keeping the same face, hairstyle, costume design and colour scheme, but rendered in the illustration style described below.

จากนั้นตามด้วย style anchor ใหม่ + คำอธิบายท่า (ก๊อปจากไฟล์ prompt เดิมได้เลย ท่าทั้งหมดไม่เปลี่ยน)

**คำอธิบายตัวละครแบบสั้น (เผื่อ AI ไม่ยึดภาพอ้างอิง):**
- **Bomb** — tall slim young man, sharp narrow eyes, faint scar near one eye, short swept-back silver-white hair, long black coat below the knees, black high-neck turtleneck, small silver cross necklace, black leather gloves, black trousers with thigh belt straps, black combat boots. *(โค้ทดำต้องไม่เป็นเงาทึบก้อนเดียว: แสดงรอยพับเป็นค่าเทาที่อ่อนกว่าชัดเจน)*
- **Dear** — slim young man, messy curly orange-red hair, pale clown makeup with a faint red smile, tattered off-white ruffled clown costume with a large frilled collar, dark red ribbons, red pom-poms, white bandage wraps on hands and lower legs, black lace-up boots
- **ยมฑูตหญิง** — hooded reaper, face hidden in hood shadow, layered dark grey gown with braided trim, no legs (hem ends in torn streamers), large curved scythe with a skull at the blade base

---

## ลำดับที่แนะนำ (ไม่ต้องเจนใหม่หมดทีเดียว)

1. **`idle.png` ของ Bomb ตัวเดียวก่อน** — เอามาวางเทียบกับของเดิมบนแมพ ถ้าโอเคค่อยลุยที่เหลือ
   (เจนครบ 11 เฟรมแล้วเพิ่งพบว่าไม่ชอบสไตล์ = เสียเวลาฟรี)
2. ครบชุด Bomb → ผมประกอบ atlas ให้ (สคริปต์เดิมใช้ได้เลย ไม่ต้องแก้อะไร)
3. Dear (13 เฟรม) — ทำทีหลังได้ เพราะเป็นตัวของเพื่อน ไม่เร่ง
4. ยมฑูต 7 เฟรม — ทำทีหลังสุด เพราะมันเป็นเงาโปร่งอยู่แล้ว ความต่างของลายเส้นเห็นน้อยที่สุด

**ที่สำคัญ:** ถ้าเจนใหม่ ต้องเจนใหม่**ทุกเฟรมของตัวนั้น** จะผสมของเก่ากับของใหม่ไม่ได้ สไตล์จะกระตุกตอนเปลี่ยนท่า

---

## ถ้าอยากลองทางที่ถูกกว่าก่อน

ก่อนจะเจนใหม่ 11 ภาพ ลองเปิดเกมดูผลของ `characterTint` ก่อน — บางทีแค่ปรับโทนก็พออยู่ได้แล้วในระยะนี้
ถ้ายังรู้สึกว่าตัวละคร "แบน" เทียบกับฉาก ผมเพิ่มได้อีก 2 อย่างโดยไม่ต้องแตะอาร์ต:
- **เงาใต้เท้า** — ตัวละครไม่มีเงาเลย เป็นสาเหตุใหญ่ที่ทำให้ดูลอยไม่ติดพื้น (เพิ่มง่าย ได้ผลเยอะ)
- **แสงขอบตัว** ตามสีเด่นของแมพ (นีออนแดงในแมพกลางคืน) — เพิ่มความกลืนได้อีกชั้นโดยไม่ต้องอบลงไปในอาร์ต
