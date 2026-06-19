// Camera follows the pawns horizontally and clamps to the world bounds. With
// two pawns (co-op) it frames their midpoint and tethers both to the viewport
// so neither can run off-screen away from the other (single-screen co-op).

import { VIEW_W } from '../game/constants';
import type { GameState } from '../game/state';

export function updateCamera(state: GameState): void {
  const players = state.players;

  // Center on the group: the midpoint of the leftmost and rightmost pawn center.
  let minC = Infinity;
  let maxC = -Infinity;
  for (const pw of players) {
    const c = pw.player.x + pw.player.w / 2;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const groupCenter = (minC + maxC) / 2;
  const target = groupCenter - VIEW_W / 2;
  state.camX = Math.max(0, Math.min(state.level.worldW - VIEW_W, target));

  // Tether: keep every pawn inside the visible band (no-op for a lone pawn,
  // which always sits at the centered viewport).
  if (players.length > 1) {
    for (const pw of players) {
      const p = pw.player;
      const lo = state.camX;
      const hi = state.camX + VIEW_W - p.w;
      if (p.x < lo) {
        p.x = lo;
        if (p.vx < 0) p.vx = 0;
      } else if (p.x > hi) {
        p.x = hi;
        if (p.vx > 0) p.vx = 0;
      }
    }
  }
}
