import { describe, it, expect } from 'vitest';
import { createState } from './state';
import { updateEnemies } from './enemy';
import { buildLevel } from './level';
import { COMBO_FLASH_FRAMES, PLAYER_H, PLAYER_W, TILE } from './constants';
import type { Enemy } from '../types';

// A still walker (vx 0, wide bounds) floating at row 8 — patrol leaves it put,
// so the test can place Pip squarely on top before each stomp.
function walker(x: number): Enemy {
  return {
    x,
    y: 8 * TILE,
    w: 38,
    h: 38,
    vx: 0,
    alive: true,
    minX: 0,
    maxX: 79 * TILE,
    kind: 'walker',
    shootCd: 0,
    shotCount: 0,
  };
}

/** Drop Pip's feet a few px into an enemy's top with downward velocity (a stomp). */
function landOn(p: { x: number; y: number; w: number; h: number; vy: number }, e: Enemy): void {
  p.x = e.x; // horizontal overlap
  p.y = e.y - PLAYER_H + 10; // feet 10px into the top (< STOMP_TOP)
  p.vy = 5; // falling
}

describe('stomp-chain combo banner', () => {
  it('stays hidden on a single stomp (combo 1)', () => {
    const state = createState();
    state.level = buildLevel({ theme: 'day', flagCol: 20, pits: [], plats: [], coins: [], enemyCols: [] });
    state.screen = 'play';
    state.player.w = PLAYER_W;
    state.player.h = PLAYER_H;
    const a = walker(5 * TILE);
    state.enemies = [a];

    landOn(state.player, a);
    updateEnemies(state);

    expect(state.combo).toBe(1);
    expect(a.alive).toBe(false);
    expect(state.comboFlash).toBe(0); // no banner for a lone stomp
  });

  it('fires the COMBO banner on the second chained stomp', () => {
    const state = createState();
    state.level = buildLevel({ theme: 'day', flagCol: 20, pits: [], plats: [], coins: [], enemyCols: [] });
    state.screen = 'play';
    state.player.w = PLAYER_W;
    state.player.h = PLAYER_H;
    const a = walker(5 * TILE);
    const b = walker(10 * TILE);
    state.enemies = [a, b];

    // First stomp — combo climbs to 1 (no banner yet).
    landOn(state.player, a);
    updateEnemies(state);
    expect(state.combo).toBe(1);

    // Without touching the ground (combo not reset), fall onto the next enemy.
    landOn(state.player, b);
    updateEnemies(state);

    expect(state.combo).toBe(2);
    expect(b.alive).toBe(false);
    expect(state.comboShown).toBe(2);
    expect(state.comboFlash).toBe(COMBO_FLASH_FRAMES);
  });
});
