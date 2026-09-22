# SCRAMBLE mode: handoff

Read this file first. It summarizes design decisions made in a Claude chat session so work can continue in Claude Code.

## What SCRAMBLE is

- A **new game mode** added to the existing Phaser 3 brawler. Existing modes must keep working.
- Name: **SCRAMBLE** (from the Shibuya "scramble crossing"). Game UI is **English only**.
- Platform fighter, Brawlhalla-like line-art style, but an **enclosed stage (no ring-outs)**: walls on both sides, fall-through **one-way platforms**, win by damage.
- Design goal: every character is fun with **basic attacks only**. Skills are added later.
- Current test setup: **Nyx as P1**, a stationary **training dummy as P2**.

## Reference implementation

`scramble-training.html` is a working single-file prototype (greybox: characters drawn as boxes, no sprites yet).

- The **combat core** (everything from `const STAGE` through `class Game`) is engine-agnostic plain JS running at a **fixed 60 logic frames per second**. Port it as-is into the project (e.g. `src/modes/scramble/core.js`) rather than rewriting it.
- The Phaser scene in the same file is only a greybox renderer + debug tools. Replace the drawing with sprites, keep the tools.
- Debug tools to keep: hitbox/hurtbox view, frame meter, slow motion, pause + frame step, dummy modes, live movement tuning panel.

## Locked values (approved by playtesting)

```js
const PHYS = {
  gravity: 0.95, fallMax: 15, fastFall: 22,
  walk: 4.3, run: 6.8, groundAccel: 1.1, runAccelMul: 1.3, stopFric: 0.72,
  airAccel: 0.65, airMax: 6.2, airFric: 0.97,
  jumpV: -20, dJumpV: -18, jumpCut: -7,
  coyote: 6, buffer: 8, dashWindow: 14,
  width: 44, standH: 118, crouchH: 74,
  techWindow: 10, techLockout: 40, techFrames: 10, techRollFrames: 20, techRollSpeed: 7,
  knockdownFrames: 28,
};
```

Approved by the user: run speed (lowered from 8.2), jump height, hit feel (hitstop), tech system.

## Controls

A/D move, W/S aim, Space or K jump, J attack, L block (also tech), Shift or double-tap to run. S + jump on a platform drops through it.

## Nyx moveset (frame data lives in `MOVES`)

| Input | Move | Notes |
|---|---|---|
| J | Jab → Cross Slash → Finisher Thrust | 3-hit string, true combo |
| Side + J | Lunge Stab | travels forward; watch it doesn't replace running |
| Up + J | Rising Slash | launcher (knock up), jump-cancel on hit |
| Down + J | Low Sweep | crouch attack, pops up |
| J in air | Spin Slash | jump-cancel on hit |
| Side + J in air | Dive Thrust | floaty during active frames |
| Down + J in air | Plunge | active until landing, pogo bounce on hit |

## Systems in place

- Hitstop scales with damage; screen shake on heavy hits and launchers.
- Input buffer (8 frames) that pauses during hitstop.
- Cancels: 3-hit chain; on-hit cancel into a different move of the same kind (a move can't repeat in one string); jump cancel on launchers.
- Variable jump height, coyote time, fast fall, double jump.
- Anti-infinite: damage scaling, hitstun decay, juggle gravity scaling, one wall bounce per combo.
- Block: front only, grounded only, no chip damage.
- Knockdown: landing while in hitstun → lie down (invulnerable).
- **Tech**: press Block within 10 frames before landing. Neutral = tech in place, left/right = tech roll. Missed press = 40-frame lockout (anti-mash).
- Dummy options: Stand / Block / Jump, and Tech: Off / In place / Random.

## Art pipeline rules (Nyx sprites)

- Source clips come from Google Flow / Gemini video, 1280×720, white background.
- Clips must be **in-place animation** (no root motion); the code moves the character.
- Start every clip from a padded start frame with headroom (character ~40% of frame height): standing, air, and crouch versions exist.
- No slash trails or effects in clips; VFX are drawn in-engine.
- Only key poses are extracted and timed to the frame data (startup / active / recovery); clip length doesn't matter.
- Stray objects that are separate from the character are removed by keeping the largest connected component.

### Clip status

Approved and usable:
- idle (`88BA0F1A`), walk (`1D2FF48C`), run (`BE771313`)
- jump (`5E98B6E3`): anticipation, rise, apex, fall, land
- hitstun (`8B9DA536`, 0.5–3 s): recoil + stumble; remove the stray thrown knife

Usable but should be regenerated without trails:
- jab string (`8E6B8306`), lunge stab (`AFF23369`)

Still needed:
- knockdown fall + get-up (as two clips), double jump, Rising Slash, Spin Slash, Dive Thrust, Plunge, crouch + Low Sweep, block, tech roll

Put the video files in the repo under something like `assets/raw/nyx/` so they can be processed.

## Roadmap

1. ~~Greybox + basic moves~~ done
2. ~~Tune game feel~~ done
3. **Nyx sprites: extract key poses, remove background, build atlas, sync to frame data** ← current
4. Shibuya stage: split into parallax layers, platform collision separate from art, dynamic camera
5. Smarter dummy that attacks back (tests block, punish, player tech)
6. First skill
7. Human P2, then a second character

## Working agreement

- The user wants step-by-step guidance and ongoing advice on what adds fun vs. what breaks balance.
- Use correct technical terms and point out when a term is used incorrectly.
- Change one thing at a time and let the user playtest before moving on.
