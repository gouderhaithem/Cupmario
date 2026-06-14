// Pip drawing: skinned walk/jump/crouch poses + the dash after-image streak.

import { PALETTE } from '../../game/constants';
import type { Player, Skin } from '../../types';
import { rect } from './util';

/** Pip, drawn in the current level's skin, with walk/jump/crouch poses. */
/** The body art is hand-drawn this tall; a shorter hitbox squashes it to fit. */
const ART_H = 58;

export function drawPip(ctx: CanvasRenderingContext2D, p: Player, skin: Skin, frame: number): void {
  const { x, w, h, face } = p;
  const feet = p.y + h;

  // shadow (world coords, at the feet)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, feet - 1, w * 0.5, 6, 0, 0, 7);
  ctx.fill();

  // Dash streak: translucent after-images trailing behind the burst.
  if (p.dashFrames > 0) {
    ctx.save();
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.28 / i;
      rect(ctx, x - p.dashDir * i * 9, p.y + 8, w, h - 10, PALETTE.boltPlayer);
    }
    ctx.restore();
  }

  // Draw the ART_H-tall art with feet anchored at the bottom, squashed
  // vertically to the live hitbox height — so a crouch reads as a crawl pose.
  ctx.save();
  ctx.translate(0, feet);
  if (h !== ART_H) ctx.scale(1, h / ART_H);
  ctx.translate(0, -ART_H);
  const y = 0; // art-local top; feet sit at ART_H

  const moving = Math.abs(p.vx) > 0.1 && p.onGround;
  const step = Math.floor(frame / 6) % 2;

  // legs — stride animates while walking and while crawling (crouch-walk)
  if (p.onGround && moving) {
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
  rect(ctx, x + 4, y + 26, w - 8, 16, skin.shirt);
  rect(ctx, x + 4, y + 26, w - 8, 4, skin.shirtHi);
  // arms
  const armY = !p.onGround ? y + 22 : y + 28;
  rect(ctx, x + 1, armY, 6, 12, skin.shirt);
  rect(ctx, x + w - 7, armY, 6, 12, skin.shirt);
  rect(ctx, x + 1, armY + 12, 6, 5, PALETTE.skin);
  rect(ctx, x + w - 7, armY + 12, 6, 5, PALETTE.skin);
  // head
  rect(ctx, x + 6, y + 8, w - 12, 20, PALETTE.skin);
  // hair / cap
  rect(ctx, x + 4, y + 2, w - 8, 10, skin.hair);
  rect(ctx, x + 2, y + 8, 5, 6, skin.hair);
  rect(ctx, x + w - 7, y + 8, 5, 6, skin.hair);
  // brim (faces movement direction)
  if (face >= 0) rect(ctx, x + w - 12, y + 10, 12, 4, skin.brim);
  else rect(ctx, x, y + 10, 12, 4, skin.brim);
  // eyes
  if (face >= 0) {
    rect(ctx, x + 14, y + 16, 5, 6, PALETTE.eye);
    rect(ctx, x + 22, y + 16, 5, 6, PALETTE.eye);
  } else {
    rect(ctx, x + 8, y + 16, 5, 6, PALETTE.eye);
    rect(ctx, x + 16, y + 16, 5, 6, PALETTE.eye);
  }
  ctx.restore();
}
