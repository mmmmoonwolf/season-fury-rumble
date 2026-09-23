# Style Lock — ก๊อปวางทุกครั้งที่สั่งอาร์ตตัวละครในเกมนี้

⚠️ **เกมนี้มี 2 สไตล์ที่ไม่เหมือนกัน** — ต้องเลือกให้ถูกตัว ไม่งั้นตัวละครจะดูเหมือนมาคนละเกม

| ตัวละคร | สไตล์ | มุมกล้อง | ทิศทาง |
|---|---|---|---|
| **Dear** | cel-shaded (เส้นคม เงาแบน) | หน้าตรง (frontal) | หันขวา |
| **March** | cel-shaded | 3/4 | หันขวา |
| **KunJae** | **painterly semi-realistic** (เงาไล่ระดับ) | 3/4 | หันขวา |
| **Bomb** | cel-shaded | 3/4 | หันขวา |

---

# ส่วนที่ 1 — กติกาที่ใช้กับทุกตัวละคร

## 1.1 แนบภาพจริงจากเกมเสมอ ไม่ใช่คำอธิบาย

ใช้เฟรมที่**อยู่ใน atlas จริงตอนนี้** (ตัดพื้นหลังแล้ว ใช้งานในเกมอยู่) เป็นภาพแรกทุกครั้ง
❌ ห้ามใช้ concept art, ชีทอ้างอิงจากที่อื่น, หรือภาพที่เคย reject ไปแล้ว

## 1.2 แนบภาพอ้างอิงท่าทางแยก = ต้องระบุให้ชัด

ถ้าแนบภาพท่าทางเพิ่ม (ซิลูเอต / sprite เกมอื่น / ชีท) ต้องเขียนกำกับว่า:

> ท่าเอาจากภาพ B แต่ **ลายเส้นและการลงสีเอาจากภาพ A เท่านั้น**

นี่คือสาเหตุอันดับ 1 ที่สไตล์หลุด — อย่าปล่อยให้เดาเอง

## 1.3 ข้อกำหนดทางเทคนิค (ระบบตัดพื้นหลัง/จัดขนาดพึ่งสิ่งเหล่านี้)

ต่อท้ายทุก prompt:

> Pure white background, no shadow, no ground line, no props. Full body visible from the top of the head/hat to the soles of both boots — do not crop, do not zoom in. Same exact head size and same overall height as the reference image. Exactly two arms and two legs, clearly separated — do not overlap, duplicate, or hide limbs. Anatomically correct human proportions.

**ทำไมสำคัญ:**
- **พื้นขาวล้วน** → สคริปต์ตัดพื้นหลังแยกตัวละครด้วยความสว่าง (`lum < 238`) ถ้ามีเงาหรือพื้นจะติดมาด้วย
- **ห้ามครอป** → ระบบจัดขนาดวัดจาก "ส้นเท้า → หัว" ถ้าขาหาย ตัวจะถูกขยายผิดขนาด
- **หัวเท่ากันทุกเฟรม** → ท่าที่งอตัว (กระโดด/หมอบ) วัดความสูงตัวไม่ได้ ต้องใช้ขนาดหัวเทียบแทน
- **แขนขาไม่ซ้อนกัน** → เคยได้รูปขา 3 ข้างมาแล้ว ต้องทิ้งทั้งรูป

## 1.4 เจนทีละเฟรม ใช้เฟรมก่อนหน้าเป็น reference

อย่าสั่งเจนทีเดียว 8 ท่า — สไตล์จะไหลทีละนิดจนเฟรมสุดท้ายเป็นคนละคน
เจนทีละเฟรม → ผ่านแล้วเอาเฟรมนั้นแนบเป็น reference ของเฟรมถัดไป

## 1.5 ระบุทิศทางและมุมกล้องทุกครั้ง

ทุกตัวหันขวา ถ้าไม่ระบุ AI จะสลับทิศเองโดยไม่บอก แล้วต้องมาพลิกทีหลัง

---

# ส่วนที่ 2 — Style anchor แยกตามตัวละคร

## 2.1 KunJae — painterly (คนละสไตล์กับที่เหลือ)

**สำคัญ:** อาร์ตปัจจุบันของ KunJae ตัดมาจาก**วิดีโอ** ไม่ใช่ภาพนิ่ง — ถ้าอยากได้ผลใกล้เคียงที่สุด **ให้เจนเป็นวิดีโอต่อ** แล้วส่งมาให้ตัดเฟรม วิธีนี้ได้จังหวะการเคลื่อนไหวลื่นกว่าเจนภาพนิ่งทีละท่ามาก (ท่าวิ่ง 8 เฟรมขาสลับซ้าย-ขวาจริงได้เพราะวิธีนี้)

ถ้าจะเจนภาพนิ่ง ใช้ท่อนนี้:

> Semi-realistic painterly anime illustration, detailed soft-gradient rendering with rich color depth and dramatic directional lighting — match the rendering technique of the attached reference exactly. NOT flat cel shading, NOT crisp uniform line-art.
>
> Three-quarter view, body angled toward the viewer's right. Young woman, athletic build, long wavy dark red hair, dark red wide-brim cowboy hat, cream/off-white western shirt with maroon yoke embroidery and shoulder fringe, black fingerless MMA-style leather gloves, blue jeans under dark brown fringed leather chaps with metal ring details, wide belt with a large oval bull-skull buckle, coiled rope at the hip, worn brown leather boots.

## 2.2 Dear — cel-shaded, หน้าตรง

> Clean 2D anime line-art illustration, crisp confident linework, flat-to-soft cel shading, muted naturalistic color grading. NOT painterly, NOT glossy splash art.
>
> **Front-facing view, body facing the viewer straight-on — NOT a side profile, NOT a 3/4 turn.** Slim young man, messy curly orange-red hair, pale white face with clown makeup and a faint red smile, tattered off-white ruffled clown costume with a large frilled collar, puffed sleeves with ruffled cuffs, dark red ribbons, red pom-poms on the chest, white bandage wraps on hands and lower legs, black lace-up boots with red pom-poms.

## 2.3 March — cel-shaded, 3/4

> Clean 2D anime line-art illustration, crisp confident linework, flat-to-soft cel shading, muted naturalistic color grading. NOT painterly, NOT glossy splash art.
>
> Three-quarter view, body angled toward the viewer's right. Young adult man, short spiky black hair, thin black-rimmed glasses, black crew-neck t-shirt fitted over a muscular athletic build, light gray loose training pants tied at the waist with a black sash, black slip-on shoes.

---

# ส่วนที่ 3 — ท่อนปิดท้าย (ใส่ทุก prompt ไม่มีข้อยกเว้น)

## สำหรับตัว cel-shaded (Dear / March / Bomb)

> **Style lock — match the attached reference image exactly:**
> - Line weight: thin, even, consistent width throughout — NOT variable/rough ink lines
> - Shading: flat-to-soft cel shading with 2-3 tone steps — NOT painterly gradients, NOT soft airbrush blending
> - Colors: clean and flat within each shape — NOT textured, NOT weathered, NOT distressed
> - No added grime, blood, wear, scuffing, or damage unless explicitly requested
> - No halftone, no screentone, no manga-panel texture
> - This must look like the SAME character drawn by the SAME artist in the SAME finished style as the reference — not a rougher sketch version, not a moodier alternate take

## สำหรับ KunJae (painterly)

> **Style lock — match the attached reference image exactly:**
> - Rendering: soft painterly gradients with visible form shading and directional light — NOT flat cel shading, NOT crisp uniform line-art
> - Color depth: rich and layered within each material (leather, denim, and cloth should read differently) — but keep the palette identical to the reference
> - Detail level: identical to the reference — do not add extra buckles, straps, patterns, or ornaments
> - No added grime, blood, wear, or damage unless explicitly requested
> - This must look like the SAME character rendered by the SAME artist in the SAME finished style as the reference — not a rougher sketch, not a moodier alternate take

---

# ส่วนที่ 4 — เช็คลิสต์

## ก่อนกดส่ง prompt

- [ ] แนบเฟรมจาก atlas จริงเป็นภาพแรกแล้วหรือยัง
- [ ] เลือก style anchor **ตรงกับตัวละครนั้น** หรือยัง (cel vs painterly)
- [ ] ระบุมุมกล้อง + ทิศทาง (หันขวา) แล้วหรือยัง
- [ ] ใส่ข้อกำหนดทางเทคนิค (พื้นขาว / เต็มตัว / หัวเท่าเดิม / แขนขาไม่ซ้อน) แล้วหรือยัง
- [ ] ใส่ท่อน Style lock ปิดท้ายแล้วหรือยัง
- [ ] ถ้ามีภาพอ้างอิงท่าทางแยก ระบุ "ท่าจาก B / สไตล์จาก A" แล้วหรือยัง
- [ ] คำบรรยายที่มีอารมณ์แรง (`horror`, `menacing`, `bloody`) ไม่ได้แย่งน้ำหนักคำสั่งสไตล์ใช่ไหม

## หลังได้ภาพมา

**ตัดสินที่ขนาดจริงในเกม (~190px) ไม่ใช่ขนาดเต็ม** — วางเทียบกับเฟรมเดิมเคียงข้างที่ขนาดเท่ากัน
รายละเอียดที่ดู "เพี้ยน" ตอนเปิดเต็มจอ ส่วนใหญ่มองไม่ออกเลยตอนย่อลงมา สิ่งที่ต้องแคร์จริงคือ **ซิลูเอต** กับ **ขนาดหัว**

**เกณฑ์ reject:**
- แขน/ขาเกินหรือซ้อนกัน → ทิ้งทันที แก้ไม่ได้
- ท่าอ่านไม่ออกว่าเป็นท่าอะไรถ้าไม่อธิบาย → ทิ้ง (เคยได้ท่า "กอดอกหัวเราะ" มาเป็นท่าตี ใช้ไม่ได้)
- มุมกล้อง/ทิศทางไม่ตรงเฟรมอื่น → ขอ revision ไม่ต้องทิ้ง แนบตัวที่ผิดไปเป็น reference แล้วบอกให้แก้เฉพาะมุม
- ขนาดหัวต่างจากเฟรมอื่นชัดเจน → ขอ revision

**ท่าที่ reject ไม่ต้องทิ้งเสมอไป** — เคยเอาท่าที่ reject จาก "หมัดที่ 3" ไปใช้เป็น taunt ได้

---

# ส่วนที่ 5 — เฟรมที่ยังขาดของแต่ละตัว

| ตัวละคร | ยังขาด |
|---|---|
| **Dear** | ครบแล้ว (15 เฟรม) — เหลือ `stance`/`kick` ที่มีเฟรมแต่ยังไม่ผูกเข้าระบบ |
| **March** | run (ขาไม่สลับซ้าย-ขวา ต้องทำใหม่), jump, fall — ตอนนี้เหลือแค่ idle/hit/hurt |
| **KunJae** | **hurt** (ในวิดีโอไม่มีจังหวะโดนตีเลย ตอนนี้ยืมเฟรมควันปืนไปก่อน) |
| **Bomb** | ท่าวิ่งยังดูเหมือนวิ่งขาเดียว |
| Tee / Oat / Sing | ยังไม่เริ่มเลย |

---

## 2.5 Nyx (SCRAMBLE) — คนละไปป์ไลน์กับโหมดปกติ

Nyx ไม่ได้เจนทีละเฟรมแบบตัวอื่น แต่สั่งเป็น **ชีตหลายท่าในภาพเดียว** แล้วให้
`game/tools/sheet_poses.py` ตัดแยกตามลำดับการอ่าน (ซ้าย→ขวา บน→ล่าง)

- สไตล์: chibi หัวโต เส้นหนา เงาแบน โทนหม่น — คนละสไตล์กับ 4 ตัวในตาราง
- มุมกล้อง: 3/4 **หันขวาทุกท่า** เกมพลิกภาพเอง
- **ขนาดตัวต้องเท่ากันทุกท่าในชีต** ข้อนี้พังมาแล้ว 2 รอบ

วิธีวัดสเกลชีต (`tools/measure_sheet_scale.py`) วัด 2 ทางคู่กัน: โทนผิวบนใบหน้า และมวลผม
เพราะสองอย่างนี้โดนบังคนละแบบ — หน้าโดนมือ/ดาบ/ผมหน้าม้า ส่วนผมโดนหมวกหรือหน้ากาก
ต่างกันเกิน 15% = อย่างน้อยหนึ่งทางโดนบัง ห้ามเชื่อค่าไหนลอย ๆ ให้ build แล้ววัดของจริง

ตัวเลขยืนยันเสมอ: **ความสูงเฟรมจริงเทียบท่ายืน — ท่าตั้งหลักต้องได้ 96-100%**
(ท่ากันและท่าจิ้มอยู่ที่ 98%) ท่าย่อ/ท่าพุ่งลึกต่ำกว่านั้นถือว่าถูก

prompt ของสกิลอยู่ที่ `art_prompts_nyx_skills.md`
