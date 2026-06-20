// Parry-orb upkeep. Orbs are forgiving *bounce pads*: simply touching an armed
// orb (cooldown 0) launches the pawn up + forward across the gap — no parry
// timing required and no damage. The orb then goes dormant for ORB_RESPAWN so
// the same orb can't re-bounce on the same arc, while a *neighbouring* orb can
// still fire, letting a pair chain Pip across a wide chasm. Combat parrying of
// pink bolts is unchanged (see parry.ts); only orb traversal lives here.

import { sfx } from '../engine/audio';
import { shakeScreen } from '../engine/effects';
import { ORB_RESPAWN, PALETTE, PARRY_BOUNCE, PARRY_FLASH, PARRY_FORWARD, SHAKE_STOMP } from './constants';
import type { GameState } from './state';

const POP_LIFE = 40;

/**
 * Advance parry orbs one tick. Always returns false (bounce pads never cost a
 * life); the boolean is kept so the caller's contact-path shape is uniform.
 */
export function updateOrbs(state: GameState): boolean {
  for (const orb of state.parryOrbs) {
    if (orb.cooldown > 0) {
      orb.cooldown -= 1;
      continue;
    }
    // An armed orb bounces the first live pawn that touches it.
    for (const pw of state.players) {
      if (pw.down) continue;
      const p = pw.player;
      if (p.x + p.w > orb.x && p.x < orb.x + orb.w && p.y + p.h > orb.y && p.y < orb.y + orb.h) {
        orb.cooldown = ORB_RESPAWN; // dormant so this orb can't multi-bounce the arc
        p.vy = PARRY_BOUNCE; // up — re-launch
        p.vx = p.face * PARRY_FORWARD; // forward — carry across the gap
        shakeScreen(state, SHAKE_STOMP);
        state.flash = Math.max(state.flash, PARRY_FLASH);
        sfx('parry');
        state.pops.push({ x: orb.x + orb.w / 2, y: orb.y, life: POP_LIFE, text: 'BOUNCE!', color: PALETTE.parry });
        break;
      }
    }
  }
  return false;
}
