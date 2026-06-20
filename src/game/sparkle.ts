// Sparkle particles — the bright twinkles a collected coin throws off. Pure FX
// (never touches gameplay): spawned on pickup, advanced + faded here once per
// tick; render reads state.sparks and draws each as a little 4-point cross.

import { PALETTE } from './constants';
import type { GameState } from './state';

const GRAV = 0.18; // a little fall so the burst arcs down
const DRAG = 0.92; // air drag settles the outward fling
const MAX_SPARKS = 80; // hard cap; oldest drops when full

/** Advance every spark, then drop the dead ones. */
export function updateSparkles(state: GameState): void {
  for (const s of state.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= DRAG;
    s.vy = s.vy * DRAG + GRAV;
    s.life -= 1;
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);
}

/**
 * A radial burst of twinkles in `color` — generic combat juice for a stomp, a
 * bolt impact, or a boss hit. `n` shards fling out at `spread` speed and arc
 * down. Suppressed under reduced motion so the screen stays calm.
 */
export function spawnBurst(state: GameState, x: number, y: number, color: string, n = 8, spread = 2.8): void {
  if (state.reducedMotion) return;
  for (let i = 0; i < n; i++) {
    if (state.sparks.length >= MAX_SPARKS) state.sparks.shift();
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const spd = spread * (0.6 + Math.random() * 0.8);
    state.sparks.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 0.8,
      life: 10 + ((Math.random() * 8) | 0),
      max: 18,
      size: 2 + Math.random() * 2.5,
      color,
    });
  }
}

/** A small radial burst of golden twinkles where a coin was grabbed. */
export function spawnCoinSparkle(state: GameState, x: number, y: number): void {
  const n = 6;
  for (let i = 0; i < n; i++) {
    if (state.sparks.length >= MAX_SPARKS) state.sparks.shift();
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const spd = 1.4 + Math.random() * 1.8;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 0.6, // bias slightly upward so it fountains
      life: 12 + ((Math.random() * 8) | 0),
      max: 20,
      size: 2.5 + Math.random() * 2,
      color: i % 2 ? PALETTE.coinHi : PALETTE.coin,
    });
  }
}
