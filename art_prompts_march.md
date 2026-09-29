# MARCH (Helios) — prompt ชีตทั้งชุด

> กลไกใหม่ (สกิล 2 Sky Drive) **เข้าเกมแล้วและเล่นได้จริง** ดู [`docs/HELIOS_KIT.md`](docs/HELIOS_KIT.md)
> ตอนนี้ยืมเฟรมเดิมอยู่ผ่าน `artAs` — ชีตชุดนี้คือของจริงที่จะมาแทนทั้งตัว
> เจนแล้ววางที่ `art_reference/helios_sheets/sheet_A.jpg` … `sheet_J.jpg`

> 📎 **แนบ `art_reference/helios_redesign_TURNAROUND.png` ไปกับทุก prompt**
> ภาพนั้นเป็น turnaround เต็มชุด (8 มุมตัว + 8 มุมหัว + สีหน้า 4 แบบ + ท่าตั้งการ์ด 5 ท่า)
> ซึ่งเป็นของอ้างอิงที่ดีที่สุดเท่าที่เคยได้มาในโปรเจกต์นี้ ทุกบล็อกเขียนว่า "the same character"
> ซึ่งแปลว่าไม่มีภาพอ้างอิง = ได้คนละคนทุกใบ

---

## ⚠️ ความเสี่ยงเฉพาะตัวนี้: กางเกงขาว

**ท่อนบนดำ ท่อนล่างขาว** ทำให้เงาของเขาอ่านออกง่ายที่สุดในโรสเตอร์ บอกได้ทันทีว่าหันทางไหน

**แต่พื้นของเวทีสว่างอยู่ราว 150-190 บนสเกล 0-255** ถ้ากางเกงสว่างกว่านั้น
**ครึ่งล่างของเขาจะจมหายไปกับพื้น** ซึ่งเป็นปัญหาที่ตัวตลกเคยเจอมาแล้วจนต้องเจนซ้ำ

anchor ในไฟล์นี้จึงสั่งว่า **ขาวหม่น/เทาอุ่นอ่อน พร้อมเงาในรอยพับลึก ๆ** ไม่ใช่ขาวสว่างแบน ๆ

> 📌 **ต้องวัดจริงตอนขั้น 0 ก่อนเจนอีก 9 ใบ** วิธีวัดเดียวกับที่ใช้กับ DEAR:
> ตัดพื้นขาวออก แล้ววัดความสว่างเฉลี่ยของ 40% ล่างของตัว **ถ้าเกิน ~140 ให้เจนใหม่**
> (เทียบ: DEAR วัดได้ 66-68 · Alecto 49 · Momus ตัวตลก 107 · Orpheus 114 · Helios เดิม 126)

---

## ⚠️ ความเสี่ยงข้อสอง: ปลายผ้าคาดเอว

ตัวตัดชีตทิ้ง "ก้อนที่ไม่ติดกับตัว" อยู่แล้ว **ปลายผ้าที่ปลิวหลุดออกไปจะโดนตัดทิ้ง**
หรือไม่ก็ถูกนับเป็นท่าหนึ่งท่า แล้วไม้บรรทัดวัดสเกลเพี้ยนทั้งใบ

anchor สั่งไว้แล้วว่าปลายผ้าต้องแนบขาเสมอ แต่ **เปิดดูทุกใบด้วยตาเสมอ** —
บทเรียนจาก DEAR: ตัวเลขจับได้แค่ของหลุด/ท่าติดกัน/ชนขอบ/สเกลเพี้ยน
**ส่วน "ของหายไปจากดีไซน์" ตัวเลขจับไม่ได้เลย ต้องเปิดดู**

---

## สถานะ — ✅ **ครบทุกใบแล้ว build เข้าเกมแล้ว**

อัตลาสของจริงอยู่ที่ `game/assets/characters/scramble_helios.{png,json}` (102 เฟรม · 4037x1296)
สร้างด้วย `game/tools/build_scramble_march.py` · สะพาน `artAs` ใน `ScrambleScene.js` ถูกลบทิ้งแล้ว

| ใบ | สถานะ | ท่าที่ได้ | ที่สั่ง | `body_sqrt` | กระจาย |
|---|---|---|---|---|---|
| ขั้น 0 | ✅ | 1 | 1 | 452.2 | — |
| คลิปวิ่ง | ✅ | 11 | 11 | — | คาบ 39 เริ่ม f96 |
| A เคลื่อนไหว/โดน | ✅ | 15 | 12 | 155.0 | 17.7% |
| B แย็บ | ✅ | 15 | 9 | 153.9 | 2.4% |
| C ท่าพิเศษพื้น | ✅ | 9 | 9 | 159.4 | 6.4% |
| D ท่าอากาศ | ✅ | 9 | 9 | 159.4 | 9.9% |
| E Chain Rush | ✅ | 8 | 9 | 215.9 | 4.2% |
| F Chain Rush ครึ่งหลัง | ✅ | 9 | 9 | 153.9 | 4.4% |
| G ไม้จบสองทาง | ✅ | 6 | 6 | 222.7 | 6.5% |
| H SKY DRIVE ขาขึ้น | ✅ | 9 | 9 | 142.1 | 2.6% | ← ใช้แค่แถว 1 กับ 3 · แถวกลางทิ้ง (ดูข้อ 13) |
| I SKY DRIVE ตบลง | ✅ | 6 | 6 | 216.3 | 6.5% |
| J อัลติ Hundred Hands | ✅ | 15 | 12 | 148.9 | 2.6% |
| K ศอกกลางอากาศ (แทน H แถวกลาง) | ✅ | 3 | 3 | 390.3 | — | ← ได้หมัดตรงไม่ใช่ศอก แต่ใช้ได้ ดูข้อ 13 |

### ✅ ใบ H ท่า 4-6: สั่ง "ศอกกลางอากาศ" แต่ได้ "การ์ดลอยเฉย ๆ" — เลิกใช้แล้ว แทนด้วยใบ K

และ **ไม่ได้จับได้ตอนตรวจใบ เพราะตอนนั้นตรวจแต่ความสะอาดกับไม้บรรทัด
ไม่ได้ตรวจว่า "ท่านี้อ่านออกไหมว่ากำลังตี"** ผู้เล่นเจอก่อน รายงานมาว่า "สกิล 2 ไม่มีเฟรม"

สิ่งที่ได้จริง: ท่า 4 = แขนชูขึ้นสุด (เป็นท่าต่อเนื่องจากอัปเปอร์ของแถวแรก)
ท่า 5 กับ 6 = ยกหมัดการ์ดข้างหน้าเฉย ๆ ลอยอยู่ ไม่มีแขนเหยียดออกไปไหนเลย

เรียงตามลำดับ 4-5-6 แปลว่า **เฟรมกลาง (= ช่วงที่กล่องชนเปิด) คือท่าการ์ด**
กดสกิล 2 แล้วทีที่สองในชุดจึงเป็นการ์ดสามเฟรมติด ตาอ่านว่าไม่มีอะไรเกิดขึ้น

แก้ชั่วคราวด้วยการสลับเป็น 5-4-6 (การ์ด → แขนพุ่งขึ้น → การ์ด) แล้ว **สั่งใบ K มาแทนทั้งแถว**
ตอนนี้ `sky2` มาจากใบ K แล้ว — แถวกลางของใบ H ไม่ได้ถูกใช้ที่ไหนอีก (ดูข้อ 13 ว่าใบ K ได้อะไรมา)

**ทุกใบสะอาด ไม่มีก้อนขยะเลยสักใบ** ปลายผ้าคาดแนบขาทุกท่า ไม่มีท่าไหนแตะขอบภาพ
และตรวจคู่ทุกคู่ในใบ F/J แล้ว ไม่มีท่าไหนเป็นภาพซ้ำ (IoU สูงสุด 0.906 กับ 0.911 · เกณฑ์ซ้ำคือ 0.93)

### ⚠️ ชีตเจนมาเกินที่สั่ง 3 ใบ · ขาด 1 ใบ

A · B · J สั่งไป 12/9/12 แต่ได้ 15 ทั้งสามใบ ส่วนใบ E สั่ง 9 ได้ 8
จึง **เลือกท่าเอง ไม่ใช่ไล่ 1-2-3 ตามลำดับ** — ตารางเลือกอยู่ใน `build_scramble_march.py`

เกณฑ์ที่ใช้เลือก: **เฟรมกลางของทุกท่าโจมตีต้องเป็นเฟรมที่แขนเหยียดสุด**
เพราะเอนจินเลือกเฟรมจาก `phase()` (`{startup:1, active:2, recovery:3}`)
เฟรมกลางจึงตรงกับช่วงที่กล่องชนเปิดพอดี วัด "ระยะเอื้อม" = ความกว้างกรอบของท่า

ท่าที่ขาดของใบ E คือท่าที่ 9 ซึ่ง **คือท่าแรกของใบ F พอดี** ตามคำสั่งรอยต่อ
`rush3` จึงจบด้วย `F:1` แล้ว `rush4` เริ่มด้วยเฟรมเดียวกัน ซึ่งคือสิ่งที่คำสั่งรอยต่อต้องการ:
มือที่ชักกลับ = มือที่กำลังจะออก

### ✅ คำสั่ง "ต่อรอยต่อ" — ใบ H→I ได้ผลชัด · ใบ E→F วัดไม่ออก

| คู่ | IoU | อ่านว่า |
|---|---|---|
| **H.9 ↔ I.1 (สั่งให้ตรงกัน)** | **0.789** | สูงกว่าฐานชัด = ต่อกันจริง |
| H.1 ↔ I.1 (ฐานเทียบ) | 0.506 | |
| H.5 ↔ I.4 (ฐานเทียบ) | 0.599 | |
| **E.8 ↔ F.1 (สั่งให้ตรงกัน)** | **0.869** | สูงสุดในกลุ่มก็จริง แต่… |
| E.1 ↔ F.1 (ฐานเทียบ) | 0.830 | …ฐานก็สูงเกือบเท่ากัน |
| E.8 ↔ F.8 (ฐานเทียบ) | 0.578 | |

**ต้องพูดให้ตรง: ใบ E→F วิธีนี้พิสูจน์อะไรไม่ได้** คู่ที่สั่งได้คะแนนสูงสุดก็จริง
แต่ห่างจากคู่มั่ว ๆ แค่ 0.039 เทียบกับ H→I ที่ห่าง 0.19-0.28

เหตุผลคือ **ใบ F ทุกท่าเป็นหมัดตรงคล้ายกันหมด** เงาจึงทับกันสูงไปหมดทุกคู่
IoU เลยแยกไม่ออก เรื่องเดียวกันเกิดกับใบ J: วัดลูปท่า 10→4 ได้ 0.779
ขณะที่คู่มั่ว ๆ ในใบเดียวกันได้ 0.763-0.771 — **ต่างกันไม่ถึง 2%**

> **ข้อสรุปที่ใช้ได้จริง: ชีตที่ทุกท่าคล้ายกัน วัดรอยต่อด้วย IoU ไม่ได้**
> แต่ก็ **ไม่จำเป็นต้องวัด** เพราะคุณสมบัติที่ทำให้วัดไม่ได้ (ทุกท่าคล้ายกัน)
> คือคุณสมบัติเดียวกับที่ทำให้ลูปต่อเนียนอยู่แล้ว
> อย่าอ้างว่า "วัดแล้วผ่าน" ในกรณีแบบนี้ — มันคนละเรื่องกับใบ H→I ที่วัดออกจริง

### ✅ กล้องแบ่งเป็นสองกลุ่มชัด ๆ — ยืนยันด้วยไม้บรรทัดอิสระสี่อัน

| กลุ่ม | ใบ | `body_sqrt` |
|---|---|---|
| ปกติ | A B C D F H J | 142-159 |
| ใหญ่กว่า ~1.5 เท่า | E G I | 216-223 |

ใบที่ท่าน้อย (6-8 ท่า) ตัวละครถูกวาดใหญ่กว่าใบที่ท่าเยอะ (15 ท่า) — ไม้บรรทัดแก้ให้หมดแล้ว

ยืนยันด้วยของที่วัดคนละบริเวณสีสี่อัน (พื้นที่ตัว · ผิว · กางเกงขาว · พิกเซลดำทั้งหมด)
ทั้งสี่ให้อัตราส่วนตรงกัน: E/G/I = 1.45-1.65 เท่าของ J ส่วนที่เหลือ = 0.85-1.13 เท่า

### ⚠️ เกือบพลาดซ้ำรอย DEAR: ไม้บรรทัดสีที่จับผิดของ

ลองเขียนไม้บรรทัด "ก้อนดำที่ใหญ่ที่สุดในตัว" โดยหวังว่าจะได้มวลผม การกระจายออกมา 7.4-15.8%
ซึ่ง **ดูดีกว่า `body_sqrt` ด้วยซ้ำ** ถ้าดูแต่ตัวเลขก็คงใช้ไปแล้ว

เปิดมาสก์ออกมาดูจริง: มันจับ **ผม+เสื้อ+ผ้าคาดเอว+ถุงมือ+รองเท้าติดกันเป็นก้อนเดียว
กินพื้นที่ 49-66% ของทั้งตัว** และในท่าเตะของใบ G รองเท้าเชื่อมเข้ามาด้วย ค่าจึงเพี้ยนเฉพาะใบนั้น
(MARCH ผมดำ เสื้อดำ ผ้าคาดดำ ถุงมือดำ รองเท้าดำ — ไม่มีสีไหนแยกหัวออกมาได้เลย)

> **กฎที่ได้จากรอบนี้ (ต่อจากกฎของ DEAR ที่ว่า "ทดสอบเกณฑ์สีกับสองภาพขึ้นไป"):**
> **ต้องเปิดมาสก์ออกมาดูว่ามันเลือกอะไรจริง ๆ — ตัวเลขการกระจายอย่างเดียวบอกไม่ได้**
> ก้อนผิดตัวให้ตัวเลขที่ดูดีกว่าของถูกได้สบาย ๆ

มีใบ A อีกใบ (`sheet_A_alt.jpg` 12 ท่า) เก็บไว้เป็นตัวสำรอง — ใบหลักครบกว่า

---

## แผนชีต — 102 เฟรม

| ใบ | ตาราง | เนื้อหา |
|---|---|---|
| ขั้น 0 | เดี่ยว | ท่ายืน (ด่านกั้น) |
| ขั้น 1 | คลิป | ยืน → วิ่ง ตัดเป็น 11 เฟรม |
| A | 4×3 | ท่าเคลื่อนไหวและท่าโดน 12 ท่า |
| B | 3×3 | แย็บสามจังหวะ |
| C | 3×3 | ท่าพิเศษบนพื้น |
| D | 3×3 | ท่ากลางอากาศ |
| E | 3×3 | Chain Rush 1-3 |
| F | 3×3 | Chain Rush 4-5 + ไม้จบตรง |
| G | 2×3 | ไม้จบอีกสองทาง |
| H | 3×3 | **SKY DRIVE** ยกคาง + สองทีกลางอากาศ |
| I | 2×3 | **SKY DRIVE** ทีที่สาม + ตบลง |
| J | 4×3 | อัลติ Hundred Hands |

> **ใบ A กับ J สั่งเป็น 4 แถว ไม่ใช่ 3** เพราะกรอบจะสูงขึ้น ท่าเล็กลง แล้วเหลือขอบว่างมากขึ้นเอง
> เป็นทางแก้ที่ได้ผลกว่าการเขียน "do not crop" ซ้ำ ๆ ซึ่งพิสูจน์แล้วว่าไม่ได้ผลตอนทำ DEAR

---

## 1. ขั้น 0 — ท่ายืน (✅ **ผ่านแล้ว ไม่ต้องเจนซ้ำ**)

> ของที่ใช้จริงอยู่ที่ `art_reference/helios_idle_APPROVED_v2.jpg`
> **แนบภาพนี้ไปกับทุก prompt คู่กับ turnaround** · ภาพเทียบบนเวทีอยู่ที่ `march_onstage_test.png`

### ผลวัด

| | ค่า | เกณฑ์ |
|---|---|---|
| **ท่อนล่างสว่าง** | **112.4** | ≤140 ✅ ห่างจากพื้นเวที (150-190) พอ |
| กว้าง (bbox) | 140 | Helios เดิม 136 · Alecto 160 ✅ |
| กว้างเฉลี่ย | 85 | Helios เดิม 67 · Momus 81 ✅ กว้างขึ้นตามที่สั่งให้ถ่างเท้า |
| พื้นรองเท้า | ครบ | แถวล่างสุดไล่ 122→10 = ปลายรองเท้าจบเอง ไม่โดนตัด ✅ |
| ก้อนที่แยกได้ | 1 | ไม่มีอะไรหลุดจากตัว ✅ |

**กางเกงขาวผ่าน** — เส้นขอบดำหนากับเงาในรอยพับทำงานได้จริง เทียบ: DEAR 66 · Alecto 49 ·
Momus ตัวตลก 107 · **MARCH ใหม่ 112** · Orpheus 114 · Helios เดิม 126

> ⚠️ **ความสูงเป็นหัววัดได้ 3.11 ซึ่งเกินเกณฑ์ 2.50-2.80** แต่ **ปล่อยผ่าน**
> ผมหนามแหลมดันยอดหัวขึ้นไปโดยที่กะโหลกไม่ได้โตตาม ไม้บรรทัดนี้จึงอ่านเพี้ยน
> — ปัญหาเดียวกับหมวกของ Alecto (วัดได้ 1.81) และผมฟูของ Momus (2.39) ซึ่งทั้งคู่ผ่านมาแล้ว
>
> **ตัวตัดสินคือภาพเทียบบนเวทีจริง** ซึ่งวางข้างโรสเตอร์แล้วขนาดพอดีทุกตัว

```
A single full-body standing pose of this character, drawn in chibi game-sprite
proportions: big head, short legs, compact body, the whole figure only about
two and a half to three heads tall.
He stands in a loose ready stance, feet well apart and weight low, both fists
raised lightly in front of his chest, chin slightly down, eyes forward, calm.
One character only, one pose only. No turnaround, no multiple views, no text,
no labels, no header bars.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 2. ขั้น 1 — คลิป ยืน → วิ่ง (✅ **ตัดเสร็จแล้ว**)

> อยู่ที่ `art_reference/helios_clip/run_01.png` … `run_11.png` + `clip.json`
> **คาบ 39 เฟรม เริ่มที่ f96** (39 ≈ 2 × 19.5 คือสองก้าว) · ท่ายืนในคลิปสูง 714 px
> หาด้วยวิธีเดียวกับ DEAR: เทียบรูปทรงทั้งตัวด้วย IoU แล้วเลือกจุดที่ลูปปิดสนิทที่สุด (0.952)
> เพิ่ม `helios` ลงตาราง `CLIPS` ใน `tools/cut_momus_clip.py` แล้ว พร้อมช่อง `n`
> เพราะตัวนี้ใช้ 11 เฟรมไม่ใช่ 10 เหมือนสองตัวก่อน

```
Animate this exact character: starts in the loose ready stance, holds it
briefly, then runs forward to the right for at least three full strides.
He runs like a fighter — upright, compact, arms tucked in and pumping close to
his body rather than swinging wide. The baggy trousers swing and ripple with
each stride but stay close to his legs, and the sash ends stay against his hip.
Same art style, same proportions, same camera distance throughout.
Pure white background, no shadow, no ground line. Full body always visible.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 3. ชีต A — ท่าเคลื่อนไหวและท่าโดน (12 ท่า · 4 แถวแถวละ 3)

เก้าท่าหลังเป็นท่า "โดน" กับ "กัน" ซึ่งเป็นท่าที่คนเล่นเห็นบ่อยที่สุดรองจากท่ายืน
ต้องอ่านออกจากหางตาว่าโดนแล้ว ไม่ใช่แค่ยืนเอียง ๆ

```
A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no impact effects — the game draws all of that.

Pose 1 — launching upward off both feet, knees starting to tuck, arms driving down.
Pose 2 — rising with knees pulled up tight, body compact, fists near his chest.
Pose 3 — floating at the top of the jump, body loose, one arm slightly out.
Pose 4 — falling, legs reaching down for the ground, body angled forward.
Pose 5 — hit and staggering backward, head snapped back, one arm flung out,
knees buckling, clearly taking damage.
Pose 6 — knocked flat on his back, limbs slack, one knee half raised.
Pose 7 — rolling sideways along the ground, body curled into a tight ball.
Pose 8 — pushing up off one knee getting back to his feet, one fist on the ground.
Pose 9 — guarding: both forearms crossed in front of his face and chest,
shoulders hunched, feet braced wide.
Pose 10 — guard broken through: same crossed-arm guard but skidding backward,
feet sliding, head turned aside from the force.
Pose 11 — crouched LOW and still, knees fully folded, forearms on his knees.
Pose 12 — crouched LOW in a guard, both forearms crossed in front of his face
while still folded down into the crouch.

Poses 11 and 12 must be crouched LOW — total height only about 80% of the standing pose, clearly shorter, not a shallow knee-bend.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 4. ชีต B — แย็บสามจังหวะ (9 ท่า · 3 แถวแถวละ 3)

สามหมัดแรกของเขา เร็วและเบา ไม่ใช่หมัดหนักที่เงื้อนาน

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Pose 1 — left fist pulled back only as far as his ribs, right hand up guarding,
body compact and already leaning in.
Pose 2 — a fast straight left fully extended at chest height, shoulder turned
in behind it, right hand still up.
Pose 3 — the left hand snapping back in, already rotating for the right.
Pose 4 — right fist cocked at the ribs, torso turned the other way, the left
hand exactly where pose 3 left it.
Pose 5 — a straight right fully extended at chest height, shoulder driving
behind it, hips turned through.
Pose 6 — the right hand snapping back in, weight rolling onto the front foot.
Pose 7 — winding up an overhand: right fist drawn up and back beside his head,
front shoulder dropped, knees loading.
Pose 8 — the overhand landing, right arm swung down and forward over the top
at head height, his whole body dropping behind it.
Pose 9 — following through low, fist past the target, body turned through.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 5. ชีต C — ท่าพิเศษบนพื้น (9 ท่า · 3 แถวแถวละ 3)

ท่า 4-6 คืออัปเปอร์คัต ซึ่งเป็นท่าส่งขึ้นฟ้าของเขา **หมัดต้องชี้ขึ้นชัด ๆ**

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — stepping deep into a long forward lunge, right fist drawn back at the ribs.
Pose 2 — a long lunging straight right at full extension, front leg deep in a
long stride, the whole body stretched out behind the punch.
Pose 3 — recovering out of the lunge, pulling the arm back in.
Pose 4 — crouched low, right fist down at knee height, coiled to swing upward.
Pose 5 — a rising uppercut with the right fist punched STRAIGHT UP past his own
head, arm fully extended vertically, body stretched tall, back heel lifted,
head tipped back.
Pose 6 — coming down out of the uppercut, knees absorbing the landing.
Pose 7 — dropping into a low crouch, both hands planted near the ground.
Pose 8 — a low sweeping kick along the floor, leg extended flat and level with
the ground, body rotated over the planted hands.
Pose 9 — rising out of the sweep, gathering himself back up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 6. ชีต D — ท่ากลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

ท่า 7-9 คือเตะขวานที่ทุบโดนแล้วเด้งกลับขึ้น — ต้องเห็นว่าทุบลงแนวดิ่งจริง ๆ
ไม่ใช่เตะเฉียง ๆ ไม่งั้นคนเล่นจะไม่เข้าใจว่าทำไมมันเด้ง

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
All nine poses are AIRBORNE — both feet off the ground, no ground contact in
any pose. No motion lines, no effects.

Pose 1 — airborne, knees tucked and body compact, winding up a spin.
Pose 2 — airborne mid-spin with one leg swung straight out to the side
horizontally, body rotating, arms tucked in.
Pose 3 — airborne pulling the leg back in from the spin, body compact again.
Pose 4 — airborne with the front knee drawn up high to his chest, body angled
forward, the back leg trailing.
Pose 5 — airborne flying kick with that leg snapped straight forward at chest
height, the whole body strung out in one line behind it.
Pose 6 — airborne retracting the leg, body folding back up.
Pose 7 — airborne with one leg raised STRAIGHT UP high above his head, body
stretched vertically, arms out for balance.
Pose 8 — airborne driving that heel STRAIGHT DOWN below his own body, leg
locked out vertically beneath him, body stacked directly above it, head down —
a pure downward axe kick, not a diagonal kick.
Pose 9 — airborne rebounding upward off that kick, leg still down, body rising,
the other knee drawing up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 7. ชีต E — Chain Rush จังหวะ 1-3 (9 ท่า · 3 แถวแถวละ 3)

ชุดรัวของเขา **แต่ละจังหวะต้องเป็นหมัดคนละทรง** ของเดิมเป็นหมัด-หมัด-เตะ-หมัด-เตะ
ซึ่งบนจอแยกไม่ออกว่าทีไหนเป็นทีไหน เพราะท่าวาดคล้ายกันหมด

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

**ท่าสุดท้ายของใบนี้ (ท่า 9) ต้องเป็นท่าเดียวกับท่าแรกของใบ F** — เขียนกำกับไว้ในทั้งสองใบแล้ว

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

This is beat 1 to 3 of a longer rush. Each beat is a DIFFERENT technique, not
the same punch repeated: a jab, then a cross, then an elbow.

Pose 1 — left jab winding: left fist at the ribs, body already driving forward.
Pose 2 — the left jab fully extended at chest height, short and fast.
Pose 3 — left hand snapping back as the right shoulder loads.
Pose 4 — right cross winding, hips turning, the left hand exactly where pose 3
left it.
Pose 5 — the right cross fully extended, hips turned all the way through.
Pose 6 — right hand pulling back as that same arm folds at the elbow.
Pose 7 — that folded right arm rising, elbow leading, shoulder lifting.
Pose 8 — a rising elbow strike, the point of the elbow driven up and forward at
head height, body lifting behind it.
Pose 9 — coming out of the elbow with the right arm folded across his chest and
his weight already rolling onto the front foot, mid-stride, NOT re-set into a
neutral stance.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 8. ชีต F — Chain Rush จังหวะ 4-5 + ไม้จบตรง (9 ท่า · 3 แถวแถวละ 3)

ต่อจากใบ E ทันที **ท่าแรกของใบนี้ต้องเป็นท่าเดียวกับท่าสุดท้ายของใบ E**

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

This continues a rush combination already in progress. Pose 1 is a HANDOFF
pose: he is already mid-stride with his right arm folded across his chest and
his weight on the front foot — he is NOT starting from a neutral stance.

Pose 1 — mid-stride, right arm folded across his chest, weight forward,
the left shoulder beginning to swing open.
Pose 2 — a wide left hook swung around at head height, the arm curved rather
than straight, body rotating hard behind it.
Pose 3 — the hook carrying through, his back turning slightly toward the viewer.
Pose 4 — that rotation continuing into a backfist: the right arm swinging up
and out with the back of the fist leading.
Pose 5 — the backfist landing at head height, arm extended across his body.
Pose 6 — the backfist arm whipping back in as both hips square up forward again.
Pose 7 — loading the finisher: both feet planted, right fist drawn far back
past his hip, shoulder wound up.
Pose 8 — a full-power straight right at maximum extension, his whole body
committed behind it, back foot pivoted up onto the toe.
Pose 9 — the long follow-through, arm still out, body settled low and forward.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 9. ชีต G — ไม้จบอีกสองทาง (6 ท่า · 2 แถวแถวละ 3)

ไม้จบของชุดรัวแยกสามทางตามปุ่มทิศ — ทางตรงอยู่ในใบ F แล้ว ใบนี้คือขึ้นกับลง
**เจนแยกเป็นใบเล็กเพราะท่าเตะยกขึ้นเป็นกลุ่มเสี่ยง** (บทเรียนจาก DEAR: ท่าที่ยกแขนขาเหนือไหล่
คือท่าที่ตัวเจนชอบทำของหายไปจากดีไซน์ ท่าน้อยลง = ใส่ใจต่อท่ามากขึ้น)

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
No motion lines, no effects — the game draws all of that.

Pose 1 — crouched low with the back leg coiled, both fists up, loading upward.
Pose 2 — a rising kick with the lead leg snapped STRAIGHT UP past the height of
his own head, body stretched vertically, arms thrown down for counterbalance,
back heel lifted off the ground.
Pose 3 — dropping back down out of the kick, knees absorbing the landing.
Pose 4 — dropping into a deep low crouch, both hands planted on the ground,
the back leg drawn in underneath him.
Pose 5 — a low sweeping kick with the leg extended flat and level along the
floor, body rotated low over the planted hands, head near knee height.
Pose 6 — rising out of the sweep, one hand still down, gathering back up.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 10. ชีต H — SKY DRIVE: ยกคาง + สองทีกลางอากาศ (9 ท่า · 3 แถวแถวละ 3)

สกิล 2 ใหม่ — **ท่า 1-3 เป็นท่าเดียวที่เขายืนบนพื้น ที่เหลือลอยหมด**
ท่ายกคางต้องอ่านออกว่า "เขาลอยตามขึ้นไปเอง" ไม่ใช่แค่ต่อยขึ้นแล้วยืนอยู่กับที่

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 9-pose sprite sheet of the same character, arranged in 3 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Poses 1 to 3 start on the ground and leave it. Poses 4 to 9 are fully AIRBORNE
with both feet off the ground.

Pose 1 — crouched low, both fists drawn down beside his knees, knees deeply
bent, gathering everything downward before launching.
Pose 2 — a rising hook punched up past his own head with the lead fist, his
whole body leaving the ground behind it, both feet lifting clear, back arched.
Pose 3 — climbing, body stretched upward, that fist still high, legs trailing
straight down beneath him, feet well off the ground.
Pose 4 — airborne, the lead arm folding back down across his chest as the other
elbow lifts.
Pose 5 — airborne elbow strike, the point of the elbow driven forward at head
height, body turned in behind it.
Pose 6 — airborne, the elbow arm whipping back in as the far shoulder opens.
Pose 7 — airborne, that far arm swinging open and back, winding a hook.
Pose 8 — airborne hook landing at head height, arm curved, torso rotating hard.
Pose 9 — airborne carrying through the hook, his back turning toward the viewer,
the other arm already lifting — mid-motion, NOT re-set.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 11. ชีต I — SKY DRIVE: ทีที่สาม + ตบลงพื้น (6 ท่า · 2 แถวแถวละ 3)

ต่อจากใบ H ทันที **ท่าแรกต้องเป็นท่าเดียวกับท่าสุดท้ายของใบ H**

ท่า 4-6 คือท่าตบลงพื้นซึ่งทำให้คู่ต่อสู้ **เด้ง** แล้วคอมโบต่อได้ — ต้องอ่านออกว่าทุบลงแนวดิ่ง
ไม่ใช่เหวี่ยงเฉียง ไม่งั้นคนเล่นจะไม่เข้าใจว่าทำไมอีกฝ่ายเด้งขึ้นมา

```
A 6-pose sprite sheet of the same character, arranged in 2 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
All six poses are fully AIRBORNE — both feet off the ground in every pose.
No motion lines, no effects.

Pose 1 — airborne mid-motion with his back turned slightly toward the viewer
and one arm already lifting, exactly continuing a hook that just landed.
Pose 2 — airborne backfist, the back of the fist swung out and across at head
height, arm extended over his own centre line.
Pose 3 — airborne, that arm whipping back in as both hands rise together above
his head, hips beginning to pitch forward.
Pose 4 — airborne with both fists clasped high above his head, knees pulled up,
body coiled, at the very top of the wind-up.
Pose 5 — airborne driving both fists STRAIGHT DOWN below his own body, arms
locked out vertically beneath him, body stacked directly above them, head down
between his shoulders — a pure downward hammer, not a diagonal swing.
Pose 6 — airborne just after the hammer, arms still down and locked, body
straightening, legs reaching down for the ground.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## 12. ชีต J — อัลติ Hundred Hands (12 ท่า · 4 แถวแถวละ 3)

อัลติเป็นชุดรัวที่กดปุ่มรัวเพิ่มรอบได้ **ท่า 4-9 จะถูกเล่นวนซ้ำ**
จึงต้องต่อกันเป็นวงได้: ท่า 9 ต้องต่อกลับเข้าท่า 4 ได้เนียนเหมือนต่อเข้าท่า 10

**รอยต่อคือทั้งหมดของใบนี้** — วาดให้ท่าสุดท้ายของจังหวะหนึ่ง เป็นท่าเดียวกับท่าแรกของจังหวะถัดไป
มือที่ชักกลับ = มือที่กำลังจะออก · น้ำหนักตัวไหลต่อ ไม่ดีดกลับมาตั้งหลักระหว่างที
ทำแบบนี้ตาจะอ่านทั้งชุดเป็นการเคลื่อนไหวเดียว ทั้งที่ยังเป็น 3 เฟรมต่อท่าเหมือนเดิม

```
A 12-pose sprite sheet of the same character, arranged in 4 rows of 3, read
left to right, top row first. Even spacing, no pose touching another.
This sheet is one continuous combination, not separate poses. Draw the LAST pose of each
beat and the FIRST pose of the next beat as the SAME body position, so the sequence reads as
one unbroken motion: the hand pulling back from one strike is already the hand starting the
next one, and his weight keeps flowing forward instead of resetting to a neutral stance
between beats.

Poses 4 to 9 will be played on a loop, so pose 9 must flow back into pose 4 as
smoothly as it flows into pose 10.

Pose 1 — both fists drawn back at his hips, knees bent, shoulders loading.
Pose 2 — the first straight punch of the flurry fired out at chest height.
Pose 3 — that hand snapping back as the other fist fires.
Pose 4 — a straight left at full extension, body low and driving in.
Pose 5 — left hand retracting as the right starts out, both arms mid-travel.
Pose 6 — a straight right at full extension, hips turned through.
Pose 7 — right retracting as the left fires again, arms crossing mid-flight.
Pose 8 — a rising left at chin height, elbow lifting.
Pose 9 — that arm folding back in with the hips already re-loading, weight
still forward, mid-stride — the pose flows straight back into pose 4.
Pose 10 — loading the finisher: both feet planted wide, right fist drawn far
back past his hip, shoulder fully wound.
Pose 11 — the finishing straight right at maximum extension, whole body
committed, back foot pivoted onto the toe.
Pose 12 — the long follow-through, arm still out, body settled low and forward.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. He fights with his feet planted WELL APART and his weight low, so his silhouette stays broad rather than a narrow column. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

---

## เช็กลิสต์ก่อน build — ✅ ทำครบแล้วทุกข้อ

1. ✅ **วัดความสว่างท่อนล่างของขั้น 0 ก่อนอย่างอื่นทั้งหมด** (ได้ 112 · เกิน ~140 = เจนใหม่)
2. ✅ เปิดดูทุกใบด้วยตา ไม่ใช่ดูแค่ตัวเลข — ผ้าคาดติดเอวทุกท่า · เสื้อยังดำ · ผมยังแนบกะโหลก
3. ✅ เช็กรอยต่อ E→F และ H→I — **H→I วัดออกชัด · E→F วัดไม่ออก** (ดูหัวข้อสถานะว่าทำไม)
4. ✅ ตัวแยกท่าได้จำนวนก้อนตรงทุกใบ ไม่มีก้อนขยะ ไม่มีท่าแตะขอบภาพ
5. ✅ ไม้บรรทัดกระจาย 2.4-9.9% ทุกใบ ยกเว้นใบ A ที่ 17.7% (ท่านอน/ม้วนต่างจริง) —
   ยืนยันใบ A ด้วยไม้บรรทัดอีกสามอัน ได้ 1.04-1.13 เท่าของ J ตรงกัน จึงเชื่อค่ากลางได้
6. ✅ **ลบ `artAs` ของ `helios` ออกจาก `ScrambleScene.js` แล้ว**
7. ✅ เทียบท่ายืนหลัง build จริง: `idle` สูง 240 px พอดี · ท่าตั้งหลักทั้งหมด 93-106% ของท่ายืน ·
   ท่าย่อ 81-95% · ท่านอน 58-60% · เท้าอยู่บนเส้นพื้นคลาดไม่เกิน 0 px ทุกท่าบนพื้น
   (เฟรมวิ่ง 3 เฟรมลอยเหนือเส้น 6-8 px ซึ่งคือช่วงลอยของรอบวิ่ง ไม่ใช่ความผิดพลาด)

### สิ่งที่ต้องดูด้วยตาในเกมจริง (ตัวเลขบอกไม่ได้)

- ~~**`runStride = 74`**~~ → **153** · ผิดจริงและแก้แล้ว ดูหัวข้อ "ท่าวิ่งสับขาไวเกิน" ข้างล่าง
  ค่านี้คุมว่าเท้าไถหรือไม่ ยังควรดูตอนวิ่งจริงอีกที แต่ตอนนี้จังหวะไม่ผิดเท่าตัวแล้ว
- **`sky1` เฟรม 3** ขาหดขึ้นแต่ยึดเท้าติดพื้น อาจดูเหมือนเขย่งปลายเท้าชั่วขณะ
  (ซิมยกตัวขึ้นอยู่แล้วตอนนั้น น่าจะกลบได้ แต่ต้องดู)
- **`crouch` สูง 92% ของท่ายืน** ซึ่งตื้นกว่าตัวอื่นในโรสเตอร์ — ดูว่าหลบท่าสูงได้จริงไหม

---

## ตารางเทียบ: ท่าในชีต → ไอดีท่าในซิม (ของจริงที่ build ไปแล้ว)

**เลขท่าไม่ได้ไล่ 1-2-3 ทุกใบ** เพราะชีตเจนมาเกิน/ขาด และเฟรมกลางต้องเป็นเฟรมแขนเหยียดสุด
ตารางจริงอยู่ที่ `SEQ` ใน `game/tools/build_scramble_march.py` — ตารางนี้คือสำเนาให้อ่านง่าย

| ไอดี | ที่มา | เฟรม |
|---|---|---|
| `idle` · `run` | ขั้น 0 · คลิป 1-11 | 1 + 11 |
| `jump` | A1 · A2 · A3 · A4 | 4 |
| `hurt` · `knockdown` · `techroll` · `tech` | A5 · A6 · A7 · **A9** | 4 |
| `block` · `blockstun` | **A13** · **A12** | 2 |
| `crouch` · `blockcrouch` | **A14** · **A15** | 2 |
| `jab1` · `jab2` · `jab3` | **B1,3,2** · **B7,6,8** · **B12,15,13** | 9 |
| `side` · `up` · `down` | C1-3 · C4-6 · C7-9 | 9 |
| `nair` · `sair` · `dair` | D1-3 · D4-6 · D7-9 | 9 |
| `rush1` · `rush2` · `rush3` | E1-3 · E4-6 · **E7,E8,F1** | 9 |
| `rush4` · `rush5` · `rushEndF` | F1-3 · F4-6 · F7-9 | 9 |
| `rushEndU` · `rushEndD` | G1-3 · G4-6 | 6 |
| `sky1` · `sky2` · `sky3` | H1-3 · **K1-3** · H7-9 | 9 |
| `sky4` · `sky5` | I1-3 · I4-6 | 6 |
| `hh1` · `hh2` · `hh3` · `hhEnd` | J1-3 · **J11,6,7** · **J10,13,9** · **J12,14,15** | 12 |

**รวม 102 เฟรม** · ท่าที่ไม่ได้ใช้: A8 A10 A11 · B4 B5 B9 B10 B11 B14 · J4 J5 J8

`F1` ถูกใช้สองที่ (ปิด `rush3` และเปิด `rush4`) ซึ่งตั้งใจ — คือรอยต่อที่สั่งไว้


---

## ⚠️ ท่าวิ่งสับขาไวเกิน — คลิปใหม่เป็นสองก้าวต่อรอบ ไม่ใช่ก้าวเดียว

`ScrambleScene.js` ตั้งเวลาต่อรอบของท่าวิ่งจาก `runStride` = **ระยะที่เท้าเคลื่อนได้หนึ่งรอบ**
ไม่ใช่ fps ตายตัว เพื่อให้จังหวะสับขาตรงกับความเร็วที่เคลื่อนจริงเสมอแม้จะปรับความเร็วในพาเนล Tune

ค่าเดิม 74 คิดมาจาก "ถ่างเท้าสูงสุด x หนึ่งก้าว" ซึ่งถูกกับคลิปเดิม แต่**คลิปชุดใหม่เป็นวงจรเดินเต็ม
สองก้าวใน 11 เฟรม** รอบจึงจบเร็วไปเท่าตัว = ขาสับถี่กว่าที่ตัวเคลื่อนไปจริงสองเท่า

วิธีนับจำนวนก้าวที่ใช้ (ไม่ใช่นับยอดถ่างขา — การสุ่มเฟรมทำให้นับได้ 3 ยอดในวงจรสองก้าว):
เทียบ IoU ของ **เฟรมที่ติดกัน** กับ **เฟรมที่ห่างกันครึ่งรอบ** ถ้าวงจรมีสองก้าว
ครึ่งรอบหลังจะซ้ำครึ่งรอบแรก คู่ที่ห่างครึ่งรอบจึงเหมือนกันมากกว่าคู่ที่ติดกัน

| ชุด | เฟรมติดกัน | ห่างครึ่งรอบ | สรุป |
|---|---|---|---|
| ชุดใหม่ | 0.684 | **0.783** | สองก้าว |
| ชุดเดิม | **0.800** | 0.626 | ก้าวเดียว |

แยกขาดทั้งสองทาง จึงเอามาเป็นตัวนับอัตโนมัติท้าย `build_scramble_march.py`
ซึ่งคำนวณค่าที่ควรเป็นแล้ว **เทียบกับค่าใน `ScrambleScene.js` ทุกครั้งที่ build**
ต่างกันเกิน 8% = build ไม่ผ่าน (ทดสอบแล้วว่าแดงจริงเมื่อใส่ 74 กลับเข้าไป)

สูตร (เดียวกับ `gunStride` ของ Alecto): ถ่างเท้าสูงสุด x (SPRITE_H / standing) x จำนวนก้าว
  · ชุดใหม่ 141 x (130/240) x 2 = **153**
  · ทวนกับชุดเดิม 158 x (130/240) x 1 = 85.6 ซึ่งคือค่า 85 ที่ใช้อยู่จริง ✓

---

## 13. ชีต K — ศอกกลางอากาศ แทนที่ใบ H ท่า 4-6 (3 ท่า · แถวเดียว) — ✅ **build เข้าเกมแล้ว**

ใบนี้เจนเพื่อ**แทนที่ของเดิมที่เจนมาไม่ตรงคำสั่ง** ไม่ใช่ท่าใหม่ — ดูหัวข้อ ⚠️ ใบ H ด้านบน

เงื่อนไขที่พลาดรอบที่แล้ว: ท่า 5 ที่สั่งว่า "airborne elbow strike" ได้กลับมาเป็นท่ายกหมัดการ์ด
รอบนี้จึงเขียนใหม่ให้เงื่อนไขวัดได้ด้วยตา: **ศอกต้องเป็นจุดที่ยื่นออกไปไกลที่สุดของทั้งภาพ**
และสั่งตรง ๆ ว่าท่ากลางต้องกว้างกว่าอีกสองท่าอย่างเห็นได้ชัด

### ผลที่ได้จริง — ผ่านสองข้อ ตกข้อศอก

| เงื่อนไขที่ตั้งไว้ | ผล |
|---|---|
| ท่ากลางกว้างกว่าอีกสองท่า | ✅ กว้าง 344 / **455** / 402 px (แต่ดูผลลบข้างล่าง — ข้อนี้พิสูจน์อะไรไม่ได้) |
| ทั้งสามท่าลอยหมด ไม่มีเส้นพื้น | ✅ |
| **ศอกเป็นจุดที่ยื่นไกลที่สุด** | ❌ ได้ **หมัดตรง** แขนเหยียดสุด ไม่ใช่ศอก |

**ยังรับมาใช้** เพราะสิ่งที่ท่านี้ต้องมีจริง ๆ คือ "เฟรมกลางต้องอ่านออกว่ากำลังตี"
ซึ่งหมัดตรงก็ให้ได้ และดีกว่าท่าการ์ดของเดิมทุกทาง — จังหวะ หด → เหยียดสุด → พับกลับ
ยังครบตามกฎ "เฟรมกลาง = ช่วงกล่องชนเปิด"

### ❌ ผลลบที่ต้องจำ: บั๊กนี้เขียนตัวตรวจอัตโนมัติไม่ได้

ลองสร้างการ์ดกันบั๊ก "เฟรมกลางไม่ใช่ท่าตี" สองแบบ **ทั้งสองแบบแยกของพังออกจากของดีไม่ได้**
วัดจากอัตลาสจริงสามชุด (ดึงของเก่ามาจาก git):

| ชุด | IoU เฟรมกลางกับเฟรม 1 / เฟรม 3 | ความกว้าง 3 เฟรม |
|---|---|---|
| **พัง** H 4-5-6 (เฟรมกลาง = การ์ด) | 0.611 / 0.768 | 150 · **161** · 156 |
| แก้ชั่วคราว H 5-4-6 | 0.611 / 0.659 | **161** · 150 · 156 |
| **ดี** K 1-2-3 | 0.675 / 0.775 | 126 · **166** · 147 |

- **กฎ "เฟรมกลางต้องต่างจากเพื่อนบ้าน" ใช้ไม่ได้** — ชุดที่พังต่างกัน *มากกว่า* ชุดที่ดีเสียอีก
- **กฎ "เฟรมกลางต้องกว้างสุด" ก็ใช้ไม่ได้** — ชุดที่พังก็ผ่านกฎนี้ (161 คือค่ามากสุด)
  และถ้าบังคับใช้ทั้งอัตลาส **ท่าจริงจะตกกฎ 5 จาก 26 ท่า** (`sky5` `dair` ตีลงล่าง ไม่ได้ตีออกข้าง)

เหตุผล: กรอบภาพถูกกำหนดด้วย**ผมกับขา** ซึ่งกินเกือบเต็มกรอบอยู่แล้ว
แขนที่เหยียดออกมาขยับกรอบแค่ไม่กี่ px ความต่างระหว่าง "การ์ด" กับ "ตี"
อยู่ที่**เนื้อในภาพ ไม่ใช่เงา**

> **ข้อสรุป: ท่าโจมตีต้อง render ออกมาดูด้วยตาทุกครั้งที่เพิ่มหรือสลับชีต ไม่มีทางลัด**
> (ตัวเลข 344/455/402 ที่เคยอ้างว่าเป็นหลักฐานว่าใบ K ใช้ได้ — ไม่ใช่หลักฐาน
> หลักฐานจริงคือภาพที่ render ออกมาแล้วเห็นว่าแขนเหยียดออกไป)

**ผลข้างเคียงที่เหลืออยู่:** ชุดลอยตอนนี้เป็น
`sky1` อัปเปอร์ขึ้น → `sky2` หมัดตรง → `sky3` หมัดตรง → `sky4` หมัดตรง → `sky5` ตบลง
สามทีกลางเป็นหมัดตรงเหมือนกันหมด ท่าต่างกันแค่มุมแขนกับการเอียงตัว
ถ้าจะให้ชุดลอยดูหลากหลายขึ้น **ไม้ที่ควรเจนใหม่คือ `sky3` (ใบ H ท่า 7-9) ไม่ใช่ `sky2` อีกแล้ว**
— เจนเป็นเข่าลอยหรือเตะหมุนจะตัดความซ้ำได้ตรงจุดกว่าไปลุ้นศอกรอบสาม

**บทเรียนรอบนี้ (ต่อจากบทเรียนใบ H):** เงื่อนไขที่เขียนให้ "วัดด้วยตาได้" ช่วยให้
*ตรวจรับ* ได้เร็วขึ้นจริง — รอบนี้รู้ทันทีว่าตกข้อไหน แทนที่จะรู้ตอนผู้เล่นมาบอกว่าไม่มีเฟรม
แต่มันไม่ได้ทำให้ตัวเจน *ทำตาม* ได้ ท่าที่ต้องพับแขน (ศอก เข่า) ดูจะเป็นจุดอ่อนของตัวเจน
มันชอบคลี่ออกเป็นท่าเหยียดตรงเสมอ

```
A 3-pose sprite sheet of the same character, arranged in ONE horizontal row,
read left to right. Even spacing, no pose touching another.

All three poses are fully AIRBORNE — both feet clear of the ground, nothing
below him, legs tucked or trailing. He is rising, not falling.

These three poses are ONE elbow strike broken into its three moments. The middle
pose is the strike itself and MUST be the widest of the three: the point of his
elbow is the furthest-forward point in the whole drawing, further forward than
his hair, his knee or his other fist. The outer two poses are clearly narrower.

Pose 1 — winding up: the striking arm folded tight, that fist pulled back against
his own chest, the elbow still pointing DOWN, shoulder dropped and coiled back.
Pose 2 — the elbow strike at full extension: the elbow driven forward and slightly
upward at head height, the forearm folded flat against his upper arm, the whole
shoulder and torso turned in hard behind it. The elbow leads; the fist stays
against his own shoulder. His body is stretched along the line of the strike.
Pose 3 — carrying through: the elbow arm sweeping past and starting to fold back
across his chest, torso still rotating, the other shoulder opening forward —
mid-motion, NOT returned to a guard.

Chibi-proportioned anime game sprite, large head roughly one third of the total height, short stubby limbs, bold dark outlines, flat cel shading, muted desaturated palette — match the attached reference sheet exactly. Character: a lean teenage boy martial artist. His black hair is spiky and swept up, but it lies FLAT against his skull with the hairline clearly visible — never a wide round frizzy halo. A small pale scar sits on one cheek. His expression is level and unimpressed, at most a slight smirk; never wide-eyed or cheerful. He wears a fitted short-sleeved BLACK t-shirt that shows the shape of his chest and arms, and loose BAGGY TROUSERS in a muted off-white / warm light grey — the trousers are wide and billowy with deep folded shadows through them, never a flat bright white. A black cloth sash is tied around his waist with two loose ends hanging down his left hip; the sash ends always stay close against his leg and never stream away from his body. Black fingerless gloves with wrapped wrists cover both hands, and he wears black ankle-high boots. Three-quarter view, body angled toward the viewer's right. Pure white background, no shadow, no ground line, no props of any kind, no weapons, no text, no labels, no panel borders. Full body visible from the top of his hair to the soles of both boots — do not crop, do not zoom. Leave a clear band of empty white space below the soles and above his hair; nothing may touch or run off the edge of the image. Identical camera distance and identical character size in every pose. Exactly two arms and two legs, clearly separated, do not overlap or duplicate limbs. Nothing detached from his body anywhere in the image — no loose cloth flying away, no separated objects. No effects of any kind: no wind, no impact flashes, no sparks, no glow, no motion lines, no speed lines, no dust, no cracked ground — the game draws all of that itself.
```

✅ ทำครบแล้ว: ไฟล์อยู่ที่ `art_reference/helios_sheets/sheet_K.jpg` · `SEQ` เป็น
`"sky2": ("K", [1, 2, 3], AIR)` · `"K"` อยู่ใน `LETTERS` · build แล้ว (102 เฟรม 4037x1307) · `sw.js` = `sfr-v5`

---

## ⚠️ อนุภาคเอฟเฟคทุกชนิดวาดผิดรูปมาตั้งแต่ต้น (แก้แล้ว)

ไม่เกี่ยวกับ MARCH โดยตรงแต่เจอตอนไล่เรื่องสกิล 2 — บันทึกไว้เพราะเป็นบทเรียนซ้ำรอยเดิม

คีย์ในอัตลาสเอฟเฟค **พกนามสกุลมาด้วย** (`ring.png`) แต่ทุกที่ที่เรียกเขียนชื่อเปล่า (`emit('ring', …)`)
Phaser **ไม่ throw** เมื่อหาเฟรมไม่เจอ มันเตือนใน console แล้วคืน "เฟรมแรกของอัตลาส" มาแทน
ซึ่งคือ `slashWide.png` — วงแหวน ดาว ฝุ่น ประกาย เส้นพุ่ง จึงวาดเป็นรอยดาบโค้งอันเดียวกันหมด
เกมเดินได้ปกติ ไม่มี error ไม่มีจอดำ เห็นได้อย่างเดียวคือเปิดภาพมาดูแล้วรู้ว่า "รูปไม่ใช่"

(บทเรียนเดียวกับ `verify.py` ที่แมตช์ `"idle_1"` แทน `"idle_1.png"` — **คีย์ในอัตลาสมีนามสกุลเสมอ**)

แก้ที่ `emit()` เติมนามสกุลให้เองจุดเดียว แทนการไล่แก้ที่เรียกทั้ง 40 กว่าจุด
และเพิ่มการ์ดใน `vfx.test.mjs` สองข้อ: เติมนามสกุลจริงไหม · ชื่อที่ `emit()` เรียกมีในใบครบไหม
