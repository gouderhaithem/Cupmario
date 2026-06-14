// Crumbling platforms (§8). Solid from above (like a mover, but static) until
// Pip stands on one; then a short timer runs and the platform drops away. Runs
// after updatePlayer so it resolves against the settled player position.

import { CRUMBLE_DELAY, CRUMBLE_GRAV, MAXFALL, MOVER_LAND_TOL } from './constants';
import type { GameState } from './state';

export function updateCrumbles(state: GameState): void {
  const p = state.player;
  const { worldH } = state.level;

  for (const c of state.crumbles) {
    if (c.falling) {
      c.vy = Math.min(MAXFALL, c.vy + CRUMBLE_GRAV);
      c.y += c.vy;
      continue;
    }

    // Ride detection: standing on top snaps Pip to the surface and arms the timer.
    const hOverlap = p.x + p.w > c.x && p.x < c.x + c.w;
    const feet = p.y + p.h;
    if (hOverlap && p.vy >= 0 && feet >= c.y && feet <= c.y + MOVER_LAND_TOL) {
      p.y = c.y - p.h;
      p.vy = 0;
      p.onGround = true;
      if (c.timer < 0) c.timer = CRUMBLE_DELAY;
    }

    // Once armed, count down regardless of contact, then let go.
    if (c.timer >= 0) {
      c.timer -= 1;
      if (c.timer < 0) c.falling = true;
    }
  }

  // Drop platforms that have fallen out of the world.
  for (let i = state.crumbles.length - 1; i >= 0; i--) {
    if (state.crumbles[i].y > worldH + 200) state.crumbles.splice(i, 1);
  }
}
