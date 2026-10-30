#!/usr/bin/env node
// Tiny static server for dist/ (no dependencies).  node scripts/serve.js [port]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };

function start(port) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.normalize(path.join(dir, url === '/' ? 'index.html' : url));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  const port = Number(process.argv[2]) || 8765;
  start(port).then(() => {
    console.log(`Serving dist/ at http://localhost:${port}/`);
    console.log(`  เล่นคนเดียว/บอท:      http://localhost:${port}/index.html`);
    console.log(`  ทดสอบออนไลน์ในเครื่อง: http://localhost:${port}/mp-local.html  (เปิด 2 แท็บขึ้นไป)`);
  });
}
module.exports = { start };
