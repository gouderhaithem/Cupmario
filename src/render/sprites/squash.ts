// Velocity-driven squash-and-stretch for Pip — the rubber-hose "weight" cue.
// Pure render math (no state writes): the figure stretches tall as it rises or
// dives, rounds out at the apex (a held "hang"), springs flat on a hard landing
// (driven by the decaying p.landSquash), and breathes gently when idle. Both art
// paths apply the returned scale about the feet/centre so the contact point
// stays planted.

import { SKID_MIN } from '../../game/constants';
import type { Player } from '../../types';

/** Vertical speed (px/frame) that yields a full travel stretch. */
const STRETCH_VY = 15;
/** Within this |vy| (px/frame) of the apex, blend in the float "hang" pose. */
const APEX_VY = 4;
/** Body tilt (radians) while skidding — leans into the turn against the slide. */
const SKID_LEAN = 0.16;

/**
 * True while Pip is skidding: grounded, sliding fast, but facing the opposite
 * way (he turned and his momentum hasn't caught up). Derived from state, so no
 * extra field — both the dust spawn and this lean read the same condition.
 */
export function isSkidding(p: Player): boolean {
  return p.onGround && Math.abs(p.vx) > SKID_MIN && Math.sign(p.vx) !== 0 && p.face !== Math.sign(p.vx);
}

/** Body lean (radians, about the feet) for the current frame; 0 when not skidding. */
export function skidLean(p: Player): number {
  return isSkidding(p) ? p.face * SKID_LEAN : 0;
}

/** Horizontal/vertical scale factors to apply to Pip's body this frame. */
export function playerSquash(p: Player, frame: number): { sx: number; sy: number } {
  // Landing impact wins: a brief flat-and-wide squash that springs back.
  if (p.landSquash > 0) {
    const k = p.landSquash;
    return { sx: 1 + k * 0.3, sy: 1 - k * 0.32 };
  }
  // Airborne: stretch tall in the direction of travel, with a takeoff pop that
  // reads a touch stronger than the dive, then round out into a hang at the apex
  // so the top of the arc feels held instead of a dead, scale-1 frame.
  if (!p.onGround) {
    const st = Math.min(1, Math.abs(p.vy) / STRETCH_VY);
    const stretch = (p.vy < 0 ? 0.2 : 0.16) * st; // rising pops more than diving
    const hang = Math.max(0, 1 - Math.abs(p.vy) / APEX_VY); // 1 at apex → 0 moving
    return {
      sx: 1 - stretch * 0.6 + hang * 0.08,
      sy: 1 + stretch - hang * 0.1,
    };
  }
  // Idle on the ground: a slow breathing bob.
  if (Math.abs(p.vx) < 0.12 && !p.crouch) {
    const b = Math.sin(frame * 0.08) * 0.02;
    return { sx: 1 - b * 0.7, sy: 1 + b };
  }
  return { sx: 1, sy: 1 };
}
