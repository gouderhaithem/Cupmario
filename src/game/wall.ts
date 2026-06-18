// Wall slide + wall jump. Pip can hug a vertical wall in mid-air to slow his
// descent, then kick off it for a diagonal launch. The slide is detected from
// input + an adjacent solid tile; the jump itself fires in player.ts (it shares
// the jump buffer), and the launch is preserved by a short input lockout there.

import { TILE, WALL_COYOTE_FRAMES, WALL_SLIDE_SPEED } from './constants';
import { solid } from './physics';
import { spawnWallDust } from './puff';
import type { GameState } from './state';
import type { Level, Player } from '../types';

/** Emit a friction wisp every Nth frame while sliding (throttled spawn rate). */
const WALL_DUST_EVERY = 5;

/**
 * Is there a solid tile immediately beside Pip on the given side (-1 left,
 * +1 right)? Probes 1px outside the box edge across his full vertical span, so a
 * box flush against a wall (after collideX) reads as touching it. Pure lookup.
 */
export function wallBeside(level: Level, p: Player, dir: -1 | 1): boolean {
  const probeX = dir < 0 ? p.x - 1 : p.x + p.w;
  const c = Math.floor(probeX / TILE);
  const top = Math.floor(p.y / TILE);
  const bot = Math.floor((p.y + p.h - 1) / TILE);
  for (let r = top; r <= bot; r++) {
    if (solid(level, c, r)) return true;
  }
  return false;
}

/**
 * Resolve wall-cling state for this tick. A slide starts when Pip is airborne,
 * descending, not dashing, and pushing into an adjacent wall; while sliding his
 * fall is capped to a slow crawl and the wall-coyote window is refreshed so a
 * jump fired a few frames after letting go still wall-jumps. Mutates the player.
 */
export function updateWall(state: GameState): void {
  const p = state.player;
  const keys = state.keys;

  if (p.wallCoyote > 0) p.wallCoyote -= 1;

  const dir: -1 | 0 | 1 = keys.left ? -1 : keys.right ? 1 : 0;
  const sliding =
    !p.onGround &&
    p.vy > 0 &&
    p.dashFrames <= 0 &&
    dir !== 0 &&
    wallBeside(state.level, p, dir);

  if (sliding) {
    p.wallSlide = true;
    p.wallDir = dir;
    p.wallCoyote = WALL_COYOTE_FRAMES;
    p.face = dir; // hug the wall — face into it
    if (p.vy > WALL_SLIDE_SPEED) p.vy = WALL_SLIDE_SPEED;
    // A wisp of friction dust at the wall contact (skip under reduced motion).
    if (!state.reducedMotion && state.frame % WALL_DUST_EVERY === 0) {
      const contactX = dir > 0 ? p.x + p.w : p.x;
      spawnWallDust(state, contactX, p.y + p.h * 0.55, dir);
    }
  } else {
    p.wallSlide = false;
  }
}
