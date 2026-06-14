// Pickups, projectiles, and world markers: coins, mushrooms, bolts, parry orbs,
// checkpoints, and the goal flag.

import { PALETTE, TILE } from '../../game/constants';
import type { Checkpoint, Mushroom, ParryOrb, Projectile } from '../../types';
import { rect } from './util';

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

/** A bolt: a glowing capsule. Parryable bolts pulse pink with a halo + cue. */
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
  const core = b.parryable ? PALETTE.boltPink : b.from === 'player' ? PALETTE.boltPlayer : PALETTE.boltEnemy;
  const hi = b.parryable ? PALETTE.boltPinkHi : b.from === 'player' ? PALETTE.boltPlayerHi : PALETTE.boltEnemyHi;

  // Pulsing halo marks a parryable bolt as a target.
  if (b.parryable) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(frame * 0.3) * 0.2;
    ctx.fillStyle = PALETTE.boltPinkHi;
    ctx.beginPath();
    ctx.ellipse(cx, cy, b.w * 0.85, b.h * 0.95, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w / 2, b.h / 2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.ellipse(cx, cy, b.w / 4, b.h / 4, 0, 0, 7);
  ctx.fill();

  // Colorblind cue (§12.3): parryables also wear a white ring + spark cross, so
  // "you can parry this" reads from shape/luminance, not pink hue alone.
  if (b.parryable) {
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
