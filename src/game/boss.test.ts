import { describe, it, expect } from 'vitest';
import { createState } from './state';
import { makeBoss, updateBoss } from './boss';
import { buildBossArena } from './level';
import { BOSSES } from './levels';
import type { BossConfig } from '../types';

const overclock = BOSSES[3];

function bossState() {
  const state = createState();
  const cfg = overclock as BossConfig;
  state.level = buildBossArena(cfg);
  state.boss = makeBoss(cfg, state.level, 3);
  state.screen = 'boss';
  state.bossIntro = 0;
  return state;
}

describe('THE OVERCLOCK (boss 4)', () => {
  it('is the registered airborne finale with the strongest stats', () => {
    expect(overclock.name).toMatch(/OVERCLOCK/);
    expect(overclock.moveMode).toBe('orbit');
    expect(overclock.hp).toBe(64);
    expect(overclock.phases.length).toBe(5);
    // Strictly tougher than RIME (the previous final boss).
    expect(overclock.hp).toBeGreaterThan(BOSSES[2].hp);
  });

  it('builds with the core shape and orbit move mode', () => {
    const boss = makeBoss(overclock as BossConfig, buildBossArena(overclock as BossConfig), 3);
    expect(boss.shape).toBe('core');
    expect(boss.moveMode).toBe('orbit');
  });

  it('weaves through mid-air (never rests on the floor)', () => {
    const state = bossState();
    const floorTop = state.boss!.homeY; // box-top when grounded
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 120; i++) {
      updateBoss(state);
      minY = Math.min(minY, state.boss!.y);
      maxY = Math.max(maxY, state.boss!.y);
    }
    expect(maxY).toBeLessThan(floorTop); // stays well above the floor
    expect(maxY - minY).toBeGreaterThan(20); // and actually weaves (figure-8)
  });

  it('uses spiralShot and aimedVolley in its kit', () => {
    const all = overclock.phases.flatMap((p) => p.patterns);
    expect(all).toContain('spiralShot');
    expect(all).toContain('aimedVolley');
  });
});
