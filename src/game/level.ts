// buildLevel: turn authored LevelConfig data into a playable Level (tile grid,
// coins, enemy spawn descriptors, world dims). Pure — no rendering, no globals.

import type { Coin, Enemy, EnemyKind, Level, LevelConfig, MovingPlatform } from '../types';
import { COLS, ROWS, SHOOTER_SPEED_MULT, TILE, TILE_BRICK, TILE_GROUND } from './constants';

const ENEMY_W = 38;
const ENEMY_H = 38;
const ENEMY_SPEED = 1.2;
/** Enemy patrols this many columns either side of its spawn column. */
const PATROL_COLS = 3;

/** Build one ground-standing enemy of the given kind on column `c`. */
function makeEnemy(c: number, kind: EnemyKind): Enemy {
  const speed = kind === 'shooter' ? ENEMY_SPEED * SHOOTER_SPEED_MULT : ENEMY_SPEED;
  return {
    x: c * TILE,
    y: 10 * TILE - ENEMY_H,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: speed,
    alive: true,
    minX: (c - PATROL_COLS) * TILE,
    maxX: (c + PATROL_COLS) * TILE,
    kind,
    shootCd: 0,
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

  // Enemies spawn on the top edge of the ground row, skipping pit columns.
  // Walkers from `enemyCols`, shooting Spitters from `shooterCols`.
  const enemySpawn: Enemy[] = [
    ...cfg.enemyCols.filter((c) => !isPit(c)).map((c) => makeEnemy(c, 'walker')),
    ...(cfg.shooterCols ?? []).filter((c) => !isPit(c)).map((c) => makeEnemy(c, 'shooter')),
  ];

  return {
    theme: cfg.theme,
    grid,
    coins,
    enemySpawn,
    moverSpawn,
    flagX: cfg.flagCol * TILE,
    spawnX: 2 * TILE,
    spawnY: 10 * TILE - 58,
    worldW: COLS * TILE,
    worldH: ROWS * TILE,
    isPit,
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
