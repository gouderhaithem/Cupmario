// Dash / dodge — a short horizontal burst with invulnerability frames, the
// run-and-gun escape verb. Called from updatePlayer after horizontal input is
// resolved so an active dash overrides the normal velocity. A dash cancels into
// a jump for free (jump only sets vertical velocity).

import { sfx } from '../engine/audio';
import { DASH_CD, DASH_FRAMES, DASH_IFRAMES, DASH_SPEED } from './constants';
import type { GameState } from './state';

export function updateDash(state: GameState): void {
  const p = state.player;
  const keys = state.keys;

  if (p.dashCd > 0) p.dashCd -= 1;

  // Start a dash on a fresh press (rising edge) when off cooldown and idle.
  if (keys.dash && !state.dashLatch) {
    state.dashLatch = true;
    if (p.dashFrames <= 0 && p.dashCd <= 0) {
      p.dashFrames = DASH_FRAMES;
      p.dashDir = p.face;
      p.dashCd = DASH_CD;
      // Grant i-frames via the shared invulnerability counter (collisions test
      // `hurt <= 0`), so a dash punches through bolts and enemies cleanly.
      p.hurt = Math.max(p.hurt, DASH_IFRAMES);
      sfx('dash');
    }
  } else if (!keys.dash) {
    state.dashLatch = false;
  }

  // While dashing, pin horizontal velocity to the burst direction.
  if (p.dashFrames > 0) {
    p.dashFrames -= 1;
    p.vx = p.dashDir * DASH_SPEED;
  }
}
