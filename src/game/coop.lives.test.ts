// Per-player lives (co-op) + preserved single-player death behaviour.

import { describe, it, expect } from 'vitest';
import { addPawn, allDown, createState } from './state';
import { loseLife } from './flow';

function coopPlay() {
  const s = createState();
  s.screen = 'play';
  addPawn(s);
  return s;
}

describe('co-op per-player lives', () => {
  it('a fallen pawn spends its own life and respawns while the partner is up', () => {
    const s = coopPlay();
    const before = s.players[1].lives;
    loseLife(s, s.players[1]);
    expect(s.players[1].lives).toBe(before - 1);
    expect(s.players[1].down).toBe(false);
    expect(s.players[0].lives).toBe(before); // partner untouched
    expect(s.screen).toBe('play'); // run continues
  });

  it('a pawn out of lives sits out, but the run continues for the partner', () => {
    const s = coopPlay();
    s.players[1].lives = 1;
    loseLife(s, s.players[1]); // 1 -> 0
    expect(s.players[1].down).toBe(true);
    expect(s.screen).toBe('play');
  });

  it('game over only once every pawn is down', () => {
    const s = coopPlay();
    s.players[0].down = true; // one player already out
    s.players[1].lives = 1;
    loseLife(s, s.players[1]); // last player's last life
    expect(allDown(s)).toBe(true);
    expect(s.screen).toBe('gameover');
  });
});

describe('single-player death unchanged', () => {
  it('respawns at the checkpoint while lives remain', () => {
    const s = createState();
    s.screen = 'play';
    s.respawnX = 200;
    s.respawnY = 100;
    s.players[0].lives = 3;
    loseLife(s);
    expect(s.players[0].lives).toBe(2);
    expect(s.screen).toBe('play');
    expect(s.players[0].player.x).toBe(200);
  });

  it('is game over on the last life', () => {
    const s = createState();
    s.screen = 'play';
    s.players[0].lives = 1;
    loseLife(s);
    expect(s.screen).toBe('gameover');
  });
});
