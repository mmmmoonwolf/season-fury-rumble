# โรสเตอร์เต็ม 3/4 มุมกล้อง — ชุด prompt สั่งอาร์ตทีเดียวจบ

**หลักการที่ใช้ร่วมกันทุกตัวละคร** — อ่านก่อนเจน แล้วค่อยข้ามไปตัวละครที่ต้องการ

## Style anchor กลาง (แปะนำหน้าทุก prompt ของทุกตัว)

> Clean 2D anime line-art illustration style, crisp confident linework, flat-to-soft cel shading, muted naturalistic color grading. NOT painterly. **Three-quarter view: torso angled about 30 degrees toward the viewer, character facing and moving toward the RIGHT** — same camera convention for every pose. Both arms visible. Pure white background, no shadow on the ground, no background elements, no text, no labels.

**ต่อท้ายทุก prompt:**
> Full body, feet at the bottom of the frame, centered, character at least 1264 px tall, pure white background. Match the exact character height, proportions and camera angle of the attached reference image.

**แนบภาพท่ายืน 3/4 ที่ผ่านแล้วของตัวละครนั้นไปทุกครั้ง** — ทุกตัวมีอย่างน้อย 1 ภาพที่ยืนยันมุมกล้องถูกแล้ว ใช้เป็น anchor แทนการอธิบายหน้าตาใหม่ทุกครั้ง

**ทิศทางไม่ต้องคุม** จะหันซ้ายหรือขวาก็ได้ในภาพที่ส่งมา ระบบพลิกให้ตอนประกอบ atlas

---

## จำนวนเฟรมมาตรฐานต่อท่า (ใช้เหมือนกันทุกตัว ยกเว้นระบุพิเศษ)

| ท่า | เฟรม | หมายเหตุ |
|---|---|---|
| idle (ท่ายืนเขย่ง) | 1 | ใช้เฟรมเดียว + โค้ดเขย่ง (`IDLE_BOB_PX`) — เจนหลายเฟรมแล้วล้มเหลวมาแล้วสองรอบ (March, ตัวเอง) เพราะ AI คุมความต่างระดับ 2-3% ไม่ได้ |
| fighting stance (การ์ดพร้อมสู้) | 1 | ท่าเปลี่ยนจาก idle ตอนเริ่มขยับ/ใกล้คู่ต่อสู้ — เฟรมเดียวพอ |
| วิ่ง | 6 | สัมผัสพื้น→ผ่านกลาง→เหยียด ที่ 2 ข้าง (มีสูตรแล้ว ดูด้านล่าง) |
| กระโดดขึ้น | 2 | ขึ้นเริ่ม + ขึ้นสุด |
| ตกลง | 2 | เริ่มตก + ใกล้ถึงพื้น |
| ลงพื้น | 1 | สามจุดสัมผัส เข่า+มือ ไม่ใช่นั่งยอง (บทเรียนจาก March) |
| หมัด 1/2/3 | 3-4 ต่อหมัด | เงื้อ→กระทบ→คืนท่า |
| คอมโบปิดชุด | 8-10 | เฉพาะกรณีตีเอง (March/KunJae) — Bomb/Dear ใช้ระบบเรียกร่างแทน ไม่ต้องมีเฟรมนี้ |

**รวมต่อตัวละครที่ตีเอง (March, KunJae): ~32-36 เฟรม**
**รวมต่อตัวละครที่มีร่างช่วยตี (Dear, Bomb): ~14 เฟรมของตัวเอง + ชุดร่างแยกต่างหาก**

---
---

# วิ่ง — สูตรมาตรฐาน 6 เฟรม (ใช้กับทุกตัว)

ท่าหลัก: **มืออยู่ในท่าพร้อมสู้ตลอดการวิ่ง ไม่แกว่งแขนแบบนักวิ่ง** เอียงเข้าใกล้ด้านข้างมากกว่าท่ายืน (~15-20°)

| ไฟล์ | คำอธิบาย |
|---|---|
| run_1 | ขาขวาสัมผัสพื้นด้านหน้า ขาซ้ายเหยียดหลังดันพื้น |
| run_2 | ผ่านกลาง เข่าซ้ายพับใต้ตัว ขาขวาตรงรับน้ำหนัก จุดต่ำสุดของรอบ |
| run_3 | เหยียดออก ขาขวาดันหลังสุด ขาซ้ายแกว่งไปหน้า จุดสูงสุดของรอบ |
| run_4 | **สลับข้าง (กระจกของ run_1):** ขาซ้ายสัมผัสพื้นหน้า ขาขวาเหยียดหลัง |
| run_5 | สลับข้างของ run_2 |
| run_6 | สลับข้างของ run_3 |

**เช็คก่อนส่ง: run_1 กับ run_4 ต้องเห็นขาคนละข้างนำหน้า** ถ้าเหมือนกันคือพัง (บั๊กที่เคยเกิดกับ Bomb)

---
---

# 1. Dear — ตัวตลกปั่นๆ กวนๆ (แนบภาพ Dear 3/4 ที่มีอยู่ก่อนหน้า)

**คาแรกเตอร์ที่ต้องคง:** ไม่จริงจัง ท่าเยาะเย้ย มือไม่นิ่ง หัวเอียง ยิ้มกวนตลอดแม้ตอนต่อยจริง
สกิลคือลูกโป่งพิษสีแดง/ปล่อยพิษ — ท่าตีจึงควรมีอารมณ์ "โยน/ป้าย" มากกว่า "ชก" ตรงๆ

## idle + fighting stance

| ไฟล์ | prompt |
|---|---|
| `idle.png` | Loose lazy standing pose, weight thrown onto one hip, wrists limp, head tilted, smug half-smile. Not a fighting stance — he looks bored. |
| `stance.png` | **Transition into "fighting":** same lazy energy but now bouncing lightly on the toes, both hands loose and open (not fists) held around chest height, head still tilted, grinning wider as if this is a joke to him. |

## วิ่ง — ใช้สูตรมาตรฐาน แต่เพิ่ม:
> Running with a mocking exaggerated bounce, one hand trailing loosely behind, ribbon and pom-poms on the costume bouncing wildly, grinning the whole time.

## กระโดด/ตก/ลงพื้น

| ไฟล์ | prompt |
|---|---|
| `jump_1.png` | Take-off with an exaggerated cartoonish kick, one leg flung out sideways, arms thrown open, delighted expression rather than focused. |
| `jump_2.png` | Near the top, curled up loosely, still grinning, costume ribbons fluttering. |
| `fall_1.png` | Starting to fall, limbs loose and floppy like a puppet, head tilted back laughing. |
| `fall_2.png` | Falling fast, one arm reaching down casually as if unbothered by the fall. |
| `land.png` | Landing off-balance on purpose — one knee bent, the other leg splayed out, catching himself with one hand on the ground, still smirking, **not a clean athletic landing — a sloppy theatrical one.** |

## หมัด 1/2/3 — เน้น "ป้าย/แหย่" ไม่ใช่ชกตรง

| ไฟล์ | prompt |
|---|---|
| `hit1_1.png` | Wind-up: cocking one open hand back like preparing to slap or throw something, head tilted, taunting grin. |
| `hit1_2.png` | Mid-swing: the hand whipping forward in a loose slapping arc, wrist flicking at the end like tossing an object. |
| `hit1_3.png` | Follow-through: arm fully extended in the slap/throw motion, fingers splayed at the end as if just released something, delighted expression. |
| `hit2_1.png` | Wind-up with the other hand, body twisting the opposite way, still loose. |
| `hit2_2.png` | Mid-swing, the back-hand slap arcing across the body. |
| `hit2_3.png` | Follow-through, arm crossed fully across, head thrown back laughing. |
| `hit3_1.png` | Both hands coming together in front like cupping something to throw. |
| `hit3_2.png` | Both arms flinging forward together, releasing motion, wide manic grin. |
| `hit3_3.png` | Full extension, both arms out, a beat of stillness milking the moment — theatrical pose, like a performer finishing a trick. |

## คอมโบปิดชุด (ไม่ต้องมี — Dear คอมโบใช้ระบบหมุนตบเดิมที่มีอยู่แล้ว วนเฟรม hit1-3 ซ้ำ ไม่ต้องเจนเพิ่ม)

---
---

# 2. March — ไฟท์เตอร์จ๋าๆ (แนบภาพ March 3/4 ที่ผ่านแล้ว — ตัวนี้มีวิ่ง/กระโดด/ตก/ลงพื้นครบแล้ว รอแค่หมัด+คอมโบ)

**สิ่งที่ยังขาด:** หมัด 1/2/3 + คอมโบปิดชุด (วิ่ง/กระโดด/ตก/ลงพื้น เจนไปแล้วรอบก่อน ใช้ได้เลย)

## หมัด 1 — ต่อยขวา (5 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hit1_1.png` | Wind-up: weight shifting onto the front foot, right shoulder loaded back, right fist tight at the ribs, left hand up guarding the face. |
| `hit1_2.png` | Punch travelling forward, arm two-thirds extended, hips beginning to rotate. |
| `hit1_3.png` | **Impact:** right arm fully locked out straight forward at chest height, hips squared through the punch, sharp straight motion lines behind the fist. |
| `hit1_4.png` | Retracting halfway, hips unwinding. |
| `hit1_5.png` | Back to fighting stance. |

## หมัด 2 — ต่อยซ้าย (5 เฟรม, สลับข้างจริงไม่ใช่กลับภาพ)

| ไฟล์ | prompt |
|---|---|
| `hit2_1.png` | Wind-up for a left punch: left shoulder loaded back, left fist at the ribs, right hand guarding, torso coiled the opposite way. |
| `hit2_2.png` | Left punch travelling forward, hips rotating the opposite way. |
| `hit2_3.png` | **Impact:** left arm fully locked out straight forward, full hip rotation, straight motion lines. |
| `hit2_4.png` | Retracting the left arm. |
| `hit2_5.png` | Back to stance. |

## หมัด 3 — สองหมัดรัว (6 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hit3_1.png` | Fast right straight already half extended, driving forward. |
| `hit3_2.png` | **First impact:** right arm locked out, left fist already cocked ready to fire. |
| `hit3_3.png` | Right snapping back while left punch is already halfway out, both arms in motion. |
| `hit3_4.png` | **Second impact:** left arm locked out, deeper hip rotation than the first punch. |
| `hit3_5.png` | Both arms pulling back to the chest. |
| `hit3_6.png` | Back to stance. |

## คอมโบปิดชุด — พุ่งเข้า + เตะยกลอย (10 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `combo_1.png` | Dropping low and lunging forward, front knee deeply bent, both arms drawn back — start of a rushing dash. |
| `combo_2.png` | Fully extended dash, body almost horizontal, back leg trailing straight behind. |
| `combo_3.png` | Planting the front foot and beginning to rise, rear leg swinging up, one arm thrown upward for momentum. |
| `combo_4.png` | Rising kick launching, kicking leg sweeping up past waist height. |
| `combo_5.png` | Fully airborne, kicking leg extended high above head height, body arched back. |
| `combo_6.png` | Top of the arc, kicking leg at its highest, other knee tucked tight. |
| `combo_7.png` | Second airborne kick: the other leg snapping out forward at head height while still airborne. |
| `combo_8.png` | Both legs coming back under the body, starting to fall. |
| `combo_9.png` | Landing impact, three-point pose — **head up, not bowed, fingertips touching ground only.** |
| `combo_10.png` | Rising back into fighting stance. |

---
---

# 3. Bomb — ยมฑูตตีแทน (แนบภาพ Bomb 3/4 ใหม่ที่เพิ่งได้ — ถ้าตัดสินใจใช้มุมนี้แล้ว)

**สำคัญ:** Bomb **ไม่ตีเอง** — หมัด 1/2/3 และคอมโบให้ร่างยมฑูตวาบมาฟันแทนเหมือนเดิม (ระบบ `STAND_SLASH` มีอยู่แล้ว)
ดังนั้น **ไม่ต้องเจนท่าตี** ของ Bomb เอง — สิ่งที่ต้องเจนคือ **ท่าสั่งงาน 3 ท่า** (นิ่ง ไม่ใช่ชก) แทน

## idle + fighting stance

| ไฟล์ | prompt |
|---|---|
| `idle.png` | Standing still, calm and unbothered, hands relaxed — **ใช้เฟรมจากคลิปที่ได้มาแล้วถ้าตัดสินใจใช้มุม 3/4** |
| `stance.png` | Slight shift into readiness: one hand raised open at chest height as if about to gesture/summon, the other loosely fisted near the collar. Calm, not aggressive — this is a summoner's readiness, not a boxer's guard. |

## วิ่ง — ใช้สูตรมาตรฐาน แต่เพิ่ม:
> Coat trailing heavily behind from the speed, expression flat and unbothered even while running.

## กระโดด/ตก/ลงพื้น — มาตรฐานปกติ ไม่มีความพิเศษ (เขาไม่ใช่นักสู้กายภาพ ท่าจึงเรียบง่าย ไม่โฉบเฉี่ยว)

## ท่าสั่งงาน 3 ท่า (แทนหมัด 1/2/3)

| ไฟล์ | prompt |
|---|---|
| `command_1.png` | A short forward step, one hand flicked forward and out at waist height, fingers loose as if flinging something invisible away. No fist, no punch, arm NOT fully extended. |
| `command_2.png` | The other hand sweeping across the chest in a short cutting gesture, torso turned slightly, coat lifting a little. |
| `command_3.png` | Both arms thrown open and back, chest forward, chin raised, coat flaring wide — commanding something large to strike. |

**เพิ่มท้ายทั้ง 3 prompt:** `He is not fighting with his fists. This is a commanding gesture. No speed lines, no impact effects, no weapon.`

## ร่างยมฑูต — ไม่ต้องเจนเพิ่ม (มีครบแล้ว: rise/windup/swing + slash_high/low/cross/thrust)

---
---

# 4. KunJae — คาวบอย MMA + เรียกคิงคอง (แนบภาพ KunJae 3/4 ที่มีอยู่)

**✅ ตัดสินใจแล้ว (แทนที่เวอร์ชันปืนเดิมด้านล่างทั้งหมด):** ตัดปืนออก — ท่าตีปกติเป็น **หมัด/เตะ/ทุ่ม-กดพื้นแบบ MMA** ส่วน**คิงคองยังเก็บไว้เป็นไม้ตายคูลดาวน์ยาวเหมือนเดิม** (ผสมสองอย่างตามที่ตกลง ไม่ใช่เลือกทางเดียว)

Reference คอสตูมสำหรับแปลง 3/4: MMA-style fingerless leather gloves, cream western shirt with maroon fringe/embroidery, dark brown fringed leather chaps, belt with bull-skull buckle, coiled rope at hip, braided hair under a worn cowboy hat.

## idle + fighting stance

| ไฟล์ | prompt |
|---|---|
| `idle.png` | ใช้เฟรมที่มีอยู่แล้ว |
| `stance.png` | Shifting into an MMA-style guard: both fists raised loosely near the jaw, elbows tucked, weight on the balls of the feet, sharp focused expression — no gun, hands empty. |

## หมัด 1 — ชกตรง (3-4 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hit1_1.png` | Wind-up: weight shifting onto the front foot, rear fist loaded back near the ribs, lead hand up guarding the face. |
| `hit1_2.png` | Punch travelling forward, arm two-thirds extended, hips beginning to rotate. |
| `hit1_3.png` | **Impact:** arm fully locked out straight forward at chest height, hips squared through the punch, sharp straight motion lines behind the fist. |
| `hit1_4.png` | Retracting back to guard. |

## หมัด 2 — เตะเหวี่ยง (3-4 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hit2_1.png` | Wind-up: weight shifting fully onto the standing leg, kicking leg chambering with the knee raised, torso coiling for rotation. |
| `hit2_2.png` | Kick travelling forward in an arc, hips rotating hard, arms pulled tight for balance. |
| `hit2_3.png` | **Impact:** roundhouse kick fully extended at chest/head height, sharp motion lines trailing the striking foot. |
| `hit2_4.png` | Recovering, kicking leg resetting back to stance. |

## หมัด 3 / ปิดคอมโบ — ทุ่มลงพื้น + กดซ้ำ (2 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hit3_1.png` (Takedown) | Driving forward low to grab and slam an unseen opponent downward, body coiled with full committed force, intense determined expression, impact motion lines. Pose the arms/body as if grappling downward into empty space at ground level so this frame can be composited over any opponent sprite in-engine — do not render a second character. |
| `hit3_2.png` (Ground & Pound) | Kneeling low directly following the takedown, one fist driving downward for a final strike, braid and fringe swinging from the motion, fierce committed expression, sharp impact motion lines at the striking fist. Same empty-space composite rule as above. |

## ท่าเรียกคิงคอง (ไม้ตายแยก คนละระบบจากคอมโบด้านบน) — ไม่เปลี่ยนจากเดิม

## ท่าเรียกคิงคอง (ไม้ตาย) — 3 เฟรมของ KunJae + 3 เฟรมของคิงคอง

**ท่าของ KunJae (แทนคอมโบ):**

| ไฟล์ | prompt |
|---|---|
| `summon_1.png` | Two fingers raised to the lips in a sharp whistle gesture, other hand on the hip, confident smirk. |
| `summon_2.png` | Both arms thrown open wide, head tilted back, calling out. |
| `summon_3.png` | Bracing low, one arm shielding the face slightly as if something huge is about to land nearby. |

**คิงคอง (ร่างที่เรียกออกมา) — ต้องทึบและตัวใหญ่มาก ตรงข้ามกับยมฑูตของ Bomb ที่โปร่งจาง:**

> Style anchor เดียวกับด้านบน แต่คิงคองไม่ใช่มนุษย์ — ใช้คำอธิบายนี้แทนส่วนตัวละคร:
> A massive muscular gorilla, fully opaque and solid, rendered in the same clean anime line-art style as the rest of the roster (not photorealistic, not a different art style). Dark brown-black fur with visible muscle definition through the fur, small intense eyes, bared teeth. Scale: roughly 3x the height of a normal character.

| ไฟล์ | prompt |
|---|---|
| `kong_rise.png` | Rising up on both legs, chest puffed out, arms raised — a dominant emerging pose. |
| `kong_slam.png` | Both fists raised high above the head, about to slam down — the wind-up. |
| `kong_impact.png` | Both fists driving down into the ground at the bottom of the frame, impact lines radiating outward, dust motes. |

---
---

## ลำดับที่แนะนำ (อย่าเจนพร้อมกันทั้งหมด)

1. **Dear idle + stance** ก่อน — เช็คว่าสไตล์กวนๆ ยังอ่านออกในมุม 3/4 ไหม (มุมนี้อาจทำให้สีหน้าที่เป็นจุดขายของ Dear ดูเนียนไปแทนที่จะกวน)
2. **March หมัด 1 ชุดเดียว (5 เฟรม)** — ยืนยันว่าจังหวะหมัดที่เคยใช้ได้กับด้านข้างยังอ่านออกในมุม 3/4
3. ถ้าทั้งสองผ่าน ค่อยลุยที่เหลือทั้งหมด — จะได้ไม่เสียของเยอะถ้ามีจุดต้องแก้สไตล์กลางทาง

**✅ Bomb ตัดสินใจแล้ว: ใช้มุม 3/4 จากคลิปที่มีอยู่** — เดินหน้าเจนตาม prompt ของ Bomb ด้านบนได้เลย ไม่ต้องรอคำตอบอีก
