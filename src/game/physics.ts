// AABB tile collision. Move horizontally then collideX, apply gravity, move
// vertically then collideY (which sets onGround). Pure tile lookups.

import type { Level, Player } from '../types';
import { COLS, CORNER_NUDGE, ROWS, TILE, TILE_EMPTY } from './constants';

/** Is the tile at column c, row r solid? Out-of-bounds is not solid. */
export function solid(level: Level, c: number, r: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return level.grid[r][c] !== TILE_EMPTY;
}

/** True when Pip's head row r is free of solids across his width at a given x. */
function headClear(level: Level, x: number, w: number, r: number): boolean {
  const lc = Math.floor(x / TILE);
  const rc = Math.floor((x + w - 1) / TILE);
  for (let c = lc; c <= rc; c++) if (solid(level, c, r)) return false;
  return true;
}

/**
 * Corner correction: if a small horizontal shift (≤ CORNER_NUDGE px, smaller
 * side first) clears Pip's head, apply it so a glancing ceiling-corner clip
 * doesn't kill his rise. A square hit (more overlap than the nudge can clear)
 * returns false and is blocked normally — so question blocks still bump.
 */
function nudgePastCorner(level: Level, p: Player, r: number): boolean {
  for (let d = 1; d <= CORNER_NUDGE; d++) {
    if (headClear(level, p.x - d, p.w, r)) {
      p.x -= d;
      return true;
    }
    if (headClear(level, p.x + d, p.w, r)) {
      p.x += d;
      return true;
    }
  }
  return false;
}

/** Resolve horizontal collision after moving p.x by p.vx. */
export function collideX(level: Level, p: Player): void {
  const top = Math.floor(p.y / TILE);
  const bot = Math.floor((p.y + p.h - 1) / TILE);
  if (p.vx > 0) {
    const c = Math.floor((p.x + p.w) / TILE);
    for (let r = top; r <= bot; r++) {
      if (solid(level, c, r)) {
        p.x = c * TILE - p.w;
        p.vx = 0;
        break;
      }
    }
  } else if (p.vx < 0) {
    const c = Math.floor(p.x / TILE);
    for (let r = top; r <= bot; r++) {
      if (solid(level, c, r)) {
        p.x = (c + 1) * TILE;
        p.vx = 0;
        break;
      }
    }
  }
}

/** Resolve vertical collision after moving p.y by p.vy; sets onGround. */
export function collideY(level: Level, p: Player): void {
  p.onGround = false;
  const lft = Math.floor(p.x / TILE);
  const rgt = Math.floor((p.x + p.w - 1) / TILE);
  if (p.vy > 0) {
    const r = Math.floor((p.y + p.h) / TILE);
    for (let c = lft; c <= rgt; c++) {
      if (solid(level, c, r)) {
        p.y = r * TILE - p.h;
        p.vy = 0;
        p.onGround = true;
        break;
      }
    }
  } else if (p.vy < 0) {
    const r = Math.floor(p.y / TILE);
    let blocked = false;
    for (let c = lft; c <= rgt; c++) {
      if (solid(level, c, r)) {
        blocked = true;
        break;
      }
    }
    // Slip past a glancing corner clip; only a square hit stops the rise.
    if (blocked && !nudgePastCorner(level, p, r)) {
      p.y = (r + 1) * TILE;
      p.vy = 0;
    }
  }
}
