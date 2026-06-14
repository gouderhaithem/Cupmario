// Boss drawing: the hovering glitch-blob with crown, eyes, telegraph aura, and
// hurt flash. (Movement + attacks live in game/boss.ts; this only paints.)

import { BOSS_BOB_AMP, PALETTE, TILE } from '../../game/constants';
import type { Boss } from '../../types';
import { rect } from './util';

/**
 * The boss: a hovering glitch-blob with a crown and pink eyes. Bobs idle, pulses
 * a white aura while telegraphing, flashes white when hurt.
 */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, frame: number): void {
  const bobY = Math.sin(boss.bob) * BOSS_BOB_AMP;
  const x = boss.x;
  const y = boss.y + bobY;
  const { w, h } = boss;

  // Telegraph: a pulsing white wind-up aura warns the next attack.
  if (boss.telegraph > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.5) * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.72, h * 0.72, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow (fixed at the floor, so the bob reads as a hover).
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, 10 * TILE - 4, w * 0.42, 8, 0, 0, 7);
  ctx.fill();

  // Body: a chunky rounded blob with a darker base.
  ctx.fillStyle = PALETTE.bossLo;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.5, h * 0.42, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.bossDk;
  rect(ctx, x + 6, y + h * 0.28, w - 12, h * 0.5, PALETTE.bossDk);
  rect(ctx, x + 10, y + h * 0.24, w - 20, h * 0.5, PALETTE.boss);
  rect(ctx, x + 10, y + h * 0.24, w - 20, 8, '#7a64b0');

  // Glitch tendrils (little roots dangling beneath).
  for (let i = 0; i < 5; i++) {
    const tx = x + 14 + i * ((w - 28) / 4);
    const wig = Math.sin(frame * 0.2 + i) * 3;
    rect(ctx, tx + wig, y + h * 0.74, 5, 12, PALETTE.bossDk);
  }

  // Crown.
  const cw = w * 0.5;
  const cx0 = x + w / 2 - cw / 2;
  const cy0 = y + h * 0.1;
  rect(ctx, cx0, cy0 + 8, cw, 8, PALETTE.bossCrown);
  for (let i = 0; i < 3; i++) {
    const px = cx0 + i * (cw / 3) + 2;
    rect(ctx, px, cy0, cw / 3 - 4, 12, PALETTE.bossCrown);
  }

  // Eyes: hot-pink, glaring, blink occasionally.
  const blink = frame % 150 < 8;
  const eh = blink ? 2 : 10;
  rect(ctx, x + w * 0.3 - 5, y + h * 0.4, 10, eh, PALETTE.bossEye);
  rect(ctx, x + w * 0.7 - 5, y + h * 0.4, 10, eh, PALETTE.bossEye);
  if (!blink) {
    rect(ctx, x + w * 0.3 - 2, y + h * 0.4 + 2, 4, 5, '#ffffff');
    rect(ctx, x + w * 0.7 - 2, y + h * 0.4 + 2, 4, 5, '#ffffff');
  }
  // Jagged mouth.
  rect(ctx, x + w * 0.32, y + h * 0.58, w * 0.36, 5, PALETTE.bossLo);

  // Hurt flash: a brief white wash over the body.
  if (boss.hurtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    rect(ctx, x + 8, y + h * 0.18, w - 16, h * 0.6, '#ffffff');
    ctx.restore();
  }
}
