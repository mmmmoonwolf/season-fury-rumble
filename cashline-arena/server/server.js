#!/usr/bin/env node
// WebSocket relay for online play outside claude.ai, plus a static server for dist/.
//   node server/server.js            PORT env (default 8080), WebSocket path /ws
//
// The server knows nothing about the game. It keeps one presence object per peer per room and fans out
// patches, exactly like the claude.ai `room` capability the game was written against (see src/net_ws.js):
//   client -> server  {t:'hi', id, v}           pick a peer id (kept if free, otherwise a new one is assigned)
//                     {t:'j', r, p}             join room r with initial presence p ('' is the lobby)
//                     {t:'p', r, p}             presence patch (null value = delete key)
//                     {t:'l', r}                leave room r
//   server -> client  {t:'hi', id}              your peer id
//                     {t:'s', r, ps:{id:pres}}  full room state, sent after a join
//                     {t:'p', r, id, p}         someone's patch
//                     {t:'l', r, id}            someone left
// The game elects one browser as host and runs the match there; this relay never simulates anything.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const MAX_PRESENCE = 4096;      // same cap the game budgets for
const MAX_MSG = 16 * 1024;
const MAX_ROOMS_PER_PEER = 4;
const MAX_PEERS_PER_ROOM = 64;  // the lobby holds everyone; game rooms hold 4 + a few spectators/late tabs
const MSG_PER_SEC = 120;        // presence runs at ~20 Hz per room
const PING_MS = 10000;

const DIST = path.join(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };

function createServer() {
  const rooms = new Map();   // name -> Map(id -> {ws, p})
  const peers = new Map();   // id -> ws

  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, peers: peers.size, rooms: rooms.size }));
    }
    const file = path.normalize(path.join(DIST, url === '/' ? 'index.html' : url));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });

  const out = (ws, o) => { if (ws.readyState === 1) ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
  function broadcast(room, exceptId, o) {
    const s = JSON.stringify(o);
    for (const [id, m] of room) if (id !== exceptId) out(m.ws, s);
  }
  function leave(ws, name) {
    const room = rooms.get(name);
    ws.rooms.delete(name);
    if (!room || !room.has(ws.id) || room.get(ws.id).ws !== ws) return;
    room.delete(ws.id);
    if (room.size === 0) rooms.delete(name);
    else broadcast(room, ws.id, { t: 'l', r: name, id: ws.id });
  }
  const newId = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  const validRoom = (r) => typeof r === 'string' && r.length <= 64 && /^[a-z0-9_-]*$/i.test(r);
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

  wss.on('connection', (ws) => {
    ws.id = null; ws.rooms = new Set(); ws.alive = true; ws.budget = MSG_PER_SEC; ws.budgetT = Date.now();
    ws.on('pong', () => { ws.alive = true; });
    ws.on('message', (buf) => {
      const now = Date.now();
      if (now - ws.budgetT >= 1000) { ws.budget = MSG_PER_SEC; ws.budgetT = now; }
      if (--ws.budget < 0) return;
      let d; try { d = JSON.parse(buf); } catch (e) { return; }
      if (!isObj(d)) return;

      if (d.t === 'hi') {
        if (ws.id) return;
        let id = typeof d.id === 'string' && /^[a-z0-9]{8,32}$/.test(d.id) ? d.id : newId();
        if (peers.has(id)) id = newId();
        ws.id = id; peers.set(id, ws);
        return out(ws, { t: 'hi', id });
      }
      if (!ws.id || !validRoom(d.r)) return;

      if (d.t === 'j') {
        let room = rooms.get(d.r);
        if (!room) { room = new Map(); rooms.set(d.r, room); }
        if (!room.has(ws.id) && (room.size >= MAX_PEERS_PER_ROOM || ws.rooms.size >= MAX_ROOMS_PER_PEER)) return;
        const p = isObj(d.p) && Buffer.byteLength(JSON.stringify(d.p)) <= MAX_PRESENCE ? d.p : {};
        room.set(ws.id, { ws, p });
        ws.rooms.add(d.r);
        const ps = {};
        for (const [id, m] of room) if (id !== ws.id) ps[id] = m.p;
        out(ws, { t: 's', r: d.r, ps });
        broadcast(room, ws.id, { t: 'p', r: d.r, id: ws.id, p });
      } else if (d.t === 'p') {
        const room = rooms.get(d.r), m = room && room.get(ws.id);
        if (!m || m.ws !== ws || !isObj(d.p)) return;
        const next = Object.assign({}, m.p);
        for (const k in d.p) { if (d.p[k] === null) delete next[k]; else next[k] = d.p[k]; }
        if (Buffer.byteLength(JSON.stringify(next)) > MAX_PRESENCE) return;
        m.p = next;
        broadcast(room, ws.id, { t: 'p', r: d.r, id: ws.id, p: d.p });
      } else if (d.t === 'l') {
        leave(ws, d.r);
      }
    });
    ws.on('close', () => {
      for (const name of [...ws.rooms]) leave(ws, name);
      if (ws.id && peers.get(ws.id) === ws) peers.delete(ws.id);
    });
  });

  const ping = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, PING_MS);
  server.on('close', () => { clearInterval(ping); for (const ws of wss.clients) ws.terminate(); });

  return server;
}

function start(port) {
  const server = createServer();
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  const port = Number(process.env.PORT || process.argv[2]) || 8080;
  start(port).then(() => {
    console.log(`Cashline Arena server on http://localhost:${port}/  (WebSocket ws://localhost:${port}/ws)`);
    if (!fs.existsSync(path.join(DIST, 'index.html'))) console.log('  dist/ is empty: run `npm run build` first');
  });
}
module.exports = { start, createServer };
