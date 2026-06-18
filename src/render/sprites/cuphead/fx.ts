// Pickups, projectiles, and world markers, rubber-hose (Cuphead) style: every
// prop is an ink-outlined curve. Gameplay tells are preserved exactly — pink =
// parryable, dashed = telegraphed beam/pillar — only the rendering turns to ink.

import { PALETTE, TILE } from '../../../game/constants';
import type { Checkpoint, Hazard, Mushroom, ParryOrb, Projectile } from '../../../types';
import { PAPER, inkEllipse, inkRoundRect, inkTri, softHi } from '../../ink';

const STILL = { frame: 0, boil: false };

/** A spinning coin: outlined gold disc whose width oscillates per coin. */
export function drawCoinInk(ctx: CanvasRenderingContext2D, cx: number, cy: number, idx: number, frame: number): void {
  const phase = (frame + idx * 9) * 0.11;
  const hw = Math.abs(Math.cos(phase)) * 11 + 3;
  inkEllipse(ctx, cx, cy, hw, 13, PALETTE.coin, { ...STILL, seed: idx, lw: hw > 5 ? 3 : 1.5 });
  if (hw > 6) softHi(ctx, cx - hw * 0.25, cy - 1, hw * 0.3, 6, PALETTE.coinHi, 0.8);
}

/** A power-up mushroom: red domed cap with spots over a pale stem. */
export function drawMushroomInk(ctx: CanvasRenderingContext2D, m: Mushroom): void {
  const { x, y, w, h } = m;
  const cx = x + w / 2;
  // Stem.
  inkRoundRect(ctx, cx - w * 0.22, y + h * 0.5, w * 0.44, h * 0.5, 5, PALETTE.shroomStem, STILL);
  // Domed cap.
  inkEllipse(ctx, cx, y + h * 0.46, w * 0.5, h * 0.46, PALETTE.shroom, STILL);
  // Spots + sheen.
  softHi(ctx, cx - w * 0.18, y + h * 0.28, w * 0.12, h * 0.1, PALETTE.shroomHi, 0.9);
  ctx.save();
  ctx.fillStyle = PALETTE.shroomSpot;
  for (const [sx, sy, sr] of [[cx - w * 0.18, y + h * 0.42, w * 0.1], [cx + w * 0.2, y + h * 0.36, w * 0.09]] as const) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bolt. Parryables stay the pink "parry me" capsule; beams keep their tell. */
export function drawBoltInk(ctx: CanvasRenderingContext2D, b: Projectile, frame: number): void {
  // Boss beam: dashed warning line while telegraphing, hot bar once lethal.
  if (b.beam) {
    const midY = b.y + b.h / 2;
    ctx.save();
    if ((b.warn ?? 0) > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(frame * 0.6) * 0.25;
      ctx.strokeStyle = PALETTE.boltPinkHi;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      ctx.moveTo(b.x, midY);
      ctx.lineTo(b.x + b.w, midY);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.9 + Math.sin(frame * 0.9) * 0.1;
      inkRoundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2, PALETTE.boltPink, STILL);
      ctx.globalAlpha = 1;
      softHi(ctx, b.x + b.w / 2, midY, b.w / 2, 2.5, PALETTE.boltPinkHi, 0.9);
    }
    ctx.restore();
    return;
  }

  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  if (b.parryable) {
    softHi(ctx, cx, cy, b.w * 0.85, b.h * 0.95, PALETTE.boltPinkHi, 0.3 + Math.sin(frame * 0.3) * 0.2);
    inkEllipse(ctx, cx, cy, b.w / 2, b.h / 2, PALETTE.boltPink, STILL);
    softHi(ctx, cx, cy, b.w / 5, b.h / 5, PALETTE.boltPinkHi, 0.9);
    return;
  }

  const core = b.from === 'player' ? PALETTE.boltPlayer : b.tint ?? PALETTE.boltEnemy;
  const hi = b.from === 'player' ? PALETTE.boltPlayerHi : b.tintHi ?? PALETTE.boltEnemyHi;

  if (b.style === 'dart') {
    // Fast tracer along its velocity.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    inkRoundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2, core, STILL);
    ctx.restore();
  } else if (b.style === 'spark') {
    const o = b.w / 2;
    inkTri(ctx, cx, cy - o, cx + o, cy, cx, cy + o, core, STILL);
    inkTri(ctx, cx, cy - o, cx - o, cy, cx, cy + o, core, STILL);
  } else {
    // Capsule (bolt) + heavier lob both read as outlined orbs.
    inkEllipse(ctx, cx, cy, b.w / 2, b.h / 2, core, STILL);
    softHi(ctx, cx - b.w * 0.12, cy - b.h * 0.12, b.w / 5, b.h / 5, hi, 0.9);
  }
}

/** A parry-traversal orb: pulsing pink core + halo + up-chevron cue. */
export function drawParryOrbInk(ctx: CanvasRenderingContext2D, orb: ParryOrb, frame: number): void {
  const cx = orb.x + orb.w / 2;
  const cy = orb.y + orb.h / 2;
  const armed = orb.cooldown <= 0;
  const r = orb.w / 2;
  const pulse = 0.5 + Math.sin(frame * 0.18) * 0.5;

  ctx.save();
  ctx.globalAlpha = armed ? 1 : 0.3;
  if (armed) softHi(ctx, cx, cy, r + 4 + pulse * 3, r + 4 + pulse * 3, PALETTE.boltPinkHi, 0.3 + pulse * 0.3);
  inkEllipse(ctx, cx, cy, r, r, armed ? PALETTE.boltPink : PALETTE.bossLo, STILL);
  softHi(ctx, cx, cy, r * 0.4, r * 0.4, PALETTE.boltPinkHi, 0.9);
  if (armed) {
    ctx.strokeStyle = PAPER.white;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.lineTo(cx, cy - 5);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A checkpoint post: slim pole + a banner that's grey/limp or bright pink/waving. */
export function drawCheckpointInk(ctx: CanvasRenderingContext2D, cp: Checkpoint, frame: number): void {
  const px = cp.x + TILE / 2;
  const groundY = 10 * TILE;
  const topY = groundY - 96;
  inkRoundRect(ctx, px - 3, topY, 6, groundY - topY, 3, '#aeb9c8', STILL);
  inkEllipse(ctx, px, topY - 4, 7, 6, '#cfd6df', STILL);
  if (cp.active) {
    const wv = Math.sin(frame * 0.16) * 4;
    inkTri(ctx, px + 3, topY + 4, px + 40 + wv, topY + 14, px + 3, topY + 26, PALETTE.boltPink, STILL);
  } else {
    inkTri(ctx, px + 3, topY + 6, px + 28, topY + 12, px + 3, topY + 24, '#5a6472', STILL);
  }
}

/** The goal flag: base block, pole, knob, and a waving pennant — all inked. */
export function drawFlagInk(ctx: CanvasRenderingContext2D, fx: number, frame: number): void {
  const baseY = 10 * TILE - 28;
  inkRoundRect(ctx, fx - 14, baseY, 36, 28, 6, '#d4ad74', STILL);
  inkRoundRect(ctx, fx, 90, 8, baseY - 90, 3, '#cfd6df', STILL);
  inkEllipse(ctx, fx + 4, 88, 9, 8, PALETTE.coin, STILL);
  const wv = Math.sin(frame * 0.12) * 4;
  inkTri(ctx, fx + 8, 98, fx + 74 + wv, 116, fx + 8, 134, '#58d68a', STILL);
}

/** A boss-arena hazard: an erupting ground pillar or an electrified floor band. */
export function drawHazardInk(ctx: CanvasRenderingContext2D, hz: Hazard, frame: number): void {
  if (hz.kind === 'pillar') {
    if (hz.warn > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(frame * 0.5) * 0.2;
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(hz.x + 1, hz.y + 1, hz.w - 2, hz.h - 2);
      ctx.restore();
    } else {
      inkRoundRect(ctx, hz.x, hz.y, hz.w, hz.h, 5, '#6b431f', STILL);
      inkTri(ctx, hz.x, hz.y, hz.x + hz.w / 2, hz.y - 14, hz.x + hz.w, hz.y, '#5a3318', STILL);
    }
    return;
  }
  // Shock floor segment.
  if (hz.warn > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.6) * 0.25;
    ctx.fillStyle = '#4fd9ff';
    ctx.fillRect(hz.x, hz.y + hz.h - 5, hz.w, 5);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(79,217,255,0.32)';
    ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
    ctx.strokeStyle = '#d4faff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
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
