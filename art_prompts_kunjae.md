# KunJae — Prompt ครบชุด (อัปเดตตามที่ตัดสินใจล่าสุด)

**ดีไซน์ที่ล็อกแล้ว:** คาวบอย/คาวเกิร์ลสาย MMA — **ตัดปืนออก** ท่าตีปกติเป็นหมัด/เตะ/ทุ่ม-กดพื้น + **เก็บคิงคองไว้เป็นไม้ตายคูลดาวน์ยาว**

**สถานะตอนนี้:** มีแค่ `idle_1.png` เฟรมเดียวใน atlas — ท่าอื่นยืมท่ายืนไปก่อนทั้งหมด (เหมือน March ก่อนจะแก้)

---

## ⚠️ อ่านก่อนเจน

**1. แนบภาพอ้างอิง 2 อันทุกครั้ง:**
- เฟรม `idle` ที่อยู่ในเกมตอนนี้ (`assets/characters/kunjae_atlas.png`) — ล็อกมุมกล้อง + ขนาดหัว + สไตล์
- character reference sheet (turnaround + expressions + action poses) — ล็อกรายละเอียดคอสตูม

**2. สไตล์:** คง painterly/semi-realistic ตามต้นฉบับ **ไม่ต้องแปลงเป็น cel-shaded แบบ Dear/March** (ตัดสินใจแล้วว่าฉีกได้)

**3. มุมกล้อง:** 3/4 หันขวา ตรงกับเฟรม idle ที่มีอยู่ — **ห้ามเป็น side-view เต็ม และห้ามหันหน้าตรง**

**4. ขนาด:** วาดเต็มตัวทุกเฟรม ความสูงเท่า reference เป๊ะ — อย่าซูมเข้า/ครอป เพราะระบบใช้ความสูงตัวยืนเป็นตัวจัดขนาด (393px convention)

---

## Style anchor (วางท้ายทุก prompt)

> Semi-realistic painterly anime illustration style, detailed soft-gradient rendering, rich color depth — match the rendering technique of the reference image exactly. Pure white background, no shadow. Three-quarter view, body angled toward the viewer's right, matching the reference framing exactly — NOT a flat side profile, NOT front-facing. Athletic build, long red hair, red cowboy hat with a braided band, cream/off-white western shirt with maroon yoke embroidery and shoulder fringe, fingerless MMA-style leather gloves, blue jeans under dark brown fringed leather chaps with metal ring details, a wide belt with a large bull-skull buckle, a coiled rope hanging at the hip, worn brown leather boots. Exactly two legs and two arms clearly separated, do not overlap or duplicate limbs, anatomically correct human proportions. Same exact height and same head size as the reference, full body visible head to boots.

---

## 1. stance (ตั้งการ์ด)

> [แนบ idle + reference sheet]
> Same character shifting into an MMA fighting guard: both fists raised loosely near the jaw, elbows tucked in tight to the ribs, chin down, weight on the balls of the feet, knees softly bent, sharp focused expression — hands empty, no weapon.
> [+ style anchor]

---

## 2. run — 4 เฟรม

เจนทีละเฟรม แล้ว**เอาเฟรมที่ผ่านแล้วแนบเป็น reference ของเฟรมถัดไป** กันสไตล์เพี้ยนระหว่างทาง

| ไฟล์ | prompt |
|---|---|
| `run_1.png` | Same character mid-sprint, front leg extended forward in a long stride about to plant, back leg trailing extended behind, arms in a natural counter-rotating running swing, long red hair and chaps fringe streaming backward from the speed, focused determined expression, motion streaks at the trailing boot. |
| `run_2.png` | [แนบ run_1] Same character, the opposite phase of the reference: front knee driving high and forward with the thigh near-horizontal, back leg extended straight behind, arms swapped to the opposite counter-rotation, same hair and fringe motion, same running energy. |
| `run_3.png` | [แนบ run_1 + run_2] Same character, the in-between passing phase of the two reference frames: both legs close together with the rear foot just leaving the ground and the front leg beginning to extend, torso rising slightly at the top of the stride, arms mid-swing. |
| `run_4.png` | [แนบ run_2] Same character, the mirrored phase of the reference: the opposite knee now driving high while the other leg extends behind, arms swapped accordingly, same energy and motion streaks. |

---

## 3. jump / fall / land

| ไฟล์ | prompt |
|---|---|
| `jump.png` | Same character at the peak of a jump, clearly airborne: both legs bent and tucked upward, torso leaning slightly forward, one arm raised for balance and the other bent near the chest, hat brim tilted from the upward rush, red hair streaming below, gritted determined expression, light upward motion streaks. Clear gap beneath both boots, no ground line. |
| `fall.png` | [แนบ jump] Same character now descending after the apex — falling, not rising. Torso more upright and vertical than the reference, both legs bent gathering underneath the body to absorb the coming impact, arms bent close to the sides for balance, calm-alert expression rather than the gritted jump face, no motion streaks. Clearly airborne. |
| `land.png` | [แนบ fall] Same character in a controlled landing crouch: both knees bent deep absorbing impact, one gloved hand planted on the ground for balance, back curved slightly forward, weight low and centered, hair and fringe settling downward from the drop, focused expression looking forward, small dust puffs at both boots rendered in the same painterly technique. |

---

## 4. หมัด 1 — ชกตรง

> [แนบ stance]
> Same character at the exact moment of impact of a straight cross punch: rear arm fully locked out forward at chest height, hips squared through the punch, weight driven fully onto the front foot, lead hand pulled back tight to the jaw guarding, sharp fierce expression, straight motion streaks trailing behind the striking fist.
> [+ style anchor]

## 5. หมัด 2 — เตะเหวี่ยง

> [แนบ หมัด 1 เป็นเฟรมก่อนหน้า]
> Same character at the moment of impact of a roundhouse kick, continuing as the second hit of the combo after the reference punch: kicking leg fully extended in an arc at chest/head height with the shin leading, hips rotated hard through the kick, supporting leg pivoted on the ball of the foot, both arms pulled in tight across the body for balance, fierce committed expression, curved motion streaks trailing the striking shin.
> [+ style anchor]

## 6. หมัด 3 / ปิดคอมโบ — ทุ่มลงพื้น + กดซ้ำ (2 เฟรม)

**สำคัญ:** ในชีทอ้างอิงมีคู่ต่อสู้อยู่ในภาพด้วย — **เฟรมที่จะเอาเข้าเกมต้องไม่มีคู่ต่อสู้** เพราะระบบจะซ้อนทับ sprite ของตัวที่โดนจริงในเกม

| ไฟล์ | prompt |
|---|---|
| `hit3_1.png` (ทุ่ม) | Same character driving forward and low into a takedown, both arms reaching down and forward as if seizing and slamming an opponent toward the ground, body coiled with fully committed weight, head down, intense determined expression, impact motion streaks. **Render the character alone — pose the arms as if grappling into empty space at ground level. Do NOT draw a second person.** |
| `hit3_2.png` (กดซ้ำ) | [แนบ hit3_1] Same character kneeling low immediately after the takedown, one fist cocked back and driving straight downward for a finishing strike, the other hand braced on the ground, hair and fringe swinging from the motion, fierce committed expression, sharp impact streaks at the striking fist. **Render the character alone — strike into empty space at ground level. Do NOT draw a second person.** |

---

## 7. hurt (โดนตี)

> [แนบ idle]
> Same character recoiling from a hit: upper body snapped backward and off-axis, head tilted back with a pained wince — eyes squeezed, teeth clenched, both arms thrown outward loosely from the impact rather than guarding, hat knocked askew, red hair whipping forward past the face, one leg buckling slightly for imbalance, short motion streaks showing the backward snap. No blood — impact read purely through pose and expression.
> [+ style anchor]

## 8. taunt (ยกปีกหมวก)

> [แนบ idle + reference sheet เฟรม "Taunt / Adjust Hat"]
> Same character tipping the brim of the cowboy hat down with one hand in a confident taunt, weight shifted casually onto one leg, the other hand resting at the hip near the coiled rope, cocky smirk, relaxed body language.
> [+ style anchor]

---

## 9. ไม้ตาย — เรียกคิงคอง

ระบบนี้มีอยู่แล้วในเกม (Bomb ใช้เรียกร่างยมฑูต ดู `stand.config.js` + `reaper_atlas`) คิงคองจะใช้โครงเดียวกัน แต่ **คิงคองเป็น sprite แยกอีกไฟล์** ไม่ได้อยู่ใน atlas ของ KunJae

**ส่วนของ KunJae เอง:**

| ไฟล์ | prompt |
|---|---|
| `summon.png` | Same character in a summoning pose: one arm raised high overhead with the fist clenched, head tilted back, mouth open in a shout, the other arm braced out to the side, coat fringe and hair blown upward by a rush of wind from below, feet planted wide and firm, intense commanding expression. |

**ส่วนของคิงคอง (sprite แยก — เจนทีหลังได้ ไม่เร่ง):**

| ไฟล์ | prompt |
|---|---|
| `gorilla_rise.png` | A colossal silver-backed gorilla erupting upward into frame, chest and shoulders filling the view, arms spread wide, mouth open in a roar, dust and debris streaking outward from the base. Three-quarter view facing the viewer's right. Same painterly semi-realistic rendering style as the reference character. Pure white background, no shadow. |
| `gorilla_slam.png` | The same colossal gorilla mid-slam: both massive fists driving straight down toward the ground, shoulders hunched forward with the full weight behind the blow, face contorted in a roar, heavy impact streaks trailing the arms. Same angle, style, and scale as the previous frame. |

---

## หลังเจนเสร็จ

ส่งรูปกลับมาในแชท บอกว่าเฟรมไหนเป็นท่าอะไร แล้วจะ:
1. ตัดพื้นหลัง + normalize (ท่าติดพื้นจัดที่เท้า / ท่าลอยจัดที่หัว / คุมขนาดให้เท่ากันทุกเฟรม)
2. ประกอบเข้า `kunjae_atlas.png` + `.json`
3. แก้ `FRAME` ใน `KunJae.js` ให้ชี้เฟรมจริง (ตอนนี้ชี้ `idle_1.png` หมดทุกช่อง)
4. ต่อระบบไม้ตายเรียกคิงคองเข้ากับโครง stand ที่มีอยู่

**เกณฑ์ตรวจ:** มุม 3/4 หันขวาตรงกับ idle เดิม, ขนาดหัวเท่ากันทุกเฟรม, เต็มตัวไม่โดนครอป, ไม่มีแขน/ขาเกิน, ท่าอ่านออกว่าเป็นท่าอะไรโดยไม่ต้องอธิบาย

**บทเรียนที่เจอมาแล้ว อย่าพลาดซ้ำ:**
- ถ้ารูปที่เจนมาเป็น **emote/ท่าทางเฉย ๆ** แทนที่จะเป็นท่าตีที่อ่านออก → reject แล้วขอใหม่ อย่าฝืนใช้
- เช็คว่าเป็น**เฟรมใหม่จริง** ไม่ใช่รูปเดิมที่เคยผ่านแล้วส่งซ้ำ (เคยเกิดกับ March)
- อาร์ตผ่านในแชท ≠ อยู่ในเกม — ต้องประกอบ atlas + แก้ JS ถึงจะเห็นผลจริง
