// Bolts in flight. Player bolts (from eating a mushroom) kill enemies on
// contact; enemy bolts (from Spitters) hurt Pip. Bolts die on any solid tile
// or when they leave the world. Runs after enemies so positions are settled.

import { TILE } from './constants';
import { killEnemy } from './enemy';
import { hitPlayer } from './flow';
import { solid } from './physics';
import type { GameState } from './state';
import type { Projectile } from '../types';

/** True if the bolt's center sits in a solid tile. */
function inWall(state: GameState, b: Projectile): boolean {
  const c = Math.floor((b.x + b.w / 2) / TILE);
  const r = Math.floor((b.y + b.h / 2) / TILE);
  return solid(state.level, c, r);
}

/**
 * Advance bolts and resolve hits.
 * Returns true if the player lost a life this frame (caller should stop).
 */
export function updateProjectiles(state: GameState): boolean {
  const { level } = state;
  const p = state.player;
  let lostLife = false;

  for (const b of state.projectiles) {
    if (!b.alive) continue;

    b.x += b.vx;
    b.y += b.vy;

    // Leave the world or hit a wall.
    if (b.x + b.w < 0 || b.x > level.worldW || b.y > level.worldH || inWall(state, b)) {
      b.alive = false;
      continue;
    }

    if (b.from === 'player') {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (b.x + b.w > e.x && b.x < e.x + e.w && b.y + b.h > e.y && b.y < e.y + e.h) {
          killEnemy(state, e);
          b.alive = false;
          break;
        }
      }
    } else {
      // Enemy bolt: hurt Pip unless he's mid-invulnerability.
      if (p.hurt <= 0 && b.x + b.w > p.x && b.x < p.x + p.w && b.y + b.h > p.y && b.y < p.y + p.h) {
        b.alive = false;
        if (hitPlayer(state)) {
          lostLife = true;
          break;
        }
      }
    }
  }

  // Drop spent bolts.
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    if (!state.projectiles[i].alive) state.projectiles.splice(i, 1);
  }

  return lostLife;
}
