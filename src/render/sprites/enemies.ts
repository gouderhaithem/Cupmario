// Enemy drawing: patrolling Glitch, Spitter, flying Drone, stationary Turret.

import { PALETTE } from '../../game/constants';
import type { Enemy } from '../../types';
import { rect } from './util';

/** A flying "Drone": teal body with rotor blur and a single eye. */
export function drawFlyer(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  // rotor blur on top
  const spin = (frame % 6) < 3 ? 1 : -1;
  rect(ctx, x + 4, y - 4, w - 8, 4, PALETTE.flyerDk);
  rect(ctx, x + w / 2 - 2 + spin * 6, y - 6, 4, 6, PALETTE.flyerDk);
  // body
  rect(ctx, x + 3, y + 6, w - 6, h - 12, PALETTE.flyerDk);
  rect(ctx, x + 6, y + 4, w - 12, h - 14, PALETTE.flyer);
  rect(ctx, x + 6, y + 4, w - 12, 5, '#7fd8e4');
  // single glowing eye
  rect(ctx, x + w / 2 - 6, y + 16, 12, 8, '#ffffff');
  rect(ctx, x + w / 2 - 3, y + 18, 5, 5, PALETTE.eye);
  // little fins
  rect(ctx, x + 1, y + h - 12, 5, 8, PALETTE.flyerFt);
  rect(ctx, x + w - 6, y + h - 12, 5, 8, PALETTE.flyerFt);
}

/** A stationary "Turret": squat base with a swivelling muzzle. */
export function drawTurret(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const { x, y, w, h } = e;
  // base
  rect(ctx, x + 2, y + h - 16, w - 4, 16, PALETTE.turretDk);
  rect(ctx, x + 5, y + h - 14, w - 10, 4, PALETTE.turret);
  // dome
  rect(ctx, x + 7, y + 8, w - 14, h - 22, PALETTE.turret);
  rect(ctx, x + 7, y + 8, w - 14, 5, '#a3acb8');
  rect(ctx, x + 11, y + 14, 6, 6, PALETTE.eye);
  // muzzle pointing up-ish
  rect(ctx, x + w / 2 - 4, y, 8, 14, PALETTE.turretDk);
  rect(ctx, x + w / 2 - 3, y, 6, 5, PALETTE.turretMuzzle);
}

/** A patrolling "Glitch" enemy with a 2-step walk cycle. */
export function drawFoe(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  const step = Math.floor(frame / 8) % 2;
  // feet
  rect(ctx, x + 4 + step * 4, y + h - 7, 11, 7, PALETTE.foeFt);
  rect(ctx, x + w - 15 - step * 4, y + h - 7, 11, 7, PALETTE.foeFt);
  // body
  rect(ctx, x + 3, y + 6, w - 6, h - 12, PALETTE.foeDk);
  rect(ctx, x + 6, y + 4, w - 12, h - 12, PALETTE.foe);
  rect(ctx, x + 6, y + 4, w - 12, 6, '#b377e0');
  // brow
  rect(ctx, x + 7, y + 12, 10, 4, PALETTE.foeDk);
  rect(ctx, x + w - 17, y + 12, 10, 4, PALETTE.foeDk);
  // eyes
  rect(ctx, x + 9, y + 16, 8, 9, '#ffffff');
  rect(ctx, x + w - 17, y + 16, 8, 9, '#ffffff');
  rect(ctx, x + 12, y + 19, 4, 5, PALETTE.eye);
  rect(ctx, x + w - 14, y + 19, 4, 5, PALETTE.eye);
  // mouth
  rect(ctx, x + 12, y + h - 14, w - 24, 4, PALETTE.foeDk);
}

/** A stationary "Mortar": a squat iron tub with a wide upward barrel. */
export function drawMortar(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const { x, y, w, h } = e;
  // tub base
  rect(ctx, x + 2, y + h - 20, w - 4, 20, PALETTE.mortarDk);
  rect(ctx, x + 6, y + h - 18, w - 12, 5, PALETTE.mortar);
  rect(ctx, x + 4, y + h - 4, w - 8, 4, PALETTE.mortarDk);
  // wide barrel angled up
  rect(ctx, x + w / 2 - 11, y + 2, 22, h - 18, PALETTE.mortar);
  rect(ctx, x + w / 2 - 11, y + 2, 22, 6, '#878e98');
  rect(ctx, x + w / 2 - 8, y, 16, 7, PALETTE.mortarDk);
  rect(ctx, x + w / 2 - 6, y - 1, 12, 4, PALETTE.mortarMuzzle); // hot mouth
  // bolt rivets
  rect(ctx, x + 6, y + h - 14, 4, 4, '#9aa2ac');
  rect(ctx, x + w - 10, y + h - 14, 4, 4, '#9aa2ac');
}

/** A flying "Bomber": a heavier steel drone with a bomb slung under its belly. */
export function drawBomber(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  // twin rotor blur
  const spin = (frame % 6) < 3 ? 1 : -1;
  rect(ctx, x + 2, y - 4, w - 4, 4, PALETTE.bomberDk);
  rect(ctx, x + w / 2 - 2 + spin * 7, y - 6, 4, 6, PALETTE.bomberDk);
  // hull
  rect(ctx, x + 2, y + 4, w - 4, h - 14, PALETTE.bomberDk);
  rect(ctx, x + 5, y + 2, w - 10, h - 16, PALETTE.bomber);
  rect(ctx, x + 5, y + 2, w - 10, 5, '#86b0bf');
  // eye
  rect(ctx, x + w / 2 - 6, y + 12, 12, 7, '#ffffff');
  rect(ctx, x + w / 2 - 3, y + 14, 5, 4, PALETTE.eye);
  // bomb slung underneath (fuse flickers)
  const bx = x + w / 2;
  rect(ctx, bx - 7, y + h - 10, 14, 12, '#3a414a');
  rect(ctx, bx - 5, y + h - 8, 10, 8, PALETTE.bomb);
  if (frame % 6 < 3) rect(ctx, bx - 1, y + h + 1, 3, 4, PALETTE.bombHi);
}

/** A "Charger": a horned brute that glows hot as it winds up to dash. */
export function drawCharger(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  const facing = e.vx >= 0 ? 1 : -1;
  const winding = e.chargeState === 'wind';
  const dashing = e.chargeState === 'dash';
  const step = Math.floor(frame / (dashing ? 4 : 8)) % 2;
  // wind-up flash: the body pulses toward white before it commits
  const body = winding && frame % 6 < 3 ? PALETTE.chargerFt : PALETTE.chargerDk;
  // feet
  rect(ctx, x + 4 + step * 4, y + h - 7, 12, 7, PALETTE.chargerFt);
  rect(ctx, x + w - 16 - step * 4, y + h - 7, 12, 7, PALETTE.chargerFt);
  // bulky body
  rect(ctx, x + 2, y + 8, w - 4, h - 14, body);
  rect(ctx, x + 5, y + 6, w - 10, h - 16, PALETTE.charger);
  rect(ctx, x + 5, y + 6, w - 10, 6, '#f0a85f');
  // horns on the facing side
  if (facing > 0) {
    rect(ctx, x + w - 4, y + 4, 8, 5, PALETTE.chargerFt);
    rect(ctx, x + w - 2, y + 10, 8, 4, PALETTE.chargerFt);
  } else {
    rect(ctx, x - 4, y + 4, 8, 5, PALETTE.chargerFt);
    rect(ctx, x - 6, y + 10, 8, 4, PALETTE.chargerFt);
  }
  // angry eyes (glow hot while winding)
  const eye = winding ? PALETTE.mortarMuzzle : '#ffffff';
  rect(ctx, x + 10, y + 15, 8, 8, eye);
  rect(ctx, x + w - 18, y + 15, 8, 8, eye);
  rect(ctx, x + 12 + facing * 2, y + 17, 4, 5, PALETTE.eye);
  rect(ctx, x + w - 16 + facing * 2, y + 17, 4, 5, PALETTE.eye);
}

/** A "Spitter": a hot-colored foe with a barrel snout that fires bolts. */
export function drawSpitter(ctx: CanvasRenderingContext2D, e: Enemy, frame: number): void {
  const { x, y, w, h } = e;
  const step = Math.floor(frame / 8) % 2;
  const facing = e.vx >= 0 ? 1 : -1;
  // feet
  rect(ctx, x + 4 + step * 4, y + h - 7, 11, 7, PALETTE.spitFt);
  rect(ctx, x + w - 15 - step * 4, y + h - 7, 11, 7, PALETTE.spitFt);
  // body
  rect(ctx, x + 3, y + 6, w - 6, h - 12, PALETTE.spitDk);
  rect(ctx, x + 6, y + 4, w - 12, h - 12, PALETTE.spit);
  rect(ctx, x + 6, y + 4, w - 12, 6, '#ff8a6f');
  // angry brow (slanted)
  rect(ctx, x + 7, y + 13, 10, 4, PALETTE.spitDk);
  rect(ctx, x + w - 17, y + 13, 10, 4, PALETTE.spitDk);
  // eyes
  rect(ctx, x + 9, y + 16, 8, 8, '#ffffff');
  rect(ctx, x + w - 17, y + 16, 8, 8, '#ffffff');
  rect(ctx, x + 11, y + 18, 4, 5, PALETTE.eye);
  rect(ctx, x + w - 15, y + 18, 4, 5, PALETTE.eye);
  // barrel snout on the facing side
  if (facing > 0) rect(ctx, x + w - 2, y + h / 2 - 4, 8, 9, PALETTE.spitDk);
  else rect(ctx, x - 6, y + h / 2 - 4, 8, 9, PALETTE.spitDk);
}
