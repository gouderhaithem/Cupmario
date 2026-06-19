// Phase D guard: damage is pawn-aware, respawns bring both pawns back together,
// and AI targeting picks the nearest pawn.

import { describe, it, expect } from 'vitest';
import { addPawn, createState, nearestPawn, respawnExtraPawns } from './state';
import { hitPlayer } from './flow';
import { MAX_HP } from './constants';

describe('pawn-aware damage', () => {
  it('hurts only the pawn that was hit', () => {
    const s = createState();
    s.screen = 'play';
    addPawn(s);
    const hp0 = s.players[0].player.hp;
    const hp1 = s.players[1].player.hp;
    hitPlayer(s, s.players[1]);
    expect(s.players[0].player.hp).toBe(hp0); // pawn 0 untouched
    expect(s.players[1].player.hp).toBe(hp1 - 1); // pawn 1 took it
  });

  it('defaults to pawn 0 when no pawn is given (single-player path)', () => {
    const s = createState();
    s.screen = 'play';
    const hp0 = s.players[0].player.hp;
    hitPlayer(s);
    expect(s.players[0].player.hp).toBe(hp0 - 1);
  });
});

describe('respawnExtraPawns', () => {
  it('places pawn 1 beside the just-respawned pawn 0', () => {
    const s = createState();
    addPawn(s);
    s.players[0].player.x = 800;
    s.players[0].player.y = 300;
    respawnExtraPawns(s);
    const p1 = s.players[1].player;
    expect(Math.abs(p1.y - 300)).toBeLessThan(1);
    expect(p1.x).toBeGreaterThan(800); // staggered to the side
    expect(p1.hp).toBe(MAX_HP); // fresh, full health
  });
});

describe('nearestPawn', () => {
  it('returns whichever pawn is closer to a point', () => {
    const s = createState();
    addPawn(s);
    s.players[0].player.x = 100;
    s.players[1].player.x = 900;
    expect(nearestPawn(s, 120, s.players[0].player.y)).toBe(s.players[0]);
    expect(nearestPawn(s, 880, s.players[1].player.y)).toBe(s.players[1]);
  });
});
