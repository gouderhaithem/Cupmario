// Power-up mushrooms dropped by slain Spitters. A mushroom pops up, falls under
// gravity, rests on solid ground, and drifts sideways (turning at walls/world
// bounds). Walking Pip into one arms him so he can fire bolts.

import { sfx } from '../engine/audio';
import {
  GRAVITY,
  MAXFALL,
  MUSHROOM_H,
  MUSHROOM_POP,
  MUSHROOM_SPEED,
  MUSHROOM_W,
  PALETTE,
  POWER_SCORE,
  TILE,
} from './constants';
import { solid } from './physics';
import type { GameState } from './state';

const POP_LIFE = 40;

/** Add a fresh power mushroom centered on a dead enemy, popping upward. */
export function spawnMushroom(state: GameState, cx: number, topY: number): void {
  state.mushrooms.push({
    x: cx - MUSHROOM_W / 2,
    y: topY - MUSHROOM_H,
    w: MUSHROOM_W,
    h: MUSHROOM_H,
    vx: state.player.x < cx ? MUSHROOM_SPEED : -MUSHROOM_SPEED,
    vy: MUSHROOM_POP,
    alive: true,
  });
}

/** Advance mushrooms (gravity + ground rest + drift) and handle pickup. */
export function updateMushrooms(state: GameState): void {
  const { level } = state;
  const p = state.player;

  for (const m of state.mushrooms) {
    if (!m.alive) continue;

    // Vertical: gravity, then snap to the ground tile under the feet.
    m.vy = Math.min(MAXFALL, m.vy + GRAVITY);
    m.y += m.vy;
    if (m.vy >= 0) {
      const footR = Math.floor((m.y + m.h) / TILE);
      const colL = Math.floor((m.x + 2) / TILE);
      const colR = Math.floor((m.x + m.w - 2) / TILE);
      if (solid(level, colL, footR) || solid(level, colR, footR)) {
        m.y = footR * TILE - m.h;
        m.vy = 0;
      }
    }

    // Horizontal drift; turn at world edges or a wall ahead (fall off ledges).
    m.x += m.vx;
    const aheadC = Math.floor((m.vx > 0 ? m.x + m.w + 1 : m.x - 1) / TILE);
    const midR = Math.floor((m.y + m.h / 2) / TILE);
    if (m.x < 0 || m.x + m.w > level.worldW || solid(level, aheadC, midR)) {
      m.vx = -m.vx;
      m.x = Math.max(0, Math.min(level.worldW - m.w, m.x));
    }

    // Pickup: AABB overlap with Pip.
    if (p.x + p.w > m.x && p.x < m.x + m.w && p.y + p.h > m.y && p.y < m.y + m.h) {
      m.alive = false;
      p.armed = true;
      state.score += POWER_SCORE;
      sfx('power');
      state.pops.push({
        x: m.x + m.w / 2,
        y: m.y,
        life: POP_LIFE,
        text: 'POWER!',
        color: PALETTE.popPower,
      });
    }
  }

  // Drop collected mushrooms.
  for (let i = state.mushrooms.length - 1; i >= 0; i--) {
    if (!state.mushrooms[i].alive) state.mushrooms.splice(i, 1);
  }
}
