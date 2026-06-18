// Velocity-driven squash-and-stretch for Pip — the rubber-hose "weight" cue.
// Pure render math (no state writes): the figure stretches tall as it rises or
// dives, springs flat on a hard landing (driven by the decaying p.landSquash),
// and breathes gently when idle. Both art paths apply the returned scale about
// the feet/centre so the contact point stays planted.

import type { Player } from '../../types';

/** Horizontal/vertical scale factors to apply to Pip's body this frame. */
export function playerSquash(p: Player, frame: number): { sx: number; sy: number } {
  // Landing impact wins: a brief flat-and-wide squash that springs back.
  if (p.landSquash > 0) {
    const k = p.landSquash;
    return { sx: 1 + k * 0.3, sy: 1 - k * 0.32 };
  }
  // Airborne: stretch in the direction of travel (rising or diving fast).
  if (!p.onGround) {
    const st = Math.min(1, Math.abs(p.vy) / 15);
    return { sx: 1 - st * 0.11, sy: 1 + st * 0.16 };
  }
  // Idle on the ground: a slow breathing bob.
  if (Math.abs(p.vx) < 0.12 && !p.crouch) {
    const b = Math.sin(frame * 0.08) * 0.02;
    return { sx: 1 - b * 0.7, sy: 1 + b };
  }
  return { sx: 1, sy: 1 };
}
