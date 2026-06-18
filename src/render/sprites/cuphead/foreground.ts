// Near foreground plane — the depth-of-field trick that makes Cuphead feel 3D.
// Out-of-focus silhouettes (foliage clumps for the meadow/night, jagged rock for
// the cavern, pipework for the foundry) scroll FASTER than the world and sit in
// front of the player, darkened and slightly soft. A faster mote stream blows
// across on top. Drawn in screen space (after the camera restore) so it tracks
// camX directly; the sepia grade in overlays paints over it too, tying it in.

import { VIEW_H, VIEW_W } from '../../../game/constants';
import type { Theme } from '../../../types';
import { sway } from '../../ink';
import { inkTheme } from './theme';
import type { InkTheme } from './theme';

// The near plane scrolls slightly faster than the 1:1 world for parallax.
const FG_SCROLL = 1.18;

/** A bushy clump of grass blades + a rounded mound (meadow / night hills). */
function foliage(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, frame: number, seed: number): void {
  const lean = sway(frame, 80, 5, seed * 0.3);
  ctx.beginPath();
  ctx.ellipse(x, baseY, s * 1.1, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // A fan of blades leaning in the breeze.
  for (let i = -3; i <= 3; i++) {
    const bx = x + i * s * 0.26;
    const tip = baseY - s * (1.3 + (i % 2 === 0 ? 0.3 : 0));
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.12, baseY);
    ctx.quadraticCurveTo(bx + lean * 0.5, (baseY + tip) / 2, bx + lean, tip);
    ctx.quadraticCurveTo(bx + lean * 0.5, (baseY + tip) / 2, bx + s * 0.12, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

/** A jagged rock/pipe shard rising from the bottom edge (cavern / foundry). */
function shard(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - s, baseY);
  ctx.lineTo(x - s * 0.4, baseY - s * 1.9);
  ctx.lineTo(x + s * 0.2, baseY - s * 1.1);
  ctx.lineTo(x + s * 0.9, baseY - s * 2.3);
  ctx.lineTo(x + s * 1.4, baseY);
  ctx.closePath();
  ctx.fill();
}

/** Big, blurred motes blowing across the very front (depth-of-field bokeh). */
function frontMotes(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number): void {
  const warm = t.ambient === 'embers';
  const tint = warm ? '255,150,70' : t.ambient === 'fireflies' ? '231,222,250' : '255,236,244';
  for (let i = 0; i < 9; i++) {
    const span = VIEW_W + 200;
    const drift = warm ? -frame * 1.4 : frame * 1.1;
    const mx = (((i * 233.1 - camX * FG_SCROLL + drift) % span) + span) % span - 100;
    const my = warm
      ? VIEW_H - ((frame * 1.6 + i * 90) % (VIEW_H + 80))
      : 60 + (i * 71) % (VIEW_H - 80) + sway(frame, 60 + i * 9, 30, i);
    const r = 7 + (i % 3) * 5;
    ctx.globalAlpha = 0.16;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
    g.addColorStop(0, `rgba(${tint},0.9)`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawForegroundInk(ctx: CanvasRenderingContext2D, theme: Theme, camX: number, frame: number): void {
  const t = inkTheme(theme);
  const off = (camX * FG_SCROLL) % 480;
  const bushy = t.backdrop === 'hills';

  ctx.save();
  // Darkened, slightly translucent silhouettes read as "too close to focus".
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = t.fg;
  let i = 0;
  for (let x = -240; x < VIEW_W + 240; x += 240) {
    const fx = x - off;
    if (bushy) {
      foliage(ctx, fx, VIEW_H + 24, 54, frame, i);
      foliage(ctx, fx + 120, VIEW_H + 40, 40, frame, i + 7);
    } else {
      shard(ctx, fx, VIEW_H + 10, 44);
      shard(ctx, fx + 130, VIEW_H + 20, 30);
    }
    i++;
  }
  ctx.restore();

  ctx.save();
  frontMotes(ctx, t, camX, frame);
  ctx.restore();
}
