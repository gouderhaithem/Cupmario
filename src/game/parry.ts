// Parry — Cuphead's signature verb. A fresh jump press while overlapping a
// pink (parryable) enemy bolt OR a pink parry-orb deflects it harmlessly,
// bounces Pip, grants brief i-frames, and fills one Super card. Orbs add a
// forward nudge so a mid-air parry carries Pip *across a gap* — the §0 fusion
// hook ("Charge the Glitch"): the parry becomes a traversal verb, not just combat.
// The first jump off the ground consumes the latch, so a parry is the classic
// "tap jump again in mid-air on the pink".

import { sfx } from '../engine/audio';
import { hitStop, shakeScreen } from '../engine/effects';
import {
  HITSTOP_STOMP,
  PALETTE,
  PARRY_BOUNCE,
  PARRY_FLASH,
  PARRY_IFRAMES,
  SHAKE_STOMP,
  SUPER_MAX,
} from './constants';
import type { GameState, Pawn } from './state';

const POP_LIFE = 40;

/** Shared parry reward: deflect bounce, i-frames, +1 Super card, juice + pop. */
function rewardParry(state: GameState, pawn: Pawn, x: number, y: number): void {
  const p = pawn.player;
  p.vy = PARRY_BOUNCE;
  p.hurt = Math.max(p.hurt, PARRY_IFRAMES);
  state.runParries += 1;
  if (pawn.superCards < SUPER_MAX) pawn.superCards += 1;
  shakeScreen(state, SHAKE_STOMP);
  hitStop(state, HITSTOP_STOMP); // a beat of freeze for impact
  state.flash = Math.max(state.flash, PARRY_FLASH); // bright pink-white pop
  sfx('parry');
  state.pops.push({ x, y, life: POP_LIFE, text: 'PARRY!', color: PALETTE.parry });
}

const overlaps = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean => ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh;

export function tryParry(state: GameState, pawn: Pawn): void {
  const p = pawn.player;
  const keys = pawn.keys;

  // Rising edge of jump = one parry attempt; reset when the button is released.
  let attempt = false;
  if (keys.jump && !pawn.parryLatch) {
    pawn.parryLatch = true;
    attempt = true;
  } else if (!keys.jump) {
    pawn.parryLatch = false;
  }
  if (!attempt) return;

  // Combat parry: deflect a pink enemy bolt. (Pink orbs are bounce pads now —
  // they auto-launch Pip across the gap in orbs.ts, with no timing required.)
  for (const b of state.projectiles) {
    if (!b.alive || b.from !== 'enemy' || !b.parryable) continue;
    if (overlaps(b.x, b.y, b.w, b.h, p.x, p.y, p.w, p.h)) {
      b.alive = false;
      rewardParry(state, pawn, b.x, b.y);
      return; // one parry per press
    }
  }
}
