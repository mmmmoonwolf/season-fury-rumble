# สรุปตัวที่ยังขาด — Bomb (นิ่งน่ากลัว 3/4) + Boss (ท่าเต็มชุด)

**ยืนยันแล้ว:** KunJae ใช้แผนตามที่เสนอ (ปืนเป็นหมัดปกติ + เรียกคิงคองเป็นไม้ตาย) — prompt อยู่ใน `art_prompts_full_roster_34.md` แล้ว ไม่ต้องเจนใหม่
**Dear / March** prompt ก็อยู่ในไฟล์เดียวกันนั้นครบแล้ว ใช้ได้เลย

ไฟล์นี้เติมเฉพาะ 2 ส่วนที่ขาด: **Bomb เวอร์ชันแก้ทิศทาง** และ **Boss ท่าเต็มชุด** (ไม่เคยมี prompt มาก่อน มีแค่ภาพนิ่ง 1 ภาพ)

---
---

# ส่วนที่ 1 — Bomb: นิ่งน่ากลัว มุม 3/4

**กลับไปตามคาแรกเตอร์เดิมที่ตกลงกันไว้:** ความนิ่งคือสิ่งที่ทำให้เขาน่ากลัว ไม่ใช่การขยับเยอะ
คลิปที่ส่งมารอบก่อน **ไม่ใช้** (มือ/ชายเสื้อขยับเยอะเกินไป ขัดกับคาแรกเตอร์) — เจนใหม่ตามสั่งนี้แทน

## Style anchor (ใช้ของ Bomb เดิม + มุม 3/4)

> Clean 2D anime line-art illustration style, crisp confident linework, flat-to-soft cel shading, muted naturalistic color grading. NOT painterly. **Three-quarter view: torso angled about 30 degrees toward the viewer, character facing and moving toward the RIGHT.** Pure white background, no shadow, no text.
>
> Tall slim young man, sharp narrow eyes, faint thin scar near one eye, short swept-back silver-white hair. Long black coat reaching below the knees, black high-neck turtleneck, small silver cross necklace, black leather gloves, black trousers with thigh belt straps, black lace-up combat boots. **The black coat must NOT be a flat black silhouette** — render fabric folds in clearly lighter grey values with a subtle pale rim light along the edges, so the pose reads at small size.
>
> **Completely still and unbothered.** Hands relaxed, not in a fighting guard. Chin level, gaze fixed forward and slightly down, expression cold and empty rather than aggressive. He looks like he is waiting for something inevitable — the stillness itself is the threat.

**ต่อท้ายทุก prompt:** Full body, feet at the bottom, centered, at least 1264 px tall, pure white background. Match the exact character height and proportions of the attached reference.

## idle + fighting stance — 1 เฟรมต่อท่า (ไม่เจนหลายเฟรม)

| ไฟล์ | prompt |
|---|---|
| `idle.png` | Standing perfectly still, weight even on both feet, arms relaxed at the sides, coat hanging straight down. No guard, no tension in the pose. |
| `stance.png` | **Barely different from idle** — a very slight forward weight shift, one hand loosely curling at the side, chin dropping a fraction lower. This is not a boxing guard; it is the same stillness, just slightly more attentive. |

## วิ่ง — สูตรมาตรฐาน 6 เฟรม แต่เพิ่ม:
> Even while running his expression stays flat and unbothered, as if this costs him no effort. Coat trailing heavily behind from the speed.

## กระโดด/ตก/ลงพื้น — เรียบง่าย ไม่โฉบเฉี่ยว (เขาไม่ใช่นักกายกรรม)

| ไฟล์ | prompt |
|---|---|
| `jump_1.png` | Rising straight up with minimal effort, coat flaring downward, expression unchanged from standing. |
| `jump_2.png` | Near the top, body still mostly upright and controlled, not curled up like an athlete. |
| `fall_1.png` | Falling straight down, coat lifting upward, posture still composed. |
| `fall_2.png` | Falling fast, legs reaching for the ground, coat pushed strongly upward, expression still flat. |
| `land.png` | Landing with minimal knee bend — he absorbs the impact easily, almost bored by it. One hand may brush the ground, but the pose reads controlled, not athletic or dramatic. |

## ท่าสั่งงาน 3 ท่า (แทนหมัด 1/2/3 — เขาไม่ตีเอง)

| ไฟล์ | prompt |
|---|---|
| `command_1.png` | A short forward step, one hand flicked forward and out at waist height, fingers loose as if flinging something invisible away. No fist, no punch. |
| `command_2.png` | The other hand sweeping across the chest in a short cutting gesture, torso turned slightly. |
| `command_3.png` | Both arms thrown open and back, chest forward, chin raised, coat flaring wide — commanding something large to strike. |

**เพิ่มท้ายทั้ง 3:** `He is not fighting with his fists. This is a commanding gesture. No speed lines, no impact effects, no weapon. Expression stays cold, not strained.`

## ร่างยมฑูต — ไม่ต้องเจนเพิ่ม (มีครบแล้ว)

---
---

# ส่วนที่ 2 — Boss: ท่าเต็มชุด (ไม่เคยมี prompt มาก่อน)

## เกี่ยวกับมุมกล้อง — บอสไม่ใช้ 3/4 เหมือนตัวละครผู้เล่น

เหตุผล: บอสไม่ถูกควบคุมโดยผู้เล่น ไม่มีทิศ "หันหน้าเข้าใครฝ่ายหนึ่ง" ตายตัว (โค้ดหันหน้าหาผู้เล่นที่ใกล้สุดแบบเรียลไทม์ พลิกซ้ายขวาได้)
**ใช้ด้านข้างเคร่งครัดเหมือนเดิม** (เหมือนภาพต้นฉบับที่ใช้อยู่) — ง่ายกว่าและ engine พลิกซ้ายขวาให้เองอยู่แล้วโดยไม่ต้องมีเฟรมสองมุม

## Style anchor (อ้างอิงจากภาพบอสที่ใช้อยู่ในเกม)

> Clean 2D anime line-art illustration style, crisp confident linework, flat-to-soft cel shading, muted naturalistic color grading. Strict side view, facing RIGHT. Pure white background, no shadow, no text.
>
> A massive heavyset bald bodybuilder-type man, thick short dark hair, thin glasses. Wears a sleeveless black bodysuit/singlet with leather shoulder straps, fingerless combat gloves with a red status light on the knuckle, black knee pads, heavy laced combat boots. **Carries a large black instrument case (cello-case shaped) strapped diagonally across his back at all times** — this case is his signature silhouette element, must appear in every frame.

**ต่อท้ายทุก prompt:** Full body, feet at the bottom of the frame, centered, character at least 1264 px tall (he is much larger and heavier-set than the player characters), pure white background.

## เฟรมที่ต้องการ — ออกแบบท่าให้ครบทุกช่วงของอีเวนต์

### 1. วาร์ปลงมา / ปรากฏตัว (2 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `warp_fall.png` | Falling straight down from above, both arms and legs slightly spread, the instrument case on his back trailing upward from the fall speed, intense glare down at the ground below. |
| `warp_land.png` | The instant of landing: both feet slamming down, knees bent deep, both fists driving into the ground on either side for extra impact, cracks radiating from the point of impact on the ground beneath him. |

### 2. ยืนเฉย/หันหาเป้าหมาย (1 เฟรม — ใช้แทนภาพปัจจุบัน)

| ไฟล์ | prompt |
|---|---|
| `idle.png` | Standing with feet planted wide and heavy, arms crossed or hanging heavy at the sides, head turned to look toward the viewer's right, an unimpressed and dismissive expression — he is not worried about anyone here. |

### 3. เงื้อก่อนทุบพื้น (ท่าที่ผู้เล่นต้องอ่านออกว่ากำลังจะโดนตี — 2 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `slam_windup_1.png` | Both arms raised high overhead, fists clenched together, torso twisted back, weight shifting onto the back foot — the beginning of a huge overhead swing downward. |
| `slam_windup_2.png` | **The peak of the wind-up:** both arms fully raised straight up, body arched back as far as possible, this is the clearest "about to strike" silhouette in the whole set — must read instantly as a warning even at small size. |

### 4. ทุบพื้น (จังหวะกระทบ — 2 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `slam_impact_1.png` | Both fists driving down together, arms about halfway through the downward swing, motion lines trailing above the fists. |
| `slam_impact_2.png` | **Full impact:** both fists buried into the ground, body bent forward low over the impact point, a wide shockwave crack radiating outward along the ground on both sides, dust and debris kicked up. |

### 5. ท่าโดนตี / เสียการทรงตัว (1 เฟรม)

| ไฟล์ | prompt |
|---|---|
| `hurt.png` | Staggering back half a step, head snapped slightly to the side, one hand raised defensively, a brief flash of irritation on his face rather than pain — he is annoyed, not hurt. Body still mostly upright; he does not go down easily. |

### 6. พ่ายแพ้ / หนีไป (2 เฟรม — ใช้ตอน HP หมด หรือหมดเวลา)

| ไฟล์ | prompt |
|---|---|
| `defeat.png` | Knees buckling, one hand clutching his chest, head down, the instrument case slipping off one shoulder strap — a moment of genuine defeat. |
| `escape.png` | Turning away and beginning to leap upward out of frame, glancing back over his shoulder with an annoyed expression, cape-like coattail (if any) or straps trailing from the motion — reads as "retreating," not "beaten." |

---

## หมายเหตุการต่อโค้ด (ไม่ต้องทำตอนนี้ แค่บันทึกไว้)

ตอนนี้ `Boss.js` ใช้ภาพนิ่งเดียวกับ tween บีบยืดแทนอนิเมชันจริง เมื่อได้เฟรมครบ:
- ท่าเงื้อ (`slam_windup_1/2`) ต่อเข้ากับช่วง `windupMs` ที่มีอยู่แล้วใน `boss.config.js` — ผู้เล่นจะเห็นสัญญาณเตือนจริงแทนการบีบตัวเฉยๆ (จูนบาลานซ์ดีขึ้นมาก เพราะตอนนี้อ่านยาก)
- `warp_fall/warp_land` ต่อเข้ากับ `_warpIn()` ที่มี tween จากด้านบนอยู่แล้ว
- `defeat`/`escape` ต่อเข้ากับ `_defeated()`/`_escape()` ตามลำดับ

ไม่ต้องเจนครบทุกเฟรมก่อนส่งมา — **`slam_windup_2` สำคัญที่สุด** เพราะเป็นเฟรมเดียวที่ผู้เล่นใช้ตัดสินใจว่าจะกระโดดหลบไหม ถ้าจะเจนแค่ท่าเดียวก่อน เอาท่านี้ก่อน
