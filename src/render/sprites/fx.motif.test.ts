// Smoke test for the boss weapon motifs: every motif (and the parryable/beam
// overrides) must render through the cuphead path without throwing. Uses a
// no-op canvas stub since there's no real 2D context under vitest — this guards
// the draw code paths (imports, dispatch, geometry) from regressions.

import { describe, it, expect } from 'vitest';
import type { BoltMotif, Projectile } from '../../types';
import { drawBolt } from './fx';
import { setRenderStyle } from '../style-ctx';

/** A canvas context whose every method is a no-op and every property settable. */
function stubCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return new Proxy({}, { get: () => noop, set: () => true }) as unknown as CanvasRenderingContext2D;
}

function makeBolt(over: Partial<Projectile>): Projectile {
  return { x: 100, y: 100, w: 14, h: 14, vx: 3, vy: 1, alive: true, from: 'enemy', ...over };
}

const MOTIFS: BoltMotif[] = ['seed', 'rock', 'ice', 'glitch'];

describe('boss weapon motifs (cuphead)', () => {
  it('renders every motif without throwing', () => {
    setRenderStyle('cuphead', false);
    const ctx = stubCtx();
    for (const motif of MOTIFS) {
      expect(() => drawBolt(ctx, makeBolt({ motif, tint: '#abc', tintHi: '#def' }), 30)).not.toThrow();
    }
  });

  it('parryable shots ignore the motif (stay the pink cue) without throwing', () => {
    setRenderStyle('cuphead', false);
    const ctx = stubCtx();
    expect(() => drawBolt(ctx, makeBolt({ motif: 'glitch', parryable: true }), 30)).not.toThrow();
  });

  it('a beam ignores the motif without throwing', () => {
    setRenderStyle('cuphead', false);
    const ctx = stubCtx();
    expect(() => drawBolt(ctx, makeBolt({ motif: 'ice', beam: true, warn: 0, w: 400, h: 12 }), 30)).not.toThrow();
  });
});
