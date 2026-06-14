// Difficulty tiers (§13.4): pure helpers that turn a Difficulty into the few
// gameplay scalars that depend on it. Single source of truth for "what does
// assist/normal/expert actually change" — readers ask here, never branch ad-hoc.

import type { Difficulty } from '../types';
import { ASSIST_BOLT_MULT, EXPERT_BOLT_MULT, EXPERT_TELEGRAPH_MULT } from './constants';

/** Selectable order for cycling on the title / pause menus. */
export const DIFFICULTIES: readonly Difficulty[] = ['assist', 'normal', 'expert'] as const;

export const isAssist = (d: Difficulty): boolean => d === 'assist';
export const isExpert = (d: Difficulty): boolean => d === 'expert';

/** Short uppercase label for HUD/menus. */
export function difficultyLabel(d: Difficulty): string {
  return d.toUpperCase();
}

/** Enemy-bolt speed scalar: assist slows them, expert speeds them up. */
export function enemyBoltMult(d: Difficulty): number {
  if (d === 'assist') return ASSIST_BOLT_MULT;
  if (d === 'expert') return EXPERT_BOLT_MULT;
  return 1;
}

/** Telegraph window in frames: expert tightens it; others use the base. */
export function telegraphFrames(d: Difficulty, base: number): number {
  return d === 'expert' ? Math.max(1, Math.round(base * EXPERT_TELEGRAPH_MULT)) : base;
}

/**
 * Step to the next difficulty in the cycle. Expert is skipped until the player
 * has cleared the campaign once (`expertUnlocked`).
 */
export function cycleDifficulty(d: Difficulty, dir: number, expertUnlocked: boolean): Difficulty {
  const pool = expertUnlocked ? DIFFICULTIES : DIFFICULTIES.filter((x) => x !== 'expert');
  const i = Math.max(0, pool.indexOf(d));
  const n = pool.length;
  return pool[(i + (dir >= 0 ? 1 : n - 1)) % n];
}
