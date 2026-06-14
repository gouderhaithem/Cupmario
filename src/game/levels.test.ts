import { describe, it, expect } from 'vitest';
import { BOSSES, BOSS_RUSH, CAMPAIGN, LEVELS } from './levels';

describe('campaign wiring', () => {
  it('references only valid level/boss indices', () => {
    for (const stage of CAMPAIGN) {
      if (stage.kind === 'level') {
        expect(stage.level).toBeGreaterThanOrEqual(0);
        expect(stage.level).toBeLessThan(LEVELS.length);
      } else {
        expect(stage.boss).toBeGreaterThanOrEqual(0);
        expect(stage.boss).toBeLessThan(BOSSES.length);
      }
    }
  });

  it('ends on a boss finale', () => {
    expect(CAMPAIGN[CAMPAIGN.length - 1].kind).toBe('boss');
  });

  it('uses every run level somewhere in the campaign', () => {
    const used = new Set(CAMPAIGN.filter((s) => s.kind === 'level').map((s) => (s as { level: number }).level));
    expect(used.size).toBe(LEVELS.length);
  });
});

describe('boss rush', () => {
  it('is every boss, in order, with no run levels', () => {
    expect(BOSS_RUSH).toHaveLength(BOSSES.length);
    BOSS_RUSH.forEach((stage, i) => {
      expect(stage.kind).toBe('boss');
      expect((stage as { boss: number }).boss).toBe(i);
    });
  });
});

describe('boss configs', () => {
  it('declare descending phase HP thresholds ending at 0', () => {
    for (const boss of BOSSES) {
      expect(boss.phases.length).toBeGreaterThan(0);
      expect(boss.hp).toBeGreaterThan(0);
      expect(boss.phases[boss.phases.length - 1].toHpPct).toBe(0);
      for (const phase of boss.phases) {
        expect(phase.patterns.length).toBeGreaterThan(0);
      }
    }
  });
});
