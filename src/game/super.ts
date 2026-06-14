// Super meter spend. One card = an EX shot (a big, fast, piercing bolt); a full
// meter = MEGABLAST, which wipes every enemy bolt on screen and kills every
// on-screen enemy in a white flash. Cards are earned by parrying (see parry.ts).

import { sfx } from '../engine/audio';
import { shakeScreen } from '../engine/effects';
import {
  BOLT_H,
  BOLT_W,
  BOSS_MEGA_DAMAGE,
  EX_SCALE,
  EX_SPEED_MULT,
  FLASH_FRAMES,
  PALETTE,
  PLAYER_BOLT_SPEED,
  SHAKE_HURT,
  SUPER_MAX,
  VIEW_W,
} from './constants';
import { damageBoss } from './boss';
import { killEnemy } from './enemy';
import type { GameState } from './state';
import type { Projectile } from '../types';
import { currentWeapon } from './weapons';

export function updateSuper(state: GameState): void {
  const keys = state.keys;

  if (keys.super && !state.superLatch) {
    state.superLatch = true;
    if (state.superCards >= SUPER_MAX) {
      megablast(state);
      state.runSupers += 1;
    } else if (state.superCards >= 1) {
      exShot(state);
      state.superCards -= 1;
      state.runSupers += 1;
    }
  } else if (!keys.super) {
    state.superLatch = false;
  }

  if (state.flash > 0) state.flash -= 1;
}

/**
 * EX shot (1 card) — distinct per equipped weapon (§9.4). Every variant pierces
 * and deals defined boss damage; the *shape* matches the gun's identity:
 * peashot a lance, spread a wide blast, lobber heavy bombs, charge a giant beam,
 * homing a missile volley. Fired along Pip's facing.
 */
function exShot(state: GameState): void {
  const p = state.player;
  const dir = p.face;
  const muzzleY = p.y + p.h * 0.42;
  // A piercing EX bolt at scale `s`, angled `ang` rad off the facing, given damage.
  const push = (s: number, ang: number, speed: number, damage: number, grav?: boolean): void => {
    const w = BOLT_W * s;
    const h = BOLT_H * s;
    const vx = Math.cos(ang) * speed * dir;
    const vy = Math.sin(ang) * speed;
    const bolt: Projectile = {
      x: dir > 0 ? p.x + p.w : p.x - w,
      y: muzzleY - h / 2,
      w,
      h,
      vx,
      vy,
      alive: true,
      from: 'player',
      pierce: true,
      damage,
      grav: grav || undefined,
    };
    state.projectiles.push(bolt);
  };

  const base = PLAYER_BOLT_SPEED * EX_SPEED_MULT;
  switch (currentWeapon(state).id) {
    case 'spread':
      // Wide piercing buckshot — 7 pellets, full range (no falloff on the EX).
      for (let i = -3; i <= 3; i++) push(EX_SCALE * 0.7, i * 0.16, base * 0.85, 2);
      break;
    case 'lobber':
      // Three heavy arcing bombs at staggered speeds.
      [0.7, 1, 1.3].forEach((m) => push(EX_SCALE * 1.1, -0.5, base * 0.7 * m, 4, true));
      break;
    case 'charge':
      // One giant piercing beam-lance.
      push(EX_SCALE * 1.8, 0, base * 1.25, 8);
      break;
    case 'homing':
      // A fanned volley of five homing missiles.
      for (let i = -2; i <= 2; i++) {
        const w = BOLT_W * EX_SCALE * 0.7;
        const h = BOLT_H * EX_SCALE * 0.7;
        state.projectiles.push({
          x: dir > 0 ? p.x + p.w : p.x - w,
          y: muzzleY - h / 2,
          w,
          h,
          vx: dir * base * 0.7,
          vy: i * 2.2,
          alive: true,
          from: 'player',
          pierce: true,
          damage: 2,
          homing: true,
        });
      }
      break;
    default:
      // peashot: a single large, fast piercing lance.
      push(EX_SCALE, 0, base, 4);
  }
  sfx('shoot');
}

/** Screen-clear: drop all enemy bolts, kill on-screen enemies, flash + shake. */
function megablast(state: GameState): void {
  for (const b of state.projectiles) {
    if (b.from === 'enemy') b.alive = false;
  }
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.x + e.w < state.camX || e.x > state.camX + VIEW_W) continue;
    killEnemy(state, e);
  }
  // Big chunk of boss damage when a MEGABLAST lands during a boss fight.
  if (state.boss && !state.boss.dead) damageBoss(state, BOSS_MEGA_DAMAGE);
  state.superCards = 0;
  state.flash = FLASH_FRAMES;
  shakeScreen(state, SHAKE_HURT);
  sfx('super');
  state.pops.push({
    x: state.player.x + state.player.w / 2,
    y: state.player.y - 12,
    life: 50,
    text: 'MEGABLAST!',
    color: PALETTE.boltPinkHi,
  });
}
