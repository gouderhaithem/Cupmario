// Pixel drawing for tiles and entities. Pure draw helpers — they read data and
// paint to the context, never mutate game state.

import { PALETTE, TILE, TILE_BRICK, TILE_GROUND } from '../game/constants';
import { solid } from '../game/physics';
import type { Enemy, Level, Mushroom, MovingPlatform, Player, Projectile, Skin } from '../types';

/** Pixel-aligned filled rectangle. */
export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

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
  }
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

/** A spinning coin: width oscillates with a per-coin phase. */
export function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, idx: number, frame: number): void {
  const phase = (frame + idx * 9) * 0.11;
  const hw = Math.abs(Math.cos(phase)) * 11 + 2;
  ctx.fillStyle = PALETTE.coinSh;
  ctx.beginPath();
  ctx.ellipse(cx, cy, hw + 2, 15, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.coin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, hw, 13, 0, 0, 7);
  ctx.fill();
  if (hw > 5) {
    ctx.fillStyle = PALETTE.coinHi;
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.25, cy, hw * 0.32, 7, 0, 0, 7);
    ctx.fill();
  }
}

/** A patrolling "Glitch" enemy with a 2-step walk cycle. */
export function drawFoe(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  const step = Math.floor(frame / 8) % 2;
  // feet
  rect(ctx, x + 4 + step * 4, y + h - 7, 11, 7, PALETTE.foeFt);
  rect(ctx, x + w - 15 - step * 4, y + h - 7, 11, 7, PALETTE.foeFt);
  // body
  rect(ctx, x + 3, y + 6, w - 6, h - 12, PALETTE.foeDk);
  rect(ctx, x + 6, y + 4, w - 12, h - 12, PALETTE.foe);
  rect(ctx, x + 6, y + 4, w - 12, 6, '#b377e0');
  // brow
  rect(ctx, x + 7, y + 12, 10, 4, PALETTE.foeDk);
  rect(ctx, x + w - 17, y + 12, 10, 4, PALETTE.foeDk);
  // eyes
  rect(ctx, x + 9, y + 16, 8, 9, '#ffffff');
  rect(ctx, x + w - 17, y + 16, 8, 9, '#ffffff');
  rect(ctx, x + 12, y + 19, 4, 5, PALETTE.eye);
  rect(ctx, x + w - 14, y + 19, 4, 5, PALETTE.eye);
  // mouth
  rect(ctx, x + 12, y + h - 14, w - 24, 4, PALETTE.foeDk);
}

/** A "Spitter": a hot-colored foe with a barrel snout that fires bolts. */
export function drawSpitter(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  const step = Math.floor(frame / 8) % 2;
  const facing = e.vx >= 0 ? 1 : -1;
  // feet
  rect(ctx, x + 4 + step * 4, y + h - 7, 11, 7, PALETTE.spitFt);
  rect(ctx, x + w - 15 - step * 4, y + h - 7, 11, 7, PALETTE.spitFt);
  // body
  rect(ctx, x + 3, y + 6, w - 6, h - 12, PALETTE.spitDk);
  rect(ctx, x + 6, y + 4, w - 12, h - 12, PALETTE.spit);
  rect(ctx, x + 6, y + 4, w - 12, 6, '#ff8a6f');
  // angry brow (slanted)
  rect(ctx, x + 7, y + 13, 10, 4, PALETTE.spitDk);
  rect(ctx, x + w - 17, y + 13, 10, 4, PALETTE.spitDk);
  // eyes
  rect(ctx, x + 9, y + 16, 8, 8, '#ffffff');
  rect(ctx, x + w - 17, y + 16, 8, 8, '#ffffff');
  rect(ctx, x + 11, y + 18, 4, 5, PALETTE.eye);
  rect(ctx, x + w - 15, y + 18, 4, 5, PALETTE.eye);
  // barrel snout on the facing side
  if (facing > 0) rect(ctx, x + w - 2, y + h / 2 - 4, 8, 9, PALETTE.spitDk);
  else rect(ctx, x - 6, y + h / 2 - 4, 8, 9, PALETTE.spitDk);
}

/** A power-up mushroom: red domed cap with spots over a pale stem. */
export function drawMushroom(ctx: CanvasRenderingContext2D, m: Mushroom): void {
  const { x, y, w, h } = m;
  // stem
  rect(ctx, x + w * 0.28, y + h * 0.55, w * 0.44, h * 0.45, PALETTE.shroomStem);
  rect(ctx, x + w * 0.28, y + h * 0.55, w * 0.44, 3, '#fffbe9');
  // cap
  ctx.fillStyle = PALETTE.shroom;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5, w / 2, h * 0.46, 0, Math.PI, 0);
  ctx.fill();
  rect(ctx, x, y + h * 0.48, w, h * 0.08, PALETTE.shroom);
  // highlight + spots
  ctx.fillStyle = PALETTE.shroomHi;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.36, y + h * 0.3, w * 0.12, h * 0.1, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.shroomSpot;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h * 0.42, w * 0.1, h * 0.09, 0, 0, 7);
  ctx.ellipse(x + w * 0.68, y + h * 0.38, w * 0.09, h * 0.08, 0, 0, 7);
  ctx.fill();
}

/** A bolt: a glowing capsule, tinted by who fired it. */
export function drawBolt(ctx: CanvasRenderingContext2D, b: Projectile): void {
  const core = b.from === 'player' ? PALETTE.boltPlayer : PALETTE.boltEnemy;
  const hi = b.from === 'player' ? PALETTE.boltPlayerHi : PALETTE.boltEnemyHi;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 4, b.h / 4, 0, 0, 7);
  ctx.fill();
}

/** The goal flag: base block, pole, knob, and a waving pennant. */
export function drawFlag(ctx: CanvasRenderingContext2D, fx: number, frame: number): void {
  const baseY = 10 * TILE - 28;
  // base block
  rect(ctx, fx - 14, baseY, 36, 28, '#caa36a');
  rect(ctx, fx - 14, baseY, 36, 6, '#e0bd86');
  // pole
  rect(ctx, fx, 90, 8, baseY - 90, '#cfd6df');
  rect(ctx, fx, 90, 3, baseY - 90, '#eef3f8');
  // top knob
  rect(ctx, fx - 3, 84, 14, 12, '#ffd94a');
  // waving pennant
  const wv = Math.sin(frame * 0.12) * 4;
  ctx.fillStyle = '#58d68a';
  ctx.beginPath();
  ctx.moveTo(fx + 8, 98);
  ctx.lineTo(fx + 74 + wv, 116);
  ctx.lineTo(fx + 8, 134);
  ctx.fill();
  ctx.fillStyle = '#3f9a5e';
  ctx.beginPath();
  ctx.moveTo(fx + 8, 118);
  ctx.lineTo(fx + 60 + wv, 125);
  ctx.lineTo(fx + 8, 134);
  ctx.fill();
}

/** Pip, drawn in the current level's skin, with walk/jump/crouch poses. */
export function drawPip(ctx: CanvasRenderingContext2D, p: Player, skin: Skin, frame: number): void {
  const { x, y, w, h, face } = p;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 1, w * 0.5, 6, 0, 0, 7);
  ctx.fill();

  // Armed aura: a pulsing cyan glow behind Pip while he can shoot.
  if (p.armed) {
    const pulse = 0.45 + Math.sin(frame * 0.18) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.boltPlayer;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.78, h * 0.6, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  const cz = p.crouch ? 9 : 0;
  const moving = Math.abs(p.vx) > 0.1 && p.onGround;
  const step = Math.floor(frame / 6) % 2;

  // legs
  if (p.onGround && moving && !p.crouch) {
    rect(ctx, x + 6, y + 48, 9, 10, skin.pants);
    rect(ctx, x + w - 15, y + 48, 9, 10, skin.pants);
    rect(ctx, x + 4 + step * 3, y + 54, 12, 4, skin.shoe);
    rect(ctx, x + w - 16 - step * 3, y + 54, 12, 4, skin.shoe);
  } else {
    rect(ctx, x + 6, y + 48, 9, 8, skin.pants);
    rect(ctx, x + w - 15, y + 48, 9, 8, skin.pants);
    rect(ctx, x + 4, y + 54, 12, 4, skin.shoe);
    rect(ctx, x + w - 16, y + 54, 12, 4, skin.shoe);
  }
  // pants block
  rect(ctx, x + 5, y + 40, w - 10, 12, skin.pants);
  // shirt / body
  rect(ctx, x + 4, y + 26 + cz, w - 8, 16 - cz, skin.shirt);
  rect(ctx, x + 4, y + 26 + cz, w - 8, 4, skin.shirtHi);
  // arms
  const armY = (!p.onGround ? y + 22 : y + 28) + cz;
  rect(ctx, x + 1, armY, 6, 12, skin.shirt);
  rect(ctx, x + w - 7, armY, 6, 12, skin.shirt);
  rect(ctx, x + 1, armY + 12, 6, 5, PALETTE.skin);
  rect(ctx, x + w - 7, armY + 12, 6, 5, PALETTE.skin);
  // head
  rect(ctx, x + 6, y + 8 + cz, w - 12, 20, PALETTE.skin);
  // hair / cap
  rect(ctx, x + 4, y + 2 + cz, w - 8, 10, skin.hair);
  rect(ctx, x + 2, y + 8 + cz, 5, 6, skin.hair);
  rect(ctx, x + w - 7, y + 8 + cz, 5, 6, skin.hair);
  // brim (faces movement direction)
  if (face >= 0) rect(ctx, x + w - 12, y + 10 + cz, 12, 4, skin.brim);
  else rect(ctx, x, y + 10 + cz, 12, 4, skin.brim);
  // eyes
  if (face >= 0) {
    rect(ctx, x + 14, y + 16 + cz, 5, 6, PALETTE.eye);
    rect(ctx, x + 22, y + 16 + cz, 5, 6, PALETTE.eye);
  } else {
    rect(ctx, x + 8, y + 16 + cz, 5, 6, PALETTE.eye);
    rect(ctx, x + 16, y + 16 + cz, 5, 6, PALETTE.eye);
  }
}
