# vendor/

สำเนาไลบรารีภายนอกที่เกมใช้ เก็บไว้ในรีโปตรง ๆ ไม่ดึงจาก CDN

**ทำไมไม่ใช้ CDN:** เดิม index.html ดึง phaser/peerjs จาก cdnjs.cloudflare.com
ถ้าโหลดไม่สำเร็จ (เน็ตองค์กร/โรงเรียน/ร้านเน็ตบล็อก, CDN ล่ม, เน็ตมือถือหลุดช่วงนั้นพอดี)
`Phaser` จะไม่ถูกประกาศ แล้ว `<script type="module">` ทั้งก้อนจะ throw ตั้งแต่บรรทัดแรก
ที่ import Player.js (`class Player extends Phaser.Physics.Arcade.Sprite`)
ผลคือ **ปุ่มในล็อบบี้ไม่ถูกผูก event เลยสักปุ่ม — กดแล้วไม่มีอะไรเกิดขึ้น หน้าค้างอยู่ที่เดิม
และไม่มี error ให้เห็นบนจอ** (error ของ module script ไม่ขึ้นที่ไหนนอกจาก devtools)

ไฟล์อยู่ในรีโปแล้วก็มาจาก origin เดียวกับตัวเกม = โหลดสำเร็จเสมอถ้าหน้าเว็บเองโหลดขึ้น
และเร็วกว่าด้วยเพราะไม่ต้องต่อ TLS ไปโฮสต์อื่น

| ไฟล์ | เวอร์ชัน | ที่มา |
|---|---|---|
| `phaser-3.70.0.min.js` | 3.70.0 | npm `phaser@3.70.0` → `dist/phaser.min.js` |
| `peerjs-1.5.5.min.js` | 1.5.5 | npm `peerjs@1.5.5` → `dist/peerjs.min.js` |

อัปเกรดเวอร์ชัน: `npm pack phaser@<ver>` แล้วแตกไฟล์ `dist/phaser.min.js` มาวางทับ
เปลี่ยนชื่อไฟล์ให้มีเลขเวอร์ชัน แล้วแก้ `<script src>` ใน index.html
(เทสต์ vendor.test.mjs คุมไว้ว่าไฟล์ที่ index.html อ้างต้องมีอยู่จริงและต้องไม่กลับไปใช้ CDN)
