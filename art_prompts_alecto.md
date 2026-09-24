# ALECTO — The Fury of the Burning Trail (ตัวละครที่ 3 · สายคุมพื้นที่ อาวุธเยอะ)

คาวบอยสาวผมแดง ถือแส้ · ลูกโม่ · ทอมมี่กัน · มอลอตอฟ
ชื่อมาจากอเล็คโต หนึ่งใน Furies เทพีล้างแค้นกรีก ในงานศิลป์วาดถือ**แส้**กับ**คบไฟ** — ตรงกับอาวุธในภาพพอดีสองชิ้น

---

## ⚠️ สองเรื่องที่ต้องรู้ก่อนเจน — ตัวนี้มีปัญหาที่สองตัวก่อนไม่มี

### 1. หมวกจะทำให้เครื่องวัดสเกลอ่านผิด

`tools/measure_sheet_scale.py` วัดขนาดตัวละครด้วยสองไม้บรรทัด ตัวนี้**พังทั้งคู่**:

| ไม้บรรทัด | วิธีวัด | ทำไมพังกับ Alecto |
|---|---|---|
| `hair_sqrt` | หาพื้นที่**สีเกือบดำ** ในช่วงหัว | ผมแดง หมวกแดง ไม่มีมวลสีดำให้จับเลย |
| `face_sqrt` | หาพื้นที่**สีผิว**ในแถบ 30% บนสุด | หมวกดันใบหน้าให้ต่ำลง ใบหน้าหลุดออกนอกแถบไปบางส่วน |

นี่คืออาการเดียวกับตอนชีต Thrust ของ Nyx ที่ผมหน้าม้าบังหน้าแล้ววัดได้เล็กไป 20% ประกอบเข้าเกมแล้วตัวหดผิดขนาด ต้องรื้อใหม่

**ทำยังไง:** เจนมาได้เลย เดี๋ยวผมขยายแถบวัดให้พ้นหมวกก่อนประกอบ แต่ตอนเจนช่วยให้**หมวกอย่าใหญ่เว่อร์** ปีกกว้างประมาณในภาพต้นฉบับกำลังดี ถ้าปีกกว้างเกินหัวสองเท่าเมื่อไหร่ทั้งการวัดและการจัดวางในเกมจะเพี้ยนหมด

### 2. แส้ยาวจะทำให้เฟรมบวม

ชีตถูกตัดขอบตามสิ่งที่วาด ถ้าแส้สะบัดยาวออกไปครึ่งจอ เฟรมนั้นจะกว้างกว่าเฟรมอื่นสองเท่า ผลคือตอนประกอบเข้าเกม ตัวละครจะกระตุกไปมาเพราะจุดยึดเลื่อน และโอกาสที่ปลายแส้จะล้ำไปทับท่าข้าง ๆ ในชีตสูงมาก

**กำชับทุก prompt:** ปลายแส้ต้องอยู่ในระยะประมาณหนึ่งช่วงตัวจากตัวเธอ ถ้าต้องสะบัดยาวให้**ม้วนปลายเป็นวง** แทนการลากเป็นเส้นตรงยาว (ในไฟล์ prompt ข้างล่างเขียนกำกับไว้ทุกท่าแล้ว)

---

## Style anchor — วางท้ายทุก prompt ของตัวนี้

> Chibi-proportioned anime game sprite, large head roughly one third of the total height, short limbs, bold dark outlines, flat cel shading with subtle texture, muted desaturated palette — match the attached reference proportions exactly. Character: a young woman with long bright red hair in a single thick braid over one shoulder, a wide-brimmed dark red cowboy hat with small goggles tucked into the band, a white long-sleeved shirt with faint scroll embroidery under a dark red leather vest, fingerless dark brown leather gloves, a wide brown belt with a large oval silver buckle, dark brown leather chaps with fringe and silver studs over navy jeans, brown cowboy boots. A coiled brown leather bullwhip and a holster on her belt. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props. Full body visible from the top of the hat to the soles of both boots — do not crop, do not zoom. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Keep the whip close to her body, never stretching more than one body-width away.

---

# ลำดับการเจน

## ขั้น 0 — ท่ายืน (ด่านกั้น ต้องผ่านก่อนเจนอย่างอื่น)

**อย่าเจนชีตอื่นจนกว่าท่ายืนจะผ่าน** ตัวนี้ต้องใช้ ~59 ท่า ถ้าสัดส่วนหลุดตั้งแต่แรกคือวาดใหม่ทั้งชุด (Helios เคยไม่ผ่านสองรอบก่อนจะได้)

**แนบ 2 ภาพ:** เฟรม `idle` ของ Nyx + ภาพคาวบอยสาวที่คุณเจนไว้แล้ว (อันที่ถือแส้)

```
A single standing fighting-stance sprite of a new character, drawn in the
exact art style and exact body proportions of the FIRST attached reference
image (the small ninja): chibi proportions with a large head roughly one
third of the total height, short limbs.

Take ONLY the character design from the SECOND attached image, not its
proportions: a young woman with long bright red hair in a single thick
braid, a wide-brimmed dark red cowboy hat with small goggles in the band,
a white embroidered shirt under a dark red leather vest, fingerless brown
gloves, a wide belt with a large silver buckle, fringed brown leather chaps
over navy jeans, brown cowboy boots. Confident, level-eyed expression.

Standing ready for a fight: weight on the back foot, knees slightly bent,
one hand holding a coiled leather bullwhip low at her side, the other hand
open and raised slightly. The whip stays coiled and close to her body.
Three-quarter view, body angled toward the viewer's right.
```

**เกณฑ์ผ่าน — อัตราส่วน ตัวสูง ÷ หัวกว้าง ต้องอยู่ 2.50–2.80**

| | ตัวสูง | หัวกว้าง | อัตราส่วน |
|---|---|---|---|
| Nyx | 628 | 237 | 2.65 |
| Helios | 674 | 245 | 2.75 |
| Alecto | ? | ? | ต้องได้ 2.50–2.80 |

**วัดที่หัว ไม่ใช่ที่ปีกหมวก** — ปีกหมวกกว้างกว่าหัวมาก ถ้าวัดรวมปีกจะได้อัตราส่วนต่ำเกินแล้วตีตกทั้งที่ภาพใช้ได้ ส่งภาพมา เดี๋ยวผมวัดให้

พอผ่านแล้วเซฟเป็น `art_reference/alecto_idle_APPROVED.jpg` แล้ว**แนบไฟล์นี้กับทุกชีตต่อจากนี้** สไตล์จะได้ไม่ไหลระหว่างชีต

---

## ขั้น 1 — คลิป ยืน → วิ่ง

ท่าวิ่งที่ขาสลับซ้าย-ขวาจริง ได้จาก**คลิป** ไม่ใช่ภาพนิ่งทีละท่า (Nyx กับ Helios ทำแบบนี้ทั้งคู่)

```
Animate this exact character: starts in the ready stance, holds it briefly,
then runs forward to the right in a full run cycle with legs alternating
clearly, at least three full strides. The coiled whip stays at her hip and
does not trail behind. Same art style, same proportions, same camera
distance throughout. Pure white background, no shadow, no ground line.
Full body always visible, never cropped.
```

ส่งคลิปมา เดี๋ยวตัดเฟรมให้

---

## ชีต A — ท่าเคลื่อนไหวและท่าโดน (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
In every pose the whip stays coiled at her hip, close to her body.

Pose 1 — crouching down low, knees deeply bent, one hand near the floor.
Pose 2 — pushing off the ground at the start of a jump, body stretching
upward, arms swinging up, hat brim tilting back.
Pose 3 — airborne at the top of a jump, knees tucked up, braid lifted.
Pose 4 — falling, legs reaching down, arms out slightly for balance.
Pose 5 — landing in a deep crouch, both boots planted, one hand on the floor.
Pose 6 — struck and recoiling, head snapped back, torso twisted away, arms
flung loose, hat knocked askew.
Pose 7 — knocked down, lying on her back on the ground, limbs sprawled,
hat fallen beside her head.
Pose 8 — rolling sideways along the ground, body curled, hat held on with
one hand.
Pose 9 — standing guard with both forearms raised and crossed in front of
the face, bracing to block, head tucked down behind the hat brim.
```

---

## ชีต B — ชุดฟาดแส้พื้นฐาน (9 ท่า · 3 แถวแถวละ 3)

3 ท่าต่อหนึ่งฟาด: เงื้อ → สะบัด → ชักกลับ · นี่คือ**ท่าตีปกติ**ของเธอ ระยะไกลกว่าใครในเกม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This is a three-strike whip combo, three poses per strike. In every pose
the whip must stay within one body-width of her — when it extends, the tip
curls back into a loop instead of stretching out in a straight line.

Pose 1 — whip arm drawn back beside her head, whip curled up behind her
shoulder, weight loaded on the back foot.
Pose 2 — a quick forward whip flick at head height, arm extended, the whip
snapping forward in a tight S-curve that loops back on itself.
Pose 3 — whip arm pulling back, the whip falling slack, weight shifting
forward.
Pose 4 — whip swung out wide to the side, arm across her body, coiling for
a horizontal crack.
Pose 5 — a horizontal whip crack at chest height, arm fully across, the
whip curving in a tight spiral in front of her.
Pose 6 — arm retracting across her body, whip gathering back in.
Pose 7 — whip raised high overhead with both hands, body coiled, about to
bring it down hard.
Pose 8 — a heavy overhead whip strike brought down in front of her, whole
body committed, back boot lifted, the whip looping down and curling at the
tip.
Pose 9 — recovering from the overhead strike, arm lowering, boots
resettling, whip gathering back to her hip.
```

---

## ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

ลากเข้ามา / สอยขึ้น / ปัดล่าง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
The whip never stretches more than one body-width from her body; when it
extends, the tip curls into a loop.

Pose 1 — stepping forward, whip arm drawn far back, shoulder dropped,
winding up a long throw.
Pose 2 — the whip lashing straight out forward at waist height, arm fully
extended in a long stride, the whip's tip curling into a tight hook.
Pose 3 — hauling backward with both hands on the whip, body leaning back,
heels dug in, as if dragging something heavy toward her.
Pose 4 — crouched low, whip gathered at her feet, coiled to strike upward.
Pose 5 — a rising whip crack swung straight up past her own head, body
fully extended upward, back heel lifted, the whip arcing overhead in a
tight curl.
Pose 6 — coming down from the upward crack, knees absorbing, whip falling
back down beside her.
Pose 7 — dropping into a low crouch, one hand planted on the ground, whip
trailing low.
Pose 8 — a low sweeping whip lash along the ground, arm extended down and
forward, the whip curving along the floor and hooking back.
Pose 9 — rising out of the crouch, gathering the whip back in.
```

---

## ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
Every pose is airborne — both boots off the ground, no ground contact.
The whip stays within one body-width, tip curling rather than extending.

Pose 1 — airborne, knees tucked, whip held coiled close to her chest.
Pose 2 — airborne, whip lashed out horizontally to the side, body twisted,
free arm wide for balance, whip tip looping.
Pose 3 — airborne, whip pulling back in from the side lash.
Pose 4 — airborne, leaning forward, whip arm drawn back past her hip.
Pose 5 — airborne forward whip lash, arm driven straight ahead, body angled
forward, trailing leg tucked, whip curling ahead of her.
Pose 6 — airborne, recovering from the forward lash, legs gathering.
Pose 7 — airborne, whip raised high above her head, both knees drawn up.
Pose 8 — airborne downward whip strike driving straight down below her,
arm swung down hard, whip curling beneath her boots.
Pose 9 — airborne, legs together underneath, body upright, whip gathered,
ready to land.
```

---

## ชีต E — สกิล 1 · ลูกโม่ "Six Shooter" (6 ท่า · 2 แถวแถวละ 3)

**แนบภาพลูกโม่ที่คุณเจนไว้เป็นอ้างอิงเพิ่ม**

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
She is using a single silver revolver. The coiled whip stays on her hip
throughout. No muzzle flash, no smoke, no bullets, no motion lines.

Pose 1 — hand snapping to the holster at her hip, body turning side-on,
beginning to draw.
Pose 2 — revolver drawn and levelled straight forward at chest height, arm
fully extended, free hand clenched at her side, eyes down the barrel.
Pose 3 — recoil, the revolver's barrel kicked upward, wrist rolled back,
shoulders absorbing the shot.
Pose 4 — revolver levelled again but angled upward at about forty-five
degrees, head tilted up, aiming high.
Pose 5 — revolver angled downward at about forty-five degrees, knees bent,
aiming low at the ground ahead.
Pose 6 — spinning the revolver back down toward the holster, body
straightening, free hand returning to the whip.
```

---

## ชีต F — สกิล 2 · มอลอตอฟ "Firewater" (6 ท่า · 2 แถวแถวละ 3)

**แนบภาพขวดมอลอตอฟที่คุณเจนไว้เป็นอ้างอิงเพิ่ม**

กองไฟบนพื้นเกมวาดเอง **อย่าวาดไฟกองบนพื้นในชีต** — วาดแค่เปลวที่ปากขวด

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
She is using a glass bottle of amber liquid with a burning rag stuffed in
the neck. Draw a small flame only at the mouth of the bottle — no fire on
the ground, no smoke trail, no explosion, no motion lines.

Pose 1 — pulling the bottle from a loop on her belt, other hand reaching
across, head down.
Pose 2 — holding the bottle up in front of her, striking a match against
her belt buckle with the other hand.
Pose 3 — bottle raised beside her head, rag now burning with a small
flame, face lit from the side, eyes forward.
Pose 4 — winding up, bottle drawn far back behind her shoulder, body
torqued, front foot planted.
Pose 5 — throwing forward in a high overhand arc, arm fully extended
upward and ahead, body stretched out behind it, back boot lifted, bottle
still in her fingertips at the moment of release.
Pose 6 — follow-through after the throw, throwing arm swung down across
her body, both hands empty, watching where it lands.
```

---

## ชีต G — สกิล 3 อัลติ · ทอมมี่กัน "Last Call" (6 ท่า · 2 แถวแถวละ 3)

**แนบภาพทอมมี่กันที่คุณเจนไว้เป็นอ้างอิงเพิ่ม**

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
She is using a drum-magazine submachine gun held in both hands. No muzzle
flash, no smoke, no shell casings, no bullets, no motion lines.

Pose 1 — swinging the submachine gun up from behind her back into both
hands, body braced, boots planted wide.
Pose 2 — gun shouldered and levelled straight forward, cheek to the stock,
both hands gripping, sighting down the barrel.
Pose 3 — firing braced, the gun kicked back slightly into her shoulder,
body leaning into it, hat brim shadowing her eyes.
Pose 4 — sweeping the gun to aim downward and forward, knees bent, weight
dropped low, still firing.
Pose 5 — sweeping the gun upward, body arched back, arms raised, still
braced in both hands.
Pose 6 — the finish: gun lowered to her hip with one hand, other hand
tipping the brim of her hat forward, body straightened, calm.
```

---

## ชีต H — ถอยหลัง/กลิ้ง (6 ท่า · 2 แถวแถวละ 3) · **ยังไม่ต้องเจน รอดูของจริงก่อน**

กดทิศถอยค้างตอนกดสกิล 1 หรือ 2 เธอจะถอยก่อนแล้วค่อยใช้อาวุธ (ดู `docs/ALECTO_KIT.md`)
ท่าถอยทำสองหน้าที่: เป็นทางหนีของตัวคุมพื้นที่ และ**บังมือตอนสับอาวุธ**

### ลองของฟรีก่อน — อาจไม่ต้องเจนเพิ่มเลย

ชีต A มีท่ากระโดดครบแล้ว (ท่า 2 ดีดตัว · ท่า 3 ลอย · ท่า 5 ลงพื้น) เอามาใช้เป็นท่ากระโดดถอยได้ตรง ๆ
และท่า 8 (กลิ้งข้าง) ใช้เป็นท่ากลิ้งถอยได้ · ส่วนการสับอาวุธมีที่บังอยู่แล้วสองจุด:

- **ท่าลอยกลางอากาศ** แขนเก็บเข้าตัว มือหายไปหลังลำตัว
- **ชีต E ท่า 1** "มือคว้าซองปืนที่สะโพก ตัวหันข้าง" — ท่าชักปืนก็บังการสับอยู่แล้วในตัว

**กฎของโปรเจกต์นี้คือตัดสินท่าโจมตีจากในเกมที่วิ่งอยู่ ไม่ใช่จากชีต** (บทเรียนจาก Stone Curse ท่า 5
ที่ผมตีตกจากชีตแล้วคุณทักว่าลองใช้ดูก่อน ปรากฏว่าในเกมอ่านออกสบาย) ประกอบด้วยของที่มีก่อน
ถ้าเล่นแล้วดูขาด ๆ ค่อยเจนชีตนี้

### ถ้าจะเจน

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No weapon is visible in any pose — both hands are empty or hidden, only the
coiled whip on her hip.

Pose 1 — crouching and loading the legs to spring backward, weight dropped
onto the back boot, arms tucked in close to her chest.
Pose 2 — airborne travelling backward, body compact, knees drawn up, both
arms pulled in tight against her body, braid trailing forward.
Pose 3 — landing from the backward hop, knees absorbing, one hand reaching
down toward her belt, body turning side-on.
Pose 4 — diving into a backward roll, shoulder tucked, body beginning to
curl, hat pressed to her head with one hand.
Pose 5 — mid-roll, body fully curled into a ball, boots over her head.
Pose 6 — coming out of the roll into a low crouch, one hand planted on the
ground, the other reaching to her belt, ready to bring a weapon up.
```

ท่า 3 กับท่า 6 จงใจให้มือ "เอื้อมไปที่เข็มขัด" — นั่นคือเฟรมที่เกมสลับอาวุธ ดูแล้วต่อเนื่องพอดี

---

## ข้อกำชับที่ใช้กับทุกชีต

1. **ขนาดตัวเท่ากันทุกท่า** ระยะกล้องเดียวกัน — ข้อที่พังบ่อยที่สุด
2. **หันขวาทุกท่า** เกมพลิกภาพเอง
3. **พื้นขาวล้วน ไม่มีเงา ไม่มีเส้นพื้น**
4. **เต็มตัว ไม่ครอป** เห็นตั้งแต่ยอดหมวกถึงพื้นรองเท้าบู๊ต
5. **ห้ามวาดเอฟเฟค** ไม่มีเส้นความเร็ว ไม่มีไฟปากกระบอก ไม่มีควัน ไม่มีไฟกองบนพื้น — VFX เกมวาดเอง (บทเรียนจากชีต Stone Curse)
6. **แส้ต้องอยู่ใกล้ตัว** ไม่เกินหนึ่งช่วงตัว ปลายม้วนเป็นวงแทนการลากยาว (ข้อใหม่ของตัวนี้ ดูเหตุผลด้านบน)

---

## ท่าที่เกมต้องใช้ทั้งหมด (~59 ท่า)

| กลุ่ม | ท่า | มาจาก |
|---|---|---|
| พื้นฐาน | idle · run | ขั้น 0 + คลิป |
| เคลื่อนไหว/โดน | crouch · jump · air · fall · land · hurt · knockdown · techroll · tech · block · blockstun · blockcrouch | ชีต A |
| ตีปกติ | jab1 · jab2 · jab3 (ท่าละ 3 เฟรม) | ชีต B |
| พิเศษพื้น | side (ลากเข้า) · up (สอยขึ้น) · down (ปัดล่าง) | ชีต C |
| กลางอากาศ | nair · sair · dair | ชีต D |
| สกิล 1 | ลูกโม่ 3 นัด + มุมบน/ล่าง | ชีต E |
| สกิล 2 | ขว้างมอลอตอฟ | ชีต F |
| สกิล 3 | ทอมมี่กันอัลติ | ชีต G |
| ถอย/กลิ้ง | backhop · rollback (ใช้ตอนกดทิศถอย+สกิล) | ชีต A ก่อน · ชีต H ถ้าไม่พอ |
