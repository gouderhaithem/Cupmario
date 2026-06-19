// Phase A guard: updatePlayer drives an explicit Pawn, and the legacy
// `state.player` accessor stays wired to players[0]. These lock the co-op
// controller refactor so single-player behavior can't silently regress.

import { describe, it, expect } from 'vitest';
import { createState } from './state';
import { updatePlayer } from './player';

function playState() {
  const s = createState();
  s.screen = 'play';
  return s;
}

describe('updatePlayer drives a Pawn', () => {
  it('accelerates right and faces right on the right key', () => {
    const s = playState();
    const pawn = s.players[0];
    pawn.player.onGround = true;
    pawn.keys.right = true;
    const x0 = pawn.player.x;
    for (let i = 0; i < 10; i++) updatePlayer(s, pawn);
    expect(pawn.player.vx).toBeGreaterThan(0);
    expect(pawn.player.face).toBe(1);
    expect(pawn.player.x).toBeGreaterThan(x0);
  });

  it('launches upward on a grounded jump press', () => {
    const s = playState();
    const pawn = s.players[0];
    pawn.player.onGround = true;
    pawn.keys.jump = true;
    updatePlayer(s, pawn);
    expect(pawn.player.vy).toBeLessThan(0);
  });

  it('cycles weapons per-pawn on a switch press', () => {
    const s = playState();
    const pawn = s.players[0];
    pawn.weapons = ['peashot', 'homing'];
    pawn.weaponIdx = 0;
    pawn.keys.switchWeapon = true;
    updatePlayer(s, pawn);
    expect(pawn.weaponIdx).toBe(1);
  });
});

describe('legacy state accessors proxy to players[0]', () => {
  it('state.player is players[0].player', () => {
    const s = playState();
    expect(s.player).toBe(s.players[0].player);
  });

  it('writing state.player updates players[0] (respawn path)', () => {
    const s = playState();
    const fresh = { ...s.players[0].player, x: 999 };
    s.player = fresh;
    expect(s.players[0].player).toBe(fresh);
    expect(s.players[0].player.x).toBe(999);
  });

  it('controller fields proxy both ways', () => {
    const s = playState();
    s.superCards = 3;
    expect(s.players[0].superCards).toBe(3);
    s.players[0].combo = 5;
    expect(s.combo).toBe(5);
  });
});
