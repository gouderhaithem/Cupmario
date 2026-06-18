// The single GameState object. All systems read/write through it; render.ts
// only reads. Per-frame mutation here is intentional (see CLAUDE.md rules 4-5).

import type { Boss, Checkpoint, Crumble, Difficulty, Enemy, GameMode, Hazard, Keys, Level, Mushroom, MovingPlatform, ParryOrb, Player, Pop, Projectile, Screen, Style, WeaponId } from '../types';
import { ASSIST_BONUS_HP, BEST_KEY, LEVEL_TIME, MAX_HP, PLAYER_H, PLAYER_W, START_LIVES } from './constants';
import { buildLevel, spawnCheckpoints, spawnCrumbles, spawnEnemies, spawnMovers, spawnOrbs } from './level';
import { LEVELS } from './levels';
import { loadSettings } from './settings';

export interface GameState {
  screen: Screen;
  /** Active sequence: full campaign or a bosses-only Boss Rush. */
  mode: GameMode;
  /** Index into the active sequence (drives level↔boss order, see flow.ts). */
  stageIndex: number;
  /** Highlighted entry on the stage-select screen. */
  menuIndex: number;
  levelIndex: number;
  level: Level;
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
  /** Gameplay is frozen behind the pause menu. */
  paused: boolean;
  /** Highlighted entry in the pause menu. */
  pauseIndex: number;
  /** Analog aim vector from a gamepad's right stick (0,0 = no analog aim). */
  aimX: number;
  aimY: number;
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
  };
}

/** Build the initial state for level 0, sitting on the title screen. */
export function createState(): GameState {
  const levelIndex = 0;
  const level = buildLevel(LEVELS[levelIndex]);
  const settings = loadSettings();
  return {
    screen: 'title',
    mode: 'campaign',
    stageIndex: 0,
    menuIndex: 0,
    levelIndex,
    level,
    player: spawnPlayer(level),
    enemies: spawnEnemies(level),
    movers: spawnMovers(level),
    crumbles: spawnCrumbles(level),
    parryOrbs: spawnOrbs(level),
    checkpoints: spawnCheckpoints(level),
    respawnX: level.spawnX,
    respawnY: level.spawnY,
    mushrooms: [],
    projectiles: [],
    keys: makeKeys(),
    pops: [],
    score: 0,
    coins: 0,
    lives: START_LIVES,
    best: loadBest(),
    frame: 0,
    camX: 0,
    jumpLatch: false,
    coyote: 0,
    jumpBuffer: 0,
    jumping: false,
    shake: 0,
    hitstop: 0,
    shootLatch: false,
    shootCd: 0,
    dashLatch: false,
    dashTap: false,
    superCards: 0,
    superLatch: false,
    parryLatch: false,
    flash: 0,
    boss: null,
    hazards: [],
    bossKo: 0,
    weapons: ['peashot'],
    weaponIdx: 0,
    charge: 0,
    switchLatch: false,
    runTicks: 0,
    runHits: 0,
    runParries: 0,
    runSupers: 0,
    lastGrade: '',
    bestGrade: '',
    lastTime: 0,
    bestTime: 0,
    combo: 0,
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
    paused: false,
    pauseIndex: 0,
    aimX: 0,
    aimY: 0,
  };
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
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.coyote = 0;
  state.jumpBuffer = 0;
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
