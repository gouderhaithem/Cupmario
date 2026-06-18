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
  BOSS_HOP_CD,
  BOSS_HOP_GRAVITY,
  BOSS_HOP_V,
  BOSS_SIDE_MARGIN,
  BOSS_SHAPES,
  BOSS_SKINS,
  BOSS_EX_DAMAGE,
  BOSS_H,
  BOSS_HURT_FLASH,
  BOSS_KO_FRAMES,
  BOSS_TELEGRAPH,
  BOSS_W,
  FLASH_FRAMES,
  HITSTOP_STOMP,
  LUMBER_TRACK,
  PALETTE,
  SHAKE_HURT,
  SHAKE_STOMP,
  STOKE_AMP,
  STOKE_SPEED,
  SWAY_SPEED,
  TILE,
} from './constants';
import { telegraphFrames } from './difficulty';
import { bossDefeated, hitPlayer } from './flow';
import { runPattern } from './patterns';
import type { GameState } from './state';
import type { Boss, BossConfig, BossSide, Level } from '../types';

const KO_POP_LIFE = 60;

/** Anchor X for a boss given its preferred side and body width. */
function homeForSide(level: Level, w: number, side: BossSide): number {
  if (side === 'right') return level.worldW - TILE - BOSS_SIDE_MARGIN - w;
  if (side === 'left') return TILE + BOSS_SIDE_MARGIN;
  return level.worldW / 2 - w / 2;
}

/** Build the live boss for an arena. Every boss now stands on the floor. */
export function makeBoss(cfg: BossConfig, level: Level, index = 0): Boss {
  const moveMode = cfg.moveMode ?? 'planted';
  // Per-boss body size (some bosses loom larger than the base box).
  const w = Math.round(BOSS_W * (cfg.scale ?? 1));
  const h = Math.round(BOSS_H * (cfg.scale ?? 1));
  // All bosses are grounded: the box bottom rests on the floor (row 10).
  const homeY = 10 * TILE - h;
  const homeX = homeForSide(level, w, cfg.homeSide ?? 'center');
  const skin = BOSS_SKINS[Math.min(index, BOSS_SKINS.length - 1)];
  const shape = BOSS_SHAPES[Math.min(index, BOSS_SHAPES.length - 1)];
  return {
    name: cfg.name,
    skin,
    shape,
    x: homeX,
    y: homeY,
    w,
    h,
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
    homeX,
    dashPhase: 0,
    dashDir: 1,
    hurtFlash: 0,
    dead: false,
    moveMode,
    boltTint: cfg.boltTint,
    boltTintHi: cfg.boltTintHi,
    swayT: 0,
    spiralA: 0,
    vy: 0,
    jumpCd: BOSS_HOP_CD,
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
  boss.x = boss.homeX;
  boss.y = boss.homeY;
  boss.dashPhase = 0;
  boss.dashDir = 1;
  boss.hurtFlash = 0;
  boss.dead = false;
  boss.swayT = 0;
  boss.spiralA = 0;
  boss.vy = 0;
  boss.jumpCd = BOSS_HOP_CD;
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

/** Inner-arena horizontal bounds (just inside the side walls). */
function arenaBounds(state: GameState, boss: Boss): { left: number; right: number } {
  return { left: TILE + 4, right: state.level.worldW - TILE - boss.w - 4 };
}

/** Move the boss this tick, by its move mode (all grounded). */
function moveBoss(state: GameState, boss: Boss): void {
  if (boss.moveMode === 'lumber') return moveLumber(state, boss);
  if (boss.moveMode === 'stoke') return moveStoke(state, boss);
  if (boss.moveMode === 'hop') return moveHop(state, boss);
  movePlanted(state, boss);
}

/**
 * BARKBROOD (tree): roots itself on one side of the arena and springs straight
 * up on a timer, slamming back down. Anchored horizontally at homeX — the hop is
 * purely vertical, so the canopy stays in its corner while the trunk leaps.
 */
function moveHop(state: GameState, boss: Boss): void {
  boss.swayT += SWAY_SPEED;
  boss.x = boss.homeX;
  if (boss.vy !== 0 || boss.y < boss.homeY) {
    // Airborne: integrate gravity, then land (with a thud) on the floor.
    boss.vy += BOSS_HOP_GRAVITY;
    boss.y += boss.vy;
    if (boss.y >= boss.homeY) {
      boss.y = boss.homeY;
      boss.vy = 0;
      boss.jumpCd = BOSS_HOP_CD;
      shakeScreen(state, SHAKE_STOMP);
    }
  } else if (boss.jumpCd > 0) {
    boss.jumpCd -= 1;
  } else {
    boss.vy = BOSS_HOP_V;
    sfx('jump');
  }
}

/**
 * BARKBROOD (tree): rooted to its spot. It never chases — only sways (the lean
 * is purely cosmetic, driven by swayT in the sprite). Pin x/y to home.
 */
function movePlanted(_state: GameState, boss: Boss): void {
  boss.swayT += SWAY_SPEED;
  boss.x = boss.homeX;
  boss.y = boss.homeY;
}

/**
 * GRANITE (golem): lumbers slowly across the floor toward Pip; when a charge is
 * armed (chargeDash sets dashPhase=1) it rolls across the arena and stops at the
 * far wall. Already grounded, so there's no descend/rise — the roll is in-plane.
 */
function moveLumber(state: GameState, boss: Boss): void {
  const { left, right } = arenaBounds(state, boss);
  const p = state.player;
  boss.y = boss.homeY;
  if (boss.dashPhase === 0) {
    const targetX = Math.max(left, Math.min(right, p.x + p.w / 2 - boss.w / 2));
    boss.x += (targetX - boss.x) * LUMBER_TRACK;
  } else if (boss.dashPhase === 1) {
    boss.dashPhase = 2; // grounded already — begin the roll immediately
    sfx('dash');
  } else if (boss.dashPhase === 2) {
    boss.x += boss.dashDir * BOSS_DASH_SPEED;
    if (boss.x <= left || boss.x >= right) {
      boss.x = Math.max(left, Math.min(right, boss.x));
      boss.dashPhase = 0;
      shakeScreen(state, SHAKE_STOMP); // slam into the wall
    }
  } else {
    boss.dashPhase = 0;
  }
}

/** RIME (ice): shuffles side to side around its center on the floor. */
function moveStoke(state: GameState, boss: Boss): void {
  const { left, right } = arenaBounds(state, boss);
  boss.swayT += STOKE_SPEED;
  boss.x = Math.max(left, Math.min(right, boss.homeX + Math.sin(boss.swayT) * STOKE_AMP));
  boss.y = boss.homeY;
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
    state.hazards = []; // clear lingering arena hazards on a phase break
    state.flash = FLASH_FRAMES;
    shakeScreen(state, SHAKE_HURT);
    hitStop(state, HITSTOP_STOMP); // a beat of freeze on the phase break
    sfx('bossPhase');
    setBossTempo(170 - boss.phase * 25); // music drives harder each phase
  }

  // Movement: sway / lumber-track / shuffle, or run the active charge-roll.
  moveBoss(state, boss);

  // Attack scheduler: count down, telegraph, then fire the pending pattern. It
  // pauses while a charge roll is in flight (the roll IS the current attack).
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
