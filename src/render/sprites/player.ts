// Pip drawing: skinned walk/jump/crouch poses + the dash after-image streak.

import { PALETTE } from '../../game/constants';
import type { Player, Skin } from '../../types';
import { rect } from './util';

/** Pip, drawn in the current level's skin, with walk/jump/crouch poses. */
export function drawPip(ctx: CanvasRenderingContext2D, p: Player, skin: Skin, frame: number): void {
  const { x, y, w, h, face } = p;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 1, w * 0.5, 6, 0, 0, 7);
  ctx.fill();

  // Dash streak: translucent after-images trailing behind the burst.
  if (p.dashFrames > 0) {
    ctx.save();
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.28 / i;
      rect(ctx, x - p.dashDir * i * 9, y + 8, w, h - 10, PALETTE.boltPlayer);
    }
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
