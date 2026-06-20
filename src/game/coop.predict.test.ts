// Guest-side prediction guard: the reconciliation that decides whether the
// guest keeps its locally-predicted self avatar or snaps to the host. A wrong
// decision shows up live as either rubber-banding (snaps too eagerly) or a
// desynced guest (never snaps), so the truth table is locked down here.

import { describe, it, expect } from 'vitest';
import { addPawn, createState } from './state';
import { applySnapshot, buildSnapshot, shouldSnapSelf } from './coop';
import type { Player } from '../types';

/** A minimal Player with sane defaults; override the fields under test. */
function player(over: Partial<Player> = {}): Player {
  return {
    x: 100, y: 100, w: 34, h: 58, vx: 0, vy: 0, onGround: true, face: 1,
    hurt: 0, hp: 3, crouch: false, armed: true, dashFrames: 0, dashCd: 0,
    dashDir: 1, landSquash: 0, wallSlide: false, wallDir: 0, wallCoyote: 0,
    airDashUsed: false, ...over,
  };
}

describe('shouldSnapSelf', () => {
  it('keeps the prediction when self closely tracks the host', () => {
    const pred = player({ x: 510 });
    const auth = player({ x: 500 }); // 10px behind, < 24px threshold
    expect(shouldSnapSelf(pred, auth, false, false)).toBe(false);
  });

  it('snaps on a large position error', () => {
    expect(shouldSnapSelf(player({ x: 600 }), player({ x: 500 }), false, false)).toBe(true);
  });

  it('snaps on a large velocity error (launch / knockback)', () => {
    expect(shouldSnapSelf(player({ vy: 0 }), player({ vy: -14 }), false, false)).toBe(true);
  });

  it('snaps on a ground-contact mismatch (mover carry / parry bounce)', () => {
    expect(shouldSnapSelf(player({ onGround: false }), player({ onGround: true }), false, false)).toBe(true);
  });

  it('snaps when the host shows damage taken', () => {
    expect(shouldSnapSelf(player({ hp: 3 }), player({ hp: 2 }), false, false)).toBe(true);
  });

  it('snaps while in hit i-frames', () => {
    expect(shouldSnapSelf(player(), player({ hurt: 30 }), false, false)).toBe(true);
  });

  it('snaps when the spectator (down) state flips', () => {
    expect(shouldSnapSelf(player(), player(), false, true)).toBe(true);
  });

  it('does not snap on a heal (hp increased)', () => {
    expect(shouldSnapSelf(player({ hp: 2 }), player({ hp: 3 }), false, false)).toBe(false);
  });
});

/** A connected guest with two pawns, ready to apply host snapshots. */
function guestState() {
  const g = createState();
  g.screen = 'play';
  addPawn(g);
  g.coop.active = true;
  g.coop.role = 'guest';
  return g;
}

function hostSnapshot(mutate: (h: ReturnType<typeof createState>) => void) {
  const h = createState();
  h.screen = 'play';
  addPawn(h);
  mutate(h);
  return buildSnapshot(h);
}

describe('applySnapshot — guest self reconciliation', () => {
  it('keeps the predicted self transform on a small error, adopting host gameplay fields', () => {
    const guest = guestState();
    guest.players[1].player = player({ x: 510, onGround: true, armed: false, hp: 3 });
    const snap = hostSnapshot((h) => {
      h.players[1].player = player({ x: 500, onGround: true, armed: true, hp: 3 });
    });
    applySnapshot(guest, snap);
    expect(guest.players[1].player.x).toBe(510); // prediction kept, not snapped to 500
    expect(guest.players[1].player.armed).toBe(true); // host-owned field adopted
  });

  it('snaps the self transform when prediction diverges far from the host', () => {
    const guest = guestState();
    guest.players[1].player = player({ x: 800, onGround: true });
    const snap = hostSnapshot((h) => {
      h.players[1].player = player({ x: 500, onGround: true });
    });
    applySnapshot(guest, snap);
    expect(guest.players[1].player.x).toBe(500); // snapped to the host
  });

  it('always overwrites the partner (players[0]) wholesale', () => {
    const guest = guestState();
    guest.players[0].player = player({ x: 999 });
    const snap = hostSnapshot((h) => {
      h.players[0].player = player({ x: 300 });
    });
    applySnapshot(guest, snap);
    expect(guest.players[0].player.x).toBe(300);
  });

  it('does not predict for a non-guest (host applying its own snapshot keeps host values)', () => {
    const peer = createState();
    peer.screen = 'play';
    addPawn(peer);
    peer.players[1].player = player({ x: 510 }); // would-be prediction
    const snap = hostSnapshot((h) => {
      h.players[1].player = player({ x: 500 });
    });
    applySnapshot(peer, snap); // peer.coop.role is null → no self-keep
    expect(peer.players[1].player.x).toBe(500);
  });
});
