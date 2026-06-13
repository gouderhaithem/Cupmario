// Enemy patrol AI + player/enemy collision. Enemies turn at patrol bounds,
// walls, and ledge edges. "Spitter" enemies also fire bolts at Pip. Contact
// resolves as a stomp (kill) or a hit (lose power, else lose a life).

import { sfx } from '../engine/audio';
import { hitStop, shakeScreen } from '../engine/effects';
import {
  BOLT_H,
  BOLT_W,
  ENEMY_BOLT_SPEED,
  HITSTOP_STOMP,
  PALETTE,
  SHAKE_STOMP,
  SHOOTER_AIM_Y,
  SHOOTER_COOLDOWN,
  SHOOTER_RANGE,
  SHOOTER_SCORE,
  STOMP_BOUNCE,
  STOMP_SCORE,
  TILE,
} from './constants';
import { hitPlayer } from './flow';
import { spawnMushroom } from './mushroom';
import { solid } from './physics';
import type { GameState } from './state';
import type { Enemy } from '../types';

/** Vertical reach for a "from the top" stomp. */
const STOMP_TOP = 22;
const POP_LIFE = 36;

/**
 * Kill an enemy: score it, shake/sfx, float a "+score" pop, and — for a
 * Spitter — drop a power mushroom. Shared by the stomp and player-bolt paths.
 */
export function killEnemy(state: GameState, e: Enemy): void {
  e.alive = false;
  let gain = STOMP_SCORE;
  if (e.kind === 'shooter') {
    gain += SHOOTER_SCORE;
    spawnMushroom(state, e.x + e.w / 2, e.y);
  }
  state.score += gain;
  shakeScreen(state, SHAKE_STOMP);
  sfx('stomp');
  state.pops.push({ x: e.x + e.w / 2, y: e.y, life: POP_LIFE, text: `+${gain}`, color: PALETTE.popStomp });
}

/** A Spitter fires a bolt horizontally toward Pip. */
function fireBolt(state: GameState, e: Enemy, dir: 1 | -1): void {
  const cy = e.y + e.h / 2 - BOLT_H / 2;
  state.projectiles.push({
    x: dir > 0 ? e.x + e.w : e.x - BOLT_W,
    y: cy,
    w: BOLT_W,
    h: BOLT_H,
    vx: dir * ENEMY_BOLT_SPEED,
    vy: 0,
    alive: true,
    from: 'enemy',
  });
}

/**
 * Update all enemies and resolve player contact.
 * Returns true if the player lost a life this frame (caller should stop).
 */
export function updateEnemies(state: GameState): boolean {
  const p = state.player;
  const level = state.level;
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    e.x += e.vx;

    // Turn around at patrol bounds, a wall ahead, or a ledge edge.
    const aheadC = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / TILE);
    const footR = Math.floor((e.y + e.h + 2) / TILE);
    const midR = Math.floor((e.y + e.h / 2) / TILE);
    if (
      e.x < e.minX ||
      e.x + e.w > e.maxX ||
      solid(level, aheadC, midR) ||
      !solid(level, aheadC, footR)
    ) {
      e.vx = -e.vx;
      e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
    }

    // Spitters fire at Pip when he's within range and roughly level.
    if (e.kind === 'shooter') {
      if (e.shootCd > 0) e.shootCd -= 1;
      const dx = pcx - (e.x + e.w / 2);
      const dy = pcy - (e.y + e.h / 2);
      if (e.shootCd <= 0 && Math.abs(dx) <= SHOOTER_RANGE && Math.abs(dy) <= SHOOTER_AIM_Y) {
        fireBolt(state, e, dx >= 0 ? 1 : -1);
        e.shootCd = SHOOTER_COOLDOWN;
      }
    }

    // Player overlap (small insets so contact feels fair).
    const overlap =
      p.x + p.w > e.x + 4 && p.x < e.x + e.w - 4 && p.y + p.h > e.y + 4 && p.y < e.y + e.h;
    if (!overlap) continue;

    const fromTop = p.y + p.h - e.y < STOMP_TOP && p.vy > 0;
    if (fromTop) {
      killEnemy(state, e);
      p.vy = STOMP_BOUNCE;
      hitStop(state, HITSTOP_STOMP);
    } else if (p.hurt <= 0) {
      if (hitPlayer(state)) return true;
    }
  }

  return false;
}
