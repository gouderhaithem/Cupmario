import { describe, it, expect } from 'vitest';
import { updateProjectiles } from './projectile';
import { buildLevel } from './level';
import { TILE } from './constants';
import type { GameState } from './state';
import type { Projectile } from '../types';

const level = buildLevel({
  theme: 'day',
  flagCol: 20,
  pits: [],
  plats: [],
  coins: [],
  enemyCols: [],
});

// A stationary mid-air enemy bolt that won't hit walls or the player this frame.
function bolt(id: number, alive: boolean): Projectile {
  return {
    x: (5 + id) * TILE,
    y: 3 * TILE,
    w: 8,
    h: 8,
    vx: 0,
    vy: 0,
    alive,
    from: 'enemy',
  };
}

function stateWith(projectiles: Projectile[]): GameState {
  return {
    level,
    projectiles,
    enemies: [],
    boss: null,
    difficulty: 'normal',
    player: { x: 0, y: 0, w: 10, h: 10, hurt: 99 },
  } as unknown as GameState;
}

describe('updateProjectiles compaction', () => {
  it('drops dead bolts and keeps live ones in order', () => {
    const live1 = bolt(0, true);
    const live2 = bolt(2, true);
    const state = stateWith([live1, bolt(1, false), live2, bolt(3, false)]);
    updateProjectiles(state);
    expect(state.projectiles).toEqual([live1, live2]);
  });

  it('clears the array when every bolt is spent', () => {
    const state = stateWith([bolt(0, false), bolt(1, false)]);
    updateProjectiles(state);
    expect(state.projectiles).toHaveLength(0);
  });

  it('preserves a fully-live volley', () => {
    const state = stateWith([bolt(0, true), bolt(1, true), bolt(2, true)]);
    updateProjectiles(state);
    expect(state.projectiles).toHaveLength(3);
  });
});
