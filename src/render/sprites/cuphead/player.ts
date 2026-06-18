// Pip, drawn rubber-hose (Cuphead) style: a big round head, a bean torso, and
// boneless hose arms/legs with bulbous shoes — all ink-outlined and boiling.
// Mirrors the pose logic of the pixel drawPip (walk/jump/crouch + dash streak)
// but every form is a curve, not a stack of rectangles.

import { PALETTE } from '../../../game/constants';
import type { Player, Skin } from '../../../types';
import { INK, boilOffset, inkEllipse, inkHose, inkRoundRect, inkShadow, pieEye, softHi } from '../../ink';
import { playerSquash, skidLean } from '../squash';

/** Hand-drawn art height; a shorter hitbox squashes the whole figure to fit. */
const ART_H = 58;

export function drawPipInk(
  ctx: CanvasRenderingContext2D,
  p: Player,
  skin: Skin,
  frame: number,
  boil: boolean,
): void {
  const { x, w, h, face } = p;
  const feet = p.y + h;
  const o = { frame, boil };

  // Contact shadow at the feet.
  inkShadow(ctx, x + w / 2, feet - 1, w * 0.5);

  // Dash streak: translucent after-images trailing the burst.
  if (p.dashFrames > 0) {
    ctx.save();
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.26 / i;
      inkEllipse(ctx, x + w / 2 - p.dashDir * i * 10, p.y + h * 0.45, w * 0.42, h * 0.4, PALETTE.boltPlayer, {
        frame,
        boil: false,
        lw: 0,
      });
    }
    ctx.restore();
  }

  // Anchor feet at the bottom and squash to the live hitbox (crouch crawl pose),
  // then layer the velocity-driven squash-and-stretch about the feet-centre.
  const cx = x + w / 2;
  const sq = playerSquash(p, frame);
  const lean = skidLean(p);
  ctx.save();
  ctx.translate(cx, feet);
  if (lean) ctx.rotate(lean); // tilt the whole figure about the feet while skidding
  ctx.scale(sq.sx, sq.sy);
  if (h !== ART_H) ctx.scale(1, h / ART_H);
  ctx.translate(-cx, -ART_H);

  const moving = Math.abs(p.vx) > 0.1 && p.onGround;
  const airborne = !p.onGround;
  // Walk swing: legs/arms swing in opposition on a 2-step cadence.
  const swing = moving ? Math.sin(frame * 0.32) * 7 : 0;

  // ---- Legs (hose) + shoes ----
  const hipY = 40;
  const footY = airborne ? 52 : 56;
  const legL = cx - 6;
  const legR = cx + 6;
  // Back leg first (drawn behind torso for depth).
  inkHose(ctx, legR, hipY, legR + (airborne ? 4 : swing), footY, 8, skin.pants, { ...o, seed: 2 });
  inkHose(ctx, legL, hipY, legL - (airborne ? 4 : swing), footY, 8, skin.pants, { ...o, seed: 3 });
  inkEllipse(ctx, legR + (airborne ? 4 : swing), footY + 1, 8, 5, skin.shoe, { ...o, seed: 4 });
  inkEllipse(ctx, legL - (airborne ? 4 : swing), footY + 1, 8, 5, skin.shoe, { ...o, seed: 5 });

  // ---- Torso (bean) ----
  inkRoundRect(ctx, cx - 13, 24, 26, 20, 10, skin.shirt, { ...o, seed: 1 });
  softHi(ctx, cx - 5, 28, 6, 7, skin.shirtHi, 0.6);

  // ---- Arms (hose) with little hands ----
  const shoulderY = 28;
  const armX = 11;
  const handY = airborne ? 20 : 38 + swing * 0.4;
  const handYb = airborne ? 20 : 38 - swing * 0.4;
  inkHose(ctx, cx - armX, shoulderY, cx - armX - 5, handY, 6, skin.shirt, { ...o, seed: 6 });
  inkHose(ctx, cx + armX, shoulderY, cx + armX + 5, handYb, 6, skin.shirt, { ...o, seed: 7 });
  inkEllipse(ctx, cx - armX - 6, handY, 4, 4, PALETTE.skin, { ...o, seed: 8 });
  inkEllipse(ctx, cx + armX + 6, handYb, 4, 4, PALETTE.skin, { ...o, seed: 9 });

  // ---- Head (big round) ----
  const headY = 13;
  inkEllipse(ctx, cx, headY, 13, 13, PALETTE.skin, { ...o, seed: 10 });
  // Eyes (look toward facing).
  pieEye(ctx, cx + face * 2 - 4, headY - 1, 3.4, face, { ...o, seed: 11 });
  pieEye(ctx, cx + face * 2 + 4, headY - 1, 3.4, face, { ...o, seed: 12 });
  // Little smile.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const bo = boilOffset(frame, 10, boil);
  ctx.beginPath();
  ctx.arc(cx + bo.dx, headY + 5 + bo.dy, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // ---- Hair tuft + cap brim (faces movement) ----
  inkEllipse(ctx, cx, headY - 11, 9, 6, skin.hair, { ...o, seed: 13 });
  const brimX = face >= 0 ? cx + 6 : cx - 6;
  inkRoundRect(ctx, brimX - 9, headY - 9, 18, 5, 2.5, skin.brim, { ...o, seed: 14 });

  ctx.restore();
}
