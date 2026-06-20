// Parry orbs are forgiving bounce pads (level 6 traversal): touching an armed
// orb launches Pip up + forward across the gap, never damages, and goes dormant
// so it can't multi-bounce the same arc. Locks in the design chosen after the
// orbs read as unfair hazards.

import { describe, it, expect } from 'vitest';
import { ORB_SIZE, PARRY_BOUNCE } from './constants';
import { updateOrbs } from './orbs';
import { createState } from './state';

/** A state with one armed orb parked exactly on Pip. */
function orbState() {
  const state = createState();
  const p = state.players[0].player;
  state.parryOrbs = [{ x: p.x, y: p.y, w: ORB_SIZE, h: ORB_SIZE, cooldown: 0 }];
  return state;
}

describe('parry orbs (bounce pads)', () => {
  it('bounces Pip up + forward on contact and never costs a life', () => {
    const state = orbState();
    const p = state.players[0].player;
    p.face = 1;
    const hp0 = p.hp;

    const lostLife = updateOrbs(state);

    expect(lostLife).toBe(false); // bounce pads never cost a life
    expect(p.hp).toBe(hp0); // and never damage
    expect(p.vy).toBe(PARRY_BOUNCE); // re-launched upward
    expect(p.vx).toBeGreaterThan(0); // carried forward (face = +1)
    expect(state.parryOrbs[0].cooldown).toBeGreaterThan(0); // went dormant
  });

  it('launches forward in the direction Pip faces', () => {
    const state = orbState();
    const p = state.players[0].player;
    p.face = -1;

    updateOrbs(state);

    expect(p.vx).toBeLessThan(0); // facing left → carried left
  });

  it('a dormant orb only ticks its cooldown and does not bounce', () => {
    const state = orbState();
    const p = state.players[0].player;
    state.parryOrbs[0].cooldown = 5;
    p.vy = 0;

    updateOrbs(state);

    expect(p.vy).toBe(0); // untouched
    expect(state.parryOrbs[0].cooldown).toBe(4); // just decremented
  });

  it('ignores a downed co-op spectator', () => {
    const state = orbState();
    state.players[0].down = true;
    state.players[0].player.vy = 0;

    updateOrbs(state);

    expect(state.players[0].player.vy).toBe(0); // no bounce for a spectator
    expect(state.parryOrbs[0].cooldown).toBe(0); // orb stays armed
  });
});
