// Boss, rubber-hose (Cuphead) style. The three silhouettes (tree / rock golem /
// ice spire) mirror the pixel boss but rebuilt from ink-outlined curves + boil.
// Colors all come from boss.skin; boss.shape swaps the whole form.

import { TILE } from '../../../game/constants';
import type { Boss, BossSkin } from '../../../types';
import { INK, PAPER, boilOffset, inkEllipse, inkRoundRect, inkTri, roundRectPath, softHi } from '../../ink';

/** A colored, outlined boss eye with a white glint and a periodic blink. */
function bossEyes(
  ctx: CanvasRenderingContext2D,
  s: BossSkin,
  cx: number,
  ey: number,
  gap: number,
  frame: number,
  o: { frame: number; boil: boolean },
  steady = false,
): void {
  const blink = !steady && frame % 150 < 8;
  for (const dx of [-gap, gap]) {
    if (blink) {
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + dx - 5, ey);
      ctx.lineTo(cx + dx + 5, ey);
      ctx.stroke();
      ctx.restore();
    } else {
      inkEllipse(ctx, cx + dx, ey, 5, 6, s.eye, { ...o, seed: dx });
      softHi(ctx, cx + dx + 1.5, ey + 1.5, 2, 2, PAPER.white, 0.9);
    }
  }
}

/** BARKBROOD: a rooted oak — bark trunk, gripping roots, big leafy canopy. */
function drawTreeInk(ctx: CanvasRenderingContext2D, boss: Boss, x: number, y: number, w: number, h: number, frame: number, boil: boolean): void {
  const s = boss.skin;
  const o = { frame, boil };
  const lean = Math.sin(boss.swayT) * 6;
  const floor = y + h;
  const cx = x + w / 2;

  // Roots flaring onto the floor.
  for (let i = -2; i <= 2; i++) {
    const rx = cx + i * (w * 0.2);
    inkTri(ctx, rx, floor - 24, rx - 11, floor, rx + 11, floor, s.bodyDk, { ...o, seed: i });
  }
  // Trunk.
  const trunkX = x + w * 0.24;
  const trunkW = w * 0.52;
  inkRoundRect(ctx, trunkX, y + 18, trunkW, h - 16, 14, s.body, { ...o, seed: 1 });
  softHi(ctx, trunkX + 8, y + 30, 7, 18, s.accent, 0.4);
  // Bark texture: curved vertical grain grooves + a knot, clipped to the trunk.
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, trunkX, y + 18, trunkW, h - 16, 14);
  ctx.clip();
  ctx.strokeStyle = s.bodyDk;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    const gx = trunkX + (trunkW * (i + 0.6)) / 4.2;
    ctx.beginPath();
    ctx.moveTo(gx, y + 24);
    ctx.quadraticCurveTo(gx + (i % 2 ? 5 : -5), y + h * 0.5, gx, floor - 6);
    ctx.stroke();
  }
  // A bark knot low on the trunk.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = s.bodyDk;
  ctx.beginPath();
  ctx.ellipse(trunkX + trunkW * 0.68, y + h * 0.62, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.body;
  ctx.beginPath();
  ctx.ellipse(trunkX + trunkW * 0.68, y + h * 0.62, 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Knothole face.
  bossEyes(ctx, s, cx, y + 42, 13, frame, o);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const bo = boilOffset(frame, 2, boil);
  ctx.beginPath();
  ctx.arc(cx + bo.dx, y + 64 + bo.dy, 8, 1.1 * Math.PI, 1.9 * Math.PI); // frown
  ctx.stroke();
  ctx.restore();
  // Leafy canopy puffs above the box, leaning with sway.
  const canopy: Array<[number, number, number, number]> = [
    [cx + lean, y - 16, w * 0.42, 20],
    [cx - w * 0.27 + lean, y - 2, w * 0.28, 21],
    [cx + w * 0.27 + lean, y - 2, w * 0.28, 22],
    [cx + lean * 0.5, y + 6, w * 0.32, 23],
  ];
  // Darker under-layer (drawn slightly low) gives the foliage volume.
  for (const [bx, by, r] of canopy) {
    softHi(ctx, bx + r * 0.12, by + r * 0.22, r * 0.92, r * 0.78, s.bodyDk, 0.55);
  }
  for (const [bx, by, r, seed] of canopy) inkEllipse(ctx, bx, by, r, r * 0.82, s.crown, { ...o, seed });
  // Clustered leaf-shadow + sheen dabs so the crown reads as a mass of leaves,
  // not flat blobs (clipped per-puff so dabs stay inside the silhouette).
  for (const [bx, by, r] of canopy) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = s.bodyDk;
    for (let i = 0; i < 4; i++) {
      const dx = bx + (Math.sin(i * 21.3 + r) * 0.6) * r;
      const dy = by + (Math.cos(i * 13.7 + r) * 0.5) * r * 0.7 + r * 0.2;
      ctx.beginPath();
      ctx.ellipse(dx, dy, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    softHi(ctx, bx - r * 0.3, by - r * 0.3, r * 0.34, r * 0.28, '#a6e36a', 0.7);
  }
}

/** GRANITE: a boulder golem — torso + head boulders, magma cracks, crystal crown, fists. */
function drawRockInk(ctx: CanvasRenderingContext2D, boss: Boss, x: number, y: number, w: number, h: number, frame: number, boil: boolean): void {
  const s = boss.skin;
  const o = { frame, boil };
  const cx = x + w / 2;
  // Boulder fists.
  for (const fx of [x - 2, x + w - 20]) inkEllipse(ctx, fx + 11, y + h * 0.56, 13, 12, s.body, { ...o, seed: fx });
  // Torso + head boulders.
  inkRoundRect(ctx, x + 8, y + h * 0.3, w - 16, h * 0.7, 18, s.body, { ...o, seed: 1 });
  inkRoundRect(ctx, x + w * 0.26, y + 4, w * 0.48, h * 0.34, 14, s.body, { ...o, seed: 2 });
  // Rocky surface: a dark bevel down the right + pitted speckle on the torso.
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x + 8, y + h * 0.3, w - 16, h * 0.7, 18);
  ctx.clip();
  softHi(ctx, x + w * 0.5, y + h * 0.55, w * 0.42, h * 0.4, s.bodyDk, 0.4);
  softHi(ctx, x + w * 0.3, y + h * 0.42, w * 0.2, h * 0.22, s.accent, 0.18);
  ctx.fillStyle = s.bodyDk;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 9; i++) {
    const px = x + 14 + (Math.sin(i * 51.3) * 0.5 + 0.5) * (w - 28);
    const py = y + h * 0.34 + (Math.cos(i * 27.1) * 0.5 + 0.5) * (h * 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py, 2.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Crystal shards on the crown.
  inkTri(ctx, cx - 14, y + 8, cx - 20, y - 14, cx - 6, y + 6, s.crown, { ...o, seed: 3 });
  inkTri(ctx, cx, y + 6, cx - 4, y - 20, cx + 6, y + 6, s.crown, { ...o, seed: 4 });
  inkTri(ctx, cx + 14, y + 8, cx + 20, y - 12, cx + 8, y + 6, s.crown, { ...o, seed: 5 });
  // Glowing magma cracks (pulse).
  const glow = 0.55 + Math.sin(frame * 0.18) * 0.35;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 20, y + h * 0.5);
  ctx.lineTo(x + w * 0.45, y + h * 0.5);
  ctx.lineTo(x + w * 0.4, y + h * 0.74);
  ctx.moveTo(x + w - 38, y + h * 0.58);
  ctx.lineTo(x + w - 34, y + h * 0.82);
  ctx.stroke();
  ctx.restore();
  // Molten eyes + grim mouth.
  bossEyes(ctx, s, cx, y + h * 0.22, 12, frame, o);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 11, y + h * 0.33);
  ctx.lineTo(cx + 11, y + h * 0.33);
  ctx.stroke();
  ctx.restore();
}

/** RIME: an ice spire — faceted diamond core, icicle crown, glowing eyes, sparkles. */
function drawCrystalInk(ctx: CanvasRenderingContext2D, boss: Boss, x: number, y: number, w: number, h: number, frame: number, boil: boolean): void {
  const s = boss.skin;
  const o = { frame, boil };
  const cx = x + w / 2;
  const cyy = y + h * 0.52;
  const top = y + 2;
  const bot = y + h;
  // Outer shards.
  inkTri(ctx, x + 6, cyy, x + w * 0.32, y + 4, x + w * 0.34, cyy + h * 0.3, s.bodyDk, { ...o, seed: 1 });
  inkTri(ctx, x + w - 6, cyy, x + w * 0.68, y + 4, x + w * 0.66, cyy + h * 0.3, s.bodyDk, { ...o, seed: 2 });
  // Faceted core (two halves).
  inkTri(ctx, cx, top, x + w * 0.18, cyy, x + w * 0.82, cyy, s.body, { ...o, seed: 3 });
  inkTri(ctx, cx, bot, x + w * 0.18, cyy, x + w * 0.82, cyy, s.bodyDk, { ...o, seed: 4 });
  softHi(ctx, cx - w * 0.12, cyy - h * 0.08, w * 0.1, h * 0.12, s.accent, 0.55);
  // Icicle crown.
  for (let i = -1; i <= 1; i++) {
    const sxp = cx + i * (w * 0.22);
    const tall = i === 0 ? 26 : 16;
    inkTri(ctx, sxp - 7, top + 4, sxp, top - tall, sxp + 7, top + 4, s.crown, { ...o, seed: 5 + i });
  }
  // Steady glowing eyes (ice doesn't blink) + sparkles.
  bossEyes(ctx, s, cx, cyy - 10, 11, frame, o, true);
  ctx.save();
  ctx.fillStyle = PAPER.white;
  for (let i = 0; i < 4; i++) {
    if ((frame + i * 17) % 60 > 24) continue;
    const sxp = x + ((i * 29 + 13) % w);
    const syp = y + ((i * 23 + 9) % h);
    ctx.beginPath();
    ctx.arc(sxp, syp, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** THE OVERCLOCK: an airborne glitch-core — orbiting shell segments, a throbbing
 *  ink eye, pulsing magenta spokes, and a counter-spinning crown of spikes. */
function drawCoreInk(ctx: CanvasRenderingContext2D, boss: Boss, x: number, y: number, w: number, h: number, frame: number, boil: boolean): void {
  const s = boss.skin;
  const o = { frame, boil };
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = Math.min(w, h) * 0.42;
  const spin = frame * 0.04;

  // Orbiting ring of shell segments.
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * Math.PI * 2;
    inkEllipse(ctx, cx + Math.cos(a) * rad * 1.12, cy + Math.sin(a) * rad * 1.12, 6, 6, i % 2 ? s.bodyDk : s.body, { ...o, seed: i });
  }
  // Shell sphere.
  inkEllipse(ctx, cx, cy, rad, rad, s.bodyDk, { ...o, seed: 20 });
  inkEllipse(ctx, cx, cy, rad * 0.78, rad * 0.78, s.body, { ...o, seed: 21 });

  // Pulsing magenta energy spokes.
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.2) * 0.4;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = -spin * 1.3 + (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * rad * 0.74, cy + Math.sin(a) * rad * 0.74);
    ctx.stroke();
  }
  ctx.restore();

  // Throbbing single eye-core.
  const core = rad * 0.36 * (1 + Math.sin(frame * 0.25) * 0.12);
  inkEllipse(ctx, cx, cy, core, core, s.eye, { ...o, seed: 22 });
  softHi(ctx, cx - core * 0.3, cy - core * 0.3, core * 0.4, core * 0.4, PAPER.white, 0.9);

  // Counter-rotating crown of charged spikes.
  for (let i = 0; i < 3; i++) {
    const a = -spin + (i / 3) * Math.PI * 2;
    const tx = cx + Math.cos(a) * rad * 1.3;
    const ty = cy + Math.sin(a) * rad * 1.3;
    inkTri(ctx, tx - 5, ty + 6, tx, ty - 9, tx + 5, ty + 6, s.crown, { ...o, seed: 30 + i });
  }
}

export function drawBossInk(ctx: CanvasRenderingContext2D, boss: Boss, frame: number, boil: boolean): void {
  const { x, y, w, h, shape } = boss;

  // Telegraph wind-up aura.
  if (boss.telegraph > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.5) * 0.18;
    ctx.fillStyle = PAPER.white;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.72, h * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow at the floor.
  ctx.save();
  ctx.fillStyle = PAPER.shadow;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, 10 * TILE - 4, w * 0.48, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (shape === 'tree') drawTreeInk(ctx, boss, x, y, w, h, frame, boil);
  else if (shape === 'rock') drawRockInk(ctx, boss, x, y, w, h, frame, boil);
  else if (shape === 'core') drawCoreInk(ctx, boss, x, y, w, h, frame, boil);
  else drawCrystalInk(ctx, boss, x, y, w, h, frame, boil);

  // Hurt flash.
  if (boss.hurtFlash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PAPER.white;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.46, h * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
