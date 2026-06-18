// Dust-cloud particles — the little puffs Pip kicks up landing, dashing, and
// jumping. Pure FX (they never touch gameplay), spawned from player/dash update
// and advanced here once per tick; render reads state.puffs and draws them.

import type { GameState } from './state';
import type { Puff } from '../types';

// A whisper of gravity + air drag so puffs drift up-and-out, then settle.
const DRAG = 0.9;
const SETTLE = 0.05;
const MAX_PUFFS = 60; // hard cap so a long dash spree can't pile up unbounded

/** Advance every puff, then drop the dead ones. */
export function updatePuffs(state: GameState): void {
  for (const p of state.puffs) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= DRAG;
    p.vy = p.vy * DRAG + SETTLE;
    p.life -= 1;
  }
  state.puffs = state.puffs.filter((p) => p.life > 0);
}

/** Push a puff, respecting the cap (oldest is dropped when full). */
function add(state: GameState, puff: Puff): void {
  if (state.puffs.length >= MAX_PUFFS) state.puffs.shift();
  state.puffs.push(puff);
}

/** A fan of dust at the feet on landing; `impact` (0..1) scales count + size. */
export function spawnLandDust(state: GameState, cx: number, feetY: number, impact: number): void {
  const n = 3 + Math.round(impact * 4);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = i / n;
    add(state, {
      x: cx + side * (4 + spread * 12),
      y: feetY - 2,
      vx: side * (0.6 + Math.random() * 1.5) * (0.6 + impact),
      vy: -(0.3 + Math.random() * 0.9),
      life: 16 + ((Math.random() * 8) | 0),
      max: 24,
      r: 3 + Math.random() * 3 + impact * 2,
    });
  }
}

/** A trail of dust behind a dash burst, blown opposite the travel direction. */
export function spawnDashDust(state: GameState, cx: number, feetY: number, dir: number): void {
  for (let i = 0; i < 6; i++) {
    add(state, {
      x: cx - dir * (2 + i * 3),
      y: feetY - 4 - Math.random() * 10,
      vx: -dir * (1 + Math.random() * 1.8),
      vy: -(Math.random() * 0.5),
      life: 13 + ((Math.random() * 6) | 0),
      max: 20,
      r: 3 + Math.random() * 3,
    });
  }
}

/** A small symmetric kick of dust as Pip leaves the ground. */
export function spawnJumpDust(state: GameState, cx: number, feetY: number): void {
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    add(state, {
      x: cx + side * (3 + Math.random() * 5),
      y: feetY - 2,
      vx: side * (0.5 + Math.random() * 1),
      vy: -(0.2 + Math.random() * 0.5),
      life: 11 + ((Math.random() * 5) | 0),
      max: 16,
      r: 2.5 + Math.random() * 2.5,
    });
  }
}
