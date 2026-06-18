// Top-level draw(): background -> tiles -> coins -> mushrooms -> enemies ->
// bolts -> flag -> player -> score pops. Reads state only (golden rule #4).

import { COLS, FLASH_FRAMES, ROWS, SKINS, TILE, VIEW_H, VIEW_W } from '../game/constants';
import type { GameState } from '../game/state';
import { setRenderStyle } from './style-ctx';
import { drawBackground } from './background';
import {
  drawBossHud,
  drawBossIntro,
  drawCleanGrade,
  drawKoCard,
  drawPauseMenu,
  drawSepiaGrade,
  drawStageSelect,
  drawVintage,
} from './overlays';
import {
  drawBolt,
  drawBomber,
  drawBoss,
  drawCharger,
  drawCheckpoint,
  drawCoin,
  drawCrumble,
  drawFlag,
  drawFlyer,
  drawFoe,
  drawHazard,
  drawMortar,
  drawMover,
  drawMushroom,
  drawParryOrb,
  drawPip,
  drawSpitter,
  drawTile,
  drawTurret,
} from './sprites';

export function draw(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Select the sprite art path (cuphead rubber-hose vs mario pixel) for this
  // frame; the sprite modules read it via style-ctx, so render.ts stays neutral.
  setRenderStyle(state.style, state.reducedMotion);

  // Stage-select is a self-contained menu screen (no world).
  if (state.screen === 'select') {
    drawStageSelect(ctx, state);
    return;
  }

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

  // Crumbling platforms.
  for (const cr of state.crumbles) {
    if (cr.x + cr.w < camX || cr.x > camX + VIEW_W) continue;
    drawCrumble(ctx, cr, frame);
  }

  // Checkpoint posts (behind entities; lit once reached).
  for (const cp of state.checkpoints) {
    if (cp.x + TILE < camX || cp.x > camX + VIEW_W) continue;
    drawCheckpoint(ctx, cp, frame);
  }

  // Parry-traversal orbs (pink hazards you bounce off mid-air).
  for (const orb of state.parryOrbs) {
    if (orb.x + orb.w < camX || orb.x > camX + VIEW_W) continue;
    drawParryOrb(ctx, orb, frame);
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

  // Enemies (each kind gets its own sprite).
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'shooter') drawSpitter(ctx, e, frame);
    else if (e.kind === 'flyer') drawFlyer(ctx, e, frame);
    else if (e.kind === 'bomber') drawBomber(ctx, e, frame);
    else if (e.kind === 'turret') drawTurret(ctx, e);
    else if (e.kind === 'mortar') drawMortar(ctx, e);
    else if (e.kind === 'charger') drawCharger(ctx, e, frame);
    else drawFoe(ctx, e, frame);
  }

  // Arena hazards (root pillars / electrified floor) sit on the world layer.
  for (const hz of state.hazards) drawHazard(ctx, hz, frame);

  // The boss looms in the arena (behind bolts + player).
  if (state.boss) drawBoss(ctx, state.boss, frame);

  // Bolts in flight.
  for (const b of state.projectiles) {
    if (b.x + b.w < camX || b.x > camX + VIEW_W) continue;
    drawBolt(ctx, b, frame);
  }

  // Flag (run levels only; the boss arena has no flag).
  if (state.screen !== 'boss') drawFlag(ctx, level.flagX, frame);

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

  // Boss HP bar + phase pips (screen-space, drawn over the world).
  if (state.boss) drawBossHud(ctx, state.boss);

  // Vintage post-FX is the cuphead style's signature; the mario style stays
  // clean and bright (no grade, no vignette, no grain). Sepia is static so it
  // survives reduced motion; only the grain/vignette in drawVintage is gated by
  // it (§9 / §13.3) — no flicker/grain.
  if (state.style === 'cuphead') {
    drawSepiaGrade(ctx);
    if (!state.reducedMotion) drawVintage(ctx, frame);
  } else {
    drawCleanGrade(ctx);
  }

  // MEGABLAST flash: a fading white wash over the whole viewport (screen-space).
  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = (state.flash / FLASH_FRAMES) * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  // Boss-screen cards: READY?/FIGHT! intro, then a KO card on the death wobble.
  if (state.screen === 'boss') {
    if (state.bossIntro > 0) drawBossIntro(ctx, state.bossIntro);
    if (state.boss?.dead && state.bossKo > 0) drawKoCard(ctx, state.bossKo);
  }

  // Pause menu, drawn over the frozen world.
  if (state.paused) drawPauseMenu(ctx, state);
}
