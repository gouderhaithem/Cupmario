// Dash / dodge — a short horizontal burst with invulnerability frames, the
// run-and-gun escape verb. Called from updatePlayer after horizontal input is
// resolved so an active dash overrides the normal velocity. A dash cancels into
// a jump for free (jump only sets vertical velocity).

import { sfx } from '../engine/audio';
import { DASH_CD, DASH_FRAMES, DASH_IFRAMES, DASH_SPEED } from './constants';
import { spawnDashDust } from './puff';
import type { GameState } from './state';

export function updateDash(state: GameState): void {
  const p = state.player;
  const keys = state.keys;

  if (p.dashCd > 0) p.dashCd -= 1;

  // Refresh the single air-dash whenever Pip is grounded or clinging a wall, so
  // a wall cling re-arms the dodge (a dash → wall-jump → dash chain stays open).
  if (p.onGround || p.wallSlide) p.airDashUsed = false;

  // A dash fires on a fresh dash-key press (rising edge) or a left/right
  // double-tap pulse. Track the key latch independently so holding the key
  // still yields one dash, and consume the one-shot tap request each tick.
  const keyPress = keys.dash && !state.dashLatch;
  state.dashLatch = keys.dash;
  const tapPress = state.dashTap;
  state.dashTap = false;

  // In the air Pip gets exactly one dash until he lands or grabs a wall; on the
  // ground it's only gated by the cooldown.
  const canDash = p.onGround || !p.airDashUsed;
  if ((keyPress || tapPress) && p.dashFrames <= 0 && p.dashCd <= 0 && canDash) {
    p.dashFrames = DASH_FRAMES;
    p.dashDir = p.face;
    p.dashCd = DASH_CD;
    if (!p.onGround) p.airDashUsed = true; // spend the mid-air dash
    // Grant i-frames via the shared invulnerability counter (collisions test
    // `hurt <= 0`), so a dash punches through bolts and enemies cleanly.
    p.hurt = Math.max(p.hurt, DASH_IFRAMES);
    spawnDashDust(state, p.x + p.w / 2, p.y + p.h, p.dashDir);
    sfx('dash');
  }

  // While dashing, pin horizontal velocity to the burst direction.
  if (p.dashFrames > 0) {
    p.dashFrames -= 1;
    p.vx = p.dashDir * DASH_SPEED;
  }
}
