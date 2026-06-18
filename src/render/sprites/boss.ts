// Boss drawing: a grounded menace whose colors + silhouette come from its skin
// and shape, so BARKBROOD (tree) / GRANITE (stone golem) / RIME (ice spire)
// read as distinct characters. Movement + attacks live in game/boss.ts; this
// only paints. Each boss stands on the arena floor (box bottom at row 10).

import { TILE } from '../../game/constants';
import type { Boss, BossSkin } from '../../types';
import { boilOn, isCuphead } from '../style-ctx';
import { drawBossInk } from './cuphead/boss';
import { rect } from './util';

/** Filled triangle helper (for roots, shards, spikes). */
function tri(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
}

/** Two glaring eyes (with a periodic blink) centered on a face band. */
function eyes(
  ctx: CanvasRenderingContext2D,
  s: BossSkin,
  cx: number,
  ey: number,
  gap: number,
  frame: number,
  steady = false,
): void {
  const blink = !steady && frame % 150 < 8;
  const eh = blink ? 2 : 9;
  for (const dx of [-gap, gap]) {
    rect(ctx, cx + dx - 5, ey, 10, eh, s.eye);
    if (!blink) rect(ctx, cx + dx - 2, ey + 2, 4, 4, '#ffffff');
  }
}

/**
 * BARKBROOD, THE ELDER OAK: a rooted tree. A gnarled trunk with a knothole face,
 * flaring roots gripping the floor, and a big leafy canopy that leans with the
 * sway. The canopy rises above the hit-box so it looms taller than it fights.
 */
function drawTree(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  const s = boss.skin;
  const lean = Math.sin(boss.swayT) * 6;
  const floor = y + h;
  const cx = x + w / 2;

  // Roots gripping the floor, flaring out past the trunk.
  for (let i = -2; i <= 2; i++) {
    const rx = cx + i * (w * 0.2);
    tri(ctx, rx, floor - 22, rx - 10, floor, rx + 10, floor, s.bodyDk);
  }

  // Trunk: a chunky bark column (dark outline, mid fill, bark grooves).
  rect(ctx, x + w * 0.22, y + 20, w * 0.56, h - 20, s.bodyDk);
  rect(ctx, x + w * 0.27, y + 22, w * 0.46, h - 24, s.body);
  for (let i = 0; i < 3; i++) {
    rect(ctx, x + w * 0.34 + i * (w * 0.14), y + 26, 3, h - 34, s.bodyDk);
  }

  // Branch arms reaching out either side.
  rect(ctx, x + w * 0.05, y + 30, w * 0.2, 7, s.bodyDk);
  rect(ctx, x + w * 0.75, y + 30, w * 0.2, 7, s.bodyDk);

  // Knothole face carved into the trunk.
  eyes(ctx, s, cx, y + 40, 13, frame);
  rect(ctx, cx - 12, y + 58, 24, 6, s.bodyLo); // frowning mouth knot

  // Leafy canopy: overlapping puffs that lean with the sway, drawn above the box.
  const canopy: Array<[number, number, number]> = [
    [cx + lean, y - 14, w * 0.4],
    [cx - w * 0.26 + lean, y - 2, w * 0.26],
    [cx + w * 0.26 + lean, y - 2, w * 0.26],
    [cx + lean * 0.5, y + 4, w * 0.3],
  ];
  for (const [bx, by, r] of canopy) {
    ctx.fillStyle = s.crown;
    ctx.beginPath();
    ctx.ellipse(bx, by, r, r * 0.82, 0, 0, 7);
    ctx.fill();
  }
  // Leaf highlights catching the light.
  ctx.fillStyle = '#7fc34f';
  for (const [bx, by, r] of canopy) {
    ctx.beginPath();
    ctx.ellipse(bx - r * 0.3, by - r * 0.3, r * 0.32, r * 0.26, 0, 0, 7);
    ctx.fill();
  }
}

/**
 * GRANITE, THE STONE WARDEN: a heavy boulder golem. A blocky torso + head with
 * glowing magma cracks that pulse, a stone brow over molten eyes, crystal shards
 * on its crown, and two boulder fists.
 */
function drawRock(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  const s = boss.skin;
  const cx = x + w / 2;

  // Boulder fists at the sides.
  for (const fx of [x - 4, x + w - 18]) {
    rect(ctx, fx, y + h * 0.46, 22, 24, s.bodyDk);
    rect(ctx, fx + 2, y + h * 0.46, 18, 18, s.body);
  }

  // Torso boulder (dark base, mid fill, lighter top facet).
  rect(ctx, x + 8, y + h * 0.32, w - 16, h * 0.68, s.bodyDk);
  rect(ctx, x + 12, y + h * 0.34, w - 24, h * 0.6, s.body);
  rect(ctx, x + 16, y + h * 0.34, w - 32, 8, s.crown);

  // Head boulder.
  rect(ctx, x + w * 0.26, y + 6, w * 0.48, h * 0.34, s.bodyDk);
  rect(ctx, x + w * 0.29, y + 8, w * 0.42, h * 0.3, s.body);

  // Crystal shards jutting from the crown.
  tri(ctx, cx - 14, y + 8, cx - 20, y - 12, cx - 6, y + 6, s.crown);
  tri(ctx, cx, y + 6, cx - 4, y - 18, cx + 6, y + 6, s.crown);
  tri(ctx, cx + 14, y + 8, cx + 20, y - 10, cx + 8, y + 6, s.crown);

  // Glowing magma cracks across the torso (pulse with frame).
  const glow = 0.55 + Math.sin(frame * 0.18) * 0.35;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = s.accent;
  rect(ctx, x + 20, y + h * 0.5, w - 44, 3, s.accent);
  rect(ctx, x + 34, y + h * 0.5, 3, h * 0.3, s.accent);
  rect(ctx, x + w - 40, y + h * 0.58, 3, h * 0.24, s.accent);
  rect(ctx, x + 22, y + h * 0.72, w * 0.4, 3, s.accent);
  ctx.restore();

  // Stone brow + molten eyes.
  rect(ctx, x + w * 0.3, y + h * 0.18, w * 0.4, 5, s.bodyLo);
  eyes(ctx, s, cx, y + h * 0.22, 12, frame);
  rect(ctx, cx - 10, y + h * 0.32, 20, 4, s.bodyLo); // grim mouth
}

/**
 * RIME, THE FROST SPIRE: a jagged ice crystal. A faceted diamond core ringed by
 * shards, a crown of sharp icicles, pale glowing eyes, and twinkling sparkles.
 * Drawn with a touch of translucency so it reads as ice.
 */
function drawCrystal(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  const s = boss.skin;
  const cx = x + w / 2;
  const cyy = y + h * 0.52;

  ctx.save();
  ctx.globalAlpha = 0.92;

  // Outer shards radiating from the core.
  tri(ctx, x + 6, cyy, x + w * 0.32, y + 4, x + w * 0.34, cyy + h * 0.3, s.bodyDk);
  tri(ctx, x + w - 6, cyy, x + w * 0.68, y + 4, x + w * 0.66, cyy + h * 0.3, s.bodyDk);
  tri(ctx, x + w * 0.5, y + h, x + w * 0.3, cyy, x + w * 0.7, cyy, s.bodyDk);

  // Faceted diamond core (dark edge, body fill, bright facet).
  const top = y + 2;
  const bot = y + h;
  tri(ctx, cx, top, x + w * 0.18, cyy, x + w * 0.82, cyy, s.body);
  tri(ctx, cx, bot, x + w * 0.18, cyy, x + w * 0.82, cyy, s.bodyDk);
  // Bright left facet catching light.
  tri(ctx, cx, top, x + w * 0.18, cyy, cx, cyy, s.accent);
  ctx.restore();

  // Crown of sharp icicles pointing up.
  for (let i = -1; i <= 1; i++) {
    const sx = cx + i * (w * 0.22);
    const tall = i === 0 ? 26 : 16;
    tri(ctx, sx - 7, top + 4, sx, top - tall, sx + 7, top + 4, s.crown);
  }

  // Pale glowing eyes on the core (steady — ice doesn't blink).
  eyes(ctx, s, cx, cyy - 12, 11, frame, true);

  // Twinkling sparkles around the crystal.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    if ((frame + i * 17) % 60 > 24) continue;
    const sx = x + ((i * 29 + 13) % w);
    const sy = y + ((i * 23 + 9) % h);
    rect(ctx, sx - 1, sy - 4, 2, 8, '#ffffff');
    rect(ctx, sx - 4, sy - 1, 8, 2, '#ffffff');
  }
}

/**
 * Paint the grounded boss: a telegraph wind-up aura, a floor shadow, the
 * shape-specific body, then a white hurt-flash wash. All colors come from
 * `boss.skin`; `boss.shape` swaps the whole silhouette.
 */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, frame: number): void {
  if (isCuphead()) return drawBossInk(ctx, boss, frame, boilOn());
  const x = boss.x;
  const y = boss.y;
  const { w, h, shape } = boss;

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

  // Ground shadow pinned at the floor.
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, 10 * TILE - 4, w * 0.48, 9, 0, 0, 7);
  ctx.fill();

  if (shape === 'tree') drawTree(ctx, boss, x, y, w, h, frame);
  else if (shape === 'rock') drawRock(ctx, boss, x, y, w, h, frame);
  else drawCrystal(ctx, boss, x, y, w, h, frame);

  // Hurt flash: a brief white wash over the body.
  if (boss.hurtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    rect(ctx, x + 6, y, w - 12, h, '#ffffff');
    ctx.restore();
  }
}
