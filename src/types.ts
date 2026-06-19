// Shared data shapes for Life Quest. When a shape changes, update it here in
// the same edit (golden rule #6).

export type Screen = 'title' | 'play' | 'levelup' | 'gameover' | 'win' | 'boss' | 'select';

/** Which sequence drives the run: the full campaign or a bosses-only rush. */
export type GameMode = 'campaign' | 'bossrush';

/**
 * Difficulty tier (§12.2 / §13.4). `assist` eases the game (+HP, slower bolts,
 * S-rank locked); `normal` is the default; `expert` tightens it (faster bolts,
 * shorter telegraphs) and unlocks only after a full campaign clear.
 */
export type Difficulty = 'assist' | 'normal' | 'expert';

/**
 * Art-direction style. Purely visual — physics, levels, and difficulty are
 * identical in both. `cuphead` keeps the vintage 1930s-cartoon grade (sepia
 * wash + vignette + film grain); `mario` strips the post-FX for a clean, bright
 * pixel look. Chosen at boot via the `?style=` URL param, then remembered.
 */
export type Style = 'mario' | 'cuphead';

// Biome themes. Each drives a distinct background (sky/backdrop/celestial) and
// tile palette via THEMES in render/themes.ts — so levels stop looking alike.
//   day     — bright meadow (level 1 intro)
//   night   — moonlit hills (boss arenas)
//   cavern  — underground: dark sky, crystals, stone tiles (level 2)
//   foundry — industrial: smoggy sky, girders, metal grating (level 3)
export type Theme = 'day' | 'night' | 'cavern' | 'foundry';

/** Player outfit colors, chosen by level index from the SKINS array. */
export interface Skin {
  hair: string;
  shirt: string;
  shirtHi: string;
  pants: string;
  shoe: string;
  brim: string;
}

/** Raw, authored level data (the JSON files under src/levels). */
export interface LevelConfig {
  theme: Theme;
  /** Column index of the goal flag. */
  flagCol: number;
  /** Inclusive [startCol, endCol] gaps with no ground. */
  pits: Array<[number, number]>;
  /** Floating brick platforms: [row, startCol, length]. */
  plats: Array<[number, number, number]>;
  /** Coin positions: [col, row] (row 0 = top). */
  coins: Array<[number, number]>;
  /** Columns to spawn a patrolling enemy on. */
  enemyCols: number[];
  /** Columns to spawn a shooting "Spitter" enemy on. Optional. */
  shooterCols?: number[];
  /** Columns to spawn a sine-wave flying "Drone" on. Optional. */
  flyerCols?: number[];
  /** Columns to spawn a stationary "Turret" on. Optional. */
  turretCols?: number[];
  /** Columns to spawn a stationary "Mortar" (lobs arcing shells) on. Optional. */
  mortarCols?: number[];
  /** Columns to spawn a flying "Bomber" (drops gravity bombs) on. Optional. */
  bomberCols?: number[];
  /** Columns to spawn a dashing "Charger" on. Optional. */
  chargerCols?: number[];
  /** Coin question-blocks: [col, row]. Bump from below for a coin. */
  qblocks?: Array<[number, number]>;
  /** Weapon question-blocks: [col, row]. Bump from below for a power mushroom. */
  powBlocks?: Array<[number, number]>;
  /** Crumbling platforms: [row, startCol, length]. Fall after you stand on them. */
  crumbles?: Array<[number, number, number]>;
  /**
   * Parry-traversal orbs: [col, row]. Floating pink hazards you must parry
   * mid-air to bounce across an otherwise-uncrossable gap (§0 "Charge the Glitch").
   */
  parryOrbs?: Array<[number, number]>;
  /** Checkpoint post columns: touching one sets the respawn point (§6.4). */
  checkpointCols?: number[];
  /**
   * Moving platforms: [row, startCol, length, axis, range, speed].
   * `axis` is 'h' (horizontal) or 'v' (vertical); `range` is travel in tiles;
   * `speed` is px/frame. Optional — most levels have none.
   */
  movers?: Array<[number, number, number, 'h' | 'v', number, number]>;
}

/** A built, playable level: tile grid + entities + world dims. */
export interface Level {
  theme: Theme;
  /** [row][col] tile type: 0 empty, 1 ground, 2 brick platform. */
  grid: number[][];
  coins: Coin[];
  /** Pristine enemy descriptors; clone to (re)spawn the live enemies. */
  enemySpawn: Enemy[];
  /** Pristine moving-platform descriptors; clone to (re)spawn live movers. */
  moverSpawn: MovingPlatform[];
  /** Pristine crumbling-platform descriptors; clone to (re)spawn live ones. */
  crumbleSpawn: Crumble[];
  /** Pristine parry-orb descriptors; clone to (re)spawn live ones. */
  orbSpawn: ParryOrb[];
  /** Pristine checkpoint descriptors; clone to (re)spawn live ones. */
  checkpointSpawn: Checkpoint[];
  flagX: number;
  spawnX: number;
  spawnY: number;
  worldW: number;
  worldH: number;
  /** True if column `c` falls inside a pit (no ground). */
  isPit: (c: number) => boolean;
}

export interface Coin {
  cx: number;
  cy: number;
  got: boolean;
}

/** A solid platform that oscillates along one axis; the player can ride it. */
export interface MovingPlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: 'h' | 'v';
  /** Lower px bound of travel along the axis. */
  min: number;
  /** Upper px bound of travel along the axis. */
  max: number;
  /** Speed in px/frame. */
  speed: number;
  /** Travel direction along the axis: 1 forward, -1 back. */
  dir: 1 | -1;
  /** Actual movement applied this frame, used to carry a rider. */
  dx: number;
  dy: number;
}

/**
 * Enemy behavior: a patrolling "Glitch" (walker), a "Spitter" that fires bolts
 * (shooter), a sine-wave "Drone" (flyer), or a stationary "Turret" that fires
 * aimed bursts.
 */
// walker  — ground patrol, melee only
// shooter — ground patrol, fires a straight bolt ("Spitter")
// flyer   — harmless sine-path "Drone"
// turret  — stationary, aimed dart burst
// mortar  — stationary, lobs a high arcing shell (dodge by position)
// bomber  — sine-path flyer that drops gravity bombs from overhead
// charger — slow patrol, then dashes when it spots Pip on its level
export type EnemyKind =
  | 'walker'
  | 'shooter'
  | 'flyer'
  | 'turret'
  | 'mortar'
  | 'bomber'
  | 'charger';

/** Charger state machine: stalk → wind-up tell → committed dash. */
export type ChargeState = 'patrol' | 'wind' | 'dash';

export interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  alive: boolean;
  minX: number;
  maxX: number;
  /** Behavior type. */
  kind: EnemyKind;
  /** Frames until a shooter/turret/mortar/bomber may fire again. */
  shootCd: number;
  /** Count of bolts fired, used to make every Nth shot pink (parryable). */
  shotCount: number;
  /** Flyer/bomber: rest height the sine path oscillates around. */
  baseY?: number;
  /** Flyer/bomber: sine-path phase accumulator. */
  bob?: number;
  /** Charger: current phase of its stalk/dash cycle. */
  chargeState?: ChargeState;
  /** Charger: wind-up countdown (the telegraph before a dash). */
  windT?: number;
}

/** A platform that falls a short delay after the player stands on it (§8). */
export interface Crumble {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Countdown after first contact; -1 = untriggered. */
  timer: number;
  /** True once the platform has let go and is falling. */
  falling: boolean;
  /** Fall velocity once falling. */
  vy: number;
}

/**
 * A floating pink hazard you must parry mid-air to bounce across (§0). Armed
 * while `cooldown` is 0 (dangerous on contact, parryable); a successful parry
 * sends it dormant for `cooldown` frames so a missed landing can be retried.
 */
export interface ParryOrb {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Frames until it re-arms after a parry; 0 = armed (dangerous + parryable). */
  cooldown: number;
}

/** A respawn post: once touched, a lost life respawns Pip here, not at the start. */
export interface Checkpoint {
  x: number;
  y: number;
  /** True once Pip has reached it (lit banner; sets the respawn point). */
  active: boolean;
}

/** A power-up dropped by a slain Spitter; eating it lets Pip shoot. */
export interface Mushroom {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Horizontal drift. */
  vx: number;
  /** Vertical velocity (gravity pulls it down to rest on the ground). */
  vy: number;
  alive: boolean;
}

/** A bolt in flight. Player bolts kill enemies; enemy bolts hurt Pip. */
/**
 * Visual identity of a shot, so different enemies read as different weapons:
 *   bolt  — round energy capsule (default; Spitter)
 *   dart  — thin fast tracer drawn along its velocity (Turret)
 *   lob   — heavy round shell/bomb with an outline (Mortar / Bomber, `grav`)
 *   spark — jagged star burst
 */
export type BoltStyle = 'bolt' | 'dart' | 'lob' | 'spark';

export interface Projectile {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  alive: boolean;
  /** Who fired it — decides what it can hit. */
  from: 'player' | 'enemy';
  /** Visual style (defaults to 'bolt' when absent). */
  style?: BoltStyle;
  /** Per-shot color override for non-parryable enemy fire (core + highlight). */
  tint?: string;
  tintHi?: string;
  /** Pink enemy bolt: can be parried (jump-press on contact). */
  parryable?: boolean;
  /** Player EX/Super bolt: passes through enemies instead of dying on hit. */
  pierce?: boolean;
  /** Gravity-affected lob (boss `spitArc` / Lobber gun): vy accelerates down. */
  grav?: boolean;
  /** Latch so a piercing player bolt only damages the boss once. */
  hitBoss?: boolean;
  /** Boss damage this bolt deals (defaults applied in boss.ts when absent). */
  damage?: number;
  /** Player bolt that steers toward the nearest target each tick (Homing gun). */
  homing?: boolean;
  /** Stationary full-width boss beam (laserSweep): doesn't move or die on walls. */
  beam?: boolean;
  /** Beam telegraph frames: harmless while > 0, then the beam goes lethal. */
  warn?: number;
  /** Beam lethal lifetime in frames; expires at 0. */
  life?: number;
  /** Time-to-live in frames for a ranged bolt (spread falloff); expires at 0. */
  ttl?: number;
}

// ---- Weapon roster (§3) ----

export type WeaponId = 'peashot' | 'spread' | 'lobber' | 'charge' | 'homing';

/** A gun, defined as data — a new weapon is a config entry, not new code. */
export interface Weapon {
  id: WeaponId;
  name: string;
  /** Boss damage per pellet. */
  damage: number;
  /** Frames between shots (ignored by the charge weapon). */
  fireRate: number;
  /** Bolt speed (px/frame). */
  speed: number;
  /** Bolt size multiplier over the base bolt. */
  sizeMult: number;
  /** Number of pellets per shot (shotgun cone). */
  pellets?: number;
  /** Cone width in radians, spread across the pellets. */
  spread?: number;
  /** Gravity-affected lob. */
  arc?: boolean;
  /** Auto-tracks the nearest target. */
  homing?: boolean;
  /** Passes through enemies. */
  pierce?: boolean;
  /** Hold to charge, release to fire a scaled (piercing when full) shot. */
  charge?: boolean;
  /** Bolt lifetime in frames before it fizzles — short range = weak at distance. */
  range?: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** -1 faces left, 1 faces right. */
  face: -1 | 1;
  /** Invulnerability frames remaining after a hit (also covers dash i-frames). */
  hurt: number;
  /** Hit points remaining in the current life (0 → lose a life). */
  hp: number;
  crouch: boolean;
  /** Run-and-gun: Pip is permanently armed and can fire bolts. */
  armed: boolean;
  /** Frames remaining in the active dash burst (0 = not dashing). */
  dashFrames: number;
  /** Frames until Pip may dash again. */
  dashCd: number;
  /** Dash travel direction, captured when the dash starts. */
  dashDir: -1 | 1;
  /** Landing-impact squash (0 = none … 1 = hard landing); decays each frame and
   *  drives the render-only squash-and-stretch. */
  landSquash: number;
  /** True while hugging a wall in mid-air (slow controlled descent). */
  wallSlide: boolean;
  /** Side the clung wall is on while sliding: -1 left, +1 right, 0 none. */
  wallDir: -1 | 0 | 1;
  /** Frames a wall jump stays available after leaving the wall (wall coyote). */
  wallCoyote: number;
  /** True once the single mid-air dash is spent; refreshed by landing or a wall cling. */
  airDashUsed: boolean;
}

export interface Keys {
  left: boolean;
  right: boolean;
  /** Up — only meaningful for aiming while Lock is held (otherwise jumps). */
  up: boolean;
  down: boolean;
  jump: boolean;
  shoot: boolean;
  /** Dash / dodge burst. */
  dash: boolean;
  /** Hold to root in place and free-aim with the direction keys. */
  lock: boolean;
  /** Spend the Super meter: 1 card = EX shot, full meter = MEGABLAST. */
  super: boolean;
  /** Cycle to the next unlocked weapon. */
  switchWeapon: boolean;
}

/** Floating, fading "+score" text. */
export interface Pop {
  x: number;
  y: number;
  life: number;
  text: string;
  color: string;
}

/** A little dust-cloud particle kicked up on landing, dashing, or jumping. */
export interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining life in frames. */
  life: number;
  /** Initial life, so the draw can fade + grow the cloud over its lifetime. */
  max: number;
  /** Base radius in px. */
  r: number;
}

/** A short-lived bright twinkle (coin pickup burst, drawn as a 4-point spark). */
export interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining life in frames. */
  life: number;
  /** Initial life, so the draw can fade + shrink over the lifetime. */
  max: number;
  /** Half-extent in px of the twinkle cross. */
  size: number;
  /** Core color. */
  color: string;
}

// ---- Boss fight ----

/** Names of the boss attack patterns (pure functions in game/patterns.ts). */
export type PatternName =
  | 'spitArc'
  | 'boltFan'
  | 'groundPound'
  | 'summonWalkers'
  | 'pinkRain'
  | 'laserSweep'
  | 'chargeDash'
  | 'teleport'
  | 'ringBurst'
  | 'sparkNova'
  // Per-boss signature gimmicks (§ boss redesign):
  | 'rootPillars' // BARKBROOD / RIME: telegraphed ground eruptions (roots / frost spikes)
  | 'floorPulse' // electrified/hazard floor segments (reusable library pattern)
  | 'spiralShot' // a rotating arm of bolts (THE OVERCLOCK's signature)
  | 'aimedVolley'; // THE OVERCLOCK: a fast, tight burst that locks onto Pip

/**
 * How a grounded boss moves on the arena floor:
 *   planted — rooted to one spot, only sways (BARKBROOD, the tree).
 *   lumber  — slow ground walk that tracks Pip, then charge-rolls across (GRANITE, the golem).
 *   stoke   — shuffles side to side around its center (RIME, the ice spire).
 */
export type BossMoveMode = 'planted' | 'lumber' | 'stoke' | 'hop' | 'orbit';

/** Which side of the arena a boss makes its home (defaults to center). */
export type BossSide = 'center' | 'left' | 'right';

/**
 * A timed arena hazard during a boss fight (root pillars / electrified floor).
 * Harmless while telegraphing (`warn` > 0), lethal once it erupts (`life` > 0).
 */
export interface Hazard {
  kind: 'pillar' | 'shock';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Telegraph frames; harmless and shown as a warning while > 0. */
  warn: number;
  /** Lethal lifetime in frames once it erupts; expires at 0. */
  life: number;
}

/** One stage of a boss fight: gets faster and nastier as HP drops. */
export interface BossPhase {
  /** Enter this phase when HP falls to/below this % of max (lower bound). */
  toHpPct: number;
  /** Frames between attacks while in this phase. */
  cadence: number;
  /** Patterns this phase cycles through, in order. */
  patterns: PatternName[];
}

/** Visual silhouette for a boss (drives the whole body in the sprite). */
export type BossShape = 'tree' | 'rock' | 'crystal' | 'core';

/** Per-boss color set so each fight looks distinct (chosen by boss index). */
export interface BossSkin {
  /** Main body fill. */
  body: string;
  /** Darker body shade (outline/base). */
  bodyDk: string;
  /** Darkest shade (lower blob + mouth). */
  bodyLo: string;
  /** Bright top stripe / trim accent. */
  accent: string;
  /** Eye glow. */
  eye: string;
  /** Crown / headpiece color. */
  crown: string;
}

/** Authored boss + arena data (src/levels/boss*.json). */
export interface BossConfig {
  kind: 'boss';
  theme: Theme;
  name: string;
  hp: number;
  /** Arena width in columns (tight, mostly-fixed camera). */
  arenaCols: number;
  /** Floating brick platforms in the arena: [row, startCol, length]. */
  floorPlats: Array<[number, number, number]>;
  phases: BossPhase[];
  /** Movement style (defaults to 'planted'). Each boss feels distinct. */
  moveMode?: BossMoveMode;
  /** Body-size multiplier over the base BOSS_W/BOSS_H (defaults to 1). */
  scale?: number;
  /** Where the boss anchors in the arena (defaults to 'center'). */
  homeSide?: BossSide;
  /** Per-boss bolt color so each fight's fire reads as that character. */
  boltTint?: string;
  boltTintHi?: string;
}

/** The live boss during a fight. */
export interface Boss {
  name: string;
  /** Color set + silhouette so each boss reads as a distinct character. */
  skin: BossSkin;
  shape: BossShape;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  /** Index into `phases` (advances as HP drops). */
  phase: number;
  phases: BossPhase[];
  /** Frames between attacks in the current phase. */
  cadence: number;
  /** Frames until the next attack may begin. */
  attackCd: number;
  /** Round-robin index into the current phase's pattern list. */
  patternIdx: number;
  /** Wind-up countdown before the pending attack fires (telegraph flash). */
  telegraph: number;
  /** Pattern being telegraphed, fired when `telegraph` hits 0. */
  pending: PatternName | null;
  /** Hover bob accumulator (drives the idle float). */
  bob: number;
  /** Resting floor height (box top) the boss stands at. */
  homeY: number;
  /** Resting center X a planted/stoke boss orbits around. */
  homeX: number;
  /**
   * chargeDash choreography: 0 = hovering (tracks the player), 1 = descending
   * to the floor, 2 = dashing across, 3 = rising back to hover height.
   */
  dashPhase: 0 | 1 | 2 | 3;
  /** Direction of the current charge dash (toward the player when it began). */
  dashDir: -1 | 1;
  /** Frames of white hurt-flash after taking damage. */
  hurtFlash: number;
  /** True once HP hits 0 (KO sequence playing). */
  dead: boolean;
  /** Movement style this fight (planted / lumber / stoke / hop). */
  moveMode: BossMoveMode;
  /** Vertical velocity while hopping (px/frame; 0 when grounded). */
  vy: number;
  /** Frames until the next hop launches (hop move mode). */
  jumpCd: number;
  /** Per-boss bolt color (passed onto fired bolts). */
  boltTint?: string;
  boltTintHi?: string;
  /** Sway / stoke accumulator (drives idle sway and the stoke shuffle). */
  swayT: number;
  /** Rotating-arm angle accumulator (spiralShot). */
  spiralA: number;
}
