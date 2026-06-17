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

  // A dash fires on a fresh dash-key press (rising edge) or a left/right
  // double-tap pulse. Track the key latch independently so holding the key
  // still yields one dash, and consume the one-shot tap request each tick.
  const keyPress = keys.dash && !state.dashLatch;
  state.dashLatch = keys.dash;
  const tapPress = state.dashTap;
  state.dashTap = false;

  if ((keyPress || tapPress) && p.dashFrames <= 0 && p.dashCd <= 0) {
    p.dashFrames = DASH_FRAMES;
    p.dashDir = p.face;
    p.dashCd = DASH_CD;
    // Grant i-frames via the shared invulnerability counter (collisions test
    // `hurt <= 0`), so a dash punches through bolts and enemies cleanly.
    p.hurt = Math.max(p.hurt, DASH_IFRAMES);
    sfx('dash');
  }

  // While dashing, pin horizontal velocity to the burst direction.
  if (p.dashFrames > 0) {
    p.dashFrames -= 1;
    p.vx = p.dashDir * DASH_SPEED;
  }
}
