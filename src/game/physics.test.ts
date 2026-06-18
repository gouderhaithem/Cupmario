import { describe, it, expect } from 'vitest';
import { solid, collideX, collideY } from './physics';
import { buildLevel } from './level';
import { COLS, ROWS, TILE, PLAYER_H, PLAYER_W } from './constants';
import type { Player } from '../types';

const level = buildLevel({
  theme: 'day',
  flagCol: 20,
  pits: [],
  plats: [],
  coins: [],
  enemyCols: [],
});

function player(over: Partial<Player> = {}): Player {
  return {
    x: 5 * TILE,
    y: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    hurt: 0,
    hp: 3,
    crouch: false,
    armed: true,
    dashFrames: 0,
    dashCd: 0,
    dashDir: 1,
    landSquash: 0,
    ...over,
  };
}

describe('solid', () => {
  it('treats out-of-bounds as non-solid', () => {
    expect(solid(level, -1, 5)).toBe(false);
    expect(solid(level, COLS, 5)).toBe(false);
    expect(solid(level, 5, ROWS)).toBe(false);
  });
  it('reports ground tiles as solid and air as empty', () => {
    expect(solid(level, 5, 10)).toBe(true); // ground row
    expect(solid(level, 5, 5)).toBe(false); // mid-air
  });
});

describe('collideY', () => {
  it('lands the player on the ground and sets onGround', () => {
    const p = player({ y: 9 * TILE, vy: 20 });
    p.y += p.vy;
    collideY(level, p);
    expect(p.onGround).toBe(true);
    expect(p.vy).toBe(0);
    expect(p.y).toBe(10 * TILE - p.h); // snapped to sit on row 10
  });

  it('leaves onGround false while airborne', () => {
    const p = player({ y: 3 * TILE, vy: 4 });
    p.y += p.vy;
    collideY(level, p);
    expect(p.onGround).toBe(false);
  });
});

describe('collideX', () => {
  it('stops horizontal motion against a wall column', () => {
    // Force a solid wall directly to the player's right.
    const wallCol = 7;
    const walled = buildLevel({
      theme: 'day',
      flagCol: 20,
      pits: [],
      plats: [[5, wallCol, 1]], // a brick at row 5, col 7
      coins: [],
      enemyCols: [],
    });
    const p = player({ x: (wallCol - 1) * TILE, y: 5 * TILE, vx: 30 });
    p.x += p.vx; // push the right edge into the wall column
    collideX(walled, p);
    expect(p.vx).toBe(0);
    expect(p.x).toBe(wallCol * TILE - p.w);
  });
});
