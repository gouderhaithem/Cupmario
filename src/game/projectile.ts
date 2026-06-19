// Bolts in flight. Player bolts (from eating a mushroom) kill enemies on
// contact; enemy bolts (from Spitters) hurt Pip. Bolts die on any solid tile
// or when they leave the world. Runs after enemies so positions are settled.

import { BOLT_GRAV, HOMING_TURN, TILE } from './constants';
import { enemyBoltMult } from './difficulty';
import { killEnemy } from './enemy';
import { hitPlayer } from './flow';
import { solid } from './physics';
import type { GameState } from './state';
import type { Projectile } from '../types';

/** Center of the nearest live target (boss or enemy) to a bolt, or null. */
function nearestTarget(state: GameState, b: Projectile): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  const consider = (x: number, y: number): void => {
    const d = (x - b.x) ** 2 + (y - b.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x, y };
    }
  };
  if (state.boss && !state.boss.dead) {
    consider(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2);
  }
  for (const e of state.enemies) {
    if (e.alive) consider(e.x + e.w / 2, e.y + e.h / 2);
  }
  return best;
}

/** Steer a homing bolt toward its nearest target, preserving its speed. */
function steerHoming(state: GameState, b: Projectile): void {
  const target = nearestTarget(state, b);
  if (!target) return;
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const cur = Math.atan2(b.vy, b.vx);
  const want = Math.atan2(target.y - (b.y + b.h / 2), target.x - (b.x + b.w / 2));
  let delta = want - cur;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const turn = Math.max(-HOMING_TURN, Math.min(HOMING_TURN, delta));
  const ang = cur + turn;
  b.vx = Math.cos(ang) * speed;
  b.vy = Math.sin(ang) * speed;
}

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
  let lostLife = false;

  for (const b of state.projectiles) {
    if (!b.alive) continue;

    // Stationary boss beam (laserSweep): warn (harmless) → lethal → expire. It
    // never moves and ignores walls; a crouch lowers Pip's profile under it.
    if (b.beam) {
      if ((b.warn ?? 0) > 0) {
        b.warn = (b.warn ?? 0) - 1;
        continue;
      }
      if ((b.life ?? 0) <= 0) {
        b.alive = false;
        continue;
      }
      b.life = (b.life ?? 0) - 1;
      // Crouch shrinks Pip's real hitbox (see updateCrouch), so a ducked profile
      // already slips under a sweeping beam — no separate duck offset needed.
      for (const pw of state.players) {
        const p = pw.player;
        if (p.hurt <= 0 && b.x + b.w > p.x && b.x < p.x + p.w && b.y + b.h > p.y && b.y < p.y + p.h) {
          if (hitPlayer(state, pw)) {
            lostLife = true;
            break;
          }
        }
      }
      if (lostLife) break;
      continue;
    }

    // Ranged bolts (e.g. SPREAD pellets) fizzle out at distance.
    if (b.ttl !== undefined) {
      b.ttl -= 1;
      if (b.ttl <= 0) {
        b.alive = false;
        continue;
      }
    }

    // Homing bolts steer; lobbed (arc) bolts accelerate downward.
    if (b.homing && b.from === 'player') steerHoming(state, b);
    if (b.grav) b.vy += BOLT_GRAV;
    // Difficulty scales incoming fire: assist slows it, expert speeds it up.
    const m = b.from === 'enemy' ? enemyBoltMult(state.difficulty) : 1;
    b.x += b.vx * m;
    b.y += b.vy * m;

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
          // A piercing EX/Super bolt keeps going; a normal bolt is spent.
          if (!b.pierce) {
            b.alive = false;
            break;
          }
        }
      }
    } else {
      // Enemy bolt: hurt the first pawn it overlaps (unless mid-invulnerability).
      for (const pw of state.players) {
        const p = pw.player;
        if (p.hurt <= 0 && b.x + b.w > p.x && b.x < p.x + p.w && b.y + b.h > p.y && b.y < p.y + p.h) {
          b.alive = false;
          if (hitPlayer(state, pw)) lostLife = true;
          break;
        }
      }
      if (lostLife) break;
    }
  }

  // Drop spent bolts via a single-pass in-place compaction. Avoids the old
  // backward-splice (repeated array shifts → ~O(n²) when a whole bullet-hell
  // volley expires on the same frame); this is one linear sweep, no shifting.
  const arr = state.projectiles;
  let w = 0;
  for (let r = 0; r < arr.length; r++) {
    if (arr[r].alive) {
      if (w !== r) arr[w] = arr[r];
      w++;
    }
  }
  arr.length = w;

  return lostLife;
}
