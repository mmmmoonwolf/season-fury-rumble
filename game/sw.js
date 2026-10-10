/**
 * Service worker — ติดไอคอนหน้าจอแล้วเปิดเล่นได้โดยไม่ต้องมีเน็ต
 *
 * **ของที่พังแล้วพังถาวรที่สุดในเว็บคือ service worker ที่เขียนผิด** — มันอยู่ระหว่างผู้ใช้กับเซิร์ฟเวอร์
 * เสิร์ฟของเก่าค้างไว้ได้ตลอดกาล และผู้ใช้แก้เองไม่ได้นอกจากล้างข้อมูลเว็บทิ้ง
 * ทุกข้อด้านล่างคือการกันเคสนั้น ไม่ใช่การกันเคสหายาก
 *
 * แบ่งของเป็นสองชั้นเพราะขนาดต่างกันสิบเท่า:
 *
 * | ชั้น | อะไรบ้าง | กลยุทธ์ | เหตุผล |
 * |---|---|---|---|
 * | เปลือก | html · js · vendor · ไอคอน (~2 MB) | **มีเน็ตเอาของใหม่เสมอ** ไม่มีเน็ตค่อยใช้ของในแคช | ดูด้านล่าง |
 * | ของหนัก | `assets/` (~38 MB) | มีในแคชใช้เลย ไม่มีค่อยโหลดแล้วเก็บ | ใหญ่เกินจะโหลดล่วงหน้าทั้งหมด · เล่นอะไรไปแล้วอันนั้นเล่นออฟไลน์ได้ |
 *
 * **เปลือกเป็น network-first ไม่ใช่ cache-first และไม่ใช่ stale-while-revalidate**
 *
 * เกมนี้ deploy แล้วเทสบนมือถือจริงทุกครั้ง ถ้าเสิร์ฟของเก่าก่อน คนเทสจะเปิดมาเจอบิลด์เมื่อวาน
 * แล้วรายงานบั๊กที่แก้ไปแล้ว — เสียเวลาสองฝั่งและไล่ไม่เจอว่าทำไมแก้แล้วยังเป็น
 * ข้อเสียคือไม่ได้ความเร็วตอนเปิด แต่โหลดจาก GitHub Pages ก็เร็วพออยู่แล้ว
 * สิ่งที่ PWA ให้จริงในเกมนี้คือ **เปิดเล่นได้ตอนไม่มีเน็ต** ไม่ใช่เปิดเร็วขึ้น
 *
 * ของหนักเป็น cache-first ได้เพราะไฟล์อาร์ต/เสียงเปลี่ยนน้อยมาก และถ้าเปลี่ยนจริง
 * เลขเวอร์ชันข้างล่างจะลบแคชเก่าทิ้งให้เอง
 */
const VERSION = 'sfr-v21';  // ← EYE: ควันขาวทึบ (เงาเทาหลัง + ขาวหน้า)
const SHELL = VERSION + '-shell';
const ASSETS = VERSION + '-assets';

/** เปิดเกมได้โดยไม่ต้องมีเน็ตต้องมีเท่านี้เป็นอย่างน้อย */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/phaser-3.70.0.min.js',
  './vendor/peerjs-1.5.5.min.js',
  './src/config/viewport.config.js',
  './src/net/session.js',
  './src/ui/uisfx.js',
  './src/ui/shell.js',
  './src/modes/scramble/core.js',
  './src/modes/scramble/netplay.js',
  './src/modes/scramble/ScrambleScene.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/ui/soon_01.png',   // เงาตัวที่ยังไม่ปล่อย อยู่ในแผงเลือกตัวที่เปิดออฟไลน์ก็เห็น
  './assets/ui/soon_02.png',
  // ฟอนต์ต้องอยู่ในนี้ ไม่งั้นเปิดออฟไลน์แล้วตัวหนังสือเปลี่ยนหน้าตาไปเป็นฟอนต์เครื่อง
  // ซึ่งดูเหมือนหน้าพัง มากกว่าดูเหมือน "ไม่มีเน็ต"
  './vendor/fonts/chakra-petch-400-latin.woff2',
  './vendor/fonts/chakra-petch-400-thai.woff2',
  './vendor/fonts/chakra-petch-600-latin.woff2',
  './vendor/fonts/chakra-petch-600-thai.woff2',
  './vendor/fonts/chakra-petch-700-latin.woff2',
  './vendor/fonts/chakra-petch-700-thai.woff2',
];

self.addEventListener('install', (e) => {
  // ไฟล์เดียวโหลดไม่ขึ้นต้องไม่ทำให้ติดตั้งล้มทั้งชุด — addAll ล้มทั้งก้อนถ้ามีอันไหนพลาด
  // ล้มแล้วผู้ใช้จะไม่มี service worker เลย ซึ่งแย่กว่ามีแบบที่ขาดไปหนึ่งไฟล์
  e.waitUntil(caches.open(SHELL).then((c) =>
    Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // ลบแคชของเวอร์ชันก่อน ไม่งั้นพื้นที่บวมขึ้นทุกครั้งที่ deploy
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/** เก็บเฉพาะคำตอบที่ใช้ได้จริง — 404 หรือ opaque เก็บไว้แล้วจะเสิร์ฟของเสียซ้ำ ๆ ตลอดไป */
function keepable(res) {
  return res && res.ok && res.type === 'basic';
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // ห้ามแตะอย่างอื่นนอกจาก GET ของโดเมนตัวเอง
  // สัญญาณต่อห้องของ PeerJS เป็น WebSocket ข้ามโดเมน เข้ามายุ่งเมื่อไหร่ต่อห้องพังทันที
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isAsset = url.pathname.includes('/assets/');
  e.respondWith(isAsset ? assetFirst(req) : shellFresh(req));
});

/** ของหนัก: มีในแคชใช้เลย ไม่มีค่อยโหลดแล้วเก็บไว้ */
async function assetFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (keepable(res)) (await caches.open(ASSETS)).put(req, res.clone());
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

/** เปลือก: มีเน็ตเอาของใหม่เสมอ · ไม่มีเน็ตค่อยใช้ของในแคช
 *
 *  ลำดับนี้สำคัญ — สลับเมื่อไหร่ คนที่เทสหลัง deploy จะเจอบิลด์เก่าโดยไม่รู้ตัว
 */
async function shellFresh(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (keepable(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // ออฟไลน์ — ของในแคช ถ้าไม่มีหน้านี้ก็ตกกลับไปหน้าแรกที่เก็บไว้ตอนติดตั้ง
    return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
  }
}
