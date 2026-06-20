// The single GameState object. All systems read/write through it; render.ts
// only reads. Per-frame mutation here is intentional (see CLAUDE.md rules 4-5).

import type { Boss, Checkpoint, Crumble, Difficulty, Enemy, Hazard, Keys, Level, Mushroom, MovingPlatform, ParryOrb, Player, Pop, Puff, Projectile, Screen, Sparkle, Style, WeaponId } from '../types';
import type { Role } from '../engine/net';

/**
 * One controllable player ("Pawn") and all of its *per-player* controller state.
 * Single-player has one pawn (`state.players[0]`); shared-world co-op adds a
 * second. These fields used to live directly on `GameState`; they are proxied
 * back onto `state` (see `attachPawnProxies`) so legacy single-player call sites
 * keep working unchanged during the co-op migration.
 */
export interface Pawn {
  player: Player;
  keys: Keys;
  jumpLatch: boolean;
  coyote: number;
  jumpBuffer: number;
  wallJumpLock: number;
  jumping: boolean;
  shootLatch: boolean;
  shootCd: number;
  dashLatch: boolean;
  dashTap: boolean;
  switchLatch: boolean;
  charge: number;
  weapons: WeaponId[];
  weaponIdx: number;
  superLatch: boolean;
  superCards: number;
  parryLatch: boolean;
  combo: number;
  aimX: number;
  aimY: number;
  /** Lives remaining for THIS player (per-player in co-op). */
  lives: number;
  /** Out of lives and sitting out the rest of the run (co-op spectator). */
  down: boolean;
}

/** Live online co-op session (host-authoritative shared world). The host
 *  simulates both pawns and streams snapshots; the guest renders them. */
export interface CoopState {
  active: boolean;
  role: Role | null;
}
import { ASSIST_BONUS_HP, BEST_KEY, LEVEL_TIME, MAX_HP, PLAYER_H, PLAYER_W, START_LIVES } from './constants';
import { buildLevel, spawnCheckpoints, spawnCrumbles, spawnEnemies, spawnMovers, spawnOrbs } from './level';
import { LEVELS } from './levels';
import { loadSettings } from './settings';

/** An on-screen onboarding hint banner (transient; not persisted). */
export interface ActiveHint {
  text: string;
  /** Frames remaining; fades as it nears 0. */
  life: number;
  /** Initial life, for the fade curve. */
  max: number;
}

export interface GameState {
  screen: Screen;
  /** Index into the campaign sequence (drives level↔boss order, see flow.ts). */
  stageIndex: number;
  /** Highlighted entry on the stage-select screen. */
  menuIndex: number;
  levelIndex: number;
  level: Level;
  /** All controllable pawns. `[0]` is the local/host player; co-op adds `[1]`. */
  players: Pawn[];
  /** Convenience accessor for `players[0]` (proxied; see attachPawnProxies). */
  player: Player;
  enemies: Enemy[];
  movers: MovingPlatform[];
  /** Crumbling platforms that fall after Pip stands on them. */
  crumbles: Crumble[];
  /** Parry-traversal orbs: floating pink hazards parried mid-air to cross gaps. */
  parryOrbs: ParryOrb[];
  /** Checkpoint posts in the current level; touching one moves the respawn point. */
  checkpoints: Checkpoint[];
  /** Where a lost life respawns Pip (last checkpoint, or the level start). */
  respawnX: number;
  respawnY: number;
  /** Power-up mushrooms dropped by slain Spitters, in flight or at rest. */
  mushrooms: Mushroom[];
  /** Live bolts (player- and enemy-fired). */
  projectiles: Projectile[];
  keys: Keys;
  pops: Pop[];
  /** Transient dust-cloud particles from landing / dashing / jumping (FX only). */
  puffs: Puff[];
  /** Transient bright twinkles from coin pickups (FX only). */
  sparks: Sparkle[];
  /** Active first-run onboarding hint banner (transient; null when none). */
  hint: ActiveHint | null;

  score: number;
  coins: number;
  lives: number;
  best: number;

  /** Global frame counter, drives sprite animation. */
  frame: number;
  camX: number;
  /** Latch so holding jump doesn't auto-rejump (true once a press is consumed). */
  jumpLatch: boolean;
  /** Frames of coyote time left: jump still allowed just after leaving a ledge. */
  coyote: number;
  /** Frames a recent jump press stays buffered, waiting for ground/coyote. */
  jumpBuffer: number;
  /** Frames horizontal input is suppressed after a wall jump (preserves push-off). */
  wallJumpLock: number;
  /** True between jump liftoff and apex; gates variable-height jump-cut. */
  jumping: boolean;
  /** Current screen-shake magnitude in px; decays to 0 each tick. */
  shake: number;
  /** Frames of impact freeze remaining; gameplay updates pause while > 0. */
  hitstop: number;
  /** Latch so holding fire doesn't auto-repeat faster than the cooldown. */
  shootLatch: boolean;
  /** Frames until Pip may fire the next bolt. */
  shootCd: number;
  /** Latch so holding the dash key fires only one dash per press. */
  dashLatch: boolean;
  /** One-shot dash request from a left/right double-tap; consumed each tick. */
  dashTap: boolean;
  /** Super meter cards (0..SUPER_MAX). Parries fill it; EX/MEGABLAST spend it. */
  superCards: number;
  /** Latch so holding the super key fires only one EX/MEGABLAST per press. */
  superLatch: boolean;
  /** Latch for the parry input (a fresh jump press counts as one parry attempt). */
  parryLatch: boolean;
  /** Frames of white screen-flash remaining (MEGABLAST), decays to 0. */
  flash: number;
  /** Frames of the film-burn scorch remaining after a death; decays in the
   *  render tick (cosmetic only, so it ages even while the world is frozen). */
  burn: number;
  /** The live boss during a 'boss' fight, or null on run levels. */
  boss: Boss | null;
  /** Timed arena hazards (root pillars / electrified floor) during a boss fight. */
  hazards: Hazard[];
  /** KO death-wobble countdown after the boss falls; 0 → show the win screen. */
  bossKo: number;

  /** Unlocked weapons (in order); mushrooms append the next one. */
  weapons: WeaponId[];
  /** Index into `weapons` of the equipped gun. */
  weaponIdx: number;
  /** Charge accumulator for the Charge gun (0..CHARGE_MAX). */
  charge: number;
  /** Latch so holding the switch key cycles weapons only once per press. */
  switchLatch: boolean;

  // ---- Run stats for the letter grade (§7), reset each level/boss ----
  /** Fixed-step ticks elapsed this run (≈ 60/s). */
  runTicks: number;
  /** Hits taken this run. */
  runHits: number;
  /** Successful parries this run. */
  runParries: number;
  /** EX/MEGABLAST activations this run. */
  runSupers: number;
  /** Grade earned on the most recent clear (for the card). */
  lastGrade: string;
  /** Best grade on record for the cleared stage (for the card). */
  bestGrade: string;
  /** Clear time (ticks) of the most recent stage, and the best on record. */
  lastTime: number;
  bestTime: number;

  /** Stomp-chain combo: consecutive stomps without landing (0 = none). */
  combo: number;
  /** Frames left on the "COMBO ×N" banner (counts down; 0 = hidden). */
  comboFlash: number;
  /** Chain length the banner is showing (frozen when the banner fires). */
  comboShown: number;
  /** Per-level time budget in frames; leftover converts to a clear bonus. */
  timeLeft: number;
  /** Boss "READY?/FIGHT!" intro hold (frames); boss waits to attack while > 0. */
  bossIntro: number;

  /** Clear-card title (e.g. "LEVEL 1 CLEAR!" / "ROOTKIT DOWN!"), set by flow. */
  clearTitle: string;
  /** Clear-card next-stage line (e.g. "NEXT · LEVEL 2"), set by flow. */
  nextLabel: string;

  // ---- Options (§12/§13) ----
  /** Difficulty tier: assist (+HP, slower bolts, S-rank locked) / normal / expert. Persisted. */
  difficulty: Difficulty;
  /** Max HP for the current run (MAX_HP, +ASSIST_BONUS_HP in assist mode). */
  maxHp: number;
  /** Master volume 0..1 (applied to the audio master gain). Persisted. */
  volume: number;
  /** Reduced motion: suppress screen shake + the film-grain/vignette. Persisted. */
  reducedMotion: boolean;
  /** Art-direction style: 'cuphead' (vintage grade) or 'mario' (clean). Visual only, persisted. */
  style: Style;
  /** Show the on-screen touch arrows + action buttons. Persisted. */
  showTouchControls: boolean;
  /** Colorblind-friendly UI palette (red/green-safe HUD chrome). Persisted. */
  colorblind: boolean;
  /** Auto-fire the equipped weapon (touch-friendly; charge weapons exempt). Persisted. */
  autoFire: boolean;
  /** Gameplay is frozen behind the pause menu. */
  paused: boolean;
  /** Highlighted entry in the pause menu. */
  pauseIndex: number;
  /** Analog aim vector from a gamepad's right stick (0,0 = no analog aim). */
  aimX: number;
  aimY: number;
  /** Online co-op link (live-partner model); inactive when playing solo. */
  coop: CoopState;
  /** Co-op guest prediction mode: 'live' while locally predicting the guest's own
   *  avatar (suppresses host-authoritative side effects in updatePlayer). 'off'
   *  for single-player and the host, so their behavior is unchanged. */
  netPredict: 'off' | 'live';
}

export function loadBest(): number {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function makeKeys(): Keys {
  return { left: false, right: false, up: false, down: false, jump: false, shoot: false, dash: false, lock: false, super: false, switchWeapon: false };
}

export function spawnPlayer(level: Level, maxHp: number = MAX_HP): Player {
  return {
    x: level.spawnX,
    y: level.spawnY,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    hurt: 0,
    hp: maxHp,
    crouch: false,
    armed: true,
    dashFrames: 0,
    dashCd: 0,
    dashDir: 1,
    landSquash: 0,
    wallSlide: false,
    wallDir: 0,
    wallCoyote: 0,
    airDashUsed: false,
  };
}

/** A fresh pawn wrapping `player`, with all controller state at rest. */
export function makePawn(player: Player): Pawn {
  return {
    player,
    keys: makeKeys(),
    jumpLatch: false,
    coyote: 0,
    jumpBuffer: 0,
    wallJumpLock: 0,
    jumping: false,
    shootLatch: false,
    shootCd: 0,
    dashLatch: false,
    dashTap: false,
    switchLatch: false,
    charge: 0,
    weapons: ['peashot'],
    weaponIdx: 0,
    superLatch: false,
    superCards: 0,
    parryLatch: false,
    combo: 0,
    aimX: 0,
    aimY: 0,
    lives: START_LIVES,
    down: false,
  };
}

/** Pawns still in the run (not spectating after running out of lives). */
export function activePawns(state: GameState): Pawn[] {
  return state.players.filter((pw) => !pw.down);
}

/** Every pawn is out of lives → the run is over. */
export function allDown(state: GameState): boolean {
  return state.players.every((pw) => pw.down);
}

/** Add a second co-op pawn at the level spawn (idempotent). Returns it. */
export function addPawn(state: GameState): Pawn {
  if (state.players.length > 1) return state.players[1];
  const pawn = makePawn(spawnPlayer(state.level, state.maxHp));
  state.players.push(pawn);
  return pawn;
}

/** Drop all co-op pawns, leaving only the local player[0] (back to solo). */
export function removeExtraPawns(state: GameState): void {
  state.players.length = 1;
}

/**
 * Re-place the co-op pawns ([1+]) at the current level's spawn after pawn 0 has
 * been (re)spawned by a flow transition. Each keeps its own unlocked weapons and
 * armed state; positions are staggered so the pair doesn't stack. No-op solo.
 */
export function respawnExtraPawns(state: GameState): void {
  const anchor = state.players[0].player; // pawn 0 has just been placed
  for (let i = 1; i < state.players.length; i++) {
    const old = state.players[i];
    const pawn = makePawn(spawnPlayer(state.level, state.maxHp));
    pawn.player.x = anchor.x + i * (PLAYER_W + 8); // beside the partner
    pawn.player.y = anchor.y;
    pawn.player.armed = old.player.armed;
    pawn.weapons = old.weapons;
    pawn.weaponIdx = old.weaponIdx;
    pawn.lives = old.lives; // a respawn keeps remaining lives (not a fresh run)
    pawn.down = old.down;
    state.players[i] = pawn;
  }
}

/** Reset a pawn's transient controller state (keeps weapons, lives, super). */
function resetPawnController(pawn: Pawn): void {
  pawn.keys = makeKeys();
  pawn.jumpLatch = false;
  pawn.coyote = 0;
  pawn.jumpBuffer = 0;
  pawn.wallJumpLock = 0;
  pawn.jumping = false;
  pawn.shootLatch = false;
  pawn.shootCd = 0;
  pawn.dashLatch = false;
  pawn.dashTap = false;
  pawn.switchLatch = false;
  pawn.charge = 0;
  pawn.superLatch = false;
  pawn.parryLatch = false;
  pawn.combo = 0;
  pawn.aimX = 0;
  pawn.aimY = 0;
}

/** Bring one pawn back beside a living partner (co-op mid-level respawn). */
export function revivePawnBeside(state: GameState, pawn: Pawn): void {
  const partner = state.players.find((pw) => pw !== pawn && !pw.down && pw.player.hp > 0);
  const armed = pawn.player.armed;
  pawn.player = spawnPlayer(state.level, state.maxHp);
  pawn.player.x = partner ? partner.player.x + (PLAYER_W + 8) : state.respawnX;
  pawn.player.y = partner ? partner.player.y : state.respawnY;
  pawn.player.armed = armed;
  resetPawnController(pawn);
}

/** Bring spectating pawns back into play for a new stage (1 life if empty). */
export function reviveDowned(state: GameState): void {
  for (const pw of state.players) {
    if (pw.down) {
      pw.down = false;
      if (pw.lives < 1) pw.lives = 1;
    }
  }
}

/** The active pawn whose center is closest to (x, y) — enemy/boss targeting. */
export function nearestPawn(state: GameState, x: number, y: number): Pawn {
  let best = state.players[0];
  let bestD = Infinity;
  for (const pw of state.players) {
    if (pw.down) continue; // never target a spectating player
    const dx = pw.player.x + pw.player.w / 2 - x;
    const dy = pw.player.y + pw.player.h / 2 - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = pw;
    }
  }
  return best;
}

/** Define `state.<field>` as a live accessor onto `players[0]`'s field. */
function proxyField<K extends keyof Pawn>(state: GameState, field: K): void {
  Object.defineProperty(state, field, {
    get(this: GameState): Pawn[K] {
      return this.players[0][field];
    },
    set(this: GameState, value: Pawn[K]): void {
      this.players[0][field] = value;
    },
    enumerable: true,
    configurable: true,
  });
}

/**
 * Back the legacy single-player fields (`state.player`, `state.keys`, and the
 * controller latches/meters) with accessors onto `players[0]`. Lets the many
 * existing solo call sites keep reading/writing `state.X` while the simulation
 * systems migrate to operate on an explicit `Pawn`.
 */
function attachPawnProxies(state: GameState): void {
  proxyField(state, 'player');
  proxyField(state, 'keys');
  proxyField(state, 'jumpLatch');
  proxyField(state, 'coyote');
  proxyField(state, 'jumpBuffer');
  proxyField(state, 'wallJumpLock');
  proxyField(state, 'jumping');
  proxyField(state, 'shootLatch');
  proxyField(state, 'shootCd');
  proxyField(state, 'dashLatch');
  proxyField(state, 'dashTap');
  proxyField(state, 'switchLatch');
  proxyField(state, 'charge');
  proxyField(state, 'weapons');
  proxyField(state, 'weaponIdx');
  proxyField(state, 'superLatch');
  proxyField(state, 'superCards');
  proxyField(state, 'parryLatch');
  proxyField(state, 'combo');
  proxyField(state, 'aimX');
  proxyField(state, 'aimY');
  proxyField(state, 'lives');
}

/** Build the initial state for level 0, sitting on the title screen. */
export function createState(): GameState {
  const levelIndex = 0;
  const level = buildLevel(LEVELS[levelIndex]);
  const settings = loadSettings();
  // The proxied pawn fields (player/keys/latches/meters) live on players[0];
  // attachPawnProxies re-exposes them as `state.X`. The cast bridges the literal
  // (which omits those fields) to GameState until the accessors are attached.
  const state = {
    screen: 'title',
    stageIndex: 0,
    menuIndex: 0,
    levelIndex,
    level,
    players: [makePawn(spawnPlayer(level))],
    enemies: spawnEnemies(level),
    movers: spawnMovers(level),
    crumbles: spawnCrumbles(level),
    parryOrbs: spawnOrbs(level),
    checkpoints: spawnCheckpoints(level),
    respawnX: level.spawnX,
    respawnY: level.spawnY,
    mushrooms: [],
    projectiles: [],
    pops: [],
    puffs: [],
    sparks: [],
    hint: null,
    score: 0,
    coins: 0,
    best: loadBest(),
    frame: 0,
    camX: 0,
    shake: 0,
    hitstop: 0,
    flash: 0,
    burn: 0,
    boss: null,
    hazards: [],
    bossKo: 0,
    runTicks: 0,
    runHits: 0,
    runParries: 0,
    runSupers: 0,
    lastGrade: '',
    bestGrade: '',
    lastTime: 0,
    bestTime: 0,
    comboFlash: 0,
    comboShown: 0,
    timeLeft: LEVEL_TIME,
    bossIntro: 0,
    clearTitle: '',
    nextLabel: '',
    difficulty: settings.difficulty,
    maxHp: MAX_HP + (settings.difficulty === 'assist' ? ASSIST_BONUS_HP : 0),
    volume: settings.volume,
    reducedMotion: settings.reducedMotion,
    style: settings.style,
    showTouchControls: settings.showTouchControls,
    colorblind: settings.colorblind,
    autoFire: settings.autoFire,
    paused: false,
    pauseIndex: 0,
    coop: {
      active: false,
      role: null,
    },
    netPredict: 'off',
  } as unknown as GameState;
  attachPawnProxies(state);
  return state;
}

/** Load `levelIndex` into state and place the player/enemies at spawn. */
export function loadLevel(state: GameState, levelIndex: number): void {
  state.levelIndex = levelIndex;
  state.level = buildLevel(LEVELS[levelIndex]);
  state.player = spawnPlayer(state.level);
  state.enemies = spawnEnemies(state.level);
  state.movers = spawnMovers(state.level);
  state.crumbles = spawnCrumbles(state.level);
  state.parryOrbs = spawnOrbs(state.level);
  state.checkpoints = spawnCheckpoints(state.level);
  state.respawnX = state.level.spawnX;
  state.respawnY = state.level.spawnY;
  state.mushrooms = [];
  state.projectiles = [];
  state.pops = [];
  state.puffs = [];
  state.sparks = [];
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.coyote = 0;
  state.jumpBuffer = 0;
  state.wallJumpLock = 0;
  state.jumping = false;
  state.shake = 0;
  state.hitstop = 0;
  state.shootLatch = false;
  state.shootCd = 0;
  state.dashLatch = false;
  state.dashTap = false;
  state.superCards = 0;
  state.superLatch = false;
  state.parryLatch = false;
  state.flash = 0;
  state.burn = 0;
  state.boss = null;
  state.hazards = [];
  state.bossKo = 0;
  state.camX = 0;
  // Transient per-life/per-level resets (weapons persist; handled in flow.ts).
  state.charge = 0;
  state.switchLatch = false;
  state.runTicks = 0;
  state.runHits = 0;
  state.runParries = 0;
  state.runSupers = 0;
  state.combo = 0;
  state.timeLeft = LEVEL_TIME;
  state.bossIntro = 0;
}
