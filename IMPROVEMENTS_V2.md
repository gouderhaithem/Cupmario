# Life Quest — Roadmap V2 (post-vertical-slice)

The V1 bible ([IMPROVEMENTS.md](./IMPROVEMENTS.md)) is **fully shipped** — phases
`0 → 7 → 9 → 10 → 11 → 12 → 8`. The Mario × Cuphead fusion exists end to end. V2
is about turning that working slice into a **finished game**: more content,
deeper combat, polish, and the quality bar to ship it.

> **Ground rules (unchanged from V1):** levels are data (`src/levels/*.json`),
> constants in `src/game/constants.ts`, render never mutates state, fixed
> timestep, types updated in `src/types.ts` in the same edit, one system per file,
> files < ~200 lines. No engine, no backend, no asset/image pipeline. Canvas-2D +
> synthesized audio only. Keep `main` runnable and `npm test` green every commit.

---

## Where we are today (the shipped slice — don't rebuild)

- **Campaign:** 3 run levels + 3 bosses, sequenced `L1 · L2 · ROOTKIT · L3 · SPECTRA · THE OVERCLOCK`. Run levels funnel straight into bosses (two-faced); a Boss Rush mode replays all three.
- **Combat:** permanent gun, 8-direction aim + gamepad twin-stick, dash (i-frames), 5 data-driven weapons with distinct EX moves, charge gun, parry (combat **and** traversal orbs), 5-card Super → MEGABLAST, 9 boss attack patterns, moving bosses with telegraphed charges + beams.
- **Platforming:** walker/shooter/flyer/turret enemies, `?`/weapon blocks, crumbling + moving platforms, checkpoints, pits, stomp-combo.
- **Meta:** letter grades (C→S+) with best grade **and** best time persisted per stage, stage select, assist mode, pause/settings (volume), colorblind cues.
- **Presentation:** parallax day/night backgrounds, per-level skins, vintage vignette + grain, boss READY?/FIGHT! + KO cards, per-phase boss music, animated grade reveal.
- **Code health:** `sprites/` + `overlays.ts` split (all files < ~200 lines), **37 Vitest tests** over the pure logic, single-pass projectile compaction.

The two **explicitly-deferred** V1 items, carried into V2: custom **key rebinds**
(descoped from 12.1) and the **pink coin-block** (the unbuilt half of the §0 hook).

---

## Roadmap (continues V1's numbering; do in order)

Effort: 🟢 small · 🟡 medium · 🔴 large.

---

### Phase 13 — Tune & verify (do this first)
**Goal:** the slice is *built* but barely *played*. Before adding content, make
what exists feel right and fix the rough edges surfaced during the build. Lowest
risk, highest confidence payoff.

| # | Item | Detail | Touches | Status |
|---|------|--------|---------|--------|
| 13.1 | **Playtest tuning pass** | Verify by hand: the level-2 parry-gap is reliably crossable, the `laserSweep` duck/platform window is fair, boss HP/cadence curves, campaign pacing. Fold findings into `constants.ts` (these were tuned by math, not feel) | `constants.ts`, level JSON | ⏳ in progress (human playtest) |
| 13.2 | **Fix the breather-card label** | The post-boss "LEVEL N / NEXT N" text is stale on boss stages — drive the clear card from the campaign stage, not `levelIndex` | `hud.ts`, `flow.ts` | ✅ shipped |
| 13.3 | **Reduced-motion + shake toggle** | Pause-menu options to dial down screen shake and disable the film-grain/vignette (motion sensitivity) | `state.ts`, `settings.ts`, `overlays.ts` | ✅ shipped |
| 13.4 | **Difficulty modes** | The §11 open call: ship **Normal + Expert** (faster bolts, tighter telegraphs) alongside Assist; pick on the title/stage-select | `state.ts`, `constants.ts`, menu | ✅ shipped |

> Ships when: a full campaign playthrough feels fair start-to-finish, the clear
> card reads correctly after a boss, and motion/difficulty options work.

**13.2–13.4 shipped (2026-06-14).** Clear card now reads from the campaign stage
(`flow.ts` sets `clearTitle`/`nextLabel`; `ROOTKIT DOWN! · NEXT · LEVEL 3`). Added
a persisted **reduced-motion** option (shake no-ops at source, vignette/grain
skipped in `render.ts`). Replaced the `assist` boolean with a `Difficulty`
enum (`assist`/`normal`/`expert`) in a pure `difficulty.ts` module — Expert
scales enemy bolts ×1.3 and tightens telegraphs ×0.7, gated behind a campaign
clear; pick it on stage-select (←/→) or the pause menu. 44 Vitest tests green.
**13.1 (feel tuning) still needs a human playthrough** before the phase closes.

---

### Phase 14 — Close the design-bible gaps
**Goal:** finish the two promised-but-unbuilt mechanics and the input gap, so
nothing in the original design is left dangling.

| # | Item | Detail | Touches |
|---|------|--------|---------|
| 14.1 | **Pink coin-block** (§0) | A parry-to-break block: jump-parry it mid-air to pop its reward. The other half of "Charge the Glitch" — parry as a *traversal/utility* verb on terrain, not just bolts/orbs | `parry.ts`, `blocks.ts`, `level.ts`, `types.ts` |
| 14.2 | **Custom key rebinds** | The descoped 12.1 item: a rebind screen writing a key→action map into `settings.ts`; `input.ts` reads the map instead of hard-coded sets | `input.ts`, `settings.ts`, menu |
| 14.3 | **Per-weapon parry feel** | Small: let a parry briefly buff the next shot (Cuphead's "parry → power") to tie the two systems together | `parry.ts`, `player.ts` |

> Ships when: a level ships a parry-break block, and every key is rebindable.

---

### Phase 15 — More content (the campaign is short)
**Goal:** three levels and three bosses is a demo, not a game. Author more — and
because levels are data, most of this is JSON + a sprinkle of new systems.

| # | Item | Detail | Touches |
|---|------|--------|---------|
| 15.1 | **3–4 new run levels** | New themes/skins/music; reuse every existing mechanic. Wire into `CAMPAIGN` | `levels/*.json`, `levels.ts`, `sprites/`, `audio.ts` |
| 15.2 | **A 4th boss (or two mid-bosses)** | New data-driven boss; maybe one short mid-boss between worlds to vary the rhythm | `levels/boss*.json`, `patterns.ts` |
| 15.3 | **One new weapon** | e.g. a boomerang/return shot or a short-range flamethrower — pure `weapons.ts` config + any new bolt behavior | `weapons.ts`, `projectile.ts` |
| 15.4 | **A secret / branching path** | Reward exploration: a hidden parry-gated room with a bonus or an alt route. Leans on 14.1 | level JSON, `flow.ts` |

> Ships when: the campaign is ≥ 6 run levels + 4 bosses and still builds/tests green.

---

### Phase 16 — Deeper combat & hazards
**Goal:** widen the verb set so new levels don't feel like reskins.

| # | Item | Detail | Touches |
|---|------|--------|---------|
| 16.1 | **2–3 new enemy types** | e.g. a shielded foe (only EX/parry breaks it), a charger, a splitter | `enemy.ts`, `types.ts`, `sprites/enemies.ts` |
| 16.2 | **Environmental hazards** | Spikes, falling icicles, conveyor tiles, wind zones — data-driven like pits/orbs | `level.ts`, `types.ts`, level JSON |
| 16.3 | **2 new boss patterns** | Keep the pattern library growing (e.g. a homing-orb spiral, a safe-zone "stand in the gap" attack) | `patterns.ts` |
| 16.4 | **Parry-gate variety** | Chained parry orbs, timed parry sequences, a parry-only boss phase | `parry.ts`, `patterns.ts`, level JSON |

> Ships when: a new level can be built from a meaningfully larger toolbox.

---

### Phase 17 — Presentation, audio & mobile
**Goal:** make it *feel* like a release — sound, transitions, and a great phone
experience (it's a browser game; mobile matters).

| # | Item | Detail | Touches |
|---|------|--------|---------|
| 17.1 | **Audio mixer + more tracks** | Separate SFX/music volume; per-area themes; ramp music intensity in boss late phases (already partway via tempo) | `audio.ts`, `settings.ts`, menu |
| 17.2 | **Stage transition wipes** | A short canvas wipe/iris between stages instead of a hard cut; an intro/story card before the campaign | `render/overlays.ts`, `flow.ts` |
| 17.3 | **Responsive canvas + touch polish** | Scale the canvas to the viewport, safe-area insets, larger/relocatable touch buttons, landscape lock hint | `style.css`, `index.html`, `main.ts` |
| 17.4 | **PWA / offline** | Manifest + service worker so it installs and runs offline (no backend — fits the rules) | new `manifest`, `sw.ts`, `index.html` |

> Ships when: it plays well on a phone, installs as a PWA, and stages transition cleanly.

---

### Phase 18 — Quality, CI & ship
**Goal:** lock quality in and put it somewhere people can play.

| # | Item | Detail | Touches |
|---|------|--------|---------|
| 18.1 | **Expand test coverage** | Beyond pure logic: the boss state machine (phase transitions, telegraph→fire), parry resolution, `flow` stage sequencing, mushroom/weapon unlocks | `*.test.ts` |
| 18.2 | **Smoke/E2E boot test** | A headless test that boots the game, starts a run, and survives N frames without throwing | `*.test.ts` or Playwright |
| 18.3 | **CI pipeline** | GitHub Actions: `npm ci && npm test && npm run build` on push/PR | `.github/workflows/` |
| 18.4 | **Versioned save + export/import** | Namespace/version the `localStorage` keys; add "reset progress" and export/import of grades/times in the pause menu | `settings.ts`, `grade.ts`, `flow.ts` |
| 18.5 | **Deploy** | Static host (GitHub Pages / Netlify) wired to CI | config |

> Ships when: CI is green on every push and the game is live at a URL.

---

## Open design calls (V2)

| Question | Leaning |
|----------|---------|
| How long should the full game be? | ~8–10 run levels + 4–5 bosses — a tight 60–90 min run, replayable for grades. |
| Story, or pure arcade? | A light framing (intro card + a line per boss) — cheap, adds flavor, no cutscene tech. |
| Leaderboards? | Stays **client-side** (export/import codes) to honor the no-backend rule; revisit only if that rule ever relaxes. |
| Expert mode unlock? | Unlock after one full campaign clear (rewards finishing). |

## Non-goals (still hold)

No game engine (Phaser/Pixi), no React for the canvas, no server/analytics, no
procedural level generation, no image/asset pipeline. If a feature needs any of
those, it's out of scope by design.

---

**Where to start:** **Phase 13** — play the game and tune it. Everything built in
V1 was verified by `tsc` and unit tests, but the *feel* (parry-gap, laser window,
difficulty curve, pacing) hasn't been validated by a human. Confidence in the
slice should come before pouring new content on top of it.
