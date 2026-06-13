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
| 4.5 | **Parry-traversal** | Some gaps only crossable by parrying a pink hazard mid-air (see hook §0) | `parry.ts`, `level.ts` |

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

1. **Run-and-gun core** (§2) — permanent gun, 8-dir aim, dash. *Feels new instantly.*
2. **Health tiers + instant retry** (§6.1, 6.3) — survivable bullet-hell.
3. **Parry + Super** (§4) — now it's unmistakably Cuphead.
4. **First boss: ROOTKIT** (§5) — one boss, 3 phases, 4 patterns = a full vertical slice.
5. **Weapon roster** (§3) + **grades** (§7) — depth + replay.
6. **Variety + polish** (§8, §9) — ongoing.

> Recommended first PR: **§2.1 + §2.3 + §2.2** (permanent gun, dash, up-aim).
> Smallest change with the biggest "this is a different game now" payoff.

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
