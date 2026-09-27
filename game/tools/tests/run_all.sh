#!/bin/sh
# รันเทสต์ทุกไฟล์ใน tools/tests แล้วสรุปผล
# รัน (จากโฟลเดอร์ game):  sh tools/tests/run_all.sh
#
# ทำไมต้องเช็ค exit code ด้วย ไม่ใช่นับแค่บรรทัด PASS/FAIL:
# เทสต์ที่ throw กลางคัน (เช่นโค้ดที่มันเรียกพัง) จะไม่พิมพ์ FAIL สักบรรทัด
# ถ้านับแต่บรรทัด จะเห็นเป็น "ผ่านหมด" ทั้งที่เทสต์ไม่ได้รันจนจบ — เคยหลงมาแล้วจริง
total=0; failed=0; crashed=0
for t in tools/tests/*.test.mjs; do
  out=$(node "$t" 2>&1); code=$?
  p=$(printf '%s\n' "$out" | grep -c '^PASS')
  f=$(printf '%s\n' "$out" | grep -c '^FAIL')
  total=$((total + p)); failed=$((failed + f))
  if [ "$f" != "0" ]; then
    echo "FAIL ใน $t:"; printf '%s\n' "$out" | grep '^FAIL'
  fi
  if [ "$code" != "0" ]; then
    crashed=$((crashed + 1))
    echo "CRASH $t (exit $code) — เทสต์ไม่ได้รันจนจบ:"
    printf '%s\n' "$out" | tail -5
  fi
done
echo "PASS $total  FAIL $failed  CRASH $crashed"

# ── ด่านสุดท้าย: ต้องมีเทสต์รันจริง ไม่ใช่ "ไม่มีอะไรพัง" เพราะไม่มีอะไรรัน ──
#
# รันจากโฟลเดอร์ผิด (เช่นจากรากรีโป) แล้ว glob ไม่แมตช์ ลูปไม่เดินเลยสักรอบ
# ผลที่ได้คือ "PASS 0  FAIL 0  CRASH 0" แล้ว exit 0 = เขียวทั้งที่ไม่ได้ตรวจอะไร
# บน CI อาการนี้อ่านเหมือนผ่านเป๊ะ ๆ ซึ่งแย่กว่าแดง เพราะไม่มีใครไปดู
#
# เพดานขั้นต่ำตั้งต่ำกว่าจำนวนจริงเยอะ (ตอนเพิ่มบรรทัดนี้มี 1540 ข้อ)
# ไม่ต้องขยับตามทุกครั้งที่เพิ่มเทสต์ แต่ยังจับเคส "ไม่ได้รันอะไรเลย" ได้
MIN_TESTS=800
if [ "$total" -lt "$MIN_TESTS" ]; then
  echo "ไม่ผ่าน: รันได้แค่ $total ข้อ (ต้องอย่างน้อย $MIN_TESTS) — รันจากโฟลเดอร์ game ใช่ไหม?"
  exit 1
fi

[ "$failed" = "0" ] && [ "$crashed" = "0" ]
