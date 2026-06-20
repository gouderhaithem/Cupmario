// Cuphead-style parallax backdrop, PER-BIOME (see ./theme.ts) and ALIVE. The
// look's depth comes from STACKED layers, each cooler/hazier the farther back it
// sits (atmospheric perspective); the palette + backdrop kind switch with the
// level's theme: a golden meadow, moonlit hills, a glowing cavern, or a smoky
// foundry. On top of the parallax, secondary animation keeps the scene breathing
// the way a 1930s cartoon does — the sun/moon has a face that blinks and breathes,
// scenery sways in a slow breeze, detail outlines "boil", god rays slant through
// the haze, and ambient motes drift in mid-air. The sepia grade in overlays then
// ties every biome together.

import { VIEW_H, VIEW_W } from '../../../game/constants';
import type { Theme } from '../../../types';
import { glowSprite } from '../../glow';
import { boilOffset, INK, PAPER, sway } from '../../ink';
import { boilOn } from '../../style-ctx';
import { inkTheme } from './theme';
import type { InkTheme } from './theme';

// Per-theme sky gradient cache: the three sky colours are static for a biome, so
// the linear gradient is built once per theme instead of every frame.
const skyCache = new Map<InkTheme, CanvasGradient>();

// Idle-animation periods (frames) and amplitudes (px) — kept named so the breeze
// timing lives in one place rather than as magic numbers down in the draws.
const TREE_SWAY = { period: 150, amp: 4 };
const HILL_SWAY = { period: 260, amp: 7 };
const CLOUD_SQUASH = { period: 130, amp: 2.5 };
const BREATHE = { period: 90, amp: 0.05 };

/**
 * Live gameplay signals the backdrop reacts to (all 0..1, all read-only). The
 * background stays purely ambient when these are zero; they wake it up during a
 * fight so the world feels connected to the action.
 */
export interface BgReact {
  /** MEGABLAST white-flash intensity — brightens the sky + flares god rays. */
  flash: number;
  /** A decaying pulse the instant the boss takes a hit — scenery flinches. */
  hit: number;
  /** How close the boss is to death (0 full HP … 1 dead) — the world agitates. */
  low: number;
}

/** No reactivity — the default used on run levels / non-boss screens. */
const CALM: BgReact = { flash: 0, hit: 0, low: 0 };

/** This frame's boil offset for a seeded shape (zero under reduced motion). */
function boil(frame: number, seed: number): { dx: number; dy: number } {
  return boilOffset(frame, seed, boilOn());
}

/** A sharp horizontal jolt that decays with the boss-hit pulse — the flinch. */
function flinch(frame: number, react: BgReact): number {
  return Math.sin(frame * 0.9) * react.hit * 9;
}

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
 * `squash` (>1 wider, <1 taller) lets the cloud breathe as it drifts.
 */
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, body: string, shade: string, squash: number): void {
  const lobes: Array<[number, number, number, number]> = [
    [x, y, 32 * squash, 19 / squash],
    [x + 28 * squash, y + 5, 23 * squash, 15 / squash],
    [x - 26 * squash, y + 6, 21 * squash, 14 / squash],
    [x + 6, y + 10, 30 * squash, 13 / squash],
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

/**
 * A lollipop tree silhouette for the far ridge, its canopy leaning on a slow sway
 * so the distant treeline stirs in the breeze. Flat (no outline — it's far away).
 */
function farTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, color: string, lean: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.12, baseY - s * 1.1, s * 0.24, s * 1.1);
  ctx.beginPath();
  ctx.ellipse(x + lean, baseY - s * 1.25, s * 0.6, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A cute rubber-hose face — pie eyes (or a sleepy squint) + a smiling arc. */
function face(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  blink: boolean,
  sleepy: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ex = r * 0.34;
  const ey = -r * 0.12;
  if (sleepy || blink) {
    // Closed, content eyes: a pair of downward arcs.
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, cy + ey, r * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * ex, cy + ey, r * 0.12, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Rosy cheeks.
  ctx.fillStyle = 'rgba(255,120,120,0.5)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * r * 0.5, cy + r * 0.18, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Smile.
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.1, r * 0.34, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();
}

/** Warm volumetric god rays fanning down from the sun (additive, gentle pulse).
 *  `flare` (>0) momentarily intensifies them, e.g. on a MEGABLAST. */
function godRays(ctx: CanvasRenderingContext2D, sunX: number, sunY: number, frame: number, flare: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(sunX, sunY);
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI * 0.5 + (i - 2) * 0.16 + sway(frame, 220, 0.03, i * 0.2);
    const len = 560;
    const half = 26 + i * 5;
    ctx.save();
    ctx.rotate(ang);
    const grd = ctx.createLinearGradient(0, 0, 0, len);
    const a = (0.05 + (sway(frame, 110, 1, i * 0.27) + 1) * 0.018) * (1 + flare * 3);
    grd.addColorStop(0, `rgba(255,238,170,${a})`);
    grd.addColorStop(1, 'rgba(255,238,170,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(half, len);
    ctx.lineTo(-half, len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Paint the sky gradient + a living celestial body shared by every biome. */
function drawSky(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number, react: BgReact): void {
  let grd = skyCache.get(t);
  if (!grd) {
    grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, t.sky[0]);
    grd.addColorStop(0.55, t.sky[1]);
    grd.addColorStop(1, t.sky[2]);
    skyCache.set(t, grd);
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // As the boss nears death the sky smoulders — a creeping warm-red wash rising
  // from the horizon. Subtle at first, ominous by the final phase.
  if (react.low > 0) {
    ctx.save();
    ctx.globalAlpha = react.low * 0.32;
    const dg = ctx.createLinearGradient(0, VIEW_H, 0, VIEW_H * 0.3);
    dg.addColorStop(0, '#b5341c');
    dg.addColorStop(1, 'rgba(181,52,28,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

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
    const sunX = 792 - ((camX * 0.05) % 60);
    const sunY = 110;
    if (t.godRays) godRays(ctx, sunX, sunY, frame, react.flash);
    ctx.save();
    const halo = glowSprite(200, [
      [0, 'rgba(255,240,176,0.85)'],
      [0.15, 'rgba(255,240,176,0.85)'], // matches the old inner radius (30/200)
      [1, 'rgba(255,240,176,0)'],
    ]);
    ctx.drawImage(halo, sunX - 200, sunY - 200);
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
    // Breathing disc (squash/stretch on a slow sine) + a blinking face.
    const br = sway(frame, BREATHE.period, BREATHE.amp);
    const rx = 50 * (1 + br);
    const ry = 50 * (1 - br);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sunX, sunY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = PAPER.sun;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    const blink = boilOn() && frame % 200 < 9;
    face(ctx, sunX, sunY, 50, blink, false);
  } else if (t.celestial === 'moon') {
    const mx = 800 - ((camX * 0.05) % 60);
    const my = 104 + sway(frame, 200, 4); // gentle bob
    ctx.save();
    const halo = glowSprite(150, [
      [0, 'rgba(231,222,250,0.55)'],
      [0.16, 'rgba(231,222,250,0.55)'],
      [1, 'rgba(231,222,250,0)'],
    ]);
    ctx.drawImage(halo, mx - 150, my - 150);
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
    // A sleepy, content face (the moon dozes through the boss fight).
    face(ctx, mx, my, 46, false, true);
  }

  // MEGABLAST: a warm bloom floods the upper sky in time with the screen flash.
  if (react.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = react.flash * 0.55;
    const fg = ctx.createLinearGradient(0, 0, 0, VIEW_H * 0.7);
    fg.addColorStop(0, '#fff3cf');
    fg.addColorStop(1, 'rgba(255,243,207,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H * 0.7);
    ctx.restore();
  }
}

/** Rolling hills backdrop (day / night): far ridge, clouds, two textured bands. */
function drawHills(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number, react: BgReact): void {
  const jolt = flinch(frame, react);
  // Far atmospheric ridge with distant tree clumps that sway in the breeze (and
  // shudder when the boss is struck).
  ctx.save();
  const rOff = (camX * 0.16) % 360;
  ridgePath(ctx, 430, 360, 70, rOff);
  ctx.fillStyle = t.ridge;
  ctx.fill();
  ctx.clip();
  let ti = 0;
  for (let x = -100; x < VIEW_W + 100; x += 96) {
    const lean = sway(frame, TREE_SWAY.period, TREE_SWAY.amp, ti * 0.21) + jolt;
    const b = boil(frame, ti * 3.1 + 11);
    farTree(ctx, x - rOff * 0.5 + b.dx, 412 + b.dy, 26, t.ridgeTree, lean);
    ti++;
  }
  ctx.restore();

  if (t.clouds) {
    ctx.save();
    const co = (camX * 0.22) % 820;
    const body = t.celestial === 'moon' ? '#cdc6ec' : '#fffdf4';
    let ci = 0;
    for (const [cxBase, cy] of [[180, 110], [560, 70], [900, 140], [180 + 820, 110], [560 + 820, 70]] as const) {
      const squash = 1 + sway(frame, CLOUD_SQUASH.period, 0.05, ci * 0.3);
      puff(ctx, cxBase - co, cy + sway(frame, 240, CLOUD_SQUASH.amp, ci * 0.4), body, t.sky[1], squash);
      ci++;
    }
    ctx.restore();
  }

  // Two layers of rolling ink hills, each leaning on a slow sway (a breeze
  // pushing the whole ridge) so the world isn't rigid; the near one is striped.
  const farSway = sway(frame, HILL_SWAY.period, HILL_SWAY.amp) + jolt;
  const nearSway = sway(frame, HILL_SWAY.period * 0.8, HILL_SWAY.amp * 1.3, 0.3) + jolt * 1.3;
  ctx.save();
  hillRow(ctx, t.hillFar, 470, 520, 170, (camX * 0.32) % 520 + farSway);
  ridgePath(ctx, 470, 520, 170, (camX * 0.32) % 520 + farSway);
  ctx.clip();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = t.hillFarDk;
  ctx.fillRect(0, 478, VIEW_W, VIEW_H);
  ctx.restore();

  ctx.save();
  hillRow(ctx, t.hillNear, 504, 420, 130, (camX * 0.55) % 420 + nearSway);
  ridgePath(ctx, 504, 420, 130, (camX * 0.55) % 420 + nearSway);
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

/** One outlined crystal shard cluster glowing on the cavern floor (boils + glows). */
function crystalCluster(ctx: CanvasRenderingContext2D, x: number, baseY: number, s: number, t: InkTheme, frame: number): void {
  const glow = 0.55 + Math.sin((frame + x) * 0.06) * 0.35;
  ctx.save();
  ctx.globalAlpha = glow * 0.5;
  const R = s * 2.2;
  const halo = glowSprite(R, [
    [0, t.accent],
    [0.136, t.accent], // matches the old inner radius (s*0.3 / s*2.2)
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.drawImage(halo, x - R, baseY - s - R);
  ctx.restore();
  const b = boil(frame, x * 0.07);
  ctx.save();
  ctx.translate(b.dx, b.dy);
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
  ctx.restore();
}

/** Cavern backdrop: stalactite ceiling, dark rock ridges, glowing crystals. */
function drawCavern(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number, react: BgReact): void {
  const jolt = flinch(frame, react);
  // Ceiling stalactites (downward rounded teeth) — each one boils faintly and
  // rattles when the boss is hit.
  const co = (camX * 0.2) % 130;
  let si = 0;
  for (let x = -130; x < VIEW_W + 130; x += 130) {
    const hx = x - co;
    const drop = 50 + ((Math.abs(x) / 130) % 3) * 22;
    const b = boil(frame, si * 2.7 + 5);
    ctx.save();
    ctx.translate(b.dx + jolt, b.dy);
    ctx.fillStyle = t.hillFar;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, -4);
    ctx.lineTo(hx + 65, -4);
    ctx.quadraticCurveTo(hx + 40, drop * 0.7, hx + 32, drop);
    ctx.quadraticCurveTo(hx + 24, drop * 0.7, hx, -4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    si++;
  }

  // Two dark rock ridges receding into the gloom, breathing on a slow sway.
  const s1 = sway(frame, HILL_SWAY.period, HILL_SWAY.amp * 0.6) + jolt;
  const s2 = sway(frame, HILL_SWAY.period * 0.8, HILL_SWAY.amp, 0.4) + jolt * 1.3;
  hillRow(ctx, t.hillFar, 466, 360, 150, (camX * 0.3) % 360 + s1);
  hillRow(ctx, t.hillNear, 502, 280, 120, (camX * 0.55) % 280 + s2);

  // Crystal clusters glinting along the near rock.
  const cof = (camX * 0.55) % 560;
  for (let i = 0; i < 5; i++) {
    const cx = (((i * 280 - cof) % 1120) + 1120) % 1120 - 80;
    crystalCluster(ctx, cx, 500, 12 + (i % 3) * 4, t, frame);
  }
}

/** Foundry backdrop: a smog band, riveted girder columns, a pulsing hazard lamp. */
function drawFoundry(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number, react: BgReact): void {
  const jolt = flinch(frame, react);
  // Far smog/haze band.
  ctx.fillStyle = t.hillFar;
  ctx.fillRect(0, 360, VIEW_W, VIEW_H - 360);

  // Billowing smoke from the depths — it churns harder as the boss weakens.
  if (react.low > 0) {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const sx = (((i * 173.1 - camX * 0.25) % (VIEW_W + 120)) + (VIEW_W + 120)) % (VIEW_W + 120) - 60;
      const rise = (frame * (0.5 + react.low) + i * 70) % (VIEW_H * 0.6);
      const sy = VIEW_H - rise;
      const r = (26 + (i % 3) * 14) * (0.6 + react.low * 0.9);
      ctx.globalAlpha = react.low * 0.28 * (1 - rise / (VIEW_H * 0.6));
      ctx.fillStyle = '#1d1412';
      ctx.beginPath();
      ctx.arc(sx + sway(frame, 60, 10, i), sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Riveted girder columns (near layer), scrolling, ink-outlined, each boiling.
  const off = (camX * 0.4) % 220;
  let gi = 0;
  for (let x = -220; x < VIEW_W + 220; x += 220) {
    const gx = x - off;
    const b = boil(frame, gi * 4.3 + 7);
    ctx.save();
    ctx.translate(b.dx + jolt, b.dy);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
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
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(gx + 15, 132, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    gi++;
  }
  // Cross-beam silhouette across the upper third.
  const cb = boil(frame, 3);
  ctx.save();
  ctx.translate(cb.dx + jolt, cb.dy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = t.hillNear;
  ctx.fillRect(0, 150, VIEW_W, 18);
  ctx.strokeRect(0, 150, VIEW_W, 18);
  ctx.restore();
}

/**
 * Ambient mid-air motes (drift behind the play field): meadow petals, glowing
 * fireflies (night/cavern), or rising foundry embers. Looping, parallax-tied,
 * and gentle enough to stay on under reduced motion.
 */
function drawAmbient(ctx: CanvasRenderingContext2D, t: InkTheme, camX: number, frame: number, react: BgReact): void {
  if (t.ambient === 'none') return;
  // The boss's failing health (low) speeds the motes up; a MEGABLAST (flash)
  // scatters them outward from centre and brightens them for an instant.
  const energy = 1 + react.low * 1.6;
  const scatter = react.flash * 26;
  ctx.save();
  if (t.ambient === 'embers') {
    ctx.fillStyle = t.accent;
    for (let i = 0; i < 24; i++) {
      const ex = (((i * 151.3 - camX * 0.2) % VIEW_W) + VIEW_W) % VIEW_W;
      const ey = VIEW_H - ((frame * 0.8 * energy + i * 60) % VIEW_H);
      ctx.globalAlpha = Math.min(1, 0.3 + ((i * 7 + frame) % 30) / 60 + react.flash * 0.5);
      const dir = ex < VIEW_W / 2 ? -1 : 1;
      ctx.fillRect(ex + sway(frame, 40, 6, i) + dir * scatter, ey, 2, 2);
    }
  } else if (t.ambient === 'fireflies') {
    for (let i = 0; i < 18; i++) {
      const baseX = (((i * 173.7 - camX * 0.3) % (VIEW_W + 80)) + (VIEW_W + 80)) % (VIEW_W + 80) - 40;
      const dir = baseX < VIEW_W / 2 ? -1 : 1;
      const fx = baseX + sway(frame, (90 + (i % 5) * 14) / energy, 22, i * 0.13) + dir * scatter;
      const fy = 150 + (i * 47) % 320 + sway(frame, (70 + (i % 4) * 19) / energy, 16, i * 0.31);
      const pulse = (Math.sin((frame + i * 30) * 0.08) + 1) * 0.5;
      ctx.globalAlpha = Math.min(1, 0.18 + pulse * 0.45 + react.flash * 0.4);
      // Pre-rendered glow (cached by accent colour) — no per-firefly gradient.
      const halo = glowSprite(9, [
        [0, t.accent],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.drawImage(halo, fx - 9, fy - 9);
    }
  } else {
    // Petals: soft cream/pink dabs tumbling down on a diagonal drift.
    const tints = ['rgba(255,236,244,0.85)', 'rgba(255,214,228,0.8)', 'rgba(255,247,224,0.85)'];
    for (let i = 0; i < 20; i++) {
      const span = VIEW_W + 120;
      const dir = i % 2 === 0 ? -1 : 1;
      const px = (((i * 167.3 - camX * 0.3 + frame * 0.4 * energy) % span) + span) % span - 60 + dir * scatter;
      const py = ((i * 83 + frame * 0.9 * energy) % (VIEW_H + 60)) - 30;
      const r = 3 + (i % 3);
      ctx.globalAlpha = Math.min(1, 0.75 + react.flash * 0.25);
      ctx.fillStyle = tints[i % 3];
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.5, sway(frame, 50, 1, i) * 1.5 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBackgroundInk(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  camX: number,
  frame: number,
  react: BgReact = CALM,
): void {
  const t = inkTheme(theme);
  drawSky(ctx, t, camX, frame, react);
  if (t.backdrop === 'hills') drawHills(ctx, t, camX, frame, react);
  else if (t.backdrop === 'crystals') drawCavern(ctx, t, camX, frame, react);
  else drawFoundry(ctx, t, camX, frame, react);
  drawAmbient(ctx, t, camX, frame, react);
}
