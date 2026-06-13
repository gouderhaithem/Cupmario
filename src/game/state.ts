// The single GameState object. All systems read/write through it; render.ts
// only reads. Per-frame mutation here is intentional (see CLAUDE.md rules 4-5).

import type { Enemy, Keys, Level, Mushroom, MovingPlatform, Player, Pop, Projectile, Screen } from '../types';
import { BEST_KEY, START_LIVES } from './constants';
import { buildLevel, spawnEnemies, spawnMovers } from './level';
import { LEVELS } from './levels';

export interface GameState {
  screen: Screen;
  levelIndex: number;
  level: Level;
  player: Player;
  enemies: Enemy[];
  movers: MovingPlatform[];
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
}

export function loadBest(): number {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function makeKeys(): Keys {
  return { left: false, right: false, down: false, jump: false, shoot: false };
}

export function spawnPlayer(level: Level): Player {
  return {
    x: level.spawnX,
    y: level.spawnY,
    w: 34,
    h: 58,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    hurt: 0,
    crouch: false,
    armed: false,
  };
}

/** Build the initial state for level 0, sitting on the title screen. */
export function createState(): GameState {
  const levelIndex = 0;
  const level = buildLevel(LEVELS[levelIndex]);
  return {
    screen: 'title',
    levelIndex,
    level,
    player: spawnPlayer(level),
    enemies: spawnEnemies(level),
    movers: spawnMovers(level),
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
  };
}

/** Load `levelIndex` into state and place the player/enemies at spawn. */
export function loadLevel(state: GameState, levelIndex: number): void {
  state.levelIndex = levelIndex;
  state.level = buildLevel(LEVELS[levelIndex]);
  state.player = spawnPlayer(state.level);
  state.enemies = spawnEnemies(state.level);
  state.movers = spawnMovers(state.level);
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
  state.camX = 0;
}
