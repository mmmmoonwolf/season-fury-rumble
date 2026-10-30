#!/usr/bin/env node
// Builds single-file HTML pages from src/ into dist/.
//   dist/index.html     play locally / any static host (real three.js); online via the WebSocket relay
//                       (server/server.js) when one is reachable, otherwise bots only. WS_URL=wss://host/ws
//                       at build time bakes in the relay address for static hosts such as GitHub Pages.
//   dist/mp-local.html  real three.js + BroadcastChannel room mock: open 2+ tabs to test online play on one PC
//   dist/test.html      three.js stub + room mock, used by the headless e2e tests
//   dist/ws-test.html   three.js stub + WebSocket adapter, used by the e2e tests run against the real relay
//   dist/artifact.html  body-only page for publishing as a claude.ai Artifact (uses the `room` capability)
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const page = read('src/page.html');
const core = read('src/core.js');
const chars = read('src/chars.js');
const client = read('src/client.js');
const appScripts = [core, chars, client].map((js) => `<script>\n${js}\n</script>\n`).join('');

function body(pre) {
  if (!page.includes('<!--SCRIPTS-->')) throw new Error('src/page.html is missing the <!--SCRIPTS--> placeholder');
  // function form: a string replacement would expand $' and $& patterns found in the game code
  return page.replace('<!--SCRIPTS-->', () => pre + appScripts);
}
function standalone(html) {
  return '<!doctype html><html lang="th"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>';
}
const cdn = `<script src="${THREE_CDN}"></script>\n`;
const inline = (p) => `<script>\n${read(p)}\n</script>\n`;
const wsUrl = process.env.WS_URL || '';
if (wsUrl && !/^wss?:\/\//.test(wsUrl)) throw new Error('WS_URL must start with ws:// or wss://');
const ws = (wsUrl ? `<script>window.CL_WS_URL = ${JSON.stringify(wsUrl).replace(/</g, '\\u003c')};</script>\n` : '') + inline('src/net_ws.js');

const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
const files = {
  'index.html': standalone(body(cdn + ws)),
  'mp-local.html': standalone(body(cdn + inline('test/room_mock.js'))),
  'test.html': standalone(body(inline('test/three_stub.js') + inline('test/room_mock.js'))),
  'ws-test.html': standalone(body(inline('test/three_stub.js') + inline('src/net_ws.js'))),
  'artifact.html': body(cdn)
};
for (const [name, html] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), html);
  console.log(`dist/${name}  ${(html.length / 1024).toFixed(0)} KB`);
}
