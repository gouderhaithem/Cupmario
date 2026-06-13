// Coin pickup: overlap test against the player center; +score and a popup.

import { sfx } from '../engine/audio';
import { COIN_SCORE, PALETTE } from './constants';
import type { GameState } from './state';

const PICKUP_X = 26;
const PICKUP_Y = 32;
const POP_LIFE = 36;

export function updateCoins(state: GameState): void {
  const p = state.player;
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;

  for (const co of state.level.coins) {
    if (co.got) continue;
    if (Math.abs(pcx - co.cx) < PICKUP_X && Math.abs(pcy - co.cy) < PICKUP_Y) {
      co.got = true;
      state.coins += 1;
      state.score += COIN_SCORE;
      sfx('coin');
      state.pops.push({ x: co.cx, y: co.cy, life: POP_LIFE, text: '+100', color: PALETTE.coin });
    }
  }
}
