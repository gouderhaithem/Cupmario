// Screen-space overlays drawn on top of (or instead of) the world: the pause
// menu, vintage filter, boss intro / KO cards, stage-select menu, and boss HUD.
// All read state and paint — no mutation. Kept out of render.ts so the per-frame
// world draw path stays lean.

import { BOSS_INTRO, BOSS_KO_FRAMES, PALETTE, VIEW_H, VIEW_W } from '../game/constants';
import { difficultyLabel } from '../game/difficulty';
import { fmtTime } from '../game/grade';
import { loadProgress } from '../game/flow';
import { buildSelectEntries, entryGrade, entryTime } from '../game/select';
import type { GameState } from '../game/state';
import type { Boss } from '../types';

/** Pause menu: dim the world, then Resume / Assist / Volume / Quit rows. */
export function drawPauseMenu(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.font = "26px 'Press Start 2P', monospace";
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText('PAUSED', VIEW_W / 2, 150);

  const rows = [
    'RESUME',
    `DIFFICULTY:  ${difficultyLabel(state.difficulty)}`,
    `VOLUME:  ${'█'.repeat(Math.round(state.volume * 10))}${'·'.repeat(10 - Math.round(state.volume * 10))}`,
    `REDUCED MOTION:  ${state.reducedMotion ? 'ON' : 'OFF'}`,
    `TOUCH CONTROLS:  ${state.showTouchControls ? 'ON' : 'OFF'}`,
    'QUIT TO TITLE',
  ];
  ctx.font = "14px 'Press Start 2P', monospace";
  const top = 220;
  const rowH = 44;
  rows.forEach((label, i) => {
    const y = top + i * rowH;
    const sel = i === state.pauseIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(255,217,74,0.14)';
      ctx.fillRect(VIEW_W / 2 - 300, y - 20, 600, 32);
    }
    ctx.fillStyle = sel ? '#ffd94a' : '#cfd6df';
    ctx.fillText(`${sel ? '▸ ' : ''}${label}`, VIEW_W / 2, y);
  });

  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.fillStyle = '#8a84a8';
  ctx.fillText('↑ ↓  MOVE     ← →  ADJUST     SPACE  SELECT     ESC  RESUME', VIEW_W / 2, VIEW_H - 40);
  ctx.restore();
}

// Cached vignette gradient (depends only on the fixed viewport size).
let vignette: CanvasGradient | null = null;

/** Subtle dark-edge vignette + sparse film grain for a vintage cartoon look. */
export function drawVintage(ctx: CanvasRenderingContext2D, frame: number): void {
  if (!vignette) {
    vignette = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.35,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.78,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  }
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sparse grain: a handful of faint specks, reseeded each frame.
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = frame % 2 ? '#ffffff' : '#000000';
  for (let i = 0; i < 70; i++) {
    ctx.fillRect((Math.random() * VIEW_W) | 0, (Math.random() * VIEW_H) | 0, 2, 2);
  }
  ctx.restore();
}

/** Big centered "READY?" → "FIGHT!" card, with a sepia flash as the boss drops in. */
export function drawBossIntro(ctx: CanvasRenderingContext2D, intro: number): void {
  // Sepia wash that fades over the first ~24 frames of the intro.
  const sepia = Math.max(0, (intro - (BOSS_INTRO - 24)) / 24);
  if (sepia > 0) {
    ctx.save();
    ctx.globalAlpha = sepia * 0.55;
    ctx.fillStyle = '#6b4a23';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  const text = intro > 36 ? 'READY?' : 'FIGHT!';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = "40px 'Press Start 2P', monospace";
  ctx.fillStyle = '#11112a';
  ctx.fillText(text, VIEW_W / 2 + 3, VIEW_H / 2 + 3);
  ctx.fillStyle = intro > 36 ? '#ffd94a' : '#ff5fb0';
  ctx.fillText(text, VIEW_W / 2, VIEW_H / 2);
  ctx.textAlign = 'left';
  ctx.restore();
}

/** Cuphead-style KO card: "WALLOP!" snaps in, then "A KNOCKOUT!" on the wobble. */
export function drawKoCard(ctx: CanvasRenderingContext2D, ko: number): void {
  const early = ko > BOSS_KO_FRAMES * 0.55;
  const text = early ? 'WALLOP!' : 'A KNOCKOUT!';
  // Subtle breathing pulse so the card feels alive.
  const scale = 1 + Math.sin(ko * 0.4) * 0.06;
  ctx.save();
  ctx.translate(VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.font = `${early ? 44 : 30}px 'Press Start 2P', monospace`;
  ctx.fillStyle = '#11112a';
  ctx.fillText(text, 3, 3);
  ctx.fillStyle = early ? '#ff5fb0' : '#ffd94a';
  ctx.fillText(text, 0, 0);
  ctx.textAlign = 'left';
  ctx.restore();
}

/** Stage-select menu: campaign stages (best grade + time), Boss Rush, Back. */
export function drawStageSelect(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = '#0d0b1a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.font = "26px 'Press Start 2P', monospace";
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText('STAGE SELECT', VIEW_W / 2, 68);

  const entries = buildSelectEntries(loadProgress());
  const cx = VIEW_W / 2;
  const top = 122;
  const rowH = 40;
  ctx.font = "13px 'Press Start 2P', monospace";

  entries.forEach((e, i) => {
    const y = top + i * rowH;
    const sel = i === state.menuIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(255,217,74,0.14)';
      ctx.fillRect(cx - 320, y - 20, 640, 32);
    }
    const color = e.locked ? '#544f6e' : sel ? '#ffd94a' : '#cfd6df';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(`${sel ? '▸ ' : '  '}${e.locked ? 'LOCKED' : e.label}`, cx - 300, y);

    if (e.kind === 'stage' && !e.locked) {
      const g = entryGrade(e) || '—';
      ctx.textAlign = 'right';
      ctx.fillStyle = sel ? '#ffd94a' : '#9aa6b4';
      ctx.fillText(`${g}   ${fmtTime(entryTime(e))}`, cx + 300, y);
    }
  });

  ctx.textAlign = 'center';
  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText(`DIFFICULTY:  ${difficultyLabel(state.difficulty)}`, VIEW_W / 2, VIEW_H - 48);

  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.fillStyle = '#8a84a8';
  ctx.fillText('↑ ↓  MOVE     ← →  DIFFICULTY     SPACE / ENTER  SELECT', VIEW_W / 2, VIEW_H - 24);
}

/** Boss name, a wide HP bar, and one pip per phase remaining. */
export function drawBossHud(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const barW = 600;
  const barH = 16;
  const x = (VIEW_W - barW) / 2;
  const y = VIEW_H - 40;

  ctx.save();
  // Name.
  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = '#11112a';
  ctx.fillText(boss.name, VIEW_W / 2 + 1, y - 7);
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText(boss.name, VIEW_W / 2, y - 8);

  // Track + fill.
  ctx.fillStyle = PALETTE.bossHpBack;
  ctx.fillRect(x - 3, y - 3, barW + 6, barH + 6);
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, barW, barH);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = PALETTE.bossHpFill;
  ctx.fillRect(x, y, barW * pct, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x, y, barW * pct, 4);

  // Phase pips: one per phase, lit for the current + remaining phases.
  const pips = boss.phases.length;
  for (let i = 0; i < pips; i++) {
    const px = x + barW - 14 - i * 16;
    ctx.fillStyle = i >= boss.phase ? PALETTE.bossCrown : '#5a4a2a';
    ctx.fillRect(px, y + barH + 6, 10, 6);
  }
  ctx.restore();
  ctx.textAlign = 'left';
}
