import { describe, it, expect } from 'vitest';
import { spawnCoinSparkle, updateSparkles } from './sparkle';
import type { GameState } from './state';

function state(): GameState {
  return { sparks: [] } as unknown as GameState;
}

describe('coin sparkles', () => {
  it('spawns a radial burst on pickup', () => {
    const s = state();
    spawnCoinSparkle(s, 100, 50);
    expect(s.sparks.length).toBeGreaterThan(0);
    // All twinkles start at the coin position.
    expect(s.sparks.every((sp) => sp.x === 100 && sp.y === 50)).toBe(true);
  });

  it('ages and removes dead twinkles', () => {
    const s = state();
    spawnCoinSparkle(s, 0, 0);
    const count = s.sparks.length;
    const life0 = s.sparks[0].life;
    updateSparkles(s);
    expect(s.sparks.length).toBe(count); // still alive after one tick
    expect(s.sparks[0].life).toBe(life0 - 1);

    // Run well past the max lifetime — they should all be gone.
    for (let i = 0; i < 40; i++) updateSparkles(s);
    expect(s.sparks.length).toBe(0);
  });

  it('caps the particle pool so a coin spree cannot pile up unbounded', () => {
    const s = state();
    for (let i = 0; i < 50; i++) spawnCoinSparkle(s, i, i);
    expect(s.sparks.length).toBeLessThanOrEqual(80);
  });
});
