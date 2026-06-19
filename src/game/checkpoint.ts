// Checkpoints (§6.4): touching an unlit post lights it and moves the respawn
// point there, so a lost life resumes from the post instead of the level start.
// Activation persists across deaths (loseLife rebuilds enemies, not checkpoints).

import { sfx } from '../engine/audio';
import { PALETTE, TILE } from './constants';
import type { GameState } from './state';

const POP_LIFE = 45;

/** Light any checkpoint Pip is touching and adopt it as the respawn point. */
export function updateCheckpoints(state: GameState): void {
  for (const cp of state.checkpoints) {
    if (cp.active) continue;
    // A one-tile activation band around the post — either pawn can light it.
    const touched = state.players.some((pw) => pw.player.x + pw.player.w > cp.x && pw.player.x < cp.x + TILE);
    if (touched) {
      cp.active = true;
      state.respawnX = cp.x;
      state.respawnY = cp.y;
      sfx('checkpoint');
      state.pops.push({
        x: cp.x + TILE / 2,
        y: cp.y - 8,
        life: POP_LIFE,
        text: 'CHECKPOINT!',
        color: PALETTE.parry,
      });
    }
  }
}
