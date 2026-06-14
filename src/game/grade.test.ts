import { describe, it, expect } from 'vitest';
import { computeGrade, rank, fmtTime, type RunStats } from './grade';

const base: RunStats = { ticks: 0, hits: 0, parries: 0, supers: 0, coinsPct: 0 };
const FAST = 200;

describe('rank', () => {
  it('orders the letter grades and sorts unknown lowest', () => {
    expect(rank('C')).toBeLessThan(rank('B'));
    expect(rank('B')).toBeLessThan(rank('A'));
    expect(rank('A')).toBeLessThan(rank('S'));
    expect(rank('S')).toBeLessThan(rank('S+'));
    expect(rank('')).toBe(-1);
    expect(rank('Z')).toBe(-1);
  });
});

describe('computeGrade', () => {
  it('awards S+ for a flawless, fast, full-collection, well-parried clear', () => {
    expect(computeGrade({ ...base, hits: 0, parries: 5, coinsPct: 1, ticks: 100 }, FAST)).toBe('S+');
  });

  it('floors a no-hit clear at A even with no other bonuses', () => {
    expect(computeGrade({ ...base, hits: 0, ticks: 0 }, FAST)).toBe('A');
  });

  it('gives C for a sloppy, multi-hit run', () => {
    expect(computeGrade({ ...base, hits: 5, ticks: 0 }, FAST)).toBe('C');
  });

  it('locks S/S+ behind a no-hit clear: one hit caps a great run at A', () => {
    const g = computeGrade({ ...base, hits: 1, parries: 5, coinsPct: 1, ticks: 100 }, FAST);
    expect(g).toBe('A');
  });

  it('grants the time bonus only when within the fast threshold', () => {
    const slow = computeGrade({ ...base, hits: 2, parries: 0, coinsPct: 0, ticks: 1000 }, FAST);
    const fast = computeGrade({ ...base, hits: 2, parries: 0, coinsPct: 0, ticks: 100 }, FAST);
    expect(rank(fast)).toBeGreaterThanOrEqual(rank(slow));
  });
});

describe('fmtTime', () => {
  it('renders an em dash when unset', () => {
    expect(fmtTime(0)).toBe('—');
    expect(fmtTime(-5)).toBe('—');
  });
  it('formats ticks (~60/s) as m:ss', () => {
    expect(fmtTime(600)).toBe('0:10');
    expect(fmtTime(3600)).toBe('1:00');
    expect(fmtTime(3660)).toBe('1:01');
  });
});
