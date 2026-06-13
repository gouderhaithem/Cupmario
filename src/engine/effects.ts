// Screen-shake + hitstop ("juice"). Triggers raise the shake magnitude or the
// freeze duration; the loop decays shake each tick and counts down the freeze.
// These are pure state helpers — the random draw offset is computed in render,
// which never mutates state (golden rule #4).

import { SHAKE_DECAY } from '../game/constants';
import type { GameState } from '../game/state';

/** Kick off (or strengthen) the screen shake. The stronger trigger wins. */
export function shakeScreen(state: GameState, magnitude: number): void {
  if (magnitude > state.shake) state.shake = magnitude;
}

/** Freeze gameplay for `frames` ticks on impact. The longer freeze wins. */
export function hitStop(state: GameState, frames: number): void {
  if (frames > state.hitstop) state.hitstop = frames;
}

/** Ease the shake toward zero. Call once per gameplay tick (incl. during hitstop). */
export function decayShake(state: GameState): void {
  if (state.shake > 0) state.shake = Math.max(0, state.shake - SHAKE_DECAY);
}
