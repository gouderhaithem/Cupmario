// Phase B guard: with a second pawn present, the non-lethal interactions and
// camera operate per-pawn, and single-pawn behavior is unchanged.

import { describe, it, expect } from 'vitest';
import { addPawn, createState, removeExtraPawns } from './state';
import { updateCoins } from './coin';
import { updateCheckpoints } from './checkpoint';
import { updateCamera } from '../engine/camera';
import { VIEW_W } from './constants';

describe('second pawn — coins', () => {
  it('lets pawn 1 collect a coin pawn 0 is nowhere near', () => {
    const s = createState();
    s.screen = 'play';
    const p2 = addPawn(s);
    const coin = s.level.coins[0];
    expect(coin).toBeTruthy();
    // Park pawn 0 far away; put pawn 1 on the coin.
    s.players[0].player.x = coin.cx + 5000;
    p2.player.x = coin.cx - p2.player.w / 2;
    p2.player.y = coin.cy - p2.player.h / 2;
    const before = s.coins;
    updateCoins(s);
    expect(coin.got).toBe(true);
    expect(s.coins).toBe(before + 1);
  });
});

describe('second pawn — checkpoints', () => {
  it('lets pawn 1 light a checkpoint and move the shared respawn', () => {
    const s = createState();
    s.screen = 'play';
    const cp = s.checkpoints[0];
    if (!cp) return; // level 1 may have none; skip cleanly
    const p2 = addPawn(s);
    s.players[0].player.x = cp.x + 5000;
    p2.player.x = cp.x;
    updateCheckpoints(s);
    expect(cp.active).toBe(true);
    expect(s.respawnX).toBe(cp.x);
  });
});

describe('camera tether', () => {
  it('frames the midpoint and keeps both pawns on screen', () => {
    const s = createState();
    s.screen = 'play';
    const p2 = addPawn(s);
    s.players[0].player.x = 400;
    p2.player.x = 400 + VIEW_W * 2; // try to run way off to the right
    updateCamera(s);
    // Both pawns must end up within the visible band after the tether.
    for (const pw of s.players) {
      expect(pw.player.x).toBeGreaterThanOrEqual(s.camX - 0.001);
      expect(pw.player.x + pw.player.w).toBeLessThanOrEqual(s.camX + VIEW_W + 0.001);
    }
  });

  it('is identical to single-pawn follow when solo (no tether)', () => {
    const s = createState();
    s.screen = 'play';
    removeExtraPawns(s);
    s.players[0].player.x = 1000;
    updateCamera(s);
    const p = s.players[0].player;
    const expected = Math.max(0, Math.min(s.level.worldW - VIEW_W, p.x + p.w / 2 - VIEW_W / 2));
    expect(s.camX).toBe(expected);
  });
});
