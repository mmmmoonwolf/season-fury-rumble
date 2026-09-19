# ท่ายืน (idle) ทั้ง 3 ตัว — ชุด prompt สำหรับนั่งเจนตอนว่าง

## หลักคิดก่อนเจน: ให้ "วิธีเคลื่อนไหว" เป็นตัวบอกนิสัย ไม่ใช่แค่ท่าโพส

ท่ายืนคือสิ่งที่ผู้เล่นเห็นนานที่สุดในเกม และสิ่งที่บอกนิสัยตัวละครได้ดีกว่าท่าโพส คือ **จังหวะการเคลื่อนไหว**

| ตัวละคร | นิสัย | วิธีเคลื่อนไหว | เฟรม | ความเร็ว loop |
|---|---|---|---|---|
| **March** | บู๊ประชิด พร้อมพุ่ง | เขย่งสม่ำเสมอ ถี่ ๆ | 8 | เร็ว ~0.8 วิ |
| **Dear** | ตัวตลกกวน ๆ แหย่ ๆ | โยกเยกไม่เป็นจังหวะ มีหยุดค้างแกล้ง | 8 | กลาง ~1.3 วิ |
| **Bomb** | ขรึม น่ากลัว | **แทบไม่ขยับเลย** | 5 | ช้ามาก ~2.4 วิ |

**ข้อที่อยากเน้น: Bomb ต้องขยับ "น้อยกว่า" เพื่อน ไม่ใช่มากกว่า**
ตัวที่น่ากลัวในเกมต่อสู้คือตัวที่ยืนนิ่งขณะที่คนอื่นขยับตลอด ความนิ่งมันอ่านว่า "ไม่ต้องรีบ" ซึ่งข่มกว่าท่าขู่ใด ๆ
ถ้าให้ Bomb เขย่ง 8 เฟรมเหมือน March เขาจะกลายเป็นนักมวยธรรมดาทันที และจะไม่ต่างจากตัวอื่นเลย

**ระบบรองรับแล้วทั้งหมด** — `characterAnims.js` รับเฟรมกี่เฟรมก็ได้ ตั้งความเร็วต่อตัวละครได้ (`timing.idleFps`)
และ**ค้างบางเฟรมนานกว่าเพื่อนได้** (ใส่ `{ frame, hold }`) ซึ่งจำเป็นสำหรับจังหวะไม่สม่ำเสมอของ Dear

---

## กติกาที่ใช้ร่วมทุกตัว (ห้ามตัดออก)

ต่อท้ายทุก prompt:

> Full body, feet at the bottom of the frame, centered, character at least 1264 px tall, pure white background, no shadow on the ground. **No text, no labels, no annotations anywhere in the image.** Match the exact character height, body proportions and camera framing of the reference image.

และประโยคคุมความต่อเนื่องระหว่างเฟรม:

> Identical pose, identical costume and identical camera framing as the reference frames. The ONLY thing that changes between frames is what this frame's description says. Do not change the stance, do not swap which foot is forward, do not change the arm positions unless stated.

**แนบภาพตัวละครตัวนั้นไปทุกครั้ง** และพอได้เฟรม 1 ที่ผ่านแล้ว ให้ใช้เฟรม 1 เป็น reference ของเฟรมที่เหลือ

---
---

# 1. March — เขย่งตั้งการ์ด 8 เฟรม

มีเฟรม 1 แล้ว (`idle_1`) ใช้เป็น reference ของอีก 7 เฟรม

**ปรับจากรอบที่แล้ว:** เฟรม 1 ที่ได้มาย่อลึกกว่าที่ควร ถ้าเฟรมสูงสุดเหยียดขาเต็มจะกลายเป็นสควอท
เลยต้องเพิ่มประโยคคุมระยะการเขย่งนี้ในทุกเฟรม:

> The bounce is subtle — the knees never fully straighten and the total vertical travel between the lowest and the highest frame is small, just a light bounce on the balls of the feet, not a squat.

Style anchor ใช้ของเดิมใน `art_prompts_march.md`

| ไฟล์ | prompt |
|---|---|
| `idle_1.png` | ✅ มีแล้ว — จุดต่ำสุดของการเขย่ง เข่างอลึกสุด ส้นเท้าลอยเล็กน้อย |
| `idle_2.png` | Rising: knees straightening a little, body about a quarter of the way up from the lowest point. |
| `idle_3.png` | Rising further: body halfway up, weight moving onto the balls of the feet. |
| `idle_4.png` | Near the top: legs almost at their straightest for this bounce, shoulders lifted slightly. |
| `idle_5.png` | Highest point of the bounce: body at its tallest, chest lifted, rear heel at its highest. |
| `idle_6.png` | Descending: body dropping back down, halfway between the top and the middle. |
| `idle_7.png` | Descending further: knees clearly bending again, body a quarter above the lowest point. |
| `idle_8.png` | Almost back to the lowest point — one frame away from matching frame 1 exactly, so the loop closes smoothly. |

---
---

# 2. Dear — ยืนกวน ๆ แหย่ ๆ 8 เฟรม

**คาแรกเตอร์:** ตัวตลกที่ไม่เอาจริงกับใคร ยืนไม่ตรง ข้อมือตก หัวเอียง ยิ้มกวน
**วิธีเคลื่อนไหวที่เข้ากับนิสัยนี้:** โยกซ้ายขวาแบบไม่เป็นจังหวะ ไม่ใช่ขึ้นลงสม่ำเสมอแบบ March
ประเด็นคือ **ความไม่สมมาตร** — ไหล่ข้างหนึ่งสูงกว่า หัวเอียงค้าง แล้วค่อยโยกกลับ

**จังหวะที่ตั้งใจ:** เฟรม 3 กับ 6 จะถูกค้างนานกว่าเพื่อนตอนเล่นจริง (ตั้งในโค้ด ไม่ต้องวาดเพิ่ม)
เพื่อให้ได้อารมณ์ "หยุดจ้องแกล้ง แล้วค่อยโยกต่อ" ซึ่งเป็นสิ่งที่ทำให้ดูกวนมากกว่าโยกเรื่อย ๆ

Style anchor: ใช้ของ Dear เดิม (ตัวตลกผมส้ม ชุดขาวหม่นขาดรุ่ย ริบบิ้นแดง ปอมปอมแดง ผ้าพันแผล บูทดำ) เพิ่มบรรทัดนี้:

> Loose, unserious posture — sloppy and off-balance on purpose, wrists limp, shoulders uneven, weight thrown onto one hip. He is not in a fighting stance and does not look ready to fight.

| ไฟล์ | prompt (ต่อจาก style anchor) |
|---|---|
| `idle_1.png` | Standing with weight thrown onto the **right hip**, torso leaning slightly right, head tilted to the right, both arms hanging loose with limp wrists, faint smug half-smile. This is the far right end of a slow lazy sway. |
| `idle_2.png` | Swaying back toward centre: torso a third of the way back to upright, head still tilted but less, arms swinging loosely a beat behind the body. |
| `idle_3.png` | Passing through centre but **not** upright — shoulders uneven, one shoulder clearly higher, chin lifted slightly as if looking down at the opponent, smirk widening. |
| `idle_4.png` | Continuing past centre toward the left, torso leaning slightly left, arms trailing behind the motion, head starting to tilt the other way. |
| `idle_5.png` | Weight now on the **left hip**, torso leaning left, head tilted to the left, arms hanging loose — the mirror end of the sway. |
| `idle_6.png` | Held at the left lean, but **the head turns toward the viewer's right to stare forward** with a wide teasing grin, one eyebrow raised. Everything else unchanged. |
| `idle_7.png` | Swaying back toward centre from the left, head turning back down, grin settling, arms trailing. |
| `idle_8.png` | Almost back to the frame 1 position on the right hip — one frame away from closing the loop, with a small shrug of one shoulder. |

---
---

# 3. Bomb — ยืนขรึม น่ากลัว 5 เฟรม

**คาแรกเตอร์:** ยมทูตในร่างคน คนที่ไม่ควรเข้าใกล้
**วิธีเคลื่อนไหว: แทบไม่ขยับเลย** — ทั้ง loop มีแค่ลมหายใจกับชายโค้ทไหวเบา ๆ
**ห้ามยกการ์ด ห้ามตั้งท่าสู้** เขาไม่จำเป็นต้องตั้งการ์ด นั่นคือประเด็นทั้งหมดของตัวละครนี้

5 เฟรมเล่นช้ามาก (~2.4 วิต่อรอบ) จะให้ความรู้สึกว่าเขาอยู่คนละความเร็วกับคนอื่นในฉาก

Style anchor: ใช้ของ Bomb ชุดดำเดิม (รวมบรรทัดเรื่องรอยพับเทาอ่อน + rim light) เพิ่มบรรทัดนี้:

> Completely still and unbothered, hands relaxed at his sides, not in a fighting stance, no raised guard. Chin level, gaze fixed forward and slightly down, expression cold and empty rather than angry. The stillness is the point — he looks like he is waiting for something inevitable.

| ไฟล์ | prompt (ต่อจาก style anchor) |
|---|---|
| `idle_1.png` | Standing perfectly still, weight evenly on both feet, arms relaxed at the sides, coat hanging straight down, chest at the bottom of a slow breath. |
| `idle_2.png` | Identical pose, mid-inhale: chest and shoulders lifted very slightly, coat hem beginning to drift back a fraction as if in a faint draught. |
| `idle_3.png` | Identical pose, top of the inhale: shoulders at their highest, the coat tails drifted furthest back, a few strands of hair lifted. This is the only frame with any visible movement, and it is still barely noticeable. |
| `idle_4.png` | Identical pose, exhaling: shoulders settling back down, coat tails falling back toward vertical. |
| `idle_5.png` | Identical pose, almost back to frame 1: coat hanging nearly straight, one frame away from closing the loop. |

**ถ้าออกมาแล้วดูขยับเยอะไป** สั่งเพิ่ม: `the difference from the reference frame must be almost imperceptible — only the coat and the shoulders move, by a very small amount`

---
---

## ตอนได้ครบผมจะทำให้

- ประกอบ atlas ต่อตัว (normalize ด้วยขนาดหัว จัด align เท้า — สคริปต์ `tools/make_bomb.py` ใช้ซ้ำได้ แค่เปลี่ยนลิสต์ไฟล์)
- ตั้งความเร็ว loop ต่อตัวละคร: March ~10fps, Dear ~6fps, Bomb ~2fps
- ใส่ค้างเฟรม 3 กับ 6 ของ Dear ให้ได้จังหวะแกล้ง
- สร้าง `March.js` + ใส่เข้าทะเบียนตัวละคร (กด V/C สลับได้เลย)

**ส่งมาทีละตัวได้** ไม่ต้องรอครบทั้งสามชุด
