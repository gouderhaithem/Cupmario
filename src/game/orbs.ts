// Parry-orb upkeep: tick the post-parry cooldown and apply contact damage.
// An armed orb (cooldown 0) is a pink hazard — touching it without parrying
// (see parry.ts, which runs first each tick) costs HP. Parrying sets the
// cooldown, so a deflected orb won't also damage Pip on the same overlap.

import { ORB_RESPAWN } from './constants';
import { hitPlayer } from './flow';
import type { GameState } from './state';

/**
 * Advance parry orbs one tick. Returns true if a contact cost a life this
 * frame (caller should stop the frame, mirroring the boss/enemy contact path).
 */
export function updateOrbs(state: GameState): boolean {
  for (const orb of state.parryOrbs) {
    if (orb.cooldown > 0) {
      orb.cooldown -= 1;
      continue;
    }
    // An armed orb hurts the first non-invulnerable pawn that touches it.
    for (const pw of state.players) {
      if (pw.down) continue;
      const p = pw.player;
      if (p.hurt > 0) continue; // i-frames (incl. a just-landed parry) pass through
      if (p.x + p.w > orb.x && p.x < orb.x + orb.w && p.y + p.h > orb.y && p.y < orb.y + orb.h) {
        // Send the orb dormant so it can't multi-hit through the new i-frames.
        orb.cooldown = ORB_RESPAWN;
        if (hitPlayer(state, pw)) return true;
        break;
      }
    }
  }
  return false;
}
