// Terrain + platform drawing: tiles, question blocks, moving + crumbling slabs.

import {
  PALETTE,
  TILE,
  TILE_BRICK,
  TILE_GROUND,
  TILE_POWBLOCK,
  TILE_QBLOCK,
  TILE_USED,
} from '../../game/constants';
import { solid } from '../../game/physics';
import type { Crumble, Level, MovingPlatform } from '../../types';
import { rect } from './util';

/** Draw a single solid tile (ground with grass cap, or brick platform). */
export function drawTile(ctx: CanvasRenderingContext2D, level: Level, c: number, r: number): void {
  const t = level.grid[r][c];
  if (t === TILE_GROUND) {
    const x = c * TILE;
    const y = r * TILE;
    const topOpen = !solid(level, c, r - 1);
    rect(ctx, x, y, TILE, TILE, '#7a4a26');
    rect(ctx, x, y, TILE, TILE * 0.18, '#8a5a30');
    if (topOpen) {
      rect(ctx, x, y, TILE, 12, '#58d68a');
      rect(ctx, x, y + 10, TILE, 4, '#3f9a5e');
    }
    rect(ctx, x, y, 3, TILE, 'rgba(0,0,0,0.12)');
    rect(ctx, x + TILE - 3, y, 3, TILE, 'rgba(0,0,0,0.18)');
  } else if (t === TILE_BRICK) {
    const x = c * TILE;
    const y = r * TILE;
    rect(ctx, x, y, TILE, TILE, '#d98a3a');
    rect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, '#e8a657');
    rect(ctx, x + 3, y + 3, TILE - 6, 5, '#f2c486');
    rect(ctx, x, y, TILE, 4, '#b06a26');
    rect(ctx, x, y + TILE - 4, TILE, 4, '#b06a26');
  } else if (t === TILE_QBLOCK || t === TILE_POWBLOCK) {
    drawQBlock(ctx, c, r, t === TILE_POWBLOCK);
  } else if (t === TILE_USED) {
    const x = c * TILE;
    const y = r * TILE;
    rect(ctx, x, y, TILE, TILE, PALETTE.qblockUsed);
    rect(ctx, x + 4, y + 4, TILE - 8, TILE - 8, '#5c4420');
    rect(ctx, x, y, TILE, 4, '#5c4420');
  }
}

/** A question block: glowing rivet box with a ? (coin) or ! (weapon) glyph. */
function drawQBlock(ctx: CanvasRenderingContext2D, c: number, r: number, pow: boolean): void {
  const x = c * TILE;
  const y = r * TILE;
  const base = pow ? PALETTE.powblock : PALETTE.qblock;
  const hi = pow ? PALETTE.powblockHi : PALETTE.qblockHi;
  rect(ctx, x, y, TILE, TILE, base);
  rect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, hi);
  rect(ctx, x + 3, y + 3, TILE - 6, 5, '#ffffff');
  rect(ctx, x, y, TILE, 4, '#8a5a10');
  rect(ctx, x, y + TILE - 4, TILE, 4, '#8a5a10');
  // Corner rivets.
  for (const [rx, ry] of [[6, 6], [TILE - 10, 6], [6, TILE - 10], [TILE - 10, TILE - 10]]) {
    rect(ctx, x + rx, y + ry, 4, 4, '#8a5a10');
  }
  // Glyph.
  ctx.fillStyle = '#3a2400';
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.fillText(pow ? '!' : '?', x + TILE / 2, y + TILE / 2 + 7);
  ctx.textAlign = 'left';
}

/** A crumbling platform: cracked slab; jitters when armed, fades while falling. */
export function drawCrumble(ctx: CanvasRenderingContext2D, c: Crumble, frame: number): void {
  ctx.save();
  let { x } = c;
  if (c.timer >= 0 && !c.falling) x += ((frame % 2) * 2 - 1) * 1.5; // pre-fall jitter
  if (c.falling) ctx.globalAlpha = 0.6;
  rect(ctx, x, c.y, c.w, c.h, '#9a6a3a');
  rect(ctx, x, c.y, c.w, 5, '#b88a52');
  rect(ctx, x, c.y + c.h - 4, c.w, 4, '#6e4a26');
  // cracks
  for (let i = 1; i * 22 < c.w; i++) {
    rect(ctx, x + i * 22, c.y + 4, 2, c.h - 8, 'rgba(0,0,0,0.28)');
  }
  ctx.restore();
}

/** A metal moving platform: bevelled slab with bolts, to read as mechanical. */
export function drawMover(ctx: CanvasRenderingContext2D, m: MovingPlatform): void {
  const { x, y, w, h } = m;
  rect(ctx, x, y, w, h, '#5a6b7a');
  rect(ctx, x, y, w, 6, '#7d909e');
  rect(ctx, x, y + h - 5, w, 5, '#3c4a57');
  rect(ctx, x, y, 3, h, 'rgba(255,255,255,0.12)');
  rect(ctx, x + w - 3, y, 3, h, 'rgba(0,0,0,0.22)');
  for (let bx = x + 9; bx < x + w - 6; bx += 22) {
    rect(ctx, bx, y + h / 2 - 2, 4, 4, '#cdd6df');
  }
}
