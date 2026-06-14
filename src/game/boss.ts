// The boss: HP, phase transitions, telegraphed attacks, and a pattern scheduler.
// Reuses the projectile/enemy systems as bullet-hell (see patterns.ts). The boss
// takes damage from player bolts; contact and bolts hurt Pip via the shared
// hitPlayer path. On the boss screen a "death" instant-retries (see flow.ts).

import { setBossTempo, sfx, stopMusic } from '../engine/audio';
import { hitStop, shakeScreen } from '../engine/effects';
import {
  BOSS_BOB_SPEED,
  BOSS_BOLT_DAMAGE,
  BOSS_DASH_SPEED,
  BOSS_DESCEND_SPEED,
  BOSS_EX_DAMAGE,
  BOSS_H,
  BOSS_HOVER_EASE,
  BOSS_HURT_FLASH,
  BOSS_KO_FRAMES,
  BOSS_TELEGRAPH,
  BOSS_TRACK,
  BOSS_W,
  FLASH_FRAMES,
  HITSTOP_STOMP,
  PALETTE,
  SHAKE_HURT,
  SHAKE_STOMP,
  TILE,
} from './constants';
import { telegraphFrames } from './difficulty';
import { bossDefeated, hitPlayer } from './flow';
import { runPattern } from './patterns';
import type { GameState } from './state';
import type { Boss, BossConfig, Level } from '../types';

const KO_POP_LIFE = 60;

/** Build the live boss for an arena, hovering above the floor at center. */
export function makeBoss(cfg: BossConfig, level: Level): Boss {
  const homeY = 2 * TILE;
  return {
    name: cfg.name,
    x: level.worldW / 2 - BOSS_W / 2,
    y: homeY,
    w: BOSS_W,
    h: BOSS_H,
    hp: cfg.hp,
    maxHp: cfg.hp,
    phase: 0,
    phases: cfg.phases,
    cadence: cfg.phases[0]?.cadence ?? 60,
    attackCd: 60,
    patternIdx: 0,
    telegraph: 0,
    pending: null,
    bob: 0,
    homeY,
    dashPhase: 0,
    dashDir: 1,
    hurtFlash: 0,
    dead: false,
  };
}

/** Reset a boss to full for an instant retry (no menu). */
export function resetBoss(boss: Boss): void {
  boss.hp = boss.maxHp;
  boss.phase = 0;
  boss.cadence = boss.phases[0]?.cadence ?? 60;
  boss.attackCd = 60;
  boss.patternIdx = 0;
  boss.telegraph = 0;
  boss.pending = null;
  boss.y = boss.homeY;
  boss.dashPhase = 0;
  boss.dashDir = 1;
  boss.hurtFlash = 0;
  boss.dead = false;
}

/** Apply `dmg` to the boss from an external source (e.g. MEGABLAST). */
export function damageBoss(state: GameState, dmg: number): void {
  hurtBoss(state, dmg);
}

function hurtBoss(state: GameState, dmg: number): void {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  boss.hp = Math.max(0, boss.hp - dmg);
  boss.hurtFlash = BOSS_HURT_FLASH;
  shakeScreen(state, SHAKE_STOMP);
  sfx('bossHurt');
  if (boss.hp <= 0) {
    boss.dead = true;
    state.bossKo = BOSS_KO_FRAMES;
    state.flash = FLASH_FRAMES;
    shakeScreen(state, SHAKE_HURT);
    stopMusic();
    sfx('koCard');
    state.pops.push({
      x: boss.x + boss.w / 2,
      y: boss.y,
      life: KO_POP_LIFE,
      text: 'K.O.!',
      color: PALETTE.bossCrown,
    });
  }
}

/**
 * Move the boss this tick. Hovering, it drifts to track the player (no more
 * "static target"); during a charge dash it descends to the floor, sweeps
 * across, then rises back to its hover height. Returns the inner-arena bounds
 * used to clamp it (left/right of the walls).
 */
function moveBoss(state: GameState, boss: Boss): void {
  const left = TILE + 4;
  const right = state.level.worldW - TILE - boss.w - 4;
  const floorY = 10 * TILE - boss.h;
  const p = state.player;

  if (boss.dashPhase === 0) {
    // Hover: ease horizontally toward the player and back to hover height.
    const targetX = Math.max(left, Math.min(right, p.x + p.w / 2 - boss.w / 2));
    boss.x += (targetX - boss.x) * BOSS_TRACK;
    boss.y += (boss.homeY - boss.y) * BOSS_HOVER_EASE;
  } else if (boss.dashPhase === 1) {
    // Descend to the floor for the charge.
    boss.y = Math.min(floorY, boss.y + BOSS_DESCEND_SPEED);
    if (boss.y >= floorY) boss.dashPhase = 2;
  } else if (boss.dashPhase === 2) {
    // Dash across; stop at the far wall.
    boss.x += boss.dashDir * BOSS_DASH_SPEED;
    if (boss.x <= left || boss.x >= right) {
      boss.x = Math.max(left, Math.min(right, boss.x));
      boss.dashPhase = 3;
    }
  } else {
    // Rise back to hover height, then resume normal scheduling.
    boss.y = Math.max(boss.homeY, boss.y - BOSS_DESCEND_SPEED);
    if (boss.y <= boss.homeY) boss.dashPhase = 0;
  }
}

/**
 * Advance the boss one tick: damage intake, phase changes, movement, the
 * telegraph + pattern scheduler, and contact damage. Returns true if Pip lost a
 * life this frame (on the boss screen that means an instant retry — caller stops).
 */
export function updateBoss(state: GameState): boolean {
  const boss = state.boss;
  if (!boss) return false;

  boss.bob += BOSS_BOB_SPEED;
  if (boss.hurtFlash > 0) boss.hurtFlash -= 1;

  // Intro hold ("READY? / FIGHT!"): the boss waits before it starts attacking.
  if (state.bossIntro > 0) {
    state.bossIntro -= 1;
    return false;
  }

  // KO sequence: a beat of death-wobble, then advance the campaign.
  if (boss.dead) {
    if (state.bossKo > 0) state.bossKo -= 1;
    if (state.bossKo <= 0) bossDefeated(state);
    return false;
  }

  // Damage from player bolts overlapping the boss (pierce hits once via hitBoss).
  for (const b of state.projectiles) {
    if (!b.alive || b.from !== 'player' || b.hitBoss) continue;
    if (
      b.x + b.w > boss.x &&
      b.x < boss.x + boss.w &&
      b.y + b.h > boss.y &&
      b.y < boss.y + boss.h
    ) {
      hurtBoss(state, b.damage ?? (b.pierce ? BOSS_EX_DAMAGE : BOSS_BOLT_DAMAGE));
      if (b.pierce) b.hitBoss = true;
      else b.alive = false;
      if (boss.dead) return false;
    }
  }

  // Phase transition as HP falls (thresholds are each phase's lower bound).
  const pct = (boss.hp / boss.maxHp) * 100;
  let ph = 0;
  for (let i = 0; i < boss.phases.length - 1; i++) {
    if (pct <= boss.phases[i].toHpPct) ph = i + 1;
  }
  if (ph !== boss.phase) {
    boss.phase = ph;
    boss.cadence = boss.phases[ph].cadence;
    boss.patternIdx = 0;
    boss.telegraph = 0;
    boss.pending = null;
    boss.attackCd = Math.min(boss.attackCd, 30);
    for (const b of state.projectiles) if (b.from === 'enemy') b.alive = false;
    state.flash = FLASH_FRAMES;
    shakeScreen(state, SHAKE_HURT);
    hitStop(state, HITSTOP_STOMP); // a beat of freeze on the phase break
    sfx('bossPhase');
    setBossTempo(170 - boss.phase * 25); // music drives harder each phase
  }

  // Movement: hover-track the player, or run the active charge-dash arc.
  moveBoss(state, boss);

  // Attack scheduler: count down, telegraph, then fire the pending pattern. It
  // pauses while a charge dash is in flight (the dash IS the current attack).
  if (boss.dashPhase === 0) {
    if (boss.telegraph > 0) {
      boss.telegraph -= 1;
      if (boss.telegraph === 0 && boss.pending) {
        runPattern(state, boss, boss.pending);
        boss.pending = null;
        boss.attackCd = boss.cadence;
      }
    } else if (boss.attackCd > 0) {
      boss.attackCd -= 1;
    } else {
      const phase = boss.phases[boss.phase];
      boss.pending = phase.patterns[boss.patternIdx % phase.patterns.length];
      boss.patternIdx += 1;
      boss.telegraph = telegraphFrames(state.difficulty, BOSS_TELEGRAPH);
    }
  }

  // Contact damage — a boss is never stompable.
  const p = state.player;
  if (
    p.hurt <= 0 &&
    p.x + p.w > boss.x &&
    p.x < boss.x + boss.w &&
    p.y + p.h > boss.y &&
    p.y < boss.y + boss.h
  ) {
    if (hitPlayer(state)) return true;
  }

  return false;
}
