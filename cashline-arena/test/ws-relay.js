#!/usr/bin/env node
// Protocol tests for server/server.js (no browser): ids, join snapshot, presence patches, size cap, leave, disconnect.
'use strict';
const WebSocket = require('ws');
const { start } = require('../server/server.js');

const PORT = 8792;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, ok, info) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`);
  if (!ok) failures++;
}
function client(id) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    ws.msgs = [];
    ws.on('message', (b) => ws.msgs.push(JSON.parse(b)));
    ws.on('error', reject);
    ws.on('open', () => { ws.send(JSON.stringify({ t: 'hi', id, v: 1 })); });
    const wait = setInterval(() => {
      const hi = ws.msgs.find((m) => m.t === 'hi');
      if (hi) { clearInterval(wait); ws.id = hi.id; resolve(ws); }
    }, 10);
  });
}
const tx = (ws, o) => ws.send(JSON.stringify(o));
const last = (ws, f) => ws.msgs.filter(f).pop();

(async () => {
  const server = await start(PORT);
  try {
    const A = await client('aaaaaaaa11'), B = await client('bbbbbbbb22');
    check('peer keeps the id it asked for', A.id === 'aaaaaaaa11' && B.id === 'bbbbbbbb22');
    const C = await client('aaaaaaaa11');
    check('taken id gets a fresh one', C.id !== 'aaaaaaaa11' && /^[a-z0-9]{8,32}$/.test(C.id), C.id);

    tx(A, { t: 'j', r: 'cl-abcd', p: { n: 'A', v: 1 } }); await sleep(80);
    tx(B, { t: 'j', r: 'cl-abcd', p: { n: 'B', v: 1 } }); await sleep(80);
    const sB = last(B, (m) => m.t === 's' && m.r === 'cl-abcd');
    check('join returns everyone already in the room', sB && sB.ps[A.id] && sB.ps[A.id].n === 'A', sB);
    const jA = last(A, (m) => m.t === 'p' && m.id === B.id);
    check('room is told about the newcomer', jA && jA.p.n === 'B', jA);

    tx(A, { t: 'p', r: 'cl-abcd', p: { pl: { x: 1 }, n: 'A2' } }); await sleep(60);
    tx(A, { t: 'p', r: 'cl-abcd', p: { pl: null } }); await sleep(60);
    const ps = B.msgs.filter((m) => m.t === 'p' && m.id === A.id).map((m) => m.p);
    check('patches relayed in order', ps.length === 2 && ps[0].pl.x === 1 && ps[1].pl === null, ps);
    tx(C, { t: 'j', r: 'cl-abcd', p: {} }); await sleep(80);
    const sC = last(C, (m) => m.t === 's');
    check('server merges patches (null deletes)', sC && sC.ps[A.id].n === 'A2' && !('pl' in sC.ps[A.id]), sC && sC.ps[A.id]);

    tx(C, { t: 'p', r: 'cl-other', p: { x: 1 } }); await sleep(60);
    check('cannot patch a room you are not in', !A.msgs.some((m) => m.r === 'cl-other'));

    const n = B.msgs.length;
    tx(A, { t: 'p', r: 'cl-abcd', p: { big: 'x'.repeat(4100) } }); await sleep(60);
    check('presence over 4 KiB is dropped', B.msgs.length === n);

    tx(A, { t: 'j', r: '', p: { ad: { c: 'ABCD' } } }); await sleep(60);
    check('lobby is a separate room', !B.msgs.some((m) => m.r === '' && m.id === A.id));

    tx(C, { t: 'l', r: 'cl-abcd' }); await sleep(60);
    check('leave is broadcast', !!last(A, (m) => m.t === 'l' && m.id === C.id));
    B.close(); await sleep(120);
    check('disconnect counts as leave', !!last(A, (m) => m.t === 'l' && m.id === B.id && m.r === 'cl-abcd'));
    const B2 = await client('bbbbbbbb22');
    check('id is free again after disconnect', B2.id === 'bbbbbbbb22');

    const res = await fetch(`http://localhost:${PORT}/healthz`).then((r) => r.json());
    check('healthz reports peers', res.ok && res.peers === 3, res);
    [A, B2, C].forEach((w) => w.close());
  } catch (e) {
    failures++; console.log('FAIL  threw: ' + e.message);
  } finally { server.close(); }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll relay checks passed');
  process.exit(failures ? 1 : 0);
})();
