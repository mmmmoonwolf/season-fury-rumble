/**
 * แมพแนวระนาบแบบเกมต่อสู้ — พื้นเรียบแผ่นเดียวเต็มความกว้าง ไม่มีแพลตฟอร์มลอย ไม่มีที่ให้ตก
 *
 * ต่างจากแมพชุดเก่า (rooftop/blockout) ที่ collision ผูกกับพิกเซลของภาพเป็นจุด ๆ
 * แบบนี้ต้องการแค่ตัวเลขเดียวคือ "เส้นยืน" (floorY) ในพิกัดของภาพต้นฉบับ
 *
 * ⚠️ ใช้ภาพที่ความละเอียดต้นฉบับ 1:1 — world มีขนาดเท่าภาพเป๊ะ ไม่ย่อไม่ขยาย
 * ภาพจึงคมที่สุดเท่าที่ต้นฉบับให้ได้ และไม่ต้องคำนวณ scale ระหว่างภาพกับ collision เลย
 * (แมพ sakura เดิมย่อภาพ 512px ขึ้นเป็น 1250px ซึ่งเป็นเหตุผลที่มันดูฟุ้ง)
 */
function flatArena({ id, imageKey, width, height, floorY, groundThickness = null, characterTint = 0xffffff }) {
  const thickness = groundThickness ?? height - floorY;
  return {
    id,
    /**
     * สีที่คูณทับตัวละครในแมพนี้ (multiply tint)
     * แมพวาดมาแบบมีบรรยากาศ/แสงสีของตัวเอง แต่ตัวละครวาดมาบนพื้นขาวแสงกลาง ๆ
     * ถ้าไม่ปรับ ตัวละครจะดู "สว่างลอย" เหมือนสติกเกอร์แปะบนภาพ โดยเฉพาะชุดขาวของ Dear
     * ค่านี้แก้ได้เฉพาะโทนรวม ไม่ได้แก้เรื่องลายเส้น (ดู art_prompts_style_match.md)
     */
    characterTint,
    worldWidth: width,
    worldHeight: height,

    // world = ขนาดภาพ 1:1 → artReference ใช้ค่าเดียวกัน scale ที่ scene คำนวณได้จึงเป็น 1 พอดี
    artReference: { width, height, roofY: floorY },

    platforms: [{ x: 0, width, y: floorY, height: thickness, kind: "ground" }],

    // จุดเกิด: กระจายเป็นแนวระนาบเหมือนเกมต่อสู้ — ห่างกันพอให้ไม่โดนตบทันทีที่เกิด
    spawnPoints: [
      { x: width * 0.22, y: floorY - 40 },
      { x: width * 0.78, y: floorY - 40 },
      { x: width * 0.38, y: floorY - 40 },
      { x: width * 0.62, y: floorY - 40 },
    ],

    seasons: ["spring", "summer", "autumn", "winter", "rain"],
    // ภาพเดียวทุกฤดู — ปุ่ม 1-5 ยังเปลี่ยน particle กับ physics ได้ตามปกติ
    backgrounds: Object.fromEntries(
      ["spring", "summer", "autumn", "winter", "rain"].map((s) => [s, imageKey])
    ),
    backgroundExt: "png",
  };
}

/**
 * เส้นยืน (floorY) ของแต่ละแมพวัดจากภาพต้นฉบับด้วยตา — เอาไว้ตรงกลางพื้นที่เดินได้
 * ไม่ใช่ที่ขอบบนสุดของพื้น เพราะตัวละครจะดูเหมือนยืนติดรั้ว/ขอบ แทนที่จะยืนกลางลาน
 * ปรับตัวเลขนี้ตัวเดียวถ้าเล่นแล้วรู้สึกว่าเท้าลอยหรือจมเข้าไปในพื้น
 */
export const CITY_NIGHT = flatArena({
  id: "city-night",
  imageKey: "city_night",
  width: 2048,
  height: 768,
  floorY: 690,
  characterTint: 0x9a8fb0, // กลางคืน ไฟนีออนแดง-ม่วง: กดสว่างลง อมม่วง
});

export const CITY_DUSK = flatArena({
  id: "city-dusk",
  imageKey: "city_dusk",
  width: 2079,
  height: 756,
  floorY: 680,
  characterTint: 0xc9bcd2, // พลบค่ำ สว่างกว่า: กดลงนิดเดียว อมชมพู-ม่วง
});

export const RIVER_SUNSET = flatArena({
  id: "river-sunset",
  imageKey: "river_sunset",
  width: 1983,
  height: 793,
  floorY: 660,
  characterTint: 0xa8919b, // ริมน้ำตอนพระอาทิตย์ตก: มืดและอมแดง
});

// ── แมพชุดใหม่ (ธีมไทย/ญี่ปุ่น) ──
// ⚠️ floorY เป็นค่าประมาณจากการวัด variance ของแต่ละแถวพิกเซล (แถวที่สีนิ่ง = พื้นเรียบ)
//    ยังไม่ได้จูนจากการยืนจริงในเกม ถ้าตัวละครลอยหรือจมให้ขยับเลขนี้ทีละ 10-20

export const WAT_PHRA_KAEW = flatArena({
  id: "wat-phra-kaew",
  imageKey: "wat_phra_kaew",
  width: 2078,
  height: 757,
  floorY: 620, // ลานหินอ่อนหน้าวัด
  characterTint: 0xf2ece0, // กลางแจ้งแดดจัด: แทบไม่กดสี อมเหลืองอุ่นนิดเดียว
});

export const BANGKOK_RIVER = flatArena({
  id: "bangkok-river",
  imageKey: "bangkok_river",
  width: 2079,
  height: 756,
  floorY: 640, // ถนนหน้าร้านก๋วยเตี๋ยว
  characterTint: 0xeee8e0, // กลางวันฟ้าเปิด: โทนกลาง ๆ
});

export const TOKYO_STREET = flatArena({
  id: "tokyo-street",
  imageKey: "tokyo_street",
  width: 2079,
  height: 756,
  floorY: 620, // ถนนใต้รางรถไฟฟ้า
  characterTint: 0xeae6ee, // ซากุระ/ฟ้าใส: อมฟ้า-ชมพูอ่อน
});

// ── แมพชุดใหม่ (สนามยักษ์/ธีมองค์กร Peterson) ──
// floorY วัดแบบเดียวกับชุดบน (variance ต่อแถวพิกเซล) — ลานหินอ่อน/หินสะท้อนแสงทุกภาพ ดูจากเท้าคนแถวหน้าฉากเป็นหลัก

export const HERO_PLAZA = flatArena({
  id: "hero-plaza",
  imageKey: "hero_plaza",
  width: 2078,
  height: 757,
  floorY: 620, // ลานหินอ่อนสะท้อนแสงหน้ารูปปั้นยักษ์
  characterTint: 0xf0f0f7, // เมืองอนาคตสีขาว แดดจัดฟ้าใส: แทบไม่กดสี อมฟ้าจาง ๆ
});

export const GORILLA_TEMPLE = flatArena({
  id: "gorilla-temple",
  imageKey: "gorilla_temple",
  width: 2079,
  height: 756,
  floorY: 630, // ลานหินทรายหน้าวิหาร
  characterTint: 0xf0e2bd, // แดดทะเลทราย หินทรายสีทอง: กดลงนิดอมเหลืองทอง
});

export const PETERSON_BANGKOK = flatArena({
  id: "peterson-bangkok",
  imageKey: "peterson_bangkok",
  width: 2078,
  height: 757,
  floorY: 630, // ลานหน้ารูปปั้นทองสัมฤทธิ์
  characterTint: 0xe8d7ae, // เย็นแดดร่ม โทนทอง: กดลงอมเหลืองทองอุ่น
});

export const PETERSON_STAGE = flatArena({
  id: "peterson-stage",
  imageKey: "peterson_stage",
  width: 2078,
  height: 757,
  floorY: 640, // พื้นเวทีลายโลโก้ P
  characterTint: 0xf0e6e2, // เวทีกลางแจ้ง ไฟแดงเสริม: โทนกลางอมแดงจาง ๆ
});

export const PETERSON_FLAGSHIP = flatArena({
  id: "peterson-flagship",
  imageKey: "peterson_flagship",
  width: 1983,
  height: 793,
  floorY: 665, // ดาดฟ้าเรือรบเปียกสะท้อนแสง
  characterTint: 0x8f7c88, // โพล้เพล้ แสงส้ม-ชมพูอมม่วง เข้มกว่าชุดพระอาทิตย์ตกอื่น
});
