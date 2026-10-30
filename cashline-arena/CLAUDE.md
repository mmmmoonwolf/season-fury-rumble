# CLAUDE.md — Cashline Arena

Handoff notes for Claude Code. Read this first; it explains how the game is put together, how to build and test it,
and the traps that are easy to fall into.

## What this is

A browser 3D arena FPS built with three.js (r128), inspired by the game-show-shooter genre (cash objectives,
destructible levels, Light/Medium/Heavy classes). It started life as a single-file claude.ai Artifact and still
builds to one self-contained HTML page.

- 4 players per room, empty slots filled by bots
- Modes: **Cash Rush** (vault → cashbox → cashout station, first to $20,000) and **Platform Push**
  (stand on a rail platform to push it into the enemy gate)
- Team formats: Cash Rush `1v1v1` (default) / `1v1v1v1` / `2v2`; Platform Push `2v2` (default) / `1v1`
- Voxel world 96 × 96 × 16, everything except steel/floor/trim is destructible
- 8 playable chibi characters modelled on the owner's office team (cosmetic only)
- Deliberately goofy tone: deaths launch, explode, home-run or rocket the body; hammers and explosions knock
  live players around; comic hit words; emotes
- All UI text is **Thai**. Keep new UI copy in Thai, code identifiers in English.
- Original names only. Do not use another game's names, logos, characters or assets.

## Commands

```bash
npm install                 # only needed for the e2e tests (playwright)
npx playwright install chromium

npm run build               # src/ -> dist/*.html   (WS_URL=wss://host/ws bakes a relay address into index.html)
npm run dev                 # build + serve dist/ on http://localhost:8765 (static only, no relay -> bots only)
npm run online              # build + WebSocket relay that also serves dist/, on http://localhost:8765
npm start                   # relay only (PORT env, default 8080) - what a host such as Render runs
npm run sim                 # headless bot-vs-bot simulations (no browser needed)
npm run test:e2e            # build + headless browser tests (two/three tabs, room mock, three.js stub)
npm run test:ws             # relay protocol tests + the same e2e suite over real WebSockets, + two-browser checks
npm test                    # sim + e2e + ws
```

The e2e tests need Chromium's **headless shell** (what `npx playwright install chromium` gets). If you point
`CHROMIUM_PATH` at full Chrome instead, its headless mode stops `requestAnimationFrame` in background tabs while
still reporting them visible, so the host tab freezes and the chaos checks fail.

Build outputs (`dist/` is git-ignored):

| file | three.js | multiplayer | use |
|---|---|---|---|
| `index.html` | CDN | WebSocket relay (`src/net_ws.js`), else bots only | play online via `server/server.js`, or on any static host |
| `mp-local.html` | CDN | BroadcastChannel mock | open 2+ tabs on one PC to test online play with real graphics |
| `test.html` | stub | BroadcastChannel mock | headless e2e (logic only, nothing renders) |
| `ws-test.html` | stub | WebSocket relay | headless e2e against the real relay (`test:ws`) |
| `artifact.html` | CDN | claude.ai `room` capability | publish as a claude.ai Artifact (body-only page) |

## Repo layout

```
src/page.html    markup + CSS for every screen; contains the <!--SCRIPTS--> placeholder
src/core.js      CL: pure game logic, no DOM, no THREE (runs in Node for sims)
src/chars.js     CLX: character looks (CHAR_VIS), chibi mesh builder, 2D portraits
src/client.js    rendering, input, audio, networking, host controller, HUD, screens
src/net_ws.js    room API over WebSockets (window.claude.use('room') shim) for hosting outside claude.ai
server/server.js WebSocket relay (`ws` package) + static server for dist/, /healthz
scripts/build.js concatenates page + core + chars + client into dist/*.html
scripts/serve.js zero-dependency static server
test/            sims (sim-cash, sim-push, balance, reach), e2e.js, ws-relay.js, three_stub.js, room_mock.js
```

Scripts are plain ES5-style IIFEs exposing globals (`CL`, `CLX`), no modules or bundler, so the artifact stays a
single file with no fetches. Script order matters: three → core → chars → client.

## core.js (CL)

- **World**: `Uint8Array` cells `c` + hit points `hp`, index `idx(x,y,z) = (y*D + z)*W + x`.
  Materials in `MAT` (`hp: 0` = indestructible). `markDirty` flags 16×16 render chunks (full height).
- **Map**: `genMap(world, mode)` builds "Studio Plaza". The layout is **point-symmetric** around the centre
  (`mirBox`, `buildingPair`) so 2-team matches are fair. Keep new features mirrored. `MAP.vaults`,
  `MAP.stations`, `MAP.spawns` (cash), `MAP.pspawns[team]` (push). Push mode carves a rail lane at `PUSH.z`.
  `test/reach.js` checks every objective/spawn is reachable on foot; run it after map edits.
- **Physics**: `moveBody` (AABB vs voxels, auto step-up of 1 block), `rayVoxel` (DDA), `rayAABB`.
- **Weapons/classes**: `WEAPONS`, `CLASSES`, `GADGETS`, `SPECS`. Weapon index `WI[id]` is used on the wire.
- **Match** (host only): `tick(dt)` runs bots, respawns, regen, projectiles and the mode objective
  (`objective` for cash, `pushObjective` for push). `applyClaims` validates client claims. `knock` applies
  knockback. `kill` picks a death style (`DEATH`: FLY/BOOM/HOMERUN/ROCKET). `snap()` produces the snapshot.
- **Bots**: `botTick` uses a BFS flow field on the ground layer (`Nav`), strafes, aims with error, jumps when stuck.
- **Characters**: `CHARS` (id + Thai display name). Rename people here; looks live in `chars.js`.

## Networking model (important)

Everything goes through **presence** (one JSON object per peer, ≤ 4 KiB, re-sent ~20 Hz). No events are used.
The `Session` class in client.js wraps the room API: `ROOM.join('cl-' + code)` gives a named room with
`presence(patch)`, `peers()`, `onPeers()`, `leave()`. The lobby room carries matchmaking ads (`ad`).

- **Host election**: among peers with `v:1` and visible tab, a peer already claiming `H` wins, else the
  lowest peer id. Visible tabs are preferred (a backgrounded tab is throttled by the browser). The host runs
  `CL.Match` and also plays as a normal client.
- **Host presence**: `H:1`, `L` (lobby: mode `md`, format `f`, slot→peer `s`, names `nm`, state `st`
  lobby|load|match|res, match id `mid`, seed, results `r`) and `G` (snapshot).
- **Snapshot `G`**: time, phase, scores, vault/cashbox/stations, hp/respawn timers/kills per slot, claim acks
  `ak`, spawn points `sp`, bots `bt` (pos, aim, shots, class, weapon, character, emote seq), projectiles `pj`,
  kill feed `fd` `[seq, attacker, victim, weapon, deathStyle]`, effects `fx`, knockback `kb`
  `[seq, slot, vx*10, vy*10, vz*10]`, push state `pp`/`ps`, and a destruction-op window `dq = [start, ops[]]`.
- **Client presence**: `v, n` (name), `c` class, `w` weapon, `ch` character, `rd` ready, `vis`, optional `want`
  (slot request) and `pl` while in a match: `mid, sn` (spawn seq), position/aim ×100/×1000, crouch, use,
  shot counter, emote seq `em`, `cl` (claims), `rs` (resync from op index).
- **Claims** (`[seq, type, ...]`, acked via `G.ak`): `0` damage player `[slot, dmg, weaponIndex]`,
  `1` damage block `[cellIndex, dmg]`, `2` heal pulse, `4` throw gadget `[kind, pos×100, dir×1000]`,
  `5` throw cashbox `[dir×1000]`. Clients do their own hit detection (trusted; fine among friends).
- **Destruction sync**: the host appends ops to `M.ops` (a number = one destroyed cell; an array
  `[x×10, y×10, z×10, r×10, id, kind]` = explosion). Clients apply ops in order from `dq`; a client that falls
  behind sets `pl.rs` and the host rewinds the window. Explosions are carved from the **rounded** op values on
  every peer, including the host, so worlds stay bit-identical. Never carve from unrounded values.
- **Humans own their position**; the host only validates actions. So knockback for humans goes through `G.kb`
  and the client applies it to itself.
- **Host migration**: every client keeps the last `L` and `G`; the new host rebuilds the match with
  `adoptMatch`.
- Op indices depend on `W`/`D`: every peer must run the same build.

### WebSocket relay (online outside claude.ai)

`src/net_ws.js` gives the game the same room API it gets inside claude.ai, so client.js has no WebSocket code
and no special cases. It only installs itself when `window.claude` is missing (the artifact and the mock win).
`server/server.js` is a dumb relay: per room it stores each peer's merged presence and fans out patches. It never
runs game logic; host election, the match and host migration all stay in the browsers exactly as before.

- Wire: `hi {id}` → `j {r, p}` join with presence → `p {r, p}` patch (null deletes) → `l {r}`; server sends
  `hi`, `s` (full room state after a join), `p` (someone's patch), `l` (someone left). Disconnect = leave.
- Server URL: `?server=wss://…` (remembered in localStorage, `?server=off` clears) → localStorage `cl_ws` →
  build-time `WS_URL` → same origin `/ws`. The same-origin guess gives up after one failed attempt so a plain
  static host shows "bots only" at once; an explicit URL keeps retrying for 60 s (free hosts cold-start slowly).
- Peer ids are kept across reconnects (localStorage + per-tab suffix) so a dropped connection rejoins as the same
  peer, which keeps host election stable. Reconnect re-joins every room with the current presence.
- Server limits: presence 4 KiB (same budget), 16 KiB per message, 4 rooms per peer, 64 peers per room,
  120 messages/s per socket, ping every 10 s drops dead sockets.
- Clients still do their own hit detection and the host trusts them; fine among friends, not for strangers.

### Budget

Presence is capped at 4 KiB of UTF-8. `sendPresence` sizes the op window to what is left. `e2e.js` asserts the
cap is never hit. If you add snapshot fields, re-run `npm run test:e2e` and watch `presence never exceeded 4 KiB`.

## chars.js (CLX)

- `CHAR_VIS[id]`: skin, hair style (`bob|long|messy|slick|short|wavy|mop`), hair colour, shirt colour and
  pattern (`pine|print|logo`), pants, shoes, glasses colour, extras (`shades`, `socks`, `watch`, `collar`,
  `sleeveless`, head `tilt`), emote text, confetti colours.
- `makeChibi(id, teamHex, cls)` builds the model (origin at feet, faces −z, ~1.95 tall); team colour shows on
  belt, armbands and the ring under the feet. `portrait(id)` returns a cached data: URL for menus.
- To add a character: add `{id, th}` to `CL.CHARS` and an entry in `CHAR_VIS` with the same id.
- Head hitbox is deliberately big (`headBox` in core) because chibi heads are big.

## client.js map

`Snd` (Web Audio synth, no samples) → graphics init, stadium dressing, voxel chunk meshing, particles, tracers →
objective objects → avatars (`makeAvatar` uses `CLX.makeChibi`) → chaos (`spawnRagdoll`, `updRagdolls`,
`spawnDeath`, popups) → input (keyboard/mouse/touch) → `Session` + host controller (`hostUpdate`, `startMatch`,
`adoptMatch`, `sessionTick`, `sendPresence`) → client match state (`clientMatch`, interpolation buffer, remote
shots) → local player (`playerUpdate`, firing, gadgets, specs, emotes) → camera/viewmodel → HUD → screens and
wiring → main loop.

Debug handle: `window.__cl` (GC state, Host, player, world, session, rags, pops, avatars, keys, mouse, press).

## Constraints when publishing as a claude.ai Artifact

- Scripts only from cdnjs/jsdelivr/unpkg; stylesheets only from Google Fonts; no fetch/XHR/WebSocket to other
  hosts; no iframes. Images and models must be embedded (data: URIs) or uploaded as artifact assets.
- `room` only connects signed-in viewers the platform admits; public-link visitors fall back to bots-only.
- `alert/confirm/prompt` and `window.print` do nothing.
- In `scripts/build.js`, `String.replace` must use a **function** replacement: the game code contains `$'`,
  which a string replacement would expand.

## Testing notes

- `three_stub.js` replaces THREE with a Proxy, so e2e tests cover logic, netcode and UI flow, never pixels.
  After visual changes, check `dist/mp-local.html` in a real browser.
- `room_mock.js` emulates the room API across tabs of one browser via BroadcastChannel (lobby + named rooms,
  4 KiB presence check, 4 s peer timeout).
- `npm run sim` prints match length, winners, kills and snapshot size for bot-only matches; `test/balance.js`
  runs 20 identical-loadout Platform Push matches to confirm neither side is favoured.

## Roadmap (suggested order)

1. **Playtest** `mp-local.html` with real graphics and fix anything visual (avatars, ragdolls, platform).
2. ~~Network adapter for hosting outside claude.ai~~ done: `src/net_ws.js` + `server/server.js`. Next: deploy
   the relay (see README) and playtest across real networks.
3. Game feel: recoil, hit sounds, weapon balance from playtests.
4. Structural collapse (unsupported blocks fall) and team revive.
5. Real 3D assets (glTF/GLB, CC0 packs such as Kenney or Quaternius) via `THREE.GLTFLoader`; embed or host them.
6. Split client.js into modules with a bundler (Vite) once the game no longer needs to be a single artifact file.
7. More modes (cards already exist in the mode list as "next phase").
