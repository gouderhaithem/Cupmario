// Top-level draw(): background -> tiles -> coins -> mushrooms -> enemies ->
// bolts -> flag -> player -> score pops. Reads state only (golden rule #4).

import { COLS, ROWS, SKINS, TILE, VIEW_W } from '../game/constants';
import type { GameState } from '../game/state';
import { drawBackground } from './background';
import {
  drawBolt,
  drawCoin,
  drawFlag,
  drawFoe,
  drawMover,
  drawMushroom,
  drawPip,
  drawSpitter,
  drawTile,
} from './sprites';

export function draw(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { level, camX, frame } = state;

  drawBackground(ctx, level.theme, camX, frame);

  // Screen shake jitters the world layer only; the background stays put so the
  // canvas edges never reveal a gap. Random offset is ephemeral (no mutation).
  let sx = 0;
  let sy = 0;
  if (state.shake > 0) {
    sx = (Math.random() * 2 - 1) * state.shake;
    sy = (Math.random() * 2 - 1) * state.shake;
  }

  ctx.save();
  ctx.translate(-Math.round(camX) + Math.round(sx), Math.round(sy));

  // Visible tiles only (cull off-screen columns).
  const cStart = Math.max(0, Math.floor(camX / TILE) - 1);
  const cEnd = Math.min(COLS - 1, Math.ceil((camX + VIEW_W) / TILE));
  for (let c = cStart; c <= cEnd; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (level.grid[r][c] !== 0) drawTile(ctx, level, c, r);
    }
  }

  // Moving platforms (solid slabs the player rides).
  for (const m of state.movers) {
    if (m.x + m.w < camX || m.x > camX + VIEW_W) continue;
    drawMover(ctx, m);
  }

  // Coins (skip collected and off-screen).
  level.coins.forEach((co, i) => {
    if (co.got) return;
    if (co.cx < camX - 40 || co.cx > camX + VIEW_W + 40) return;
    drawCoin(ctx, co.cx, co.cy, i, frame);
  });

  // Mushrooms (power-ups dropped by slain Spitters).
  for (const m of state.mushrooms) {
    if (m.x + m.w < camX || m.x > camX + VIEW_W) continue;
    drawMushroom(ctx, m);
  }

  // Enemies (Spitters get the hot-colored shooter sprite).
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'shooter') drawSpitter(ctx, e, frame);
    else drawFoe(ctx, e, frame);
  }

  // Bolts in flight.
  for (const b of state.projectiles) {
    if (b.x + b.w < camX || b.x > camX + VIEW_W) continue;
    drawBolt(ctx, b);
  }

  // Flag.
  drawFlag(ctx, level.flagX, frame);

  // Player (flash while invulnerable).
  const p = state.player;
  if (!(p.hurt > 0 && frame % 8 < 4)) {
    drawPip(ctx, p, SKINS[state.levelIndex] ?? SKINS[0], frame);
  }

  // Floating score pops.
  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  for (const po of state.pops) {
    ctx.globalAlpha = Math.min(1, po.life / 18);
    ctx.fillStyle = '#11112a';
    ctx.fillText(po.text, po.x + 1, po.y + 1);
    ctx.fillStyle = po.color;
    ctx.fillText(po.text, po.x, po.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  ctx.restore();
}
