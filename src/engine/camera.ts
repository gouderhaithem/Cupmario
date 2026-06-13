// Camera follows the player horizontally and clamps to the world bounds.

import { VIEW_W } from '../game/constants';
import type { GameState } from '../game/state';

export function updateCamera(state: GameState): void {
  const p = state.player;
  const target = p.x + p.w / 2 - VIEW_W / 2;
  state.camX = Math.max(0, Math.min(state.level.worldW - VIEW_W, target));
}
