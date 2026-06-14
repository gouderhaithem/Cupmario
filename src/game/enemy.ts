// Enemy AI + player/enemy collision. Walkers and Spitters patrol the ground
// (turning at bounds, walls, and ledges); Drones fly a sine path; Turrets sit
// still and fire aimed bursts. Contact resolves as a stomp (kill, with a
// stomp-chain combo) or a hit (lose HP, else a life).

import { sfx } from '../engine/audio';
import { hitStop, shakeScreen } from '../engine/effects';
import {
  BOLT_H,
  BOLT_W,
  ENEMY_BOLT_SPEED,
  FLYER_AMP,
  FLYER_BOB_SPEED,
  FLYER_SCORE,
  HITSTOP_STOMP,
  PALETTE,
  PARRY_EVERY,
  SHAKE_STOMP,
  SHOOTER_AIM_Y,
  SHOOTER_COOLDOWN,
  SHOOTER_RANGE,
  SHOOTER_SCORE,
  STOMP_BOUNCE,
  STOMP_COMBO_CAP,
  STOMP_SCORE,
  TILE,
  TURRET_BURST,
  TURRET_COOLDOWN,
  TURRET_RANGE,
  TURRET_SCORE,
  TURRET_SPREAD,
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
 * Kill an enemy: score it (×`mult` for stomp chains), shake/sfx, float a "+score"
 * pop, and — for a Spitter — drop a power mushroom. Shared by stomp + bolt paths.
 */
export function killEnemy(state: GameState, e: Enemy, mult = 1): void {
  e.alive = false;
  let gain = STOMP_SCORE;
  if (e.kind === 'shooter') {
    gain += SHOOTER_SCORE;
    spawnMushroom(state, e.x + e.w / 2, e.y);
  } else if (e.kind === 'flyer') {
    gain += FLYER_SCORE;
  } else if (e.kind === 'turret') {
    gain += TURRET_SCORE;
  }
  gain = Math.round(gain * mult);
  state.score += gain;
  shakeScreen(state, SHAKE_STOMP);
  sfx('stomp');
  const text = mult > 1 ? `+${gain} x${mult}` : `+${gain}`;
  state.pops.push({
    x: e.x + e.w / 2,
    y: e.y,
    life: POP_LIFE,
    text,
    color: mult > 1 ? PALETTE.combo : PALETTE.popStomp,
  });
}

/** A Spitter fires a bolt horizontally toward Pip; every Nth shot is parryable. */
function fireBolt(state: GameState, e: Enemy, dir: 1 | -1): void {
  const cy = e.y + e.h / 2 - BOLT_H / 2;
  e.shotCount += 1;
  state.projectiles.push({
    x: dir > 0 ? e.x + e.w : e.x - BOLT_W,
    y: cy,
    w: BOLT_W,
    h: BOLT_H,
    vx: dir * ENEMY_BOLT_SPEED,
    vy: 0,
    alive: true,
    from: 'enemy',
    parryable: e.shotCount % PARRY_EVERY === 0,
  });
}

/** A Turret fires an aimed N-bolt burst toward Pip; every Nth shot is parryable. */
function fireBurst(state: GameState, e: Enemy, dx: number, dy: number): void {
  const base = Math.atan2(dy, dx);
  const cx = e.x + e.w / 2 - BOLT_W / 2;
  const cy = e.y + e.h / 2 - BOLT_H / 2;
  for (let i = 0; i < TURRET_BURST; i++) {
    e.shotCount += 1;
    const t = TURRET_BURST <= 1 ? 0 : i / (TURRET_BURST - 1) - 0.5;
    const ang = base + t * TURRET_SPREAD;
    state.projectiles.push({
      x: cx,
      y: cy,
      w: BOLT_W,
      h: BOLT_H,
      vx: Math.cos(ang) * ENEMY_BOLT_SPEED,
      vy: Math.sin(ang) * ENEMY_BOLT_SPEED,
      alive: true,
      from: 'enemy',
      parryable: e.shotCount % PARRY_EVERY === 0,
    });
  }
}

/** Ground patrol: turn at patrol bounds, a wall ahead, or a ledge edge. */
function patrol(state: GameState, e: Enemy): void {
  e.x += e.vx;
  const level = state.level;
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
}

/**
 * Update all enemies and resolve player contact.
 * Returns true if the player lost a life this frame (caller should stop).
 */
export function updateEnemies(state: GameState): boolean {
  const p = state.player;
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    if (e.kind === 'flyer') {
      e.bob = (e.bob ?? 0) + FLYER_BOB_SPEED;
      e.x += e.vx;
      if (e.x < e.minX || e.x + e.w > e.maxX) {
        e.vx = -e.vx;
        e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
      }
      e.y = (e.baseY ?? e.y) + Math.sin(e.bob) * FLYER_AMP;
    } else if (e.kind === 'turret') {
      if (e.shootCd > 0) e.shootCd -= 1;
      const dx = pcx - (e.x + e.w / 2);
      const dy = pcy - (e.y + e.h / 2);
      if (e.shootCd <= 0 && Math.hypot(dx, dy) <= TURRET_RANGE) {
        fireBurst(state, e, dx, dy);
        e.shootCd = TURRET_COOLDOWN;
      }
    } else {
      patrol(state, e);
      if (e.kind === 'shooter') {
        if (e.shootCd > 0) e.shootCd -= 1;
        const dx = pcx - (e.x + e.w / 2);
        const dy = pcy - (e.y + e.h / 2);
        if (e.shootCd <= 0 && Math.abs(dx) <= SHOOTER_RANGE && Math.abs(dy) <= SHOOTER_AIM_Y) {
          fireBolt(state, e, dx >= 0 ? 1 : -1);
          e.shootCd = SHOOTER_COOLDOWN;
        }
      }
    }

    // Player overlap (small insets so contact feels fair).
    const overlap =
      p.x + p.w > e.x + 4 && p.x < e.x + e.w - 4 && p.y + p.h > e.y + 4 && p.y < e.y + e.h;
    if (!overlap) continue;

    const fromTop = p.y + p.h - e.y < STOMP_TOP && p.vy > 0;
    if (fromTop) {
      state.combo = Math.min(state.combo + 1, STOMP_COMBO_CAP);
      killEnemy(state, e, 2 ** (state.combo - 1));
      p.vy = STOMP_BOUNCE;
      hitStop(state, HITSTOP_STOMP);
    } else if (p.hurt <= 0) {
      if (hitPlayer(state)) return true;
    }
  }

  return false;
}
