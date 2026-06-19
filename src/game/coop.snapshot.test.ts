// Phase C guard: a host snapshot survives the round trip onto a fresh guest
// state. Catches any field the host captures but the guest fails to apply
// (which would show up live as a silently desynced guest).

import { describe, it, expect } from 'vitest';
import { addPawn, createState } from './state';
import { applySnapshot, buildSnapshot } from './coop';

function hostState() {
  const s = createState();
  s.screen = 'play';
  addPawn(s);
  // Diverge the two pawns and the economy so equality is meaningful.
  s.players[0].player.x = 300;
  s.players[0].player.y = 120;
  s.players[1].player.x = 540;
  s.players[1].player.y = 200;
  s.score = 1700;
  s.coins = 4;
  s.lives = 2;
  s.camX = 222;
  s.timeLeft = 999;
  if (s.level.coins[0]) s.level.coins[0].got = true;
  return s;
}

describe('snapshot round-trip', () => {
  it('reproduces both players, camera, and economy on the guest', () => {
    const host = hostState();
    const snap = buildSnapshot(host);

    const guest = createState();
    guest.screen = 'play';
    applySnapshot(guest, snap);

    expect(guest.players.length).toBe(2);
    expect(guest.players[0].player.x).toBe(300);
    expect(guest.players[1].player.x).toBe(540);
    expect(guest.players[1].player.y).toBe(200);
    expect(guest.score).toBe(1700);
    expect(guest.coins).toBe(4);
    expect(guest.lives).toBe(2);
    expect(guest.camX).toBe(222);
    expect(guest.timeLeft).toBe(999);
  });

  it('replays collected coins by index', () => {
    const host = hostState();
    const snap = buildSnapshot(host);
    const guest = createState();
    applySnapshot(guest, snap);
    expect(guest.level.coins[0]?.got).toBe(true);
    // A coin the host never collected stays available on the guest.
    if (guest.level.coins[1]) expect(guest.level.coins[1].got).toBe(false);
  });

  it('mirrors the live enemy set', () => {
    const host = hostState();
    const snap = buildSnapshot(host);
    const guest = createState();
    applySnapshot(guest, snap);
    expect(guest.enemies.length).toBe(host.enemies.length);
  });
});
