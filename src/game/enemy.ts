// Enemy AI + player/enemy collision. Walkers and Spitters patrol the ground
// (turning at bounds, walls, and ledges); Drones fly a sine path; Turrets sit
// still and fire aimed bursts. Contact resolves as a stomp (kill, with a
// stomp-chain combo) or a hit (lose HP, else a life).

import { sfx } from '../engine/audio';
import { hitStop, shakeScreen } from '../engine/effects';
import {
  BOMBER_AIM_X,
  BOMBER_DROP_CD,
  BOMBER_DROP_VY,
  CHARGER_CD,
  CHARGER_DASH_SPEED,
  CHARGER_PATROL_SPEED,
  CHARGER_SCORE,
  CHARGER_SIGHT_X,
  CHARGER_SIGHT_Y,
  CHARGER_WIND,
  ENEMY_ARMS,
  FLYER_AMP,
  FLYER_BOB_SPEED,
  FLYER_SCORE,
  HITSTOP_STOMP,
  MORTAR_COOLDOWN,
  MORTAR_RANGE,
  MORTAR_SCORE,
  MORTAR_TRAVEL,
  MORTAR_VY,
  PALETTE,
  PARRY_EVERY,
  SHAKE_STOMP,
  SHOOTER_AIM_Y,
  SHOOTER_COOLDOWN,
  SHOOTER_RANGE,
  SHOOTER_SCORE,
  STOMP_BOUNCE,
  STOMP_COMBO_CAP,
  COMBO_FLASH_FRAMES,
  STOMP_SCORE,
  TILE,
  TURRET_BURST,
  TURRET_COOLDOWN,
  TURRET_RANGE,
  TURRET_SCORE,
  TURRET_SPREAD,
} from './constants';
import type { EnemyArm } from './constants';
import { hitPlayer } from './flow';
import { spawnMushroom } from './mushroom';
import { solid } from './physics';
import { nearestPawn } from './state';
import type { GameState } from './state';
import type { Enemy } from '../types';

/** Vertical reach for a "from the top" stomp. */
const STOMP_TOP = 22;
const POP_LIFE = 36;

/**
 * Kill an enemy: score it (×`mult` for stomp chains), shake/sfx, float a "+score"
 * pop, and — for a Spitter — drop a power mushroom. Shared by stomp + bolt paths.
 */
export function killEnemy(state: GameState, e: Enemy, mult = 1, pitchStep = 0): void {
  e.alive = false;
  let gain = STOMP_SCORE;
  if (e.kind === 'shooter') {
    gain += SHOOTER_SCORE;
    spawnMushroom(state, e.x + e.w / 2, e.y);
  } else if (e.kind === 'flyer' || e.kind === 'bomber') {
    gain += FLYER_SCORE;
  } else if (e.kind === 'turret') {
    gain += TURRET_SCORE;
  } else if (e.kind === 'mortar') {
    gain += MORTAR_SCORE;
  } else if (e.kind === 'charger') {
    gain += CHARGER_SCORE;
  }
  gain = Math.round(gain * mult);
  state.score += gain;
  shakeScreen(state, SHAKE_STOMP);
  sfx('stomp', pitchStep);
  const text = mult > 1 ? `+${gain} x${mult}` : `+${gain}`;
  state.pops.push({
    x: e.x + e.w / 2,
    y: e.y,
    life: POP_LIFE,
    text,
    color: mult > 1 ? PALETTE.combo : PALETTE.popStomp,
  });
}

/**
 * Push one armed enemy shot, styled/tinted/sized by its EnemyArm so each foe's
 * fire reads as a distinct weapon. Pass `parryable` explicitly to override the
 * default "every Nth shot is pink" rule (lobs/bombs are dodge-by-position).
 */
function armedBolt(
  state: GameState,
  e: Enemy,
  arm: EnemyArm,
  x: number,
  y: number,
  vx: number,
  vy: number,
  parryable?: boolean,
): void {
  e.shotCount += 1;
  state.projectiles.push({
    x,
    y,
    w: arm.w,
    h: arm.h,
    vx,
    vy,
    alive: true,
    from: 'enemy',
    style: arm.style,
    tint: arm.tint,
    tintHi: arm.tintHi,
    grav: arm.grav,
    parryable: parryable ?? e.shotCount % PARRY_EVERY === 0,
  });
}

/** A Spitter fires a straight bolt toward Pip; every Nth shot is parryable. */
function fireBolt(state: GameState, e: Enemy, dir: 1 | -1): void {
  const arm = ENEMY_ARMS.shooter;
  const cy = e.y + e.h / 2 - arm.h / 2;
  armedBolt(state, e, arm, dir > 0 ? e.x + e.w : e.x - arm.w, cy, dir * arm.speed, 0);
}

/** A Turret fires an aimed N-dart burst toward Pip; every Nth dart is parryable. */
function fireBurst(state: GameState, e: Enemy, dx: number, dy: number): void {
  const arm = ENEMY_ARMS.turret;
  const base = Math.atan2(dy, dx);
  const cx = e.x + e.w / 2 - arm.w / 2;
  const cy = e.y + e.h / 2 - arm.h / 2;
  for (let i = 0; i < TURRET_BURST; i++) {
    const t = TURRET_BURST <= 1 ? 0 : i / (TURRET_BURST - 1) - 0.5;
    const ang = base + t * TURRET_SPREAD;
    armedBolt(state, e, arm, cx, cy, Math.cos(ang) * arm.speed, Math.sin(ang) * arm.speed);
  }
}

/** A Mortar lobs a high arcing shell aimed at Pip's column; falls under gravity. */
function fireMortar(state: GameState, e: Enemy, px: number): void {
  const arm = ENEMY_ARMS.mortar;
  const bx = e.x + e.w / 2 - arm.w / 2;
  armedBolt(state, e, arm, bx, e.y, (px - bx) / MORTAR_TRAVEL, MORTAR_VY, false);
}

/** A Bomber drops a fused bomb straight down from its belly; accelerates as it falls. */
function fireBomb(state: GameState, e: Enemy): void {
  const arm = ENEMY_ARMS.bomber;
  armedBolt(state, e, arm, e.x + e.w / 2 - arm.w / 2, e.y + e.h, 0, BOMBER_DROP_VY, false);
}

/** True if a solid wall (mid-body) or a ledge (no floor) lies just ahead of `e`. */
function blockedAhead(state: GameState, e: Enemy): boolean {
  const level = state.level;
  const aheadC = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / TILE);
  const footR = Math.floor((e.y + e.h + 2) / TILE);
  const midR = Math.floor((e.y + e.h / 2) / TILE);
  return solid(level, aheadC, midR) || !solid(level, aheadC, footR);
}

/** Ground patrol: turn at patrol bounds, a wall ahead, or a ledge edge. */
function patrol(state: GameState, e: Enemy): void {
  e.x += e.vx;
  if (e.x < e.minX || e.x + e.w > e.maxX || blockedAhead(state, e)) {
    e.vx = -e.vx;
    e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
  }
}

/**
 * Charger AI: stalk slowly, turning at walls/ledges; when Pip is on roughly the
 * same level and within sight, wind up (a telegraph beat) then commit a fast
 * dash in his direction. The dash ignores patrol bounds but still stops at a
 * wall or ledge, after which it cools down and resumes stalking.
 */
function updateCharger(state: GameState, e: Enemy): void {
  const p = nearestPawn(state, e.x + e.w / 2, e.y + e.h / 2).player;
  const ecx = e.x + e.w / 2;
  const dx = p.x + p.w / 2 - ecx;

  if (e.chargeState === 'dash') {
    e.x += e.vx;
    if (blockedAhead(state, e)) {
      e.chargeState = 'patrol';
      e.shootCd = CHARGER_CD;
      e.vx = (e.vx > 0 ? 1 : -1) * CHARGER_PATROL_SPEED;
    }
    return;
  }

  if (e.chargeState === 'wind') {
    e.windT = (e.windT ?? 0) - 1;
    if ((e.windT ?? 0) <= 0) {
      e.chargeState = 'dash';
      e.vx = (dx < 0 ? -1 : 1) * CHARGER_DASH_SPEED;
    }
    return;
  }

  // Stalk: drift slowly, turning at obstacles, until Pip comes into sight.
  if (e.shootCd > 0) e.shootCd -= 1;
  e.x += e.vx;
  if (blockedAhead(state, e)) e.vx = -e.vx;
  const dy = p.y + p.h / 2 - (e.y + e.h / 2);
  if (e.shootCd <= 0 && Math.abs(dx) <= CHARGER_SIGHT_X && Math.abs(dy) <= CHARGER_SIGHT_Y) {
    e.vx = (dx < 0 ? -1 : 1) * CHARGER_PATROL_SPEED;
    e.chargeState = 'wind';
    e.windT = CHARGER_WIND;
  }
}

/**
 * Update all enemies and resolve player contact.
 * Returns true if the player lost a life this frame (caller should stop).
 */
export function updateEnemies(state: GameState): boolean {
  for (const e of state.enemies) {
    if (!e.alive) continue;

    // Each enemy aims at whichever pawn is nearest to it.
    const tgt = nearestPawn(state, e.x + e.w / 2, e.y + e.h / 2).player;
    const pcx = tgt.x + tgt.w / 2;
    const pcy = tgt.y + tgt.h / 2;

    if (e.kind === 'flyer' || e.kind === 'bomber') {
      // Sine-path flight (shared by the harmless Drone and the Bomber).
      e.bob = (e.bob ?? 0) + FLYER_BOB_SPEED;
      e.x += e.vx;
      if (e.x < e.minX || e.x + e.w > e.maxX) {
        e.vx = -e.vx;
        e.x = Math.max(e.minX, Math.min(e.maxX - e.w, e.x));
      }
      e.y = (e.baseY ?? e.y) + Math.sin(e.bob) * FLYER_AMP;
      if (e.kind === 'bomber') {
        if (e.shootCd > 0) e.shootCd -= 1;
        const dx = pcx - (e.x + e.w / 2);
        if (e.shootCd <= 0 && Math.abs(dx) <= BOMBER_AIM_X && tgt.y > e.y) {
          fireBomb(state, e);
          e.shootCd = BOMBER_DROP_CD;
        }
      }
    } else if (e.kind === 'turret' || e.kind === 'mortar') {
      if (e.shootCd > 0) e.shootCd -= 1;
      const dx = pcx - (e.x + e.w / 2);
      const dy = pcy - (e.y + e.h / 2);
      if (e.kind === 'turret') {
        if (e.shootCd <= 0 && Math.hypot(dx, dy) <= TURRET_RANGE) {
          fireBurst(state, e, dx, dy);
          e.shootCd = TURRET_COOLDOWN;
        }
      } else if (e.shootCd <= 0 && Math.abs(dx) <= MORTAR_RANGE) {
        fireMortar(state, e, pcx);
        e.shootCd = MORTAR_COOLDOWN;
      }
    } else if (e.kind === 'charger') {
      updateCharger(state, e);
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

    // Contact resolves against each pawn: a stomp from above kills, otherwise a
    // side/below hit hurts that pawn. (Small insets so contact feels fair.)
    for (const pw of state.players) {
      if (pw.down) continue;
      const p = pw.player;
      const overlap =
        p.x + p.w > e.x + 4 && p.x < e.x + e.w - 4 && p.y + p.h > e.y + 4 && p.y < e.y + e.h;
      if (!overlap) continue;

      const fromTop = p.y + p.h - e.y < STOMP_TOP && p.vy > 0;
      if (fromTop) {
        pw.combo = Math.min(pw.combo + 1, STOMP_COMBO_CAP);
        // A real chain (≥2) fires the "COMBO ×N" banner; the stomp pitch climbs a
        // few semitones per link so a chain audibly escalates.
        if (pw.combo >= 2) {
          state.comboFlash = COMBO_FLASH_FRAMES;
          state.comboShown = pw.combo;
        }
        killEnemy(state, e, 2 ** (pw.combo - 1), pw.combo - 1);
        p.vy = STOMP_BOUNCE;
        hitStop(state, HITSTOP_STOMP);
        break; // enemy is dead — stop testing other pawns
      } else if (p.hurt <= 0) {
        if (hitPlayer(state, pw)) return true;
        break; // this pawn absorbed the contact this frame
      }
    }
  }

  return false;
}
