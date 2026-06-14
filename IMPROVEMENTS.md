# Life Quest — Mario × Cuphead Design Bible

The plan to turn **Pip's Run** into a hybrid that runs and platforms like Mario
but *fights* like Cuphead — bullet-hell bosses, parries, a weapon roster, and a
letter-grade score chase that makes every level worth replaying.

> **Ground rules (unchanged):** levels are data (`src/levels/*.json`), constants
> live in `src/game/constants.ts`, render never mutates state, fixed timestep,
> types updated in `src/types.ts` in the same edit, one system per file under
> `src/game/`. No engine, no backend, no asset pipeline.

---

## 0. The signature hook (what makes *this* game, not a clone)

Two ideas fuse the genres instead of bolting them together:

### 🎯 "Charge the Glitch" — parry-fueled platforming

Every dangerous thing has a **pink variant** you can parry (jump at the moment of
contact). Parries fill a **Super meter** *and* are sometimes the **only way
forward**: a pink enemy bolt parried mid-air becomes a double-jump; a pink coin
block must be parried to break. This makes Cuphead's parry a *traversal* verb,
not just a combat one — that's the Mario fusion.

> ✅ **Shipped (Phase 0):** **parry orbs** — pink hazards floating over a
> too-wide gap. Tap jump on one mid-air to deflect it, bounce, and launch
> forward across the gap; armed orbs hurt on contact and go dormant briefly
> after a parry. Live in level 2 (`parryOrbs` in the JSON). The parry is now a
> traversal verb. *Still open:* parry-to-break pink coin blocks.

### 🌗 "Two-faced levels" — the run *is* the boss intro

Each run level ends by funnelling Pip into the boss arena **without a loading
screen** — the camera locks, the music swells, the boss drops in. The platforming
geometry you just learned becomes the arena floor. Mario's level *flows into*
Cuphead's fight.

---

## 1. Where we are today (don't rebuild)

Already shipped: coyote time, jump buffering, jump-cut, fast-fall, crouch,
screen shake, hitstop, horizontal/vertical moving platforms, `walker` + `shooter`
enemies, mushroom→`armed` shooting, player/enemy projectiles, 3 themed levels
with per-level skins + music.

We **reuse** all of it. The projectile system becomes the bullet-hell engine; the
mushroom power becomes the permanent gun; shake/hitstop become boss-impact juice.

---

## 2. Run-and-gun core — make shooting central

Cuphead's whole feel is *aim while you dodge*. Shooting must be permanent and
omnidirectional.

| # | Feature | Detail | Touches |
|---|---------|--------|---------|
| 2.1 | **Permanent gun** | Drop "lose gun on hit". `armed` defaults true; mushrooms now upgrade the *weapon* instead | `player.ts`, `flow.ts`, `types.ts` |
| 2.2 | **8-direction aim** | ↑ + fire = up; ↑ + → = up-diagonal; ↓ in air = down (pogo). Hold **Lock** key to root in place and aim freely | `input.ts`, `player.ts`, `projectile.ts` |
| 2.3 | **Dash** | Horizontal burst, `DASH_SPEED 11`, `DASH_FRAMES 9`, `DASH_IFRAMES 7`, `DASH_CD 28`. Cancels into jump | new `game/dash.ts`, `constants.ts` |
| 2.4 | **Pogo / down-shot** | Firing down in air bounces Pip off enemies & pink hazards (Cuphead's plane pogo) | `player.ts`, `projectile.ts` |

```ts
// constants.ts — proposed
export const DASH_SPEED = 11;
export const DASH_FRAMES = 9;     // active dash duration
export const DASH_IFRAMES = 7;    // invulnerable window inside the dash
export const DASH_CD = 28;        // cooldown frames
export const AIM_LOCK = true;     // hold-to-aim enabled
```

---

## 3. Weapon roster (pick 2, switch live)

Cuphead's identity = distinct guns with trade-offs. Make weapons **data**, so a
new gun is a config entry, not new code.

```ts
// types.ts
export interface Weapon {
  id: 'peashot' | 'spread' | 'lobber' | 'charge' | 'homing';
  name: string;
  damage: number;
  fireRate: number;   // frames between shots
  speed: number;      // px/frame
  spread?: number;    // # of pellets / cone angle
  arc?: boolean;      // gravity-affected lob
  homing?: boolean;
  pierce?: boolean;
}
```

| Weapon | Feel | Trade-off |
|--------|------|-----------|
| **Peashot** | Straight, fast, reliable | Low damage |
| **Spread** | Shotgun cone, huge close DPS | Useless at range |
| **Lobber** | Arcs over cover, big hit | Slow, hard to aim |
| **Charge** | Hold to release a piercing nuke | Must stop firing to charge |
| **Homing** | Auto-tracks, safe | Lowest DPS |

Mushrooms (existing drop) now **unlock/swap** weapons instead of toggling
`armed`. Carry the equipped pair between levels (your existing "power persists"
behavior — keep it).

---

## 4. The parry + Super system (Cuphead's soul)

| # | Feature | Detail | Touches |
|---|---------|--------|---------|
| 4.1 | **Parryable tag** | Pink tint on bolts/objects; `parryable: true` | `types.ts`, `projectile.ts`, `sprites.ts` |
| 4.2 | **Parry window** | Jump-press while overlapping a parryable → bounce (`STOMP_BOUNCE`), no damage, +1 meter card, "DING!" sfx | new `game/parry.ts`, `player.ts` |
| 4.3 | **Super meter** | 5 cards. Parry = +1, kills = fractional. Spend on EX moves or a screen-clear Super | `state.ts`, `hud.ts` |
| 4.4 | **EX / Super moves** | 1 card = stronger weapon shot; 5 cards = `MEGABLAST` clears all bolts + big boss damage | `projectile.ts`, `player.ts` |
| 4.5 | ✅ **Parry-traversal** | Pink **parry orbs** float over a too-wide gap; tap jump on one mid-air to bounce + launch forward across it. Armed orbs hurt on contact, go dormant after a parry. Authored via `parryOrbs` in level JSON | `parry.ts`, `orbs.ts`, `level.ts`, `sprites.ts` |

```ts
// state additions
superCards: number;   // 0..5
superMax: 5;
```

---

## 5. Bosses — the headline feature

A boss closes each world. Patterns are **small pure functions**; a boss is **data
+ a phase list**. Start with one complete 3-phase boss, then bosses are mostly JSON.

### Data shape

```jsonc
// src/levels/boss1.json
{
  "kind": "boss",
  "theme": "night",
  "arenaCols": 21,            // tight, mostly-fixed camera
  "floorPlats": [[9,2,4],[7,8,3],[9,15,4]],
  "boss": {
    "name": "ROOTKIT, the Buried King",
    "hp": 36,
    "phases": [
      { "toHpPct": 66, "cadence": 70, "patterns": ["spitArc", "summonWalkers"] },
      { "toHpPct": 33, "cadence": 55, "patterns": ["boltFan", "groundPound"] },
      { "toHpPct": 0,  "cadence": 40, "patterns": ["boltFan", "laserSweep", "pinkRain"] }
    ]
  }
}
```

### Attack pattern library (`game/patterns.ts`)

Each returns projectiles/effects; reuse the existing `Projectile` system.

| Pattern | Behavior | Counter |
|---------|----------|---------|
| `spitArc` | Lobbed shots in a parabola | Walk under / dash |
| `boltFan` | 5-way spread from boss | Gap-jump or dash through |
| `groundPound` | Boss slams → shockwave along floor | Jump on impact |
| `laserSweep` | Horizontal beam sweeps the arena | Duck / platform up |
| `pinkRain` | Falling bolts, **every 3rd is pink** | Parry the pink for meter |
| `summonWalkers` | Spawns 2 walkers as adds | Stomp them |
| `chargeDash` | Boss telegraphs, then dashes across | Jump over on the flash |

### Named boss lineup (proposed arc)

1. **ROOTKIT, the Buried King** — earth/glitch theme, ground-pounds & adds. *(Tutorial boss — teaches dodging + parry.)*
2. **SPECTRA, the Static Wraith** — night/electric, laser sweeps & teleports. *(Teaches vertical movement.)*
3. **THE OVERCLOCK** — final boss, 4 phases, every prior pattern + a bullet-hell finale. *(Mastery check.)*

### Boss flow

Final run level's flag → camera locks → `screen = 'boss'` → boss death → KO card
→ `levelup` or `win`. A **"You got this far →"** retry screen shows boss HP% on
death (Cuphead's motivator).

| Touches | |
|---|---|
| `types.ts` | `Boss`, `BossPhase`, `'boss'` screen/kind |
| new `game/boss.ts` | HP, phase transitions, telegraphs, pattern scheduler |
| new `game/patterns.ts` | the pure pattern functions above |
| `flow.ts` | enter/exit boss, KO card, retry |
| `hud.ts` | boss HP bar + phase pips |

---

## 6. Fairness & feel — so "hard" reads as "fair"

Cuphead is punishing *and* beloved because death is always your fault and retries
are instant.

| # | Feature | Detail | Touches |
|---|---------|--------|---------|
| 6.1 | **Health tiers** | 3 HP per life; hit = -1 + i-frames, not instant death | `types.ts`, `player.ts`, `hud.ts` |
| 6.2 | **Telegraphs** | Every boss/shooter attack flashes/winds up before firing | `boss.ts`, `enemy.ts`, `sprites.ts` |
| 6.3 | **Instant retry** | Death on a boss → respawn at arena start in <1s, no menu | `flow.ts`, `state.ts` |
| 6.4 | **Checkpoints** | `checkpointCols: number[]` in run levels | `level.ts`, `flow.ts`, `types.ts` |
| 6.5 | **Assist mode** | Optional: +1 HP, slower bolts. Locks out S-rank | `state.ts`, `constants.ts` |

---

## 7. Score, grades & replay (the hook that keeps players)

Cuphead grades every fight. Add a **letter grade** per level/boss to drive replay.

```ts
// flow.ts — grade inputs
interface RunStats {
  timeMs: number;
  hitsTaken: number;
  parries: number;
  superUsed: number;
  coinsPct: number;   // collection %
}
// Grade: time + no-hit + parries + coins → C / B / A / S / S+
```

- **No-hit clear** = automatic A or better.
- **Parry count** gates S / S+ (encourages engaging the pink mechanic).
- Persist best grade per level in `localStorage` (extend your existing best-score key).
- Show grade on the KO/win card with a tally animation.

---

## 8. Variety pack (sprinkle across worlds)

| Feature | Detail | Touches |
|---------|--------|---------|
| **Flyer enemy** | Sine-wave path; only killed from above or by shots | `EnemyKind`, `enemy.ts`, `sprites.ts` |
| **Turret enemy** | Stationary, fires aimed bursts (mini-Cuphead-blocker) | `enemy.ts` |
| **Crumbling platforms** | Fall ~20 frames after you stand | mover behavior, `sprites.ts` |
| **`?` / breakable blocks** | Tile `3`, hit from below → coin/weapon | `level.ts`, `physics.ts`, `sprites.ts` |
| **Stomp-chain combo** | 200→400→800 without landing | `enemy.ts`, `state.ts` |
| **Per-level timer + bonus** | Leftover time → score | `state.ts`, `hud.ts` |

---

## 9. Presentation (Cuphead charm, canvas-only)

No asset pipeline, so we *stylize* rather than hand-draw:

- **KO / READY cards**: "WALLOP!", "A KNOCKOUT!", grade reveal with a tally.
- **Vintage filter**: subtle vignette + faint film-grain drawn in canvas; sepia
  flash on boss intro.
- **Punchy new SFX** (synth, keep <0.3s): `dash`, `parry` (bright ding), `super`,
  `bossPhase`, `bossHurt`, `koCard`.
- **Bigger juice on parries & phase changes**: color flash + chunkier `Pop`s +
  a beat of hitstop.
- **Per-boss music track** (extend the `TRACKS` step-sequencer) with a tempo
  bump each phase.

---

## 10. Build order (each step ships green & keeps `main` runnable)

1. ✅ **Run-and-gun core** (§2) — permanent gun, 8-dir aim (hold **K**), **Shift** dash w/ i-frames. *Done.*
2. ✅ **Health tiers + instant retry** (§6.1, 6.3) — 3 HP per life, hit = −1 HP + i-frames. *Done.*
3. ✅ **Parry + Super** (§4) — pink bolts, jump-parry → bounce + card, **J** = EX shot / MEGABLAST. *Done.*
4. ✅ **First boss: ROOTKIT** (§5) — finale arena after level 3: 3 phases, 5 patterns
   (`spitArc`, `boltFan`, `groundPound`, `summonWalkers`, `pinkRain`), telegraphed
   attacks, boss HP bar + phase pips, instant retry, KO → win. *Done.*
5. ✅ **Weapon roster** (§3) + **grades** (§7) — 5 data-driven guns
   (peashot/spread/lobber/charge/homing), **Q/E** to switch, mushrooms unlock the
   next; letter grades C→S+ (no-hit + parries gate S), best grade persisted per
   stage and shown on the clear card. *Done.*
6. ✅ **Variety + polish** (§8, §9) — flyer + turret enemies, `?`/weapon blocks
   (tiles 3/4/5) bumped from below, crumbling platforms, stomp-chain combo
   (200→400→800…), per-level timer + leftover-time bonus; vignette + film-grain
   filter, boss **READY?/FIGHT!** intro card, per-phase boss music tempo. *Done.*

> Recommended first PR: **§2.1 + §2.3 + §2.2** (permanent gun, dash, up-aim).
> Smallest change with the biggest "this is a different game now" payoff.

> **STATUS (all shipped):** Steps 1–6 are complete and `main` builds green
> (`npm run build`). The full Mario × Cuphead vertical slice is playable:
> run-and-gun, dash, parry/Super, 5 weapons, a 3-phase boss, letter grades, and
> the variety + presentation pack. Everything below (§12) is the next horizon.

---

## 11. Open design calls

| Question | Recommendation |
|----------|----------------|
| Lives vs. infinite retries? | **Infinite retries on bosses**, lives on run levels — best of both. |
| Boss-to-level ratio? | ~1 boss per 2 run levels; finale is boss-only. |
| Keyboard aiming? | **Hold-to-lock aim** beats free twin-stick on keyboard. Gamepad later. |
| Difficulty modes? | Ship **Normal + Assist**; reserve a hidden **Expert** (Cuphead's "Regular/Simple") for post-launch. |

---

*Everything here reuses existing systems — projectiles become bullet-hell,
mushrooms become weapon unlocks, shake/hitstop become boss impact. No engine
swap, no backend, no image assets. Pure canvas-2D + synthesized audio, as built.*

---

## 12. Next horizons — phased roadmap (continues the build order)

The vertical slice (steps 1–6) is done. The work below is sequenced into
**phases 7–12**, each a self-contained batch that ships green and keeps `main`
runnable — same rule as the build order. Do them **in order**: each phase
unblocks the next. Effort: 🟢 small · 🟡 medium · 🔴 large.

---

### Phase 0 — Signature hook: parry-traversal ✅ (shipped)
**Goal:** realize the §0 "Charge the Glitch" fusion — make the parry a *traversal*
verb, not just a combat one. **Done.** Pink **parry orbs** (`orbs.ts`) float over a
too-wide gap (live in level 2); tap jump on one mid-air to deflect + launch forward
across it. Armed orbs damage on contact and go dormant after a parry. Authored via
`parryOrbs` in level JSON — no new physics beyond a forward launch. *Open follow-up:*
parry-to-break pink coin blocks (the other §0 idea).

---

### Phase 7 — Make the boss *great* ✅ (shipped)
**Goal:** the fight we have should feel alive before we add more bosses. No new
systems — pure extensions of `boss.ts` / `patterns.ts`. Lowest risk, highest feel.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 7.1 ✅ **Two more patterns** | `laserSweep` (telegraphed full-width beam — duck under via crouch or stand on a platform) + `chargeDash` (telegraph flash, then descend + charge across — jump it) | `patterns.ts`, `projectile.ts`, `sprites.ts` | 🟢 |
| 7.2 ✅ **Boss movement** | Hovers and drifts to track the player (no more static target); descends to the floor and sweeps across during `chargeDash`, then rises back | `boss.ts` | 🟡 |
| 7.3 ✅ **Phase-3 finale mix** | `chargeDash` added to phase 2; `chargeDash` + `laserSweep` join phase 3's mix for a real spike | `boss1.json` | 🟢 |

> ✅ Ships when: ROOTKIT moves and uses **7 patterns** across 3 phases, build
> green. **Done** — beam reuses the projectile system (`beam`/`warn`/`life`),
> the charge reuses the boss-contact path; a crouch now lowers Pip's profile
> under the beam (`CROUCH_DUCK`).

---

### Phase 8 — Code health ✅ (shipped — ran LAST, after Phase 12)
**Goal:** pay down size/test debt against the finished surface. Done last (by
request) so the splits/tests cover the final code, not a moving target. Build
order ran **0 → 7 → 9 → 10 → 11 → 12 → 8**.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 8.1 ✅ **Split `sprites.ts` (575 lines)** | → `sprites/{util,tiles,enemies,fx,boss,player}.ts` + a barrel `index.ts`; importers (`render.ts`, `background.ts`) unchanged. Each file now < 200 lines | `render/sprites/` | 🟢 |
| 8.2 ✅ **Split `render.ts` draw()** | Pulled the pause menu, vintage filter, boss intro/KO cards, stage-select, and boss HUD into `render/overlays.ts`. `render.ts` 353 → 167 lines | `render/overlays.ts` | 🟢 |
| 8.3 ✅ **Test harness** (Vitest) | `vitest` + `npm test`; **37 tests** across grade rubric, `buildLevel`/arena, physics collision, weapon roster, campaign/boss-rush wiring, projectile compaction | `*.test.ts`, `package.json` | 🟡 |
| 8.4 ✅ **Projectile churn** | Replaced the per-frame backward-`splice` removal (≈O(n²) when a volley clears at once) with a single-pass in-place compaction. *Full object pooling was evaluated and intentionally not adopted* — invasive across every spawn site, stale-field bug risk, marginal gain at this scale | `projectile.ts` | 🟡 |

> ✅ Ships when: no file > ~250 lines, `npm test` green with meaningful coverage.
> **Done** — largest source file is now `overlays.ts` at 200 lines; 37 tests pass.

---

### Phase 9 — Finish the signature mechanics the design promised ◀ NEXT
**Goal:** close the gaps between the design bible and the build. These are what
make it *this* game, not a clone.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 9.1 ✅ **Parry-traversal gaps** (§4.5) | Done in Phase 0 — pink **parry orbs** gate a too-wide gap in level 2; tap jump mid-air to bounce across. `parryOrbs` in level JSON, new `orbs.ts` | `parry.ts`, `orbs.ts`, `level.ts`, `types.ts` | 🟡 |
| 9.2 ✅ **Checkpoints** (§6.4) | `checkpointCols` posts (2 per level); touch one to light it + move the respawn point. A lost life resumes there, lit posts persist across deaths. New `checkpoint.ts`, `checkpoint` sfx | `level.ts`, `flow.ts`, `state.ts`, `types.ts` | 🟡 |
| 9.3 ✅ **Spread range falloff** | `Weapon.range` → `Projectile.ttl`: SPREAD pellets fizzle after ~17 frames (~130px), making it a real close-range shotgun | `projectile.ts`, `weapons.ts`, `player.ts` | 🟢 |
| 9.4 ✅ **Per-weapon EX moves** | EX shot now dispatches by gun: peashot lance, spread wide buckshot, lobber heavy bombs, charge giant beam, homing missile volley — each with its own damage/shape | `super.ts`, `weapons.ts` | 🟡 |

> ✅ Ships when: a level has a parry-only gap + a working checkpoint, build
> green. **Done** — parry gap (level 2) from Phase 0; checkpoints in all 3 run
> levels; SPREAD has a range trade-off; all 5 guns have distinct EX moves.

---

### Phase 10 — Expand the boss arc ✅ (shipped)
**Goal:** cash in the data-driven boss design now that it moves and has 9 patterns.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 10.1 ✅ **SPECTRA, THE LIVE WIRE** (boss 2) | 42 HP, 3 phases built on `laserSweep` + the new `teleport` (blink + swap hover height → forces up/down aiming, "teaches vertical movement") | `boss2.json`, `levels.ts` | 🟡 |
| 10.2 ✅ **THE OVERCLOCK** (final) | 54 HP, **4 phases**, every prior pattern + the new `ringBurst` (full-circle bullet-hell) as the phase-4 finale; wider 23-col arena | `boss3.json`, `patterns.ts` | 🟡 |
| 10.3 ✅ **Boss-to-level cadence** | New `CAMPAIGN` sequence (L0 · L1 · ROOTKIT · L2 · SPECTRA · OVERCLOCK) driven by `state.stageIndex`. A level that precedes a boss funnels straight into the arena (§0 two-faced); a boss is followed by a breather grade-card | `levels.ts`, `flow.ts`, `state.ts`, `boss.ts` | 🟡 |

> ✅ Ships when: 3 bosses reachable in sequence, each graded, build green.
> **Done** — two new patterns (`teleport`, `ringBurst`), bosses graded per
> `boss${i}` key, campaign is data in `levels.ts`. **9 boss patterns** total.

---

### Phase 11 — Replay & meta ✅ (shipped)
**Goal:** give players a reason to come back once there's a campaign to replay.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 11.1 ✅ **Stage select** | New canvas `'select'` screen (press ↓/S from title/gameover/win). Lists every campaign stage with its best grade + time; stages unlock up to the furthest reached (`-progress` key). Pick one to replay for a better grade | `select.ts`, `flow.ts`, `render.ts`, `input.ts` | 🟡 |
| 11.2 ✅ **Persist best *time* per stage** | `bestTimeFor`/`readBestTime` (`-time-<stage>` key), min ticks; shown on the clear cards next to best grade | `grade.ts`, `hud.ts`, `index.html` | 🟢 |
| 11.3 ✅ **Animated grade tally** | The freshly-earned grade **stamps in** on the clear card; best grade + time fade in just after (pure CSS) | `style.css` | 🟢 |
| 11.4 ✅ **Boss Rush** | A `BOSS_RUSH` sequence + `state.mode`; all flow is sequence-agnostic via `sequenceOf(state)`. Selectable from stage select — every boss back-to-back | `levels.ts`, `flow.ts`, `state.ts` | 🟡 |

> ✅ Ships when: you can pick a stage, see best grade + time, and run Boss Rush.
> **Done** — input now routes raw keys through `handleMenuKey` so the menu is
> navigable; progress + best-time persist in `localStorage`.

---

### Phase 12 — Accessibility, input & options ✅ (shipped)
**Goal:** broaden who can play and how. Best done last — it's cross-cutting and
benefits from stable content.

| Item | Detail | Touches | Effort |
|------|--------|---------|--------|
| 12.1 ✅ **Pause + settings menu** | **P/Esc** (or gamepad Start) freezes the game and opens a canvas menu: Resume · Assist toggle · Volume slider · Quit to title. Settings persist | `input.ts`, `flow.ts`, `state.ts`, `render.ts`, `settings.ts` | 🟡 |
| 12.2 ✅ **Assist mode** (§6.5) | `+ASSIST_BONUS_HP` HP, enemy bolts ×`ASSIST_BOLT_MULT` slower, and S/S+ grades locked to A. Toggle in the pause menu, persisted | `state.ts`, `constants.ts`, `grade.ts`, `projectile.ts` | 🟡 |
| 12.3 ✅ **Colorblind-safe cues** | Parryables now wear a white ring + spark-cross so "parry me" reads from shape/luminance, not pink hue alone | `sprites.ts` | 🟢 |
| 12.4 ✅ **Gamepad support** | Full pad mapping (sticks/d-pad, A jump, X fire, B dash, Y switch, bumpers lock/super, Start pause) **+ right-stick twin-stick aim** feeding `aimVector`; d-pad/A navigate menus | `input.ts`, `player.ts`, `main.ts` | 🟡 |

> ✅ Ships when: pause works, Assist is selectable, and a pad can play the game.
> **Done** — rebinds were the one sub-item descoped (note below); everything
> else persists via the new `settings.ts`.

*Rebinds (custom key mapping) are the only deferred sub-item — the menu has the
hooks (it's data-driven) but no rebind UI yet. Low priority vs. gamepad support.*

---

### Build order recap

Shipped: **0 → 7 → 9 → 10 → 11 → 12**. Remaining: **Phase 8 (code health)** — the
deliberately-deferred final pass (split `sprites.ts`/`render.ts`, add a Vitest
harness, projectile pooling), now run against the finished surface.
