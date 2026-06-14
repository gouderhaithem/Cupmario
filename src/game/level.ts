// buildLevel: turn authored LevelConfig data into a playable Level (tile grid,
// coins, enemy spawn descriptors, world dims). Pure — no rendering, no globals.

import type {
  BossConfig,
  Checkpoint,
  Coin,
  Crumble,
  Enemy,
  EnemyKind,
  Level,
  LevelConfig,
  MovingPlatform,
  ParryOrb,
} from '../types';
import {
  COLS,
  FLYER_SPEED,
  ORB_SIZE,
  PLAYER_H,
  ROWS,
  SHOOTER_SPEED_MULT,
  TILE,
  TILE_BRICK,
  TILE_GROUND,
  TILE_POWBLOCK,
  TILE_QBLOCK,
} from './constants';

const ENEMY_W = 38;
const ENEMY_H = 38;
const ENEMY_SPEED = 1.2;
/** Enemy patrols this many columns either side of its spawn column. */
const PATROL_COLS = 3;
/** Flyers roam wider and cruise at mid-air height. */
const FLYER_PATROL_COLS = 5;
const FLYER_ROW = 5;

/** Build one ground-standing enemy (walker/shooter/turret) on column `c`. */
function makeEnemy(c: number, kind: EnemyKind): Enemy {
  const speed =
    kind === 'shooter' ? ENEMY_SPEED * SHOOTER_SPEED_MULT : kind === 'turret' ? 0 : ENEMY_SPEED;
  const patrol = kind === 'turret' ? 0 : PATROL_COLS;
  return {
    x: c * TILE,
    y: 10 * TILE - ENEMY_H,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: speed,
    alive: true,
    minX: (c - patrol) * TILE,
    maxX: (c + patrol) * TILE,
    kind,
    shootCd: 0,
    shotCount: 0,
  };
}

/** Build a sine-wave flying "Drone" cruising at mid-air height on column `c`. */
function makeFlyer(c: number): Enemy {
  const baseY = FLYER_ROW * TILE;
  return {
    x: c * TILE,
    y: baseY,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: FLYER_SPEED,
    alive: true,
    minX: (c - FLYER_PATROL_COLS) * TILE,
    maxX: (c + FLYER_PATROL_COLS) * TILE,
    kind: 'flyer',
    shootCd: 0,
    shotCount: 0,
    baseY,
    bob: 0,
  };
}

export function buildLevel(cfg: LevelConfig): Level {
  const isPit = (c: number): boolean => cfg.pits.some((p) => c >= p[0] && c <= p[1]);

  // Empty grid, then fill ground rows 10-11 except pit columns.
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) grid.push(new Array<number>(COLS).fill(0));
  for (let c = 0; c < COLS; c++) {
    if (!isPit(c)) {
      grid[10][c] = TILE_GROUND;
      grid[11][c] = TILE_GROUND;
    }
  }

  // Floating brick platforms: [row, startCol, length].
  for (const [row, startCol, len] of cfg.plats) {
    for (let i = 0; i < len; i++) grid[row][startCol + i] = TILE_BRICK;
  }

  // Question blocks (bump from below): coin blocks and weapon blocks.
  for (const [col, row] of cfg.qblocks ?? []) grid[row][col] = TILE_QBLOCK;
  for (const [col, row] of cfg.powBlocks ?? []) grid[row][col] = TILE_POWBLOCK;

  // Coins at tile centers: [col, row].
  const coins: Coin[] = cfg.coins.map(([col, row]) => ({
    cx: col * TILE + TILE / 2,
    cy: row * TILE + TILE / 2,
    got: false,
  }));

  // Moving platforms: [row, startCol, length, axis, range, speed].
  const moverSpawn: MovingPlatform[] = (cfg.movers ?? []).map(
    ([row, startCol, len, axis, range, speed]) => {
      const x = startCol * TILE;
      const y = row * TILE;
      return {
        x,
        y,
        w: len * TILE,
        h: TILE,
        axis,
        speed,
        dir: 1 as const,
        dx: 0,
        dy: 0,
        min: axis === 'h' ? x : y,
        max: axis === 'h' ? x + range * TILE : y + range * TILE,
      };
    },
  );

  // Crumbling platforms: [row, startCol, length].
  const crumbleSpawn: Crumble[] = (cfg.crumbles ?? []).map(([row, startCol, len]) => ({
    x: startCol * TILE,
    y: row * TILE,
    w: len * TILE,
    h: TILE,
    timer: -1,
    falling: false,
    vy: 0,
  }));

  // Parry-traversal orbs, centered in their tile: [col, row].
  const offset = (TILE - ORB_SIZE) / 2;
  const orbSpawn: ParryOrb[] = (cfg.parryOrbs ?? []).map(([col, row]) => ({
    x: col * TILE + offset,
    y: row * TILE + offset,
    w: ORB_SIZE,
    h: ORB_SIZE,
    cooldown: 0,
  }));

  // Checkpoint posts stand on the ground; x/y double as the respawn point.
  const checkpointSpawn: Checkpoint[] = (cfg.checkpointCols ?? []).map((col) => ({
    x: col * TILE,
    y: 10 * TILE - PLAYER_H,
    active: false,
  }));

  // Enemies spawn on the top edge of the ground row, skipping pit columns.
  // Walkers/Spitters/Turrets patrol the ground; Drones fly (pit-independent).
  const enemySpawn: Enemy[] = [
    ...cfg.enemyCols.filter((c) => !isPit(c)).map((c) => makeEnemy(c, 'walker')),
    ...(cfg.shooterCols ?? []).filter((c) => !isPit(c)).map((c) => makeEnemy(c, 'shooter')),
    ...(cfg.turretCols ?? []).filter((c) => !isPit(c)).map((c) => makeEnemy(c, 'turret')),
    ...(cfg.flyerCols ?? []).map((c) => makeFlyer(c)),
  ];

  return {
    theme: cfg.theme,
    grid,
    coins,
    enemySpawn,
    moverSpawn,
    crumbleSpawn,
    orbSpawn,
    checkpointSpawn,
    flagX: cfg.flagCol * TILE,
    spawnX: 2 * TILE,
    spawnY: 10 * TILE - 58,
    worldW: COLS * TILE,
    worldH: ROWS * TILE,
    isPit,
  };
}

/**
 * Build a tight, enclosed boss arena: ground across `arenaCols`, full-height
 * brick walls on both edges to contain Pip, and the configured floating
 * platforms. worldW = arenaCols*TILE so the camera clamps fully (locked view).
 */
export function buildBossArena(cfg: BossConfig): Level {
  const cols = Math.min(cfg.arenaCols, COLS);

  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) grid.push(new Array<number>(COLS).fill(0));

  // Ground rows 10-11 across the arena.
  for (let c = 0; c < cols; c++) {
    grid[10][c] = TILE_GROUND;
    grid[11][c] = TILE_GROUND;
  }
  // Side walls (rows above the floor) so Pip can't run out of the arena.
  for (let r = 0; r < 10; r++) {
    grid[r][0] = TILE_BRICK;
    grid[r][cols - 1] = TILE_BRICK;
  }
  // Floating brick platforms for dodging.
  for (const [row, startCol, len] of cfg.floorPlats) {
    for (let i = 0; i < len; i++) grid[row][startCol + i] = TILE_BRICK;
  }

  return {
    theme: cfg.theme,
    grid,
    coins: [],
    enemySpawn: [],
    moverSpawn: [],
    crumbleSpawn: [],
    orbSpawn: [],
    checkpointSpawn: [],
    flagX: cols * TILE + 9999, // off-arena; the boss screen never tests the flag
    spawnX: 2 * TILE,
    spawnY: 10 * TILE - 58,
    worldW: cols * TILE,
    worldH: ROWS * TILE,
    isPit: () => false,
  };
}

/** Fresh copies of the spawn descriptors (used on (re)spawn). */
export function spawnEnemies(level: Level): Enemy[] {
  return level.enemySpawn.map((e) => ({ ...e }));
}

/** Fresh copies of the moving-platform descriptors (used on (re)spawn). */
export function spawnMovers(level: Level): MovingPlatform[] {
  return level.moverSpawn.map((m) => ({ ...m }));
}

/** Fresh copies of the crumbling-platform descriptors (used on (re)spawn). */
export function spawnCrumbles(level: Level): Crumble[] {
  return level.crumbleSpawn.map((c) => ({ ...c }));
}

/** Fresh copies of the parry-orb descriptors (used on (re)spawn). */
export function spawnOrbs(level: Level): ParryOrb[] {
  return level.orbSpawn.map((o) => ({ ...o }));
}

/** Fresh copies of the checkpoint descriptors (used on level load). */
export function spawnCheckpoints(level: Level): Checkpoint[] {
  return level.checkpointSpawn.map((c) => ({ ...c }));
}
