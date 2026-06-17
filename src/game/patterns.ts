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
  PILLAR_COUNT,
  PILLAR_LIFE,
  PILLAR_TILES,
  PILLAR_W,
  PILLAR_WARN,
  PINKRAIN_COUNT,
  PINKRAIN_VY,
  RING_COUNT,
  RING_SPEED,
  SHOCK_H,
  SHOCK_LIFE,
  SHOCK_SEGMENTS,
  SHOCK_WARN,
  SHOOTER_SPEED_MULT,
  SPIRAL_ARMS,
  SPIRAL_BOLTS,
  SPIRAL_SPEED,
  SPIRAL_STEP,
  SPITARC_TRAVEL,
  SPITARC_VY,
  TELEPORT_FLASH,
  TELEPORT_HIGH_Y,
  TELEPORT_LOW_Y,
  TILE,
} from './constants';
import { telegraphFrames } from './difficulty';
import type { Boss, BoltStyle, Enemy, PatternName } from '../types';
import type { GameState } from './state';

// Summoned-walker geometry (mirrors level.ts' patrol enemies).
const WALKER_W = 38;
const WALKER_H = 38;
const WALKER_SPEED = 1.2;

/** Push one enemy bolt into the world, tinted with the boss's signature color. */
function bolt(
  state: GameState,
  boss: Boss,
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts?: { parryable?: boolean; grav?: boolean; style?: BoltStyle },
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
    style: opts?.style,
    tint: boss.boltTint,
    tintHi: boss.boltTintHi,
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
    bolt(state, boss, bx, by, vx + k * 0.7, SPITARC_VY, { grav: true });
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
    bolt(state, boss, bx, by, Math.cos(a) * FAN_SPEED, Math.sin(a) * FAN_SPEED);
  }
}

/** Slam → shockwaves race along the floor both ways. Jump on impact. */
function groundPound(state: GameState, boss: Boss): void {
  const floorY = 10 * TILE - BOLT_H - 2;
  const cx = boss.x + boss.w / 2 - BOLT_W / 2;
  bolt(state, boss, cx, floorY, -GROUNDPOUND_SPEED, 0);
  bolt(state, boss, cx, floorY, GROUNDPOUND_SPEED, 0);
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
function pinkRain(state: GameState, boss: Boss): void {
  const worldW = state.level.worldW;
  for (let i = 0; i < PINKRAIN_COUNT; i++) {
    const x = ((i + 0.5) / PINKRAIN_COUNT) * worldW - BOLT_W / 2;
    bolt(state, boss, x, -BOLT_H, 0, PINKRAIN_VY + (i % 2) * 0.6, { parryable: i % 3 === 2 });
  }
}

/**
 * A telegraphed, full-width beam at standing head height. It warns first (a
 * dashed line), then goes lethal: duck under it (crouch lowers Pip's profile)
 * or stand on a platform above it. Doesn't move or die on the arena walls.
 */
function laserSweep(state: GameState, _boss: Boss): void {
  // Standing Pip's box top is 58px above the floor (420px crouched). Sit the
  // beam at 66→44px so it solidly hits a standing Pip's head/torso yet leaves a
  // ~14px gap over a crouched Pip — crouching cleanly ducks the laser.
  const beamY = 10 * TILE - 66;
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
 * Begin a charge roll toward the player's side. GRANITE is already grounded, so
 * moveBoss (lumber) rolls it straight across the floor; the boss body itself is
 * the hazard. Jump onto a platform as it crosses — the telegraph flash is the tell.
 */
function chargeDash(state: GameState, boss: Boss): void {
  const pc = state.player.x + state.player.w / 2;
  const bc = boss.x + boss.w / 2;
  boss.dashDir = pc < bc ? -1 : 1;
  boss.dashPhase = 1; // moveBoss (lumber) takes the roll from here
}

/**
 * Blink to the far side of the arena and swap height (high ↔ low). Reusable
 * library pattern (no current boss lists it). Brief white flash.
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
    bolt(state, boss, cx, cy, Math.cos(a) * RING_SPEED, Math.sin(a) * RING_SPEED, {
      parryable: i % 4 === 0,
    });
  }
}

/**
 * RIME's shard nova: two concentric rings — a fast inner ring and a slower outer
 * ring offset half a step — so the icy shards read as an expanding shockwave you
 * weave through. Every 4th inner bolt is parryable.
 */
function sparkNova(state: GameState, boss: Boss): void {
  const cx = boss.x + boss.w / 2 - BOLT_W / 2;
  const cy = boss.y + boss.h / 2 - BOLT_H / 2;
  for (let i = 0; i < RING_COUNT; i++) {
    const a = (i / RING_COUNT) * Math.PI * 2;
    bolt(state, boss, cx, cy, Math.cos(a) * RING_SPEED * 1.6, Math.sin(a) * RING_SPEED * 1.6, {
      parryable: i % 4 === 0,
    });
    const a2 = a + Math.PI / RING_COUNT;
    bolt(state, boss, cx, cy, Math.cos(a2) * RING_SPEED * 0.85, Math.sin(a2) * RING_SPEED * 0.85);
  }
}

/**
 * BARKBROOD's roots / GRANITE's stone spikes: telegraphed columns erupt from the
 * floor — one under Pip and the rest spread across the arena. Stand in a gap; the
 * warning flash is the tell. Implemented as timed arena Hazards (see hazard.ts).
 */
function rootPillars(state: GameState, _boss: Boss): void {
  const worldW = state.level.worldW;
  const floorTop = 10 * TILE;
  const h = PILLAR_TILES * TILE;
  const pcx = state.player.x + state.player.w / 2;
  const xs = [pcx - PILLAR_W / 2];
  for (let i = 1; i < PILLAR_COUNT; i++) xs.push(((i + 0.5) / PILLAR_COUNT) * worldW - PILLAR_W / 2);
  for (const x of xs) {
    state.hazards.push({
      kind: 'pillar',
      x: Math.max(TILE, Math.min(worldW - TILE - PILLAR_W, x)),
      y: floorTop - h,
      w: PILLAR_W,
      h,
      warn: telegraphFrames(state.difficulty, PILLAR_WARN),
      life: PILLAR_LIFE,
    });
  }
  sfx('stomp');
}

/**
 * RIME's freezing floor: alternating floor segments ice over after a warning.
 * Stand on a dead segment (or a platform) while the live ones flash-freeze.
 */
function floorPulse(state: GameState, _boss: Boss): void {
  const worldW = state.level.worldW;
  const seg = worldW / SHOCK_SEGMENTS;
  const floorTop = 10 * TILE;
  const odd = state.boss ? state.boss.phase % 2 : 0; // alternate which set lights
  for (let i = 0; i < SHOCK_SEGMENTS; i++) {
    if (i % 2 !== odd) continue;
    state.hazards.push({
      kind: 'shock',
      x: i * seg,
      y: floorTop - SHOCK_H,
      w: seg,
      h: SHOCK_H,
      warn: telegraphFrames(state.difficulty, SHOCK_WARN),
      life: SHOCK_LIFE,
    });
  }
  sfx('dash');
}

/**
 * A rotating arm of bolts sprays outward, advancing its angle each cast so it
 * reads as a spinning hazard. Reusable library pattern (no current boss lists it).
 */
function spiralShot(state: GameState, boss: Boss): void {
  const cx = boss.x + boss.w / 2 - BOLT_W / 2;
  const cy = boss.y + boss.h / 2 - BOLT_H / 2;
  boss.spiralA += SPIRAL_STEP;
  for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
    const base = boss.spiralA + (arm / SPIRAL_ARMS) * Math.PI * 2;
    for (let i = 1; i <= SPIRAL_BOLTS; i++) {
      const sp = SPIRAL_SPEED * (0.5 + i / SPIRAL_BOLTS);
      bolt(state, boss, cx, cy, Math.cos(base) * sp, Math.sin(base) * sp, {
        parryable: arm === 0 && i === SPIRAL_BOLTS,
      });
    }
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
  sparkNova,
  rootPillars,
  floorPulse,
  spiralShot,
};

/** Run a named pattern. Unknown names are ignored (data is validated upstream). */
export function runPattern(state: GameState, boss: Boss, name: PatternName): void {
  const fn = PATTERNS[name];
  if (fn) fn(state, boss);
}
