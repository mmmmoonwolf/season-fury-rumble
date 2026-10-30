// WebSocket adapter for the room API (lobby + named rooms, per-peer presence), for hosting outside claude.ai.
// Talks to server/server.js. Installs window.claude.use('room') only when nothing else provides it, so the
// artifact build and the BroadcastChannel mock are unaffected.
//
// Server URL, first match wins:
//   ?server=wss://host/ws   (remembered in localStorage 'cl_ws'; ?server=off clears it)
//   localStorage 'cl_ws'
//   window.CL_WS_URL        (baked in at build time from the WS_URL env var)
//   same origin /ws         (when the page itself is served by server/server.js); a plain static host has no
//                           relay there, so this guess gives up after the first failed attempt -> bots only
(function () {
  if (window.claude && typeof window.claude.use === 'function') return;
  var MAX_PRESENCE = 4096, STALE_MS = 4000, FIRST_CONNECT_MS = 60000;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  function pickUrl() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('server'); } catch (e) { }
    if (q === 'off' || q === '') { lsSet('cl_ws', null); q = null; }
    else if (q) { if (!/^wss?:\/\//.test(q)) q = (location.protocol === 'http:' ? 'ws://' : 'wss://') + q.replace(/^https?:\/\//, ''); lsSet('cl_ws', q); }
    var u = q || lsGet('cl_ws') || window.CL_WS_URL || '';
    if (u) return { url: u, guess: false };
    if (/^https?:$/.test(location.protocol)) return { url: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws', guess: true };
    return null;
  }
  var target = pickUrl();
  if (!target) return;

  var me = lsGet('cl_peer');
  if (!me || !/^[a-z0-9]{8,32}$/.test(me)) { me = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); lsSet('cl_peer', me); }
  // two tabs of one browser share localStorage; give each tab its own id
  try { var tab = sessionStorage.getItem('cl_tab'); if (!tab) { tab = Math.random().toString(36).slice(2, 8); sessionStorage.setItem('cl_tab', tab); } me = (me + tab).slice(0, 32); } catch (e) { }

  var ws = null, up = false, everUp = false, tries = 0, rooms = {}, connSubs = [];
  var enc = window.TextEncoder ? new TextEncoder() : null;
  function bytes(s) { return enc ? enc.encode(s).length : unescape(encodeURIComponent(s)).length; }
  function send(o) { if (up && ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

  function Room(name) { this.name = name; this.mine = {}; this.others = {}; this.subs = []; this.snap = Object.freeze([]); this.dirty = true; this.left = false; this.waiters = []; }
  Room.prototype.build = function () {
    var arr = [Object.freeze({ peer: me, isMe: true, sameTab: true, kind: 'viewer', guest: false, by: null, presence: Object.freeze(JSON.parse(JSON.stringify(this.mine))), updatedAt: Date.now() })];
    for (var p in this.others) arr.push(Object.freeze({ peer: p, isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null, presence: this.others[p].presence, updatedAt: this.others[p].t }));
    this.snap = Object.freeze(arr); this.dirty = false;
  };
  Room.prototype.peers = function () { if (this.dirty) this.build(); return this.snap; };
  Room.prototype.notify = function () {
    this.dirty = true; var self = this; if (this.pend) return; this.pend = true;
    setTimeout(function () { self.pend = false; var ps = self.peers(); self.subs.forEach(function (f) { try { f({ peers: ps, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } }); }, 16);
  };
  Room.prototype.presence = function (patch) {
    if (this.left) return Promise.reject({ code: 'invalid_argument', message: 'room left' });
    var m = JSON.parse(JSON.stringify(this.mine));
    for (var k in patch) { if (patch[k] === null) delete m[k]; else m[k] = patch[k]; }
    var s = JSON.stringify(m);
    if (bytes(s) > MAX_PRESENCE) { window.__presenceOver = (window.__presenceOver || 0) + 1; return Promise.reject({ code: 'invalid_argument', message: 'presence over 4KiB: ' + s.length }); }
    this.mine = m; send({ t: 'p', r: this.name, p: patch }); this.notify();
    return Promise.resolve();
  };
  Room.prototype.onPeers = function (fn) { this.subs.push(fn); this.notify(); var s = this.subs; return function () { var i = s.indexOf(fn); if (i >= 0) s.splice(i, 1); }; };
  Room.prototype.emit = function () { return Promise.resolve(); };
  Room.prototype.on = function () { return function () { }; };
  Room.prototype.leave = function () { this.left = true; send({ t: 'l', r: this.name }); delete rooms[this.name]; return Promise.resolve(); };
  Room.prototype.connected = function () { return up; };
  Room.prototype.onConnection = function (fn) { connSubs.push(fn); setTimeout(function () { fn(up); }, 0); return function () { var i = connSubs.indexOf(fn); if (i >= 0) connSubs.splice(i, 1); }; };
  Room.prototype.join = function (name) {
    name = String(name);
    var r = rooms[name];
    if (r && r.joined) return Promise.resolve(r);
    if (!r) { r = rooms[name] = new Room(name); send({ t: 'j', r: name, p: r.mine }); }
    return new Promise(function (res, rej) {
      r.waiters.push(res);
      setTimeout(function () { var i = r.waiters.indexOf(res); if (i >= 0) { r.waiters.splice(i, 1); rej({ code: 'timeout', message: 'join timed out' }); } }, 15000);
    });
  };

  var lobby = new Room(''); rooms[''] = lobby;
  var readyRes = null, ready = new Promise(function (res) { readyRes = res; });

  function onMsg(e) {
    var d; try { d = JSON.parse(e.data); } catch (x) { return; }
    var r = rooms[d.r];
    if (d.t === 'hi') {
      me = d.id;
      // rooms (re)joined after connect carry our current presence so peers see us at once
      for (var n in rooms) if (!rooms[n].left) send({ t: 'j', r: n, p: rooms[n].mine });
      if (!everUp) { everUp = true; readyRes(lobby); }
      connSubs.forEach(function (f) { try { f(true); } catch (x) { } });
      return;
    }
    if (!r) return;
    var now = Date.now();
    if (d.t === 's') {
      r.others = {};
      for (var p in d.ps) if (p !== me) r.others[p] = { presence: Object.freeze(d.ps[p]), t: now };
      r.joined = true; r.dirty = true;
      var ws_ = r.waiters; r.waiters = []; ws_.forEach(function (f) { f(r); });
      r.notify();
    } else if (d.t === 'p') {
      if (d.id === me) return;
      var o = r.others[d.id], m = o ? JSON.parse(JSON.stringify(o.presence)) : {};
      for (var k in d.p) { if (d.p[k] === null) delete m[k]; else m[k] = d.p[k]; }
      r.others[d.id] = { presence: Object.freeze(m), t: now }; r.notify();
    } else if (d.t === 'l') {
      if (r.others[d.id]) { delete r.others[d.id]; r.notify(); }
    }
  }

  function connect() {
    try { ws = new WebSocket(target.url); } catch (e) { return fail(); }
    var opened = false;
    ws.onopen = function () { opened = true; up = true; tries = 0; ws.send(JSON.stringify({ t: 'hi', id: me, v: 1 })); };
    ws.onmessage = onMsg;
    ws.onerror = function () { };
    ws.onclose = function () {
      var was = up; up = false; ws = null;
      for (var n in rooms) rooms[n].joined = false;
      if (was) connSubs.forEach(function (f) { try { f(false); } catch (x) { } });
      if (!opened && !everUp) return fail();
      reconnect();
    };
  }
  var t0 = Date.now();
  function fail() {
    if (!everUp && (target.guess || Date.now() - t0 > FIRST_CONNECT_MS)) { readyRes(null); return; }
    reconnect();
  }
  function reconnect() { tries++; setTimeout(connect, Math.min(8000, 500 * Math.pow(1.6, tries))); }

  // while disconnected, peers we can no longer hear from expire like they would on a live connection
  setInterval(function () {
    if (up) return;
    var now = Date.now();
    for (var n in rooms) { var r = rooms[n]; for (var p in r.others) if (now - r.others[p].t > STALE_MS) { delete r.others[p]; r.notify(); } }
  }, 1000);
  addEventListener('pagehide', function () { if (ws) try { ws.close(); } catch (e) { } });

  connect();
  window.claude = { use: function (n) { return n === 'room' ? ready : Promise.resolve(null); } };
  window.__wsPeer = function () { return me; };
})();
