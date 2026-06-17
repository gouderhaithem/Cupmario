// Pickups, projectiles, and world markers: coins, mushrooms, bolts, parry orbs,
// checkpoints, and the goal flag.

import { PALETTE, TILE } from '../../game/constants';
import type { Checkpoint, Hazard, Mushroom, ParryOrb, Projectile } from '../../types';
import { rect } from './util';

/**
 * A boss-arena hazard: a ground pillar (BARKBROOD roots / GRANITE spikes) or a
 * frozen floor segment (RIME). Both flash a warning while telegraphing, then lethal.
 */
export function drawHazard(ctx: CanvasRenderingContext2D, hz: Hazard, frame: number): void {
  if (hz.kind === 'pillar') {
    if (hz.warn > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(frame * 0.5) * 0.2;
      rect(ctx, hz.x, hz.y + hz.h - 6, hz.w, 6, '#ffcaa0'); // cracking footprint
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(hz.x + 1, hz.y + 1, hz.w - 2, hz.h - 2);
      ctx.restore();
    } else {
      rect(ctx, hz.x, hz.y, hz.w, hz.h, '#6b431f');
      rect(ctx, hz.x, hz.y, hz.w, 10, '#8a5a30');
      ctx.fillStyle = '#5a3318'; // jagged spike top
      ctx.beginPath();
      ctx.moveTo(hz.x, hz.y);
      ctx.lineTo(hz.x + hz.w / 2, hz.y - 14);
      ctx.lineTo(hz.x + hz.w, hz.y);
      ctx.fill();
      rect(ctx, hz.x + 4, hz.y + 6, 4, hz.h - 12, 'rgba(88,214,138,0.4)');
      rect(ctx, hz.x + hz.w - 8, hz.y + 6, 4, hz.h - 12, 'rgba(88,214,138,0.4)');
    }
    return;
  }
  // shock floor segment
  if (hz.warn > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.6) * 0.25;
    rect(ctx, hz.x, hz.y + hz.h - 5, hz.w, 5, '#4fd9ff');
    ctx.restore();
  } else {
    ctx.save();
    rect(ctx, hz.x, hz.y, hz.w, hz.h, 'rgba(79,217,255,0.32)');
    ctx.strokeStyle = '#d4faff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hz.x, hz.y + hz.h - 4);
    for (let x = hz.x; x < hz.x + hz.w; x += 14) {
      const up = (Math.floor(x / 14) + frame) % 2 === 0;
      ctx.lineTo(x + 14, hz.y + (up ? 6 : hz.h - 6));
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** A spinning coin: width oscillates with a per-coin phase. */
export function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, idx: number, frame: number): void {
  const phase = (frame + idx * 9) * 0.11;
  const hw = Math.abs(Math.cos(phase)) * 11 + 2;
  ctx.fillStyle = PALETTE.coinSh;
  ctx.beginPath();
  ctx.ellipse(cx, cy, hw + 2, 15, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.coin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, hw, 13, 0, 0, 7);
  ctx.fill();
  if (hw > 5) {
    ctx.fillStyle = PALETTE.coinHi;
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.25, cy, hw * 0.32, 7, 0, 0, 7);
    ctx.fill();
  }
}

/** A power-up mushroom: red domed cap with spots over a pale stem. */
export function drawMushroom(ctx: CanvasRenderingContext2D, m: Mushroom): void {
  const { x, y, w, h } = m;
  // stem
  rect(ctx, x + w * 0.28, y + h * 0.55, w * 0.44, h * 0.45, PALETTE.shroomStem);
  rect(ctx, x + w * 0.28, y + h * 0.55, w * 0.44, 3, '#fffbe9');
  // cap
  ctx.fillStyle = PALETTE.shroom;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.5, w / 2, h * 0.46, 0, Math.PI, 0);
  ctx.fill();
  rect(ctx, x, y + h * 0.48, w, h * 0.08, PALETTE.shroom);
  // highlight + spots
  ctx.fillStyle = PALETTE.shroomHi;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.36, y + h * 0.3, w * 0.12, h * 0.1, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.shroomSpot;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h * 0.42, w * 0.1, h * 0.09, 0, 0, 7);
  ctx.ellipse(x + w * 0.68, y + h * 0.38, w * 0.09, h * 0.08, 0, 0, 7);
  ctx.fill();
}

/** A round energy capsule (default bolt + Spitter fire). */
function drawCapsule(ctx: CanvasRenderingContext2D, b: Projectile, cx: number, cy: number, core: string, hi: string): void {
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w / 2, b.h / 2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w / 4, b.h / 4, 0, 0, 7);
  ctx.fill();
}

/** A thin fast tracer drawn along its velocity, with a hot tip (Turret dart). */
function drawDart(ctx: CanvasRenderingContext2D, b: Projectile, cx: number, cy: number, core: string, hi: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = core;
  ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
  ctx.fillStyle = hi;
  ctx.fillRect(-b.w / 2, -1, b.w, 2); // bright streak
  ctx.fillRect(b.w / 2 - 4, -b.h / 2, 4, b.h); // hot leading tip
  ctx.restore();
}

/** A heavy round shell/bomb with a dark outline + flickering fuse (Mortar/Bomber). */
function drawLob(ctx: CanvasRenderingContext2D, b: Projectile, cx: number, cy: number, core: string, hi: string, frame: number): void {
  const r = b.w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r + 2, r + 2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.3, r * 0.3, 0, 0, 7);
  ctx.fill();
  if (frame % 6 < 3) {
    ctx.fillStyle = hi;
    ctx.fillRect(cx - 2, cy - r - 5, 4, 5); // fuse spark
  }
}

/** A jagged 4-point star burst. */
function drawSpark(ctx: CanvasRenderingContext2D, b: Projectile, cx: number, cy: number, core: string, hi: string): void {
  const o = b.w / 2;
  const i = o * 0.4;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(cx, cy - o);
  ctx.lineTo(cx + i, cy - i);
  ctx.lineTo(cx + o, cy);
  ctx.lineTo(cx + i, cy + i);
  ctx.lineTo(cx, cy + o);
  ctx.lineTo(cx - i, cy + i);
  ctx.lineTo(cx - o, cy);
  ctx.lineTo(cx - i, cy - i);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx, cy, i * 0.7, i * 0.7, 0, 0, 7);
  ctx.fill();
}

/** A parryable (pink) bolt: pulsing halo + white ring/cross cue (§12.3). */
function drawParryable(ctx: CanvasRenderingContext2D, b: Projectile, cx: number, cy: number, frame: number): void {
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(frame * 0.3) * 0.2;
  ctx.fillStyle = PALETTE.boltPinkHi;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w * 0.85, b.h * 0.95, 0, 0, 7);
  ctx.fill();
  ctx.restore();

  drawCapsule(ctx, b, cx, cy, PALETTE.boltPink, PALETTE.boltPinkHi);

  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w * 0.6, b.h * 0.7, 0, 0, 7);
  ctx.stroke();
  const s = b.h * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx, cy + s);
  ctx.stroke();
  ctx.restore();
}

/**
 * A bolt. Parryables always render as the pink "parry me" capsule (the gameplay
 * tell). Other shots draw by `style` and honor a per-shot `tint`, so each enemy's
 * fire reads as a distinct weapon.
 */
export function drawBolt(ctx: CanvasRenderingContext2D, b: Projectile, frame: number): void {
  // Boss beam: a dashed warning line while telegraphing, a hot bar once lethal.
  if (b.beam) {
    const midY = b.y + b.h / 2;
    ctx.save();
    if ((b.warn ?? 0) > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(frame * 0.6) * 0.25;
      ctx.strokeStyle = PALETTE.boltPinkHi;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      ctx.moveTo(b.x, midY);
      ctx.lineTo(b.x + b.w, midY);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.85 + Math.sin(frame * 0.9) * 0.15;
      ctx.fillStyle = PALETTE.boltPink;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.boltPinkHi;
      ctx.fillRect(b.x, midY - 3, b.w, 6);
    }
    ctx.restore();
    return;
  }

  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  if (b.parryable) {
    drawParryable(ctx, b, cx, cy, frame);
    return;
  }

  const core = b.from === 'player' ? PALETTE.boltPlayer : b.tint ?? PALETTE.boltEnemy;
  const hi = b.from === 'player' ? PALETTE.boltPlayerHi : b.tintHi ?? PALETTE.boltEnemyHi;

  if (b.style === 'dart') drawDart(ctx, b, cx, cy, core, hi);
  else if (b.style === 'lob') drawLob(ctx, b, cx, cy, core, hi, frame);
  else if (b.style === 'spark') drawSpark(ctx, b, cx, cy, core, hi);
  else drawCapsule(ctx, b, cx, cy, core, hi);
}

/**
 * A parry-traversal orb: a pulsing pink star-core ringed by a halo, with crossed
 * chevrons hinting "tap jump here". Dimmed and shrunk while on cooldown (dormant
 * after a parry), so its armed/disarmed state reads at a glance.
 */
export function drawParryOrb(ctx: CanvasRenderingContext2D, orb: ParryOrb, frame: number): void {
  const cx = orb.x + orb.w / 2;
  const cy = orb.y + orb.h / 2;
  const armed = orb.cooldown <= 0;
  const r = orb.w / 2;
  const pulse = 0.5 + Math.sin(frame * 0.18) * 0.5;

  ctx.save();
  ctx.globalAlpha = armed ? 1 : 0.3;

  // Outer halo ring (only while armed and dangerous).
  if (armed) {
    ctx.globalAlpha = 0.3 + pulse * 0.3;
    ctx.strokeStyle = PALETTE.boltPinkHi;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4 + pulse * 3, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Core.
  ctx.fillStyle = armed ? PALETTE.boltPink : PALETTE.bossLo;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.boltPinkHi;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.35 + (armed ? pulse * 0.2 : 0)), 0, 7);
  ctx.fill();

  // Up-chevron cue: parry to bounce.
  if (armed) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.lineTo(cx, cy - 5);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A checkpoint post: a slim pole with a banner that's grey/limp when dormant
 * and bright pink + waving once activated (the respawn point is set).
 */
export function drawCheckpoint(ctx: CanvasRenderingContext2D, cp: Checkpoint, frame: number): void {
  const px = cp.x + TILE / 2 - 3;
  const groundY = 10 * TILE;
  const topY = groundY - 96;

  // Pole.
  rect(ctx, px, topY, 6, groundY - topY, '#9aa6b4');
  rect(ctx, px, topY, 2, groundY - topY, '#cfd6df');
  rect(ctx, px - 4, topY - 6, 14, 8, '#cfd6df'); // knob

  if (cp.active) {
    // Bright waving banner.
    const wv = Math.sin(frame * 0.16) * 4;
    ctx.fillStyle = PALETTE.boltPink;
    ctx.beginPath();
    ctx.moveTo(px + 6, topY + 4);
    ctx.lineTo(px + 40 + wv, topY + 14);
    ctx.lineTo(px + 6, topY + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.boltPinkHi;
    rect(ctx, px + 6, topY + 4, 4, 22, PALETTE.boltPinkHi);
  } else {
    // Dormant grey banner, hanging limp.
    ctx.fillStyle = '#5a6472';
    ctx.beginPath();
    ctx.moveTo(px + 6, topY + 6);
    ctx.lineTo(px + 30, topY + 12);
    ctx.lineTo(px + 6, topY + 24);
    ctx.closePath();
    ctx.fill();
  }
}

/** The goal flag: base block, pole, knob, and a waving pennant. */
export function drawFlag(ctx: CanvasRenderingContext2D, fx: number, frame: number): void {
  const baseY = 10 * TILE - 28;
  // base block
  rect(ctx, fx - 14, baseY, 36, 28, '#caa36a');
  rect(ctx, fx - 14, baseY, 36, 6, '#e0bd86');
  // pole
  rect(ctx, fx, 90, 8, baseY - 90, '#cfd6df');
  rect(ctx, fx, 90, 3, baseY - 90, '#eef3f8');
  // top knob
  rect(ctx, fx - 3, 84, 14, 12, '#ffd94a');
  // waving pennant
  const wv = Math.sin(frame * 0.12) * 4;
  ctx.fillStyle = '#58d68a';
  ctx.beginPath();
  ctx.moveTo(fx + 8, 98);
  ctx.lineTo(fx + 74 + wv, 116);
  ctx.lineTo(fx + 8, 134);
  ctx.fill();
  ctx.fillStyle = '#3f9a5e';
  ctx.beginPath();
  ctx.moveTo(fx + 8, 118);
  ctx.lineTo(fx + 60 + wv, 125);
  ctx.lineTo(fx + 8, 134);
  ctx.fill();
}
