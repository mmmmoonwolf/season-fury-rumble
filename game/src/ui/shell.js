/**
 * สะพานระหว่างฉากในเกมกับหน้าเว็บที่ห่อมันอยู่
 *
 * ฉาก (`ScrambleScene`) ต้องสั่ง "ออกไปหน้าแรก" ได้ แต่หน้าแรกเป็น DOM ใน `index.html`
 * ซึ่งเป็น `<script type="module">` ที่ฉากจะ import กลับไม่ได้ (มันไม่ใช่ไฟล์โมดูล)
 * และการเรียกผ่าน `window.__something` แปลว่าไม่มีใครรู้ว่าสัญญาคืออะไรจนไปอ่านโค้ดทั้งสองฝั่ง
 *
 * ไฟล์นี้จึงเป็นที่เดียวที่ทั้งสองฝั่ง import ได้ — ฝั่งหน้าเว็บลงทะเบียนว่าจะทำอะไร
 * ฝั่งฉากแค่บอกว่า "ขอออก" โดยไม่ต้องรู้ว่าปลายทางทำอะไรเลย
 */

let quitHandler = null;

/** หน้าเว็บลงทะเบียนวิธีพาผู้เล่นกลับหน้าแรก — เรียกครั้งเดียวตอนตั้งหน้า */
export function onQuitToLobby(fn) {
  quitHandler = typeof fn === 'function' ? fn : null;
}

/**
 * ฉากขอออกไปหน้าแรก
 *
 * คืน false ถ้าไม่มีใครลงทะเบียนไว้ ผู้เรียกจึงรู้ได้ว่าต้องไม่ปิดเมนูทิ้ง
 * ไม่งั้นผู้เล่นกดปุ่มแล้วเมนูหาย แต่ยังอยู่ในเกม ซึ่งดูเหมือนปุ่มเสีย
 */
export function quitToLobby() {
  if (!quitHandler) return false;
  quitHandler();
  return true;
}

/**
 * ก๊อปข้อความลงคลิปบอร์ด — คืนว่าเกิดอะไรขึ้นจริง ไม่ใช่แค่ทำหรือไม่ทำ
 *
 * `navigator.clipboard` ต้องเป็น https และผู้ใช้อาจปฏิเสธสิทธิ์ ซึ่งเกิดจริงบ่อย
 * พังแล้วบอกว่า "ก๊อปไม่ได้" เฉย ๆ ไม่ช่วยอะไร — เลือกข้อความให้เลย
 * ผู้เล่นกดก๊อปจากเมนูของเครื่องเองได้ทันที ซึ่งเป็นท่าที่เขาทำอยู่แล้วก่อนมีปุ่มนี้
 *
 * อยู่ในโมดูลไม่ใช่ใน index.html เพราะสามทางออกของมัน (ก๊อปได้ / เลือกให้ / ทำอะไรไม่ได้)
 * ต้องเทสต์ได้จริง ไม่ใช่เทสต์ด้วยการอ่านว่ามีคำว่า selectNodeContents อยู่ในไฟล์
 *
 * @param text ข้อความที่จะก๊อป
 * @param el อิลิเมนต์ที่จะเลือกให้ถ้าก๊อปไม่ได้ (ไม่ส่งมาก็ได้)
 * @returns 'copied' | 'selected' | 'failed'
 */
export async function copyText(text, el) {
  if (!text) return 'failed';
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) { /* ไม่ใช่ https หรือถูกปฏิเสธสิทธิ์ */ }
  try {
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    return 'selected';
  } catch (e) {
    return 'failed';   // เลือกไม่ได้ก็ยังอ่านรหัสออกเสียงให้เพื่อนได้
  }
}

/** ให้เทสต์ล้างค่าระหว่างข้อได้ */
export function resetShell() {
  quitHandler = null;
}
