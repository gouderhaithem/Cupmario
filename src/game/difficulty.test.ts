import { describe, expect, it } from 'vitest';
import { ASSIST_BOLT_MULT, BEAM_WARN, BOSS_TELEGRAPH, EXPERT_BOLT_MULT } from './constants';
import { cycleDifficulty, enemyBoltMult, isAssist, isExpert, telegraphFrames } from './difficulty';

describe('difficulty tier predicates', () => {
  it('classifies tiers', () => {
    expect(isAssist('assist')).toBe(true);
    expect(isAssist('normal')).toBe(false);
    expect(isExpert('expert')).toBe(true);
    expect(isExpert('normal')).toBe(false);
  });
});

describe('enemyBoltMult', () => {
  it('slows bolts on assist, speeds them on expert, leaves normal alone', () => {
    expect(enemyBoltMult('assist')).toBe(ASSIST_BOLT_MULT);
    expect(enemyBoltMult('expert')).toBe(EXPERT_BOLT_MULT);
    expect(enemyBoltMult('normal')).toBe(1);
  });
});

describe('telegraphFrames', () => {
  it('tightens telegraphs only on expert', () => {
    expect(telegraphFrames('normal', BOSS_TELEGRAPH)).toBe(BOSS_TELEGRAPH);
    expect(telegraphFrames('assist', BEAM_WARN)).toBe(BEAM_WARN);
    expect(telegraphFrames('expert', BOSS_TELEGRAPH)).toBeLessThan(BOSS_TELEGRAPH);
  });

  it('never drops below one frame', () => {
    expect(telegraphFrames('expert', 1)).toBeGreaterThanOrEqual(1);
  });
});

describe('cycleDifficulty', () => {
  it('skips expert until it is unlocked', () => {
    // assist -> normal -> (assist) when expert is locked
    expect(cycleDifficulty('assist', 1, false)).toBe('normal');
    expect(cycleDifficulty('normal', 1, false)).toBe('assist');
    expect(cycleDifficulty('normal', -1, false)).toBe('assist');
  });

  it('includes expert in the cycle once unlocked', () => {
    expect(cycleDifficulty('normal', 1, true)).toBe('expert');
    expect(cycleDifficulty('expert', 1, true)).toBe('assist');
    expect(cycleDifficulty('assist', -1, true)).toBe('expert');
  });

  it('falls back to a valid tier if currently on locked expert', () => {
    // If somehow on expert while locked, stepping lands back in the pool.
    expect(['assist', 'normal']).toContain(cycleDifficulty('expert', 1, false));
  });
});
