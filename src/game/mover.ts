// Moving-platform update: advance each platform along its axis, bounce at the
// travel bounds, and carry the player when they're standing on top. Runs after
// updatePlayer so it resolves against the player's settled position this frame.
// Platforms are solid only from above (ride-on), which is what level design needs.

import { MOVER_LAND_TOL } from './constants';
import type { GameState } from './state';

export function updateMovers(state: GameState): void {
  const { worldW } = state.level;

  for (const m of state.movers) {
    // Advance along the axis, recording the real delta (post-clamp) for carry.
    const prevX = m.x;
    const prevY = m.y;
    if (m.axis === 'h') {
      m.x += m.dir * m.speed;
      if (m.x <= m.min) {
        m.x = m.min;
        m.dir = 1;
      } else if (m.x >= m.max) {
        m.x = m.max;
        m.dir = -1;
      }
    } else {
      m.y += m.dir * m.speed;
      if (m.y <= m.min) {
        m.y = m.min;
        m.dir = 1;
      } else if (m.y >= m.max) {
        m.y = m.max;
        m.dir = -1;
      }
    }
    m.dx = m.x - prevX;
    m.dy = m.y - prevY;

    // Carry any pawn riding the top surface (each tested independently).
    for (const pw of state.players) {
      const p = pw.player;
      // Ride detection: horizontally overlapping and falling onto the top surface.
      const hOverlap = p.x + p.w > m.x && p.x < m.x + m.w;
      if (!hOverlap) continue;
      const feet = p.y + p.h;
      const onTop = p.vy >= 0 && feet >= m.y && feet <= m.y + MOVER_LAND_TOL;
      if (!onTop) continue;

      // Snap to the surface (this also carries the rider vertically with the
      // platform) and carry horizontally. Re-clamp to the world after the push.
      p.y = m.y - p.h;
      p.vy = 0;
      p.onGround = true;
      p.x += m.dx;
      if (p.x < 0) p.x = 0;
      else if (p.x > worldW - p.w) p.x = worldW - p.w;
    }
  }
}
