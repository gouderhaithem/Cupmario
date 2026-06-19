# CLAUDE.md — Life Quest (Pip's Run)

Guidance for Claude Code when working in this repo. Read this first, every session.

## What this is

A 2D pixel-art side-scrolling platformer. Player ("Pip") runs right across tile-based
levels, collects coins, stomps enemies, avoids pits, and reaches a flag to clear the level.
Runs in the browser on a single `<canvas>`. No backend.

## Tech stack (do not change without being asked)

- **Vite** — dev server + build. `npm run dev`, `npm run build`, `npm run preview`.
- **TypeScript** — strict mode. Everything is typed. Prefer `interface`/`type` over `any`.
- **Canvas 2D** — all rendering via `CanvasRenderingContext2D`. No WebGL, no DOM-based sprites.
- **Web Audio API** — all sound is synthesized at runtime (oscillators). No audio files.
- No game engine, no physics library. The physics is simple and hand-written on purpose.

## Golden rules

1. **Keep files small and single-responsibility.** One system per file (see structure below).
   If a file passes ~200 lines, consider splitting.
2. **Levels are data, not code.** Never hardcode a level inside game logic. Add/edit levels in
   `src/levels/*.json`. Adding a level = adding a JSON file + registering it in `levels.ts`.
3. **All gameplay constants live in `src/game/constants.ts`.** Never sprinkle magic numbers
   (gravity, tile size, speeds) through the code.
4. **The render layer never mutates game state.** `render.ts` reads state and draws. All state
   changes happen in `update()` functions.
5. **Fixed timestep.** Update logic at a fixed step; only rendering is tied to the frame rate.
   Do not couple physics to `requestAnimationFrame` delta directly.
6. **Type the data.** A `Level`, `Player`, `Enemy`, `Coin` all have interfaces in `types.ts`.
   When you change a shape, update the interface in the same edit.

## Project structure

```
src/
  main.ts              # bootstrap: get canvas, build game, start loop
  types.ts             # shared interfaces: Level, Player, Enemy, Coin, Keys, Skin
  game/
    constants.ts       # TILE, COLS, ROWS, GRAVITY, JUMP, SPEED, MAXFALL, palettes
    state.ts           # GameState object + screen enum ('title'|'play'|'levelup'|'gameover'|'win')
    level.ts           # buildLevel(cfg): turns a LevelConfig into a tile grid + entities
    levels.ts          # imports the JSON level configs into an ordered LEVELS array
    player.ts          # player update: input → velocity, jump, duck/fast-fall
    physics.ts         # AABB tile collision (collideX / collideY), solid() lookup
    enemy.ts           # enemy patrol AI + player/enemy collision (stomp vs hurt)
    coin.ts            # coin pickup detection
    flow.ts            # start / nextLevel / loseLife / reachFlag / win transitions
  engine/
    loop.ts            # fixed-timestep game loop (accumulator pattern)
    input.ts           # keyboard + touch button listeners -> Keys state
    audio.ts           # AudioCtx, beep(), sfx(name), startMusic()/stopMusic()
    camera.ts          # camera follow + clamp to world bounds
  render/
    render.ts          # top-level draw(state): bg -> tiles -> entities -> player -> hud
    background.ts      # parallax sky/hills/clouds; day vs night theme
    sprites.ts         # pixel drawing for Pip, enemies, coins, flag, tiles
    hud.ts             # coins / score / lives / level overlay (can be DOM or canvas)
  levels/
    level1.json        # day theme
    level2.json        # night theme
index.html
```

## Core mechanics & numbers (current design — keep consistent)

- **Tile size:** `TILE = 45` px. Grid is `COLS = 80` × `ROWS = 12`. World = `COLS*TILE` wide.
- **Viewport:** 960 × 540 canvas. Camera scrolls horizontally only; clamped to `[0, worldW-960]`.
- **Tile types:** `0` empty · `1` ground (solid, grass cap on top edge) · `2` brick platform (solid).
- **Physics:** `GRAVITY = 0.8`, `JUMP = -14.2`, `SPEED = 4.5`, `MAXFALL = 16`.
  - Move = horizontal velocity then `collideX`, then apply gravity, then vertical then `collideY`.
  - `onGround` is set true during `collideY` when landing on a solid tile.
  - Jump only fires when `onGround` and a latch flag prevents auto-rejump while held.
- **Down button:** on ground → duck (`crouch`, ×0.35 horizontal speed, squashed sprite);
  in air with downward velocity → fast-fall (boost vy up to `MAXFALL * 1.7`).
- **Player box:** `w = 34`, `h = 58`. Faces left/right (`face = -1 | 1`) for eyes/cap brim.
- **Coins:** circle-ish pickup test against player center; +100 score; per-level count resets.
- **Enemies:** patrol between `minX/maxX`, turn at walls and ledge edges.
  - Stomp (player falling, contact near enemy top) → kill enemy, bounce, +200.
  - Side/below contact while not in `hurt` invuln → lose a life.
- **Flag:** reaching `flagX` clears the level. If more levels remain → `levelup` screen;
  else → `win`. +500 bonus on clear.
- **Lives:** start 3 (heart HUD). Falling in a pit (`y > worldH + margin`) costs a life.
- **Best score:** persisted in `localStorage` under a single versioned key.

## Level JSON format

```jsonc
{
  "theme": "day", // 'day' | 'night' — drives background + (optionally) tile tint
  "flagCol": 76, // column index of the goal flag
  "pits": [
    [16, 18],
    [30, 32],
  ], // inclusive [startCol, endCol] gaps with no ground
  "plats": [
    [8, 6, 3],
    [5, 12, 2],
  ], // floating bricks: [row, startCol, length]
  "coins": [
    [16, 9],
    [17, 8],
  ], // [col, row] positions (row 0 = top)
  "enemyCols": [11, 26, 36], // columns to spawn a patrolling enemy on
}
```

`buildLevel` fills ground rows 10–11 everywhere except pit columns, stamps brick platforms,
places coins at tile centers, and spawns enemies (skipping any that land over a pit).

## Per-level cosmetics

- **Player skin** is chosen by level index from a `SKINS` array (hair / shirt / shirtHi / pants /
  shoe / brim colors). Level 1 = blue explorer; Level 2 = red-hair / green-shirt / purple-pants.
- **Background** switches on `theme`: day = blue gradient + sun + green hills; night = dark
  gradient + stars + moon + darker hills. Parallax layers scroll at fractions of camera X.

## Audio conventions

- Lazily create one `AudioContext` on first user gesture; resume it if suspended.
- `sfx(name)` is a switch over short oscillator envelopes. Names in use:
  `jump`, `coin`, `stomp`, `die`, `levelup`, `win`. Keep new SFX short (< 0.3s) and low-volume.
- Background music = a `setInterval` step sequencer over a note array, one track per level,
  gated so it only sounds while `screen === 'play'`. Always `stopMusic()` on screen change.
- Master gain ~0.5. Never play loud or overlapping long tones.

## Input conventions

- Keyboard: `←/A` left, `→/D` right, `↓/S` down, `Space/↑/W` jump. On non-play screens any of
  Space/Enter/→/↑/W advances (start or next level). `preventDefault` arrows + space.
- Touch: on-screen buttons (left, right, down, jump) using pointer events with `touch-action: none`.
- Input writes into a single `Keys` object; `player.ts` reads it. Never read DOM events inside update.

## Workflow expectations for Claude Code

- After any change, run `npm run build` (tsc) and fix type errors before declaring done.
- Add a new level by: create `src/levels/levelN.json`, import it in `levels.ts`, add a `SKIN`
  entry and (if new) a music track. Do not touch physics to add content.
- When adding a mechanic (e.g. moving platforms), add its data to the level JSON, its type to
  `types.ts`, its update to its own file under `game/`, and its drawing to `sprites.ts`.
- Prefer pure functions: `update(state, dt)` and `draw(ctx, state)`. State is one object.
- Commit in small, working increments. Keep `main` runnable at every commit.

## Online co-op (live-partner model)

A 2-player online mode exists alongside single-player (which is unchanged and
still the default). It is **"live-partner" co-op**, NOT shared-world:

- Both clients run their own full game on the **same level**; each streams its
  Pip's position to the peer, which draws it as a translucent buddy (`P1`/`P2`).
- **Separate** enemies, coins, deaths, and progression — nothing is authoritative.
- Transport: WebRTC via **PeerJS** (`peerjs` dep). The PeerJS public broker is
  used for **signaling only** (the handshake) — there is no game server. Host
  registers a 4-letter code; guest dials it; data then flows peer-to-peer.
- Files: `engine/net.ts` (transport + `NetMessage`), `engine/lobby.ts` (the
  `#ov-lobby` DOM overlay + Host/Join), `game/coop.ts` (glue: begin/sync/smooth).
  `state.coop` (`CoopState`) holds the partner snapshot the renderer reads.
- Entry: press `C` on the title. `screen` gains a `'lobby'` value.
- Upgrading to true shared-world co-op (P2 stomps the same enemies) would require
  extracting the per-player controller fields (coyote/jumpBuffer/latches/weapons/
  super…) off the global `state` and threading them through player/dash/wall/
  weapons — a deliberate, larger refactor. Not done.

## Non-goals (don't add unless asked)

- No analytics, no asset/image loading pipeline. No dedicated game server (the
  PeerJS broker does signaling only; see Online co-op above).
- No switch to an engine (Phaser/Pixi) or to React for the game canvas.
- No procedural level generation — levels are authored JSON.
