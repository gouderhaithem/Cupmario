// Parallax background: day (blue sky, sun, green hills) and night (dark sky,
// stars, moon, darker hills). Layers scroll at fractions of camera X.

import { VIEW_H, VIEW_W } from '../game/constants';
import { rect } from './sprites';
import type { Theme } from '../types';

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  rect(ctx, x, y + 14, 86, 20, color);
  rect(ctx, x + 14, y, 56, 26, color);
  rect(ctx, x + 34, y - 8, 30, 22, color);
}

export function drawBackground(ctx: CanvasRenderingContext2D, theme: Theme, camX: number, frame: number): void {
  const night = theme === 'night';

  // sky gradient
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (night) {
    grd.addColorStop(0, '#141433');
    grd.addColorStop(1, '#3a2a55');
  } else {
    grd.addColorStop(0, '#7ec0ff');
    grd.addColorStop(1, '#bfe6ff');
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (night) {
    // twinkling stars
    ctx.fillStyle = '#fff7d6';
    const so = camX * 0.1;
    for (let i = 0; i < 44; i++) {
      const sx = ((((i * 137.5 - so) % 1000) + 1000) % 1000) - 20;
      const sy = ((i * 53) % 240) + 16;
      const tw = (frame + i * 9) % 110 < 55 ? 3 : 2;
      ctx.fillRect(sx, sy, tw, tw);
    }
    // moon
    rect(ctx, 806, 46, 66, 66, '#eef1ff');
    rect(ctx, 820, 60, 38, 38, '#ccd6ff');
    rect(ctx, 838, 56, 14, 14, '#aeb9e8');
  } else {
    // sun
    rect(ctx, 820, 50, 60, 60, '#fff0a8');
    rect(ctx, 834, 64, 32, 32, '#ffd94a');
  }

  // far hills
  ctx.fillStyle = night ? '#3a5247' : '#9ad17a';
  const off2 = (camX * 0.3) % 520;
  for (let i = -1; i < 4; i++) {
    const hx = i * 520 - off2;
    ctx.beginPath();
    ctx.moveTo(hx, 470);
    ctx.quadraticCurveTo(hx + 160, 300, hx + 320, 470);
    ctx.fill();
  }

  // near hills
  ctx.fillStyle = night ? '#283d31' : '#7bbf5c';
  const off1 = (camX * 0.55) % 420;
  for (let i = -1; i < 5; i++) {
    const hx = i * 420 - off1;
    ctx.beginPath();
    ctx.moveTo(hx, 480);
    ctx.quadraticCurveTo(hx + 120, 360, hx + 240, 480);
    ctx.fill();
  }

  // clouds
  const cloudColor = night ? 'rgba(180,185,225,0.5)' : '#ffffff';
  const off3 = (camX * 0.18) % 700;
  cloud(ctx, 120 - off3, 90, cloudColor);
  cloud(ctx, 520 - off3, 60, cloudColor);
  cloud(ctx, 760 - off3, 130, cloudColor);
  cloud(ctx, 120 - off3 + 700, 90, cloudColor);
  cloud(ctx, 520 - off3 + 700, 60, cloudColor);
}
