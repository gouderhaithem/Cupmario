// Boss attack patterns. Each is a small function that reads the boss + player
// and pushes bolts (or adds) into state — reusing the existing Projectile and
// Enemy systems as the bullet-hell engine. No rendering, no screen changes.

import { sfx } from '../engine/audio';
import {
  BEAM_H,
  BEAM_LIFE,
  BEAM_WARN,
  BOLT_H,
  BOLT_W,
  BOSS_MAX_ADDS,
  FAN_SPEED,
  FAN_SPREAD,
  GROUNDPOUND_SPEED,
  PINKRAIN_COUNT,
  PINKRAIN_VY,
  RING_COUNT,
  RING_SPEED,
  SHOOTER_SPEED_MULT,
  SPITARC_TRAVEL,
  SPITARC_VY,
  TELEPORT_FLASH,
  TELEPORT_HIGH_Y,
  TELEPORT_LOW_Y,
  TILE,
} from './constants';
import { telegraphFrames } from './difficulty';
import type { Boss, Enemy, PatternName } from '../types';
import type { GameState } from './state';

// Summoned-walker geometry (mirrors level.ts' patrol enemies).
const WALKER_W = 38;
const WALKER_H = 38;
const WALKER_SPEED = 1.2;

/** Push one enemy bolt into the world. */
function bolt(
  state: GameState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts?: { parryable?: boolean; grav?: boolean },
): void {
  state.projectiles.push({
    x,
    y,
    w: BOLT_W,
    h: BOLT_H,
    vx,
    vy,
    alive: true,
    from: 'enemy',
    parryable: opts?.parryable,
    grav: opts?.grav,
  });
}

/** Player center, the aim target for most patterns. */
function aimAt(state: GameState): { px: number; py: number } {
  const p = state.player;
  return { px: p.x + p.w / 2, py: p.y + p.h / 2 };
}

/** Lobbed shots in a parabola — walk under them or dash through. */
function spitArc(state: GameState, boss: Boss): void {
  const { px } = aimAt(state);
  const bx = boss.x + boss.w / 2 - BOLT_W / 2;
  const by = boss.y + boss.h * 0.7;
  const vx = (px - bx) / SPITARC_TRAVEL;
  for (const k of [-1, 0, 1]) {
    bolt(state, bx, by, vx + k * 0.7, SPITARC_VY, { grav: true });
  }
}

/** A 5-way spread aimed at Pip — gap-jump or dash through it. */
function boltFan(state: GameState, boss: Boss): void {
  const { px, py } = aimAt(state);
  const bx = boss.x + boss.w / 2 - BOLT_W / 2;
  const by = boss.y + boss.h * 0.6;
  const base = Math.atan2(py - by, px - bx);
  for (let i = -2; i <= 2; i++) {
    const a = base + i * FAN_SPREAD;
    bolt(state, bx, by, Math.cos(a) * FAN_SPEED, Math.sin(a) * FAN_SPEED);
  }
}

/** Slam → shockwaves race along the floor both ways. Jump on impact. */
function groundPound(state: GameState, boss: Boss): void {
  const floorY = 10 * TILE - BOLT_H - 2;
  const cx = boss.x + boss.w / 2 - BOLT_W / 2;
  bolt(state, cx, floorY, -GROUNDPOUND_SPEED, 0);
  bolt(state, cx, floorY, GROUNDPOUND_SPEED, 0);
}

/** Spawn up to two patrolling walkers as adds (capped). Stomp them. */
function summonWalkers(state: GameState, _boss: Boss): void {
  const live = state.enemies.filter((e) => e.alive).length;
  if (live >= BOSS_MAX_ADDS) return;
  const cols = Math.floor(state.level.worldW / TILE);
  const speed = WALKER_SPEED * SHOOTER_SPEED_MULT + WALKER_SPEED * 0.4;
  const make = (c: number, vx: number): Enemy => ({
    x: c * TILE,
    y: 10 * TILE - WALKER_H,
    w: WALKER_W,
    h: WALKER_H,
    vx,
    alive: true,
    minX: 1 * TILE,
    maxX: (cols - 1) * TILE,
    kind: 'walker',
    shootCd: 0,
    shotCount: 0,
  });
  state.enemies.push(make(3, speed), make(cols - 4, -speed));
}

/** Falling bolts across the arena; every 3rd is pink — parry it for meter. */
function pinkRain(state: GameState, _boss: Boss): void {
  const worldW = state.level.worldW;
  for (let i = 0; i < PINKRAIN_COUNT; i++) {
    const x = ((i + 0.5) / PINKRAIN_COUNT) * worldW - BOLT_W / 2;
    bolt(state, x, -BOLT_H, 0, PINKRAIN_VY + (i % 2) * 0.6, { parryable: i % 3 === 2 });
  }
}

/**
 * A telegraphed, full-width beam at standing head height. It warns first (a
 * dashed line), then goes lethal: duck under it (crouch lowers Pip's profile)
 * or stand on a platform above it. Doesn't move or die on the arena walls.
 */
function laserSweep(state: GameState, _boss: Boss): void {
  const beamY = 10 * TILE - 54; // standing Pip's head; a crouch slips below it
  state.projectiles.push({
    x: TILE,
    y: beamY,
    w: state.level.worldW - 2 * TILE,
    h: BEAM_H,
    vx: 0,
    vy: 0,
    alive: true,
    from: 'enemy',
    beam: true,
    warn: telegraphFrames(state.difficulty, BEAM_WARN),
    life: BEAM_LIFE,
  });
}

/**
 * Begin a charge dash toward the player's side. The choreography (descend →
 * dash across → rise) runs in boss.ts moveBoss; the boss body itself is the
 * hazard. Jump over it as it crosses — the telegraph flash is the tell.
 */
function chargeDash(state: GameState, boss: Boss): void {
  const pc = state.player.x + state.player.w / 2;
  const bc = boss.x + boss.w / 2;
  boss.dashDir = pc < bc ? -1 : 1;
  boss.dashPhase = 1; // descend; moveBoss takes it from here
}

/**
 * Blink to the far side of the arena and swap hover height (high ↔ low). Forces
 * the player to re-aim vertically — SPECTRA's signature. Brief white flash.
 */
function teleport(state: GameState, boss: Boss): void {
  const left = TILE + 4;
  const right = state.level.worldW - TILE - boss.w - 4;
  const pc = state.player.x + state.player.w / 2;
  boss.x = pc < state.level.worldW / 2 ? right : left; // blink away from Pip
  boss.homeY = boss.homeY > (TELEPORT_HIGH_Y + TELEPORT_LOW_Y) / 2 ? TELEPORT_HIGH_Y : TELEPORT_LOW_Y;
  boss.y = boss.homeY;
  state.flash = Math.max(state.flash, TELEPORT_FLASH);
  sfx('dash');
}

/** A full circle of bolts from the boss center — bullet-hell. Every 4th is pink. */
function ringBurst(state: GameState, boss: Boss): void {
  const cx = boss.x + boss.w / 2 - BOLT_W / 2;
  const cy = boss.y + boss.h / 2 - BOLT_H / 2;
  for (let i = 0; i < RING_COUNT; i++) {
    const a = (i / RING_COUNT) * Math.PI * 2;
    bolt(state, cx, cy, Math.cos(a) * RING_SPEED, Math.sin(a) * RING_SPEED, {
      parryable: i % 4 === 0,
    });
  }
}

const PATTERNS: Record<PatternName, (state: GameState, boss: Boss) => void> = {
  spitArc,
  boltFan,
  groundPound,
  summonWalkers,
  pinkRain,
  laserSweep,
  chargeDash,
  teleport,
  ringBurst,
};

/** Run a named pattern. Unknown names are ignored (data is validated upstream). */
export function runPattern(state: GameState, boss: Boss, name: PatternName): void {
  const fn = PATTERNS[name];
  if (fn) fn(state, boss);
}
