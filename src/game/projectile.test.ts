import { describe, it, expect } from 'vitest';
import { updateProjectiles } from './projectile';
import { buildLevel } from './level';
import { BEAM_H, CROUCH_H, PLAYER_H, PLAYER_W, TILE } from './constants';
import type { GameState } from './state';
import type { Player, Projectile } from '../types';

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

describe('laserSweep vs crouch', () => {
  // The live laserSweep beam (game/patterns.ts): full-width, lethal (warn done).
  function beam(): Projectile {
    return {
      x: TILE,
      y: 10 * TILE - 66, // matches laserSweep beamY
      w: 10 * TILE,
      h: BEAM_H,
      vx: 0,
      vy: 0,
      alive: true,
      from: 'enemy',
      beam: true,
      warn: 0,
      life: 5,
    };
  }
  // Pip on the ground row, inside the beam's horizontal span.
  function pip(crouched: boolean): Player {
    const standTop = 10 * TILE - PLAYER_H;
    return {
      x: 5 * TILE,
      y: crouched ? standTop + (PLAYER_H - CROUCH_H) : standTop,
      w: PLAYER_W,
      h: crouched ? CROUCH_H : PLAYER_H,
      vx: 0,
      vy: 0,
      onGround: true,
      face: 1,
      hurt: 0,
      hp: 99,
      crouch: crouched,
      armed: true,
      dashFrames: 0,
      dashCd: 0,
      dashDir: 1,
    };
  }
  function beamState(player: Player): GameState {
    return {
      level,
      projectiles: [beam()],
      player,
      difficulty: 'normal',
      runHits: 0,
      shake: 0,
      reducedMotion: true,
    } as unknown as GameState;
  }

  it('hits a standing Pip', () => {
    const state = beamState(pip(false));
    updateProjectiles(state);
    expect(state.player.hurt).toBeGreaterThan(0); // took the hit
    expect(state.player.hp).toBe(98);
  });

  it('passes harmlessly over a crouched Pip', () => {
    const state = beamState(pip(true));
    updateProjectiles(state);
    expect(state.player.hurt).toBe(0); // never hit
    expect(state.player.hp).toBe(99);
  });
});
