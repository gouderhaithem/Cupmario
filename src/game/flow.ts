// Screen transitions and life handling. The only place `screen` changes.

import { sfx, startMusic, stopMusic } from '../engine/audio';
import { shakeScreen } from '../engine/effects';
import { BEST_KEY, CLEAR_BONUS, HURT_FRAMES, SHAKE_HURT, START_LIVES } from './constants';
import { LEVELS } from './levels';
import { loadLevel, makeKeys, spawnPlayer } from './state';
import type { GameState } from './state';
import { spawnEnemies, spawnMovers } from './level';

const isPlaying = (state: GameState) => () => state.screen === 'play';

/** New game from level 0 with fresh score/lives. */
export function start(state: GameState): void {
  loadLevel(state, 0);
  state.coins = 0;
  state.score = 0;
  state.lives = START_LIVES;
  state.screen = 'play';
  startMusic(state.levelIndex, isPlaying(state));
}

/** Advance to the next level (coins reset, score + shoot power carry over). */
export function nextLevel(state: GameState): void {
  const keptArmed = state.player.armed;
  loadLevel(state, Math.min(state.levelIndex + 1, LEVELS.length - 1));
  state.player.armed = keptArmed;
  state.coins = 0;
  state.screen = 'play';
  sfx('levelup');
  startMusic(state.levelIndex, isPlaying(state));
}

/** Lose a life; respawn in place, or end the game at 0 lives. */
export function loseLife(state: GameState): void {
  state.lives -= 1;
  shakeScreen(state, SHAKE_HURT);
  sfx('die');
  if (state.lives <= 0) {
    state.screen = 'gameover';
    stopMusic();
    return;
  }
  state.player = spawnPlayer(state.level);
  state.enemies = spawnEnemies(state.level);
  state.movers = spawnMovers(state.level);
  state.mushrooms = [];
  state.projectiles = [];
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.shootLatch = false;
  state.shootCd = 0;
}

/**
 * Pip took a hit from an enemy (contact or a bolt). If he's armed, he only
 * loses the power and gets brief invulnerability; otherwise he loses a life.
 * Returns true if a life was lost (caller should stop the frame).
 */
export function hitPlayer(state: GameState): boolean {
  const p = state.player;
  if (p.armed) {
    p.armed = false;
    p.hurt = HURT_FRAMES;
    shakeScreen(state, SHAKE_HURT);
    sfx('powerdown');
    return false;
  }
  loseLife(state);
  return true;
}

/** Reached the flag: level-up if more levels remain, else win. */
export function reachFlag(state: GameState): void {
  if (state.levelIndex < LEVELS.length - 1) {
    state.score += CLEAR_BONUS;
    state.screen = 'levelup';
    stopMusic();
    sfx('win');
  } else {
    win(state);
  }
}

/** Final clear: bonus, persist best score, show win screen. */
export function win(state: GameState): void {
  state.score += CLEAR_BONUS;
  state.screen = 'win';
  stopMusic();
  sfx('win');
  if (state.score > state.best) {
    state.best = state.score;
    try {
      localStorage.setItem(BEST_KEY, String(state.best));
    } catch {
      /* ignore storage errors */
    }
  }
}

/** Title / gameover / win advance to a new game; levelup continues. */
export function onAction(state: GameState): void {
  if (state.screen === 'levelup') nextLevel(state);
  else start(state);
}
