// Rubber-hose "ink" toolkit — the 1930s cartoon look (Cuphead style).
//
// Everything here draws CURVES with a thick black ink outline, the opposite of
// the crisp pixel rectangles in sprites/util.ts. Three ideas carry the style:
//   1. Bulbous, rounded forms (ellipses + rounded rects, never hard corners).
//   2. A heavy dark ink stroke around every filled shape.
//   3. "Boiling" lines — the whole shape jitters a sub-pixel few times a second,
//      so the art feels hand-drawn and alive (frozen under reduced motion).
//
// All gameplay colors still come from constants/theme palettes; this module only
// adds the INK constants (the outline + a muted vintage paper/ink set) so there
// are no magic color literals sprinkled through the cuphead sprite modules.

/** Warm near-black ink for every outline + a default stroke weight. */
export const INK = '#23160f';
export const INK_W = 3;

/** Vintage paper/ink accents used by the cuphead world art (tiles, bg, props). */
export const PAPER = {
  // Golden-hour sky (warm cream → amber → hazy gold) — vivid, not muddy.
  bgTop: '#ffe7bf',
  skyMid: '#f7cd8c',
  bgBottom: '#e6ad6a',
  // Sun + its soft halo.
  sun: '#ffe487',
  sunGlow: '#fff0b0',
  // Atmospheric far ridge (cool mauve) — the depth cue behind the green hills.
  ridge: '#b9a8bd',
  ridgeTree: '#9c89a3',
  // Rolling green hills (saturated, with a darker shade for texture stripes).
  hillFar: '#a9c46c',
  hillFarDk: '#8caa54',
  hillNear: '#83ab48',
  hillNearDk: '#5f8a30',
  // Earthy ground + brick inks (richer, higher contrast).
  ground: '#d29f57',
  groundDk: '#a3742f',
  groundSpeck: '#b6863f',
  grass: '#8fbe44',
  grassDk: '#5f8a2e',
  brick: '#dca866',
  brickDk: '#9c6c38',
  // Shared whites/darks for eyes + shading.
  white: '#fbf3dd',
  shadow: 'rgba(35,22,15,0.22)',
} as const;

/**
 * Deterministic sub-pixel boil offset. Steps through 3 states a few times a
 * second (classic "on twos/threes" animation cadence) rather than per frame, so
 * lines shiver instead of vibrating. `seed` decorrelates shapes; returns zero
 * when boil is off (reduced motion) so the art holds perfectly still.
 */
export function boilOffset(frame: number, seed: number, on: boolean): { dx: number; dy: number } {
  if (!on) return { dx: 0, dy: 0 };
  const step = Math.floor(frame / 5) % 3;
  const h = Math.sin((seed * 12.9898 + step * 78.233) * 43.7) * 0.5 + 0.5; // 0..1 hash
  return { dx: (h - 0.5) * 1.5, dy: ((h * 6.0) % 1 - 0.5) * 1.5 };
}

export interface InkOpts {
  /** Current frame (drives boil). */
  frame: number;
  /** Whether boil is active (false → still). */
  boil: boolean;
  /** Per-shape seed so neighbouring shapes don't wobble in lockstep. */
  seed?: number;
  /** Outline color (default INK) and width (default INK_W); width 0 skips the stroke. */
  ink?: string;
  lw?: number;
}

/**
 * Core: trace a path with `build`, fill it, then stroke a boiling ink outline.
 * Translating the whole shape by the boil offset is a cheap, convincing wobble
 * at this scale (fill + outline move together as one shivering cut-out).
 */
export function inkPath(
  ctx: CanvasRenderingContext2D,
  build: (ctx: CanvasRenderingContext2D) => void,
  fill: string,
  opts: InkOpts,
): void {
  const { dx, dy } = boilOffset(opts.frame, opts.seed ?? 0, opts.boil);
  ctx.save();
  ctx.translate(dx, dy);
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  const lw = opts.lw ?? INK_W;
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = opts.ink ?? INK;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/** A filled, outlined ellipse. */
export function inkEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  opts: InkOpts,
): void {
  inkPath(ctx, (c) => c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2), fill, opts);
}

/** A filled, outlined rounded rectangle (the bulbous "bean" building block). */
export function inkRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  opts: InkOpts,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  inkPath(ctx, (c) => roundRectPath(c, x, y, w, h, rr), fill, opts);
}

/** Trace a rounded-rect path (no fill/stroke) — used by inkRoundRect + callers. */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A filled, outlined triangle (shards, spikes, fins) with rounded joins. */
export function inkTri(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  fill: string,
  opts: InkOpts,
): void {
  inkPath(
    ctx,
    (c) => {
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.lineTo(cx, cy);
      c.closePath();
    },
    fill,
    opts,
  );
}

/**
 * A "hose" limb: a fat capsule from (x1,y1) to (x2,y2). Arms and legs in the
 * rubber-hose style are boneless tubes, so a thick round-capped stroke reads as
 * a filled, outlined limb in two cheap strokes (ink underlay + color core).
 */
export function inkHose(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thick: number,
  fill: string,
  opts: InkOpts,
): void {
  const { dx, dy } = boilOffset(opts.frame, opts.seed ?? 0, opts.boil);
  ctx.save();
  ctx.translate(dx, dy);
  ctx.lineCap = 'round';
  // Ink underlay (slightly fatter) then the colored core on top.
  ctx.strokeStyle = opts.ink ?? INK;
  ctx.lineWidth = thick + (opts.lw ?? INK_W) * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = thick;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * A classic cartoon eye: white capsule/circle with an outline and a dark pupil
 * shifted toward `look` (-1 left … +1 right). Cheap expressiveness without a
 * full face rig.
 */
export function pieEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  look: number,
  opts: InkOpts,
): void {
  inkEllipse(ctx, cx, cy, r, r * 1.18, PAPER.white, opts);
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(cx + look * r * 0.45, cy + r * 0.15, r * 0.5, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A soft, outline-less highlight blob — fakes the cel-shaded sheen on a form. */
export function softHi(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  alpha = 0.5,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A grounded contact shadow (flat ink ellipse) under a character's feet. */
export function inkShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number): void {
  ctx.save();
  ctx.fillStyle = PAPER.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, rx * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
