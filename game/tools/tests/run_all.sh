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
[ "$failed" = "0" ] && [ "$crashed" = "0" ]
