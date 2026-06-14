import { describe, it, expect } from 'vitest';
import { buildLevel, buildBossArena, spawnEnemies, spawnOrbs, spawnCheckpoints } from './level';
import { COLS, ROWS, TILE, TILE_BRICK, TILE_EMPTY, TILE_GROUND } from './constants';
import type { BossConfig, LevelConfig } from '../types';

const cfg: LevelConfig = {
  theme: 'day',
  flagCol: 20,
  pits: [[2, 3]],
  plats: [[8, 5, 2]],
  coins: [[1, 9]],
  enemyCols: [4, 2], // col 2 sits over a pit and must be skipped
  parryOrbs: [[6, 6]],
  checkpointCols: [10],
};

describe('buildLevel', () => {
  const level = buildLevel(cfg);

  it('fills ground rows 10-11 except over pits', () => {
    expect(level.grid[10][5]).toBe(TILE_GROUND);
    expect(level.grid[11][5]).toBe(TILE_GROUND);
    expect(level.grid[10][2]).toBe(TILE_EMPTY);
    expect(level.grid[10][3]).toBe(TILE_EMPTY);
  });

  it('stamps floating brick platforms', () => {
    expect(level.grid[8][5]).toBe(TILE_BRICK);
    expect(level.grid[8][6]).toBe(TILE_BRICK);
  });

  it('places coins at tile centers', () => {
    expect(level.coins).toHaveLength(1);
    expect(level.coins[0].cx).toBe(1 * TILE + TILE / 2);
    expect(level.coins[0].cy).toBe(9 * TILE + TILE / 2);
  });

  it('skips enemies that would spawn over a pit', () => {
    expect(level.enemySpawn).toHaveLength(1);
    expect(level.enemySpawn[0].x).toBe(4 * TILE);
  });

  it('reports pit columns via isPit', () => {
    expect(level.isPit(2)).toBe(true);
    expect(level.isPit(3)).toBe(true);
    expect(level.isPit(5)).toBe(false);
  });

  it('builds parry orbs and checkpoints from config', () => {
    expect(level.orbSpawn).toHaveLength(1);
    expect(level.checkpointSpawn).toHaveLength(1);
    expect(level.checkpointSpawn[0].x).toBe(10 * TILE);
    expect(level.checkpointSpawn[0].active).toBe(false);
  });

  it('sets world dimensions from the grid', () => {
    expect(level.worldW).toBe(COLS * TILE);
    expect(level.worldH).toBe(ROWS * TILE);
  });
});

describe('spawn* clone helpers', () => {
  const level = buildLevel(cfg);
  it('return fresh independent copies', () => {
    const a = spawnEnemies(level);
    const b = spawnEnemies(level);
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    a[0].x = -999;
    expect(b[0].x).not.toBe(-999);
    expect(spawnOrbs(level)).toHaveLength(1);
    expect(spawnCheckpoints(level)).toHaveLength(1);
  });
});

describe('buildBossArena', () => {
  const boss: BossConfig = {
    kind: 'boss',
    theme: 'night',
    name: 'TEST',
    hp: 10,
    arenaCols: 21,
    floorPlats: [[8, 3, 3]],
    phases: [{ toHpPct: 0, cadence: 50, patterns: ['boltFan'] }],
  };
  const arena = buildBossArena(boss);

  it('encloses the arena with side walls and a floor', () => {
    expect(arena.grid[5][0]).toBe(TILE_BRICK);
    expect(arena.grid[5][20]).toBe(TILE_BRICK);
    expect(arena.grid[10][10]).toBe(TILE_GROUND);
  });

  it('locks the camera by sizing the world to the arena', () => {
    expect(arena.worldW).toBe(21 * TILE);
  });

  it('has no flag, coins, or entities to chase', () => {
    expect(arena.coins).toHaveLength(0);
    expect(arena.enemySpawn).toHaveLength(0);
    expect(arena.flagX).toBeGreaterThan(arena.worldW);
  });
});
