import { describe, it, expect } from 'vitest';
import { wallBeside, updateWall } from './wall';
import { buildLevel } from './level';
import {
  PLAYER_H,
  PLAYER_W,
  TILE,
  WALL_COYOTE_FRAMES,
  WALL_JUMP_LOCK,
  WALL_SLIDE_SPEED,
} from './constants';
import type { Keys, Player } from '../types';
import { makePawn } from './state';
import type { GameState } from './state';

function player(over: Partial<Player> = {}): Player {
  return {
    x: 5 * TILE,
    y: 5 * TILE,
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
    wallSlide: false,
    wallDir: 0,
    wallCoyote: 0,
    airDashUsed: false,
    ...over,
  };
}

function keys(over: Partial<Keys> = {}): Keys {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false,
    dash: false,
    lock: false,
    super: false,
    switchWeapon: false,
    ...over,
  };
}

// A solid wall column at col 8 (a tall brick stack rows 0..9), open elsewhere.
const level = buildLevel({
  theme: 'day',
  flagCol: 20,
  pits: [],
  plats: [
    [0, 8, 1],
    [2, 8, 1],
    [4, 8, 1],
    [6, 8, 1],
  ],
  coins: [],
  enemyCols: [],
});

function stateWith(p: Player, k: Keys): GameState {
  const pawn = makePawn(p);
  pawn.keys = k;
  // reducedMotion skips the cosmetic wall-dust spawn (no puffs array on this fake state).
  return { level, reducedMotion: true, frame: 0, players: [pawn] } as unknown as GameState;
}

/** Run one wall-cling tick on pawn[0] of a fresh fake state. */
function runWall(p: Player, k: Keys): void {
  const s = stateWith(p, k);
  updateWall(s, s.players[0]);
}

describe('wallBeside', () => {
  it('detects a wall flush against Pip on the right', () => {
    // Pip flush against the left face of the col-8 wall.
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE });
    expect(wallBeside(level, p, 1)).toBe(true);
    expect(wallBeside(level, p, -1)).toBe(false);
  });

  it('detects a wall flush against Pip on the left', () => {
    // Pip flush against the right face of the col-8 wall.
    const p = player({ x: 9 * TILE, y: 4 * TILE });
    expect(wallBeside(level, p, -1)).toBe(true);
    expect(wallBeside(level, p, 1)).toBe(false);
  });

  it('reports no wall in open space', () => {
    const p = player({ x: 3 * TILE, y: 4 * TILE });
    expect(wallBeside(level, p, 1)).toBe(false);
    expect(wallBeside(level, p, -1)).toBe(false);
  });
});

describe('updateWall', () => {
  it('starts a wall slide when airborne, falling, and pressing into a wall', () => {
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE, vy: 8 });
    runWall(p, keys({ right: true }));
    expect(p.wallSlide).toBe(true);
    expect(p.wallDir).toBe(1);
    expect(p.wallCoyote).toBe(WALL_COYOTE_FRAMES);
    expect(p.face).toBe(1);
  });

  it('clamps descent to the slide speed while sliding', () => {
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE, vy: 14 });
    runWall(p, keys({ right: true }));
    expect(p.vy).toBeLessThanOrEqual(WALL_SLIDE_SPEED);
  });

  it('does not slide while grounded', () => {
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE, vy: 8, onGround: true });
    runWall(p, keys({ right: true }));
    expect(p.wallSlide).toBe(false);
  });

  it('does not slide when not pushing toward the wall', () => {
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE, vy: 8 });
    runWall(p, keys({ left: true }));
    expect(p.wallSlide).toBe(false);
  });

  it('does not slide while rising', () => {
    const p = player({ x: 8 * TILE - PLAYER_W, y: 4 * TILE, vy: -6 });
    runWall(p, keys({ right: true }));
    expect(p.wallSlide).toBe(false);
  });

  it('counts down wall coyote after leaving the wall', () => {
    const p = player({ wallCoyote: 3, x: 3 * TILE, y: 4 * TILE, vy: 8 });
    runWall(p, keys());
    expect(p.wallCoyote).toBe(2);
    expect(p.wallSlide).toBe(false);
  });
});

describe('wall-jump tuning', () => {
  it('keeps an input lockout long enough to read as a push-off', () => {
    expect(WALL_JUMP_LOCK).toBeGreaterThan(0);
    expect(WALL_SLIDE_SPEED).toBeLessThan(8);
  });
});
