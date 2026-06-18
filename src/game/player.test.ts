import { describe, it, expect } from 'vitest';
import { resizeCrouch } from './player';
import { buildLevel } from './level';
import { CROUCH_H, PLAYER_H, PLAYER_W, TILE } from './constants';
import type { Player } from '../types';

function player(over: Partial<Player> = {}): Player {
  return {
    x: 5 * TILE,
    y: 10 * TILE - PLAYER_H, // standing on the ground row
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: true,
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

// Open ground at col 5; a low brick at row 8 over col 12 leaves a one-tile
// (row 9) crawl gap above the ground beneath it.
const level = buildLevel({
  theme: 'day',
  flagCol: 20,
  pits: [],
  plats: [[8, 12, 1]],
  coins: [],
  enemyCols: [],
});

describe('resizeCrouch', () => {
  it('shrinks the hitbox to crawl height with feet planted', () => {
    const p = player();
    const feet = p.y + p.h;
    resizeCrouch(level, p, true);
    expect(p.h).toBe(CROUCH_H);
    expect(p.crouch).toBe(true);
    expect(p.y + p.h).toBe(feet); // feet stay on the ground
    expect(CROUCH_H).toBeLessThan(TILE); // fits a one-tile gap
  });

  it('stands back up in the open, restoring feet position', () => {
    const p = player();
    const feet = p.y + p.h;
    resizeCrouch(level, p, true);
    resizeCrouch(level, p, false);
    expect(p.h).toBe(PLAYER_H);
    expect(p.crouch).toBe(false);
    expect(p.y + p.h).toBe(feet);
  });

  it('stays crouched while a solid tile is overhead', () => {
    // Sit Pip under the row-8 brick at col 12 (feet on the ground row).
    const p = player({ x: 12 * TILE, y: 10 * TILE - PLAYER_H });
    resizeCrouch(level, p, true); // crawl in
    expect(p.h).toBe(CROUCH_H);
    resizeCrouch(level, p, false); // try to stand — blocked by the brick
    expect(p.h).toBe(CROUCH_H);
    expect(p.crouch).toBe(true);
  });

  it('is idempotent when already in the requested state', () => {
    const p = player();
    resizeCrouch(level, p, false); // already standing, nothing to do
    expect(p.h).toBe(PLAYER_H);
    resizeCrouch(level, p, true);
    const y = p.y;
    resizeCrouch(level, p, true); // still crouching, no further shift
    expect(p.y).toBe(y);
    expect(p.h).toBe(CROUCH_H);
  });
});
