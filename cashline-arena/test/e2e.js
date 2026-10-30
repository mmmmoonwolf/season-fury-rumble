#!/usr/bin/env node
// Headless end-to-end tests. Uses dist/test.html (three.js stub + BroadcastChannel room mock),
// so it checks game logic, netcode and UI flow, NOT 3D rendering.
// Run: npm run build && npm run test:e2e     (needs: npm i -D playwright && npx playwright install chromium)
// `node test/e2e.js --ws` runs the same tests over real WebSockets: server/server.js serves dist/ws-test.html and relays presence.
'use strict';
const { chromium } = require('playwright');
const NET = process.argv.includes('--ws') || process.env.E2E_NET === 'ws' ? 'ws' : 'mock';
const { start } = NET === 'ws' ? require('../server/server.js') : require('../scripts/serve.js');

const PORT = NET === 'ws' ? 8791 : 8790;
const URL = `http://localhost:${PORT}/${NET === 'ws' ? 'ws-test.html' : 'test.html'}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, ok, info) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`);
  if (!ok) failures++;
}
async function openPage(ctx, errs) {
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(String(e)));
  pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(URL);
  await sleep(700);
  return pg;
}
async function enter(pg, name, mode) {
  await pg.click('#boot');
  await pg.fill('#nameIn', name);
  await pg.click('#bPlay');
  if (mode) await pg.click(`.mode[data-m="${mode}"]`);
}
const solids = (pg) => pg.evaluate(() => { let n = 0; for (const v of __cl.world.c) if (v) n++; return n; });
const worldArr = (pg) => pg.evaluate(() => Array.from(__cl.world.c));

async function testSoloCash(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1200, height: 720 } });
  const pg = await openPage(ctx, errs);
  await enter(pg, 'ทดสอบ', 'cash');
  await pg.click('#bBots'); await sleep(600);
  await pg.click('#bStart'); await sleep(6500);
  check('solo: match started', (await pg.evaluate(() => __cl.GC.L.st)) === 'match');
  const v = await pg.evaluate(() => CL.MAP.vaults[__cl.GC.G.vi]);
  await pg.evaluate((v) => { const b = __cl.player.b; b.x = v[0] + 1; b.y = 1; b.z = v[2]; __cl.keys.KeyE = 1; }, v);
  await sleep(3200);
  check('solo: vault opens', (await pg.evaluate(() => __cl.GC.G.ph)) === 'box');
  await pg.evaluate(() => { __cl.keys.KeyE = 0; }); await sleep(200);
  const cb = await pg.evaluate(() => __cl.GC.G.cb);
  await pg.evaluate((cb) => { const b = __cl.player.b; b.x = cb[0] / 100; b.z = cb[2] / 100; b.y = 1; __cl.keys.KeyE = 1; }, cb);
  await sleep(500); await pg.evaluate(() => { __cl.keys.KeyE = 0; }); await sleep(300);
  check('solo: picked up cashbox', (await pg.evaluate(() => __cl.GC.G.cb && __cl.GC.G.cb[3])) === 0);
  const st = await pg.evaluate(() => CL.MAP.stations[__cl.GC.G.st[0][0]]);
  await pg.evaluate((s) => { const b = __cl.player.b; b.x = s[0]; b.z = s[2]; b.y = 1; __cl.keys.KeyE = 1; }, st);
  await sleep(1800); await pg.evaluate(() => { __cl.keys.KeyE = 0; });
  check('solo: deposited, cashout running', (await pg.evaluate(() => __cl.GC.G.ph)) === 'cash');
  await pg.evaluate(() => { __cl.Host.M.t = 1; }); await sleep(1500);
  check('solo: results screen', (await pg.evaluate(() => __cl.GC.L.st)) === 'res');
  await pg.click('#rsBack'); await sleep(400);
  check('solo: back to lobby', (await pg.evaluate(() => __cl.GC.L.st)) === 'lobby');
  check('solo: no page errors', errs.length === 0, errs);
  await ctx.close();
}

async function testOnlineCash(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const A = await openPage(ctx, errs), B = await openPage(ctx, errs);
  await enter(A, 'ผู้เล่นA', 'cash'); await enter(B, 'ผู้เล่นB', 'cash');
  await A.click('#bCreate'); await sleep(2500);
  const code = await A.innerText('#lbCode');
  await B.fill('#codeIn', code); await B.click('#bJoin'); await sleep(3000);
  check('online: B joined A\'s room', (await A.evaluate(() => __cl.Host.L.s.filter(Boolean).length)) === 2, code);
  await B.click('#bReady'); await A.click('#bStart'); await sleep(7000);
  const sA = await A.evaluate(() => [__cl.GC.L.st, __cl.GC.mySlot]), sB = await B.evaluate(() => [__cl.GC.L.st, __cl.GC.mySlot]);
  check('online: both in match, different slots', sA[0] === 'match' && sB[0] === 'match' && sA[1] !== sB[1], { sA, sB });
  const before = await solids(A);
  await B.evaluate(() => { const p = __cl.player; p.b.x = 24; p.b.z = 31.5; p.b.y = 1; p.yaw = -Math.PI / 2; p.pitch = -0.15; __cl.mouse.l = 1; });
  await sleep(2500); await B.evaluate(() => { __cl.mouse.l = 0; __cl.press('gad'); }); await sleep(4000);
  const a2 = await solids(A), b2 = await solids(B);
  check('online: client destruction reaches host and back', a2 < before && a2 === b2, { before, a2, b2 });
  await A.close(); await sleep(6500);
  const mig = await B.evaluate(() => ({ host: __cl.GC.amHost, st: __cl.GC.L && __cl.GC.L.st }));
  check('online: host migration after host leaves', mig.host && mig.st === 'match', mig);
  check('online: no page errors', errs.length === 0, errs);
  await ctx.close();
}

async function testPush(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const A = await openPage(ctx, errs), B = await openPage(ctx, errs);
  await enter(A, 'เอ', 'push'); await enter(B, 'บี', 'push');
  await A.click('#bQuick'); await sleep(4000);
  await B.click('#bQuick'); await sleep(4500);
  check('push: quick match puts both in one room', (await A.innerText('#lbCode')) === (await B.innerText('#lbCode')));
  await A.click('#bStart'); await sleep(7000);
  check('push: mode is push', (await A.evaluate(() => __cl.GC.G.md)) === 'push');
  const onPlat = (pg) => pg.evaluate(() => { const G = __cl.GC.G, b = __cl.player.b; b.x = CL.PUSH.cx + G.pp / 1000 * CL.PUSH.half; b.z = CL.PUSH.z; b.y = 1; });
  for (let i = 0; i < 10; i++) { await onPlat(A); await sleep(500); }
  const pA = await A.evaluate(() => __cl.GC.G.pp), pB = await B.evaluate(() => __cl.GC.G.pp);
  check('push: team 0 moves platform west, both see it', pA < 0 && Math.abs(pA - pB) < 40, { pA, pB });
  await A.evaluate(() => { __cl.Host.M.pp = -1; }); await sleep(1500);
  const r = await A.evaluate(() => __cl.GC.L.r);
  check('push: reaching the gate ends the match', r && r.md === 'push' && r.wn === 0, r);
  check('push: no page errors', errs.length === 0, errs);
  await ctx.close();
}

async function testDeterminism(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const A = await openPage(ctx, errs), B = await openPage(ctx, errs);
  await enter(A, 'host'); await enter(B, 'shooter');
  await A.click('#bCreate'); await sleep(2500); const code = await A.innerText('#lbCode');
  await B.fill('#codeIn', code); await B.click('#bJoin'); await sleep(3000);
  await A.click('#bStart'); await sleep(7000);
  for (let k = 0; k < 30; k++) {
    await B.evaluate((k) => { const p = __cl.player; p.gad = 2; p.b.x = 14 + (k % 8) * 9; p.b.z = 20 + ((k * 7) % 5) * 12; p.b.y = 1; p.yaw = k * 0.9; p.pitch = -0.2; __cl.press('gad'); __cl.mouse.l = 1; }, k);
    await sleep(250);
  }
  await B.evaluate(() => { __cl.mouse.l = 0; }); await sleep(4500);
  const wa = await worldArr(A), wb = await worldArr(B);
  check('sync: host and client worlds identical after heavy destruction', wa.every((v, i) => v === wb[i]));
  const C = await openPage(ctx, errs); await enter(C, 'late'); await C.fill('#codeIn', code); await C.click('#bJoin'); await sleep(8000);
  const wc = await worldArr(C), wa2 = await worldArr(A);
  check('sync: late joiner catches up on destruction', wc.every((v, i) => v === wa2[i]));
  const over = await A.evaluate(() => window.__presenceOver || 0) + await B.evaluate(() => window.__presenceOver || 0);
  check('sync: presence never exceeded 4 KiB', over === 0, over);
  check('sync: no page errors', errs.length === 0, errs);
  await ctx.close();
}

async function testCharactersAndChaos(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  const A = await openPage(ctx, errs), B = await openPage(ctx, errs);
  await A.click('#boot'); await A.fill('#nameIn', 'เอ'); await A.click('#bChars'); await A.click('.chr[data-ch="pine"]'); await A.click('#chBack');
  check('chars: choice saved', (await A.evaluate(() => JSON.parse(localStorage.getItem('cl_ch')))) === 'pine');
  await A.click('#bPlay'); await A.click('.mode[data-m="cash"]'); await A.click('#bCreate'); await sleep(2500);
  const code = await A.innerText('#lbCode');
  await B.click('#boot'); await B.fill('#nameIn', 'บี'); await B.click('#bChars'); await B.click('.chr[data-ch="rock"]'); await B.click('#chBack');
  await B.click('#bPlay'); await B.fill('#codeIn', code); await B.click('#bJoin'); await sleep(3000);
  await A.click('#fmtSeg button[data-f="1v1v1v1"]'); await sleep(400); await A.click('#bStart'); await sleep(7000);
  const botCh = await A.evaluate(() => __cl.GC.G.bt.map((x) => x[10]));
  check('chars: bots take characters nobody picked', botCh.every((c) => c !== 'pine' && c !== 'rock') && new Set(botCh).size === botCh.length, botCh);
  const a = await A.evaluate(() => __cl.GC.mySlot);
  await A.evaluate(() => { const b = __cl.player.b; b.x = 30; b.z = 40; b.y = 1; });
  await B.evaluate(() => { const b = __cl.player.b; b.x = 31; b.z = 40; b.y = 1; }); await sleep(500);
  await B.evaluate((a) => { __cl.GC.claims.push([++__cl.GC.seq, 0, a, 40, CL.WI.hammer]); }, a); await sleep(700);
  const ax = await A.evaluate(() => __cl.player.b.x);
  check('chaos: hammer knocks a live player away', ax < 29, ax);
  await B.evaluate((a) => { __cl.GC.claims.push([++__cl.GC.seq, 0, a, 250, CL.WI.hammer]); }, a); await sleep(400);
  const ra = await A.evaluate(() => __cl.rags.map((r) => r.kind)), rb = await B.evaluate(() => __cl.rags.map((r) => r.kind));
  check('chaos: hammer kill = home run ragdoll on both screens', ra.includes(2) && rb.includes(2), { ra, rb });
  check('chaos: death cam rides your own ragdoll', await A.evaluate(() => !!__cl.GC.myRag));
  await sleep(5200);
  check('chaos: ragdolls clean themselves up', (await A.evaluate(() => __cl.rags.length)) === 0);
  await B.evaluate(() => __cl.press('emote')); await sleep(600);
  check('chaos: emote reaches other players', (await A.evaluate(() => { const p = __cl.GC.peers.find((p) => p.presence && p.presence.pl && !p.isMe); return p && p.presence.pl.em; })) === 1);
  check('chaos: no page errors', errs.length === 0, errs);
  await ctx.close();
}

// ---- WebSocket-only checks (the BroadcastChannel mock cannot span browsers) ----
async function testSeparateBrowsers(browser) {
  const errs = [];
  const cA = await browser.newContext({ viewport: { width: 1000, height: 700 } }), cB = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const A = await openPage(cA, errs), B = await openPage(cB, errs);
  await enter(A, 'เครื่องหนึ่ง', 'cash'); await enter(B, 'เครื่องสอง', 'cash');
  await A.click('#bCreate'); await sleep(2500);
  const code = await A.innerText('#lbCode');
  await B.fill('#codeIn', code); await B.click('#bJoin'); await sleep(3000);
  check('ws: players in two separate browsers share a room', (await A.evaluate(() => __cl.Host.L.s.filter(Boolean).length)) === 2, code);
  await A.click('#bStart'); await sleep(7000);
  const st = await Promise.all([A, B].map((pg) => pg.evaluate(() => __cl.GC.L.st)));
  check('ws: both browsers reach the match', st[0] === 'match' && st[1] === 'match', st);
  check('ws: no page errors', errs.length === 0, errs);
  await cA.close(); await cB.close();
}
async function testRelayRestart(browser) {
  // the relay goes down mid-match and comes back: both players reconnect as the same peers, same host, same match
  const port = PORT + 20, errs = [];
  let srv = await start(port);
  const cA = await browser.newContext(), cB = await browser.newContext();
  const open = async (c) => { const p = await c.newPage(); p.on('pageerror', (e) => errs.push(String(e))); await p.goto(`http://localhost:${port}/ws-test.html`); await sleep(700); return p; };
  const A = await open(cA), B = await open(cB);
  await enter(A, 'a', 'cash'); await enter(B, 'b', 'cash');
  await A.click('#bCreate'); await sleep(2500); const code = await A.innerText('#lbCode');
  await B.fill('#codeIn', code); await B.click('#bJoin'); await sleep(3000);
  await A.click('#bStart'); await sleep(7000);
  const ids = () => Promise.all([A, B].map((pg) => pg.evaluate(() => __wsPeer())));
  const before = await ids();
  srv.close(); await sleep(2000);
  srv = await start(port); await sleep(6000);
  const after = await ids();
  const st = await Promise.all([A, B].map((pg) => pg.evaluate(() => ({ st: __cl.GC.L.st, host: __cl.GC.amHost, n: __cl.GC.peers.length, t: __cl.GC.G.t }))));
  check('ws: same peer ids after the relay restarts', before.join() === after.join(), { before, after });
  check('ws: match carries on after reconnect, same host', st[0].st === 'match' && st[1].st === 'match' && st[0].host && !st[1].host && st[1].n === 2 && Math.abs(st[0].t - st[1].t) <= 1, st);
  check('ws: no page errors', errs.length === 0, errs);
  await cA.close(); await cB.close(); srv.close();
}
async function testStaticHostFallback(browser) {
  // same page served by the plain static server: no relay at /ws, so the game must offer bots instead of hanging
  const { start: startStatic } = require('../scripts/serve.js');
  const srv = await startStatic(PORT + 10);
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT + 10}/ws-test.html`); await sleep(1500);
  const r = await pg.evaluate(() => ({ off: document.getElementById('netDot').className.includes('off'), quick: document.getElementById('bQuick').disabled }));
  check('ws: static host without relay falls back to bots only', r.off && r.quick, r);
  await ctx.close(); srv.close();
}

(async () => {
  console.log(`network: ${NET}  ${URL}`);
  const server = await start(PORT);
  // CHROMIUM_PATH must be a headless shell (chrome-headless-shell), not full Chrome: full Chrome's headless mode
  // stops requestAnimationFrame in background tabs while still reporting them visible, which freezes the host tab
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const tests = [testSoloCash, testOnlineCash, testPush, testDeterminism, testCharactersAndChaos];
    if (NET === 'ws') tests.push(testSeparateBrowsers, testRelayRestart, testStaticHostFallback);
    for (const t of tests) {
      console.log(`\n# ${t.name}`);
      try { await t(browser); } catch (e) { failures++; console.log('FAIL  ' + t.name + ' threw: ' + e.message); }
    }
  } finally { await browser.close(); server.close(); }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
