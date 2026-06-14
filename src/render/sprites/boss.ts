// Boss drawing: a hovering menace whose colors + silhouette come from its skin
// and shape, so ROOTKIT / SPECTRA / THE OVERCLOCK read as distinct characters.
// (Movement + attacks live in game/boss.ts; this only paints.)

import { BOSS_BOB_AMP, TILE } from '../../game/constants';
import type { Boss, BossShape, BossSkin } from '../../types';
import { rect } from './util';

/** Dangling appendages under the body — different per shape. */
function drawAppendage(
  ctx: CanvasRenderingContext2D,
  shape: BossShape,
  s: BossSkin,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  if (shape === 'roots') {
    // Buried-King roots: soft tendrils that sway.
    for (let i = 0; i < 5; i++) {
      const tx = x + 14 + i * ((w - 28) / 4);
      const wig = Math.sin(frame * 0.2 + i) * 3;
      rect(ctx, tx + wig, y + h * 0.74, 5, 12, s.bodyDk);
    }
  } else if (shape === 'wire') {
    // Live-Wire: jagged lightning bolts crackling beneath.
    for (let i = 0; i < 4; i++) {
      const tx = x + 18 + i * ((w - 36) / 3);
      const flick = (frame + i * 5) % 14 < 7 ? 1 : -1;
      rect(ctx, tx, y + h * 0.72, 4, 7, s.accent);
      rect(ctx, tx + 3 * flick, y + h * 0.79, 4, 7, s.crown);
      rect(ctx, tx - 2 * flick, y + h * 0.86, 4, 6, s.accent);
    }
  } else {
    // Machine: glowing exhaust vents under a boxy chassis.
    for (let i = 0; i < 3; i++) {
      rect(ctx, x + 14, y + h * 0.66 + i * 7, w - 28, 3, s.accent);
    }
    rect(ctx, x + w * 0.5 - 10, y + h * 0.82, 20, 8, s.bodyDk);
  }
}

/** Headpiece on top of the body — crown / arcs / antenna per shape. */
function drawHead(
  ctx: CanvasRenderingContext2D,
  shape: BossShape,
  s: BossSkin,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  const cw = w * 0.5;
  const cx0 = x + w / 2 - cw / 2;
  const cy0 = y + h * 0.1;
  if (shape === 'roots') {
    // Spiked crown.
    rect(ctx, cx0, cy0 + 8, cw, 8, s.crown);
    for (let i = 0; i < 3; i++) {
      rect(ctx, cx0 + i * (cw / 3) + 2, cy0, cw / 3 - 4, 12, s.crown);
    }
  } else if (shape === 'wire') {
    // Electric arcs: flickering prongs.
    const lit = frame % 10 < 6;
    rect(ctx, cx0, cy0 + 10, cw, 5, s.crown);
    for (let i = 0; i < 4; i++) {
      const px = cx0 + i * (cw / 4) + 2;
      const tall = (i % 2 === 0) === lit ? 14 : 7;
      rect(ctx, px, cy0 + 12 - tall, cw / 4 - 4, tall, s.crown);
    }
  } else {
    // Machine: a stubby antenna with a blinking signal light.
    const stalkX = x + w / 2 - 3;
    rect(ctx, stalkX, cy0 - 6, 6, 18, s.bodyDk);
    const on = frame % 40 < 20;
    rect(ctx, stalkX - 3, cy0 - 12, 12, 8, on ? s.crown : s.bodyLo);
  }
}

/**
 * The boss: bobs idle, pulses a white aura while telegraphing, flashes white
 * when hurt. All colors come from `boss.skin`; `boss.shape` swaps the silhouette.
 */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, frame: number): void {
  const bobY = Math.sin(boss.bob) * BOSS_BOB_AMP;
  const x = boss.x;
  const y = boss.y + bobY;
  const { w, h, skin: s, shape } = boss;

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

  drawAppendage(ctx, shape, s, x, y, w, h, frame);

  // Body: a chunky rounded blob with a darker base. The machine reads boxier
  // (the base ellipse is skipped so its rectangular chassis shows).
  if (shape !== 'machine') {
    ctx.fillStyle = s.bodyLo;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.5, h * 0.42, 0, 0, 7);
    ctx.fill();
  }
  rect(ctx, x + 6, y + h * 0.28, w - 12, h * 0.5, s.bodyDk);
  rect(ctx, x + 10, y + h * 0.24, w - 20, h * 0.5, s.body);
  rect(ctx, x + 10, y + h * 0.24, w - 20, 8, s.accent);

  // SPECTRA's live-wire glow: a pulsing white-hot core + orbiting spark nodes.
  if (shape === 'wire') {
    const pulse = 0.5 + Math.sin(frame * 0.3) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.5, 5 + pulse * 4, 7 + pulse * 4, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.08 + i * ((Math.PI * 2) / 3);
      const ox = x + w / 2 + Math.cos(a) * (w * 0.46);
      const oy = y + h * 0.5 + Math.sin(a) * (h * 0.4);
      rect(ctx, ox - 3, oy - 3, 6, 6, s.accent);
    }
  }

  drawHead(ctx, shape, s, x, y, w, h, frame);

  // Eyes: glaring, blink occasionally.
  const blink = frame % 150 < 8;
  const eh = blink ? 2 : 10;
  rect(ctx, x + w * 0.3 - 5, y + h * 0.4, 10, eh, s.eye);
  rect(ctx, x + w * 0.7 - 5, y + h * 0.4, 10, eh, s.eye);
  if (!blink) {
    rect(ctx, x + w * 0.3 - 2, y + h * 0.4 + 2, 4, 5, '#ffffff');
    rect(ctx, x + w * 0.7 - 2, y + h * 0.4 + 2, 4, 5, '#ffffff');
  }
  // Jagged mouth.
  rect(ctx, x + w * 0.32, y + h * 0.58, w * 0.36, 5, s.bodyLo);

  // Hurt flash: a brief white wash over the body.
  if (boss.hurtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    rect(ctx, x + 8, y + h * 0.18, w - 16, h * 0.6, '#ffffff');
    ctx.restore();
  }
}
