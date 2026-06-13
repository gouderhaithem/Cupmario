// AABB tile collision. Move horizontally then collideX, apply gravity, move
// vertically then collideY (which sets onGround). Pure tile lookups.

import type { Level, Player } from '../types';
import { COLS, ROWS, TILE, TILE_EMPTY } from './constants';

/** Is the tile at column c, row r solid? Out-of-bounds is not solid. */
export function solid(level: Level, c: number, r: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return level.grid[r][c] !== TILE_EMPTY;
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
    for (let c = lft; c <= rgt; c++) {
      if (solid(level, c, r)) {
        p.y = (r + 1) * TILE;
        p.vy = 0;
        break;
      }
    }
  }
}
