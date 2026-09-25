# VFX — ใบเดียวพอทั้งเกม

> ⚡ **อย่าเจนเอฟเฟคแยกต่อท่า** กฎที่ใช้มาตลอดโปรเจกต์คือ
> **"เอฟเฟคทั้งหมดเกมวาดเอง ไม่อบติดมากับอาร์ตตัวละคร"**
> เจนแยกต่อท่า = 6 ตัวละคร × ~15 ท่า = 90 ใบ ที่สีไม่ตรงกันเลยสักใบ
>
> สิ่งที่ต้องเจนคือ **แผ่นอนุภาคกลางใบเดียว** ขาวดำ แล้วเกมย้อมสีเอาตอนใช้
> ไฟส้ม ควันเทา ประกายเหลือง ฟ้าของเวทมนตร์ — ใช้ภาพเดียวกันหมด ต่างกันแค่ค่าสีที่โค้ดใส่

## ทำไมต้องขาวดำบนพื้นดำ

เอฟเฟคในเกมต่อสู้วาดด้วยโหมดผสมแบบ **additive** (สว่างทับกัน) ซึ่งกินภาพขาวดำแล้วคูณสีทีหลัง
ถ้าเจนมาเป็นสีแล้ว ย้อมทับไม่ได้ — ไฟจะเป็นสีส้มตลอดกาล ใช้ทำควันเทาไม่ได้
และพื้นต้องดำสนิท เพราะ additive แปลว่า "ดำ = โปร่งใส" อัตโนมัติ ไม่ต้องตัดพื้นเลยสักขั้นตอน

## แผ่นอนุภาค (1 ใบ · 16 ช่อง · 4x4)

```
A 4x4 sprite sheet of 16 stylized game VFX particles, drawn in soft white and
grey on a PURE BLACK background. Each cell contains exactly one isolated shape,
centred, with generous empty black space around it. No frames, no borders,
no grid lines, no labels, no text, no numbers.

Every shape must be WHITE or GREY ONLY — absolutely no colour anywhere.
Shapes fade softly to black at their edges so they blend when added together.

Row 1 — impact: a four-pointed star flash; a round soft burst; a thin crescent
slash arc; a jagged spiky impact star.
Row 2 — smoke: a round puffy smoke ball; a wispy drifting smoke trail; a
flat ground dust cloud; a thin rising smoke curl.
Row 3 — fire: a tall flame tongue; a small round ember; a soft glowing orb;
a fire wisp curling upward.
Row 4 — shapes: a thin expanding ring; a soft filled circle with a bright
centre; a short straight streak with a bright head; a tiny sharp diamond.

Hand-painted 2D game VFX style, soft airbrushed edges, high contrast against
the black, clean silhouettes readable at small size. Pure black background
(#000000) everywhere except the shapes themselves.
```

## ใบที่สอง — รอยฟาด (1 ใบ · 8 ช่อง · 4x2)

เจนพร้อมกับใบแรกได้เลย **ใช้กฎเดียวกันทุกข้อ** (ขาวดำ พื้นดำสนิท ช่องละรูปเดียว)

ทำไมต้องมีแยก: crescent ในใบแรกเป็นอนุภาคเล็ก ๆ ไว้โปรย
ส่วนใบนี้เป็น **รอยฟาดเต็มท่า** ที่ลากตามแนวอาวุธจริง — แส้ของ Alecto ยาวกว่าจอครึ่งหนึ่ง
ใช้อนุภาคเล็กแทนไม่ได้

> ⚠️ **ทุกรอยต้องหันทางเดียวกันหมด (ฟาดจากซ้ายไปขวา)**
> เกมพลิกภาพเอาเองตามทิศที่ตัวละครหัน ถ้าเจนมาหันคนละทาง ต้องมาแก้ทีละช่อง
> และพอพลิกแล้วมันจะฟาดผิดทางครึ่งหนึ่งของท่าทั้งหมด

```
A 4x2 sprite sheet of 8 stylized weapon slash arcs, drawn in soft white and
grey on a PURE BLACK background. Each cell contains exactly one isolated arc,
centred, with empty black space around it. No frames, no borders, no grid
lines, no labels, no text, no numbers.

Every shape must be WHITE or GREY ONLY — absolutely no colour anywhere.
Draw ONLY the arc itself — no weapon, no hand, no character, no sparks.
Arcs are brightest along their leading edge and fade softly to black behind,
so they read as motion.

EVERY arc must sweep in the SAME direction: left to right, as if swung by a
character facing right. Do not mirror or rotate any of them.

Cell 1 — a wide sweeping crescent, thick in the middle, tapering to sharp
points at both ends.
Cell 2 — the same crescent but much thinner and sharper, a fast light slash.
Cell 3 — a near-full circular swirl, like a spinning attack.
Cell 4 — a short straight thrust streak with a bright leading tip.
Cell 5 — a long whip-like lash, thin and snaking, stretching far to the right.
Cell 6 — a heavy downward chopping arc, thick at the top, sweeping down.
Cell 7 — a rising uppercut arc, thick at the bottom, sweeping up.
Cell 8 — two crossed slashes forming an X.

Hand-painted 2D game VFX style, soft airbrushed edges, clean silhouettes
readable at small size. Pure black background (#000000).
```

### แต่ละช่องจะไปอยู่ท่าไหน

| ช่อง | ใช้กับ |
|---|---|
| 1 กว้างหนา | ฟันดาบของ Atlas · เหวี่ยงกีตาร์ของ Orpheus |
| 2 บางเร็ว | จิ้มเบาของทุกตัว · ตบของ Momus |
| 3 หมุนรอบตัว | ท่ากลางอากาศ (nair) |
| 4 แทงตรง | ท่าแทงของ Nyx · ท่าพุ่งเข้าของทุกตัว |
| 5 แส้ยาว | แส้ทุกท่าของ Alecto (ยาวสุดในเกม) |
| 6 ฟันลง | ท่าลงจากอากาศ (dair) · Skyfall ของ Atlas |
| 7 เสยขึ้น | ท่าขึ้น (up) ของทุกตัว |
| 8 ไขว้ | ไม้จบคอมโบ |

## สิ่งที่ **ไม่ต้อง** เจน เพราะเกมวาดเองอยู่แล้ว

| ของ | ทำยังไงตอนนี้ |
|---|---|
| กองไฟมอลอตอฟ | สี่เหลี่ยมเปลวไฟขยับตามเลขเฟรม |
| วงฝุ่น Dust Devil | แถบจาง + ผนังกรงเรืองแสง |
| กล่องระเบิด Momus | กล่องไม้ + จุดชนวนกะพริบ |
| ตรารอยแส้ | ตัวเลขลอยขึ้น |
| กระสุน | วงกลมเล็ก |

พวกนี้ต้องวาดด้วยโค้ดเพราะ **ตำแหน่งกับอายุมันเป็นสถานะของ sim** ที่สองเครื่องต้องตรงกันเป๊ะ
เอาภาพไปแปะทับได้ แต่ห้ามให้ภาพเป็นตัวกำหนดว่าอะไรอยู่ตรงไหน
