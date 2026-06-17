// Timed boss-arena hazards: ground pillars (roots / stone spikes) and RIME's
// frozen floor. Each warns (harmless) then erupts (lethal) for a few frames. Mirrors
// the updateEnemies contract: returns true if Pip lost a life this frame (on the
// boss screen that triggers an instant retry, so the caller stops).

import { hitPlayer } from './flow';
import type { GameState } from './state';

export function updateHazards(state: GameState): boolean {
  const p = state.player;
  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const hz = state.hazards[i];
    if (hz.warn > 0) {
      hz.warn -= 1;
      continue;
    }
    if (hz.life <= 0) {
      state.hazards.splice(i, 1);
      continue;
    }
    hz.life -= 1;
    // Lethal window: overlap with Pip hurts (unless he's mid-invulnerability).
    if (
      p.hurt <= 0 &&
      p.x + p.w > hz.x &&
      p.x < hz.x + hz.w &&
      p.y + p.h > hz.y &&
      p.y < hz.y + hz.h
    ) {
      if (hitPlayer(state)) return true;
    }
  }
  return false;
}
