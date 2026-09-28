# DEAR (Hephaestus) — prompt ชีตทั้งชุด

> ✅ **ครบแล้วและเข้าเกมแล้ว** — อัตลาส 70 เฟรม สร้างด้วย `tools/build_scramble_dear.py`

> กลไกทั้งหมดเข้าเกมแล้วและเล่นได้จริง (ดู [`docs/MOMUS_KIT.md`](docs/MOMUS_KIT.md))
> ตอนนี้ยืมอาร์ตตัวตลกเดิมอยู่ผ่าน `artAs` ใน `ScrambleScene.js` — **ชีตชุดนี้คือของจริงที่จะมาแทน**
> เจนครบแล้ววางที่ `art_reference/dear_sheets/sheet_A.jpg` … `sheet_G.jpg`

> ✅ **ขั้น 0 ผ่านแล้ว** — `art_reference/dear_idle_APPROVED.jpg`
> **แนบภาพนี้ไปกับทุก prompt** ทุกบล็อกในไฟล์นี้เขียนว่า "the same character"
> ซึ่งแปลว่าไม่มีภาพอ้างอิง = ได้คนละคนทุกใบ

---

## อ่านก่อนสามข้อ (ทั้งสามเคยพังมาแล้วกับตัวอื่น)

**1 · ห้ามมีเปลวไฟหลุดออกจากตัว**
ตัวตัดชีตแยก "ก้อนที่ไม่ติดกับตัว" ออกแล้วทิ้ง ของเดิมเจนกล่องลอยมาจนต้องเขียนตัวกรองสีมาทิ้ง
เปลวลอยจะโดนตัดทิ้ง หรือไม่ก็ถูกนับเป็นท่าหนึ่งท่า แล้วไม้บรรทัดวัดสเกลเพี้ยนทั้งใบ
ทุก prompt จึงสั่งว่า **ไฟติดอยู่กับหัวฉีด สั้นกว่าครึ่งตัว**

**2 · ห้ามมีบาเรียหรือวงพลังรอบตัว**
บาเรียของ OVERCLOCK เป็นของที่เกมวาดเอง (`_overclockAura`) ต้องเปิด/ปิดตามเวลาได้
ถ้าติดมาในชีต มันจะค้างอยู่ตลอดเกมแม้ตอนไม่ได้กดสกิล

**3 · ห้ามมีฝุ่น รอยแตกพื้น เส้นความเร็ว**
เกมวาดเองหมดแล้ว ซ้อนกันสองชั้นจะดูรก — **เขียนสั่งไว้ชัดแล้วก็ยังเจนมาอยู่ดี เผื่อใจไว้**


---

## ผลวัดขั้น 0 (วัดจากภาพที่อนุมัติ ไม่ใช่จากการมอง)

ปรับทุกตัวให้สูงเท่ากันที่ 240 px แล้ววัดเทียบ — `กว้างเฉลี่ย` คือ พื้นที่ตัว ÷ ความสูง
ซึ่งบอก "เนื้อ" จริง ต่างจาก bbox ที่ของยื่นยาว ๆ ชิ้นเดียวก็ดันขึ้นได้

| | กว้าง (bbox) | กว้างเฉลี่ย | ท่อนล่างสว่าง |
|---|---|---|---|
| **DEAR** | **388** | **226** | **68** |
| Atlas | 380 | 125 | 119 |
| Orpheus | 213 | 98 | 114 |
| Alecto | 160 | 92 | 49 |
| Helios | 136 | 67 | 126 |
| Momus ตัวตลก | 128 | 81 | 107 |

**✅ ท่อนล่างเข้ม 68** เข้มเป็นที่สองรองจาก Alecto ห่างจากพื้นฉาก (150-190) เยอะมาก
วางบนเวทีจริงแล้วเงาอ่านออกชัดที่สุดในสี่ตัวที่เทียบ

**✅ กว้างไม่ใช่ปัญหาอย่างที่กลัวตอนแรก** — ตอนวาดจริงเกมย่อเหลือสูง 130 px (`SPRITE_H`)
เขากว้าง **210 px** บนเวทีกว้าง 1280 ซึ่ง **เท่ากับ Atlas (205) ที่อยู่ในเกมมาแล้ว**
(ตัวเลข 388 ข้างบนเป็นสเกล 240 ซึ่งไม่ใช่ขนาดที่ตาเห็น)

### สองข้อที่ต้องจัดการ (ข้อเดิมที่สามถอนแล้ว — ผมวัดผิดเอง)

**1 · เท้าโดนตัดขอบล่าง — รับไว้อย่างนี้ ไม่ต้องเจนใหม่อีก**
พื้นรองเท้ายังถูกตัด (ขอบว่างล่าง 0 px · ความกว้างแถวล่างสุดยังไล่ลงแล้วจบห้วนที่ 83)
เจนซ้ำด้วยคำสั่ง "zoom out ให้มีขอบว่างใต้เท้า" แล้ว **กรอบออกมาเท่าเดิมเป๊ะ** ทั้งที่ภาพวาดใหม่จริง
(ต่างกัน 63,234 พิกเซล) — ตัวเจนยึดองค์ประกอบของภาพอ้างอิงแน่นกว่าคำสั่ง สู้ด้วยคำต่อไปก็แพ้อีก

**แต่ที่สเกลจริงมันไม่เป็นปัญหา** เกมย่อเขาเหลือสูง 130 px รองเท้ากินราว 15 px
ส่วนที่ขาดหายไปบางกว่า 1 พิกเซลบนจอ — ซูมดูที่สเกลนั้นแล้วอ่านเป็น "รองเท้าวางบนพื้น" ปกติ
ที่เหลือชดเชยด้วย `feetY` ตอน build ได้ ซึ่งต้องตั้งเองอยู่แล้ว

> เฟรมนี้เป็นเฟรมเดียวที่คับกรอบ เพราะเป็นภาพตัวเดียวเต็มกรอบ
> ชีตที่เหลือเป็นตาราง 3×3 ซึ่งแต่ละท่าเล็กกว่ากรอบมาก ความเสี่ยงคนละเรื่องกัน

**2 · ไม้บรรทัดวัดกล้องเดิมใช้กับตัวนี้ไม่ได้**
`body_sqrt` (รากที่สองของพื้นที่ตัว) ตั้งอยู่บนสมมติฐานว่า **พื้นที่ตัวคงที่ทุกท่า**
วัดแล้ว **แขนกลกินพื้นที่ 64.4%** ของทั้งตัว และมันยืด/หด/กางทุกท่า
ไม้บรรทัดจะอ่านว่า "กล้องขยับ" ทั้งที่เขาแค่ต่อยหมัด แล้วขยายทั้งท่าผิดขนาด
(ปัญหาเดียวกับกีตาร์ของ Orpheus และดาบของ Atlas แต่หนักกว่ามาก)

→ ใช้ **พื้นที่ผมส้ม** เป็นไม้บรรทัดแทน หัวไม่เปลี่ยนขนาดและเห็นทุกท่า

### ❌ ถอน: "โครงสูงล้ำหัวจนตัวเด็กเล็กกว่าคนอื่น 19%"

**ข้อนี้ผมวัดผิดเอง ไม่ใช่ปัญหาของภาพ** ตัวจับ "ก้อนผม" ตัวแรกหลวมเกินไป
มันไปจับ **ก้อนผิวหน้า** (y152-320) แทนก้อนผม แล้วผมเอา y152 มาเป็นยอดหัว
ตัวเด็กเลยคำนวณได้ 616 px ทั้งที่ของจริงคือ 744

วัดใหม่ด้วยเกณฑ์ที่เข้มขึ้น: **ยอดผมอยู่ที่ y24 · โครงล้ำหัวขึ้นไปแค่ 12 px (1.6%)**
ตัวเด็กคือ **98% ของกรอบภาพ** — ตั้ง `STANDING` จากกรอบรวมตามสูตรเดิมได้เลย ไม่ต้องแก้อะไร

บทเรียนที่ได้มาฟรีคือข้อถัดไป

## ⚠️ ของที่ต้องแก้ในโค้ดก่อน build (ไม่ใช่เรื่องของ prompt)

ทั้งสองข้อคือ "หาหัวให้เจอ" เหมือนกัน แก้ทีเดียวได้ทั้งคู่

**ก · ตัวคัดท่าจริงออกจากขยะ** `tools/momus_sheets.py` ใช้สัดส่วน **พิกเซลซีด**
(`PALE_MIN = 0.04`) ซึ่งเขียนไว้สำหรับหน้ากากขาวกับผ้าพันแผลของตัวตลก

วัดจากภาพที่อนุมัติแล้ว: ตัวใหม่มีพิกเซลซีดแค่ **2.74%** — **ต่ำกว่าเกณฑ์ ตัวกรองเดิมจะทิ้งทุกท่า**

**ข · ไม้บรรทัดวัดกล้อง** `body_sqrt` ใช้ไม่ได้ (ดูข้อ 3 ข้างบน — แขนกิน 64.4% และขยับทุกท่า)

### ทางแก้: ใช้ผมส้มเป็นทั้งตัวคัดและไม้บรรทัด

วัดจากภาพที่อนุมัติแล้ว **ก้อนผมส้ม = 2.5% ของพื้นที่ตัว** (วัดตรงกันทั้งสองใบ) ส่วนขยะที่เป็นโลหะล้วนมี ~0%
ห่างกันพอจะตั้งเกณฑ์ได้ไม่ก้ำกึ่ง และก้อนผมยังบอก **ตำแหน่งหัว** ซึ่งต้องใช้ตั้ง `STANDING` อยู่แล้ว

```python
HAIR = lambda r, g, b: (r > 170) & (r - b > 80) & (r - g > 55)
```

> ⚠️ **เกณฑ์ต้องเข้มขนาดนี้ เกณฑ์หลวมกว่านี้ใช้ไม่ได้** เกณฑ์แรกที่ลอง
> (`r>140 & r-b>45`) ไปจับผิวหน้าบ้าง จับโลหะสีทองแดงบ้าง แล้วให้คำตอบคนละอย่าง
> ในภาพสองใบที่เป็นตัวละครเดียวกัน (ยอดผม y152 กับ y24) — ซึ่งคือที่มาของข้อที่ถอนไปข้างบน
>
> โลหะของเขาอมน้ำตาลพอจะหลุดเข้าเกณฑ์ส้มได้ง่าย ๆ **ทดสอบกับสองใบขึ้นไปเสมอ
> แล้วดูว่าได้คำตอบตรงกันไหม** ใบเดียวผ่านไม่ได้แปลว่าเกณฑ์ถูก

> 📌 **แต่ยังต้องวัดจริงจากชีตที่เจนมาก่อนตั้งเกณฑ์** ภาพเดียวไม่พอ
> ท่าที่หันหลัง/ก้มหัวจะเห็นผมน้อยลง ตัวเลข 3.18% เป็นค่าจากท่ายืนตรงซึ่งเห็นผมเต็มที่
> วิธีเดิมที่ใช้มาสามตัวแล้วคือ: เจนครบ → วัดทุกก้อนทุกใบ → ดูว่าท่าจริงต่ำสุดกับขยะสูงสุด
> ห่างกันกี่เท่า → ค่อยตั้งเกณฑ์ตรงกลาง **อย่าเดาตัวเลข**

## สถานะชีต (อัปเดตหลังวัดของจริง)

| ใบ | สถานะ | ผลวัด |
|---|---|---|
| A เคลื่อนไหว/โดน | ✅ รับแล้ว | 9 ท่า · ไม่มีขยะ · ไม่ชนขอบ |
| B หมัดสามจังหวะ | ✅ รับแล้ว | 9 ท่า · ไม่มีขยะ · ท่า 7-9 ชนขอบล่าง |
| C Skyward/พุ่งไหล่/อัปเปอร์ | 🟡 **ใช้ 3 จาก 12 ท่า** | ใช้เฉพาะชุดพุ่งไหล่ (C5·C6·C7) ที่โครงครบ |
| C2 อัปเปอร์อย่างเดียว | ✅ รับแล้ว | 6 ท่า · **โครงครบทุกท่า** · กระจาย 5.7% แน่นที่สุดในชุด |
| D ท่าต่ำ/ท่าย่อ/หมุนหมัด | ✅ รับแล้ว | 9 ท่า · ไม่มีขยะ · ไม่ชนขอบ |
| E อากาศ | ✅ รับแล้ว | 9 ท่า · ไม่มีขยะ · ไม่ชนขอบ |
| F สกิล 1+2 | ✅ รับแล้ว | **10 ท่า** (เกินมา 1 ท่าไถลาก เลือกใช้ 9) · แถวล่าง 3 ท่าชนขอบล่าง |
| G อัลติ METEOR | ✅ รับแล้ว | **10 ท่า** โดย 2 ท่าติดกันเป็นก้อนเดียว · ไม่ชนขอบ |

### 🟡 ใบ C: โครงแขนกลหายเฉพาะ "ท่าที่ชกขึ้นฟ้า" — ไม่ใช่สุ่ม

เจนสองรอบ เสียท่าแบบเดียวกันทั้งสองรอบ **ไม่มีเป้หลัง ไม่มีแขนกล เหลือแค่ถุงมือเล็ก ๆ**
ซึ่งอ่านเป็นคนละตัวละคร ไม่ใช่ท่าอื่นของคนเดิม

| ท่าที่เสียทั้งสองรอบ | ท่าที่ครบทุกรอบ |
|---|---|
| อัปเปอร์ชกขึ้นเหนือหัว · ชูหมัดขึ้น · ลอยหลังชกขึ้น | ย่อรวมพลัง · พุ่งไหล่ · ชกตรงไปข้างหน้า · ลงพื้นตั้งหลัก |

**เห็นรูปแบบชัด: แขนที่ยกขึ้นเหนือไหล่คือจุดที่โครงหาย** แขนที่อยู่ระดับอกหรือต่ำกว่าไม่เคยเสียเลย
เดาว่าเพราะพอแขนกางขึ้น กรอบภาพต้องสูงขึ้น ตัวเจนเลยย่อของทิ้งเพื่อให้ทุกอย่างอยู่ในช่อง

**ใส่คำสั่งตัวใหญ่ในทุก anchor แล้วยังเสียเหมือนเดิม** — บทเรียนเดียวกับตอนสั่ง zoom out ให้เห็นพื้นรองเท้า
สู้ด้วยคำอีกรอบก็แพ้อีก ต้องเปลี่ยนวิธี ไม่ใช่เปลี่ยนคำ

**ทางที่เลือก:** เก็บ 6 ท่าที่ดีของใบนี้ไว้ (ชุดพุ่งไหล่ครบทั้งชุดแล้ว) แล้วเจน **ชีตเล็ก 6 ท่า
เฉพาะอัปเปอร์** โดย (ก) เขียนสายเคเบิลกับเป้หลังลงไปใน**บรรทัดของทุกท่า** ไม่ใช่แค่ใน anchor
และ (ข) **ไม่ให้หมัดขึ้นเหนือหัว** — สูงสุดแค่ระดับหน้า ซึ่งเป็นช่วงที่ตัวเจนวาดถูกมาตลอด
ท่าส่งขึ้นฟ้าไม่ได้ต้องการหมัดเหนือหัว มันต้องการ **แรงพุ่งขึ้น** ซึ่งสื่อด้วยลำตัวยืดกับส้นเท้าลอยได้

> **ข้อนี้ตัวเลขจับไม่ได้ ต้องเปิดดู** ผมลองสามไม้วัดแล้วไม่มีอันไหนแยกออก:
> สัดส่วนพื้นที่ต่อผม · ทแยงกรอบต่อผม · สัดส่วนพิกเซลโลหะ — ท่าที่เสียอยู่ในช่วงเดียวกับ
> ท่าปกติของใบที่ผ่านทุกอัน เพราะตอนโครงหาย ตัวเด็กกับผมถูกวาดใหญ่ขึ้นชดเชยพอดี
>
> **เพราะงั้นทุกใบต้องเปิดดูภาพจริงเสมอ ไม่ใช่ดูแค่ตัวเลข** — ตัวเลขจับได้แค่
> เปลวหลุดตัว · ท่าติดกัน · ชนขอบ · สเกลเพี้ยน ซึ่งคนละชนิดกับ "ของหายไปจากดีไซน์"

ไฟล์อยู่ที่ `art_reference/dear_sheets/sheet_{A,E,F,G}.jpg`

### ✅ ไม่มีเปลวไฟหลุดตัวเลยสักใบ

ตัวแยกได้ 9-10 ก้อนพอดีกับจำนวนท่าทุกใบ **ไม่มีก้อนขยะเลย** — ทุกก้อนมีพิกเซลผม 3.1-8.6%
คำสั่ง "ไฟติดกับหัวฉีด" ในทุก prompt ได้ผลจริง ไม่ต้องเขียนตัวกรองสีมาทิ้งเหมือนตอนตัวตลก

### ⚠️ ตารางเบี้ยวทุกใบ — รับได้ แต่ต้องรู้ไว้

สั่งไป "3 แถวแถวละ 3" ได้กลับมา A=3/3/3 · G=4/3/2 · F=4/3/3 · E=3/3/3
สองใบได้ 10 ท่าแทน 9 และใบ G มีสองท่าวาดติดกันจนตัวแยกอ่านเป็นก้อนเดียว (สูง 512 เทียบค่ากลาง ~240)

**ไม่ต้องเจนใหม่** ทุกท่าที่ต้องการอยู่ครบ เขียน `SEQ` ให้ตรงกับลำดับจริงพอ
ปัญหาเดียวกับตัวตลกที่บันทึกไว้แล้วใน `momus_sheets.py` — ตัวเจนไม่เคยทำตารางตรงเลยสักตัว

### ✅ ไม้บรรทัดผมส้มใช้ได้จริง — วัดยืนยันแล้ว

| ชีต | ไม้บรรทัด (ปรับตามขนาดภาพ) | สเกลที่ต้องแก้ |
|---|---|---|
| A | 35.98 | 1.000x |
| G | 33.59 | 1.071x |
| E | 33.72 | 1.067x |
| F | 32.29 | 1.114x |

กล้องต่างกันระหว่างใบ **7-11%** ซึ่งคือสิ่งที่ไม้บรรทัดมีไว้แก้พอดี

> **การกระจายต่อท่าอยู่ที่ ~20% ซึ่งหลวมกว่าตัวตลก (12%)** แต่ค่าที่เอาไปใช้จริงคือ
> **ค่ากลางของทั้งใบ** ไม่ใช่ค่าต่อท่า — ค่ากลางจาก 9 ตัวอย่างนิ่งพอจะแยก 7-11% ออกจากกันได้สบาย
>
> ลองไม้บรรทัดหกแบบแล้ว ผมชนะทุกแบบ: ราก(ผม+หน้า) 19.7% · **รากผม 20.6%** ·
> รากพื้นที่ตัว 25.0% · รากพื้นที่หน้า 28.1% · ทแยงกรอบผม 42.1% · สูงกรอบผม 53.9%
> (ของเดิม `body_sqrt` แย่กว่าผม 4 จุด ตามที่คาดไว้เพราะแขนกินพื้นที่ 64%)

### ⚠️ ชีต F แถวล่างชนขอบล่าง

สามท่าของ OVERCLOCK (ท่า 8-10) ชนขอบล่างของภาพ ปลายรองเท้าโดนตัดเหมือนท่ายืน
**รับไว้ได้ด้วยเหตุผลเดียวกัน** (ที่สเกลจริงบางกว่า 1 พิกเซล) แต่ถ้าเจนใบ B/C/D แล้วเจออีก
ให้ลองสั่งเป็น "4 แถวแถวละ 3" แทน — กรอบจะสูงขึ้น ท่าจะเล็กลง แล้วเหลือขอบว่างมากขึ้นเอง

---

## แผนชีต — 7 ใบ ใบละ 9 ท่า + ท่ายืน + คลิปวิ่ง = 74 เฟรม

| ใบ | เนื้อหา | ไปเป็นท่าอะไร |
|---|---|---|
| A | เคลื่อนไหวและโดน | `jump` ×3 · `hurt` · `knockdown` · `techroll` · `tech` · `block` · `blockstun` |
| B | หมัดลูกสูบสามจังหวะ | `jab1` · `jab2` · `jab3` |
| C | ไม้จบส่งขึ้นฟ้า + พุ่งไหล่ + อัปเปอร์ | `jab4` · `side` · `up` |
| D | ท่าต่ำ + ท่าย่อ + หมุนหมัด | `down` · `crouch`/`blockcrouch` · `nair` |
| E | หมัดจรวด + ทุบลง + พุ่งไอพ่น | `sair` · `dair` · (สำรอง) |
| F | สกิล 1 ลากทุบ + สกิล 2 โอเวอร์คล็อก | `drag1` · `drag2` · `over1` |
| G | อัลติ METEOR สามจังหวะ | `meteor1` · `meteor2` · `meteor3` |

> ใบ E สามท่าสุดท้ายเป็น **ท่าพุ่งด้วยไอพ่น** ซึ่งซิมยังไม่มีไอดีท่าให้ (การพุ่งใช้เฟรมลอยอยู่)
> เก็บไว้เป็นของสำรอง ถ้าอยากตัดงบเจนลงหนึ่งใบ ตัดสามท่านี้ทิ้งได้โดยไม่กระทบอะไร

---
## 1. ขั้น 0 — ท่ายืน (ด่านกั้น · ✅ **ผ่านแล้ว ไม่ต้องเจนซ้ำ**)

> เก็บ prompt ไว้เผื่อต้องเจนใหม่ทั้งตัว — ของที่ใช้จริงอยู่ที่ `art_reference/dear_idle_APPROVED.jpg`

เจนใบนี้ใบเดียวก่อน แล้ว **เอาไปวางข้างตัวอื่นในโรสเตอร์เทียบขนาดจริง** ถึงค่อยเจนชีตต่อ
สิ่งที่ต้องดู: สูงราว 2.5-2.8 หัว · เงาไม่แคบกว่าคนอื่น · ท่อนล่างต้องเข้มพอที่จะไม่จมพื้นฉาก
(พื้นของเวทีอยู่ราว 150-190 บนสเกล 0-255 — ตัวที่ท่อนล่างเข้าใกล้ค่านั้นคือตัวที่จะหายไปกับพื้น)

```
A single full-body standing pose of this character, drawn in chibi game-sprite
proportions: big head, short legs, compact body, the whole figure only about
two and a half to three heads tall — but with oversized mechanical arms that
break that rule on purpose and read as far too heavy for the boy carrying them.
He stands upright in a loose ready stance, feet well apart, weight low, the
big mechanical fists hanging at his sides, chin slightly down, eyes forward,
calm rather than cheerful. One character only, one pose only. No turnaround,
no multiple views, no text, no labels, no header bars.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 2. ขั้น 1 — คลิป ยืน → วิ่ง (✅ **ตัดเสร็จแล้ว**)

> ตัดแล้วอยู่ที่ `art_reference/dear_clip/run_01.png` … `run_10.png` + `clip.json`
> คาบรอบวิ่ง **29 เฟรม เริ่มที่ f95** · ท่ายืนในคลิปสูง 710 px
>
> **หาคาบด้วยวิธีใหม่** วิธีเดิม (autocorrelate ระยะถ่างเท้า) ใช้กับตัวนี้ไม่ได้ —
> หมัดกลห้อยยาวเลยเข่า พาดอยู่ในแถบล่างที่ใช้วัดเท้า สัญญาณเลยอ่านได้ 711 px ตอนยืนนิ่ง
> (จริง ๆ คือความกว้างของกำปั้นสองข้าง) autocorrelation ได้ r แค่ 0.41-0.51 ซึ่งเชื่อไม่ได้
> เปลี่ยนไปเทียบ **รูปทรงทั้งตัวด้วย IoU** ได้ P=29 ที่ 0.854 เป็นยอดชัด และตรงกับ
> ครึ่งคาบ ~14.5 ที่สัญญาณเท้าให้มา — สองวิธีเห็นตรงกันถึงเชื่อ (ดู `tools/cut_momus_clip.py`)

ท่าวิ่งมาจากคลิป ไม่ใช่ชีต เพราะ 10 เฟรมที่ลื่นจริงเจนเป็นตารางไม่ได้

```
Animate this exact character: starts in the loose ready stance, holds it
briefly, then runs forward to the right for at least three full strides.
The run is driven by the rig — the ankle thrusters pulse and he skims forward
in long low strides rather than pumping his legs like an ordinary runner.
The heavy mechanical arms swing with obvious weight and lag slightly behind
his body. Same art style, same proportions, same camera distance throughout.
Pure white background, no shadow, no ground line. Full body always visible,
never cropped.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 3. ชีต A — ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

หกท่าหลังเป็นท่า "โดน" ทั้งหมด ซึ่งเป็นท่าที่คนเล่นเห็นบ่อยที่สุดรองจากท่ายืน
ต้องอ่านออกจากหางตาว่าโดนแล้ว ไม่ใช่แค่ยืนเอียง ๆ

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no impact effects — the game draws all of that.

Pose 1 — launching upward, both knees tucked up, ankle thrusters firing
straight down beneath him, arms held in close.
Pose 2 — floating at the top of the jump, body compact, knees still up,
mechanical fists drawn in near his chest.
Pose 3 — falling, legs reaching down for the ground, arms out slightly for
balance, body angled forward.
Pose 4 — hit and staggering backward, head snapped back, one arm flung out,
knees buckling, clearly taking damage.
Pose 5 — knocked down and lying on his back, limbs slack, the heavy arms
splayed out on the ground beside him.
Pose 6 — rolling sideways along the ground, body curled into a tight ball
around the rig, mid-roll.
Pose 7 — pushing up off one knee getting back to his feet, one mechanical
fist planted on the ground.
Pose 8 — guarding: both mechanical forearms crossed in front of his face and
chest like a shield, shoulders hunched, feet braced wide.
Pose 9 — guard broken through: same crossed-arm guard but skidding backward,
feet sliding, head turned aside from the force.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 4. ชีต B — หมัดลูกสูบสามจังหวะ (9 ท่า · 3 แถวแถวละ 3)

**เกมนี้เร็วและคนใส่กันรัว ท่าที่เงื้อนานคือท่าที่ไม่มีวันได้ใช้**
เซอร์โวเป็นคนออกแรง ไม่ใช่เด็ก — หมัดพวกนี้จึง **เร็วกว่าหมัดคน ไม่ใช่ช้ากว่า**
สามท่าต่อหนึ่งหมัด: เงื้อสั้น ๆ → สุดแขน → ชักกลับ · ท่อลูกสูบยืดออกตอนหมัดสุดแขน

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a FAST three-punch flurry thrown with the mechanical fists — snappy
and mechanical, never heavy or wound up. He keeps his weight forward and his
other fist up between punches, barely winding back at all. The hydraulic
pistons along each forearm extend visibly at full reach and retract again.
No motion lines, no impact effects, no sparks.

Pose 1 — right mechanical fist pulled back only as far as his ribs, other
fist up guarding, body compact and leaning in, already moving.
Pose 2 — a straight right fully extended at chest height, the forearm
pistons stretched out to full length, shoulder turned in behind it.
Pose 3 — snapping the right arm back in, pistons collapsing, already
rotating for the next punch.
Pose 4 — left fist cocked at the ribs, torso turned the other way, compact.
Pose 5 — a straight left fully extended, pistons at full stretch, shoulder
driving behind it.
Pose 6 — snapping the left arm back in, weight rolling onto the front foot.
Pose 7 — both mechanical fists drawn back low at his hips, knees bent,
shoulder plates flared, coiled to fire both at once.
Pose 8 — both fists rammed straight forward together at chest height, arms
locked out in parallel, pistons fully extended, body driving in behind them.
Pose 9 — recovering with both fists back up at chin height, feet re-set wide.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 5. ชีต C — ไม้จบส่งขึ้นฟ้า · พุ่งไหล่ · อัปเปอร์ (9 ท่า · 3 แถวแถวละ 3)

ท่า 1-3 คือ **Skyward** ไม้จบที่ส่งคู่ต่อสู้ขึ้นฟ้าแล้วเขากระโดดตามไปต่อบนอากาศ
มันคือเครื่องยนต์คอมโบทั้งหมดของตัวนี้ — **หมัดต้องชี้ขึ้นชัด ๆ ไม่ใช่ชี้ไปข้างหน้า**

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — dropping into a deep crouch, both mechanical fists low at his
knees, shoulder plates rising, gathering everything downward first.
Pose 2 — a huge rising uppercut with one mechanical fist punched STRAIGHT UP
far past his own head, arm fully extended vertically, pistons at full
stretch, body stretched upward, back heel lifted, head thrown back.
Pose 3 — still airborne from his own swing, fist high, feet just off the
ground, starting to fall back down.
Pose 4 — leaning far forward into a charge, both shoulder plates presented
ahead of him, arms tucked back behind his body, back thruster flaring.
Pose 5 — mid-charge with the leading shoulder plate rammed forward, body
almost horizontal over a long low stride, arms still tucked back.
Pose 6 — skidding out of the charge, feet planted wide and braced, torso
straightening back up.
Pose 7 — crouched with one fist cocked low beside his hip, other forearm up
guarding, weight on the back foot.
Pose 8 — a rising diagonal uppercut driven up and forward at head height,
body lifting onto the toes behind it, pistons extended.
Pose 9 — coming down out of the uppercut, knees absorbing the landing.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 6. ชีต D — ท่าต่ำ · ท่าย่อ · หมุนหมัด (9 ท่า · 3 แถวแถวละ 3)

ท่าย่อ (4-6) **ต้องย่อลึกจริง** วัดแล้วสามตัวก่อนหน้าเจนมาตื้นทุกตัว (93% · 99% · 91%)
ซึ่งบนจอไม่อ่านว่าย่อเลย เกณฑ์คือ **80% ของความสูงท่ายืน**

ท่า 7-9 คือ `nair` ซึ่งเป็น **ปุ่มหลักตอนอยู่บนอากาศ** ของตัวนี้ — กินรอบตัว ไม่ใช่ทางเดียว

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — dropping low with one mechanical fist drawn back near the ground,
knees deeply bent.
Pose 2 — a low piston punch driven straight forward at ankle height, the arm
extended flat and level just above the floor, pistons stretched, body low
over a wide braced stance.
Pose 3 — pulling the low arm back in and rising out of the stance.
Pose 4 — crouched LOW and still, knees fully folded, forearms resting on his
knees, head low.
Pose 5 — crouched LOW in a guard, both mechanical forearms crossed in front
of his face while still folded down, making a compact block.
Pose 6 — crouched LOW and flinching, head turned aside, guard shaken but
still down in the crouch.
Pose 7 — airborne with knees tucked, both fists drawn in tight against his
chest, body compact, winding up a spin.
Pose 8 — airborne mid-spin with both mechanical arms flung straight out to
either side horizontally, body rotating, legs tucked.
Pose 9 — airborne pulling both arms back in from the spin, body compact
again, starting to fall.

Poses 4, 5 and 6 must be crouched LOW — total height only about 80% of the standing pose, clearly shorter, not a shallow knee-bend.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 7. ชีต E — หมัดจรวด · ทุบลง · พุ่งไอพ่น (9 ท่า · 3 แถวแถวละ 3)

ท่า 4-6 คือ `dair` ซึ่งทุบโดนแล้ว **เด้งกลับขึ้นไปได้อีก** — ต้องเห็นว่าทุบลงแนวดิ่งจริง ๆ
ไม่ใช่เตะเฉียง ๆ ไม่งั้นคนเล่นจะไม่เข้าใจว่าทำไมมันเด้ง

ท่า 7-9 เป็นของสำรอง (ซิมยังไม่มีไอดีท่าให้) — ตัดทิ้งได้ถ้าอยากประหยัด

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
All nine poses are AIRBORNE — both feet off the ground, no ground contact
in any pose. No motion lines, no effects.

Pose 1 — airborne with one mechanical fist drawn back beside his ribs, body
angled forward, back thruster flaring behind him.
Pose 2 — airborne with that fist rammed straight forward at full reach, the
forearm pistons stretched to maximum, the whole body strung out behind the
punch in one line.
Pose 3 — airborne retracting the arm, body folding back up.
Pose 4 — airborne with both mechanical fists raised together high above his
head, knees pulled up, coiled to drive them down.
Pose 5 — airborne driving both fists STRAIGHT DOWN below his own feet, arms
locked out vertically beneath him, body stacked directly above them, head
down — a pure downward hammer, not a diagonal kick.
Pose 6 — airborne and rebounding upward off that hammer, arms still down,
body rising, knees drawing back up.
Pose 7 — airborne and tucked tight in a dash, both arms folded in, back and
ankle thrusters all firing at once behind him.
Pose 8 — airborne streaking forward in that same tuck, body horizontal and
level, head leading.
Pose 9 — airborne breaking out of the dash, arms opening, body straightening
back upright.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 8. ชีต F — สกิล 1 ลากทุบ · สกิล 2 โอเวอร์คล็อก (9 ท่า · 3 แถวแถวละ 3)

**ห้ามวาดคู่ต่อสู้** ท่าลาก (1-3) ต้องอ่านออกว่ากำลังกวาดอะไรไปกับแขน โดยที่แขนว่าง

ท่า 7-9 คือตอนกด OVERCLOCK — **ห้ามมีบาเรียหรือวงพลัง** เกมวาดเอง
ความ "แรงขึ้น" ต้องมาจาก **ตัวเขาเอง**: แผ่นเกราะกางออก เส้นฟ้าสว่างขึ้น หัวฉีดเปิดหมด

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No opponent, no second character — he is alone in every pose.
No motion lines, no effects — the game draws all of that.

Pose 1 — crouched low and leaning hard forward, one mechanical arm swept out
straight ahead at chest height like a plough, back thruster flaring.
Pose 2 — skimming forward in a long low stance with that arm still swept out
ahead, feet barely under him, clearly being carried by thrust not by steps.
Pose 3 — still skimming, torso rotating and the swept arm beginning to rise
overhead, winding up.
Pose 4 — both mechanical fists raised together high overhead, body stretched
up on the toes at the top of the wind-up.
Pose 5 — both fists slammed straight down into the ground in front of his
feet, arms locked out, knees deeply bent, head down over the impact.
Pose 6 — holding the follow-through, fists still on the ground, shoulders
hunched over them.
Pose 7 — standing braced, head tipped back, arms held out slightly from his
body, every shoulder and forearm plate flaring open like vents.
Pose 8 — same braced stance with the plates fully open, every cyan light
line on the rig burning at its brightest, all thruster nozzles wide open
with their short attached flames at full size.
Pose 9 — settling out of it into a forward-leaning fighting stance, plates
still open, fists up, clearly wound up and unable to back off.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 9. ชีต G — อัลติ METEOR (9 ท่า · 3 แถวแถวละ 3)

สามจังหวะ **กระโดด · ค้าง · ทุบ** ตามลำดับเป๊ะ

ท่า 1-3 คือขาขึ้นที่ดูดทุกคนรอบตัวขึ้นไปด้วย — **ห้ามวาดคู่ต่อสู้ ห้ามวาดวงดูด** เกมวาดเอง
สิ่งที่ต้องเห็นคือ **เขากำลังอ้าแขนกวาดเข้าหาตัวขณะพุ่งขึ้น** วงเป็นเรื่องของเกม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No opponent, no second character — he is alone in every pose.
No energy ring, no shockwave, no vortex, no swirling lines — the game draws
all of that. No motion lines, no effects.

Pose 1 — crouched deep with both mechanical arms swung wide open to either
side, palms turned inward, every thruster flaring downward, about to launch.
Pose 2 — launching straight up with both arms sweeping inward across his
chest as if gathering something in, legs trailing straight down beneath him.
Pose 3 — climbing, body vertical and stretched, arms now crossed in against
his chest, all thrusters firing straight down.
Pose 4 — hanging at the very top, body upright and almost still, knees
loosely tucked, arms beginning to open again.
Pose 5 — at the peak with both mechanical fists hauled back and up over one
shoulder together, torso wound around them, the whole rig cocked.
Pose 6 — still at the peak, body beginning to pitch head-down, fists still
held back, thrusters cutting out.
Pose 7 — diving head-down with both fists aimed straight at the ground below
him, arms locked out ahead, legs straight up behind, body in one rigid line.
Pose 8 — the instant of impact: both fists driven into the ground, arms
locked, knees deeply bent and braced, head down between his shoulders.
Pose 9 — rising slowly out of the impact, fists lifting off the ground,
shoulder plates settling back down.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## 10. ชีต C2 — อัปเปอร์อย่างเดียว (6 ท่า · 2 แถวแถวละ 3)

เจนแยกเพราะใบ C เสียเฉพาะท่ากลุ่มนี้สองรอบติด (ดูหัวข้อข้างบน)
**ท่าน้อยลง = ตัวเจนใส่ใจต่อท่ามากขึ้น** และทุกบรรทัดย้ำเรื่องเป้หลังกับสายเคเบิลเอง

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

In every one of the six poses the gunmetal pack on his back and BOTH huge
mechanical arms are fully drawn, with the thick armoured cables running from
the pack down to each arm clearly visible. The arms never leave the frame and
never shrink. No fist rises above the top of his own head in any pose.

Pose 1 — crouched low, both mechanical fists pulled down beside his knees,
the back pack hunched up behind his shoulders, cables taut, gathering to
launch upward.
Pose 2 — driving upward: one mechanical fist punched up to FACE HEIGHT and no
higher, elbow still below the fist, pistons extended, his body stretched tall
on the toes with the back heel lifted, ankle thrusters firing straight down,
the back pack and cables fully visible behind him.
Pose 3 — feet just off the ground from his own swing, that fist still at face
height, the other arm hanging low, the pack and both cables clearly drawn.
Pose 4 — crouched with one fist cocked low beside his hip, the other
mechanical forearm raised across his chest guarding, weight on the back foot,
pack and cables visible.
Pose 5 — driving up and forward: that fist punched to CHEST-TO-CHIN HEIGHT and
no higher, shoulder behind it, body lifting onto the toes, thrusters firing
down, the pack and both arms fully in frame.
Pose 6 — landing out of it, knees deeply bent absorbing the drop, both
mechanical fists low in front of him, pack settled back down.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference proportions exactly. Character: a small orange-haired boy wearing heavy cybernetic augments. His copper-orange hair lies FLAT against his skull with the hairline clearly visible, never a wide round frizzy halo. He wears a close-fitting charcoal-black bodysuit with dark grey panel seams. A dark bronze laurel wreath sits on his hair. He has a flat, serious, unimpressed expression — never cheerful. Mounted on his back is a gunmetal exoskeleton rig carrying TWO HUGE INDEPENDENT MECHANICAL ARMS that arch up over his shoulders and hang down on either side of him. These are NOT his own arms: his own small human hands stay visible against his chest and at his side, and the big arms are suspended from the back rig by thick armoured cables and hoses, always staying physically connected to that rig. Each mechanical arm ends in a blocky fist as large as his whole torso. THE BACK RIG AND BOTH HUGE MECHANICAL ARMS MUST BE FULLY PRESENT AND CLEARLY VISIBLE IN EVERY SINGLE POSE — never draw him without the rig, never shrink the arms down to small hand gauntlets, and never omit the back-mounted pack, no matter what the pose is doing. Visible hydraulic pistons run along each mechanical arm and extend when it reaches out. He also wears segmented armour plates over both knees and shins above heavy armoured boots. Thin cyan light lines are inlaid along the rig's plating and along the pistons; they glow brighter when he exerts himself. Every nozzle carries a SHORT pale-cyan flame that stays attached to its nozzle and is never longer than half his body height. The mechanical arms are the largest and heaviest-reading things on him, and his silhouette is widest at the fists. He stands and moves with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props beyond those described, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above the highest part of the rig; the soles must be drawn complete with their whole bottom edge visible and must never touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. No detached flames, no floating fire, no flame breaking away from the body — all flame stays attached to a nozzle. No energy barrier, no bubble shield, no aura ring, no glowing sphere around him. No smoke, no dust, no cracked ground, no sparks, no motion lines, no speed lines, no impact effects — the game draws all of that.
```

---

## เช็กลิสต์ก่อน build

1. ทุกใบเจนมาแล้ว **เปิดดูทีละใบ** ว่ามีเปลวไฟลอยหลุดตัวไหม / มีวงพลังไหม / มีฝุ่นไหม
   ถ้ามี เจนใบนั้นใหม่ — ถูกกว่าการไปแก้ตัวตัดทีหลังเสมอ
2. แก้ไม้วัด `PALE_MIN` ใน `tools/momus_sheets.py` ให้ตรงกับชุดสีใหม่ (ดูหัวข้อ ⚠️ ข้างบน)
   **วัดจริงจากชีตก่อนตั้งเกณฑ์ อย่าเดาตัวเลข**
3. รัน `build_scramble_momus.py` แล้วดูค่าไม้บรรทัดของทุกใบที่มันพิมพ์ออกมา
   ใบไหนกระจายเกิน ±10% แปลว่ามีท่าที่กล้องเพี้ยน — หาว่าท่าไหนแล้วเจนเฉพาะท่านั้น
4. เข้าเกมแล้วลองทุกท่าจริง โดยเฉพาะ **สามท่าของอัลติที่ต่อกันเอง**
5. ลบ `artAs` ของ `momus` ออกจาก `ScrambleScene.js` ให้หมด — มันคือสะพานชั่วคราว
   ถ้าลืมลบ ท่าใหม่จะไม่ถูกใช้เลยทั้งที่ชีตมาแล้ว
6. เทียบท่ายืนข้างโรสเตอร์อีกครั้งหลัง build จริง ไม่ใช่แค่ตอนขั้น 0

---

## ตารางเทียบ: ท่าในชีต → ไอดีท่าในซิม

ใช้ตอนเขียน `SEQ` ใน `build_scramble_momus.py`

| ไอดี | ที่มา | เฟรม |
|---|---|---|
| `idle` | ขั้น 0 | 1 |
| `run` | คลิป | 10 |
| `jump` | A1-3 | 3 |
| `hurt` · `knockdown` · `techroll` · `tech` | A4 · A5 · A6 · A7 | 4 |
| `block` · `blockstun` | A8 · A9 | 2 |
| `jab1` · `jab2` · `jab3` | B1-3 · B4-6 · B7-9 | 9 |
| `jab4` (Skyward) | C1-3 | 3 |
| `side` · `up` | C4-6 · C7-9 | 6 |
| `down` | D1-3 | 3 |
| `crouch` · `blockcrouch` | D4 · D5 (D6 สำรองไว้ทำท่าก้มกันแล้วเซ) | 2 |
| `nair` | D7-9 | 3 |
| `sair` · `dair` | E1-3 · E4-6 | 6 |
| `drag1` · `drag2` | F1-3 · F4-6 | 6 |
| `over1` | F7-9 | 3 |
| `meteor1` · `meteor2` · `meteor3` | G1-3 · G4-6 · G7-9 | 9 |

**รวม 70 เฟรมที่ใช้จริง** (+ E7-9 สำรองอีก 3 ถ้าเจน)
