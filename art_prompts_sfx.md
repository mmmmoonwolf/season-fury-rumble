# เสียงเอฟเฟค — prompt สำหรับ ElevenLabs Sound Effects

> อ่าน `docs/AUDIO.md` คู่กัน ระบบเสียงต่อไว้พร้อมแล้ว ขาดแค่ไฟล์
> ทุก prompt ในนี้เจนเป็น **ไฟล์เดียว เสียงเดียว** ไม่ใช่ชุด — เหตุผลอยู่ในหัวข้อกับดัก

---

## 0 · ตัดสินใจเรื่องสไตล์ก่อน ไม่งั้นเจนมาแล้วทิ้ง

เกมนี้**อาร์ตวาดมือ แต่เพลงเป็นชิปทูน 8-bit** สองอย่างนี้ดึงเสียงไปคนละทาง

| ทางเลือก | ผลที่ได้ |
|---|---|
| เสียงบลิปแบบ 8-bit ให้เข้ากับเพลง | ตีกับอาร์ต ตัวละครวาดละเอียดแต่ต่อยแล้วดัง "ปิ๊ว" |
| foley สมจริงแบบสารคดี | ตีกับเพลง และหางเสียงยาวเกินจะเล่นรัว ๆ ได้ |
| **เสียงอาร์เคดที่ผ่านการปรุง** ← ที่ใช้ในไฟล์นี้ | หนักแน่นแบบเกมต่อสู้ สั้น แห้ง ไม่ใช่เสียงจริง ๆ แต่ก็ไม่ใช่บลิป |

ทางที่สามคือที่เกมต่อสู้ส่วนใหญ่ใช้จริง และเป็นตัวเดียวที่อยู่ร่วมกับชิปทูนได้โดยไม่ตีกัน
**ทุก prompt ข้างล่างเขียนตามทางนี้** ถ้าอยากได้ทางอื่นบอกได้ ผมเขียนใหม่ให้

---

## 1 · ตั้งค่าในหน้า ElevenLabs

| ช่อง | ตั้งเท่าไหร่ | เพราะอะไร |
|---|---|---|
| **Prompt influence** | **สูง ~0.7–0.8** | ต่ำแล้วมันจะ "สร้างสรรค์" คือใส่ดนตรี ใส่บรรยากาศ ใส่หางเสียงที่เราไม่ได้ขอ งานนี้ต้องการความเชื่อฟัง ไม่ต้องการไอเดีย |
| **Duration** | ตั้งเองทุกครั้ง ตามที่ระบุในแต่ละ prompt | ปล่อย auto แล้วมันยืดเสียงต่อยเป็น 2 วินาที ซึ่งยาวกว่าที่ใช้จริง 10 เท่า |
| **Variations** | เก็บทุกอันที่มันให้มา | เราต้องการหลายเวอร์ชันอยู่แล้ว (ดูข้อ 6 ในกับดัก) |

**ขั้นต่ำของ duration คือ 0.5 วินาที** แต่เสียงต่อยที่ใช้จริงยาวแค่ ~0.15 วินาที
ไม่ต้องไปฝืนตรงนี้ — เจนที่ 0.5 แล้ว**ตัดหางทิ้งตอนแปลงไฟล์** ผมทำให้ในสคริปต์

ไฟล์ที่ได้เป็น mp3 ต้องแปลงเป็น `ogg` + `m4a` สองฟอร์แมตเหมือนเพลง
(เหตุผลเดียวกัน: Safari เก่าไม่เล่น ogg / Firefox เก่าไม่เล่น m4a)

---

## 2 · หกกับดัก — เขียนกันไว้ในทุก prompt แล้ว

**1 · ห้องก้อง** ElevenLabs ชอบใส่ reverb ให้เองเพราะมันฟังดู "ดี" ในคลิปเดี่ยว
แต่ในเกม หมัดออก 5 ครั้งต่อวินาที หางเสียงจะทับกันเป็นโคลน
ทุก prompt เลยต้องมี `dry, close-miked, no reverb, no room ambience`

**2 · ดนตรี** ถ้าไม่ห้าม มันแถมสติงเกอร์ดนตรีมาด้วยบ่อยมาก แล้วคีย์ไม่ตรงกับเพลงในเกม
ทุก prompt มี `no music` ทุกอัน

**3 · เสียงค่อย ๆ ดังขึ้น** เสียงหมัดที่ fade in มาถึงหูช้ากว่าภาพ ความรู้สึก "โดน" หายทันที
ในเกมต่อสู้ **หัวเสียงคือเสียง** ที่เหลือคือหาง — `instant attack, no fade-in`

**4 · สเตอริโอ** เกมแพนเสียงตามตำแหน่งเอง ถ้าไฟล์กว้างอยู่แล้วจะแพนไม่ขึ้น — `mono`

**5 · มันชอบเจนเป็นชุด** ขอ "punch" แล้วได้ต่อยสามทีติด ซึ่งเอาไปเล่นตอนต่อยทีเดียวไม่ได้
ทุก prompt ปิดท้ายด้วย `exactly one … only`

**6 · หูล้า** ท่าแย็บยิงรัวเป็นสิบครั้งในคอมโบเดียว ถ้าไฟล์เดียววนซ้ำ คนฟังจับได้ใน 3 วินาที
เสียงที่ดังบ่อยต้องมี **3–4 เวอร์ชัน** และเกมต้องสุ่มระดับเสียงสูงต่ำเล็กน้อยทุกครั้ง (ดูข้อ 6 ท้ายไฟล์)

---

## 3 · ชุดแรก — ห้าเสียงนี้พอเปลี่ยนเกมทั้งเกม

ไม่ต้องเจนครบทุกอย่างในไฟล์นี้รอบเดียว **ห้าอันนี้ดังตลอดเวลาที่เล่น**
ที่เหลือเป็นของประดับ เจนทีหลังได้

### 3.1 หมัดเบา — `hit_light` ×4 (แย็บ ท่าไม้ตายเบา dmg 1–4)

```
A single sharp punch impact on a body, close-miked and completely dry.
A short leather-and-flesh thud with a crisp high snap right at the front.
Instant attack, no fade-in, tight and fast decay under a quarter second.
Mono. No reverb, no room ambience, no music, no voice.
Exactly one impact, not a sequence.
```
Duration **0.5s** · เจน **4 รอบ** เก็บที่ต่างกันชัดที่สุด 4 อัน

### 3.2 หมัดหนัก — `hit_heavy` ×3 (ท่าจับลอย ท่าปิดคอมโบ dmg 7+)

```
A single heavy bone-crunching punch impact, close-miked and dry.
A deep low-end thump layered with a wet flesh smack and a metallic crack on top.
Instant attack, no fade-in, decaying within half a second.
Mono. No reverb, no room tone, no music.
Exactly one impact only.
```
Duration **0.7s** · เจน **3 รอบ**

> ต้องดังและ "ใหญ่" กว่า `hit_light` ชัดเจน เกมสั่นจอตามน้ำหนักหมัดอยู่แล้ว
> ถ้าเสียงไม่ไล่ตาม ภาพกับหูจะบอกคนละเรื่อง

### 3.3 หวดลม — `swing` ×3 (ตอนออกท่า ก่อนรู้ว่าโดนไหม)

```
A single fast whoosh of an arm swinging through the air, close and dry.
A short airy swish with no impact at the end, fairly quiet.
Instant, no fade-in, under a quarter second.
Mono. No reverb, no music.
Exactly one swing only.
```
Duration **0.5s** · เจน **3 รอบ**

> อันนี้คนมักลืม แต่มันคือเสียงที่บอกว่า **"ตีพลาด"** ถ้าไม่มี การตีพลาดจะเงียบสนิท
> แล้วคนเล่นจะไม่รู้ว่ากดติดหรือเปล่า

### 3.4 บล็อก — `block` ×2

```
A single blocked impact — a hit landing on a raised guard.
A dull muffled thud with a short metallic-leather scrape, clearly duller
and quieter than a clean hit. Instant attack, dry, close-miked, fast decay.
Mono. No reverb, no music.
Exactly one impact only.
```
Duration **0.5s** · เจน **2 รอบ**

### 3.5 ลงพื้น — `land_soft` ×2 + `land_hard` ×2

อีเวนต์ `land` ส่งค่า `hard` มาด้วย (ตกเร็วกว่า 12) เลยต้องมีสองแบบจริง ๆ

```
A single pair of boots landing on packed dirt, close and dry.
A light scuffing thud with a faint gravel crunch.
Instant, short, no fade-in.
Mono. No reverb, no music.
One landing only — not a sequence of footsteps.
```
Duration **0.5s** · เจน **2 รอบ**

```
A single heavy landing — a body dropping from height onto packed dirt.
A deep thud with dirt and small stones scattering, plus a short low rumble.
Instant attack, dry, close-miked, decaying in under half a second.
Mono. No reverb, no music.
Exactly one landing only.
```
Duration **0.8s** · เจน **2 รอบ**

---

## 4 · ชุดสอง — สกิลตัวละคร

### 4.1 ปืนไรเฟิล — `gun_rifle` ×2 (ท่าปกติของ Alecto ตอนถือปืน)

```
A single rifle shot, dry and close.
A sharp crack with a tight low-mid body and a very short tail,
followed immediately by a light metallic bolt click.
Instant attack. No reverb, no echo, no distant gunfire, no music.
Mono. Exactly one shot only.
```
Duration **0.7s** · เจน **2 รอบ**

> `no echo` สำคัญมาก ขอเสียงปืนเฉย ๆ มันจะให้เสียงสะท้อนหุบเขามาด้วยเกือบทุกครั้ง
> ซึ่งยาว 3 วินาที และยิงรัวไม่ได้เลย

### 4.2 ปืนสั้น — `gun_pistol` ×3 (สกิล 2 ยิงรัว)

```
A single revolver shot, dry and close-miked.
A punchy crack, brighter and snappier than a rifle, with a very short tail.
Instant attack. No reverb, no echo, no music.
Mono. Exactly one shot only.
```
Duration **0.5s** · เจน **3 รอบ** — อันนี้ยิงติด ๆ กัน ต้องมีหลายเวอร์ชันจริง ๆ

### 4.3 ระเบิด — `explosion` ×2 (กล่องของ Momus · บ่อไฟของ Alecto)

```
A single compact explosion — a small bomb detonating a few metres away.
A sharp cracking transient, deep punchy low-end, and a short debris scatter.
Dry and close, fully decayed within one second.
No long reverb tail, no distant rumble, no music.
Mono. Exactly one explosion only.
```
Duration **1.2s** · เจน **2 รอบ**

### 4.4 ไฟติด — `fire_ignite` ×1

```
A single burst of fire igniting — spilled liquid fuel catching and flaring up.
A fast airy whoosh with a crackling front edge.
Dry and close, decaying in about one second.
No music, no reverb tail.
Mono. One ignition only.
```
Duration **1.2s**

### 4.5 ไฟลุก — `fire_loop` ×1 **(อันเดียวในไฟล์นี้ที่ต้องวนได้)**

```
A steady close-up fire burning on the ground, even and seamless.
Continuous crackling flame with a low airy roar underneath.
No bursts, no pops that stand out, no build-up, no fade-in, no fade-out.
Dry and close. Mono. No music.
```
Duration **4s**

> ขอ `no fade-in, no fade-out` ไว้ตรงนี้เพราะต้องวน — เหตุผลเดียวกับที่เขียนไว้ใน
> `docs/AUDIO.md` เรื่องเพลง ถ้าหัวท้ายเงียบ วนแล้วจะได้ยินเสียงหรี่เป็นจังหวะ

### 4.6 แส้ — `whip` ×2 (Alecto ตอนถือแส้)

```
A single leather whip crack, dry and close.
A fast airy swish leading straight into a sharp snapping crack at the end.
Instant, very short tail.
Mono. No reverb, no music.
Exactly one crack only.
```
Duration **0.6s** · เจน **2 รอบ**

### 4.7 หายตัว / ปรากฏ — `vanish` ×1 + `appear` ×1

```
A short magical vanish — a body dissolving into thin air.
A quick inward airy suction with a soft dark shimmer, pitch falling downward.
Dry and close, under half a second.
No music, no melody, no long reverb tail.
Mono.
```
```
A short magical reappear — a body snapping back into existence.
A quick outward air pop with a bright shimmer, pitch rising upward.
Dry and close, under half a second.
No music, no melody, no reverb tail.
Mono.
```
Duration **0.5s** ทั้งคู่

> สองอันนี้ต้องเป็น**คู่ที่ฟังออกว่าคู่กัน** ลงกับขึ้น เจนพร้อมกันทีเดียวแล้วฟังต่อกันเลย

### 4.8 หมอกฝุ่น — `dust` ×1 (สกิล 3 ของ Alecto)

```
A large cloud of dry dust bursting outward along the ground.
A soft airy whoomph with fine grit hissing, no hard transient at the front.
Dry and close, decaying over about one second.
No music, no reverb tail.
Mono.
```
Duration **1.2s**

### 4.9 กล่องผี — `box_spawn` ×1 (Jack-in-the-Box ของ Momus)

```
A small wooden toy box being set down and its spring lid winding tight.
A light wooden knock followed by a short metallic spring ratchet, playful.
Dry and close, under one second.
No music, no melody.
Mono.
```
Duration **0.8s**

> ตั้งใจให้**น่ารัก** ตัดกับระเบิดที่ตามมา — กล่องของเล่นที่ระเบิดใส่เจ้าของตัวเอง
> คือทั้งคาแรกเตอร์ของ Momus ถ้าเสียงวางกล่องน่ากลัวตั้งแต่แรก มุกก็หายไปครึ่งนึง

### 4.10 สลับอาวุธ — `swap` ×1 (สกิล 1 ของ Alecto)

```
A weapon being swapped in the hands — a fast leather-and-metal shuffle
ending in one solid mechanical clack.
Dry, close, crisp, under half a second.
No music.
Mono.
```
Duration **0.5s**

---

## 5 · ชุดสาม — ของประดับ เอาไว้ทีหลังก็ได้

เจนรอบละ 1 อันพอ ทุกอัน duration **0.5–1s** และต่อท้ายด้วยบรรทัดเดิม
`Dry and close. Mono. No reverb, no music. Exactly one … only.`

| ไฟล์ | prompt |
|---|---|
| `wall` | `A body slamming into a hard wooden wall — a deep hollow wooden boom with a short creak. Instant attack, fast decay.` |
| `tech` | `A fast body roll across packed dirt — a short fabric-and-grit scuff, low and quick, with no impact.` |
| `djump` | `A short airy burst of wind under the feet, a quick upward whoosh with no impact, soft.` |
| `armor` | `A hit landing on a braced armoured body that does not flinch — a dull heavy thud absorbed into padding, muffled, almost no high end.` |
| `ult` | `A short rising power surge — a fast upward whoosh with a bright shimmering tail and a solid click at the peak.` |
| `ko` | `A single decisive knockout blow — a massive low thump with a bright crack on top and a short deep tail.` (duration 1.5s) |
| `ui_click` | `A crisp UI button click — one short tick with a soft woody body, very short.` |
| `ui_confirm` | `A short UI confirm — a warm ascending two-tone chime, soft and quick, no melody beyond two notes.` |

---

## 6 · ได้ไฟล์มาแล้วผมทำอะไรต่อ

**โยนไฟล์ mp3 ทั้งหมดมาได้เลย ไม่ต้องตั้งชื่อ** บอกแค่ว่าอันไหนคืออะไร

จากนั้นผมทำ `tools/build_sfx.py` ให้ทำสี่อย่าง:

1. **ตัดหางทิ้ง** หาจุดที่เสียงเงียบลงต่ำกว่า −45 dB แล้วตัด
   ไฟล์ 0.5 วินาทีจาก ElevenLabs จะเหลือจริง ~0.15 วิ ซึ่งคือความยาวที่เกมต่อสู้ต้องการ
2. **ปรับระดับให้เท่ากัน** เสียงที่เจนมาคนละรอบดังไม่เท่ากันเสมอ
   ถ้าไม่ปรับ แย็บสี่เวอร์ชันจะดังไม่เท่ากันและฟังเหมือนบั๊ก
3. **บีบเป็น mono 64 kbps สองฟอร์แมต** `ogg` + `m4a` — ไฟล์สั้นขนาดนี้รวมกันไม่ถึง 300 KB
4. **โหลดพร้อมฉาก ไม่ต้องแยกเหมือนเพลง** ของเล็กพอที่จะไม่ทำให้รอจอโหลด

แล้วต่อเข้ากับอีเวนต์ที่มีอยู่แล้วในโค้ด — `hit` (ดูค่า `hs` เลือกเบา/หนัก) ·
`block` · `land` (ดูค่า `hard`) · `move` (ดู `id` เลือกหวดลม/ยิงปืน/แส้) ·
`blast` `firepool` `burn` `vanish` `appear` `dust` `box` `swap` `wall` `tech` `djump` `armor` `ult` `ko`

**สองอย่างที่จะทำเพิ่มโดยไม่ต้องเจนอะไร:**

- **สุ่มเสียงสูงต่ำ ±6% ทุกครั้งที่เล่น** ของฟรี — แย็บ 4 เวอร์ชันจะฟังเหมือน 12
  หูจับความซ้ำจากระดับเสียงก่อนจับจากตัวเสียงเสมอ
- **ลดเพลงลง** ตอนนี้ตั้งไว้ `0.32` ซึ่งตั้งตอนที่ยังไม่มีเสียงเอฟเฟค
  พอใส่แล้วน่าจะต้องลงไปราว `0.22–0.26` — **เพลงที่กลบเสียงหมัดคือเพลงที่ดังเกินไป**
  ตรงนี้ต้องฟังจริงถึงจะรู้ ผมปรับให้ตอนไฟล์มาครบ

---

## 7 · เรื่องสิทธิ์

ไฟล์ที่เจนจาก ElevenLabs บนแพ็กเสียเงิน ใช้เชิงพาณิชย์ได้และไม่ต้องให้เครดิต
**แต่แพ็กฟรีให้สิทธิ์แค่ใช้ส่วนตัว และต้องให้เครดิต** — เกมนี้เผยแพร่สาธารณะบน GitHub Pages
เงื่อนไขจึงต่างกัน เช็คแพ็กที่ใช้อยู่ก่อน ถ้าเป็นแพ็กฟรีบอกมา ผมเติมบรรทัดเครดิตให้
ที่เดียวกับเครดิตเพลงใน `index.html` ได้เลย
