// Auto-fire (touch convenience): with the option on, the equipped non-charge
// weapon repeats at its fire rate without re-pressing; with it off, holding the
// trigger stays semi-auto (one shot per press). Drives updatePlayer directly.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createState, type GameState } from './state';
import { updatePlayer } from './player';
import { WEAPONS } from './weapons';

// createState reads localStorage; stub it so the node test environment is happy.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as Record<string, unknown>).window = { location: { search: '' } };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).window;
});

/** Run `frames` player updates and report how many bolts were spawned. */
function fireCount(state: GameState, frames: number): number {
  const pawn = state.players[0];
  pawn.player.armed = true;
  for (let i = 0; i < frames; i++) updatePlayer(state, pawn);
  return state.projectiles.length;
}

describe('auto-fire', () => {
  it('repeats at the weapon fire rate while enabled (no re-press)', () => {
    const state = createState();
    state.autoFire = true;
    state.keys.shoot = false; // trigger NOT held — auto-fire drives it
    const frames = WEAPONS.peashot.fireRate * 3 + 1;
    // First shot is immediate, then one per fireRate window.
    expect(fireCount(state, frames)).toBeGreaterThanOrEqual(3);
  });

  it('stays semi-auto when disabled even with the trigger held', () => {
    const state = createState();
    state.autoFire = false;
    state.keys.shoot = true; // held the whole time
    const frames = WEAPONS.peashot.fireRate * 3 + 1;
    // The latch blocks repeats: exactly one shot until the key is released.
    expect(fireCount(state, frames)).toBe(1);
  });
});
