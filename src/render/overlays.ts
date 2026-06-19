// Screen-space overlays drawn on top of (or instead of) the world: the pause
// menu, vintage filter, boss intro / KO cards, stage-select menu, and boss HUD.
// All read state and paint — no mutation. Kept out of render.ts so the per-frame
// world draw path stays lean.

import { BOSS_INTRO, BOSS_KO_FRAMES, BURN_FRAMES, IRIS_FRAMES, PALETTE, VIEW_H, VIEW_W } from '../game/constants';
import { difficultyLabel } from '../game/difficulty';
import { fmtTime } from '../game/grade';
import { loadProgress } from '../game/flow';
import { buildSelectEntries, entryGrade, entryTime } from '../game/select';
import type { GameState } from '../game/state';
import type { Boss, Screen } from '../types';

// ---- Hand-drawn deco chrome (shared by the canvas overlays) ----

const DECO_GOLD = '#ffd94a';
const DECO_INK = '#11112a';

/**
 * A vintage art-deco frame: an ink keyline, a gold double-rule, and a little
 * diamond stud at each corner. Used to frame the canvas cards/panels.
 */
function decoFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = DECO_INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = DECO_GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  for (const [dx, dy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = DECO_GOLD;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = DECO_INK;
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();
  }
  ctx.restore();
}

/** A filled deco panel (aged paper) with the gold frame on top. */
function decoPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = 'rgba(17,17,42,0.92)'): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  decoFrame(ctx, x, y, w, h);
}

/**
 * A rotating two-tone comic starburst (alternating long/short spikes) — the
 * classic "POW!" backing for the KO card. `spin` drives the slow rotation.
 */
function starburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, spin: number): void {
  const spikes = 18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  const ring = (rOuter: number, rInner: number, color: string, twist: number): void => {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * Math.PI * 2 + twist;
      const rr = i % 2 === 0 ? rOuter : rInner;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ring(R, R * 0.6, '#ff7a3c', 0);
  ring(R * 0.78, R * 0.46, DECO_GOLD, 0.09);
  ctx.restore();
}

/** Pause menu: dim the world, then Resume / Assist / Volume / Quit rows. */
export function drawPauseMenu(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8,6,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Framed deco panel behind the menu rows.
  const pw = 660;
  const ph = 420;
  decoPanel(ctx, (VIEW_W - pw) / 2, 96, pw, ph);

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
    `STYLE:  ${state.style === 'cuphead' ? 'CUPHEAD' : 'MARIO'}`,
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

/**
 * Warm 1930s-film grade for the cuphead style: a static soft-light sepia wash.
 * Static (no per-frame flicker), so it runs even under reduced motion — only
 * the grain in {@link drawVintage} is suppressed there. The mario style skips
 * this entirely, leaving the bright theme palette untouched.
 */
export function drawSepiaGrade(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // A light aged-film cast — NOT a full desaturate. The rubber-hose sprites and
  // paper backdrop already carry the vintage palette, so a heavy wash here just
  // muddies the ink + hand-drawn colors. A gentle 'color' nudge toward sepia
  // plus a faint 'multiply' warms the frame while letting the art read.
  // A warm 'multiply' tints toward old paper while KEEPING hue (so Pip's blue,
  // grass green, foe purple all survive); a faint 'overlay' cream lifts the
  // highlights for a sun-bleached look. No 'color' pass — that drained the art.
  // A 'saturation' lift first so the hand-drawn colors read VIVID (Cuphead is
  // bold, not muddy); then a light warm 'multiply' for the aged-film cast and an
  // 'overlay' cream to sun-bleach the highlights. Keeping the multiply gentle is
  // what stops the frame collapsing into a flat tan wash.
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ff5a2a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#c79a52';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#fff4d6';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

/**
 * Clean, vivid grade for the mario style: a saturation + contrast pop with no
 * vignette or grain, so the bright theme palette reads as crisp modern pixel
 * art — the deliberate opposite of {@link drawSepiaGrade}.
 */
export function drawCleanGrade(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // 'saturation' lifts color intensity; 'overlay' adds punchy contrast.
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ff3b3b'; // a fully-saturated source pushes the frame vivid
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#bfe6ff'; // cool, bright highlight lift
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

/**
 * Sub-pixel "gate weave" — the slow drift of film through a projector gate. Fed
 * into the world translate (alongside screen shake) so the action sways a hair
 * while the sky stays put (no edge gap). Zero amplitude, basically — it just
 * stops the frame feeling pinned to the pixel grid.
 */
export function gateWeave(frame: number): { dx: number; dy: number } {
  return {
    dx: Math.sin(frame * 0.05) * 0.6 + Math.sin(frame * 0.017) * 0.3,
    dy: Math.cos(frame * 0.043) * 0.5,
  };
}

// Cached vignette gradient (depends only on the fixed viewport size).
let vignette: CanvasGradient | null = null;

/**
 * Vintage film FX layered over the frame: a dark-edge vignette, sparse grain, an
 * occasional vertical scratch hairline, and a periodic reel-change "cigarette
 * burn" in the upper-right. The scratch/burn placements step on slow frame
 * cycles (not every frame) so they read as real film wear, not noise.
 */
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

  // Vertical scratch: a bright hairline that holds an x for a few frames, then
  // jumps. The phase seeds a stable pseudo-random x so it doesn't shimmer.
  const sp = Math.floor(frame / 26);
  if (frame % 26 < 16 && sp % 3 !== 0) {
    const hx = ((sp * 9301 + 49297) % 233280) / 233280;
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#fff8e8';
    ctx.fillRect((hx * VIEW_W) | 0, 0, 1, VIEW_H);
  }

  // Reel-change burn: a scorched ring that flares in the corner every ~8s.
  const burn = frame % 470;
  if (burn < 9) {
    const k = 1 - burn / 9;
    const bx = VIEW_W - 72;
    const by = 72;
    ctx.globalAlpha = 0.3 * k;
    ctx.fillStyle = '#1c0f06';
    ctx.beginPath();
    ctx.arc(bx, by, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.22 * k;
    ctx.strokeStyle = '#d9913f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 24, 0, Math.PI * 2);
    ctx.stroke();
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
  // A framed deco banner the word sits on.
  const bw = 360;
  const bh = 96;
  decoPanel(ctx, (VIEW_W - bw) / 2, VIEW_H / 2 - bh / 2 - 14, bw, bh, 'rgba(17,17,42,0.85)');
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
  // Comic "POW!" starburst behind the word.
  starburst(ctx, 0, 4, early ? 250 : 290, -ko * 0.02);
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

  // Framed deco border around the whole select screen.
  decoFrame(ctx, 24, 24, VIEW_W - 48, VIEW_H - 48);

  ctx.textAlign = 'center';
  ctx.font = "26px 'Press Start 2P', monospace";
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText('STAGE SELECT', VIEW_W / 2, 68);
  // Gold rule under the title.
  ctx.strokeStyle = DECO_GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 180, 86);
  ctx.lineTo(VIEW_W / 2 + 180, 86);
  ctx.stroke();

  const entries = buildSelectEntries(loadProgress());
  const cx = VIEW_W / 2;
  // List area sits between the title rule and the footer; rows scroll within it
  // so the screen never overflows however many stages the campaign has.
  const listTop = 110;
  const listBottom = VIEW_H - 66;
  const rowH = 34;
  const maxRows = Math.max(1, Math.floor((listBottom - listTop) / rowH));
  // Window the rows around the selection when the list is taller than the area.
  const start =
    entries.length <= maxRows
      ? 0
      : Math.max(0, Math.min(state.menuIndex - Math.floor(maxRows / 2), entries.length - maxRows));
  const end = Math.min(entries.length, start + maxRows);
  ctx.font = "13px 'Press Start 2P', monospace";

  for (let i = start; i < end; i++) {
    const e = entries[i];
    const y = listTop + (i - start) * rowH + 22;
    const sel = i === state.menuIndex;
    if (sel) {
      ctx.fillStyle = 'rgba(255,217,74,0.14)';
      ctx.fillRect(cx - 320, y - 20, 640, 30);
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
  }

  // Up/down hints when more entries sit outside the visible window.
  ctx.textAlign = 'center';
  ctx.fillStyle = DECO_GOLD;
  ctx.font = "10px 'Press Start 2P', monospace";
  if (start > 0) ctx.fillText('▲', cx, listTop + 6);
  if (end < entries.length) ctx.fillText('▼', cx, listBottom + 12);

  ctx.textAlign = 'center';
  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText(`DIFFICULTY:  ${difficultyLabel(state.difficulty)}`, VIEW_W / 2, VIEW_H - 48);

  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.fillStyle = '#8a84a8';
  ctx.fillText('↑ ↓  MOVE     ← →  DIFFICULTY     SPACE / ENTER  SELECT', VIEW_W / 2, VIEW_H - 24);
}

// ---- Screen transitions (iris-in reveal + film-burn on death) ----

// The iris remembers the last screen it drew, so a change can trigger a reveal.
let irisPrev: Screen | null = null;
let irisFrames = 0;

/** Note the current screen; kick off an iris-in whenever it changes. */
export function noteScreen(screen: Screen): void {
  if (screen !== irisPrev) {
    irisFrames = IRIS_FRAMES;
    irisPrev = screen;
  }
}

/**
 * Iris-in: a black frame with a growing circular hole that reveals the freshly
 * entered screen — the classic 1930s cartoon "scene open". Drawn last so it
 * masks everything (world, HUD, cards). Self-decrementing; a no-op when idle.
 */
export function drawIris(ctx: CanvasRenderingContext2D): void {
  if (irisFrames <= 0) return;
  const pr = 1 - irisFrames / IRIS_FRAMES; // 0 → 1 as it opens
  const eased = pr * pr * (3 - 2 * pr); // smoothstep
  const maxR = Math.hypot(VIEW_W, VIEW_H) / 2;
  const holeR = eased * maxR;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  ctx.save();
  ctx.fillStyle = '#0a0705';
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.arc(cx, cy, holeR, 0, Math.PI * 2); // even-odd punches a circular hole
  ctx.fill('evenodd');
  // A warm projector glow on the opening edge.
  if (holeR > 4) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * (1 - eased);
    const ring = ctx.createRadialGradient(cx, cy, holeR * 0.82, cx, cy, holeR);
    ring.addColorStop(0, 'rgba(255,196,110,0)');
    ring.addColorStop(1, 'rgba(255,196,110,0.9)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  irisFrames -= 1;
}

/**
 * Film-burn: on death the frame "catches fire" — a scorched bloom with a hot
 * orange rim flares from centre and fades. `burn` is the frames-remaining
 * counter; `reduced` calms it under reduced motion. A no-op when burn is 0.
 */
export function drawFilmBurn(ctx: CanvasRenderingContext2D, burn: number, reduced: boolean): void {
  if (burn <= 0) return;
  const p = 1 - burn / BURN_FRAMES; // 0 → 1 over the burn
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const r = (0.2 + p * 0.8) * VIEW_H * 0.6;
  const fade = (1 - p) * (reduced ? 0.5 : 1);
  ctx.save();
  // An initial white-hot flash (skipped under reduced motion).
  if (!reduced && p < 0.35) {
    ctx.globalAlpha = ((0.35 - p) / 0.35) * 0.55;
    ctx.fillStyle = '#fff2d8';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // Charred bloom with a glowing rim.
  const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
  g.addColorStop(0, `rgba(22,11,6,${0.85 * fade})`);
  g.addColorStop(0.72, `rgba(120,42,14,${0.8 * fade})`);
  g.addColorStop(0.9, `rgba(255,150,44,${0.95 * fade})`);
  g.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Boss name, a wide HP bar, and one pip per phase remaining. */
export function drawBossHud(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const barW = 600;
  const barH = 16;
  const x = (VIEW_W - barW) / 2;
  const y = VIEW_H - 40;

  ctx.save();
  // Deco frame around the whole HP gauge.
  decoFrame(ctx, x - 16, y - 12, barW + 32, barH + 24);

  // Boss name above the framed gauge.
  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = '#11112a';
  ctx.fillText(boss.name, VIEW_W / 2 + 1, y - 19);
  ctx.fillStyle = PALETTE.bossCrown;
  ctx.fillText(boss.name, VIEW_W / 2, y - 20);

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
