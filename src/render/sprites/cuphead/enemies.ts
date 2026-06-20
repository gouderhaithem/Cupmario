// Enemies, rubber-hose (Cuphead) style: bulbous ink-outlined bodies with big
// cartoon eyes, mirroring the pixel enemies' kinds + tells (rotor blur, swivel
// muzzle, angry brow, hot wind-up). Colors stay from PALETTE so each foe keeps
// its read; only the geometry turns to curves.

import { PALETTE } from '../../../game/constants';
import type { Enemy } from '../../../types';
import { INK, PAPER, inkEllipse, inkHose, inkRoundRect, inkShadow, inkTri, pieEye, softHi } from '../../ink';
import { enemyVariant } from '../../style-ctx';

/**
 * Per-level headgear stamped on the round ground foes so each stage's critters
 * read as distinct: horns, antennae, a spike mohawk, a unicorn horn, or glitch
 * bits. Variant 0 (level 1) is bare. Drawn last so it sits above the head; the
 * per-level recolor filter tints it along with the body.
 */
function drawTopper(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  base: string,
  o: { frame: number; boil: boolean },
): void {
  const v = enemyVariant();
  if (v <= 0) return;
  if (v === 1) {
    inkTri(ctx, cx - 9, topY + 3, cx - 6, topY - 8, cx - 3, topY + 2, base, { ...o, seed: 11 });
    inkTri(ctx, cx + 3, topY + 2, cx + 6, topY - 8, cx + 9, topY + 3, base, { ...o, seed: 12 });
  } else if (v === 2) {
    inkHose(ctx, cx - 5, topY + 2, cx - 8, topY - 10, 2.5, base, { ...o, seed: 11 });
    inkHose(ctx, cx + 5, topY + 2, cx + 8, topY - 10, 2.5, base, { ...o, seed: 12 });
    inkEllipse(ctx, cx - 8, topY - 11, 2.6, 2.6, PALETTE.eye, { ...o, seed: 13 });
    inkEllipse(ctx, cx + 8, topY - 11, 2.6, 2.6, PALETTE.eye, { ...o, seed: 14 });
  } else if (v === 3) {
    for (let i = -1; i <= 1; i++) {
      inkTri(ctx, cx + i * 7 - 3, topY + 2, cx + i * 7, topY - 9, cx + i * 7 + 3, topY + 2, base, { ...o, seed: 11 + i });
    }
  } else if (v === 4) {
    inkTri(ctx, cx - 4, topY + 2, cx, topY - 14, cx + 4, topY + 2, base, { ...o, seed: 11 });
  } else {
    const j = (o.frame % 4) - 1.5;
    for (let i = 0; i < 3; i++) {
      const bx = cx + (i - 1) * 7 + j;
      inkRoundRect(ctx, bx - 3, topY - 8 - i, 6, 6, 1.5, i === 1 ? PALETTE.eye : base, { ...o, seed: 11 + i, lw: 1.5 });
    }
  }
}

/** A flying "Drone": round teal pod with a blurred rotor and one big eye. */
export function drawFlyerInk(ctx: CanvasRenderingContext2D, e: Enemy, frame: number, boil: boolean): void {
  const { x, y, w, h } = e;
  const o = { frame, boil };
  const cx = x + w / 2;
  const spin = frame % 6 < 3 ? 1 : -1;
  // Rotor mast + blurred blades.
  inkHose(ctx, cx, y - 2, cx, y + 4, 4, PALETTE.flyerDk, { ...o, seed: 1 });
  inkEllipse(ctx, cx + spin * 7, y - 6, 12, 3, PALETTE.flyerDk, { ...o, seed: 2 });
  // Pod body.
  inkEllipse(ctx, cx, y + h / 2 + 1, w * 0.46, h * 0.42, PALETTE.flyer, { ...o, seed: 3 });
  softHi(ctx, cx - 5, y + h * 0.3, 6, 5, '#7fd8e4', 0.6);
  // Single eye + fins.
  pieEye(ctx, cx, y + h * 0.5, 6, Math.sign(e.vx) || 1, { ...o, seed: 4 });
  inkTri(ctx, x + 2, y + h - 8, x + 10, y + h - 14, x + 12, y + h - 2, PALETTE.flyerFt, { ...o, seed: 5 });
  inkTri(ctx, x + w - 2, y + h - 8, x + w - 10, y + h - 14, x + w - 12, y + h - 2, PALETTE.flyerFt, { ...o, seed: 6 });
}

/** A stationary "Turret": squat dome with a swivelling muzzle. */
export function drawTurretInk(ctx: CanvasRenderingContext2D, e: Enemy, frame = 0): void {
  const { x, y, w, h } = e;
  const o = { frame, boil: false };
  const cx = x + w / 2;
  inkShadow(ctx, cx, y + h, w * 0.5);
  // Base + dome.
  inkRoundRect(ctx, x + 2, y + h - 16, w - 4, 16, 5, PALETTE.turretDk, o);
  inkEllipse(ctx, cx, y + h - 8, w * 0.4, h * 0.34, PALETTE.turret, o);
  softHi(ctx, cx - 5, y + h - 14, 5, 4, '#a3acb8', 0.6);
  // Eye + upward muzzle.
  pieEye(ctx, cx, y + h - 8, 5, 0, o);
  inkRoundRect(ctx, cx - 4, y, 8, 16, 3, PALETTE.turretDk, o);
  inkEllipse(ctx, cx, y, 5, 3, PALETTE.turretMuzzle, o);
}

/** A patrolling "Glitch": a round purple gremlin with a wobbly waddle. */
export function drawFoeInk(ctx: CanvasRenderingContext2D, e: Enemy, frame: number, boil: boolean): void {
  const { x, y, w, h } = e;
  const o = { frame, boil };
  const cx = x + w / 2;
  const look = Math.sign(e.vx) || 1;
  const swing = Math.sin(frame * 0.3) * 3;
  inkShadow(ctx, cx, y + h, w * 0.46);
  // Feet (waddle).
  inkEllipse(ctx, cx - 8 + swing, y + h - 3, 7, 4, PALETTE.foeFt, { ...o, seed: 1 });
  inkEllipse(ctx, cx + 8 - swing, y + h - 3, 7, 4, PALETTE.foeFt, { ...o, seed: 2 });
  // Round body.
  inkEllipse(ctx, cx, y + h * 0.5, w * 0.46, h * 0.44, PALETTE.foe, { ...o, seed: 3 });
  softHi(ctx, cx - 6, y + h * 0.3, 7, 8, '#b377e0', 0.55);
  // Two big eyes + frown.
  pieEye(ctx, cx - 7, y + h * 0.42, 5, look, { ...o, seed: 4 });
  pieEye(ctx, cx + 7, y + h * 0.42, 5, look, { ...o, seed: 5 });
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.74, 5, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  drawTopper(ctx, cx, y + h * 0.1, PALETTE.foe, o);
}

/** A stationary "Mortar": a squat iron tub with a wide upward barrel. */
export function drawMortarInk(ctx: CanvasRenderingContext2D, e: Enemy, frame = 0): void {
  const { x, y, w, h } = e;
  const o = { frame, boil: false };
  const cx = x + w / 2;
  inkShadow(ctx, cx, y + h, w * 0.5);
  // Iron tub.
  inkRoundRect(ctx, x + 2, y + h - 22, w - 4, 22, 8, PALETTE.mortarDk, o);
  softHi(ctx, cx - 6, y + h - 18, 6, 4, PALETTE.mortar, 0.5);
  // Wide barrel angled up.
  inkRoundRect(ctx, cx - 11, y + 2, 22, h - 18, 6, PALETTE.mortar, o);
  inkEllipse(ctx, cx, y + 1, 9, 5, PALETTE.mortarDk, o);
  inkEllipse(ctx, cx, y, 5, 3, PALETTE.mortarMuzzle, o); // hot mouth
}

/** A flying "Bomber": a chubby steel hull with a bomb slung under its belly. */
export function drawBomberInk(ctx: CanvasRenderingContext2D, e: Enemy, frame: number, boil: boolean): void {
  const { x, y, w, h } = e;
  const o = { frame, boil };
  const cx = x + w / 2;
  const spin = frame % 6 < 3 ? 1 : -1;
  inkHose(ctx, cx, y - 2, cx, y + 3, 4, PALETTE.bomberDk, { ...o, seed: 1 });
  inkEllipse(ctx, cx + spin * 8, y - 6, 13, 3, PALETTE.bomberDk, { ...o, seed: 2 });
  // Hull.
  inkRoundRect(ctx, x + 3, y + 2, w - 6, h - 14, 11, PALETTE.bomber, { ...o, seed: 3 });
  softHi(ctx, cx - 6, y + 7, 6, 4, '#86b0bf', 0.6);
  pieEye(ctx, cx, y + h * 0.36, 6, Math.sign(e.vx) || 1, { ...o, seed: 4 });
  // Bomb slung underneath (fuse flickers).
  inkEllipse(ctx, cx, y + h - 6, 8, 7, PALETTE.bomb, { ...o, seed: 5 });
  if (frame % 6 < 3) inkEllipse(ctx, cx, y + h + 2, 2.5, 3, PALETTE.bombHi, { frame, boil: false, lw: 0 });
}

/** A "Charger": a horned brute that glows hot as it winds up to dash. */
export function drawChargerInk(ctx: CanvasRenderingContext2D, e: Enemy, frame: number, boil: boolean): void {
  const { x, y, w, h } = e;
  const o = { frame, boil };
  const cx = x + w / 2;
  const facing = e.vx >= 0 ? 1 : -1;
  const winding = e.chargeState === 'wind';
  const dashing = e.chargeState === 'dash';
  const swing = Math.sin(frame * (dashing ? 0.6 : 0.3)) * 3;
  // Wind-up flash: body pulses toward white before it commits.
  const body = winding && frame % 6 < 3 ? PAPER.white : PALETTE.charger;
  inkShadow(ctx, cx, y + h, w * 0.48);
  // Feet.
  inkEllipse(ctx, cx - 9 + swing, y + h - 3, 8, 5, PALETTE.chargerFt, { ...o, seed: 1 });
  inkEllipse(ctx, cx + 9 - swing, y + h - 3, 8, 5, PALETTE.chargerFt, { ...o, seed: 2 });
  // Bulky body.
  inkRoundRect(ctx, x + 4, y + 6, w - 8, h - 12, 12, body, { ...o, seed: 3 });
  softHi(ctx, cx - 6, y + 12, 7, 6, '#f0a85f', 0.5);
  // Horns on the facing side.
  const hx = facing > 0 ? x + w - 4 : x + 4;
  inkTri(ctx, hx, y + 10, hx + facing * 12, y - 4, hx + facing * 4, y + 12, PALETTE.chargerFt, { ...o, seed: 4 });
  // Angry eyes (glow hot while winding).
  const eyeTint = winding ? PALETTE.mortarMuzzle : undefined;
  pieEye(ctx, cx - 7, y + h * 0.34, 5, facing, { ...o, seed: 5, ink: eyeTint });
  pieEye(ctx, cx + 7, y + h * 0.34, 5, facing, { ...o, seed: 6, ink: eyeTint });
}

/** A "Spitter": a hot-colored foe with a barrel snout that fires bolts. */
export function drawSpitterInk(ctx: CanvasRenderingContext2D, e: Enemy, frame: number, boil: boolean): void {
  const { x, y, w, h } = e;
  const o = { frame, boil };
  const cx = x + w / 2;
  const facing = e.vx >= 0 ? 1 : -1;
  const swing = Math.sin(frame * 0.3) * 3;
  inkShadow(ctx, cx, y + h, w * 0.46);
  // Feet.
  inkEllipse(ctx, cx - 8 + swing, y + h - 3, 7, 4, PALETTE.spitFt, { ...o, seed: 1 });
  inkEllipse(ctx, cx + 8 - swing, y + h - 3, 7, 4, PALETTE.spitFt, { ...o, seed: 2 });
  // Round body.
  inkEllipse(ctx, cx, y + h * 0.5, w * 0.46, h * 0.44, PALETTE.spit, { ...o, seed: 3 });
  softHi(ctx, cx - 6, y + h * 0.3, 7, 7, '#ff8a6f', 0.55);
  // Angry slanted brows.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 12, y + h * 0.3);
  ctx.lineTo(cx - 3, y + h * 0.4);
  ctx.moveTo(cx + 12, y + h * 0.3);
  ctx.lineTo(cx + 3, y + h * 0.4);
  ctx.stroke();
  ctx.restore();
  pieEye(ctx, cx - 7, y + h * 0.46, 4.5, facing, { ...o, seed: 4 });
  pieEye(ctx, cx + 7, y + h * 0.46, 4.5, facing, { ...o, seed: 5 });
  // Barrel snout on the facing side.
  const sx = facing > 0 ? x + w - 2 : x + 2;
  inkRoundRect(ctx, facing > 0 ? sx : sx - 8, y + h / 2 - 4, 8, 9, 3, PALETTE.spitDk, { ...o, seed: 6 });
  drawTopper(ctx, cx, y + h * 0.12, PALETTE.spit, o);
}
