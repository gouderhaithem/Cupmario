// Parallax background, driven entirely by the biome's ThemeVisual (see themes.ts):
// sky gradient, an optional celestial body, stars/clouds, and one of three
// backdrop styles — rolling hills, cavern crystals, or foundry girders.

import { VIEW_H, VIEW_W } from '../game/constants';
import { rect } from './sprites';
import { drawBackgroundInk } from './sprites/cuphead/background';
import { isCuphead } from './style-ctx';
import { themeVisual } from './themes';
import type { ThemeVisual } from './themes';
import type { Theme } from '../types';

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  rect(ctx, x, y + 14, 86, 20, color);
  rect(ctx, x + 14, y, 56, 26, color);
  rect(ctx, x + 34, y - 8, 30, 22, color);
}

/** Rolling quadratic hills (day/night) — far layer then near layer. */
function drawHills(ctx: CanvasRenderingContext2D, t: ThemeVisual, camX: number): void {
  ctx.fillStyle = t.far;
  const off2 = (camX * 0.3) % 520;
  for (let i = -1; i < 4; i++) {
    const hx = i * 520 - off2;
    ctx.beginPath();
    ctx.moveTo(hx, 470);
    ctx.quadraticCurveTo(hx + 160, 300, hx + 320, 470);
    ctx.fill();
  }
  ctx.fillStyle = t.near;
  const off1 = (camX * 0.55) % 420;
  for (let i = -1; i < 5; i++) {
    const hx = i * 420 - off1;
    ctx.beginPath();
    ctx.moveTo(hx, 480);
    ctx.quadraticCurveTo(hx + 120, 360, hx + 240, 480);
    ctx.fill();
  }
}

/** Jagged rock silhouette (peaks pointing up). */
function rockRow(ctx: CanvasRenderingContext2D, color: string, baseY: number, step: number, h: number, off: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-step, baseY);
  for (let x = -step; x < VIEW_W + step; x += step) {
    ctx.lineTo(x + step / 2 - off, baseY - h);
    ctx.lineTo(x + step - off, baseY);
  }
  ctx.lineTo(VIEW_W + step, baseY);
  ctx.lineTo(VIEW_W + step, VIEW_H);
  ctx.lineTo(-step, VIEW_H);
  ctx.fill();
}

/** A glowing crystal cluster (diamond shards) at (x, y). */
function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const [dx, sc] of [[-s, 0.8], [s * 0.6, 1], [0, 0.6]] as const) {
    const h = s * 2.2 * sc;
    const w = s * 0.7 * sc;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + dx, y - h);
    ctx.lineTo(x + dx + w, y - h * 0.45);
    ctx.lineTo(x + dx, y);
    ctx.lineTo(x + dx - w, y - h * 0.45);
    ctx.fill();
  }
  ctx.restore();
}

/** Cavern backdrop: stalactite ceiling, dark rock layers, glowing crystals. */
function drawCrystals(ctx: CanvasRenderingContext2D, t: ThemeVisual, camX: number, frame: number): void {
  // Ceiling stalactites (downward rock teeth).
  ctx.fillStyle = t.far;
  const co = (camX * 0.2) % 120;
  for (let x = -120; x < VIEW_W + 120; x += 120) {
    const hx = x - co;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx + 60, 0);
    ctx.lineTo(hx + 30, 60 + ((x / 120) % 3) * 18);
    ctx.fill();
  }
  rockRow(ctx, t.far, 480, 360, 150, (camX * 0.3) % 360);
  rockRow(ctx, t.near, 500, 280, 120, (camX * 0.55) % 280);
  // Crystal clusters glinting on the near rock.
  const glow = (frame % 90) < 45 ? 1 : 0.7;
  ctx.save();
  ctx.globalAlpha = glow;
  const cof = (camX * 0.55) % 560;
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 280 - cof) % 1120 + 1120) % 1120 - 60;
    crystal(ctx, cx, 470, 12 + (i % 3) * 4, t.accent);
  }
  ctx.restore();
}

/** Foundry backdrop: receding girder columns with rivets + a hazard glow strip. */
function drawGirders(ctx: CanvasRenderingContext2D, t: ThemeVisual, camX: number, frame: number): void {
  // Far haze band where machinery sits.
  rect(ctx, 0, 360, VIEW_W, VIEW_H - 360, t.far);
  // Vertical girders (near layer), scrolling.
  const off = (camX * 0.4) % 200;
  for (let x = -200; x < VIEW_W + 200; x += 200) {
    const gx = x - off;
    rect(ctx, gx, 120, 26, VIEW_H - 120, t.near);
    rect(ctx, gx + 4, 120, 4, VIEW_H - 120, 'rgba(255,255,255,0.06)');
    for (let ry = 150; ry < VIEW_H; ry += 40) {
      rect(ctx, gx + 8, ry, 5, 5, t.far);
      rect(ctx, gx + 16, ry, 5, 5, t.far);
    }
    // A pulsing hazard light near the top of each girder.
    const lit = (frame + x) % 120 < 60;
    rect(ctx, gx + 9, 132, 8, 8, lit ? t.accent : 'rgba(255,138,44,0.25)');
  }
  // Cross-beam silhouette across the upper third.
  rect(ctx, 0, 150, VIEW_W, 16, t.near);
}

export function drawBackground(ctx: CanvasRenderingContext2D, theme: Theme, camX: number, frame: number): void {
  if (isCuphead()) return drawBackgroundInk(ctx, theme, camX, frame);
  const t = themeVisual(theme);

  // Sky gradient.
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, t.sky[0]);
  grd.addColorStop(1, t.sky[1]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Twinkling stars (night).
  if (t.stars) {
    ctx.fillStyle = t.accent;
    const so = camX * 0.1;
    for (let i = 0; i < 44; i++) {
      const sx = ((((i * 137.5 - so) % 1000) + 1000) % 1000) - 20;
      const sy = ((i * 53) % 240) + 16;
      const tw = (frame + i * 9) % 110 < 55 ? 3 : 2;
      ctx.fillRect(sx, sy, tw, tw);
    }
  }

  // Celestial body.
  if (t.celestial === 'moon') {
    rect(ctx, 806, 46, 66, 66, '#eef1ff');
    rect(ctx, 820, 60, 38, 38, '#ccd6ff');
    rect(ctx, 838, 56, 14, 14, '#aeb9e8');
  } else if (t.celestial === 'sun') {
    rect(ctx, 820, 50, 60, 60, '#fff0a8');
    rect(ctx, 834, 64, 32, 32, '#ffd94a');
  }

  // Parallax backdrop.
  if (t.backdrop === 'hills') drawHills(ctx, t, camX);
  else if (t.backdrop === 'crystals') drawCrystals(ctx, t, camX, frame);
  else drawGirders(ctx, t, camX, frame);

  // Drifting clouds (skies that have them).
  if (t.clouds) {
    const off3 = (camX * 0.18) % 700;
    cloud(ctx, 120 - off3, 90, t.cloudColor);
    cloud(ctx, 520 - off3, 60, t.cloudColor);
    cloud(ctx, 760 - off3, 130, t.cloudColor);
    cloud(ctx, 120 - off3 + 700, 90, t.cloudColor);
    cloud(ctx, 520 - off3 + 700, 60, t.cloudColor);
  }
}
