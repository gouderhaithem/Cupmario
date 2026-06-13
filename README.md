# Life Quest — Pip's Run

A 2D pixel-art side-scrolling platformer that runs in the browser on a single
`<canvas>`. Run right across tile-based levels, collect coins, stomp glitches,
avoid pits, and reach the flag. **Vite + TypeScript + Canvas 2D**, no engine,
no asset files (audio is synthesized at runtime).

See [`CLAUDE.md`](./CLAUDE.md) for architecture and gameplay numbers, and
[`PROMPTS.md`](./PROMPTS.md) for the build script this project was made from.

## Run

```bash
npm install
npm run dev      # dev server with hot reload
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # preview the production build
```

## Controls

- **← → / A D** — move · **Space / ↑ / W** — jump · **↓ / S** — duck (ground) / fast-fall (air)
- On-screen touch buttons for mobile; tap or Space/Enter advances menus.

## Structure

```
src/
  main.ts            bootstrap, scaling, fixed-step update orchestration
  types.ts           shared interfaces
  game/              constants, state, level builder, physics, player, enemy, coin, flow
  engine/            loop (fixed timestep), input, audio (synth), camera
  render/            render, background, sprites, hud
  levels/            level1.json (day), level2.json (night)
```

Levels are data: add `src/levels/levelN.json`, register it in
`game/levels.ts`, and add a skin (`game/constants.ts`) + music track
(`engine/audio.ts`). No physics changes needed.
