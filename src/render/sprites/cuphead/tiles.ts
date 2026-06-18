// Terrain, rubber-hose (Cuphead) style. Ground reads as one continuous inked
// mass: tiles fill flat, but the heavy ink outline is drawn ONLY on edges that
// border open space (silhouette), so a run of tiles joins into a single shape
// instead of a grid of boxed cells. Terrain does NOT boil — only characters do,
// which keeps the world steady (and avoids seam flicker between neighbours).

import { TILE, TILE_GROUND, TILE_POWBLOCK, TILE_QBLOCK, TILE_USED } from '../../../game/constants';
import { solid } from '../../../game/physics';
import type { Crumble, Level, MovingPlatform } from '../../../types';
import { INK, INK_W, PAPER, inkRoundRect, roundRectPath } from '../../ink';
import { inkTheme } from './theme';
import type { InkTheme } from './theme';

const STILL = { frame: 0, boil: false };

/** Stroke a single tile edge in heavy ink (round-capped so neighbours join). */
function edge(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number): void {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

/** Stable per-tile hash (0..1) so dirt speckle is deterministic, not boiling. */
function tileHash(c: number, r: number, salt: number): number {
  const h = Math.sin((c * 127.1 + r * 311.7 + salt * 74.7)) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * Trace a scalloped grass/dirt boundary across one tile (right→left), dipping
 * into rounded lobes. Bump centres are anchored to ABSOLUTE x (period divides
 * TILE), so the lobes flow continuously from one tile into the next instead of
 * resetting at every cell — the key hand-drawn "lumpy turf" Cuphead tell.
 */
function scallop(ctx: CanvasRenderingContext2D, x: number, baseY: number, amp: number): void {
  const BW = 15; // 3 lobes per 45px tile; aligns across neighbours
  for (let bx = x + TILE; bx > x + 0.5; bx -= BW) {
    ctx.quadraticCurveTo(bx - BW / 2, baseY + amp, bx - BW, baseY);
  }
}

export function drawTileInk(ctx: CanvasRenderingContext2D, level: Level, c: number, r: number): void {
  const t = level.grid[r][c];
  const x = c * TILE;
  const y = r * TILE;

  if (t === TILE_QBLOCK || t === TILE_POWBLOCK) {
    drawQBlockInk(ctx, x, y, t === TILE_POWBLOCK);
    return;
  }
  if (t === TILE_USED) {
    inkRoundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 6, '#7a5a2a', STILL);
    return;
  }

  const topOpen = !solid(level, c, r - 1);
  const botOpen = !solid(level, c, r + 1);
  const leftOpen = !solid(level, c - 1, r);
  const rightOpen = !solid(level, c + 1, r);

  const pal = inkTheme(level.theme);
  const isGround = t === TILE_GROUND;
  if (isGround) {
    drawGround(ctx, x, y, topOpen, pal);
  } else {
    drawStone(ctx, x, y, pal);
  }

  // Silhouette ink: only exposed edges, so tiles fuse into one mass.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = INK_W;
  ctx.lineCap = 'round';
  if (topOpen) edge(ctx, x, y + 1, x + TILE, y + 1);
  if (botOpen) edge(ctx, x, y + TILE - 1, x + TILE, y + TILE - 1);
  if (leftOpen) edge(ctx, x + 1, y, x + 1, y + TILE);
  if (rightOpen) edge(ctx, x + TILE - 1, y, x + TILE - 1, y + TILE);
  ctx.restore();
}

/** Earthy ground: strata + speckle dirt, with a scalloped grass cap on top. */
function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number, topOpen: boolean, pal: InkTheme): void {
  const c = Math.round(x / TILE);
  const r = Math.round(y / TILE);
  // Dirt base + faint horizontal strata bands.
  ctx.fillStyle = pal.ground;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = pal.groundDk;
  for (let by = y + 18; by < y + TILE; by += 16) ctx.fillRect(x, by, TILE, 3);
  ctx.restore();
  // Pebble speckle (deterministic per tile so it never boils).
  ctx.save();
  ctx.fillStyle = pal.groundSpeck;
  for (let i = 0; i < 5; i++) {
    const sx = x + 4 + tileHash(c, r, i) * (TILE - 8);
    const sy = y + 16 + tileHash(c, r, i + 9) * (TILE - 20);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (!topOpen) return;

  // Scalloped grass cap: a lumpy turf band whose lower edge dips into the dirt.
  const gBase = y + 13;
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.lineTo(x + TILE, y - 1);
  ctx.lineTo(x + TILE, gBase);
  scallop(ctx, x, gBase, 5);
  ctx.closePath();
  ctx.fillStyle = pal.grass;
  ctx.fill();
  // Bright lip along the very top + a dark seam under the scallop.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.grassDk;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + TILE, gBase);
  scallop(ctx, x, gBase, 5);
  ctx.stroke();
  ctx.restore();
}

/** A platform/brick: a rounded clay-stone block with a bevel, grain and rivets. */
function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, pal: InkTheme): void {
  const c = Math.round(x / TILE);
  const r = Math.round(y / TILE);
  ctx.fillStyle = pal.brickDk;
  ctx.fillRect(x, y, TILE, TILE);
  // Inset face (rounded) so a run of blocks reads as carved masonry, not a grid.
  ctx.fillStyle = pal.brick;
  ctx.beginPath();
  roundRectPath(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 7);
  ctx.fill();
  // Top bevel highlight + a couple of grain cracks.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PAPER.white;
  ctx.fillRect(x + 5, y + 5, TILE - 10, 3);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = pal.brickDk;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const gx = x + 10 + tileHash(c, r, 1) * (TILE - 20);
  ctx.moveTo(gx, y + 10);
  ctx.lineTo(gx - 4, y + TILE - 10);
  ctx.stroke();
  ctx.restore();
  // Corner rivets.
  ctx.save();
  ctx.fillStyle = INK;
  for (const [rx, ry] of [[x + 8, y + 8], [x + TILE - 8, y + 8], [x + 8, y + TILE - 8], [x + TILE - 8, y + TILE - 8]] as const) {
    ctx.beginPath();
    ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A prize block: a carved, rivet-studded crate (not a flat Mario cube) holding a
 * ? (coin) or ! (weapon) glyph. A darker frame + inner bevelled face + corner
 * rivets match the stone tiles, and the glyph gets a soft cream halo so it reads
 * against the warm face without the hard pixel-font Mario look.
 */
function drawQBlockInk(ctx: CanvasRenderingContext2D, x: number, y: number, pow: boolean): void {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const frame = pow ? '#9a3fa0' : '#b07c1e';
  const face = pow ? '#d76bdd' : '#e6b43c';
  const faceHi = pow ? '#ec9bef' : '#f6cf6a';
  // Frame + bevelled inner face.
  inkRoundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 8, frame, STILL);
  inkRoundRect(ctx, x + 6, y + 6, TILE - 12, TILE - 12, 6, face, { ...STILL, lw: 0 });
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = faceHi;
  ctx.fillRect(x + 9, y + 9, TILE - 18, 4);
  ctx.restore();
  // Corner rivets.
  ctx.save();
  ctx.fillStyle = INK;
  for (const [rx, ry] of [[x + 9, y + 9], [x + TILE - 9, y + 9], [x + 9, y + TILE - 9], [x + TILE - 9, y + TILE - 9]] as const) {
    ctx.beginPath();
    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Glyph with a cream halo.
  ctx.save();
  ctx.font = "18px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAPER.white;
  ctx.fillText(pow ? '!' : '?', cx + 1, cy + 2);
  ctx.fillStyle = INK;
  ctx.fillText(pow ? '!' : '?', cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** A crumbling platform: cracked clay slab; jitters when armed, fades while falling. */
export function drawCrumbleInk(ctx: CanvasRenderingContext2D, cr: Crumble, frame: number): void {
  ctx.save();
  let { x } = cr;
  if (cr.timer >= 0 && !cr.falling) x += ((frame % 2) * 2 - 1) * 1.5; // pre-fall jitter
  if (cr.falling) ctx.globalAlpha = 0.6;
  inkRoundRect(ctx, x, cr.y, cr.w, cr.h, 6, '#b88a52', STILL);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 1; i * 22 < cr.w; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 22, cr.y + 5);
    ctx.lineTo(x + i * 22 - 3, cr.y + cr.h - 5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A moving platform: a bevelled metal slab with bolt studs, ink-outlined. */
export function drawMoverInk(ctx: CanvasRenderingContext2D, m: MovingPlatform): void {
  const { x, y, w, h } = m;
  inkRoundRect(ctx, x, y, w, h, 6, '#7d909e', STILL);
  ctx.save();
  ctx.fillStyle = INK;
  for (let bx = x + 10; bx < x + w - 6; bx += 22) {
    ctx.beginPath();
    ctx.arc(bx, y + h / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
