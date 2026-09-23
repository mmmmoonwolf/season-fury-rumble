// ทดสอบการแยกท่าจาก "ภาพเดียวหลายท่า" (tools/sheet_poses.py)
// รัน: node tools/tests/sheet_order.test.mjs   (จากโฟลเดอร์ game)
//
// ทำไมต้องมี: ลำดับท่าที่ฟังก์ชันนี้คืนมา คือความหมายของเลขท่าใน SEQ/CLIP_REF ของ build
// ถ้าลำดับเพี้ยน เลขท่าจะชี้ผิดตัวทั้งหมด "โดยไม่มี error ให้เห็น" — เห็นแค่ท่าในเกมเล่นแล้วมั่ว
// ของเดิมเรียงตามแกน x อย่างเดียว ซึ่งถูกเฉพาะภาพแถวเดียว พอเป็นภาพสองแถว (อาร์ตท่ากัน
// ที่ส่งมาเป็นแบบนั้นทั้งสองไฟล์) จะสลับแถวบน-ล่างสับกันเป็น 1, 6, 2, 7, 3, 8, ...
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const toolsDir = fileURLToPath(new URL("..", import.meta.url));

// สร้างภาพทดสอบเองในหน่วยความจำ ไม่ต้องพึ่งไฟล์อาร์ตจริง (ซึ่งอยู่นอก repo ตาม .gitignore)
// แต่ละท่าเป็นสี่เหลี่ยมทึบที่มี "เลขลำดับที่ควรได้" เข้ารหัสเป็นความสูงต่างกันเล็กน้อย
const py = `
import sys, numpy as np
sys.path.insert(0, ${JSON.stringify(toolsDir)})
from PIL import Image
from sheet_poses import sheet_poses
import tempfile, os

def make(rows, cols, path):
    H, W = 260 * rows + 120, 200 * cols + 120
    a = np.full((H, W, 3), 246, np.uint8)
    n = 0
    for r in range(rows):
        for c in range(cols):
            n += 1
            y0 = 60 + r * 260
            x0 = 60 + c * 200
            # ความสูงต่างกันทีละ 3 px = ลายเซ็นบอกว่าเป็นท่าที่เท่าไรในลำดับการอ่าน
            a[y0:y0 + 150 + n * 3, x0:x0 + 120] = 20
    Image.fromarray(a).save(path)
    return n

# พื้นหลัง "ลายตารางโปร่งใส" ที่ถูก flatten เป็นพิกเซลจริง (เครื่องมือเซฟ PNG โปร่งใสเป็น JPG)
# ต้องแยกท่าได้เหมือนพื้นขาวเป๊ะ ไม่งั้นลายตารางถูกนับเป็นตัวละคร ตัดออกมาได้กรอบเทาติดมา
def make_checker(rows, cols, path):
    H, W = 260 * rows + 120, 200 * cols + 120
    yy, xx = np.mgrid[0:H, 0:W]
    a = np.where((((yy // 40) + (xx // 40)) % 2)[..., None], 86, 131).astype(np.uint8)
    a = np.repeat(a, 3, axis=2)
    n = 0
    for r in range(rows):
        for c in range(cols):
            n += 1
            y0, x0 = 60 + r * 260, 60 + c * 200
            a[y0:y0 + 150 + n * 3, x0:x0 + 120] = 20
    Image.fromarray(a).save(path)
    return n

with tempfile.TemporaryDirectory() as d:
    for rows, cols in [(1, 4), (2, 3)]:
        p = os.path.join(d, "c%d%d.png" % (rows, cols))
        total = make_checker(rows, cols, p)
        ps = sheet_poses(p, min_area=1000)
        heights = [b[3] - b[1] + 1 for _, b, _ in ps]
        expect = [150 + (i + 1) * 3 for i in range(total)]
        print("CHECKER|%dx%d|%d|%d" % (rows, cols, len(ps), total))
        print("CHKORDER|%dx%d|%s|%s" % (rows, cols, heights == expect, heights))

fails = []
for rows, cols in [(1, 5), (2, 5), (2, 6), (3, 4)]:
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "s.png")
        total = make(rows, cols, p)
        ps = sheet_poses(p, min_area=1000)
        got_n = len(ps)
        heights = [b[3] - b[1] + 1 for _, b, _ in ps]
        expect = [150 + (i + 1) * 3 for i in range(total)]
        print("COUNT|%dx%d|%d|%d" % (rows, cols, got_n, total))
        print("ORDER|%dx%d|%s|%s" % (rows, cols, heights == expect, heights))
`;
const out = execFileSync("python3", ["-c", py], { encoding: "utf8" });

for (const line of out.trim().split("\n")) {
  const [kind, shape, a, b] = line.split("|");
  if (kind === "COUNT") ok(a === b, `ภาพ ${shape} ท่า: แยกได้ครบทุกท่า (${a} จาก ${b})`);
  if (kind === "ORDER") ok(a === "True", `ภาพ ${shape} ท่า: เรียงแบบที่คนอ่าน บนลงล่าง ซ้ายไปขวา`);
  if (kind === "CHECKER") ok(a === b, `พื้นลายตารางโปร่งใส ${shape}: แยกท่าได้ครบ (${a} จาก ${b})`);
  if (kind === "CHKORDER") ok(a === "True", `พื้นลายตารางโปร่งใส ${shape}: ได้ลำดับถูกเหมือนพื้นขาว`);
}

// ภาพแถวเดียวต้องได้ลำดับเดิมเป๊ะ — ของที่ build อยู่แล้ว (jump_sheet/down_sheet) เป็นแถวเดียว
// การแก้ลำดับต้องไม่ไปขยับ atlas ที่ใช้งานอยู่
ok(out.includes("ORDER|1x5|True"), "ภาพแถวเดียวยังได้ลำดับเดิม (ของที่ build ไว้แล้วไม่กระทบ)");

console.log("\nsheet_poses: reading order (top-to-bottom, left-to-right) on any row count");
