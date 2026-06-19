// Question blocks (§8). Bumping a block from below (a rising head-bump) pops its
// reward and spends the block (it becomes a solid "used" tile). Coin blocks give
// score; weapon blocks drop a power mushroom. Called from player.ts after the
// upward collision resolves.

import { sfx } from '../engine/audio';
import { COIN_SCORE, PALETTE, TILE, TILE_POWBLOCK, TILE_QBLOCK, TILE_USED } from './constants';
import { spawnMushroom } from './mushroom';
import type { GameState, Pawn } from './state';

const POP_LIFE = 36;

/** Trigger the first question block in the tile row directly above Pip's head. */
export function bumpBlocks(state: GameState, pawn: Pawn): void {
  const p = pawn.player;
  const level = state.level;
  // After an upward snap, p.y = (r+1)*TILE, so the block row is p.y/TILE - 1.
  const r = Math.round(p.y / TILE) - 1;
  if (r < 0) return;
  const lft = Math.floor(p.x / TILE);
  const rgt = Math.floor((p.x + p.w - 1) / TILE);
  for (let c = lft; c <= rgt; c++) {
    const t = level.grid[r]?.[c];
    if (t === TILE_QBLOCK) {
      level.grid[r][c] = TILE_USED;
      state.score += COIN_SCORE;
      sfx('coin');
      state.pops.push({
        x: c * TILE + TILE / 2,
        y: r * TILE,
        life: POP_LIFE,
        text: `+${COIN_SCORE}`,
        color: PALETTE.coin,
      });
      return;
    }
    if (t === TILE_POWBLOCK) {
      level.grid[r][c] = TILE_USED;
      spawnMushroom(state, c * TILE + TILE / 2, r * TILE);
      sfx('power');
      return;
    }
  }
}
