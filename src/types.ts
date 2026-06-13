// Shared data shapes for Life Quest. When a shape changes, update it here in
// the same edit (golden rule #6).

export type Screen = 'title' | 'play' | 'levelup' | 'gameover' | 'win';

export type Theme = 'day' | 'night';

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

/** Enemy behavior: a plain patrolling "Glitch", or a "Spitter" that fires bolts. */
export type EnemyKind = 'walker' | 'shooter';

export interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  alive: boolean;
  minX: number;
  maxX: number;
  /** Behavior type. Walkers just patrol; shooters also fire bolts at Pip. */
  kind: EnemyKind;
  /** Frames until a shooter may fire again (shooters only; 0 for walkers). */
  shootCd: number;
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
  /** Invulnerability frames remaining after a hit. */
  hurt: number;
  crouch: boolean;
  /** True after eating a mushroom: Pip can fire bolts. Lost when hit. */
  armed: boolean;
}

export interface Keys {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  shoot: boolean;
}

/** Floating, fading "+score" text. */
export interface Pop {
  x: number;
  y: number;
  life: number;
  text: string;
  color: string;
}
