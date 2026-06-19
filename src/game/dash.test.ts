import { describe, it, expect } from 'vitest';
import { createState } from './state';
import { updateDash } from './dash';
import type { GameState } from './state';

/** Fire a fresh dash press and run one dash update. */
function pressDash(state: GameState): void {
  state.dashLatch = false; // simulate a rising edge each call
  state.keys.dash = true;
  updateDash(state, state.players[0]);
}

function freshState(): GameState {
  const state = createState();
  state.screen = 'play';
  state.player.dashFrames = 0;
  state.player.dashCd = 0;
  return state;
}

describe('air-dash limit', () => {
  it('allows a dash on the ground (cooldown-gated only)', () => {
    const state = freshState();
    state.player.onGround = true;
    pressDash(state);
    expect(state.player.dashFrames).toBeGreaterThan(0);
    expect(state.player.airDashUsed).toBe(false); // ground dash never spends the air dash
  });

  it('spends the single air dash and blocks a second mid-air dash', () => {
    const state = freshState();
    state.player.onGround = false;

    pressDash(state);
    expect(state.player.dashFrames).toBeGreaterThan(0);
    expect(state.player.airDashUsed).toBe(true);

    // Let the first dash finish + cooldown elapse, still airborne.
    state.player.dashFrames = 0;
    state.player.dashCd = 0;
    pressDash(state);
    expect(state.player.dashFrames).toBe(0); // blocked — no second air dash
  });

  it('refreshes the air dash on landing', () => {
    const state = freshState();
    state.player.onGround = false;
    pressDash(state);
    expect(state.player.airDashUsed).toBe(true);

    state.player.dashFrames = 0;
    state.player.dashCd = 0;
    state.player.onGround = true; // touch down
    pressDash(state);
    expect(state.player.dashFrames).toBeGreaterThan(0);
  });

  it('refreshes the air dash on a wall cling', () => {
    const state = freshState();
    state.player.onGround = false;
    pressDash(state);
    expect(state.player.airDashUsed).toBe(true);

    // Grab a wall without pressing dash — the cling alone re-arms it.
    state.player.dashFrames = 0;
    state.player.dashCd = 0;
    state.player.wallSlide = true;
    state.keys.dash = false;
    state.dashLatch = false;
    updateDash(state, state.players[0]);
    expect(state.player.airDashUsed).toBe(false); // cling re-armed it

    // And a fresh dash can now fire off the wall.
    pressDash(state);
    expect(state.player.dashFrames).toBeGreaterThan(0);
  });
});
