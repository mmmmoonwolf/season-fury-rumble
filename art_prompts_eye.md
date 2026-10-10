# EYE (chronos) — prompt ชีตทั้งชุด

> กลไก **เข้าเกมแล้วเล่นได้จริง** ดู [`docs/EYE_KIT.md`](docs/EYE_KIT.md)
> ตอนนี้วาดเป็นกล่องเขียว (`artPending: true`) — ชีตชุดนี้คือของจริงที่จะมาแทนทั้งตัว
> เจนแล้ววางที่ `art_reference/chronos_sheets/sheet_A.jpg` … `sheet_F.jpg`

> 📎 **แนบ `art_reference/chronos_sheets/REF_joint.jpg` ไปกับทุก prompt**
> นั่นคือดีไซน์ที่เคาะแล้ว (หน้า/ผม/ชุด/สไตล์) · ทุกบล็อกเขียนว่า "the same character"
> ซึ่งแปลว่าไม่มีภาพอ้างอิง = ได้คนละคนทุกใบ (บทเรียนจาก MARCH ที่เจนครบ 102 เฟรมสำเร็จ)
>
> ไฟล์นี้ถูกเขียนใหม่สองรอบแล้ว รอบแรกบรรยายเป็นคนละคน รอบสองยังเป็น "ถือใบกัญชา"
> **ของจริงที่เคาะคือ "คาบ/ถือมวน" ไม่ใช่ถือใบ** — anchor ข้างล่างตรงกับเรฟล่าสุดแล้ว

---

## 🔴 ความเสี่ยงอันดับหนึ่งของตัวนี้: **มันจะใส่ควันมาให้**

ตัวนี้คือ "ตัวควัน" คาบมวน ธีมเมา — **ตัวเจนจะใส่ควัน หมอก แสงเรือง มาให้แน่นอน**
และรอบนี้ **เรฟเองก็มีควัน** ยิ่งต้องห้ามแรงกว่าเดิม
ถ้าไม่ห้ามแรงพอ และ **ห้ามที่ท้าย prompt ไม่พอ**

> บทเรียนตรง ๆ จาก KUNJAE (`art_prompts_kunjae.md` บรรทัด 811):
> บรรทัด "no muzzle flash" อยู่ท้าย prompt แล้ว**ได้แฟลชปากกระบอกมาสองรอบติด**
> จนตอนนี้ยังมีวงขาวเรืองติดอยู่ใน `jab1` `jab2` `side` `up` `down` แก้ไม่ได้นอกจากเจนใหม่
>
> **รอบนี้เอาข้อห้ามเรื่องควันขึ้นไปไว้บรรทัดแรกสุดของทุก prompt** (ทำไว้แล้วข้างล่าง)

เหตุผลที่ต้องห้ามจริง ๆ ไม่ใช่แค่ความสวย: **เกมวาดควันเองหมดแล้ว** (ดู `SMOKE` ใน `ScrambleScene.js`)
ควันที่ติดมากับอาร์ตจะซ้อนกับควันของเกม แล้วอ่านไม่ออกว่าอันไหนคือควันที่ตีจริง
ซึ่งคือการโกหกระยะ — ปัญหาเดียวกับที่เพิ่งแก้ไปตอนทำเอฟเฟกต์

---

## 🔴 ความเสี่ยงข้อสอง: **ควันในเรฟเป็นก้อนแยกจากตัว — ห้ามเอามาด้วย**

เรฟมีควันลอยขึ้นจากปลายมวน ซึ่งน่ารักและเป็นเหตุผลที่เลือกภาพนี้
**แต่เอาติดมากับอาร์ตไม่ได้** และนี่ไม่ใช่ความเห็น — วัดแล้ว:

| ก้อน | ขนาด | พิกัด |
|---|---|---|
| ตัวเธอ | 202,336 px | x 457-953 |
| **ควัน** | **3,263 px** | **x 907-965 · ไม่ติดตัวเลย** |

ตัวตัดชีตทิ้ง "ก้อนที่ไม่ติดกับตัว" อยู่แล้ว ควันก้อนนี้จึง **ถูกลบทิ้ง**
หรือแย่กว่านั้นคือ **ถูกนับเป็นท่าหนึ่งท่า** แล้วไม้บรรทัดวัดสเกลเพี้ยนทั้งใบ
(เคยพังแบบนี้มาแล้วกับผ้าคาดเอวของ MARCH และหางไซเบอร์ของ KUNJAE)

และต่อให้ตัดมาได้ มันก็ยังผิดอยู่ดี: **ควันที่วาดติดเฟรมจะหมุนตามตัว**
ท่าตีลังกากลางอากาศจะได้ควันพุ่งลงพื้น ท่านอนล้มจะได้ควันพุ่งข้าง

**ทางแก้: เกมพ่นควันให้เอง** — `_jointSmoke()` ใน `ScrambleScene.js` ปล่อยควันลอยจากมือเธอ
ทุก 14 เฟรมตอนยืน/ย่อ/วิ่ง ซึ่ง**ดีกว่าวาดติดอาร์ตตรงที่มันขยับ** และไม่พังตอนเธอพลิกตัว

> ✅ มวนเอามาได้ · ❌ ควันห้ามเอามา

## ✅ ความเสี่ยงข้อสาม (เขียวจมฉากหลัง) — ดีไซน์จากเรฟแก้ให้แล้ว

ฉากหลังของเวทีคือ **เนินเขาเขียว** · ถ้าเธอเขียวทั้งตัวเธอจะจมหายตอนยืนหน้าเนิน

ดีไซน์จากเรฟเป็น **ชุดดำล้วน เท้าเปล่า** ไม่มีสีเขียวในตัวเลย ซึ่งตัดปัญหานี้ทิ้งทั้งข้อ
สีเขียวทั้งหมดของเธอมาจาก**ควันที่เกมพ่นให้** ไม่ใช่จากอาร์ต — ซึ่งดีกว่า เพราะควันขยับและหายไปได้
ส่วนสีที่อ่านซิลูเอตคือ **ดำล้วนบนฟ้าสว่าง** ซึ่งเป็นคู่สีที่อ่านง่ายที่สุดในเกม

**วัดจากเรฟจริงแล้ว: 40% ล่าง = 63** (เพดาน 140) — ผ่านสบาย ไม่ต้องวัดซ้ำตอนขั้น 0

> 📌 **ต้องวัดจริงตอนขั้น 0 ก่อนเจนอีก 6 ใบ** วิธีเดียวกับ DEAR และ MARCH:
> ตัดพื้นขาวออก แล้ววัดความสว่างเฉลี่ยของ **40% ล่างของตัว ถ้าเกิน ~140 ให้เจนใหม่**
> (พื้นเวทีสว่าง 150-190 — สว่างกว่านั้นคือครึ่งล่างของเธอจมหายไปกับพื้น)
> เทียบของเดิม: DEAR 66-68 · KUNJAE 49 · MARCH เดิม 126 · OAT 114 · ตัวตลก 107

---

## ดีไซน์ตัวละคร (anchor — ก๊อปท่อนนี้ลงทุก prompt)

**เคาะจากเรฟแล้ว** — `art_reference/chronos_sheets/REF_joint.jpg`
อย่าบรรยายเอง อย่าเดาเอง ใช้ท่อนข้างล่างนี้คำต่อคำ

- ผู้หญิงสาว **ตาปรือครึ่งหลับ มีรอยคล้ำใต้ตา ปากเรียบ หน้าเบื่อ ๆ นิ่ง ๆ** — ไม่ยิ้ม ไม่ดุ
- **ผมดำ มัดจุกเล็กด้านบน แต่ปล่อยยาวสยายลงมาเป็นปอยยาวกรอบหน้าและด้านหลัง**
  แนบหัว — ไม่ใช่ผมสั้น ไม่ใช่มัดเก็บหมด ไม่ใช่วงกลมฟู
- **ชุดดำล้วนทั้งตัว**: เสื้อแขนยาวทรงหลวมปล่อย กับกางเกงขายาวทรงหลวมคลุมข้อเท้า
  ไม่มีแจ็กเก็ต ไม่มีเสื้อกล้าม ไม่มีเข็มขัด ไม่มีผ้าพันมือ ไม่มีลาย
- **เท้าเปล่า**
- **ถือมวนที่จุดแล้วหนึ่งมวนในมือข้างหนึ่ง** ปลายมีไฟสีส้มจุดเล็ก ๆ
  มวนเป็นสีน้ำตาลอ่อน · **ห้ามมีควัน** (เกมพ่นให้เอง — ดูความเสี่ยงข้อสอง)
- **อีกมือว่าง** — มือว่างคือมือที่เธอใช้ต่อย
- เส้นตัด **ดำหนา สม่ำเสมอ** · ลงสี **แบนเรียบ เงาน้อยขั้น** · สะอาด

### ตัวเลขที่วัดจากเรฟแล้ว (ผ่านด่านหมดแล้ว ไม่ต้องวัดซ้ำ)

| ของ | ค่า | เกณฑ์ |
|---|---|---|
| ความสว่าง 40% ล่าง | **38** | ต้อง < 140 ✅ |
| ความสว่างทั้งตัว | 51 | — |

ชุดดำล้วน + เท้าเปล่าทำให้เธอเป็นตัวที่เข้มที่สุดในโรสเตอร์ (KUNJAE 49 · DEAR 66-68 · MARCH เดิม 126)
**ไม่มีทางจมไปกับพื้นเวที** (พื้นสว่าง 150-190)

### 🔴 สองข้อที่ต้องระวังต่อตอนทำท่า

**1. ผมยาวสยายคือ "ของที่หลุดได้"**
ท่าที่สะบัดแรง ๆ (โดนตี ล้ม ม้วนตัว หมุนกลางอากาศ) ผมจะปลิวออกจากตัว
แล้วตัวตัดชีตจะทิ้งมันหรือนับเป็นท่าหนึ่งท่า → **สั่งทุกใบว่าผมต้องแตะไหล่หรือหลังเสมอ**

**2. เธอต่อยด้วยมือเปล่า มวนอยู่ในมืออีกข้างตลอด**
ไม่มีอาวุธแล้ว (ร่างก่อนหน้าให้ถือใบกัญชายักษ์ฟาด — ตัดทิ้ง)
ท่าตีทุกท่าจึงเป็น **หมัด ฝ่ามือ ศอก เข่า เตะ** · มวนไม่เคยหลุดจากมือและไม่เคยถูกใช้ตี
ซึ่งดีกว่าเดิมสำหรับตัวตัดชีตด้วย — ของเล็กในกำมือหลุดยากกว่าใบไม้ยักษ์มาก

**ชุดสบาย ๆ เท้าเปล่าอ่านว่า "สาวชิล" ไม่ใช่ "นักสู้"** ซึ่งเข้ากับคาแรกเตอร์เมา ๆ ของเธอ
แต่แปลว่า **ความเป็นนักสู้ต้องมาจากท่า ไม่ใช่จากชุด** — ทุกใบของท่าตีจึงสั่งย้ำว่า
ถ่างขากว้าง ลงน้ำหนักต่ำ ทุ่มตัวตามหมัด ไม่ใช่ยืนตรงแล้วยื่นมือ

### ท่อนภาษาอังกฤษ (ก๊อปลงทุก prompt)

```
Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.
```

## สถานะ — ✅ **อาร์ตครบทั้งตัว 68 เฟรม** (เหลือยืมท่าเดียว)

อัตลาสอยู่ที่ `game/assets/characters/scramble_chronos.{png,json}` (68 เฟรม · 3900x2226 · 6 แถว)
สร้างด้วย `game/tools/build_scramble_eye.py` · คลิปวิ่งเตรียมด้วย `tools/prep_eye_clip.py`

| ใบ | สั่ง | ได้ | หมายเหตุ |
|---|---|---|---|
| ขั้น 0 | 1 | ✅ 1 | สูง 745 px · ไม่มีควันติดมา ✓ |
| คลิปวิ่ง | 10 | ✅ 10 | รอยต่อลูป 0.908 เทียบเฟรมติดกัน 0.908 — **ต่างกัน 0.000** |
| A | 12 | ✅ 12 | ครบ แต่**ไม่มีท่ากันสักท่า** และได้ท่าสูบมาสองท่าแทน |
| B | 9 | ⚠️ 8 | พอดีกับ 9 ช่องเพราะใช้ท่ารอยต่อร่วมกัน (ตามที่ prompt สั่งไว้) |
| C | 9 | ✅ 11 | ผังกระจาย ไม่ใช่ตาราง · มีท่าติดกันหนึ่งคู่ ตัวแยกจัดการได้ |
| **D ท่าอากาศ** | 9 | ✅ 9 | ใช้ครบทั้งใบ — แต่**ไม่มีท่าทุบลง** (ดูข้างล่าง) |
| **E ชุดรัว** | 9 | ✅ 10 | ใช้ 6 ท่า (haze1 haze2) + ท่ากันอีก 2 |
| **E2 ชุดรัว** | 9 | ⚠️ 9 | **ไม่ได้ใช้เลย** — ทั้งใบเป็นท่าย่ำเท้า (ดูข้างล่าง) |
| **E3 ชุดรัว** | 9 | ✅ 10 | ใช้ 3 ท่าเป็น haze3 |
| **F ไม้จบ/ย้อน/อัลติ** | 9 | ✅ 8 | ใช้ครบทุกท่า — ท่ากางแขนพ่นควันของอัลติมาตรงเป๊ะ |

ตรวจแล้วกับอัตลาสชุดใหม่: เท้าตรงทุกเฟรมพื้น (55 เฟรม · เยื้องมากสุด **1 px**) ·
ท่ายืน 230-245 px (เป้า 240 = 95.8-102.1%) · ขนาดใบหน้าเทียบท่ายืน 93-111% ทุกใบ ·
อัตลาส 3900x2226 ไม่เกิน 4096 · กรอบชนคร่อมหมัดที่วาด 14 จาก 15 ท่า

### เลือกเฟรมกลางด้วยการวัด ไม่ใช่กะด้วยตา

ตัวหันขวา เฟรมกลางต้องเป็นท่าที่ยื่นขวาไกลสุด วัดเป็น (ขอบขวา − แกนลำตัว) ÷ ความสูง
**ห้ามวัดด้วยความกว้างกรอบเฉย ๆ** เพราะท่าตั้งการ์ดกางหมัดสองข้างก็กว้างได้โดยไม่ได้ชก
วัดแล้วพบว่า D8 ที่ตาเห็นเป็นท่าเงื้อ กลับเอื้อมขวา**น้อยที่สุดทั้งใบ** (0.271)

### ยังขาดอะไร

1. **ท่ากันตอนย่อ** (`blockcrouch`) — ท่าเดียวที่ยังยืม (ใช้ท่าย่อเปล่าจากใบ A)
   `block` กับ `blockstun` ได้ท่ากันจริงจากใบ E แล้ว
2. **ใบ D ไม่มีท่าทุบลง** — ได้มาเป็นท่าดิ่งสามท่า (ชูแขน → ดิ่ง → หดตัว)
   `dair` จึงเลือกเฟรมกลางจากลำตัวที่ยืดสุดแทนระยะเอื้อม ซึ่งถูกกับท่าดิ่งอยู่แล้ว
   เป็นท่าเดียวใน 15 ท่าที่กรอบชนไม่คร่อมหมัดที่วาด (กรอบอยู่ใต้ตัวตามที่ท่าดิ่งควรเป็น)
3. **ใบ E2 ใช้ไม่ได้ทั้งใบ** — วัดได้เอื้อมขวา 0.370-0.481 ทั้งเก้าท่า ต่างกันแค่ 0.11
   เฟรมกลางจะไม่ต่างจากเฟรมตั้งการ์ดพอให้ตาเห็นว่าชก · ชุดรัวจึงใช้ใบ E กับ E3
   ซึ่งสูงใกล้กัน (355/350 px) ต่อกันแล้วตัวไม่เปลี่ยนขนาดกลางชุด

## แผนชีต — 68 เฟรม

| ใบ | ท่า | จำนวน | ตาราง |
|---|---|---|---|
| ขั้น 0 | ท่ายืน (anchor ของทั้งชุด) | 1 | — |
| คลิปวิ่ง | วิ่งหนึ่งรอบเต็ม (ท่ายืนเอาจากขั้น 0) | 10 | วิดีโอ ไม่ใช่ชีต |
| A | เคลื่อนไหว + โดนตี + กัน | 12 | 4 แถว × 3 |
| B | แย็บสามจังหวะด้วยมือเปล่า (`jab1-3`) | 9 | 3 × 3 |
| C | ท่าพิเศษบนพื้น (`side` `up` `down`) | 9 | 3 × 3 |
| D | ท่ากลางอากาศ (`nair` `sair` `dair`) | 9 | 3 × 3 |
| E | รัวควัน (`haze1` `haze2` `haze3`) | 9 | 3 × 3 |
| F | ไม้จบรัว + ต่อยแล้วย้อน + อัลติ | 9 | 3 × 3 |

**ทุกท่าโจมตีคือ 3 เฟรมเป๊ะ** (ตั้งท่า → สุดแรง → ชักกลับ) เพราะเอนจิ้นเลือกเฟรมจาก
`phase()` ตรง ๆ: `{startup: 1, active: 2, recovery: 3}` — เฟรมกลางคือเฟรมที่กรอบชนเปิดจริง
เกินหรือขาดจากสามไม่ได้ ไม่ใช่เรื่องความสวย

---

## ⛔ ท่อนห้าม — วางไว้ **บรรทัดแรก** ของทุก prompt ไม่ใช่ท้าย

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO FOG, NO CLOUDS, NO GLOW, NO
SPARKLES, NO MAGIC EFFECTS anywhere in this image. The character never exhales
smoke and nothing is burning or lit. This is a clean character sprite sheet only —
the game engine draws every smoke and light effect by itself. Any smoke drawn into
the art is a defect and the whole sheet gets thrown away.
```

---

## 1. ขั้น 0 — ท่ายืน 3/4 หันขวา (ทำใบนี้ให้ผ่านก่อน แล้วค่อยเจนที่เหลือ)

**เรฟเป็นมุมเกือบหน้าตรง แต่เกมต้องการ 3/4 หันขวา** — ใบนี้คือการแปลงเรฟให้เป็นมุมที่เกมใช้
ไม่ใช่การออกแบบใหม่ · **ห้ามเปลี่ยนหน้า ผม ชุด หรือมวนแม้แต่นิดเดียว**

ทำไมต้อง 3/4 หันขวา: เกมเป็นแนวนอน ตัวละครหันเข้าหากัน เกมพลิกภาพเองเมื่อหันซ้าย
มุมหน้าตรงจะอ่านไม่ออกว่าหมัดออกไปทางไหนตอนตี (DEAR เป็นมุมหน้าตรงและเป็นตัวที่
อ่านทิศทางยากที่สุดในโรสเตอร์ — ไม่อยากได้ตัวที่สอง)

**อย่าเจนใบอื่นจนกว่าใบนี้จะผ่าน** ทุกใบที่เหลือแนบทั้งเรฟและใบนี้คู่กัน

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO FOG, NO CLOUDS, NO GLOW, NO
SPARKLES, NO MAGIC EFFECTS anywhere in this image. Even though she is holding a
lit cigarette, NOTHING rises from it — no smoke trail, no wisp, no curl. The game
engine draws every smoke and light effect by itself.

A single standing idle pose of the SAME character as the attached reference,
full body, drawn in a THREE-QUARTER view with her body angled toward the
viewer's right.

This is the same girl from the reference turned to a three-quarter angle — do
NOT redesign her. Keep her face, her hair, her outfit, her bare feet and her
cigarette exactly as they are in the reference. Only the camera angle changes.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

She stands relaxed but with her feet planted a little apart and her weight
settled low, so her silhouette stays broad rather than a narrow column.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above her pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
the pose. Exactly two arms and two legs, clearly separated.
Anatomically correct human proportions.
```

**ตรวจก่อนผ่าน:**
- [ ] หน้า/ผม/ชุด/เท้าเปล่า/มวน **เหมือนเรฟทุกข้อ** — วางเทียบข้างกันดู
- [ ] หันขวาจริง (ไหล่ขวาอยู่ใกล้ผู้ชมกว่าไหล่ซ้าย)
- [ ] **ไม่มีควันสักเส้น** แม้แต่เส้นเดียวที่ปลายมวน
- [ ] ผมไม่ปลิวหลุดจากตัว · มวนยังอยู่ในมือ · อีกมือว่าง
- [ ] ความสว่าง 40% ล่าง < 140 (เรฟวัดได้ 38)

> ถ้าได้มาแล้วมุมยังเป็นหน้าตรง: **อย่าทิ้ง** แนบตัวที่ได้กลับไปแล้วบอกให้แก้เฉพาะมุมกล้อง
> ถ้ามีควันติดมา: ขอแก้เหมือนกัน อย่าทิ้งทั้งใบ

## 2. คลิปวิ่ง — เจนเป็น **วิดีโอ** ไม่ใช่ชีต

ท่าวิ่งที่เจนเป็นภาพนิ่งทีละเฟรม **ขาไม่สลับซ้าย-ขวาจริง** — พลาดมาแล้วทั้ง MARCH และ BOMB
(ดู `STYLE_LOCK.md` ส่วนที่ 5: "Bomb ท่าวิ่งยังดูเหมือนวิ่งขาเดียว")

ของที่ได้ผลคือ **เจนเป็นคลิปแล้วตัดเฟรมเอา** — ท่าวิ่ง 10 เฟรมขาสลับจริงของ KUNJAE
มาจากวิธีนี้ (ดู `art_prompts_kunjae.md` หมวด "เลือกหน้าต่างด้วยรอยต่อของลูป")

ตัว build ต้องการจากคลิปนี้: **ท่าวิ่งหนึ่งรอบเต็ม 10 เฟรม**
(ท่ายืนใช้ของขั้น 0 ไม่ต้องเอาจากคลิป — เอาจากคลิปจะได้ท่ายืนคนละใบกับ anchor)
(รอบเต็ม = เท้าซ้ายแตะพื้น → เท้าขวาแตะพื้น → กลับมาเท้าซ้ายแตะพื้นในท่าเดิม)

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO MAGIC EFFECTS, NO DUST,
NO SPEED LINES anywhere in this video.

A short looping animation of the attached character on a pure white background,
side-scrolling game view, three-quarter angle, moving toward the viewer's right.
She starts in her idle standing pose, then breaks into a steady run cycle and
keeps running for several full strides. Her feet clearly alternate — left foot
plants, then right foot plants, then left again — each stride the same length.

The camera does not move, does not zoom and does not change angle. She stays
the same size in frame the whole time and her whole body including the soles of
her bare feet stays inside the frame at all times. She keeps the lit cigarette held in
her fingers the whole run and it never leaves her hand. NOTHING rises from the
cigarette — no smoke, no wisp, no trail. Her long loose hair bounces with the run but always
stays touching her shoulders or her back — it never streams out away from her
body, and it never separates from her head.

Pure white background throughout, no shadow, no ground line, no props, no text.
```

**ตัดเฟรมด้วย:** `game/tools/cut.py` แล้วเลือกหน้าต่างด้วยวิธี "รอยต่อของลูป"
(ไล่ทุกหน้าต่าง 10 เฟรมติดกัน แล้ววัด IoU ของรอยต่อเทียบกับ IoU ของเฟรมติดกันเฉลี่ย
ยิ่งใกล้กันยิ่งลูปเนียน — ดูตารางตัวอย่างใน `art_prompts_kunjae.md`)

---

## 3. ชีต A — ท่าเคลื่อนไหวและท่าโดน (12 ท่า · 4 แถว × 3)

ใบนี้ไม่มีท่าตีเลยสักท่า แต่เป็นใบที่เห็นบ่อยที่สุดตอนเล่นจริง
**ท่าโดนตีกับท่าล้มคือท่าที่คนเล่นดูมากที่สุดตอนแพ้** อย่าให้มันดูเหมือนท่ายืนเอียง ๆ

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO HAZE, NO GLOW, NO SPARKLES, NO MAGIC
EFFECTS anywhere in this image. The character never exhales smoke. The game
engine draws every smoke and light effect by itself.

A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no impact flashes, no dust — the game draws all of that.

Pose 1 — pushing off the ground into a jump, knees driving up, body stretched tall.
Pose 2 — the top of the jump, body tucked compact, knees pulled toward the chest.
Pose 3 — falling, legs reaching down, arms out for balance.
Pose 4 — landing, both feet planted, knees deeply bent absorbing the impact.
Pose 5 — hit hard: head snapped back, upper body folded over, both arms thrown
loose behind her, clearly in pain and off balance.
Pose 6 — knocked down, lying face down on the ground, limbs sprawled, head low.
Pose 7 — rolling sideways along the ground, body curled into a tight ball.
Pose 8 — pushing herself back up off the ground onto one knee.
Pose 9 — standing guard: both forearms crossed in front of her face, feet apart,
weight low and solid.
Pose 10 — knocked back while guarding: same crossed-arm guard but skidding
backward, heels dragging, body leaned away.
Pose 11 — crouching low, knees fully bent, sitting almost on her heels, head low.
Pose 12 — crouching low with both forearms up guarding her face at the same time.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props, no text, no labels,
no panel borders. Full body visible in every pose — do not crop, do not zoom.
Leave a clear band of empty white space below and above every pose; nothing may
touch or run off the edge of the image. Identical camera distance and identical
character size in every pose. Exactly two arms and two legs per pose, clearly
separated. Nothing detached from her body anywhere in the image — the
cigarette stays held in her fingers in every single pose, including while she is
knocked down and rolling, and nothing ever rises from it.
```

---

## 4. ชีต B — แย็บสามจังหวะด้วยมือเปล่า (9 ท่า · 3 × 3)

ไม้ปกติของเธอ **ต่อยด้วยมือที่ว่าง มวนอยู่ในอีกมือตลอด**
ออกช้ากว่าทุกคนในเกม แต่กรอบกว้างและสูง (กวาดคนกระโดดต่ำ ๆ ติด)

**รอยต่อคือทั้งหมดของใบนี้** — ท่าสุดท้ายของจังหวะหนึ่งต้องเป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO SPARKLES, NO MAGIC EFFECTS
anywhere in this image. Nothing rises from her cigarette. No motion lines, no
impact flashes — the game draws all of that by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.

This sheet is one continuous combination, not separate poses. Draw the LAST pose
of each beat and the FIRST pose of the next beat as the SAME body position, so
the sequence reads as one unbroken motion: the hand pulling back from one strike
is already the hand starting the next one, and her weight keeps flowing forward
instead of resetting to a neutral stance between beats.

She fights with the EMPTY hand. The hand holding the cigarette stays low and out
of the way and never throws a strike.

Pose 1 — her empty fist pulled back only as far as her ribs, body compact and
already leaning in, knees bent.
Pose 2 — a lazy but heavy straight punch with that hand, fully extended at chest
height, shoulder turned in behind it.
Pose 3 — that hand snapping back in, hips already rotating.
Pose 4 — the same hand drawn back wide and low, body coiled further.
Pose 5 — a wide swinging hook at head height at full reach, her whole torso
turned through behind it, back heel lifted.
Pose 6 — carried past the target, hips still turning.
Pose 7 — winding up big: that fist drawn up and back beside her head, front
shoulder dropped, knees loading deep.
Pose 8 — a heavy overhand punch landing, arm swung down and forward over the top
at head height, her whole body dropping behind it.
Pose 9 — following through low, fist past the target, body turned through.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible in every pose from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above every pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
every pose. Exactly two arms and two legs per pose, clearly separated.
```

## 5. ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 × 3)

ท่า 4-6 คือท่าส่งขึ้นฟ้าของเธอ **หมัดต้องชี้ขึ้นชัด ๆ** ไม่งั้นอ่านไม่ออกว่าเป็นท่าส่งขึ้น

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO SPARKLES, NO MAGIC EFFECTS
anywhere in this image. Nothing rises from her cigarette. No motion lines, no
impact flashes — the game draws all of that by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.

She fights with the EMPTY hand and with her legs. The hand holding the cigarette
stays low and out of the way and never throws a strike.

Pose 1 — stepping deep into a long forward lunge, her empty fist drawn back at her ribs.
Pose 2 — a long lunging straight punch at full extension, front leg deep in a
long stride, her whole body stretched out behind the punch.
Pose 3 — recovering out of the lunge, pulling the arm back in.
Pose 4 — crouched low, empty fist down at knee height, coiled to swing upward.
Pose 5 — a rising uppercut punched STRAIGHT UP past her own head, arm fully
extended vertically, body stretched tall, back heel lifted, head tipped back.
Pose 6 — coming down out of the uppercut, knees absorbing.
Pose 7 — dropping into a low crouch, one hand planted on the ground.
Pose 8 — a low sweeping kick with her back leg swung all the way through at
ankle height, body low to the ground, one hand planted.
Pose 9 — recovering up out of the low sweep.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible in every pose from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above every pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
every pose. Exactly two arms and two legs per pose, clearly separated.
```

## 6. ชีต D — ท่ากลางอากาศ (9 ท่า · 3 × 3)

**ทุกท่าในใบนี้เท้าต้องลอย** ไม่มีท่าไหนแตะพื้น — พลาดข้อนี้แล้วท่าอากาศจะดูเหมือนท่าพื้น

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO SPARKLES, NO MAGIC EFFECTS
anywhere in this image. Nothing rises from her cigarette. No motion lines, no
impact flashes — the game draws all of that by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.

She fights with the EMPTY hand and with her legs. The hand holding the cigarette
stays low and out of the way and never throws a strike.

Every pose in this sheet happens in mid-air — both of her feet are off the
ground in all nine poses, with nothing below her.

Pose 1 — airborne, curling up, knees tucked, empty arm drawn across her chest.
Pose 2 — airborne, spinning with a horizontal kick swung out in a full circle
around her at waist height.
Pose 3 — airborne, coming out of the spin, limbs pulling back in.
Pose 4 — airborne, empty fist drawn back behind her shoulder, body angled forward.
Pose 5 — airborne, a sideways punch at full reach, body stretched out flat
behind it, legs trailing.
Pose 6 — airborne, pulling the arm back in, body folding.
Pose 7 — airborne, both knees pulled up high, empty arm raised over her head.
Pose 8 — airborne, a downward hammer punch driven STRAIGHT DOWN below her at
full reach, head and shoulders driving down after it.
Pose 9 — airborne, after the downward strike, body curled under.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible in every pose from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above every pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
every pose. Exactly two arms and two legs per pose, clearly separated.
```

## 7. ชีต E — รัวควัน `haze1` `haze2` `haze3` (9 ท่า · 3 × 3)

**นี่คือสกิลหลักของเธอ** หมัดรัวกดรัวยืดได้ — ใบนี้ต้องอ่านเป็น "กำแพงหมัด" ไม่ใช่ "หมัดเป็นชุด ๆ"

ท่า 7-9 (`haze3`) **วนกลับไปต่อท่า 4 (`haze2`) ได้เรื่อย ๆ** ถ้าคนเล่นกดรัว
ท่า 9 จึงต้องต่อเข้าท่า 4 ได้เนียนเหมือนต่อเข้าท่า 1 — **เป็นลูปปิด ไม่ใช่เส้นตรง**

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO SPARKLES, NO MAGIC EFFECTS
anywhere in this image. Nothing rises from her cigarette. No motion lines, no
impact flashes — the game draws all of that by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

This sheet is one continuous rapid flurry of close-range strikes, not separate
poses. She stays planted in one tight stance the whole time, leaning in, and
only her arms move fast. Her feet barely shift between poses.

This sequence LOOPS: pose 9 must flow straight back into pose 4 just as cleanly
as pose 3 flows into pose 4, so the flurry can repeat without a visible seam.

Pose 1 — dropping into a tight forward stance, both hands coming up, the hand
with the cigarette tucked close against her ribs.
Pose 2 — a fast short punch at chest height, arm barely extended, elbow still
bent, body leaning in.
Pose 3 — that arm snapping back in while the other hand is already coming out.
Pose 4 — the other hand striking short and fast at chest height.
Pose 5 — the first hand striking again, slightly higher, at shoulder height.
Pose 6 — the other hand striking again, slightly lower, at stomach height.
Pose 7 — a fast short strike at chin height, elbow tight.
Pose 8 — a fast short strike at stomach height, elbow tight.
Pose 9 — both hands pulled back in tight against her chest, already coiled to
throw the next strike, her stance and weight identical to pose 3.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible in every pose from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above every pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
every pose. Exactly two arms and two legs per pose, clearly separated.
```

---

## 8. ชีต F — ไม้จบรัว + ต่อยแล้วย้อน + อัลติ (9 ท่า · 3 × 3)

สามท่าที่หนักที่สุดของเธอ แต่ละท่าต้องอ่านออกจากกันที่ซิลูเอตอย่างเดียว

- ท่า 1-3 `hazeEnd` — หมัดปิดหมัดเดียว **พร้อมสูบหนึ่งที** (ควันที่ค้างลงพร้อมกันตรงนี้)
  ต้องใหญ่กว่าทุกไม้ในใบ E ชัด ๆ
- ท่า 4-6 `snap1` — พุ่งเข้าไปต่อย **แล้วเกมจะเด้งเธอกลับที่เดิมเอง** ท่าไม่ต้องแสดงการย้อน
  (เกมวาดทางควันให้แล้ว — ดู `rewind` ใน `ScrambleScene.js`)
- ท่า 7-9 `veil1` อัลติ — สูดลึกแล้วกางแขนพ่นออกรอบตัว **ท่ากว้างที่สุดของเธอ**

```
ABSOLUTELY NO SMOKE, NO VAPOR, NO MIST, NO GLOW, NO SPARKLES, NO MAGIC EFFECTS
anywhere in this image. Nothing rises from her cigarette. No motion lines, no
impact flashes — the game draws all of that by itself.

A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read left
to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — winding up fully: her empty fist drawn all the way back past her hip,
knees deeply loaded, shoulder turned away, the biggest wind-up in her whole
moveset, and she is raising the cigarette toward her mouth with the other hand.
Pose 2 — a single enormous punch at chest height at maximum reach, her entire
body uncoiling behind it, back foot off the ground, cheeks drawn in as she takes
a deep drag on the cigarette at the same time.
Pose 3 — following all the way through, the punch carried past her, body turned
completely around, the cigarette hand lowering again.

Pose 4 — dropping low and launching forward, front foot reaching out, empty fist
drawn back tight against her ribs.
Pose 5 — a long committed lunging punch at chest height at full extension while
her body is stretched far out over her front leg, almost falling forward.
Pose 6 — landing out of the lunge, front knee deep, the arm still extended.

Pose 7 — standing tall and still, head lowered, feet together, the cigarette
held up near her mouth — the calmest pose in the whole sheet.
Pose 8 — both arms thrown WIDE open to either side at full arm's length, chest
open, head tipped back, mouth open as she exhales, feet planted far apart — the
widest and most open pose in her entire moveset.
Pose 9 — arms coming back down from the wide opening, body settling.

Chibi-proportioned anime game sprite, head roughly one third of the total height,
short stubby limbs, BOLD THICK UNIFORM BLACK OUTLINES, FLAT cel shading with very
few tone steps, clean colors — match the attached reference exactly.

Character: a young woman with heavy half-lidded sleepy eyes, faint shadows under
them, and a flat bored mouth — never smiling, never angry, never wide-eyed. Her
BLACK HAIR is gathered into a small messy bun on top of her head while long loose
strands still hang down around her face and down her back; it lies flat against
her skull and is never a wide round frizzy halo. She wears an ALL-BLACK outfit: a
loose long-sleeved top and loose black trousers that fall over her ankles. No
jacket, no tank top, no belt, no hand wraps, no pockets, no patterns. She is
BAREFOOT — no shoes, no socks. She holds a single lit hand-rolled cigarette
between the fingers of ONE hand; it is pale tan with a small orange ember at the
tip. Her OTHER HAND IS EMPTY — that is the hand she fights with. She has no
weapon of any kind.

THE CIGARETTE PRODUCES NO SMOKE IN THIS IMAGE. Draw the cigarette and its ember
only — no smoke trail, no wisp, no curl, nothing rising from it. The game engine
draws her smoke by itself.

Her hair always stays touching her shoulders or her back and never streams away
from her body. The cigarette stays held in her fingers in every pose and never
leaves her hand. Nothing is ever detached from her anywhere in the image.

Pure white background, no shadow, no ground line, no props of any kind, no text,
no labels, no panel borders. Full body visible in every pose from the top of her
hair to the soles of her bare feet — do not crop, do not zoom. Leave a clear band
of empty white space below and above every pose; nothing may touch or run off the
edge of the image. Identical camera distance and identical character size in
every pose. Exactly two arms and two legs per pose, clearly separated.
```

---

## เช็กลิสต์ก่อน build

- [ ] ขั้น 0 ผ่านแล้ว (ความสว่าง 40% ล่างวัดจากเรฟได้ 63 แล้ว — ชุดดำล้วนผ่านแน่นอน)
- [ ] ทุกใบแนบ **ทั้งเรฟและขั้น 0** คู่กัน
- [ ] หน้า/ผม/ชุด/เท้าเปล่า ยังเหมือนเรฟทุกใบ (ข้อที่หลุดง่ายที่สุดตอนเจนหลายใบ)
- [ ] ท่อนห้ามควันอยู่ **บรรทัดแรก** ของทุก prompt ไม่ใช่ท้าย
- [ ] เปิดดูทุกใบด้วยตา: **มวนอยู่ในมือครบทุกท่าไหม · มีควันติดมาไหม** (ตัวเลขจับไม่ได้)
- [ ] ไม่มีควัน/แสงเรือง/ประกายติดมาสักท่า **แม้แต่เส้นเดียวที่ปลายมวน**
- [ ] แขนขาไม่เกิน ไม่ซ้อน · ไม่มีท่าชนขอบ · ไม่มีท่าติดกัน
- [ ] `tools/measure_sheet_scale.py` — ท่าตั้งหลักต้องได้ 96-100% ของท่ายืน
- [ ] ใบ E ท่า 9 ต่อเข้าท่า 4 ได้เนียน (ลูปปิด)
- [ ] ใบ D ทุกท่าเท้าลอยจริง
- [ ] **ผมยาวไม่ปลิวหลุดจากตัวสักท่า** โดยเฉพาะท่าล้ม/ม้วน/หมุนกลางอากาศ

---

## ตารางเทียบ: ท่าในชีต → ไอดีท่าในซิม

ตารางนี้คือสิ่งที่ `tools/build_scramble_eye.py` (ยังไม่ได้เขียน) จะใช้
**ทุกไอดีต้องตรงกับ `EYE_MOVES` ใน `core.js` เป๊ะ** ไม่งั้นท่าหาย วาดเป็นกล่องแทน

| ไอดีในซิม | ใบ | ท่า | หมายเหตุ |
|---|---|---|---|
| `idle` | ขั้น 0 | 1 | |
| `run` | คลิป | 1-10 | ตัดจากวิดีโอ |
| `jump` | A | 1-4 | ถีบขึ้น → หดสุด → ร่วง → ลงพื้น |
| `hurt` | A | 5 | |
| `knockdown` | A | 6 | |
| `techroll` | A | 7 | |
| `tech` | A | 8 | |
| `block` | A | 9 | |
| `blockstun` | A | 10 | |
| `crouch` | A | 11 | |
| `blockcrouch` | A | 12 | |
| `jab1` | B | 1, 2, 3 | |
| `jab2` | B | 4, 5, 6 | |
| `jab3` | B | 7, 8, 9 | ไม้ที่ทิ้งควัน |
| `side` | C | 1, 2, 3 | |
| `up` | C | 4, 5, 6 | |
| `down` | C | 7, 8, 9 | |
| `nair` | D | 1, 2, 3 | |
| `sair` | D | 4, 5, 6 | |
| `dair` | D | 7, 8, 9 | ไม้ที่ทิ้งควัน |
| `haze1` | E | 1, 2, 3 | |
| `haze2` | E | 4, 5, 6 | ไม้ที่ทิ้งควัน |
| `haze3` | E | 7, 8, 9 | วนกลับไป `haze2` |
| `hazeEnd` | F | 1, 2, 3 | สูบหนึ่งที — ควันที่ค้างลงพร้อมกัน |
| `snap1` | F | 4, 5, 6 | เกมเด้งกลับที่เดิมให้เอง |
| `veil1` | F | 7, 8, 9 | อัลติ |

**รวม 68 เฟรม** (1 + 10 + 12 + 9×5) — ใกล้เคียง DEAR (70) น้อยกว่า MARCH (102)

> ท่ายืนนับครั้งเดียว มาจากขั้น 0 — คลิปวิ่งให้มาแต่เฟรมวิ่ง
> (ร่างแรกของไฟล์นี้เขียน 69 เพราะนับท่ายืนสองรอบ ทั้งจากขั้น 0 และจากคลิป)

---

## หลังได้อาร์ตครบ

1. เขียน `game/tools/build_scramble_eye.py` (ลอกจาก `build_scramble_march.py` ได้เลย)
2. ลบ `artPending: true` ออกจาก **สองที่**: `CHARACTERS.chronos` ใน `core.js`
   และ `CHAR_ART.chronos` ใน `ScrambleScene.js`
3. เติม `atlasKey: 'scchronos'` · `texture` · `data` · `anims` · `runStride` ใน `CHAR_ART.chronos`
4. เช็กว่าอัตลาสไม่เกิน **4096 px** ทุกด้าน — เกินแล้วการ์ดจอวาดเป็นสีดำ **โดยไม่มี error**
   (ใช้ `tools/repack_atlas.py` พับเป็นหลายแถว)
5. เติม `chronos` ใน `tools/tests/` ที่ล็อกจำนวนตัวละครไว้ (`lobby_bits.test.mjs`)
6. `bash tools/tests/run_all.sh` — `scramble.test.mjs` จะเลิกข้ามการตรวจอาร์ตของตัวนี้เอง
   ทันทีที่ธง `artPending` หายไป แล้วมันจะฟ้องทุกเฟรมที่ขาด
