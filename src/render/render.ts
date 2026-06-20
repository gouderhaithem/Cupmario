// Top-level draw(): background -> tiles -> coins -> mushrooms -> enemies ->
// bolts -> flag -> player -> score pops. Reads state only (golden rule #4).

import { BOSS_HURT_FLASH, COLS, COMBO_FLASH_FRAMES, COOP_PARTNER_SKIN, ENEMY_FILTERS, FLASH_FRAMES, PALETTE, ROWS, SKINS, TILE, VIEW_H, VIEW_W } from '../game/constants';
import type { GameState } from '../game/state';
import { isCuphead, setEnemyVariant, setRenderStyle } from './style-ctx';
import { INK } from './ink';
import { drawBackground } from './background';
import {
  drawBossHud,
  drawBossIntro,
  drawCleanGrade,
  drawFilmBurn,
  drawHint,
  drawIris,
  drawKoCard,
  drawPauseMenu,
  drawSepiaGrade,
  drawStageSelect,
  drawVintage,
  gateWeave,
  noteScreen,
} from './overlays';
import { drawForegroundInk } from './sprites/cuphead/foreground';
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

  // Track screen changes so a new screen irises in (drawn last, below).
  noteScreen(state.screen);

  // Stage-select is a self-contained menu screen (no world).
  if (state.screen === 'select') {
    drawStageSelect(ctx, state);
    drawIris(ctx);
    return;
  }

  const { level, camX, frame } = state;

  // Read-only gameplay signals the living backdrop reacts to: a MEGABLAST flash,
  // the instant the boss is struck, and how close the boss is to death.
  const react = {
    flash: state.flash / FLASH_FRAMES,
    hit: state.boss ? state.boss.hurtFlash / BOSS_HURT_FLASH : 0,
    low: state.boss ? Math.max(0, 1 - state.boss.hp / state.boss.maxHp) : 0,
  };

  drawBackground(ctx, level.theme, camX, frame, react);

  // Screen shake jitters the world layer only; the background stays put so the
  // canvas edges never reveal a gap. Random offset is ephemeral (no mutation).
  let sx = 0;
  let sy = 0;
  if (state.shake > 0) {
    sx = (Math.random() * 2 - 1) * state.shake;
    sy = (Math.random() * 2 - 1) * state.shake;
  }
  // Projector gate weave: a sub-pixel drift of the world layer (cuphead only).
  // Added to the shake offset so the background stays put and no edge gap shows.
  if (state.style === 'cuphead' && !state.reducedMotion) {
    const w = gateWeave(frame);
    sx += w.dx;
    sy += w.dy;
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

  // Enemies (each kind gets its own sprite), recolored per level so each stage's
  // roster reads as a distinct palette. Boss-arena foes keep the base palette.
  const enemyFilter = state.screen === 'boss' ? 'none' : ENEMY_FILTERS[state.levelIndex] ?? 'none';
  setEnemyVariant(state.screen === 'boss' ? 0 : state.levelIndex);
  ctx.save();
  if (enemyFilter !== 'none') ctx.filter = enemyFilter;
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
  ctx.restore();

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

  // Dust puffs (landing / dashing / jumping) — soft cream clouds that grow and
  // fade; the cuphead style adds a faint ink ring to match the hand-drawn art.
  const cup = isCuphead();
  for (const pf of state.puffs) {
    const t = 1 - pf.life / pf.max;
    const rr = pf.r * (1 + t * 0.7);
    ctx.save();
    ctx.globalAlpha = Math.max(0, pf.life / pf.max) * 0.7;
    ctx.fillStyle = '#f5ecd6';
    ctx.beginPath();
    ctx.arc(pf.x, pf.y, rr, 0, Math.PI * 2);
    ctx.fill();
    if (cup) {
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Coin-pickup sparkles: bright 4-point twinkles that shrink and fade out.
  for (const sp of state.sparks) {
    if (sp.x < camX - 20 || sp.x > camX + VIEW_W + 20) continue;
    const t = Math.max(0, sp.life / sp.max);
    const r = sp.size * (0.4 + t);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = sp.color;
    ctx.translate(sp.x, sp.y);
    ctx.fillRect(-r, -r * 0.28, r * 2, r * 0.56);
    ctx.fillRect(-r * 0.28, -r, r * 0.56, r * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Players: pawn 0 wears the level skin; any co-op pawn wears the partner skin.
  // Each flashes while invulnerable. Drawn in order so later pawns sit on top.
  // A co-op pawn gets a P1/P2 nametag so the two players can tell each other apart.
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].down) continue; // spectating co-op player isn't drawn
    const pl = state.players[i].player;
    if (pl.hurt > 0 && frame % 8 < 4) continue;
    const skin = i === 0 ? SKINS[state.levelIndex] ?? SKINS[0] : COOP_PARTNER_SKIN;
    drawPip(ctx, pl, skin, frame);
    if (state.coop.active && state.players.length > 1) {
      const label = i === 0 ? 'P1' : 'P2';
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#11112a';
      ctx.fillText(label, pl.x + pl.w / 2 + 1, pl.y - 9 + 1);
      ctx.fillStyle = i === 0 ? '#ffd34d' : COOP_PARTNER_SKIN.shirtHi;
      ctx.fillText(label, pl.x + pl.w / 2, pl.y - 9);
      ctx.textAlign = 'left';
    }
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

  // Combo banner: a bold "COMBO ×N" that pops in over Pip and floats up as the
  // stomp chain climbs. Lives in the world layer so it tracks the action.
  if (state.comboFlash > 0 && state.comboShown >= 2) {
    const t = state.comboFlash / COMBO_FLASH_FRAMES; // 1 → 0
    const e = 1 - t; // elapsed 0 → 1
    const scale = e < 0.25 ? 0.6 + (e / 0.25) * 0.6 : 1.2 - Math.min(1, (e - 0.25) / 0.75) * 0.2;
    const banner = state.player; // banner tracks pawn 0 (the local player)
    const bx = banner.x + banner.w / 2;
    const by = banner.y - 18 - e * 16;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.translate(bx, by);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.font = "16px 'Press Start 2P', monospace";
    const label = `COMBO x${state.comboShown}`;
    ctx.fillStyle = '#11112a';
    ctx.fillText(label, 2, 2);
    ctx.fillStyle = PALETTE.combo;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  ctx.restore();

  // Near foreground plane (cuphead): out-of-focus silhouettes + bokeh motes in
  // front of the player for depth. Screen-space, scrolled by camX; the sepia
  // grade below paints over it so it sits in the same film as the world.
  if (state.style === 'cuphead' && state.screen !== 'boss') {
    drawForegroundInk(ctx, level.theme, camX, frame);
  }

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

  // First-run onboarding hint (play screen only, never over the pause menu).
  if (state.screen === 'play' && !state.paused) drawHint(ctx, state);

  // Pause menu, drawn over the frozen world.
  if (state.paused) drawPauseMenu(ctx, state);

  // Film-burn flare on death, then the iris-in reveal — both mask everything
  // drawn above, so they go last (the iris is the very last word on the frame).
  drawFilmBurn(ctx, state.burn, state.reducedMotion);
  drawIris(ctx);
}
