// Cuphead-style parallax backdrop, now PER-BIOME (see ./theme.ts). The look's
// depth always comes from STACKED layers, each cooler/hazier the farther back it
// sits (atmospheric perspective), but the palette + backdrop kind switch with the
// level's theme: a golden meadow, moonlit hills, a glowing cavern, or a smoky
// foundry. The sepia grade in overlays then ties every biome together. Nothing
// here boils — the world holds steady.

import { VIEW_H, VIEW_W } from '../../../game/constants';
import type { Theme } from '../../../types';
import { INK, PAPER } from '../../ink';
import { inkTheme } from './theme';
import type { InkTheme } from './theme';

/** Trace one rolling ridge as quadratic humps; returns without painting. */
function ridgePath(ctx: CanvasRenderingContext2D, baseY: number, step: number, peak: number, off: number): void {
  ctx.beginPath();
  ctx.moveTo(-step, VIEW_H);
  ctx.lineTo(-step, baseY);
  for (let x = -step; x < VIEW_W + step; x += step) {
    ctx.quadraticCurveTo(x + step / 2 - off, baseY - peak, x + step - off, baseY);
  }
  ctx.lineTo(VIEW_W + step, VIEW_H);
  ctx.closePath();
}

/** A filled, ink-outlined hill ridge. */
function hillRow(ctx: CanvasRenderingContext2D, color: string, baseY: number, step: number, peak: number, off: number): void {
  ridgePath(ctx, baseY, step, peak, off);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/**
 * A puffy cloud: a union of overlapping lobes filled as ONE solid shape. We do
 * NOT stroke (it would outline each lobe as rings); a darker rim lobe drawn
 * first fakes the bottom contour, and a clipped underside shadow cel-shades it.
 */
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, body: string, shade: string): void {
  const lobes: Array<[number, number, number, number]> = [
    [x, y, 32, 19],
    [x + 28, y + 5, 23, 15],
    [x - 26, y + 6, 21, 14],
    [x + 6, y + 10, 30, 13],
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(40,30,55,0.4)';
  ctx.beginPath();
  for (const [lx, ly, rx, ry] of lobes) ctx.ellipse(lx, ly + 2.5, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  for (const [lx, ly, rx, ry] of lobes) ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(x, y + 17, 42, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A simple lollipop tree silhouette for the far ridge (flat, no outline). */
function farTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.12, baseY - s * 1.1, s * 0.24, s * 1.1);
  ctx.beginPath();
  ctx.ellipse(x, baseY - s * 1.25, s * 0.6, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Paint the sky gradient + celestial body shared by every biome. */
function drawSky(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number): void {
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, t.sky[0]);
  grd.addColorStop(0.55, t.sky[1]);
  grd.addColorStop(1, t.sky[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Twinkling stars (night).
  if (t.stars) {
    ctx.save();
    const so = camX * 0.08;
    for (let i = 0; i < 50; i++) {
      const sx = ((((i * 137.5 - so) % 1040) + 1040) % 1040) - 20;
      const sy = ((i * 53) % 250) + 14;
      ctx.globalAlpha = (frame + i * 9) % 130 < 65 ? 0.9 : 0.4;
      ctx.fillStyle = t.accent;
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    ctx.restore();
  }

  if (t.celestial === 'sun') {
    ctx.save();
    const sunX = 792 - ((camX * 0.05) % 60);
    const sunY = 110;
    const halo = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 200);
    halo.addColorStop(0, 'rgba(255,240,176,0.85)');
    halo.addColorStop(1, 'rgba(255,240,176,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    ctx.translate(sunX, sunY);
    ctx.rotate((camX * 0.0006) % (Math.PI * 2));
    ctx.fillStyle = 'rgba(255,224,135,0.5)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(7, -150);
      ctx.lineTo(-7, -150);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fillStyle = PAPER.sun;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  } else if (t.celestial === 'moon') {
    ctx.save();
    const mx = 800 - ((camX * 0.05) % 60);
    const my = 104;
    const halo = ctx.createRadialGradient(mx, my, 24, mx, my, 150);
    halo.addColorStop(0, 'rgba(231,222,250,0.55)');
    halo.addColorStop(1, 'rgba(231,222,250,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 150, my - 150, 300, 300);
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#eef1ff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    // A few craters.
    ctx.fillStyle = 'rgba(170,180,220,0.6)';
    for (const [dx, dy, rr] of [[-14, -8, 8], [12, 6, 10], [4, -16, 6]] as const) {
      ctx.beginPath();
      ctx.arc(mx + dx, my + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Rolling hills backdrop (day / night): far ridge, clouds, two textured bands. */
function drawHills(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number): void {
  // Far atmospheric ridge with distant tree clumps.
  ctx.save();
  const rOff = (camX * 0.16) % 360;
  ridgePath(ctx, 430, 360, 70, rOff);
  ctx.fillStyle = t.ridge;
  ctx.fill();
  ctx.clip();
  for (let x = -100; x < VIEW_W + 100; x += 96) {
    farTree(ctx, x - rOff * 0.5, 412, 26, t.ridgeTree);
  }
  ctx.restore();

  if (t.clouds) {
    ctx.save();
    const co = (camX * 0.22) % 820;
    const body = t.celestial === 'moon' ? '#cdc6ec' : '#fffdf4';
    for (const [cxBase, cy] of [[180, 110], [560, 70], [900, 140], [180 + 820, 110], [560 + 820, 70]] as const) {
      puff(ctx, cxBase - co, cy, body, t.sky[1]);
    }
    ctx.restore();
  }

  // Two layers of rolling ink hills, the near one striped.
  ctx.save();
  hillRow(ctx, t.hillFar, 470, 520, 170, (camX * 0.32) % 520);
  ridgePath(ctx, 470, 520, 170, (camX * 0.32) % 520);
  ctx.clip();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = t.hillFarDk;
  ctx.fillRect(0, 478, VIEW_W, VIEW_H);
  ctx.restore();

  ctx.save();
  hillRow(ctx, t.hillNear, 504, 420, 130, (camX * 0.55) % 420);
  ridgePath(ctx, 504, 420, 130, (camX * 0.55) % 420);
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = t.hillNearDk;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let x = -40; x < VIEW_W + 40; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 500);
    ctx.lineTo(x - 16, 540);
    ctx.stroke();
  }
  ctx.restore();
}

/** One outlined crystal shard cluster glowing on the cavern floor. */
function crystalCluster(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, t: InkTheme, frame: number): void {
  const glow = 0.55 + Math.sin((frame + x) * 0.06) * 0.35;
  ctx.save();
  ctx.globalAlpha = glow * 0.5;
  const halo = ctx.createRadialGradient(x, baseY - s, s * 0.3, x, baseY - s, s * 2.2);
  halo.addColorStop(0, t.accent);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - s * 2.2, baseY - s * 2.6, s * 4.4, s * 3.2);
  ctx.restore();
  for (const [dx, sc] of [[-s * 0.8, 0.8], [s * 0.5, 1], [0, 0.6]] as const) {
    const hh = s * 2.2 * sc;
    const ww = s * 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(x + dx, baseY - hh);
    ctx.lineTo(x + dx + ww, baseY - hh * 0.45);
    ctx.lineTo(x + dx, baseY);
    ctx.lineTo(x + dx - ww, baseY - hh * 0.45);
    ctx.closePath();
    ctx.fillStyle = t.accent;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Cavern backdrop: stalactite ceiling, dark rock ridges, glowing crystals. */
function drawCavern(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number): void {
  // Ceiling stalactites (downward rounded teeth).
  ctx.save();
  const co = (camX * 0.2) % 130;
  ctx.fillStyle = t.hillFar;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  for (let x = -130; x < VIEW_W + 130; x += 130) {
    const hx = x - co;
    const drop = 50 + ((Math.abs(x) / 130) % 3) * 22;
    ctx.beginPath();
    ctx.moveTo(hx, -4);
    ctx.lineTo(hx + 65, -4);
    ctx.quadraticCurveTo(hx + 40, drop * 0.7, hx + 32, drop);
    ctx.quadraticCurveTo(hx + 24, drop * 0.7, hx, -4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Two dark rock ridges receding into the gloom.
  hillRow(ctx, t.hillFar, 466, 360, 150, (camX * 0.3) % 360);
  hillRow(ctx, t.hillNear, 502, 280, 120, (camX * 0.55) % 280);

  // Crystal clusters glinting along the near rock.
  const cof = (camX * 0.55) % 560;
  for (let i = 0; i < 5; i++) {
    const cx = (((i * 280 - cof) % 1120) + 1120) % 1120 - 80;
    crystalCluster(ctx, cx, 500, 12 + (i % 3) * 4, t, frame);
  }
}

/** Foundry backdrop: a smog band, riveted girder columns, ember motes. */
function drawFoundry(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number): void {
  // Far smog/haze band.
  ctx.fillStyle = t.hillFar;
  ctx.fillRect(0, 360, VIEW_W, VIEW_H - 360);

  // Riveted girder columns (near layer), scrolling, ink-outlined.
  ctx.save();
  const off = (camX * 0.4) % 220;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  for (let x = -220; x < VIEW_W + 220; x += 220) {
    const gx = x - off;
    ctx.fillStyle = t.hillNear;
    ctx.fillRect(gx, 120, 30, VIEW_H - 120);
    ctx.strokeRect(gx, 120, 30, VIEW_H - 120);
    ctx.fillStyle = INK;
    for (let ry = 150; ry < VIEW_H; ry += 42) {
      ctx.beginPath();
      ctx.arc(gx + 9, ry, 2.5, 0, Math.PI * 2);
      ctx.arc(gx + 21, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // A pulsing hazard lamp atop each girder.
    const lit = (frame + x) % 120 < 60;
    ctx.fillStyle = lit ? t.accent : 'rgba(255,138,44,0.25)';
    ctx.beginPath();
    ctx.arc(gx + 15, 132, 6, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(gx + 15, 132, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // Cross-beam silhouette across the upper third.
  ctx.fillStyle = t.hillNear;
  ctx.fillRect(0, 150, VIEW_W, 18);
  ctx.strokeRect(0, 150, VIEW_W, 18);
  ctx.restore();

  // Rising ember motes.
  ctx.save();
  ctx.fillStyle = t.accent;
  for (let i = 0; i < 22; i++) {
    const ex = (((i * 151.3 - camX * 0.2) % VIEW_W) + VIEW_W) % VIEW_W;
    const ey = VIEW_H - ((frame * 0.8 + i * 60) % VIEW_H);
    ctx.globalAlpha = 0.3 + ((i * 7 + frame) % 30) / 60;
    ctx.fillRect(ex, ey, 2, 2);
  }
  ctx.restore();
}

export function drawBackgroundInk(ctx: CanvasRenderingContext2D, theme: Theme, camX: number, frame: number): void {
  const t = inkTheme(theme);
  drawSky(ctx, t, camX, frame);
  if (t.backdrop === 'hills') drawHills(ctx, t, camX);
  else if (t.backdrop === 'crystals') drawCavern(ctx, t, camX, frame);
  else drawFoundry(ctx, t, camX, frame);
}
