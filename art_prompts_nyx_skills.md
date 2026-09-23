# Nyx — Prompt สกิล 2 และ 3 (SCRAMBLE)

**สถานะ:** จิ้งจอก (ปุ่ม 1) กับอสูร (ปุ่ม 3) เข้าเกมแล้ว
(`@fox_sheet` = 678, `@oni_sheet` = 575 ใน `CLIP_STANDING_PX`)
**เทงงุ (ปุ่ม 2) ระบบพร้อมแล้ว รออาร์ตอย่างเดียว** — prompt อยู่ท้ายไฟล์

กติกาของชุดนี้: **ใส่หน้ากาก = สกิล · หน้าเปล่า = ท่าปกติ** ดูเฟรมเดียวก็แยกออก

ไฟล์นี้คู่กับ `game/tools/build_scramble_nyx.py` — ชีตที่ได้เอาไปวางที่ `/tmp/sc/` แล้วรัน build

---

## ⚠️ อ่านก่อนเจน

**1. แนบภาพอ้างอิง 2 อันทุกครั้ง**
- เฟรมจาก atlas จริงตอนนี้ (`game/assets/characters/scramble_nyx.png`) — ล็อกสัดส่วน มุมกล้อง ลายเส้น
- ภาพหน้ากากที่เลือกไว้ — สกิล 2 ใช้หน้ากากจิ้งจอก สกิล 3 ใช้หน้ากากอสูรเขาโค้ง

ไม่แนบ = ทรงเพี้ยน เคยพลาดมาแล้ว 2 รอบ ตัวยืดยาวขึ้น 20-25% ต้องเจนใหม่ทั้งชุด

**2. ทุกท่าหันขวาหมด** รวมท่าที่ในเกมจะหันกลับ — เกมพลิกภาพเอง ห้ามวาดหันซ้ายมาให้

**3. ขนาดตัวต้องเท่ากันทุกท่าในชีต** ระยะกล้องเดียวกัน ไม่ซูมเข้าออกระหว่างท่า
นี่คือข้อที่พังบ่อยที่สุด — **หน้ากากคือไม้บรรทัด** ต้องกว้างเท่ากันเป๊ะทุกท่า

**4. พื้นขาวล้วน** ไม่มีเงา ไม่มีเส้นพื้น ไม่มีเอฟเฟกต์เรืองแสง/ควันที่ลอยออกนอกตัว
(ควันวาดได้เฉพาะที่ติดกับตัว สคริปต์ตัดพื้นหลังด้วยความสว่าง ควันลอยแยก = ตัดเป็นคนละก้อน)

**5. เต็มตัวทุกท่า** เห็นตั้งแต่ปลายผมถึงฝ่าเท้าทั้งสองข้าง ห้ามครอป ห้ามให้เท้าหลุดขอบ

**6. ถ้าสไตล์ไหลระหว่างท่า** ให้เจนทีละท่าแล้วเอาท่าที่ผ่านแนบเป็น reference ของท่าถัดไป

---

## Style anchor — วางท้าย prompt ทั้งสองชุด

> Chibi-proportioned anime game sprite, large head relative to body, bold dark outlines, flat cel shading with subtle texture, muted desaturated palette — match the attached reference exactly. Character: small wiry ninja in a tattered charcoal-black kimono with ragged hem and torn sleeves, pale cream sash tied at the waist, tan cloth bandages wrapped around both shins and forearms, simple leather sandals, long black hair in a short ponytail. Holding one carved wooden dagger in each hand, light tan woodgrain blades. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props. Full body visible from the top of the hair to the soles of both feet — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs.

---

## สกิล 2 — Fox Step (หน้ากากจิ้งจอก) · 6 ท่า · 2 แถว แถวละ 3

พุ่งทะลุตัวคู่ต่อสู้แล้วหันกลับมาเฉือน
ท่า 1-3 = ช่วงพุ่ง · ท่า 4-6 = ช่วงฟันสวนกลับ

```
A 6-pose action sprite sheet of the same character, arranged in 2 rows of 3,
read left to right, top row first. Even spacing, no pose touching another.
The character wears a white kitsune fox mask with red markings, pointed fox
ears and a red crescent on the forehead, exactly as in the attached mask
reference. The mask must be the exact same size in all six poses.

Pose 1 — crouched low, back foot digging into the ground, left hand raised
holding the fox mask half-lifted to the face, mask not yet fully on, weight
loaded backward ready to launch forward.

Pose 2 — mask fully on, body stretched out almost horizontal in a forward
lunge dash, both daggers swept back behind the body, hair and kimono hem
streaming backward, front foot reaching far forward.

Pose 3 — skidding to a stop, knees deeply bent, torso still leaning forward,
both feet planted and sliding, daggers held low.

Pose 4 — torso twisted, right arm cocked back behind the shoulder with the
dagger raised, left arm across the chest, coiled to swing.

Pose 5 — right arm slashing across the body in a wide horizontal arc at
chest height, torso fully rotated into the swing, back foot pivoted.

Pose 6 — recovery, standing more upright, right arm extended out from the
follow-through, left dagger low, mask still on, settled and balanced.
```

---

## สกิล 3 — Oni Veil / ม่านอสูร (หน้ากากอสูร) · 9 ท่า · 3 แถว แถวละ 3

อัลติเมท ล่องหนสลับโผล่ฟัน 4 จังหวะ
ท่า 1-3 = สวมหน้ากาก+หายตัว · 4-5 = ฟันไขว้ · 6-7 = แทงสวนขึ้น · 7-9 = ไม้จบปักลง

```
A 9-pose action sprite sheet of the same character, arranged in 3 rows of 3,
read left to right, top row first. Even spacing, no pose touching another.
The character wears a white oni mask with two long curved dark horns, black
vertical streaks under hollow black eye sockets and a stitched mouth line,
exactly as in the attached mask reference. The mask must be the exact same
size in all nine poses.

Pose 1 — standing upright, right hand raising the oni mask toward the face,
mask covering only the upper half so part of the face is still visible.

Pose 2 — mask fully on, head bowed, both daggers crossed in front of the
chest, thin black smoke curling upward tight around the legs and feet.

Pose 3 — the figure half dissolved into black smoke, lower body already
turned to smoke wisps hugging the silhouette, upper body still solid.

Pose 4 — fully solid again, both arms flung wide apart in a finished
double cross-slash, daggers pointing outward to either side, kimono flared.

Pose 5 — dissolving again, this time the upper body fading into smoke while
the legs stay solid, daggers trailing dark streaks close to the body.

Pose 6 — low crouched stance, knees deeply bent, both daggers thrust
diagonally upward in front of the chest, chin tucked.

Pose 7 — airborne, both knees drawn up, both daggers raised and crossed
high above the head, kimono hem lifted, ready to slam down.

Pose 8 — landed, kneeling on one knee, both daggers driven straight down
into the ground in front, head low, shoulders hunched over the impact.

Pose 9 — rising out of the kneel, both daggers hanging at the sides, mask
still on with a hairline crack across it, body settling back to a stance.
```

---

## หลังได้ชีตมา

```sh
cp <ไฟล์> /tmp/sc/fox_sheet.jpg        # หรือ oni_sheet.jpg
cd game
python3 tools/measure_sheet_scale.py /tmp/sc/fox_sheet.jpg
```

**หน้ากากปิดหน้ามิดทำให้ทั้งสองวิธีวัดใช้ไม่ได้** (วัดจริงได้ค่ากระจาย 253% และ 42%)
ผมก็เชื่อไม่ได้เพราะหน้ากากบังผมอีกที วิธีที่ใช้ได้กับชีตใส่หน้ากากคือ:

1. ดู**ความกว้างหน้ากาก**ของทุกท่า ต้องเท่ากันหมด (ยอมให้ท่าที่หันข้างแคบกว่าได้) — เช็กว่าอาร์ตสเกลตรงกันไหม
2. เอา**ท่าที่ตั้งตรงที่สุดในชีต**เป็นตัวอ้างอิง ใส่ `CLIP_STANDING_PX` แล้ว build
3. วัดความสูงเฟรมจริงเทียบท่ายืน — ท่าตั้งหลักต้องได้ 96-100% ท่าพุ่ง/ย่อต่ำกว่านั้น


---

## สกิล 2 — Tengu Gale / ลมเทงงุ (หน้ากากเทงงุ) · 6 ท่า · 2 แถว แถวละ 3

ขว้างมีด 3 เล่มเป็นพัด แล้วกดซ้ำเพื่อวาร์ปไปที่เล่มกลาง
ท่า 1-3 = ช่วงขว้าง · ท่า 4-6 = ช่วงโผล่ที่หมุดแล้วฟัน

**หน้ากากเทงงุ** ยังไม่มีภาพอ้างอิง ต้องเจนหน้ากากก่อนแล้วค่อยเอาไปเป็น reference ของชีต
เหมือนที่ทำกับจิ้งจอกและอสูร — เจนหน้ากากเดี่ยวให้ผ่านก่อน ค่อยทำชีตท่า

```
A white tengu mask for a chibi ninja character: a long straight red nose
jutting forward, thick angry red eyebrows, round bulging eyes, a small
grim mouth, deep red lacquer markings on white. Front view, centered on a
pure white background, no character, no body, just the mask.
```

ได้หน้ากากแล้วค่อยสั่งชีต (แนบทั้งเฟรม Nyx จาก atlas และหน้ากากที่เพิ่งได้):

```
A 6-pose action sprite sheet of the same character, arranged in 2 rows of 3,
read left to right, top row first. Even spacing, no pose touching another.
The character wears the white long-nosed tengu mask from the attached mask
reference. The mask must be the exact same size in all six poses.

Pose 1 — standing coiled, right hand raised beside the head holding three
wooden daggers fanned between the fingers, left hand lifting the tengu mask
onto the face, mask not yet fully on.

Pose 2 — mask fully on, torso twisted back, right arm cocked far behind the
shoulder with all three daggers gripped in a fan, ready to whip forward.

Pose 3 — right arm snapped fully forward and across the body at the end of
a throw, hand open and empty, fingers splayed, body leaning into the throw.

Pose 4 — crouched low on landing as if just stepping out of thin air, both
knees bent deep, one hand touching the ground, head up and facing forward.

Pose 5 — rising out of the crouch into a rising diagonal slash, one wooden
dagger sweeping upward from low to high across the body.

Pose 6 — finished upright, dagger held out high from the follow-through,
other arm trailing low behind, mask still on, settled and balanced.
```

**หมายเหตุ:** มีดที่ลอยอยู่กลางอากาศเกมวาดเองแล้ว (เส้นทองหมุนตามทิศ + วงแดงกระพริบตรงหมุด)
อย่าวาดมีดที่ปล่อยออกไปแล้วลอยอยู่ในชีต — ท่า 3 มือต้องว่างเปล่า
